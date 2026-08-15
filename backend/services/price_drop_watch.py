"""
Price-Drop Watch (Wave B · item #37).

Once per day, for each verified user_favorites record whose owner opted
into `price_drop_watch=True`, compare every favourited listing's current
list_price against a snapshot from the previous run. If the price
dropped, send a CASL-compliant notification email and update the
snapshot.

Storage:
- `listing_price_snapshots` — {listing_key, last_price, last_seen_at}
    A cheap, single-document-per-listing store. First run seeds it; each
    subsequent run compares & updates.
- `user_favorites` — unchanged (existing double-opt-in verification is
    reused; we do NOT touch the schema).

Compliance:
- Emails go only to `status='verified'` favorites records with
    `casl_consent=True` and a valid unsubscribe token.
- Every message carries the full CASL footer, one-click unsubscribe, and
    the CREA DDF® / MLS® / REALTOR® trademark attribution.
- No exact street addresses in the digest — city + property type +
    beds/baths only (respects seller privacy under BC PIPA).
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone

from .email_sender import send_email, casl_footer_html, casl_footer_text

logger = logging.getLogger("price_drop_watch")

MIN_DROP_ABS = 5_000   # ignore rounding-noise drops
MIN_DROP_PCT = 0.5     # or a 0.5 % drop, whichever is smaller

def _significant_drop(prev: float, curr: float) -> bool:
    if not prev or not curr or curr >= prev:
        return False
    delta = prev - curr
    return delta >= MIN_DROP_ABS or (delta / prev) * 100 >= MIN_DROP_PCT


def _compose(subscriber_email: str, drops: list, unsubscribe_url: str) -> tuple[str, str, str]:
    subject = f"📉 Price drop on {len(drops)} of your saved BC listing{'s' if len(drops) != 1 else ''}"
    rows_html, rows_text = [], []
    for d in drops:
        city   = d.get("city") or ""
        ptype  = d.get("property_type") or "home"
        beds   = d.get("beds") or 0
        baths  = d.get("baths") or 0
        prev_p = d.get("previous_price") or 0
        curr_p = d.get("current_price") or 0
        delta  = int(prev_p - curr_p)
        pct    = (delta / prev_p * 100) if prev_p else 0
        key    = d.get("listing_key")
        rows_html.append(f"""
<tr>
  <td style="padding:14px 0;border-bottom:1px solid #eee;font-family:Inter,Arial,sans-serif;">
    <div style="font-size:15px;font-weight:700;color:#0F2A5B;">{ptype} in {city} · {beds} bed / {baths} bath</div>
    <div style="font-size:14px;color:#dc2626;font-weight:800;margin-top:4px;">
      ▼ ${delta:,} lower ({pct:.1f} %) — now ${int(curr_p):,} (was ${int(prev_p):,})
    </div>
    <div style="margin-top:8px;">
      <a href="https://eztofind.ca/listing/{key}" style="color:#0F2A5B;font-weight:700;text-decoration:underline;font-size:13px;">See the updated listing →</a>
    </div>
  </td>
</tr>""")
        rows_text.append(f"• {ptype} in {city} · {beds}bd/{baths}ba · ${delta:,} lower ({pct:.1f}%) — now ${int(curr_p):,} → https://eztofind.ca/listing/{key}")

    html = f"""
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#FAFAF7;">
  <div style="background:#0F2A5B;color:white;padding:22px 24px;border-radius:10px 10px 0 0;">
    <div style="font-size:11px;letter-spacing:0.16em;color:#F5A623;font-weight:700;">PRICE-DROP WATCH</div>
    <h1 style="font-size:20px;margin:8px 0 4px;font-weight:800;">A seller just moved on price.</h1>
    <p style="margin:6px 0 0;font-size:13px;opacity:0.85;">{len(drops)} of your saved listing{'s' if len(drops) != 1 else ''} dropped in the last 24 hours.</p>
  </div>
  <div style="background:white;padding:16px 24px 20px;border-radius:0 0 10px 10px;">
    <table style="width:100%;border-collapse:collapse;">{''.join(rows_html)}</table>
    <div style="margin-top:20px;padding:14px 16px;background:#FBF7EE;border-radius:8px;font-size:12px;color:#4b5563;line-height:1.55;">
      <strong style="color:#0F2A5B;">Want to see it in person?</strong> Reply to this email or text Doug directly at
      <a href="tel:6047870851" style="color:#0F2A5B;font-weight:600;">(604) 787-0851</a>.
      Private showings only — no pressure, no spam.
    </div>
    <div style="margin-top:14px;font-size:11px;color:#6b7280;line-height:1.5;">
      Price history sourced from CREA DDF® · MLS®, Multiple Listing Service®, and REALTOR® are certification marks owned by The Canadian Real Estate Association. Doug LeMaire, REALTOR® is not the listing agent for any property shown unless explicitly stated; verify all information with the listing brokerage before making an offer.
    </div>
  </div>
  {casl_footer_html(unsubscribe_url)}
