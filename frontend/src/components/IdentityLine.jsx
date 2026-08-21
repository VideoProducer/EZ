// IdentityLine — Doug + Brokerage identity strip. RESA/BCFSA best practice
// requires the licensee name AND full related-brokerage name to be
// prominently displayed on every page that would result in real estate
// services (valuation, buyer intake, seller intake, referral request) —
// not tucked into the footer.
//
// Renders Doug's approved photo, licensee name, brokerage, and a short
// practice/context line. Used on /valuation, /buyer, /seller, and
// /referral-request as the first element above the H1 so visitors know
// exactly who they are contacting BEFORE they read the offer.
import React from "react";

export const IdentityLine = ({
  practice = "REALTOR® · Fraser Valley + South Surrey",
  size = "md",   // "sm" for sidebar, "md" for hero, "lg" for landing pages
  testId = "identity-line",
}) => {
  const dim = size === "lg" ? 88 : size === "sm" ? 48 : 64;
  const nameSize = size === "lg" ? "1.35rem" : size === "sm" ? "0.95rem" : "1.1rem";
  const subSize  = size === "lg" ? "0.95rem" : "0.82rem";
  return (
    <div data-testid={testId} style={{
      display: "flex", alignItems: "center", gap: "0.85rem",
      padding: size === "lg" ? "1rem 1.15rem" : "0.65rem 0.85rem",
      background: "rgba(15,42,91,0.04)",
      border: "1px solid rgba(15,42,91,0.14)",
      borderRadius: 12,
      marginBottom: "1.25rem",
      lineHeight: 1.35,
    }}>
      <img
        src="/doug-headshot-2026.jpg"
        alt="Doug LeMaire, REALTOR®"
        width={dim}
        height={dim}
        loading="lazy"
        decoding="async"
        style={{
          width: dim, height: dim, borderRadius: "50%", objectFit: "cover",
          border: "2px solid #DABF7A",
          flexShrink: 0,
          boxShadow: "0 4px 12px rgba(15,42,91,0.15)",
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          data-testid={`${testId}-name`}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: nameSize,
            color: "var(--brand-navy, #0F2A5B)",
            lineHeight: 1.15,
          }}
        >
          Doug LeMaire, REALTOR<span style={{ fontSize: "0.7em", verticalAlign: "super" }}>®</span>
        </div>
        <div
          data-testid={`${testId}-brokerage`}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: subSize,
            color: "var(--muted, #4a5568)",
            marginTop: 2,
          }}
        >
          Fraser Property Management Realty Services Ltd.
        </div>
        {practice && (
          <div
            data-testid={`${testId}-practice`}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.78rem",
              color: "var(--muted, #4a5568)",
              opacity: 0.85,
              marginTop: 2,
            }}
          >
            {practice}
          </div>
        )}
      </div>
    </div>
  );
};

export default IdentityLine;
