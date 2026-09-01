// ── /insights/:slug — data-driven long-tail SEO/AEO landing page ─────
// Reads INSIGHTS_CATALOG (data/insightsCatalog.js) and renders the correct
// layout for each `kind` (comparison / funnel / faq). Every page is
// compliance-hardened by construction — see the catalog file for details.
//
// Because we're inside the App.js router space, this file imports Helmet
// and Link from the same libraries the rest of the codebase uses.
import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { INSIGHTS_CATALOG } from "../data/insightsCatalog";
import { AnswerFirstMeta } from "../utils/answerFirst";

const SITE = "https://eztofind.ca";

// Curated per-slug "single official source" map for the insight pages
// that carry factual thresholds / dollar amounts. Any slug not listed
// here falls back to no source badge (safer than pointing to a generic
// gov.bc.ca home page). Update when a new hard-number page is added.
const INSIGHT_OFFICIAL_SOURCES = {
  "cost-of-living-maple-ridge-vs-langley": { title: "BC Consumer Price Index — Statistics Canada Table 18-10-0004-01", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401", publisher: "Statistics Canada" },
  "cost-of-living-maple-ridge-vs-abbotsford": { title: "BC Consumer Price Index — Statistics Canada Table 18-10-0004-01", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401", publisher: "Statistics Canada" },
  "cost-of-living-white-rock-vs-south-surrey": { title: "BC Consumer Price Index — Statistics Canada Table 18-10-0004-01", url: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401", publisher: "Statistics Canada" },
  "property-transfer-tax-first-time-buyer": { title: "First Time Home Buyers' Program — gov.bc.ca", url: "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/first-time-home-buyers", publisher: "Province of British Columbia" },
  "foreign-buyer-ban-canada-2027": { title: "Prohibition on the Purchase of Residential Property by Non-Canadians Act", url: "https://laws-lois.justice.gc.ca/eng/acts/P-25.2/", publisher: "Government of Canada" },
};

export default function InsightsPage() {
  const { slug } = useParams();
  const item = INSIGHTS_CATALOG[slug];
  if (!item) return <Navigate to="/insights" replace />;
  const url = `${SITE}/insights/${slug}`;
  const desc = item.intro.slice(0, 260);
  // Article schema per Article + FAQPage where applicable
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    "headline": item.title,
    "description": desc,
    "url": url,
    "inLanguage": "en-CA",
    "datePublished": "2026-02-06",
    "dateModified": "2026-02-06",
    "isPartOf": [
      { "@type": "WebSite", "@id": `${SITE}/#website` },
      { "@type": "CollectionPage", "@id": `${SITE}/insights#collection`, "name": "BC Real Estate Insights", "url": `${SITE}/insights` },
    ],
    "author": { "@id": `${SITE}/#doug` },
    "publisher": { "@id": `${SITE}/#organization` },
    "about": { "@type": "Place", "name": "British Columbia, Canada" },
  };
  const faqSchema = item.kind === "faq" || item.kind === "funnel" ? {
    "@context": "https://schema.org", "@type": "FAQPage",
    "@id": `${url}#faq`,
    "isPartOf": { "@type": "Article", "@id": `${url}#article` },
    "inLanguage": "en-CA",
    "mainEntity": (item.sections || []).map(s => ({
      "@type": "Question", "name": s.h,
      "acceptedAnswer": { "@type": "Answer", "text": s.body },
    })),
  } : null;
  return (
    <section className="section">
      <Helmet>
        <title>{`${item.title} | EZtoFind.ca`}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
      </Helmet>
      <div className="container-x" style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: "1rem" }}>
          <div className="eyebrow">{item.eyebrow}</div>
          <h1 className="section-title" style={{ margin: "0.35rem 0 0.4rem" }}>{item.title}</h1>
          <p className="section-sub" style={{ marginTop: 4 }}>{item.subtitle}</p>
        </div>
        {/* Task 6 answer-first (Feb 2026): intro paragraph is the factual
            answer, followed by the As-of / single-official-source meta row.
            Site-wide disclaimer stays at the bottom of the page. */}
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: "1.02rem", lineHeight: 1.7, color: "var(--ink)", marginBottom: "0.5rem" }}>
          {item.intro}
        </p>
        <AnswerFirstMeta
          dateModified={item.dateModified || schema.dateModified}
          source={INSIGHT_OFFICIAL_SOURCES[slug] || null}
          testId="insights-meta"
        />
        {item.kind === "comparison" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              {[item.left, item.right].map((side, i) => (
                <div key={i} style={{ background: "var(--paper, #FAFAF7)", border: "1px solid rgba(15,42,91,0.12)", borderRadius: 12, padding: "1rem 1.15rem" }}>
                  <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.5rem", color: "var(--brand-navy)", margin: "0 0 0.4rem" }}>{side.name}</h2>
                  <div style={{ fontFamily: "Inter,sans-serif", fontSize: "0.88rem", color: "var(--muted)", marginBottom: "0.4rem" }}>{side.muni}</div>
                  <div style={{ fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "var(--ink)", marginBottom: "0.35rem" }}><strong>Population:</strong> {side.pop}</div>
                  <div style={{ fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "var(--ink)", lineHeight: 1.55 }}><strong>Housing stock:</strong> {side.housing}</div>
                  <Link to={`/community/${side.city}`} data-testid={`insights-side-link-${i}`} style={{ display: "inline-block", marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--brand-blue)", fontWeight: 600 }}>Explore /community/{side.city} →</Link>
                </div>
              ))}
            </div>
            <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter,sans-serif", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--brand-navy)" }}>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem", color: "var(--brand-navy)" }}>Attribute</th>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem", color: "var(--brand-navy)" }}>{item.left.name}</th>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem", color: "var(--brand-navy)" }}>{item.right.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {item.facets.map((f, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(15,42,91,0.08)" }}>
                      <td style={{ padding: "0.55rem 0.75rem", color: "var(--muted)", fontWeight: 600 }}>{f.label}</td>
                      <td style={{ padding: "0.55rem 0.75rem", color: "var(--ink)" }}>{f.left}</td>
                      <td style={{ padding: "0.55rem 0.75rem", color: "var(--ink)" }}>{f.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {(item.kind === "funnel" || item.kind === "faq") && (
          <div style={{ marginBottom: "1.5rem" }}>
            {item.sections.map((s, i) => (
              <div key={i} style={{ marginBottom: "1.25rem", paddingBottom: "1.15rem", borderBottom: "1px solid rgba(15,42,91,0.08)" }}>
                <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.35rem", color: "var(--brand-navy)", margin: "0 0 0.5rem" }}>{s.h}</h2>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: "0.95rem", lineHeight: 1.7, color: "var(--ink)", margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        )}
        {/* Money-page CTAs — farm-territory only. Non-farm content would
            route to /referral-request instead per the Feb 2026 spec. */}
        <div style={{ background: "rgba(15,42,91,0.04)", borderRadius: 12, padding: "1.5rem", marginTop: "1rem" }}>
          <p style={{ margin: "0 0 0.75rem", fontFamily: "Inter,sans-serif", color: "var(--muted)", fontSize: "0.9rem" }}>Ready to talk numbers?</p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link to="/valuation" className="btn btn-primary" data-testid="insights-cta-valuation">Try /valuation</Link>
            <Link to="/buyer" className="btn btn-outline" data-testid="insights-cta-buyer">Start /buyer</Link>
            <Link to="/seller" className="btn btn-outline" data-testid="insights-cta-seller">Explore /seller</Link>
            <Link to="/contact" className="btn btn-ghost" data-testid="insights-cta-contact">Contact Doug</Link>
          </div>
        </div>
        <div style={{ marginTop: "1.5rem", fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.55 }}>
          Educational information only — not legal, tax, financial, or real-estate advice. Doug LeMaire, REALTOR® · BCFSA #167790 · Fraser Property Management Realty Services Ltd. Not intended to solicit or induce an agreement already in place.
        </div>
      </div>
    </section>
  );
}
