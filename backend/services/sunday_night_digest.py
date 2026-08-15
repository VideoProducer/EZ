"""
Sunday-Night Digest (Wave B follow-up).

Fires every Sunday evening at ~18:00 America/Vancouver — the night
before Doug's Monday-morning outreach round — combining TWO signals
into a single personalised email per verified subscriber:

  1. NEW MATCHES · listings that came online in the past 7 days and
     match the subscriber's saved-search filters. Sourced from
     `db.listings` where status='Active' and list_date >= now - 7d.
  2. FRESH PRICE DROPS · listings whose current list_price is lower
     than the subscriber's own saved-search `snapshot_prices` field
     (populated at signup, then rolled forward every Sunday). This
     is intentionally scoped to *saved-search matches* — a lighter
     signal than the daily favourites-driven Price-Drop Watch.

Why Sunday night?
- Buyers do their heaviest browsing over the weekend and want a
  digest that primes their Monday-morning showing requests. Landing
  in the inbox Sunday 18:00 PT gives them one clear inflection
  point to reply/text Doug before the market week starts.

Compliance:
- Only ships to `saved_searches` records with status='verified',
  unsubscribed_at is None, and digest_frequency='sunday_night'.
- CASL footer, unsubscribe token, and CREA DDF® attribution on
  every email. No exact street addresses in the price-drop block
  (city + property type + beds/baths only) — matches Price-Drop
  Watch's PIPA-friendly disclosure pattern.
- Filter matcher is shared with the just-sold digest to keep
  behaviour consistent across every subscriber-facing feed.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta

from .email_sender import send_email, casl_footer_html, casl_footer_text
from .just_sold_digest import _match_filters

logger = logging.getLogger("sunday_night_digest")

NEW_LISTINGS_LOOKBACK_DAYS = 7
MAX_NEW_LISTINGS = 8
MAX_DROPS = 5
MIN_DROP_ABS = 5_000     # ignore rounding-noise drops
MIN_DROP_PCT = 0.5       # or 0.5 %, whichever is smaller


def _significant_drop(prev: float, curr: float) -> bool:
    if not prev or not curr or curr >= prev:
        return False
    delta = prev - curr
    return delta >= MIN_DROP_ABS or (delta / prev) * 100 >= MIN_DROP_PCT


def _fmt_price(p) -> str:
    try:
        n = int(p or 0)
        if not n:
            return "—"
        return f"${n:,}"
    except Exception:
        return "—"


def _compose(sub: dict, new_matches: list, drops: list, unsubscribe_url: str) -> tuple[str, str, str]:
    filters = sub.get("filters") or {}
    area = filters.get("city") or "British Columbia"
    total = len(new_matches) + len(drops)
    if new_matches and drops:
        subject = f"🏡 Doug's Sunday brief · {len(new_matches)} new + {len(drops)} price cut{'s' if len(drops) != 1 else ''} in {area}"
    elif new_matches:
        subject = f"🏡 Doug's Sunday brief · {len(new_matches)} new match{'es' if len(new_matches) != 1 else ''} in {area}"
    else:
        subject = f"📉 Doug's Sunday brief · {len(drops)} price cut{'s' if len(drops) != 1 else ''} on your saved search"

    # New matches block
    new_rows_html, new_rows_text = [], []
    for l in new_matches[:MAX_NEW_LISTINGS]:
        city = l.get("city") or ""
        ptype = l.get("property_type") or "home"
        beds = l.get("beds") or 0
        baths = l.get("baths") or 0
        price = _fmt_price(l.get("list_price"))
        key = l.get("listing_key")
        new_rows_html.append(f"""
<tr>
  <td style="padding:12px 0;border-bottom:1px solid #eee;font-family:Inter,Arial,sans-serif;">
    <div style="font-size:15px;font-weight:700;color:#0F2A5B;">{price} · {ptype} · {city}</div>
    <div style="font-size:13px;color:#4b5563;margin-top:2px;">{beds} bed · {baths} bath · listed within the last 7 days</div>
    <div style="margin-top:6px;">
      <a href="https://eztofind.ca/listing/{key}" style="color:#0A3D99;font-weight:700;text-decoration:underline;font-size:13px;">View this listing →</a>
    </div>
  </td>
