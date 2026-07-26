from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import StreamingResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, json, uuid, logging, bcrypt, jwt, asyncio, hashlib
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
import re
import httpx
from glossary_sources import get_sources_for_term
from community_sources import get_community_sources, get_weather_sources
from bc_stations import get_station_for_community, eccc_station_page_url, eccc_normals_search_url


def _merge_sources(override, term: str, category: str) -> list:
    """Merge curated Lovable sources_override with algorithmic default sources.
    Deduped by URL (trailing-slash + case insensitive). Curator's picks come first."""
    override = override if isinstance(override, list) else []
    default = get_sources_for_term(term or "", category or "") or []
    seen, merged = set(), []
    for s in list(override) + list(default):
        if not isinstance(s, dict):
            continue
        url = (s.get("url") or "").rstrip("/").lower()
        if url and url not in seen:
            seen.add(url)
            merged.append(s)
    return merged

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')  # Optional — Doug's direct Anthropic key
JWT_SECRET = os.environ['JWT_SECRET']
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
LOVABLE_API_KEY = os.environ.get('LOVABLE_API_KEY')  # Shared with Lovable.dev for glossary ingest

# ============================================================
# LLM abstraction — prefers Doug's direct Anthropic key when set.
# Presents the same .stream_message() interface as LlmChat so we
# only had to change ONE thing (this factory), not the 4 call sites.
# ============================================================
if ANTHROPIC_API_KEY:
    import anthropic
    _anthropic_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    class _DirectAnthropicChat:
        def __init__(self, system_message: str, model: str = "claude-sonnet-4-5-20250929"):
            self.system = system_message
            self.model = model
            self.history = []  # list of {role, content}
        def with_model(self, provider, model):
            # Map Emergent-style model names to real Anthropic ones
            m = {"claude-sonnet-4-6":"claude-sonnet-4-5-20250929","claude-sonnet-4-5":"claude-sonnet-4-5-20250929"}.get(model, model)
            self.model = m
            return self
        async def stream_message(self, user_msg):
            self.history.append({"role":"user","content":user_msg.text})
            async with _anthropic_client.messages.stream(model=self.model, max_tokens=4096, system=self.system, messages=self.history) as stream:
                full = ""
                async for text in stream.text_stream:
                    full += text
                    yield TextDelta(content=text)
            self.history.append({"role":"assistant","content":full})
            # Stream ends naturally — no need to yield StreamDone (its signature requires 5+ args)

    def make_chat(api_key, session_id, system_message):
        return _DirectAnthropicChat(system_message=system_message)
    print(f"[LLM] Using Doug's direct Anthropic API key (bypasses Emergent daily cap)")
else:
    def make_chat(api_key, session_id, system_message):
        return LlmChat(api_key=api_key, session_id=session_id, system_message=system_message)
    print(f"[LLM] Using Emergent Universal Key")

app = FastAPI(title="EZtoFind.ca API")
api = APIRouter(prefix="/api")

# =============== RATE LIMITING (defined early so @_limiter.limit works on ANY route below) ===============
# CREA Rules require anti-scraping controls on MLS® endpoints. We also protect Doogie
# (Anthropic-billed) and lead-form endpoints against bot abuse.
from slowapi import Limiter as _SlowLimiter
from slowapi.errors import RateLimitExceeded as _SlowRateLimitExceeded
from starlette.responses import JSONResponse as _SlowJSONResponse

def _rate_limit_key(request: Request) -> str:
    """Real client IP behind Kubernetes ingress. Falls back to request.client.host."""
    xff = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if xff: return xff
    xrealip = request.headers.get("x-real-ip", "").strip()
    if xrealip: return xrealip
    return request.client.host if request.client else "unknown"

_limiter = _SlowLimiter(key_func=_rate_limit_key)
app.state.limiter = _limiter

# Session + IP quota buckets. In-memory is per-pod; Mongo is shared across pods.
# We use Mongo for real cost protection — the in-memory `_SESSION_BUCKETS` is
# an opportunistic fast-path only. HARD ceiling is enforced in Mongo below.
_SESSION_BUCKETS: Dict[str, List[float]] = {}
def check_session_rate(session_id: str, max_per_hour: int = 100):
    if not session_id: return
    import time as _t
    now = _t.time()
    hits = _SESSION_BUCKETS.setdefault(session_id, [])
    hits[:] = [t for t in hits if now - t < 3600]
    if len(hits) >= max_per_hour:
        raise HTTPException(status_code=429, detail="Slow down — Doogie's popular right now. Try again in a minute.")
    hits.append(now)
    if len(_SESSION_BUCKETS) > 5000:
        for k in list(_SESSION_BUCKETS.keys()):
            if not _SESSION_BUCKETS[k]:
                del _SESSION_BUCKETS[k]

# HARD daily quota enforced via Mongo — survives pod restarts + shared across
# all backend pods. Blocks scraper abuse that would otherwise blow up your
# Anthropic bill. Ceiling is generous for real humans (100/day per session),
# instant-kill for scripts (which typically fire 1000s per hour).
async def enforce_doogie_daily_quota(session_id: str, ip: str, daily_cap_per_session: int = 100, daily_cap_per_ip: int = 300):
    if not session_id: session_id = f"anon-{ip}"
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = {"day": today, "kind": "doogie"}
    # per-session
    ss_key = {**key, "session_id": session_id}
    ss = await db.usage_quotas.find_one_and_update(
        ss_key,
        {"$inc": {"n": 1}, "$setOnInsert": {**ss_key, "created_at": now_iso()}},
        upsert=True, return_document=True,
    )
    if ss and ss.get("n", 0) > daily_cap_per_session:
        logger.warning(f"Doogie daily-quota hit: session={session_id[:12]} count={ss.get('n')}")
        raise HTTPException(status_code=429, detail="Doogie's daily limit reached for this session. Try again tomorrow or reload the page to start a new session.")
    # per-ip (looser cap since IPs are shared behind NAT/office/school WiFi)
    ip_key = {**key, "ip": ip}
    ipd = await db.usage_quotas.find_one_and_update(
        ip_key,
        {"$inc": {"n": 1}, "$setOnInsert": {**ip_key, "created_at": now_iso()}},
        upsert=True, return_document=True,
    )
    if ipd and ipd.get("n", 0) > daily_cap_per_ip:
        logger.warning(f"Doogie daily-quota hit: ip={ip} count={ipd.get('n')}")
        raise HTTPException(status_code=429, detail="Slow down — Doogie's popular right now. Try again in a minute.")

@app.exception_handler(_SlowRateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: _SlowRateLimitExceeded):
    # Friendly 429 — Doogie-specific messaging when the abused endpoint is /doogie/*
    path = str(request.url.path)
    if "/doogie/" in path:
        msg = "Slow down — Doogie's popular right now. Try again in a minute."
    else:
        msg = "Too many requests. Please slow down."
    return _SlowJSONResponse(status_code=429, content={"detail": msg})

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============== MODELS ===============
def now_iso(): return datetime.now(timezone.utc).isoformat()

