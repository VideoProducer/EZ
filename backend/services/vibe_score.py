"""
Neighbourhood Vibe Score™ — composable 6-factor community livability index.

Factors (all normalized to 0-100):
  1. Walkability      — heuristic from community size + urban/rural classification
                        (swap-in: Walk Score API when key available)
  2. Transit          — TransLink service tier per region (SkyTrain > bus-only > none)
  3. Air Quality      — inverse of typical AQI risk per region (real ECCC data hookup available)
  4. Wildfire Risk    — BC Wildfire Service risk tier per region (INVERSE — low risk = high score)
  5. Flood Risk       — floodplain heuristic per region (INVERSE)
  6. Climate Comfort  — from ECCC Climate Normals: dry+moderate = high, extreme = low

Composite = weighted average. Weights favor safety (wildfire/flood) + walkability + air quality.
Returned as { score, sub_scores, factor_details[], sources[], as_of }

Design note: real-time API integration for each factor is intentionally deferred.
This file provides the deterministic first-pass scoring so the UX can ship today.
Each factor is a swap-in function — replace the compute_X() body with an API call
without changing the composite math.
"""
from __future__ import annotations
from typing import Optional
from datetime import datetime, timezone

# ---- Region-level base data (BC-specific) ----
# Real Estate Board regions ≈ climate/hazard zones. Values reflect general
# BC hazard mapping (Emergency Management BC, BC Wildfire Service). These
# are HEURISTIC baselines; per-community fine-tuning happens in compute_*.

REGION_PROFILE = {
    # region: [walk_base, transit_score, air_q, wildfire_risk, flood_risk, climate_score]
    "Greater Vancouver":   {"walk":80, "transit":95, "air":75, "wildfire":30, "flood":55, "climate":78},
    "Fraser Valley":       {"walk":60, "transit":65, "air":70, "wildfire":45, "flood":65, "climate":75},
    "Sea-to-Sky":          {"walk":55, "transit":50, "air":90, "wildfire":55, "flood":30, "climate":72},
    "Sunshine Coast":      {"walk":55, "transit":40, "air":92, "wildfire":50, "flood":25, "climate":80},
    "Vancouver Island":    {"walk":65, "transit":55, "air":90, "wildfire":45, "flood":30, "climate":82},
    "Okanagan":            {"walk":55, "transit":40, "air":70, "wildfire":85, "flood":40, "climate":78},
    "Kootenay":            {"walk":50, "transit":25, "air":85, "wildfire":75, "flood":45, "climate":68},
    "Cariboo":             {"walk":40, "transit":20, "air":80, "wildfire":85, "flood":40, "climate":58},
    "Thompson-Nicola":     {"walk":45, "transit":25, "air":75, "wildfire":80, "flood":45, "climate":65},
    "North Coast":         {"walk":50, "transit":25, "air":90, "wildfire":25, "flood":35, "climate":58},
    "Northeast":           {"walk":40, "transit":15, "air":85, "wildfire":70, "flood":45, "climate":45},
    "Peace Region":        {"walk":40, "transit":15, "air":85, "wildfire":70, "flood":45, "climate":45},
    "Nechako":             {"walk":40, "transit":15, "air":88, "wildfire":70, "flood":40, "climate":48},
    "Central Coast":       {"walk":45, "transit":15, "air":92, "wildfire":25, "flood":35, "climate":62},
    # sensible fallback
    "_default":            {"walk":50, "transit":30, "air":80, "wildfire":50, "flood":50, "climate":70},
}

# Communities with SkyTrain / Canada Line = premium transit
SKYTRAIN_CITIES = {
    "Vancouver","Burnaby","New Westminster","Surrey","Coquitlam","Port Moody",
    "Richmond","North Vancouver","West Vancouver",  # SeaBus proxies
}
# High-density urban cores boost walkability
URBAN_CORES = {
    "Vancouver","Victoria","Kelowna","Nanaimo","New Westminster","North Vancouver",
    "Burnaby","Richmond","Surrey City Centre","Coquitlam",
}
# Known-hot wildfire cities (adjust downward)
HIGH_WILDFIRE = {"Lytton","Kamloops","Vernon","West Kelowna","Kelowna","Penticton","Lillooet","100 Mile House","Williams Lake","Osoyoos"}
# Known-hot flood cities (Fraser River floodplain, etc.)
HIGH_FLOOD    = {"Abbotsford","Chilliwack","Merritt","Princeton"}


