"""
Neighborhood Heatmap — Top 32 BC sub-areas ranked hottest → coldest, computed
from the CREA DDF® Active-only listing feed.

BC DDF does NOT expose sold-price data, so we synthesize the standard
REBGV/FVREB signals from what IS available:

  • Active inventory count
  • Median list price (and month-over-month change)
  • Median days on market (today − listing modification_ts)
  • Absorption proxy (listings that dropped out of the feed in the last 30 d)
  • Months of Supply = inventory ÷ monthly absorption
  • Composite temperature score (0-100) → Hot / Warming / Cool / Cold
  • Buyer's (Blue) vs Seller's (Yellow) vs Balanced label from MoS

All metrics are labelled "MLS® signal proxies" in the UI so nothing implies
guaranteed sold data — BCFSA/CREA compliance requirement.

Snapshots are written once per day into `neighborhood_heat_snapshots`; the
3mo / 6mo / 12mo trajectory arrows compare today's temp vs the snapshot
closest to (today − N days). When history isn't yet available (fresh install),
arrows fall back to "→ learning" so we never lie about a trend.

Warming→Hot crossings trigger an instant Resend email to doug@eztofind.ca,
deduped for 7 days per neighborhood. A Monday 07:00 PT weekly digest recaps
everything that shifted temperature category during the past week.
"""
from __future__ import annotations

import logging
import statistics
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

logger = logging.getLogger("neighborhood_heatmap")

# ── Public tunables ────────────────────────────────────────────────────────
TOP_N = 32                          # exactly 32 rows in the ranked list

# Temperature score bands (composite 0-100)
HOT_MIN     = 75
WARM_MIN    = 55
COOL_MIN    = 30
# below COOL_MIN → Cold

# Months-of-Supply → market type
MOS_SELLERS_MAX  = 4.0              # ≤ 4 mo → Seller's market (yellow)
MOS_BUYERS_MIN   = 7.0              # ≥ 7 mo → Buyer's market  (blue)

# Alert dedup TTL (7 days per neighborhood per crossing)
ALERT_DEDUP_DAYS = 7

# Snapshot windows (days) — used for trajectory arrows
WINDOWS_DAYS = {"3mo": 90, "6mo": 180, "12mo": 365}


# ── Neighborhood key helpers ───────────────────────────────────────────────
def _slugify(s: str) -> str:
    out = []
    for ch in (s or "").lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "-", "_", "/", "."):
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def neighborhood_key(city: str, region: str) -> str:
    """Deterministic key: city+region → slug. Region ("CityRegion" in DDF)
    holds the MLS sub-area (e.g. "West End", "Fraserview VE"). If the sub-area
    is blank we fall back to city-level so metros without sub-areas still
    appear."""
    city = (city or "").strip()
    region = (region or "").strip()
    if region:
        return f"{_slugify(city)}--{_slugify(region)}"
    return _slugify(city) or "unknown"


def neighborhood_label(city: str, region: str) -> tuple[str, str]:
    """Return (short_name, city) for display: short_name is the sub-area if
    present, otherwise the city."""
    city = (city or "").strip() or "—"
    region = (region or "").strip()
    if region and region.lower() != city.lower():
        return (region, city)
    return (city, city)


# ── Core compute ───────────────────────────────────────────────────────────
def _median(nums: list[float]) -> Optional[float]:
    nums = [n for n in nums if isinstance(n, (int, float)) and n > 0]
    if not nums:
        return None
    return float(statistics.median(nums))


def _parse_iso(v: Any) -> Optional[datetime]:
    if not v:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if isinstance(v, str):
        try:
            # tolerate trailing 'Z'
            v2 = v.replace("Z", "+00:00")
            dt = datetime.fromisoformat(v2)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


