from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import StreamingResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, json, uuid, logging, bcrypt, jwt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
import re
import httpx
from glossary_sources import get_sources_for_term
from community_sources import get_community_sources, get_weather_sources
from bc_stations import get_station_for_community, eccc_station_page_url, eccc_normals_search_url

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
5. For any advice-seeking question, respond: "That's a great question for a licensed REALTOR® — I can connect you with Doug LeMaire or a REALTOR® in our referral network. Would you like to fill out a quick form?"
6. Always end substantive answers with: "This is general information only. For advice specific to your situation, please connect with a licensed REALTOR®."

REFERRAL RULES (ALWAYS OFFER — DO NOT SKIP):
- Whenever a user mentions or asks about ANY specific BC city, town, community, or neighborhood, you MUST end your response with a clear referral offer as a question the user can answer with "yes".
- If the location is inside Doug's FOCUS AREAS (Greater Vancouver, Fraser Valley, Sea-to-Sky Corridor), ask: "Would you like me to connect you directly with Doug LeMaire, REALTOR®? Just say yes and I'll point you to the quick contact form."
- If the location is ANYWHERE ELSE in British Columbia (e.g. Osoyoos, Kelowna, Prince George, Nelson, Victoria, Kamloops, Nanaimo, Cranbrook, Fort St. John, etc.), ask: "Would you like me to refer you to a REALTOR® in [CITY NAME]? Just say yes and I'll point you to our referral request form."
- Never assume the answer — always phrase it as a direct question ending in a question mark so the user can reply "yes" or "no".
- Never leave a location-related response without the referral question.

ROUTING RULES (when user says YES, or asks how to reach Doug / get a referral):
- Buying in a FOCUS AREA (Greater Vancouver, Fraser Valley, Sea-to-Sky) → send them to the Buyer Intake form at **/buyer** on this site. Say: "Great — head to /buyer on EZtoFind.ca and fill out the quick intake. Doug typically responds within 1 business day."
- Selling in a FOCUS AREA → send them to **/seller**. Say: "Great — head to /seller on EZtoFind.ca."
- Anywhere ELSE in BC (out-of-area referral) → send them to **/referral-request**. Say: "Great — head to /referral-request on EZtoFind.ca and we'll connect you with a REALTOR® in [CITY]."
- General questions with no lead intent → point to **/contact** only.
- ALWAYS use these exact site paths (/buyer, /seller, /referral-request, /contact). NEVER invent URLs, external links, or generic "contact page" language. NEVER use full URLs like https://eztofind.ca/... — use the relative path only so the site's internal navigation works.

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
    await db.chat_messages.insert_one({
        "session_id": session_id, "role": "user",
        "content": redacted_msg,  # only redacted stored
        "pii_flags": pii_flags,
        "ts": now_iso(),
        "expires_at": expires  # BSON date for TTL index
    })
    chat = make_chat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=DOOGIE_SYSTEM).with_model("anthropic", "claude-sonnet-4-6")

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

# =============== LEADS ===============
@api.post("/leads/buyer")
async def create_buyer_lead(lead: BuyerLead, request: Request):
    if not lead.casl_consent or not lead.pipa_ack:
        raise HTTPException(400, "Consent required")
    if lead.working_with_realtor:
        raise HTTPException(400, "Because you're already under contract with another REALTOR®, Doug isn't able to help you directly. Feel free to ask Doogie general questions or view the Communities and Glossary pages.")
    doc = {**lead.model_dump(), **get_consent_meta(request), "unsubscribed": False}
    await db.buyer_leads.insert_one(doc)
    logger.info(f"Buyer lead from {lead.email}")
    return {"success": True, "id": lead.id, "message": "Thank you! Doug will be in touch within 1 business day."}

@api.post("/leads/seller")
async def create_seller_lead(lead: SellerLead, request: Request):
    if not lead.casl_consent or not lead.pipa_ack:
        raise HTTPException(400, "Consent required")
    if lead.currently_listed:
        raise HTTPException(400, "Because your property is currently listed with another REALTOR®, Doug isn't able to help you directly. Feel free to ask Doogie general questions or view the Communities and Glossary pages.")
    doc = {**lead.model_dump(), **get_consent_meta(request), "unsubscribed": False}
    await db.seller_leads.insert_one(doc)
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
    # Attach authoritative sources — prefer stored per-term override (curated
    # via the Lovable.dev pipeline), else fall back to the algorithmic default.
    override = t.get("sources_override")
    if override and isinstance(override, list) and len(override) > 0:
        t["sources"] = override
        t["sources_source"] = "curated"
    else:
        t["sources"] = get_sources_for_term(t.get("term",""), t.get("category",""))
        t["sources_source"] = "default"
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
    return await _apply_upsert(item, ip)

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
    return {"total": len(results), "created": created, "updated": updated, "errors": errors, "results": results}

@api.get("/public/glossary")
async def public_list_glossary(since: Optional[str] = None, limit: int = 500, offset: int = 0):
    """Public read of all terms (no auth). Optional ?since=ISO8601 for incremental sync."""
    q = {}
    if since:
        q["last_curated_at"] = {"$gte": since}
    total = await db.glossary.count_documents(q)
    items = await db.glossary.find(q, {"_id": 0}).sort("term", 1).skip(offset).limit(limit).to_list(limit)
    # For each, if no sources_override, resolve the default source list so consumers see final rendered sources
    for it in items:
        if not it.get("sources_override"):
            it["sources"] = get_sources_for_term(it.get("term",""), it.get("category",""))
            it["sources_source"] = "default"
        else:
            it["sources"] = it["sources_override"]
            it["sources_source"] = "curated"
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
    if not t.get("sources_override"):
        t["sources"] = get_sources_for_term(t.get("term",""), t.get("category",""))
        t["sources_source"] = "default"
    else:
        t["sources"] = t["sources_override"]
        t["sources_source"] = "curated"
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

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown(): mongo_client.close()
