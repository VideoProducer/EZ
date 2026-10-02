"""
Build-time SEO prerender generator for EZtoFind.ca.

Generates static HTML snapshots for every glossary term + community page
so non-JS crawlers (ChatGPT/GPTBot, Anthropic/ClaudeBot, Perplexity,
DuckDuckGo, and older Bing) can index the actual content.

WHY THIS EXISTS
---------------
EZtoFind is a client-side React SPA. When a crawler that doesn't run
JavaScript requests /glossary/property-transfer-tax-ptt, the standard
response is an empty <div id="root"></div> — no content, no meta, no
schema. This script generates a matching static HTML file that IS
rendered content, and places it at the exact path so the static server
serves it before falling back to the SPA.

React clients still get the full interactive app because:
  1. Real users' requests go to the SPA's index.html (JS bundle)
  2. When React mounts into <div id="root"> it replaces the static
     content — but the search-engine snapshot has already been read

USAGE
-----
Run after every deploy that changes glossary content or community list:
  python3 /app/backend/prerender_pages.py

Output:
  /app/frontend/public/snapshot/glossary/{slug}.html   (~440 files, live count from db.glossary)
  /app/frontend/public/snapshot/community/{slug}.html  (~240 files, live count from communities_seed.json)

These snapshots live under /snapshot/ so they DON'T conflict with the
React Router SPA. Real users navigating /glossary/{slug} still get the
full interactive app. To serve snapshots to bots, add ONE of these at
the CDN/ingress layer during production deploy:

  A) Cloudflare Worker:
       if (User-Agent matches known bot regex)
         rewrite /glossary/{slug} → /snapshot/glossary/{slug}.html
       else fall through to SPA

  B) Prerender.io middleware (drop-in, works with any host)

  C) Nginx location + map $http_user_agent:
       map $http_user_agent $is_bot { ... }
       location ~ ^/glossary/(.+)$ {
         if ($is_bot) { rewrite ^ /snapshot/glossary/$1.html break; }
         try_files $uri /index.html;
       }
"""
from __future__ import annotations
import asyncio, os, re, html, json, subprocess
from pathlib import Path
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME   = os.environ["DB_NAME"]

SITE = "https://eztofind.ca"
PUBLIC_DIR = Path("/app/frontend/public")

def esc(s: str) -> str:
    return html.escape(s or "", quote=True)

def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


HEADER_HTML = """<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#0F2A5B"/>
<title>{title}</title>
<meta name="description" content="{description}"/>
<link rel="canonical" href="{canonical}"/>
<meta property="og:type" content="{og_type}"/>
<meta property="og:title" content="{title}"/>
<meta property="og:description" content="{description}"/>
<meta property="og:url" content="{canonical}"/>
<meta property="og:image" content="{og_image}"/>
<meta property="og:site_name" content="EZtoFind.ca"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{title}"/>
<meta name="twitter:description" content="{description}"/>
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"/>
<link rel="icon" href="/favicon.ico"/>
{schema_blocks}
<style>
body{{font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;line-height:1.6;color:#1F2937;max-width:56rem;margin:0 auto;padding:2rem 1.5rem;background:#FFFFFF}}
h1{{font-family:'Playfair Display',Georgia,serif;color:#0F2A5B;font-size:2.25rem;line-height:1.2;margin:0.5rem 0 0.75rem}}
h2{{color:#0F2A5B;font-size:1.5rem;margin:2rem 0 0.75rem}}
h3{{color:#0F2A5B;font-size:1.15rem;margin:1.5rem 0 0.5rem}}
.eyebrow{{color:#0EA5E9;font-weight:700;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em}}
.sources{{background:#F8FAFC;border:1px solid rgba(15,42,91,0.12);border-left:4px solid #0EA5E9;border-radius:12px;padding:1.25rem 1.5rem;margin-top:2rem}}
.sources li{{margin-bottom:0.6rem}}
.sources a{{color:#0EA5E9;font-weight:600;text-decoration:none}}
.sources .publisher{{color:#6B7280;font-size:0.85rem;display:block}}
.faq{{margin-top:1rem}}
.faq details{{background:#F5F0E1;border-radius:10px;padding:1rem 1.25rem;margin-bottom:0.75rem}}
.faq summary{{cursor:pointer;font-weight:600;color:#0F2A5B}}
.faq p{{margin:0.75rem 0 0}}
.faq .verify{{margin-top:0.75rem;padding-top:0.65rem;border-top:1px dashed rgba(15,42,91,0.2);font-size:0.82rem;color:#6B7280}}
.faq .verify a{{color:#0EA5E9;font-weight:600;text-decoration:none}}
.disclaimer{{font-size:0.85rem;color:#6B7280;font-style:italic;margin-top:2rem;padding-top:1rem;border-top:1px solid #E5E7EB}}
.attribution{{background:#F5F0E1;border-radius:12px;padding:1rem 1.25rem;margin-top:1.5rem;display:flex;gap:0.85rem;align-items:center}}
.attribution img{{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #FDB813}}
.brand{{font-family:'Playfair Display',Georgia,serif;color:#0F2A5B;font-size:1.5rem;font-weight:700}}
.nav{{margin-bottom:1.5rem}}
.nav a{{color:#0EA5E9;text-decoration:none;font-weight:600;font-size:0.9rem}}
.compliance{{background:#F5F0E1;padding:0.6rem 1rem;font-size:0.78rem;text-align:center;font-weight:700;color:#1F2937}}
</style>
</head>
<body>
<div class="compliance">EZtoFind.ca provides general educational information about BC real estate — not legal, tax, financial, or real estate advice. For your own situation, speak with the appropriate licensed professional: a BC lawyer or notary, an accountant or tax professional, a licensed mortgage broker, or a licensed REALTOR®.</div>
<nav class="nav"><a href="/">← Back to EZtoFind.ca</a></nav>
<div class="brand">EZtoFind.ca</div>
"""

FOOTER_HTML = """
<div class="disclaimer">All content on EZtoFind.ca, including Doogie's responses, the Glossary, Terms, FAQ's, community pages, weather, mortgage calculator, property transfer tax calculator is general information provided for educational purposes and is not a substitute for professional guidance tailored to your situation.</div>
<div class="attribution">
  <img src="https://eztofind.ca/doug-headshot-2026.jpg" alt="Doug LeMaire, REALTOR®"/>
  <div>
    <div style="font-size:0.78rem;color:#6B7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Published by</div>
    <div style="font-weight:700;color:#1F2937">Doug LeMaire, REALTOR®</div>
    <div style="font-size:0.88rem;color:#0EA5E9;font-weight:600"><a href="/" style="color:inherit;text-decoration:none">EZtoFind.ca</a> <span style="color:#6B7280;font-weight:400">· Fraser Property Management Realty Services Ltd.</span></div>
  </div>
</div>
</body>
</html>
"""


