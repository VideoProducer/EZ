// LuxuryPrivateAdvisory — self-contained "Private Estate Advisory" section
// injected into /specialties/luxury below the existing PIPA banner and
// above the site footer. Adds NO changes to any existing component; every
// element rendered here lives inside this file only.
//
// Design intent: quiet, editorial, credible. Reuses the BRAND palette
// from the parent LuxuryLandingMockup so the visual system is cohesive.
//
// Compliance guardrails baked in (auditable — see the Sep 2026 spec):
//   • BCFSA: brokerage identity is already visible at the top of the
//     page. This section repeats no professional identity claims and
//     makes no unsubstantiated performance/ranking statements.
//   • CREA Article 16: solicitation disclaimer is inherited from the
//     parent page's compliance chain — no separate claim made here.
//   • Sold-price rule: the Elgin Chantrell seller-representation card
//     intentionally OMITS the sale price. Only list-price and property
//     attributes appear until a verified/consented sale price is added.
//   • Testimonials: rendered as visibly labelled placeholders. No
//     fabricated endorsements.
//   • JSON-LD: intentionally NOT emitted here — see developer note
//     below. Structured data must be added only after content and
//     licence permissions are verified.
//   • Forms: POSTed to the existing /api/leads/buyer and /api/leads/seller
//     endpoints, inheriting the existing Turnstile, Resend, DoRTS, PIPA,
//     and CASL pipelines. No new third-party CRM / tracker / mailer.
//
// IMPLEMENTATION NOTE — do not add FAQPage / Review / Person /
// RealEstateAgent / LocalBusiness / Offer / Service / VideoObject schema
// here. Structured data must be added only after the visible content,
// business details, review eligibility, and applicable licensing / data
// permissions have been verified by the site administrator.
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { TurnstileWidget, getTurnstileToken } from "../App";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Local palette — mirrors the parent LuxuryLandingMockup constants.
const BRAND = {
  ink:      "#0B0F1A",
  paper:    "#F8F5EE",
  gold:     "#B08D57",
  goldSoft: "#DABF7A",
  navy:     "#0F2A5B",
  muted:    "#6B6459",
  hairline: "#D9D2C0",
};
const SERIF = "'Playfair Display', 'Cormorant Garamond', Georgia, serif";
const SANS  = "'Inter', -apple-system, sans-serif";

// ── Advisory pillars ────────────────────────────────────────────────
const PILLARS = [
  { n: "01", h: "Positioning Assessment",     b: "Identify the qualities that make a home, estate, acreage, or distinctive property compelling beyond square footage, bedroom count, and price." },
  { n: "02", h: "Competitive Market Review",  b: "Review relevant active and completed properties to establish a practical, evidence-led view of positioning, buyer expectations, and market context." },
  { n: "03", h: "Buyer and Demand Assessment",b: "Consider the likely purchaser profile, relevant demand sources, and the most appropriate path to qualified exposure." },
  { n: "04", h: "Preparation and Launch Planning", b: "Create a clear pre-market sequence covering presentation, photography, video, floorplans, digital assets, timing, and launch readiness." },
  { n: "05", h: "Marketing Investment Strategy",   b: "Recommend a proportionate campaign based on the property, intended audience, timing, privacy considerations, and market conditions." },
  { n: "06", h: "Privacy and Showing Protocol",    b: "Establish an appropriate process for qualified inquiries, private appointments, advance notice, communication, and discretion." },
  { n: "07", h: "Pricing and Decision Framework", b: "Provide a reasoned range and explain the decision factors that inform pricing, timing, and adjustment strategy." },
];

// ── FAQ items — fully visible in the rendered HTML (accessible to
// screen readers + search crawlers). We use <details> for progressive
// disclosure but the answers remain in the DOM at all times.
const FAQ = [
  { q: "How is a luxury home priced in British Columbia?",
    a: "Luxury pricing begins with more than a general average or automated estimate. The relevant analysis considers comparable active and completed properties, location, land, architecture, condition, privacy, lifestyle features, buyer demand, and the property's distinct attributes. A considered strategy also accounts for current competition and the likely response of qualified purchasers." },
  { q: "What should an owner prepare before listing an estate property?",
    a: "Preparation usually begins with a review of the property's condition, documentation, recent improvements, service records, survey or title information where relevant, and the elements that make the home distinctive. The right launch plan may also include staging guidance, landscaping, photography, video, floorplans, and a privacy-aware showing process." },
  { q: "How are private luxury-home showings managed?",
    a: "Private showings should be coordinated with advance planning, clear communication, and respect for the owner's privacy. Depending on the property and seller's preferences, inquiries may be qualified before appointments are confirmed, and showing instructions may address notice periods, access, photography, and visitor conduct." },
  { q: "When is MLS® exposure appropriate versus a more discreet launch?",
    a: "The right approach depends on the property, seller's goals, privacy needs, timing, and likely buyer audience. Broad MLS® exposure can provide wide visibility, while a more selective strategy may be appropriate in certain circumstances. Doug can explain the trade-offs and recommend a compliant approach suited to the property and seller's priorities." },
  { q: "What should be reviewed before buying acreage, waterfront, or equestrian property?",
    a: "These properties can involve considerations beyond the residence itself, including zoning, permitted uses, access, servicing, water supply, septic systems, environmental factors, agricultural or land-use regulations, outbuildings, and future plans. Purchasers should obtain appropriate professional advice and complete due diligence suited to the property." },
  { q: "What are the risks of overpricing a luxury property?",
    a: "An ambitious price can limit early interest from qualified purchasers, make the property less competitive against alternatives, and reduce the impact of its initial market launch. A clear pricing rationale, regular feedback review, and a disciplined response to market evidence help support better decision-making." },
];

const smoothScrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

// ── Shared visual atoms (local to this section) ─────────────────────
const H3 = ({ children, style = {}, ...rest }) => (
  <h3 {...rest} style={{
    fontFamily: SERIF, color: BRAND.ink, fontWeight: 600,
    fontSize: "clamp(1.35rem, 2vw, 1.75rem)", lineHeight: 1.25,
    letterSpacing: "-0.01em", margin: "0 0 12px", ...style,
  }}>{children}</h3>
);
const Kicker = ({ children }) => (
  <div style={{
    fontFamily: SANS, fontSize: "0.72rem", fontWeight: 600,
    letterSpacing: "0.22em", textTransform: "uppercase",
    color: BRAND.gold, marginBottom: 14,
  }}>{children}</div>
);
const CardShell = ({ children, style = {}, ...rest }) => (
  <article {...rest} style={{
    background: "#fff", border: `1px solid ${BRAND.hairline}`,
    borderRadius: 4, padding: "28px 32px", ...style,
  }}>{children}</article>
);
const PillButton = ({ children, onClick, href, primary = true, testId }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontFamily: SANS, fontSize: "0.85rem", fontWeight: 600,
    letterSpacing: "0.06em", padding: "13px 22px",
    borderRadius: 3, cursor: "pointer",
    textDecoration: "none", border: "1px solid",
    transition: "background 0.16s ease, color 0.16s ease",
  };
  const primaryStyle = { ...base, background: BRAND.ink, color: "#fff", borderColor: BRAND.ink };
  const secondaryStyle = { ...base, background: "transparent", color: BRAND.ink, borderColor: BRAND.ink };
  const props = { style: primary ? primaryStyle : secondaryStyle, "data-testid": testId };
  return href
    ? <a href={href} {...props}>{children}</a>
    : <button type="button" onClick={onClick} {...props}>{children}</button>;
};