</tr>""")
        new_rows_text.append(f"• {price} · {ptype} · {city} · {beds}bd/{baths}ba → https://eztofind.ca/listing/{key}")

    # Price drops block
    drop_rows_html, drop_rows_text = [], []
    for d in drops[:MAX_DROPS]:
        city = d.get("city") or ""
        ptype = d.get("property_type") or "home"
        beds = d.get("beds") or 0
        baths = d.get("baths") or 0
        prev_p = d.get("previous_price") or 0
        curr_p = d.get("current_price") or 0
        delta = int(prev_p - curr_p)
        pct = (delta / prev_p * 100) if prev_p else 0
        key = d.get("listing_key")
        drop_rows_html.append(f"""
<tr>
  <td style="padding:12px 0;border-bottom:1px solid #eee;font-family:Inter,Arial,sans-serif;">
    <div style="font-size:15px;font-weight:700;color:#0F2A5B;">{ptype} in {city} · {beds} bed / {baths} bath</div>
    <div style="font-size:14px;color:#dc2626;font-weight:800;margin-top:4px;">▼ ${delta:,} lower ({pct:.1f} %) — now {_fmt_price(curr_p)}</div>
    <div style="margin-top:6px;">
      <a href="https://eztofind.ca/listing/{key}" style="color:#0A3D99;font-weight:700;text-decoration:underline;font-size:13px;">See the updated listing →</a>
    </div>
  </td>
</tr>""")
        drop_rows_text.append(f"• {ptype} in {city} · {beds}bd/{baths}ba · ${delta:,} lower ({pct:.1f}%) — now {_fmt_price(curr_p)} → https://eztofind.ca/listing/{key}")

    new_section_html = (
        '<h2 style="font-size:14px;color:#0F2A5B;margin:6px 0 4px;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;">New this week</h2>'
        '<table style="width:100%;border-collapse:collapse;">' + "".join(new_rows_html) + "</table>"
    ) if new_rows_html else ""
    drop_section_html = (
        '<h2 style="font-size:14px;color:#0F2A5B;margin:18px 0 4px;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;">Sellers moved on price</h2>'
        '<table style="width:100%;border-collapse:collapse;">' + "".join(drop_rows_html) + "</table>"
    ) if drop_rows_html else ""

    html = f"""
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#FAFAF7;">
  <div style="background:#0F2A5B;color:white;padding:22px 24px;border-radius:10px 10px 0 0;">
    <div style="font-size:11px;letter-spacing:0.16em;color:#F5A623;font-weight:700;">SUNDAY BRIEF · {area.upper()}</div>
    <h1 style="font-size:20px;margin:8px 0 4px;font-weight:800;">A quick look before Monday.</h1>
    <p style="margin:6px 0 0;font-size:13px;opacity:0.85;">{total} update{'s' if total != 1 else ''} on your saved search — sent ahead of Doug's Monday outreach so you can beat the rush.</p>
  </div>
  <div style="background:white;padding:16px 24px 22px;border-radius:0 0 10px 10px;">
    {new_section_html}
    {drop_section_html}
    <div style="margin-top:22px;padding:14px 16px;background:#FBF7EE;border-radius:8px;font-size:12px;color:#4b5563;line-height:1.55;">
      <strong style="color:#0F2A5B;">Want to see one this week?</strong> Reply to this email or text Doug directly at
      <a href="tel:6047870851" style="color:#0F2A5B;font-weight:600;">(604) 787-0851</a>.
      Private showings only — no pressure, no CASL spam.
    </div>
    <div style="margin-top:14px;font-size:11px;color:#6b7280;line-height:1.5;">
      Listing data sourced live from CREA DDF® · MLS®, Multiple Listing Service®, and REALTOR® are certification marks owned by The Canadian Real Estate Association. Doug LeMaire, REALTOR® is not the listing agent unless explicitly stated; verify all information with the listing brokerage before making an offer.
    </div>
  </div>
  {casl_footer_html(unsubscribe_url)}
