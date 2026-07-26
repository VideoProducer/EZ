"""
Saved-search alert matcher.

For each *verified* saved search, find listings whose `synced_at` is more recent
than the search's `last_notified_at` (or `verified_at` if never notified) and
match the stored filters. If any matches exist, compose a digest email and
send via services.email_sender. Update `last_notified_at`.

Compliance:
- Only runs for records with status='verified' AND unsubscribed_at is None.
- Frequency-capped: minimum 6 hours between sends per search.
- Digest capped at 8 listings per email to keep messages scannable.
- Every email includes the CASL footer + one-click unsubscribe link.
"""
from __future__ import annotations
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Any

from .email_sender import send_email, casl_footer_html, casl_footer_text

logger = logging.getLogger("alert_matcher")

MIN_HOURS_BETWEEN_SENDS = 6
MAX_LISTINGS_PER_DIGEST = 8

EXCLUDED_PROPERTY_TYPES = {"Business", "Hospitality", "Industrial", "Office", "Retail", "Other"}


def _filter_to_mongo_query(f: dict) -> dict:
    """Convert a saved search's filter dict into a Mongo query.
    Mirrors /api/listings logic (strict city, residential-only)."""
    q: dict = {"status": "Active", "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)}}
    if f.get("city"):
        q["city"] = {"$regex": f"^{re.escape(f['city'])}$", "$options": "i"}
    if f.get("region"):
        q["region"] = {"$regex": f"^{re.escape(f['region'])}$", "$options": "i"}
    if f.get("property_type") and f["property_type"] not in EXCLUDED_PROPERTY_TYPES:
        q["property_type"] = {"$regex": f"^{re.escape(f['property_type'])}$", "$options": "i"}
    if f.get("beds_min"):
        q["beds"] = {"$gte": int(f["beds_min"])}
    if f.get("baths_min"):
        q["baths"] = {"$gte": int(f["baths_min"])}
    price = {}
    if f.get("price_min"): price["$gte"] = int(f["price_min"])
    if f.get("price_max"): price["$lte"] = int(f["price_max"])
    if price: q["list_price"] = price
    return q


def _human_filter_summary(f: dict) -> str:
    parts = []
    if f.get("city"): parts.append(f["city"])
    if f.get("region"): parts.append(f["region"])
    if f.get("property_type"): parts.append(f["property_type"])
    if f.get("beds_min"): parts.append(f"{f['beds_min']}+ bed")
    if f.get("baths_min"): parts.append(f"{f['baths_min']}+ bath")
    if f.get("price_min") and f.get("price_max"):
        parts.append(f"${int(f['price_min']):,}–${int(f['price_max']):,}")
    elif f.get("price_max"):
        parts.append(f"under ${int(f['price_max']):,}")
    elif f.get("price_min"):
        parts.append(f"over ${int(f['price_min']):,}")
    return " · ".join(parts) or "all BC residential listings"


def _fmt_price(v: Any) -> str:
    try:
        return f"${int(v):,}"
    except Exception:
        return "Price on request"


def _compose_digest(listings: list, saved_search: dict, unsubscribe_url: str, view_search_url: str) -> tuple[str, str, str]:
    """Return (subject, html, text)."""
    n = len(listings)
    label = _human_filter_summary(saved_search.get("filters") or {})
    subject = f"🏡 {n} new BC listing{'s' if n != 1 else ''} matching your saved search"

    # HTML digest
    cards = []
    for l in listings[:MAX_LISTINGS_PER_DIGEST]:
        photo = (l.get("photos") or [""])[0] or "https://eztofind.ca/logo-fallback.png"
        addr = l.get("street_address") or l.get("unparsed_address") or l.get("city") or "BC"
        city = l.get("city") or ""
        price = _fmt_price(l.get("list_price"))
        beds = l.get("beds") or "—"
        baths = l.get("baths") or "—"
        url = l.get("realtor_ca_url") or f"https://www.realtor.ca/real-estate/{l.get('listing_key','')}"
        mls = l.get("mls_number") or l.get("listing_key") or ""
        cards.append(f"""
<tr><td style="padding:0 0 1.25rem 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <tr>
      <td width="180" style="vertical-align:top">
        <a href="{url}"><img src="{photo}" alt="" width="180" height="120" style="display:block;width:180px;height:120px;object-fit:cover"/></a>
      </td>
      <td style="padding:0.75rem 1rem;vertical-align:top;font-family:Inter,Arial,sans-serif">
        <div style="font-size:1.05rem;font-weight:700;color:#0F2A5B">{price}</div>
        <div style="font-size:0.9rem;color:#111827;margin-top:0.15rem">{addr}, {city}, BC</div>
        <div style="font-size:0.82rem;color:#6b7280;margin-top:0.35rem">{beds} bed · {baths} bath · MLS® {mls}</div>
        <div style="margin-top:0.55rem"><a href="{url}" style="color:#22C55E;font-weight:600;text-decoration:none">View on REALTOR.ca →</a></div>
      </td>
    </tr>
  </table>
</td></tr>
""".strip())

    html = f"""<!doctype html>
<html><body style="margin:0;background:#F5F0E1;padding:0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E1;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:1.75rem;font-family:Inter,Arial,sans-serif;color:#111827;max-width:600px">
    <tr><td>
      <div style="font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:#22C55E;font-weight:700">EZtoFind.ca · Listing Alert</div>
      <h1 style="font-family:Georgia,serif;font-size:1.8rem;color:#0F2A5B;margin:0.4rem 0 0.6rem">{n} new match{'es' if n != 1 else ''} for <em>{label}</em></h1>
      <p style="color:#6b7280;font-size:0.95rem;line-height:1.6;margin:0 0 1.5rem">Here are the freshest BC listings that hit the MLS® feed since your last update.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        {''.join(cards)}
      </table>

      <p style="text-align:center;margin:1rem 0 0">
        <a href="{view_search_url}" style="display:inline-block;background:#0F2A5B;color:#fff;text-decoration:none;padding:0.85rem 1.75rem;border-radius:999px;font-weight:600">See all matches on EZtoFind.ca</a>
      </p>

      {casl_footer_html(unsubscribe_url)}
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>"""

    # Plain-text digest
    text_lines = [f"{n} new BC listing(s) matching: {label}", ""]
    for l in listings[:MAX_LISTINGS_PER_DIGEST]:
        addr = l.get("street_address") or l.get("unparsed_address") or l.get("city") or "BC"
        text_lines += [
            f"* {_fmt_price(l.get('list_price'))} — {addr}, {l.get('city','')}, BC",
            f"  {l.get('beds','—')} bed · {l.get('baths','—')} bath · MLS® {l.get('mls_number') or l.get('listing_key','')}",
            f"  {l.get('realtor_ca_url') or ''}",
            "",
        ]
    text_lines += [f"See all matches: {view_search_url}"]
    text = "\n".join(text_lines) + casl_footer_text(unsubscribe_url)
    return subject, html, text


async def run_matcher(db, public_base_url: str) -> dict:
    """Iterate all verified saved searches, find new matches, send digests.
    Called after each DDF sync completes."""
    now = datetime.now(timezone.utc)
    result = {"searches_checked": 0, "digests_sent": 0, "errors": []}
    cursor = db.saved_searches.find({"status": "verified", "unsubscribed_at": None})

    async for s in cursor:
        result["searches_checked"] += 1
        try:
            # Frequency cap
            last = s.get("last_notified_at") or s.get("verified_at")
            if last:
                try:
                    last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
                    if now - last_dt < timedelta(hours=MIN_HOURS_BETWEEN_SENDS):
                        continue
                except Exception:
                    pass

            # Only consider listings synced AFTER the last notification (or verification)
            cutoff = last or s.get("verified_at") or s.get("created_at")
            filters = s.get("filters") or {}
            q = _filter_to_mongo_query(filters)
            q["synced_at"] = {"$gt": cutoff}

            new_listings = await db.listings.find(q).limit(MAX_LISTINGS_PER_DIGEST + 4).to_list(MAX_LISTINGS_PER_DIGEST + 4)
            if not new_listings:
                continue

            unsub_url = f"{public_base_url}/api/saved-searches/unsubscribe?token={s['unsubscribe_token']}"
            # URL back to /listings with the filters pre-loaded
            from urllib.parse import urlencode
            qp = {k: str(v) for k, v in filters.items() if v not in (None, "", 0)}
            view_url = f"{public_base_url}/listings?{urlencode(qp)}" if qp else f"{public_base_url}/listings"

            subject, html, text = _compose_digest(new_listings, s, unsub_url, view_url)
            await send_email(db,
                to=s["email"], subject=subject, html=html, text=text,
                kind="commercial", related_id=s.get("id"),
                unsubscribe_url=unsub_url,
            )
            await db.saved_searches.update_one(
                {"id": s["id"]},
                {"$set": {"last_notified_at": now.isoformat(),
                          "last_match_count": len(new_listings),
                          "notified_count": (s.get("notified_count", 0) + 1)}},
            )
            result["digests_sent"] += 1
        except Exception as e:
            result["errors"].append(f"{s.get('id','?')}: {e}")
            logger.exception(f"alert_matcher error for {s.get('id')}")

    logger.info(f"alert_matcher done: {result}")
    return result
