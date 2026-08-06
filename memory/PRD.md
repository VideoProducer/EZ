# EZtoFind.ca — PRD

## Original Problem Statement
Build a highly compliant BC real estate lead-gen + research tool (EZtoFind.ca). Features: AI hero "Doogie", live CREA IDX feed, BCFSA/CREA/PIPA/CASL compliance, virtual tours, first-person AI listing narrations, AEO/LLM discoverability, ChatGPT Store integration, Weekly digest.

## Architecture
- Backend: FastAPI monolith at `/app/backend/server.py` (~13.5k lines)
- Frontend: React 19 at `/app/frontend/src/App.js` (~10k lines) + extracted panes in `/app/frontend/src/pages/visual-agent/`
- DB: MongoDB (motor)
- Integrations: Emergent LLM key (Claude, Whisper, OpenAI TTS), Resend, Cloudflare Turnstile, CREA DDF IDX

## Recent Changes
- 2026-02: Deployment health check PASS after quoting RESEND_FROM/RESEND_REPLY_TO in backend/.env
- 2026-02: Security audit fixes applied:
  - SEC-001: `/api/favorites/list` now requires verification_token (BOLA / PIPA)
  - SEC-002: CSV formula-injection escape on `/api/admin/consultations.csv`
  - SEC-003: Rate limit `15/min` added to `/api/doogie/transcribe`

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
