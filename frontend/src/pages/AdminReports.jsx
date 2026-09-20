// EZtoFind.ca — Admin Reports (Slice 5 · Feb 2026)
// URL: /admin/reports
//
// Rolling-window attribution + conversion dashboard. Everything comes
// from a single /api/admin/reports/summary payload, so the frontend
// stays a thin presentational layer over Recharts.

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { AdminShell } from "../App";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PERIODS = [
  { value: "7d",   label: "Last 7 days" },
  { value: "30d",  label: "Last 30 days" },
  { value: "90d",  label: "Last 90 days" },
  { value: "365d", label: "Last 12 months" },
];

const STAGE_COLORS = {
  new: "#3B82F6", contacted: "#F59E0B", nurturing: "#A855F7",
  active: "#10B981", won: "#059669", lost: "#DC2626",
};
const SOURCE_COLORS = { buyer: "#0F2A5B", seller: "#0EA5E9", referral: "#F59E0B" };

const AdminReports = () => {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await axios.get(`${API}/admin/reports/summary`, { params: { period } });
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminShell active="reports">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "2rem", marginTop: 0, marginBottom: "0.25rem" }}>
            📊 Reports
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", fontFamily: "Inter,sans-serif", fontSize: "0.9rem" }}>
            Attribution + conversion analytics across every lead surface.
          </p>
        </div>
        <div>
          <select
            data-testid="admin-reports-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ padding: "0.55rem 0.9rem", borderRadius: 8, border: "1px solid rgba(15,42,91,0.2)", background: "#fff", color: "#0F2A5B", fontWeight: 600 }}
          >
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {error && <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#FEE2E2", color: "#991B1B", borderRadius: 8 }}>⚠ {error}</div>}
      {loading && !data && <div style={{ marginTop: "1rem", color: "#6B7280" }}>Loading…</div>}

      {data && (
        <>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
            <Kpi label="Leads in window" value={data.totals?.leads_in_window ?? 0} testid="kpi-total" />
            <Kpi label="Buyer" value={data.totals?.buyer ?? 0} color={SOURCE_COLORS.buyer} testid="kpi-buyer" />
            <Kpi label="Seller" value={data.totals?.seller ?? 0} color={SOURCE_COLORS.seller} testid="kpi-seller" />
            <Kpi label="Referral" value={data.totals?.referral ?? 0} color={SOURCE_COLORS.referral} testid="kpi-referral" />
            <Kpi
              label="Avg time to 1st touch"
              value={data.avg_time_to_first_touch_hours == null ? "—" : `${data.avg_time_to_first_touch_hours}h`}
              testid="kpi-ttft"
            />
          </div>

          {/* Two-column charts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            <Card title="Leads over time" testid="chart-daily">
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={data.daily_series || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="buyer" stroke={SOURCE_COLORS.buyer} strokeWidth={2} />
                    <Line type="monotone" dataKey="seller" stroke={SOURCE_COLORS.seller} strokeWidth={2} />
                    <Line type="monotone" dataKey="referral" stroke={SOURCE_COLORS.referral} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {(data.daily_series || []).length === 0 && (
                <div style={{ color: "#6B7280", padding: "1rem", textAlign: "center", fontSize: "0.85rem" }}>No leads in this window yet.</div>
              )}
            </Card>

            <Card title="Pipeline funnel" testid="chart-funnel">
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={Object.entries(data.funnel || {}).map(([stage, count]) => ({ stage, count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count">
                      {Object.entries(data.funnel || {}).map(([stage], i) => (
                        <Cell key={i} fill={STAGE_COLORS[stage] || "#6B7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Top lead sources" testid="chart-sources">
              {(data.top_sources || []).length === 0 ? (
                <div style={{ color: "#6B7280", padding: "1rem", textAlign: "center", fontSize: "0.85rem" }}>No lead sources yet.</div>
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart layout="vertical" data={data.top_sources || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} width={140} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0F2A5B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Most-viewed listings" testid="chart-listings">
              {(data.top_listing_views || []).length === 0 ? (
                <div style={{ color: "#6B7280", padding: "1rem", textAlign: "center", fontSize: "0.85rem" }}>No listing views in this window yet.</div>
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart layout="vertical" data={data.top_listing_views || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="mls_number" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="views" fill="#0EA5E9" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* Recent campaigns table */}
          <Card title="Recent campaigns" testid="chart-campaigns" style={{ marginTop: "1rem" }}>
            {(data.recent_campaigns || []).length === 0 ? (
              <div style={{ color: "#6B7280", padding: "1rem" }}>No campaigns yet — build your first at /admin/campaigns.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Created</th><th>Subject</th><th>Recipients</th><th>Sent</th><th>Errors</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(data.recent_campaigns || []).map((c) => (
                    <tr key={c.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{c.created_at ? new Date(c.created_at).toLocaleDateString("en-CA") : "—"}</td>
                      <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.subject}>{c.subject}</td>
                      <td>{c.recipient_count}</td>
                      <td style={{ color: "#059669" }}>{c.sent_count}</td>
                      <td style={{ color: (c.error_count || 0) > 0 ? "#991B1B" : "#6B7280" }}>{c.error_count}</td>
                      <td><span style={{ padding: "0.15rem 0.55rem", borderRadius: 999, background: c.status === "complete" ? "#DCFCE7" : "#FEF3C7", color: c.status === "complete" ? "#065F46" : "#78350F", fontSize: "0.72rem", fontWeight: 700 }}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </AdminShell>
  );
};

const Kpi = ({ label, value, color = "#0F2A5B", testid }) => (
  <div data-testid={testid} style={{ background: "#F5F0E1", borderRadius: 12, padding: "0.85rem 1rem", borderLeft: `3px solid ${color}` }}>
    <div style={{ fontFamily: "Inter,sans-serif", fontSize: "0.72rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{label}</div>
    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color, fontWeight: 700, marginTop: 2 }}>{value}</div>
  </div>
);
const Card = ({ title, children, testid, style }) => (
  <div data-testid={testid} style={{ background: "#fff", border: "1px solid rgba(15,42,91,0.12)", borderRadius: 12, padding: "0.85rem 1rem", ...style }}>
    <div style={{ fontWeight: 700, color: "#0F2A5B", fontSize: "0.9rem", marginBottom: "0.5rem" }}>{title}</div>
    {children}
  </div>
);

export default AdminReports;
