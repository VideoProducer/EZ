# EZtoFind.ca — Business Plan & Scaling Roadmap
**Author:** Doug LeMaire, REALTOR®  
**Date:** 2026-07-30  
**Vision:** Turn eztofind.ca from a solo BC REALTOR® website into a national real-estate technology platform.

---

## 📋 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Where You Are Today](#2-where-you-are-today)
3. [The Three Business Models](#3-the-three-business-models)
4. [Recommended Path — Hybrid A→B→C](#4-recommended-path--hybrid-abc)
5. [Legal & Regulatory Foundation](#5-legal--regulatory-foundation)
6. [Technical Build Order](#6-technical-build-order)
7. [18-Month Timeline & Milestones](#7-18-month-timeline--milestones)
8. [Cost Breakdown](#8-cost-breakdown)
9. [Revenue Projections](#9-revenue-projections)
10. [Go-to-Market Strategy](#10-go-to-market-strategy)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Success Metrics](#12-success-metrics)

---

## 1. Executive Summary

**Vision:** Build the "Shopify for REALTOR® websites" — a subscription platform that lets any licensed REALTOR® in North America launch a professional, AI-powered, compliance-safe real estate site in 60 seconds.

**Current state:** EZtoFind.ca is a working BC-focused REALTOR® site with unique features (Doogie AI, 396-term glossary, 242 community pages, CREA DDF live IDX, PIPA/BCFSA/CASL compliance, CIPO Copyright #1247822).

**Revenue strategy (3 layers, activated in sequence):**
1. **Referral fees** (national leads → licensed partners in each province) — activate first, $0 tech cost
2. **Franchise licensing** (branded provincial sites with local licensed partners) — activate month 3–6, ~$50K tech investment
3. **SaaS subscriptions** (any REALTOR® anywhere can subscribe to run their own site) — activate month 6–18, ~$100K tech + operations investment

**18-month target:** $250K–$400K ARR from a combination of all three revenue streams.  
**36-month target:** $1.5M–$3M ARR with 400–800 SaaS customers.  
**Personal outcome:** Convert Doug's BC REALTOR® practice into a defensible technology business that generates 4–10× his solo-REALTOR® income without additional home showings.

---

## 2. Where You Are Today

### ✅ Built and operational (production: eztofind.ca)
- **Custom React + FastAPI + MongoDB platform** — fully owned, no template lock-in
- **Live CREA DDF® MLS feed** — ~53,000 BC listings, auto-refreshed
- **Doogie AI assistant** — Anthropic Claude + OpenAI voice, natural-language listing search
- **1,178 SEO pages** — 396 BC glossary terms + 242 communities + 421 micro-neighbourhoods + 119 regions/specialties
- **BCFSA / PIPA / CASL / CREA compliance** — cookie consent, DSAR export, CASL double-opt-in, licensee disclosure
- **CIPO Copyright #1247822** — federal registration for content + Doogie character
- **Copyright enforcement suite** — Evidence Chain, Copycat Detector, Cease-&-Desist AI drafter, 4 watermark canaries
- **CRM** — buyer leads, seller leads, saved searches, referral network, favorites (CASL-synced), campaign consents
- **Personalized homepage + Doogie remembers you** — client-side personalization, PIPA-clean
- **CASL-compliant drip email system** — 5 campaigns (buyer digest, seller updates, welcome series, dormant wake-up, news & tips) with preference center

### 💰 Current revenue model
- **Solo BC REALTOR® practice** — commissions on transactions Doug closes
- **Referral network (partial)** — takes a % of leads sent to partner REALTORs® in his network
- **Approximate ceiling:** $100K–$200K/yr net (limited by Doug's personal capacity)

### 🎯 What's missing for scale
- Multi-tenant architecture (currently one site, one licensee)
- Ability to serve out-of-BC visitors legally
- Subscription billing (Stripe)
- Self-service onboarding for new REALTOR® customers
- Marketing site targeting REALTOR®s as buyers (currently targeting home buyers/sellers)

---

## 3. The Three Business Models

Each model has different revenue potential, legal risk, and technical requirements.

### 💼 Model A: National Referral Network
**Concept:** Attract home buyers/sellers across Canada to eztofind.ca. Route non-BC leads to locally-licensed partner REALTORs®. Take 25% referral fee on close.

**Revenue math:**
- 5 closings/year × $20K avg BC commission × 25% referral fee = **$25,000/yr**
- Zero incremental work beyond initial partner recruitment
- No new tech required
- **Ceiling: ~$100K/yr with 20 closings** (referrals are lumpy; each provincial market needs a strong partner)

**Legal risk:** 🟢 Low — Doug is already licensed to refer clients under BCFSA/RESA. Standard industry practice.

**Time to launch:** 2–4 weeks (partner recruitment)

### 🏢 Model B: Provincial Franchise
**Concept:** License the EZtoFind platform to a licensed REALTOR® in each province. They pay a monthly platform fee + Doug takes a % of their lead flow. Each provincial site (`eztofindalberta.ca`, `eztofindontario.ca`) is legally operated by the local licensee under their license.

**Revenue math:**
- Per franchise: $500–$1,500/mo platform fee + optional per-lead fee
- 10 provincial franchises × $1,000/mo = **$120,000/yr**
- Plus referral fees from cross-province network effects
- **Ceiling: ~$500K/yr with 20 franchisees across CA + US states**

**Legal risk:** 🟢 Low — Doug is a SaaS vendor, not a REALTOR® in those provinces. Legal agreements clarify local operator carries all license/compliance responsibility.

**Time to launch:** 3–6 months (multi-tenant refactor + legal docs + first partner)

### 🚀 Model C: White-Label SaaS
**Concept:** Any licensed REALTOR® in North America signs up for a monthly subscription and gets their own fully-branded instance on their own domain. Doug becomes the tech vendor, not a real estate operator.

**Revenue math (realistic growth curve):**
| Month | Customers | Avg price | MRR | ARR |
|---|---|---|---|---|
| 3 | 5 | $299 | $1,495 | $17.9K |
| 6 | 25 | $349 | $8,725 | $105K |
| 12 | 80 | $399 | $31,920 | $383K |
| 24 | 250 | $449 | $112K | $1.35M |
| 36 | 600 | $479 | $287K | **$3.45M** |

**Legal risk:** 🟢 Zero — Doug is not a REALTOR® in any of the sold-into jurisdictions. Pure software vendor.

**Time to launch:** 6–18 months (full multi-tenant + billing + marketing + support ops)

**Competitors:** RealtyNinja (~$79/mo, 3,000+ customers, ~$3M ARR), Placester, Point2 Homes, RealtyTech. All are less feature-rich than what you already have — you'd be selling a materially superior product.

---

## 4. Recommended Path — Hybrid A→B→C

Don't pick one. **Layer them sequentially.** Each phase de-risks the next by generating revenue that funds it.

```
┌────────────────────────────────────────────────────────────┐
│  Month 0–3:   MODEL A (Referral Network)                   │
│  → $0 tech cost, $25–50K/yr revenue                        │
│  → Validates cross-province demand                         │
├────────────────────────────────────────────────────────────┤
│  Month 3–6:   PILOT for MODEL B (1 provincial partner)     │
│  → Manual codebase clone for one AB or ON REALTOR®         │
│  → $500/mo pilot subscription                              │
│  → Validates SaaS willingness-to-pay                       │
├────────────────────────────────────────────────────────────┤
│  Month 6–12:  MODEL B at scale (multi-tenant refactor)     │
│  → 5–15 provincial franchisees                             │
│  → $60–120K ARR from franchise fees                        │
│  → Continues referral revenue from Model A                 │
├────────────────────────────────────────────────────────────┤
│  Month 12–18: MODEL C launch (self-serve SaaS)             │
│  → Marketing site, Stripe billing, onboarding wizard       │
│  → 80–150 customers by month 18                            │
│  → $250–500K ARR combined all models                       │
├────────────────────────────────────────────────────────────┤
│  Month 18+:   Scale Model C to dominant CA REALTOR® SaaS   │
│  → US expansion (state-by-state MLS integrations)          │
│  → $1M+ ARR by month 24, $3M+ by month 36                  │
└────────────────────────────────────────────────────────────┘
```

**Why this order works:**
- **Model A** proves cross-province lead flow exists — informs where to franchise first
- **Model B pilot** proves REALTORs® will pay for your platform — de-risks Model C investment
- **Model B at scale** funds the Model C build (each franchise pays $500–1,500/mo = self-funding development)
- **Model C** is the big prize but doesn't need building until Model B proves demand

---

## 5. Legal & Regulatory Foundation

### 🚨 The core constraint
Every province/state has a real estate regulator that requires:
- Locally-licensed REALTOR® for trading services in that territory
- Local E&O insurance
- Local advertising disclosures
- Local MLS board agreement per province/state

**Your BCFSA license does NOT extend to Alberta, Ontario, or any US state.** Practicing without a license carries fines up to $50K+ per jurisdiction.

### ✅ Legal structures that comply with all regulations

**Model A (Referral Network):**
- ✅ Legal today — RESA s.1 explicitly permits referring clients to other licensed REALTORs®
- Standard practice at Sotheby's, Century 21, Rocket Referrals, Reali
- Required: Written referral agreement with each partner REALTOR®

**Model B (Franchise) & Model C (SaaS):**
- ✅ Legal — as a software vendor, you are not "trading in real estate"
- Analogous to how Shopify sells to physical stores without being a retailer
- Required contracts:
  - **Master Services Agreement (MSA)** with each customer — makes them the "licensee" for their site
  - **Terms of Use** disclaiming any responsibility for their trades
  - **Privacy Policy** covering how you handle THEIR customer data
  - **Franchise Disclosure Document** (only if using "franchise" terminology — SaaS avoids this)

### 📋 Required legal documents to prepare (before Model B pilot)

| Document | Purpose | Estimated cost |
|---|---|---|
| Master Services Agreement | Contract with each REALTOR® customer | $2,000 (lawyer) |
| Terms of Use (customer-facing) | Disclaims platform liability | $500 (lawyer) |
| Privacy Policy (customer-facing) | PIPEDA + provincial privacy law compliance | Adapt existing eztofind.ca policy — $500 |
| Data Processing Addendum | For PIPA/PIPEDA sub-processing | $500 |
| Referral Partner Agreement | Model A partners | $500 |
| **Total legal setup:** | | **~$4,000** |

### 🔐 Regulatory compliance per jurisdiction (built into platform)

For each tenant, the platform must display:
- **BC** → BCFSA disclosure + PIPA (BC) cookie banner + CASL + CREA trademark notice
- **Alberta** → RECA disclosure + Alberta PIPA + PIPEDA + CASL + CREA
- **Ontario** → RECO disclosure + PIPEDA + CASL + CREA (+ TREB rules if using TREB IDX)
- **Quebec** → OACIQ disclosure + Loi 25 (Quebec privacy) + CASL + Centris (not CREA)
- **US states** → DRE/state-specific + RESPA + CCPA/state privacy + local MLS rules

The multi-tenant architecture pre-loads the right compliance profile per tenant automatically.

---

## 6. Technical Build Order

Sequential build order. Each step is testable independently.

### Phase 0 — Baseline (COMPLETE ✅)
- Current eztofind.ca as-is
- Copyright + enforcement + CASL + campaigns + personalized homepage all live

### Phase 1 — National Referral Network (Model A launch)
**Estimated time: 4–8 hours dev**

**Step 1.1: Un-filter listings by province**
- Remove BC-only filter from `/api/listings` — allow queries for any Canadian province via CREA DDF (already national)
- Add province filter dropdown to `/listings` UI
- Test: search "Calgary" from BC — should return Alberta listings

**Step 1.2: "Find a REALTOR® near you" flow**
- New `/find-realtor` page — visitor enters postal code + intent (buy/sell)
- Backend detects province → matches with a partner REALTOR® from the referral network
- Sends both parties (visitor + partner) intro emails via Resend
- Records referral in `referrals` collection with timestamp + status
- Test: Alberta postal code → Alberta partner receives lead

**Step 1.3: Referral partner CRM (admin panel extension)**
- New `/admin/referrals` view — list of referral partners by province
- Add/edit/deactivate partners
- Track referral history + closed-deal status + fees earned per partner
- Test: create test partner → route a lead → mark closed → verify fee calculation

**Step 1.4: Referral partner recruitment**
- 3–5 partners in AB, ON, QC, USA — use LinkedIn + industry networking
- Written agreement (from legal docs above)
- Onboard each with a shared Slack channel or email thread

### Phase 2 — Model B Pilot (Manual Clone for First Partner)
**Estimated time: 4–8 hours dev**

**Step 2.1: Fork the codebase**
- New folder `/apps/partner-alberta` (or new git branch)
- Change ~20 branding constants: name, colors, logo, licensee info, jurisdiction disclosures
- Change MLS filter from `BC` → `AB`
- Change compliance flags: BCFSA → RECA
- Deploy to a separate URL (`eztofindalberta.ca` or partner's domain)

**Step 2.2: Pilot billing (Stripe manual)**
- Create Stripe account (or use existing)
- Manual invoice to pilot partner: $500/mo for 3 months
- Test: partner receives invoice, pays, gets 3-month access

**Step 2.3: Feedback loop**
- Weekly call with pilot partner: what's missing, what's confusing, what would they pay $999/mo for?
- Track lead conversion in their instance vs. baseline (pre-EZtoFind)
- Iterate on the top 3 requests before Phase 3 refactor

### Phase 3 — Multi-Tenant Refactor (Model B at Scale)
**Estimated time: 60–80 hours dev**

**Step 3.1: Tenant model + super-admin (10 hrs)**
- New `tenants` MongoDB collection with schema from prior conversation
- Super-admin route `/superadmin/tenants` (only Doug can access) — CRUD tenants
- Every existing collection gains a `tenant_id` field
- Migration script: mark all existing data as `tenant_id: "bc-doug"` (default tenant)

**Step 3.2: Domain routing middleware (3 hrs)**
- FastAPI middleware resolves `tenant_id` from Host header
- Attaches tenant to every request context
- Fallback tenant for unknown hosts (marketing site)

**Step 3.3: Query scoping (15 hrs)**
- Update ~200 database queries to include `tenant_id` filter
- Automated test: user A cannot see user B's data
- Every response body verified for tenant isolation

**Step 3.4: Dynamic theming (5 hrs)**
- Tenant branding config loaded at React app boot
- CSS variables set from tenant config: `--brand-navy`, `--brand-gold`, logo src
- Doogie system prompt templated with tenant licensee info

**Step 3.5: Content scoping (8 hrs)**
- Add `applies_to: []` array to `glossary` items (national + provincial tags)
- Add `jurisdiction` field to `communities`, `neighbourhood_synopses`
- Filter queries by tenant's jurisdiction
- Test: AB tenant sees national + AB-specific glossary, not BC-specific PTT

**Step 3.6: Jurisdiction compliance module (10 hrs)**
- Compliance profile per tenant: `{regulator, license_disclosure_text, privacy_law, casl: true, cookie_banner_text}`
- Footer, cookie banner, Privacy Policy all read from tenant compliance profile
- Test: AB tenant footer shows RECA #, BC tenant footer shows BCFSA #

**Step 3.7: MLS multi-provider abstraction (10 hrs)**
- Abstract `services/ddf_sync.py` into `services/mls_sync.py` with provider adapters
- CREA DDF® adapter (existing, refactored)
- Placeholder adapters for TREB (Ontario), Centris (Quebec), Realtyna (USA aggregator)
- Tenant config specifies which MLS provider to use

**Step 3.8: Onboarding wizard (10 hrs)**
- 6-step React flow: `Business Info → Jurisdiction → MLS Credentials → Branding → Domain → Launch`
- Automated tenant creation + DNS setup instructions
- Welcome email with next-steps

**Step 3.9: Stripe subscription integration (10 hrs)**
- Stripe products for Starter/Pro/Brokerage plans
- Webhook handler for subscription events (created, updated, canceled, payment failed)
- Tenant status tied to Stripe status (trial/active/past_due/canceled)
- Self-service billing portal via Stripe

**Step 3.10: Custom domain support (5 hrs)**
- Tenant can add custom domain (`sarahchen.ca`)
- DNS instructions per registrar (GoDaddy, Namecheap, Cloudflare)
- Auto SSL via Let's Encrypt (or Cloudflare Origin Rules)
- Fallback to `slug.eztofind.app` subdomain for free tier

**Step 3.11: Multi-tenant admin isolation (5 hrs)**
- Existing `/admin/*` routes now scoped to logged-in tenant
- Tenant admin sees only their own leads, saved searches, campaigns
- Super-admin (Doug) has cross-tenant access for support

### Phase 4 — Model C SaaS Launch
**Estimated time: 40–60 hours dev + operations**

**Step 4.1: Marketing site (15 hrs)**
- New separate site: `eztofind.tech` or `getflowestate.com` or similar
- Landing page targeting REALTORs® as buyers (not home buyers)
- Feature comparison vs. RealtyNinja / Placester / kvCORE
- Pricing page with self-serve signup
- Testimonials from Model B franchisees

**Step 4.2: Self-serve signup + trial (10 hrs)**
- 14-day free trial (no credit card required)
- Onboarding wizard from Phase 3.8 refined for self-serve
- Automated welcome email sequence
- Support ticket system (Intercom or Crisp)

**Step 4.3: Customer support ops (parallel)**
- Help center / knowledge base (Notion or Intercom Articles)
- Support email (`help@eztofind.tech`) with 24hr SLA
- Onboarding call offer for Pro+ customers

**Step 4.4: Referral / affiliate program (10 hrs)**
- Existing customers refer new customers → get 30% commission for 12 months
- Public leaderboard of top affiliates
- Integrations with common REALTOR® communities (Facebook groups, LinkedIn, industry Slack)

**Step 4.5: Advanced tenant features (~20 hrs, prioritized by customer requests)**
- Multi-user permissions per tenant (owner + team agents)
- White-label email sender domain (via SendGrid subaccounts)
- Custom Doogie voice (via ElevenLabs)
- API access for enterprise customers ($999+ plan)
- Advanced analytics (custom dashboards per tenant)

### Phase 5 — US Expansion
**Estimated time: 30–50 hours + significant business dev**

**Step 5.1: US MLS aggregator integration**
- Contract with Realtyna, MLS Router, or IDX Broker for multi-state IDX access
- Costs: $200–$500/mo per state (customer passes through in their plan)
- Test with 3 pilot US states: CA, TX, FL

**Step 5.2: US compliance module**
- CCPA (California), state privacy laws, RESPA disclosures
- MLS board-specific compliance (some MLS boards have unique rules)
- Fair Housing Act disclosures in listings

**Step 5.3: US marketing**
- Adapt marketing site for US audience
- Attend NAR Annual + state REALTOR® conferences
- Target listings on real estate SaaS review sites (G2, Capterra)

---

## 7. 18-Month Timeline & Milestones

### Month 0–1: Foundation
- [x] Copyright registered (#1247822) ✅
- [ ] File trademarks for "EZtoFind.ca" + "EZ2Find.ca" + logo (Class 36 + 42)
- [ ] Legal docs drafted (MSA, ToU, Privacy, Referral Agreement, DPA) — ~$4,000
- [ ] Rotate admin password + set up GA4 conversion goals

### Month 1–3: Model A Launch
- [ ] Phase 1 tech (un-filter listings, referral flow, partner CRM)
- [ ] Recruit 3–5 referral partners in AB, ON, QC
- [ ] First 5 referrals routed
- [ ] Target: 1–2 closings, $10K referral revenue

### Month 3–6: Model B Pilot
- [ ] Phase 2 manual clone for 1 Alberta partner
- [ ] $500/mo pilot revenue
- [ ] Weekly feedback loop
- [ ] Refine top 3 pain points
- [ ] Sign 2 more provincial partners at $750–$1,500/mo pilots

### Month 6–12: Model B at Scale (Multi-tenant refactor)
- [ ] Phase 3 (60–80 hrs) complete
- [ ] 5–10 provincial franchisees onboarded
- [ ] $60–100K ARR from franchise + referral revenue
- [ ] Legal docs finalized based on early customer feedback

### Month 12–18: Model C Launch
- [ ] Phase 4 (marketing site, self-serve signup, support ops)
- [ ] Public launch at CREA / RealtyPress / industry events
- [ ] 80–150 SaaS customers
- [ ] $250–500K ARR combined

### Month 18+: Scale & US Expansion
- [ ] Phase 5 US expansion (start with CA + TX)
- [ ] $500K → $1M ARR run rate by month 24
- [ ] $3M+ ARR by month 36 (600 customers)

---

## 8. Cost Breakdown

### One-time setup costs (Month 0–3)
| Item | Cost |
|---|---|
| Trademark filing (3 marks × $458) | $1,375 |
| Legal docs (MSA, ToU, Privacy, Referral, DPA) | $4,000 |
| Business incorporation (if not already) | $500 |
| Domain registrations (eztofind.tech, .app, etc.) | $200 |
| Logo refresh (if needed for SaaS branding) | $500 |
| **Total one-time:** | **$6,575** |

### Monthly operational costs (baseline — Month 0–6)
| Item | Cost/mo |
|---|---|
| Emergent hosting + LLM credits | $75–150 |
| Domain renewals (amortized) | $10 |
| Resend email | $0 (free tier) |
| Cloudflare | $0 (free tier) |
| CREA membership (already pays as REALTOR®) | $0 incremental |
| **Baseline monthly:** | **$85–160** |

### Monthly operational costs (growth — Month 6–18)
| Item | Cost/mo |
|---|---|
| Higher-tier Emergent hosting | $200–400 |
| Higher LLM usage (more Doogie chats across tenants) | $100–500 |
| Resend Pro (10K+ emails/mo across campaigns) | $20–80 |
| Stripe fees (~3% of MRR) | $30–1,500 |
| Support tools (Intercom/Crisp) | $100 |
| MLS aggregator subs (Realtyna/IDX Broker for non-CREA jurisdictions) | $200–2,000 (passed through to customers in pricing) |
| Customer support (contract VA @ 10 hrs/wk) | $500–1,500 |
| **Total operational (growth):** | **$1,150–6,000/mo** |

### Revenue vs. cost break-even
- **Month 3:** $2K MRR vs. $200/mo costs → **~90% margin** (Model A + pilot)
- **Month 6:** $8K MRR vs. $1K/mo costs → **~88% margin** (Model B pilots)
- **Month 12:** $32K MRR vs. $3K/mo costs → **~91% margin** (Model B at scale + early SaaS)
- **Month 24:** $112K MRR vs. $10K/mo costs → **~91% margin** (SaaS dominant)

**Note:** These margins are before Doug's own time cost. He remains the primary developer/operator until Month 12+, when hiring a part-time dev + VA becomes appropriate.

---

## 9. Revenue Projections

### Conservative case (base scenario)
| Month | Model A | Model B | Model C | Total MRR | ARR |
|---|---|---|---|---|---|
| 3 | $2K | $500 | $0 | **$2.5K** | $30K |
| 6 | $3K | $3K | $0 | **$6K** | $72K |
| 12 | $5K | $12K | $8K | **$25K** | $300K |
| 18 | $6K | $18K | $30K | **$54K** | $648K |
| 24 | $8K | $22K | $85K | **$115K** | $1.38M |
| 36 | $10K | $25K | $255K | **$290K** | **$3.48M** |

### Aggressive case (10% higher customer count, 5% higher pricing)
| Month | Total MRR | ARR |
|---|---|---|
| 12 | $35K | $420K |
| 24 | $170K | $2.04M |
| 36 | $430K | **$5.16M** |

### Pessimistic case (SaaS growth slower than expected)
| Month | Total MRR | ARR |
|---|---|---|
| 12 | $15K | $180K |
| 24 | $50K | $600K |
| 36 | $120K | **$1.44M** |

**Even the pessimistic case is $1.4M ARR at month 36 — vastly better than the solo REALTOR® ceiling.**

---

## 10. Go-to-Market Strategy

### Model A: Consumer marketing (home buyers/sellers)
- **Continue current SEO strategy** — you already have 1,178 SEO pages driving organic traffic
- **Google Business Profile** for each community page — cheap local visibility
- **Content marketing** — 2 blog posts / month on high-intent keywords ("selling a home in Whistler," "buying your first condo in Vancouver")
- **Referral bonuses** — offer past clients $200 gift card for successful referrals
- **Cost:** $0 (organic) + $200–500/mo optional Google Ads

### Model B: Franchisee recruiting (REALTORs® as partners)
- **LinkedIn outreach** — target BCFSA/RECA/RECO-licensed REALTORs® with 3–10 years experience
- **Referral from your existing referral network** — you already know these people
- **Small industry events** — provincial REALTOR® conferences (BCREA, AREA, TREBB, OREA)
- **Warm messaging:** *"I built a platform that helps me generate 30% more leads without more ad spend. Interested in the Alberta version?"*
- **Cost:** $0–$500/mo (LinkedIn Premium + occasional flight/hotel to events)

### Model C: SaaS marketing (REALTORs® as SaaS customers)
- **Content SEO** — target keywords like "best REALTOR website platform," "Canadian real estate CRM"
- **Comparison pages** — "EZtoFind vs. RealtyNinja," "EZtoFind vs. kvCORE" (competitors invite this — SEO gold)
- **Podcast sponsorships** — Real Estate Rockstars, Bigger Pockets Canadian, Massive Agent
- **Free trial funnel** — 14-day trial, no credit card, aggressive onboarding email sequence
- **Industry events** — RE Summit, CREA AGM, NAR Annual
- **Affiliate program** — existing customers refer new customers for 30% recurring commission
- **Cost:** $2,000–$10,000/mo (scales with revenue)

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **BCFSA / regulator complaint** for out-of-BC activity | Medium if Model A is poorly structured | High (license risk) | Strict referral-only structure; Model B/C operates as software vendor; legal docs make partner the operator |
| **CREA revokes DDF access** | Low | High | Diversify to alternate feeds (TREB, Centris, Realtyna); DDF T&Cs are stable for tech vendors |
| **Competitor cloning** | Medium | Medium | Copyright #1247822 + trademark filings + Copycat Detector + Evidence Chain already in place |
| **Doug burnout as solo operator** | High if growth is too fast | High | Hire part-time dev + VA at $12K/mo threshold (~Month 9); protect Sundays; formalize scope discipline |
| **SaaS market saturation** | Low | Medium | Your differentiation (AI, compliance depth, code ownership) is genuine; RealtyNinja's product is materially inferior |
| **US expansion complexity** | High | Medium | Delay until Month 18+; use US MLS aggregators; start with 3 states, not 50 |
| **Stripe/payment disputes** | Low | Low | Standard SaaS terms; annual plans reduce churn; clear refund policy |
| **AI provider outage (Claude/OpenAI)** | Low | Medium | Multi-provider fallback via Emergent LLM key; graceful degradation of Doogie |
| **Data breach affecting a tenant** | Very Low | Very High | Tenant isolation, encryption at rest, DSAR compliance, breach notification playbook |

---

## 12. Success Metrics

### Month 3 checkpoint
- [ ] 3+ referral partners active
- [ ] 5+ leads routed
- [ ] 1+ closing = $10K+ referral revenue
- [ ] Model B pilot signed at $500/mo

### Month 6 checkpoint
- [ ] Model B pilot delivering 2+ closings for partner
- [ ] $5K MRR combined
- [ ] Multi-tenant refactor 50% complete

### Month 12 checkpoint
- [ ] $25K+ MRR ($300K+ ARR run rate)
- [ ] 10+ franchisees / SaaS customers
- [ ] Net Promoter Score ≥50 (customer satisfaction)
- [ ] Doug hires first VA/support person

### Month 18 checkpoint
- [ ] $50K+ MRR ($600K+ ARR)
- [ ] 100+ customers
- [ ] Marketing site + self-serve signup live
- [ ] First 3 US customers onboarded

### Month 24 checkpoint
- [ ] $100K+ MRR ($1M+ ARR)
- [ ] 250+ customers
- [ ] Doug's own REALTOR® practice runs on autopilot (or has been sunsetted)
- [ ] Team of 2 (Doug + 1 developer + 1 VA)

### Month 36 checkpoint
- [ ] $250K+ MRR ($3M+ ARR)
- [ ] 600+ customers
- [ ] Positioned for either continued growth or acquisition ($15M–$40M valuation at 5–10x ARR)

---

## Appendix A — Immediate Next Actions (This Week)

**Legal:**
1. Book a 30-min call with a BC business lawyer (~$300) to discuss SaaS vendor structure and franchise vs. licensing terminology
2. File the 3 trademarks via CIPO ($458 × 3 = $1,375) — I can walk you through the form

**Technical:**
3. Rotate admin password (P1 from prior action items)
4. Set up GA4 conversion goals to track referral form submissions

**Business:**
5. Draft a 1-page "Referral Partner Agreement" template (I can help)
6. Reach out to 5 REALTORs® in your existing referral network — pitch the referral network formally
7. Identify 1 Alberta REALTOR® interested in a $500/mo pilot for Month 3

---

## Appendix B — Decision Points

**Fork in the road:**
- If Model A generates $3K+/mo by Month 3 → **proceed to Model B pilot**
- If Model A struggles → **investigate why before investing in Model B**
- If Model B pilot has 3+ satisfied customers by Month 6 → **start Phase 3 refactor**
- If Model B pilot fails → **abandon SaaS ambitions, focus on Model A as passive income**

**Kill criteria (when to stop investing):**
- Model B pilot generates <$1K/mo after 6 months → SaaS demand is weaker than expected
- Model C churn >10%/mo for 3 consecutive months → product-market fit not achieved
- Any regulator complaint → pause and consult lawyer before proceeding

---

**End of business plan.**

*Last updated: 2026-07-30 by AI planning assistant, reviewed by Doug LeMaire.*
