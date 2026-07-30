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

## 🧹 Tech Debt Sprint — Deferred from 2026-07-30 Code Review
**Priority:** P3 (backlog, address in a dedicated 1-day sprint when features are stable)
**Estimated effort:** ~8–12 hours total
**Why deferred:** Working production site, high regression risk if refactored during active feature dev, low customer-visible value.

### 1. `dangerouslySetInnerHTML` audit (12 instances in App.js)
- **Current locations:** SEO structured data (JSON-LD), Cease & Desist letter previews (admin-only), campaign email draft previews (admin-only)
- **Risk:** Low — none are user-input, all content sources are trusted (DB, LLM-generated for admin viewing)
- **Fix:** Add DOMPurify sanitization pass on admin-only HTML previews as belt-and-suspenders. Leave SEO JSON-LD as-is (it's JSON.stringify escape-safe).
- **Time:** ~2 hrs

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

### 6. Type hint coverage in `policies.py` + test files
- **Current:** 0% type hint coverage in these files
- **Fix:** Add signatures like `def foo(x: str) -> Optional[dict]`
- **Time:** ~30 min
- **Risk:** Zero (advisory only, doesn't change runtime)

### 7. Vendor code exceptions
- `App.js:5650` — PostHog official minified snippet uses `var` + `==`. **Do not touch.** Add ESLint ignore comment.
- **Time:** 2 min

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

