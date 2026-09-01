// Single source of truth for public content counts.
//
// Backed by GET /api/site/counts (5-min backend cache) so every consumer —
// SEO titles, meta descriptions, homepage hero, glossary index, admin panel,
// llms.txt regen jobs — reads the same authoritative number instead of a
// hand-typed literal. This is what stops the "396 in the SEO title but 439
// in the body" drift the crawler audit flagged.
//
// Usage:
//   const counts = useSiteCounts();
//   counts.glossary_terms       -> 439
//   counts.communities          -> 240
//   counts.active_listings      -> 52,200 (live)
//   counts.community_synopses   -> 244
//   counts.neighbourhood_synopses -> 912
//   counts.market_report_snapshots -> N
//   counts.loading              -> true while first fetch is in flight
//
// The hook caches the response for the lifetime of the page load — it
// doesn't re-fetch on every render — so it's safe to call from any
// component. During the initial paint (before the fetch resolves) it
// returns sensible fallbacks matching the current backend truth, so no
// component ever renders "0 terms" or an empty string.

import { useEffect, useState } from "react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Sensible fallbacks — must match the current authoritative counts so
// the first paint never renders an obviously-wrong number. When Mongo
// grows past these, the fetch corrects the display within ~100 ms.
const FALLBACK = {
  glossary_terms: 439,
  communities: 240,
  community_synopses: 244,
  neighbourhood_synopses: 912,
  active_listings: 52000,
  testimonials_published: 1,
  market_report_snapshots: 2,
  loading: true,
};

// Module-level cache so we hit /api/site/counts at most once per page load,
// even if 30 components call the hook.
let _cached = null;
let _pending = null;

function fetchCounts() {
  if (_cached) return Promise.resolve(_cached);
  if (_pending) return _pending;
  _pending = fetch(`${API}/site/counts`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data && typeof data.glossary_terms === "number") {
        _cached = { ...FALLBACK, ...data, loading: false };
      }
      _pending = null;
      return _cached;
    })
    .catch(() => {
      _pending = null;
      return null;
    });
  return _pending;
}

export function useSiteCounts() {
  const [counts, setCounts] = useState(_cached || FALLBACK);
  useEffect(() => {
    if (_cached) return;
    let alive = true;
    fetchCounts().then((c) => {
      if (alive && c) setCounts(c);
    });
    return () => {
      alive = false;
    };
  }, []);
  return counts;
}

// Convenience formatters
export const fmtInt = (n) => (typeof n === "number" ? n.toLocaleString("en-CA") : String(n));
