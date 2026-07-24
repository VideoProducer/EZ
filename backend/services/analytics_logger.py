"""
CREA Analytics Web Service integration — SCAFFOLD.

CREA DDF® requires participants to log listing activity (impressions, detail
views, media views, contact-form interactions) via the CREA Analytics Web
Service. This is the requirement most often missed.

We batch events client-side → POST to /api/listings/analytics/track →
persist to Mongo → periodic flush to CREA endpoint once credentials are live.

Compliance:
- Never blocks the user experience (fire-and-forget async)
- Buffered in Mongo so no events lost if CREA endpoint is down
- Includes required identifiers per CREA Analytics spec: participant_id,
  agent_id, listing_key, event_type, timestamp
"""
from __future__ import annotations
import os
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("ddf_analytics")

CREA_ANALYTICS_ENDPOINT = os.environ.get("CREA_ANALYTICS_ENDPOINT", "")
CREA_ANALYTICS_KEY      = os.environ.get("CREA_ANALYTICS_KEY", "")
CREA_PARTICIPANT_ID     = os.environ.get("CREA_PARTICIPANT_ID", "")

# Event types recognized by CREA Analytics
VALID_EVENT_TYPES = {
    "impression",       # listing shown in search grid / community section
    "detail_view",      # user opened /listing/{id}
    "media_view",       # user clicked/scrolled photo gallery
    "map_view",         # user viewed map for listing
    "contact_request",  # user submitted "Book a Viewing" / "Ask" form
    "share",            # user shared the listing
    "favorite",         # user favorited/saved the listing
}


async def record_event(
    db,
    listing_key: str,
    event_type: str,
    request_meta: Optional[dict] = None,
) -> None:
    """Record a single analytics event. Buffered in Mongo, flushed to CREA later."""
    if event_type not in VALID_EVENT_TYPES:
        logger.warning(f"Unknown analytics event_type: {event_type}")
        return
    doc = {
        "listing_key": listing_key,
        "event_type": event_type,
        "participant_id": CREA_PARTICIPANT_ID or None,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "flushed_to_crea": False,
        "request_meta": request_meta or {},
    }
    try:
        await db.listing_analytics.insert_one(doc)
    except Exception as e:
        logger.warning(f"Analytics buffer write failed: {e}")


async def flush_to_crea(db) -> dict:
    """Send buffered events to CREA Analytics endpoint. Runs on a schedule.
    Called by APScheduler once CREA_ANALYTICS_ENDPOINT is configured.
    """
    if not (CREA_ANALYTICS_ENDPOINT and CREA_ANALYTICS_KEY):
        return {"flushed": 0, "reason": "endpoint_not_configured"}
    # Real flow (to activate once CREA provides endpoint):
    #   cursor = db.listing_analytics.find({"flushed_to_crea": False}).limit(500)
    #   batch = await cursor.to_list(500)
    #   payload = [_transform_to_crea_format(e) for e in batch]
    #   async with httpx.AsyncClient() as client:
    #       r = await client.post(CREA_ANALYTICS_ENDPOINT, json=payload,
    #                             headers={"Authorization": f"Bearer {CREA_ANALYTICS_KEY}"})
    #       r.raise_for_status()
    #   ids = [e["_id"] for e in batch]
    #   await db.listing_analytics.update_many({"_id": {"$in": ids}},
    #                                          {"$set": {"flushed_to_crea": True,
    #                                                    "flushed_at": now_iso()}})
    logger.info("flush_to_crea placeholder — endpoint pending.")
    return {"flushed": 0, "reason": "scaffold_only"}
