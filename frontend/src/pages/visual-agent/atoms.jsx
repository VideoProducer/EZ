// EZtoFind.ca — Visual Agent atoms (Pill, Waveform, VoiceDots, Cursor,
// OutsideFocusBump). Extracted from VisualAgentDemo.jsx (Feb 2026).
// Small, purely-presentational — safe to share across every Pane.

import React from "react";
import { motion } from "framer-motion";
import { C } from "./constants";

// ── Rounded chip used throughout the demo ────────────────────────────────
export const Pill = ({ children, tone = "navy", size = "sm", ...rest }) => (
  <span
    {...rest}
    style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: size === "sm" ? "4px 10px" : "6px 14px",
      borderRadius: 999,
      fontSize: size === "sm" ? 11 : 13,
      fontWeight: 600,
      letterSpacing: 0.3,
      background: tone === "green" ? "rgba(34,197,94,0.12)"
                : tone === "gold"  ? "rgba(245,166,35,0.12)"
                : tone === "glass" ? "rgba(255,255,255,0.12)"
                : "rgba(30,79,207,0.10)",
      color: tone === "green" ? "#15803D"
           : tone === "gold"  ? "#B45309"
           : tone === "glass" ? "#fff"
           : C.navy,
      border: tone === "glass" ? "1px solid rgba(255,255,255,0.22)" : "none",
    }}
  >
    {children}
  </span>
);

// ── Animated waveform (mock mic activity) ────────────────────────────────
export const Waveform = ({ active, intense = false }) => {
  const bars = 14;
  return (
    <div data-testid="visual-agent-waveform" style={{ display: "flex", alignItems: "center", gap: 3, height: 22 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          animate={{ scaleY: active ? (intense ? [0.5, 1.4, 0.7, 1.2, 0.4] : [0.3, 1, 0.4, 0.9, 0.2]) : 0.3 }}
          transition={{ duration: (intense ? 0.6 : 1.1) + (i % 4) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
          style={{
            display: "inline-block", width: 3, height: "100%",
            background: active ? (intense ? "#FFD98A" : C.gold) : "rgba(255,255,255,0.35)",
            borderRadius: 2, transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
};

// ── Voice UI helpers ─────────────────────────────────────────────────────
export const VoiceDots = ({ light = false }) => (
  <span data-testid="voice-dots" style={{ display: "inline-flex", gap: 3, verticalAlign: "middle" }}>
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
        style={{
          display: "inline-block", width: 5, height: 5, borderRadius: "50%",
          background: light ? "#FFD98A" : C.gold,
        }}
      />
    ))}
  </span>
);

export const Cursor = ({ active }) => (
  <motion.span
    animate={{ opacity: active ? [1, 0, 1] : 0 }}
    transition={{ duration: 0.9, repeat: Infinity }}
    style={{ display: "inline-block", width: 1, height: 14, background: C.navy, marginLeft: 2, verticalAlign: "middle" }}
  />
);

// ── Out-of-focus-area bump — used by the intake form + inline banners ────
export const OutsideFocusBump = ({ label, testId = "outside-focus-bump" }) => (
  <div
    data-testid={testId}
    style={{
      background: "#FFF8E1", border: "1px solid #F5D28A", borderRadius: 10,
      padding: "10px 12px", fontSize: 12.5, color: "#4B3300", lineHeight: 1.55,
      display: "grid", gap: 6,
    }}
  >
    <div>
      <strong>{label || "That area"}</strong> falls outside the Greater
      Vancouver, Fraser Valley, and Sea-to-Sky Corridor focus areas — but that
      doesn't mean we can't help you get connected! <span aria-hidden>🐾</span>{" "}
      Would you like to be connected with a licensed REALTOR® in that area
      through Doug's referral network?
    </div>
    <div>
      <a
        href="/referral-request"
        data-testid={`${testId}-link`}
        style={{
          display: "inline-block", padding: "6px 12px", borderRadius: 8,
          background: "#0F2A5B", color: "#fff", fontWeight: 700,
          fontSize: 12, textDecoration: "none",
        }}
      >Referral REALTOR® →</a>
    </div>
  </div>
);
