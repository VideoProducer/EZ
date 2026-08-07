import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

/**
 * Admin — Neighborhood Heatmap
 *
 * Top 32 BC neighborhoods ranked hottest → coldest, computed from the CREA
 * DDF® Active-only feed. Shows temperature (Hot / Warming / Cool / Cold),
 * Buyer's (Blue) vs Seller's (Yellow) market flag, and 3mo/6mo/12mo
 * trajectory arrows (composite score by default, with price/volume in the
 * drill-down). Warming→Hot crossings auto-email Doug via Resend, deduped
 * 7 days per neighborhood, with a Monday 07:00 PT weekly digest.
 */

const TEMP_STYLES = {
  Hot:     { label: "🔥 Hot",     bg: "#FEE2E2", fg: "#B91C1C" },
  Warming: { label: "↗ Warming",  bg: "#FEF3C7", fg: "#B45309" },
  Cool:    { label: "❄ Cool",     bg: "#DBEAFE", fg: "#1E40AF" },
  Cold:    { label: "🧊 Cold",    bg: "#E0E7FF", fg: "#3730A3" },
};

const MARKET_STYLES = {
  Sellers:  { label: "Seller's",  bg: "#FEF9C3", fg: "#854D0E", dot: "#EAB308" },
  Buyers:   { label: "Buyer's",   bg: "#DBEAFE", fg: "#1D4ED8", dot: "#2563EB" },
  Balanced: { label: "Balanced",  bg: "#F3F4F6", fg: "#374151", dot: "#9CA3AF" },
};

const ARROW = {
  up_strong:     "⬆",
  up:            "↗",
  flat:          "→",
  flat_learning: "→",
  down:          "↘",
  down_strong:   "⬇",
};
const ARROW_COLOR = {
  up_strong:     "#059669",
  up:            "#10B981",
  flat:          "#6B7280",
  flat_learning: "#9CA3AF",
  down:          "#DC2626",
  down_strong:   "#991B1B",
};

const fmtMoney = (n) => (n ? "$" + Math.round(n).toLocaleString() : "—");
const fmtPct   = (n) => (n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n}%`);

function ArrowCell({ arrows, metric = "composite", learning }) {
  const a = arrows?.[metric] || "flat_learning";
  const color = ARROW_COLOR[a];
  const title = learning
    ? "Learning — trend data builds daily; arrow stabilises after ~90 days of history."
    : `${metric} trajectory: ${a.replace("_", " ")}`;
  return (
    <span
      title={title}
      style={{
        display: "inline-block", fontSize: "1.35rem", lineHeight: 1,
        color, opacity: learning ? 0.45 : 1, fontWeight: 700,
      }}
    >
      {ARROW[a]}
    </span>
  );
}

function TempBadge({ temp }) {
  const s = TEMP_STYLES[temp] || TEMP_STYLES.Cold;
  return (
    <span
      data-testid={`heatmap-temp-badge-${temp}`}
      style={{
        display: "inline-block", padding: "3px 10px", borderRadius: 999,
        fontSize: "0.78rem", fontWeight: 700, background: s.bg, color: s.fg,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

function MarketBadge({ market }) {
  const s = MARKET_STYLES[market] || MARKET_STYLES.Balanced;
  return (
    <span
      data-testid={`heatmap-market-badge-${market}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 10px", borderRadius: 999, fontSize: "0.75rem",
        fontWeight: 600, background: s.bg, color: s.fg,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: s.dot }} />
      {s.label}
    </span>
  );
}