async def render_glossary(db):
    rows = await db.glossary.find({}, {"_id":0}).to_list(2000)
    print(f"Rendering {len(rows)} glossary term pages…")

    from glossary_sources import get_sources_for_term

    # Build a category → [terms] index once so each page can emit an
    # internal "Related terms in this category" block without a per-page
    # DB round-trip. This is the primary SEO internal-linking mechanism
    # for the glossary (feeds LLM topical clusters + Googlebot depth-of-
    # crawl signals).  Terms are sorted alphabetically for stable output.
    by_category: dict = {}
    for t in rows:
        c = t.get("category") or "General"
        by_category.setdefault(c, []).append({"slug": t.get("slug"), "term": t.get("term", "")})
    for c in by_category:
        by_category[c].sort(key=lambda x: (x["term"] or "").lower())

    for t in rows:
        slug = t.get("slug")
        if not slug: continue
        term = t.get("term","")
        cat = t.get("category","")
        defn = t.get("definition","")

        # Sources: prefer override, else algorithmic default
        srcs = t.get("sources_override") or get_sources_for_term(term, cat)

        # FAQs: only include approved
        faqs = t.get("faqs", []) if t.get("faqs_approved") else []

        canonical = f"{SITE}/glossary/{slug}"
        # Long-tail SEO title: question-format phrasing that matches how
        # visitors actually search ("what is X in BC real estate?") plus
        # the category and site brand.  Truncated to <60 chars where
        # possible so Google doesn't ellipsise the SERP snippet.
        if len(term) <= 30:
            title = f"What is {term} in BC Real Estate? — Definition & FAQs | EZtoFind.ca"
        else:
            title = f"{term} — BC Real Estate | EZtoFind.ca"
        # Meta description: leads with the definition (answer-first),
        # includes primary keyword + BC locale + Doug's authority signal.
        # Kept under 160 chars for SERP compliance.
        _defn_slice = (defn or f"Learn about {term} in BC real estate.").strip().replace("\n", " ")
        # Trim the definition at a word boundary (never mid-word) so the
        # appended authority line reads cleanly and total stays ≤160 chars.
        _defn_trim = _defn_slice if len(_defn_slice) <= 100 else _defn_slice[:99].rsplit(" ", 1)[0].rstrip(" ,;:-—") + "…"
        desc = (
            f"{_defn_trim}"
            + (" " if _defn_trim and not _defn_trim.endswith(".") else "")
            + "BCFSA-licensed REALTOR® guidance for BC buyers & sellers."
        )[:160]

        # dateModified — real content change date if we have it, else today.
        # Feeds into Article schema AND the visible "Last reviewed" line at
        # the top of the page. Task 3 (Feb 2026 audit): every snapshot
        # needs a factual, machine + human-readable freshness signal.
        _row_ts = t.get("last_curated_at") or t.get("updated_at") or t.get("approved_at")
        if isinstance(_row_ts, str) and len(_row_ts) >= 10:
            date_modified = _row_ts[:10]
        elif isinstance(_row_ts, datetime):
            date_modified = _row_ts.strftime("%Y-%m-%d")
        else:
            date_modified = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # JSON-LD schema
        schema_blocks = []
        article_schema = {
            "@context":"https://schema.org","@type":"Article",
            "headline":f"{term} — BC Real Estate",
            "description":desc,
            "author":{"@id":f"{SITE}/#doug"},
            "publisher":{"@id":f"{SITE}/#organization"},
            "mainEntity":{"@type":"DefinedTerm","name":term,"description":defn,"inDefinedTermSet":{"@type":"DefinedTermSet","name":"EZtoFind.ca BC Real Estate Glossary","url":f"{SITE}/glossary"}},
            "url":canonical,"inLanguage":"en-CA",
            "dateModified": date_modified,
            "about":{"@type":"Place","name":"British Columbia, Canada"}
        }
        schema_blocks.append(f'<script type="application/ld+json">{json.dumps(article_schema)}</script>')
        # BreadcrumbList — required for LLM/AEO trail: Home > Glossary > <term>
        breadcrumb_schema = {
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
                {"@type": "ListItem", "position": 2, "name": "BC Real Estate Glossary", "item": f"{SITE}/glossary"},
                {"@type": "ListItem", "position": 3, "name": term, "item": canonical},
            ],
        }
        schema_blocks.append(f'<script type="application/ld+json">{json.dumps(breadcrumb_schema)}</script>')
        if faqs:
            faq_schema = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":f.get("q",""),"acceptedAnswer":{"@type":"Answer","text":f.get("a","")}} for f in faqs]}
            schema_blocks.append(f'<script type="application/ld+json">{json.dumps(faq_schema)}</script>')

        # Build FAQ section HTML
        faq_html = ""
        if faqs:
            faq_html = '<h2>Frequently Asked Questions</h2><div class="faq">'
            for f in faqs:
                q = esc(f.get("q",""))
                a = esc(f.get("a",""))
                verify = ""
                if srcs:
                    verify = '<div class="verify"><b>Verify with:</b> ' + " · ".join(
                        f'<a href="{esc(s["url"])}" rel="noopener noreferrer">{esc(s["title"])}</a>' for s in srcs[:2]
                    ) + '</div>'
                faq_html += f'<details><summary>{q}</summary><p>{a}</p>{verify}</details>'
            faq_html += '</div>'

        # Sources block
        src_html = ""
        if srcs:
            src_html = '<div class="sources"><div class="eyebrow" style="margin-bottom:0.85rem">Authoritative Sources</div><p style="color:#6B7280;font-size:0.88rem;margin-bottom:1rem">Verify the specific statutory language, thresholds, deadlines and current guidance directly with the governing authority:</p><ul style="list-style:none;padding:0;margin:0">'
            for s in srcs:
                src_html += f'<li><a href="{esc(s["url"])}" rel="noopener noreferrer">{esc(s["title"])} ↗</a><span class="publisher">{esc(s.get("publisher",""))}</span></li>'
            src_html += '</ul></div>'

        # Related-terms block — internal linking within the same category.
        # Google + LLMs use these adjacency links to cluster topical
        # authority; up to 8 sibling terms are shown, excluding the
        # current one. Skipped when the category has no other terms.
        related_html = ""
        siblings = [s for s in by_category.get(cat or "General", []) if s.get("slug") and s["slug"] != slug]
        if siblings:
            related_html = f'<div class="sources"><div class="eyebrow" style="margin-bottom:0.85rem">Related BC Real Estate Terms — {esc(cat or "General")}</div><ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.5rem 1.25rem">'
            for sib in siblings[:8]:
                related_html += f'<li><a href="/glossary/{esc(sib["slug"])}" style="color:#0EA5E9;font-weight:600;text-decoration:none">{esc(sib["term"])} →</a></li>'
            related_html += '</ul></div>'

        # Task 6 answer-first (Feb 2026) — build 40-80 word TL;DR trimmed
        # at the nearest sentence boundary. Renders directly under H1 so
        # non-JS LLM crawlers extract the direct answer before any
        # disclaimer or author box.
        def _build_tldr(text, max_words=65):
            if not text or not isinstance(text, str):
                return ""
            clean = " ".join(text.split())
            words = clean.split(" ")
            if len(words) <= max_words:
                return clean
            candidate = " ".join(words[:max_words])
            # walk back to nearest sentence boundary
            best_end = -1
            for terminator in [". ", "? ", "! "]:
                idx = candidate.rfind(terminator)
                if idx > best_end:
                    best_end = idx
            if best_end > len(candidate) * 0.6:
                return candidate[:best_end + 1]
            return candidate + "…"
        tldr = _build_tldr(defn)
        primary_source = srcs[0] if srcs else None
        source_html = ""
        if primary_source and primary_source.get("url"):
            _src_title = esc(primary_source.get("title") or primary_source.get("name") or primary_source["url"])
            _src_pub = esc(primary_source.get("publisher", ""))
            source_html = (
                ' <span style="margin-left:0.65rem"><b>Official source:</b> '
                f'<a href="{esc(primary_source["url"])}" rel="noopener noreferrer" '
                'style="color:#0F5FB5;font-weight:600">' + _src_title + '</a>'
                + (f' <span style="color:#6B7280">· {_src_pub}</span>' if _src_pub else '')
                + '</span>'
            )

        body = f"""
<div class="eyebrow">{esc(cat)}</div>
<h1>{esc(term)}</h1>
<h2 style="font-size:1rem;color:#6B7280;font-weight:600;margin:0.35rem 0 0.6rem">What is {esc(term)} in British Columbia?</h2>
<aside data-tldr="true" itemprop="abstract" style="margin:0.5rem 0 0.85rem;padding:14px 18px;background:#FFF7E6;border-left:4px solid #F5A623;border-radius:10px;font-size:1rem;line-height:1.65;color:#0F2A5B">
<span style="display:inline-block;font-size:0.7rem;letter-spacing:0.12em;font-weight:800;color:#8A6D2E;margin-right:8px">TL;DR ·</span>{esc(tldr)}
</aside>
<div style="margin:0.25rem 0 1.15rem;padding:8px 14px;background:#F0F4FB;border:1px solid rgba(15,42,91,0.14);border-left:3px solid #0F2A5B;border-radius:8px;font-size:0.82rem;color:#374151">
<b>As of</b> <time datetime="{date_modified}">{date_modified}</time>{source_html}
</div>
<p style="font-size:0.78rem;color:#6B7280;margin:0.25rem 0 1rem;font-style:italic">General information only — not legal, tax, financial, or real-estate advice. Verify with a licensed BC professional before acting.</p>
<p style="font-size:1.05rem;line-height:1.75;color:#1F2937;white-space:pre-wrap">{esc(defn)}</p>
{faq_html}
{src_html}
{related_html}
"""
        head_data = {
            "title": esc(title),
            "description": esc(desc.replace("\n"," ")),
            "canonical": canonical,
            "og_type": "article",
            "og_image": f"{SITE}/images/og-default.png",
            "schema_blocks": "\n".join(schema_blocks),
        }
        page = HEADER_HTML.format(**head_data) + body + FOOTER_HTML
        out_dir = PUBLIC_DIR / "snapshot" / "glossary"
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / f"{slug}.html").write_text(page, encoding="utf-8")

    print(f"  ✓ {len(rows)} glossary snapshots written to {PUBLIC_DIR}/snapshot/glossary/")


