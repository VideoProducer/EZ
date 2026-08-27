// /tools/mortgage-affordability — SEO-indexed standalone page that wraps
// the existing <Calculators/> module (which contains the OSFI B-20
// stress-test-compliant <AffordabilityCalculator/>). This keeps a single
// source of truth for the calculator logic while giving the tool its own
// SEO surface, JSON-LD schema, and lead-attractor placement.
//
// COMPLIANCE:
//  • BCFSA: Doug identity above the tool. Copy states Doug is a REALTOR®,
//    NOT a mortgage broker; users are directed to a licensed BC mortgage
//    broker for advice.
//  • Mortgage Brokers Act: page cannot give mortgage advice. Framed as
//    an educational stress-test estimator only.
//  • PIPA: All math client-side inside <Calculators/>. No collection.
//  • CASL: No email capture on this page.
import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { IdentityLine } from "../components/IdentityLine";
import { Calculators } from "../App";

export default function MortgageAffordabilityPage() {
  return (
    <section className="section" data-testid="mortgage-affordability-page">
      <Helmet>
        <title>BC Mortgage Affordability Calculator (2026) — OSFI B-20 Stress Test — EZtoFind.ca</title>
        <meta name="description" content="Free BC mortgage affordability calculator using the OSFI B-20 stress test. Estimate maximum purchase price by income, down payment, and debts. Educational — not mortgage advice."/>
        <meta name="robots" content="index,follow"/>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "BC Mortgage Affordability Calculator",
          "applicationCategory": "FinanceApplication",
          "operatingSystem": "Web",
          "url": "https://eztofind.ca/tools/mortgage-affordability",
          "provider": { "@type": "RealEstateAgent", "name": "Doug LeMaire, REALTOR®", "url": "https://eztofind.ca" },
          "offers": { "@type": "Offer", "price": 0, "priceCurrency": "CAD" },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is the OSFI B-20 mortgage stress test?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "The OSFI B-20 stress test is a federal rule that qualifies buyers at the higher of their contract rate + 2% or 5.25%, ensuring borrowers can absorb a rate hike. It applies to all federally-regulated lenders in Canada, including for BC purchases."
              }
            },
            {
              "@type": "Question",
              "name": "Does this calculator quote a mortgage rate?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "No. Doug LeMaire is a REALTOR®, not a licensed mortgage broker. This tool is educational only. For an actual mortgage pre-approval, consult a BC-licensed mortgage broker regulated under the Mortgage Brokers Act."
              }
            },
            {
              "@type": "Question",
              "name": "How much down payment do I need in BC?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "In BC, a minimum 5% down payment applies to purchases up to $500,000, 10% on the portion from $500,000 to $1.5M, and 20% required at $1.5M or more. Purchases with less than 20% down require CMHC / Sagen / Canada Guaranty default insurance."
              }
            }
          ]
        })}</script>
      </Helmet>

      <div className="container-x" style={{ maxWidth: "48rem" }}>
        <IdentityLine practice="REALTOR® · Educational stress-test tool (not mortgage advice)" size="md" testId="afford-identity"/>
        <div className="eyebrow" style={{ maxWidth: "42rem", margin: "0 auto", textAlign: "center" }}>Free BC calculator</div>
        <h1 className="section-title" style={{ textAlign: "center" }}>BC Mortgage Affordability Calculator (2026)</h1>
        <p style={{ fontFamily: "Inter,sans-serif", color: "var(--muted)", lineHeight: 1.7, marginBottom: "0.5rem", maxWidth: "42rem", margin: "0 auto 0.5rem", textAlign: "center" }}>
          Estimate the maximum BC purchase price you'd qualify for using the <strong>OSFI B-20 stress test</strong> — income, down payment, and monthly debts. All math runs in your browser.
        </p>
      </div>

      {/* Reuse the exact affordability calculator module from the homepage.
          This preserves a single source of truth and keeps the OSFI B-20
          stress-test math verified. */}
      <Calculators/>

      <div className="container-x" style={{ maxWidth: "42rem" }}>
        {/* Compliance strip */}
        <div className="paper" data-testid="afford-compliance" style={{
          marginTop: "1.25rem", background: "#F0F4FB",
          borderColor: "rgba(15,42,91,0.15)", padding: "1rem 1.15rem",
          fontFamily: "Inter,sans-serif", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--muted)",
        }}>
          <strong style={{ color: "#0F2A5B" }}>Not mortgage advice.</strong> This calculator uses the OSFI B-20 stress test (qualifying rate = higher of contract rate + 2% or 5.25%) as an educational estimate. It does not represent a mortgage pre-approval. Doug LeMaire is a REALTOR® — not a licensed mortgage broker.
          {" "}For an actual pre-approval, consult a BC-licensed mortgage broker regulated under the <Link to="/glossary/mortgage-brokers-act" style={{ color: "var(--brand-blue)" }}>Mortgage Brokers Act</Link>. Provided by Doug LeMaire, REALTOR® (BCFSA #167790) · Fraser Property Management Realty Services Ltd. Nothing you enter here is stored or transmitted.
        </div>

        {/* CTAs */}
        <div style={{
          marginTop: "1.25rem", display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.75rem",
        }}>
          <Link
            to="/tools/bc-buyer-cost-calculator?utm_source=calculator&utm_medium=mortgage-affordability&utm_campaign=buyer-cost-cta"
            className="btn btn-primary"
            data-testid="afford-cta-buyer-costs"
          >Now estimate my BC closing costs</Link>
          <Link
            to="/buyer?utm_source=calculator&utm_medium=mortgage-affordability&utm_campaign=buyer-cta"
            className="btn btn-secondary"
            data-testid="afford-cta-buyer"
            style={{ background: "#fff", border: "1.5px solid #0F2A5B", color: "#0F2A5B" }}
          >Tell Doug what I'm looking for</Link>
        </div>
      </div>
    </section>
  );
}
