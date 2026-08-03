// ============================================================================
//  AdminReelAnalytics — visual dashboard for Doogie reel engagement.
//  Aggregates `/api/admin/reel_events/summary` into KPI cards + a per-listing
//  table with completion-rate bars. Refreshes on window range change (7/30/90d).
//  Requires admin auth — piggybacks on the `admin_token` localStorage key set
//  by the AdminLogin flow.
// ============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { RefreshCcw, Share2, Play, CheckCircle, Image as ImageIcon, ExternalLink } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmt = (n) => (n || 0).toLocaleString();
const pct = (num, den) => (den ? Math.round((num / den) * 100) : 0);

const RANGE_OPTIONS = [
  { label: "Last 7 days",  value: 7  },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
];

const KPI_CARD = (title, value, sub, Icon, tint) => (
  <div style={{
    background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14,
    padding: 18, display: "flex", flexDirection: "column", gap: 6,
    boxShadow: "0 2px 6px rgba(15,42,91,0.05)", minWidth: 0,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</span>
      <div style={{
        width: 32, height: 32, borderRadius: 10, background: tint,
        display: "grid", placeItems: "center", color: "#fff",
      }}><Icon size={16}/></div>
    </div>
    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, color: "#0F2A5B", lineHeight: 1.1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: "#6B7280" }}>{sub}</div>}
  </div>
);

export default function AdminReelAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const token = localStorage.getItem("admin_token") || "";
      const r = await axios.get(`${API}/admin/reel_events/summary?days=${days}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setData(r.data);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Failed to load reel analytics");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  const listings = data?.listings || [];
  const totals = useMemo(() => listings.reduce((a, r) => ({
    shares:        a.shares    + (r.shares || 0),
    views:         a.views     + (r.views || 0),
    completes:     a.completes + (r.completes || 0),
    photo_changes: a.photo_changes + (r.photo_changes || 0),
  }), { shares: 0, views: 0, completes: 0, photo_changes: 0 }), [listings]);
  const completionRate = pct(totals.completes, totals.views);
  const engagedCount = listings.length;

  return (
    <div data-testid="admin-reel-analytics" style={{ padding: 24, background: "#F4F5FA", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, margin: 0, color: "#0F2A5B" }}>
              Doogie Reel Analytics
            </h1>
            <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 13 }}>
              Which listings clients are engaging with — shares, views, and completed reels.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div role="group" aria-label="Date range" style={{ display: "inline-flex", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 999, padding: 3 }}>
              {RANGE_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setDays(r.value)}
                  data-testid={`admin-reel-range-${r.value}`}
                  aria-pressed={days === r.value}
                  style={{
                    border: "none", padding: "6px 14px", borderRadius: 999,
                    background: days === r.value ? "#0F2A5B" : "transparent",
                    color: days === r.value ? "#fff" : "#374151",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >{r.label}</button>
              ))}
            </div>
            <button
              onClick={load}
              disabled={loading}
              data-testid="admin-reel-refresh"
              aria-label="Refresh"
              style={{
                background: "#fff", border: "1px solid #E5E7EB", borderRadius: 999,
                padding: "8px 12px", cursor: loading ? "wait" : "pointer", display: "inline-flex",
                alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#374151",
              }}
            ><RefreshCcw size={12} style={{ transition: "transform 0.4s", transform: loading ? "rotate(180deg)" : "none" }}/> Refresh</button>
          </div>
        </div>

        {err && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {err}
          </div>
        )}

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }} data-testid="admin-reel-kpis">
          {KPI_CARD("Shares",        fmt(totals.shares),    "Copy-share taps", Share2,      "#0A3D99")}
          {KPI_CARD("Views",         fmt(totals.views),     "Full-screen opens", Play,      "#F5A623")}
          {KPI_CARD("Completes",     fmt(totals.completes), `${completionRate}% completion`, CheckCircle, "#22C55E")}
          {KPI_CARD("Photo changes", fmt(totals.photo_changes), "Reel-driven photo advances", ImageIcon, "#8B5CF6")}
          {KPI_CARD("Listings",      fmt(engagedCount),     "With any reel activity", Play,   "#0F2A5B")}
        </div>

        {/* Per-listing table */}
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "#0F2A5B", fontSize: 15 }}>Top listings by engagement</strong>
            <span style={{ fontSize: 11, color: "#6B7280" }}>Last {days} days · sorted by shares + views</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }} data-testid="admin-reel-table">
              <thead>
                <tr style={{ background: "#F9FAFB", textAlign: "left", color: "#6B7280", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  <th style={{ padding: "10px 18px" }}>Listing</th>
                  <th style={{ padding: "10px 8px", textAlign: "right" }}>Shares</th>
                  <th style={{ padding: "10px 8px", textAlign: "right" }}>Views</th>
                  <th style={{ padding: "10px 8px", textAlign: "right" }}>Completes</th>
                  <th style={{ padding: "10px 18px" }}>Completion rate</th>
                  <th style={{ padding: "10px 18px" }}>Last activity</th>
                  <th style={{ padding: "10px 18px" }}></th>
                </tr>
              </thead>
              <tbody>
                {loading && !listings.length && (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#6B7280" }}>Loading…</td></tr>
                )}
                {!loading && !listings.length && (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#6B7280" }}>
                    No reel activity yet in this window. Share a reel link to get started.
                  </td></tr>
                )}
                {listings.map(row => {
                  const cr = pct(row.completes, row.views);
                  return (
                    <tr key={row.listing_key} data-testid={`admin-reel-row-${row.listing_key}`} style={{ borderTop: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "12px 18px", fontWeight: 700, color: "#0F2A5B", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {row.listing_key}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: "#0A3D99" }}>{fmt(row.shares)}</td>
                      <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: "#F5A623" }}>{fmt(row.views)}</td>
                      <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: "#22C55E" }}>{fmt(row.completes)}</td>
                      <td style={{ padding: "12px 18px", minWidth: 160 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 6, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, cr)}%`, height: "100%", background: cr >= 60 ? "#22C55E" : cr >= 30 ? "#F5A623" : "#DC2626", transition: "width 0.4s" }}/>
                          </div>
                          <span style={{ fontSize: 11, color: "#6B7280", minWidth: 32, textAlign: "right" }}>{cr}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 18px", color: "#6B7280", fontSize: 11 }}>
                        {row.last_at ? new Date(row.last_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                      </td>
                      <td style={{ padding: "12px 18px", textAlign: "right" }}>
                        <Link to={`/listings/${encodeURIComponent(row.listing_key)}?reel=1`} target="_blank" rel="noreferrer"
                          data-testid={`admin-reel-open-${row.listing_key}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#0A3D99", fontWeight: 700, textDecoration: "none", fontSize: 12 }}
                        ><ExternalLink size={12}/> Open</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
