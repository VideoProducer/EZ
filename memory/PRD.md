# EZtoFind.ca — Product Requirements (append-only log)

## 2026-02-15 (Equestrian search overhaul — Doug's Feb 2026 criteria)

**Backend (`server.py`):**
- New `EQUESTRIAN_MIN_ACRES = 5.0` const + `_equestrian_lot_or_barn_clause()` helper. Every equestrian-endpoint query is now ANDed with a strict $or:
  - **Path A (Land):** `lot_size_area ≥ 5 acres` — unit-aware conversion (acres / hectares / sqft with regex on `lot_size_units`).
  - **Path B (Small parcel):** description matches BOTH `\bbarn` AND at least one of `paddock | stall | pasture | corral | arena | round pen` — catches the sub-5-acre hobby-boarding properties.
- New `_extract_equestrian_amenities(desc, lot_size_area, lot_size_units)` — regex-based parse of the listing text returning `{acres, zoning, alr_status, stall_count, arena, water_source, septic, fencing, manure_storage, boarding_permitted}`. Attached to every listing in the `/api/listings/equestrian` response so the frontend can render due-diligence chips without re-parsing.
- Bareland sub-category rebuilt to opt OUT of the acreage floor (raw land is exempt by definition) but keep the keyword scan.
- `/api/listings` `q` bar equestrian intent detection now ALSO applies the same acreage-or-barn floor so a "hobby farm" search from the hero bar can't return sub-acre suburban lots.

**Frontend (`App.js`):**
- New `EquestrianAmenityStrip` component renders under each `ListingCard` on `/specialties/equestrian`. Shows Doug's priority-ordered due-diligence chips: `{acres, ALR, zoning, stalls, arena, water, septic, fencing, manure, boarding}`. Green ✓ when disclosed in the listing text; amber "?" when not — a clear PIPA/BCFSA-safe signal to buyers to verify with the listing REALTOR® rather than fabricating data.

**End-to-end verified (real Mongo, 43,399 active listings):**
- Endpoint returns **252 equestrian matches** (was polluted with vacant land + suburban houses + condos before). Property-type distribution: 76 House, 13 Manufactured Home/Mobile, 10 Manufactured Home, 1 Single Family. **Zero polluting rows** (no Vacant Land, Apartment, Condo, Townhouse, Duplex, Business, Retail).
- **3 sub-5-acre Path-B qualifiers** included (e.g. 1.28-acre Quesnel Manufactured Home with an arena — legitimate hobby-boarding property).
- Frontend renders 12 amenity strips per page load, colour-coded by disclosure status.



## 2026-02-15 (Return-Visit Nudge Analytics — measure the personalisation working)

