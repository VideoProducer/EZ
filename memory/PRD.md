# EZtoFind.ca — PRD

## Original Problem Statement
Build a highly compliant BC real estate lead-gen + research tool (EZtoFind.ca). Features: AI hero "Doogie", live CREA IDX feed, BCFSA/CREA/PIPA/CASL compliance, virtual tours, first-person AI listing narrations, AEO/LLM discoverability, ChatGPT Store integration, Weekly digest.

## Architecture
- Backend: FastAPI monolith at `/app/backend/server.py` (~13.5k lines)
- Frontend: React 19 at `/app/frontend/src/App.js` (~10k lines) + `/app/frontend/src/pages/DashboardMockup.jsx` + extracted panes in `/app/frontend/src/pages/visual-agent/`
- DB: MongoDB (motor)
- Integrations: Emergent LLM key (Claude, Whisper, OpenAI TTS), Resend, Cloudflare Turnstile, CREA DDF IDX

## Recent Changes (Feb 2026)
- **SSR / Bot Prerender Service (Feb 6)** — headless-Chromium runtime SSR shipped
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

## Test Credentials
- Admin: `doug@eztofind.ca` / `Doug2026Login!`

## Backlog
- P0: Unit tests for `doogie_chat` helpers in server.py
- P1: Sizzle Reel French toggle (Canadian French welcome)
- P1: Community Trailer Video (15-sec shareable per sizzle reel)
- P1: Feature-Sheet Narrator (PDF/image upload + Doogie reads with highlight cursor)
- P1: Real Luxury/Horse Photos (swap placeholders once URLs provided)
- P1: Wire Google Review link (`/app/memory/review_links.md`) into consultation confirmation emails + admin dashboard widget
- P1: Deploy — paste `/app/cloudflare_worker_prerender.js` into Cloudflare Workers (or `/app/nginx_prerender.conf` at ingress) to activate bot prerender routing on eztofind.ca
- P3: Move "Coming Soon" uploads to CDN/Object storage
- P3: Nightly narration regression cron
- P3: Rotate JWT_SECRET, RESEND_API_KEY, CREA DDF, Turnstile, Lovable to high-entropy values
- P3: Escape seller-lead HTML in admin email (server.py:1517)
- P3: Gate `/api/unsubscribe` with signed token
- P3: Add owner/token binding on `/api/realtors/{app_id}`
- Refactor: split server.py and App.js
