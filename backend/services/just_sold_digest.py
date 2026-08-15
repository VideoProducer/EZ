"""
Weekly Just-Sold Digest — sends every Friday morning to opted-in
subscribers with a curated list of BC listings whose status flipped
from `Active` to `Sold` in the past 7 days, filtered to each
subscriber's saved search criteria.

Compliance:
- Only sends to `saved_searches` records with status='verified' and
  `unsubscribed_at is None` AND `digest_frequency='weekly_just_sold'`.
- Discloses only sale-price range banding (never exact address of the
  sold home) unless the listing brokerage explicitly permitted it via
  the CREA DDF® sold-data flag.
- Every email carries the full CASL footer + one-click unsubscribe.
- MLS® / REALTOR® trademark attribution in every message.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from .email_sender import send_email, casl_footer_html, casl_footer_text

logger = logging.getLogger("just_sold_digest")

MAX_LISTINGS_PER_DIGEST = 10
LOOKBACK_DAYS = 7


def _price_band(price: float | int) -> str:
    """Return a CASL-safe price band (never the exact number)."""
    if not price:
        return "Price undisclosed"
    p = float(price)
    if p < 500_000:      return "Under $500K"
    if p < 750_000:      return "$500K – $750K"
    if p < 1_000_000:    return "$750K – $1M"
    if p < 1_500_000:    return "$1M – $1.5M"
    if p < 2_000_000:    return "$1.5M – $2M"
    if p < 3_000_000:    return "$2M – $3M"
    if p < 5_000_000:    return "$3M – $5M"
    return "$5M+"


def _match_filters(listing: dict, filters: dict) -> bool:
    """Check whether a sold listing matches the subscriber's saved search."""
    if not filters:
        return True
    if (city := filters.get("city")):
        if (listing.get("city") or "").lower() != city.lower():
            return False
    if (ptype := filters.get("property_type") or filters.get("propertyType")):
        if (listing.get("property_type") or "").lower() != ptype.lower():
            return False
    if (bmin := filters.get("beds_min") or filters.get("beds")):
        try:
            if (listing.get("beds") or 0) < int(bmin):
                return False
        except Exception: pass
    if (pmax := filters.get("price_max") or filters.get("priceMax")):
        try:
            if (listing.get("close_price") or listing.get("list_price") or 0) > float(pmax):
                return False
        except Exception: pass
    return True


