# EZtoFind.ca — Privacy Breach Response Plan

**Owner**: Doug LeMaire, REALTOR® (Privacy Officer) · BCFSA License #167790
**Escalation contact**: info@eztofind.ca · (604) 466-7021
**Version**: 1.0
**Effective**: 2026-02-02
**Review cycle**: Annually + after every incident (whether or not reportable)

---

## 1. Purpose

This plan sets out how EZtoFind.ca detects, contains, assesses, notifies, remediates, and records a **privacy breach** as defined under British Columbia's *Personal Information Protection Act* (PIPA) and the *Real Estate Services Act* (RESA). It exists to protect affected individuals, satisfy BCFSA's expectation that licensees have documented incident-response processes, and reduce civil / regulatory exposure.

## 2. Definitions

| Term | Meaning |
|---|---|
| **Personal information (PI)** | Information about an identifiable individual — PIPA s.1 |
| **Breach** | Unauthorized access to, collection, use, disclosure, disposal, or loss of PI |
| **Significant harm** | Bodily harm, humiliation, damage to reputation or relationships, loss of employment, financial loss, identity theft, negative effects on credit record, or damage to or loss of property (OIPC guidance) |
| **Reasonably possible** | More than speculative, based on the sensitivity of the PI and probability of misuse |

## 3. Incident-response steps (target timelines are firm ceilings, not floors)

### Step 0 — Detect (any time)
Detection channels:
- Alerts from application logs / monitoring
- Security researcher report (via `security@eztofind.ca` — inbound)
- User report (via any contact channel or `/complaints` page)
- Third-party disclosure (e.g., hosting provider, AI provider)
- Doug's own observation

### Step 1 — Contain (target: **within 4 hours** of detection)
| Action | Owner |
|---|---|
| Isolate affected systems (take endpoint offline, revoke keys, disable accounts) | Doug + platform |
| Rotate all potentially exposed credentials (admin password, API keys, JWT secrets, third-party keys) | Doug |
| Snapshot current state for forensic review (Mongo dump, logs, deployment artifacts) | Doug |
| Freeze the affected data class from further writes if practical | Doug |
| Open the internal incident record (see §8) | Doug |

### Step 2 — Assess (target: **within 24 hours** of detection)
Answer, in writing:
1. **What data** was involved? (Categories from `/app/memory/RETENTION_SCHEDULE.md`)
2. **How many individuals** are affected?
3. **How sensitive** is the data? (Name+email = low; SIN or financial data = high — note: we do not collect SIN or financial data on public forms)
4. **What is the cause**? (Configuration error / stolen credential / third-party breach / lost device / malicious insider)
5. **Is significant harm reasonably possible?** (See §2 definition)
6. **Is the breach ongoing** or has it been contained?

### Step 3 — Notify (target: **within 72 hours** if significant harm is reasonably possible)

**Regulator — OIPC BC** (mandatory when significant harm is reasonably possible)
- Email: privacyhelp@oipc.bc.ca
- Phone: (250) 387-5629 · toll-free: 1-800-663-7867
- Web breach report: https://www.oipc.bc.ca/for-organizations/reporting-a-privacy-breach/

**Affected individuals** — direct notice by email (or postal mail if email is not available), containing:
- Description of what happened (in plain language)
- When it happened
- What personal information was involved
- What we have done and are doing about it
- What they can do to protect themselves (change passwords, watch for phishing, monitor credit, etc.)
- Our contact for follow-up questions (info@eztofind.ca)
- Their right to complain to the OIPC BC

**BCFSA** — notify the Managing Broker at Fraser Property Management Realty Services Ltd. **immediately**. The Managing Broker will decide whether BCFSA notification is triggered under the RESA Rules (typically for breaches involving trading records or client trust information).

**Third parties** — notify contractors whose systems were involved (hosting provider, AI provider, email provider) as needed for containment and forensics.

**Law enforcement** — notify only if criminal activity is suspected (e.g., ransomware, extortion), on the advice of counsel.

### Step 4 — Remediate (target: **within 30 days**)
- Fix the root cause (patch, rotate, redesign)
- Update controls to prevent recurrence (add monitoring, change access model, add automated tests)
- Update employee / contractor training if human error was a factor
- Update this plan if a gap was exposed

