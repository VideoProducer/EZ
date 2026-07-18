"""
Doogie AI referral-rule tests.

Validates that the /api/doogie/chat SSE streaming endpoint yields a reply which:
  1. Ends with a yes/no referral question containing the city name for
     out-of-focus BC communities (Osoyoos, Kelowna, Victoria, Prince George, Nelson).
  2. Ends with a yes/no offer to connect the user with "Doug LeMaire" for
     in-focus BC communities (Langley, Surrey, Squamish, Whistler, West Vancouver).
  3. Substantive replies still include the general compliance disclaimer.

The endpoint is Server-Sent Events (SSE). We stream `data: {...}` lines and
accumulate the "delta" fields until we see `done`.

Each city is streamed exactly ONCE (module-scope cache) to keep the LLM
usage low; multiple pytest test functions then assert against the same reply.
"""
import json
import uuid
import pytest
import requests


# ---------- Config ----------
def _load_frontend_url():
    env_path = "/app/frontend/.env"
    with open(env_path) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE_URL = _load_frontend_url()
CHAT_URL = f"{BASE_URL}/api/doogie/chat"
STREAM_TIMEOUT = 120  # seconds
DISCLAIMER = "general information only"


# ---------- Helpers ----------
def stream_doogie_reply(message: str, session_id: str | None = None) -> dict:
    """POST to /api/doogie/chat and accumulate SSE deltas into a full reply."""
    sid = session_id or str(uuid.uuid4())
    payload = {"session_id": sid, "message": message}
    full = ""
    events = 0
    done = False
    errors = []
    content_type = ""
    with requests.post(CHAT_URL, json=payload, stream=True, timeout=STREAM_TIMEOUT) as r:
        content_type = r.headers.get("content-type", "")
        status = r.status_code
        if status != 200:
            return {"full": "", "done": False, "session_id": sid, "events": 0,
                    "errors": [f"HTTP {status}: {r.text[:400]}"], "content_type": content_type,
                    "status": status}
        for raw in r.iter_lines(decode_unicode=True):
            if not raw or not raw.startswith("data:"):
                continue
            data_str = raw[len("data:"):].strip()
            try:
                obj = json.loads(data_str)
            except json.JSONDecodeError:
                continue
            events += 1
            if "delta" in obj:
                full += obj["delta"]
            if obj.get("done"):
                done = True
                break
            if "error" in obj:
                errors.append(obj["error"])
                break
    return {"full": full, "done": done, "session_id": sid, "events": events,
            "errors": errors, "content_type": content_type, "status": 200}


# ---------- Test data ----------
OUT_OF_FOCUS = [
    ("Osoyoos",       "Tell me about Osoyoos, BC — what's it like to live there?"),
    ("Kelowna",       "What can you tell me about Kelowna as a place to buy a home?"),
    ("Victoria",      "I'm curious about Victoria, BC. Any info you can share?"),
    ("Prince George", "How is the community of Prince George in BC?"),
    ("Nelson",        "Tell me about Nelson, BC."),
]

IN_FOCUS = [
    ("Langley",        "Tell me about Langley, BC as a place to buy a home."),
    ("Surrey",         "What's it like living in Surrey, BC?"),
    ("Squamish",       "Can you tell me about Squamish, BC?"),
    ("Whistler",       "What can you tell me about Whistler as a community?"),
    ("West Vancouver", "Tell me about West Vancouver, BC."),
]


# ---------- Cached replies (one LLM call per city) ----------
_REPLY_CACHE: dict[str, dict] = {}


def _get_reply(city: str, prompt: str) -> dict:
    if city not in _REPLY_CACHE:
        _REPLY_CACHE[city] = stream_doogie_reply(prompt)
        # Print for pytest -s visibility
        r = _REPLY_CACHE[city]
        print(f"\n----- Doogie reply for {city} (events={r['events']}, done={r['done']}) -----")
        print(r["full"])
        print("----- END -----\n")
    return _REPLY_CACHE[city]


# ---------- Out-of-focus tests ----------
@pytest.mark.parametrize("city,prompt", OUT_OF_FOCUS, ids=[c for c, _ in OUT_OF_FOCUS])
class TestOutOfFocusReferral:
    """For any BC city outside Doug's focus areas, Doogie must ask a yes/no
    referral question naming the city and offering a vetted REALTOR."""

    def test_stream_completes(self, city, prompt):
        r = _get_reply(city, prompt)
        assert r["errors"] == [], f"stream errors for {city}: {r['errors']}"
        assert "text/event-stream" in r["content_type"], f"wrong content-type: {r['content_type']}"
        assert r["done"] is True, f"stream did not signal 'done' for {city}"
        assert r["events"] > 1, f"only {r['events']} SSE events for {city}"
        assert len(r["full"]) > 60, f"reply too short for {city}: {r['full']!r}"

    def test_contains_referral_question_with_city(self, city, prompt):
        r = _get_reply(city, prompt)
        full = r["full"]
        low = full.lower()
        assert "?" in full, f"no '?' in reply for {city}: {full!r}"
        assert "refer" in low, f"missing 'refer' keyword for {city}: {full!r}"
        assert "realtor" in low, f"missing 'REALTOR' keyword for {city}: {full!r}"
        assert city.lower() in low, f"missing city name '{city}' in reply: {full!r}"

    def test_tail_ends_with_referral_offer(self, city, prompt):
        r = _get_reply(city, prompt)
        tail = r["full"][-500:].lower()
        assert "?" in tail, f"no '?' in tail for {city}: {tail!r}"
        assert "refer" in tail and "realtor" in tail, (
            f"tail missing referral offer for {city}: {tail!r}"
        )
        assert city.lower() in tail, (
            f"tail does not name the city '{city}': {tail!r}"
        )

    def test_disclaimer_present(self, city, prompt):
        r = _get_reply(city, prompt)
        assert DISCLAIMER in r["full"].lower(), (
            f"missing general-information disclaimer for {city}: {r['full']!r}"
        )


# ---------- In-focus tests ----------
@pytest.mark.parametrize("city,prompt", IN_FOCUS, ids=[c for c, _ in IN_FOCUS])
class TestInFocusReferral:
    """For any BC community inside Doug's focus areas, Doogie must offer to
    connect the user directly with Doug LeMaire."""

    def test_stream_completes(self, city, prompt):
        r = _get_reply(city, prompt)
        assert r["errors"] == [], f"stream errors for {city}: {r['errors']}"
        assert r["done"] is True, f"stream did not signal 'done' for {city}"
        assert len(r["full"]) > 60, f"reply too short for {city}: {r['full']!r}"

    def test_offers_doug_connection(self, city, prompt):
        r = _get_reply(city, prompt)
        full = r["full"]
        low = full.lower()
        assert "?" in full, f"no '?' in reply for {city}: {full!r}"
        assert "doug lemaire" in low, f"missing 'Doug LeMaire' for {city}: {full!r}"
        assert "connect" in low, f"missing 'connect' verb for {city}: {full!r}"

    def test_tail_ends_with_doug_offer(self, city, prompt):
        r = _get_reply(city, prompt)
        tail = r["full"][-500:].lower()
        assert "?" in tail, f"no '?' at tail for {city}: {tail!r}"
        assert "doug lemaire" in tail, f"tail does not name Doug LeMaire for {city}: {tail!r}"
        assert "connect" in tail, f"tail does not offer to connect for {city}: {tail!r}"

    def test_disclaimer_present(self, city, prompt):
        r = _get_reply(city, prompt)
        assert DISCLAIMER in r["full"].lower(), (
            f"missing general-information disclaimer for {city}: {r['full']!r}"
        )
