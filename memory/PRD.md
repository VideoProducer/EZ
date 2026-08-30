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
### Feb 2026 — Referral form simplification + Doogie Routing Sweep (this session)
- **/referral-request board dropdown REMOVED** (`App.js` `ReferralRequest`) — the 10-item BC real-estate board select (CADREB, VIREB, VREB, AIR, SOREB, KADREA, KREB, Powell River / Sunshine Coast, BC Northern + "Not sure") was cut per Feb 2026 OS spec. Board is now inferred by Doug from the submitted city — one less field for buyers/sellers to think about. Buy/Sell toggle, Article 16 hard-block, CASL/PIPA/DORTS consents, and BC City/Community field all retained.
- **Doogie Routing Sweep (`server.py`)** — every substantive Doogie reply now ends with a MANDATORY CTA:
  - **In-territory city** (Vancouver, Burnaby, Surrey, Langley, Abbotsford, Chilliwack, Squamish, Whistler, Pemberton, White Rock, Delta, Richmond, N/W Vancouver, Coquitlam, Port Coquitlam, Port Moody, Maple Ridge, Pitt Meadows, New Westminster, Mission + common sub-community aliases + region names) → farm CTA (`/buyer`, `/seller`, `/valuation`, or `/contact`)
  - **Out-of-area city** (Kelowna, Kamloops, Victoria, Nanaimo, Prince George, Nelson, Fernie, Revelstoke, Sunshine Coast, Salt Spring, etc.) → referral CTA (`/referral-request` via "Referral REALTOR® link")
  - **No city detected** → default in-territory farm CTA
  - Implementation: new `_DOOGIE_IN_TERRITORY_CITIES` + `_DOOGIE_OUT_OF_TERRITORY_CITIES` sets, `_detect_doogie_territory()` deterministic scanner, `_build_doogie_territory_hint()` returns per-turn mandatory closing hint that is appended to the routing hint in `_build_doogie_routing_hint()`. Out-of-territory always takes precedence when both are mentioned.
  - Cache invalidation: `_DOOGIE_CACHE_VERSION` bumped `v3` → `v4` so old cached replies (without the new CTA discipline) can't leak through.
  - Verified via curl: "What is a PTT?" (no city) → `/contact`; "buy a townhouse in Langley" → `/buyer`; "relocating to Kelowna" → `/referral-request`.



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

### Phase D — elite lead-generation upgrade (Feb 20 2026)
Ships the full brief: `/contact` rewrite, luxury matched CTAs, JSON-LD on conversion pages, step_complete analytics, homepage tour demotion, CASL confirmation email, and sitemap priority bump. Verified live on preview.

- **`/contact` rewrite (`App.js`)**: replaced mailbox-first layout with:
  - IdentityLine (Doug + Fraser Property Management Realty Services Ltd.)
  - Two primary CTAs — "What's my home worth?" (navy pill → /valuation) + "Tell Doug what you're looking for" (outline pill → /buyer)
  - Referral link ("Not in Greater Vancouver / Fraser Valley / Sea-to-Sky?" → /referral-request)
  - "What happens next" 4-step block (submit → review within one business day → DoRTS before services → decline anytime)
  - Emails demoted to a collapsed `<details>` accordion (progressive disclosure, closed by default)

- **`/specialties/luxury` matched CTAs (`LuxuryLandingMockup.jsx`)**: new strip between the flagship card and the cinematic hero — Doug identity band + 2 luxury-specific CTAs ("Selling a luxury home?" → /valuation, "Looking for a BC luxury home?" → /buyer) with UTM tags `utm_source=luxury-page&utm_medium=matched-cta`.

- **LocalBusiness / RealEstateAgent JSON-LD (`ConversionPageSchema.jsx`)** injected on `/valuation`, `/buyer`, `/seller`, `/referral-request`. Includes `RealEstateAgent` (Doug + jobTitle + areaServed + brokerage), `RealEstateOrganization` (Fraser Property Management Realty Services Ltd.), and a `ContactAction` with an explicit `expectsAcceptanceOf` clause quoting the "one business day" reply-time claim — so Perplexity / ChatGPT Search / Gemini / Bing Copilot can cite the exact operational commitment verbatim.

