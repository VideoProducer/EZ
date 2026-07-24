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

## What's Been Implemented — Latest Sessions

### Feb 20, 2026 — CREA DDF® Scaffolding Sprint (Session complete)
- ✅ **Full MLS® listings backend** (`/api/listings`, `/api/listings/{key}`, `/api/listings/meta/facets`)
- ✅ **CREA DDF® sync worker scaffold** at `backend/services/ddf_sync.py` — swap-in-ready once credentials arrive
- ✅ **CREA Analytics Web Service logger** at `backend/services/analytics_logger.py` — buffers events (impression/detail_view/media_view/contact_request) in Mongo, flushes to CREA endpoint once configured
- ✅ **Anti-scraping rate limiting** via `slowapi` on all `/api/listings/*` endpoints (60/min per IP)
- ✅ **Tamper-evident MLS® Terms of Use consent** via `POST /api/listings/consent` — logs IP + UA + timestamp
- ✅ **Terms-of-use click-wrap gate** on frontend (`<TermsGate>`) — required per CREA rules before viewing listing content
- ✅ **`<ListingCompliance>` component** — 90×90 Powered by REALTOR.ca badge deep-linked to specific listing URL, brokerage attribution, trademark statements per CREA rules
- ✅ **Full Search UI** at `/listings` — filters (city, type, beds, baths, price, keyword), sort, 15 seeded mock listings
- ✅ **Detail page** at `/listing/:key` — hero photo gallery, address, price, features, embedded map, compliance block, "Book a Viewing" inquiry form wired to CRM
- ✅ **`robots.txt` split** — glossary/communities open to AI crawlers, listing routes disallowed for every bot (CREA compliance)
- ✅ **Mongo indexes** — unique listing_key, geospatial lat/lon, text index on description/address/city
- ✅ **Environment Canada Climate Normals + Open-Meteo live 7-day forecast** on all community pages (map + current weather + 7-day strip + climate table)
- ✅ **Google Maps embed** replaces Leaflet/OSM on community pages, above H1
- ✅ **Glossary source merge** — 356 curated Lovable sources merged with 20+ new category defaults (Agency & Disclosure, Government & Tax, Tenancy, etc.), deduped by URL. Equity term now shows 4 sources instead of 1.
- ✅ **Glossary audit checklist** at `/app/memory/glossary_audit_checklist.md` — 40 highest-risk BC real estate terms flagged for Doug's manual accuracy review
- ✅ **Doogie system prompt updated** — new verbatim referral offer, banned old phrasings
- ✅ **Compliance strip typography** — bumped to 1.28rem, consistent "AI-assisted" hyphenation, comma between "notary" and "accountant"
- ✅ **Pemberton added to Sea-to-Sky region** (was missing)
- ✅ **About page copy edits** — "EZtoFind.ca has been built as..." + paragraph spacing
- ✅ **/communities index copy** — removed "Doug's primary practice..." line, added Referral REALTOR® link
- ✅ **Community map moved above H1 name** — Google Maps embed at top of each community page

### Environment variables required (when CREA credentials arrive)
```
CREA_DDF_ENDPOINT=          # OData API base URL from CREA
CREA_DDF_CLIENT_ID=         # Provisioned
CREA_DDF_CLIENT_SECRET=     # Provisioned
CREA_DDF_AGENT_ID=          # Doug's agent ID
CREA_PARTICIPANT_ID=        # For Analytics service
CREA_ANALYTICS_ENDPOINT=    # Once CREA provides
CREA_ANALYTICS_KEY=         # Analytics API key
```

## Known Minor Items (Non-Blocking)
- Feb 29 birthdate reminders silently dropped (leap-year edge case) — deferred
- `/api/admin/realtors/{id}/status` uses query param instead of JSON body — deferred cosmetic
- CORS `allow_origins=["*"] + credentials=True` — tighten before production
- Server.py at ~1400 lines — modularize when it grows further
- Cloudflare AI-bot toggle needed at launch (dashboard-only fix, no code)
- Content accuracy audit of 40 highest-risk glossary terms pending (Doug manual review, ~4-8 hrs)

## Backlog / Future

### P0 — Ready to activate once CREA DDF® credentials arrive
- Wire real DDF fetch in `services/ddf_sync.py::_fetch_page()` (~4 hrs, blocked on credentials)
- Configure APScheduler for 4-hour incremental sync + nightly reconciliation (~2 hrs)
- Doogie MLS® tool-use (natural language MLS search in chat) — ~8 hrs, requires DDF live first
- Real email delivery (Resend) for the 3 workflow emails from info@ / realtors@ / referral@eztofind.ca (~2 hrs, needs API key)

### P1
- BCFSA REALTOR® number verification (public registry lookup)
- Doogie AI Avatar (video via HeyGen/D-ID/Tavus)
- Twilio SMS lead follow-up + AI phone answering
- Voice search (OpenAI Whisper) — hero mic button
- Beta password gate for friends-only testing before public launch

### P2
- BC market reports (monthly, AEO-optimized Q&A format)
- Multi-jurisdiction rollout (Alberta / Ontario / Washington configs)
- Advanced analytics + heatmaps
- Doug's real headshot upload (currently placeholder)

## Emails Configured (routing only — actual sending needs Resend setup)
- info@eztofind.ca — general
- realtors@eztofind.ca — REALTOR® application workflow
- referral@eztofind.ca — outbound referral request notifications
