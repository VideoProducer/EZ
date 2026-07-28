# EZtoFind.ca — Alberta Expansion Plan

**Status:** PARKED — do not execute until Doug signals "go" post-BC launch stabilization
**Owner:** Doug LeMaire (will hold both BCFSA + RECA licenses at execution time)
**Created:** 2026-02-27

---

## 🎯 Objective

Duplicate the entire EZtoFind.ca stack for the Province of Alberta while keeping BC and AB **strictly separate** — separate content, separate DDF feed scope, separate compliance framework, separate CRM buckets — but hosted on the **same eztofind.ca domain** using a `/ab/*` route namespace.

**Not deployed. Not indexed. Not announced.** Code exists in the repo, ready to be turned on the moment Doug's RECA license is issued and a live partner brokerage is confirmed.

---

## 📐 Architecture — Route Namespace Split

The chosen approach: **single-domain, dual-province** via URL prefix.

```
https://eztofind.ca/           → BC site (existing)
https://eztofind.ca/ab/        → Alberta site (new)
https://eztofind.ca/ab/listings
https://eztofind.ca/ab/community/calgary
https://eztofind.ca/ab/glossary/property-transfer-fee-ab
...
```

**Why this approach (vs. subdomain or new domain):**
- Preserves eztofind.ca's SEO authority (single-domain link equity)
- One SSL cert, one Cloudflare zone, one email domain (already active)
- Users switching between provinces stay on the same brand
- Shared admin panel (Doug logs into `/admin` once, sees both provinces)
- CRM stays unified — one leads pipeline, filtered by `province: 'BC'|'AB'`

**Backend split strategy:**
- Same MongoDB, but every province-scoped collection gains a `province` field
- Shared collections (users, admins, email logs) stay unified
- Province-scoped collections get an index on `province`:
  - `listings` (already has BC MLS® data; will accept AB DDF records when enabled)
  - `glossary` (add `province: 'BC'|'AB'|'both'`)
  - `communities` (add `province`)
  - `neighbourhoods` (add `province`)
  - `leads`, `realtor_applications`, `feedback` (add `province`)

**Frontend split strategy:**
- New `<ProvinceContext>` React context reads province from URL prefix (`/ab/*` → AB; otherwise → BC)
- Existing pages get `useProvince()` hook and filter DB queries accordingly
- Duplicate page components for AB where content diverges materially (glossary, communities, compliance pages)
- Shared components (Doogie chat, forms, header/footer) receive province as a prop

---

## 🎯 Primary Service Area — Alberta (Doug's Focus)

**Calgary Metro Core:**
- Calgary
- Airdrie
- Chestermere
- Cochrane
- Okotoks

**Rocky View & Foothills Rural / Estate:**
- Springbank
- Bearspaw
- Elbow Valley
- Heritage Pointe
- Priddis
- Bragg Creek
- Foothills County (rural)
- Rocky View County (rural)

*(Duplicate mention of "Springbank" and "Bearspaw" in the source list was consolidated.)*

**These 13 communities become the AB `/community/*` pages first.** All other AB communities (Edmonton area, Red Deer, Lethbridge, Grande Prairie, Fort McMurray, Medicine Hat, etc.) get generic AI-drafted stub pages so the sitemap has coverage — but Doug's primary focus and Doogie's specialty is Calgary-region.

---

## 📋 Full Work Breakdown Structure

### Phase 0 — Pre-Build Confirmation (Doug's actions before agent starts)

- [ ] Doug's RECA license issued (confirm license number for site display)
- [ ] AB brokerage confirmed (name, address, phone)
- [ ] AB Errors & Omissions insurance certificate confirmed
- [ ] CREA DDF® agreement extended to include AB listings (contact CREA member support)
- [ ] AB `PROVINCE_PROVIDER_ID` collected from Namecheap PE (if separate `alberta@` mailbox desired) — **or** confirm all AB mail routes to existing `info@eztofind.ca`
- [ ] Doug's signed **RECA + BCFSA dual-jurisdiction disclosure statement** ready (client-facing "Doug is licensed in both BC and AB" doc)

### Phase 1 — Backend Foundation (~4-6 hr)

- [ ] Add `province` field + index to: `listings`, `glossary`, `communities`, `neighbourhoods`, `leads`, `realtor_applications`, `feedback`, `saved_searches`
- [ ] Backfill: set `province: 'BC'` on all existing records (one-time migration script)
- [ ] Update all API endpoints under `/api/*` to accept `?province=AB` query param, defaulting to `BC` for backwards compatibility
- [ ] New endpoints where separation is stricter:
  - `POST /api/ab/leads` (buyer, seller, valuation)
  - `POST /api/ab/realtors/apply` (RECA-licensed AB REALTOR® network)
  - `GET /api/ab/glossary`, `/api/ab/communities`, etc.
