"""Backend tests: CASL/PIPA-compliant saved-search email alerts."""
import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://proptech-hub-111.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
ADMIN_EMAIL = "doug@eztofind.ca"
ADMIN_PASSWORD = "EZtoFind2026!"

TEST_EMAIL_PREFIX = "test_savedsearch_"


@pytest.fixture(scope="module")
def mongo_db():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    # Cleanup TEST_ data
    db.saved_searches.delete_many({"email": {"$regex": f"^{TEST_EMAIL_PREFIX}"}})
    db.email_outbox.delete_many({"to": {"$regex": f"^{TEST_EMAIL_PREFIX}"}})
    client.close()


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json().get("token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- 1. Validation ---

def test_missing_casl_returns_400():
    r = requests.post(f"{BASE_URL}/api/saved-searches", json={
        "email": f"{TEST_EMAIL_PREFIX}a@example.com",
        "filters": {"city": "Whistler"},
        "casl_consent": False, "pipa_ack": True,
    }, timeout=15)
    assert r.status_code == 400, r.text
    assert "consent" in r.text.lower() or "acknowledgement" in r.text.lower()


def test_missing_pipa_returns_400():
    r = requests.post(f"{BASE_URL}/api/saved-searches", json={
        "email": f"{TEST_EMAIL_PREFIX}b@example.com",
        "filters": {"city": "Whistler"},
        "casl_consent": True, "pipa_ack": False,
    }, timeout=15)
    assert r.status_code == 400


# --- 2. Happy path create ---

def test_create_saved_search_success(mongo_db):
    email = f"{TEST_EMAIL_PREFIX}whistler@example.com"
    r = requests.post(f"{BASE_URL}/api/saved-searches", json={
        "email": email,
        "filters": {"city": "Whistler"},
        "label": "Whistler homes",
        "casl_consent": True, "pipa_ack": True,
    }, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["success"] is True
    assert data["status"] == "pending"
    assert data["email_dispatch"] == "queued_pending_resend"
    ss_id = data["id"]

    # Verify DB record
    doc = mongo_db.saved_searches.find_one({"id": ss_id})
    assert doc is not None
    assert doc["status"] == "pending"
    assert doc["email"] == email
    assert doc["verification_token"]
    assert doc["unsubscribe_token"]
    assert doc["consent_ip"]
    assert doc["consent_ua"]
    assert doc["consent_at"]
    assert doc["policy_version"] == "2026-02-25"

    # Verify email_outbox transactional record
    outbox = mongo_db.email_outbox.find_one({"to": email, "kind": "transactional"})
    assert outbox is not None
    assert outbox["status"] == "pending"
    assert "verify?token=" in outbox["html"]

    pytest.saved_ss_id = ss_id
    pytest.saved_ss_email = email
    pytest.saved_ss_verify_tok = doc["verification_token"]
    pytest.saved_ss_unsub_tok = doc["unsubscribe_token"]


# --- 3. Excluded property types silently dropped ---

def test_excluded_property_type_dropped(mongo_db):
    email = f"{TEST_EMAIL_PREFIX}office@example.com"
    r = requests.post(f"{BASE_URL}/api/saved-searches", json={
        "email": email,
        "filters": {"city": "Vancouver", "property_type": "Office"},
        "casl_consent": True, "pipa_ack": True,
    }, timeout=15)
    assert r.status_code == 200
    doc = mongo_db.saved_searches.find_one({"id": r.json()["id"]})
    assert "property_type" not in (doc.get("filters") or {})


# --- 4. Verify link ---

def test_verify_valid_token(mongo_db):
    tok = pytest.saved_ss_verify_tok
    r = requests.get(f"{BASE_URL}/api/saved-searches/verify?token={tok}", timeout=15)
    assert r.status_code == 200
    assert "all set" in r.text.lower() or "you're all set" in r.text.lower()
    doc = mongo_db.saved_searches.find_one({"id": pytest.saved_ss_id})
    assert doc["status"] == "verified"
    assert doc["verified_at"]
    assert doc["verify_ip"]
    assert doc["verify_ua"]


def test_verify_idempotent():
    tok = pytest.saved_ss_verify_tok
    r = requests.get(f"{BASE_URL}/api/saved-searches/verify?token={tok}", timeout=15)
    assert r.status_code == 200
    assert "already" in r.text.lower()


def test_verify_invalid_token():
    r = requests.get(f"{BASE_URL}/api/saved-searches/verify?token=notarealtoken123", timeout=15)
    assert r.status_code == 200
    assert "invalid" in r.text.lower() or "not" in r.text.lower()


# --- 5. Matcher — send digest ---

def test_run_matcher_sends_digest(mongo_db, admin_headers):
    # Backdate verified_at so matcher considers all listings "new"
    mongo_db.saved_searches.update_one(
        {"id": pytest.saved_ss_id},
        {"$set": {"verified_at": "2020-01-01T00:00:00+00:00", "last_notified_at": None}},
    )
    # Count commercial emails before
    before = mongo_db.email_outbox.count_documents({"to": pytest.saved_ss_email, "kind": "commercial"})

    r = requests.post(f"{BASE_URL}/api/admin/saved-searches/run-matcher",
                      headers=admin_headers, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["searches_checked"] >= 1
    # digests_sent may be 0 if listings' synced_at is None; but for whistler with 48k listings should be >=1
    after = mongo_db.email_outbox.count_documents({"to": pytest.saved_ss_email, "kind": "commercial"})
    assert after >= before + 1, f"Expected at least 1 new commercial email, before={before} after={after}, matcher={data}"

    # Inspect the new commercial email body
    latest = list(mongo_db.email_outbox.find({"to": pytest.saved_ss_email, "kind": "commercial"}).sort("created_at", -1).limit(1))
    assert latest, "no commercial email"
    msg = latest[0]
    assert "new bc listing" in msg["subject"].lower()
    html = msg.get("html", "")
    # CASL footer sender identification
    assert "Doug LeMaire" in html
    assert "Fraser Property" in html
    assert "info@eztofind.ca" in html
    assert "Unsubscribe with one click" in html
    assert pytest.saved_ss_unsub_tok in html


# --- 6. Unsubscribe ---

def test_unsubscribe_get(mongo_db):
    tok = pytest.saved_ss_unsub_tok
    r = requests.get(f"{BASE_URL}/api/saved-searches/unsubscribe?token={tok}", timeout=15)
    assert r.status_code == 200
    assert "unsubscribed" in r.text.lower()
    doc = mongo_db.saved_searches.find_one({"id": pytest.saved_ss_id})
    assert doc["status"] == "unsubscribed"
    assert doc["unsubscribed_at"]
    assert doc.get("unsubscribed_ip")


def test_unsubscribe_post_rfc8058(mongo_db):
    # Create a new subscription to test POST unsubscribe independently
    email = f"{TEST_EMAIL_PREFIX}post_unsub@example.com"
    r = requests.post(f"{BASE_URL}/api/saved-searches", json={
        "email": email, "filters": {"city": "Whistler"},
        "casl_consent": True, "pipa_ack": True,
    }, timeout=15)
    ss_id = r.json()["id"]
    doc = mongo_db.saved_searches.find_one({"id": ss_id})
    tok = doc["unsubscribe_token"]
    r = requests.post(f"{BASE_URL}/api/saved-searches/unsubscribe?token={tok}", timeout=15)
    assert r.status_code == 200
    doc2 = mongo_db.saved_searches.find_one({"id": ss_id})
    assert doc2["status"] == "unsubscribed"


def test_matcher_excludes_unsubscribed(admin_headers, mongo_db):
    # After unsubscribing our main record, matcher should skip it
    # We can't guarantee searches_checked == 0 globally (other verified records may exist),
    # but our unsubscribed record shouldn't be checked. Ensure no new email for it.
    before = mongo_db.email_outbox.count_documents({"to": pytest.saved_ss_email, "kind": "commercial"})
    r = requests.post(f"{BASE_URL}/api/admin/saved-searches/run-matcher",
                      headers=admin_headers, timeout=60)
    assert r.status_code == 200
    after = mongo_db.email_outbox.count_documents({"to": pytest.saved_ss_email, "kind": "commercial"})
    assert after == before, "Unsubscribed record should not receive further digests"


# --- 7. Admin views ---

def test_admin_saved_searches_list(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/saved-searches", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "counts" in data
    assert "records" in data
    assert set(["pending", "verified", "unsubscribed"]).issubset(data["counts"].keys())


def test_admin_email_outbox(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/email-outbox", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "pending_count" in data
    assert "recent" in data
    assert isinstance(data["recent"], list)


# --- 8. No crash under rapid POST ---

def test_rapid_posts_no_500():
    codes = []
    for i in range(10):
        r = requests.post(f"{BASE_URL}/api/saved-searches", json={
            "email": f"{TEST_EMAIL_PREFIX}burst{i}@example.com",
            "filters": {"city": "Whistler"},
            "casl_consent": True, "pipa_ack": True,
        }, timeout=15)
        codes.append(r.status_code)
    assert all(c < 500 for c in codes), f"Got 5xx: {codes}"
