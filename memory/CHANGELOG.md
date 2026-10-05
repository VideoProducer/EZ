# EZtoFind.ca — Changelog

## June 2026 — Consent dashboard, policy bump, preference center (PIPA/CASL follow-ups)

- **Policy version bump:** `CURRENT_POLICY_VERSION` → `2026-06-05` (server.py:2063); privacy page "Last updated" already matches. New consents now stamp against the expanded policy. Verified new records carry policy_version 2026-06-05.
- **Admin Consent Dashboard** (`/admin/consent`, `AdminConsent` in App.js + sidebar nav `admin-nav-consent`): searches every `_DSAR_COLLECTIONS` store by email for an individual's full CASL/PIPA consent trail (type, pipa_ack, casl_consent, consent_at, IP, UA, policy_version, unsubscribed). Endpoints `GET /admin/consent-search` + `GET /admin/consent-export` (CSV), both `verify_admin`-gated (401 without auth, verified). Reuses `_consent_records_for()` helper.
- **Preference Center** (extends existing `/email-preferences`): added independent **Saved-search alerts** and **Weekly market digest (Friday)** toggles so subscribers can keep one and drop the other instead of all-or-nothing unsubscribe. New `saved_searches` booleans `alerts_enabled` / `digest_enabled` (missing = enabled). Endpoint `POST /email-preferences/saved-search`; GET returns `saved_search_prefs`. Logged to `unsubscribe_log`.
  - **Cron gating:** `alert_matcher` now requires `alerts_enabled != False`; `just_sold_digest` (Friday) + `sunday_night_digest` require `digest_enabled != False`. Verified: toggling digest off drops the search from digest eligibility (0) while alerts stay eligible (1).
- Verified end-to-end: preference GET/toggle + DB, admin search/export + auth gate, cron eligibility, both new UIs render (public prefs page + admin consent page). "Friday digest" maps to the `weekly_just_sold` digest.



## June 2026 — Privacy Policy audit + site-wide consent enforcement (PIPA/CASL)

- **Audit finding:** the `/privacy` page is NOT empty — it renders fully in both preview and production (~11k chars). The existing policy already covered Privacy Officer, PIPA rights, OIPC link, data residency, detailed retention, CASL consent records, breach, AI-use disclosure.
- **Added to `/privacy`** (`Privacy` component, `App.js`): ① a visible **Last updated: June 5, 2026** stamp + OIPC BC link; ② an itemized **"What personal information we collect"** list (name/email/phone, form submissions, saved searches + Friday digest email, Doogie chat, **IP address for rate-limiting/CASL proof**, cookies); ③ **"How we use your information"** (respond to inquiry, Friday digest/alerts, referrals, operate/secure/improve site); ④ **"Third-Party Sharing & CREA DDF® Listing Data"** explicitly stating DDF® data is licensed, not sold, and **may not be used to train/fine-tune AI/ML models**; ⑤ explicit **one-click unsubscribe** + `/unsubscribe` link in the CASL section. All additive — no existing content removed. Matches existing Legal design system.
- **Footer:** both `Footer` and `HomeNextFooter` already link `/privacy` (no change needed).
- **Consent checkboxes on lead forms:** buyer already had checkbox+link; added `/privacy` **links** to seller/valuation/referral consent labels (checkboxes were already `required`). `/contact` (luxury) and saved-search already gated. 
- **REALTOR® network applications (BC + out-of-province):** previously had NO consent checkbox. Added an enforced `required` consent checkbox — "By submitting, I agree to the Privacy Policy (PIPA)…" with `/privacy` link + JS gate (`realtor-pipa` / `realtor-oop-pipa` testids). Backend `/realtors/apply` + `/realtors/apply-oop` now require `pipa_ack` (400 if missing) and log the full CASL consent trail via `get_consent_meta()` (consent_ip, consent_ua, consent_at, policy_version) — reusing the existing helper, not a stub.
- **CASL logging status:** already real (not stubbed) for all `/leads/*` + `/saved-searches`; now extended to realtor applications. Verified: 400 w/o consent, 200 w/ consent, consent metadata persisted in `realtor_applications`.



(Appended chronologically. PRD.md holds the static problem statement/architecture; this file grows over time.)

## June 2026 — City hero rotates through real MLS® listing photos

- `CommunityPageMockupLive.jsx`: the hero backdrop now rotates through actual live CREA DDF® listing photos for that community (`data.listings[].photos[0]`), crossfading every 5s with page-dot indicators (top-right). Falls back to the region/default photo only when a community has no listing imagery. Applies to every `/community/:slug` (all communities/towns/cities). Verified live: Pemberton (Sea-to-Sky, desktop) + Surrey (Greater Vancouver, mobile 390px, no overflow) both loading real ddfcdn.realtor.ca photos.


## June 2026 — Referral copy edit on community/city/neighbourhood pages

- TL;DR block (`CommunityPageMockupLive.jsx`): removed the out-of-area sentence "Doug LeMaire, REALTOR® refers out-of-area buyers to a local {community} REALTOR® at no cost." In-area still shows "Doug LeMaire, REALTOR® covers {community} directly."
- (Follow-up) Also removed the in-area "Doug LeMaire, REALTOR® covers {community} directly." sentence from the TL;DR — the TL;DR is now purely factual market info with no agent line in any case. Verified live on /community/pemberton.
- (Follow-up 3) Removed the TL;DR answer block entirely from the city/community page template (`CommunityPageMockupLive.jsx`) + dropped the now-unused `TLDRBlock` import. Kept the "Last reviewed" stamp (feeds JSON-LD dateModified). Verified live on /community/mission.
- (Follow-up 4) Removed the term-linked "Buying in {community} typically involves…" glossary intro paragraph (`community-glossary-intro`) from the city/community template + dropped the unused `GlossaryProse` import. Page now flows hero → Spatial Context. Verified live on /community/mission.
- Replaced the out-of-area referral line everywhere it appeared (city hero card, bottom "Get connected" block, and neighbourhood-page referral banner in `App.js`) with the exact approved wording: "This is outside of Doug's region, however an introduction to a licensed REALTOR® is available." Buttons/links now read "Request an introduction".
- Retired the old "A vetted introduction … available at no cost" / "refers out-of-area … at no cost" phrasing from all visible community copy. (JSON-LD service description left factual/unchanged; legacy `/neighbourhood/:slug` component not in scope.)
- Verified live on /community/powell-river (hero + TL;DR via DOM text extraction).


## June 2026 — Apple-style redesign of community / city / neighbourhood pages (frontend-only)

