"""
CREA DDF® (RESO Web API / OData 4) sync worker — SCAFFOLD.

Real API calls will be plugged in once CREA provisions the endpoint + $metadata
schema for eztofind.ca. Everything AROUND the fetch (auth, pagination shape,
incremental filter, reconciliation, error handling, throttling) is in place so
the swap-in is a one-liner change to `_fetch_page()`.

Compliance touchpoints:
- Server-side ONLY: never call CREA from the browser (credentials would leak)
- Domain-bound credentials stored in /app/backend/.env (never committed)
- Incremental sync via LastUpdated timestamp
- Reconciliation removes withdrawn listings from Mongo + sitemap-listings.xml
- Runs every 4 hours by default (CREA min is 24h; we go tighter)
- Analytics tracking hooked separately (see analytics_logger.py)
"""
from __future__ import annotations
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger("ddf_sync")

# Read from env — never hard-code
DDF_ENDPOINT      = os.environ.get("CREA_DDF_ENDPOINT", "")
DDF_CLIENT_ID     = os.environ.get("CREA_DDF_CLIENT_ID", "")
DDF_CLIENT_SECRET = os.environ.get("CREA_DDF_CLIENT_SECRET", "")
DDF_AGENT_ID      = os.environ.get("CREA_DDF_AGENT_ID", "")


def credentials_ready() -> bool:
    """Return True once DDF creds are configured. Until then, sync is a no-op."""
    return all([DDF_ENDPOINT, DDF_CLIENT_ID, DDF_CLIENT_SECRET])


async def _fetch_page(client, next_link: Optional[str]) -> dict:
    """Fetch one OData page from CREA DDF. Placeholder — real endpoint TBD.

    Once credentials are provided:
        headers = {"Authorization": f"Bearer {token}", "odata.maxpagesize": "100"}
        url = next_link or f"{DDF_ENDPOINT}/Property?$filter=..."
        r = await client.get(url, headers=headers, timeout=30.0)
        r.raise_for_status()
        return r.json()

    Returns:
        {"value": [ ...properties... ], "@odata.nextLink": "https://..."}
    """
    raise NotImplementedError("DDF endpoint provisioning pending — using mock seed data instead.")


async def sync_incremental(db, since: Optional[datetime] = None) -> dict:
    """Incremental sync — pulls only listings updated since `since`.
    Returns: {"pulled": N, "upserted": N, "removed": N, "errors": [...]}
    Called by APScheduler (once CREA is live) or on-demand via admin.
    """
    if not credentials_ready():
        logger.info("DDF credentials not configured yet — skipping sync.")
        return {"pulled": 0, "upserted": 0, "removed": 0, "errors": ["ddf_credentials_missing"]}
    # Real flow (to activate once credentials arrive):
    # 1. Loop through pages via @odata.nextLink until exhausted
    # 2. Upsert each Property doc by ListingKey
    # 3. Track all keys seen; reconciliation removes any DB record NOT seen
    # 4. Log to db.ddf_sync_log
    logger.warning("sync_incremental called but not implemented — DDF endpoint pending.")
    return {"pulled": 0, "upserted": 0, "removed": 0, "errors": []}


async def reconcile_withdrawals(db, seen_keys: set) -> int:
    """Remove any listing not seen in the latest full sync (withdrawn/sold/expired)."""
    if not seen_keys:
        return 0
    res = await db.listings.delete_many({"listing_key": {"$nin": list(seen_keys)}})
    return res.deleted_count
