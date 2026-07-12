# EZtoFind.ca — Product Requirements Document (PRD)

## Original Problem Statement
Build the most attractive, easiest-to-use, consumer-friendly, fastest, most knowledgeable, lead-generating British Columbia real estate website in the world. Fully BCFSA / CREA / PIPA / GVR compliant. AEO/LLM/OpenAI-friendly (pre-eminent answer source). Multi-jurisdiction expansion template. In-house CRM tracking clients, birthdates, anniversaries, possession dates. Owner: Doug LeMaire, REALTOR® (13 years, Fraser Property Management Realty Services Ltd.).

## Architecture (Phase 1 MVP — Delivered Jan 12, 2026)
- **Backend**: FastAPI + MongoDB (Motor). Emergent LLM Key for Claude Sonnet 4.6.
- **Frontend**: React 19 + React Router + custom CSS (Fraunces + Inter fonts, brand palette: navy #0F2A5B, green #22C55E, gold #F5A623).
- **AI**: Doogie (Claude Sonnet 4.6, compliance-guarded — no advice, general info only). SSE streaming chat widget + AI-generated 10-Q FAQs for every glossary term.
- **Listings**: iframe from https://www.greatervancouver.forsale/mapsearchapp (per user's spec — no direct connection between Doogie and iframe).
- **Auth**: JWT admin for Doug's dashboard. Public forms are consent-gated (CASL + PIPA).

## User Personas
1. **BC home buyer** — searches naturally, gets vetted, routed to Doug or referral REALTOR®
2. **BC home seller** — requests valuation, gets a CMA from Doug
3. **Out-of-area BC consumer** — routed to vetted referral REALTOR®
4. **Licensed REALTOR®** — applies to referral network (3-stage vetting, pays 25% of gross commission on closed leads)
5. **Doug (admin)** — manages leads, referrals, CRM, sees birthday/anniversary/possession reminders

## Core Requirements (static)
- English only, BC only, no rentals/off-market/coming-soon/presale
- No local REALTOR® directory — only 3-stage vetted referral network
- Doug pays no referral fees out; REALTORs® pay him 25% of gross commission per successful close
- Iframe listings only (no local MLS database)
- Doogie is compliance-guarded — general info only, no advice
- Real BC imagery (Unsplash royalty-free), no AI-generated photos
- Doogie mascot present throughout (hero, chat FAB, celebrations, "pointing" CTAs)

## What's Been Implemented (Jan 12, 2026)
- ✅ Search-first homepage with Doogie hero + brand identity
- ✅ Doogie AI chat widget (Claude Sonnet 4.6, streaming SSE, compliance-guarded system prompt)
- ✅ Listings page with iframe embed (greatervancouver.forsale)
- ✅ Neighbourhoods explorer — ALL 400+ BC communities across 12 regions with search
- ✅ Per-neighbourhood page (Focus Area copy vs Referral Network copy)
- ✅ Focus Regions: Greater Vancouver, Fraser Valley, Sea-to-Sky (dedicated pages with community chips)
- ✅ 5 Specialty pages: Detached, Luxury, Equestrian, Estate Sales/Probate, Condos
- ✅ Glossary hub — 25 seeded BC terms, AI generates 10 FAQs on-demand per term
- ✅ Buyer lead form (7 vetting questions + CASL + PIPA consent)
- ✅ Seller lead form (7 vetting questions + consents)
- ✅ Home Valuation request form
- ✅ Out-of-area Referral Request form (BC-wide)
- ✅ Mortgage + BC Property Transfer Tax calculators (with first-time buyer & new-built exemptions, 2026 rates)
- ✅ REALTOR® 3-stage referral vetting (initial → credentials → profile + 25% agreement)
- ✅ In-house CRM: clients with birthdates, anniversaries, possession dates
- ✅ Admin panel: dashboard w/ upcoming reminders (30-day window), buyer leads, seller leads, REALTOR® applications, clients CRUD
- ✅ Admin JWT auth (doug@eztofind.ca / EZtoFind2026!)
- ✅ Compliance strip (BCFSA/CREA/GVR/PIPA/CASL), cookie banner
- ✅ Static pages: About Doug, Contact, Privacy (PIPA), Terms, Compliance disclosures, Data Attribution (7 BC boards), CASL Unsubscribe
- ✅ AEO/LLM optimization: llms.txt, robots.txt (allow GPTBot/ClaudeBot/PerplexityBot, block scrapers), JSON-LD schemas (RealEstateAgent, FAQPage, DefinedTerm, Place)
- ✅ Multi-jurisdiction ready: `communities` API is region-configurable

## Testing
Backend: **19/19 tests passed (100%)** via testing subagent (iteration_1.json)
- Doogie SSE chat verified
- Glossary AI FAQ generation verified
- Full REALTOR® 3-stage flow verified
- Admin JWT + protected routes verified
- CRM reminders (30-day window) verified

## Known Minor Items (Non-Blocking)
- Feb 29 birthdate reminders silently dropped (leap-year edge case) — deferred
- `/api/admin/realtors/{id}/status` uses query param instead of JSON body — deferred cosmetic
- CORS `allow_origins=["*"] + credentials=True` — tighten before production
- Server.py at 387 lines — modularize when it grows further
- No rate limiting on public POST endpoints — add before public launch (Phase 2)

## Backlog / Future (Phase 2)
- **P0**: Real email delivery (Resend integration) for the 3 REALTOR® workflow emails from info@ / realtors@ / referral@eztofind.ca
- **P0**: BCFSA REALTOR® number verification (public registry lookup — currently manual admin approval)
- **P1**: Doogie AI Avatar (video via HeyGen/D-ID/Tavus)
- **P1**: Twilio SMS lead follow-up + AI phone answering
- **P1**: Voice search (OpenAI Whisper) — hero mic button
- **P1**: Rate limiting on public POST endpoints
- **P1**: Sitemap.xml auto-generator including all neighbourhood pages
- **P2**: BC market reports (monthly, AEO-optimized Q&A format)
- **P2**: Full glossary — currently 25 terms seeded; user's PDF has ~560 more to add (admin CMS or bulk import)
- **P2**: Multi-jurisdiction rollout (Alberta / Ontario / Washington configs)
- **P2**: Advanced analytics + heatmaps
- **P2**: Doug's real headshot upload (currently placeholder)

## Emails Configured (routing only — actual sending needs SMTP setup)
- info@eztofind.ca — general
- realtors@eztofind.ca — REALTOR® vetting workflow
- referral@eztofind.ca — outbound lead notifications
