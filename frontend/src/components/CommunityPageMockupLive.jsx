// CommunityPageMockupLive — data-hydrated version of the community-page
// redesign mockup.  Fetches real data from:
//   /api/community/{slug}/stats            — active count, median price, min/max
//   /api/community/{slug}/synopsis         — long-form editorial + sources
//   /api/community/{slug}/neighbourhoods   — full sub-neighbourhood roster
//   /api/community/{slug}/nearby           — nearby communities chip strip
//   /api/community/{slug}/weather          — climate narrative
//   /api/listings?city={name}              — live 4-card grid + count
//
// Routes:
//   /community/:slug           → renders live (hides mockup banner)
//   /mockups/community-live?slug=... → renders mockup (with banner)
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { ArrowUpRight, ArrowRight, MapPin, Users, Video, CheckCircle2 } from "lucide-react";
import UnlistedMockupBanner from "./UnlistedMockupBanner";
import { GlossaryPageProvider, GlossaryProse } from "../utils/glossary";
import { TLDRBlock, ComplianceStrip } from "../utils/answerFirst";

const API = process.env.REACT_APP_BACKEND_URL;

// Apple-minimalist system font stack (SF Pro on Apple devices, graceful fallback).
const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Inter', sans-serif";
// Apple HIG palette — gold retired, single calm blue/navy accent.
const BRAND = {
  navy: "#0F2A5B", gold: "#0066CC", cream: "#F5F5F7",
  ink: "#1D1D1F", muted: "#86868B", green: "#248A3D",
  blue: "#0066CC", paper: "#FBFBFD", brass: "#0F2A5B",
};
// Region → calm hero photo. Falls back to a neutral BC landscape so every
// community gets a photo-forward (but light-handled) hero.
const REGION_HERO = {
  "Fraser Valley": "/images/regions/fraser-valley.webp",
  "Sea-to-Sky": "/images/regions/sea-to-sky.webp",
  "Sea to Sky": "/images/regions/sea-to-sky.webp",
  "Greater Vancouver": "https://images.unsplash.com/photo-1647655806923-e8202f4f2b8c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  "Metro Vancouver": "https://images.unsplash.com/photo-1647655806923-e8202f4f2b8c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  "Vancouver": "https://images.unsplash.com/photo-1647655806923-e8202f4f2b8c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  "Okanagan": "https://images.unsplash.com/photo-1635030955271-570ea77fe8fc?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
};
const DEFAULT_HERO = "https://images.unsplash.com/photo-1615700920267-ab9642ba7114?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400";

// Doug's direct service area — everything else is out-of-area referral flow.
const FOCUS_REGIONS = new Set([
  "Fraser Valley", "Greater Vancouver", "Metro Vancouver", "Sea-to-Sky",
  "Vancouver", "Sea to Sky",
]);
const FOCUS_COMMUNITIES = new Set([
  "maple-ridge", "pitt-meadows", "coquitlam", "port-coquitlam", "port-moody",
  "burnaby", "vancouver", "west-vancouver", "north-vancouver", "richmond",
  "surrey", "delta", "langley", "langley-city", "langley-township",
  "white-rock", "new-westminster", "mission", "abbotsford", "chilliwack",
  "hope", "kent", "harrison-hot-springs",
  "squamish", "whistler", "pemberton", "lions-bay", "bowen-island",
]);
// Neighbourhoods inside the farm cities above — IN-AREA (no referral).
// Mirrors FOCUS_HOODS in App.js.
const FOCUS_HOODS = new Set([
  "kitsilano", "kerrisdale", "west-point-grey", "point-grey", "point-grey-ubc",
  "dunbar", "dunbar-southlands", "southlands", "marpole", "oakridge",
  "south-cambie", "cambie", "shaughnessy", "south-granville", "arbutus",
  "arbutus-ridge", "mount-pleasant", "fairview", "yaletown", "coal-harbour",
  "west-end", "downtown", "downtown-vancouver", "downtown-eastside", "gastown",
  "chinatown", "strathcona", "grandview-woodland", "commercial-drive",
  "hastings-sunrise", "renfrew-collingwood", "victoria-fraserview", "sunset",
  "kensington-cedar-cottage", "riley-park", "killarney", "champlain-heights",
  "false-creek", "olympic-village", "main-street", "west-side", "east-side",
  "east-vancouver",
  "university", "ubc", "university-endowment-lands", "uel",
  "metrotown", "brentwood", "edmonds", "capitol-hill", "burnaby-heights",
  "deer-lake", "lougheed",
  "steveston", "steveston-village", "brighouse",
  "lonsdale", "lower-lonsdale", "lynn-valley", "deep-cove", "edgemont",
  "british-properties", "ambleside", "dundarave", "horseshoe-bay",
  "south-surrey", "cloverdale", "fleetwood", "guildford", "newton", "whalley",
  "burke-mountain", "fort-langley", "walnut-grove", "willoughby",
]);

const FALLBACK_SUGGESTIONS = [
  { slug: "maple-ridge", label: "Maple Ridge (in-area)" },
  { slug: "langley", label: "Langley (in-area)" },
  { slug: "squamish", label: "Squamish (in-area)" },
  { slug: "kelowna", label: "Kelowna (referral)" },
  { slug: "victoria", label: "Victoria (referral)" },
  { slug: "nelson", label: "Nelson (referral)" },
];

// Curated sub-neighbourhood fallbacks for BC cities where the CREA CityRegion
// field isn't populated by the local board (Fraser Valley, Greater Vancouver).
// Each entry is a description-keyword we can hand to /listings?q= to route the
// visitor into a filtered result set matching that sub-area.
const CURATED_HOODS = {
  "maple-ridge": [
    { name: "Albion", q: "Albion" },
    { name: "Cottonwood MR", q: "Cottonwood" },
    { name: "East Central", q: "East Central" },
    { name: "West Central", q: "West Central" },
    { name: "Silver Valley", q: "Silver Valley" },
    { name: "Websters Corners", q: "Websters Corners" },
    { name: "Whonnock", q: "Whonnock" },
    { name: "Thornhill MR", q: "Thornhill" },
    { name: "Northwest MR", q: "Northwest Maple Ridge" },
    { name: "Southwest MR", q: "Southwest Maple Ridge" },
  ],
  "langley": [
    { name: "Willoughby Heights", q: "Willoughby" },
    { name: "Walnut Grove", q: "Walnut Grove" },
    { name: "Murrayville", q: "Murrayville" },
    { name: "Brookswood-Fernridge", q: "Brookswood" },
    { name: "Fort Langley", q: "Fort Langley" },
    { name: "Aldergrove", q: "Aldergrove" },
    { name: "Salmon River", q: "Salmon River" },
    { name: "Campbell Valley", q: "Campbell Valley" },
  ],
  "squamish": [
    { name: "Downtown Squamish", q: "Downtown Squamish" },
    { name: "Garibaldi Highlands", q: "Garibaldi Highlands" },
    { name: "Valleycliffe", q: "Valleycliffe" },
    { name: "Brackendale", q: "Brackendale" },
    { name: "Dentville", q: "Dentville" },
    { name: "Britannia Beach", q: "Britannia Beach" },
  ],
};

