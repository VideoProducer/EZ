"""Regression tests for strata / Form B / Depreciation Report content leaking
into detached / acreage / equestrian searches on POST /api/doogie/sync-search.

Iteration 14 - Doug LeMaire request:
- strata content NEVER leaks into detached, acreage, equestrian searches
- unless the user's own query explicitly mentions strata (or related term)
- for condo/apartment property_type, strata content SHOULD appear
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://proptech-hub-111.preview.emergentagent.com").rstrip("/")
ENDPOINT = f"{BASE_URL}/api/doogie/sync-search"

BANNED_TERMS = ["strata", "form b", "depreciation report"]


def _contains_banned(text: str) -> list:
    if not text:
        return []
    lower = text.lower()
    return [t for t in BANNED_TERMS if t in lower]


def _all_section_text(payload: dict) -> str:
    parts = []
    for s in payload.get("sections", []) or []:
        parts.append(str(s.get("title", "")))
        parts.append(str(s.get("blurb", "")))
        parts.append(str(s.get("body", "")))
        # Items may nested content
        for item in (s.get("items") or []):
            if isinstance(item, dict):
                for v in item.values():
                    parts.append(str(v))
            else:
                parts.append(str(item))
    return "\n".join(parts)


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _post(api, body):
    r = api.post(ENDPOINT, json=body, timeout=30)
    assert r.status_code == 200, f"Non-200 {r.status_code}: {r.text[:400]}"
    return r.json()


# 1. Detached house Kelowna — strata must NOT appear
def test_detached_house_kelowna_no_strata(api):
    body = {
        "query": "detached house Kelowna",
        "filter": {"community": "Kelowna", "property_type": "House"},
        "limit": 6,
    }
    data = _post(api, body)
    hits = _contains_banned(_all_section_text(data))
    assert not hits, f"Banned terms leaked into detached search: {hits}"


# 2. Acreage in Langley — strata must NOT appear
def test_acreage_langley_no_strata(api):
    body = {
        "query": "acreage in Langley",
        "filter": {"community": "Langley", "property_type": "Acreage"},
        "limit": 6,
    }
    data = _post(api, body)
    hits = _contains_banned(_all_section_text(data))
    assert not hits, f"Banned terms leaked into acreage search: {hits}"


# 3. Condo in Vancouver — strata SHOULD appear (apartment/condo needs strata info)
def test_condo_vancouver_strata_present(api):
    body = {
        "query": "condo in Vancouver",
        "filter": {"community": "Vancouver", "property_type": "Apartment"},
        "limit": 6,
    }
    data = _post(api, body)
    text = _all_section_text(data).lower()
    assert "strata" in text, "Expected strata content for condo/apartment search, but none found"


# 4. Explicit user query "strata rules for detached house" — strata SHOULD appear
#    (user mentioned strata explicitly)
def test_explicit_strata_query_returns_strata(api):
    body = {
        "query": "strata rules for detached house",
        "limit": 6,
    }
    data = _post(api, body)
    text = _all_section_text(data).lower()
    assert "strata" in text, "Explicit strata query should return strata content"
