"""Regression tests for Homes-for-sale hubs + Saved-search preview endpoint (iteration 39)."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://proptech-hub-111.preview.emergentagent.com").rstrip("/")


# ---- Saved-search preview endpoint ----
class TestSavedSearchPreview:
    def test_preview_surrey_basic(self):
        r = requests.post(f"{BASE_URL}/api/saved-searches/preview",
                          json={"filters": {"city": "Surrey"}}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d.get("active_count"), int) and d["active_count"] > 0
        assert isinstance(d.get("new_this_week"), int)
        assert isinstance(d.get("sample"), list) and len(d["sample"]) > 0
        s0 = d["sample"][0]
        for k in ("address", "list_price", "beds", "city", "just_listed"):
            assert k in s0, f"missing key {k} in sample item"
        assert isinstance(s0["just_listed"], bool)
        assert isinstance(d.get("email_html"), str) and len(d["email_html"]) > 50
        assert "New BC listings match your saved search" in d["email_html"]

    def test_preview_langley_townhouse_suite(self):
        r = requests.post(f"{BASE_URL}/api/saved-searches/preview",
                          json={"filters": {"city": "Langley",
                                            "property_type": "Townhouse",
                                            "features": ["suite"]}}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        # Expected ~104 per task spec; allow tolerance for live feed drift
        assert 70 <= d["active_count"] <= 150, f"active_count out of expected range: {d['active_count']}"
        assert isinstance(d.get("new_this_week"), int)
        assert len(d["sample"]) > 0
        assert all("just_listed" in s for s in d["sample"])


# ---- Static hub pages served by backend prerender (if any) / sitemap ----
class TestHubRoutes:
    def test_homepage_loads(self):
        r = requests.get(f"{BASE_URL}/", timeout=30)
        assert r.status_code == 200

    def test_api_root(self):
        # Smoke: at least the saved-search preview endpoint responds
        r = requests.post(f"{BASE_URL}/api/saved-searches/preview",
                          json={"filters": {}}, timeout=30)
        assert r.status_code == 200
