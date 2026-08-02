// EZtoFind.ca — Phase B "You May Also Be Looking For" reusable component
// -----------------------------------------------------------------------------
// Fetches mixed cross-type related content (glossary + guide + calculator +
// community + listings) from /api/related-content/{source_type}/{source_id}
// and renders a 3–6 card grid. Every card exposes:
//   - kind (Glossary / Guide / Community / Estimator / Listings / Compliance)
//   - title
//   - one-sentence blurb
//   - href
//   - reason code (used for admin inspection, not shown to visitors)
//
// Compliance: content_relations records marked visibility="client-only" are
// never returned by the public endpoint. This component only renders public
// approved content.

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BRAND = {
  navy: "#0F2A5B",
  blue: "#2563EB",
  cream: "#FBFAF6",
  muted: "#5B6577",
};

// Card kind → colored dot for a subtle visual taxonomy.
const kindDot = {
  Glossary:   "#2563EB",
  Guide:      "#178A3E",
  Community:  "#0EA5E9",
  Estimator:  "#F59E0B",
  Listings:   "#8B5CF6",
  Compliance: "#DC2626",
};

export default function YouMayAlsoBeLookingFor({
  sourceType,
  sourceId,
  limit = 6,
  heading = "You may also be looking for",
  subheading = "Related resources on EZtoFind.ca",
  testId = "you-may-also-be-looking-for",
}) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!sourceType || !sourceId) return;
    let cancelled = false;
    axios
      .get(`${API}/related-content/${sourceType}/${encodeURIComponent(sourceId)}?limit=${limit}`)
      .then(r => {
        if (!cancelled) setItems(r.data?.items || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => { cancelled = true; };
  }, [sourceType, sourceId, limit]);

  // Silent-hide while loading or if nothing to show (never leak errors to public).
  if (!items || items.length === 0) return null;

  return (
    <div className="paper" data-testid={testId} style={{ padding: "1.5rem", marginTop: "2rem" }}>
      <div style={{
        fontSize: "0.72rem",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: BRAND.blue,
        fontWeight: 800,
        marginBottom: "0.5rem",
      }}>{heading}</div>
      {subheading && (
        <h3 style={{
          margin: "0 0 1rem",
          fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif',
          color: BRAND.navy,
          fontSize: "1.25rem",
        }}>{subheading}</h3>
      )}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))",
        gap: "0.85rem",
      }}>
        {items.map((it, i) => (
          <Link
            key={`${it.href}-${i}`}
            to={it.href}
            data-testid={`related-card-${i}`}
            data-reason={it.reason || ""}
            style={{
              padding: "1rem",
              border: "1px solid rgba(15,42,91,0.12)",
              borderRadius: 8,
              background: BRAND.cream,
              textDecoration: "none",
              color: "inherit",
              display: "block",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = BRAND.blue;
              e.currentTarget.style.background = "#F0F4FB";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(15,42,91,0.12)";
              e.currentTarget.style.background = BRAND.cream;
            }}
          >
            <div style={{
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: BRAND.blue,
              fontWeight: 700,
              marginBottom: "0.35rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}>
              <span aria-hidden style={{
                width: "0.55rem",
                height: "0.55rem",
                borderRadius: "50%",
                background: kindDot[it.kind] || BRAND.blue,
                display: "inline-block",
              }}/>
              {it.kind}
            </div>
            <div style={{
              fontWeight: 700,
              color: BRAND.navy,
              fontFamily: "Inter,sans-serif",
              fontSize: "0.95rem",
              marginBottom: "0.35rem",
              lineHeight: 1.35,
            }}>{it.title}</div>
            <div style={{
              color: BRAND.muted,
              fontFamily: "Inter,sans-serif",
              fontSize: "0.85rem",
              lineHeight: 1.5,
            }}>{it.blurb}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
