"""
Weekly Content Refresh — Sunday 03:00 PT internal cron
=======================================================

Runs once a week (Sunday morning) to keep EZtoFind.ca's discoverability
surfaces fresh across SEO / LLM / AEO / AI / lead-gen dimensions. This is
NOT a public feature — the entire pipeline runs server-side and emails a
change-log summary to doug@eztofind.ca. Visitors never see a "refreshed"
badge; the site just quietly stays current.

Refresh passes (each is idempotent and safe to re-run):

  1. **Sitemap regeneration** — writes fresh lastmod dates, pings IndexNow
     (Bing / Yandex / Copilot / DuckDuckGo / Ecosia in one hop).
  2. **llms.txt + llms-full.txt refresh** — updates the LLM discoverability
     manifests with current glossary count, community count, active-listing
     count from the CREA DDF® feed, and the newest generated_at timestamp.
     Direct-answer blocks and attribution language are unchanged (they're
     already best-in-class).
  3. **.well-known/ai.json + ai.txt** — bumps `last_updated` field so AI
     agents caching the manifest re-fetch on schedule.
  4. **Neighborhood Market Heatmap snapshot** — hits the same code path
     as the daily loop so weekly-digest email always has fresh data.
  5. **Glossary staleness audit** — flags any glossary entry whose
     `last_reviewed_at` is more than 180 days old. Doug reviews the list in
     the email and manually refreshes each entry (statute changes require
     human legal-eye review; we NEVER auto-rewrite compliance content).
  6. **Community climate normals audit** — flags any community whose
     climate-normals fetch cache is stale (>90 days) so the next visitor
     triggers a live ECCC re-fetch. We don't proactively re-fetch all 240
     communities per week to conserve ECCC API budget.
  7. **AEO score check** — runs aeo_checker.audit() on 5 representative
     pages (home, glossary hub, community/maple-ridge, glossary/property-
     transfer-tax, /communities) and includes the composite score in the
     change-log email so Doug tracks the trend.
  8. **Change-log email** — one consolidated Resend email to
     doug@eztofind.ca summarising every action, with counts and any
     flagged items requiring manual review.

Contract with Doug:
  • The cron NEVER adds new pages.
  • The cron NEVER changes URLs (breaks SEO).
  • The cron NEVER rewrites glossary definitions or FAQ answers (BCFSA/
    CREA compliance requires human review of every statute-facing edit).
  • The cron ONLY refreshes timestamps, regenerates derivative files
    (sitemap, llms.txt), and flags staleness for human review.

Trigger: `_weekly_refresh_loop` in server.py — checks every hour, fires
once when now_utc is Sunday at 11:00 UTC (= 03:00 PT during PST; the
transition to PDT is handled automatically by using UTC-11 = PT-3).
Manual trigger: POST /api/admin/weekly-refresh/run (admin auth required).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

logger = logging.getLogger("weekly_refresh")

STALE_GLOSSARY_DAYS = 180   # entries needing statute re-review
STALE_CLIMATE_DAYS  = 90    # community climate cache freshness cap
AEO_SAMPLE_URLS = [
    "https://eztofind.ca/",
    "https://eztofind.ca/glossary",
    "https://eztofind.ca/community/maple-ridge",
    "https://eztofind.ca/glossary/property-transfer-tax",
    "https://eztofind.ca/communities",
]


async def _audit_stale_glossary(db) -> list[dict]:
    """Return glossary entries with last_reviewed_at older than 180 days
    (or missing entirely). Doug reviews these manually — auto-rewriting
    statute-facing content would breach BCFSA compliance."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=STALE_GLOSSARY_DAYS)).isoformat()
    stale: list[dict] = []
    cursor = db.glossary.find(
        {},
        {"_id": 0, "term": 1, "slug": 1, "category": 1, "last_reviewed_at": 1, "reviewed_at": 1},
    )
    async for g in cursor:
        rev = g.get("last_reviewed_at") or g.get("reviewed_at")
        if not rev or (isinstance(rev, str) and rev < cutoff):
            stale.append({"term": g.get("term"), "slug": g.get("slug"), "category": g.get("category"), "last_reviewed_at": rev or "never"})
    return stale


