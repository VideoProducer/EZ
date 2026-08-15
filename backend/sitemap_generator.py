"""
Generate a sitemap INDEX (+ split sub-sitemaps) for eztofind.ca.

Writes to /app/frontend/public/:
    sitemap.xml              — the INDEX (references the sub-sitemaps below)
    sitemap-static.xml       — 37 static / brand / regional / specialty URLs
    sitemap-glossary.xml     — one URL per curated glossary term
    sitemap-communities.xml  — one URL per BC community
    sitemap-neighbourhoods.xml — micro-neighbourhood pages derived from live listings
    sitemap-market-reports.xml — the monthly BC market report snapshots

Why split?
    Search engines re-crawl SMALLER sub-sitemaps more aggressively than one giant
    file, and Google Search Console + Bing Webmaster Tools display coverage
    stats per sub-sitemap so we can spot AEO gaps quickly.

Ping-friendly: the ROOT sitemap is still at https://eztofind.ca/sitemap.xml —
robots.txt already points to it. Every sub-sitemap URL is listed inside the
index, so a single GET on the root gives a crawler the full picture.

--- Image Sitemap Extension ---
The static + community + neighbourhood + region sub-sitemaps include
Google's `xmlns:image` namespace with <image:image> entries for Doug-owned
artwork so AI visual-search engines (Gemini / ChatGPT Vision / Perplexity
Images) can attribute the imagery back to eztofind.ca.

We DO NOT include MLS® listing photos here — CREA DDF® terms forbid bulk
photo redistribution. Only Doug-owned artwork ships in the sitemap.
"""
from __future__ import annotations
import re
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional

BASE_URL = "https://eztofind.ca"
PUBLIC_DIR = Path("/app/frontend/public")

# ── Brand imagery ─────────────────────────────────────────────────────────
BRAND_IMAGES = {
    "home": [
        {
            "loc": f"{BASE_URL}/images/doogie-laptop.png",
            "caption": "Doogie — the EZtoFind.ca AI real estate mascot at his laptop",
            "title": "Doogie Laptop — EZtoFind.ca",
        },
        {
            "loc": f"{BASE_URL}/images/doogie-pointing-right.png",
            "caption": "Doogie the AI real estate mascot pointing at BC listings",
            "title": "Doogie Pointing — EZtoFind.ca",
        },
    ],
    "regions/greater-vancouver": [{
        "loc": f"{BASE_URL}/images/regions/greater-vancouver.webp",
        "caption": "Greater Vancouver skyline — BC real estate market covered by Doug LeMaire",
        "title": "Greater Vancouver Real Estate",
        "geo": "Vancouver, British Columbia, Canada",
    }],
    "regions/fraser-valley": [{
        "loc": f"{BASE_URL}/images/regions/fraser-valley.webp",
        "caption": "Fraser Valley farmland and Coast Mountains — BC real estate corridor",
        "title": "Fraser Valley Real Estate",
        "geo": "Fraser Valley, British Columbia, Canada",
    }],
    "regions/sea-to-sky": [{
        "loc": f"{BASE_URL}/images/regions/sea-to-sky.webp",
        "caption": "Sea-to-Sky Highway between Vancouver and Whistler",
        "title": "Sea-to-Sky Real Estate",
        "geo": "Squamish, British Columbia, Canada",
    }],
    "regions/vancouver-island": [{
        "loc": f"{BASE_URL}/images/regions/vancouver-island.webp",
        "caption": "Vancouver Island Pacific shoreline — BC real estate",
        "title": "Vancouver Island Real Estate",
        "geo": "Victoria, British Columbia, Canada",
    }],
    "regions/okanagan": [{
        "loc": f"{BASE_URL}/images/regions/okanagan.webp",
        "caption": "Okanagan Lake and vineyards — BC real estate market",
        "title": "Okanagan Real Estate",
        "geo": "Kelowna, British Columbia, Canada",
    }],
}

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
    ("/regions",                    "0.85", "monthly"),
    ("/regions/greater-vancouver",  "0.85", "monthly"),
    ("/regions/fraser-valley",      "0.85", "monthly"),
    ("/regions/sea-to-sky",         "0.85", "monthly"),
    ("/regions/vancouver-island",   "0.85", "monthly"),
    ("/regions/okanagan",           "0.85", "monthly"),
    ("/specialties",               "0.8", "monthly"),
    ("/specialties/detached",      "0.75", "monthly"),
    ("/specialties/luxury",        "0.75", "monthly"),
    ("/specialties/equestrian",    "0.75", "monthly"),
    ("/specialties/estate-sales",  "0.75", "monthly"),
    ("/specialties/condos",        "0.75", "monthly"),
    ("/specialties/townhomes",     "0.75", "monthly"),
    ("/privacy",           "0.4", "yearly"),
    ("/terms",             "0.4", "yearly"),
    ("/compliance",        "0.5", "yearly"),
    ("/copyright",         "0.5", "yearly"),
    ("/ai-use",            "0.6", "yearly"),
    ("/data-attribution",  "0.4", "yearly"),
    ("/breach-policy",     "0.4", "yearly"),
    ("/dorts",             "0.5", "yearly"),
    ("/legal/retention",   "0.4", "yearly"),
    ("/code-of-ethics",    "0.4", "yearly"),
    ("/complaints",        "0.4", "yearly"),
]


