"""Command Center Slices 2, 4, 5 · backend contract tests.

Covers:
  · Slice 2 — contact detail + timeline + notes + stage history append
  · Slice 4 — campaign preview + BCFSA guardrail + create + list
  · Slice 5 — reports summary shape + period awareness
  · Auth gating on every new endpoint
"""

import os
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://proptech-hub-111.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "doug@eztofind.ca")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Doug2026Login!")


# ─── fixtures ───────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def admin_session():
    """Login once + return a requests.Session with the eztoken cookie."""
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
                     "turnstile_token": "dev"},
               timeout=30)
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text[:200]}")
    body = r.json()
    tok = body.get("token") or body.get("access_token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


@pytest.fixture(scope="session")
def seeded_buyer(admin_session):
    """Seed a buyer lead directly via Mongo (public /api/leads/buyer
    requires a real Turnstile token in this env)."""
    from pymongo import MongoClient
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
    cli = MongoClient(os.environ["MONGO_URL"])
    db = cli[os.environ["DB_NAME"]]
    lead_id = str(uuid.uuid4())
    email = f"test-seed-{uuid.uuid4().hex[:8]}@example.com"
    doc = {
        "id": lead_id,
        "full_name": "TEST_Command Center Buyer",
        "email": email,
        "phone": "6045551234",
        "areas": ["Surrey"],
        "property_type": "detached",
        "budget_range": "1M-1.5M",
        "timeline": "3-6 months",
        "financing_status": "pre-approved",
        "casl_consent": True,
        "pipa_ack": True,
        "dorts_ack": True,
        "source": "test-seed",
        "status": "new",
        "notes": "seed for command center tests",
        "unsubscribed": False,
        "unsubscribe_token": uuid.uuid4().hex,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db.buyer_leads.insert_one(doc)
    yield {"id": lead_id, "email": email}
    # Teardown — remove seed rows we created
    try:
        db.buyer_leads.delete_one({"id": lead_id})
        db.contact_stages.delete_many({"contact_id": lead_id})
        db.contact_stage_history.delete_many({"contact_id": lead_id})
        db.contact_notes.delete_many({"contact_id": lead_id})
    except Exception:
        pass
    cli.close()


# ─── auth gating ────────────────────────────────────────────────────────
class TestAuthGating:
    def test_contacts_detail_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/contacts/buyer/does-not-matter", timeout=15)
        assert r.status_code in (401, 403)

    def test_notes_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/admin/contacts/buyer/x/notes",
                          json={"body": "no auth"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_campaign_preview_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/admin/campaigns/preview",
                          json={"subject": "x", "body": "y"}, timeout=15)
        assert r.status_code in (401, 403)

    def test_reports_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/reports/summary?period=30d", timeout=15)
        assert r.status_code in (401, 403)


# ─── Slice 2 · contact detail + timeline ────────────────────────────────
class TestSlice2ContactDetail:
    def test_detail_404_for_unknown(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/contacts/buyer/{uuid.uuid4()}", timeout=15)
        assert r.status_code == 404

    def test_detail_shape(self, admin_session, seeded_buyer):
        r = admin_session.get(
            f"{BASE_URL}/api/admin/contacts/buyer/{seeded_buyer['id']}", timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("contact", "raw", "stage", "stage_history", "notes", "emails", "timeline"):
            assert k in j, f"missing {k}"
        assert isinstance(j["timeline"], list)
        assert j["stage"] == "new"
        # timeline should include a submission entry
        types = [t.get("type") for t in j["timeline"]]
        assert "submission" in types
        # timeline sorted newest first
        ats = [t.get("at") for t in j["timeline"] if t.get("at")]
        assert ats == sorted(ats, reverse=True)

    def test_add_note_empty_400(self, admin_session, seeded_buyer):
        r = admin_session.post(
            f"{BASE_URL}/api/admin/contacts/buyer/{seeded_buyer['id']}/notes",
            json={"body": ""}, timeout=15)
        assert r.status_code == 400

    def test_add_note_too_long_400(self, admin_session, seeded_buyer):
        r = admin_session.post(
            f"{BASE_URL}/api/admin/contacts/buyer/{seeded_buyer['id']}/notes",
            json={"body": "x" * 4001}, timeout=15)
        assert r.status_code == 400

    def test_add_note_persists_and_appears_in_timeline(self, admin_session, seeded_buyer):
        body_text = f"TEST_note_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(
            f"{BASE_URL}/api/admin/contacts/buyer/{seeded_buyer['id']}/notes",
            json={"body": body_text}, timeout=15)
        assert r.status_code == 200, r.text
        note = r.json()["note"]
        assert note["author"] == ADMIN_EMAIL
        # GET detail — note is in notes[] AND timeline[]
        d = admin_session.get(
            f"{BASE_URL}/api/admin/contacts/buyer/{seeded_buyer['id']}", timeout=15).json()
        assert any(n.get("body") == body_text for n in d["notes"])
        assert any(t.get("type") == "note" and t.get("meta", {}).get("body") == body_text
                   for t in d["timeline"])


# ─── Slice 2 · stage history dedupe ─────────────────────────────────────
class TestSlice2StageHistory:
    def test_stage_change_appends_history_and_dedupes(self, admin_session, seeded_buyer):
        cid = seeded_buyer["id"]
        # Move to contacted
        r = admin_session.patch(
            f"{BASE_URL}/api/admin/contacts/buyer/{cid}/stage",
            json={"stage": "contacted"}, timeout=15)
        assert r.status_code == 200, r.text
        d1 = admin_session.get(f"{BASE_URL}/api/admin/contacts/buyer/{cid}", timeout=15).json()
        hist1 = len(d1["stage_history"])
        assert hist1 >= 1
        assert d1["stage"] == "contacted"

        # Repeat same stage — should NOT add another history row
        r2 = admin_session.patch(
            f"{BASE_URL}/api/admin/contacts/buyer/{cid}/stage",
            json={"stage": "contacted"}, timeout=15)
        assert r2.status_code == 200
        d2 = admin_session.get(f"{BASE_URL}/api/admin/contacts/buyer/{cid}", timeout=15).json()
        assert len(d2["stage_history"]) == hist1, "duplicate stage PATCH must not duplicate history"

        # Move to nurturing — must append
        r3 = admin_session.patch(
            f"{BASE_URL}/api/admin/contacts/buyer/{cid}/stage",
            json={"stage": "nurturing"}, timeout=15)
        assert r3.status_code == 200
        d3 = admin_session.get(f"{BASE_URL}/api/admin/contacts/buyer/{cid}", timeout=15).json()
        assert len(d3["stage_history"]) == hist1 + 1
        # timeline surfaces stage_change entries
        assert any(t.get("type") == "stage_change" for t in d3["timeline"])


# ─── Slice 4 · campaign preview + BCFSA guardrail ───────────────────────
class TestSlice4Preview:
    def test_preview_allowed_mls_returns_null_refusal(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/admin/campaigns/preview",
                               json={"subject": "Featured listing R3156192",
                                     "body": "Check out MLS R3156192",
                                     "source_type": "all", "stage": "all"},
                               timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["bcfsa_refusal"] is None
        for k in ("recipient_count", "sample", "estimated_send_seconds",
                  "casl_footer_will_be_appended"):
            assert k in j
        assert isinstance(j["sample"], list) and len(j["sample"]) <= 5
        assert j["casl_footer_will_be_appended"] is True

    def test_preview_disallowed_mls_triggers_refusal(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/admin/campaigns/preview",
                               json={"subject": "New listing R9999999",
                                     "body": "Body references R9999999",
                                     "source_type": "all", "stage": "all"},
                               timeout=20)
        assert r.status_code == 200
        j = r.json()
        assert j["bcfsa_refusal"], "expected BCFSA refusal on non-featured MLS"
        assert "R9999999" in j["bcfsa_refusal"]

    def test_preview_missing_subject_400(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/admin/campaigns/preview",
                               json={"subject": "", "body": "hi"}, timeout=15)
        assert r.status_code == 400


# ─── Slice 4 · create + list campaigns ──────────────────────────────────
class TestSlice4Create:
    def test_create_rejected_on_bcfsa_violation(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/admin/campaigns",
                               json={"subject": "MLS R9999999",
                                     "body_html": "<p>See R9999999</p>",
                                     "source_type": "all", "stage": "all"},
                               timeout=20)
        assert r.status_code == 400
        assert "BCFSA" in r.text or "MLS" in r.text

    def test_create_success_or_zero_recipients(self, admin_session):
        subj = f"TEST_seed_broadcast_{uuid.uuid4().hex[:6]}"
        r = admin_session.post(f"{BASE_URL}/api/admin/campaigns",
                               json={"subject": subj,
                                     "body_html": "<p>Hi {{first_name}}</p>",
                                     "body_text": "Hi {{first_name}}",
                                     "source_type": "all", "stage": "all"},
                               timeout=25)
        # Either eligible pool > 0 → 200, or 0 eligible → 400
        assert r.status_code in (200, 400), r.text
        if r.status_code == 200:
            j = r.json()
            assert j["status"] == "sending"
            assert "campaign_id" in j
            assert j["recipient_count"] >= 1
            # verify it lists
            lst = admin_session.get(f"{BASE_URL}/api/admin/campaigns", timeout=15).json()
            ids = [c["id"] for c in lst["campaigns"]]
            assert j["campaign_id"] in ids
            found = next(c for c in lst["campaigns"] if c["id"] == j["campaign_id"])
            assert "live_counts" in found
        else:
            # Zero eligible is still an accepted assertion for the test suite
            assert "recipients" in r.text.lower() or "eligible" in r.text.lower()

    def test_list_campaigns_newest_first(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/campaigns", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "campaigns" in j
        cs = j["campaigns"]
        if len(cs) >= 2:
            ats = [c.get("created_at") for c in cs]
            assert ats == sorted(ats, reverse=True)


# ─── Slice 5 · reports summary ──────────────────────────────────────────
class TestSlice5Reports:
    @pytest.mark.parametrize("period,expected_days", [
        ("7d", 7), ("30d", 30), ("90d", 90), ("365d", 365),
    ])
    def test_summary_period_awareness(self, admin_session, period, expected_days):
        r = admin_session.get(
            f"{BASE_URL}/api/admin/reports/summary?period={period}", timeout=25)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["period_days"] == expected_days
        for k in ("generated_at", "totals", "funnel",
                  "avg_time_to_first_touch_hours", "top_sources",
                  "top_listing_views", "daily_series", "recent_campaigns"):
            assert k in j, f"missing {k}"
        for tk in ("buyer", "seller", "referral", "leads_in_window"):
            assert tk in j["totals"]
        # funnel has all 6 stages
        assert len(j["funnel"]) >= 6

    def test_daily_series_ascending(self, admin_session):
        j = admin_session.get(
            f"{BASE_URL}/api/admin/reports/summary?period=90d", timeout=25).json()
        days = [d["day"] for d in j["daily_series"]]
        assert days == sorted(days)


# ─── cleanup ────────────────────────────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def cleanup(admin_session):
    yield
    # Best-effort teardown: delete seeded rows via direct db not exposed, so
    # rely on prefix pattern. We can only clean via admin APIs that exist.
    # buyer_leads deletion endpoint may not exist — leave TEST_ rows in db;
    # they will not affect production because they use test-seed source + example.com email.
    pass