</div>""".strip()

    text_parts = [f"Sunday Brief — {area}\n"]
    if new_rows_text:
        text_parts.append("NEW THIS WEEK:\n" + "\n".join(new_rows_text))
    if drop_rows_text:
        text_parts.append("SELLERS MOVED ON PRICE:\n" + "\n".join(drop_rows_text))
    text_parts.append("\nWant to see one this week? Reply to this email or text Doug at (604) 787-0851.\n")
    text_parts.append("Listing data sourced from CREA DDF® · MLS®, Multiple Listing Service®, and REALTOR® are certification marks owned by CREA.\n")
    text_parts.append(casl_footer_text(unsubscribe_url))
    return subject, html, "\n\n".join(text_parts)


async def run_sunday_night_digest(db, base_url: str = "https://eztofind.ca") -> dict:
    """Main entry point — invoked from the scheduler every Sunday at ~18:00 PT.

    First-run behaviour: subscribers whose saved-search has no
    `snapshot_prices` field yet are seeded (no drop section this week);
    from the following Sunday onward, drops are calculated relative to
    the previous week's snapshot.
    """
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=NEW_LISTINGS_LOOKBACK_DAYS)

    # Pull the active BC inventory (with a light projection) so we can
    # match per subscriber without re-querying the collection.
    active_cursor = db.listings.find(
        {"status": "Active"},
        {"_id": 0, "listing_key": 1, "city": 1, "region": 1, "beds": 1, "baths": 1,
         "property_type": 1, "list_price": 1, "list_date": 1, "modification_ts": 1},
    )
    active = [d async for d in active_cursor]
    active_by_key = {l["listing_key"]: l for l in active if l.get("listing_key")}

    # Newly listed = list_date within lookback window (fallback to
    # modification_ts if list_date isn't populated by the DDF pipeline).
    def _is_new(l):
        for k in ("list_date", "modification_ts"):
            v = l.get(k)
            if v and isinstance(v, str) and v >= since.isoformat():
                return True
        return False
    new_pool = [l for l in active if _is_new(l)]

    sent = 0
    subs_matched = 0
    new_matches_total = 0
    drops_total = 0

    subs_cursor = db.saved_searches.find({
        "status": "verified",
        "unsubscribed_at": None,
        "digest_frequency": "sunday_night",
    })
    async for sub in subs_cursor:
        subs_matched += 1
        filters = sub.get("filters") or {}
        # Fresh matches (new listings that match this subscriber's filter)
        new_matches = [l for l in new_pool if _match_filters(l, filters)][:MAX_NEW_LISTINGS]

        # Fresh drops (versus last-week snapshot on this exact saved search)
        prev_snap = sub.get("snapshot_prices") or {}
        drops = []
        new_snap = {}
        for l in active:
            if not _match_filters(l, filters):
                continue
            key = l.get("listing_key")
            price = float(l.get("list_price") or 0)
            if price <= 0 or not key:
                continue
            new_snap[key] = price
            prev_p = float(prev_snap.get(key) or 0)
            if prev_p and _significant_drop(prev_p, price):
                drops.append({
                    "listing_key": key,
                    "previous_price": prev_p,
                    "current_price": price,
                    "city": l.get("city"),
                    "property_type": l.get("property_type"),
                    "beds": l.get("beds"),
                    "baths": l.get("baths"),
                })
        drops = drops[:MAX_DROPS]

        # Persist this week's snapshot regardless of whether we send.
        try:
            await db.saved_searches.update_one(
                {"id": sub.get("id")},
                {"$set": {
                    "snapshot_prices": new_snap,
                    "snapshot_taken_at": now.isoformat(),
                }},
            )
        except Exception as e:
            logger.error(f"sunday_night_digest snapshot persist failed for {sub.get('email')}: {e}")

        # Nothing to send if we have neither new matches nor drops.
        if not new_matches and not drops:
            continue

        unsub = f"{base_url}/api/saved-searches/unsubscribe?token={sub.get('unsubscribe_token','')}"
        subject, html, text = _compose(sub, new_matches, drops, unsub)
        try:
            await send_email(
                db, to=sub["email"], subject=subject, html=html, text=text,
                kind="commercial", related_id=sub.get("id"),
                unsubscribe_url=unsub,
            )
            sent += 1
            new_matches_total += len(new_matches)
            drops_total += len(drops)
            await db.saved_searches.update_one(
                {"id": sub.get("id")},
                {"$set": {"last_sunday_brief_sent_at": now.isoformat()}},
            )
        except Exception as e:
            logger.error(f"sunday_night_digest failed for {sub.get('email')}: {e}")

    logger.info(
        f"sunday_night_digest: sent={sent} subs_matched={subs_matched} "
        f"new_matches_total={new_matches_total} drops_total={drops_total} "
        f"active_inventory={len(active)} new_pool={len(new_pool)}"
    )
    return {
        "sent": sent,
        "subscribers_matched": subs_matched,
        "new_matches_total": new_matches_total,
        "drops_total": drops_total,
        "active_inventory": len(active),
        "new_pool": len(new_pool),
    }
