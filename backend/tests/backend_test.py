"""EZtoFind.ca backend API test suite."""
import os
import json
import time
import uuid
import pytest
import requests
from datetime import date, timedelta

# Read from frontend .env for the external URL (mirrors what user sees)
def _load_frontend_url():
    env_path = "/app/frontend/.env"
    with open(env_path) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE_URL = _load_frontend_url()
ADMIN_EMAIL = "doug@eztofind.ca"
ADMIN_PASSWORD = "EZtoFind2026!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Health ----------
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert "app" in data


# ---------- Glossary ----------
class TestGlossary:
    def test_glossary_list(self, api):
        r = api.get(f"{BASE_URL}/api/glossary")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 25, f"expected >=25 terms, got {len(data)}"
        # validate item structure
        item = data[0]
        for key in ("term", "slug", "category", "definition"):
            assert key in item, f"missing {key} in glossary item"

    def test_glossary_ptt_generates_faqs(self, api):
        slug = "property-transfer-tax-ptt"
        r = api.get(f"{BASE_URL}/api/glossary/{slug}", timeout=60)
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        data = r.json()
        assert data.get("slug") == slug
        assert data.get("term")
        faqs = data.get("faqs", [])
        assert isinstance(faqs, list)
        assert len(faqs) >= 1, "FAQs should have been generated"
        # Check structure of at least one FAQ
        assert "q" in faqs[0] and "a" in faqs[0]

    def test_glossary_missing_term(self, api):
        r = api.get(f"{BASE_URL}/api/glossary/does-not-exist-xyz")
        assert r.status_code == 404


# ---------- Communities ----------
class TestCommunities:
    def test_communities(self, api):
        r = api.get(f"{BASE_URL}/api/communities")
        assert r.status_code == 200
        data = r.json()
        # Should be dict/list of BC regions
        # Try to be lenient - could be object with region keys or list
        assert data, "communities response empty"
        text = json.dumps(data).lower()
        # verify essential regions present
        for region in ["greater vancouver", "fraser valley", "sea-to-sky"]:
            assert region in text, f"missing region: {region}"


# ---------- Leads ----------
class TestLeads:
    def test_buyer_lead_success(self, api):
        payload = {
            "full_name": "TEST_Buyer One",
            "email": f"test_buyer_{uuid.uuid4().hex[:8]}@example.com",
            "phone": "604-555-0100",
            "areas": ["Vancouver", "Burnaby"],
            "property_type": "Condo",
            "budget_range": "$800K-$1M",
            "timeline": "3-6 months",
            "financing_status": "Pre-approved",
            "first_time_buyer": True,
            "working_with_realtor": False,
            "preferred_contact": "email",
            "notes": "Test lead",
            "casl_consent": True,
            "pipa_ack": True,
        }
        r = api.post(f"{BASE_URL}/api/leads/buyer", json=payload)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data.get("success") is True
        assert data.get("id")

    def test_buyer_lead_without_casl_consent(self, api):
        payload = {
            "full_name": "TEST_Buyer NoConsent",
            "email": f"test_noconsent_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "604-555-0200",
            "areas": ["Vancouver"],
            "property_type": "Detached",
            "budget_range": "$1M-$2M",
            "timeline": "1-3 months",
            "financing_status": "Cash",
            "casl_consent": False,
            "pipa_ack": True,
        }
        r = api.post(f"{BASE_URL}/api/leads/buyer", json=payload)
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text}"

    def test_seller_lead_success(self, api):
        payload = {
            "full_name": "TEST_Seller One",
            "email": f"test_seller_{uuid.uuid4().hex[:8]}@example.com",
            "phone": "604-555-0300",
            "property_address": "123 Test St",
            "city": "Vancouver",
            "property_type": "Detached",
            "timeline": "3-6 months",
            "estimated_value": "$2M",
            "currently_listed": False,
            "reason": "Downsizing",
            "casl_consent": True,
            "pipa_ack": True,
        }
        r = api.post(f"{BASE_URL}/api/leads/seller", json=payload)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data.get("success") is True
        assert data.get("id")


