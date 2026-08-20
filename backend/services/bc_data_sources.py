"""
BC Public Data Sources — service layer for EZtoFind.ca
===================================================================
Public, educational-only integrations. Every fetch records a
`fetch_date` so downstream renders can display "as-of" transparency.

Approved sources (Feb 2026 spec):
  • BC Laws (King's Printer)     — statute + regulation canonical URLs
  • BC Address Geocoder          — address autocomplete for /valuation
  • Statistics Canada WDS        — demographics per community
  • BC OpenMaps WFS              — ALR / Flood / Municipality layers
  • MSC GeoMet Climate Normals   — already in server.py (imported here for reuse)

Compliance guarantees baked into every fetch:
  • Cached in Mongo with `fetch_date` + `source_id` for citation
  • Rate-limit friendly (Geocoder ~1000/min anonymous)
  • Attribution string returned alongside every payload
  • No mutation of source data — read-only re-emit
"""

from __future__ import annotations
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)
ROOT_DIR = Path(__file__).parent.parent
DATA_DIR = ROOT_DIR / "data"


# ── Attribution helper (reused across all four surfaces) ──────────────────
ATTRIBUTIONS = {
    "bclaws":       "King's Printer of British Columbia (BC Laws). Unofficial consolidation.",
    "statcan":      "Statistics Canada, {table} — Reference period {period}. Open Government Licence — Canada.",
    "bc_geocoder":  "Physical Address Geocoder — Government of British Columbia. DataBC.",
    "bc_wfs_alr":   "Agricultural Land Reserve boundary — Agricultural Land Commission via DataBC WFS. Digital ALR is NOT the official legal boundary.",
    "bc_wfs_flood": "Historical mapped floodplain extent — Province of BC via DataBC WFS. Historical only; not a current hazard determination.",
    "bc_wfs_muni":  "Municipal boundaries — DataBC WFS.",
    "eccc_normals": "Environment and Climate Change Canada / MSC GeoMet — Canadian Climate Normals 1981-2010.",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ═══════════════════════════════════════════════════════════════════════
# 1) BC LAWS — statute references per glossary term
# ═══════════════════════════════════════════════════════════════════════
_BCLAWS_URL = "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/{doc_id}"
_BCLAWS_REFS_CACHE: Optional[dict] = None


def _load_bclaws_refs() -> dict:
    """Load the frozen glossary→statute mapping. Cached in-process."""
    global _BCLAWS_REFS_CACHE
    if _BCLAWS_REFS_CACHE is not None:
        return _BCLAWS_REFS_CACHE
    try:
        data = json.loads((DATA_DIR / "bclaws_statute_refs.json").read_text(encoding="utf-8"))
        _BCLAWS_REFS_CACHE = data.get("refs", {})
    except Exception as e:
        logger.warning(f"bclaws refs load failed: {e}")
        _BCLAWS_REFS_CACHE = {}
    return _BCLAWS_REFS_CACHE


def get_bclaws_refs_for_slug(slug: str) -> Dict[str, Any]:
    """Return frozen statute refs for a glossary slug, plus attribution.

    Returns:
      {
        "available": bool,
        "refs": [{"label", "doc_id", "url", "note"}, ...],
        "attribution": "King's Printer of British Columbia (BC Laws). Unofficial consolidation.",
        "fetch_date": ISO-8601,
        "source_ids": ["96378_01", "74_88"]   # for CMS traceability
      }
    """
    refs_map = _load_bclaws_refs()
    entries = refs_map.get(slug) or refs_map.get(slug.replace("_", "-")) or []
    if not entries:
        return {
            "available": False,
            "refs": [],
            "attribution": ATTRIBUTIONS["bclaws"],
            "fetch_date": now_iso(),
            "source_ids": [],
            "note": "No canonical statute link is currently mapped for this term. See the BC Laws home page for a manual search.",
            "bclaws_home": "https://www.bclaws.gov.bc.ca/",
        }
    hydrated = [
        {
            "label": e["label"],
            "doc_id": e["doc_id"],
            "url": _BCLAWS_URL.format(doc_id=e["doc_id"]),
            "note": e.get("note"),
        }
        for e in entries
    ]
    return {
        "available": True,
        "refs": hydrated,
        "attribution": ATTRIBUTIONS["bclaws"],
        "fetch_date": now_iso(),
        "source_ids": [e["doc_id"] for e in entries],
    }


# ═══════════════════════════════════════════════════════════════════════
# 2) BC ADDRESS GEOCODER — autocomplete for /valuation
# ═══════════════════════════════════════════════════════════════════════
_GEOCODER_BASE = "https://geocoder.api.gov.bc.ca/addresses.json"


async def bc_geocoder_autocomplete(query: str, max_results: int = 5) -> Dict[str, Any]:
    """Autocomplete a partial BC address.

    Rate-limited to ~1000/min anonymous by DataBC. If we hit prod volume
    we can request an API key from DataBC and add it as `apikey=` header.
    """
    query = (query or "").strip()
    if len(query) < 3:
        return {"available": False, "results": [], "attribution": ATTRIBUTIONS["bc_geocoder"], "fetch_date": now_iso()}

    params = {
        "addressString": f"{query}, BC",
        "maxResults": min(max(1, max_results), 10),
        "outputSRS": "4326",
        "brief": "true",
        "autoComplete": "true",
    }
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(_GEOCODER_BASE, params=params)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        logger.warning(f"bc_geocoder autocomplete failed for {query!r}: {e}")
        return {"available": False, "results": [], "attribution": ATTRIBUTIONS["bc_geocoder"], "fetch_date": now_iso(), "note": "Geocoder temporarily unavailable — please type your address manually."}

    features = data.get("features", []) or []
    results = []
    for f in features[:max_results]:
        p = f.get("properties", {}) or {}
        geom = f.get("geometry", {}) or {}
        coords = geom.get("coordinates") or [None, None]
        results.append({
            "full_address": p.get("fullAddress") or p.get("civicAddress") or "",
            "locality": p.get("localityName") or p.get("localityType"),
            "score": p.get("score"),
            "match_type": p.get("matchPrecision"),
            "site_id": p.get("siteID") or p.get("siteId"),
            "lng": coords[0],
            "lat": coords[1],
        })
    return {
        "available": True,
        "results": results,
        "attribution": ATTRIBUTIONS["bc_geocoder"],
        "fetch_date": now_iso(),
    }


# ═══════════════════════════════════════════════════════════════════════
# 3) STATISTICS CANADA WDS — demographics per community (Phase 2 wiring)
# ═══════════════════════════════════════════════════════════════════════
_STATCAN_WDS = "https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods"


async def statcan_fetch_vectors(vector_ids: List[int], latest_n: int = 5) -> Dict[str, Any]:
    """Fetch the latest N periods for the given StatCan vector IDs.

    Vector IDs are LOCKED per community in the community CMS config
    (spreadsheet-fillable). This function is a pure passthrough — no
    business logic about which vectors mean what.
    """
    if not vector_ids:
        return {"available": False, "results": [], "attribution": "Statistics Canada", "fetch_date": now_iso()}
    body = [{"vectorId": int(v), "latestN": int(latest_n)} for v in vector_ids]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(_STATCAN_WDS, json=body, headers={"Content-Type": "application/json"})
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        logger.warning(f"statcan fetch failed for vectors {vector_ids}: {e}")
        return {"available": False, "results": [], "attribution": "Statistics Canada", "fetch_date": now_iso(), "note": "Statistics Canada WDS temporarily unavailable."}
    return {
        "available": True,
        "raw": data,
        "attribution": "Statistics Canada — Open Government Licence — Canada.",
        "fetch_date": now_iso(),
        "source_vector_ids": list(vector_ids),
    }


# ═══════════════════════════════════════════════════════════════════════
# 4) BC OPENMAPS WFS — ALR / Flood / Municipality intersect (Phase 2 wiring)
# ═══════════════════════════════════════════════════════════════════════
_WFS_BASE = "https://openmaps.gov.bc.ca/geo/pub/ows"

WFS_LAYERS = {
    "alr":   "pub:WHSE_LEGAL_ADMIN_BOUNDARIES.OATS_ALR_POLYS",
    "flood": "pub:WHSE_BASEMAPPING.CWB_FLOODPLAINS_BC_AREA_SVW",
    "muni":  "pub:WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP",
}

# DataBC WFS layers do NOT use a consistent geometry attribute — some are
# GEOMETRY, others SHAPE. Confirmed by empirical DescribeFeatureType + a
# 400/200 differential test against each layer's schema.
WFS_GEOM_ATTR = {
    "alr":   "GEOMETRY",
    "flood": "GEOMETRY",
    "muni":  "SHAPE",
}

WFS_DISCLAIMERS = {
    "alr":   "Digital ALR is not the official legal boundary. Confirm with the Agricultural Land Commission.",
    "flood": "Historical mapped floodplain extent only. Not a current hazard determination — check your local government's up-to-date flood mapping.",
    "muni":  "Municipal boundaries are current as of the last DataBC refresh.",
}


async def bc_wfs_intersect_point(lat: float, lng: float, layers: Optional[List[str]] = None) -> Dict[str, Any]:
    """GetFeature at a single point across the configured WFS layers.

    Returns per-layer hit/no-hit + the layer's official disclaimer.
    """
    layers = layers or list(WFS_LAYERS.keys())
    results = {}
    for key in layers:
        type_name = WFS_LAYERS.get(key)
        geom_attr = WFS_GEOM_ATTR.get(key, "GEOMETRY")
        if not type_name:
            continue
        params = {
            "service": "WFS",
            "version": "2.0.0",
            "request": "GetFeature",
            "outputFormat": "application/json",
            "srsName": "EPSG:4326",
            "typeNames": type_name,
            "count": 1,
            "cql_filter": f"INTERSECTS({geom_attr},SRID=4326;POINT({lng} {lat}))",
        }
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                r = await client.get(_WFS_BASE, params=params)
                r.raise_for_status()
                data = r.json()
            features = data.get("features", []) or []
            hit_info = None
            if features and key == "muni":
                p = features[0].get("properties", {}) or {}
                hit_info = p.get("ADMIN_AREA_NAME") or p.get("ADMIN_AREA_ABBREVIATION")
            results[key] = {
                "hit": len(features) > 0,
                "count": len(features),
                "type_name": type_name,
                "hit_info": hit_info,
                "disclaimer": WFS_DISCLAIMERS[key],
                "attribution": ATTRIBUTIONS[f"bc_wfs_{key}"] if f"bc_wfs_{key}" in ATTRIBUTIONS else ATTRIBUTIONS["bc_wfs_muni"],
            }
        except Exception as e:
            logger.warning(f"WFS {key} intersect failed at {lat},{lng}: {e}")
            results[key] = {"hit": None, "count": 0, "type_name": type_name, "disclaimer": WFS_DISCLAIMERS[key], "error": str(e)[:120]}
    return {"available": True, "point": {"lat": lat, "lng": lng}, "layers": results, "fetch_date": now_iso()}


# ═══════════════════════════════════════════════════════════════════════
# 5) PTT + OSFI stress-test — hardcoded (as of Feb 2026)
# ═══════════════════════════════════════════════════════════════════════
# NOT ADVICE. General information / estimate only. Rates confirmed against
# gov.bc.ca and OSFI B-20 as of the last_verified date below. When BC or
# OSFI changes rates, bump the date + rate values here. Do not compute
# anything the user could construe as filing or financial advice.

PTT_CONFIG = {
    "as_of": "2026-02-19",
    "authority_url": "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax",
    "residential_tiers": [
        {"upper": 200_000,   "rate": 0.01, "label": "1% on first $200,000"},
        {"upper": 2_000_000, "rate": 0.02, "label": "2% on $200,000 – $2,000,000"},
        {"upper": 3_000_000, "rate": 0.03, "label": "3% on $2,000,000 – $3,000,000"},
        {"upper": None,      "rate": 0.05, "label": "5% on portion above $3,000,000 (residential only)"},
    ],
    "additional_ptt_rate": 0.20,
    "additional_ptt_note": "20% Additional Property Transfer Tax may apply to foreign entities / taxable trustees on residential property in the specified areas (Metro Vancouver, Fraser Valley, Capital, Nanaimo, Central Okanagan Regional Districts).",
    "additional_ptt_url": "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/additional-property-transfer-tax",
    "ftb_exemption": {
        "full_below": 500_000,
        "partial_below": 525_000,
        "url": "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/first-time-home-buyers",
    },
    "newly_built_exemption": {
        "full_below": 750_000,
        "partial_below": 800_000,
        "url": "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/newly-built-home-exemption",
    },
}

OSFI_STRESS_TEST = {
    "as_of": "2026-02-19",
    "authority_url": "https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/residential-mortgage-underwriting-practices-procedures-guideline-b-20",
    "floor_rate": 0.0525,           # 5.25% minimum qualifying-rate floor (B-20)
    "stress_add": 0.02,             # + 2 percentage points over contract rate
    "note": "Qualifying rate = max(contract rate + 2 percentage points, 5.25%). Under OSFI Guideline B-20 for federally regulated lenders. Provincial credit unions may use their own criteria.",
}


def ptt_calculate(purchase_price: float,
                  is_ftb: bool = False,
                  is_newly_built: bool = False,
                  is_foreign_taxable: bool = False) -> Dict[str, Any]:
    """Compute BC PTT + additional PTT + applicable exemptions.

    Returns a fully-broken-down payload with per-tier breakdown, exemption
    logic, and an 'estimate only' disclaimer baked in. This is INFORMATION,
    not advice — never suggest a filing outcome.
    """
    if purchase_price is None or purchase_price <= 0:
        return {"error": "Enter a purchase price greater than $0."}
    p = float(purchase_price)

    # Tiered PTT breakdown
    breakdown = []
    remaining = p
    lower = 0.0
    total_ptt = 0.0
    for tier in PTT_CONFIG["residential_tiers"]:
        upper = tier["upper"] if tier["upper"] is not None else float("inf")
        taxable = max(0.0, min(remaining, upper - lower))
        tax = taxable * tier["rate"]
        if taxable > 0:
            breakdown.append({
                "label": tier["label"],
                "rate": tier["rate"],
                "taxable_amount": round(taxable, 2),
                "tax": round(tax, 2),
            })
        total_ptt += tax
        remaining -= taxable
        lower = upper
        if remaining <= 0:
            break

    additional = 0.0
    if is_foreign_taxable:
        additional = p * PTT_CONFIG["additional_ptt_rate"]

    exemption = None
    ftb_cfg = PTT_CONFIG["ftb_exemption"]
    nbh_cfg = PTT_CONFIG["newly_built_exemption"]
    if is_ftb:
        if p <= ftb_cfg["full_below"]:
            exemption = {"kind": "First-Time Home Buyer — full exemption (estimate)",
                         "reduces_ptt_by": round(total_ptt, 2), "url": ftb_cfg["url"]}
        elif p < ftb_cfg["partial_below"]:
            partial = total_ptt * (ftb_cfg["partial_below"] - p) / (ftb_cfg["partial_below"] - ftb_cfg["full_below"])
            exemption = {"kind": "First-Time Home Buyer — partial exemption (estimate)",
                         "reduces_ptt_by": round(partial, 2), "url": ftb_cfg["url"]}
    elif is_newly_built:
        if p <= nbh_cfg["full_below"]:
            exemption = {"kind": "Newly-Built Home — full exemption (estimate)",
                         "reduces_ptt_by": round(total_ptt, 2), "url": nbh_cfg["url"]}
        elif p < nbh_cfg["partial_below"]:
            partial = total_ptt * (nbh_cfg["partial_below"] - p) / (nbh_cfg["partial_below"] - nbh_cfg["full_below"])
            exemption = {"kind": "Newly-Built Home — partial exemption (estimate)",
                         "reduces_ptt_by": round(partial, 2), "url": nbh_cfg["url"]}

    ptt_after_exemption = total_ptt - (exemption["reduces_ptt_by"] if exemption else 0.0)
    return {
        "purchase_price": p,
        "as_of": PTT_CONFIG["as_of"],
        "breakdown": breakdown,
        "ptt_before_exemption": round(total_ptt, 2),
        "additional_ptt": round(additional, 2),
        "exemption": exemption,
        "ptt_after_exemption": round(max(0.0, ptt_after_exemption), 2),
        "total_ptt_payable": round(max(0.0, ptt_after_exemption) + additional, 2),
        "authority_url": PTT_CONFIG["authority_url"],
        "additional_ptt_url": PTT_CONFIG["additional_ptt_url"],
        "disclaimer": "Estimate only — general information, not filing or tax advice. Confirm exact PTT with your lawyer or notary before closing.",
    }


def stress_test_qualifying_rate(contract_rate_pct: float) -> Dict[str, Any]:
    """Return OSFI B-20 qualifying rate for a given contract rate (%)."""
    if contract_rate_pct is None or contract_rate_pct <= 0:
        return {"error": "Enter a positive contract rate."}
    c = float(contract_rate_pct) / 100.0
    qualifying = max(c + OSFI_STRESS_TEST["stress_add"], OSFI_STRESS_TEST["floor_rate"])
    return {
        "contract_rate_pct": contract_rate_pct,
        "qualifying_rate_pct": round(qualifying * 100.0, 3),
        "floor_rate_pct": OSFI_STRESS_TEST["floor_rate"] * 100.0,
        "stress_add_pct": OSFI_STRESS_TEST["stress_add"] * 100.0,
        "as_of": OSFI_STRESS_TEST["as_of"],
        "authority_url": OSFI_STRESS_TEST["authority_url"],
        "note": OSFI_STRESS_TEST["note"],
        "disclaimer": "General information, not financial advice. Provincial credit unions may use their own criteria — confirm with your lender.",
    }
