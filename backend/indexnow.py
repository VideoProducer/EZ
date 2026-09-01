"""
IndexNow protocol integration for EZtoFind.ca.

IndexNow (https://www.indexnow.org) is an open protocol adopted by Bing,
Yandex, Naver, and Seznam that lets a website push URLs directly to search
engines the moment content changes — replacing the traditional "crawl and
maybe re-index in a few days" model with instant indexing.

Google is evaluating adoption. For now this covers Bing, which is the
search backend behind ChatGPT and Copilot.

USAGE
-----
    from indexnow import notify_indexnow
    await notify_indexnow(["https://eztofind.ca/glossary/property-transfer-tax-ptt"])

The key file must be reachable at:
    https://eztofind.ca/{KEY}.txt

...containing exactly the KEY string on one line. Already deployed at
/app/frontend/public/681eb028ce26ba1b13c9175df2fe917e.txt.
"""
from __future__ import annotations
import httpx
import logging
from typing import Iterable

logger = logging.getLogger("indexnow")

INDEXNOW_KEY = "681eb028ce26ba1b13c9175df2fe917e"
HOST = "eztofind.ca"
KEY_LOCATION = f"https://{HOST}/{INDEXNOW_KEY}.txt"


async def notify_indexnow(urls: Iterable[str]) -> dict:
    """POST a batch of URLs to IndexNow. Silent-fail on error (never break app flow)."""
    urls = list(urls)
    if not urls:
        return {"skipped": True, "reason": "empty url list"}
    if len(urls) > 10000:
        urls = urls[:10000]  # protocol max per call
    payload = {
        "host": HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post("https://api.indexnow.org/indexnow", json=payload,
                                  headers={"Content-Type": "application/json; charset=utf-8"})
            return {"status_code": r.status_code, "count": len(urls), "ok": 200 <= r.status_code < 300}
    except Exception as e:
        logger.warning(f"IndexNow POST failed (silent-fail): {e}")
        return {"error": str(e), "count": len(urls), "ok": False}


async def fire_and_log(db, urls: Iterable[str], kind: str, trigger: str = "content_update") -> dict:
    """Ping IndexNow AND write an audit row to ai_discovery_pings.

    Hook this into every mutation endpoint that changes a public URL — the
    per-mutation audit trail lets Doug watch instant-indexing coverage from
    the admin panel and gives us proof-of-push when Bing / ChatGPT crawl a
    freshly-updated page within minutes instead of days.

    kind    e.g. "community_synopsis_approved" | "market_report_snapshot"
    trigger free-form call site marker ("admin_manual", "cron_nightly", …)
    """
    from datetime import datetime, timezone, timedelta
    urls = [u for u in urls if u]
    if not urls:
        return {"skipped": True, "reason": "empty url list", "kind": kind}
    result = await notify_indexnow(urls)
    try:
        await db.ai_discovery_pings.insert_one({
            "kind": kind,
            "trigger": trigger,
            "urls": urls[:50],           # cap: keep the log row < 1 KB
            "url_count": len(urls),
            "host": HOST,
            "result": result,
            "at": datetime.now(timezone.utc).isoformat(),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=180),
        })
    except Exception as e:
        logger.warning(f"ai_discovery_pings insert failed (silent-fail): {e}")
    return {**result, "kind": kind, "trigger": trigger, "url_count": len(urls)}
