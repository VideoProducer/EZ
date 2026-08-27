// /sac — Source-to-page match landing page (Phase D brief §5) for
// visitors arriving with ?utm_source=sac (Social Agent Community feed).
//
// COMPLIANCE (all mandatory, verified against BCFSA / CREA / PIPA / CASL / GVR):
//  • BCFSA: Doug's licensee name + full related brokerage name prominent
//    above every action (RESA advertising rule 4-6).
//  • CREA: No fabricated MLS® listings. Live CREA DDF® links only — via
//    /listings (which reads the licensed feed).
//  • PIPA: No data collection on this page. Any submit → /valuation or
//    /buyer where the collection notice + consent controls already live.
//  • CASL: No email capture, no CEM. No marketing-list enrollment.
//  • GVR: Advertising is current, accurate, verifiable, no scarcity /
//    urgency / ranking claims.
import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { IdentityLine } from "../components/IdentityLine";
import { trackFormEvent } from "../utils/conversionAnalytics";

const CARDS = [
  {
    testid: "sac-card-calculator",
    tag:    "Free tool",
    title:  "BC Buyer Cost Calculator",
    body:   "Property Transfer Tax + First-Time Home Buyer exemption + GST New Housing Rebate + legal / inspection — real 2026 math for any BC purchase price.",
    to:     "/tools/bc-buyer-cost-calculator",
    cta:    "Open calculator",
  },
  {
    testid: "sac-card-glossary",
    tag:    "Free reference",
    title:  "439-term BC glossary",
    body:   "Article 16, Form B, DoRTS, ALR, PTT, GST Rebate, 2-5-10 Warranty — every BC real-estate term in plain English, cited by ChatGPT / Perplexity / Gemini.",
    to:     "/glossary",
    cta:    "Browse the glossary",
  },
  {
    testid: "sac-card-communities",
    tag:    "Free reference",
    title:  "240 BC community profiles",
    body:   "Elgin Chantrell, Morgan Creek, Crescent Beach, Kitsilano, Squamish and 235 more — school catchments, StatCan demographics, live listing counts.",
    to:     "/communities",
    cta:    "Explore communities",
  },
  {
    testid: "sac-card-listings",
    tag:    "Live CREA DDF®",
    title:  "Live BC listings",
    body:   "Every active MLS® listing across Greater Vancouver + Fraser Valley + Sea-to-Sky, verified against REALTOR.ca. Filter by community, price, or feature.",
    to:     "/listings",
    cta:    "Search live listings",
  },
  {
    testid: "sac-card-valuation",
    tag:    "Ask Doug",
    title:  "Free BC home market estimate",
    body:   "Sellers: request a Comparative Market Analysis. Free · no obligation · reply within one business day. Submission does not create a REALTOR®-client relationship.",
    to:     "/valuation?utm_source=sac&utm_medium=sac-landing&utm_campaign=cta-valuation",
    cta:    "Get my market estimate",
    highlight: true,
  },
  {
    testid: "sac-card-buyer",
    tag:    "Ask Doug",
    title:  "Tell Doug what you're looking for",
    body:   "Buyers: private, one-conversation intake — area, budget, timeline, financing status. Doug replies within one business day.",
    to:     "/buyer?utm_source=sac&utm_medium=sac-landing&utm_campaign=cta-buyer",
    cta:    "Start a buyer conversation",
    highlight: true,
  },
];

