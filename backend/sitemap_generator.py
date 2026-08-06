"""
Generate a real sitemap.xml for eztofind.ca from live MongoDB data.

Writes to: /app/frontend/public/sitemap.xml

Ping-friendly: search engines expect the sitemap to be reachable at
https://eztofind.ca/sitemap.xml — which robots.txt already points to.

Run on backend startup and after any admin update (via /api/admin/regenerate-sitemap).

--- Image Sitemap Extension (added Feb 2026) ---
The sitemap now includes Google's `xmlns:image` namespace and emits
<image:image> entries on:
  • The home page — Doug's Doogie mascot artwork (brand recognition)
  • Each of the 5 region pages — hero photography
  • Each community page (240) — tied to a `<image:geo_location>` string
    (city + BC + Canada) so AI visual-search engines connect images of a
    given town to eztofind.ca

We DO NOT include MLS® listing photos here — CREA DDF® terms forbid bulk
photo redistribution. Only Doug-owned artwork ships in the sitemap.
"""
from __future__ import annotations
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List, Dict, Optional

BASE_URL = "https://eztofind.ca"

# Global brand imagery — hosted directly on eztofind.ca so we don't rely on
# any customer-assets CDN that might rotate. If Doug swaps the mascot art,
# update the URLs here.
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
    # Region hero photography (baked in the /public/regions folder)
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
    # Regions index + corridor pages (Doug's focus areas)
    ("/regions",                    "0.85", "monthly"),
    ("/regions/greater-vancouver",  "0.85", "monthly"),
    ("/regions/fraser-valley",      "0.85", "monthly"),
    ("/regions/sea-to-sky",         "0.85", "monthly"),
    ("/regions/vancouver-island",   "0.85", "monthly"),
    ("/regions/okanagan",           "0.85", "monthly"),
    # Specialty pages
    ("/specialties",               "0.8", "monthly"),
    ("/specialties/detached",      "0.75", "monthly"),
    ("/specialties/luxury",        "0.75", "monthly"),
    ("/specialties/equestrian",    "0.75", "monthly"),
    ("/specialties/estate-sales",  "0.75", "monthly"),
    ("/specialties/condos",        "0.75", "monthly"),
    ("/specialties/townhomes",     "0.75", "monthly"),
    # Legal / compliance
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


def _xml_escape(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _image_block(images: List[Dict]) -> str:
    """Render one or more <image:image> children for a <url> entry."""
    out = []
    for img in images:
        out.append("    <image:image>\n")
        out.append(f"      <image:loc>{_xml_escape(img['loc'])}</image:loc>\n")
        if img.get("caption"):
            out.append(f"      <image:caption>{_xml_escape(img['caption'])}</image:caption>\n")
        if img.get("title"):
            out.append(f"      <image:title>{_xml_escape(img['title'])}</image:title>\n")
        if img.get("geo"):
            out.append(f"      <image:geo_location>{_xml_escape(img['geo'])}</image:geo_location>\n")
        if img.get("license"):
            out.append(f"      <image:license>{_xml_escape(img['license'])}</image:license>\n")
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


async def generate_sitemap(db, output_path: str = "/app/frontend/public/sitemap.xml") -> dict:
    """Regenerate sitemap.xml from live DB. Returns stats dict."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    parts: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>\n',
        # Google image sitemap extension — enables AI visual-search citation
        # (Gemini, ChatGPT Vision, Perplexity Images) to find and attribute
        # our imagery back to eztofind.ca.
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n',
    ]

    # Static pages — inject brand / regional imagery where we have it
    static_count = 0
    for path, priority, changefreq in STATIC_URLS:
        key = path.lstrip("/") or "home"
        images = BRAND_IMAGES.get(key)
        parts.append(_url_tag(f"{BASE_URL}{path}", today, changefreq, priority, images))
        static_count += 1

    # Glossary terms (no per-term imagery yet — brand-only pages)
    gterms = await db.glossary.find({}, {"slug": 1, "last_curated_at": 1, "_id": 0}).to_list(2000)
    for t in gterms:
        slug = t.get("slug")
        if not slug: continue
        lastmod = (t.get("last_curated_at") or today)[:10]
        parts.append(_url_tag(f"{BASE_URL}/glossary/{slug}", lastmod, "monthly", "0.8"))

    # Community pages — tag each with the Doogie mascot image + an
    # image:geo_location string so AI visual-search engines link photos of
    # the community back to eztofind.ca as an authoritative source.
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
                community_img = [{
                    "loc": f"{BASE_URL}/images/doogie-pointing-right.png",
                    "caption": f"{name}, British Columbia — community profile with live MLS® listings, climate normals, and neighbourhood detail on EZtoFind.ca",
                    "title": f"{name}, BC — Real Estate & Community Profile",
                    "geo": f"{name}, British Columbia, Canada",
                }]
                parts.append(_url_tag(
                    f"{BASE_URL}/community/{slug}", today, "weekly", "0.7",
                    images=community_img,
                ))
                community_count += 1

    # Micro-neighbourhood pages
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
            parts.append(_url_tag(
                f"{BASE_URL}/community/{c_slug}/n/{n_slug}", today, "weekly", "0.6",
                images=neighbourhood_img,
            ))
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
        "image_extension": "enabled",
    }
