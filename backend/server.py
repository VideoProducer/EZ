from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import StreamingResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, json, uuid, logging, bcrypt, jwt, asyncio
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
    if body.email.lower() != ADMIN_EMAIL.lower() or body.password != ADMIN_PASSWORD:
        raise HTTPException(401, "Invalid credentials")
    return {"token": create_token(ADMIN_EMAIL), "email": ADMIN_EMAIL}

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
async def doogie_chat(body: ChatIn):
    session_id = body.session_id or str(uuid.uuid4())
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

# =============== LEADS ===============
@api.post("/leads/buyer")
async def create_buyer_lead(lead: BuyerLead, request: Request):
    if not lead.casl_consent or not lead.pipa_ack:
        raise HTTPException(400, "Consent required")
    if lead.working_with_realtor:
        raise HTTPException(400, "Because you're already under contract with another REALTOR®, Doug isn't able to help you directly. Feel free to ask Doogie general questions or view the Communities and Glossary pages.")
    doc = {**lead.model_dump(), **get_consent_meta(request), "unsubscribed": False}
    await db.buyer_leads.insert_one(doc)
    # Background translation of the visitor's free-text note (non-EN forms)
    if (lead.form_lang or "en") != "en" and (lead.notes or "").strip():
        asyncio.create_task(_translate_lead_notes("buyer_leads", lead.id, "notes", lead.notes or "", lead.form_lang or "en"))
    logger.info(f"Buyer lead from {lead.email} (lang={lead.form_lang})")
    return {"success": True, "id": lead.id, "message": "Thank you! Doug will be in touch within 1 business day."}

@api.post("/leads/seller")
async def create_seller_lead(lead: SellerLead, request: Request):
    if not lead.casl_consent or not lead.pipa_ack:
        raise HTTPException(400, "Consent required")
    if lead.currently_listed:
        raise HTTPException(400, "Because your property is currently listed with another REALTOR®, Doug isn't able to help you directly. Feel free to ask Doogie general questions or view the Communities and Glossary pages.")
    doc = {**lead.model_dump(), **get_consent_meta(request), "unsubscribed": False}
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
    """Use Claude Sonnet 4.6 to generate 10 BC real estate FAQs for a glossary term.
    Prompt is engineered for regulatory accuracy against BCFSA, Strata Property Act (BC), ALR/ALC, RESA, PIPA, CASL."""
    prompt = f"""Generate exactly 10 frequently asked questions (with answers) about the British Columbia real estate term "{term}".

Definition context: {definition}

ACCURACY & COMPLIANCE RULES — READ CAREFULLY:
1. Every answer must be factually accurate for British Columbia, Canada as of 2026. If you are not certain of a specific numeric threshold, dollar figure, percentage, deadline, section number, or rule, DO NOT invent one — instead phrase the answer generically (e.g. "consult the current BC Government or BCFSA guidance for exact thresholds").
2. When the term touches licensee conduct, agency, disclosure, trust accounts, remuneration, or dispute resolution: cite the correct authority — the **British Columbia Financial Services Authority (BCFSA)** and the **Real Estate Services Act (RESA)** and its Rules. Never confuse BCFSA with the former Real Estate Council of BC (RECBC), which merged into BCFSA on August 1, 2021.
3. When the term touches strata lots, common property, limited common property, strata corporations, bylaws, Form B / Form F / Form I, depreciation reports, or contingency reserve funds: cite the **Strata Property Act (SBC 1998, c. 43)** and its Regulation. Do NOT cite "Condominium Act" (that is Ontario/other-province terminology and does not apply in BC).
4. When the term touches farmland, agricultural land, subdivision restrictions, or non-farm use: cite the **Agricultural Land Commission Act (SBC 2002, c. 36)** and the **Agricultural Land Reserve (ALR)** administered by the **Agricultural Land Commission (ALC)**. Reference specific ALR restrictions accurately (e.g., minimum lot sizes, non-farm-use applications, non-adhering residential use rules) only when you are certain — otherwise refer readers to the ALC directly.
5. When the term touches Property Transfer Tax, First-Time Home Buyers' Program, Newly Built Home Exemption, Speculation and Vacancy Tax, or Additional PTT (Foreign Buyer Tax): cite the **BC Property Transfer Tax Act** and the current BC Ministry of Finance thresholds. If you cite a numeric threshold, use only the values you are highly confident are current for 2026 (e.g. First-Time Home Buyer full exemption up to $835,000; Newly Built Home exemption up to $1,100,000; PTT tiers of 1% / 2% / 3% / additional 2% on residential value over $3,000,000).
6. When the term touches personal information, consent, or privacy: cite the **Personal Information Protection Act (PIPA)** of BC. For unsolicited commercial electronic messages, cite **Canada's Anti-Spam Legislation (CASL)**.
7. When the term touches wills, estates, probate, or executor duties: cite the **Wills, Estates and Succession Act (WESA)** of BC.
8. When the term touches foreclosure or judicial sale: cite the **BC Supreme Court Civil Rules** and the **Law and Equity Act** (foreclosure in BC is judicial, not power-of-sale).
9. Do NOT provide legal, tax, mortgage-specific, or investment ADVICE. Provide accurate, neutral, educational information only. Do NOT recommend or discourage specific actions.
10. Answers must be 2–4 sentences. Plain-language but precise. Prefer citing the correct BC statute name over vague references like "the law".

FORMAT RULES:
- Questions must be BC-specific (British Columbia, Canada) and directly relevant to "{term}"
- Do NOT append any disclaimer or "consult a REALTOR" line — the page carries one site-wide disclaimer already
- Return ONLY valid JSON: an array of exactly 10 objects, each with "q" and "a" keys
- No preamble, no markdown, no code fences, just the JSON array."""
    try:
        chat = make_chat(api_key=EMERGENT_LLM_KEY, session_id=f"faq-{uuid.uuid4()}", system_message="You are a British Columbia real estate compliance drafter. Every fact you state must be accurate under BC statutes (BCFSA/RESA, Strata Property Act, Agricultural Land Commission Act, Property Transfer Tax Act, PIPA, CASL, WESA). You output only valid JSON arrays.").with_model("anthropic", "claude-sonnet-4-6")
        full = ""
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta): full += ev.content
            elif isinstance(ev, StreamDone): break
        # extract JSON
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
    # Amenity warm-up disabled per user request

    # Generate sitemap.xml on startup so search engines get a fresh copy
    try:
        from sitemap_generator import generate_sitemap
        stats = await generate_sitemap(db)
        logger.info(f"sitemap.xml regenerated: {stats['total']} URLs ({stats['static']} static + {stats['glossary']} glossary + {stats['communities']} communities)")
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

