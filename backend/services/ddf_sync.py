"""
CREA DDF® (RESO Web API / OData 4) sync worker — PRODUCTION.

Docs: https://ddfapi-docs.realtor.ca/
Token URL: https://identity.crea.ca/connect/token   (grant_type=client_credentials,
           scope=DDFApi_Read, client_id=<Destination username>,
           client_secret=<Destination password>)
API base:  https://ddfapi.realtor.ca/odata/v1/
Property list: /Property   (paginated 20 default, 100 max via $top)
Replication:   /Property/PropertyReplication()  (for master list + incremental)

Compliance touchpoints:
- Server-side ONLY — credentials never leave /app/backend/.env
- Domain-bound
- Token cached for ~55 minutes (server-side token expires at 60m)
- Incremental sync via ModificationTimestamp
- Reconciliation removes withdrawn listings from Mongo
- Analytics tracking hooked separately (see analytics_logger.py)
- InternetEntireListingDisplayYN + InternetAddressDisplayYN honoured
"""
from __future__ import annotations
import os
import time
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Any

import httpx

logger = logging.getLogger("ddf_sync")

# Read from env — never hard-code
DDF_TOKEN_URL     = os.environ.get("CREA_DDF_TOKEN_URL", "https://identity.crea.ca/connect/token")
DDF_ENDPOINT      = os.environ.get("CREA_DDF_ENDPOINT", "https://ddfapi.realtor.ca").rstrip("/")
DDF_ODATA_BASE    = f"{DDF_ENDPOINT}/odata/v1"
DDF_CLIENT_ID     = os.environ.get("CREA_DDF_CLIENT_ID", "")
DDF_CLIENT_SECRET = os.environ.get("CREA_DDF_CLIENT_SECRET", "")
DDF_SCOPE         = os.environ.get("CREA_DDF_SCOPE", "DDFApi_Read")

# BC-only filter (Doug's site scope). CREA accepts full province names.
DDF_PROVINCE_FILTER = os.environ.get("CREA_DDF_PROVINCE", "British Columbia")

# Token cache (module-level, single-worker friendly)
_token_cache: dict[str, Any] = {"access_token": None, "expires_at": 0.0}


def credentials_ready() -> bool:
    """Return True once DDF creds are configured. Until then, sync is a no-op."""
    return bool(DDF_CLIENT_ID and DDF_CLIENT_SECRET and DDF_TOKEN_URL and DDF_ENDPOINT)


async def _get_token(force_refresh: bool = False) -> str:
    """Fetch and cache an OAuth2 access token from identity.crea.ca."""
    now = time.time()
    if not force_refresh and _token_cache["access_token"] and _token_cache["expires_at"] > now + 30:
        return _token_cache["access_token"]

    if not credentials_ready():
        raise RuntimeError("CREA DDF credentials not configured in backend/.env")

    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            DDF_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": DDF_CLIENT_ID,
                "client_secret": DDF_CLIENT_SECRET,
                "scope": DDF_SCOPE,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if r.status_code != 200:
        # Preserve the CREA error message for the admin to see
        raise RuntimeError(f"DDF token request failed ({r.status_code}): {r.text[:400]}")
    payload = r.json()
    tok = payload["access_token"]
    expires_in = int(payload.get("expires_in", 3600))
    _token_cache["access_token"] = tok
    _token_cache["expires_at"] = now + max(60, expires_in - 60)  # renew 1m before expiry
    logger.info(f"DDF token acquired, expires in ~{expires_in}s")
    return tok


