// ============================================================================
//  CompareListings — /compare
//  ---------------------------------------------------------------------------
//  Side-by-side comparison of up to 5 CREA DDF® MLS® listings.
//
//  Selection model:
//     localStorage key `ez_compare_keys` (JSON string[]).
//     Same list is written by the "+ Compare" chip on every ListingCard.
//     URL override:   /compare?keys=K1,K2,K3
//     Demo mockup:    /compare?demo=1   (loads the top 3 active BC listings so
//                                        Doug can preview the layout without
//                                        selecting anything).
//
//  Rows (in order — matches Doug's spec):
//     1.  List price
//     2.  Property type
//     3.  Beds / baths
//     4.  Interior square footage
//     5.  Lot size
//     6.  Year built
//     7.  Parking / garage
//     8.  Property style
//     9.  Days on market
//     10. MLS® number
// ============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { X, ArrowLeft, Home } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COMPARE_KEY = "ez_compare_keys";
const MAX_COMPARE = 5;

// Palette (mirrors DashboardMockup C.* tokens so the compare page looks like
// it belongs to the same product).
const C = {
  navy: "#0F2A5B",
  gold: "#F5B301",
  blue: "#0EA5E9",
  ink: "#1F2937",
  muted: "#6B7280",
  paper: "#F5F0E1",
  hair: "rgba(15,42,91,0.10)",
};

// ── Value formatters ─────────────────────────────────────────────────────
const money = (n) => {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return "—";
  return "$" + v.toLocaleString();
};
const dim = (val, units = "sq ft") => {
  if (val == null || val === "" || Number(val) <= 0) return "—";
  return `${Number(val).toLocaleString()} ${units}`;
};
const dom = (createdAt) => {
  if (!createdAt) return "—";
  const t = new Date(createdAt).getTime();
  if (isNaN(t)) return "—";
  const days = Math.max(0, Math.floor((Date.now() - t) / 86400000));
  return `${days} day${days === 1 ? "" : "s"}`;
};
const featureText = (l, keywords) => {
  const src = [
    ...(Array.isArray(l?.features) ? l.features : []),
    l?.description || "",
    l?.property_style || "",
    l?.architectural_style || "",
  ].join(" ").toLowerCase();
  for (const k of keywords) {
    if (src.includes(k.toLowerCase())) return k;
  }
  return null;
};
const parking = (l) => {
  const kw = featureText(l, ["garage", "carport", "attached", "detached", "parking"]);
  if (l?.parking_spaces || l?.garage_spaces) {
    const n = l.parking_spaces || l.garage_spaces;
    return `${n} spot${n === 1 ? "" : "s"}${kw ? " · " + kw : ""}`;
  }
  return kw ? kw.charAt(0).toUpperCase() + kw.slice(1) : "—";
};
const propStyle = (l) => {
  return l?.architectural_style
    || l?.property_style
    || featureText(l, ["Rancher", "2-storey", "Two Storey", "Split Level",
        "Bungalow", "Colonial", "Craftsman", "Contemporary", "Character",
        "Heritage", "Modern"])
    || "—";
};

// ── Row spec (source of truth) ───────────────────────────────────────────
const ROWS = [
  { label: "List price",        render: (l) => (
      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: C.navy }}>
        {money(l.list_price)}
      </span>
    ),
  },
  { label: "Property type",     render: (l) => l.property_type || "—" },
  { label: "Beds / baths",      render: (l) => `${l.beds ?? "—"} bd · ${l.baths ?? "—"} ba` },
  { label: "Interior sq ft",    render: (l) => dim(l.living_area, l.living_area_units || "sq ft") },
  { label: "Lot size",          render: (l) => dim(l.lot_size_area, l.lot_size_units || "sq ft") },
  { label: "Year built",        render: (l) => l.year_built || "—" },
  { label: "Parking / garage",  render: parking },
  { label: "Property style",    render: propStyle },
  { label: "Days on market",    render: (l) => dom(l.created_at) },
  { label: "MLS® number",       render: (l) => l.mls_number || l.listing_key || "—" },
];

