"""
Keyframe extraction for virtual tours + uploaded videos.

Uses the existing Playwright chromium instance (already installed for the
prerender service) to load any tour URL, play it, seek to N even
timestamps, and screenshot the visible viewport.  One code path for
YouTube, Vimeo, Matterport, and direct MP4/WebM.

Public API
----------
    await extract_keyframes(url, kind, count=10) -> list[{
        "seek_ms": int,       # timestamp we tried to seek to
        "jpeg_bytes": bytes,  # ~1024px JPEG
    }]

Returns [] on any failure — callers should tolerate empty gracefully and
fall back to text-only narration.

`kind` hints how we handle playback:
    "youtube" | "vimeo" | "matterport" | "video_file"

Notes
-----
* YouTube: uses IFrame API postMessage {seekTo}. Falls back to timed
  screenshots (0, dur/(N+1), 2*dur/(N+1) …) if postMessage doesn't ack.
* Vimeo: postMessage {method:"setCurrentTime", value:secs}.
* Matterport: no time seek — instead we send auto-play then screenshot at
  even wall-clock intervals as the model auto-rotates.
* video_file: rendered inside a tiny HTML wrapper we build inline so we
  can drive .currentTime directly.
"""
from __future__ import annotations

import asyncio
import io
import logging
import os
import re
from typing import Optional

from PIL import Image

logger = logging.getLogger(__name__)

DEFAULT_COUNT = int(os.environ.get("TOUR_KEYFRAMES", "10"))
LOAD_TIMEOUT_MS = 20000
BETWEEN_FRAMES_S = 2.0     # give the video/tour time to render each seek
SCREENSHOT_MAX_EDGE = 1024
JPEG_QUALITY = 78


def _detect_kind(url: str) -> str:
    u = (url or "").lower()
    if "youtube.com/embed" in u or "youtu.be" in u or "youtube-nocookie" in u:
        return "youtube"
    if "player.vimeo.com" in u or "vimeo.com" in u:
        return "vimeo"
    if "my.matterport.com" in u or "matterport.com/show" in u:
        return "matterport"
    if re.search(r"\.(mp4|webm|mov|m4v)(\?|$)", u):
        return "video_file"
    return "other"


def _wrapper_html_for_file(url: str) -> str:
    """Tiny page that hosts a <video> element we can drive."""
    return f"""<!doctype html><html><body style="margin:0;background:#000">
<video id=v src="{url}" playsinline muted style="width:100vw;height:100vh;object-fit:contain"></video>
<script>
window.__vid = document.getElementById('v');
window.__ready = new Promise(r => {{
  __vid.addEventListener('loadedmetadata', () => r(__vid.duration || 0), {{once: true}});
  __vid.addEventListener('error', () => r(0), {{once: true}});
}});
window.__seek = (t) => new Promise(r => {{
  __vid.currentTime = t;
  __vid.addEventListener('seeked', () => r(true), {{once: true}});
  setTimeout(() => r(false), 3500);
}});
</script></body></html>"""


