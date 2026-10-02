# EZtoFind.ca — Product Requirements (PRD)

## Problem Statement
Rebuild EZtoFind.ca into an attractive, high-converting, minimalist "Apple-style" lead-generation real estate platform for BC. Maintain strict BC real estate advertising (BCFSA, CREA), privacy (PIPA), and anti-spam (CASL) compliance. Phase out legacy pages while maintaining CRM and live MLS feeds. Expand out-of-area lead generation and referral tracking.

## Stack / Architecture
- `backend/server.py` — FastAPI monolith: API, CASL/PIPA logging, cron webhooks, analytics.
- `backend/sitemap_generator.py`, `backend/prerender_pages.py` — SEO/AEO + AI-bot prerendering (Playwright, active).
- `frontend/src/App.js` (~14k lines) — React router, layouts (AppLayout, HomeNext), SEO components, admin shells, `REGION_DATA`.
- Region landing pages: `RegionPage` component (App.js ~5021-5086), CSS in `frontend/src/components/homenext/homeNext.css`.
- `.emergent/crons.yml` — scheduled tasks.
- MongoDB; CREA DDF® IDX live feed.

## Integrations
OpenAI TTS/Whisper (Emergent key), Claude Sonnet Vision (Emergent key), Gemini Nano Banana (Emergent key), Resend email, CREA DDF IDX, Cloudflare Turnstile, Twilio SMS.

## Admin / Test Creds
See `/app/memory/test_credentials.md` (Admin: doug@eztofind.ca).

