"""Backend tests for buyer/seller deal checklist persistence on
PUT /api/admin/leads/{kind}/{lead_id}/followup.

Verifies that the new boolean keys (needs_confirmed, showings_booked,
offer_written, offer_accepted, listing_appt, cma_presented,
agreement_signed, live_on_mls, offer_received, subjects_removed,
completion) are accepted by the model and merged into the lead's
followup object.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://proptech-hub-111.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "doug@eztofind.ca"
ADMIN_PW = "Doug2026Login!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text[:200]}")
    return s


@pytest.fixture(scope="module")
def triage(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/lead-triage", params={"status": "all"}, timeout=30)
    assert r.status_code == 200, r.text[:300]
    return r.json()


def _first_of_kind(triage, kind):
    for tier in ("hot", "warm", "cold", "unscored"):
        for lead in triage.get("tiers", {}).get(tier, []):
            if lead.get("_kind") == kind:
                return lead
    return None


def test_triage_returns_tiers(triage):
    assert "tiers" in triage
    assert set(["hot", "warm", "cold", "unscored"]).issubset(triage["tiers"].keys())


def test_buyer_checklist_keys_persist(admin_session, triage):
    buyer = _first_of_kind(triage, "buyer")
    if not buyer:
        pytest.skip("no buyer leads to test against")
    lead_id = buyer["id"]
    buyer_keys = {
        "needs_confirmed": True,
        "showings_booked": True,
        "offer_written": True,
        "offer_accepted": False,
        "subjects_removed": True,
        "completion": False,
    }
    r = admin_session.put(f"{BASE_URL}/api/admin/leads/buyer/{lead_id}/followup", json=buyer_keys, timeout=20)
    assert r.status_code == 200, r.text[:300]
    fu = r.json()["followup"]
    for k, v in buyer_keys.items():
        assert fu.get(k) == v, f"key {k} expected {v} got {fu.get(k)}"

    # verify persistence via GET
    g = admin_session.get(f"{BASE_URL}/api/admin/lead-triage", params={"status": "all"}, timeout=30)
    assert g.status_code == 200
    found = None
    for tier in ("hot", "warm", "cold", "unscored"):
        for lead in g.json()["tiers"][tier]:
            if lead["id"] == lead_id and lead["_kind"] == "buyer":
                found = lead
                break
    assert found is not None, "lead missing after update"
    for k, v in buyer_keys.items():
        assert found["followup"].get(k) == v


def test_seller_checklist_keys_persist(admin_session, triage):
    seller = _first_of_kind(triage, "seller")
    if not seller:
        pytest.skip("no seller leads to test against")
    lead_id = seller["id"]
    seller_keys = {
        "listing_appt": True,
        "cma_presented": True,
        "agreement_signed": False,
        "live_on_mls": True,
        "offer_received": False,
        "subjects_removed": True,
        "completion": False,
    }
    r = admin_session.put(f"{BASE_URL}/api/admin/leads/seller/{lead_id}/followup", json=seller_keys, timeout=20)
    assert r.status_code == 200, r.text[:300]
    fu = r.json()["followup"]
    for k, v in seller_keys.items():
        assert fu.get(k) == v


def test_status_and_notes_regression(admin_session, triage):
    lead = _first_of_kind(triage, "buyer") or _first_of_kind(triage, "seller")
    if not lead:
        pytest.skip("no leads")
    kind = lead["_kind"]
    r = admin_session.put(
        f"{BASE_URL}/api/admin/leads/{kind}/{lead['id']}/followup",
        json={"status": "nurture", "notes": "TEST_regression notes"},
        timeout=20,
    )
    assert r.status_code == 200, r.text[:300]
    fu = r.json()["followup"]
    assert fu["status"] == "nurture"
    assert fu["notes"] == "TEST_regression notes"


def test_invalid_status_rejected(admin_session, triage):
    lead = _first_of_kind(triage, "buyer") or _first_of_kind(triage, "seller")
    if not lead:
        pytest.skip("no leads")
    kind = lead["_kind"]
    r = admin_session.put(
        f"{BASE_URL}/api/admin/leads/{kind}/{lead['id']}/followup",
        json={"status": "bogus"},
        timeout=20,
    )
    assert r.status_code == 400


def test_unauth_rejected():
    r = requests.put(
        f"{BASE_URL}/api/admin/leads/buyer/nonexistent/followup",
        json={"contacted": True},
        timeout=20,
    )
    assert r.status_code in (401, 403)