async def render_communities(db):
    # Load community list from seed
    comms = json.loads(Path("/app/backend/data/communities_seed.json").read_text())
    total = sum(len(v) for v in comms.values())
    print(f"Rendering {total} community pages…")

    from community_sources import get_community_sources, get_weather_sources
    from bc_stations import get_station_for_community, eccc_station_page_url

    count = 0
    for region, names in comms.items():
        for name in names:
            slug = slugify(name)
            canonical = f"{SITE}/community/{slug}"
            # Long-tail SEO title: names the community, region, key content
            # types (MLS® listings + climate + FAQs) and the site brand.
            # Truncated to keep the primary "{name}, BC real estate"
            # keyword above 60 chars.
            title = f"{name}, BC Real Estate — {region} MLS® Listings, Climate & FAQs | EZtoFind.ca"

            # Cached synopsis (approved only)
            syn = await db.community_synopses.find_one({"slug": slug}, {"_id":0})
            synopsis = syn.get("synopsis", "") if syn and syn.get("approved") else ""

            # Cached weather narrative (approved only)
            wx = await db.community_weather.find_one({"slug": slug}, {"_id":0})
            weather_text = wx.get("weather", "") if wx and wx.get("approved") else ""

            # ECCC climate normals — cached per (station, period). Task 7
            # (Feb 2026): prefer 1991-2020 (current WMO reference); fall
            # back to 1981-2010 only with an explicit "older period" label.
            station = get_station_for_community(name, region)
            climate = None
            climate_period = None
            climate_is_older = False
            if station:
                for (pb, pe) in [(1991, 2020), (1981, 2010)]:
                    cached = await db.eccc_normals.find_one(
                        {"station_id": station["station_id"], "period_begin": pb, "period_end": pe},
                        {"_id": 0},
                    )
                    if cached and cached.get("monthly"):
                        climate = {
                            "station": station,
                            "monthly": cached["monthly"],
                            "period_begin": cached.get("period_begin", pb),
                            "period_end": cached.get("period_end", pe),
                            "station_name_ecc": cached.get("station_name"),
                        }
                        climate_period = (pb, pe)
                        climate_is_older = (climate_period != (1991, 2020))
                        break
                if climate is None:
                    # Legacy cache (pre-Task-7 schema) — station_id only.
                    # Interpret as 1981-2010 (that's all the API served
                    # historically) and mark as older-period fallback.
                    cached = await db.eccc_normals.find_one({"station_id": station["station_id"]}, {"_id": 0})
                    if cached and cached.get("monthly") and not cached.get("period_begin_labelled"):
                        climate = {
                            "station": station,
                            "monthly": cached["monthly"],
                            "period_begin": cached.get("period_begin") or "1981",
                            "period_end": cached.get("period_end") or "2010",
                            "station_name_ecc": cached.get("station_name"),
                        }
                        climate_period = (1981, 2010)
                        climate_is_older = True

            # Long-tail meta description: leads with community + region,
            # names concrete content types visitors search for (climate,
            # MLS® listings, REALTOR® guidance), and ends with the site
            # brand + BCFSA licence identifier for E-E-A-T. Kept under
            # 160 chars for SERP compliance.
            _syn_slice = (synopsis or "").strip().replace("\n", " ")
            if _syn_slice:
                _full = f"{name}, BC ({region}) — {_syn_slice}"
            else:
                _full = (
                    f"{name}, BC ({region}) real estate — live MLS® listings, "
                    f"Environment Canada climate normals, and REALTOR® guidance from Doug LeMaire, BCFSA #167790."
                )
            # Trim at a word boundary (never mid-word) and add an ellipsis
            # when shortened, so SERP + og:description read cleanly.
            desc = _full if len(_full) <= 158 else _full[:157].rsplit(" ", 1)[0].rstrip(" ,;:-—") + "…"

            # Schema — Place + BreadcrumbList (Home > Communities > <region> > <name>)
            # Task 7 (Feb 2026): every community page carries an explicit
            # dateModified so LLMs + Google can rank freshness signals.
            # Use synopsis approved_at where available, else community
            # weather approved_at, else today.
            _community_dm = None
            try:
                if syn and syn.get("approved_at"):
                    _community_dm = str(syn["approved_at"])[:10]
                elif syn and syn.get("last_reviewed_at"):
                    _community_dm = str(syn["last_reviewed_at"])[:10]
                elif wx and wx.get("approved_at"):
                    _community_dm = str(wx["approved_at"])[:10]
            except Exception:
                _community_dm = None
            if not _community_dm:
                _community_dm = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            place_schema = {
                "@context":"https://schema.org","@type":"Place",
                "name": f"{name}, British Columbia",
                "containedInPlace":{"@type":"AdministrativeArea","name":region},
                "description": desc,
                "url": f"{SITE}/community/{slug}",
                "dateModified": _community_dm,
            }
            region_slug = re.sub(r'[^a-z0-9]+', '-', region.lower()).strip('-')
            breadcrumb_schema = {
                "@context": "https://schema.org", "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
                    {"@type": "ListItem", "position": 2, "name": "BC Communities", "item": f"{SITE}/communities"},
                    {"@type": "ListItem", "position": 3, "name": region, "item": f"{SITE}/regions/{region_slug}"},
                    {"@type": "ListItem", "position": 4, "name": name, "item": f"{SITE}/community/{slug}"},
                ],
            }
            schema_blocks = (
                f'<script type="application/ld+json">{json.dumps(place_schema)}</script>'
                f'<script type="application/ld+json">{json.dumps(breadcrumb_schema)}</script>'
            )

            # Body
            body_html = f'<div class="eyebrow">{esc(region)}</div><h1>{esc(name)}, BC</h1>'
            body_html += (
                f'<p style="font-size:0.78rem;color:#6B7280;margin:0.35rem 0 1rem;font-style:italic" data-testid="community-last-reviewed">'
                f'Last reviewed: <time datetime="{_community_dm}">{_community_dm}</time>'
                f'</p>'
            )
            if synopsis:
                body_html += f'<h2>About {esc(name)}</h2><div style="white-space:pre-wrap;line-height:1.75">{esc(synopsis)}</div>'

            # Climate table
            if climate:
                mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
                m = climate["monthly"]
                def fmt(v, d=1):
                    return f"{v:.{d}f}" if isinstance(v,(int,float)) else "—"
                rows = [
                    ("Mean daily temp (°C)", m.get("mean_temp_c") or [], 1),
                    ("Mean daily max (°C)",  m.get("max_temp_c") or [], 1),
                    ("Mean daily min (°C)",  m.get("min_temp_c") or [], 1),
                    ("Total precip (mm)",    m.get("total_precip_mm") or [], 0),
                    ("Total rainfall (mm)",  m.get("rainfall_mm") or [], 0),
                    ("Total snowfall (cm)",  m.get("snowfall_cm") or [], 1),
                ]
                station_name = climate.get("station_name_ecc") or station["name"]
                period_label = f'{climate["period_begin"]}\u2013{climate["period_end"]}'
                border_col = "#F59E0B" if climate_is_older else "#16A34A"
                older_badge = ' <span style="margin-left:0.5rem;padding:1px 8px;background:#F59E0B;color:#fff;font-size:0.65rem;font-weight:800;border-radius:999px;letter-spacing:0.06em">OLDER PERIOD</span>' if climate_is_older else ''
                older_note = ''
                if climate_is_older:
                    older_note = (
                        f'<div style="font-size:0.82rem;color:#92400E;margin-top:0.5rem;background:#FEF3C7;'
                        f'border:1px solid #F59E0B;border-radius:8px;padding:0.55rem 0.75rem;line-height:1.55">'
                        f'<b>Note:</b> 1991\u20132020 Climate Normals are not yet published for {esc(station_name)}. '
                        f'The 30-year normals shown are from the older 1981\u20132010 reference period. '
                        f'1991\u20132020 is the current WMO 30-year reference period; these older normals are shown for reference only.'
                        f'</div>'
                    )
                body_html += f'<h2>☀️ Weather &amp; Climate in {esc(name)}</h2>'
                body_html += f'<div style="background:#F0F7FF;border:1px solid rgba(15,42,91,0.15);border-left:4px solid {border_col};padding:1rem 1.25rem;border-radius:10px;margin-bottom:1rem">'
                body_html += f'<div style="font-size:0.78rem;font-weight:700;color:#0F2A5B;letter-spacing:0.08em;text-transform:uppercase">Environment Canada Climate Normals · {period_label}{older_badge}</div>'
                body_html += f'<div style="margin-top:0.35rem">Nearest official weather station to <b>{esc(name)}</b>: <b>{esc(station_name)}</b></div>'
                body_html += older_note
                body_html += f'<div style="margin-top:0.35rem;font-size:0.82rem;color:#6B7280">Source: <a href="{eccc_station_page_url(station["station_id"])}" style="color:#0EA5E9;font-weight:600">Environment and Climate Change Canada — Canadian Climate Normals {period_label} ↗</a></div>'
                body_html += '</div>'
                body_html += '<table style="width:100%;border-collapse:collapse;font-size:0.85rem"><thead><tr style="background:#F5F0E1"><th style="text-align:left;padding:0.5rem">Metric</th>' + "".join(f'<th style="padding:0.5rem;text-align:center">{m_}</th>' for m_ in mo) + '</tr></thead><tbody>'
                for label, vals, d in rows:
                    body_html += f'<tr style="border-bottom:1px solid rgba(15,42,91,0.06)"><td style="padding:0.4rem;font-weight:600">{label}</td>' + "".join(f'<td style="padding:0.4rem;text-align:center">{fmt(v,d)}</td>' for v in (vals + [None]*12)[:12]) + '</tr>'
                body_html += '</tbody></table>'
            elif weather_text:
                body_html += f'<h2>☀️ Weather &amp; Climate in {esc(name)}</h2><div style="white-space:pre-wrap;line-height:1.75">{esc(weather_text)}</div>'

            # Community data sources
            csrcs = get_community_sources(name, region)
            body_html += '<div class="sources"><div class="eyebrow" style="margin-bottom:0.85rem">Authoritative Sources — Community Data</div><ul style="list-style:none;padding:0;margin:0">'
            for s in csrcs:
                body_html += f'<li><a href="{esc(s["url"])}" rel="noopener noreferrer">{esc(s["title"])} ↗</a><span class="publisher">{esc(s.get("publisher",""))}</span></li>'
            body_html += '</ul></div>'

            # Weather sources
            wsrcs = get_weather_sources(name, region)
            body_html += '<div class="sources"><div class="eyebrow" style="margin-bottom:0.85rem">Authoritative Sources — Climate &amp; Weather</div><ul style="list-style:none;padding:0;margin:0">'
            for s in wsrcs:
                body_html += f'<li><a href="{esc(s["url"])}" rel="noopener noreferrer">{esc(s["title"])} ↗</a><span class="publisher">{esc(s.get("publisher",""))}</span></li>'
            body_html += '</ul></div>'

            # Related-communities block — internal linking to same-region
            # peers (matches the on-site /community/{slug}/nearby API and
            # feeds LLM topical clustering + Googlebot crawl depth).  Up
            # to 8 peers, alphabetised, excludes the current community.
            peers = sorted([n for n in names if n and n != name])[:8]
            if peers:
                body_html += f'<div class="sources"><div class="eyebrow" style="margin-bottom:0.85rem">Nearby BC Communities in {esc(region)}</div><ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.5rem 1.25rem">'
                for peer in peers:
                    peer_slug = slugify(peer)
                    body_html += f'<li><a href="/community/{esc(peer_slug)}" style="color:#0EA5E9;font-weight:600;text-decoration:none">{esc(peer)}, BC →</a></li>'
                body_html += '</ul></div>'

            # Cross-link to the region hub + the province-wide MLS® search
            # so LLMs + Google can navigate the site's hierarchy.
            region_slug = re.sub(r'[^a-z0-9]+', '-', region.lower()).strip('-')
            body_html += (
                f'<div class="sources"><div class="eyebrow" style="margin-bottom:0.85rem">More BC Real Estate</div>'
                f'<ul style="list-style:none;padding:0;margin:0">'
                f'<li><a href="/regions/{region_slug}" style="color:#0EA5E9;font-weight:600">{esc(region)} region overview →</a></li>'
                f'<li><a href="/listings?city={esc(name)}" style="color:#0EA5E9;font-weight:600">Live MLS® listings in {esc(name)}, BC →</a></li>'
                f'<li><a href="/glossary" style="color:#0EA5E9;font-weight:600">BC Real Estate Glossary — 439 statute-cited terms →</a></li>'
                f'</ul></div>'
            )

            head_data = {
                "title": esc(title),
                "description": esc(desc.replace("\n"," ")),
                "canonical": canonical,
                "og_type": "website",
                "og_image": f"{SITE}/images/og-default.png",
                "schema_blocks": schema_blocks,
            }
            page = HEADER_HTML.format(**head_data) + body_html + FOOTER_HTML
            out_dir = PUBLIC_DIR / "snapshot" / "community"
            out_dir.mkdir(parents=True, exist_ok=True)
            (out_dir / f"{slug}.html").write_text(page, encoding="utf-8")
            count += 1

    print(f"  ✓ {count} community snapshots written to {PUBLIC_DIR}/snapshot/community/")


