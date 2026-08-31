"""
Provincial sub-neighbourhood coverage — non-farm BC (Feb 2026).

Purpose
-------
Doug's licensed practice area is Greater Vancouver + Fraser Valley + Sea-to-Sky
(the "farm"). Sub-neighbourhoods inside the farm live in
`services.bc_sub_neighbourhoods.BC_SUB_NEIGHBOURHOODS` (394 entries) and use
Doug's normal money-page CTAs.

For sub-neighbourhoods OUTSIDE the farm (Kelowna, Kamloops, Victoria, Prince
George, Nelson, Fernie, and every other BC community Doug does NOT transact
in), we want:

  1. SEO / AEO coverage so BC-wide search traffic finds the site.
  2. A 100% compliant experience: page must NOT solicit — instead it routes
     the visitor to /referral-request via the exact canonical language used
     everywhere else on the site:

         "As a smaller BC community, {name} falls outside the Greater
          Vancouver, Fraser Valley, and Sea-to-Sky Corridor focus areas —
          but that doesn't mean we can't help you get connected! 🐾 Would
          you like to be connected with a licensed REALTOR® in that area
          through Doug's referral network?"

     with a "Referral REALTOR® link" CTA pointing at /referral-request
     pre-filled with the city/neighbourhood.

Compliance
----------
- BCFSA: no solicitation for services Doug doesn't actively provide; every
  page names his licence + brokerage but immediately routes to referral.
- CREA (Article 16): "Not intended to solicit or induce an agreement already
  in place" boilerplate (already sitewide).
- GVR / FVREB / RASTS trademarks: preserved as usual.
- CASL: no lead-capture forms on these pages — CTAs route to /referral-request
  which itself carries the CASL consent flow.
- PIPA: zero personal information collected on the page.

Data source
-----------
`/app/backend/data/bc_neighborhoods.json` — 48-city curated map. We subtract
the 28 farm cities already in `BC_SUB_NEIGHBOURHOODS` and cache the residue.
"""
from __future__ import annotations
import json
import re
from functools import lru_cache
from pathlib import Path


_DATA_PATH = Path("/app/backend/data/bc_neighborhoods.json")


def _slug(x: str) -> str:
    """Same slug rule the API uses — lowercase, non-alnum → dash, trim."""
    return re.sub(r"[^a-z0-9]+", "-", (x or "").lower()).strip("-")


@lru_cache(maxsize=1)
def get_provincial_extras() -> dict[str, list[str]]:
    """Return {city_slug: [sub_nhb_name, ...]} for cities OUTSIDE the farm.

    The cache is process-wide — the underlying JSON file is static seed data
    that we ship with the repo, so recomputing on every request is wasted
    work. Callers that mutate the returned list will pollute the cache —
    treat the return value as read-only.
    """
    try:
        raw = json.loads(_DATA_PATH.read_text())
    except Exception:
        return {}
    # Farm slugs — imported lazily so this module can be reused in
    # environments that don't need the farm map for anything else.
    try:
        from services.bc_sub_neighbourhoods import BC_SUB_NEIGHBOURHOODS
        farm_slugs = set(BC_SUB_NEIGHBOURHOODS.keys())
    except Exception:
        farm_slugs = set()
    out: dict[str, list[str]] = {}
    for city, subs in raw.items():
        c_slug = _slug(city)
        if not c_slug or c_slug in farm_slugs:
            continue
        if not isinstance(subs, list) or not subs:
            continue
        out[c_slug] = subs
    return out


def is_farm_slug(city_slug: str) -> bool:
    """True if the given community slug is inside Doug's farm."""
    try:
        from services.bc_sub_neighbourhoods import BC_SUB_NEIGHBOURHOODS
        return city_slug in BC_SUB_NEIGHBOURHOODS
    except Exception:
        return False