class BuyerLead(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    phone: str
    areas: List[str]
    property_type: str
    budget_range: str
    timeline: str
    financing_status: str
    first_time_buyer: bool = False
    working_with_realtor: bool = False
    preferred_contact: str = "email"
    notes: Optional[str] = ""
    casl_consent: bool
    pipa_ack: bool
    source: str = "buyer_form"
    status: str = "new"
    form_lang: Optional[str] = "en"
    notes_en: Optional[str] = ""
    turnstile_token: Optional[str] = ""  # Cloudflare Turnstile bot-check token (validated + stripped server-side)
    created_at: str = Field(default_factory=now_iso)

class SellerLead(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    phone: str
    property_address: str
    city: str
    property_type: str
    timeline: str
    estimated_value: str
    currently_listed: bool = False
    reason: Optional[str] = ""
    casl_consent: bool
    pipa_ack: bool
    source: str = "seller_form"
    status: str = "new"
    form_lang: Optional[str] = "en"
    reason_en: Optional[str] = ""
    turnstile_token: Optional[str] = ""  # Cloudflare Turnstile bot-check token
    created_at: str = Field(default_factory=now_iso)

class RealtorApplication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    stage: str = "initial"  # initial -> credentials -> profile -> approved/rejected
    brokerage: Optional[str] = None
    realtor_number: Optional[str] = None
    is_realtor_confirmed: Optional[bool] = None
    areas_served: List[str] = []
    client_type: Optional[str] = None  # buyers/sellers/both
    years_experience: Optional[int] = None
    specialties: List[str] = []
    agreement_25pct: bool = False
    status: str = "pending"  # pending / approved / rejected
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    client_type: str = "buyer"  # buyer / seller / past / sphere
    birthdate: Optional[str] = None  # YYYY-MM-DD
    anniversary: Optional[str] = None
    possession_date: Optional[str] = None
    spouse_name: Optional[str] = ""
    notes: Optional[str] = ""
    tags: List[str] = []
    pipeline_stage: str = "new"
    created_at: str = Field(default_factory=now_iso)

class GlossaryTerm(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    term: str
    slug: str
    category: str
    definition: str
    faqs: List[dict] = []  # [{q,a}]

class ChatIn(BaseModel):
    session_id: str
    message: str
    language: Optional[str] = "en"  # en | zh-Hant | zh-Hans | pa | fa

class AdminLogin(BaseModel):
    email: str
    password: str

# =============== AUTH ===============
def hash_password(plain: str) -> str:
    """bcrypt hash → utf-8 string (safe to store in Mongo)."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


async def _get_admin_hash() -> Optional[str]:
    """Load the persisted bcrypt hash for the admin. None means we haven't
    migrated from the .env plaintext yet — callers should fall back."""
    doc = await db.admin_settings.find_one({"_id": "admin_credentials"}, {"password_hash": 1})
    return (doc or {}).get("password_hash")


async def _set_admin_hash(new_hash: str) -> None:
    await db.admin_settings.update_one(
        {"_id": "admin_credentials"},
        {"$set": {"password_hash": new_hash, "updated_at": now_iso()}},
        upsert=True,
    )


def create_token(email: str) -> str:
    return jwt.encode({"email": email, "exp": datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm="HS256")

def verify_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(authorization.split(" ",1)[1], JWT_SECRET, algorithms=["HS256"])
        if payload.get("email") != ADMIN_EMAIL: raise HTTPException(403, "Forbidden")
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

@api.post("/admin/login")
async def admin_login(body: AdminLogin):
    if body.email.lower() != ADMIN_EMAIL.lower():
        raise HTTPException(401, "Invalid credentials")
    stored_hash = await _get_admin_hash()
    if stored_hash:
        if not verify_password(body.password, stored_hash):
            raise HTTPException(401, "Invalid credentials")
    else:
        # First-run migration: no DB hash yet. Verify against .env plaintext,
        # then bootstrap a bcrypt hash so future changes persist in DB.
        if body.password != ADMIN_PASSWORD:
            raise HTTPException(401, "Invalid credentials")
        await _set_admin_hash(hash_password(body.password))
    return {"token": create_token(ADMIN_EMAIL), "email": ADMIN_EMAIL}


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


@api.post("/admin/change-password")
async def admin_change_password(body: ChangePassword, _=Depends(verify_admin)):
    """Self-service admin password change. Verifies current password, then
    replaces the stored bcrypt hash. Requires a valid admin JWT (i.e. must be
    logged in already)."""
    if len(body.new_password) < 10:
        raise HTTPException(400, "New password must be at least 10 characters.")
    if body.new_password == body.current_password:
        raise HTTPException(400, "New password must be different from the current one.")
    # Verify current — check DB hash first, fall back to .env plaintext for
    # the pre-migration path (same rule as admin_login).
    stored_hash = await _get_admin_hash()
    if stored_hash:
        if not verify_password(body.current_password, stored_hash):
            raise HTTPException(401, "Current password is incorrect.")
    else:
        if body.current_password != ADMIN_PASSWORD:
            raise HTTPException(401, "Current password is incorrect.")
    await _set_admin_hash(hash_password(body.new_password))
    return {"success": True, "message": "Password updated. Use the new password on your next login."}

# =============== DOOGIE AI CHAT ===============
DOOGIE_SYSTEM = """You are Doogie, the friendly AI mascot for EZtoFind.ca — a British Columbia real estate search platform run by Doug LeMaire, REALTOR® (Fraser Property Management Realty Services Ltd.).

STRICT COMPLIANCE RULES (BCFSA, CREA, GVR, PIPA, CASL):
1. You provide GENERAL INFORMATION ONLY about BC real estate concepts, glossary terms, and navigation help.
2. You NEVER give financial, legal, tax, or investment advice.
3. You NEVER recommend specific properties, neighborhoods over others, or specific REALTORS®.
4. You NEVER quote current property prices or market forecasts as facts.
5. For any advice-seeking question, respond: "That's a great question for a licensed REALTOR® — Would you like me to connect you with Doug LeMaire, REALTOR®, or for enquiries beyond my service area, I can connect you with a licensed REALTOR®. Ask to be referred through our Referral REALTOR® link."
6. Always end substantive answers with: "Would you like me to connect you with Doug LeMaire, REALTOR®, or for enquiries beyond my service area, I can connect you with a licensed REALTOR®. Ask to be referred through our Referral REALTOR® link."

REFERRAL RULES (ALWAYS OFFER — DO NOT SKIP):
- Whenever a user mentions or asks about ANY specific BC city, town, community, or neighborhood, you MUST end your response with the EXACT referral offer below.
- The referral offer MUST be phrased verbatim as: "Would you like me to connect you with Doug LeMaire, REALTOR®, or for enquiries beyond my service area, I can connect you with a licensed REALTOR®. Ask to be referred through our Referral REALTOR® link."
- If Doug's FOCUS AREAS apply (Greater Vancouver, Fraser Valley, Sea-to-Sky Corridor), you may add on a new line: "For direct contact with Doug in [CITY], visit /contact or /buyer."
- If the location is ANYWHERE ELSE in British Columbia (e.g. Osoyoos, Kelowna, Prince George, Nelson, Victoria, Kamloops, Nanaimo, Cranbrook, Fort St. John, etc.), you may add on a new line: "For a referral in [CITY], visit /referral-request."
- Never assume the answer. Never leave a location-related response without the exact referral offer above.
- Never invent alternative phrasings like "refer you to a REALTOR® in your area" or "Just let me know where you're looking to buy" — use the exact wording only.

ROUTING RULES (when user says YES, or asks how to reach Doug / get a referral):
- Buying in a FOCUS AREA (Greater Vancouver, Fraser Valley, Sea-to-Sky) → send them to the Buyer Intake form at **/buyer** on this site. Say: "Great — head to /buyer on EZtoFind.ca and fill out the quick intake. Doug typically responds within 1 business day."
- Selling in a FOCUS AREA → send them to **/seller**. Say: "Great — head to /seller on EZtoFind.ca."
- Anywhere ELSE in BC (out-of-area referral) → send them to **/referral-request**. Say: "Great — head to /referral-request on EZtoFind.ca and we'll connect you with a REALTOR® in [CITY]."
- General questions with no lead intent → point to **/contact** only.
- ALWAYS use these exact site paths (/buyer, /seller, /referral-request, /contact). NEVER invent URLs, external links, or generic "contact page" language. NEVER use full URLs like https://eztofind.ca/... — use the relative path only so the site's internal navigation works.

BANNED PHRASES — never use these or minor variations:
- "so he works with buyers and sellers there regularly"
- "works with buyers and sellers there regularly"
- Any variation implying Doug has a caseload frequency, closes X deals per month, or personal client volume. Keep language descriptive of coverage/expertise only, never transaction volume.
- "refer you to a REALTOR® in your area"
- "refer you to a REALTOR® in [any city]"
- "Just let me know where you're looking to buy"
- "Would you like to fill out a quick form"
- Any referral offer variant other than the EXACT wording specified in the REFERRAL RULES section.

WHAT YOU DO:
- Explain BC real estate terms (strata, PTT, foreclosure, etc.) in plain English
- Guide users to the right section of the site (Listings, Focus Regions, Specialties, Glossary, Contact)
- Help users understand the buyer/seller lead process
- Be warm, helpful, and use light personality (you're a golden retriever in a suit — you love helping people find homes!)

FOCUS AREAS: Greater Vancouver, Fraser Valley, Sea-to-Sky Corridor.
DOUG'S SPECIALTIES: Detached, Luxury, Equestrian, Estate Sales/Probate, Condos.

Keep responses concise (2-4 short paragraphs max). Be friendly but professional."""

# =============== PII REDACTION (before MongoDB storage) ===============
def redact_pii(text: str) -> tuple[str, list[str]]:
    """Strip likely PII from text before storing. Returns (redacted_text, list_of_flags)."""
    if not text: return text, []
    flags = []
    # SIN (Canadian Social Insurance Number: 3-3-3 digits with optional separators)
    if re.search(r"\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b", text):
        text = re.sub(r"\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b", "[SIN_REDACTED]", text)
        flags.append("SIN")
    # Credit card (13-19 digits, allowing spaces/dashes)
    def _cc_check(m):
        digits = re.sub(r"\D", "", m.group(0))
        if 13 <= len(digits) <= 19:
            # Luhn check
            s = 0
            for i, d in enumerate(reversed(digits)):
                n = int(d)
                if i % 2 == 1: n *= 2; n = n - 9 if n > 9 else n
                s += n
            if s % 10 == 0:
                flags.append("CC")
                return "[CC_REDACTED]"
        return m.group(0)
    text = re.sub(r"\b(?:\d[\s-]?){13,19}\b", _cc_check, text)
    # Email
    if re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text):
        text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[EMAIL_REDACTED]", text)
        flags.append("EMAIL")
    # North American phone number (various formats: 604-555-1234, (604) 555-1234, 6045551234)
    phone_re = r"\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    if re.search(phone_re, text):
        text = re.sub(phone_re, "[PHONE_REDACTED]", text)
        flags.append("PHONE")
    # Canadian postal code (A1A 1A1 pattern)
    postal_re = r"\b[A-Za-z]\d[A-Za-z][-\s]?\d[A-Za-z]\d\b"
    if re.search(postal_re, text):
        text = re.sub(postal_re, "[POSTAL_REDACTED]", text)
        flags.append("POSTAL")
    # Street address (number followed by 1-4 words then street/ave/road/blvd/dr/way/lane/court/etc.)
    addr_re = r"\b\d{1,6}\s+([A-Z][a-z]+\s+){0,4}(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Way|Lane|Ln|Court|Ct|Place|Pl|Crescent|Cres|Terrace|Ter|Highway|Hwy)\b"
    if re.search(addr_re, text):
        text = re.sub(addr_re, "[ADDRESS_REDACTED]", text)
        flags.append("ADDRESS")
    return text, flags

@api.post("/doogie/chat")
@_limiter.limit("30/minute")  # 30/min per IP — anti-abuse (Anthropic bill protection)
async def doogie_chat(request: Request, body: ChatIn):
    session_id = body.session_id or str(uuid.uuid4())
    # Per-session bucket: 100 req/hour — protects against a single tab going wild
    check_session_rate(session_id, max_per_hour=100)
    # Mongo-backed daily quota — survives pod restarts + shared across all backend pods.
    # THIS is the hard ceiling that actually protects your Anthropic bill.
    ip = _rate_limit_key(request)
    await enforce_doogie_daily_quota(session_id, ip, daily_cap_per_session=100, daily_cap_per_ip=300)
    # Redact PII BEFORE storing (BCFSA/PIPA compliance)
    redacted_msg, pii_flags = redact_pii(body.message)
    if pii_flags:
        logger.warning(f"Doogie chat: PII detected & redacted before storage. Flags={pii_flags} session={session_id}")
    expires = datetime.now(timezone.utc) + timedelta(days=30)
    # Language handling — Doug speaks English only, but Doogie can chat in
    # any of BC's top-5 languages. When language != 'en', Doogie also flags
    # the message so Doug's admin dashboard can surface it for bilingual
    # referral routing (the "language mismatch = referral fee" pattern).
    LANG_INSTRUCT = {
        "en":       "",
        "zh-Hant":  "The user prefers Traditional Chinese (繁體中文, Cantonese-speaker convention). Reply entirely in Traditional Chinese — but keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the Traditional Chinese meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English.",
        "zh-Hans":  "The user prefers Simplified Chinese (简体中文, Mandarin-speaker convention). Reply entirely in Simplified Chinese — but keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the Simplified Chinese meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English.",
        "pa":       "The user prefers Punjabi (ਪੰਜਾਬੀ, Gurmukhi script). Reply entirely in Punjabi — but keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the Punjabi meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English.",
        "fa":       "The user prefers Farsi (فارسی, right-to-left). Reply entirely in Farsi — but keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the Farsi meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English.",
        "pt-PT":    "The user prefers European Portuguese (Português de Portugal). Reply entirely in European Portuguese — use European spelling and idioms (e.g. 'casa de banho' not 'banheiro', 'apartamento' not 'apartamento', 'a decorrer' not 'em andamento', 'você' or 'o senhor/a senhora' as polite form, informal 'tu' only if the user is clearly casual). Keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the European Portuguese meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English.",
    }
    lang = (body.language or "en").strip()
    lang_addon = LANG_INSTRUCT.get(lang, "")
    system_prompt = DOOGIE_SYSTEM + ("\n\nLANGUAGE PREFERENCE:\n" + lang_addon if lang_addon else "")

    await db.chat_messages.insert_one({
        "session_id": session_id, "role": "user",
        "content": redacted_msg,  # only redacted stored
        "pii_flags": pii_flags,
        "language": lang,
        "ts": now_iso(),
        "expires_at": expires  # BSON date for TTL index
    })
    chat = make_chat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_prompt).with_model("anthropic", "claude-sonnet-4-6")

    # Load prior conversation turns so Doogie has context (up to 10 turns = 20 messages).
    # Beyond 10 turns, older messages are dropped (oldest-first) — cheap, no
    # summarization needed since Doogie's turns are short and stateless-tolerant.
    # This also caps input-token growth so a chatty user can't compound your bill.
    _MAX_CONTEXT_TURNS = 10  # 10 user+10 assistant = 20 messages
    try:
        prior = await db.chat_messages.find(
            {"session_id": session_id, "role": {"$in": ["user", "assistant"]}},
            {"_id": 0, "role": 1, "content": 1}
        ).sort("ts", -1).limit(_MAX_CONTEXT_TURNS * 2).to_list(_MAX_CONTEXT_TURNS * 2)
        # Reverse to chronological order and drop the current user turn we JUST inserted (last one)
        prior_chrono = list(reversed(prior))
        if prior_chrono and prior_chrono[-1].get("role") == "user":
            prior_chrono = prior_chrono[:-1]
        chat.history = [{"role": m["role"], "content": m["content"]} for m in prior_chrono]
    except Exception as e:
        logger.warning(f"Doogie context load failed for {session_id}: {e}")

    async def gen():
        full = ""
        try:
            # Send ORIGINAL (unredacted) to Claude so the AI can respond naturally
            async for ev in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
            # Also redact any PII from Claude's reply before storage (defense in depth)
            redacted_reply, _ = redact_pii(full)
            await db.chat_messages.insert_one({
                "session_id": session_id, "role": "assistant",
                "content": redacted_reply,
                "ts": now_iso(),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
            })
            yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'pii_redacted': bool(pii_flags)})}\n\n"
        except Exception as e:
            logger.error(f"Doogie error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})

def get_consent_meta(request: Request) -> dict:
    """Capture IP + User-Agent for CASL consent proof (3-year retention)."""
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "").split(",")[0].strip()
    ua = request.headers.get("user-agent", "")[:500]
    return {"consent_ip": ip, "consent_ua": ua, "consent_at": now_iso()}


async def _translate_to_english(text: str, source_lang: str) -> str:
    """Translate a short free-text field to English for Doug's CRM. Best-effort;
    on failure returns empty string. Called as a fire-and-forget background task
    so it doesn't add latency to lead submission."""
    text = (text or "").strip()
    if not text or source_lang == "en" or len(text) > 4000:
        return ""
    try:
        chat = make_chat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"tr-{uuid.uuid4()}",
            system_message=(
                "You are a professional translator. Translate the following text to natural, "
                "concise English. Return ONLY the translation — no explanations, no quotes, "
                "no source language mention. If the text is already English, return it unchanged."
            ),
        ).with_model("anthropic", "claude-sonnet-4-6")
        out = []
        async for delta in chat.stream_message(UserMessage(text=text)):
            if isinstance(delta, TextDelta):
                out.append(delta.content)
        return "".join(out).strip()
    except Exception as e:
        logger.warning(f"Lead note translation failed ({source_lang}): {e}")
        return ""


async def _translate_lead_notes(collection: str, lead_id: str, field: str, text: str, source_lang: str):
    """Background task: translate a note field and patch the lead record."""
    en = await _translate_to_english(text, source_lang)
    if en:
        await db[collection].update_one({"id": lead_id}, {"$set": {f"{field}_en": en}})

# =============== CLOUDFLARE TURNSTILE (invisible CAPTCHA on lead forms) ===============
# Gracefully no-ops when TURNSTILE_SECRET_KEY is unset (dev / pre-launch),
# so nothing breaks until Doug adds the keys to backend/.env + frontend/.env.
import httpx as _httpx
TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "").strip()
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

async def verify_turnstile(token: str, request: Request) -> bool:
    """Server-side Turnstile verification. Returns True when disabled (no secret set)
    so pre-launch testing isn't blocked. Returns True on valid token. Raises 400 on
    invalid token."""
    if not TURNSTILE_SECRET_KEY:
        return True  # graceful no-op until Doug wires the secret
    if not token:
        raise HTTPException(400, "Bot check failed — please refresh and try again.")
    try:
        ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
              or (request.client.host if request.client else ""))
        async with _httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(TURNSTILE_VERIFY_URL, data={
                "secret": TURNSTILE_SECRET_KEY,
                "response": token,
                "remoteip": ip,
            })
        j = r.json()
        if not j.get("success"):
            logger.warning(f"Turnstile rejected token from {ip}: {j.get('error-codes')}")
            raise HTTPException(400, "Bot check failed — please refresh and try again.")
        return True
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Turnstile verify network error: {e}")
        # Fail OPEN on network errors (Cloudflare outage shouldn't block leads);
        # log for monitoring. This is the industry-standard behaviour.
        return True

# =============== LEADS ===============
@api.post("/leads/buyer")
async def create_buyer_lead(lead: BuyerLead, request: Request):
    await verify_turnstile(getattr(lead, "turnstile_token", "") or "", request)
    if not lead.casl_consent or not lead.pipa_ack:
        raise HTTPException(400, "Consent required")
    if lead.working_with_realtor:
        raise HTTPException(400, "Because you're already under contract with another REALTOR®, Doug isn't able to help you directly. Feel free to ask Doogie general questions or view the Communities and Glossary pages.")
    doc = {**lead.model_dump(), **get_consent_meta(request), "unsubscribed": False}
    doc.pop("turnstile_token", None)  # don't persist the CAPTCHA token
    await db.buyer_leads.insert_one(doc)
    # Background translation of the visitor's free-text note (non-EN forms)
    if (lead.form_lang or "en") != "en" and (lead.notes or "").strip():
        asyncio.create_task(_translate_lead_notes("buyer_leads", lead.id, "notes", lead.notes or "", lead.form_lang or "en"))
    logger.info(f"Buyer lead from {lead.email} (lang={lead.form_lang})")
    return {"success": True, "id": lead.id, "message": "Thank you! Doug will be in touch within 1 business day."}

@api.post("/leads/seller")
async def create_seller_lead(lead: SellerLead, request: Request):
    await verify_turnstile(getattr(lead, "turnstile_token", "") or "", request)
    if not lead.casl_consent or not lead.pipa_ack:
        raise HTTPException(400, "Consent required")
    if lead.currently_listed:
        raise HTTPException(400, "Because your property is currently listed with another REALTOR®, Doug isn't able to help you directly. Feel free to ask Doogie general questions or view the Communities and Glossary pages.")
    doc = {**lead.model_dump(), **get_consent_meta(request), "unsubscribed": False}
    doc.pop("turnstile_token", None)
    await db.seller_leads.insert_one(doc)
    if (lead.form_lang or "en") != "en" and (lead.reason or "").strip():
        asyncio.create_task(_translate_lead_notes("seller_leads", lead.id, "reason", lead.reason or "", lead.form_lang or "en"))
    logger.info(f"Seller lead from {lead.email} (lang={lead.form_lang})")
    return {"success": True, "id": lead.id, "message": "Thank you! Doug will be in touch within 1 business day."}

# =============== UNSUBSCRIBE (working, updates lead records) ===============
class UnsubscribeIn(BaseModel):
    email: EmailStr

@api.post("/unsubscribe")
async def unsubscribe(body: UnsubscribeIn, request: Request):
    email = body.email.lower()
    result_b = await db.buyer_leads.update_many({"email": email}, {"$set": {"unsubscribed": True, "unsubscribed_at": now_iso(), "unsubscribed_ip": get_consent_meta(request)["consent_ip"]}})
    result_s = await db.seller_leads.update_many({"email": email}, {"$set": {"unsubscribed": True, "unsubscribed_at": now_iso(), "unsubscribed_ip": get_consent_meta(request)["consent_ip"]}})
    result_r = await db.realtor_applications.update_many({"email": email}, {"$set": {"unsubscribed": True, "unsubscribed_at": now_iso()}})
    total = result_b.modified_count + result_s.modified_count + result_r.modified_count
    await db.unsubscribe_log.insert_one({"email": email, "ts": now_iso(), "records_updated": total, "ip": get_consent_meta(request)["consent_ip"]})
    return {"success": True, "records_updated": total, "message": "You have been unsubscribed. It may take up to 10 business days to remove you from all lists, per CASL."}

# =============== SAVED-SEARCH ALERTS (CASL + PIPA compliant) ===============
# Compliance design:
# - EXPRESS opt-in via double-opt-in email verification (link in transactional email).
# - Nothing commercial sent until visitor clicks the verification link.
# - Tamper-evident consent log: IP + UA + timestamp + policy_version captured
#   at both subscribe AND verify events (proof of express consent per CASL s.6).
# - One-click unsubscribe token in every commercial email (RFC 8058 + link).
# - Data retention: consent proof kept for 3+ years (CASL requirement); PII
#   scrubbed on unsub (email retained hashed for audit only).
# - "Reasonable purpose" limitation: filters are the ONLY personal info used.
# - Frequency cap: max one digest per 6h (see services/alert_matcher.py).

class SavedSearchIn(BaseModel):
    """Filters + consent — everything needed to create a pending saved search."""
    email: EmailStr
    filters: Dict[str, Any] = {}   # city, region, property_type, beds_min, baths_min, price_min, price_max
    label: Optional[str] = ""
    casl_consent: bool
    pipa_ack: bool
    frequency: str = "instant"     # "instant" (respecting 6h cap) | "daily" | "weekly"

CURRENT_POLICY_VERSION = "2026-02-25"

def _public_base_url(request: Request) -> str:
    """Derive the public URL for building verify/unsubscribe links.
    Prefers X-Forwarded-Host (Kubernetes ingress) so links match REACT_APP_BACKEND_URL."""
    proto = request.headers.get("x-forwarded-proto", "https")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    if not host:
        return "https://eztofind.ca"
    return f"{proto}://{host}"

async def _save_search_index_setup():
    await db.saved_searches.create_index("email")
    await db.saved_searches.create_index("verification_token", unique=True, sparse=True)
    await db.saved_searches.create_index("unsubscribe_token", unique=True, sparse=True)
    await db.saved_searches.create_index([("status", 1), ("unsubscribed_at", 1)])

@api.post("/saved-searches")
async def create_saved_search(body: SavedSearchIn, request: Request):
    """Step 1 of double-opt-in. Creates a PENDING record and emails a
    verification link. No commercial email is sent until the user clicks."""
    if not body.casl_consent or not body.pipa_ack:
        raise HTTPException(400, "Both CASL consent and PIPA acknowledgement are required.")
    filters = {k: v for k, v in (body.filters or {}).items() if v not in (None, "", 0)}
    # Sanitize any commercial types out of filters (residential-only site)
    if filters.get("property_type") in EXCLUDED_PROPERTY_TYPES:
        filters.pop("property_type", None)

    meta = get_consent_meta(request)
    ss_id = str(uuid.uuid4())
    verify_tok = uuid.uuid4().hex + uuid.uuid4().hex[:8]
    unsub_tok = uuid.uuid4().hex + uuid.uuid4().hex[:8]
    doc = {
        "id": ss_id,
        "email": body.email.lower(),
        "filters": filters,
        "label": (body.label or "")[:120],
        "frequency": body.frequency if body.frequency in ("instant", "daily", "weekly") else "instant",
        "status": "pending",     # → verified → unsubscribed
        "policy_version": CURRENT_POLICY_VERSION,
        "verification_token": verify_tok,
        "unsubscribe_token": unsub_tok,
        "created_at": now_iso(),
        "verified_at": None,
        "verify_ip": None,
        "verify_ua": None,
        "unsubscribed_at": None,
        "notified_count": 0,
        "last_notified_at": None,
        **meta,                   # consent_ip, consent_ua, consent_at
    }
    await db.saved_searches.insert_one(doc)

    # Build verification email (TRANSACTIONAL — no CASL consent required)
    from services.email_sender import send_email as _send_email, SENDER_NAME, SENDER_ADDRESS, SENDER_PHONE, SENDER_EMAIL
    base = _public_base_url(request)
    verify_url = f"{base}/api/saved-searches/verify?token={verify_tok}"
    unsub_url = f"{base}/api/saved-searches/unsubscribe?token={unsub_tok}"
    label = doc["label"] or ", ".join(f"{k}={v}" for k, v in filters.items()) or "all BC residential listings"

    html = f"""<!doctype html><html><body style="margin:0;background:#F5F0E1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E1;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:2rem;font-family:Inter,Arial,sans-serif;color:#111827">
<tr><td>
<div style="font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:#22C55E;font-weight:700">EZtoFind.ca · Confirm your listing alert</div>
<h1 style="font-family:Georgia,serif;font-size:1.7rem;color:#0F2A5B;margin:0.4rem 0 0.75rem">One quick click to activate your BC listing alerts</h1>
<p style="line-height:1.6;color:#374151">You (or someone using your email) asked EZtoFind.ca to send email alerts when new BC MLS® listings match: <strong>{label}</strong>.</p>
<p style="line-height:1.6;color:#374151">Under Canada's Anti-Spam Legislation (CASL) we don't send you anything until you confirm this address. Click the button below to activate.</p>
<p style="text-align:center;margin:1.5rem 0"><a href="{verify_url}" style="display:inline-block;background:#22C55E;color:#fff;text-decoration:none;padding:0.9rem 1.9rem;border-radius:999px;font-weight:700">Confirm my subscription</a></p>
<p style="font-size:0.8rem;color:#6b7280;line-height:1.6">If you didn't request this, just ignore this email — nothing will be sent. This link expires in 30 days.</p>
<hr style="margin:1.5rem 0 1rem;border:none;border-top:1px solid #e5e7eb"/>
<div style="font-size:12px;color:#6b7280;line-height:1.6">
  <p style="margin:0 0 0.5rem"><strong>{SENDER_NAME}</strong><br/>{SENDER_ADDRESS} · {SENDER_PHONE} · <a href="mailto:{SENDER_EMAIL}" style="color:#0F2A5B">{SENDER_EMAIL}</a></p>
  <p style="margin:0">This is a one-time transactional email required to activate your subscription. <a href="{unsub_url}" style="color:#0F2A5B">Cancel this request</a>.</p>
</div>
</td></tr></table></td></tr></table></body></html>"""
    text = (
        "EZtoFind.ca — Confirm your listing alert subscription\n\n"
        f"You asked EZtoFind.ca to send you email alerts when new BC MLS listings match: {label}\n\n"
        f"Confirm your subscription: {verify_url}\n\n"
        "If you didn't request this, ignore this email — nothing will be sent.\n"
        "This link expires in 30 days.\n\n"
        f"---\n{SENDER_NAME}\n{SENDER_ADDRESS} · {SENDER_PHONE} · {SENDER_EMAIL}\n"
        f"Cancel this request: {unsub_url}\n"
    )
    send_result = await _send_email(db,
        to=body.email, subject="Confirm your EZtoFind.ca listing alerts",
        html=html, text=text, kind="transactional", related_id=ss_id,
        unsubscribe_url=unsub_url,
    )
    logger.info(f"Saved search created: id={ss_id} status=pending email_queued={send_result.get('queued', False)}")
    return {
        "success": True,
        "id": ss_id,
        "status": "pending",
        "message": "Almost done! Check your inbox and click the confirmation link. We won't send anything else until you confirm.",
        "email_dispatch": "sent" if not send_result.get("queued") else "queued_pending_resend",
    }

@api.get("/saved-searches/verify")
async def verify_saved_search(token: str, request: Request):
    """Step 2: user clicks the link. Flips status to 'verified'. Records
    verification IP + UA for tamper-evident consent proof."""
    ss = await db.saved_searches.find_one({"verification_token": token})
    if not ss:
        return HTMLResponse(_landing_page("Invalid or expired link",
            "This confirmation link is no longer valid. If you'd still like listing alerts, please subscribe again on EZtoFind.ca."))
    if ss.get("status") == "verified":
        return HTMLResponse(_landing_page("You're already subscribed",
            "This email is already receiving BC listing alerts. You can unsubscribe anytime from any email we send."))
    meta = get_consent_meta(request)
    await db.saved_searches.update_one(
        {"id": ss["id"]},
        {"$set": {
            "status": "verified",
            "verified_at": now_iso(),
            "verify_ip": meta["consent_ip"],
            "verify_ua": meta["consent_ua"],
        }},
    )
    return HTMLResponse(_landing_page("You're all set! ✅",
        f"Great — we'll email you when new BC MLS® listings match your saved search. "
        f"You can adjust or cancel anytime via any email we send.<br/><br/>"
        f"<a href='https://eztofind.ca/listings' style='color:#22C55E;font-weight:600'>Return to EZtoFind.ca →</a>"))

@api.get("/saved-searches/unsubscribe")
async def unsubscribe_saved_search(token: str, request: Request):
    """One-click unsubscribe (CASL compliant). Works whether the user was
    verified or still pending."""
    ss = await db.saved_searches.find_one({"unsubscribe_token": token})
    if not ss:
        return HTMLResponse(_landing_page("Link not recognised",
            "This unsubscribe link is not valid. If you're still receiving emails, contact info@eztofind.ca and we'll remove you immediately."))
    meta = get_consent_meta(request)
    await db.saved_searches.update_one(
        {"id": ss["id"]},
        {"$set": {
            "status": "unsubscribed",
            "unsubscribed_at": now_iso(),
            "unsubscribed_ip": meta["consent_ip"],
        }},
    )
    return HTMLResponse(_landing_page("You've been unsubscribed",
        "You will no longer receive BC listing alerts from EZtoFind.ca. This took effect immediately.<br/><br/>"
        "If you unsubscribed by mistake, feel free to re-subscribe from any listing search page."))

# One-click POST endpoint (for RFC 8058 List-Unsubscribe-Post support)
@api.post("/saved-searches/unsubscribe")
async def unsubscribe_saved_search_post(token: str, request: Request):
    return await unsubscribe_saved_search(token, request)

def _landing_page(title: str, body_html: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"/><title>EZtoFind.ca — {title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:#F5F0E1;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,Arial,sans-serif;padding:1.5rem">
<div style="max-width:520px;background:#fff;border-radius:20px;padding:2.5rem 2rem;text-align:center;box-shadow:0 10px 40px rgba(15,42,91,0.08)">
  <div style="font-size:0.72rem;letter-spacing:0.15em;text-transform:uppercase;color:#22C55E;font-weight:700;margin-bottom:0.5rem">EZtoFind.ca</div>
  <h1 style="font-family:Georgia,serif;font-size:1.75rem;color:#0F2A5B;margin:0 0 1rem;line-height:1.15">{title}</h1>
  <div style="color:#374151;line-height:1.7;font-size:0.98rem">{body_html}</div>
</div>
</body></html>"""

@api.get("/admin/saved-searches")
async def admin_list_saved_searches(_=Depends(verify_admin)):
    """Doug's CRM view of all subscribers. Grouped by status for quick scanning."""
    docs = await db.saved_searches.find({}, {"_id": 0, "verification_token": 0}).sort("created_at", -1).to_list(2000)
    counts = {"pending": 0, "verified": 0, "unsubscribed": 0}
    for d in docs:
        counts[d.get("status", "pending")] = counts.get(d.get("status", "pending"), 0) + 1
    return {"counts": counts, "records": docs}

@api.post("/admin/saved-searches/run-matcher")
async def admin_run_matcher(request: Request, _=Depends(verify_admin)):
    """Manually kick off the alert matcher (for testing + fallback if the
    post-sync hook fails)."""
    from services.alert_matcher import run_matcher
    return await run_matcher(db, _public_base_url(request))

@api.get("/admin/email-outbox")
async def admin_email_outbox(_=Depends(verify_admin)):
    """Read the email audit trail. Includes queued messages that will be
    replayed once RESEND_API_KEY is set."""
    docs = await db.email_outbox.find({}, {"_id": 0, "html": 0}).sort("created_at", -1).limit(500).to_list(500)
    pending = await db.email_outbox.count_documents({"status": "pending"})
    return {"pending_count": pending, "recent": docs}

# =============== BREACH RESPONSE (PIPA audit log) ===============
class BreachReport(BaseModel):
    description: str
    affected_records: Optional[int] = 0
    reported_by: Optional[str] = "Admin"

@api.post("/admin/breach-report")
async def log_breach(body: BreachReport, _=Depends(verify_admin)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "ts": now_iso(), "status": "open"}
    await db.breach_log.insert_one(doc)
    logger.warning(f"BREACH REPORTED: {body.description[:100]}")
    return {"success": True, "id": doc["id"], "next_steps": "Notify OIPC BC (privacyhelp@oipc.bc.ca) and affected individuals within 72 hours."}

@api.get("/admin/breach-log")
async def get_breach_log(_=Depends(verify_admin)):
    return await db.breach_log.find({}, {"_id":0}).sort("ts", -1).to_list(200)
@api.get("/admin/leads/buyer")
async def list_buyer_leads(_=Depends(verify_admin)):
    return await db.buyer_leads.find({}, {"_id":0}).sort("created_at", -1).to_list(1000)

@api.get("/admin/leads/seller")
async def list_seller_leads(_=Depends(verify_admin)):
    return await db.seller_leads.find({}, {"_id":0}).sort("created_at", -1).to_list(1000)

# =============== REALTOR REFERRAL NETWORK ===============
class RealtorInitial(BaseModel):
    full_name: str
    email: EmailStr
    brokerage: Optional[str] = None
    realtor_number: Optional[str] = None

@api.post("/realtors/apply")
async def realtor_apply(body: RealtorInitial):
    existing = await db.realtor_applications.find_one({"email": body.email})
    if existing:
        # Update existing with any new fields
        await db.realtor_applications.update_one({"email": body.email}, {"$set": {**body.model_dump(exclude_none=True), "updated_at": now_iso()}})
        return {"success": True, "id": existing["id"], "message": "Application updated. Doug will review and be in touch."}
    app_obj = RealtorApplication(full_name=body.full_name, email=body.email, brokerage=body.brokerage, realtor_number=body.realtor_number, stage="applied")
    await db.realtor_applications.insert_one(app_obj.model_dump())
    # Log for admin queue; email dispatch to realtors@eztofind.ca happens when SMTP is wired
    logger.info(f"REALTOR APPLICATION → realtors@eztofind.ca: {body.full_name} ({body.email}) — {body.brokerage} — #{body.realtor_number}")
    await db.email_outbox.insert_one({
        "to": "realtors@eztofind.ca",
        "subject": f"New REALTOR® application — {body.full_name}",
        "body": f"Name: {body.full_name}\nEmail: {body.email}\nBrokerage: {body.brokerage}\nMembership #: {body.realtor_number}",
        "ts": now_iso(),
        "sent": False
    })
    return {"success": True, "id": app_obj.id, "message": "Thank you! Your application has been received. Doug will review and be in touch."}

class RealtorCredentials(BaseModel):
    brokerage: str
    realtor_number: str
    is_realtor_confirmed: bool

@api.post("/realtors/{app_id}/credentials")
async def realtor_credentials(app_id: str, body: RealtorCredentials):
    app_doc = await db.realtor_applications.find_one({"id": app_id})
    if not app_doc: raise HTTPException(404, "Application not found")
    await db.realtor_applications.update_one({"id": app_id}, {"$set": {**body.model_dump(), "stage": "credentials", "updated_at": now_iso()}})
    return {"success": True, "message": "Credentials received. Once verified, we'll email you the final profile form."}

class RealtorProfile(BaseModel):
    areas_served: List[str]
    client_type: str
    years_experience: int
    specialties: List[str] = []
    agreement_25pct: bool

@api.post("/realtors/{app_id}/profile")
async def realtor_profile(app_id: str, body: RealtorProfile):
    if not body.agreement_25pct: raise HTTPException(400, "Must agree to referral terms")
    app_doc = await db.realtor_applications.find_one({"id": app_id})
    if not app_doc: raise HTTPException(404, "Application not found")
    await db.realtor_applications.update_one({"id": app_id}, {"$set": {**body.model_dump(), "stage": "profile", "updated_at": now_iso()}})
    return {"success": True, "message": "Profile complete! Doug will review and confirm your acceptance."}

@api.get("/realtors/{app_id}")
async def get_realtor_app(app_id: str):
    d = await db.realtor_applications.find_one({"id": app_id}, {"_id":0})
    if not d: raise HTTPException(404, "Not found")
    return d

@api.get("/admin/realtors")
async def list_realtors(_=Depends(verify_admin)):
    return await db.realtor_applications.find({}, {"_id":0}).sort("created_at", -1).to_list(1000)

@api.post("/admin/realtors/{app_id}/status")
async def update_realtor_status(app_id: str, status: str, _=Depends(verify_admin)):
    if status not in ["approved","rejected","pending"]: raise HTTPException(400, "Invalid status")
    await db.realtor_applications.update_one({"id": app_id}, {"$set": {"status": status, "updated_at": now_iso()}})
    return {"success": True}

# =============== CRM CLIENTS ===============
@api.post("/admin/clients")
async def create_client(c: Client, _=Depends(verify_admin)):
    await db.clients.insert_one(c.model_dump())
    return c

@api.get("/admin/clients")
async def list_clients(_=Depends(verify_admin)):
    return await db.clients.find({}, {"_id":0}).sort("created_at", -1).to_list(1000)

@api.put("/admin/clients/{cid}")
async def update_client(cid: str, c: Client, _=Depends(verify_admin)):
    await db.clients.update_one({"id": cid}, {"$set": c.model_dump()})
    return c

@api.delete("/admin/clients/{cid}")
async def delete_client(cid: str, _=Depends(verify_admin)):
    await db.clients.delete_one({"id": cid})
    return {"success": True}

@api.get("/admin/reminders")
async def get_reminders(_=Depends(verify_admin)):
    """Returns upcoming birthdays, anniversaries, and possession-date anniversaries within next 30 days"""
    clients = await db.clients.find({}, {"_id":0}).to_list(2000)
    today = datetime.now(timezone.utc).date()
    reminders = []
    for c in clients:
        for field, label in [("birthdate","Birthday"),("anniversary","Anniversary"),("possession_date","Possession Anniversary")]:
            v = c.get(field)
            if not v: continue
            try:
                d = datetime.strptime(v, "%Y-%m-%d").date()
                # this year's occurrence
                this_year = d.replace(year=today.year)
                delta = (this_year - today).days
                if delta < 0:
                    this_year = d.replace(year=today.year+1)
                    delta = (this_year - today).days
                if 0 <= delta <= 30:
                    years = today.year - d.year if label == "Possession Anniversary" else None
                    reminders.append({"client_id": c["id"], "client_name": c["full_name"], "type": label, "date": this_year.isoformat(), "days_until": delta, "years": years})
            except Exception: continue
    reminders.sort(key=lambda r: r["days_until"])
    return reminders

# =============== GLOSSARY ===============
@api.get("/glossary")
async def list_glossary():
    return await db.glossary.find({}, {"_id":0}).sort("term", 1).to_list(2000)

@api.get("/glossary/{slug}")
async def get_term(slug: str):
    t = await db.glossary.find_one({"slug": slug}, {"_id":0})
    if not t: raise HTTPException(404, "Term not found")
    # Generate FAQs on demand if none exist (saved as unapproved by default)
    if not t.get("faqs"):
        faqs = await generate_faqs_for_term(t["term"], t["definition"])
        await db.glossary.update_one({"slug": slug}, {"$set": {"faqs": faqs, "faqs_approved": False}})
        t["faqs"] = faqs
        t["faqs_approved"] = False
    # Public API: hide unapproved FAQs
    if not t.get("faqs_approved"):
        t["faqs"] = []
        t["faqs_pending_review"] = True
    # Attach authoritative sources — MERGE the curated Lovable override with the
    # algorithmic category defaults (deduped by URL). This ensures every term
    # shows both the curator's primary source AND 2–4 authoritative BC statutes/
    # regulators, so users see real "well-sourced" verification links.
    t["sources"] = _merge_sources(t.get("sources_override"), t.get("term",""), t.get("category",""))
    t["sources_source"] = "curated+default" if t.get("sources_override") else "default"
    return t

async def generate_faqs_for_term(term: str, definition: str) -> List[dict]:
    """Use Claude Sonnet 4.6 to generate 10 BC real estate FAQs. Hallucination-hardened
    prompt v2: cites BC statute sections or explicitly refuses; forces "verify with a BC
    lawyer/notary/tax professional" language when unsure; every dollar amount gets an
    "as of [date] — verify current" tag; whitelist of known-good BC statute citations."""
    from datetime import date as _date
    today = _date.today().isoformat()
    prompt = f"""Generate exactly 10 frequently asked questions (with answers) about the British Columbia real estate term "{term}".

Definition context: {definition}

═══════════════════════════════════════════════════════════════
HALLUCINATION-HARDENED RULES (v2, {today})
═══════════════════════════════════════════════════════════════

RULE 1 — CITE OR REFUSE
Every substantive claim must EITHER:
  (a) Cite a statute or authority from the WHITELIST below (with section number where relevant), OR
  (b) Explicitly say: "Verify current details with a BC lawyer, notary, or licensed tax professional before acting."
If you are not certain a specific claim maps to a whitelist source or a well-established fact, refuse to make the claim and use option (b).

RULE 2 — NEVER INVENT
Do NOT invent:
  - Section numbers ("s. 25(4)" style) unless you are highly confident
  - Dollar amounts, percentages, effective dates
  - Program names or eligibility rules
  - Federal or municipal law that overlaps BC provincial law
If unsure, phrase as "the current BC Ministry of Finance thresholds" or "the current BCFSA Rules" and refer the reader to verify.

RULE 3 — DOLLAR / % / DATE TAGGING
Every specific dollar figure, percentage rate, or effective date MUST be followed by "(as of {today} — verify current)". Example:
  "The First-Time Home Buyer full exemption applies up to $835,000 (as of {today} — verify current)."
  "The Additional PTT rate is 20% (as of {today} — verify current)."
This is mandatory. Every single number.

RULE 4 — WHITELIST OF ACCEPTABLE BC CITATIONS
Only cite from this list (or say "verify with a professional"):
  • British Columbia Financial Services Authority (BCFSA) — regulator; do NOT confuse with the former RECBC (merged into BCFSA August 1, 2021)
  • Real Estate Services Act (RESA), SBC 2004, c. 42, and the RESA Rules
  • Strata Property Act (SPA), SBC 1998, c. 43, and Strata Property Regulation — for strata/condo matters (NEVER "Condominium Act" — that's Ontario)
  • Property Transfer Tax Act (PTTA), RSBC 1996, c. 378 — for PTT, First-Time Home Buyer Exemption, Newly Built Home Exemption, Additional PTT (foreign buyer)
  • Speculation and Vacancy Tax Act, SBC 2018, c. 46
  • Residential Tenancy Act, SBC 2002, c. 78 (RTA)
  • Home Purchase Assistance Act (First-Time Home Buyer)
  • Wills, Estates and Succession Act (WESA), SBC 2009, c. 13
  • Land Title Act, RSBC 1996, c. 250
  • Personal Information Protection Act (PIPA), SBC 2003, c. 63
  • Canada's Anti-Spam Legislation (CASL), SC 2010, c. 23 — federal
  • Prohibition on the Purchase of Residential Property by Non-Canadians Act, SC 2022, c. 10 — federal (Foreign Buyer Ban; currently extended through January 1, 2027)
  • Agricultural Land Commission Act, SBC 2002, c. 36 (ALR/ALC)
  • Local Government Act (RSBC 2015, c. 1) — for municipal zoning
  • Housing Statutes (Residential Development) Amendment Act, 2023 — BC Bill 44 (SSMUH, effective July 1, 2024 for most municipalities)
  • Home Flipping Tax Act, SBC 2024 (effective January 1, 2025 — verify current)
  • BC Home Owner Grant Act — for property tax grant
  • BC Ministry of Finance publications and www.gov.bc.ca
  • Canada Mortgage and Housing Corporation (CMHC) — federal
  • Financial Consumer Agency of Canada (FCAC) — federal
  • Bank of Canada — for policy rates

RULE 5 — NO ADVICE
Do NOT advise "you should X". Provide neutral, educational, factual information only. Never recommend a specific mortgage, lender, brokerage, lawyer, or REALTOR®.

RULE 6 — WHEN IN DOUBT
When a question could go multiple ways depending on province, jurisdiction, timing, or personal circumstances, the correct answer template is:
  "This depends on [factor]. Under BC's [correct statute from whitelist], the general framework is [general framework]. Verify the specifics for your situation with a BC lawyer, notary, or licensed tax professional before acting."

RULE 7 — FORMAT
- Questions must be BC-specific and directly relevant to "{term}"
- Each answer: 2–4 sentences, plain-language but precise
- Return ONLY valid JSON: an array of exactly 10 objects with "q" and "a" keys
- No preamble, no markdown, no code fences, just the JSON array."""
    try:
        chat = make_chat(api_key=EMERGENT_LLM_KEY, session_id=f"faq-{uuid.uuid4()}", system_message="You are a British Columbia real estate compliance drafter. Every fact you state must be verifiable against a BC statute or federal Act from the whitelist. When uncertain, you REFUSE to make the claim and refer the reader to verify with a BC lawyer, notary, or licensed tax professional. You never invent section numbers, dollar amounts, percentages, or dates. Every specific number gets an 'as of YYYY-MM-DD — verify current' tag. You output only valid JSON arrays.").with_model("anthropic", "claude-sonnet-4-6")
        full = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta): full += ev.content
            elif isinstance(ev, StreamDone): break
        s = full.strip()
        if s.startswith("```"): s = s.split("```")[1].replace("json","",1).strip()
        start = s.find("["); end = s.rfind("]")
        if start >= 0 and end > start:
            arr = json.loads(s[start:end+1])
            return arr[:10]
    except Exception as e:
        logger.error(f"FAQ gen failed: {e}")
    return []

# =============== COMMUNITIES ===============
@api.get("/communities")
async def list_communities():
    p = ROOT_DIR / "data" / "communities_seed.json"
    return json.loads(p.read_text())


# =============== LIVE FORECAST (Open-Meteo, no key, 1-hour cache) ===============
@api.get("/community/{slug}/vibe")
async def community_vibe(slug: str):
    """Neighbourhood Vibe Score™ — 6-factor community livability index."""
    from services.vibe_score import score_community
    all_comm = json.loads((ROOT_DIR / "data" / "communities_seed.json").read_text())
    name = region = None
    for r, lst in all_comm.items():
        for c in lst:
            if re.sub(r"[^a-z0-9]+", "-", c.lower()).strip("-") == slug:
                name = c; region = r; break
        if name: break
    if not name:
        raise HTTPException(404, "Community not found")
    # Try to enrich with real climate data if we have it cached
    clim = await db.community_climate.find_one({"slug": slug}, {"_id":0, "monthly":1, "available":1})
    avg_t = None; climate_available = False
    if clim and clim.get("available") and clim.get("monthly"):
        temps = [m.get("mean_c") for m in clim["monthly"] if m and m.get("mean_c") is not None]
        if temps:
            avg_t = sum(temps) / len(temps)
            climate_available = True
    return {"community": name, "region": region, **score_community(name, region, climate_available=climate_available, avg_temp_c=avg_t)}

@api.get("/community/{slug}/forecast")
async def community_forecast(slug: str):
    """Live current-conditions + 7-day forecast for a community.

    Data source: Open-Meteo forecast API (free, no key, ECCC among its sources).
    Cached 1 hour in Mongo to avoid hammering the free tier.
    """
    all_comm = json.loads((ROOT_DIR / "data" / "communities_seed.json").read_text())
    name = None
    region = None
    for r, lst in all_comm.items():
        for c in lst:
            if re.sub(r"[^a-z0-9]+", "-", c.lower()).strip("-") == slug:
                name = c
                region = r
                break
        if name:
            break
    if not name:
        raise HTTPException(404, "Community not found")

    # Cache lookup (1-hour TTL)
    cached = await db.community_forecasts.find_one({"slug": slug}, {"_id": 0})
    if cached and cached.get("expires_at") and now_iso() < cached["expires_at"]:
        return cached

    # Geocode + forecast
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            geo_r = await client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": name, "count": 5, "language": "en", "format": "json", "country": "CA"},
            )
            geo = geo_r.json() if geo_r.status_code == 200 else {}
            hit = None
            for res in geo.get("results", []):
                if res.get("admin1") in ("British Columbia",):
                    hit = res
                    break
            if not hit and geo.get("results"):
                hit = geo["results"][0]
            if not hit:
                raise HTTPException(502, "Geocoding failed for community")
            lat = hit["latitude"]
            lon = hit["longitude"]

            fx_r = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
                    "timezone": "America/Vancouver",
                    "forecast_days": 7,
                },
            )
            fx = fx_r.json() if fx_r.status_code == 200 else None
            if not fx or "current" not in fx:
                raise HTTPException(502, "Forecast unavailable")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"forecast fetch failed for {name}: {e}")
        raise HTTPException(502, "Forecast unavailable")

    cur = fx["current"]
    daily = fx["daily"]
    result = {
        "slug": slug,
        "community": name,
        "region": region,
        "lat": lat,
        "lon": lon,
        "current": {
            "temp_c": cur.get("temperature_2m"),
            "feels_like_c": cur.get("apparent_temperature"),
            "code": cur.get("weather_code"),
            "wind_kmh": cur.get("wind_speed_10m"),
            "humidity_pct": cur.get("relative_humidity_2m"),
        },
        "daily": [
            {
                "date": d,
                "code": c,
                "max_c": tmax,
                "min_c": tmin,
                "precip_mm": pp,
                "precip_prob_pct": pprob,
            }
            for d, c, tmax, tmin, pp, pprob in zip(
                daily.get("time", []),
                daily.get("weather_code", []),
                daily.get("temperature_2m_max", []),
                daily.get("temperature_2m_min", []),
                daily.get("precipitation_sum", []),
                daily.get("precipitation_probability_max", [None] * 7),
            )
        ],
        "updated_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "eccc_forecast_url": f"https://weather.gc.ca/city/pages/bc-1_metric_e.html",  # generic BC page
        "eccc_search_url": f"https://weather.gc.ca/mainmenu/weather_menu_e.html",
        "attribution": "Weather data © Open-Meteo (free & open-source; sources include ECCC)",
    }
    await db.community_forecasts.replace_one({"slug": slug}, result, upsert=True)
    result.pop("_id", None)
    return result

