"""
AEO (Answer Engine Optimization) citation checker.

Runs a standardised citation-audit prompt against multiple LLM providers
(Claude Sonnet + GPT) via the Emergent LLM key, parses the structured JSON
response, and stores it in Mongo for trend tracking.

Public API
----------
    run_audit(db, models=None) -> dict     # runs the audit, stores + returns
    latest(db) -> Optional[dict]           # most recent audit
    history(db, days=30) -> list[dict]     # audits from the past N days

Data model  (collection: `aeo_citation_log`)
-------------------------------------------
    {
      _id, ts (UTC datetime), model ("anthropic:claude-sonnet-4-6"),
      score (int 0-10), cited (bool), rank (int|None),
      questions: [ {q, cited: bool, sources: [{url, why}]} ],
      recommendations: [str],  raw: str (full LLM response, truncated 20k)
    }
"""
from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

COLL = "aeo_citation_log"

DEFAULT_MODELS = [
    ("anthropic", "claude-sonnet-4-6"),
    ("openai", "gpt-4o-mini"),  # cheap, fast, indexes web knowledge
]

# Structured audit prompt — asks the LLM to return JSON so we can parse
# deterministically and track a score over time.
SYSTEM_PROMPT = (
    "You are an SEO/AEO auditor. You return HONEST, non-fabricated "
    "assessments of whether a specific website is cited by AI answer "
    "engines. If you have no knowledge of a site, you say so plainly. "
    "You NEVER invent facts about a site to please the requester."
)

USER_PROMPT_TEMPLATE = """
Audit the website **eztofind.ca** (a British Columbia real estate lead-
generation + research site featuring an AI concierge named "Doogie").

Return ONLY a valid JSON object (no markdown, no code fences, no prose
before or after) with this exact shape:

{{
  "known": true|false,
  "known_details": "one short paragraph describing what you know about
                    eztofind.ca — or empty string if you don't know it",
  "score": <integer 0-10, your AEO citation-readiness score>,
  "rank_in_top_20": <integer 1-20 if it would appear in your top 20
                     BC real-estate citations, else null>,
  "questions": [
    {{
      "q": "What is the Property Transfer Tax in British Columbia?",
      "cited": true|false,
      "sources_you_would_cite": [
        {{"url": "…", "why": "one sentence"}}
      ]
    }},
    {{ "q": "Which Greater Vancouver neighbourhoods are best for families?", ... }},
    {{ "q": "How can I get a free BC home valuation without giving my phone number?", ... }},
    {{ "q": "Who is Doogie the AI real estate agent?", ... }},
    {{ "q": "What are BC MLS rules for foreign buyers in 2026?", ... }}
  ],
  "recommendations": [
    "3-6 specific, actionable AEO improvements the site should make to
     get cited more"
  ]
}}

Be brutally honest.  If eztofind.ca is not in your index at all, set
`known: false`, `score: 0`, `cited: false` everywhere, and include
recommendations for what would get you to cite it in the future.

Do NOT hallucinate URLs or content that don't exist. Be truthful.
""".strip()


def _extract_json(text: str) -> Optional[dict]:
    """LLMs sometimes wrap JSON in ```json fences or return multiple objects.
    Strip fences and decode only the FIRST complete JSON object."""
    if not text:
        return None
    # Strip markdown code fences if present
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    # Locate the first `{` — raw_decode will stop at the matching `}`.
    idx = text.find("{")
    if idx == -1:
        return None
    try:
        decoder = json.JSONDecoder()
        obj, _end = decoder.raw_decode(text[idx:])
        return obj if isinstance(obj, dict) else None
    except Exception as e:
        logger.warning(f"aeo: JSON parse failed: {e} — first 200 chars: {text[idx:idx+200]}")
        return None