- **`step_complete` analytics** now fires on all 4 conversion routes:
  - `/valuation`: `intent` when address+type filled, `contact` when name+email filled
  - `/buyer`: `intent` when type+budget+timeline filled, `contact` when name+email filled
  - `/seller`: `intent` when address+city+type filled, `contact` when name+email filled
  - `/referral-request`: `intent` when city+type filled, `contact` when name+email filled
  - Each event fires ONCE per step (idempotent via local `stepFired` state).

- **Homepage tour auto-start DISABLED (`DoogieTour.jsx`)**: the 1.5s auto-open on first visit was covering the primary conversion CTAs. Tour is now button-only — accessible via the "Take the Doogie tour" pill any time, but never launches unprompted.

- **CASL-compliant confirmation email (`server.py` `_send_lead_confirmation()`)**: fires in the background from `/api/leads/buyer` and `/api/leads/seller`. `kind="transactional"` (CASL s.6(6)(b) exempt — confirms an inquiry the person initiated). Body carries: request-received message, identity of sender (Doug + brokerage), one-business-day claim, non-representation disclaimer, and "while you wait" links. No marketing content, no nurture-series enrollment. Silent-fail (background task).

- **Sitemap priority bump (`sitemap_generator.py`)**:
  - `/valuation`, `/buyer`, `/seller`, `/referral-request`: 0.7 monthly → **0.9 weekly**
  - `/contact`: 0.6 yearly → **0.8 monthly**

Verified via automated smoke test at 390px mobile + 1280px desktop:
- `/contact`: identity ✅, both CTAs ✅, referral link ✅, next-steps block ✅, emails collapsed by default ✅
- `/specialties/luxury`: matched CTA strip ✅, both CTAs present ✅
- `/valuation`: JSON-LD `RealEstateAgent` + "one business day" verified in DOM ✅
- Homepage: DoogieTour code path confirmed neutered (auto-start useEffect is a documented no-op) ✅

### Phase C — /buyer + /seller + /referral-request mirrored (Feb 20 2026)

**Shipped (all four conversion pages `/valuation`, `/buyer`, `/seller`, `/referral-request` now identical treatment)**:
- **IdentityLine** rendered above every H1 with Doug's 2026 headshot (`doug-headshot-2026.jpg`) + name + full brokerage + practice line.
- **Phone → optional** on all four forms, labelled `Phone (optional — Doug replies faster if you include it)`. `required` attribute dropped, `type="tel"` retained.
- **Response-time copy unified** to *"Doug will normally reply within one business day (Mon–Fri, excluding statutory holidays)"* on H1 subhead, thank-you screen, and backend success response (`/api/leads/buyer` + `/api/leads/seller` return the same message).
- **Article-16 stop-state copy updated** verbatim from the brief across all four surfaces (frontend blocks + backend 400 exceptions):
  > *"We can't continue this request through this form. You indicated that you may already be represented by another real-estate professional. To respect that relationship, EZtoFind cannot provide trading services through this request. You can still use our general BC research resources."*
- **Thank-you page** rewritten to the brief's approved copy across `/valuation`, `/buyer`, `/seller`, `/referral-request`:
  > *"Request received. Thanks for reaching out. Doug LeMaire, REALTOR®, will review your request and reply within one business day (Mon–Fri, excluding statutory holidays). Submitting this form does not create a REALTOR®-client relationship. Any representation will be explained in writing before real-estate services are provided."*
- **"While you wait" links** added to every thank-you screen: `Save a search` / `Explore BC communities` / `Ask Doogie a research question`.
- **Analytics events** wired on all four pages: `form_view`, `form_start`, `field_error`, `form_submit`, `article_16_block`, `thank_you_view` — each carries `route`, `landing_page`, `referrer`, `device_type`, and all UTM params.
- **CRM enrichment** via `withConversionContext()` on every POST: `landing_page`, `current_route`, `referrer`, `device_type`, UTM params, `representation_eligibility_result: "eligible" | "represented_block"`, `consent_status: {casl_marketing, pipa_privacy, dorts_acknowledged}`.
- **Testimonial slots** reserved on all four pages (`testimonial-slot-{seller|buyer|seller-conversation}`) — hidden empty divs ready for a permissioned client quote.
- **Progressive disclosure**: BC-journey glossary prose on `/buyer` and `/seller` moved into keyboard-accessible `<details>` accordions below the form so the ATF stays clean on mobile 320-390px.