// ── Consultation form (15-minute private call) ──────────────────────
function ConsultationForm() {
  const [f, setF] = useState({
    full_name: "", email: "", phone: "",
    city: "", timeline: "Exploring",
    preferred_contact: "email", notes: "",
    pipa_ack: false, casl_consent: false, dorts_ack: false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState("");
  const [done, setDone] = useState(false);

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.pipa_ack || !f.dorts_ack) {
      setMsg("Please confirm the privacy and representation acknowledgements.");
      return;
    }
    setBusy(true); setMsg("");
    try {
      const payload = {
        full_name: f.full_name,
        email: f.email,
        phone: f.phone,
        property_address: "Not disclosed at consultation stage",
        city: f.city || "British Columbia",
        property_type: "Estate / distinctive property",
        timeline: f.timeline,
        estimated_value: "To be discussed privately",
        reason: `PRIVATE ESTATE ADVISORY — 15-MIN CONSULTATION · preferred: ${f.preferred_contact}. ${f.notes || ""}`.trim(),
        casl_consent: !!f.casl_consent,
        pipa_ack: true,
        dorts_ack: true,
        source: "private_estate_advisory_consultation",
        turnstile_token: getTurnstileToken(),
      };
      await axios.post(`${API}/leads/seller`, payload);
      setDone(true);
    } catch (err) {
      setMsg(err.response?.data?.detail || err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div data-testid="advisory-consultation-thanks" style={{ padding: "24px 26px", background: BRAND.paper, border: `1px solid ${BRAND.hairline}`, borderRadius: 4 }}>
        <h4 style={{ margin: 0, fontFamily: SERIF, color: BRAND.ink, fontSize: "1.2rem" }}>Thank you.</h4>
        <p style={{ margin: "10px 0 0", fontFamily: SANS, color: BRAND.muted, fontSize: "0.9rem", lineHeight: 1.65 }}>
          Your private inquiry has been received. Doug LeMaire will respond personally within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} data-testid="advisory-consultation-form" style={{ display: "grid", gap: 12 }}>
      <fieldset style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        <legend style={{ padding: 0, fontFamily: SANS, fontSize: "0.85rem", color: BRAND.muted, marginBottom: 6 }}>Private inquiry. Doug LeMaire will respond personally.</legend>

        <label style={{ display: "block" }}>
          <span style={fieldLabel}>Full name</span>
          <input required value={f.full_name} onChange={(e) => set("full_name", e.target.value)} data-testid="advisory-consult-name" style={fieldInput} autoComplete="name"/>
        </label>
        <div style={twoCol}>
          <label>
            <span style={fieldLabel}>Email address</span>
            <input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} data-testid="advisory-consult-email" style={fieldInput} autoComplete="email"/>
          </label>
          <label>
            <span style={fieldLabel}>Phone number</span>
            <input required type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} data-testid="advisory-consult-phone" style={fieldInput} autoComplete="tel"/>
          </label>
        </div>
        <label>
          <span style={fieldLabel}>Property city or community</span>
          <input value={f.city} onChange={(e) => set("city", e.target.value)} data-testid="advisory-consult-city" style={fieldInput} placeholder="e.g. Elgin Chantrell, South Surrey"/>
        </label>
        <div style={twoCol}>
          <label>
            <span style={fieldLabel}>Approximate timing</span>
            <select value={f.timeline} onChange={(e) => set("timeline", e.target.value)} data-testid="advisory-consult-timing" style={fieldInput}>
              <option>Exploring</option><option>3–6 months</option><option>6–12 months</option><option>More than 12 months</option>
            </select>
          </label>
          <label>
            <span style={fieldLabel}>Preferred contact method</span>
            <select value={f.preferred_contact} onChange={(e) => set("preferred_contact", e.target.value)} data-testid="advisory-consult-contact" style={fieldInput}>
              <option value="phone">Phone</option><option value="email">Email</option><option value="text">Text</option>
            </select>
          </label>
        </div>
        <label>
          <span style={fieldLabel}>Optional message</span>
          <textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} data-testid="advisory-consult-notes" style={{ ...fieldInput, resize: "vertical" }}/>
        </label>

        <div style={ackBox}>
          <label style={ackRow}><input type="checkbox" required checked={f.pipa_ack} onChange={(e) => set("pipa_ack", e.target.checked)} data-testid="advisory-consult-pipa"/> <span>I acknowledge the <a href="/privacy" style={{ color: BRAND.ink, fontWeight: 600 }}>PIPA privacy notice</a> — information submitted here is handled privately by Doug LeMaire.</span></label>
          <label style={ackRow}><input type="checkbox" required checked={f.dorts_ack} onChange={(e) => set("dorts_ack", e.target.checked)} data-testid="advisory-consult-dorts"/> <span>I understand submitting this inquiry does not create a REALTOR®-client relationship — <a href="/glossary/dorts" style={{ color: BRAND.ink, fontWeight: 600 }}>Disclosure of Representation in Trading Services</a> is provided in writing before formal services begin.</span></label>
          <label style={ackRow}><input type="checkbox" checked={f.casl_consent} onChange={(e) => set("casl_consent", e.target.checked)} data-testid="advisory-consult-casl"/> <span>Optional — you may email me general BC market updates I can unsubscribe from at any time (CASL express consent).</span></label>
        </div>

        <TurnstileWidget/>
        {msg && <div role="alert" style={{ color: "#B7351B", fontFamily: SANS, fontSize: "0.85rem" }}>{msg}</div>}
        <div>
          <button type="submit" disabled={busy} data-testid="advisory-consult-submit" style={{
            fontFamily: SANS, fontSize: "0.88rem", fontWeight: 600, letterSpacing: "0.06em",
            background: BRAND.ink, color: "#fff", border: "1px solid " + BRAND.ink,
            padding: "13px 24px", borderRadius: 3, cursor: busy ? "wait" : "pointer",
          }}>{busy ? "Sending…" : "Arrange a Private Consultation"}</button>
        </div>
      </fieldset>
    </form>
  );
}

