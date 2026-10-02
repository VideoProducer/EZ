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
- 2026-06: Fixed region hero title readability — root cause was `.hn h1` global rule overriding `.rp-hero__title` color to dark #1d1d1f. Bumped specificity to `.hn .rp-hero__title` (white), deepened `.rp-hero__shade` gradient, added text-shadows to eyebrow/title/sub. Applies to ALL `/regions/*` pages. Verified Greater Vancouver, Fraser Valley, Sea-to-Sky (title color now rgb(255,255,255)).
- Region landing pages rebuilt (Apple-style, live stats, photo grids); Fraser Valley whitelisted to Abbotsford/Chilliwack/Mission/Harrison Hot Springs.
- Hero rotators use live MLS photos (Home/Equestrian/Luxury).
- Equestrian province-wide search grid + facility checklist; Luxury CTA → Detached/Condos $3M+.
- SEO audit fixes (dup H1 removed, schema, sitemap captions, snapshot truncation, breadcrumbs).

## Backlog
- P1: Schedule Sitemap→IndexNow via `.emergent/crons.yml` (`/api/cron/refresh-sitemap`); remove fragile in-process asyncio loop.
- P1: Privacy counsel sign-off + multi-language privacy policy.
- P2: Buyer/Seller deal checklists in admin panel (needs user clarification on wording/placement).
- P2: Historical median backfill (2015-2025 BC data).
- P2: Optional Non-MLS hub `/homes-for-sale/{community}`.
- P3: Community photo thumbnails on region page text tiles.
- Verify DDF iframe listing-brokerage attribution (CREA compliance).
