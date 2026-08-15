// PIPA first-visit collection-notice banner. Meets BC's Personal
// Information Protection Act s.10 (notice-of-collection) requirement
// on first visit and stays dismissed once acknowledged.
//
// Design principles:
// • One click to acknowledge — no dark-pattern "manage preferences"
//   maze. The banner appears exactly once per browser (localStorage).
// • BC-specific language, not the generic "we use cookies" template.
// • Links to /privacy so the interested reader can see the full
//   policy without opening a modal.
// • Respects prefers-reduced-motion via the global CSS rule.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "eztofind_pipa_ack_v1";

export default function PIPACookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Delay the render until after first paint so it never blocks LCP.
    // Also skip on the /compliance and /privacy routes where showing
    // the banner alongside the policy itself would be redundant.
    try {
      const skip = /^\/(compliance|privacy|terms)/i.test(window.location.pathname);
      if (skip) return;
      if (!localStorage.getItem(KEY)) {
        const t = setTimeout(() => setShow(true), 700);
        return () => clearTimeout(t);
      }
    } catch { /* SSR / privacy-mode safe */ }
  }, []);

  if (!show) return null;

  const ack = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ at: new Date().toISOString(), v: 1 }));
    } catch { /* privacy-mode safe */ }
    setShow(false);
  };

  return (
    <div
      data-testid="pipa-cookie-banner"
      role="dialog"
      aria-label="Privacy collection notice"
      className="safe-bottom"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#0F2A5B",
        color: "white",
        padding: "16px 20px",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.30)",
        borderTop: "2px solid #F5A623",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 16,
        alignItems: "center",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ fontSize: "0.85rem", lineHeight: 1.55 }}>
        <strong style={{ color: "#F5A623" }}>Privacy notice · BC PIPA</strong> — EZtoFind.ca collects
        basic browser analytics (page views, referrer, device type) to improve the
        site. <strong>No personal information is sold or shared with third-party
        marketers.</strong> Data submitted via forms is used only to reply to your
        request and retained under our{" "}
        <Link to="/privacy" style={{ color: "#F5A623", fontWeight: 600 }}>
          Privacy Policy
        </Link>
        . Complaints may be directed to the{" "}
        <a
          href="https://www.oipc.bc.ca/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#F5A623", fontWeight: 600 }}
        >
          BC OIPC ↗
        </a>
        .
      </div>
      <button
        onClick={ack}
        data-testid="pipa-cookie-ack"
        style={{
          background: "#F5A623",
          color: "#0F2A5B",
          border: "none",
          padding: "12px 22px",
          borderRadius: 999,
          fontWeight: 800,
          fontSize: "0.9rem",
          cursor: "pointer",
          fontFamily: "'Sora', sans-serif",
          minHeight: 44,
        }}
      >
        Got it
      </button>
    </div>
  );
}