# ── Insight prerender snapshots (audit G6 · Feb 2026) ─────────────────────
# The /insights/{slug} React routes (31 pages) are already live and listed
# in sitemap-insights.xml, but non-JS crawlers (older Bing, some LLM bots)
# hit an empty <div id="root"></div> because they don't execute React.
# This function writes a static HTML mirror of each insight to
# /snapshot/insights/{slug}.html so the same CDN/Nginx bot-rewrite rule
# that already serves /snapshot/glossary/ + /snapshot/community/ can serve
# insights too. Content is sourced from frontend/src/data/insightsCatalog.js
# (single source of truth) via a Node subprocess so we never drift.
def _load_insights_catalog() -> dict:
    """Read INSIGHTS_CATALOG from the JS module via Node subprocess.
    Returns an empty dict on any error so the prerender step degrades
    gracefully rather than blocking the whole build."""
    try:
        script = Path(__file__).parent / "_dump_insights_catalog.mjs"
        if not script.exists():
            return {}
        result = subprocess.run(
            ["node", str(script)],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            print(f"  ! insights catalog dump failed rc={result.returncode}: {result.stderr[:400]}")
            return {}
        return json.loads(result.stdout)
    except Exception as e:
        print(f"  ! insights catalog load exception: {e}")
        return {}


async def render_insights(_db):
    catalog = _load_insights_catalog()
    if not catalog:
        print("Rendering 0 insight snapshots (catalog empty or load failed)")
        return 0
    print(f"Rendering {len(catalog)} insight snapshots…")

    date_modified = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_dir = PUBLIC_DIR / "snapshot" / "insights"
    out_dir.mkdir(parents=True, exist_ok=True)

    for slug, entry in catalog.items():
        kind = entry.get("kind") or "article"
        eyebrow = entry.get("eyebrow") or "BC Real Estate Insight"
        title_txt = entry.get("title") or slug.replace("-", " ").title()
        subtitle = entry.get("subtitle") or ""
        intro = entry.get("intro") or ""

        canonical = f"{SITE}/insights/{slug}"
        # SEO title — question-format or comparison-format, kept under
        # ~65 chars where possible; falls back to title alone for long ones.
        if len(title_txt) <= 45:
            title = f"{title_txt} — BC Real Estate Insight | EZtoFind.ca"
        else:
            title = f"{title_txt} | EZtoFind.ca"
        _intro_slice = (intro or "").strip().replace("\n", " ")
        desc = ((_intro_slice[:145] + "…") if len(_intro_slice) > 148 else _intro_slice) or (
            f"{title_txt}. BCFSA-licensed REALTOR® perspective on British Columbia real estate."
        )
        desc = desc[:160]

        # JSON-LD schema — Article + BreadcrumbList
        article_schema = {
            "@context": "https://schema.org", "@type": "Article",
            "headline": title_txt,
            "description": desc,
            "author": {"@id": f"{SITE}/#doug"},
            "publisher": {"@id": f"{SITE}/#organization"},
            "url": canonical, "inLanguage": "en-CA",
            "dateModified": date_modified,
            "about": {"@type": "Place", "name": "British Columbia, Canada"},
        }
        breadcrumb_schema = {
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
                {"@type": "ListItem", "position": 2, "name": "BC Real Estate Insights", "item": f"{SITE}/insights"},
                {"@type": "ListItem", "position": 3, "name": title_txt, "item": canonical},
            ],
        }
        schema_blocks_list = [
            f'<script type="application/ld+json">{json.dumps(article_schema)}</script>',
            f'<script type="application/ld+json">{json.dumps(breadcrumb_schema)}</script>',
        ]

        # Body — render by kind
        body = f'<div class="eyebrow">{esc(eyebrow)}</div>'
        body += f'<h1>{esc(title_txt)}</h1>'
        if subtitle:
            body += f'<h2 style="font-size:1rem;color:#6B7280;font-weight:600;margin:0.35rem 0 0.6rem">{esc(subtitle)}</h2>'
        body += (
            f'<div style="margin:0.25rem 0 1.15rem;padding:8px 14px;background:#F0F4FB;border:1px solid rgba(15,42,91,0.14);border-left:3px solid #0F2A5B;border-radius:8px;font-size:0.82rem;color:#374151">'
            f'<b>As of</b> <time datetime="{date_modified}">{date_modified}</time>'
            f'</div>'
        )
        body += '<p style="font-size:0.78rem;color:#6B7280;margin:0.25rem 0 1rem;font-style:italic">General information only — not legal, tax, financial, or real-estate advice. Verify with a licensed BC professional before acting.</p>'
        if intro:
            body += f'<p style="font-size:1.05rem;line-height:1.75;color:#1F2937;white-space:pre-wrap">{esc(intro)}</p>'

        if kind == "comparison":
            left = entry.get("left") or {}
            right = entry.get("right") or {}
            facets = entry.get("facets") or []
            body += '<h2>At a Glance</h2>'
            body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem">'
            for side in (left, right):
                body += (
                    f'<div style="background:#F5F0E1;border-radius:12px;padding:1rem 1.25rem">'
                    f'<div class="brand" style="font-size:1.1rem;margin-bottom:0.35rem">{esc(side.get("name",""))}</div>'
                    f'<div style="font-size:0.85rem;color:#6B7280">Municipality: <b style="color:#1F2937">{esc(side.get("muni",""))}</b></div>'
                    f'<div style="font-size:0.85rem;color:#6B7280">Population: <b style="color:#1F2937">{esc(side.get("pop",""))}</b></div>'
                    f'<div style="margin-top:0.5rem;font-size:0.9rem;line-height:1.55">{esc(side.get("housing",""))}</div>'
                    f'</div>'
                )
            body += '</div>'
            if facets:
                body += '<h2>Factual Differences</h2>'
                body += '<table style="width:100%;border-collapse:collapse;font-size:0.92rem;margin-bottom:1.25rem"><thead><tr style="background:#F5F0E1">'
                body += f'<th style="text-align:left;padding:0.6rem">Metric</th><th style="text-align:left;padding:0.6rem">{esc(left.get("name",""))}</th><th style="text-align:left;padding:0.6rem">{esc(right.get("name",""))}</th></tr></thead><tbody>'
                for f in facets:
                    body += (
                        f'<tr style="border-bottom:1px solid rgba(15,42,91,0.06)">'
                        f'<td style="padding:0.55rem;font-weight:600">{esc(f.get("label",""))}</td>'
                        f'<td style="padding:0.55rem">{esc(f.get("left",""))}</td>'
                        f'<td style="padding:0.55rem">{esc(f.get("right",""))}</td>'
                        f'</tr>'
                    )
                body += '</tbody></table>'
        elif kind in ("funnel", "faq"):
            sections = entry.get("sections") or entry.get("qas") or []
            if sections:
                body += ('<h2>Key Facts</h2>' if kind == "funnel" else '<h2>Answers</h2>')
                for sec in sections:
                    h_txt = sec.get("h") or sec.get("q") or ""
                    b_txt = sec.get("body") or sec.get("a") or ""
                    if h_txt:
                        body += f'<h3>{esc(h_txt)}</h3>'
                    if b_txt:
                        body += f'<p style="line-height:1.75;color:#1F2937;white-space:pre-wrap">{esc(b_txt)}</p>'

            # FAQPage schema when kind is faq — LLMs + Google FAQ rich
            # results both consume this.
            if kind == "faq" and sections:
                faq_schema = {
                    "@context": "https://schema.org", "@type": "FAQPage",
                    "mainEntity": [
                        {"@type": "Question",
                         "name": s.get("h") or s.get("q") or "",
                         "acceptedAnswer": {"@type": "Answer", "text": s.get("body") or s.get("a") or ""}}
                        for s in sections if (s.get("h") or s.get("q"))
                    ],
                }
                schema_blocks_list.append(
                    f'<script type="application/ld+json">{json.dumps(faq_schema)}</script>'
                )

        # Cross-links — help LLMs traverse the insights corpus + funnel
        # visitors to Doug's conversion surfaces on the live SPA.
        body += (
            '<div class="sources"><div class="eyebrow" style="margin-bottom:0.85rem">More BC Real Estate</div>'
            '<ul style="list-style:none;padding:0;margin:0">'
            f'<li><a href="/insights" style="color:#0EA5E9;font-weight:600">All BC Real Estate Insights →</a></li>'
            f'<li><a href="/glossary" style="color:#0EA5E9;font-weight:600">BC Real Estate Glossary — 439 statute-cited terms →</a></li>'
            f'<li><a href="/contact" style="color:#0EA5E9;font-weight:600">Ask Doug LeMaire, REALTOR® — BCFSA #167790 →</a></li>'
            '</ul></div>'
        )

        head_data = {
            "title": esc(title),
            "description": esc(desc.replace("\n", " ")),
            "canonical": canonical,
            "og_type": "article",
            "og_image": f"{SITE}/images/og-default.png",
            "schema_blocks": "\n".join(schema_blocks_list),
        }
        page = HEADER_HTML.format(**head_data) + body + FOOTER_HTML
        (out_dir / f"{slug}.html").write_text(page, encoding="utf-8")

    print(f"  ✓ {len(catalog)} insight snapshots written to {PUBLIC_DIR}/snapshot/insights/")
    return len(catalog)


