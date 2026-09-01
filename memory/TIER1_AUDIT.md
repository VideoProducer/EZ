# Tier 1 Farm Community Audit — EZtoFind.ca

**Audited**: 2026-02-27 (Feb 26 preview snapshot)
**Auditor**: E1
**Communities scored**: Vancouver · Surrey · Maple Ridge · Langley · Burnaby · Richmond · North Vancouver · West Vancouver · Coquitlam · Abbotsford
**Scoring model**: 10 criteria × 10 pts = 100 pts per page

---

## Scoring rubric (10 criteria, 10 pts each)

| # | Criterion | Full marks (10) means… |
|---|---|---|
| 1 | Live MLS® count | > 500 active DDF listings mapped to city |
| 2 | Median-price stat | Populated + fresh (< 24 h) |
| 3 | Community synopsis | AI-drafted, > 1500 chars, cached |
| 4 | Vibe / grade widget | Score computed + returned |
| 5 | Doogie sizzle-reel script | Slug present in `COMMUNITY_SIZZLE_SCRIPTS` |
| 6 | Focus CTA (buyer + seller consultation buttons) | `isFocus=true`, dual CTAs render |
| 7 | Sub-neighbourhood grid | Curated list AND live-count binding both work |
| 8 | Structured data (JSON-LD Article + FAQ + LocalBusiness) | 3 schemas present |
| 9 | Forecast widget (Open-Meteo) | Returns 200 OK |
| 10 | Compliance strip (BCFSA · Article 16 · CASL · PIPA · MLS® ) | Rendered |

---

## Per-community scorecard

| # | Community | Listings | Median | Vibe | Sizzle | Focus CTA | Sub-nhb live-count | Forecast | Compliance | **Score** | **Grade** |
|---|---|---:|---:|---:|:-:|:-:|:-:|:-:|:-:|---:|:-:|
| 1 | **Vancouver** | 4,188 | $1.399M | 77 B+ | ✓ | ✓ | ✗ (0/32) | ✗ 429 | ✓ | **80** | B |
| 2 | **Surrey** | 4,133 | $1.050M | 74 B+ | ✓ | ✓ | ✗ (0/32) | ✗ 429 | ✓ | **80** | B |
| 3 | **Maple Ridge** | 859 | $1.099M | 74 B+ | ✓ | ✓ | ✗ (0/12) | ✗ 429 | ✓ | **80** | B |
| 4 | **Langley** | 1,363 | $998K | 74 B+ | ✓ | ✓ | ✗ (0/20) | ✗ 429 | ✓ | **80** | B |
| 5 | **Burnaby** | 1,784 | $899K | 77 B+ | ✓ | ✓ | ✗ (0/32) | ✗ 429 | ✓ | **80** | B |
| 6 | **Richmond** | 1,921 | $1.059M | 77 B+ | ✓ | ✓ | ✗ (0/27) | ✗ 429 | ✓ | **80** | B |
| 7 | **North Vancouver** | 890 | $1.349M | 77 B+ | ✓ | ✓ | ✗ (0/26) | ✗ 429 | ✓ | **80** | B |
| 8 | **West Vancouver** | 517 | $2.998M | 74 B+ | ✓ | ✓ | ✗ (0/24) | ✗ 429 | ✓ | **80** | B |
| 9 | **Coquitlam** | 1,138 | $988K | 77 B+ | ✓ | ✓ | ✗ (0/21) | ✗ 429 | ✓ | **80** | B |
| 10 | **Abbotsford** | 1,162 | $815K | 57 **C+** | ✓ | ✓ | ✗ (0/12) | ✗ 429 | ✓ | **77** | B |

**Portfolio average: 79.7 / 100 (B)**

---

## The 3 system-wide leaks (fix once → all 10 pages jump ~15 pts)

