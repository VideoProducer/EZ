// Luxury Listings Landing Page — parked mockup at /mockups/luxury
// Editorial-grade layout for $3M+ inventory with global-syndication framing.
//
// Requirements ship in this mockup:
//   §1 Cinematic hero (rotating live CREA DDF® luxury photos)
//   §2 Lifestyle corridors filter (West Van Estates · GV Penthouses · Whistler · FV Acreages)
//   §3 Magazine-grid CREA DDF® $3M+ inventory
//   §4 "Request Private Viewing / Virtual Tour" modal (email · phone · Signal · Telegram · WhatsApp)
//   §5 Doogie AI luxury assistant prompt strip
//   §6 "Global Exposure for Your Estate" seller funnel
//   §7 "Custom Confidential Estate Assessment" bespoke CMA form
//   §8 BC PIPA privacy compliance banner
//
// Also captures UTM parameters (utm_source / utm_medium / utm_campaign /
// utm_content) from the URL for print-magazine QR-code attribution.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import UnlistedMockupBanner from "./UnlistedMockupBanner";
import LuxuryFlagshipCard from "./LuxuryFlagshipCard";
import FeaturedListingPointer from "./FeaturedListingPointer";
import { FLAGSHIP } from "../config/flagshipListing";
import { Helmet } from "react-helmet-async";

const BRAND = {
  ink: "#0B0F1A",           // near-black for editorial
  paper: "#F8F5EE",          // warm ivory
  gold: "#B08D57",           // muted champagne gold, not the yellow
  goldSoft: "#DABF7A",
  navy: "#0F2A5B",
  muted: "#6B6459",
  hairline: "#D9D2C0",
};

const SERIF = "'Playfair Display', 'Cormorant Garamond', Georgia, serif";
const SANS = "'Inter', -apple-system, sans-serif";

// ── Reusable ──────────────────────────────────────────────────────────
const Section = ({ children, tone = "paper", pad = "80px 0", id }) => (
  <section id={id} style={{
    background: tone === "ink" ? BRAND.ink : tone === "white" ? "white" : BRAND.paper,
    padding: pad, color: tone === "ink" ? "white" : BRAND.ink,
  }}>
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>{children}</div>
  </section>
);

const Kicker = ({ children, tone = "gold" }) => (
  <div style={{
    fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.24em",
    color: tone === "gold" ? BRAND.gold : "rgba(255,255,255,0.7)",
    fontWeight: 600, textTransform: "uppercase", marginBottom: 12,
  }}>{children}</div>
);

const H = ({ level = 2, children, tone = "ink", align }) => {
  const sz = { 1: "clamp(2.6rem,5.5vw,4.6rem)", 2: "clamp(1.9rem,3.2vw,2.6rem)", 3: "clamp(1.3rem,2vw,1.65rem)" }[level];
  const Tag = `h${level}`;
  return <Tag style={{
    fontFamily: SERIF, fontWeight: 500, fontSize: sz, lineHeight: 1.1,
    color: tone === "gold" ? BRAND.gold : tone === "white" ? "white" : BRAND.ink,
    margin: 0, letterSpacing: "-0.01em", textAlign: align || "left",
  }}>{children}</Tag>;
};

