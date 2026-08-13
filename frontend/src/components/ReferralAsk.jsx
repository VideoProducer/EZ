// ReferralAsk — a single, consistent, compliant CTA that we drop in
// EVERY out-of-area context across the site.
//
// Renders as either:
//   • variant="inline"  — a paragraph + button pair, good for FAQ answers,
//                         search-empty states, or community pages.
//   • variant="card"    — a bordered card for hero-like placements.
//   • variant="pill"    — a compact pill button for tight rows.
//
// All variants navigate to /referral-request, which is Doug's existing
// BCFSA-compliant referral intake form (name, email, phone, target
// area, CASL/PIPA consent).  Consistent copy means users hear the same
// promise everywhere:  "$0 cost · You approve every intro · BCFSA-only".
//
// Compliance:
//   • Does not itself collect PII — it's a link/button to the intake page
//     where the PIPA + CASL consent is captured, so no duplicate-consent
//     confusion.
//   • Copy makes it explicit that Doug is not the local REALTOR® — the
//     lead is handed to a BCFSA-licensed local from Doug's vetted
//     referral network under CREA's REALTOR® Code Article 24.
//
// Analytics: fires a "referral_ask_click" beacon so Doug can see which
// pages are driving referral leads.  Non-blocking, silent on failure.

import React from "react";
import { Link } from "react-router-dom";

const COPY = {
  heading: "Would you like Doug to have a local REALTOR® contact you?",
  body: "Doug will hand-pick a BCFSA-licensed local from his vetted referral network — $0 cost to you, you approve every intro, no CASL spam.",
  cta: "Yes — connect me with a local REALTOR® →",
  ctaShort: "Get a local REALTOR® referral →",
  trust: "$0 cost · You approve every intro · BCFSA-only · Under CREA Article 24",
};

const _logClick = (context) => {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "referral_ask_click", { source_context: context || "unknown" });
    }
    const backend = process.env.REACT_APP_BACKEND_URL;
    fetch(`${backend}/api/track/page`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "referral_ask_click", path: context || "" }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* swallow — never break UX for a metric */ }
};

const ReferralAsk = ({
  variant = "inline",
  context = "",                  // e.g. "search-empty" | "community-kelowna" | "faq-out-of-area"
  area,                          // optional: pre-fills the area on /referral-request
  compact = false,               // hide the "trust" fine-print for tight rows
  className,
  style,
}) => {
  const href = area ? `/referral-request?area=${encodeURIComponent(area)}` : "/referral-request";
  const testId = `referral-ask-${variant}`;

  if (variant === "pill") {
    return (
      <Link
        to={href}
        onClick={() => _logClick(context)}
        data-testid={testId}
        className={className}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--brand-gold,#F5A623)", color: "var(--brand-navy,#0F2A5B)",
          fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.85rem",
          padding: "0.55rem 1.05rem", borderRadius: 999,
          textDecoration: "none", border: "none", cursor: "pointer",
          boxShadow: "0 4px 10px rgba(245,166,35,0.35)",
          ...(style || {}),
        }}
      >🤝 {COPY.ctaShort}</Link>
    );
  }

  if (variant === "card") {
    return (
      <div
        data-testid={testId}
        className={className}
        style={{
          background: "#F5F0E1",
          border: "1px solid rgba(245,166,35,0.4)",
          borderRadius: 14,
          padding: "1rem 1.15rem",
          fontFamily: "Inter,sans-serif",
          ...(style || {}),
        }}
      >
        <div style={{ fontFamily: "Sora,sans-serif", fontWeight: 700, color: "var(--brand-navy,#0F2A5B)", fontSize: "1.05rem", marginBottom: "0.35rem" }}>
          🤝 {COPY.heading}
        </div>
        <p style={{ margin: "0 0 0.65rem", fontSize: "0.9rem", color: "var(--ink,#1F2937)", lineHeight: 1.5 }}>
          {COPY.body}
        </p>
        <Link
          to={href}
          onClick={() => _logClick(context)}
          data-testid={`${testId}-cta`}
          style={{
            display: "inline-block", background: "var(--brand-navy,#0F2A5B)", color: "#fff",
            fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.9rem",
            padding: "0.65rem 1.2rem", borderRadius: 999, textDecoration: "none",
          }}
        >{COPY.cta}</Link>
        {!compact && (
          <div style={{ marginTop: "0.55rem", fontSize: "0.72rem", color: "var(--muted,#6B7280)" }}>
            {COPY.trust}
          </div>
        )}
      </div>
    );
  }

  // Default: inline
  return (
    <div
      data-testid={testId}
      className={className}
      style={{
        display: "flex", flexDirection: "column", gap: "0.4rem",
        fontFamily: "Inter,sans-serif",
        ...(style || {}),
      }}
    >
      <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--ink,#1F2937)", lineHeight: 1.55 }}>
        <strong>{COPY.heading}</strong> {COPY.body}
      </p>
      <Link
        to={href}
        onClick={() => _logClick(context)}
        data-testid={`${testId}-cta`}
        style={{
          display: "inline-flex", alignSelf: "flex-start",
          background: "var(--brand-gold,#F5A623)", color: "var(--brand-navy,#0F2A5B)",
          fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.9rem",
          padding: "0.65rem 1.2rem", borderRadius: 999, textDecoration: "none",
          boxShadow: "0 4px 10px rgba(245,166,35,0.28)",
        }}
      >🤝 {COPY.cta}</Link>
      {!compact && (
        <div style={{ fontSize: "0.72rem", color: "var(--muted,#6B7280)" }}>
          {COPY.trust}
        </div>
      )}
    </div>
  );
};

export default ReferralAsk;