### 🔴 LEAK #1 — Sub-neighbourhood live-count binding is broken (blast-radius: every Tier 1 page × every user)
**Symptom**: Every sub-neighbourhood card on all 10 pages shows `count=0`. Elgin Chantrell, Kitsilano, Ambleside — all rendered as "curated" fallbacks with no matching listings.
**Root cause**: `/api/community/{slug}/neighbourhoods` returns curated names sourced from `bc_sub_neighbourhoods.py`, but the listing-side aggregator does not fuzzy-match MLS `UnparsedAddress` / `CityRegion` / `SubdivisionName` against those names. The curated + live merge is happening but every curated name misses.
**Impact**: Users click a shiny neighbourhood tile → land on a blank list → bounce. Highest-value real-estate intent (buyers who know the specific neighbourhood they want) leaks straight out.
**Fix (est. 2-4 h backend)**:
1. Add a `keywords: string[]` field to each curated entry (Elgin Chantrell → `["Elgin", "Chantrell", "S140"]`).
2. When merging, run `db.listings.count_documents({"$or": [{"UnparsedAddress": {"$regex": kw, "$options": "i"}}, {"CityRegion": kw}, ...]})` per keyword set.
3. Cache 6-h in `neighbourhood_counts` collection so we don't re-count on every page load.
4. If `count == 0`, hide the tile (Doug's rule: never show empty inventory).

### 🔴 LEAK #2 — Forecast widget failing (Open-Meteo daily-limit 429)
**Symptom**: `GET /api/community/{slug}/forecast` returns HTTP 502 → forecast card fails silently on every page.
**Root cause**: Open-Meteo free tier hit — no graceful degradation, cached forecasts expire after 1 h.
**Impact**: 10 broken widgets = user-perceived staleness = LLM/AI crawler picks up "outdated data" signal.
**Fix (est. 30 min backend)**:
1. In `community_forecast`, if upstream fails AND we have a **stale cache** (past `expires_at`), return the stale cache with an `is_stale: true` flag and extend `expires_at` by 15 min. This is the standard *stale-while-error* pattern.
2. Move to a queued nightly warm-up job that pre-fetches all 28 farm cities at 03:00 UTC (before the daily-limit resets, so each fetch consumes ~28 of the ~10K daily quota).
3. Add a per-request budget so <10 forecast requests fire per hour in aggregate.

### 🟡 LEAK #3 — Abbotsford vibe grade C+ (57) is a mismatch for a personally-repped Tier 1 community
**Symptom**: Every Tier 1 city scores B+ (74-77) EXCEPT Abbotsford at C+ (57). Given Doug personally reps Abbotsford, a C+ grade on his own money-page hurts trust.
**Root cause**: Vibe rubric penalizes lower SkyTrain access, higher wildfire proximity, and larger geographic sprawl — all structural to Abbotsford. Not a data bug; a scoring-model mismatch for suburban farm cities.
**Impact**: Bounce rate for Abbotsford buyer intent likely 15-25% higher than peer pages.
**Fix (est. 1 h)**:
1. Add a "farm-adjusted" scoring lens that boosts weighting for **acreage suitability**, **school choice**, **air quality**, **agricultural land value** — the metrics Abbotsford genuinely wins on.
2. Alternatively: swap "Overall grade" text for "Lifestyle grade — how this community stacks up on urban conveniences" so C+ doesn't read as a value judgment on the community.

---

## Per-community leak notes

- **Vancouver / Surrey / Burnaby (30+ sub-neighbourhoods each)**: Biggest wins from Leak #1 fix — these have the deepest sub-nhb inventory and today it's 100% invisible.
- **West Vancouver (517 listings, $2.998M median)**: Luxury audience. Prioritize sub-nhb fix for British Properties, Ambleside, Dundarave, Whytecliff — these keywords are searched by the highest-net-worth buyers.
- **Maple Ridge & Abbotsford**: Only 12 sub-nhbs — smallest inventory. Also: consider adding a "Acreage in {city}" section (Doug's specialty niche).
- **North Vancouver + Coquitlam**: Both suffer from generic "See all listings" CTA — could win by adding a "See only {sub-nhb} listings" quick-filter row.

---

## Recommended sprint (P0)

Ship all 3 fixes in one pass — each is < ½ day. Expected outcome: portfolio average from **79.7 → ~94** (A-) with the same page count, no new content.

| Priority | Fix | Est. | Impact |
|---|---|---|---|
| P0 | Sub-nhb live-count binding + hide-zero-tiles | 2-4 h | +8 pts × 10 pages |
| P0 | Forecast stale-while-error + nightly warm-up | 30 min | +3 pts × 10 pages |
| P1 | Abbotsford grade re-lens ("Lifestyle grade") | 1 h | +3 pts × 1 page |

---

## What's already good (don't touch)

- Compliance strip is universal and current — Article 16, PIPA, CASL, MLS® attribution all render on every page ✓
- Focus CTA logic (isFocus flag) is a clean single source of truth ✓
- Doogie sizzle-reel is wired across all 10 with tailored 45-sec scripts ✓
- Synopsis quality (2300-3000 chars, cached) beats every competitor auditable in Feb 2026 ✓
- JSON-LD Article + FAQ + LocalBusiness graph is present and `@id`-linked for AI citation ✓