- [ ] Extend `sitemap_generator.py` to emit `/ab/*` URLs from AB-tagged records
- [ ] Extend Doogie system prompt with province-aware branch:
  - When URL is `/ab/*`, activate the Alberta persona (RECA, Alberta laws, no PTT, municipal assessments, Calgary-region expertise)
  - Otherwise: current BC persona
- [ ] Robots.txt: **do NOT publish `/ab/*` URLs** until launch is authorized. Add `Disallow: /ab/` initially.
- [ ] Update DDF sync job (`_ddf_auto_sync_loop`) to fetch AB listings once CREA extension is confirmed, tagged with `province: 'AB'`
- [ ] Compliance route additions (AB-specific):
  - `/ab/compliance` — RECA disclosure, Alberta consumer protection references
  - `/ab/dorts` → replaced with **AB Consumer Relationships Guide** (RECA-mandated equivalent to BC DORTS)
  - `/ab/privacy` — PIPA-AB compliant Privacy Policy (references AB Privacy Commissioner)

### Phase 2 — Alberta Glossary (~10-15 hr)

**Source strategy:** clone the BC glossary, run all 396 terms through a Claude-powered **Alberta translator** that:
1. Keeps universally-Canadian terms as-is (e.g., "Mortgage Stress Test", "OSFI B-20", "REALTOR®", "CMHC")
2. **Rewrites** ~200 BC-specific terms for AB context (e.g., "Property Transfer Tax" → "Alberta Land Titles Registration Fee")
3. **Deletes** terms that don't apply to AB (e.g., "BC Home Flipping Tax", "Speculation and Vacancy Tax", "Foreign Buyer Ban BC-specific", "PID/BC Assessment", "Strata Property Act")
4. **Adds** ~30-40 AB-specific terms:
   - Alberta Land Titles Office & registration fee schedule
   - RECA (Real Estate Council of Alberta)
   - Alberta Consumer Relationships Guide
   - Municipal Property Assessment (Calgary Assessment, Airdrie, etc.)
   - Alberta Human Rights Act tenancy provisions
   - Condominium Property Act (Alberta) — replaces BC Strata Property Act
   - Rural water rights, well certification, septic systems (major for Foothills/Rocky View)
   - Acreage-specific: ALSA (Alberta Land Stewardship Act), Ag Land protections
   - Municipal Development Plans (MDPs) & Alberta subdivision rules
   - Oil & gas surface leases (relevant for rural parcels — Bragg Creek, Bearspaw)

**Deliverable:** ~350-400 AB glossary entries with the same V2 hallucination-hardening treatment already applied to BC.

### Phase 3 — Alberta Community Pages (~6-10 hr)