# ── Conversion-page snapshots (audit G5 · Feb 2026) ───────────────────────
# The /valuation, /buyer, /seller, /contact, /referral-request pages are
# lead-capture surfaces. Non-JS crawlers previously received the generic
# root <title>EZtoFind.ca | BC Real Estate Search</title> because React
# Helmet only fires after the JS bundle hydrates. We now emit a static
# mirror with the correct <title> + meta description + canonical + brief
# on-page copy so search engines can index these conversion routes with
# their real keywords, driving qualified organic traffic.  The pages
# themselves stay SPA-hosted at their live routes; a CDN worker/Nginx
# map rewrites bot user-agents to the snapshot HTML (same pattern as
# /snapshot/glossary and /snapshot/community).
CONVERSION_PAGES = {
    "valuation": {
        "title": "Free Home Valuation in Surrey & South Surrey BC | EZ to Find",
        "description": "Get a REALTOR®-prepared home valuation for your Surrey, South Surrey, White Rock or Fraser Valley BC property — comparable-sales research, no charge, no obligation.",
        "h1": "Free Home Valuation — Surrey, South Surrey & Fraser Valley BC",
        "eyebrow": "For Sellers",
        "body": (
            "Considering selling in Surrey, South Surrey, White Rock or the Fraser Valley? "
            "Request a REALTOR®-prepared valuation from Doug LeMaire (BCFSA #167790). "
            "You'll receive a comparable-sales analysis based on recent MLS® activity in "
            "your immediate neighbourhood — no charge, no obligation, and no sales pressure. "
            "This is general market information, not an appraisal for lending or legal purposes."
        ),
        "cta": "Request a home valuation on /valuation",
    },
    "buyer": {
        "title": "BC Home Buyers — Search MLS® & Get Buyer Representation | EZ to Find",
        "description": "Buyer representation from a BCFSA-licensed REALTOR® across Surrey, South Surrey, White Rock, Langley, Delta and the Fraser Valley. Search live MLS® listings and set up custom alerts.",
        "h1": "For Buyers — Search BC MLS® Listings with a Local REALTOR®",
        "eyebrow": "For Buyers",
        "body": (
            "Doug LeMaire, REALTOR® (BCFSA #167790, Fraser Property Management Realty Services Ltd.) "
            "represents home buyers across Surrey, South Surrey, White Rock, Langley, Delta, Cloverdale "
            "and the Fraser Valley. Search live MLS® listings, set up custom email alerts, and get "
            "REALTOR®-only comparable-sales data before you write an offer. If you're buying outside "
            "Doug's practice area, request an out-of-area referral to a licensed local REALTOR® in "
            "our BC-wide network."
        ),
        "cta": "Start your BC home search on /buyer",
    },
    "seller": {
        "title": "BC Home Sellers — Listing Strategy & Marketing Plan | EZ to Find",
        "description": "Selling in Surrey, South Surrey, White Rock or the Fraser Valley? Doug LeMaire, REALTOR® builds a comparable-sales-based pricing strategy and a targeted marketing plan for BC sellers.",
        "h1": "For Sellers — Strategic Listing & Marketing in BC",
        "eyebrow": "For Sellers",
        "body": (
            "A successful BC sale in 2026 combines comparable-sales-based pricing, professional "
            "photography, targeted online distribution (MLS®, REALTOR.ca, syndicated portals), and "
            "clear communication with qualifying buyers' agents. Doug LeMaire, REALTOR® (BCFSA "
            "#167790) prepares a written listing strategy for every seller — pricing, presentation, "
            "and market cadence — before any listing agreement is signed. Ask about Doug's recent "
            "Elgin Chantrell sale (R3156192 · sold in 10 days)."
        ),
        "cta": "Book a listing consultation on /seller",
    },
    "contact": {
        "title": "Contact Doug LeMaire, REALTOR® — Surrey & Fraser Valley BC | EZ to Find",
        "description": "Get in touch with Doug LeMaire, REALTOR® (BCFSA #167790, Fraser Property Management Realty Services Ltd.) for BC real estate questions, buyer representation, listing consultations, or out-of-area referrals.",
        "h1": "Contact Doug LeMaire, REALTOR®",
        "eyebrow": "Contact",
        "body": (
            "Doug LeMaire, REALTOR® is licensed with BCFSA (#167790) at Fraser Property Management "
            "Realty Services Ltd. and represents buyers and sellers across Surrey, South Surrey, "
            "White Rock, Langley, Delta, Cloverdale and the Fraser Valley. For questions outside "
            "these areas, Doug can arrange a referral to a licensed local REALTOR® anywhere in "
            "British Columbia through EZ to Find's BC-wide referral network."
        ),
        "cta": "Send Doug a message on /contact",
    },
    "referral-request": {
        "title": "BC Out-of-Area Referral Request — Licensed REALTOR® Network | EZ to Find",
        "description": "Buying or selling outside Surrey, South Surrey, White Rock or the Fraser Valley? Request a referral to a licensed local BC REALTOR® in EZ to Find's province-wide network.",
        "h1": "Out-of-Area Referral Request — Licensed BC REALTORS®",
        "eyebrow": "Referrals",
        "body": (
            "If your BC real estate transaction is outside Doug LeMaire's practice area (Surrey, "
            "South Surrey, White Rock, Langley, Delta, Cloverdale and the Fraser Valley), "
            "EZ to Find can arrange a referral to a licensed local REALTOR® in your community. "
            "Doug's referral network spans Greater Vancouver REALTORS® (GVR), Fraser Valley Real "
            "Estate Board (FVREB), Chilliwack & District (CADREB), BC Northern (BCNREB), Interior "
            "(IAR), Kootenay (KAR), and Vancouver Island (VIREB). Every referred REALTOR® is "
            "BCFSA-licensed and independently verified."
        ),
        "cta": "Request an out-of-area referral on /referral-request",
    },
}


