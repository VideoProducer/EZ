"""
Unit tests for `_city_query()` — the municipal-suffix aliasing helper that
makes "Langley Township" match CREA's "Langley" city rows.
"""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from server import _city_query  # noqa: E402


class TestSuffixStripping:
    def test_langley_township_matches_langley_too(self):
        """The exact user-reported bug: 0 listings for Langley Township despite 632 Langley rows."""
        q = _city_query("Langley Township")
        # regex should match BOTH "Langley Township" AND "Langley"
        import re
        pat = re.compile(q["$regex"], re.IGNORECASE if q["$options"] == "i" else 0)
        assert pat.match("Langley Township")
        assert pat.match("Langley")
        assert pat.match("langley")   # case-insensitive
        assert not pat.match("Langford")
        assert not pat.match("New Langley")

    def test_langley_city_also_matches_langley(self):
        q = _city_query("Langley City")
        import re
        pat = re.compile(q["$regex"], re.IGNORECASE)
        assert pat.match("Langley")
        assert pat.match("Langley City")

    def test_north_vancouver_district(self):
        q = _city_query("North Vancouver District")
        import re
        pat = re.compile(q["$regex"], re.IGNORECASE)
        assert pat.match("North Vancouver")
        assert pat.match("North Vancouver District")

    def test_township_of_vs_township(self):
        # Only trailing suffix stripped — "Township of Langley" isn't handled.
        # Document current behaviour.
        q = _city_query("Langley Twp.")
        import re
        pat = re.compile(q["$regex"], re.IGNORECASE)
        assert pat.match("Langley")
        assert pat.match("Langley Twp.")

    def test_no_suffix_still_works(self):
        q = _city_query("Vancouver")
        import re
        pat = re.compile(q["$regex"], re.IGNORECASE)
        assert pat.match("Vancouver")
        assert not pat.match("North Vancouver")
        assert not pat.match("Vancouver Island")

    def test_district_municipality(self):
        q = _city_query("Squamish District Municipality")
        import re
        pat = re.compile(q["$regex"], re.IGNORECASE)
        assert pat.match("Squamish")
        assert pat.match("Squamish District Municipality")


class TestEdgeCases:
    def test_empty_returns_empty(self):
        assert _city_query("") == {}
        assert _city_query(None) == {}

    def test_whitespace_stripped(self):
        q = _city_query("  Langley Township  ")
        import re
        pat = re.compile(q["$regex"], re.IGNORECASE)
        assert pat.match("Langley")

    def test_regex_special_chars_escaped(self):
        # City with a dot ("St. John's-ish") — no CREA cities like this in BC,
        # but we should not blow up on regex metacharacters.
        q = _city_query("Saanich (Central)")
        import re
        pat = re.compile(q["$regex"], re.IGNORECASE)
        assert pat.match("Saanich (Central)")


class TestNoFalsePositives:
    def test_does_not_match_substrings(self):
        q = _city_query("Langley")  # already the stripped form
        import re
        pat = re.compile(q["$regex"], re.IGNORECASE)
        # Anchored regex must NOT match substrings
        assert not pat.match("Langley Township")  # Substring, but not anchored fullmatch
        assert not pat.fullmatch("Langley Township")
        assert pat.fullmatch("Langley")
