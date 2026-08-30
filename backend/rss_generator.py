"""
RSS 2.0 feed generator for eztofind.ca.

Writes /app/frontend/public/feed.xml — a rolling 60-item feed containing:
    • Latest 40 glossary term updates (by dateModified)
    • Latest 15 community profile updates
    • Latest 5 case studies / sold snapshots

Why RSS in 2026?
    Feedly, Inoreader, NewsBlur, and (still, quietly) Google Discover crawl RSS
    feeds aggressively — often multiple times per hour, which is FASTER than
    Google's regular sitemap crawl for a new site. IndexNow-adjacent tools
    (Bing / DuckDuckGo / Yandex / Seznam) also honour RSS `pubDate` fields.

    Beyond indexing, RSS gives the site a legitimate publisher signal:
    every AEO / AI-answer engine (Perplexity, ChatGPT Search, Claude) checks
    for a feed as one of a handful of "is this a real publication?" hints.

Discovery:
    - `<link rel="alternate" type="application/rss+xml">` in <head>
    - `<link>` back-reference in the feed itself (self-referencing atom link)
    - Listed in llms.txt so AI ingestion picks it up too

CREA DDF® compliance:
    We intentionally do NOT publish MLS® listings via RSS — CREA terms forbid
    bulk redistribution. The feed only carries our own editorial content
    (glossary, community, case-study snapshots).
"""
from __future__ import annotations
import html
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from typing import Optional

BASE_URL = "https://eztofind.ca"
PUBLIC_DIR = Path("/app/frontend/public")
FEED_PATH = PUBLIC_DIR / "feed.xml"

# Total items to include in the feed. Feedly caps display at ~50 so 60 gives
# some headroom without ballooning the payload — the whole file stays under
# ~40 KB and is cheap to re-generate on every startup + hourly cron.
FEED_MAX_ITEMS = 60


def _rfc822(dt: Optional[datetime]) -> str:
    """Format a datetime as RFC-822 for RSS 2.0 pubDate. RSS is strict about
    this — Feedly / Inoreader silently drop items with malformed dates."""
    if not dt:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return format_datetime(dt)


def _escape(s: str) -> str:
    """XML-safe text escaping. RSS 2.0 accepts CDATA for `description` but
    the sanest cross-reader path is plain XML escaping — that's what every
    validator (W3C Feed Validator, Feedly's parser) expects."""
    if s is None:
        return ""
    return html.escape(str(s), quote=False)


def _parse_dt(v) -> Optional[datetime]:
    """Best-effort parse of the many date shapes we store in Mongo
    (ISO string, datetime object, or missing entirely). Returns None if
    the value can't be coerced so the caller can decide a fallback."""
    if not v:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if isinstance(v, str):
        try:
            # Accept both Z-suffixed and offset-suffixed ISO strings.
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