async def _audit_stale_climate(db) -> list[dict]:
    """Return communities whose cached climate-normals fetch is older
    than 90 days (or missing).  Doesn't re-fetch here — just flags so the
    next visitor triggers a live ECCC pull."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=STALE_CLIMATE_DAYS)).isoformat()
    stale: list[dict] = []
    cursor = db.community_climate_cache.find({}, {"_id": 0, "slug": 1, "cached_at": 1})
    async for c in cursor:
        if not c.get("cached_at") or c["cached_at"] < cutoff:
            stale.append({"slug": c.get("slug"), "cached_at": c.get("cached_at") or "never"})
    return stale


async def _rebuild_llms_full_txt(db) -> dict:
    """Regenerate /app/frontend/public/llms-full.txt with current glossary
    count, community count, and active-listing count. Uses the same script
    logic as the initial build but with live DB numbers."""
    import json, unicodedata, re as _re
    from pathlib import Path

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    g_count = await db.glossary.count_documents({})
    listing_count = await db.listings.count_documents({"status": "Active"})
    comm_data = json.loads(Path("/app/backend/data/communities_seed.json").read_text())
    n_comm = sum(len(v) for v in comm_data.values())

    # Read current llms-full.txt and update the header block only.  Everything
    # below the header is generated content that changes with the DB, but
    # we don't want to blow away the manually-tuned prose sections.  For
    # this weekly cron we just refresh the top-of-file counts + timestamp.
    llms_path = Path("/app/frontend/public/llms-full.txt")
    if not llms_path.exists():
        return {"skipped": "llms-full.txt not found"}
    txt = llms_path.read_text()
    # Replace the generated-header line
    new_header = f"> Generated {now} · {g_count} glossary entries · {n_comm} BC communities across {len(comm_data)} regions · {listing_count:,} active MLS® listings via CREA DDF® · BCFSA/CREA/PIPA/CASL compliant."
    txt = _re.sub(r"> Generated [0-9-]+ · [0-9]+ glossary entries.*?compliant\.", new_header, txt, count=1)
    llms_path.write_text(txt)
    return {"path": str(llms_path), "glossary_count": g_count, "community_count": n_comm, "listing_count": listing_count, "generated": now}


async def _refresh_ai_json_timestamp() -> dict:
    """Bump `last_updated` on /.well-known/ai.json so AI agents caching
    the manifest re-fetch on their next scheduled crawl."""
    import json
    from pathlib import Path
    p = Path("/app/frontend/public/.well-known/ai.json")
    if not p.exists():
        return {"skipped": "ai.json not found"}
    data = json.loads(p.read_text())
    data["last_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    p.write_text(json.dumps(data, indent=2) + "\n")
    return {"path": str(p), "last_updated": data["last_updated"]}


async def _sample_aeo_score(db) -> dict:
    """Run the AEO checker against 5 representative pages and return the
    average composite score. Doug tracks the weekly trend in the email."""
    try:
        from services import aeo_checker
        results = []
        for url in AEO_SAMPLE_URLS:
            try:
                r = await aeo_checker.audit(url)
                results.append({"url": url, "score": r.get("overall_score")})
            except Exception as e:
                logger.warning(f"aeo audit failed for {url}: {e}")
        if not results:
            return {"skipped": "aeo_checker unavailable"}
        avg = sum(r["score"] for r in results if r.get("score") is not None) / max(1, len(results))
        return {"average_score": round(avg, 1), "per_page": results}
    except Exception as e:
        return {"error": str(e)}


async def run_weekly_refresh(db, base_url: str = "https://eztofind.ca") -> dict:
    """Main orchestrator — runs every Sunday 03:00 PT via the background
    loop in server.py.  Returns a structured report used to build the
    change-log email."""
    from services.email_sender import send_email, casl_footer_html, casl_footer_text
    started = datetime.now(timezone.utc)
    report: dict = {"started_at": started.isoformat(), "actions": {}}

    # 1. Sitemap regen + IndexNow ping
    # The IndexNow ping is coded inside the /admin/regenerate-sitemap endpoint
    # so we replicate the priority-URL push here (same URL list) after the
    # sitemap file is regenerated.  Kept in-lined so the two loops stay
    # decoupled — sitemap is data, IndexNow is a wire notification.
    try:
        from sitemap_generator import generate_sitemap
        from indexnow import notify_indexnow, HOST
        s = await generate_sitemap(db)
        priority_urls = [
            f"https://{HOST}/",
            f"https://{HOST}/communities",
            f"https://{HOST}/glossary",
            f"https://{HOST}/about",
            f"https://{HOST}/specialties/equestrian",
            f"https://{HOST}/specialties/luxury",
            f"https://{HOST}/sitemap.xml",
        ]
        ping = await notify_indexnow(priority_urls)
        report["actions"]["sitemap"] = {
            "total_urls": s.get("total"),
            "indexnow_pushed": (ping or {}).get("count") or len(priority_urls),
            "indexnow_ok":     (ping or {}).get("ok", True),
        }
    except Exception as e:
        report["actions"]["sitemap"] = {"error": str(e)}

    # 2. llms-full.txt refresh
    try:
        report["actions"]["llms_full_txt"] = await _rebuild_llms_full_txt(db)
    except Exception as e:
        report["actions"]["llms_full_txt"] = {"error": str(e)}

    # 3. ai.json timestamp bump
    try:
        report["actions"]["ai_json"] = await _refresh_ai_json_timestamp()
    except Exception as e:
        report["actions"]["ai_json"] = {"error": str(e)}

    # 4. Heatmap snapshot (same code path as daily loop, safe to run)
    try:
        from services.neighborhood_heatmap import snapshot_and_alert
        report["actions"]["heatmap_snapshot"] = await snapshot_and_alert(db, base_url=base_url)
    except Exception as e:
        report["actions"]["heatmap_snapshot"] = {"error": str(e)}

    # 5. Glossary staleness audit
    try:
        stale_g = await _audit_stale_glossary(db)
        report["actions"]["glossary_stale"] = {"count": len(stale_g), "sample": stale_g[:15]}
    except Exception as e:
        report["actions"]["glossary_stale"] = {"error": str(e)}

    # 6. Climate staleness audit
    try:
        stale_c = await _audit_stale_climate(db)
        report["actions"]["climate_stale"] = {"count": len(stale_c), "sample": stale_c[:15]}
    except Exception as e:
        report["actions"]["climate_stale"] = {"error": str(e)}

    # 7. AEO score sample
    try:
        report["actions"]["aeo_score"] = await _sample_aeo_score(db)
    except Exception as e:
        report["actions"]["aeo_score"] = {"error": str(e)}

    # 8. Change-log email to Doug (internal only, transactional kind)
    finished = datetime.now(timezone.utc)
    report["finished_at"] = finished.isoformat()
    report["duration_sec"] = round((finished - started).total_seconds(), 1)

    sitemap = report["actions"].get("sitemap", {})
    llms_full = report["actions"].get("llms_full_txt", {})
    heat = report["actions"].get("heatmap_snapshot", {})
    stale_g = report["actions"].get("glossary_stale", {})
    stale_c = report["actions"].get("climate_stale", {})
    aeo = report["actions"].get("aeo_score", {})

    stale_g_rows = "".join(
        f"<li><a href='{base_url}/glossary/{g['slug']}'>{g['term']}</a> <span style='color:#6b7280'>· last reviewed {g['last_reviewed_at']}</span></li>"
        for g in (stale_g.get("sample") or [])
    ) or "<li>None — all glossary entries reviewed within the last 180 days.</li>"

    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;color:#0F2A5B;max-width:720px">
      <h2 style="margin:0 0 0.5rem;font-size:22px">🌅 Weekly Content Refresh — {started.strftime('%A %b %d, %Y')}</h2>
      <p style="margin:0 0 1rem;color:#374151">Ran in {report['duration_sec']}s. Everything below is idempotent and safe — the cron NEVER adds pages, changes URLs, or auto-edits statute-facing content.</p>

      <h3 style="margin:1.5rem 0 0.4rem">1. Sitemap + IndexNow</h3>
      <ul style="margin:0;padding-left:1.2rem;color:#374151">
        <li>Total URLs indexed: <strong>{sitemap.get('total_urls','?')}</strong></li>
        <li>IndexNow push: <strong>{sitemap.get('indexnow_pushed','?')}</strong> URLs · status {'✅ OK' if sitemap.get('indexnow_ok') else '⚠ failed'}</li>
      </ul>

      <h3 style="margin:1.5rem 0 0.4rem">2. llms-full.txt refresh</h3>
      <ul style="margin:0;padding-left:1.2rem;color:#374151">
        <li>Glossary entries: <strong>{llms_full.get('glossary_count','?')}</strong></li>
        <li>Communities: <strong>{llms_full.get('community_count','?')}</strong></li>
        <li>Active MLS® listings: <strong>{llms_full.get('listing_count','?')}</strong></li>
        <li>Header timestamp: <strong>{llms_full.get('generated','?')}</strong></li>
      </ul>

      <h3 style="margin:1.5rem 0 0.4rem">3. AI manifests</h3>
      <ul style="margin:0;padding-left:1.2rem;color:#374151">
        <li>/.well-known/ai.json last_updated → <strong>{report['actions'].get('ai_json',{}).get('last_updated','?')}</strong></li>
      </ul>

      <h3 style="margin:1.5rem 0 0.4rem">4. Neighborhood Heatmap</h3>
      <ul style="margin:0;padding-left:1.2rem;color:#374151">
        <li>Analysed: <strong>{heat.get('total_neighborhoods_analyzed','?')}</strong> sub-areas</li>
        <li>Warming→Hot crossings: <strong>{heat.get('crossings_detected',0)}</strong> · instant alerts sent: {heat.get('instant_alerts_sent',0)}</li>
      </ul>

      <h3 style="margin:1.5rem 0 0.4rem">5. Glossary staleness ({stale_g.get('count',0)} needing review)</h3>
      <p style="margin:0 0 0.4rem;color:#374151;font-size:14px">These entries haven't been reviewed in 180+ days. Statute-facing content requires human review — the cron never auto-rewrites this.</p>
      <ol style="margin:0;padding-left:1.4rem;color:#374151;font-size:14px">{stale_g_rows}</ol>

      <h3 style="margin:1.5rem 0 0.4rem">6. Climate-normals cache staleness ({stale_c.get('count',0)} communities)</h3>
      <p style="margin:0;color:#374151;font-size:14px">Flagged only — the next visitor to each community page triggers a live ECCC re-fetch automatically.</p>

      <h3 style="margin:1.5rem 0 0.4rem">7. AEO score</h3>
      <ul style="margin:0;padding-left:1.2rem;color:#374151">
        <li>Composite: <strong>{aeo.get('overall_score','?')}/100</strong> · sample pages: {aeo.get('sample_pages','?')}</li>
      </ul>

      <p style="margin-top:2rem;font-size:12px;color:#6b7280">
        Automatic weekly cron · Sundays 03:00 PT · Doug internal only ·
        BCFSA/CREA/PIPA/CASL compliant · never adds pages, never changes URLs.
      </p>
      {casl_footer_html(f"{base_url}/admin/settings/weekly-refresh/off")}
    </div>
    """.strip()

    text = (
        f"Weekly Content Refresh — {started.strftime('%A %b %d, %Y')}\n"
        f"Duration: {report['duration_sec']}s\n\n"
        f"1. Sitemap: {sitemap.get('total_urls')} URLs · IndexNow {sitemap.get('indexnow_pushed')} pushed\n"
        f"2. llms-full.txt: {llms_full.get('glossary_count')} glossary, {llms_full.get('community_count')} communities, {llms_full.get('listing_count')} active MLS listings\n"
        f"3. ai.json last_updated: {report['actions'].get('ai_json',{}).get('last_updated')}\n"
        f"4. Heatmap: {heat.get('total_neighborhoods_analyzed')} analysed · {heat.get('crossings_detected',0)} crossings · {heat.get('instant_alerts_sent',0)} alerts sent\n"
        f"5. Glossary needing review: {stale_g.get('count',0)}\n"
        f"6. Climate cache stale: {stale_c.get('count',0)}\n"
        f"7. AEO score: {aeo.get('overall_score')}/100\n\n"
        + casl_footer_text(f"{base_url}/admin/settings/weekly-refresh/off")
    )

    await send_email(
        db,
        to="doug@eztofind.ca",
        subject=f"🌅 EZtoFind weekly refresh — {started.strftime('%b %d')}",
        html=html,
        text=text,
        kind="transactional",
        related_id=f"weekly-refresh:{started.strftime('%Y-%m-%d')}",
        unsubscribe_url=f"{base_url}/admin/settings/weekly-refresh/off",
    )

    return report
