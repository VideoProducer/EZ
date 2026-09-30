# EZtoFind.ca — Changelog

(Appended chronologically. PRD.md holds the static problem statement/architecture; this file grows over time.)

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
