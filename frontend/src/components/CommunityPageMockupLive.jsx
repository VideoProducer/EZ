// CommunityPageMockupLive — data-hydrated version of the community-page
// redesign mockup.  Fetches real data from:
//   /api/community/{slug}/stats            — active count, median price, min/max
//   /api/community/{slug}/synopsis         — long-form editorial + sources
//   /api/community/{slug}/neighbourhoods   — full sub-neighbourhood roster
//   /api/community/{slug}/nearby           — nearby communities chip strip
//   /api/community/{slug}/weather          — climate normals (falls back to defaults)
//   /api/listings?city={name}              — live 4-card grid + count
//
// Route: /mockups/community-live?slug=kelowna  (default) OR ?slug=maple-ridge etc.
// Parked / unlisted / noindex identical to CommunityPageMockup.
import React, { useEffect, useState } from "react";
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

// ── UI helpers ───────────────────────────────────────────────────────
const Chip = ({ children, tone = "navy" }) => (
  <span style={{
    padding: "5px 12px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600,
    background: tone === "green" ? "#DCFCE7" : tone === "gold" ? "#FEF3C7" : "#EFF6FF",
    color: tone === "green" ? "#065F46" : tone === "gold" ? "#78350F" : "#1E40AF",
    display: "inline-flex", gap: 6, alignItems: "center",
  }}>{children}</span>
);
const StatTile = ({ label, value, sub }) => (
  <div style={{padding:"14px 16px",background:"white",border:`1px solid #E5E7EB`,borderRadius:10,minWidth:120,flex:"1 1 140px"}}>
    <div style={{fontSize:"0.7rem",color:BRAND.muted,fontWeight:600,letterSpacing:"0.08em"}}>{label.toUpperCase()}</div>
    <div style={{fontSize:"1.3rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy,marginTop:2,lineHeight:1.1}}>{value}</div>
    {sub && <div style={{fontSize:"0.72rem",color:BRAND.muted,marginTop:2}}>{sub}</div>}
  </div>
);
const SectionH = ({ children, kicker }) => (
  <div style={{marginTop:48,marginBottom:16}}>
    {kicker && <div style={{fontSize:"0.72rem",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700}}>{kicker.toUpperCase()}</div>}
    <div style={{fontSize:"1.7rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy,lineHeight:1.15,marginTop:4}}>{children}</div>
  </div>
);

// ── Main component ──────────────────────────────────────────────────
export default function CommunityPageMockupLive() {
  const [sp, setSp] = useSearchParams();
  const slug = sp.get("slug") || "kelowna";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    stats: null, synopsis: null, neighbourhoods: [], nearby: [],
    weather: null, listings: [], listingsTotal: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      try {
        // Fetch stats first to establish the canonical community name.
        // We use that name to query /listings?city=... which expects the
        // human-readable form ("Kelowna") not the slug.
        const statsR = await axios.get(`${API}/api/community/${slug}/stats`).catch(() => null);
        const city = statsR?.data?.community || slug.replace(/-/g," ").replace(/\b\w/g, s => s.toUpperCase());
        // Now fan out the remaining 5 fetches in parallel.
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

  const median = stats?.median_price ? `$${Math.round(stats.median_price/1000)}K` : "—";
  const active = stats?.count ?? 0;
  const total = data.listingsTotal || active;

  const climate = data.weather || null;

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
          background:`linear-gradient(135deg, rgba(15,42,91,0.88) 0%, rgba(15,42,91,0.68) 100%), url(https://source.unsplash.com/1600x900/?british-columbia,${encodeURIComponent(community)}) center/cover`,
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
            <div style={{marginBottom:20,background:"rgba(255,255,255,0.10)",padding:"14px 18px",borderRadius:10,backdropFilter:"blur(4px)"}}>
              <div style={{fontSize:"0.92rem",lineHeight:1.55}}>
                As a smaller BC community, <strong>{community}</strong> falls outside the Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor focus areas — but that doesn't mean we can't help you get connected! 🐾 Would you like Doug to connect you with a licensed REALTOR® in that area?{" "}
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
            <div><div style={{fontSize:"0.65rem",opacity:0.8}}>PRICE RANGE</div><div style={{fontSize:"1.35rem",fontFamily:"'Sora',sans-serif",fontWeight:700}}>${Math.round((stats?.min_price||0)/1000)}K – ${Math.round((stats?.max_price||0)/1000000).toLocaleString()}M</div></div>
            <div style={{width:1,background:"rgba(255,255,255,0.25)"}}/>
            <div><div style={{fontSize:"0.65rem",opacity:0.8}}>DATA SOURCE</div><div style={{fontSize:"1.05rem",fontFamily:"'Sora',sans-serif",fontWeight:700}}>🟢 CREA DDF® live</div></div>
          </div>

          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Link to={`/listings?city=${encodeURIComponent(community)}`} data-testid="hero-view-listings" style={{background:BRAND.gold,color:BRAND.navy,border:"none",padding:"13px 22px",borderRadius:999,fontWeight:700,fontSize:"0.95rem",cursor:"pointer",textDecoration:"none"}}>🏡 View {active.toLocaleString()} listings</Link>
            <button data-testid="hero-email-new" style={{background:"rgba(255,255,255,0.15)",color:"white",border:"1px solid rgba(255,255,255,0.4)",padding:"13px 22px",borderRadius:999,fontWeight:600,fontSize:"0.95rem",cursor:"pointer"}}>📧 Email me new {community} listings</button>
          </div>
        </div>

        {/* Micro-conversion */}
        <div style={{marginTop:16,padding:"14px 18px",background:BRAND.cream,borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{fontSize:"0.88rem",color:BRAND.ink}}><strong>🐾 Free · $0 · no commitment</strong> — Save {community} to get weekly listing updates and price drops.</div>
          <button data-testid="save-community" style={{background:BRAND.navy,color:"white",border:"none",padding:"9px 18px",borderRadius:999,fontWeight:600,fontSize:"0.85rem",cursor:"pointer"}}>❤️ Save {community}</button>
        </div>

        {/* ── § SPATIAL ─────────────────────────────────────────────── */}
        <SectionH kicker="§2 · Spatial context">Where is {community} · sub-neighbourhoods</SectionH>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div style={{background:"#DCE7F5",borderRadius:12,minHeight:280,position:"relative",overflow:"hidden"}}>
            <iframe title={`Map of ${community}`} width="100%" height="100%" style={{border:0,minHeight:280}} loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=${encodeURIComponent(community + ",BC")}`}/>
          </div>
          <div>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:BRAND.navy,marginBottom:10}}>
              Sub-neighbourhoods ({data.neighbourhoods.length})
            </div>
            {data.neighbourhoods.length === 0 ? (
              <div style={{fontSize:"0.85rem",color:BRAND.muted,fontStyle:"italic"}}>No sub-neighbourhoods returned for this community.</div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:340,overflowY:"auto"}}>
                {data.neighbourhoods.map(n => (
                  <div key={n.slug} style={{padding:"8px 11px",background:"white",border:"1px solid #E5E7EB",borderRadius:8,fontSize:"0.82rem",color:BRAND.ink,fontWeight:600}}>
                    📍 {n.name}
                    <div style={{fontSize:"0.7rem",color:BRAND.muted,fontWeight:400,marginTop:1}}>{n.count} listings · median ${Math.round((n.median_price||0)/1000)}K</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── § LIVE LISTINGS ───────────────────────────────────────── */}
        <SectionH kicker="§3 · Live inventory">{data.listings.length} sample listings in {community}</SectionH>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",gap:14}}>
          {data.listings.map(l => (
            <Link key={l.listing_key} to={`/listing/${l.listing_key}`} style={{textDecoration:"none"}}>
              <div style={{background:"white",border:"1px solid #E5E7EB",borderRadius:12,overflow:"hidden"}}>
                <div style={{background:"#DBE3F0",height:120,position:"relative",backgroundImage: l.primary_photo ? `url(${l.primary_photo})` : "linear-gradient(135deg,#DBE3F0,#F5F0E1)", backgroundSize:"cover", backgroundPosition:"center"}}/>
                <div style={{padding:"12px 14px"}}>
                  <div style={{fontSize:"1.1rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy}}>${(l.list_price||0).toLocaleString("en-CA")}</div>
                  <div style={{fontSize:"0.82rem",color:BRAND.ink,marginTop:2}}>{l.beds||"—"}bd · {l.baths||"—"}ba · {(l.living_area_sqft||0).toLocaleString()} sqft</div>
                  <div style={{fontSize:"0.78rem",color:BRAND.muted,marginTop:4}}>{l.street_address}</div>
                  <div style={{marginTop:6}}><Chip>{l.property_type || "Home"}</Chip></div>
                </div>
              </div>
            </Link>
          ))}
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
        <SectionH kicker="§5 · Climate">Weather &amp; climate</SectionH>
        {climate ? (
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <StatTile label="Avg high"        value={climate.avg_high_c != null ? `${climate.avg_high_c}°C` : "—"} sub="annual"/>
            <StatTile label="Avg low"         value={climate.avg_low_c != null ? `${climate.avg_low_c}°C` : "—"}   sub="annual"/>
            <StatTile label="Annual rainfall" value={climate.annual_rain_mm != null ? `${climate.annual_rain_mm}mm` : "—"} sub="ECCC normals"/>
            <StatTile label="Climate zone"    value={climate.climate_zone || "—"} sub="Köppen equivalent"/>
          </div>
        ) : (
          <div style={{fontSize:"0.85rem",color:BRAND.muted}}>Climate data not available for this community.</div>
        )}

        {/* ── § GET CONNECTED (out-of-area only) ────────────────────── */}
        {!isFocus && (
          <>
            <SectionH kicker="§6 · Get connected">Looking to buy or sell in {community}?</SectionH>
            <div style={{background:"white",border:`1px solid ${BRAND.gold}`,padding:"22px 24px",borderRadius:14,display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
              <img src="/doogie/head.webp" alt="Doogie · Doug's real-estate concierge" data-testid="get-connected-doogie" onError={e => e.currentTarget.style.display="none"} style={{width:96,height:96,flexShrink:0,objectFit:"contain",filter:"drop-shadow(0 4px 10px rgba(15,42,91,0.18))"}}/>
              <div style={{flex:"1 1 320px"}}>
                <div style={{fontSize:"1rem",color:BRAND.ink,lineHeight:1.65,marginBottom:16}}>
                  As a smaller BC community, <strong>{community}</strong> falls outside the Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor focus areas — but that doesn't mean we can't help you get connected! 🐾 Would you like Doug to connect you with a licensed REALTOR® in that area?
                </div>
                <Link to={`/referral-request?city=${encodeURIComponent(community)}`} data-testid="bottom-referral-link" style={{display:"inline-block",background:BRAND.navy,color:"white",padding:"12px 24px",borderRadius:999,fontWeight:700,fontSize:"0.95rem",textDecoration:"none"}}>🤝 Referral REALTOR® link →</Link>
              </div>
            </div>
          </>
        )}
        {isFocus && (
          <>
            <SectionH kicker="§6 · Take the next step">Ready to explore {community}?</SectionH>
            <div style={{background:BRAND.navy,color:"white",padding:"26px 28px",borderRadius:14}}>
              <div style={{fontSize:"1.15rem",fontFamily:"'Sora',sans-serif",fontWeight:700,lineHeight:1.3}}>Doug represents buyers &amp; sellers in {community} directly — book a free 20-minute call.</div>
              <div style={{marginTop:16,display:"flex",gap:10,flexWrap:"wrap"}}>
                <Link to={`/buyer-consultation?city=${encodeURIComponent(community)}`} style={{background:BRAND.gold,color:BRAND.navy,border:"none",padding:"11px 20px",borderRadius:999,fontWeight:700,fontSize:"0.92rem",textDecoration:"none"}}>I'm Buying in {community}</Link>
                <Link to={`/seller-consultation?city=${encodeURIComponent(community)}`} style={{background:"white",color:BRAND.navy,border:"none",padding:"11px 20px",borderRadius:999,fontWeight:700,fontSize:"0.92rem",textDecoration:"none"}}>I'm Selling in {community}</Link>
              </div>
            </div>
          </>
        )}

        {/* ── § NEARBY ──────────────────────────────────────────────── */}
        <SectionH kicker="§7 · Nearby">Other {region} communities</SectionH>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {data.nearby.slice(0, 8).map(n => (
            <button key={n.slug} onClick={() => setSp({ slug: n.slug })} style={{padding:"8px 14px",background:"white",border:"1px solid #E5E7EB",borderRadius:999,color:BRAND.navy,fontSize:"0.85rem",fontWeight:600,cursor:"pointer"}}>{n.name} →</button>
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