@api.get("/")
async def root():
    return {"app": "EZtoFind.ca", "status": "ok"}

# =============== ADMIN: AI CONTENT APPROVAL QUEUE (BCFSA compliance) ===============
@api.get("/admin/approvals/summary")
async def approvals_summary(_=Depends(verify_admin)):
    pending_faqs = await db.glossary.count_documents({"faqs.0": {"$exists": True}, "faqs_approved": {"$ne": True}})
    pending_syn = await db.community_synopses.count_documents({"approved": {"$ne": True}})
    pending_wx = await db.community_weather.count_documents({"approved": {"$ne": True}})
    return {"pending_glossary_faqs": pending_faqs, "pending_synopses": pending_syn, "pending_weather": pending_wx}

@api.get("/admin/approvals/glossary")
async def pending_glossary(_=Depends(verify_admin)):
    items = await db.glossary.find({"faqs.0": {"$exists": True}, "faqs_approved": {"$ne": True}}, {"_id":0}).to_list(1000)
    return items

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

@api.post("/admin/approvals/generate-all")
async def generate_all_missing(_=Depends(verify_admin)):
    """Generate synopsis + weather for EVERY BC community that doesn't have them yet. Runs in background."""
    import asyncio as _a
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    todo = []
    for region, lst in all_comm.items():
        for community in lst:
            slug = re.sub(r"[^a-z0-9]+","-", community.lower()).strip("-")
            todo.append((slug, community, region))

    async def worker():
        SEM = _a.Semaphore(4)  # up to 4 concurrent Claude calls
        async def gen_syn(slug, name, region):
            async with SEM:
                if await db.community_synopses.find_one({"slug": slug, "synopsis": {"$ne": ""}}): return
                s = await generate_community_synopsis(name, region)
                if s: await db.community_synopses.replace_one({"slug": slug}, {"slug": slug, "name": name, "region": region, "synopsis": s, "approved": False, "ts": now_iso()}, upsert=True)
        async def gen_wx(slug, name, region):
            async with SEM:
                if await db.community_weather.find_one({"slug": slug, "weather": {"$ne": ""}}): return
                w = await generate_community_weather(name, region)
                if w: await db.community_weather.replace_one({"slug": slug}, {"slug": slug, "name": name, "region": region, "weather": w, "approved": False, "ts": now_iso()}, upsert=True)
        tasks = []
        for slug, name, region in todo:
            tasks.append(gen_syn(slug, name, region))
            tasks.append(gen_wx(slug, name, region))
        await _a.gather(*tasks, return_exceptions=True)
        logger.info(f"Bulk generation complete for {len(todo)} communities")

    _a.create_task(worker())
    return {"success": True, "message": f"Generating synopsis + weather for {len(todo)} communities in background. Refresh the approval queues in ~15-30 minutes.", "total": len(todo)}

