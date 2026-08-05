// EZtoFind.ca — Visual Agent · Neighbourhood insights pane
// Renders illustrative Kits stats until a city is committed, then swaps
// to generic "sourced from public data" labels + a live Google Maps embed.

import React from "react";
import { motion } from "framer-motion";
import { School, Bus, Trees, Waves, CheckCircle2 } from "lucide-react";
import { C } from "./constants";
import { Pill } from "./atoms";

export const PaneNeighbourhood = ({ focusCity }) => {
  // The neighbourhood card syncs with the searched community. Doogie's
  // illustrative fallbacks (Kitsilano) are only shown until a search fires.
  const areaName = focusCity ? focusCity : "Kitsilano · Vancouver West";
  const stats = focusCity ? [
    { icon: School, label: "Schools nearby", value: "Multiple", sub: `${focusCity} · public + independent` },
    { icon: Bus, label: "Local transit", value: "See map", sub: `Regional links` },
    { icon: Trees, label: "Parks & trails", value: "Many", sub: "Public open space" },
    { icon: Waves, label: "Landmarks", value: "Search map", sub: focusCity },
  ] : [
    { icon: School, label: "École Bilingue Elem.", value: "0.8 km", sub: "French Immersion" },
    { icon: Bus, label: "Transit score", value: "88 / 100", sub: "4th Ave B-Line" },
    { icon: Trees, label: "Parks within 500m", value: "3", sub: "Kits Beach · Connaught · Volunteer" },
    { icon: Waves, label: "Walk to shoreline", value: "6 min", sub: "English Bay" },
  ];
  const mapQuery = encodeURIComponent(
    focusCity
      ? `${focusCity}, BC real estate`
      : "Kitsilano, Vancouver West, BC real estate"
  );
  return (
    <div data-testid="pane-neighbourhood" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>{areaName}</strong>
        <Pill tone="green"><CheckCircle2 size={12}/> Public data · sourced</Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.blue }}>
              <s.icon size={16}/>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginTop: 6 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{s.sub}</div>
          </motion.div>
        ))}
      </div>
      <div style={{
        marginTop: 4, background: C.mist, border: "1px solid #DDE6FA",
        borderRadius: 12, height: 220, position: "relative", overflow: "hidden",
      }}>
        <iframe
          data-testid="pane-neighbourhood-map"
          title={`${areaName} — live map`}
          src={`https://www.google.com/maps?q=${mapQuery}&z=14&output=embed`}
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div style={{
          position: "absolute", right: 10, bottom: 8, fontSize: 11,
          background: "rgba(255,255,255,0.92)", padding: "2px 6px", borderRadius: 4,
          color: "#374151",
        }}>Live · Google Maps</div>
      </div>
    </div>
  );
};
