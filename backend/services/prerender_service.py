"""
Prerender service for EZtoFind.ca — headless-Chromium runtime SSR for
LLM/search-engine crawlers with BCFSA + CASL + PIPA + GVR/CREA compliance
guardrails baked in.

Public API
----------
    await get_service().render(path) -> RenderResult
    await get_service().get_cached(path) -> Optional[RenderResult]  # cache-only
    is_bot(user_agent: str) -> bool
    is_prerenderable(path: str) -> bool     # PIPA + auth blocklist
    ttl_for(path: str) -> int              # seconds

Design
------
* Single shared Playwright chromium browser per worker (async).
* Renders against PRERENDER_TARGET_URL (defaults to http://localhost:3000)
  so the frontend service is hit inside the pod — no external latency.
* Mongo `prerender_cache` collection with a TTL index on `expires_at`
  auto-evicts stale HTML.  A second `prerender_log` collection stores
  every bot hit for compliance audit (path, ua, ts, cache).
* Post-render integrity check rejects HTML missing required disclosures.
* Renders in incognito context with cookies disabled (no session leakage).
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urljoin, urlparse

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# --- Config ------------------------------------------------------------

TARGET_BASE = (
    os.environ.get("PRERENDER_TARGET_URL")
    or os.environ.get("PUBLIC_APP_URL")
    or "http://localhost:3000"
).rstrip("/")
RENDER_TIMEOUT_MS = int(os.environ.get("PRERENDER_TIMEOUT_MS", "20000"))
RENDER_WAIT_UNTIL = os.environ.get("PRERENDER_WAIT_UNTIL", "networkidle")  # networkidle | load | domcontentloaded
MAX_CONCURRENCY = int(os.environ.get("PRERENDER_MAX_CONCURRENCY", "2"))
CACHE_COLL = "prerender_cache"
LOG_COLL = "prerender_log"

# TTL per path type (seconds) — GVR/CREA data freshness rules make listings
# the most sensitive; static content lives longest.
TTL_LISTING = 6 * 3600      # 6h
TTL_COMMUNITY = 12 * 3600   # 12h
TTL_GLOSSARY = 24 * 3600    # 24h
TTL_DEFAULT = 24 * 3600     # home, about, legal, etc.

# Bot User-Agent regex (case-insensitive). Only these get prerendered HTML;
# humans always get the SPA (no cloaking risk — content matches).
BOT_UA_RE = re.compile(
    r"("
    r"googlebot|google-inspectiontool|google-extended|bingbot|slurp|"
    r"duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|"
    r"gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|"
    r"perplexitybot|perplexity-user|"
    r"ccbot|amazonbot|applebot|bytespider|meta-externalagent|"
    r"facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|"
    r"discordbot|whatsapp|pinterestbot|redditbot|"
    r"mj12bot|semrushbot|ahrefsbot|dotbot|petalbot"
    r")",
    re.IGNORECASE,
)

# PIPA + auth blocklist. Never prerender or cache these path prefixes.
# Anything user-specific, admin, API, uploads, or session-bearing.
BLOCKLIST_PREFIXES = (
    "/api",
    "/admin",
    "/my-account",
    "/account",
    "/favorites",
    "/dashboard",
    "/login",
    "/signup",
    "/signin",
    "/logout",
    "/auth",
    "/consultation/status",
    "/consultation-status",
    "/doogie/upload",
    "/uploads",
    "/download",
    "/snapshot",  # already static, avoid recursion
    "/static",
    "/assets",
)

# BCFSA-required disclosure phrases (any of these must appear in the
# rendered HTML for it to be considered compliant to serve).  Case-
# insensitive match on the site footer content.
BCFSA_DISCLOSURES = (
    "bcfsa",
    "british columbia financial services authority",
    "real estate services act",
    "resa",
)

# CREA/GVR attribution required for listing pages.
LISTING_ATTRIBUTION = (
    "crea",
    "mls",
    "greater vancouver realtors",
    "listing brokerage",
)


def is_bot(user_agent: str) -> bool:
    """Return True if the User-Agent string matches any known crawler."""
    if not user_agent:
        return False
    return bool(BOT_UA_RE.search(user_agent))


def is_prerenderable(path: str) -> bool:
    """Return True if this path is allowed to be prerendered (PIPA + auth blocklist)."""
    if not path or not path.startswith("/"):
        return False
    # Drop query strings + fragments for prefix check
    clean = path.split("?", 1)[0].split("#", 1)[0].rstrip("/") or "/"
    for pref in BLOCKLIST_PREFIXES:
        if clean == pref or clean.startswith(pref + "/"):
            return False
    return True


def ttl_for(path: str) -> int:
    """Return cache TTL (seconds) for the given path."""
    p = path.split("?", 1)[0].split("#", 1)[0].lower()
    if p.startswith("/listing") or p.startswith("/listings/") or p.startswith("/property/"):
        return TTL_LISTING
    if p.startswith("/community") or p.startswith("/communities") or p.startswith("/neighbourhood"):
        return TTL_COMMUNITY
    if p.startswith("/glossary"):
        return TTL_GLOSSARY
    return TTL_DEFAULT


def _path_kind(path: str) -> str:
    p = path.split("?", 1)[0].lower()
    if p.startswith("/listing") or p.startswith("/property"):
        return "listing"
    if p.startswith("/community") or p.startswith("/neighbourhood"):
        return "community"
    if p.startswith("/glossary"):
        return "glossary"
    return "page"


# --- Compliance post-render check --------------------------------------

def _has_any(haystack_lower: str, needles: tuple[str, ...]) -> bool:
    return any(n in haystack_lower for n in needles)


def compliance_check(path: str, html: str) -> tuple[bool, Optional[str]]:
    """
    Post-render integrity check.  Returns (ok, reason).
    - Every page must contain a BCFSA disclosure phrase.
    - Listing pages must additionally contain CREA/GVR attribution.
    - HTML must not be a bare <div id="root"></div> (would mean render failed).
    """
    if not html or len(html) < 500:
        return False, "html_too_short"
    lower = html.lower()
    # Detect the "empty SPA shell" trap — root div with no children.
    if re.search(r'<div id="root">\s*</div>', lower):
        return False, "empty_spa_shell"
    if not _has_any(lower, BCFSA_DISCLOSURES):
        return False, "missing_bcfsa_disclosure"
    kind = _path_kind(path)
    if kind == "listing" and not _has_any(lower, LISTING_ATTRIBUTION):
        return False, "missing_listing_attribution"
    return True, None


# --- Render result -----------------------------------------------------

@dataclass
class RenderResult:
    path: str
    html: str
    status: int
    kind: str
    cache: str           # HIT | MISS | BYPASS | ERROR
    took_ms: int
    reason: Optional[str] = None  # populated on ERROR/BYPASS


# --- Service singleton -------------------------------------------------

class PrerenderService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._pw = None
        self._browser = None
        self._start_lock = asyncio.Lock()
        self._sem = asyncio.Semaphore(MAX_CONCURRENCY)
        self._ready = False

    # ---- Lifecycle ----

    async def start(self) -> None:
        """Idempotently launch the shared chromium browser + ensure indexes."""
        if self._ready:
            return
        async with self._start_lock:
            if self._ready:
                return
            # Mongo indexes: TTL on expires_at + unique on path.
            try:
                await self.db[CACHE_COLL].create_index(
                    "expires_at", expireAfterSeconds=0
                )
                await self.db[CACHE_COLL].create_index("path", unique=True)
                await self.db[LOG_COLL].create_index(
                    "ts", expireAfterSeconds=30 * 24 * 3600  # 30-day audit log
                )
                await self.db[LOG_COLL].create_index("path")
            except Exception as e:
                logger.warning(f"prerender: index creation warning: {e}")

            try:
                from playwright.async_api import async_playwright
                self._pw = await async_playwright().start()
                try:
                    self._browser = await self._pw.chromium.launch(
                        headless=True,
                        args=[
                            "--no-sandbox",
                            "--disable-dev-shm-usage",
                            "--disable-gpu",
                            "--disable-background-networking",
                            "--disable-features=TranslateUI",
                            "--mute-audio",
                        ],
                    )
                except Exception as launch_err:
                    # First-run on a fresh pod (production deploy) — the browser
                    # binary isn't downloaded yet. Auto-install once and retry.
                    if "Executable doesn't exist" in str(launch_err) or "playwright install" in str(launch_err).lower():
                        logger.info("prerender: chromium binary missing, running `playwright install chromium` (first-boot, ~100MB, ~90s)…")
                        import subprocess
                        proc = await asyncio.create_subprocess_exec(
                            "playwright", "install", "chromium",
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                        )
                        stdout, stderr = await proc.communicate()
                        if proc.returncode != 0:
                            logger.error(f"prerender: playwright install failed rc={proc.returncode}: {stderr.decode()[:500]}")
                            raise launch_err
                        logger.info("prerender: chromium installed, retrying launch")
                        self._browser = await self._pw.chromium.launch(
                            headless=True,
                            args=[
                                "--no-sandbox",
                                "--disable-dev-shm-usage",
                                "--disable-gpu",
                                "--disable-background-networking",
                                "--disable-features=TranslateUI",
                                "--mute-audio",
                            ],
                        )
                    else:
                        raise
                self._ready = True
                logger.info("prerender: chromium browser launched")
            except Exception as e:
                logger.error(f"prerender: failed to launch browser: {e}")
                raise

    async def stop(self) -> None:
        try:
            if self._browser:
                await self._browser.close()
            if self._pw:
                await self._pw.stop()
        except Exception:
            pass
        self._ready = False

    # ---- Cache ----

    async def get_cached(self, path: str) -> Optional[RenderResult]:
        doc = await self.db[CACHE_COLL].find_one({"path": path})
        if not doc:
            return None
        # Extra guard in case the TTL sweep hasn't run yet.
        exp = doc.get("expires_at")
        if isinstance(exp, datetime) and exp.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            return None
        return RenderResult(
            path=path,
            html=doc.get("html", ""),
            status=int(doc.get("status", 200)),
            kind=doc.get("kind", "page"),
            cache="HIT",
            took_ms=0,
        )

    async def _store(self, path: str, html: str, status: int, kind: str, ttl: int) -> None:
        now = datetime.now(timezone.utc)
        await self.db[CACHE_COLL].update_one(
            {"path": path},
            {"$set": {
                "path": path,
                "html": html,
                "status": status,
                "kind": kind,
                "rendered_at": now,
                "expires_at": now + timedelta(seconds=ttl),
                "size": len(html),
            }},
            upsert=True,
        )

    async def _log_hit(self, path: str, ua: str, cache: str, status: int, took_ms: int, reason: Optional[str] = None) -> None:
        try:
            await self.db[LOG_COLL].insert_one({
                "ts": datetime.now(timezone.utc),
                "path": path,
                "ua": (ua or "")[:300],
                "cache": cache,
                "status": status,
                "took_ms": took_ms,
                "reason": reason,
            })
        except Exception as e:
            logger.debug(f"prerender: log_hit failed: {e}")

    # ---- Render ----

    async def render(self, path: str, force: bool = False) -> RenderResult:
        """Render the given path.  Uses cache unless force=True."""
        # Compliance guard first — never render blocklisted paths.
        if not is_prerenderable(path):
            return RenderResult(
                path=path, html="", status=204, kind="blocked",
                cache="BYPASS", took_ms=0, reason="blocklisted_path",
            )

        if not force:
            cached = await self.get_cached(path)
            if cached:
                return cached

        if not self._ready:
            # Fast-BYPASS: never block the request path.  Emergent/Cloudflare's
            # ingress kills connections at ~2s, so we can't afford to wait for
            # the browser to boot (or for the one-time `playwright install`
            # download).  The `_boot_prerender` startup task handles launch in
            # the background — subsequent requests get real renders once
            # `_ready == True`.  Cloudflare Worker fall-through means bots see
            # the SPA (same as today) during this brief window.
            return RenderResult(
                path=path, html="", status=503, kind=_path_kind(path),
                cache="BYPASS", took_ms=0, reason="browser_not_ready",
            )

        kind = _path_kind(path)
        target = urljoin(TARGET_BASE + "/", path.lstrip("/"))
        started = time.monotonic()

        # Extra safety — refuse to render off-origin URLs.
        target_host = urlparse(target).netloc
        base_host = urlparse(TARGET_BASE).netloc
        if target_host != base_host:
            return RenderResult(
                path=path, html="", status=400, kind=kind,
                cache="ERROR", took_ms=0, reason="off_origin",
            )

        async with self._sem:
            context = None
            page = None
            try:
                # Fresh incognito context — no cookies, no storage, no session leak.
                context = await self._browser.new_context(
                    user_agent="Mozilla/5.0 (compatible; EZtoFindPrerender/1.0; +https://eztofind.ca/bots)",
                    java_script_enabled=True,
                    bypass_csp=False,
                    ignore_https_errors=False,
                    viewport={"width": 1280, "height": 1800},
                )
                # Block heavy resources we don't need for HTML/text rendering.
                async def _route(route):
                    rt = route.request.resource_type
                    if rt in ("image", "media", "font"):
                        await route.abort()
                    else:
                        await route.continue_()
                await context.route("**/*", _route)

                page = await context.new_page()
                resp = await page.goto(target, timeout=RENDER_TIMEOUT_MS, wait_until=RENDER_WAIT_UNTIL)
                status = resp.status if resp else 200

                # Give the SPA a beat to finish any post-networkidle hydration
                # (schema.org injections, footer disclosure, etc.).
                try:
                    await page.wait_for_selector("footer, [data-testid='site-footer'], main", timeout=3000)
                except Exception:
                    pass

                html = await page.content()
                took_ms = int((time.monotonic() - started) * 1000)

                ok, reason = compliance_check(path, html)
                if not ok:
                    logger.warning(f"prerender: compliance fail path={path} reason={reason}")
                    return RenderResult(
                        path=path, html=html, status=status, kind=kind,
                        cache="ERROR", took_ms=took_ms, reason=reason,
                    )

                # Inject a small provenance comment so the served HTML is
                # self-describing for compliance auditors.
                stamp = (
                    f"\n<!-- eztofind:prerender kind={kind} rendered_at="
                    f"{datetime.now(timezone.utc).isoformat()} ttl={ttl_for(path)}s -->\n"
                )
                html = re.sub(r"</body>", stamp + "</body>", html, count=1, flags=re.IGNORECASE)

                await self._store(path, html, status, kind, ttl_for(path))
                return RenderResult(
                    path=path, html=html, status=status, kind=kind,
                    cache="MISS", took_ms=took_ms,
                )

            except Exception as e:
                took_ms = int((time.monotonic() - started) * 1000)
                logger.error(f"prerender: render error path={path} err={e}")
                return RenderResult(
                    path=path, html="", status=502, kind=kind,
                    cache="ERROR", took_ms=took_ms, reason=str(e)[:200],
                )
            finally:
                try:
                    if page:
                        await page.close()
                    if context:
                        await context.close()
                except Exception:
                    pass

    # ---- Warmer ----

    async def warm(self, paths: list[str]) -> dict:
        """Force re-render a batch of paths.  Returns counters."""
        ok = fail = skipped = 0
        for p in paths:
            if not is_prerenderable(p):
                skipped += 1
                continue
            r = await self.render(p, force=True)
            if r.cache == "MISS" and r.status < 400:
                ok += 1
            else:
                fail += 1
        return {"ok": ok, "fail": fail, "skipped": skipped, "total": len(paths)}

    async def stats(self) -> dict:
        total = await self.db[CACHE_COLL].count_documents({})
        by_kind = {}
        async for d in self.db[CACHE_COLL].aggregate([
            {"$group": {"_id": "$kind", "n": {"$sum": 1}, "size": {"$sum": "$size"}}}
        ]):
            by_kind[d["_id"]] = {"count": d["n"], "bytes": d.get("size", 0)}
        recent = await self.db[LOG_COLL].count_documents(
            {"ts": {"$gte": datetime.now(timezone.utc) - timedelta(hours=24)}}
        )
        return {
            "cache_total": total,
            "by_kind": by_kind,
            "bot_hits_24h": recent,
            "ready": self._ready,
        }

    # ---- Log an incoming bot hit that we served from cache (called from route). ----

    async def log_hit(self, path: str, ua: str, cache: str, status: int, took_ms: int, reason: Optional[str] = None) -> None:
        await self._log_hit(path, ua, cache, status, took_ms, reason)


# Module-level singleton (lazy init).
_service: Optional[PrerenderService] = None


def init_service(db: AsyncIOMotorDatabase) -> PrerenderService:
    global _service
    if _service is None:
        _service = PrerenderService(db)
    return _service


def get_service() -> PrerenderService:
    if _service is None:
        raise RuntimeError("prerender service not initialised")
    return _service