Verified on preview at mobile 390px:
- `/buyer`, `/seller`, `/referral-request`, `/valuation` — all four pages have IdentityLine ✅, phone `required=false` ✅, ConversionStrip auto-hidden ✅, new Article-16 wording ✅, `form_start` + `article_16_block` analytics fire correctly ✅.

### Phase B — /valuation elite personal-brand refactor + sitewide conversion strip (Feb 20 2026)

**Goal**: turn `/valuation` into a form-first personal-brand landing page with Doug as the hero (not Doogie), while preserving 100% of the MB-approved compliance copy (Article 16 hard-block, DoRTS, PIPA, CASL). Also introduces the sitewide conversion strip and reusable IdentityLine component that Phase C (Buyer/Seller/Referral) will consume.

**Shipped**:
- **New photo**: Saved MB-approved 2026 headshot to `/frontend/public/doug-headshot-2026.jpg` (old `doug-headshot.jpg` preserved for existing schema references).
- **Reusable components**:
  - `components/IdentityLine.jsx` — Doug photo + "Doug LeMaire, REALTOR®" + "Fraser Property Management Realty Services Ltd." + practice line. RESA/BCFSA-compliant licensee prominence (not footer-only). Sizes: `sm` / `md` / `lg`.
  - `components/ConversionStrip.jsx` — sitewide navy→gold header strip with two CTAs: **"What's my home worth?"** → `/valuation` (gold pill) and **"Tell Doug what you're looking for"** → `/buyer` (outline pill). Auto-hides on `/valuation`, `/buyer`, `/seller`, `/referral-request` (per brief — no competing CTAs on conversion pages). UTM-tagged for CRM attribution.
  - `utils/conversionAnalytics.js` — `form_view` / `form_start` / `field_error` / `step_complete` / `form_submit` / `article_16_block` / `thank_you_view` / `phone_click` / `calendar_click` / `doogie_after_submit_use`. Fires into `dataLayer` + `posthog.capture`. Every event carries `route`, `landing_page` (persisted in sessionStorage), `referrer`, `device_type`, and all UTM params. Plus `withConversionContext()` helper that enriches CRM POSTs with the same attribution shape.
- **`/valuation` refactor** (in `App.js`):
  - **Form-first ATF**: mobile 390px sees IdentityLine → H1 → subhead → **Property Address (first actionable field)** → City / Type / Name / Email / Phone / Timeline → Article 16 gate → CASL / PIPA / DoRTS → Submit. No scrolling past legal/process copy to begin the form.
  - **Progressive disclosure**: the "What the market estimate accounts for" glossary prose moved BELOW the form into a keyboard-accessible `<details>` accordion so it never blocks the ATF field.
  - **Phone → optional** (matches brief): label reads `Phone (optional — Doug replies faster if you include it)`. Required `type="tel"` removed; `data-testid="valuation-phone"` retained.
  - **Compliance preserved verbatim**: Article 16 hard-block message, CASL card wording, PIPA + DoRTS ack labels, submit button gated on `currently_listed` — **no MB-approved text was changed**.
  - **Analytics wired**: `form_view` on mount, `form_start` on first field interaction, `article_16_block` when the represented checkbox is toggled on, `form_submit` on POST, `thank_you_view` on success screen.
  - **CRM enrichment**: `withConversionContext()` adds `landing_page`, `current_route`, `referrer`, `device_type`, all UTM params, `representation_eligibility_result: "eligible" | "represented_block"`, and `consent_status: {casl_marketing, pipa_privacy, dorts_acknowledged}` to the `/api/leads/seller` POST body.
  - **Testimonial slot**: `data-testid="testimonial-slot-seller"` reserved (hidden empty div) so a permissioned client quote can be dropped in without a code change.
- **Sitewide integration**:
  - `AppLayout` renders `<ConversionStrip/>` between `<ComplianceStrip/>` and `<Nav/>`.
  - `DashboardMockup` (which owns `/`) also renders `<ConversionStrip/>` right under its `<HomeComplianceBanner/>` so the strip is visible above the Doogie hero on the landing page.
- Verified:
  - Mobile 390px `/valuation`: identity line + form ATF ✅, phone `required=false` ✅, progressive-disclosure accordion below form ✅, testimonial slot present ✅.
  - Article 16 gate: block message renders with MB-approved copy ✅, submit disabled ✅, `article_16_block` event fires ✅.
  - Homepage `/`: ConversionStrip visible on desktop AND mobile ✅, both CTAs carry UTM tags ✅.

