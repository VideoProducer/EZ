"""Tests for Phase 2/4 Journey platform build:
- Referral Network admin CRUD
- Journey progress sync endpoints
- Glossary related terms endpoint
- Sitemap includes editorial
"""
import os, pytest, requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://proptech-hub-111.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "doug@eztofind.ca"
ADMIN_PASS = "EzToFind2026!Admin"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASS, "turnstile_token": ""},
                      timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------------- Referral Network ----------------
class TestReferrals:
    created_id = None

    def test_1_create_referral(self, auth_headers):
        payload = {
            "lead_email": "TEST_lead@example.com",
            "lead_name": "TEST Jane Buyer",
            "lead_city": "Kelowna",
            "estimated_sale_price": 850000,
            "receiving_realtor_name": "TEST Bob Realtor",
        }
        r = requests.post(f"{BASE_URL}/api/admin/referrals", json=payload, headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "sent"
        assert d["lead_email"] == "TEST_lead@example.com"
        assert "id" in d
        assert isinstance(d.get("status_history"), list) and len(d["status_history"]) == 1
        TestReferrals.created_id = d["id"]

    def test_2_list_referrals_summary(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/referrals", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "summary" in d
        assert "by_status" in d["summary"]
        assert any(it["id"] == TestReferrals.created_id for it in d["items"])

    def test_3_list_filter_sent(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/referrals?status=sent", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["status"] == "sent"

    def test_4_patch_acknowledged(self, auth_headers):
        rid = TestReferrals.created_id
        r = requests.patch(f"{BASE_URL}/api/admin/referrals/{rid}",
                           json={"status": "acknowledged", "note": "test ack"},
                           headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "acknowledged"
        assert len(d["status_history"]) == 2

    def test_5_patch_paid_updates_summary(self, auth_headers):
        rid = TestReferrals.created_id
        r = requests.patch(f"{BASE_URL}/api/admin/referrals/{rid}",
                           json={"status": "paid", "referral_fee_amount": 5000, "paid_date": "2026-01-15"},
                           headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "paid"
        assert d.get("referral_fee_amount") == 5000
        # summary should now include this in collected_total_fee
        s = requests.get(f"{BASE_URL}/api/admin/referrals", headers=auth_headers, timeout=20).json()["summary"]
        assert s["collected_total_fee"] >= 5000

    def test_6_patch_invalid_status(self, auth_headers):
        rid = TestReferrals.created_id
        r = requests.patch(f"{BASE_URL}/api/admin/referrals/{rid}",
                           json={"status": "foobar"}, headers=auth_headers, timeout=20)
        assert r.status_code == 400

    def test_7_delete_ok(self, auth_headers):
        rid = TestReferrals.created_id
        r = requests.delete(f"{BASE_URL}/api/admin/referrals/{rid}", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_8_delete_not_found(self, auth_headers):
        r = requests.delete(f"{BASE_URL}/api/admin/referrals/does-not-exist-id", headers=auth_headers, timeout=20)
        assert r.status_code == 404


# ---------------- Journey Progress ----------------
class TestJourneyProgress:
    def test_get_initial(self, auth_headers):
        # first, wipe any prior state via posting empty
        requests.post(f"{BASE_URL}/api/journey/progress", json={"progress": {}}, headers=auth_headers, timeout=20)
        r = requests.get(f"{BASE_URL}/api/journey/progress", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "progress" in d
        assert d["progress"] == {}

    def test_post_and_persist(self, auth_headers):
        body = {"progress": {"buying": {"modules_completed": ["learn__deposit"]}}}
        r = requests.post(f"{BASE_URL}/api/journey/progress", json=body, headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["modules_synced"] == 1

        r2 = requests.get(f"{BASE_URL}/api/journey/progress", headers=auth_headers, timeout=20)
        assert r2.status_code == 200
        p = r2.json()["progress"]
        assert p.get("buying", {}).get("modules_completed") == ["learn__deposit"]

    def test_unauth(self):
        r = requests.get(f"{BASE_URL}/api/journey/progress", timeout=20)
        assert r.status_code == 401


# ---------------- Glossary related terms ----------------
class TestGlossaryRelated:
    def test_deposit_related(self):
        r = requests.get(f"{BASE_URL}/api/glossary/deposit/related", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        # accept either list or dict-with-terms
        terms = d if isinstance(d, list) else d.get("terms") or d.get("related") or d.get("items")
        assert terms is not None and len(terms) >= 4


# ---------------- Sitemap ----------------
class TestSitemap:
    def test_sitemap_contains_editorial(self):
        r = requests.get(f"{BASE_URL}/sitemap.xml", timeout=30)
        assert r.status_code == 200
        assert "<loc>https://eztofind.ca/editorial</loc>" in r.text

    def test_sitemap_count_range(self):
        r = requests.get(f"{BASE_URL}/sitemap.xml", timeout=30)
        count = r.text.count("<loc>")
        # target ~1204, allow reasonable band
        assert 1000 <= count <= 1400, f"Unexpected sitemap url count: {count}"
