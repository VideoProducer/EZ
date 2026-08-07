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

## Test Credentials
- Admin: `doug@eztofind.ca` / `Doug2026Login!`

## Backlog
- P0: Unit tests for `doogie_chat` helpers in server.py
- P1: Sizzle Reel French toggle (Canadian French welcome)
- P1: Community Trailer Video (15-sec shareable per sizzle reel)
- P1: Feature-Sheet Narrator (PDF/image upload + Doogie reads with highlight cursor)
- P1: Real Luxury/Horse Photos (swap placeholders once URLs provided)
- P1: Wire Google Review link (`/app/memory/review_links.md`) into consultation confirmation emails + admin dashboard widget
- P1: Deploy — paste `/app/cloudflare_worker_prerender.js` into Cloudflare Workers (or `/app/nginx_prerender.conf` at ingress) to activate bot prerender routing on eztofind.ca **← SUPERSEDED. Emergent's built-in `crawler-cache` layer already serves prerendered HTML to bots. Cloudflare Worker exists (Hello World placeholder) but not needed. Skip unless we want custom BCFSA compliance guardrails.**
- P3: Move "Coming Soon" uploads to CDN/Object storage
- P3: Nightly narration regression cron
- P3: Rotate JWT_SECRET, RESEND_API_KEY, CREA DDF, Turnstile, Lovable to high-entropy values
- P3: Escape seller-lead HTML in admin email (server.py:1517)
- P3: Gate `/api/unsubscribe` with signed token
- P3: Add owner/token binding on `/api/realtors/{app_id}`
- Refactor: split server.py and App.js
