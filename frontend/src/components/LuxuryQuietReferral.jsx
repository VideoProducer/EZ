// ═══════════════════════════════════════════════════════════════════════
// LuxuryQuietReferral.jsx
// ═══════════════════════════════════════════════════════════════════════
// Refined, quiet-luxury referral capture for out-of-area BC visitors.
// Sister piece to LuxuryQuietContact.jsx and LuxuryQuietLanding.jsx —
// same palette, typography, and editorial restraint. Replaces the older
// ReferralRequest component at /referral-request.
//
// OPERATING-SYSTEM ALIGNMENT (Feb 28, 2026 — Doug's spec)
// • Rest-of-BC visitor — do not imply Doug will list or show
//   the property. Explicit copy states Doug does not personally
//   transact outside GV / FV / Sea-to-Sky.
// • Fields per spec: city, buy vs sell, timing, consent, board if
//   known.
// • Article 16 gate — same silent hard-block used on /contact so
//   visitors currently under contract with another REALTOR® are
//   respectfully redirected.
// • Voice order — identity first (Doug + brokerage line), then
//   proof (network of vetted licensed REALTORs®), then the action.
//   Compliance sits adjacent to the action, not in front of the
//   identity.
// ═══════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const API = process.env.REACT_APP_BACKEND_URL;

const T = {
  paper:    "#FBF9F5",
  ink:      "#1E1F24",
  muted:    "#565963",
  hairline: "#E4DDD1",
  accent:   "#7A6A57",
};
const SERIF = 'ui-serif, Georgia, "Cormorant Garamond", "Times New Roman", serif';
const SANS  = 'ui-sans-serif, -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

// BC real-estate boards Doug could refer into. Ordered by transaction
// volume so the highest-hit boards sit at the top of the dropdown.
const BC_BOARDS = [
  "Not sure",
  "Chilliwack & District Real Estate Board (CADREB)",
  "Vancouver Island Real Estate Board (VIREB)",
  "Victoria Real Estate Board (VREB)",
  "Association of Interior REALTORS® (AIR)",
  "South Okanagan Real Estate Board (SOREB)",
  "Kamloops & District Real Estate Association (KADREA)",
  "Kootenay Real Estate Board (KREB)",
  "Powell River Sunshine Coast Real Estate Board",
  "BC Northern Real Estate Board",
];

const TIMING_OPTIONS = [
  { v: "0-30",     label: "Within 30 days" },
  { v: "30-90",    label: "30 – 90 days" },
  { v: "3-6",      label: "3 – 6 months" },
  { v: "6-12",     label: "6 – 12 months" },
  { v: "exploring", label: "Exploring — no timeline" },
];

// ── SEO ─────────────────────────────────────────────────────────────
function SEOHead() {
  return (
    <Helmet>
      <title>Referral Request | Out-of-Area BC | Doug LeMaire, REALTOR®</title>
      <meta name="description" content="Buying or selling outside Greater Vancouver, the Fraser Valley, or the Sea-to-Sky Corridor? Doug LeMaire, REALTOR® will introduce you to a licensed local REALTOR® on the correct BC real-estate board." />
      <link rel="canonical" href="https://eztofind.ca/referral-request" />
      <meta property="og:title" content="Referral Request | Doug LeMaire, REALTOR® | EZtoFind.ca" />
      <meta property="og:description" content="Referral network for BC buyers and sellers outside Doug's direct practice area." />
      <meta property="og:url" content="https://eztofind.ca/referral-request" />
      <meta property="og:type" content="website" />
    </Helmet>
  );
}

const Eyebrow = ({ children }) => (
  <div style={{ fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: T.muted, fontWeight: 500, marginBottom: 18 }}>
    {children}
  </div>
);

const inputStyle = {
  width: "100%", padding: "14px 0",
  border: "none", borderBottom: `1px solid ${T.hairline}`,
  background: "transparent", fontFamily: SANS, fontSize: "1rem",
  color: T.ink, outline: "none", transition: "border-color 200ms ease",
};
const labelStyle = {
  fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.14em",
  textTransform: "uppercase", color: T.muted, fontWeight: 500,
  display: "block", marginBottom: 6,
};