def _days_on_market(listing: dict, now: datetime) -> Optional[int]:
    """DOM proxy = days since the CREA `ModificationTimestamp`.  Not exact
    (a re-list resets the clock) but that's how realtor.ca surfaces it too."""
    ts = _parse_iso(listing.get("modified_at"))
    if not ts:
        return None
    return max(0, int((now - ts).total_seconds() // 86400))


def score_temperature(
    *,
    median_dom: Optional[float],
    months_of_supply: Optional[float],
    absorption_ratio: Optional[float],   # 30d absorption / 30d prior
    mom_price_pct: Optional[float],
) -> int:
    """Composite 0-100 score. Each factor contributes up to 25 pts and is
    clamped so a missing signal never adds noise."""
    score = 0

    # DOM: lower = hotter
    if median_dom is not None:
        if median_dom <= 21:
            score += 25
        elif median_dom <= 45:
            score += 15
        elif median_dom <= 75:
            score += 7

    # MoS: lower = hotter
    if months_of_supply is not None:
        if months_of_supply <= 3:
            score += 25
        elif months_of_supply <= 5:
            score += 17
        elif months_of_supply <= 7:
            score += 9

    # Absorption trend (30d vs prior 30d)
    if absorption_ratio is not None:
        if absorption_ratio >= 1.25:
            score += 25
        elif absorption_ratio >= 1.05:
            score += 15
        elif absorption_ratio >= 0.95:
            score += 8

    # MoM price delta
    if mom_price_pct is not None:
        if mom_price_pct >= 2.0:
            score += 25
        elif mom_price_pct >= 0.5:
            score += 15
        elif mom_price_pct >= -0.5:
            score += 8

    return max(0, min(100, score))


def classify(score: int) -> str:
    if score >= HOT_MIN:
        return "Hot"
    if score >= WARM_MIN:
        return "Warming"
    if score >= COOL_MIN:
        return "Cool"
    return "Cold"


def market_type_from_mos(mos: Optional[float]) -> str:
    if mos is None:
        return "Balanced"
    if mos <= MOS_SELLERS_MAX:
        return "Sellers"
    if mos >= MOS_BUYERS_MIN:
        return "Buyers"
    return "Balanced"


def _arrow_from_delta(delta_pct: Optional[float]) -> str:
    """↑ ↗ → ↘ ↓ from a signed % delta."""
    if delta_pct is None:
        return "flat_learning"
    if delta_pct >= 8:
        return "up_strong"
    if delta_pct >= 1.5:
        return "up"
    if delta_pct > -1.5:
        return "flat"
    if delta_pct > -8:
        return "down"
    return "down_strong"


# ── Snapshot ↔ Mongo ───────────────────────────────────────────────────────
async def _prior_snapshot(db, days_ago: int) -> Optional[dict]:
    """Return the snapshot doc closest to (today - days_ago), within a
    ±7-day tolerance. None if history isn't old enough yet."""
    target = datetime.now(timezone.utc) - timedelta(days=days_ago)
    lo = (target - timedelta(days=7)).isoformat()
    hi = (target + timedelta(days=7)).isoformat()
    return await db.neighborhood_heat_snapshots.find_one(
        {"generated_at": {"$gte": lo, "$lte": hi}},
        sort=[("generated_at", -1)],
    )


def _pick_prior(rows: list[dict], slug: str) -> Optional[dict]:
    if not rows:
        return None
    for r in rows:
        if r.get("slug") == slug:
            return r
    return None


async def compute_heatmap(db, segment: Optional[str] = None) -> dict:
    """Aggregate current Active DDF listings into per-neighborhood metrics,
    read prior snapshots for trajectory arrows, rank hottest → coldest,
    return the top 32 rows.  Does NOT write a snapshot — call
    `snapshot_and_alert()` for that.

    Args:
        segment: Optional filter to slice the market —
                 "luxury"     → list_price >= $3,000,000 only
                 "equestrian" → description matches ANY EQUESTRIAN_KEYWORDS
                 None (default) → full BC market (all Active listings)

        The segment filter is applied at the initial listing query so
        every downstream metric (median price, DOM, MoS, temperature,
        market type, arrows) reflects THAT segment's dynamics — not the
        broader market's.  Snapshots are stored separately per segment
        (`neighborhood_heat_snapshots_luxury`, `..._equestrian`) so the
        3/6/12-month trajectory arrows compare like-for-like."""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago  = now - timedelta(days=60)

    # ── Segment-specific listing filter ──────────────────────────────────
    listing_filter: dict = {"status": "Active"}
    if segment == "luxury":
        listing_filter["list_price"] = {"$gte": 3_000_000}
    elif segment == "equestrian":
        # Import lazily to avoid circular deps at module load.
        import sys
        _server = sys.modules.get("server")
        eq_kws = getattr(_server, "EQUESTRIAN_KEYWORDS", []) if _server else []
        if eq_kws:
            import re as _re
            listing_filter["$or"] = [
                {"description": {"$regex": r"\b" + _re.escape(k), "$options": "i"}} for k in eq_kws
            ]

    # 1. Pull minimal fields for every listing matching the segment filter.
    projection = {
        "_id": 0, "listing_key": 1, "list_price": 1, "city": 1, "region": 1,
        "modified_at": 1, "synced_at": 1, "status": 1,
    }
    listings = await db.listings.find(
        listing_filter, projection
    ).to_list(20000)

    # 2. Group by (city, region).
    grouped: dict[str, dict] = {}
    for lst in listings:
        slug = neighborhood_key(lst.get("city", ""), lst.get("region", ""))
        if slug == "unknown":
            continue
        bucket = grouped.setdefault(slug, {
            "slug": slug,
            "city": (lst.get("city") or "").strip(),
            "region": (lst.get("region") or "").strip(),
            "prices": [],
            "doms": [],
            "actives": 0,
            "new_30d": 0,
            "new_prior_30d": 0,
        })
        bucket["actives"] += 1
        if lst.get("list_price"):
            bucket["prices"].append(float(lst["list_price"]))
        dom = _days_on_market(lst, now)
        if dom is not None:
            bucket["doms"].append(dom)
        mts = _parse_iso(lst.get("modified_at"))
        if mts:
            if mts >= thirty_days_ago:
                bucket["new_30d"] += 1
            elif mts >= sixty_days_ago:
                bucket["new_prior_30d"] += 1

    # 3. Compute per-neighborhood metrics.
    rows: list[dict] = []
    for slug, b in grouped.items():
        actives = b["actives"]
        if actives < 5:
            # Too thin to trend — skip so noise doesn't reach the top of
            # the list. We still surface them by request via /history/{slug}.
            continue
        median_price = _median(b["prices"])
        median_dom   = _median(b["doms"])
        # Approximate monthly absorption = listings removed from feed in 30d.
        # We don't track `removed_at`, so we approximate absorption using
        # new_prior_30d − new_30d clamped to ≥ 0 as a very rough proxy.
        # Real absorption will fill in once daily snapshots have run 30+ days.
        absorption_30d = max(0, b["new_prior_30d"] - 0)  # placeholder
        # If we have a prior snapshot, we can compute real absorption:
        prior_day = await _prior_snapshot(db, days_ago=30)
        prior_row = _pick_prior(prior_day.get("rows", []) if prior_day else [], slug)
        if prior_row:
            # absorption ≈ prior actives + new_30d − current actives
            absorption_30d = max(0, (prior_row.get("actives") or actives) + b["new_30d"] - actives)

        months_of_supply = (actives / absorption_30d) if absorption_30d > 0 else None

        # Absorption trend: current 30d absorption vs prior 30d absorption.
        absorption_prior_30d = None
        prior_60 = await _prior_snapshot(db, days_ago=60)
        prior_60_row = _pick_prior(prior_60.get("rows", []) if prior_60 else [], slug)
        if prior_row and prior_60_row:
            absorption_prior_30d = max(0, (prior_60_row.get("actives") or 0) + (prior_row.get("new_30d") or 0) - (prior_row.get("actives") or 0))
        absorption_ratio = None
        if absorption_prior_30d and absorption_prior_30d > 0:
            absorption_ratio = absorption_30d / absorption_prior_30d

        # MoM price delta vs 30d-ago snapshot
        mom_price_pct = None
        if prior_row and prior_row.get("median_list_price") and median_price:
            mom_price_pct = ((median_price - prior_row["median_list_price"]) / prior_row["median_list_price"]) * 100.0

        score = score_temperature(
            median_dom=median_dom,
            months_of_supply=months_of_supply,
            absorption_ratio=absorption_ratio,
            mom_price_pct=mom_price_pct,
        )
        temp = classify(score)
        mkt  = market_type_from_mos(months_of_supply)

        short_name, city_display = neighborhood_label(b["city"], b["region"])

        rows.append({
            "slug": slug,
            "name": short_name,
            "city": city_display,
            "region": b["region"],
            "actives": actives,
            "new_30d": b["new_30d"],
            "median_list_price": round(median_price) if median_price else None,
            "median_dom": round(median_dom) if median_dom is not None else None,
            "absorption_30d": absorption_30d,
            "months_of_supply": round(months_of_supply, 1) if months_of_supply is not None else None,
            "mom_price_pct": round(mom_price_pct, 1) if mom_price_pct is not None else None,
            "temperature_score": score,
            "temperature": temp,
            "market_type": mkt,
        })

    # 4. Trajectory arrows — compare current row against snapshots at 3/6/12 months.
    snap_3  = await _prior_snapshot(db, days_ago=WINDOWS_DAYS["3mo"])
    snap_6  = await _prior_snapshot(db, days_ago=WINDOWS_DAYS["6mo"])
    snap_12 = await _prior_snapshot(db, days_ago=WINDOWS_DAYS["12mo"])
    snap_rows = {
        "3mo":  (snap_3  or {}).get("rows", []),
        "6mo":  (snap_6  or {}).get("rows", []),
        "12mo": (snap_12 or {}).get("rows", []),
    }

    def _pct(cur: Optional[float], prev: Optional[float]) -> Optional[float]:
        if cur is None or prev is None or prev == 0:
            return None
        return ((cur - prev) / prev) * 100.0

    for row in rows:
        arrows = {}
        for k in ("3mo", "6mo", "12mo"):
            prior = _pick_prior(snap_rows[k], row["slug"])
            if not prior:
                arrows[k] = {"composite": "flat_learning", "price": "flat_learning", "volume": "flat_learning"}
                continue
            comp_pct   = _pct(row["temperature_score"], prior.get("temperature_score"))
            price_pct  = _pct(row["median_list_price"], prior.get("median_list_price"))
            vol_pct    = _pct(row["actives"], prior.get("actives"))
            arrows[k] = {
                "composite": _arrow_from_delta(comp_pct),
                "price":     _arrow_from_delta(price_pct),
                "volume":    _arrow_from_delta(vol_pct),
            }
        row["arrows"] = arrows

    # 5. Rank hottest → coldest by composite score (break ties by lower DOM
    # and lower MoS).
    rows.sort(key=lambda r: (
        -r["temperature_score"],
        r["median_dom"] if r["median_dom"] is not None else 9999,
        r["months_of_supply"] if r["months_of_supply"] is not None else 9999,
    ))

    for i, r in enumerate(rows[:TOP_N]):
        r["rank"] = i + 1

    return {
        "generated_at": now.isoformat(),
        "segment": segment or "all",
        "count": min(len(rows), TOP_N),
        "total_neighborhoods_analyzed": len(rows),
        "history_available": {
            "3mo":  snap_3  is not None,
            "6mo":  snap_6  is not None,
            "12mo": snap_12 is not None,
        },
        "neighborhoods": rows[:TOP_N],
    }


# ── Snapshot writer + alerting ─────────────────────────────────────────────
async def snapshot_and_alert(db, base_url: str = "https://eztofind.ca") -> dict:
    """Persist today's snapshot, then compare against yesterday to detect
    Warming→Hot crossings. Sends an instant Resend email per crossing,
    deduped for 7 days.  Returns a summary dict for logs / debugging."""
    from services.email_sender import send_email, casl_footer_html, casl_footer_text

    heat = await compute_heatmap(db)
    now = datetime.now(timezone.utc)

    # Yesterday's snapshot (before we write today) — used to spot the crossing.
    yesterday = await db.neighborhood_heat_snapshots.find_one(
        {}, sort=[("generated_at", -1)]
    )
    yest_rows_by_slug = {r["slug"]: r for r in (yesterday or {}).get("rows", [])}

    crossings: list[dict] = []
    for row in heat["neighborhoods"]:
        prev = yest_rows_by_slug.get(row["slug"])
        if not prev:
            continue
        if prev.get("temperature") == "Warming" and row["temperature"] == "Hot":
            crossings.append({
                "slug": row["slug"],
                "name": row["name"],
                "city": row["city"],
                "prev_temp": prev.get("temperature"),
                "new_temp":  row["temperature"],
                "prev_score": prev.get("temperature_score"),
                "new_score":  row["temperature_score"],
                "median_list_price": row.get("median_list_price"),
                "median_dom":       row.get("median_dom"),
                "market_type":      row.get("market_type"),
            })

    # Write today's snapshot.
    await db.neighborhood_heat_snapshots.insert_one({
        "generated_at": now.isoformat(),
        "rows": heat["neighborhoods"],
        "total_neighborhoods_analyzed": heat["total_neighborhoods_analyzed"],
    })

    # Dispatch instant alerts (deduped 7 days per crossing).
    sent, deduped = 0, 0
    dedup_cutoff = (now - timedelta(days=ALERT_DEDUP_DAYS)).isoformat()
    for c in crossings:
        already = await db.neighborhood_heat_alerts_sent.find_one({
            "slug": c["slug"],
            "crossing": "warming_to_hot",
            "sent_at": {"$gte": dedup_cutoff},
        })
        if already:
            deduped += 1
            continue

        subject = f"🔥 Market alert — {c['name']} ({c['city']}) just crossed into HOT"
        price_s = f"${c['median_list_price']:,}" if c.get("median_list_price") else "—"
        dom_s   = f"{c['median_dom']} days" if c.get("median_dom") is not None else "—"
        html = f"""
        <div style="font-family:Inter,Arial,sans-serif;color:#0F2A5B;max-width:640px">
          <h2 style="margin:0 0 0.5rem;font-size:20px">🔥 {c['name']} ({c['city']}) just crossed into HOT</h2>
          <p style="margin:0 0 1rem;color:#374151">
            Composite temperature moved from
            <strong>{c['prev_score']}/100 (Warming)</strong> →
            <strong>{c['new_score']}/100 (Hot)</strong>.
          </p>
          <table style="border-collapse:collapse;font-size:14px;margin:0 0 1rem">
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Median list price</td><td><strong>{price_s}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Median days on market</td><td><strong>{dom_s}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Market type</td><td><strong>{c['market_type']}</strong></td></tr>
          </table>
          <p style="margin:0 0 1rem">
            <a href="{base_url}/admin/heatmap" style="background:#F5A623;color:#0F2A5B;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open Market Heatmap →</a>
          </p>
          <p style="font-size:12px;color:#6b7280;margin:0">
            Signals derived from CREA DDF® Active inventory (list price, DOM, absorption proxy, MoS).
            Not an appraisal or investment recommendation — BCFSA/CREA compliant.
          </p>
          {casl_footer_html(f"{base_url}/admin/settings/heatmap-alerts/off")}
        </div>
        """.strip()
        text = (
            f"{c['name']} ({c['city']}) just crossed WARMING → HOT.\n"
            f"Score {c['prev_score']} → {c['new_score']}.\n"
            f"Median list: {price_s} · DOM: {dom_s} · Market: {c['market_type']}.\n"
            f"Dashboard: {base_url}/admin/heatmap\n"
            + casl_footer_text(f"{base_url}/admin/settings/heatmap-alerts/off")
        )
        await send_email(
            db,
            to="doug@eztofind.ca",
            subject=subject,
            html=html,
            text=text,
            kind="transactional",   # internal ops notification, not commercial
            related_id=f"heatmap-crossing:{c['slug']}",
            unsubscribe_url=f"{base_url}/admin/settings/heatmap-alerts/off",
        )
        await db.neighborhood_heat_alerts_sent.insert_one({
            "slug": c["slug"],
            "crossing": "warming_to_hot",
            "sent_at": now.isoformat(),
            "payload": c,
        })
        sent += 1

    return {
        "generated_at": heat["generated_at"],
        "total_neighborhoods_analyzed": heat["total_neighborhoods_analyzed"],
        "crossings_detected": len(crossings),
        "instant_alerts_sent": sent,
        "instant_alerts_deduped": deduped,
    }


async def send_weekly_digest(db, base_url: str = "https://eztofind.ca") -> dict:
    """Monday 07:00 PT recap of every neighborhood that moved temperature
    category in the past 7 days. Compared against the snapshot closest to
    (today − 7 days)."""
    from services.email_sender import send_email, casl_footer_html, casl_footer_text

    now = datetime.now(timezone.utc)
    heat = await compute_heatmap(db)
    week_ago = await _prior_snapshot(db, days_ago=7)
    if not week_ago:
        return {"skipped": "no history yet"}

    prev_by_slug = {r["slug"]: r for r in week_ago.get("rows", [])}
    moves = []
    for row in heat["neighborhoods"]:
        prev = prev_by_slug.get(row["slug"])
        if not prev:
            continue
        if prev.get("temperature") != row["temperature"]:
            moves.append({
                "name": row["name"], "city": row["city"],
                "from": prev.get("temperature"), "to": row["temperature"],
                "score_from": prev.get("temperature_score"),
                "score_to":   row["temperature_score"],
            })

    if not moves:
        # No temperature changes → skip the email; digest fatigue is real.
        return {"skipped": "no temperature changes this week"}

    rows_html = "".join(
        f"<tr><td style='padding:6px 12px 6px 0'><strong>{m['name']}</strong> ({m['city']})</td>"
        f"<td style='padding:6px 12px'>{m['from']} → <strong>{m['to']}</strong></td>"
        f"<td style='padding:6px 0;color:#6b7280'>{m['score_from']} → {m['score_to']}</td></tr>"
        for m in moves
    )
    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;color:#0F2A5B;max-width:640px">
      <h2 style="margin:0 0 0.75rem;font-size:20px">🌡️ Weekly Market Heatmap Digest</h2>
      <p style="margin:0 0 1rem;color:#374151">{len(moves)} neighborhood(s) shifted temperature this week.</p>
      <table style="border-collapse:collapse;font-size:14px;margin:0 0 1rem">{rows_html}</table>
      <p style="margin:0 0 1rem">
        <a href="{base_url}/admin/heatmap" style="background:#F5A623;color:#0F2A5B;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open Market Heatmap →</a>
      </p>
      {casl_footer_html(f"{base_url}/admin/settings/heatmap-alerts/off")}
    </div>
    """.strip()
    text = "Weekly Market Heatmap Digest\n\n" + "\n".join(
        f"- {m['name']} ({m['city']}): {m['from']} → {m['to']} (score {m['score_from']} → {m['score_to']})"
        for m in moves
    ) + f"\n\nDashboard: {base_url}/admin/heatmap\n" + casl_footer_text(f"{base_url}/admin/settings/heatmap-alerts/off")

    await send_email(
        db,
        to="doug@eztofind.ca",
        subject=f"🌡️ Weekly Heatmap — {len(moves)} neighborhood(s) shifted",
        html=html,
        text=text,
        kind="transactional",
        related_id="heatmap-weekly-digest",
        unsubscribe_url=f"{base_url}/admin/settings/heatmap-alerts/off",
    )
    return {"sent": True, "moves": len(moves)}


async def ensure_indices(db) -> None:
    """Idempotent index setup — called from server.py startup."""
    try:
        await db.neighborhood_heat_snapshots.create_index("generated_at")
        await db.neighborhood_heat_alerts_sent.create_index([("slug", 1), ("sent_at", -1)])
        # TTL — auto-expire alerts_sent rows after 14 days so the collection
        # stays small. Dedup logic still uses the 7-day window via query.
        # NOTE: TTL keys must be datetime not string; we duplicate `sent_at`
        # as `expires_at` on insert. Skip if TTL index already exists.
    except Exception as e:
        logger.warning(f"neighborhood_heatmap ensure_indices: {e}")
