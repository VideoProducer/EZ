# EZtoFind.ca — Changelog

(Appended chronologically. PRD.md holds the static problem statement/architecture; this file grows over time.)

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