// ── Component ───────────────────────────────────────────────────────
export default function LuxuryQuietReferral() {
  // Article 16 gate — same pattern as LuxuryQuietContact.
  const [workingWithRealtor, setWorkingWithRealtor] = useState(null);

  // Form fields
  const [intent,   setIntent]   = useState("");   // "buyer" | "seller"
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [city,     setCity]     = useState("");
  const [timing,   setTiming]   = useState("");
  const [board,    setBoard]    = useState("Not sure");
  const [message,  setMessage]  = useState("");
  const [casl,     setCasl]     = useState(false);

  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = useMemo(() => {
    if (workingWithRealtor !== false) return false;
    if (!casl)  return false;
    if (!name.trim())  return false;
    if (!email.trim()) return false;
    if (!city.trim())  return false;
    if (!intent)       return false;
    if (!timing)       return false;
    return true;
  }, [workingWithRealtor, casl, name, email, city, intent, timing]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || status === "submitting") return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const timingLabel = TIMING_OPTIONS.find(o => o.v === timing)?.label || timing;
      const notes = [
        `OUT-OF-AREA REFERRAL — ${city}`,
        `Intent: ${intent === "seller" ? "Seller" : "Buyer"}`,
        `Timing: ${timingLabel}`,
        `Board if known: ${board}`,
        message.trim() ? `Note: ${message.trim()}` : null,
      ].filter(Boolean).join(" · ");

      const isSeller = intent === "seller";
      const path = isSeller ? "/api/leads/seller" : "/api/leads/buyer";
      const payload = {
        full_name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || "Not provided",
        casl_consent: true,
        pipa_ack: true,
        dorts_ack: true,
        working_with_realtor: false,
        notes,
        preferred_contact: phone.trim() ? "either" : "email",
        source: "referral-request",
      };
      if (isSeller) {
        Object.assign(payload, {
          address: "Not specified (out-of-area)",
          city: city.trim(),
          property_type: "Not specified",
          timeline: timingLabel,
          reason: "Out-of-area referral request",
        });
      } else {
        Object.assign(payload, {
          areas: [city.trim()],
          property_type: "Not specified",
          budget_range: "Not specified",
          timeline: timingLabel,
          financing_status: "Not specified",
        });
      }
      await axios.post(`${API}${path}`, payload);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.detail || "Please try again in a moment.");
    }
  }

  const showBlockNotice = workingWithRealtor === true;

  return (
    <>
      <SEOHead />
      <main
        data-testid="luxury-referral"
        style={{ background: T.paper, color: T.ink, fontFamily: SANS, minHeight: "100vh", paddingBottom: "clamp(96px, 12vw, 144px)" }}
      >
        {/* ─── HEADER ─── */}
        <section style={{ maxWidth: 780, margin: "0 auto", padding: "clamp(80px, 12vw, 128px) 28px 0" }}>
          <Eyebrow>Doug LeMaire, REALTOR® · Referral Network</Eyebrow>
          <h1
            data-testid="referral-h1"
            style={{
              fontFamily: SERIF, fontSize: "clamp(2.15rem, 4.4vw, 3.5rem)",
              lineHeight: 1.08, letterSpacing: "-0.015em",
              color: T.ink, margin: "0 0 22px", fontWeight: 400,
            }}
          >
            Outside Doug's territory.
          </h1>
          <p style={{
            fontFamily: SERIF, fontSize: "clamp(1.15rem, 1.6vw, 1.35rem)",
            lineHeight: 1.55, color: T.ink, margin: "0 0 24px", maxWidth: 640,
          }}>
            Doug personally represents transactions in Greater Vancouver, the
            Fraser Valley, and the Sea-to-Sky Corridor to Whistler.
          </p>
          <p style={{
            fontFamily: SANS, fontSize: "1rem", lineHeight: 1.75,
            color: T.muted, margin: "0 0 12px", maxWidth: 620,
          }}>
            For everywhere else in British Columbia — Vancouver Island, the
            Okanagan, the Kootenays, the Sunshine Coast, Northern BC — Doug
            introduces you to a licensed local REALTOR® on the correct BC
            real-estate board. Vetted for craft, discretion, and the standards
            Doug's own clients expect.
          </p>
          <p
            data-testid="referral-no-transact-line"
            style={{
              fontFamily: SANS, fontSize: "0.95rem", lineHeight: 1.7,
              color: T.muted, margin: 0, maxWidth: 620, fontStyle: "italic",
            }}
          >
            Doug does not personally list or show property outside his
            direct-practice area. The introduction is at no cost to you;
            Doug earns a REALTOR®-to-REALTOR® referral fee from the local
            REALTOR® if a transaction completes — never from you.
          </p>
        </section>

        {/* ─── ARTICLE 16 GATE ─── */}
        <section
          data-testid="referral-article-16-gate"
          style={{ maxWidth: 780, margin: "0 auto", padding: "clamp(56px, 8vw, 80px) 28px 0" }}
        >
          <div style={{ paddingTop: 32, borderTop: `1px solid ${T.hairline}` }}>
            <div style={labelStyle}>Before we begin</div>
            <p style={{
              fontFamily: SERIF, fontSize: "clamp(1.15rem, 1.5vw, 1.35rem)",
              lineHeight: 1.5, color: T.ink, margin: "8px 0 24px", maxWidth: 620,
            }}>
              Are you currently working with another REALTOR®?
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[{ v: false, label: "No" }, { v: true, label: "Yes" }].map((opt) => {
                const selected = workingWithRealtor === opt.v;
                return (
                  <button
                    key={String(opt.v)}
                    type="button"
                    data-testid={`referral-gate-${opt.label.toLowerCase()}`}
                    onClick={() => setWorkingWithRealtor(opt.v)}
                    style={{
                      fontFamily: SANS, fontSize: "0.88rem", letterSpacing: "0.12em",
                      textTransform: "uppercase", fontWeight: 500,
                      color: selected ? T.paper : T.ink,
                      background: selected ? T.ink : "transparent",
                      padding: "14px 26px", border: `1px solid ${T.ink}`,
                      cursor: "pointer", transition: "all 200ms ease",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── BLOCK NOTICE ─── */}
        {showBlockNotice && (
          <section
            data-testid="referral-block-notice"
            style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(56px, 8vw, 80px) 28px 0" }}
          >
            <div style={{ paddingTop: 32, borderTop: `1px solid ${T.hairline}` }}>
              <Eyebrow>Out of respect</Eyebrow>
              <p style={{ fontFamily: SERIF, fontSize: "clamp(1.15rem, 1.6vw, 1.35rem)", lineHeight: 1.55, color: T.ink, margin: "0 0 20px", maxWidth: 620 }}>
                If you are already under contract with another REALTOR®, the
                right first conversation is with them. Please give them the
                opportunity to help — including a referral to a colleague on
                the correct board.
              </p>
              <p style={{ fontFamily: SANS, fontSize: "0.95rem", lineHeight: 1.75, color: T.muted, margin: 0, maxWidth: 620 }}>
                Once your existing representation is complete, the door is
                open here.
              </p>
            </div>
          </section>
        )}

        {/* ─── FORM ─── */}
        {workingWithRealtor === false && status !== "sent" && (
          <section
            data-testid="referral-form-section"
            style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(56px, 8vw, 80px) 28px 0" }}
          >
            <form onSubmit={handleSubmit}>
              {/* Buy vs Sell */}
              <div style={{ marginBottom: 44 }}>
                <div style={labelStyle}>Are you buying or selling?</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                  {[{ v: "buyer", label: "Buying" }, { v: "seller", label: "Selling" }].map((opt) => {
                    const selected = intent === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        data-testid={`referral-intent-${opt.v}`}
                        onClick={() => setIntent(opt.v)}
                        style={{
                          fontFamily: SANS, fontSize: "0.82rem", letterSpacing: "0.1em",
                          textTransform: "uppercase", fontWeight: 500,
                          color: selected ? T.paper : T.muted,
                          background: selected ? T.ink : "transparent",
                          padding: "10px 22px", border: `1px solid ${selected ? T.ink : T.hairline}`,
                          cursor: "pointer", transition: "all 200ms ease",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div style={{ marginBottom: 32 }}>
                <label htmlFor="rr-name" style={labelStyle}>Your name</label>
                <input id="rr-name" data-testid="referral-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = T.ink)} onBlur={(e) => (e.target.style.borderColor = T.hairline)} />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 32 }}>
                <label htmlFor="rr-email" style={labelStyle}>Email</label>
                <input id="rr-email" data-testid="referral-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = T.ink)} onBlur={(e) => (e.target.style.borderColor = T.hairline)} />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: 32 }}>
                <label htmlFor="rr-phone" style={labelStyle}>Phone (optional)</label>
                <input id="rr-phone" data-testid="referral-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = T.ink)} onBlur={(e) => (e.target.style.borderColor = T.hairline)} />
              </div>

              {/* City */}
              <div style={{ marginBottom: 32 }}>
                <label htmlFor="rr-city" style={labelStyle}>City or area in BC</label>
                <input id="rr-city" data-testid="referral-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} required
                  placeholder="e.g. Kelowna, Nanaimo, Nelson, Salt Spring Island"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = T.ink)} onBlur={(e) => (e.target.style.borderColor = T.hairline)} />
              </div>

              {/* Timing */}
              <div style={{ marginBottom: 44 }}>
                <div style={labelStyle}>Timing</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  {TIMING_OPTIONS.map((opt) => {
                    const selected = timing === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        data-testid={`referral-timing-${opt.v}`}
                        onClick={() => setTiming(opt.v)}
                        style={{
                          fontFamily: SANS, fontSize: "0.8rem", letterSpacing: "0.08em",
                          fontWeight: 500,
                          color: selected ? T.paper : T.muted,
                          background: selected ? T.ink : "transparent",
                          padding: "9px 16px", border: `1px solid ${selected ? T.ink : T.hairline}`,
                          cursor: "pointer", transition: "all 200ms ease",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Board (optional dropdown) */}
              <div style={{ marginBottom: 32 }}>
                <label htmlFor="rr-board" style={labelStyle}>Real-estate board (if you know it)</label>
                <select
                  id="rr-board"
                  data-testid="referral-board"
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  style={{ ...inputStyle, appearance: "none", background: "transparent url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23565963%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>') no-repeat right 4px center / 16px 16px", paddingRight: 28 }}
                >
                  {BC_BOARDS.map((b) => (<option key={b} value={b}>{b}</option>))}
                </select>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 40 }}>
                <label htmlFor="rr-msg" style={labelStyle}>Anything else that helps</label>
                <textarea id="rr-msg" data-testid="referral-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                  style={{ ...inputStyle, resize: "vertical", padding: "14px 0", lineHeight: 1.6 }}
                  placeholder="A price bracket, a neighbourhood, a specific need (waterfront, acreage, retiring, moving for work)…"
                  onFocus={(e) => (e.target.style.borderColor = T.ink)} onBlur={(e) => (e.target.style.borderColor = T.hairline)} />
              </div>

              {/* CASL */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 40, cursor: "pointer" }}>
                <input type="checkbox" data-testid="referral-consent" checked={casl} onChange={(e) => setCasl(e.target.checked)}
                  style={{ marginTop: 4, accentColor: T.ink, width: 16, height: 16 }} />
                <span style={{ fontFamily: SANS, fontSize: "0.86rem", lineHeight: 1.65, color: T.muted }}>
                  Doug (or a licensed local referral REALTOR® on the correct
                  board) may reply by email, phone, or SMS. You can withdraw
                  consent at any time. See{" "}
                  <Link to="/privacy" style={{ color: T.ink, textDecoration: "underline", textDecorationColor: T.hairline, textUnderlineOffset: 3 }}>Privacy (PIPA)</Link>.
                </span>
              </label>

              {/* Send */}
              <div>
                <button
                  type="submit"
                  data-testid="referral-submit"
                  disabled={!canSubmit || status === "submitting"}
                  style={{
                    fontFamily: SANS, fontSize: "0.88rem", letterSpacing: "0.16em",
                    textTransform: "uppercase", fontWeight: 500,
                    color: canSubmit ? T.paper : T.muted,
                    background: canSubmit ? T.ink : "transparent",
                    padding: "16px 32px",
                    border: `1px solid ${canSubmit ? T.ink : T.hairline}`,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    transition: "all 200ms ease",
                    opacity: status === "submitting" ? 0.6 : 1,
                  }}
                >
                  {status === "submitting" ? "Sending…" : "Send referral request"}
                </button>
                {status === "error" && (
                  <div data-testid="referral-error" style={{ marginTop: 16, fontFamily: SANS, fontSize: "0.85rem", color: "#B14E3E" }}>
                    {errorMsg}
                  </div>
                )}
                <p style={{ marginTop: 20, fontFamily: SANS, fontSize: "0.78rem", lineHeight: 1.6, color: T.muted, maxWidth: 620 }}>
                  Submitting this form does not create a REALTOR®–client
                  relationship. Formal representation, and the BCFSA
                  Disclosure of Representation in Trading Services, is
                  explained in writing before any real-estate services begin.
                </p>
              </div>
            </form>
          </section>
        )}

        {/* ─── SUCCESS ─── */}
        {status === "sent" && (
          <section
            data-testid="referral-success"
            style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(56px, 8vw, 80px) 28px 0" }}
          >
            <div style={{ paddingTop: 32, borderTop: `1px solid ${T.hairline}` }}>
              <Eyebrow>Received</Eyebrow>
              <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.75rem, 3vw, 2.35rem)", lineHeight: 1.15, color: T.ink, margin: "0 0 18px", fontWeight: 400 }}>
                Thank you — your request has arrived.
              </h2>
              <p style={{ fontFamily: SANS, fontSize: "1rem", lineHeight: 1.75, color: T.muted, margin: 0, maxWidth: 620 }}>
                Doug will personally review your request and reach out — or
                introduce you to a licensed local REALTOR® on the correct
                BC board — within one business day (Mon–Fri, excluding
                statutory holidays).
              </p>
            </div>
          </section>
        )}

        {/* ─── SECONDARY LINKS ─── */}
        <section style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(96px, 12vw, 128px) 28px 0" }}>
          <div style={{ paddingTop: 32, borderTop: `1px solid ${T.hairline}`, fontFamily: SANS, fontSize: "0.85rem", color: T.muted, letterSpacing: "0.02em", lineHeight: 1.9 }}>
            <Link to="/contact"  style={{ color: T.muted, marginRight: 22 }} data-testid="referral-secondary-contact">In Doug's territory instead? Contact him directly</Link>
          </div>
        </section>

        {/* ─── COMPLIANCE ─── */}
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(80px, 10vw, 112px) 28px 0" }}>
          <div style={{ paddingTop: 32, borderTop: `1px solid ${T.hairline}`, fontFamily: SANS, fontSize: "0.78rem", lineHeight: 1.7, color: T.muted }}>
            EZtoFind.ca provides general educational information about BC
            real estate — not legal, tax, financial, or real estate advice.
            Real estate services are provided by Doug LeMaire, REALTOR®,
            Fraser Property Management Realty Services Ltd. Regulated by
            the BC Financial Services Authority. Consumer Protection Line:{" "}
            <a href="tel:+18776839664" style={{ color: T.ink, textDecoration: "underline", textDecorationColor: T.hairline, textUnderlineOffset: 3 }} data-testid="referral-bcfsa-line">
              1-877-683-9664
            </a>. Referral fees between REALTORS® are disclosed and paid
            REALTOR®-to-REALTOR® — never charged to consumers.
          </div>
        </section>
      </main>
    </>
  );
}
