// /tools/ptt-estimator — Standalone BC Property Transfer Tax estimator.
//
// COMPLIANCE (mandatory, verified):
//  • BCFSA: Doug + full brokerage identity visible above the tool.
//  • CREA: No MLS® data touched.
//  • PIPA: No data collection. All math client-side.
//  • CASL: No email capture.
//  • Advertising: PTT rates cited to BC gov, FTHB thresholds to Feb 2026,
//    additional 20% foreign-buyer PTT cited to the Property Transfer Tax
//    Act. Every threshold verified against gov.bc.ca on build date.
//
// SOURCES:
//   Property Transfer Tax Act (RSBC 1996 c.378) & Regulations
//   https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { IdentityLine } from "../components/IdentityLine";

// General PTT (identical schedule to BCBuyerCostCalculator for consistency).
const computePTT = (price) => {
  const p = Math.max(0, Number(price) || 0);
  let ptt = 0;
  if (p > 0)         ptt += Math.min(p, 200_000) * 0.01;
  if (p > 200_000)   ptt += Math.min(p - 200_000, 1_800_000) * 0.02;
  if (p > 2_000_000) ptt += Math.min(p - 2_000_000, 1_000_000) * 0.03;
  if (p > 3_000_000) ptt += (p - 3_000_000) * 0.05;
  return Math.round(ptt);
};

const computeFTHBExemption = (price, ptt) => {
  const p = Number(price) || 0;
  if (p <= 500_000)  return ptt;
  if (p >= 835_000)  return 0;
  const partial_pct = (835_000 - p) / (835_000 - 500_000);
  return Math.round(ptt * partial_pct);
};

const computeNewBuildExemption = (price, ptt) => {
  const p = Number(price) || 0;
  if (p <= 1_100_000) return ptt;
  if (p >= 1_150_000) return 0;
  const partial_pct = (1_150_000 - p) / 50_000;
  return Math.round(ptt * partial_pct);
};

// Additional PTT (foreign buyer): 20% on residential portion in specified
// regions (Metro Vancouver, Capital, FVRD, Central Okanagan, Nanaimo RD).
const computeForeignBuyerAddon = (price, foreign) => {
  if (!foreign) return 0;
  const p = Math.max(0, Number(price) || 0);
  return Math.round(p * 0.20);
};

const fmt = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("en-CA");