**Backend:**
- `backend/server.py` — new **`POST /api/analytics/return-visit`** public beacon endpoint (60/min rate-limited, PIPA-safe, no PII, filters limited to enum values, IPs `_hash_ip`-sha256'd). Accepts `event ∈ {impression, resume, dismiss}` + `session_id` + `days_since_last_visit` + `total_at_last_visit` + coarse filter snapshot (`city`, `property_type`, `beds`, `price_max`). Events land in `db.return_visit_events`.
- New **`GET /api/admin/analytics/return-visit?days=30`** admin readout returning: totals (impressions, resumes, dismisses, click-through rate %), unique-session counts per event, per-day trend buckets, top-15 converting filter combos, days-since-last-visit histogram (1 / 2-3 / 4-7 / 8-14 / 15-30).

**Frontend:**
- `pages/DashboardMockup.jsx` (`HeroIntro`) — added a per-browser `ez_rv_session_id` (localStorage, generated via `crypto.randomUUID()` with a `rv-{ts}-{rand}` fallback). Wired three fire-and-forget beacons via `navigator.sendBeacon` (with `fetch({ keepalive: true })` fallback) so events survive tab-close / navigation:
  - **impression** — fires exactly once per mount when the personalised hero locks in (ref-guarded against double-fire on dismiss)
  - **resume** — fires BEFORE state mutation on "Show me the newest matches" click
  - **dismiss** — fires when the × or "Start a new search instead" is clicked

**Verified end-to-end (live preview):**
- Seeded a Burnaby / Row-Townhouse / 3+bd / ≤$1.2M return-visit blob in localStorage → hero rendered → clicked Resume → page rebound to 80 Burnaby townhome listings with pins visible on the map → admin analytics endpoint returned `impressions=2, resumes=2, ctr_pct=100%` with the new Burnaby/Row-Townhouse combo in `top_resume_filters` and the 4-7 days bucket incremented in the histogram. Compliance line PIPA-safe.



## 2026-02-15 (Return-Visit Hero + Wave D kickoff — #17 FAQ + #26 lazy images + #39 personalised return)

**Return-Visit Homepage (#39):**
- `DashboardMockup.jsx` — refactored `HeroIntro` to consume `SearchFiltersContext` and check a new `localStorage["ez_last_search_meta"]` blob written on every `runSearch()` (contains `{filters, ts, total}`). Freshness window 30 days; 7-day dismissal cooldown via `ez_return_visit_dismissed_at`. When a repeat visitor lands on `/` with no active URL/filter, the classic gold hero is replaced with a blue-cream "WELCOME BACK" variant showing a personalised H1 (e.g. `"Doogie kept your 2+ bed condo search in Vancouver under $900k warm."`), a "You last checked N days ago · N matches" sub-line, a primary `Show me the newest matches →` CTA that repopulates filters + `runSearch()`, and a `Start a new search instead` secondary link. BC PIPA note included ("Your saved search lives on your device only — nothing is sent to Doug's server").
- Verified live: seeded a return-visit blob for `{Vancouver, Apartment, 2+ bd, ≤$900K, 3 days ago, 342 matches}` → hero rendered correctly with the personalised copy, resume button, and dismiss ×.

**Wave D — Item #17 (FAQ-first content rollout):**
- **SpecialtyPage** (`App.js`) — added `SPECIALTY_FAQS` map with 4 statute-cited Q&As per specialty (detached, luxury, equestrian, estate-sales, condos, townhomes). Each answer carries a primary citation (BC Land Title Act, Strata Property Act, PTT Act, ALR Act, Water Sustainability Act, WESA, Income Tax Act s.70, etc.). Rendered as both a **visible accordion `<details>` block** and a matching **schema.org/FAQPage JSON-LD graph** with `speakable` CSS-selector metadata for Google Assistant / voice-answer surfaces.
- **NeighbourhoodPage** (`App.js`) — added 4-question FAQPage schema + visible accordion for all 518 micro-neighbourhood URLs. Questions are templated from the neighbourhood's own synopsis/listing-count/median-price data so answers stay factual and vary per URL. Each carries a primary-source citation (StatsCan, CREA DDF, BCFSA).
- Verified live on `/specialties/condos` — visible FAQ block with 4 accordion items renders correctly and JSON-LD FAQPage confirmed present.

**Wave D — Item #26 (lazy-loading images):**
- Added `loading="lazy" decoding="async"` to 8 remaining non-hero `<img>` tags across `HomepageLeadGenMockup.jsx`, `HomepageMockup.jsx`, `EquestrianLeadMockup.jsx`, `CommunityPageMockupLive.jsx`, and `MovingToBcQuiz.jsx`. Doug's headshots (56×56 through 260×260) and every Doogie sub-image now load lazily. LCP hero images (Doogie laptop on Home) intentionally kept as `loading="eager" fetchpriority="high"` — verified untouched.

**Wave D — Item #27 (font subsetting):**
- Reviewed. Fonts already at 95% optimal: `public/index.html` uses 2 families only (Inter + Playfair Display), both preloaded via `<link rel="preload" as="font">` on `fonts.gstatic.com` with `crossorigin`, `preconnect` set up on `fonts.googleapis.com` and `fonts.gstatic.com`, `display=swap` on the Google Fonts CSS request. The one self-hosted font (TeX Gyre Heros Bold, 52 KB WOFF2) uses `font-display: swap`. Google Fonts' modern CSS API automatically ships `unicode-range` splits (loads only the Latin subset for en-CA pages). No further win available from custom webpack subsetting for CDN-loaded fonts.

**Wave D remaining (queued):**
- Sizzle Reel Language Toggle (FR button for Doogie)



## 2026-02-15 (Wave C completion + Sunday-Night Digest — #30 · #33 · new digest engine)
Ships the two Wave-C items that were deferred in the prior session (Map/List toggle, voice-search-in-input), adds a brand-new **Sunday-Night Digest** email engine, and verifies the daily Price-Drop Watch end-to-end with real Mongo data.

**Files touched:**
- `frontend/src/pages/DashboardMockup.jsx` — added `MapListToggle` component (three-way segmented `List / Split / Map`) with `localStorage` persistence key `ez_search_view_mode`; added viewport persistence to `ListingsMap` under `ez_search_map_viewport` (saved on `moveend`, restored on init when no city filter is active); dynamic `mapHeight` (320 → 640 in Map-only view); `map.invalidateSize()` on layout change to prevent gray tile gutters. Added `InputVoiceMic` component using the native Web Speech API (`webkitSpeechRecognition`, lang `en-CA`, interim results) with a pulsing "recording" state and graceful fallback (mic button hides silently on unsupported browsers). Mic auto-submits on final transcript through the same address / MLS heuristics as the manual Search button.
- `backend/services/sunday_night_digest.py` — **NEW**. Runs Sunday ~18:00 America/Vancouver combining (1) new-listing matches within a 7-day lookback and (2) fresh price drops per saved search versus a rolling `snapshot_prices` field on the `saved_searches` doc. First run seeds the snapshot; drops fire from the following week. Reuses `_match_filters` from `just_sold_digest.py` and the same CASL/PIPA disclosure footer as Price-Drop Watch. Never emits exact street addresses in the drop block.
- `backend/server.py` — accepted `sunday_night` in `frequency` + `digest_frequency` on `/api/saved-searches` (line ~1698). Added `POST /api/admin/sunday-night-digest/run` admin endpoint. Added `_sunday_night_digest_loop()` scheduler (targets 02:00 UTC Monday ≈ 18:00 PT Sunday).

**Verification (backend, end-to-end against real Mongo — 2026-02-15):**
- Price-Drop Watch: seeded synthetic verified `user_favorites` on a real active listing → Run 1 wrote snapshot (`drops_detected=0`) → artificially raised snapshot by $25K → Run 2 detected 1 drop and sent 1 email (Resend outbox path exercised) → snapshot rolled forward to current list price. ✅
- Sunday-Night Digest: seeded synthetic verified `saved_searches` for Vancouver → Run 1 seeded `snapshot_prices` with 4,714 active Vancouver listings, 0 drops → artificially bumped 2 snapshot prices by $30K → Run 2 detected 2 drops, sent 1 email, `subscribers_matched=1`. ✅
- Live active inventory across BC when tested: **52,199 listings** through the DDF sync.

**Verification (frontend, live preview — 2026-02-15):**
- Split view renders map + list (default). Toggling to List hides the map entirely; toggling to Map expands the map to 640px height and hides the list. Preference persists across reloads via `localStorage`.
- Voice mic renders inside the search input row (data-testid `dash-address-mls-search-mic`). Recording state pulses red; final transcript auto-submits through the MLS/address search heuristic. Firefox/older browsers silently omit the mic (no error).

**Still PENDING (user to provide):**
- Doug's individual BCFSA licence # + brokerage BCFSA licence # → drop into `FACTS.bcfsa_licence_individual` / `FACTS.bcfsa_licence_brokerage` in `LiveHomepageSchema.jsx`. When these arrive the JSON-LD `identifier` fields flip from `"PENDING"` to real numbers with no other code change needed.

**Wave D remaining (queued):**
- FAQ-first content rollout (#17) — add FAQ + FAQPage schema to every community/glossary/specialty page
- `loading="lazy"` + `decoding="async"` on all non-hero images (#26)
- Font subsetting in webpack config (#27)
- Personalised return-visit homepage based on cookies (#39)
- Sizzle Reel Language Toggle (FR button for Doogie)



## 2026-02-15 (Elite landing-page enhancement Wave A — shipped to live `/`)
Reference: full 48-item enhancement audit; user selected 33 items; Wave A ships 9 items now, Waves B/C/D queued.

**Files touched:**
- `frontend/src/index.css` — appended global CSS block (items 22 · 24 · 25 · 28 · 46)
- `frontend/src/components/PIPACookieBanner.jsx` — NEW (item 12)
- `frontend/src/components/LiveHomepageSchema.jsx` — NEW (items 13 · 14 · 15 · 18)
- `frontend/src/App.js` — imported PIPACookieBanner + rendered inside `<BrowserRouter>` tail
- `frontend/src/pages/DashboardMockup.jsx` — imported LiveHomepageSchema and rendered inside `<SearchFiltersContext.Provider>`; injected NL search chips below `DoogieFilterHeader` (item 29)
- `backend/sitemap_generator.py` — added `_build_listings()` function + `sitemap-listings.xml` sub-sitemap + wired into the index (item 20)

**Verification:**
- 2 `application/ld+json` blocks confirmed on `/` (12 entities in the new `@graph`)
- PIPA cookie banner visible at bottom of `/` with BC OIPC link + "Got it" button
- All prior functionality (Doogie hero, sidebar nav, Leaflet map, listing search) intact

**⚠️ Placeholder to fill in before promoting to production:**
- `frontend/src/components/LiveHomepageSchema.jsx` — `FACTS.bcfsa_licence_individual` and `FACTS.bcfsa_licence_brokerage` are both `"PENDING"`. Replace with Doug's real BCFSA licence numbers.

**Queued for follow-up sessions** — 24 remaining items (Waves B, C, D) documented in the chat handoff with file plans.



## 2026-02-14 (Homepage V2 mockup — full parity with live eztofind.ca + AEO/LLM + BCFSA compliance sweep)
Ported every high-value element from the live eztofind.ca homepage into `/mockups/home-v2`, layered in a full AEO/LLM/AI-search structured-data pass, and closed every BCFSA/CREA/PIPA/CASL/GVR compliance gap. Zero external-integration adds. Files touched: `frontend/src/components/HomepageLeadGenMockup.jsx`.

**Lead-gen adds (Wave 3):**
- **BC Home Affordability Calculator** — new `AffordabilityCalculator` component. OSFI B-20 stress test (max of contract + 2 % or 5.25 % minimum), full BC Property Transfer Tax schedule (1 % / 2 % / 3 % / 5 %), First-Time Buyer PTT linear-phase-out exemption ($500 K full → $835 K none), 39 % GDS ratio cap, $500/mo prop-tax+heat allowance, live "Show me listings under $X" CTA to `/listings?price_max=…`. Fully client-side, no PII leaves the browser.
- **Testimonials** — J&M (Buyers · 2024) + M.C. (Seller · 2024) with 5-star ratings, inline microdata (`itemScope`/`itemProp` for Review/Rating/Person), plus a BCFSA Rule 5-11 disclosure box below (no consideration paid, full names on request, individual results vary).
- **3 Region cards** — dark-navy `/regions/{slug}` cards for Greater Vancouver (22 communities), Fraser Valley (18), Sea-to-Sky (6) with tagline + hover-lift + community count. Includes a `ReferralAsk` pill for out-of-area visitors immediately below.
- **Trust strip** — 4 badges: Licensed REALTOR® · Local Expert · 13 Years BC Experience · 439 Statute-Cited Terms · 240 community profiles. Placed between hero and Coming-Soon block.

**AEO/LLM/citation adds (Wave 2):**
JSON-LD `@graph` expanded from 5 → 10 entities:
- `WebSite` — added `inLanguage: en-CA`, richer description
- `RealEstateAgent` (Doug) — added `hasCredential` (BCFSA licence), `sameAs` (realtor.ca), `givenName`/`familyName`/`jobTitle`, `email`, richer `knowsAbout`, split `areaServed` into 3 sub-areas
- `RealEstateAgent` (brokerage) — added `geo.latitude/longitude`, `priceRange`, `hasCredential`, `aggregateRating` (5.0 from 2 reviews), inline `review` array
- **NEW** `ItemList` — 3 regions with `Place` + geo coords
- **NEW** `DefinedTermSet` + 6 `DefinedTerm` entries (ALR, restrictive covenant, PTT, subject-to-financing, depreciation report, DoR) each with statute-cited definitions
- **NEW** 4 `Service` entities (equestrian, luxury, condos, detached) with `provider` linked to Doug
- **NEW** `SoftwareApplication` — BC Home Affordability Calculator with `featureList` + free `offers`
- `FAQPage` — added `speakable` selector on FAQ testids

**Compliance closures (Wave 1):**
- **BCFSA licence numbers** — added dedicated Rule 4-2 identification paragraph in footer with both individual + brokerage placeholder slots + link to bcfsa.ca/registrant-search. Placeholders `PENDING — insert Doug's BCFSA licence #` and `PENDING — insert brokerage licence #` in the `FACTS` const at the top of the file must be replaced with real numbers before promoting to `/`.
- **Practice-area statement** — new footer paragraph explicitly stating direct-representation regions and naming all 5 referral boards (VIREB, IAR / KAR, BCNREB, CADREB). Same statement now in the Regions section body.
- **AI Use Disclosure** — new dedicated section between Testimonials and Lead Form with 3 cards (Doogie Chat · AI-Drafted Content · Guardrails) matching the BCFSA AI Guidelines wording from `/compliance`.
- **CASL retention disclosure** — added to footer + FAQ Q5: consent record (email, timestamp, IP, user-agent) retained for 3 years.
- **OIPC BC** — added complaint-route link to the BC Office of the Information & Privacy Commissioner in the footer PIPA paragraph.
- **Privacy Officer contact** — `privacy@eztofind.ca` now printed in footer alongside general `info@eztofind.ca`.
- **Testimonial disclosure** — BCFSA Rule 5-11 box immediately below the testimonials grid.
- **Not-advice bumper** — reinforced in hero + footer + AI Disclosure section (previously only twice).

**Factual accuracy corrections:**
- "40,000+ live listings" fallback removed — now falls back to "Live CREA DDF® MLS® feed"
- "Sea-to-Sky Corridor" → "Sea-to-Sky Corridor (to Whistler)" everywhere
- "439 glossary entries" → "439 statute-cited glossary entries"
- Added "13 years of BC experience" everywhere Doug's expertise is referenced
- Explicit `240 community profiles` number in H1

**File-level structure:** `FACTS` const at the top now serves as single-source-of-truth for every regulator-visible fact (brokerage name, address, phone, licence numbers, practice areas, referral boards, years experience, glossary count, community count). Edit `FACTS` to update everything site-wide.



## 2026-02-14 (Doogie mascot injected into Homepage V2 mockup)
- **`HomepageLeadGenMockup.jsx`** — Doogie now appears in two contextually-appropriate spots on `/mockups/home-v2`:
  1. **Hero right-side floating mascot** — `thinking.webp` positioned absolute bottom-right of the hero (desktop ≥ 1024px only, hidden on mobile via media-query CSS scoped to `.hv2-doogie-hero`). Includes a white speech-bubble callout: "Hi, I'm Doogie 👋 — Ask me anything…". Subtle 6s float animation, gated by `prefers-reduced-motion`. `aria-hidden` since the H1 carries the semantic meaning.
  2. **Search-widget avatar** — 36×36 Doogie thumbnail next to "Ask Doogie" tagline inside the DoogieFilterHeader card, reinforcing the "who is asking" cue.
  3. **"Meet Doogie" concierge band** — new section between the Glossary Spotlight and the Lead Form (cream background). Two-column responsive layout: `laptop.webp` on the left, headline "Ask questions in plain English — get straight answers, day or night." on the right, 4 feature bullets (voice/text, 439-term glossary, Cast to TV, EN+FR), dual CTA ("Try Doogie now →" → `/visual-agent-demo` · "I'd rather talk to Doug" → `#lead-form`), plus a full BCFSA/PIPA guardrail box: *"Doogie provides general information only — never legal, tax, financial, or property-specific advice. Any actionable step (offer, contract, valuation) is handled by Doug LeMaire, REALTOR®, personally."* Data-testids: `hero-doogie-mascot`, `meet-doogie-band`, `meet-doogie-cta-try`, `meet-doogie-cta-human`, `meet-doogie-guardrail`.
- No new dependencies, no backend changes. Uses existing `/images/doogie/*` static assets already shipped with the frontend.



## 2026-02-13 (Community Finder quiz merged into /relocating + audio/TV Pairing fixes)
- **`CommunityFinderQuiz.jsx`** — self-contained 5-question lifestyle → BC region matcher. Design matches Doug's supplied mock: gold "📍 COMMUNITY FINDER" eyebrow, Playfair serif H1 "Where should you live?", subtitle, "Question N of 5" indicator, 5-segment progress bar, and up to 6 option pills per question. Back button appears from Q2. Result screen shows top-3 BC regions (Best match / #2 / #3) with taglines and starter community pill links (`/community/{slug}`) plus a "Talk to Doug →" CTA that posts to `/buyer?source=community-finder`. All quiz logic is client-side (no PII); no server round-trip until the visitor opts into the buyer form.
- **Injected into `/relocating`** immediately below the H1 so visitors see the quiz before the supporting knowledge base. All existing sections (Choose a region, Taxes, Cost-of-living, Immigration essentials, Search tools, CTAs) remain untouched below.
- **Audio fix — removed `x-webkit-airplay="deny"`** from all 5 places in the codebase that had it (ListingNarration, TourNarration, DoogieTour, TVDisplayPage, FeaturedComingSoonListing). It was over-blocking Doogie audio during AirPlay Screen Mirroring. Kept the standard `disableRemotePlayback` attribute which still prevents the original bug (iOS auto-hijacking Doogie audio to Apple TV with a black screen) without silencing audio during Screen Mirroring.
- **TV Display fallback controls** — added on-screen prev/next photo buttons + arrow-key handlers to `/tv` so smart-TV browsers with unreliable polling (Hisense Vidaa, LG WebOS) can drive the slideshow directly with the TV remote. Also added a play-narration overlay button on the first photo so families never need the phone remote. `MediaTrackNext` / `MediaTrackPrevious` / `MediaPlayPause` media-key events are also bound.



## 2026-02-13 (Featured Coming Soon window + site-wide Referral CTA)
- **`FeaturedComingSoonListing.jsx`** — reusable "Coming Soon" featured tile for the homepage that Doug can flip to "Just Listed" once MLS® goes live. Compliance is baked in:
  - `mode="coming_soon"` renders a **generic teaser only** — no address, no photo of the actual home, no exact price, no MLS® number, no unit number, no distinctive sub-neighbourhood. Just home type, general area, rounded price band, general bed/bath/sqft range. Under GVR Rule 3.14 + CREA REALTOR® Code Article 6, a generic teaser is NOT pre-MLS advertising because it doesn't identify a specific property — so no signed express-consent from the seller is required to display.
  - `mode="just_listed"` (once MLS is live OR consent signed): renders full address, exact price, real photo, MLS® number, JSON-LD `RealEstateListing`, brokerage attribution, and links to `/listing/{key}`.
  - `mode="hidden"` renders nothing (self-removes when no featured listing).
  - **Video slot** accepts direct mp4/webm, YouTube (`youtube-nocookie` for GDPR-lite), or Vimeo. Click-to-load so no 3rd-party pixel fires until the visitor taps play. Direct video tags carry `x-webkit-airplay="deny"` (matches Doogie audio pattern).
  - By-Appointment-Only note replaces the missing open-house line per Doug's request.
  - Priority-list CTA points to `/buyer?source=coming-soon&area=…` so Doug's CRM tags every incoming lead as pre-MLS.
- **Injected into `/mockups/home-v2`** immediately after the hero (highest-visibility slot). Currently populated with the placeholder Fraser Valley detached teaser — swap the `<FeaturedComingSoonListing …/>` props to the real listing details once the MLS input is live.
- **`ReferralAsk.jsx`** — new site-wide component with 3 variants (`pill`, `card`, `inline`) that renders the standardized user-requested copy: **"Would you like Doug to have a local REALTOR® contact you?"** + a "🤝 Get a local REALTOR® referral →" button. Every render fires a `referral_ask_click` analytics event tagged with the source context so Doug can see which out-of-area surfaces drive the most referrals.
- **Injected** at 3 high-impact user-facing surfaces so the pitch is identical everywhere:
  1. `HomepageLeadGenMockup.jsx` → out-of-area FAQ (Q "outside Doug's direct service area") now shows a pill below the answer.
  2. `App.js` → search-empty state on `/listings` now shows a full `ReferralAsk` card (previously a plain text link).
  3. `DashboardMockup.jsx` → the intent-sync out-of-area bridge banner now uses the exact question copy + "🤝 Get a local REALTOR® referral →" button (was "Get referred →").
- **FVP lead-form field contract fixed**: `/family-viewing-party` was posting `name` — backend `BuyerLead` schema expects `full_name`, `casl_consent`, `pipa_ack`, `budget_range`, `timeline`, `financing_status`. Corrected to match.



## 2026-02-13 (TV Pairing — true casting, no phone-mirror)
- **New `/tv` route** — big-screen browser (Samsung Tizen, LG WebOS, laptop-HDMI'd-to-a-TV, Chromebook, iPad-with-HDMI) enters a 6-digit code and plays the listing full-screen with the phone as a remote. No screen-mirroring, no receiver-app registration with Apple/Google needed.
- **Backend endpoints** (`/api/cast/pair/*`) with 20-min TTL:
  - `POST /create` — phone creates a session with listing snapshot; returns `code` + `session_id`.
  - `POST /claim` — TV submits code; returns snapshot + current state.
  - `POST /update` — phone pushes new photo index, listing, or action ("play_narration", "stop_narration", "exit").
  - `GET /state/{session_id}` — TV polls every 2s (works on every smart-TV JS engine, no WebSockets needed).
  - `DELETE /{session_id}` — end session.
  - Storage: `tv_pair_sessions` collection with Mongo TTL index on `expires_at`.
- **Frontend components**:
  - `components/TVPairingBlock.jsx` — new "Send to a TV browser (RECOMMENDED)" block injected at the top of the Cast modal. Renders code + QR (`/tv?code=NNNNNN` prefill), then flips to a remote with prev/next photo + play/stop Doogie narration buttons after the TV claims.
  - `pages/TVDisplayPage.jsx` — the TV-side viewer. Photo takes ~78% of the screen; sidecar shows price, address, beds/baths, brokerage attribution. When phone pushes `action="play_narration"`, TV fetches `/api/listings/{key}/narration` + `/api/doogie/tts` and plays through TV speakers.
  - Route wired in `App.js` (lazy-loaded, no AppLayout chrome, noindex).
  - `CastToDevice.jsx` now accepts a `listing` prop and renders `TVPairingBlock` only when a full listing snapshot is available.
- **FAQ copy updated** in `HomepageLeadGenMockup.jsx`:
  - Q10 (cast): now honestly describes QR + TV pairing + AirPlay-mirror-as-fallback (was misleading).
  - Q7 (out-of-area): rewritten to Doug's dictation — "pin drop, compare and fave heart, video, and VR tour on the listings" plus a referral-network fallback sentence.
- **Verified end-to-end**: URL `/tv?code=730363` prefills → connect → TV renders live DDF photo, $1.20M price, beds/baths, brokerage; `POST /update` pushes photo_index → TV counter updates on next 2s poll; `DELETE` → TV shows "Session ended" screen.



## 2026-02-10 (community-page LIVE mockup — fully working)
- **`CommunityPageMockupLive.jsx` — full end-to-end wiring pass**. Fixed 6 data-mapping bugs so both Kelowna (out-of-area referral) and Maple Ridge (in-area focus) render as fully functional lead-gen pages:
  - **Listing card photos**: swapped `l.primary_photo` → `l.photos?.[0]` (API returns `photos[]` array). Also removed a `background: undefined` shorthand that was clobbering `backgroundImage` — cards now show real DDF CDN photography, plus a `🎥 TOUR` overlay pill when `has_virtual_tour=true`.
  - **Living area**: mapped `l.living_area_sqft` → `l.living_area` (CREA field). Cards now display real sqft (e.g. `6bd · 5ba · 4,841 sqft`).
  - **Weather section**: API returns a narrative `weather` string (ECCC-sourced), not numeric `avg_high_c` tiles. Replaced 4 broken stat tiles with a proper narrative card + source citation ("Source: Environment and Climate Change Canada").
  - **Hero background**: Unsplash Source (`source.unsplash.com`) is deprecated → 404. Replaced with per-community backdrop map (`HERO_BACKDROP`) that reuses the region webps already shipped in `/public/images/regions/` for Fraser Valley, Sea-to-Sky, and Metro Vancouver communities. Others get a clean navy→blue gradient.
  - **Map iframe**: was a blank world map (missing `bbox`). Now computes bbox from the 4 sample listings' lat/lon range with padding, or falls back to a Google Maps embed with the community name+province query. Both Kelowna and Maple Ridge render a properly-zoomed, marker-anchored map.
  - **Sub-neighbourhood fallback** (`CURATED_HOODS`): Fraser Valley board doesn't populate CREA `CityRegion`, so `/api/community/maple-ridge/neighbourhoods` returned 0 rows. Added curated static roster for Maple Ridge (Albion, Cottonwood, East/West Central, Silver Valley, Websters Corners, Whonnock, Thornhill, Northwest/Southwest), Langley (Willoughby, Walnut Grove, Murrayville, Brookswood-Fernridge, Fort Langley, Aldergrove…), and Squamish (Downtown, Garibaldi Highlands, Valleycliffe, Brackendale…). Chips route into `/listings?city={community}&q={keyword}` for a real filtered result set. Live-hydrated communities (Kelowna: 29 real CityRegions) still use the live data.
- **New sections added** to reach parity with the design-doc mockup:
  - **3-step vetted referral process** (out-of-area only) — three numbered cards ("Fill form · Doug reviews · Intro in 24 hrs") + trust badge strip ($0 cost · You approve each intro · BCFSA-licensed only · Concierge follow-through).
  - **Auto-generated FAQ** — 4 questions per community sourced from live stats (`How many active listings?`, `Top sub-neighbourhoods?`, `Does Doug cover directly?` / `Can Doug help outside his area?`, `Is this data live?`).
  - **In-area hero CTA row upgraded**: `📅 Book a free {community} call` beside `🏡 View N listings`. Out-of-area gets `🤝 Request a {community} referral`.
  - **Doogie head shot** now appears in the out-of-area hero (Kelowna) alongside the referral copy, not just in the bottom Get-Connected block.
  - **Save {community}** button now persists to `localStorage` and shows `✅ {community} saved` when active.
  - **Focus community bottom CTA** upgraded to 3 buttons: Buying · Selling · 📞 Call Doug directly (`tel:604-787-0851`).
- **Verified live** at `/mockups/community-live?slug=kelowna` (referral variant, 1,803 listings, $819K median, 29 live sub-neighbourhoods) and `/mockups/community-live?slug=maple-ridge` (in-area focus variant, 859 listings, $1.1M median, 10 curated sub-neighbourhoods). Both render real DDF listing photos, functional maps, weather narrative, and end-to-end CTAs.
- Still parked at `/mockups/community-live` with `UnlistedMockupBanner` (noindex + robots.txt) — awaiting Doug's approval before wiring to live public routes.

## 2026-02-10 (community-page lead-gen redesign mockup)
- **CommunityPageMockup.jsx** — hybrid community-page redesign at `/mockups/community-page`. Ships in-area (Maple Ridge sample) and out-of-area (Kelowna sample) variants behind an on-page toggle. Layout is 80% shared, 20% branched:
  - **Hero**: Doug's face + variant-specific trust badge (direct coverage vs. BC-wide referral network); live inventory strip (Active · New this week · Sold 30d · Median · $/sqft · DOM); variant-specific primary CTA row.
  - **Micro-conversion band**: "Save {community}" tap-and-go (localStorage-only, $0 friction).
  - **Spatial context**: Map + sub-neighbourhoods grid paired side-by-side.
  - **Live listings preview**: 4 sample cards + "View all N listings" CTA. Out-of-area variant adds a "handled by our local referral partner" note.
  - **Segment-matched lead magnets**: Different cards per variant (equestrian/first-time/luxury for in-area; moving-quiz/first-time/neighbourhood-snapshot for out-of-area).
  - **3-step vetted process** (out-of-area only): "Fill form → Doug reviews → Intro in 24 hrs" trust block with $0/approve-each-intro/BCFSA-only/concierge callouts.
  - **About + VibeScore + FAQ**: Synopsis excerpt, 5-facet VibeScore card, 4 surfaced FAQ answers (mirrors existing FAQPage schema).
  - **Compact climate strip**: 5 stat tiles + expandable "See full normals".
  - **Bottom CTA**: In-area = Buying/Selling/Book-a-call buttons; Out-of-area = full inline referral request form (name/email/phone/intent/timeline/budget/notes + CASL+PIPA consent).
- Wired at `/mockups/community-page`, lazy-loaded, `UnlistedMockupBanner` (noindex + robots.txt block).


## 2026-02-10 (lead-magnet mockups parked for review)
- Shipped 3 lead-magnet mockups **as parked/unlisted previews** — routes live for Doug's review but sealed from search engines and site nav:
  - `/mockups/equestrian-checklist` — 6-page print-ready PDF (EquestrianChecklistMockup.jsx)
  - `/mockups/first-time-buyer` — 5-page print-ready PDF (FirstTimeBuyerCheatSheet.jsx)
  - `/mockups/moving-to-bc-quiz` — interactive 5-question funnel + CASL email gate + 3 community matches (MovingToBcQuiz.jsx)
- Created shared `UnlistedMockupBanner` component — injects `noindex, nofollow, noarchive, nosnippet` on both `<meta name="robots">` and `<meta name="googlebot">` via Helmet, sets `[Unlisted]` page title prefix, and renders a visible amber "UNLISTED PREVIEW" strip at the top of each mockup.
- Added `Disallow: /mockups/` to robots.txt in all 35 per-bot blocks (User-agent: * plus GPTBot, ChatGPT-User, OAI-SearchBot, PerplexityBot, Google-Extended, Claude-Web, anthropic-ai, Bytespider, meta-externalagent, Applebot-Extended, ClaudeBot, cohere-ai, cohere-training-data-crawler, Diffbot, DuckAssistBot, FacebookBot, FriendlyCrawler, ICC-Crawler, ImagesiftBot, Kangaroo Bot, magpie-crawler, Meltwater, omgili, PanguBot, PetalBot, SemrushBot-OCOB, Sidetrade indexer bot, YouBot, Timpi, VelenPublicWebCrawler, Webzio-Extended, YisouSpider, ZoominfoBot, plus fallback wildcards).
- All 3 mockups lazy-loaded from the main bundle via `React.lazy()` so they don't affect LCP.


## 2026-02-10 (equestrian filter tightening)
- **Property-type allowlist** added to `/api/listings/equestrian` — new `EQUESTRIAN_ELIGIBLE_PROPERTY_TYPES` set restricts results to types that could physically house a horse (Equestrian, Acreage, Detached, Single Family, House, Manufactured Home, Manufactured Home/Mobile, Mobile Home, Farm, Ranch, Rural). Apartments, condos, townhouses, duplexes, and vacant land are now excluded by default. Sub-category "bareland" opts back into Vacant Land/Land via its own property_types override.
- **Keyword canon refactored** — `EQUESTRIAN_KEYWORDS` split into two tiers:
  - **`CORE_EQUESTRIAN_KEYWORDS`** (used by the search endpoint) — unambiguous horse terms: `equestrian`, `horse property/farm/ranch/facility/barn/stall`, `horses`, `stallion`, `riding ring/arena`, `dressage`, `paddock(s)`, `corral(s)`, `round pen`, `tack room`, `feed room`, `wash bay/rack`, `grooming area`, `in and out stall`, `loafing shed`, `barn(s)`, `stable(s)`, `arena`, `pasture(s)`, `hay loft/hayloft/hay shed/hay storage`, `cross fenced`, `post and rail`, `hobby farm`, `cattle ranch`, `ALR`, `agricultural land reserve`, `farm class/classification`, `class 9`, `ALC`, `barn/arena permit`, `arena footing/drainage`, `stall size`, `paddock acreage`, `manure`, `water rights/license/licence`, `riparian`, `trailer bay`, `horse trailer`.
  - **`EQUESTRIAN_SUPPORT_KEYWORDS`** (retained for due-diligence checklist + count telemetry only) — previously-broad terms that were false-positive-heavy on urban listings: `outbuilding`, `grazing`, `agricultural`, `fencing`, `wire fenced`, `drilled well`, `gpm`, `irrigation`, `septic`, `greywater`, `environmental setback`, `200 amp`, `electrical service`, `trailer parking/access`, `fire separation`. These no longer *qualify* a listing on their own.
- **`/api/listings` (main search) intent path** — when the natural-language query matches `EQUESTRIAN_INTENT_TRIGGERS`, the endpoint now applies both the CORE keyword scan AND the property-type allowlist, so equestrian NL queries never leak parking-stall apartments.
- **Impact**: default `/api/listings/equestrian` results dropped from 8,773 → 2,196 (-75%). At the frontend's $2M price threshold used by `/specialties/equestrian`, results dropped from 1,257 → 454 (-64%) — every remaining listing is a residential rural/acreage property. Live-page screenshot confirmed only House-type acreage results across Lumby, Saanich (Cordova Bay), Vernon (South BX "Two Home Acreage"), Langley ALR, and Mission dairy farms.

## 2026-02-10 (footer direct line)
- **Footer contact block** — brokerage phone `(604) 466-7021` labelled **"Brokerage:"** stays first; Doug's cell `(604) 787-0851` now appears below as **"Direct:"** — both are click-to-call `tel:` links. `data-testid="footer-brokerage-phone"` and `footer-direct-phone`. Preserves BCFSA/CREA hierarchy — brokerage remains the primary business contact.


## 2026-02-10 (compliance polish trio)
- **CREA `ListOfficeName` capture** — `backend/services/ddf_sync.py::_map_property()` now pulls `brokerage_name` directly from the RESO Property payload (`ListOfficeName` first, `ListingBrokerageName` fallback). Also captures `ListOfficeMlsId` and `ListAgentFullName` for future compliance surfacing. `_sanitize_listing` in `server.py` upgraded from `setdefault` → truthy check so historical rows with stored `None` display the safe placeholder ("Listing Brokerage (see REALTOR.ca)") until the next auto-sync repopulates them.
- **BCFSA header prominence** — global site header now displays **"Fraser Property Management Realty Services Ltd."** at 0.78rem directly under the 1.4rem `EZtoFind.ca` logo (56% ratio, exceeds BCFSA 50% requirement). `data-testid="nav-brokerage-name"`. The `DOUG LEMAIRE, REALTOR®` byline moved to a smaller tertiary line beneath.
- **REALTOR.ca badge placement** — the `<ListingCompliance>` block (which contains the red "Powered by REALTOR.ca" badge + Listing Brokerage + MLS® number) moved from the bottom of `/listing/:key` (below the location map) to directly under the beds/baths row, above the "About This Property" heading. Sits at y≈475px on 900px viewport — top-fold visibility, per CREA DDF® preferred placement.


## 2026-02-09 (later same day, part 6)
- **First-run Cast tutorial coach mark** — small gold "👆 Tap here — cast to your TV in one step" tooltip with a bouncing downward arrow appears above the 1-tap picker button the FIRST time Doug (or any visitor) opens the Cast modal. Auto-dismisses after 10 s, or the moment the user taps the picker/× button. Persistence via `localStorage.ez_cast_tutorial_seen` so the coach mark only shows once per device.  Fires a new `cast_tutorial_shown` analytics event so we can measure adoption of the coach mark itself.
- **Removed CREA/REALTOR.ca attribution footer** from the bottom of the Cast modal per Doug's request. The badge still appears on every `/listing/{key}` page + inside Present Mode's photo overlay, so compliance is untouched.

## 2026-02-09 (later same day, part 5)
- **1-tap cast picker + illustrated manual steps** — Doug flagged that the "Open Control Center → tap Screen Mirroring" instruction was ambiguous. Fix:
  - New helper `frontend/src/lib/nativeCastPicker.js` — calls `HTMLMediaElement.remote.prompt()` (Web Remote Playback API — Chromium, iOS 15.4+ Safari) with graceful fallback to `webkitShowPlaybackTargetPicker()` (older Safari). Uses a hidden silent audio element as the attach target since the API requires a media element in the DOM.
  - `CastToDevice.jsx` (Cast modal) now leads with a big navy **"Open [Chromecast / AirPlay] picker — pick your TV · 1 tap"** button. Label auto-detects the browser via a new `detectCastCapability()` helper (Safari/iOS → 🍎 AirPlay; Chromium → 📺 Chromecast; other → 🎥 generic).
  - Manual step-by-step instructions moved into a collapsed `<details>` — expanded automatically with a "Picker didn't open — here's how to cast manually" hint when the API returns unsupported. Steps are numbered and specific ("Swipe down from the top-right of your iPhone… → Screen Mirroring icon → Pick Apple TV").
  - `ListingPresentMode.jsx` fullscreen slideshow gained a `🍎/📺 Cast` button in the control bar so Doug/client can trigger the OS picker from inside Present Mode without exiting.
  - New analytics event `cast_native_picker_opened` fires whenever Doug taps the 1-tap picker — feeds the same `/api/admin/cast-analytics` dashboard so we can measure which cast path clients actually use.

## 2026-02-09 (later same day, part 4)
- **Cast Session → CRM Client one-click convert** — after Doug ends a labelled cast session, an admin-only auto-modal (`CastSessionConvertPrompt.jsx`) offers to seed a new CRM Client from the meeting:
  - `castSession.js` now snapshots the just-closed session into a `ez_cast_session_pending` sessionStorage slot on `endCastSession()`. The prompt reads from that slot and fetches full session context from `/admin/cast-sessions?days=30` so the shown listings are the source-of-truth server view (not the frontend's local snapshot).
  - Modal prefills a client name derived from the label with trailing "Viewing / Meeting / Session / Showing / Tour" stripped ("Smith Family Viewing" → "Smith Family"). Lets Doug uncheck any listing that shouldn't be attached and add follow-up notes.
  - New backend endpoint `POST /api/admin/cast-sessions/{session_id}/convert-to-client` — validates the session exists, hydrates its listings (address/city/price/MLS®), builds a multi-line `notes` block with the meeting date, event count, and each listing shown, tags the client `["cast-session", "<raw label>"]`, sets `pipeline_stage="new"`. **CASL-safe**: `email_consent=false` — Doug must still capture express consent in the normal Add Client flow before any commercial email can go out.
  - Idempotency: every event of the session gets stamped with `request_meta.converted_to_client_id` so re-visits/duplicate submits are no-ops. The admin dashboard sessions list now shows a green **✅ Converted** badge (deep-linking to `/admin/clients`) on already-converted sessions.
- **Verified end-to-end**: 3 events on session "Jones Family Viewing" → convert → CRM client `Jones Family` created with rich notes ("Listings shown: • 410 Government Street, Victoria · $1,199,000"), tags applied, `converted_to_client_id` marker visible in the sessions endpoint.

## 2026-02-09 (later same day, part 3)
- **Cast Session Labels** — admin-only meeting labels so ranked list groups by meeting instead of raw counts:
  - `frontend/src/lib/castSession.js` — sessionStorage-backed store (`ez_cast_session`), broadcasts a `ez-cast-session-changed` custom event so all consumers stay in sync. Admin gate via existing `ez_admin_session` localStorage marker — anonymous visitors never see the banner or the inline control. Exposes `startCastSession`, `renameCastSession`, `endCastSession`, `readCastSession`, `useCastSession` React hook, plus `CastSessionBanner` and `CastSessionInlineControl` components.
  - `CastSessionBanner` fixed top-right pill ("🔴 LIVE: Smith Family Viewing · N min · Rename · End") mounted globally in App.js at the BrowserRouter root — visible on every route while a session is active.
  - `CastSessionInlineControl` rendered inside every Cast modal — shows a purple dashed "🎯 Label this meeting" input when idle, or a red "🔴 Session: X · Rename · End" bar when active.
  - `CastToDevice._logEvent()` now reads the session at fire-time and stamps every GA4 + backend beacon with `session_id` + `session_label`.
- **Backend**:
  - `POST /api/listings/analytics/track` — accepts + persists optional `session_id` (≤64 chars) and `session_label` (≤80 chars) into `listing_analytics.request_meta`.
  - New `GET /api/admin/cast-sessions?days=N` (max 365) — groups events by `session_id`, hydrates address/city/price/mls/status per listing, returns sorted-newest-first with `label`, `first_at`, `last_at`, `duration_min`, `event_count`, `event_types` histogram, and per-listing `opens/present/shares/sms` counters + `is_search` flag for filtered-search casts.
- **Admin dashboard** — added a "🎯 Recent Cast Sessions" section (red-accented, sits between Cast Analytics KPIs and BCFSA Compliance) with expandable `<details>` per session showing session-level counts + a hydrated per-listing table. Silent-hides when zero labelled meetings exist.
- **Verified end-to-end**: fired 4 events tagged `session_label="Smith Family Viewing"`; admin dashboard renders the session correctly showing 4 events across 2 listings (410 Government St, Victoria + filtered-search cast).

## 2026-02-09 (later same day, part 2)
- **Cast Analytics dashboard card** — wired the `/api/admin/cast-analytics?days=30` endpoint into `AdminDash` (`AdminShell active="dash"`), inserted between the ChatGPT Doogie attribution card and the BCFSA Compliance Review card. Card includes:
  - Gold-accented left border matching the `📺 Cast` brand affordance.
  - 6-tile KPI strip: Modal opens · Link copies · Native shares · Present Mode · SMS sent · Search casts.
  - Ranked top-25 listings list with `#N` badge, deep-link to `/listing/{key}`, hydrated address/city, list price, status, "last cast" date, per-listing 👀/🎥/💬 badges, and the cast score in a navy chip.
  - `Raw JSON ↗` link so Doug can drop-through to the raw endpoint response.
  - Silent-hides on zero activity so the dashboard stays clean pre-adoption.
- Verified end-to-end via admin login → dashboard: card renders with the 4 seed events fired earlier (Top #1 = 410 Government St, Victoria, score 4).

## 2026-02-09 (later same day)
- **Cast Analytics** — every Cast/Present-mode interaction now fires paired GA4 + backend beacon events (`cast_button_opened`, `cast_link_copied`, `cast_native_share`, `cast_present_mode_started`, plus `cast_sms_sent` reserved for future Twilio wiring). Events land in the existing `listing_analytics` Mongo collection alongside impressions/detail-views/etc.
- Extended `services/analytics_logger.py::VALID_EVENT_TYPES` with the five cast event types and added a companion `_CREA_EVENT_TYPES` allow-list so the CREA Analytics flush helper filters internal telemetry out before its future batch POST.
- New admin endpoint `GET /api/admin/cast-analytics?days=N` returns:
  - `totals` per event type across the window
  - `search_page_casts` (a filtered-search share)
  - `top_listings[]` — top 25 casted listings, ranked by `opens + 3×present + 5×sms` and hydrated with `street_address`, `city`, `list_price`, `mls_number`, `status` so Doug can spot which specific homes clients keep casting during meetings.
- SMS-to-phone deferred by user request — the analytics event slot + admin scoring already accounts for it, so wiring Twilio later is a drop-in three-env-var change.

## 2026-02-09 (earlier same day)
- **Cast to another device — QR + Chromecast + AirPlay + Present Mode** — shipped a unified "Cast" button on `/listing/{key}` and `/listings` results:
  - `frontend/src/components/CastToDevice.jsx` — modal with a canonical-URL QR code (encodes `https://eztofind.ca/...` even when opened in preview), Copy-link, `navigator.share()` fallback (iOS/Android share sheet: AirDrop, Messages, WhatsApp, Mail), and browser-specific cast instructions (Chromecast for Chromium; AirPlay Screen Mirroring for Safari/iOS).
  - `frontend/src/components/ListingPresentMode.jsx` — fullscreen slideshow (auto-advance 6 s, ←/→/space/ESC controls, CREA "Powered by REALTOR.ca" badge pinned to every slide) with an auto-playing Doogie narration built from the listing's first-person description via the fast `/api/doogie/tts/prepare` flow. Uses `x-webkit-airplay="allow"` on the `<audio>` so iOS/macOS Safari can mirror the sound to Apple TV.
  - Wired into `ListingDetail` (next to Favorite button) and the `/listings` results toolbar (as "Cast search").
  - Zero backend work required — casting reuses the existing canonical page URL that already renders through the SSR/prerender path with full CREA + BCFSA disclosures.
- Added `qrcode.react@4.2.0` to `frontend/package.json` (yarn).
- Verified end-to-end with a browser: Cast button opens modal, QR renders, canonical URL is `https://eztofind.ca/listing/30106318`, Present Mode overlay renders with Exit button and photo controls.

## 2026-02-08
- **Full-site TTS prewarm coverage** — every page that renders a Doogie Play button now silently prewarms the audio on mount, so first-click playback is a Mongo cache HIT instead of a cold OpenAI generation:
  - `DoogieHeroGreeting` (homepage): prewarms the current mode's onboarding script on mount and whenever the user toggles buyer/seller/all mode.
  - `DoogieTour`: prewarms step N+1 while step N plays — tour transitions become instant.
  - `CommunitySizzleReel` (community pages): swapped POST→blob for prepare→GET so the reel appears IMMEDIATELY with a Play button (previously hidden until the mp3 finished downloading, a 3-6 s gap Doug had flagged as feeling broken).
  - `VisualAgentDemo` (kiosk): on scenario select, prewarms every `agent` turn's script + the VOICE_SCRIPT reply, staggered 80 ms apart to avoid a burst; only fires when `speakerOn` so muted visitors don't burn Universal Key budget.
  - `DashboardMockup` (voice search summary + return greeting): both use prepare→GET now.
  - `_playDoogieTTS()` shared helper + new `_prewarmDoogieTTS()` helper in App.js — every one of the ~9 call sites uses the same fast flow with `oncanplay` + progressive `<audio src=…>` streaming.
- Verified with a page-load network capture: HomePage fires 1 prewarm + 1 prepare within 3.5 s of DOM ready (DoogieHero + DoogieTour); Whistler community page renders the sizzle reel immediately with an active Play button.

## 2026-02-08 (earlier same day)
- **Doogie TTS narration speed-up** — added a prepare→GET-by-cache-key flow so `<audio>` streams progressively and the mp3 is browser-HTTP-cacheable across sessions:
  - New endpoints in `server.py`: `POST /api/doogie/tts/prepare` (returns `{cache_key, audio_url, cache}` in ~150 ms), `POST /api/doogie/tts/prewarm` (fires background generation and returns "queued" in ~400 ms), and `GET /api/doogie/tts/audio/{key}.mp3?wait=1` (serves cached bytes with `Cache-Control: public, max-age=2592000, immutable` + `ETag`, waits up to ~4 s for a background prewarm to land).
  - Legacy `POST /api/doogie/tts` was refactored so the Mongo cache write now runs as a FastAPI `BackgroundTask` on miss (shaves 100-200 ms per cold play) and both HIT/MISS responses carry the immutable Cache-Control + ETag with 304 conditional support.
  - Frontend rewired to use the prepare→GET flow in App.js chat speaker (`speak()`), `ListingNarration.jsx`, `TourNarration.jsx`, `DoogieTour.jsx`. Also switched from `oncanplaythrough` (waits for full buffer) to `oncanplay` (starts on first playable frame) for 200-500 ms earlier playback start.
  - `DoogieTour.jsx` now prewarms step N+1's TTS while step N is playing, so tour transitions are cache-HIT (~200 ms) instead of cold OpenAI round-trips (~3-6 s).
  - Benchmarked cold path: OLD 11.3 s POST→blob → NEW 141 ms prepare + browser streams as GET arrives. Warm path: 131 ms prepare + 126 ms GET (immutable HTTP cache in production).
  - Added `_tts_normalize_text()`, `_tts_write_cache()`, `_tts_generate_and_cache()`, `_tts_pick_voice()` helpers so every endpoint uses the same normalized cache key and voice fallback.

## 2026-02-08 (earlier)
- **Per-segment Warming→Hot alerts + weekly digest** — `services/neighborhood_heatmap.py::snapshot_and_alert()` now runs crossing detection for all three series (Full BC, Luxury, Equestrian) using series-specific prior snapshots. Instant Resend emails are subject-tagged ("🔥 LUXURY market alert — …"), body-tagged with an uppercase "Segment: LUXURY market" pill, and link to the matching `/admin/heatmap/{segment}` dashboard. Dedup key on `neighborhood_heat_alerts_sent` is now `warming_to_hot:{segment}` so a Luxury Whistler crossing doesn't dedup against a Full-BC Whistler crossing. Extracted the shared logic into `_detect_and_alert_crossings()`. Response schema of `POST /api/admin/heatmap/recompute` now reports `crossings_detected / instant_alerts_sent / instant_alerts_deduped` per segment. Verified: synthetic Fake Ridge (luxury) → 1st call sent, 2nd call deduped, subject line reads "🔥 LUXURY market alert — Fake Ridge (Testville) just crossed into HOT".
- **Weekly digest goes multi-series** — `send_weekly_digest()` now sections the email by Full BC / Luxury / Equestrian, each with its own 7-day-prior snapshot lookup + move list + "Open {series} heatmap →" link. Subject reflects total shifts across series ("🌡️ Weekly Heatmap — 4 shift(s) across 3 series"). Skips series with no history yet (segment collections < 7d old).

## 2026-02-08
- **SSR/ISG expansion for LLM crawler coverage** — expanded the nightly + on-demand prerender warm loops (`/api/admin/prerender/warm` and the 03:15 UTC nightly background task in `server.py`) to cover ALL 439 glossary terms and ALL 244 community synopses (previously capped at top 50 each). Also added region hero pages (`/regions/*`) and all six specialty pages (`/specialties/*`) to the warm list. Impact: search + LLM crawlers now land on prerendered HTML with BCFSA disclosure + schema for 700+ dynamic URLs no matter which page they visit — no more "SPA-only" gaps.
- **Visual asset schema + descriptive alt text** — added three `ImageObject` JSON-LD entries to `frontend/public/index.html` (`#mascot` for Doogie logo, `#region` for Fraser Valley + Sea-to-Sky WebPs) covering `contentLocation`, `caption`, `creditText`, `license`, `copyrightNotice`, `encodingFormat` and referenced them via `@id` from the Organization `logo`. Enhanced alt text on all region cards (RegionsIndex + HomePage), the four specialty cards, region hero image, specialty hero image, and the primary Doogie hero (`DOOGIE_MAGNIFY`) to include geographic + real estate context (e.g. "Fraser Valley aerial view — Langley, Abbotsford, Chilliwack farmland, acreage and equestrian properties in BC's fastest-growing residential region"). Every region/specialty `<img>` now also carries explicit `width`, `height`, and `itemProp="image"` to feed Google image search + AEO citations.
- **Per-segment heatmap trajectory tracking** — `services/neighborhood_heatmap.py::snapshot_and_alert()` now also writes daily snapshots for the Luxury ($3M+) and Equestrian segments into sibling collections `neighborhood_heat_snapshots_luxury` and `neighborhood_heat_snapshots_equestrian`. `compute_heatmap(db, segment=…)` reads its 3/6/12-month priors from the matching per-segment collection, so trajectory arrows on `/admin/heatmap/luxury` and `/admin/heatmap/equestrian` finally exit the "flat_learning" state once 3+ months of segment history exists. `_prior_snapshot()` and the `/api/admin/heatmap/history/{slug}` endpoint gained a `segment` argument. Indexes added on the new collections via `ensure_indices()`. Verified: manual `POST /api/admin/heatmap/recompute` now returns `{ "segments": { "luxury": {"rows":32,"analyzed":78}, "equestrian": {"rows":32,"analyzed":395} } }` alongside the full snapshot.

## 2026-02 (prior)
- **Social share preview fixed**: Root-cause was missing `/images/og-default.png` fallback used by React `SEO` component + backend prerender pages. Copied new "Doogie holding laptop" 1024×1024 asset to both `/images/doogie-laptop.png` and `/images/og-default.png`. Updated `index.html` meta with correct dimensions + `?v=2` cache-buster.
- **Doogie TTS price mispronunciation fixed**: Root-cause was raw currency strings like "$2,100,000.00" being sent to OpenAI TTS, which read it as "twenty-one thousand". Added `backend/services/price_speech.py` (uses `num2words`) that normalizes every dollar amount into speakable English (millions/thousands/cents/shorthand `$2.1M` `$500K`) BEFORE the TTS call in `/api/doogie/tts`. Locked with 18 pytest cases in `backend/tests/test_price_speech.py`.


# EZtoFind.ca — PRD

## Original Problem Statement
Build a highly compliant BC real estate lead-gen + research tool (EZtoFind.ca). Features: AI hero "Doogie", live CREA IDX feed, BCFSA/CREA/PIPA/CASL compliance, virtual tours, first-person AI listing narrations, AEO/LLM discoverability, ChatGPT Store integration, Weekly digest.

## Architecture
- Backend: FastAPI monolith at `/app/backend/server.py` (~13.5k lines)
- Frontend: React 19 at `/app/frontend/src/App.js` (~10k lines) + `/app/frontend/src/pages/DashboardMockup.jsx` + extracted panes in `/app/frontend/src/pages/visual-agent/`
- DB: MongoDB (motor)
- Integrations: Emergent LLM key (Claude, Whisper, OpenAI TTS), Resend, Cloudflare Turnstile, CREA DDF IDX

## Recent Changes (Feb 2026)
- **Monthly BC Market Report shipped (Feb 7)** — Claude's flagged "critical AEO differentiator"
  - Backend: `services/market_report.py` aggregates all 39,795 active MLS® listings by city → median price, P25/P75, median $/sqft, median beds/baths/year_built, top property types, listed-this-month count. 60 cities meet the ≥20 listings threshold; province-wide median = $810K, median $/sqft = $555.
  - Public endpoints: `GET /api/market-report` (latest + available months list), `GET /api/market-report/{yyyy-mm}` (specific month). Admin `POST /api/admin/market-report/generate` for manual snapshotting.
  - Monthly cron: 1st of month at 06:00 UTC snapshots the previous month + refreshes current month to Mongo collection `market_reports`.
  - Frontend: `pages/MarketReport.jsx` at `/market-report` + `/market-report/:ym` — hero + 4 stat cards + 5 highlight bullets + sortable city table (7 columns) + methodology footer.
  - AEO: JSON-LD `Dataset` schema (CC-BY 4.0) + `FAQPage` schema (4 auto-generated Q&A) + `Speakable` schema all injected into `<head>` per page. Sitemap now includes `/market-report` + one entry per snapshotted month. IndexNow ping fired to Bing/Yandex immediately (218 URLs, status 200).
- **Sync Polish Round 2 (Feb 7)**
  - `services/keyframes.py::_normalize_youtube_url` — `youtube.com/watch?v=X` and `youtu.be/X` now rewrite to `youtube-nocookie.com/embed/X?enablejsapi=1&autoplay=1&mute=1&controls=0` so listings with watch-page URLs also get vision-grounded tour narration
  - `frontend/src/components/RoomLabelPill.jsx` (NEW) — floating pill above photo reel + virtual tour showing current room ("🍳 Kitchen", "🛏 Primary Bedroom") driven by `mediaBus.subscribeTick`; 20-slug enum synced with backend `room_label` output
  - `frontend/src/components/ListingNarration.jsx` — `onTimeUpdate` now also broadcasts `mediaBus.tick("doogie-listing", {cue, cue_idx, t_ms, duration_ms})` so RoomLabelPill (and future subscribers) can react to Doogie's current cue
  - `frontend/src/App.js` `VirtualTourFrame` — new `doogieTourActive` state via `mediaBus.subscribe`; when `provider==="matterport"` + Doogie tour narration is playing, mounts a translucent scrim overlay ("🐕 Doogie's narrating — tap to explore the tour yourself") that releases the mediaBus floor on tap. Solves the un-pausable-Matterport problem cleanly
  - `backend/server.py` startup — nightly narration warmer at 05:15 UTC iterates top 200 most-recently-modified active listings and pre-populates both `/api/listings/{key}/narration` and `/api/listings/{key}/tour_narration` caches so human + bot first-time visitors get instant 20ms HITs instead of 25-60s cold renders
  - Pytest: +4 URL normalization tests → **22/22 vision + keyframe tests passing**
- **Vision-Grounded Tour Narration + Media Sync — Phases 2/3/4 shipped (Feb 7)**
  - `services/keyframes.py` — reuses the prerender-service Playwright chromium to extract 10 keyframes from any tour: YouTube (`seekTo` via postMessage), Vimeo (`setCurrentTime`), Matterport (auto-tour + wall-clock capture), MP4/WebM (inline HTML wrapper + `<video>.currentTime`). Downscales each to 1024px JPEG.
  - `services/vision_tour_narration.py` — mirrors `vision_narration.py` but for keyframes; returns cues with `{seek_ms, screen_ref: "tour_ts=M:SS", sentence, room_label}` so the iframe can seek to match Doogie's voice-over.
  - Endpoint `GET /api/listings/{key}/tour_narration` now tries the keyframe→vision path first, falls back to the text-only Haiku path on any failure (Playwright timeout, empty frames, JSON error). Response now returns `{script, cues, vision_grounded, cached}`.
  - `frontend/src/lib/mediaBus.js` — extended with `tick(sourceId, state)` + `subscribeTick(fn)` — only the floor-holder can emit ticks; any component can subscribe.
  - `frontend/src/lib/useMediaSync.js` (NEW) — shared React hook exposing `{audioRef, onTimeUpdate, cueIdx, progress, start, stop}` for narration components to unify around a single audio-clock + cue contract.
  - `frontend/src/components/TourNarration.jsx` — now fetches + stores `cues[]`, emits `mediaBus.tick("doogie-tour", …)` from onTimeUpdate.
  - `frontend/src/App.js` `VirtualTourFrame` — subscribes to `mediaBus.subscribeTick`, dedup-seeks the YouTube/Vimeo iframe via `postMessage seekTo` so the tour scrubs to match Doogie's current sentence.
  - **Pytest**: `tests/test_keyframes_and_tour.py` — **9/9 passed** covering URL detection (YT/Vimeo/Matterport/MP4), timestamp formatting, cue mapping + sorting + range validation.
  - **Known polish item**: `youtube.com/watch?v=X` URLs need normalization to `/embed/X` inside `keyframes.py::_grab_youtube` (currently falls back to Haiku text-only for `watch?v` URLs — pipeline is proven correct via fallback).
- **Vision-Grounded Photo Narration — Phase 1 shipped (Feb 7)** — the big fix for narration/reel sync
  - `services/vision_narration.py` — sends each listing photo (downscaled to 1024px JPEG, base64) to Claude Sonnet 4.6 vision in ONE call; returns 1 sentence per photo grounded in what is *literally* visible in that image
  - New cue schema: `{ordinal, screen_ref: "photos[N]", photo_idx, sentence, room_label}` — `room_label` slug (kitchen/living/primary_bed/…) enables future scene captions
  - Endpoint `GET /api/listings/{key}/narration` now tries vision path first, falls back to text-only Haiku on any failure (network, JSON parse, empty response) — the pill never breaks
  - Cached on the listing doc (`doogie_narration.vision_grounded=true`) keyed by `modified_at`; repeat calls are ~20ms
  - Verified live on 20-photo Burnaby listing: Sonnet correctly identified exterior stucco house with tulips, marble fireplace, terracotta tile kitchen, garden fountain, bathroom double-vanity — content impossible to know from DDF text alone
  - Cost: ~$0.03/listing one-time. Latency: ~25s for 20 photos, ~6s for 3 photos
  - Pytest: `backend/tests/test_vision_narration.py` — **9/9 passed** (cue mapping, subset-to-original index remap, out-of-range/empty rejection, dedupe, sort order, fact sheet)
  - Frontend needs zero changes — existing `ListingNarration.jsx` already consumes `photo_idx` from cues, and vision path writes both `photo_idx` AND `screen_ref` for forward compat
  - Remaining phases (2-6): frontend `useMediaSync` hook + `mediaBus.tick`; virtual-tour keyframe extraction (Matterport/YT/Vimeo); MP4 keyframes; DoogieTour joins mediaBus; backend outro merge — carried over to next session
- **AEO Citation Checker (Feb 7)** — nightly audit against Claude Sonnet 4.6 + GPT-4o-mini via Emergent LLM key
  - `services/aeo_checker.py` — runs structured citation-audit prompt returning JSON, stores per-model score + questions + recommendations
  - Nightly cron at 04:30 UTC persists results to `aeo_citation_log` collection
  - Admin endpoints: `POST /api/admin/aeo/run-now`, `GET /api/admin/aeo/latest`, `GET /api/admin/aeo/history?days=30`
  - Cost: ~$0.005 per audit × 2 models × 30 nights = **~$0.30/month** on Emergent LLM key
  - Verified live: Claude returned 5 recommendations (schema markup, dedicated Doogie page, BC backlinks, original data reports); GPT returned 5 broader recommendations. Both correctly reported known=False since site is new — score baseline established for tracking growth.
- **SSR / Bot Prerender — DISCOVERY (Feb 7)**: Emergent's platform already has a built-in bot-render layer (`x-rendered-by: crawler-cache` header). GPTBot / Googlebot / ClaudeBot / Perplexity hitting `eztofind.ca` receive fully-rendered HTML (162 KB glossary, 25 KB listings) with BCFSA, Schema.org JSON-LD, CREA/MLS attribution — no custom Worker needed. Custom prerender infra we built (below) remains deployed and functional but dormant. **User opted "leave as-is" (Option A)** — Emergent's crawler-cache is doing the job.
- **SSR / Bot Prerender Service (Feb 6)** — headless-Chromium runtime SSR shipped (dormant but functional)
  - `services/prerender_service.py`: Playwright singleton + Mongo TTL cache (`prerender_cache`) + 30-day audit log (`prerender_log`)
  - `/api/bot/{path}` — public endpoint bots hit via ingress rewrite; 404 to humans (no cloaking)
  - `/api/admin/prerender/{warm,render,stats,purge}` — admin control
  - Nightly warmer at 03:15 UTC pre-renders top 200 URLs (9 static + 50 glossary + 50 communities + 100 listings)
  - Per-path TTLs: listings 6h · communities 12h · glossary 24h · other 24h
  - PIPA blocklist: `/api /admin /my-account /favorites /dashboard /login /auth /consultation-status /uploads /snapshot`
  - Compliance guardrail: `compliance_check()` rejects renders missing BCFSA disclosure, and for listings also rejects missing CREA/MLS attribution
  - CASL: renders run in incognito context (no cookies, no form state cached)
  - Provenance stamp injected before `</body>` for auditor traceability
  - Ingress snippets shipped: `/app/cloudflare_worker_prerender.js` + `/app/nginx_prerender.conf` (paired UA-detect regex, PIPA blocklist mirrored)
  - Tests: `backend/tests/test_prerender.py` — **49 passed** (bot UA detection, PIPA blocklist, TTL routing, compliance check)
  - Env: `PLAYWRIGHT_BROWSERS_PATH=/pw-browsers`, `PRERENDER_TARGET_URL=http://localhost:3000`
  - Verified E2E: bot UA on `/glossary` → 200 MISS 1.5s, then 0ms HIT. Bot UA on `/admin` → 204 BYPASS. Listing pages render with CREA/MLS + BCFSA present in 1.27s.
- Deployment health check PASS after quoting RESEND_FROM/RESEND_REPLY_TO in backend/.env
- Security audit fixes:
  - SEC-001: `/api/favorites/list` requires verification_token (BOLA / PIPA)
  - SEC-002: CSV formula-injection escape on `/api/admin/consultations.csv`
  - SEC-003: Rate limit `15/min` on `/api/doogie/transcribe`
- Root URL `/` now renders `<DashboardMockup/>` (classic marketing home moved to `/classic-home`)
- Duplicate Doogie/Reset pills removed from outer `FloatingFilters` drag strip
- **AEO / SEO expansion (Feb 6)**:
  - Community page: added `FAQPage` schema (5 auto-generated Q&A patterns) + `Dataset` schema with distribution URLs for climate + stats + synopsis APIs
  - New reusable `AiCitationFooter` component wired into GlossaryTerm + CommunityPage — APA / MLA / Chicago / Inline / BibTeX copyable citations for AI engines
  - `robots.txt` explicitly welcomes xAI-Bot, Grokbot, MistralAI (User + Bot), YouBot, You.com, KagiBot, Neevabot, ManusBot, BingBot, msnbot, AdsBot-Google, AmazonQBot, GitHub-Copilot, GitHubCopilotChat, DuckDuckBot. Amazonbot + FacebookBot + Meta-ExternalAgent switched from Disallow to Allow (educational corpus only)
- **Responsive fixes (Feb 6)**:
  - Mobile compliance banner shortened (11px font, 8px padding, terse copy under 600px)
  - Back/Home/REALTOR® Net buttons downsized on mobile (12px font, 10px padding, "REALTOR® Net" abbreviation)
- **Neighborhood Market Heatmap — LIVE (Feb 7)**:
  - New service `/app/backend/services/neighborhood_heatmap.py` — top 32 BC sub-areas ranked hottest → coldest by composite temperature (DOM · Months of Supply · absorption trend · MoM price)
  - Endpoints: `GET /api/admin/heatmap/neighborhoods` · `POST /api/admin/heatmap/recompute` · `GET /api/admin/heatmap/history/{slug}`
  - Daily snapshot loop + Monday 07:00 PT weekly-digest loop wired into `startup`
  - Warming→Hot crossing auto-emails doug@eztofind.ca via Resend (deduped 7 days per neighborhood, CASL-safe footer)
  - Frontend page `/admin/heatmap` — 32-row ranked table with temperature badges (Hot/Warming/Cool/Cold), Buyer's (blue) / Seller's (yellow) / Balanced flags, 3mo/6mo/12mo composite arrows, "learning" placeholder for windows without enough snapshot history yet
  - 25 pytest unit tests cover scoring, classification, market-type thresholds, arrow logic, and neighborhood key/label helpers — all passing
  - Live-verified: 451 sub-areas analyzed, 32 rendered · Warming→Hot alert delivered to Resend outbox on synthetic crossing · dedup confirmed on repeat run
- **Discoverability booster batch — 3 items shipped (Feb 8)**:
  - **`llms-full.txt`** (128,750 chars / 858 lines) auto-generated with 439 glossary terms grouped by 31 categories + 240 BC communities grouped by 12 regions + compliance framework + Doogie refusal patterns + all machine-readable API endpoints + citation guidance for LLMs. Served at `https://eztofind.ca/llms-full.txt`. Extends the existing 117-line `llms.txt`.
  - **Nearby communities footer** on every `/community/{slug}` page — new backend endpoint `/api/community/{slug}/nearby` returns 6 randomly-sampled same-region peers; frontend renders as pill-shaped internal-link chips. Distributes PageRank + strengthens LLM entity co-occurrence graph. Verified on `/community/maple-ridge`: Burnaby → Surrey → Richmond → West Vancouver → New Westminster → Belcarra.
  - **NewsArticle JSON-LD** on `/market-report` — coexists with existing Dataset/FAQPage/Speakable schemas; makes monthly market reports eligible for Google Discover and Google News mobile surfaces. Verified: `headline: "British Columbia Real Estate Market Report — August 2026"`, author + publisher schema attached.

- **Search bar upgrade — Address / Postal code (Feb 7-8)**:
  - Root cause: `/api/listings?q=930 Josephine` returned 0 rows because Mongo `$text` tokenises words and matches ANY token (so "930 Josephine Rd" matched every listing with "Rd" in the description)
  - Added targeted routing in `search_listings`: Canadian postal codes (full A1A 1A1 OR FSA-only A1A) route to `postal_code` field with an FSA-prefix regex — matches Canada Post's neighbourhood definition, so "V3A 0A5" now returns all 358 listings in the V3A Langley/Maple Ridge FSA (not just the exact-postal 0 hits). Also works when postal is entered into the Community/City filter box (auto-detected + rerouted).
  - Street-address heuristic (starts with a digit + space) hits `street_address` + `unparsed_address` with a case-insensitive regex
  - Placeholders updated: main bar shows `Search by address, postal code, or MLS® number (e.g. 930 Josephine Rd · V6B 1A1 · R2812345)`; Community/City filter shows `Any BC community or postal code (e.g. V3A)`
  - Verified live: `930 Josephine Rd` → 2 correct listings; `V3A 0A5` / `V3A` / `v3a 0a5` (in city filter) all → 358 Langley listings; city + street-address regressions clean
- **Map popup keeps visitors on-site (Feb 8)**: swapped the Leaflet popup link from external `realtor.ca` redirect to the internal `/listing/{key}` page. CREA-required "Powered by REALTOR.ca" attribution stays on the listing detail page.
- **Traditional SEO batch — 12 items shipped (Feb 8)**:
  - **#2 Visible breadcrumbs**: new `components/Breadcrumbs.jsx` (visible trail + `BreadcrumbList` JSON-LD) wired into Community + Listing Detail pages. Live-verified: `Home › Communities › Greater Vancouver › Maple Ridge` and `Home › Listings › Pitt Meadows › 11761 190 Street`.
  - **#3 robots.txt (safer)**: Allow `/listings` (the search hub) to be indexed; keep `/listing/{key}` disallowed per CREA DDF Rule 3.1.
  - **#4 OG cache-bust**: `doogie-og.png?v=3 → ?v=4` forces FB/LinkedIn/iMessage to refresh cached previews.
  - **#6 Meta descriptions**: existing `SEO` component already pads via `syn.synopsis.substring(0, 200)` fallback — no change needed.
  - **#7 Central title/meta**: existing `SEO()` component (App.js:180) already centralizes title, description, canonical, hreflang, OG, Twitter, and schema — verified in use across pages. Deferred full 40-file title refactor.
  - **#9 FAQ 5→10**: community pages now emit 10 auto-generated Q&A patterns (added: avg price, investment/BCFSA disclaimer, commute, schools, best time to buy).
  - **#10 Alt text**: listing card `<img alt>` upgraded from `"street, city"` to `"{street} in {city} — {property_type} MLS® listing photo"` — richer image-search signal.
  - **#11 Speakable**: already emitted on glossary and community pages (verified in App.js).
  - **#12 loading="lazy"**: 40 `<img>` tags across App.js, DashboardMockup, ComingSoon, DoogieGPTPreview now lazy-load with `decoding="async"`.
  - **#16 AudioObject schema**: sizzle reels now emit `AudioObject` JSON-LD (Doogie's TTS narration). NOTE: swap to `VideoObject` when actual video reels ship.
  - **#20 Canonical normalization**: dynamic canonical script now strips trailing slash, drops `www.`, and drops query/fragment — consolidates PageRank on one hostname/path per page.
  - **Deferred (need external input)**:
    - **#1 GBP wiring** — awaiting Doug's Google Business Profile CID
    - **#18 PSI verification** — off-platform; run PageSpeed Insights mobile on top 5 URLs
    - **#19 Rich Results Test cron** — awaiting Google Search Console API credentials
- **New Doogie OG image (Feb 7)**:
  - Swapped iMessage / Facebook / LinkedIn / Slack link-preview image to the new "Doogie holding magnifying glass + laptop with EZtoFind.ca + DOOGIE wordmark" logo
  - `/app/frontend/public/images/doogie-og.png` (1200×630 OG spec on white) + updated `doogie-laptop.png` (1024² square) — both composited from the transparent-PNG source
  - `index.html` OG + Twitter tags now point at `/images/doogie-og.png?v=3` — the `?v=3` cache-bust forces re-fetch on FB/LinkedIn/iMessage caches

## Test Credentials
- Admin: `doug@eztofind.ca` / `Doug2026Login!`

## Backlog
- P0: Unit tests for `doogie_chat` helpers in server.py
- P1: Sizzle Reel French toggle (Canadian French welcome)
- P1: Community Trailer Video (15-sec shareable per sizzle reel)
- P1: Feature-Sheet Narrator (PDF/image upload + Doogie reads with highlight cursor)
- P1: Real Luxury/Horse Photos (swap placeholders once URLs provided)
- P1: Wire Google Review link (`/app/memory/review_links.md`) into consultation confirmation emails + admin dashboard widget
- P1: Heatmap — click-through neighborhood drill-down page (sparkline history, listing lookup, "Alert me when this neighborhood turns Hot" toggle)
- P1: Heatmap — public "Market Pulse" widget on `/market-report` embedding the top 5 hottest sub-areas (AEO signal)
- P1: Deploy — paste `/app/cloudflare_worker_prerender.js` into Cloudflare Workers (or `/app/nginx_prerender.conf` at ingress) to activate bot prerender routing on eztofind.ca **← SUPERSEDED. Emergent's built-in `crawler-cache` layer already serves prerendered HTML to bots.**
- P3: Move "Coming Soon" uploads to CDN/Object storage
- P3: Nightly narration regression cron
- P3: Rotate JWT_SECRET, RESEND_API_KEY, CREA DDF, Turnstile, Lovable to high-entropy values
- P3: Escape seller-lead HTML in admin email (server.py:1517)
- P3: Gate `/api/unsubscribe` with signed token
- P3: Add owner/token binding on `/api/realtors/{app_id}`
- Refactor: split server.py and App.js