// Static hero backdrop per community/region. Falls back to the region webp we
// already ship. Uses only assets that exist in /public so we never 404.
const HERO_BACKDROP = {
  "maple-ridge": "/images/regions/fraser-valley.webp",
  "langley": "/images/regions/fraser-valley.webp",
  "abbotsford": "/images/regions/fraser-valley.webp",
  "chilliwack": "/images/regions/fraser-valley.webp",
  "mission": "/images/regions/fraser-valley.webp",
  "surrey": "/images/regions/fraser-valley.webp",
  "squamish": "/images/regions/sea-to-sky.webp",
  "whistler": "/images/regions/sea-to-sky.webp",
  "pemberton": "/images/regions/sea-to-sky.webp",
};

// ── UI helpers ───────────────────────────────────────────────────────
const Chip = ({ children, tone = "navy" }) => (
  <span style={{
    padding: "5px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600,
    background: tone === "green" ? "#DCFCE7" : tone === "gold" ? "#FEF3C7" : "#EFF6FF",
    color: tone === "green" ? "#065F46" : tone === "gold" ? "#78350F" : "#1E40AF",
    display: "inline-flex", gap: 6, alignItems: "center",
  }}>{children}</span>
);
const SectionH = ({ children, kicker }) => (
  <div style={{marginTop:56,marginBottom:18}}>
    {kicker && <div style={{fontSize:"0.72rem",letterSpacing:"0.14em",color:BRAND.muted,fontWeight:600,textTransform:"uppercase"}}>{kicker}</div>}
    <div style={{fontSize:"1.75rem",fontFamily:SF,fontWeight:600,letterSpacing:"-0.025em",color:BRAND.ink,lineHeight:1.15,marginTop:6}}>{children}</div>
  </div>
);
const fmtMoney = (n) => {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1000) return `$${Math.round(n/1000)}K`;
  return `$${n.toLocaleString("en-CA")}`;
};

// ── BC OpenMaps WFS layers + StatCan demographics (Feb 2026) ─────────
// Inline components local to the live community page.
function CommunityLayersInline({ slug }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    axios.get(`${API}/api/community/${slug}/layers`).then(r => { if (alive) setData(r.data); }).catch(() => {});
    return () => { alive = false; };
  }, [slug]);
  if (!data || data.available === false) return null;
  const layers = data.layers || {};
  const Row = ({label, l, id}) => (
    <div style={{padding:"10px 0", borderTop:"1px solid rgba(15,42,91,0.08)"}} data-testid={`layer-${id}`}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
        <span style={{fontWeight:700, color:BRAND.navy, fontSize:"0.94rem"}}>{label}</span>
        <span style={{fontSize:"0.85rem", color: l.hit ? "#065F46" : BRAND.muted, fontWeight:600}}>
          {l.hit === true ? (l.hit_info ? `Inside · ${l.hit_info}` : "Yes — intersects centroid")
            : l.hit === false ? "No intersect at centroid"
            : "Unavailable"}
        </span>
      </div>
      <div style={{fontSize:"0.72rem", color:BRAND.muted, fontStyle:"italic", lineHeight:1.5, marginTop:4}}>{l.disclaimer}</div>
    </div>
  );
  return (
    <div data-testid="community-layers-card" style={{marginTop:20, padding:"22px 24px 18px", background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:22, maxWidth:820, boxShadow:"0 2px 12px rgba(0,0,0,0.03)"}}>
      <div style={{fontFamily:SF, fontSize:"1.15rem", color:BRAND.ink, fontWeight:600, letterSpacing:"-0.02em"}}>BC Land-Use Layers</div>
      <div style={{fontSize:"0.78rem", color:BRAND.muted, marginTop:4, marginBottom:6, lineHeight:1.55}}>
        Point-intersect at the community's canonical centroid ({data.point?.lat?.toFixed(3)}, {data.point?.lng?.toFixed(3)}). General information / estimate only.
      </div>
      {layers.muni  && <Row label="Municipal boundary"              l={layers.muni}  id="muni"/>}
      {layers.alr   && <Row label="Agricultural Land Reserve (ALR)" l={layers.alr}   id="alr"/>}
      {layers.flood && <Row label="Historical mapped floodplain"    l={layers.flood} id="flood"/>}
      <div style={{marginTop:10, fontSize:"0.7rem", color:BRAND.muted, fontStyle:"italic", lineHeight:1.55}}>
        Source: DataBC OpenMaps WFS · Retrieved {new Date(data.fetch_date).toLocaleDateString("en-CA")}
      </div>
    </div>
  );
}

