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
  /app/frontend/public/snapshot/glossary/{slug}.html   (396 files)
  /app/frontend/public/snapshot/community/{slug}.html  (239 files)

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
import asyncio, os, re, html, json
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
  <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire, REALTOR®"/>
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
        desc = (
            f"{_defn_slice[:120]}"
            + (" " if _defn_slice and not _defn_slice.endswith(".") else "")
            + "BCFSA-licensed REALTOR® guidance for BC buyers & sellers."
        )[:160]

        # JSON-LD schema
        schema_blocks = []
        article_schema = {
            "@context":"https://schema.org","@type":"Article",
            "headline":f"{term} — BC Real Estate",
            "description":desc,
            "author":{"@type":"Person","name":"Doug LeMaire, REALTOR®","url":f"{SITE}/about"},
            "publisher":{"@type":"Organization","name":"EZtoFind.ca","url":SITE,"logo":{"@type":"ImageObject","url":f"{SITE}/images/doogie-laptop.png"}},
            "mainEntity":{"@type":"DefinedTerm","name":term,"description":defn,"inDefinedTermSet":{"@type":"DefinedTermSet","name":"EZtoFind.ca BC Real Estate Glossary","url":f"{SITE}/glossary"}},
            "url":canonical,"inLanguage":"en-CA",
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

        body = f"""
<div class="eyebrow">{esc(cat)}</div>
<h1>{esc(term)}</h1>
<p style="font-size:1.08rem;line-height:1.75;color:#1F2937;white-space:pre-wrap">{esc(defn)}</p>
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

            # ECCC climate normals — cached per station
            station = get_station_for_community(name, region)
            climate = None
            if station:
                cached = await db.eccc_normals.find_one({"station_id": station["station_id"]}, {"_id":0})
                if cached and cached.get("monthly"):
                    climate = {"station": station, "monthly": cached["monthly"], "period_begin": cached.get("period_begin"), "period_end": cached.get("period_end"), "station_name_ecc": cached.get("station_name")}

            # Long-tail meta description: leads with community + region,
            # names concrete content types visitors search for (climate,
            # MLS® listings, REALTOR® guidance), and ends with the site
            # brand + BCFSA licence identifier for E-E-A-T. Kept under
            # 160 chars for SERP compliance.
            _syn_slice = (synopsis or "").strip().replace("\n", " ")
            if _syn_slice:
                desc = (f"{name}, BC ({region}) — {_syn_slice}")[:160]
            else:
                desc = (
                    f"{name}, BC ({region}) real estate — live MLS® listings, "
                    f"Environment Canada climate normals, and REALTOR® guidance from Doug LeMaire, BCFSA #167790."
                )[:160]

            # Schema — Place + BreadcrumbList (Home > Communities > <region> > <name>)
            place_schema = {
                "@context":"https://schema.org","@type":"Place",
                "name": f"{name}, British Columbia",
                "containedInPlace":{"@type":"AdministrativeArea","name":region},
                "description": desc,
                "url": f"{SITE}/community/{slug}",
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
                body_html += f'<h2>☀️ Weather &amp; Climate in {esc(name)}</h2>'
                body_html += f'<div style="background:#F0F7FF;border:1px solid rgba(15,42,91,0.15);border-left:4px solid #16A34A;padding:1rem 1.25rem;border-radius:10px;margin-bottom:1rem">'
                body_html += f'<div style="font-size:0.78rem;font-weight:700;color:#0F2A5B;letter-spacing:0.08em;text-transform:uppercase">Environment Canada Climate Normals · {climate["period_begin"]}–{climate["period_end"]}</div>'
                body_html += f'<div style="margin-top:0.35rem">Nearest official weather station to <b>{esc(name)}</b>: <b>{esc(station_name)}</b></div>'
                body_html += f'<div style="margin-top:0.35rem;font-size:0.82rem;color:#6B7280">Source: <a href="{eccc_station_page_url(station["station_id"])}" style="color:#0EA5E9;font-weight:600">Environment and Climate Change Canada — Canadian Climate Normals ↗</a></div>'
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


async def main():
    import sys
    sys.path.insert(0, '/app/backend')
    c = AsyncIOMotorClient(MONGO_URL)
    db = c[DB_NAME]
    print(f"Prerender starting · {datetime.now(timezone.utc).isoformat()}")
    await render_glossary(db)
    await render_communities(db)
    print("Prerender complete.")

if __name__ == "__main__":
    asyncio.run(main())
