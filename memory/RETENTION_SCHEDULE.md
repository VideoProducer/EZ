# EZtoFind.ca — Data Retention Schedule

**Owner**: Doug LeMaire, REALTOR® · BCFSA License #167790 · Fraser Property Management Realty Services Ltd.
**Privacy Officer**: info@eztofind.ca
**Version**: 1.0
**Effective**: 2026-02-02
**Review cycle**: Annually, or on material change to statute / business practice

---

## 1. Scope

This schedule governs how long EZtoFind.ca retains each category of personal information collected under British Columbia's *Personal Information Protection Act* (PIPA), the federal *Anti-Spam Legislation* (CASL), and the *Real Estate Services Act* (RESA) plus the BCFSA Rules. It is written to be defensible under a PIPA audit and to satisfy REALTOR® record-keeping obligations.

## 2. Retention rules by data class

| Data class | Records include | Retention period | Statutory basis | Deletion trigger |
|---|---|---|---|---|
| **Trading-services lead records** | Buyer leads, seller leads, valuation leads | **7 years + 1 day** after last interaction | RESA Rules 8-1 / 8-2 (REALTOR® record-keeping); BCFSA Bulletin on document retention | Automatic purge via `retention_loop` background job (`server.py`) |
| **REALTOR® referral applications** | Realtor applications, referral records | **7 years + 1 day** after last status change | RESA Rule 5-11 (referral records) | Automatic purge |
| **CRM Clients** | Names, emails, phones, birthdates, anniversaries, possession dates, mortgage renewal dates | **7 years** after last transaction OR until earlier deletion requested | RESA Rules 8-1 / 8-2 | Admin manual delete (`/admin/clients`) + audit log entry |
| **CASL consent records** | consent_ip, consent_ua, consent_at, unsubscribed, unsubscribed_at | **3 years** after last consent OR **6 months after unsubscribe** (whichever is longer) | CASL s.10(9); CRTC guidance on consent records | Automatic purge |
| **Doogie chat messages** | Session ID, message text, timestamps | **30 days** (MongoDB TTL index on `chat_messages`) | Best practice — minimizes stored PII exposure per PIPA s.4 | MongoDB TTL |
| **Doogie response cache** | Cached AI responses (no user PII) | **7 days** (MongoDB TTL on `doogie_response_cache`) | Not PII — operational cache | MongoDB TTL |
| **Doogie TTS voice cache** | Cached audio blobs by response hash (no user PII) | **30 days** (MongoDB TTL) | Not PII — operational cache | MongoDB TTL |
| **Usage quotas** | Rate-limit counters keyed to session ID | **3 days** (MongoDB TTL on `usage_quotas`) | Operational | MongoDB TTL |
| **Admin login attempts** | IP + failure counters for brute-force lockout | **15 minutes** (rolling window) or until successful login | Security control (PIPA s.34) | Reset on success or window expiry |
| **Beta feedback** | User-submitted feedback, screenshots | **2 years** after submission | Product / QA record | Admin manual delete |
| **Sitemap / SEO artifacts** | Generated sitemap.xml, prerendered HTML | **Regenerated on every content change** — no historical retention | Operational | Overwrite on regenerate |
| **Audit / evidence chain** | Approvals, publishing, glossary updates, evidence chain hashes | **7 years** (immutable append-only log) | RESA Rule 8-1 (record-keeping); OIPC guidance on tamper-evident logs | Immutable — no automatic deletion |
| **Privacy breach records** | Internal breach log per incident | **3 years** after incident closure | PIPA s.34 & OIPC breach guidance | Manual archival |
| **DSAR (Data Subject Access Request) records** | Request ID, email, timestamp, IP, response | **3 years** after fulfilment | PIPA s.23 audit trail | Automatic purge |
| **Unsubscribe log** | Email + IP + timestamp per opt-out | **3 years** | CASL evidence of honouring opt-out | Automatic purge |
| **MLS® listings snapshot** | CREA DDF® listing data | **As-supplied by CREA — refreshed daily; historical snapshots not retained** | CREA DDF® Terms § IP + Rule limiting cache | Overwrite on daily sync |
| **Community synopses / weather / neighbourhood synopses** | AI-drafted community content | **Indefinite** while approved; unapproved drafts purged after 90 days | Not PII — editorial content | Manual delete |
| **Cookie-consent selections** | Local-only in browser (no server-side log) | **N/A** — device-side only | PIPA s.7 (consent) | User clears browser storage |

## 3. Early-deletion requests (PIPA s.23–s.29)

Individuals may request earlier deletion of their personal information at any time by emailing **info@eztofind.ca** or using the self-service data-export tool at `/privacy/data-request`.

We will:
1. Verify identity via double opt-in (email verification link) before acting on the request
2. Delete or de-identify within **30 days**
3. Retain records we are legally required to keep (e.g. RESA 7-year rule) with a written explanation to the requester
4. Log the request in `dsar_requests` for 3 years as an audit trail

## 4. Automated enforcement

The following automated mechanisms enforce this schedule:

| Mechanism | Location | Runs |
|---|---|---|
| `retention_loop()` — RESA 7-year purge | `backend/server.py` (background asyncio task) | Once every 24 hours |
| MongoDB TTL index — chat messages 30d | `chat_messages.ts` | Continuous (MongoDB internal) |
| MongoDB TTL index — Doogie response cache 7d | `doogie_response_cache.ts` | Continuous |
| MongoDB TTL index — Doogie TTS cache 30d | `doogie_tts_cache.ts` | Continuous |
| MongoDB TTL index — usage quotas 3d | `usage_quotas.ts` | Continuous |
| Admin login attempt TTL — 15 min | `admin_login_attempts.last_failed_at` (computed) | Continuous |

## 5. Non-retention (data we deliberately do not collect)

- **SIN, date of birth on lead forms** — never requested on public forms
- **Credit card / financial account numbers** — never collected on the site
- **Health information** — never collected
- **Precise geolocation** — never collected (only city / community, self-declared)
- **Cross-site tracking cookies** — not used
- **Third-party marketing pixels** — not used (only first-party analytics)

## 6. Review & revision

This schedule is reviewed **annually** (calendar-year January) and **immediately** on any of the following triggers:
- Amendment to PIPA, CASL, RESA, or the BCFSA Rules
- BCFSA bulletin affecting record-keeping
- OIPC BC guidance affecting retention
- Material change to the site's data collection scope
- Privacy breach requiring policy revision

**Change log**
- **2026-02-02 v1.0** — Initial schedule published (Doug LeMaire, Privacy Officer)