function CommunityDemographicsInline({ slug }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    axios.get(`${API}/api/community/${slug}/demographics`).then(r => { if (alive) setData(r.data); }).catch(() => {});
    return () => { alive = false; };
  }, [slug]);
  if (!data) return null;
  // Flatten the raw Statistics Canada payload into clean primitive metric tiles
  // (replaces the old raw-JSON <pre> dump). Never renders objects/arrays.
  const raw = data.raw || {};
  const prettyKey = (k) => String(k).replace(/[_\-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const prettyVal = (v) => (typeof v === "number" ? v.toLocaleString("en-CA") : String(v));
  const entries = Object.entries(raw)
    .filter(([, v]) => (typeof v === "string" || typeof v === "number") && String(v).trim() !== "")
    .slice(0, 8);
  const hasData = data.available !== false && entries.length > 0;
  return (
    <div data-testid="community-demographics-card" style={{marginTop:16, padding:"22px 24px", background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:22, maxWidth:820, boxShadow:"0 2px 12px rgba(0,0,0,0.03)"}}>
      <div style={{fontFamily:SF, fontSize:"1.15rem", color:BRAND.ink, fontWeight:600, letterSpacing:"-0.02em", display:"flex", alignItems:"center", gap:8}}>
        <Users size={18} strokeWidth={1.9} style={{color:BRAND.blue}}/> Community Demographics
      </div>
      {!hasData ? (
        <div style={{fontSize:"0.9rem", color:BRAND.muted, marginTop:10, lineHeight:1.6}}>
          {data.note || "2021 Statistics Canada profile synchronizing for this geographic area. Check back shortly."}
        </div>
      ) : (
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginTop:16}}>
          {entries.map(([k, v]) => (
            <div key={k} style={{padding:"14px 16px", background:BRAND.paper, borderRadius:14, border:"1px solid rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:"0.66rem", letterSpacing:"0.06em", textTransform:"uppercase", color:BRAND.muted, fontWeight:600}}>{prettyKey(k)}</div>
              <div style={{fontSize:"1.3rem", fontFamily:SF, fontWeight:700, letterSpacing:"-0.03em", color:BRAND.ink, marginTop:4}}>{prettyVal(v)}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{marginTop:14, fontSize:"0.7rem", color:BRAND.muted, fontStyle:"italic", lineHeight:1.55}}>
        Source: {data.attribution || "Statistics Canada"} · Retrieved {new Date(data.fetch_date).toLocaleDateString("en-CA")}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────
export default function CommunityPageMockupLive({ live = false } = {}) {
  // Slug source depends on how the component is mounted:
  //   /community/:slug            → useParams (live production page)
  //   /mockups/community-live?slug=… → useSearchParams (parked mockup)
  const routeParams = useParams();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const slug = routeParams.slug || sp.get("slug") || "kelowna";
  // Navigate to a sibling community — on the LIVE route we push a new URL
  // (`/community/{slug}`) so browser history + canonical + scroll-restore
  // behave correctly; on the mockup route we just rewrite `?slug=…`.
  const gotoCommunity = (s) => live ? navigate(`/community/${s}`) : setSp({ slug: s });

  // Per-browser session ID for referral-click analytics. Same key used by
  // the return-visit hero so the admin can join both funnels. Generated
  // once via crypto.randomUUID(); never rotated; never sent to a 3rd party.
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      let sid = localStorage.getItem("ez_rv_session_id");
      if (!sid) {
        sid = (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : `rv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("ez_rv_session_id", sid);
      }
      return sid;
    } catch { return ""; }
  }, []);

  // Fire-and-forget beacon for the "Referral REALTOR® link →" click.
  // Uses navigator.sendBeacon so the event survives the immediate
  // <Link> navigation. PIPA-safe: no PII, filters limited to slug +
  // source strings, IPs sha256-hashed server-side.
  const trackReferralClick = (source) => {
    if (!community || typeof window === "undefined") return;
    try {
      const payload = { community, slug, source, session_id: sessionId };
      const url = `${API}/api/analytics/referral-click`;
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    } catch { /* analytics failures are non-fatal */ }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState({
    stats: null, synopsis: null, neighbourhoods: [], referralOnly: false, nearby: [],
    weather: null, listings: [], listingsTotal: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    // reset saved-state per community switch
    try { setSaved(!!localStorage.getItem(`ez_saved_community_${slug}`)); } catch (_) { /* noop */ }
    (async () => {
      try {
        // Deslugified guess lets every fetch (including listings) fire in ONE
        // parallel batch — no stats-first round-trip. If the canonical name
        // differs, listings are refined in the background below.
        const cityGuess = slug.replace(/-/g," ").replace(/\b\w/g, s => s.toUpperCase());
        // Critical above-the-fold batch — flip the page out of the full-page
        // skeleton as soon as these return. Neighbourhoods + weather are slower
        // and secondary, so they stream in afterwards instead of blocking the
        // whole page (previously the slowest of 6 calls gated everything).
        const [statsR, synR, nearR, listR] = await Promise.allSettled([
          axios.get(`${API}/api/community/${slug}/stats`),
          axios.get(`${API}/api/community/${slug}/synopsis`),
          axios.get(`${API}/api/community/${slug}/nearby`),
          axios.get(`${API}/api/listings`, { params: { city: cityGuess, limit: 4 } }),
        ]);
        if (cancelled) return;
        const statsData = statsR.status === "fulfilled" ? statsR.value.data : null;
        setData(prev => ({
          ...prev,
          stats: statsData,
          synopsis: synR.status === "fulfilled" ? synR.value.data : null,
          nearby: nearR.status === "fulfilled" ? (nearR.value.data.items || []) : [],
          listings: listR.status === "fulfilled" ? (listR.value.data.listings || []) : [],
          listingsTotal: listR.status === "fulfilled" ? (listR.value.data.total || 0) : 0,
        }));
        setLoading(false);
        // Secondary (slower) data — stream in without blocking the page.
        axios.get(`${API}/api/community/${slug}/neighbourhoods`)
          .then(r => { if (!cancelled) setData(prev => ({ ...prev, neighbourhoods: r.data.neighbourhoods || [], referralOnly: !!r.data.referral_only })); })
          .catch(() => {});
        axios.get(`${API}/api/community/${slug}/weather`)
          .then(r => { if (!cancelled) setData(prev => ({ ...prev, weather: r.data })); })
          .catch(() => {});
        // Refine listings if the canonical community name differs from the guess.
        const canonical = statsData?.community;
        if (canonical && canonical.toLowerCase() !== cityGuess.toLowerCase()) {
          axios.get(`${API}/api/listings`, { params: { city: canonical, limit: 4 } })
            .then(r => { if (!cancelled) setData(prev => ({ ...prev, listings: r.data.listings || prev.listings, listingsTotal: r.data.total || prev.listingsTotal })); })
            .catch(() => {});
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load community data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const stats = data.stats;
  const community = stats?.community || slug.replace(/-/g," ").replace(/\b\w/g, s => s.toUpperCase());
  const region = data.synopsis?.region || data.nearby?.[0]?.region || "British Columbia";
  const isFocus = FOCUS_COMMUNITIES.has(slug) || FOCUS_HOODS.has(slug) || FOCUS_REGIONS.has(region);

  const median = stats?.median_price ? fmtMoney(stats.median_price) : "—";
  const active = stats?.count ?? 0;
  const priceRange = stats ? `${fmtMoney(stats.min_price)} – ${fmtMoney(stats.max_price)}` : "—";

  // Sub-neighbourhoods: prefer live CityRegion aggregation. If the board
  // didn't populate CityRegion (Fraser Valley / Greater Vancouver), fall back
  // to the curated hand-tuned list keyed by community slug — clicking a chip
  // routes into /listings?q={keyword}&city={community} for a real result set.
  //
  // Non-farm cities (Kelowna, Victoria, Kamloops, etc.) return referral_only
  // from the API; we honour that here by tagging every one of their sub-nhb
  // chips as "referral" so the rendering layer can swap style + copy.
  const hoods = useMemo(() => {
    if (data.neighbourhoods.length) return data.neighbourhoods.map(n => {
      // Backend `source` field:
      //   "listings"  → live MLS aggregate; has count + median
      //   "curated"   → farm curated (0-count okay)
      //   "provincial"→ non-farm curated (referral-only)
      const source = n.source || "live";
      const isProvincial = source === "provincial" || data.referralOnly;
      return {
        slug: n.slug,
        name: n.name,
        count: n.count,
        median_price: n.median_price,
        kind: source === "listings" ? "live" : (isProvincial ? "referral" : "curated"),
        href: `/community/${slug}/n/${n.slug}`,
      };
    });
    const curated = CURATED_HOODS[slug];
    if (!curated) return [];
    return curated.map(c => ({
      slug: c.q.toLowerCase().replace(/\s+/g, "-"),
      name: c.name, kind: "curated",
      href: `/listings?city=${encodeURIComponent(community)}&q=${encodeURIComponent(c.q)}`,
    }));
  }, [data.neighbourhoods, data.referralOnly, slug, community]);

  // Map bbox derived from listing lat/lon range for a properly-zoomed embed.
  const mapEmbed = useMemo(() => {
    const pts = (data.listings || []).map(l => [l.lat, l.lon]).filter(([a,b]) => a && b);
    if (pts.length === 0) {
      // Fallback: OSM community-marker embed for a static province-wide view.
      return `https://www.google.com/maps?q=${encodeURIComponent(community + ", BC, Canada")}&output=embed&z=12`;
    }
    // Compute bbox from lat/lon points, padded.
    const lats = pts.map(p => p[0]); const lons = pts.map(p => p[1]);
    const pad = 0.04;
    const minLat = Math.min(...lats) - pad, maxLat = Math.max(...lats) + pad;
    const minLon = Math.min(...lons) - pad, maxLon = Math.max(...lons) + pad;
    const centerLat = (minLat + maxLat) / 2, centerLon = (minLon + maxLon) / 2;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${centerLat}%2C${centerLon}`;
  }, [data.listings, community]);

  const weatherText = data.weather?.weather || null;
  const heroBackdrop = HERO_BACKDROP[slug] || REGION_HERO[region] || DEFAULT_HERO;

  // Auto-generated FAQ from live data.
  const faqs = useMemo(() => {
    const out = [];
    if (active) out.push({
      q: `How many active MLS® listings are there in ${community} right now?`,
      a: `${active.toLocaleString()} active listings across ${community} today (live CREA DDF® feed, refreshed daily). Prices range from ${fmtMoney(stats?.min_price)} to ${fmtMoney(stats?.max_price)}, with a median list price of ${median}.`,
    });
    if (hoods.length) {
      const top3 = hoods.slice(0, 3).map(h => h.name).join(", ");
      out.push({
        q: `What are the top sub-neighbourhoods in ${community}?`,
        a: `The three biggest by active inventory right now are ${top3}. Tap any chip in the Spatial Context section above to jump straight to the filtered listings.`,
      });
    }
    if (isFocus) {
      out.push({
        q: `Does Doug LeMaire cover ${community} directly?`,
        a: `Yes. Doug is a BCFSA-licensed REALTOR® with Fraser Property Management Realty Services Ltd., serving ${community} personally.`,
      });
    } else {
      out.push({
        q: `Can Doug help me buy or sell in ${community} even though it's outside his direct area?`,
        a: `Absolutely — through the vetted BC-wide referral network. Fill out the referral form and Doug personally reviews it, then makes an intro to a licensed local REALTOR® in ${community} within 24 hours. $0 cost to you. You approve each intro. BCFSA-licensed only.`,
      });
    }
    out.push({
      q: `Is the data on this page live?`,
      a: `Active count, prices, and photos are live from the CREA Data Distribution Facility (DDF®). Sub-neighbourhood breakdowns update daily. Climate normals are sourced from Environment and Climate Change Canada.`,
    });
    return out;
  }, [community, active, stats, median, hoods, isFocus]);

  const onSave = () => {
    try { localStorage.setItem(`ez_saved_community_${slug}`, "1"); } catch (_) { /* noop */ }
    setSaved(true);
  };

  // ── SEO / AEO / GEO metadata — differs by service-area status ────────────
  // The isFocus flag is the single source of truth for BCFSA-compliant framing:
  //   • isFocus=true  → Doug personally represents buyers & sellers here.
  //                     Meta + JSON-LD present him as the local REALTOR®.
  //   • isFocus=false → Doug does NOT list here; the page is informational
  //                     with a referral CTA. Meta + JSON-LD present him as
  //                     coordinator of a BC-wide licensed referral network,
  //                     and areaServed on the RealEstateAgent block stays
  //                     scoped to the three focus regions. This prevents
  //                     AEO/GEO citation authority drift and eliminates
  //                     any BCFSA misrepresentation risk.
  const canonical = `https://eztofind.ca/community/${slug}`;
  const pageTitle = isFocus
    ? `${community}, BC Real Estate · Doug LeMaire, REALTOR® · EZtoFind.ca`
    : `Living in ${community}, BC: Community Profile, Climate & MLS® Listings | EZtoFind.ca`;
  const pageDesc = isFocus
    ? `Live ${community}, BC listings, sub-neighbourhood breakdowns, climate, and market data. Doug LeMaire, REALTOR® with Fraser Property Management personally represents buyers and sellers in ${community}.`
    : `Explore ${community}, BC — community profile with live MLS® listings, Environment Canada climate data, and market snapshot. Free BC real estate information from EZtoFind.ca. ${community} is outside Doug LeMaire's direct service area — a BCFSA-licensed local REALTOR® in ${community} is available via the referral network at $0 cost to you.`;
  const ogImage = `https://eztofind.ca/images/doogie-og.png?v=4`;
  const faqLd = faqs && faqs.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "author":    { "@id": "https://eztofind.ca/#doug" },
    "publisher": { "@id": "https://eztofind.ca/#organization" },
    "mainEntity": faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a },
    })),
  } : null;
  const focusAreas = [
    { "@type": "AdministrativeArea", "name": "Greater Vancouver, British Columbia" },
    { "@type": "AdministrativeArea", "name": "Fraser Valley, British Columbia" },
    { "@type": "AdministrativeArea", "name": "Sea-to-Sky Corridor, British Columbia" },
  ];
  const agentLd = isFocus
    ? {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": "Doug LeMaire, REALTOR®",
        "url": "https://eztofind.ca/about",
        "telephone": "+1-604-787-0851",
        "email": "info@eztofind.ca",
        // Machine-readable BCFSA licence — critical AEO/LLM citation signal.
        "identifier": [{
          "@type": "PropertyValue",
          "propertyID": "BCFSA Licence Number",
          "value": "167790",
          "url": "https://www.bcfsa.ca/industry-resources/real-estate-professional-resources/registrant-search",
        }],
        "worksFor": { "@id": "https://eztofind.ca/#organization" },
        // In-area: emit direct areaServed for THIS community explicitly, alongside
        // the three focus regions. Signals to LLMs that Doug personally represents
        // buyers and sellers here.
        "areaServed": [
          ...focusAreas,
          { "@type": "City", "name": `${community}, British Columbia` },
        ],
        "memberOf": [
          { "@type": "Organization", "name": "Canadian Real Estate Association (CREA)" },
          { "@type": "Organization", "name": "Greater Vancouver REALTORS® (GVR)" },
          { "@type": "Organization", "name": "BC Financial Services Authority (BCFSA)" },
        ],
      }
    : {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": "Doug LeMaire, REALTOR®",
        "url": "https://eztofind.ca/about",
        "telephone": "+1-604-787-0851",
        "email": "info@eztofind.ca",
        "identifier": [{
          "@type": "PropertyValue",
          "propertyID": "BCFSA Licence Number",
          "value": "167790",
          "url": "https://www.bcfsa.ca/industry-resources/real-estate-professional-resources/registrant-search",
        }],
        "worksFor": { "@id": "https://eztofind.ca/#organization" },
        // Out-of-area: areaServed stays scoped to focus regions ONLY.
        "areaServed": focusAreas,
        "memberOf": [
          { "@type": "Organization", "name": "Canadian Real Estate Association (CREA)" },
          { "@type": "Organization", "name": "BC Financial Services Authority (BCFSA)" },
        ],
        // makesOffer — declares the coordinator service Doug DOES provide for
        // this community (a licensed referral, not direct representation).
        "makesOffer": {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": `Licensed REALTOR® referral for ${community}, BC`,
            "serviceType": "Real estate referral",
            "areaServed": { "@type": "City", "name": `${community}, British Columbia` },
            "provider": { "@id": "https://eztofind.ca/#doug" },
            "description": `Vetted introduction to a BCFSA-licensed local REALTOR® in ${community} within 24 hours. Zero cost to the consumer. Consumer approves each introduction.`,
          },
          "price": 0,
          "priceCurrency": "CAD",
          "eligibleRegion": { "@type": "AdministrativeArea", "name": "British Columbia, Canada" },
        },
      };
  const placeLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    "name": `${community}, British Columbia`,
    "containedInPlace": { "@type": "AdministrativeArea", "name": `${region}, British Columbia` },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",        "item": "https://eztofind.ca/" },
      { "@type": "ListItem", "position": 2, "name": "Communities", "item": "https://eztofind.ca/communities" },
      { "@type": "ListItem", "position": 3, "name": region,        "item": "https://eztofind.ca/communities" },
      { "@type": "ListItem", "position": 4, "name": community,     "item": canonical },
    ],
  };

  return (
    <div style={{background:"#FBFBFD",minHeight:"100vh"}} data-testid="community-page-mockup-live">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc}/>
        <link rel="canonical" href={canonical}/>
        <meta property="og:type" content="website"/>
        <meta property="og:url" content={canonical}/>
        <meta property="og:title" content={pageTitle}/>
        <meta property="og:description" content={pageDesc}/>
        <meta property="og:image" content={ogImage}/>
        <meta property="og:site_name" content="EZtoFind.ca"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content={pageTitle}/>
        <meta name="twitter:description" content={pageDesc}/>
        <meta name="twitter:image" content={ogImage}/>
        {/* Machine-readable service-area status — lets any downstream
            crawler tell in-area from referral pages without parsing prose. */}
        <meta name="ez:community-status" content={isFocus ? "in-area-direct" : "out-of-area-referral"}/>
        <script type="application/ld+json">{JSON.stringify(placeLd)}</script>
        <script type="application/ld+json">{JSON.stringify(agentLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
        {faqLd && <script type="application/ld+json">{JSON.stringify(faqLd)}</script>}
      </Helmet>
      {!live && <UnlistedMockupBanner label={`LIVE community page · ${community}`}/>}

      {/* Community picker removed per user request */}

      {loading && (
        <div data-testid="community-skeleton" style={{maxWidth:"1100px",margin:"0 auto",padding:"28px 20px",fontFamily:"Inter,sans-serif"}}>
          <div style={{height:14,width:260,background:"#ECE7D8",borderRadius:6,marginBottom:18}} className="ez-sk"/>
          <div style={{height:44,width:"60%",maxWidth:460,background:"#ECE7D8",borderRadius:10,marginBottom:14}} className="ez-sk"/>
          <div style={{height:16,width:"80%",background:"#F0EBDC",borderRadius:6,marginBottom:8}} className="ez-sk"/>
          <div style={{height:16,width:"70%",background:"#F0EBDC",borderRadius:6,marginBottom:28}} className="ez-sk"/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:28}}>
            {Array.from({length:4}).map((_,i)=>(<div key={i} style={{height:92,background:"#F0EBDC",borderRadius:14}} className="ez-sk"/>))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
            {Array.from({length:4}).map((_,i)=>(
              <div key={i} style={{borderRadius:16,overflow:"hidden",border:"1px solid rgba(15,42,91,0.08)"}}>
                <div style={{height:150,background:"#ECE7D8"}} className="ez-sk"/>
                <div style={{padding:14}}>
                  <div style={{height:18,width:"50%",background:"#F0EBDC",borderRadius:6}} className="ez-sk"/>
                  <div style={{height:12,width:"80%",background:"#F2EEE1",borderRadius:6,marginTop:10}} className="ez-sk"/>
                </div>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:26,color:BRAND.muted,fontSize:"0.9rem"}}>Loading live data for <strong style={{color:BRAND.navy}}>{community}</strong>…</div>
          <style>{`.ez-sk{position:relative;overflow:hidden}.ez-sk::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent);animation:ez-shimmer 1.3s infinite}@keyframes ez-shimmer{100%{transform:translateX(100%)}}`}</style>
        </div>
      )}

      {!loading && error && (
        <div style={{padding:"40px 20px",textAlign:"center",fontFamily:"Inter,sans-serif",color:"#B91C1C"}}>
          Could not load <strong>{slug}</strong> — {error}
        </div>
      )}

      {!loading && !error && (
      <GlossaryPageProvider>
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"28px 20px",fontFamily:"Inter,sans-serif"}}>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <div style={{fontSize:"0.85rem",color:BRAND.muted,marginBottom:12}}>
          <Link to="/" style={{color:BRAND.navy,textDecoration:"none"}}>Home</Link> / <Link to="/communities" style={{color:BRAND.navy,textDecoration:"none"}}>Communities</Link> / {region} / <strong style={{color:BRAND.ink}}>{community}</strong>
        </div>

        <div style={{
          borderRadius:22,overflow:"hidden",position:"relative",
          background:`linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.26) 45%, rgba(0,0,0,0.10) 100%), url(${heroBackdrop}) center/cover`,
          color:"#fff",padding:"40px 34px",minHeight:300,display:"flex",flexDirection:"column",justifyContent:"flex-end",
        }}>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:600,opacity:0.92}}>{region}</div>
          <h1 style={{fontSize:"clamp(2.1rem,5vw,3.4rem)",fontFamily:SF,fontWeight:700,letterSpacing:"-0.03em",margin:"6px 0 14px",lineHeight:1.05}}>{community}, BC</h1>

          {isFocus ? (
            <div style={{marginBottom:20,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <img src="/doug-headshot-2026.jpg" alt="Doug LeMaire" loading="lazy" decoding="async" style={{width:46,height:46,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.7)",objectFit:"cover"}}/>
              <div style={{fontSize:"0.9rem",lineHeight:1.4}}>
                <div style={{fontWeight:600}}>Doug LeMaire, REALTOR® · covers {community} directly</div>
                <div style={{opacity:0.82,fontSize:"0.8rem"}}>BCFSA Licence #167790 · Fraser Property Management Realty Services Ltd.</div>
              </div>
            </div>
          ) : (
            <div style={{marginBottom:20,background:"rgba(255,255,255,0.14)",padding:"14px 18px",borderRadius:16,backdropFilter:"blur(14px) saturate(180%)",display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",border:"1px solid rgba(255,255,255,0.18)"}}>
              <img src="/doogie/head.webp" alt="Doogie · Doug's real-estate concierge" loading="lazy" decoding="async" onError={e => e.currentTarget.style.display="none"} style={{width:56,height:56,flexShrink:0,objectFit:"contain"}}/>
              <div style={{fontSize:"0.9rem",lineHeight:1.55,flex:"1 1 320px"}}>
                This is outside of Doug's region, however an introduction to a licensed REALTOR® is available.{" "}
                <Link to={`/referral-request?city=${encodeURIComponent(community)}`} onClick={() => trackReferralClick("hero")} data-testid="hero-referral-link" style={{color:"#fff",fontWeight:600,textDecoration:"underline",whiteSpace:"nowrap"}}>Request an introduction →</Link>
              </div>
            </div>
          )}

          {/* Live inventory strip */}
          <div style={{display:"flex",gap:18,flexWrap:"wrap",marginBottom:22,background:"rgba(255,255,255,0.12)",padding:"16px 20px",borderRadius:18,backdropFilter:"blur(14px) saturate(180%)",border:"1px solid rgba(255,255,255,0.16)"}}>
            <div style={{flex:"1 1 110px"}}><div style={{fontSize:"0.62rem",letterSpacing:"0.08em",opacity:0.85,fontWeight:600}}>ACTIVE LISTINGS</div><div style={{fontSize:"1.6rem",fontFamily:SF,fontWeight:700,letterSpacing:"-0.03em",marginTop:3}}>{active.toLocaleString()}</div></div>
            <div style={{flex:"1 1 110px"}}><div style={{fontSize:"0.62rem",letterSpacing:"0.08em",opacity:0.85,fontWeight:600}}>MEDIAN LIST</div><div style={{fontSize:"1.6rem",fontFamily:SF,fontWeight:700,letterSpacing:"-0.03em",marginTop:3}}>{median}</div></div>
            <div style={{flex:"1 1 130px"}}><div style={{fontSize:"0.62rem",letterSpacing:"0.08em",opacity:0.85,fontWeight:600}}>PRICE RANGE</div><div style={{fontSize:"1.6rem",fontFamily:SF,fontWeight:700,letterSpacing:"-0.03em",marginTop:3}}>{priceRange}</div></div>
            <div style={{flex:"1 1 140px"}}><div style={{fontSize:"0.62rem",letterSpacing:"0.08em",opacity:0.85,fontWeight:600}}>DATA SOURCE</div><div style={{fontSize:"0.95rem",fontFamily:SF,fontWeight:600,marginTop:7,display:"inline-flex",alignItems:"center",gap:6}}><CheckCircle2 size={16} strokeWidth={2.2}/> CREA DDF® live</div></div>
          </div>

          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Link to={`/listings?city=${encodeURIComponent(community)}`} data-testid="hero-view-listings" style={{background:"#fff",color:BRAND.navy,border:"none",padding:"13px 24px",borderRadius:999,fontWeight:600,fontSize:"0.95rem",cursor:"pointer",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:7}}>View {active.toLocaleString()} listings <ArrowUpRight size={17} strokeWidth={2.2}/></Link>
          </div>
        </div>

        {/* Phase 7 answer-first upgrade — TL;DR at top of the body so
            LLM overviews grab a clean, ≤65-word answer to "What is buying
            in {community} like?" as the direct AI answer. */}
        <TLDRBlock
          text={`${community} is a ${region} community with ${active.toLocaleString()} active MLS® listings today (median ${median}). Buyers typically budget for Property Transfer Tax, GST on new builds, and a 2-5-10 Home Warranty; strata purchasers also review a current Form B.${isFocus ? " Doug LeMaire, REALTOR® covers " + community + " directly." : ""}`}
          testId="community-tldr"
        />

        {/* Task 7 (Feb 2026): visible "Last reviewed" stamp — pairs with
            the JSON-LD dateModified emitted by the SEO block below. When
            the synopsis endpoint hasn't returned a timestamp yet we
            fall back to today so crawlers always see a valid <time>. */}
        {(() => {
          const _dm = (data.synopsis && (data.synopsis.last_reviewed_at || data.synopsis.updated_at || data.synopsis.reviewed_at))
            ? String(data.synopsis.last_reviewed_at || data.synopsis.updated_at || data.synopsis.reviewed_at).slice(0, 10)
            : new Date().toISOString().slice(0, 10);
          let humanDm = _dm;
          try { humanDm = new Date(_dm).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }); } catch (_) {}
          return (
            <div data-testid="community-last-reviewed" style={{marginTop:12,fontSize:"0.78rem",color:BRAND.muted,fontStyle:"italic"}}>
              Last reviewed: <time dateTime={_dm} itemProp="dateModified">{humanDm}</time>
            </div>
          );
        })()}

        {/* Term-linked intro paragraph — first-mention glossary chips (Feb 2026) */}
        <div data-testid="community-glossary-intro" style={{marginTop:24,padding:"18px 22px",background:"white",border:"1px solid #E5E7EB",borderRadius:12,fontSize:"0.94rem",lineHeight:1.7,color:BRAND.ink}}>
          <GlossaryProse text={`Buying in ${community} typically involves Property Transfer Tax at closing, a possible First Time Home Buyers' Program exemption for qualifying first-timers, GST New Housing Rebate math on new construction, and — for any strata unit — reviewing a current Form B — Strata Information Certificate before Subject Removal. New builds carry the mandatory 2-5-10 Home Warranty. Rural or acreage parcels around ${community} may sit within the Agricultural Land Reserve, which restricts subdivision and non-farm use. Your monthly payment depends on your Amortization Period and the OSFI B-20 stress test.`}/>
        </div>

        {/* ── § SPATIAL ─────────────────────────────────────────────── */}
        <SectionH kicker="Spatial context">Where is {community} · sub-neighbourhoods</SectionH>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div style={{background:"#DCE7F5",borderRadius:12,minHeight:320,position:"relative",overflow:"hidden"}}>
            <iframe title={`Map of ${community}`} width="100%" height="100%" style={{border:0,minHeight:320}} loading="lazy" src={mapEmbed}/>
          </div>
          <div>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:BRAND.navy,marginBottom:10}}>
              {data.referralOnly ? "Sub-neighbourhoods" : "Sub-neighbourhoods"} in {community} ({hoods.length})
              {data.referralOnly && <span style={{fontSize:"0.7rem",fontWeight:600,color:BRAND.brass,marginLeft:6,padding:"2px 6px",borderRadius:4,background:"rgba(198,163,89,0.15)"}}>Referral network</span>}
              {!data.referralOnly && hoods.some(h => h.kind === "curated") && <span style={{fontSize:"0.7rem",fontWeight:500,color:BRAND.muted,marginLeft:6}}>· curated + live</span>}
            </div>
            {hoods.length === 0 ? (
              <div style={{fontSize:"0.85rem",color:BRAND.muted,fontStyle:"italic"}}>No sub-neighbourhoods indexed yet for this community. Use the "View all listings" button above.</div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:340,overflowY:"auto"}}>
                {hoods.map(n => (
                  <Link
                    key={n.slug}
                    to={n.href}
                    data-testid={`neighbourhood-${n.slug}`}
                    style={{
                      padding:"9px 12px",
                      background: n.kind === "referral" ? "rgba(198,163,89,0.06)" : "white",
                      border: n.kind === "referral" ? "1px solid rgba(198,163,89,0.30)" : "1px solid #E5E7EB",
                      borderRadius:8,
                      fontSize:"0.82rem",color:BRAND.ink,fontWeight:600,textDecoration:"none",
                      display:"block",transition:"all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = BRAND.navy; e.currentTarget.style.background = BRAND.cream; }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = n.kind === "referral" ? "rgba(198,163,89,0.30)" : "#E5E7EB";
                      e.currentTarget.style.background = n.kind === "referral" ? "rgba(198,163,89,0.06)" : "white";
                    }}
                  >
                    <span style={{display:"inline-flex",alignItems:"center",gap:6}}>{n.kind === "referral" ? <Users size={14} strokeWidth={1.8}/> : <MapPin size={14} strokeWidth={1.8}/>} {n.name} <ArrowRight size={13} strokeWidth={2} style={{color:BRAND.muted}}/></span>
                    {n.kind === "live" && n.count > 0 && (
                      <div style={{fontSize:"0.7rem",color:BRAND.muted,fontWeight:400,marginTop:1}}>{n.count} listings · median {fmtMoney(n.median_price)}</div>
                    )}
                    {n.kind === "referral" && (
                      <div style={{fontSize:"0.7rem",color:BRAND.brass,fontWeight:500,marginTop:1}}>Referral REALTOR® network</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── § LIVE LISTINGS ───────────────────────────────────────── */}
        <SectionH kicker="Live inventory">{data.listings.length} live MLS® listing{data.listings.length === 1 ? "" : "s"} in {community}</SectionH>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",gap:14}}>
          {data.listings.map(l => {
            const photo = (l.photos && l.photos[0]) || l.primary_photo || null;
            const sqft = l.living_area || l.living_area_sqft || 0;
            return (
              <Link key={l.listing_key} to={`/listing/${l.listing_key}`} style={{textDecoration:"none"}} data-testid={`listing-${l.listing_key}`}>
                <div style={{background:"white",border:"1px solid #E5E7EB",borderRadius:12,overflow:"hidden",transition:"transform 0.15s"}}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderColor=BRAND.gold; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="#E5E7EB"; }}>
                  <div style={{
                    height:140,position:"relative",
                    backgroundImage: photo ? `url(${photo})` : "linear-gradient(135deg,#DBE3F0,#F5F0E1)",
                    backgroundSize:"cover", backgroundPosition:"center",
                    backgroundColor: "#DBE3F0",
                  }}>
                    {l.has_virtual_tour && (
                      <div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",color:"white",padding:"4px 9px",borderRadius:999,fontSize:"0.65rem",fontWeight:600,letterSpacing:"0.02em",display:"inline-flex",alignItems:"center",gap:4}}><Video size={12} strokeWidth={2}/> Tour</div>
                    )}
                  </div>
                  <div style={{padding:"12px 14px"}}>
                    <div style={{fontSize:"1.1rem",fontFamily:SF,fontWeight:700,letterSpacing:"-0.02em",color:BRAND.navy}}>{fmtMoney(l.list_price)}</div>
                    <div style={{fontSize:"0.82rem",color:BRAND.ink,marginTop:2}}>{l.beds||"—"}bd · {l.baths||"—"}ba{sqft ? ` · ${sqft.toLocaleString()} sqft` : ""}</div>
                    <div style={{fontSize:"0.78rem",color:BRAND.muted,marginTop:4}}>{l.street_address || l.unparsed_address || l.city}</div>
                    <div style={{marginTop:6}}><Chip>{l.property_type || "Home"}</Chip></div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <div style={{marginTop:14,textAlign:"center"}}>
          <Link to={`/listings?city=${encodeURIComponent(community)}`} data-testid="section-view-all" style={{background:BRAND.navy,color:"white",border:"none",padding:"11px 22px",borderRadius:999,fontWeight:600,fontSize:"0.9rem",textDecoration:"none",display:"inline-block"}}>View all {active.toLocaleString()} {community} listings →</Link>
          <div style={{marginTop:10}}>
            <Link to={`/homes-for-sale/${slug}`} data-testid="community-homes-for-sale-link" style={{color:BRAND.navy,fontWeight:600,fontSize:"0.88rem",textDecoration:"underline"}}>Homes for sale in {community}, BC — market snapshot & FAQ →</Link>
          </div>
        </div>

        {/* ── § ABOUT ───────────────────────────────────────────────── */}
        <SectionH kicker="About">About {community}, BC</SectionH>
        {data.synopsis?.synopsis ? (
          <div style={{fontSize:"0.98rem",lineHeight:1.75,color:BRAND.ink,maxWidth:800,whiteSpace:"pre-wrap"}}>
            {data.synopsis.synopsis}
          </div>
        ) : (
          <div style={{fontSize:"0.9rem",color:BRAND.muted,fontStyle:"italic"}}>Synopsis not yet available for this community.</div>
        )}

        {/* ── § WEATHER ─────────────────────────────────────────────── */}
        <SectionH kicker="Climate">Weather &amp; climate in {community}</SectionH>
        {weatherText ? (
          <div style={{background:"white",border:"1px solid #E5E7EB",borderRadius:12,padding:"20px 22px",fontSize:"0.94rem",lineHeight:1.7,color:BRAND.ink,whiteSpace:"pre-wrap",maxWidth:800}}>
            {weatherText}
            {data.weather?.sources?.[0] && (
              <div style={{marginTop:14,fontSize:"0.72rem",color:BRAND.muted}}>
                Source: <a href={data.weather.sources[0].url} target="_blank" rel="noopener noreferrer" style={{color:BRAND.navy,textDecoration:"underline"}}>{data.weather.sources[0].publisher}</a>
              </div>
            )}
          </div>
        ) : (
          <div style={{fontSize:"0.85rem",color:BRAND.muted}}>Climate summary not available for this community.</div>
        )}

        {/* ── § BC LAND-USE LAYERS + DEMOGRAPHICS (Feb 2026) ────────── */}
        <CommunityLayersInline slug={slug}/>
        <CommunityDemographicsInline slug={slug}/>

        {/* ── § FAQ ─────────────────────────────────────────────────── */}
        <SectionH kicker="FAQ">Frequently asked about {community}</SectionH>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:820}}>
          {faqs.map((f, i) => (
            <details key={i} style={{background:"white",border:"1px solid rgba(0,0,0,0.08)",borderRadius:14,padding:"16px 20px"}} data-testid={`faq-${i}`}>
              <summary style={{fontSize:"0.95rem",fontWeight:600,color:BRAND.ink,cursor:"pointer",fontFamily:SF,letterSpacing:"-0.01em"}}>{f.q}</summary>
              <div style={{marginTop:10,fontSize:"0.9rem",lineHeight:1.65,color:BRAND.muted}}>{f.a}</div>
            </details>
          ))}
        </div>

        {/* ── § GET CONNECTED ───────────────────────────────────────── */}
        {!isFocus && (
          <>
            <SectionH kicker="Get connected">Looking to buy or sell in {community}?</SectionH>
            <div style={{background:"#F5F5F7",border:"1px solid rgba(0,0,0,0.08)",padding:"24px 26px",borderRadius:22,display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
              <img src="/doogie/head.webp" alt="Doogie · Doug's real-estate concierge" loading="lazy" decoding="async" data-testid="get-connected-doogie" onError={e => e.currentTarget.style.display="none"} style={{width:96,height:96,flexShrink:0,objectFit:"contain",filter:"drop-shadow(0 4px 10px rgba(15,42,91,0.18))"}}/>
              <div style={{flex:"1 1 320px"}}>
                <div style={{fontSize:"1rem",color:BRAND.ink,lineHeight:1.65,marginBottom:16}}>
                  This is outside of Doug's region, however an introduction to a licensed REALTOR® is available.
                </div>
                <Link to={`/referral-request?city=${encodeURIComponent(community)}`} onClick={() => trackReferralClick("section7")} data-testid="bottom-referral-link" style={{display:"inline-flex",alignItems:"center",gap:7,background:BRAND.navy,color:"white",padding:"12px 24px",borderRadius:999,fontWeight:600,fontSize:"0.95rem",textDecoration:"none"}}>Request an introduction <ArrowRight size={16} strokeWidth={2.2}/></Link>
              </div>
            </div>
          </>
        )}
        {isFocus && (
          <>
            <SectionH kicker="Take the next step">Ready to explore {community}?</SectionH>
            <div style={{background:BRAND.navy,color:"white",padding:"28px 30px",borderRadius:22}}>
              <div style={{fontSize:"1.2rem",fontFamily:SF,fontWeight:600,letterSpacing:"-0.02em",lineHeight:1.3}}>Doug represents buyers &amp; sellers in {community} directly.</div>
              <div style={{marginTop:18,display:"flex",gap:10,flexWrap:"wrap"}}>
                <Link to={`/buyer-consultation?city=${encodeURIComponent(community)}`} data-testid="focus-buying" style={{background:"white",color:BRAND.navy,border:"none",padding:"12px 22px",borderRadius:999,fontWeight:600,fontSize:"0.92rem",textDecoration:"none"}}>I'm Buying in {community}</Link>
                <Link to={`/seller-consultation?city=${encodeURIComponent(community)}`} data-testid="focus-selling" style={{background:"rgba(255,255,255,0.14)",color:"white",border:"1px solid rgba(255,255,255,0.25)",padding:"12px 22px",borderRadius:999,fontWeight:600,fontSize:"0.92rem",textDecoration:"none",backdropFilter:"blur(8px)"}}>I'm Selling in {community}</Link>
              </div>
            </div>
          </>
        )}

        {/* ── § NEARBY ──────────────────────────────────────────────── */}
        <SectionH kicker="Nearby">Other {region} communities</SectionH>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {data.nearby.slice(0, 8).map(n => (
            <button key={n.slug} data-testid={`nearby-${n.slug}`} onClick={() => gotoCommunity(n.slug)} style={{padding:"8px 14px",background:"white",border:"1px solid #E5E7EB",borderRadius:999,color:BRAND.navy,fontSize:"0.85rem",fontWeight:600,cursor:"pointer"}}>{n.name} →</button>
          ))}
          {data.nearby.length === 0 && <span style={{fontSize:"0.85rem",color:BRAND.muted,fontStyle:"italic"}}>No nearby communities returned.</span>}
        </div>

        {/* Compliance footer */}
        <div style={{marginTop:40,padding:"18px 20px",background:BRAND.paper,borderRadius:10,fontSize:"0.72rem",color:BRAND.muted,lineHeight:1.6}}>
          © 2026 EZtoFind.ca · Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. · MLS® data © CREA DDF® · Climate © Environment and Climate Change Canada · Population © Statistics Canada. General information only — not real-estate, legal, tax, or financial advice.
        </div>

        {/* Phase 7 answer-first — mandatory compliance strip (BCFSA · CREA
            · CASL · PIPA · GVR®). Duplicated on every AEO-critical page. */}
        <ComplianceStrip testId="community-compliance-strip"/>
      </div>
      </GlossaryPageProvider>
      )}
    </div>
  );
}
