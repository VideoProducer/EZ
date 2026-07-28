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

### Feb 26, 2026 — Fork session
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
