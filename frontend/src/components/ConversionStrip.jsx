// ConversionStrip — sitewide high-contrast strip that pins two primary
// actions above the fold on every page: "What's my home worth?" for
// sellers and "Tell Doug what you're looking for" for buyers. Sits
// immediately under the ComplianceStrip / above the main Nav so it does
// not compete with the compliance banner but always precedes the
// featured listing / hero.
//
// Rendered in AppLayout so it is present on every route by default. Any
// conversion page (/valuation, /buyer, /seller, /referral-request) can
// pass `variant="hidden"` via context to hide it, so we don't compete
// with the page's own primary CTA. For now we keep it visible everywhere
// because the current homepage has no equivalent above-the-fold CTA.
import React from "react";
import { Link, useLocation } from "react-router-dom";

const HIDE_ON = new Set([
  "/valuation", "/buyer", "/seller", "/referral-request",
]);

export const ConversionStrip = () => {
  const { pathname } = useLocation();
  if (HIDE_ON.has(pathname)) return null;

  return (
    <div
      data-testid="conversion-strip"
      role="region"
      aria-label="Primary actions — Doug LeMaire, REALTOR®"
      style={{
        // Solid navy → gold gradient so the strip pops against any
        // section that follows it. Positioned as sticky-under-nav so
        // it does not overlap the compliance banner and does not
        // hide behind the main navigation on scroll.
        background: "linear-gradient(90deg, #0F2A5B 0%, #163a75 55%, #1b478f 100%)",
        color: "#fff",
        padding: "0.6rem 1rem",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "0.75rem", flexWrap: "wrap",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "3px solid #DABF7A",
        boxShadow: "0 4px 12px rgba(15,42,91,0.2)",
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.9rem",
      }}
    >
      <span
        style={{ opacity: 0.9, fontWeight: 500, whiteSpace: "nowrap" }}
      >
        <span aria-hidden="true">📊 </span>
        Talk to Doug —
      </span>
      <Link
        to="/valuation?utm_source=conv-strip&utm_medium=header&utm_campaign=eztofind-strip"
        data-testid="conversion-strip-seller-cta"
        aria-label="Sellers: What is my home worth? — free market estimate from Doug"
        style={{
          background: "#DABF7A", color: "#0F2A5B",
          padding: "0.5rem 1rem", borderRadius: 999,
          fontWeight: 800, textDecoration: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 10px rgba(218,191,122,0.35)",
          transition: "transform 120ms ease, box-shadow 120ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 14px rgba(218,191,122,0.45)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(218,191,122,0.35)"; }}
      >
        What's my home worth?
      </Link>
      <span style={{ opacity: 0.55, fontSize: "0.75rem" }} aria-hidden="true">or</span>
      <Link
        to="/buyer?utm_source=conv-strip&utm_medium=header&utm_campaign=eztofind-strip"
        data-testid="conversion-strip-buyer-cta"
        aria-label="Buyers: Tell Doug what you are looking for"
        style={{
          background: "rgba(255,255,255,0.14)",
          border: "1.5px solid rgba(255,255,255,0.5)",
          color: "#fff",
          padding: "0.5rem 1rem", borderRadius: 999,
          fontWeight: 700, textDecoration: "none",
          whiteSpace: "nowrap",
          transition: "background 120ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.24)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
      >
        Tell Doug what you're looking for
      </Link>
    </div>
  );
};

export default ConversionStrip;
