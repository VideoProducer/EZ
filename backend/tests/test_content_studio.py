"""Backend tests for Content Studio new endpoints (reel + weekly-pack).
Verifies: (a) 401/403 without admin session, (b) 200 + compliant content with admin cookie.
"""
import os
import re
import pytest
import requests
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except Exception:
    pass

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://proptech-hub-111.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "doug@eztofind.ca")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
TEST_LISTING_KEY = "30106347"

SUPERLATIVES = [
    "best", "stunning", "luxury", "perfect", "ideal", "great",
    "amazing", "charming", "gorgeous", "beautiful", "exquisite", "spectacular",
]


@pytest.fixture(scope="module")
def anon_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
    }, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    # Cookie should now be set
    return s


def _check_compliance(text: str):
    """Returns list of superlative hits found in text."""
    if not text:
        return []
    lower = text.lower()
    hits = [w for w in SUPERLATIVES if re.search(rf"\b{w}\b", lower)]
    return hits


# ---------------- Auth protection ----------------

def test_reel_requires_auth(anon_session):
    r = anon_session.post(
        f"{BASE_URL}/api/admin/content-studio/reel",
        json={"listing_key": TEST_LISTING_KEY}, timeout=15,
    )
    assert r.status_code in (401, 403), f"Expected 401/403 got {r.status_code}: {r.text[:200]}"


def test_weekly_pack_requires_auth(anon_session):
    r = anon_session.post(
        f"{BASE_URL}/api/admin/content-studio/weekly-pack",
        json={"city": "Surrey"}, timeout=15,
    )
    assert r.status_code in (401, 403), f"Expected 401/403 got {r.status_code}: {r.text[:200]}"


# ---------------- Existing captions regression ----------------

def test_captions_generate_as_admin(admin_session):
    r = admin_session.post(
        f"{BASE_URL}/api/admin/content-studio/generate",
        json={"listing_key": TEST_LISTING_KEY}, timeout=90,
    )
    assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
    data = r.json()
    caps = data.get("captions") or data
    for k in ("facebook", "instagram", "x_linkedin", "hashtags"):
        assert k in caps, f"Missing key {k} in captions response"
    assert data.get("disclosure"), "Missing disclosure"
    combined = " ".join([caps.get("facebook",""), caps.get("instagram",""), caps.get("x_linkedin","")])
    hits = _check_compliance(combined)
    assert not hits, f"Superlatives in captions: {hits}"


# ---------------- Reel endpoint ----------------

def test_reel_generate_as_admin(admin_session):
    r = admin_session.post(
        f"{BASE_URL}/api/admin/content-studio/reel",
        json={"listing_key": TEST_LISTING_KEY}, timeout=120,
    )
    assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
    data = r.json()
    reel = data.get("reel") or data
    # Expected shape
    assert "hook" in reel, f"Missing 'hook' - keys={list(reel.keys())}"
    scenes = reel.get("scenes") or reel.get("storyboard") or []
    assert isinstance(scenes, list) and len(scenes) >= 2, f"Need >=2 scenes, got {len(scenes)}"
    for i, sc in enumerate(scenes):
        assert isinstance(sc, dict), f"Scene {i} not dict"
    assert reel.get("caption"), "Missing caption"
    assert reel.get("hashtags"), "Missing hashtags"
    assert data.get("disclosure"), "Missing disclosure"

    # Compliance
    text_blob = " ".join([
        str(reel.get("hook","")),
        str(reel.get("caption","")),
        " ".join(str(v) for sc in scenes for v in sc.values()),
    ])
    hits = _check_compliance(text_blob)
    assert not hits, f"Superlatives in reel content: {hits}"


# ---------------- Weekly pack endpoint ----------------

def test_weekly_pack_generate_as_admin(admin_session):
    r = admin_session.post(
        f"{BASE_URL}/api/admin/content-studio/weekly-pack",
        json={"city": "Surrey", "listing_key": TEST_LISTING_KEY}, timeout=180,
    )
    assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
    data = r.json()
    pack = data.get("pack") or data
    posts = pack.get("posts") or []
    assert isinstance(posts, list) and 3 <= len(posts) <= 6, f"Need 3-4 posts, got {len(posts)}"
    for i, p in enumerate(posts):
        assert p.get("theme") or p.get("title"), f"Post {i} missing theme/title"
        assert p.get("body") or p.get("text"), f"Post {i} missing body"
        assert isinstance(p.get("hashtags") or [], list), f"Post {i} hashtags not list"
    assert data.get("disclosure"), "Missing shared disclosure"

    # Compliance across all post bodies
    blob = " ".join([(p.get("body") or p.get("text") or "") for p in posts])
    hits = _check_compliance(blob)
    assert not hits, f"Superlatives in weekly pack: {hits}"