- Scope: `/community/:slug` (city/town, `CommunityPageMockupLive.jsx`) + `/community/:slug/n/:nSlug` (neighbourhood, inline `NeighbourhoodPage` in `App.js`). `/communities` index (`CommunitiesNext.jsx`) already matched the target aesthetic → left unchanged. Backend untouched; all data fetching, routes, data-testids and CTAs preserved.
- Palette: retired gold (#F5A623) → single calm accent (Apple blue #0066CC / navy #0F2A5B). Ink #1D1D1F, muted #86868B, canvas #FBFBFD. Fonts unified to SF Pro system stack (removed Sora/Playfair from these components).
- City hero: replaced harsh dark-navy gradient box with a calmer photo hero (soft bottom scrim) + always-present region photo (new `REGION_HERO`/`DEFAULT_HERO` fallbacks). Stat strip → frosted glass metric bar; `DATA SOURCE` green emoji → Lucide CheckCircle2. Primary CTA → white pill w/ ArrowUpRight.
- Emojis retired site-wide on these pages (🏡🐾🤝🎥🟢📍) → Lucide icons (MapPin, Users, Video, ArrowRight, CheckCircle2, ArrowUpRight).
- Demographics card: replaced raw `<pre>{JSON.stringify(...)}</pre>` dump with a clean auto-parsed stat-tile grid (+ graceful "synchronizing" fallback).
- Land-use layers, FAQ accordion, sub-neighbourhood grid, listing cards, referral/buyer-seller CTA blocks all restyled to white cards / hairline borders / 22px radius / navy pills.
- Neighbourhood page: market snapshot → clean white Apple card (SF font, ink numbers); emojis removed.
- Verified: testing_agent iteration_40.json = 100% frontend pass (focus + out-of-area city, neighbourhood, index; desktop + 390px mobile; no overflow, no raw JSON, no emojis). Note: `nhb-faq` is conditional on a reviewed synopsis (content-driven, pre-existing).


## June 2026 — Calculator pages Apple polish + mobile checks + deploy

- Applied `apple-form` class to `/tools/mortgage-affordability` (`MortgageAffordabilityPage`) and `/tools/ptt-estimator` (`PTTEstimator`) — both already used `.paper/.field`, so they now get the white card + rounded inputs + navy pill look. Verified mortgage page via screenshot.
- Mobile check: `/buyer` verified at 390px — fields stack full-width, rounded inputs, no horizontal overflow. `/seller` shares the same `.apple-form` path.
- Decision: `/contact` kept as the bespoke `LuxuryQuietContact` luxury design (not restyled) — recommended to Doug.
- Deployed to eztofind.ca (Valuation polish, mobile hero tuning, audience separation, calculator polish).


## June 2026 — Valuation Apple polish + REALTOR® hero mobile tuning

- Applied `apple-form` class to the `/valuation` (`Valuation`) page — white card, rounded inputs, light-grey labels, navy pill button; Turnstile + compliance + data-testids untouched. Verified via screenshot.
- Added `.rn-hero`/`.rn-hero__img/__overlay/__body` classes + a `@media (max-width:640px)` block in index.css: taller hero (380px), stronger bottom gradient for legibility, framed handshake (object-position 60%), tighter padding. Verified at 390px (no overflow).
- `/contact` LEFT AS-IS: it's the bespoke `LuxuryQuietContact.jsx` (own refined "luxury quiet" styling, not the shared `.paper/.field` classes), so `.apple-form` doesn't apply and forcing it would clash. Flagged to user.


## June 2026 — Separate the two referral audiences

- Per Doug: keep consumer vs REALTOR® flows on completely separate pages. Removed the "I'm a buyer or seller" selector card from `/realtor-network`; it's now a single REALTOR®-only handshake hero ("Join Doug's referral network" → #apply, testid `realtor-network-hero`/`rn-apply-cta`). Updated the page SEO title/description to REALTOR®-only.
- Repointed the "Other BC Areas" top-nav item from `/realtor-network` → `/referral-request` so consumers land on the consumer page. REALTOR® discovery stays via footer "Join the REALTOR® Network". Verified via screenshot.


## June 2026 — Selector cards, About note, buyer/seller Apple polish + deploy

- **Selector cards**: replaced the `/realtor-network` text chooser + consumer band with two large image-backed cards (coastal BC home → "I'm a buyer or seller" → /referral-request; handshake → "I'm a REALTOR®" → #apply), navy gradient overlay, Playfair labels. testids `rn-choose-consumer`/`rn-choose-realtor` preserved.
- **About note**: added subtle "Are you a REALTOR® licensed outside BC? Join my referral network →" line (→ /realtor-network#apply, `about-realtor-join`) to the About Doug page.
- **Buyer/Seller Apple polish**: added reusable `.apple-form` rules to index.css and applied `apple-form` class to `BuyerForm` + `SellerForm` sections (white card, rounded inputs, light-grey labels, Playfair headline, navy pill). Presentation only — all i18n, Turnstile, compliance notices, PIPA, data-testids untouched.
- Verified via screenshots (cards, buyer form); deployed to eztofind.ca.


## June 2026 — /referral-request Apple-style polish (presentation only)

- Scoped a `.ref-apple` wrapper + `<style>` override on the consumer `ReferralRequest` page: white card (`.paper`), hairline rounded 12px inputs/selects/textarea with navy focus, light-grey labels, Playfair navy headline, navy pill primary button. NO logic touched — i18n `t()` keys, Turnstile widget, intent buttons, the "under contract with another REALTOR®" Article-16 block, PIPA consent, and every data-testid are unchanged. Verified via screenshot; both referral flows now feel consistent.


## June 2026 — Slim footer on /realtor-network

- Added `slimFooter` prop to `AppLayout` (renders `HomeNextFooter` instead of the big legacy `Footer`); applied to the `/realtor-network` route so its footer matches the other Apple-style pages. Imported `HomeNextFooter` into App.js. Verified via screenshot.


## June 2026 — /realtor-network Apple-style redesign + title fix

- Fixed missing `<title>` on `/realtor-network` (was inheriting site default "BC Real Estate Search"); added `<SEO>` → "Join Doug's BC REALTOR® Referral Network — Out-of-Area Referrals | EZtoFind.ca".
- Reimagined the page frontend Apple-style (backend/forms untouched): whitened hero, restyled `RealtorApply` + `RealtorApplyOutOfProvince` into clean white cards — Playfair headlines, light-grey floating labels, rounded 12px inputs, pill Yes/No CREA selector, navy "Apply to join" pill button, soft shadows. All form fields, state, `data-testid`s and submit endpoints (`/realtors/apply`, `/realtors/apply-oop`) preserved. Subtler grey "OR — LICENSED OUTSIDE BC?" divider. Verified: compiles, no overflow, title correct.


## June 2026 — REALTOR® sign-up discoverability (a+b+c+e)

- **(b) Two-choice chooser** at the top of `/realtor-network`: "I'm a buyer/seller — get a referral" (→ /referral-request) vs "I'm a REALTOR® — apply to join ↓" (jumps to `#apply`). Wrapped the BC apply form in `<div id="apply">`; added a hash-scroll effect (useLocation) so `#apply` deep-links scroll to the form.
- **(c) Shareable alias**: `GET /join` → `<Navigate to="/realtor-network#apply">` for LinkedIn/email/outreach. Verified it lands + scrolls to the application form.
- **(a) Agent footer link**: legacy AppLayout footer "For REALTORS®" relabelled "Join the REALTOR® Network" → `/realtor-network#apply` (`footer-join-network`); HomeNext footer also gained "Join the REALTOR® Network".
- **(e) Consumer footer link**: HomeNext footer gained "Request a Referral" → /referral-request (legacy footer already had "Referral (Out-of-Area)").
- Both audiences now have clear, distinct, shareable entry points. Preview-verified; not yet deployed (prior deploy covers earlier work).


## June 2026 — Out-of-area results banner, "Other BC Areas" nav, referral-click tie-in + deploy

- **(b) Results banner** on `/listings`: when an out-of-area search DOES return listings (Kelowna, Victoria…), a slim dismissible strip appears above results — "Looking in <area> — outside Doug's region? … Get a referral →" (`ln-ooa-banner`). Resets when the area changes.
- **Nav entry**: added "Other BC Areas" → `/realtor-network` to the global HomeNextNav (`hn-nav-other-areas`).
- **Referral-click tie-in**: the `/listings` referral CTAs (empty-state + banner) now POST `/api/analytics/referral-click` with the (title-cased) searched city, so they flow into the referral dashboard's click-interest. Relabeled that dashboard section to "Referral-link clicks by searched city". Verified: a Kelowna banner click appeared in `click_interest_by_city` (30-day window).
- **Deployed** to eztofind.ca (redeploy). Prod requires `WEBHOOK_CRON_SECRET`; the Sunday cron syncs on deploy.


## June 2026 — Out-of-area referral link placement (a + d)

- New shared helper `/app/frontend/src/lib/serviceArea.js` (FARM_SLUGS, FOCUS_HOODS, `isFarmArea`) — mirrors App.js's inline region sets so public pages can detect out-of-area searches.
- **(a) `/listings` empty-state referral CTA**: when a search for an out-of-area place returns zero homes, show a "Searching outside Doug's home turf?" card → "Get matched with a local REALTOR®" linking to `/referral-request?city=<searched area>` (prefilled). Gated by `isFarmArea` so in-region searches (e.g. Kitsilano) never trigger it; drawn-box empties show the generic message. (`ListingsNext.jsx`, testids `ln-empty-referral`, `ln-empty-referral-cta`)
- **(d) `/realtor-network` consumer CTA band**: prominent navy band at the top of the (otherwise REALTOR®-recruitment) hub — "Buying or selling outside Greater Vancouver? Get matched with a vetted local REALTOR® — at no cost to you" → "Request an out-of-area referral →" (`/referral-request`). (`App.js` `RealtorNetwork`, testids `realtor-network-consumer-cta`, `realtor-network-referral-btn`)
- Note: the empty-state CTA only fires on zero-result searches; out-of-area towns that DO have DDF listings are caught by the hub band + footer "REALTOR® Network" link.


## June 2026 — Sunday digest cron, Alert Analytics, Map-Draw search, Community speed

- **Match-Alert Digests (scheduled)**: added `.emergent/crons.yml` → `POST /api/cron/sunday-night-digest` (Sun 6pm America/Vancouver). Cron endpoint checks `WEBHOOK_CRON_SECRET` (new backend/.env key) with `hmac.compare_digest`, dedupes via `cron_runs` + `X-Webhook-Id`, acks 2xx and backgrounds `run_sunday_night_digest`. The save-search modal now opts users into the Sunday brief (`frequency='sunday_night'` → `digest_frequency='sunday_night'`); digest still only emails explicit opt-ins (per user choice). NOTE: cron syncs to **production on the next deploy**.
- **Alert Analytics**: new `GET /api/admin/saved-searches/analytics` (totals, confirmed/active, confirmation rate, Sunday opt-ins, briefs sent, pending, unsubscribed, demand-by-area, recent masked signups). New `SavedSearchAnalyticsPanel` renders directly below the referral dashboard on `/admin/referral-requests`.
- **Map-Draw Search**: on `/listings`, "Draw area" (`ln-draw-toggle`) lets buyers drag a rectangle on the Leaflet map; `visibleItems` filters cards+markers to the box, count shows "N homes in your drawn area". Saving includes `filters.bbox`. `_match_filters` (just_sold_digest.py, shared by Sunday digest) now supports `price_min`, `baths_min`, and `bbox` (lat/lon box); Sunday-digest projection now pulls `lat`/`lon`.
- **Community Page Speed**: `CommunityPageMockupLive.jsx` now fires all 6 fetches in ONE `Promise.allSettled` batch (deslugified city guess removes the stats-first round-trip; listings refined in background if canonical name differs) and shows a shimmer skeleton (`community-skeleton`) instead of a text loader.
- **Verified**: testing agent 100% — frontend flows + 6/6 backend pytest (`/app/backend/tests/test_sunday_digest_and_analytics.py`), `/app/test_reports/iteration_36.json`.


## June 2026 — Promote Apple-style search to /listings, save-search lead capture, referral dashboard, deploy

- **Promoted search**: `/listings` now renders the Apple-style `ListingsNext` (was legacy `Listings`). Page is now `index, follow` with SEO title "Search BC MLS® Real Estate Listings — Homes for Sale in British Columbia | EZtoFind.ca" + canonical `https://eztofind.ca/listings`. `/listings-next` now `<Navigate replace>` → `/listings`. `ListingsNext` reads `?q=` and `?city=` from the URL (hero/band/footer links work unchanged). Legacy `Listings` component left defined but unrouted. (`App.js` routes ~13699-13703; `ListingsNext.jsx`)
- **Save-search lead capture**: "Save this search & get alerts" button (`data-testid=ln-save-search`) in the results bar opens a modal (`ln-save-modal`) — email + frequency (instant/daily/weekly) + CASL consent + PIPA ack checkboxes. Posts current filters to the existing double-opt-in `POST /api/saved-searches`; shows inbox-confirmation success state. Validation blocks submit without both consents. (`ListingsNext.jsx`)
- **Referral Tracking Dashboard**: new `ReferralRequestsPanel` reading `GET /api/admin/referrals/requests-summary?days=` (metric cards: total/in-window/unique-cities/click-interest; by-city bars; click-interest chips; recent table; 30/90/180/365 day selector). Available BOTH as standalone page `/admin/referral-requests` (new sidebar nav `admin-nav-referral-requests`) AND as an "Incoming Requests" tab inside `/admin/referrals` (default tab "Referral Network"). (`App.js`: panel + `AdminReferralRequests` defined before `AdminReferrals`; tab state in `AdminReferrals`)
- **Verified**: frontend testing agent 100% (7/7 flows) — `/app/test_reports/iteration_35.json`; backend summary endpoint curl-verified. Deployed to eztofind.ca.
- Note: pre-existing non-blocking console hydration warning (`<span>` inside `<option>` from visual-editor instrumentation) persists app-wide; not introduced here.


## June 2026 — Home-page search placement for traffic & leads

- **`<title>`** on `/` set to the keyword-rich `Search BC MLS® Real Estate Listings — Live CREA DDF® Feed | EZtoFind.ca` (`/listings` already had it).
- **Hero** (`HomeNextHero`): eyebrow strengthened to "Search live BC MLS® listings · CREA DDF® feed"; the existing hero search field (routes to `/listings?q=`) is the primary above-the-fold action.
- **Mid-page band** added in `HomeNext.jsx` after Featured: "Browse BC listings by community" with "Search all listings" → `/listings` and "Browse by community" → `/communities".
- **Footer**: added "Search BC listings" → `/listings` link (`HomeNextExtras` footer row).
- Verified in-browser: title, hero search, mid band, footer link all present, zero console errors.


## June 2026 — Header/disclaimer cleanup, region auto-detect, referral API, region images

- **Compliance strip** (App.js `ComplianceStrip`): shrunk from 1.28rem bold to 0.72rem regular-weight — a thin one-line disclaimer at the very top of every page.
- **Conversion strip removed** site-wide (the "Talk to Doug — What's my home worth? / Tell Doug…" band) — dropped from `AppLayout`.
- **"§N ·" section markers removed** from all rendered content (17 kickers across `CommunityPageMockup.jsx` + `CommunityPageMockupLive.jsx`); statute refs (§3.1, §9) and code comments untouched.
- **Region auto-detect (backend)**: new `GET /api/service-area?place=` inverts `communities_seed.json` (+ live-listing parent-city fallback + substring) → `{region_group, in_area}`. Verified: Kitsilano/University/Squamish → in_area true; Kelowna/Victoria/Nelson → false. No neighbourhood hand-listing needed.
- **Referral dashboard (backend)**: new admin `GET /api/admin/referrals/requests-summary` → total out-of-area referral requests + by-city breakdown (parsed from buyer/seller lead OUT-OF-AREA marker) + `click_interest_by_city` from `referral_click_events`. Verified (shows live click interest: Kelowna 7, Victoria 3, Nelson 1).
- **Communities region images**: Haida Gwaii / Central Coast / Cariboo had no image and fell back to a wrong "camera" photo; added proper BC imagery (`CommunitiesNext.jsx` REGION map). Verified rendering.

STILL PENDING (from the 4-item request): referral dashboard admin PAGE (frontend, backend ready); promote `/listings-next` → live `/listings` (needs TermsGate + URL params + index + referral empty-state); deploy to production.


## June 2026 — Fix mis-scoped Referral REALTOR® + remove "sample listings" wording

- **Referral CTA scoping**: Added a `FOCUS_HOODS` set (Vancouver neighbourhoods — Kitsilano, Kerrisdale, Point Grey, UBC/University Endowment Lands, etc. — plus key Metro/Fraser Valley sub-areas) mirrored in `App.js` and `CommunityPageMockupLive.jsx`. `isFarmCity()` (listings empty-state, App.js) and `isFocus` (community page) now treat these as IN-AREA. Result: an in-region neighbourhood like Kitsilano shows "Doug represents … directly" (no referral); only genuinely out-of-region places (Kelowna, Victoria, Interior/Island/Kootenays) show the Referral REALTOR® CTA. Verified via Playwright: Kitsilano→directRep, Kelowna→referral.
- **"sample listings" removed**: Relabeled `{n} sample listings in {community}` → `{n} live MLS® listing(s) in {community}` in `CommunityPageMockupLive.jsx` + `CommunityPageMockup.jsx`. These were always REAL CREA DDF listings (confirmed `using_mock_data=false`, 613 real New Westminster listings) — only the label was wrong. Reworded the dormant `using_mock_data` "DEMO MODE — sample listings" banner in App.js to drop the word "sample."
- These changes are on the live (non-`-next`) pages; not yet redeployed.


## June 2026 — Apple-style property search preview (/listings-next)

Built the reimagined BC Real Estate Search as a `noindex` preview (backend untouched):
- New `pages/ListingsNext.jsx` at `/listings-next`; lazy route + `HomeNextNav`/`HomeNextFooter` shell.
- Wired to live `GET /api/listings` (43,396 homes) with debounced `q`, and filters `city`, `property_type`, `beds_min`, `baths_min`, `price_min`/`price_max`, `sort`; facets from `GET /api/listings/meta/facets`; offset/limit "Show more" pagination. Cards link to `/listing/{listing_key}`.
- Calm navy hero + big pill search, clean pill-select filters, split view: property-card grid (real CREA DDF® photos, navy price, address, beds·baths·sqft, gold "Source: CREA DDF®" tag, save-heart in localStorage, photo-count badge) + vanilla-Leaflet map with navy price-bubble markers & popups.
- Map tiles: **Esri World Light Gray Canvas** (keyless, clean Apple-Maps look) — note CARTO basemaps now require an API key, so avoid them.
- Responsive: ≤900px collapses to single column with a floating List/Map toggle.
- Verified via Playwright (desktop 1440 + mobile 390): 24 cards, 24 map markers, tiles load, photos load (20/24 above-fold), 7 filters, list/map toggle works, zero horizontal overflow. (One dev-only visual-editor `<span>`-in-`<option>` warning — stripped in production builds.) Not yet redeployed.


## June 2026 — Apple-style header (HomeNextNav) adopted site-wide

- Replaced the old `<Nav/>` + `<BackHomeBar/>` in `AppLayout` (App.js) with `<HomeNextNav/>` so the compact Apple-style header (Back|Home pills · logo · Doug identity · Buy/Sell/Luxury/Equestrian/Communities/Glossary · "Talk to Doug") now appears on every standard route. The `-next` pages already used it.
- Made `homeNext.css` global (imported in App.js) and declared the `--hn-*` CSS variables directly on `.hn-nav` so the nav styles/variables resolve without a `.hn` ancestor (avoids breaking its `position:sticky` and the `.hn{min-height:100vh}` gap). CSS is safely scoped under `.hn`/`.hn-*`, no bleed.
- Per user choice (option a): dropped About / Market Estimate / Relocating / Favorites / Tools / REALTOR® Network from the top nav. BCFSA Licence #167790 stays on the footer; REALTOR® Network link added to `HomeNextFooter` (already present in the main `Footer`).
- Removed `<BackHomeBar/>` from AppLayout (HomeNextNav carries its own Back|Home pills). Old `Nav`/`BackHomeBar`/`ToolsDropdown` remain defined but unused.
- Verified via Playwright: `/glossary` + `/listings` render the new sticky header, navy CTA, no old `.nav-links`, footer has realtor-network + 167790, mobile burger = flex, zero console errors. Not yet redeployed.


## June 2026 — Apple-style Glossary preview (/glossary-next)

Built the reimagined glossary as a `noindex` preview route (backend untouched):
- New `pages/GlossaryNext.jsx` at `/glossary-next`; lazy route + `HomeNextNav`/`HomeNextFooter` shell, `homeNext.css`.
- Wired to the live `GET /api/glossary` (440 real terms) — calm centered hero + big pill search, A–Z jump index (with `#` for numeric terms, greyed inactive letters), dynamic category filter chips, clean term cards (navy term, 3-line definition, warm-gold category/source tag w/ external-link icon) linking to the real `/glossary/{slug}`, sticky letter markers.
- Muted palette: white / navy / soft-blue accent, gold reserved only for source tags.
- Verified via Playwright on desktop (1440) + mobile (390): 440 cards, 33 chips, hero, correct title, zero console errors. Not yet redeployed to production.


## June 2026 — Retired the Doogie chat page site-wide

Per user request, fully removed the standalone Doogie chat experience:
- **Routes deleted** → now 404: `/visual-agent-demo` (`VisualAgentDemo.jsx`) and `/visual-agent-demo-next` (`VisualAgentDemoNext.jsx`). Lazy imports removed from `App.js`; page source files left orphaned (unbundled).
- **Home band removed**: the `HnDoogie` "Ask Doogie / Doogie provides helpful information / Start a chat" section pulled from `HomeNext.jsx` (and its import).
- **Leftover links cleaned** (no dead links): same `HnDoogie` band removed from `AboutNext.jsx` + `EquestrianNext.jsx`; "Ask Doogie a research question" buttons removed from the buyer/seller/valuation thank-you screens in `App.js`; inline `<VisualAgentDemo/>` embed removed from the legacy `/classic-home` (`Home`) component; the `DoogieOnboarding` "Start hands-free kiosk tour" button (which navigated to the demo) removed; the Compliance disclosure page's dead `/visual-agent-demo` link de-linked (text kept).
- **Kept**: the site-wide floating `DoogieChat` widget (separate from the retired page) remains on Home/About/Equestrian.
- Verified via Playwright: both routes return the 404 view; Home/About/Equestrian render with no console errors and no "Doogie provides helpful information" band. NOTE: not yet redeployed to production (eztofind.ca) — needs a redeploy.


## June 2026 — Doogie page cleanup + SEO indexing + admin Hide-from-site

**#1 Doogie page (`/visual-agent-demo`, `VisualAgentDemo.jsx`)** — Removed the navy hero banner (title/avatar/pills/waveform/Scripted-Live/Ask-by-voice/Pause/Restart) AND the white persistent search bar. Page now opens: compliance strip → Chat with Doogie embed. Fixed stale "Ask by voice at the top-right" hint in `visual-agent/PaneSearch.jsx` → "Tap the mic in the search box".

**#2 SEO indexing** — Promoted pages `/communities`, `/about`, `/specialties/luxury`, `/specialties/equestrian` switched from `noindex,nofollow` to `index, follow` (both the Helmet meta and the runtime useEffect in each `*Next.jsx`).

**#3 Admin Hide-from-site toggle** — New admin-only endpoints in `server.py` (~L2788): `GET /api/admin/listings/{key}/visibility`, `POST .../hide`, `DELETE .../hide`. Reuses existing `hidden_listings` Mongo collection + `_get_hidden_mls()` cache (busted immediately on toggle). Hiding also sets the local row `status=Sold`. Public exclusion added to the MLS-direct-lookup branch in `search_listings` (was leaking hidden listings on direct MLS paste). UI: "Site visibility" panel + one-click toggle on `AdminHydrateListing.jsx` (data-testid `hide-from-site-panel`/`-status`/`-toggle`/`-msg`). Verified 100% by testing_agent (iteration_34): hidden → public search total=0 + detail HTTP 410; unhide restores via direct MLS search.


## June 2026 — PIPA erasure + PII-access audit log + advertising cleanup

**#1 PII-access audit log (PIPA s.34/35)** — `backend/server.py` `_log_pii_access()` + `pii_access_log` collection. `GET /api/admin/contacts/{type}/{id}` now records each view (admin_email, action, source_type, contact_id, **SHA-256 email hash** — not raw PII, IP, user-agent, timestamp). Append-only.

**#2 Right-to-erasure (PIPA s.23)** — new `POST /api/admin/contacts/{source_type}/{contact_id}/purge` (admin-gated). Hard-deletes lead (buyer/seller/referral) + contact_stages + contact_stage_history + contact_notes; **anonymizes** email_outbox recipients (`to` → `erased:<hash>`, `pii_erased=true`) to satisfy CASL s.6/BCFSA send-record retention while removing PII. Writes immutable `erasure_log` attestation (admin, hashed email, per-collection counts, reason, IP). Verified E2E: throwaway lead erased → 404, logs written, zero raw-email leftovers.

**#3 SMS/CASL — N/A by design.** `_notify_lead_sms` (server.py:1476) only texts the operator's own `LEAD_ALERT_TO_NUMBER`, never consumers → no consumer CASL consent/STOP obligation. Documented; must be added if consumer texting is ever introduced.

**#4 Advertising cleanup** — replaced placeholder `"Sample BC Listing Brokerage"` in `EquestrianChecklistMockup.jsx` with DDF-compliant `"Listing Brokerage (see REALTOR.ca)"`. Confirmed BCFSA/CREA trademark + licensee notice renders via both site footers (`AppLayout` App.js:1312 and `HomeNextFooter` HomeNextExtras.jsx:81/95).

Not yet deployed to production.


## June 2026 — Glossary source link-health fix + Last-verified + tighter mapping

**(a) Link-health audit & fixes** — checked all 53 unique glossary source URLs. Government portals (www2.gov.bc.ca, canada.ca, crtc.gc.ca) bot-block server-side requests but are valid in-browser (left unchanged). Fixed 8 genuine 404s in `backend/glossary_sources.py`, each re-verified 200:
- Real Estate Services Rules → BC Laws `209_2021`; SVT Act → `18046`; Building Act → `15002`; Manufactured Home Act → `03075_01` (SBC 2003 c.75, old RSBC 1996 c.280 was repealed); BCFSA rules & forms pages → current BCFSA URLs; OSFI B-20 → current guidance-library URL; CREA REALTOR® Code → `/standards-programs/realtor-code/`; CRT strata → `/solution-explorer/strata/`.

**(b) Per-term "Last verified" + tighter keyword→source mapping**
- Added `SOURCES_LAST_VERIFIED = "2026-09-30"` in `glossary_sources.py`; `GET /api/glossary/{slug}` now returns `sources_last_verified` (per-term override respected). Frontend `SourcesBlock` (App.js) renders a "Source links last verified <date>…" line (`data-testid=sources-last-verified`), passed on the glossary term page.
- Expanded `TERM_KEYWORD_OVERRIDES` from ~55 to **118** entries (strata, land title, zoning/OCP, tenancy, foreclosure, REDMA/presale, agency, mortgage/CMHC/OSFI, BC Assessment, probate, insurance, etc.) so far more terms resolve to an exact-authority citation instead of a category default. Specific keywords kept ahead of generic ones (first-match wins).

**Verified**: module loads (118 overrides), `/api/glossary/agricultural-land-reserve-alr` & `/strata-lot` return real sources + `sources_last_verified: 2026-09-30`; frontend compiles; glossary term page renders the Authoritative Sources block. Not yet deployed to production.


## June 2026 — 90-day price-trend sparklines (Buyer + Seller Insights)

- Added `buildTrendSeries(seedStr, endValueM)` + `parseMedianM()` to `visual-agent/constants.js`. Series is community-seeded (stable, distinct per place) and its final "Now" point is anchored to the community's REAL current median from `GET /api/insights` (`median_list_price/1e6`); preceding weeks are illustrative.
- Buyer pane (`PaneBuyerInsights.jsx`): existing sparkline now anchors to the live median + labelled "Illustrative — anchored to today's CREA DDF® median, not a forecast" (`data-testid=buyerinsights-sparkline`).
- Seller pane (`PaneSellerLookup.jsx`): added the same sparkline block after the stat cards (`data-testid=sellerlookup-sparkline`).
- Data note: no real per-community daily series exists (only 2 `market_reports` monthly docs; `price_snapshots`/`community_price_history` empty), so the historical path is illustrative and clearly disclaimed — the current median is real.
- Verified iteration_33 — 100%: Kelowna $0.80M, Vancouver $1.35M, Surrey $1.05M (match live medians), distinct shapes, no regression.


## June 2026 — Doogie chat on agent page, route promotion, insights deep-link

- **Real Doogie chat on `/visual-agent-demo`**: embedded the working `DoogieChat mode="embedded"` (Claude via Emergent LLM key, multi-turn `session_id`, `POST /api/doogie/chat`) inside `[data-testid=visual-agent-doogie-embed]`, just above the scenario tabs. `VisualAgentDemo.jsx` now imports `DoogieChat` from `../App`. Verified iteration_32 — streamed a full strata-fees reply.
- **Preview pages promoted to live routes** (`App.js`): `/communities`→CommunitiesNext, `/about`→AboutNext, `/specialties/luxury`→LuxuryNext, `/specialties/equestrian`→EquestrianNext (all lazy + Suspense/RouteFallback). `-next` URLs kept as aliases. Shared nav (`HomeNextHero.jsx`) canonicalized: Luxury→/specialties/luxury, Equestrian→/specialties/equestrian.
- **Insights → listings deep-link**: Buyer/Seller Insights panes now show "View live listings in {City} →" (`buyerinsights-view-listings` / `sellerlookup-view-listings`) linking to `/listings?city={City}` once an area is chosen. `PaneBuyerInsights.jsx`, `PaneSellerLookup.jsx`.
- **Verified**: testing agent iteration_32 — 8/8 frontend PASS (chat, 4 promoted routes, nav hrefs, both deep-links).
- **Deploy**: redeploy to eztofind.ca dispatched (job f3171ad7) — running async.
- **Deferred (optional)**: physical deletion of the now-inert kiosk overlay JSX in `VisualAgentDemo.jsx` — skipped to avoid regression risk right before deploy; kiosk is already fully removed from the UX (button gone, overlay never renders even on `?kiosk=1`).


## June 2026 — Tiles centering, Doogie mascot → nav, Kiosk removal

- **"Two ways to start" centering**: the 2 tiles were left-aligned in a 3-col grid; added `.hn-tiles--2` (2 cols capped 380px, `justify-content:center`; stacks full-width ≤960px). `HomeNextTiles.jsx` + `homeNext.css`. Verified iteration_29 (equal 330px gaps at 1440px).
- **Doogie mascot relocated**: removed the large laptop-Doogie from the home hero; added a small ~30px version beside the "Doogie" top-nav link (`.hn-nav__doogie`). `HomeNextHero.jsx` + `homeNext.css`. Verified iteration_30 (no overflow 1440/1200/390).
- **Kiosk removed** from `/visual-agent-demo`: deleted the Kiosk button, forced `kioskMode` off, disabled the fullscreen overlay render (`{false && kioskMode && …}`), and dropped `?kiosk=1` from the homepage onboarding tour (`App.js` startTour). Verified iteration_31 (button + overlay absent even on `?kiosk=1`; other controls intact). NOTE: dead kiosk overlay JSX left in place (inert) — optional future cleanup.


## June 2026 — Doogie images, area type-ahead, nav overlap fix

**What shipped**
- **Landing hero mascot**: added the transparent "Doogie holding a house-magnifier + EZtoFind.ca laptop" image (`/images/doogie/doogie-laptop-hero.png`, from asset "Doogie Magnifying Glass Transparent.png") centered at the top of the home hero. Component: `components/homenext/HomeNextHero.jsx` (`data-testid=hn-hero-mascot`); CSS `.hn-hero__mascot` in `homeNext.css`.
- **Thinking Doogie on `/visual-agent-demo`**: the hero avatar now renders the transparent "thinking" Doogie (`DOOGIE.thinking`) instead of the old circular headshot crop. `pages/VisualAgentDemo.jsx` (~line 1087); removed unused `DOOGIE_HEADSHOT` import.
- **Area type-ahead**: Buyer/Seller Insights area inputs now use a native `<datalist>` of 82 BC communities (`BC_COMMUNITY_SUGGESTIONS` in `visual-agent/constants.js`) — `buyer-bc-communities` / `seller-bc-communities`. Pick a community in one tap.
- **Nav overlap fix**: `.hn-nav__id` (Doug LeMaire, REALTOR®) now hides at ≤1180px and `.hn-nav__links` gap tightened (18px, `white-space:nowrap`) so it never collides with the Buy/Sell links. `homeNext.css`.

**Verification**: testing agent iteration_28.json — 100% frontend pass. Mascot renders (1536px), no nav overlap at 1440/1200/1024, no horizontal overflow at 390/1024/1200/1440, thinking avatar renders, both datalists expose 82 options incl. Kelowna/Surrey/Victoria/Prince George/Vancouver, header/stat regressions still pass.


## June 2026 — Area input on Buyer/Seller Insights panes (`/visual-agent-demo`)

**Why**: User reported the "Buyer Insights" and "Seller Insights" scenario panels on `/visual-agent-demo` had no place to enter which BC area/community they wanted insights for (area was only inferred from the top search bar).

**What shipped**
- `frontend/src/pages/visual-agent/PaneBuyerInsights.jsx` and `PaneSellerLookup.jsx`: added a dedicated area `<form>` (MapPin icon + text input + navy submit button) at the top of each pane. Testids: `buyerinsights-area-input` / `buyerinsights-area-submit` ("Get insights"), `sellerlookup-area-input` / `sellerlookup-area-submit` ("Get seller insights").
- Effective city = typed area || `focusCity` (search bar) || rotating region. Typing a city + submit re-fetches `GET /api/insights?city=<area>` (live CREA DDF) and updates the header + stat cards. Buyer header now reads "Buyer snapshot · <City>"; seller header "Comparable actives · <City>". Falls back to illustrative rotating figures when a city returns 0 active listings.

**Verification**: testing agent iteration_27.json — 100% frontend pass (inputs present, headers update, Kelowna active=2092 live, Surrey active_comps=4397 live, out-of-area does not crash).

**Still pending (user's earlier image-placement asks, not yet done)**: place "Doogie Laptop" image in the landing-page (`/`) header/hero, and confirm "Doogie Thinking" on `/visual-agent-demo`. Navbar "REALTOR® / Buy" overlap fix + button-consistency check also still open.


## June 2026 — Doogie Interactive Agent (Apple-style) at `/visual-agent-demo-next`

**What shipped**
- New preview page `frontend/src/pages/VisualAgentDemoNext.jsx` — an Apple-style front end for the Doogie AI agent, built on the shared `homenext` design system (HomeNextNav + HomeNextFooter, `hn-*` tokens).
- Reuses the existing, already-tested chat engine unchanged: renders `<DoogieChat mode="embedded"/>` (from `App.js`) inside an Apple-styled "stage" card. Zero duplication of chat/voice/TTS/streaming logic.
- Sections: hero (eyebrow + big title + white-eyes `doogie-thinking.png` mascot + compliance micro-line), prompt-starter chips, embedded chat stage, "What Doogie can do" capability tiles (lucide icons), buyer/seller handoff CTA, RESA/PIPA/CREA compliance fine print.
- Prompt-starter chips drop text into the chat input via a new `window` CustomEvent `ez-doogie-ask`, handled by a small listener added inside `DoogieChat` (`App.js`, near the `ez-open-doogie` listener).
- CSS: `.hn-agent*` block appended to `components/homenext/homeNext.css`, including a scoped re-skin of the embedded Doogie panel (`.hn-agent .doogie-panel-embedded ...`) to the Apple aesthetic (white header, rounded bubbles, pill input) without touching the shared component.
- Route added in `App.js`: `/visual-agent-demo-next` (lazy, noindex/nofollow preview). Original `/visual-agent-demo` (VisualAgentDemo.jsx) left untouched.

**Verification**
- Testing agent (iteration_22.json): 100% of listed acceptance criteria passed — page renders (not stuck on Suspense), consent gate works, chip populates input, SSE assistant reply streams & renders, listing-search query submits, zero horizontal overflow at 390px.
- Lazy chunk `src_pages_VisualAgentDemoNext_jsx.chunk.js` serves HTTP 200 via localhost and the preview proxy; clean webpack compile.

**Notes for next agent**
- The internal screenshot tool captures the brief `Loading…` Suspense fallback for this app's lazy routes (returns an early frame regardless of in-script waits). Use the testing agent or `wait_for_selector('[data-testid="visual-agent-next"]', timeout>=20s)` for reliable visual checks.
- Assistant message bubbles still lack a dedicated `data-testid` (shared component) — optional future improvement for test reliability.
- Deployed together with the earlier late UI tweaks (mobile hamburger menu, testimonial font, white-eyes Doogie on `/`) that missed the previous deploy.

## June 2026 — Apple-style BC Communities index at `/communities-next`

**What shipped** (backend untouched — same `GET /api/communities` `{region:[names]}` payload)
- New page `frontend/src/pages/CommunitiesNext.jsx` on the `homenext` design system: hero (eyebrow + "Explore BC communities." + live-count subtitle), Apple pill search field with clear button, glassy sticky region segmented control (All + 12 regions), cinematic per-region image bands, and a responsive grid of typographic community cards linking to the existing `/community/{slug}` detail pages.
- Honours the page's "live climate data" promise: each region band shows a LIVE current-temperature chip (pulsing green dot) fetched from the existing `GET /api/community/{slug}/forecast` (one representative city per region) — no per-community weather calls.
- Region bands use real landscape photos: Greater Vancouver / Fraser Valley / Sea-to-Sky / Vancouver Island (existing shared assets), plus curated Unsplash/Pexels shots for Sunshine Coast, Okanagan, Southern Interior, Kootenay, Northern BC. Cariboo / Central Coast / Haida Gwaii use a shared BC default.
- CSS: `.hn-comm*` block appended to `components/homenext/homeNext.css`. Route `/communities-next` (lazy, noindex preview) added in `App.js`. Live `/communities` page left untouched.

**Verification**
- iteration_23.json: testing agent found + fixed a CRITICAL `<Helmet><title>` crash (mixed string+expression children white-screened the page) — fixed by wrapping the title in a single template literal. 100% functional pass after fix (240 communities across 12 regions, filter/search/clear/empty, card nav, live weather, zero 390px overflow).
- iteration_24.json (post design tweaks): 100% — all 13 tabs show full labels (no ellipsis; scrollWidth==clientWidth), 9 distinct region band images confirmed, live weather chips on all 12 regions, desktop tabs wrap to 2 rows / mobile scrolls horizontally, no page overflow. Subjective read: "clean and Apple-like."

**Notes**
- LESSON: `react-helmet-async` `<title>` must receive a SINGLE string child — never `{`...${x}...`}` split as string+expression+string. Use one template literal. Worth auditing other Helmet titles.
- Not yet deployed — preview route for Doug's review before promoting to the live `/communities`.

## June 2026 — Back & Home controls on all Apple-style pages

- Added a compact **Back** button (browser `navigate(-1)`) and **Home** link (→ `/`) to the top-left of the shared `HomeNextNav` (`components/homenext/HomeNextHero.jsx`), so they appear on every `-next` page (home, valuation, about, luxury, equestrian, communities, Doogie). Labels on desktop; icon-only pills on mobile (<640px). Styles under `.hn-nav__jump` / `.hn-nav__jumpbtn` in `homeNext.css`.
- Fixed a latent click-interception bug surfaced by the new Back button: the mobile burger checkbox `.hn-nav__toggle` (position:absolute; opacity:0) overlaid the nav and swallowed real mouse clicks on the Back button. Changed it to `display:none` — the mobile menu still toggles via `label[for]` + `:checked ~ .hn-nav__links`, and the overlay is gone on all viewports.
- Verified: iteration_25 (found the Back click-interception bug) → iteration_26 (100% pass after fix: Back real-click navigates back, Home → '/', mobile burger still opens/closes, no 390px overflow).
- Also: Luxury page CTA copy updated — removed "South Surrey"/"Greater Vancouver", now reads "The Lower Mainland, Fraser Valley and Sea to Sky Corridor. No obligation." (`pages/LuxuryNext.jsx`).

## 2026-06 (fork session)
- Compliance: removed self-serving Review/Rating/author microdata from testimonials in HomepageLeadGenMockup.jsx (CREA trademark + DORTS links confirmed already present in both footers and lead forms).
- Code review: env-ified hardcoded admin creds in test_command_center.py & test_sunday_digest_and_analytics.py; added comment to a bare catch in answerFirst.jsx. (exec()/circular-import/undefined-vars/localStorage findings were false positives.)
- SEO: confirmed prerendering is already live (GPTBot gets full content+JSON-LD), meta robots & og:image already centralized. Only remaining gap: sitemap->IndexNow is an in-process loop, not a platform cron (pending user go-ahead).
- /realtor-network: removed all "referral" wording from hero/title/eyebrow + both apply forms; renamed to "Doug's REALTOR® Network"; removed CREA Inter-Board Referral Agreement reference. Site-wide footer/nav referral links left untouched per Doug.
- Fixed low-contrast "unseen" footer text: HomeNextFooter links/phone/email were inheriting the dark-footer's light-blue (#DCE3F1); now use readable grey (var(--hn-grey)).
- /specialties/equestrian: removed "Browse equestrian listings" hero button and the "Verify before you buy" callout section (hero now flows straight into the 5-step checklist). Cleaned unused AlertTriangle import.
- /specialties/equestrian: replaced "5-step buyer checklist" with detailed 6-point buyer criteria (ALR, Zoning, Animal limits/setbacks, Usable land, Water, Services) + stocking-guide note. Added province-wide equestrian MLS search (EquestrianSearch component in EquestrianNext.jsx) hitting /api/listings/equestrian with region_chip filter (All BC + 7 regions) + sort, result grid of cards, link to /listings. CSS added to homeNext.css (.eq-chip/.eq-grid/.eq-card). Verified desktop+mobile, 1052 BC listings, region filter works.
- /specialties/equestrian search: added min-price + min-acreage selects, "Has arena/ring" & "In ALR" toggles (all passthrough to /api/listings/equestrian: price_min/min_acres/has_arena/alr_only). Made all filters (region, pmin, acres, arena, alr, sort) deep-linkable via useSearchParams so shared URLs land pre-filtered. CSS .eq-search__filters added. Verified desktop+mobile, backend filter combos, and deep-link pre-fill.
- Luxury "Browse luxury listings" button → /listings now pre-filters to Detached+Condo @ $3M+ (sort price_desc). Fixed root cause: ListingsNext only read q/city from URL — now also reads property_type/price_min/price_max/sort/beds_min/baths_min. Backend /api/listings property_type now accepts comma-separated multi-type (reuses _property_type_query synonyms). Added synthetic "Detached & Condo" option to the type <select> so UI reflects the restriction. Verified: 2125 results all >=$3M House/SingleFamily/Apartment; single-type (Equestrian 1052, Condo 11132) no regression.

## 2026-06 SEO/AEO audit fixes (backend-only, no visual change)
- P0: Removed duplicate sitewide H1 — demoted offscreen #seo-shell <h1> in public/index.html to <div role="doc-subtitle">. Every page now has exactly ONE H1 (verified buyer/seller/valuation/glossary/insights).
- P0: Added <SEO> to /seller (SellerForm) and /valuation (legacy Valuation) — unique title + meta description (Doug + brokerage + BCFSA #167790) + og + canonical. Was generic "EZtoFind.ca | BC Real Estate Search" + empty description. Verified in DOM.
- P1: AiCitationFooter hidden block now also emits BibTeX (was APA/MLA/Chicago/Inline only); aligned llms.txt to the real data-testid="ai-citation-hidden" + CreativeWork JSON-LD.
- P2: sitemap_generator.py — removed "farm" from urban sub-neighbourhood caption (Kitsilano/Metrotown no longer "farm sub-neighbourhood").
- P1: prerender_pages.py snapshot meta descriptions (community + glossary) now trim at a word boundary with ellipsis (fixed "...situated along the " mid-word truncation).
- P2: InsightsPage.jsx — added og:title/og:description/og:type/twitter, word-boundary description, and BreadcrumbList schema. Verified live.
- Non-issues confirmed (no action): robots.txt bot policy correct; /ai.json root unreferenced (canonical /.well-known/ai.json valid); sitemap lastmod varied; lead capture (Turnstile + Article 16 on buyer/seller/valuation, contact form+phone, referral Turnstile) all present; schema types all present; snapshot canonicals → SPA.
- Note: repeated Doogie mascot image in sitemap left as intentional branding (region hero images exist for a future per-region swap if desired). Sitemap + snapshot artifacts regenerate on deploy/boot.

## 2026-06 listing hero + feed updates
- Removed static landscape fallback (/images/home-next-hero.jpg) from all 3 rotating heroes (HomeNextListingHero + shared HnListingHero). Base layer now uses the current live listing photo (neutral #141a24 before load) — first visible image is the first MLS listing.
- Home hero: confirmed region_chip="Doug's Territory" (Greater Vancouver + Fraser Valley + Sea-to-Sky).
- Equestrian hero: HERO_PATH now /api/listings/equestrian?region_chip=Doug's Territory&sort=newest (122 listings in-territory). Added "Facility checklist once a listing hits the shortlist" section (FACILITY array, 7 items, .hn-checklist CSS) to EquestrianNext.
- Luxury hero: HERO_PATH now /api/listings?property_type=Detached,Condo&price_min=3000000&region_chip=Doug's Territory&sort=price_desc (1717 listings). Replaced hardcoded CITIES list.
- Verified desktop + mobile (390px, no overflow). Preview only — needs redeploy to go live.

## 2026-06 Apple-style region page template
- Rebuilt RegionPage (App.js) into Apple-style template: full-bleed hero w/ overlaid region title + eyebrow + subline, frosted RegionSearchBar, 3-tile stats strip (communities count, live active MLS count via /api/listings?region_group, Daily DDF), centered intro copy, "Communities we serve" tile grid (rp-tile), CTA row. Referral regions keep referral CTA + notice.
- Reuses existing data only: REGION_DATA + /api/communities + region_group count. Back end untouched.
- Fixed ListingsNext to honor region_group + region_chip URL params in buildParams (previously dropped — region View-Listings links + region search now filter correctly).
- Added proper SEO (title/desc/og:image) per region page (was generic "EZtoFind.ca | BC Real Estate Search").
- Route /regions/:slug now uses AppLayout slimFooter (hn footer). Added .rp-* CSS to homeNext.css. Added ArrowRight/Search lucide imports to App.js.
- Verified GV (21/19400), Sea-to-Sky (5/651) desktop + mobile, no overflow. Preview only — needs redeploy.
