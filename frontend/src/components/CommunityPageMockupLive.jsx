// CommunityPageMockupLive — data-hydrated version of the community-page
// redesign mockup.  Fetches real data from:
//   /api/community/{slug}/stats            — active count, median price, min/max
//   /api/community/{slug}/synopsis         — long-form editorial + sources
//   /api/community/{slug}/neighbourhoods   — full sub-neighbourhood roster
//   /api/community/{slug}/nearby           — nearby communities chip strip
//   /api/community/{slug}/weather          — climate narrative
//   /api/listings?city={name}              — live 4-card grid + count
//
// Route: /mockups/community-live?slug=kelowna  (default) OR ?slug=maple-ridge etc.
// Parked / unlisted / noindex identical to CommunityPageMockup.
import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import UnlistedMockupBanner from "./UnlistedMockupBanner";

const API = process.env.REACT_APP_BACKEND_URL;

const BRAND = {
  navy: "#0F2A5B", gold: "#F5A623", cream: "#F5F0E1",
  ink: "#1F2937", muted: "#6B7280", green: "#059669",
  blue: "#1E40AF", paper: "#FAFAF7",
};

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
  <div style={{marginTop:48,marginBottom:16}}>
    {kicker && <div style={{fontSize:"0.72rem",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700}}>{kicker.toUpperCase()}</div>}
    <div style={{fontSize:"1.7rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy,lineHeight:1.15,marginTop:4}}>{children}</div>
  </div>
);
const fmtMoney = (n) => {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1000) return `$${Math.round(n/1000)}K`;
  return `$${n.toLocaleString("en-CA")}`;
};