## Implemented (recent)
- 2026-06: **Glossary A–Z + Term pages Apple-style + index definition snippets.** (a) Index cards (`Glossary`) now show a 2-line definition snippet (`.glx-card__d`, line-clamp) under the term, above the category. (b) A–Z page (`GlossaryAZ`) rebuilt with `.gxaz-*` scoped design: Apple hero, rounded sticky search (magnifier) + letter pills, Sora letter headings with counts, term grid, navy CTA band — all data-testids/anchors/SEO/logic preserved. (c) Term page (`GlossaryTerm`) got a scoped `.gxt` wrapper restyling eyebrow (navy), h1 (Sora), article body (larger/leading), and FAQ (rounded cards with +/– markers) + related block — all schema/JSON-LD/subcomponents/testids untouched. Verified desktop + mobile, no errors. NOTE: pre-existing (not a regression) off-screen overflow from the hidden `AiCitationFooter` "Cite as" spans remains on term pages.
- 2026-06: **Mobile header identity fix** (`HomeNextNav` in `components/homenext/HomeNextHero.jsx`; CSS `homeNext.css`). The `.hn-nav__id` block (Doug headshot + "Doug LeMaire, REALTOR®" + brokerage) was hidden below 1180px. Scoped the hide to tablet-only (961–1180px) and on mobile (≤960px) made `.hn-nav__left` wrap so the identity shows on its own full-width line beneath the Back/Home/logo row. Verified at 390px: visible, no overflow. Applies site-wide (shared header).
- 2026-06: **BC Real Estate Glossary index — Apple-style redesign** (`/glossary`, `Glossary` in App.js). Serene centered hero with dynamic "{N} terms · authoritative sources" stat, large pill search field (magnifier icon) + "View A–Z index" outline pill, category sections with hairline headers + counts, soft rounded term cards in a responsive grid with `glxReveal` entrance animations. ALL logic preserved: `/glossary` fetch, client-side search (term/definition/category), category grouping/sort, every term link, A–Z link, SEO title/description, invisible canary, and all data-testids (`glossary-search`, `glossary-view-az`, `glossary-cat-*`, `term-*`). Verified: 440 cards load, search filters correctly, no mobile overflow/errors.
- 2026-06: **Relocating to BC guide — Apple-style redesign** (`/relocating`, `Relocating` in App.js). Editorial layout: large "Welcome to British Columbia." hero, Community Finder quiz lead-in, four sections with hairline-divided link/benchmark lists, three soft tool cards with lucide line icons (Search/Home/MessageCircle), navy dual-path CTA band, staggered `rlcReveal` entrance animations. ALL content, glossary links, quiz, Ask-Doogie behavior, CTAs, SEO Article+FAQPage JSON-LD, and compliance text unchanged; every data-testid preserved. Verified desktop + mobile, no overflow/errors.
- 2026-06: **BC Mortgage Affordability Calculator — Apple-style redesign** (`/tools/mortgage-affordability`, `AffordabilityCalculator` in App.js). Two-column layout (input card + results panel, stacks <860px), iOS-style FTB toggle, chevron-styled selects, hero affordability number, six staggered-reveal result tiles, navy pill CTA. ALL OSFI B-20 stress-test math, GDS/TDS logic, PTT/FTB rules, community fetch, compliance text, and data-testids unchanged. Verified desktop + mobile; FTB toggle correctly lowers PTT and raises max price.
- 2026-06: **BC Buyer Cost Calculator — Apple-style redesign** (`/tools/bc-buyer-cost-calculator`, `BCBuyerCostCalculator.jsx`). Two-column input/results layout (stacks on mobile <860px), hero `$` price field, iOS-style animated toggle switches, slide-in reveal animations on conditional rows (FTHB/new-build/GST), navy hero total band. ALL 2026 BC math, glossary links, compliance text, IdentityLine, CTAs, and data-testids unchanged. Verified desktop + mobile.
- 2026-06: **Sitemap→IndexNow nightly cron** — new secret-authed `POST /api/cron/sitemap-indexnow` (Bearer `WEBHOOK_CRON_SECRET`, X-Webhook-Id dedupe, acks 200 + backgrounds work). Added to `.emergent/crons.yml` (03:00 America/Vancouver). Disabled the fragile in-process asyncio nightly loop in server.py. Verified: regen 1732 URLs, 405 priority + 2481 AI URLs pushed, status 200.
- 2026-06: **Region tile thumbnails** — new `GET /api/community-thumbs?cities=a,b,c` returns {city: cover_photo} (one representative Active DDF listing photo per community, 10-min cache). RegionPage tiles now render the photo; CSS `.rp-tile` reworked to a thumb+name+arrow card. Verified live.
- 2026-06: **DDF brokerage attribution on cards** — added "Listing brokerage: …" / "disclosed on REALTOR.ca" line to both listing cards (App.js `ListingCard` + `ListingsNext.jsx` grid card). Brokerage name is correctly mapped from DDF `ListOfficeName` in services/ddf_sync.py. Verified.
- 2026-06: **Buyer/Seller deal checklists** — Lead Triage checklist split by lead kind. Buyer (7 steps), Seller (8 steps); shared `subjects_removed`/`completion`. Backend `LeadFollowupUpdate` extended with all new boolean keys; PUT merges them. Testing agent: 100% backend+frontend pass (iteration_37). Regression suite at `/app/backend/tests/test_lead_triage_checklist.py`.
- 2026-06: Fixed region hero title readability — root cause was `.hn h1` global rule overriding `.rp-hero__title` color to dark #1d1d1f. Bumped specificity to `.hn .rp-hero__title` (white), deepened `.rp-hero__shade` gradient, added text-shadows. Applies to ALL `/regions/*` pages.
- Region landing pages rebuilt (Apple-style, live stats, photo grids); Fraser Valley whitelisted to Abbotsford/Chilliwack/Mission/Harrison Hot Springs.
- Hero rotators use live MLS photos (Home/Equestrian/Luxury).
- Equestrian province-wide search grid + facility checklist; Luxury CTA → Detached/Condos $3M+.
- SEO audit fixes (dup H1 removed, schema, sitemap captions, snapshot truncation, breadcrumbs).

## Backlog
- P1: Privacy counsel sign-off + multi-language privacy policy.
- P2: Historical median backfill (2015-2025 BC data).
- P2: Optional Non-MLS hub `/homes-for-sale/{community}`.