**Priority 1 (Doug's primary areas — hand-curated + Claude-drafted):**
- Calgary (with neighbourhood sub-pages: Aspen Woods, Beltline, Bridgeland, Kensington, Mount Royal, etc.)
- Airdrie
- Chestermere
- Cochrane
- Okotoks
- Springbank
- Bearspaw
- Elbow Valley
- Heritage Pointe
- Priddis
- Bragg Creek
- Foothills County
- Rocky View County

**Priority 2 (auto-drafted AI stubs, low priority):**
- Edmonton + inner-ring communities (Sherwood Park, St. Albert, Spruce Grove, Leduc, Fort Saskatchewan, Beaumont)
- Red Deer, Lethbridge, Medicine Hat, Grande Prairie
- Fort McMurray, Camrose, Lloydminster, Wetaskiwin

**Content per community page:**
- Overview + demographics
- Housing character (detached/condo mix, avg price range from live DDF)
- School districts (Alberta Education vs. Calgary Catholic School District, etc.)
- Transit (Calgary Transit / CTrain / rural = private vehicle only)
- Property tax rate (municipal mill rate — differs city by city, unlike BC)
- Nearby micro-neighbourhoods (auto-populated from DDF `CityRegion`)
- **Doug's Insight** paragraph for the 13 primary areas — hand-written or Doug-approved

### Phase 4 — Alberta Doogie Persona (~2-4 hr)

New system-prompt branch activated when `province=AB` context is set:

**Key differences from BC Doogie:**
- Governed by RECA (not BCFSA)
- No PTT — instead references Alberta registration fees (~$50-100 fixed + $2/thousand)
- No BC Home Flipping Tax — advises on general capital gains only
- No BC Speculation Tax — no equivalent in AB
- Municipal assessment (Calgary Assessment, etc.) — not BC Assessment
- Condominium Property Act — not Strata Property Act
- Uses "Real Property Report" (RPR) as standard property-line document — BC uses different survey conventions
- References **Alberta Human Rights Act** for tenancy discrimination guidelines
- Rural specialties: well/septic disclosure, ALSA, oil & gas surface lease implications
- Doogie mascot & voice unchanged — only knowledge base swaps

**Referral logic (unchanged pattern):**
- In-AB, Doug's service area → route to Doug (once AB license active)
- In-AB, outside Doug's service area (Edmonton, Red Deer, north, etc.) → route to Alberta partner REALTOR® network
- Out-of-AB → route to cross-provincial referral network (existing OOP system)

### Phase 5 — Alberta REALTOR® Network (~2-3 hr)

- Duplicate `/realtors` flow at `/ab/realtors`
- Form asks for **RECA License #** instead of BCFSA
- Add "Are you a CREA Member?" question (same as BC form)
- Add AB brokerage field
- Add primary service area (Calgary Metro / Edmonton Metro / Central AB / North AB / South AB)
- Submissions tagged `province: 'AB'` and routed to `realtor@eztofind.ca` with subject prefix `[AB]`

### Phase 6 — Alberta Compliance Framework (~3-5 hr)

- New `/ab/privacy` page — PIPA-AB compliant (Alberta Privacy Commissioner references, correct statute citations)
- New `/ab/terms` — Alberta-specific arbitration clause, jurisdiction: Court of King's Bench of Alberta
- New `/ab/compliance` — RECA-specific disclosures, Consumer Relationships Guide references
- New `/ab/dorts` → **`/ab/consumer-relationships`** — AB's equivalent client-facing form
- New `/ab/code-of-ethics` — AREA (Alberta Real Estate Association) code
- New `/ab/complaints` — RECA complaint process
- All email templates duplicated with AB versions (footer says "RECA #____" instead of "BCFSA #167790" for AB leads)

### Phase 7 — Home & Navigation UX (~2-4 hr)

- Add **province switcher** in header: `[ BC | AB ]` toggle
- URL routing:
  - Root `/` → BC homepage (unchanged, existing users unaffected)
  - `/ab` → Alberta homepage (mirrors BC layout but Alberta-styled: mountain silhouette hero → prairie/foothills hero)
- Homepage differences:
  - Different hero image (Rockies + prairies vs. Vancouver mountains + ocean)
  - Different "primary service area" list (13 AB communities vs. current BC list)
  - Different testimonials (initially blank — Doug's AB testimonials come later)
  - Different Doogie greeting language
- Footer: dual license line — "BCFSA #167790 · RECA #_____" when Doug's license issues
- Locale note: Alberta uses Canadian English same as BC — no i18n changes needed

### Phase 8 — SEO & Sitemap Integration (~1-2 hr)

- Extend `sitemap_generator.py` to emit `/ab/*` URLs
- Keep `Disallow: /ab/` in `robots.txt` during park phase
- Add **JSON-LD schema** for AB communities using `RealEstateAgent` schema with `areaServed` matching Alberta
- Add `<link rel="alternate" hreflang="en-CA">` variants (both point to same content)

### Phase 9 — CRM & Admin Updates (~2-3 hr)

- Admin dashboard: add **province filter** (BC / AB / All)
- Leads table shows province badge (🇨🇦 BC | 🇨🇦 AB)
- CRM lifecycle reminders (birthdays, anniversaries) — AB clients get AB-flavoured email templates (no BC-specific tax references)
- Email routing: AB feedback → `info@`, AB REALTOR® apps → `realtor@`, AB leads → `doug@` (same mailbox structure, differentiated only by subject prefix `[AB]`)

### Phase 10 — Testing & Sign-Off (~2-4 hr)

- **testing_agent_v3_fork** runs on all AB routes end-to-end
- Cross-province regression tests: does BC still work exactly the same for existing users?
- Curl tests: `/api/ab/leads`, `/api/ab/realtors/apply`, `/api/ab/glossary/property-registration-fee-ab`
- Doogie AB smoke tests:
  - "What's Property Transfer Tax in Alberta?" → correctly answers "Alberta has no PTT; instead there are Land Titles registration fees of approximately $50 base + $2 per $5,000 of property value"
  - "Do you handle Sherwood Park?" → routes to Edmonton-area partner (not Doug)
  - "Do you handle Bearspaw?" → routes to Doug
- SEO integrity: no `/ab/*` URL is indexed until unlocking

---

## 🛠️ Estimated Effort

| Phase | Hours (low) | Hours (high) |
|---|---|---|
| Phase 0 (Doug prep) | 0 | 0 (Doug's own admin) |
| Phase 1 (Backend) | 4 | 6 |
| Phase 2 (Glossary) | 10 | 15 |
| Phase 3 (Communities) | 6 | 10 |
| Phase 4 (Doogie AB) | 2 | 4 |
| Phase 5 (Realtor Network) | 2 | 3 |
| Phase 6 (Compliance) | 3 | 5 |
| Phase 7 (UX / Nav) | 2 | 4 |
| Phase 8 (SEO) | 1 | 2 |
| Phase 9 (CRM) | 2 | 3 |
| Phase 10 (Testing) | 2 | 4 |
| **TOTAL** | **34 hr** | **56 hr** |

Realistic execution: **4-8 focused sessions** of 6-8 hours each. Best done in the order above.

---

## 🚀 Activation Checklist (day of AB launch, whenever that is)

The moment Doug signals "unpark AB and go live":

1. **Verify Doug's RECA license active** and update site footer with license number
2. **CREA DDF® feed** confirmed to include AB listings — run manual sync, verify count
3. **Remove `Disallow: /ab/`** from `robots.txt`
4. **Add `/ab/*` URLs** to sitemap.xml (re-run generator)
5. **Resubmit sitemap** to Google Search Console
6. **Add "AB" tab** to province switcher in header
7. **Announce on LinkedIn:** "EZtoFind.ca is now serving Alberta. Calgary, Airdrie, Cochrane, Okotoks, and rural Foothills / Rocky View — powered by AI-assisted search and a REALTOR® who actually answers the phone."
8. **Google Business Profile:** create separate profile for Alberta service (Calgary address if Doug has one, else operate as "service-area business")
9. **Cloudflare:** no changes needed (single domain, single zone)
10. **Emergent deploy:** no changes needed (code is already deployed by then)

---

## ⚠️ Compliance Guardrails (Non-Negotiable)

- **NO AB REALTOR® services offered on the site until Doug's RECA license is verifiable.** The `/ab/*` route stays gated behind `Disallow: /ab/` and returns a "Coming Soon" placeholder if accessed directly before launch.
- **NO AB MLS® data pulled** via DDF until CREA agreement is confirmed to include Alberta scope.
- **NO CASL commercial emails** sent to AB residents until an AB-specific consent record is captured (existing BC consent doesn't transfer).
- **Trust account note:** if Doug ends up holding earnest money in AB, RECA requires an AB-based trust account at an AB financial institution. Coordinate with brokerage.

---

## 🔐 What Stays in BC-Only Mode During Park

- All `/ab/*` routes return **404** to unauthenticated visitors (behind an `IS_AB_ENABLED=false` env flag)
- Admin panel shows both BC and AB content when `IS_AB_ENABLED=true` (dev/preview mode only)
- Sitemap generator skips `/ab/*` URLs when flag is off
- Doogie will not activate AB persona unless province context is truly Alberta AND flag is on
- Robots.txt has `Disallow: /ab/` while parked

**Single env variable to flip:** `AB_LAUNCH_MODE=preview|live`

---

## 📁 Files That Will Be Created/Modified

**New files:**
- `/app/backend/ab/glossary_ab.json` — Alberta glossary seed
- `/app/backend/ab/communities_ab_seed.json` — Alberta community list
- `/app/backend/ab/doogie_ab_prompt.py` — AB Doogie system prompt
- `/app/backend/ab/compliance_ab.py` — RECA/PIPA-AB constants
- `/app/frontend/src/ab/` — dedicated AB React pages folder
  - `HomeAB.jsx`, `CommunityAB.jsx`, `GlossaryAB.jsx`, `RealtorApplyAB.jsx`, `PrivacyAB.jsx`, `ComplianceAB.jsx`, etc.
- `/app/frontend/src/contexts/ProvinceContext.jsx` — province routing hook

**Modified files:**
- `/app/backend/server.py` — add `/api/ab/*` routes
- `/app/backend/sitemap_generator.py` — emit AB URLs
- `/app/frontend/src/App.js` — add `/ab/*` routes to router, province switcher in header
- `/app/frontend/public/robots.txt` — `Disallow: /ab/` while parked
- `/app/backend/.env` — `AB_LAUNCH_MODE=preview`

---

## 📅 When to Execute

**Do not start until ALL of the following are true:**

- [ ] BC site is stable for **at least 7 days** post-launch (no critical bug reports)
- [ ] Doug's initial Google Search Console indexing has begun (some pages showing up in Search)
- [ ] Doug's inbox is receiving live leads through the BC funnel (proves email pipeline is production-solid)
- [ ] Doug has **either**: (a) his RECA license in-hand, or (b) confirmed his RECA license will be issued within the next 60 days
- [ ] Doug says "go" in chat

---

**End of plan.** Total scope: ~40-60 hours across 4-8 sessions. Zero user impact until unlocked with a single env-flag flip.
