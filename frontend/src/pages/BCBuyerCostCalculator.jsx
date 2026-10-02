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

      <style>{`
        .bcc-wrap { --bcc-navy:#0F2A5B; --bcc-ink:#1D1D1F; --bcc-muted:#6B7280; --bcc-line:rgba(15,42,91,0.09); --bcc-green:#047857; }
        .bcc-eyebrow { font-family:Inter,sans-serif; font-size:0.78rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:var(--bcc-muted); }
        .bcc-h1 { font-family:Sora,"Helvetica Neue",Arial,sans-serif; font-weight:700; letter-spacing:-0.03em; color:var(--bcc-ink); font-size:clamp(2rem,4.2vw,2.9rem); line-height:1.05; margin:0.5rem 0 0.75rem; }
        .bcc-intro { font-family:Inter,sans-serif; color:var(--bcc-muted); line-height:1.7; max-width:46ch; font-size:1.02rem; }
        .bcc-grid { display:grid; grid-template-columns:1fr 1.08fr; gap:22px; margin-top:2rem; align-items:start; }
        .bcc-card { background:#fff; border:1px solid var(--bcc-line); border-radius:22px; padding:28px; box-shadow:0 1px 2px rgba(15,42,91,0.04), 0 18px 48px rgba(15,42,91,0.06); }
        .bcc-card__eyebrow { font-family:Inter,sans-serif; font-size:0.72rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--bcc-muted); margin-bottom:0.9rem; }
        .bcc-pricebox { display:flex; align-items:center; gap:4px; border:1px solid var(--bcc-line); border-radius:16px; padding:14px 18px; background:#FAFBFD; transition:border-color .2s ease, box-shadow .2s ease; }
        .bcc-pricebox:focus-within { border-color:var(--bcc-navy); box-shadow:0 0 0 4px rgba(15,42,91,0.08); }
        .bcc-pricebox span { font-family:Sora,sans-serif; font-weight:700; font-size:clamp(1.8rem,3.5vw,2.4rem); color:var(--bcc-ink); line-height:1; }
        .bcc-priceinput { border:none; outline:none; background:transparent; width:100%; font-family:Sora,sans-serif; font-weight:700; font-size:clamp(1.8rem,3.5vw,2.4rem); color:var(--bcc-ink); line-height:1; letter-spacing:-0.02em; -moz-appearance:textfield; }
        .bcc-priceinput::-webkit-outer-spin-button, .bcc-priceinput::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
        .bcc-fieldlabel { font-family:Inter,sans-serif; font-size:0.82rem; color:var(--bcc-muted); margin-bottom:0.55rem; display:block; }
        .bcc-toggles { margin-top:1.4rem; border-top:1px solid var(--bcc-line); }
        .bcc-togrow { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px 0; border-bottom:1px solid var(--bcc-line); }
        .bcc-togrow:last-child { border-bottom:none; }
        .bcc-togtext { font-family:Inter,sans-serif; }
        .bcc-togtext b { display:block; font-weight:600; font-size:0.98rem; color:var(--bcc-ink); }
        .bcc-togtext small { color:var(--bcc-muted); font-size:0.8rem; }
        .bcc-sw { position:relative; width:50px; height:30px; flex:0 0 auto; }
        .bcc-sw input { position:absolute; inset:0; opacity:0; margin:0; width:100%; height:100%; cursor:pointer; z-index:2; }
        .bcc-sw .track { position:absolute; inset:0; background:#DEE3EC; border-radius:999px; transition:background .28s cubic-bezier(.4,.2,.2,1); }
        .bcc-sw .thumb { position:absolute; top:3px; left:3px; width:24px; height:24px; background:#fff; border-radius:50%; box-shadow:0 1px 3px rgba(0,0,0,0.22); transition:transform .28s cubic-bezier(.4,.2,.2,1); }
        .bcc-sw input:checked ~ .track { background:var(--bcc-navy); }
        .bcc-sw input:checked ~ .thumb { transform:translateX(20px); }
        .bcc-results { }
        .bcc-row { display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:11px 0; font-family:Inter,sans-serif; font-size:0.96rem; color:var(--bcc-ink); border-bottom:1px solid var(--bcc-line); }
        .bcc-row.green { color:var(--bcc-green); }
        .bcc-row a { color:var(--bcc-navy); text-decoration:none; border-bottom:1px solid rgba(15,42,91,0.25); }
        .bcc-row a:hover { border-color:var(--bcc-navy); }
        .bcc-row--sub { border-bottom:none; padding-bottom:4px; }
        .bcc-row--sub b { color:var(--bcc-ink); font-weight:700; font-size:1.02rem; }
        .bcc-subhead { font-family:Inter,sans-serif; font-size:0.72rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--bcc-muted); margin:1.1rem 0 0.2rem; }
        .bcc-row--minor { font-size:0.88rem; color:var(--bcc-muted); padding:8px 0; }
        .bcc-total { margin-top:1.4rem; background:var(--bcc-navy); border-radius:18px; padding:22px 24px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; box-shadow:0 14px 36px rgba(15,42,91,0.22); }
        .bcc-total__label { font-family:Inter,sans-serif; font-size:0.78rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:rgba(255,255,255,0.72); }
        .bcc-total__num { font-family:Sora,sans-serif; font-weight:700; font-size:clamp(1.5rem,3.2vw,2rem); color:#F5D48A; letter-spacing:-0.01em; line-height:1.1; }
        .bcc-reveal { animation:bccReveal .34s cubic-bezier(.2,.7,.3,1) both; }
        @keyframes bccReveal { from { opacity:0; transform:translateY(-7px); } to { opacity:1; transform:translateY(0); } }
        .bcc-ctas { margin-top:1.5rem; display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; }
        @media (max-width:860px){ .bcc-grid { grid-template-columns:1fr; } }
        @media (prefers-reduced-motion:reduce){ .bcc-reveal { animation:none; } }
      `}</style>

      <div className="container-x bcc-wrap" style={{ maxWidth: "62rem" }}>
        <IdentityLine practice="REALTOR® · Educational calculator (not tax or legal advice)" size="md" testId="calc-identity"/>
        <div className="bcc-eyebrow">Free BC calculator</div>
        <h1 className="bcc-h1">BC Buyer Cost Calculator <span style={{ color: "var(--bcc-muted)", fontWeight: 600 }}>(2026)</span></h1>
        <p className="bcc-intro">
          Estimate your <strong>Property Transfer Tax</strong>, First-Time Home Buyer exemption, GST on new construction, legal &amp; inspection, and total closing costs for any BC purchase — instantly.
          Everything runs in your browser; nothing is stored or sent to Doug.
        </p>

        <div className="bcc-grid">
          {/* LEFT — inputs */}
          <div className="bcc-card" data-testid="calc-inputs">
            <div className="bcc-card__eyebrow">Your purchase</div>
            <label className="bcc-fieldlabel" htmlFor="calc-price">BC purchase price</label>
            <div className="bcc-pricebox">
              <span>$</span>
              <input
                id="calc-price"
                className="bcc-priceinput"
                type="number"
                min="0"
                step="10000"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                data-testid="calc-price"
              />
            </div>

            <div className="bcc-toggles">
              <div className="bcc-togrow">
                <div className="bcc-togtext">
                  <b>First-time home buyer</b>
                  <small>BC FTHB program</small>
                </div>
                <label className="bcc-sw">
                  <input type="checkbox" checked={fthb} onChange={(e) => { setFthb(e.target.checked); if (e.target.checked) setNewBuild(false); }} data-testid="calc-fthb" aria-label="First-Time Home Buyer"/>
                  <span className="track" aria-hidden="true"/>
                  <span className="thumb" aria-hidden="true"/>
                </label>
              </div>
              <div className="bcc-togrow">
                <div className="bcc-togtext">
                  <b>Newly built home</b>
                  <small>Never lived-in</small>
                </div>
                <label className="bcc-sw">
                  <input type="checkbox" checked={newBuild} onChange={(e) => { setNewBuild(e.target.checked); if (e.target.checked) setFthb(false); }} data-testid="calc-newbuild" aria-label="Newly built home"/>
                  <span className="track" aria-hidden="true"/>
                  <span className="thumb" aria-hidden="true"/>
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT — results */}
          <div className="bcc-card">
            <div className="bcc-card__eyebrow">Estimated costs</div>
            <div data-testid="calc-results" className="bcc-results">
              <div className="bcc-row">
                <span><Link to="/glossary/property-transfer-tax">Property Transfer Tax</Link> (gross)</span>
                <strong data-testid="calc-ptt-gross">{fmt(calc.ptt_gross)}</strong>
              </div>
              {fthb && (
                <div className="bcc-row green bcc-reveal">
                  <span><Link to="/glossary/first-time-home-buyers-program">FTHB waiver</Link></span>
                  <strong data-testid="calc-fthb-waiver">− {fmt(calc.fthb_waiver)}</strong>
                </div>
              )}
              {newBuild && !fthb && (
                <div className="bcc-row green bcc-reveal">
                  <span>New-build partial exemption</span>
                  <strong>− {fmt(calc.nb_waiver)}</strong>
                </div>
              )}
              <div className="bcc-row bcc-row--sub">
                <b>PTT payable</b>
                <b data-testid="calc-ptt-net" style={{ color: "var(--bcc-navy)" }}>{fmt(calc.ptt_net)}</b>
              </div>

              {newBuild && (
                <div className="bcc-reveal">
                  <div className="bcc-row">
                    <span><Link to="/glossary/gst-new-housing-rebate">GST 5%</Link></span>
                    <span>{fmt(calc.gst.gst)}</span>
                  </div>
                  <div className="bcc-row green">
                    <span>GST New Housing Rebate</span>
                    <span>− {fmt(calc.gst.rebate)}</span>
                  </div>
                  <div className="bcc-row bcc-row--sub">
                    <b>GST net</b>
                    <b data-testid="calc-gst-net">{fmt(calc.gst.net)}</b>
                  </div>
                </div>
              )}

              <div className="bcc-subhead">Other estimated closing costs</div>
              {Object.values(OTHER).map((o) => (
                <div key={o.label} className="bcc-row bcc-row--minor">
                  <span>{o.label}</span>
                  <span style={{ whiteSpace: "nowrap" }}>{fmt(o.low)} – {fmt(o.high)}</span>
                </div>
              ))}

              <div className="bcc-total">
                <span className="bcc-total__label">Estimated total closing costs</span>
                <strong data-testid="calc-total" className="bcc-total__num">{fmt(calc.est_low)} – {fmt(calc.est_high)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance strip — mandatory before any onward CTA. */}
        <div className="paper" data-testid="calc-compliance" style={{
          marginTop: "1.4rem", background: "#F0F4FB", borderRadius: 18,
          borderColor: "rgba(15,42,91,0.12)", padding: "1.1rem 1.25rem",
          fontFamily: "Inter,sans-serif", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--muted)",
        }}>
          <strong style={{ color: "#0F2A5B" }}>Not tax or legal advice.</strong> Rates verified for BC 2026 at time of build; the province and CRA may adjust thresholds. Verify totals with your lawyer / notary before firming an offer. Full-time BC residency, use as principal residence, and citizenship rules apply to some exemptions.
          {" "}This tool is educational under BCFSA advertising rules. Provided by Doug LeMaire, REALTOR® (BCFSA #167790) · Fraser Property Management Realty Services Ltd. Nothing you enter here is stored or transmitted.
        </div>

        {/* Contextual CTA — soft, only if in-market. */}
        <div className="bcc-ctas">
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
