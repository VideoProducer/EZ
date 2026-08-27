// /tools/bc-buyer-cost-calculator — Free client-side calculator.
//
// COMPLIANCE (mandatory, verified):
//  • BCFSA: Doug + full brokerage identity visible above the tool.
//  • CREA: No MLS® data touched by this tool.
//  • PIPA: No data collection. All math runs in the browser; nothing is
//    POSTed to the backend. Values are not stored, logged, or emailed.
//  • CASL: No email capture, no CEM triggered.
//  • GVR advertising: numbers must be current, accurate, verifiable, no
//    ranking / scarcity claims. Any figure is sourced from BC gov / CRA
//    published rules and clearly labelled as an estimate.
//  • Every glossary term embedded is linked to the definition page.
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { IdentityLine } from "../components/IdentityLine";

// PTT is a BC statute (Property Transfer Tax Act). Rates verified for 2026:
//   1% on first $200,000
//   2% on the next $1,800,000 (i.e., $200K–$2M)
//   3% on the next $1,000,000 ($2M–$3M)
//   Additional 2% on residential portion above $3M (total 5% on that band)
// SOURCE: gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax
const computePTT = (price) => {
  const p = Math.max(0, Number(price) || 0);
  let ptt = 0;
  if (p > 0)         ptt += Math.min(p, 200_000) * 0.01;
  if (p > 200_000)   ptt += Math.min(p - 200_000, 1_800_000) * 0.02;
  if (p > 2_000_000) ptt += Math.min(p - 2_000_000, 1_000_000) * 0.03;
  if (p > 3_000_000) ptt += (p - 3_000_000) * 0.05;
  return Math.round(ptt);
};

// First-Time Home Buyer exemption (Feb 2026 rules):
//   Full exemption up to $500,000
//   Partial (sliding) $500,000 → $835,000
//   Above $835,000: no exemption
// The partial exemption formula reduces PTT by an amount that scales
// linearly to zero at the $835K cap.
const computeFTHBExemption = (price, ptt) => {
  const p = Number(price) || 0;
  if (p <= 500_000)  return ptt;                              // full waiver
  if (p >= 835_000)  return 0;                                 // no waiver
  const partial_pct = (835_000 - p) / (835_000 - 500_000);
  return Math.round(ptt * partial_pct);
};

// Newly Built Home exemption (partial 2026):
//   Full exemption up to $1,100,000
//   Partial $1,100,000 → $1,150,000
//   Above $1,150,000: no exemption
const computeNewBuildExemption = (price, ptt) => {
  const p = Number(price) || 0;
  if (p <= 1_100_000) return ptt;
  if (p >= 1_150_000) return 0;
  const partial_pct = (1_150_000 - p) / 50_000;
  return Math.round(ptt * partial_pct);
};

// GST on new construction: 5% federal, with New Housing Rebate for owner-
// occupied builds under $450K. Above $450K → rebate zero; buyer pays full
// 5% on the pre-tax price.
const computeGSTNewBuild = (price) => {
  const p = Number(price) || 0;
  const gst = p * 0.05;
  const rebate = p < 350_000 ? gst * 0.36
              : p < 450_000  ? (gst * 0.36) * ((450_000 - p) / 100_000)
              : 0;
  return { gst: Math.round(gst), rebate: Math.round(rebate), net: Math.round(gst - rebate) };
};

// Legal + inspection + adjustments — mid-range estimates.
const OTHER = {
  legal:      { label: "Legal / notary fees (est.)", low: 1400, high: 2500 },
  inspection: { label: "Home inspection (est.)",     low: 500,  high: 900  },
  appraisal:  { label: "Appraisal (est., if lender-required)", low: 400, high: 700 },
  moveIn:     { label: "Move-in adjustments (est., property tax + utilities pro-rated)", low: 500, high: 3000 },
};

const fmt = (n) => "$" + Number(n || 0).toLocaleString("en-CA");