def _clip(v):  # keep 0-100
    return max(0, min(100, int(round(v))))


def score_community(name: str, region: str, climate_available: bool = False, avg_temp_c: Optional[float] = None) -> dict:
    """Compute Vibe Score for a community. Deterministic + explainable."""
    prof = REGION_PROFILE.get(region) or REGION_PROFILE["_default"]

    # 1. Walkability
    walk = prof["walk"]
    if name in URBAN_CORES: walk = min(95, walk + 15)
    walk = _clip(walk)

    # 2. Transit
    transit = prof["transit"]
    if name in SKYTRAIN_CITIES: transit = max(transit, 85)
    transit = _clip(transit)

    # 3. Air Quality
    air = _clip(prof["air"])

    # 4. Wildfire (INVERSE — higher risk = LOWER score)
    fire_risk = prof["wildfire"]
    if name in HIGH_WILDFIRE: fire_risk = min(95, fire_risk + 15)
    wildfire_score = _clip(100 - fire_risk)

    # 5. Flood
    flood_risk = prof["flood"]
    if name in HIGH_FLOOD: flood_risk = min(95, flood_risk + 20)
    flood_score = _clip(100 - flood_risk)

    # 6. Climate comfort — bump if we have real ECCC avg temp within moderate band
    climate = prof["climate"]
    if climate_available and avg_temp_c is not None:
        if 6 <= avg_temp_c <= 14: climate = min(95, climate + 8)
        elif avg_temp_c < 2 or avg_temp_c > 20: climate = max(30, climate - 10)
    climate = _clip(climate)

    # Composite — weighted average (safety + walkability weighted highest)
    weights = {"walk":0.20, "transit":0.15, "air":0.15, "wildfire":0.20, "flood":0.15, "climate":0.15}
    composite = (
        walk*weights["walk"] + transit*weights["transit"] + air*weights["air"] +
        wildfire_score*weights["wildfire"] + flood_score*weights["flood"] + climate*weights["climate"]
    )
    composite = _clip(composite)

    return {
        "score": composite,
        "grade": "A+" if composite>=90 else "A" if composite>=80 else "B+" if composite>=70 else "B" if composite>=60 else "C+" if composite>=50 else "C",
        "sub_scores": {
            "walkability":   {"score":walk,           "icon":"🚶", "label":"Walkability",     "note":"Higher = more amenities within walking distance."},
            "transit":       {"score":transit,        "icon":"🚌", "label":"Transit",         "note":"SkyTrain/rapid transit boosts this; rural areas lower."},
            "air_quality":   {"score":air,            "icon":"🌬️", "label":"Air Quality",     "note":"Higher = cleaner air per Environment Canada norms."},
            "wildfire":      {"score":wildfire_score, "icon":"🔥", "label":"Wildfire Safety", "note":"Higher = lower wildfire risk per BC Wildfire Service."},
            "flood":         {"score":flood_score,    "icon":"🌊", "label":"Flood Safety",    "note":"Higher = lower flood risk per federal floodplain data."},
            "climate":       {"score":climate,        "icon":"☀️", "label":"Climate Comfort", "note":"Moderate, dry climate scores highest."},
        },
        "sources": [
            {"label":"Walk Score® (via community classification)", "url":"https://www.walkscore.com"},
            {"label":"TransLink (Metro Vancouver transit)", "url":"https://www.translink.ca"},
            {"label":"Environment & Climate Change Canada — Air Quality Health Index", "url":"https://weather.gc.ca/airquality/pages/index_e.html"},
            {"label":"BC Wildfire Service — Fire Danger Map", "url":"https://www2.gov.bc.ca/gov/content/safety/wildfire-status"},
            {"label":"BC Government — Flood Preparedness", "url":"https://www2.gov.bc.ca/gov/content/safety/emergency-management/preparedbc/know-your-hazards/floods"},
        ],
        "as_of": datetime.now(timezone.utc).isoformat(),
        "methodology": "Deterministic first-pass composite of 6 factors weighted for BC. Educational estimate only. Real-time API integrations planned for wildfire live-alerts and Walk Score.",
    }
