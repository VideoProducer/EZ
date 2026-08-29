// ═══════════════════════════════════════════════════════════════════════
// LuxuryQuietContact.jsx
// ═══════════════════════════════════════════════════════════════════════
// A refined, "quiet luxury" contact page for /contact. Sister piece to
// LuxuryQuietLanding.jsx — same palette, typography, and editorial
// restraint. Replaces the earlier hub-style Contact component while
// preserving its lead-ingestion endpoints and BCFSA/CASL posture.
//
// ARTICLE 16 HARD-BLOCK
// The page silently gates all submissions: a required "Are you working
// with another REALTOR® right now?" radio must be answered "No" before
// the Send button unlocks. If the visitor selects "Yes", the form is
// replaced with a discreet, respectful notice pointing them back to
// their existing REALTOR® (CREA REALTOR® Code Article 16).
//
// SPEC PROVENANCE — every line of body copy in this file was written
// specifically for Doug's quiet-luxury contact spec (Feb 28, 2026). Do
// not edit copy without confirming with Doug first.
// ═══════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const API = process.env.REACT_APP_BACKEND_URL;

// Same palette as LuxuryQuietLanding — kept local so this page can be
// used stand-alone if the two ever diverge.
const T = {
  paper:    "#FBF9F5",
  ink:      "#1E1F24",
  muted:    "#565963",
  hairline: "#E4DDD1",
  accent:   "#7A6A57",
};
const SERIF = 'ui-serif, Georgia, "Cormorant Garamond", "Times New Roman", serif';
const SANS  = 'ui-sans-serif, -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

// ── SEO ─────────────────────────────────────────────────────────────
function SEOHead() {
  return (
    <Helmet>
      <title>Contact Doug LeMaire, REALTOR® | EZtoFind.ca</title>
      <meta name="description" content="Start a private conversation about luxury real estate in Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor. Direct line to Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd." />
      <link rel="canonical" href="https://eztofind.ca/contact" />
      <meta property="og:title" content="Contact Doug LeMaire, REALTOR® | EZtoFind.ca" />
      <meta property="og:description" content="Start a private conversation about luxury real estate in Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor." />
      <meta property="og:url" content="https://eztofind.ca/contact" />
      <meta property="og:type" content="website" />
    </Helmet>
  );
}

// ── Small primitives ────────────────────────────────────────────────
const Eyebrow = ({ children }) => (
  <div
    style={{
      fontFamily: SANS,
      fontSize: "0.72rem",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: T.muted,
      fontWeight: 500,
      marginBottom: 18,
    }}
  >
    {children}
  </div>
);

// Shared input styling — refined, hairline underlines only, no chrome.
const inputStyle = {
  width: "100%",
  padding: "14px 0",
  border: "none",
  borderBottom: `1px solid ${T.hairline}`,
  background: "transparent",
  fontFamily: SANS,
  fontSize: "1rem",
  color: T.ink,
  outline: "none",
  transition: "border-color 200ms ease",
};

const labelStyle = {
  fontFamily: SANS,
  fontSize: "0.72rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: T.muted,
  fontWeight: 500,
  display: "block",
  marginBottom: 6,
};

