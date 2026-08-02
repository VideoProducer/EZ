// EZtoFind.ca — Public Buyer's & Seller's Guide (BC 2026 edition)
// -----------------------------------------------------------------------------
// Approved public educational content authored by Doug LeMaire, REALTOR® with
// Fraser Property Management Realty Services Ltd. Content is a faithful
// adaptation of the printed 2026 Buyer's Guide and 2026 Seller's Guide PDFs.
//
// Compliance framing:
//   - BCFSA: full brokerage identification (name + Doug LeMaire, REALTOR®),
//     general-information disclaimer at top + bottom, no "you should" or
//     guarantees, licensee's own service voice (first-person "I/we") preserved
//     because Doug (the licensee) authored and approved this content himself.
//   - CREA: REALTOR®, REALTORS®, MLS® trademarks preserved everywhere.
//   - GVR: no MLS® data reproduced, no listing-source claims made.
//   - CASL: no marketing-consent bundling — the "Ask a question" CTAs route
//     to the standard /contact form which separates the required and optional
//     consent boxes.
//   - PIPA: no personal information collected on this page; no sensitive form
//     inputs; browser storage is not used here.
//   - FINTRAC: identity-verification requirement referenced accurately.
//
// AEO/SEO: full HowTo schema for the 9 steps + FAQPage schema for the key
// terms sections, feeding LLM answer engines with an approved, cited source.
//
// Anti-duplication: the Guide DOES NOT redefine glossary terms. Every term is
// linked in-line to /glossary/<slug> so the 439-term master library remains
// the single source of truth.

import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://eztofind.ca";

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const BRAND = {
  navy: "#0F2A5B",
  blue: "#2563EB",
  green: "#178A3E",
  amber: "#FDB813",
  cream: "#F5F0E1",
  muted: "#5B6577",
};

// A discreet inline link that leans on the site's brand blue.
const GlossaryLink = ({ slug, children }) => (
  <Link to={`/glossary/${slug}`} style={{ color: BRAND.blue, fontWeight: 600, textDecoration: "underline dotted", textUnderlineOffset: 2 }}>
    {children}
  </Link>
);

// ---------------------------------------------------------------------------
// Brokerage identification block (BCFSA requirement — top + bottom of guide)
// ---------------------------------------------------------------------------
const BrokerageIdent = ({ compact = false }) => (
  <div data-testid="guide-brokerage-ident" style={{
    fontFamily: "Inter,sans-serif",
    fontSize: compact ? "0.78rem" : "0.85rem",
    lineHeight: 1.55,
    color: BRAND.muted,
    textAlign: "center",
    padding: compact ? "0.5rem 1rem" : "1rem 1.25rem",
    background: compact ? "transparent" : "#FBFAF6",
    borderRadius: 8,
    border: compact ? "none" : "1px solid rgba(15,42,91,0.08)",
  }}>
    Prepared by <strong style={{ color: BRAND.navy }}>Doug LeMaire, REALTOR®</strong>
    &nbsp;·&nbsp; Fraser Property Management Realty Services Ltd.
    &nbsp;·&nbsp; Serving Greater Vancouver · the Fraser Valley · Sea-to-Sky to Whistler
    &nbsp;·&nbsp; <a href="tel:+16047870851" style={{ color: BRAND.blue, fontWeight: 600 }}>(604) 787-0851</a>
  </div>
);

// ---------------------------------------------------------------------------
// General-information disclaimer (BCFSA-safe)
// ---------------------------------------------------------------------------
const GeneralDisclaimer = ({ kind = "buyer" }) => (
  <div data-testid={`guide-disclaimer-${kind}`} className="notice" style={{
    background: "#FFF8E1",
    border: "1px solid rgba(253,184,19,0.35)",
    padding: "0.9rem 1.15rem",
    borderRadius: 8,
    fontFamily: "Inter,sans-serif",
    fontSize: "0.86rem",
    lineHeight: 1.6,
    color: BRAND.navy,
    marginBottom: "1.5rem",
  }}>
    <strong>General information only.</strong> This guide is general educational
    information for BC home {kind === "buyer" ? "buyers" : "sellers"} in 2026 — not legal, tax, financial, or mortgage advice.
    Tax rates, exemption thresholds, and standard forms change over time. Your REALTOR®, lender,
    accountant, and notary or lawyer confirm the exact figures and documents for your specific transaction.
  </div>
);

