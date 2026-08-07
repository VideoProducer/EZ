"""
Vision-grounded listing narration for EZtoFind.

Sends the actual listing photos to Claude Sonnet 4.6 (vision) and gets back
one sentence per photo, describing what is *literally on screen* in each
image — not a text-only guess based on the DDF description.

Contract
--------
    await generate_photo_narration(listing) -> dict {
        "script":   "<full narration, sentences joined by spaces>",
        "cues": [
            {"ordinal": 0, "screen_ref": "photos[0]",
             "sentence": "Woof! Let's start at the curb...",
             "room_label": "exterior"},
            {"ordinal": 1, "screen_ref": "photos[1]",
             "sentence": "The foyer opens into a bright entry with...",
             "room_label": "foyer"},
            ...
        ],
        "provider": "anthropic:claude-sonnet-4-6",
        "generated_at": "<iso>",
    }

Guarantees
----------
* One cue per photo — `len(cues) == min(photo_count, MAX_PHOTOS)`.
* `screen_ref = "photos[N]"` where N is the exact 0-based photo index.
* Sentences are compliance-safe (no value opinions, no agent details) —
  the same prompt guardrails as `_NARRATION_PROMPT` are applied here.
* If Sonnet vision call fails, callers can fall back to the existing
  text-only Haiku path in server.py._generate_listing_narration.
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional

import aiohttp
from PIL import Image

logger = logging.getLogger(__name__)

# Cap how many photos we send to Sonnet in one call.  MLS reels above ~24
# photos are dominated by duplicates (indoor from another angle) so trimming
# doesn't lose much sync value and keeps latency + cost predictable.
MAX_PHOTOS = int(os.environ.get("NARRATION_MAX_PHOTOS", "24"))
# Downscale each photo before sending — Sonnet vision handles ~1568px well
# and there's no benefit to sending full-res 4000px MLS masters.
IMAGE_MAX_EDGE = 1024
IMAGE_JPEG_QUALITY = 78
FETCH_TIMEOUT_S = 10
HTTP_CONCURRENCY = 6

_SYSTEM_PROMPT = """You are Doogie, a friendly golden-retriever real estate helper for British Columbia. You are looking at the photos of a listing right now, one by one, and writing a warm first-person voice-over for a photo reel. The buyer will see each photo on screen while you say the matching sentence — so what you describe MUST be visually present in that specific photo.

STRICT RULES:
1. Ground every sentence in what is visually in that specific photo. Do NOT invent rooms, features, views, materials, or details that aren't visible in the image.
2. Never state or imply a value opinion (no "great deal", "well priced", "won't last", "move-in ready", "perfect for you", "a steal").
3. Never mention the listing agent, brokerage name, phone number, email, website, or realtor.ca URLs.
4. No sales CTAs, no "call today", no "book a showing".
5. First photo: one warm "Woof!" opener naming the address + city if you know them from the fact sheet, then describe what's visibly in photo 0. Subsequent photos: NO more "Woof!" — just flow into the room/space you see.
6. Keep each sentence to 12-24 words, spoken naturally. No lists, no bullets, no headings, no emojis, no markdown.
7. When you spot a room type (kitchen, primary bedroom, ensuite, deck, garage, view, etc.), name it explicitly in the sentence AND set `room_label` to a short slug: "kitchen", "living", "dining", "primary_bed", "ensuite", "bath", "bed", "office", "laundry", "basement", "garage", "deck", "yard", "pool", "view", "exterior", "entry", "foyer", "hallway", "utility", "other".
8. TTS-safety: if you must state a price from the fact sheet, spell it in words ("four hundred ninety-nine thousand dollars"). Never write digits for prices, years, sqft, or bed/bath counts.
9. Absolutely no compliance boilerplate at the end — the frontend appends it.

