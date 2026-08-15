// Weekly Just-Sold Digest signup card — a compact single-field lead-gen
// widget that funnels visitors into the existing saved-searches double-
// opt-in flow with `frequency: "weekly_just_sold"`. Every Friday morning
// the backend cron sends them a curated list of BC listings that closed
// in the last 7 days matching their area preference.
//
// CASL / PIPA:
// • Pre-unchecked consent boxes (never pre-ticked — dark-pattern-safe).
// • Double opt-in — a verification email is sent before any commercial
//   email is queued. The subscriber has to click the verification link.
// • One-click unsubscribe token embedded in every subsequent email.
// • Consent metadata (IP, UA, timestamp) captured server-side.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const C = { navy:"#0F2A5B", gold:"#F5A623", ink:"#111827", muted:"#6B7280", paper:"#FAFAF7" };

export default function WeeklyDigestSignup({ variant = "banner" }) {
  const [email, setEmail]     = useState("");
  const [city, setCity]       = useState("");
  const [casl, setCasl]       = useState(false);
  const [pipa, setPipa]       = useState(false);
  const [status, setStatus]   = useState("idle"); // idle | sending | verify | error
  const [errMsg, setErrMsg]   = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !casl || !pipa) {
      setErrMsg("Please enter your email and tick both consent boxes.");
      setStatus("error");
      return;
    }
    setStatus("sending"); setErrMsg("");
    try {
      await axios.post(`${API}/saved-searches`, {
        email,
        filters: city ? { city: city.trim() } : {},
        label: city ? `Just-Sold digest · ${city}` : "Just-Sold digest · all BC",
        frequency: "weekly_just_sold",
        casl_consent: true,
        pipa_ack: true,
      });
      setStatus("verify");
    } catch (err) {
      setErrMsg(err?.response?.data?.detail || "Something went wrong — please try again in a moment.");
      setStatus("error");
    }
  };

  if (status === "verify") {
    return (
      <div data-testid="weekly-digest-success" style={{ background: C.paper, border:`1px solid ${C.gold}`, borderRadius: 12, padding: "22px 24px", textAlign:"center" }}>
        <div style={{ fontSize: "2rem" }}>📬</div>
        <div style={{ fontSize:"1.05rem", fontWeight: 800, color: C.navy, fontFamily:"'Sora',sans-serif", marginTop: 6 }}>Check your inbox</div>
        <div style={{ fontSize:"0.88rem", color: C.ink, marginTop: 6, lineHeight: 1.5 }}>
          We've sent a verification link to <strong>{email}</strong>. Click it to confirm your subscription — no emails go out before you do.
        </div>
      </div>
    );
  }

  const outer = variant === "banner"
    ? { background: C.navy, color:"white", padding:"clamp(24px, 4vw, 36px)", borderRadius: 14 }
    : { background: C.paper, color: C.ink, padding: 22, borderRadius: 12, border:"1px solid #E5E7EB" };

  return (
    <div data-testid="weekly-digest-signup" style={outer}>
      <div style={{ fontSize:"0.7rem", letterSpacing:"0.16em", color: C.gold, fontWeight: 800 }}>DOOGIE'S WEEKLY JUST-SOLD DIGEST</div>
      <div style={{ fontSize: variant === "banner" ? "1.4rem" : "1.15rem", fontFamily:"'Sora',sans-serif", fontWeight: 700, marginTop: 6, marginBottom: 6, lineHeight: 1.2 }}>
        Know what actually sold in your BC neighbourhood this week.
      </div>
      <div style={{ fontSize:"0.85rem", opacity: variant === "banner" ? 0.9 : 1, lineHeight: 1.55, marginBottom: 14 }}>
        Every Friday morning — up to 10 listings that closed in the last 7 days matching your area. Sale-price bands, never exact addresses. One-click unsubscribe.
      </div>

      <form onSubmit={submit} style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap: 8, marginBottom: 12 }}>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          data-testid="weekly-digest-email"
          style={{ padding:"10px 14px", borderRadius: 8, border:"1px solid #D1D5DB", fontSize:"0.9rem", color: C.ink, background:"white", boxSizing:"border-box", minWidth: 0 }}
        />
        <input
          type="text"
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="BC city (optional)"
          data-testid="weekly-digest-city"
          style={{ padding:"10px 14px", borderRadius: 8, border:"1px solid #D1D5DB", fontSize:"0.9rem", color: C.ink, background:"white", boxSizing:"border-box", minWidth: 0 }}
        />
        <button
          type="submit"
          disabled={status === "sending"}
          data-testid="weekly-digest-submit"
          style={{ background: C.gold, color: C.navy, border:"none", padding:"10px 20px", borderRadius: 999, fontWeight: 800, fontSize:"0.85rem", cursor: status === "sending" ? "wait" : "pointer", fontFamily:"'Sora',sans-serif", opacity: status === "sending" ? 0.7 : 1 }}
        >
          {status === "sending" ? "…" : "Subscribe →"}
        </button>
      </form>

      <div style={{ fontSize:"0.75rem", lineHeight: 1.55, display:"flex", flexDirection:"column", gap: 6, opacity: 0.92 }}>
        <label style={{ display:"flex", gap: 8, alignItems:"flex-start", cursor:"pointer" }}>
          <input
            type="checkbox"
            checked={casl}
            onChange={e => setCasl(e.target.checked)}
            data-testid="weekly-digest-casl"
            className="tap-target-exempt"
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span><strong>CASL consent</strong> — Yes, I want to receive the weekly Just-Sold digest from Doug LeMaire, REALTOR® at EZtoFind.ca. I can unsubscribe with one click at any time.</span>
        </label>
        <label style={{ display:"flex", gap: 8, alignItems:"flex-start", cursor:"pointer" }}>
          <input
            type="checkbox"
            checked={pipa}
            onChange={e => setPipa(e.target.checked)}
            data-testid="weekly-digest-pipa"
            className="tap-target-exempt"
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span><strong>PIPA acknowledgement</strong> — I understand my email is collected only for the purpose of this newsletter, stored securely, and deletable on request. See the <Link to="/privacy" style={{ color: variant === "banner" ? C.gold : C.navy, textDecoration:"underline" }}>Privacy Policy</Link>.</span>
        </label>
        {errMsg && <div data-testid="weekly-digest-error" role="alert" style={{ marginTop: 6, color:"#DC2626", fontWeight: 600 }}>{errMsg}</div>}
      </div>
    </div>
  );
}
