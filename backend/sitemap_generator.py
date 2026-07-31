"""
Generate a real sitemap.xml for eztofind.ca from live MongoDB data.

Writes to: /app/frontend/public/sitemap.xml

Ping-friendly: search engines expect the sitemap to be reachable at
https://eztofind.ca/sitemap.xml — which robots.txt already points to.

Run on backend startup and after any admin update (via /api/admin/regenerate-sitemap).
"""
from __future__ import annotations
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

BASE_URL = "https://eztofind.ca"

STATIC_URLS = [
    ("/",                  "1.0", "daily"),
    ("/listings",          "0.9", "daily"),
    ("/communities",       "0.9", "weekly"),
    ("/neighbourhoods",    "0.85", "weekly"),
    ("/glossary",          "0.9", "weekly"),
    ("/valuation",         "0.7", "monthly"),
    ("/relocating",        "0.9", "weekly"),
    ("/about",             "0.7", "monthly"),
    ("/realtor-network",   "0.8", "monthly"),
    ("/referral-request",  "0.7", "monthly"),
    ("/buyer",             "0.7", "monthly"),
    ("/seller",            "0.7", "monthly"),
    ("/contact",           "0.6", "yearly"),
    # Regions index + 3 corridor pages (Doug's focus areas)
    ("/regions",                    "0.85", "monthly"),
    ("/regions/greater-vancouver",  "0.85", "monthly"),
    ("/regions/fraser-valley",      "0.85", "monthly"),
    ("/regions/sea-to-sky",         "0.85", "monthly"),
    # Specialty pages (Doug's 6 practice areas)
    ("/specialties",               "0.8", "monthly"),
    ("/specialties/detached",      "0.75", "monthly"),
    ("/specialties/luxury",        "0.75", "monthly"),
    ("/specialties/equestrian",    "0.75", "monthly"),
    ("/specialties/estate-sales",  "0.75", "monthly"),
    ("/specialties/condos",        "0.75", "monthly"),
    ("/specialties/townhomes",     "0.75", "monthly"),
    # Legal / compliance pages — indexable for trust signals and E-E-A-T.
    ("/privacy",           "0.4", "yearly"),
    ("/terms",             "0.4", "yearly"),
    ("/compliance",        "0.5", "yearly"),
    ("/copyright",         "0.5", "yearly"),
    ("/data-attribution",  "0.4", "yearly"),
    ("/breach-policy",     "0.4", "yearly"),
    ("/dorts",             "0.5", "yearly"),
    ("/legal/retention",   "0.4", "yearly"),
    ("/code-of-ethics",    "0.4", "yearly"),
    ("/complaints",        "0.4", "yearly"),
    # NOTE: /beta (invitation-only), /unsubscribe (per-user tokens), /email-preferences,
    # /privacy/data-request, /favorites (per-visitor), and /admin/* are
    # DELIBERATELY EXCLUDED from the public sitemap.
]

def _url_tag(loc: str, lastmod: str, changefreq: str, priority: str) -> str:
    # Escape ampersands for XML safety
    loc = loc.replace("&", "&amp;")
    return (
        "  <url>\n"
        f"    <loc>{loc}</loc>\n"
        f"    <lastmod>{lastmod}</lastmod>\n"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        "  </url>\n"
    )

async def generate_sitemap(db, output_path: str = "/app/frontend/public/sitemap.xml") -> dict:
    """Regenerate sitemap.xml from live DB. Returns stats dict."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    parts: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>\n',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',
    ]

    # Static pages
    static_count = 0
    for path, priority, changefreq in STATIC_URLS:
        parts.append(_url_tag(f"{BASE_URL}{path}", today, changefreq, priority))
        static_count += 1

    # Glossary terms
    gterms = await db.glossary.find({}, {"slug": 1, "last_curated_at": 1, "_id": 0}).to_list(2000)
    for t in gterms:
        slug = t.get("slug")
        if not slug: continue
        lastmod = (t.get("last_curated_at") or today)[:10]  # ISO date only
        parts.append(_url_tag(f"{BASE_URL}/glossary/{slug}", lastmod, "monthly", "0.8"))

    # Community pages: enumerate from the seed file (source of truth for community list)
    import json
    community_seed = Path("/app/backend/data/communities_seed.json")
    community_count = 0
    community_slug_by_name = {}
    if community_seed.exists():
        comms = json.loads(community_seed.read_text())
        for region, names in comms.items():
            for name in names:
                slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
                community_slug_by_name[name.lower()] = (slug, region)
                parts.append(_url_tag(f"{BASE_URL}/community/{slug}", today, "weekly", "0.7"))
                community_count += 1

    # Micro-neighbourhood pages: enumerate live from CREA DDF sub-area (`region`)
    # values on active listings. Only cities where the local board populates
    # CityRegion (Interior/Okanagan/Vancouver Island boards) will contribute.
    neighbourhood_count = 0
    try:
        pipeline = [
            {"$match": {"status":"Active","region":{"$nin":["", None]}}},
            {"$group": {"_id": {"city":"$city","region":"$region"}}},
        ]
        async for row in db.listings.aggregate(pipeline):
            city = (row["_id"].get("city") or "").strip()
            n_name = (row["_id"].get("region") or "").strip()
            hit = community_slug_by_name.get(city.lower())
            if not hit or not n_name:
                continue
            c_slug, region = hit
            if n_name.strip().lower() == region.strip().lower():
                continue  # parent region label — skip
            n_slug = re.sub(r"[^a-z0-9]+", "-", n_name.lower()).strip("-")
            if not n_slug:
                continue
            parts.append(_url_tag(f"{BASE_URL}/community/{c_slug}/n/{n_slug}", today, "weekly", "0.6"))
            neighbourhood_count += 1
    except Exception:
        pass

    parts.append("</urlset>\n")
    xml = "".join(parts)

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(xml, encoding="utf-8")

    return {
        "static": static_count,
        "glossary": len(gterms),
        "communities": community_count,
        "neighbourhoods": neighbourhood_count,
        "total": static_count + len(gterms) + community_count + neighbourhood_count,
        "path": str(out),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
