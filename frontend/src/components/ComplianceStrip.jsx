import React from "react";

// Site-wide educational disclaimer. Rendered once at the very top of the shared
// HomeNextNav header so it appears on EVERY page (both AppLayout-wrapped routes
// and the direct *Next page components). Non-sticky so it scrolls away above the
// sticky header — no overlap with the nav or page content.
export const ComplianceStrip = () => (
  <div
    className="compliance-strip"
    data-testid="compliance-strip"
    style={{
      background: "#F5F0E1",
      padding: "0.45rem 1rem",
      fontFamily: "Inter,sans-serif",
      fontSize: "0.72rem",
      lineHeight: 1.4,
      color: "var(--ink)",
      fontWeight: 400,
      textAlign: "center",
      borderBottom: "1px solid rgba(15,42,91,0.08)",
    }}
  >
    EZtoFind.ca provides general educational information about BC real estate — not legal, tax, financial, or real estate advice. For your own situation, speak with the appropriate licensed professional: a BC lawyer or notary, an accountant or tax professional, a licensed mortgage broker, or a licensed REALTOR®.
  </div>
);

export default ComplianceStrip;