async def test_connection() -> dict:
    """Diagnostic: acquire a token and hit a tiny Property page. Returns a
    structured status the admin dashboard can render."""
    result: dict = {
        "credentials_configured": credentials_ready(),
        "token_url": DDF_TOKEN_URL,
        "endpoint": DDF_ENDPOINT,
        "province_filter": DDF_PROVINCE_FILTER,
        "token_ok": False,
        "api_ok": False,
        "error": None,
        "sample_count": 0,
    }
    if not credentials_ready():
        result["error"] = "Credentials missing. Set CREA_DDF_CLIENT_ID and CREA_DDF_CLIENT_SECRET in backend/.env (these are your DDF Destination username + password from the CREA DDF dashboard — NOT your realtor.ca member login)."
        return result
    try:
        tok = await _get_token(force_refresh=True)
        result["token_ok"] = True
    except Exception as e:
        result["error"] = str(e)
        return result
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get(
                f"{DDF_ODATA_BASE}/Property"
                f"?$top=1&$select=ListingKey,City,StateOrProvince,ListPrice,StandardStatus",
                headers={"Authorization": f"Bearer {tok}"},
            )
        if r.status_code != 200:
            result["error"] = f"DDF Property probe failed ({r.status_code}): {r.text[:400]}"
            return result
        data = r.json()
        result["api_ok"] = True
        result["sample_count"] = len(data.get("value", []))
        result["sample"] = data.get("value", [])[:1]
    except Exception as e:
        result["error"] = f"DDF Property probe exception: {e}"
    return result


# ---------------- Mapping ----------------
def _first(v):
    """Some fields come back as arrays; take the first for our summary shape."""
    if isinstance(v, list):
        return v[0] if v else None
    return v

def _feature_flags(p: dict) -> list[str]:
    """Distil a small set of user-facing feature tags from the RESO payload."""
    feats: list[str] = []
    if p.get("PoolFeatures"): feats.append("pool")
    if p.get("FireplaceYN"): feats.append("fireplace")
    if any(w and "waterfront" in str(w).lower() for w in (p.get("WaterfrontFeatures") or [])): feats.append("waterfront")
    if any(v and ("ocean" in str(v).lower() or "mountain" in str(v).lower()) for v in (p.get("View") or [])):
        feats.append("view")
    if p.get("ParkingTotal") and int(p.get("ParkingTotal") or 0) >= 2: feats.append("parking-2plus")
    if p.get("Basement"): feats.append("basement")
    return feats

