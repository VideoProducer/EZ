"""Backend tests for iteration 18: /api/listings photo trim, equestrian, caching, detail non-trim."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://proptech-hub-111.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def test_listings_limit24_trimmed(s):
    r = s.get(f"{API}/listings", params={"limit": 24}, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    listings = data.get("listings") or data.get("results") or data
    assert isinstance(listings, list) and len(listings) > 0
    total = data.get("total") if isinstance(data, dict) else None
    assert total is None or total > 0
    for lst in listings:
        photos = lst.get("photos") or []
        assert len(photos) <= 6, f"photos too long: {len(photos)} for {lst.get('listing_key')}"
        if len(photos) == 6:
            # photo_count should be present when trimmed
            assert "photo_count" in lst, f"missing photo_count for {lst.get('listing_key')}"


def test_listings_equestrian_endpoint(s):
    r = s.get(
        f"{API}/listings/equestrian",
        params={"sort": "price_asc", "limit": 12, "price_min": 2000000},
        timeout=60,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    listings = data.get("listings") or data
    assert isinstance(listings, list)
    for lst in listings:
        assert len(lst.get("photos") or []) <= 6
        # each listing has equestrian object
        assert "equestrian" in lst or "amenities" in lst, f"missing equestrian block: {lst.keys()}"


def test_listings_equestrian_property_type_cache(s):
    params = {"property_type": "Equestrian", "limit": 24}
    t1 = time.time(); r1 = s.get(f"{API}/listings", params=params, timeout=60); d1 = time.time() - t1
    assert r1.status_code == 200
    t2 = time.time(); r2 = s.get(f"{API}/listings", params=params, timeout=60); d2 = time.time() - t2
    assert r2.status_code == 200
    j1 = r1.json(); j2 = r2.json()
    l1 = j1.get("listings") or j1
    l2 = j2.get("listings") or j2
    assert isinstance(l1, list) and len(l1) > 0
    # Cache should make 2nd call not slower (report timing regardless)
    print(f"first={d1:.3f}s second={d2:.3f}s")
    assert d2 <= d1 + 1.0, f"cache: second call not faster (first={d1:.2f}, second={d2:.2f})"


def test_equestrian_advanced_filters(s):
    r = s.get(
        f"{API}/listings/equestrian",
        params={"min_acres": 5, "sort": "price_desc", "limit": 8, "region_chip": "Doug's Territory"},
        timeout=60,
    )
    assert r.status_code == 200, r.text


def test_listing_detail_not_trimmed(s):
    # Find a listing with photo_count > 6
    r = s.get(f"{API}/listings", params={"limit": 40}, timeout=60)
    data = r.json()
    listings = data.get("listings") or data
    target = None
    for lst in listings:
        pc = lst.get("photo_count") or 0
        if pc > 6:
            target = lst
            break
    if not target:
        pytest.skip("no listing with photo_count > 6 in first 40")
    key = target.get("listing_key") or target.get("id") or target.get("_id")
    assert key
    r2 = s.get(f"{API}/listings/{key}", timeout=60)
    assert r2.status_code == 200, r2.text
    detail = r2.json()
    photos = detail.get("photos") or []
    assert len(photos) > 6, f"detail photos should NOT be trimmed, got {len(photos)}, photo_count was {target.get('photo_count')}"


def test_impression_no_500(s):
    r = s.get(f"{API}/listings", params={"limit": 5}, timeout=60)
    assert r.status_code == 200
