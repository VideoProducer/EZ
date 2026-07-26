"""
Unit tests for the deterministic beds/baths regex override that runs AFTER
the LLM extraction. This is what caught the "3 bedroom homes under 1M" bug
where Claude was still returning beds_min=3 despite the updated prompt.
"""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from server import _apply_beds_baths_regex_override  # noqa: E402


def run(query: str, parsed_from_llm: dict | None = None) -> dict:
    """Simulate: LLM returned `parsed_from_llm`, then regex override runs."""
    d = dict(parsed_from_llm or {})
    _apply_beds_baths_regex_override(query, d)
    return d


class TestExactBedroomOverridesLLMMin:
    """The exact user-reported bug: Williams Lake, 3-bedroom under 1M returned a 4-bed."""

    def test_3_bedroom_homes_forces_exact(self):
        # Simulate: Claude returned beds_min=3 by mistake.
        out = run("3 bedroom homes in Williams Lake under 1 million", {"beds_min": 3})
        assert out["beds_exact"] == 3
        assert out["beds_min"] is None

    def test_4_bedroom_home_forces_exact(self):
        out = run("4 bedroom home in Prince George under 1.5 million", {"beds_min": 4})
        assert out["beds_exact"] == 4
        assert out["beds_min"] is None

    def test_hyphenated_form(self):
        out = run("2-bedroom condo in Kits", {"beds_min": 2})
        assert out["beds_exact"] == 2

    def test_word_form_two(self):
        out = run("two bedroom in Whistler", {"beds_min": 2})
        assert out["beds_exact"] == 2

    def test_word_form_four(self):
        out = run("four bed detached in Surrey", {"beds_min": 4})
        assert out["beds_exact"] == 4

    def test_short_bed_form(self):
        out = run("3 bed home", {"beds_min": 3})
        assert out["beds_exact"] == 3


class TestMinPhrasesAreRespected:
    """When the user explicitly says "at least" / "+" / "or more", keep beds_min."""

    def test_plus_syntax_keeps_min(self):
        out = run("4+ bedroom homes", {"beds_exact": 4})
        assert out["beds_min"] == 4
        assert out["beds_exact"] is None

    def test_at_least_keeps_min(self):
        out = run("at least 3 bedrooms", {"beds_exact": 3})
        assert out["beds_min"] == 3
        assert out["beds_exact"] is None

    def test_or_more_keeps_min(self):
        out = run("3 bedrooms or more", {"beds_exact": 3})
        assert out["beds_min"] == 3
        assert out["beds_exact"] is None

    def test_minimum_keeps_min(self):
        out = run("minimum 5 bedrooms", {"beds_exact": 5})
        assert out["beds_min"] == 5
        assert out["beds_exact"] is None


class TestBathrooms:
    def test_exact_baths(self):
        out = run("2 bathroom condo", {"baths_min": 2})
        assert out["baths_exact"] == 2
        assert out["baths_min"] is None

    def test_half_bath_exact(self):
        out = run("2.5 bath home", {})
        assert out["baths_exact"] == 2.5

    def test_baths_plus_keeps_min(self):
        out = run("3+ bathrooms", {"baths_exact": 3})
        assert out["baths_min"] == 3


class TestCombined:
    def test_beds_and_baths_and_price(self):
        # Real user-style query
        out = run("3 bedroom 2 bathroom home under 800k in Kelowna", {"beds_min": 3, "baths_min": 2})
        assert out["beds_exact"] == 3
        assert out["beds_min"] is None
        assert out["baths_exact"] == 2
        assert out["baths_min"] is None


class TestNoOpsWhenNoBedMention:
    def test_no_bed_mention_leaves_parsed_alone(self):
        # If user didn't mention beds, don't invent an exact value.
        out = run("waterfront home in Sechelt with private dock", {})
        assert out.get("beds_exact") is None
        assert out.get("beds_min") is None

    def test_price_only_query_untouched(self):
        out = run("homes under 2 million in West Vancouver", {"price_max": 2000000})
        assert out.get("beds_exact") is None
        assert out.get("beds_min") is None
        assert out["price_max"] == 2000000


class TestPrinceOfMisinterpretation:
    """Edge cases where a naive regex might trip."""

    def test_no_confuse_with_price(self):
        # "1 million" contains "1" — shouldn't be read as "1 bed".
        out = run("home under 1 million", {})
        # No "bed"/"bedroom" mentioned → no bed override.
        assert out.get("beds_exact") is None

    def test_year_built_not_treated_as_beds(self):
        # "2020 built home" contains "2020" but no "bed" — must not set beds.
        out = run("2020 built home in Nanaimo", {})
        assert out.get("beds_exact") is None
