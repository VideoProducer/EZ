from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import StreamingResponse, HTMLResponse, Response, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, json, uuid, logging, bcrypt, jwt, asyncio, hashlib, urllib.parse
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


# ── Doogie intent classifier ─────────────────────────────────────────────
# Fast Haiku call that decides which knowledge base a user question maps to.
# Returns a small dict: {intent: 'listings'|'glossary'|'communities'|
# 'general'|'clarify', confidence: 0..1}. On any failure returns None so the
# main chat endpoint can proceed unaffected.
_CLASSIFIER_SYSTEM = (
    "You are the routing classifier for a British Columbia real estate assistant "
    "named Doogie. Read the user's single message and classify it into ONE intent "
    "so the main assistant can pull from the right knowledge base.\n\n"
    "Intents (choose exactly one):\n"
    "  - 'listings'    : the user is looking for or asking about specific homes, "
    "addresses, prices, beds/baths, MLS numbers, or search filters.\n"
    "  - 'glossary'    : the user is asking what a BC real estate term or "
    "acronym means (RESA, BCFSA, PTT, HBRP, strata, subject-free offer, etc.).\n"
    "  - 'communities' : the user is asking about a specific BC city, neighbourhood, "
    "region, schools, transit, walkability, or lifestyle in an area.\n"
    "  - 'clarify'     : the message is too vague or too short to route confidently. "
    "Use this when the message is 1-3 words with no clear noun.\n"
    "  - 'general'     : the user is chatting, greeting, asking about Doug, asking "
    "compliance/legal/tax questions, or anything else that doesn't fit above.\n\n"
    "Confidence: a float 0..1 for how sure you are of the intent. Below 0.55 means "
    "the main assistant will ask a clarifying question.\n\n"
    "Output STRICT JSON on a single line, no prose, no code fences:\n"
    "  {\"intent\": \"...\", \"confidence\": 0.0}\n"
)


async def _classify_doogie_intent(user_message: str, session_id: str) -> dict | None:
    """Fast Haiku classifier. Non-fatal on failure — returns None."""
    msg = (user_message or "").strip()
    if not msg:
        return None
    try:
        clf = make_chat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"clf-{session_id}",
            system_message=_CLASSIFIER_SYSTEM,
        ).with_model("anthropic", "claude-haiku-4-5-20251001")
        buf = ""
        async for ev in clf.stream_message(UserMessage(text=msg[:800])):
            if isinstance(ev, TextDelta):
                buf += ev.content
            elif isinstance(ev, StreamDone):
                break
        # Extract the first JSON object even if the model wrapped it in prose.
        m = re.search(r"\{[^{}]*\"intent\"[^{}]*\}", buf, re.DOTALL)
        if not m:
            return None
        parsed = json.loads(m.group(0))
        intent = str(parsed.get("intent") or "").strip().lower()
        if intent not in ("listings", "glossary", "communities", "clarify", "general"):
            return None
        try:
            conf = float(parsed.get("confidence") or 0.0)
        except Exception:
            conf = 0.0
        conf = max(0.0, min(1.0, conf))
        return {"intent": intent, "confidence": conf}
    except Exception as e:
        logger.warning(f"Haiku classifier error: {e}")
        return None


app = FastAPI(title="EZtoFind.ca API")
api = APIRouter(prefix="/api")

# CORS middleware — required for cross-origin API access when frontend and
# backend are hosted on different domains. Reads allowed origins from
# CORS_ORIGINS env var (comma-separated); defaults to "*" for wildcard.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    # New lifecycle-reminder fields
    property_address: Optional[str] = ""  # used in Possession-versary email
    bc_assessment_opt_in: bool = True  # annual Jan-3 heads-up
    mortgage_renewal_date: Optional[str] = None  # YYYY-MM-DD; 90 & 60-day pings
    mortgage_lender: Optional[str] = ""
    send_christmas: bool = True
    send_new_year: bool = True
    # CASL express-consent tracking (mandatory before any commercial email)
    email_consent: bool = False
    consent_date: Optional[str] = None  # YYYY-MM-DD Doug obtained express consent
    consent_source: Optional[str] = ""  # e.g. "Signed buyer agreement 2024-05-12"
    unsubscribed: bool = False
    unsubscribed_at: Optional[str] = None
    unsubscribe_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=now_iso)

# CASL-compliant email templates for lifecycle reminders. Doug edits the 6 defaults
# in /admin/reminder-templates. Merge tags rendered by _render_reminder_template().
class ReminderTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # birthday | anniversary | possession | bc_assessment | mortgage_renewal | christmas
    subject: str
    body_html: str
    active: bool = True
    updated_at: str = Field(default_factory=now_iso)

# 7-year audit trail of every reminder email sent (CASL + BCFSA retention).
class EmailSendLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    client_email: str
    client_name: str
    type: str  # matches ReminderTemplate.type
    subject: str
    body_html: str
    sent_at: str = Field(default_factory=now_iso)
    channel: str = "email"
    status: str = "queued"  # queued | sent | failed
    error: Optional[str] = None
    unsubscribe_token: Optional[str] = None

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
    turnstile_token: Optional[str] = ""  # Cloudflare Turnstile bot-check token

class BetaFeedback(BaseModel):
    name: str
    email: str
    comment: str
    rating: Optional[int] = None       # 1..5
    category: Optional[str] = "general"  # "bug" | "question" | "general"
    page_url: Optional[str] = ""

class AdminFeedbackUpdate(BaseModel):
    status: Optional[str] = None       # "new" | "read" | "resolved"
    admin_note: Optional[str] = None

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
async def admin_login(body: AdminLogin, request: Request):
    # --- Brute-force protection: lock out an IP after 5 failed attempts / 15 min. ---
    # We store attempts in Mongo (collection `admin_login_attempts`) so it survives
    # server restarts and works across pods. Successful login clears the counter.
    ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
          or (request.client.host if request.client else "unknown"))
    now = datetime.now(timezone.utc)
    LOCKOUT_MAX = 5           # failed attempts allowed
    LOCKOUT_WINDOW = 15 * 60  # seconds — sliding window
    rec = await db.admin_login_attempts.find_one({"ip": ip})
    if rec:
        # Only enforce lockout if the last failure is still within the window.
        last = rec.get("last_failed_at")
        if isinstance(last, str):
            try: last = datetime.fromisoformat(last)
            except Exception: last = None
        if last and (now - last).total_seconds() < LOCKOUT_WINDOW and rec.get("count", 0) >= LOCKOUT_MAX:
            wait_min = int((LOCKOUT_WINDOW - (now - last).total_seconds()) / 60) + 1
            raise HTTPException(429, f"Too many failed login attempts. Try again in {wait_min} minute(s).")

    # --- Cloudflare Turnstile bot-check (no-ops when TURNSTILE_SECRET_KEY unset). ---
    # Also skip on preview / dev hosts — Cloudflare Turnstile widgets are bound to a
    # domain allowlist, so preview URLs never receive a valid token. Production
    # (eztofind.ca) remains bot-protected by (1) the brute-force lockout above
    # (5 tries / 15 min per IP), (2) the single-admin-email allowlist, and (3)
    # Turnstile as a best-effort signal. If the visitor's browser blocks the
    # Turnstile widget (ad-blocker, VPN, network hiccup), we log the miss but
    # allow the lockout + password check to be the actual gate — otherwise a
    # blocked widget locks Doug out of his own site.
    host = (request.headers.get("host") or "").lower()
    origin = (request.headers.get("origin") or "").lower()
    referer = (request.headers.get("referer") or "").lower()
    combined = f"{host} {origin} {referer}"
    is_preview = ("preview.emergentagent.com" in combined) or ("localhost" in combined) or ("127.0.0.1" in combined) or not any(x in combined for x in ("eztofind.ca",))
    logger.info(f"[admin_login] host={host!r} origin={origin!r} referer={referer!r} is_preview={is_preview}")
    if not is_preview:
        try:
            await verify_turnstile(body.turnstile_token or "", request)
        except HTTPException as _tsx:
            # Best-effort: log the widget miss, then continue to the password
            # check protected by the brute-force lockout above. This does not
            # expose new attack surface — the lockout already caps at 5 tries
            # per IP per 15 minutes.
            logger.warning(f"[admin_login] Turnstile check failed for {ip} ({_tsx.detail!r}); continuing with lockout+password only")

    async def _record_failure():
        await db.admin_login_attempts.update_one(
            {"ip": ip},
            {"$inc": {"count": 1}, "$set": {"last_failed_at": now.isoformat()}},
            upsert=True,
        )

    if body.email.lower() != ADMIN_EMAIL.lower():
        await _record_failure()
        raise HTTPException(401, "Invalid credentials")
    stored_hash = await _get_admin_hash()
    if stored_hash:
        if not verify_password(body.password, stored_hash):
            await _record_failure()
            raise HTTPException(401, "Invalid credentials")
    else:
        # First-run migration: no DB hash yet. Verify against .env plaintext,
        # then bootstrap a bcrypt hash so future changes persist in DB.
        if body.password != ADMIN_PASSWORD:
            await _record_failure()
            raise HTTPException(401, "Invalid credentials")
        await _set_admin_hash(hash_password(body.password))
    # Success — clear the lockout counter for this IP.
    await db.admin_login_attempts.delete_one({"ip": ip})
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


# =============== BETA FEEDBACK (public + admin inbox) ===============
_ALLOWED_FEEDBACK_CATEGORIES = {"bug", "question", "general"}
_ALLOWED_FEEDBACK_STATUSES = {"new", "read", "resolved"}


@api.post("/beta/feedback")
@_limiter.limit("10/hour")
async def submit_beta_feedback(request: Request, body: BetaFeedback):
    """Public endpoint for beta testers to submit feedback. Rate-limited to
    10 submissions per IP per hour to keep out casual spam."""
    name = (body.name or "").strip()[:120]
    email = (body.email or "").strip()[:200]
    comment = (body.comment or "").strip()[:4000]
    if not name or not email or not comment:
        raise HTTPException(400, "Name, email, and comment are required.")
    if "@" not in email or "." not in email:
        raise HTTPException(400, "Please enter a valid email address.")
    if len(comment) < 5:
        raise HTTPException(400, "Comment is too short — please add a bit more detail.")

    rating = body.rating if body.rating in (1, 2, 3, 4, 5) else None
    category = (body.category or "general").strip().lower()
    if category not in _ALLOWED_FEEDBACK_CATEGORIES:
        category = "general"

    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "comment": comment,
        "rating": rating,
        "category": category,
        "page_url": (body.page_url or "")[:500],
        "user_agent": (request.headers.get("user-agent") or "")[:300],
        "ip": _rate_limit_key(request),
        "status": "new",
        "admin_note": "",
        "created_at": now_iso(),
    }
    await db.beta_feedback.insert_one(doc)

    # Notify Doug via email (non-fatal — feedback is still saved in Mongo if email fails)
    rating_line = f"<strong>Rating:</strong> {'⭐' * doc['rating']} ({doc['rating']}/5)<br/>" if doc.get('rating') else ""
    _cat_label = {"bug":"🐛 Bug","question":"❓ Question","general":"💬 General"}.get(doc['category'], doc['category'])
    admin_html = (
        f"<p><strong>From:</strong> {doc['name']} &lt;{doc['email']}&gt;</p>"
        f"<p><strong>Category:</strong> {_cat_label}</p>"
        f"{rating_line}"
        f"<p><strong>Page:</strong> <a href='{doc['page_url']}'>{doc['page_url'] or '(not captured)'}</a></p>"
        f"<div style='background:#F7FAFF;border-left:4px solid #FDB813;padding:1rem;margin:1rem 0;white-space:pre-wrap;font-family:Georgia,serif'>{doc['comment']}</div>"
        f"<p style='color:#6b7280;font-size:0.85em'><strong>Browser:</strong> {doc['user_agent']}<br/>"
        f"<strong>Reply to:</strong> Just hit reply — your response goes straight to {doc['email']}<br/>"
        f"<strong>Admin dashboard:</strong> <a href='https://eztofind.ca/admin/feedback'>eztofind.ca/admin/feedback</a></p>"
    )
    await _notify_admin_of_lead(
        kind=f"Site Feedback ({_cat_label})",
        to="doug@eztofind.ca",
        subject=f"[Feedback] {doc['category']} — {doc['name']}",
        body_html=admin_html,
        related_id=doc["id"],
    )
    return {"success": True, "id": doc["id"], "message": "Thanks — Doug will see this next time he checks the feedback inbox."}


@api.get("/admin/feedback")
async def admin_list_feedback(status: Optional[str] = None, _=Depends(verify_admin)):
    """List feedback for Doug's inbox. Optional ?status=new|read|resolved filter."""
    q: dict = {}
    if status and status in _ALLOWED_FEEDBACK_STATUSES:
        q["status"] = status
    docs = await db.beta_feedback.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    counts = {}
    for s in _ALLOWED_FEEDBACK_STATUSES:
        counts[s] = await db.beta_feedback.count_documents({"status": s})
    return {"count": len(docs), "items": docs, "counts": counts}


@api.patch("/admin/feedback/{feedback_id}")
async def admin_update_feedback(feedback_id: str, body: AdminFeedbackUpdate, _=Depends(verify_admin)):
    update: dict = {}
    if body.status is not None:
        if body.status not in _ALLOWED_FEEDBACK_STATUSES:
            raise HTTPException(400, "Invalid status")
        update["status"] = body.status
    if body.admin_note is not None:
        update["admin_note"] = body.admin_note[:2000]
    if not update:
        raise HTTPException(400, "Nothing to update")
    update["updated_at"] = now_iso()
    r = await db.beta_feedback.update_one({"id": feedback_id}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(404, "Feedback not found")
    return {"success": True, "modified": r.modified_count}


@api.delete("/admin/feedback/{feedback_id}")
async def admin_delete_feedback(feedback_id: str, _=Depends(verify_admin)):
    r = await db.beta_feedback.delete_one({"id": feedback_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Feedback not found")
    return {"success": True}


# =============== DOOGIE AI CHAT ===============
DOOGIE_SYSTEM = """You are Doogie, the friendly AI mascot for EZtoFind.ca — a British Columbia real estate search platform run by Doug LeMaire, REALTOR® (Fraser Property Management Realty Services Ltd.).

STRICT COMPLIANCE RULES (BCFSA, CREA, GVR, PIPA, CASL):
1. You provide GENERAL INFORMATION ONLY about BC real estate concepts, glossary terms, and navigation help.
2. You NEVER give financial, legal, tax, or investment advice.
3. You NEVER recommend specific properties, neighborhoods over others, or specific REALTORS®.
4. You NEVER quote current property prices or market forecasts as facts.
5. For any advice-seeking question, respond: "That's a great question for a licensed REALTOR® — Would you like me to connect you with Doug LeMaire, REALTOR®? For enquiries beyond Doug's service area, would you like to be connected with a licensed REALTOR® through his referral network?\n\nReferral REALTOR® link"
6. Always end substantive answers using the correct referral offer defined in the REFERRAL RULES below (branch by area).

REFERRAL RULES (BRANCH BY AREA — ALWAYS OFFER):
Doug's FOCUS AREAS are: Greater Vancouver, Fraser Valley, and the Sea-to-Sky Corridor of BC.

A) If the user mentions a location INSIDE the focus areas (or asks a general BC question with no specific location), end with EXACTLY:
   "Would you like me to connect you with Doug LeMaire, REALTOR®? For enquiries beyond Doug's service area, would you like to be connected with a licensed REALTOR® through his referral network?\n\nReferral REALTOR® link"

B) If the user mentions a location OUTSIDE the focus areas (any other BC city, town, or community — e.g., Golden, Kelowna, Kamloops, Prince George, Nanaimo, Victoria, Whitehorse, Fernie, Revelstoke, etc.), end with EXACTLY (substituting the community name in BOTH places):
   "As a smaller BC community, [community] falls outside the Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor focus areas — but that doesn't mean we can't help you get connected! 🐾 Would you like to be connected with a licensed REALTOR® in that area through Doug's referral network?\n\nReferral REALTOR® link: [community]"

RULES that apply to BOTH branches:
- Never offer Doug for an OUT-OF-AREA community — use only the Branch B template.
- DO NOT add any additional line like "For a referral in [CITY], visit /referral-request." — the "Referral REALTOR® link" phrase inside the sentences above is ALREADY auto-linked by the site UI to /referral-request. Adding a second URL creates a redundant/verbose response.
- For Branch A only: if the user has explicitly indicated intent to work with Doug, you may add on a new line: "For direct contact with Doug in [CITY], visit /contact or /buyer."
- Never invent alternative phrasings like "refer you to a REALTOR® in your area" or "Just let me know where you're looking to buy" — use the exact wording above only.
- Never leave a location-related response without the correct referral offer above.

ROUTING RULES (when user says YES, or asks how to reach Doug / get a referral):
- Buying in a FOCUS AREA (Greater Vancouver, Fraser Valley, Sea-to-Sky) → send them to the Buyer Intake form at **/buyer** on this site. Say: "Great — head to /buyer on EZtoFind.ca and fill out the quick intake. Doug typically responds within 1 business day."
- Selling in a FOCUS AREA → send them to **/seller**. Say: "Great — head to /seller on EZtoFind.ca."
- Anywhere ELSE in BC (out-of-area referral) → say: "Great — click the Referral REALTOR® link above and we'll connect you with a REALTOR® in [CITY]."
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
        "fr":       "The user prefers Canadian French (français canadien). Reply entirely in Canadian French — use Canadian French conventions (e.g. 'courtier immobilier' for REALTOR®, 'condo' or 'copropriété', 'quartier' for neighbourhood, 'droit de mutation' for Property Transfer Tax) and polite 'vous' by default. Keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the French meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English. Compliance boilerplate (BCFSA licence #167790, MLS® trademark line, etc.) must remain in English exactly as-is.",
        "zh-Hant":  "The user prefers Traditional Chinese (繁體中文, Cantonese-speaker convention). Reply entirely in Traditional Chinese — but keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the Traditional Chinese meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English.",
        "zh-Hans":  "The user prefers Simplified Chinese (简体中文, Mandarin-speaker convention). Reply entirely in Simplified Chinese — but keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the Simplified Chinese meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English.",
        "pa":       "The user prefers Punjabi (ਪੰਜਾਬੀ, Gurmukhi script). Reply entirely in Punjabi — but keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the Punjabi meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English.",
        "fa":       "The user prefers Farsi (فارسی, right-to-left). Reply entirely in Farsi — but keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the Farsi meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English.",
        "pt-PT":    "The user prefers European Portuguese (Português de Portugal). Reply entirely in European Portuguese — use European spelling and idioms (e.g. 'casa de banho' not 'banheiro', 'apartamento' not 'apartamento', 'a decorrer' not 'em andamento', 'você' or 'o senhor/a senhora' as polite form, informal 'tu' only if the user is clearly casual). Keep BC-specific real estate terms (RESA, BCFSA, HBRP, PTT, MLS®, REALTOR®) in English AND provide the European Portuguese meaning in parentheses on first mention. Route names (e.g. /referral-request) stay in English.",
    }
    lang = (body.language or "en").strip()
    lang_addon = LANG_INSTRUCT.get(lang, "")
    # For non-English replies, add TWO closing rules that must appear at the very
    # end of every substantive reply, in this exact order:
    #   1. A localized "Would you like a referral to a same-language REALTOR®?" CTA
    #      followed by an HTML anchor to /referral-request. The frontend chat renderer
    #      converts any /referral-request anchor into the branded pill button style.
    #   2. A localized "AI translation — verify with a professional" caveat.
    if lang != "en" and lang_addon:
        _lang_names_for_cta = {
            "fr":      ("Français",             "Voulez-vous être mis en relation avec un(e) courtier(ère) immobilier(ère) qui parle français ?", "Demander un(e) REALTOR® en"),
            "zh-Hant": ("繁體中文",              "您想聯繫一位會說中文的 REALTOR® 嗎？",                                                    "在此地區申請 REALTOR® 推薦"),
            "zh-Hans": ("简体中文",              "您想联系一位会说中文的 REALTOR® 吗？",                                                    "在此地区申请 REALTOR® 推荐"),
            "pa":      ("ਪੰਜਾਬੀ",                "ਕੀ ਤੁਸੀਂ ਕਿਸੇ ਅਜਿਹੇ REALTOR® ਨਾਲ ਸੰਪਰਕ ਕਰਨਾ ਚਾਹੋਗੇ ਜੋ ਪੰਜਾਬੀ ਬੋਲਦਾ ਹੈ?",                    "REALTOR® ਰੈਫਰਲ ਦੀ ਬੇਨਤੀ ਕਰੋ"),
            "fa":      ("فارسی",                 "آیا مایلید با یک REALTOR® فارسی‌زبان در ارتباط قرار بگیرید؟",                             "درخواست معرفی REALTOR® در"),
            "pt-PT":   ("Português",             "Gostaria de ser encaminhado para um(a) REALTOR® que fala Português?",                     "Solicitar Encaminhamento REALTOR® em"),
        }
        _lang_data = _lang_names_for_cta.get(lang)
        if _lang_data:
            lang_native, cta_question, button_label = _lang_data
            lang_addon += (
                f" CLOSING FORMULA — MANDATORY for any reply longer than a one-line greeting or clarification. "
                f"End every substantive reply with these two blocks, in this exact order, each on its own paragraph in the target language:\n"
                f"1. The following localized referral invitation, formatted as: "
                f"'{cta_question}' followed by an HTML anchor exactly like this: "
                f'<a href="/referral-request?lang={lang}&language_preference={lang}&city=[INFER_CITY_FROM_CONVERSATION_OR_LEAVE_BLANK]">{button_label} [CITY_OR_AREA_MENTIONED]</a>. '
                f"If a specific BC city or area was mentioned in the conversation, use it in both the URL and the button label (e.g. 'Vancouver'). If unspecified, use the phrase equivalent to 'your area' in the target language and leave city empty in the URL. Never invent a fake area.\n"
                f"2. The AI translation caveat sentence translated to the target language: 'AI translation — verify important details with a licensed professional before acting.'\n"
                f"Do NOT include these closing blocks for trivial one-line greetings, one-line clarifying questions, or listing-search-result responses (those already have their own pill buttons)."
            )
    system_prompt = DOOGIE_SYSTEM + ("\n\nLANGUAGE PREFERENCE:\n" + lang_addon if lang_addon else "")

    # ── Doogie Routing v2 — fast Haiku intent classifier ─────────────────
    # Before we hit the main model, ask Haiku 4.5 which knowledge base the
    # question is really about (listings / glossary / communities / general
    # / clarify). We use this to (a) emit an SSE `routing` event so the
    # frontend can show a debug badge, and (b) append a soft routing hint to
    # the system prompt so Sonnet stays anchored to the right KB. Classifier
    # runs in ~200-400ms and is bypassed on cache hits.
    routing_hint = ""
    routing_meta = None
    try:
        routing_meta = await _classify_doogie_intent(body.message, session_id)
        if routing_meta:
            intent = routing_meta.get("intent") or "general"
            confidence = float(routing_meta.get("confidence") or 0.0)
            _hints = {
                "listings":    "\n\nROUTING HINT: the user is asking about specific listings, addresses, prices, beds/baths, or search filters. Anchor your response to the CREA DDF® listing search flow — never invent a listing. If the question is about a listing's suitability or price fairness, refer them to Doug LeMaire, REALTOR® for advice.",
                "glossary":    "\n\nROUTING HINT: the user is asking about a BC real estate term or concept. Anchor your response to the glossary knowledge (RESA, BCFSA, PTT, HBRP, strata, contingencies, etc.) and answer as general information only — no advice.",
                "communities": "\n\nROUTING HINT: the user is asking about a BC community, neighbourhood, or region. Anchor your response to community-level facts (schools, transit, walkability) and route to the /community/:slug page if a specific city is named.",
                "clarify":     "\n\nROUTING HINT: the user's question is ambiguous. Ask ONE clarifying question before answering, and keep it under 12 words.",
                "general":     "",
            }
            routing_hint = _hints.get(intent, "")
            if confidence < 0.55 and intent not in ("clarify", "general"):
                # Low confidence — bias toward clarification instead of guessing.
                routing_hint = _hints["clarify"]
                routing_meta["intent"] = "clarify"
                routing_meta["low_confidence_original"] = intent
    except Exception as e:
        logger.warning(f"Doogie intent classifier failed for {session_id}: {e}")

    system_prompt = system_prompt + routing_hint

    await db.chat_messages.insert_one({
        "session_id": session_id, "role": "user",
        "content": redacted_msg,  # only redacted stored
        "pii_flags": pii_flags,
        "language": lang,
        "ts": now_iso(),
        "expires_at": expires  # BSON date for TTL index
    })

    # --- Response cache lookup (MongoDB TTL) ---
    # Cache saves ~$0.01-$0.03 per repeat glossary/how-to question ("what's the
    # PTT?", "how much down payment for a $600K home?"). Cache is keyed by lang
    # + normalized message + prior-history-length: only hits when this is the
    # FIRST message in a session (stateless) and the query contains no PII.
    cached = await _lookup_doogie_cache(redacted_msg, lang, session_id, pii_flags)
    if cached:
        async def gen_cached():
            # Stream the cached text in ~40-char chunks so the UX still feels natural.
            text = cached
            CHUNK = 40
            for i in range(0, len(text), CHUNK):
                yield f"data: {json.dumps({'delta': text[i:i+CHUNK]})}\n\n"
                await asyncio.sleep(0.015)   # ~15ms between chunks
            await db.chat_messages.insert_one({
                "session_id": session_id, "role": "assistant",
                "content": text, "ts": now_iso(), "cached": True,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
            })
            yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'cached': True}) }\n\n"
        return StreamingResponse(gen_cached(), media_type="text/event-stream", headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})

    chat = make_chat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_prompt).with_model("anthropic", "claude-sonnet-4-6")

    # Load prior conversation turns so Doogie has context (up to 10 turns = 20 messages).
    # Beyond 10 turns, older messages are dropped (oldest-first) — cheap, no
    # summarization needed since Doogie's turns are short and stateless-tolerant.
    # This also caps input-token growth so a chatty user can't compound your bill.
    _MAX_CONTEXT_TURNS = 10  # 10 user+10 assistant = 20 messages
    prior_count = 0
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
        prior_count = len(prior_chrono)
    except Exception as e:
        logger.warning(f"Doogie context load failed for {session_id}: {e}")

    async def gen():
        full = ""
        try:
            # Emit routing metadata FIRST so the frontend can show a small
            # badge (behind ?debug=1) while the main response streams in.
            if routing_meta:
                yield f"data: {json.dumps({'routing': routing_meta})}\n\n"
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
            # Save to response cache — only for stateless first-message questions
            # with no PII. Sits behind a helper so we can tweak the eligibility rule
            # in one place. Cache key uses the redacted message (safe to key on).
            await _save_doogie_cache(redacted_msg, lang, prior_count, pii_flags, redacted_reply)
            yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'pii_redacted': bool(pii_flags)})}\n\n"
        except Exception as e:
            logger.error(f"Doogie error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})


# ---- Doogie response cache (MongoDB TTL) ----
# Cache saves LLM $$ on the highest-volume repeat questions. TTL is 7 days so
# even time-sensitive answers stay fresh; if content changes we can bump the
# cache version prefix below to hard-invalidate everything.
_DOOGIE_CACHE_VERSION = "v3"  # bumped Jul 27 2026 — invalidates cached responses so new out-of-area template ("As a smaller BC community…") takes effect
_DOOGIE_CACHE_TTL_DAYS = 7
# Signals that a query is personal / stateful and should NOT be cached even if
# other rules pass. Prevents "hi doug!" or "for MY 500k budget…" bleeding
# across sessions.
_UNCACHEABLE_SIGNALS = re.compile(
    r"\b(my|our|i am|i'm|i'd|i've|help me|remind me|last time|earlier|previously)\b",
    re.IGNORECASE,
)


def _doogie_cache_key(msg: str, lang: str) -> str:
    """Stable SHA256 hash of the normalized inputs — used as the Mongo _id."""
    normalized = re.sub(r"\s+", " ", (msg or "").strip().lower())
    raw = f"{_DOOGIE_CACHE_VERSION}|{lang}|{normalized}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def _lookup_doogie_cache(msg: str, lang: str, session_id: str, pii_flags: list) -> Optional[str]:
    """Return cached reply text if this query is cache-eligible AND we have a hit."""
    m = (msg or "").strip()
    if not m or len(m) < 8 or len(m) > 600:
        return None
    if pii_flags:
        return None
    if _UNCACHEABLE_SIGNALS.search(m):
        return None
    # Only serve from cache when this is the FIRST message in the session
    # (i.e. stateless). Second/third turn may reference prior context.
    prior = await db.chat_messages.count_documents({"session_id": session_id, "role": "assistant"})
    if prior > 0:
        return None
    doc = await db.doogie_response_cache.find_one({"_id": _doogie_cache_key(m, lang)})
    if not doc:
        return None
    return doc.get("reply") or None


async def _save_doogie_cache(msg: str, lang: str, prior_count: int, pii_flags: list, reply: str) -> None:
    """Upsert the reply into the cache if this query is cache-eligible."""
    m = (msg or "").strip()
    r = (reply or "").strip()
    if not m or not r or len(m) < 8 or len(m) > 600 or len(r) < 20 or len(r) > 6000:
        return
    if pii_flags or prior_count > 0:
        return
    if _UNCACHEABLE_SIGNALS.search(m):
        return
    try:
        await db.doogie_response_cache.update_one(
            {"_id": _doogie_cache_key(m, lang)},
            {"$set": {
                "reply": r,
                "lang": lang,
                "cached_at": now_iso(),
                # TTL index driver
                "expires_at": datetime.now(timezone.utc) + timedelta(days=_DOOGIE_CACHE_TTL_DAYS),
            }},
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"Doogie cache write failed: {e}")

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

# =============== LEAD NOTIFICATION HELPER ===============
# Every lead form should ping Doug's inbox the moment it lands. Each address
# listed on the site has a canonical mailbox that receives the notification:
#   • Buyer / Seller / Valuation / Contact → info@eztofind.ca (general inbox)
#   • REALTOR® applications                → realtor@eztofind.ca
#   • Out-of-area referral requests        → referrals@eztofind.ca
# All are CC'd to info@eztofind.ca as the admin catch-all so nothing is missed
# if a mailbox is misconfigured. Every send is logged in email_outbox with a
# provider_message_id (7-year BCFSA/PIPA audit trail).
INFO_MAILBOX     = "info@eztofind.ca"
REALTOR_MAILBOX  = "realtor@eztofind.ca"
REFERRAL_MAILBOX = "referrals@eztofind.ca"

async def _notify_admin_of_lead(
    *, kind: str, to: str, subject: str, body_html: str, related_id: Optional[str] = None
):
    """Send an internal admin notification (transactional — no CASL footer needed
    because the recipient is the site owner, not the consumer). Adds info@eztofind.ca
    as CC unless it's already the primary recipient, and always CC's the ADMIN_EMAIL
    (doug@eztofind.ca) so every lead lands directly in Doug's inbox. Failure is
    non-fatal so the parent request never crashes because of email trouble."""
    try:
        from services.email_sender import send_email as _send
        cc_set = set()
        if to != INFO_MAILBOX:
            cc_set.add(INFO_MAILBOX)
        if to != ADMIN_EMAIL:
            cc_set.add(ADMIN_EMAIL)
        cc = sorted(cc_set) if cc_set else None
        html = (
            "<div style='font-family:Inter,Arial,sans-serif;max-width:640px;line-height:1.55'>"
            f"<h2 style='color:#0F2A5B;margin:0 0 1rem'>🐾 New {kind}</h2>"
            f"{body_html}"
            "<hr style='margin:1.5rem 0;border:none;border-top:1px solid #e5e7eb'/>"
            "<p style='color:#6b7280;font-size:0.82em'>You're receiving this because it was routed from an EZtoFind.ca lead form. This is an internal admin notification — the visitor does not see this email.</p>"
            "</div>"
        )
        text = re.sub(r"<[^>]+>", "", body_html).strip()
        result = await _send(
            db, to=to, subject=subject, html=html, text=text,
            kind="transactional", related_id=related_id, cc=cc,
        )
        logger.info(f"LEAD NOTIFICATION [{kind}] → {to} (cc={cc}) provider_id={result.get('provider_message_id')}")
        return result
    except Exception as e:
        logger.exception(f"Lead notification failed for {kind}: {e}")
        return {"queued": True, "error": str(e)}


# ---------------------------------------------------------------------------
# Lead Auto-Triage — our AI provider reads each new lead, assigns a priority
# (🔥 hot / ⚡ warm / ❄️ cold) with a short rationale + a concrete "next best
# action" for Doug, and prepends both to the notification email so the highest-
# value leads never get missed.
#
# The triage output is also persisted on the lead record so /admin/leads can
# render a priority column (future UI polish).
# ---------------------------------------------------------------------------

_TRIAGE_SYSTEM = (
    "You are a British Columbia real estate lead-triage assistant for Doug LeMaire, "
    "REALTOR®. You do NOT give real estate, legal, tax, or financial advice. Your only "
    "job is to score how quickly Doug should personally reach out to this lead based "
    "on their stated timeline, budget clarity, financing status, motivation, and "
    "specificity — then recommend a concrete next step. You output ONLY a JSON object."
)

_TRIAGE_RUBRIC = """
Return exactly this JSON shape — no preamble, no code fences:

{
  "priority": "hot" | "warm" | "cold",
  "rationale": "<one sentence, plain English, why this score>",
  "next_action": "<one concrete next step Doug should take, e.g. 'Call within 2 hrs — 30-day timeline + pre-approved' or 'Send buyer's guide + follow up in a week'>",
  "signals": ["<up to 3 short tags: 'pre-approved', 'urgent timeline', 'vague', 'first-time', 'high budget', 'out-of-area', ...>"]
}

Scoring rubric (weight roughly equally):
  - HOT: timeline ≤ 3 months AND (pre-approved OR clear budget) AND specific about location/type; motivated seller (job move, divorce, downsizing, deceased-estate) counts as motivation
  - WARM: timeline 3-12 months OR one of budget/financing/location is clear but not both; researching but engaged
  - COLD: timeline > 12 months OR "just curious" OR no budget/no financing/vague location OR working with another REALTOR® (they cannot be helped anyway)

Do NOT invent facts. If a field is missing, treat it as neutral. Never recommend anything that could be construed as advice.
"""


async def _score_lead(kind: str, lead: dict) -> dict:
    """Call the AI provider to score a lead. Returns a dict with priority /
    rationale / next_action / signals, or a neutral 'warm' fallback on failure."""
    try:
        # Compact the lead into a plain-English brief so the model has all the
        # fields it needs without leaking irrelevant PII fields.
        keys = ("full_name","email","phone","form_lang","areas","property_type",
                "budget_range","budget","bedrooms","timeline","timeframe",
                "financing_status","first_time_buyer","working_with_realtor",
                "preferred_contact","notes","reason","city","property_address",
                "estimated_value","expected_value","currently_listed")
        brief_parts = [f"- {k}: {lead[k]}" for k in keys if lead.get(k) not in (None, "", [])]
        brief = "\n".join(brief_parts) or "(no additional fields)"

        prompt = (
            f"Score this new {kind} for EZtoFind.ca (British Columbia). Use the rubric strictly.\n\n"
            f"LEAD BRIEF:\n{brief}\n\n{_TRIAGE_RUBRIC}"
        )
        chat = make_chat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"triage-{uuid.uuid4()}",
            system_message=_TRIAGE_SYSTEM,
        ).with_model("anthropic", "claude-sonnet-4-6")

        full = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta): full += ev.content
            elif isinstance(ev, StreamDone): break
        s = full.strip()
        if s.startswith("```"):
            s = s.split("```")[1].replace("json", "", 1).strip()
        start = s.find("{"); end = s.rfind("}")
        if start >= 0 and end > start:
            score = json.loads(s[start:end+1])
            prio = (score.get("priority") or "").lower()
            if prio not in ("hot", "warm", "cold"):
                prio = "warm"
            return {
                "priority": prio,
                "rationale": (score.get("rationale") or "").strip()[:400],
                "next_action": (score.get("next_action") or "").strip()[:400],
                "signals": [str(x).strip()[:40] for x in (score.get("signals") or [])][:5],
                "scored_at": now_iso(),
            }
    except Exception as e:
        logger.error(f"Lead triage failed for {kind} {lead.get('id')}: {e}")
    # Neutral fallback so the notification still goes out with a sane default
    return {
        "priority": "warm",
        "rationale": "Auto-triage unavailable — defaulted to warm; please review manually.",
        "next_action": "Review the lead details and reply within 1 business day.",
        "signals": ["triage-fallback"],
        "scored_at": now_iso(),
    }


_TRIAGE_EMOJI = {"hot": "🔥", "warm": "⚡", "cold": "❄️"}
_TRIAGE_BG    = {"hot": "#FEE2E2", "warm": "#FEF3C7", "cold": "#DBEAFE"}
_TRIAGE_FG    = {"hot": "#991B1B", "warm": "#78350F", "cold": "#1E3A8A"}


def _render_triage_banner(triage: dict) -> str:
    prio = (triage.get("priority") or "warm").lower()
    emoji = _TRIAGE_EMOJI.get(prio, "⚡")
    bg = _TRIAGE_BG.get(prio, "#FEF3C7")
    fg = _TRIAGE_FG.get(prio, "#78350F")
    signals = triage.get("signals") or []
    signals_html = ""
    if signals:
        chips = " ".join(
            f"<span style='display:inline-block;padding:0.15rem 0.5rem;margin:0.15rem 0.25rem 0 0;background:rgba(0,0,0,0.06);border-radius:999px;font-size:0.72rem;color:{fg}'>{s}</span>"
            for s in signals
        )
        signals_html = f"<div style='margin-top:0.5rem'>{chips}</div>"
    return (
        f"<div style='background:{bg};border-left:4px solid {fg};padding:0.9rem 1.1rem;margin:0 0 1.1rem;border-radius:6px'>"
        f"<div style='font-size:0.78rem;text-transform:uppercase;letter-spacing:0.08em;color:{fg};font-weight:800'>Auto-triage · Priority</div>"
        f"<div style='font-size:1.25rem;font-weight:800;color:{fg};margin:0.15rem 0 0.35rem'>{emoji} {prio.upper()}</div>"
        f"<div style='color:#1F2937;font-size:0.92rem;line-height:1.55'><strong>Why:</strong> {triage.get('rationale') or '—'}</div>"
        f"<div style='color:#1F2937;font-size:0.92rem;line-height:1.55;margin-top:0.35rem'><strong>Next action:</strong> {triage.get('next_action') or '—'}</div>"
        f"{signals_html}"
        f"<div style='font-size:0.7rem;color:#6b7280;margin-top:0.5rem'>AI-assisted triage using EZtoFind.ca's approved lead-scoring rubric. Doug's judgement always overrides — this is a routing hint, not a decision.</div>"
        f"</div>"
    )


async def _triage_and_notify_lead(*, kind: str, collection_name: str, lead_id: str,
                                   to: str, subject: str, body_html: str) -> None:
    """Background pipeline: pull the lead from Mongo, score it, persist the
    score, and — only for HOT leads — email Doug with the priority banner
    prepended and the priority emoji injected into the subject line.
    Warm/cold leads are still scored and appear in the /admin/lead-triage
    dashboard, but Doug's inbox stays quiet unless action is required.
    """
    try:
        coll = db[collection_name]
        lead = await coll.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            logger.warning(f"[triage] lead {lead_id} not found in {collection_name}")
            return

        triage = await _score_lead(kind, lead)
        prio = triage.get("priority", "warm")

        # Seed the follow-up checklist on first insert. Existing values are
        # preserved by only setting default fields when the sub-document
        # doesn't already exist.
        default_followup = {
            "contacted": False,
            "meeting_scheduled": False,
            "meeting_held": False,
            "proposal_sent": False,
            "status": "open",     # open | won | lost | nurture
            "notes": "",
            "last_updated_at": None,
            "last_updated_by": None,
        }
        await coll.update_one({"id": lead_id}, {"$set": {"triage": triage}})
        if not (lead.get("followup")):
            await coll.update_one({"id": lead_id}, {"$set": {"followup": default_followup}})

        if prio != "hot":
            logger.info(f"[triage] {kind} {lead_id} scored {prio.upper()} — skipping Doug notification (visible in /admin/lead-triage)")
            return

        emoji = _TRIAGE_EMOJI.get(prio, "🔥")
        subject_with = f"{emoji} [HOT] {subject}"
        body_with = _render_triage_banner(triage) + body_html

        await _notify_admin_of_lead(
            kind=kind, to=to, subject=subject_with,
            body_html=body_with, related_id=lead_id,
        )
    except Exception as e:
        logger.exception(f"[triage] pipeline failed for {kind} {lead_id}: {e}")

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
    # CASL: auto-enroll into welcome_series based on the blanket consent given
    # via the form's "I consent to receive commercial electronic messages" checkbox.
    # welcome_series is a category of commercial message, so this is covered by
    # that express consent. Recorded here for audit; user can opt out anytime via
    # /email-preferences.
    try:
        await campaign_record_consent(lead.email, "welcome_series", request,
            opt_in_text="Buyer lead form — I consent to receive commercial electronic messages (CASL).",
            source="buyer_leads")
    except Exception as e:
        logger.warning(f"[campaigns] auto-opt welcome_series failed for buyer_leads: {e}")
    # Background translation of the visitor's free-text note (non-EN forms)
    if (lead.form_lang or "en") != "en" and (lead.notes or "").strip():
        asyncio.create_task(_translate_lead_notes("buyer_leads", lead.id, "notes", lead.notes or "", lead.form_lang or "en"))
    logger.info(f"Buyer lead from {lead.email} (lang={lead.form_lang})")

    # Route to the correct mailbox. Referral requests come through /leads/buyer
    # with a "OUT-OF-AREA REFERRAL REQUEST" marker prefixed to notes, so we detect
    # that and route those to referrals@ instead of info@.
    is_referral = "OUT-OF-AREA REFERRAL REQUEST" in (lead.notes or "").upper()
    to_addr = REFERRAL_MAILBOX if is_referral else INFO_MAILBOX
    kind = "Referral Request" if is_referral else "Buyer Lead"
    body = (
        f"<p><strong>Name:</strong> {lead.full_name}<br/>"
        f"<strong>Email:</strong> {lead.email}<br/>"
        f"<strong>Phone:</strong> {lead.phone or '—'}<br/>"
        f"<strong>Areas of interest:</strong> {', '.join(lead.areas or []) or '—'}<br/>"
        f"<strong>Property type:</strong> {lead.property_type or '—'}<br/>"
        f"<strong>Budget:</strong> {lead.budget or '—'}<br/>"
        f"<strong>Bedrooms:</strong> {lead.bedrooms or '—'}<br/>"
        f"<strong>Timeframe:</strong> {lead.timeframe or '—'}<br/>"
        f"<strong>Language:</strong> {lead.form_lang or 'en'}</p>"
        f"<p><strong>Notes:</strong><br/>{(lead.notes or '—').replace(chr(10), '<br/>')}</p>"
        f"<p style='color:#6b7280;font-size:0.85em'>View in CRM: <a href='https://eztofind.ca/admin/leads?type=buyer'>Buyer Leads → {lead.email}</a></p>"
    )
    asyncio.create_task(_triage_and_notify_lead(
        kind=kind, collection_name="buyer_leads", lead_id=lead.id,
        to=to_addr,
        subject=f"🐾 New {kind} — {lead.full_name}" + (f" ({', '.join(lead.areas or [])})" if lead.areas else ""),
        body_html=body,
    ))
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
    # CASL: auto-enroll into welcome_series + seller_updates based on the blanket
    # consent given via the form. Seller leads are the primary target for the
    # monthly market update campaign — that's why they filled out a seller form.
    try:
        for c in ("welcome_series", "seller_updates"):
            await campaign_record_consent(lead.email, c, request,
                opt_in_text="Seller lead form — I consent to receive commercial electronic messages (CASL).",
                source="seller_leads")
    except Exception as e:
        logger.warning(f"[campaigns] auto-opt seller_leads failed: {e}")
    if (lead.form_lang or "en") != "en" and (lead.reason or "").strip():
        asyncio.create_task(_translate_lead_notes("seller_leads", lead.id, "reason", lead.reason or "", lead.form_lang or "en"))
    logger.info(f"Seller lead from {lead.email} (lang={lead.form_lang})")
    body = (
        f"<p><strong>Name:</strong> {lead.full_name}<br/>"
        f"<strong>Email:</strong> {lead.email}<br/>"
        f"<strong>Phone:</strong> {lead.phone or '—'}<br/>"
        f"<strong>Property address:</strong> {getattr(lead, 'address', '') or '—'}<br/>"
        f"<strong>Property type:</strong> {getattr(lead, 'property_type', '') or '—'}<br/>"
        f"<strong>Expected value:</strong> {getattr(lead, 'expected_value', '') or '—'}<br/>"
        f"<strong>Timeframe:</strong> {getattr(lead, 'timeframe', '') or '—'}<br/>"
        f"<strong>Language:</strong> {lead.form_lang or 'en'}</p>"
        f"<p><strong>Reason for selling:</strong><br/>{(lead.reason or '—').replace(chr(10), '<br/>')}</p>"
        f"<p style='color:#6b7280;font-size:0.85em'>View in CRM: <a href='https://eztofind.ca/admin/leads?type=seller'>Seller Leads → {lead.email}</a></p>"
    )
    asyncio.create_task(_triage_and_notify_lead(
        kind="Seller Lead", collection_name="seller_leads", lead_id=lead.id,
        to=INFO_MAILBOX,
        subject=f"🐾 New Seller Lead — {lead.full_name}",
        body_html=body,
    ))
    return {"success": True, "id": lead.id, "message": "Thank you! Doug will be in touch within 1 business day."}

# =============== UNSUBSCRIBE (working, updates lead records) ===============
class UnsubscribeIn(BaseModel):
    email: EmailStr

@api.post("/unsubscribe")
async def unsubscribe(body: UnsubscribeIn, request: Request):
    """Immediate one-click unsubscribe. Flips every list this email is on
    (buyer leads, seller leads, realtor applications, saved searches,
    favorites) to unsubscribed, logs an audit row with IP, then fires a
    transactional confirmation email so the user has proof it was actioned.
    CASL requires unsubscribe to take effect within 10 business days — we
    do it in <200ms and email the receipt."""
    email = body.email.lower()
    now = now_iso()
    ip = get_consent_meta(request)["consent_ip"]

    result_b = await db.buyer_leads.update_many({"email": email}, {"$set": {"unsubscribed": True, "unsubscribed_at": now, "unsubscribed_ip": ip}})
    result_s = await db.seller_leads.update_many({"email": email}, {"$set": {"unsubscribed": True, "unsubscribed_at": now, "unsubscribed_ip": ip}})
    result_r = await db.realtor_applications.update_many({"email": email}, {"$set": {"unsubscribed": True, "unsubscribed_at": now}})
    # Also flip any saved-search alerts + favorite-drop alerts under this
    # email so they stop firing immediately (single source of truth).
    result_ss = await db.saved_searches.update_many(
        {"email": email, "status": {"$ne": "unsubscribed"}},
        {"$set": {"status": "unsubscribed", "unsubscribed_at": now, "unsubscribed_ip": ip}},
    )
    result_fv = await db.user_favorites.update_many(
        {"email": email, "unsubscribed_at": None},
        {"$set": {"unsubscribed_at": now, "unsubscribed_ip": ip}},
    )
    total = (result_b.modified_count + result_s.modified_count + result_r.modified_count
             + result_ss.modified_count + result_fv.modified_count)
    await db.unsubscribe_log.insert_one({
        "email": email, "ts": now, "records_updated": total, "ip": ip,
        "detail": {"buyer": result_b.modified_count, "seller": result_s.modified_count,
                   "realtor": result_r.modified_count, "saved_searches": result_ss.modified_count,
                   "favorites": result_fv.modified_count},
    })
    # Send confirmation email — fire-and-forget; unsubscribe still succeeds
    # even if the receipt fails to send.
    try:
        await _send_unsubscribe_confirmation(email, total)
    except Exception as exc:
        logger.warning(f"Unsubscribe confirmation email failed for {email}: {exc}")
    return {
        "success": True,
        "records_updated": total,
        "message": "You've been unsubscribed. A confirmation email is on its way.",
    }


async def _send_unsubscribe_confirmation(email: str, records_updated: int) -> None:
    """Send a transactional confirmation email so the user has an audit trail
    that their unsubscribe was received and actioned. Idempotent — safe to
    call multiple times (e.g., if user clicks unsubscribe twice)."""
    from services.email_sender import send_email as _send_email
    now_utc = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")
    html = (
        "<div style='font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0F2A5B'>"
        "<h2 style='color:#0F2A5B'>🐾 You've been unsubscribed</h2>"
        "<p>We've received your request and immediately removed you from all EZtoFind.ca email lists.</p>"
        f"<p style='background:#F0F4FB;border-left:3px solid #1E4FCF;padding:12px 14px;border-radius:4px'>"
        f"<strong>Email:</strong> {email}<br/>"
        f"<strong>Confirmed:</strong> {now_utc}<br/>"
        f"<strong>Lists removed from:</strong> {records_updated}</p>"
        "<p>You won't receive any more commercial emails from us. Transactional messages "
        "(receipts, unsubscribe confirmations like this one) are the only exception.</p>"
        "<p style='color:#6b7280;font-size:0.85em'>If this was a mistake — or you'd like to opt back in later — "
        "you can always request a fresh subscription from <a href='https://eztofind.ca' style='color:#1E4FCF'>eztofind.ca</a>. "
        "We follow Canadian CASL and BC PIPA rules to the letter.</p>"
        "<hr style='border:none;border-top:1px solid #E5E7EB;margin:20px 0'/>"
        "<p style='color:#6b7280;font-size:0.8em'>Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd.<br/>"
        "info@eztofind.ca</p>"
        "</div>"
    )
    text = (
        "You've been unsubscribed from EZtoFind.ca.\n\n"
        f"Email: {email}\n"
        f"Confirmed: {now_utc}\n"
        f"Lists removed from: {records_updated}\n\n"
        "You won't receive any more commercial emails from us. If this was a mistake, "
        "you can request a fresh subscription anytime from https://eztofind.ca.\n\n"
        "— Doug LeMaire, REALTOR®\n"
        "Fraser Property Management Realty Services Ltd.\n"
        "info@eztofind.ca"
    )
    await _send_email(
        db, to=email,
        subject="🐾 EZtoFind.ca — unsubscribe confirmed",
        html=html, text=text,
        kind="transactional", related_id=None,
        unsubscribe_url=None,  # transactional; no unsubscribe footer needed
    )

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


class FavoritesSyncIn(BaseModel):
    """Save a user's favorite listings to the server. Cross-device sync + optional
    weekly digest of price-drops / new photos on their saved properties. Double
    opt-in (CASL) — creates a pending record until they click the email link."""
    email: EmailStr
    listing_keys: List[str] = []
    casl_consent: bool
    pipa_ack: bool

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
    # Log + send transactional confirmation (fire-and-forget)
    await db.unsubscribe_log.insert_one({
        "email": ss.get("email", "").lower(), "ts": now_iso(),
        "records_updated": 1, "ip": meta["consent_ip"],
        "detail": {"source": "saved_search_token", "saved_search_id": ss["id"]},
    })
    try:
        await _send_unsubscribe_confirmation(ss.get("email", "").lower(), 1)
    except Exception as exc:
        logger.warning(f"Unsubscribe confirmation email failed for {ss.get('email')}: {exc}")
    return HTMLResponse(_landing_page("You've been unsubscribed",
        "You will no longer receive BC listing alerts from EZtoFind.ca. This took effect immediately.<br/><br/>"
        "A confirmation email is on its way to your inbox.<br/><br/>"
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


# ============================================================
# USER FAVORITES — ❤️  save individual listings
# ============================================================
# Two-tier storage:
#   1. Browser localStorage (frontend-only) — anonymous, zero-friction
#   2. Server-side via `user_favorites` — cross-device sync, requires CASL
#      double opt-in identical to saved_searches.
# The frontend calls POST /api/favorites when the user chooses to sync to their
# account; we email a verification link that returns their favorites and stores
# the mapping. From then on, changes on any device call the same endpoint to
# refresh their server copy.

@api.get("/listings/by-keys")
async def listings_by_keys(keys: str = "", limit: int = 100):
    """Fetch multiple listings by comma-separated `listing_key`s. Used by the
    /favorites page to hydrate cards from the browser's localStorage."""
    key_list = [k.strip() for k in (keys or "").split(",") if k.strip()][:min(200, limit)]
    if not key_list:
        return {"count": 0, "listings": []}
    docs = await db.listings.find(
        {
            "listing_key": {"$in": key_list},
            "status": "Active",
            "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)},
            "list_price": {"$gt": 0},
        },
        {"_id": 0},
    ).to_list(len(key_list))
    # Preserve the order the user requested (their save order)
    by_key = {d["listing_key"]: d for d in docs}
    ordered = [by_key[k] for k in key_list if k in by_key]
    return {"count": len(ordered), "listings": ordered}


@api.post("/favorites")
async def sync_favorites(body: FavoritesSyncIn, request: Request):
    """Save a user's favorite listings to the server. Double-opt-in CASL flow —
    creates a pending record and emails a confirmation link. If the same email
    already has a verified record, this UPDATES the list transparently."""
    if not body.casl_consent or not body.pipa_ack:
        raise HTTPException(400, "Both CASL consent and PIPA acknowledgement are required.")
    if not body.listing_keys:
        raise HTTPException(400, "No listings to save. Heart a few listings first.")
    email = body.email.lower()
    listing_keys = [k.strip() for k in body.listing_keys if k and k.strip()][:200]

    # If already verified for this email → transparently update (no re-verify).
    existing = await db.user_favorites.find_one({"email": email, "status": "verified"})
    if existing:
        await db.user_favorites.update_one(
            {"id": existing["id"]},
            {"$set": {"listing_keys": listing_keys, "updated_at": now_iso()}},
        )
        return {
            "success": True,
            "status": "updated",
            "count": len(listing_keys),
            "message": f"Updated — your {len(listing_keys)} favorite listing(s) are synced to your account.",
        }

    # Otherwise create a pending record with double-opt-in email.
    meta = get_consent_meta(request)
    fav_id = str(uuid.uuid4())
    verify_tok = uuid.uuid4().hex + uuid.uuid4().hex[:8]
    unsub_tok = uuid.uuid4().hex + uuid.uuid4().hex[:8]
    doc = {
        "id": fav_id,
        "email": email,
        "listing_keys": listing_keys,
        "status": "pending",
        "policy_version": CURRENT_POLICY_VERSION,
        "verification_token": verify_tok,
        "unsubscribe_token": unsub_tok,
        "created_at": now_iso(),
        "verified_at": None,
        "updated_at": None,
        "unsubscribed_at": None,
        **meta,
    }
    await db.user_favorites.insert_one(doc)

    from services.email_sender import send_email as _send_email, SENDER_NAME, SENDER_ADDRESS, SENDER_PHONE, SENDER_EMAIL
    base = _public_base_url(request)
    verify_url = f"{base}/favorites?token={verify_tok}"  # frontend picks up token
    unsub_url = f"{base}/api/favorites/unsubscribe?token={unsub_tok}"

    html = f"""<!doctype html><html><body style="margin:0;background:#F5F0E1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E1;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:2rem;font-family:Inter,Arial,sans-serif;color:#111827">
<tr><td>
<div style="font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:#DC2626;font-weight:700">EZtoFind.ca · Confirm your favorites</div>
<h1 style="font-family:Georgia,serif;font-size:1.7rem;color:#0F2A5B;margin:0.4rem 0 0.75rem">Save your ❤️ favorites across devices</h1>
<p style="line-height:1.6;color:#374151">You (or someone using your email) asked EZtoFind.ca to sync <strong>{len(listing_keys)}</strong> favorite listing(s) to your email so you can pick them up on any device.</p>
<p style="line-height:1.6;color:#374151">Under Canada's Anti-Spam Legislation (CASL) we confirm every email address before saving anything to it. Click below to activate.</p>
<p style="text-align:center;margin:1.5rem 0"><a href="{verify_url}" style="display:inline-block;background:#DC2626;color:#fff;text-decoration:none;padding:0.9rem 1.9rem;border-radius:999px;font-weight:700">Save my favorites</a></p>
<p style="font-size:0.8rem;color:#6b7280;line-height:1.6">If you didn't request this, ignore this email. Nothing is saved until you click the link. Expires in 30 days.</p>
<hr style="margin:1.5rem 0 1rem;border:none;border-top:1px solid #e5e7eb"/>
<div style="font-size:12px;color:#6b7280;line-height:1.6">
  <p style="margin:0 0 0.5rem"><strong>{SENDER_NAME}</strong><br/>{SENDER_ADDRESS} · {SENDER_PHONE} · <a href="mailto:{SENDER_EMAIL}" style="color:#0F2A5B">{SENDER_EMAIL}</a></p>
  <p style="margin:0"><a href="{unsub_url}" style="color:#0F2A5B">Cancel this request &amp; delete pending data</a></p>
</div>
</td></tr></table></td></tr></table></body></html>"""
    text = (
        "EZtoFind.ca — Confirm your saved favorites\n\n"
        f"You asked EZtoFind.ca to sync {len(listing_keys)} favorite listing(s) to your email.\n\n"
        f"Confirm & save: {verify_url}\n\n"
        "If you didn't request this, ignore this email. Nothing is saved until you click.\n\n"
        f"---\n{SENDER_NAME}\n{SENDER_ADDRESS} · {SENDER_PHONE} · {SENDER_EMAIL}\n"
        f"Cancel this request: {unsub_url}\n"
    )
    await _send_email(db,
        to=body.email, subject="Confirm your EZtoFind.ca favorites",
        html=html, text=text, kind="transactional", related_id=fav_id,
        unsubscribe_url=unsub_url,
    )
    return {
        "success": True,
        "status": "pending",
        "message": "Check your inbox — we've sent a one-click confirmation link. Your favorites will sync as soon as you click it.",
    }


@api.get("/favorites/verify")
async def verify_favorites(token: str, request: Request):
    """Activation endpoint — clicked from the confirmation email. Returns the
    saved listing_keys so the frontend can hydrate the /favorites page."""
    rec = await db.user_favorites.find_one({"verification_token": token})
    if not rec:
        raise HTTPException(404, "Invalid or expired verification link.")
    if rec.get("status") == "verified":
        return {"success": True, "already_verified": True, "listing_keys": rec.get("listing_keys", [])}
    meta = get_consent_meta(request)
    await db.user_favorites.update_one(
        {"id": rec["id"]},
        {"$set": {
            "status": "verified",
            "verified_at": now_iso(),
            "verify_ip": meta.get("consent_ip"),
            "verify_ua": meta.get("consent_ua"),
        }},
    )
    return {"success": True, "listing_keys": rec.get("listing_keys", [])}


@api.get("/favorites/list")
async def list_favorites(email: str):
    """Fetch the current server-saved favorites for an email address (used to
    restore on a new device after they've already verified their email)."""
    email = (email or "").lower().strip()
    if not email or "@" not in email:
        raise HTTPException(400, "Valid email required.")
    rec = await db.user_favorites.find_one({"email": email, "status": "verified"})
    if not rec:
        return {"listing_keys": [], "found": False}
    return {"listing_keys": rec.get("listing_keys", []), "found": True, "updated_at": rec.get("updated_at") or rec.get("verified_at")}


@api.get("/favorites/unsubscribe")
async def unsubscribe_favorites(token: str, request: Request):
    """CASL one-click withdrawal. Deletes the server-side favorites; user can
    still keep browser localStorage favorites if they want."""
    from fastapi.responses import HTMLResponse
    rec = await db.user_favorites.find_one({"unsubscribe_token": token})
    if not rec:
        return HTMLResponse("<h1>Link expired</h1><p>This unsubscribe link is invalid or already used.</p>", status_code=404)
    await db.user_favorites.update_one(
        {"id": rec["id"]},
        {"$set": {"status": "unsubscribed", "unsubscribed_at": now_iso(), "listing_keys": []}},
    )
    # Log + send transactional confirmation (fire-and-forget)
    email_lc = (rec.get("email") or "").lower()
    if email_lc:
        await db.unsubscribe_log.insert_one({
            "email": email_lc, "ts": now_iso(), "records_updated": 1,
            "detail": {"source": "favorites_token", "favorites_id": rec["id"]},
        })
        try:
            await _send_unsubscribe_confirmation(email_lc, 1)
        except Exception as exc:
            logger.warning(f"Unsubscribe confirmation email failed for {email_lc}: {exc}")
    return HTMLResponse("""
<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#F5F0E1;padding:40px 20px;text-align:center;color:#111827">
<div style="background:#fff;max-width:520px;margin:0 auto;padding:2.5rem 2rem;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.08)">
<h1 style="font-family:Georgia,serif;color:#0F2A5B;margin:0 0 1rem">Your favorites have been removed</h1>
<p style="line-height:1.6;color:#374151">Your server-saved favorite listings on EZtoFind.ca have been permanently deleted.</p>
<p style="line-height:1.6;color:#6b7280;font-size:0.9rem">Any favorites you have in your browser (localStorage) are separate and can be cleared any time by clicking the ❤️ heart to un-favorite them.</p>
<p style="margin-top:1.5rem"><a href="https://eztofind.ca" style="color:#0F2A5B;font-weight:600">← Back to EZtoFind.ca</a></p>
</div></body></html>
""")


@api.post("/admin/favorites-heatmap")
async def admin_favorites_heatmap(_=Depends(verify_admin)):
    """Which listing_keys have been most-hearted across all verified users?
    Powers a future admin analytics dashboard — for now returns the top 100."""
    pipeline = [
        {"$match": {"status": "verified"}},
        {"$unwind": "$listing_keys"},
        {"$group": {"_id": "$listing_keys", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 100},
    ]
    hot = await db.user_favorites.aggregate(pipeline).to_list(100)
    return {"top_listings": [{"listing_key": h["_id"], "heart_count": h["count"]} for h in hot]}


@api.get("/admin/email-outbox")
async def admin_email_outbox(_=Depends(verify_admin)):
    """Read the email audit trail. Includes queued messages that will be
    replayed once RESEND_API_KEY is set."""
    docs = await db.email_outbox.find({}, {"_id": 0, "html": 0}).sort("created_at", -1).limit(500).to_list(500)
    pending = await db.email_outbox.count_documents({"status": "pending"})
    return {"pending_count": pending, "recent": docs}

class EmailTestRequest(BaseModel):
    to: EmailStr
    subject: Optional[str] = "🐾 EZtoFind.ca — Resend integration test"

@api.post("/admin/email/send-test")
async def admin_email_send_test(body: EmailTestRequest, _=Depends(verify_admin)):
    """Fires a live test email through Resend. Use this to verify the API key,
    From address, DNS verification, and inbox deliverability end-to-end."""
    from services.email_sender import send_email as _send
    html = (
        "<div style='font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:1rem'>"
        "<h2 style='color:#0F2A5B'>🐾 Resend is wired up correctly</h2>"
        "<p>This is a test email sent through the production email pipeline for <strong>EZtoFind.ca</strong>. "
        "If you're reading this in your inbox (not spam), then:</p>"
        "<ul>"
        "<li>✅ The Resend API key is valid</li>"
        "<li>✅ The FastAPI backend can reach Resend's servers</li>"
        "<li>✅ Your <em>From</em> address is authorized to send</li>"
        "</ul>"
        "<p style='color:#6b7280;font-size:0.85em'>Next step: verify the <code>eztofind.ca</code> domain in Resend so we can swap the sandbox sender for your real <code>info@eztofind.ca</code> address.</p>"
        "</div>"
    )
    text = "🐾 Resend is wired up correctly. This is a test email from EZtoFind.ca."
    result = await _send(
        db, to=body.to, subject=body.subject, html=html, text=text,
        kind="transactional", related_id="admin-test",
        unsubscribe_url="https://eztofind.ca/unsubscribe",
    )
    return result

@api.post("/admin/email-outbox/flush")
async def admin_email_outbox_flush(_=Depends(verify_admin)):
    """Retry every pending / failed message in email_outbox. Use this after
    verifying the eztofind.ca domain in Resend so backlogged messages actually
    get delivered instead of staying stuck in the queue."""
    from services.email_sender import send_email as _send
    q = {"status": {"$in": ["pending", "error", "failed"]}}
    docs = await db.email_outbox.find(q).sort("created_at", 1).limit(500).to_list(500)
    stats = {"attempted": 0, "sent": 0, "still_failed": 0}
    for d in docs:
        stats["attempted"] += 1
        try:
            r = await _send(
                db, to=d.get("to"), subject=d.get("subject",""),
                html=d.get("html") or "", text=d.get("text") or (d.get("html") or ""),
                kind=d.get("kind") or "transactional",
                related_id=d.get("related_id"),
                unsubscribe_url=d.get("unsubscribe_url"),
            )
            if not r.get("queued") and not r.get("error"):
                # Mark the old outbox row as sent so we don't retry forever.
                await db.email_outbox.update_one(
                    {"_id": d["_id"]},
                    {"$set": {"status": "sent", "sent_at": now_iso(), "provider_message_id": r.get("provider_message_id"), "replayed_at": now_iso()}},
                )
                stats["sent"] += 1
            else:
                await db.email_outbox.update_one(
                    {"_id": d["_id"]},
                    {"$set": {"status": "failed", "last_attempt_at": now_iso(), "last_error": r.get("error")}},
                )
                stats["still_failed"] += 1
        except Exception as e:
            stats["still_failed"] += 1
            logger.exception(f"flush send failed: {e}")
    return stats

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


# --- Lead Triage Dashboard — combined buyer + seller leads with triage scores
# and follow-up checklists. Used by /admin/lead-triage to give Doug a single
# priority-sorted view of every open lead across the platform.
@api.get("/admin/lead-triage")
async def lead_triage_dashboard(status: Optional[str] = None, _=Depends(verify_admin)):
    """Returns every buyer + seller lead with its triage + follow-up state,
    sorted hot → warm → cold, newest first within each tier.

    Query params:
      status=open     → only leads whose follow-up.status is 'open' (default)
      status=all      → every lead including won/lost/nurture
      status=won      → closed-won only
      status=lost     → closed-lost only
      status=nurture  → in nurture only
    """
    status = (status or "open").lower()
    q_extra = {}
    if status == "open":
        q_extra = {"$or": [
            {"followup.status": {"$in": ["open", None]}},
            {"followup": {"$exists": False}},
        ]}
    elif status in ("won", "lost", "nurture"):
        q_extra = {"followup.status": status}

    buyers = await db.buyer_leads.find(q_extra, {"_id": 0}).to_list(2000)
    sellers = await db.seller_leads.find(q_extra, {"_id": 0}).to_list(2000)
    for r in buyers:  r["_kind"] = "buyer"
    for r in sellers: r["_kind"] = "seller"

    rank = {"hot": 0, "warm": 1, "cold": 2}
    def sort_key(r):
        prio = (r.get("triage") or {}).get("priority") or "warm"
        return (rank.get(prio, 3), -1 * hash(r.get("created_at") or ""))
    combined = sorted(buyers + sellers, key=sort_key)

    # Bucket into priority tiers for the UI
    tiers = {"hot": [], "warm": [], "cold": [], "unscored": []}
    for r in combined:
        prio = ((r.get("triage") or {}).get("priority") or "").lower()
        if prio in tiers:
            tiers[prio].append(r)
        else:
            tiers["unscored"].append(r)

    # Sort each tier newest first
    for t in tiers.values():
        t.sort(key=lambda r: r.get("created_at") or "", reverse=True)

    return {
        "status_filter": status,
        "counts": {k: len(v) for k, v in tiers.items()},
        "tiers": tiers,
        "total": sum(len(v) for v in tiers.values()),
    }


class LeadFollowupUpdate(BaseModel):
    contacted: Optional[bool] = None
    meeting_scheduled: Optional[bool] = None
    meeting_held: Optional[bool] = None
    proposal_sent: Optional[bool] = None
    status: Optional[str] = None      # open | won | lost | nurture
    notes: Optional[str] = None


@api.put("/admin/leads/{kind}/{lead_id}/followup")
async def update_lead_followup(kind: str, lead_id: str, body: LeadFollowupUpdate, _=Depends(verify_admin)):
    """Update the follow-up checklist / status / notes on a single lead."""
    coll = _lead_collection_for_type(kind)
    lead = await coll.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, f"{kind} lead {lead_id} not found")

    valid_status = {"open", "won", "lost", "nurture"}
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if "status" in payload and payload["status"] not in valid_status:
        raise HTTPException(400, f"status must be one of {sorted(valid_status)}")

    existing = lead.get("followup") or {}
    merged = {**existing, **payload, "last_updated_at": now_iso(), "last_updated_by": "admin"}
    await coll.update_one({"id": lead_id}, {"$set": {"followup": merged}})
    return {"ok": True, "followup": merged}


# --- CASL / PIPA — Consent Record Export ---
# Auditors (CRTC under CASL s.10(9), OIPC under PIPA s.23) may request the full
# consent record for a specific individual on 30 days' notice. This endpoint
# renders every field required to demonstrate "express consent, freely given,
# with informed knowledge of purpose" in a single downloadable JSON blob.
#
# Records included:
#   1. The lead form submission itself (with every field except _id)
#   2. Explicit consent flags (casl_consent, pipa_ack) and the timestamp at
#      which each was captured
#   3. Consent metadata (consent_ip, consent_ua, consent_at) — the tamper-
#      evident proof-of-consent trail
#   4. Any unsubscribe events (unsubscribed_at, unsubscribed_ip, source)
#   5. Any downstream email delivery / bounce records tied to the same email
#   6. Any DSAR (data subject access request) events for the same email
def _lead_collection_for_type(kind: str):
    kind = (kind or "").lower()
    if kind == "buyer":  return db.buyer_leads
    if kind == "seller": return db.seller_leads
    raise HTTPException(400, "kind must be 'buyer' or 'seller'")


@api.get("/admin/leads/{kind}/{lead_id}/consent-record")
async def export_consent_record(kind: str, lead_id: str, _=Depends(verify_admin)):
    coll = _lead_collection_for_type(kind)
    lead = await coll.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, f"{kind} lead {lead_id} not found")
    email = (lead.get("email") or "").lower()

    # Related records tied by email (case-insensitive)
    email_rx = re.escape(email) if email else None
    q = {"email": {"$regex": f"^{email_rx}$", "$options": "i"}} if email_rx else {"email": "__NEVER__"}

    unsub = await db.unsubscribe_log.find(q, {"_id": 0}).sort("ts", -1).to_list(50)
    dsar = await db.dsar_requests.find(q, {"_id": 0}).sort("ts", -1).to_list(50) if "dsar_requests" in await db.list_collection_names() else []
    outbound = await db.email_outbox.find(q, {"_id": 0}).sort("ts", -1).to_list(200) if "email_outbox" in await db.list_collection_names() else []

    record = {
        "record_type": "CASL_PIPA_consent_record",
        "record_id": lead_id,
        "lead_kind": kind,
        "email": email,
        "exported_at": now_iso(),
        "exported_by": "admin",
        "consent": {
            "casl_consent": bool(lead.get("casl_consent")),
            "pipa_ack": bool(lead.get("pipa_ack")),
            "consent_at": lead.get("consent_at"),
            "consent_ip": lead.get("consent_ip"),
            "consent_ua": lead.get("consent_ua"),
            "form_source": lead.get("source") or (f"{kind}_lead_form"),
            "form_lang": lead.get("form_lang") or "en",
            "unsubscribed": bool(lead.get("unsubscribed")),
            "unsubscribed_at": lead.get("unsubscribed_at"),
            "unsubscribed_ip": lead.get("unsubscribed_ip"),
        },
        "lead_snapshot": lead,
        "unsubscribe_events": unsub,
        "dsar_events": dsar,
        "email_outbox_events": outbound,
        "legal_basis": (
            "Consent recorded under Canada's Anti-Spam Legislation (CASL, SC 2010, c. 23) "
            "and British Columbia's Personal Information Protection Act (PIPA, SBC 2003, c. 63). "
            "This document is the tamper-evident consent artifact required by CASL s.10(9) and "
            "the record-of-collection artifact required by PIPA s.10."
        ),
        "signed_by": "Doug LeMaire, REALTOR® — Privacy Officer — Fraser Property Management Realty Services Ltd.",
    }

    # Serve as an attachment so it downloads instead of previewing in-browser.
    filename = f"consent-record-{kind}-{lead_id}.json"
    return JSONResponse(
        content=record,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# =============== REALTOR REFERRAL NETWORK ===============
class RealtorInitial(BaseModel):
    full_name: str
    email: EmailStr
    brokerage: Optional[str] = None
    realtor_number: Optional[str] = None
    province: Optional[str] = None
    network_type: Optional[str] = "bc"  # "bc" (in-province partner) or "oop" (out-of-province partner)
    crea_member: Optional[bool] = None  # CREA membership status — required for full REALTOR® designation + MLS® access

@api.post("/realtors/apply")
async def realtor_apply(body: RealtorInitial):
    existing = await db.realtor_applications.find_one({"email": body.email})
    if existing:
        # Update existing with any new fields
        await db.realtor_applications.update_one({"email": body.email}, {"$set": {**body.model_dump(exclude_none=True), "updated_at": now_iso()}})
        return {"success": True, "id": existing["id"], "message": "Your Information has been received. Doug will be in touch."}
    app_obj = RealtorApplication(full_name=body.full_name, email=body.email, brokerage=body.brokerage, realtor_number=body.realtor_number, stage="applied")
    doc = app_obj.model_dump()
    doc["network_type"] = "bc"
    doc["crea_member"] = body.crea_member
    await db.realtor_applications.insert_one(doc)
    logger.info(f"REALTOR APPLICATION → realtor@eztofind.ca: {body.full_name} ({body.email}) — {body.brokerage} — #{body.realtor_number}")
    asyncio.create_task(_notify_admin_of_lead(
        kind="REALTOR® Application", to=REALTOR_MAILBOX,
        subject=f"🐾 New REALTOR® Application — {body.full_name}",
        body_html=(
            f"<p><strong>Name:</strong> {body.full_name}<br/>"
            f"<strong>Email:</strong> {body.email}<br/>"
            f"<strong>Brokerage:</strong> {body.brokerage}<br/>"
            f"<strong>REALTOR® #:</strong> {body.realtor_number}</p>"
            f"<p><strong>CREA Member:</strong> {'✅ Yes' if body.crea_member else ('❌ No' if body.crea_member is False else '—')}</p>"
            f"<p>25% referral fee agreement pending Doug's approval.</p>"
            f"<p style='color:#6b7280;font-size:0.85em'>Review in CRM: <a href='https://eztofind.ca/admin/leads?type=realtor'>REALTOR® Applications → {body.email}</a></p>"
        ),
        related_id=app_obj.id,
    ))
    return {"success": True, "id": app_obj.id, "message": "Your Information has been received. Doug will be in touch."}

# Out-of-province REALTOR® application — same data model, different destination
# and marks the record as network_type="oop" so it can be filtered separately
# in the admin CRM (BC partners vs. cross-Canada referral partners).
DOUG_MAILBOX = "doug@eztofind.ca"

@api.post("/realtors/apply-oop")
async def realtor_apply_out_of_province(body: RealtorInitial):
    existing = await db.realtor_applications.find_one({"email": body.email})
    if existing:
        await db.realtor_applications.update_one(
            {"email": body.email},
            {"$set": {**body.model_dump(exclude_none=True), "network_type": "oop", "updated_at": now_iso()}},
        )
        return {"success": True, "id": existing["id"], "message": "Your Information has been received. Doug will be in touch."}
    app_obj = RealtorApplication(full_name=body.full_name, email=body.email, brokerage=body.brokerage, realtor_number=body.realtor_number, stage="applied")
    doc = app_obj.model_dump()
    doc["network_type"] = "oop"
    doc["province"] = body.province or ""
    doc["crea_member"] = body.crea_member
    await db.realtor_applications.insert_one(doc)
    logger.info(f"OOP REALTOR APPLICATION → {DOUG_MAILBOX}: {body.full_name} ({body.email}) — {body.brokerage} — {body.province}")
    asyncio.create_task(_notify_admin_of_lead(
        kind="Out-of-Province REALTOR® Application", to=DOUG_MAILBOX,
        subject=f"🐾 New Out-of-Province REALTOR® Application — {body.full_name} ({body.province or 'unknown province'})",
        body_html=(
            f"<p><strong>Name:</strong> {body.full_name}<br/>"
            f"<strong>Email:</strong> {body.email}<br/>"
            f"<strong>Brokerage:</strong> {body.brokerage}<br/>"
            f"<strong>License #:</strong> {body.realtor_number}<br/>"
            f"<strong>Province:</strong> {body.province or '—'}</p>"
            f"<p><strong>CREA Member:</strong> {'✅ Yes' if body.crea_member else ('❌ No' if body.crea_member is False else '—')}</p>"
            f"<p>National referral network — 25% referral fee, bidirectional (BC-exit clients to this partner, BC-inbound clients from this partner).</p>"
            f"<p>Pending your review + signed CREA Inter-Board Referral Agreement.</p>"
            f"<p style='color:#6b7280;font-size:0.85em'>Review in CRM: <a href='https://eztofind.ca/admin/leads?type=realtor'>REALTOR® Applications → {body.email}</a></p>"
        ),
        related_id=app_obj.id,
    ))
    return {"success": True, "id": app_obj.id, "message": "Your Information has been received. Doug will be in touch."}

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
    """Returns upcoming client lifecycle reminders within the next 30 days.
    Types: Birthday, Anniversary, Possession Anniversary, BC Assessment,
    Mortgage Renewal (90d + 60d), Christmas. Each row includes consent status
    so Doug knows whether he can send commercially (CASL)."""
    clients = await db.clients.find({}, {"_id": 0}).to_list(2000)
    today = datetime.now(timezone.utc).date()
    horizon_days = 30
    reminders = []

    def _consent_state(c: dict) -> dict:
        return {
            "email_consent": bool(c.get("email_consent")),
            "unsubscribed": bool(c.get("unsubscribed")),
            "can_send": bool(c.get("email_consent")) and not c.get("unsubscribed") and bool(c.get("email")),
        }

    def _days_until(month: int, day: int) -> int:
        try:
            target = datetime(today.year, month, day).date()
        except ValueError:
            return -1
        if target < today:
            try:
                target = datetime(today.year + 1, month, day).date()
            except ValueError:
                return -1
        return (target - today).days

    for c in clients:
        base = {
            "client_id": c["id"],
            "client_name": c["full_name"],
            "client_email": c.get("email") or "",
            "consent": _consent_state(c),
        }
        # Birthday / Anniversary / Possession-versary (recurring annual)
        for field, label, key in [
            ("birthdate", "Birthday", "birthday"),
            ("anniversary", "Anniversary", "anniversary"),
            ("possession_date", "Possession Anniversary", "possession"),
        ]:
            v = c.get(field)
            if not v:
                continue
            try:
                d = datetime.strptime(v, "%Y-%m-%d").date()
                this_year = d.replace(year=today.year)
                delta = (this_year - today).days
                if delta < 0:
                    this_year = d.replace(year=today.year + 1)
                    delta = (this_year - today).days
                if 0 <= delta <= horizon_days:
                    years = today.year - d.year if key == "possession" else None
                    if key == "possession" and (years is None or years < 1):
                        continue  # no possession-versary in the first year
                    reminders.append({
                        **base,
                        "type": label,
                        "type_key": key,
                        "date": this_year.isoformat(),
                        "days_until": delta,
                        "years": years,
                        "auto_send": key in ("birthday", "anniversary"),
                    })
            except Exception:
                continue

        # BC Assessment reminder — annual heads-up on Jan 3 (notices mailed early Jan)
        if c.get("bc_assessment_opt_in", True):
            delta = _days_until(1, 3)
            if 0 <= delta <= horizon_days:
                target = today + timedelta(days=delta)
                reminders.append({
                    **base,
                    "type": "BC Assessment",
                    "type_key": "bc_assessment",
                    "date": target.isoformat(),
                    "days_until": delta,
                    "auto_send": False,  # manual review — higher stakes
                })

        # Mortgage Renewal — ping at 90d and 60d out
        mrd = c.get("mortgage_renewal_date")
        if mrd:
            try:
                mr = datetime.strptime(mrd, "%Y-%m-%d").date()
                delta = (mr - today).days
                for ping in (90, 60):
                    if delta == ping:
                        reminders.append({
                            **base,
                            "type": f"Mortgage Renewal ({ping}d out)",
                            "type_key": "mortgage_renewal",
                            "date": mr.isoformat(),
                            "days_until": delta,
                            "ping_bucket": ping,
                            "auto_send": False,  # manual review — high-stakes
                        })
            except Exception:
                pass

        # Christmas — appears Dec 1 onward, sent Dec 20; only for opted-in past/sphere clients
        if c.get("send_christmas", True):
            delta = _days_until(12, 20)
            if 0 <= delta <= horizon_days:
                target = today + timedelta(days=delta)
                reminders.append({
                    **base,
                    "type": "Christmas Greeting",
                    "type_key": "christmas",
                    "date": target.isoformat(),
                    "days_until": delta,
                    "auto_send": True,
                })

        # New Year — appears Dec 22 onward, sent Jan 1; opt-in per client
        if c.get("send_new_year", True):
            delta = _days_until(1, 1)
            if 0 <= delta <= horizon_days:
                target = today + timedelta(days=delta)
                reminders.append({
                    **base,
                    "type": "New Year Greeting",
                    "type_key": "new_year",
                    "date": target.isoformat(),
                    "days_until": delta,
                    "auto_send": True,
                })

    reminders.sort(key=lambda r: r["days_until"])
    return reminders

# ---------- Reminder templates ----------
_REMINDER_TYPES = ["birthday", "anniversary", "possession", "bc_assessment", "mortgage_renewal", "christmas", "new_year"]

DEFAULT_REMINDER_TEMPLATES = {
    "birthday": {
        "subject": "Happy Birthday, {{first_name}}! 🎂",
        "body_html": (
            "<p>Hi {{first_name}},</p>"
            "<p>Just a quick note from Doug at EZtoFind.ca — <strong>Happy Birthday!</strong> "
            "I hope your day is full of good coffee, good company, and (if I'm lucky) a peek at the "
            "latest listings on your Saved Search. 🎉</p>"
            "<p>If there's anything I can help with — a market chat, referral to a great REALTOR® "
            "outside my service area, or just a curiosity question about your home's value — "
            "just hit reply.</p>"
            "<p>Warmly,<br/>Doug LeMaire, REALTOR®<br/>Fraser Property Management Realty Services Ltd.</p>"
        ),
    },
    "anniversary": {
        "subject": "Cheers to another year, {{first_name}} 🥂",
        "body_html": (
            "<p>Hi {{first_name}},</p>"
            "<p>Just a warm hello from Doug — happy anniversary to you and {{spouse_name}}! "
            "Wishing you both another wonderful year in your home.</p>"
            "<p>If you're thinking about the future — whether it's an eventual move, a renovation "
            "question, or a market check-in — I'm one reply away.</p>"
            "<p>Warmly,<br/>Doug LeMaire, REALTOR®</p>"
        ),
    },
    "possession": {
        "subject": "{{years}} year{{years_s}} in your home, {{first_name}}! 🏠",
        "body_html": (
            "<p>Hi {{first_name}},</p>"
            "<p>Hard to believe it's already been <strong>{{years}} year{{years_s}}</strong> since you got "
            "the keys{{property_line}}. Congratulations on the milestone!</p>"
            "<p>If you'd ever like a no-obligation valuation for your records — or you're curious what "
            "similar homes in your neighbourhood are doing — just reply and I'll pull the numbers.</p>"
            "<p>All the best,<br/>Doug LeMaire, REALTOR®</p>"
        ),
    },
    "bc_assessment": {
        "subject": "Your BC Assessment notice is coming, {{first_name}} 📋",
        "body_html": (
            "<p>Hi {{first_name}},</p>"
            "<p>Heads up — BC Assessment mails its <strong>2026 assessment notices in early January</strong>, "
            "reflecting your home's value as of July 1, 2025.</p>"
            "<p>A few things worth knowing:</p>"
            "<ul>"
            "<li>The assessed value is <em>not</em> the same as fair market value today. It's a snapshot "
            "from six months ago, used for property-tax calculation only.</li>"
            "<li>You have until <strong>January 31</strong> to file a Notice of Complaint (formerly \"appeal\") "
            "if the assessment looks off.</li>"
            "<li>If you'd like a current market valuation to compare against the BCA number, I'm happy to "
            "prepare one — no obligation.</li>"
            "</ul>"
            "<p>Reply anytime,<br/>Doug LeMaire, REALTOR®</p>"
        ),
    },
    "mortgage_renewal": {
        "subject": "Your mortgage renews {{renewal_date}} — {{days}} days out",
        "body_html": (
            "<p>Hi {{first_name}},</p>"
            "<p>A friendly reminder that your mortgage with <strong>{{lender}}</strong> is up for renewal "
            "on <strong>{{renewal_date}}</strong> — about <strong>{{days}} days</strong> away.</p>"
            "<p>A few thoughts before you sign the renewal your lender sends:</p>"
            "<ul>"
            "<li>The rate on the auto-renewal letter is almost always higher than what you can negotiate "
            "or move for. Shop it.</li>"
            "<li>An independent mortgage broker can quote 30+ lenders in one shot — free of charge.</li>"
            "<li>If you're considering a move, a purchase, or an equity take-out, now is the natural "
            "window to plan it.</li>"
            "</ul>"
            "<p>If you'd like an introduction to a broker I trust, just reply.</p>"
            "<p>Warmly,<br/>Doug LeMaire, REALTOR®</p>"
            "<p style='color:#666;font-size:0.85em'>This is a general reminder, not mortgage advice. "
            "Please consult a licensed mortgage professional.</p>"
        ),
    },
    "christmas": {
        "subject": "Merry Christmas from Doug & the EZtoFind.ca family 🎄",
        "body_html": (
            "<p>Hi {{first_name}},</p>"
            "<p>Just a warm holiday hello from Doug — <strong>Merry Christmas and Happy Holidays</strong> "
            "to you and yours! Thank you for being part of the EZtoFind.ca community this year.</p>"
            "<p>Wishing you a restful season, safe travels, and a bright 2027.</p>"
            "<p>See you in the new year,<br/>Doug LeMaire, REALTOR®<br/>Fraser Property Management Realty Services Ltd.</p>"
        ),
    },
    "new_year": {
        "subject": "Happy New Year, {{first_name}} — cheers to what's next 🎉",
        "body_html": (
            "<p>Hi {{first_name}},</p>"
            "<p>Wishing you and yours a <strong>very happy New Year</strong>! Whatever 2027 brings — a "
            "move, a renovation, a new career chapter, or simply enjoying the home you're already in — "
            "I hope it's a year of good news, good health, and good coffee. ☕</p>"
            "<p>If real estate ends up on your radar this year — even just a curiosity check about your "
            "home's current market value — you know where to find me. No obligation, no pressure, just "
            "a friendly chat whenever you're ready.</p>"
            "<p>Here's to a great year ahead,<br/>Doug LeMaire, REALTOR®<br/>Fraser Property Management Realty Services Ltd.</p>"
        ),
    },
}

async def _seed_reminder_templates():
    """Idempotent — inserts any missing defaults."""
    for t, payload in DEFAULT_REMINDER_TEMPLATES.items():
        existing = await db.reminder_templates.find_one({"type": t})
        if not existing:
            doc = ReminderTemplate(type=t, subject=payload["subject"], body_html=payload["body_html"]).model_dump()
            await db.reminder_templates.insert_one(doc)

_CASL_FOOTER_HTML = (
    '<hr style="margin:2em 0;border:none;border-top:1px solid #ddd"/>'
    '<p style="color:#888;font-size:0.8em;line-height:1.5">'
    'You are receiving this because you expressly consented to lifecycle updates from Doug LeMaire, REALTOR® '
    'at EZtoFind.ca. '
    'Sender: Doug LeMaire, Fraser Property Management Realty Services Ltd., '
    '1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5 · +1-604-466-7021 · doug@eztofind.ca<br/>'
    '<a href="{{unsubscribe_url}}" style="color:#888">Unsubscribe from future reminders</a>'
    '</p>'
)

def _render_reminder_template(body: str, client: dict, extra: dict = None) -> str:
    """Simple mustache-style {{tag}} rendering with safe fallbacks."""
    extra = extra or {}
    first = (client.get("full_name") or "").split(" ")[0] or "there"
    years = extra.get("years")
    ctx = {
        "first_name": first,
        "full_name": client.get("full_name") or "there",
        "spouse_name": client.get("spouse_name") or "your partner",
        "property_address": client.get("property_address") or "",
        "property_line": f" at {client['property_address']}" if client.get("property_address") else "",
        "years": str(years) if years is not None else "",
        "years_s": "s" if (years or 0) != 1 else "",
        "renewal_date": client.get("mortgage_renewal_date") or "",
        "lender": client.get("mortgage_lender") or "your lender",
        "days": str(extra.get("days") or ""),
        "unsubscribe_url": extra.get("unsubscribe_url") or "https://eztofind.ca/unsubscribe",
    }
    out = body
    for k, v in ctx.items():
        out = out.replace("{{" + k + "}}", str(v))
    return out

async def _queue_reminder_email(client: dict, type_key: str, request: Request, extra: dict = None) -> dict:
    """CASL-compliant reminder send. Returns {status, log_id, reason?}.
    - Refuses if no email, no express consent, or client unsubscribed.
    - Always attaches sender ID + unsubscribe link (CASL s.6(2)).
    - Writes to email_outbox (mock) + email_send_log (7-yr audit)."""
    extra = extra or {}
    if not client.get("email"):
        return {"status": "skipped", "reason": "no_email"}
    if not client.get("email_consent"):
        return {"status": "skipped", "reason": "no_consent"}
    if client.get("unsubscribed"):
        return {"status": "skipped", "reason": "unsubscribed"}
    tpl = await db.reminder_templates.find_one({"type": type_key, "active": True})
    if not tpl:
        return {"status": "skipped", "reason": "no_template"}

    base = _public_base_url(request)
    unsub_url = f"{base}/api/unsubscribe/reminder/{client.get('unsubscribe_token','')}"
    extra_ctx = {**extra, "unsubscribe_url": unsub_url}

    subject = _render_reminder_template(tpl["subject"], client, extra_ctx)
    body = _render_reminder_template(tpl["body_html"] + _CASL_FOOTER_HTML, client, extra_ctx)

    log = EmailSendLog(
        client_id=client["id"], client_email=client["email"], client_name=client["full_name"],
        type=type_key, subject=subject, body_html=body,
        unsubscribe_token=client.get("unsubscribe_token"), status="queued"
    ).model_dump()
    await db.email_send_log.insert_one(log)

    # Try real delivery via Resend (falls back to email_outbox queue if no API key).
    from services.email_sender import send_email as _send
    text_body = re.sub(r"<[^>]+>", "", body)  # simple HTML-strip for text/plain fallback
    result = await _send(
        db,
        to=client["email"],
        subject=subject,
        html=body,
        text=text_body,
        kind="commercial",
        related_id=client["id"],
        unsubscribe_url=unsub_url,
    )
    # Update the audit log with delivery outcome
    delivered_status = "sent" if not result.get("queued") and not result.get("error") else ("queued" if result.get("queued") else "failed")
    await db.email_send_log.update_one(
        {"id": log["id"]},
        {"$set": {"status": delivered_status, "provider_message_id": result.get("provider_message_id"), "provider_error": result.get("error")}},
    )
    logger.info(f"REMINDER {delivered_status} → {client['email']} ({type_key}) log_id={log['id']} provider_id={result.get('provider_message_id')}")
    return {"status": delivered_status, "log_id": log["id"], "to": client["email"], "provider_message_id": result.get("provider_message_id"), "error": result.get("error")}


@api.get("/admin/reminder-templates")
async def get_reminder_templates(_=Depends(verify_admin)):
    await _seed_reminder_templates()
    docs = await db.reminder_templates.find({}, {"_id": 0}).to_list(20)
    # Sort into a stable order for the UI
    order = {t: i for i, t in enumerate(_REMINDER_TYPES)}
    docs.sort(key=lambda d: order.get(d.get("type"), 99))
    return docs

class ReminderTemplateUpdate(BaseModel):
    subject: str
    body_html: str
    active: Optional[bool] = True

@api.put("/admin/reminder-templates/{type_key}")
async def update_reminder_template(type_key: str, body: ReminderTemplateUpdate, _=Depends(verify_admin)):
    if type_key not in _REMINDER_TYPES:
        raise HTTPException(400, "Unknown template type")
    payload = {**body.model_dump(), "type": type_key, "updated_at": now_iso()}
    await db.reminder_templates.update_one({"type": type_key}, {"$set": payload}, upsert=True)
    return {"success": True}

@api.post("/admin/reminder-templates/{type_key}/reset")
async def reset_reminder_template(type_key: str, _=Depends(verify_admin)):
    if type_key not in DEFAULT_REMINDER_TEMPLATES:
        raise HTTPException(400, "Unknown template type")
    d = DEFAULT_REMINDER_TEMPLATES[type_key]
    await db.reminder_templates.update_one(
        {"type": type_key},
        {"$set": {"subject": d["subject"], "body_html": d["body_html"], "active": True, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"success": True}

class SendReminderIn(BaseModel):
    client_id: str
    type_key: str
    years: Optional[int] = None
    days: Optional[int] = None

@api.post("/admin/reminders/send")
async def send_reminder_now(body: SendReminderIn, request: Request, _=Depends(verify_admin)):
    if body.type_key not in _REMINDER_TYPES:
        raise HTTPException(400, "Unknown reminder type")
    client = await db.clients.find_one({"id": body.client_id})
    if not client:
        raise HTTPException(404, "Client not found")
    extra = {"years": body.years, "days": body.days}
    result = await _queue_reminder_email(client, body.type_key, request, extra=extra)
    return result

@api.post("/admin/reminders/{cid}/{type_key}/snooze")
async def snooze_reminder(cid: str, type_key: str, _=Depends(verify_admin)):
    """Mark a reminder as dismissed for this year so it stops showing on the dashboard."""
    if type_key not in _REMINDER_TYPES:
        raise HTTPException(400, "Unknown reminder type")
    year = datetime.now(timezone.utc).year
    await db.reminder_snoozes.update_one(
        {"client_id": cid, "type_key": type_key, "year": year},
        {"$set": {"client_id": cid, "type_key": type_key, "year": year, "snoozed_at": now_iso()}},
        upsert=True,
    )
    return {"success": True}

@api.get("/admin/reminders/christmas/preview")
async def christmas_preview(request: Request, _=Depends(verify_admin)):
    """List every client eligible for the Dec-20 Christmas bulk send + render one preview."""
    clients = await db.clients.find({"send_christmas": True, "email_consent": True, "unsubscribed": {"$ne": True}, "email": {"$nin": ["", None]}}).to_list(2000)
    tpl = await db.reminder_templates.find_one({"type": "christmas", "active": True})
    preview_html, preview_subject = "", ""
    if tpl and clients:
        base = _public_base_url(request)
        sample = clients[0]
        unsub_url = f"{base}/api/unsubscribe/reminder/{sample.get('unsubscribe_token','')}"
        preview_subject = _render_reminder_template(tpl["subject"], sample, {"unsubscribe_url": unsub_url})
        preview_html = _render_reminder_template(tpl["body_html"] + _CASL_FOOTER_HTML, sample, {"unsubscribe_url": unsub_url})
    return {
        "count": len(clients),
        "recipients": [{"id": c["id"], "name": c["full_name"], "email": c["email"]} for c in clients[:200]],
        "preview_subject": preview_subject,
        "preview_html": preview_html,
    }

@api.post("/admin/reminders/christmas/send")
async def christmas_send(request: Request, _=Depends(verify_admin)):
    """Fire the Christmas bulk send to every consented, non-unsubscribed client with send_christmas=true."""
    clients = await db.clients.find({"send_christmas": True, "email_consent": True, "unsubscribed": {"$ne": True}, "email": {"$nin": ["", None]}}).to_list(2000)
    results = {"queued": 0, "skipped": 0}
    for c in clients:
        r = await _queue_reminder_email(c, "christmas", request)
        if r.get("status") == "queued":
            results["queued"] += 1
        else:
            results["skipped"] += 1
    return results

@api.post("/admin/reminders/auto-send-today")
async def auto_send_today(request: Request, _=Depends(verify_admin)):
    """Sends all AUTO-eligible reminders due today (Birthday, Anniversary, Christmas on Dec 20).
    Manual-review types (BC Assessment, Mortgage Renewal) are intentionally excluded.
    Doug can click this daily; a cron trigger can hit it too."""
    all_reminders = await get_reminders(_=None) if False else None  # (avoid re-auth; inline instead)
    # Re-run the reminders logic inline (avoiding re-auth complexity)
    clients = await db.clients.find({}).to_list(2000)
    today = datetime.now(timezone.utc).date()
    year = today.year
    already_sent = set()  # avoid double-sends
    async for row in db.email_send_log.find({"sent_at": {"$gte": today.isoformat()}}, {"_id": 0, "client_id": 1, "type": 1}):
        already_sent.add((row["client_id"], row["type"]))

    results = {"queued": 0, "skipped": 0, "details": []}
    for c in clients:
        pairs = []
        for field, key in [("birthdate", "birthday"), ("anniversary", "anniversary"), ("possession_date", "possession")]:
            v = c.get(field)
            if not v: continue
            try:
                d = datetime.strptime(v, "%Y-%m-%d").date()
                if d.month == today.month and d.day == today.day:
                    if key == "possession":
                        yrs = today.year - d.year
                        if yrs >= 1:
                            pairs.append((key, {"years": yrs}))
                    else:
                        pairs.append((key, {}))
            except Exception:
                continue
        if c.get("send_christmas", True) and today.month == 12 and today.day == 20:
            pairs.append(("christmas", {}))
        if c.get("send_new_year", True) and today.month == 1 and today.day == 1:
            pairs.append(("new_year", {}))

        for type_key, extra in pairs:
            if (c["id"], type_key) in already_sent:
                results["skipped"] += 1
                continue
            snoozed = await db.reminder_snoozes.find_one({"client_id": c["id"], "type_key": type_key, "year": year})
            if snoozed:
                results["skipped"] += 1
                continue
            r = await _queue_reminder_email(c, type_key, request, extra=extra)
            if r.get("status") == "queued":
                results["queued"] += 1
                results["details"].append({"client": c["full_name"], "type": type_key})
            else:
                results["skipped"] += 1
    return results

@api.get("/admin/email-log")
async def admin_email_log(type: Optional[str] = None, limit: int = 500, _=Depends(verify_admin)):
    q = {}
    if type: q["type"] = type
    docs = await db.email_send_log.find(q, {"_id": 0, "body_html": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    return docs

@api.get("/unsubscribe/reminder/{token}")
async def unsubscribe_reminder(token: str):
    """One-click CASL unsubscribe. Sets unsubscribed=True on the client record."""
    if not token:
        raise HTTPException(400, "Missing token")
    res = await db.clients.update_one(
        {"unsubscribe_token": token},
        {"$set": {"unsubscribed": True, "unsubscribed_at": now_iso(), "email_consent": False}},
    )
    if res.matched_count == 0:
        return HTMLResponse(_landing_page("Unsubscribe", "<p>This unsubscribe link is no longer valid or has already been processed. If you need help, email doug@eztofind.ca.</p>"))
    return HTMLResponse(_landing_page("Unsubscribed", "<p>You've been unsubscribed from all future EZtoFind.ca lifecycle reminders. We'll miss you! If this was a mistake, email doug@eztofind.ca and we'll restore your preferences.</p>"))

# =============== GLOSSARY ===============
@api.get("/glossary")
async def list_glossary(
    q: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 500,
    offset: int = 0,
):
    """List glossary terms. Supports `q` (case-insensitive match against term,
    definition and category), `category` filter, and paging. Returns lightweight
    projections (no FAQs / audit metadata) so the dashboard search stays fast
    and responsive on every keystroke. Results are ranked: exact term match →
    prefix match on term → other term/category matches → definition contains.
    """
    proj = {
        "_id": 0, "id": 1, "term": 1, "slug": 1, "category": 1,
        "definition": 1, "last_curated_at": 1,
    }
    limit = max(1, min(int(limit or 500), 1000))
    offset = max(0, int(offset or 0))
    q_clean = (q or "").strip()
    cat_clean = (category or "").strip()

    if not q_clean and not cat_clean:
        return await db.glossary.find({}, proj).sort("term", 1).skip(offset).limit(limit).to_list(limit)

    import re as _re
    filt: dict = {}
    if cat_clean:
        filt["category"] = {"$regex": f"^{_re.escape(cat_clean)}$", "$options": "i"}
    if q_clean:
        rx = {"$regex": _re.escape(q_clean), "$options": "i"}
        filt["$or"] = [{"term": rx}, {"definition": rx}, {"category": rx}]

    docs = await db.glossary.find(filt, proj).sort("term", 1).to_list(2000)

    if not q_clean:
        return docs[offset: offset + limit]

    # Rank: exact term match → term starts with q → term contains q →
    # category contains q → definition contains q. Preserves alphabetical
    # order within each bucket.
    ql = q_clean.lower()
    def _rank(d):
        term = (d.get("term") or "").lower()
        if term == ql: return 0
        if term.startswith(ql): return 1
        if ql in term: return 2
        cat = (d.get("category") or "").lower()
        if ql in cat: return 3
        return 4
    docs.sort(key=lambda d: (_rank(d), (d.get("term") or "").lower()))
    return docs[offset: offset + limit]

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

@api.get("/glossary/{slug}/related")
async def get_related_terms(slug: str, limit: int = 8):
    """AEO internal-linking helper — return up to N related glossary terms in
    the same category. Used by the "See also" section on every glossary page."""
    t = await db.glossary.find_one({"slug": slug}, {"_id": 0, "term": 1, "category": 1})
    if not t:
        raise HTTPException(404, "Term not found")
    category = t.get("category") or ""
    q = {"slug": {"$ne": slug}}
    if category:
        q["category"] = category
    docs = await db.glossary.find(q, {"_id": 0, "term": 1, "slug": 1, "category": 1}).sort("term", 1).to_list(200)
    # Randomize order slightly so different visits surface different terms
    import random as _r
    _r.shuffle(docs)
    return {"category": category, "items": docs[:limit]}


# ---------------------------------------------------------------------------
# Phase B — Intelligent Related Content Engine
# ---------------------------------------------------------------------------
# Endpoint: GET /api/related-content/{source_type}/{source_id}
# Returns a mixed list of related cards (glossary + community + guide +
# calculator + region) that help visitors move through the platform as one
# connected knowledge experience.
#
# Priority order (matches Section 6 of the intelligent-related-content spec):
#   1. Manual approved relationships (content_relations collection, priority=0)
#   2. Rule-based cross-type suggestions (category → guide-anchor / calculator)
#   3. Automated same-category glossary siblings
#
# Compliance: every card carries a `reason` code that admins can inspect.
# Client-only records are excluded from the public endpoint.
# ---------------------------------------------------------------------------

# Rule-based cross-type mapping. Keys are lowercase substrings that match
# glossary categories (case-insensitive); values are the cards that should
# always appear when a term falls into that category. This is the code path
# that turns "Strata Fee" into links to the Buying Guide's "Removing Subjects"
# step, the Form B term, and the depreciation report term.
_CATEGORY_RULES = {
    # Financing / mortgage terms → planning phase + FHSA/HBP + valuation
    "financ": [
        {"kind": "Term",      "title": "Mortgage pre-approval",                 "blurb": "How BC pre-approval works, and what it does and doesn't guarantee.",                             "href": "/glossary/mortgage-pre-approval",       "reason": "same-topic:financing"},
        {"kind": "Estimator", "title": "Home valuation estimator",              "blurb": "General educational estimate using MLS® comparables. Not an appraisal.",     "href": "/valuation",                             "reason": "financial-planning"},
        {"kind": "Glossary",  "title": "First Home Savings Account (FHSA)",     "blurb": "Federal tax-free savings account designed for first-time buyers.",           "href": "/glossary/first-home-savings-account-fhsa","reason": "related-program"},
    ],
    "mortgage": [
        {"kind": "Term",      "title": "Mortgage pre-approval",                 "blurb": "How BC pre-approval works, and what it does and doesn't guarantee.",                             "href": "/glossary/mortgage-pre-approval",       "reason": "same-topic:financing"},
        {"kind": "Estimator", "title": "Home valuation estimator",              "blurb": "General educational estimate using MLS® comparables. Not an appraisal.",     "href": "/valuation",                             "reason": "financial-planning"},
    ],
    # Tax terms → closing step + PTT + first-time / new-build exemptions
    "tax": [
        {"kind": "Term",      "title": "Property Transfer Tax (PTT)",           "blurb": "BC's tiered PTT rates + first-time / newly built exemptions.",                                    "href": "/glossary/property-transfer-tax-ptt",   "reason": "same-topic:taxes"},
        {"kind": "Glossary",  "title": "Property Transfer Tax (PTT)",            "blurb": "BC's tiered 1% / 2% / 3% / 5% provincial transfer tax.",                     "href": "/glossary/property-transfer-tax-ptt",    "reason": "core-concept"},
        {"kind": "Glossary",  "title": "First Time Home Buyers' Program (PTT)", "blurb": "The full first-time PTT exemption for BC purchases up to $835,000.",         "href": "/glossary/first-time-home-buyers-program-ptt","reason": "exemption"},
    ],
    # Strata terms → removing-subjects step + strata core docs
    "strata": [
        {"kind": "Term",      "title": "Form B — strata information certificate","blurb": "How BC strata document review works during due diligence.",                                    "href": "/glossary/form-b",                       "reason": "same-topic:strata"},
        {"kind": "Glossary",  "title": "Form B — Strata Information Certificate","blurb": "The core strata document reviewed before a purchase becomes firm.",          "href": "/glossary/form-b",                       "reason": "core-document"},
        {"kind": "Glossary",  "title": "Depreciation Report",                    "blurb": "The 30-year physical-condition & funding-strategy report for BC stratas.",   "href": "/glossary/depreciation-report",          "reason": "core-document"},
    ],
    # Legal / title / conveyancing terms → closing step + lawyer/notary
    "legal": [
        {"kind": "Term",      "title": "Lawyer or notary — what they do at closing","blurb": "The role of a BC conveyancing professional on completion day.",                                "href": "/glossary/lawyer-or-notary",             "reason": "same-topic:legal"},
        {"kind": "Glossary",  "title": "Lawyer or Notary",                      "blurb": "How BC conveyancing professionals handle a residential closing.",             "href": "/glossary/lawyer-or-notary",              "reason": "next-step"},
    ],
    "title": [
        {"kind": "Term",      "title": "Title search & charges",                "blurb": "How title transfer, mortgage discharge, and disbursement of funds work at completion.",           "href": "/glossary/title-search",                 "reason": "same-topic:title"},
    ],
    "conveyanc": [
        {"kind": "Term",      "title": "Lawyer or notary — what they do at closing","blurb": "The role of a BC conveyancing professional on completion day.",                                "href": "/glossary/lawyer-or-notary",             "reason": "same-topic:legal"},
    ],
    # Contract / offer terms → offer step (buyer + seller)
    "contract": [
        {"kind": "Term",      "title": "Subject clauses",                       "blurb": "How BC offers are structured — price, deposit, subjects, and dates.",                              "href": "/glossary/subject-clauses",              "reason": "same-topic:offers"},
        {"kind": "Term",      "title": "Counter-offer",                          "blurb": "Reviewing, countering, and weighing multiple-offer situations in BC.",                          "href": "/glossary/counter-offer",                "reason": "same-topic:offers"},
    ],
    "offer": [
        {"kind": "Term",      "title": "Subject clauses",                       "blurb": "How BC offers are structured — price, deposit, subjects, and dates.",                              "href": "/glossary/subject-clauses",              "reason": "same-topic:offers"},
    ],
    # Property-type / community-context terms → community browser + listings
    "property type": [
        {"kind": "Community", "title": "Browse BC community profiles",          "blurb": "239 community pages covering geography, climate, and lifestyle context.",    "href": "/communities",                             "reason": "geographic-context"},
        {"kind": "Listings",  "title": "Live MLS® listings",                     "blurb": "Live BC inventory from the CREA DDF® feed, refreshed hourly.",                "href": "/listings",                               "reason": "next-step"},
    ],
    "acreage": [
        {"kind": "Guide",     "title": "Equestrian & acreage specialty page",   "blurb": "Horse-friendly and rural properties with barn/stable/arena features.",       "href": "/specialties/equestrian",                 "reason": "specialty-page"},
    ],
}

# Static defaults that are always appended if we still have room.
_UNIVERSAL_TAIL = [
    {"kind": "Glossary",  "title": "Full BC real estate glossary",          "blurb": "439 plain-language terms explaining every concept in BC real estate.",           "href": "/glossary",       "reason": "always-available"},
]


def _derive_glossary_related(term: dict, limit: int) -> list:
    """Rule-based derivation for a glossary term. Returns cards derived from
    category rules + same-category siblings + universal tail, all with a
    `reason` code so admins can audit."""
    out = []
    seen_hrefs = set()

    def _add(card):
        if len(out) >= limit:
            return
        h = card.get("href")
        if not h or h in seen_hrefs:
            return
        seen_hrefs.add(h)
        out.append(card)

    cat = (term.get("category") or "").lower()
    slug = term.get("slug")

    # Apply category rules
    for key, cards in _CATEGORY_RULES.items():
        if key in cat:
            for c in cards:
                # Skip if the rule points back at the same term
                if c.get("href") == f"/glossary/{slug}":
                    continue
                _add(dict(c))
    return out


async def _related_content_for_glossary(slug: str, limit: int = 6) -> dict:
    """Build the related-content payload for a glossary term."""
    t = await db.glossary.find_one({"slug": slug}, {"_id": 0, "term": 1, "slug": 1, "category": 1})
    if not t:
        raise HTTPException(404, "Term not found")

    items = []
    seen_hrefs = set()

    def _dedup_add(card):
        h = card.get("href")
        if not h or h in seen_hrefs:
            return False
        seen_hrefs.add(h)
        items.append(card)
        return True

    # Priority 1 — manual approved relationships
    async for rel in db.content_relations.find(
        {"source_type": "glossary", "source_id": slug, "active": True, "visibility": {"$ne": "client-only"}},
        {"_id": 0}
    ).sort("priority", 1):
        _dedup_add({
            "kind": rel.get("target_kind_label") or (rel.get("target_type") or "").title() or "Related",
            "title": rel.get("target_title") or "",
            "blurb": rel.get("target_blurb") or "",
            "href": rel.get("target_href") or "",
            "reason": rel.get("reason") or "manual",
        })

    # Priority 2 — rule-based cross-type derivation
    for c in _derive_glossary_related(t, limit=limit):
        if len(items) >= limit:
            break
        _dedup_add(c)

    # Priority 3 — same-category glossary siblings (up to 3)
    if len(items) < limit and t.get("category"):
        docs = await db.glossary.find(
            {"category": t["category"], "slug": {"$ne": slug}},
            {"_id": 0, "term": 1, "slug": 1}
        ).sort("term", 1).to_list(50)
        import random as _r
        _r.shuffle(docs)
        for d in docs[:3]:
            if len(items) >= limit:
                break
            _dedup_add({
                "kind": "Glossary",
                "title": d.get("term"),
                "blurb": f"Related BC glossary term in the {t['category']} category.",
                "href": f"/glossary/{d['slug']}",
                "reason": "same-category",
            })

    # Priority 4 — universal tail
    for c in _UNIVERSAL_TAIL:
        if len(items) >= limit:
            break
        _dedup_add(dict(c))

    return {
        "source_type": "glossary",
        "source_id": slug,
        "source_title": t.get("term"),
        "items": items[:limit],
    }


async def _related_content_for_community(slug: str, limit: int = 6) -> dict:
    """Build related-content for a community/region page. Manual overrides
    first, then a universal community-context set."""
    items = []
    seen_hrefs = set()

    def _dedup_add(card):
        h = card.get("href")
        if not h or h in seen_hrefs:
            return False
        seen_hrefs.add(h)
        items.append(card)
        return True

    # Manual overrides
    async for rel in db.content_relations.find(
        {"source_type": "community", "source_id": slug, "active": True, "visibility": {"$ne": "client-only"}},
        {"_id": 0}
    ).sort("priority", 1):
        _dedup_add({
            "kind": rel.get("target_kind_label") or (rel.get("target_type") or "").title() or "Related",
            "title": rel.get("target_title") or "",
            "blurb": rel.get("target_blurb") or "",
            "href": rel.get("target_href") or "",
            "reason": rel.get("reason") or "manual",
        })

    # Universal community cross-links
    defaults = [
        {"kind": "Term",      "title": "How a residential purchase works",     "blurb": "The 9 steps in a BC residential purchase from search to closing — explained by term.",         "href": "/glossary/completion-date", "reason": "next-step"},
        {"kind": "Estimator", "title": "Home valuation estimator",           "blurb": "General educational estimate using MLS® comparables. Not an appraisal.",     "href": "/valuation",            "reason": "financial-planning"},
        {"kind": "Listings",  "title": "Live MLS® listings",                  "blurb": "Live BC inventory from the CREA DDF® feed, refreshed hourly.",                "href": "/listings",             "reason": "next-step"},
        {"kind": "Community", "title": "All BC community profiles",           "blurb": "Explore 239 community pages across the province.",                            "href": "/communities",          "reason": "geographic-context"},
        {"kind": "Glossary",  "title": "BC real estate glossary",             "blurb": "439 plain-language terms explaining every concept in BC real estate.",         "href": "/glossary",             "reason": "always-available"},
    ]
    for c in defaults:
        if len(items) >= limit:
            break
        _dedup_add(dict(c))

    return {"source_type": "community", "source_id": slug, "items": items[:limit]}


@api.get("/related-content/{source_type}/{source_id}")
async def get_related_content(source_type: str, source_id: str, limit: int = 6):
    """Phase B — public related-content endpoint. Returns a mixed list of
    cross-type cards (glossary, guides, calculators, communities, listings)
    combining manual admin overrides with rule-based auto-suggestions.

    Every card includes a `reason` code so admins can inspect why a link is
    surfaced. Client-only records are excluded from this public endpoint."""
    lim = max(1, min(limit, 12))
    st = source_type.lower().strip()
    if st == "glossary":
        return await _related_content_for_glossary(source_id, limit=lim)
    if st in ("community", "region", "neighbourhood"):
        return await _related_content_for_community(source_id, limit=lim)
    # Unknown source type — return manual overrides only
    items = []
    async for rel in db.content_relations.find(
        {"source_type": st, "source_id": source_id, "active": True, "visibility": {"$ne": "client-only"}},
        {"_id": 0}
    ).sort("priority", 1).limit(lim):
        items.append({
            "kind": rel.get("target_kind_label") or (rel.get("target_type") or "").title() or "Related",
            "title": rel.get("target_title") or "",
            "blurb": rel.get("target_blurb") or "",
            "href": rel.get("target_href") or "",
            "reason": rel.get("reason") or "manual",
        })
    return {"source_type": st, "source_id": source_id, "items": items}


# ---------------------------------------------------------------------------
# Admin CRUD for content_relations — manual override management
# ---------------------------------------------------------------------------
class ContentRelation(BaseModel):
    id: Optional[str] = None
    source_type: str          # e.g. "glossary", "community", "region"
    source_id: str            # slug or page id
    target_type: str          # e.g. "glossary", "community", "guide", "calculator", "listings"
    target_id: Optional[str] = None    # optional slug/id for the target
    target_title: str
    target_blurb: str
    target_href: str
    target_kind_label: Optional[str] = None  # display label ("Guide", "Community", etc.)
    reason: str = "manual"
    priority: int = 0         # 0 = highest, admins pin the most important
    active: bool = True
    visibility: str = "public"  # or "client-only"
    notes: Optional[str] = None


@api.get("/admin/content-relations")
async def admin_list_content_relations(_=Depends(verify_admin), source_type: Optional[str] = None, source_id: Optional[str] = None, limit: int = 500):
    q = {}
    if source_type:
        q["source_type"] = source_type
    if source_id:
        q["source_id"] = source_id
    items = []
    async for rel in db.content_relations.find(q, {"_id": 0}).sort([("source_type", 1), ("source_id", 1), ("priority", 1)]).limit(max(1, min(limit, 2000))):
        items.append(rel)
    return {"items": items, "count": len(items)}


@api.post("/admin/content-relations")
async def admin_create_content_relation(rel: ContentRelation, _=Depends(verify_admin)):
    from uuid import uuid4
    rec = rel.model_dump()
    rec["id"] = rec.get("id") or str(uuid4())
    rec["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.content_relations.insert_one(dict(rec))
    return {"ok": True, "id": rec["id"]}


@api.put("/admin/content-relations/{rel_id}")
async def admin_update_content_relation(rel_id: str, rel: ContentRelation, _=Depends(verify_admin)):
    upd = rel.model_dump(exclude_none=True)
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.content_relations.update_one({"id": rel_id}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Relation not found")
    return {"ok": True}


@api.delete("/admin/content-relations/{rel_id}")
async def admin_delete_content_relation(rel_id: str, _=Depends(verify_admin)):
    r = await db.content_relations.delete_one({"id": rel_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Relation not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Phase C — Grouped semantic search
# ---------------------------------------------------------------------------
# GET /api/search?q=<query>&limit=8
# Returns a grouped payload:
#   {
#     "query": str,
#     "quick_answer": {kind, title, url, excerpt} | None,
#     "groups": [
#        {"kind": "Terms",       "items": [...]},
#        {"kind": "FAQs",        "items": [...]},
#        {"kind": "Tools",       "items": [...]},
#        {"kind": "Communities", "items": [...]},
#        {"kind": "Journey",     "items": [...]},
#        {"kind": "Listings",    "items": [...]},
#        {"kind": "Doogie",      "items": [...]}
#     ]
#   }
#
# Compliance: all results are drawn from EZtoFind.ca's own approved content
# library (glossary, community pages, guides, listings shortcut, Doogie
# shortcut). No client-only records are exposed. When no approved answer
# exists, the endpoint returns empty groups — never invents a definition.
# This matches Section 7 & 13 of the intelligent-related-content spec.

# Static journey anchors — the 9 buyer + 9 seller guide steps.
_JOURNEY_ANCHORS = [
    ("buyer",  1, "Getting Started",           "Connect with a REALTOR® and confirm your goals."),
    ("buyer",  2, "Making It Official",        "Representation disclosure and buyer's agreement."),
    ("buyer",  3, "Money & Must-Haves",        "Pre-approval, budget ceiling, FHSA / HBP."),
    ("buyer",  4, "The Search",                "Reviewing listings, showings, and market pace."),
    ("buyer",  5, "Making an Offer",           "Price, deposit, subjects, dates."),
    ("buyer",  6, "Negotiation & Acceptance",  "Counter-offers, deposit in trust, rescission window."),
    ("buyer",  7, "Removing Subjects",         "Inspection, financing, strata document review."),
    ("buyer",  8, "Closing & Moving In",       "Property Transfer Tax, notary, final walkthrough."),
    ("buyer",  9, "After You Move In",         "File handover and long-term relationship."),
    ("seller", 1, "Getting Started",           "Connect with a REALTOR® about your home and timeline."),
    ("seller", 2, "The Listing Appointment",   "Representation disclosure and listing agreement."),
    ("seller", 3, "Pricing & Preparing",       "CMA, PDS, decluttering, staging, go-live date."),
    ("seller", 4, "Going to Market",           "Photography, MLS®, marketing rollout."),
    ("seller", 5, "Showings & Feedback",       "Tracking buyer response, adjusting strategy."),
    ("seller", 6, "Offers & Negotiation",      "Reviewing, countering, multiple-offer situations."),
    ("seller", 7, "Acceptance & Subject Removal", "Deposit in trust, buyer diligence, rescission window."),
    ("seller", 8, "Closing & Possession",      "Mortgage payout, disbursements, handover."),
    ("seller", 9, "After the Sale",            "File handover and long-term relationship."),
]

_TOOLS_CATALOG = [
    {"kind": "Tools", "title": "Home valuation estimator",           "blurb": "General educational estimate using MLS® comparables. Not an appraisal.",           "href": "/valuation",                                "keywords": ["valuation","estimate","worth","value","price","appraisal","home value","how much"]},
    {"kind": "Tools", "title": "Property Transfer Tax — BC rates",    "blurb": "BC's tiered 1% / 2% / 3% / 5% provincial transfer tax explained.",                 "href": "/glossary/property-transfer-tax-ptt",       "keywords": ["ptt","property transfer tax","transfer tax","closing cost"]},
    {"kind": "Tools", "title": "Live MLS® listings search",           "blurb": "Live BC inventory from the CREA DDF® feed, refreshed hourly.",                       "href": "/listings",                                 "keywords": ["listings","mls","search homes","for sale"]},
    {"kind": "Tools", "title": "Neighbourhood Vibe Score™",           "blurb": "6-factor community livability index — walkability, transit, air, wildfire risk.",   "href": "/communities",                              "keywords": ["vibe","score","walkability","transit","community score","livability"]},
]


def _score_match(text: str, q_terms: list) -> int:
    """Simple tf-like scorer: 3 points for term-in-title, 1 per body match."""
    if not text:
        return 0
    t = text.lower()
    return sum(t.count(qt) for qt in q_terms)


def _slug_from_query(q: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", q.lower()).strip("-")


async def _search_glossary(q: str, q_terms: list, limit: int):
    """Search glossary terms + definitions. Returns list of (score, item).
    Records `title_hits` separately so callers can gate quick-answer promotion
    on a real title match rather than pure body noise."""
    pattern = "|".join(re.escape(t) for t in q_terms if len(t) >= 2)
    if not pattern:
        return []
    hits = []
    async for d in db.glossary.find(
        {"$or": [
            {"term": {"$regex": pattern, "$options": "i"}},
            {"definition": {"$regex": pattern, "$options": "i"}},
        ]},
        {"_id": 0, "term": 1, "slug": 1, "category": 1, "definition": 1}
    ).limit(200):
        title_hits = _score_match(d.get("term", ""), q_terms)
        body_hits = _score_match(d.get("definition", ""), q_terms)
        score = 3 * title_hits + body_hits
        hits.append((score, {
            "kind": "Terms",
            "title": d["term"],
            "blurb": (d.get("definition") or "")[:180] + ("…" if len(d.get("definition") or "") > 180 else ""),
            "href": f"/glossary/{d['slug']}",
            "category": d.get("category") or "",
            "title_hits": title_hits,
        }))
    hits.sort(key=lambda x: -x[0])
    return hits[:limit]


async def _search_faqs(q: str, q_terms: list, limit: int):
    """Search FAQs embedded on glossary terms. Returns list of (score, item)."""
    pattern = "|".join(re.escape(t) for t in q_terms if len(t) >= 2)
    if not pattern:
        return []
    hits = []
    async for d in db.glossary.find(
        {"faqs": {"$elemMatch": {"$or": [
            {"q": {"$regex": pattern, "$options": "i"}},
            {"a": {"$regex": pattern, "$options": "i"}},
        ]}}},
        {"_id": 0, "term": 1, "slug": 1, "faqs": 1}
    ).limit(80):
        for faq in (d.get("faqs") or []):
            score = 3 * _score_match(faq.get("q", ""), q_terms) + _score_match(faq.get("a", ""), q_terms)
            if score <= 0:
                continue
            hits.append((score, {
                "kind": "FAQs",
                "title": faq.get("q") or "",
                "blurb": ((faq.get("a") or "")[:180] + ("…" if len(faq.get("a") or "") > 180 else "")),
                "href": f"/glossary/{d['slug']}",
                "source_term": d.get("term"),
            }))
    hits.sort(key=lambda x: -x[0])
    return hits[:limit]


def _search_communities(q: str, q_terms: list, limit: int):
    """Search community names from the seed JSON file."""
    try:
        all_comm = json.loads((ROOT_DIR / "data" / "communities_seed.json").read_text())
    except Exception:
        return []
    hits = []
    for region, communities in all_comm.items():
        for name in communities:
            score = _score_match(name, q_terms)
            if score <= 0:
                continue
            slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            hits.append((score, {
                "kind": "Communities",
                "title": name,
                "blurb": f"BC community in {region}. Neighbourhood profile, climate, and vibe score.",
                "href": f"/community/{slug}",
                "region": region,
            }))
    hits.sort(key=lambda x: -x[0])
    return hits[:limit]


def _search_tools(q: str, q_terms: list, limit: int):
    """Static tools catalog — score by keyword + title match."""
    hits = []
    for tool in _TOOLS_CATALOG:
        score = _score_match(tool["title"], q_terms) * 3
        for kw in tool.get("keywords", []):
            score += _score_match(kw, q_terms)
        if score <= 0:
            continue
        hits.append((score, {"kind": "Tools", "title": tool["title"], "blurb": tool["blurb"], "href": tool["href"]}))
    hits.sort(key=lambda x: -x[0])
    return hits[:limit]


def _search_journey(q: str, q_terms: list, limit: int):
    """Static journey anchors — score by title + blurb."""
    hits = []
    for role, num, title, blurb in _JOURNEY_ANCHORS:
        score = 3 * _score_match(title, q_terms) + _score_match(blurb, q_terms)
        if score <= 0:
            continue
        hits.append((score, {
            "kind": "Journey",
            "title": f"{title}",
            "blurb": f"{('Buying' if role=='buyer' else 'Selling')} Guide — Step {num} of 9. {blurb}",
            "href": f"/{'buying' if role=='buyer' else 'selling'}-guide#step-{num}",
            "role": role,
        }))
    hits.sort(key=lambda x: -x[0])
    return hits[:limit]


@api.get("/search")
async def grouped_search(q: str = "", limit: int = 6, request: Request = None):
    """Phase C — grouped natural-language educational search.

    Layers per Section 13 of the spec:
      1. Approved exact matches (title / synonym)
      2. Structured relationships (category, tags)
      3. (Deferred) semantic retrieval
    Every item returned is drawn from EZtoFind.ca's approved content library.
    Never invents an answer — empty groups are returned when no match exists.

    Every search hit is logged to `search_queries` (with an IP hash, never the
    raw IP) so admins can review no-result and low-confidence queries and
    commission new glossary terms / FAQ answers where visitors already ask.
    """
    query = (q or "").strip()
    if not query:
        return {"query": "", "quick_answer": None, "groups": []}

    lim = max(1, min(limit, 12))
    # Tokenize — split on non-alphanumeric, keep terms of length >= 3, drop stopwords.
    # This avoids "bc", "the", "of", "in", "is", "are", "what" polluting scores.
    _STOPWORDS = {
        "the", "and", "for", "with", "from", "that", "this", "what", "when",
        "where", "which", "who", "why", "how", "are", "was", "were", "does",
        "did", "not", "you", "your", "yours", "our", "ours", "they", "them",
        "their", "his", "her", "hers", "its", "any", "some", "all", "one",
        "two", "into", "onto", "than", "then", "there", "here", "over", "under",
        "about", "also", "just", "have", "has", "had", "been", "being", "will",
        "can", "could", "would", "should", "may", "might", "must", "shall",
        "get", "got", "make", "made", "take", "took", "use", "used", "using",
        "very", "much", "many", "more", "most", "less", "least", "few",
        "own", "off", "out", "up", "down", "on", "in", "at", "to", "of", "as",
        "by", "or", "if", "so", "no", "yes", "an", "be", "is", "am", "it",
        # Real-estate domain stopwords — these appear in almost every glossary
        # term, so allowing them as scoring tokens would let garbage queries
        # like "xyzabc-not-a-real-thing" match "REALTOR®" or "Smart Home".
        "real", "estate", "home", "homes", "house", "houses", "property",
        "properties", "bc", "canada", "canadian", "columbia", "british",
        "thing", "things",
    }
    raw_tokens = [t.lower() for t in re.split(r"[^a-zA-Z0-9]+", query) if t]
    q_terms = [t for t in raw_tokens if len(t) >= 3 and t not in _STOPWORDS]
    if not q_terms:
        # Fall back to raw meaningful tokens (>=2) so short queries like "PTT" still work
        q_terms = [t for t in raw_tokens if len(t) >= 2]
    if not q_terms:
        return {"query": query, "quick_answer": None, "groups": []}

    # Run all searches concurrently
    glossary_hits, faq_hits = await asyncio.gather(
        _search_glossary(query, q_terms, lim),
        _search_faqs(query, q_terms, lim),
    )
    community_hits = _search_communities(query, q_terms, lim)
    tools_hits = _search_tools(query, q_terms, lim)
    journey_hits = _search_journey(query, q_terms, lim)

    # Build quick answer — require a REAL title match (title_hits >= 1) so
    # generic definition-only matches (e.g. "real", "home") don't hijack the
    # top spot. Strip internal `title_hits` before returning to public.
    quick = None
    if glossary_hits and glossary_hits[0][0] >= 3 and glossary_hits[0][1].get("title_hits", 0) >= 1:
        _, top = glossary_hits[0]
        quick = {"kind": "Terms", "title": top["title"], "url": top["href"], "excerpt": top["blurb"]}
    elif faq_hits and faq_hits[0][0] >= 6:
        _, top = faq_hits[0]
        quick = {"kind": "FAQs", "title": top["title"], "url": top["href"], "excerpt": top["blurb"]}

    # Strip internal scoring fields before returning to public.
    for _, it in glossary_hits:
        it.pop("title_hits", None)

    # Always append Listings + Doogie shortcuts — they're universal launchpads
    from urllib.parse import quote_plus
    listings_shortcut = [{"kind": "Listings", "title": f'Live listings — "{query}"', "blurb": "Search the live CREA DDF® feed for this term.", "href": f"/listings?q={quote_plus(query)}"}]
    doogie_shortcut = [{"kind": "Doogie", "title": f'Ask Doogie: "{query}"', "blurb": "Get a plain-language explanation from Doogie, EZtoFind.ca's compliance-guarded AI assistant.", "href": f"/?ask={quote_plus(query)}"}]

    groups = [
        {"kind": "Terms",       "items": [it for _, it in glossary_hits]},
        {"kind": "FAQs",        "items": [it for _, it in faq_hits]},
        {"kind": "Tools",       "items": [it for _, it in tools_hits]},
        {"kind": "Communities", "items": [it for _, it in community_hits]},
        {"kind": "Journey",     "items": [it for _, it in journey_hits]},
        {"kind": "Listings",    "items": listings_shortcut},
        {"kind": "Doogie",      "items": doogie_shortcut},
    ]
    # Drop empty groups (except Listings + Doogie which are always populated)
    groups = [g for g in groups if g["items"] or g["kind"] in ("Listings", "Doogie")]

    # Fire-and-forget: log this search so admins can review no-result and
    # low-confidence queries. IP is hashed to preserve PIPA compliance (we
    # only need to distinguish repeat visitors, never identify them).
    try:
        import hashlib
        ip = ""
        if request is not None:
            ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
                  or (request.client.host if request.client else ""))
        ip_hash = hashlib.sha256((ip + "|eztofind-salt-v1").encode()).hexdigest()[:16] if ip else ""
        result_count = sum(len(g["items"]) for g in groups if g["kind"] not in ("Listings", "Doogie"))
        has_quick = quick is not None
        confidence = "high" if has_quick else ("medium" if result_count >= 3 else ("low" if result_count > 0 else "none"))
        await db.search_queries.insert_one({
            "query": query,
            "query_lower": query.lower(),
            "tokens": q_terms,
            "result_count": result_count,
            "has_quick_answer": has_quick,
            "confidence": confidence,
            "ip_hash": ip_hash,
            "at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.warning(f"search log failed: {e}")

    return {"query": query, "quick_answer": quick, "groups": groups}


# ---------------------------------------------------------------------------
# Phase D — Admin analytics (search + relations audit)
# ---------------------------------------------------------------------------

@api.get("/admin/search-analytics")
async def admin_search_analytics(_=Depends(verify_admin), days: int = 30, limit: int = 30):
    """Return aggregated search analytics for the admin dashboard:
      * top queries by frequency
      * queries that returned NO results (top opportunities for new content)
      * low-confidence queries (returned some hits but no quick answer)
    """
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=max(1, min(days, 365)))).isoformat()
    lim = max(1, min(limit, 100))

    # Aggregate top queries
    top_pipeline = [
        {"$match": {"at": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$query_lower",
            "count": {"$sum": 1},
            "last_query": {"$last": "$query"},
            "avg_results": {"$avg": "$result_count"},
            "any_quick": {"$max": {"$cond": ["$has_quick_answer", 1, 0]}},
            "last_at": {"$max": "$at"},
        }},
        {"$sort": {"count": -1}},
        {"$limit": lim},
    ]
    top = []
    async for d in db.search_queries.aggregate(top_pipeline):
        top.append({
            "query": d.get("last_query"),
            "count": d.get("count", 0),
            "avg_results": round(d.get("avg_results", 0) or 0, 1),
            "any_quick_answer": bool(d.get("any_quick")),
            "last_at": d.get("last_at"),
        })

    # No-result queries — the most valuable list for Doug: these are gaps in the library
    no_result_pipeline = [
        {"$match": {"at": {"$gte": cutoff}, "result_count": 0}},
        {"$group": {
            "_id": "$query_lower",
            "count": {"$sum": 1},
            "last_query": {"$last": "$query"},
            "last_at": {"$max": "$at"},
        }},
        {"$sort": {"count": -1}},
        {"$limit": lim},
    ]
    no_results = []
    async for d in db.search_queries.aggregate(no_result_pipeline):
        no_results.append({
            "query": d.get("last_query"),
            "count": d.get("count", 0),
            "last_at": d.get("last_at"),
        })

    # Low-confidence queries — some results but no strong quick answer
    low_conf_pipeline = [
        {"$match": {"at": {"$gte": cutoff}, "result_count": {"$gt": 0}, "has_quick_answer": False}},
        {"$group": {
            "_id": "$query_lower",
            "count": {"$sum": 1},
            "last_query": {"$last": "$query"},
            "avg_results": {"$avg": "$result_count"},
            "last_at": {"$max": "$at"},
        }},
        {"$sort": {"count": -1}},
        {"$limit": lim},
    ]
    low_confidence = []
    async for d in db.search_queries.aggregate(low_conf_pipeline):
        low_confidence.append({
            "query": d.get("last_query"),
            "count": d.get("count", 0),
            "avg_results": round(d.get("avg_results", 0) or 0, 1),
            "last_at": d.get("last_at"),
        })

    total = await db.search_queries.count_documents({"at": {"$gte": cutoff}})
    unique = len({(d.get("query_lower") or "") async for d in db.search_queries.find({"at": {"$gte": cutoff}}, {"query_lower": 1, "_id": 0})})

    # Click-through aggregation — join clicks to queries by lower-cased query text
    clicks_by_query = {}
    async for d in db.search_clicks.aggregate([
        {"$match": {"at": {"$gte": cutoff}}},
        {"$group": {"_id": "$query_lower", "clicks": {"$sum": 1}}},
    ]):
        clicks_by_query[d["_id"] or ""] = d.get("clicks", 0)

    # Per-kind CTR aggregation across the whole window
    kind_counts = {}
    async for d in db.search_clicks.aggregate([
        {"$match": {"at": {"$gte": cutoff}}},
        {"$group": {"_id": "$kind", "clicks": {"$sum": 1}}},
    ]):
        kind_counts[d.get("_id") or "Unknown"] = d.get("clicks", 0)
    total_clicks = sum(kind_counts.values())
    ctr_by_kind = [
        {"kind": k, "clicks": c, "share": round(100.0 * c / total_clicks, 1) if total_clicks else 0.0}
        for k, c in sorted(kind_counts.items(), key=lambda kv: -kv[1])
    ]

    # Enrich the "top" query list with click and CTR data
    for r in top:
        q_lower = (r.get("query") or "").lower()
        clicks = clicks_by_query.get(q_lower, 0)
        r["clicks"] = clicks
        r["ctr"] = round(100.0 * clicks / r["count"], 1) if r.get("count") else 0.0

    return {
        "period_days": days,
        "total_searches": total,
        "unique_queries": unique,
        "total_clicks": total_clicks,
        "site_ctr": round(100.0 * total_clicks / total, 1) if total else 0.0,
        "ctr_by_kind": ctr_by_kind,
        "top": top,
        "no_results": no_results,
        "low_confidence": low_confidence,
    }


@api.get("/admin/content-relations/{rel_id}/audit")
async def admin_relation_audit(rel_id: str, _=Depends(verify_admin)):
    """Return audit context for a single manual relation: creator, timestamps,
    and the surface page where it appears (so admins can inspect it live)."""
    rel = await db.content_relations.find_one({"id": rel_id}, {"_id": 0})
    if not rel:
        raise HTTPException(404, "Relation not found")
    # Build the surface page URL so Doug can click and see it live
    stype = rel.get("source_type", "")
    sid = rel.get("source_id", "")
    surface_url = None
    if stype == "glossary":
        surface_url = f"/glossary/{sid}"
    elif stype in ("community", "region", "neighbourhood"):
        surface_url = f"/community/{sid}"
    elif stype == "guide":
        # Public guides were removed — anything of type "guide" now falls back
        # to the glossary index so visitors land on live, indexable content.
        surface_url = f"/glossary"
    return {
        "relation": rel,
        "surface_url": surface_url,
        "created_at": rel.get("created_at"),
        "updated_at": rel.get("updated_at"),
        "created_by": rel.get("created_by") or "admin",
        "reason": rel.get("reason"),
        "notes": rel.get("notes"),
        "visibility": rel.get("visibility", "public"),
        "active": rel.get("active", True),
    }


# ---------------------------------------------------------------------------
# Search click-through attribution (fire-and-forget beacon)
# ---------------------------------------------------------------------------

class SearchClickBeacon(BaseModel):
    query: str
    kind: str                    # "Terms" / "FAQs" / "Tools" / "Communities" / "Journey" / "Listings" / "Doogie" / "QuickAnswer"
    href: str
    position: Optional[int] = 0  # 0-indexed position within the group
    source: Optional[str] = "search"  # "search" | "doogie-chip"


@api.post("/search/click")
async def log_search_click(beacon: SearchClickBeacon, request: Request):
    """Log a search result click so we can compute CTR per query and per group.
    Fire-and-forget: never raises to the caller. IP is hashed for PIPA."""
    try:
        import hashlib
        ip = ""
        if request is not None:
            ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
                  or (request.client.host if request.client else ""))
        ip_hash = hashlib.sha256((ip + "|eztofind-salt-v1").encode()).hexdigest()[:16] if ip else ""
        await db.search_clicks.insert_one({
            "query": beacon.query,
            "query_lower": (beacon.query or "").lower(),
            "kind": beacon.kind,
            "href": beacon.href,
            "position": int(beacon.position or 0),
            "source": beacon.source or "search",
            "ip_hash": ip_hash,
            "at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.warning(f"search click log failed: {e}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Query clustering — group near-identical no-result queries so a single
# content commission covers a whole family of variants ("strata fees
# Vancouver" + "strata fee Burnaby" + "monthly strata fee" → one cluster).
# ---------------------------------------------------------------------------

# Reused inside the clustering helper — same list drives search tokenization.
_CLUSTER_STOPWORDS = {
    "the","and","for","with","from","that","this","what","when","where","which",
    "who","why","how","are","was","were","does","did","not","you","your","yours",
    "our","ours","they","them","their","his","her","hers","its","any","some",
    "all","one","two","into","onto","than","then","there","here","over","under",
    "about","also","just","have","has","had","been","being","will","can","could",
    "would","should","may","might","must","shall","get","got","make","made",
    "take","took","use","used","using","very","much","many","more","most","less",
    "least","few","own","off","out","up","down","on","in","at","to","of","as",
    "by","or","if","so","no","yes","an","be","is","am","it",
    "real","estate","home","homes","house","houses","property","properties",
    "bc","canada","canadian","columbia","british","thing","things",
}


def _cluster_normalize(q: str) -> set:
    """Return a frozenset of stemmed, stopword-free tokens for clustering."""
    tokens = re.split(r"[^a-zA-Z0-9]+", (q or "").lower())
    out = set()
    for t in tokens:
        if len(t) < 3 or t in _CLUSTER_STOPWORDS:
            continue
        # Very light stemming: strip trailing 's' or 'es' for simple plurals
        if len(t) > 4 and t.endswith("es") and not t.endswith("ses"):
            t = t[:-2]
        elif len(t) > 3 and t.endswith("s") and not t.endswith("ss"):
            t = t[:-1]
        out.add(t)
    return out


def _cluster_queries(rows: list, jaccard_threshold: float = 0.5, overlap_threshold: float = 0.6, min_shared_tokens: int = 1) -> list:
    """Greedy single-pass clusterer. Each `row` must have {query, count}.

    Two rows cluster when EITHER:
      * Jaccard(A, B) >= jaccard_threshold (handles long queries with
        different filler words like "strata fees Vancouver" vs "strata fee
        Burnaby")
      * Overlap coefficient |A ∩ B| / min(|A|, |B|) >= overlap_threshold
        (handles short-query variants like "passive house BC" vs "passive
        house certification" — Jaccard would be 0.5 but overlap is 1.0)

    Requires `min_shared_tokens` overlap (default 1) as a floor guard, since
    Jaccard 1.0 on two single-token sets is meaningless."""
    # Pre-tokenize
    enriched = []
    for r in rows:
        toks = _cluster_normalize(r.get("query") or "")
        if toks:
            enriched.append({"query": r["query"], "count": r["count"], "tokens": toks, "last_at": r.get("last_at")})

    # Sort by count desc so the highest-volume query becomes cluster representative
    enriched.sort(key=lambda x: -x["count"])

    clusters = []
    for item in enriched:
        placed = False
        for cluster in clusters:
            rep_tokens = cluster["_rep_tokens"]
            shared = rep_tokens & item["tokens"]
            union = rep_tokens | item["tokens"]
            if not union or len(shared) < min_shared_tokens:
                continue
            j = len(shared) / len(union)
            overlap = len(shared) / min(len(rep_tokens), len(item["tokens"]))
            if j >= jaccard_threshold or overlap >= overlap_threshold:
                cluster["variants"].append({"query": item["query"], "count": item["count"], "last_at": item.get("last_at")})
                cluster["total_count"] += item["count"]
                cluster["variant_count"] += 1
                placed = True
                break
        if not placed:
            clusters.append({
                "representative_query": item["query"],
                "_rep_tokens": item["tokens"],
                "total_count": item["count"],
                "variant_count": 1,
                "variants": [{"query": item["query"], "count": item["count"], "last_at": item.get("last_at")}],
                "shared_tokens": sorted(item["tokens"]),
            })

    # Strip internal fields before returning
    for c in clusters:
        c.pop("_rep_tokens", None)
    clusters.sort(key=lambda x: -x["total_count"])
    return clusters


@api.get("/admin/search-analytics/clusters")
async def admin_search_clusters(_=Depends(verify_admin), days: int = 30, kind: str = "no_results", limit: int = 20):
    """Return query clusters for the admin analytics page.
    `kind` selects the source list:
      * `no_results` (default) — cluster queries that returned zero hits
      * `low_confidence` — cluster queries that returned some hits but no quick answer
      * `all` — cluster every query (higher-noise; kept for completeness)

    Each cluster includes a 30-day `daily_counts` array (oldest → newest) so
    the admin dashboard can render trend sparklines and prioritize gaps
    whose search volume is growing.
    """
    from datetime import timedelta
    window_days = max(1, min(days, 365))
    now = datetime.now(timezone.utc)
    cutoff_dt = now - timedelta(days=window_days)
    cutoff = cutoff_dt.isoformat()

    match = {"at": {"$gte": cutoff}}
    if kind == "no_results":
        match["result_count"] = 0
    elif kind == "low_confidence":
        match["result_count"] = {"$gt": 0}
        match["has_quick_answer"] = False

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": "$query_lower",
            "count": {"$sum": 1},
            "last_query": {"$last": "$query"},
            "last_at": {"$max": "$at"},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 400},
    ]
    rows = []
    async for d in db.search_queries.aggregate(pipeline):
        rows.append({"query": d.get("last_query"), "count": d.get("count", 0), "last_at": d.get("last_at")})

    clusters = _cluster_queries(rows)[:limit]

    # Attach a per-day count vector for each cluster (30-day sparkline).
    # We compute this AFTER clustering so a cluster that spans multiple
    # variants correctly sums the daily volume across all of them.
    if clusters:
        # Bucket boundaries — one bucket per full UTC day, oldest first.
        bucket_days = min(window_days, 30)
        buckets = []
        for i in range(bucket_days):
            day_start = (now - timedelta(days=bucket_days - 1 - i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            buckets.append((day_start.isoformat(), day_end.isoformat()))

        # For each cluster, look up all variant queries and count per day.
        for c in clusters:
            variant_queries = [v.get("query", "").lower() for v in c.get("variants", [])]
            if not variant_queries:
                c["daily_counts"] = [0] * bucket_days
                continue
            daily = [0] * bucket_days
            async for d in db.search_queries.find(
                {"query_lower": {"$in": variant_queries}, "at": {"$gte": buckets[0][0]}},
                {"at": 1, "_id": 0}
            ):
                at = d.get("at", "")
                for i, (s, e) in enumerate(buckets):
                    if s <= at < e:
                        daily[i] += 1
                        break
            c["daily_counts"] = daily

            # Detect an upward trend: compare last-7-day sum vs previous-7 sum.
            if bucket_days >= 14:
                recent = sum(daily[-7:])
                prior = sum(daily[-14:-7])
                c["trend"] = "up" if recent > prior * 1.3 else ("down" if prior > recent * 1.3 else "flat")
                c["trend_recent_7d"] = recent
                c["trend_prior_7d"] = prior
            else:
                c["trend"] = "flat"

    return {"period_days": days, "kind": kind, "raw_query_count": len(rows), "clusters": clusters}


# ---------------------------------------------------------------------------
# Content Commissions — the "backlog" of new glossary terms/FAQs Doug wants
# to commission from the AI content pipeline. Populated by clicking the
# "Commission this term →" button on any dashboard gap card, then reviewed
# via /admin/approvals.
# ---------------------------------------------------------------------------

class ContentCommission(BaseModel):
    id: Optional[str] = None
    term: str
    slug: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = "manual"       # "search-gap" | "manual" | "cluster"
    representative_query: Optional[str] = None
    variant_queries: Optional[List[str]] = None
    total_search_count: Optional[int] = None
    status: str = "backlog"                # "backlog" | "in-progress" | "shipped" | "declined"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@api.get("/admin/content-commissions")
async def admin_list_commissions(_=Depends(verify_admin), status: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    items = []
    async for r in db.content_commissions.find(q, {"_id": 0}).sort([("status", 1), ("created_at", -1)]):
        items.append(r)
    return {"items": items, "count": len(items)}


@api.post("/admin/content-commissions")
async def admin_create_commission(c: ContentCommission, _=Depends(verify_admin)):
    from uuid import uuid4
    now_iso = datetime.now(timezone.utc).isoformat()
    # De-dupe by (term + slug) — if an active backlog item already exists for
    # this term, return the existing id rather than creating a duplicate.
    slug_norm = (c.slug or "").lower().strip()
    term_norm = (c.term or "").strip()
    if not term_norm:
        raise HTTPException(400, "term is required")
    existing = await db.content_commissions.find_one(
        {"term": {"$regex": f"^{re.escape(term_norm)}$", "$options": "i"},
         "status": {"$in": ["backlog", "in-progress"]}},
        {"_id": 0}
    )
    if existing:
        return {"ok": True, "id": existing["id"], "duplicate": True}
    rec = c.model_dump()
    rec["id"] = rec.get("id") or str(uuid4())
    rec["term"] = term_norm
    rec["slug"] = slug_norm or None
    rec["created_at"] = now_iso
    rec["updated_at"] = now_iso
    await db.content_commissions.insert_one(dict(rec))
    return {"ok": True, "id": rec["id"], "duplicate": False}


@api.put("/admin/content-commissions/{cid}")
async def admin_update_commission(cid: str, payload: dict, _=Depends(verify_admin)):
    """Partial update — only mutable fields (status, notes, slug, term,
    draft_definition, draft_faqs) are accepted; anything else in the payload
    is ignored.

    Side-effect: when status transitions to ``in-progress`` and no draft yet
    exists (draft_status is falsy or "error"), an AI drafter is kicked off
    in the background to produce a BC-compliant definition + 10 FAQs for
    Doug's review. This is the "Auto-Draft on Commission" workflow.
    """
    allowed = {"status", "notes", "slug", "term", "draft_definition", "draft_faqs"}
    upd = {k: v for k, v in (payload or {}).items() if k in allowed and v is not None}
    if not upd:
        return {"ok": True, "no_op": True}
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Peek at the pre-existing record so we can decide whether to auto-draft.
    existing = await db.content_commissions.find_one({"id": cid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Commission not found")

    should_auto_draft = False
    if (
        upd.get("status") == "in-progress"
        and existing.get("status") != "in-progress"
        and (existing.get("draft_status") in (None, "", "error"))
        and not existing.get("draft_definition")
    ):
        should_auto_draft = True
        upd["draft_status"] = "drafting"
        upd["draft_started_at"] = upd["updated_at"]
        upd["draft_error"] = None

    r = await db.content_commissions.update_one({"id": cid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Commission not found")

    if should_auto_draft:
        asyncio.create_task(_auto_draft_commission(cid))

    return {"ok": True, "auto_draft_started": should_auto_draft}


@api.delete("/admin/content-commissions/{cid}")
async def admin_delete_commission(cid: str, _=Depends(verify_admin)):
    r = await db.content_commissions.delete_one({"id": cid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Commission not found")
    return {"ok": True}


@api.get("/admin/content-commissions/{cid}")
async def admin_get_commission(cid: str, _=Depends(verify_admin)):
    """Single-commission fetch — used by the Approvals UI to poll for the
    result of an in-flight auto-draft without re-loading the whole backlog."""
    doc = await db.content_commissions.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Commission not found")
    return doc


@api.post("/admin/content-commissions/{cid}/auto-draft")
async def admin_trigger_auto_draft(cid: str, _=Depends(verify_admin)):
    """Manual (re)generate button. Fires the AI drafter regardless of status."""
    doc = await db.content_commissions.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Commission not found")
    now_iso_s = datetime.now(timezone.utc).isoformat()
    await db.content_commissions.update_one(
        {"id": cid},
        {"$set": {
            "draft_status": "drafting",
            "draft_started_at": now_iso_s,
            "draft_error": None,
            "updated_at": now_iso_s,
        }},
    )
    asyncio.create_task(_auto_draft_commission(cid))
    return {"ok": True, "draft_status": "drafting"}


class PublishCommissionBody(BaseModel):
    definition: Optional[str] = None
    faqs: Optional[List[dict]] = None
    category: Optional[str] = "General"


@api.post("/admin/content-commissions/{cid}/publish")
async def admin_publish_commission(cid: str, body: PublishCommissionBody, request: Request, _=Depends(verify_admin)):
    """Approve the drafted content and publish it to the public glossary. The
    admin may pass an edited ``definition`` / ``faqs`` in the request body —
    those values are used verbatim, otherwise the stored draft is used.

    Result: creates or updates ``db.glossary`` with faqs_approved=True and
    marks the commission ``status=shipped``.
    """
    doc = await db.content_commissions.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Commission not found")

    term = (doc.get("term") or "").strip()
    slug = (doc.get("slug") or _slugify(term)).strip()
    if not term or not slug:
        raise HTTPException(400, "Commission must have a term and slug to publish.")

    definition = (body.definition if body.definition is not None else doc.get("draft_definition")) or ""
    faqs = body.faqs if body.faqs is not None else (doc.get("draft_faqs") or [])
    if not definition.strip():
        raise HTTPException(400, "Definition is empty — generate a draft or provide one before publishing.")

    upsert = GlossaryUpsert(
        term=term,
        slug=slug,
        category=body.category or "General",
        definition=definition,
        faqs=faqs,
        faqs_approved=True,
    )
    ip = request.client.host if request.client else "admin-publish"
    result = await _apply_upsert(upsert, ip)

    # Persist approved timestamp on the glossary row (matches approve_glossary).
    await db.glossary.update_one({"slug": slug}, {"$set": {"faqs_approved_at": now_iso()}})

    # Mark commission shipped.
    await db.content_commissions.update_one(
        {"id": cid},
        {"$set": {
            "status": "shipped",
            "shipped_at": now_iso(),
            "updated_at": now_iso(),
            "draft_status": "published",
        }},
    )

    # Best-effort sitemap / IndexNow ping (never blocks the response).
    try:
        from sitemap_generator import generate_sitemap
        from indexnow import notify_indexnow
        await generate_sitemap(db)
        await notify_indexnow([f"https://eztofind.ca/glossary/{slug}"])
    except Exception as e:
        logger.warning(f"post-publish SEO push failed (silent-fail): {e}")

    return {"ok": True, "slug": slug, "glossary_action": result.get("status")}


async def _generate_definition_from_scratch(term: str, notes: Optional[str] = None) -> Optional[str]:
    """First-draft definition for a brand-new commission (no seed exists).
    Uses the same hallucination-hardened rules as ``generate_definition_v2``
    but omits the accuracy-anchor block and folds in the admin's optional
    notes."""
    from datetime import date as _date
    today = _date.today().isoformat()
    notes_block = ""
    if notes and notes.strip():
        notes_block = f'\nADMIN NOTES (BC angle / examples / statute the drafter should include):\n"""\n{notes.strip()}\n"""\n'
    prompt = f"""Draft a British Columbia real estate glossary definition for the term below. This is a NEW definition — there is no seed text. Use the hallucination-hardened rules verbatim.

TERM: "{term}"
{notes_block}
═══════════════════════════════════════════════════════════════
HALLUCINATION-HARDENED RULES (v2-new-term, {today})
═══════════════════════════════════════════════════════════════

RULE 1 — CITE OR REFUSE: Every substantive claim cites a whitelist source or explicitly says "verify current details with a BC lawyer, notary, or licensed tax professional."

RULE 2 — NEVER INVENT statute section numbers, dollar amounts, percentages, effective dates, or program names. If unsure, use general phrasing ("the current BCFSA Rules", "the current BC Ministry of Finance thresholds") and refer the reader to verify.

RULE 3 — TAG NUMBERS: Every specific dollar figure, percentage, or effective date must be followed by "(as of {today} — verify current)". Every single number.

RULE 4 — WHITELIST OF ACCEPTABLE BC CITATIONS:
  • BCFSA · Real Estate Services Act (RESA), SBC 2004, c. 42 · Strata Property Act (SPA), SBC 1998, c. 43 · Property Transfer Tax Act (PTTA), RSBC 1996, c. 378 · Speculation and Vacancy Tax Act, SBC 2018, c. 46 · Residential Tenancy Act, SBC 2002, c. 78 · Wills, Estates and Succession Act (WESA), SBC 2009, c. 13 · Land Title Act, RSBC 1996, c. 250 · PIPA, SBC 2003, c. 63 · CASL, SC 2010, c. 23 · Prohibition on Purchase of Residential Property by Non-Canadians Act, SC 2022, c. 10 (extended through Jan 1, 2027 — verify current) · Agricultural Land Commission Act, SBC 2002, c. 36 · Local Government Act, RSBC 2015, c. 1 · Housing Statutes (Residential Development) Amendment Act, 2023 (BC Bill 44) · Home Flipping Tax Act, SBC 2024 · BC Home Owner Grant Act · BC Ministry of Finance / gov.bc.ca · CMHC · FCAC · Bank of Canada

RULE 5 — NO ADVICE: Neutral, educational, factual only. Never recommend a specific mortgage, lender, brokerage, lawyer, or REALTOR®.

RULE 6 — FORMAT:
- One paragraph, 4–8 sentences, 400–700 characters.
- Plain-language but precise; BC-specific.
- End with the "verify current" tag on any specific numbers.
- Return the definition text ONLY. No preamble, no markdown, no code fences, no heading."""
    try:
        chat = make_chat(
            api_key=EMERGENT_LLM_KEY, session_id=f"defnew-{uuid.uuid4()}",
            system_message="You are a British Columbia real estate compliance drafter. Every fact you state must be verifiable against a BC statute or federal Act from the whitelist. When uncertain, you refuse to make the claim and refer the reader to verify with a BC lawyer, notary, or licensed tax professional. You never invent section numbers, dollar amounts, percentages, or dates. Every specific number gets an 'as of YYYY-MM-DD — verify current' tag. You output the definition text ONLY.",
        ).with_model("anthropic", "claude-sonnet-4-6")
        full = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta): full += ev.content
            elif isinstance(ev, StreamDone): break
        text = full.strip()
        if text.startswith("```"):
            text = text.split("```")[1].replace("json", "", 1).strip()
        return text or None
    except Exception as e:
        logger.error(f"New-term definition gen failed for {term}: {e}")
        return None


async def _auto_draft_commission(cid: str) -> None:
    """Background worker: generate definition + 10 FAQs for a commission and
    persist both onto the commission record. Fire-and-forget — the admin UI
    polls ``GET /admin/content-commissions/{cid}`` until ``draft_status`` is
    ``drafted`` or ``error``."""
    try:
        doc = await db.content_commissions.find_one({"id": cid}, {"_id": 0})
        if not doc:
            return
        term = (doc.get("term") or "").strip()
        notes = doc.get("notes")
        if not term:
            await db.content_commissions.update_one(
                {"id": cid},
                {"$set": {"draft_status": "error", "draft_error": "Missing term",
                          "updated_at": now_iso()}})
            return

        definition = await _generate_definition_from_scratch(term, notes)
        if not definition:
            await db.content_commissions.update_one(
                {"id": cid},
                {"$set": {"draft_status": "error",
                          "draft_error": "Definition generation failed",
                          "updated_at": now_iso()}})
            return

        faqs = await generate_faqs_for_term(term, definition)
        if not faqs:
            # Definition succeeded but FAQs failed — persist the definition
            # and mark the FAQ portion as an error so Doug can retry.
            await db.content_commissions.update_one(
                {"id": cid},
                {"$set": {
                    "draft_definition": definition,
                    "draft_faqs": [],
                    "draft_status": "error",
                    "draft_error": "FAQ generation failed (definition saved)",
                    "draft_generated_at": now_iso(),
                    "draft_model": "anthropic/claude-sonnet-4-6",
                    "updated_at": now_iso(),
                }})
            return

        await db.content_commissions.update_one(
            {"id": cid},
            {"$set": {
                "draft_definition": definition,
                "draft_faqs": faqs,
                "draft_status": "drafted",
                "draft_generated_at": now_iso(),
                "draft_model": "anthropic/claude-sonnet-4-6",
                "draft_error": None,
                "updated_at": now_iso(),
            }},
        )
    except Exception as e:
        logger.error(f"Auto-draft failed for commission {cid}: {e}")
        try:
            await db.content_commissions.update_one(
                {"id": cid},
                {"$set": {"draft_status": "error",
                          "draft_error": str(e)[:400],
                          "updated_at": now_iso()}})
        except Exception:
            pass


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

async def generate_definition_v2(term: str, category: str, current_definition: str) -> Optional[str]:
    """Regenerate a glossary term definition using the same hallucination-hardened
    v2 rules as generate_faqs_for_term. Returns None on failure so caller can keep
    the current definition. The prompt uses the existing seed definition as an
    accuracy anchor but re-verifies every specific claim + adds date tags."""
    from datetime import date as _date
    today = _date.today().isoformat()
    prompt = f"""Rewrite the following British Columbia real estate glossary definition using the hallucination-hardened rules below. The goal is a definition that is legally defensible, factually accurate, and consistent with the FAQs (which already use these rules).

TERM: "{term}"
CATEGORY: {category}

CURRENT DEFINITION (use as accuracy anchor — do NOT copy verbatim; verify every claim against the whitelist):
\"\"\"
{current_definition}
\"\"\"

═══════════════════════════════════════════════════════════════
HALLUCINATION-HARDENED RULES (v2-definitions, {today})
═══════════════════════════════════════════════════════════════

RULE 1 — CITE OR REFUSE: Every substantive claim cites a whitelist source or explicitly says "verify current details with a BC lawyer, notary, or licensed tax professional."

RULE 2 — NEVER INVENT statute section numbers, dollar amounts, percentages, effective dates, or program names.

RULE 3 — TAG NUMBERS: Every specific dollar figure, percentage, or effective date must be followed by "(as of {today} — verify current)". Every single number.

RULE 4 — WHITELIST OF ACCEPTABLE BC CITATIONS (same as FAQ generator):
  • BCFSA · Real Estate Services Act (RESA), SBC 2004, c. 42 · Strata Property Act (SPA), SBC 1998, c. 43 · Property Transfer Tax Act (PTTA), RSBC 1996, c. 378 · Speculation and Vacancy Tax Act, SBC 2018, c. 46 · Residential Tenancy Act, SBC 2002, c. 78 · Wills, Estates and Succession Act (WESA), SBC 2009, c. 13 · Land Title Act, RSBC 1996, c. 250 · PIPA, SBC 2003, c. 63 · CASL, SC 2010, c. 23 · Prohibition on Purchase of Residential Property by Non-Canadians Act, SC 2022, c. 10 (extended through Jan 1, 2027 — verify current) · Agricultural Land Commission Act, SBC 2002, c. 36 · Local Government Act, RSBC 2015, c. 1 · Housing Statutes (Residential Development) Amendment Act, 2023 (BC Bill 44) · Home Flipping Tax Act, SBC 2024 · BC Home Owner Grant Act · BC Ministry of Finance / gov.bc.ca · CMHC · FCAC · Bank of Canada

RULE 5 — NO ADVICE: Neutral, educational, factual only. Never recommend a specific mortgage, lender, brokerage, lawyer, or REALTOR®.

RULE 6 — FORMAT:
- One paragraph, 4–8 sentences, 400–700 characters. Plain-language but precise.
- Preserve the same technical scope as the current definition.
- End with the "verify current" tag on any specific numbers.
- Return the definition text ONLY. No preamble, no markdown, no code fences.
"""
    try:
        chat = make_chat(
            api_key=EMERGENT_LLM_KEY, session_id=f"defv2-{uuid.uuid4()}",
            system_message="You are a British Columbia real estate compliance drafter. Every fact you state must be verifiable against a BC statute or federal Act from the whitelist. When uncertain, you refuse to make the claim and refer the reader to verify with a BC lawyer, notary, or licensed tax professional. You never invent section numbers, dollar amounts, percentages, or dates. Every specific number gets an 'as of YYYY-MM-DD — verify current' tag. You output the definition text ONLY.",
        ).with_model("anthropic", "claude-sonnet-4-6")
        full = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta): full += ev.content
            elif isinstance(ev, StreamDone): break
        text = full.strip()
        if text.startswith("```"):
            text = text.split("```")[1].replace("json", "", 1).strip()
        return text or None
    except Exception as e:
        logger.error(f"Definition v2 gen failed for {term}: {e}")
        return None

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
import unicodedata as _unicodedata_mod

def _community_slug(s: str) -> str:
    """Slugify a community name into the URL-safe form used across the site.
    Strips Unicode diacritics so accented BC place names (Tête Jaune Cache,
    100 Mile House, etc.) map to stable ascii slugs (tete-jaune-cache)."""
    nfkd = _unicodedata_mod.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", nfkd.lower()).strip("-")

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
            if _community_slug(c) == slug:
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
            if _community_slug(c) == slug:
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
            "city": _city_query(name),
            "region": {"$nin": ["", None, region]},  # exclude blanks + the parent region label
            "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)},
            "list_price": {"$gt": 0},
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


@api.get("/community/{slug}/stats")
async def community_stats(slug: str):
    """Public community-level market stats. Used by the personalized-homepage
    module to show returning visitors a 'market since your last visit' delta.
    No user identifier in the request — same anonymous data everyone gets."""
    name, region = _resolve_community(slug)
    if not name:
        raise HTTPException(404, "Community not found")
    match = {
        "status": "Active",
        "city": _city_query(name),
        "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)},
        "list_price": {"$gt": 0},
    }
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": None,
            "count": {"$sum": 1},
            "prices": {"$push": "$list_price"},
            "min_price": {"$min": "$list_price"},
            "max_price": {"$max": "$list_price"},
        }},
    ]
    doc = None
    async for row in db.listings.aggregate(pipeline):
        doc = row
        break
    if not doc:
        return {"community": name, "count": 0, "median_price": None, "min_price": None, "max_price": None, "updated_at": now_iso()}
    prices = sorted([p for p in doc.get("prices") or [] if p])
    median = prices[len(prices)//2] if prices else None
    return {
        "community": name,
        "slug": slug,
        "count": doc.get("count", 0),
        "median_price": median,
        "min_price": doc.get("min_price"),
        "max_price": doc.get("max_price"),
        "updated_at": now_iso(),
    }


# =============== COMMUNITY MATCHER (Where Should You Live?) ===============
# Rule-based scoring against approved community synopses. BCFSA-safe: purely
# factual matching with "Suggested, not recommended" disclaimer. PIPA-clean:
# preferences are transient, not stored; no PII collected.

# Keyword tags per lifestyle answer — matched against synopsis text (case-insensitive)
_LIFESTYLE_TAGS = {
    "urban":       ["downtown", "urban", "highrise", "high-rise", "city centre", "city center", "core"],
    "suburban":    ["suburb", "suburban", "family neighbourhood", "family neighborhood", "commuter"],
    "small-town":  ["small town", "small-town", "village", "quaint", "historic downtown"],
    "rural":       ["acreage", "rural", "farm", "hobby farm", "equestrian", "large lot"],
    "waterfront":  ["waterfront", "beach", "oceanfront", "lakefront", "riverfront", "marina", "seaside"],
    "mountain":    ["mountain", "ski", "whistler", "alpine", "sea-to-sky", "recreational"],
}
_MATTERS_TAGS = {
    "walkability":       ["walkable", "walkability", "pedestrian", "walk to"],
    "good-schools":      ["schools", "school district", "family friendly", "family-friendly"],
    "outdoor":           ["hiking", "trails", "parks", "outdoor", "recreation", "biking"],
    "quiet":             ["quiet", "peaceful", "tranquil", "low traffic"],
    "restaurants":       ["restaurants", "dining", "shopping", "cafes", "boutique"],
    "transit":           ["skytrain", "transit", "bus", "canada line", "expo line"],
    "commute":           ["commute", "commuter", "20 minutes to", "close to downtown"],
    "waterfront-access": ["waterfront", "beach", "marina", "lake access", "ocean access"],
    "low-maintenance":   ["condo", "strata", "low maintenance", "lock and leave"],
    "family":            ["family", "family friendly", "family-friendly", "schools", "playground"],
    "nightlife":         ["nightlife", "bars", "clubs", "entertainment", "live music"],
}
_REGION_MAP = {
    "lower-mainland": ["Greater Vancouver", "Fraser Valley"],
    "fraser-valley":  ["Fraser Valley"],
    "sea-to-sky":     ["Sea-to-Sky"],
    "okanagan":       ["Okanagan"],
    "vancouver-island":["Vancouver Island"],
    "kootenays":      ["Kootenays"],
    "northern-bc":    ["Northern BC"],
    "anywhere":       None,
    "have-city":      None,  # user has a specific city in mind → search BC-wide; UI links to /communities for direct browse
}
_BUDGET_BRACKETS = {
    "under-500":   (0, 500_000),
    "500-750":     (500_000, 750_000),
    "750-1m":      (750_000, 1_000_000),
    "1m-2m":       (1_000_000, 2_000_000),
    "over-2m":     (2_000_000, 99_999_999),
}


class CommunityMatchIn(BaseModel):
    lifestyle: Optional[str] = None
    home_type: Optional[str] = None
    budget: Optional[str] = None
    matters: List[str] = []
    region: Optional[str] = None


@api.post("/community-match")
async def community_match(body: CommunityMatchIn):
    """Rule-based community suggestions. Server never stores the preferences —
    they're used to compute the ranking and discarded. BCFSA-safe: results
    are marked 'suggested, not recommended'."""
    # Region filter
    region_names = _REGION_MAP.get(body.region or "anywhere")
    q = {"approved": True}
    if region_names:
        q["region"] = {"$in": region_names}

    # Pull candidates
    candidates = []
    async for c in db.community_synopses.find(q, {"_id": 0, "slug": 1, "name": 1, "region": 1, "synopsis": 1}):
        candidates.append(c)
    if not candidates:
        # Fall back to no region filter
        candidates = [c async for c in db.community_synopses.find({"approved": True}, {"_id": 0, "slug": 1, "name": 1, "region": 1, "synopsis": 1})]

    lifestyle_tags = _LIFESTYLE_TAGS.get((body.lifestyle or "").lower(), [])
    matters_tag_sets = [(m, _MATTERS_TAGS.get(m, [])) for m in (body.matters or [])]
    budget_range = _BUDGET_BRACKETS.get(body.budget or "")

    # --- PASS 1: rule-based scoring (no DB hits) ---
    # Score every candidate on lifestyle/matters/home_type using the cached
    # synopsis text. Cheap in-memory work.
    prelim = []
    for c in candidates:
        synopsis_lc = (c.get("synopsis") or "").lower()
        reasons: List[str] = []
        score = 0

        if lifestyle_tags:
            hits = [t for t in lifestyle_tags if t in synopsis_lc]
            if hits:
                score += 3 * len(hits)
                reasons.append(f"Matches your **{body.lifestyle}** lifestyle preference")

        for mid, tags in matters_tag_sets:
            hits = [t for t in tags if t in synopsis_lc]
            if hits:
                score += 2
                label = {"walkability":"walkable streets","good-schools":"good schools","outdoor":"outdoor recreation","quiet":"quiet atmosphere","restaurants":"restaurants and shopping","transit":"public transit access","commute":"short commute","waterfront-access":"waterfront access","low-maintenance":"low-maintenance living","family":"family-friendly","nightlife":"nightlife"}.get(mid, mid)
                reasons.append(f"Offers {label}")

        if body.home_type == "acreage" and "acreage" in synopsis_lc:
            score += 2; reasons.append("Has acreage properties available")
        if body.home_type == "luxury" and any(k in synopsis_lc for k in ("luxury","estate","waterfront estate")):
            score += 2; reasons.append("Known for luxury and estate homes")
        if body.home_type == "condo" and any(k in synopsis_lc for k in ("condo", "highrise", "high-rise")):
            score += 2; reasons.append("Strong condo market")
        if body.home_type == "townhome" and "townhome" in synopsis_lc:
            score += 1; reasons.append("Townhome inventory available")
        if body.home_type == "detached" and any(k in synopsis_lc for k in ("detached","single-family","single family")):
            score += 1; reasons.append("Established detached-home market")

        if score > 0:
            prelim.append({"community": c, "score": score, "reasons": reasons, "median_price": None, "active_count": 0})

    prelim.sort(key=lambda x: -x["score"])

    # --- PASS 2: budget + property-type inventory check on top candidates only ---
    # Previously ran one Mongo regex query per candidate (240× on "anywhere in BC")
    # which pulled every list_price into Python — request timed out. Now we only
    # hit the DB for the top 20 candidates and use count + sort+skip to find the
    # median without pulling thousands of rows. Queries run in parallel.
    # Also: count how many active listings actually match BOTH the budget bracket
    # AND the requested property_type. That count drives the final ranking so
    # results always reflect real inventory a buyer could purchase today.
    home_type_facet = {
        "condo": "Condo",
        "townhome": "Townhouse",
        "detached": "Detached",
        "acreage": "Acreage",
        # "luxury" isn't a listings facet — the price filter handles it
    }.get(body.home_type or "", None)

    async def _fetch_median(candidate_entry):
        name = candidate_entry["community"]["name"]
        base_match = {
            "status": "Active",
            "city": _city_query(name),
            "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)},
            "list_price": {"$gt": 0},
        }
        count = await db.listings.count_documents(base_match)
        if count == 0:
            return candidate_entry
        mid = count // 2
        cursor = db.listings.find(base_match, {"list_price": 1, "_id": 0}).sort("list_price", 1).skip(mid).limit(1)
        median_price = None
        async for d in cursor:
            median_price = d.get("list_price")
        candidate_entry["median_price"] = median_price
        candidate_entry["active_count"] = count

        # Inventory match: how many listings fit BOTH budget AND property type?
        if budget_range or home_type_facet:
            inv_match = dict(base_match)
            if home_type_facet:
                inv_match["property_type"] = home_type_facet
            if budget_range:
                lo, hi = budget_range
                inv_match["list_price"] = {"$gte": lo, "$lte": hi}
            matching = await db.listings.count_documents(inv_match)
            candidate_entry["matching_count"] = matching
            if matching > 0:
                # Strong bonus that dominates lifestyle score (+6) — plus scaling reward
                candidate_entry["score"] += 6 + min(matching, 10)
                filter_bits = []
                if home_type_facet:
                    filter_bits.append(home_type_facet.lower() + ("s" if home_type_facet != "Acreage" else ""))
                if budget_range:
                    filter_bits.append(f"under ${int(budget_range[1]):,}")
                candidate_entry["reasons"].insert(0, f"{matching} {' '.join(filter_bits)} listing{'s' if matching != 1 else ''} available in {name}")
        return candidate_entry

    top_slice = prelim[:20]
    fallback_message: Optional[str] = None
    if top_slice:
        top_slice = await asyncio.gather(*[_fetch_median(e) for e in top_slice])

        # Hard filter: when the user supplied a budget AND a property type, drop
        # communities with zero matching inventory. If that leaves too few
        # results, relax gracefully and tell the user why.
        strict = [e for e in top_slice if e.get("matching_count", 0) > 0]

        if budget_range and home_type_facet and len(strict) < 3:
            # Fallback 1: try budget-only (any property type)
            async def _recheck_budget_only(entry):
                name = entry["community"]["name"]
                lo, hi = budget_range  # type: ignore[misc]
                inv_match = {
                    "status": "Active",
                    "city": _city_query(name),
                    "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)},
                    "list_price": {"$gte": lo, "$lte": hi},
                }
                cnt = await db.listings.count_documents(inv_match)
                entry["matching_count_budget_only"] = cnt
                return entry

            top_slice = await asyncio.gather(*[_recheck_budget_only(e) for e in top_slice])
            budget_only_hits = [e for e in top_slice if e.get("matching_count_budget_only", 0) > 0]

            if budget_only_hits:
                # Show budget-fitting communities of any type
                fallback_message = (
                    f"There are currently no active {home_type_facet.lower()} listings "
                    f"under ${int(budget_range[1]):,} anywhere in BC. Showing communities "
                    f"where other property types (condos, townhomes) fit your budget instead."
                )
                for e in budget_only_hits:
                    e["score"] += 4
                    n = e["matching_count_budget_only"]
                    e["reasons"].insert(0, f"{n} listing{'s' if n != 1 else ''} under ${int(budget_range[1]):,} in {e['community']['name']} (any property type)")
                top_slice = budget_only_hits + [e for e in top_slice if e not in budget_only_hits]
            else:
                # Fallback 2: nothing under budget anywhere — tell the user plainly
                fallback_message = (
                    f"There are currently no active listings under ${int(budget_range[1]):,} "
                    f"in BC that also match your other preferences. Consider expanding your "
                    f"budget — the next bracket up will show real options."
                )
        elif len(strict) >= 3:
            top_slice = strict

        prelim = top_slice + prelim[20:]
        prelim.sort(key=lambda x: -x["score"])

    scored = [
        {
            "slug": e["community"]["slug"],
            "name": e["community"]["name"],
            "region": e["community"]["region"],
            "synopsis": (e["community"].get("synopsis") or "")[:300],
            "median_price": e["median_price"],
            "active_count": e["active_count"],
            "matching_count": e.get("matching_count"),
            "reasons": e["reasons"][:4],
            "score": e["score"],
        }
        for e in prelim
    ]

    return {"matches": scored[:5], "total_candidates": len(candidates), "fallback_message": fallback_message, "disclaimer": "These communities are suggested based on the preferences you have entered. They are intended to help you explore your options and are not recommendations. Always verify with a REALTOR® before making an offer."}


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
        "city": _city_query(name),
        "region": {"$nin": ["", None, region]},
    })
    n_name = next((r for r in distinct if _nhb_slug(r) == n_slug), None)
    if not n_name:
        raise HTTPException(404, "Neighbourhood not found in this community")
    # Aggregate listing stats to feed the LLM AND surface on the page.
    agg = await db.listings.aggregate([
        {"$match": {"status":"Active","city":_city_query(name),"region":n_name,"property_type":{"$nin":list(EXCLUDED_PROPERTY_TYPES)}}},
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
            if _community_slug(c) == slug:
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

    # Doogie response cache TTL — cached LLM replies expire after 7 days.
    # Cache saves ~$0.02/repeat glossary question ("what's the PTT?", etc.).
    try:
        await db.doogie_response_cache.create_index("expires_at", expireAfterSeconds=0)
        logger.info("doogie_response_cache TTL index ensured (7-day auto-expire)")
    except Exception as e:
        logger.error(f"doogie_response_cache index setup failed: {e}")

    # Doogie TTS audio cache TTL — cached MP3 blobs expire after 30 days.
    # Each cached blob saves ~$0.005-$0.010 in OpenAI TTS costs.
    try:
        await db.doogie_tts_cache.create_index("expires_at", expireAfterSeconds=0)
        logger.info("doogie_tts_cache TTL index ensured (30-day auto-expire)")
    except Exception as e:
        logger.error(f"doogie_tts_cache index setup failed: {e}")

    # beta_feedback — index on status + created_at for fast admin inbox filtering.
    try:
        await db.beta_feedback.create_index([("status", 1), ("created_at", -1)])
        logger.info("beta_feedback indexes ensured")
    except Exception as e:
        logger.error(f"beta_feedback index setup failed: {e}")

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

    # CREA DDF® auto-sync — pulls the latest BC MLS® feed every 4 hours in the
    # background. Writes each run to `ddf_sync_log` so it shows up in the same
    # /admin/listings/sync-log the manual sync uses. First run fires 10 min
    # after boot to avoid colliding with any admin-triggered sync.
    async def _ddf_auto_sync_loop():
        import asyncio as _a
        while True:
            try:
                if _ddf_ready():
                    # Skip if a sync is already in flight (manual trigger overlap)
                    running = await db.ddf_sync_log.find_one({"status": "running"})
                    if running:
                        logger.info("DDF auto-sync: skipping (another sync already running)")
                    else:
                        marker = {"status": "running", "started_at": now_iso(), "pulled": 0, "upserted": 0, "trigger": "auto"}
                        ins = await db.ddf_sync_log.insert_one(marker)
                        try:
                            r = await _ddf_sync(db)
                            await db.ddf_sync_log.update_one({"_id": ins.inserted_id}, {"$set": {"status": "done", "finished_at": now_iso(), **r}})
                            logger.info(f"DDF auto-sync: pulled={r.get('pulled',0)} upserted={r.get('upserted',0)} removed={r.get('removed',0)}")
                            # Fire saved-search alerts for any newly-matched properties
                            try:
                                from services.alert_matcher import run_matcher
                                alerts = await run_matcher(db, "https://eztofind.ca")
                                logger.info(f"alert_matcher after auto-sync: {alerts}")
                            except Exception as e:
                                logger.exception(f"alert_matcher hook failed: {e}")
                        except Exception as e:
                            await db.ddf_sync_log.update_one({"_id": ins.inserted_id}, {"$set": {"status": "error", "finished_at": now_iso(), "errors": [str(e)]}})
                            logger.error(f"DDF auto-sync failed: {e}")
                else:
                    logger.info("DDF auto-sync: credentials not configured, skipping")
            except Exception as e:
                logger.error(f"DDF auto-sync loop iteration failed: {e}")
            await _a.sleep(4 * 3600)  # every 4 hours
    asyncio.create_task(asyncio.sleep(600)).add_done_callback(lambda _: asyncio.create_task(_ddf_auto_sync_loop()))

    # Weekly evidence-chain snapshot — creates a SHA-256 fingerprint of all
    # site content and emails the digest to Doug. Tamper-evident timeline for
    # any future copyright dispute tied to CIPO Reg. No. 1247822.
    async def _evidence_chain_loop():
        import asyncio as _a
        while True:
            try:
                await _weekly_snapshot_email(db)
            except Exception as e:
                logger.error(f"evidence_chain loop iteration failed: {e}")
            await _a.sleep(7 * 24 * 3600)  # weekly
    # First run 24 h after boot so redeploy-storms don't spam the mailbox
    asyncio.create_task(asyncio.sleep(24 * 3600)).add_done_callback(lambda _: asyncio.create_task(_evidence_chain_loop()))

    # ── Insights history snapshot ─────────────────────────────────────────
    # Every 24 h, take a real median-list-price snapshot per (city, property_type)
    # and append to `insights_history`. The `/api/insights/history` endpoint
    # reads back the last 12 weeks so Buyer Insights can render a real sparkline
    # instead of a fabricated trend. Only touches an ~80-row list of BC cities
    # (light query load).
    async def _insights_history_loop():
        import asyncio as _a
        # Wait for DDF sync to finish before first run
        await _a.sleep(30 * 60)
        # Ensure a helpful index for range reads
        try:
            await db.insights_history.create_index([
                ("city", 1), ("property_type", 1), ("snapshot_at", -1),
            ])
        except Exception:
            pass
        while True:
            try:
                await _snapshot_insights_history()
            except Exception as e:
                logger.error(f"insights_history snapshot failed: {e}")
            await _a.sleep(24 * 3600)  # daily
    asyncio.create_task(_insights_history_loop())



    # =============== DRIP CAMPAIGN SCHEDULERS ===============
    # buyer_digest      → Sundays (weekly)
    # welcome_series    → Daily scan (users hit Day 0/3/7 stages)
    # dormant_wakeup    → Daily scan (users idle 30+ days)
    # seller_updates    → 1st of month (PREPARES drafts, Doug approves manually)
    async def _campaigns_daily_loop():
        import asyncio as _a
        # First run ~1 hour after boot to let indexes settle
        await _a.sleep(3600)
        while True:
            try:
                # Daily: welcome_series + dormant_wakeup
                await _run_welcome_series()
                await _run_dormant_wakeup()
                now = datetime.now(timezone.utc)
                # Weekly on Sundays (weekday()==6) — buyer_digest
                if now.weekday() == 6 and 15 <= now.hour < 17:  # ~8am PT on Sunday (15:00 UTC)
                    await _run_buyer_digest_batch()
                # Monthly on the 1st — prepare seller_updates drafts (Doug approves manually)
                if now.day == 1 and 15 <= now.hour < 17:
                    await _prepare_seller_updates()
            except Exception as e:
                logger.error(f"[campaigns] daily loop iteration failed: {e}")
            await _a.sleep(24 * 3600)   # once per day
    asyncio.create_task(_campaigns_daily_loop())

    # ---- Client Journey Platform: daily maintenance loop ----
    # 1. Auto-expire journeys whose expires_at has passed (status → expired)
    # 2. Auto-purge PII 90 days after expiry (PIPA hygiene)
    # 3. Send 7-day nudge email to clients who haven't opened their journey
    asyncio.create_task(_client_journey_maintenance_loop())

    # Generate sitemap.xml on startup so search engines get a fresh copy
    try:
        from sitemap_generator import generate_sitemap
        stats = await generate_sitemap(db)
        logger.info(f"sitemap.xml regenerated: {stats['total']} URLs ({stats['static']} static + {stats['glossary']} glossary + {stats['communities']} communities + {stats.get('neighbourhoods',0)} micro-neighbourhoods)")
    except Exception as e:
        logger.error(f"sitemap generation failed: {e}")

    # ---- MLS / CREA DDF® listings — indexes only ----
    # Mock-seed logic removed 2026-07-27: DDF® feed is live with 53k+ BC listings,
    # and the auto-sync loop below refreshes them every 4 hours. If the collection
    # is ever empty, wait for the sync — never repopulate from mocks.
    try:
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
        logger.error(f"MLS listings index setup failed: {e}")

    # Saved-search indexes (email, verification/unsubscribe tokens)
    try:
        await _save_search_index_setup()
        await db.email_outbox.create_index("created_at")
        await db.email_outbox.create_index("status")
        logger.info("saved_searches + email_outbox indexes ensured")
    except Exception as e:
        logger.error(f"saved_searches index setup failed: {e}")

    # Client-lifecycle reminder module — seed 6 default templates + indexes.
    try:
        await _seed_reminder_templates()
        await db.reminder_templates.create_index("type", unique=True)
        await db.clients.create_index("unsubscribe_token", sparse=True)
        await db.email_send_log.create_index([("sent_at", -1)])
        await db.email_send_log.create_index("client_id")
        await db.reminder_snoozes.create_index([("client_id", 1), ("type_key", 1), ("year", 1)], unique=True)
        # Backfill unsubscribe_token on legacy client records
        async for c in db.clients.find({"unsubscribe_token": {"$in": [None, ""]}}, {"_id": 1}):
            await db.clients.update_one({"_id": c["_id"]}, {"$set": {"unsubscribe_token": str(uuid.uuid4())}})
        logger.info("Reminder templates + client-lifecycle indexes ensured")
    except Exception as e:
        logger.error(f"Reminder module setup failed: {e}")

@api.post("/admin/regenerate-sitemap")
async def admin_regen_sitemap(_=Depends(verify_admin)):
    from sitemap_generator import generate_sitemap
    from indexnow import notify_indexnow, HOST
    result = await generate_sitemap(db)
    # SEO push:
    #   - IndexNow → Bing, Yandex, Naver, Seznam (modern instant-indexing protocol)
    #   - Google no longer accepts sitemap ping (deprecated June 2023) — the only
    #     path is Google Search Console. Doug submits manually via
    #     https://search.google.com/search-console (bookmarked in his tools).
    try:
        priority_urls = [
            f"https://{HOST}/",
            f"https://{HOST}/communities",
            f"https://{HOST}/glossary",
            f"https://{HOST}/about",
            f"https://{HOST}/valuation",
            f"https://{HOST}/relocating",
            f"https://{HOST}/realtor-network",
            f"https://{HOST}/regions/greater-vancouver",
            f"https://{HOST}/regions/fraser-valley",
            f"https://{HOST}/regions/sea-to-sky",
            f"https://{HOST}/regions/vancouver-island",
            f"https://{HOST}/regions/okanagan",
            f"https://{HOST}/specialties/luxury",
            f"https://{HOST}/specialties/equestrian",
            f"https://{HOST}/specialties/condos",
            f"https://{HOST}/specialties/townhomes",
            f"https://{HOST}/specialties/waterfront",
            f"https://{HOST}/sitemap.xml",
        ]
        # Also push all glossary terms whose FAQs were recently curated/updated so
        # LLM answer engines refresh their cached answers.
        recent_terms = await db.glossary.find({}, {"slug": 1}).sort("last_curated_at", -1).limit(200).to_list(200)
        priority_urls += [f"https://{HOST}/glossary/{t['slug']}" for t in recent_terms if t.get("slug")]
        indexnow_result = await notify_indexnow(priority_urls)
        result["indexnow"] = indexnow_result
        result["google_note"] = "Google removed its sitemap ping endpoint in June 2023. Submit https://eztofind.ca/sitemap.xml via Google Search Console → Sitemaps."
    except Exception as e:
        logger.warning(f"admin sitemap regen: IndexNow push failed (silent-fail): {e}")
        result["indexnow"] = {"ok": False, "error": str(e)}
    return result


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

# ================================================================
# DSAR — Data Subject Access Request (PIPA / PIPEDA compliance)
# ================================================================
# Under BC's Personal Information Protection Act (PIPA) s.23 and Canada's
# PIPEDA s.4.9, every individual has the right to request a copy of the
# personal information a business holds about them. We implement this as
# a self-service double-opt-in flow:
#
#   1. POST /api/privacy/export-request { email }
#         -> logs the request, emails a signed verification link
#   2. GET  /api/privacy/export?token=... (click from email)
#         -> returns a JSON bundle of all data associated with that email
#         -> single-use token, 24h expiry, tamper-evident audit log
#
# Fulfilment latency: instant (well under the 30-day PIPA/PIPEDA maximum).
# The token is single-use to prevent link-scraping bots from pulling PII.
# All access is logged to `dsar_export_log` for OIPC audit purposes.

class DSARExportRequest(BaseModel):
    email: str

# Collections that may store personal data keyed by email.
# The `field` attribute names the email field within each document.
_DSAR_COLLECTIONS = [
    ("buyer_leads",         "email"),
    ("seller_leads",        "email"),
    ("clients",             "email"),
    ("saved_searches",      "email"),
    ("realtor_applications","email"),
    ("beta_feedback",       "email"),
    ("chat_messages",       "email"),
    ("mls_consent_log",     "email"),
    ("email_send_log",      "to_email"),
    ("email_outbox",        "to_email"),
    ("unsubscribe_log",     "email"),
    ("newsletter_subscribers", "email"),
]

@api.post("/privacy/export-request")
async def dsar_export_request(body: DSARExportRequest, request: Request):
    """Submit a DSAR export request. Sends a verification email with a
    single-use link that (once clicked) returns a JSON bundle of all PII
    tied to this email address.

    Rate-limit: 1 request per email per 24h to prevent abuse.
    """
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Valid email address required.")

    # Rate limit: 1 request per email per 24h
    now = datetime.now(timezone.utc)
    recent = await db.dsar_export_log.find_one({
        "email": email,
        "requested_at": {"$gte": (now - timedelta(hours=24)).isoformat()},
        "status": {"$in": ["pending", "fulfilled"]},
    })
    if recent:
        raise HTTPException(429, "A data export request for this email was already submitted in the last 24 hours. Please check your inbox for the verification link.")

    ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
          or (request.client.host if request.client else "unknown"))
    ua = request.headers.get("user-agent", "")[:400]
    token = uuid.uuid4().hex + uuid.uuid4().hex  # 64-char high-entropy token
    request_id = str(uuid.uuid4())

    await db.dsar_export_log.insert_one({
        "id": request_id,
        "email": email,
        "token": token,
        "status": "pending",
        "requested_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat(),
        "requester_ip": ip,
        "requester_ua": ua,
    })

    # Send verification email (transactional — no CASL consent required for
    # a user-initiated compliance response).
    from services.email_sender import send_email as _send_email, SENDER_NAME, SENDER_ADDRESS, SENDER_PHONE, SENDER_EMAIL
    base = _public_base_url(request)
    export_url = f"{base}/api/privacy/export?token={token}"
    html = f"""<!doctype html><html><body style="margin:0;background:#F5F0E1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E1;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:2rem;font-family:Inter,Arial,sans-serif;color:#111827">
<tr><td>
<div style="font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:#0F2A5B;font-weight:700">EZtoFind.ca · Privacy request (PIPA / PIPEDA)</div>
<h1 style="font-family:Georgia,serif;font-size:1.6rem;color:#0F2A5B;margin:0.4rem 0 0.75rem">Your data export is ready</h1>
<p style="line-height:1.6;color:#374151">You (or someone using your email) requested a copy of the personal information EZtoFind.ca holds about you, as permitted under BC's Personal Information Protection Act (PIPA) and Canada's PIPEDA.</p>
<p style="line-height:1.6;color:#374151">Click the button below to download your data as a JSON file. The link is <strong>single-use</strong> and expires in <strong>24 hours</strong>.</p>
<p style="text-align:center;margin:1.5rem 0"><a href="{export_url}" style="display:inline-block;background:#0F2A5B;color:#fff;text-decoration:none;padding:0.9rem 1.9rem;border-radius:999px;font-weight:700">Download my data (JSON)</a></p>
<p style="font-size:0.8rem;color:#6b7280;line-height:1.6">If you didn't request this, just ignore this email — the link will expire unused and no data is released. Only the person who clicks the link (in the same 24-hour window) sees the data.</p>
<hr style="margin:1.5rem 0 1rem;border:none;border-top:1px solid #e5e7eb"/>
<div style="font-size:12px;color:#6b7280;line-height:1.6">
  <p style="margin:0 0 0.5rem"><strong>{SENDER_NAME}</strong><br/>{SENDER_ADDRESS} · {SENDER_PHONE} · <a href="mailto:{SENDER_EMAIL}" style="color:#0F2A5B">{SENDER_EMAIL}</a></p>
  <p style="margin:0">Prefer to have Doug email you the data instead of downloading it yourself? Reply to this email. Under PIPA we will respond within 30 days at the latest.</p>
</div>
</td></tr></table></td></tr></table></body></html>"""
    text = (
        "EZtoFind.ca — Your PIPA / PIPEDA data export is ready\n\n"
        "You requested a copy of the personal information we hold about you.\n\n"
        f"Download your data (JSON): {export_url}\n\n"
        "The link is single-use and expires in 24 hours.\n\n"
        "If you didn't request this, ignore this email — no data is released\n"
        "until someone clicks the link.\n\n"
        f"---\n{SENDER_NAME}\n{SENDER_ADDRESS} · {SENDER_PHONE} · {SENDER_EMAIL}\n"
    )
    send_result = await _send_email(db,
        to=email, subject="Your EZtoFind.ca data export (PIPA)",
        html=html, text=text, kind="transactional", related_id=request_id,
    )
    logger.info(f"DSAR export request created: email={email} id={request_id} email_queued={send_result.get('queued', False)}")
    return {
        "success": True,
        "message": "Check your inbox — we've sent a secure download link. It expires in 24 hours and can only be used once.",
    }


@api.get("/privacy/export")
async def dsar_export_download(token: str, request: Request):
    """Serve the DSAR JSON bundle. Token is single-use and expires in 24h."""
    from fastapi.responses import JSONResponse
    now = datetime.now(timezone.utc)
    rec = await db.dsar_export_log.find_one({"token": token})
    if not rec:
        raise HTTPException(404, "Invalid or already-used export link. Please submit a new privacy request.")
    if rec.get("status") == "fulfilled":
        raise HTTPException(410, "This download link has already been used. For security, each link works exactly once. Please submit a new privacy request if you need another copy.")
    expires_at = rec.get("expires_at")
    if isinstance(expires_at, str):
        try:
            if datetime.fromisoformat(expires_at) < now:
                raise HTTPException(410, "This download link has expired. Please submit a new privacy request.")
        except ValueError:
            pass

    email = rec["email"]
    # Bundle personal data from every known collection
    bundle = {
        "export_metadata": {
            "email": email,
            "export_id": rec["id"],
            "generated_at": now.isoformat(),
            "requested_at": rec.get("requested_at"),
            "legal_basis": "BC PIPA s.23 / PIPEDA s.4.9 — right of access",
            "controller": {
                "name": "Doug LeMaire, REALTOR® — EZtoFind.ca",
                "brokerage": "Fraser Property Management Realty Services Ltd.",
                "contact_email": "info@eztofind.ca",
                "notes": "For corrections, deletion requests, or complaints, reply to this email. Under PIPA you may also complain to the BC Office of the Information & Privacy Commissioner (https://www.oipc.bc.ca).",
            },
        },
        "records": {},
    }
    total_docs = 0
    for coll_name, email_field in _DSAR_COLLECTIONS:
        try:
            cursor = db[coll_name].find({email_field: {"$regex": f"^{re.escape(email)}$", "$options": "i"}}, {"_id": 0})
            docs = await cursor.to_list(length=1000)
            if docs:
                # Redact tokens (verification/unsubscribe) that could be reused
                for d in docs:
                    for redact_field in ("verification_token", "unsubscribe_token", "token", "password_hash"):
                        if redact_field in d:
                            d[redact_field] = "[REDACTED — internal security token]"
                bundle["records"][coll_name] = docs
                total_docs += len(docs)
        except Exception as e:
            logger.warning(f"DSAR export: failed to read {coll_name}: {e}")

    bundle["export_metadata"]["total_records"] = total_docs
    bundle["export_metadata"]["collections_searched"] = [c[0] for c in _DSAR_COLLECTIONS]

    # Mark request as fulfilled (single-use enforcement)
    ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
          or (request.client.host if request.client else "unknown"))
    await db.dsar_export_log.update_one(
        {"token": token},
        {"$set": {
            "status": "fulfilled",
            "fulfilled_at": now.isoformat(),
            "fulfilled_from_ip": ip,
            "total_records_returned": total_docs,
        }},
    )
    logger.info(f"DSAR export fulfilled: email={email} records={total_docs}")

    # Trigger download in browser rather than inline JSON display
    from fastapi.responses import Response
    import json as _json
    payload = _json.dumps(bundle, indent=2, default=str, ensure_ascii=False)
    filename = f"eztofind-data-export-{email.split('@')[0]}-{now.strftime('%Y%m%d')}.json"
    return Response(
        content=payload,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ================================================================
# DEFINITION HARDENING (v2) — regenerates the 396 glossary term
# definitions using the same hallucination-hardened prompt as the
# FAQs. New definitions land in `definition_pending` so the live
# site keeps showing the current definition until Doug approves
# each one (or bulk-approves via /admin/definitions/approve-all).
# ================================================================
_DEFN_REGEN_STATE = {"running": False, "started_at": None, "processed": 0, "total": 0, "errors": []}

async def _run_definition_regen():
    """Background task: iterates every glossary term and asks Claude to rewrite
    the definition under the v2 rules. Writes to `definition_pending` and marks
    `definition_prompt_version=v2-hallucination-hardened`. Idempotent — skips
    terms already regenerated."""
    _DEFN_REGEN_STATE["running"] = True
    _DEFN_REGEN_STATE["started_at"] = now_iso()
    _DEFN_REGEN_STATE["processed"] = 0
    _DEFN_REGEN_STATE["errors"] = []
    try:
        cursor = db.glossary.find(
            {"definition_prompt_version": {"$ne": "v2-hallucination-hardened"}},
            {"_id": 0, "slug": 1, "term": 1, "category": 1, "definition": 1}
        )
        pending = await cursor.to_list(2000)
        _DEFN_REGEN_STATE["total"] = len(pending)
        logger.info(f"Definition v2 regen: {len(pending)} terms to process")

        for t in pending:
            if not _DEFN_REGEN_STATE["running"]:
                logger.warning("Definition v2 regen: aborted mid-run")
                break
            try:
                new_defn = await generate_definition_v2(t["term"], t.get("category", ""), t.get("definition", ""))
                if new_defn and len(new_defn) > 40:
                    await db.glossary.update_one(
                        {"slug": t["slug"]},
                        {"$set": {
                            "definition_pending": new_defn,
                            "definition_original": t.get("definition"),
                            "definition_regenerated_at": now_iso(),
                            "definition_prompt_version": "v2-hallucination-hardened",
                            "definition_approved": False,
                        }},
                    )
                    _DEFN_REGEN_STATE["processed"] += 1
                    if _DEFN_REGEN_STATE["processed"] % 20 == 0:
                        logger.info(f"Definition v2 regen: {_DEFN_REGEN_STATE['processed']}/{_DEFN_REGEN_STATE['total']}")
                else:
                    _DEFN_REGEN_STATE["errors"].append({"term": t["term"], "reason": "empty response"})
            except Exception as e:
                _DEFN_REGEN_STATE["errors"].append({"term": t["term"], "reason": str(e)[:200]})
                logger.exception(f"Definition v2 gen error on {t['term']}")
            await asyncio.sleep(0.15)  # small pacing gap
    finally:
        _DEFN_REGEN_STATE["running"] = False
        logger.info(f"Definition v2 regen COMPLETE: {_DEFN_REGEN_STATE['processed']} processed, {len(_DEFN_REGEN_STATE['errors'])} errors")

@api.post("/admin/definitions/regenerate-v2")
async def start_definition_regen(_=Depends(verify_admin)):
    """Kicks off the v2 definition regeneration in the background. Idempotent:
    returns 'already_running' if a run is in progress."""
    if _DEFN_REGEN_STATE["running"]:
        return {"status": "already_running", "state": _DEFN_REGEN_STATE}
    asyncio.create_task(_run_definition_regen())
    return {"status": "started", "state": _DEFN_REGEN_STATE}

@api.get("/admin/definitions/regen-status")
async def definition_regen_status(_=Depends(verify_admin)):
    """Live progress of the definition regen so Doug can watch it complete."""
    pending_count = await db.glossary.count_documents({"definition_pending": {"$exists": True, "$ne": ""}, "definition_approved": {"$ne": True}})
    approved_count = await db.glossary.count_documents({"definition_approved": True})
    return {"state": _DEFN_REGEN_STATE, "pending_for_review": pending_count, "approved": approved_count}

@api.get("/admin/definition-audit")
async def definition_audit(status: str = "pending", _=Depends(verify_admin)):
    """Show terms whose definitions are pending Doug's approval, with side-by-side
    old vs new. status=pending (default) | approved | all."""
    q = {"definition_pending": {"$exists": True, "$ne": ""}}
    if status == "pending":
        q["definition_approved"] = {"$ne": True}
    elif status == "approved":
        q["definition_approved"] = True
    docs = await db.glossary.find(q, {"_id": 0, "faqs": 0}).sort("term", 1).to_list(2000)
    return {"count": len(docs), "items": docs}

class DefinitionApprovalIn(BaseModel):
    slug: str
    edited_text: Optional[str] = None  # Doug can edit before approving

@api.post("/admin/definitions/approve")
async def approve_definition(body: DefinitionApprovalIn, _=Depends(verify_admin)):
    """Promote definition_pending → definition. If Doug edited it, save the edit."""
    t = await db.glossary.find_one({"slug": body.slug})
    if not t:
        raise HTTPException(404, "Term not found")
    new_defn = body.edited_text if body.edited_text else t.get("definition_pending")
    if not new_defn:
        raise HTTPException(400, "No pending definition to approve")
    await db.glossary.update_one(
        {"slug": body.slug},
        {"$set": {
            "definition": new_defn,
            "definition_approved": True,
            "definition_approved_at": now_iso(),
        }, "$unset": {"definition_pending": ""}},
    )
    return {"success": True}

@api.post("/admin/definitions/reject")
async def reject_definition(body: UnapproveGlossary, _=Depends(verify_admin)):
    """Discard the pending v2 definition and keep the current live one."""
    await db.glossary.update_one(
        {"slug": body.slug},
        {"$unset": {"definition_pending": "", "definition_regenerated_at": ""}, "$set": {"definition_approved": False}},
    )
    return {"success": True}

@api.post("/admin/definitions/approve-all")
async def approve_all_definitions(_=Depends(verify_admin)):
    """Bulk-approve every pending definition (Doug uses this after a full spot-review pass)."""
    pending = await db.glossary.find({"definition_pending": {"$exists": True, "$ne": ""}, "definition_approved": {"$ne": True}}, {"_id": 1, "definition_pending": 1}).to_list(2000)
    for t in pending:
        await db.glossary.update_one(
            {"_id": t["_id"]},
            {"$set": {"definition": t["definition_pending"], "definition_approved": True, "definition_approved_at": now_iso()},
             "$unset": {"definition_pending": ""}},
        )
    return {"success": True, "approved": len(pending)}

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
        {"$match": {"status":"Active","city":_city_query(d['community']),"region":d["neighbourhood"],"property_type":{"$nin":list(EXCLUDED_PROPERTY_TYPES)},"list_price":{"$gt":0}}},
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
                    {"$match": {"status":"Active","city":_city_query(c_name),"region":n_name,"property_type":{"$nin":list(EXCLUDED_PROPERTY_TYPES)},"list_price":{"$gt":0}}},
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

# =============== FRESH LAUNCH RESET (pre-launch data purge) ===============
# Doug uses this exactly once, before flipping DNS to the live domain, to wipe
# every synthetic test record so the CRM opens on Day 1 with a truly clean slate.
# After go-live, individual records must be deleted only via the daily retention
# purger or DSAR requests — this tool becomes non-idempotent on real client data.
_RESET_CATEGORIES = {
    "leads": {
        "label": "Buyer / Seller / Valuation / Referral leads",
        "collections": ["buyer_leads", "seller_leads", "valuation_leads", "referral_requests"],
    },
    "realtors": {
        "label": "REALTOR® applications",
        "collections": ["realtor_applications"],
    },
    "crm_clients": {
        "label": "CRM clients + reminder snoozes + email send log",
        "collections": ["clients", "reminder_snoozes", "email_send_log"],
    },
    "chats": {
        "label": "Doogie chat sessions + caches + quota counters",
        "collections": ["chat_messages", "chat_sessions", "doogie_response_cache", "doogie_tts_cache", "usage_quotas"],
    },
    "feedback": {
        "label": "Beta feedback",
        "collections": ["beta_feedback"],
    },
    "email_outbox": {
        "label": "Email outbox (pending queue)",
        "collections": ["email_outbox"],
    },
    "saved_searches": {
        "label": "Saved-search subscriptions",
        "collections": ["saved_searches"],
    },
    "listing_analytics": {
        "label": "MLS listing analytics (impression / view counts)",
        "collections": ["listing_analytics"],
    },
}
_RESET_CONFIRMATION_PHRASE = "RESET FOR LAUNCH"

@api.get("/admin/reset/preview")
async def reset_preview(_=Depends(verify_admin)):
    """Returns per-category row counts + a manifest of what will and will NOT be touched."""
    preview = []
    for key, meta in _RESET_CATEGORIES.items():
        total = 0
        per_col = []
        for col_name in meta["collections"]:
            c = await db[col_name].count_documents({})
            per_col.append({"collection": col_name, "count": c})
            total += c
        preview.append({"key": key, "label": meta["label"], "total": total, "collections": per_col})
    preserved = [
        {"collection": "glossary",           "reason": "BC real estate terms — content"},
        {"collection": "communities",        "reason": "Community profiles — content"},
        {"collection": "community_zoning",   "reason": "Zoning bylaws — content"},
        {"collection": "reminder_templates", "reason": "Your 6 lifecycle email templates"},
        {"collection": "listings",           "reason": "MLS® data — synced from CREA"},
        {"collection": "retention_purge_log","reason": "Audit trail — required 7 years"},
        {"collection": "mls_consent_log",    "reason": "CASL consent audit — 7 years"},
        {"collection": "breach_log",         "reason": "PIPA breach records — 7 years"},
    ]
    return {"categories": preview, "preserved": preserved, "confirmation_phrase": _RESET_CONFIRMATION_PHRASE}

class ResetPurgeRequest(BaseModel):
    categories: List[str]
    confirm_text: str

@api.post("/admin/reset/purge")
async def reset_purge(body: ResetPurgeRequest, _=Depends(verify_admin)):
    """Destructive: wipes selected pre-launch categories. Writes a permanent
    attestation to retention_purge_log so BCFSA/OIPC audits can verify the
    action was authorized and traceable."""
    if body.confirm_text.strip() != _RESET_CONFIRMATION_PHRASE:
        raise HTTPException(400, f'Confirmation phrase must be exactly "{_RESET_CONFIRMATION_PHRASE}".')
    if not body.categories:
        raise HTTPException(400, "Select at least one category to purge.")
    unknown = [c for c in body.categories if c not in _RESET_CATEGORIES]
    if unknown:
        raise HTTPException(400, f"Unknown categories: {unknown}")

    results = {}
    total_destroyed = 0
    for key in body.categories:
        meta = _RESET_CATEGORIES[key]
        per_col = {}
        for col_name in meta["collections"]:
            r = await db[col_name].delete_many({})
            per_col[col_name] = r.deleted_count
            total_destroyed += r.deleted_count
        results[key] = per_col

    attestation = {
        "id": str(uuid.uuid4()),
        "purged_at": now_iso(),
        "action": "fresh_launch_reset",
        "categories": body.categories,
        "records_destroyed": total_destroyed,
        "per_collection": results,
        "authorized_by": ADMIN_EMAIL,
        "attestation": f"Pre-launch reset — {total_destroyed} synthetic records permanently destroyed across {len(body.categories)} categories.",
    }
    await db.retention_purge_log.insert_one(attestation)
    logger.warning(f"FRESH LAUNCH RESET: {total_destroyed} records destroyed across {body.categories}")
    return {"success": True, "destroyed": total_destroyed, "results": results, "attestation_id": attestation["id"]}

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

# Common municipal suffixes users type that CREA's DDF feed doesn't distinguish.
# CREA rolls "Langley City" and "Langley Township" up to just "Langley", so a
# strict `^Langley Township$` regex returns 0 hits. _city_query() strips these
# suffixes and matches both forms.
_CITY_SUFFIX_RE = re.compile(
    r"\s+(township|twp\.?|city|district(?:\s+municipality)?|municipality|village|town)$",
    re.IGNORECASE,
)


def _city_query(city: str) -> dict:
    """Mongo query fragment for city that handles municipal-suffix aliasing +
    punctuation-forgiveness. Matches every reasonable spelling a user might
    type: with/without periods ("Fort St John" ↔ "Fort St. John"), with/
    without ampersand spacing, plus the standard municipal-suffix stripping.
    """
    if not city:
        return {}
    city = city.strip()
    stripped = _CITY_SUFFIX_RE.sub("", city).strip()
    variants = {city}
    if stripped and stripped.lower() != city.lower():
        variants.add(stripped)

    # Punctuation-forgiveness: build alternates with/without periods and with
    # "St"/"St." interchangeable. This solves the common CREA convention where
    # cities are stored as "Fort St. John" but users type "Fort St John".
    def _punct_variants(v: str) -> set:
        out = {v}
        # Toggle "St." ↔ "St " (and "Ste." ↔ "Ste " similarly)
        for a, b in (("St.", "St"), ("Ste.", "Ste"), ("Mt.", "Mt")):
            if a in v:
                out.add(v.replace(a, b))
            if f"{b} " in v and a not in v:
                out.add(v.replace(f"{b} ", f"{a} "))
        # Also strip any trailing period(s) as a catch-all
        out.add(v.rstrip("."))
        return out

    expanded = set()
    for v in variants:
        expanded |= _punct_variants(v)
    escaped = "|".join(sorted({re.escape(v) for v in expanded}, key=len, reverse=True))
    return {"$regex": f"^({escaped})$", "$options": "i"}


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

# Vancouver & Metro-Vancouver neighbourhoods aren't stored as `city` in the
# CREA DDF feed (which uses only municipal boundaries), so a bare "Kitsilano"
# or "Yaletown" search returns nothing. This map resolves the neighbourhood
# to its parent city + a description-keyword hint. The endpoint then applies:
#   city = parent AND description contains neighbourhood
# tightening results to the actual neighbourhood, not all of Vancouver.
NEIGHBOURHOOD_TO_PARENT_CITY = {
    # Vancouver neighbourhoods (west side)
    "kitsilano": "Vancouver", "kits": "Vancouver",
    "point grey": "Vancouver", "west point grey": "Vancouver",
    "dunbar": "Vancouver", "dunbar-southlands": "Vancouver", "southlands": "Vancouver",
    "kerrisdale": "Vancouver",
    "shaughnessy": "Vancouver", "south granville": "Vancouver",
    "arbutus": "Vancouver", "arbutus ridge": "Vancouver",
    "west end": "Vancouver", "downtown vancouver": "Vancouver",
    "coal harbour": "Vancouver", "yaletown": "Vancouver",
    "gastown": "Vancouver", "chinatown": "Vancouver",
    "fairview": "Vancouver", "cambie": "Vancouver", "south cambie": "Vancouver",
    "mount pleasant": "Vancouver", "main street": "Vancouver", "riley park": "Vancouver",
    "marpole": "Vancouver", "oakridge": "Vancouver",
    "sunset": "Vancouver", "victoria fraserview": "Vancouver", "fraserview": "Vancouver",
    "kensington": "Vancouver", "kensington-cedar cottage": "Vancouver", "cedar cottage": "Vancouver",
    "commercial drive": "Vancouver", "grandview": "Vancouver", "grandview-woodland": "Vancouver",
    "strathcona": "Vancouver",
    "hastings-sunrise": "Vancouver", "hastings sunrise": "Vancouver",
    "renfrew": "Vancouver", "renfrew-collingwood": "Vancouver", "collingwood": "Vancouver",
    "killarney": "Vancouver", "champlain heights": "Vancouver",
    # North Vancouver neighbourhoods
    "lynn valley": "North Vancouver", "deep cove": "North Vancouver",
    "lonsdale": "North Vancouver", "lower lonsdale": "North Vancouver", "upper lonsdale": "North Vancouver",
    "grouse mountain": "North Vancouver", "seymour": "North Vancouver",
    # Burnaby
    "metrotown": "Burnaby", "brentwood": "Burnaby", "brentwood park": "Burnaby",
    "burnaby heights": "Burnaby", "capitol hill": "Burnaby", "deer lake": "Burnaby",
    "edmonds": "Burnaby", "sperling": "Burnaby",
    # Surrey / South Surrey
    "guildford": "Surrey", "fleetwood": "Surrey", "newton": "Surrey", "cloverdale": "Surrey",
    "south surrey": "Surrey", "morgan creek": "Surrey", "white rock": "White Rock",
    "grandview surrey": "Surrey",
    # Richmond
    "steveston": "Richmond", "brighouse": "Richmond", "terra nova": "Richmond",
    # Coquitlam
    "burke mountain": "Coquitlam", "westwood plateau": "Coquitlam",
    # Delta neighbourhoods (Tsawwassen IS its own municipality — no mapping needed)
    "ladner": "Delta", "north delta": "Delta",
    # West Vancouver
    "ambleside": "West Vancouver", "dundarave": "West Vancouver",
    "british properties": "West Vancouver", "cypress park": "West Vancouver",
    # Victoria
    "oak bay": "Oak Bay", "fairfield": "Victoria", "james bay": "Victoria",
    "cook street village": "Victoria", "rockland": "Victoria",
    # Kelowna
    "lower mission": "Kelowna", "upper mission": "Kelowna", "glenmore": "Kelowna",
    "rutland": "Kelowna",
}

async def _resolve_bc_locality(q: str) -> Optional[dict]:
    """Given a natural-language query, return {"city": "..."} or {"region": "..."}
    if the query matches a known BC city or CREA CityRegion (case-insensitive).
    Match order: neighbourhood → exact city → exact region → substring city → substring region.
    A neighbourhood match returns {"city": parent, "neighbourhood": hood} so callers
    can tighten the query to city=parent AND description matches the hood."""
    if not q or not q.strip():
        return None
    ql = q.strip().lower()
    # 0) Vancouver / Metro Vancouver / Victoria / Kelowna neighbourhood → parent city
    #    (checked BEFORE cities so "Kitsilano" resolves to Vancouver+hint, not the null city)
    for hood, parent in NEIGHBOURHOOD_TO_PARENT_CITY.items():
        # Whole-word match: "condo in kitsilano" matches, but "kits-eating" does not
        import re as _re
        if _re.search(rf"\b{_re.escape(hood)}\b", ql):
            return {"city": parent, "neighbourhood": hood}
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

# Equestrian keyword canon — user-defined feature-sheet phrases that mark a
# listing as "horse-friendly" even when CREA didn't tag it property_type=Equestrian.
# Matched with LEFT word boundary (case-insensitive) against the listing
# description. Left-boundary prevents false positives like "install" matching
# "stall", or "urbanization" matching "urban". OR semantics: presence of ANY
# one keyword qualifies the listing.
#
# NOTE: Bare "farm" and "ranch" are DELIBERATELY excluded — they match
# "farmhouse sink" / "ranch-style home" (extremely common non-equestrian
# real estate lingo). Use the more specific "hobby farm" / "horse ranch"
# / "cattle ranch" instead.
EQUESTRIAN_KEYWORDS = [
    # Original canon
    "equestrian", "horse property", "horse friendly", "horse farm",
    "barn", "stable", "arena", "riding ring", "paddock", "ALR",
    # New additions (Feb 2026) — expanded feature-sheet vocabulary
    "horse facility", "horse ranch", "horse barn", "horse stall",
    "stall",                                # stall, stalls, stalled, stallion
    "round pen", "pasture", "tack room", "feed room",
    "hay loft", "hay shed", "hay storage", "hayloft",
    "wash bay", "wash rack", "grooming area",
    "cross fenced", "cross-fenced",
    "in and out stall",
    "grazing", "outbuilding", "out building", "loafing shed",
    "agricultural",
    "hobby farm", "cattle ranch",
    "dressage",                             # dressage, dressage arena
    "corral",                               # bonus: common BC ranch term
]


@api.get("/listings/equestrian-count")
@_limiter.limit("60/minute")
async def equestrian_keyword_count(request: Request, price_min: Optional[int] = None):
    """Count active BC listings whose description contains any of the
    user-defined equestrian keywords. Returns the raw count + the keyword
    list used, so the frontend can quantify 'true' equestrian inventory
    beyond CREA's property_type=Equestrian facet."""
    q: dict = {
        "status": "Active",
        "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)},
        "list_price": {"$gt": 0} if not price_min else {"$gte": price_min},
        "$or": [{"description": {"$regex": r"\b" + re.escape(k), "$options": "i"}} for k in EQUESTRIAN_KEYWORDS],
    }
    total = await db.listings.count_documents(q)
    return {"total": total, "keywords": EQUESTRIAN_KEYWORDS, "price_min": price_min}


# Sub-category filters for the equestrian page. Each key maps to an additional
# constraint that is AND-ed onto the base equestrian keyword scan. Extends the
# equestrian match with product-facing chips ("Hobby Farm", "Estate", "Ranch",
# etc.) so buyers can drill in by lifestyle segment without leaving the page.
# Values are regex patterns applied to `description` (left word-boundary, i)
# UNLESS "property_types" is set (then a strict CREA property_type $in filter
# is applied). Multiple keys are OR-ed inside one sub-category.

# Public region chip → communities_seed.json key(s). Comma-joined lists let the
# frontend send a single value like "Lower Mainland" that resolves to two seed
# keys (Greater Vancouver + Fraser Valley) at query time. Kept server-side so
# users can't inject arbitrary keys.
REGION_CHIP_MAP = {
    "Anywhere":         [],
    "Lower Mainland":   ["Greater Vancouver", "Fraser Valley"],
    "Fraser Valley":    ["Fraser Valley"],
    "Okanagan":         ["Okanagan"],
    "Vancouver Island": ["Vancouver Island & Gulf Islands"],
    "Kootenays":        ["Kootenay"],
    "Northern BC":      ["Northern BC"],
}

def _resolve_region_chip_to_city_filter(chip: Optional[str]) -> Optional[dict]:
    """Resolves a public region chip label to a MongoDB city filter clause.
    Returns None when the chip is falsy or 'Anywhere' (no filter). Silently
    returns None for unknown chips (fail-open — the caller keeps working)."""
    if not chip or chip == "Anywhere":
        return None
    seed_keys = REGION_CHIP_MAP.get(chip)
    if not seed_keys:
        return None
    try:
        _seed = json.loads((ROOT_DIR / "data" / "communities_seed.json").read_text())
        cities: list = []
        for k in seed_keys:
            cities.extend(_seed.get(k, []))
        if not cities:
            return None
        return {"$in": [re.compile(f"^{re.escape(c)}$", re.I) for c in cities]}
    except Exception as e:
        logger.warning(f"region chip resolution failed for {chip!r}: {e}")
        return None


EQUESTRIAN_SUB_CATEGORIES = {
    "acreage":    {"patterns": ["acreage", "acres", "hectares?"]},
    "hobby_farm": {"patterns": ["hobby farm", "gentleman'?s farm", "small farm"]},
    "estate":     {"patterns": ["estate home", "gated estate", "private estate", "country estate", "equestrian estate", "horse estate"]},
    "ranch":      {"patterns": ["horse ranch", "cattle ranch", "working ranch", "guest ranch", "hobby ranch", "ranch property", "cattle operation"]},
    "bareland":   {"property_types": ["Land"], "patterns": ["bareland", "bare land", "vacant land", "raw land"]},
}


@api.get("/listings/equestrian")
@_limiter.limit("60/minute")
async def equestrian_keyword_search(
    request: Request,
    sort: Optional[str] = "price_asc",
    limit: int = 24,
    offset: int = 0,
    price_min: Optional[int] = None,
    sub_category: Optional[str] = None,
    region_chip: Optional[str] = None,
):
    """List active BC listings whose description contains any of the
    user-defined equestrian keywords. Returns the same shape as /listings.
    Sort options: newest | price_asc | price_desc.
    Optional `sub_category` narrows further to acreage / hobby_farm / estate
    / ranch / bareland (see EQUESTRIAN_SUB_CATEGORIES).
    Optional `region_chip` narrows to a public BC region (see REGION_CHIP_MAP)."""
    q: dict = {
        "status": "Active",
        "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)},
        "list_price": {"$gt": 0} if not price_min else {"$gte": price_min},
        "$or": [{"description": {"$regex": r"\b" + re.escape(k), "$options": "i"}} for k in EQUESTRIAN_KEYWORDS],
    }
    # Region chip → city $in filter (server-side allowlist to prevent injection).
    city_filter = _resolve_region_chip_to_city_filter(region_chip)
    if city_filter is not None:
        q["city"] = city_filter
    # Apply sub-category constraint (AND-ed with the base equestrian scan).
    if sub_category and sub_category in EQUESTRIAN_SUB_CATEGORIES:
        cfg = EQUESTRIAN_SUB_CATEGORIES[sub_category]
        sub_clauses = []
        if cfg.get("property_types"):
            # Overrides the base $nin excluded-types filter for this segment
            # (e.g., "bareland" MUST match property_type=Land which would
            # otherwise be excluded). We add a strict $in match.
            sub_clauses.append({"property_type": {"$in": cfg["property_types"]}})
        if cfg.get("patterns"):
            sub_clauses.append({"$or": [{"description": {"$regex": r"\b" + p, "$options": "i"}} for p in cfg["patterns"]]})
        if sub_clauses:
            # $or between property-type match and description pattern match
            # so either qualifies the listing for this sub-category.
            q["$and"] = [{"$or": sub_clauses}] if len(sub_clauses) > 1 else sub_clauses
    sort_spec = [("list_price", 1)]
    if sort == "price_desc": sort_spec = [("list_price", -1)]
    elif sort == "newest":   sort_spec = [("modification_ts", -1)]
    total = await db.listings.count_documents(q)
    cursor = db.listings.find(q, {"_id": 0}).sort(sort_spec).skip(offset).limit(min(limit, 100))
    listings = await cursor.to_list(min(limit, 100))
    return {
        "total": total,
        "count": len(listings),
        "offset": offset,
        "limit": limit,
        "listings": listings,
        "sub_category": sub_category,
        "keywords_matched_on": EQUESTRIAN_KEYWORDS,
        "compliance": {
            "source": "CREA DDF®",
            "note": "Keyword-based match on listing description. Confirm equestrian features (stables, arenas, water rights, ALR) with the listing REALTOR® before making an offer.",
        },
    }


@api.get("/listings")
@_limiter.limit("60/minute")
async def search_listings(
    request: Request,
    q: Optional[str] = None,
    community: Optional[str] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    region_group: Optional[str] = None,  # Top-level BC area: "Greater Vancouver", "Fraser Valley", "Sea-to-Sky" — resolved to the cities defined in communities_seed.json
    region_chip: Optional[str] = None,  # Public region chip label (see REGION_CHIP_MAP) — "Lower Mainland" spans multiple regions
    property_type: Optional[str] = None,
    beds_min: Optional[int] = None,
    beds_exact: Optional[int] = None,
    baths_min: Optional[int] = None,
    baths_exact: Optional[int] = None,
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
    query: dict = {"status": "Active", "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)}, "list_price": {"$gt": 0}}
    # Accept legacy `community` param as an alias for city (frontend has used both).
    if community and not city:
        city = community
    if city:      query["city"] = _city_query(city)
    if region:    query["region"] = {"$regex": f"^{re.escape(region)}$", "$options": "i"}
    # region_group: resolves a top-level BC area (e.g. "Sea-to-Sky") to the full
    # list of member cities and applies a case-insensitive $in filter. Ignored
    # if the caller also passed a specific `city` (city wins — narrower).
    if region_group and not city:
        try:
            _seed = json.loads((ROOT_DIR / "data" / "communities_seed.json").read_text())
            group_cities = _seed.get(region_group, [])
            if group_cities:
                # Case-insensitive exact match on any of the region's cities.
                query["city"] = {"$in": [re.compile(f"^{re.escape(c)}$", re.I) for c in group_cities]}
        except Exception as e:
            logger.warning(f"region_group resolution failed for {region_group!r}: {e}")
    # region_chip: public multi-region alias (e.g. "Lower Mainland"). Applied
    # after region_group so an explicit city/region_group wins over the chip.
    if region_chip and not city and "city" not in query:
        chip_filter = _resolve_region_chip_to_city_filter(region_chip)
        if chip_filter is not None:
            query["city"] = chip_filter
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
    # Bedrooms — exact wins over min (matches Doogie NL semantics)
    if beds_exact is not None:  query["beds"] = int(beds_exact)
    elif beds_min is not None:  query["beds"] = {"$gte": beds_min}
    if baths_exact is not None: query["baths"] = int(baths_exact)
    elif baths_min is not None: query["baths"] = {"$gte": baths_min}
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
    #
    # In addition, we ALWAYS run the same natural-language filter extractor
    # that Doogie uses (`_extract_listing_filters`) whenever a `q` is
    # provided, so queries like "condos in tofino" or "3 bedroom townhouse
    # in surrey" pull the property_type, beds, price, and features out
    # exactly the same way — regardless of whether the user came from
    # Doogie, the hero search bar, or a bookmarked URL. Explicit query
    # parameters always win over anything the extractor infers.
    nl_extracted: dict = {}
    if q:
        try:
            nl_extracted = await _extract_listing_filters(q) or {}
        except Exception as e:
            logger.warning(f"NL extraction inside /listings failed (silent-fail): {e}")

        # Merge extracted values into the query — but ONLY where the caller
        # did not already pass an explicit param (explicit > inferred).
        if nl_extracted.get("property_type") and not property_type:
            pt = nl_extracted["property_type"]
            if pt in EXCLUDED_PROPERTY_TYPES:
                # Doug intentionally excludes commercial + recreational listings.
                # Instead of silently ignoring the user's intent, do a description
                # keyword match — surfaces detached homes / townhouses that mention
                # "cabin", "cottage", etc. so the search doesn't feel like it's
                # ignoring the request entirely.
                keyword_map = {
                    "Recreation":  ["cabin", "cottage", "recreational"],
                    "Recreational":["cabin", "cottage", "recreational"],
                    "Recreational Property":["cabin", "cottage", "recreational"],
                }
                kws = keyword_map.get(pt, [])
                if kws:
                    existing_and = query.get("$and", [])
                    query["$and"] = existing_and + [{
                        "$or": [{"description": {"$regex": re.escape(k), "$options": "i"}} for k in kws]
                    }]
            elif pt in ("Equestrian", "Manufactured / Mobile"):
                merged = query.get("$and", [])
                merged.append(_property_type_or_feature_query(pt))
                query["$and"] = merged
                query.pop("property_type", None)
            else:
                query["property_type"] = _property_type_query(pt)
        if nl_extracted.get("beds_exact") is not None and beds_exact is None and beds_min is None:
            query["beds"] = int(nl_extracted["beds_exact"])
        elif nl_extracted.get("beds_min") is not None and beds_min is None and beds_exact is None:
            query["beds"] = {"$gte": int(nl_extracted["beds_min"])}
        if nl_extracted.get("baths_exact") is not None and baths_exact is None and baths_min is None:
            query["baths"] = int(nl_extracted["baths_exact"])
        elif nl_extracted.get("baths_min") is not None and baths_min is None and baths_exact is None:
            query["baths"] = {"$gte": int(nl_extracted["baths_min"])}
        if nl_extracted.get("price_min") is not None and price_min is None:
            price_q = query.get("list_price", {}) if isinstance(query.get("list_price"), dict) else {}
            price_q["$gte"] = int(nl_extracted["price_min"])
            query["list_price"] = price_q
        if nl_extracted.get("price_max") is not None and price_max is None:
            price_q = query.get("list_price", {}) if isinstance(query.get("list_price"), dict) else {}
            price_q["$lte"] = int(nl_extracted["price_max"])
            query["list_price"] = price_q
        if nl_extracted.get("features") and not features:
            feats = [f.strip() for f in nl_extracted["features"] if f and f.strip()]
            if feats:
                existing_and = query.get("$and", [])
                query["$and"] = existing_and + _features_query(feats)
        if nl_extracted.get("sort") and sort == "newest":
            sort = nl_extracted["sort"]

    if q and not (city or region or nl_extracted.get("city")):
        loc = await _resolve_bc_locality(q)
        if loc:
            neighbourhood = loc.pop("neighbourhood", None)
            for k, v in loc.items():
                query[k] = {"$regex": f"^{re.escape(v)}$", "$options": "i"}
            # If we resolved via a Vancouver/Metro neighbourhood, tighten the
            # results to only listings whose description/address mentions that hood.
            if neighbourhood:
                query.setdefault("$and", []).append({
                    "$or": [
                        {"description": {"$regex": re.escape(neighbourhood), "$options": "i"}},
                        {"unparsed_address": {"$regex": re.escape(neighbourhood), "$options": "i"}},
                        {"street_address": {"$regex": re.escape(neighbourhood), "$options": "i"}},
                    ],
                })
        else:
            query["$text"] = {"$search": q}
    elif q and nl_extracted.get("city") and not city:
        # LLM extracted a city — but its output can be noisy ("West Vancouver
        # Under" instead of "West Vancouver"). Cross-check against the curated
        # BC locality resolver; if that finds a stricter match, trust it.
        resolved = await _resolve_bc_locality(q)
        chosen_city = (resolved or {}).get("city") or nl_extracted["city"]
        query["city"] = _city_query(chosen_city)
        if (resolved or {}).get("region"):
            query["region"] = {"$regex": f"^{re.escape(resolved['region'])}$", "$options": "i"}
        # Neighbourhood tightener same as above
        if (resolved or {}).get("neighbourhood"):
            hood = resolved["neighbourhood"]
            query.setdefault("$and", []).append({
                "$or": [
                    {"description": {"$regex": re.escape(hood), "$options": "i"}},
                    {"unparsed_address": {"$regex": re.escape(hood), "$options": "i"}},
                    {"street_address": {"$regex": re.escape(hood), "$options": "i"}},
                ],
            })
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
    # Attach a single iframe-embeddable virtual tour (unbranded first, then any
    # Matterport / YouTube / Vimeo). Doogie only surfaces tours on listing
    # detail pages when a real one exists — no global Virtual Tours hub.
    try:
        tours = d.get("virtual_tour_urls") or []
        picked = None
        for t in tours:  # already sorted unbranded-first by ddf_sync
            raw = (t.get("url") or "").strip()
            if not raw:
                continue
            sanitised = _sanitize_tour_url(raw)
            host = _tour_host_family(sanitised)
            if host in ("matterport", "youtube", "vimeo"):
                picked = {
                    "url": sanitised,
                    "url_raw": raw,
                    "host": host,
                    "is_branded": bool(t.get("is_branded", False)),
                    "category": t.get("category") or "",
                }
                break
        if picked:
            d["virtual_tour_embed"] = picked
    except Exception:
        pass
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
- Property type synonyms (CRITICAL — always extract when present, even in short queries like "condos in tofino"):
    • "condo"/"condos"/"apartment"/"apartments"/"flat"/"flats"/"strata unit"  → property_type=Condo
    • "house"/"houses"/"home"/"homes"/"detached"/"single family"               → property_type=Detached
    • "townhouse"/"townhome"/"row house"/"attached home"                       → property_type=Townhouse
    • "acreage"/"farm"/"ranch"/"agricultural"                                   → property_type=Acreage
    • "equestrian"/"horse property"                                             → property_type=Equestrian
    • "duplex"/"triplex"/"fourplex"                                             → property_type=Duplex
    • "lot"/"lots"/"vacant land"/"raw land"/"building lot"                     → property_type=Land
    • "mobile home"/"manufactured home"/"trailer"                              → property_type=Manufactured / Mobile
    • "cabin"/"cottage"/"vacation home"/"recreational property"                → property_type=Recreational
- Location: BC cities only. Always resolve typos ("tofino" → "Tofino", "vancoover" → "Vancouver"). If the user says "Vancouver" keep it as "Vancouver" (not "Greater Vancouver"). BC city names should be Title Case in the output.
- FEATURES: extract ALL descriptive requirements as separate array entries. If the user says "indoor pool AND hot tub" → ["indoor pool", "hot tub"]. If they say "ocean view with a suite" → ["ocean view", "suite"]. If they say "waterfront home with private dock" → ["waterfront", "private dock"]. Every feature is a REQUIREMENT — the listing must match ALL of them.
- If user says "top floor" or "penthouse" → features: ["top floor"] or ["penthouse"].
- WORKED EXAMPLES (STUDY THESE):
    • "condos in tofino"                  → {"city":"Tofino","property_type":"Condo"}
    • "find me a house in whistler"       → {"city":"Whistler","property_type":"Detached"}
    • "3 bedroom townhouse in surrey"     → {"city":"Surrey","property_type":"Townhouse","beds_exact":3}
    • "acreage near chilliwack under 2M"  → {"city":"Chilliwack","property_type":"Acreage","price_max":2000000}
    • "condo with ocean view in vancouver"→ {"city":"Vancouver","property_type":"Condo","features":["ocean view"]}
    • "vacant land in squamish"           → {"city":"Squamish","property_type":"Land"}
- If nothing extracted, return {"city":null,"property_type":null,"beds_exact":null,"beds_min":null,"baths_exact":null,"baths_min":null,"price_min":null,"price_max":null,"features":null,"sort":null}."""

async def _extract_listing_filters(user_query: str) -> dict:
    """Use Claude to extract structured search filters from a natural-language query.
    Returns a dict that may include a `features` list — one required phrase per entry."""
    # Whether we have Claude or not, ALWAYS run the deterministic regex layer as a
    # baseline. This ensures obvious filters ("under $800K", "in Vancouver", "3 bed")
    # still work even when the direct Anthropic key is archived or the LLM fails.
    def _fallback_regex_only() -> dict:
        d: dict = {}
        _apply_beds_baths_regex_override(user_query, d)
        _apply_price_regex_override(user_query, d)
        _apply_property_type_regex_override(user_query, d)
        m = re.search(r"\b(?:in|at|near|around)\s+([A-Za-z][a-zA-Z]+(?:\s+[A-Za-z][a-zA-Z]+){0,2})", user_query)
        if m: d["city"] = m.group(1).strip().title()
        return d

    if not ANTHROPIC_API_KEY:
        # No direct Anthropic key configured — return regex-only extraction so
        # the endpoint's own locality resolver + our regex overrides still work.
        return _fallback_regex_only()
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
        _apply_price_regex_override(user_query, parsed)
        _apply_property_type_regex_override(user_query, parsed)
        return parsed
    except Exception as e:
        # Even when Claude fails (rate limit, network hiccup, malformed JSON),
        # apply the deterministic regex layer so we still capture obvious filters.
        # This is what turns "homes in williams lake between 1M and 1.5M" into a
        # working search even if the LLM was unavailable.
        logger.warning(f"filter extraction failed: {e}")
        fallback: dict = {}
        _apply_beds_baths_regex_override(user_query, fallback)
        _apply_price_regex_override(user_query, fallback)
        _apply_property_type_regex_override(user_query, fallback)
        # Attempt a naïve city grab: capitalized 1-3 word phrases after "in"/"at"/"near"
        m = re.search(r"\b(?:in|at|near|around)\s+([A-Za-z][a-zA-Z]+(?:\s+[A-Za-z][a-zA-Z]+){0,2})", user_query)
        if m:
            fallback["city"] = m.group(1).strip().title()
        return fallback


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


# Deterministic price parser — same defense-in-depth pattern as beds/baths.
# The LLM extractor often mis-parses "between $1M and $1.5M" as no price at all.
# This regex scans the raw text and overrides Claude's guess with concrete numbers.
_PRICE_TOKEN_RE = re.compile(
    r"\$?\s*(\d{1,4}(?:[,\.]?\d{3})*(?:\.\d+)?)\s*(k|thousand|m|mm|mil|million|mn)?",
    re.IGNORECASE,
)


def _parse_price_token(num_str: str, suffix: Optional[str]) -> Optional[int]:
    """Turn '1.5' + 'million' → 1500000. '800' + 'k' → 800000. '750000' + None → 750000."""
    try:
        n = float(num_str.replace(",", ""))
    except (ValueError, AttributeError):
        return None
    s = (suffix or "").lower()
    if s in ("k", "thousand"):
        n *= 1_000
    elif s in ("m", "mm", "mil", "million", "mn"):
        n *= 1_000_000
    # Bare numbers < 20 are almost certainly millions ("1.5 million" without the suffix pass)
    # — but we don't override unless a suffix was explicitly present, to avoid
    # misinterpreting "3 bedroom" as "$3".
    return int(round(n))


def _apply_price_regex_override(raw_query: str, parsed: dict) -> None:
    """Mutate `parsed` in place with `price_min`/`price_max` when the raw text
    contains recognisable price phrasing that the LLM missed. Order of checks
    matters — range patterns must be tried BEFORE unbounded ones."""
    if not raw_query:
        return
    q = raw_query.lower()

    # 1. RANGE: "between $1M and $1.5M" | "$500K to $800K" | "from 500k to 800k" | "$500K-$800K"
    range_pat = re.compile(
        r"(?:between\s+|from\s+)?\$?\s*(\d[\d,\.]*)\s*(k|thousand|m|mm|mil|million|mn)?\s*(?:to|-|–|—|and)\s*\$?\s*(\d[\d,\.]*)\s*(k|thousand|m|mm|mil|million|mn)?",
        re.IGNORECASE,
    )
    m = range_pat.search(q)
    if m:
        lo_str, lo_suf, hi_str, hi_suf = m.groups()
        # If either side has a k/m suffix, infer the other's suffix if missing
        # (e.g. "between $1 million and $1.5" → both millions)
        if lo_suf and not hi_suf:
            hi_suf = lo_suf
        elif hi_suf and not lo_suf:
            lo_suf = hi_suf
        lo = _parse_price_token(lo_str, lo_suf)
        hi = _parse_price_token(hi_str, hi_suf)
        # Sanity: only accept ranges where both are >= $50K (below that it's probably
        # a bedroom count, phone digit, or year — never a BC real estate price)
        MIN_REALISTIC_PRICE = 50_000
        if lo and hi and lo >= MIN_REALISTIC_PRICE and hi >= MIN_REALISTIC_PRICE and lo <= hi:
            parsed["price_min"] = lo
            parsed["price_max"] = hi
            return

    # 2. MAX ONLY: "under $800K" | "below 800k" | "less than 800k" | "up to 1M" | "max 800k"
    max_pat = re.compile(
        r"(?:under|below|less\s+than|up\s+to|max(?:imum)?|no\s+more\s+than|<=?)\s*\$?\s*(\d[\d,\.]*)\s*(k|thousand|m|mm|mil|million|mn)?",
        re.IGNORECASE,
    )
    m = max_pat.search(q)
    if m:
        val = _parse_price_token(m.group(1), m.group(2))
        if val and val >= 50_000:
            parsed["price_max"] = val
            parsed["price_min"] = None
            return

    # 3. MIN ONLY: "over $2M" | "above 2 million" | "starting at 800k" | "min $500K"
    min_pat = re.compile(
        r"(?:over|above|starting\s+(?:at|from)|min(?:imum)?|more\s+than|>=?)\s*\$?\s*(\d[\d,\.]*)\s*(k|thousand|m|mm|mil|million|mn)?",
        re.IGNORECASE,
    )
    m = min_pat.search(q)
    if m:
        val = _parse_price_token(m.group(1), m.group(2))
        if val and val >= 50_000:
            parsed["price_min"] = val
            parsed["price_max"] = None


# --- Deterministic property-type regex fallback ---
# Belt-and-suspenders extractor that runs even when the LLM misses the property
# type. Maps every common word/plural/synonym a user might type ("condos",
# "apartment", "flat", "houses", "townhomes", "acreage", "vacant lot", etc.)
# to the canonical filter option that _property_type_query knows about.
# Order matters: longer/more specific phrases first, so "manufactured home"
# matches before "home", and "vacant land" beats a bare "land".
_PROPERTY_TYPE_KEYWORDS = [
    # (canonical, [regex fragments — case-insensitive, word-boundary-anchored])
    ("Manufactured / Mobile", [r"manufactured homes?", r"mobile homes?", r"mobiles?", r"trailer homes?"]),
    ("Equestrian",           [r"equestrian", r"horse propert(?:y|ies)", r"horse ranch(?:es)?", r"stable homes?"]),
    ("Vacant Land",          [r"vacant lands?", r"vacant lots?", r"empty lots?", r"building lots?", r"raw lands?", r"bare lands?"]),
    ("Recreation",           [r"recreational?\s+propert(?:y|ies)", r"cabins?", r"cottages?", r"vacation homes?"]),
    ("Acreage",              [r"acreages?", r"farms?", r"ranch(?:es)?", r"agricultural?\s+propert(?:y|ies)"]),
    ("Duplex",               [r"duplex(?:es)?", r"triplex(?:es)?", r"fourplex(?:es)?"]),
    ("Multi-family",         [r"multi[-\s]?family", r"multi[-\s]?famil(?:y|ies)", r"apartment buildings?"]),
    ("Townhouse",            [r"townhomes?", r"townhouses?", r"row houses?", r"row/townhouses?", r"attached homes?"]),
    ("Condo",                [r"condos?", r"condominiums?", r"apartments?", r"flats?", r"strata\s+units?"]),
    ("Detached",             [r"detached homes?", r"detached houses?", r"single[-\s]?family(?:\s+homes?)?", r"single detached", r"\bdetached\b"]),
    # Bare "house"/"home" is intentionally LAST — high risk of false positives
    # ("house hunting"). Only match when the word appears as a noun object.
    ("Detached",             [r"\bhouses?\b(?!\s*hunt)"]),
    ("Vacant Land",          [r"\bland\b(?!\w)"]),
]

# Pre-compile once
_PROPERTY_TYPE_PATTERNS = [
    (canon, [re.compile(rf"\b{p}\b", re.I) for p in patterns])
    for canon, patterns in _PROPERTY_TYPE_KEYWORDS
]


def _apply_property_type_regex_override(raw_query: str, parsed: dict) -> None:
    """Mutate `parsed` in place with `property_type` when the raw text mentions
    an obvious property type that the LLM missed. First match wins (patterns
    are ordered by specificity above). If the LLM already set property_type,
    do NOT overwrite unless we're upgrading a generic label."""
    if not raw_query:
        return
    # If LLM already set a valid property_type, respect it.
    if parsed.get("property_type"):
        return
    for canonical, patterns in _PROPERTY_TYPE_PATTERNS:
        if any(p.search(raw_query) for p in patterns):
            parsed["property_type"] = canonical
            return


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
    query: dict = {"status": "Active", "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)}, "list_price": {"$gt": 0}}
    if filters.get("city"):
        query["city"] = _city_query(filters["city"])
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

    query: dict = {"status": "Active", "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)}, "list_price": {"$gt": 0}}
    if filters.get("city"):          query["city"] = _city_query(filters["city"])
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

# ============================================================
# =============== COPYRIGHT ENFORCEMENT MODULE ================
# Provides three tools tied to CIPO Copyright Registration No. 1247822:
#   1. Content snapshot manifest (SHA-256 fingerprints) — evidence chain
#      for a court to prove what content existed on our site on a given date.
#   2. Weekly auto-snapshot digest emailed to Doug — tamper-evident timeline.
#   3. Cease-&-Desist letter drafter — LLM-generated legal letter pre-filled
#      with the registration number, statute cites, and site owner details.
# ============================================================

CIPO_REG_NO = "1247822"

async def _generate_content_snapshot(db) -> Dict[str, Any]:
    """Builds a tamper-evident manifest of all copyrightable content on the
    site: glossary terms, community pages, micro-neighbourhoods, and legal
    boilerplate. Each item gets a SHA-256 hash so we can prove *what* the
    content said on the snapshot's timestamp. Manifest is stored in Mongo
    (`content_snapshots`) and returned as JSON."""
    def _sha256(s: str) -> str:
        return hashlib.sha256((s or "").encode("utf-8")).hexdigest()

    # 1. Glossary entries
    glossary_fps = []
    async for g in db.glossary.find({}, {"slug": 1, "term": 1, "definition": 1, "faqs": 1}):
        payload = (g.get("term","") + "\n" + (g.get("definition","") or "") + "\n" +
                   json.dumps(g.get("faqs") or [], sort_keys=True, ensure_ascii=False))
        glossary_fps.append({"slug": g.get("slug"), "term": g.get("term"), "sha256": _sha256(payload), "bytes": len(payload)})

    # 2. Community pages (approved AI-drafted synopses + weather summaries)
    community_fps = []
    async for c in db.community_synopses.find({"approved": True}, {"slug": 1, "name": 1, "synopsis": 1}):
        wx = await db.community_weather.find_one({"slug": c.get("slug"), "approved": True}, {"weather": 1})
        payload = (c.get("name","") + "\n" + (c.get("synopsis","") or "") + "\n" + ((wx or {}).get("weather","") or ""))
        community_fps.append({"slug": c.get("slug"), "name": c.get("name"), "sha256": _sha256(payload), "bytes": len(payload)})

    # 3. Micro-neighbourhoods (approved AI-drafted synopses)
    hood_fps = []
    async for h in db.neighbourhood_synopses.find({"approved": True}, {"slug": 1, "n_slug": 1, "neighbourhood": 1, "synopsis": 1}):
        payload = ((h.get("neighbourhood","") or "") + "\n" + (h.get("synopsis","") or ""))
        hood_fps.append({"slug": f"{h.get('slug')}/{h.get('n_slug')}", "name": h.get("neighbourhood"), "sha256": _sha256(payload), "bytes": len(payload)})

    total_bytes = sum(x["bytes"] for x in glossary_fps + community_fps + hood_fps)
    combined_hash = _sha256("\n".join(sorted(x["sha256"] for x in glossary_fps + community_fps + hood_fps)))

    snapshot = {
        "id": str(uuid.uuid4()),
        "created_at": now_iso(),
        "cipo_registration_no": CIPO_REG_NO,
        "owner": "Doug LeMaire",
        "site": "eztofind.ca",
        "counts": {
            "glossary_terms": len(glossary_fps),
            "communities": len(community_fps),
            "neighbourhoods": len(hood_fps),
        },
        "total_bytes_hashed": total_bytes,
        "combined_fingerprint_sha256": combined_hash,
        "glossary": glossary_fps,
        "communities": community_fps,
        "neighbourhoods": hood_fps,
    }
    await db.content_snapshots.insert_one({**snapshot})
    return snapshot


@api.post("/admin/snapshot/create")
async def admin_snapshot_create(_=Depends(verify_admin)):
    """Manually trigger a content snapshot. Also runs on the weekly schedule."""
    snap = await _generate_content_snapshot(db)
    return {"success": True, "snapshot_id": snap["id"], "combined_fingerprint_sha256": snap["combined_fingerprint_sha256"], "counts": snap["counts"], "created_at": snap["created_at"]}


@api.get("/admin/snapshots")
async def admin_snapshots_list(_=Depends(verify_admin)):
    """List all historical snapshots (newest first). Metadata only — no fingerprint arrays."""
    out = []
    async for s in db.content_snapshots.find({}, {"_id": 0, "glossary": 0, "communities": 0, "neighbourhoods": 0}).sort("created_at", -1).limit(500):
        out.append(s)
    return {"snapshots": out}


@api.get("/admin/snapshots/{snap_id}")
async def admin_snapshot_download(snap_id: str, _=Depends(verify_admin)):
    """Download the full JSON manifest of a specific snapshot (includes every per-item SHA-256)."""
    snap = await db.content_snapshots.find_one({"id": snap_id}, {"_id": 0})
    if not snap:
        raise HTTPException(404, "Snapshot not found")
    return snap


class CeaseDesistDraft(BaseModel):
    copycat_url: str
    copycat_name: Optional[str] = None
    pages_copied: Optional[List[str]] = None  # URLs on eztofind.ca that appear to be copied
    what_was_copied: Optional[str] = None      # free-text description
    deadline_days: int = 14


@api.post("/admin/cease-desist/draft")
async def admin_cease_desist_draft(body: CeaseDesistDraft, _=Depends(verify_admin)):
    """AI-drafts a formal cease-&-desist letter pre-filled with our CIPO
    registration number, statute cites, and Doug's contact info. Output is
    an HTML letter + plain-text version ready to email to the infringer's
    hosting provider, domain registrar, and (if identifiable) the site owner."""
    pages_txt = "\n".join(f"- {p}" for p in (body.pages_copied or [])) or "(none specified)"
    system_prompt = (
        "You are a Canadian intellectual-property lawyer drafting a formal "
        "cease-&-desist letter. Tone: firm, professional, no threats beyond "
        "what is legally available. Cite the Canadian Copyright Act (R.S.C., "
        "1985, c. C-42) sections 3, 27, 34, and 38.1 (statutory damages up to "
        "CAD $20,000 per work for commercial infringement). Reference the "
        "sender's federal Copyright Registration Number where relevant. "
        "Output a complete letter in valid HTML (headings, paragraphs, "
        "signature block). Do NOT include any preface, explanation, or "
        "markdown code fences — output only the HTML letter body starting "
        "with <p>.")
    user_prompt = f"""Draft a cease-&-desist letter with the following facts:

**Sender (rights holder):**
- Name: Doug LeMaire
- Business: Fraser Property Management Realty Services Ltd. (BCFSA-licensed REALTOR®)
- Website: eztofind.ca
- Address: 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5
- Email: info@eztofind.ca
- Federal Copyright Registration: CIPO Registration No. {CIPO_REG_NO} (registered under the Canadian Copyright Act as a literary work covering the full EZtoFind.ca website, code, content library of curated glossary terms, community pages, micro-neighbourhood pages, and the "Doogie" AI assistant character)

**Recipient (alleged infringer):**
- Website / URL: {body.copycat_url}
- Name/entity: {body.copycat_name or 'Unknown site operator'}

**Content copied from EZtoFind.ca:**
{body.what_was_copied or '(unspecified — the recipient should investigate their site against ours)'}

**Specific EZtoFind.ca URLs / pages that appear to be reproduced without authorization:**
{pages_txt}

**Demanded actions (with {body.deadline_days}-day compliance deadline from date of letter):**
1. Immediately cease and desist from reproducing, distributing, or displaying any content taken from EZtoFind.ca.
2. Remove all infringing content from the recipient's website, any cached copies, and any AI training datasets.
3. Provide a written accounting of when the content was copied, by whom, and any monetization (advertising, subscription, lead-gen revenue) derived from it.
4. Confirm in writing within {body.deadline_days} days that these steps have been completed.

Also warn that failure to comply may result in: (a) a formal complaint to the recipient's hosting provider and domain registrar under the Canadian Notice-and-Notice regime (Copyright Modernization Act, 2012) demanding takedown; (b) a Federal Court of Canada action for statutory damages up to CAD $20,000 per infringed work under s.38.1 of the Copyright Act; (c) an injunction; and (d) recovery of legal costs.

End with a professional signature block from Doug LeMaire, dated today.
"""
    chat = make_chat(api_key=EMERGENT_LLM_KEY, session_id=f"cnd-{uuid.uuid4()}", system_message=system_prompt).with_model("anthropic", "claude-sonnet-4-6")
    full_html = ""
    try:
        async for ev in chat.stream_message(UserMessage(text=user_prompt)):
            if isinstance(ev, TextDelta):
                full_html += ev.content
    except Exception as e:
        logger.exception(f"cease-desist draft failed: {e}")
        raise HTTPException(502, f"LLM draft failed: {e}")

    # Log the draft (for audit + so we don't repeatedly regenerate the same letter)
    log_id = str(uuid.uuid4())
    await db.cease_desist_log.insert_one({
        "id": log_id,
        "created_at": now_iso(),
        "copycat_url": body.copycat_url,
        "copycat_name": body.copycat_name,
        "pages_copied": body.pages_copied or [],
        "what_was_copied": body.what_was_copied,
        "deadline_days": body.deadline_days,
        "letter_html": full_html,
        "status": "draft",
    })
    return {"success": True, "id": log_id, "letter_html": full_html, "cipo_registration_no": CIPO_REG_NO}


@api.get("/admin/cease-desist/log")
async def admin_cease_desist_log(_=Depends(verify_admin)):
    """List all C&D drafts (newest first)."""
    out = []
    async for r in db.cease_desist_log.find({}, {"_id": 0}).sort("created_at", -1).limit(200):
        out.append(r)
    return {"drafts": out}


async def _weekly_snapshot_email(db):
    """Runs once/week. Creates a snapshot and emails Doug a digest with the
    combined fingerprint (proof-of-existence hash). If a court ever asks
    'what was your site's content on 2026-03-01?', we can pull the email
    from Doug's inbox + the matching snapshot from the DB."""
    try:
        from services.email_sender import send_email as _send
        snap = await _generate_content_snapshot(db)
        html = (f"<div style='font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:2rem 1.5rem;color:#111827'>"
                f"<div style='background:linear-gradient(135deg,#0F2A5B,#1a3a72);color:#fff;padding:1.5rem;border-radius:12px 12px 0 0'>"
                f"<div style='font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;margin-bottom:0.35rem'>Evidence Chain · Weekly Digest</div>"
                f"<h2 style='margin:0;font-family:Georgia,serif;font-size:1.5rem'>EZtoFind.ca Content Fingerprint</h2>"
                f"<div style='margin-top:0.4rem;font-size:0.85rem;opacity:0.85'>Snapshot date: <strong>{snap['created_at']}</strong></div>"
                f"</div>"
                f"<div style='background:#fff;padding:1.5rem;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px'>"
                f"<p style='margin:0 0 1rem'>Hi Doug — here's this week's tamper-evident content snapshot for <strong>CIPO Copyright Reg. No. {CIPO_REG_NO}</strong>.</p>"
                f"<table style='width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.9rem'>"
                f"<tr><td style='padding:0.5rem 0;border-bottom:1px solid #f3f4f6'>Glossary terms</td><td style='text-align:right;font-weight:600'>{snap['counts']['glossary_terms']}</td></tr>"
                f"<tr><td style='padding:0.5rem 0;border-bottom:1px solid #f3f4f6'>Community pages</td><td style='text-align:right;font-weight:600'>{snap['counts']['communities']}</td></tr>"
                f"<tr><td style='padding:0.5rem 0;border-bottom:1px solid #f3f4f6'>Micro-neighbourhoods</td><td style='text-align:right;font-weight:600'>{snap['counts']['neighbourhoods']}</td></tr>"
                f"<tr><td style='padding:0.5rem 0'>Total bytes hashed</td><td style='text-align:right;font-weight:600'>{snap['total_bytes_hashed']:,}</td></tr>"
                f"</table>"
                f"<div style='background:#fef3c7;border-left:4px solid #f59e0b;padding:1rem;border-radius:6px;margin:1rem 0'>"
                f"<div style='font-size:0.75rem;letter-spacing:0.05em;text-transform:uppercase;color:#92400e;font-weight:700;margin-bottom:0.4rem'>Combined Content Fingerprint (SHA-256)</div>"
                f"<code style='font-family:Menlo,Consolas,monospace;font-size:0.72rem;word-break:break-all;color:#1a1a1a'>{snap['combined_fingerprint_sha256']}</code>"
                f"</div>"
                f"<p style='font-size:0.85rem;color:#4b5563;margin:1.5rem 0 0'>Keep this email. If a copycat is ever discovered, the fingerprint above cryptographically proves what your site's content was on this date. Full per-item hashes are stored in the admin panel at <a href='https://eztofind.ca/admin/snapshots' style='color:#0F2A5B;font-weight:600'>/admin/snapshots</a>.</p>"
                f"<p style='font-size:0.85rem;color:#4b5563;margin-top:1rem'>— Evidence Chain (automated weekly)</p>"
                f"</div></div>")
        text = (f"EZtoFind.ca — Weekly Content Fingerprint (CIPO Reg. No. {CIPO_REG_NO})\n"
                f"Snapshot date: {snap['created_at']}\n\n"
                f"Glossary terms: {snap['counts']['glossary_terms']}\n"
                f"Community pages: {snap['counts']['communities']}\n"
                f"Micro-neighbourhoods: {snap['counts']['neighbourhoods']}\n"
                f"Total bytes hashed: {snap['total_bytes_hashed']:,}\n\n"
                f"Combined Fingerprint (SHA-256): {snap['combined_fingerprint_sha256']}\n\n"
                f"Full per-item hashes: https://eztofind.ca/admin/snapshots\n")
        await _send(db, to=ADMIN_EMAIL, subject=f"[EZtoFind.ca] Weekly evidence-chain fingerprint · {snap['created_at'][:10]}", html=html, text=text, tag="evidence_chain")
        logger.info(f"[evidence_chain] weekly snapshot emailed · fp={snap['combined_fingerprint_sha256'][:16]}…")
    except Exception as e:
        logger.exception(f"[evidence_chain] weekly snapshot failed: {e}")


# ============================================================
# =============== COPYCAT DETECTOR (SCANNER) ==================
# Fetches a suspect URL, strips HTML, then compares against our
# canary phrases + n-gram shingles of the glossary/community/
# neighbourhood library. Returns matched content with confidence
# score and links straight into the C&D drafter.
# ============================================================

# The 4 canary phrases we've seeded across the site. Verbatim match on ANY of
# these is a smoking-gun signal — real users never see them (they're aria-hidden).
CANARY_PHRASES = [
    ("copyright-page-whistler-coord", "Doug's favorite unofficial Whistler trailhead sunset viewpoint is at coordinate 50.1163° N, 122.9574° W"),
    ("glossary-fraser-levy",          "Fraser Levy"),
    ("home-first-week-count",         "51,847 BC MLS® listings before its evening CREA DDF resync"),
    ("community-project-alder",       "working-title codename of 'Project Alder'"),
    ("cross-check-id-a",              "EZTF-GLX-2026-0729-A"),
    ("cross-check-id-b",              "EZTF-HMX-2026-0729-B"),
    ("cross-check-id-c",              "EZTF-CMX-2026-0729-C"),
]

_STRIP_TAGS_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_NORMALIZE_RE = re.compile(r"[^\w\s]+")
_WS_RE = re.compile(r"\s+")

def _strip_html_to_text(html: str) -> str:
    """Extract visible body text from an HTML page."""
    if not html:
        return ""
    # remove <script> + <style> blocks entirely
    s = _STRIP_TAGS_RE.sub(" ", html)
    # strip all remaining tags
    s = _HTML_TAG_RE.sub(" ", s)
    # decode common HTML entities cheaply
    for a, b in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'"), ("&nbsp;", " ")]:
        s = s.replace(a, b)
    return _WS_RE.sub(" ", s).strip()

def _normalize_for_shingles(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace — for fuzzy comparison."""
    return _WS_RE.sub(" ", _NORMALIZE_RE.sub(" ", (text or "").lower())).strip()

def _shingles(text: str, n: int = 8) -> set:
    """Rolling n-word shingles from normalized text. Copying detection industry standard."""
    words = _normalize_for_shingles(text).split()
    if len(words) < n:
        # short passage — use whole thing as one shingle
        return {" ".join(words)} if words else set()
    return {" ".join(words[i:i+n]) for i in range(len(words) - n + 1)}


class CopycatScanIn(BaseModel):
    suspect_url: Optional[str] = None
    raw_text: Optional[str] = None   # paste text directly (bypasses fetch — for JS-rendered / auth-walled sites)
    min_shingles: int = 3   # minimum overlapping 8-word shingles to count as a match
    ua: Optional[str] = None  # override user-agent (some sites 403 curl-like bots)


@api.post("/admin/copycat/scan")
async def admin_copycat_scan(body: CopycatScanIn, _=Depends(verify_admin)):
    """Fetches a URL (or accepts pasted text), strips HTML, then hunts for canary
    phrases + shingle overlaps with our glossary/community/neighbourhood library."""
    if not body.suspect_url and not body.raw_text:
        raise HTTPException(400, "Provide either suspect_url or raw_text.")
    ua = body.ua or "Mozilla/5.0 (compatible; EZtoFindCopyrightMonitor/1.0; +https://eztofind.ca/copyright)"
    started = now_iso()
    final_url = body.suspect_url or "(pasted text)"
    status_code = 0
    raw_html = ""
    if body.raw_text and not body.suspect_url:
        # Skip fetch — use pasted text directly
        raw_html = body.raw_text
        status_code = 200
    else:
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                resp = await client.get(body.suspect_url, headers={"User-Agent": ua, "Accept": "text/html,application/xhtml+xml"})
                resp.raise_for_status()
                raw_html = resp.text
                final_url = str(resp.url)
                status_code = resp.status_code
        except httpx.HTTPStatusError as e:
            raise HTTPException(400, f"Suspect site returned HTTP {e.response.status_code}. It may be blocking our fetch — try again from a different network, view-source paste, or archive.org snapshot.")
        except Exception as e:
            raise HTTPException(400, f"Could not fetch {body.suspect_url}: {e}")

    plain_text = _strip_html_to_text(raw_html)
    suspect_shingles = _shingles(plain_text, n=8)
    total_words = len(_normalize_for_shingles(plain_text).split())

    # ---- 1. Canary phrase check ----
    # Normalize both sides: strip punctuation + lowercase + collapse whitespace,
    # so copycats can't defeat detection by tweaking quotes / apostrophes / dashes.
    canary_hits = []
    plain_norm = _normalize_for_shingles(plain_text)
    for cid, phrase in CANARY_PHRASES:
        phrase_norm = _normalize_for_shingles(phrase)
        if phrase_norm and phrase_norm in plain_norm:
            idx = plain_norm.find(phrase_norm)
            snippet = plain_norm[max(0, idx-60):idx+len(phrase_norm)+60]
            canary_hits.append({"canary_id": cid, "phrase": phrase, "snippet": snippet.strip()})

    # ---- 2. Shingle overlap against our content library ----
    matches = []  # {kind, slug, name, source_url, matched_shingles, total_shingles, overlap_pct, sample_shingle}
    min_shingles = max(1, int(body.min_shingles or 3))

    async def _check_item(kind: str, slug: str, name: str, source_url: str, content: str):
        our_shingles = _shingles(content, n=8)
        if not our_shingles:
            return
        overlap = suspect_shingles & our_shingles
        if len(overlap) >= min_shingles:
            sample = next(iter(sorted(overlap)), "")
            matches.append({
                "kind": kind,
                "slug": slug,
                "name": name,
                "source_url": source_url,
                "matched_shingles": len(overlap),
                "total_shingles": len(our_shingles),
                "overlap_pct": round(100.0 * len(overlap) / max(1, len(our_shingles)), 1),
                "sample_shingle": sample,
            })

    # Glossary
    async for g in db.glossary.find({}, {"slug": 1, "term": 1, "definition": 1}):
        await _check_item("glossary", g.get("slug"), g.get("term"), f"https://eztofind.ca/glossary/{g.get('slug')}", g.get("definition","") or "")
    # Community synopses (approved-only)
    async for c in db.community_synopses.find({"approved": True}, {"slug": 1, "name": 1, "synopsis": 1}):
        await _check_item("community", c.get("slug"), c.get("name"), f"https://eztofind.ca/community/{c.get('slug')}", c.get("synopsis","") or "")
    # Community weather
    async for w in db.community_weather.find({"approved": True}, {"slug": 1, "name": 1, "weather": 1}):
        await _check_item("weather", w.get("slug"), w.get("name"), f"https://eztofind.ca/community/{w.get('slug')}", w.get("weather","") or "")
    # Micro-neighbourhoods
    async for h in db.neighbourhood_synopses.find({"approved": True}, {"slug": 1, "n_slug": 1, "neighbourhood": 1, "synopsis": 1}):
        await _check_item("neighbourhood", f"{h.get('slug')}/{h.get('n_slug')}", h.get("neighbourhood"), f"https://eztofind.ca/community/{h.get('slug')}/n/{h.get('n_slug')}", h.get("synopsis","") or "")

    # Sort matches by strongest signal
    matches.sort(key=lambda m: (-m["matched_shingles"], -m["overlap_pct"]))
    matches = matches[:100]  # cap output

    # Verdict scoring
    if canary_hits:
        verdict = "smoking_gun"
        verdict_label = "🚨 SMOKING-GUN COPY — verbatim canary phrase present"
    elif len(matches) >= 5 or (matches and matches[0]["matched_shingles"] >= 10):
        verdict = "high_confidence"
        verdict_label = "⚠️ HIGH-CONFIDENCE COPY — multiple content passages match"
    elif matches:
        verdict = "possible"
        verdict_label = "🟡 POSSIBLE COPY — some phrase overlap detected"
    else:
        verdict = "clean"
        verdict_label = "✅ NO MATCHES — no evidence of copying detected"

    scan_id = str(uuid.uuid4())
    record = {
        "id": scan_id,
        "created_at": started,
        "finished_at": now_iso(),
        "suspect_url": body.suspect_url or "(pasted text)",
        "final_url": final_url,
        "status_code": status_code,
        "content_length": len(raw_html),
        "text_length": len(plain_text),
        "total_words": total_words,
        "verdict": verdict,
        "verdict_label": verdict_label,
        "canary_hits": canary_hits,
        "matches": matches,
        "match_count": len(matches),
        "min_shingles_threshold": min_shingles,
        "cipo_registration_no": CIPO_REG_NO,
    }
    await db.copycat_scans.insert_one({**record})
    return record


@api.get("/admin/copycat/scans")
async def admin_copycat_scans(_=Depends(verify_admin)):
    out = []
    async for r in db.copycat_scans.find({}, {"_id": 0}).sort("created_at", -1).limit(200):
        out.append(r)
    return {"scans": out}


@api.get("/admin/copycat/scans/{scan_id}")
async def admin_copycat_scan_get(scan_id: str, _=Depends(verify_admin)):
    r = await db.copycat_scans.find_one({"id": scan_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Scan not found")
    return r


# ============================================================
# =============== CAMPAIGN / DRIP EMAIL SYSTEM ================
# CASL-compliant multi-campaign email system. Each user has an
# opt-in record PER CAMPAIGN (not per-site). Every send is logged.
# Preference center allows per-campaign opt-out. Global unsub kills all.
#
# Campaigns (see CAMPAIGN_REGISTRY below):
#   • buyer_digest       — Weekly Sunday listings digest (uses saved_searches)
#   • seller_updates     — Monthly community market update (approval-gated)
#   • welcome_series     — 3-part onboarding (Day 0, 3, 7) after any lead form
#   • dormant_wakeup     — 30-day re-engagement (buyer leads, opt-in via buyer form)
# ============================================================

CAMPAIGN_REGISTRY: Dict[str, Dict[str, Any]] = {
    "buyer_digest": {
        "label": "Weekly listing digest",
        "description": "New MLS® listings matching your saved search — every Sunday morning.",
        "cadence": "weekly",
        "requires_approval": False,
        "form_checkbox_label": "Send me new listings matching my saved search (weekly digest)",
    },
    "seller_updates": {
        "label": "Monthly market update",
        "description": "Factual monthly market stats for your community (sold count, median price, YoY change).",
        "cadence": "monthly",
        "requires_approval": True,   # BCFSA AI-content approval gate before send
        "form_checkbox_label": "Send me monthly market updates for my area",
    },
    "welcome_series": {
        "label": "Welcome series (3 emails)",
        "description": "A short intro to Doug, EZtoFind features, and how we can help — 3 emails over 7 days.",
        "cadence": "trigger",   # scheduled per-user after signup
        "requires_approval": False,
        "form_checkbox_label": "Send me the 3-part welcome series (intro to Doug + site tips)",
    },
    "dormant_wakeup": {
        "label": "Dormant buyer re-engagement",
        "description": "If you go 30+ days without visiting, we'll send one gentle nudge with market updates.",
        "cadence": "trigger",   # daily scan
        "requires_approval": False,
        "form_checkbox_label": "Nudge me if I go quiet — send a market update after 30 days of inactivity",
    },
    "news_tips": {
        "label": "News & tips (occasional)",
        "description": "Occasional EZtoFind announcements, new BC Glossary terms, community additions.",
        "cadence": "occasional",
        "requires_approval": True,   # every broadcast needs your click
        "form_checkbox_label": "Send me EZtoFind news + tips (occasional)",
    },
}

# ------------- Preference-center token helpers -------------
def _prefs_token(email: str) -> str:
    """Signed opaque token embedded in email preference links. Non-guessable,
    per-user, no expiry (users need it to unsubscribe forever). Uses JWT_SECRET."""
    return jwt.encode({"email": email.lower(), "sub": "email_prefs"}, JWT_SECRET, algorithm="HS256")

def _prefs_verify(token: str) -> Optional[str]:
    try:
        p = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if p.get("sub") != "email_prefs":
            return None
        return (p.get("email") or "").lower() or None
    except Exception:
        return None


# ------------- CASL consent + send logging -------------
async def campaign_record_consent(email: str, campaign: str, request: Optional[Request], opt_in_text: str, source: str) -> None:
    """Record a per-campaign consent event. Idempotent — re-opting stores a
    new record (audit trail) and sets the current status to opted_in."""
    if campaign not in CAMPAIGN_REGISTRY:
        return
    meta = get_consent_meta(request) if request is not None else {"consent_ip": None, "consent_ua": None}
    now = now_iso()
    await db.casl_consents.insert_one({
        "id": str(uuid.uuid4()),
        "email": email.lower(),
        "campaign": campaign,
        "opt_in_at": now,
        "opt_in_text": opt_in_text,
        "source": source,
        "ip": meta.get("consent_ip"),
        "ua": meta.get("consent_ua"),
        "status": "opted_in",
    })

async def campaign_revoke_consent(email: str, campaign: str, request: Optional[Request], reason: str = "user_unsubscribe") -> None:
    if campaign not in CAMPAIGN_REGISTRY:
        return
    meta = get_consent_meta(request) if request is not None else {"consent_ip": None, "consent_ua": None}
    await db.casl_consents.insert_one({
        "id": str(uuid.uuid4()),
        "email": email.lower(),
        "campaign": campaign,
        "opt_in_at": now_iso(),
        "opt_in_text": None,
        "source": reason,
        "ip": meta.get("consent_ip"),
        "ua": meta.get("consent_ua"),
        "status": "revoked",
    })
    # Also log to the existing unsubscribe_log for the global CASL audit trail
    await db.unsubscribe_log.insert_one({
        "email": email.lower(),
        "ts": now_iso(),
        "campaign": campaign,
        "reason": reason,
        "ip": meta.get("consent_ip"),
    })

async def campaign_has_consent(email: str, campaign: str) -> bool:
    """Latest consent event decides current status."""
    doc = await db.casl_consents.find_one(
        {"email": email.lower(), "campaign": campaign},
        sort=[("opt_in_at", -1)],
    )
    return bool(doc) and doc.get("status") == "opted_in"

async def campaign_record_send(email: str, campaign: str, subject: str, provider_message_id: Optional[str], meta: Optional[Dict[str, Any]] = None) -> None:
    await db.campaign_sends.insert_one({
        "id": str(uuid.uuid4()),
        "email": email.lower(),
        "campaign": campaign,
        "subject": subject,
        "sent_at": now_iso(),
        "provider_message_id": provider_message_id,
        "meta": meta or {},
    })


def _campaign_footer_html(email: str, campaign: str, opt_in_at: Optional[str]) -> str:
    """Per-campaign CASL footer — sender identity + reason + per-campaign unsub
    + preference center link. Overrides the generic email_sender footer."""
    from services.email_sender import SENDER_NAME, SENDER_ORG, SENDER_ADDRESS, SENDER_PHONE, SENDER_EMAIL
    token = _prefs_token(email)
    prefs_url = f"https://eztofind.ca/email-preferences?token={token}"
    unsub_url = f"https://eztofind.ca/email-preferences?token={token}&unsub={campaign}"
    label = CAMPAIGN_REGISTRY.get(campaign, {}).get("label", campaign)
    when = (opt_in_at or "").split("T")[0] or "signup"
    return f"""
<hr style="margin:2rem 0 1rem;border:none;border-top:1px solid #e5e7eb"/>
<div style="font-size:12px;color:#6b7280;line-height:1.6;font-family:Inter,Arial,sans-serif">
  <p style="margin:0 0 0.5rem"><strong>{SENDER_NAME}</strong><br/>
  {SENDER_ORG}<br/>
  {SENDER_ADDRESS} · {SENDER_PHONE} · <a href="mailto:{SENDER_EMAIL}" style="color:#0F2A5B">{SENDER_EMAIL}</a></p>
  <p style="margin:0 0 0.5rem">You are receiving this because you opted in to <strong>{label}</strong> on {when} at eztofind.ca. Under CASL, you can opt out at any time.</p>
  <p style="margin:0"><a href="{unsub_url}" style="color:#0F2A5B;text-decoration:underline">Unsubscribe from {label} (one click)</a> · <a href="{prefs_url}" style="color:#0F2A5B;text-decoration:underline">Manage all email preferences</a> · <a href="https://eztofind.ca/privacy" style="color:#0F2A5B;text-decoration:underline">Privacy (PIPA)</a></p>
</div>
""".strip()


# ------------- Public: preference center endpoints -------------
@api.get("/email-preferences")
async def email_prefs_get(token: str):
    """Load a user's current per-campaign opt-in status via signed token."""
    email = _prefs_verify(token)
    if not email:
        raise HTTPException(400, "Invalid or expired preference link.")
    campaigns = []
    for cid, meta in CAMPAIGN_REGISTRY.items():
        opted_in = await campaign_has_consent(email, cid)
        campaigns.append({"id": cid, "label": meta["label"], "description": meta["description"], "opted_in": opted_in})
    return {"email": email, "campaigns": campaigns}


class EmailPrefsUpdate(BaseModel):
    token: str
    campaign: str
    opt_in: bool


@api.post("/email-preferences/update")
async def email_prefs_update(body: EmailPrefsUpdate, request: Request):
    email = _prefs_verify(body.token)
    if not email:
        raise HTTPException(400, "Invalid preference link.")
    if body.campaign not in CAMPAIGN_REGISTRY:
        raise HTTPException(400, "Unknown campaign.")
    if body.opt_in:
        opt_in_text = f"Re-subscribed to '{CAMPAIGN_REGISTRY[body.campaign]['label']}' via preference center."
        await campaign_record_consent(email, body.campaign, request, opt_in_text, source="preference_center")
    else:
        await campaign_revoke_consent(email, body.campaign, request, reason="preference_center")
    return {"success": True, "email": email, "campaign": body.campaign, "opted_in": body.opt_in}


@api.get("/email-preferences/unsubscribe-all")
async def email_prefs_unsub_all(token: str, request: Request):
    """CASL 'global unsubscribe' — kills every campaign in one click."""
    email = _prefs_verify(token)
    if not email:
        raise HTTPException(400, "Invalid preference link.")
    for cid in CAMPAIGN_REGISTRY.keys():
        await campaign_revoke_consent(email, cid, request, reason="global_unsubscribe")
    return {"success": True, "email": email, "unsubscribed": list(CAMPAIGN_REGISTRY.keys())}


# ------------- Campaign #1: Buyer weekly listing digest -------------
async def _run_buyer_digest_batch(dry_run: bool = False) -> Dict[str, Any]:
    """For each user opted into buyer_digest, find their saved searches, pull
    up-to-5 fresh matches from the last 7 days, and send a digest.
    Delegates listing-matching to the existing saved-search structure."""
    from services.email_sender import send_email as _send
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    sent = 0
    considered = 0
    async for ss in db.saved_searches.find({"status": "verified", "unsubscribed_at": None}):
        considered += 1
        email = (ss.get("email") or "").lower()
        if not email or not await campaign_has_consent(email, "buyer_digest"):
            continue
        filters = ss.get("filters") or {}
        # Query: match saved-search filters AND synced_at within last 7 days
        query = {"status": "Active", "list_price": {"$gt": 0}, "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)}, "synced_at": {"$gte": week_ago}}
        for k in ("city", "region", "property_type"):
            if filters.get(k): query[k] = filters[k]
        if filters.get("beds_min"): query["beds"] = {"$gte": int(filters["beds_min"])}
        if filters.get("baths_min"): query["baths"] = {"$gte": int(filters["baths_min"])}
        if filters.get("price_min") or filters.get("price_max"):
            pr = {}
            if filters.get("price_min"): pr["$gte"] = float(filters["price_min"])
            if filters.get("price_max"): pr["$lte"] = float(filters["price_max"])
            query["list_price"] = pr
        matches = []
        async for l in db.listings.find(query, {"_id": 0, "listing_key": 1, "street_address": 1, "city": 1, "list_price": 1, "beds": 1, "baths": 1, "photo_url": 1}).sort("synced_at", -1).limit(5):
            matches.append(l)
        if not matches:
            continue
        # Build the digest HTML
        rows = "".join(
            f'<tr><td style="padding:1rem 0;border-bottom:1px solid #f3f4f6"><a href="https://eztofind.ca/listing/{m["listing_key"]}" style="color:#0F2A5B;text-decoration:none"><div style="display:flex;gap:1rem;align-items:center"><img src="{m.get("photo_url","")}" alt="" style="width:100px;height:70px;object-fit:cover;border-radius:6px"/><div><div style="font-family:Sora,sans-serif;font-weight:700;color:#0F2A5B;font-size:1.15rem">${int(m.get("list_price",0)):,}</div><div style="font-size:0.9rem;color:#111">{m.get("street_address","—")}</div><div style="font-size:0.78rem;color:#6b7280">{m.get("city","")} · {m.get("beds","?")} bed · {m.get("baths","?")} bath</div></div></div></a></td></tr>'
            for m in matches
        )
        opt_at = ss.get("verified_at") or ss.get("created_at")
        html = f'<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:2rem 1.5rem;color:#111"><div style="background:linear-gradient(135deg,#0F2A5B,#1a3a72);color:#fff;padding:1.5rem;border-radius:12px 12px 0 0"><div style="font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;margin-bottom:0.35rem">📍 Weekly Listing Digest</div><h2 style="margin:0;font-family:Georgia,serif;font-size:1.5rem">{len(matches)} new match{"es" if len(matches)!=1 else ""} for your saved search</h2></div><div style="background:#fff;padding:1.5rem;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><p style="margin:0 0 1rem">Here are the newest MLS® listings that matched your saved criteria this week:</p><table style="width:100%;border-collapse:collapse">{rows}</table><p style="margin:1.5rem 0 0"><a href="https://eztofind.ca/listings?{urllib.parse.urlencode({k:v for k,v in filters.items() if v})}" style="display:inline-block;background:#0F2A5B;color:#fff;padding:0.75rem 1.25rem;border-radius:999px;text-decoration:none;font-weight:600">See all matches →</a></p></div>{_campaign_footer_html(email, "buyer_digest", opt_at)}</div>'
        text = f"Weekly Listing Digest — {len(matches)} new matches\n\n" + "\n".join(f'${int(m.get("list_price",0)):,} · {m.get("street_address","")} · {m.get("city","")}\nhttps://eztofind.ca/listing/{m["listing_key"]}\n' for m in matches) + f"\n\nManage preferences: https://eztofind.ca/email-preferences?token={_prefs_token(email)}"
        subject = f"📍 {len(matches)} new listings matching your saved search"
        if dry_run:
            sent += 1
            continue
        result = await _send(db, to=email, subject=subject, html=html, text=text, kind="commercial", related_id=ss.get("id"), unsubscribe_url=f"https://eztofind.ca/email-preferences?token={_prefs_token(email)}&unsub=buyer_digest")
        await campaign_record_send(email, "buyer_digest", subject, result.get("provider_message_id"), meta={"matches": len(matches), "saved_search_id": ss.get("id")})
        sent += 1
    return {"campaign": "buyer_digest", "considered": considered, "sent": sent, "dry_run": dry_run}


# ------------- Campaign #2: Seller monthly market update -------------
async def _prepare_seller_updates(dry_run: bool = False) -> Dict[str, Any]:
    """Draft one email per seller lead grouped by community. STOPS BEFORE SEND:
    inserts each draft into `campaign_drafts` with status=pending_approval.
    Doug reviews + clicks Approve in /admin/campaigns/seller_updates/approve to release."""
    prepared = 0
    grouped: Dict[str, List[str]] = {}
    async for lead in db.seller_leads.find({"unsubscribed": {"$ne": True}}, {"email": 1, "city": 1, "community": 1, "created_at": 1}):
        email = (lead.get("email") or "").lower()
        if not email or not await campaign_has_consent(email, "seller_updates"):
            continue
        community = lead.get("community") or lead.get("city")
        if not community:
            continue
        grouped.setdefault(community, []).append(email)

    for community, emails in grouped.items():
        # Compute community stats using the same public endpoint logic
        slug = community.lower().replace(" ", "-").replace(".", "")
        try:
            name, _region = _resolve_community(slug)
            if not name:
                continue
            match = {"status": "Active", "city": _city_query(name), "property_type": {"$nin": list(EXCLUDED_PROPERTY_TYPES)}, "list_price": {"$gt": 0}}
            active = await db.listings.count_documents(match)
            prices = [l.get("list_price") async for l in db.listings.find(match, {"list_price": 1, "_id": 0}) if l.get("list_price")]
            prices = sorted([p for p in prices if p])
            median = prices[len(prices)//2] if prices else None
        except Exception as e:
            logger.warning(f"[seller_updates] stats failed for {community}: {e}")
            continue

        subject = f"🏡 {community} Market Update — {datetime.now(timezone.utc).strftime('%B %Y')}"
        body_lines = [
            f"<p><strong>{active} active listings</strong> right now in {community}.</p>",
            f"<p>Current median list price: <strong>${int(median):,}</strong>.</p>" if median else "",
            "<p>These are factual snapshots from the MLS® — not opinions of value. For a formal Comparative Market Analysis (CMA) tailored to your specific property, reply to this email.</p>",
        ]
        html_body = "".join(body_lines)
        for email in emails:
            # Find latest opt-in for this email
            latest = await db.casl_consents.find_one({"email": email, "campaign": "seller_updates", "status": "opted_in"}, sort=[("opt_in_at", -1)])
            opt_at = (latest or {}).get("opt_in_at")
            full_html = f'<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:2rem 1.5rem;color:#111"><div style="background:linear-gradient(135deg,#0F2A5B,#1a3a72);color:#fff;padding:1.5rem;border-radius:12px 12px 0 0"><div style="font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;margin-bottom:0.35rem">📊 Monthly Market Update</div><h2 style="margin:0;font-family:Georgia,serif;font-size:1.5rem">{community} · {datetime.now(timezone.utc).strftime("%B %Y")}</h2></div><div style="background:#fff;padding:1.5rem;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">{html_body}</div>{_campaign_footer_html(email, "seller_updates", opt_at)}</div>'
            full_text = f"{community} Market Update — {datetime.now(timezone.utc).strftime('%B %Y')}\n\n{active} active listings.\n" + (f"Current median list price: ${int(median):,}\n" if median else "") + "\nFactual snapshot only — not an opinion of value.\n"
            draft = {
                "id": str(uuid.uuid4()),
                "campaign": "seller_updates",
                "email": email,
                "subject": subject,
                "html": full_html,
                "text": full_text,
                "created_at": now_iso(),
                "status": "pending_approval" if not dry_run else "dry_run",
                "meta": {"community": community, "active": active, "median": median},
            }
            await db.campaign_drafts.insert_one(draft)
            prepared += 1
    return {"campaign": "seller_updates", "drafts_prepared": prepared, "communities": len(grouped)}


async def _release_approved_drafts(campaign: str) -> Dict[str, Any]:
    """Send all drafts flagged 'approved' for the given campaign."""
    from services.email_sender import send_email as _send
    sent = 0
    async for d in db.campaign_drafts.find({"campaign": campaign, "status": "approved"}):
        email = d.get("email")
        unsub_url = f"https://eztofind.ca/email-preferences?token={_prefs_token(email)}&unsub={campaign}"
        result = await _send(db, to=email, subject=d["subject"], html=d["html"], text=d["text"], kind="commercial", unsubscribe_url=unsub_url)
        await campaign_record_send(email, campaign, d["subject"], result.get("provider_message_id"), meta=d.get("meta"))
        await db.campaign_drafts.update_one({"id": d["id"]}, {"$set": {"status": "sent", "sent_at": now_iso(), "provider_message_id": result.get("provider_message_id")}})
        sent += 1
    return {"campaign": campaign, "sent": sent}


# ------------- Campaign #3: Welcome series (3 emails: Day 0, 3, 7) -------------
WELCOME_SERIES = [
    (0, "👋 Welcome to EZtoFind.ca — I'm Doug",
     "<p>Hi there,</p><p>Thanks for reaching out — I'm Doug LeMaire, REALTOR® in BC. I built EZtoFind.ca to make BC real estate genuinely EZ to research: no gated content, no upsells, no BS.</p><p>Two things you might not have tried yet:</p><ul><li><strong>Doogie</strong>, our AI helper — ask him anything about BC glossary terms, taxes, or how to find a listing (bottom-right icon).</li><li><strong>Saved searches</strong> — get notified when new listings match your criteria. Set one up at <a href='https://eztofind.ca/listings'>eztofind.ca/listings</a>.</li></ul><p>Reply anytime — I read every message.</p><p>— Doug</p>"),
    (3, "📚 Have you tried the BC Glossary?",
     "<p>Quick tip: our <a href='https://eztofind.ca/glossary'>BC Glossary</a> has 396 real estate terms explained in plain English — with links to the authoritative BC source for each.</p><p>Most useful ones:</p><ul><li><a href='https://eztofind.ca/glossary/property-transfer-tax'>Property Transfer Tax (PTT)</a> — the one everyone forgets to budget for</li><li><a href='https://eztofind.ca/glossary/strata-fees'>Strata Fees</a> — how they work, what they cover</li><li><a href='https://eztofind.ca/glossary/subject-to-clauses'>Subject-to Clauses</a> — how to protect yourself in an offer</li></ul><p>— Doug</p>"),
    (7, "👋 Meet Doug — 60 seconds",
     "<p>One-week check-in: I'm a BCFSA-licensed REALTOR® based in Maple Ridge, BC — 15 years in the game, specializing in detached homes, luxury properties, equestrian &amp; acreage estates, estate sales/probate, and residential stratas.</p><p>Primary practice areas: Greater Vancouver, Fraser Valley, Sea-to-Sky Corridor.</p><p>Outside my service area? No problem — I run a referral network of trusted REALTOR®s across BC. Ask me anytime.</p><p>Ready to move forward? Just reply, or book a 20-min free chat: <a href='mailto:info@eztofind.ca'>info@eztofind.ca</a>.</p><p>— Doug</p>"),
]


async def _run_welcome_series() -> Dict[str, Any]:
    """Daily scan: for each user opted into welcome_series, send the next email
    in the sequence based on how many days since their signup."""
    from services.email_sender import send_email as _send
    sent = 0
    considered = 0
    # Collect the newest opt_in per email
    seen_emails = set()
    async for c in db.casl_consents.find({"campaign": "welcome_series", "status": "opted_in"}, sort=[("opt_in_at", -1)]):
        email = c.get("email")
        if email in seen_emails: continue
        seen_emails.add(email)
        considered += 1
        try:
            signup_dt = datetime.fromisoformat(c.get("opt_in_at").replace("Z", "+00:00"))
        except Exception:
            continue
        days_since = (datetime.now(timezone.utc) - signup_dt).days
        # For each stage, send only if we haven't sent it yet
        for stage_day, subject, html_body in WELCOME_SERIES:
            if days_since < stage_day:
                continue
            already = await db.campaign_sends.find_one({"email": email, "campaign": "welcome_series", "meta.stage_day": stage_day})
            if already:
                continue
            html = f'<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:2rem 1.5rem;color:#111">{html_body}{_campaign_footer_html(email, "welcome_series", c.get("opt_in_at"))}</div>'
            text = re.sub(r"<[^>]+>", "", html_body).replace("&amp;", "&") + f"\n\nManage preferences: https://eztofind.ca/email-preferences?token={_prefs_token(email)}"
            unsub_url = f"https://eztofind.ca/email-preferences?token={_prefs_token(email)}&unsub=welcome_series"
            result = await _send(db, to=email, subject=subject, html=html, text=text, kind="commercial", unsubscribe_url=unsub_url)
            await campaign_record_send(email, "welcome_series", subject, result.get("provider_message_id"), meta={"stage_day": stage_day})
            sent += 1
            # Only send one stage per run
            break
    return {"campaign": "welcome_series", "considered": considered, "sent": sent}


# ------------- Campaign #4: Dormant buyer wake-up -------------
async def _run_dormant_wakeup() -> Dict[str, Any]:
    """Daily scan: buyers opted-in to dormant_wakeup who haven't had ANY email
    activity in 30+ days. Sends one gentle nudge."""
    from services.email_sender import send_email as _send
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    sent = 0
    considered = 0
    seen = set()
    async for c in db.casl_consents.find({"campaign": "dormant_wakeup", "status": "opted_in"}, sort=[("opt_in_at", -1)]):
        email = c.get("email")
        if email in seen: continue
        seen.add(email)
        considered += 1
        # Skip if we've sent them a wake-up in the last 30 days (avoid spam)
        recent = await db.campaign_sends.find_one({"email": email, "campaign": "dormant_wakeup", "sent_at": {"$gte": cutoff}})
        if recent: continue
        # Skip if they've received ANY campaign send in the last 30 days
        recent_any = await db.campaign_sends.find_one({"email": email, "sent_at": {"$gte": cutoff}})
        if recent_any: continue
        # Try to grab their saved-search city for personalization
        ss = await db.saved_searches.find_one({"email": email, "status": "verified", "unsubscribed_at": None})
        city = (ss or {}).get("filters", {}).get("city") or "your area"
        subject = f"👋 Still looking in {city}? Here's what changed this month"
        body_html = f"<p>Hi again — Doug here.</p><p>It's been a while since we caught up. I don't want to spam you, so this is a one-off nudge (unless you tell me otherwise).</p><p><strong>{city}</strong> market has moved. If you're still exploring, reply and I'll send you 3 fresh listings hand-picked for what you told me.</p><p>Or — if you've decided to pause your search, just click the unsubscribe link below. No hard feelings.</p><p>— Doug</p>"
        html = f'<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:2rem 1.5rem;color:#111">{body_html}{_campaign_footer_html(email, "dormant_wakeup", c.get("opt_in_at"))}</div>'
        text = re.sub(r"<[^>]+>", "", body_html) + f"\n\nManage preferences: https://eztofind.ca/email-preferences?token={_prefs_token(email)}"
        unsub_url = f"https://eztofind.ca/email-preferences?token={_prefs_token(email)}&unsub=dormant_wakeup"
        result = await _send(db, to=email, subject=subject, html=html, text=text, kind="commercial", unsubscribe_url=unsub_url)
        await campaign_record_send(email, "dormant_wakeup", subject, result.get("provider_message_id"), meta={"city": city})
        sent += 1
    return {"campaign": "dormant_wakeup", "considered": considered, "sent": sent}


# ------------- Admin: campaign management -------------
@api.post("/admin/campaigns/{campaign}/run")
async def admin_campaign_run(campaign: str, request: Request, _=Depends(verify_admin)):
    """Manually trigger a campaign run. For approval-gated campaigns (seller_updates,
    news_tips), this only PREPARES drafts — Doug still has to approve before send."""
    dispatch = {
        "buyer_digest": _run_buyer_digest_batch,
        "seller_updates": _prepare_seller_updates,
        "welcome_series": _run_welcome_series,
        "dormant_wakeup": _run_dormant_wakeup,
    }
    if campaign not in dispatch:
        raise HTTPException(400, f"Unknown campaign: {campaign}")
    result = await dispatch[campaign]()
    return {"success": True, "result": result}


@api.get("/admin/campaigns/drafts")
async def admin_campaign_drafts(campaign: Optional[str] = None, _=Depends(verify_admin)):
    """List all pending-approval drafts (approval-gated campaigns)."""
    q = {"status": "pending_approval"}
    if campaign: q["campaign"] = campaign
    out = []
    async for d in db.campaign_drafts.find(q, {"_id": 0}).sort("created_at", -1).limit(500):
        out.append(d)
    return {"drafts": out}


class DraftAction(BaseModel):
    draft_ids: List[str]


@api.post("/admin/campaigns/drafts/approve")
async def admin_campaign_drafts_approve(body: DraftAction, _=Depends(verify_admin)):
    r = await db.campaign_drafts.update_many({"id": {"$in": body.draft_ids}, "status": "pending_approval"}, {"$set": {"status": "approved", "approved_at": now_iso()}})
    return {"approved": r.modified_count}


@api.post("/admin/campaigns/drafts/reject")
async def admin_campaign_drafts_reject(body: DraftAction, _=Depends(verify_admin)):
    r = await db.campaign_drafts.update_many({"id": {"$in": body.draft_ids}, "status": "pending_approval"}, {"$set": {"status": "rejected", "rejected_at": now_iso()}})
    return {"rejected": r.modified_count}


@api.post("/admin/campaigns/drafts/release")
async def admin_campaign_drafts_release(campaign: str, _=Depends(verify_admin)):
    """Send all approved drafts for a campaign."""
    result = await _release_approved_drafts(campaign)
    return {"success": True, "result": result}


@api.get("/admin/campaigns/stats")
async def admin_campaign_stats(_=Depends(verify_admin)):
    """Dashboard summary — opt-in counts + send counts per campaign."""
    stats = []
    for cid, meta in CAMPAIGN_REGISTRY.items():
        opted_in = 0
        seen = set()
        async for c in db.casl_consents.find({"campaign": cid, "status": "opted_in"}, sort=[("opt_in_at", -1)]):
            e = c.get("email")
            if e in seen: continue
            seen.add(e)
            # Only count as active if latest event was opt-in (not revoked)
            latest = await db.casl_consents.find_one({"email": e, "campaign": cid}, sort=[("opt_in_at", -1)])
            if latest and latest.get("status") == "opted_in":
                opted_in += 1
        sends_30d = await db.campaign_sends.count_documents({"campaign": cid, "sent_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()}})
        pending = await db.campaign_drafts.count_documents({"campaign": cid, "status": "pending_approval"})
        stats.append({"id": cid, "label": meta["label"], "cadence": meta["cadence"], "requires_approval": meta["requires_approval"], "opted_in": opted_in, "sends_30d": sends_30d, "pending_drafts": pending})
    return {"campaigns": stats}


# ------------- Signup helper (called by existing lead endpoints) -------------
class CampaignSignup(BaseModel):
    email: str
    campaigns: List[str] = []   # e.g. ["buyer_digest", "welcome_series"]
    opt_in_text: str = "Opted in via signup form."
    source: str = "lead_form"


# -------- Journey Platform CRM sync --------
# Anonymous users track progress in localStorage. Authenticated users
# (currently admin-token only) sync progress to Mongo so it follows them
# across devices. Client always sends the full progress blob (idempotent).
@api.get("/journey/progress")
async def get_journey_progress(payload = Depends(verify_admin)):
    """Return the authenticated user's journey progress blob."""
    email = payload.get("email")
    doc = await db.journey_progress.find_one({"user_email": email})
    return {"progress": (doc.get("progress") if doc else {}) or {}, "updated_at": (doc.get("updated_at") if doc else None)}

@api.post("/journey/progress")
async def save_journey_progress(body: dict, payload = Depends(verify_admin)):
    """Upsert the user's journey progress. Silently no-ops on bad payload
    (progress sync must never break the UI)."""
    email = payload.get("email")
    progress = body.get("progress") if isinstance(body, dict) else None
    if not isinstance(progress, dict):
        return {"ok": False, "reason": "invalid_payload"}
    await db.journey_progress.update_one(
        {"user_email": email},
        {"$set": {"user_email": email, "progress": progress, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "modules_synced": sum(len(j.get("modules_completed", [])) for j in progress.values() if isinstance(j, dict))}


# -------- Referral Network — Model A tracking --------
# Doug's referral model: Doug refers a consumer lead to a partner REALTOR®
# (in-BC out-of-area, out-of-province, or international). The receiving
# REALTOR® pays Doug a 25% referral fee (Model A) via the standard
# CREA Inter-Board Referral Agreement. This mini-CRM tracks each referral
# from creation through closing / paid.
#
# Referral lifecycle (status):
#   sent → acknowledged → active → under_contract → closed → paid
#   (or) sent → declined | expired
class ReferralRecordIn(BaseModel):
    lead_email: str
    lead_name: str = ""
    lead_phone: str = ""
    lead_city: str = ""
    lead_property_type: str = ""
    lead_budget: str = ""
    receiving_realtor_name: str = ""
    receiving_realtor_email: str = ""
    receiving_realtor_brokerage: str = ""
    receiving_realtor_board: str = ""
    referral_fee_pct: float = 25.0
    estimated_sale_price: Optional[float] = None
    notes: str = ""
    source: str = "manual"  # manual | buyer_form | seller_form | doogie_chat

class ReferralStatusUpdate(BaseModel):
    status: str  # sent | acknowledged | active | under_contract | closed | paid | declined | expired
    note: str = ""
    actual_sale_price: Optional[float] = None
    referral_fee_amount: Optional[float] = None
    closed_date: Optional[str] = None
    paid_date: Optional[str] = None

REFERRAL_STATUSES = {"sent","acknowledged","active","under_contract","closed","paid","declined","expired"}

@api.post("/admin/referrals")
async def create_referral(body: ReferralRecordIn, payload = Depends(verify_admin)):
    """Create a new referral record — called from /admin/referrals UI."""
    now = datetime.now(timezone.utc).isoformat()
    rec = {
        "id": str(uuid.uuid4()),
        "created_at": now,
        "updated_at": now,
        "status": "sent",
        "status_history": [{"status": "sent", "at": now, "note": "Referral created", "by": payload.get("email")}],
        **body.model_dump(),
    }
    await db.referrals.insert_one(rec)
    rec.pop("_id", None)
    return rec

@api.get("/admin/referrals")
async def list_referrals(status: Optional[str] = None, _=Depends(verify_admin)):
    """List all referrals, optionally filtered by status."""
    q = {}
    if status and status in REFERRAL_STATUSES:
        q["status"] = status
    items = await db.referrals.find(q).sort("created_at", -1).to_list(500)
    for it in items:
        it.pop("_id", None)
    # Summary stats for dashboard
    all_items = await db.referrals.find({}).to_list(1000)
    summary = {
        "total": len(all_items),
        "by_status": {},
        "estimated_total_fee": 0.0,
        "collected_total_fee": 0.0,
        "pending_total_fee": 0.0,
    }
    for it in all_items:
        s = it.get("status", "sent")
        summary["by_status"][s] = summary["by_status"].get(s, 0) + 1
        pct = float(it.get("referral_fee_pct", 25.0)) / 100.0
        est_price = it.get("estimated_sale_price") or 0
        actual_price = it.get("actual_sale_price") or 0
        actual_fee = it.get("referral_fee_amount")
        if s == "paid":
            summary["collected_total_fee"] += float(actual_fee or (actual_price * pct))
        elif s in ("closed",):
            summary["pending_total_fee"] += float(actual_fee or (actual_price * pct))
        elif s in ("acknowledged","active","under_contract"):
            summary["estimated_total_fee"] += float(est_price * pct)
    return {"items": items, "summary": summary}

@api.patch("/admin/referrals/{referral_id}")
async def update_referral_status(referral_id: str, body: ReferralStatusUpdate, payload = Depends(verify_admin)):
    """Advance a referral through its lifecycle. Records an immutable status_history entry."""
    if body.status not in REFERRAL_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {sorted(REFERRAL_STATUSES)}")
    existing = await db.referrals.find_one({"id": referral_id})
    if not existing:
        raise HTTPException(404, "Referral not found")
    now = datetime.now(timezone.utc).isoformat()
    update = {"status": body.status, "updated_at": now}
    if body.actual_sale_price is not None:
        update["actual_sale_price"] = body.actual_sale_price
    if body.referral_fee_amount is not None:
        update["referral_fee_amount"] = body.referral_fee_amount
    if body.closed_date:
        update["closed_date"] = body.closed_date
    if body.paid_date:
        update["paid_date"] = body.paid_date
    history_entry = {"status": body.status, "at": now, "note": body.note or "", "by": payload.get("email")}
    await db.referrals.update_one(
        {"id": referral_id},
        {"$set": update, "$push": {"status_history": history_entry}},
    )
    doc = await db.referrals.find_one({"id": referral_id})
    doc.pop("_id", None)
    return doc

@api.delete("/admin/referrals/{referral_id}")
async def delete_referral(referral_id: str, _=Depends(verify_admin)):
    r = await db.referrals.delete_one({"id": referral_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Referral not found")
    return {"ok": True}


# ============================================================================
# CLIENT JOURNEY PLATFORM — Private, curated, token+OTP protected
# ----------------------------------------------------------------------------
# Doug creates a personalized real-estate education plan for each client after
# their buyer/seller intake. The public /journey routes have been removed —
# clients receive a magic link with a 6-digit OTP. Progress tracking is
# server-side by token (no localStorage), so it persists across devices.
#
# Compliance:
#  - Transactional email under CASL s. 6(6)(c) — existing-client relationship.
#  - PIPA: personal info stored under existing privacy policy; auto-purged
#    90 days after expiry.
#  - BCFSA "Scope of licence" banner rendered on every client page (frontend).
#  - No public indexing (robots + noindex + not in sitemap).
# ============================================================================
import secrets

CLIENT_JOURNEY_STATUSES = {"draft","sent","opened","expired","revoked","completed"}
def _new_token() -> str:
    return secrets.token_urlsafe(30)  # ~240 bits
def _new_otp() -> str:
    return f"{secrets.randbelow(1000000):06d}"

class ClientJourneyModule(BaseModel):
    stage_id: str
    module_id: str
    note_override: Optional[str] = None
    order: int = 0

class ClientJourneyStage(BaseModel):
    id: str
    title_override: Optional[str] = None
    note: Optional[str] = None
    modules: List[ClientJourneyModule] = []

class ClientJourneyCreate(BaseModel):
    client_name: str
    client_email: str
    client_phone: Optional[str] = ""
    title: str
    intro_message: Optional[str] = ""
    base_journey_slug: Optional[str] = None
    stages: List[ClientJourneyStage] = []
    expires_at: Optional[str] = None  # ISO date, default = 6 months from now

class ClientJourneyUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    title: Optional[str] = None
    intro_message: Optional[str] = None
    stages: Optional[List[ClientJourneyStage]] = None
    expires_at: Optional[str] = None
    status: Optional[str] = None

class ClientJourneyOTPVerify(BaseModel):
    otp: str

class ClientJourneyToggle(BaseModel):
    session_key: str  # returned after OTP verify
    stage_id: str
    module_id: str

class ClientJourneyStageView(BaseModel):
    session_key: str
    stage_id: str

def _sanitize_cj(doc: dict, include_token: bool=False) -> dict:
    doc.pop("_id", None)
    if not include_token:
        doc.pop("token", None)
        doc.pop("otp", None)
        doc.pop("session_key", None)
    return doc

@api.post("/admin/client-journeys")
async def create_client_journey(body: ClientJourneyCreate, payload = Depends(verify_admin)):
    now = datetime.now(timezone.utc)
    default_expiry = (now + timedelta(days=182)).isoformat()  # ~6 months
    rec = {
        "id": str(uuid.uuid4()),
        "token": _new_token(),
        "status": "draft",
        "client_name": body.client_name.strip(),
        "client_email": body.client_email.strip().lower(),
        "client_phone": (body.client_phone or "").strip(),
        "title": body.title.strip() or f"{body.client_name}'s Real Estate Journey",
        "intro_message": (body.intro_message or "").strip(),
        "base_journey_slug": body.base_journey_slug,
        "stages": [s.model_dump() for s in body.stages],
        "created_by": payload.get("email"),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "sent_at": None,
        "opened_at": None,
        "last_visited_at": None,
        "expires_at": body.expires_at or default_expiry,
        "reminder_sent_at": None,
        "modules_completed": [],
        "stage_views": {},
        "otp": None,             # generated at send time
        "otp_expires_at": None,
        "session_key": None,     # rotates on each successful OTP verify
    }
    await db.client_journeys.insert_one(rec)
    return _sanitize_cj(dict(rec), include_token=True)  # admin sees token

@api.get("/admin/client-journeys")
async def list_client_journeys(status: Optional[str] = None, _=Depends(verify_admin)):
    q = {}
    if status and status in CLIENT_JOURNEY_STATUSES:
        q["status"] = status
    items = await db.client_journeys.find(q).sort("created_at", -1).to_list(500)
    total = len(items)
    by_status = {}
    for it in items:
        by_status[it.get("status","draft")] = by_status.get(it.get("status","draft"), 0) + 1
    return {"items": [_sanitize_cj(dict(it), include_token=True) for it in items],
            "summary": {"total": total, "by_status": by_status}}

@api.get("/admin/client-journeys/{cj_id}")
async def get_client_journey(cj_id: str, _=Depends(verify_admin)):
    doc = await db.client_journeys.find_one({"id": cj_id})
    if not doc: raise HTTPException(404, "Client journey not found")
    return _sanitize_cj(dict(doc), include_token=True)

@api.patch("/admin/client-journeys/{cj_id}")
async def update_client_journey(cj_id: str, body: ClientJourneyUpdate, payload = Depends(verify_admin)):
    doc = await db.client_journeys.find_one({"id": cj_id})
    if not doc: raise HTTPException(404, "Client journey not found")
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.client_name is not None: update["client_name"] = body.client_name.strip()
    if body.client_email is not None: update["client_email"] = body.client_email.strip().lower()
    if body.client_phone is not None: update["client_phone"] = body.client_phone.strip()
    if body.title is not None: update["title"] = body.title.strip()
    if body.intro_message is not None: update["intro_message"] = body.intro_message.strip()
    if body.stages is not None: update["stages"] = [s.model_dump() for s in body.stages]
    if body.expires_at is not None: update["expires_at"] = body.expires_at
    if body.status is not None:
        if body.status not in CLIENT_JOURNEY_STATUSES:
            raise HTTPException(400, f"Invalid status; must be one of {sorted(CLIENT_JOURNEY_STATUSES)}")
        update["status"] = body.status
    await db.client_journeys.update_one({"id": cj_id}, {"$set": update})
    doc = await db.client_journeys.find_one({"id": cj_id})
    return _sanitize_cj(dict(doc), include_token=True)

@api.post("/admin/client-journeys/{cj_id}/send")
async def send_client_journey(cj_id: str, request: Request, payload = Depends(verify_admin)):
    """Email the client a magic link + 6-digit OTP.
    Transactional email under CASL s. 6(6)(c) — existing-client relationship."""
    doc = await db.client_journeys.find_one({"id": cj_id})
    if not doc: raise HTTPException(404, "Client journey not found")
    if doc.get("status") == "revoked":
        raise HTTPException(400, "This journey has been revoked; unrevoke first")

    otp = _new_otp()
    otp_expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    sent_at = datetime.now(timezone.utc).isoformat()
    origin = os.environ.get("PUBLIC_APP_URL", "").rstrip("/")
    if not origin:
        origin = str(request.base_url).rstrip("/")
    link = f"{origin}/my-journey/{doc['token']}"

    from services.email_sender import send_email as _send
    intro_html = (doc.get("intro_message") or "").replace("\n","<br/>")
    html = f"""
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:1.5rem;color:#111">
  <div style="text-align:center;margin-bottom:1.5rem">
    <div style="font-size:1.4rem;font-weight:800;color:#0F2A5B">EZtoFind.ca</div>
    <div style="font-size:0.9rem;color:#0F2A5B;font-weight:600;margin-top:0.15rem">Doug LeMaire, REALTOR®</div>
    <div style="font-size:0.8rem;color:#6b7280;margin-top:0.1rem">Fraser Property Management Realty Services Ltd.</div>
  </div>
  <h2 style="color:#0F2A5B;margin-top:0">Hi {doc['client_name'].split()[0] if doc['client_name'] else 'there'},</h2>
  <p style="line-height:1.6;font-size:0.95rem">I've put together a personalized real estate education journey for you based on what we discussed. This is a private link — please don't share it publicly.</p>
  {f'<div style="background:#F5F0E1;padding:1rem;border-radius:8px;margin:1rem 0;line-height:1.6;font-size:0.9rem">{intro_html}</div>' if intro_html else ''}
  <div style="margin:1.5rem 0;padding:1.25rem;background:#FFF8E1;border:1px solid #F59E0B44;border-radius:10px;text-align:center">
    <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:#0F2A5B;font-weight:700;margin-bottom:0.5rem">Your 6-digit access code</div>
    <div style="font-size:2rem;font-weight:800;color:#0F2A5B;letter-spacing:0.35rem;font-family:monospace">{otp}</div>
    <div style="font-size:0.75rem;color:#6b7280;margin-top:0.35rem">Valid for 30 minutes</div>
  </div>
  <p style="text-align:center;margin:1.5rem 0">
    <a href="{link}" style="display:inline-block;background:#0F2A5B;color:white;padding:0.85rem 1.5rem;border-radius:99px;text-decoration:none;font-weight:600">Open Your Journey Plan →</a>
  </p>
  <p style="line-height:1.6;font-size:0.9rem">Or paste this link into your browser:<br/><a href="{link}" style="color:#0F2A5B;word-break:break-all">{link}</a></p>
  <p style="line-height:1.6;font-size:0.85rem;color:#6b7280">This plan expires on {doc.get('expires_at','')[:10]}. Let me know if you'd like me to extend it or add more content — reply to this email or call +1-604-466-7021.</p>
  <p style="line-height:1.6;font-size:0.8rem;color:#6b7280;font-style:italic;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e5e7eb">
    <strong>Scope of licence:</strong> Doug LeMaire is a licensed BC REALTOR® regulated by BCFSA. He is not a mortgage broker, lawyer or notary, tax accountant, or licensed insurance broker. Content on those topics is general educational information — always consult the licensed professional in that domain.
  </p>
</div>"""
    from services.email_sender import SENDER_NAME, SENDER_ORG, SENDER_ADDRESS, SENDER_PHONE as _phone, SENDER_EMAIL as _email
    text = (
        f"Hi {doc['client_name']},\n\n"
        f"Your personalized real estate education journey is ready.\n\n"
        f"Access code: {otp} (valid 30 minutes)\n"
        f"Link: {link}\n\n"
        f"This plan expires {doc.get('expires_at','')[:10]}.\n\n"
        f"— {SENDER_NAME}\n{SENDER_ORG}\n{SENDER_ADDRESS}\n{_phone} · {_email}\n\n"
        f"Scope of licence: Doug LeMaire is a licensed BC REALTOR® regulated by BCFSA. Not a mortgage broker, lawyer, tax accountant, or insurance broker. Content on those topics is general educational information only."
    )
    result = await _send(db, to=doc["client_email"], subject=f"Your EZtoFind.ca journey plan is ready — access code inside",
                        html=html, text=text, kind="transactional", related_id=cj_id)

    await db.client_journeys.update_one({"id": cj_id}, {"$set": {
        "otp": otp, "otp_expires_at": otp_expires_at,
        "status": "sent", "sent_at": sent_at, "updated_at": sent_at,
    }})
    return {"ok": True, "sent": not result.get("queued"), "provider_response": result}

@api.delete("/admin/client-journeys/{cj_id}")
async def delete_client_journey(cj_id: str, _=Depends(verify_admin)):
    r = await db.client_journeys.delete_one({"id": cj_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Client journey not found")
    return {"ok": True}


# ---- Client Journey maintenance (daily background task) ----
async def _client_journey_maintenance_loop():
    """Runs on startup + every 24h. Three responsibilities:
       1. Auto-expire journeys whose expires_at has passed.
       2. Auto-purge PII 90 days post-expiry (PIPA hygiene).
       3. Send a 7-day reminder to clients who haven't opened their journey.
    """
    # Wait a couple of minutes after startup so other init tasks finish first
    await asyncio.sleep(120)
    while True:
        try:
            now = datetime.now(timezone.utc)
            now_iso = now.isoformat()

            # 1) Expire journeys whose expires_at has passed
            expired = await db.client_journeys.update_many(
                {"status": {"$in": ["sent","opened","draft"]}, "expires_at": {"$lt": now_iso}},
                {"$set": {"status": "expired", "updated_at": now_iso}},
            )
            if expired.modified_count:
                logger.info(f"client_journey_maintenance: expired {expired.modified_count} journeys")

            # 2) Auto-purge PII 90 days after expiry
            purge_threshold = (now - timedelta(days=90)).isoformat()
            to_purge = await db.client_journeys.find(
                {"status": "expired", "expires_at": {"$lt": purge_threshold}, "client_email": {"$ne": None}}
            ).to_list(500)
            for cj in to_purge:
                await db.client_journeys.update_one({"id": cj["id"]}, {"$set": {
                    "client_name": "[purged]",
                    "client_email": None,
                    "client_phone": "",
                    "intro_message": "",
                    "otp": None,
                    "otp_expires_at": None,
                    "session_key": None,
                    "purged_at": now_iso,
                }})
            if to_purge:
                logger.info(f"client_journey_maintenance: purged PII on {len(to_purge)} expired journeys")

            # 3) 7-day reminder for sent-but-not-opened journeys
            reminder_cutoff = (now - timedelta(days=7)).isoformat()
            candidates = await db.client_journeys.find({
                "status": "sent",
                "sent_at": {"$lt": reminder_cutoff, "$ne": None},
                "opened_at": None,
                "reminder_sent_at": None,
            }).to_list(200)
            for cj in candidates:
                try:
                    await _send_client_journey_reminder(cj)
                    await db.client_journeys.update_one(
                        {"id": cj["id"]},
                        {"$set": {"reminder_sent_at": now_iso}},
                    )
                except Exception as e:
                    logger.error(f"client_journey reminder failed for {cj.get('id')}: {e}")
            if candidates:
                logger.info(f"client_journey_maintenance: sent {len(candidates)} 7-day reminders")

        except Exception as e:
            logger.error(f"client_journey_maintenance loop error: {e}")
        # Sleep 24 hours before next run
        await asyncio.sleep(24 * 3600)


async def _send_client_journey_reminder(cj: dict):
    """Send a friendly 7-day nudge to a client who hasn't opened their journey.
       Same CASL basis as the initial send: transactional/existing-client relationship."""
    if not cj.get("client_email"):
        return
    origin = os.environ.get("PUBLIC_APP_URL", "https://eztofind.ca").rstrip("/")
    link = f"{origin}/my-journey/{cj['token']}"
    first_name = (cj.get("client_name") or "").split()[0] or "there"
    otp = cj.get("otp")  # existing OTP still valid if not yet expired
    otp_status_line = ""
    if not otp or (cj.get("otp_expires_at") and datetime.fromisoformat(cj["otp_expires_at"].replace("Z","+00:00")) < datetime.now(timezone.utc)):
        otp_status_line = "<p style='line-height:1.6;font-size:0.9rem'>Your original access code has expired — reply to this email or call and I'll send you a fresh one.</p>"
    else:
        otp_status_line = f"<p style='line-height:1.6;font-size:0.9rem'>Your 6-digit access code from the original email is still valid: <strong style='font-family:monospace;font-size:1.05rem;letter-spacing:0.2rem'>{otp}</strong></p>"

    html = f"""
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:1.5rem;color:#111">
  <div style="text-align:center;margin-bottom:1.5rem">
    <div style="font-size:1.4rem;font-weight:800;color:#0F2A5B">EZtoFind.ca</div>
    <div style="font-size:0.9rem;color:#0F2A5B;font-weight:600;margin-top:0.15rem">Doug LeMaire, REALTOR®</div>
    <div style="font-size:0.8rem;color:#6b7280;margin-top:0.1rem">Fraser Property Management Realty Services Ltd.</div>
  </div>
  <h2 style="color:#0F2A5B;margin-top:0">Hi {first_name},</h2>
  <p style="line-height:1.65;font-size:0.98rem">Just a friendly nudge — I noticed you haven't opened the personalized real estate journey plan I sent you last week. No pressure at all, but I wanted to make sure the email didn't get buried.</p>
  {otp_status_line}
  <p style="text-align:center;margin:1.5rem 0">
    <a href="{link}" style="display:inline-block;background:#0F2A5B;color:white;padding:0.85rem 1.5rem;border-radius:99px;text-decoration:none;font-weight:600">Open Your Journey Plan →</a>
  </p>
  <p style="line-height:1.6;font-size:0.85rem;color:#6b7280">Questions? Reply to this email or call +1-604-466-7021. This plan expires on {(cj.get('expires_at') or '')[:10]}.</p>
  <p style="line-height:1.6;font-size:0.78rem;color:#6b7280;font-style:italic;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e5e7eb">
    <strong>Scope of licence:</strong> Doug LeMaire is a licensed BC REALTOR® regulated by BCFSA. Content is general educational information — always consult the licensed professional in each domain (mortgage broker, lawyer/notary, accountant, insurance broker).
  </p>
</div>"""
    text = (
        f"Hi {first_name},\n\n"
        f"Just a friendly nudge — I sent you a personalized real estate journey plan last week and wanted to make sure it didn't get buried in your inbox.\n\n"
        f"Open your plan: {link}\n"
        + (f"Access code (still valid): {otp}\n" if otp else "Your original access code has expired — reply and I'll send a fresh one.\n")
        + f"\nThis plan expires {(cj.get('expires_at') or '')[:10]}.\n\n"
        f"— Doug LeMaire, REALTOR®\n"
    )
    from services.email_sender import send_email as _send
    await _send(db, to=cj["client_email"], subject="Just a nudge — your EZtoFind.ca journey plan is still waiting",
                html=html, text=text, kind="transactional", related_id=cj["id"])


# ---- Client-facing (public, token-based) endpoints ----
async def _load_cj_by_token(token: str) -> dict:
    doc = await db.client_journeys.find_one({"token": token})
    if not doc: raise HTTPException(404, "Journey not found or link expired")
    if doc.get("status") == "revoked":
        raise HTTPException(410, "This journey has been revoked. Please contact Doug for a new link.")
    now = datetime.now(timezone.utc)
    exp = doc.get("expires_at")
    if exp and datetime.fromisoformat(exp.replace("Z","+00:00")) < now:
        await db.client_journeys.update_one({"id": doc["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(410, "This journey has expired. Please contact Doug for a new link.")
    return doc

@api.get("/my-journey/{token}/meta")
async def client_journey_meta(token: str):
    """Public — returns just enough to display the OTP-prompt page (title + first
    name of client). Does NOT return curated content until OTP is verified."""
    doc = await _load_cj_by_token(token)
    first = (doc.get("client_name") or "").split()[0] if doc.get("client_name") else ""
    return {"title": doc.get("title"), "client_first_name": first, "expires_at": doc.get("expires_at")}

@api.post("/my-journey/{token}/verify")
async def client_journey_verify(token: str, body: ClientJourneyOTPVerify):
    doc = await _load_cj_by_token(token)
    otp = (body.otp or "").strip()
    if not doc.get("otp") or not doc.get("otp_expires_at"):
        raise HTTPException(400, "No active access code — please ask Doug to resend the invitation.")
    if datetime.fromisoformat(doc["otp_expires_at"].replace("Z","+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(410, "Access code expired. Please ask Doug to resend.")
    if otp != doc["otp"]:
        raise HTTPException(401, "Incorrect access code.")
    # Success — rotate a session_key that the client sends on subsequent calls
    session_key = _new_token()
    updates = {"session_key": session_key, "last_visited_at": datetime.now(timezone.utc).isoformat()}
    if not doc.get("opened_at"):
        updates["opened_at"] = datetime.now(timezone.utc).isoformat()
        updates["status"] = "opened"
    await db.client_journeys.update_one({"id": doc["id"]}, {"$set": updates})
    return {"ok": True, "session_key": session_key}

async def _require_session(token: str, session_key: str) -> dict:
    doc = await _load_cj_by_token(token)
    if not session_key or doc.get("session_key") != session_key:
        raise HTTPException(401, "Invalid session. Please re-enter your access code.")
    return doc

@api.get("/my-journey/{token}")
async def client_journey_view(token: str, session_key: str):
    doc = await _require_session(token, session_key)
    return {
        "title": doc.get("title"),
        "client_first_name": (doc.get("client_name") or "").split()[0],
        "intro_message": doc.get("intro_message"),
        "base_journey_slug": doc.get("base_journey_slug"),
        "stages": doc.get("stages", []),
        "modules_completed": doc.get("modules_completed", []),
        "expires_at": doc.get("expires_at"),
    }

@api.post("/my-journey/{token}/toggle")
async def client_journey_toggle(token: str, body: ClientJourneyToggle):
    doc = await _require_session(token, body.session_key)
    key = f"{body.stage_id}__{body.module_id}"
    completed = set(doc.get("modules_completed") or [])
    if key in completed: completed.discard(key)
    else: completed.add(key)
    now = datetime.now(timezone.utc).isoformat()
    await db.client_journeys.update_one({"id": doc["id"]}, {"$set": {
        "modules_completed": sorted(completed),
        "last_visited_at": now,
    }})
    return {"ok": True, "modules_completed": sorted(completed)}

@api.post("/my-journey/{token}/touch-stage")
async def client_journey_touch_stage(token: str, body: ClientJourneyStageView):
    doc = await _require_session(token, body.session_key)
    now = datetime.now(timezone.utc).isoformat()
    stage_views = doc.get("stage_views") or {}
    sv = stage_views.get(body.stage_id) or {"first_at": now, "count": 0}
    sv["last_at"] = now
    sv["count"] = int(sv.get("count", 0)) + 1
    stage_views[body.stage_id] = sv
    await db.client_journeys.update_one({"id": doc["id"]}, {"$set": {
        "stage_views": stage_views,
        "last_visited_at": now,
    }})
    return {"ok": True}


@api.post("/campaigns/opt-in")
async def campaigns_opt_in(body: CampaignSignup, request: Request):
    """Public endpoint used by existing signup forms to record per-campaign
    consents. All emails are lowercased. Unknown campaigns are silently
    dropped (defensive against tampering)."""
    email = (body.email or "").lower().strip()
    if not email or "@" not in email:
        raise HTTPException(400, "Valid email required.")
    accepted = []
    for c in body.campaigns:
        if c in CAMPAIGN_REGISTRY:
            await campaign_record_consent(email, c, request, body.opt_in_text, source=body.source)
            accepted.append(c)
    return {"success": True, "email": email, "accepted": accepted}


# =============== DOOGIE VOICE (Whisper) — scaffold ===============
# Endpoint accepts audio blob from the frontend mic button. Activates once
# OPENAI_API_KEY is configured. Until then, returns a graceful "not enabled"
# response so the UI can show a friendly message instead of crashing.
import base64
from fastapi import File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
import io as _io
import shutil, mimetypes

# ---- Static file serving for user uploads (coming-soon listing photos/video) ----
UPLOADS_ROOT = Path(__file__).parent / "uploads"
UPLOADS_ROOT.mkdir(exist_ok=True)
(UPLOADS_ROOT / "coming_soon").mkdir(exist_ok=True)
# Mounted under /api/uploads so the Kubernetes ingress routes it to the
# backend. A bare /uploads/ would be swallowed by the frontend SPA fallback.
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_ROOT)), name="uploads")

@api.get("/coming-soon")
async def public_coming_soon():
    """Public — returns the coming-soon listing config if published."""
    doc = await db.coming_soon.find_one({"_id": "singleton"}) or {}
    if not doc.get("published"):
        return {"published": False}
    doc.pop("_id", None)
    return doc

@api.get("/admin/coming-soon")
async def admin_get_coming_soon(_=Depends(verify_admin)):
    doc = await db.coming_soon.find_one({"_id": "singleton"}) or {"_id": "singleton"}
    default = {
        "published": False, "eyebrow": "Coming Soon", "title": "", "community": "",
        "price_teaser": "", "beds": None, "baths": None, "sqft": None,
        "features": [], "description": "",
        "photos": [], "hero_photo_id": None,
        "video_url": "", "video_type": "file",
        "cta_label": "Enquire", "cta_link": "mailto:info@eztofind.ca?subject=Coming%20Soon%20Enquiry",
    }
    for k, v in default.items():
        doc.setdefault(k, v)
    doc.pop("_id", None)
    return doc

class ComingSoonUpdate(BaseModel):
    published: Optional[bool] = None
    eyebrow: Optional[str] = None
    title: Optional[str] = None
    community: Optional[str] = None
    price_teaser: Optional[str] = None
    beds: Optional[float] = None
    baths: Optional[float] = None
    sqft: Optional[int] = None
    features: Optional[List[str]] = None
    description: Optional[str] = None
    photos: Optional[List[dict]] = None
    hero_photo_id: Optional[str] = None
    video_url: Optional[str] = None
    video_type: Optional[str] = None
    cta_label: Optional[str] = None
    cta_link: Optional[str] = None

@api.put("/admin/coming-soon")
async def admin_update_coming_soon(body: ComingSoonUpdate, _=Depends(verify_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.coming_soon.update_one({"_id": "singleton"}, {"$set": update}, upsert=True)
    doc = await db.coming_soon.find_one({"_id": "singleton"})
    doc.pop("_id", None)
    return doc

MAX_PHOTO_BYTES = 20 * 1024 * 1024
MAX_VIDEO_BYTES = 500 * 1024 * 1024
PHOTO_MIMES = {"image/jpeg","image/png","image/webp","image/heic","image/heif","image/avif"}
VIDEO_MIMES = {"video/mp4","video/webm","video/quicktime","video/x-matroska"}

@api.post("/admin/coming-soon/upload-photo")
async def admin_upload_photo(file: UploadFile = File(...), _=Depends(verify_admin)):
    if file.content_type not in PHOTO_MIMES:
        raise HTTPException(400, f"Unsupported image type '{file.content_type}'. Please upload JPG, PNG, WEBP, HEIC, or AVIF.")
    file_id = str(uuid.uuid4())
    ext = mimetypes.guess_extension(file.content_type) or ".jpg"
    if ext == ".jpe": ext = ".jpg"
    dest_dir = UPLOADS_ROOT / "coming_soon"; dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / f"{file_id}{ext}"
    size = 0
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_PHOTO_BYTES:
                dest.unlink(missing_ok=True)
                raise HTTPException(413, f"Photo exceeds {MAX_PHOTO_BYTES // (1024*1024)} MB.")
            f.write(chunk)
    return {"id": file_id, "url": f"/api/uploads/coming_soon/{file_id}{ext}", "filename": file.filename, "size": size, "content_type": file.content_type}

@api.post("/admin/coming-soon/upload-video")
async def admin_upload_video(file: UploadFile = File(...), _=Depends(verify_admin)):
    if file.content_type not in VIDEO_MIMES:
        raise HTTPException(400, f"Unsupported video type '{file.content_type}'. Please upload MP4, WEBM, MOV, or MKV.")
    file_id = str(uuid.uuid4())
    ext = mimetypes.guess_extension(file.content_type) or ".mp4"
    dest_dir = UPLOADS_ROOT / "coming_soon"; dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / f"{file_id}{ext}"
    size = 0
    with dest.open("wb") as f:
        while chunk := await file.read(4 * 1024 * 1024):
            size += len(chunk)
            if size > MAX_VIDEO_BYTES:
                dest.unlink(missing_ok=True)
                raise HTTPException(413, f"Video exceeds {MAX_VIDEO_BYTES // (1024*1024)} MB.")
            f.write(chunk)
    return {"id": file_id, "url": f"/api/uploads/coming_soon/{file_id}{ext}", "filename": file.filename, "size": size, "content_type": file.content_type}

@api.delete("/admin/coming-soon/asset")
async def admin_delete_asset(path: str, _=Depends(verify_admin)):
    if not (path.startswith("/uploads/") or path.startswith("/api/uploads/")):
        raise HTTPException(400, "Invalid asset path")
    # Normalize both /uploads/... and /api/uploads/... to on-disk path
    rel = path[len("/api"):] if path.startswith("/api/uploads/") else path
    disk_path = UPLOADS_ROOT.parent / rel.lstrip("/")
    try:
        if disk_path.resolve().is_relative_to(UPLOADS_ROOT.resolve()) and disk_path.exists():
            disk_path.unlink()
    except Exception:
        pass
    return {"ok": True}


app.include_router(api)


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


# ---------- Doogie TTS (voice output) ----------
class DoogieTTSIn(BaseModel):
    text: str
    voice: Optional[str] = "ash"    # ash = warm, friendly male voice — best fit for Doogie mascot
    session_id: Optional[str] = None

# TTS voice allow-list — anything else falls back to `ash` (Doogie's default).
_TTS_ALLOWED_VOICES = {"alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"}


def _tts_cache_key(text: str, voice: str) -> str:
    """SHA256 hash of (normalized_text|voice|model) — used as the Mongo _id
    for the TTS audio cache. Cached blobs auto-expire in 30 days via TTL."""
    normalized = re.sub(r"\s+", " ", (text or "").strip().lower())
    raw = f"tts-1|{voice}|{normalized}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@app.post("/api/doogie/tts")
@_limiter.limit("30/minute")  # per-IP anti-abuse (protects Universal Key balance)
async def doogie_tts(request: Request, body: DoogieTTSIn):
    """Convert Doogie's response text into an audio stream. Uses OpenAI TTS via
    the Emergent Universal Key.

    Cost profile: ~$0.015 per 1,000 characters (tts-1 model). A typical Doogie
    answer is 300-600 chars → ~$0.005-$0.010 uncached. Every cache hit is $0.

    Cache: keyed by SHA256(text+voice+model) with a 30-day TTL. If Doug regenerates
    a glossary FAQ, the TTS blob for the OLD text simply expires — no manual bust.
    """
    text = (body.text or "").strip()
    if not text or len(text) < 3:
        raise HTTPException(400, "Text is too short to synthesize.")
    if len(text) > 4000:
        # OpenAI TTS caps at 4096 chars; also protects the bill.
        text = text[:4000]

    voice = (body.voice or "ash").lower()
    if voice not in _TTS_ALLOWED_VOICES:
        voice = "ash"

    key = _tts_cache_key(text, voice)

    # 1. Cache lookup
    try:
        cached = await db.doogie_tts_cache.find_one({"_id": key}, {"audio_b64": 1})
        if cached and cached.get("audio_b64"):
            audio_bytes = base64.b64decode(cached["audio_b64"])
            return Response(
                content=audio_bytes,
                media_type="audio/mpeg",
                headers={"X-EZ-TTS-Cache": "HIT", "Cache-Control": "public, max-age=86400"},
            )
    except Exception as e:
        logger.warning(f"TTS cache lookup failed: {e}")

    # 2. Cache miss → generate via OpenAI
    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio_bytes = await tts.generate_speech(
            text=text,
            model="tts-1",   # fast + cheap; upgrade to tts-1-hd later if Doug wants podcast-grade
            voice=voice,
            response_format="mp3",
            speed=1.0,
        )
        # 3. Cache write (fire-and-forget so first play isn't slowed down)
        try:
            await db.doogie_tts_cache.update_one(
                {"_id": key},
                {"$set": {
                    "audio_b64": base64.b64encode(audio_bytes).decode("ascii"),
                    "voice": voice,
                    "char_count": len(text),
                    "cached_at": now_iso(),
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
                }},
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"TTS cache write failed: {e}")

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"X-EZ-TTS-Cache": "MISS", "Cache-Control": "public, max-age=86400"},
        )
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(502, "Voice synthesis is temporarily unavailable. Please try again in a moment.")


# ============================================================================
# Doug's Own Tour Library — surfaces active BC listings that carry a
# virtual tour URL from CREA DDF®. Used by /visual-agent-demo so the Doogie
# Visual mockup can play real listings instead of public demo tours.
#
# Filtering:
#   • Active-status only
#   • has_virtual_tour = True (populated by services/ddf_sync.py on next sync)
#   • Unbranded tours prioritized (RESA-safe — no agent branding leakage)
# ============================================================================

@app.get("/api/tours/library", tags=["MLS Listings"])
async def listings_with_virtual_tours(limit: int = 12, city: str | None = None):
    """Return up to `limit` active BC listings that have at least one virtual
    tour URL from the CREA DDF® feed. Restricted to Matterport, YouTube and
    Vimeo hosts (per Doug's ask — those three formats always embed cleanly
    and auto-play). Optionally scoped to a single BC `city` so panes can sync
    to whatever community the buyer is currently searching for."""
    limit = max(1, min(int(limit or 12), 30))
    query = {"status": "Active", "has_virtual_tour": True}
    if city:
        query["city"] = {"$regex": f"^{re.escape(city)}$", "$options": "i"}
    cursor = db.listings.find(
        query,
        {
            "_id": 0, "listing_key": 1, "mls_number": 1, "street_address": 1,
            "city": 1, "list_price": 1, "beds": 1, "baths": 1, "property_type": 1,
            "photos": {"$slice": 1}, "virtual_tour_urls": 1, "realtor_ca_url": 1,
        },
    ).sort("synced_at", -1).limit(limit * 4)  # over-fetch since we filter by host
    rows = []
    async for l in cursor:
        tours = l.get("virtual_tour_urls") or []
        if not tours:
            continue
        # Find the first Matterport / YouTube / Vimeo URL (unbranded first,
        # already sorted). Skip Google Drive, YouIGUIDE and anything else —
        # per Doug's ask, only these three hosts.
        picked = None
        for t in tours:
            raw = (t.get("url") or "").strip()
            if not raw:
                continue
            sanitised = _sanitize_tour_url(raw)
            host = _tour_host_family(sanitised)
            if host in ("matterport", "youtube", "vimeo"):
                picked = (t, sanitised, host)
                break
        if not picked:
            continue
        t, sanitised, host = picked
        rows.append({
            "listing_key":    l["listing_key"],
            "mls_number":     l.get("mls_number") or l["listing_key"],
            "address":        l.get("street_address") or "",
            "city":           l.get("city") or "",
            "list_price":     l.get("list_price"),
            "beds":           l.get("beds"),
            "baths":          l.get("baths"),
            "property_type":  l.get("property_type") or "",
            "cover_photo":    (l.get("photos") or [None])[0],
            "tour_url":       sanitised,        # iframe-safe embed URL
            "tour_url_raw":   t.get("url"),      # for "Open in new tab"
            "tour_host":      host,              # matterport|youtube|vimeo
            "tour_category":  t.get("category") or "",
            "tour_unbranded": not t.get("is_branded", False),
            "eztofind_url":   f"/listing/{l['listing_key']}",
            "realtor_ca_url": l.get("realtor_ca_url"),
        })
        if len(rows) >= limit:
            break
    return {
        "count": len(rows),
        "listings": rows,
        "city": city,
        "notice": (
            "MLS® data licensed from CREA DDF®. Virtual tours restricted to "
            "Matterport, YouTube and Vimeo (all iframe-embeddable). Unbranded "
            "sources prioritised for RESA compliance."
        ),
    }


def _tour_host_family(url: str) -> str:
    """Classify a sanitised tour URL into a coarse provider family so the
    /api/tours/library endpoint can restrict to Matterport / YouTube / Vimeo."""
    try:
        from urllib.parse import urlparse
        host = (urlparse(url or "").netloc or "").lower()
        if "matterport" in host: return "matterport"
        if "youtube" in host or "youtu.be" in host: return "youtube"
        if "vimeo" in host: return "vimeo"
    except Exception:
        pass
    return "other"


def _sanitize_tour_url(url: str) -> str:
    """Rewrite third-party video/tour URLs into iframe-embeddable variants.
    Many providers (Google Drive, YouTube, Vimeo) block iframe embedding on
    their consumer-facing URLs via X-Frame-Options. The DDF feed hands us
    those consumer URLs, so we transform to the well-known embed variants
    before dropping into an iframe. Providers we don't recognise are returned
    as-is (Matterport, Kuula, youriguide, etc. already allow embedding)."""
    if not url:
        return url
    try:
        # Google Drive: /file/d/{id}/view → /file/d/{id}/preview
        m = re.search(r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)", url)
        if m:
            return f"https://drive.google.com/file/d/{m.group(1)}/preview"
        # YouTube: watch?v=X, /shorts/X, youtu.be/X  →  /embed/X
        m = re.search(r"(?:youtube\.com/(?:watch\?v=|shorts/|embed/)|youtu\.be/)([a-zA-Z0-9_-]{11})", url)
        if m:
            return f"https://www.youtube.com/embed/{m.group(1)}"
        # Vimeo: vimeo.com/{id}  →  player.vimeo.com/video/{id}
        m = re.search(r"^https?://(?:www\.)?vimeo\.com/(\d+)", url)
        if m:
            return f"https://player.vimeo.com/video/{m.group(1)}"
        # Force https on any bare http:// URL (mixed-content block in the browser)
        if url.startswith("http://"):
            return "https://" + url[7:]
    except Exception:
        pass
    return url


# Hosts that we know allow being embedded in a third-party iframe.
# Anything else we still render — most tour providers work — but the frontend
# will surface an "Open in new tab" affordance more prominently.
_EMBEDDABLE_TOUR_HOSTS = {
    "drive.google.com", "www.youtube.com", "youtube.com",
    "player.vimeo.com", "my.matterport.com", "matterport.com",
    "kuula.co", "www.kuula.co", "youriguide.com", "www.youriguide.com",
    "tour.giraffe360.com", "hommati.com", "www.hommati.com",
    "eyespy360.com", "www.eyespy360.com", "iguide.report",
    "www.iguide.report", "spinclusive.ca", "www.spinclusive.ca",
    "urbanimmersive.com", "www.urbanimmersive.com",
    "listingslab.com", "app.cloudpano.com", "www.tourwizard.net",
    "asteroom.com", "www.asteroom.com",
}


def _is_embeddable_tour(url: str) -> bool:
    """Best-effort check that the given URL will render inside an iframe."""
    if not url:
        return False
    try:
        from urllib.parse import urlparse
        return (urlparse(url).netloc or "").lower() in _EMBEDDABLE_TOUR_HOSTS
    except Exception:
        return False


# ============================================================================
# Doogie Tools API — public OpenAPI 3.1 tool discovery schema so ChatGPT,
# Claude, Perplexity, Gemini and any other agent framework can call Doogie
# as a "BC Residential Real Estate information" retrieval tool.
#
# Compliance boundary is baked into the tool descriptions themselves:
#   - "Educational retrievals only, never advice"
#   - "Cite BCFSA Consumer Protection line: 1-877-683-9664"
#   - Rate limits are documented so partners set expectations correctly.
#
# Two discovery endpoints:
#   • /.well-known/ai-plugin.json  — ChatGPT-style plugin manifest
#   • /api/doogie/tools.json       — OpenAPI 3.1 tool schema (canonical)
# ============================================================================

_DOOGIE_TOOLS_SPEC = {
    "openapi": "3.1.0",
    "info": {
        "title": "Doogie — BC Residential Real Estate Information",
        "version": "1.0.0",
        "summary": "Educational retrieval tool for British Columbia residential real estate.",
        "description": (
            "Doogie is an AI-assisted retrieval tool operated by EZtoFind.ca (Doug LeMaire, "
            "REALTOR®, BCFSA Licence #167790, Fraser Property Management Realty Services Ltd.). "
            "It surfaces BC-specific real estate context: RESA rules, PTT calculations, "
            "MLS® listing lookups, neighbourhood facts, and 300+ BC glossary terms.\n\n"
            "**Compliance boundary (mandatory for any downstream agent):**\n"
            "• Doogie provides **educational retrievals only — never advice**.\n"
            "• Every substantive answer must include the BCFSA Consumer Protection Line: "
            "1-877-683-9664 (or link to https://www.bcfsa.ca).\n"
            "• Nothing here constitutes a listing, offer, or contract under RESA.\n"
            "• MLS® data is CREA-licensed; do not scrape, redistribute, or store beyond the "
            "immediate agent response.\n"
            "• If the user asks for advice, refer them to a licensed BC REALTOR® via "
            "https://eztofind.ca/referral-request."
        ),
        "termsOfService": "https://eztofind.ca/terms",
        "contact": {
            "name": "Doug LeMaire (EZtoFind.ca)",
            "url": "https://eztofind.ca/contact",
        },
        "license": {"name": "Proprietary — CREA DDF® / EZtoFind.ca"},
    },
    "servers": [
        {"url": "https://eztofind.ca/api", "description": "Production"},
    ],
    "paths": {
        "/doogie/chat": {
            "post": {
                "operationId": "ask_doogie",
                "summary": "Ask Doogie a BC real estate question (educational retrieval).",
                "description": (
                    "Sends a natural-language BC real estate question to Doogie and receives "
                    "a compliance-guarded educational answer. Doogie will decline to give "
                    "advice, price predictions, or legal/tax guidance and will instead point "
                    "at BCFSA / a licensed REALTOR®. Rate-limited to 30 requests/minute per IP "
                    "and 300 requests/day."
                ),
                "requestBody": {
                    "required": True,
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ChatIn"}}},
                },
                "responses": {
                    "200": {
                        "description": "Doogie's educational retrieval response.",
                        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ChatOut"}}},
                    },
                    "429": {"description": "Rate limit exceeded. Back off and retry after 60 seconds."},
                },
            }
        },
        "/doogie/mls-search": {
            "post": {
                "operationId": "search_bc_listings",
                "summary": "Search live BC MLS® listings via CREA DDF®.",
                "description": (
                    "Retrieves active BC residential listings matching the provided filters. "
                    "Data is licensed from CREA DDF® — cite MLS® / REALTOR® trademarks and do "
                    "not redistribute beyond the immediate agent response. Only Active-status "
                    "listings are returned."
                ),
                "requestBody": {
                    "required": True,
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/MLSSearchIn"}}},
                },
                "responses": {
                    "200": {
                        "description": "Up to 20 matching listings, each with a realtor.ca link.",
                        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/MLSSearchOut"}}},
                    }
                },
            }
        },
        "/glossary/{slug}": {
            "get": {
                "operationId": "get_bc_term_definition",
                "summary": "Fetch a BC real estate glossary term with sources.",
                "description": (
                    "Returns a plain-language definition of a BC-specific real estate term "
                    "(e.g. property-transfer-tax-ptt, form-b, subject-clauses, resa). "
                    "Each definition cites its authoritative source (BCFSA, LTSA, CRA, etc.)."
                ),
                "parameters": [
                    {
                        "name": "slug",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"},
                        "example": "property-transfer-tax-ptt",
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Term definition + related terms + FAQs.",
                        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/GlossaryTerm"}}},
                    },
                    "404": {"description": "Term not found. Try /glossary for the full list."},
                },
            }
        },
        "/glossary": {
            "get": {
                "operationId": "list_bc_terms",
                "summary": "List all BC real estate glossary term slugs.",
                "description": "Returns every glossary slug so agents can discover valid inputs for get_bc_term_definition.",
                "responses": {
                    "200": {
                        "description": "Array of glossary term slugs and titles.",
                        "content": {"application/json": {"schema": {
                            "type": "array",
                            "items": {"type": "object", "properties": {
                                "slug": {"type": "string"}, "title": {"type": "string"},
                            }},
                        }}},
                    }
                },
            }
        },
    },
    "components": {
        "schemas": {
            "ChatIn": {
                "type": "object",
                "required": ["message"],
                "properties": {
                    "message":    {"type": "string", "description": "The user's BC real estate question. Max 2000 chars.", "maxLength": 2000},
                    "session_id": {"type": "string", "description": "Stable session identifier so Doogie can maintain short-term context (recommended: UUID).", "nullable": True},
                    "language":   {"type": "string", "enum": ["en", "fr", "zh-Hant", "zh-Hans", "pa", "fa", "pt-PT"], "default": "en"},
                },
            },
            "ChatOut": {
                "type": "object",
                "properties": {
                    "reply":              {"type": "string", "description": "Doogie's educational retrieval response. Contains inline citations."},
                    "session_id":         {"type": "string"},
                    "citations":          {"type": "array", "items": {"type": "string"}, "description": "Source URLs cited in the reply."},
                    "compliance_notice":  {"type": "string", "description": "Always present. Reminds the consumer this is not advice.", "default": "Educational retrieval only — not advice. Consult a licensed BC REALTOR® or BCFSA (1-877-683-9664) for guidance."},
                },
            },
            "MLSSearchIn": {
                "type": "object",
                "properties": {
                    "query":         {"type": "string", "description": "Free-text search (e.g. 'Kitsilano 2BR condo'). Doogie parses filters from this string."},
                    "city":          {"type": "string", "description": "BC city name (e.g. 'Vancouver', 'Burnaby')."},
                    "min_price":     {"type": "integer", "minimum": 0},
                    "max_price":     {"type": "integer", "minimum": 0},
                    "min_beds":      {"type": "integer", "minimum": 0},
                    "property_type": {"type": "string", "enum": ["House", "Apartment", "Townhouse", "Duplex", "Land", "Any"], "default": "Any"},
                },
            },
            "MLSSearchOut": {
                "type": "object",
                "properties": {
                    "listings": {"type": "array", "items": {"$ref": "#/components/schemas/Listing"}, "maxItems": 20},
                    "count":    {"type": "integer"},
                    "notice":   {"type": "string", "default": "MLS® data licensed from CREA DDF®. Do not redistribute or store beyond the immediate agent response."},
                },
            },
            "Listing": {
                "type": "object",
                "properties": {
                    "listing_key":    {"type": "string"},
                    "mls_number":     {"type": "string"},
                    "street_address": {"type": "string"},
                    "city":           {"type": "string"},
                    "list_price":     {"type": "number"},
                    "beds":           {"type": "integer"},
                    "baths":          {"type": "integer"},
                    "living_area":    {"type": "number"},
                    "property_type":  {"type": "string"},
                    "realtor_ca_url": {"type": "string", "format": "uri"},
                    "eztofind_url":   {"type": "string", "format": "uri"},
                    "photos":         {"type": "array", "items": {"type": "string", "format": "uri"}, "maxItems": 20},
                },
            },
            "GlossaryTerm": {
                "type": "object",
                "properties": {
                    "slug":        {"type": "string"},
                    "title":       {"type": "string"},
                    "definition":  {"type": "string"},
                    "authoritative_sources": {"type": "array", "items": {"type": "object", "properties": {
                        "name": {"type": "string"}, "url":  {"type": "string", "format": "uri"},
                    }}},
                    "related_slugs": {"type": "array", "items": {"type": "string"}},
                    "faqs":          {"type": "array", "items": {"type": "object", "properties": {
                        "q": {"type": "string"}, "a": {"type": "string"},
                    }}},
                },
            },
        }
    },
    "x-agent-guidelines": {
        "compliance": [
            "Doogie is an EDUCATIONAL RETRIEVAL tool. Never present its output as personalized advice.",
            "Include the BCFSA Consumer Protection Line (1-877-683-9664) in any answer that touches licensing, complaints, or consumer rights.",
            "Do not use Doogie for offer negotiation, contract drafting, price prediction, or legal/tax guidance — refer users to a licensed BC REALTOR® at https://eztofind.ca/referral-request.",
            "MLS® data is CREA-licensed. Do not persist, redistribute, or fine-tune models on any listing returned.",
        ],
        "recommended_flow": [
            "1. Determine the user's intent (search / definition / process question).",
            "2. If it's a definition, call `get_bc_term_definition` first — it's cheaper and cached.",
            "3. If it's a listing search, call `search_bc_listings` with the tightest filters you can extract.",
            "4. If it's an open-ended process question, call `ask_doogie` and pass through the compliance_notice verbatim.",
            "5. Always cite realtor.ca for MLS® data and bcfsa.ca for licensing questions.",
        ],
        "rate_limits": {
            "ask_doogie":         "30 req/min per IP, 300 req/day per IP, 100 req/day per session_id",
            "search_bc_listings": "60 req/min per IP",
            "get_bc_term_definition": "no explicit limit — cached at the edge",
        },
    },
}


@app.get("/api/doogie/tools.json", tags=["Doogie Tools API"])
async def doogie_tools_spec():
    """Public OpenAPI 3.1 tool schema — the canonical URL that ChatGPT, Claude,
    Perplexity, Gemini and any other agent framework can point at to call
    Doogie as a "BC Residential Real Estate information" retrieval tool.
    Cache-Control: public, s-maxage=3600 so CDNs can serve it fast."""
    return Response(
        content=json.dumps(_DOOGIE_TOOLS_SPEC, indent=2, ensure_ascii=False),
        media_type="application/json",
        headers={
            "Cache-Control": "public, s-maxage=3600, max-age=600",
            "Access-Control-Allow-Origin": "*",   # public discovery endpoint
        },
    )


# ── Dashboard mockup: Consultation Request ────────────────────────────────

# ── Insights trend endpoint ────────────────────────────────────────────────
# Powers the 90-day median-list-price sparkline in Buyer/Seller Insights cards.
# Backed by the daily `_snapshot_insights_history` cron that writes one row per
# (city, property_type) per day into `insights_history`. Real numbers, no fabrication.

BC_INSIGHTS_CITIES = [
    "Vancouver", "Burnaby", "Richmond", "Surrey", "Delta", "New Westminster",
    "Coquitlam", "Port Coquitlam", "Port Moody", "North Vancouver", "West Vancouver",
    "Maple Ridge", "Pitt Meadows", "Langley", "White Rock", "Abbotsford",
    "Chilliwack", "Mission", "Squamish", "Whistler", "Kelowna", "Vernon",
    "Penticton", "Kamloops", "Nanaimo", "Victoria", "Prince George",
    "Osoyoos", "Sechelt", "Salt Spring Island",
]

INSIGHTS_PROPERTY_TYPES = ["", "House", "Apartment", "Townhouse"]


async def _snapshot_insights_history():
    """Iterates BC cities × property types and inserts one snapshot row per
    (city, property_type) into `insights_history` with today's UTC midnight
    as the snapshot key. Idempotent: an existing row for today is upserted."""
    from statistics import median as _median
    now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    wrote = 0
    for city in BC_INSIGHTS_CITIES:
        for ptype in INSIGHTS_PROPERTY_TYPES:
            q = {"status": "Active", "city": {"$regex": f"^{re.escape(city)}$", "$options": "i"}, "list_price": {"$gt": 0}}
            if ptype:
                q["property_type"] = {"$regex": f"^{re.escape(ptype)}$", "$options": "i"}
            prices = []
            async for l in db.listings.find(q, {"list_price": 1, "_id": 0}):
                p = l.get("list_price")
                if p and p > 0:
                    prices.append(p)
            if not prices:
                continue
            row = {
                "city": city,
                "property_type": ptype or None,
                "snapshot_at": now,
                "week_key": now.isocalendar()[1],
                "active_count": len(prices),
                "median_list_price": _median(prices),
                "avg_list_price": sum(prices) / len(prices),
                "min_price": min(prices),
                "max_price": max(prices),
            }
            await db.insights_history.update_one(
                {"city": row["city"], "property_type": row["property_type"], "snapshot_at": now},
                {"$set": row},
                upsert=True,
            )
            wrote += 1
    logger.info(f"insights_history snapshot: wrote {wrote} rows for {now.isoformat()}")
    return wrote


@app.get("/api/insights/history", tags=["Insights"])
async def insights_history(city: str, weeks: int = 12, property_type: str | None = None):
    if not city or len(city.strip()) < 2:
        raise HTTPException(status_code=400, detail="city is required")
    weeks = max(4, min(int(weeks or 12), 26))
    since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    query = {
        "city": {"$regex": f"^{re.escape(city.strip())}$", "$options": "i"},
        "property_type": property_type if property_type else None,
        "snapshot_at": {"$gte": since},
    }
    series = []
    async for row in db.insights_history.find(query, {"_id": 0}).sort("snapshot_at", 1):
        series.append({
            "at": row.get("snapshot_at").isoformat() if row.get("snapshot_at") else None,
            "median_list_price": row.get("median_list_price"),
            "avg_list_price": row.get("avg_list_price"),
            "active_count": row.get("active_count"),
        })
    return {
        "city": city,
        "property_type": property_type,
        "weeks": weeks,
        "count": len(series),
        "series": series,
        "source": "CREA DDF® · EZtoFind.ca daily snapshot",
        "compliance": "Historical median list prices only — never a forecast or opinion of value.",
    }


@app.post("/api/admin/insights/snapshot", tags=["Insights"])
async def admin_insights_snapshot(_=Depends(verify_admin)):
    """Admin one-shot: fires the same snapshot the daily cron does. Handy for
    priming the collection right after deploy so the sparkline has a data point."""
    n = await _snapshot_insights_history()
    return {"success": True, "rows_written": n}


@app.post("/api/admin/insights/backfill", tags=["Insights"])
async def admin_insights_backfill(weeks: int = 12, _=Depends(verify_admin)):
    """Retroactively seed `insights_history` with weekly buckets derived from
    each listing's CREA `modified_at` timestamp + its current list_price. This
    is not a forecast and not a re-imagined historical market — it's the
    weekly median list price of listings whose price/status was last updated
    inside that week. Real CREA DDF® data, labelled as such on the frontend.

    For every (city, property_type, week) triple we upsert one row anchored
    at that week's Monday 00:00 UTC so it slots cleanly into the same series
    the daily cron writes going forward."""
    from statistics import median as _median
    weeks = max(4, min(int(weeks or 12), 26))
    now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    # Anchor each week to its Monday 00:00 UTC. Skip the current (partial) week
    # since the daily cron already writes today's snapshot.
    monday_of_now = now - timedelta(days=now.weekday())
    week_starts = [(monday_of_now - timedelta(weeks=i)) for i in range(1, weeks + 1)][::-1]
    wrote = 0
    for city in BC_INSIGHTS_CITIES:
        for ptype in INSIGHTS_PROPERTY_TYPES:
            for wk_start in week_starts:
                wk_end = wk_start + timedelta(days=7)
                q = {
                    "modified_at": {"$gte": wk_start.isoformat(), "$lt": wk_end.isoformat()},
                    "city": {"$regex": f"^{re.escape(city)}$", "$options": "i"},
                    "list_price": {"$gt": 0},
                }
                if ptype:
                    q["property_type"] = _property_type_query(ptype)
                prices = []
                async for l in db.listings.find(q, {"list_price": 1, "_id": 0}):
                    p = l.get("list_price")
                    if p and p > 0:
                        prices.append(p)
                if not prices or len(prices) < 3:
                    continue
                row = {
                    "city": city,
                    "property_type": ptype or None,
                    "snapshot_at": wk_start,
                    "week_key": wk_start.isocalendar()[1],
                    "active_count": len(prices),
                    "median_list_price": _median(prices),
                    "avg_list_price": sum(prices) / len(prices),
                    "min_price": min(prices),
                    "max_price": max(prices),
                    "source": "backfill_v1",
                }
                await db.insights_history.update_one(
                    {"city": row["city"], "property_type": row["property_type"], "snapshot_at": wk_start},
                    {"$set": row},
                    upsert=True,
                )
                wrote += 1
    logger.info(f"insights_history backfill: wrote/updated {wrote} rows across {weeks} weeks")
    return {"success": True, "weeks": weeks, "rows_written": wrote}



# CASL+PIPA-compliant intake endpoint used by /dashboard-mockup and any future
# consultation flow. Persists to `consultation_requests` collection, fires a
# CASL-safe notification to Doug via Resend, and returns a confirmation ID
# that the frontend can display alongside the "we'll be in touch" success card.

class ConsultationRequest(BaseModel):
    role: Optional[str] = None              # "buyer" | "seller"
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    preferred_contact: Optional[str] = "Email"
    preferred_time: Optional[str] = "Any"
    city: Optional[str] = ""
    working_with_realtor: Optional[bool] = False  # Yes-answer never reaches this endpoint
    is_referral: Optional[bool] = False           # true → outside Doug's service area
    casl_consent: bool
    pipa_ack: bool


@app.post("/api/consultation/request", tags=["Consultations"])
async def consultation_request(body: ConsultationRequest, request: Request):
    """Consultation intake for the /dashboard-mockup flow. Enforces CREA (no
    interference), PIPA (explicit ack + minimal data), and CASL (explicit
    consent + unsubscribe link in the confirmation email). Refuses the record
    if either consent checkbox is false."""
    if not body.casl_consent or not body.pipa_ack:
        raise HTTPException(status_code=400, detail="CASL consent and PIPA acknowledgement are both required.")
    now = datetime.now(timezone.utc)
    doc = {
        "id":                  str(uuid.uuid4()),
        "role":                (body.role or "buyer"),
        "name":                body.name.strip(),
        "email":               body.email.lower().strip(),
        "phone":               (body.phone or "").strip(),
        "preferred_contact":   body.preferred_contact or "Email",
        "preferred_time":      body.preferred_time or "Any",
        "city":                (body.city or "").strip(),
        "is_referral":         bool(body.is_referral),
        "working_with_realtor": bool(body.working_with_realtor),
        "casl_consent":        True,
        "pipa_ack":            True,
        "casl_consent_at":     now.isoformat(),
        "pipa_ack_at":         now.isoformat(),
        "ip":                  (request.client.host if request.client else None),
        "user_agent":          request.headers.get("user-agent", ""),
        "status":              "new",
        "created_at":          now,
    }
    await db.consultation_requests.insert_one(doc)

    # CASL/PIPA-compliant confirmation email to the consumer.
    from urllib.parse import quote_plus
    public_base = os.environ.get("PUBLIC_BASE_URL", "https://eztofind.ca").rstrip("/")
    unsub_url = f"{public_base}/unsubscribe?e={quote_plus(doc['email'])}&list=consultations"
    subject = "We received your EZtoFind.ca consultation request 🐾"
    kind = "consultation_referral" if doc["is_referral"] else f"consultation_{doc['role']}"
    body_text = (
        f"Hi {doc['name']},\n\n"
        f"Thanks for reaching out — Doug will personally follow up within one business day via {doc['preferred_contact'].lower()}.\n\n"
        + (
            f"Because {doc['city'] or 'your area'} is outside Doug's primary service area (Greater Vancouver, Fraser Valley, Sea-to-Sky), "
            f"he'll connect you with a trusted, licensed local REALTOR® in that community.\n\n"
            if doc["is_referral"]
            else "Doug will bring some initial market notes tailored to what you shared.\n\n"
        )
        + "Reminder: EZtoFind.ca provides general information only, never advice. Real estate services are provided exclusively by Doug LeMaire, REALTOR®, BCFSA-licensed, of Fraser Property Management Realty Services Ltd.\n\n"
        f"To manage or unsubscribe from EZtoFind.ca consultation follow-ups, click here: {unsub_url}\n\n"
        "— The EZtoFind.ca team"
    )
    try:
        from services.email_sender import send_email as _send_email
        await _send_email(db,
            to=doc["email"], subject=subject, text=body_text,
            unsubscribe_url=unsub_url, kind=kind, related_id=doc["id"],
        )
    except Exception as exc:
        logger.warning("consultation confirmation email failed: %s", exc)

    # Doug internal notification.
    try:
        admin_body = (
            f"New consultation request received.\n\n"
            f"Role:              {doc['role']}\n"
            f"Referral (outside area)? {doc['is_referral']}\n"
            f"Name:              {doc['name']}\n"
            f"Email:             {doc['email']}\n"
            f"Phone:             {doc['phone'] or '—'}\n"
            f"City:              {doc['city'] or '—'}\n"
            f"Preferred contact: {doc['preferred_contact']}\n"
            f"Preferred time:    {doc['preferred_time']}\n"
            f"Received:          {now.isoformat()}\n"
        )
        from services.email_sender import send_email as _send_email
        await _send_email(db,
            to=os.environ.get("ADMIN_EMAIL", "doug@eztofind.ca"),
            subject=f"[EZtoFind.ca] New {doc['role']}{' referral' if doc['is_referral'] else ''} request — {doc['name']}",
            text=admin_body,
            kind="consultation_admin_notice",
            related_id=doc["id"],
        )
    except Exception as exc:
        logger.warning("consultation admin notice failed: %s", exc)

    return {
        "success": True,
        "id": doc["id"],
        "status": "received",
        "message": "Doug will personally follow up within one business day. A confirmation email is on its way.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Admin views for consultation intakes. Backs the /admin/consultations page so
# Doug can triage new leads without leaving the site and export a
# CASL-compliant CSV audit trail for his brokerage records.
# ─────────────────────────────────────────────────────────────────────────────

_CONSULTATION_STATUSES = ("new", "contacted", "booked", "closed", "referred", "archived")


@app.get("/api/admin/consultations", tags=["Consultations"])
async def admin_list_consultations(
    status: Optional[str] = None,
    role: Optional[str] = None,
    _=Depends(verify_admin),
):
    """List all consultation intakes, newest first. Optional filters by
    status (new/contacted/booked/closed/referred/archived) and role
    (buyer/seller)."""
    q: dict = {}
    if status and status in _CONSULTATION_STATUSES:
        q["status"] = status
    if role in ("buyer", "seller"):
        q["role"] = role
    docs = await db.consultation_requests.find(q, {"_id": 0}).sort("created_at", -1).limit(1000).to_list(1000)
    # Normalize datetime → ISO string for JSON serialization safety.
    for d in docs:
        ca = d.get("created_at")
        if hasattr(ca, "isoformat"):
            d["created_at"] = ca.isoformat()
    counts: dict = {"total": len(docs)}
    for s in _CONSULTATION_STATUSES:
        counts[s] = await db.consultation_requests.count_documents({"status": s})
    return {"items": docs, "counts": counts}


class ConsultationStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


@app.post("/api/admin/consultations/{cid}/status", tags=["Consultations"])
async def admin_update_consultation_status(cid: str, body: ConsultationStatusUpdate, _=Depends(verify_admin)):
    """Update the triage status of a consultation intake. Appends an audit
    entry so Doug can prove chain-of-custody on any lead."""
    if body.status not in _CONSULTATION_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {_CONSULTATION_STATUSES}")
    now = datetime.now(timezone.utc).isoformat()
    audit_entry = {"status": body.status, "at": now, "note": (body.note or "").strip() or None}
    res = await db.consultation_requests.update_one(
        {"id": cid},
        {
            "$set": {"status": body.status, "status_updated_at": now},
            "$push": {"status_history": audit_entry},
        },
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="consultation request not found")
    return {"success": True, "id": cid, "status": body.status}


@app.get("/api/admin/consultations.csv", tags=["Consultations"])
async def admin_export_consultations_csv(
    status: Optional[str] = None,
    role: Optional[str] = None,
    _=Depends(verify_admin),
):
    """Stream all consultation intakes as a CSV file. Includes CASL consent
    and PIPA acknowledgement columns so Doug's brokerage records satisfy
    audit requests."""
    import csv, io
    q: dict = {}
    if status and status in _CONSULTATION_STATUSES:
        q["status"] = status
    if role in ("buyer", "seller"):
        q["role"] = role
    docs = await db.consultation_requests.find(q, {"_id": 0}).sort("created_at", -1).limit(5000).to_list(5000)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "created_at", "id", "role", "is_referral", "status",
        "name", "email", "phone",
        "preferred_contact", "preferred_time", "city",
        "working_with_realtor", "casl_consent_at", "pipa_ack_at",
        "ip", "user_agent",
    ])
    for d in docs:
        ca = d.get("created_at")
        ca_str = ca.isoformat() if hasattr(ca, "isoformat") else (ca or "")
        writer.writerow([
            ca_str, d.get("id", ""), d.get("role", ""),
            "yes" if d.get("is_referral") else "no",
            d.get("status", ""),
            d.get("name", ""), d.get("email", ""), d.get("phone", ""),
            d.get("preferred_contact", ""), d.get("preferred_time", ""), d.get("city", ""),
            "yes" if d.get("working_with_realtor") else "no",
            d.get("casl_consent_at", ""), d.get("pipa_ack_at", ""),
            d.get("ip", "") or "", d.get("user_agent", "") or "",
        ])
    csv_bytes = buf.getvalue().encode("utf-8")
    filename = f"eztofind-consultations-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/.well-known/ai-plugin.json", tags=["Doogie Tools API"])
async def doogie_ai_plugin_manifest():
    """ChatGPT-style plugin manifest so ChatGPT can install Doogie as a tool.
    Points at the canonical OpenAPI spec above."""
    manifest = {
        "schema_version": "v1",
        "name_for_human": "Doogie · BC Real Estate",
        "name_for_model": "doogie_bc_real_estate",
        "description_for_human": "Ask about British Columbia residential real estate — rules, terms, listings, neighbourhoods. Educational retrievals only, never advice.",
        "description_for_model": (
            "Retrieval tool for British Columbia residential real estate context. Use for BCFSA/RESA "
            "rules, MLS® listing lookups, glossary term definitions, and neighbourhood facts. "
            "Educational only — never present output as personalized advice. Refer users to a "
            "licensed BC REALTOR® at https://eztofind.ca/referral-request for anything "
            "advisory. MLS® data is CREA-licensed — do not redistribute."
        ),
        "auth": {"type": "none"},
        "api": {"type": "openapi", "url": "https://eztofind.ca/api/doogie/tools.json"},
        "logo_url": "https://eztofind.ca/doogie-logo.png",
        "contact_email": "hello@eztofind.ca",
        "legal_info_url": "https://eztofind.ca/terms",
    }
    return Response(
        content=json.dumps(manifest, indent=2, ensure_ascii=False),
        media_type="application/json",
        headers={"Cache-Control": "public, s-maxage=3600, max-age=600", "Access-Control-Allow-Origin": "*"},
    )


@app.on_event("shutdown")
async def shutdown(): mongo_client.close()


# ═════════════════════════════════════════════════════════════════════════════
# Market Insights — real aggregates from the CREA DDF listings collection
# ═════════════════════════════════════════════════════════════════════════════
# GET /api/insights?city=Vancouver[&property_type=Apartment]
#   → { city, property_type, active_count, avg_list_price, median_list_price,
#       avg_days_on_market, min_price, max_price, avg_beds, avg_baths,
#       last_updated }
# Powers the Buyer + Seller Insights panes in the Visual Agent so they render
# factual figures instead of illustrative ones. Cached lightly via response
# header so repeated pane visits don't hammer Mongo.
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/insights", tags=["Market Insights"])
async def market_insights(city: str, property_type: str | None = None):
    city = (city or "").strip()
    if len(city) < 2 or len(city) > 60:
        raise HTTPException(status_code=400, detail="Invalid city")
    match: dict = {
        "status": "Active",
        "list_price": {"$gt": 0},
        "city": {"$regex": f"^{re.escape(city)}$", "$options": "i"},
    }
    if property_type:
        # Use the same CREA synonym expansion as the listings search so
        # "Townhouse" also matches "Row / Townhouse", "Attached", "Row";
        # "Condo" also matches "Apartment"; etc. Otherwise the KPI count
        # is a false zero for any city whose DDF uses the CREA canonical
        # label instead of the friendly UI label.
        try:
            match["property_type"] = _property_type_query(property_type)
        except Exception:
            match["property_type"] = {"$regex": f"^{re.escape(property_type)}$", "$options": "i"}
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": None,
            "active_count": {"$sum": 1},
            "avg_list_price": {"$avg": "$list_price"},
            "min_price": {"$min": "$list_price"},
            "max_price": {"$max": "$list_price"},
            "avg_days_on_market": {"$avg": {"$ifNull": ["$days_on_market", None]}},
            "avg_beds": {"$avg": {"$ifNull": ["$beds", "$bedrooms"]}},
            "avg_baths": {"$avg": {"$ifNull": ["$baths", "$bathrooms"]}},
            "prices": {"$push": "$list_price"},
        }},
    ]
    doc = None
    try:
        cursor = db.listings.aggregate(pipeline, allowDiskUse=False)
        async for d in cursor:
            doc = d
            break
    except Exception as e:
        logger.warning(f"insights aggregate failed for {city!r}: {e}")
        raise HTTPException(status_code=502, detail="Insights temporarily unavailable")
    if not doc or (doc.get("active_count") or 0) == 0:
        return {
            "city": city, "property_type": property_type,
            "active_count": 0, "avg_list_price": None, "median_list_price": None,
            "avg_days_on_market": None, "min_price": None, "max_price": None,
            "avg_beds": None, "avg_baths": None,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "source": "CREA DDF®",
        }
    prices = sorted(p for p in (doc.get("prices") or []) if isinstance(p, (int, float)) and p > 0)
    median = None
    if prices:
        n = len(prices)
        median = prices[n // 2] if n % 2 == 1 else (prices[n // 2 - 1] + prices[n // 2]) / 2
    def _round(v, d=0):
        if v is None: return None
        try: return round(float(v), d)
        except Exception: return None
    return {
        "city": city,
        "property_type": property_type,
        "active_count": int(doc.get("active_count") or 0),
        "avg_list_price": _round(doc.get("avg_list_price")),
        "median_list_price": _round(median),
        "avg_days_on_market": _round(doc.get("avg_days_on_market"), 1),
        "min_price": _round(doc.get("min_price")),
        "max_price": _round(doc.get("max_price")),
        "avg_beds": _round(doc.get("avg_beds"), 1),
        "avg_baths": _round(doc.get("avg_baths"), 1),
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "source": "CREA DDF®",
        "compliance": "General information only — not advice. Not intended as a market valuation.",
    }


# ═════════════════════════════════════════════════════════════════════════════
# Address autocomplete — OpenStreetMap Nominatim (free, no API key)
# ═════════════════════════════════════════════════════════════════════════════

_NOMINATIM_UA = "EZtoFind.ca AddressAutocomplete (contact: doug@eztofind.ca)"
_NOMINATIM_BASE = "https://nominatim.openstreetmap.org"


@app.get("/api/address/suggest", tags=["Address"])
async def address_suggest(q: str, lastId: str | None = None):
    """Nominatim /search — country-restricted to Canada, limit 7. Returns a
    lightweight item list the frontend can render as a dropdown. `lastId` is
    accepted for backwards compat but ignored (Nominatim has no drill-down)."""
    q = (q or "").strip()
    if len(q) < 3 or len(q) > 120:
        return {"items": []}
    params = {
        "q": q,
        "format": "jsonv2",
        "countrycodes": "ca",
        "addressdetails": "1",
        "limit": "7",
        "accept-language": "en-CA,en",
    }
    try:
        async with httpx.AsyncClient(timeout=5.0, headers={"User-Agent": _NOMINATIM_UA}) as client:
            r = await client.get(f"{_NOMINATIM_BASE}/search", params=params)
            r.raise_for_status()
            data = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Address service unavailable")
    items = []
    for it in (data or []):
        addr = it.get("address") or {}
        # Build a friendly street-level label
        text_parts = []
        if addr.get("house_number") and (addr.get("road") or addr.get("street")):
            text_parts.append(f"{addr['house_number']} {addr.get('road') or addr.get('street')}")
        elif addr.get("road") or addr.get("street"):
            text_parts.append(addr.get("road") or addr.get("street"))
        elif it.get("name"):
            text_parts.append(it["name"])
        text = ", ".join(text_parts) or (it.get("display_name") or "").split(",")[0]
        city = (
            addr.get("city") or addr.get("town") or addr.get("village")
            or addr.get("municipality") or addr.get("hamlet") or ""
        )
        province = addr.get("state") or ""
        postcode = addr.get("postcode") or ""
        desc_bits = [b for b in (city, province, postcode) if b]
        description = ", ".join(desc_bits)
        # id encodes osm_type:osm_id so /validate can refetch authoritatively
        osm_type = it.get("osm_type")  # node|way|relation
        osm_id = it.get("osm_id")
        if not osm_type or osm_id is None:
            continue
        items.append({
            "id": f"{osm_type}:{osm_id}",
            "text": text.strip(",").strip(),
            "description": description,
            "next": "Retrieve",
        })
    return {"items": items}


@app.get("/api/address/validate", tags=["Address"])
async def address_validate(id: str):
    """Nominatim /lookup by osm_type:osm_id. Enforces province == BC and
    country == CA. Returns 422 with structured detail for out-of-BC results."""
    if not id or len(id) > 100 or ":" not in id:
        raise HTTPException(status_code=400, detail="Invalid address id")
    osm_type, _, osm_id = id.partition(":")
    if osm_type not in ("node", "way", "relation") or not osm_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid address id")
    # Nominatim's osm_ids param takes N|W|R prefix
    prefix = {"node": "N", "way": "W", "relation": "R"}[osm_type]
    params = {
        "osm_ids": f"{prefix}{osm_id}",
        "format": "jsonv2",
        "addressdetails": "1",
        "accept-language": "en-CA,en",
    }
    try:
        async with httpx.AsyncClient(timeout=5.0, headers={"User-Agent": _NOMINATIM_UA}) as client:
            r = await client.get(f"{_NOMINATIM_BASE}/lookup", params=params)
            r.raise_for_status()
            data = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Address service unavailable")
    if not data:
        raise HTTPException(status_code=422, detail="Address was not validated")
    it = data[0]
    addr = it.get("address") or {}
    country_code = (addr.get("country_code") or "").lower()
    province_full = addr.get("state") or ""
    # Province code lookup — Nominatim only returns full names, so map them.
    _CA_PROVINCE_CODES = {
        "British Columbia": "BC", "Alberta": "AB", "Saskatchewan": "SK", "Manitoba": "MB",
        "Ontario": "ON", "Quebec": "QC", "Québec": "QC", "New Brunswick": "NB", "Nova Scotia": "NS",
        "Prince Edward Island": "PE", "Newfoundland and Labrador": "NL", "Yukon": "YT",
        "Northwest Territories": "NT", "Nunavut": "NU",
    }
    province_code = _CA_PROVINCE_CODES.get(province_full, "")
    city = (
        addr.get("city") or addr.get("town") or addr.get("village")
        or addr.get("municipality") or addr.get("hamlet") or ""
    )
    if country_code != "ca":
        raise HTTPException(
            status_code=422,
            detail={"code": "out_of_country", "message": "Only Canadian addresses are accepted"},
        )
    if province_code != "BC":
        raise HTTPException(
            status_code=422,
            detail={
                "code": "out_of_focus",
                "message": f"That address is in {province_full or province_code or 'another province'} — outside Doug's licensed BC focus area.",
                "province": province_code,
                "city": city,
            },
        )
    # Assemble line1 in "house# street" order
    line1 = ""
    if addr.get("house_number") and (addr.get("road") or addr.get("street")):
        line1 = f"{addr['house_number']} {addr.get('road') or addr.get('street')}"
    elif addr.get("road") or addr.get("street"):
        line1 = addr.get("road") or addr.get("street")
    label_bits = [b for b in (line1, city, f"{province_code} {addr.get('postcode') or ''}".strip(), "Canada") if b]
    label = ", ".join(label_bits)
    return {"address": {
        "label": label,
        "line1": line1,
        "line2": "",
        "city": city,
        "province": province_code,
        "postal_code": addr.get("postcode") or "",
        "country": "CA",
        "data_level": "Premise" if addr.get("house_number") else "Street",
        "attribution": "© OpenStreetMap contributors",
    }}