def _downscale_jpeg(png_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    w, h = img.size
    if max(w, h) > SCREENSHOT_MAX_EDGE:
        s = SCREENSHOT_MAX_EDGE / max(w, h)
        img = img.resize((int(w * s), int(h * s)), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return out.getvalue()


async def _grab_youtube(page, count: int) -> list[dict]:
    """YouTube: wait for the player to buffer, seek to N even times, screenshot."""
    frames = []
    # Ask YT to start posting state updates.
    await page.evaluate("""() => {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(f => {
        try { f.contentWindow.postMessage(JSON.stringify({event:'listening',id:1,channel:'widget'}), '*'); } catch(e) {}
      });
    }""")
    # We can't reliably read duration cross-origin — fall back to fixed timestamps
    # covering the typical 60-180 sec tour range.
    seek_seconds = [max(1, int(i * 15)) for i in range(count)]  # 0,15,30,45,...
    for secs in seek_seconds:
        await page.evaluate(f"""() => {{
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(f => {{
            try {{ f.contentWindow.postMessage(JSON.stringify({{event:'command', func:'seekTo', args:[{secs}, true]}}), '*'); }} catch(e) {{}}
            try {{ f.contentWindow.postMessage(JSON.stringify({{event:'command', func:'playVideo', args:''}}), '*'); }} catch(e) {{}}
          }});
        }}""")
        await asyncio.sleep(BETWEEN_FRAMES_S)
        try:
            png = await page.screenshot(type="png", full_page=False)
            frames.append({"seek_ms": secs * 1000, "jpeg_bytes": _downscale_jpeg(png)})
        except Exception as e:
            logger.warning(f"keyframes: yt screenshot at {secs}s failed: {e}")
    return frames


async def _grab_vimeo(page, count: int) -> list[dict]:
    frames = []
    seek_seconds = [max(1, int(i * 15)) for i in range(count)]
    for secs in seek_seconds:
        await page.evaluate(f"""() => {{
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(f => {{
            try {{ f.contentWindow.postMessage(JSON.stringify({{method:'setCurrentTime', value:{secs}}}), '*'); }} catch(e) {{}}
            try {{ f.contentWindow.postMessage(JSON.stringify({{method:'play'}}), '*'); }} catch(e) {{}}
          }});
        }}""")
        await asyncio.sleep(BETWEEN_FRAMES_S)
        try:
            png = await page.screenshot(type="png", full_page=False)
            frames.append({"seek_ms": secs * 1000, "jpeg_bytes": _downscale_jpeg(png)})
        except Exception:
            pass
    return frames


async def _grab_matterport(page, count: int) -> list[dict]:
    """Matterport has no public seek API. We let its auto-tour ('Guided Tour'
    or 'dollhouse spin') play and screenshot at even wall-clock intervals."""
    frames = []
    # Start playback if a 'play' button is on screen.
    try:
        await page.evaluate("""() => {
          const b = document.querySelector('[aria-label*="play" i], button[title*="tour" i]');
          if (b) b.click();
        }""")
    except Exception:
        pass
    await asyncio.sleep(2)  # let it settle
    for i in range(count):
        try:
            png = await page.screenshot(type="png", full_page=False)
            frames.append({"seek_ms": int((i + 1) * BETWEEN_FRAMES_S * 1000),
                           "jpeg_bytes": _downscale_jpeg(png)})
        except Exception:
            pass
        await asyncio.sleep(BETWEEN_FRAMES_S)
    return frames


async def _grab_video_file(page, url: str, count: int) -> list[dict]:
    """Load a wrapper page around the file so we can control .currentTime."""
    await page.set_content(_wrapper_html_for_file(url), wait_until="load", timeout=LOAD_TIMEOUT_MS)
    try:
        duration = await asyncio.wait_for(page.evaluate("() => window.__ready"), timeout=6.0)
    except Exception:
        duration = 0
    duration = float(duration or 0)
    if duration < 1.0:
        return []
    frames = []
    step = duration / (count + 1)
    for i in range(1, count + 1):
        t = step * i
        try:
            await page.evaluate(f"() => window.__seek({t})")
            await asyncio.sleep(0.3)
            png = await page.screenshot(type="png", full_page=False)
            frames.append({"seek_ms": int(t * 1000), "jpeg_bytes": _downscale_jpeg(png)})
        except Exception as e:
            logger.warning(f"keyframes: video_file seek {t}s failed: {e}")
    return frames


async def extract_keyframes(url: str, kind: Optional[str] = None, count: int = DEFAULT_COUNT) -> list[dict]:
    """Main entry.  Never raises — returns [] on any error so callers can
    fall back to text-only narration."""
    if not url:
        return []
    kind = kind or _detect_kind(url)
    if kind == "other":
        logger.info(f"keyframes: unknown provider for {url[:80]}")
        return []

    # Reuse the same chromium instance as the prerender service — cheap.
    try:
        from services.prerender_service import get_service as _gp
        svc = _gp()
        if not svc._ready:
            await svc.start()
        browser = svc._browser
    except Exception as e:
        logger.warning(f"keyframes: no chromium available: {e}")
        return []

    context = None
    page = None
    try:
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (compatible; EZtoFindKeyframeExtractor/1.0)",
        )
        page = await context.new_page()
        if kind == "video_file":
            return await _grab_video_file(page, url, count)
        # For iframe-hosted providers, load the URL directly (their embed page).
        await page.goto(url, wait_until="load", timeout=LOAD_TIMEOUT_MS)
        # Let the player initialise + first paint.
        await asyncio.sleep(2)
        if kind == "youtube":
            return await _grab_youtube(page, count)
        if kind == "vimeo":
            return await _grab_vimeo(page, count)
        if kind == "matterport":
            return await _grab_matterport(page, count)
        return []
    except Exception as e:
        logger.warning(f"keyframes: extract failed url={url[:80]} err={e}")
        return []
    finally:
        try:
            if page: await page.close()
            if context: await context.close()
        except Exception:
            pass
