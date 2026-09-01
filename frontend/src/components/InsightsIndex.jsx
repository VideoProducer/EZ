// ── /insights — the index landing page for all /insights/{slug} content ──
import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { INSIGHTS_CATALOG } from "../data/insightsCatalog";

const KIND_LABELS = {
  comparison: "Neighbourhood Comparisons",
  funnel: "Life-Stage Guides",
  faq: "Frequently Asked",
};

export default function InsightsIndex() {
  const grouped = {};
  Object.entries(INSIGHTS_CATALOG).forEach(([slug, item]) => {
    (grouped[item.kind] = grouped[item.kind] || []).push({ slug, ...item });
  });
  return (
    <section className="section">
      <Helmet>
        <title>BC Real Estate Insights — Comparisons, Guides & FAQs | EZtoFind.ca</title>
        <meta name="description" content="Neighbourhood comparisons, life-stage guides, and BC real-estate FAQs from Doug LeMaire, REALTOR® — with statute citations and BCFSA-compliant answers." />
        <link rel="canonical" href="https://eztofind.ca/insights" />
      </Helmet>
      <div className="container-x" style={{ maxWidth: 1000 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="eyebrow">Knowledge Hub · Insights</div>
          <h1 className="section-title">BC Real Estate Insights</h1>
          <p className="section-sub">Comparisons, guides, and frequently-asked questions on buying and selling in BC.</p>
        </div>
        {["comparison", "funnel", "faq"].map(k => grouped[k] && (
          <div key={k} style={{ marginBottom: "2.5rem" }}>
            <h2 className="font-display" style={{ fontSize: "1.75rem", color: "var(--brand-navy)", borderBottom: "2px solid rgba(15,42,91,0.12)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>{KIND_LABELS[k]}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "0.75rem" }}>
              {grouped[k].map(it => (
                <Link key={it.slug} to={`/insights/${it.slug}`} data-testid={`insights-index-${it.slug}`}
                  style={{ display: "block", padding: "1rem 1.15rem", background: "white", border: "1px solid rgba(15,42,91,0.12)", borderRadius: 10, textDecoration: "none" }}>
                  <div style={{ fontFamily: "Inter,sans-serif", fontSize: "0.75rem", color: "var(--brand-blue)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 4 }}>{it.eyebrow}</div>
                  <div style={{ fontFamily: "Playfair Display, serif", fontSize: "1.05rem", color: "var(--brand-navy)", fontWeight: 700, lineHeight: 1.25 }}>{it.title}</div>
                  <div style={{ fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "var(--muted)", marginTop: 4, lineHeight: 1.45 }}>{it.subtitle}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