async def generate_rss(db) -> dict:
    """Build feed.xml from Mongo and write it to /app/frontend/public/feed.xml.

    Returns a small stats dict so the caller can log what was published:
        {"glossary": 40, "communities": 15, "case_studies": 5, "total": 60}

    Failure mode:
        If Mongo is unreachable we still write a minimally valid feed with
        just the channel metadata — better than a 404 for feed readers.
    """
    now = datetime.now(timezone.utc)
    items: list[dict] = []

    # ── Glossary (40) ───────────────────────────────────────────────
    # Sort by dateModified DESC so the freshest edits float to the top of
    # the feed. Fall back to createdAt / _id ordering when dateModified
    # isn't set — this keeps legacy entries in the tail rather than
    # dropping them entirely.
    try:
        cursor = db.glossary.find(
            {"slug": {"$exists": True}, "term": {"$exists": True}},
            {"slug": 1, "term": 1, "definition": 1, "category": 1,
             "last_curated_at": 1, "updated_at": 1, "published_at": 1,
             "created_at": 1},
        ).sort([("last_curated_at", -1), ("updated_at", -1), ("_id", -1)]).limit(40)
        async for doc in cursor:
            dt = (_parse_dt(doc.get("last_curated_at"))
                  or _parse_dt(doc.get("updated_at"))
                  or _parse_dt(doc.get("published_at"))
                  or _parse_dt(doc.get("created_at"))
                  or now)
            defn = (doc.get("definition") or "").strip()
            if len(defn) > 320:
                defn = defn[:317].rstrip() + "…"
            items.append({
                "title": f"{doc['term']} — BC Real Estate Glossary",
                "link": f"{BASE_URL}/glossary/{doc['slug']}",
                "guid": f"{BASE_URL}/glossary/{doc['slug']}",
                "pubDate": dt,
                "description": defn,
                "category": doc.get("category") or "Glossary",
            })
    except Exception:
        # Silent fallback — see docstring failure mode note.
        pass

    # ── Communities (15) ─────────────────────────────────────────────
    try:
        cursor = db.community_synopses.find(
            {"community": {"$exists": True}, "synopsis": {"$exists": True}},
            {"community": 1, "synopsis": 1, "region": 1,
             "last_reviewed_at": 1, "updated_at": 1, "reviewed_at": 1,
             "published_at": 1, "created_at": 1},
        ).sort([("last_reviewed_at", -1), ("updated_at", -1), ("_id", -1)]).limit(15)
        async for doc in cursor:
            slug = doc["community"].lower().replace(" ", "-").replace("/", "-")
            dt = (_parse_dt(doc.get("last_reviewed_at"))
                  or _parse_dt(doc.get("updated_at"))
                  or _parse_dt(doc.get("reviewed_at"))
                  or _parse_dt(doc.get("published_at"))
                  or _parse_dt(doc.get("created_at"))
                  or now)
            syn = (doc.get("synopsis") or "").strip()
            if len(syn) > 320:
                syn = syn[:317].rstrip() + "…"
            items.append({
                "title": f"{doc['community']}, BC — Community Profile",
                "link": f"{BASE_URL}/community/{slug}",
                "guid": f"{BASE_URL}/community/{slug}",
                "pubDate": dt,
                "description": syn,
                "category": doc.get("region") or "British Columbia",
            })
    except Exception:
        pass

    # ── Case studies / sold snapshots (5) ────────────────────────────
    # We store case-study copy in the `case_studies` collection when it
    # exists; otherwise skip silently. This keeps the feed valid even
    # before the collection is seeded.
    try:
        if "case_studies" in await db.list_collection_names():
            cursor = db.case_studies.find(
                {"slug": {"$exists": True}, "title": {"$exists": True}},
                {"slug": 1, "title": 1, "summary": 1,
                 "published_at": 1, "sold_at": 1, "updated_at": 1},
            ).sort([("sold_at", -1), ("published_at", -1), ("_id", -1)]).limit(5)
            async for doc in cursor:
                dt = (_parse_dt(doc.get("sold_at"))
                      or _parse_dt(doc.get("published_at"))
                      or _parse_dt(doc.get("updated_at"))
                      or now)
                summ = (doc.get("summary") or "").strip()
                if len(summ) > 320:
                    summ = summ[:317].rstrip() + "…"
                items.append({
                    "title": doc["title"],
                    "link": f"{BASE_URL}/case-studies/{doc['slug']}",
                    "guid": f"{BASE_URL}/case-studies/{doc['slug']}",
                    "pubDate": dt,
                    "description": summ,
                    "category": "Case Study",
                })
    except Exception:
        pass

    # Cap + sort by date DESC — the whole feed should read newest-first.
    items.sort(key=lambda x: x["pubDate"], reverse=True)
    items = items[:FEED_MAX_ITEMS]

    # ── Serialize to RSS 2.0 ─────────────────────────────────────────
    last_build = _rfc822(now)
    parts: list[str] = []
    parts.append('<?xml version="1.0" encoding="UTF-8"?>')
    parts.append(
        '<rss version="2.0" '
        'xmlns:atom="http://www.w3.org/2005/Atom" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/">'
    )
    parts.append("  <channel>")
    parts.append(f"    <title>EZtoFind.ca — BC Real Estate Insights</title>")
    parts.append(f"    <link>{BASE_URL}</link>")
    parts.append(
        "    <description>Curated updates from EZtoFind.ca: BC real-estate glossary, "
        "community profiles, and case studies from Doug LeMaire, REALTOR® "
        "(BCFSA #167790, Fraser Property Management Realty Services Ltd.).</description>"
    )
    parts.append("    <language>en-CA</language>")
    parts.append("    <copyright>Copyright EZtoFind.ca — All rights reserved</copyright>")
    parts.append("    <managingEditor>info@eztofind.ca (Doug LeMaire, REALTOR®)</managingEditor>")
    parts.append("    <webMaster>info@eztofind.ca (Doug LeMaire, REALTOR®)</webMaster>")
    parts.append(f"    <lastBuildDate>{last_build}</lastBuildDate>")
    parts.append(f"    <pubDate>{last_build}</pubDate>")
    parts.append("    <ttl>60</ttl>")
    parts.append(f'    <atom:link href="{BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />')
    parts.append("    <image>")
    parts.append(f"      <url>{BASE_URL}/images/doogie-laptop.png</url>")
    parts.append("      <title>EZtoFind.ca — BC Real Estate Insights</title>")
    parts.append(f"      <link>{BASE_URL}</link>")
    parts.append("    </image>")

    for item in items:
        parts.append("    <item>")
        parts.append(f"      <title>{_escape(item['title'])}</title>")
        parts.append(f"      <link>{_escape(item['link'])}</link>")
        parts.append(f"      <guid isPermaLink=\"true\">{_escape(item['guid'])}</guid>")
        parts.append(f"      <pubDate>{_rfc822(item['pubDate'])}</pubDate>")
        parts.append(f"      <dc:creator>Doug LeMaire, REALTOR®</dc:creator>")
        parts.append(f"      <category>{_escape(item.get('category',''))}</category>")
        parts.append(f"      <description>{_escape(item['description'])}</description>")
        parts.append("    </item>")

    parts.append("  </channel>")
    parts.append("</rss>")

    FEED_PATH.write_text("\n".join(parts), encoding="utf-8")
    return {
        "glossary": sum(1 for i in items if "/glossary/" in i["link"]),
        "communities": sum(1 for i in items if "/community/" in i["link"]),
        "case_studies": sum(1 for i in items if "/case-studies/" in i["link"]),
        "total": len(items),
        "path": str(FEED_PATH),
    }
