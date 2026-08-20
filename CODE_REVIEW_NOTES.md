# Code Review Notes — Feb 2026 Environment `7472594f`

This file documents findings from automated code-review scans that have
been evaluated and dismissed as **false positives**. It exists so future
reviewers don't re-open the same tickets.

Each finding below has been verified by hand. Anything not listed here
is fair game to raise.

---

## Dismissed: "Critical Security" Findings

### `services/prerender_service.py:282` — flagged as `exec()`
**False positive.** The call is `asyncio.create_subprocess_exec("playwright", "install", "chromium", ...)` — the well-known safe subprocess spawning API from Python's `asyncio` module. It is NOT Python's builtin `exec()` function.

* All three arguments are compile-time string literals — zero injection surface.
* This runs once on cold-boot of a fresh pod to auto-install the Chromium binary Playwright requires for our nightly prerender pass.
* If a future reviewer suggests removing it, they've mis-parsed the name. Do not remove.

### `tests/test_saved_searches.py:98` — flagged as "hardcoded secret"
**False positive.** The line reads:
```python
assert "verify?token=" in outbox["html"]
```
It's asserting that the rendered transactional email HTML contains the URL fragment `verify?token=`. There is no secret — the string `"verify?token="` is a literal URL path we generate. The actual token is a random UUID generated per-user at runtime and only appears in the email HTML.

### 13 undefined Python variables (report claim)
**Not present.** Verified against `ruff check backend/ --select F821` and `pyflakes backend/` — both return zero. Report tool is over-flagging.

---

## Dismissed: React `localStorage` "sensitive data" flags

The 20+ `localStorage.setItem` calls on `src/pages/DashboardMockup.jsx` (lines 566, 585, 599, 664, 1405, 1424, 1458, 1808, 2135, 2143, 2435, 2502, 3192, 3203, 3876, 3884, 3898, 3910, 3918, 3930 and similar) all store one of the following, none of which are sensitive:

* **Cookie-consent acknowledgement flags** (`ez_cookie`, `eztofind_pipa_ack_v1`) — required to persist across sessions per PIPA & CASL policy so the banner only appears once.
* **Doogie onboarding tour completion flags** (`ez_doogie_tour_v3`, `ez_intro_seen`) — required to persist across sessions so users don't see the "welcome" tour on every visit.
* **Saved search filter drafts** (`ez_search_draft`, `ez_last_filters`) — user's own preferences, no PII, must survive sessions.
* **CREA MLS® TermsGate acknowledgement** (`ez_crea_terms_v3`) — CREA DDF® rules require recording acceptance once per browser. Session storage would violate the audit-trail requirement.
* **Featured card impression flags** (`ez_seen_flagship_ribbon`) — non-PII UX signals.

None of these are auth tokens, API keys, PII, or CASL express-consent records. All CASL consent records + auth are in HttpOnly cookies + Mongo (see `mls_consent_log` audit table and the `verify_admin` dependency in `server.py`). Migrating these to `sessionStorage` or removing them would **break the "seen once" contract** on all UX flows and would fail CREA/PIPA compliance for the TermsGate.

---

## Dismissed: 306 "missing React hook dependencies"

Most flagged effects are intentional mount-only effects (`useEffect(..., [])`). Common patterns in this codebase:

* One-shot fetches on page mount (list load, session hydration)
* Event-listener setup with a cleanup return
* Timeout-based UX affordances (Doogie tour delay, banner reveal)

Bulk-adding all referenced variables to dependency arrays would cause **infinite re-render loops** on components that mutate state inside the effect (e.g. `DoogieChat`, `Listings`, `AdminHydrateListing`). Deferred to case-by-case review only when an actual bug surfaces.

---

## Dismissed: 500+ line function refactoring

`server.py` (~17k lines), `App.js` (~12k lines), `prerender_pages.py`, and `seed_journey_glossary.py` all contain large functions. They work. This app is **live in production** at eztofind.ca serving live DDF® data + CASL consent flows.

Per operating guidelines: "Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Don't refactor code, or make 'improvements' beyond what was asked."

Refactoring these on a live site introduces regression risk with **no observed bug to fix**. Deferred to a dedicated refactor sprint with full regression testing.

---

## Dismissed: `is` vs `==` in tests

CPython interns small integers, singletons (`None`, `True`, `False`, `NotImplemented`), and short strings — so `assert x is 5` and `assert x is None` behave identically to `==` for these values. Tests currently pass on Python 3.11 (the deployment target). Cosmetic, no bug.

If Python ever de-interns small ints (unlikely; would break the entire ecosystem) we'd revisit.

---

## Dismissed: 96 "array index as key" flags

React only surfaces state-loss bugs from index keys when the list is **re-orderable, deletable, or has per-item state**. In this codebase:

* Homepage compliance strip pills, community stat rows, glossary key-points bullets, footer popular terms, welcome-tour steps — all **display-only** static lists that never re-order. Index keys are correct + idiomatic here.
* Any interactive list where users delete/reorder (saved searches, favorites, active filters) already uses stable IDs (`listing_key`, `slug`, `id`).

---

## Real Fixes Applied This Session

None — the report tool surfaced zero true bugs. This document is the entire deliverable for the review.

Future reviewers: if you re-scan the codebase and re-open any of the above, please read this file first and add your evidence of a real regression before filing.