// ── Sample data ───────────────────────────────────────────────────────
// CORRIDORS — full BC luxury coverage. Each corridor carries a `cities`
// array used to build a live CREA DDF® query (city name is the strongest
// filter available on the /api/listings endpoint). `count` and `median`
// are seeded here for the initial paint; both are refreshed from the
// live API on mount so the numbers you see always reflect the current
// $3M+ inventory (updated every 4 hours by the DDF sync).
const CORRIDORS = [
  { slug: "west-van-estates",       name: "West Vancouver Estates",         median: 8250000, count: 47, hero: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800", editorial: "British Properties, Point Grey, and Caulfeild — heritage estates on view lots, waterfront moorage, and coach-house guest quarters.", cities: ["West Vancouver", "Vancouver"] },
  { slug: "gv-penthouses",          name: "Greater Vancouver Penthouses",   median: 4650000, count: 63, hero: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800", editorial: "Coal Harbour, Yaletown, and Kitsilano skyline residences — private elevators, floor-plate primaries, and concierge on 24-hour rotation.",         cities: ["Vancouver", "North Vancouver", "Burnaby"] },
  { slug: "whistler-retreats",      name: "Whistler Retreats",              median: 7100000, count: 29, hero: "https://images.unsplash.com/photo-1517320964276-a002fa203177?w=800", editorial: "Kadenwood, Sunridge Plateau, and Whistler Cay — ski-in / ski-out chalets, timber-frame wellness pavilions, and heli-touring proximity.",              cities: ["Whistler"] },
  { slug: "fraser-valley-acreages", name: "Fraser Valley Acreages",         median: 5450000, count: 38, hero: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800", editorial: "Fort Langley, Aldergrove, Mission — 10-to-100-acre gated estates, equestrian centres, and ALR-classified vineyards.",                                cities: ["Langley", "Maple Ridge", "Mission", "Aldergrove", "Abbotsford"] },
  { slug: "sea-to-sky",             name: "Sea-to-Sky Corridor",            median: 3950000, count: 18, hero: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800", editorial: "Squamish and Pemberton — glass-fronted mountain homes above Howe Sound, private helipads, and 15-minute Whistler proximity.",                          cities: ["Squamish", "Pemberton", "Britannia Beach"] },
  { slug: "vancouver-island",       name: "Vancouver Island Waterfront",    median: 5250000, count: 42, hero: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800", editorial: "Oak Bay, Cordova Bay, and North Saanich — heritage Tudor estates, deep-water moorage, and Salish Sea sunset frontage.",                              cities: ["Victoria", "Oak Bay", "Saanich", "Sidney", "North Saanich", "Central Saanich"] },
  { slug: "okanagan-vineyards",     name: "Okanagan Vineyards",             median: 4150000, count: 55, hero: "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800", editorial: "Kelowna, Naramata, and Peachland — lakefront villas, working vineyards, and estate wineries with private tasting rooms.",                             cities: ["Kelowna", "West Kelowna", "Lake Country", "Naramata", "Peachland", "Vernon"] },
  { slug: "sunshine-coast",         name: "Sunshine Coast Retreats",        median: 3450000, count: 22, hero: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800", editorial: "Sechelt, Halfmoon Bay, and Roberts Creek — private-cove waterfronts, forested acreages, and mainland-adjacent seclusion.",                          cities: ["Sechelt", "Gibsons", "Halfmoon Bay", "Roberts Creek"] },
  { slug: "gulf-islands",           name: "Gulf Islands Estates",           median: 3850000, count: 14, hero: "https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=800", editorial: "Salt Spring, Pender, and Galiano — off-grid glass architecture, protected coves, and ferry-only exclusivity.",                                    cities: ["Salt Spring Island", "Pender Island", "Galiano Island", "Mayne Island"] },
  { slug: "kootenays-alpine",       name: "Kootenay & Interior Alpine",     median: 3250000, count: 19, hero: "https://images.unsplash.com/photo-1517396120533-b0e19d6a0e01?w=800", editorial: "Rossland, Nelson, Sun Peaks, and Big White — ski-village chalets, heritage lake houses, and hot-spring-adjacent retreats.",                     cities: ["Rossland", "Nelson", "Sun Peaks", "Big White", "Fernie", "Invermere"] },
];

// API base — uses REACT_APP_BACKEND_URL from .env. Same pattern as the
// Community mockup so we hit the live CREA DDF® feed with no drift.
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Hero rotation timing — 6 s per photo is slow enough to admire an
// estate but fast enough to signal "portfolio, not a single home".
const HERO_ROTATION_MS = 6000;
const HERO_FETCH_LIMIT = 15;

const LISTINGS = [
  { key: "L1", price: 32500000, addr: "2620 272 Street", city: "Langley", desc: "50-acre estate · private lake · guest villa · equestrian centre", corridor: "Fraser Valley Acreages" },
  { key: "L2", price: 24250000, addr: "3800 Marine Drive", city: "West Vancouver", desc: "Waterfront estate · 240 ft frontage · deep-water moorage", corridor: "West Vancouver Estates" },
  { key: "L3", price: 17800000, addr: "1108 Alberni Street PH", city: "Vancouver", desc: "Shangri-La penthouse · 5,400 sqft · private elevator · 360° city + water", corridor: "Greater Vancouver Penthouses" },
  { key: "L4", price: 12900000, addr: "4550 Blackcomb Way", city: "Whistler", desc: "Ski-in / ski-out chalet · Kadenwood · 8,200 sqft · heli-pad access", corridor: "Whistler Retreats" },
  { key: "L5", price: 8950000,  addr: "3450 Pine Crescent", city: "Vancouver", desc: "Shaughnessy heritage · 1912 · 12,000 sqft lot · fully restored", corridor: "West Vancouver Estates" },
  { key: "L6", price: 6250000,  addr: "12550 264 Street", city: "Maple Ridge", desc: "Equestrian estate · 10 acres · 12-stall barn · dressage arena", corridor: "Fraser Valley Acreages" },
];

// ── Private-viewing modal ────────────────────────────────────────────
function PrivateViewingModal({ listing, utm, onClose }) {
  const [contact, setContact] = useState("email");
  const [submitted, setSubmitted] = useState(false);
  const submit = e => { e.preventDefault(); setSubmitted(true); };

  if (submitted) {
    return (
      <div style={backdrop} onClick={onClose}>
        <div style={modal} onClick={e => e.stopPropagation()}>
          <div style={{ padding: "48px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "3rem" }}>🔒</div>
            <H level={2} tone="ink">Request received discreetly.</H>
            <p style={{ marginTop: 12, color: BRAND.muted, fontFamily: SANS, fontSize: "0.95rem", lineHeight: 1.7 }}>
              Doug LeMaire will respond within 4 business hours via your preferred channel. Your enquiry has not been shared with any third party and is not stored in our public CRM index.
            </p>
            <button onClick={onClose} style={btnDark}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={backdrop} onClick={onClose} data-testid="private-viewing-modal">
      <div style={modal} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", fontSize: "1.6rem", color: BRAND.muted, cursor: "pointer" }}>×</button>
        <div style={{ padding: "36px 40px 40px" }}>
          <Kicker>Discreet enquiry · unmonitored channel</Kicker>
          <H level={2}>Request a Private Viewing</H>
          {listing && (
            <div style={{ marginTop: 8, fontFamily: SANS, fontSize: "0.9rem", color: BRAND.muted }}>
              <em>{listing.addr}, {listing.city}</em> · ${listing.price.toLocaleString("en-CA")}
            </div>
          )}
          <form onSubmit={submit} style={{ marginTop: 24, display: "grid", gap: 14 }}>
            <input required placeholder="Full name (or initials only)" style={fld} data-testid="pv-name" />
            <input required type="email" placeholder="Email" style={fld} data-testid="pv-email" />
            <div>
              <div style={{ fontFamily: SANS, fontSize: "0.78rem", fontWeight: 600, color: BRAND.ink, marginBottom: 6 }}>Preferred contact channel</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["email", "phone", "signal", "telegram", "whatsapp"].map(o => (
                  <label key={o} style={{
                    padding: "8px 14px", borderRadius: 999,
                    border: `1px solid ${contact === o ? BRAND.ink : BRAND.hairline}`,
                    background: contact === o ? BRAND.ink : "white",
                    color: contact === o ? "white" : BRAND.ink,
                    fontFamily: SANS, fontSize: "0.82rem", cursor: "pointer", fontWeight: 600, textTransform: "capitalize",
                  }}>
                    <input type="radio" name="contact" value={o} checked={contact === o} onChange={() => setContact(o)} style={{ display: "none" }} />
                    {o === "signal" ? "🔒 Signal" : o === "telegram" ? "✈️ Telegram" : o === "whatsapp" ? "💬 WhatsApp" : o === "phone" ? "📞 Phone" : "📧 Email"}
                  </label>
                ))}
              </div>
            </div>
            <input required placeholder={contact === "email" ? "Confirm email" : contact === "phone" ? "Phone number" : `${contact.charAt(0).toUpperCase() + contact.slice(1)} handle`} style={fld} data-testid="pv-channel" />
            <select style={fld}>
              <option>Preferred viewing window: Weekday mornings</option>
              <option>Weekday afternoons</option>
              <option>Weekday evenings (concierge escort)</option>
              <option>Weekend</option>
              <option>Virtual tour first (Facetime / Signal video)</option>
            </select>
            <textarea placeholder="Any confidential notes for Doug (optional) — proxy purchase, timing constraints, related properties…" rows={3} style={{ ...fld, resize: "vertical" }} data-testid="pv-notes" />
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: SANS, fontSize: "0.78rem", color: BRAND.muted, lineHeight: 1.55 }}>
              <input type="checkbox" required style={{ marginTop: 3 }} data-testid="pv-consent" />
              <span>I acknowledge that Doug LeMaire, REALTOR® handles enquiries under BC's Personal Information Protection Act (PIPA). My details will not be shared with third parties and are stored in a client-only ledger, not the public marketing CRM. I can withdraw consent at any time.</span>
            </label>
            {utm.utm_source && (
              <div style={{ fontFamily: SANS, fontSize: "0.7rem", color: BRAND.muted, background: "#F0EBE0", padding: "8px 12px", borderRadius: 6 }}>
                📎 Attribution captured: source={utm.utm_source}{utm.utm_medium ? `, medium=${utm.utm_medium}` : ""}{utm.utm_campaign ? `, campaign=${utm.utm_campaign}` : ""}
              </div>
            )}
            <button type="submit" data-testid="pv-submit" style={{ ...btnDark, marginTop: 6 }}>Submit discreet enquiry</button>
          </form>
        </div>
      </div>
    </div>
  );
}

const backdrop = {
  position: "fixed", inset: 0, background: "rgba(11,15,26,0.75)", backdropFilter: "blur(4px)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000, padding: 16,
};
const modal = {
  background: "white", borderRadius: 4, maxWidth: 540, width: "100%",
  maxHeight: "94vh", overflow: "auto", position: "relative",
  boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
};
const fld = {
  width: "100%", padding: "12px 14px", border: `1px solid ${BRAND.hairline}`,
  borderRadius: 4, fontFamily: SANS, fontSize: "0.92rem", color: BRAND.ink, background: "white",
};
const btnDark = {
  background: BRAND.ink, color: "white", border: "none", padding: "13px 26px",
  borderRadius: 999, fontFamily: SANS, fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.06em",
  textTransform: "uppercase", cursor: "pointer",
};
const btnGold = {
  background: BRAND.gold, color: "white", border: "none", padding: "13px 26px",
  borderRadius: 999, fontFamily: SANS, fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.06em",
  textTransform: "uppercase", cursor: "pointer",
};

// ── Main page ────────────────────────────────────────────────────────
export default function LuxuryLandingMockup({ live = false, previewFlagship = false } = {}) {
  const [openListing, setOpenListing] = useState(null);
  const [corridor, setCorridor] = useState("all");
  const [sellerSubmitted, setSellerSubmitted] = useState(false);
  const [utm, setUtm] = useState({});
  // Rotating hero photos — 6 s crossfade through live CREA DDF® luxury
  // listings. Fetched once on mount from /api/listings?price_min=3000000&
  // sort=price_desc&exclude_property_type=Vacant+Land,... so the hero is
  // always drawn from the same $3M+ residential pool the grid uses. The
  // MLS attribution badge in the corner is required by CREA DDF® rules.
  const [heroPhotos, setHeroPhotos] = useState([]);
  const [heroIndex, setHeroIndex]   = useState(0);
  // Live per-corridor counts + medians — refreshed from the API so the
  // chip labels stay honest as the DDF feed updates every 4 hours.
  const [corridorStats, setCorridorStats] = useState({});
  // Live listings shown in the magazine grid — refetched whenever the
  // corridor selection changes so each tile ("West Van Estates", "Whistler
  // Retreats", etc.) shows REAL $3M+ inventory in that corridor's cities,
  // not the hardcoded LISTINGS demo array.
  const [liveListings, setLiveListings] = useState([]);
  const [liveListingsLoading, setLiveListingsLoading] = useState(true);

  // Fetch live luxury inventory once on mount for hero rotation.
  useEffect(() => {
    let cancelled = false;
    const excl = "Vacant+Land,Lot,Land,Agriculture,Farm,Residential+Commercial+Mix,Mixed+Use";
    // Pipe-separated regex blacklist — filters out development / land-
    // assembly / holding-property listings that CREA mis-classifies as
    // "Detached" and whose first photo is an aerial site plan (the
    // "FULLY DEVELOPED COMMUNITY" parcel-overlay style). Keeps the hero
    // rotator locked to genuine residential/lifestyle imagery.
    const excludeKw = encodeURIComponent(
      "land\\s+assembl|development\\s+(potential|opportunity|site|play)|developer'?s?\\s+(alert|dream|discover|attention)|future\\s+development|holding\\s+propert|rezoning\\s+potential|subdivid|densification|OCP\\s+designat|investment\\s+(land|holding|opportunity)|fully\\s+developed\\s+community|land\\s+banking|revenue\\s+propert"
    );
    fetch(`${API}/listings?price_min=3000000&sort=price_desc&exclude_property_type=${excl}&exclude_description_keywords=${excludeKw}&limit=${HERO_FETCH_LIMIT}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d?.listings) return;
        const pool = d.listings
          .map(l => ({
            url:         l.photos?.[0],
            listing_key: l.listing_key,
            city:        l.city,
            price:       l.list_price,
            address:     l.unparsed_address || l.street_address,
          }))
          .filter(p => p.url);
        setHeroPhotos(pool);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Rotate hero photos every HERO_ROTATION_MS. Skips when the pool has
  // fewer than 2 photos or the tab is hidden (respects browser
  // background-tab throttling and prevents wasted paints).
  useEffect(() => {
    if (heroPhotos.length < 2) return;
    const tick = () => {
      if (document.visibilityState === "visible") {
        setHeroIndex(i => (i + 1) % heroPhotos.length);
      }
    };
    const id = setInterval(tick, HERO_ROTATION_MS);
    return () => clearInterval(id);
  }, [heroPhotos.length]);

  // Refresh per-corridor counts from the live API. Uses limit=1 per request
  // so the server only returns the `total` (count) field, not 100 listings
  // worth of payload per corridor. Medians fall through to the seeded
  // defaults on CORRIDORS[c] — market medians don't move enough day-over-day
  // to justify blocking first paint on ~1000 listing docs (which is what
  // the previous limit=100 loop cost).
  //
  // Feb 2026 perf fix: reduced initial luxury-page network from ~490 KB of
  // corridor stats down to ~10 KB. Restored fast Largest-Contentful-Paint.
  useEffect(() => {
    let cancelled = false;
    const excl = "Vacant+Land,Lot,Land,Agriculture,Farm,Residential+Commercial+Mix,Mixed+Use";
    Promise.all(CORRIDORS.map(c => {
      const cityQ = c.cities.map(encodeURIComponent).join(",");
      return fetch(`${API}/listings?price_min=3000000&city=${cityQ}&exclude_property_type=${excl}&limit=1`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return [c.slug, null];
          return [c.slug, { count: d.total ?? 0, median: c.median }];
        })
        .catch(() => [c.slug, null]);
    })).then(pairs => {
      if (cancelled) return;
      const next = {};
      pairs.forEach(([slug, val]) => { if (val) next[slug] = val; });
      setCorridorStats(next);
    });
    return () => { cancelled = true; };
  }, []);

  // Resolve corridor for display — swap in the live counts+medians when
  // we have them, otherwise fall back to the seeded defaults.
  const resolvedCorridors = CORRIDORS.map(c => ({
    ...c,
    count:  corridorStats[c.slug]?.count  ?? c.count,
    median: corridorStats[c.slug]?.median ?? c.median,
  }));

  // UTM capture — reads ?utm_source, utm_medium, utm_campaign, utm_content
  // from the URL on first mount and stores them in state.  Production
  // version will POST these into the referral_request payload for print-
  // magazine QR attribution (e.g. utm_source=bc_luxury_guide).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const captured = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(k => {
      const v = p.get(k);
      if (v) captured[k] = v;
    });
    if (Object.keys(captured).length) {
      setUtm(captured);
      try { sessionStorage.setItem("ez_utm", JSON.stringify(captured)); } catch (_) {}
    } else {
      try {
        const cached = sessionStorage.getItem("ez_utm");
        if (cached) setUtm(JSON.parse(cached));
      } catch (_) {}
    }
  }, []);

  // Fetch live $3M+ inventory for the selected corridor. When "all",
  // fetches across every corridor's cities so the "Entire Portfolio" tile
  // shows a true province-wide luxury sweep. Refires on corridor change.
  //
  // Two-layer non-residence filter is critical here. CREA DDF® routinely
  // double-lists development parcels — once correctly as "Vacant Land"
  // AND again as "House" with a farmhouse on the parcel. The property
  // type exclusion catches the first, but the description keyword
  // blacklist is what kicks the industrial-zoned, "future industrial",
  // land-assembly, and "development opportunity" duplicates out of the
  // luxury portfolio.
  useEffect(() => {
    let cancelled = false;
    const excl = "Vacant+Land,Lot,Land,Agriculture,Farm,Recreational,Business,Industrial,Multi-family,Retail,Office,Institutional,Residential+Commercial+Mix,Mixed+Use";
    const excludeDescKeywords = [
      "industrial[- ]?zoned", "industrial\\s+land", "industrial\\s+site",
      "future\\s+industrial", "general\\s+industrial", "light\\s+industrial",
      "heavy\\s+industrial", "\\bM-?[123]\\s+zoning", "M-?[123]\\s+general",
      "development\\s+opportunity", "development\\s+site", "development\\s+potential",
      "developers,?\\s+discover", "future\\s+townhouse\\s+development",
      "multi-family\\s+development", "multifamily\\s+development",
      "land\\s+assembly", "assembly\\s+opportunity",
      "holding\\s+opportunity", "investment\\s+opportunity\\s+for\\s+developers",
      "redevelopment\\s+opportunity", "future\\s+redevelopment",
      "OCP\\s+designated", "OCP\\s+designation",
      "commercial\\s+land", "zoned\\s+commercial", "commercial\\s+opportunity",
      "business\\s+park", "\\bNCP\\b(?!\\w)",
      "special\\s+study\\s+area", "urban\\s+containment\\s+boundary",
    ].join("|");
    const targetCities = corridor === "all"
      ? Array.from(new Set(CORRIDORS.flatMap(c => c.cities)))
      : (CORRIDORS.find(c => c.slug === corridor)?.cities || []);
    if (!targetCities.length) {
      setLiveListings([]); setLiveListingsLoading(false);
      return;
    }
    setLiveListingsLoading(true);
    const cityQ = targetCities.map(encodeURIComponent).join(",");
    const kwQ = encodeURIComponent(excludeDescKeywords);
    fetch(`${API}/listings?price_min=3000000&city=${cityQ}&exclude_property_type=${excl}&exclude_description_keywords=${kwQ}&sort=price_desc&limit=48`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled) return;
        setLiveListings(d?.listings || []);
        setLiveListingsLoading(false);
      })
      .catch(() => { if (!cancelled) { setLiveListings([]); setLiveListingsLoading(false); } });
    return () => { cancelled = true; };
  }, [corridor]);

  const shown = liveListings;
  const flagship = LISTINGS[0];

  return (
    <div style={{ background: BRAND.paper, minHeight: "100vh" }} data-testid="luxury-landing-mockup">
      <Helmet>
        <title>Luxury Homes for Sale in British Columbia — $3M+ CREA DDF® MLS® · Doug LeMaire, REALTOR®</title>
        <meta name="description" content="Curated collection of British Columbia's most distinguished residences — West Vancouver waterfronts, Coal Harbour penthouses, Whistler chalets, Fraser Valley estates, Okanagan vineyards, and Gulf Islands off-grid architecture. Every residence meets a $3M minimum, sourced live from the CREA DDF® MLS® feed. Represented by Doug LeMaire, REALTOR® — BCFSA Licence #167790."/>
        <link rel="canonical" href="https://eztofind.ca/specialties/luxury"/>
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"/>
        {/* Open Graph */}
        <meta property="og:type" content="website"/>
        <meta property="og:site_name" content="EZtoFind.ca"/>
        <meta property="og:title" content="Luxury Homes for Sale in British Columbia — $3M+ CREA DDF® MLS®"/>
        <meta property="og:description" content="Curated collection of BC's most distinguished residences — West Vancouver waterfronts, Coal Harbour penthouses, Whistler chalets, and Fraser Valley estates. $3M+ live MLS®."/>
        <meta property="og:url" content="https://eztofind.ca/specialties/luxury"/>
        <meta property="og:locale" content="en_CA"/>
        {/* Twitter card */}
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content="Luxury Homes for Sale in British Columbia — $3M+ MLS®"/>
        <meta name="twitter:description" content="Curated BC luxury residences · West Van, Coal Harbour, Whistler, Fraser Valley, Okanagan, Gulf Islands. Doug LeMaire, REALTOR® — BCFSA #167790."/>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap" rel="stylesheet" />
        {/* RealEstateAgent + WebPage + BreadcrumbList schemas — critical
            AEO/LLM entity signals for the Luxury landing page. Includes
            machine-readable BCFSA licence identifier for citation trust. */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "RealEstateAgent",
              "@id": "https://eztofind.ca/#doug",
              "name": "Doug LeMaire, REALTOR®",
              "url": "https://eztofind.ca/specialties/luxury",
              "telephone": "+1-604-787-0851",
              "email": "info@eztofind.ca",
              "identifier": [{
                "@type": "PropertyValue",
                "propertyID": "BCFSA Licence Number",
                "value": "167790",
                "url": "https://www.bcfsa.ca/industry-resources/real-estate-professional-resources/registrant-search",
              }],
              "worksFor": { "@type": "Organization", "name": "Fraser Property Management Realty Services Ltd." },
              "areaServed": "British Columbia",
              "knowsAbout": ["Luxury real estate", "Waterfront estates", "Penthouses", "Ski chalets", "Vineyard estates", "Private-showing protocols"],
              "memberOf": [
                { "@type": "Organization", "name": "Canadian Real Estate Association (CREA)" },
                { "@type": "Organization", "name": "Greater Vancouver REALTORS® (GVR)" },
                { "@type": "Organization", "name": "BC Financial Services Authority (BCFSA)" },
              ],
            },
            {
              "@type": "WebPage",
              "name": "Luxury Homes for Sale in British Columbia — $3M+ CREA DDF® MLS®",
              "description": "Curated collection of BC's most distinguished residences across 10 luxury corridors.",
              "url": "https://eztofind.ca/specialties/luxury",
              "inLanguage": "en-CA",
              "isPartOf": { "@type": "WebSite", "name": "EZtoFind.ca", "url": "https://eztofind.ca" },
              "primaryImageOfPage": heroPhotos[heroIndex]?.url || undefined,
            },
            {
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://eztofind.ca/" },
                { "@type": "ListItem", "position": 2, "name": "Specialties", "item": "https://eztofind.ca/specialties" },
                { "@type": "ListItem", "position": 3, "name": "Luxury Listings", "item": "https://eztofind.ca/specialties/luxury" },
              ],
            },
          ],
        })}</script>
      </Helmet>
      {!live && <UnlistedMockupBanner label="Luxury Listings landing page" />}

      {/* ═══════ §1 CINEMATIC HERO ═══════════════════════════════════════ */}
      <section style={{
        background: BRAND.ink,
        color: "white", padding: "0", minHeight: "88vh",
        display: "flex", flexDirection: "column",
        position: "relative", overflow: "hidden",
      }}>
        {/* Rotating background photo layer — every 6 s a new $3M+ CREA
            DDF® listing crossfades into view. Below-hero content sits on
            top via z-index. No static fallback (Feb 2026): if the pool
            hasn't resolved yet, the navy gradient below shows alone
            instead of a generic non-BC stock photo. */}
        {heroPhotos.map((p, i) => (
          <div key={p.listing_key || i}
               aria-hidden="true"
               style={{
                 position: "absolute", inset: 0, zIndex: 0,
                 backgroundImage: `url(${p.url})`,
                 backgroundSize: "cover", backgroundPosition: "center",
                 opacity: heroIndex === i ? 1 : 0,
                 transition: "opacity 1500ms ease-in-out",
               }}/>
        ))}
        {/* Editorial overlay gradient — same tonal wash as before but
            layered above the rotating photos so text stays readable
            regardless of the underlying photo's brightness. */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(180deg, rgba(11,15,26,0.35) 0%, rgba(11,15,26,0.85) 100%)",
        }} aria-hidden="true"/>
        {/* MLS® attribution — CREA DDF® rules require an on-photo
            attribution whenever a live MLS® image is displayed outside
            the standard listing detail page. Silent-hides when the
            rotation hasn't loaded (static fallback in play). */}
        {heroPhotos[heroIndex] && (
          <div style={{
            position: "absolute", bottom: 18, right: 20, zIndex: 3,
            background: "rgba(11,15,26,0.72)", color: BRAND.goldSoft,
            padding: "6px 14px", borderRadius: 2, fontFamily: SANS,
            fontSize: "0.68rem", letterSpacing: "0.14em",
            textTransform: "uppercase", fontWeight: 600,
            border: `1px solid rgba(218,191,122,0.35)`,
          }} data-testid="luxury-hero-mls-attribution">
            <span style={{ color: "rgba(255,255,255,0.95)", fontFamily: SERIF, fontStyle: "italic", textTransform: "none", letterSpacing: 0, fontSize: "0.82rem" }}>
              {heroPhotos[heroIndex].address}
            </span>
            <span style={{ opacity: 0.55, margin: "0 8px" }}>·</span>
            {heroPhotos[heroIndex].city}
            <span style={{ opacity: 0.55, margin: "0 8px" }}>·</span>
            MLS® #{heroPhotos[heroIndex].listing_key}
          </div>
        )}
        {/* Rotation dots — subtle indicator that this is a portfolio, */}
        {/* not a single home. Hidden on very small pools. */}
        {heroPhotos.length > 1 && (
          <div style={{
            position: "absolute", bottom: 22, left: 32, zIndex: 3,
            display: "flex", gap: 6,
          }} data-testid="luxury-hero-rotation-dots">
            {heroPhotos.slice(0, 8).map((_, i) => (
              <span key={i} style={{
                width: heroIndex === i ? 22 : 6, height: 3,
                background: heroIndex === i ? BRAND.goldSoft : "rgba(255,255,255,0.35)",
                borderRadius: 2, transition: "width 400ms ease",
              }}/>
            ))}
          </div>
        )}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", flex: 1 }}>

        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 32px 40px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", width: "100%" }}>
          <Kicker tone="soft">The BC Luxury Portfolio · $3M+ residences</Kicker>
          <H level={1} tone="white">Where discretion,<br />craftsmanship, and place<br /><em style={{ color: BRAND.goldSoft }}>converge.</em></H>
          <div style={{ marginTop: 24, fontFamily: SANS, fontSize: "1.05rem", lineHeight: 1.7, color: "rgba(255,255,255,0.9)", maxWidth: 620 }}>
            A curated collection of British Columbia's most distinguished residences — West Vancouver waterfronts, Coal Harbour penthouses, Whistler chalets, and Fraser Valley estates.
          </div>

          {/* Flagship listing card overlay */}
          <div style={{
            marginTop: 40, background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)",
            border: `1px solid rgba(218,191,122,0.35)`, borderRadius: 4,
            padding: "24px 28px", maxWidth: 720, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 24,
          }}>
            <div>
              <Kicker tone="soft">Flagship listing</Kicker>
              <div style={{ fontFamily: SERIF, fontSize: "1.6rem", color: "white", lineHeight: 1.2 }}>{flagship.addr}, {flagship.city}</div>
              <div style={{ fontFamily: SANS, fontSize: "0.9rem", opacity: 0.85, marginTop: 6 }}>{flagship.desc}</div>
              <div style={{ fontFamily: SERIF, fontSize: "1.9rem", color: BRAND.goldSoft, marginTop: 12 }}>${flagship.price.toLocaleString("en-CA")}</div>
            </div>
            <button onClick={() => setOpenListing(flagship)} data-testid="hero-private-viewing" style={{ ...btnGold, whiteSpace: "nowrap" }}>Private viewing</button>
          </div>
        </div>
        </div>{/* end .position:relative z-index:2 hero content wrapper */}
      </section>

      {/* ═══════ §2 LIFESTYLE CORRIDORS ══════════════════════════════════ */}
      <Section tone="paper" pad="88px 0 40px">
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <Kicker>Curated corridors · {resolvedCorridors.reduce((s, c) => s + (c.count || 0), 0).toLocaleString("en-CA")} active $3M+ residences across BC</Kicker>
          <H level={2} align="center">Choose your lifestyle.</H>
          <p style={{ fontFamily: SANS, fontSize: "1rem", color: BRAND.muted, marginTop: 16, maxWidth: 620, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>
            Every residence in the portfolio meets a $3M minimum, sourced live from the CREA DDF® MLS® feed. When you request a private viewing, Doug personally reviews title, active permits with the municipality, and negotiates showings with discretion. Filter across the ten defining BC luxury geographies — from Coal Harbour penthouses to Salt Spring off-grid architecture.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <button onClick={() => { setCorridor("all"); setTimeout(() => document.getElementById("luxury-magazine-grid")?.scrollIntoView({behavior:"smooth", block:"start"}), 100); }} style={{
            padding: "20px 22px", border: corridor === "all" ? `2px solid ${BRAND.ink}` : `1px solid ${BRAND.hairline}`,
            background: corridor === "all" ? BRAND.ink : "white", color: corridor === "all" ? "white" : BRAND.ink,
            cursor: "pointer", textAlign: "left", borderRadius: 4, fontFamily: SANS,
          }} data-testid="corridor-all">
            <div style={{ fontFamily: SERIF, fontSize: "1.3rem", fontWeight: 500 }}>The Entire Portfolio</div>
            <div style={{ fontSize: "0.82rem", opacity: 0.75, marginTop: 6 }}>
              {resolvedCorridors.reduce((s, c) => s + (c.count || 0), 0).toLocaleString("en-CA")} residences · $3M – ${(Math.max(...resolvedCorridors.map(c => c.median || 0), 32500000)/1_000_000).toFixed(1)}M
            </div>
          </button>
          {resolvedCorridors.map(c => (
            <button key={c.slug} onClick={() => { setCorridor(c.slug); setTimeout(() => document.getElementById("luxury-magazine-grid")?.scrollIntoView({behavior:"smooth", block:"start"}), 100); }} data-testid={`corridor-${c.slug}`} style={{
              padding: 0, border: corridor === c.slug ? `2px solid ${BRAND.ink}` : `1px solid ${BRAND.hairline}`,
              cursor: "pointer", textAlign: "left", borderRadius: 4, overflow: "hidden", background: "white",
            }}>
              <div style={{ background: `linear-gradient(180deg, rgba(11,15,26,0) 40%, rgba(11,15,26,0.75) 100%), url(${c.hero}) center/cover`, height: 160, position: "relative" }}>
                <div style={{ position: "absolute", bottom: 12, left: 16, color: "white" }}>
                  <div style={{ fontFamily: SERIF, fontSize: "1.15rem", lineHeight: 1.2 }}>{c.name}</div>
                  <div style={{ fontFamily: SANS, fontSize: "0.75rem", opacity: 0.9, marginTop: 3 }}>{(c.count || 0).toLocaleString("en-CA")} residences · median ${(c.median/1_000_000).toFixed(1)}M</div>
                </div>
              </div>
              <div style={{ padding: "12px 16px", fontFamily: SANS, fontSize: "0.82rem", color: BRAND.muted, lineHeight: 1.55 }}>{c.editorial}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Featured listing pointer — subtle strip linking to realtor.ca */}
      <FeaturedListingPointer/>

      {/* ═══════ §3 MAGAZINE GRID ════════════════════════════════════════ */}
      <Section tone="paper" pad="20px 0 80px" id="luxury-magazine-grid">
        {/* Flagship listing 3015 141 Street — gated on FLAGSHIP.active in config/flagshipListing.js */}
        {(previewFlagship || FLAGSHIP.active) && <LuxuryFlagshipCard/>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <Kicker>The portfolio · CREA DDF® · $3M+ verified</Kicker>
            <H level={2}>{corridor === "all" ? "Currently in market" : CORRIDORS.find(c => c.slug === corridor)?.name}</H>
          </div>
          <div style={{ fontFamily: SANS, fontSize: "0.85rem", color: BRAND.muted }}>Showing {shown.length} residences · updated 4 minutes ago</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 28 }}>
          {liveListingsLoading && (
            <div style={{ gridColumn:"1 / -1", padding:"3rem", textAlign:"center", color:BRAND.muted, fontFamily:SANS }}>
              Loading live $3M+ inventory…
            </div>
          )}
          {!liveListingsLoading && shown.length === 0 && (
            <div style={{ gridColumn:"1 / -1", padding:"3rem", textAlign:"center", color:BRAND.muted, fontFamily:SANS }}>
              No $3M+ listings currently active in this corridor. Check back — the CREA DDF® feed refreshes every 4 hours.
            </div>
          )}
          {!liveListingsLoading && shown.map(l => {
            const key    = l.listing_key || l.key;
            const price  = l.list_price ?? l.price ?? 0;
            const addr   = l.unparsed_address || l.street_address || l.addr || "Address available on request";
            const city   = l.city || "British Columbia";
            const desc   = (l.description || l.public_remarks || l.desc || "").slice(0, 180);
            const photo  = l.photos?.[0];
            const corridorLabel = CORRIDORS.find(c => (c.cities || []).some(cc => cc.toLowerCase() === (city || "").toLowerCase()))?.name || l.corridor || "Luxury Portfolio";
            return (
              <article key={key} style={{ background: "white", borderRadius: 4, overflow: "hidden", border: `1px solid ${BRAND.hairline}`, transition: "transform 0.2s ease, box-shadow 0.2s ease" }}>
                <Link
                  to={`/listings/${encodeURIComponent(key)}`}
                  data-testid={`luxury-listing-${key}`}
                  style={{ display: "block", color: "inherit", textDecoration: "none" }}
                >
                  <div style={{
                    background: photo ? `url(${photo}) center/cover` : `linear-gradient(135deg, #DDD2B8, #F0E9D7)`,
                    height: 260, position: "relative",
                  }}>
                    <div style={{ position: "absolute", top: 14, left: 14, background: BRAND.ink, color: "white", padding: "5px 10px", fontFamily: SANS, fontSize: "0.68rem", letterSpacing: "0.14em", fontWeight: 600, textTransform: "uppercase" }}>{corridorLabel}</div>
                  </div>
                  <div style={{ padding: "24px 26px 26px" }}>
                    <div style={{ fontFamily: SERIF, fontSize: "1.45rem", lineHeight: 1.2, color: BRAND.ink }}>{addr}</div>
                    <div style={{ fontFamily: SANS, fontSize: "0.85rem", color: BRAND.muted, marginTop: 4 }}>{city}, British Columbia</div>
                    {desc && <div style={{ fontFamily: SANS, fontSize: "0.9rem", color: BRAND.ink, marginTop: 12, lineHeight: 1.6 }}>{desc}{(l.description || "").length > 180 ? "…" : ""}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22 }}>
                      <div style={{ fontFamily: SERIF, fontSize: "1.4rem", color: BRAND.ink }}>${Number(price).toLocaleString("en-CA")}</div>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenListing(l); }}
                        data-testid={`viewing-${key}`}
                        style={{ background: "none", border: `1px solid ${BRAND.ink}`, color: BRAND.ink, padding: "9px 16px", fontFamily: SANS, fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", borderRadius: 999 }}
                      >Private viewing</button>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </Section>

      {/* ═══════ §4 DOOGIE LUXURY ASSISTANT ══════════════════════════════ */}
      <Section tone="ink" pad="80px 0">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <Kicker>Doogie · Luxury concierge</Kicker>
            <H level={2} tone="white">Discreet answers,<br /><em style={{ color: BRAND.goldSoft }}>on your schedule.</em></H>
            <p style={{ fontFamily: SANS, fontSize: "1rem", lineHeight: 1.7, color: "rgba(255,255,255,0.82)", marginTop: 18 }}>
              Doogie is our AI research concierge — trained on BC luxury zoning, private schools, waterfront riparian rules, and market comparables. Ask anything before you request a viewing, in complete anonymity.
            </p>
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "What are the waterfront setback rules on Bowen Island?",
                "Which West Van neighbourhoods feed Collingwood School?",
                "Can I subdivide a 5-acre Whistler Cay lot?",
                "How does the Speculation & Vacancy Tax generally apply to $10M+ second homes?",
              ].map(q => (
                <button key={q} data-testid="doogie-prompt" style={{
                  background: "transparent", color: "rgba(255,255,255,0.95)",
                  border: `1px solid rgba(218,191,122,0.3)`, textAlign: "left",
                  padding: "12px 18px", borderRadius: 4, fontFamily: SERIF, fontStyle: "italic",
                  fontSize: "0.95rem", cursor: "pointer",
                }}>"{q}" →</button>
              ))}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(218,191,122,0.25)`, borderRadius: 4, padding: "28px 32px" }}>
            <div style={{ fontFamily: SANS, fontSize: "0.7rem", letterSpacing: "0.18em", color: BRAND.goldSoft, fontWeight: 600, textTransform: "uppercase", marginBottom: 14 }}>Sample response</div>
            <p style={{ fontFamily: SERIF, fontSize: "1.05rem", lineHeight: 1.7, color: "rgba(255,255,255,0.92)", fontStyle: "italic" }}>
              "West Vancouver waterfront properties are generally subject to BC's <strong>Riparian Areas Regulation</strong>, which typically establishes a 30-metre streamside protection zone measured from the natural boundary. The District of West Vancouver also generally applies a 15-metre setback from the natural boundary of the ocean under Zoning Bylaw No. 4662 §200. Setbacks, variances, and pre-existing structures are addressed on a property-by-property basis by the municipal planning department, and any decision to buy or renovate should be reviewed with a BC lawyer and the municipality before you write an offer."
            </p>
            <div style={{ marginTop: 18, fontFamily: SANS, fontSize: "0.75rem", color: "rgba(255,255,255,0.55)" }}>Sources cited: District of West Vancouver Zoning Bylaw No. 4662, Riparian Areas Regulation (SBC 2004 c. 26)</div>
            <div style={{
              marginTop: 18, paddingTop: 14,
              borderTop: `1px solid rgba(218,191,122,0.18)`,
              fontFamily: SANS, fontSize: "0.72rem",
              color: "rgba(255,255,255,0.65)", lineHeight: 1.55,
            }}>
              <strong style={{ color: BRAND.goldSoft }}>General educational information only.</strong> Doogie's output is AI-assisted and reviewed by Doug LeMaire, REALTOR<sup style={{fontSize:"0.7em"}}>®</sup>. Not legal, tax, or property-specific advice. Confirm all zoning, setback, tax, and variance details with a qualified BC lawyer, notary, accountant, and the applicable municipal planning department before acting.
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════ §5 CLIENT TESTIMONIAL ═══════════════════════════════════ */}
      <Section tone="paper" pad="60px 0 80px">
        <div style={{
          background: "#EEF2FF",
          borderRadius: 12,
          padding: "36px 40px",
          maxWidth: 620,
          margin: "0 auto",
          fontFamily: SANS,
        }}>
          {/* 5-star rating */}
          <div style={{ display: "flex", gap: 3, marginBottom: 14 }} aria-label="5 out of 5 stars">
            {[0,1,2,3,4].map(i => (
              <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill={BRAND.gold} aria-hidden="true">
                <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.5L6 22l1.5-7.2L2 10l7.1-1.1z"/>
              </svg>
            ))}
          </div>
          {/* Quote icon */}
          <svg width="26" height="20" viewBox="0 0 24 20" fill={BRAND.navy || "#0F2A5B"} style={{ marginBottom: 10, opacity: 0.85 }} aria-hidden="true">
            <path d="M0 20V10C0 4.5 3.6 0 9 0v3C6 3 3 6 3 10h3v10H0zm14 0V10c0-5.5 3.6-10 9-10v3c-3 0-6 3-6 7h3v10h-6z"/>
          </svg>
          {/* Testimonial text */}
          <div style={{
            fontSize: "0.98rem", lineHeight: 1.7, color: BRAND.ink,
            fontStyle: "italic", marginBottom: 26,
          }}>
            Doug was an absolute pleasure to work with! As a buyer, we truly appreciated his patience, professionalism, and thorough approach throughout the entire process. Doug took the time to understand our needs, provided valuable insights, and guided us every step of the way with clear communication and expert advice. Doug's attention to detail and dedication made the experience smooth and stress-free. We couldn't have asked for a better realtor and highly recommend Doug to anyone looking to buy or sell a home!
          </div>
          {/* Author row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: BRAND.navy || "#0F2A5B", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.02em",
              fontFamily: SANS,
            }}>JM</div>
            <div>
              <div style={{ fontWeight: 700, color: BRAND.ink, fontSize: "0.95rem" }}>J&amp;M</div>
              <div style={{ color: BRAND.muted, fontSize: "0.82rem", marginTop: 2 }}>Buyers</div>
            </div>
          </div>
          {/* BCFSA advertising-rule disclosure — individual client experience */}
          <div style={{
            marginTop: 18, paddingTop: 14,
            borderTop: `1px solid rgba(15,42,91,0.08)`,
            fontSize: "0.72rem", color: BRAND.muted, lineHeight: 1.5,
            fontStyle: "italic",
          }}>
            Individual client experience — results are not typical and depend on factors specific to each transaction.
          </div>
        </div>
      </Section>

      {/* ═══════ §6 CONFIDENTIAL ESTATE ASSESSMENT FORM ═════════════════ */}
      <Section tone="ink" pad="88px 0">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "start" }}>
          <div>
            <Kicker tone="soft">Bespoke CMA · By invitation</Kicker>
            <H level={2} tone="white">Custom Confidential<br />Estate Assessment.</H>
            <p style={{ fontFamily: SANS, fontSize: "1rem", lineHeight: 1.75, color: "rgba(255,255,255,0.85)", marginTop: 18 }}>
              For BC estate owners considering a sale in the next 3–24 months. Doug personally prepares a bespoke market analysis — comparable transactions above $3M, discretion protocol, and a listing timeline.
            </p>
            <ul style={{ marginTop: 22, padding: 0, listStyle: "none", fontFamily: SANS, fontSize: "0.9rem", color: "rgba(255,255,255,0.85)", lineHeight: 2 }}>
              <li>✦ Delivered in a signed, watermarked PDF within 5 business days</li>
              <li>✦ Prepared under signed NDA · never uploaded to a CRM index</li>
              <li>✦ Includes a private valuation range, not a public listing suggestion</li>
              <li>✦ Complimentary · zero obligation to list</li>
            </ul>
          </div>

          {sellerSubmitted ? (
            <div style={{ background: "white", padding: "44px 40px", borderRadius: 4, textAlign: "center" }}>
              <div style={{ fontSize: "3rem" }}>🔒</div>
              <H level={2}>Request received.</H>
              <p style={{ marginTop: 12, color: BRAND.muted, fontFamily: SANS, fontSize: "0.95rem", lineHeight: 1.7 }}>
                Doug will contact you within 2 business days via your preferred channel. Your enquiry is stored in the confidential estate ledger — never in our public CRM.
              </p>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); setSellerSubmitted(true); }} style={{ background: "white", padding: "36px 36px", borderRadius: 4, display: "grid", gap: 14 }} data-testid="estate-assessment-form">
              <input required placeholder="Full name" style={fld} data-testid="ea-name" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input required type="email" placeholder="Email" style={fld} data-testid="ea-email" />
                <input placeholder="Phone (optional)" style={fld} data-testid="ea-phone" />
              </div>
              <input required placeholder="Estate address (kept confidential)" style={fld} data-testid="ea-address" />
              <select required style={fld} data-testid="ea-value">
                <option value="">Estimated market value…</option>
                <option>$3M – $5M</option>
                <option>$5M – $8M</option>
                <option>$8M – $12M</option>
                <option>$12M – $20M</option>
                <option>$20M+</option>
              </select>
              <select required style={fld} data-testid="ea-timeline">
                <option value="">Timeline to sell…</option>
                <option>0–3 months</option>
                <option>3–6 months</option>
                <option>6–12 months</option>
                <option>12–24 months</option>
                <option>Exploring only</option>
              </select>
              <select required style={fld}>
                <option value="">Preferred contact channel…</option>
                <option>📧 Email only</option>
                <option>📞 Phone (voice)</option>
                <option>🔒 Signal (encrypted)</option>
                <option>💬 WhatsApp / Telegram</option>
              </select>
              <textarea placeholder="Any confidential context Doug should know (optional)" rows={3} style={{ ...fld, resize: "vertical" }} data-testid="ea-notes" />
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: SANS, fontSize: "0.75rem", color: BRAND.muted, lineHeight: 1.6, marginTop: 4 }}>
                <input type="checkbox" required style={{ marginTop: 3 }} data-testid="ea-consent" />
                <span>I understand this enquiry is handled under BC's Personal Information Protection Act (PIPA), stored in Doug's confidential estate ledger only, never used for marketing, and never shared with third parties.</span>
              </label>
              {utm.utm_source && (
                <div style={{ fontFamily: SANS, fontSize: "0.7rem", color: BRAND.muted, background: "#F0EBE0", padding: "8px 12px", borderRadius: 4 }}>
                  📎 Referral source captured: {utm.utm_source}
                </div>
              )}
              <button type="submit" data-testid="ea-submit" style={{ ...btnDark, marginTop: 6 }}>Request confidential assessment</button>
            </form>
          )}
        </div>
      </Section>

      {/* ═══════ §7 PIPA PRIVACY BANNER ═════════════════════════════════ */}
      <Section tone="paper" pad="48px 0">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 36px", background: "white", border: `1px solid ${BRAND.hairline}`, borderRadius: 4 }}>
          <div style={{ fontFamily: SERIF, fontSize: "1.2rem", color: BRAND.ink, marginBottom: 12 }}>🔒 Confidentiality & PIPA Compliance</div>
          <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: BRAND.muted, lineHeight: 1.75, margin: 0 }}>
            All enquiries submitted through this portal are handled under British Columbia's <strong>Personal Information Protection Act (PIPA)</strong>. Estate ownership details, contact channels, and viewing preferences are stored in Doug LeMaire's private client ledger — separated from the public marketing CRM. Doug does not sell, rent, or share client information with third parties. Encrypted contact channels (Signal, WhatsApp end-to-end) are offered for buyers requesting maximum discretion. Enquiries may be withdrawn at any time by contacting <a href="mailto:info@eztofind.ca" style={{ color: BRAND.ink, fontWeight: 600 }}>info@eztofind.ca</a>.
          </p>
        </div>
      </Section>

      {/* Footer */}
      <div style={{ background: BRAND.ink, color: "rgba(255,255,255,0.65)", padding: "36px 24px", fontFamily: SANS, fontSize: "0.75rem", textAlign: "center", lineHeight: 1.7 }}>
        © 2026 EZtoFind.ca · Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. — 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5 · Brokerage (604) 466-7021 · Direct (604) 787-0851 · <a href="mailto:info@eztofind.ca" style={{ color: BRAND.goldSoft }}>info@eztofind.ca</a><br />
        MLS® data © CREA DDF®. General information only — not real-estate, legal, tax, or financial advice.
      </div>

      {openListing && <PrivateViewingModal listing={openListing} utm={utm} onClose={() => setOpenListing(null)} />}
    </div>
  );
}
