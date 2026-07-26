# DDF® Data Access & Compliance Record — EZtoFind.ca

**Prepared:** February 2026
**Record owner:** Doug LeMaire, REALTOR® (Fraser Property Management Realty Services Ltd.)
**Website:** https://eztofind.ca
**Purpose:** Defensive documentation of Doug LeMaire's role, operator model, and CREA DDF® compliance posture. Retained as evidence in the event of a CREA or BCFSA inquiry.

---

## 1. Operator Identification

**Doug LeMaire, REALTOR®**, licensed with Fraser Property Management Realty Services Ltd., is:

- The **sole operator** of the Member Feed Website eztofind.ca
- The **sole technology provider** for eztofind.ca (self-operated custom build — no commercial IDX vendor)
- The **DDF® participant of record** for the following active channels:
  - **Member Feed Channel** (Member Website Feed — My Listings) — active since 2023-08-14
  - **National Shared Pool Channel** — active (Doug's own DDF participant status)

No third-party Technology Provider (as defined in the DDF® Click-Wrap Agreement) operates any DDF® channel on behalf of Doug LeMaire, REALTOR®. Doug is both the DDF® Participant and the site operator.

## 2. Role of Emergent Labs (site development platform)

The eztofind.ca codebase was developed on the Emergent Labs (E1) platform. Emergent's role:

- Emergent provides a **software development environment** and AI-assisted code generation
- Emergent **does not receive, store, or process** any live DDF® Listing Content from CREA
- Emergent **does not have direct access to production DDF® credentials** — those live only in `/app/backend/.env` on Doug's controlled server environment
- Emergent's AI agents produce code files; they do not query the CREA DDF® endpoint, do not receive Listing Content responses, and do not persist any Listing Content
- Emergent is a **build-time tool**, not a runtime DDF® technology provider

Therefore, in the interpretation of the DDF® Click-Wrap Agreement, **Emergent Labs is not a "technology provider" as contemplated by CREA**, which references commercial IDX vendors that operate a REALTOR®'s Member Feed or National Pool Website on an ongoing basis.

Doug LeMaire has emailed `ddf@realtor.ca` (or will, prior to production launch) to confirm this interpretation and will retain the reply as part of this record.

## 3. Where Listing Content actually resides

Live DDF® Listing Content, once flowing:

- Is fetched **server-side only** by FastAPI code running on Doug's controlled infrastructure (never fetched from the browser)
- Is stored in a **MongoDB database** on Doug's controlled infrastructure
- DDF® credentials are stored in `/app/backend/.env` — never committed to Git, never transmitted to third parties
- Photo URLs are proxied to CREA-provided media endpoints with watermarks preserved
- No Listing Content is copied to Emergent's platform or any third party
- No Listing Content is used for AI model training (per the site's `robots.txt` — every AI crawler is disallowed on `/listings*` and `/listing/*`)

## 4. Appropriate Security Measures (National Shared Pool obligation)

Per the DDF® Click-Wrap: *"You warrant that you have implemented Appropriate Security Measures to protect the Listing Content, including taking appropriate steps to protect the Listing Content against data scraping."*

Documented security measures in place:

- **Rate limiting**: `slowapi` middleware on all `/api/listings/*` endpoints, 60 requests/minute per IP
- **AI-crawler exclusion**: `robots.txt` disallows GPTBot, ClaudeBot, Perplexity, Google-Extended, Applebot-Extended, CCBot, PerplexityBot, and every named AI training crawler on `/listings*` and `/listing/*`
- **Terms-of-use click-wrap gate**: consumers must accept CREA-compliant terms before viewing listing content; acceptance logged (IP + user-agent + timestamp) in `mls_consent_log` Mongo collection
- **Server-side data storage**: browser JavaScript never handles DDF® credentials
- **HTTPS-only transport**: TLS 1.2+ enforced by Kubernetes ingress and Cloudflare
- **Application firewall**: Cloudflare edge sits in front of eztofind.ca (bot management + WAF rules)
- **Analytics logging**: every listing view/detail/inquiry logged in `listing_analytics` collection (per CREA Analytics Web Service obligation)
- **CSV audit trail export**: available via admin console at `/api/admin/audit-trail.csv`

## 5. Breach notification protocol

Per the DDF® Click-Wrap: *"[will] promptly provide written notice to REALTOR.ca Canada Inc. about: any request for the disclosure of the Listing Content, including requests by law enforcement authorities…[and] any accidental or unauthorized access to, or disclosure of, the Listing Content."*

Documented protocol:

1. **Detection**: Cloudflare bot alerts + admin dashboard anomaly monitoring
2. **First 24h**: Doug LeMaire, REALTOR®, notifies `ddf@realtor.ca` in writing with facts as known
3. **Follow-up**: full disclosure of scope, affected records, remediation
4. **Legal disclosure requests**: no response until Doug notifies REALTOR.ca Canada Inc., unless required by law or judicial order

## 6. Confidentiality binding

Per the DDF® Click-Wrap: *"[will] treat the Listing Content at all times as confidential information and will bind its employees and agents in writing to the same terms as set out in these terms of use."*

- Doug LeMaire, REALTOR®, is the sole handler of Listing Content on the operational side
- No employees or agents currently have access to production DDF® credentials or the raw feed
- Should any future contractor or employee be granted access, they will be bound in writing to CREA's DDF® confidentiality terms as a condition of access
- This document itself serves as Doug's affirmation of understanding and acceptance of the confidentiality obligation

## 7. Data retention & destruction

Per the DDF® Click-Wrap: *"[will] promptly return to REALTOR.ca Canada Inc. or destroy all personal information that is no longer necessary to fulfill the purpose for which it was made available."*

- Listings withdrawn/sold in the CREA feed are removed from Mongo within one reconciliation cycle (nightly)
- Should Doug's DDF® participation ever terminate, all cached Listing Content will be purged from Mongo within 24 hours of notice
- No Listing Content is transferred to backup services or archived beyond active operational use

## 8. Trademark & attribution

- MLS® and REALTOR® trademarks displayed with proper ® symbol site-wide
- "Powered by REALTOR.ca" 90×90 badge deep-links to specific listing URL on REALTOR.ca (per DDF® visual identity rules)
- Listing brokerage attributed on every listing card and detail page
- Trademark statement rendered on `/listings`, `/listing/{id}`, and in the compliance footer

## 9. Consumer terms of use (click-wrap)

Consumers must accept the following before viewing DDF® Listing Content on eztofind.ca:

- Personal, non-commercial use only
- No scraping, resale, redistribution, or AI training use
- Prices/availability subject to change without notice
- MLS®/REALTOR® trademark acknowledgment
- Acceptance is recorded with IP + user-agent + timestamp for compliance

Consumers cannot view `/listings` or `/listing/{id}` content until they click-through this gate.

## 10. AI use disclosure (BCFSA + CREA AI guidance)

- Site-wide compliance strip discloses AI use ("Doogie is an AI-assisted chatbot and EZtoFind.ca is an AI-assisted platform")
- Doogie chat panel has AI badge + explicit consent modal before first message
- Per-response AI-generated tag on every Doogie chat message
- AI-selected listings labeled as such when surfaced via Doogie natural-language search
- AI-generated content approval trail exportable at `/api/admin/audit-trail.csv` (640+ approval events documented)

## 11. Doug's affirmation

I, Doug LeMaire, REALTOR® (Fraser Property Management Realty Services Ltd.), have read and accepted the DDF® Click-Wrap Agreement in the DDF® Dashboard. I affirm that:

- I am the sole operator of eztofind.ca
- I understand my obligations under the Member Feed Channel and National Shared Pool Channel of the DDF®
- I have implemented Appropriate Security Measures documented above
- I will notify REALTOR.ca Canada Inc. in writing of any change to my operator or technology provider status
- I understand that CREA/REALTOR.ca Canada Inc. may suspend or terminate my DDF® access for any violation, in its sole discretion

**Signed:** _______________________________
**Doug LeMaire, REALTOR®** — Fraser Property Management Realty Services Ltd.
**Date:** _______________

---

*This document is a defensive compliance record retained by Doug LeMaire, REALTOR®, at `/app/memory/data-access-agreement.md`. It is not a contract with CREA — the operative agreement is the DDF® Click-Wrap Agreement accepted in the DDF® Dashboard. This record is designed to be produced on request in the event of a CREA or BCFSA inquiry.*