### Step 5 — Record & follow up (indefinite retention of summary; detail retained 3 years)
Every breach — reportable or not — is logged in the internal **Incident Register** (see §8) with:
- Incident ID, detection time, closure time
- Data classes affected, count of individuals
- Cause + remediation
- Whether OIPC was notified, whether individuals were notified
- Lessons learned + preventive actions

Send a written "closed" summary to the Managing Broker and update this plan.

## 4. Roles & responsibilities

| Role | Person / route | Duty |
|---|---|---|
| **Privacy Officer** | Doug LeMaire | Overall accountability; regulator communication |
| **Incident Lead** | Doug LeMaire (or delegate) | Runs the steps in §3 |
| **Technical Lead** | Platform (Emergent Support) | Containment, forensic snapshot, remediation deploys |
| **Communications** | Doug LeMaire | Individual notice letters, media if applicable |
| **Managing Broker** | Fraser Property Management Realty Services Ltd. | BCFSA judgment call |
| **Legal** | Retained BC privacy counsel (engaged for material incidents) | Regulatory strategy, individual notices, third-party demands |

## 5. Communication templates

### 5.1 OIPC BC breach report (email skeleton)
> To: privacyhelp@oipc.bc.ca
> Subject: PIPA Breach Notification — EZtoFind.ca / Doug LeMaire, REALTOR® — Incident [ID]
>
> Organization: EZtoFind.ca operated by Doug LeMaire, REALTOR® (Fraser Property Management Realty Services Ltd.)
> Privacy Officer: info@eztofind.ca · (604) 466-7021
> Incident detected: [ISO timestamp]
> Nature of incident: [1-paragraph description]
> Personal information involved: [categories + record count]
> Individuals affected: [count and BC / out-of-province split]
> Real risk of significant harm: [assessment]
> Containment actions taken: [list]
> Notification to affected individuals: [status + date if sent]
> Remediation plan: [summary]
> Attachments: [forensic timeline; individual-notice template]

### 5.2 Affected individual notice (email skeleton)
> Subject: An important notice about your personal information
>
> Dear [Name],
>
> We are writing to let you know about a privacy incident that involved some of the personal information you shared with EZtoFind.ca. We take this seriously and want to give you the facts so you can take any steps you feel appropriate.
>
> **What happened**: [plain-language paragraph — no jargon]
> **When**: [dates]
> **What information was involved**: [specific fields, e.g. "your name, email address, and the message you sent through our contact form"]
> **What we've done**: [containment + remediation]
> **What you can do**: [tailored advice — change password, watch for phishing, etc.]
>
> If you have questions, reply to this email or write to us at info@eztofind.ca. You can also contact the BC Office of the Information and Privacy Commissioner at privacyhelp@oipc.bc.ca or 1-800-663-7867.
>
> Sincerely,
> Doug LeMaire, REALTOR® · Privacy Officer · EZtoFind.ca

## 6. Reporting a suspected breach — inbound channels

Anyone (visitor, security researcher, contractor, staff) may report a suspected breach 24/7:
- Email: info@eztofind.ca (monitored daily)
- Phone: (604) 466-7021
- Web: any contact form on the site, marked "Privacy" in the subject
- Coordinated disclosure: security@eztofind.ca

We commit to acknowledging a report within 24 hours and providing an update within 5 business days.

## 7. Training & tabletop

- Once per calendar year, Doug will run a **tabletop exercise** simulating a mid-sized breach (e.g., lead-form data exposure) and update this plan with any gaps found.
- Any contractor with access to production data reviews and signs this plan annually.

## 8. Incident Register (structure)

| Field | Example |
|---|---|
| Incident ID | 2026-001 |
| Detection date | 2026-02-15 |
| Closure date | 2026-02-27 |
| Data classes | buyer_leads (email, phone) |
| Individuals affected | 12 |
| Cause | Misconfigured admin route |
| Remediation | Added auth check + regression test |
| OIPC notified? | No — significant harm not reasonably possible |
| Individuals notified? | Yes — 12 emails sent 2026-02-16 |
| Managing Broker notified? | Yes — 2026-02-15 |
| Lessons | Add auth-required lint rule to CI |

Register file: internal — retained by Privacy Officer.

## 9. Change log

- **2026-02-02 v1.0** — Initial plan published (Doug LeMaire, Privacy Officer)