export default function SacLanding() {
  const [sp] = useSearchParams();

  // Persist SAC attribution to sessionStorage so any downstream /valuation
  // or /buyer submit carries the utm_source through into the CRM record —
  // even if the visitor navigates around the site first.
  useEffect(() => {
    try {
      sessionStorage.setItem("ez_utm_source", sp.get("utm_source") || "sac");
      sessionStorage.setItem("ez_landing_page", "/sac");
    } catch { /* private mode — skip */ }
    trackFormEvent("sac_landing_view", { referrer: document.referrer });
  }, [sp]);

  return (
    <section className="section" data-testid="sac-landing">
      <Helmet>
        <title>Welcome from the Social Agent Community — EZtoFind.ca (BC)</title>
        <meta name="description" content="Free BC real-estate tools: 439-term glossary, 240 community profiles, live CREA DDF® listings, and a market estimate from Doug LeMaire, REALTOR® (Fraser Property Management Realty Services Ltd.). Educational only."/>
        <meta name="robots" content="index,follow"/>
      </Helmet>

      <div className="container-x" style={{ maxWidth: "52rem" }}>
        <IdentityLine practice="REALTOR® · Fraser Valley + South Surrey · Educational BC research platform" size="md" testId="sac-identity"/>

        <div className="eyebrow" data-testid="sac-eyebrow">Welcome from the Social Agent Community</div>
        <h1 className="section-title" data-testid="sac-h1">Hi 👋 — here's what's free on EZtoFind.ca (BC-focused)</h1>
        <p style={{ fontFamily: "Inter,sans-serif", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
          Everything below is educational and free. I'm Doug LeMaire, REALTOR® with Fraser Property Management Realty Services Ltd. — Fraser Valley, South Surrey, and the Sea-to-Sky corridor.
          If you're buying or selling <em>in BC</em>, pick a card. Nothing on this page collects your information — anything you submit later has its own visible privacy notice (PIPA).
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
          marginTop: "1.5rem",
        }}>
          {CARDS.map((c) => (
            <Link
              key={c.testid}
              to={c.to}
              data-testid={c.testid}
              style={{
                display: "flex", flexDirection: "column", gap: "0.5rem",
                padding: "1.15rem",
                background: c.highlight ? "linear-gradient(180deg,#F7FAFF 0%,#fff 100%)" : "#fff",
                border: c.highlight ? "2px solid #DABF7A" : "1px solid rgba(15,42,91,0.12)",
                borderRadius: 12,
                textDecoration: "none",
                color: "#0F2A5B",
                boxShadow: c.highlight ? "0 8px 20px rgba(218,191,122,0.18)" : "0 2px 8px rgba(15,42,91,0.06)",
                transition: "transform 120ms ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <span style={{
                fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.14em",
                textTransform: "uppercase", color: c.highlight ? "#8A6D2E" : "#4a5568",
              }}>{c.tag}</span>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.2 }}>{c.title}</span>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5, flex: 1 }}>{c.body}</span>
              <span style={{
                display: "inline-block", marginTop: "0.4rem",
                fontFamily: "Sora,sans-serif", fontSize: "0.82rem", fontWeight: 800,
                color: c.highlight ? "#0F2A5B" : "var(--brand-blue, #1E4FCF)",
              }}>{c.cta} →</span>
            </Link>
          ))}
        </div>

        {/* Compliance strip — visible before any downstream action. */}
        <div className="paper" data-testid="sac-compliance" style={{
          marginTop: "2rem",
          background: "#F0F4FB",
          borderColor: "rgba(15,42,91,0.15)",
          padding: "1rem 1.15rem",
          fontFamily: "Inter,sans-serif",
          fontSize: "0.82rem",
          lineHeight: 1.6,
          color: "var(--muted)",
        }}>
          <strong style={{ color: "#0F2A5B" }}>Educational only.</strong> Content on EZtoFind.ca is general BC real-estate information, not legal, tax, or financial advice. Live MLS® data is licensed via CREA DDF® — verify listings on <a href="https://www.realtor.ca" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-blue)" }}>REALTOR.ca</a>. Any request you submit is reviewed by Doug LeMaire, REALTOR® (BCFSA #167790) of Fraser Property Management Realty Services Ltd. Submission does not create a REALTOR®-client relationship — the BCFSA Disclosure of Representation in Trading Services is provided in writing before any real-estate services begin. If you are already represented by another REALTOR®, we can't accept a trading-services request through the form.
        </div>
      </div>
    </section>
  );
}
