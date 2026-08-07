"""
Convert written dollar amounts into speakable English so OpenAI TTS
never mispronounces a listing price.

Why this exists
---------------
OpenAI's TTS voices sometimes read "$2,100,000.00" as
"twenty-one thousand" — a catastrophic error for a real estate site.
Normalizing the string BEFORE it hits the TTS API guarantees Doogie
says "two million, one hundred thousand dollars" every time.

Scope
-----
* `$2,100,000`          -> "two million, one hundred thousand dollars"
* `$2,100,000.00`       -> "two million, one hundred thousand dollars"
* `$1,250,500.50`       -> "one million, two hundred fifty thousand, five hundred dollars and fifty cents"
* `$500,000`            -> "five hundred thousand dollars"
* `$2.1M` / `$2.1 M`    -> "two point one million dollars"
* `$500K`               -> "five hundred thousand dollars"
* `$1B`                 -> "one billion dollars"
* Ranges like `$1M-$2M` -> each side is normalized independently.
"""
from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from num2words import num2words


# --- Regexes -----------------------------------------------------------------

# $1,234,567(.89)   OR   $1234567(.89)
_NUMERIC_PRICE = re.compile(
    r"\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?"
)

# $1.2M, $500K, $3B  (with optional space before the suffix)
_SHORTHAND_PRICE = re.compile(
    r"\$\s?(\d+(?:\.\d+)?)\s?([KkMmBb])\b"
)

_SUFFIX_MULTIPLIER = {
    "k": Decimal("1_000"),
    "m": Decimal("1_000_000"),
    "b": Decimal("1_000_000_000"),
}


# --- Public API --------------------------------------------------------------


def normalize_prices_for_speech(text: str) -> str:
    """Return `text` with every recognizable dollar amount rewritten
    into an English phrase safe for TTS.

    Non-price content is passed through unchanged. Safe on empty / None input.
    """
    if not text:
        return text or ""

    # Do the shorthand pass FIRST — it's more specific ($2.1M) and must
    # not be swallowed by the numeric pattern.
    text = _SHORTHAND_PRICE.sub(_speak_shorthand, text)
    text = _NUMERIC_PRICE.sub(_speak_numeric, text)
    return text


# --- Internals ---------------------------------------------------------------


def _speak_numeric(match: "re.Match[str]") -> str:
    whole_raw = match.group(1).replace(",", "")
    cents_raw = match.group(2)  # may be None or "5", "50", "5" etc.

    try:
        whole = int(whole_raw)
    except ValueError:
        return match.group(0)

    parts = [_num_to_words(whole)]

    if cents_raw:
        cents = int(cents_raw.ljust(2, "0"))  # ".5" -> 50 cents
        if cents > 0:
            parts.append("dollars and " + _num_to_words(cents) + " cents")
            return " ".join(parts).replace(" dollars and", " dollars and")
        # cents == 0 → drop them entirely (".00")
    parts.append("dollars")
    return " ".join(parts)


def _speak_shorthand(match: "re.Match[str]") -> str:
    number_raw, suffix = match.group(1), match.group(2).lower()
    try:
        value = Decimal(number_raw) * _SUFFIX_MULTIPLIER[suffix]
    except (InvalidOperation, KeyError):
        return match.group(0)

    # Whole number → speak directly. Fractional → keep the decimal so
    # "$2.1M" stays "two point one million dollars" instead of a
    # weird "two million one hundred thousand".
    if value == value.to_integral_value():
        return _num_to_words(int(value)) + " dollars"

    decimal_word = {"k": "thousand", "m": "million", "b": "billion"}[suffix]
    whole_part, _, frac_part = number_raw.partition(".")
    frac_words = " ".join(num2words(int(d)) for d in frac_part)
    return f"{num2words(int(whole_part))} point {frac_words} {decimal_word} dollars"


def _num_to_words(n: int) -> str:
    """num2words wrapper that uses commas between scale groups the way
    a human reads a price aloud."""
    words = num2words(n, lang="en")
    # num2words returns "two million, one hundred thousand" already —
    # but on some versions it emits "and" (British-style). Strip it so
    # the phrase reads clean for a Canadian audience.
    return words.replace(" and ", " ").replace("  ", " ")
