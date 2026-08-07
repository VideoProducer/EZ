"""
Unit tests for services/vision_narration.py — pure-function tests (no
network / no LLM calls).  Full end-to-end verification is via the live
listing endpoint (see /app/image_testing.md).

Run:  cd /app/backend && pytest tests/test_vision_narration.py -v
"""
from services.vision_narration import _sanitise_cues, _build_fact_sheet


def test_sanitise_cues_basic_mapping():
    raw = {"cues": [
        {"ordinal": 0, "sentence": "Front of house.", "room_label": "exterior"},
        {"ordinal": 1, "sentence": "Living room with fireplace.", "room_label": "living"},
        {"ordinal": 2, "sentence": "Kitchen with island.", "room_label": "kitchen"},
    ]}
    loaded = [0, 1, 2]
    out = _sanitise_cues(raw, loaded)
    assert len(out) == 3
    assert out[0]["screen_ref"] == "photos[0]"
    assert out[0]["photo_idx"] == 0
    assert out[0]["room_label"] == "exterior"
    assert out[2]["screen_ref"] == "photos[2]"


def test_sanitise_cues_maps_subset_indices_to_originals():
    """If we skipped photo 3 (failed to download), Sonnet sees ordinals
    0..3 mapped to originals [0,1,2,4]. Ordinal 3 must resolve to photos[4]."""
    raw = {"cues": [
        {"ordinal": 0, "sentence": "A.", "room_label": "exterior"},
        {"ordinal": 1, "sentence": "B.", "room_label": "living"},
        {"ordinal": 2, "sentence": "C.", "room_label": "kitchen"},
        {"ordinal": 3, "sentence": "D.", "room_label": "bed"},
    ]}
    loaded = [0, 1, 2, 4]  # photo 3 dropped
    out = _sanitise_cues(raw, loaded)
    assert out[3]["photo_idx"] == 4
    assert out[3]["screen_ref"] == "photos[4]"


def test_sanitise_cues_drops_out_of_range():
    raw = {"cues": [
        {"ordinal": 0,  "sentence": "OK.", "room_label": "exterior"},
        {"ordinal": 5,  "sentence": "Out of range.", "room_label": "bed"},
        {"ordinal": -1, "sentence": "Negative.", "room_label": "yard"},
    ]}
    out = _sanitise_cues(raw, [0, 1, 2])
    assert len(out) == 1
    assert out[0]["ordinal"] == 0


def test_sanitise_cues_drops_empty_sentences():
    raw = {"cues": [
        {"ordinal": 0, "sentence": "", "room_label": "exterior"},
        {"ordinal": 1, "sentence": "  ", "room_label": "living"},
        {"ordinal": 2, "sentence": "Valid.", "room_label": "kitchen"},
    ]}
    out = _sanitise_cues(raw, [0, 1, 2])
    assert len(out) == 1
    assert out[0]["ordinal"] == 2


def test_sanitise_cues_dedupes_by_ordinal():
    """Sonnet occasionally repeats ordinals — we keep the first."""
    raw = {"cues": [
        {"ordinal": 0, "sentence": "First for photo 0.", "room_label": "exterior"},
        {"ordinal": 0, "sentence": "Duplicate for photo 0.", "room_label": "yard"},
        {"ordinal": 1, "sentence": "Photo 1.", "room_label": "living"},
    ]}
    out = _sanitise_cues(raw, [0, 1])
    assert len(out) == 2
    assert out[0]["sentence"] == "First for photo 0."


def test_sanitise_cues_sorts_in_play_order():
    """Even if Sonnet returns them scrambled, we sort by ordinal so playback
    walks photos left-to-right."""
    raw = {"cues": [
        {"ordinal": 2, "sentence": "Third.", "room_label": "kitchen"},
        {"ordinal": 0, "sentence": "First.", "room_label": "exterior"},
        {"ordinal": 1, "sentence": "Second.", "room_label": "living"},
    ]}
    out = _sanitise_cues(raw, [0, 1, 2])
    assert [c["ordinal"] for c in out] == [0, 1, 2]
    assert out[0]["sentence"] == "First."


def test_fact_sheet_includes_price_and_addr():
    listing = {
        "street_address": "1234 Maple St",
        "city": "Vancouver",
        "list_price": 1250000,
        "beds": 3,
        "baths": 2,
        "living_area_sqft": 1800,
    }
    fs = _build_fact_sheet(listing, loaded_indices=[0, 1, 2])
    assert "Vancouver" in fs
    assert "$1,250,000" in fs
    assert "DO NOT SPEAK AS DIGITS" in fs
    assert "3 images (ordinals 0..2)" in fs


def test_fact_sheet_handles_missing_fields():
    fs = _build_fact_sheet({}, loaded_indices=[0])
    # Should not crash; should mention photo count.
    assert "1 images" in fs


def test_sanitise_cues_empty_input_returns_empty():
    assert _sanitise_cues({"cues": []}, [0, 1]) == []
    assert _sanitise_cues({}, [0, 1]) == []
