"""Content Synchronization Engine tests — /api/doogie/sync-search"""
import os
import pytest
import requests

def _load_backend_url():
    if os.environ.get("REACT_APP_BACKEND_URL"):
        return os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _load_backend_url()
URL = f"{BASE_URL}/api/doogie/sync-search"

REQUIRED_TOP_KEYS = {"query", "intent", "property_intel", "community", "sections", "compliance"}
FRAMEWORKS = ["BCFSA", "CREA", "PIPA", "CASL", "GVR"]


def _post(body):
    r = requests.post(URL, json=body, timeout=45)
    return r


def _section_by_type(sections, type_name):
    for s in sections:
        if (s.get("kind") or s.get("type") or "").lower() == type_name.lower():
            return s
    return None


def test_shape_and_compliance_buy_kelowna():
    body = {
        "query": "3 bedroom house in Kelowna under 900k",
        "filter": {"community": "Kelowna", "property_type": "House", "min_beds": 3, "max_price": 900000},
    }
    r = _post(body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert REQUIRED_TOP_KEYS.issubset(data.keys()), f"missing keys, got {list(data.keys())}"
    assert data["intent"] == "buy"
    assert data["community"] == "Kelowna"
    assert data["property_intel"] == "detached"

    section_types = {(s.get("kind") or s.get("type") or "").lower() for s in data["sections"]}
    print("SECTION_TYPES:", section_types)
    # Required sections
    for req in ["marketinsights", "intentinsights", "communityprofile", "glossary", "faqs", "communities"]:
        assert req in section_types, f"missing section {req}; got {section_types}"

    intent_section = _section_by_type(data["sections"], "intentinsights")
    headline = (intent_section.get("headline") or intent_section.get("title") or "")
    assert "Buyer Insights" in headline, f"IntentInsights headline missing 'Buyer Insights': {headline}"

    comp = data["compliance"]
    assert "role" in comp and "scope" in comp
    assert comp.get("frameworks") == FRAMEWORKS


def test_sell_condo_kelowna():
    body = {"query": "selling my Kelowna condo", "filter": {"community": "Kelowna", "property_type": "Condo"}}
    r = _post(body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["intent"] == "sell"
    assert data["property_intel"] == "condo"
    intent_section = _section_by_type(data["sections"], "intentinsights")
    assert intent_section is not None
    headline = intent_section.get("headline") or intent_section.get("title") or ""
    assert "Seller Insights" in headline, f"got: {headline}"


def test_equestrian_acreage_langley():
    body = {"query": "equestrian acreage with barn near Langley"}
    r = _post(body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["intent"] == "buy"
    assert data["property_intel"] == "equestrian"


def test_waterfront_sechelt():
    body = {"query": "waterfront cabin in Sechelt with a dock"}
    r = _post(body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["intent"] == "buy"
    assert data["property_intel"] == "waterfront"


def test_surrey_whole_word_match():
    body = {"query": "selling my brand new presale in Surrey"}
    r = _post(body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["community"] == "Surrey", f"got: {data['community']}"


def test_empty_body_graceful():
    body = {"query": "", "filter": {}}
    r = _post(body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["sections"] == [], f"expected empty sections; got {data['sections']}"
    assert data["compliance"]["frameworks"] == FRAMEWORKS


def test_market_insights_shape():
    body = {"query": "homes in Kelowna", "filter": {"community": "Kelowna"}}
    r = _post(body)
    assert r.status_code == 200, r.text
    data = r.json()
    mi = _section_by_type(data["sections"], "marketinsights")
    if mi is None:
        pytest.skip("MarketInsights not present for this query")
    insights = mi.get("insights") or {}
    assert "active_count" in insights
    assert "median_list_price" in insights
    assert "market_type_label" in insights
    assert "market_type_note" in insights
    lbl = insights["market_type_label"]
    assert lbl is None or lbl in (
        "Buyer's market conditions",
        "Balanced market conditions",
        "Seller's market conditions",
    ), f"unexpected market_type_label: {lbl}"
