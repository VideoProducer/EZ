"""Backend tests for the Jan 2026 round: Sunday-night digest cron,
Alert Analytics admin endpoint, and that saved-search submissions coming
from the /listings modal persist with digest_frequency='sunday_night'
and filters.bbox."""
import os
import time
import pytest
import requests

def _load_base_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if not v:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        v = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    if not v:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return v.rstrip("/")

BASE_URL = _load_base_url()
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "doug@eztofind.ca")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "Doug2026Login!")


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    body = r.json()
    tok = body.get("token") or body.get("access_token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


# --- cron/sunday-night-digest auth gate ---------------------------------
class TestSundayDigestCron:
    def test_cron_requires_bearer(self):
        r = requests.post(f"{BASE_URL}/api/cron/sunday-night-digest", timeout=20)
        assert r.status_code == 401

    def test_cron_rejects_bad_bearer(self):
        r = requests.post(f"{BASE_URL}/api/cron/sunday-night-digest",
                          headers={"Authorization": "Bearer wrong-secret-x"}, timeout=20)
        assert r.status_code == 401


# --- alert analytics ----------------------------------------------------
class TestSavedSearchAnalytics:
    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/saved-searches/analytics", timeout=20)
        assert r.status_code in (401, 403)

    def test_default_window_90(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/saved-searches/analytics", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("window_days", "total", "pending", "verified", "active",
                  "unsubscribed", "new_in_window", "sunday_optins",
                  "digests_sent", "confirmation_rate", "by_area", "recent"):
            assert k in data, f"missing field {k}"
        assert data["window_days"] == 90
        assert isinstance(data["by_area"], list)
        assert isinstance(data["recent"], list)
        assert isinstance(data["total"], int)

    def test_window_365(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/saved-searches/analytics?days=365", timeout=30)
        assert r.status_code == 200
        assert r.json()["window_days"] == 365


# --- saved-search create with sunday_night + bbox ------------------------
class TestSavedSearchSundayBrief:
    def test_create_and_persist_sunday_night_with_bbox(self, admin_session):
        ts = int(time.time())
        email = f"qa+sunday_{ts}@example.com"
        payload = {
            "email": email,
            "label": "TEST Sunday brief Kelowna box",
            "filters": {
                "city": "Kelowna",
                "bbox": {"minLat": 49.80, "minLon": -119.60,
                         "maxLat": 49.95, "maxLon": -119.40},
            },
            "frequency": "sunday_night",
            "casl_consent": True,
            "pipa_ack": True,
        }
        r = requests.post(f"{BASE_URL}/api/saved-searches", json=payload, timeout=25)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
        body = r.json()
        assert body.get("status") in ("pending", "ok", "created", "verified") or body.get("ok") is True

        # Verify through admin listing
        r2 = admin_session.get(f"{BASE_URL}/api/admin/saved-searches", timeout=30)
        assert r2.status_code == 200, r2.text
        payload2 = r2.json()
        items = payload2.get("records") if isinstance(payload2, dict) else payload2
        # find our record
        hit = None
        for it in items:
            if (it.get("email") or "").lower() == email.lower():
                hit = it
                break
        assert hit is not None, f"saved search for {email} not found in admin listing"
        assert hit.get("digest_frequency") == "sunday_night", \
            f"digest_frequency should be 'sunday_night', got {hit.get('digest_frequency')}"
        fbbox = (hit.get("filters") or {}).get("bbox")
        assert fbbox, "filters.bbox should persist on saved search"
        assert abs(fbbox.get("minLat", 0) - 49.80) < 0.01
