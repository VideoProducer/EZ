// EZtoFind.ca — Visual Agent · Consultation intake (PaneQualify + fields)
// The only Pane that POSTs to the backend. Multi-step BCFSA-compliant
// intake with a real address autocomplete (Nominatim via /api/address/*).
//
// Extracted from VisualAgentDemo.jsx (Feb 2026). All form-field helpers
// live in this file because they are used only by PaneQualify.

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Home as HomeIcon, ShieldCheck, CheckCircle2 } from "lucide-react";
import { TurnstileWidget, getTurnstileToken } from "../../App";
import { C, API, DOOGIE, isOutsideFocusArea } from "./constants";
import { Pill, OutsideFocusBump } from "./atoms";

// ── Reusable form fields (used only by PaneQualify) ─────────────────────────
export const TextField = ({ label, value, onChange, testId, type = "text", placeholder, hint, multiline }) => (
  <label style={{ display: "grid", gap: 4, fontSize: 12, color: C.navy }}>
    <span style={{ fontWeight: 700 }}>{label}</span>
    {multiline ? (
      <textarea
        data-testid={testId}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
      />
    ) : (
      <input
        data-testid={testId} type={type}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, fontFamily: "inherit" }}
      />
    )}
    {hint && <span style={{ fontSize: 10, color: "#6B7280" }}>{hint}</span>}
  </label>
);

// ── AddressAutocompleteField ─────────────────────────────────────────────────
// Real-time address autocomplete backed by OpenStreetMap Nominatim (proxied
// via GET /api/address/suggest + GET /api/address/validate — no API key
// required, keyless fair-use with a UA identifier). Enforces BC-only after
// Retrieve. If the selected address is outside BC we surface a friendly
// referral pointer; if inside BC we auto-fill the linked city field (via
// onValidated) and save the label back into the property_address string so
// the form submission carries the validated text.
export const AddressAutocompleteField = ({
  label = "Property address *",
  value,
  onChange,
  onValidated,
  testId = "q-address",
}) => {
  const [items, setItems] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [validated, setValidated] = React.useState(false);
  const [outOfBC, setOutOfBC] = React.useState(null);
  const abortRef = React.useRef(null);

  React.useEffect(() => {
    if (validated) return;
    const v = (value || "").trim();
    if (v.length < 3) { setItems([]); setOpen(false); return; }
    const t = window.setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        const r = await fetch(`${API}/address/suggest?q=${encodeURIComponent(v)}`, { signal: controller.signal });
        if (!r.ok) throw new Error("suggest failed");
        const data = await r.json();
        setItems(Array.isArray(data.items) ? data.items : []);
        setOpen(true);
      } catch (e) {
        if (e && e.name !== "AbortError") { setItems([]); setOpen(false); }
      } finally { setLoading(false); }
    }, 250);
    return () => window.clearTimeout(t);
  }, [value, validated]);

  const pick = async (item) => {
    setOpen(false);
    // Hierarchical result — drill down instead of retrieving
    if (item.next === "Find") {
      try {
        setLoading(true);
        const r = await fetch(`${API}/address/suggest?q=${encodeURIComponent(value)}&lastId=${encodeURIComponent(item.id)}`);
        if (r.ok) {
          const data = await r.json();
          setItems(Array.isArray(data.items) ? data.items : []);
          setOpen(true);
        }
      } finally { setLoading(false); }
      return;
    }
    // Retrieve — validate + BC-enforce
    try {
      setLoading(true);
      const r = await fetch(`${API}/address/validate?id=${encodeURIComponent(item.id)}`);
      if (r.status === 422) {
        const err = await r.json().catch(() => ({}));
        const detail = err && err.detail;
        if (detail && detail.code === "out_of_focus") {
          setOutOfBC({ province: detail.province, city: detail.city, message: detail.message });
          setValidated(false);
          return;
        }
        setOutOfBC({ province: null, city: null, message: "That address couldn't be validated. Please try again." });
        return;
      }
      if (!r.ok) throw new Error("validate failed");
      const data = await r.json();
      const a = data.address || {};
      const nice = a.label ? a.label.replace(/\n/g, ", ") : (a.line1 || item.text);
      onChange(nice);
      setValidated(true);
      setOutOfBC(null);
      if (typeof onValidated === "function") onValidated(a);
    } catch (e) {
      setOutOfBC({ province: null, city: null, message: "Address service unavailable. Please type your address manually." });
    } finally { setLoading(false); }
  };

  return (
    <label style={{ display: "grid", gap: 4, fontSize: 12, color: C.navy, position: "relative" }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <input
        data-testid={testId}
        value={value}
        onChange={e => { onChange(e.target.value); setValidated(false); setOutOfBC(null); }}
        onFocus={() => { if (items.length) setOpen(true); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 180)}
        placeholder="Start typing a BC address — e.g. 1234 W 8th Ave"
        autoComplete="off"
        style={{
          padding: "8px 10px", borderRadius: 8,
          border: `1px solid ${validated ? "#16A34A" : outOfBC ? "#DC2626" : "#D1D5DB"}`,
          fontSize: 13, fontFamily: "inherit",
        }}
      />
      <span style={{ fontSize: 10, color: "#6B7280", display: "flex", alignItems: "center", gap: 6 }}>
        {loading ? "Looking up address…"
          : validated ? <><CheckCircle2 size={11} color="#16A34A"/> Validated · BC only</>
          : "Powered by OpenStreetMap"}
      </span>
      {open && items.length > 0 && !validated && (
        <div
          data-testid={`${testId}-suggestions`}
          role="listbox"
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
            background: "#fff", border: "1px solid #D1D5DB", borderRadius: 8,
            boxShadow: "0 12px 28px rgba(15,42,91,0.15)", marginTop: 4,
            maxHeight: 260, overflowY: "auto",
          }}
        >
          {items.map((it, i) => (
            <button
              key={it.id || i}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(it)}
              data-testid={`${testId}-suggestion-${i}`}
              style={{
                display: "block", width: "100%", padding: "8px 10px",
                textAlign: "left", background: "transparent", border: "none",
                borderBottom: i < items.length - 1 ? "1px solid #F1F5F9" : "none",
                cursor: "pointer", fontSize: 12, fontFamily: "inherit",
              }}
            >
              <div style={{ fontWeight: 600, color: C.navy }}>{it.text}</div>
              {it.description && <div style={{ fontSize: 11, color: "#6B7280" }}>{it.description}</div>}
            </button>
          ))}
        </div>
      )}
      {outOfBC && (
        <div
          data-testid={`${testId}-out-of-bc`}
          style={{
            background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8,
            padding: "8px 10px", fontSize: 11.5, color: "#7F1D1D", lineHeight: 1.5,
          }}
        >
          <strong>{outOfBC.message}</strong>
          {outOfBC.province && outOfBC.province !== "BC" && (
            <div style={{ marginTop: 4 }}>
              Doug is BCFSA-licensed in British Columbia only. Would you like a referral to a licensed REALTOR® in{" "}
              <strong>{outOfBC.city || outOfBC.province}</strong>?{" "}
              <a href="/referral-request" style={{ color: C.blue, fontWeight: 700 }}>Referral REALTOR® →</a>
            </div>
          )}
        </div>
      )}
    </label>
  );
};

