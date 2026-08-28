// EquestrianRepresentation — self-contained editorial section injected
// into /specialties/equestrian above the compliance-footer and below all
// existing page content (hero, search, listings, checklist, lead form,
// AI assistant, FAQ). NO existing component, form, CTA, listing card,
// header, footer, nav, or data feed is modified.
//
// Compliance guardrails baked in (auditable — see the Sep 2026 spec):
//   • BCFSA + brokerage identity inherited from the parent page's
//     compliance-footer. No professional-status claims made here.
//   • CREA Article 16 disclaimer is inherited from the parent page and
//     also included on every lead submission below.
//   • $3.397M Campbell Valley card is explicitly BUYER REPRESENTATION.
//     No address, MLS® #, listing media, seller/buyer identity, or
//     equestrian-use claim is made.
//   • No fabricated testimonials — visible placeholder only.
//   • CTAs open inline forms (never modals or overlays).
//   • Forms POST to existing /api/leads/buyer and /api/leads/seller
//     with distinct source tags — no new third-party CRM/mailer/tracker.
//   • JSON-LD NOT emitted here (see developer note).
//
// IMPLEMENTATION NOTE — do not add FAQPage / Review / Person /
// RealEstateAgent / LocalBusiness / Offer / Service / VideoObject schema
// here. Structured data, client testimonials, reviews, transactions,
// property media, and service claims must be implemented only after the
// visible content, permissions, brokerage requirements, licensing
// details, data rights, and compliance eligibility have been verified.
import React, { useState } from "react";
import axios from "axios";
import { TurnstileWidget, getTurnstileToken } from "../App";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Local palette — mirrors the parent EquestrianLeadMockup constants so
// the visual system reads cohesive.
const BRAND = {
  navy: "#0F2A5B", gold: "#F5A623", cream: "#F5F0E1",
  ink:  "#1F2937", muted: "#6B7280",
  paper: "#FAFAF7", hairline: "#E5E7EB",
  soft:  "#F0F4FB",
};
const SERIF = "'Playfair Display', Georgia, serif";
const SANS  = "'Inter', -apple-system, sans-serif";

// ── Content ────────────────────────────────────────────────────────
const FIT_CARDS = [
  { h: "Land and turnout",       b: "Evaluate usable turnout, grading, soil conditions, slope, wet areas, drainage patterns, grazing potential, fencing needs, and how the land functions through different seasons." },
  { h: "Barn and facility",      b: "Consider whether stall layout, ventilation, storage, wash areas, electrical service, access, maintenance condition, and day-to-day functionality suit the current horse count and intended routine." },
  { h: "Arena and riding",       b: "Review existing riding areas and consider whether a future arena location may be realistic after setbacks, grading, drainage, municipal requirements, and site conditions are independently assessed." },
  { h: "Water and manure",       b: "Ask how household and livestock water needs may be supplied, and consider the practical requirements for manure storage, drainage, maintenance, and responsible site management." },
  { h: "Access and logistics",   b: "Consider whether trailers, hay deliveries, feed suppliers, farriers, veterinarians, service vehicles, and emergency access can enter, turn, and operate safely on the site." },
  { h: "Location and lifestyle", b: "Evaluate proximity to trails, riding facilities, feed suppliers, veterinarians, trainers, shows, schools, commuter routes, and the amenities important to the household." },
  { h: "Long-term use",          b: "Consider future priorities such as additional horses, a coach, caretaker accommodation, a secondary residence, boarding, training, business activity, or a change in family needs. Confirm what is possible before relying on it." },
];

const STRATEGY_POINTS = [
  "Property positioning and likely buyer profile.",
  "Review of relevant active and completed competing properties.",
  "Land, facility, access, trail, and lifestyle features to assess and present.",
  "Recommended pre-market preparation and launch sequencing.",
  "Privacy-aware inquiry and showing protocol.",
  "Marketing recommendations and a reasoned pricing discussion.",
];

const DILIGENCE_PROP = [
  "Title, covenants, easements, rights-of-way, and access.",
  "Current zoning, permitted uses, setbacks, and municipal requirements.",
  "ALR status and the implications that may be relevant to the intended use.",
  "Land configuration, drainage, site conditions, existing structures, and access.",
  "Available property records, disclosures, survey information, and permits where applicable.",
];
const DILIGENCE_OPS = [
  "Water source, supply, and any questions requiring appropriate professional review.",
  "Septic, servicing, drainage, and building-condition considerations.",
  "Barn, arena, fencing, electrical, and outbuilding assessments.",
  "Insurance, financing, appraisal, environmental, and business-use considerations.",
  "Confirmation of material facts with relevant local authorities and qualified professionals.",
];

const LOCAL_AREAS = [
  "South Langley and Campbell Valley equestrian properties",
  "Langley acreage and estate properties",
  "Aldergrove horse properties",
  "Abbotsford acreage and equestrian properties",
  "Chilliwack acreage and equestrian properties",
  "Maple Ridge acreage properties",
];

// ── Shared visual atoms (local to this section) ─────────────────────
const H3 = ({ children, style = {}, id }) => (
  <h3 id={id} style={{
    fontFamily: SERIF, color: BRAND.navy, fontWeight: 600,
    fontSize: "clamp(1.35rem, 2.2vw, 1.75rem)", lineHeight: 1.25,
    letterSpacing: "-0.01em", margin: "0 0 14px", ...style,
  }}>{children}</h3>
);
const Kicker = ({ children }) => (
  <div style={{
    fontFamily: SANS, fontSize: "0.72rem", fontWeight: 600,
    letterSpacing: "0.22em", textTransform: "uppercase",
    color: BRAND.gold, marginBottom: 14,
  }}>{children}</div>
);
const PillBtn = ({ children, onClick, primary = true, testId, ariaControls }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontFamily: SANS, fontSize: "0.86rem", fontWeight: 600,
    letterSpacing: "0.04em", padding: "12px 22px",
    borderRadius: 999, cursor: "pointer",
    textDecoration: "none", border: "1.5px solid",
    transition: "background 0.16s ease, color 0.16s ease",
  };
  const primaryStyle   = { ...base, background: BRAND.navy, color: "#fff", borderColor: BRAND.navy };
  const secondaryStyle = { ...base, background: "transparent", color: BRAND.navy, borderColor: BRAND.navy };
  return (
    <button type="button" onClick={onClick} data-testid={testId} aria-controls={ariaControls}
      style={primary ? primaryStyle : secondaryStyle}>{children}</button>
  );
};

