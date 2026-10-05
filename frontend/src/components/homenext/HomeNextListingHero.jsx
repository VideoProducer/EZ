import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSignatureMlsNumbers, SIGNATURE_PIN_LIMIT } from "../../config/flagshipListing";

const API = process.env.REACT_APP_BACKEND_URL;
const EXCL_TYPES = "Vacant Land,Lot,Land,Agriculture,Farm,Residential Commercial Mix,Mixed Use";
const EXCL_KW = "land\\s+assembl|development\\s+potential|development\\s+opportunity|development\\s+site|developer'?s?\\s+alert|developer'?s?\\s+dream|future\\s+development|holding\\s+propert|rezoning\\s+potential|subdivid|densification|OCP\\s+designat|investment\\s+land|investment\\s+holding|land\\s+banking|revenue\\s+propert";

const fmtPrice = (n) => `$${Number(n || 0).toLocaleString("en-CA")}`;

// Rotating hero — live CREA DDF® detached homes, $3M+, Greater Vancouver + Fraser Valley + Sea-to-Sky.
// Hand-picked "signature" listings (flagshipListing.js) are pinned to the front and tagged "Featured".
export const HomeNextListingHero = () => {
  const [pool, setPool] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let stop = false;
    const params = new URLSearchParams({
      price_min: "2000000", property_type: "Detached", sort: "newest", limit: "60",
      region_chip: "Doug's Territory",
      exclude_property_type: EXCL_TYPES, exclude_description_keywords: EXCL_KW,
    });
    const sigNumbers = getSignatureMlsNumbers();
    const poolP = fetch(`${API}/api/listings?${params}`).then(r => r.ok ? r.json() : null).catch(() => null);
    const sigP = Promise.all(sigNumbers.map(mls =>
      fetch(`${API}/api/listings?q=${encodeURIComponent(mls)}&limit=5`)
        .then(r => r.ok ? r.json() : null).catch(() => null)
        .then(d => ((d && d.listings) || []).find(l => l.mls_number === mls || l.listing_key === mls) || null)
    ));
    Promise.all([poolP, sigP]).then(([d, sigs]) => {
      if (stop) return;
      const all = ((d && d.listings) || []).filter(l => Array.isArray(l.photos) && l.photos.length > 0);
      // Rotate the shown dozen once per day so the hero surfaces fresh live
      // listings daily, cycling through the full newest pool over time.
      let items = all;
      const n = all.length;
      if (n > 12) {
        const dayOffset = Math.floor(Date.now() / 86400000) % n;
        items = all.slice(dayOffset).concat(all.slice(0, dayOffset)).slice(0, 12);
      } else {
        items = all.slice(0, 12);
      }
      // Pin hand-picked signature listings (active + has photos) to the front.
      const pinned = (sigs || [])
        .filter(l => l && Array.isArray(l.photos) && l.photos.length > 0)
        .slice(0, SIGNATURE_PIN_LIMIT)
        .map(l => ({ ...l, _featured: true }));
      const pinnedKeys = new Set(pinned.map(l => l.listing_key));
      const merged = [...pinned, ...items.filter(l => !pinnedKeys.has(l.listing_key))].slice(0, 12);
      merged.forEach(l => { const im = new Image(); im.src = l.photos[0]; });
      setPool(merged);
    }).catch(() => {});
    return () => { stop = true; };
  }, []);

  useEffect(() => {
    if (pool.length < 2) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setIdx(i => (i + 1) % pool.length);
    }, 6000);
    return () => clearInterval(t);
  }, [pool.length]);

  const cur = pool[idx];
  return (
    <div className="hn-hero__media hn-rise hn-rise-4" data-testid="hn-listing-hero">
      <div className="hn-lhero" style={{ backgroundColor: "#141a24", backgroundImage: cur ? `url('${cur.photos[0]}')` : "none" }}>
        {pool.map((l, i) => (
          <div key={l.listing_key} className="hn-lhero__slide" aria-hidden={i !== idx}
            style={{ backgroundImage: `url('${l.photos[0]}')`, opacity: i === idx ? 1 : 0 }}/>
        ))}
        <div className="hn-lhero__shade" aria-hidden="true"/>
        {cur && cur._featured && (
          <span data-testid="hn-listing-hero-featured" style={{position:"absolute",top:16,left:16,zIndex:3,background:"rgba(15,42,91,0.92)",color:"#fff",fontFamily:"Inter,sans-serif",fontSize:"0.64rem",fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",padding:"5px 11px",borderRadius:999,backdropFilter:"blur(6px)"}}>Featured</span>
        )}
        {cur && (
          <Link to={`/listings/${encodeURIComponent(cur.listing_key)}`} className="hn-lhero__chip" data-testid="hn-listing-hero-chip">
            <strong>{fmtPrice(cur.list_price)}</strong>
            <span>{cur.internet_display_addr !== false && cur.street_address ? `${cur.street_address}, ` : ""}{cur.city}</span>
          </Link>
        )}
        {pool.length > 1 && (
          <div className="hn-lhero__dots" aria-hidden="true">
            {pool.map((l, i) => <span key={l.listing_key} className={i === idx ? "on" : ""}/>)}
          </div>
        )}
      </div>
    </div>
  );
};