// ── Buyer search form ───────────────────────────────────────────────
function BuyerSearchForm() {
  const [f, setF] = useState({
    full_name: "", email: "", phone: "",
    communities: "", property_type: "Estate",
    budget: "", timeline: "1–3 months",
    also_selling: "No", off_market: "Yes",
    preferred_contact: "email", notes: "",
    pipa_ack: false, casl_consent: false, dorts_ack: false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState("");
  const [done, setDone] = useState(false);

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.pipa_ack || !f.dorts_ack) {
      setMsg("Please confirm the privacy and representation acknowledgements.");
      return;
    }
    setBusy(true); setMsg("");
    try {
      const areas = (f.communities || "British Columbia")
        .split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      const notesFull = [
        "PRIVATE ESTATE ADVISORY — BUYER SEARCH REQUEST",
        `Also selling: ${f.also_selling}`,
        `Off-market of interest: ${f.off_market}`,
        `Preferred contact: ${f.preferred_contact}`,
        f.notes || "",
      ].join(" · ");
      const payload = {
        full_name: f.full_name,
        email: f.email,
        phone: f.phone,
        areas,
        property_type: f.property_type,
        budget_range: f.budget || "To be discussed",
        timeline: f.timeline,
        financing_status: "To be discussed privately",
        preferred_contact: f.preferred_contact,
        notes: notesFull,
        casl_consent: !!f.casl_consent,
        pipa_ack: true,
        dorts_ack: true,
        source: "private_estate_advisory_buyer",
        turnstile_token: getTurnstileToken(),
      };
      await axios.post(`${API}/leads/buyer`, payload);
      setDone(true);
    } catch (err) {
      setMsg(err.response?.data?.detail || err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div data-testid="advisory-buyer-thanks" style={{ padding: "24px 26px", background: BRAND.paper, border: `1px solid ${BRAND.hairline}`, borderRadius: 4 }}>
        <h4 style={{ margin: 0, fontFamily: SERIF, color: BRAND.ink, fontSize: "1.2rem" }}>Thank you.</h4>
        <p style={{ margin: "10px 0 0", fontFamily: SANS, color: BRAND.muted, fontSize: "0.9rem", lineHeight: 1.65 }}>
          Your private buyer inquiry has been received. Doug LeMaire will respond personally within one business day to arrange a first conversation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} data-testid="advisory-buyer-form" style={{ display: "grid", gap: 12 }}>
      <fieldset style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        <legend style={{ padding: 0, fontFamily: SANS, fontSize: "0.85rem", color: BRAND.muted, marginBottom: 6 }}>Private inquiry. Doug LeMaire will respond personally.</legend>

        <label><span style={fieldLabel}>Full name</span>
          <input required value={f.full_name} onChange={(e) => set("full_name", e.target.value)} data-testid="advisory-buyer-name" style={fieldInput} autoComplete="name"/>
        </label>
        <div style={twoCol}>
          <label><span style={fieldLabel}>Email address</span>
            <input required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} data-testid="advisory-buyer-email" style={fieldInput} autoComplete="email"/>
          </label>
          <label><span style={fieldLabel}>Phone number</span>
            <input required type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} data-testid="advisory-buyer-phone" style={fieldInput} autoComplete="tel"/>
          </label>
        </div>
        <label><span style={fieldLabel}>Desired communities</span>
          <input value={f.communities} onChange={(e) => set("communities", e.target.value)} data-testid="advisory-buyer-communities" style={fieldInput} placeholder="e.g. South Surrey, White Rock, South Langley"/>
        </label>
        <div style={twoCol}>
          <label><span style={fieldLabel}>Property category</span>
            <select value={f.property_type} onChange={(e) => set("property_type", e.target.value)} data-testid="advisory-buyer-category" style={fieldInput}>
              <option>Estate</option>
              <option>Luxury detached home</option>
              <option>Acreage</option>
              <option>Equestrian property</option>
              <option>Waterfront</option>
              <option>Architectural home</option>
              <option>Townhome</option>
              <option>Condominium</option>
              <option>Other</option>
            </select>
          </label>
          <label><span style={fieldLabel}>Intended budget range</span>
            <input value={f.budget} onChange={(e) => set("budget", e.target.value)} data-testid="advisory-buyer-budget" style={fieldInput} placeholder="e.g. $3M – $5M"/>
          </label>
        </div>
        <div style={twoCol}>
          <label><span style={fieldLabel}>Purchase timing</span>
            <select value={f.timeline} onChange={(e) => set("timeline", e.target.value)} data-testid="advisory-buyer-timing" style={fieldInput}>
              <option>Immediately</option><option>1–3 months</option><option>3–6 months</option><option>6–12 months</option><option>More than 12 months</option>
            </select>
          </label>
          <label><span style={fieldLabel}>Also selling a property?</span>
            <select value={f.also_selling} onChange={(e) => set("also_selling", e.target.value)} data-testid="advisory-buyer-selling" style={fieldInput}>
              <option>Yes</option><option>No</option><option>Possibly</option>
            </select>
          </label>
        </div>
        <div style={twoCol}>
          <label><span style={fieldLabel}>Interested in off-market opportunities?</span>
            <select value={f.off_market} onChange={(e) => set("off_market", e.target.value)} data-testid="advisory-buyer-offmarket" style={fieldInput}>
              <option>Yes</option><option>No</option><option>Possibly</option>
            </select>
          </label>
          <label><span style={fieldLabel}>Preferred contact method</span>
            <select value={f.preferred_contact} onChange={(e) => set("preferred_contact", e.target.value)} data-testid="advisory-buyer-contact" style={fieldInput}>
              <option value="phone">Phone</option><option value="email">Email</option><option value="text">Text</option>
            </select>
          </label>
        </div>
        <label><span style={fieldLabel}>Optional notes</span>
          <textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} data-testid="advisory-buyer-notes" style={{ ...fieldInput, resize: "vertical" }}/>
        </label>

        <p style={{ margin: 0, fontFamily: SANS, fontSize: "0.78rem", color: BRAND.muted, lineHeight: 1.55 }}>
          Where appropriate, proof of funds or financing readiness may help facilitate private-viewing and offer discussions.
        </p>

        <div style={ackBox}>
          <label style={ackRow}><input type="checkbox" required checked={f.pipa_ack} onChange={(e) => set("pipa_ack", e.target.checked)} data-testid="advisory-buyer-pipa"/> <span>I acknowledge the <a href="/privacy" style={{ color: BRAND.ink, fontWeight: 600 }}>PIPA privacy notice</a> — information submitted here is handled privately by Doug LeMaire.</span></label>
          <label style={ackRow}><input type="checkbox" required checked={f.dorts_ack} onChange={(e) => set("dorts_ack", e.target.checked)} data-testid="advisory-buyer-dorts"/> <span>I understand submitting this inquiry does not create a REALTOR®-client relationship — <a href="/glossary/dorts" style={{ color: BRAND.ink, fontWeight: 600 }}>Disclosure of Representation in Trading Services</a> is provided in writing before formal services begin.</span></label>
          <label style={ackRow}><input type="checkbox" checked={f.casl_consent} onChange={(e) => set("casl_consent", e.target.checked)} data-testid="advisory-buyer-casl"/> <span>Optional — you may email me general BC market updates I can unsubscribe from at any time (CASL express consent).</span></label>
        </div>

        <TurnstileWidget/>
        {msg && <div role="alert" style={{ color: "#B7351B", fontFamily: SANS, fontSize: "0.85rem" }}>{msg}</div>}
        <div>
          <button type="submit" disabled={busy} data-testid="advisory-buyer-submit" style={{
            fontFamily: SANS, fontSize: "0.88rem", fontWeight: 600, letterSpacing: "0.06em",
            background: BRAND.ink, color: "#fff", border: "1px solid " + BRAND.ink,
            padding: "13px 24px", borderRadius: 3, cursor: busy ? "wait" : "pointer",
          }}>{busy ? "Sending…" : "Request Private Buyer Representation"}</button>
        </div>
      </fieldset>
    </form>
  );
}

