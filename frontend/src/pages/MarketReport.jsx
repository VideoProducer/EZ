// ============================================================================
//  MarketReport — Monthly BC Market Report page (public, AEO-optimized)
//
//  Route:  /market-report            → latest snapshot
//  Route:  /market-report/:ym        → specific month (YYYY-MM)
//
//  Renders:
//    • Hero: headline stat + speakable summary
//    • Provincial totals card
//    • Highlights (5 bullet points from backend)
//    • City-by-city table (sortable client-side)
//    • JSON-LD Dataset + FAQPage + Speakable schema (for LLM citation)
//    • BCFSA compliance footer (already elsewhere on site)
// ============================================================================
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmt$ = (n) => (typeof n === "number" ? n.toLocaleString("en-CA", {
  style: "currency", currency: "CAD", maximumFractionDigits: 0,
}) : "—");
const fmtN = (n) => (typeof n === "number" ? n.toLocaleString("en-CA") : "—");

function MonthLabel({ ym }) {
  if (!ym) return null;
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return <>{d.toLocaleDateString("en-CA", { year: "numeric", month: "long", timeZone: "UTC" })}</>;
}

export default function MarketReport() {
  const params = useParams();
  const navigate = useNavigate();
  const [snap, setSnap] = useState(null);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [sortKey, setSortKey] = useState("count");
  const [sortDir, setSortDir] = useState("desc");

  const ymParam = params.ym;

  useEffect(() => {
    setLoading(true); setErr(null);
    const url = ymParam ? `${API}/market-report/${encodeURIComponent(ymParam)}` : `${API}/market-report`;
    axios.get(url).then(r => {
      if (ymParam) {
        setSnap(r.data);
        // Also fetch months list for the dropdown.
        axios.get(`${API}/market-report`).then(r2 => setMonths(r2.data.available_months || [])).catch(() => {});
      } else {
        setSnap(r.data.latest);
        setMonths(r.data.available_months || []);
      }
    }).catch(e => setErr(e?.response?.status === 404 ? "notfound" : "error"))
      .finally(() => setLoading(false));
  }, [ymParam]);

  const sortedCities = useMemo(() => {
    if (!snap?.cities) return [];
    const rows = [...snap.cities];
    rows.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      const cmp = (typeof av === "number" && typeof bv === "number") ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [snap, sortKey, sortDir]);

  const toggleSort = (k) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "city" ? "asc" : "desc"); }
  };

  const monthLabel = useMemo(() => {
    if (!snap?.ym) return "";
    const [y, m] = snap.ym.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1))
      .toLocaleDateString("en-CA", { year: "numeric", month: "long", timeZone: "UTC" });
  }, [snap?.ym]);

  // JSON-LD Dataset + FAQPage + Speakable schema for AEO citation.
  useEffect(() => {
    if (!snap) return;
    const site = window.location.origin;
    const url = `${site}/market-report/${snap.ym}`;
    const dataset = {
      "@context": "https://schema.org",
      "@type": "Dataset",
      "name": `British Columbia Real Estate Market Report — ${monthLabel}`,
      "description": snap.highlights?.join(" ") || "",
      "url": url,
      "dateModified": snap.generated_at,
      "keywords": [
        "BC real estate", "British Columbia housing", "median list price",
        "MLS listings", "Vancouver Surrey Burnaby Kelowna",
      ],
      "creator": { "@type": "Organization", "name": "EZtoFind.ca",
                   "url": site, "logo": `${site}/logo.png` },
      "license": "https://creativecommons.org/licenses/by/4.0/",
      "spatialCoverage": { "@type": "AdministrativeArea",
                           "name": "British Columbia, Canada" },
      "temporalCoverage": snap.ym,
      "variableMeasured": [
        "Median list price", "P25 list price", "P75 list price",
        "Median price per square foot", "Active listing count",
        "Property type distribution",
      ],
      "distribution": [{
        "@type": "DataDownload", "encodingFormat": "application/json",
        "contentUrl": `${site}/api/market-report/${snap.ym}`,
      }],
    };
    const faq = {
      "@context": "https://schema.org", "@type": "FAQPage",
      "mainEntity": [
        {"@type":"Question","name":`What is the median BC home price in ${monthLabel}?`,
         "acceptedAnswer":{"@type":"Answer","text": snap.highlights?.[0] || ""}},
        {"@type":"Question","name":`Which BC city has the most active listings in ${monthLabel}?`,
         "acceptedAnswer":{"@type":"Answer","text": snap.highlights?.[1] || ""}},
        {"@type":"Question","name":`Which BC city has the highest median list price in ${monthLabel}?`,
         "acceptedAnswer":{"@type":"Answer","text": snap.highlights?.[2] || ""}},
        {"@type":"Question","name":`Which BC market is most affordable in ${monthLabel}?`,
         "acceptedAnswer":{"@type":"Answer","text": snap.highlights?.[3] || ""}},
      ],
    };
    const speakable = {
      "@context": "https://schema.org", "@type": "WebPage",
      "name": `BC Real Estate Market Report — ${monthLabel}`,
      "url": url,
      "speakable": {
        "@type": "SpeakableSpecification",
        "xpath": ["/html/head/title", "//*[@data-speakable='report-highlights']"],
      },
    };
    const attach = (id, data) => {
      let el = document.getElementById(id);
      if (!el) { el = document.createElement("script"); el.id = id; el.type = "application/ld+json"; document.head.appendChild(el); }
      el.textContent = JSON.stringify(data);
    };
    attach("mr-dataset-jsonld", dataset);
    attach("mr-faq-jsonld", faq);
    attach("mr-speakable-jsonld", speakable);
    document.title = `BC Real Estate Market Report — ${monthLabel} · EZtoFind.ca`;
    return () => {
      ["mr-dataset-jsonld", "mr-faq-jsonld", "mr-speakable-jsonld"].forEach(id => {
        const e = document.getElementById(id); if (e) e.remove();
      });
    };
  }, [snap, monthLabel]);

  if (loading) return <div style={sHero}><p>Loading market report…</p></div>;
  if (err === "notfound") return (
    <div style={sHero}>
      <h1>No report yet for {ymParam}</h1>
      <p>We snapshot each month's data on the 1st of the following month.</p>
      <Link to="/market-report" style={sLink}>← Back to latest report</Link>
    </div>
  );
  if (err || !snap) return <div style={sHero}><p>Sorry, we couldn't load the report.</p></div>;

  const t = snap.totals || {};

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "2rem 1.25rem 5rem", fontFamily: "Inter, sans-serif", color: "var(--ink, #0F172A)" }}>

      {/* HERO */}
      <div style={sHero} data-testid="market-report-hero">
        <div style={sEyebrow}>Original BC real estate data — updated monthly</div>
        <h1 style={sH1}>British Columbia Market Report — {monthLabel}</h1>
        <p data-speakable="report-highlights" style={sLead}>
          {snap.highlights?.[0]} {snap.highlights?.[1]}
        </p>
        {months.length > 1 && (
          <select
            value={snap.ym}
            onChange={(e) => navigate(`/market-report/${e.target.value}`)}
            data-testid="market-report-month-picker"
            style={sSelect}
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {/* TOTALS */}
      <div style={sTotalsRow} data-testid="market-report-totals">
        <Stat label="Active MLS® listings"      value={fmtN(t.active_listings)} />
        <Stat label="Cities covered"           value={fmtN(t.cities_covered)} />
        <Stat label="Province-wide median"     value={fmt$(t.median_price)} />
        <Stat label="Median $/sqft"            value={t.median_price_per_sqft ? `$${t.median_price_per_sqft}` : "—"} />
      </div>

      {/* HIGHLIGHTS */}
      <section style={sCard} data-testid="market-report-highlights">
        <h2 style={sH2}>Key takeaways</h2>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.75 }}>
          {(snap.highlights || []).map((h, i) => <li key={i}>{h}</li>)}
        </ul>
      </section>

      {/* CITY TABLE */}
      <section style={sCard} data-testid="market-report-cities">
        <h2 style={sH2}>City-by-city breakdown</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={sTable}>
            <thead>
              <tr>
                <Th onClick={() => toggleSort("city")}          active={sortKey === "city"}          dir={sortDir}>City</Th>
                <Th onClick={() => toggleSort("count")}         active={sortKey === "count"}         dir={sortDir} right>Active</Th>
                <Th onClick={() => toggleSort("median_price")}  active={sortKey === "median_price"}  dir={sortDir} right>Median</Th>
                <Th onClick={() => toggleSort("p25")}           active={sortKey === "p25"}           dir={sortDir} right>P25</Th>
                <Th onClick={() => toggleSort("p75")}           active={sortKey === "p75"}           dir={sortDir} right>P75</Th>
                <Th onClick={() => toggleSort("median_price_per_sqft")} active={sortKey === "median_price_per_sqft"} dir={sortDir} right>$/sqft</Th>
                <Th onClick={() => toggleSort("listed_this_month")} active={sortKey === "listed_this_month"} dir={sortDir} right>Listed this mo.</Th>
              </tr>
            </thead>
            <tbody>
              {sortedCities.map(c => (
                <tr key={c.city} data-testid={`market-report-row-${c.city.toLowerCase().replace(/\s+/g,"-")}`}>
                  <td style={sTd}>{c.city}</td>
                  <td style={sTdR}>{fmtN(c.count)}</td>
                  <td style={sTdR}><strong>{fmt$(c.median_price)}</strong></td>
                  <td style={sTdR}>{fmt$(c.p25)}</td>
                  <td style={sTdR}>{fmt$(c.p75)}</td>
                  <td style={sTdR}>{c.median_price_per_sqft ? `$${c.median_price_per_sqft}` : "—"}</td>
                  <td style={sTdR}>{fmtN(c.listed_this_month)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={sFineprint}>
          Source: CREA DDF® active MLS® listings as of{" "}
          {snap.generated_at ? new Date(snap.generated_at).toLocaleDateString("en-CA", { dateStyle: "medium" }) : "this month"}.
          Only cities with 20+ active listings are included. Cite this data with a link to{" "}
          <code>eztofind.ca/market-report/{snap.ym}</code>.
        </p>
      </section>

      {/* METHODOLOGY */}
      <section style={sCard}>
        <h2 style={sH2}>Methodology</h2>
        <p>We aggregate active MLS® listings sourced through CREA's DDF® feed for the calendar month. Median values use the 50th percentile of list prices; P25 and P75 are the 25th and 75th percentiles. Price-per-square-foot is computed only for listings that report a valid living area. Sold-price data is not available through the DDF® feed and therefore not included in this report.</p>
        <p style={{ margin: 0 }}>
          Data licensed under a <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC-BY 4.0</a> license — you may reuse it with attribution back to{" "}
          <a href="https://eztofind.ca">eztofind.ca</a>.
        </p>
      </section>

      <p style={{ marginTop: "2rem", fontSize: "0.85rem", color: "var(--muted, #64748B)" }}>
        This report is informational only and is not financial or real estate advice. For your specific situation, consult a licensed BC REALTOR® or a BCFSA-regulated real estate professional.
      </p>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div style={sStat}>
      <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted, #64748B)" }}>{label}</div>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: "1.75rem", fontWeight: 700, color: "var(--brand-navy, #0F2A5B)", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Th({ children, onClick, active, dir, right }) {
  return (
    <th onClick={onClick} style={{
      textAlign: right ? "right" : "left", padding: "0.75rem 0.6rem", cursor: "pointer",
      borderBottom: "2px solid #E2E8F0", fontFamily: "Sora, sans-serif",
      fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em",
      color: active ? "var(--brand-navy)" : "var(--muted, #64748B)",
      userSelect: "none",
    }}>
      {children}{active ? (dir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}

// styles
const sHero      = { padding: "2.5rem 0 1.5rem", borderBottom: "1px solid #E2E8F0", marginBottom: "1.75rem" };
const sEyebrow   = { fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--brand-blue, #2563EB)", fontWeight: 600 };
const sH1        = { fontFamily: "Sora, sans-serif", fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.15, margin: "0.6rem 0 0.75rem", color: "var(--brand-navy, #0F2A5B)" };
const sH2        = { fontFamily: "Sora, sans-serif", fontSize: "1.35rem", margin: "0 0 0.9rem", color: "var(--brand-navy, #0F2A5B)" };
const sLead      = { fontSize: "1.05rem", lineHeight: 1.6, color: "var(--ink, #0F172A)", margin: 0 };
const sLink      = { color: "var(--brand-blue)", textDecoration: "none", fontWeight: 600 };
const sSelect    = { marginTop: "1rem", padding: "0.5rem 0.9rem", border: "1px solid #CBD5E1", borderRadius: 8, fontFamily: "Inter, sans-serif" };
const sTotalsRow = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.9rem", marginBottom: "1.5rem" };
const sStat      = { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "1rem 1.1rem" };
const sCard      = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "1.5rem 1.5rem 1.25rem", marginBottom: "1.5rem" };
const sTable     = { width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: "0.92rem" };
const sTd        = { padding: "0.6rem", borderBottom: "1px solid #F1F5F9" };
const sTdR       = { ...sTd, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const sFineprint = { marginTop: "1rem", fontSize: "0.8rem", color: "var(--muted, #64748B)", lineHeight: 1.55 };