export default function AdminHeatmap({ AdminShell }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recomputing, setRecomputing] = useState(false);
  const [lastRecompute, setLastRecompute] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await axios.get(`${API}/admin/heatmap/neighborhoods`, { withCredentials: true });
      setData(r.data);
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || "Failed to load heatmap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const recompute = async () => {
    setRecomputing(true);
    try {
      const r = await axios.post(`${API}/admin/heatmap/recompute`, {}, { withCredentials: true });
      setLastRecompute(r.data);
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || e.message || "Recompute failed");
    } finally {
      setRecomputing(false);
    }
  };

  const history = data?.history_available || {};
  const learning = { "3mo": !history["3mo"], "6mo": !history["6mo"], "12mo": !history["12mo"] };

  const counts = useMemo(() => {
    if (!data?.neighborhoods) return { Hot: 0, Warming: 0, Cool: 0, Cold: 0 };
    return data.neighborhoods.reduce((acc, n) => {
      acc[n.temperature] = (acc[n.temperature] || 0) + 1;
      return acc;
    }, { Hot: 0, Warming: 0, Cool: 0, Cold: 0 });
  }, [data]);

  return (
    <AdminShell active="heatmap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "2rem", marginTop: 0, marginBottom: "0.25rem" }}>
            🌡️ Market Heatmap — Top 32 BC Neighborhoods
          </h1>
          <p style={{ margin: 0, color: "#6B7280", fontSize: "0.88rem", maxWidth: "48rem" }}>
            Hottest → coldest, ranked by composite temperature (DOM · Months of Supply · absorption trend · MoM price).
            Doug is auto-emailed the moment any neighborhood crosses <strong>Warming → Hot</strong> (deduped 7 days),
            plus a Monday 07:00 PT weekly digest of every temperature move.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            data-testid="heatmap-recompute-btn"
            onClick={recompute}
            disabled={recomputing}
            style={{
              background: "#F5A623", color: "#0F2A5B", border: "none",
              padding: "0.55rem 1.1rem", borderRadius: 6, fontWeight: 700,
              cursor: recomputing ? "wait" : "pointer",
            }}
          >
            {recomputing ? "Recomputing…" : "↻ Recompute now"}
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
        {["Hot", "Warming", "Cool", "Cold"].map((t) => (
          <div key={t} style={{
            padding: "0.75rem 1rem", borderRadius: 10,
            background: TEMP_STYLES[t].bg, color: TEMP_STYLES[t].fg,
            minWidth: 130,
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: 0.6 }}>{TEMP_STYLES[t].label.toUpperCase()}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, lineHeight: 1.1 }}>{counts[t] || 0}</div>
          </div>
        ))}
        <div style={{ padding: "0.75rem 1rem", borderRadius: 10, background: "#F3F4F6", color: "#374151", minWidth: 200 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: 0.6 }}>ANALYSED</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.1 }}>
            {data?.total_neighborhoods_analyzed || 0} sub-areas
          </div>
          <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>Top 32 shown below</div>
        </div>
      </div>

      {(!history["3mo"] || !history["6mo"] || !history["12mo"]) && (
        <div style={{
          marginTop: "1rem", padding: "0.7rem 1rem", background: "#FFFBEB",
          border: "1px solid #FDE68A", borderRadius: 8, fontSize: "0.85rem", color: "#92400E",
        }}>
          ⏱ <strong>Trend data is building.</strong> Trajectory arrows for
          {!history["3mo"]  && " 3-month"}
          {!history["6mo"]  && " · 6-month"}
          {!history["12mo"] && " · 12-month"} windows will stabilise after enough daily snapshots accrue.
          They currently show <span style={{ fontWeight: 700, color: "#374151" }}>→</span> as a "learning" placeholder.
        </div>
      )}

      {lastRecompute && (
        <div style={{ marginTop: "1rem", padding: "0.55rem 0.9rem", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, fontSize: "0.85rem", color: "#065F46" }}>
          ✓ Snapshot written · {lastRecompute.total_neighborhoods_analyzed} analysed ·
          {" "}{lastRecompute.crossings_detected} Warming→Hot crossings ·
          {" "}{lastRecompute.instant_alerts_sent} alert(s) sent
          {lastRecompute.instant_alerts_deduped ? ` · ${lastRecompute.instant_alerts_deduped} deduped` : ""}.
        </div>
      )}

      {loading && <p style={{ marginTop: "1.5rem", color: "#6B7280" }}>Loading heatmap…</p>}
      {error && <p style={{ marginTop: "1.5rem", color: "#B91C1C" }}>⚠️ {error}</p>}

      {!loading && !error && data && (
        <div style={{ marginTop: "1rem", overflowX: "auto", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10 }}>
          <table
            data-testid="heatmap-table"
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", fontFamily: "Inter, sans-serif" }}
          >
            <thead style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
              <tr>
                <th style={{ padding: "0.7rem", textAlign: "left" }}>#</th>
                <th style={{ padding: "0.7rem", textAlign: "left" }}>Neighborhood</th>
                <th style={{ padding: "0.7rem", textAlign: "left" }}>Temp</th>
                <th style={{ padding: "0.7rem", textAlign: "left" }}>Market</th>
                <th style={{ padding: "0.7rem", textAlign: "center" }} title="Composite temperature trajectory over 3 months">3 mo</th>
                <th style={{ padding: "0.7rem", textAlign: "center" }} title="6-month trajectory">6 mo</th>
                <th style={{ padding: "0.7rem", textAlign: "center" }} title="12-month trajectory">12 mo</th>
                <th style={{ padding: "0.7rem", textAlign: "right" }}>Median list</th>
                <th style={{ padding: "0.7rem", textAlign: "right" }}>DOM</th>
                <th style={{ padding: "0.7rem", textAlign: "right" }}>MoS</th>
                <th style={{ padding: "0.7rem", textAlign: "right" }}>Actives</th>
                <th style={{ padding: "0.7rem", textAlign: "right" }}>MoM %</th>
                <th style={{ padding: "0.7rem", textAlign: "right" }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {data.neighborhoods.map((n) => (
                <tr key={n.slug} data-testid={`heatmap-row-${n.slug}`} style={{ borderTop: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "0.6rem 0.7rem", color: "#6B7280", fontWeight: 700 }}>{n.rank}</td>
                  <td style={{ padding: "0.6rem 0.7rem" }}>
                    <div style={{ fontWeight: 600, color: "#0F2A5B" }}>{n.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>{n.city}</div>
                  </td>
                  <td style={{ padding: "0.6rem 0.7rem" }}><TempBadge temp={n.temperature} /></td>
                  <td style={{ padding: "0.6rem 0.7rem" }}><MarketBadge market={n.market_type} /></td>
                  <td style={{ padding: "0.6rem 0.7rem", textAlign: "center" }}>
                    <ArrowCell arrows={n.arrows} metric="composite" learning={learning["3mo"]} />
                  </td>
                  <td style={{ padding: "0.6rem 0.7rem", textAlign: "center" }}>
                    <ArrowCell arrows={n.arrows?.["6mo"] ? { composite: n.arrows["6mo"].composite } : null} metric="composite" learning={learning["6mo"]} />
                  </td>
                  <td style={{ padding: "0.6rem 0.7rem", textAlign: "center" }}>
                    <ArrowCell arrows={n.arrows?.["12mo"] ? { composite: n.arrows["12mo"].composite } : null} metric="composite" learning={learning["12mo"]} />
                  </td>
                  <td style={{ padding: "0.6rem 0.7rem", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(n.median_list_price)}</td>
                  <td style={{ padding: "0.6rem 0.7rem", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{n.median_dom ?? "—"}</td>
                  <td style={{ padding: "0.6rem 0.7rem", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{n.months_of_supply ?? "—"}</td>
                  <td style={{ padding: "0.6rem 0.7rem", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{n.actives}</td>
                  <td style={{
                    padding: "0.6rem 0.7rem", textAlign: "right", fontVariantNumeric: "tabular-nums",
                    color: n.mom_price_pct == null ? "#9CA3AF" : (n.mom_price_pct >= 0 ? "#059669" : "#DC2626"),
                  }}>{fmtPct(n.mom_price_pct)}</td>
                  <td style={{ padding: "0.6rem 0.7rem", textAlign: "right", fontWeight: 700, color: "#0F2A5B", fontVariantNumeric: "tabular-nums" }}>
                    {n.temperature_score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: "1rem", padding: "0.9rem 1rem", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: "0.82rem", color: "#374151", lineHeight: 1.6 }}>
        <div><strong>Signals</strong> — Composite score (0-100) combines median days on market · Months of Supply · 30-day absorption trend · month-over-month median price change.</div>
        <div><strong>Temperature</strong> — <span style={{ color: "#B91C1C", fontWeight: 700 }}>Hot ≥ 75</span> · <span style={{ color: "#B45309", fontWeight: 700 }}>Warming 55-74</span> · <span style={{ color: "#1E40AF", fontWeight: 700 }}>Cool 30-54</span> · <span style={{ color: "#3730A3", fontWeight: 700 }}>Cold &lt; 30</span>.</div>
        <div><strong>Market type</strong> — MoS ≤ 4 → <span style={{ color: "#854D0E", fontWeight: 700 }}>Seller's (yellow)</span> · MoS ≥ 7 → <span style={{ color: "#1D4ED8", fontWeight: 700 }}>Buyer's (blue)</span> · in-between → Balanced.</div>
        <div style={{ marginTop: "0.35rem", color: "#6B7280", fontSize: "0.78rem" }}>
          Derived from CREA DDF® Active-only inventory. Not an appraisal, forecast, or investment recommendation — BCFSA/CREA/PIPA compliant.
        </div>
      </div>
    </AdminShell>
  );
}
