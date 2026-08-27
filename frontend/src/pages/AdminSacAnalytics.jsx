// /admin/sac-analytics — Attribution dashboard for utm_source=sac traffic
// (Social Agent Community). Admin-only. Reads from the CRM enrichment
// (landing_page + UTM) that Phase B/C wired into every /leads/* POST.
//
// COMPLIANCE:
//   • Admin-only (verify_admin on the API endpoint).
//   • Displays hashed / masked email suffixes only — no full PII in the
//     dashboard table (PIPA best practice for internal analytics UIs).
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Helmet } from "react-helmet-async";

const API = process.env.REACT_APP_BACKEND_URL;

const maskEmail = (e) => {
  if (!e || !e.includes("@")) return "—";
  const [local, dom] = e.split("@");
  return local.slice(0, 2) + "•••@" + dom;
};
const fmtDate = (iso) => { try { return new Date(iso).toLocaleString("en-CA"); } catch { return iso; } };

export default function AdminSacAnalytics() {
  const [data, setData]     = useState(null);
  const [err, setErr]       = useState("");
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const r = await axios.get(`${API}/api/admin/sac-analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(r.data);
      } catch (e) {
        setErr(e?.response?.data?.detail || "Failed to load analytics — check admin login.");
      } finally { setLoad(false); }
    })();
  }, []);

  if (loading) return <section className="section"><div className="container-x">Loading SAC analytics…</div></section>;
  if (err)     return <section className="section"><div className="container-x"><div className="notice" style={{ background: "#FEE2E2", borderColor: "#DC2626" }}>{err}</div></div></section>;
  if (!data)   return null;

  return (
    <section className="section" data-testid="admin-sac-analytics">
      <Helmet><title>SAC Analytics — EZtoFind Admin</title><meta name="robots" content="noindex,nofollow"/></Helmet>
      <div className="container-x" style={{ maxWidth: "60rem" }}>
        <div className="eyebrow">Admin · Attribution</div>
        <h1 className="section-title">Social Agent Community — lead pipeline</h1>
        <p style={{ fontFamily: "Inter,sans-serif", color: "var(--muted)", marginBottom: "1.25rem" }}>
          Every /valuation, /buyer, /seller, /referral-request submit tagged with <code>utm_source=sac</code> since Phase D.
        </p>

        {/* Top-line stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.85rem",
        }}>
          {[
            { l: "Total SAC leads",  v: data.total_leads,   test: "sac-stat-total" },
            { l: "Buyer",            v: data.buyer_count,   test: "sac-stat-buyer" },
            { l: "Seller",           v: data.seller_count,  test: "sac-stat-seller" },
            { l: "Last 7 days",      v: data.last_7_days,   test: "sac-stat-7d"    },
            { l: "Last 30 days",     v: data.last_30_days,  test: "sac-stat-30d"   },
          ].map((s) => (
            <div key={s.l} data-testid={s.test} style={{
              padding: "0.85rem", background: "#fff",
              border: "1px solid rgba(15,42,91,0.12)", borderRadius: 10,
            }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 800 }}>{s.l}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.85rem", fontWeight: 700, color: "#0F2A5B", marginTop: 4 }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Top posts */}
        <h2 style={{ fontFamily: "'Playfair Display',serif", marginTop: "2rem", fontSize: "1.4rem", color: "#0F2A5B" }}>Top SAC posts (by clicks)</h2>
        <div className="paper" data-testid="sac-top-posts" style={{ padding: "0.85rem" }}>
          {data.top_campaigns?.length ? (
            <table style={{ width: "100%", fontFamily: "Inter,sans-serif", fontSize: "0.9rem" }}>
              <thead><tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "0.4rem" }}>utm_campaign</th>
                <th style={{ padding: "0.4rem", textAlign: "right" }}>Leads</th>
              </tr></thead>
              <tbody>
                {data.top_campaigns.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(15,42,91,0.06)" }}>
                    <td style={{ padding: "0.4rem" }}>{r.campaign || "(no tag)"}</td>
                    <td style={{ padding: "0.4rem", textAlign: "right", fontWeight: 700 }}>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ color: "var(--muted)", padding: "0.5rem" }}>No campaign data yet — post to SAC with a UTM link and check back.</div>}
        </div>

        {/* Recent leads (masked) */}
        <h2 style={{ fontFamily: "'Playfair Display',serif", marginTop: "2rem", fontSize: "1.4rem", color: "#0F2A5B" }}>Recent SAC-attributed leads (masked)</h2>
        <div className="paper" data-testid="sac-recent-leads" style={{ padding: "0.85rem" }}>
          {data.recent?.length ? (
            <table style={{ width: "100%", fontFamily: "Inter,sans-serif", fontSize: "0.88rem" }}>
              <thead><tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "0.4rem" }}>When</th>
                <th style={{ padding: "0.4rem" }}>Route</th>
                <th style={{ padding: "0.4rem" }}>Email (masked)</th>
                <th style={{ padding: "0.4rem" }}>Campaign</th>
              </tr></thead>
              <tbody>
                {data.recent.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(15,42,91,0.06)" }}>
                    <td style={{ padding: "0.4rem", whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</td>
                    <td style={{ padding: "0.4rem" }}>{r.form_route || "—"}</td>
                    <td style={{ padding: "0.4rem", fontFamily: "monospace" }}>{maskEmail(r.email)}</td>
                    <td style={{ padding: "0.4rem", color: "var(--muted)" }}>{r.utm_campaign || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ color: "var(--muted)", padding: "0.5rem" }}>No SAC leads yet — full email/phone available on the Leads page once one comes in.</div>}
        </div>

        <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "1rem" }}>
          Emails masked in this view for at-a-glance privacy (PIPA). Full contact details live on the primary Leads admin page.
        </p>
      </div>
    </section>
  );
}