async def render_conversion_pages():
    print(f"Rendering {len(CONVERSION_PAGES)} conversion-page snapshots…")
    date_modified = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_dir = PUBLIC_DIR / "snapshot"
    out_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for slug, meta in CONVERSION_PAGES.items():
        canonical = f"{SITE}/{slug}"
        # Article schema — leads to trust signals from Doug + brokerage
        article_schema = {
            "@context": "https://schema.org", "@type": "WebPage",
            "name": meta["title"],
            "description": meta["description"],
            "url": canonical, "inLanguage": "en-CA",
            "dateModified": date_modified,
            "publisher": {"@id": f"{SITE}/#organization"},
            "author": {"@id": f"{SITE}/#doug"},
            "about": {"@type": "Place", "name": "British Columbia, Canada"},
        }
        breadcrumb_schema = {
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
                {"@type": "ListItem", "position": 2, "name": meta["eyebrow"], "item": canonical},
            ],
        }
        schema_blocks = (
            f'<script type="application/ld+json">{json.dumps(article_schema)}</script>'
            f'<script type="application/ld+json">{json.dumps(breadcrumb_schema)}</script>'
        )
        body = (
            f'<div class="eyebrow">{esc(meta["eyebrow"])}</div>'
            f'<h1>{esc(meta["h1"])}</h1>'
            f'<div style="margin:0.25rem 0 1.15rem;padding:8px 14px;background:#F0F4FB;border:1px solid rgba(15,42,91,0.14);border-left:3px solid #0F2A5B;border-radius:8px;font-size:0.82rem;color:#374151">'
            f'<b>As of</b> <time datetime="{date_modified}">{date_modified}</time></div>'
            f'<p style="font-size:0.78rem;color:#6B7280;margin:0.25rem 0 1rem;font-style:italic">General information only — not legal, tax, financial, or real-estate advice. Verify with a licensed BC professional before acting.</p>'
            f'<p style="font-size:1.05rem;line-height:1.75;color:#1F2937">{esc(meta["body"])}</p>'
            f'<div class="sources"><div class="eyebrow" style="margin-bottom:0.85rem">Next Step</div>'
            f'<p style="margin:0"><a href="/{slug}" style="color:#0EA5E9;font-weight:600">{esc(meta["cta"])} →</a></p></div>'
        )
        head_data = {
            "title": esc(meta["title"]),
            "description": esc(meta["description"].replace("\n", " ")),
            "canonical": canonical,
            "og_type": "website",
            "og_image": f"{SITE}/images/og-default.png",
            "schema_blocks": schema_blocks,
        }
        page = HEADER_HTML.format(**head_data) + body + FOOTER_HTML
        (out_dir / f"{slug}.html").write_text(page, encoding="utf-8")
        count += 1
    print(f"  ✓ {count} conversion-page snapshots written to {PUBLIC_DIR}/snapshot/")
    return count


