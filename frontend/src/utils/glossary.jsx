// ── Popular Glossary Terms + inline auto-linker (Feb 2026) ─────────────
// Config-driven config + <GlossaryProse text="..."/> component used by:
//   • Footer "Popular Terms" column (App.js)
//   • Buyer / Seller / Valuation form hero intros (App.js)
//   • Community and Listing detail pages (CommunityPageMockupLive.jsx,
//     App.js listing-detail primer)
//
// Each call to <GlossaryProse text="..."/> renders the first mention of
// each POPULAR_GLOSSARY_TERM within that text prop as a dotted-underlined
// <Link/> to /glossary/{slug}. First-mention is scoped PER text prop
// (not per page) — this keeps the component pure and StrictMode-safe.
// `<GlossaryPageProvider>` is kept as a no-op wrapper to avoid churning
// the call sites; it currently just renders children.
import React from "react";
import { Link } from "react-router-dom";

export const POPULAR_GLOSSARY_TERMS = [
  { slug: "property-transfer-tax-ptt",              label: "PTT",              aliases: ["Property Transfer Tax", "PTT"] },
  { slug: "gst-new-housing-rebate-bc",              label: "GST",              aliases: ["GST New Housing Rebate", "GST rebate", "GST"] },
  { slug: "agricultural-land-reserve-alr",          label: "ALR",              aliases: ["Agricultural Land Reserve", "ALR"] },
  { slug: "subject-removal",                        label: "Subject Removal",  aliases: ["Subject Removal", "subject removal"] },
  { slug: "2-5-10-home-warranty",                   label: "2-5-10 Warranty",  aliases: ["2-5-10 Home Warranty", "2-5-10 warranty", "2-5-10"] },
  { slug: "form-b-strata-information-certificate",  label: "Form B",           aliases: ["Form B — Strata Information Certificate", "Form B"] },
  { slug: "amortization-period",                    label: "Amortization",     aliases: ["Amortization Period", "amortization"] },
  { slug: "first-time-home-buyers-program-ptt",     label: "FTB Exemption",    aliases: ["First Time Home Buyers' Program", "First-Time Home Buyer Exemption", "FTB exemption"] },
];

// Backwards-compat no-op wrapper so call sites that already opted-in to
// page-level provider still compile. Previous implementation used a
// React ref set here to enforce a strict "first mention per page" rule,
// but that ran into React StrictMode double-invocation bleeding used
// slugs across renders. Scoped first-mention-per-text-prop is close
// enough for SEO and stays deterministic.
export const GlossaryPageProvider = ({ children }) => <>{children}</>;

const _escRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const GlossaryProse = ({ text, style }) => {
  if (!text || typeof text !== "string") return <>{text}</>;

  // Build immutable candidate list once per call.
  const candidates = POPULAR_GLOSSARY_TERMS.flatMap(t =>
    t.aliases.map(a => ({ term: t, alias: a, re: new RegExp(`\\b${_escRE(a)}\\b`, "i") }))
  );

  const usedSlugs = new Set();
  const nodes = [];
  let remaining = text;
  let iter = 0;
  const MAX_ITER = 20;
  while (remaining && iter < MAX_ITER) {
    iter += 1;
    let best = null;
    for (const c of candidates) {
      if (usedSlugs.has(c.term.slug)) continue;
      const m = c.re.exec(remaining);
      if (!m) continue;
      if (!best || m.index < best.start) best = { start: m.index, end: m.index + m[0].length, matched: m[0], term: c.term };
    }
    if (!best) {
      nodes.push(remaining);
      break;
    }
    usedSlugs.add(best.term.slug);
    if (best.start > 0) nodes.push(remaining.slice(0, best.start));
    nodes.push(
      <Link
        key={`${best.term.slug}-${nodes.length}`}
        to={`/glossary/${best.term.slug}`}
        data-testid={`inline-glossary-${best.term.slug}`}
        style={{ color: "inherit", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px", textDecorationColor: "var(--brand-gold)" }}
        title={`See glossary: ${best.term.label}`}
      >
        {best.matched}
      </Link>
    );
    remaining = remaining.slice(best.end);
  }
  return <span style={style}>{nodes}</span>;
};