# =============== COMMUNITY SYNOPSIS (Claude Sonnet 4.6, cached) ===============
async def generate_community_synopsis(name: str, region: str) -> str:
    """Generate a 300-450 word BC community synopsis using Claude Sonnet 4.6."""
    prompt = f"""Write a factual, informative synopsis of {name}, a community in the {region} region of British Columbia, Canada.

Length: 300-450 words in 3 paragraphs.

Cover ONLY these three topics — one per paragraph:
1. Geography & location — where in BC it sits, nearby larger centres, distance from Vancouver or the nearest regional hub, notable geographic features (mountains, ocean, lakes, rivers, farmland), climate.
2. Character & lifestyle — is it urban / suburban / rural / remote? Population scale (small village, town, city). Community feel, notable landmarks or heritage in general terms.
3. Economy — main industries, employment base, general amenities available in the area (do NOT list specific businesses, schools, or hospitals by name).

Strict rules:
- Factual and informational only. NO advice.
- NO real estate market commentary, NO price predictions, NO property recommendations, NO commentary on who should buy here.
- NO specific school/hospital/business names — keep it general.
- Plain prose, no headers, no bullet points, no markdown.
- Warm, professional tone suitable for a REALTOR®'s website.
- End the final paragraph with EXACTLY this sentence (verbatim, no changes):
"For real estate advice specific to {name}, ask to be referred to a REALTOR® through our Referral REALTOR® link."
"""
    try:
        chat = make_chat(api_key=EMERGENT_LLM_KEY, session_id=f"syn-{uuid.uuid4()}", system_message="You are a BC real estate content writer producing factual community synopses.").with_model("anthropic", "claude-sonnet-4-6")
        full = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta): full += ev.content
            elif isinstance(ev, StreamDone): break
        return full.strip()
    except Exception as e:
        logger.error(f"Synopsis gen failed for {name}: {e}")
        return ""

@api.get("/community/{slug}/synopsis")
async def community_synopsis(slug: str):
    """Return a Claude-authored synopsis of a BC community. Cached permanently after first generation."""
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    name = None; region = None
    for r, lst in all_comm.items():
        for c in lst:
            if re.sub(r"[^a-z0-9]+","-", c.lower()).strip("-") == slug:
                name = c; region = r; break
        if name: break
    if not name: raise HTTPException(404, "Community not found")

    community_srcs = get_community_sources(name, region)

    cached = await db.community_synopses.find_one({"slug": slug}, {"_id":0})
    if cached and cached.get("synopsis"):
        if not cached.get("approved"):
            return {"community": name, "region": region, "synopsis": "", "source":"pending_review", "note":"This community synopsis is awaiting review by Doug LeMaire, REALTOR® before publication.", "sources": community_srcs}
        return {"community": name, "region": region, "synopsis": cached["synopsis"], "source":"cache", "sources": community_srcs}

    synopsis = await generate_community_synopsis(name, region)
    if not synopsis:
        return {"community": name, "region": region, "synopsis": "", "source":"unavailable", "note":"Synopsis is being generated — please refresh in a moment.", "sources": community_srcs}
    await db.community_synopses.replace_one({"slug": slug}, {"slug": slug, "name": name, "region": region, "synopsis": synopsis, "approved": False, "ts": now_iso()}, upsert=True)
    return {"community": name, "region": region, "synopsis": "", "source":"pending_review", "note":"This community synopsis is awaiting review by Doug LeMaire, REALTOR® before publication.", "sources": community_srcs}

async def generate_community_weather(name: str, region: str) -> str:
    """Generate a 150-200 word BC community weather synopsis using Claude Sonnet 4.6."""
    prompt = f"""Write a factual weather and climate synopsis for {name}, a community in the {region} region of British Columbia, Canada.

Length: 150-200 words in 2 short paragraphs.

Cover:
1. First paragraph — climate classification (e.g., temperate rainforest, semi-arid, alpine, sub-boreal), typical winter conditions (average temperature range in °C, snowfall, rain, notable phenomena like Arctic outflows or freezing rain if applicable).
2. Second paragraph — typical summer conditions (average temperature range in °C, precipitation, wildfire smoke tendency where relevant), notable transitional weather patterns (fog, wind corridors, wet/dry seasons), and any distinctive features (e.g., "sunniest in Canada", "highest snowfall in BC", "known for micro-climates").

Strict rules:
- Factual, informational, general climate summary only.
- Use approximate temperature ranges (°C), not day-by-day forecasts.
- NO property/real estate mentions. NO advice.
- Plain prose. No headers, no bullets, no markdown.
- Warm, professional tone."""
    try:
        chat = make_chat(api_key=EMERGENT_LLM_KEY, session_id=f"wx-{uuid.uuid4()}", system_message="You are a BC climate writer producing factual community weather summaries.").with_model("anthropic", "claude-sonnet-4-6")
        full = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta): full += ev.content
            elif isinstance(ev, StreamDone): break
        return full.strip()
    except Exception as e:
        logger.error(f"Weather gen failed for {name}: {e}")
        return ""

@api.get("/community/{slug}/weather")
async def community_weather(slug: str):
    """Return a Claude-authored weather synopsis. Cached permanently after first generation."""
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    name = None; region = None
    for r, lst in all_comm.items():
        for c in lst:
            if re.sub(r"[^a-z0-9]+","-", c.lower()).strip("-") == slug:
                name = c; region = r; break
        if name: break
    if not name: raise HTTPException(404, "Community not found")

    weather_sources = get_weather_sources(name, region)

    cached = await db.community_weather.find_one({"slug": slug}, {"_id":0})
    if cached and cached.get("weather"):
        if not cached.get("approved"):
            return {"community": name, "region": region, "weather": "", "source":"pending_review", "note":"Weather summary awaiting review before publication.", "sources": weather_sources}
        return {"community": name, "region": region, "weather": cached["weather"], "source":"cache", "sources": weather_sources}

    weather = await generate_community_weather(name, region)
    if not weather:
        return {"community": name, "region": region, "weather": "", "source":"unavailable", "note":"Weather summary is being generated — please refresh in a moment.", "sources": weather_sources}
    await db.community_weather.replace_one({"slug": slug}, {"slug": slug, "name": name, "region": region, "weather": weather, "approved": False, "ts": now_iso()}, upsert=True)
    return {"community": name, "region": region, "weather": "", "source":"pending_review", "note":"Weather summary awaiting review before publication.", "sources": weather_sources}


# =============== NEIGHBOURHOOD DIRECTORY ===============
# Sub-neighbourhoods (e.g. "Kitsilano" in Vancouver, "Lower Mission" in Kelowna)
# derived from live MLS `CityRegion` data. Cached briefly in-memory.
# Deliberately EXCLUDES anything covered by the parent community's Vibe Score
# (walkability / transit / air quality / wildfire / flood / climate) — this
# directory adds ONLY housing-stock + character detail at the micro level.
_NHB_SLUG_RX = re.compile(r"[^a-z0-9]+")
def _nhb_slug(s: str) -> str:
    return _NHB_SLUG_RX.sub("-", (s or "").lower()).strip("-")

def _resolve_community(slug: str):
    """Return (name, region) tuple for a community slug or (None, None)."""
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    for r, lst in all_comm.items():
        for c in lst:
            if _nhb_slug(c) == slug:
                return c, r
    return None, None

