/**
 * SimilarListingsWidget — "Compare with a similar home"
 * ---------------------------------------------------------------
 * Renders 2–3 comparable active MLS® listings from the same city as the
 * source listing. Tapping "+ Add to compare" on any card:
 *   1. Adds the SOURCE listing to `ez_compare_keys` (so the user doesn't
 *      have to remember to select their current home).
 *   2. Adds the picked comparable.
 *   3. Fires the `ez-compare-changed` event so the floating tray updates.
 *   4. Optionally navigates to /compare immediately when the user hits the
 *      big "Compare now" button.
 *
 * All matching happens server-side at /api/listings/{key}/similar — same
 * city, same property type, ±25% price, ±1 beds fallback.
 */
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COMPARE_KEY = "ez_compare_keys";
const MAX_COMPARE = 5;

const readCompare = () => {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
};

const writeCompare = (keys) => {
  const capped = keys.slice(0, MAX_COMPARE);
  try { localStorage.setItem(COMPARE_KEY, JSON.stringify(capped)); } catch {}
  try { window.dispatchEvent(new CustomEvent("ez-compare-changed", { detail: capped })); } catch {}
  return capped;
};

const SimilarListingsWidget = ({ sourceKey, sourceCity }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [compareKeys, setCompareKeys] = useState(readCompare());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get(`${API}/listings/${encodeURIComponent(sourceKey)}/similar?limit=3`);
        if (!cancelled) setItems(r.data?.listings || []);
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      }
    })();
    return () => { cancelled = true; };
  }, [sourceKey]);

  // Keep local compareKeys in sync when other components broadcast changes.
  useEffect(() => {
    const on = (e) => setCompareKeys(Array.isArray(e.detail) ? e.detail : readCompare());
    window.addEventListener("ez-compare-changed", on);
    return () => window.removeEventListener("ez-compare-changed", on);
  }, []);

  const addToCompare = (compKey) => {
    let keys = readCompare();
    // Ensure the source listing is included so a fresh compare has at least 2 rows.
    if (!keys.includes(sourceKey)) keys = [sourceKey, ...keys];
    if (!keys.includes(compKey)) {
      if (keys.length >= MAX_COMPARE) {
        alert("You already have 5 listings in compare — remove one first.");
        return;
      }
      keys = [...keys, compKey];
    }
    setCompareKeys(writeCompare(keys));
  };

  const openCompareNow = () => {
    let keys = readCompare();
    if (!keys.includes(sourceKey)) keys = [sourceKey, ...keys];
    if (keys.length < 2) {
      // Force at least the source + first suggested comp before navigating.
      const first = (items || [])[0]?.listing_key;
      if (first && !keys.includes(first)) keys = [...keys, first];
    }
    setCompareKeys(writeCompare(keys));
    navigate("/compare");
  };

  if (error) return null;         // Silent — widget is optional, not critical.
  if (!items) {
    return (
      <div data-testid="listing-similar-loading" style={{
        marginTop: "2.5rem", padding: "1.25rem",
        background: "#F5F0E1", borderRadius: 14,
        color: "#0F2A5B", fontFamily: "Inter,sans-serif", fontSize: "0.9rem",
      }}>Doogie is pulling up comparable homes in {sourceCity || "this area"}…</div>
    );
  }
  if (items.length === 0) return null;

  return (
    <section
      data-testid="listing-similar-widget"
      style={{
        marginTop: "2.5rem",
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 16,
        padding: "1.4rem 1.5rem",
        boxShadow: "0 2px 10px rgba(15,42,91,0.05)",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: "1rem" }}>
        <div>
          <div style={{ fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#0EA5E9" }}>
            Compare with a similar home
          </div>
          <h2 style={{ margin: "4px 0 0", fontFamily: "'Playfair Display',serif", fontSize: "1.35rem", color: "#0F2A5B" }}>
            Homes like this one in {sourceCity || "the same area"}
          </h2>
        </div>
        <button
          onClick={openCompareNow}
          data-testid="listing-similar-open-compare"
          style={{
            background: "#0F2A5B", color: "#fff", border: "none",
            padding: "9px 18px", borderRadius: 999, fontWeight: 700,
            fontFamily: "Inter,sans-serif", fontSize: "0.85rem",
            cursor: "pointer", boxShadow: "0 6px 14px rgba(15,42,91,0.25)",
          }}
        >⇄ Compare now</button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        {items.map(l => {
          const inSet = compareKeys.includes(l.listing_key);
          const cover = l.photos?.[0]?.url || l.photos?.[0] || null;
          return (
            <div
              key={l.listing_key}
              data-testid={`listing-similar-card-${l.listing_key}`}
              style={{
                border: inSet ? "2px solid #F5B301" : "1px solid #E5E7EB",
                borderRadius: 12, overflow: "hidden", background: "#fff",
              }}
            >
              <Link to={`/listing/${l.listing_key}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{
                  height: 130,
                  background: cover
                    ? `center/cover no-repeat url(${typeof cover === "string" ? cover : cover.url})`
                    : "#EEF2FF",
                }}/>
              </Link>
              <div style={{ padding: "10px 12px 12px" }}>
                <div style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, color: "#0F2A5B", fontSize: "1.05rem" }}>
                  {l.list_price ? `$${Number(l.list_price).toLocaleString("en-CA")}` : "Price on request"}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.street_address || l.unparsed_address || "Address on request"}
                </div>
                <div style={{ fontSize: 11, color: "#1F2937", marginTop: 4 }}>
                  {l.beds != null && `${l.beds}bd`}{l.baths != null && ` · ${l.baths}ba`}
                  {l.property_type && ` · ${l.property_type}`}
                </div>
                <button
                  onClick={() => addToCompare(l.listing_key)}
                  disabled={inSet}
                  data-testid={`listing-similar-add-${l.listing_key}`}
                  style={{
                    marginTop: 10, width: "100%",
                    background: inSet ? "#F5B301" : "#0F2A5B",
                    color: inSet ? "#0F2A5B" : "#fff",
                    border: "none", padding: "8px 12px", borderRadius: 8,
                    fontFamily: "Inter,sans-serif", fontWeight: 700, fontSize: 12,
                    cursor: inSet ? "default" : "pointer",
                  }}
                >{inSet ? "✓ In comparison" : "+ Add to compare"}</button>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: "1rem", fontSize: "0.72rem", color: "#6B7280", fontFamily: "Inter,sans-serif", lineHeight: 1.5 }}>
        Suggestions are drawn from currently active MLS® listings in the same city with the same property type and a price within ±25%. Data source: CREA DDF®.
      </p>
    </section>
  );
};

export default SimilarListingsWidget;