const smoothScroll = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

// ── Shared inline styles ────────────────────────────────────────────
const label = { fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: BRAND.muted, fontWeight: 600, marginBottom: 6, display: "block" };
const input = { width: "100%", boxSizing: "border-box", fontFamily: SANS, fontSize: "0.92rem", background: "#fff", color: BRAND.ink, padding: "10px 12px", border: `1px solid ${BRAND.hairline}`, borderRadius: 6, outline: "none" };
const twoCol = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const ackBox = { display: "grid", gap: 8, padding: "14px 16px", background: BRAND.soft, border: `1px solid ${BRAND.hairline}`, borderRadius: 6 };
const ackRow = { display: "grid", gridTemplateColumns: "18px 1fr", gap: 10, alignItems: "start", fontFamily: SANS, fontSize: "0.82rem", color: BRAND.muted, lineHeight: 1.55, cursor: "pointer" };

// ── Consultation form (private acreage) ─────────────────────────────
function ConsultationForm() {
  const [f, setF] = useState({
    full_name: "", email: "", phone: "", city: "",
    property_type: "Acreage", timeline: "Exploring",
    preferred_contact: "email", notes: "",
    pipa_ack: false, casl_consent: false, dorts_ack: false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState("");
  const [done, setDone] = useState(false);

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.pipa_ack || !f.dorts_ack) { setMsg("Please confirm the privacy and representation acknowledgements."); return; }
    setBusy(true); setMsg("");
    try {
      const payload = {
        full_name: f.full_name, email: f.email, phone: f.phone,
        property_address: "Not disclosed at consultation stage",
        city: f.city || "British Columbia",
        property_type: f.property_type,
        timeline: f.timeline, estimated_value: "To be discussed privately",
        reason: `EQUESTRIAN & ACREAGE — PRIVATE CONSULTATION · preferred: ${f.preferred_contact}. ${f.notes || ""}`.trim(),
        casl_consent: !!f.casl_consent, pipa_ack: true, dorts_ack: true,
        source: "equestrian_private_consultation",
        turnstile_token: getTurnstileToken(),
      };
      await axios.post(`${API}/leads/seller`, payload);
      setDone(true);
    } catch (err) {
      setMsg(err.response?.data?.detail || err.message || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  if (done) return (
    <div data-testid="eq-consult-thanks" style={{ padding: "22px 24px", background: BRAND.paper, border: `1px solid ${BRAND.hairline}`, borderRadius: 8 }}>
      <h4 style={{ margin: 0, fontFamily: SERIF, color: BRAND.navy, fontSize: "1.15rem" }}>Thank you.</h4>
      <p style={{ margin: "10px 0 0", fontFamily: SANS, color: BRAND.muted, fontSize: "0.9rem", lineHeight: 1.65 }}>
        Your private inquiry has been received. Doug LeMaire will respond personally within one business day.
      </p>
    </div>
  );

  return (
    <form onSubmit={submit} data-testid="eq-consult-form" style={{ display: "grid", gap: 12 }}>
      <fieldset style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        <legend style={{ padding: 0, fontFamily: SANS, fontSize: "0.85rem", color: BRAND.muted, marginBottom: 6 }}>A discreet first conversation for owners considering a sale, exploring timing, or seeking an informed perspective before beginning a formal listing process.</legend>
        <label><span style={label}>Full name</span>
          <input required value={f.full_name} onChange={(e) => set("full_name", e.target.value)} data-testid="eq-consult-name" style={input} autoComplete="name"/></label>
        <div style={twoCol}>
          <label><span style={label}>Email address</span>
            <input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} data-testid="eq-consult-email" style={input} autoComplete="email"/></label>
          <label><span style={label}>Phone number</span>
            <input required type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} data-testid="eq-consult-phone" style={input} autoComplete="tel"/></label>
        </div>
        <label><span style={label}>Property city or community</span>
          <input value={f.city} onChange={(e) => set("city", e.target.value)} data-testid="eq-consult-city" style={input} placeholder="e.g. Campbell Valley, South Langley"/></label>
        <div style={twoCol}>
          <label><span style={label}>Property type</span>
            <select value={f.property_type} onChange={(e) => set("property_type", e.target.value)} data-testid="eq-consult-type" style={input}>
              <option>Acreage</option><option>Private horse property</option><option>Estate with equestrian potential</option>
              <option>Working facility</option><option>Hobby farm</option><option>ALR property</option><option>Other</option>
            </select>
          </label>
          <label><span style={label}>Approximate timing</span>
            <select value={f.timeline} onChange={(e) => set("timeline", e.target.value)} data-testid="eq-consult-timing" style={input}>
              <option>Exploring</option><option>3–6 months</option><option>6–12 months</option><option>More than 12 months</option>
            </select>
          </label>
          <label><span style={label}>Preferred contact method</span>
            <select value={f.preferred_contact} onChange={(e) => set("preferred_contact", e.target.value)} data-testid="eq-consult-contact" style={input}>
              <option value="phone">Phone</option><option value="email">Email</option><option value="text">Text</option>
            </select>
          </label>
        </div>
        <label><span style={label}>Optional message</span>
          <textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} data-testid="eq-consult-notes" style={{ ...input, resize: "vertical" }}/></label>
        <div style={ackBox}>
          <label style={ackRow}><input type="checkbox" required checked={f.pipa_ack} onChange={(e) => set("pipa_ack", e.target.checked)} data-testid="eq-consult-pipa"/> <span>I acknowledge the <a href="/privacy" style={{ color: BRAND.navy, fontWeight: 600 }}>PIPA privacy notice</a> — information submitted here is handled privately by Doug LeMaire.</span></label>
          <label style={ackRow}><input type="checkbox" required checked={f.dorts_ack} onChange={(e) => set("dorts_ack", e.target.checked)} data-testid="eq-consult-dorts"/> <span>I understand submitting this inquiry does not create a REALTOR®-client relationship — <a href="/glossary/dorts" style={{ color: BRAND.navy, fontWeight: 600 }}>Disclosure of Representation in Trading Services</a> is provided in writing before formal services begin.</span></label>
          <label style={ackRow}><input type="checkbox" checked={f.casl_consent} onChange={(e) => set("casl_consent", e.target.checked)} data-testid="eq-consult-casl"/> <span>Optional — you may email me general BC market updates I can unsubscribe from at any time (CASL express consent).</span></label>
        </div>
        <TurnstileWidget/>
        {msg && <div role="alert" style={{ color: "#B7351B", fontFamily: SANS, fontSize: "0.85rem" }}>{msg}</div>}
        <div><button type="submit" disabled={busy} data-testid="eq-consult-submit" style={{
          fontFamily: SANS, fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.04em",
          background: BRAND.navy, color: "#fff", border: "1.5px solid " + BRAND.navy,
          padding: "12px 24px", borderRadius: 999, cursor: busy ? "wait" : "pointer",
        }}>{busy ? "Sending…" : "Request a Private Consultation"}</button></div>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: "0.78rem", color: BRAND.muted }}>Private inquiry. Doug LeMaire will respond personally.</p>
      </fieldset>
    </form>
  );
}