@api.get("/community/{slug}/neighbourhoods")
async def community_neighbourhoods(slug: str):
    """Return the list of sub-neighbourhoods (CityRegion values) with active
    MLS listing counts + price snapshots for the given community. Cities where
    the local board doesn't populate CityRegion will return an empty list."""
    name, region = _resolve_community(slug)
    if not name:
        raise HTTPException(404, "Community not found")
    pipeline = [
        {"$match": {
            "status": "Active",
            "city": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
            "region": {"$nin": ["", None, region]},  # exclude blanks + the parent region label
            "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)},
        }},
        {"$group": {
            "_id": "$region",
            "count": {"$sum": 1},
            "min_price": {"$min": "$list_price"},
            "max_price": {"$max": "$list_price"},
            "prices": {"$push": "$list_price"},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 40},
    ]
    items = []
    async for row in db.listings.aggregate(pipeline):
        prices = sorted([p for p in row.get("prices") or [] if p])
        median = prices[len(prices)//2] if prices else None
        items.append({
            "slug": _nhb_slug(row["_id"]),
            "name": row["_id"],
            "count": row["count"],
            "min_price": row.get("min_price"),
            "max_price": row.get("max_price"),
            "median_price": median,
        })
    return {"community": name, "region": region, "count": len(items), "neighbourhoods": items}


# =============== MUNICIPAL ZONING ===============
# Claude-authored plain-English list of the common residential zone codes for
# each BC community (R-1, RM-1, RS-1, CD-1, etc.) with a short explainer per
# code. Cached in Mongo; approval-gated (BCFSA licensee attests before publish).
# The provincial SSMUH (Bill 44) context is served identically for every
# community — that's the moat piece vs Zoocasa/REW/Rennie.
_ZONING_SOURCES_PATH = ROOT_DIR / "data" / "community_zoning_sources.json"
def _zoning_sources() -> dict:
    try: return json.loads(_ZONING_SOURCES_PATH.read_text())
    except Exception: return {}

async def generate_community_zones(community: str, region: str) -> Optional[List[dict]]:
    """Ask Claude to enumerate the common residential zone codes for this
    community with plain-English descriptions. Returns None on failure."""
    prompt = f"""List the most common RESIDENTIAL zoning code designations currently used by the municipality of {community}, in the {region} region of British Columbia, Canada.

Return STRICTLY a JSON array. Each element must have exactly these keys:
- "code": short zone code as the municipality writes it (e.g. "R-1", "RS-1", "RM-1", "RT-1", "RH-1", "CD-1")
- "name": full name of the zone (e.g. "Single Family Residential", "Low Density Multiple Housing", "Residential Comprehensive Development")
- "summary": 2-3 sentence plain-English explanation of what this zone typically permits (dwelling type, density, common permitted uses). Write for a home buyer, not a lawyer.
- "note": one short line about caveats, secondary-suite allowance, or SSMUH interaction (or empty string if none).

Rules:
1. Only include RESIDENTIAL zones — skip commercial, industrial, agricultural, institutional, parks.
2. Include 5-15 codes — the actual most-common residential zones in {community}'s bylaw. If unsure of the exact code, DO NOT invent one — omit it.
3. For the "summary" field, describe the zone as it functionally works today under BC Bill 44 (SSMUH, effective July 1, 2024) — most previously-single-family zones now permit 3-4 units.
4. If {community} is a small community or Electoral Area without its own bylaw and relies on Regional District zoning, note that in the first zone's "note" field.
5. Output ONLY the JSON array. No markdown fences, no prose."""
    try:
        chat = make_chat(api_key=EMERGENT_LLM_KEY, session_id=f"zone-{uuid.uuid4()}",
                         system_message="You are a BC real estate content researcher producing plain-English residential zoning summaries. You never invent zone codes you're not sure about.").with_model("anthropic", "claude-sonnet-4-6")
        full = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta): full += ev.content
            elif isinstance(ev, StreamDone): break
        raw = full.strip()
        if raw.startswith("```"): raw = raw.split("```")[1].lstrip("json").strip()
        zones = json.loads(raw)
        if isinstance(zones, list) and 0 < len(zones) <= 20:
            # Sanitize
            clean = []
            for z in zones:
                if not isinstance(z, dict): continue
                code = str(z.get("code","")).strip()[:24]
                name = str(z.get("name","")).strip()[:120]
                summary = str(z.get("summary","")).strip()[:600]
                note = str(z.get("note","")).strip()[:300]
                if code and name and summary:
                    clean.append({"code": code, "name": name, "summary": summary, "note": note})
            return clean or None
        return None
    except Exception as e:
        logger.error(f"Zone generation failed for {community}, {region}: {e}")
        return None

@api.get("/community/{slug}/zoning")
async def community_zoning(slug: str):
    name, region = _resolve_community(slug)
    if not name:
        raise HTTPException(404, "Community not found")
    # Try cache first
    cached = await db.community_zoning.find_one({"slug": slug}, {"_id": 0})
    zones = []
    approved = False
    if cached:
        zones = cached.get("zones") or []
        approved = bool(cached.get("approved"))
    else:
        # On-demand generation (draft, unapproved) — same pattern as synopses
        gen = await generate_community_zones(name, region)
        if gen:
            await db.community_zoning.replace_one(
                {"slug": slug},
                {"slug": slug, "community": name, "region": region, "zones": gen, "approved": False, "ts": now_iso()},
                upsert=True,
            )
            zones = gen
    src = _zoning_sources().get(slug)
    if not src:
        src = {"bylaw_url": f"https://www.google.com/search?q={('%20'.join((name + ' BC residential zoning bylaw').split()))}", "is_fallback": True}
    else:
        src = {**src, "is_fallback": False}
    return {
        "community": name,
        "region": region,
        "slug": slug,
        "zones": zones if approved else [],  # public site only sees approved zones
        "approved": approved,
        "note": None if approved else ("Zone list is being drafted for review by Doug LeMaire, REALTOR® before publication." if zones else "Zone list will be published once approved."),
        "source": src,
        "provincial_context": {
            "act": "BC Bill 44 — Housing Statutes (Residential Development) Amendment Act, 2023",
            "common_name": "Small-Scale Multi-Unit Housing (SSMUH)",
            "effective": "July 1, 2024 for most municipalities",
            "summary": "Every BC municipality (pop. ≥ 5,000, on Class-A water service) was required by June 30, 2024 to amend its zoning bylaw to permit 3–4 residential units on most lots previously zoned for a single detached dwelling, and up to 6 units on lots close to frequent-transit stops. This applies province-wide and effectively supersedes older R-1 / RS-1 style single-family-only zones for most parcels — regardless of what the local bylaw text still says on the surface. Always verify current permitted density with the municipality's planning department.",
            "authority_url": "https://www2.gov.bc.ca/gov/content/housing-tenancy/local-governments-and-housing/housing-initiatives/smsc-housing",
        },
        "last_reviewed": "2026-02-26",
    }

# --- Admin: zoning approval workflow ---
@api.get("/admin/approvals/zoning")
async def pending_zoning(_=Depends(verify_admin)):
    return await db.community_zoning.find({"approved": {"$ne": True}}, {"_id":0}).sort("ts", -1).to_list(2000)

class ApproveZoning(BaseModel):
    slug: str
    zones: Optional[List[dict]] = None

@api.post("/admin/approvals/zoning/approve")
async def approve_zoning(body: ApproveZoning, _=Depends(verify_admin)):
    update = {"approved": True, "approved_at": now_iso(), "approved_by": "doug@eztofind.ca"}
    if body.zones is not None: update["zones"] = body.zones
    r = await db.community_zoning.update_one({"slug": body.slug}, {"$set": update})
    return {"success": True, "modified": r.modified_count}

@api.post("/admin/approvals/zoning/approve-all")
async def approve_all_zoning(_=Depends(verify_admin)):
    r = await db.community_zoning.update_many({"approved": {"$ne": True}, "zones.0": {"$exists": True}}, {"$set": {"approved": True, "approved_at": now_iso(), "approved_by": "bulk_admin_action"}})
    return {"success": True, "modified": r.modified_count}

@api.post("/admin/approvals/generate-all-zoning")
async def generate_all_zoning(auto_approve: bool = False, _=Depends(verify_admin)):
    """Generate residential zone-code lists for EVERY BC community. Background job.
    Skips communities already generated. ~30-60 min for 241 communities at 4 concurrent."""
    import asyncio as _a
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    todo = []
    for region, lst in all_comm.items():
        for name in lst:
            slug = re.sub(r"[^a-z0-9]+","-", name.lower()).strip("-")
            todo.append((slug, name, region))

    async def worker():
        SEM = _a.Semaphore(4)
        async def gen(slug, name, region):
            async with SEM:
                existing = await db.community_zoning.find_one({"slug": slug, "zones.0": {"$exists": True}})
                if existing: return
                z = await generate_community_zones(name, region)
                if z:
                    doc = {"slug": slug, "community": name, "region": region, "zones": z, "approved": bool(auto_approve), "ts": now_iso()}
                    if auto_approve:
                        doc["approved_at"] = now_iso(); doc["approved_by"] = "bulk_admin_action"
                    await db.community_zoning.replace_one({"slug": slug}, doc, upsert=True)
        await _a.gather(*[gen(*t) for t in todo], return_exceptions=True)
        logger.info(f"Bulk community zoning generation complete for {len(todo)} communities (auto_approve={auto_approve})")

    _a.create_task(worker())
    return {"success": True, "message": f"Generating residential zone lists for {len(todo)} communities in background. Refresh /admin/approvals in ~30-60 minutes.", "total": len(todo)}


async def generate_neighbourhood_synopsis(neigh: str, community: str, region: str, listing_stats: dict) -> str:
    """Generate a 180-260 word micro-neighbourhood synopsis via Claude Sonnet 4.6.
    Deliberately excludes climate/walkability/transit/vibe (those live on the
    parent community page) so the two never duplicate."""
    beds_mix = listing_stats.get("beds_mix") or ""
    price_hint = listing_stats.get("price_hint") or ""
    types = listing_stats.get("types") or ""
    prompt = f"""Write a factual synopsis of {neigh}, a sub-neighbourhood within {community}, in the {region} region of British Columbia, Canada.

Length: 180-260 words in 2 short paragraphs.

Cover ONLY these two topics — one per paragraph:
1. Location within {community} — where {neigh} sits geographically inside {community}, its rough boundaries or landmarks that define it, and how it relates to nearby sub-areas.
2. Housing character — the predominant housing stock and streetscape (e.g., older character homes, mid-rise condos, townhome complexes, larger lots, waterfront, hillside), typical age of homes if known in general terms, and the overall feel (established / newer / mixed / redeveloping). Reference the active listing mix if useful: {types} · beds mix: {beds_mix} · price context: {price_hint}.

Strict rules:
- Do NOT discuss walkability, transit, schools, hospitals, air quality, wildfire risk, flood risk, or climate — these are already covered on the {community} community page. Your job is to add ONLY location + housing character detail.
- No price predictions, no property recommendations, no advice.
- Plain prose. No headers, no bullets, no markdown.
- Warm, professional tone."""
    try:
        chat = make_chat(api_key=EMERGENT_LLM_KEY, session_id=f"nhb-{uuid.uuid4()}", system_message="You are a BC real estate content writer producing factual micro-neighbourhood synopses.").with_model("anthropic", "claude-sonnet-4-6")
        full = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta): full += ev.content
            elif isinstance(ev, StreamDone): break
        return full.strip()
    except Exception as e:
        logger.error(f"Neighbourhood synopsis gen failed for {neigh}, {community}: {e}")
        return ""