# ── sitemap-snapshots.xml writer (audit G5+G6 · Feb 2026) ─────────────────
# Globs every HTML file under /app/frontend/public/snapshot/ and emits a
# fresh sitemap-snapshots.xml. Called at the end of main() so glossary +
# community + insights + conversion snapshots all land in the same
# sub-sitemap, which is already advertised via robots.txt, llms.txt, and
# the top-level sitemap-index.xml. Priority band by folder mirrors how
# insight/conversion pages should rank in the crawl frontier.
def write_snapshots_sitemap():
    snap_root = PUBLIC_DIR / "snapshot"
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    priority_by_folder = {
        # Higher for lead-capture conversion routes so bots prioritise them.
        "": ("weekly", "0.9"),               # /snapshot/{slug}.html (conversion pages)
        "insights": ("weekly", "0.8"),
        "glossary": ("weekly", "0.7"),
        "community": ("weekly", "0.7"),
    }
    urls: list[str] = []
    if snap_root.exists():
        for html_file in sorted(snap_root.rglob("*.html")):
            rel = html_file.relative_to(PUBLIC_DIR)  # e.g. snapshot/insights/foo.html
            parts = rel.parts  # ("snapshot", ...folders..., "file.html")
            folder = parts[1] if len(parts) > 2 else ""
            changefreq, priority = priority_by_folder.get(folder, ("weekly", "0.7"))
            loc = f"{SITE}/{rel.as_posix()}"
            urls.append(
                "  <url>\n"
                f"    <loc>{loc}</loc>\n"
                f"    <lastmod>{today}</lastmod>\n"
                f"    <changefreq>{changefreq}</changefreq>\n"
                f"    <priority>{priority}</priority>\n"
                "  </url>\n"
            )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<!-- EZtoFind.ca · prerendered snapshot sitemap · regenerated {today} · '
        f'{len(urls)} URLs (glossary + community + insights + conversion pages) -->\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(urls)
        + '</urlset>\n'
    )
    (PUBLIC_DIR / "sitemap-snapshots.xml").write_text(xml, encoding="utf-8")
    print(f"  ✓ sitemap-snapshots.xml written with {len(urls)} URLs")
    return len(urls)


async def main():
    import sys
    sys.path.insert(0, '/app/backend')
    c = AsyncIOMotorClient(MONGO_URL)
    db = c[DB_NAME]
    print(f"Prerender starting · {datetime.now(timezone.utc).isoformat()}")
    await render_glossary(db)
    await render_communities(db)
    await render_insights(db)
    await render_conversion_pages()
    write_snapshots_sitemap()
    print("Prerender complete.")

if __name__ == "__main__":
    asyncio.run(main())