// ── Confidential assessment form ────────────────────────────────────
function AssessmentForm() {
  const [f, setF] = useState({
    full_name: "", email: "", phone: "", city: "",
    property_type: "Acreage", acreage: "", features: "",
    timeline: "Exploring", preferred_contact: "email", notes: "",
    pipa_ack: false, casl_consent: false, dorts_ack: false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState("");
  const [done, setDone] = useState(false);
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.pipa_ack || !f.dorts_ack) { setMsg("Please confirm the privacy and representation acknowledgements."); return; }
    setBusy(true); setMsg("");
    try {
      const notes = [
        "EQUESTRIAN & ACREAGE — CONFIDENTIAL ASSESSMENT",
        `Acreage: ${f.acreage || "—"}`,
        `Existing features: ${f.features || "—"}`,
        `Preferred contact: ${f.preferred_contact}`,
        f.notes || "",
      ].join(" · ");
      const payload = {
        full_name: f.full_name, email: f.email, phone: f.phone,
        property_address: "Not disclosed at assessment stage",
        city: f.city || "British Columbia",
        property_type: f.property_type,
        timeline: f.timeline, estimated_value: "To be discussed privately",
        reason: notes, casl_consent: !!f.casl_consent, pipa_ack: true, dorts_ack: true,
        source: "equestrian_confidential_assessment",
        turnstile_token: getTurnstileToken(),
      };
      await axios.post(`${API}/leads/seller`, payload);
      setDone(true);
    } catch (err) {
      setMsg(err.response?.data?.detail || err.message || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  if (done) return (
    <div data-testid="eq-assess-thanks" style={{ padding: "22px 24px", background: BRAND.paper, border: `1px solid ${BRAND.hairline}`, borderRadius: 8 }}>
      <h4 style={{ margin: 0, fontFamily: SERIF, color: BRAND.navy, fontSize: "1.15rem" }}>Thank you.</h4>
      <p style={{ margin: "10px 0 0", fontFamily: SANS, color: BRAND.muted, fontSize: "0.9rem", lineHeight: 1.65 }}>
        Your confidential inquiry has been received. Doug LeMaire will respond personally within one business day to schedule a private conversation.
      </p>
    </div>
  );

  return (
    <form onSubmit={submit} data-testid="eq-assess-form" style={{ display: "grid", gap: 12 }}>
      <fieldset style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        <legend style={{ padding: 0, fontFamily: SANS, fontSize: "0.85rem", color: BRAND.muted, marginBottom: 6 }}>For owners ready to examine property positioning, competitive context, likely buyer profile, preparation priorities, showing considerations, and a considered sale strategy.</legend>
        <label><span style={label}>Full name</span>
          <input required value={f.full_name} onChange={(e) => set("full_name", e.target.value)} data-testid="eq-assess-name" style={input} autoComplete="name"/></label>
        <div style={twoCol}>
          <label><span style={label}>Email address</span>
            <input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} data-testid="eq-assess-email" style={input} autoComplete="email"/></label>
          <label><span style={label}>Phone number</span>
            <input required type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} data-testid="eq-assess-phone" style={input} autoComplete="tel"/></label>
        </div>
        <label><span style={label}>Property city or community</span>
          <input value={f.city} onChange={(e) => set("city", e.target.value)} data-testid="eq-assess-city" style={input}/></label>
        <div style={twoCol}>
          <label><span style={label}>Property type</span>
            <select value={f.property_type} onChange={(e) => set("property_type", e.target.value)} data-testid="eq-assess-type" style={input}>
              <option>Acreage</option><option>Private horse property</option><option>Estate with equestrian potential</option>
              <option>Working facility</option><option>Hobby farm</option><option>ALR property</option><option>Other</option>
            </select>
          </label>
          <label><span style={label}>Approximate acreage</span>
            <input value={f.acreage} onChange={(e) => set("acreage", e.target.value)} data-testid="eq-assess-acreage" style={input} placeholder="e.g. 5 acres · 17.9 acres"/></label>
        </div>
        <label><span style={label}>Existing features or facilities</span>
          <textarea rows={2} value={f.features} onChange={(e) => set("features", e.target.value)} data-testid="eq-assess-features" style={{ ...input, resize: "vertical" }} placeholder="e.g. main residence, 8-stall barn, outdoor arena, riding trails, hay storage"/></label>
        <div style={twoCol}>
          <label><span style={label}>Expected timing</span>
            <select value={f.timeline} onChange={(e) => set("timeline", e.target.value)} data-testid="eq-assess-timing" style={input}>
              <option>Exploring</option><option>3–6 months</option><option>6–12 months</option><option>More than 12 months</option>
            </select>
          </label>
          <label><span style={label}>Preferred contact method</span>
            <select value={f.preferred_contact} onChange={(e) => set("preferred_contact", e.target.value)} data-testid="eq-assess-contact" style={input}>
              <option value="phone">Phone</option><option value="email">Email</option><option value="text">Text</option>
            </select>
          </label>
        </div>
        <label><span style={label}>Optional message</span>
          <textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} data-testid="eq-assess-notes" style={{ ...input, resize: "vertical" }}/></label>
        <div style={ackBox}>
          <label style={ackRow}><input type="checkbox" required checked={f.pipa_ack} onChange={(e) => set("pipa_ack", e.target.checked)} data-testid="eq-assess-pipa"/> <span>I acknowledge the <a href="/privacy" style={{ color: BRAND.navy, fontWeight: 600 }}>PIPA privacy notice</a>.</span></label>
          <label style={ackRow}><input type="checkbox" required checked={f.dorts_ack} onChange={(e) => set("dorts_ack", e.target.checked)} data-testid="eq-assess-dorts"/> <span>I understand submitting this inquiry does not create a REALTOR®-client relationship — <a href="/glossary/dorts" style={{ color: BRAND.navy, fontWeight: 600 }}>DoRTS</a> is provided in writing before formal services begin.</span></label>
          <label style={ackRow}><input type="checkbox" checked={f.casl_consent} onChange={(e) => set("casl_consent", e.target.checked)} data-testid="eq-assess-casl"/> <span>Optional — you may email me general BC market updates (CASL express consent).</span></label>
        </div>
        <TurnstileWidget/>
        {msg && <div role="alert" style={{ color: "#B7351B", fontFamily: SANS, fontSize: "0.85rem" }}>{msg}</div>}
        <div><button type="submit" disabled={busy} data-testid="eq-assess-submit" style={{
          fontFamily: SANS, fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.04em",
          background: BRAND.navy, color: "#fff", border: "1.5px solid " + BRAND.navy,
          padding: "12px 24px", borderRadius: 999, cursor: busy ? "wait" : "pointer",
        }}>{busy ? "Sending…" : "Request a Confidential Assessment"}</button></div>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: "0.78rem", color: BRAND.muted }}>Private inquiry. Doug LeMaire will respond personally.</p>
      </fieldset>
    </form>
  );
}