def _compose(subscriber: dict, sold: list, unsubscribe_url: str) -> tuple[str, str, str]:
    filters = subscriber.get("filters") or {}
    area_label = filters.get("city") or "British Columbia"
    subject = f"🏡 {len(sold)} home{'s' if len(sold) != 1 else ''} just sold in {area_label} this week"

    rows_html, rows_text = [], []
    for l in sold[:MAX_LISTINGS_PER_DIGEST]:
        band = _price_band(l.get("close_price") or l.get("list_price"))
        city = l.get("city") or ""
        region = l.get("region") or ""
        beds = l.get("beds") or 0
        baths = l.get("baths") or 0
        sqft = l.get("living_area") or 0
        ptype = l.get("property_type") or ""
        rows_html.append(f"""
<tr>
  <td style="padding:12px 0;border-bottom:1px solid #eee;font-family:Inter,Arial,sans-serif;">
    <div style="font-size:15px;font-weight:700;color:#0F2A5B;">{band} · {ptype}</div>
    <div style="font-size:13px;color:#4b5563;margin-top:2px;">
      {city}{f', {region}' if region and region != city else ''} · {beds} bed · {baths} bath{f' · {sqft:,.0f} sqft' if sqft else ''}
    </div>
  </td>
</tr>""")
        rows_text.append(f"• {band} · {ptype} · {city} · {beds}bd / {baths}ba")

    html = f"""
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#FAFAF7;">
  <div style="background:#0F2A5B;color:white;padding:24px;border-radius:10px 10px 0 0;">
    <div style="font-size:11px;letter-spacing:0.16em;color:#F5A623;font-weight:700;">JUST-SOLD DIGEST · {area_label.upper()}</div>
    <h1 style="font-size:22px;margin:8px 0 4px;font-weight:800;">This week in BC real estate</h1>
    <p style="margin:6px 0 0;font-size:13px;opacity:0.85;">{len(sold)} home{'s' if len(sold) != 1 else ''} sold in the last 7 days that matched your saved search.</p>
  </div>
  <div style="background:white;padding:20px 24px;border-radius:0 0 10px 10px;">
    <table style="width:100%;border-collapse:collapse;">{''.join(rows_html)}</table>
    <div style="margin-top:20px;padding:14px 16px;background:#FBF7EE;border-radius:8px;font-size:12px;color:#4b5563;line-height:1.55;">
      <strong style="color:#0F2A5B;">Curious what your home is worth?</strong> Reply to this email or book a free 20-minute call with Doug at
      <a href="https://eztofind.ca/market-estimate" style="color:#0F2A5B;font-weight:600;">eztofind.ca/market-estimate</a>.
    </div>
    <div style="margin-top:14px;font-size:11px;color:#6b7280;line-height:1.5;">
      Sale-price bands sourced from CREA DDF® · MLS®, Multiple Listing Service®, and REALTOR® are certification marks owned by The Canadian Real Estate Association. Exact addresses are withheld to respect seller privacy under BC PIPA.
    </div>
  </div>
  {casl_footer_html(unsubscribe_url)}
</div>""".strip()

    text = (
        f"Just-Sold Digest — {area_label}\n\n"
        f"{len(sold)} home(s) sold in the last 7 days that matched your saved search:\n\n"
        + "\n".join(rows_text)
        + "\n\nCurious what your home is worth? Reply to this email or book a free 20-minute call with Doug at https://eztofind.ca/market-estimate\n\n"
        + "Sale-price bands sourced from CREA DDF® · MLS®, Multiple Listing Service®, and REALTOR® are certification marks owned by The Canadian Real Estate Association. Exact addresses are withheld to respect seller privacy under BC PIPA.\n"
        + casl_footer_text(unsubscribe_url)
    )
    return subject, html, text


async def run_weekly_just_sold_digest(db, base_url: str = "https://eztofind.ca") -> dict:
    """Main entry point — invoked once per week from the scheduler."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=LOOKBACK_DAYS)

    # Pull last-week's sold listings once, then match per subscriber
    # (cheaper than re-querying per subscriber for typical volumes).
    sold_cursor = db.listings.find(
        {
            "status": {"$in": ["Sold", "Closed"]},
            "$or": [
                {"close_date": {"$gte": since.isoformat()}},
                {"modification_ts": {"$gte": since.isoformat()}},
            ],
        },
        {"_id": 0, "listing_key": 1, "city": 1, "region": 1, "beds": 1, "baths": 1,
         "living_area": 1, "property_type": 1, "list_price": 1, "close_price": 1, "close_date": 1},
    )
    sold = [d async for d in sold_cursor]
    if not sold:
        logger.info(f"just_sold_digest: no sold listings in last {LOOKBACK_DAYS}d — nothing to send")
        return {"sent": 0, "sold_count": 0, "subscribers_matched": 0}

    sent = 0
    subs_matched = 0
    subs_cursor = db.saved_searches.find({
        "status": "verified",
        "unsubscribed_at": None,
        "digest_frequency": "weekly_just_sold",
    })
    async for sub in subs_cursor:
        subs_matched += 1
        matches = [l for l in sold if _match_filters(l, sub.get("filters") or {})]
        if not matches:
            continue
        unsub = f"{base_url}/api/saved-searches/unsubscribe?token={sub.get('unsubscribe_token','')}"
        subject, html, text = _compose(sub, matches, unsub)
        try:
            await send_email(
                db, to=sub["email"], subject=subject, html=html, text=text,
                kind="commercial", related_id=sub.get("id"),
                unsubscribe_url=unsub,
            )
            sent += 1
            await db.saved_searches.update_one(
                {"id": sub.get("id")},
                {"$set": {"last_just_sold_sent_at": now.isoformat()}},
            )
        except Exception as e:
            logger.error(f"just_sold_digest failed for {sub.get('email')}: {e}")

    logger.info(f"just_sold_digest: sent={sent} sold_count={len(sold)} subscribers_matched={subs_matched}")
    return {"sent": sent, "sold_count": len(sold), "subscribers_matched": subs_matched}
