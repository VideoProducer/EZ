"""
Monthly BC Market Report — original data aggregation for AEO / SEO.

Aggregates active-listing data (CREA DDF) by city into a public monthly
snapshot. Every month a nightly job stores the snapshot to Mongo; the
public endpoint reads back the frozen snapshot for AEO stability (LLM
crawlers cite fixed URLs like /market-report/2026-08).

Public API
----------
    await generate(db, ym) -> dict   # runs the aggregation
    await save_snapshot(db, ym)      # persists to `market_reports` collection
    await get_snapshot(db, ym)       # returns cached snapshot or None
    await list_months(db)            # available months, newest first

Data model (one doc per YYYY-MM)
--------------------------------
    {
      "ym": "2026-08",              # unique key
      "generated_at": "<iso>",
      "totals": {
        "active_listings": 52199,
        "cities_covered": 42,
        "median_price": 799000,
        "median_price_per_sqft": 812,
      },
      "cities": [
        {
          "city": "Vancouver",
          "count": 4210,
          "median_price": 1249000,
          "p25": 799000,
          "p75": 1795000,
          "median_price_per_sqft": 1104,
          "median_beds": 2,
          "median_baths": 2,
          "median_year_built": 2001,
          "top_types": [{"type": "Apartment", "count": 2810},
                        {"type": "Single Family", "count": 780}, ...],
          "listed_this_month": 620,
        }, ...
      ],
      "highlights": [
        "Vancouver median list price is $1,249,000",
        "Most active city this month: Vancouver with 4,210 listings",
        ...
      ]
    }
"""
from __future__ import annotations

import calendar
import logging
import statistics
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

COLL = "market_reports"
MIN_CITY_COUNT = 20     # skip cities with < 20 active listings (noisy medians)
MAX_CITIES_IN_REPORT = 60


def _now_ym() -> str:
    n = datetime.now(timezone.utc)
    return f"{n.year:04d}-{n.month:02d}"


def _month_bounds(ym: str) -> tuple[datetime, datetime]:
    y, m = int(ym[:4]), int(ym[5:7])
    start = datetime(y, m, 1, tzinfo=timezone.utc)
    last_day = calendar.monthrange(y, m)[1]
    end = datetime(y, m, last_day, 23, 59, 59, tzinfo=timezone.utc)
    return start, end


def _percentile(values, pct):
    if not values:
        return None
    s = sorted(values)
    k = (len(s) - 1) * pct
    lo, hi = int(k), min(int(k) + 1, len(s) - 1)
    if lo == hi:
        return s[lo]
    return int(s[lo] + (s[hi] - s[lo]) * (k - lo))


def _int_or_none(v):
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


