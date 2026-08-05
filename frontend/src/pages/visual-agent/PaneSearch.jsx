// EZtoFind.ca — Visual Agent · Search pane
// Extracted from VisualAgentDemo.jsx (Feb 2026). Renders live CREA DDF®
// listings for the committed city and falls back to MOCK_LISTINGS when
// the API returns nothing.

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Building2, Radio } from "lucide-react";
import { C, API, MOCK_LISTINGS } from "./constants";
import { Pill } from "./atoms";

export const PaneSearch = ({ query, setQuery, committed, onCommit }) => {
  const submit = (e) => {
    e && e.preventDefault && e.preventDefault();
    onCommit(query);
  };
  // Fetch real active CREA DDF listings for the committed city. If the API
  // returns nothing (rare city or DDF hiccup) we fall back to the illustrative
  // sample so the pane never renders empty.
  const [liveListings, setLiveListings] = React.useState(null); // null=loading, []=none, [...]=have
  const [liveCount, setLiveCount] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    setLiveListings(null);
    (async () => {
      try {
        const url = `${API}/listings?city=${encodeURIComponent(committed)}&limit=8&sort=newest`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("listings failed");
        const data = await r.json();
        if (cancelled) return;
        setLiveListings(Array.isArray(data.listings) ? data.listings : []);
        setLiveCount(typeof data.total === "number" ? data.total : null);
      } catch {
        if (!cancelled) setLiveListings([]);
      }
    })();
    return () => { cancelled = true; };
  }, [committed]);
  const usingLive = Array.isArray(liveListings) && liveListings.length > 0;
  return (
    <div data-testid="pane-search" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>
          {usingLive ? <>Live from CREA DDF® · <span style={{ color: C.blue }}>{committed}</span></> : <>Live from CREA DDF® · {committed} · 2BR · &lt;$1.5M</>}
        </strong>
        <Pill tone="green">
          <Radio size={12}/> {usingLive ? `${liveCount ?? liveListings.length}+ active` : `${MOCK_LISTINGS.length}+ active`}
        </Pill>
      </div>

      {/* Real search input — type any BC area or ask by voice */}
      <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{
          flex: "1 1 260px", position: "relative",
        }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6B7280" }}/>
          <input
            data-testid="search-area-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a BC area — e.g. Kitsilano, Whistler, Kelowna, Nanaimo, Cranbrook"
            style={{
              width: "100%", padding: "9px 12px 9px 32px",
              borderRadius: 10, border: "1px solid #D1D5DB",
              fontSize: 13, fontFamily: "inherit", background: "#fff",
            }}
          />
        </div>
        <button
          type="submit"
          data-testid="search-area-submit"
          style={{
            padding: "9px 16px", borderRadius: 10, border: "none",
            background: C.navy, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >Search</button>
      </form>
      <div style={{ fontSize: 11, color: "#6B7280", marginTop: -2 }}>
        Prefer voice? Tap <strong>Ask by voice</strong> at the top-right and just say where you're looking.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {liveListings === null && (
          <div style={{ fontSize: 12, color: "#6B7280", padding: 20 }}>Loading real BC listings…</div>
        )}
        {usingLive && liveListings.map((l, i) => {
          const key = l.listing_key || l.id || i;
          const priceNum = typeof l.list_price === "number" ? l.list_price : parseFloat(l.list_price || 0);
          const priceStr = priceNum ? `$${priceNum.toLocaleString("en-CA")}` : "—";
          const beds = l.beds ?? l.bedrooms ?? "—";
          const baths = l.baths ?? l.bathrooms ?? "—";
          const sqft = l.living_area || l.sqft || null;
          const dom = l.days_on_market ?? l.dom ?? null;
          const media = (Array.isArray(l.photos) && l.photos[0])
            || (Array.isArray(l.Media) && l.Media[0] && l.Media[0].MediaURL)
            || l.image
            || null;
          const tag = dom != null && dom <= 3 ? "New listing" : (l.property_type || "");
          const addr = l.unparsed_address || l.street_address || l.address || l.listing_key;
          const city = l.city || committed;
          return (
            <Link
              key={key}
              to={`/listings/${l.listing_key}`}
              data-testid={`live-listing-${l.listing_key}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3, boxShadow: "0 12px 28px rgba(15,42,91,0.15)" }}
                style={{
                  background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
                  overflow: "hidden", boxShadow: "0 1px 2px rgba(15,42,91,0.04)",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  height: 96,
                  background: media
                    ? `url(${media}) center/cover, linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`
                    : `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
                  position: "relative",
                }}>
                  {tag && (
                    <span style={{
                      position: "absolute", top: 8, left: 8, background: "rgba(255,255,255,0.9)",
                      color: C.navy, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                    }}>{tag}</span>
                  )}
                  {!media && <Building2 size={44} style={{ position: "absolute", right: 10, bottom: 10, color: "rgba(255,255,255,0.55)" }}/>}
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{priceStr}</div>
                  <div style={{ fontSize: 12, color: "#4B5563", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {addr}{city ? ` · ${city}` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span>{beds}bd</span><span>·</span><span>{baths}ba</span>
                    {sqft ? <><span>·</span><span>{sqft} sqft</span></> : null}
                    {dom != null ? <><span>·</span><span>{dom}d</span></> : null}
                  </div>
                </div>
              </motion.div>
            </Link>
          );
        })}
        {liveListings !== null && !usingLive && MOCK_LISTINGS.map((l, i) => (
          <Link
            key={l.id}
            to={`/listings?q=${encodeURIComponent(committed)}`}
            data-testid={`mock-listing-${l.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3, boxShadow: "0 12px 28px rgba(15,42,91,0.15)" }}
              style={{
                background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
                overflow: "hidden", boxShadow: "0 1px 2px rgba(15,42,91,0.04)",
                cursor: "pointer",
              }}
            >
              <div style={{
                height: 96,
                background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
                position: "relative",
              }}>
                <span style={{
                  position: "absolute", top: 8, left: 8, background: "rgba(255,255,255,0.9)",
                  color: C.navy, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                }}>{l.tag}</span>
                <Building2 size={44} style={{ position: "absolute", right: 10, bottom: 10, color: "rgba(255,255,255,0.55)" }}/>
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{l.price}</div>
                <div style={{ fontSize: 12, color: "#4B5563", marginTop: 2 }}>{l.addr} · {committed !== "Kitsilano" ? committed : l.city}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6, display: "flex", gap: 8 }}>
                  <span>{l.beds}bd</span><span>·</span><span>{l.baths}ba</span><span>·</span><span>{l.sqft} sqft</span><span>·</span><span>{l.dom}d</span>
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>
        {usingLive
          ? <>Live CREA DDF® · <Link to={`/listings?city=${encodeURIComponent(committed)}`} style={{ color: C.blue, fontWeight: 600 }}>See all {liveCount ?? liveListings.length} {committed} matches →</Link></>
          : <>No live matches for <strong>{committed}</strong>. <Link to={`/listings?q=${encodeURIComponent(committed)}`} style={{ color: C.blue, fontWeight: 600 }}>Try /listings with full BC MLS® coverage →</Link></>
        }
      </div>
    </div>
  );
};