// ── Helpers ──────────────────────────────────────────────────────────────
const readSelection = () => {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(Boolean).slice(0, MAX_COMPARE) : [];
  } catch { return []; }
};
const writeSelection = (keys) => {
  try { localStorage.setItem(COMPARE_KEY, JSON.stringify(keys.slice(0, MAX_COMPARE))); }
  catch {}
};

// ── Main component ───────────────────────────────────────────────────────
export default function CompareListings() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [listings, setListings] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const isDemo = params.get("demo") === "1";
  const urlKeys = params.get("keys")?.split(",").map(s => s.trim()).filter(Boolean);
  const selectedKeys = useMemo(() => {
    if (urlKeys && urlKeys.length) return urlKeys.slice(0, MAX_COMPARE);
    return readSelection();
  }, [params]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (isDemo) {
          // Demo mockup — pull the top 3 active BC listings so the page renders
          // with real photos, prices, and specs.
          const r = await fetch(`${API}/listings?limit=3&sort=newest`);
          const d = await r.json();
          setListings(d.listings || []);
        } else if (selectedKeys.length === 0) {
          setListings([]);
        } else {
          const r = await fetch(`${API}/listings/by-keys?keys=${encodeURIComponent(selectedKeys.join(","))}`);
          const d = await r.json();
          const rows = Array.isArray(d) ? d : (d.listings || []);
          // Preserve the caller's order (localStorage / URL).
          const byKey = Object.fromEntries(rows.map(l => [l.listing_key, l]));
          setListings(selectedKeys.map(k => byKey[k]).filter(Boolean));
        }
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [isDemo, selectedKeys.join(",")]);

  const removeOne = (key) => {
    const next = (listings || []).filter(l => l.listing_key !== key);
    setListings(next);
    if (!isDemo) writeSelection(next.map(l => l.listing_key));
  };

  const clearAll = () => {
    setListings([]);
    if (!isDemo) writeSelection([]);
  };

  const rows = listings || [];
  const isEmpty = !loading && rows.length === 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAF8F1",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: C.ink,
    }} data-testid="compare-page">
      {/* Header band */}
      <div style={{
        background: "#fff",
        borderBottom: `1px solid ${C.hair}`,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <button
          onClick={() => {
            // If the visitor landed on /compare directly (bookmark, deep
            // link, or fresh tab) window.history has only one entry so
            // navigate(-1) would silently do nothing. Fall back to "/"
            // in that case so the Back chip is never a dead click.
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}
          data-testid="compare-back"
          style={{
            background: "transparent", border: `1px solid ${C.hair}`,
            padding: "6px 12px", borderRadius: 999, cursor: "pointer",
            color: C.navy, fontSize: 13, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        ><ArrowLeft size={14}/> Back</button>
        <h1 style={{
          margin: 0, flex: 1,
          fontFamily: "'Playfair Display', serif",
          color: C.navy, fontSize: 22, fontWeight: 800,
        }}>
          Compare listings <span style={{ color: C.muted, fontSize: 14, fontWeight: 500 }}>· up to {MAX_COMPARE}</span>
        </h1>
        {rows.length > 0 && !isDemo && (
          <button
            onClick={clearAll}
            data-testid="compare-clear"
            style={{
              background: "transparent", border: "none", color: C.muted,
              fontSize: 12, cursor: "pointer", textDecoration: "underline",
            }}
          >Clear all</button>
        )}
        {isDemo && (
          <span data-testid="compare-demo-badge" style={{
            background: C.paper, color: C.navy, padding: "4px 10px",
            borderRadius: 999, fontSize: 11, fontWeight: 700,
            border: `1px solid ${C.gold}`,
          }}>DEMO MOCKUP</span>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {loading && (
          <div data-testid="compare-loading" style={{ padding: 40, textAlign: "center", color: C.muted }}>
            Loading listings…
          </div>
        )}
        {error && (
          <div style={{ padding: 20, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, color: "#B91C1C" }}>
            Couldn't load comparison: {error}
          </div>
        )}
        {isEmpty && !loading && (
          <EmptyState/>
        )}

        {rows.length > 0 && (
          <CompareTable listings={rows} onRemove={removeOne}/>
        )}

        {/* AI factual-delta summary — compliance guardrails handled server-side
            in services/compare_summary.py. Frontend renders the always-on
            disclaimer below every summary. */}
        {rows.length >= 2 && (
          <CompareSummary keys={rows.map(r => r.listing_key)}/>
        )}

        {/* Compliance footer — same tone as other results pages */}
        <p style={{ marginTop: 32, color: C.muted, fontSize: 11, lineHeight: 1.6 }}>
          Comparison data sourced from CREA DDF® — MLS® listings are provided by the Canadian Real Estate Association
          for general information only. Always verify the current price and availability with a REALTOR® before making
          any offer. Some fields (parking, property style) may be blank when the listing brokerage did not supply them.
        </p>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────
const EmptyState = () => (
  <div style={{
    background: "#fff",
    border: `1px dashed ${C.hair}`,
    borderRadius: 16,
    padding: 40,
    textAlign: "center",
  }} data-testid="compare-empty">
    <div style={{ fontSize: 42, marginBottom: 12 }}>⇄</div>
    <h2 style={{ fontFamily: "'Playfair Display', serif", color: C.navy, margin: 0, fontSize: 20 }}>
      Pick up to 5 listings to compare
    </h2>
    <p style={{ color: C.muted, marginTop: 8, marginBottom: 20 }}>
      Tap the <strong>+ Compare</strong> chip on any listing card, then come back here to see them side-by-side.
    </p>
    <Link to="/search" data-testid="compare-empty-cta" style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: C.navy, color: "#fff", padding: "10px 18px",
      borderRadius: 999, textDecoration: "none", fontWeight: 700, fontSize: 13,
    }}>
      <Home size={14}/> Browse listings
    </Link>
    <div style={{ marginTop: 20 }}>
      <Link
        to="/compare?demo=1"
        data-testid="compare-demo-cta"
        style={{ color: C.blue, fontSize: 12, fontWeight: 600 }}
      >Preview a demo comparison ↗</Link>
    </div>
  </div>
);

// ── Side-by-side table ───────────────────────────────────────────────────
const CompareTable = ({ listings, onRemove }) => {
  // Column count decides layout: 2 or 3 fill nicely; 4-5 need horizontal scroll on mobile.
  const cols = listings.length;
  return (
    <div style={{ overflowX: "auto", background: "#fff", borderRadius: 16, border: `1px solid ${C.hair}`, boxShadow: "0 2px 10px rgba(15,42,91,0.05)" }}>
      <table
        data-testid="compare-table"
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          minWidth: 240 + cols * 220,
        }}
      >
        {/* Header row: listing card previews */}
        <thead>
          <tr>
            <th style={thLabel}>&nbsp;</th>
            {listings.map(l => (
              <th key={l.listing_key} style={thCard}>
                <ListingHeader l={l} onRemove={onRemove}/>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, idx) => (
            <tr key={row.label} style={{ background: idx % 2 === 0 ? "#FDFCF7" : "#fff" }}>
              <td style={tdLabel}>{row.label}</td>
              {listings.map(l => (
                <td key={l.listing_key + "-" + row.label} style={tdCell}
                    data-testid={`compare-cell-${row.label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${l.listing_key}`}>
                  {row.render(l)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ListingHeader = ({ l, onRemove }) => {
  const photo = l?.photos?.[0]?.url || l?.photos?.[0] || null;
  const addr = l.unparsed_address || l.street_address || "Address on request";
  return (
    <div style={{ position: "relative", padding: "8px 10px" }}>
      <button
        onClick={() => onRemove(l.listing_key)}
        aria-label={`Remove ${addr} from comparison`}
        data-testid={`compare-remove-${l.listing_key}`}
        style={{
          position: "absolute", top: 4, right: 4,
          width: 24, height: 24, borderRadius: 999, border: "none",
          background: "rgba(15,42,91,0.85)", color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      ><X size={14}/></button>
      <Link to={`/listing/${l.listing_key}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{
          width: "100%", aspectRatio: "4 / 3", borderRadius: 10,
          background: photo
            ? `center/cover no-repeat url(${typeof photo === "string" ? photo : photo.url})`
            : "#EEF2FF",
          border: `1px solid ${C.hair}`, marginBottom: 8,
        }}/>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, lineHeight: 1.35 }}>{addr}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {[l.city, l.region].filter(Boolean).join(" · ")}
        </div>
      </Link>
    </div>
  );
};


// ── Doogie AI Compare Summary ─────────────────────────────────────────────
// Compliance guardrails live on the server (services/compare_summary.py).
// This component just fetches, renders, and shows the mandatory disclaimer.
// If guardrails trip server-side, `guardrails_triggered` comes back true and
// the server sends a safe fallback string — no client-side branching needed.
const CompareSummary = ({ keys }) => {
  const [state, setState] = useState({ loading: true, summary: "", guardrails: false, error: null });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState({ loading: true, summary: "", guardrails: false, error: null });
      try {
        const r = await fetch(`${API}/compare/summary?keys=${encodeURIComponent(keys.join(","))}`);
        const d = await r.json();
        if (cancelled) return;
        setState({
          loading: false,
          summary: d.summary || "",
          guardrails: !!d.guardrails_triggered,
          error: r.ok ? null : (d.detail || "Failed to load summary."),
        });
      } catch (e) {
        if (!cancelled) setState({ loading: false, summary: "", guardrails: true, error: String(e) });
      }
    })();
    return () => { cancelled = true; };
  }, [keys.join(",")]);
  return (
    <section
      data-testid="compare-summary"
      style={{
        marginTop: 24,
        background: "#fff",
        border: `1px solid ${C.hair}`,
        borderRadius: 16,
        padding: "18px 22px",
        boxShadow: "0 2px 10px rgba(15,42,91,0.05)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{
          background: C.navy, color: "#fff",
          padding: "3px 10px", borderRadius: 999,
          fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
        }}>DOOGIE</span>
        <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", color: C.navy, fontSize: 18 }}>
          The biggest factual tradeoffs
        </h3>
      </header>
      {state.loading && (
        <p data-testid="compare-summary-loading" style={{ color: C.muted, margin: 0 }}>
          Doogie is comparing the specs…
        </p>
      )}
      {!state.loading && state.summary && (
        <p data-testid="compare-summary-text" style={{
          margin: 0, fontSize: 15, lineHeight: 1.65, color: C.ink,
        }}>{state.summary}</p>
      )}
      {/* Always-on compliance disclaimer (guardrail #5). Rendered whether or
          not the LLM output was blocked so the user always sees the
          "information, not advice" framing. */}
      <p
        data-testid="compare-summary-disclaimer"
        style={{
          marginTop: 12,
          padding: "10px 12px",
          background: "#FEF9E7",
          border: "1px solid #F5B301",
          borderRadius: 10,
          color: C.ink,
          fontSize: 11,
          lineHeight: 1.55,
        }}
      >
        <strong>General information only. Not real estate advice.</strong>{" "}
        This summary describes factual differences between listings; it does not
        recommend a specific property. Always verify details with a licensed
        REALTOR® before making an offer. Data source: CREA DDF®.
        {state.guardrails && (
          <>
            {" "}
            <span style={{ color: C.muted }}>(An automated compliance filter
            adjusted this summary to keep it strictly factual.)</span>
          </>
        )}
      </p>
    </section>
  );
};


// ── Cell styles (module constants) ───────────────────────────────────────
const thLabel = { textAlign: "left", padding: "12px 16px", borderBottom: `1px solid ${C.hair}`, width: 200, background: "#fff", position: "sticky", left: 0, zIndex: 1 };
const thCard  = { textAlign: "left", padding: 8, borderBottom: `1px solid ${C.hair}`, borderLeft: `1px solid ${C.hair}`, minWidth: 220, verticalAlign: "top", background: "#fff" };
const tdLabel = { padding: "12px 16px", color: C.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, verticalAlign: "top", width: 200, position: "sticky", left: 0, background: "inherit", zIndex: 1, borderBottom: `1px solid ${C.hair}` };
const tdCell  = { padding: "12px 16px", color: C.ink, fontSize: 14, verticalAlign: "top", borderLeft: `1px solid ${C.hair}`, borderBottom: `1px solid ${C.hair}` };
