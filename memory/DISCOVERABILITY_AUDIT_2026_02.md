# EZtoFind.ca — Phase 2 Discoverability Audit
**Date:** Feb 2026  
**Scope:** SEO · AEO · LLM Citations · Meta / OG · Sitemap · Robots  
**Status:** Live in preview — awaits deploy to production

---

## 1. AEO / LLM Citation Signals

### ✅ Fixed this pass
- **BCFSA Licence #167790 added as machine-readable identifier** in RealEstateAgent JSON-LD schemas across:
  - Homepage (App.js line ~2587)
  - Community pages (240 pages via CommunityPageMockupLive)
  - Equestrian landing page
  - Luxury landing page (NEW schema added — didn't exist before)
- All 4 schemas now include `identifier: [{ "@type":"PropertyValue", "propertyID":"BCFSA Licence Number", "value":"167790", "url":"<BCFSA registry>" }]` — critical for AI answer engines (Perplexity, ChatGPT, Claude, Google AI Overviews) to verify Doug's credential without ambiguity
- `hasCredential` block on the homepage schema updated with the numeric identifier
- Telephone + email + PostalAddress added to all RealEstateAgent schemas — completes the LocalBusiness-hybrid E-E-A-T signal

### ✅ Already strong
- FAQPage schemas on equestrian + community pages with source citations
- BreadcrumbList schemas on all major routes
- WebSite schema with SearchAction potentialAction on homepage
- `sameAs` cross-platform identity graph (Google Maps + secondary domain)
- Structured Doogie source citations (Riparian Areas Regulation, West Van Zoning Bylaw, etc.)
- speakable specification on FAQ answers

---

## 2. Meta Tags & Social Preview

### ✅ Fixed this pass
- **Duplicate meta tag bug eliminated** — `/frontend/public/index.html` had hardcoded `<meta name="description">`, `<meta property="og:title">`, `<meta property="og:description">`, `<meta name="twitter:title">`, `<meta name="twitter:description">` that were DUPLICATING with the per-page Helmet tags. Crawlers were picking the first (static default), making every share preview look identical.
  - **Before**: `/specialties/luxury` showed "EZtoFind.ca | BC Real Estate Search" as og:title with the generic sitewide description
  - **After**: `/specialties/luxury` shows the correct "Luxury Homes for Sale in British Columbia — $3M+ CREA DDF® MLS®" title + curated description
- Structural OG tags (og:type, og:site_name, og:image, og:locale, twitter:card, twitter:image) kept in index.html as fallbacks — safe because they don't vary per page
- Per-page meta now managed EXCLUSIVELY by react-helmet-async via `<SEO>` or dedicated `<Helmet>` blocks

### ✅ Fixed this pass on Luxury page specifically
- Added full Helmet block with title, description, canonical, robots, OG (type, site_name, title, description, url, locale), Twitter card (title, description), and RealEstateAgent + WebPage + BreadcrumbList JSON-LD

### ✅ Fixed this pass on Equestrian page
- Upgraded existing Helmet: added og:site_name, og:url, og:locale, twitter:title, twitter:description; robots directive updated to include max-image-preview:large + max-snippet:-1; description now includes BCFSA licence #167790

---

## 3. Sitemap & Robots

### ✅ Already in place — no changes needed
- Sitemap index at `/sitemap.xml` (HTTP 200) with 5 child sitemaps:
  - `/sitemap-static.xml` (main routes including /specialties/luxury + /specialties/equestrian confirmed)
  - `/sitemap-glossary.xml` (439 statute-cited glossary terms)
  - `/sitemap-communities.xml` (240 community profiles)
  - `/sitemap-neighbourhoods.xml`
  - `/sitemap-listings.xml`
- Nightly cron regenerates all sitemaps
- `/robots.txt` with modern **Content-Signal** directives (`search=yes`, `ai-train=no`, `use=reference`) — this is the current Cloudflare-managed standard for how sites signal AI training + citation policy to LLMs

---

## 4. Sitewide Licence Display (E-E-A-T)

### ✅ Fixed this pass
Doug's BCFSA Licence #167790 now surfaces in:
- **Every page's top nav**: `DOUG LEMAIRE, REALTOR® · BCFSA #167790`
- **Every page's footer contact block**: `BCFSA Licence #167790` sub-line under the REALTOR® name
- **Every page's footer copyright/legal line**: `Doug LeMaire, REALTOR® (BCFSA Licence #167790) of Fraser Property Management Realty Services Ltd.`
- **Equestrian page byline**: `Doug LeMaire, REALTOR® · BCFSA Licence #167790 · Fraser Property Management Realty Services Ltd.`
- **All 4 RealEstateAgent JSON-LD schemas** (structured, machine-readable)

This is the single strongest E-E-A-T signal for AEO/LLM discoverability — it lets any AI answer engine confirm Doug's credential against the BCFSA public registry without ambiguity.

---

## 5. What's still available (Phase 3 preview)

Phase 3 targets device/browser + Core Web Vitals:
- Responsive breakpoint audit (5 breakpoints — 320, 480, 768, 1024, 1400)
- Touch-target audit (WCAG 2.1 SC 2.5.5 — 44×44 minimum)
- Safari / Firefox / Edge CSS fallback verification
- Core Web Vitals (LCP / FID / CLS) — Cloudflare Web Analytics already tracks
- PWA manifest audit (already present, could be enhanced)
- Image lazy-loading + WebP conversion pass on any remaining PNG heavy assets
- Font subsetting (leftover item from Wave D backlog)