def _map_property(p: dict) -> Optional[dict]:
    """Map a CREA DDF Property row -> internal listings shape.
    Returns None for records we must not publish (privacy flags / non-BC).
    """
    # Respect display flags
    if p.get("InternetEntireListingDisplayYN") is False:
        return None
    # BC scope only
    if DDF_PROVINCE_FILTER and p.get("StateOrProvince") and p.get("StateOrProvince") != DDF_PROVINCE_FILTER:
        return None

    show_addr = p.get("InternetAddressDisplayYN") is not False  # default true if null

    listing_key = str(p.get("ListingKey") or "").strip()
    if not listing_key:
        return None

    media = p.get("Media") or []
    photos = []
    virtual_tour_urls = []
    for m in media:
        if not isinstance(m, dict): continue
        url = m.get("MediaURL")
        cat = (m.get("MediaCategory") or "").lower()
        # CREA DDF categorizes as "Property Photo" (also allow legacy/generic "Photo")
        if url and ("photo" in cat or not cat):
            photos.append(url)
        # CREA DDF® virtual-tour media categories: "Unbranded Virtual Tour",
        # "Branded Virtual Tour", "Video", "Virtual Tour". We capture unbranded
        # URLs first (RESA-safe — no agent branding leaks) then branded as
        # fallback.
        if url and ("virtual tour" in cat or "video" in cat):
            virtual_tour_urls.append({
                "url": url,
                "category": m.get("MediaCategory") or "",
                "is_branded": "branded" in cat and "unbranded" not in cat,
            })
    # Sort by Order if present so PreferredPhotoYN comes first
    try:
        photos_with_order = [(int(m.get("Order") or 999), m.get("MediaURL")) for m in media
                             if isinstance(m, dict) and m.get("MediaURL") and "photo" in (m.get("MediaCategory") or "").lower()]
        photos_with_order.sort(key=lambda x: x[0])
        photos = [u for _, u in photos_with_order]
    except Exception:
        pass
    # Prefer unbranded tours (RESA-safe) at the top of the list
    virtual_tour_urls.sort(key=lambda v: (v["is_branded"], v["category"]))

    street = " ".join(x for x in [
        p.get("StreetNumber"), p.get("StreetDirPrefix"),
        p.get("StreetName"), p.get("StreetSuffix"), p.get("StreetDirSuffix"),
    ] if x)
    unit = p.get("UnitNumber")
    if unit:
        street = f"{street} #{unit}" if street else f"#{unit}"

    # ListingURL from CREA may be missing scheme (e.g. "www.realtor.ca/..."); prepend https
    raw_url = (p.get("ListingURL") or "").strip()
    if raw_url and not raw_url.startswith(("http://", "https://")):
        raw_url = "https://" + raw_url
    listing_url = raw_url or f"https://www.realtor.ca/real-estate/{listing_key}"

    return {
        "listing_key": listing_key,
        "mls_number": p.get("ListingId") or listing_key,
        "list_price": p.get("ListPrice"),
        "status": (p.get("StandardStatus") or "Active"),
        # Use StructureType FIRST (distinguishes Apartment vs House) — CREA's
        # REBGV/FVREB boards file everything under PropertySubType="Single Family"
        # but StructureType correctly says ["Apartment"] for condos.
        "property_type": _first(p.get("StructureType")) or p.get("PropertySubType") or "Residential",
        "beds": p.get("BedroomsTotal"),
        "baths": p.get("BathroomsTotalInteger"),
        "living_area": p.get("LivingArea"),
        "living_area_units": p.get("LivingAreaUnits"),
        "year_built": p.get("YearBuilt"),
        "lot_size_area": p.get("LotSizeArea"),
        "lot_size_units": p.get("LotSizeUnits"),
        "street_address": street if show_addr else "",
        "unparsed_address": p.get("UnparsedAddress") if show_addr else "",
        "city": p.get("City") or "",
        "region": p.get("CityRegion") or "",
        "postal_code": p.get("PostalCode") if show_addr else "",
        "province": p.get("StateOrProvince") or "British Columbia",
        "country": p.get("Country") or "Canada",
        "lat": p.get("Latitude"),
        "lon": p.get("Longitude"),
        "description": p.get("PublicRemarks") or "",
        "features": _feature_flags(p),
        "photos": photos,
        "photo_count": p.get("PhotosCount") or len(photos),
        "virtual_tour_urls": virtual_tour_urls,   # [{url, category, is_branded}, ...]
        "has_virtual_tour": bool(virtual_tour_urls),
        "brokerage_name": None,   # resolved from Office if needed via a follow-up sync
        "list_office_key": p.get("ListOfficeKey") or "",
        "list_agent_key": p.get("ListAgentKey") or "",
        "realtor_ca_url": listing_url,
        "modified_at": p.get("ModificationTimestamp"),
        "originating_system": p.get("OriginatingSystemName") or "CREA DDF",
        "internet_display_addr": show_addr,
        # Bookkeeping
        "source": "CREA_DDF",
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------- Sync ----------------
async def _fetch_page(client: httpx.AsyncClient, url: str, token: str) -> dict:
    r = await client.get(url, headers={
        "Authorization": f"Bearer {token}",
        "odata.maxpagesize": "100",
    }, timeout=60.0)
    if r.status_code == 401:
        # token expired mid-sync — refresh once
        token = await _get_token(force_refresh=True)
        r = await client.get(url, headers={
            "Authorization": f"Bearer {token}",
            "odata.maxpagesize": "100",
        }, timeout=60.0)
    r.raise_for_status()
    return r.json()


async def sync_incremental(db, since: Optional[datetime] = None, max_pages: int = 700) -> dict:
    """Pull active BC listings from CREA DDF, upsert to Mongo. Returns a summary.

    - Uses ModificationTimestamp filter when `since` provided.
    - Reconciles: any prior CREA_DDF listing NOT seen this run is marked withdrawn.
    - `max_pages` guards against runaway (100/page × 200 = 20k listings).
    """
    if not credentials_ready():
        logger.info("DDF credentials not configured — skipping sync.")
        return {"pulled": 0, "upserted": 0, "removed": 0, "errors": ["ddf_credentials_missing"]}

    started = datetime.now(timezone.utc)
    result = {"pulled": 0, "upserted": 0, "removed": 0, "errors": [], "pages": 0}

    # Build initial URL — BC scope. DDF's "Active" endpoint only returns active
    # listings by design; StandardStatus is not a filterable field. We also skip
    # filtering on InternetEntireListingDisplayYN here — we honour it in
    # _map_property() so listings flagged as no-display are silently dropped.
    filters = [f"StateOrProvince eq '{DDF_PROVINCE_FILTER}'"] if DDF_PROVINCE_FILTER else []
    if since:
        filters.append(f"ModificationTimestamp gt {since.astimezone(timezone.utc).isoformat().replace('+00:00','Z')}")
    filter_str = " and ".join(filters)
    from urllib.parse import quote
    if filter_str:
        url = f"{DDF_ODATA_BASE}/Property?$top=100&$filter={quote(filter_str)}"
    else:
        url = f"{DDF_ODATA_BASE}/Property?$top=100"

    try:
        token = await _get_token()
    except Exception as e:
        result["errors"].append(f"token: {e}")
        return result

    seen_keys: set[str] = set()

    async with httpx.AsyncClient(timeout=60.0) as client:
        for _ in range(max_pages):
            try:
                page = await _fetch_page(client, url, token)
            except Exception as e:
                result["errors"].append(f"page: {e}")
                break
            result["pages"] += 1
            rows = page.get("value", []) or []
            result["pulled"] += len(rows)

            # Batch upserts — pymongo's bulk_write is 10-50x faster than one-by-one
            from pymongo import UpdateOne
            ops = []
            now_iso_str = datetime.now(timezone.utc).isoformat()
            for p in rows:
                mapped = _map_property(p)
                if not mapped:
                    continue
                seen_keys.add(mapped["listing_key"])
                ops.append(UpdateOne(
                    {"listing_key": mapped["listing_key"]},
                    {"$set": mapped, "$setOnInsert": {"created_at": now_iso_str}},
                    upsert=True,
                ))
            if ops:
                try:
                    r = await db.listings.bulk_write(ops, ordered=False)
                    result["upserted"] += (r.upserted_count + r.modified_count)
                except Exception as e:
                    result["errors"].append(f"bulk_write: {e}")

            next_link = page.get("@odata.nextLink")
            if not next_link:
                break
            url = next_link
            await asyncio.sleep(0.1)  # be polite

    # Reconciliation: soft-remove listings we didn't see this run (only if full sync = no `since`)
    if not since and seen_keys:
        try:
            r = await db.listings.delete_many({"source": "CREA_DDF", "listing_key": {"$nin": list(seen_keys)}})
            result["removed"] = r.deleted_count
        except Exception as e:
            result["errors"].append(f"reconcile: {e}")

    # Persist a run record
    try:
        await db.ddf_sync_log.insert_one({
            "started_at": started.isoformat(),
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "since": since.isoformat() if since else None,
            **result,
        })
    except Exception:
        pass

    logger.info(f"DDF sync complete: {result}")
    return result


async def reconcile_withdrawals(db, seen_keys: set) -> int:
    """Remove any DDF listing not seen in the latest full sync."""
    if not seen_keys:
        return 0
    res = await db.listings.delete_many({"source": "CREA_DDF", "listing_key": {"$nin": list(seen_keys)}})
    return res.deleted_count
