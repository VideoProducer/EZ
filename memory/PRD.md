# EZtoFind.ca — PRD

## Original Problem Statement
Build a highly compliant BC real estate lead-gen + research tool (EZtoFind.ca). Features: AI hero "Doogie", live CREA IDX feed, BCFSA/CREA/PIPA/CASL compliance, virtual tours, first-person AI listing narrations, AEO/LLM discoverability, ChatGPT Store integration, Weekly digest.

## Architecture
- Backend: FastAPI monolith at `/app/backend/server.py` (~13.5k lines)
- Frontend: React 19 at `/app/frontend/src/App.js` (~10k lines) + `/app/frontend/src/pages/DashboardMockup.jsx` + extracted panes in `/app/frontend/src/pages/visual-agent/`
- DB: MongoDB (motor)
- Integrations: Emergent LLM key (Claude, Whisper, OpenAI TTS), Resend, Cloudflare Turnstile, CREA DDF IDX

## Recent Changes (Feb 2026)
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
- P2: SSR SEO — User-Agent detection at ingress/nginx for bot snapshots
- P3: Move "Coming Soon" uploads to CDN/Object storage
- P3: Nightly narration regression cron
- P3: Rotate JWT_SECRET, RESEND_API_KEY, CREA DDF, Turnstile, Lovable to high-entropy values
- P3: Escape seller-lead HTML in admin email (server.py:1517)
- P3: Gate `/api/unsubscribe` with signed token
- P3: Add owner/token binding on `/api/realtors/{app_id}`
- Refactor: split server.py and App.js
