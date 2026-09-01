// ── /tools/closing-cost-estimator-bc — full-line closing-cost estimator ──
// Line items pulled from the standard BC residential closing:
//   • PTT (auto-computed via same slab logic as PttCalculator)
//   • GST on new-home (5% + 36% rebate ≤ $350K, phase-out to $450K)
//   • Legal/notary $1,500–$2,500
//   • Title insurance $400
//   • Home inspection $650
//   • Appraisal $400
//   • Property-tax + strata adjustments (per user input)
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

function calcPtt(price) {
  let t = 0;
  const b1 = Math.min(price, 200000); t += b1 * 0.01;
  if (price > 200000) t += (Math.min(price, 2000000) - 200000) * 0.02;
  if (price > 2000000) t += (Math.min(price, 3000000) - 2000000) * 0.03;
  if (price > 3000000) t += (price - 3000000) * 0.05;
  return t;
}
function calcGstRebate(price) {
  if (price <= 350000) return price * 0.05 * 0.36;
  if (price >= 450000) return 0;
  const gross = price * 0.05 * 0.36;
  const frac = (450000 - price) / 100000;
  return gross * frac;
}

export default function ClosingCostEstimator() {
  const [price, setPrice] = useState(1200000);
  const [isNewBuild, setIsNewBuild] = useState(false);
  const [taxAdj, setTaxAdj] = useState(1200);
  const [strataAdj, setStrataAdj] = useState(0);
  const ptt = calcPtt(price);
  const gst = isNewBuild ? price * 0.05 : 0;
  const gstRebate = isNewBuild ? calcGstRebate(price) : 0;
  const legal = 2000;
  const title = 400;
  const inspection = 650;
  const appraisal = 400;
  const total = ptt + gst - gstRebate + legal + title + inspection + appraisal + taxAdj + strataAdj;
  const rows = [
    ["Property Transfer Tax", ptt],
    ...(isNewBuild ? [["GST (5%)", gst], ["GST rebate", -gstRebate]] : []),
    ["Legal / notary fees", legal],
    ["Title insurance", title],
    ["Home inspection", inspection],
    ["Appraisal", appraisal],
    ["Property tax adjustment", taxAdj],
    ["Strata fee adjustment", strataAdj],
  ];
  return (
    <section className="section">
      <Helmet>
        <title>BC Closing Cost Estimator — 2026 Complete Breakdown | EZtoFind.ca</title>
        <meta name="description" content="Full BC residential closing cost estimator: PTT, GST, legal fees, title insurance, inspection, appraisal, adjustments. Instant total from Doug LeMaire, REALTOR®." />
        <link rel="canonical" href="https://eztofind.ca/tools/closing-cost-estimator-bc" />
      </Helmet>
      <div className="container-x" style={{ maxWidth: 780 }}>
        <div className="eyebrow">Tools · Closing Costs</div>
        <h1 className="section-title" style={{ margin: "0.35rem 0 0.4rem" }}>BC Closing Cost Estimator</h1>
        <p className="section-sub">Every line item a BC buyer typically pays on closing day.</p>
        <div style={{ background: "var(--paper,#FAFAF7)", border: "1px solid rgba(15,42,91,0.15)", borderRadius: 12, padding: "1.5rem", marginTop: "1.5rem" }}>
          <label style={{ display: "block", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", fontWeight: 600, marginBottom: 6 }}>Purchase price</label>
          <input type="number" min="0" step="10000" value={price} onChange={e => setPrice(Number(e.target.value) || 0)} data-testid="cc-price" style={{ width: "100%", padding: "0.75rem 1rem", fontSize: "1.1rem", border: "2px solid rgba(15,42,91,0.15)", borderRadius: 8, fontFamily: "Inter,sans-serif" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
            <label style={{ fontFamily: "Inter,sans-serif", fontSize: "0.88rem" }}>Property tax pro-ration
              <input type="number" min="0" value={taxAdj} onChange={e => setTaxAdj(Number(e.target.value) || 0)} style={{ width: "100%", padding: "0.5rem", marginTop: 4, border: "1px solid rgba(15,42,91,0.15)", borderRadius: 6 }} />
            </label>
            <label style={{ fontFamily: "Inter,sans-serif", fontSize: "0.88rem" }}>Strata fee pro-ration
              <input type="number" min="0" value={strataAdj} onChange={e => setStrataAdj(Number(e.target.value) || 0)} style={{ width: "100%", padding: "0.5rem", marginTop: 4, border: "1px solid rgba(15,42,91,0.15)", borderRadius: 6 }} />
            </label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "1rem", fontFamily: "Inter,sans-serif" }}>
            <input type="checkbox" checked={isNewBuild} onChange={e => setIsNewBuild(e.target.checked)} data-testid="cc-newbuild" /> New-build home (GST + rebate applies)
          </label>
        </div>
        <div style={{ background: "white", border: "1px solid rgba(15,42,91,0.12)", borderRadius: 12, padding: "1.25rem", marginTop: "1rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter,sans-serif", fontSize: "0.92rem" }}>
            <tbody>
              {rows.map(([label, val]) => (
                <tr key={label} style={{ borderBottom: "1px solid rgba(15,42,91,0.06)" }}>
                  <td style={{ padding: "0.5rem 0", color: "var(--ink)" }}>{label}</td>
                  <td style={{ padding: "0.5rem 0", textAlign: "right", color: val < 0 ? "var(--brand-green,#059669)" : "var(--ink)", fontWeight: 600 }}>${Math.round(val).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: "var(--brand-navy)", color: "white", padding: "1.25rem 1.5rem", borderRadius: 12, marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: "0.9rem" }}>Estimated total closing costs</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 900, color: "#F5A623" }} data-testid="cc-total">${Math.round(total).toLocaleString()}</div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
          <Link to="/tools/ptt-calculator-bc" className="btn btn-outline">PTT calculator →</Link>
          <Link to="/valuation" className="btn btn-primary">Get a home valuation</Link>
        </div>
        <div style={{ marginTop: "1.5rem", fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.55 }}>
          Estimate only — actual closing costs are prepared by your notary/lawyer. Speak with a licensed mortgage broker + accountant for authoritative figures. Doug LeMaire, REALTOR® · BCFSA #167790 · Fraser Property Management Realty Services Ltd.
        </div>
      </div>
    </section>
  );
}