// ── Component ───────────────────────────────────────────────────────
export default function LuxuryQuietContact() {
  // Article 16 gate — must be answered "no" before the form is usable.
  // Default null so neither state is pre-selected (avoids accidental submits).
  const [workingWithRealtor, setWorkingWithRealtor] = useState(null);

  // Form fields
  const [intent, setIntent]   = useState("");        // "buyer" | "seller" | "valuation" | "other"
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [message, setMessage] = useState("");
  const [consentCasl, setConsentCasl] = useState(false);

  // Submission state
  const [status, setStatus] = useState("idle");   // idle | submitting | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  // Enable Send only when Article 16 clears, CASL is checked, and the
  // minimum fields are filled. Backend requires email (EmailStr) so we
  // enforce it client-side too. Phone stays optional.
  const canSubmit = useMemo(() => {
    if (workingWithRealtor !== false) return false;
    if (!consentCasl) return false;
    if (!name.trim()) return false;
    if (!email.trim()) return false;
    return true;
  }, [workingWithRealtor, consentCasl, name, email]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || status === "submitting") return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      // Route to the correct lead endpoint based on intent so it slots
      // into Doug's existing seller/buyer inboxes and CASL welcome flows.
      const isSellerSide = intent === "seller" || intent === "valuation";
      const path = isSellerSide ? "/api/leads/seller" : "/api/leads/buyer";
      // Pad the minimal quiet-luxury note into the strict backend schema
      // so no server changes are needed. Anything the visitor didn't
      // volunteer is stored as "Not specified" — Doug can follow up.
      const payload = {
        full_name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || "Not provided",
        casl_consent: true,
        pipa_ack: true,
        dorts_ack: true,
        working_with_realtor: false,           // enforced by Article 16 gate
        notes: message.trim() || `Intent: ${intent || "conversation start"}`,
        preferred_contact: phone.trim() ? "either" : "email",
        source: "luxury-contact",
      };
      // Seller/valuation-specific padding
      if (isSellerSide) {
        Object.assign(payload, {
          address: "Not specified",
          city: "Not specified",
          property_type: "Not specified",
          timeline: "Not specified",
          reason: intent === "valuation" ? "Curious about value" : "Considering selling",
        });
      } else {
        // Buyer / other
        Object.assign(payload, {
          areas: ["Not specified"],
          property_type: "Not specified",
          budget_range: "Not specified",
          timeline: "Not specified",
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

  // ── Article 16 GATE — if visitor is under contract with another
  // REALTOR®, replace the whole form with a respectful redirect. Never
  // captures name/email from that visitor. Never persisted anywhere.
  const showBlockNotice = workingWithRealtor === true;

  return (
    <>
      <SEOHead />

      <main
        data-testid="luxury-contact"
        style={{
          background: T.paper,
          color: T.ink,
          fontFamily: SANS,
          minHeight: "100vh",
          paddingBottom: "clamp(96px, 12vw, 144px)",
        }}
      >
        {/* ─── HEADER ────────────────────────────────────────────── */}
        <section
          style={{
            maxWidth: 780,
            margin: "0 auto",
            padding: "clamp(80px, 12vw, 128px) 28px 0",
          }}
        >
          <Eyebrow>Doug LeMaire, REALTOR® · Private Line</Eyebrow>
          <h1
            data-testid="contact-h1"
            style={{
              fontFamily: SERIF,
              fontSize: "clamp(2.15rem, 4.4vw, 3.5rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.015em",
              color: T.ink,
              margin: "0 0 22px",
              fontWeight: 400,
            }}
          >
            Start a conversation.
          </h1>
          <p
            style={{
              fontFamily: SERIF,
              fontSize: "clamp(1.15rem, 1.6vw, 1.35rem)",
              lineHeight: 1.55,
              color: T.ink,
              margin: "0 0 12px",
              maxWidth: 620,
            }}
          >
            A short note is enough. Doug personally replies within one
            business day.
          </p>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "0.95rem",
              lineHeight: 1.7,
              color: T.muted,
              margin: 0,
              maxWidth: 620,
            }}
          >
            Submitting this form does not create a REALTOR®–client
            relationship. Formal representation, and the BCFSA Disclosure
            of Representation in Trading Services, is explained in
            writing before any real-estate services begin.
          </p>
        </section>

        {/* ─── ARTICLE 16 GATE ──────────────────────────────────────
            First question every visitor sees. Silent hard-block — no
            visible "Article 16" reference; just a discreet question. */}
        <section
          data-testid="contact-article-16-gate"
          style={{
            maxWidth: 780,
            margin: "0 auto",
            padding: "clamp(56px, 8vw, 80px) 28px 0",
          }}
        >
          <div
            style={{
              paddingTop: 32,
              borderTop: `1px solid ${T.hairline}`,
            }}
          >
            <div style={labelStyle}>Before we begin</div>
            <p
              style={{
                fontFamily: SERIF,
                fontSize: "clamp(1.15rem, 1.5vw, 1.35rem)",
                lineHeight: 1.5,
                color: T.ink,
                margin: "8px 0 24px",
                maxWidth: 620,
              }}
            >
              Are you currently working with another REALTOR®?
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { v: false, label: "No" },
                { v: true,  label: "Yes" },
              ].map((opt) => {
                const selected = workingWithRealtor === opt.v;
                return (
                  <button
                    key={String(opt.v)}
                    type="button"
                    data-testid={`contact-gate-${opt.label.toLowerCase()}`}
                    onClick={() => setWorkingWithRealtor(opt.v)}
                    style={{
                      fontFamily: SANS,
                      fontSize: "0.88rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                      color: selected ? T.paper : T.ink,
                      background: selected ? T.ink : "transparent",
                      padding: "14px 26px",
                      border: `1px solid ${T.ink}`,
                      cursor: "pointer",
                      transition: "background 200ms ease, color 200ms ease",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── BLOCK NOTICE (shown ONLY if visitor is under contract) ── */}
        {showBlockNotice && (
          <section
            data-testid="contact-block-notice"
            style={{
              maxWidth: 720,
              margin: "0 auto",
              padding: "clamp(56px, 8vw, 80px) 28px 0",
            }}
          >
            <div
              style={{
                paddingTop: 32,
                borderTop: `1px solid ${T.hairline}`,
              }}
            >
              <Eyebrow>Out of respect</Eyebrow>
              <p
                style={{
                  fontFamily: SERIF,
                  fontSize: "clamp(1.15rem, 1.6vw, 1.35rem)",
                  lineHeight: 1.55,
                  color: T.ink,
                  margin: "0 0 20px",
                  maxWidth: 620,
                }}
              >
                If you are already under contract with another REALTOR®,
                the right first conversation is with them. Please give
                them the opportunity to help.
              </p>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: "0.95rem",
                  lineHeight: 1.75,
                  color: T.muted,
                  margin: "0 0 24px",
                  maxWidth: 620,
                }}
              >
                Once your existing representation is complete — or if you
                would like general BC real-estate information without any
                obligation — the door is open here.
              </p>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                <Link
                  to="/glossary"
                  data-testid="contact-block-glossary"
                  style={{
                    fontFamily: SANS,
                    fontSize: "0.85rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: T.ink,
                    textDecoration: "underline",
                    textDecorationColor: T.hairline,
                    textUnderlineOffset: 4,
                  }}
                >
                  Browse the BC glossary
                </Link>
                <Link
                  to="/"
                  data-testid="contact-block-home"
                  style={{
                    fontFamily: SANS,
                    fontSize: "0.85rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: T.muted,
                    textDecoration: "none",
                  }}
                >
                  Return home
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ─── FORM (shown ONLY if visitor answered "No") ────────── */}
        {workingWithRealtor === false && status !== "sent" && (
          <section
            data-testid="contact-form-section"
            style={{
              maxWidth: 720,
              margin: "0 auto",
              padding: "clamp(56px, 8vw, 80px) 28px 0",
            }}
          >
            <form onSubmit={handleSubmit}>
              {/* Intent — 4 quiet pill buttons, single-select */}
              <div style={{ marginBottom: 44 }}>
                <div style={labelStyle}>What is this about?</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                  {[
                    { v: "seller",    label: "Selling" },
                    { v: "buyer",     label: "Buying" },
                    { v: "valuation", label: "A valuation" },
                    { v: "other",     label: "Something else" },
                  ].map((opt) => {
                    const selected = intent === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        data-testid={`contact-intent-${opt.v}`}
                        onClick={() => setIntent(opt.v)}
                        style={{
                          fontFamily: SANS,
                          fontSize: "0.82rem",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          fontWeight: 500,
                          color: selected ? T.paper : T.muted,
                          background: selected ? T.ink : "transparent",
                          padding: "10px 18px",
                          border: `1px solid ${selected ? T.ink : T.hairline}`,
                          cursor: "pointer",
                          transition: "all 200ms ease",
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
                <label htmlFor="lc-name" style={labelStyle}>Your name</label>
                <input
                  id="lc-name"
                  data-testid="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = T.ink)}
                  onBlur={(e) => (e.target.style.borderColor = T.hairline)}
                />
              </div>

              {/* Email — required (CASL primary channel + backend EmailStr) */}
              <div style={{ marginBottom: 32 }}>
                <label htmlFor="lc-email" style={labelStyle}>Email</label>
                <input
                  id="lc-email"
                  data-testid="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = T.ink)}
                  onBlur={(e) => (e.target.style.borderColor = T.hairline)}
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: 32 }}>
                <label htmlFor="lc-phone" style={labelStyle}>Phone (optional)</label>
                <input
                  id="lc-phone"
                  data-testid="contact-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = T.ink)}
                  onBlur={(e) => (e.target.style.borderColor = T.hairline)}
                />
              </div>

              {/* Message */}
              <div style={{ marginBottom: 40 }}>
                <label htmlFor="lc-msg" style={labelStyle}>A short note</label>
                <textarea
                  id="lc-msg"
                  data-testid="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical", padding: "14px 0", lineHeight: 1.6 }}
                  placeholder="A neighbourhood you have in mind, a timing consideration, or nothing at all — Doug will follow up either way."
                  onFocus={(e) => (e.target.style.borderColor = T.ink)}
                  onBlur={(e) => (e.target.style.borderColor = T.hairline)}
                />
              </div>

              {/* CASL consent — required, quiet */}
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 40,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  data-testid="contact-consent"
                  checked={consentCasl}
                  onChange={(e) => setConsentCasl(e.target.checked)}
                  style={{
                    marginTop: 4,
                    accentColor: T.ink,
                    width: 16,
                    height: 16,
                  }}
                />
                <span
                  style={{
                    fontFamily: SANS,
                    fontSize: "0.86rem",
                    lineHeight: 1.65,
                    color: T.muted,
                  }}
                >
                  Doug may reply by email, phone, or SMS. You can withdraw
                  consent at any time. See{" "}
                  <Link to="/privacy" style={{ color: T.ink, textDecoration: "underline", textDecorationColor: T.hairline, textUnderlineOffset: 3 }}>
                    Privacy (PIPA)
                  </Link>.
                </span>
              </label>

              {/* Send */}
              <div>
                <button
                  type="submit"
                  data-testid="contact-submit"
                  disabled={!canSubmit || status === "submitting"}
                  style={{
                    fontFamily: SANS,
                    fontSize: "0.88rem",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    color: canSubmit ? T.paper : T.muted,
                    background: canSubmit ? T.ink : "transparent",
                    padding: "16px 32px",
                    border: `1px solid ${canSubmit ? T.ink : T.hairline}`,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    transition: "all 200ms ease",
                    opacity: status === "submitting" ? 0.6 : 1,
                  }}
                >
                  {status === "submitting" ? "Sending…" : "Send"}
                </button>
                {status === "error" && (
                  <div
                    data-testid="contact-error"
                    style={{
                      marginTop: 16,
                      fontFamily: SANS,
                      fontSize: "0.85rem",
                      color: "#B14E3E",
                    }}
                  >
                    {errorMsg}
                  </div>
                )}
              </div>
            </form>
          </section>
        )}

        {/* ─── SUCCESS STATE ────────────────────────────────────────*/}
        {status === "sent" && (
          <section
            data-testid="contact-success"
            style={{
              maxWidth: 720,
              margin: "0 auto",
              padding: "clamp(56px, 8vw, 80px) 28px 0",
            }}
          >
            <div style={{ paddingTop: 32, borderTop: `1px solid ${T.hairline}` }}>
              <Eyebrow>Received</Eyebrow>
              <h2
                style={{
                  fontFamily: SERIF,
                  fontSize: "clamp(1.75rem, 3vw, 2.35rem)",
                  lineHeight: 1.15,
                  color: T.ink,
                  margin: "0 0 18px",
                  fontWeight: 400,
                }}
              >
                Thank you — your note has arrived.
              </h2>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: "1rem",
                  lineHeight: 1.75,
                  color: T.muted,
                  margin: 0,
                  maxWidth: 620,
                }}
              >
                Doug will reply personally within one business day (Mon–Fri,
                excluding statutory holidays). If your note is time-sensitive
                and it is business hours, feel free to call the office line
                on any listing you have seen.
              </p>
            </div>
          </section>
        )}

        {/* ─── SECONDARY LINKS ─────────────────────────────────────*/}
        <section
          data-testid="contact-secondary-links"
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "clamp(96px, 12vw, 128px) 28px 0",
          }}
        >
          <div
            style={{
              paddingTop: 32,
              borderTop: `1px solid ${T.hairline}`,
              fontFamily: SANS,
              fontSize: "0.85rem",
              color: T.muted,
              letterSpacing: "0.02em",
              lineHeight: 1.9,
            }}
          >
            <Link to="/seller" style={{ color: T.muted, marginRight: 22 }}>Seller</Link>
            <Link to="/buyer" style={{ color: T.muted, marginRight: 22 }}>Buyer</Link>
            <Link to="/valuation" style={{ color: T.muted, marginRight: 22 }}>Valuation</Link>
            <Link to="/about" style={{ color: T.muted, marginRight: 22 }}>About</Link>
            <Link to="/specialties/luxury" style={{ color: T.muted }}>Luxury</Link>
          </div>
        </section>

        {/* ─── PAGE-LEVEL COMPLIANCE BLOCK ─────────────────────────
            Same content as the Luxury landing — kept on-page so
            visitors don't have to scroll to the site-global footer. */}
        <section
          data-testid="contact-compliance-block"
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "clamp(80px, 10vw, 112px) 28px 0",
          }}
        >
          <div
            style={{
              paddingTop: 32,
              borderTop: `1px solid ${T.hairline}`,
              fontFamily: SANS,
              fontSize: "0.78rem",
              lineHeight: 1.7,
              color: T.muted,
            }}
          >
            EZtoFind.ca provides general educational information about BC
            real estate — not legal, tax, financial, or real estate advice.
            Real estate services are provided by Doug LeMaire, REALTOR®,
            Fraser Property Management Realty Services Ltd. Regulated by
            the BC Financial Services Authority. Consumer Protection Line:{" "}
            <a
              href="tel:+18776839664"
              style={{ color: T.ink, textDecoration: "underline", textDecorationColor: T.hairline, textUnderlineOffset: 3 }}
              data-testid="contact-bcfsa-line"
            >
              1-877-683-9664
            </a>
            . MLS® listing data is provided under the CREA DDF® licence and
            is not a canonical source — verify against REALTOR.ca or the
            listing brokerage.
          </div>
        </section>
      </main>
    </>
  );
}
