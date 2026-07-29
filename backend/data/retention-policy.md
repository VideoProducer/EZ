# EZtoFind.ca — Records Retention Policy

**Effective:** February 26, 2026
**Version:** 1.0
**Owner:** Doug LeMaire, REALTOR® (Records Officer)
**Brokerage:** Fraser Property Management Realty Services Ltd.
**Address:** 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5

## 1. Purpose
This policy governs the storage, retention, and secure destruction of all
personal information and business records collected via EZtoFind.ca. It is
designed to satisfy:

- **BCFSA / Real Estate Services Act (RESA) & Rules** — s. 8-2 record-keeping
  (minimum 7 years for trading services documentation);
- **Personal Information Protection Act (PIPA, BC)** — s. 35 (retention only as
  long as reasonable);
- **Canadian Anti-Spam Legislation (CASL)** — CRTC guidance requiring proof of
  consent for the life of the mailing relationship + audit period;
- **CREA DDF® Data License Agreement** — audit trail obligations.

## 2. Record classes & retention periods

| Record class | Storage collection | Retention | Rationale |
|---|---|---|---|
| Trading-services leads (buyer/seller/valuation intake, referral requests) | `leads` | **7 years** from date of collection | BCFSA RESA Rules s. 8-2 |
| CASL express-consent log (email + timestamp + IP + policy_version) | `mls_consent_log` | **7 years** from last consent action | CRTC audit requirement + BCFSA |
| Saved-search subscriptions + double-opt-in confirmations | `saved_searches` | **Life of subscription + 3 years** after unsubscribe | CASL proof-of-consent + suppression list |
| Outbound email records (transactional + commercial) | `email_outbox` | **3 years** from send date | CASL audit |
| Doogie AI chat logs | `chat_messages` | **30 days** (TTL index) | PIPA data-minimization; not a trading-services record |
| MLS® listing snapshots | `listings` | **Refreshed live from CREA DDF®**; historical snapshots not retained | CREA license terms |
| Admin action audit trail (approvals, generation runs) | `admin_audit_log` | **7 years** | BCFSA licensee accountability |
| Retention-purge attestation records | `retention_purge_log` | **7 years** | Proof of destruction |

## 3. Secure destruction
When a record reaches the end of its retention period:
- A daily background job (`retention_purger`) permanently deletes the document
  from our production database (no soft-delete or shadow copy);
- A hashed digest of the destruction event (record class + count + timestamp)
  is written to `retention_purge_log` so BCFSA/CRTC/OIPC auditors can verify
  the destruction happened, without the destroyed personal data being retained.

## 4. Access, correction, and DSAR
Any individual may request:
- Access to their personal information held by EZtoFind.ca (PIPA s. 23);
- Correction of factual errors (PIPA s. 24);
- Withdrawal of consent and deletion (PIPA s. 9);
- Proof of destruction of their record after retention period ends.

Requests should be sent to **info@eztofind.ca** with the subject line "DSAR" and
will be responded to within 30 business days as required by PIPA.

## 5. Breach notification
Any suspected or confirmed unauthorized access, use, or disclosure of personal
information will be reported to:
- The Office of the Information and Privacy Commissioner for BC (OIPC)
  where required by PIPA s. 34.1;
- Affected individuals without unreasonable delay;
- Doug LeMaire, REALTOR® as the designated Records Officer.

## 6. Amendments
This policy is reviewed annually. The current version is published at
<https://eztofind.ca/legal/retention> and is superseded only by a versioned
successor with a new "Effective" date at the top of the file.

---
**Signed:** Doug LeMaire, REALTOR® — Records Officer
**Date:** February 26, 2026
