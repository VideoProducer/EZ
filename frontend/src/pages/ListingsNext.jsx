import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Heart, MapPin, BedDouble, Bath, Ruler, X, Map as MapIcon, List as ListIcon, Loader2, Bell, Square } from "lucide-react";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextFooter } from "../components/homenext/HomeNextExtras";
import { isFarmArea } from "../lib/serviceArea";

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
  const [sp] = useSearchParams();

  const [facets, setFacets] = useState({ cities: [], property_types: [], regions: [] });
  const [q, setQ] = useState(() => sp.get("q") || "");
  const [city, setCity] = useState(() => sp.get("city") || "");
  const [ptype, setPtype] = useState(() => sp.get("property_type") || "");
  const [beds, setBeds] = useState(() => sp.get("beds_min") || "");
  const [baths, setBaths] = useState(() => sp.get("baths_min") || "");
  const [pmin, setPmin] = useState(() => sp.get("price_min") || "");
  const [pmax, setPmax] = useState(() => sp.get("price_max") || "");
  const [sort, setSort] = useState(() => sp.get("sort") || "newest");
  const regionGroup = sp.get("region_group") || "";
  const regionChip = sp.get("region_chip") || "";

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
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [saveCasl, setSaveCasl] = useState(false);
  const [savePipa, setSavePipa] = useState(false);
  const [saveFreq, setSaveFreq] = useState("sunday_night");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const [drawBbox, setDrawBbox] = useState(null);

  useEffect(() => {
    fetch(`${API}/listings/meta/facets`).then(r => r.json()).then(setFacets).catch(() => {});
  }, []);

  const buildParams = useCallback((off) => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (city) p.set("city", city);
    if (regionGroup) p.set("region_group", regionGroup);
    if (regionChip) p.set("region_chip", regionChip);
    if (ptype) p.set("property_type", ptype);
    if (beds) p.set("beds_min", beds);
    if (baths) p.set("baths_min", baths);
    if (pmin) p.set("price_min", pmin);
    if (pmax) p.set("price_max", pmax);
    p.set("sort", sort);
    p.set("limit", String(PAGE));
    p.set("offset", String(off));
    return p.toString();
  }, [q, city, regionGroup, regionChip, ptype, beds, baths, pmin, pmax, sort]);

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
  const hasFilters = q || city || ptype || beds || baths || pmin || pmax || drawBbox;

  const inBbox = (l) => !drawBbox || (typeof l.lat === "number" && typeof l.lon === "number" && l.lat >= drawBbox.south && l.lat <= drawBbox.north && l.lon >= drawBbox.west && l.lon <= drawBbox.east);
  const visibleItems = drawBbox ? items.filter(inBbox) : items;

  // Out-of-area detection for the no-results referral CTA. Uses the selected
  // city, or the free-text query as a fallback, against Doug's service region.
  const areaTerm = (city || q.trim()).trim();
  const outOfArea = !drawBbox && !!areaTerm && !isFarmArea(areaTerm);
  const [bannerClosed, setBannerClosed] = useState(false);
  useEffect(() => { setBannerClosed(false); }, [areaTerm]);

  const logReferralClick = (source) => {
    if (!areaTerm) return;
    try {
      let sid = localStorage.getItem("ez_session_id");
      if (!sid) { sid = (crypto?.randomUUID?.() || String(Date.now())); localStorage.setItem("ez_session_id", sid); }
      const titleArea = areaTerm.replace(/\b\w/g, (c) => c.toUpperCase());
      fetch(`${API}/analytics/referral-click`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community: titleArea, slug: areaTerm.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""), source, session_id: sid }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* non-fatal */ }
  };

  const closeSave = () => { setSaveOpen(false); setSaveMsg(""); setSaveErr(""); };
  const submitSaveSearch = async () => {
    if (!saveEmail.trim()) { setSaveErr("Please enter your email."); return; }
    if (!saveCasl || !savePipa) { setSaveErr("Please check both consent boxes."); return; }
    setSaveBusy(true); setSaveErr("");
    const filters = {};
    if (city) filters.city = city;
    if (ptype) filters.property_type = ptype;
    if (beds) filters.beds_min = Number(beds);
    if (baths) filters.baths_min = Number(baths);
    if (pmin) filters.price_min = Number(pmin);
    if (pmax) filters.price_max = Number(pmax);
    if (q.trim()) filters.q = q.trim();
    if (drawBbox) filters.bbox = { north: drawBbox.north, south: drawBbox.south, east: drawBbox.east, west: drawBbox.west };
    const label = [city, ptype, beds && `${beds}+ bd`, baths && `${baths}+ ba`, pmin && `from ${abbr(Number(pmin))}`, pmax && `to ${abbr(Number(pmax))}`, drawBbox && "map area"].filter(Boolean).join(" · ") || "All BC residential listings";
    try {
      const res = await fetch(`${API}/saved-searches`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: saveEmail.trim(), filters, label, casl_consent: true, pipa_ack: true, frequency: saveFreq }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong — please try again.");
      setSaveMsg(data.message || "Almost done — check your inbox to confirm your alerts.");
    } catch (e) { setSaveErr(e.message || "Something went wrong."); }
    finally { setSaveBusy(false); }
  };

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
    visibleItems.forEach((l) => {
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
    if (pts.length && !drawBbox) {
      try { map.fitBounds(pts, { padding: [40, 40], maxZoom: 13 }); } catch { /* noop */ }
    }
  }, [items, activeKey, drawBbox]);

  // ── Rectangle "draw area" tool ────────────────────────────────
  const bboxLayer = useRef(null);
  useEffect(() => {
    const map = mapObj.current;
    if (!map || !drawMode) return;
    map.dragging.disable();
    map.getContainer().style.cursor = "crosshair";
    let startPt = null, rect = null;
    const onDown = (e) => { startPt = e.latlng; if (rect) { map.removeLayer(rect); } rect = L.rectangle([startPt, startPt], { color: C.navy, weight: 2, fillOpacity: 0.08 }).addTo(map); };
    const onMove = (e) => { if (startPt && rect) rect.setBounds(L.latLngBounds(startPt, e.latlng)); };
    const onUp = (e) => {
      if (!startPt) return;
      const b = L.latLngBounds(startPt, e.latlng);
      if (rect) { map.removeLayer(rect); rect = null; }
      startPt = null;
      setDrawBbox({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
      setDrawMode(false);
    };
    map.on("mousedown", onDown); map.on("mousemove", onMove); map.on("mouseup", onUp);
    return () => {
      map.off("mousedown", onDown); map.off("mousemove", onMove); map.off("mouseup", onUp);
      if (rect) map.removeLayer(rect);
      map.dragging.enable();
      map.getContainer().style.cursor = "";
    };
  }, [drawMode]);

  // Persisted drawn-area rectangle overlay.
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    if (bboxLayer.current) { map.removeLayer(bboxLayer.current); bboxLayer.current = null; }
    if (drawBbox) {
      bboxLayer.current = L.rectangle([[drawBbox.south, drawBbox.west], [drawBbox.north, drawBbox.east]], { color: C.gold, weight: 2, dashArray: "6 4", fillColor: C.gold, fillOpacity: 0.07 }).addTo(map);
      try { map.fitBounds(bboxLayer.current.getBounds(), { padding: [30, 30], maxZoom: 14 }); } catch { /* noop */ }
    }
  }, [drawBbox]);

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
        <title>Search BC MLS® Real Estate Listings — Homes for Sale in British Columbia | EZtoFind.ca</title>
        <meta name="robots" content="index, follow" />
        <meta name="description" content="Search live BC MLS® real estate listings — homes, condos and acreages for sale across British Columbia. A calm, simple way to find your place, powered by the CREA DDF® feed." />
        <link rel="canonical" href="https://eztofind.ca/listings" />
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
              {ptype.includes(",") && <option value={ptype}>{ptype.split(",").map((s) => s.trim()).join(" & ")}</option>}
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

      {/* Slim out-of-area referral strip — shown when an out-of-area search DOES
          return listings (Kelowna / Victoria etc.), catching searchers the
          no-results card can't. Dismissible; resets when the area changes. */}
      {outOfArea && !loading && visibleItems.length > 0 && !bannerClosed && (
        <div data-testid="ln-ooa-banner" style={{ maxWidth: 1360, margin: "0 auto", padding: "12px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "linear-gradient(135deg, rgba(15,42,91,0.05), rgba(184,134,11,0.08))", border: "1px solid #E6D9A8", borderRadius: 14, padding: "12px 16px" }}>
            <MapPin size={18} color={C.gold} style={{ flexShrink: 0 }} />
            <span style={{ flex: "1 1 280px", minWidth: 0, fontSize: 13.5, color: C.ink, lineHeight: 1.45 }}>
              Looking in <strong style={{ color: C.navy }}>{areaTerm}</strong> — outside Doug's region? He can connect you with a vetted local REALTOR®, <strong>at no cost to you</strong>.
            </span>
            <Link
              to={`/referral-request?city=${encodeURIComponent(areaTerm)}`}
              data-testid="ln-ooa-banner-cta"
              onClick={() => logReferralClick("listings-banner")}
              style={{ background: C.navy, color: "#fff", textDecoration: "none", borderRadius: 999, padding: "9px 18px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}
            >
              Get a referral →
            </Link>
            <button onClick={() => setBannerClosed(true)} data-testid="ln-ooa-banner-close" aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      {/* Result count + draw / mobile toggle */}
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "16px 20px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span data-testid="ln-count" style={{ color: C.muted, fontSize: 14 }}>
          {loading ? "Searching…" : drawBbox ? `${visibleItems.length.toLocaleString()} ${visibleItems.length === 1 ? "home" : "homes"} in your drawn area` : `${total.toLocaleString()} ${total === 1 ? "home" : "homes"} in British Columbia`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            data-testid="ln-draw-toggle"
            onClick={() => { if (drawBbox) { setDrawBbox(null); setDrawMode(false); } else { setDrawMode((m) => !m); setMobileMap(true); } }}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: drawBbox || drawMode ? C.navy : "#fff", color: drawBbox || drawMode ? "#fff" : C.navy, border: `1px solid ${C.navy}`, borderRadius: 999, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {drawBbox ? <><X size={15} /> Clear area</> : <><Square size={15} /> <span className="ln-save-label">{drawMode ? "Drag a box on the map…" : "Draw area"}</span></>}
          </button>
          <button
            data-testid="ln-save-search"
            onClick={() => { setSaveOpen(true); setSaveMsg(""); setSaveErr(""); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.goldBg, color: C.navy, border: "1px solid #E6D9A8", borderRadius: 999, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            <Bell size={15} /> <span className="ln-save-label">Save this search & get alerts</span>
          </button>
          <button
            data-testid="ln-mobile-toggle"
            onClick={() => setMobileMap((v) => !v)}
            className="ln-mobile-only"
            style={{ display: "none", alignItems: "center", gap: 6, background: C.navy, color: "#fff", border: "none", borderRadius: 999, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {mobileMap ? <><ListIcon size={15} /> List</> : <><MapIcon size={15} /> Map</>}
          </button>
        </div>
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
          ) : visibleItems.length === 0 ? (
            outOfArea ? (
              <div style={{ textAlign: "center", padding: "48px 24px", maxWidth: 560, margin: "0 auto" }} data-testid="ln-empty-referral">
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.goldBg, display: "grid", placeItems: "center", margin: "0 auto 16px" }}><MapPin size={26} color={C.gold} /></div>
                <p style={{ fontSize: 20, color: C.navy, fontWeight: 700, margin: "0 0 8px" }}>Searching outside Doug's home turf?</p>
                <p style={{ color: C.muted, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 20px" }}>
                  <strong style={{ color: C.ink }}>{areaTerm}</strong> is outside Doug's Greater Vancouver, Fraser Valley &amp; Sea-to-Sky service area — but he can connect you with a vetted local REALTOR® through his BC referral network, <strong style={{ color: C.ink }}>at no cost to you</strong>.
                </p>
                <Link
                  to={`/referral-request?city=${encodeURIComponent(areaTerm)}`}
                  data-testid="ln-empty-referral-cta"
                  onClick={() => logReferralClick("listings-empty")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.navy, color: "#fff", textDecoration: "none", borderRadius: 999, padding: "13px 26px", fontSize: 15, fontWeight: 700 }}
                >
                  Get matched with a local REALTOR® →
                </Link>
                <p style={{ color: C.muted, fontSize: 12.5, marginTop: 14 }}>Prefer to keep browsing? Clear the area filter to see all BC listings.</p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "70px 0", color: C.muted }} data-testid="ln-empty">
                <p style={{ fontSize: 18, color: C.navy, fontWeight: 600 }}>No homes match your search.</p>
                <p>{drawBbox ? "No listings fall inside your drawn area — try a bigger box or clear it." : "Try widening the price range or clearing a filter."}</p>
              </div>
            )
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
                {visibleItems.map((l) => {
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

      {saveOpen && (
        <div data-testid="ln-save-modal" onClick={closeSave} style={{ position: "fixed", inset: 0, background: "rgba(15,42,91,0.45)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 1000, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: 20, padding: "28px 26px", boxShadow: "0 30px 80px rgba(0,0,0,0.3)", fontFamily: "-apple-system, sans-serif", position: "relative" }}>
            <button onClick={closeSave} data-testid="ln-save-close" aria-label="Close" style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={20} /></button>
            {saveMsg ? (
              <div data-testid="ln-save-success" style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: C.goldBg, display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Bell size={24} color={C.gold} /></div>
                <h3 style={{ color: C.navy, fontSize: 20, margin: "0 0 8px" }}>Check your inbox</h3>
                <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{saveMsg}</p>
                <button onClick={closeSave} style={{ marginTop: 20, background: C.navy, color: "#fff", border: "none", borderRadius: 999, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <>
                <p style={{ textTransform: "uppercase", letterSpacing: "0.16em", fontSize: 11, fontWeight: 700, color: C.blue, margin: "0 0 6px" }}>New-match alerts</p>
                <h3 style={{ color: C.navy, fontSize: 22, margin: "0 0 6px", fontFamily: "'Playfair Display', serif" }}>Save this search</h3>
                <p style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.55, margin: "0 0 18px" }}>We'll email you a <strong>weekly Sunday-evening brief</strong> with new BC MLS® listings that match {drawBbox ? "your drawn map area" : "your filters"}, plus any price drops. Confirm once by email — unsubscribe anytime.</p>
                <input data-testid="ln-save-email" type="email" value={saveEmail} onChange={(e) => setSaveEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", padding: "13px 16px", fontSize: 15, border: `1px solid ${C.line}`, borderRadius: 12, outline: "none", color: C.navy, fontFamily: "inherit", boxSizing: "border-box" }} />
                <div data-testid="ln-save-freqnote" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 12px", background: C.goldBg, border: "1px solid #E6D9A8", borderRadius: 10, fontSize: 12.5, color: C.navy, fontWeight: 600 }}>
                  <Bell size={15} color={C.gold} /> Weekly brief — sent every Sunday evening
                </div>
                <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: C.ink, margin: "14px 0 0", lineHeight: 1.5, cursor: "pointer" }}>
                  <input data-testid="ln-save-casl" type="checkbox" checked={saveCasl} onChange={(e) => setSaveCasl(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>I agree to receive listing-alert emails from EZtoFind.ca (Doug LeMaire, REALTOR®). I can withdraw consent anytime. <span style={{ color: C.muted }}>(CASL)</span></span>
                </label>
                <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: C.ink, margin: "10px 0 0", lineHeight: 1.5, cursor: "pointer" }}>
                  <input data-testid="ln-save-pipa" type="checkbox" checked={savePipa} onChange={(e) => setSavePipa(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>I acknowledge my email is used only to send these alerts, per the <Link to="/privacy" target="_blank" style={{ color: C.blue }}>Privacy Policy (PIPA)</Link>.</span>
                </label>
                {saveErr && <p data-testid="ln-save-error" style={{ color: "#DC2626", fontSize: 13, margin: "10px 0 0" }}>{saveErr}</p>}
                <button data-testid="ln-save-submit" onClick={submitSaveSearch} disabled={saveBusy} style={{ width: "100%", marginTop: 16, background: C.navy, color: "#fff", border: "none", borderRadius: 999, padding: "13px", fontSize: 15, fontWeight: 700, cursor: saveBusy ? "default" : "pointer", opacity: saveBusy ? 0.7 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {saveBusy ? <><Loader2 size={16} className="ln-spin" /> Saving…</> : "Save search & notify me"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
          .ln-save-label { display: none; }
        }
      `}</style>
    </div>
  );
}
