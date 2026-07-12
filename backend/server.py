from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, json, uuid, logging, bcrypt, jwt, re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
JWT_SECRET = os.environ['JWT_SECRET']
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']

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
5. For any advice-seeking question, respond: "That's a great question for a licensed REALTOR® — I can connect you with Doug LeMaire or a vetted REALTOR® in our referral network. Would you like to fill out a quick form?"
6. Always end substantive answers with: "This is general information only. For advice specific to your situation, please connect with a licensed REALTOR®."

WHAT YOU DO:
- Explain BC real estate terms (strata, PTT, foreclosure, etc.) in plain English
- Guide users to the right section of the site (Listings, Focus Regions, Specialties, Glossary, Contact)
- Help users understand the buyer/seller lead process
- Be warm, helpful, and use light personality (you're a golden retriever in a suit — you love helping people find homes!)

FOCUS AREAS: Greater Vancouver, Fraser Valley, Sea-to-Sky Corridor.
DOUG'S SPECIALTIES: Detached, Luxury, Equestrian, Estate Sales/Probate, Condos.

Keep responses concise (2-4 short paragraphs max). Be friendly but professional."""

@api.post("/doogie/chat")
async def doogie_chat(body: ChatIn):
    session_id = body.session_id or str(uuid.uuid4())
    await db.chat_messages.insert_one({"session_id": session_id, "role": "user", "content": body.message, "ts": now_iso()})
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=DOOGIE_SYSTEM).with_model("anthropic", "claude-sonnet-4-6")

    async def gen():
        full = ""
        try:
            async for ev in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
            await db.chat_messages.insert_one({"session_id": session_id, "role": "assistant", "content": full, "ts": now_iso()})
            yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"
        except Exception as e:
            logger.error(f"Doogie error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})

# =============== LEADS ===============
@api.post("/leads/buyer")
async def create_buyer_lead(lead: BuyerLead):
    if not lead.casl_consent or not lead.pipa_ack:
        raise HTTPException(400, "Consent required")
    doc = lead.model_dump()
    await db.buyer_leads.insert_one(doc)
    logger.info(f"Buyer lead from {lead.email}")
    return {"success": True, "id": lead.id, "message": "Thank you! Doug will be in touch within 1 business day."}

@api.post("/leads/seller")
async def create_seller_lead(lead: SellerLead):
    if not lead.casl_consent or not lead.pipa_ack:
        raise HTTPException(400, "Consent required")
    doc = lead.model_dump()
    await db.seller_leads.insert_one(doc)
    return {"success": True, "id": lead.id, "message": "Thank you! Doug will be in touch within 1 business day."}

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

@api.post("/realtors/apply")
async def realtor_apply(body: RealtorInitial):
    existing = await db.realtor_applications.find_one({"email": body.email})
    if existing:
        return {"success": True, "id": existing["id"], "message": "You've already applied. Check your email for the next form."}
    app_obj = RealtorApplication(full_name=body.full_name, email=body.email, stage="initial")
    await db.realtor_applications.insert_one(app_obj.model_dump())
    # In production: send email from realtors@eztofind.ca with credentials form link
    return {"success": True, "id": app_obj.id, "message": "Thank you! Check your email — we'll send you the credentials form shortly.", "next_form_url": f"/realtors/credentials/{app_obj.id}"}

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
    # Generate FAQs on demand if none exist
    if not t.get("faqs"):
        faqs = await generate_faqs_for_term(t["term"], t["definition"])
        await db.glossary.update_one({"slug": slug}, {"$set": {"faqs": faqs}})
        t["faqs"] = faqs
    return t

async def generate_faqs_for_term(term: str, definition: str) -> List[dict]:
    """Use Claude Sonnet 4.6 to generate 10 BC real estate FAQs for a glossary term."""
    prompt = f"""Generate exactly 10 frequently asked questions (with answers) about the BC real estate term "{term}".

Definition context: {definition}

Rules:
- Questions must be BC-specific (British Columbia, Canada)
- Answers should be 2-3 sentences, factual, informational only (no advice)
- Each answer must end with: "For advice specific to your situation, consult a licensed REALTOR®."
- Return ONLY valid JSON: an array of 10 objects with "q" and "a" keys.
- No preamble, no markdown, just the JSON array."""
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"faq-{uuid.uuid4()}", system_message="You output only valid JSON arrays.").with_model("anthropic", "claude-sonnet-4-6")
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

# =============== COMMUNITY AMENITIES (OpenStreetMap) ===============
NOMINATIM = "https://nominatim.openstreetmap.org/search"
OVERPASS = "https://overpass-api.de/api/interpreter"
UA = "EZtoFind.ca/1.0 (contact info@eztofind.ca)"

async def geocode(name: str):
    """Geocode BC community via Nominatim. Cached forever."""
    cached = await db.geo_cache.find_one({"name": name}, {"_id": 0})
    if cached: return cached
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(NOMINATIM, params={"q": f"{name}, British Columbia, Canada", "format": "json", "limit": 1}, headers={"User-Agent": UA})
        arr = r.json()
    if not arr: return None
    doc = {"name": name, "lat": float(arr[0]["lat"]), "lon": float(arr[0]["lon"])}
    await db.geo_cache.insert_one(dict(doc))
    return doc

async def fetch_amenities(lat: float, lon: float, radius: int = 5000, retries: int = 3):
    """Query Overpass API for BC amenities near coords, with enrichment. Retries on rate-limit."""
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="school"](around:{radius},{lat},{lon});
      way["amenity"="school"](around:{radius},{lat},{lon});
      node["amenity"="hospital"](around:{radius},{lat},{lon});
      way["amenity"="hospital"](around:{radius},{lat},{lon});
      node["amenity"="clinic"](around:{radius},{lat},{lon});
      node["shop"="mall"](around:{radius},{lat},{lon});
      way["shop"="mall"](around:{radius},{lat},{lon});
      node["leisure"="park"](around:{radius},{lat},{lon});
      way["leisure"="park"](around:{radius},{lat},{lon});
      node["leisure"="sports_centre"](around:{radius},{lat},{lon});
      way["leisure"="sports_centre"](around:{radius},{lat},{lon});
      node["amenity"="community_centre"](around:{radius},{lat},{lon});
      way["amenity"="community_centre"](around:{radius},{lat},{lon});
    );
    out center tags 200;
    """
    endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
    last_err = None
    for attempt in range(retries):
        endpoint = endpoints[attempt % len(endpoints)]
        try:
            async with httpx.AsyncClient(timeout=40) as c:
                r = await c.post(endpoint, data={"data": query}, headers={"User-Agent": UA})
            if r.status_code == 429 or "too many requests" in r.text.lower():
                await _asyncio.sleep(15 * (attempt+1))
                continue
            if r.status_code != 200:
                last_err = f"HTTP {r.status_code} from {endpoint}"
                await _asyncio.sleep(5)
                continue
            try:
                data = r.json()
            except Exception:
                last_err = "Non-JSON response (rate-limited?)"
                await _asyncio.sleep(15 * (attempt+1))
                continue
            break
        except Exception as e:
            last_err = str(e)
            await _asyncio.sleep(5)
    else:
        raise RuntimeError(f"Overpass unavailable after {retries} attempts: {last_err}")

    out = {"schools": [], "hospitals": [], "malls": [], "parks": [], "recreation": []}
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name: continue
        latc = el.get("lat") or el.get("center", {}).get("lat")
        lonc = el.get("lon") or el.get("center", {}).get("lon")
        item = {"name": name, "lat": latc, "lon": lonc, "address": (tags.get("addr:housenumber","")+" "+tags.get("addr:street","")).strip()}
        amenity = tags.get("amenity"); shop = tags.get("shop"); leisure = tags.get("leisure")
        if amenity == "school":
            # Tier 2 enrichment: school level + operator type
            level = tags.get("isced:level") or ""
            op_type = tags.get("operator:type") or ""
            school_type = tags.get("school:type") or ""
            grades = tags.get("grades") or ""
            # infer level from name
            nm = name.lower()
            if "elementary" in nm or "primary" in nm: item["level"] = "Elementary"
            elif "secondary" in nm or "high school" in nm: item["level"] = "Secondary"
            elif "middle" in nm: item["level"] = "Middle"
            elif "0" in level or "1" in level: item["level"] = "Elementary"
            elif "2" in level or "3" in level: item["level"] = "Secondary"
            else: item["level"] = "School"
            item["operator"] = "Private" if op_type == "private" or school_type == "private" else ("Public" if op_type == "public" or op_type == "government" else "")
            item["grades"] = grades
            out["schools"].append(item)
        elif amenity in ("hospital", "clinic"):
            # Tier 2: attach BC Health Authority based on region
            # rough boundaries (lat/lon based) — Fraser Health, VCH, Island Health, Interior, Northern
            if lat > 55: ha = "Northern Health"
            elif lon < -125.5: ha = "Island Health"
            elif -123.3 < lon < -121.8 and 49.0 < lat < 49.6: ha = "Fraser Health"
            elif -123.6 < lon < -122.7 and 49.1 < lat < 49.6: ha = "Vancouver Coastal Health"
            elif lon > -119: ha = "Interior Health"
            else: ha = "Interior Health"
            item["type"] = "Hospital" if amenity == "hospital" else "Clinic"
            item["authority"] = ha
            out["hospitals"].append(item)
        elif shop == "mall": out["malls"].append(item)
        elif leisure == "park": out["parks"].append(item)
        elif leisure == "sports_centre" or amenity == "community_centre": out["recreation"].append(item)
    # dedupe by name per category
    for k in out:
        seen = set(); u = []
        for it in out[k]:
            if it["name"] in seen: continue
            seen.add(it["name"]); u.append(it)
        out[k] = u
    return out

@api.get("/community/{slug}/amenities")
async def community_amenities(slug: str):
    """Return schools/hospitals/malls/parks/recreation for a BC community. Cached 30 days. Includes admin overrides."""
    # Look up community name from slug
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    name = None; region = None
    for r, lst in all_comm.items():
        for c in lst:
            if re.sub(r"[^a-z0-9]+","-", c.lower()).strip("-") == slug:
                name = c; region = r; break
        if name: break
    if not name: raise HTTPException(404, "Community not found")

    # Cache check
    cached = await db.amenities_cache.find_one({"slug": slug}, {"_id": 0})
    amenities = None
    if cached:
        age = datetime.now(timezone.utc) - datetime.fromisoformat(cached["ts"])
        if age.days < 30:
            amenities = cached["data"]

    if amenities is None:
        # Geocode
        geo = await geocode(name)
        if not geo: raise HTTPException(404, "Could not geocode community")
        try:
            amenities = await fetch_amenities(geo["lat"], geo["lon"])
        except Exception as e:
            logger.error(f"Overpass fetch failed for {name}: {e}")
            raise HTTPException(503, "Amenity data temporarily unavailable")
        await db.amenities_cache.replace_one({"slug": slug}, {"slug": slug, "ts": now_iso(), "data": amenities}, upsert=True)

    # Merge admin overrides
    overrides = await db.amenity_overrides.find({"slug": slug}, {"_id": 0}).to_list(500)
    hidden = {(o["category"], o["name"]) for o in overrides if o.get("action") == "hide"}
    additions = [o for o in overrides if o.get("action") == "add"]

    merged = {k: [] for k in ["schools","hospitals","malls","parks","recreation"]}
    for cat, items in amenities.items():
        for it in items:
            if (cat, it["name"]) in hidden: continue
            merged[cat].append(it)
    # Add admin-added items
    for a in additions:
        cat = a.get("category")
        if cat in merged:
            merged[cat].insert(0, {"name": a["name"], "lat": a.get("lat"), "lon": a.get("lon"), "address": a.get("address",""), "admin_added": True, "notes": a.get("notes","")})

    return {"community": name, "region": region, **merged}

# --- Admin: amenity override CRUD ---
class AmenityOverride(BaseModel):
    slug: str
    category: str  # schools/hospitals/malls/parks/recreation
    action: str  # add / hide
    name: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    address: Optional[str] = ""
    notes: Optional[str] = ""

@api.get("/admin/amenity-overrides")
async def list_overrides(slug: Optional[str] = None, _=Depends(verify_admin)):
    q = {"slug": slug} if slug else {}
    return await db.amenity_overrides.find(q, {"_id":0}).to_list(1000)

@api.post("/admin/amenity-overrides")
async def add_override(body: AmenityOverride, _=Depends(verify_admin)):
    if body.action not in ("add","hide"): raise HTTPException(400, "action must be add or hide")
    if body.category not in ("schools","hospitals","malls","parks","recreation"): raise HTTPException(400, "invalid category")
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    await db.amenity_overrides.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/admin/amenity-overrides/{oid}")
async def delete_override(oid: str, _=Depends(verify_admin)):
    r = await db.amenity_overrides.delete_one({"id": oid})
    return {"success": True, "deleted": r.deleted_count}

@api.post("/admin/community/{slug}/refresh")
async def refresh_amenities(slug: str, _=Depends(verify_admin)):
    """Force-refresh OSM data for a community (bypass 30-day cache)."""
    await db.amenities_cache.delete_one({"slug": slug})
    return {"success": True, "message": "Cache cleared. Next visit will re-fetch."}

# Warm-up: internal helper (no auth) — used by the one-time bulk warm script.
# Guarded: only runs if a special header is present.
import asyncio as _asyncio
@api.post("/admin/warmup-all-communities")
async def warmup_all(force: bool = False, _=Depends(verify_admin)):
    """Bulk-fetch OSM amenities for every BC community. Rate-limited. Runs in background."""
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    total = sum(len(v) for v in all_comm.values())
    async def worker():
        done = 0; failed = 0
        for region, lst in all_comm.items():
            for community in lst:
                slug = re.sub(r"[^a-z0-9]+","-", community.lower()).strip("-")
                try:
                    cached = await db.amenities_cache.find_one({"slug": slug})
                    if cached and not force:
                        age = datetime.now(timezone.utc) - datetime.fromisoformat(cached["ts"])
                        if age.days < 30:
                            done += 1; continue
                    geo = await geocode(community)
                    if not geo: failed += 1; continue
                    amenities = await fetch_amenities(geo["lat"], geo["lon"])
                    await db.amenities_cache.replace_one({"slug": slug}, {"slug": slug, "ts": now_iso(), "data": amenities}, upsert=True)
                    done += 1
                    await _asyncio.sleep(10.0)  # OSM fair-use pacing — polite, respectful, no rate-limit
                except Exception as e:
                    logger.error(f"Warmup fail {community}: {e}")
                    failed += 1
                    await _asyncio.sleep(0.5)
        logger.info(f"Warmup complete: {done} done, {failed} failed")
        await db.warmup_log.insert_one({"ts": now_iso(), "total": total, "done": done, "failed": failed})
    _asyncio.create_task(worker())
    return {"success": True, "message": f"Warm-up started in background for {total} communities. Will take ~15 minutes. Check /api/admin/warmup-status."}

@api.get("/admin/warmup-status")
async def warmup_status(_=Depends(verify_admin)):
    all_comm = json.loads((ROOT_DIR/"data"/"communities_seed.json").read_text())
    total = sum(len(v) for v in all_comm.values())
    cached_count = await db.amenities_cache.count_documents({})
    last_log = await db.warmup_log.find_one({}, {"_id":0}, sort=[("ts",-1)])
    return {"total_communities": total, "cached": cached_count, "progress_pct": round(100*cached_count/max(total,1),1), "last_run": last_log}

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
    # Amenity warm-up disabled per user request

@api.get("/")
async def root():
    return {"app": "EZtoFind.ca", "status": "ok"}

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown(): mongo_client.close()
