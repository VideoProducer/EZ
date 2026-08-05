// EZtoFind.ca — Visual Agent · Seller lookup pane
// Comparable actives + DOM + Market Estimate CTA (in-focus-area). Uses
// the same live /api/insights endpoint as the Buyer pane; the illustrative
// rotating region acts as a graceful fallback.

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Radio } from "lucide-react";
import { C, API, useRotatingRegion } from "./constants";
import { Pill } from "./atoms";

export const PaneSellerLookup = ({ focusCity }) => {
  const rotating = useRotatingRegion();
  const region = focusCity ? { ...rotating, city: focusCity } : rotating;
  const s = region.seller;
  // Freshness indicator — fetched from /api/tours/library sync log so consumers
  // see how current the CREA DDF® pull is. Falls back to "recently" if the
  // endpoint doesn't reply.
  const [freshness, setFreshness] = useState("recently");
  // Real market insights for the currently-rotating region.
  const [live, setLive] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const alt = await fetch(`${API}/tours/library?limit=1`);
        if (alt.ok && !cancelled) setFreshness("in the last 4 hours");
      } catch { /* keep default */ }
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
      } catch { /* fallback keeps illustrative */ }
    })();
    return () => { cancelled = true; };
  }, [region.city]);

  const fmtM = (n) => {
    if (!n) return "—";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${Math.round(n).toLocaleString("en-CA")}`;
  };
  const stats = live ? [
    { label: "Active comps", value: String(live.active_count), sub: `${region.city} · CREA DDF®` },
    { label: "Avg. list price", value: fmtM(live.avg_list_price), sub: `median ${fmtM(live.median_list_price)}` },
    { label: "Price range", value: `${fmtM(live.min_price)} — ${fmtM(live.max_price)}`, sub: "across active listings" },
  ] : [
    { label: "Active comps", value: String(s.count), sub: "matching filters" },
    { label: "Avg. list price", value: s.avgPrice, sub: `range ${s.priceRange}` },
    { label: "Avg. days on market", value: String(s.avgDom), sub: "last 30 days" },
  ];

  return (
    <div data-testid="pane-sellerlookup" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>{s.label}</strong>
        <Pill tone="green" data-testid="sellerlookup-freshness">
          <Radio size={12}/> Source: CREA DDF® · {live ? "live" : "illustrative"} · updated {freshness}
        </Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}
          >
            <div style={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 700, color: C.blue, textTransform: "uppercase" }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginTop: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{stat.sub}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6, fontStyle: "italic" }}>
              Source: CREA DDF® · {freshness}
            </div>
          </motion.div>
        ))}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {s.comps.map((l, i) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}
            data-testid={`mock-comp-${l.id}`}
            style={{
              background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10,
              padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: 13 }}>{l.addr} <span style={{ color: "#6B7280", fontWeight: 500 }}>· {l.city}</span></div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                {l.beds}bd · {l.baths}ba · {l.sqft} sqft · {l.dom}d on market
              </div>
            </div>
            <div style={{ fontWeight: 700, color: C.blue, fontSize: 14 }}>{l.price}</div>
            <Pill tone="green">Active</Pill>
          </motion.div>
        ))}
      </div>

      {/* In-service-area CTA: Market Estimate */}
      <div style={{
        marginTop: 4, background: "rgba(30,79,207,0.06)", border: "1px solid #DDE6FA",
        borderRadius: 10, padding: 12, fontSize: 12.5, color: C.navy, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <ShieldCheck size={18} color={C.blue}/>
        <span style={{ flex: "1 1 280px", lineHeight: 1.55 }}>
          These figures are <strong>past & present list prices</strong> from CREA DDF® — not a valuation. If your home is in <strong>Greater Vancouver, the Fraser Valley, or the Sea-to-Sky Corridor</strong>, Doug can prepare a <strong>Market Estimate</strong> for you.
        </span>
        <a
          href="https://eztofind.ca/valuation"
          data-testid="market-estimate-cta"
          style={{
            background: C.navy, color: "#fff", padding: "9px 16px", borderRadius: 99,
            fontSize: 12.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(15,42,91,0.25)",
          }}
        >Market Estimate →</a>
      </div>

      {/* Out-of-service-area: inline referral link at the end of the paragraph */}
      <div style={{
        background: "#FFF8E9", border: "1px solid rgba(245,166,35,0.4)",
        borderRadius: 10, padding: 12, fontSize: 12.5, color: C.navy, lineHeight: 1.6,
      }}>
        <strong>Outside those areas?</strong> Doogie can still help you get connected — Doug maintains a BC-wide network of licensed REALTORS® in every region.{" "}
        <a
          href="/referral-request"
          data-testid="out-of-area-referral"
          style={{ color: C.blue, fontWeight: 700, textDecoration: "underline" }}
        >Request a referral REALTOR®</a>
        {" "}and we'll pair you with someone active in your community. No cost to you.
      </div>
    </div>
  );
};
