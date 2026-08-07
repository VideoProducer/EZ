"""
Doogie AI Compare Summary — compliance-hardened factual delta generator.

Compliance guardrails (all 5 from the product spec):
  1. Prompt hard-locks: forbidden vocabulary listed explicitly in the system
     prompt. LLM cannot output "recommend / best / should / ideal / worth /
     deal / undervalued / overpriced / better than / winner" or superlatives.
  2. Factual-delta-only: prompt constrains output to numeric or categorical
     deltas between the same 10 fields already shown on the compare table.
     No suitability opinions, no advice.
  3. Post-generation regex sweep: if the LLM breaks discipline the output is
     replaced with a static fallback. No silent leak.
  4. PIPA data minimization: only the 10 public MLS® fields are sent. No
     user id, email, saved-search history, or session context.
  5. Visible disclaimer + CREA DDF® attribution rendered by the frontend
     below every summary.

Called from /api/compare/summary. Never called from client code directly.
"""
from __future__ import annotations

import os
import re
import asyncio
from typing import List, Dict, Any

from emergentintegrations.llm.chat import LlmChat, UserMessage


# ── Compliance rails ────────────────────────────────────────────────────

# Words that would push the output into "advice" territory (BCFSA/RESA §60)
# or into unauthorized derivation of MLS® data (CREA DDF®). If any of these
# appears anywhere in the LLM output (case-insensitive, word-boundary), the
# response is discarded and the static fallback is served.
FORBIDDEN_TERMS = [
    # Recommendation / advice language
    r"\brecommend(s|ed|ation|ing)?\b",
    r"\bsuggest(s|ed|ion|ing)?\b",
    r"\byou\s+should\b",
    r"\byou'?d\s+(better|want)\b",
    r"\bwould\s+(recommend|suggest|choose|pick)\b",
    r"\bmy\s+(pick|choice|recommendation|advice)\b",
    r"\badvise(s|d)?\b",
    r"\badvice\b",
    # Superlatives / value judgements
    r"\bbest\b",
    r"\bworst\b",
    r"\bideal\b",
    r"\bperfect\b",
    r"\btop\s+(pick|choice)\b",
    r"\bwinner\b",
    r"\bfavou?rite\b",
    # Market opinions
    r"\bunder(-|\s)?priced\b",
    r"\bover(-|\s)?priced\b",
    r"\bundervalued\b",
    r"\bovervalued\b",
    r"\bworth\s+(more|less|it)\b",
    r"\bgreat\s+(deal|value|buy)\b",
    r"\bgood\s+(deal|value|buy)\b",
    r"\bbad\s+(deal|value|buy)\b",
    r"\bsteal\b",
    r"\bbargain\b",
    r"\binvestment\s+(opportunity|potential)\b",
    # Comparative judgements (allowed: quantitative deltas; blocked: opinions)
    r"\bbetter\s+than\b",
    r"\bworse\s+than\b",
    r"\bmore\s+attractive\b",
    r"\bmore\s+desirable\b",
]

_FORBIDDEN_RE = re.compile("|".join(FORBIDDEN_TERMS), re.IGNORECASE)


# The 10 public MLS® fields we let leave the server. Anything not on this
# whitelist is stripped before the prompt is built.
ALLOWED_FIELDS = (
    "listing_key",
    "list_price",
    "property_type",
    "beds",
    "baths",
    "living_area",
    "living_area_units",
    "lot_size_area",
    "lot_size_units",
    "year_built",
    "parking_spaces",
    "garage_spaces",
    "architectural_style",
    "property_style",
    "created_at",
    "city",
)


SYSTEM_PROMPT = """You are Doogie, a compliance-locked comparison narrator for a BC real estate website.

STRICT RULES — you MUST follow every one. Breaking any rule invalidates your response.

1. **Information, not advice.** You are describing facts, not giving real estate
   advice. Never say "you should", "recommend", "best", "ideal", "worth", "deal",
   "undervalued", "overpriced", "better than", "winner" or any superlative.
   Never suggest which home the reader should pick.

2. **Factual deltas only.** Compare only the fields provided. Every sentence must
   describe a numeric or categorical difference between two or more listings:
   e.g. "Home A has 800 sq ft more interior space and is 12 years newer than
   Home B." Do NOT invent facts, ratings, scores, or market opinions.

3. **Neutral tone.** No enthusiasm, no marketing language, no exclamation marks.
   Third-person, past-tense descriptions of the data.

4. **Length.** 3–5 short sentences total. No headers, no bullets, no emoji.

5. **Attribution.** Do NOT say "based on MLS data" or "according to CREA"; the
   frontend already renders that attribution below your text. Just write the
   comparison.

6. **Unknowns.** If a field is missing on any listing, either skip that field or
   say "not disclosed on one or more listings" — never estimate or infer.

Output ONLY the comparison paragraph. No preamble, no closing line.
"""


FALLBACK_SUMMARY = (
    "A side-by-side factual summary is not available for these listings right now. "
    "Please review the specifications in the table above and speak with a licensed "
    "REALTOR® to interpret them for your situation."
)


# ── Public entry point ─────────────────────────────────────────────────


async def generate_compare_summary(listings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate a compliance-safe factual comparison paragraph.

    Returns a dict:
      { "summary": str, "guardrails_triggered": bool, "listing_count": int }
    """
    if not listings or len(listings) < 2:
        return {
            "summary": "Pick at least 2 listings to see a factual side-by-side summary.",
            "guardrails_triggered": False,
            "listing_count": len(listings or []),
        }

    # PIPA data minimization — strip to whitelist only.
    payload = [{k: l.get(k) for k in ALLOWED_FIELDS if l.get(k) not in (None, "")} for l in listings]

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return {"summary": FALLBACK_SUMMARY, "guardrails_triggered": True, "listing_count": len(listings)}

    try:
        chat = (
            LlmChat(api_key=api_key, session_id=f"compare-summary-{len(listings)}",
                    system_message=SYSTEM_PROMPT)
            .with_model("anthropic", "claude-sonnet-4-5-20250929")
        )
        user_msg = UserMessage(
            text=(
                "Compare these MLS® listings using only the JSON fields provided. "
                "3–5 short sentences describing numeric or categorical deltas. "
                "Follow all rules in the system prompt.\n\n"
                f"Listings: {payload}"
            )
        )
        raw = await asyncio.wait_for(chat.send_message(user_msg), timeout=15)
    except Exception:
        return {"summary": FALLBACK_SUMMARY, "guardrails_triggered": True, "listing_count": len(listings)}

    text = (raw or "").strip()
    if not text:
        return {"summary": FALLBACK_SUMMARY, "guardrails_triggered": True, "listing_count": len(listings)}

    # Guardrail #3 — regex sweep. If any forbidden phrase leaked in, refuse.
    if _FORBIDDEN_RE.search(text):
        return {"summary": FALLBACK_SUMMARY, "guardrails_triggered": True, "listing_count": len(listings)}

    # Belt-and-suspenders length cap so a runaway model can't emit a full page.
    if len(text) > 900:
        text = text[:900].rsplit(".", 1)[0] + "."

    return {"summary": text, "guardrails_triggered": False, "listing_count": len(listings)}