@api.post("/admin/approvals/generate-all-glossary")
async def generate_all_glossary(_=Depends(verify_admin)):
    """Generate FAQs for EVERY glossary term missing them. Runs in background. ~30-60 min for 400+ terms."""
    import asyncio as _a
    todo = await db.glossary.find({"$or":[{"faqs":{"$exists":False}},{"faqs":[]}]}, {"_id":0,"slug":1,"term":1,"definition":1}).to_list(2000)

    async def worker():
        SEM = _a.Semaphore(4)
        async def gen(t):
            async with SEM:
                if await db.glossary.find_one({"slug": t["slug"], "faqs.0": {"$exists": True}}): return
                faqs = await generate_faqs_for_term(t["term"], t["definition"])
                if faqs:
                    await db.glossary.update_one({"slug": t["slug"]}, {"$set": {"faqs": faqs, "faqs_approved": False, "faqs_generated_at": now_iso()}})
        await _a.gather(*[gen(t) for t in todo], return_exceptions=True)
        logger.info(f"Bulk FAQ generation complete for {len(todo)} glossary terms")

    _a.create_task(worker())
    return {"success": True, "message": f"Generating FAQs for {len(todo)} glossary terms in background. Refresh the Glossary tab in ~30-60 minutes.", "total": len(todo)}

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
# All endpoints below are rate-limited (anti-scraping requirement per CREA Rules).
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.responses import JSONResponse
from services.analytics_logger import record_event as _log_event
from services.ddf_sync import (
    credentials_ready as _ddf_ready,
    sync_incremental as _ddf_sync,
    test_connection as _ddf_test,
)

_limiter = Limiter(key_func=get_remote_address)
app.state.limiter = _limiter

@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests. Please slow down."})


# EZtoFind.ca is a RESIDENTIAL real estate site — commercial/industrial
# property types are excluded everywhere (facet dropdown, listings search,
# and Doogie NL search). If you need to re-enable a category, remove it here.
EXCLUDED_PROPERTY_TYPES = {
    "Business", "Hospitality", "Industrial", "Office", "Retail", "Other",
}

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
        query["property_type"] = {"$regex": f"^{re.escape(property_type)}$", "$options": "i"}
    if beds_min is not None:  query["beds"] = {"$gte": beds_min}
    if baths_min is not None: query["baths"] = {"$gte": baths_min}
    price_q = {}
    if price_min is not None: price_q["$gte"] = price_min
    if price_max is not None: price_q["$lte"] = price_max
    if price_q: query["list_price"] = price_q
    if features:
        feats = [f.strip() for f in features.split(",") if f.strip()]
        if feats: query["features"] = {"$all": feats}
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
    """Return distinct filter values so the search UI can populate dropdowns."""
    cities = sorted(await db.listings.distinct("city", {"status":"Active"}))
    types = sorted(await db.listings.distinct("property_type", {"status":"Active"}))
    types = [t for t in types if t not in EXCLUDED_PROPERTY_TYPES]
    regions = sorted(await db.listings.distinct("region", {"status":"Active"}))
    return {"cities": cities, "property_types": types, "regions": regions}

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


# =============== DOOGIE MLS® SEARCH (natural language → filters → listings) ===============
FILTER_EXTRACTION_SYSTEM = """You are a real estate search filter extractor.
Read the user's request and output a SINGLE JSON object with these fields (all optional):
{
  "city": string | null,          // BC city/community name; capitalize properly
  "property_type": string | null, // one of: Detached, Condo, Townhouse, Acreage
  "beds_min": integer | null,     // minimum bedrooms
  "baths_min": integer | null,    // minimum bathrooms
  "price_min": integer | null,    // minimum in CAD dollars (no commas)
  "price_max": integer | null,    // maximum in CAD dollars (no commas)
  "keyword": string | null,       // free-text feature keyword (e.g. "ocean view", "suite", "top floor")
  "sort": string | null           // "price_asc" | "price_desc" | "newest"
}
RULES:
- Return ONLY the JSON object, no explanation, no markdown fences.
- If user says "under $800K" set price_max=800000. "over $2M" set price_min=2000000.
- If user says "2-bed" or "2 bedroom" set beds_min=2.
- Property type synonyms: "home"/"house" → Detached; "apartment"/"suite" → Condo; "townhome"/"townhouse" → Townhouse; "acreage"/"farm"/"ranch" → Acreage.
- Location: BC cities only. If the user says "Vancouver" keep it as "Vancouver" (not "Greater Vancouver").
- Descriptive terms like "top floor", "ocean view", "waterfront", "suite" go into keyword.
- If nothing extracted, return {"city":null,"property_type":null,"beds_min":null,"baths_min":null,"price_min":null,"price_max":null,"keyword":null,"sort":null}."""