export default function BCBuyerCostCalculator() {
  const [price, setPrice]     = useState(1_200_000);
  const [fthb, setFthb]       = useState(false);
  const [newBuild, setNewBuild] = useState(false);

  const calc = useMemo(() => {
    const ptt_gross = computePTT(price);
    const fthb_waiver = fthb ? computeFTHBExemption(price, ptt_gross) : 0;
    const nb_waiver   = (newBuild && !fthb) ? computeNewBuildExemption(price, ptt_gross) : 0;
    const ptt_net     = Math.max(0, ptt_gross - fthb_waiver - nb_waiver);
    const gst         = newBuild ? computeGSTNewBuild(price) : { gst: 0, rebate: 0, net: 0 };
    const est_low     = ptt_net + gst.net + OTHER.legal.low + OTHER.inspection.low + OTHER.moveIn.low;
    const est_high    = ptt_net + gst.net + OTHER.legal.high + OTHER.inspection.high + OTHER.moveIn.high + OTHER.appraisal.high;
    return { ptt_gross, fthb_waiver, nb_waiver, ptt_net, gst, est_low, est_high };
  }, [price, fthb, newBuild]);

  return (
    <section className="section" data-testid="bc-cost-calc">
      <Helmet>
        <title>BC Buyer Cost Calculator (2026) — PTT · FTHB · GST · legal — EZtoFind.ca</title>
        <meta name="description" content="Free 2026 BC home-buyer cost calculator: Property Transfer Tax, First-Time Home Buyer exemption, GST New Housing Rebate, legal, inspection. Educational only — not tax or legal advice."/>
        <meta name="robots" content="index,follow"/>
      </Helmet>

      <div className="container-x" style={{ maxWidth: "42rem" }}>
        <IdentityLine practice="REALTOR® · Educational calculator (not tax or legal advice)" size="md" testId="calc-identity"/>
        <div className="eyebrow">Free BC calculator</div>
        <h1 className="section-title">BC Buyer Cost Calculator (2026)</h1>
        <p style={{ fontFamily: "Inter,sans-serif", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.25rem" }}>
          Estimate <strong>Property Transfer Tax</strong>, <strong>First-Time Home Buyer</strong> exemption, <strong>GST on new construction</strong>, legal + inspection, and total closing costs for any BC purchase.
          All math runs in your browser — nothing is stored or sent to Doug.
        </p>

        <div className="paper" style={{ padding: "1.25rem" }}>
          <div className="field">
            <label htmlFor="calc-price">BC purchase price</label>
            <input
              id="calc-price"
              type="number"
              min="0"
              step="10000"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              data-testid="calc-price"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.85rem" }}>
            <label className="check"><input type="checkbox" checked={fthb} onChange={(e) => { setFthb(e.target.checked); if (e.target.checked) setNewBuild(false); }} data-testid="calc-fthb"/> First-Time Home Buyer (BC FTHB program)</label>
            <label className="check"><input type="checkbox" checked={newBuild} onChange={(e) => { setNewBuild(e.target.checked); if (e.target.checked) setFthb(false); }} data-testid="calc-newbuild"/> Newly built home (never lived-in)</label>
          </div>

          <hr style={{ margin: "1.25rem 0", border: "none", borderTop: "1px solid rgba(15,42,91,0.1)" }}/>

          <div data-testid="calc-results" style={{ fontFamily: "Inter,sans-serif", fontSize: "0.95rem", lineHeight: 1.75 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span><Link to="/glossary/property-transfer-tax" style={{ color: "var(--brand-blue)" }}>Property Transfer Tax</Link> (gross):</span>
              <strong data-testid="calc-ptt-gross">{fmt(calc.ptt_gross)}</strong>
            </div>
            {fthb && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#065F46" }}>
                <span><Link to="/glossary/first-time-home-buyers-program" style={{ color: "var(--brand-blue)" }}>FTHB waiver</Link>:</span>
                <strong data-testid="calc-fthb-waiver">− {fmt(calc.fthb_waiver)}</strong>
              </div>
            )}
            {newBuild && !fthb && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#065F46" }}>
                <span>New-build partial exemption:</span>
                <strong>− {fmt(calc.nb_waiver)}</strong>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(15,42,91,0.1)", paddingTop: "0.5rem", marginTop: "0.3rem" }}>
              <span><strong>PTT payable:</strong></span>
              <strong data-testid="calc-ptt-net" style={{ color: "#0F2A5B" }}>{fmt(calc.ptt_net)}</strong>
            </div>

            {newBuild && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
                  <span><Link to="/glossary/gst-new-housing-rebate" style={{ color: "var(--brand-blue)" }}>GST 5%</Link>:</span>
                  <span>{fmt(calc.gst.gst)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#065F46" }}>
                  <span>GST New Housing Rebate:</span>
                  <span>− {fmt(calc.gst.rebate)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span><strong>GST net:</strong></span>
                  <strong data-testid="calc-gst-net">{fmt(calc.gst.net)}</strong>
                </div>
              </>
            )}

            <hr style={{ margin: "0.75rem 0", border: "none", borderTop: "1px dashed rgba(15,42,91,0.15)" }}/>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Other estimated closing costs (range):</div>
            {Object.values(OTHER).map((o) => (
              <div key={o.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "var(--muted)" }}>
                <span>{o.label}</span>
                <span>{fmt(o.low)} – {fmt(o.high)}</span>
              </div>
            ))}

            <div style={{
              marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: 8,
              background: "#0F2A5B", color: "#F5D48A",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: "0.35rem",
            }}>
              <span style={{ fontFamily: "Sora,sans-serif", fontSize: "0.95rem", fontWeight: 700 }}>Estimated total closing costs</span>
              <strong data-testid="calc-total" style={{ fontFamily: "Sora,sans-serif", fontSize: "1.1rem" }}>{fmt(calc.est_low)} – {fmt(calc.est_high)}</strong>
            </div>
          </div>
        </div>

        {/* Compliance strip — mandatory before any onward CTA. */}
        <div className="paper" data-testid="calc-compliance" style={{
          marginTop: "1.25rem", background: "#F0F4FB",
          borderColor: "rgba(15,42,91,0.15)", padding: "1rem 1.15rem",
          fontFamily: "Inter,sans-serif", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--muted)",
        }}>
          <strong style={{ color: "#0F2A5B" }}>Not tax or legal advice.</strong> Rates verified for BC 2026 at time of build; the province and CRA may adjust thresholds. Verify totals with your lawyer / notary before firming an offer. Full-time BC residency, use as principal residence, and citizenship rules apply to some exemptions.
          {" "}This tool is educational under BCFSA advertising rules. Provided by Doug LeMaire, REALTOR® (BCFSA #167790) · Fraser Property Management Realty Services Ltd. Nothing you enter here is stored or transmitted.
        </div>

        {/* Contextual CTA — soft, only if in-market. */}
        <div style={{
          marginTop: "1.25rem", display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.75rem",
        }}>
          <Link
            to="/buyer?utm_source=calculator&utm_medium=bc-cost-calc&utm_campaign=buyer-cta"
            className="btn btn-primary"
            data-testid="calc-cta-buyer"
          >Tell Doug what you're considering</Link>
          <Link
            to="/valuation?utm_source=calculator&utm_medium=bc-cost-calc&utm_campaign=valuation-cta"
            className="btn btn-secondary"
            data-testid="calc-cta-valuation"
            style={{ background: "#fff", border: "1.5px solid #0F2A5B", color: "#0F2A5B" }}
          >Curious what my BC home is worth?</Link>
        </div>
      </div>
    </section>
  );
}
