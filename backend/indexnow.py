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
