# EZtoFind.ca — Roadmap

Prioritised backlog. Each item shows scope, risk, and rough effort. See `PRD.md` for the product spec and `COMPLIANCE_AUDIT_2026_02.md` / `DISCOVERABILITY_AUDIT_2026_02.md` / `PERFORMANCE_AUDIT_2026_02.md` for source audits.

---

## P0 — Flagship launch (parked overnight, ship at 9 AM PT tomorrow)

- [ ] **Un-park flagship listing card** on the Luxury page. One-line flip: change `{false && <LuxuryFlagshipCard/>}` to `<LuxuryFlagshipCard/>` in `/app/frontend/src/components/LuxuryLandingMockup.jsx`.
- [ ] **Homepage tagline ribbon** — soft gold strip "Quality, location, and lasting value." under the Doogie hero on `/`.
- [ ] **Doogie flagship pitch wiring** — intent router: when visitors ask about new listings this week, open a "Meet 3015 141 Street" pitch with Matterport link + CTA.

## P1 — Code Quality Wave (dedicated post-launch pass)

These were identified by the Feb 2026 code review. Deferred from launch eve because each carries real regression risk and none were blocking deployment (deployment_agent returned PASS).

### Batch B — Hook deps audit (medium risk, ~2-3 hrs)
- [ ] `src/pages/VisualAgentDemo.jsx` — 30+ missing deps in the `useEffect` at line 294. Refactor to reduce dep surface (use `useCallback`/`useMemo` for stable references) rather than adding all 30 (would cause re-render loops).
- [ ] `src/pages/visual-agent/PaneQualify.jsx` — 10+ missing deps at line 61 (`API`, `AbortController`, `abortRef`). Same treatment.
- [ ] `src/pages/VisualAgentDemo.jsx:703` — voice-scenarios effect missing `API`, `SCENARIOS`, `VOICE_SCRIPT`. Extract SCENARIOS/VOICE_SCRIPT to module-level consts so they don't need to be deps.
- [ ] **NOT** DashboardMockup.jsx — too critical for the homepage. Deliberately deferred to a second wave.

### Batch C — Component splits (high risk, live traffic)
- [ ] `components/LuxuryLandingMockup.jsx` (636 lines) → split into `LuxuryHero`, `LuxuryGrid`, `LuxuryFlagshipCard` (already extracted), `LuxuryCorridors`, `LuxuryFooter`.
- [ ] `components/EquestrianLeadMockup.jsx` (584 lines) → split into `EquestrianHero`, `EquestrianForm`, `EquestrianListings`, `EquestrianFooter`.
- [ ] `components/CommunityPageMockupLive.jsx` (543 lines) → split into `CommunityHero`, `CommunityMap`, `CommunityStats`, `CommunityRelated`.
- [ ] `App.js:6308, 9325, 3808, 1283, 7953` — five anonymous 320-644-line inline components. Name each and extract to their own files under `src/pages/`.
- [ ] `App.js:846` anonymous function (C=47, 152 lines) — use early-returns + extract sub-branches.
- [ ] `App.js:10336` PostHogGate (C=20) — move config to constants, extract conditional setup.
- [ ] `App.js:10391` GA4Gate (C=19, 89 lines) — extract analytics initialisation into `lib/analytics.js`.

### Backend refactor (multi-day, planned separately in PRD.md)
- [ ] `server.py` (16.6K lines, 229 imports) → extract routes into `/app/backend/routes/` modules (already flagged in PRD.md).
- [ ] `server.py:1435 create_buyer_lead` (C=29) → split into validate / process / persist. **Compliance code — needs full regression test suite before touching.**
- [ ] `server.py:498 admin_login` (C=21, 90 lines) → extract Turnstile check, brute-force lockout, credential verification into separate functions. **Auth code — full regression test required.**
- [ ] `prerender_pages.py:224 render_communities` (C=28, 104 lines, 26 locals) → break into helper functions per section (hero, stats, related).
- [ ] `seed_journey_glossary.py:53 build_all` (574 lines) → one function per data category.
- [ ] Add type hints to `seed_content_relations.py`, `seed_journey_glossary.py`, `scripts/resume_v2_regen.py`, `services/bc_sub_neighbourhoods.py`.

### Batch D — Frontend polish (medium risk, ~2 hrs)
- [ ] **93 array-index-as-key** replacements across `DashboardMockup.jsx`, `VisualAgentDemo.jsx`, `MarketReport.jsx`, `FamilyViewingParty.jsx`. Started Feb 2026 — replaced 2 in DashboardMockup (testimonials, credentials); 91 remaining.
- [ ] **`App.js` lazy-load audit** — currently 58 top-level imports. Push non-critical route components behind `React.lazy()` to shrink initial bundle.

## P2 — Product enhancements (post-launch)

- [ ] Feature Sheet Phase 2: expand DDF `_map_property()` to capture ~40 more RESO fields (heating, cooling, appliances, room-by-room table, taxes, strata fee, zoning, parking type, water source, sewer). Requires backfill script.
- [ ] Manual override for Doug's own listings — hand-authored feature sheet + PDF upload for 3015 141 Street and future Doug listings.
- [ ] Brokerage-name cache — resolve DDF `ListOfficeName` via RESO Office endpoint using `list_office_key`, cache in Mongo. Replaces "Listing brokerage disclosed on REALTOR.ca" placeholder with real brokerage name on ~40% of listings.
- [ ] Sub-Neighbourhood Wave 1 hybrid model (Rank 1-10 Doug voice · Rank 11-30 authority-cited data).
- [ ] Auto-Favorite Listings — Cast Session → CRM client → auto-save attached listings.
- [ ] Sizzle Reel Language Toggle (French button for Doogie).
- [ ] GVR/FVREB compliance email for aggregate MLS stats display.
- [ ] Placeholder image swap in "Doug's Specialties" tiles.
- [ ] Move "Coming Soon" uploaded files to CDN/Object Storage.

## P3 — Deferred / blocked

- [ ] **Font subsetting (Wave D #27)** — recurring miss. Apply proper font optimization for LCP.
- [ ] **Weekly sold comparables** — blocked on data pipe (CREA DDF doesn't expose BC sold data). Waiting on Doug's decision on sourcing strategy.
- [ ] **Narration regression test cron** — nightly job to verify Doogie audio cache still generates cleanly.

---

## Recently completed (see `PRD.md` changelog for full list)
- Feature Sheet Phase 1 — 2-column public feature sheet under About This Property (Feb 2026)
- Related Communities geography fix — replaced substring name matching with same-region_group peers (Feb 2026)
- Homepage FILTER LISTINGS card — enlarged + single field routes community/MLS/postal/address (Feb 2026)
- Vacant-land aerial filter — `exclude_description_keywords` on Luxury + Equestrian hero fetches (Feb 2026)
- Flagship listing scaffold — 3015 141 Street card, config, Matterport tour, JUST-ACTIVE ribbon (Feb 2026)
- Backend security cleanup — hardcoded test password → env var; 5 unused-locals removed (Feb 2026)
