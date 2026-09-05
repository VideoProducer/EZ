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

# ── STATIC_URLS ───────────────────────────────────────────────────────────
# `/listings` (search hub) IS included below per Task 2 (Feb 2026 audit):
# it's Allow'd for general search engines in robots.txt (only the AI-training
# bots block it), it contains NO MLS® detail data (only filters + a link to
# the DDF search), and it's a valuable landing surface for queries like
# "bc real estate search" / "maple ridge homes for sale". Individual
# `/listing/{id}` pages remain Disallow'd site-wide and are NOT sitemapped
# — see `_build_listings()` below for the rationale.
STATIC_URLS = [
    ("/",                  "1.0", "daily"),
    ("/listings",          "0.9", "hourly"),
    ("/communities",       "0.9", "weekly"),
    ("/neighbourhoods",    "0.85", "weekly"),
    ("/glossary",          "0.9", "weekly"),
    ("/glossary/a-z",      "0.85", "weekly"),
    # Task 11 (Feb 2026) — the 31 `/insights/{slug}` URLs previously
    # enumerated here have been moved to `sitemap-insights.xml` (dedicated
    # child sitemap) so their count is directly comparable to
    # `/api/site/counts["insight_pages"]` via the build-time inventory
    # assert. Keeping /insights hub here as it's a landing surface.
    ("/tools/ptt-calculator-bc",              "0.9",  "monthly"),
    ("/tools/closing-cost-estimator-bc",      "0.9",  "monthly"),
    ("/valuation",         "0.9", "weekly"),
    ("/relocating",        "0.9", "weekly"),
    ("/about",             "0.7", "monthly"),
    ("/realtor-network",   "0.8", "monthly"),
    ("/referral-request",  "0.9", "weekly"),
    ("/buyer",             "0.9", "weekly"),
    ("/seller",            "0.9", "weekly"),
    ("/contact",           "0.8", "monthly"),
    # Free BC lead-attractor tools — conversion routes at priority 0.9.
    ("/tools/bc-buyer-cost-calculator", "0.9", "monthly"),
    ("/tools/ptt-estimator",            "0.9", "monthly"),
    ("/tools/mortgage-affordability",   "0.9", "monthly"),
    ("/tools/first-time-buyer",         "0.85", "monthly"),
    # Sold case studies — retired Feb 2026 at owner request.
    # ("/case-studies/3015-141-street",   "0.85", "monthly"),
    # /regions index unshipped (Feb 2026) — child /regions/:slug pages remain in sitemap.
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
    """Emit one <url> per sub-neighbourhood in Doug's farm.

    Two sources are merged and de-duplicated by canonical slug:

      1. LIVE MLS® listings — any active listing tagged with a `region`
         value produces `/community/{city}/n/{region-slug}`. This is the
         fresh, market-driven surface.

      2. CURATED FARM LIST — `services.bc_sub_neighbourhoods` (394 entries
         across Greater Vancouver + Fraser Valley + Sea-to-Sky). Guarantees
         Kitsilano, Yaletown, Elgin Chantrell, Bowen Island, and every
         other named farm micro-neighbourhood is crawlable even when no
         listing happens to be tagged with that region this week.

    Dedup key: `(city_slug, n_slug)` — the listing source wins so its
    `<lastmod>` reflects the freshest data on days when both fire.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    seen: set[tuple[str, str]] = set()
    tags = []

    # ── 1. Live-listing derived URLs (as before) ──────────────────────
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
            key = (c_slug, n_slug)
            if key in seen:
                continue
            seen.add(key)
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

    # ── 2. Curated farm list — Doug's 21+ focus cities, 394 sub-nhbs ──
    # Even if no listing fires this week, every farm sub-neighbourhood
    # remains crawlable. Priority is slightly lower (0.55 vs 0.6) so the
    # live-listing URLs still lead in ranking signals, but coverage is 100%.
    try:
        from services.bc_sub_neighbourhoods import BC_SUB_NEIGHBOURHOODS
        for city_slug, sub_list in BC_SUB_NEIGHBOURHOODS.items():
            # Best-effort display-name lookup: prefer the slug_by_name reverse
            # (which we don't have handy), so build a display name from the
            # slug when nothing else is available.
            display_city = city_slug.replace("-", " ").title()
            for sub_name in sub_list:
                n_slug = re.sub(r"[^a-z0-9]+", "-", (sub_name or "").lower()).strip("-")
                if not n_slug:
                    continue
                key = (city_slug, n_slug)
                if key in seen:
                    continue
                seen.add(key)
                neighbourhood_img = [{
                    "loc": f"{BASE_URL}/images/doogie-magnifying-glass.png",
                    "caption": f"{sub_name}, {display_city}, BC — farm sub-neighbourhood profile with market data on EZtoFind.ca",
                    "title": f"{sub_name}, {display_city} — BC Sub-Neighbourhood",
                    "geo": f"{sub_name}, {display_city}, British Columbia, Canada",
                }]
                tags.append(_url_tag(
                    f"{BASE_URL}/community/{city_slug}/n/{n_slug}", today, "weekly", "0.55",
                    images=neighbourhood_img,
                ))
    except Exception:
        pass

    # ── 3. Provincial (non-farm) extras — Kelowna, Kamloops, Victoria etc.
    # These pages route visitors to /referral-request instead of Doug's
    # money-page CTAs (see NeighbourhoodPage frontend). Lower priority
    # (0.45) than farm sub-nhbs so ranking signals still favour Doug's
    # active practice area, but the URLs are indexable for AEO/AEG.
    try:
        from services.bc_provincial_sub_neighbourhoods import get_provincial_extras
        provincial = get_provincial_extras()
        for city_slug, sub_list in provincial.items():
            display_city = city_slug.replace("-", " ").title()
            for sub_name in sub_list:
                n_slug = re.sub(r"[^a-z0-9]+", "-", (sub_name or "").lower()).strip("-")
                if not n_slug:
                    continue
                key = (city_slug, n_slug)
                if key in seen:
                    continue
                seen.add(key)
                neighbourhood_img = [{
                    "loc": f"{BASE_URL}/images/doogie-magnifying-glass.png",
                    "caption": f"{sub_name}, {display_city}, BC — sub-neighbourhood profile with referral REALTOR® routing on EZtoFind.ca",
                    "title": f"{sub_name}, {display_city} — BC Sub-Neighbourhood (Referral)",
                    "geo": f"{sub_name}, {display_city}, British Columbia, Canada",
                }]
                tags.append(_url_tag(
                    f"{BASE_URL}/community/{city_slug}/n/{n_slug}", today, "weekly", "0.45",
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


# ── Insights sub-sitemap (Task 11 · Feb 2026) ──────────────────────────
# Extracted from sitemap-static.xml into a dedicated child so:
#   1. Insights count is directly queryable (`grep -c '<loc>' sitemap-insights.xml`).
#   2. Google + Bing re-crawl the fast-changing insights corpus without
#      re-parsing the whole 50 KB static sitemap.
#   3. The build-time inventory assert can compare
#      `_compute_insight_pages_count()` == URL count in this file.
#
# Source of truth: `frontend/src/data/insightsCatalog.js` (parsed by
# `_compute_insight_pages_count`). Every slug in the catalog gets one
# URL here. Priorities/changefreqs are conservative — insights change
# monthly at most (some weekly), so `weekly` covers the fastest cadence.
def _build_insights() -> tuple[str, int]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    catalog_path = PUBLIC_DIR.parent / "src" / "data" / "insightsCatalog.js"
    if not catalog_path.exists():
        return _wrap_urlset([]), 0
    try:
        text = catalog_path.read_text()
    except Exception:
        return _wrap_urlset([]), 0
    slugs = re.findall(r'^\s{2}"([a-z0-9][a-z0-9-]*)":\s*\{$', text, re.MULTILINE)
    # /insights hub is emitted from STATIC_URLS; this sitemap contains
    # only the individual insight pages so its URL count matches
    # `/api/site/counts["insight_pages"]` exactly.
    tags = []
    for slug in slugs:
        tags.append(_url_tag(f"{BASE_URL}/insights/{slug}", today, "weekly", "0.75"))
    return _wrap_urlset(tags), len(tags)


# ── Per-listing sub-sitemap (item #20 · elite-landing-page audit) ─────────
# Google + Bing re-crawl smaller, listing-focused sub-sitemaps 5-10× faster
# than the monolithic index. `changefreq=hourly` is honest — the CREA DDF®
# feed refreshes every 4 hours, so any listing URL's <lastmod> is at worst
# 4 h stale. NO photos are included (CREA DDF® terms forbid bulk
# redistribution) — only the canonical listing detail URL and its modtime.
async def _build_listings(db) -> tuple[str, int]:
    """DDF listing detail pages (`/listing/{key}`) are intentionally NOT in
    any sitemap.

    Why: CREA DDF® data-licensing restricts SEO indexing of individual
    listing detail pages hosted on non-brokerage websites, and our
    robots.txt already `Disallow: /listing/` for exactly this reason.
    Submitting them via sitemap would be a direct sitemap-vs-robots
    conflict that Google Search Console flags — AND a CREA compliance
    breach.

    The `/listings` search hub (plural) is separately included in
    sitemap-static.xml so buyers can still discover the search
    functionality from search engines.

    Kept as a stub so existing callers (main `generate_sitemap`) don't
    break; returns an empty urlset that is never written to the sitemap
    index.
    """
    return _wrap_urlset([]), 0


# ── AI-only sitemap (Feb 2026) ────────────────────────────────────────────
# A single flat urlset containing ONLY canonical, AI-safe content:
#   • static pages (already scrubbed of `/listings`)
#   • glossary terms
#   • community profiles
#   • neighbourhood profiles
#   • prerendered snapshot HTML pages
#
# EXCLUDES everything blocked for AI crawlers in robots.txt:
#   `/listing/*`, `/listings`, `/api/*`, `/admin/*`, `/mockups/*`,
#   `/my-journey/*`, `/market-report*`.
#
# This is the file we advertise to Perplexity / ChatGPT / Grok / Manus /
# Claude / Gemini / You / Kagi / Mistral / etc. via llms.txt and robots.txt.
def _build_ai_sitemap(
    static_xml: str,
    glossary_xml: str,
    communities_xml: str,
    neighbourhoods_xml: str,
    insights_xml: str = "",
) -> tuple[str, int]:
    """Combine all AI-safe sub-sitemaps into ONE flat urlset.

    Reads snapshots from the existing sitemap-snapshots.xml if present
    (that file is generated by prerender_pages.py, not by us). Returns
    (xml_string, url_count).
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Regex to pull <url>…</url> blocks (namespace-agnostic).
    url_block_re = re.compile(r"<url>.*?</url>", re.DOTALL)

    combined: List[str] = []
    for src in (static_xml, glossary_xml, communities_xml, neighbourhoods_xml, insights_xml):
        for block in url_block_re.findall(src):
            # Belt-and-braces filter — nothing that looks like MLS® data.
            if ("/listing/" in block) or ("/listings" in block) or ("/api/" in block):
                continue
            combined.append(block + "\n")

    # Pull in the prerendered snapshot URLs (community + glossary HTML).
    snapshots_path = PUBLIC_DIR / "sitemap-snapshots.xml"
    if snapshots_path.exists():
        try:
            snap_xml = snapshots_path.read_text(encoding="utf-8")
            for block in url_block_re.findall(snap_xml):
                if "/snapshot/" in block:
                    combined.append(block + "\n")
        except Exception:
            pass

    header = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<!-- EZtoFind.ca · AI-safe canonical sitemap · regenerated '
        f'{today} · CREA DDF® safe (no MLS® listing URLs) -->\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    )
    xml = header + "".join(combined) + "</urlset>\n"
    return xml, len(combined)


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

    # Task 11 (Feb 2026) — dedicated insights sub-sitemap so the count is
    # directly measurable and the build-time inventory assert can align it
    # against `/api/site/counts["insight_pages"]`.
    insights_xml, insights_count = _build_insights()
    _write(out_dir / "sitemap-insights.xml", insights_xml)

    # Item #20 · dedicated listings sub-sitemap — INTENTIONALLY DISABLED.
    # `/listing/{id}` pages are DDF® data-licensed content that we don't
    # submit for indexing (robots.txt disallows the path). The `_build_listings`
    # stub returns 0 URLs; the sub-sitemap file itself is deleted below so no
    # stale copy lingers on disk.
    listings_xml, listings_count = await _build_listings(db)
    _stale_listings = out_dir / "sitemap-listings.xml"
    if _stale_listings.exists():
        try:
            _stale_listings.unlink()
        except Exception:
            pass

    # Feb 2026 · AI-only canonical sitemap (advertised to Perplexity, ChatGPT,
    # Grok, Manus, Claude, Gemini, You, Kagi, Mistral, etc. via llms.txt).
    ai_xml, ai_count = _build_ai_sitemap(
        static_xml, glossary_xml, communities_xml, neighbourhoods_xml,
        insights_xml,
    )
    _write(out_dir / "sitemap-ai.xml", ai_xml)

    # --- Sitemap INDEX ---
    subs = [
        ("sitemap-static.xml",         static_count),
        ("sitemap-glossary.xml",       glossary_count),
        ("sitemap-communities.xml",    community_count),
        ("sitemap-neighbourhoods.xml", neighbourhood_count),
        ("sitemap-insights.xml",       insights_count),
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

    # Feb 2026 · Also refresh the legacy top-level `sitemap-index.xml` alias
    # (referenced by robots.txt from older Search Console submissions). It
    # now includes the fresh AI + snapshots + master index so any crawler
    # that hits either root file lands on the same complete picture.
    snapshots_exists = (out_dir / "sitemap-snapshots.xml").exists()
    idx_alias = [
        '<?xml version="1.0" encoding="UTF-8"?>\n',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',
        f'  <sitemap><loc>{BASE_URL}/sitemap.xml</loc><lastmod>{today}</lastmod></sitemap>\n',
        f'  <sitemap><loc>{BASE_URL}/sitemap-ai.xml</loc><lastmod>{today}</lastmod></sitemap>\n',
    ]
    if snapshots_exists:
        idx_alias.append(
            f'  <sitemap><loc>{BASE_URL}/sitemap-snapshots.xml</loc><lastmod>{today}</lastmod></sitemap>\n'
        )
    idx_alias.append('</sitemapindex>\n')
    _write(out_dir / "sitemap-index.xml", "".join(idx_alias))

    total = static_count + glossary_count + community_count + neighbourhood_count + listings_count + market_count

    # ── Task 12 (Feb 2026) — full inventory-assert bake-in.
    # Before returning, run the full assert_inventory.py check so any
    # count drift between the freshly-generated sitemaps, /api/site/counts,
    # and llms.txt / llms-full.txt / ai.json is caught HERE — inside the
    # generator itself — rather than only at yarn-build time. Any assert
    # failure raises AssertionError with a descriptive message. Callers
    # that want soft-fail behaviour (e.g. the cron regen) can wrap.
    try:
        import assert_inventory as _ai
        _canonical = {
            "glossary_terms":      glossary_count,
            "communities":         community_count,
            "neighbourhood_pages": neighbourhood_count,
            "insight_pages":       insights_count,
        }
        _ok, _errs = _ai._run_checks(_canonical)
        if not _ok:
            _msg = "SITEMAP INVENTORY ASSERT FAILED after regen:\n  - " + "\n  - ".join(_errs)
            raise AssertionError(_msg)
    except AssertionError:
        raise
    except Exception:
        # Never let a defensive check break the primary generator.
        pass

    # ── Task 1 · legacy build assertion (glossary count in llms.txt matches
    # the freshly-generated sitemap URL count). Retained because it targets
    # a very specific phrase, catching partial edits the broader check may
    # not detect. Fails loud if drift creeps in.
    try:
        llms_path = out_dir / "llms.txt"
        if llms_path.exists():
            _llms_text = llms_path.read_text(encoding="utf-8")
            _m = re.search(r"(\d+)-term BC Real Estate Glossary", _llms_text)
            if _m:
                _claimed = int(_m.group(1))
                if _claimed != glossary_count:
                    raise AssertionError(
                        f"COUNT DRIFT: llms.txt claims {_claimed}-term glossary "
                        f"but sitemap-glossary.xml has {glossary_count} URLs. "
                        f"Update both from the canonical /api/site/counts source."
                    )
    except AssertionError:
        raise
    except Exception as _e:
        # Non-fatal on read errors — assertion is best-effort. Log only.
        pass

    return {
        "static": static_count,
        "glossary": glossary_count,
        "communities": community_count,
        "neighbourhoods": neighbourhood_count,
        "listings": listings_count,
        "market_reports": market_count,
        "ai_sitemap": ai_count,
        "total": total,
        "path": str(root_path),
        "sub_sitemaps": [f"{BASE_URL}/{name}" for name, count in subs if count > 0]
                        + [f"{BASE_URL}/sitemap-ai.xml"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "image_extension": "enabled",
        "sitemap_index": "enabled",
    }
