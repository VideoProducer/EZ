import React from "react";
import { FLAGSHIP } from "../config/flagshipListing";

// Subtle single-line "Doug's Featured Listing → View on realtor.ca ↗" strip.
// Sits above the fold on the homepage and above the luxury magazine grid.
// Purpose: give the flagship listing visibility without re-introducing a
// heavy inline hero card. When Doug wants the full card back, flip
// FLAGSHIP.active to true — this pointer stays either way.
//
// The strip renders only when FLAGSHIP.realtor_ca_url is truthy; setting
// it to null in `config/flagshipListing.js` hides the strip everywhere.
export default function FeaturedListingPointer({ tone = "paper" } = {}) {
  const href = FLAGSHIP.realtor_ca_url;
  if (!href) return null;

  const isDark = tone === "dark";
  const bg = isDark ? "#0F2A5B" : "#FBF7EE";
  const border = isDark ? "rgba(218,191,122,0.35)" : "rgba(15,42,91,0.10)";
  const label = isDark ? "#DABF7A" : "#8A6D2E";
  const primary = isDark ? "#F8F5EA" : "#0F2A5B";
  const secondary = isDark ? "rgba(255,255,255,0.75)" : "#4B5563";

  const priceStr = FLAGSHIP.price
    ? `$${Number(FLAGSHIP.price).toLocaleString("en-CA", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })}`
    : null;

  return (
    <section
      data-testid="featured-listing-pointer"
      aria-label="Doug's featured listing"
      style={{ background: bg, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}
    >
      <div style={{
        maxWidth: 1240, margin: "0 auto", padding: "14px 24px",
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px 18px",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}>
        <span
          data-testid="pointer-eyebrow"
          style={{
            fontSize: "0.7rem", letterSpacing: "0.16em", fontWeight: 700,
            textTransform: "uppercase", color: label, whiteSpace: "nowrap",
          }}
        >
          ★ Doug's Featured Listing
        </span>

        <span style={{ color: primary, fontSize: "0.92rem", fontWeight: 600 }}>
          {FLAGSHIP.address}
          <span style={{ color: secondary, fontWeight: 400 }}>
            {FLAGSHIP.community ? <>, {FLAGSHIP.community}</> : null}, {FLAGSHIP.city}, {FLAGSHIP.province}
          </span>
        </span>

        <span style={{ color: secondary, fontSize: "0.82rem", letterSpacing: "0.02em" }}>
          {priceStr ? <>· {priceStr} </> : null}
          {FLAGSHIP.mls_number ? <>· MLS® {FLAGSHIP.mls_number}</> : null}
        </span>

        <span style={{ flex: 1 }} />

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="pointer-realtor-cta"
          style={{
            marginLeft: "auto",
            fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.02em",
            color: isDark ? "#0F2A5B" : "#0F2A5B",
            background: "#DABF7A",
            padding: "8px 18px", borderRadius: 999, textDecoration: "none",
            whiteSpace: "nowrap",
            transition: "transform 120ms ease, box-shadow 120ms ease",
            boxShadow: "0 1px 2px rgba(15,42,91,0.08)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,42,91,0.18)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(15,42,91,0.08)"; }}
        >
          View on realtor.ca ↗
        </a>
      </div>
    </section>
  );
}
