"""Pytest suite for services.neighborhood_heatmap — the 32-neighborhood
heatmap engine. Focuses on the pure helper functions (scoring,
classification, market type, slug/label, arrow computation) so it runs
without a live Mongo instance."""
import pytest

from services.neighborhood_heatmap import (
    _arrow_from_delta,
    _slugify,
    classify,
    market_type_from_mos,
    neighborhood_key,
    neighborhood_label,
    score_temperature,
)


# ── slug + key ─────────────────────────────────────────────────────────────
def test_slugify_lowercases_and_strips():
    assert _slugify("Fraserview VE") == "fraserview-ve"
    assert _slugify("  West   End  ") == "west-end"
    assert _slugify("Maple Ridge / Cottonwood") == "maple-ridge-cottonwood"
    assert _slugify("") == ""


def test_neighborhood_key_combines_city_and_region():
    assert neighborhood_key("Vancouver", "West End") == "vancouver--west-end"


def test_neighborhood_key_falls_back_to_city_when_region_blank():
    assert neighborhood_key("Maple Ridge", "") == "maple-ridge"


def test_neighborhood_key_unknown_when_both_blank():
    assert neighborhood_key("", "") == "unknown"


def test_neighborhood_label_uses_region_when_present():
    short, city = neighborhood_label("Vancouver", "West End")
    assert short == "West End"
    assert city == "Vancouver"


def test_neighborhood_label_falls_back_to_city_when_region_matches():
    short, city = neighborhood_label("Whistler", "Whistler")
    assert short == city == "Whistler"


# ── temperature scoring ────────────────────────────────────────────────────
def test_score_temperature_max_when_all_signals_hot():
    s = score_temperature(
        median_dom=10, months_of_supply=2.0,
        absorption_ratio=1.5, mom_price_pct=3.0,
    )
    assert s == 100


def test_score_temperature_zero_when_all_signals_cold():
    s = score_temperature(
        median_dom=180, months_of_supply=12.0,
        absorption_ratio=0.4, mom_price_pct=-5.0,
    )
    assert s == 0


def test_score_temperature_partial_credit():
    # DOM 30 → 15, MoS 4 → 17, ratio 1.0 → 8, price flat → 8  = 48
    s = score_temperature(
        median_dom=30, months_of_supply=4.0,
        absorption_ratio=1.0, mom_price_pct=0.0,
    )
    assert 40 <= s <= 55


def test_score_temperature_ignores_missing_signals():
    s = score_temperature(
        median_dom=None, months_of_supply=None,
        absorption_ratio=None, mom_price_pct=None,
    )
    assert s == 0


# ── classification bands ───────────────────────────────────────────────────
def test_classify_bands():
    assert classify(80) == "Hot"
    assert classify(75) == "Hot"
    assert classify(74) == "Warming"
    assert classify(55) == "Warming"
    assert classify(54) == "Cool"
    assert classify(30) == "Cool"
    assert classify(29) == "Cold"
    assert classify(0)  == "Cold"


# ── market type from months of supply ──────────────────────────────────────
@pytest.mark.parametrize("mos,expected", [
    (2.0,  "Sellers"),
    (4.0,  "Sellers"),
    (4.1,  "Balanced"),
    (6.9,  "Balanced"),
    (7.0,  "Buyers"),
    (12.0, "Buyers"),
    (None, "Balanced"),
])
def test_market_type_from_mos(mos, expected):
    assert market_type_from_mos(mos) == expected


# ── arrow computation ──────────────────────────────────────────────────────
@pytest.mark.parametrize("pct,expected", [
    (15.0, "up_strong"),
    (5.0,  "up"),
    (0.5,  "flat"),
    (-0.5, "flat"),
    (-5.0, "down"),
    (-15.0,"down_strong"),
    (None, "flat_learning"),
])
def test_arrow_from_delta(pct, expected):
    assert _arrow_from_delta(pct) == expected