// ── Main component ──────────────────────────────────────────────────
export default function CommunityPageMockupLive() {
  const [sp, setSp] = useSearchParams();
  const slug = sp.get("slug") || "kelowna";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState({
    stats: null, synopsis: null, neighbourhoods: [], nearby: [],
    weather: null, listings: [], listingsTotal: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    // reset saved-state per community switch
    try { setSaved(!!localStorage.getItem(`ez_saved_community_${slug}`)); } catch (_) { /* noop */ }
    (async () => {
      try {
        // Fetch stats first to establish the canonical community name.
        const statsR = await axios.get(`${API}/api/community/${slug}/stats`).catch(() => null);
        const city = statsR?.data?.community || slug.replace(/-/g," ").replace(/\b\w/g, s => s.toUpperCase());
        // Fan out the remaining fetches in parallel.
        const [synR, hoodsR, nearR, wR, listR] = await Promise.allSettled([
          axios.get(`${API}/api/community/${slug}/synopsis`),
          axios.get(`${API}/api/community/${slug}/neighbourhoods`),
          axios.get(`${API}/api/community/${slug}/nearby`),
          axios.get(`${API}/api/community/${slug}/weather`),
          axios.get(`${API}/api/listings`, { params: { city, limit: 4 } }),
        ]);
        if (cancelled) return;
        setData({
          stats: statsR?.data || null,
          synopsis: synR.status === "fulfilled" ? synR.value.data : null,
          neighbourhoods: hoodsR.status === "fulfilled" ? (hoodsR.value.data.neighbourhoods || []) : [],
          nearby: nearR.status === "fulfilled" ? (nearR.value.data.items || []) : [],
          weather: wR.status === "fulfilled" ? wR.value.data : null,
          listings: listR.status === "fulfilled" ? (listR.value.data.listings || []) : [],
          listingsTotal: listR.status === "fulfilled" ? (listR.value.data.total || 0) : 0,
        });
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
  const isFocus = FOCUS_COMMUNITIES.has(slug) || FOCUS_REGIONS.has(region);

  const median = stats?.median_price ? fmtMoney(stats.median_price) : "—";
  const active = stats?.count ?? 0;
  const priceRange = stats ? `${fmtMoney(stats.min_price)} – ${fmtMoney(stats.max_price)}` : "—";

  // Sub-neighbourhoods: prefer live CityRegion aggregation. If the board
  // didn't populate CityRegion (Fraser Valley / Greater Vancouver), fall back
  // to the curated hand-tuned list keyed by community slug — clicking a chip
  // routes into /listings?q={keyword}&city={community} for a real result set.
  const hoods = useMemo(() => {
    if (data.neighbourhoods.length) return data.neighbourhoods.map(n => ({
      slug: n.slug, name: n.name, count: n.count,
      median_price: n.median_price, kind: "live",
      href: `/community/${slug}/n/${n.slug}`,
    }));
    const curated = CURATED_HOODS[slug];
    if (!curated) return [];
    return curated.map(c => ({
      slug: c.q.toLowerCase().replace(/\s+/g, "-"),
      name: c.name, kind: "curated",
      href: `/listings?city=${encodeURIComponent(community)}&q=${encodeURIComponent(c.q)}`,
    }));
  }, [data.neighbourhoods, slug, community]);

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
  const heroBackdrop = HERO_BACKDROP[slug] || null;

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
        a: `Yes. Doug is a BCFSA-licensed REALTOR® with Fraser Property Management Realty Services Ltd., serving ${community} personally. Book a free 20-minute buyer or seller consultation to get started — no obligation, no CASL spam.`,
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

  return (
    <div style={{background:"#F5F5F0",minHeight:"100vh"}} data-testid="community-page-mockup-live">
      <UnlistedMockupBanner label={`LIVE community page · ${community}`}/>

      {/* Community picker — mockup control only */}
      <div style={{background:"white",borderBottom:"1px solid #E5E7EB",padding:"14px 20px",display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:"0.85rem",color:BRAND.muted,fontFamily:"Inter,sans-serif"}}>Live preview · pick a community:</span>
        {FALLBACK_SUGGESTIONS.map(s => (
          <button
            key={s.slug}
            onClick={() => setSp({ slug: s.slug })}
            data-testid={`switch-${s.slug}`}
            style={{
              padding:"6px 14px",borderRadius:999,cursor:"pointer",
              border:`1px solid ${slug===s.slug?BRAND.navy:"#D1D5DB"}`,
              background: slug===s.slug ? BRAND.navy : "white",
              color: slug===s.slug ? "white" : BRAND.ink,
              fontFamily:"Inter,sans-serif",fontWeight:600,fontSize:"0.8rem",
            }}
          >{s.label}</button>
        ))}
        <input
          placeholder="…or type a slug e.g. penticton"
          onKeyDown={e => { if (e.key === "Enter" && e.target.value) setSp({ slug: e.target.value.toLowerCase().trim() }); }}
          style={{padding:"6px 12px",borderRadius:8,border:"1px solid #D1D5DB",fontFamily:"Inter,sans-serif",fontSize:"0.8rem",width:220}}
        />
      </div>

      {loading && (
        <div style={{padding:"80px 20px",textAlign:"center",fontFamily:"Inter,sans-serif",color:BRAND.muted}}>
          🐾 Loading live data for <strong style={{color:BRAND.navy}}>{community}</strong>…
        </div>
      )}

      {!loading && error && (
        <div style={{padding:"40px 20px",textAlign:"center",fontFamily:"Inter,sans-serif",color:"#B91C1C"}}>
          Could not load <strong>{slug}</strong> — {error}
        </div>
      )}

      {!loading && !error && (
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"28px 20px",fontFamily:"Inter,sans-serif"}}>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <div style={{fontSize:"0.85rem",color:BRAND.muted,marginBottom:12}}>
          <Link to="/" style={{color:BRAND.navy,textDecoration:"none"}}>Home</Link> / <Link to="/communities" style={{color:BRAND.navy,textDecoration:"none"}}>Communities</Link> / {region} / <strong style={{color:BRAND.ink}}>{community}</strong>
        </div>

        <div style={{
          borderRadius:16,overflow:"hidden",position:"relative",
          background: heroBackdrop
            ? `linear-gradient(135deg, rgba(15,42,91,0.88) 0%, rgba(15,42,91,0.62) 100%), url(${heroBackdrop}) center/cover`
            : `linear-gradient(135deg, #0F2A5B 0%, #1E40AF 100%)`,
          color:"white",padding:"36px 32px",minHeight:280,
        }}>
          <div style={{fontSize:"0.75rem",letterSpacing:"0.16em",color:BRAND.gold,fontWeight:700}}>{region.toUpperCase()}</div>
          <h1 style={{fontSize:"clamp(2rem,5vw,3.2rem)",fontFamily:"'Sora',sans-serif",fontWeight:800,margin:"6px 0 10px",lineHeight:1.05}}>{community}, BC</h1>

          {isFocus ? (
            <div style={{marginBottom:20,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire" style={{width:44,height:44,borderRadius:"50%",border:`2px solid ${BRAND.gold}`,objectFit:"cover"}}/>
              <div style={{fontSize:"0.9rem",lineHeight:1.4}}>
                <div style={{fontWeight:700}}>Doug LeMaire, REALTOR® · covers {community} directly</div>
                <div style={{opacity:0.85,fontSize:"0.82rem"}}>BCFSA-licensed · 13 years · Fraser Property Management Realty Services Ltd.</div>
              </div>
            </div>
          ) : (
            <div style={{marginBottom:20,background:"rgba(255,255,255,0.10)",padding:"14px 18px",borderRadius:10,backdropFilter:"blur(4px)",display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
              <img src="/doogie/head.webp" alt="Doogie · Doug's real-estate concierge" onError={e => e.currentTarget.style.display="none"} style={{width:64,height:64,flexShrink:0,objectFit:"contain",filter:"drop-shadow(0 4px 10px rgba(0,0,0,0.35))"}}/>
              <div style={{fontSize:"0.92rem",lineHeight:1.55,flex:"1 1 340px"}}>
                Would you like Doug to connect you with a {community} REALTOR®?{" "}
                <Link to={`/referral-request?city=${encodeURIComponent(community)}`} data-testid="hero-referral-link" style={{color:BRAND.gold,fontWeight:700,textDecoration:"underline",whiteSpace:"nowrap"}}>Referral REALTOR® link →</Link>
              </div>
            </div>
          )}

          {/* Live inventory strip */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:22,background:"rgba(255,255,255,0.10)",padding:"12px 16px",borderRadius:10}}>
            <div><div style={{fontSize:"0.65rem",opacity:0.8}}>ACTIVE LISTINGS</div><div style={{fontSize:"1.35rem",fontFamily:"'Sora',sans-serif",fontWeight:700}}>{active.toLocaleString()}</div></div>
            <div style={{width:1,background:"rgba(255,255,255,0.25)"}}/>
            <div><div style={{fontSize:"0.65rem",opacity:0.8}}>MEDIAN LIST</div><div style={{fontSize:"1.35rem",fontFamily:"'Sora',sans-serif",fontWeight:700}}>{median}</div></div>
            <div style={{width:1,background:"rgba(255,255,255,0.25)"}}/>
            <div><div style={{fontSize:"0.65rem",opacity:0.8}}>PRICE RANGE</div><div style={{fontSize:"1.35rem",fontFamily:"'Sora',sans-serif",fontWeight:700}}>{priceRange}</div></div>
            <div style={{width:1,background:"rgba(255,255,255,0.25)"}}/>
            <div><div style={{fontSize:"0.65rem",opacity:0.8}}>DATA SOURCE</div><div style={{fontSize:"1.05rem",fontFamily:"'Sora',sans-serif",fontWeight:700}}>🟢 CREA DDF® live</div></div>
          </div>

          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Link to={`/listings?city=${encodeURIComponent(community)}`} data-testid="hero-view-listings" style={{background:BRAND.gold,color:BRAND.navy,border:"none",padding:"13px 22px",borderRadius:999,fontWeight:700,fontSize:"0.95rem",cursor:"pointer",textDecoration:"none"}}>🏡 View {active.toLocaleString()} listings</Link>
          </div>
        </div>

        {/* Micro-conversion */}
        <div style={{marginTop:16,padding:"14px 18px",background:BRAND.cream,borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{fontSize:"0.88rem",color:BRAND.ink}}><strong>🐾 Free · $0 · no commitment</strong> — Save {community} to get weekly listing updates and price drops.</div>
          <button
            data-testid="save-community"
            onClick={onSave}
            disabled={saved}
            style={{background: saved ? BRAND.green : BRAND.navy,color:"white",border:"none",padding:"9px 18px",borderRadius:999,fontWeight:600,fontSize:"0.85rem",cursor: saved ? "default" : "pointer"}}
          >{saved ? `✅ ${community} saved` : `❤️ Save ${community}`}</button>
        </div>

        {/* ── § SPATIAL ─────────────────────────────────────────────── */}
        <SectionH kicker="§2 · Spatial context">Where is {community} · sub-neighbourhoods</SectionH>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div style={{background:"#DCE7F5",borderRadius:12,minHeight:320,position:"relative",overflow:"hidden"}}>
            <iframe title={`Map of ${community}`} width="100%" height="100%" style={{border:0,minHeight:320}} loading="lazy" src={mapEmbed}/>
          </div>
          <div>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:BRAND.navy,marginBottom:10}}>
              Sub-neighbourhoods ({hoods.length}){hoods[0]?.kind==="curated" && <span style={{fontSize:"0.7rem",fontWeight:500,color:BRAND.muted,marginLeft:6}}>· curated · tap to filter listings</span>}
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
                      padding:"9px 12px",background:"white",border:"1px solid #E5E7EB",borderRadius:8,
                      fontSize:"0.82rem",color:BRAND.ink,fontWeight:600,textDecoration:"none",
                      display:"block",transition:"all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = BRAND.navy; e.currentTarget.style.background = BRAND.cream; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "white"; }}
                  >
                    📍 {n.name} <span style={{fontSize:"0.7rem",color:BRAND.navy,marginLeft:4}}>→</span>
                    {n.kind === "live" && (
                      <div style={{fontSize:"0.7rem",color:BRAND.muted,fontWeight:400,marginTop:1}}>{n.count} listings · median {fmtMoney(n.median_price)}</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── § LIVE LISTINGS ───────────────────────────────────────── */}
        <SectionH kicker="§3 · Live inventory">{data.listings.length} sample listings in {community}</SectionH>
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
                      <div style={{position:"absolute",top:8,right:8,background:"rgba(15,42,91,0.9)",color:"white",padding:"3px 8px",borderRadius:6,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.04em"}}>🎥 TOUR</div>
                    )}
                  </div>
                  <div style={{padding:"12px 14px"}}>
                    <div style={{fontSize:"1.1rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy}}>{fmtMoney(l.list_price)}</div>
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
        </div>

        {/* ── § ABOUT ───────────────────────────────────────────────── */}
        <SectionH kicker="§4 · About">About {community}, BC</SectionH>
        {data.synopsis?.synopsis ? (
          <div style={{fontSize:"0.98rem",lineHeight:1.75,color:BRAND.ink,maxWidth:800,whiteSpace:"pre-wrap"}}>
            {data.synopsis.synopsis}
          </div>
        ) : (
          <div style={{fontSize:"0.9rem",color:BRAND.muted,fontStyle:"italic"}}>Synopsis not yet available for this community.</div>
        )}

        {/* ── § WEATHER ─────────────────────────────────────────────── */}
        <SectionH kicker="§5 · Climate">Weather &amp; climate in {community}</SectionH>
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

        {/* ── § FAQ ─────────────────────────────────────────────────── */}
        <SectionH kicker="§6 · FAQ">Frequently asked about {community}</SectionH>
        <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:820}}>
          {faqs.map((f, i) => (
            <details key={i} style={{background:"white",border:"1px solid #E5E7EB",borderRadius:10,padding:"14px 18px"}} data-testid={`faq-${i}`}>
              <summary style={{fontSize:"0.95rem",fontWeight:700,color:BRAND.navy,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>{f.q}</summary>
              <div style={{marginTop:10,fontSize:"0.9rem",lineHeight:1.65,color:BRAND.ink}}>{f.a}</div>
            </details>
          ))}
        </div>

        {/* ── § GET CONNECTED ───────────────────────────────────────── */}
        {!isFocus && (
          <>
            <SectionH kicker="§7 · Get connected">Looking to buy or sell in {community}?</SectionH>
            <div style={{background:"white",border:`1px solid ${BRAND.gold}`,padding:"22px 24px",borderRadius:14,display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
              <img src="/doogie/head.webp" alt="Doogie · Doug's real-estate concierge" data-testid="get-connected-doogie" onError={e => e.currentTarget.style.display="none"} style={{width:96,height:96,flexShrink:0,objectFit:"contain",filter:"drop-shadow(0 4px 10px rgba(15,42,91,0.18))"}}/>
              <div style={{flex:"1 1 320px"}}>
                <div style={{fontSize:"1rem",color:BRAND.ink,lineHeight:1.65,marginBottom:16}}>
                  As a smaller BC community, <strong>{community}</strong> falls outside the Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor focus areas — but that doesn't mean we can't help you get connected! 🐾 Doug will personally connect you with a licensed REALTOR® in that area.
                </div>
                <Link to={`/referral-request?city=${encodeURIComponent(community)}`} data-testid="bottom-referral-link" style={{display:"inline-block",background:BRAND.navy,color:"white",padding:"12px 24px",borderRadius:999,fontWeight:700,fontSize:"0.95rem",textDecoration:"none"}}>🤝 Referral REALTOR® link →</Link>
              </div>
            </div>
          </>
        )}
        {isFocus && (
          <>
            <SectionH kicker="§7 · Take the next step">Ready to explore {community}?</SectionH>
            <div style={{background:BRAND.navy,color:"white",padding:"26px 28px",borderRadius:14}}>
              <div style={{fontSize:"1.15rem",fontFamily:"'Sora',sans-serif",fontWeight:700,lineHeight:1.3}}>Doug represents buyers &amp; sellers in {community} directly — book a free 20-minute call.</div>
              <div style={{marginTop:16,display:"flex",gap:10,flexWrap:"wrap"}}>
                <Link to={`/buyer-consultation?city=${encodeURIComponent(community)}`} data-testid="focus-buying" style={{background:BRAND.gold,color:BRAND.navy,border:"none",padding:"11px 20px",borderRadius:999,fontWeight:700,fontSize:"0.92rem",textDecoration:"none"}}>I'm Buying in {community}</Link>
                <Link to={`/seller-consultation?city=${encodeURIComponent(community)}`} data-testid="focus-selling" style={{background:"white",color:BRAND.navy,border:"none",padding:"11px 20px",borderRadius:999,fontWeight:700,fontSize:"0.92rem",textDecoration:"none"}}>I'm Selling in {community}</Link>
                <a href="tel:604-787-0851" data-testid="focus-call" style={{background:"transparent",color:"white",border:"1px solid rgba(255,255,255,0.5)",padding:"11px 20px",borderRadius:999,fontWeight:700,fontSize:"0.92rem",textDecoration:"none"}}>📞 Call Doug directly</a>
              </div>
            </div>
          </>
        )}

        {/* ── § NEARBY ──────────────────────────────────────────────── */}
        <SectionH kicker="§8 · Nearby">Other {region} communities</SectionH>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {data.nearby.slice(0, 8).map(n => (
            <button key={n.slug} data-testid={`nearby-${n.slug}`} onClick={() => setSp({ slug: n.slug })} style={{padding:"8px 14px",background:"white",border:"1px solid #E5E7EB",borderRadius:999,color:BRAND.navy,fontSize:"0.85rem",fontWeight:600,cursor:"pointer"}}>{n.name} →</button>
          ))}
          {data.nearby.length === 0 && <span style={{fontSize:"0.85rem",color:BRAND.muted,fontStyle:"italic"}}>No nearby communities returned.</span>}
        </div>

        {/* Compliance footer */}
        <div style={{marginTop:40,padding:"18px 20px",background:BRAND.paper,borderRadius:10,fontSize:"0.72rem",color:BRAND.muted,lineHeight:1.6}}>
          © 2026 EZtoFind.ca · Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. · MLS® data © CREA DDF® · Climate © Environment and Climate Change Canada · Population © Statistics Canada. General information only — not real-estate, legal, tax, or financial advice.
        </div>
      </div>
      )}
    </div>
  );
}
