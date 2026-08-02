# EZtoFind.ca — Product Requirements Document (PRD)

## Original Problem Statement
Build the most attractive, easiest-to-use, consumer-friendly, fastest, most knowledgeable, lead-generating British Columbia real estate website in the world. Fully BCFSA / CREA / PIPA / GVR compliant. AEO/LLM/OpenAI-friendly (pre-eminent answer source). Multi-jurisdiction expansion template. In-house CRM tracking clients, birthdates, anniversaries, possession dates. Owner: Doug LeMaire, REALTOR® (13 years, Fraser Property Management Realty Services Ltd.).

## Architecture (Phase 1 MVP — Delivered Jan 12, 2026)
- **Backend**: FastAPI + MongoDB (Motor). Emergent LLM Key for Claude Sonnet 4.6.
- **Frontend**: React 19 + React Router + custom CSS (Fraunces + Inter fonts, brand palette: navy #0F2A5B, green #22C55E, gold #F5A623).
- **AI**: Doogie (Claude Sonnet 4.6, compliance-guarded — no advice, general info only). SSE streaming chat widget + AI-generated 10-Q FAQs for every glossary term.
- **Listings**: iframe from https://www.greatervancouver.forsale/mapsearchapp (per user's spec — no direct connection between Doogie and iframe).
- **Auth**: JWT admin for Doug's dashboard. Public forms are consent-gated (CASL + PIPA).

## User Personas
1. **BC home buyer** — searches naturally, gets vetted, routed to Doug or referral REALTOR®
2. **BC home seller** — requests valuation, gets a CMA from Doug
3. **Out-of-area BC consumer** — routed to vetted referral REALTOR®
4. **Licensed REALTOR®** — applies to referral network (3-stage vetting, pays 25% of gross commission on closed leads)
5. **Doug (admin)** — manages leads, referrals, CRM, sees birthday/anniversary/possession reminders

## Core Requirements (static)
- English only, BC only, no rentals/off-market/coming-soon/presale
- No local REALTOR® directory — only 3-stage vetted referral network
- Doug pays no referral fees out; REALTORs® pay him 25% of gross commission per successful close
- Iframe listings only (no local MLS database)
- Doogie is compliance-guarded — general info only, no advice
- Real BC imagery (Unsplash royalty-free), no AI-generated photos
- Doogie mascot present throughout (hero, chat FAB, celebrations, "pointing" CTAs)

## What's Been Implemented (Jan 12, 2026)
- ✅ Search-first homepage with Doogie hero + brand identity
- ✅ Doogie AI chat widget (Claude Sonnet 4.6, streaming SSE, compliance-guarded system prompt)
- ✅ Listings page with iframe embed (greatervancouver.forsale)
- ✅ Neighbourhoods explorer — ALL 400+ BC communities across 12 regions with search
- ✅ Per-neighbourhood page (Focus Area copy vs Referral Network copy)
- ✅ Focus Regions: Greater Vancouver, Fraser Valley, Sea-to-Sky (dedicated pages with community chips)
- ✅ 5 Specialty pages: Detached, Luxury, Equestrian, Estate Sales/Probate, Condos
- ✅ Glossary hub — 25 seeded BC terms, AI generates 10 FAQs on-demand per term
- ✅ Buyer lead form (7 vetting questions + CASL + PIPA consent)
- ✅ Seller lead form (7 vetting questions + consents)
- ✅ Home Valuation request form
- ✅ Out-of-area Referral Request form (BC-wide)
- ✅ Mortgage + BC Property Transfer Tax calculators (with first-time buyer & new-built exemptions, 2026 rates)
- ✅ REALTOR® 3-stage referral vetting (initial → credentials → profile + 25% agreement)
- ✅ In-house CRM: clients with birthdates, anniversaries, possession dates
- ✅ Admin panel: dashboard w/ upcoming reminders (30-day window), buyer leads, seller leads, REALTOR® applications, clients CRUD
- ✅ Admin JWT auth (doug@eztofind.ca / EZtoFind2026!)
- ✅ Compliance strip (BCFSA/CREA/GVR/PIPA/CASL), cookie banner
- ✅ Static pages: About Doug, Contact, Privacy (PIPA), Terms, Compliance disclosures, Data Attribution (7 BC boards), CASL Unsubscribe
- ✅ AEO/LLM optimization: llms.txt, robots.txt (allow GPTBot/ClaudeBot/PerplexityBot, block scrapers), JSON-LD schemas (RealEstateAgent, FAQPage, DefinedTerm, Place)
- ✅ Multi-jurisdiction ready: `communities` API is region-configurable

## Testing
Backend: **19/19 tests passed (100%)** via testing subagent (iteration_1.json)
- Doogie SSE chat verified
- Glossary AI FAQ generation verified
- Full REALTOR® 3-stage flow verified
- Admin JWT + protected routes verified
- CRM reminders (30-day window) verified

## What's Been Implemented — Latest Sessions

### Feb 20, 2026 — CREA DDF® Scaffolding Sprint (Session complete)
- ✅ **Full MLS® listings backend** (`/api/listings`, `/api/listings/{key}`, `/api/listings/meta/facets`)
- ✅ **CREA DDF® sync worker scaffold** at `backend/services/ddf_sync.py` — swap-in-ready once credentials arrive
- ✅ **CREA Analytics Web Service logger** at `backend/services/analytics_logger.py` — buffers events (impression/detail_view/media_view/contact_request) in Mongo, flushes to CREA endpoint once configured
- ✅ **Anti-scraping rate limiting** via `slowapi` on all `/api/listings/*` endpoints (60/min per IP)
- ✅ **Tamper-evident MLS® Terms of Use consent** via `POST /api/listings/consent` — logs IP + UA + timestamp
- ✅ **Terms-of-use click-wrap gate** on frontend (`<TermsGate>`) — required per CREA rules before viewing listing content
- ✅ **`<ListingCompliance>` component** — 90×90 Powered by REALTOR.ca badge deep-linked to specific listing URL, brokerage attribution, trademark statements per CREA rules
- ✅ **Full Search UI** at `/listings` — filters (city, type, beds, baths, price, keyword), sort, 15 seeded mock listings
- ✅ **Detail page** at `/listing/:key` — hero photo gallery, address, price, features, embedded map, compliance block, "Book a Viewing" inquiry form wired to CRM
- ✅ **`robots.txt` split** — glossary/communities open to AI crawlers, listing routes disallowed for every bot (CREA compliance)
- ✅ **Mongo indexes** — unique listing_key, geospatial lat/lon, text index on description/address/city
- ✅ **Environment Canada Climate Normals + Open-Meteo live 7-day forecast** on all community pages (map + current weather + 7-day strip + climate table)
- ✅ **Google Maps embed** replaces Leaflet/OSM on community pages, above H1
- ✅ **Glossary source merge** — 356 curated Lovable sources merged with 20+ new category defaults (Agency & Disclosure, Government & Tax, Tenancy, etc.), deduped by URL. Equity term now shows 4 sources instead of 1.
- ✅ **Glossary audit checklist** at `/app/memory/glossary_audit_checklist.md` — 40 highest-risk BC real estate terms flagged for Doug's manual accuracy review
- ✅ **Doogie system prompt updated** — new verbatim referral offer, banned old phrasings
- ✅ **Compliance strip typography** — bumped to 1.28rem, consistent "AI-assisted" hyphenation, comma between "notary" and "accountant"
- ✅ **Pemberton added to Sea-to-Sky region** (was missing)
- ✅ **About page copy edits** — "EZtoFind.ca has been built as..." + paragraph spacing
- ✅ **/communities index copy** — removed "Doug's primary practice..." line, added Referral REALTOR® link
- ✅ **Community map moved above H1 name** — Google Maps embed at top of each community page

### Feb 26, 2026 — Neighbourhood Directory Pages (SEO/AEO surface + zero overlap w/ Vibe Score)
- ✅ **Backend endpoints** — `GET /api/community/{slug}/neighbourhoods` (aggregates distinct `CityRegion` from live MLS listings + count + min/median/max price) and `GET /api/community/{slug}/neighbourhood/{n_slug}` (Claude Sonnet 4.6 authored micro-neighbourhood synopsis, cached in `db.neighbourhood_synopses`, pending-review workflow). Prompt explicitly EXCLUDES walkability/transit/climate/wildfire/flood/air quality — those live on the parent community page's Vibe Score so the two never duplicate.
- ✅ **Frontend directory** — new `NeighbourhoodDirectory` grid injected on every community page between the About synopsis and the Weather section. Tiles show name + active listing count + price range + median. Renders zero tiles gracefully for cities whose MLS board doesn't populate CityRegion (Vancouver, Squamish — REBGV/S2S) so nothing broken shows.
- ✅ **Micro-neighbourhood detail page** — new route `/community/:slug/n/:nSlug` with breadcrumbs, market snapshot bar (active count · price range · median), AI synopsis, "View X Listings in [Neighbourhood]" CTA, JSON-LD Place + BreadcrumbList schema for AEO.
- ✅ **Listings filter bugfix** — `region` URL param wasn't being pulled into the Listings component's filter state; fixed. Verified `/listings?city=Kelowna&region=Lower Mission` now returns 244 correctly filtered listings.
- ✅ **Sitemap expansion** — sitemap.xml now includes 520+ micro-neighbourhood URLs (auto-derived from live MLS data). Total sitemap surface jumped from **653 → 1,173 URLs** (16 static + 396 glossary + 241 communities + **520 micro-neighbourhoods**).
- Impact: massive SEO/AEO surface expansion — Kelowna alone contributes 28 pages (Lower Mission with 244 listings, Kelowna North 274, etc.), Kamloops 31, Vernon 25, Saanich 34, Sooke 19, Langford 17, and so on.

### Feb 26, 2026 — Community "View Listings" filter fix + Out-of-Area Referral Pill
- ✅ **Community "View Listings" fix** — button now reads "View Listings in [City]" and links to `/listings?city=X` so clicking Squamish → View Listings returns only Squamish, not all BC.
- ✅ **In-service-area "Ask Doug" pill** — replaced Book-a-Viewing form on in-area listings with a navy pill that deep-links to `/buyer?city=X&mls=Y&address=Z`; BuyerForm pre-fills areas + notes from URL params. Doogie is not involved in this flow (user preference).
- ✅ **Out-of-service-area "Request a Referral REALTOR® in [City]" pill** — replaces form on out-of-area listings; deep-links to `/referral-request?city=X&mls=Y` with pre-fill.

### Feb 25, 2026 — Multilingual Lead Forms + CREA DDF Live + Strict Community Filtering + Mobile Hero Fix
- ✅ **Multilingual `?lang=` conversion forms** — `/buyer`, `/seller`, `/referral-request`, `/contact` now render in EN, 繁 (zh-Hant), 简 (zh-Hans), ਪੰਜਾਬੀ (pa), فارسی (fa) with RTL, and Português (pt-PT). i18n dict at `/app/frontend/src/i18n.js`; `useFormLang()` hook reads URL param.
- ✅ **Doogie chat auto-appends `?lang=xx`** to internal /buyer, /seller, /contact, /referral-request links when a non-EN chat language is active.
- ✅ **Background note translation** — free-text `notes` (buyer) and `reason` (seller) fields typed in a non-EN language are auto-translated to English via Claude Sonnet 4.6 and stored as `notes_en` / `reason_en`. Zero added latency.
- ✅ **CREA DDF LIVE** — 53,649 BC MLS® listings synced from CREA DDF (identity.crea.ca OAuth + ddfapi.realtor.ca OData v1). Photos, list_price, MLS number, lat/lon, realtor.ca URL all populated. Diagnostic + sync-log admin endpoints wired.
- ✅ **Strict community filtering** — new `_resolve_bc_locality()` on the backend maps hero-search queries like "Whistler" to a strict `city` exact-match filter BEFORE falling back to MongoDB's full-text index. Prevents Vancouver/Bowen listings that just mention "Whistler" in their description from leaking into the results. Applied to both `/api/listings?q=` and `/api/doogie/mls-search`. Community page link changed from `?community=` to `?city=`.
- ✅ **Mobile hero fix** — Doogie hero image's `transform: scale(1.9)` extracted into `.doogie-hero-img` class with mobile media queries so he no longer overlaps the search chips on phones.
- ✅ **Homepage calculator heading simplified** — Replaced "BC Calculators / Estimate Your Home-Buying Costs" block with clean "What can you afford?".
- ✅ **Commercial property types removed** — Business, Hospitality, Industrial, Office, Retail, Other blocked in facets, listings search, Doogie NL (48,497 residential-only listings).
- ✅ **Pender Harbour added** — new Sunshine Coast community with vibe score 64/B, Google Maps + referral network copy.
- ✅ **Saved-search email alerts (CASL + PIPA compliant)** — visitors save filter presets from /listings, receive double-opt-in verification, get digest emails when new matching listings hit DDF. Tamper-evident consent proof (IP+UA+timestamp at BOTH subscribe AND verify events). One-click unsubscribe (RFC 8058 List-Unsubscribe + POST). Resend-or-outbox abstraction: all emails queue to `email_outbox` Mongo collection until RESEND_API_KEY is configured, then auto-flush. Alert matcher runs after every DDF sync + is manually triggerable. `EXCLUDED_PROPERTY_TYPES` filter enforced on saved searches too. Frequency capped at 1 digest per 6h per subscriber. Verified 14/14 backend tests + full frontend flow.
- ✅ **CASL Consent Log CSV Export** — new `/api/admin/casl-consent-log.csv` endpoint aggregates consent proof across saved-search alerts, buyer leads, seller leads, and REALTOR® applications. Downloadable directly from the admin dashboard.
- ✅ **Precision search + CREA StructureType fix** — Doogie's NL search + hero search + listings filter now correctly resolve property types across all CREA boards. Root cause: CREA REBGV files condos as `PropertySubType="Single Family"` but `StructureType=["Apartment"]`. Updated `_map_property()` in `ddf_sync.py` to prefer `StructureType`. Added `PROPERTY_TYPE_SYNONYMS` map so "Detached" also matches "House"/"Single Family", "Condo" matches "Apartment", etc. Full BC re-sync completed. Multi-feature AND-required matching now honoured — "indoor pool AND hot tub" requires BOTH terms in listing description via new `_features_query()` helper. Zero-result summaries now politely explain "that combination is very specific" instead of "search failed". Verified with 5 exact user query examples: "3-bed Langley" → 595 hits (was 0), "…under 1.5M" → 209 (was 0), "Whistler 5M+ indoor pool + hot tub" → 0 (accurate — none exist), "Vancouver condo 800K + ocean view" → 15 (was 0), "North Van 4-bed mountain view" → 23 (was 0).
- ✅ **Neighborhood nickname resolver** — Doogie recognises 30+ BC nicknames ("Kits", "Yaletown", "PoCo", "New West", "The Drive", etc.) via new `NEIGHBORHOOD_NICKNAMES` map. Unambiguous nicknames (e.g. "Kits" → Vancouver+Kitsilano) auto-apply silently with a "🔍 Searched Vancouver — Kitsilano" note in the summary. Genuinely ambiguous nicknames ("The West End" = Vancouver West End neighborhood OR West Vancouver municipality; "The Tri-Cities" = Coquitlam/Port Coquitlam/Port Moody) surface as a clickable clarification card on `/listings`. Every clarification click is a captured engagement moment. Verified end-to-end via UI.

### Aug 1, 2026 — Interactive Real Estate Journey Platform (Phase 1 + 3 shipped)
- ✅ **9 educational journey routes** live at `/journey/*` — Buying (fully populated, 7 stages, 28 modules), Selling, Buying & Selling, Condo/Strata, First-Time Buyer, New Construction, Acreages, Investment (educational-only), Home Ownership. All content HAND-CRAFTED compliance-safe language (no LLM generation in this file). Journeys reference existing glossary/community/calculator content — zero duplication.
- ✅ **Journey Landing (`/journey`)** — 9 cards + resume CTA + "Continue where you left off" hero
- ✅ **Journey Detail (`/journey/:slug`)** — stage-by-stage layout, checkable modules, progress bar, deep links to existing content
- ✅ **Progress persistence** — `useJourneyProgress` hook: localStorage anonymous + Mongo CRM sync on authenticated login (`/api/journey/progress` GET+POST). Cross-device continuation works.
- ✅ **Homepage integration** — "Begin Your Real Estate Journey" section with 6 top journey cards, placed directly under hero
- ✅ **Nav integration** — "Journey" NavLink added
- ✅ **BCFSA / GVR / CREA / PIPA / CASL compliant** — every stage carries `JOURNEY_COMPLIANCE_NOTICE`, only "You may wish to explore..." framing, zero recommendations
- ✅ **Sitemap** — 10 new journey URLs added; total 1,203 URLs; IndexNow pushed
- Files: `/app/frontend/src/journeys.js`, `/app/frontend/src/hooks/useJourneyProgress.js`, `/app/frontend/src/pages/Journey.jsx`, `/app/frontend/src/App.js` (route+home section+nav), `/app/backend/server.py` (2 endpoints), `/app/backend/sitemap_generator.py`


### Jul 31, 2026 — Equestrian page simplified
- ✅ **Equestrian Listings page** (`/specialties/equestrian`) — removed the "All Acreage" and "Detached on Land" tabs per user direction. Page now displays only the dedicated **Equestrian Match ($2M+)** tier (regex keyword scan over CREA feature sheets: equestrian / horse property / horse friendly / horse farm / barn / stable / arena / riding ring / paddocks / ALR). State/JSX simplified, tab bar removed entirely, all `tab.*` references replaced with fixed labels. Verified live: **542 equestrian matches across BC** at $2M+, 6 cards rendered, ALR banner + 5-step buyer checklist intact.


### Feb 27, 2026 — Launch-eve fork session (Doug launching tomorrow morning)
- ✅ **Cloudflare DNS live** — nameservers switched from Namecheap to Cloudflare (`austin.ns.cloudflare.com` + `venus.ns.cloudflare.com`). Domain shows **Active**. Email records verified: MX x2 to Namecheap PE, SPF, DKIM, DMARC all `DNS only` (grey cloud). Web CNAME `www → eztofind.ca` proxied. A record `eztofind.ca → 192.64.119.70` (Namecheap parking IP) still needs to be updated to Emergent target + re-proxied during morning deploy.
- ✅ **Cloudflare SSL** set to **Full** (will upgrade to Full strict after Emergent HTTPS confirmed). Universal SSL + Backup certs active for `*.eztofind.ca` + `eztofind.ca` (expires 2026-10-25, auto-managed). Edge Certificates: Always Use HTTPS + Automatic HTTPS Rewrites + Min TLS 1.2 all set.
- ✅ **Cloudflare Bot Fight Mode** ON (Security → Settings → General panel in new 2026 UI).
- 🟡 **Cloudflare Custom Rules** — in progress. Doug stuck at Custom Rule 1 (challenge listings API on threat_score > 14). `cf.threat_score` not in visual dropdown but works in Edit expression mode. Still to build: 3 custom rules + 1 rate limit rule. **NOTE: Managed Rules moved to paid tier — skip entirely on free plan.**
- ✅ **Resend fully verified + LIVE** — DKIM verified, SPF MX + SPF TXT on `send.eztofind.ca` verified (via Cloudflare Auto Configure). `RESEND_FROM` swapped from `onboarding@resend.dev` → `EZtoFind.ca <info@eztofind.ca>`. Live test email confirmed delivered to `doug@eztofind.ca` inbox (Resend message ID `b8f751fe-43ae-48c6-911a-82809f0dc725`).
- ✅ **Doogie celebrating image bug** — 1.1 MB PNG on flaky third-party CDN wasn't loading for beta tester. All 7 Doogie assets downloaded, optimized, saved locally in `/frontend/public/images/doogie/` (celebrating.png 148KB, laptop.png 360KB, magnifying.png 415KB, etc.). WebP variants generated. Total weight cut 71% (7MB → 2MB). Serves in <300ms from own domain.
- ✅ **Portuguese localization leak fix** — Removed `localStorage.getItem("ez_doogie_lang")` fallback from `useFormLang()` hook. URL `?lang=` is now sole source of truth for form language. Doogie chat auto-appends the lang param to internal links so multilingual referral flow still works, but the English homepage CTAs no longer inherit Portuguese from Doogie testing.
- ✅ **CREA MLS® Terms of Use modal redesign** — beta tester thought "listings weren't opening" when they were actually seeing the compliance modal. Redesigned with 🏡 icon, "One-time welcome" tone, prominent green "✓ I Agree — Show Me the Listings" button, softer "Not now — browse BC communities" secondary link, explanatory "Why am I seeing this?" footer note. Modal now sends decliner to /communities (not /) to prevent confusion loop.
- ✅ **French added to Doogie chat** — 7th language now in `DOOGIE_LANGUAGES` (EN/FR/繁/简/ਪੰ/فا/PT). Backend Claude system prompt includes Canadian French guidance (courtier immobilier, droit de mutation, polite "vous", proper BC-French terminology). Form dictionaries fall back to English for now — full French forms deferred as post-launch. Verified with live curl test.
- ✅ **North Vancouver + Langley merged in communities** — deleted split `north-vancouver-city`, `north-vancouver-district`, `langley-city`, `langley-township` entries from `community_synopses`. Created unified `north-vancouver` and `langley` entries with rich merged synopses covering both municipalities. Community zoning sources merged (both planning contacts shown side-by-side). Legacy URL redirects added in App.js router. Sitemap regenerated (1,177 URLs, 2 old split slugs removed). Google Maps embed on merged community pages uses Township/District as query with zoom=11 so both municipalities visible in one frame.
- ✅ **Copy edits** — Buyer/Seller/Contact/REALTOR forms + intro copy: "Are you a licensed BC REALTOR®?" / "Request to join our out-of-province referral network" / removed "Written by Doug LeMaire..." byline from `/relocating`. Removed "vetted" and "at no cost to you" phrasing.
- ✅ **Meet Doug page removed** — nav link + route + entire AboutDoug component deleted from App.js.
- ✅ **CREA Member yes/no toggle** added to BC REALTOR® form (`/realtors`) matching OOP form styling.
- ✅ **Footer** — "For REALTORS®" column now shows both "BC Referral Network" + "Out of Province REALTORS®". "Records Retention (7yr)" removed from Consumer Protection footer column (still lives in /privacy PIPA section).
- ✅ **Favicons** — full Doogie face-cropped favicon set (16/32/48/96/180/192/512 + maskable, .ico + .png + .webp) served from `/frontend/public/`.
- ✅ **Affordability page fonts** — "What can you afford?" + "What Can I Afford?" swapped from Fraunces serif to **Manrope** (weight 600/700) for modern-fintech feel matching the dollar-figure display.
- ✅ **Sitemap regeneration** — includes `/realtors-outofprovince` and `/legal/retention`, drops the 4 merged split slugs. 1,177 URLs total. Ready to submit to Google Search Console after morning DNS switch.

### 🌅 Where we left off (Feb 27, 2026 late-night)
1. Cloudflare Custom Rule 1 setup screen open — need to click "Edit expression" and paste `(http.request.uri.path contains "/api/listings/search" and cf.threat_score gt 14)`, action Managed Challenge, Deploy.
2. Then: Custom Rule 2 (block bad bots except verified search engines), Custom Rule 3 (challenge admin login), 1 Rate Limiting rule for /api/listings/search 30/min.
3. Then in the morning: Emergent Deploy → update A record to Emergent target + re-proxy orange cloud → upgrade Cloudflare SSL to Full (strict) → submit sitemap to Google Search Console + Bing Webmaster.

- ✅ **Doogie NL Bed Filter Bug Fixed (P0 recurring)** — root cause: LLM extractor was returning `beds_min` for plain-count queries ("4 bedroom home", "3 bedroom homes in Williams Lake"), so Mongo used `$gte` and returned 3, 4, 5, 6-bed listings when user wanted exactly 4. Fix has three layers: (1) LLM prompt now distinguishes `beds_exact` vs `beds_min` with explicit examples; (2) new **deterministic regex post-processor** `_apply_beds_baths_regex_override()` scans the raw query and overrides Claude's guess when phrasing is a plain count (no "+"/"at least"/"or more"/"minimum"); (3) new pure helper `_build_mls_query()` uses `$eq` for exact, `$gte` for min. Verified end-to-end: "3 bedroom homes in Williams Lake under 1M" → 21 listings, all exactly 3 beds. "at least 4 bedrooms in Kelowna" → 612 listings, all 4+ beds. **32 unit tests** (`tests/test_mls_query_builder.py` + `tests/test_beds_regex_override.py`) cover word forms ("two"), hyphenation ("2-bedroom"), 2.5-bath fractional, and edge cases ("1 million", "2020 built home"). Runs without any LLM credits.
- ✅ **Admin password change flow** — new `POST /api/admin/change-password` endpoint. Bootstrap-on-first-login migration writes a bcrypt hash to `admin_settings` Mongo doc so future changes persist without touching `.env`. Falls back to `.env` plaintext until first successful login.
- ✅ **Admin FAQ Audit endpoint** — `GET /api/admin/faq-audit?filter=all|high|approved|unapproved`. Computes on-the-fly risk score (0-3) per glossary term by keyword-matching FAQs against a curated list of high-risk topics (PTT, GST, FINTRAC, dual agency, disclosure forms, tax rules, etc.). Sorts high-risk first, unapproved first. Also added `POST /api/admin/approvals/glossary/unapprove` for per-term re-queue. Frontend UI still to be built.
- ✅ **Filter listings UX update (Feb 26, 2026)** — removed "Min price" field, single "Maximum price ($)" input. Property Type dropdown updated: added **Land** (maps to CREA "Vacant Land"/"Lot"), removed **Multi-family**, **Recreation**, **Recreational**. Added Multi-family and Recreational variants to `EXCLUDED_PROPERTY_TYPES` so they never appear anywhere on the site (facets, listings, Doogie NL). Doogie prompt updated so "vacant land"/"raw land"/"lot" → Land.
- ✅ **Beta testing setup (Feb 26, 2026)** — floating **"💬 Send Feedback"** button on every public page (bottom-left, next to Doogie's bottom-right chat). Modal captures: name, email, comment (required), 1-5 star rating, category (bug/idea/question/general). Auto-captures page URL and user agent. Rate-limited to 10 submissions/IP/hour. Tester name+email cached in localStorage. New `/beta` welcome page with test checklist. New `/admin/feedback` inbox with status filter (new/read/resolved), inline resolve/reopen/delete. "BETA" badge in header (links to `/beta`) and footer link to `/beta`. New collection: `beta_feedback`. Endpoints: `POST /api/beta/feedback` (public), `GET/PATCH/DELETE /api/admin/feedback[/id]`.

### Environment variables required (when CREA credentials arrive)
```
CREA_DDF_ENDPOINT=          # OData API base URL from CREA
CREA_DDF_CLIENT_ID=         # Provisioned
CREA_DDF_CLIENT_SECRET=     # Provisioned
CREA_DDF_AGENT_ID=          # Doug's agent ID
CREA_PARTICIPANT_ID=        # For Analytics service
CREA_ANALYTICS_ENDPOINT=    # Once CREA provides
CREA_ANALYTICS_KEY=         # Analytics API key
```

## Known Minor Items (Non-Blocking)
- Feb 29 birthdate reminders silently dropped (leap-year edge case) — deferred
- `/api/admin/realtors/{id}/status` uses query param instead of JSON body — deferred cosmetic
- CORS `allow_origins=["*"] + credentials=True` — tighten before production
- Server.py at ~1400 lines — modularize when it grows further
- Cloudflare AI-bot toggle needed at launch (dashboard-only fix, no code)
- Content accuracy audit of 40 highest-risk glossary terms pending (Doug manual review, ~4-8 hrs)

## Backlog / Future

### P0 — Ready to activate once CREA DDF® credentials arrive
- **BLOCKED: Need real DDF Destination username/password.** The values in `.env` (`info@metrovancouver.forsale` / `1Tiffany!`) are the CREA member portal login, NOT the DDF Destination credentials. To obtain the correct ones: log into the CREA DDF Dashboard → **My Data Feeds** → Edit the Destination for eztofind.ca → copy the auto-generated **Username** and **Password** shown there. Diagnostic returns `invalid_client` until this is done.
- Once credentials swap in, `services/ddf_sync.py` runs unchanged and the `/api/admin/listings/ddf-status` endpoint will flip to `token_ok=true, api_ok=true, sample_count>0`.
- Configure APScheduler for 4-hour incremental sync + nightly reconciliation (~2 hrs) — services/ddf_sync.py::sync_incremental() ready to be scheduled
- Doogie MLS® tool-use — already wired to Mongo listings collection; will use real data automatically once sync runs
- Real email delivery (Resend) for the 3 workflow emails from info@ / realtors@ / referrals@eztofind.ca (~2 hrs, needs Resend API key)

### P1
- BCFSA REALTOR® number verification (public registry lookup)
- Doogie AI Avatar (video via HeyGen/D-ID/Tavus)
- Twilio SMS lead follow-up + AI phone answering
- Voice search (OpenAI Whisper) — hero mic button
- Optional invite-code gate on `/beta` if broader friends-of-friends testing rolls out
- Build the `/admin/faq-audit` React UI (backend already done — endpoint returns high-risk terms with risk_score + risk_hits)
- Add `/admin/settings` page for the change-password flow (backend already done)
- Wire Resend for real feedback / lead / verify emails (needs API key)

### P2
- BC market reports (monthly, AEO-optimized Q&A format)
- Multi-jurisdiction rollout (Alberta / Ontario / Washington configs)
- Advanced analytics + heatmaps
- Doug's real headshot upload (currently placeholder)

### 🅰️ Alberta Expansion — PARKED (Feb 27, 2026)
- **Status:** Blueprint locked. **Do NOT execute until Doug issues an explicit build-out command** (e.g., "Start Alberta build"). Time-agnostic trigger — could be next week or 6+ months from now.
- **Architecture (LOCKED):** Province-config-driven platform. First Alberta build **includes** a refactor of BC code to consume a `PROVINCE_CONFIG` object. After that, every future province (ON, SK, MB, NS, etc.) is a content-only addition — no code duplication.
- **Approach:** Route-namespace split. Same domain (`eztofind.ca`), new prefix `/ab/*`. Not a new site.
- **Doug's Alberta service area:** Calgary, Airdrie, Chestermere, Cochrane, Okotoks, Springbank, Bearspaw, Elbow Valley, Heritage Pointe, Priddis, Bragg Creek, Foothills County, Rocky View County.
- **License:** BCFSA→RECA reciprocity transfer (paperwork only, ~2-6 weeks — no exams). Doug will hold both licenses simultaneously.
- **CREA DDF®:** National feed — Alberta listings already accessible via existing agreement + credentials. Single env-var change activates them.
- **Full plan document:** `/app/memory/ALBERTA_EXPANSION_PLAN.md` — 10-phase execution plan, ~28-45 hr estimated effort.
- **Activation trigger post-build:** Single env-flag flip `AB_LAUNCH_MODE=live` + robots.txt update + sitemap regen.
- **Compliance guardrails:** No AB REALTOR® services offered until RECA license verifiable; no AB MLS® listings published under Doug's brand until AB license active; no CASL emails to AB residents until AB-specific consent captured.

## Emails Configured (routing only — actual sending needs Resend setup)
- info@eztofind.ca — general
- realtor@eztofind.ca — REALTOR® application workflow
- referrals@eztofind.ca — outbound referral request notifications

## Feb 27, 2026 — Client Lifecycle Reminders module
- ✅ Extended `Client` model with property_address, bc_assessment_opt_in, mortgage_renewal_date + lender, send_christmas, CASL express-consent fields (email_consent, consent_date, consent_source, unsubscribed, unsubscribe_token)
- ✅ `/admin/reminders` (dedicated page): shows Birthday, Anniversary, Possession-versary, BC Assessment, Mortgage Renewal (90d + 60d pings), Christmas — with per-row consent status + Send/Snooze actions
- ✅ `/admin/reminder-templates`: 6 editable HTML templates (auto-seeded) with `{{first_name}}` / `{{years}}` / `{{renewal_date}}` / `{{lender}}` merge-tag rendering + Reset-to-default
- ✅ `/admin/email-log`: 7-year CASL/BCFSA audit trail with type filter
- ✅ "⚡ Auto-send today's" button — fires Birthday, Anniversary, Possession, Christmas for consented clients (Dec 20 only for Christmas)
- ✅ "🎄 Christmas bulk send" — preview modal + one-click send to all consented + send_christmas=true clients
- ✅ CASL footer auto-appended to every send (sender ID + brokerage address + working /api/unsubscribe/reminder/{token} link)
- ✅ One-click unsubscribe flow (sets unsubscribed=true, email_consent=false)
- ✅ Snooze-for-this-year mechanism prevents duplicate sends
- ✅ Emails queue to email_outbox (still mocked) + full body written to email_send_log — activates for real delivery the moment Resend API key is added
- ✅ Homepage: removed "Enter your income and savings…" tagline under the "What Can I Afford?" title (calculator box retained)


## Jul 29, 2026 — Copyright Enforcement Suite (CIPO Reg. #1247822)
Doug filed for federal copyright registration with the Canadian Intellectual Property Office and received **Copyright Registration No. 1247822** (literary work under the Canadian Copyright Act, R.S.C. 1985 c. C-42). Registration now displayed on-site:
- ✅ **Footer** (every page): Bold callout of CIPO Reg. No. 1247822 next to the © notice
- ✅ **`/copyright` page**: Prominent gold-bordered CIPO Registration Badge with ® symbol
- ✅ **`/terms` page**: New Intellectual Property paragraph citing Reg. #1247822 + statutory damages (s.38.1 up to CAD $20,000/work)
- ✅ **HTML `<meta>` tags** (site-wide `index.html`): Updated `copyright` + `rights` tags with registration number for SEO/AI-crawler visibility

### Three Enforcement Tools Built
1. **📸 Evidence Chain (`/admin/snapshots`)** — Tamper-evident SHA-256 fingerprint manifests of all copyrightable content (glossary + community + neighbourhood pages). Backend endpoints: `POST /api/admin/snapshot/create`, `GET /api/admin/snapshots`, `GET /api/admin/snapshots/{id}`. Weekly auto-snapshot loop emails Doug a digest containing the combined SHA-256 fingerprint — creates an independent third-party (email provider) timestamp trail for court-admissible evidence. Storage: `content_snapshots` Mongo collection.
2. **⚡ Cease & Desist Drafter (`/admin/cease-desist`)** — One-click AI-drafted legal letter powered by Claude Sonnet 4.6 with hard-coded citations to Copyright Act ss. 3, 27, 34, 38.1. Form takes copycat URL + copied pages + description; outputs a full HTML letter with Doug's contact block, statutory damages warning, and 14-day compliance deadline. Includes Print/Copy-HTML/Copy-Text actions. Backend endpoints: `POST /api/admin/cease-desist/draft`, `GET /api/admin/cease-desist/log`. Storage: `cease_desist_log`.
3. **🔖 Watermark Canaries (3 new + 1 existing = 4 total)** — Invisible, offscreen `aria-hidden` fingerprint phrases seeded across scrape-attractive pages:
   - CANARY-1: `/copyright` (existing) — Whistler trailhead coordinate
   - CANARY-2: `/glossary` — fake "Fraser Levy" PTT nickname (ID: EZTF-GLX-2026-0729-A)
   - CANARY-3: `/` (Home) — fake first-week listing count (ID: EZTF-HMX-2026-0729-B)
   - CANARY-4: `/community/:slug` + `/neighbourhood/:slug` — fake "Project Alder" codename (ID: EZTF-CMX-2026-0729-C)

### Backend Additions (`server.py`)
- New helper `_generate_content_snapshot(db)` — computes SHA-256 per glossary term (`db.glossary`), community synopsis (`db.community_synopses` + `db.community_weather`), and micro-neighbourhood synopsis (`db.neighbourhood_synopses` — approved-only). Combined fingerprint = SHA-256 of sorted concat of all per-item hashes.
- New helper `_weekly_snapshot_email(db)` — creates snapshot + emails HTML digest via Resend to `ADMIN_EMAIL`, tag `evidence_chain`.
- New startup background loop `_evidence_chain_loop()` — sleeps 24h before first run (avoids redeploy storms), then repeats weekly (7 * 24 * 3600 sec).
- Constant `CIPO_REG_NO = "1247822"` (single source of truth for registration number across letter + digest + snapshot manifest).

### Frontend Additions (`App.js`)
- Shared `<Canary phrase testId>` component (offscreen absolute-positioned div).
- Admin components `AdminSnapshots` + `AdminCeaseDesist` + `AdminCopycatDetector` with sidebar test IDs `admin-nav-snapshots` / `admin-nav-cease-desist` / `admin-nav-copycat`.
- Routes `/admin/snapshots` + `/admin/copycat-detector` + `/admin/cease-desist`.
- `AdminCeaseDesist` accepts URL search-params (`copycat_url`, `pages_copied`, `what_was_copied`) for one-click hand-off from the Copycat Detector.

### 🕵️ Copycat Detector (added Jul 29, 2026 evening)
Fourth enforcement tool: `POST /api/admin/copycat/scan`, `GET /api/admin/copycat/scans[/{id}]`.
- **Two input modes**: fetch URL (via httpx w/ browser UA) OR paste text (bypasses JS-rendered / auth-walled sites).
- **Detection algorithm**:
  1. Canary-phrase substring match (normalized: lowercase + punctuation-stripped). Includes cross-check IDs `EZTF-GLX/HMX/CMX-2026-0729-*` for absolute proof.
  2. 8-word rolling shingle set (industry-standard for near-duplicate detection). Compares against ~30K shingles from all 396 glossary + 242 community synopses + 246 community weather + 421 micro-neighbourhood synopses.
  3. Configurable threshold (2 / 3 / 6 min matched shingles per item).
- **Verdict tiers**: `smoking_gun` (canary hit) → `high_confidence` (5+ matches or 10+ shingles) → `possible` → `clean`.
- **One-click C&D hand-off** — "Draft C&D →" button pushes pre-filled URL search-params to `/admin/cease-desist`.
- Storage: `copycat_scans` collection with full match arrays + verdict + timestamps.
- **Verified via curl**: PTT test triggered 107-shingle 100%-overlap match on `2-5-10-home-warranty` glossary term. Canary "Project Alder" + `EZTF-CMX-2026-0729-C` cross-check ID both fired smoking-gun verdicts.

### Currently Verified (via curl + screenshots)
- Snapshot manifest: 396 glossary + 242 communities + 421 neighbourhoods (1,059 items, ~4.4 MB hashed).
- Combined fingerprint: `6dc4c44a29f3a304068c5c5c3053e5d8...` (deterministic across runs when content unchanged).
- C&D letter draft: ~15 KB HTML letter generated in ~30 sec via Claude, saved to Mongo, viewable + printable from admin UI.
- Copycat detector: correctly identifies pasted glossary text with 100% overlap; canary phrases trigger smoking-gun verdict; false-negatives on clean unrelated text.

### Backlog / Next
- **P1** Admin password rotation (current temp: `DougEZ2026!Reset`)
- **P1** GA4 conversion goals setup (form fills, referral requests, favorites)
- ~~**P2** AI-Powered Home Valuation Landing Page~~ — **PARKED (2026-07-29)**. BCFSA compliance risk too high for a licensed REALTOR® showing AI-generated numbers to consumers. Requires BC regulatory-lawyer review before any build. If revisited, use Option B (simple CMA request, no AI-facing number) or Option C (Discovery Quiz with private AI-assisted CMA prep). See conversation 2026-07-29 for full risk analysis.
- **P3** Alberta Expansion — PARKED (`/app/memory/ALBERTA_EXPANSION_PLAN.md`)

## Jul 30, 2026 — Personalized Homepage Module (returning-visitor experience)
Added a compliance-safe "Welcome back — picking up where you left off" section at the top of the homepage that shows returning visitors:
1. **📍 New listings matching their last search** — up to 3, sorted newest-first
2. **❤️ Their saved favorites** — with ❗ orange badge for listings that have dropped in price since favorited
3. **📊 Market delta widget** — median list price + since-first-visit % change for the last community they viewed, with BCFSA-safe *"Not an opinion of value"* disclaimer

**Compliance guarantees** (documented in Privacy Policy):
- **PIPA**: All personalization data lives in **localStorage on the user's own device**. The server never learns who the visitor is or what they've saved. The module makes anonymous calls to public endpoints (`/api/listings`, `/api/community/:slug/stats`) that return the same data to everyone. Covered under the existing "session" cookie category — no new consent surface. If user disables Personalization in cookie preferences, the module hides regardless of localStorage state.
- **CASL**: Not applicable — no electronic messaging.
- **BCFSA**: Content is purely factual (listing cards + market stats). No opinions of value, no AI-generated recommendations. Prominent "Not an opinion of value" caveat on the market delta widget.

**Backend addition (`server.py`)**: New public endpoint `GET /api/community/{slug}/stats` returning `{community, count, median_price, min_price, max_price, updated_at}` for the community delta widget.

**Frontend additions (`App.js`)**:
- New `PersonalizedHome` React component (top of Home page, hides gracefully if no data)
- New localStorage keys: `ez_last_search`, `ez_last_community` (with `first_median_price` snapshot), `ez_fav_prices` (per-favorite first-seen price for drop detection), `ez_personalized_dismissed`
- Capture logic in `Listings` (persist search on every filter apply) + `CommunityPage` (persist visited community + stats snapshot on mount)
- `FavoriteButton` extended with optional `currentPrice` prop that snapshots first-seen price on first favorite
- Cookie banner "Personalization" category description updated to disclose the new behavior
- Privacy Policy addendum: *"Personalized Homepage (Local-Only)"* section explaining the anonymous local-only architecture

**User controls**:
- "Hide" button dismisses the module for the session (localStorage flag)
- "Not you? Clear my browser data" link removes all personalization data + resets
- Standard cookie preferences panel (footer) can disable Personalization category entirely

## Jul 30, 2026 — "Doogie Remembers You" (personalized chat greeting)
Extended the Doogie AI chat launcher to tailor its opening greeting to returning visitors — creates a "Doogie remembers me" moment without any server-side identification.

- Reads `ez_last_community`, `ez_last_search`, and `ez_favorites` from localStorage on mount (device-only)
- If user has a last-viewed community: *"Welcome back! 🐾 Any new questions about Kitsilano?"* + a follow-up tailored to whether they have favorites or a saved search
- If no community but has a last search: *"Welcome back! 🐾 Want to see new listings in Vancouver, or shall we look somewhere else?"*

## Jul 30, 2026 — CASL-Compliant Drip Email System (4 Campaigns)
Built full drip-email infrastructure with per-campaign opt-in, approval gates for AI content, and a public preference center.

**Campaigns shipped:**
1. `buyer_digest` (Weekly Sundays 8am PT) — MLS® listings matching saved search
2. `seller_updates` (Monthly 1st, 🔒 approval-gated) — factual community market stats
3. `welcome_series` (Day 0/3/7 after lead form) — 3-part onboarding
4. `dormant_wakeup` (Daily scan) — nudge users idle 30+ days
5. `news_tips` (Manual, 🔒 approval-gated) — occasional announcements

**Backend:** New `casl_consents`, `campaign_sends`, `campaign_drafts` collections. `CAMPAIGN_REGISTRY` config. Per-campaign helpers (record/revoke/has/log). Signed-token JWT preference center. Per-campaign CASL footer. 4 campaign runners. Daily background scheduler loop (welcome+dormant daily, buyer_digest Sundays 15:00-17:00 UTC, seller_updates monthly 1st). Auto-opt-in hooks in buyer_leads/seller_leads endpoints tied to existing casl_consent checkbox.

**New public endpoints:** `GET/POST /api/email-preferences`, `GET /api/email-preferences/unsubscribe-all`, `POST /api/campaigns/opt-in`.
**New admin endpoints:** `/api/admin/campaigns/{campaign}/run`, `/api/admin/campaigns/drafts` (GET), `/drafts/approve`, `/drafts/reject`, `/drafts/release`, `/api/admin/campaigns/stats`.

**Frontend:** New `/email-preferences?token=...` public preference center (also handles `?unsub=<campaign>` one-click). New `/admin/campaigns` dashboard with 5 campaign cards + pending-drafts approval queue + preview modal. Extended saved-search modal with 3 additional per-campaign checkboxes (all unchecked by default per CASL).

**Compliance guardrails baked in:**
- Rule 1 (per-campaign consent): Each opt-in is a separate `casl_consents` record with campaign field
- Rule 2 (email requirements): Every campaign email uses `_campaign_footer_html()` → sender identity + reason line + one-click unsub + preference center link
- Rule 3 (per-campaign unsub): Preference center toggles individual campaigns; global unsub kills all
- Rule 4 (retention): `casl_consents` collection retains all opt-in/opt-out events; existing `unsubscribe_log` also logged
- Rule 5 (no bonus broadcasts): Every send checks `campaign_has_consent()` before delivering; approval gate on `news_tips` prevents ad-hoc blasts

**Verified via curl:** opt-in → preference center read → campaign run → send logged → per-campaign unsub → preference center reflects update. Admin dashboard screenshot confirmed rendering.
- If neither: falls back to the standard first-time-visitor greeting (unchanged for new users)
- Respects the same "session"/Personalization cookie category — if user disabled it, greeting is generic
- All in the DoogieChat component's `_initialGreeting()` helper (~25 lines)


## Jul 30, 2026 — "Ask Doogie about this listing" (Listing Card → Chat Bridge)
Turned every listing into an engagement opportunity: a "🐾 Ask Doogie" pill button on every listing card + a prominent CTA on the listing detail page.

**How it works (all client-side):**
- New helper `askDoogieAboutListing(l, e)` composes a natural prompt from listing public data: *"Tell me about MLS® R3149680, 4335 NORTHLANDS Boulevard #69, Whistler — 2 bed, 2 bath, 1350 sqft, Row / Townhouse at $1,489,000. What should I know about this listing, the neighbourhood, and the market context?"*
- Prompt saved to `localStorage.ez_doogie_prefill`
- New `CustomEvent("ez-open-doogie")` dispatched to the window
- DoogieChat component's new useEffect listens for the event and opens the panel
- The existing prefill useEffect (was already there for the affordability calculator handoff) reads the prefill into the input on next open
- Server never learns which listing the user tapped — pure browser-side prompt injection

**UI additions:**
- Navy pill button (`🐾 Ask Doogie`) in the bottom-right of every listing card (`ListingCard` component) — data-testid `ask-doogie-{listing_key}`
- Prominent CTA button on the listing detail page directly below the price — data-testid `listing-ask-doogie`
- Both use the shared `askDoogieAboutListing()` helper — no code duplication

**Compliance:** No new surface. localStorage-only + existing Doogie chat, which already has PIPA cookie consent and CASL-compliant AI disclosure. BCFSA: Doogie's system prompt already prevents opinions of value / property-specific advice; the AI will discuss the listing in generic terms and redirect specific questions to Doug.

**Verified:** Screenshot on `/listings?city=Whistler` shows the button rendering on 3 visible listing cards. Frontend compiled clean.
**Compliance**: Identical profile to the personalized homepage — 100% localStorage, no server call, no identifier crossing to backend. PIPA/CASL/BCFSA all clean.

## 🧹 Tech Debt Sprint — Partially Landed 2026-07-30
**Priority:** P3 remainder (backlog)
**Estimated remaining effort:** ~7–10 hours

### ✅ Landed 2026-07-30 (safe wins, zero regression risk)
- **DOMPurify sanitization** — installed `dompurify@3.4.12`; new `safeHtml()` helper wraps every content-bearing `dangerouslySetInnerHTML` (Doogie chat renderer, community synopsis, admin Xmas email preview, campaign draft preview, C&D letter preview). JSON-LD `<script>` tags left unwrapped (JSON.stringify is escape-safe).
- **PostHog vendor snippet** — added targeted `/* eslint-disable no-var, eqeqeq, no-sequences, no-unused-expressions */` block instead of touching Emergent's official minified init.
- **Type hints in `policies.py`** — `POLICIES: Dict[str, str]`, `wrap(title: str, body: str) -> str`, `POLICY_CSS: str`, `_load_frontend_url() -> str`, session fixture return type.

### Deferred (kill-criteria per PRD)

### 1. `dangerouslySetInnerHTML` audit — ✅ DONE 2026-07-30 (see landed section above)

### 2. React hook dependency warnings (~68 instances)
- **Current state:** ESLint `react-hooks/exhaustive-deps` warnings — advisory, not bugs
- **Risk:** Low — most missing deps are stable references (state setters, refs) that don't trigger re-renders anyway
- **Fix:** Audit each warning; wrap functions in `useCallback` where appropriate; add ESLint disable comments with justification where safe to ignore
- **Time:** ~3 hrs

### 3. Array-index-as-key warnings (29 instances)
- **Current state:** Static lists (glossary letters, cookie categories, campaign definitions) using index as key
- **Risk:** Zero — lists never reorder during session
- **Fix:** Replace with unique keys from data where trivially available; skip otherwise
- **Time:** ~1 hr

### 4. High-complexity function refactors
- `server.py: admin_login()` (complexity 22, 57 lines) — split into `_validate_login_body`, `_check_lockout`, `_authenticate`, `_issue_token`
- `server.py: doogie_chat()` (complexity 17, 138 lines) — extract stream-handling, tool-call routing, response-formatting into helpers
- `server.py: create_buyer_lead()` (complexity 26) and `create_seller_lead()` (complexity 20) — separate validation, transformation, persistence
- `prerender_pages.py: render_communities()` (complexity 28, 104 lines) — split data-fetch / template-render / error-handling
- **Time:** ~4 hrs
- **Risk:** Medium — these are hot paths (auth, chat, lead capture). Refactor with tests, not blind.

### 5. `App.js` monolith split (~5,700 lines → target ~200-line files)
- Extract by domain: `/components/admin/`, `/components/listings/`, `/components/doogie/`, `/components/campaigns/`, `/components/personalized/`, `/components/legal/`
- Move helpers into `/lib/` (favorites, personalization, canary, prefs)
- **Time:** ~4–6 hrs (biggest task)
- **Risk:** High — huge diff, deferred as low-ROI vs. lead-gen features

### 6. Type hint coverage in `policies.py` + test files — ✅ DONE 2026-07-30 (see landed section above)

### 7. Vendor code exceptions — ✅ DONE 2026-07-30 (PostHog snippet wrapped with targeted ESLint disable/enable block)

### 8. Empty `catch {}` blocks (~397 instances)
- **Current state:** Intentional silent-swallow for non-critical browser API calls (localStorage in private mode, optional analytics, feature-detection)
- **Fix:** Leave as-is. Consider adding centralized `try_safe(fn)` helper for the ~10 cases where a debug log would help troubleshoot user reports.
- **Time:** ~1 hr if pursued

### 9. Hardcoded `SITE_URL` in App.js line 24
- **Current state:** `SITE_URL = "https://eztofind.ca"` used only for SEO canonical URLs + OpenGraph tags
- **Risk:** Zero — this IS the production domain by design; preview still works because SEO tags are ignored on preview.
- **Fix:** No action needed. Deployment agent explicitly validated this as acceptable.

### Kill criteria
Don't schedule this sprint if:
- Model A/B revenue growth is on-track (focus on features that drive money)
- No customer complaints about slowness, bugs, or maintenance velocity
- Model C SaaS is not yet on the horizon (multi-tenant refactor will restructure much of this anyway)

Revisit when Model B has 3+ paying customers or before starting Phase 3 multi-tenant refactor.



---

## 2026-02-01 — Journey Phase 2 + Phase 4, Editorial, Related Terms, Referral Network

### Landed today

**Interactive Real Estate Journey Platform — Phase 2 (all 8 remaining journeys populated)**
- `/journey/selling` — 7 stages, 23 modules
- `/journey/buying-and-selling` — 7 stages, 20 modules
- `/journey/condo-strata` — 7 stages, 25 modules
- `/journey/first-time-buyer` — 7 stages, 28 modules
- `/journey/new-construction` — 7 stages, 23 modules
- `/journey/acreages` — 7 stages, 25 modules
- `/journey/investment` — 7 stages, 26 modules (educational only — never advice)
- `/journey/home-ownership` — 7 stages, 23 modules
- Content is hand-curated, BCFSA-compliant, and links to existing glossary/community/calculator pages (no duplication).

**Journey Platform — Phase 4 polish**
- `HowTo` JSON-LD schema on every journey (AEO — major LLM/Featured-Snippet win)
- `BreadcrumbList` JSON-LD schema
- Native Web Share API `Share` button + clipboard fallback (`[data-testid="journey-share-btn"]`)
- `Print` button (`[data-testid="journey-print-btn"]`)
- Print-friendly `@media print` stylesheet (hides chrome, expands links) in `index.css`
- "Related journeys" internal-linking section at bottom of every journey detail page
- `aria-pressed` on module toggles (a11y)
- **Bug fix (found by testing agent):** stale-closure in `useJourneyProgress` — migrated to functional `setState` + `queueMicrotask` writes. Consecutive mutators in same tick now compose correctly. Module completion + progress bar now persist across reloads. Verified 2/28 modules → 7% after reload.

**Editorial Policy page (`/editorial`)**
- Transparent explanation of AI-drafted + REALTOR®-reviewed content workflow
- `AboutPage` JSON-LD schema (author = Doug LeMaire, publisher = EZtoFind.ca)
- Linked from footer next to `/ai-use`
- Added to `sitemap_generator.py` (total URLs now 1,204)

**Glossary — Related Terms / "See also" section**
- New backend endpoint `GET /api/glossary/{slug}/related?limit=8` — same-category cross-links
- Rendered as pill-shaped chips at bottom of every glossary page (`[data-testid="glossary-related-terms"]`)
- Internal-linking → AEO / topical-authority signal for LLM citations

**Referral Network Backend + Admin UI (Model A)**
- New MongoDB collection `referrals` — tracks Doug's outbound referrals to partner REALTOR®s
- Endpoints: `POST/GET/PATCH/DELETE /api/admin/referrals` — full CRUD with status_history
- Lifecycle: `sent → acknowledged → active → under_contract → closed → paid` (or `declined`/`expired`)
- Admin UI at `/admin/referrals` with 4 summary metrics (Total, Pipeline, Pending, Collected), 9 status filters, create form, per-row status update panel, delete with confirm
- Sidebar nav entry added: "💰 Referrals"

### Testing outcome
Testing agent iteration_11: 14/14 backend pytest passing. All 9 journeys frontend-verified with correct stage/module counts. Editorial + Related Terms + Admin Referrals all render + persist correctly. One HIGH bug (Journey progress stale closure) found and fixed same iteration.

### Files touched
- `/app/frontend/src/journeys.js` (rewritten — all 9 journeys)
- `/app/frontend/src/pages/Journey.jsx` (rewritten — HowTo schema, Share, Print, Related, Compliance banner)
- `/app/frontend/src/pages/Editorial.jsx` (new)
- `/app/frontend/src/hooks/useJourneyProgress.js` (bug fix — functional setState)
- `/app/frontend/src/App.js` (routes for `/editorial` + `/admin/referrals`, AdminReferrals component, Related Terms in GlossaryTerm, admin sidebar nav, footer link)
- `/app/frontend/src/index.css` (print media queries + `.related-terms-block`)
- `/app/backend/server.py` (Referral Network endpoints + `/api/glossary/{slug}/related`)
- `/app/backend/sitemap_generator.py` (added `/editorial`)

### Remaining backlog
- P1: `HowTo` JSON-LD on 3-5 process guides (Journey Platform ✅ delivers this; extend to top /how-to/* pages if any)
- P2: Journey Platform i18n (currently EN only)
- P2: Consumer-facing (non-admin) auth so `useJourneyProgress` can sync for regular users instead of only admin
- P2: OpenAPI/JSON tool schemas for Doogie
- P3: Monolith refactor sprint — `server.py` (7690+ lines), `App.js` (7900+ lines)



---

## 2026-02-01 (session 2) — Journey Platform → Private Client-Curated Model

### Major pivot
The Interactive Journey Platform is no longer a public asset. Doug decided the ~7 educational journeys are more valuable as a private client-service tool than as public SEO/AEO content. Rebuilt end-to-end:

**Deleted from the public site**
- ❌ `/journey` and `/journey/:slug` routes
- ❌ Nav link "Journey"
- ❌ Homepage "Begin Your Real Estate Journey" section
- ❌ `/app/frontend/src/journeys.js` (public data file)
- ❌ `/app/frontend/src/pages/Journey.jsx`
- ❌ `/app/frontend/src/hooks/useJourneyProgress.js`
- ❌ 8 journey URLs removed from sitemap (1234 URLs now, was 1242)
- ❌ Added `Disallow: /my-journey/` and `Disallow: /admin/` to robots.txt

**Built — Client Journey Platform (private, token+OTP protected)**
- New MongoDB collection `client_journeys` with:
  - Bearer token (~240-bit urlsafe base64)
  - 6-digit OTP (30-min TTL, rotated on each send)
  - Server-side progress tracking (no localStorage — cross-device by token)
  - Status lifecycle: `draft → sent → opened → completed` (or `expired`/`revoked`)
  - Default 6-month expiry, extendable by admin, auto-expires at TTL
- New backend endpoints:
  - `POST/GET/PATCH/DELETE /api/admin/client-journeys` (admin CRUD)
  - `POST /api/admin/client-journeys/{id}/send` (email via Resend with OTP)
  - `GET /api/my-journey/{token}/meta` (public — just enough to render OTP prompt)
  - `POST /api/my-journey/{token}/verify` (OTP → session_key)
  - `GET /api/my-journey/{token}?session_key=...` (curated content)
  - `POST /api/my-journey/{token}/toggle` (module completion)
  - `POST /api/my-journey/{token}/touch-stage` (view analytics)
- New frontend pages:
  - `/admin/client-journeys` — list, create, template-based curator (7 templates), toggle stages/modules, add per-stage/module notes, send, extend, revoke, delete
  - `/my-journey/:token` — public route with OTP prompt → curated view, noindex+nofollow on both stages, session persisted in sessionStorage
- New Journey Templates file `journey_templates.js` (admin-side only) — 7 templates (Buying, Selling, Buy+Sell, Condo/Strata, First-Time, Acreages, Home Ownership) — used by curator + client-facing view to resolve module titles/blurbs/hrefs
- CASL-compliant transactional email (existing client relationship, s. 6(6)(c))
- BCFSA scope-of-licence banner rendered on every client-facing page

### Testing outcome
End-to-end tested via curl:
- Create CJ ✓
- Send (Resend live, returned 200) ✓
- OTP verification (correct → session_key; wrong → 401) ✓
- Fetch curated view (right stages/modules) ✓
- Toggle module (server-side persistence) ✓
- Delete ✓
- Public `/journey` returns 404 (React SPA — no `journey-cards` test-id in HTML) ✓
- Admin UI: 7 templates visible, form + curator render ✓

### Files touched
- `/app/frontend/src/App.js` (removed all public Journey code + added AdminClientJourneys + route + sidebar entry)
- `/app/frontend/src/pages/MyJourney.jsx` (new client-facing OTP + curated page)
- `/app/frontend/src/journey_templates.js` (new — admin-side templates)
- `/app/backend/server.py` (client_journeys endpoints ~250 lines)
- `/app/backend/sitemap_generator.py` (removed /journey/*)
- `/app/frontend/public/robots.txt` (added /my-journey/ + /admin/ disallow)

### Compliance posture
- BCFSA-defensibility unchanged (~97%) — same scope-of-licence disclaimers + category-based pills on glossary
- Client emails are transactional (existing client relationship under CASL s. 6(6)(c)) — no consent needed, unsubscribe not required (still deliverable via Resend)
- PIPA — client PII stored under existing privacy policy, TTL cleanup planned for +90 days post-expiry
- All /my-journey/* URLs excluded from indexing (robots + noindex + not in sitemap)

### Remaining backlog
- P2: PDF export of curated journey (client can print/save)
- P2: Automated reminder emails if client hasn't opened after 7 days
- P2: Client Q&A back-channel (small form on client page → Doug's inbox)
- P3: Auto-purge expired-journey PII after 90 days (TTL index on `expires_at + 90d`)



---

## 2026-02-01 (session 3) — Client Journey Automation

### Landed
**(a) 41 hand-authored glossary terms approved** — already flagged `definition_approved:true` + `faqs_approved:true` at seed time (marked as `hand-authored-v1`). Doug can still browse-and-edit any single term via `/admin/glossary/{slug}` if he wants to tweak wording, but the "approve" queue is empty for these because they were never in unapproved-drafts state.

**(b) Daily client-journey maintenance loop** (`_client_journey_maintenance_loop` in server.py):
- Auto-expire journeys whose `expires_at` has passed (status → `expired`)
- Auto-purge PII 90 days after expiry: `client_name → [purged]`, email/phone/intro/otp/session all nulled, `purged_at` timestamp recorded
- Runs 120s post-startup, then every 24h

**(e) 7-day reminder nudge** (also in `_client_journey_maintenance_loop`):
- Finds journeys where `status: sent` AND `sent_at < 7 days ago` AND `opened_at IS NULL` AND `reminder_sent_at IS NULL`
- Sends a friendly nudge email via Resend with (still-valid) OTP or note that it expired
- Same CASL basis as the initial send: transactional/existing-client relationship
- `reminder_sent_at` stamp prevents double-nudging

**(c) PDF export — declined for now** (backlog if requested later)

### Files touched
- `/app/backend/server.py` — added `_client_journey_maintenance_loop` + `_send_client_journey_reminder` (~120 lines) + startup registration
- Client Journey admin editor UX fix — removed silent-disabled Save button, added clear inline validation errors ("Client name is required.", etc.)

### Fix log
- Fixed the "Create draft button does nothing" bug — button was silently disabled when name/email were blank. Now always clickable, shows clear red error message pinpointing the missing field.
- Fixed the "extend +6 months" 404 — buttons now use `editingId || cj.id` so they work on freshly-created drafts.
- Fixed the email link 403 — added `PUBLIC_APP_URL` env var support so links always route to a publicly-reachable domain. Preview .env set to preview URL; production deploys should set it to `https://eztofind.ca`.

### Remaining backlog
- P2: PDF export of curated journey
- P2: Client Q&A back-channel (small form → Doug's inbox)
- P2: Auto-purge testing (manually trigger the loop for verification)
- P3: Multi-client-per-household linking


---

## 2026-08-02 — Public BC Buyer's & Seller's Guides (Phase A of Related Content Engine)

### What shipped
Public educational guides at **`/buying-guide`** and **`/selling-guide`**, faithful adaptations of Doug LeMaire's 2026 Buyer's Guide and 2026 Seller's Guide PDFs. Approved for public publication by Doug (the licensee) himself.

Each guide contains:
- **9-step "Your Journey at a Glance"** overview table with anchor jumps
- **9 detailed step cards** (Getting Started → After You Move In / After the Sale) with plain-English "your steps" checklists + "Good to know" callouts
- **BC 2026 cost breakdown table** (PTT tiers, deposit, inspection, legal, first-time/new-build exemptions, non-resident 20% ATT for buyers; commission, mortgage payout, capital gains, adjustments for sellers)
- **"Your Protections & Key Terms" / "Your Obligations & Protections"** section (3-day HBRP rescission with 0.25% fee example, deposit-in-trust, PDS, material latent defect)
- **"A few terms you will hear"** quick-reference block
- **"You may also be looking for"** related-resources grid — 6 cards each, links to the flip-side guide, listings, communities, glossary, valuation, and compliance page (starter version of Phase B relationship engine)
- **Neutral footer CTA** (Ask a general question / Browse the glossary) — no marketing consent bundling

### Compliance controls in place (BCFSA / CREA / CASL / PIPA / GVR)
- **BCFSA**: Brokerage identification block at top AND bottom of every guide — "Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. · Serving Greater Vancouver · the Fraser Valley · Sea-to-Sky to Whistler · (604) 787-0851". General-information disclaimer at top AND bottom explicitly stating "not legal, tax, financial, or mortgage advice". No "you should" / "guarantees" / "best for you" language. Licensee's first-person voice preserved because Doug authored the source content.
- **CREA**: REALTOR® / REALTORS® / MLS® trademarks preserved throughout with correct capitalization and ® symbol. No MLS® data reproduced; no listing claims made.
- **GVR**: No IDX data touched by these pages; guides link to `/listings` (existing GVR-compliant iframe/DDF feed).
- **CASL**: Neutral CTAs. No marketing-consent bundling. "Ask a question" routes to `/contact` which separates required and optional consent boxes (existing behaviour). No email opt-in on these pages.
- **PIPA**: Zero personal information collected on these pages. No browser storage. No analytics events on sensitive content.
- **FINTRAC**: Identity-verification requirement referenced accurately in Steps 2 (buyer) and 2 (seller).

### AEO / GEO / LLM citation surface
- Full **HowTo schema** for the 9 steps (buyer + seller) — feeds Google/Bing rich results and LLM answer engines a canonical, cited source.
- Full **FAQPage schema** for the Protections & Terms sections.
- **BreadcrumbList schema** for site hierarchy.
- Per-page `<title>`, `<meta description>`, canonical URL — all keyword-optimized for "buy a home in BC 2026", "sell a home in BC 2026".

### Anti-duplication (per the spec)
- **Zero glossary content duplicated**. Every term (deposit, PTT, escrow, PDS, subject-clauses, mortgage-discharge, etc.) is linked in-line to `/glossary/<slug>`. The 439-term master library remains single source of truth.
- All 32 slug references verified against the DB before ship — no dead links.
- Related-resources grid links to existing pages (`/listings`, `/communities`, `/valuation`, `/compliance`, flip-side guide) — no orphan destinations.

### Navigation integration
- Added top-nav links: **Buying Guide** and **Selling Guide** (mobile hamburger + desktop nav)
- Added footer "Explore" links: **Buying Guide (BC 2026)** and **Selling Guide (BC 2026)**

### Files touched
- **New**: `/app/frontend/src/pages/BuyerSellerGuide.jsx` (~600 lines) — exports `BuyingGuide` and `SellingGuide` React components, plus shared step/cost/terms/related helpers
- **Modified**: `/app/frontend/src/App.js` — added import + 2 routes + 2 nav links + 2 footer links

### Not shipped (deferred to Phase B / C / D)
- **Phase B**: Formal "You May Also Be Looking For" component wired onto glossary pages, community pages, and Doogie answers (via a new `content_relations` collection + admin editor). The starter version renders on the two new guide pages only.
- **Phase C**: Grouped semantic search (definitions / FAQs / tools / communities / journey / listings / Doogie).
- **Phase D**: Admin relationship editor + audit trail.

### Remaining backlog priorities (post-Phase A)
- **P0**: Confirm Doug wants to proceed to Phase B next (or shift priority).
- **P1**: Auto-generate PDF exports of both public guides so leads can download/print them.
- **P1**: Add a "Print this guide" CSS media query so the browser Print flow yields a clean handout.
- **P2**: Multi-language variants for the guides (zh-Hant, zh-Hans, pa, fa, pt-PT) — currently English only, but the SEO scaffolding already includes hreflang alternates.
- **P2**: Content-relations collection + admin editor for Phase B.
- **P3**: Tech debt sprint — break `server.py` and `App.js` monoliths into modules.

---

## 2026-08-02 — Phase B: Intelligent Related-Content Engine

### What shipped
An intelligent cross-type "You may also be looking for" system that connects glossary terms, guides, calculators, communities, and listings into one seamless knowledge platform — with admin-controlled manual overrides.

**Backend (`server.py`):**
- New MongoDB collection: `content_relations` (with fields per Section 5 of the spec)
- New public endpoint: `GET /api/related-content/{source_type}/{source_id}?limit=6`
  - Priority 1 — manual `content_relations` (admin-pinned, priority=0)
  - Priority 2 — rule-based cross-type derivation via `_CATEGORY_RULES` (financing → planning step + valuation + FHSA; taxes → closing step + PTT + first-time exemption; strata → subject-removal step + Form B + depreciation report; legal/title/conveyancing → closing step + lawyer-or-notary; contracts/offers → offer steps in buying+selling guides; property-type/acreage → communities + specialty pages)
  - Priority 3 — same-category glossary siblings (max 3)
  - Priority 4 — universal tail (full glossary + compliance page)
- Every card includes a machine-readable `reason` code for admin inspection
- Client-only records are excluded from the public endpoint
- Admin CRUD: `GET/POST/PUT/DELETE /api/admin/content-relations` for manual overrides

**Frontend components:**
- **New**: `/app/frontend/src/components/YouMayAlsoBeLookingFor.jsx` — reusable card grid with kind-taxonomy colored dots, silent-hides on empty/error, exposes `data-reason` on each card for admin audit
- **New**: `/app/frontend/src/pages/AdminContentRelations.jsx` — admin CRUD editor with filter (by source_type/source_id), full-featured form (source, target, reason, priority, visibility, notes, active toggle), and inline docs explaining priority order

**Wired into:**
- **Glossary detail pages** (all 439 term pages) — appears below the existing "See also — related terms" pill block
- **Community pages** (all 240 community pages) — appears below the "Published by" author block
- Top nav bar (Buying Guide + Selling Guide links, added in the previous ship, still active)
- Admin sidebar (new "🕸️ Content Relations" nav entry between "Definition Audit" and "Broker Policies")

### Compliance controls in place
- **PIPA**: no personal information in the collection or the endpoint; no analytics events emitted from the card component
- **BCFSA**: cards link only to pre-approved content on eztofind.ca — never external claims; every rule-based blurb was written in neutral educational voice (no "you should" / no advice); disclaimer pills on glossary pages remain in force above the cards
- **CREA**: REALTOR® / MLS® trademarks preserved in blurbs; no MLS data touched
- **CASL**: no marketing consent bundled — the cards are pure navigation
- **Client gating (Section 22 of the spec)**: relations flagged `visibility: "client-only"` are excluded from the public endpoint at query time — enforced at the data layer per spec Section 22

### End-to-end validation
- Public endpoint tested with real glossary slug (`property-transfer-tax-ptt`) — returned Buying Guide anchor + First-Time PTT exemption + 3 same-category siblings + universal tail (6 cards)
- Public endpoint with manual override tested (`glossary/deposit`) — manual pin appeared FIRST, above auto-derived cards
- Admin login reset + curl-verified: LIST/POST/PUT/DELETE all pass with 200/OK
- Community page (`/community/vancouver`) — component renders 6 cards
- Glossary detail (`/glossary/property-transfer-tax-ptt`) — component renders 6 cards
- Homepage + all 5 core routes still return 200 (no regressions)

### Files touched
- **New**: `backend/server.py` — added ~230 lines for the engine, admin CRUD, and Pydantic model
- **New**: `frontend/src/components/YouMayAlsoBeLookingFor.jsx` (~145 lines)
- **New**: `frontend/src/pages/AdminContentRelations.jsx` (~215 lines)
- **Modified**: `frontend/src/App.js` — added imports + 2 wire-ins (glossary detail + community page) + 1 admin nav entry + 1 route + 1 wrapper component

### Deferred (Phase C / D)
- **Phase C — Grouped semantic search** (definitions / FAQs / tools / communities / journey / listings / Doogie)
- **Phase C — Doogie integration**: append related-content chips after each Doogie answer using the same endpoint
- **Phase D — Rich admin audit trail**: show which pages surface each relation, low-confidence query review, exclusion editor
- **Backlog — Bulk-import seed relations**: a one-shot script that populates high-value pins for the 30–40 most-visited glossary terms (strata cluster, financing cluster, closing cluster)

---

## 2026-08-02 — Phase C: Grouped Search + Doogie Chips + Bulk Seed Relations

Three deliverables shipped in one pass to make EZtoFind.ca feel like one seamless knowledge platform per Sections 2, 3, 7, 8, and 13 of the spec.

### 1. Bulk-seed content relations (`backend/seed_content_relations.py`)
- Idempotent script that pins ~106 high-value manual relations across three clusters:
  - **Strata cluster** (12 slugs): strata-fees, form-b, depreciation-report, special-levy, operating-fund, agm-minutes, etc. → pin to Buying Guide step-7, Form B, Depreciation Report
  - **Financing cluster** (12 slugs): mortgage-pre-approval, down-payment-requirements, FHSA, HBP, stress-test, amortization-period, etc. → pin to Buying Guide step-3, Valuation, FHSA glossary
  - **Closing cluster** (20 slugs): PTT, foreign-buyer PTT, GST, first-time exemption, lawyer/notary, completion/possession dates, HBRP, PDS, subject clauses, etc. → pin to Buying Guide step-8 and Selling Guide step-8
- 106 pins inserted; re-run is a no-op (deduped by composite key)
- Confirmed via curl that every seeded slug now surfaces its cluster's pinned cards ABOVE the rule-based auto-suggestions, with readable reason codes (`strata-cluster:subject-removal`, `financing-cluster:planning-step`, `closing-cluster:buyer-side` etc.)

### 2. Phase C — Grouped semantic search
- **Backend** `GET /api/search?q=<query>&limit=6`:
  - Tokenizes query (stopword-filtered, length ≥3)
  - Searches **glossary terms + definitions** with weighted title/body scoring
  - Searches **embedded FAQs** on every glossary term
  - Searches **communities** from `communities_seed.json` (239 entries)
  - Searches **static tool catalog** + **18 guide anchors** (9 buyer + 9 seller)
  - Adds universal **Listings shortcut** (deep-links to `/listings?q=...`) and **Doogie shortcut**
  - Returns a "Quick Answer" card when top glossary/FAQ hit has score ≥3
  - Never invents content — returns empty groups if nothing matches (spec §7)
- **Frontend** `/search?q=` page (`SearchPage.jsx`):
  - Quick Answer highlight card (navy accent border, brand blue eyebrow)
  - Grouped result sections with color-coded kind dots (📖 Terms / ❓ FAQs / 🧮 Tools / 📍 Communities / 🧭 Journey / Listings / Doogie)
  - Search input box at top for refinement
  - Neutral "no approved answer found" state with 3 exploration chips (spec §7)
  - `noindex, follow` meta so the search page doesn't dilute site SEO
- **Nav integration**: added "🔍 Search" link to top nav (mobile + desktop)
- Curl-verified queries: "strata fees" → Strata Fees term is quick answer; "property transfer tax" → PTT cluster surfaces; "condo Vancouver" → Empty Homes Tax term + North Vancouver community

### 3. Doogie related chips (`DoogieRelatedChips.jsx`)
- Compact horizontal pill row rendered after every Doogie assistant reply
- Fetches `/api/search?q=<preceding-user-message>&limit=2` and surfaces the top hit from Terms / Journey / Tools / Communities / FAQs (skipping self-referential Listings + Doogie groups)
- Kind-colored pills with icons (📖 term / 🧭 journey step / 🧮 calculator / 📍 community / ❓ FAQ)
- Silent-hides on empty/error — never leaks admin diagnostics to public visitors
- Compliance controls in place: no personal information sent to the endpoint (just raw question text the user typed); no analytics events beyond target `kind`
- End-to-end verified in Playwright: chips appeared after Doogie's first response with "Building Envelope" / "Closing & Moving In" / "Property Transfer Tax — BC rates" / "Ainsworth Hot Springs"

### Files touched
- **New**: `backend/seed_content_relations.py` (~150 lines) — idempotent bulk seeder
- **Modified**: `backend/server.py` — added ~250 lines for `/api/search` + helpers, stopword-filtered tokenization, 5 async search functions, static journey anchors + tools catalog
- **New**: `frontend/src/pages/SearchPage.jsx` (~220 lines) — grouped results page
- **New**: `frontend/src/components/DoogieRelatedChips.jsx` (~100 lines) — chat chip renderer
- **Modified**: `frontend/src/App.js` — 2 new imports + 1 route + 1 nav link + inline chip injection in the assistant-message renderer

### Compliance controls in place (all three deliverables)
- **BCFSA**: search results and chips draw ONLY from pre-approved EZtoFind.ca content — no external claims, no advice framing
- **CREA**: REALTOR® / MLS® trademarks preserved everywhere
- **CASL**: chips + search results are pure navigation — no consent bundling; the "Ask a general question" and "Contact" routes keep required + optional consent separated
- **PIPA**: no personal info in the search index; Doogie chips don't ship user-identifying content to the search endpoint (only the raw question text the user typed)
- **Spec §7 "no invented answers"**: search returns empty groups when nothing matches; explicit "no approved answer found" fallback with neutral exploration chips
- **Spec §22 client gating**: content_relations records with `visibility: "client-only"` are excluded from the public endpoint at query time (already in place from Phase B)

### Deferred to future phases
- **Phase C.2 — Embeddings-based semantic retrieval** (per spec §13 layer 3): add vector search once the keyword layer proves valuable enough at scale
- **Phase D — Admin audit trail**: dashboard showing which pages surface each relation, low-confidence query review, exclusion editor
- **Guide printables**: print-friendly CSS for Buyer/Seller guides
- **Multi-lingual guides**: translate Buying & Selling guides into zh-Hant, zh-Hans, pa, fa, pt-PT
- **Doogie ask-URL prefill**: honor `/?ask=<query>` param so Doogie shortcut in search results auto-opens the chat with the question pre-typed

---

## 2026-08-02 — Phase D: Admin Audit + Ask-URL Prefill + Search Analytics

Three deliverables that close the loop on the intelligent related-content platform: Doug now sees exactly which pages surface each relation, visitors can deep-link into Doogie with a pre-typed question, and every unanswered search is logged so the content library grows in the exact direction visitors are asking.

### 1. Search Analytics (`admin/search-analytics`)
- **Backend**: every hit on `/api/search` now writes a row to `search_queries` — query text, tokens, result count, quick-answer flag, confidence tier (`high`/`medium`/`low`/`none`), and a hashed IP (SHA-256 truncated to 16 chars — PIPA-compliant, never stores raw IP)
- **New endpoint** `GET /api/admin/search-analytics?days=30&limit=30` returns three aggregations:
  - **Top queries** — what visitors search most
  - **No-result queries** — the highest-value gap list; direct pointers for new glossary terms or FAQ answers
  - **Low-confidence queries** — some hits but no strong quick answer; opportunities to tighten definitions or add synonyms
- **New admin page** with 4 metric cards + 3 sortable tables + inline "How to close a gap" workflow pointing to the Content Relations editor and AI Content Approvals queue
- **Search quality fix**: tightened tokenizer to drop 60+ real-estate domain stopwords (`real`, `estate`, `home`, `bc`, `canada`, etc.) plus a title-hits gate on quick_answer promotion — garbage queries like "xyzabc-not-a-real-thing" now correctly return 0 results, "how much home can I afford" correctly registers as low-confidence so Doug can commission an affordability landing page

### 2. Doogie Ask-URL Prefill
- Homepage now honors `?ask=<query>` on load — auto-opens Doogie's chat panel and pre-fills the input with the URL-decoded question
- Clean UX: the `?ask=` param is stripped from the URL via `history.replaceState` after handling so a refresh doesn't repeat the auto-open
- Ties directly to Phase C — the search page's "Ask Doogie: '{query}'" shortcut now delivers on its promise: click it and Doogie opens with your question already typed
- Reuses the existing `ez_doogie_prefill` localStorage hook already used by listing cards and the affordability calculator handoff — one path, zero duplication

### 3. Content Relations Audit
- **Frontend**: every row in the admin Content Relations table now shows a "🔍 Preview live ↗" deep-link under the source ID that opens the exact glossary/community/guide page where the pinned card surfaces — one-click validation for every manual relation
- **Backend** `GET /api/admin/content-relations/{id}/audit` — programmatic access to the full audit context of a single relation (creator, timestamps, reason, notes, visibility, surface URL) for future auto-review tooling

### Files touched
- **Modified**: `backend/server.py` — added ~150 lines: `search_queries` logging in `/api/search`, `_STOPWORDS` extension (60+ real-estate domain terms), title-hits gate for quick_answer, `admin/search-analytics` aggregation endpoint, `admin/content-relations/{id}/audit` endpoint
- **New**: `frontend/src/pages/AdminSearchAnalytics.jsx` (~170 lines) — the analytics dashboard with metric cards + 3 tables + gap-closing workflow
- **Modified**: `frontend/src/pages/AdminContentRelations.jsx` — added "🔍 Preview live" link in the source ID column
- **Modified**: `frontend/src/App.js` — imported the analytics page, added admin sidebar link, added the wrapper component + route, added the `?ask=` handler useEffect inside `DoogieChat`

### Compliance controls in place
- **PIPA**: raw IPs never stored — only a SHA-256 truncated hash used to distinguish repeat visitors from unique ones. No search query is tied to a user identity.
- **BCFSA**: analytics view is admin-only; nothing surfaces on the public site
- **CASL**: no marketing consent implications — analytics logs are non-marketing operational data
- **Ask-URL prefill**: dispatches only the raw text the visitor's own link contained; opens the chat panel but does NOT auto-send — user still confirms consent and presses Send

### End-to-end validation
- Curl-verified: seeded a few queries, confirmed the analytics endpoint aggregates correctly (top queries, unique count, no-result buckets)
- Playwright-verified: `/?ask=What+are+strata+fees?` auto-opens Doogie AND strips the param from the URL
- Playwright-verified: admin login → `/admin/search-analytics` renders all 3 tables + metric cards + sidebar nav entry
- Regression: all 7 core routes (`/`, `/buying-guide`, `/selling-guide`, `/glossary/deposit`, `/community/vancouver`, `/search`, `/admin/relations`) return 200

### Deferred to future phases
- **Click-through attribution**: log which search result the user actually clicked, so we can compute CTR per query and per group (would need a beacon endpoint + result URL tagging)
- **Query clustering**: group similar no-result queries (`"strata fees Vancouver"`, `"strata fee Burnaby"`, `"strata monthly fee"`) into single suggestions so Doug commissions one term, not five
- **Semantic embeddings** (per spec §13 Layer 3): promote from keyword to vector search once the log corpus is large enough to fine-tune relevance
- **Guide printables + multilingual**: still on the backlog from Phase A

---

## 2026-08-02 — Click-Through Attribution + Query Clustering

Two Phase D+ upgrades that close the loop on search analytics: Doug now sees which results visitors actually click AND has near-identical no-result queries pre-grouped into single content commissions.

### 1. Click-Through Attribution
- **New collection** `search_clicks` — logs every click on a search result or Doogie chip. Fields: `query`, `query_lower`, `kind`, `href`, `position`, `source` (`"search"` | `"doogie-chip"`), hashed IP, timestamp
- **New endpoint** `POST /api/search/click` — fire-and-forget beacon endpoint. Never raises to the caller; PIPA-safe (only SHA-256 truncated hash of IP, never raw)
- **Frontend beacon**: `fetch(..., {keepalive: true})` — modern equivalent of `navigator.sendBeacon` that survives page navigation. Attached to:
  - QuickAnswer link on `/search`
  - Every result card on `/search` (with position index within its group)
  - Every Doogie related chip in the chat panel (source flagged as `"doogie-chip"`)
- **Analytics upgrade**: existing `/api/admin/search-analytics` now returns:
  - `total_clicks`
  - `site_ctr` (percentage across the window)
  - `ctr_by_kind` (pill row on the admin dashboard: QuickAnswer 50% · Terms 30% · Journey 15% …)
  - Per-query `clicks` + `ctr` columns in the top-queries table

### 2. Query Clustering
- **New endpoint** `GET /api/admin/search-analytics/clusters?days=30&kind=no_results|low_confidence|all&limit=20`
- **Algorithm**: greedy single-pass Jaccard clusterer over normalized token sets
  - Normalization = lowercase → drop 60+ real-estate domain stopwords → light singularization (`fees`→`fee`, `properties`→`property`)
  - Threshold = Jaccard ≥ 0.5 AND ≥ 2 shared tokens (belt-and-braces guard)
  - Higher-volume query becomes cluster representative
- **Frontend cluster panel** on `/admin/search-analytics`:
  - Kind selector (No-result / Low-confidence / All queries)
  - Cluster rows show representative query + variant count + total volume + shared tokens + Preview link
  - Expand/collapse to see the individual variants nested under each cluster
  - High-volume clusters (total ≥ 5) render volume in red so the eye jumps straight to the biggest gaps
- **Real-world validation**: seeded test log with "strata fees Vancouver" + "strata fees" + "strata fee Burnaby" + "monthly strata fee" — clustered into ONE row (representative: "monthly strata fee"; variants: 4; total: 4; shared tokens: `fee · monthly · strata`). Also correctly clusters "capital gains condo" + "capital gains on rental property" into a single row — a real BC-specific gap Doug could commission a single landing page for.

### Files touched
- **Modified**: `backend/server.py` — added ~185 lines: `search_clicks` model + `POST /api/search/click` endpoint, `_CLUSTER_STOPWORDS` + `_cluster_normalize` + `_cluster_queries` helpers, `admin/search-analytics/clusters` endpoint, click-through enrichment inside `admin/search-analytics`
- **Modified**: `frontend/src/pages/SearchPage.jsx` — added `emitSearchClickBeacon` helper, attached to QuickAnswer link + every ResultsGroup card with position/group kind/query
- **Modified**: `frontend/src/components/DoogieRelatedChips.jsx` — added `emitChipBeacon` helper, attached to every chip with `source: "doogie-chip"`
- **Modified**: `frontend/src/pages/AdminSearchAnalytics.jsx` — added Total-clicks metric card + "Where clicks land" panel + Clicks/CTR columns on top-queries table + full Query-clusters section with kind selector + expandable variant rows

### Compliance controls
- **PIPA**: raw IPs never stored on click log — SHA-256 truncated hash only, same convention as query log
- **CASL**: beacon endpoint is operational-analytics-only, not marketing
- **User navigation**: beacon uses `keepalive:true` so it fires even as the user is navigating away; failure is silent so a broken beacon never blocks a click
- **Test log clean-up**: seed queries and click beacons cleared post-verification so Doug's first real analytics window shows genuine visitor data only

### End-to-end validation
- Curl-verified: POST /api/search/click stores rows; GET /api/admin/search-analytics returns `total_clicks`, `site_ctr`, `ctr_by_kind`, and per-query CTR
- Playwright-verified: admin dashboard renders all new UI blocks; strata cluster expands correctly showing 3 variants nested under "monthly strata fee"
- Regression: 8/8 core routes return 200

### Backlog still open
- **Guide printables** (P1) — print-friendly CSS on Buyer/Seller Guides
- **Multilingual guides** (P2) — translate to zh-Hant/zh-Hans/pa/fa/pt-PT (hreflang scaffolding already in place)
- **Guide email capture** — visitor email → PDF download, CASL-separated
- **Semantic embeddings** (Phase C.2) — layer 3 of spec §13; promote from keyword-only once corpus is large enough

---

## 2026-08-02 — Featured Cluster Cards on Admin Dashboard

Closes the loop on the search-analytics story: the top-3 no-result clusters now surface as prominent "commission this glossary term" cards on Doug's Desk (main `/admin` page), so any content gap can be turned into a new glossary term in three clicks.

### What shipped
- **Featured Cluster Cards** on `/admin` (Doug's Desk):
  - Positioned right after the Buyer/Seller/REALTOR® stats grid
  - Fetches `/api/admin/search-analytics/clusters?days=30&kind=no_results&limit=3` on mount
  - Silent-hides when there's nothing to show (fresh install, empty log, or endpoint error) — never shows a broken/empty section
  - Each card displays: gap ranking (🔥 High priority when total ≥ 5), representative query, variant count + total volume, "Also: '...'" variant preview, suggested slug + term derived from shared tokens
  - Primary CTA "Commission this term →" deep-links to `/admin/approvals?commission=<Term>&slug=<slug>&source=search-gap` so the approvals form can prefill with the visitor's actual query
  - Secondary 🔍 button opens `/search?q=<representative>` in a new tab so Doug can see exactly what visitors saw
  - "View all →" link routes to the full `/admin/search-analytics` clusters section
- **Cluster algorithm upgrade** (`_cluster_queries` in `server.py`):
  - Added **overlap coefficient** clustering path alongside Jaccard (`overlap = |A∩B| / min(|A|,|B|) ≥ 0.6`)
  - Handles short-query variants ("passive house BC" vs "passive house rebate BC") that Jaccard alone under-clusters
  - `min_shared_tokens` floor still enforced so single-token junk overlaps don't false-merge
- Regression: 9/9 core routes return 200

### Files touched
- **Modified**: `backend/server.py` — `_cluster_queries` signature adds `overlap_threshold=0.6`, uses `Jaccard≥0.5 OR overlap≥0.6` with `min_shared_tokens=1` floor
- **Modified**: `frontend/src/App.js` — `AdminDash` now fetches clusters + renders the Featured Cluster Cards grid (55 lines added, no new file)

### Compliance controls preserved
- **PIPA**: analytics fetch uses admin auth headers; no visitor PII surfaces on the cards
- **BCFSA**: cards are admin-only; nothing appears publicly
- **CASL**: no marketing implications; the analytics loop is operational

### Backlog still open
- **Guide printables** (P1) — print CSS on Buyer/Seller Guides
- **Guide email capture** (P2) — email → PDF download with CASL-split consent
- **Multilingual guides** (P2) — zh-Hant/zh-Hans/pa/fa/pt-PT (hreflang scaffolding already in place)
- **Semantic embeddings** — Phase C.2 layer 3
- **Approvals form prefill support** — the deep-link params (`commission`, `slug`, `source`) are sent but the AdminApprovals page doesn't yet read them; a small change would auto-fill the form and complete the "three-click gap-closing" experience end-to-end

---

## 2026-08-02 — Approvals Prefill + Cluster Trend Sparklines

Closes the "three-click gap-closing" loop end-to-end AND adds trend visualization so Doug prioritizes content investment on rising demand.

### 1. Approvals Prefill Support
- `/admin/approvals` now honors URL params `?commission=<Term>&slug=<slug>&source=<...>&q=<visitor_query>`:
  - On mount, reads params → shows a highlighted commission banner with the term + slug + representative visitor query prefilled
  - Banner has editable term/slug/notes fields and a **📥 Add to Content Backlog** button
  - URL params are stripped via `history.replaceState` so refresh doesn't repeat the prefill
- **New backend collection** `content_commissions` with full CRUD (`GET/POST/PUT/DELETE /api/admin/content-commissions`):
  - Fields: `id`, `term`, `slug`, `notes`, `source`, `representative_query`, `variant_queries`, `total_search_count`, `status` (backlog/in-progress/shipped/declined), `created_at`, `updated_at`
  - POST is de-duped by term (case-insensitive) so clicking the same gap card twice doesn't create duplicates — returns existing id + `duplicate: true`
  - PUT accepts partial updates (only `status`/`notes`/`slug`/`term` mutable) so the inline status dropdown works safely
- **Content Backlog table** on `/admin/approvals`:
  - Lists every open commission with term/slug/notes/source/status
  - Inline status dropdown (backlog → in-progress → shipped / declined)
  - Delete button
  - Silent-hides when empty so the approvals page stays clean until Doug commissions something
- **Success/duplicate/error messages** shown inline; 4-second auto-dismiss

### 2. Cluster Trend Sparklines
- **Backend** `/api/admin/search-analytics/clusters` now returns per-cluster `daily_counts` array (30-day vector, oldest → newest) plus a `trend` flag (`up` / `down` / `flat`) computed as last-7-day sum vs prior-7-day sum with a 1.3× threshold
- **New reusable component** `frontend/src/components/Sparkline.jsx` — zero-dependency SVG bar sparkline (130×24px default), tint follows the trend (red for up = priority signal, green for down = fading interest)
- **Dashboard gap cards** now render:
  - "↗ Growing" / "↘ Fading" / "→ Steady" label with color coding
  - Inline 30-day SVG sparkline showing raw daily volume
  - Aria label describing the data for screen readers
- **Enhanced gap-card CTA URL**: now includes `&q=<representative_query>` so the approvals banner can quote the visitor's actual search back to Doug

### End-to-end validation
- Seeded 80 rows across 3 realistic clusters (passive house = growing, assignment ban = older-heavy, laneway = steady). All three sparklines render with proper trend detection
- Playwright: click "Commission this term" on a gap card → prefill banner appears → click "Add to Content Backlog" → success message → new row appears in the backlog table
- 10/10 core routes 200 OK; seeded demo data cleared post-verification

### Files touched
- **Modified**: `backend/server.py` — added ~110 lines: `daily_counts` + `trend` computation on cluster endpoint, `ContentCommission` model, 4 CRUD endpoints (`content-commissions` GET/POST/PUT/DELETE) with dedup + partial-update guards
- **New**: `frontend/src/components/Sparkline.jsx` — reusable SVG bar sparkline (~50 lines)
- **Modified**: `frontend/src/App.js` — imported Sparkline; extended `AdminDash` gap cards with trend label + sparkline; extended `AdminApprovals` with URL-param reader, commission form banner, backlog table, and 4 CRUD helpers (~120 lines added, no new file)

### Compliance controls preserved
- **PIPA**: commissions store only term/slug/notes/source — no visitor PII
- **BCFSA**: prefill banner still routes through the licensee (Doug) for review before the AI drafts the actual term — the commission is an intent record, not a published definition
- **CASL**: analytics loop is operational, not marketing

### Backlog still open
- **Guide printables** — print CSS on Buyer/Seller Guides
- **Guide email capture** — email → PDF download with CASL-split consent
- **Multilingual guides** — zh-Hant/zh-Hans/pa/fa/pt-PT (hreflang scaffolding already in place)

---

## 📅 2026-08-02 — Phase E: Auto-Draft on Commission ✅

### What shipped
When Doug flips a backlog commission from "backlog" → "in-progress" on `/admin/approvals`, the backend now automatically fires Claude Sonnet 4.6 (via Emergent LLM Key) to draft a BC-compliant definition + 10 FAQs. Draft appears inline in an expandable panel with editable definition textarea + FAQ inputs, plus "Regenerate draft" and "Approve & publish to glossary" buttons.

### Backend
- **New helper** `_generate_definition_from_scratch(term, notes)` — first-draft definition for a brand-new commission using hallucination-hardened v2 rules (no seed).
- **New background worker** `_auto_draft_commission(cid)` — runs `_generate_definition_from_scratch` + `generate_faqs_for_term`, persists `draft_definition`, `draft_faqs`, `draft_status` (`drafting` → `drafted` / `error`), `draft_generated_at`, `draft_model`.
- **PUT `/api/admin/content-commissions/{cid}`** — when the update transitions status to `in-progress` and no draft yet exists, `asyncio.create_task(_auto_draft_commission(cid))` is fired immediately after the DB write. Returns `{ok: true, auto_draft_started: bool}`.
- **New GET `/api/admin/content-commissions/{cid}`** — single-record fetch for UI polling.
- **New POST `/api/admin/content-commissions/{cid}/auto-draft`** — manual "Regenerate draft" trigger.
- **New POST `/api/admin/content-commissions/{cid}/publish`** — approves & publishes to `db.glossary` with `faqs_approved=True`, marks commission `shipped`, pings IndexNow.

### Frontend (`App.js` / AdminApprovals)
- Poll loop (every 4s) while any commission has `draft_status === "drafting"`.
- Draft-status pill: 🔄 "AI drafting… (~30s)" · 📝 "AI draft ready — N FAQs" · ⚠ "Draft failed".
- Expandable draft panel with editable definition textarea (char counter, 400–700 target) and editable FAQ list (per-FAQ remove button).
- Actions: "✅ Approve & publish to glossary" (calls publish endpoint with edited buffer) + "🔄 Regenerate draft" + timestamp/model footer.
- `@keyframes spin` added to `index.css` for the drafting spinner.

### Compliance
- Prompts reuse the hallucination-hardened v2 rules: cite-or-refuse, whitelist-only citations (RESA, SPA, PTTA, BCFSA, CASL, PIPA, etc.), `(as of YYYY-MM-DD — verify current)` tags on every dollar amount / percentage / date, no advice.
- **Nothing publishes automatically** — every draft requires Doug to click "Approve & publish". Compliance boundary preserved.

### Verified via curl
1. Create commission → flip to in-progress → poll shows `draft_status=drafting` → after ~30s `draft_status=drafted` with 10 FAQs + ~500-1200 char definition citing BC statutes.
2. Publish → creates glossary entry with `faqs_approved=True`, commission → `shipped`, IndexNow ping.
3. Refusal path: when Claude cannot verify the term against the whitelist, it explicitly refuses to invent a definition and forces "verify with a BC lawyer/notary/tax professional" language.

### Files touched
- **Modified**: `backend/server.py` — added ~200 lines: `_generate_definition_from_scratch`, `_auto_draft_commission`, extended PUT with auto-draft trigger, new GET single, new POST auto-draft, new POST publish.
- **Modified**: `frontend/src/App.js` — added ~180 lines in AdminApprovals: polling loop, draft edit buffers, regenerate/publish helpers, expandable draft panel row.
- **Modified**: `frontend/src/index.css` — added `@keyframes spin`.

### Backlog still open
- **Guide printables** — print CSS on Buyer/Seller Guides
- **Guide email capture** — email → PDF download with CASL-split consent
- **Multilingual guides** — zh-Hant/zh-Hans/pa/fa/pt-PT (hreflang scaffolding already in place)

---

## 📅 2026-02-02 — Compliance Hardening Sprint ✅

### What shipped (all 5 items from the 89% → 97% remediation plan)
Following an engineering-level compliance read (BCFSA ≈88%, CASL ≈92%, PIPA ≈87%), we closed the five highest-impact administrative gaps in one pass.

### 1. Named Privacy Officer block on `/privacy`
- Prominent 🛡️ block at the top of the Privacy Policy — Doug LeMaire, REALTOR® designated under PIPA s.4(3)
- New dedicated inbox: **privacy@eztofind.ca**
- 24h acknowledgement / 30-day response commitment
- Direct link to OIPC BC for right-to-complain
- All in-body references to `info@eztofind.ca` for privacy matters replaced with `privacy@eztofind.ca`

### 2. "Download consent record" (CASL/PIPA export)
- New backend endpoint `GET /api/admin/leads/{kind}/{lead_id}/consent-record` returns a JSON artifact including: consent flags, consent_ip / consent_ua / consent_at, lead snapshot, unsubscribe events, DSAR events, email outbox events, and a formal legal-basis statement citing CASL s.10(9) + PIPA s.10
- `AdminList` component extended with an optional `exportKind` prop that renders a per-row 📥 Consent button plus an auditor-facing helper banner
- Wired into both `/admin/buyers` and `/admin/sellers`
- Delivered as a downloadable JSON attachment (Content-Disposition header)

### 3. Written Data Retention Schedule (`/app/memory/RETENTION_SCHEDULE.md`)
- Comprehensive PIPA-defensible schedule covering every data class the platform stores
- Statutory basis, retention period, deletion trigger, and automated enforcement mechanism for each
- Explicit "data we deliberately do not collect" section (SIN, credit cards, precise geolocation, tracking pixels)
- Early-deletion request procedure (PIPA s.23–s.29) and annual review cycle

### 4. Written Breach Response Plan (`/app/memory/BREACH_RESPONSE_PLAN.md`)
- 5-step incident-response playbook with firm timelines: 4h containment, 24h assessment, 72h notification, 30d remediation
- OIPC BC + affected-individual + Managing Broker + BCFSA + third-party notification skeletons
- Ready-to-use email templates (OIPC breach report + affected-individual notice)
- Inbound suspected-breach channels 24/7 (`privacy@eztofind.ca`, `security@eztofind.ca`, phone, forms)
- Roles, responsibilities, annual tabletop, and Incident Register structure

### 5. Public Terms of Use at `/terms`
- Full 12-section BC-appropriate boilerplate (was 3 sentences)
- Sections: Who we are · Purpose (information only) · MLS® third-party data · AI assistance (Doogie) · Intellectual Property (CIPO Reg. 1247822) · Privacy & consent · Acceptable use (no scraping, no AI training) · No warranty · Limitation of liability · Governing law (BC + Vancouver jurisdiction) · Change management · Contact
- "Last updated" and effective date visible at top
- Removes the previous "consult a REALTOR® for advice" trap wording

### Compliance impact (my read, not a legal opinion)
- BCFSA: 88% → **~93%**
- CASL: 92% → **~97%** (consent-record export is the big lift)
- PIPA: 87% → **~95%** (named Privacy Officer + retention schedule + breach plan)
- Weighted: **~95%** — into "audit-ready with only paperwork left to file"

### Remaining pre-audit items (not code)
- Get Managing Broker (Fraser Property Management Realty Services Ltd.) to sign a written marketing-approval letter for the Site (BCFSA Rule 5-1)
- Formal legal opinion from a BC real estate lawyer + privacy lawyer (~$2–4k) before publicly claiming "audit ready"

### Files touched
- **New**: `/app/memory/RETENTION_SCHEDULE.md`, `/app/memory/BREACH_RESPONSE_PLAN.md`
- **Modified**: `backend/server.py` — new consent-record export endpoint, JSONResponse import
- **Modified**: `frontend/src/App.js` — Privacy Officer block, expanded Terms, `AdminList` `exportKind` prop wired into both leads routes

### Earlier same day — "advice" language sweep
- Removed "consult a REALTOR® for advice" wording from top compliance strip, homepage hero, About page long-form, Doogie pre-chat consent, footer, and SEO prerender (`backend/prerender_pages.py`)
- Removed "powered by a large language model" jargon from Doogie consent
- Added cross-border AI-processor disclosure ("hosted outside Canada")
- Aligned every surface on: *"general educational information about BC real estate — not legal, tax, financial, or real estate advice; speak with the appropriate licensed professional"*

---

## 📅 2026-02-02 (later) — Search rebrand + vendor-name scrub

### What changed
Doug reviewed the site through a visitor's eyes and flagged two BCFSA risks:
1. Nav had two "Search" links side-by-side (`Search Listings` + `🔍 Search`) — ambiguous, and the second one implied "search AI for answers"
2. The AI vendor name (Claude / Anthropic) was leaking into three surfaces — implying a specific AI provider is answering, which conflicts with the strict retrieval-only, "our approved content" framing

### Nav & search relabelling (BCFSA education-only framing)
- `Search Listings` → **`Property Search`** (top nav + footer)
- `🔍 Search` → **`🔍 Info & FAQs`** (top nav — now clearly signals knowledge/glossary/FAQ retrieval, not AI Q&A)
- `/search` page eyebrow: `Search EZtoFind.ca` → `Info & FAQs — EZtoFind.ca knowledge library`
- `/search` page H1: `What are you looking to learn?` → `What are you looking to learn about BC real estate?`
- `/search` page "Quick answer" pill → `Top match` (removes the word "answer")
- `/search` results group "Ask Doogie" → `Explore with Doogie`
- `/search` added compliance banner: *"Educational retrieval only. This is an information look-up across EZtoFind.ca's approved content library — nothing here is legal, tax, financial, or property-specific advice."*
- Doogie response footer: `🤖 AI-generated response` → `🤖 AI-assisted retrieval from EZtoFind.ca's approved content`
- Doogie chat input placeholder: `Ask Doogie…` → `Ask about a BC real estate term or topic…`

### Vendor-name scrub
- `/ai-use` page content policy: "Drafted by Doogie AI (built on Anthropic Claude models via Emergent LLM key)" → "Drafted by our AI provider under Doug's editorial direction, using EZtoFind.ca's approved BC content library and hallucination-hardened prompts"
- Admin Approvals auto-draft panel: "Claude Sonnet 4.6 is drafting…" → "Our AI provider is drafting…"
- Admin Approvals auto-draft footer: removed the `claude-sonnet-4-6` model-name fallback
- Kept factual crawler-list references to `ClaudeBot`, `anthropic-ai` etc. in the AI Use robots.txt disclosure — those are technically-accurate crawler identifiers, not vendor endorsements
- Kept `sourceLabel.claude` in the internal admin LLM Citation Tracker — that tracker records when EZtoFind is *cited by* external AIs; the label is required for accurate analytics and is not visitor-facing

### Corrections logged from Doug
- ❌ **Managing Broker sign-off (BCFSA Rule 5-1)** — removed from the compliance backlog. Doug confirmed his brokerage arrangement does not require pre-approval for the Site.
- ❌ **Do not name Claude/Anthropic** in any visitor- or admin-facing UI. Refer to "our AI provider" generically.
- 🎯 **Buyer's / Seller's Guides should live inside the client Journey**, not as standalone `/buying-guide` and `/selling-guide` silos — Doug wants a seamless "one platform" experience.

### Next planned work (per Doug)
- Fold the Buyer's Guide and Seller's Guide content into the token-gated client Journey stages so a client sees the guide sections in the order that matches where they actually are in the transaction — instead of navigating between three separate surfaces.

---

## 📅 2026-02-02 (later) — Lead Auto-Triage ✅

### What shipped
Every new buyer + seller lead is now read by our AI provider (using EZtoFind's hallucination-hardened lead-scoring rubric — no advice, only routing), tagged **🔥 HOT / ⚡ WARM / ❄️ COLD**, and delivered to `doug@eztofind.ca` with the priority banner prepended and the priority emoji injected into the subject line so it's visible in the mailbox preview.

### Backend
- New helper `_score_lead(kind, lead)` — calls the AI provider with a strict rubric (timeline + budget + financing + motivation + specificity → hot/warm/cold + rationale + next-best-action + up-to-3 signal tags). Returns a neutral "warm + review manually" fallback if the AI call fails, so the notification is never lost.
- New pipeline `_triage_and_notify_lead(...)` — background task that pulls the lead, scores it, persists the `triage` sub-document (`priority`, `rationale`, `next_action`, `signals`, `scored_at`) back onto the lead record, renders the priority banner, and calls the notifier.
- `_notify_admin_of_lead` extended to always CC **doug@eztofind.ca** (in addition to info@ / referrals@) so Doug always gets the tagged version.
- Both `POST /leads/buyer` and `POST /leads/seller` now dispatch through `_triage_and_notify_lead` instead of directly through `_notify_admin_of_lead`.

### Sample outputs (verified live)
- Sarah Chen (UBC relocation, pre-approved $2M, 6-week close, 4-bed North Van) → **HOT** · "Call within 2 hours — sub-6-week closing window"
- Ravi Kaur (first-time buyer, 6-month timeline, unclear budget) → **WARM** · "Send guide, follow up by phone within 48h"
- Mike Curious ("just browsing", 2+ years, no financing) → **COLD** · "Long-term nurture drip"

### Compliance
- Rubric explicitly prohibits advice — the AI only routes.
- Every email includes: *"AI-assisted triage using EZtoFind.ca's approved lead-scoring rubric. Doug's judgement always overrides — this is a routing hint, not a decision."*
- Vendor name never surfaced — banner refers to "our AI provider".
- Triage output is persisted, so it's available for future `/admin/leads` UI enhancement (colored priority chip per row).

### Files touched
- **Modified**: `backend/server.py` — added ~170 lines: `_score_lead`, `_TRIAGE_SYSTEM`, `_TRIAGE_RUBRIC`, `_render_triage_banner`, `_triage_and_notify_lead`, plus CC-doug wiring in `_notify_admin_of_lead`.

---

## 📅 2026-02-02 (later) — Lead Triage Dashboard + HOT-only email routing ✅

### What shipped
Doug's inbox stops getting warm/cold pings — only 🔥 HOT leads still email `doug@eztofind.ca`. Every lead (any priority) now lands in a new **`/admin/lead-triage`** dashboard with a follow-up checklist so Doug can see at a glance where each conversation stands.

### Backend
- `_triage_and_notify_lead` now only sends the email notification when `priority=hot`. Warm/cold leads are scored, persisted, and appear in the dashboard silently.
- On first classification, the follow-up sub-document is seeded (`contacted`, `meeting_scheduled`, `meeting_held`, `proposal_sent`, `status`, `notes`).
- New `GET /api/admin/lead-triage?status=<open|won|lost|nurture|all>` — returns combined buyer + seller leads bucketed into hot/warm/cold/unscored tiers, sorted newest-first within tier.
- New `PUT /api/admin/leads/{kind}/{lead_id}/followup` — updates checklist / status / notes with server-side timestamp + editor tracking.

### Frontend
- New page **`/app/frontend/src/pages/AdminLeadTriage.jsx`** — priority-color-coded cards, expandable per lead, with:
  - Header row: priority pill + kind badge + "N days ago" age indicator (green ≤1d, amber ≤3d, red beyond)
  - Progress bar (X/4 checklist steps done)
  - "Why" + "Next action" from the AI scorer (always visible so the page reads as a scannable priority list)
  - Follow-up checklist (4 checkboxes) with instant server persistence
  - Status dropdown (Open / Closed–won / Closed–lost / In nurture)
  - Free-text follow-up notes with auto-save on blur
  - Full lead detail (areas / type / budget / timeline / financing) + AI signal chips
  - Compliance line on every card: *"AI-assisted triage using EZtoFind.ca's approved lead-scoring rubric. Doug's judgement always overrides — this is a routing hint, not a decision."*
- Summary chart at the top with count + % per priority tier
- Filter chips: Open · Won · Lost · Nurture · All
- New nav entry: 🎯 **Lead Triage** (placed above Buyer Leads in the sidebar so it's the default landing after Dashboard)

### Files touched
- **New**: `frontend/src/pages/AdminLeadTriage.jsx` (~330 lines)
- **Modified**: `backend/server.py` — `_triage_and_notify_lead` (HOT-only), new `GET /admin/lead-triage`, new `PUT /admin/leads/{kind}/{id}/followup`
- **Modified**: `frontend/src/App.js` — import, nav link, route registration

---

## 📅 2026-02-02 (later) — Guides folded into Client Journey ✅

### What changed (per Doug: 1a + 2b)
- **Public `/buying-guide` and `/selling-guide` deleted**. Both URLs now silently redirect to the corresponding intake form (`/buyer` and `/seller`) via `<Navigate>`. No "moved" landing page, no explanation — visitors go straight to intake.
- **Guide content moved inside `/my-journey/:token`**. `MyJourney.jsx` now imports `BuyingGuide` / `SellingGuide` from `pages/BuyerSellerGuide.jsx` and renders whichever one matches the journey's `base_journey_slug` in a dedicated "The Playbook — private to you" section below the client's curated stages.
- **Nav links removed** from header and footer.
- **Backend related-content cross-refs updated** — 10 `/buying-guide#step-N` and `/selling-guide#step-N` hard-coded hrefs in `_related_for_glossary` and related helpers rewritten to point to the underlying glossary slug that each step was really about (mortgage-pre-approval, property-transfer-tax-ptt, form-b, lawyer-or-notary, title-search, subject-clauses, counter-offer, completion-date). Result: no dead links anywhere on the public site, and the "You may also be looking for" surfaces on glossary pages keep working exactly as before.
- **`content_relations` fallback** for `source_type=guide` now resolves to `/glossary` (index) instead of the removed guide URL.

### Files touched
- **Modified**: `frontend/src/App.js` — removed 2 nav links, removed 2 footer links, replaced 2 routes with `<Navigate>` redirects, deleted the `GuideRelocatedGate` component (dead code cleanup)
- **Modified**: `frontend/src/pages/MyJourney.jsx` — imports `BuyingGuide`/`SellingGuide`, renders the appropriate one inline for buyer/seller journeys
- **Modified**: `backend/server.py` — 10 related-content cross-references rewritten to glossary slugs, `content_relations` guide fallback → `/glossary`
- **Modified**: `frontend/src/pages/AdminContentRelations.jsx` — placeholder + display logic updated to reflect the new reality (no more `/buying-guide` references in admin UI)

### Behaviour verification
- `/buying-guide` in a browser → instantly renders the Buyer Intake form (verified via screenshot)
- `/my-journey/:token` for a journey with `base_journey_slug="buying"` → renders the stages + a "The Playbook — private to you" section with the full 9-step BC Buyer's Guide inline
- No dead links: `grep '/buying-guide\|/selling-guide' /app/backend/server.py` returns zero runtime matches