export const SelectField = ({ label, value, onChange, options, testId }) => (
  <label style={{ display: "grid", gap: 4, fontSize: 12, color: C.navy }}>
    <span style={{ fontWeight: 700 }}>{label}</span>
    <select
      data-testid={testId}
      value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, background: "#fff", fontFamily: "inherit" }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
);

export const CheckboxField = ({ label, checked, onChange, testId }) => (
  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "#374151", lineHeight: 1.5, cursor: "pointer" }}>
    <input
      type="checkbox" data-testid={testId}
      checked={checked} onChange={e => onChange(e.target.checked)}
      style={{ marginTop: 2, width: 16, height: 16, accentColor: C.green, cursor: "pointer" }}
    />
    <span>{label}</span>
  </label>
);

export const FormNav = ({ onBack, onNext, nextDisabled, nextLabel }) => (
  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
    <button
      onClick={onBack}
      style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #D1D5DB", background: "#fff", color: C.navy, fontWeight: 700, cursor: "pointer", fontSize: 13 }}
    >← Back</button>
    <button
      onClick={onNext} disabled={nextDisabled}
      data-testid="q-next"
      style={{
        flex: 1, padding: "9px 14px", borderRadius: 10, border: "none",
        background: nextDisabled ? "#94A3B8" : C.navy, color: "#fff",
        fontWeight: 700, cursor: nextDisabled ? "default" : "pointer", fontSize: 13,
      }}
    >{nextLabel}</button>
  </div>
);

