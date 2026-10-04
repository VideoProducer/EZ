"""Backend regression tests for English-only rollback (iteration 38)."""
import os
import json
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://proptech-hub-111.preview.emergentagent.com").rstrip("/")


# ---------------- Doogie Chat forces English ----------------
class TestDoogieChatEnglish:
    def test_doogie_chat_forced_english_even_when_fr_requested(self):
        """POST /api/doogie/chat with language='fr' should still reply in English."""
        session_id = f"test-{uuid.uuid4()}"
        payload = {
            "session_id": session_id,
            "message": "What is the property transfer tax in BC?",
            "language": "fr",
        }
        # SSE streaming endpoint
        r = requests.post(f"{BASE_URL}/api/doogie/chat", json=payload, stream=True, timeout=60)
        assert r.status_code == 200, f"status={r.status_code} body={r.text[:300]}"

        collected = []
        for raw in r.iter_lines(decode_unicode=True):
            if not raw:
                continue
            if raw.startswith("data:"):
                data_str = raw[5:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    obj = json.loads(data_str)
                except Exception:
                    continue
                # try common fields
                for k in ("text", "delta", "content", "message", "chunk"):
                    v = obj.get(k) if isinstance(obj, dict) else None
                    if isinstance(v, str):
                        collected.append(v)
            if len(collected) > 400:
                break

        full = " ".join(collected).lower()
        print(f"Full reply (first 400 chars): {full[:400]}")
        assert len(full) > 10, "Reply was effectively empty"

        # Common french words that should NOT appear
        french_markers = [" taxe ", " impôt", " propriété", " transfert ", " acheteur", "colombie-britannique"]
        found_fr = [m for m in french_markers if m in full]
        assert not found_fr, f"Found French markers in reply: {found_fr}; reply={full[:400]}"


# ---------------- Doogie MLS natural-language search ----------------
class TestDoogieMlsSearch:
    def test_townhouses_in_langley_with_suite(self):
        payload = {"message": "townhouses in Langley with a suite"}
        r = requests.post(f"{BASE_URL}/api/doogie/mls-search", json=payload, timeout=60)
        assert r.status_code == 200, f"status={r.status_code} body={r.text[:400]}"
        data = r.json()
        print(f"MLS keys: {list(data.keys())}")
        # Try several structures
        count = data.get("count")
        if count is None:
            # Could be nested
            if "results" in data and isinstance(data["results"], list):
                count = len(data["results"])
            elif "listings" in data and isinstance(data["listings"], list):
                count = len(data["listings"])
        assert count is not None, f"No count/results in: {data}"
        assert count > 0, f"Expected count>0, got {count}; data={json.dumps(data)[:400]}"

        filters = data.get("filters") or data.get("parsed") or {}
        features = filters.get("features") if isinstance(filters, dict) else None
        print(f"Filters: {filters}")
        if features is not None:
            assert "suite" in [str(f).lower() for f in features], f"Expected 'suite' in features, got {features}"


# ---------------- Buyer lead submission still works ----------------
class TestLeadFormSubmission:
    def test_buyer_submit(self):
        pytest.skip("Buyer form submit requires live Cloudflare Turnstile token; verified via frontend UI test instead.")
        payload = {
            "full_name": "TEST Buyer Reg38",
            "email": f"test_buyer_{uuid.uuid4().hex[:8]}@example.com",
            "phone": "604-555-0199",
            "property_type": "Townhouse",
            "budget_range": "500000-800000",
            "financing_status": "pre-approved",
            "casl_consent": True,
            "price_range": "500000-800000",
            "beds": 2,
            "timeline": "3-6 months",
            "areas": ["Langley"],
            "message": "Automated regression test",
            "pipa_ack": True,
            "dorts": True,
            "language": "en",
        }
        r = requests.post(f"{BASE_URL}/api/leads/buyer", json=payload, timeout=30)
        print(f"Buyer submit: {r.status_code} - {r.text[:300]}")
        assert r.status_code in (200, 201), f"status={r.status_code} body={r.text[:300]}"
        data = r.json()
        assert data.get("ok") is True or data.get("id") or data.get("success"), f"Unexpected response: {data}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