// ── Shared inline styles ────────────────────────────────────────────
const fieldLabel = { fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: BRAND.muted, fontWeight: 600, marginBottom: 6, display: "block" };
const fieldInput = { width: "100%", boxSizing: "border-box", fontFamily: SANS, fontSize: "0.92rem", background: "#fff", color: BRAND.ink, padding: "10px 12px", border: `1px solid ${BRAND.hairline}`, borderRadius: 3, outline: "none" };
const twoCol     = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const ackBox     = { display: "grid", gap: 8, padding: "14px 16px", background: BRAND.paper, border: `1px solid ${BRAND.hairline}`, borderRadius: 3 };
const ackRow     = { display: "grid", gridTemplateColumns: "18px 1fr", gap: 10, alignItems: "start", fontFamily: SANS, fontSize: "0.82rem", color: BRAND.muted, lineHeight: 1.55, cursor: "pointer" };

// ── Main component ─────────────────────────────────────────────────
export default function LuxuryPrivateAdvisory() {
  const [openSellerForm, setOpenSellerForm] = useState(false);
  const [openBuyerForm, setOpenBuyerForm]   = useState(false);
  // Approved-testimonial auto-hydrate — placeholders here are replaced
  // one-by-one as Doug adds approved reviews via /admin/testimonials.
  // If fewer than 3 approved reviews exist, remaining slots stay as the
  // clearly-labelled compliance placeholders. Featured reviews come
  // first (via /api/testimonials sort). Fails silently on network error.
  const [approvedReviews, setApprovedReviews] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await axios.get(`${API}/testimonials`);
        if (alive && Array.isArray(r.data?.testimonials)) {
          setApprovedReviews(r.data.testimonials.slice(0, 3));
        }
      } catch { /* stay with placeholders */ }
    })();
    return () => { alive = false; };
  }, []);

  const placeholderSlots = [
    { tag: "Seller testimonial placeholder",       note: "Use after obtaining written client approval. A strong seller testimonial should speak specifically to preparation, communication, campaign execution, negotiation, discretion, or the sale process." },
    { tag: "Luxury buyer testimonial placeholder", note: "Use after obtaining written client approval. A strong buyer testimonial should speak specifically to search strategy, property evaluation, offer guidance, due diligence, responsiveness, or a complex acquisition." },
    { tag: "Verified review placeholder",           note: "Use only where a genuine, publicly verifiable review may be reproduced in compliance with the relevant platform's policies and with proper attribution." },
  ];
  // Merge: real reviews first, then fill remaining slots with placeholders.
  const socialProofSlots = [
    ...approvedReviews.map((r) => ({ type: "review", data: r })),
    ...placeholderSlots.slice(approvedReviews.length).map((p) => ({ type: "placeholder", data: p })),
  ];

  return (
    <section
      id="private-estate-advisory"
      data-testid="private-estate-advisory"
      style={{
        background: BRAND.paper,
        padding: "120px 24px 100px",
        borderTop: `1px solid ${BRAND.hairline}`,
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>

        {/* Section intro */}
        <div style={{ maxWidth: 720, marginBottom: 56 }}>
          <Kicker>Private Estate Advisory</Kicker>
          <h2 style={{
            fontFamily: SERIF, fontSize: "clamp(1.9rem, 3.4vw, 2.85rem)",
            lineHeight: 1.15, letterSpacing: "-0.015em", color: BRAND.ink,
            margin: "0 0 22px", fontWeight: 500,
          }} data-testid="advisory-h2">
            Luxury representation for consequential property decisions.
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "1.02rem", lineHeight: 1.75, color: BRAND.muted, margin: "0 0 18px" }}>
            Exceptional properties demand more than broad exposure or a standard search experience. Doug LeMaire provides direct, considered guidance for owners preparing to sell and purchasers seeking distinctive homes, estates, acreage, and private opportunities across South Surrey, White Rock, Langley, Surrey, the Fraser Valley, and British Columbia.
          </p>
          <p style={{ fontFamily: SANS, fontSize: "1.02rem", lineHeight: 1.75, color: BRAND.muted, margin: "0 0 22px" }}>
            The approach combines strategic positioning, careful market analysis, qualified buyer or property access, privacy-aware communication, and hands-on representation from the first conversation through completion.
          </p>
          <div style={{ borderLeft: `2px solid ${BRAND.gold}`, paddingLeft: 18, fontFamily: SERIF, fontSize: "1.05rem", fontStyle: "italic", color: BRAND.ink, lineHeight: 1.55 }}>
            Direct representation for luxury sellers and purchasers. Property decisions are approached with discretion, preparation, and clear advice.
          </div>
        </div>

        {/* ── Selected Representation ─────────────────────────────── */}
        <div style={{ marginBottom: 72 }}>
          <H3 style={{ marginBottom: 22 }}>Selected Representation</H3>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
          }}>
            {/* SELLER — Elgin Chantrell */}
            <CardShell data-testid="advisory-selected-seller">
              <div style={{ fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.16em", textTransform: "uppercase", color: BRAND.gold, marginBottom: 12, fontWeight: 700 }}>
                Recently Sold · Seller Representation · Elgin Chantrell, South Surrey
              </div>
              <p style={{ fontFamily: SANS, fontSize: "0.94rem", lineHeight: 1.75, color: BRAND.ink, margin: "0 0 12px" }}>
                Doug LeMaire represented the seller in the sale of this exceptional 6,129-square-foot residence in Elgin Chantrell. Set on a private 0.34-acre corner lot with green-space frontage, mature gardens, solar panels, a swimming pool, triple garage, and thoughtfully designed spaces for both family living and entertaining, the home offered the quality, privacy, and enduring appeal sought by discerning purchasers. Through strategic positioning, tailored marketing, qualified showing coordination, and attentive transaction management, Doug guided the seller through the successful sale of this distinctive South Surrey property.
              </p>
              <p style={{ fontFamily: SANS, fontSize: "0.75rem", lineHeight: 1.6, color: BRAND.muted, margin: "0 0 18px", fontStyle: "italic" }}>
                Property details are presented as a completed seller-representation result. Final transaction details and marketing permissions are subject to applicable brokerage, client-consent, and advertising requirements.
              </p>
              <PillButton
                onClick={() => { setOpenSellerForm(true); setTimeout(() => smoothScrollTo("advisory-consultation"), 60); }}
                testId="advisory-seller-card-cta"
              >Discuss Your Property's Positioning</PillButton>
            </CardShell>

            {/* BUYER — Campbell Valley */}
            <CardShell data-testid="advisory-selected-buyer">
              <div style={{ fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.16em", textTransform: "uppercase", color: BRAND.gold, marginBottom: 12, fontWeight: 700 }}>
                Recently Acquired · Buyer Representation · Campbell Valley, South Langley
              </div>
              <p style={{ fontFamily: SANS, fontSize: "0.94rem", lineHeight: 1.75, color: BRAND.ink, margin: "0 0 12px" }}>
                Doug LeMaire represented the purchaser in the acquisition of 17.9 private acres backing onto the Irene Pearce Trail and connecting to Campbell Valley Park. This rare South Langley property offered the privacy, land, and legacy potential sought by discerning purchasers envisioning a private estate or equestrian lifestyle. Doug provided strategic guidance and discreet representation throughout the acquisition.
              </p>
              <p style={{ fontFamily: SANS, fontSize: "0.75rem", lineHeight: 1.6, color: BRAND.muted, margin: "0 0 18px", fontStyle: "italic" }}>
                Property details are presented as a completed buyer-representation result. Transaction details and marketing permissions are subject to applicable brokerage, client-consent, and advertising requirements.
              </p>
              <PillButton
                primary={false}
                onClick={() => { setOpenBuyerForm(true); setTimeout(() => smoothScrollTo("advisory-buyer-search"), 60); }}
                testId="advisory-buyer-card-cta"
              >Begin a Private Property Search</PillButton>
            </CardShell>
          </div>
        </div>

        {/* ── What considered representation includes ───────────── */}
        <div style={{ marginBottom: 72 }}>
          <H3 style={{ marginBottom: 22 }}>What considered representation includes</H3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }} data-testid="advisory-pillars">
            {PILLARS.map((p) => (
              <article key={p.n} style={{
                background: "#fff", border: `1px solid ${BRAND.hairline}`,
                padding: "24px 22px", borderRadius: 4,
              }}>
                <div style={{
                  fontFamily: SERIF, fontSize: "1.15rem", color: BRAND.gold,
                  fontWeight: 500, marginBottom: 10, letterSpacing: "0.04em",
                }}>{p.n}</div>
                <h4 style={{
                  fontFamily: SERIF, fontSize: "1.08rem", color: BRAND.ink,
                  fontWeight: 600, margin: "0 0 10px", lineHeight: 1.3,
                }}>{p.h}</h4>
                <p style={{ fontFamily: SANS, fontSize: "0.88rem", lineHeight: 1.65, color: BRAND.muted, margin: 0 }}>{p.b}</p>
              </article>
            ))}
          </div>
        </div>

        {/* ── Seller path + Buyer path ──────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 24, marginBottom: 72,
        }}>
          {/* SELLER PATH */}
          <CardShell data-testid="advisory-seller-path" style={{ padding: "36px 36px" }}>
            <H3>For owners considering a sale</H3>
            <p style={{ fontFamily: SANS, fontSize: "0.95rem", lineHeight: 1.75, color: BRAND.muted, margin: "0 0 22px" }}>
              Whether a sale is imminent or still being considered, the first step is a private conversation about the property, timing, priorities, and the level of discretion required. From there, Doug can recommend an appropriate next step—from an initial strategy discussion to a more detailed confidential estate assessment.
            </p>
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ padding: "20px 22px", background: BRAND.paper, border: `1px solid ${BRAND.hairline}`, borderRadius: 4 }} id="advisory-consultation">
                <div style={{ fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.16em", textTransform: "uppercase", color: BRAND.gold, fontWeight: 700, marginBottom: 8 }}>Option 1</div>
                <h4 style={{ fontFamily: SERIF, fontSize: "1.15rem", margin: "0 0 8px", color: BRAND.ink, fontWeight: 600 }}>Private 15-Minute Consultation</h4>
                <p style={{ fontFamily: SANS, fontSize: "0.88rem", lineHeight: 1.7, color: BRAND.muted, margin: "0 0 14px" }}>A discreet first conversation for owners considering a future sale, testing timing, or seeking an informed perspective before committing to a formal process.</p>
                {!openSellerForm ? (
                  <PillButton onClick={() => setOpenSellerForm(true)} testId="advisory-open-consult">Arrange a Private Consultation</PillButton>
                ) : (
                  <ConsultationForm/>
                )}
              </div>
              <div style={{ padding: "20px 22px", background: BRAND.paper, border: `1px solid ${BRAND.hairline}`, borderRadius: 4 }}>
                <div style={{ fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.16em", textTransform: "uppercase", color: BRAND.gold, fontWeight: 700, marginBottom: 8 }}>Option 2</div>
                <h4 style={{ fontFamily: SERIF, fontSize: "1.15rem", margin: "0 0 8px", color: BRAND.ink, fontWeight: 600 }}>Confidential Estate Assessment</h4>
                <p style={{ fontFamily: SANS, fontSize: "0.88rem", lineHeight: 1.7, color: BRAND.muted, margin: "0 0 14px" }}>For owners ready to examine positioning, comparable properties, likely buyer pools, preparation priorities, privacy protocol, and a considered sale strategy.</p>
                <PillButton
                  primary={false}
                  onClick={() => smoothScrollTo("estate-assessment-form")}
                  testId="advisory-cta-estate-assessment"
                >Request a Confidential Assessment</PillButton>
              </div>
            </div>
          </CardShell>

          {/* BUYER PATH */}
          <CardShell data-testid="advisory-buyer-path" style={{ padding: "36px 36px" }} id="advisory-buyer-search">
            <H3>For purchasers seeking more than a listing feed</H3>
            <p style={{ fontFamily: SANS, fontSize: "0.95rem", lineHeight: 1.75, color: BRAND.muted, margin: "0 0 14px" }}>
              Luxury purchases often require more than monitoring public inventory. Doug works directly with qualified purchasers to clarify location, property type, timing, and acquisition priorities—then provides responsive guidance, discreet communication, and coordinated viewing and offer strategy.
            </p>
            <p style={{ fontFamily: SANS, fontSize: "0.9rem", lineHeight: 1.7, color: BRAND.muted, margin: "0 0 22px", fontStyle: "italic" }}>
              Private viewings are arranged personally, respectfully, and with appropriate advance planning.
            </p>
            {!openBuyerForm ? (
              <PillButton onClick={() => setOpenBuyerForm(true)} testId="advisory-open-buyer">Begin a Private Property Search</PillButton>
            ) : (
              <>
                <h4 style={{ fontFamily: SERIF, fontSize: "1.15rem", margin: "0 0 14px", color: BRAND.ink, fontWeight: 600 }}>Private Property Search</h4>
                <BuyerSearchForm/>
              </>
            )}
          </CardShell>
        </div>

        {/* ── Why direct representation ─────────────────────────── */}
        <div style={{ marginBottom: 72 }}>
          <H3 style={{ marginBottom: 12 }}>Why clients value direct representation</H3>
          <p style={{ fontFamily: SANS, fontSize: "0.98rem", lineHeight: 1.75, color: BRAND.muted, maxWidth: 720, margin: "0 0 26px" }}>
            Luxury clients do not need generic promises. They need clear communication, careful preparation, market awareness, privacy, and a representative who remains personally engaged when decisions matter.
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }} data-testid="advisory-testimonial-placeholders">
            {socialProofSlots.map((slot, i) => (
              slot.type === "review" ? (
                <article
                  key={`r-${slot.data.id || i}`}
                  data-testid={`advisory-real-review-${i}`}
                  style={{
                    border: `1px solid ${BRAND.hairline}`, borderRadius: 4,
                    padding: "24px 24px", background: "#fff",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  <div aria-label={`${slot.data.rating || 5} out of 5 stars`} style={{ color: BRAND.gold, fontSize: "0.95rem", letterSpacing: 2, marginBottom: 12 }}>
                    {"★".repeat(slot.data.rating || 5)}{"☆".repeat(5 - (slot.data.rating || 5))}
                  </div>
                  <blockquote style={{
                    fontFamily: SERIF, fontSize: "1rem", lineHeight: 1.65,
                    color: BRAND.ink, margin: "0 0 14px", flex: 1, fontStyle: "italic",
                  }}>
                    "{slot.data.text}"
                  </blockquote>
                  <footer style={{ fontFamily: SANS, fontSize: "0.78rem", color: BRAND.muted, lineHeight: 1.6, background: "transparent" }}>
                    — <strong style={{ color: BRAND.ink, fontStyle: "normal" }}>{slot.data.reviewer_name}</strong>
                    {slot.data.source && <> · Client review from {slot.data.source}</>}
                    {slot.data.date_reviewed && <> · {slot.data.date_reviewed}</>}
                  </footer>
                </article>
              ) : (
                <div key={`p-${i}`} data-testid={`advisory-testimonial-placeholder-${i}`} style={{
                  border: `1px dashed ${BRAND.hairline}`, borderRadius: 4,
                  padding: "22px 22px", background: "rgba(255,255,255,0.55)",
                }}>
                  <div style={{ fontFamily: SANS, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: BRAND.gold, fontWeight: 700, marginBottom: 10 }}>Placeholder</div>
                  <div style={{ fontFamily: SERIF, fontSize: "1.05rem", color: BRAND.ink, marginBottom: 10, fontWeight: 500 }}>{slot.data.tag}</div>
                  <p style={{ fontFamily: SANS, fontSize: "0.82rem", lineHeight: 1.65, color: BRAND.muted, margin: 0 }}>{slot.data.note}</p>
                </div>
              )
            ))}
          </div>
          <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: BRAND.muted, marginTop: 20, lineHeight: 1.6 }}>
            Client comments and reviews are published only with appropriate authorization and attribution.
          </p>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }}>
          <H3 style={{ marginBottom: 22 }}>Luxury property questions</H3>
          <nav aria-label="Luxury property questions" style={{ display: "grid", gap: 12 }}>
            {FAQ.map((item, i) => (
              <details
                key={i}
                data-testid={`advisory-faq-${i}`}
                open={i === 0}
                style={{
                  background: "#fff", border: `1px solid ${BRAND.hairline}`,
                  borderRadius: 4, padding: "18px 22px",
                }}
              >
                <summary style={{
                  cursor: "pointer", listStyle: "none",
                  fontFamily: SERIF, fontSize: "1.05rem", color: BRAND.ink,
                  fontWeight: 600, letterSpacing: "-0.005em",
                  display: "flex", justifyContent: "space-between", gap: 12,
                }}>
                  <span>{item.q}</span>
                  <span aria-hidden="true" style={{ color: BRAND.gold, fontFamily: SANS, fontSize: "0.85rem" }}>+</span>
                </summary>
                <p style={{ fontFamily: SANS, fontSize: "0.92rem", lineHeight: 1.75, color: BRAND.muted, margin: "14px 0 0" }}>{item.a}</p>
              </details>
            ))}
          </nav>
          <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: BRAND.muted, lineHeight: 1.65, marginTop: 20 }}>
            Information on this page is general in nature and is not legal, tax, financial, appraisal, inspection, environmental, or engineering advice. Buyers and sellers should obtain independent professional advice appropriate to their circumstances.
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: BRAND.muted, lineHeight: 1.65, marginTop: 10 }}>
            For preliminary property research, visitors may also use the site's research tools; Doug personally advises on representation, pricing strategy, and transaction decisions.
          </p>
        </div>

        {/* ── Closing pull quote ──────────────────────────────── */}
        <blockquote style={{
          borderLeft: `2px solid ${BRAND.gold}`, paddingLeft: 22,
          margin: 0, maxWidth: 780,
          fontFamily: SERIF, fontStyle: "italic", fontSize: "1.15rem",
          lineHeight: 1.65, color: BRAND.ink,
        }} data-testid="advisory-pull-quote">
          "Exceptional homes require more than broad exposure. They require precise positioning, disciplined preparation, qualified buyer access, and direct senior-level representation from first strategy meeting through completion."
        </blockquote>
      </div>
    </section>
  );
}