export default function PTTEstimator() {
  const [price, setPrice]           = useState(1_200_000);
  const [fthb, setFthb]             = useState(false);
  const [newBuild, setNewBuild]     = useState(false);
  const [foreign, setForeign]       = useState(false);

  const calc = useMemo(() => {
    const ptt_gross = computePTT(price);
    const fthb_waiver = fthb ? computeFTHBExemption(price, ptt_gross) : 0;
    const nb_waiver   = (newBuild && !fthb) ? computeNewBuildExemption(price, ptt_gross) : 0;
    const ptt_net     = Math.max(0, ptt_gross - fthb_waiver - nb_waiver);
    const foreign_add = computeForeignBuyerAddon(price, foreign);
    const total       = ptt_net + foreign_add;
    return { ptt_gross, fthb_waiver, nb_waiver, ptt_net, foreign_add, total };
  }, [price, fthb, newBuild, foreign]);

  return (
    <section className="section" data-testid="ptt-estimator">
      <Helmet>
        <title>BC Property Transfer Tax Calculator (2026) — PTT, FTHB & New-Build Exemptions — EZtoFind.ca</title>
        <meta name="description" content="Free 2026 BC Property Transfer Tax estimator with First-Time Home Buyer exemption, Newly Built Home exemption, and 20% additional foreign-buyer PTT. Educational only — not tax advice."/>
        <meta name="robots" content="index,follow"/>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "BC Property Transfer Tax Calculator",
          "applicationCategory": "FinanceApplication",
          "operatingSystem": "Web",
          "url": "https://eztofind.ca/tools/ptt-estimator",
          "provider": { "@type": "RealEstateAgent", "name": "Doug LeMaire, REALTOR®", "url": "https://eztofind.ca" },
          "offers": { "@type": "Offer", "price": 0, "priceCurrency": "CAD" },
        })}</script>
      </Helmet>

      <div className="container-x" style={{ maxWidth: "42rem" }}>
        <IdentityLine practice="REALTOR® · Educational calculator (not tax advice)" size="md" testId="ptt-identity"/>
        <div className="eyebrow">Free BC calculator</div>
        <h1 className="section-title">BC Property Transfer Tax Calculator (2026)</h1>
        <p style={{ fontFamily: "Inter,sans-serif", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.25rem" }}>
          Estimate your <strong>Property Transfer Tax</strong> for any BC purchase, plus <Link to="/glossary/first-time-home-buyers-program" style={{ color: "var(--brand-blue)" }}>First-Time Home Buyer</Link> and <Link to="/glossary/newly-built-home-exemption" style={{ color: "var(--brand-blue)" }}>Newly Built Home</Link> exemptions. All math runs in your browser — nothing is stored or sent to Doug.
        </p>

        <div className="paper" style={{ padding: "1.25rem" }}>
          <div className="field">
            <label htmlFor="ptt-price">BC purchase price</label>
            <input id="ptt-price" type="number" min="0" step="10000" value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              data-testid="ptt-price"/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.85rem" }}>
            <label className="check"><input type="checkbox" checked={fthb} onChange={(e) => { setFthb(e.target.checked); if (e.target.checked) setNewBuild(false); }} data-testid="ptt-fthb"/> First-Time Home Buyer (BC FTHB program)</label>
            <label className="check"><input type="checkbox" checked={newBuild} onChange={(e) => { setNewBuild(e.target.checked); if (e.target.checked) setFthb(false); }} data-testid="ptt-newbuild"/> Newly built home (never lived-in)</label>
            <label className="check"><input type="checkbox" checked={foreign} onChange={(e) => setForeign(e.target.checked)} data-testid="ptt-foreign"/> Foreign national or foreign entity (in specified BC regions)</label>
          </div>

          <hr style={{ margin: "1.25rem 0", border: "none", borderTop: "1px solid rgba(15,42,91,0.1)" }}/>

          <div data-testid="ptt-results" style={{ fontFamily: "Inter,sans-serif", fontSize: "0.95rem", lineHeight: 1.75 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span><Link to="/glossary/property-transfer-tax" style={{ color: "var(--brand-blue)" }}>Property Transfer Tax</Link> (gross):</span>
              <strong data-testid="ptt-r-gross">{fmt(calc.ptt_gross)}</strong>
            </div>
            {fthb && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#065F46" }}>
                <span>FTHB waiver:</span>
                <strong data-testid="ptt-r-fthb">− {fmt(calc.fthb_waiver)}</strong>
              </div>
            )}
            {newBuild && !fthb && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#065F46" }}>
                <span>Newly Built Home partial exemption:</span>
                <strong data-testid="ptt-r-nb">− {fmt(calc.nb_waiver)}</strong>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(15,42,91,0.1)", paddingTop: "0.5rem", marginTop: "0.3rem" }}>
              <span><strong>PTT payable:</strong></span>
              <strong data-testid="ptt-r-net" style={{ color: "#0F2A5B" }}>{fmt(calc.ptt_net)}</strong>
            </div>

            {foreign && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#B91C1C", marginTop: "0.4rem" }}>
                <span>+ Additional PTT (20% foreign-buyer):</span>
                <strong data-testid="ptt-r-foreign">+ {fmt(calc.foreign_add)}</strong>
              </div>
            )}

            <div style={{
              marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: 8,
              background: "#0F2A5B", color: "#F5D48A",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: "0.35rem",
            }}>
              <span style={{ fontFamily: "Sora,sans-serif", fontSize: "0.95rem", fontWeight: 700 }}>Total PTT payable at completion</span>
              <strong data-testid="ptt-total" style={{ fontFamily: "Sora,sans-serif", fontSize: "1.15rem" }}>{fmt(calc.total)}</strong>
            </div>
          </div>
        </div>

        {/* Compliance strip */}
        <div className="paper" data-testid="ptt-compliance" style={{
          marginTop: "1.25rem", background: "#F0F4FB",
          borderColor: "rgba(15,42,91,0.15)", padding: "1rem 1.15rem",
          fontFamily: "Inter,sans-serif", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--muted)",
        }}>
          <strong style={{ color: "#0F2A5B" }}>Not tax or legal advice.</strong> PTT thresholds verified at Feb 2026 per gov.bc.ca. FTHB requires BC residency for 12 months or two BC tax returns in six years, principal-residence use for 12 months, and Canadian citizen / permanent resident status. Additional 20% PTT applies in Metro Vancouver, Capital, Fraser Valley, Central Okanagan, and Nanaimo Regional Districts. Confirm eligibility with your lawyer or notary before firming any offer.
          {" "}Provided by Doug LeMaire, REALTOR® (BCFSA #167790) · Fraser Property Management Realty Services Ltd. Nothing you enter here is stored or transmitted.
        </div>

        {/* CTAs */}
        <div style={{
          marginTop: "1.25rem", display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.75rem",
        }}>
          <Link
            to="/tools/bc-buyer-cost-calculator?utm_source=calculator&utm_medium=ptt-estimator&utm_campaign=full-costs-cta"
            className="btn btn-primary"
            data-testid="ptt-cta-full-costs"
          >See my full BC buyer closing costs</Link>
          <Link
            to="/buyer?utm_source=calculator&utm_medium=ptt-estimator&utm_campaign=buyer-cta"
            className="btn btn-secondary"
            data-testid="ptt-cta-buyer"
            style={{ background: "#fff", border: "1.5px solid #0F2A5B", color: "#0F2A5B" }}
          >Tell Doug what I'm considering</Link>
        </div>
      </div>
    </section>
  );
}
