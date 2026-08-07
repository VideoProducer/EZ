"""
Vision-grounded tour narration.

Given a list of keyframes extracted from a virtual tour / uploaded video
(each with a `seek_ms` timestamp + JPEG bytes), asks Claude Sonnet 4.6
vision to write one sentence per keyframe describing what's visually on
screen — so Doogie's tour voice-over is grounded in the actual video
content at each timestamp.

Public API
----------
    await generate_tour_narration_from_keyframes(listing, keyframes, key)
      -> dict {
          "script": "...joined sentences...",
          "cues": [
            {"ordinal":0, "seek_ms":1000,
             "screen_ref":"tour_ts=0:01",
             "sentence": "...",
             "room_label": "exterior"},
            ...
          ],
          "provider": "anthropic:claude-sonnet-4-6",
          "vision_grounded": true,
      }

Returns None on any failure — callers fall back to the existing text-only
`_generate_tour_narration` in server.py.
"""
from __future__ import annotations

import base64
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are Doogie, a friendly golden-retriever real estate helper for British Columbia. You are watching a virtual tour of a listing right now — I'm sending you a series of screenshots taken from the tour, in order. Write a warm, first-person voice-over where each sentence corresponds to one screenshot in order.

STRICT RULES:
1. Ground every sentence in what is visually in that specific screenshot. Do NOT invent rooms, features, materials, or views that aren't visible.
2. Never state or imply a value opinion ("great deal", "well priced", "won't last", "move-in ready", "perfect for you").
3. Never mention the listing agent, brokerage name, phone, email, website, or realtor.ca URL. No sales CTAs.
4. First screenshot: one warm "Woof!" opener naming the address + city if you know them, then describe what's on screen. Subsequent frames: no more "Woof!" — flow into the space you see.
5. Each sentence: 14-28 words, spoken naturally. No lists, no bullets, no headings, no emojis, no markdown.
6. When you spot a room/space (kitchen, primary bedroom, ensuite, deck, garage, view, etc.), name it AND set `room_label` to a short slug: "kitchen","living","dining","primary_bed","ensuite","bath","bed","office","laundry","basement","garage","deck","yard","pool","view","exterior","entry","foyer","hallway","utility","other".
7. TTS-safety: prices in words ("four hundred ninety-nine thousand dollars"), bed/bath counts in words, years in words.
8. NO compliance boilerplate — the frontend appends it.

OUTPUT FORMAT — STRICT JSON, no prose, no code fences:
{
  "cues": [
    {"ordinal": 0, "sentence": "Woof! Welcome to twelve thirty-four Maple in Kitsilano — we're pulling up to a warm cedar-clad craftsman with a broad covered porch.", "room_label": "exterior"},
    {"ordinal": 1, "sentence": "Stepping inside...", "room_label": "foyer"},
    ...
  ]
}
Every `ordinal` maps 1-to-1 to the screenshot I sent at that position (0-based). Do NOT skip frames, do NOT invent extra frames."""


def _build_fact_sheet(listing: dict, n_frames: int) -> str:
    parts = []
    addr = listing.get("street_address") or listing.get("unparsed_address") or ""
    city = listing.get("city") or ""
    if addr or city:
        parts.append(f"Address: {addr}{', ' + city if city else ''}")
    if listing.get("list_price"):
        n = int(listing["list_price"])
        parts.append(f"List price (DO NOT SPEAK AS DIGITS): ${n:,}")
    for k, label in (("beds","Beds"),("baths","Baths"),("year_built","Year built"),
                     ("property_type","Type")):
        v = listing.get(k)
        if v is not None:
            parts.append(f"{label}: {v}")
    parts.append(f"Screenshots I'm showing you: {n_frames} frames (ordinals 0..{n_frames-1}) in tour order")
    return "\n".join(f"- {p}" for p in parts)


def _fmt_ts(ms: int) -> str:
    s = ms // 1000
    return f"{s // 60}:{s % 60:02d}"


def _sanitise_cues(raw: dict, keyframes: list[dict]) -> list[dict]:
    out = []
    for c in (raw.get("cues") or []):
        try:
            ordinal = int(c.get("ordinal"))
            sent = str(c.get("sentence") or "").strip()
            room = str(c.get("room_label") or "other").strip().lower()
            if not sent or ordinal < 0 or ordinal >= len(keyframes):
                continue
            seek_ms = int(keyframes[ordinal].get("seek_ms") or 0)
            out.append({
                "ordinal": ordinal,
                "seek_ms": seek_ms,
                "screen_ref": f"tour_ts={_fmt_ts(seek_ms)}",
                "sentence": sent,
                "room_label": room,
            })
        except Exception:
            continue
    seen = set()
    dedup = []
    for c in out:
        if c["ordinal"] in seen:
            continue
        seen.add(c["ordinal"])
        dedup.append(c)
    dedup.sort(key=lambda x: x["ordinal"])
    return dedup


async def generate_tour_narration_from_keyframes(
    listing: dict, keyframes: list[dict], emergent_llm_key: str,
) -> Optional[dict]:
    if not keyframes:
        return None

    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone

    image_contents = [
        ImageContent(image_base64=base64.b64encode(kf["jpeg_bytes"]).decode("ascii"))
        for kf in keyframes
    ]
    fact_sheet = _build_fact_sheet(listing, len(keyframes))
    user_text = (
        "LISTING FACT SHEET:\n" + fact_sheet +
        "\n\nBelow are the tour screenshots in order. Write ONE sentence per screenshot "
        f"(ordinals 0 through {len(keyframes) - 1})."
    )

    session_id = f"vision-tour-{listing.get('listing_key','x')}-{int(datetime.now(timezone.utc).timestamp())}"
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
        raw = buf.strip()
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE | re.MULTILINE).strip()
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            logger.warning(f"vision_tour_narration: no JSON — first 200: {raw[:200]}")
            return None
        parsed = json.loads(m.group(0))
    except Exception as e:
        logger.warning(f"vision_tour_narration: Sonnet call/parse failed: {e}")
        return None

    cues = _sanitise_cues(parsed, keyframes)
    if not cues:
        return None

    return {
        "script": " ".join(c["sentence"] for c in cues),
        "cues": cues,
        "provider": "anthropic:claude-sonnet-4-6",
        "vision_grounded": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