**Still to ship (Phase C)**: same treatment on `/buyer`, `/seller`, `/referral-request`.

### Phase 14.4 — Per-Listing Cotala Override + TV QR (Feb 20 2026)
- **Cotala is now a first-class embed host**, alongside Matterport / YouTube / Vimeo:
  - `server.py`: `_tour_host_family()` now returns `"cotala"` for any `*.cotala.com` URL. `_sanitize_tour_url()` normalises variants (`tours.` / `share.` / `www.` + trailing tracking params) to the canonical `https://tours.cotala.com/{id}` embed form. `_EMBEDDABLE_TOUR_HOSTS` includes cotala. Both listing detail and `/api/tours/library` accept `cotala` as embeddable → renders as an inline iframe instead of the "external" click-out card.
  - Verified end-to-end via curl: `PATCH /admin/listings/{key}/virtual-tour` with a Cotala URL → `GET /listings/{key}` returns `virtual_tour_embed.host = "cotala"`.
- **Admin override UI (`AdminHydrateListing.jsx`)** now:
  - Shows a live host-detection badge (✅ Cotala / Matterport / YouTube / Vimeo / Kuula / iGuide, or ⚠️ external click-out) the moment Doug pastes a URL.
  - Renders a live 16:9 iframe preview for any recognised embed-safe URL so Doug sees exactly what the buyer will see, before saving.
  - Placeholder updated to lead with Cotala: `"https://tours.cotala.com/… · https://vimeo.com/… · https://youtu.be/…"`.
- **QR on `/tv`** (`TVDisplayPage.jsx`):
  - Prominent QR block on the idle "Enter the code" screen — big 160×160 SVG QR with a "📱 Scan to browse on your phone" callout. Points at `origin/?utm_source=tv-showing&utm_medium=qr&utm_campaign=eztofind-tv` so walk-in scans are attributable in the CRM export.
  - Small 78×78 sidecar QR always visible on the connected listing viewer so guests standing in front of the TV can save any listing to their own phone.

### Phase 14.3 — EZtoFind TV pairing UX fixes (Feb 20 2026)
- **Cross-env bug**: `TVPairingBlock.jsx` was hard-coding the TV URL to `https://eztofind.ca/tv`, so a code minted on preview sent the TV browser to production (different DB → session not found). Now uses `window.location.origin` dynamically.
- **Apple TV callout**: Added an explainer in the pairing block clarifying Apple TV / Chromecast have no browser, so use iPhone Screen Mirroring instead.
- **Loud error banner on `/tv`**: Replaced the tiny grey error text with a large red banner (2px white outline, drop-shadow) that surfaces the actual server `detail` — so users see "Pairing code not found or expired" instead of "nothing happened".
- **Friendly waiting state**: Replaced the anxiety-inducing "Waiting for the phone…" text with a clear ✅ "TV connected" screen + instructions on what to do on the phone next.
- **Persistent recovery hint**: Always-visible "Stuck? tap Cast on any listing → Get a TV pairing code. Codes expire after 20 min." under the input.
- Verified both empty-code and bad-code paths render the loud red banner correctly on preview.

### Phase 14.2 — Nightly IndexNow Auto-Ping (Feb 20 2026)
- Extracted the `sitemap-ai.xml → IndexNow` push into a shared helper (`_push_sitemap_ai_to_indexnow(trigger=...)`) so both the manual admin endpoint (`/api/admin/ai-discovery/indexnow`) and the nightly cron log identical audit rows to `ai_discovery_pings`.
- Wired the helper into the nightly sitemap cron (`_nightly_sitemap_loop` in `server.py`):
  - Cron time moved from `04:00 UTC` → **`11:00 UTC` = 3:00 AM PST / 4:00 AM PDT** (the "3 AM" quiet window Doug asked for).
  - After the nightly `generate_sitemap()` runs, the cron now (1) pushes the ~405-URL priority batch (top-level + recent glossary + recent community synopses) AND (2) fires the full `sitemap-ai.xml` push (~1,868 URLs) to Bing/Yandex/Naver/Seznam.
  - Every nightly run writes an audit row with `trigger: "nightly_cron"` (admin manual pushes tag as `trigger: "admin_manual"`) so Doug can distinguish them in the discovery-ping history.
- Manually verified: `/api/admin/ai-discovery/indexnow` returns `ok: true, url_count: 1868, batches: 1, status 200`.

