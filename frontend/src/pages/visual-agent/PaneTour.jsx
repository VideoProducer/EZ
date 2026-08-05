// EZtoFind.ca — Visual Agent · Virtual Tour pane
// Live CREA DDF® Matterport / YouTube / Vimeo tours, scoped to the searched
// city when one is committed. Falls back to BC-wide when nothing matches
// the current city.

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Radio } from "lucide-react";
import { C, API } from "./constants";
import { Pill } from "./atoms";

export const PaneTour = ({ focusCity }) => {
  // Live BC MLS® video tours from CREA DDF®. Backend restricts to Matterport,
  // YouTube and Vimeo only (per Doug's ask — those three embed cleanly and
  // auto-play). If a search is active, we scope tours to the searched city;
  // otherwise we show freshest-across-BC. Autoplay = first tour renders
  // instantly, no click required.
  const [tours, setTours] = useState(null);   // null=loading, []=none, [...]=have
  const [pick, setPick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setTours(null); setPick(0);
    (async () => {
      try {
        const cityParam = focusCity ? `&city=${encodeURIComponent(focusCity)}` : "";
        const res = await fetch(`${API}/tours/library?limit=12${cityParam}`);
        const data = await res.json();
        let rows = Array.isArray(data.listings) ? data.listings : [];
        // If a city was scoped but empty, quietly fall back to BC-wide
        if (rows.length === 0 && focusCity) {
          const res2 = await fetch(`${API}/tours/library?limit=12`);
          const data2 = await res2.json();
          rows = Array.isArray(data2.listings) ? data2.listings : [];
        }
        if (!cancelled) setTours(rows);
      } catch {
        if (!cancelled) setTours([]);
      }
    })();
    return () => { cancelled = true; };
  }, [focusCity]);

  const ready = Array.isArray(tours) && tours.length > 0;
  const picked = ready ? tours[Math.min(pick, tours.length - 1)] : null;

  const headerAddr = picked
    ? `${picked.address || picked.mls_number}${picked.city ? " · " + picked.city : ""}`
    : (focusCity ? `Loading ${focusCity} tours…` : "Loading BC MLS® tours…");

  const hostBadge = (h) => {
    if (h === "matterport") return "Matterport";
    if (h === "youtube") return "YouTube";
    if (h === "vimeo") return "Vimeo";
    return "Live";
  };

  return (
    <div data-testid="pane-tour" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>360° / Video Tour · {headerAddr}</strong>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Pill tone="green">
            <Radio size={12}/> Live · BC MLS® Tours{focusCity ? ` · ${focusCity}` : ""}
          </Pill>
        </div>
      </div>

      {tours !== null && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 11, color: "#6B7280" }}>
          <span style={{ fontWeight: 600, color: C.navy }}>Source:</span>
          <span style={{
            border: "1px solid #22C55E", background: "rgba(34,197,94,0.10)",
            color: "#15803D", fontWeight: 700, padding: "3px 10px",
            borderRadius: 99, fontSize: 11, display: "inline-flex",
            alignItems: "center", gap: 5,
          }}>
            <Building2 size={11}/> CREA DDF® {focusCity ? `· ${focusCity}` : ""}
            {ready ? ` · ${tours.length} tours` : " · loading…"}
          </span>
          {ready && (
            <select
              data-testid="tour-doug-listing-select"
              value={pick}
              onChange={(e) => setPick(Number(e.target.value))}
              style={{
                marginLeft: "auto", padding: "4px 8px", borderRadius: 8,
                border: "1px solid #DDE6FA", background: "#fff",
                color: C.navy, fontSize: 11, fontWeight: 600,
                maxWidth: 340,
              }}
            >
              {tours.map((l, i) => (
                <option key={l.listing_key} value={i}>
                  {(l.address || l.mls_number)}
                  {l.city ? ` · ${l.city}` : ""}
                  {l.list_price ? ` · $${Number(l.list_price).toLocaleString()}` : ""}
                  {l.tour_host ? ` · ${hostBadge(l.tour_host)}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {tours !== null && tours.length === 0 && (
        <div style={{
          background: "rgba(245,166,35,0.08)", border: "1px dashed rgba(245,166,35,0.5)",
          borderRadius: 10, padding: 12, fontSize: 12, color: "#78350F",
        }}>
          <strong>No Matterport, YouTube or Vimeo tours found{focusCity ? ` in ${focusCity}` : ""} right now.</strong>
          {" "}The CREA DDF® feed refreshes every 4 hours — new tours will appear here automatically.
          {focusCity && " Try searching a nearby BC community for now."}
        </div>
      )}

      <AnimatePresence mode="wait">
        {picked && (
          <motion.div
            key={`tour-${picked.listing_key}-${pick}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-testid="tour-live-embed-wrap"
            style={{
              position: "relative", height: 340, borderRadius: 12, overflow: "hidden",
              border: "1px solid #E5E7EB", background: C.ink,
            }}
          >
            <iframe
              title={`Live tour · ${picked.address || picked.mls_number}`}
              src={picked.tour_url}
              width="100%" height="100%"
              frameBorder="0"
              allow="autoplay; xr-spatial-tracking; gyroscope; accelerometer; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              style={{ border: 0, display: "block" }}
              data-testid="tour-live-iframe"
            />
            <div style={{
              position: "absolute", left: 10, top: 10, background: "rgba(15,42,91,0.85)",
              color: "#fff", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: 6, backdropFilter: "blur(6px)",
            }}>
              <Radio size={12} color={C.green}/>
              {picked.tour_unbranded ? "Unbranded" : "Branded"} · {hostBadge(picked.tour_host)} · {picked.city}
            </div>
            {(picked.tour_url_raw || picked.tour_url) && (
              <a
                href={picked.tour_url_raw || picked.tour_url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="tour-open-newtab"
                style={{
                  position: "absolute", right: 12, top: 12,
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.94)", color: C.navy,
                  padding: "5px 11px", borderRadius: 999,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  fontSize: 11, fontWeight: 700, textDecoration: "none",
                  border: `1px solid ${C.blue}`,
                }}
                title="Open the original tour in a new tab"
              >Open in new tab ↗</a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {picked && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "#4B5563", alignItems: "center" }}>
          <Link
            to={`/listings/${picked.listing_key}`}
            data-testid="tour-view-full-listing"
            style={{
              color: C.blue, fontWeight: 700, textDecoration: "none",
              borderBottom: `1px dotted ${C.blue}`,
            }}
          >View full listing →</Link>
          {picked.beds != null && <><span>·</span><span>{picked.beds} bd</span></>}
          {picked.baths != null && <><span>·</span><span>{picked.baths} ba</span></>}
          {picked.property_type && <><span>·</span><span>{picked.property_type}</span></>}
          {picked.list_price && <><span>·</span><span style={{fontWeight:700,color:C.navy}}>${Number(picked.list_price).toLocaleString()}</span></>}
        </div>
      )}
    </div>
  );
};
