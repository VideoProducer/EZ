import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Heart, MapPin, BedDouble, Bath, Ruler, X, Map as MapIcon, List as ListIcon, Loader2 } from "lucide-react";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextFooter } from "../components/homenext/HomeNextExtras";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PAGE = 24;

const C = {
  navy: "#0F2A5B", ink: "#1d1d1f", muted: "#6e6e73", line: "rgba(0,0,0,0.09)",
  blue: "#2563EB", softBlue: "#EAF1FF", gold: "#B8860B", goldBg: "#FBF3DF",
  bg: "#FFFFFF", alt: "#F5F7FA",
};

const PRICE_MIN = [0, 300000, 500000, 700000, 900000, 1200000, 1500000, 2000000, 3000000];
const PRICE_MAX = [0, 500000, 700000, 900000, 1200000, 1500000, 2000000, 3000000, 5000000];

const abbr = (n) => {
  if (!n) return "";
  if (n >= 1000000) return `$${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`;
  return `$${Math.round(n / 1000)}K`;
};
const full = (n) => (n ? `$${Number(n).toLocaleString()}` : "Price on request");
const SAVED_KEY = "ez_next_saved";

export default function ListingsNext() {
  useEffect(() => {
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "noindex, nofollow");
    return () => el.setAttribute("content", prev);
  }, []);

  const [facets, setFacets] = useState({ cities: [], property_types: [], regions: [] });
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [ptype, setPtype] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [pmin, setPmin] = useState("");
  const [pmax, setPmax] = useState("");
  const [sort, setSort] = useState("newest");

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileMap, setMobileMap] = useState(false);
  const [saved, setSaved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")); } catch { return new Set(); }
  });
  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    fetch(`${API}/listings/meta/facets`).then(r => r.json()).then(setFacets).catch(() => {});
  }, []);

  const buildParams = useCallback((off) => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (city) p.set("city", city);
    if (ptype) p.set("property_type", ptype);
    if (beds) p.set("beds_min", beds);
    if (baths) p.set("baths_min", baths);
    if (pmin) p.set("price_min", pmin);
    if (pmax) p.set("price_max", pmax);
    p.set("sort", sort);
    p.set("limit", String(PAGE));
    p.set("offset", String(off));
    return p.toString();
  }, [q, city, ptype, beds, baths, pmin, pmax, sort]);

  // Fetch (reset) whenever filters change — debounced for the text query.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`${API}/listings?${buildParams(0)}`)
        .then(r => r.json())
        .then(d => { setItems(d.listings || []); setTotal(d.total || 0); setOffset(0); })
        .catch(() => { setItems([]); setTotal(0); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [buildParams]);

  const loadMore = () => {
    const next = offset + PAGE;
    setLoadingMore(true);
    fetch(`${API}/listings?${buildParams(next)}`)
      .then(r => r.json())
      .then(d => { setItems(prev => [...prev, ...(d.listings || [])]); setOffset(next); })
      .finally(() => setLoadingMore(false));
  };

  const toggleSave = (key, e) => {
    e.preventDefault(); e.stopPropagation();
    setSaved(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      localStorage.setItem(SAVED_KEY, JSON.stringify([...n]));
      return n;
    });
  };

  const reset = () => { setQ(""); setCity(""); setPtype(""); setBeds(""); setBaths(""); setPmin(""); setPmax(""); setSort("newest"); };
  const hasFilters = q || city || ptype || beds || baths || pmin || pmax;

  // ── Leaflet map ───────────────────────────────────────────────
  const mapEl = useRef(null);
  const mapObj = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    if (mapObj.current || !mapEl.current) return;
    const map = L.map(mapEl.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true })
      .setView([49.25, -123.0], 10);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri', maxZoom: 16,
    }).addTo(map);
    layer.current = L.layerGroup().addTo(map);
    mapObj.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  useEffect(() => {
    const map = mapObj.current, lg = layer.current;
    if (!map || !lg) return;
    lg.clearLayers();
    const pts = [];
    items.forEach((l) => {
      if (typeof l.lat !== "number" || typeof l.lon !== "number") return;
      const isActive = l.listing_key === activeKey;
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${isActive ? C.gold : C.navy};color:#fff;font:600 12px/1 -apple-system,sans-serif;padding:6px 10px;border-radius:999px;box-shadow:0 3px 10px rgba(0,0,0,0.25);white-space:nowrap;border:2px solid #fff;">${abbr(l.list_price)}</div>`,
        iconSize: [0, 0], iconAnchor: [0, 0],
      });
      const m = L.marker([l.lat, l.lon], { icon }).addTo(lg);
      const addr = l.unparsed_address || l.street_address || l.city || "";
      const photo = (l.photos && l.photos[0]) || "";
      m.bindPopup(
        `<div style="width:180px;font-family:-apple-system,sans-serif">
          ${photo ? `<img src="${photo}" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:6px"/>` : ""}
          <div style="font-weight:700;color:${C.navy};font-size:15px">${full(l.list_price)}</div>
          <div style="color:#6e6e73;font-size:12px;margin:2px 0 6px">${addr}</div>
          <a href="/listing/${l.listing_key}" style="color:${C.blue};font-size:12px;font-weight:600;text-decoration:none">View details →</a>
        </div>`
      );
      m.on("mouseover", () => setActiveKey(l.listing_key));
      pts.push([l.lat, l.lon]);
    });
    if (pts.length) {
      try { map.fitBounds(pts, { padding: [40, 40], maxZoom: 13 }); } catch { /* noop */ }
    }
  }, [items, activeKey]);

  useEffect(() => {
    if (mapObj.current) setTimeout(() => mapObj.current.invalidateSize(), 250);
  }, [mobileMap]);

  const pill = {
    appearance: "none", font: "inherit", fontSize: 13, fontWeight: 600, color: C.ink,
    background: "#fff", border: `1px solid ${C.line}`, borderRadius: 999,
    padding: "9px 32px 9px 14px", cursor: "pointer", outline: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }} data-testid="listings-next">
      <Helmet>
        <title>BC Real Estate Search — EZtoFind.ca</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Search live BC MLS® listings — a calm, simple way to find your place in British Columbia." />
      </Helmet>
      <HomeNextNav />

      {/* Hero + search */}
      <section style={{ padding: "56px 20px 24px", textAlign: "center", borderBottom: `1px solid ${C.line}` }} data-testid="ln-hero">
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 12, fontWeight: 700, color: C.blue, margin: "0 0 12px" }}>
            Live MLS® Listings
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: C.navy, fontWeight: 700, lineHeight: 1.08, fontSize: "clamp(30px, 4.6vw, 50px)", margin: 0 }}>
            Find your place in British Columbia.
          </h1>

          <div style={{ marginTop: 26, position: "relative", maxWidth: 600, margin: "26px auto 0" }}>
            <Search size={20} style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
            <input
              data-testid="ln-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by city, neighbourhood, address or MLS®…"
              aria-label="Search listings"
              style={{
                width: "100%", padding: "17px 52px", fontSize: 16, border: `1px solid ${C.line}`,
                borderRadius: 999, outline: "none", color: C.navy, background: "#fff",
                boxShadow: "0 10px 34px rgba(15,42,91,0.08)", fontFamily: "inherit",
              }}
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear" data-testid="ln-clear"
                style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex" }}>
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }} data-testid="ln-filters">
            <select data-testid="ln-city" value={city} onChange={(e) => setCity(e.target.value)} style={pill} aria-label="Area">
              <option value="">Any area</option>
              {facets.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select data-testid="ln-type" value={ptype} onChange={(e) => setPtype(e.target.value)} style={pill} aria-label="Home type">
              <option value="">Any type</option>
              {facets.property_types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select data-testid="ln-beds" value={beds} onChange={(e) => setBeds(e.target.value)} style={pill} aria-label="Beds">
              <option value="">Beds</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+ beds</option>)}
            </select>
            <select data-testid="ln-baths" value={baths} onChange={(e) => setBaths(e.target.value)} style={pill} aria-label="Baths">
              <option value="">Baths</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ baths</option>)}
            </select>
            <select data-testid="ln-pmin" value={pmin} onChange={(e) => setPmin(e.target.value)} style={pill} aria-label="Min price">
              <option value="">Min price</option>
              {PRICE_MIN.filter(Boolean).map((n) => <option key={n} value={n}>{abbr(n)}</option>)}
            </select>
            <select data-testid="ln-pmax" value={pmax} onChange={(e) => setPmax(e.target.value)} style={pill} aria-label="Max price">
              <option value="">Max price</option>
              {PRICE_MAX.filter(Boolean).map((n) => <option key={n} value={n}>{abbr(n)}</option>)}
            </select>
            <select data-testid="ln-sort" value={sort} onChange={(e) => setSort(e.target.value)} style={pill} aria-label="Sort">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
            </select>
            {hasFilters && (
              <button data-testid="ln-reset" onClick={reset} style={{ ...pill, backgroundImage: "none", padding: "9px 14px", color: C.blue, cursor: "pointer" }}>
                Clear all
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Result count + mobile toggle */}
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "16px 20px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span data-testid="ln-count" style={{ color: C.muted, fontSize: 14 }}>
          {loading ? "Searching…" : `${total.toLocaleString()} ${total === 1 ? "home" : "homes"} in British Columbia`}
        </span>
        <button
          data-testid="ln-mobile-toggle"
          onClick={() => setMobileMap((v) => !v)}
          className="ln-mobile-only"
          style={{ display: "none", alignItems: "center", gap: 6, background: C.navy, color: "#fff", border: "none", borderRadius: 999, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {mobileMap ? <><ListIcon size={15} /> List</> : <><MapIcon size={15} /> Map</>}
        </button>
      </div>

      {/* Split view */}
      <div className="ln-split" data-view={mobileMap ? "map" : "list"} style={{ maxWidth: 1360, margin: "0 auto", padding: "8px 20px 60px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Cards */}
        <div className="ln-cards">
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 18, border: `1px solid ${C.line}`, overflow: "hidden" }}>
                  <div style={{ height: 180, background: C.alt }} />
                  <div style={{ padding: 16 }}><div style={{ height: 18, width: "50%", background: C.alt, borderRadius: 6 }} /><div style={{ height: 12, width: "80%", background: C.alt, borderRadius: 6, marginTop: 10 }} /></div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 0", color: C.muted }} data-testid="ln-empty">
              <p style={{ fontSize: 18, color: C.navy, fontWeight: 600 }}>No homes match your search.</p>
              <p>Try widening the price range or clearing a filter.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
                {items.map((l) => {
                  const photo = (l.photos && l.photos[0]) || "";
                  const addr = l.unparsed_address || l.street_address || [l.city, l.region].filter(Boolean).join(", ");
                  const isSaved = saved.has(l.listing_key);
                  return (
                    <Link
                      key={l.listing_key}
                      to={`/listing/${l.listing_key}`}
                      data-testid={`ln-card-${l.listing_key}`}
                      onMouseEnter={() => setActiveKey(l.listing_key)}
                      onMouseLeave={() => setActiveKey(null)}
                      style={{ display: "block", textDecoration: "none", background: "#fff", border: `1px solid ${activeKey === l.listing_key ? "#C9A44A" : C.line}`, borderRadius: 18, overflow: "hidden", transition: "box-shadow .18s ease, transform .18s ease, border-color .18s ease" }}
                      onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 16px 36px rgba(15,42,91,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <div style={{ position: "relative", height: 184, background: `linear-gradient(135deg, ${C.softBlue}, ${C.alt})` }}>
                        {photo && <img src={photo} alt={addr} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                        <button
                          data-testid={`ln-save-${l.listing_key}`}
                          onClick={(e) => toggleSave(l.listing_key, e)}
                          aria-label={isSaved ? "Remove from saved" : "Save"}
                          style={{ position: "absolute", top: 10, right: 10, width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,255,255,0.92)", display: "grid", placeItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                        >
                          <Heart size={17} color={isSaved ? "#E0245E" : "#6e6e73"} fill={isSaved ? "#E0245E" : "none"} />
                        </button>
                        {l.photo_count > 1 && (
                          <span style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999 }}>{l.photo_count} photos</span>
                        )}
                      </div>
                      <div style={{ padding: "14px 16px 16px" }}>
                        <div style={{ color: C.navy, fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em" }}>{full(l.list_price)}</div>
                        <div style={{ color: C.ink, fontSize: 13.5, margin: "5px 0 2px", display: "flex", alignItems: "center", gap: 5 }}>
                          <MapPin size={13} color={C.muted} style={{ flexShrink: 0 }} />
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{addr || "British Columbia"}</span>
                        </div>
                        <div style={{ color: C.muted, fontSize: 13, display: "flex", gap: 14, margin: "8px 0 12px" }}>
                          {l.beds != null && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><BedDouble size={14} /> {l.beds} bd</span>}
                          {l.baths != null && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Bath size={14} /> {l.baths} ba</span>}
                          {l.living_area ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Ruler size={14} /> {Number(l.living_area).toLocaleString()} sqft</span> : null}
                        </div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.gold, background: C.goldBg, border: "1px solid #E6D9A8", padding: "4px 10px", borderRadius: 999 }}>
                          Source: CREA DDF®
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {items.length < total && (
                <div style={{ textAlign: "center", marginTop: 28 }}>
                  <button
                    data-testid="ln-load-more"
                    onClick={loadMore}
                    disabled={loadingMore}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: C.navy, border: `1px solid ${C.navy}`, borderRadius: 999, padding: "12px 26px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                  >
                    {loadingMore ? <><Loader2 size={16} className="ln-spin" /> Loading…</> : `Show more (${(total - items.length).toLocaleString()} more)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Map */}
        <div className="ln-mapwrap" style={{ position: "sticky", top: 80 }}>
          <div
            ref={mapEl}
            data-testid="ln-map"
            style={{ height: "calc(100vh - 120px)", minHeight: 440, borderRadius: 18, overflow: "hidden", border: `1px solid ${C.line}`, background: C.alt }}
          />
        </div>
      </div>

      <HomeNextFooter />

      <style>{`
        .ln-spin { animation: ln-spin 0.9s linear infinite; }
        @keyframes ln-spin { to { transform: rotate(360deg); } }
        .leaflet-container { font-family: -apple-system, sans-serif; }
        @media (max-width: 900px) {
          .ln-split { grid-template-columns: 1fr !important; }
          .ln-mapwrap { position: static !important; }
          .ln-split[data-view="map"] .ln-cards { display: none; }
          .ln-split[data-view="list"] .ln-mapwrap { display: none; }
          .ln-mobile-only { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
}