### Phase 14.1 — Flagship price contrast + Cotala embed reconfirm (Feb 20 2026)
- **Bold, high-contrast pricing** on both flagship surfaces so the asking price is legible on any device (including bright mobile screens where the previous white-text-on-photo washed out).
  - Homepage flagship (`DashboardFeaturedListing`): swapped washed-out white text overlay for a solid **gold pill** (`clamp(20-32px)`, Sora 900) at the bottom-left of the hero photo — no longer gated on live DDF hydration. Added a second **navy-pill inline price** in the details column so the price stays visible even when the hero swaps to the tour iframe.
  - `LuxuryFlagshipCard` price pill: font-weight boosted to 900, `clamp(1.05-1.35rem)`, deeper shadow.
  - `FeaturedComingSoonListing` just-listed mode: solid gold pill (Sora 900, `clamp(1.65-2.4rem)`).
- **New `hosted_tour_url` prop** on `FeaturedComingSoonListing` — renders `<HostedTourEmbed/>` (Cotala/Matterport-safe) in place of the click-to-play VideoBlock when set.
- Cotala tour URL confirmed on all flagship surfaces: `https://tours.cotala.com/87725` (R3156192).

### Phase 14 — Cotala Hosted Tour (Permanent Fix) (Feb 2026 — this session)
- **Root cause**: Both the DDF-supplied Vimeo (`1218107137`) AND the fallback YouTube (`JS_oWYNOdTU`) had their embed permissions flipped OFF by the respective video owners. YouTube/Vimeo enforce owner-set embed restrictions server-side — no URL parameter, embed domain, or client-side trick can bypass them. Every DDF site hits the same wall the moment an owner flips the switch.
- **Permanent fix**: switched both marketing surfaces (`/` homepage featured card, `/specialties/luxury` flagship page) to a hosted Cotala tour (`https://tours.cotala.com/87725`). Cotala is purpose-built for real-estate tour embedding — no owner-side "disable embedding" toggle, no domain allowlist mechanism — so embeds cannot be broken by a permission flip.
- **Architecture**: new `<HostedTourEmbed>` component (`/frontend/src/components/HostedTourEmbed.jsx`, responsive 16:9). Single source of truth in `FLAGSHIP.tour_embed_url`; homepage `FEATURED_HOME_LISTING.tour_embed_url` mirrors it. Swapping tours in the future is a one-line config edit.
- **Doogie narration untouched** — narration reads our own property description (not the video's audio track), so Doogie keeps narrating photos + tour context regardless of the tour host.

### Phase 13 — Direct YouTube Walkthrough Embed (Feb 2026 — this session)
- **Homepage**: `FEATURED_HOME_LISTING.video_url` set to `https://youtu.be/JS_oWYNOdTU?si=NL6IK_KVmkQjPbkf`. The existing tap-to-play player in `DashboardFeaturedListing` already routes YouTube URLs through `youtube-nocookie.com/embed/{id}?autoplay=1&rel=0` so no player-level changes were needed.
- **Luxury flagship page** (`/specialties/luxury`): new reusable `<YouTubeEmbed>` component (`/frontend/src/components/YouTubeEmbed.jsx`, 16:9 responsive, no cookies until play, matches Doug's requested iframe attributes) inserted directly below the hero photo. Renders as `https://www.youtube-nocookie.com/embed/JS_oWYNOdTU?rel=0&modestbranding=1&enablejsapi=1`.
- **Rationale**: The DDF-supplied Vimeo (`1218107137`) has domain-restricted embeds only Fraser can whitelist. Doug provided this YouTube URL as the permanent walkthrough so both marketing surfaces (home + luxury) show a working video regardless of the Vimeo situation.

### Phase 12 — Host-Aware Tour Fallback + Vimeo dnt Fix (Feb 2026 — this session)
- **Mis-labelled Vimeo failure**: Doug reported that on mobile LTE, the flagship (Vimeo-hosted) tour was showing a fallback that hardcoded "YouTube channel" copy. Root cause: fallback strings weren't reading the actual host. Now `<VirtualTourEmbed>` inspects `embed.url_raw`, detects `youtube.com`/`youtu.be`/`vimeo.com`, and renders host-specific copy — "This Vimeo tour won't embed here / Vimeo has domain-restricted embeds" vs "This YouTube tour won't embed here / channel blocks or content-blocker".
- **Mobile deep-link**: added an **"Open in the YouTube app"** button (URI scheme `vnd.youtube://{id}`) that only renders for YouTube tours. Tapping hands playback to the native YouTube app on iOS/Android which honors sign-in state and bypasses in-browser content blockers.
- **Vimeo `dnt=1` + `transparent=0`** — `_sanitize_tour_url` now appends `?dnt=1&transparent=0` to every Vimeo embed URL. `dnt=1` disables session cookies + analytics so Vimeo player loads under Safari ITP / mobile ad-blockers (previously stripped as a tracker). Verified live: flagship now serves `https://player.vimeo.com/video/1218107137?dnt=1&transparent=0`.
- **Note on the specific flagship failure**: The Fraser Vimeo (`1218107137`) is domain-restricted on Vimeo's side ("Only embed on specific sites" whitelist doesn't include `eztofind.ca`). No embed URL parameter can override that — it's owner-controlled. Fix path: either Fraser adds `eztofind.ca` to the Vimeo allowlist, or Doug pastes a different tour URL via `/admin/hydrate-listing`.

### Phase 11 — Virtual Tour URL Override (Feb 2026 — this session)
- **Root cause**: The CREA DDF® feed for `3015 141 Street` (and similar listings) ships a Vimeo URL containing only the Fraser Property Management branding card — no property footage. It's the media file the brokerage submitted, not a code bug.
- **Fix**: New `PATCH /api/admin/listings/{key}/virtual-tour` endpoint accepts `{ url, is_branded, category }` and stores under `virtual_tour_url_override` — a field DDF ingest never touches, so the override survives every re-sync. Empty string clears the override. Read endpoint prepends the override to `virtual_tour_urls` so it wins the `virtual_tour_embed` selection; DDF-supplied tour stays as fallback in the "All tours" list. Verified live via curl: set override → YouTube nocookie embed served; clear → Vimeo fallback restored.
- **Admin UI**: added Virtual Tour URL override panel below the community picker on `/admin/hydrate-listing` — URL input, "Branded" checkbox, save/clear buttons, current-tour indicator. Doogie's narration + keyframe pipeline auto-regenerates on the next detail view.

### Phase 10 — YouTube Embed → Privacy-Enhanced (Feb 2026 — this session)
- **Virtual Tour embed switched to `youtube-nocookie.com`** — Doug reported the flagship-adjacent YouTube tours were falling through to the "no external embeds" fallback in Safari Private mode. Root cause: Safari's Feb 2026 ITP tightening blocks 3rd-party cookies YouTube's regular embed relies on. Fix: `_sanitize_tour_url` in `server.py` now rewrites `youtube.com/watch?v=X` and `youtu.be/X` to `https://www.youtube-nocookie.com/embed/X?rel=0&modestbranding=1&enablejsapi=1`, and `_EMBEDDABLE_TOUR_HOSTS` allows the `youtube-nocookie.com` netloc. Verified live: 3 sample listings (25344727, 25427719, 25523475) now return the nocookie embed URL while `url_raw` retains the original YouTube URL for the "Open in new tab" fallback.

### Phase 9 — AI Discovery Ping + Community Override Picker (Feb 2026 — this session)
- **AI Discovery IndexNow push** — Perplexity has no public sitemap endpoint, so we proxy via IndexNow (Bing / Yandex / Naver / Seznam, which ChatGPT + Perplexity fallback tap). New `POST /api/admin/ai-discovery/indexnow` reads every URL from `/frontend/public/sitemap-ai.xml`, batch-submits to IndexNow, writes an audit row to `ai_discovery_pings` (180-day TTL). Companion `GET /api/admin/ai-discovery/history` powers the recent-pings collapsible in the admin UI. Verified live: **1,868 URLs pushed, HTTP 200 OK**.
- **Community override picker** — new `GET /api/admin/enclaves-for-city?city=X` returns the enclave list from `bc_neighborhoods.json` (24 enclaves for Surrey), plus `PATCH /api/admin/listings/{key}/community` that saves the override and flips `community_manual_override=true`. DDF ingest and admin backfill were rewritten to use an aggregation-pipeline update with `$cond` on `community_manual_override` so nightly re-sync never overwrites Doug's manual picks. UI: typeahead input + `<datalist>` dropdown added below the hydrate-success card in `/admin/hydrate-listing`.

### Phase 8 — SEO Rewrite Phase 2 + Community Enclave Rollout (Feb 2026 — this session)
- **Answer-first template layer** — added `/frontend/src/utils/answerFirst.jsx` shared components: `<TLDRBlock>` (≤65-word direct answer, `itemProp="abstract"`), `<KeyPointsBlock>` (bulletized outline), `<ComplianceStrip>` (BCFSA · CREA · CASL · PIPA · GVR® pills + BCFSA #167790 attribution). Wired into every `/glossary/{slug}` and `/community/{slug}` page — no per-term hand-editing required, so the answer-first pattern instantly applies to all 401 glossary terms and all 12 community pages.
- **Community Enclave rollout** — added `_derive_community(mapped)` helper in `services/ddf_sync.py` (uses CREA's `CityRegion` when set, else fuzzy-matches against `bc_neighborhoods.json` 48-city enclave map). Wired into both DDF ingest paths + a new `/api/admin/backfill-enclaves` admin endpoint (verified live: **33,004 of 52,200 listings updated, 63% match rate**; Vancouver 2,964, Surrey 2,367, Kelowna 2,253). Search cards on `/listings` and DashboardMockup now render `{community} · {city}` (verified: "Elgin Chantrell · Surrey, BC" on the flagship card).

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

### Feb 27, 2026 — Resend DNS verified · CASL emails now live-shipping
- User added SPF, DKIM (3 CNAMEs), and DMARC records for `eztofind.ca` at Namecheap; Resend flipped domain status to Verified
- Test send: `POST /admin/email/send-test` → `queued=false`, `provider=resend`, `provider_message_id=6eb7fe5f-25bf-4908-868b-7841a842c371` — real production send confirmed
- Outbox flushed — 0 pending; 6 legacy failed messages remain in audit log but all are fake QA test addresses (`@example.com`), not real leads
- `RESEND_FROM` was already pre-configured to `EZtoFind.ca <info@eztofind.ca>` — no code change needed after verification
- **Effect:** CASL confirmation emails on Buyer / Seller / Valuation / Referral form submissions now deliver in real-time to real leads

### Feb 27, 2026 — Coming Soon upload endpoints permanently removed
- Purged `POST /api/admin/coming-soon/upload-photo` and `POST /api/admin/coming-soon/upload-video` endpoints (they wrote to ephemeral pod-local disk which broke on deploy)
- Removed related constants `MAX_PHOTO_BYTES`, `MAX_VIDEO_BYTES`, `PHOTO_MIMES`, `VIDEO_MIMES`
- Frontend `ComingSoon.jsx`: removed file-picker upload UI; replaced with "paste already-hosted image URL" flow (new `addPhotoUrl` handler + `photoUrlInput` state). Video is now YouTube/Vimeo URL only.
- `DELETE /api/admin/coming-soon/asset` retained so existing hosted assets can still be removed. `/api/uploads/*` static mount retained for backward compatibility with any pre-existing hosted assets.
- Lint blocker resolved: ephemeral-upload-storage warning fully cleared.

### Feb 27, 2026 — Lead-Attractor Toolkit + Sitewide Navigation Refresh
**Built:**
- `/tools/bc-buyer-cost-calculator` (existing) — PTT + FTHB + GST + closing costs
- `/tools/ptt-estimator` (NEW) — standalone Property Transfer Tax with FTHB, new-build, foreign-buyer 20% add-on
- `/tools/mortgage-affordability` (NEW) — SEO-indexed wrapper around the homepage `<Calculators/>` OSFI B-20 stress-test module; FAQPage + WebApplication JSON-LD
- `/tools/first-time-buyer` (NEW canonical) — First-Time Buyer Cheat Sheet promoted from `/mockups/…` with 301 redirect

**Nav / Footer:**
- Added `Tools ▾` dropdown to top nav (`ToolsDropdown` component, App.js) between Glossary and About with 4 items
- Added `Free BC Resources` footer column with 11 links (`data-testid="footer-free-bc-resources"`)

**Sitemap:**
- Added 4 new `/tools/*` URLs to sitemap-static.xml at priority 0.85–0.9 (static URL count now 40)

**Rolled back (Feb 27, 2026):** `/tools/seller-net-sheet` page + all nav/footer/sitemap references fully removed at user request.

### P0 — Ship-blockers
- None currently — deploy latest changes to production

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
