"""Pure-function tests for the tour narration + keyframe services.
Live Playwright + Sonnet vision paths verified via the live listing endpoint."""
from services.keyframes import _detect_kind
from services.vision_tour_narration import _sanitise_cues, _fmt_ts


def test_detect_kind_youtube():
    assert _detect_kind("https://www.youtube.com/embed/abc123") == "youtube"
    assert _detect_kind("https://youtu.be/abc123") == "youtube"
    assert _detect_kind("https://www.youtube-nocookie.com/embed/xyz") == "youtube"


def test_detect_kind_vimeo():
    assert _detect_kind("https://player.vimeo.com/video/12345") == "vimeo"
    assert _detect_kind("https://vimeo.com/12345") == "vimeo"


def test_detect_kind_matterport():
    assert _detect_kind("https://my.matterport.com/show/?m=abc") == "matterport"
    assert _detect_kind("https://matterport.com/show/?m=xyz") == "matterport"


def test_detect_kind_video_file():
    assert _detect_kind("https://cdn.example.com/tour.mp4") == "video_file"
    assert _detect_kind("https://cdn.example.com/tour.webm?token=abc") == "video_file"
    assert _detect_kind("https://cdn.example.com/TOUR.MOV") == "video_file"


def test_detect_kind_unknown():
    assert _detect_kind("https://example.com/tour") == "other"
    assert _detect_kind("") == "other"


def test_normalize_youtube_watch_to_embed():
    from services.keyframes import _normalize_youtube_url
    out = _normalize_youtube_url("https://www.youtube.com/watch?v=abc123")
    assert "/embed/abc123" in out
    assert "enablejsapi=1" in out
    assert "autoplay=1" in out


def test_normalize_youtu_be_short():
    from services.keyframes import _normalize_youtube_url
    out = _normalize_youtube_url("https://youtu.be/xyz456")
    assert "/embed/xyz456" in out
    assert "enablejsapi=1" in out


def test_normalize_youtube_embed_adds_api():
    from services.keyframes import _normalize_youtube_url
    out = _normalize_youtube_url("https://www.youtube.com/embed/foo")
    assert "enablejsapi=1" in out


def test_normalize_non_youtube_passthrough():
    from services.keyframes import _normalize_youtube_url
    assert _normalize_youtube_url("https://vimeo.com/12345") == "https://vimeo.com/12345"
    assert _normalize_youtube_url("") == ""


def test_fmt_ts():
    assert _fmt_ts(0) == "0:00"
    assert _fmt_ts(1000) == "0:01"
    assert _fmt_ts(65000) == "1:05"
    assert _fmt_ts(125000) == "2:05"


def test_tour_sanitise_cues_maps_ordinal_to_seek_ms():
    keyframes = [
        {"seek_ms": 1000, "jpeg_bytes": b"x"},
        {"seek_ms": 15000, "jpeg_bytes": b"x"},
        {"seek_ms": 30000, "jpeg_bytes": b"x"},
    ]
    raw = {"cues": [
        {"ordinal": 0, "sentence": "Front porch.",      "room_label": "exterior"},
        {"ordinal": 1, "sentence": "Bright living room.","room_label": "living"},
        {"ordinal": 2, "sentence": "Sunny kitchen.",     "room_label": "kitchen"},
    ]}
    out = _sanitise_cues(raw, keyframes)
    assert len(out) == 3
    assert out[0]["seek_ms"] == 1000
    assert out[0]["screen_ref"] == "tour_ts=0:01"
    assert out[1]["seek_ms"] == 15000
    assert out[1]["screen_ref"] == "tour_ts=0:15"
    assert out[2]["seek_ms"] == 30000
    assert out[2]["screen_ref"] == "tour_ts=0:30"


def test_tour_sanitise_cues_drops_out_of_range():
    keyframes = [{"seek_ms": 0, "jpeg_bytes": b"x"}]
    raw = {"cues": [
        {"ordinal": 0, "sentence": "OK.", "room_label": "exterior"},
        {"ordinal": 5, "sentence": "Bad.", "room_label": "bed"},
    ]}
    out = _sanitise_cues(raw, keyframes)
    assert len(out) == 1


def test_tour_sanitise_cues_sorts_by_ordinal():
    keyframes = [{"seek_ms": i * 1000, "jpeg_bytes": b"x"} for i in range(3)]
    raw = {"cues": [
        {"ordinal": 2, "sentence": "C.", "room_label": "k"},
        {"ordinal": 0, "sentence": "A.", "room_label": "e"},
        {"ordinal": 1, "sentence": "B.", "room_label": "l"},
    ]}
    out = _sanitise_cues(raw, keyframes)
    assert [c["ordinal"] for c in out] == [0, 1, 2]
