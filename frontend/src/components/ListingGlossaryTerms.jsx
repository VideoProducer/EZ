// Renders the contextual glossary terms that apply to a specific listing's type.
// variant="full"    → titled card with grouped chip links (listing detail page)
// variant="compact" → single thin row of specialty chips (Doogie result cards)
import React from "react";
import { Link } from "react-router-dom";
import { glossaryGroupsForListing, glossaryTermsFlat } from "../lib/listingGlossary";

const chipStyle = {
  display: "inline-block",
  fontFamily: "Inter, sans-serif",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#0F2A5B",
  background: "#fff",
  border: "1px solid rgba(15,42,91,0.22)",
  borderRadius: 999,
  padding: "0.28rem 0.7rem",
  textDecoration: "none",
  lineHeight: 1.2,
  transition: "background-color 0.15s, border-color 0.15s",
};

export const ListingGlossaryTerms = ({ listing, variant = "full" }) => {
  if (variant === "compact") {
    const terms = glossaryTermsFlat(listing, { max: 4, includeBaseline: false });
    if (!terms.length) return null;
    return (
      <div data-testid="doogie-listing-glossary" style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", alignItems: "center", marginTop: "0.4rem" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.02em" }}>Terms:</span>
        {terms.map((t) => (
          <Link key={t.slug} to={`/glossary/${t.slug}`} data-testid={`doogie-glossary-chip-${t.slug}`}
            style={{ ...chipStyle, fontSize: "0.68rem", fontWeight: 600, padding: "0.12rem 0.5rem" }}>
            {t.label}
          </Link>
        ))}
      </div>
    );
  }

  const groups = glossaryGroupsForListing(listing, { includeBaseline: true });
  if (!groups.length) return null;
  return (
    <div data-testid="listing-glossary-primer" style={{ marginTop: "1rem", padding: "16px 18px", background: "rgba(15,42,91,0.04)", borderRadius: 10 }}>
      <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: "var(--brand-navy)", fontSize: "1rem", marginBottom: "0.35rem" }} data-testid="listing-glossary-title">
        BC real-estate glossary terms
      </div>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 0.85rem", lineHeight: 1.5 }} data-testid="listing-glossary-disclaimer">
        General definitions that may relate to this property type, for information only — not advice, a recommendation, or an opinion about this property or its value. Verify all details with the listing brokerage and consult a licensed professional before acting.
      </p>
      {groups.map((g) => (
        <div key={g.key} data-testid={`listing-glossary-group-${g.key}`} style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--brand-blue)", marginBottom: "0.45rem" }}>
            {g.label}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {g.terms.map((t) => (
              <Link key={t.slug} to={`/glossary/${t.slug}`} data-testid={`listing-glossary-chip-${t.slug}`} style={chipStyle}>
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListingGlossaryTerms;