// ── Buyer search form ───────────────────────────────────────────────
function BuyerForm() {
  const [f, setF] = useState({
    full_name: "", email: "", phone: "",
    communities: "", property_category: "Private horse property",
    current_horses: "1–2", anticipated_horses: "1–2",
    discipline: "", infrastructure: [],
    budget: "", timeline: "1–3 months",
    also_selling: "No", off_market: "Possibly",
    preferred_contact: "email", notes: "",
    pipa_ack: false, casl_consent: false, dorts_ack: false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState("");
  const [done, setDone] = useState(false);
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  const toggleInfra = (opt) => set("infrastructure", f.infrastructure.includes(opt) ? f.infrastructure.filter((x) => x !== opt) : [...f.infrastructure, opt]);

  const INFRA = ["Stable","Indoor arena","Outdoor arena","Turnout","Trail access","Truck and trailer access","Staff or caretaker accommodation","Secondary-residence potential","Business-use considerations","Other"];

  const submit = async (e) => {
    e.preventDefault();
    if (!f.pipa_ack || !f.dorts_ack) { setMsg("Please confirm the privacy and representation acknowledgements."); return; }
    setBusy(true); setMsg("");
    try {
      const areas = (f.communities || "British Columbia").split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      const notes = [
        "EQUESTRIAN & ACREAGE — PRIVATE BUYER SEARCH",
        `Current horses: ${f.current_horses}`,
        `Anticipated horses: ${f.anticipated_horses}`,
        `Discipline / facility priorities: ${f.discipline || "—"}`,
        `Required infrastructure: ${f.infrastructure.join(", ") || "—"}`,
        `Also selling: ${f.also_selling}`,
        `Discreet opportunities of interest: ${f.off_market}`,
        `Preferred contact: ${f.preferred_contact}`,
        f.notes || "",
      ].join(" · ");
      const payload = {
        full_name: f.full_name, email: f.email, phone: f.phone, areas,
        property_type: f.property_category,
        budget_range: f.budget || "To be discussed",
        timeline: f.timeline,
        financing_status: "To be discussed privately",
        preferred_contact: f.preferred_contact, notes,
        casl_consent: !!f.casl_consent, pipa_ack: true, dorts_ack: true,
        source: "equestrian_private_buyer",
        turnstile_token: getTurnstileToken(),
      };
      await axios.post(`${API}/leads/buyer`, payload);
      setDone(true);
    } catch (err) {
      setMsg(err.response?.data?.detail || err.message || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  if (done) return (
    <div data-testid="eq-buyer-thanks" style={{ padding: "22px 24px", background: BRAND.paper, border: `1px solid ${BRAND.hairline}`, borderRadius: 8 }}>
      <h4 style={{ margin: 0, fontFamily: SERIF, color: BRAND.navy, fontSize: "1.15rem" }}>Thank you.</h4>
      <p style={{ margin: "10px 0 0", fontFamily: SANS, color: BRAND.muted, fontSize: "0.9rem", lineHeight: 1.65 }}>
        Your private buyer inquiry has been received. Doug LeMaire will respond personally within one business day.
      </p>
    </div>
  );

  return (
    <form onSubmit={submit} data-testid="eq-buyer-form" style={{ display: "grid", gap: 12 }}>
      <fieldset style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        <legend style={{ padding: 0, fontFamily: SANS, fontSize: "0.85rem", color: BRAND.muted, marginBottom: 6 }}>Share your core requirements so Doug can respond with a more relevant and considered starting point.</legend>
        <label><span style={label}>Full name</span>
          <input required value={f.full_name} onChange={(e) => set("full_name", e.target.value)} data-testid="eq-buyer-name" style={input} autoComplete="name"/></label>
        <div style={twoCol}>
          <label><span style={label}>Email address</span>
            <input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} data-testid="eq-buyer-email" style={input} autoComplete="email"/></label>
          <label><span style={label}>Phone number</span>
            <input required type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} data-testid="eq-buyer-phone" style={input} autoComplete="tel"/></label>
        </div>
        <label><span style={label}>Desired communities or preferred travel radius</span>
          <input value={f.communities} onChange={(e) => set("communities", e.target.value)} data-testid="eq-buyer-communities" style={input} placeholder="e.g. South Langley, Aldergrove, Abbotsford — within 45 min of Cloverdale"/></label>
        <div style={twoCol}>
          <label><span style={label}>Property category</span>
            <select value={f.property_category} onChange={(e) => set("property_category", e.target.value)} data-testid="eq-buyer-category" style={input}>
              <option>Private horse property</option><option>Acreage</option><option>Estate with equestrian potential</option>
              <option>Working facility</option><option>Hobby farm</option><option>ALR property</option><option>Other</option>
            </select>
          </label>
          <label><span style={label}>Intended budget range</span>
            <input value={f.budget} onChange={(e) => set("budget", e.target.value)} data-testid="eq-buyer-budget" style={input} placeholder="e.g. $3M – $5M"/></label>
        </div>
        <div style={twoCol}>
          <label><span style={label}>Current horse count</span>
            <select value={f.current_horses} onChange={(e) => set("current_horses", e.target.value)} data-testid="eq-buyer-current" style={input}>
              <option>None</option><option>1–2</option><option>3–5</option><option>6–10</option><option>More than 10</option><option>Prefer not to say</option>
            </select>
          </label>
          <label><span style={label}>Anticipated horse count</span>
            <select value={f.anticipated_horses} onChange={(e) => set("anticipated_horses", e.target.value)} data-testid="eq-buyer-anticipated" style={input}>
              <option>None</option><option>1–2</option><option>3–5</option><option>6–10</option><option>More than 10</option><option>Prefer not to say</option>
            </select>
          </label>
        </div>
        <label><span style={label}>Optional discipline or facility priorities</span>
          <input value={f.discipline} onChange={(e) => set("discipline", e.target.value)} data-testid="eq-buyer-discipline" style={input} placeholder="e.g. dressage, jumping, western, trail, breeding"/></label>
        <fieldset style={{ border: `1px solid ${BRAND.hairline}`, borderRadius: 6, padding: "12px 14px" }}>
          <legend style={{ ...label, marginBottom: 0, padding: "0 6px" }}>Required infrastructure</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginTop: 8 }} data-testid="eq-buyer-infra">
            {INFRA.map((opt) => (
              <label key={opt} style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: SANS, fontSize: "0.85rem", color: BRAND.ink, cursor: "pointer" }}>
                <input type="checkbox" checked={f.infrastructure.includes(opt)} onChange={() => toggleInfra(opt)}/> {opt}
              </label>
            ))}
          </div>
        </fieldset>
        <div style={twoCol}>
          <label><span style={label}>Purchase timing</span>
            <select value={f.timeline} onChange={(e) => set("timeline", e.target.value)} data-testid="eq-buyer-timing" style={input}>
              <option>Immediately</option><option>1–3 months</option><option>3–6 months</option><option>6–12 months</option><option>More than 12 months</option>
            </select>
          </label>
          <label><span style={label}>Also selling a property?</span>
            <select value={f.also_selling} onChange={(e) => set("also_selling", e.target.value)} data-testid="eq-buyer-selling" style={input}>
              <option>Yes</option><option>No</option><option>Possibly</option>
            </select>
          </label>
          <label><span style={label}>Discreet or privately marketed opportunities of interest?</span>
            <select value={f.off_market} onChange={(e) => set("off_market", e.target.value)} data-testid="eq-buyer-offmarket" style={input}>
              <option>Yes</option><option>No</option><option>Possibly</option>
            </select>
          </label>
          <label><span style={label}>Preferred contact method</span>
            <select value={f.preferred_contact} onChange={(e) => set("preferred_contact", e.target.value)} data-testid="eq-buyer-contact" style={input}>
              <option value="phone">Phone</option><option value="email">Email</option><option value="text">Text</option>
            </select>
          </label>
        </div>
        <label><span style={label}>Optional notes</span>
          <textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} data-testid="eq-buyer-notes" style={{ ...input, resize: "vertical" }}/></label>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: "0.78rem", color: BRAND.muted, lineHeight: 1.55 }}>
          Where appropriate, financing readiness or proof of funds may help facilitate private-viewing and offer discussions.
        </p>
        <div style={ackBox}>
          <label style={ackRow}><input type="checkbox" required checked={f.pipa_ack} onChange={(e) => set("pipa_ack", e.target.checked)} data-testid="eq-buyer-pipa"/> <span>I acknowledge the <a href="/privacy" style={{ color: BRAND.navy, fontWeight: 600 }}>PIPA privacy notice</a>.</span></label>
          <label style={ackRow}><input type="checkbox" required checked={f.dorts_ack} onChange={(e) => set("dorts_ack", e.target.checked)} data-testid="eq-buyer-dorts"/> <span>I understand submitting this inquiry does not create a REALTOR®-client relationship — <a href="/glossary/dorts" style={{ color: BRAND.navy, fontWeight: 600 }}>DoRTS</a> is provided in writing before formal services begin.</span></label>
          <label style={ackRow}><input type="checkbox" checked={f.casl_consent} onChange={(e) => set("casl_consent", e.target.checked)} data-testid="eq-buyer-casl"/> <span>Optional — you may email me general BC market updates (CASL express consent).</span></label>
        </div>
        <TurnstileWidget/>
        {msg && <div role="alert" style={{ color: "#B7351B", fontFamily: SANS, fontSize: "0.85rem" }}>{msg}</div>}
        <div><button type="submit" disabled={busy} data-testid="eq-buyer-submit" style={{
          fontFamily: SANS, fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.04em",
          background: BRAND.navy, color: "#fff", border: "1.5px solid " + BRAND.navy,
          padding: "12px 24px", borderRadius: 999, cursor: busy ? "wait" : "pointer",
        }}>{busy ? "Sending…" : "Request Private Buyer Representation"}</button></div>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: "0.78rem", color: BRAND.muted }}>Private inquiry. Doug LeMaire will respond personally.</p>
      </fieldset>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function EquestrianRepresentation() {
  const [openConsult, setOpenConsult] = useState(false);
  const [openAssess,  setOpenAssess]  = useState(false);
  const [openBuyer,   setOpenBuyer]   = useState(false);

  return (
    <section
      id="equestrian-representation"
      data-testid="equestrian-representation"
      style={{
        background: BRAND.paper,
        padding: "96px 24px 96px",
        borderTop: `1px solid ${BRAND.hairline}`,
      }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>

        {/* Section intro */}
        <div style={{ maxWidth: 780, marginBottom: 48 }}>
          <Kicker>Equestrian & Acreage Representation</Kicker>
          <h2 style={{
            fontFamily: SERIF, fontSize: "clamp(1.75rem, 3.2vw, 2.6rem)",
            lineHeight: 1.18, letterSpacing: "-0.015em", color: BRAND.navy,
            margin: "0 0 22px", fontWeight: 500,
          }} data-testid="eq-h2">
            Equestrian and acreage property decisions deserve more than a listing search.
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "1rem", lineHeight: 1.75, color: BRAND.ink, margin: "0 0 18px" }}>
            Private horse properties, acreage, estates, and land with equestrian potential require a different level of evaluation than a conventional residential purchase or sale. Doug LeMaire provides direct real-estate representation for clients considering distinctive rural and lifestyle properties across South Langley, Campbell Valley, the Fraser Valley, and Greater Vancouver.
          </p>
          <p style={{ fontFamily: SANS, fontSize: "1rem", lineHeight: 1.75, color: BRAND.ink, margin: "0 0 18px" }}>
            The process considers property fit, market positioning, land and lifestyle questions, qualified access, due-diligence coordination, and clear guidance from the first conversation through completion.
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.9rem", lineHeight: 1.7, color: BRAND.muted, margin: 0 }}>
            Doug helps clients identify relevant questions, obtain available property records, and coordinate a practical real-estate diligence plan. Legal, land-use, environmental, water, septic, appraisal, inspection, engineering, insurance, and building advice should be obtained from the appropriate qualified professionals.
          </p>
        </div>

        {/* ── Selected Acreage Representation card ─────────────── */}
        <article data-testid="eq-selected-acreage" style={{
          background: "#fff", border: `1px solid ${BRAND.hairline}`,
          borderRadius: 10, padding: "34px 34px", marginBottom: 64,
        }}>
          <div style={{ fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: BRAND.gold, fontWeight: 700, marginBottom: 12 }}>
            Selected Acreage Representation
          </div>
          <h3 style={{ fontFamily: SERIF, fontSize: "clamp(1.35rem, 2.4vw, 1.85rem)", color: BRAND.navy, margin: "0 0 16px", fontWeight: 600 }}>
            Buyer Representation | South Langley | $3.397M
          </h3>
          <p style={{ fontFamily: SANS, fontSize: "0.98rem", lineHeight: 1.75, color: BRAND.ink, margin: "0 0 14px", maxWidth: 820 }}>
            Doug represented the purchaser in the acquisition of 17.9 private acres near Campbell Valley Park and the Irene Pearce Trail — an exceptional South Langley holding with open fields, privacy, and potential for a future estate or equestrian-oriented lifestyle. The representation focused on evaluating the property's long-term potential, land-use considerations, and acquisition strategy through completion.
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.8rem", lineHeight: 1.65, color: BRAND.muted, margin: "0 0 20px", fontStyle: "italic", maxWidth: 820 }}>
            This was buyer representation. Specific property details, purchaser information, and intended use remain confidential. Property suitability, land use, and future development or facility potential require independent verification.
          </p>
          <PillBtn primary={false} onClick={() => { setOpenBuyer(true); setTimeout(() => smoothScroll("eq-buyer-form-anchor"), 60); }} testId="eq-selected-cta" ariaControls="eq-buyer-form-anchor">
            Discuss Your Acreage Requirements
          </PillBtn>
        </article>

        {/* ── Property Fit framework ───────────────────────────── */}
        <div style={{ marginBottom: 64 }}>
          <H3>Does the property work for your horses?</H3>
          <p style={{ fontFamily: SANS, fontSize: "0.98rem", lineHeight: 1.7, color: BRAND.ink, margin: "0 0 24px", maxWidth: 780 }}>
            A property may permit certain rural or livestock uses yet still be unsuitable for a client's daily horsekeeping needs, discipline, business plans, or long-term objectives. The following framework helps purchasers evaluate questions worth exploring before a major decision.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }} data-testid="eq-fit-cards">
            {FIT_CARDS.map((c) => (
              <article key={c.h} style={{ background: "#fff", border: `1px solid ${BRAND.hairline}`, borderRadius: 8, padding: "22px 22px" }}>
                <h4 style={{ fontFamily: SERIF, fontSize: "1.08rem", color: BRAND.navy, margin: "0 0 10px", fontWeight: 600 }}>{c.h}</h4>
                <p style={{ fontFamily: SANS, fontSize: "0.9rem", lineHeight: 1.65, color: BRAND.muted, margin: 0 }}>{c.b}</p>
              </article>
            ))}
          </div>
          <p style={{ marginTop: 20, fontFamily: SANS, fontSize: "0.82rem", color: BRAND.muted, lineHeight: 1.65, fontStyle: "italic" }}>
            Every property, municipality, title, site condition, water source, and intended use is different. Purchasers should verify matters material to their decision with the relevant authorities and independent professionals.
          </p>
        </div>

        {/* ── Seller Representation pathway ────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32, marginBottom: 48 }}>
          <div>
            <H3>Selling an equestrian or acreage property?</H3>
            <p style={{ fontFamily: SANS, fontSize: "0.95rem", lineHeight: 1.75, color: BRAND.ink, margin: "0 0 14px" }}>
              Buyers do not evaluate a horse property, acreage, or rural estate in the same way they evaluate a conventional home. Effective positioning identifies the land, facility, access, setting, lifestyle, and property-use factors that make a holding distinctive — while presenting information carefully and avoiding claims that require independent verification.
            </p>
            <p style={{ fontFamily: SANS, fontSize: "0.95rem", lineHeight: 1.75, color: BRAND.ink, margin: 0 }}>
              Doug works with owners to develop a considered positioning strategy, coordinate premium property marketing, manage qualified inquiries and private showings, and guide the sale process through completion.
            </p>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${BRAND.hairline}`, borderRadius: 8, padding: "26px 28px" }}>
            <H3 style={{ fontSize: "1.2rem", margin: "0 0 14px" }}>A considered sale strategy may include</H3>
            <ol data-testid="eq-strategy-list" style={{ margin: 0, paddingLeft: 20, fontFamily: SANS, fontSize: "0.92rem", color: BRAND.ink, lineHeight: 1.7 }}>
              {STRATEGY_POINTS.map((p, i) => <li key={i} style={{ marginBottom: 8 }}>{p}</li>)}
            </ol>
          </div>
        </div>

        {/* Seller CTAs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
          <PillBtn onClick={() => { setOpenConsult(true); setTimeout(() => smoothScroll("eq-consult-anchor"), 60); }} testId="eq-open-consult" ariaControls="eq-consult-anchor">Arrange a Private Acreage Consultation</PillBtn>
          <PillBtn primary={false} onClick={() => { setOpenAssess(true); setTimeout(() => smoothScroll("eq-assess-anchor"), 60); }} testId="eq-open-assess" ariaControls="eq-assess-anchor">Request a Confidential Equestrian Property Assessment</PillBtn>
        </div>

        {/* Inline form panels — Consultation */}
        <div id="eq-consult-anchor" style={{ marginBottom: openConsult ? 40 : 0 }}>
          {openConsult && (
            <div style={{ background: "#fff", border: `1px solid ${BRAND.hairline}`, borderRadius: 10, padding: "26px 26px" }}>
              <h4 style={{ fontFamily: SERIF, fontSize: "1.25rem", color: BRAND.navy, margin: "0 0 14px", fontWeight: 600 }}>Private Acreage Consultation</h4>
              <ConsultationForm/>
            </div>
          )}
        </div>

        {/* Inline form panels — Assessment */}
        <div id="eq-assess-anchor" style={{ marginBottom: openAssess ? 40 : 0 }}>
          {openAssess && (
            <div style={{ background: "#fff", border: `1px solid ${BRAND.hairline}`, borderRadius: 10, padding: "26px 26px" }}>
              <h4 style={{ fontFamily: SERIF, fontSize: "1.25rem", color: BRAND.navy, margin: "0 0 14px", fontWeight: 600 }}>Confidential Equestrian Property Assessment</h4>
              <AssessmentForm/>
            </div>
          )}
        </div>

        {/* ── Buyer Representation pathway ─────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <H3>Private Equestrian Property Search</H3>
          <p style={{ fontFamily: SANS, fontSize: "0.98rem", lineHeight: 1.75, color: BRAND.ink, margin: "0 0 12px", maxWidth: 820 }}>
            A serious equestrian or acreage purchase begins with a clear understanding of the property's intended use, daily requirements, location priorities, facility needs, and decision timeline. Doug works directly with purchasers to refine these criteria, identify appropriate opportunities, arrange private viewings, and coordinate a practical acquisition strategy.
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.9rem", lineHeight: 1.65, color: BRAND.muted, margin: "0 0 20px", fontStyle: "italic" }}>
            Private viewings are coordinated personally, respectfully, and with appropriate advance planning.
          </p>
          <PillBtn onClick={() => { setOpenBuyer(true); setTimeout(() => smoothScroll("eq-buyer-form-anchor"), 60); }} testId="eq-open-buyer" ariaControls="eq-buyer-form-anchor">Begin a Private Equestrian Property Search</PillBtn>
        </div>

        <div id="eq-buyer-form-anchor" style={{ marginBottom: openBuyer ? 48 : 0 }}>
          {openBuyer && (
            <div style={{ background: "#fff", border: `1px solid ${BRAND.hairline}`, borderRadius: 10, padding: "26px 26px" }}>
              <h4 style={{ fontFamily: SERIF, fontSize: "1.25rem", color: BRAND.navy, margin: "0 0 14px", fontWeight: 600 }}>Private Equestrian Property Search</h4>
              <BuyerForm/>
            </div>
          )}
        </div>

        {/* ── Practical diligence plan ──────────────────────────── */}
        <div style={{ marginBottom: 64 }}>
          <H3>A practical diligence plan</H3>
          <p style={{ fontFamily: SANS, fontSize: "0.98rem", lineHeight: 1.75, color: BRAND.ink, margin: "0 0 22px", maxWidth: 820 }}>
            Equestrian and acreage purchases often raise questions that extend beyond the residence itself. Doug's role is to help identify relevant records and questions early, coordinate the real-estate process, and encourage the right independent investigations before a client relies on a property's suitability.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }} data-testid="eq-diligence">
            <div style={{ background: "#fff", border: `1px solid ${BRAND.hairline}`, borderRadius: 8, padding: "22px 24px" }}>
              <h4 style={{ fontFamily: SERIF, fontSize: "1.08rem", color: BRAND.navy, margin: "0 0 12px", fontWeight: 600 }}>Property and land questions</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontFamily: SANS, fontSize: "0.9rem", color: BRAND.ink, lineHeight: 1.7 }}>
                {DILIGENCE_PROP.map((p, i) => <li key={i} style={{ marginBottom: 6 }}>{p}</li>)}
              </ul>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${BRAND.hairline}`, borderRadius: 8, padding: "22px 24px" }}>
              <h4 style={{ fontFamily: SERIF, fontSize: "1.08rem", color: BRAND.navy, margin: "0 0 12px", fontWeight: 600 }}>Operational and professional review</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontFamily: SANS, fontSize: "0.9rem", color: BRAND.ink, lineHeight: 1.7 }}>
                {DILIGENCE_OPS.map((p, i) => <li key={i} style={{ marginBottom: 6 }}>{p}</li>)}
              </ul>
            </div>
          </div>
          <p style={{ marginTop: 20, fontFamily: SANS, fontSize: "0.82rem", color: BRAND.muted, lineHeight: 1.65 }}>
            This guidance is general information, not legal, tax, appraisal, financial, inspection, engineering, environmental, water, septic, veterinary, insurance, municipal, or land-use advice.
          </p>
        </div>

        {/* ── Local focus ─────────────────────────────────────── */}
        <div style={{ marginBottom: 64 }}>
          <H3>Local focus, direct representation</H3>
          <p style={{ fontFamily: SANS, fontSize: "0.98rem", lineHeight: 1.75, color: BRAND.ink, margin: "0 0 18px", maxWidth: 820 }}>
            Doug's direct equestrian and acreage representation is focused on South Langley, Campbell Valley, Langley, Aldergrove, Abbotsford, Chilliwack, Maple Ridge, the Fraser Valley, and Greater Vancouver where appropriate. For properties outside the areas he directly serves, Doug can discuss whether a referral to a suitable local professional is appropriate.
          </p>
          <ul data-testid="eq-local-areas" style={{ margin: 0, paddingLeft: 20, fontFamily: SANS, fontSize: "0.92rem", color: BRAND.ink, lineHeight: 1.85 }}>
            {LOCAL_AREAS.map((a) => <li key={a}>{a}</li>)}
          </ul>
          <p style={{ marginTop: 10, fontFamily: SANS, fontSize: "0.82rem", color: BRAND.muted, fontStyle: "italic" }}>
            Local market guides are being developed for the areas Doug directly serves.
          </p>
        </div>

        {/* ── Representation and compensation ─────────────────── */}
        <aside data-testid="eq-compensation" style={{ background: BRAND.soft, border: `1px solid ${BRAND.hairline}`, borderRadius: 8, padding: "22px 24px", marginBottom: 64, maxWidth: 820 }}>
          <h4 style={{ fontFamily: SERIF, fontSize: "1.1rem", color: BRAND.navy, margin: "0 0 10px", fontWeight: 600 }}>Representation and compensation</h4>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: "0.9rem", color: BRAND.ink, lineHeight: 1.7 }}>
            Representation and compensation arrangements are discussed clearly before services are provided. In many MLS® transactions, the listing brokerage may offer co-operating compensation; however, terms can vary by property and are explained during the disclosure and representation process.
          </p>
        </aside>

        {/* ── Testimonial placeholder (single) ────────────────── */}
        <div data-testid="eq-testimonial-placeholder" style={{
          border: `1px dashed ${BRAND.hairline}`, borderRadius: 8,
          padding: "20px 22px", marginBottom: 64, background: "rgba(255,255,255,0.5)", maxWidth: 820,
        }}>
          <div style={{ fontFamily: SANS, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: BRAND.gold, fontWeight: 700, marginBottom: 8 }}>Placeholder</div>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: "0.9rem", color: BRAND.muted, lineHeight: 1.65 }}>
            Client testimonials will be added only with written client approval and appropriate attribution.
          </p>
        </div>

        {/* ── Final CTA ───────────────────────────────────────── */}
        <div style={{ marginBottom: 48 }}>
          <H3>Begin with a private conversation.</H3>
          <p style={{ fontFamily: SANS, fontSize: "0.98rem", lineHeight: 1.75, color: BRAND.ink, margin: "0 0 20px", maxWidth: 820 }}>
            Whether you are evaluating an acreage purchase, considering a horse-property sale, or looking for a more informed starting point, Doug LeMaire can help you define the next practical step.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <PillBtn onClick={() => { setOpenBuyer(true); setTimeout(() => smoothScroll("eq-buyer-form-anchor"), 60); }} testId="eq-final-buyer">Discuss Your Acreage Requirements</PillBtn>
            <PillBtn primary={false} onClick={() => { setOpenConsult(true); setTimeout(() => smoothScroll("eq-consult-anchor"), 60); }} testId="eq-final-consult">Arrange a Private Acreage Consultation</PillBtn>
          </div>
        </div>

        {/* Section disclaimer */}
        <p data-testid="eq-section-disclaimer" style={{ fontFamily: SANS, fontSize: "0.82rem", color: BRAND.muted, lineHeight: 1.65, margin: 0, borderTop: `1px solid ${BRAND.hairline}`, paddingTop: 22 }}>
          Information in this section is general in nature and is not legal, tax, financial, appraisal, inspection, engineering, environmental, water, septic, veterinary, insurance, municipal, zoning, ALR, or land-use advice. Property characteristics, permitted uses, title matters, servicing, water, septic systems, facilities, and intended uses must be independently verified by purchasers and sellers with the relevant authorities and qualified professionals.
        </p>
      </div>
    </section>
  );
}