// ---------------------------------------------------------------------------
// Reusable step card (used by both guides)
// ---------------------------------------------------------------------------
const StepCard = ({ number, of, title, tagline, steps, note, testId }) => (
  <div className="paper" data-testid={testId} style={{
    padding: "1.5rem",
    marginBottom: "1.25rem",
    scrollMarginTop: "5rem",
  }} id={`step-${number}`}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "0.85rem" }}>
      <div style={{
        flex: "0 0 3.5rem",
        width: "3.5rem",
        height: "3.5rem",
        borderRadius: "50%",
        background: BRAND.navy,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif',
        fontSize: "1.15rem",
        fontWeight: 800,
      }}>
        {number}<span style={{ fontSize: "0.7rem", opacity: 0.7 }}>/{of}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          margin: 0,
          fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif',
          fontSize: "1.35rem",
          color: BRAND.navy,
          lineHeight: 1.2,
        }}>{title}</h3>
        {tagline && (
          <div style={{ color: BRAND.muted, fontFamily: "Inter,sans-serif", fontSize: "0.92rem", marginTop: "0.35rem" }}>
            {tagline}
          </div>
        )}
      </div>
    </div>
    {steps && steps.length > 0 && (
      <ul style={{
        listStyle: "none",
        padding: 0,
        margin: "0.5rem 0 0",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}>
        {steps.map((s, i) => (
          <li key={i} style={{
            display: "flex",
            gap: "0.65rem",
            alignItems: "flex-start",
            fontFamily: "Inter,sans-serif",
            fontSize: "0.94rem",
            lineHeight: 1.55,
            color: "#1F2937",
          }}>
            <span aria-hidden style={{
              flex: "0 0 auto",
              width: "1.15rem",
              height: "1.15rem",
              borderRadius: 3,
              border: `2px solid ${BRAND.navy}`,
              marginTop: "0.15rem",
              background: "white",
            }}/>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    )}
    {note && (
      <div style={{
        marginTop: "1rem",
        padding: "0.85rem 1rem",
        background: "#F0F4FB",
        borderLeft: `4px solid ${BRAND.blue}`,
        borderRadius: 6,
        fontFamily: "Inter,sans-serif",
        fontSize: "0.88rem",
        lineHeight: 1.6,
        color: "#1F2937",
      }}>
        <strong style={{ color: BRAND.navy }}>Good to know.</strong> {note}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Cost row helper
// ---------------------------------------------------------------------------
const CostRow = ({ label, what, guide, testId }) => (
  <tr data-testid={testId}>
    <td style={{ padding: "0.85rem 0.85rem", borderBottom: "1px solid rgba(15,42,91,0.08)", verticalAlign: "top" }}>
      <div style={{ fontWeight: 700, color: BRAND.navy, fontFamily: "Inter,sans-serif", fontSize: "0.95rem" }}>{label}</div>
    </td>
    <td style={{ padding: "0.85rem 0.85rem", borderBottom: "1px solid rgba(15,42,91,0.08)", verticalAlign: "top", color: "#1F2937", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", lineHeight: 1.55 }}>
      {what}
    </td>
    <td style={{ padding: "0.85rem 0.85rem", borderBottom: "1px solid rgba(15,42,91,0.08)", verticalAlign: "top", color: BRAND.muted, fontFamily: "Inter,sans-serif", fontSize: "0.88rem", lineHeight: 1.55, fontStyle: "italic" }}>
      {guide}
    </td>
  </tr>
);

// ---------------------------------------------------------------------------
// Key-terms row helper
// ---------------------------------------------------------------------------
const TermRow = ({ label, body, testId }) => (
  <div data-testid={testId} style={{
    padding: "1rem 0",
    borderBottom: "1px solid rgba(15,42,91,0.08)",
    fontFamily: "Inter,sans-serif",
  }}>
    <div style={{ fontWeight: 700, color: BRAND.navy, marginBottom: "0.35rem", fontSize: "1rem" }}>{label}</div>
    <div style={{ color: "#1F2937", fontSize: "0.93rem", lineHeight: 1.65 }}>{body}</div>
  </div>
);

// ---------------------------------------------------------------------------
// "You may also be looking for" — a starter version wired to related content.
// This is Phase A's minimum viable component; Phase B will formalize it via a
// content_relations collection + admin editor.
// ---------------------------------------------------------------------------
const RelatedResources = ({ items }) => (
  <div className="paper" data-testid="guide-related-resources" style={{ padding: "1.5rem", marginTop: "2rem" }}>
    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", color: BRAND.blue, fontWeight: 800, marginBottom: "0.75rem" }}>
      You may also be looking for
    </div>
    <h3 style={{ margin: "0 0 1rem", fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy }}>
      Related resources on EZtoFind.ca
    </h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))", gap: "0.85rem" }}>
      {items.map((it, i) => (
        <Link key={i} to={it.href} data-testid={`related-${i}`} style={{
          padding: "1rem",
          border: "1px solid rgba(15,42,91,0.12)",
          borderRadius: 8,
          background: "#FBFAF6",
          textDecoration: "none",
          color: "inherit",
          display: "block",
          transition: "all 0.15s ease",
        }} onMouseEnter={e => { e.currentTarget.style.borderColor = BRAND.blue; e.currentTarget.style.background = "#F0F4FB"; }}
           onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(15,42,91,0.12)"; e.currentTarget.style.background = "#FBFAF6"; }}>
          <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: BRAND.blue, fontWeight: 700, marginBottom: "0.35rem" }}>{it.kind}</div>
          <div style={{ fontWeight: 700, color: BRAND.navy, fontFamily: "Inter,sans-serif", fontSize: "0.95rem", marginBottom: "0.35rem" }}>{it.title}</div>
          <div style={{ color: BRAND.muted, fontFamily: "Inter,sans-serif", fontSize: "0.85rem", lineHeight: 1.5 }}>{it.blurb}</div>
        </Link>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Guide hero
// ---------------------------------------------------------------------------
const GuideHero = ({ eyebrow, title, tagline, kind }) => (
  <div style={{
    background: `linear-gradient(135deg, ${BRAND.navy} 0%, #1e3a8a 100%)`,
    color: "white",
    padding: "3rem 1.5rem 2.5rem",
    borderRadius: 12,
    marginBottom: "1.5rem",
  }} data-testid={`guide-hero-${kind}`}>
    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.16em", color: BRAND.amber, fontWeight: 800, marginBottom: "0.85rem" }}>{eyebrow}</div>
    <h1 style={{
      margin: 0,
      fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif',
      fontSize: "clamp(2rem, 4vw, 3rem)",
      lineHeight: 1.1,
      marginBottom: "1rem",
    }}>{title}</h1>
    <p style={{
      margin: 0,
      color: BRAND.cream,
      fontFamily: "Inter,sans-serif",
      fontSize: "1.05rem",
      lineHeight: 1.6,
      maxWidth: "42rem",
    }}>{tagline}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Guide footer CTA (neutral, no marketing bundling)
// ---------------------------------------------------------------------------
const GuideFooterCTA = ({ kind }) => (
  <div className="paper" data-testid={`guide-footer-cta-${kind}`} style={{
    padding: "1.75rem 1.5rem",
    marginTop: "2rem",
    background: BRAND.navy,
    color: "white",
    textAlign: "center",
  }}>
    <h3 style={{
      margin: "0 0 0.5rem",
      fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif',
      fontSize: "1.5rem",
    }}>Questions about any step?</h3>
    <p style={{
      margin: "0 0 1.25rem",
      fontFamily: "Inter,sans-serif",
      fontSize: "0.95rem",
      color: BRAND.cream,
      lineHeight: 1.6,
      maxWidth: "36rem",
      marginLeft: "auto",
      marginRight: "auto",
    }}>
      Reach out with any general question about the process — no obligation.
      A conversation about how buying or selling works is exactly what this guide is here for.
    </p>
    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
      <Link to="/contact" data-testid={`guide-cta-contact-${kind}`} className="btn btn-primary" style={{
        background: BRAND.amber, color: BRAND.navy, border: "none",
      }}>Ask a general question</Link>
      <Link to="/glossary" data-testid={`guide-cta-glossary-${kind}`} className="btn btn-ghost" style={{
        background: "transparent", border: "2px solid white", color: "white",
      }}>Browse the glossary</Link>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// AT A GLANCE strip — 9-step overview table
// ---------------------------------------------------------------------------
const AtAGlance = ({ rows, testId }) => (
  <div className="paper" data-testid={testId} style={{ padding: "1.25rem", marginBottom: "1.5rem", overflowX: "auto" }}>
    <h2 style={{ margin: "0 0 0.85rem", fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy, fontSize: "1.35rem" }}>
      Your journey at a glance
    </h2>
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter,sans-serif", fontSize: "0.9rem" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "0.5rem", color: BRAND.muted, fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `2px solid ${BRAND.navy}` }}>Step</th>
          <th style={{ textAlign: "left", padding: "0.5rem", color: BRAND.muted, fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `2px solid ${BRAND.navy}` }}>What happens</th>
          <th style={{ textAlign: "left", padding: "0.5rem", color: BRAND.muted, fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `2px solid ${BRAND.navy}` }}>Who leads</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={{ padding: "0.6rem 0.5rem", borderBottom: "1px solid rgba(15,42,91,0.08)", fontWeight: 700, color: BRAND.navy, whiteSpace: "nowrap" }}>
              <a href={`#step-${i + 1}`} style={{ color: BRAND.navy, textDecoration: "none" }}>{i + 1}. {r.name}</a>
            </td>
            <td style={{ padding: "0.6rem 0.5rem", borderBottom: "1px solid rgba(15,42,91,0.08)", color: "#1F2937" }}>{r.what}</td>
            <td style={{ padding: "0.6rem 0.5rem", borderBottom: "1px solid rgba(15,42,91,0.08)", color: BRAND.muted, fontStyle: "italic" }}>{r.who}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ===========================================================================
// BUYER'S GUIDE DATA (from Buyers_Guide_BC_2026.pdf)
// ===========================================================================

const BUYER_GLANCE = [
  { name: "Getting Started", what: "We connect and confirm your goals.", who: "You & me" },
  { name: "Making It Official", what: "We put your representation in place.", who: "Me" },
  { name: "Money & Must-Haves", what: "You get pre-approved; we set your criteria.", who: "You & your lender" },
  { name: "The Search", what: "I send matches; we tour homes.", who: "Me, with you" },
  { name: "Making an Offer", what: "We prepare and submit your offer.", who: "Me, with you" },
  { name: "Negotiation & Acceptance", what: "We negotiate and reach acceptance.", who: "Me" },
  { name: "Removing Subjects", what: "Inspection, financing, document review.", who: "You & me" },
  { name: "Closing & Moving In", what: "Your notary closes; you take possession.", who: "Your notary / lawyer" },
  { name: "After You Move In", what: "I hand over your file and stay in touch.", who: "Me" },
];

const BUYER_STEPS = [
  {
    title: "Getting Started",
    tagline: "We connect and confirm your goals.",
    steps: [
      <>Reach out and tell me roughly what you are looking for and when.</>,
      <>Think about your ideal timeline, your budget range, and your preferred neighbourhoods — explore <Link to="/communities" style={{ color: BRAND.blue, fontWeight: 600 }}>BC community profiles</Link> for context.</>,
      <>Book a buyer consultation — in person, by phone, or by video.</>,
    ],
    note: <>My service area covers Greater Vancouver, the Fraser Valley, and Sea-to-Sky to Whistler. If your search is outside that area, I connect you with a trusted REALTOR® through a proper <Link to="/realtor-network" style={{ color: BRAND.blue, fontWeight: 600 }}>referral</Link>.</>,
  },
  {
    title: "Making It Official",
    tagline: "We put your representation in place.",
    steps: [
      <>Review and sign the <GlossaryLink slug="working-with-a-realtor-form">representation disclosure</GlossaryLink>.</>,
      <>Sign a <GlossaryLink slug="working-with-a-realtor-form">written buyer's agreement</GlossaryLink>.</>,
      <>Bring a piece of government-issued photo identification.</>,
    ],
    note: <>Verifying identity is a federal <em>FINTRAC</em> requirement. The representation disclosure is there to protect you — it spells out the duties I owe you (loyalty, confidentiality, and acting in your best interests).</>,
  },
  {
    title: "Money & Must-Haves",
    tagline: "You get pre-approved; we set your criteria.",
    steps: [
      <>Speak with a mortgage broker or your lender and get a <GlossaryLink slug="mortgage-pre-approval">pre-approval</GlossaryLink>.</>,
      <>Confirm your comfortable budget ceiling — including the closing costs covered later in this guide.</>,
      <>Finalize your must-haves and deal-breakers.</>,
      <>If you are a first-time buyer, ask about the <GlossaryLink slug="first-home-savings-account-fhsa">FHSA</GlossaryLink> and the <GlossaryLink slug="home-buyers-plan-hbp">Home Buyers' Plan</GlossaryLink>.</>,
    ],
    note: <>A pre-approval is an estimate — not a final approval. Financing is a subject in Step 7.</>,
  },
  {
    title: "The Search",
    tagline: "I send matches; we tour homes.",
    steps: [
      <>Review the <Link to="/listings" style={{ color: BRAND.blue, fontWeight: 600 }}>listings I send</Link> and tell me which ones interest you.</>,
      <>Attend showings with me and picture yourself living there.</>,
      <>Give me candid feedback after each viewing.</>,
      <>In a fast-moving market, be ready to act quickly.</>,
    ],
    note: <>If I become aware of a <GlossaryLink slug="material-latent-defect">material latent defect</GlossaryLink> — a significant hidden problem with a property — I am obliged to tell you, regardless of which side I represent.</>,
  },
  {
    title: "Making an Offer",
    tagline: "We prepare and submit your offer.",
    steps: [
      <>Review the <GlossaryLink slug="comparative-market-analysis-cma">comparable-sales analysis</GlossaryLink>.</>,
      <>Decide, with my guidance, on your price, <GlossaryLink slug="deposit">deposit</GlossaryLink>, <GlossaryLink slug="subject-clauses">subjects</GlossaryLink>, and dates.</>,
      <>Read the offer through — I will explain every clause — then sign when you are comfortable.</>,
    ],
    note: <>Most offers include subjects (conditions) — a protected window for you to do your due diligence before the deal becomes firm.</>,
  },
  {
    title: "Negotiation & Acceptance",
    tagline: "We negotiate and reach acceptance.",
    steps: [
      <>Respond promptly when a <GlossaryLink slug="counter-offer">counter-offer</GlossaryLink> comes back — speed matters in negotiation.</>,
      <>Once accepted, arrange your deposit by the deadline in the contract.</>,
      <>Note your key upcoming dates.</>,
    ],
    note: <><strong>Two things start now.</strong> First, your deposit is held in the brokerage's <GlossaryLink slug="escrow">trust account</GlossaryLink> — a regulated account, separate from anyone's personal funds — and is applied toward your purchase at completion. Second, BC's three-business-day <GlossaryLink slug="home-buyer-rescission-period-hbrp">rescission window</GlossaryLink> begins the day after acceptance.</>,
  },
  {
    title: "Removing Subjects",
    tagline: "Inspection, financing, document review.",
    steps: [
      <>Attend the <GlossaryLink slug="home-inspection">home inspection</GlossaryLink> and review the report with the inspector.</>,
      <>Send the property details to your lender and obtain final financing approval.</>,
      <>Review any strata documents — minutes, financials, the <GlossaryLink slug="depreciation-report">depreciation report</GlossaryLink>, the electrical planning report, and the <GlossaryLink slug="form-b">Form B</GlossaryLink>.</>,
      <>Once you are satisfied, confirm with me in writing and we remove the subjects.</>,
    ],
    note: <>Removing subjects is a firm commitment of funds — it ends your rescission right and makes the sale binding. Never remove subjects until you are genuinely satisfied with the results of your due diligence.</>,
  },
  {
    title: "Closing & Moving In",
    tagline: "Your notary closes; you take possession.",
    steps: [
      <>Choose a <GlossaryLink slug="lawyer-or-notary">notary or lawyer</GlossaryLink> (I can recommend several) and get them the contract.</>,
      <>Arrange the balance of your <GlossaryLink slug="down-payment-requirements">down payment</GlossaryLink> and your closing costs for the <GlossaryLink slug="completion-date">completion date</GlossaryLink>.</>,
      <>Sign your closing documents with your notary or lawyer, usually a few days before completion.</>,
      <>Set up home insurance and arrange your utilities and moving.</>,
      <>Do a final walkthrough of the property before <GlossaryLink slug="possession-date">possession</GlossaryLink>.</>,
    ],
    note: <>Budget for <GlossaryLink slug="property-transfer-tax-ptt">Property Transfer Tax</GlossaryLink> and legal fees as closing costs — exemptions may apply for <GlossaryLink slug="first-time-home-buyers-program-ptt">first-time buyers</GlossaryLink> and newly built homes.</>,
  },
  {
    title: "After You Move In",
    tagline: "I hand over your file and stay in touch.",
    steps: [
      <>Keep your closing documents somewhere safe.</>,
      <>Reach out any time with questions about your home, the market, or your next move.</>,
      <>Tell me if you would like to stay in touch with periodic market updates.</>,
    ],
    note: <>My service does not end at possession — for referrals, advice years from now, or your next move, I am here for the long term.</>,
  },
];

const BUYER_COSTS = [
  { label: "Deposit", what: <>Paid soon after your offer is accepted; held in trust and applied to your purchase. <GlossaryLink slug="deposit">More on deposits →</GlossaryLink></>, guide: "Often around 5% of the price." },
  { label: "Down payment", what: <>Your equity in the home, paid at completion (the deposit counts toward it). <GlossaryLink slug="down-payment-requirements">More on down payments →</GlossaryLink></>, guide: "5%+, depending on price and mortgage." },
  { label: "Property Transfer Tax", what: <>A one-time provincial tax paid at completion. <GlossaryLink slug="property-transfer-tax-ptt">See BC's tiered rates →</GlossaryLink></>, guide: "1% on the first $200,000, 2% to $2M, 3% above $2M, plus 2% on any amount over $3M — about $18,000 on a $1M home." },
  { label: "First-time / new-build relief", what: <>Exemptions that can reduce or erase the transfer tax. <GlossaryLink slug="first-time-home-buyers-program-ptt">First-time exemption</GlossaryLink> · <GlossaryLink slug="property-transfer-tax-ptt">New-build exemption</GlossaryLink></>, guide: "Full first-time exemption up to $835,000; full new-build exemption up to $1,100,000, if you qualify." },
  { label: "Home inspection", what: <>Your independent check on the property's condition. <GlossaryLink slug="home-inspection">More →</GlossaryLink></>, guide: "Roughly $500 to $1,000." },
  { label: "Legal / notary fees", what: <>Your <GlossaryLink slug="lawyer-or-notary">notary or lawyer's</GlossaryLink> fee to close the purchase.</>, guide: "Roughly $1,000 to $1,800 plus disbursements." },
  { label: "GST (new homes only)", what: <>Federal tax on newly built homes; rebates may apply. <GlossaryLink slug="gst-new-homes">More →</GlossaryLink></>, guide: "5%, with possible rebates — your notary confirms." },
  { label: "Moving & set-up", what: <>Movers, insurance, utility hook-ups.</>, guide: "Varies." },
];

const BUYER_TERMS = [
  { label: "Your representation", body: <>Before I provide services to you, you receive a representation disclosure explaining our relationship and the duties I owe you — loyalty, confidentiality, and acting in your best interests. <GlossaryLink slug="working-with-a-realtor-form">More on representation →</GlossaryLink></> },
  { label: "Your deposit is protected", body: <>Your deposit is held in the brokerage's <GlossaryLink slug="escrow">trust account</GlossaryLink> — a regulated account, separate from anyone's personal funds — and is applied toward your purchase at completion.</> },
  { label: "The three-day rescission period (cooling-off)", body: <>BC gives buyers a mandatory <GlossaryLink slug="home-buyer-rescission-period-hbrp">three-business-day window</GlossaryLink> after acceptance to cancel a resale purchase for any reason. If you cancel, a fee of 0.25% of the price applies (about $2,500 on a $1,000,000 home). This right does not apply to brand-new homes bought from a developer, auction sales, or court-ordered sales — and it is not a substitute for subjects.</> },
  { label: "The seller's disclosure", body: <>Sellers may provide a <GlossaryLink slug="property-disclosure-statement">Property Disclosure Statement</GlossaryLink> — a written account of what they know about the home's condition and history. It is helpful information, but you continue to rely on your <GlossaryLink slug="home-inspection">inspection</GlossaryLink> and professional advice.</> },
];

const BUYER_TERMS_QUICK = [
  { label: "Subjects / conditions", body: <>Things that must be satisfied before the deal is firm. <GlossaryLink slug="subject-clauses">More →</GlossaryLink></> },
  { label: "Subject removal", body: <>Signing off that your conditions are met; the sale becomes firm and binding. <GlossaryLink slug="subject-removal">More →</GlossaryLink></> },
  { label: "Completion date", body: <>The day ownership legally transfers and the money changes hands. <GlossaryLink slug="completion-date">More →</GlossaryLink></> },
  { label: "Possession date", body: <>The day you get the keys — usually a day or two after completion. <GlossaryLink slug="possession-date">More →</GlossaryLink></> },
  { label: "Strata documents", body: <>For condos and townhouses: minutes, financials, the <GlossaryLink slug="depreciation-report">depreciation report</GlossaryLink>, the electrical planning report, insurance, bylaws and rules, parking and storage plans, and the <GlossaryLink slug="form-b">Form B</GlossaryLink>.</> },
  { label: "Pre-approval", body: <>Your lender's early estimate of what you can borrow — confirmed for real once you have a property under contract. <GlossaryLink slug="mortgage-pre-approval">More →</GlossaryLink></> },
];

const BUYER_RELATED = [
  { kind: "Journey", title: "Selling a home in BC", blurb: "The nine-step seller's guide — the flip side of this journey.", href: "/selling-guide" },
  { kind: "Tool", title: "Live MLS® listings", blurb: "Browse BC listings from the CREA DDF® feed, refreshed hourly.", href: "/listings" },
  { kind: "Community", title: "BC community profiles", blurb: "Explore 239 community pages across the province.", href: "/communities" },
  { kind: "Glossary", title: "Full BC glossary", blurb: "439 terms explaining every concept in this guide and more.", href: "/glossary" },
  { kind: "Estimator", title: "Home valuation estimator", blurb: "General educational estimate using MLS® comparables. Not an appraisal.", href: "/valuation" },
  { kind: "Compliance", title: "How I'm regulated", blurb: "BCFSA scope-of-licence, CREA REALTOR® Code, and how consumer protections work.", href: "/compliance" },
];

// ===========================================================================
// SELLER'S GUIDE DATA (from Sellers_Guide_BC_2026.pdf)
// ===========================================================================

const SELLER_GLANCE = [
  { name: "Getting Started", what: "We connect and confirm your goals.", who: "You & me" },
  { name: "Listing Appointment", what: "We put your representation in place.", who: "Me" },
  { name: "Pricing & Prep", what: "We set the price and ready the home.", who: "You & me" },
  { name: "Going to Market", what: "Photos, MLS®, and marketing go live.", who: "Me" },
  { name: "Showings & Feedback", what: "Buyers tour; we track the response.", who: "Me, with you" },
  { name: "Offers & Negotiation", what: "We review offers and negotiate.", who: "Me, with you" },
  { name: "Acceptance & Subjects", what: "Deposit in trust; buyer does diligence.", who: "Me & the buyer" },
  { name: "Closing & Possession", what: "Your notary closes; you hand over keys.", who: "Your notary / lawyer" },
  { name: "After the Sale", what: "I hand over your file and stay in touch.", who: "Me" },
];

const SELLER_STEPS = [
  {
    title: "Getting Started",
    tagline: "We connect and confirm your goals.",
    steps: [
      <>Reach out and tell me about your home and your timeline.</>,
      <>Think about your goals — the move-out date you want, and where you are headed next.</>,
      <>Book a listing appointment so I can see the home and prepare a <GlossaryLink slug="comparative-market-analysis-cma">pricing analysis</GlossaryLink>.</>,
    ],
    note: <>If you are also buying, we coordinate the two transactions so your sale and purchase line up. If your home is outside my service area, I connect you with a trusted REALTOR® through a proper <Link to="/realtor-network" style={{ color: BRAND.blue, fontWeight: 600 }}>referral</Link>.</>,
  },
  {
    title: "The Listing Appointment",
    tagline: "We put your representation in place.",
    steps: [
      <>Walk me through the home and point out recent upgrades and anything I should know.</>,
      <>Review and sign the <GlossaryLink slug="working-with-a-realtor-form">representation disclosure</GlossaryLink> — it sets out my duties to you as your REALTOR®.</>,
      <>Review and sign the <GlossaryLink slug="listing-agreement">listing agreement</GlossaryLink>, which sets the price, the term, the commission, and the marketing plan.</>,
      <>Have a piece of government-issued photo identification ready.</>,
    ],
    note: <>Your commission is negotiated between you and the brokerage and set out in the listing agreement — there is no fixed rate. Verifying your identity is a federal <em>FINTRAC</em> requirement that applies to every seller in Canada.</>,
  },
  {
    title: "Pricing & Preparing the Home",
    tagline: "We set the price and ready the home.",
    steps: [
      <>Review the pricing analysis with me and agree on a listing price and strategy.</>,
      <>Complete the <GlossaryLink slug="property-disclosure-statement">Property Disclosure Statement</GlossaryLink> honestly and to the best of your knowledge.</>,
      <>Work through the prep list — repairs, decluttering, cleaning, and any <GlossaryLink slug="home-staging">staging</GlossaryLink>.</>,
      <>Confirm the go-live date so photography and marketing can be scheduled.</>,
    ],
    note: <>Price is the single biggest lever in a sale. Homes priced right from the start tend to sell faster and for more than those that start high and chase the market down. I give you my honest read, even when it differs from what you were hoping to hear.</>,
  },
  {
    title: "Going to Market",
    tagline: "Photos, MLS®, and marketing go live.",
    steps: [
      <>Approve the photos and listing description before they go live.</>,
      <>Keep the home show-ready and decide on the showing process that suits you.</>,
      <>Review your live listing links once I send them.</>,
      <>Let me know your availability and any blackout times for showings.</>,
    ],
    note: <>All marketing must be accurate and follow REALTOR® advertising rules — so the listing presents your home honestly and well, without overstating anything that could cause problems later.</>,
  },
  {
    title: "Showings & Feedback",
    tagline: "Buyers tour; we track the response.",
    steps: [
      <>Keep the home tidy and accessible for showings.</>,
      <>Make yourself scarce during showings — buyers picture themselves in the home more easily when sellers are out.</>,
      <>Read the feedback I send and stay in touch on how it is going.</>,
      <>Be open to adjusting price or strategy if the market response calls for it.</>,
    ],
    note: <>You hear from me even in a quiet week. "No new showings, here is what I am doing about it" is still an update — you should never have to chase me to know where things stand.</>,
  },
  {
    title: "Offers & Negotiation",
    tagline: "We review offers and negotiate.",
    steps: [
      <>Review each offer with me, in full — not just the price.</>,
      <>Decide whether to accept, <GlossaryLink slug="counter-offer">counter</GlossaryLink>, or wait, with my recommendation in hand.</>,
      <>Respond promptly so momentum is not lost.</>,
      <>Confirm your instructions to me in writing.</>,
    ],
    note: <>The highest number is not always the best offer. Conditions, deposit size, dates, and the buyer's financing strength all affect how likely an offer is to close. I help you weigh the whole picture, not just the top line.</>,
  },
  {
    title: "Acceptance & Subject Removal",
    tagline: "Deposit in trust; buyer does diligence.",
    steps: [
      <>Provide access for the buyer's inspection and appraisal as needed.</>,
      <>Supply any documents the buyer reasonably requests, such as <GlossaryLink slug="form-b">strata documents</GlossaryLink> or permits.</>,
      <>Watch for the <GlossaryLink slug="subject-removal">subject-removal date</GlossaryLink>, which I confirm with you in writing the moment it happens.</>,
      <>Once subjects are removed, begin planning your move.</>,
    ],
    note: <><strong>The three-day rescission window.</strong> In BC, your accepted offer is not fully firm for the first three business days. The buyer can cancel for any reason in that window; if they do, you receive a fee of 0.25% of the price and we relist. Showings often pause during this window.</>,
  },
  {
    title: "Closing & Possession",
    tagline: "Your notary closes; you hand over keys.",
    steps: [
      <>Choose a <GlossaryLink slug="lawyer-or-notary">notary or lawyer</GlossaryLink> (I can recommend several) and get them the contract.</>,
      <>Ask your lender about your <GlossaryLink slug="mortgage-discharge">mortgage payout</GlossaryLink> and any <GlossaryLink slug="prepayment-penalty">prepayment penalty</GlossaryLink>.</>,
      <>Sign your closing documents with your notary or lawyer ahead of completion.</>,
      <>Cancel or transfer utilities and insurance for after possession.</>,
      <>Move out and leave the home clean and empty by possession, with all keys and remotes.</>,
    ],
    note: <>Sellers do not pay <GlossaryLink slug="property-transfer-tax-ptt">Property Transfer Tax</GlossaryLink> — that is the buyer's cost. Your main costs are commission and legal fees, both paid from your sale proceeds at completion. See "What it costs to sell" below.</>,
  },
  {
    title: "After the Sale",
    tagline: "I hand over your file and stay in touch.",
    steps: [
      <>Keep your closing documents somewhere safe — you will want them at tax time.</>,
      <>Confirm your mailing address is updated for any final documents.</>,
      <>Reach out any time with questions about your move or your next step.</>,
    ],
    note: <>My service does not end at completion. Whether it is a referral, advice years from now, or your next move, I am here for the long term.</>,
  },
];

const SELLER_COSTS = [
  { label: "Real estate commission", what: <>The fee for marketing and selling the home. <GlossaryLink slug="listing-agreement">See how commissions are set →</GlossaryLink></>, guide: "Negotiated and set out in your listing agreement; paid from proceeds at completion." },
  { label: "Legal / notary fees", what: <>Closing the sale, discharging your mortgage, disbursing funds. <GlossaryLink slug="lawyer-or-notary">More →</GlossaryLink></>, guide: "Roughly $1,000 to $1,800 plus disbursements." },
  { label: "Mortgage payout", what: <>Paying off your remaining mortgage. <GlossaryLink slug="mortgage-discharge">More →</GlossaryLink></>, guide: "May include a prepayment penalty — ask your lender for the exact figure." },
  { label: "Property Transfer Tax", what: <>The provincial transfer tax. <GlossaryLink slug="property-transfer-tax-ptt">More →</GlossaryLink></>, guide: "Paid by the buyer, not you." },
  { label: "GST", what: <>Federal sales tax.</>, guide: "Generally does not apply to a resale home you have lived in." },
  { label: "Capital gains tax", what: <>Tax on the gain in value. <GlossaryLink slug="capital-gains-tax-real-estate">More →</GlossaryLink></>, guide: "Your principal residence is generally exempt; investment or secondary properties may be taxable — confirm with your accountant." },
  { label: "Preparing the home", what: <>Repairs, cleaning, <GlossaryLink slug="home-staging">staging</GlossaryLink>, photography.</>, guide: "Some may be included in my services; we agree on this up front." },
  { label: "Adjustments", what: <>Property tax and strata fees split to the possession date. <GlossaryLink slug="statement-of-adjustments">More →</GlossaryLink></>, guide: "Calculated by your notary at closing." },
];

const SELLER_TERMS = [
  { label: "Your listing agreement", body: <>The <GlossaryLink slug="listing-agreement">listing agreement</GlossaryLink> sets out the price, the term, the commission, and what I will do to market and sell your home. The representation disclosure spells out the duties I owe you — loyalty, confidentiality, and acting in your best interests.</> },
  { label: "Honest disclosure — and why it protects you", body: <>You are asked to complete a <GlossaryLink slug="property-disclosure-statement">Property Disclosure Statement (PDS)</GlossaryLink> — a standard form where you set out what you know about the home's condition. You are responsible for answering accurately and to the best of your knowledge, and for updating it if something changes before closing. If I am aware of a <GlossaryLink slug="material-latent-defect">material latent defect</GlossaryLink>, I am obliged to disclose it. Full, honest disclosure is your best protection against a dispute or lawsuit after the sale.</> },
  { label: "The buyer's deposit", body: <>The buyer's deposit is held in a regulated brokerage <GlossaryLink slug="escrow">trust account</GlossaryLink>, not paid directly to you, and is credited toward the purchase at completion. If a firm deal collapses because the buyer defaults, the deposit may be at issue and I guide you on your options if that ever arises.</> },
  { label: "The three-day rescission period (cooling-off)", body: <>BC gives buyers a mandatory <GlossaryLink slug="home-buyer-rescission-period-hbrp">three-business-day window</GlossaryLink> after acceptance to cancel for any reason. For you as the seller, that means your accepted offer is not fully firm for those three business days. If the buyer cancels, they pay you 0.25% of the price (about $2,500 on a $1,000,000 home) and the home goes back on the market.</> },
];

const SELLER_TERMS_QUICK = [
  { label: "Listing agreement", body: <>Your contract with the brokerage to market and sell the home. <GlossaryLink slug="listing-agreement">More →</GlossaryLink></> },
  { label: "CMA", body: <>Comparative market analysis — the pricing study based on comparable recent sales. <GlossaryLink slug="comparative-market-analysis-cma">More →</GlossaryLink></> },
  { label: "PDS", body: <>Property Disclosure Statement — your written account of what you know about the home. <GlossaryLink slug="property-disclosure-statement">More →</GlossaryLink></> },
  { label: "Subjects / subject removal", body: <>The buyer's conditions (financing, inspection); once removed, the sale is firm. <GlossaryLink slug="subject-removal">More →</GlossaryLink></> },
  { label: "Completion date", body: <>The day ownership transfers, your mortgage is paid out, and you receive your proceeds. <GlossaryLink slug="completion-date">More →</GlossaryLink></> },
  { label: "Possession date", body: <>The day the buyer gets the keys — usually a day or two after completion. <GlossaryLink slug="possession-date">More →</GlossaryLink></> },
  { label: "Adjustments", body: <>Property tax and strata fees prorated between you and the buyer at closing. <GlossaryLink slug="statement-of-adjustments">More →</GlossaryLink></> },
];

const SELLER_RELATED = [
  { kind: "Journey", title: "Buying a home in BC", blurb: "The nine-step buyer's guide — the flip side of this journey.", href: "/buying-guide" },
  { kind: "Estimator", title: "Home valuation estimator", blurb: "General educational estimate using MLS® comparables. Not an appraisal.", href: "/valuation" },
  { kind: "Community", title: "BC community profiles", blurb: "Understand how neighbourhoods present to today's buyers.", href: "/communities" },
  { kind: "Glossary", title: "Full BC glossary", blurb: "439 terms — every concept in this guide, plus much more.", href: "/glossary" },
  { kind: "Listings", title: "Live MLS® listings", blurb: "See what similar homes are currently on the market.", href: "/listings" },
  { kind: "Compliance", title: "How I'm regulated", blurb: "BCFSA scope-of-licence, CREA REALTOR® Code, and how consumer protections work.", href: "/compliance" },
];

// ===========================================================================
// Rendered pages
// ===========================================================================

// Convert JSX-heavy step arrays into plain-text HowTo schema strings.
const stepsToSchema = (steps, kind) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: kind === "buyer" ? "How to buy a home in British Columbia (2026)" : "How to sell a home in British Columbia (2026)",
  description: kind === "buyer"
    ? "Nine-step educational guide to the residential home-buying process in BC, prepared by Doug LeMaire, REALTOR®."
    : "Nine-step educational guide to the residential home-selling process in BC, prepared by Doug LeMaire, REALTOR®.",
  totalTime: "P90D",
  step: steps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: `Step ${i + 1} of 9 — ${s.title}`,
    text: s.tagline,
    url: `${SITE_URL}/${kind === "buyer" ? "buying" : "selling"}-guide#step-${i + 1}`,
  })),
  provider: {
    "@type": "RealEstateAgent",
    name: "Doug LeMaire, REALTOR®",
    telephone: "+1-604-787-0851",
    url: `${SITE_URL}/`,
    worksFor: {
      "@type": "RealEstateAgent",
      name: "Fraser Property Management Realty Services Ltd.",
      areaServed: ["Greater Vancouver", "Fraser Valley", "Sea-to-Sky", "Whistler"],
    },
  },
});

const termsToSchema = (terms, kind) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: terms.map(t => ({
    "@type": "Question",
    name: t.label,
    acceptedAnswer: {
      "@type": "Answer",
      // Strip JSX to a plain string for schema.
      text: `See EZtoFind.ca ${kind === "buyer" ? "Buyer's" : "Seller's"} Guide for the full explanation, with links to the BC glossary for each key term.`,
    },
  })),
});

// ---------------------------------------------------------------------------
// Public Buyer's Guide page
// ---------------------------------------------------------------------------
export const BuyingGuide = () => {
  const howToSchema = stepsToSchema(BUYER_STEPS, "buyer");
  const faqSchema = termsToSchema(BUYER_TERMS, "buyer");
  return (
    <section className="section" data-testid="buying-guide-page">
      <Helmet>
        <title>Buying a home in BC — the 9-step 2026 buyer's guide | EZtoFind.ca</title>
        <meta name="description" content="A plain-language, BC-specific nine-step buyer's guide covering representation, pre-approval, offers, subject removal, closing, and the 2026 cost picture — including Property Transfer Tax, deposit, and the 3-day rescission period. Prepared by Doug LeMaire, REALTOR® with Fraser Property Management Realty Services Ltd."/>
        <link rel="canonical" href={`${SITE_URL}/buying-guide`}/>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "Buying Guide", item: `${SITE_URL}/buying-guide` },
          ],
        })}</script>
      </Helmet>
      <div className="container-x" style={{ maxWidth: "56rem" }}>
        <GuideHero
          eyebrow="BC 2026 Edition"
          title="Your step-by-step guide to buying a home in BC"
          tagline="Nine clear steps, in plain English, so at every stage you know what is happening and what you need to do next. Prepared by Doug LeMaire, REALTOR®."
          kind="buyer"
        />
        <BrokerageIdent/>
        <div style={{ height: "1.25rem" }}/>
        <GeneralDisclaimer kind="buyer"/>

        <AtAGlance rows={BUYER_GLANCE} testId="buyer-glance"/>

        <h2 style={{ fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy, marginTop: "2rem", marginBottom: "1rem" }}>
          The nine steps
        </h2>
        {BUYER_STEPS.map((s, i) => (
          <StepCard
            key={i}
            number={i + 1}
            of={9}
            title={s.title}
            tagline={s.tagline}
            steps={s.steps}
            note={s.note}
            testId={`buyer-step-${i + 1}`}
          />
        ))}

        <h2 style={{ fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy, marginTop: "2.5rem", marginBottom: "0.5rem" }}>
          What it costs to buy
        </h2>
        <p style={{ color: BRAND.muted, fontFamily: "Inter,sans-serif", marginBottom: "1rem", fontSize: "0.95rem" }}>
          A rough map of the costs involved — figures are indicative for 2026 and confirmed by your REALTOR®, lender, and notary or lawyer.
        </p>
        <div className="paper" style={{ padding: 0, overflowX: "auto", marginBottom: "1.5rem" }} data-testid="buyer-cost-table">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "36rem" }}>
            <thead>
              <tr style={{ background: BRAND.navy, color: "white" }}>
                <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cost</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>What it is</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rough guide (2026)</th>
              </tr>
            </thead>
            <tbody>
              {BUYER_COSTS.map((c, i) => (
                <CostRow key={i} label={c.label} what={c.what} guide={c.guide} testId={`buyer-cost-${i}`}/>
              ))}
            </tbody>
          </table>
        </div>
        <div className="notice" style={{ background: "#FEF3C7", borderColor: "#D97706", padding: "0.9rem 1.15rem", borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: "0.88rem", lineHeight: 1.6, color: BRAND.navy, marginBottom: "1.5rem" }} data-testid="buyer-nonresident-notice">
          <strong>If you are not a Canadian citizen or permanent resident,</strong> additional rules and a 20% <GlossaryLink slug="additional-property-transfer-tax-foreign-buyer-ptt">Additional Property Transfer Tax</GlossaryLink> in designated regions may apply. Confirm your situation with your REALTOR®, lender, and lawyer before making offers.
        </div>

        <h2 style={{ fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy, marginTop: "2.5rem", marginBottom: "0.85rem" }}>
          Your protections & key terms
        </h2>
        <div className="paper" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }} data-testid="buyer-protections">
          {BUYER_TERMS.map((t, i) => (
            <TermRow key={i} label={t.label} body={t.body} testId={`buyer-term-${i}`}/>
          ))}
        </div>
        <div className="paper" style={{ padding: "1.25rem 1.5rem" }} data-testid="buyer-terms-quick">
          <h3 style={{ margin: "0 0 0.5rem", fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy, fontSize: "1.15rem" }}>
            A few terms you will hear
          </h3>
          {BUYER_TERMS_QUICK.map((t, i) => (
            <TermRow key={i} label={t.label} body={t.body} testId={`buyer-quickterm-${i}`}/>
          ))}
        </div>

        <RelatedResources items={BUYER_RELATED}/>
        <GuideFooterCTA kind="buyer"/>
        <div style={{ height: "1.5rem" }}/>
        <BrokerageIdent compact/>
        <div style={{ height: "0.5rem" }}/>
        <GeneralDisclaimer kind="buyer"/>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Public Seller's Guide page
// ---------------------------------------------------------------------------
export const SellingGuide = () => {
  const howToSchema = stepsToSchema(SELLER_STEPS, "seller");
  const faqSchema = termsToSchema(SELLER_TERMS, "seller");
  return (
    <section className="section" data-testid="selling-guide-page">
      <Helmet>
        <title>Selling a home in BC — the 9-step 2026 seller's guide | EZtoFind.ca</title>
        <meta name="description" content="A plain-language, BC-specific nine-step seller's guide covering the listing appointment, pricing, marketing, offers, subject removal, closing, and 2026 costs — including commission, legal fees, mortgage payout, capital gains, and the 3-day rescission period. Prepared by Doug LeMaire, REALTOR® with Fraser Property Management Realty Services Ltd."/>
        <link rel="canonical" href={`${SITE_URL}/selling-guide`}/>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "Selling Guide", item: `${SITE_URL}/selling-guide` },
          ],
        })}</script>
      </Helmet>
      <div className="container-x" style={{ maxWidth: "56rem" }}>
        <GuideHero
          eyebrow="BC 2026 Edition"
          title="Your step-by-step guide to selling your home"
          tagline="Nine clear steps, in plain English, so at every stage you know what is happening and what you need to do next. Prepared by Doug LeMaire, REALTOR®."
          kind="seller"
        />
        <BrokerageIdent/>
        <div style={{ height: "1.25rem" }}/>
        <GeneralDisclaimer kind="seller"/>

        <AtAGlance rows={SELLER_GLANCE} testId="seller-glance"/>

        <h2 style={{ fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy, marginTop: "2rem", marginBottom: "1rem" }}>
          The nine steps
        </h2>
        {SELLER_STEPS.map((s, i) => (
          <StepCard
            key={i}
            number={i + 1}
            of={9}
            title={s.title}
            tagline={s.tagline}
            steps={s.steps}
            note={s.note}
            testId={`seller-step-${i + 1}`}
          />
        ))}

        <h2 style={{ fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy, marginTop: "2.5rem", marginBottom: "0.5rem" }}>
          What it costs to sell
        </h2>
        <p style={{ color: BRAND.muted, fontFamily: "Inter,sans-serif", marginBottom: "1rem", fontSize: "0.95rem" }}>
          Most selling costs come out of your sale proceeds at completion, so you rarely write a cheque up front.
        </p>
        <div className="paper" style={{ padding: 0, overflowX: "auto", marginBottom: "1.5rem" }} data-testid="seller-cost-table">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "36rem" }}>
            <thead>
              <tr style={{ background: BRAND.navy, color: "white" }}>
                <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cost</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>What it is</th>
                <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes (2026)</th>
              </tr>
            </thead>
            <tbody>
              {SELLER_COSTS.map((c, i) => (
                <CostRow key={i} label={c.label} what={c.what} guide={c.guide} testId={`seller-cost-${i}`}/>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy, marginTop: "2.5rem", marginBottom: "0.85rem" }}>
          Your obligations & protections
        </h2>
        <div className="paper" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }} data-testid="seller-protections">
          {SELLER_TERMS.map((t, i) => (
            <TermRow key={i} label={t.label} body={t.body} testId={`seller-term-${i}`}/>
          ))}
        </div>
        <div className="paper" style={{ padding: "1.25rem 1.5rem" }} data-testid="seller-terms-quick">
          <h3 style={{ margin: "0 0 0.5rem", fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy, fontSize: "1.15rem" }}>
            A few terms you will hear
          </h3>
          {SELLER_TERMS_QUICK.map((t, i) => (
            <TermRow key={i} label={t.label} body={t.body} testId={`seller-quickterm-${i}`}/>
          ))}
        </div>

        <RelatedResources items={SELLER_RELATED}/>
        <GuideFooterCTA kind="seller"/>
        <div style={{ height: "1.5rem" }}/>
        <BrokerageIdent compact/>
        <div style={{ height: "0.5rem" }}/>
        <GeneralDisclaimer kind="seller"/>
      </div>
    </section>
  );
};

export default { BuyingGuide, SellingGuide };