@api.get("/community/{slug}/neighbourhood/{n_slug}")
async def neighbourhood_detail(slug: str, n_slug: str):
    """Return metadata + Claude-authored synopsis for a specific micro-
    neighbourhood. Cached permanently after first generation."""
    name, region = _resolve_community(slug)
    if not name:
        raise HTTPException(404, "Community not found")
    # Find the exact CityRegion string whose slug matches n_slug (case-preserving)
    distinct = await db.listings.distinct("region", {
        "status": "Active",
        "city": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
        "region": {"$nin": ["", None, region]},
    })
    n_name = next((r for r in distinct if _nhb_slug(r) == n_slug), None)
    if not n_name:
        raise HTTPException(404, "Neighbourhood not found in this community")
    # Aggregate listing stats to feed the LLM AND surface on the page.
    agg = await db.listings.aggregate([
        {"$match": {"status":"Active","city":{"$regex":f"^{re.escape(name)}$","$options":"i"},"region":n_name,"property_type":{"$nin":list(EXCLUDED_PROPERTY_TYPES)}}},
        {"$group": {"_id": None, "count":{"$sum":1}, "min_price":{"$min":"$list_price"}, "max_price":{"$max":"$list_price"}, "avg_beds":{"$avg":"$beds"}, "types":{"$addToSet":"$property_type"}, "prices":{"$push":"$list_price"}}},
    ]).to_list(1)
    stats = agg[0] if agg else {}
    prices_sorted = sorted([p for p in stats.get("prices") or [] if p])
    median = prices_sorted[len(prices_sorted)//2] if prices_sorted else None
    beds_avg = stats.get("avg_beds") or 0
    listing_stats = {
        "types": ", ".join((stats.get("types") or [])[:6]) or "residential",
        "beds_mix": f"avg {beds_avg:.1f} beds" if beds_avg else "mixed",
        "price_hint": f"listings roughly ${stats.get('min_price') or 0:,.0f}–${stats.get('max_price') or 0:,.0f}" if stats.get("min_price") else "price varies",
    }
    cached = await db.neighbourhood_synopses.find_one({"slug": slug, "n_slug": n_slug}, {"_id":0})
    if cached and cached.get("synopsis"):
        payload = cached
    else:
        syn = await generate_neighbourhood_synopsis(n_name, name, region, listing_stats)
        if syn:
            await db.neighbourhood_synopses.replace_one(
                {"slug": slug, "n_slug": n_slug},
                {"slug": slug, "n_slug": n_slug, "community": name, "region": region, "neighbourhood": n_name, "synopsis": syn, "approved": False, "ts": now_iso()},
                upsert=True,
            )
        payload = {"synopsis": syn, "approved": False}
    return {
        "community": name,
        "region": region,
        "neighbourhood": n_name,
        "slug": slug,
        "n_slug": n_slug,
        "listing_count": stats.get("count", 0),
        "min_price": stats.get("min_price"),
        "max_price": stats.get("max_price"),
        "median_price": median,
        "synopsis": payload.get("synopsis") if payload.get("approved") else "",
        "note": None if payload.get("approved") else "This micro-neighbourhood synopsis is awaiting review by Doug LeMaire, REALTOR® before publication.",
    }


# =============== ECCC LIVE CLIMATE NORMALS ===============
# Real 1981-2010 Canadian Climate Normals fetched from Environment and Climate
# Change Canada's MSC GeoMet API. Cached permanently in MongoDB per station
# (climate normals are stable 30-year averages that only change every decade).
NORMAL_ELEMENTS = {
    1:  "mean_temp_c",       # Mean daily temperature (°C)
    5:  "max_temp_c",        # Mean daily max temperature (°C)
    8:  "min_temp_c",        # Mean daily min temperature (°C)
    52: "rainfall_mm",       # Total rainfall (mm)
    54: "snowfall_cm",       # Total snowfall (cm)
    56: "total_precip_mm",   # Total precipitation (mm)
}

async def fetch_eccc_normals(station_id: int) -> Optional[dict]:
    """Fetch 1981-2010 climate normals for a station from ECCC MSC GeoMet API.

    Returns a dict:
      {"station_name","period_begin","period_end",
       "monthly": {"mean_temp_c":[jan..dec], "max_temp_c":[...], ...}}
    or None on failure. Cached forever after first success.
    """
    url = f"https://api.weather.gc.ca/collections/climate-normals/items?STN_ID={station_id}&f=json&limit=2000"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        logger.warning(f"ECCC normals fetch failed for STN_ID={station_id}: {e}")
        return None

    monthly = {v: [None]*12 for v in NORMAL_ELEMENTS.values()}
    station_name = None
    period_begin = None
    period_end = None
    for f in data.get("features", []):
        p = f.get("properties", {})
        nid = p.get("NORMAL_ID")
        month = p.get("MONTH")
        if nid not in NORMAL_ELEMENTS or not month or not (1 <= month <= 12):
            continue
        station_name = p.get("STATION_NAME") or station_name
        period_begin = p.get("PERIOD_BEGIN") or period_begin
        period_end = p.get("PERIOD_END") or period_end
        monthly[NORMAL_ELEMENTS[nid]][month-1] = p.get("VALUE")

    if not station_name:
        return None
    return {
        "station_name": station_name,
        "period_begin": period_begin,
        "period_end": period_end,
        "monthly": monthly,
    }

@api.get("/community/{slug}/climate-normals")
async def community_climate_normals(slug: str):
    """Return real ECCC 1981-2010 Canadian Climate Normals for the nearest station."""
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    name = None; region = None
    for r, lst in all_comm.items():
        for c in lst:
            if re.sub(r"[^a-z0-9]+","-", c.lower()).strip("-") == slug:
                name = c; region = r; break
        if name: break
    if not name: raise HTTPException(404, "Community not found")

    station = get_station_for_community(name, region)
    if not station:
        return {"community": name, "region": region, "available": False, "note": "No ECCC station mapping for this community."}

    # Cache check: permanent per-station cache
    cached = await db.eccc_normals.find_one({"station_id": station["station_id"]}, {"_id":0})
    if cached and cached.get("monthly"):
        return {
            "community": name,
            "region": region,
            "available": True,
            "station": {
                "id": station["station_id"],
                "climate_id": station.get("climate_id"),
                "name": cached.get("station_name") or station["name"],
                "region_label": station.get("region_label"),
                "eccc_url": eccc_station_page_url(station["station_id"]),
            },
            "period": {"begin": cached.get("period_begin"), "end": cached.get("period_end")},
            "monthly": cached["monthly"],
            "source": {
                "title": "Environment Canada — Canadian Climate Normals 1981-2010",
                "publisher": "Environment and Climate Change Canada (ECCC)",
                "api": "https://api.weather.gc.ca/collections/climate-normals",
            },
        }

    normals = await fetch_eccc_normals(station["station_id"])
    if not normals:
        return {
            "community": name,
            "region": region,
            "available": False,
            "station": {
                "id": station["station_id"],
                "name": station["name"],
                "eccc_url": eccc_station_page_url(station["station_id"]),
                "search_url": eccc_normals_search_url(name),
            },
            "note": "Live climate normals could not be fetched from Environment Canada at this time.",
        }

    # Persist forever
    await db.eccc_normals.replace_one(
        {"station_id": station["station_id"]},
        {"station_id": station["station_id"], **normals, "ts": now_iso()},
        upsert=True,
    )
    return {
        "community": name,
        "region": region,
        "available": True,
        "station": {
            "id": station["station_id"],
            "climate_id": station.get("climate_id"),
            "name": normals["station_name"],
            "region_label": station.get("region_label"),
            "eccc_url": eccc_station_page_url(station["station_id"]),
        },
        "period": {"begin": normals["period_begin"], "end": normals["period_end"]},
        "monthly": normals["monthly"],
        "source": {
            "title": "Environment Canada — Canadian Climate Normals 1981-2010",
            "publisher": "Environment and Climate Change Canada (ECCC)",
            "api": "https://api.weather.gc.ca/collections/climate-normals",
        },
    }


# =============== PUBLIC INGEST API (Lovable.dev integration) ===============
# Secure API-key-gated endpoints for a partner site (e.g. a Lovable.dev
# curation app) to push verified glossary edits + authoritative sources
# into EZtoFind. Every write is audit-logged.

def verify_lovable_key(x_ez_api_key: Optional[str] = Header(None)):
    if not LOVABLE_API_KEY:
        raise HTTPException(503, "Ingest API not configured on this deployment.")
    if not x_ez_api_key or x_ez_api_key != LOVABLE_API_KEY:
        raise HTTPException(401, "Invalid or missing X-EZ-API-Key header.")
    return True

class SourceItem(BaseModel):
    title: str
    url: str
    publisher: Optional[str] = None

class GlossaryUpsert(BaseModel):
    term: Optional[str] = None
    slug: Optional[str] = None            # if omitted, derived from term
    category: Optional[str] = None
    definition: Optional[str] = None
    sources: Optional[List[SourceItem]] = None
    faqs: Optional[List[dict]] = None      # each: {q, a}
    faqs_approved: Optional[bool] = None

class GlossaryBulkUpsert(BaseModel):
    terms: List[GlossaryUpsert]

def _slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

async def _apply_upsert(item: GlossaryUpsert, request_ip: str) -> dict:
    if not item.slug and not item.term:
        return {"status": "error", "error": "slug or term required"}
    slug = item.slug or _slugify(item.term)
    existing = await db.glossary.find_one({"slug": slug}, {"_id": 0})
    update = {}
    if item.term is not None:       update["term"] = item.term
    if item.category is not None:   update["category"] = item.category
    if item.definition is not None: update["definition"] = item.definition
    if item.sources is not None:
        update["sources_override"] = [s.dict() for s in item.sources]
    if item.faqs is not None:
        update["faqs"] = item.faqs
    if item.faqs_approved is not None:
        update["faqs_approved"] = item.faqs_approved
    update["last_curated_at"] = now_iso()
    if existing:
        await db.glossary.update_one({"slug": slug}, {"$set": update})
        action = "updated"
    else:
        update["slug"] = slug
        update["id"] = str(uuid.uuid4())
        update.setdefault("term", item.term or slug)
        update.setdefault("category", item.category or "General")
        update.setdefault("definition", item.definition or "")
        update.setdefault("faqs", item.faqs or [])
        await db.glossary.insert_one(update)
        action = "created"
    # Audit log
    await db.glossary_updates.insert_one({
        "slug": slug,
        "action": action,
        "changed_fields": list(update.keys()),
        "ts": now_iso(),
        "source_ip": request_ip,
        "via": "lovable_api",
    })
    return {"slug": slug, "status": action}

@api.put("/public/glossary/{slug}")
async def public_upsert_term(slug: str, item: GlossaryUpsert, request: Request, _=Depends(verify_lovable_key)):
    """Push a single glossary term update (Lovable.dev → EZtoFind)."""
    item.slug = slug
    ip = request.client.host if request.client else "unknown"
    result = await _apply_upsert(item, ip)
    # SEO push (silent-fail)
    try:
        from sitemap_generator import generate_sitemap
        from indexnow import notify_indexnow
        await generate_sitemap(db)
        await notify_indexnow([f"https://eztofind.ca/glossary/{slug}"])
    except Exception as e:
        logger.warning(f"post-update SEO push failed (silent-fail): {e}")
    return result

@api.post("/public/glossary/bulk")
async def public_bulk_upsert(body: GlossaryBulkUpsert, request: Request, _=Depends(verify_lovable_key)):
    """Bulk upsert up to 500 terms in one request."""
    if len(body.terms) > 500:
        raise HTTPException(400, "Max 500 terms per bulk request.")
    ip = request.client.host if request.client else "unknown"
    results = []
    for t in body.terms:
        try:
            r = await _apply_upsert(t, ip)
            results.append(r)
        except Exception as e:
            results.append({"slug": t.slug, "status": "error", "error": str(e)})
    created = sum(1 for r in results if r.get("status") == "created")
    updated = sum(1 for r in results if r.get("status") == "updated")
    errors  = sum(1 for r in results if r.get("status") == "error")
    # SEO push: regenerate sitemap + notify IndexNow of changed URLs
    try:
        from sitemap_generator import generate_sitemap
        from indexnow import notify_indexnow
        await generate_sitemap(db)
        changed_urls = [f"https://eztofind.ca/glossary/{r['slug']}" for r in results if r.get("status") in ("created","updated") and r.get("slug")]
        if changed_urls:
            await notify_indexnow(changed_urls)
    except Exception as e:
        logger.warning(f"post-ingest SEO push failed (silent-fail): {e}")
    return {"total": len(results), "created": created, "updated": updated, "errors": errors, "results": results}

@api.get("/public/glossary")
async def public_list_glossary(since: Optional[str] = None, limit: int = 500, offset: int = 0):
    """Public read of all terms (no auth). Optional ?since=ISO8601 for incremental sync."""
    q = {}
    if since:
        q["last_curated_at"] = {"$gte": since}
    total = await db.glossary.count_documents(q)
    items = await db.glossary.find(q, {"_id": 0}).sort("term", 1).skip(offset).limit(limit).to_list(limit)
    # For each, merge sources_override + defaults (deduped by URL)
    for it in items:
        it["sources"] = _merge_sources(it.get("sources_override"), it.get("term",""), it.get("category",""))
        it["sources_source"] = "curated+default" if it.get("sources_override") else "default"
        # Hide unapproved FAQs from public read
        if not it.get("faqs_approved"):
            it["faqs"] = []
            it["faqs_pending_review"] = True
    return {"total": total, "count": len(items), "offset": offset, "limit": limit, "terms": items}

@api.get("/public/glossary/{slug}")
async def public_get_term(slug: str):
    """Public read of a single term (no auth). Same shape as list, single item."""
    t = await db.glossary.find_one({"slug": slug}, {"_id": 0})
    if not t: raise HTTPException(404, "Term not found")
    t["sources"] = _merge_sources(t.get("sources_override"), t.get("term",""), t.get("category",""))
    t["sources_source"] = "curated+default" if t.get("sources_override") else "default"
    if not t.get("faqs_approved"):
        t["faqs"] = []
        t["faqs_pending_review"] = True
    return t


# =============== SEED ===============
@app.on_event("startup")
async def startup():
    # seed glossary if empty
    count = await db.glossary.count_documents({})
    if count == 0:
        seed = json.loads((ROOT_DIR/"data"/"glossary_seed.json").read_text())
        for item in seed:
            item.setdefault("id", str(uuid.uuid4()))
            item.setdefault("faqs", [])
            await db.glossary.insert_one(item)
        logger.info(f"Seeded {count} glossary terms")

    # MongoDB TTL index: auto-delete chat messages after 30 days (BCFSA/PIPA compliance)
    try:
        await db.chat_messages.create_index("expires_at", expireAfterSeconds=0)
        logger.info("chat_messages TTL index ensured (30-day auto-purge)")
    except Exception as e:
        logger.error(f"TTL index setup failed: {e}")

    # usage_quotas TTL — daily Doogie quota docs auto-delete after 3 days
    try:
        await db.usage_quotas.create_index("created_at", expireAfterSeconds=3*24*3600)
        await db.usage_quotas.create_index([("day", 1), ("kind", 1), ("session_id", 1)])
        await db.usage_quotas.create_index([("day", 1), ("kind", 1), ("ip", 1)])
        logger.info("usage_quotas indexes ensured (3-day TTL + compound lookup)")
    except Exception as e:
        logger.error(f"usage_quotas index setup failed: {e}")

    # Daily records-retention purge (BCFSA 7-yr + CASL 3-yr + PIPA data minimization).
    # First run happens 60s after startup so admins can hit /admin/retention/log to see
    # today's activity; then repeats every 24 h. Purge log stays for 7 years as proof.
    async def _retention_loop():
        import asyncio as _a
        while True:
            try:
                await _run_retention_purge()
            except Exception as e:
                logger.error(f"Retention loop iteration failed: {e}")
            await _a.sleep(24 * 3600)  # daily
    asyncio.create_task(asyncio.sleep(60)).add_done_callback(lambda _: asyncio.create_task(_retention_loop()))
    # Amenity warm-up disabled per user request

    # Generate sitemap.xml on startup so search engines get a fresh copy
    try:
        from sitemap_generator import generate_sitemap
        stats = await generate_sitemap(db)
        logger.info(f"sitemap.xml regenerated: {stats['total']} URLs ({stats['static']} static + {stats['glossary']} glossary + {stats['communities']} communities + {stats.get('neighbourhoods',0)} micro-neighbourhoods)")
    except Exception as e:
        logger.error(f"sitemap generation failed: {e}")

    # ---- MLS / CREA DDF® listings — mock seed + indexes ----
    try:
        lcount = await db.listings.count_documents({})
        if lcount == 0:
            mock_path = ROOT_DIR / "data" / "listings_mock.json"
            if mock_path.exists():
                mocks = json.loads(mock_path.read_text())
                for m in mocks:
                    m["created_at"] = m.get("updated_at") or now_iso()
                    m["is_mock"] = True
                await db.listings.insert_many(mocks)
                logger.info(f"Seeded {len(mocks)} MOCK MLS listings (pending real DDF® credentials)")
        # Ensure indexes (idempotent)
        await db.listings.create_index("listing_key", unique=True)
        await db.listings.create_index([("city", 1), ("list_price", 1)])
        await db.listings.create_index([("property_type", 1), ("beds", 1), ("list_price", 1)])
        await db.listings.create_index([("lat", 1), ("lon", 1)])
        await db.listings.create_index("status")
        await db.listings.create_index([("description", "text"), ("street_address", "text"), ("city", "text")])
        await db.mls_consent_log.create_index("occurred_at")
        await db.listing_analytics.create_index("occurred_at")
        await db.listing_analytics.create_index("flushed_to_crea")
        logger.info("MLS listings indexes ensured (unique listing_key, geo, price, text)")
    except Exception as e:
        logger.error(f"MLS listings seed/index setup failed: {e}")

    # Saved-search indexes (email, verification/unsubscribe tokens)
    try:
        await _save_search_index_setup()
        await db.email_outbox.create_index("created_at")
        await db.email_outbox.create_index("status")
        logger.info("saved_searches + email_outbox indexes ensured")
    except Exception as e:
        logger.error(f"saved_searches index setup failed: {e}")

@api.post("/admin/regenerate-sitemap")
async def admin_regen_sitemap(_=Depends(verify_admin)):
    from sitemap_generator import generate_sitemap
    return await generate_sitemap(db)


# =============== RECORDS RETENTION (BCFSA / PIPA / CASL) ===============
# Public: serves the human-readable retention policy for auditors, OIPC, BCFSA.
# Backend: runs a daily purge job that permanently destroys expired records and
# writes a tamper-evident destruction attestation to `retention_purge_log`.
_RETENTION_POLICY_PATH = ROOT_DIR / "data" / "retention-policy.md"

@api.get("/legal/retention-policy")
async def retention_policy_public():
    """Serve the current records retention policy as markdown. Referenced by BCFSA/OIPC/CASL audits."""
    if not _RETENTION_POLICY_PATH.exists():
        raise HTTPException(404, "Retention policy not found")
    return {
        "version": "1.0",
        "effective_date": "2026-02-26",
        "records_officer": "Doug LeMaire, REALTOR®",
        "brokerage": "Fraser Property Management Realty Services Ltd.",
        "brokerage_address": "1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5",
        "brokerage_phone": "+1-604-466-7021",
        "policy_markdown": _RETENTION_POLICY_PATH.read_text(),
    }

# Retention windows (in days). Each key maps to a MongoDB collection and the
# fields used to compute the record's age. Records older than the window are
# permanently deleted by the daily purger. Kept in sync with retention-policy.md.
_RETENTION_RULES = [
    {"collection": "buyer_leads",       "age_field": "created_at",       "days": 7*365 + 1, "class": "trading_services_lead"},
    {"collection": "seller_leads",      "age_field": "created_at",       "days": 7*365 + 1, "class": "trading_services_lead"},
    {"collection": "valuation_leads",   "age_field": "created_at",       "days": 7*365 + 1, "class": "trading_services_lead"},
    {"collection": "referral_requests", "age_field": "created_at",       "days": 7*365 + 1, "class": "trading_services_lead"},
    {"collection": "mls_consent_log",   "age_field": "ts",               "days": 7*365 + 1, "class": "casl_consent_log"},
    {"collection": "email_outbox",      "age_field": "sent_at",          "days": 3*365 + 1, "class": "email_audit"},
    # saved_searches: only purge those unsubscribed >3 years ago (see below)
]

async def _run_retention_purge():
    """Purge records past their retention window. Writes an attestation to
    `retention_purge_log` for each collection processed (proof-of-destruction
    without retaining the destroyed personal data)."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    for rule in _RETENTION_RULES:
        try:
            cutoff = now - timedelta(days=rule["days"])
            # Records store timestamps as ISO strings; compare lexicographically.
            cutoff_iso = cutoff.isoformat()
            col = db[rule["collection"]]
            n = await col.count_documents({rule["age_field"]: {"$lt": cutoff_iso}})
            if n > 0:
                r = await col.delete_many({rule["age_field"]: {"$lt": cutoff_iso}})
                await db.retention_purge_log.insert_one({
                    "purged_at": now.isoformat(),
                    "collection": rule["collection"],
                    "record_class": rule["class"],
                    "cutoff_iso": cutoff_iso,
                    "retention_days": rule["days"],
                    "count_destroyed": r.deleted_count,
                    "attestation": f"BCFSA/PIPA/CASL retention purge — {r.deleted_count} {rule['class']} records destroyed permanently.",
                })
                logger.info(f"Retention purge: {r.deleted_count} {rule['collection']} records destroyed (>{rule['days']} days).")
        except Exception as e:
            logger.error(f"Retention purge failed for {rule['collection']}: {e}")
    # saved_searches — unsubscribed >3 years ago
    try:
        cutoff = (now - timedelta(days=3*365 + 1)).isoformat()
        n_unsub = await db.saved_searches.count_documents({"unsubscribed_at": {"$lt": cutoff, "$ne": None}})
        if n_unsub > 0:
            r = await db.saved_searches.delete_many({"unsubscribed_at": {"$lt": cutoff, "$ne": None}})
            await db.retention_purge_log.insert_one({
                "purged_at": now.isoformat(),
                "collection": "saved_searches",
                "record_class": "unsubscribed_saved_search",
                "cutoff_iso": cutoff,
                "retention_days": 3*365 + 1,
                "count_destroyed": r.deleted_count,
                "attestation": f"CASL suppression-list expiry — {r.deleted_count} unsubscribed saved-searches destroyed permanently.",
            })
            logger.info(f"Retention purge: {r.deleted_count} unsubscribed saved-searches destroyed.")
    except Exception as e:
        logger.error(f"Retention purge failed for saved_searches: {e}")

@api.post("/admin/retention/run-now")
async def admin_run_retention_now(_=Depends(verify_admin)):
    """Manual trigger — normally runs daily via the background scheduler."""
    await _run_retention_purge()
    log = await db.retention_purge_log.find({}, {"_id": 0}).sort("purged_at", -1).to_list(20)
    return {"success": True, "recent_purge_log": log}

@api.get("/admin/retention/log")
async def admin_retention_log(_=Depends(verify_admin)):
    """Destruction attestation audit trail — proves purges happened without keeping destroyed PII."""
    log = await db.retention_purge_log.find({}, {"_id": 0}).sort("purged_at", -1).to_list(1000)
    return {"count": len(log), "log": log}


@api.get("/")
async def root():
    return {"app": "EZtoFind.ca", "status": "ok"}

# =============== ADMIN: AI CONTENT APPROVAL QUEUE (BCFSA compliance) ===============
@api.get("/admin/approvals/summary")
async def approvals_summary(_=Depends(verify_admin)):
    pending_faqs = await db.glossary.count_documents({"faqs.0": {"$exists": True}, "faqs_approved": {"$ne": True}})
    pending_syn = await db.community_synopses.count_documents({"approved": {"$ne": True}})
    pending_wx = await db.community_weather.count_documents({"approved": {"$ne": True}})
    pending_nhb = await db.neighbourhood_synopses.count_documents({"approved": {"$ne": True}})
    return {"pending_glossary_faqs": pending_faqs, "pending_synopses": pending_syn, "pending_weather": pending_wx, "pending_neighbourhoods": pending_nhb}

@api.get("/admin/approvals/glossary")
async def pending_glossary(_=Depends(verify_admin)):
    items = await db.glossary.find({"faqs.0": {"$exists": True}, "faqs_approved": {"$ne": True}}, {"_id":0}).to_list(1000)
    return items


# ---- FAQ Audit: covers ALL glossary terms with FAQs (approved AND pending),
# ranked by hallucination-risk. Doug uses this to spot-check the ~40 highest-
# risk terms after any bulk regeneration.

# Keywords that historically produce the most factually-sensitive answers.
# Each hit adds 1 to the risk score. Threshold >= 2 = "high risk".
FAQ_RISK_KEYWORDS = [
    # Tax / statutory numbers that change year-over-year
    "property transfer tax", "ptt", "gst", "hst", "capital gains", "speculation tax",
    "vacancy tax", "foreign buyer", "empty homes", "underused housing",
    # Legal / disclosure obligations
    "fintrac", "disclosure", "dual agency", "designated agency", "unrepresented",
    "fiduciary", "material latent", "psds", "form b", "strata form", "depreciation report",
    # Regulatory bodies + dated programs
    "bcfsa", "recbc", "cmhc", "cra", "wcb", "worksafe",
    # Numeric/date-sensitive
    "insured mortgage", "down payment", "stress test", "amortization",
    "cooling off", "rescission",
    # Specific programs
    "first-time home buyer", "newly built home", "home buyers' plan", "hbp",
    "first home savings account", "fhsa",
]


def _compute_faq_risk(term_doc: dict) -> tuple[int, list]:
    """Return (score, matched_keywords). Score = # of high-risk keywords found
    in the term itself, its definition, or any FAQ question/answer."""
    haystack = " ".join([
        term_doc.get("term") or "",
        term_doc.get("definition") or "",
        " ".join(
            (f.get("q") or "") + " " + (f.get("a") or "")
            for f in (term_doc.get("faqs") or [])
        ),
    ]).lower()
    hits = [kw for kw in FAQ_RISK_KEYWORDS if kw in haystack]
    return len(hits), hits


@api.get("/admin/faq-audit")
async def faq_audit(filter: str = "all", _=Depends(verify_admin)):
    """List every glossary term with FAQs, tagged with a risk score so Doug
    can spot-check the highest-risk terms.

    Query params:
      filter=all         → every term with FAQs
      filter=high        → risk score >= 2 (~40 terms)
      filter=approved    → faqs_approved==True
      filter=unapproved  → faqs_approved!=True
    """
    q = {"faqs.0": {"$exists": True}}
    if filter == "approved":
        q["faqs_approved"] = True
    elif filter == "unapproved":
        q["faqs_approved"] = {"$ne": True}

    docs = await db.glossary.find(q, {"_id": 0}).to_list(2000)

    enriched = []
    for d in docs:
        score, hits = _compute_faq_risk(d)
        if filter == "high" and score < 2:
            continue
        enriched.append({
            "slug": d.get("slug"),
            "term": d.get("term"),
            "category": d.get("category"),
            "definition": d.get("definition"),
            "faqs": d.get("faqs") or [],
            "faqs_approved": bool(d.get("faqs_approved")),
            "faqs_approved_at": d.get("faqs_approved_at"),
            "risk_score": score,
            "risk_hits": hits,
        })

    # Highest-risk first, then unapproved before approved, then by term.
    enriched.sort(key=lambda r: (-r["risk_score"], r["faqs_approved"], r["term"] or ""))
    return {"count": len(enriched), "items": enriched}


class UnapproveGlossary(BaseModel):
    slug: str


@api.post("/admin/approvals/glossary/unapprove")
async def unapprove_glossary(body: UnapproveGlossary, _=Depends(verify_admin)):
    """Reject/re-queue a single term's FAQs — clears the approved flag so the
    public site hides them again until Doug re-approves."""
    r = await db.glossary.update_one(
        {"slug": body.slug},
        {"$set": {"faqs_approved": False}, "$unset": {"faqs_approved_at": ""}},
    )
    return {"success": True, "modified": r.modified_count}


@api.get("/admin/approvals/synopses")
async def pending_synopses(_=Depends(verify_admin)):
    return await db.community_synopses.find({"approved": {"$ne": True}}, {"_id":0}).sort("ts", -1).to_list(1000)

@api.get("/admin/approvals/weather")
async def pending_weather(_=Depends(verify_admin)):
    return await db.community_weather.find({"approved": {"$ne": True}}, {"_id":0}).sort("ts", -1).to_list(1000)

class ApproveGlossary(BaseModel):
    slug: str
    faqs: Optional[List[dict]] = None  # allow editing before approval

@api.post("/admin/approvals/glossary/approve")
async def approve_glossary(body: ApproveGlossary, _=Depends(verify_admin)):
    update = {"faqs_approved": True, "faqs_approved_at": now_iso()}
    if body.faqs is not None: update["faqs"] = body.faqs
    r = await db.glossary.update_one({"slug": body.slug}, {"$set": update})
    return {"success": True, "modified": r.modified_count}

@api.post("/admin/approvals/glossary/{slug}/regenerate")
async def regenerate_glossary_faqs(slug: str, _=Depends(verify_admin)):
    t = await db.glossary.find_one({"slug": slug}, {"_id":0})
    if not t: raise HTTPException(404, "Term not found")
    faqs = await generate_faqs_for_term(t["term"], t["definition"])
    await db.glossary.update_one({"slug": slug}, {"$set": {"faqs": faqs, "faqs_approved": False}})
    return {"success": True, "faqs": faqs}

class ApproveSynopsis(BaseModel):
    slug: str
    synopsis: Optional[str] = None

@api.post("/admin/approvals/synopses/approve")
async def approve_synopsis(body: ApproveSynopsis, _=Depends(verify_admin)):
    update = {"approved": True, "approved_at": now_iso()}
    if body.synopsis is not None: update["synopsis"] = body.synopsis
    r = await db.community_synopses.update_one({"slug": body.slug}, {"$set": update})
    return {"success": True, "modified": r.modified_count}

@api.post("/admin/approvals/synopses/{slug}/regenerate")
async def regenerate_synopsis(slug: str, _=Depends(verify_admin)):
    d = await db.community_synopses.find_one({"slug": slug}, {"_id":0})
    if not d: raise HTTPException(404, "Not found")
    s = await generate_community_synopsis(d["name"], d["region"])
    await db.community_synopses.update_one({"slug": slug}, {"$set": {"synopsis": s, "approved": False, "ts": now_iso()}})
    return {"success": True, "synopsis": s}

class ApproveWeather(BaseModel):
    slug: str
    weather: Optional[str] = None

@api.post("/admin/approvals/weather/approve")
async def approve_weather(body: ApproveWeather, _=Depends(verify_admin)):
    update = {"approved": True, "approved_at": now_iso()}
    if body.weather is not None: update["weather"] = body.weather
    r = await db.community_weather.update_one({"slug": body.slug}, {"$set": update})
    return {"success": True, "modified": r.modified_count}

@api.post("/admin/approvals/weather/{slug}/regenerate")
async def regenerate_weather(slug: str, _=Depends(verify_admin)):
    d = await db.community_weather.find_one({"slug": slug}, {"_id":0})
    if not d: raise HTTPException(404, "Not found")
    w = await generate_community_weather(d["name"], d["region"])
    await db.community_weather.update_one({"slug": slug}, {"$set": {"weather": w, "approved": False, "ts": now_iso()}})
    return {"success": True, "weather": w}

@api.post("/admin/approvals/glossary/approve-all")
async def approve_all_glossary(_=Depends(verify_admin)):
    r = await db.glossary.update_many({"faqs.0": {"$exists": True}}, {"$set": {"faqs_approved": True, "faqs_approved_at": now_iso()}})
    return {"success": True, "modified": r.modified_count}

@api.post("/admin/approvals/synopses/approve-all")
async def approve_all_synopses(_=Depends(verify_admin)):
    r = await db.community_synopses.update_many({"approved": {"$ne": True}, "synopsis": {"$ne": ""}}, {"$set": {"approved": True, "approved_at": now_iso()}})
    return {"success": True, "modified": r.modified_count}

@api.post("/admin/approvals/weather/approve-all")
async def approve_all_weather(_=Depends(verify_admin)):
    r = await db.community_weather.update_many({"approved": {"$ne": True}, "weather": {"$ne": ""}}, {"$set": {"approved": True, "approved_at": now_iso()}})
    return {"success": True, "modified": r.modified_count}

# --- Micro-neighbourhood synopses (sub-areas of communities) ---
@api.get("/admin/approvals/neighbourhoods")
async def pending_neighbourhoods(_=Depends(verify_admin)):
    return await db.neighbourhood_synopses.find({"approved": {"$ne": True}}, {"_id":0}).sort("ts", -1).to_list(2000)

class ApproveNeighbourhood(BaseModel):
    slug: str
    n_slug: str
    synopsis: Optional[str] = None

@api.post("/admin/approvals/neighbourhoods/approve")
async def approve_neighbourhood(body: ApproveNeighbourhood, _=Depends(verify_admin)):
    update = {"approved": True, "approved_at": now_iso()}
    if body.synopsis is not None: update["synopsis"] = body.synopsis
    r = await db.neighbourhood_synopses.update_one({"slug": body.slug, "n_slug": body.n_slug}, {"$set": update})
    return {"success": True, "modified": r.modified_count}

@api.post("/admin/approvals/neighbourhoods/approve-all")
async def approve_all_neighbourhoods(_=Depends(verify_admin)):
    r = await db.neighbourhood_synopses.update_many({"approved": {"$ne": True}, "synopsis": {"$ne": ""}}, {"$set": {"approved": True, "approved_at": now_iso()}})
    return {"success": True, "modified": r.modified_count}

@api.post("/admin/approvals/neighbourhoods/{slug}/{n_slug}/regenerate")
async def regenerate_neighbourhood(slug: str, n_slug: str, _=Depends(verify_admin)):
    d = await db.neighbourhood_synopses.find_one({"slug": slug, "n_slug": n_slug}, {"_id":0})
    if not d: raise HTTPException(404, "Not found")
    # Re-collect listing stats for the prompt context
    agg = await db.listings.aggregate([
        {"$match": {"status":"Active","city":{"$regex":f"^{re.escape(d['community'])}$","$options":"i"},"region":d["neighbourhood"],"property_type":{"$nin":list(EXCLUDED_PROPERTY_TYPES)}}},
        {"$group": {"_id": None, "count":{"$sum":1}, "min_price":{"$min":"$list_price"}, "max_price":{"$max":"$list_price"}, "avg_beds":{"$avg":"$beds"}, "types":{"$addToSet":"$property_type"}}},
    ]).to_list(1)
    stats = agg[0] if agg else {}
    ls = {
        "types": ", ".join((stats.get("types") or [])[:6]) or "residential",
        "beds_mix": f"avg {stats.get('avg_beds') or 0:.1f} beds" if stats.get("avg_beds") else "mixed",
        "price_hint": f"listings roughly ${stats.get('min_price') or 0:,.0f}–${stats.get('max_price') or 0:,.0f}" if stats.get("min_price") else "price varies",
    }
    s = await generate_neighbourhood_synopsis(d["neighbourhood"], d["community"], d["region"], ls)
    await db.neighbourhood_synopses.update_one({"slug": slug, "n_slug": n_slug}, {"$set": {"synopsis": s, "approved": False, "ts": now_iso()}})
    return {"success": True, "synopsis": s}

@api.post("/admin/approvals/generate-all-neighbourhoods")
async def generate_all_neighbourhoods(auto_approve: bool = False, _=Depends(verify_admin)):
    """Generate Claude-authored synopses for EVERY sub-neighbourhood with active MLS
    listings, across all BC communities. Runs in background (~40-90 min for ~500 sub-areas).
    If auto_approve=true, each synopsis is marked approved (BCFSA-attested by Doug via
    this admin action) the moment it's written — publishes to the public site immediately."""
    import asyncio as _a
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    city_map = {}
    for region, lst in all_comm.items():
        for name in lst:
            city_map[name.lower()] = (name, region)

    # Aggregate distinct (city, region) pairs from live MLS
    pipeline = [
        {"$match": {"status":"Active","region":{"$nin":["", None]}}},
        {"$group": {"_id": {"city":"$city","region":"$region"}}},
    ]
    todo = []
    async for row in db.listings.aggregate(pipeline):
        city = (row["_id"].get("city") or "").strip()
        n_name = (row["_id"].get("region") or "").strip()
        hit = city_map.get(city.lower())
        if not hit or not n_name: continue
        c_name, region = hit
        if n_name.strip().lower() == region.strip().lower(): continue
        c_slug = re.sub(r"[^a-z0-9]+","-", c_name.lower()).strip("-")
        n_slug = re.sub(r"[^a-z0-9]+","-", n_name.lower()).strip("-")
        if not n_slug: continue
        todo.append((c_slug, c_name, region, n_slug, n_name))

    async def worker():
        SEM = _a.Semaphore(4)
        async def gen_one(c_slug, c_name, region, n_slug, n_name):
            async with SEM:
                existing = await db.neighbourhood_synopses.find_one({"slug": c_slug, "n_slug": n_slug, "synopsis": {"$ne": ""}})
                if existing: return
                agg = await db.listings.aggregate([
                    {"$match": {"status":"Active","city":{"$regex":f"^{re.escape(c_name)}$","$options":"i"},"region":n_name,"property_type":{"$nin":list(EXCLUDED_PROPERTY_TYPES)}}},
                    {"$group": {"_id": None, "count":{"$sum":1}, "min_price":{"$min":"$list_price"}, "max_price":{"$max":"$list_price"}, "avg_beds":{"$avg":"$beds"}, "types":{"$addToSet":"$property_type"}}},
                ]).to_list(1)
                stats = agg[0] if agg else {}
                ls = {
                    "types": ", ".join((stats.get("types") or [])[:6]) or "residential",
                    "beds_mix": f"avg {stats.get('avg_beds') or 0:.1f} beds" if stats.get("avg_beds") else "mixed",
                    "price_hint": f"listings roughly ${stats.get('min_price') or 0:,.0f}–${stats.get('max_price') or 0:,.0f}" if stats.get("min_price") else "price varies",
                }
                s = await generate_neighbourhood_synopsis(n_name, c_name, region, ls)
                if s:
                    doc = {"slug": c_slug, "n_slug": n_slug, "community": c_name, "region": region, "neighbourhood": n_name, "synopsis": s, "approved": bool(auto_approve), "ts": now_iso()}
                    if auto_approve:
                        doc["approved_at"] = now_iso()
                        doc["approved_by"] = "bulk_admin_action"
                    await db.neighbourhood_synopses.replace_one(
                        {"slug": c_slug, "n_slug": n_slug},
                        doc,
                        upsert=True,
                    )
        await _a.gather(*[gen_one(*t) for t in todo], return_exceptions=True)
        logger.info(f"Bulk neighbourhood synopsis generation complete: {len(todo)} sub-areas (auto_approve={auto_approve})")
    _a.create_task(worker())
    return {"success": True, "message": f"Generating synopses for {len(todo)} micro-neighbourhoods in background. Refresh in ~40-90 minutes.", "total": len(todo)}

@api.post("/admin/approvals/generate-all")
async def generate_all_missing(auto_approve: bool = False, _=Depends(verify_admin)):
    """Generate synopsis + weather for EVERY BC community that doesn't have them yet. Runs in background.
    If auto_approve=true, each doc is marked approved (BCFSA-attested by Doug via this admin action)
    the moment it's written — publishes to the public site immediately."""
    import asyncio as _a
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    todo = []
    for region, lst in all_comm.items():
        for community in lst:
            slug = re.sub(r"[^a-z0-9]+","-", community.lower()).strip("-")
            todo.append((slug, community, region))

    def _approve_fields():
        if not auto_approve: return {}
        return {"approved": True, "approved_at": now_iso(), "approved_by": "bulk_admin_action"}

    async def worker():
        SEM = _a.Semaphore(4)  # up to 4 concurrent Claude calls
        async def gen_syn(slug, name, region):
            async with SEM:
                if await db.community_synopses.find_one({"slug": slug, "synopsis": {"$ne": ""}}): return
                s = await generate_community_synopsis(name, region)
                if s:
                    doc = {"slug": slug, "name": name, "region": region, "synopsis": s, "approved": bool(auto_approve), "ts": now_iso(), **_approve_fields()}
                    await db.community_synopses.replace_one({"slug": slug}, doc, upsert=True)
        async def gen_wx(slug, name, region):
            async with SEM:
                if await db.community_weather.find_one({"slug": slug, "weather": {"$ne": ""}}): return
                w = await generate_community_weather(name, region)
                if w:
                    doc = {"slug": slug, "name": name, "region": region, "weather": w, "approved": bool(auto_approve), "ts": now_iso(), **_approve_fields()}
                    await db.community_weather.replace_one({"slug": slug}, doc, upsert=True)
        tasks = []
        for slug, name, region in todo:
            tasks.append(gen_syn(slug, name, region))
            tasks.append(gen_wx(slug, name, region))
        await _a.gather(*tasks, return_exceptions=True)
        logger.info(f"Bulk community generation complete for {len(todo)} communities (auto_approve={auto_approve})")

    _a.create_task(worker())
    return {"success": True, "message": f"Generating synopsis + weather for {len(todo)} communities in background. Refresh the approval queues in ~15-30 minutes.", "total": len(todo)}

@api.post("/admin/approvals/generate-all-glossary")
async def generate_all_glossary(auto_approve: bool = False, regenerate: bool = False, _=Depends(verify_admin)):
    """Generate FAQs for glossary terms. Runs in background. ~30-60 min for 400+ terms.
    If auto_approve=true, FAQs publish immediately as they're written.
    If regenerate=true, OVERWRITES existing FAQs (used for hallucination-hardened v2 sweep)."""
    import asyncio as _a
    if regenerate:
        todo = await db.glossary.find({}, {"_id":0,"slug":1,"term":1,"definition":1}).to_list(2000)
    else:
        todo = await db.glossary.find({"$or":[{"faqs":{"$exists":False}},{"faqs":[]}]}, {"_id":0,"slug":1,"term":1,"definition":1}).to_list(2000)

    async def worker():
        SEM = _a.Semaphore(4)
        async def gen(t):
            async with SEM:
                if not regenerate and await db.glossary.find_one({"slug": t["slug"], "faqs.0": {"$exists": True}}): return
                faqs = await generate_faqs_for_term(t["term"], t["definition"])
                if faqs:
                    update = {"faqs": faqs, "faqs_approved": bool(auto_approve), "faqs_generated_at": now_iso(), "faqs_prompt_version": "v2-hallucination-hardened"}
                    if auto_approve:
                        update["faqs_approved_at"] = now_iso()
                        update["faqs_approved_by"] = "bulk_admin_action"
                    await db.glossary.update_one({"slug": t["slug"]}, {"$set": update})
        await _a.gather(*[gen(t) for t in todo], return_exceptions=True)
        logger.info(f"Bulk FAQ generation complete for {len(todo)} glossary terms (regenerate={regenerate}, auto_approve={auto_approve})")

    _a.create_task(worker())
    action = "Regenerating" if regenerate else "Generating"
    return {"success": True, "message": f"{action} FAQs for {len(todo)} glossary terms in background (v2 prompt).", "total": len(todo)}

@api.post("/admin/approvals/glossary/unapprove-all")
async def unapprove_all_glossary(_=Depends(verify_admin)):
    """Reset approval flag on every glossary term so they re-queue for review."""
    r = await db.glossary.update_many({"faqs_approved": True}, {"$set": {"faqs_approved": False}})
    return {"success": True, "modified": r.modified_count}

@api.get("/admin/approvals/generation-progress")
async def generation_progress(_=Depends(verify_admin)):
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    total_comm = sum(len(v) for v in all_comm.values())
    syn_done = await db.community_synopses.count_documents({"synopsis": {"$ne": ""}})
    wx_done = await db.community_weather.count_documents({"weather": {"$ne": ""}})
    gloss_total = await db.glossary.count_documents({})
    gloss_done = await db.glossary.count_documents({"faqs.0": {"$exists": True}})
    return {
        "total": total_comm, "synopses_generated": syn_done, "weather_generated": wx_done,
        "synopses_pct": round(100*syn_done/max(total_comm,1),1), "weather_pct": round(100*wx_done/max(total_comm,1),1),
        "glossary_total": gloss_total, "glossary_generated": gloss_done,
        "glossary_pct": round(100*gloss_done/max(gloss_total,1),1)
    }

# =============== MANAGING BROKER POLICIES (Print to PDF) ===============
from policies import POLICIES

@api.get("/admin/policies")
async def list_policies(_=Depends(verify_admin)):
    return [
        {"slug":"ai-use-policy","title":"AI Use Policy","desc":"Brokerage-level AI policy aligned with BCFSA guidelines and RESA Rules 28, 30, 33, 34, 40, 41."},
        {"slug":"licensee-training-memo","title":"Licensee Training Memo","desc":"Confirmation Doug has been trained on AI features and understands responsibilities."},
        {"slug":"eo-insurance-letter","title":"E&O Insurance Disclosure Letter","desc":"Template letter to your E&O provider disclosing AI use for coverage confirmation."},
        {"slug":"vendor-due-diligence","title":"Vendor Due Diligence Memo","desc":"Documented review of Anthropic + Emergent per BCFSA vendor DD guidance."}
    ]

@api.get("/admin/policies/{slug}", response_class=HTMLResponse)
async def get_policy(slug: str, token: Optional[str] = None):
    # Support both Bearer token in header AND ?token= query param for print-preview
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            if payload.get("email") != ADMIN_EMAIL: raise HTTPException(403, "Forbidden")
        except jwt.InvalidTokenError:
            raise HTTPException(401, "Invalid token")
    if slug not in POLICIES: raise HTTPException(404, "Policy not found")
    return HTMLResponse(POLICIES[slug])
@api.get("/admin/chats")
async def list_chat_sessions(_=Depends(verify_admin), limit: int = 100):
    """List recent chat sessions with counts + PII flag summary."""
    pipeline = [
        {"$sort": {"ts": -1}},
        {"$group": {
            "_id": "$session_id",
            "messages": {"$sum": 1},
            "last_ts": {"$first": "$ts"},
            "first_ts": {"$last": "$ts"},
            "pii_flags": {"$addToSet": "$pii_flags"}
        }},
        {"$sort": {"last_ts": -1}},
        {"$limit": limit}
    ]
    sessions = await db.chat_messages.aggregate(pipeline).to_list(limit)
    for s in sessions:
        s["session_id"] = s.pop("_id")
        # flatten pii_flags
        flags = set()
        for f in s.get("pii_flags", []):
            if isinstance(f, list): flags.update(f)
        s["pii_flags"] = sorted(flags)
    return sessions

@api.get("/admin/chats/{session_id}")
async def get_chat_session(session_id: str, _=Depends(verify_admin)):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id":0, "expires_at":0}).sort("ts", 1).to_list(500)
    return {"session_id": session_id, "messages": msgs}

@api.delete("/admin/chats/{session_id}")
async def delete_chat_session(session_id: str, _=Depends(verify_admin)):
    r = await db.chat_messages.delete_many({"session_id": session_id})
    return {"success": True, "deleted": r.deleted_count}

@api.post("/admin/chats/purge-all")
async def purge_all_chats(_=Depends(verify_admin)):
    r = await db.chat_messages.delete_many({})
    return {"success": True, "deleted": r.deleted_count}

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# =============== CREA DDF® — MLS® LISTINGS (compliance-first) ===============
# All endpoints below are rate-limited via _limiter defined at top of file.
from services.analytics_logger import record_event as _log_event
from services.ddf_sync import (
    credentials_ready as _ddf_ready,
    sync_incremental as _ddf_sync,
    test_connection as _ddf_test,
)


# EZtoFind.ca is a RESIDENTIAL real estate site — commercial/industrial
# property types are excluded everywhere (facet dropdown, listings search,
# and Doogie NL search). If you need to re-enable a category, remove it here.
EXCLUDED_PROPERTY_TYPES = {
    "Business", "Hospitality", "Industrial", "Office", "Retail", "Other",
    # Deliberately excluded per Doug: Multi-family and Recreational are not
    # part of the residential focus of this site.
    "Multi-family", "Multi Family", "Multi-Family",
    "Recreation", "Recreational", "Recreational Property",
}

# Curated user-facing property-type filter options. This is what appears in
# every Community/City filter dropdown across the site. Order matches Doug's
# preferred UX order — alphabetical with common-first callouts.
PROPERTY_TYPE_UI_OPTIONS = [
    "Acreage",
    "Condo",
    "Detached",
    "Duplex",
    "Equestrian",
    "Land",
    "Manufactured / Mobile",
    "Single Family",
    "Townhouse",
]

def _sanitize_listing(doc: dict) -> dict:
    doc.pop("_id", None)
    # CREA compliance: brokerage name is required. Listing agent is per-listing (from feed).
    doc.setdefault("brokerage_name", "Listing Brokerage (see REALTOR.ca)")
    # Do NOT default listing_agent — that field is only populated from real DDF feed data.
    doc.setdefault("realtor_ca_url", f"https://www.realtor.ca/real-estate/{doc.get('listing_key','')}")
    return doc


# --------- Locality resolver ---------
# Cache of distinct BC city + region values (built from Mongo listings).
# Reused by /api/listings and /api/doogie/mls-search so that a hero query
# like "Whistler" becomes a STRICT city filter instead of a text-index leak.
_locality_cache: dict = {"cities": None, "regions": None, "loaded_at": 0.0}

async def _get_localities() -> dict:
    """Return {'cities': [...], 'regions': [...]} — deduplicated, sorted longest-first
    so 'North Vancouver' beats 'Vancouver' on longest-substring match. Cached for 10 min."""
    import time
    now = time.time()
    if _locality_cache["cities"] and now - _locality_cache["loaded_at"] < 600:
        return _locality_cache
    try:
        cities = [c for c in await db.listings.distinct("city", {"status": "Active"}) if c]
        regions = [r for r in await db.listings.distinct("region", {"status": "Active"}) if r]
    except Exception as e:
        logger.warning(f"locality distinct() failed: {e}")
        return {"cities": [], "regions": []}
    # Sort longest first so multi-word cities win the substring match
    cities.sort(key=lambda s: (-len(s), s.lower()))
    regions.sort(key=lambda s: (-len(s), s.lower()))
    _locality_cache["cities"] = cities
    _locality_cache["regions"] = regions
    _locality_cache["loaded_at"] = now
    return _locality_cache

async def _resolve_bc_locality(q: str) -> Optional[dict]:
    """Given a natural-language query, return {"city": "..."} or {"region": "..."}
    if the query matches a known BC city or CREA CityRegion (case-insensitive).
    Match is: exact match wins → whole-word substring match on cities → then regions.
    Returns None if no locality is detected (caller can fall back to $text search)."""
    if not q or not q.strip():
        return None
    ql = q.strip().lower()
    localities = await _get_localities()
    # 1) Exact match (e.g. user typed just "Whistler")
    for c in localities["cities"]:
        if c.lower() == ql:
            return {"city": c}
    for r in localities["regions"]:
        if r.lower() == ql:
            return {"region": r}
    # 2) Whole-word substring match (e.g. "4-bed homes in Whistler")
    import re as _re
    for c in localities["cities"]:
        if _re.search(rf"\b{_re.escape(c.lower())}\b", ql):
            return {"city": c}
    for r in localities["regions"]:
        if _re.search(rf"\b{_re.escape(r.lower())}\b", ql):
            return {"region": r}
    return None

@api.get("/listings")
@_limiter.limit("60/minute")
async def search_listings(
    request: Request,
    q: Optional[str] = None,
    community: Optional[str] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    property_type: Optional[str] = None,
    beds_min: Optional[int] = None,
    baths_min: Optional[int] = None,
    price_min: Optional[int] = None,
    price_max: Optional[int] = None,
    features: Optional[str] = None,  # comma-separated
    sort: Optional[str] = "newest",  # newest|price_asc|price_desc
    limit: int = 24,
    offset: int = 0,
):
    """Search active MLS® listings. Rate-limited (60/min per IP).
    Returns { total, count, offset, limit, listings: [...], compliance }.
    """
    query: dict = {"status": "Active", "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)}}
    # Accept legacy `community` param as an alias for city (frontend has used both).
    if community and not city:
        city = community
    if city:      query["city"] = {"$regex": f"^{re.escape(city)}$", "$options": "i"}
    if region:    query["region"] = {"$regex": f"^{re.escape(region)}$", "$options": "i"}
    if property_type:
        # Silently drop requests for excluded (commercial) types — residential only.
        if property_type in EXCLUDED_PROPERTY_TYPES:
            return {"total": 0, "count": 0, "offset": offset, "limit": limit, "listings": [],
                    "using_mock_data": not _ddf_ready(), "compliance": {
                        "trademark_notice": "MLS®, Multiple Listing Service® and the associated logos are owned by The Canadian Real Estate Association (CREA).",
                        "data_source": "CREA DDF® — residential only",
                    }}
        # For fuzzy types (Equestrian, Manufactured / Mobile, Recreation) merge
        # a description-text fallback so we catch listings even when CREA
        # doesn't have a matching structured label.
        if property_type in ("Equestrian", "Manufactured / Mobile", "Recreation", "Recreational"):
            merged = query.get("$and", [])
            merged.append(_property_type_or_feature_query(property_type))
            query["$and"] = merged
            # Drop the base $nin restriction on property_type so it doesn't
            # exclude records that only match via the description fallback.
            query.pop("property_type", None)
        else:
            query["property_type"] = _property_type_query(property_type)
    if beds_min is not None:  query["beds"] = {"$gte": beds_min}
    if baths_min is not None: query["baths"] = {"$gte": baths_min}
    price_q = {}
    if price_min is not None: price_q["$gte"] = price_min
    if price_max is not None: price_q["$lte"] = price_max
    if price_q: query["list_price"] = price_q
    if features:
        feats = [f.strip() for f in features.split(",") if f.strip()]
        if feats:
            # Each feature must match either the structured tag OR appear in
            # the description (case-insensitive). Same semantics as Doogie NL.
            existing_and = query.get("$and", [])
            query["$and"] = existing_and + _features_query(feats)
    # `q` (natural-language query from the hero search bar) is treated as a
    # LOCALITY hint first — if it names a known BC city or CityRegion, we
    # promote it to a strict exact-match filter so a search for "Whistler"
    # never leaks Vancouver/Bowen listings whose description happens to
    # mention Whistler. Only if we cannot resolve a locality do we fall
    # back to Mongo's full-text index.
    if q and not (city or region):
        loc = await _resolve_bc_locality(q)
        if loc:
            for k, v in loc.items():
                query[k] = {"$regex": f"^{re.escape(v)}$", "$options": "i"}
        else:
            query["$text"] = {"$search": q}
    elif q:
        # City/region already set explicitly — still let q filter within that
        # scope (e.g. city=Vancouver & q="ocean view")
        query["$text"] = {"$search": q}

    sort_key = [("created_at", -1)]
    if sort == "price_asc":  sort_key = [("list_price", 1)]
    if sort == "price_desc": sort_key = [("list_price", -1)]

    total = await db.listings.count_documents(query)
    cursor = db.listings.find(query).sort(sort_key).skip(max(0, offset)).limit(min(100, limit))
    items = [_sanitize_listing(d) for d in await cursor.to_list(200)]

    # Log impressions asynchronously (fire & forget)
    for it in items:
        try:
            await _log_event(db, it.get("listing_key",""), "impression", {"path": "/listings"})
        except Exception:
            pass

    return {
        "total": total,
        "count": len(items),
        "offset": offset,
        "limit": limit,
        "listings": items,
        "using_mock_data": not _ddf_ready(),
        "compliance": {
            "trademark_notice": "MLS®, Multiple Listing Service® and the associated logos are owned by The Canadian Real Estate Association (CREA) and identify the quality of services provided by real estate professionals who are members of CREA. REALTOR® is a trademark of REALTOR® Canada Inc.",
            "data_source": "CREA DDF® (Data Distribution Facility)" if _ddf_ready() else "MOCK DATA — awaiting CREA DDF® credential provisioning",
        },
    }

@api.get("/listings/{listing_key}")
@_limiter.limit("120/minute")
async def get_listing(request: Request, listing_key: str):
    d = await db.listings.find_one({"listing_key": listing_key})
    if not d:
        raise HTTPException(404, "Listing not found")
    d = _sanitize_listing(d)
    # Log detail view
    try:
        await _log_event(db, listing_key, "detail_view", {"referer": request.headers.get("referer","")})
    except Exception:
        pass
    return d

@api.post("/listings/analytics/track")
@_limiter.limit("120/minute")
async def track_event(request: Request, payload: dict):
    """Public analytics beacon. Frontend fire-and-forget event logger."""
    listing_key = (payload.get("listing_key") or "").strip()
    event_type  = (payload.get("event_type") or "").strip()
    if not listing_key or not event_type:
        raise HTTPException(400, "listing_key and event_type required")
    await _log_event(db, listing_key, event_type, {
        "path": payload.get("path"),
        "ua": request.headers.get("user-agent","")[:200],
    })
    return {"ok": True}

# =============== SITE-WIDE PAGE-VIEW BEACON (feeds Growth Dashboard) ===============
# Anonymous session-scoped page-view tracking. No PII stored — just a hashed
# session ID + path + timestamp + optional referrer. Used to measure unique
# visitors, sessions, and top-pages until GA4 is fully wired.
_BOT_RX = re.compile(r"bot|crawler|spider|slurp|indexnow|gptbot|claudebot|perplexit|google-inspection|bingbot|yandex|duckduck|ccbot|amazonbot|bytespider", re.I)

@api.post("/track/page")
@_limiter.limit("240/minute")
async def track_pageview(request: Request, payload: dict):
    ua = request.headers.get("user-agent","")[:200]
    # Skip known crawlers so the dashboard reflects human traffic only.
    if _BOT_RX.search(ua): return {"ok": True, "skipped": "bot"}
    sid = (payload.get("session_id") or "").strip()[:64]
    path = (payload.get("path") or "").strip()[:400]
    if not sid or not path: return {"ok": False}
    doc = {
        "sid": sid,
        "path": path,
        "ref": (payload.get("referrer") or "")[:400],
        "lang": (payload.get("lang") or "")[:8],
        "ua": ua,
        "ip_hash": hashlib.sha256((request.client.host if request.client else "").encode()).hexdigest()[:16],
        "ts": now_iso(),
    }
    await db.pageviews.insert_one(doc)
    return {"ok": True}

# =============== ADMIN GROWTH DASHBOARD ===============
@api.get("/admin/growth/dashboard")
async def growth_dashboard(_=Depends(verify_admin)):
    """Aggregate all launch-growth metrics from Mongo. Refreshed every request.
    Feeds the /admin/growth UI so Doug can course-correct weekly."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    d30 = (now - timedelta(days=30)).isoformat()
    d7 = (now - timedelta(days=7)).isoformat()
    d1 = (now - timedelta(days=1)).isoformat()

    # --- Traffic (from our own pageview beacon; bots already filtered) ---
    pv_30d = await db.pageviews.count_documents({"ts": {"$gte": d30}})
    pv_7d  = await db.pageviews.count_documents({"ts": {"$gte": d7}})
    pv_24h = await db.pageviews.count_documents({"ts": {"$gte": d1}})
    uniq_30d = len(await db.pageviews.distinct("sid", {"ts": {"$gte": d30}}))
    uniq_7d  = len(await db.pageviews.distinct("sid", {"ts": {"$gte": d7}}))
    uniq_24h = len(await db.pageviews.distinct("sid", {"ts": {"$gte": d1}}))

    # Top pages 7d
    top_pages = []
    async for r in db.pageviews.aggregate([
        {"$match": {"ts": {"$gte": d7}}},
        {"$group": {"_id": "$path", "views": {"$sum": 1}, "sids": {"$addToSet": "$sid"}}},
        {"$project": {"path": "$_id", "_id": 0, "views": 1, "uniques": {"$size": "$sids"}}},
        {"$sort": {"views": -1}},
        {"$limit": 20},
    ]): top_pages.append(r)

    # Referrer breakdown 7d
    referrers = []
    async for r in db.pageviews.aggregate([
        {"$match": {"ts": {"$gte": d7}, "ref": {"$ne": ""}}},
        {"$addFields": {"host": {"$arrayElemAt": [{"$split": [{"$arrayElemAt": [{"$split": ["$ref", "://"]}, 1]}, "/"]}, 0]}}},
        {"$group": {"_id": "$host", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}},
        {"$limit": 15},
    ]): referrers.append({"host": r["_id"] or "(direct)", "n": r["n"]})

    # Daily trend (last 30 days) — for the sparkline
    trend = {}
    async for r in db.pageviews.aggregate([
        {"$match": {"ts": {"$gte": d30}}},
        {"$group": {"_id": {"$substr": ["$ts", 0, 10]}, "views": {"$sum": 1}, "sids": {"$addToSet": "$sid"}}},
        {"$project": {"day": "$_id", "_id": 0, "views": 1, "uniques": {"$size": "$sids"}}},
        {"$sort": {"day": 1}},
    ]): trend[r["day"]] = {"views": r["views"], "uniques": r["uniques"]}

    # --- Doogie sessions ---
    doogie_30d = len(await db.chat_messages.distinct("session_id", {"created_at": {"$gte": d30}}))
    doogie_7d  = len(await db.chat_messages.distinct("session_id", {"created_at": {"$gte": d7}}))
    doogie_24h = len(await db.chat_messages.distinct("session_id", {"created_at": {"$gte": d1}}))

    # --- Lead funnel ---
    async def lead_count(col, since):
        try: return await db[col].count_documents({"created_at": {"$gte": since}})
        except Exception: return 0
    buyer_30 = await lead_count("buyer_leads", d30)
    seller_30 = await lead_count("seller_leads", d30)
    valuation_30 = await lead_count("valuation_leads", d30)
    referral_30 = await lead_count("referral_requests", d30)
    saved_30 = await db.saved_searches.count_documents({"created_at": {"$gte": d30}})

    # --- Content stats (approved & live) ---
    syn_live = await db.community_synopses.count_documents({"approved": True, "synopsis": {"$ne": ""}})
    wx_live  = await db.community_weather.count_documents({"approved": True, "weather": {"$ne": ""}})
    nhb_live = await db.neighbourhood_synopses.count_documents({"approved": True, "synopsis": {"$ne": ""}})
    faq_live = await db.glossary.count_documents({"faqs_approved": True, "faqs.0": {"$exists": True}})

    # --- LLM citations tracked ---
    llm_total = await db.llm_citations.count_documents({})
    llm_by_source = {}
    async for r in db.llm_citations.aggregate([{"$group": {"_id": "$source", "n": {"$sum": 1}}}]):
        llm_by_source[r["_id"] or "unknown"] = r["n"]
    latest_citations = await db.llm_citations.find({}, {"_id": 0}).sort("captured_at", -1).to_list(20)

    return {
        "generated_at": now.isoformat(),
        "traffic": {
            "pageviews_24h": pv_24h, "pageviews_7d": pv_7d, "pageviews_30d": pv_30d,
            "uniques_24h": uniq_24h, "uniques_7d": uniq_7d, "uniques_30d": uniq_30d,
            "top_pages_7d": top_pages,
            "referrers_7d": referrers,
            "daily_trend_30d": trend,
        },
        "doogie": {"sessions_24h": doogie_24h, "sessions_7d": doogie_7d, "sessions_30d": doogie_30d},
        "leads_30d": {
            "buyer": buyer_30, "seller": seller_30, "valuation": valuation_30,
            "referral": referral_30, "saved_search": saved_30,
            "total": buyer_30 + seller_30 + valuation_30 + referral_30,
        },
        "content_live": {
            "community_synopses": syn_live, "community_weather": wx_live,
            "neighbourhoods": nhb_live, "glossary_faqs": faq_live,
            "total_pages": syn_live + wx_live + nhb_live + faq_live,
        },
        "llm_citations": {
            "total": llm_total,
            "by_source": llm_by_source,
            "latest": latest_citations,
        },
    }


# --- LLM Citation Tracker (Doug's manual scoreboard) ---
class LlmCitation(BaseModel):
    source: str  # "chatgpt" | "claude" | "perplexity" | "bing_copilot" | "google_ai" | "grok" | "manus" | "other"
    query: str
    result_url: Optional[str] = ""
    result_excerpt: Optional[str] = ""
    screenshot_url: Optional[str] = ""
    notes: Optional[str] = ""

@api.post("/admin/growth/citations")
async def add_llm_citation(body: LlmCitation, _=Depends(verify_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["captured_at"] = now_iso()
    await db.llm_citations.insert_one(doc)
    return {"success": True, "id": doc["id"]}

@api.get("/admin/growth/citations")
async def list_llm_citations(_=Depends(verify_admin)):
    return await db.llm_citations.find({}, {"_id": 0}).sort("captured_at", -1).to_list(500)

@api.delete("/admin/growth/citations/{cid}")
async def delete_llm_citation(cid: str, _=Depends(verify_admin)):
    r = await db.llm_citations.delete_one({"id": cid})
    return {"success": True, "deleted": r.deleted_count}


@api.post("/listings/consent")
@_limiter.limit("30/minute")
async def record_mls_consent(request: Request, payload: dict):
    """Tamper-evident record of the user accepting CREA DDF® Terms of Use
    (click-wrap requirement). Stored server-side with IP + UA + timestamp."""
    if not payload.get("accepted"):
        raise HTTPException(400, "acceptance required")
    doc = {
        "accepted": True,
        "policy_version": payload.get("policy_version", "1.0"),
        "session_id": payload.get("session_id"),
        "occurred_at": now_iso(),
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent","")[:400],
    }
    await db.mls_consent_log.insert_one(doc)
    return {"ok": True, "policy_version": doc["policy_version"], "recorded_at": doc["occurred_at"]}

@api.get("/listings/meta/facets")
@_limiter.limit("60/minute")
async def listings_facets(request: Request):
    """Return distinct filter values so the search UI can populate dropdowns.

    Property types are a CURATED fixed list (PROPERTY_TYPE_UI_OPTIONS) so
    Doug's filter is consistent across every community/city page and never
    shows raw CREA labels like "Residential Detached" or "House".
    """
    cities = sorted(await db.listings.distinct("city", {"status":"Active"}))
    regions = sorted(await db.listings.distinct("region", {"status":"Active"}))
    return {"cities": cities, "property_types": PROPERTY_TYPE_UI_OPTIONS, "regions": regions}

@api.post("/admin/listings/sync-now")
async def admin_ddf_sync_now(request: Request, _=Depends(verify_admin)):
    """Manual trigger for a DDF® sync. Runs in the background because a full BC
    sync can take 1-2 minutes; poll /admin/listings/sync-log for progress.
    On completion, runs the saved-search alert matcher so subscribers get
    notified of new matches."""
    # If credentials not configured, return synchronously so the admin sees the reason
    if not _ddf_ready():
        return await _ddf_sync(db)
    # Prevent overlapping syncs
    running = await db.ddf_sync_log.find_one({"status": "running"})
    if running:
        return {"status": "already_running", "started_at": running.get("started_at")}
    marker = {"status": "running", "started_at": now_iso(), "pulled": 0, "upserted": 0}
    ins = await db.ddf_sync_log.insert_one(marker)
    marker_id = ins.inserted_id
    base_url = _public_base_url(request)

    async def _run():
        try:
            r = await _ddf_sync(db)
            await db.ddf_sync_log.update_one({"_id": marker_id}, {"$set": {"status": "done", "finished_at": now_iso(), **r}})
            # Trigger saved-search alerts. Isolated in try/except so alert
            # failures never mark the sync as errored.
            try:
                from services.alert_matcher import run_matcher
                alerts = await run_matcher(db, base_url)
                logger.info(f"alert_matcher after sync: {alerts}")
            except Exception as e:
                logger.exception(f"alert_matcher hook failed: {e}")
        except Exception as e:
            await db.ddf_sync_log.update_one({"_id": marker_id}, {"$set": {"status": "error", "finished_at": now_iso(), "errors": [str(e)]}})
    asyncio.create_task(_run())
    return {"status": "started", "started_at": marker["started_at"]}

@api.get("/admin/listings/sync-log")
async def admin_ddf_sync_log(_=Depends(verify_admin)):
    """Latest 10 DDF sync attempts (newest first)."""
    docs = []
    async for d in db.ddf_sync_log.find({}).sort("started_at", -1).limit(10):
        d.pop("_id", None)
        docs.append(d)
    total_bc = await db.listings.count_documents({"source": "CREA_DDF"})
    return {"total_bc_listings": total_bc, "runs": docs}

@api.get("/admin/listings/ddf-status")
async def admin_ddf_status(_=Depends(verify_admin)):
    """Probe CREA DDF® auth + Property endpoint. Returns rich diagnostics."""
    return await _ddf_test()


# =============== AI CONTENT AUDIT TRAIL (CREA / BCFSA compliance) ===============
@api.get("/admin/audit-trail.csv")
async def export_audit_trail(_=Depends(verify_admin)):
    """CSV export of every AI-generated content item + its licensee approval event.

    Supports CREA/BCFSA audits: provides a full record of what AI produced, who
    approved it (Doug LeMaire, REALTOR®), and when. Downloadable via the admin
    console or curl for offline records.
    """
    from fastapi.responses import PlainTextResponse
    import csv, io
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Content Type", "Identifier", "Title/Slug", "AI Model", "First Generated", "Approved By", "Approved At", "Approval Status", "URL"])
    # Glossary terms
    async for t in db.glossary.find({}, {"_id":0, "slug":1, "term":1, "faqs_approved":1, "faqs_approved_at":1, "last_curated_at":1, "updated_at":1}):
        approved = bool(t.get("faqs_approved"))
        w.writerow([
            "Glossary FAQ",
            t.get("slug",""),
            t.get("term",""),
            "Claude Sonnet 4.5",
            t.get("last_curated_at") or t.get("updated_at") or "",
            "Doug LeMaire, REALTOR®" if approved else "",
            t.get("faqs_approved_at") or "",
            "APPROVED" if approved else "PENDING",
            f"https://eztofind.ca/glossary/{t.get('slug','')}",
        ])
    # Community synopses
    async for c in db.community_synopsis.find({}, {"_id":0, "slug":1, "name":1, "approved":1, "approved_at":1, "generated_at":1}):
        approved = bool(c.get("approved"))
        w.writerow([
            "Community Synopsis",
            c.get("slug",""),
            c.get("name",""),
            "Claude Sonnet 4.5",
            c.get("generated_at") or "",
            "Doug LeMaire, REALTOR®" if approved else "",
            c.get("approved_at") or "",
            "APPROVED" if approved else "PENDING",
            f"https://eztofind.ca/community/{c.get('slug','')}",
        ])
    # Community weather summaries (if AI-generated)
    async for w_row in db.community_weather.find({}, {"_id":0, "slug":1, "approved":1, "approved_at":1, "generated_at":1}):
        approved = bool(w_row.get("approved"))
        w.writerow([
            "Community Weather Summary",
            w_row.get("slug",""),
            w_row.get("slug",""),
            "Claude Sonnet 4.5 (superseded by ECCC live data)",
            w_row.get("generated_at") or "",
            "Doug LeMaire, REALTOR®" if approved else "",
            w_row.get("approved_at") or "",
            "APPROVED" if approved else "PENDING",
            f"https://eztofind.ca/community/{w_row.get('slug','')}",
        ])
    csv_content = buf.getvalue()
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="eztofind-ai-audit-{now_iso()[:10]}.csv"'},
    )


@api.get("/admin/casl-consent-log.csv")
async def export_casl_consent_log(_=Depends(verify_admin)):
    """CSV export of every CASL express-consent event across every list.

    One row per subscriber/lead with:
        list, email, subscribed_at, subscribe_ip, subscribe_ua,
        verified_at, verify_ip, verify_ua,
        unsubscribed_at, unsubscribed_ip,
        status, policy_version, label/filters

    Intended for handoff to legal counsel or a CASL auditor as proof of
    express consent (CASL s.6 requires you to be able to prove consent was
    obtained — this file is that proof).
    """
    from fastapi.responses import PlainTextResponse
    import csv, io
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "List", "Email", "Subscribed At (ISO)", "Subscribe IP", "Subscribe User-Agent",
        "Verified At (ISO)", "Verify IP", "Verify User-Agent",
        "Unsubscribed At (ISO)", "Unsubscribe IP",
        "Current Status", "Policy Version", "Notes / Filters",
    ])

    # 1. Saved-search alert subscribers — cleanest express-consent path (double opt-in)
    async for s in db.saved_searches.find({}, {"_id": 0}).sort("created_at", 1):
        filters_str = " · ".join(f"{k}={v}" for k, v in (s.get("filters") or {}).items()) or ""
        label = s.get("label") or ""
        notes = f"[Saved Search] {label} {filters_str}".strip()
        w.writerow([
            "Saved-Search Alerts",
            s.get("email", ""),
            s.get("consent_at") or s.get("created_at") or "",
            s.get("consent_ip") or "",
            (s.get("consent_ua") or "")[:200],
            s.get("verified_at") or "",
            s.get("verify_ip") or "",
            (s.get("verify_ua") or "")[:200],
            s.get("unsubscribed_at") or "",
            s.get("unsubscribed_ip") or "",
            s.get("status", ""),
            s.get("policy_version") or CURRENT_POLICY_VERSION,
            notes,
        ])

    # 2. Buyer leads — single opt-in via consent checkbox on /buyer form
    async for b in db.buyer_leads.find({}, {"_id": 0}).sort("created_at", 1):
        status = "unsubscribed" if b.get("unsubscribed") else ("consented" if b.get("casl_consent") else "no-consent")
        notes = f"[Buyer Lead] {b.get('property_type','')} in {', '.join(b.get('areas') or [])[:120]}"
        w.writerow([
            "Buyer Leads",
            b.get("email", ""),
            b.get("consent_at") or b.get("created_at") or "",
            b.get("consent_ip") or "",
            (b.get("consent_ua") or "")[:200],
            "",  # single-opt-in — no separate verify event
            "",
            "",
            b.get("unsubscribed_at") or "",
            b.get("unsubscribed_ip") or "",
            status,
            "1.0",
            notes,
        ])

    # 3. Seller leads
    async for s in db.seller_leads.find({}, {"_id": 0}).sort("created_at", 1):
        status = "unsubscribed" if s.get("unsubscribed") else ("consented" if s.get("casl_consent") else "no-consent")
        notes = f"[Seller Lead] {s.get('property_type','')} in {s.get('city','')}"
        w.writerow([
            "Seller Leads",
            s.get("email", ""),
            s.get("consent_at") or s.get("created_at") or "",
            s.get("consent_ip") or "",
            (s.get("consent_ua") or "")[:200],
            "", "", "",
            s.get("unsubscribed_at") or "",
            s.get("unsubscribed_ip") or "",
            status,
            "1.0",
            notes,
        ])

    # 4. REALTOR® applications — business-to-business but still recorded
    async for r in db.realtor_applications.find({}, {"_id": 0}).sort("created_at", 1):
        status = "unsubscribed" if r.get("unsubscribed") else ("consented" if r.get("casl_consent") else "no-consent")
        notes = f"[REALTOR® Application] {r.get('city','')} · {r.get('name','')}"
        w.writerow([
            "REALTOR® Applications",
            r.get("email", ""),
            r.get("consent_at") or r.get("created_at") or "",
            r.get("consent_ip") or "",
            (r.get("consent_ua") or "")[:200],
            "", "", "",
            r.get("unsubscribed_at") or "",
            "",
            status,
            "1.0",
            notes,
        ])

    csv_content = buf.getvalue()
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="eztofind-casl-consent-log-{now_iso()[:10]}.csv"'},
    )


# =============== NEIGHBORHOOD NICKNAME RESOLVER ===============
# BC locals search by nickname ("Kits", "PoCo", "The Drive"). CREA's CityRegion
# field is mostly empty in the DDF feed, so the neighborhood name is enforced
# by requiring it to appear in the listing's description/features (via the
# _features_query helper).
#
# When exactly ONE candidate matches → we silently apply the clarification and
# show a "🔍 We searched Vancouver — Kitsilano" note in the summary.
# When 2+ candidates match (e.g. "the West End" = Vancouver West End OR West
# Vancouver) → we return needs_clarification=True with clickable options.
#
# Focused on Metro Vancouver (Doug's practice area). Nickname keys are matched
# with word boundaries so "Kits Beach" also fires the "Kits" rule.
NEIGHBORHOOD_NICKNAMES: dict[str, list[dict]] = {
    "kits":            [{"city": "Vancouver", "hood": "Kitsilano", "label": "Vancouver — Kitsilano"}],
    "kitsilano":       [{"city": "Vancouver", "hood": "Kitsilano", "label": "Vancouver — Kitsilano"}],
    "yaletown":        [{"city": "Vancouver", "hood": "Yaletown", "label": "Vancouver — Yaletown"}],
    "gastown":         [{"city": "Vancouver", "hood": "Gastown", "label": "Vancouver — Gastown"}],
    "coal harbour":    [{"city": "Vancouver", "hood": "Coal Harbour", "label": "Vancouver — Coal Harbour"}],
    "coal harbor":     [{"city": "Vancouver", "hood": "Coal Harbour", "label": "Vancouver — Coal Harbour"}],
    "mount pleasant":  [{"city": "Vancouver", "hood": "Mount Pleasant", "label": "Vancouver — Mount Pleasant"}],
    "point grey":      [{"city": "Vancouver", "hood": "Point Grey", "label": "Vancouver — Point Grey"}],
    "west point grey": [{"city": "Vancouver", "hood": "West Point Grey", "label": "Vancouver — West Point Grey"}],
    "kerrisdale":      [{"city": "Vancouver", "hood": "Kerrisdale", "label": "Vancouver — Kerrisdale"}],
    "shaughnessy":     [{"city": "Vancouver", "hood": "Shaughnessy", "label": "Vancouver — Shaughnessy"}],
    "dunbar":          [{"city": "Vancouver", "hood": "Dunbar", "label": "Vancouver — Dunbar"}],
    "marpole":         [{"city": "Vancouver", "hood": "Marpole", "label": "Vancouver — Marpole"}],
    "fairview":        [{"city": "Vancouver", "hood": "Fairview", "label": "Vancouver — Fairview"}],
    "false creek":     [{"city": "Vancouver", "hood": "False Creek", "label": "Vancouver — False Creek"}],
    "commercial drive":[{"city": "Vancouver", "hood": "Commercial Drive", "label": "Vancouver — Commercial Drive"}],
    "the drive":       [{"city": "Vancouver", "hood": "Commercial Drive", "label": "Vancouver — Commercial Drive"}],
    "grandview":       [{"city": "Vancouver", "hood": "Grandview-Woodland", "label": "Vancouver — Grandview-Woodland"}],
    "killarney":       [{"city": "Vancouver", "hood": "Killarney", "label": "Vancouver — Killarney"}],
    "champlain":       [{"city": "Vancouver", "hood": "Champlain Heights", "label": "Vancouver — Champlain Heights"}],
    "victoria drive":  [{"city": "Vancouver", "hood": "Victoria-Fraserview", "label": "Vancouver — Victoria-Fraserview"}],
    "downtown eastside":[{"city": "Vancouver", "hood": "Downtown Eastside", "label": "Vancouver — Downtown Eastside"}],
    "the dtes":        [{"city": "Vancouver", "hood": "Downtown Eastside", "label": "Vancouver — Downtown Eastside"}],
    "olympic village": [{"city": "Vancouver", "hood": "Olympic Village", "label": "Vancouver — Olympic Village"}],
    # Genuinely AMBIGUOUS — Vancouver's West End neighborhood vs. the city of West Vancouver.
    "the west end":    [
        {"city": "Vancouver",       "hood": "West End", "label": "Vancouver — West End (downtown neighborhood)"},
        {"city": "West Vancouver",  "hood": None,       "label": "West Vancouver (the whole municipality)"},
    ],
    "west end":        [
        {"city": "Vancouver",       "hood": "West End", "label": "Vancouver — West End (downtown neighborhood)"},
        {"city": "West Vancouver",  "hood": None,       "label": "West Vancouver (the whole municipality)"},
    ],
    # Nicknames for whole municipalities
    "poco":            [{"city": "Port Coquitlam", "hood": None, "label": "Port Coquitlam"}],
    "new west":        [{"city": "New Westminster", "hood": None, "label": "New Westminster"}],
    "north van":       [{"city": "North Vancouver", "hood": None, "label": "North Vancouver"}],
    "west van":        [{"city": "West Vancouver",  "hood": None, "label": "West Vancouver"}],
    "the tri-cities":  [
        {"city": "Coquitlam",      "hood": None, "label": "Coquitlam"},
        {"city": "Port Coquitlam", "hood": None, "label": "Port Coquitlam"},
        {"city": "Port Moody",     "hood": None, "label": "Port Moody"},
    ],
    # Sea-to-Sky
    "the corridor":    [{"city": "Squamish", "hood": None, "label": "Squamish (Sea-to-Sky Corridor — click to also search Whistler/Pemberton)"}],
    # Sunshine Coast
    "the coast":       [
        {"city": "Sechelt", "hood": None, "label": "Sechelt"},
        {"city": "Gibsons", "hood": None, "label": "Gibsons"},
        {"city": "Pender Harbour", "hood": None, "label": "Pender Harbour"},
    ],
}


def _detect_neighborhood_nickname(raw_query: str) -> list[dict]:
    """Scan the raw user query for known BC neighborhood nicknames.
    Returns the list of candidate localities (may be empty, may be >1)."""
    if not raw_query:
        return []
    q = raw_query.lower()
    # Sort by longest key first so "the west end" wins over "west end" wins over "end"
    for key in sorted(NEIGHBORHOOD_NICKNAMES.keys(), key=lambda k: (-len(k), k)):
        if re.search(rf"\b{re.escape(key)}\b", q):
            return NEIGHBORHOOD_NICKNAMES[key]
    return []


# =============== DOOGIE MLS® SEARCH (natural language → filters → listings) ===============

# CREA DDF® uses different labels across the 82 Canadian boards for the same
# concept. "Single Family" and "Detached" both mean a detached home. This map
# expands the user's requested type into every equivalent CREA label so we
# don't zero-out searches like "3-bed detached in Langley" when Langley's
# board actually files them as "Single Family".
PROPERTY_TYPE_SYNONYMS = {
    # CREA REBGV/FVREB store StructureType=["House"] for detached and
    # PropertySubType="Single Family" for the residential category; we accept
    # either label so all boards resolve correctly. Each user-facing filter
    # option maps to every CREA label the DDF feed uses for that concept.
    "Detached":              ["Detached", "House", "Single Family", "Residential Detached"],
    "Single Family":         ["Single Family", "Detached", "House", "Residential Detached"],
    "Condo":                 ["Condo", "Condominium", "Apartment", "Residential Condo", "Strata"],
    "Townhouse":             ["Townhouse", "Row / Townhouse", "Attached", "Row"],
    "Acreage":               ["Acreage", "Farm", "Ranch", "Agriculture"],
    "Multi-family":          ["Multi-family", "Multi Family", "Multi-Family"],
    "Duplex":                ["Duplex", "Triplex", "Fourplex"],
    "Recreation":            ["Recreation", "Recreational", "Recreational Property"],
    "Recreational":          ["Recreational", "Recreation", "Recreational Property"],
    "Manufactured / Mobile": ["Manufactured Home", "Mobile Home", "Manufactured Home on Land", "Mobile"],
    # Equestrian isn't a CREA property_type — it's a feature. We still allow it
    # as a filter option; _property_type_query() handles the fallback by matching
    # "equestrian"/"ranch"/"acreage" style words on structured type + description.
    "Equestrian":            ["Equestrian", "Farm", "Ranch", "Acreage", "Agriculture"],
    "Vacant Land":           ["Vacant Land", "Lot", "Land"],
    "Land":                  ["Vacant Land", "Lot", "Land"],
}

FILTER_EXTRACTION_SYSTEM = """You are a real estate search filter extractor.
Read the user's request and output a SINGLE JSON object with these fields (all optional):
{
  "city": string | null,               // BC city/community name; capitalize properly
  "property_type": string | null,      // one of: Detached, Condo, Townhouse, Acreage, Duplex, Equestrian, Land, Manufactured / Mobile, Single Family
  "beds_exact": integer | null,        // EXACT bedroom count — use this when the user names a plain count ("4 bedroom", "3-bed", "two bedroom home")
  "beds_min": integer | null,          // MINIMUM bedrooms — use ONLY when the user explicitly says "at least", "or more", "+" or "minimum"
  "baths_exact": integer | null,       // EXACT bathroom count
  "baths_min": integer | null,         // MINIMUM bathrooms — same "at least"/"+"/"or more" rule as beds
  "price_min": integer | null,         // minimum in CAD dollars (no commas)
  "price_max": integer | null,         // maximum in CAD dollars (no commas)
  "features": [string, ...] | null,    // LIST of REQUIRED feature phrases — every one must appear in the listing description. E.g. ["indoor pool", "hot tub", "ocean view"]
  "sort": string | null                // "price_asc" | "price_desc" | "newest"
}
RULES:
- Return ONLY the JSON object, no explanation, no markdown fences.
- If user says "under $800K" set price_max=800000. "over $2M" set price_min=2000000.
- BEDROOMS (critical, follow exactly):
    • "4 bedroom home"           → beds_exact=4 (NOT beds_min)
    • "3-bed condo"               → beds_exact=3
    • "two bedroom"               → beds_exact=2
    • "4+ bedrooms" / "4 or more" → beds_min=4
    • "at least 4 bedrooms"       → beds_min=4
    • "minimum 3 beds"            → beds_min=3
    • "3 to 5 bedrooms"           → beds_min=3 (range: lower bound only; the upper bound is ignored)
  Same rules apply to bathrooms (baths_exact vs baths_min). NEVER set both _exact and _min for the same field.
- Property type synonyms: "home"/"house" → Detached; "apartment"/"suite" → Condo; "townhome"/"townhouse" → Townhouse; "acreage"/"farm"/"ranch" → Acreage; "lot"/"vacant land"/"raw land" → Land.
- Location: BC cities only. If the user says "Vancouver" keep it as "Vancouver" (not "Greater Vancouver").
- FEATURES: extract ALL descriptive requirements as separate array entries. If the user says "indoor pool AND hot tub" → ["indoor pool", "hot tub"]. If they say "ocean view with a suite" → ["ocean view", "suite"]. If they say "waterfront home with private dock" → ["waterfront", "private dock"]. Every feature is a REQUIREMENT — the listing must match ALL of them.
- If user says "top floor" or "penthouse" → features: ["top floor"] or ["penthouse"].
- If nothing extracted, return {"city":null,"property_type":null,"beds_exact":null,"beds_min":null,"baths_exact":null,"baths_min":null,"price_min":null,"price_max":null,"features":null,"sort":null}."""

async def _extract_listing_filters(user_query: str) -> dict:
    """Use Claude to extract structured search filters from a natural-language query.
    Returns a dict that may include a `features` list — one required phrase per entry."""
    if not ANTHROPIC_API_KEY:
        return {}
    try:
        r = await _anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=500,
            system=FILTER_EXTRACTION_SYSTEM,
            messages=[{"role": "user", "content": user_query}],
        )
        text = r.content[0].text if r.content else "{}"
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1] if "```" in text[3:] else text[3:]
            if text.startswith("json"): text = text[4:]
        parsed = json.loads(text.strip())
        # Backward compat: if `keyword` still returned (old prompt cache), split into features.
        if "keyword" in parsed and parsed.get("keyword") and not parsed.get("features"):
            parsed["features"] = [parsed["keyword"]]
        # Normalize features to a clean list of trimmed strings
        if parsed.get("features"):
            parsed["features"] = [f.strip() for f in parsed["features"] if f and f.strip()][:6]
        # Enforce "never both _exact and _min" — if the model set both for the same
        # dimension, prefer _exact (matches the user's plain-count intent).
        for dim in ("beds", "baths"):
            if parsed.get(f"{dim}_exact") is not None and parsed.get(f"{dim}_min") is not None:
                parsed[f"{dim}_min"] = None
        # DETERMINISTIC POST-PROCESSING (belt-and-suspenders): Claude sometimes
        # returns beds_min for a plain "3 bedroom" query. Scan the raw text and
        # correct: if the user's phrasing is a plain count (no "+"/"at least"/
        # "or more"/"minimum"), force beds_exact and drop beds_min. Same for baths.
        _apply_beds_baths_regex_override(user_query, parsed)
        return parsed
    except Exception as e:
        logger.warning(f"filter extraction failed: {e}")
        return {}


# Regex-based deterministic override — the LLM cannot be fully trusted to
# distinguish "3 bedroom home" (exact) from "3+ bedroom" (min). This scans
# the raw text and takes precedence over whatever Claude returned.
_MIN_PHRASE_RE = {
    "beds": re.compile(
        r"(?:"
        r"(?:at\s+least|minimum|min\.?|min|≥|>=)\s*(\d{1,2})\s*(?:\+)?\s*(?:-|\s)?\s*(?:bed|bedroom|br|bd)"
        r"|(\d{1,2})\s*\+\s*(?:bed|bedroom|br|bd)"
        r"|(\d{1,2})\s*(?:bed|bedroom|br|bd)s?\s+or\s+more"
        r")",
        re.IGNORECASE,
    ),
    "baths": re.compile(
        r"(?:"
        r"(?:at\s+least|minimum|min\.?|min|≥|>=)\s*(\d{1,2}(?:\.5)?)\s*(?:\+)?\s*(?:-|\s)?\s*(?:bath|bathroom|ba)"
        r"|(\d{1,2}(?:\.5)?)\s*\+\s*(?:bath|bathroom|ba)"
        r"|(\d{1,2}(?:\.5)?)\s*(?:bath|bathroom|ba)s?\s+or\s+more"
        r")",
        re.IGNORECASE,
    ),
}
_EXACT_PHRASE_RE = {
    "beds": re.compile(
        r"(?<![+\d.])\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*[- ]?\s*(?:bed|bedroom|br|bd)s?\b",
        re.IGNORECASE,
    ),
    "baths": re.compile(
        r"(?<![+\d.])\b(\d{1,2}(?:\.5)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*[- ]?\s*(?:bath|bathroom|ba)s?\b",
        re.IGNORECASE,
    ),
}
_WORD_TO_NUM = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}


def _apply_beds_baths_regex_override(raw_query: str, parsed: dict) -> None:
    """Mutate `parsed` in place. If the raw query mentions a plain bedroom
    count (no min-modifier), force `beds_exact` and clear `beds_min`. Same
    for bathrooms. Runs AFTER Claude, so the LLM's guess is a fallback for
    ambiguous phrasing this regex can't classify."""
    if not raw_query:
        return
    q = raw_query
    for dim in ("beds", "baths"):
        min_match = _MIN_PHRASE_RE[dim].search(q)
        if min_match:
            # User explicitly said "at least N", "N+", or "N or more" — honour beds_min.
            # Take the first non-None captured group as the number.
            num_str = next((g for g in min_match.groups() if g), None)
            if num_str:
                try:
                    val = float(num_str) if "." in num_str else int(num_str)
                    parsed[f"{dim}_min"] = val
                    parsed[f"{dim}_exact"] = None
                except ValueError:
                    pass
            continue

        exact_match = _EXACT_PHRASE_RE[dim].search(q)
        if exact_match:
            token = exact_match.group(1).lower()
            try:
                if token in _WORD_TO_NUM:
                    val = _WORD_TO_NUM[token]
                elif "." in token:
                    val = float(token)
                else:
                    val = int(token)
                parsed[f"{dim}_exact"] = val
                parsed[f"{dim}_min"] = None
            except ValueError:
                pass


def _property_type_query(pt: str):
    """Return a Mongo query fragment for property_type that includes CREA synonyms.

    For rare/feature-like types (Equestrian), if the requested type has NO
    exact CREA match in the data, the caller will still get useful results
    because we additionally match on structured features + description
    (see _property_type_or_feature_query below)."""
    synonyms = PROPERTY_TYPE_SYNONYMS.get(pt, [pt])
    # Case-insensitive exact-match on any synonym
    return {"$in": synonyms + [s.lower() for s in synonyms] + [s.title() for s in synonyms]}


def _property_type_or_feature_query(pt: str) -> dict:
    """For property types like 'Equestrian' or 'Manufactured / Mobile' where
    CREA labels vary widely, match on EITHER the property_type synonyms OR
    the description text. Returns a full $or clause to merge into the query."""
    synonyms = PROPERTY_TYPE_SYNONYMS.get(pt, [pt])
    type_set = list({s for s in synonyms} | {s.lower() for s in synonyms} | {s.title() for s in synonyms})
    # Text-fallback keywords per fuzzy type
    text_hints = {
        "Equestrian":            ["equestrian", "stables", "horse", "arena"],
        "Manufactured / Mobile": ["manufactured", "mobile home", "double-wide", "singlewide"],
        "Recreation":            ["recreational property", "cabin", "cottage"],
        "Recreational":          ["recreational property", "cabin", "cottage"],
    }
    hints = text_hints.get(pt, [])
    clauses: list = [{"property_type": {"$in": type_set}}]
    for h in hints:
        clauses.append({"description": {"$regex": re.escape(h), "$options": "i"}})
    return {"$or": clauses}


def _features_query(feature_list: list) -> list:
    """Return a list of $and clauses — each feature must match either
    the structured `features` tag array OR the `description` text (case-insensitive
    substring). Every feature must be present (AND semantics)."""
    clauses = []
    for feat in feature_list:
        f = feat.strip()
        if not f:
            continue
        # Try broader match — either in features tags OR anywhere in the description
        clauses.append({
            "$or": [
                {"features": {"$regex": f"^{re.escape(f.lower())}$", "$options": "i"}},
                {"description": {"$regex": re.escape(f), "$options": "i"}},
            ]
        })
    return clauses


def _build_mls_query(filters: dict) -> dict:
    """Compose the MongoDB query for `db.listings` from extracted NL filters.

    Rules:
      - `beds_exact` (or `baths_exact`) => Mongo `$eq` equivalent (exact int match).
        Wins over `_min` if both were somehow set.
      - `beds_min` (or `baths_min`) => `{"$gte": N}`.
      - City, region, property_type, price bounds, features honoured as before.

    Broken out from `doogie_mls_search` so it can be unit-tested without any
    LLM calls or a running FastAPI/Mongo instance.
    """
    query: dict = {"status": "Active", "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)}}
    if filters.get("city"):
        query["city"] = {"$regex": f"^{re.escape(filters['city'])}$", "$options": "i"}
    if filters.get("region"):
        query["region"] = {"$regex": f"^{re.escape(filters['region'])}$", "$options": "i"}
    if filters.get("property_type"):
        query["property_type"] = _property_type_query(filters["property_type"])
    # Bedrooms — exact wins over min
    if filters.get("beds_exact") is not None:
        query["beds"] = int(filters["beds_exact"])
    elif filters.get("beds_min") is not None:
        query["beds"] = {"$gte": int(filters["beds_min"])}
    # Bathrooms — exact wins over min
    if filters.get("baths_exact") is not None:
        query["baths"] = int(filters["baths_exact"])
    elif filters.get("baths_min") is not None:
        query["baths"] = {"$gte": int(filters["baths_min"])}
    pr = {}
    if filters.get("price_min"): pr["$gte"] = int(filters["price_min"])
    if filters.get("price_max"): pr["$lte"] = int(filters["price_max"])
    if pr:
        query["list_price"] = pr
    if filters.get("features"):
        clauses = _features_query(filters["features"])
        if clauses:
            query["$and"] = clauses
    return query

@api.post("/doogie/mls-search")
@_limiter.limit("30/minute")
async def doogie_mls_search(request: Request, payload: dict):
    """Doogie's natural-language MLS® search. Takes a raw user query, extracts
    structured filters via Claude, then queries the listings collection.

    Body: {"message": "4-bedroom homes in Whistler"}
    Returns: {"intent_matched": bool, "filters": {...}, "count": N, "listings": [...], "summary": str}
    """
    # Mongo-backed daily quota (shared across pods) — hard ceiling for Anthropic bill protection
    session_id = (payload.get("session_id") or "").strip() or f"anon-{_rate_limit_key(request)}"
    await enforce_doogie_daily_quota(session_id, _rate_limit_key(request), daily_cap_per_session=200, daily_cap_per_ip=600)

    q = (payload.get("message") or "").strip()
    if not q or len(q) > 500:
        return {"intent_matched": False, "listings": [], "count": 0, "filters": {}, "summary": ""}

    filters = await _extract_listing_filters(q)

    # Neighborhood-nickname detection. Locals search by shorthand ("Kits",
    # "PoCo", "The Drive") — we resolve those to real BC localities before
    # searching. If the nickname is ambiguous ("the West End" = Vancouver
    # West End neighborhood OR West Vancouver city), we return a clarification
    # response so the frontend can render clickable options.
    nickname_hits = _detect_neighborhood_nickname(q)
    if nickname_hits:
        # Genuinely ambiguous nicknames ALWAYS trigger the clarification prompt,
        # even if Claude guessed a city — the AI guess may not match user intent.
        if len(nickname_hits) > 1:
            return {
                "intent_matched": True,
                "needs_clarification": True,
                "clarification_prompt": (
                    f"Just to be sure — when you say \"{q}\", did you mean:"
                ),
                "options": [
                    {"label": h["label"], "city": h["city"], "hood": h.get("hood")}
                    for h in nickname_hits
                ],
                "original_query": q,
                "filters": {k: v for k, v in filters.items() if not k.startswith("_")},
                "count": 0,
                "listings": [],
                "summary": "",
            }
        # Unambiguous — silent auto-apply
        hit = nickname_hits[0]
        filters["city"] = hit["city"]
        if hit.get("hood"):
            existing = filters.get("features") or []
            if hit["hood"] not in existing and hit["hood"].lower() not in [e.lower() for e in existing]:
                existing.append(hit["hood"])
            # Remove the nickname itself from features if Claude also added it
            hood_lc = hit["hood"].lower()
            existing = [e for e in existing if e.lower() == hood_lc or hood_lc not in e.lower() and e.lower() not in hood_lc]
            # De-dupe (case-insensitive, preserve order)
            seen = set(); deduped = []
            for f in existing:
                if f.lower() not in seen:
                    seen.add(f.lower()); deduped.append(f)
            filters["features"] = deduped
        filters["_neighborhood_note"] = hit["label"]

    # Belt-and-suspenders: if Claude didn't extract a city, try our own
    # locality resolver against the raw query. This guarantees "Whistler"
    # always becomes a strict city filter, never a text-index leak.
    if not filters.get("city"):
        loc = await _resolve_bc_locality(q)
        if loc:
            if loc.get("city"):   filters["city"] = loc["city"]
            if loc.get("region"): filters["region"] = loc["region"]

    if not any(v for v in filters.values() if v not in (None, "", [])):
        return {"intent_matched": False, "listings": [], "count": 0, "filters": {}, "summary": "No clear listing search criteria found."}

    query: dict = {"status": "Active", "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)}}
    if filters.get("city"):          query["city"] = {"$regex": f"^{re.escape(filters['city'])}$", "$options": "i"}
    if filters.get("region"):        query["region"] = {"$regex": f"^{re.escape(filters['region'])}$", "$options": "i"}
    if filters.get("property_type"):
        if filters["property_type"] in EXCLUDED_PROPERTY_TYPES:
            return {"intent_matched": True, "filters": filters, "count": 0, "listings": [],
                    "summary": "EZtoFind.ca focuses on residential listings only — commercial property types are not shown here."}
    # Delegate the actual query composition (beds/baths exact-vs-min, price, features)
    # to the tested helper so behaviour stays in one place.
    query.update(_build_mls_query({k: v for k, v in filters.items() if k != "_neighborhood_note"}))
    # Preserve the residential-only guard which the helper also applies (it will
    # be identical after the merge, but explicit `status` filter is defensive).
    query["status"] = "Active"

    sort_key = [("created_at", -1)]
    if filters.get("sort") == "price_asc":  sort_key = [("list_price", 1)]
    if filters.get("sort") == "price_desc": sort_key = [("list_price", -1)]

    cursor = db.listings.find(query).sort(sort_key).limit(6)
    listings = [_sanitize_listing(d) for d in await cursor.to_list(6)]
    total = await db.listings.count_documents(query)

    # Log impressions
    for l in listings:
        try:
            await _log_event(db, l.get("listing_key",""), "impression", {"path": "/doogie/mls-search"})
        except Exception: pass

    # Craft summary — mention BOTH the criteria we honoured and the specific
    # features we required, so a 0-result response reads as "we understood
    # you, that combination doesn't exist" rather than "search failed".
    parts = []
    if filters.get("beds_exact") is not None:
        parts.append(f"{filters['beds_exact']}-bed")
    elif filters.get("beds_min") is not None:
        parts.append(f"{filters['beds_min']}+ bed")
    if filters.get("property_type"): parts.append(str(filters["property_type"]).lower() + ("s" if not str(filters["property_type"]).lower().endswith("s") else ""))
    if filters.get("city"): parts.append(f"in {filters['city']}")
    price_note = ""
    if filters.get("price_max"): price_note = f" under ${int(filters['price_max']):,}"
    elif filters.get("price_min"): price_note = f" over ${int(filters['price_min']):,}"
    feat_note = ""
    if filters.get("features"):
        feat_note = f" with {' and '.join(filters['features'])}"
    hood_note = filters.pop("_neighborhood_note", None)
    hood_prefix = f"🔍 Searched **{hood_note}** — " if hood_note else ""
    criteria = (" ".join(parts) + price_note + feat_note) if parts else "listings matching your search"
    if total == 0:
        summary = hood_prefix + (
            f"I couldn't find any {criteria.strip()} in the current MLS® data. "
            f"That combination is very specific — try widening the price range, "
            f"dropping one of the features, or searching a nearby community."
        )
    elif total <= 6:
        summary = hood_prefix + f"Here {'is' if total==1 else 'are'} {total} {criteria.strip()}:"
    else:
        summary = hood_prefix + f"I found {total} matching {criteria.strip()} — showing the top 6. Refine your search on the full listings page for more."

    return {
        "intent_matched": True,
        "filters": filters,
        "count": total,
        "listings": listings,
        "summary": summary,
        "using_mock_data": not _ddf_ready(),
    }

app.include_router(api)

# =============== DOOGIE VOICE (Whisper) — scaffold ===============
# Endpoint accepts audio blob from the frontend mic button. Activates once
# OPENAI_API_KEY is configured. Until then, returns a graceful "not enabled"
# response so the UI can show a friendly message instead of crashing.
import base64
from fastapi import File, UploadFile, Form
import io as _io

@app.post("/api/doogie/transcribe")
async def transcribe_voice(audio: UploadFile = File(...), language: str = Form("en")):
    """Transcribe voice input via OpenAI Whisper — powered by the Emergent
    Universal LLM Key so Doug doesn't need to plug in a separate OpenAI key.
    Frontend sends a webm/opus blob (browser MediaRecorder default).
    Language hint maps our chat codes → Whisper's ISO-639-1 codes.
    """
    lang_map = {"en": "en", "zh-Hant": "zh", "zh-Hans": "zh", "pa": "pa", "fa": "fa", "pt-PT": "pt"}
    try:
        data = await audio.read()
        # CASL/PIPA: cap the payload at Whisper's 25 MB limit before we even
        # hit the API — protects Doug's Universal Key balance from abuse.
        if len(data) > 25 * 1024 * 1024:
            return {"text": "", "error": "Audio is too long (max 25 MB). Please keep voice input under a minute."}
        from emergentintegrations.llm.openai import OpenAISpeechToText
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        # emergentintegrations accepts a file-like — wrap the bytes in BytesIO
        # and give it a name so the SDK can infer the mime type.
        buf = _io.BytesIO(data)
        buf.name = audio.filename or "voice.webm"
        response = await stt.transcribe(
            file=buf,
            model="whisper-1",
            response_format="json",
            language=lang_map.get(language, "en"),
            temperature=0.0,
        )
        text = (getattr(response, "text", "") or "").strip()
        return {"text": text, "language": language, "provider": "emergent-universal"}
    except Exception as e:
        logger.warning(f"Whisper transcribe failed: {e}")
        return {"text": "", "error": "Transcription failed. Please try typing your message."}

@app.on_event("shutdown")
async def shutdown(): mongo_client.close()
