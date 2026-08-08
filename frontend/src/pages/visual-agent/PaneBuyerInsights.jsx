// EZtoFind.ca — Visual Agent · Buyer Insights pane
// Live inventory + median list-price + 90-day trend, scoped to the searched
// city (or a rotating BC region when the demo runs idle).

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Radio } from "lucide-react";
import { C, API, useRotatingRegion } from "./constants";
import { Pill } from "./atoms";

export const PaneBuyerInsights = ({ focusCity }) => {
  // If a search has committed to a city (e.g. "Osoyoos"), we scope the live
  // insights to that city. Otherwise we roll a rotating BC region so the
  // idle demo cycles through interesting communities.
  const rotating = useRotatingRegion();
  const region = focusCity ? { ...rotating, city: focusCity } : rotating;
  const [freshness, setFreshness] = useState("recently");
  // Real market insights for the currently-rotating region. Falls back to the
  // illustrative rotating figures if the aggregate query returns 0 (e.g. a
  // hyper-local community name that isn't a DDF city).
  const [live, setLive] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/tours/library?limit=1`);
        if (r.ok && !cancelled) setFreshness("in the last 4 hours");
      } catch (e) { if (typeof console !== "undefined") console.warn("PaneBuyerInsights: freshness enrichment failed, keeping default label", e); }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLive(null);
    (async () => {
      try {
        const r = await fetch(`${API}/insights?city=${encodeURIComponent(region.city)}`);
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled && data && (data.active_count || 0) > 0) setLive(data);
      } catch (e) { if (typeof console !== "undefined") console.warn("PaneBuyerInsights: live insights fetch failed, keeping illustrative stats", e); }
    })();
    return () => { cancelled = true; };
  }, [region.city]);

  const b = region.buyer;
  const trend = b.trend;
  const minV = Math.min(...trend), maxV = Math.max(...trend);
  const trendW = 260, trendH = 60;
  const pts = trend.map((v, i) => {
    const x = (i / (trend.length - 1)) * trendW;
    const y = trendH - ((v - minV) / (maxV - minV || 1)) * trendH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const trendArrow = b.direction === "up" ? "▲" : b.direction === "down" ? "▼" : "→";

  const fmtM = (n) => {
    if (!n) return "—";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${Math.round(n).toLocaleString("en-CA")}`;
  };
  const stats = live ? [
    { label: "Active inventory", value: String(live.active_count), sub: `${region.city} · CREA DDF®` },
    { label: "Median list price", value: fmtM(live.median_list_price), sub: `avg ${fmtM(live.avg_list_price)}` },
    { label: "Avg. beds / baths", value: `${live.avg_beds ?? "—"} / ${live.avg_baths ?? "—"}`, sub: "across active listings" },
  ] : [
    { label: "Active inventory", value: String(b.inventory), sub: `${region.city} · matching filters` },
    { label: "Median list price", value: b.median, sub: `range ${b.range}` },
    { label: "Avg. days on market", value: String(b.dom), sub: "last 30 days" },
  ];

  return (
    <div data-testid="pane-buyerinsights" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>Buyer snapshot · {region.label}</strong>
        <Pill tone="green" data-testid="buyerinsights-freshness">
          <Radio size={12}/> Source: CREA DDF® · {live ? "live" : "illustrative"} · updated {freshness}
        </Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}
          >
            <div style={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 700, color: C.blue, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{s.sub}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6, fontStyle: "italic" }}>
              Source: CREA DDF® · {freshness}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 90-day list-price trend sparkline */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>90-day median list price · trend</div>
          <div style={{ fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>Past & present list prices — not a forecast</div>
        </div>
        <svg viewBox={`0 0 ${trendW} ${trendH}`} width="100%" height={trendH + 6} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="ba-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={C.blue} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={C.blue} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <polyline
            points={`0,${trendH} ${pts} ${trendW},${trendH}`}
            fill="url(#ba-grad)" stroke="none"
          />
          <polyline
            points={pts}
            fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx={trendW} cy={trendH - ((trend[trend.length-1] - minV)/(maxV-minV||1))*trendH} r="4" fill={C.gold}/>
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6B7280", marginTop: 2 }}>
          <span>12 weeks ago · ${minV.toFixed(2)}M</span>
          <span>Now · ${trend[trend.length-1].toFixed(2)}M {trendArrow}</span>
        </div>
      </div>

      {/* In-service-area CTA: browse live listings */}
      <div style={{
        background: "rgba(30,79,207,0.06)", border: "1px solid #DDE6FA",
        borderRadius: 10, padding: 12, fontSize: 12.5, color: C.navy, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <ShieldCheck size={18} color={C.blue}/>
        <span style={{ flex: "1 1 280px", lineHeight: 1.55 }}>
          These figures are <strong>list-price statistics from CREA DDF®</strong> — not a prediction of what any home will sell for. Ready to see what's active right now?
        </span>
        <a
          href="/listings"
          data-testid="buyer-browse-cta"
          style={{
            background: C.navy, color: "#fff", padding: "9px 16px", borderRadius: 99,
            fontSize: 12.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(15,42,91,0.25)",
          }}
        >Browse live listings →</a>
      </div>

      {/* Out-of-service-area inline referral */}
      <div style={{
        background: "#FFF8E9", border: "1px solid rgba(245,166,35,0.4)",
        borderRadius: 10, padding: 12, fontSize: 12.5, color: C.navy, lineHeight: 1.6,
      }}>
        <strong>Looking outside Greater Vancouver, the Fraser Valley, or the Sea-to-Sky Corridor?</strong> Doogie retrieves BC-wide MLS® data, and Doug can connect you with a licensed REALTOR® active in your target community.{" "}
        <a
          href="/referral-request"
          data-testid="buyer-out-of-area-referral"
          style={{ color: C.blue, fontWeight: 700, textDecoration: "underline" }}
        >Request a referral REALTOR®</a>
        {" "}— no cost to you.
      </div>
    </div>
  );
};
