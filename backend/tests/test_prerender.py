"""
Unit tests for services/prerender_service.py

Run:  cd /app/backend && pytest tests/test_prerender.py -v
"""
import pytest
from services.prerender_service import (
    is_bot, is_prerenderable, ttl_for, compliance_check,
    TTL_LISTING, TTL_COMMUNITY, TTL_GLOSSARY, TTL_DEFAULT,
)


# --- Bot UA detection --------------------------------------------------

@pytest.mark.parametrize("ua", [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0)",
    "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
    "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "facebookexternalhit/1.1",
    "Twitterbot/1.0",
    "Slackbot-LinkExpanding 1.0",
    "Mozilla/5.0 (compatible; CCBot/2.0; +https://commoncrawl.org/faq/)",
    "Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)",
])
def test_is_bot_true(ua):
    assert is_bot(ua) is True


@pytest.mark.parametrize("ua", [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)",
    "",
])
def test_is_bot_false(ua):
    assert is_bot(ua) is False


# --- PIPA / auth blocklist --------------------------------------------

@pytest.mark.parametrize("path", [
    "/", "/glossary", "/glossary/property-transfer-tax-ptt",
    "/community/kitsilano", "/listing/12345678", "/about", "/valuation",
])
def test_is_prerenderable_public(path):
    assert is_prerenderable(path) is True


@pytest.mark.parametrize("path", [
    "/api/anything",
    "/api/bot/glossary",
    "/admin",
    "/admin/leads",
    "/my-account",
    "/my-account/settings",
    "/favorites",
    "/favorites/list",
    "/dashboard",
    "/login",
    "/signup",
    "/auth/callback",
    "/consultation/status/xyz",
    "/consultation-status/abc",
    "/doogie/upload",
    "/uploads/file.pdf",
    "/snapshot/glossary/foo.html",
])
def test_is_prerenderable_blocklist(path):
    assert is_prerenderable(path) is False, f"{path} should be blocklisted (PIPA)"


def test_is_prerenderable_rejects_invalid():
    assert is_prerenderable("") is False
    assert is_prerenderable("no-leading-slash") is False
    assert is_prerenderable(None) is False  # type: ignore


# --- TTL routing --------------------------------------------------------

def test_ttl_listing():
    assert ttl_for("/listing/12345") == TTL_LISTING
    assert ttl_for("/listings") == TTL_LISTING
    assert ttl_for("/property/mls-abc") == TTL_LISTING


def test_ttl_community():
    assert ttl_for("/community/kitsilano") == TTL_COMMUNITY
    assert ttl_for("/communities") == TTL_COMMUNITY
    assert ttl_for("/neighbourhood/coquitlam-west") == TTL_COMMUNITY


def test_ttl_glossary():
    assert ttl_for("/glossary") == TTL_GLOSSARY
    assert ttl_for("/glossary/ptt") == TTL_GLOSSARY


def test_ttl_default():
    assert ttl_for("/") == TTL_DEFAULT
    assert ttl_for("/about") == TTL_DEFAULT
    assert ttl_for("/valuation") == TTL_DEFAULT


# --- Compliance post-render check --------------------------------------

BCFSA_FOOTER = "Regulated by BCFSA under the Real Estate Services Act (RESA)"
CREA_ATTR = "Listing courtesy of Fraser Realty · MLS® data provided under CREA DDF®"


def _shell(body: str) -> str:
    return f"<html><body>{body}<footer>{BCFSA_FOOTER}</footer></body></html>" + ("x" * 500)


def test_compliance_ok_public_page():
    ok, reason = compliance_check("/glossary/foo", _shell("<h1>Definition</h1>"))
    assert ok is True
    assert reason is None


def test_compliance_ok_listing_with_mls():
    body = f"<h1>Listing</h1><p>{CREA_ATTR}</p>"
    ok, reason = compliance_check("/listing/12345", _shell(body))
    assert ok is True


def test_compliance_fail_empty_shell():
    ok, reason = compliance_check("/glossary/foo", '<html><body><div id="root"></div></body></html>' + ("x"*600))
    assert ok is False
    assert reason == "empty_spa_shell"


def test_compliance_fail_html_too_short():
    ok, reason = compliance_check("/glossary/foo", "<html></html>")
    assert ok is False
    assert reason == "html_too_short"


def test_compliance_fail_missing_bcfsa():
    body = "<html><body>" + ("just some content " * 40) + "</body></html>"
    ok, reason = compliance_check("/glossary/foo", body)
    assert ok is False
    assert reason == "missing_bcfsa_disclosure"


def test_compliance_fail_listing_missing_mls():
    ok, reason = compliance_check("/listing/12345", _shell("<h1>Property details only, no attribution</h1>"))
    assert ok is False
    assert reason == "missing_listing_attribution"
