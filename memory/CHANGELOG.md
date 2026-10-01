# EZtoFind.ca — Changelog

(Appended chronologically. PRD.md holds the static problem statement/architecture; this file grows over time.)

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