# ── XML helpers ───────────────────────────────────────────────────────────
def _xml_escape(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def _image_block(images: List[Dict]) -> str:
    out = []
    for img in images:
        out.append("    <image:image>\n")
        out.append(f"      <image:loc>{_xml_escape(img['loc'])}</image:loc>\n")
        if img.get("caption"): out.append(f"      <image:caption>{_xml_escape(img['caption'])}</image:caption>\n")
        if img.get("title"):   out.append(f"      <image:title>{_xml_escape(img['title'])}</image:title>\n")
        if img.get("geo"):     out.append(f"      <image:geo_location>{_xml_escape(img['geo'])}</image:geo_location>\n")
        if img.get("license"): out.append(f"      <image:license>{_xml_escape(img['license'])}</image:license>\n")
        out.append("    </image:image>\n")
    return "".join(out)

def _url_tag(loc: str, lastmod: str, changefreq: str, priority: str,
             images: Optional[List[Dict]] = None) -> str:
    loc = loc.replace("&", "&amp;")
    parts = [
        "  <url>\n",
        f"    <loc>{loc}</loc>\n",
        f"    <lastmod>{lastmod}</lastmod>\n",
        f"    <changefreq>{changefreq}</changefreq>\n",
        f"    <priority>{priority}</priority>\n",
    ]
    if images:
        parts.append(_image_block(images))
    parts.append("  </url>\n")
    return "".join(parts)

def _wrap_urlset(url_tags: List[str], with_image_ns: bool = False) -> str:
    header = '<?xml version="1.0" encoding="UTF-8"?>\n'
    if with_image_ns:
        header += (
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
            '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
        )
    else:
        header += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    return header + "".join(url_tags) + "</urlset>\n"

def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


# ── Sub-sitemap builders ──────────────────────────────────────────────────
def _build_static() -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tags = []
    for path, priority, changefreq in STATIC_URLS:
        key = path.lstrip("/") or "home"
        images = BRAND_IMAGES.get(key)
        tags.append(_url_tag(f"{BASE_URL}{path}", today, changefreq, priority, images))
    return _wrap_urlset(tags, with_image_ns=True)

async def _build_glossary(db) -> tuple[str, int]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    gterms = await db.glossary.find({}, {"slug": 1, "last_curated_at": 1, "_id": 0}).to_list(2000)
    tags = []
    for t in gterms:
        slug = t.get("slug")
        if not slug: continue
        lastmod = (t.get("last_curated_at") or today)[:10]
        tags.append(_url_tag(f"{BASE_URL}/glossary/{slug}", lastmod, "monthly", "0.8"))
    return _wrap_urlset(tags), len(tags)

def _build_communities() -> tuple[str, int, dict]:
    """Returns (xml, count, community_slug_by_name_lower)."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    community_seed = Path("/app/backend/data/communities_seed.json")
    slug_by_name = {}
    tags = []
    if community_seed.exists():
        comms = json.loads(community_seed.read_text())
        for region, names in comms.items():
            for name in names:
                slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
                slug_by_name[name.lower()] = (slug, region)
                community_img = [{
                    "loc": f"{BASE_URL}/images/doogie-pointing-right.png",
                    "caption": f"{name}, British Columbia — community profile with live MLS® listings, climate normals, and neighbourhood detail on EZtoFind.ca",
                    "title": f"{name}, BC — Real Estate & Community Profile",
                    "geo": f"{name}, British Columbia, Canada",
                }]
                tags.append(_url_tag(
                    f"{BASE_URL}/community/{slug}", today, "weekly", "0.7",
                    images=community_img,
                ))
    return _wrap_urlset(tags, with_image_ns=True), len(tags), slug_by_name

async def _build_neighbourhoods(db, slug_by_name: dict) -> tuple[str, int]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tags = []
    try:
        pipeline = [
            {"$match": {"status":"Active","region":{"$nin":["", None]}}},
            {"$group": {"_id": {"city":"$city","region":"$region"}}},
        ]
        async for row in db.listings.aggregate(pipeline):
            city = (row["_id"].get("city") or "").strip()
            n_name = (row["_id"].get("region") or "").strip()
            hit = slug_by_name.get(city.lower())
            if not hit or not n_name:
                continue
            c_slug, region = hit
            if n_name.strip().lower() == region.strip().lower():
                continue
            n_slug = re.sub(r"[^a-z0-9]+", "-", n_name.lower()).strip("-")
            if not n_slug:
                continue
            neighbourhood_img = [{
                "loc": f"{BASE_URL}/images/doogie-magnifying-glass.png",
                "caption": f"{n_name}, {city}, BC — neighbourhood real estate profile with live MLS® listings on EZtoFind.ca",
                "title": f"{n_name}, {city} — BC Neighbourhood",
                "geo": f"{n_name}, {city}, British Columbia, Canada",
            }]
            tags.append(_url_tag(
                f"{BASE_URL}/community/{c_slug}/n/{n_slug}", today, "weekly", "0.6",
                images=neighbourhood_img,
            ))
    except Exception:
        pass
    return _wrap_urlset(tags, with_image_ns=True), len(tags)

async def _build_market_reports(db) -> tuple[str, int]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tags = [_url_tag(f"{BASE_URL}/market-report", today, "weekly", "0.85")]
    try:
        async for mr in db.market_reports.find({}, {"ym": 1, "generated_at": 1, "_id": 0}).sort("ym", -1).limit(120):
            ym = mr.get("ym")
            if not ym: continue
            gen = mr.get("generated_at") or today
            lastmod = gen[:10] if isinstance(gen, str) else today
            tags.append(_url_tag(f"{BASE_URL}/market-report/{ym}", lastmod, "monthly", "0.80"))
    except Exception:
        pass
    return _wrap_urlset(tags), len(tags)


# ── Per-listing sub-sitemap (item #20 · elite-landing-page audit) ─────────
# Google + Bing re-crawl smaller, listing-focused sub-sitemaps 5-10× faster
# than the monolithic index. `changefreq=hourly` is honest — the CREA DDF®
# feed refreshes every 4 hours, so any listing URL's <lastmod> is at worst
# 4 h stale. NO photos are included (CREA DDF® terms forbid bulk
# redistribution) — only the canonical listing detail URL and its modtime.
async def _build_listings(db) -> tuple[str, int]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tags = []
    try:
        # Only Active listings — Sold/Expired records get de-indexed by
        # simply not appearing on the next crawl. Cap at 50 000 (Google's
        # per-sitemap hard limit is 50 000 URLs / 50 MB).
        cursor = db.listings.find(
            {"status": "Active"},
            {"listing_key": 1, "modification_ts": 1, "_id": 0},
        ).sort("modification_ts", -1).limit(50_000)
        async for row in cursor:
            key = row.get("listing_key")
            if not key:
                continue
            mod = row.get("modification_ts")
            if isinstance(mod, str) and len(mod) >= 10:
                lastmod = mod[:10]
            elif isinstance(mod, datetime):
                lastmod = mod.strftime("%Y-%m-%d")
            else:
                lastmod = today
            tags.append(_url_tag(
                f"{BASE_URL}/listing/{key}", lastmod, "hourly", "0.80",
            ))
    except Exception:
        pass
    return _wrap_urlset(tags), len(tags)


# ── Main entry point ──────────────────────────────────────────────────────
async def generate_sitemap(db, output_path: Optional[str] = None) -> dict:
    """Regenerate the sitemap INDEX + all sub-sitemaps.

    `output_path` is kept for backwards compatibility with the old signature
    but is now interpreted as the ROOT sitemap.xml (index) path. Sub-sitemaps
    are always written to the same directory alongside it.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    root_path = Path(output_path) if output_path else (PUBLIC_DIR / "sitemap.xml")
    out_dir = root_path.parent

    # --- Build each sub-sitemap ---
    static_xml = _build_static()
    _write(out_dir / "sitemap-static.xml", static_xml)
    static_count = len(STATIC_URLS)

    glossary_xml, glossary_count = await _build_glossary(db)
    _write(out_dir / "sitemap-glossary.xml", glossary_xml)

    communities_xml, community_count, slug_by_name = _build_communities()
    _write(out_dir / "sitemap-communities.xml", communities_xml)

    neighbourhoods_xml, neighbourhood_count = await _build_neighbourhoods(db, slug_by_name)
    _write(out_dir / "sitemap-neighbourhoods.xml", neighbourhoods_xml)

    market_xml, market_count = await _build_market_reports(db)
    # /market-report public routes removed 2026-08-08 per Doug's request. We
    # intentionally SKIP writing the sub-sitemap so search engines de-index
    # the URLs over the next few crawls.  Backend API endpoints remain live
    # for internal Doogie/admin use; the sub-sitemap file is deleted on
    # regenerate so no stale copy is served.
    _mr_file = out_dir / "sitemap-market-reports.xml"
    try:
        if _mr_file.exists(): _mr_file.unlink()
    except Exception:
        pass
    market_count = 0

    # Item #20 · dedicated listings sub-sitemap, refreshed nightly.
    listings_xml, listings_count = await _build_listings(db)
    _write(out_dir / "sitemap-listings.xml", listings_xml)

    # --- Sitemap INDEX ---
    subs = [
        ("sitemap-static.xml",         static_count),
        ("sitemap-glossary.xml",       glossary_count),
        ("sitemap-communities.xml",    community_count),
        ("sitemap-neighbourhoods.xml", neighbourhood_count),
        ("sitemap-listings.xml",       listings_count),
        ("sitemap-market-reports.xml", market_count),
    ]
    index_parts = [
        '<?xml version="1.0" encoding="UTF-8"?>\n',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',
    ]
    for name, count in subs:
        # Skip completely empty sub-sitemaps so we never confuse crawlers.
        if count <= 0:
            continue
        index_parts.append("  <sitemap>\n")
        index_parts.append(f"    <loc>{BASE_URL}/{name}</loc>\n")
        index_parts.append(f"    <lastmod>{today}</lastmod>\n")
        index_parts.append("  </sitemap>\n")
    index_parts.append("</sitemapindex>\n")
    _write(root_path, "".join(index_parts))

    total = static_count + glossary_count + community_count + neighbourhood_count + listings_count + market_count

    return {
        "static": static_count,
        "glossary": glossary_count,
        "communities": community_count,
        "neighbourhoods": neighbourhood_count,
        "listings": listings_count,
        "market_reports": market_count,
        "total": total,
        "path": str(root_path),
        "sub_sitemaps": [f"{BASE_URL}/{name}" for name, count in subs if count > 0],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "image_extension": "enabled",
        "sitemap_index": "enabled",
    }
