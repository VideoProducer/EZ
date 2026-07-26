"""
Unit tests for `_build_mls_query` — the pure function that turns Doogie's
extracted NL filters into a MongoDB query dict.

These tests do NOT hit Anthropic and do NOT need a running Mongo, so they
work even when the Emergent Universal Key balance is empty.

Regression scope: fixes the "4 bedroom home" bug where the endpoint was
returning 3-bed and 5-bed homes because the schema only supported `beds_min`
(which builds a `{"$gte": 4}` query). We now honour `beds_exact` for plain
counts and `beds_min` only when the user explicitly says "at least"/"+"/"or more".
"""
import sys
import pathlib

# Allow `import server` from /app/backend
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from server import _build_mls_query  # noqa: E402


class TestBedsFiltering:
    def test_beds_exact_uses_equality_not_gte(self):
        """The 'exactly 4 bedrooms' bug fix — this is the whole point."""
        q = _build_mls_query({"beds_exact": 4})
        assert q["beds"] == 4, "beds_exact should produce a plain int (Mongo $eq), not a $gte range"

    def test_beds_min_still_uses_gte(self):
        q = _build_mls_query({"beds_min": 3})
        assert q["beds"] == {"$gte": 3}

    def test_beds_exact_wins_when_both_present(self):
        """Belt-and-suspenders: if the model somehow returns both, exact wins."""
        q = _build_mls_query({"beds_exact": 4, "beds_min": 2})
        assert q["beds"] == 4

    def test_no_beds_filter_when_absent(self):
        q = _build_mls_query({"city": "Vancouver"})
        assert "beds" not in q

    def test_beds_exact_zero_is_ignored(self):
        # Studio counts (0 beds) are legitimate — but our schema treats None as
        # absent. A defensive check: 0 is falsy, so it currently WOULD be
        # ignored. Document that behaviour here so a future change is explicit.
        q = _build_mls_query({"beds_exact": 0})
        # We explicitly use `is not None`, so 0 IS honoured as exact.
        assert q.get("beds") == 0


class TestBathsFiltering:
    def test_baths_exact(self):
        q = _build_mls_query({"baths_exact": 2})
        assert q["baths"] == 2

    def test_baths_min(self):
        q = _build_mls_query({"baths_min": 2})
        assert q["baths"] == {"$gte": 2}

    def test_baths_exact_wins_over_min(self):
        q = _build_mls_query({"baths_exact": 3, "baths_min": 1})
        assert q["baths"] == 3


class TestPriceRange:
    def test_price_max_only(self):
        q = _build_mls_query({"price_max": 1500000})
        assert q["list_price"] == {"$lte": 1500000}

    def test_price_min_only(self):
        q = _build_mls_query({"price_min": 500000})
        assert q["list_price"] == {"$gte": 500000}

    def test_price_range(self):
        q = _build_mls_query({"price_min": 500000, "price_max": 1500000})
        assert q["list_price"] == {"$gte": 500000, "$lte": 1500000}


class TestCityAndRegion:
    def test_city_case_insensitive_exact_regex(self):
        q = _build_mls_query({"city": "Prince George"})
        assert q["city"]["$options"] == "i"
        # anchors and escaped city name
        assert q["city"]["$regex"].startswith("^") and q["city"]["$regex"].endswith("$")
        # re.escape() escapes the space in "Prince George" → "Prince\\ George"
        import re as _re
        assert q["city"]["$regex"] == f"^{_re.escape('Prince George')}$"


class TestPrinceGeorge4BedUnder1_5M:
    """The exact scenario from the user bug report."""

    def test_full_scenario(self):
        filters = {
            "city": "Prince George",
            "property_type": "Detached",
            "beds_exact": 4,
            "price_max": 1500000,
        }
        q = _build_mls_query(filters)

        # 1. Beds is an exact int, NOT a $gte range → 3-beds and 5-beds are excluded.
        assert q["beds"] == 4

        # 2. Price cap honoured.
        assert q["list_price"] == {"$lte": 1500000}

        # 3. City locked to Prince George (case-insensitive exact).
        assert q["city"]["$regex"] == "^Prince\\ George$"

        # 4. Residential-only guard still in place.
        assert q["status"] == "Active"


class TestNormalizeExactVsMinConflict:
    """The filter extractor also normalizes conflicts, but the query builder
    should ALSO defend against them independently."""

    def test_builder_defends_against_conflict(self):
        q = _build_mls_query({"beds_exact": 4, "beds_min": 4, "baths_exact": 2, "baths_min": 2})
        assert q["beds"] == 4
        assert q["baths"] == 2