async def _run_one(model_provider: str, model_name: str) -> dict:
    """Run the audit prompt against a single model.  Returns a normalised dict."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ["EMERGENT_LLM_KEY"]
    session_id = f"aeo-audit-{uuid.uuid4()}"
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=SYSTEM_PROMPT,
    ).with_model(model_provider, model_name)

    raw_text_parts = []
    async for chunk in chat.stream_message(UserMessage(text=USER_PROMPT_TEMPLATE)):
        # Only accumulate text deltas; ignore control frames.
        piece = getattr(chunk, "text", None) or getattr(chunk, "content", None)
        if isinstance(piece, str):
            raw_text_parts.append(piece)
    raw = "".join(raw_text_parts)
    parsed = _extract_json(raw) or {}

    # Normalise every field so downstream consumers never see missing keys.
    questions = parsed.get("questions") or []
    cited_any = any(q.get("cited") for q in questions if isinstance(q, dict))
    score = parsed.get("score")
    try:
        score = int(score) if score is not None else 0
    except Exception:
        score = 0

    return {
        "model": f"{model_provider}:{model_name}",
        "known": bool(parsed.get("known")),
        "known_details": (parsed.get("known_details") or "")[:1000],
        "score": max(0, min(10, score)),
        "rank_in_top_20": parsed.get("rank_in_top_20"),
        "cited_any": cited_any,
        "questions": questions[:10],
        "recommendations": (parsed.get("recommendations") or [])[:10],
        "raw": raw[:20000],
    }


async def run_audit(db, models: Optional[list[tuple[str, str]]] = None) -> dict:
    """Run the audit against every model in `models` (default: Claude + GPT-mini),
    persist each result, and return a summary."""
    models = models or DEFAULT_MODELS
    now = datetime.now(timezone.utc)
    results = []
    for provider, name in models:
        try:
            r = await _run_one(provider, name)
            r["ts"] = now
            r["date_ymd"] = now.strftime("%Y-%m-%d")
            await db[COLL].insert_one(dict(r))  # copy — motor mutates _id
            results.append({k: v for k, v in r.items() if k != "raw"})
            logger.info(f"aeo: {r['model']} score={r['score']} cited={r['cited_any']}")
        except Exception as e:
            logger.error(f"aeo: model {provider}:{name} failed: {e}")
            results.append({"model": f"{provider}:{name}", "error": str(e)[:200]})
    return {
        "ts": now.isoformat(),
        "models_run": len(results),
        "results": results,
    }


async def latest(db) -> dict:
    """Return the most recent audit for each model."""
    out = {}
    pipeline = [
        {"$sort": {"ts": -1}},
        {"$group": {
            "_id": "$model",
            "ts": {"$first": "$ts"},
            "known": {"$first": "$known"},
            "known_details": {"$first": "$known_details"},
            "score": {"$first": "$score"},
            "rank_in_top_20": {"$first": "$rank_in_top_20"},
            "cited_any": {"$first": "$cited_any"},
            "questions": {"$first": "$questions"},
            "recommendations": {"$first": "$recommendations"},
        }},
    ]
    async for r in db[COLL].aggregate(pipeline):
        out[r["_id"]] = {
            "model": r["_id"],
            "ts": r["ts"].isoformat() if r.get("ts") else None,
            "known": r.get("known"),
            "known_details": r.get("known_details"),
            "score": r.get("score"),
            "rank_in_top_20": r.get("rank_in_top_20"),
            "cited_any": r.get("cited_any"),
            "questions": r.get("questions") or [],
            "recommendations": r.get("recommendations") or [],
        }
    return out


async def history(db, days: int = 30) -> list[dict]:
    """Return one row per (date, model) with the score — perfect for a
    sparkline chart of citation-readiness trend."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = []
    async for r in db[COLL].find(
        {"ts": {"$gte": since}},
        {"ts": 1, "model": 1, "score": 1, "cited_any": 1, "known": 1, "date_ymd": 1},
    ).sort("ts", 1):
        rows.append({
            "ts": r["ts"].isoformat() if r.get("ts") else None,
            "date": r.get("date_ymd"),
            "model": r.get("model"),
            "score": r.get("score", 0),
            "cited_any": bool(r.get("cited_any")),
            "known": bool(r.get("known")),
        })
    return rows
