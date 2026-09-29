import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { HnAddressInput } from "./HnAddressInput";
import { TurnstileWidget, getTurnstileToken, trackConversion } from "../../App";
import {
  trackFormView, trackFormStart, trackFormSubmit, trackFieldError,
  trackArticle16Block, trackThankYouView, trackStepComplete, withConversionContext,
} from "../../utils/conversionAnalytics";

const API = process.env.REACT_APP_BACKEND_URL;
const ROUTE = "/valuation-next";
const TYPES = ["Detached", "Luxury", "Equestrian / Acreage", "Estate Sale / Probate", "Condo", "Townhouse"];
const TIMELINES = ["ASAP", "1-3 months", "3-6 months", "6-12 months", "Just curious"];
const STEPS = ["Address", "Home", "You"];

const INIT = {
  full_name: "", email: "", phone: "", property_address: "", city: "", property_type: "Detached",
  timeline: "3-6 months", estimated_value: "Not sure", currently_listed: false,
  reason: "Just curious about current value", casl_consent: false, pipa_ack: false,
};

const Pills = ({ options, value, onPick, testPrefix }) => (
  <div className="hn-vpills" role="radiogroup">
    {options.map(o => (
      <button type="button" key={o} role="radio" aria-checked={value === o}
        className={`hn-vpill${value === o ? " on" : ""}`} onClick={() => onPick(o)}
        data-testid={`${testPrefix}-${o.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{o}</button>
    ))}
  </div>
);

const Stepper = ({ step }) => (
  <ol className="hn-vsteps" data-testid="vn-stepper">
    {STEPS.map((s, i) => (
      <li key={s} className={i < step ? "done" : i === step ? "on" : ""} aria-current={i === step ? "step" : undefined}>
        <span className="hn-vsteps__n">{i < step ? <Check size={13} strokeWidth={3}/> : i + 1}</span>
        <span className="hn-vsteps__l">{s}</span>
      </li>
    ))}
  </ol>
);

const Done = () => (
  <div className="hn-vcard hn-vcard--done" data-testid="vn-done">
    <div className="hn-vdone__check"><Check size={30} strokeWidth={2.5}/></div>
    <h2 className="hn-h2" style={{ fontSize: "1.8rem" }}>Request received.</h2>
    <p className="hn-lead" style={{ marginBottom: 18 }}>Doug LeMaire, REALTOR®, will review your request and reply within one business day (Mon–Fri, excluding statutory holidays).</p>
    <p className="hn-vfine">Submitting this form does not create a REALTOR®-client relationship. Any representation will be explained in writing before real-estate services are provided.</p>
    <div className="hn-hero__pills" style={{ justifyContent: "flex-start", marginTop: 18 }}>
      <Link to="/listings" className="hn-pill" data-testid="vn-ty-search">Search listings</Link>
      <Link to="/communities" className="hn-pill" data-testid="vn-ty-communities">Explore communities</Link>
    </div>
  </div>
);

export const ValuationNextForm = () => {
  const [f, setF] = useState(INIT);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => { trackFormView(ROUTE); }, []);
  useEffect(() => { if (done) trackThankYouView(ROUTE); }, [done]);

  const edit = (patch) => {
    if (!started) { trackFormStart(ROUTE); setStarted(true); }
    setF(p => ({ ...p, ...patch }));
  };

  const next = (e) => {
    e.preventDefault(); setErr("");
    if (step === 0 && !f.property_address.trim()) { setErr("Please enter your property address."); return; }
    if (step === 1) {
      if (!f.city.trim()) { setErr("Please tell us the city."); return; }
      if (f.currently_listed) return;
      trackStepComplete(ROUTE, "intent");
    }
    setStep(s => s + 1);
  };

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (!f.full_name.trim() || !f.email.trim()) { setErr("Name and email are required."); return; }
    if (!f.pipa_ack) { setErr("Please acknowledge the Privacy Policy to continue."); return; }
    setBusy(true);
    try {
      trackStepComplete(ROUTE, "contact");
      const enriched = withConversionContext(
        { ...f, turnstile_token: getTurnstileToken() },
        {
          form_route: ROUTE,
          representation_eligibility_result: f.currently_listed ? "represented_block" : "eligible",
          consent_status: { casl_marketing: !!f.casl_consent, pipa_privacy: !!f.pipa_ack },
        }
      );
      await axios.post(`${API}/api/leads/seller`, enriched);
      trackFormSubmit(ROUTE, { timeline: f.timeline, property_type: f.property_type, city: f.city });
      trackConversion("home_valuation_request", { timeline: f.timeline, property_type: f.property_type, city: f.city, currently_listed: f.currently_listed, currency: "CAD" });
      trackConversion("seller_lead", { lead_type: "seller", property_type: f.property_type || "Any", source: "valuation_next_page", currency: "CAD" });
      setDone(true);
    } catch (x) {
      trackFieldError(ROUTE, "submit", "post_failed");
      setErr("Something went wrong sending your request. Please check your details and try again.");
    } finally { setBusy(false); }
  };

  if (done) return <Done/>;

  return (
    <form className="hn-vcard" onSubmit={step === 2 ? submit : next} data-testid="vn-form" noValidate>
      <Stepper step={step}/>

      {step === 0 && (
        <div className="hn-vbody" data-testid="vn-step-address">
          <label className="hn-vlabel">Where's the home?</label>
          <HnAddressInput autoFocus value={f.property_address}
            onChange={(addr, meta) => edit({ property_address: addr, ...(meta?.locality ? { city: meta.locality } : {}) })}/>
        </div>
      )}

      {step === 1 && (
        <div className="hn-vbody" data-testid="vn-step-home">
          {!f.city && (
            <>
              <label className="hn-vlabel" htmlFor="vn-city">City (BC)</label>
              <input id="vn-city" className="hn-vinput" value={f.city} onChange={e => edit({ city: e.target.value })} required data-testid="vn-city-input"/>
            </>
          )}
          <label className="hn-vlabel">What kind of home?</label>
          <Pills options={TYPES} value={f.property_type} onPick={v => edit({ property_type: v })} testPrefix="vn-type"/>
          <label className="hn-vlabel">When are you thinking of selling?</label>
          <Pills options={TIMELINES} value={f.timeline} onPick={v => edit({ timeline: v })} testPrefix="vn-when"/>
          <label className="hn-vcheck">
            <input type="checkbox" checked={f.currently_listed} data-testid="vn-currently-listed"
              onChange={e => { const v = e.target.checked; edit({ currently_listed: v }); if (v) trackArticle16Block(ROUTE); }}/>
            <span>The property is currently listed with another REALTOR®.</span>
          </label>
          {f.currently_listed && (
            <div className="hn-vblock" data-testid="vn-currently-listed-block">
              <strong>We can't continue this request through this form.</strong>
              You indicated that your property may already be listed with another REALTOR®. To respect that relationship, EZtoFind cannot provide trading services through this request. You're welcome to use our <Link to="/communities">community profiles</Link> and <Link to="/glossary">BC real-estate glossary</Link>.
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="hn-vbody" data-testid="vn-step-you">
          <label className="hn-vlabel" htmlFor="vn-name">Your name</label>
          <input id="vn-name" className="hn-vinput" autoFocus value={f.full_name} onChange={e => edit({ full_name: e.target.value })} required autoComplete="name" data-testid="vn-name-input"/>
          <label className="hn-vlabel" htmlFor="vn-email">Email</label>
          <input id="vn-email" className="hn-vinput" type="email" value={f.email} onChange={e => edit({ email: e.target.value })} required autoComplete="email" data-testid="vn-email-input"/>
          <label className="hn-vlabel" htmlFor="vn-phone">Phone <em>optional — Doug replies faster with it</em></label>
          <input id="vn-phone" className="hn-vinput" type="tel" value={f.phone} onChange={e => edit({ phone: e.target.value })} autoComplete="tel" data-testid="vn-phone-input"/>
          <label className="hn-vcheck">
            <input type="checkbox" checked={f.pipa_ack} onChange={e => edit({ pipa_ack: e.target.checked })} required data-testid="vn-pipa-ack"/>
            <span>I acknowledge the <Link to="/privacy">Privacy Policy</Link> (PIPA).</span>
          </label>
          <TurnstileWidget/>
        </div>
      )}

      {err && <div className="hn-verr" role="alert" data-testid="vn-error">{err}</div>}

      <div className="hn-vactions">
        {step > 0 ? (
          <button type="button" className="hn-vback" onClick={() => { setErr(""); setStep(s => s - 1); }} data-testid="vn-back"><ArrowLeft size={16}/> Back</button>
        ) : <span/>}
        <button type="submit" className="hn-vnext" disabled={busy || (step === 1 && f.currently_listed)} data-testid={step === 2 ? "vn-submit" : "vn-continue"}>
          {step === 2 ? (busy ? "Sending…" : "Get my estimate") : "Continue"} {step < 2 && <ArrowRight size={16}/>}
        </button>
      </div>
      <p className="hn-vfine">Educational information only — not an appraisal. Your details are protected under BC's Personal Information Protection Act.</p>
    </form>
  );
};