</div>""".strip()

    text = (
        f"Price-Drop Watch — {len(drops)} of your saved BC listings dropped in the last 24 hours:\n\n"
        + "\n".join(rows_text)
        + "\n\nWant to see one in person? Reply to this email or text Doug at (604) 787-0851. Private showings only.\n\n"
        + "Price history sourced from CREA DDF® · MLS®, Multiple Listing Service®, and REALTOR® are certification marks owned by The Canadian Real Estate Association.\n"
        + casl_footer_text(unsubscribe_url)
    )
    return subject, html, text


async def run_price_drop_watch(db, base_url: str = "https://eztofind.ca") -> dict:
    """Main entry point — fired daily from the scheduler."""
    now = datetime.now(timezone.utc)

    # Load every listing_key that anyone favourited (Active only — no
    # sense notifying on withdrawn/sold listings).
    fav_cursor = db.user_favorites.find(
        {"status": "verified", "unsubscribed_at": None,
         "$or": [{"price_drop_watch": True}, {"price_drop_watch": {"$exists": False}}]},
        {"email": 1, "listing_keys": 1, "verification_token": 1, "_id": 0},
    )
    users = [u async for u in fav_cursor]
    if not users:
        return {"sent": 0, "users_checked": 0, "drops_detected": 0}

    # Aggregate distinct listing_keys across all users
    all_keys = list({k for u in users for k in (u.get("listing_keys") or [])})
    if not all_keys:
        return {"sent": 0, "users_checked": len(users), "drops_detected": 0}

    # Fetch current prices from `db.listings` in one shot
    current_cursor = db.listings.find(
        {"listing_key": {"$in": all_keys}, "status": "Active"},
        {"_id": 0, "listing_key": 1, "list_price": 1, "city": 1,
         "property_type": 1, "beds": 1, "baths": 1},
    )
    current = {c["listing_key"]: c async for c in current_cursor}

    # Load previous snapshots
    snap_cursor = db.listing_price_snapshots.find({"listing_key": {"$in": all_keys}})
    snapshots = {s["listing_key"]: s async for s in snap_cursor}

    # Detect drops + update snapshots
    drop_events = {}  # listing_key → {previous_price, current_price, ...meta}
    for key, cur in current.items():
        cur_price = float(cur.get("list_price") or 0)
        if cur_price <= 0:
            continue
        prev = snapshots.get(key)
        prev_price = float(prev.get("last_price") or 0) if prev else 0
        if prev_price and _significant_drop(prev_price, cur_price):
            drop_events[key] = {
                "listing_key": key,
                "previous_price": prev_price,
                "current_price": cur_price,
                "city": cur.get("city"),
                "property_type": cur.get("property_type"),
                "beds": cur.get("beds"),
                "baths": cur.get("baths"),
            }
        # Upsert snapshot (regardless of drop) — one write per listing
        try:
            await db.listing_price_snapshots.update_one(
                {"listing_key": key},
                {"$set": {"listing_key": key, "last_price": cur_price, "last_seen_at": now.isoformat()}},
                upsert=True,
            )
        except Exception:
            pass

    if not drop_events:
        logger.info(f"price_drop_watch: no drops detected across {len(current)} listings / {len(users)} users")
        return {"sent": 0, "users_checked": len(users), "drops_detected": 0}

    # Email each user whose favourites include any drop
    sent = 0
    for u in users:
        user_drops = [drop_events[k] for k in (u.get("listing_keys") or []) if k in drop_events]
        if not user_drops:
            continue
        unsub = f"{base_url}/api/favorites/unsubscribe?token={u.get('verification_token','')}"
        subject, html, text = _compose(u["email"], user_drops, unsub)
        try:
            await send_email(
                db, to=u["email"], subject=subject, html=html, text=text,
                kind="commercial", related_id=u.get("verification_token"),
                unsubscribe_url=unsub,
            )
            sent += 1
        except Exception as e:
            logger.error(f"price_drop_watch failed for {u.get('email')}: {e}")

    logger.info(f"price_drop_watch: sent={sent} users_checked={len(users)} drops_detected={len(drop_events)}")
    return {"sent": sent, "users_checked": len(users), "drops_detected": len(drop_events)}