// ── Right pane: Consultation Request (REAL working questionnaire) ────────────
// This is a live, BCFSA-compliant intake that POSTs to /api/leads/buyer OR
// /api/leads/seller depending on the visitor's stated intent. Fields match
// the backend Pydantic schemas exactly (see server.py: BuyerLead / SellerLead).
export const PaneQualify = () => {
  // Step: 1=intent, 2=REALTOR ethics qualifier, 3=contact, 4=buyer/seller specifics, 5=consent+submit
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState("");   // "buyer" | "seller"
  const [alreadyRepresented, setAlreadyRepresented] = useState(null); // null | true | false
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Unified form state — populated conditionally by branch.
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    // buyer-only
    areas: "", budget_range: "$800K – $1.2M", first_time_buyer: false, working_with_realtor: false, financing_status: "Not yet pre-approved",
    // seller-only
    property_address: "", city: "", estimated_value: "Not sure", currently_listed: false,
    // shared
    property_type: "Detached",
    timeline: "3-6 months",
    notes: "",
    preferred_contact: "email",
    casl_consent: false, pipa_ack: false,
    // REALTOR® ethics — final belt-and-braces confirmation on the consent step
    not_represented_confirm: false,
  });
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const progress = step === 1 ? 0 : step === 2 ? 20 : step === 3 ? 40 : step === 4 ? 70 : 100;

  const validStep3 = form.full_name.trim().length >= 2
    && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())
    && form.phone.trim().length >= 7;
  const validStep4Buyer  = form.areas.trim().length >= 2;
  const validStep4Seller = form.property_address.trim().length >= 3 && form.city.trim().length >= 2;
  const validStep5 = form.casl_consent && form.pipa_ack;

  const submit = async () => {
    setError(""); setSubmitting(true);
    try {
      const base = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        timeline: form.timeline,
        preferred_contact: form.preferred_contact,
        notes: form.notes || `Submitted via Doogie Consultation Request (${intent})`,
        casl_consent: form.casl_consent,
        pipa_ack: form.pipa_ack,
        source: `visual_agent_consultation_${intent}`,
        turnstile_token: getTurnstileToken(),
      };
      let url, payload;
      if (intent === "buyer") {
        url = `${API}/leads/buyer`;
        payload = {
          ...base,
          areas: form.areas.split(",").map(a => a.trim()).filter(Boolean),
          property_type: form.property_type,
          budget_range: form.budget_range,
          financing_status: form.financing_status,
          first_time_buyer: form.first_time_buyer,
          working_with_realtor: form.working_with_realtor,
        };
      } else {
        url = `${API}/leads/seller`;
        payload = {
          ...base,
          property_address: form.property_address.trim(),
          city: form.city.trim(),
          property_type: form.property_type,
          estimated_value: form.estimated_value,
          currently_listed: form.currently_listed,
          reason: form.notes || "Submitted via Doogie Consultation Request",
        };
      }
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      setSubmitted(true);
    } catch (e) {
      setError("We couldn't send your request just now. Please try again in a moment, or email hello@eztofind.ca directly.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submitted state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div data-testid="pane-qualify-submitted" style={{ display: "grid", gap: 14, textAlign: "center", paddingTop: 24 }}>
        <img
          src={DOOGIE.celebrating} alt="Doogie celebrating"
          style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", objectPosition: "center 30%", background: "#FFF4D9", border: `3px solid ${C.green}`, margin: "0 auto" }}
        />
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: C.navy, margin: 0 }}>Thanks, {form.full_name.split(" ")[0]}!</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: "#4B5563", maxWidth: 460, marginInline: "auto", lineHeight: 1.55 }}>
          Your consultation request is on Doug's desk. He'll personally review it and reach out within <strong>1 business day</strong>.
          You'll get a confirmation email at <strong>{form.email}</strong> within a few minutes.
        </p>
        <div style={{ fontSize: 11, color: "#6B7280" }}>
          Doug LeMaire, REALTOR® · BCFSA #167790 · Consent record retained per CASL (3 years).
        </div>
      </div>
    );
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  return (
    <div data-testid="pane-qualify" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong style={{ color: C.navy, fontSize: 14 }}>Consultation Request Form</strong>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
            Short questionnaire · goes directly to Doug LeMaire, REALTOR® (BCFSA #167790)
          </div>
        </div>
        <Pill tone="green"><ShieldCheck size={12}/> Consent-first · CASL</Pill>
      </div>

      {/* Progress bar */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
          <span>Step {step} of 5{intent ? ` · ${intent === "buyer" ? "Buyer" : "Seller"} intake` : ""}</span>
          <span>{progress}%</span>
        </div>
        <div style={{ height: 8, background: "#EEF2FB", borderRadius: 99, overflow: "hidden" }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            style={{ height: "100%", background: `linear-gradient(90deg, ${C.blue}, ${C.green})` }}/>
        </div>
      </div>

      {/* ── STEP 1 · Intent ────────────────────────────────────────────────── */}
      {step === 1 && (
        <div data-testid="qualify-step-1" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4 }}>What can Doug help you with?</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Pick one — the questions below adapt to your answer.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[
              { k: "buyer", label: "I want to buy", sub: "Explore active listings & budget", icon: Search },
              { k: "seller", label: "I want to sell", sub: "Get a Market Estimate", icon: HomeIcon },
            ].map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.k}
                  data-testid={`intent-${opt.k}`}
                  onClick={() => { setIntent(opt.k); setStep(2); }}
                  style={{
                    padding: "14px 12px", borderRadius: 12, cursor: "pointer",
                    background: intent === opt.k ? C.navy : "#F5F8FF",
                    color: intent === opt.k ? "#fff" : C.navy,
                    border: `1px solid ${intent === opt.k ? C.navy : "#DDE6FA"}`,
                    fontWeight: 700, fontSize: 13, textAlign: "left",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <Icon size={20} color={intent === opt.k ? C.gold : C.blue}/>
                  <div>
                    <div>{opt.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85, marginTop: 2 }}>{opt.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2 · REALTOR® ethics qualifier ────────────────────────────── */}
      {/* Under the REALTOR® Code of Ethics (Article 16) and RESA duties, a
          licensee may not solicit a client already under written contract
          with another REALTOR®. We ask up front so we don't waste anyone's
          time — and so we honour that existing relationship. */}
      {step === 2 && (
        <div data-testid="qualify-step-2" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>
            One quick question first
          </div>
          <div style={{ fontSize: 12.5, color: "#4B5563", lineHeight: 1.55 }}>
            {intent === "buyer"
              ? "Are you currently working with another BC REALTOR® — for example, do you have a signed Buyer's Agency Agreement in place?"
              : "Is your home currently listed with another BC REALTOR®, or do you have a signed listing agreement in place?"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              data-testid="q-realtor-yes"
              onClick={() => setAlreadyRepresented(true)}
              style={{
                padding: "14px 12px", borderRadius: 12, cursor: "pointer",
                background: alreadyRepresented === true ? "#DC2626" : "#FEF2F2",
                color: alreadyRepresented === true ? "#fff" : "#7F1D1D",
                border: `1px solid ${alreadyRepresented === true ? "#DC2626" : "#FCA5A5"}`,
                fontWeight: 700, fontSize: 13,
              }}
            >Yes — I already have a REALTOR®</button>
            <button
              data-testid="q-realtor-no"
              onClick={() => { setAlreadyRepresented(false); setStep(3); }}
              style={{
                padding: "14px 12px", borderRadius: 12, cursor: "pointer",
                background: alreadyRepresented === false ? C.green : "#ECFDF5",
                color: alreadyRepresented === false ? "#fff" : "#065F46",
                border: `1px solid ${alreadyRepresented === false ? C.green : "#6EE7B7"}`,
                fontWeight: 700, fontSize: 13,
              }}
            >No — I am free to work with a REALTOR®</button>
          </div>

          {/* Polite decline — inline instead of blocking modal */}
          {alreadyRepresented === true && (
            <div data-testid="q-polite-decline" style={{
              background: "#FFF8E9", border: "1px solid rgba(245,166,35,0.4)",
              borderRadius: 10, padding: 14, marginTop: 4, lineHeight: 1.6, color: C.navy, fontSize: 13,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "#78350F" }}>Thank you for being upfront.</div>
              Under the REALTOR® Code of Ethics, Doug can't take on a client who's already
              represented by another BC REALTOR®. That's a rule that protects <em>you</em>{" "}
              — it means every REALTOR® honours the relationship you've already built.
              <br/><br/>
              Please continue working with your current REALTOR® — they know your file best.
              If your relationship has ended or the agreement has expired, we'd be glad to
              welcome you back.
              <br/><br/>
              <strong>In the meantime, Doogie can still help</strong> with general BC real
              estate questions, glossary lookups, and neighbourhood facts on the other tabs
              — no consultation request needed.
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => { setAlreadyRepresented(null); setStep(1); }}
                  data-testid="q-decline-restart"
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: "1px solid #D1D5DB",
                    background: "#fff", color: C.navy, fontWeight: 700, fontSize: 12, cursor: "pointer",
                  }}
                >← Start over</button>
                <a
                  href="/glossary"
                  style={{
                    padding: "8px 14px", borderRadius: 8, background: C.navy, color: "#fff",
                    fontWeight: 700, fontSize: 12, textDecoration: "none",
                  }}
                >Browse Doogie's BC glossary →</a>
              </div>
            </div>
          )}

          {alreadyRepresented !== true && (
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setStep(1)}
                style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #D1D5DB", background: "#fff", color: C.navy, fontWeight: 700, cursor: "pointer", fontSize: 13 }}
              >← Back</button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3 · Contact info (shared) ─────────────────────────────────── */}
      {step === 3 && (
        <div data-testid="qualify-step-3" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>How can Doug reach you?</div>
          <TextField label="Full name *" value={form.full_name} onChange={v => upd("full_name", v)} testId="q-full-name"/>
          <TextField label="Email *" type="email" value={form.email} onChange={v => upd("email", v)} testId="q-email"/>
          <TextField label="Phone *" value={form.phone} onChange={v => upd("phone", v)} testId="q-phone"/>
          <SelectField label="Preferred contact" value={form.preferred_contact} onChange={v => upd("preferred_contact", v)}
            testId="q-preferred-contact"
            options={["email", "phone", "text"]}
          />
          <FormNav
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextDisabled={!validStep3}
            nextLabel="Next →"
          />
        </div>
      )}

      {/* ── STEP 4a · BUYER branch ─────────────────────────────────────────── */}
      {step === 4 && intent === "buyer" && (
        <div data-testid="qualify-step-4-buyer" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Tell Doug about your search</div>
          <TextField label="Target areas or cities in BC *" value={form.areas} onChange={v => upd("areas", v)} testId="q-areas" placeholder="e.g. Kitsilano, North Vancouver, Squamish" hint="Comma-separated list is fine"/>
          {isOutsideFocusArea(form.areas) && (
            <OutsideFocusBump label={form.areas.trim()} testId="q-areas-outside-focus"/>
          )}
          <SelectField label="Budget range" value={form.budget_range} onChange={v => upd("budget_range", v)} testId="q-budget"
            options={["Under $500K","$500K – $800K","$800K – $1.2M","$1.2M – $1.8M","$1.8M – $2.5M","$2.5M – $4M","Over $4M"]}/>
          <SelectField label="Property type" value={form.property_type} onChange={v => upd("property_type", v)} testId="q-property-type"
            options={["Any","Detached","Townhouse","Condo","Duplex","Land / Acreage","Luxury","Equestrian"]}/>
          <SelectField label="Timeline" value={form.timeline} onChange={v => upd("timeline", v)} testId="q-timeline"
            options={["ASAP","1-3 months","3-6 months","6-12 months","Just looking"]}/>
          <SelectField label="Financing status" value={form.financing_status} onChange={v => upd("financing_status", v)} testId="q-financing"
            options={["Not yet pre-approved","Pre-approved","All cash","Refinancing to buy","Need a mortgage broker referral"]}/>
          <CheckboxField label="First-time buyer" checked={form.first_time_buyer} onChange={v => upd("first_time_buyer", v)} testId="q-first-time"/>
          <TextField label="Anything else Doug should know?" value={form.notes} onChange={v => upd("notes", v)} testId="q-notes" placeholder="Optional" multiline/>
          <FormNav onBack={() => setStep(3)} onNext={() => setStep(5)} nextDisabled={!validStep4Buyer} nextLabel="Next →"/>
        </div>
      )}

      {/* ── STEP 4b · SELLER branch ────────────────────────────────────────── */}
      {step === 4 && intent === "seller" && (
        <div data-testid="qualify-step-4-seller" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Tell Doug about your home</div>
          <AddressAutocompleteField
            value={form.property_address}
            onChange={v => upd("property_address", v)}
            onValidated={(a) => {
              // Auto-fill city + postal code once the geocoder confirms the address
              if (a.city) upd("city", a.city);
              if (a.postal_code) upd("postal_code", a.postal_code);
            }}
            testId="q-address"
          />
          <TextField label="City (BC) *" value={form.city} onChange={v => upd("city", v)} testId="q-city"/>
          {isOutsideFocusArea(form.city) && (
            <OutsideFocusBump label={form.city.trim()} testId="q-city-outside-focus"/>
          )}
          <SelectField label="Property type" value={form.property_type} onChange={v => upd("property_type", v)} testId="q-property-type"
            options={["Detached","Townhouse","Condo","Duplex","Luxury","Estate Sale / Probate","Equestrian / Acreage","Land"]}/>
          <SelectField label="Timeline" value={form.timeline} onChange={v => upd("timeline", v)} testId="q-timeline"
            options={["ASAP","1-3 months","3-6 months","6-12 months","Just curious"]}/>
          <SelectField label="Your estimated value" value={form.estimated_value} onChange={v => upd("estimated_value", v)} testId="q-est-value"
            options={["Not sure","Under $700K","$700K – $1M","$1M – $1.5M","$1.5M – $2.5M","$2.5M – $4M","Over $4M"]}/>
          <TextField label="Reason for selling / notes (optional)" value={form.notes} onChange={v => upd("notes", v)} testId="q-notes" multiline/>
          <FormNav onBack={() => setStep(3)} onNext={() => setStep(5)} nextDisabled={!validStep4Seller} nextLabel="Next →"/>
        </div>
      )}

      {/* ── STEP 5 · Consent + Submit ──────────────────────────────────────── */}
      {step === 5 && (
        <div data-testid="qualify-step-5" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>One last thing — your consent</div>
          <div style={{
            background: "#F8FAFF", border: "1px solid #DDE6FA", borderRadius: 10, padding: 12, fontSize: 12, color: "#374151", lineHeight: 1.55,
          }}>
            Doug LeMaire, REALTOR® (<strong>BCFSA #167790</strong>) personally reviews every consultation request. He'll reach out within <strong>1 business day</strong>. Nothing here is a listing, offer, or contract (RESA). Doogie shares general information — not advice.
          </div>
          <CheckboxField
            label={<>I consent to receive commercial electronic messages from EZtoFind.ca (<strong>CASL</strong>). I can unsubscribe any time.</>}
            checked={form.casl_consent} onChange={v => upd("casl_consent", v)} testId="q-casl"
          />
          <CheckboxField
            label={<>I acknowledge the <a href="/privacy" target="_blank" rel="noopener" style={{ color: C.blue, fontWeight: 600 }}>Privacy Policy (PIPA)</a>.</>}
            checked={form.pipa_ack} onChange={v => upd("pipa_ack", v)} testId="q-pipa"
          />
          <CheckboxField
            label={<>I confirm I am <strong>not currently under contract</strong> with another BC REALTOR®.</>}
            checked={form.not_represented_confirm} onChange={v => upd("not_represented_confirm", v)} testId="q-not-represented"
          />
          <TurnstileWidget/>
          {error && (
            <div data-testid="q-submit-error" style={{ background: "#FEE2E2", border: "1px solid #DC2626", color: "#7F1D1D", padding: 10, borderRadius: 8, fontSize: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <button
              data-testid="q-back"
              onClick={() => setStep(4)}
              disabled={submitting}
              style={{
                padding: "10px 14px", borderRadius: 10, border: "1px solid #D1D5DB", background: "#fff",
                color: C.navy, fontWeight: 700, cursor: submitting ? "default" : "pointer", fontSize: 13,
              }}
            >← Back</button>
            <button
              data-testid="q-submit"
              onClick={submit}
              disabled={!validStep5 || !form.not_represented_confirm || submitting}
              style={{
                flex: 1, minWidth: 200,
                padding: "10px 14px", borderRadius: 10, border: "none",
                background: (!validStep5 || !form.not_represented_confirm || submitting) ? "#94A3B8" : C.green,
                color: "#fff", fontWeight: 800, cursor: (!validStep5 || !form.not_represented_confirm || submitting) ? "default" : "pointer",
                fontSize: 13, letterSpacing: 0.2,
                boxShadow: (!validStep5 || !form.not_represented_confirm) ? "none" : "0 6px 16px rgba(34,197,94,0.35)",
              }}
            >{submitting ? "Sending…" : "Send to Doug ✓"}</button>
          </div>
        </div>
      )}

      <div style={{
        background: "linear-gradient(135deg, rgba(30,79,207,0.06), rgba(34,197,94,0.06))",
        border: "1px solid #DDE6FA", borderRadius: 12, padding: 10, fontSize: 11.5, color: C.navy,
      }}>
        <strong>What happens next:</strong> Your responses go straight to Doug LeMaire, REALTOR® (BCFSA #167790). He personally reads every consultation request — no automated outreach. You'll hear from a real person within 1 business day. Doogie shares general information, not advice.
      </div>
    </div>
  );
};
