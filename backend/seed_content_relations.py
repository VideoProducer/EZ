"""One-shot idempotent seed script for Phase B content_relations.

Populates high-value manual pins for the ~30-40 most-visited glossary terms
across three clusters (strata / financing / closing). Each pin has priority=0
so it appears above the rule-based auto-suggestions on that term's
"You may also be looking for" grid.

Run:  cd /app/backend && python3 seed_content_relations.py
Idempotent: uses a composite (source_type, source_id, target_href) key so
running twice does not duplicate. Safe to run any time.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

import motor.motor_asyncio

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ---------------------------------------------------------------------------
# Cluster definitions.
# Each pin: (source_slug, {target_kind, title, blurb, href, reason, priority})
# ---------------------------------------------------------------------------

# Strata cluster — connects strata terms to the Buying Guide subject-removal
# step, condo/townhouse specialty pages, and the other core strata documents.
STRATA_CLUSTER = [
    "strata-fees", "strata-corporation", "form-b", "depreciation-report",
    "special-levy", "contingency-reserve-fund", "operating-fund",
    "3-4-vote-resolution", "agm-minutes", "form-f-certificate-of-payment",
    "55-age-restriction-bylaw", "age-restriction-bylaws-prohibited-2022",
]
STRATA_PINS = [
    {"kind": "Guide",    "title": "The Buying Guide — Removing Subjects",   "blurb": "Step 7: how strata document review works during due diligence.",             "href": "/buying-guide#step-7", "reason": "strata-cluster:subject-removal", "priority": 0},
    {"kind": "Glossary", "title": "Form B — Strata Information Certificate", "blurb": "The core certificate obtained before a strata purchase becomes firm.",       "href": "/glossary/form-b",     "reason": "strata-cluster:core-document", "priority": 1},
    {"kind": "Glossary", "title": "Depreciation Report",                     "blurb": "The 30-year physical-condition and funding-strategy report for BC stratas.",  "href": "/glossary/depreciation-report", "reason": "strata-cluster:core-document", "priority": 2},
]

# Financing cluster — connects mortgage/down-payment terms to the Buying
# Guide planning step, valuation estimator, and FHSA/HBP first-time programs.
FINANCING_CLUSTER = [
    "mortgage-pre-approval", "down-payment-requirements", "down-payment-gift-letter",
    "first-home-savings-account-fhsa", "home-buyers-plan-hbp",
    "stress-test", "amortization-period", "adjustable-rate-mortgage-arm",
    "prepayment-penalty", "prepayment-privilege", "mortgage-discharge",
    "cmhc-mortgage-default-insurance",
]
FINANCING_PINS = [
    {"kind": "Guide",     "title": "The Buying Guide — Money & Must-Haves", "blurb": "Step 3: pre-approval, budget ceiling, and closing-cost planning.",           "href": "/buying-guide#step-3", "reason": "financing-cluster:planning-step", "priority": 0},
    {"kind": "Estimator", "title": "Home valuation estimator",              "blurb": "General educational estimate using MLS® comparables. Not an appraisal.",     "href": "/valuation",           "reason": "financing-cluster:budget-tool",   "priority": 1},
    {"kind": "Glossary",  "title": "First Home Savings Account (FHSA)",     "blurb": "Federal tax-free savings account designed for first-time buyers.",           "href": "/glossary/first-home-savings-account-fhsa", "reason": "financing-cluster:first-time-program", "priority": 2},
]

# Closing cluster — connects title / tax / possession terms to the Buying
# Guide closing step + Selling Guide closing step.
CLOSING_CLUSTER = [
    "property-transfer-tax-ptt", "additional-property-transfer-tax-foreign-buyer-ptt",
    "gst-new-homes", "first-time-home-buyers-program-ptt",
    "lawyer-or-notary", "completion-date", "possession-date",
    "statement-of-adjustments", "title-search", "escrow",
    "home-buyer-rescission-period-hbrp", "capital-gains-tax-real-estate",
    "material-latent-defect", "property-disclosure-statement",
    "home-inspection", "subject-clauses", "subject-removal",
    "counter-offer", "listing-agreement", "comparative-market-analysis-cma",
]
CLOSING_PINS = [
    {"kind": "Guide",    "title": "The Buying Guide — Closing & Moving In", "blurb": "Step 8: title transfer, Property Transfer Tax, and completion logistics.",     "href": "/buying-guide#step-8", "reason": "closing-cluster:buyer-side", "priority": 0},
    {"kind": "Guide",    "title": "The Selling Guide — Closing & Possession","blurb": "Step 8: mortgage payout, disbursements, and handing over keys.",              "href": "/selling-guide#step-8", "reason": "closing-cluster:seller-side", "priority": 1},
]


def _dedupe_ok(existing, source_type, source_id, target_href):
    """True if we should insert a new record — i.e. no existing active manual
    pin with the same (source_type, source_id, target_href) triple."""
    for r in existing:
        if (r.get("source_type") == source_type
            and r.get("source_id") == source_id
            and r.get("target_href") == target_href):
            return False
    return True


async def _seed():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Sanity: which of the cluster slugs actually exist? Skip missing ones
    # so we never create orphan pins.
    all_slugs = STRATA_CLUSTER + FINANCING_CLUSTER + CLOSING_CLUSTER
    present_slugs = set()
    async for d in db.glossary.find({"slug": {"$in": list(set(all_slugs))}}, {"slug": 1, "_id": 0}):
        present_slugs.add(d["slug"])
    missing = [s for s in all_slugs if s not in present_slugs]
    if missing:
        print(f"⚠  Skipping {len(missing)} missing slugs: {missing}", file=sys.stderr)

    # Pull existing relations once so the dedupe check is O(N*M) once, not per-insert.
    existing = []
    async for r in db.content_relations.find({}, {"_id": 0}):
        existing.append(r)

    inserted = 0
    skipped = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    async def _pin(source_slug, pins):
        nonlocal inserted, skipped
        for pin in pins:
            # Skip if the pin's target is itself (avoid glossary → same-glossary loop)
            if pin["href"] == f"/glossary/{source_slug}":
                continue
            if not _dedupe_ok(existing, "glossary", source_slug, pin["href"]):
                skipped += 1
                continue
            rec = {
                "id": str(uuid4()),
                "source_type": "glossary",
                "source_id": source_slug,
                "target_type": pin["kind"].lower(),
                "target_kind_label": pin["kind"],
                "target_id": pin["href"].split("/")[-1] if pin["href"].startswith("/glossary/") else None,
                "target_title": pin["title"],
                "target_blurb": pin["blurb"],
                "target_href": pin["href"],
                "reason": pin["reason"],
                "priority": pin["priority"],
                "active": True,
                "visibility": "public",
                "created_at": now_iso,
                "created_by": "seed_content_relations.py",
                "notes": "Auto-seeded by /app/backend/seed_content_relations.py",
            }
            await db.content_relations.insert_one(rec)
            existing.append(rec)  # add to in-memory list so subsequent iterations dedupe correctly
            inserted += 1

    # Strata cluster
    for slug in STRATA_CLUSTER:
        if slug in present_slugs:
            await _pin(slug, STRATA_PINS)

    # Financing cluster
    for slug in FINANCING_CLUSTER:
        if slug in present_slugs:
            await _pin(slug, FINANCING_PINS)

    # Closing cluster
    for slug in CLOSING_CLUSTER:
        if slug in present_slugs:
            await _pin(slug, CLOSING_PINS)

    total_now = await db.content_relations.count_documents({})
    print(f"✓ Seed complete — inserted {inserted} new pin(s), skipped {skipped} duplicate(s).")
    print(f"  content_relations collection now holds {total_now} record(s) total.")


if __name__ == "__main__":
    asyncio.run(_seed())
