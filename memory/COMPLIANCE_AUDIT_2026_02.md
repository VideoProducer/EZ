# EZtoFind.ca — Phase 1 Compliance Audit
**Date:** Feb 2026  
**Scope:** BCFSA · CREA · CASL · PIPA · GVRealtors  
**Status:** Live in preview — awaits deploy to production

---

## 1. BCFSA (Real Estate Services Act + Rules)

### ✅ Already in place
- Global footer brokerage name at ≥ 50% of trade-name/logo size (Rule 5-13)
- REALTOR® identity on every page (name + brokerage + BCFSA-licensed status)
- Doogie AI advice-not-provided disclaimer (global footer + Luxury Concierge panel)
- Advertising: "Not intended to solicit properties currently listed for sale" line in footer
- BCFSA Disclosure of Representation PDF self-hosted at `/legal/bcfsa-disclosure-of-representation.pdf`

### ✅ Fixed this pass (Feb 2026)
- **DORTS acknowledgment checkbox** added to 4 lead forms that were missing it:
  - Buyer form (`/buyer`)
  - Seller form (`/seller`)
  - Valuation form (`/valuation`)
  - Referral form (`/referral-request`)
  - All 4 now render a required checkbox linking to the self-hosted DORTS PDF
- Server: `dorts_ack` field added to `BuyerLead` and `SellerLead` models (optional, defaults False so legacy clients keep working)
- i18n: `consent.dorts` key added across all 6 supported languages (EN, ZH-Hant, ZH-Hans, PA, FA, PT)
- Luxury Concierge "Sample Response" — rewritten to non-advisory tone + in-panel advice disclaimer
- Speculation Tax question rephrased from "exposure" → "generally applies to"

### ⚠️ Requires brokerage/pro sign-off
- **BCFSA Licence Number** — should be printed on lead forms and footer for maximum E-E-A-T signal. Doug's number not yet in the codebase.
- Team advertising rules (Rule 5-13.1) — if Doug operates as a team, ensure team members are individually named per BCFSA rules.
- Testimonial disclosure — the J&M Luxury testimonial should carry "Individual client experience — results not typical" under BCFSA advertising rules for testimonials.

---

## 2. CREA (Trademark + Data Attribution)

### ✅ Already in place
- REALTOR®/MLS® trademark notices in footer (verbatim per CREA Trademark Policy 2019 s.4)
- CREA DDF® attribution on every listing photo
- CREA consent gate ("One-time welcome to our MLS® listings") — mandatory acceptance flow before showing MLS® data
- REALTOR® superscript on all references (`REALTOR<sup>®</sup>`)
- REALTOR.ca red pill badge removed (was misleading consumer-portal brand use)

### ✅ Fixed this pass
- Luxury landing footer: removed "Media syndication placements provided by third-party publishing partners" claim (no such partnership exists)
- Luxury hero copy: removed "vetted for provenance, permits, and privacy" — replaced with truthful statement of what's actually offered (title/permit review at showing request)

### ⚠️ Requires brokerage/pro sign-off
- **GVRealtors aggregate MLS® stats display** — the site shows regional/community listing counts. GVR historically requires a specific compliance email + attribution language for this. Draft email is pending in the backlog.
- **Sold data sourcing** — the return-visit engine has a Just-Sold digest cron ready but no CREA-DDF-compliant sold source yet.

---

## 3. CASL (Canada's Anti-Spam Legislation)

### ✅ Already in place
- Express consent checkbox on all lead forms (`casl_consent`) — required, timestamped server-side (`casl_consent_at`)
- Business identification block in emails (server-side)
- One-click unsubscribe (`/unsubscribe` route + link in every email)
- Consent expiration tracking in `casl_consent_log` collection (7-year retention)
- Admin CASL consent-log export (`/api/admin/export/casl-consent-log`)

### ⚠️ Requires review
- **Email template audit** — confirm every commercial email carries: sender name, physical address, phone/email, unsubscribe link. Server templates exist but should be reviewed against current CASL business-identification requirements (CRTC 2021 guidance).
- **Consent freshness** — CASL consent expires after 2 years for implied consent; express consent is permanent unless withdrawn. Log tracks it, but a periodic "still want emails?" re-confirmation ping would strengthen the compliance posture.

---

## 4. PIPA (BC Personal Information Protection Act)

### ✅ Already in place
- PIPA acknowledgment checkbox on all lead forms (`pipa_ack`), timestamped (`pipa_ack_at`)
- Privacy policy page (`/privacy`) linked from every route
- Cookie consent banner (`PIPACookieBanner`) — top-level `AppLayout` inclusion
- Cookie preferences deep link in footer
- Complaint pathway: BC OIPC linked in privacy banner
- Data-minimization: no PII in localStorage, no cross-domain tracking

### ⚠️ Requires review
- **Cross-border storage disclosure** — MongoDB Atlas region should be documented in privacy policy (users have a right to know where data is stored).
- **Retention policy documentation** — the code enforces 7-year retention on consent logs and other buckets; the privacy policy should surface this in plain language.
- **Access/correction rights** — should be a clear "request my data" / "correct my data" flow. Currently only unsubscribe is fully self-serve.

---

## 5. Greater Vancouver REALTORS® (GVR)

### ⚠️ Pending
- **Aggregate stats display** — GVR requires specific compliance language + attribution when a licensee displays aggregate MLS® statistics. The site currently shows counts on the equestrian, luxury, and community pages.
- **Compliance email draft** — needs to be sent to GVR compliance officer with a full inventory of aggregate-stat displays on the site and requested approval.

---

## Concrete next steps for Doug

1. **Send me your BCFSA licence number** — I'll add it to the footer + lead forms sitewide.
2. **Confirm brokerage compliance officer sign-off** on this audit + Phase 2/3 scope.
3. **Draft GVR compliance email** — I can write the outline; you send from `doug@eztofind.ca`.
4. **Add testimonial disclosure** — small line under the J&M card: "Individual client experience — results are not typical." (I can ship this if you confirm.)