async def _extract_listing_filters(user_query: str) -> dict:
    """Use Claude to extract structured search filters from a natural-language query."""
    if not ANTHROPIC_API_KEY:
        return {}
    try:
        r = await _anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=400,
            system=FILTER_EXTRACTION_SYSTEM,
            messages=[{"role": "user", "content": user_query}],
        )
        text = r.content[0].text if r.content else "{}"
        # Strip any accidental fences
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1] if "```" in text[3:] else text[3:]
            if text.startswith("json"): text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        logger.warning(f"filter extraction failed: {e}")
        return {}

@api.post("/doogie/mls-search")
@_limiter.limit("30/minute")
async def doogie_mls_search(request: Request, payload: dict):
    """Doogie's natural-language MLS® search. Takes a raw user query, extracts
    structured filters via Claude, then queries the listings collection.

    Body: {"message": "4-bedroom homes in Whistler"}
    Returns: {"intent_matched": bool, "filters": {...}, "count": N, "listings": [...], "summary": str}
    """
    q = (payload.get("message") or "").strip()
    if not q or len(q) > 500:
        return {"intent_matched": False, "listings": [], "count": 0, "filters": {}, "summary": ""}

    filters = await _extract_listing_filters(q)
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
        query["property_type"] = {"$regex": f"^{re.escape(filters['property_type'])}$", "$options": "i"}
    if filters.get("beds_min"):      query["beds"] = {"$gte": int(filters["beds_min"])}
    if filters.get("baths_min"):     query["baths"] = {"$gte": int(filters["baths_min"])}
    pr = {}
    if filters.get("price_min"): pr["$gte"] = int(filters["price_min"])
    if filters.get("price_max"): pr["$lte"] = int(filters["price_max"])
    if pr: query["list_price"] = pr
    # Keyword search is only applied WITHIN the locality scope; it never
    # widens the result set beyond the resolved city/region.
    if filters.get("keyword"):
        query["$text"] = {"$search": filters["keyword"]}

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

    # Craft summary
    parts = []
    if filters.get("beds_min"): parts.append(f"{filters['beds_min']}+ bed")
    if filters.get("property_type"): parts.append(str(filters["property_type"]).lower() + ("s" if not str(filters["property_type"]).lower().endswith("s") else ""))
    if filters.get("city"): parts.append(f"in {filters['city']}")
    price_note = ""
    if filters.get("price_max"): price_note = f" under ${int(filters['price_max']):,}"
    elif filters.get("price_min"): price_note = f" over ${int(filters['price_min']):,}"
    criteria = " ".join(parts) + price_note if parts else "listings matching your search"
    if total == 0:
        summary = f"I couldn't find any {criteria.strip()} right now. Try broadening the price or beds, or ask me to search a nearby community."
    elif total <= 6:
        summary = f"Here {'is' if total==1 else 'are'} {total} {criteria.strip()}:"
    else:
        summary = f"I found {total} matching {criteria.strip()} — showing the top 6. Refine your search on the full listings page for more."

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

@app.post("/api/doogie/transcribe")
async def transcribe_voice(audio: UploadFile = File(...), language: str = Form("en")):
    """Transcribe voice input via OpenAI Whisper. Requires OPENAI_API_KEY in env.
    Frontend sends a webm/opus blob (browser MediaRecorder default).
    Language hint maps our codes → Whisper language codes."""
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        return {"text": "", "error": "Voice input is coming soon — configure OPENAI_API_KEY to enable Whisper."}
    lang_map = {"en":"en", "zh-Hant":"zh", "zh-Hans":"zh", "pa":"pa", "fa":"fa", "pt-PT":"pt"}
    try:
        data = await audio.read()
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {openai_key}"},
                files={"file": (audio.filename or "voice.webm", data, audio.content_type or "audio/webm")},
                data={"model": "whisper-1", "language": lang_map.get(language, "en")},
            )
            if r.status_code != 200:
                logger.warning(f"Whisper error {r.status_code}: {r.text[:200]}")
                return {"text": "", "error": "Transcription service returned an error."}
            js = r.json()
            return {"text": js.get("text",""), "language": language}
    except Exception as e:
        logger.warning(f"Whisper transcribe failed: {e}")
        return {"text": "", "error": "Transcription failed. Please try typing."}

@app.on_event("shutdown")
async def shutdown(): mongo_client.close()
