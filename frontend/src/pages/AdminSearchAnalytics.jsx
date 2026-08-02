// EZtoFind.ca — Admin Search Analytics (Phase D)
// -----------------------------------------------------------------------------
// Shows Doug three insight tables sourced from /api/admin/search-analytics:
//   1. Top queries — what visitors search most (traffic reality-check)
//   2. NO-RESULT queries — the highest-value gap list; direct pointers to
//      new glossary terms / FAQ answers Doug should commission
//   3. Low-confidence queries — some hits but no strong quick answer;
//      opportunities to tighten definitions or add synonyms
//
// PIPA compliance: only shows aggregated query text + counts. IP addresses
// are hashed at write time and never surface here.

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Card = ({ label, value, sub }) => (
  <div className="paper" style={{ padding: "1.1rem 1.25rem", flex: "1 1 12rem", minWidth: "10rem" }}>
    <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 700 }}>{label}</div>
    <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--brand-navy)", fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', lineHeight: 1.1, marginTop: "0.35rem" }}>{value}</div>
    {sub && <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.35rem" }}>{sub}</div>}
  </div>
);

const Table = ({ title, subtitle, rows, emptyMsg, testId, columns, actionForRow }) => (
  <div className="paper" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }} data-testid={testId}>
    <h3 style={{ margin: "0 0 0.35rem", color: "var(--brand-navy)", fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif' }}>{title}</h3>
    {subtitle && <div style={{ color: "var(--muted)", fontFamily: "Inter,sans-serif", fontSize: "0.88rem", marginBottom: "0.85rem", lineHeight: 1.55 }}>{subtitle}</div>}
    {rows.length === 0 ? (
      <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontFamily: "Inter,sans-serif" }}>{emptyMsg}</div>
    ) : (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter,sans-serif", fontSize: "0.9rem" }}>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} style={{ textAlign: c.align || "left", padding: "0.55rem 0.6rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 700, borderBottom: "2px solid var(--brand-navy)" }}>{c.label}</th>
              ))}
              {actionForRow && <th style={{ borderBottom: "2px solid var(--brand-navy)" }}/>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} data-testid={`${testId}-row-${i}`}>
                {columns.map(c => (
                  <td key={c.key} style={{ padding: "0.5rem 0.6rem", borderBottom: "1px solid rgba(15,42,91,0.08)", textAlign: c.align || "left", color: c.key === "query" ? "var(--brand-navy)" : "#1F2937", fontWeight: c.key === "query" ? 600 : 400 }}>
                    {c.render ? c.render(r[c.key], r) : r[c.key]}
                  </td>
                ))}
                {actionForRow && (
                  <td style={{ padding: "0.5rem 0.6rem", borderBottom: "1px solid rgba(15,42,91,0.08)" }}>{actionForRow(r)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default function AdminSearchAnalytics({ headers }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [clusters, setClusters] = useState(null);
  const [clusterKind, setClusterKind] = useState("no_results");
  const [expanded, setExpanded] = useState({});  // cluster index -> bool
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    Promise.all([
      axios.get(`${API}/admin/search-analytics?days=${days}&limit=30`, { headers }),
      axios.get(`${API}/admin/search-analytics/clusters?days=${days}&kind=${clusterKind}&limit=20`, { headers }),
    ])
      .then(([a, c]) => { setData(a.data); setClusters(c.data); })
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [days, clusterKind, headers]);

  const formatDate = (iso) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return iso; }
  };

  return (
    <div data-testid="admin-search-analytics-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0 }} data-testid="analytics-title">🔍 Search Analytics</h2>
          <p style={{ color: "var(--muted)", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", marginTop: "0.35rem", maxWidth: "44rem", lineHeight: 1.55 }}>
            What visitors are searching for — including the queries that returned <strong>no results</strong>. Use the no-result list to commission new glossary terms or FAQ answers exactly where visitors already ask.
            Every log entry uses a hashed IP; raw IPs are never stored (PIPA-compliant).
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>Window:</label>
          <select value={days} onChange={e => setDays(parseInt(e.target.value, 10))} data-testid="analytics-days" style={{ padding: "0.4rem 0.6rem", fontFamily: "Inter,sans-serif" }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 12 months</option>
          </select>
        </div>
      </div>

      {loading && <div className="paper" style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div>}
      {error && <div className="notice" style={{ background: "#FEE2E2", borderColor: "#DC2626", padding: "0.9rem 1.15rem", marginBottom: "1rem", fontFamily: "Inter,sans-serif" }}>{error}</div>}

      {data && (
        <>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <Card label="Total searches" value={data.total_searches.toLocaleString()} sub={`Over the last ${data.period_days} days`}/>
            <Card label="Total clicks" value={(data.total_clicks || 0).toLocaleString()} sub={`Site-wide CTR: ${data.site_ctr ?? 0}%`}/>
            <Card label="Unique queries" value={data.unique_queries.toLocaleString()} sub="Distinct search strings"/>
            <Card label="No-result queries" value={data.no_results.length} sub="Opportunities for new content"/>
            <Card label="Low-confidence" value={data.low_confidence.length} sub="Some hits, no strong answer"/>
          </div>

          {data.ctr_by_kind && data.ctr_by_kind.length > 0 && (
            <div className="paper" style={{ padding: "1.15rem 1.35rem", marginBottom: "1.5rem" }} data-testid="ctr-by-kind">
              <h3 style={{ margin: "0 0 0.35rem", color: "var(--brand-navy)", fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', fontSize: "1.05rem" }}>Where clicks land</h3>
              <div style={{ color: "var(--muted)", fontFamily: "Inter,sans-serif", fontSize: "0.85rem", marginBottom: "0.85rem" }}>
                Which result group visitors actually click, across search page and Doogie chips. Great for spotting if your pinned Guide anchors are earning their placement.
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {data.ctr_by_kind.map(k => (
                  <div key={k.kind} data-testid={`ctr-kind-${k.kind}`} style={{ padding: "0.55rem 0.9rem", background: "#F0F4FB", border: "1px solid rgba(15,42,91,0.15)", borderRadius: 999, fontFamily: "Inter,sans-serif", fontSize: "0.85rem" }}>
                    <span style={{ fontWeight: 700, color: "var(--brand-navy)" }}>{k.kind}</span>
                    <span style={{ marginLeft: "0.5rem", color: "var(--muted)" }}>{k.clicks} click{k.clicks === 1 ? "" : "s"} · {k.share}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Table
            title="No-result queries (highest-value gap list)"
            subtitle="These visitors searched, but got NO results. Each row is a candidate for a new glossary term, FAQ answer, or community page."
            rows={data.no_results}
            emptyMsg="No queries in this window returned zero results — nice."
            testId="analytics-no-results"
            columns={[
              { key: "query", label: "Query" },
              { key: "count", label: "Times", align: "right" },
              { key: "last_at", label: "Last search", render: formatDate },
            ]}
            actionForRow={(r) => (
              <a href={`${API}/../search?q=${encodeURIComponent(r.query)}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-blue)", fontWeight: 600, textDecoration: "none", fontSize: "0.82rem" }}>Try live →</a>
            )}
          />

          <Table
            title="Low-confidence queries (definitions to tighten)"
            subtitle="Search returned results but no strong quick answer. Tightening definitions or adding synonyms here would boost answer quality."
            rows={data.low_confidence}
            emptyMsg="No low-confidence queries in this window."
            testId="analytics-low-conf"
            columns={[
              { key: "query", label: "Query" },
              { key: "count", label: "Times", align: "right" },
              { key: "avg_results", label: "Avg. results", align: "right" },
              { key: "last_at", label: "Last search", render: formatDate },
            ]}
            actionForRow={(r) => (
              <a href={`/search?q=${encodeURIComponent(r.query)}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-blue)", fontWeight: 600, textDecoration: "none", fontSize: "0.82rem" }}>Preview →</a>
            )}
          />

          {/* Query clustering — group near-identical queries into single content
              commissions so Doug isn't chasing five slightly-different variants. */}
          <div className="paper" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }} data-testid="analytics-clusters">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
              <h3 style={{ margin: 0, color: "var(--brand-navy)", fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif' }}>Query clusters</h3>
              <select value={clusterKind} onChange={e => setClusterKind(e.target.value)} data-testid="cluster-kind-select" style={{ padding: "0.35rem 0.55rem", fontFamily: "Inter,sans-serif", fontSize: "0.85rem" }}>
                <option value="no_results">No-result queries</option>
                <option value="low_confidence">Low-confidence queries</option>
                <option value="all">All queries</option>
              </select>
            </div>
            <div style={{ color: "var(--muted)", fontFamily: "Inter,sans-serif", fontSize: "0.88rem", marginBottom: "0.85rem", lineHeight: 1.55 }}>
              Near-identical queries grouped into a single content commission (Jaccard ≥ 0.5 with ≥ 2 shared tokens, after stopword removal + light stemming). "strata fees Vancouver" + "strata fee Burnaby" + "monthly strata fee" collapse into one row.
            </div>
            {(!clusters || !clusters.clusters || clusters.clusters.length === 0) ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)", fontFamily: "Inter,sans-serif" }}>
                No cluster candidates for <strong>{clusterKind.replace("_", " ")}</strong> in this window.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter,sans-serif", fontSize: "0.9rem" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "0.55rem 0.6rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 700, borderBottom: "2px solid var(--brand-navy)" }}>Representative query</th>
                      <th style={{ textAlign: "right", padding: "0.55rem 0.6rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 700, borderBottom: "2px solid var(--brand-navy)" }}>Variants</th>
                      <th style={{ textAlign: "right", padding: "0.55rem 0.6rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 700, borderBottom: "2px solid var(--brand-navy)" }}>Total volume</th>
                      <th style={{ textAlign: "left", padding: "0.55rem 0.6rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 700, borderBottom: "2px solid var(--brand-navy)" }}>Shared tokens</th>
                      <th style={{ borderBottom: "2px solid var(--brand-navy)" }}/>
                    </tr>
                  </thead>
                  <tbody>
                    {clusters.clusters.map((c, i) => (
                      <React.Fragment key={i}>
                        <tr data-testid={`cluster-row-${i}`}>
                          <td style={{ padding: "0.55rem 0.6rem", borderBottom: "1px solid rgba(15,42,91,0.08)", color: "var(--brand-navy)", fontWeight: 700 }}>
                            {c.variant_count > 1 && (
                              <button onClick={() => setExpanded(x => ({ ...x, [i]: !x[i] }))} data-testid={`cluster-expand-${i}`} style={{ background: "transparent", border: "none", padding: "0 0.4rem 0 0", cursor: "pointer", color: "var(--brand-blue)", fontSize: "0.95rem", fontWeight: 700 }}>
                                {expanded[i] ? "▾" : "▸"}
                              </button>
                            )}
                            {c.representative_query}
                          </td>
                          <td style={{ padding: "0.55rem 0.6rem", borderBottom: "1px solid rgba(15,42,91,0.08)", textAlign: "right" }}>{c.variant_count}</td>
                          <td style={{ padding: "0.55rem 0.6rem", borderBottom: "1px solid rgba(15,42,91,0.08)", textAlign: "right", fontWeight: 700, color: c.total_count >= 5 ? "#DC2626" : "var(--brand-navy)" }}>{c.total_count}</td>
                          <td style={{ padding: "0.55rem 0.6rem", borderBottom: "1px solid rgba(15,42,91,0.08)", color: "var(--muted)", fontFamily: "monospace", fontSize: "0.78rem" }}>
                            {(c.shared_tokens || []).join(" · ")}
                          </td>
                          <td style={{ padding: "0.55rem 0.6rem", borderBottom: "1px solid rgba(15,42,91,0.08)", whiteSpace: "nowrap" }}>
                            <a href={`/search?q=${encodeURIComponent(c.representative_query)}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-blue)", fontWeight: 600, textDecoration: "none", fontSize: "0.82rem" }}>Preview →</a>
                          </td>
                        </tr>
                        {expanded[i] && c.variants && c.variants.length > 1 && c.variants.slice(1).map((v, vi) => (
                          <tr key={vi} data-testid={`cluster-variant-${i}-${vi}`} style={{ background: "#FBFAF6" }}>
                            <td style={{ padding: "0.4rem 0.6rem 0.4rem 2.5rem", borderBottom: "1px solid rgba(15,42,91,0.05)", color: "var(--muted)", fontStyle: "italic" }}>↳ {v.query}</td>
                            <td/>
                            <td style={{ padding: "0.4rem 0.6rem", borderBottom: "1px solid rgba(15,42,91,0.05)", textAlign: "right", color: "var(--muted)" }}>{v.count}</td>
                            <td colSpan={2} style={{ borderBottom: "1px solid rgba(15,42,91,0.05)" }}/>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Table
            title="Top queries (traffic reality-check)"
            subtitle="What visitors ask most often. High-volume items with an answer are working correctly; high-volume items without a quick answer are the priority for content upgrades. The CTR column shows the fraction of searches that resulted in a click."
            rows={data.top}
            emptyMsg="No searches in this window yet — as visitors use the site, this table populates automatically."
            testId="analytics-top"
            columns={[
              { key: "query", label: "Query" },
              { key: "count", label: "Times", align: "right" },
              { key: "clicks", label: "Clicks", align: "right" },
              { key: "ctr", label: "CTR", align: "right", render: v => (v || 0) + "%" },
              { key: "avg_results", label: "Avg. results", align: "right" },
              { key: "any_quick_answer", label: "Quick?", render: v => v ? "✅" : "—", align: "center" },
              { key: "last_at", label: "Last search", render: formatDate },
            ]}
            actionForRow={(r) => (
              <a href={`/search?q=${encodeURIComponent(r.query)}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-blue)", fontWeight: 600, textDecoration: "none", fontSize: "0.82rem" }}>Preview →</a>
            )}
          />

          <div style={{ padding: "1rem 1.25rem", background: "#F0F4FB", border: "1px solid rgba(15,42,91,0.15)", borderRadius: 8, fontSize: "0.85rem", fontFamily: "Inter,sans-serif", lineHeight: 1.65, marginTop: "1rem", color: "var(--brand-navy)" }}>
            <strong>How to close a gap:</strong> for a no-result query, open the <Link to="/admin/relations" style={{ color: "var(--brand-blue)", fontWeight: 600 }}>Content Relations editor</Link> and pin a manual card from a related glossary term to the closest existing page — or commission a new glossary term via the <Link to="/admin/approvals" style={{ color: "var(--brand-blue)", fontWeight: 600 }}>AI Content Approvals</Link> queue.
          </div>
        </>
      )}
    </div>
  );
}
