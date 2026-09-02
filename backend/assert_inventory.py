"""
Build-time inventory-alignment assert.

Fails the build (non-zero exit) if any of these counts drift:

  - `sitemap-glossary.xml`      URL count  ==  /api/site/counts["glossary_terms"]
  - `sitemap-communities.xml`   URL count  ==  /api/site/counts["communities"]
  - `sitemap-neighbourhoods.xml` URL count ==  /api/site/counts["neighbourhood_pages"]
  - `sitemap-insights.xml`      URL count  ==  /api/site/counts["insight_pages"]
  - llms.txt / llms-full.txt / ai.json all reference the same numbers.

Also enforces the DDF® / CREA compliance rules:
  - Zero `/listing/` URLs anywhere in ANY sitemap child.
  - Zero `Crawl-Delay:` directives on `User-agent: *`.

Run:
    python3 -m backend.assert_inventory
Or from /app/backend:
    python3 assert_inventory.py

Exit codes:
    0  → all checks pass
    1  → one or more mismatches — see stderr for the offending count

This script is intentionally read-only. It never rewrites any file.
"""

import asyncio
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parent
FRONTEND_PUBLIC = ROOT.parent / "frontend" / "public"


def _count_urls(sitemap_path: Path) -> int:
    if not sitemap_path.exists():
        return -1
    return len(re.findall(r"<loc>", sitemap_path.read_text()))


def _find_listing_urls(sitemap_path: Path) -> int:
    if not sitemap_path.exists():
        return 0
    text = sitemap_path.read_text()
    # Match /listing/{key} URLs but NOT /listings (the search hub).
    return len(re.findall(r"<loc>[^<]*?/listing/[^<]*</loc>", text))


def _count_in_file(path: Path, needle: str) -> int:
    if not path.exists():
        return 0
    return path.read_text().count(needle)


async def _fetch_counts_from_backend() -> Dict[str, int]:
    """Compute the canonical counts directly from the backend helpers
    (does not require the FastAPI server to be running)."""
    sys.path.insert(0, str(ROOT))
    from server import (  # type: ignore
        _compute_neighbourhood_pages_count,
        _compute_insight_pages_count,
    )
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise RuntimeError("MONGO_URL / DB_NAME must be set in the environment.")
    client = AsyncIOMotorClient(mongo_url)
    # Re-bind server.db to this client so the helper can read live counts.
    import server  # type: ignore
    server.db = client[db_name]
    try:
        glossary_terms = await server.db.glossary.count_documents({})
        communities = sum(
            len(v) for v in json.loads(
                (ROOT / "data" / "communities_seed.json").read_text()
            ).values()
        )
        neighbourhood_pages = await _compute_neighbourhood_pages_count()
        insight_pages = _compute_insight_pages_count()
    finally:
        client.close()
    return {
        "glossary_terms":       glossary_terms,
        "communities":          communities,
        "neighbourhood_pages":  neighbourhood_pages,
        "insight_pages":        insight_pages,
    }


def _run_checks(canonical: Dict[str, int]) -> Tuple[bool, List[str]]:
    """Return (all_pass, error_lines)."""
    errors: List[str] = []

    # 1. Sitemap URL counts must match canonical counts.
    checks = [
        ("sitemap-glossary.xml",       "glossary_terms"),
        ("sitemap-communities.xml",    "communities"),
        ("sitemap-neighbourhoods.xml", "neighbourhood_pages"),
        ("sitemap-insights.xml",       "insight_pages"),
    ]
    for filename, count_key in checks:
        actual = _count_urls(FRONTEND_PUBLIC / filename)
        expected = canonical.get(count_key, -1)
        if actual != expected:
            errors.append(
                f"[SITEMAP] {filename}: {actual} URLs, but /api/site/counts "
                f"['{count_key}'] = {expected}"
            )

    # 2. Zero /listing/ URLs in ANY sitemap child.
    for sm in FRONTEND_PUBLIC.glob("sitemap*.xml"):
        n = _find_listing_urls(sm)
        if n > 0:
            errors.append(
                f"[COMPLIANCE] {sm.name}: {n} `/listing/{{id}}` URL(s) "
                f"present — CREA DDF® forbids submitting per-listing pages."
            )

    # 3. Zero global Crawl-Delay on User-agent: *.
    robots = FRONTEND_PUBLIC / "robots.txt"
    if robots.exists():
        # Parse: only fail if a Crawl-Delay follows the wildcard user-agent
        # (individual bot Crawl-Delay would be intentional if ever added).
        in_star = False
        for raw in robots.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.lower().startswith("user-agent:"):
                agent = line.split(":", 1)[1].strip()
                in_star = (agent == "*")
                continue
            if in_star and line.lower().startswith("crawl-delay:"):
                errors.append(
                    "[COMPLIANCE] robots.txt: `Crawl-Delay:` present on "
                    "`User-agent: *` — Task 10 requires this to be removed."
                )
                break

    # 4. The public-facing count strings in llms.txt / llms-full.txt / ai.json
    # must reference the same canonical numbers.
    marker_targets = [
        (FRONTEND_PUBLIC / "llms.txt",
         [f"{canonical['glossary_terms']} glossary",
          f"{canonical['communities']} BC communities",
          f"{canonical['neighbourhood_pages']} sub-neighbourhood"]),
        (FRONTEND_PUBLIC / "llms-full.txt",
         [f"{canonical['glossary_terms']} glossary",
          f"{canonical['neighbourhood_pages']} sub-neighbourhood"]),
        (FRONTEND_PUBLIC / ".well-known" / "ai.json",
         [f"{canonical['glossary_terms']} statute-cited glossary",
          f"{canonical['neighbourhood_pages']} sub-neighbourhood"]),
    ]
    for path, needles in marker_targets:
        if not path.exists():
            errors.append(f"[MISSING] {path.name} not found.")
            continue
        for n in needles:
            if _count_in_file(path, n) == 0:
                errors.append(
                    f"[COUNT DRIFT] {path.name}: expected phrase '{n}' "
                    "not found — llms/ai file is stale vs the canonical "
                    "counts. Rebuild it."
                )

    return (len(errors) == 0), errors


async def _main() -> int:
    print("EZtoFind.ca inventory-alignment check")
    print("=" * 60)
    canonical = await _fetch_counts_from_backend()
    print("Canonical counts (single source of truth):")
    for k, v in canonical.items():
        print(f"  {k:24s} = {v}")
    print()

    ok, errors = _run_checks(canonical)
    if ok:
        print("✅ ALL INVENTORY CHECKS PASSED")
        print()
        print("  * Every child sitemap URL count matches the canonical count")
        print("  * Zero /listing/ URLs in any sitemap (CREA DDF® compliant)")
        print("  * No global Crawl-Delay on User-agent: *")
        print("  * llms.txt / llms-full.txt / ai.json reference identical numbers")
        return 0

    print("❌ INVENTORY MISMATCH — {} error(s) found:".format(len(errors)))
    for e in errors:
        print("   • " + e, file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(_main()))
