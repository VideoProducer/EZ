"""Tests for (A) multilingual lead intake + background translation
and (B) CREA DDF diagnostic endpoints.

Backend-only. Uses the external REACT_APP_BACKEND_URL from /app/frontend/.env.
"""
import os
import time
import uuid
import pytest
import requests


def _load_frontend_url():
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE_URL = _load_frontend_url()
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "doug@eztofind.ca")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_PASSWORD env var required for tests")

# Background translation is fire-and-forget via asyncio.create_task; wait a bit.
TRANSLATE_WAIT_SECONDS = 15


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_headers(api):
    r = api.post(f"{BASE_URL}/api/admin/login",
                 json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json()["token"]
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _find_lead(api, path, headers, lead_id):
    r = api.get(f"{BASE_URL}{path}", headers=headers)
    assert r.status_code == 200, r.text
    for lead in r.json():
        if lead.get("id") == lead_id:
            return lead
    return None


# ---------- Multilingual buyer/seller intake + async translation ----------
class TestMultilingualLeads:
    def _buyer_payload(self, lang, notes):
        return {
            "full_name": f"TEST_ML Buyer {lang}",
            "email": f"test_ml_buyer_{lang}_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "604-555-0400",
            "areas": ["Vancouver"],
            "property_type": "Condo",
            "budget_range": "$800K-$1M",
            "timeline": "3-6 months",
            "financing_status": "Pre-approved",
            "first_time_buyer": True,
            "working_with_realtor": False,
            "preferred_contact": "email",
            "notes": notes,
            "form_lang": lang,
            "casl_consent": True,
            "pipa_ack": True,
        }

    def test_buyer_pt_translates(self, api, admin_headers):
        payload = self._buyer_payload(
            "pt-PT",
            "Estou à procura de um apartamento de dois quartos em Vancouver com vista para o mar. "
            "Orçamento até um milhão de dólares canadianos.",
        )
        r = api.post(f"{BASE_URL}/api/leads/buyer", json=payload)
        assert r.status_code == 200, r.text
        lead_id = r.json()["id"]
        time.sleep(TRANSLATE_WAIT_SECONDS)
        lead = _find_lead(api, "/api/admin/leads/buyer", admin_headers, lead_id)
        assert lead is not None, "lead not visible via admin"
        assert lead.get("form_lang") == "pt-PT"
        notes_en = (lead.get("notes_en") or "").strip()
        assert notes_en, f"notes_en was not populated: {lead!r}"
        # Rough content check — English translation must mention key concepts.
        lower = notes_en.lower()
        assert any(k in lower for k in ("apartment", "two-bedroom", "two bedroom", "condo")), notes_en
        assert "vancouver" in lower

    def test_buyer_zh_hans_translates(self, api, admin_headers):
        payload = self._buyer_payload(
            "zh-Hans",
            "我想在温哥华买一套两居室公寓，预算大约九十万加元，希望靠近天车站。",
        )
        r = api.post(f"{BASE_URL}/api/leads/buyer", json=payload)
        assert r.status_code == 200, r.text
        lead_id = r.json()["id"]
        time.sleep(TRANSLATE_WAIT_SECONDS)
        lead = _find_lead(api, "/api/admin/leads/buyer", admin_headers, lead_id)
        assert lead is not None
        assert lead.get("form_lang") == "zh-Hans"
        notes_en = (lead.get("notes_en") or "").strip()
        assert notes_en, f"notes_en not populated: {lead!r}"
        assert "vancouver" in notes_en.lower()

    def test_seller_fa_translates(self, api, admin_headers):
        payload = {
            "full_name": "TEST_ML Seller fa",
            "email": f"test_ml_seller_fa_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "604-555-0500",
            "property_address": "456 Test Ave",
            "city": "Burnaby",
            "property_type": "Detached",
            "timeline": "3-6 months",
            "estimated_value": "$2M",
            "currently_listed": False,
            "reason": "می‌خواهم خانه‌ام را بفروشم چون به تورنتو نقل مکان می‌کنم و به پول نقد نیاز دارم.",
            "form_lang": "fa",
            "casl_consent": True,
            "pipa_ack": True,
        }
        r = api.post(f"{BASE_URL}/api/leads/seller", json=payload)
        assert r.status_code == 200, r.text
        lead_id = r.json()["id"]
        time.sleep(TRANSLATE_WAIT_SECONDS)
        lead = _find_lead(api, "/api/admin/leads/seller", admin_headers, lead_id)
        assert lead is not None
        assert lead.get("form_lang") == "fa"
        reason_en = (lead.get("reason_en") or "").strip()
        assert reason_en, f"reason_en not populated: {lead!r}"
        assert "toronto" in reason_en.lower()

    def test_buyer_en_no_translation(self, api, admin_headers):
        payload = self._buyer_payload(
            "en",
            "Looking for a two-bed condo in Vancouver, budget under $1M.",
        )
        r = api.post(f"{BASE_URL}/api/leads/buyer", json=payload)
        assert r.status_code == 200, r.text
        lead_id = r.json()["id"]
        # Give the (would-be) background task a chance to run — it should not.
        time.sleep(3)
        lead = _find_lead(api, "/api/admin/leads/buyer", admin_headers, lead_id)
        assert lead is not None
        assert lead.get("form_lang") == "en"
        # notes_en should remain empty/absent when form_lang == "en"
        assert not (lead.get("notes_en") or "").strip(), f"notes_en should be empty for EN: {lead.get('notes_en')!r}"

    def test_buyer_no_form_lang_defaults_en(self, api, admin_headers):
        payload = self._buyer_payload("en", "Default lang backwards compat.")
        payload.pop("form_lang", None)
        r = api.post(f"{BASE_URL}/api/leads/buyer", json=payload)
        assert r.status_code == 200, r.text
        lead_id = r.json()["id"]
        time.sleep(2)
        lead = _find_lead(api, "/api/admin/leads/buyer", admin_headers, lead_id)
        assert lead is not None
        assert lead.get("form_lang") in ("en", None), f"expected 'en', got {lead.get('form_lang')!r}"
        assert not (lead.get("notes_en") or "").strip()


# ---------- CREA DDF diagnostic ----------
class TestDDFDiagnostic:
    def test_ddf_status_structure(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/admin/listings/ddf-status", headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("credentials_configured", "token_url", "endpoint",
                    "province_filter", "token_ok", "api_ok", "error", "sample_count"):
            assert key in data, f"missing key {key} in {data!r}"
        # In current env: creds set but wrong → token_ok=False, error contains invalid_client
        assert data["credentials_configured"] is True, data
        assert data["token_ok"] is False, data
        assert data["api_ok"] is False, data
        err = (data.get("error") or "").lower()
        assert "invalid_client" in err or "invalid client" in err, f"unexpected error: {data.get('error')!r}"

    def test_ddf_status_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/admin/listings/ddf-status")
        assert r.status_code == 401

    def test_ddf_sync_now_does_not_500(self, api, admin_headers):
        r = api.post(f"{BASE_URL}/api/admin/listings/sync-now", headers=admin_headers)
        assert r.status_code == 200, f"sync-now returned {r.status_code}: {r.text[:400]}"
        data = r.json()
        # Response shape from sync_incremental: pulled/upserted/removed/errors keys
        assert isinstance(data, dict), data
        assert "errors" in data, data
        errs = data.get("errors") or []
        assert isinstance(errs, list) and len(errs) >= 1, f"expected auth/token errors, got: {data}"
        joined = " ".join(str(e).lower() for e in errs)
        assert any(k in joined for k in ("invalid_client", "token", "auth", "ddf_credentials_missing", "unauthorized", "401")), (
            f"expected token/auth-related error, got: {errs}"
        )
