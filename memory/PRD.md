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

### Phase 7 — Video-Pill Navigation Fix + Price Pill Contrast (Feb 2026 — this session)
- **Search-card "Video" pill fix** — the Matterport/Video badges on `DashboardMockup` `ListingCard` were `<div>` elements inside the outer `<Link/>`, so tapping them bubbled up to the parent link. Converted them to real `<button>` elements that `preventDefault()` + `stopPropagation()` and navigate to `/listings/{key}#virtual-tour` on click. Added a matching `useEffect` in `ListingDetail` that scrolls the `#virtual-tour` section into view once the listing has hydrated so the user lands exactly at the walk-through.
- **Flagship price contrast** — wrapped the `$3,297,000.00` price in `LuxuryFlagshipCard` in a solid navy pill with gold text (`data-testid="luxury-flagship-price"`) so it stands out regardless of background — previously blended into the cream `#FAF7F0` surface.

### Phase 6 — PIPA Overlay Fix + Flagship Enclave Backfill (Feb 2026 — this session)
- **PIPA banner overlay bug fix** — `PIPACookieBanner` was a full-width `bottom:0`, `z-index:9999` strip intercepting clicks on the Doogie FAB / drawer send button + `cookie-accept-all`. Reshaped into a left-anchored floating card (`bottom:16, left:16, maxWidth:min(560px, calc(100vw-32px))`, `zIndex:9990`), and suppressed entirely on first visit whenever the fuller `<CookieBanner/>` is showing (checks `ez_cookie` in localStorage) so first-time visitors see one banner, not two.
- **Flagship community enclave label** — added `community: "Elgin Chantrell"` to `FLAGSHIP` config (`/frontend/src/config/flagshipListing.js`) and updated the 3 rendering surfaces to insert it into the address line when present:
  - `LuxuryFlagshipCard` — hero header now reads `3015 141 Street · Elgin Chantrell · Surrey`
  - `FeaturedListingPointer` — top-nav pointer strip
  - `HomepageLeadGenMockup` — preview-flagship variant

### Phase 5 — Glossary Discovery + Conversion Surfaces (Feb 2026 — this session)
- **Popular Terms footer row** — 8 config-driven links (PTT, GST, ALR, Subject Removal, 2-5-10 Warranty, Form B, Amortization, FTB Exemption) added to:
  - Sitewide App.js Footer (`data-testid="footer-popular-terms"` column)
  - DashboardMockup homepage ComplianceFooter (chip row above compliance columns)
- **Inline auto-linked term chips** — `<GlossaryProse text="…"/>` component (`/frontend/src/utils/glossary.jsx`) auto-underlines the first mention of each popular term with a dotted underline linking to `/glossary/{slug}`. Applied to `/buyer`, `/seller`, `/valuation` form hero intros; `/community/{slug}` intro card; and `/listing/{key}` "About This Property" primer
- **Doogie citation chips** — backend `/api/doogie/chat` SSE now emits a `{"citations":[...]}` event before `done` for any reply containing a curated glossary term. Chips render on BOTH Doogie surfaces:
  - App.js `DoogieChat` FAB widget → `data-testid="doogie-citation-chip-{slug}"`
  - DashboardMockup `AskDoogieDrawer` sidebar (homepage) → `data-testid="dash-ask-citation-chip-{slug}"`
- **Brokerage licence #167790 baked into schema graph** — replaced "PENDING" placeholder in `SiteWideSchema.jsx` + `LiveHomepageSchema.jsx` so BCFSA JSON-LD is fully populated for both Person and Organization entities


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

