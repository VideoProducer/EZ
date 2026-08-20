"""Doogie SSE glossary-citation chips + glossary term endpoints (Feb 2026)."""
import json
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

POPULAR_SLUGS = [
    "property-transfer-tax-ptt",
    "gst-new-housing-rebate-bc",
    "agricultural-land-reserve-alr",
    "subject-removal",
    "2-5-10-home-warranty",
    "form-b-strata-information-certificate",
    "amortization-period",
    "first-time-home-buyers-program-ptt",
]


def _stream_doogie(message, session_id=None, language="en", timeout=180):
    """POST /api/doogie/chat and collect parsed SSE events."""
    payload = {
        "message": message,
        "session_id": session_id or f"TEST_{uuid.uuid4().hex[:8]}",
        "language": language,
    }
    events = []
    with requests.post(f"{API}/doogie/chat", json=payload, stream=True, timeout=timeout) as r:
        assert r.status_code == 200, f"status={r.status_code} body={r.text[:300]}"
        for raw in r.iter_lines(decode_unicode=True):
            if not raw or not raw.startswith("data: "):
                continue
            try:
                events.append(json.loads(raw[6:]))
            except json.JSONDecodeError:
                continue
            if events and events[-1].get("done"):
                break
    return events


# ── Doogie citations SSE event ─────────────────────────────────────────
class TestDoogieCitations:
    def test_citations_event_emitted_before_done(self):
        events = _stream_doogie("Explain PTT and the 2-5-10 warranty for a first-time buyer")
        assert events, "no SSE events received"
        cite_idx = [i for i, e in enumerate(events) if "citations" in e]
        done_idx = [i for i, e in enumerate(events) if e.get("done")]
        assert done_idx, f"no done event; last events={events[-3:]}"
        assert cite_idx, f"no citations event in stream; events tail={events[-3:]}"
        assert cite_idx[0] < done_idx[-1], "citations emitted after done"

        cites = events[cite_idx[0]]["citations"]
        assert isinstance(cites, list) and len(cites) > 0
        for c in cites:
            assert set(["slug", "label", "url"]).issubset(c.keys()), c
            assert isinstance(c["slug"], str) and c["slug"]
            assert c["url"] == f"/glossary/{c['slug']}"
        assert len(cites) <= 6, f"more than 6 chips: {len(cites)}"
        slugs = [c["slug"] for c in cites]
        assert len(slugs) == len(set(slugs)), f"duplicate slugs {slugs}"
        # topic relevance
        assert any(s in slugs for s in ("property-transfer-tax-ptt", "2-5-10-home-warranty")), slugs

    def test_reply_text_streams_deltas(self):
        events = _stream_doogie("What is the Property Transfer Tax in BC?")
        text = "".join(e.get("delta", "") for e in events)
        assert len(text) > 40, f"reply too short: {text!r}"

    def test_no_citations_for_unrelated_message(self):
        """Off-topic message should not fabricate irrelevant chips (soft check)."""
        events = _stream_doogie("Hello, how are you today?")
        cites = next((e["citations"] for e in events if "citations" in e), [])
        assert isinstance(cites, list)
        for c in cites:
            assert c["url"].startswith("/glossary/")


# ── Glossary term pages backing the citation/inline chips ──────────────
class TestGlossaryTermsExist:
    @pytest.mark.parametrize("slug", POPULAR_SLUGS)
    def test_popular_term_resolves(self, slug):
        r = requests.get(f"{API}/glossary/{slug}", timeout=30)
        assert r.status_code == 200, f"{slug} -> {r.status_code} {r.text[:200]}"
        data = r.json()
        assert "_id" not in json.dumps(data), "mongo _id leaked"
        assert isinstance(data, dict), type(data)
        assert isinstance(data.get("term"), str) and data["term"], data
        assert isinstance(data.get("definition"), str) and len(data["definition"]) > 30, data.get("definition")
        if "slug" in data:
            assert data["slug"] == slug, data["slug"]

    def test_glossary_list_endpoint(self):
        r = requests.get(f"{API}/glossary", timeout=30)
        assert r.status_code == 200
        data = r.json()
        items = data.get("terms") if isinstance(data, dict) else data
        assert isinstance(items, list) and len(items) > 50, f"only {len(items) if isinstance(items, list) else data}"

    def test_unknown_slug_404(self):
        r = requests.get(f"{API}/glossary/TEST_definitely-not-a-term", timeout=30)
        assert r.status_code == 404, r.status_code
