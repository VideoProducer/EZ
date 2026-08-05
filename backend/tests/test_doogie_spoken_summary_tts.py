"""Tests for the new spoken_summary field on /api/doogie/sync-search
and the /api/doogie/tts endpoint (MP3 + cache header).
"""
import os
import pytest
import requests


def _load_backend_url():
    if os.environ.get("REACT_APP_BACKEND_URL"):
        return os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _load_backend_url()
SYNC_URL = f"{BASE_URL}/api/doogie/sync-search"
TTS_URL = f"{BASE_URL}/api/doogie/tts"

COMPLIANCE_LINE = "Everything shown is informational only — not advice."
OPINION_WORDS = ["hot", "great", "deal", "opportunity", "good time", "buyer's market", "seller's market"]


# ---------- spoken_summary tests ----------

def test_spoken_summary_present_for_buy_kelowna_condo():
    body = {"query": "3 bed condo in Kelowna", "filter": {"community": "Kelowna", "property_type": "Condo"}}
    r = requests.post(SYNC_URL, json=body, timeout=45)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "spoken_summary" in data, f"spoken_summary missing; keys={list(data.keys())}"
    ss = data["spoken_summary"]
    assert isinstance(ss, str) and ss.strip(), f"spoken_summary empty: {ss!r}"

    # (c) Kelowna present
    assert "Kelowna" in ss, f"'Kelowna' missing in spoken_summary: {ss!r}"

    # (d) compliance line at end
    assert ss.rstrip().endswith(COMPLIANCE_LINE), f"compliance tail missing; tail={ss[-120:]!r}"

    # (b) active_count value present
    mi = next((s for s in data["sections"] if (s.get("kind") or "").lower() == "marketinsights"), None)
    if mi is not None:
        ac = (mi.get("insights") or {}).get("active_count")
        if isinstance(ac, int):
            # Comma-formatted OR bare
            formatted = f"{ac:,}"
            assert (formatted in ss) or (str(ac) in ss), \
                f"active_count {ac} (or {formatted}) not in spoken_summary: {ss!r}"

    # (e) NO market-opinion words
    ss_lower = ss.lower()
    for w in OPINION_WORDS:
        assert w not in ss_lower, f"opinion word '{w}' found in spoken_summary: {ss!r}"


def test_spoken_summary_empty_when_no_query_no_filter():
    body = {"query": "", "filter": {}}
    r = requests.post(SYNC_URL, json=body, timeout=45)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "spoken_summary" in data
    assert data["spoken_summary"] == "", f"expected empty spoken_summary, got: {data['spoken_summary']!r}"


def test_spoken_summary_seller_intent_mentions_seller_resources():
    body = {"query": "selling my Kelowna condo", "filter": {"community": "Kelowna", "property_type": "Condo"}}
    r = requests.post(SYNC_URL, json=body, timeout=45)
    assert r.status_code == 200, r.text
    data = r.json()
    ss = data.get("spoken_summary", "")
    assert ss, "spoken_summary should be non-empty for seller intent w/ filter"
    assert "seller resources" in ss.lower(), f"'seller resources' phrase missing: {ss!r}"
    # Compliance
    assert ss.rstrip().endswith(COMPLIANCE_LINE)
    # No opinion words
    low = ss.lower()
    for w in OPINION_WORDS:
        assert w not in low, f"opinion word '{w}' present: {ss!r}"


# ---------- TTS endpoint tests ----------

def test_tts_returns_mp3_with_cache_headers():
    # Get a real summary
    body = {"query": "3 bed condo in Kelowna", "filter": {"community": "Kelowna", "property_type": "Condo"}}
    r = requests.post(SYNC_URL, json=body, timeout=45)
    assert r.status_code == 200
    summary = r.json().get("spoken_summary")
    assert summary, "need non-empty summary to test TTS"

    # First call — expect MISS
    payload = {"text": summary}
    r1 = requests.post(TTS_URL, json=payload, timeout=60)
    assert r1.status_code == 200, f"TTS status={r1.status_code}, body={r1.text[:400]}"
    ctype = r1.headers.get("content-type", "")
    assert "audio/mpeg" in ctype, f"unexpected content-type: {ctype}"
    assert len(r1.content) > 10 * 1024, f"body too small: {len(r1.content)} bytes"
    cache1 = r1.headers.get("X-EZ-TTS-Cache") or r1.headers.get("x-ez-tts-cache")
    assert cache1 is not None, f"missing X-EZ-TTS-Cache header; headers={dict(r1.headers)}"
    # First should generally be MISS (or HIT if warmed from previous run — accept both but at least check subsequent HIT)

    # Second call — expect HIT
    r2 = requests.post(TTS_URL, json=payload, timeout=60)
    assert r2.status_code == 200
    cache2 = r2.headers.get("X-EZ-TTS-Cache") or r2.headers.get("x-ez-tts-cache")
    assert cache2 is not None
    assert cache2.upper() == "HIT", f"expected HIT on repeat call, got {cache2!r}"
    assert "audio/mpeg" in r2.headers.get("content-type", "")
    assert len(r2.content) > 10 * 1024