OUTPUT FORMAT — output STRICT JSON, no prose, no code fences. One JSON object with this exact shape:
{
  "cues": [
    {"ordinal": 0, "sentence": "Woof! Welcome to twelve thirty-four Maple Street in Kitsilano — let's start at the curb.", "room_label": "exterior"},
    {"ordinal": 1, "sentence": "The foyer opens onto...", "room_label": "foyer"},
    ...
  ]
}
Every `ordinal` MUST match a real photo index you saw (0-based, in the order given). Do NOT skip photos, do NOT include ordinals beyond the last photo shown."""


async def _fetch_and_downscale(session: aiohttp.ClientSession, url: str) -> Optional[bytes]:
    """Fetch a photo URL, downscale to `IMAGE_MAX_EDGE`, encode as JPEG.
    Returns bytes ready for base64 encoding, or None on any failure."""
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=FETCH_TIMEOUT_S)) as r:
            if r.status != 200:
                return None
            raw = await r.read()
        img = Image.open(io.BytesIO(raw))
        # Take first frame of animated formats (WebP / GIF).
        if getattr(img, "is_animated", False):
            img.seek(0)
        img = img.convert("RGB")
        # Resize preserving aspect ratio if either dim exceeds IMAGE_MAX_EDGE.
        w, h = img.size
        if max(w, h) > IMAGE_MAX_EDGE:
            scale = IMAGE_MAX_EDGE / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=IMAGE_JPEG_QUALITY, optimize=True)
        return out.getvalue()
    except Exception as e:
        logger.warning(f"vision_narration: fetch/downscale failed url={url[:80]} err={e}")
        return None


async def _prepare_images(photo_urls: list[str]) -> list[tuple[int, bytes]]:
    """Fetch + downscale a subset (up to MAX_PHOTOS).  Returns list of
    `(original_index, jpeg_bytes)` tuples for photos we successfully loaded."""
    subset = photo_urls[:MAX_PHOTOS]
    sem = asyncio.Semaphore(HTTP_CONCURRENCY)
    async with aiohttp.ClientSession() as session:
        async def _one(i, u):
            async with sem:
                b = await _fetch_and_downscale(session, u)
                return (i, b)
        results = await asyncio.gather(*[_one(i, u) for i, u in enumerate(subset)])
    return [(i, b) for (i, b) in results if b is not None]


def _build_fact_sheet(listing: dict, loaded_indices: list[int]) -> str:
    parts = []
    addr = listing.get("street_address") or listing.get("unparsed_address") or ""
    city = listing.get("city") or ""
    if addr or city:
        parts.append(f"Address: {addr}{', ' + city if city else ''}")
    if listing.get("list_price"):
        n = int(listing["list_price"])
        # Ask caller (server.py) to spell prices — we mirror the pattern.
        parts.append(f"List price (as digits, DO NOT SPEAK AS DIGITS): ${n:,}")
    for k, label in (("beds", "Beds"), ("baths", "Baths"), ("half_baths", "Half baths"),
                     ("property_type", "Type"), ("year_built", "Year built")):
        v = listing.get(k)
        if v is not None:
            parts.append(f"{label}: {v}")
    if listing.get("living_area_sqft"):
        parts.append(f"Living area (sqft): {int(listing['living_area_sqft']):,}")
    parts.append(f"Photos shown to you (in order): {len(loaded_indices)} images (ordinals 0..{len(loaded_indices) - 1})")
    return "\n".join(f"- {p}" for p in parts)


def _sanitise_cues(raw: dict, loaded_indices: list[int]) -> list[dict]:
    """Take Sonnet's JSON and produce ordered, mapped, room-labeled cues
    where `screen_ref` = "photos[N]" for the ORIGINAL photo index (not the
    subset ordinal we sent)."""
    out = []
    for c in (raw.get("cues") or []):
        try:
            ordinal = int(c.get("ordinal"))
            sent = str(c.get("sentence") or "").strip()
            room = str(c.get("room_label") or "other").strip().lower()
            if not sent or ordinal < 0 or ordinal >= len(loaded_indices):
                continue
            real_idx = loaded_indices[ordinal]
            out.append({
                "ordinal": ordinal,
                "screen_ref": f"photos[{real_idx}]",
                "photo_idx": real_idx,     # kept for backwards compat with ListingNarration
                "sentence": sent,
                "room_label": room,
            })
        except Exception:
            continue
    # Deduplicate by ordinal (keep first) and sort in play order.
    seen = set()
    dedup = []
    for c in out:
        if c["ordinal"] in seen:
            continue
        seen.add(c["ordinal"])
        dedup.append(c)
    dedup.sort(key=lambda x: x["ordinal"])
    return dedup


async def generate_photo_narration(listing: dict, emergent_llm_key: str) -> Optional[dict]:
    """Main entry.  Returns None on any failure so the caller can fall back
    to the text-only Haiku path."""
    photos = listing.get("photos") or []
    if not photos:
        return None

    # 1) Fetch + downscale
    prepared = await _prepare_images(photos)
    if not prepared:
        logger.warning("vision_narration: no photos could be loaded")
        return None
    loaded_indices = [i for (i, _b) in prepared]

    # 2) Build the user message
    fact_sheet = _build_fact_sheet(listing, loaded_indices)
    user_text = (
        "LISTING FACT SHEET:\n" + fact_sheet +
        "\n\nBelow are the photos in the exact order they will appear in the reel. "
        "Write ONE sentence per photo (ordinals 0 through "
        f"{len(loaded_indices) - 1}), grounded in what is visible in each image."
    )

    # 3) Call Sonnet vision
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone

    image_contents = []
    for (_orig_idx, jpeg_bytes) in prepared:
        b64 = base64.b64encode(jpeg_bytes).decode("ascii")
        image_contents.append(ImageContent(image_base64=b64))

    session_id = f"vision-narration-{listing.get('listing_key','x')}-{int(datetime.now(timezone.utc).timestamp())}"
    chat = LlmChat(
        api_key=emergent_llm_key,
        session_id=session_id,
        system_message=_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-6")

    try:
        buf = ""
        async for ev in chat.stream_message(UserMessage(text=user_text, file_contents=image_contents)):
            if isinstance(ev, TextDelta):
                buf += ev.content
            elif isinstance(ev, StreamDone):
                break
        raw_text = buf.strip()
        # Strip code fences if present.
        raw_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.IGNORECASE | re.MULTILINE).strip()
        # Extract first JSON object.
        m = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if not m:
            logger.warning(f"vision_narration: no JSON in response — first 200: {raw_text[:200]}")
            return None
        parsed = json.loads(m.group(0))
    except Exception as e:
        logger.warning(f"vision_narration: Sonnet call/parse failed: {e}")
        return None

    cues = _sanitise_cues(parsed, loaded_indices)
    if not cues:
        logger.warning("vision_narration: sonnet returned no valid cues")
        return None

    script = " ".join(c["sentence"] for c in cues)
    return {
        "script": script,
        "cues": cues,
        "provider": "anthropic:claude-sonnet-4-6",
        "vision_grounded": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