### Phase 8 — CREA DDF® direct import for flagship listing (Feb 17, 2026)
- Added `fetch_by_mls_number()` in `backend/services/ddf_sync.py` — targeted single-listing pull from CREA DDF® by MLS® number (ListingId), with fallback to ListingKey lookup, mapping via `_map_property()`, and Mongo upsert. Respects the same BC filter + display-flag rules as the scheduled sync
- New admin endpoint `POST /api/admin/listings/fetch-by-mls/{mls_number}` (behind `verify_admin`). Hydrates a just-listed property immediately without waiting for the next scheduled incremental sync cycle
- `GET /api/listings/{key}` now falls back to `mls_number` lookup when `listing_key` misses. Buyers, share links, and printed marketing can all reference the paper MLS® number
- Imported **R3156192** — 25+ high-res DDF photos, full public remarks, 5 BR / 7 BA / 6,129 sq ft, year 2001, lot 14,636 sq ft, lat/lon, features (pool, fireplace, parking-2plus, basement)
- **Frontend hydration**:
  - `DashboardMockup.jsx` (`/`) → `mls_auto_detect: true` re-enabled, section always renders snapshot first then swaps in live DDF fields (photos, price, description, beds/baths/sqft, year built). Removed the "hide until DDF returns 200" gate that caused a blank slot on launch
  - `LuxuryFlagshipCard.jsx` (`/specialties/luxury`) → fetches `/api/listings/R3156192` on mount, hydrates hero image, address, description (DDF public remarks prefixed with Doug's tagline), plus a new BR · BA · sq ft · price · MLS® spec strip below the address
- Snapshot config still lives in `flagshipListing.js` + `DashboardMockup FEATURED_HOME_LISTING` as a safe fallback if DDF ever times out. DDF wins when present, snapshot fills gaps
- Verified on both public routes via screenshot — flagship now displays full CREA DDF photo + description + spec set



### Phase 3 — Performance / device (Feb 2026)
- Verified: 0px horizontal overflow at 390px viewport
- Verified: touch targets meet WCAG 2.5.5 (inline text-link exception applied)
- Verified: 2-font pruning already saved ~150KB / ~1300ms
- Verified: PWA-ready manifest + favicon set + apple-touch-icon

### Phase 6 — Lead-Gen P0 sprint (Feb 19, 2026)
Shipped four ticket audit fixes in one batch — 100% BCFSA / CREA / GVR / CASL / PIPA compliant.

**1. Article 16 hard-block extended to `/valuation` and `/referral-request`**
- Both forms now render an under-contract checkbox (`data-testid="valuation-currently-listed"`, `data-testid="referral-under-contract"`)
- On tick: submit disabled + amber warning block referring the visitor back to their existing REALTOR® + link to `/communities` + `/glossary` for general info
- Buyer + seller forms already had this — pattern now consistent across all four intake surfaces

**2. CASL unbundled + default-unchecked + NOT required (CASL s.10)**
- Every lead form (buyer, seller, valuation, referral) now has a **dedicated CASL card** — visually separated from PIPA + DoRTS acknowledgements
- `defaultChecked={false}` verified on all four via Playwright
- `required` attribute REMOVED from CASL input (required = bundled/coerced consent, void under CASL s.10)
- Updated wording: "Yes, email me matching listings and market updates from Doug LeMaire, REALTOR®. I can unsubscribe with one click at any time."
- Sub-label: "Optional — Doug will still respond to this specific request even if you leave this unchecked (CASL s.10(9)(a))."
- i18n key `consent.casl_optional_note` added (English; other languages inherit fallback until translated)
- Backend `/leads/buyer` + `/leads/seller` now REJECT `pipa_ack=false` but ACCEPT `casl_consent=false` (was: rejected both)

**3. `consent_type` + `consent_expiry` on lead schema**
- New helper `compute_consent_fields()` classifies every lead as:
  - `express`         — CASL box ticked → 730 day expiry + `casl_consent_at` timestamp
  - `implied_inquiry` — form submitted without CASL box → 183 day expiry (CASL s.10(9)(a))
  - `none`            — PIPA missing → rejected upstream, kept for schema completeness
- Fields written to both `db.buyer_leads` and `db.seller_leads` on every insert alongside existing `consent_ip` / `consent_ua` / `consent_at`
- Marketing campaign auto-enrollment (`welcome_series`, `seller_updates`) NOW gated on `casl_consent=True` — implied consent no longer opts users into nurture (was: blanket opt-in)
- Nightly loop `_casl_consent_expiry_loop()` runs every 24h, flips `consent_type` to `"expired"` past `consent_expiry` so nurture crons naturally skip expired records

**4. Behaviour-triggered SavedSearchModal on `/listings`**
- `/listing/{key}` detail page writes a rolling 24-hour view log to `localStorage.ez_listing_views`
- `/listings` on mount checks for 3+ distinct listings viewed → auto-opens `SavedSearchModal`
- ALSO: 90-second dwell trigger after last filter change → auto-opens modal
- Modal close writes `localStorage.ez_saved_search_dismissed = Date.now()` — suppresses auto-open for 30 days
- Manual "🔔 Get alerts for this search" button remains available regardless of dismissal state
- Playwright E2E verified: (a) 3-view auto-open, (b) dismissal timestamp recorded, (c) 2nd visit after dismissal does NOT re-fire

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