async def generate(db, ym: Optional[str] = None) -> dict:
    """Run the aggregation for the given month (default: current month).
    Reads active listings and buckets by city."""
    ym = ym or _now_ym()
    start, end = _month_bounds(ym)

    # Pull all active listings in one pass — fields we need are small.
    projection = {
        "listing_key": 1, "city": 1, "list_price": 1, "living_area": 1,
        "beds": 1, "baths": 1, "year_built": 1, "property_type": 1,
        "created_at": 1,
    }
    cursor = db.listings.find({"status": "Active"}, projection)

    buckets: dict[str, list[dict]] = {}
    all_prices = []
    all_ppsf = []
    async for l in cursor:
        city = (l.get("city") or "").strip()
        if not city:
            continue
        price = _int_or_none(l.get("list_price"))
        if not price or price < 1000:
            continue
        buckets.setdefault(city, []).append(l)
        all_prices.append(price)
        sqft = _int_or_none(l.get("living_area"))
        if sqft and sqft > 100:
            all_ppsf.append(price / sqft)

    cities_out = []
    for city, listings in buckets.items():
        if len(listings) < MIN_CITY_COUNT:
            continue
        prices = [p for p in (_int_or_none(l.get("list_price")) for l in listings) if p]
        ppsf = []
        for l in listings:
            p = _int_or_none(l.get("list_price"))
            sq = _int_or_none(l.get("living_area"))
            if p and sq and sq > 100:
                ppsf.append(p / sq)
        beds = [b for b in (_int_or_none(l.get("beds")) for l in listings) if b is not None]
        baths = [b for b in (_int_or_none(l.get("baths")) for l in listings) if b is not None]
        yb = [y for y in (_int_or_none(l.get("year_built")) for l in listings) if y and y > 1800]
        types: dict[str, int] = {}
        for l in listings:
            t = (l.get("property_type") or "Other").strip() or "Other"
            types[t] = types.get(t, 0) + 1
        top_types = sorted(
            [{"type": t, "count": n} for t, n in types.items()],
            key=lambda x: -x["count"],
        )[:4]
        # Count listings whose created_at falls in this month.
        listed_this_month = 0
        for l in listings:
            ca = l.get("created_at")
            if isinstance(ca, str):
                try:
                    ca = datetime.fromisoformat(ca.replace("Z", "+00:00"))
                except Exception:
                    ca = None
            if isinstance(ca, datetime):
                # Ensure tz-aware.
                if ca.tzinfo is None:
                    ca = ca.replace(tzinfo=timezone.utc)
                if start <= ca <= end:
                    listed_this_month += 1
        cities_out.append({
            "city": city,
            "count": len(listings),
            "median_price": int(statistics.median(prices)),
            "p25": _percentile(prices, 0.25),
            "p75": _percentile(prices, 0.75),
            "median_price_per_sqft": int(statistics.median(ppsf)) if ppsf else None,
            "median_beds": int(statistics.median(beds)) if beds else None,
            "median_baths": int(statistics.median(baths)) if baths else None,
            "median_year_built": int(statistics.median(yb)) if yb else None,
            "top_types": top_types,
            "listed_this_month": listed_this_month,
        })

    # Sort by count desc, cap.
    cities_out.sort(key=lambda c: -c["count"])
    cities_out = cities_out[:MAX_CITIES_IN_REPORT]

    totals = {
        "active_listings": sum(c["count"] for c in cities_out),
        "cities_covered": len(cities_out),
        "median_price": int(statistics.median(all_prices)) if all_prices else None,
        "median_price_per_sqft": int(statistics.median(all_ppsf)) if all_ppsf else None,
    }

    # Auto-generated highlights — used for hero copy + Speakable schema.
    highlights = []
    if totals["median_price"]:
        highlights.append(
            f"British Columbia's median active-listing price is ${totals['median_price']:,} "
            f"across {totals['active_listings']:,} homes on the MLS® in {ym}."
        )
    if cities_out:
        top = cities_out[0]
        highlights.append(
            f"{top['city']} leads with {top['count']:,} active listings and a median "
            f"list price of ${top['median_price']:,}."
        )
        # Highest-price city + lowest-price city
        by_price = sorted(cities_out, key=lambda c: -c["median_price"])
        highlights.append(
            f"Highest median list price in the report: {by_price[0]['city']} "
            f"at ${by_price[0]['median_price']:,}."
        )
        highlights.append(
            f"Most affordable major market in the report: {by_price[-1]['city']} "
            f"at ${by_price[-1]['median_price']:,} median."
        )
    if totals["median_price_per_sqft"]:
        highlights.append(
            f"Median province-wide list price per square foot: "
            f"${totals['median_price_per_sqft']:,}/sqft."
        )

    return {
        "ym": ym,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "totals": totals,
        "cities": cities_out,
        "highlights": highlights,
    }


async def save_snapshot(db, ym: Optional[str] = None) -> dict:
    """Generate + persist for `ym` (upsert)."""
    ym = ym or _now_ym()
    snap = await generate(db, ym)
    await db[COLL].update_one({"ym": ym}, {"$set": snap}, upsert=True)
    return snap


async def get_snapshot(db, ym: Optional[str] = None) -> Optional[dict]:
    """Return the saved snapshot if present.  If `ym` is the current month
    and no snapshot exists yet, generate + save on-the-fly."""
    ym = ym or _now_ym()
    doc = await db[COLL].find_one({"ym": ym}, {"_id": 0})
    if doc:
        return doc
    if ym == _now_ym():
        return await save_snapshot(db, ym)
    return None


async def list_months(db) -> list[str]:
    """List all snapshotted months, newest first."""
    out = []
    async for d in db[COLL].find({}, {"ym": 1, "_id": 0}).sort("ym", -1):
        if d.get("ym"):
            out.append(d["ym"])
    return out
