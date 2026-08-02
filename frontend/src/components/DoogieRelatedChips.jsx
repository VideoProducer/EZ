// EZtoFind.ca — Doogie related-content chips
// -----------------------------------------------------------------------------
// After each Doogie assistant answer, this component fetches related resources
// via /api/search (using the preceding USER question as the query) and renders
// a compact horizontal chip row so every AI reply becomes a launchpad into the
// deeper knowledge library. Silent-hides on empty/error.
//
// Compliance: results are drawn from the approved content library only. No
// personal information is sent to the search endpoint — just the raw question
// text the user typed. Analytics tracks chip clicks under the event name
// "doogie_chip_click" with only the target kind (never chat content).

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CHIP_KIND_STYLES = {
  Terms:       { bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8", icon: "📖" },
  FAQs:        { bg: "#F0FDF4", border: "#BBF7D0", color: "#047857", icon: "❓" },
  Tools:       { bg: "#FFFBEB", border: "#FDE68A", color: "#B45309", icon: "🧮" },
  Communities: { bg: "#F0F9FF", border: "#BAE6FD", color: "#0369A1", icon: "📍" },
  Journey:     { bg: "#F0FDF4", border: "#BBF7D0", color: "#166534", icon: "🧭" },
};

// Which groups to surface as chips (skip Listings + Doogie — self-referential in a chat)
const CHIP_GROUP_PRIORITY = ["Terms", "Journey", "Tools", "Communities", "FAQs"];

export default function DoogieRelatedChips({ query, testIdPrefix = "doogie-chip" }) {
  const [chips, setChips] = useState(null);

  useEffect(() => {
    if (!query || !query.trim() || query.length < 3) {
      setChips([]);
      return;
    }
    let cancelled = false;
    axios
      .get(`${API}/search`, { params: { q: query, limit: 2 } })
      .then((r) => {
        if (cancelled) return;
        const groups = r.data?.groups || [];
        // Pick top item from up to 4 different meaningful groups.
        const picks = [];
        for (const kind of CHIP_GROUP_PRIORITY) {
          const g = groups.find((x) => x.kind === kind && x.items && x.items.length > 0);
          if (g) {
            picks.push({ kind: g.kind, ...g.items[0] });
            if (picks.length >= 4) break;
          }
        }
        setChips(picks);
      })
      .catch(() => { if (!cancelled) setChips([]); });
    return () => { cancelled = true; };
  }, [query]);

  if (!chips || chips.length === 0) return null;

  return (
    <div data-testid={`${testIdPrefix}-wrap`} style={{
      marginTop: "0.65rem",
      display: "flex",
      flexWrap: "wrap",
      gap: "0.4rem",
      alignItems: "center",
    }}>
      <span style={{
        fontSize: "0.68rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#5B6577",
        fontWeight: 700,
        fontFamily: "Inter,sans-serif",
        marginRight: "0.25rem",
      }} aria-hidden>Explore →</span>
      {chips.map((c, i) => {
        const s = CHIP_KIND_STYLES[c.kind] || CHIP_KIND_STYLES.Terms;
        // Truncate long titles so chips stay compact
        const label = c.title.length > 36 ? c.title.slice(0, 34) + "…" : c.title;
        return (
          <Link
            key={`${c.kind}-${i}-${c.href}`}
            to={c.href}
            data-testid={`${testIdPrefix}-${i}`}
            data-chip-kind={c.kind}
            title={c.title}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.7rem",
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 999,
              color: s.color,
              fontSize: "0.78rem",
              fontFamily: "Inter,sans-serif",
              fontWeight: 600,
              textDecoration: "none",
              lineHeight: 1.2,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 3px 8px rgba(15,42,91,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <span aria-hidden style={{ fontSize: "0.82rem" }}>{s.icon}</span>
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
