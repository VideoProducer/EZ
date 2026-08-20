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
      // Never show alongside the fuller <CookieBanner/> which already
      // contains the PIPA collection-notice text + granular consent
      // buttons. First-time visitors (ez_cookie absent) see CookieBanner
      // only. This banner remains as a compliance fallback for edge
      // cases where PIPA_ACK has been cleared but ez_cookie was set.
      const hasCookieAck  = !!localStorage.getItem("ez_cookie");
      const hasPipaAck    = !!localStorage.getItem(KEY);
      // Show ONLY when the newer CookieBanner is dismissed AND our own
      // PIPA acknowledgement is missing.
      if (hasCookieAck && !hasPipaAck) {
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
        // Left-anchored floating card. Prior full-width strip intercepted
        // clicks on the Doogie FAB / drawer send button (bottom-right).
        // Constraining to a max-width and hugging bottom-left keeps the
        // right edge of the viewport clickable at all times.
        position: "fixed",
        bottom: 16,
        left: 16,
        right: "auto",
        maxWidth: "min(560px, calc(100vw - 32px))",
        zIndex: 9990,
        background: "#0F2A5B",
        color: "white",
        padding: "16px 20px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.38)",
        border: "2px solid #F5A623",
        borderRadius: 14,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 14,
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
