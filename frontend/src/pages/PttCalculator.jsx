// ── /tools/ptt-calculator-bc — BC Property Transfer Tax calculator ────
// Live 2026 BC PTT slabs:
//   • 1% on the first $200,000
//   • 2% on $200,001 – $2,000,000
//   • 3% on $2,000,001 – $3,000,000
//   • 5% on the portion above $3,000,000
// Foreign-buyer additional PTT: 20% on the full purchase price in specific
// regional districts (Metro Van, Capital, Fraser Valley, Central Okanagan,
// Nanaimo). First-time buyer exemption: full under $835K, partial up to $860K.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

function calcPtt(price) {
  let t = 0;
  const b1 = Math.min(price, 200000);
  t += b1 * 0.01;
  if (price > 200000) t += (Math.min(price, 2000000) - 200000) * 0.02;
  if (price > 2000000) t += (Math.min(price, 3000000) - 2000000) * 0.03;
  if (price > 3000000) t += (price - 3000000) * 0.05;
  return t;
}
function calcFtbExemption(price) {
  // 2024 thresholds: full exemption ≤ $835K; partial to $860K; none above.
  if (price <= 835000) return calcPtt(price);
  if (price <= 860000) {
    // Straight-line partial phase-out
    const frac = (860000 - price) / 25000;
    return calcPtt(price) * frac;
  }
  return 0;
}

export default function PttCalculator() {
  const [price, setPrice] = useState(1200000);
  const [foreign, setForeign] = useState(false);
  const [ftb, setFtb] = useState(false);
  const ptt = calcPtt(price);
  const exempt = ftb ? calcFtbExemption(price) : 0;
  const foreignAdd = foreign ? price * 0.20 : 0;
  const total = ptt - exempt + foreignAdd;
  return (
    <section className="section">
      <Helmet>
        <title>BC Property Transfer Tax (PTT) Calculator — 2026 Rates | EZtoFind.ca</title>
        <meta name="description" content="Free 2026 BC Property Transfer Tax calculator. First-time buyer exemption, foreign-buyer additional PTT, all four tax bands. Instant estimate from Doug LeMaire, REALTOR®." />
        <link rel="canonical" href="https://eztofind.ca/tools/ptt-calculator-bc" />
      </Helmet>
      <div className="container-x" style={{ maxWidth: 780 }}>
        <div className="eyebrow">Tools · Tax Calculator</div>
        <h1 className="section-title" style={{ margin: "0.35rem 0 0.4rem" }}>BC Property Transfer Tax Calculator</h1>
        <p className="section-sub">2026 rates — 1% / 2% / 3% / 5% slabs, plus the FTB exemption and 20% foreign-buyer additional PTT.</p>
        <div style={{ background: "var(--paper,#FAFAF7)", border: "1px solid rgba(15,42,91,0.15)", borderRadius: 12, padding: "1.5rem", marginTop: "1.5rem" }}>
          <label style={{ display: "block", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", fontWeight: 600, marginBottom: 6 }}>Purchase price</label>
          <input type="number" min="0" step="10000" value={price} onChange={e => setPrice(Number(e.target.value) || 0)} data-testid="ptt-price"
            style={{ width: "100%", padding: "0.75rem 1rem", fontSize: "1.1rem", border: "2px solid rgba(15,42,91,0.15)", borderRadius: 8, fontFamily: "Inter,sans-serif" }} />
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter,sans-serif" }}>
              <input type="checkbox" checked={ftb} onChange={e => setFtb(e.target.checked)} data-testid="ptt-ftb" /> First-time buyer (BC)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter,sans-serif" }}>
              <input type="checkbox" checked={foreign} onChange={e => setForeign(e.target.checked)} data-testid="ptt-foreign" /> Foreign national (20% additional)
            </label>
          </div>
        </div>
        <div style={{ background: "var(--brand-navy)", color: "white", padding: "1.5rem", borderRadius: 12, marginTop: "1rem" }}>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: "0.85rem", opacity: 0.85 }}>Estimated PTT</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 900, letterSpacing: "-0.02em", color: "#F5A623" }} data-testid="ptt-total">
            ${Math.round(total).toLocaleString()}
          </div>
          <div style={{ marginTop: "0.75rem", fontFamily: "Inter,sans-serif", fontSize: "0.85rem", lineHeight: 1.6 }}>
            Base PTT: ${Math.round(ptt).toLocaleString()}
            {exempt > 0 && <> · FTB exemption: −${Math.round(exempt).toLocaleString()}</>}
            {foreignAdd > 0 && <> · Foreign-buyer additional: +${Math.round(foreignAdd).toLocaleString()}</>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
          <Link to="/glossary/property-transfer-tax-ptt" className="btn btn-outline">Read full PTT glossary term →</Link>
          <Link to="/tools/closing-cost-estimator-bc" className="btn btn-outline">Closing-cost estimator →</Link>
          <Link to="/valuation" className="btn btn-primary">Get a home valuation</Link>
        </div>
        <div style={{ marginTop: "1.5rem", fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.55 }}>
          Estimate only — actual PTT is calculated by your notary/lawyer at closing. Consult a licensed BC accountant or notary for authoritative figures. Doug LeMaire, REALTOR® · BCFSA #167790 · Fraser Property Management Realty Services Ltd.
        </div>
      </div>
    </section>
  );
}
