"""Backend tests for the Seller Intake hard-block on currently_listed.

Mirrors the Buyer form's working_with_realtor rejection at /api/leads/buyer.
The endpoint must return HTTP 400 when currently_listed=true and HTTP 200
when currently_listed=false, with all other fields valid.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://proptech-hub-111.preview.emergentagent.com").rstrip("/")

VALID_SELLER_PAYLOAD = {
    "full_name": "TEST Seller Hardblock",
    "email": "testseller_hardblock@example.com",
    "phone": "604-555-1234",
    "property_address": "123 Test St",
    "city": "Vancouver",
    "property_type": "Detached",
    "timeline": "ASAP",
    "estimated_value": "Under $750K",
    "reason": "Automated pytest",
    "casl_consent": True,
    "pipa_ack": True,
    "currently_listed": False,
}

VALID_BUYER_PAYLOAD = {
    "full_name": "TEST Buyer Regression",
    "email": "testbuyer_regression@example.com",
    "phone": "604-555-1234",
    "areas": ["Vancouver"],
    "property_type": "Detached",
    "budget_range": "Under $750K",
    "timeline": "0-3 months",
    "financing_status": "Pre-approved",
    "preferred_contact": "email",
    "notes": "Automated pytest",
    "casl_consent": True,
    "pipa_ack": True,
    "first_time_buyer": False,
    "working_with_realtor": False,
}


# ============ Seller hard-block ============
class TestSellerHardBlock:
    def test_seller_not_listed_returns_200(self):
        payload = dict(VALID_SELLER_PAYLOAD, currently_listed=False)
        r = requests.post(f"{BASE_URL}/api/leads/seller", json=payload, timeout=30)
        assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("success") is True
        assert "id" in data
        assert "message" in data

    def test_seller_currently_listed_returns_400(self):
        payload = dict(VALID_SELLER_PAYLOAD, currently_listed=True)
        r = requests.post(f"{BASE_URL}/api/leads/seller", json=payload, timeout=30)
        assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text}"
        body = r.json()
        detail = body.get("detail", "") if isinstance(body, dict) else str(body)
        assert "currently listed with another REALTOR" in detail, (
            f"Error message doesn't mention 'currently listed with another REALTOR': {detail}"
        )

    def test_seller_missing_consent_returns_400(self):
        payload = dict(VALID_SELLER_PAYLOAD, casl_consent=False)
        r = requests.post(f"{BASE_URL}/api/leads/seller", json=payload, timeout=30)
        assert r.status_code == 400


# ============ Buyer regression (already-implemented hard block) ============
class TestBuyerRegression:
    def test_buyer_not_under_contract_returns_200(self):
        r = requests.post(f"{BASE_URL}/api/leads/buyer", json=VALID_BUYER_PAYLOAD, timeout=30)
        assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("success") is True

    def test_buyer_under_contract_returns_400(self):
        payload = dict(VALID_BUYER_PAYLOAD, working_with_realtor=True)
        r = requests.post(f"{BASE_URL}/api/leads/buyer", json=payload, timeout=30)
        assert r.status_code == 400
        body = r.json()
        detail = body.get("detail", "") if isinstance(body, dict) else str(body)
        assert "under contract with another REALTOR" in detail
