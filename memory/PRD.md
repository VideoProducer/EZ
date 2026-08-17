# EZtoFind.ca — Product Requirements Document

**Owner:** Doug LeMaire, REALTOR® · BCFSA Licence #167790  
**Brokerage:** Fraser Property Management Realty Services Ltd.  
**Site:** https://eztofind.ca  
**Last updated:** Feb 2026

---

## Original problem statement

Build a complex, highly compliant real estate website for British Columbia. The site acts as a lead generation and research tool. Must include an AI hero named "Doogie", live CREA MLS® IDX feed integration, strict compliance with BCFSA, CREA, PIPA, and CASL, plus 24/7 qualification for search, Q&A, virtual tours, and referrals.

---

## User personas

- **BC buyer / seller** in Greater Vancouver, Fraser Valley, or Sea-to-Sky (Doug's direct service area) — direct client
- **BC buyer / seller in any other BC community** — receives a vetted BCFSA-licensed REALTOR® referral
- **Luxury buyer** ($3M+) — served via curated luxury landing page with private-viewing flow
- **Equestrian / acreage buyer** — served via dedicated equestrian landing with ALR / zoning / water-licence expertise
- **AI answer engine crawler** (Perplexity, ChatGPT, Claude, Google AI Overviews) — receives fully-structured JSON-LD to cite EZtoFind.ca as a BC real estate authority

---

## Implemented so far (Feb 2026 recap)

### Phase 1 — Compliance sweep (Feb 2026)
- BCFSA DORTS acknowledgment checkbox on Buyer, Seller, Valuation, Referral forms
- Doogie AI advice-not-provided disclaimer on Luxury Concierge panel + rewrite of sample response to non-advisory tone
- `dorts_ack` field on BuyerLead / SellerLead pydantic models
- `consent.dorts` i18n key across all 6 languages
- J&M testimonial: added "Individual client experience — results not typical" disclosure
- Luxury page: removed unsubstantiated "vetted for provenance, permits, and privacy" + "media syndication" claims

### Phase 2 — Discoverability sweep (Feb 2026)
- BCFSA Licence #167790 baked into 4 RealEstateAgent JSON-LD schemas (Homepage, 240 Community pages, Equestrian, Luxury) as machine-readable `PropertyValue` identifier
- Telephone + email + PostalAddress added to all RealEstateAgent schemas
- Luxury landing page: full JSON-LD graph added (was ZERO structured data before)
- Meta tag duplicate bug FIXED — removed hardcoded description/OG/Twitter tags from index.html; every route now has crawler-visible per-page previews

### Phase 5 — Global logo unification (Feb 17, 2026)
- **EZtoFind.ca wordmark** unified across the entire site to: solid **BrandBlue (#0A3D99)** for "EZtoFind" + **BrandGold (#F9BD00)** for ".ca"
- Removed the older 3–4-color split variants (green "EZ" + navy "to" + blue "Find" + gold ".ca")
- Fonts preserved per location (Playfair Display on hero + sidebar; sans on nav bar)
- On dark backgrounds (footer, mobile top bar), the "EZtoFind" portion is rendered in **white** for legibility while the ".ca" stays BrandGold — same brand pattern, dark-mode variant
- Updated locations: `App.js` nav header, `App.js` footer, `App.js` hero `<h1>` tagline, `DashboardMockup.jsx` (hero, sidebar, mobile top bar, home tile), `MyJourney.jsx`
- Data-testids added: `nav-wordmark`, `footer-wordmark`, `sidebar-wordmark`, `mobile-header-wordmark`, `myjourney-wordmark`

- Licence #167790 in top nav, footer, contact block, and copyright line on every page


### Phase 6 — Flagship 3015 141 Street pre-launch preview (Feb 17, 2026)
- **MLS® number R3156192** assigned to 3015 141 Street in `frontend/src/config/flagshipListing.js`
- Two unlisted preview routes added (noindex, nofollow, robots blocked, banner-marked):
  - `/preview/flagship-home` — renders the homepage lead-gen mockup with `FeaturedComingSoonListing` switched to `just_listed` mode, showing full address, price ($3M), MLS® R3156192, hero photo, description, "View Full Listing" + "Request a Private Showing" CTAs, and Matterport play button
  - `/preview/flagship-luxury` — renders the luxury landing page with `LuxuryFlagshipCard` un-parked so Doug can preview the Playfair-Display gold-bordered flagship card above the magazine grid
- Public routes (`/`, `/dashboard-mockup`, `/mockups/home-v2`, `/specialties/luxury`) remain in **parked/coming-soon** state; nothing public changes until Doug flips the switch
- Prop-based gating: `HomepageLeadGenMockup previewFlagship={true}` and `LuxuryLandingMockup previewFlagship={true}` — a one-line flip un-parks both when ready

### Phase 7 — FLAGSHIP LAUNCH · 3015 141 Street LIVE (Feb 17, 2026)
- **Approved & launched publicly** by Doug at asking price **$3,297,000 CAD**
- Homepage feature (`/mockups/home-v2` a.k.a. `home-v2` renderer): `HomepageLeadGenMockup` now defaults `previewFlagship = FLAGSHIP.active` → the "Just Listed · Doug's Featured" panel is public. Shows dusk hero image, MLS® R3156192, $3,297,000, description, "View Full Listing" + "Request a Private Showing" CTAs
- Luxury landing (`/specialties/luxury`): `LuxuryLandingMockup` renders `<LuxuryFlagshipCard/>` gated on `previewFlagship || FLAGSHIP.active`. Playfair-Display flagship card sits above the "Currently in market" magazine grid with 3D Matterport + Virtual Tour buttons
- Doogie AI (`DOOGIE_SYSTEM` in `backend/server.py`): added a **Featured Listing** section so Doogie mentions 3015 141 Street naturally when users ask about featured homes, luxury Surrey properties, or homes under $3.5M in the Fraser Valley. Points to `/listings/R3156192` and `/contact` for private showings
- Single-toggle rollback: flip `FLAGSHIP.active` to `false` in `frontend/src/config/flagshipListing.js` to un-launch instantly (both public renderers gate on it)
- The `/preview/flagship-home` and `/preview/flagship-luxury` noindex routes remain live for future dry-runs
- Asking-price hex sampling and pricing display confirmed via screenshot on both public routes


### Phase 3 — Performance / device (Feb 2026)
- Verified: 0px horizontal overflow at 390px viewport
- Verified: touch targets meet WCAG 2.5.5 (inline text-link exception applied)
- Verified: 2-font pruning already saved ~150KB / ~1300ms
- Verified: PWA-ready manifest + favicon set + apple-touch-icon

### Earlier waves (before this session)
- 240 community pages with dynamic `isFocus` compliance switch
- Live CREA DDF® MLS® integration with agent-name display fix
- Return-visit engine (Just-Sold digest cron ready — sold-data source pending)
- Doogie TTS/Vision multi-language
- Featured Listing auto-flip (3015 141 Street) on homepage
- Dynamic OG image generator (Pillow-based 1200x630 cards)
- Referral card unified across Community Finder / Dashboard sync / Equestrian
- Luxury magazine grid keyword blacklist filters development plays from $3M+ portfolio
- Corridor tile click auto-scrolls to filtered magazine grid
- Every listing card links to `/listings/{MLS_ID}` detail page
- Osoyoos map bug fix: BC-city prefix resolver + debounce

---

## Backlog (P0 → P3)

### P0 — Ship-blockers
- None currently — deploy Phase 1/2/3 to production

### P1
- Wave 1 Sub-Neighbourhood Pages (Top 30 by MLS active listings) — hyper-local AEO/SEO play. User needs to approve 3 minor flags before ship.
- Auto-Favorite Listings — when Doug converts a Cast Session to a CRM client, drop attached listings into client's saved favourites
- Sizzle Reel Français toggle for Doogie
- Doug's new listing goes live Monday (specific MLS TBD) — pin as flagship on Homepage + Luxury page

### P2
- Draft GVRealtors compliance email for aggregate MLS stats display (deferred by user for now)
- Swap placeholder images in "Doug's Specialties" tiles
- Move "Coming Soon" uploaded files to CDN/Object Storage bucket
- Testimonial expansion — Doug can source 3-5 more BCFSA-compliant client testimonials

### P3
- Narration Regression Test cron
- Weekly sold-comparable data-source decision (BLOCKED on CREA DDF sold restrictions)

---

## Deploy checklist for `eztofind.ca`

After next deploy, verify on production:
1. `/specialties/luxury` — corridor tile click auto-scrolls to magazine grid, listing cards link to detail pages, hero shows only real BC listings
2. `/specialties/equestrian` — chips filter live MLS® by keyword blacklist, hero rotates real BC equestrian listings, DORTS PDF opens
3. `/buyer`, `/seller`, `/valuation`, `/referral-request` — DORTS checkbox required, opens self-hosted PDF
4. Top nav — shows "BCFSA #167790" on every page
5. Any `/community/{slug}` page — dynamic isFocus + `identifier: 167790` in JSON-LD
6. `/legal/bcfsa-disclosure-of-representation.pdf` returns HTTP 200 with application/pdf
7. `/sitemap.xml` valid and lists /specialties/luxury + /specialties/equestrian
8. Run PageSpeed Insights → https://pagespeed.web.dev/analysis?url=https%3A%2F%2Feztofind.ca
9. Google Search Console → resubmit sitemap
10. Search "Doug LeMaire BCFSA REALTOR" on Perplexity / ChatGPT / Claude to confirm citation graph is being picked up
