import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = process.env.REACT_APP_BACKEND_URL;
const FALLBACK = "/images/home-next-hero.jpg";
const EXCL_TYPES = "Vacant Land,Lot,Land,Agriculture,Farm,Residential Commercial Mix,Mixed Use";
const EXCL_KW = "land\\s+assembl|development\\s+potential|development\\s+opportunity|development\\s+site|developer'?s?\\s+alert|developer'?s?\\s+dream|future\\s+development|holding\\s+propert|rezoning\\s+potential|subdivid|densification|OCP\\s+designat|investment\\s+land|investment\\s+holding|land\\s+banking|revenue\\s+propert";

const fmtPrice = (n) => `$${Number(n || 0).toLocaleString("en-CA")}`;

// Rotating hero — live CREA DDF® detached homes, $3M+, Greater Vancouver + Fraser Valley + Sea-to-Sky.
export const HomeNextListingHero = () => {
  const [pool, setPool] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let stop = false;
    const params = new URLSearchParams({
      price_min: "2000000", property_type: "Detached", sort: "newest", limit: "24",
      region_chip: "Doug's Territory",
      exclude_property_type: EXCL_TYPES, exclude_description_keywords: EXCL_KW,
    });
    fetch(`${API}/api/listings?${params}`).then(r => r.ok ? r.json() : null).then(d => {
      if (stop || !d) return;
      const items = (d.listings || [])
        .filter(l => Array.isArray(l.photos) && l.photos.length > 0)
        .slice(0, 12);
      items.forEach(l => { const im = new Image(); im.src = l.photos[0]; });
      setPool(items);
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
      <div className="hn-lhero" style={{ backgroundImage: `url('${FALLBACK}')` }}>
        {pool.map((l, i) => (
          <div key={l.listing_key} className="hn-lhero__slide" aria-hidden={i !== idx}
            style={{ backgroundImage: `url('${l.photos[0]}')`, opacity: i === idx ? 1 : 0 }}/>
        ))}
        <div className="hn-lhero__shade" aria-hidden="true"/>
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
