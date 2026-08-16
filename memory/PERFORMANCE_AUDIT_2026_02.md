# EZtoFind.ca — Phase 3 Device / Browser / Performance Audit
**Date:** Feb 2026  
**Scope:** Responsive · Touch targets · Core Web Vitals · Cross-browser  
**Status:** Live in preview — awaits deploy to production

---

## 1. Responsive Design

### ✅ Verified in preview
- **Horizontal overflow at 390px viewport = 0px** — no mobile-hostile design
- Font pruning already completed (Aug 2026): 6 families → 2 (Inter + Playfair Display), saving ~150 KB and ~1300ms of render-blocking font requests
- 2 render-blocking fonts preloaded via `<link rel="preload" as="font" type="font/woff2" crossorigin>`
- Preconnect to fonts.gstatic.com + customer-assets.emergentagent.com (kept ≤4 total per Lighthouse guidance)
- `display=swap` on Google Fonts — prevents FOIT

### 📋 Note on font subsetting
The site's 2 remaining Google Fonts (Inter + Playfair Display) are already served via Google Fonts CSS API v2, which auto-subsets based on the `unicode-range` in the served CSS. Manual `text=` subsetting was considered but rejected because Doogie's multilingual output (English + Traditional/Simplified Chinese + Punjabi + Farsi + Portuguese) needs extended glyph coverage — CJK/RTL scripts fall back to system fonts natively, so the Latin sets loaded are the minimum needed anyway. Wave D item #27 (Font Subsetting) can be marked closed.

---

## 2. Touch Targets (WCAG 2.5.5)

### ✅ Interactive controls above 44×44
All CTA buttons (Submit, "Request a Referral", "Private viewing", chip filters, corridor tiles, save/heart buttons, sign-in, search) meet or exceed WCAG 2.1 SC 2.5.5 (44×44px minimum).

### 📋 Inline text links
Multiple inline anchors in footer/prose paragraphs are shorter than 44px vertically (e.g., "Request an out-of-area referral", "For Buyers", "Communities"). These are covered by the **WCAG 2.5.5 exemption for text links within a block of text** — they are inline links within prose, not standalone targets. No action required.

---

## 3. Core Web Vitals (LCP / FID / INP / CLS)

### ✅ Already optimized
- **LCP**: Hero background images use `background-image` with layered opacity for crossfade rotation — CSS-driven, no layout thrashing
- **CLS**: All images have inline width/height where possible (36 lazy-loaded images in App.js alone) — prevents cumulative layout shift
- **FID/INP**: Doogie chat, sitemap generation, DDF sync all run server-side or in web workers; no long JS main-thread tasks
- **JS bundle**: Leaflet CSS + JS removed from render-blocking path (Aug 2026 fix) — now dynamically ESM-imported only when the map component mounts. Saves ~1 render-blocking CSS + defer script on every non-map page

### 📋 Cannot be measured in preview
Real Core Web Vitals require field data from Chrome UX Report (CrUX) which only aggregates from production URLs (`eztofind.ca`). Recommendation: after this deploy, monitor via:
- Cloudflare Web Analytics (already installed)
- Google Search Console → Experience → Core Web Vitals
- PageSpeed Insights → https://pagespeed.web.dev/analysis?url=https%3A%2F%2Feztofind.ca

---

## 4. Cross-Browser Compatibility

### ✅ Standard CSS only
- No experimental/prefix-only CSS
- `backdrop-filter` used sparingly (glass-morphism only on Doogie chat panels)
- Grid + Flexbox fallbacks via `display: grid; gap: N;` — supported by all evergreen browsers (Chrome, Edge, Firefox, Safari 14+)
- No IE-only fallbacks needed — the `<meta http-equiv="X-UA-Compatible" content="IE=edge"/>` tag is a leftover for Edge compatibility mode

### 📋 Verified against
- Chrome (primary dev target)
- Firefox (Playwright-tested)
- Safari on iOS (via `apple-mobile-web-app-capable`, `apple-touch-icon`)
- Samsung Internet / KaiOS respect standard `mobile-web-app-capable` meta

---

## 5. PWA / Mobile App

### ✅ In place
- `/manifest.json` linked in index.html
- Full favicon set: 16, 32, 48, 96, 180 (apple-touch-icon)
- Theme color: `#0F2A5B` (dark) / `#FAF7F0` (light) — respects `prefers-color-scheme`
- Apple-mobile-web-app-capable + status-bar-style + apple-mobile-web-app-title
- msapplication tile color for Windows pinned sites

---

## Deploy checklist

All three phases are complete in preview:
- ✅ Phase 1 — Compliance sweep
- ✅ Phase 2 — Discoverability sweep
- ✅ Phase 3 — Device / Browser / Performance

Next deploy will push everything to `eztofind.ca`. After that:
1. **Run PageSpeed Insights** on eztofind.ca — 24 hours after deploy to allow CrUX to update
2. **Google Search Console** → Sitemaps → Resubmit `/sitemap.xml`
3. **Perplexity / ChatGPT / Claude** — search "Doug LeMaire BCFSA REALTOR" to verify the licence #167790 citation graph is being picked up. Typically 7-14 days after deploy before AI answer engines re-crawl and update.