# ---------- Realtor 3-stage application ----------
class TestRealtorApplication:
    _app_id = None

    def test_stage1_apply(self, api):
        payload = {
            "full_name": "TEST_Realtor Jane",
            "email": f"test_realtor_{uuid.uuid4().hex[:8]}@example.com",
        }
        r = api.post(f"{BASE_URL}/api/realtors/apply", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert data.get("id")
        assert "next_form_url" in data
        TestRealtorApplication._app_id = data["id"]

    def test_stage2_credentials(self, api):
        assert TestRealtorApplication._app_id, "Stage1 must succeed first"
        payload = {
            "brokerage": "Test Brokerage Ltd.",
            "realtor_number": "REB12345",
            "is_realtor_confirmed": True,
        }
        r = api.post(f"{BASE_URL}/api/realtors/{TestRealtorApplication._app_id}/credentials", json=payload)
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True
        # verify persisted
        g = api.get(f"{BASE_URL}/api/realtors/{TestRealtorApplication._app_id}")
        assert g.status_code == 200
        assert g.json().get("stage") == "credentials"

    def test_stage3_profile(self, api):
        assert TestRealtorApplication._app_id
        payload = {
            "areas_served": ["Vancouver", "Burnaby"],
            "client_type": "both",
            "years_experience": 5,
            "specialties": ["Condos", "Luxury"],
            "agreement_25pct": True,
        }
        r = api.post(f"{BASE_URL}/api/realtors/{TestRealtorApplication._app_id}/profile", json=payload)
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True
        g = api.get(f"{BASE_URL}/api/realtors/{TestRealtorApplication._app_id}")
        assert g.json().get("stage") == "profile"

    def test_stage3_requires_agreement(self, api):
        # New application, reject when agreement_25pct=False
        r = api.post(f"{BASE_URL}/api/realtors/apply", json={
            "full_name": "TEST_Realtor Bob",
            "email": f"test_realtor_bob_{uuid.uuid4().hex[:6]}@example.com",
        })
        app_id = r.json()["id"]
        api.post(f"{BASE_URL}/api/realtors/{app_id}/credentials", json={
            "brokerage": "B", "realtor_number": "X", "is_realtor_confirmed": True
        })
        r2 = api.post(f"{BASE_URL}/api/realtors/{app_id}/profile", json={
            "areas_served": ["Vancouver"], "client_type": "buyers",
            "years_experience": 2, "specialties": [], "agreement_25pct": False
        })
        assert r2.status_code == 400


# ---------- Admin ----------
class TestAdmin:
    def test_admin_login_success(self, admin_token):
        assert admin_token and len(admin_token) > 20

    def test_admin_login_wrong_password(self, api):
        r = api.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_admin_leads_buyer_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/admin/leads/buyer")
        assert r.status_code == 401

    def test_admin_list_buyer_leads(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/admin/leads/buyer", headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)

    def test_admin_reminders_returns_list(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/admin/reminders", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_client_and_reminders(self, api, admin_headers):
        # Create a client with birthday in ~5 days
        today = date.today()
        upcoming = today + timedelta(days=5)
        # Use same month/day but historical year for birthdate
        birthdate_str = f"1985-{upcoming.month:02d}-{upcoming.day:02d}"
        anniv_str = f"2015-{upcoming.month:02d}-{upcoming.day:02d}"
        possession_str = f"2020-{upcoming.month:02d}-{upcoming.day:02d}"
        client_payload = {
            "full_name": "TEST_Client Reminder",
            "email": "test_reminder_client@example.com",
            "phone": "604-555-9999",
            "client_type": "past",
            "birthdate": birthdate_str,
            "anniversary": anniv_str,
            "possession_date": possession_str,
            "spouse_name": "",
            "notes": "test",
            "tags": ["TEST"],
            "pipeline_stage": "past",
        }
        r = api.post(f"{BASE_URL}/api/admin/clients", json=client_payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created.get("id")

        # Now get reminders and check ours is present
        r2 = api.get(f"{BASE_URL}/api/admin/reminders", headers=admin_headers)
        assert r2.status_code == 200
        reminders = r2.json()
        mine = [x for x in reminders if x.get("client_id") == created["id"]]
        assert len(mine) >= 1, f"expected reminder for created client, got {reminders}"
        # verify structure
        r0 = mine[0]
        assert "type" in r0 and "days_until" in r0 and "date" in r0
        assert r0["days_until"] <= 30


# ---------- Doogie Chat (SSE) ----------
class TestDoogieChat:
    def test_doogie_streaming(self, api):
        session_id = f"test-{uuid.uuid4().hex[:8]}"
        payload = {"session_id": session_id, "message": "What is strata in BC?"}
        r = requests.post(
            f"{BASE_URL}/api/doogie/chat",
            json=payload,
            stream=True,
            timeout=60,
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 200, r.text
        assert "text/event-stream" in r.headers.get("Content-Type", ""), r.headers
        deltas = 0
        done = False
        err = None
        start = time.time()
        for raw_line in r.iter_lines(decode_unicode=True):
            if raw_line is None:
                continue
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("data:"):
                payload_json = line[5:].strip()
                try:
                    obj = json.loads(payload_json)
                except Exception:
                    continue
                if "delta" in obj:
                    deltas += 1
                if obj.get("error"):
                    err = obj["error"]
                if obj.get("done"):
                    done = True
                    break
            if time.time() - start > 55:
                break
        r.close()
        assert not err, f"stream error: {err}"
        assert deltas > 0, "no delta tokens received"
        assert done, "no done event received"
