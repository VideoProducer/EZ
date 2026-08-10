// Hybrid Community Page — lead-gen-first redesign mockup.
//
// Ships BOTH in-area and out-of-area variants in one preview.  Doug can flip
// the toggle at the top of the page to compare:
//   - In-area  = Maple Ridge (Doug represents directly)
//   - Out-of-area = Kelowna (Doug's referral network)
//
// 80% of the layout is shared; the diffs are:
//   - Hero trust badge   (direct vs. referral network)
//   - Primary CTA row    (view listings + email vs. get matched)
//   - Trust process bar  (13 yrs experience vs. 3-step vetted process)
//   - Bottom CTA         (buy/sell/call vs. referral form)
//
// Parked/unlisted — routed at /mockups/community-page and blocked by
// robots.txt + noindex meta via UnlistedMockupBanner.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import UnlistedMockupBanner from "./UnlistedMockupBanner";

const BRAND = {
  navy: "#0F2A5B",
  gold: "#F5A623",
  cream: "#F5F0E1",
  ink: "#1F2937",
  muted: "#6B7280",
  green: "#059669",
  blue: "#1E40AF",
  paper: "#FAFAF7",
};

// ── Sample data ────────────────────────────────────────────────────────────
const IN_AREA = {
  slug: "maple-ridge",
  name: "Maple Ridge",
  region: "Fraser Valley",
  isFocus: true,
  hero: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600",
  inventory: { active: 187, newWeek: 14, sold30: 42, median: 1249000, ppsqft: 567, dom: 22 },
  synopsis: "Maple Ridge blends Fraser Valley agricultural roots with an increasingly urban core. Bordered by the Alouette River to the north and the Fraser River to the south, its 267 km² footprint spans lakeside cabins in the Golden Ears foothills, walkable town-centre condos near West Coast Express, and half-acre ALR estates on 128th Avenue. Residents commute to downtown Vancouver in 55 minutes via the WCE line and reach the Coquitlam Centre SkyTrain terminus in 25 minutes by car.",
  climate: { avgHi: 15, avgLo: 6, rain: 1875, snowDays: 8, zone: "Coastal Wet" },
  neighbourhoods: ["Silver Valley", "Albion", "Cottonwood", "Whonnock", "Websters Corners", "Yennadon"],
  sampleListings: [
    { key:"L01", price: 1425000, beds: 4, baths: 3, sqft: 2650, addr: "12475 224 Street", type: "Detached" },
    { key:"L02", price: 998000,  beds: 3, baths: 2, sqft: 1580, addr: "23845 111A Ave",   type: "Townhouse" },
    { key:"L03", price: 2895000, beds: 5, baths: 4, sqft: 4210, addr: "13455 232 Street", type: "Acreage" },
    { key:"L04", price: 749000,  beds: 2, baths: 2, sqft: 985,  addr: "115 - 22233 Selkirk Ave", type: "Apartment" },
  ],
};

const OUT_OF_AREA = {
  slug: "kelowna",
  name: "Kelowna",
  region: "Okanagan",
  isFocus: false,
  hero: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600",
  inventory: { active: 342, newWeek: 28, sold30: 87, median: 985000, ppsqft: 512, dom: 34 },
  synopsis: "Kelowna is the Okanagan's largest city and BC's third-fastest-growing metro. Set on the eastern shore of Okanagan Lake with the semi-arid Naramata Bench across the water, Kelowna enjoys the driest climate in the province — 300+ days of sun a year, roughly 320mm of rain, and reliably warm summers averaging 28°C. The city spans lakefront estates in Lower Mission, mid-century mid-rise condos in the North End, wine-country acreages in East Kelowna, and family suburbia in Rutland and Glenmore.",
  climate: { avgHi: 15, avgLo: 3, rain: 320, snowDays: 24, zone: "Semi-arid Interior" },
  neighbourhoods: ["Lower Mission", "Glenmore", "Rutland", "East Kelowna", "Upper Mission", "North End"],
  sampleListings: [
    { key:"K01", price: 1195000, beds: 3, baths: 3, sqft: 2150, addr: "1245 Lakeshore Rd", type: "Detached" },
    { key:"K02", price: 785000,  beds: 2, baths: 2, sqft: 1240, addr: "1088 Sunset Dr",    type: "Apartment" },
    { key:"K03", price: 2450000, beds: 4, baths: 4, sqft: 3620, addr: "3450 Lakeview Rd",  type: "Detached" },
    { key:"K04", price: 649000,  beds: 2, baths: 2, sqft: 1010, addr: "550 Yates Rd",       type: "Townhouse" },
  ],
};

// ── Small building blocks ──────────────────────────────────────────────────
const Chip = ({ children, tone="navy" }) => (
  <span style={{
    padding:"5px 12px",borderRadius:999,fontSize:"0.78rem",fontWeight:600,
    background: tone==="green" ? "#DCFCE7" : tone==="gold" ? "#FEF3C7" : "#EFF6FF",
    color:     tone==="green" ? "#065F46" : tone==="gold" ? "#78350F" : "#1E40AF",
    letterSpacing:"0.02em",
    display:"inline-flex",gap:6,alignItems:"center",
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

// ── The full page mockup ──────────────────────────────────────────────────
export default function CommunityPageMockup() {
  const [mode, setMode] = useState("in-area");
  const c = mode === "in-area" ? IN_AREA : OUT_OF_AREA;

  return (
    <div style={{background:"#F5F5F0",minHeight:"100vh"}} data-testid="community-page-mockup">
      <UnlistedMockupBanner label="Hybrid Community Page (lead-gen redesign)"/>

      {/* Variant toggle — only in the mockup */}
      <div style={{background:"white",borderBottom:"1px solid #E5E7EB",padding:"14px 20px",display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:"0.85rem",color:BRAND.muted,fontFamily:"Inter,sans-serif"}}>Preview variant:</span>
        <button data-testid="mock-mode-in-area" onClick={() => setMode("in-area")} style={{
          padding:"7px 16px",borderRadius:999,border:`1px solid ${BRAND.navy}`,cursor:"pointer",
          background: mode==="in-area" ? BRAND.navy : "white",
          color:      mode==="in-area" ? "white"    : BRAND.navy,
          fontFamily:"Inter,sans-serif",fontWeight:600,fontSize:"0.85rem",
        }}>🏡 In-area (Maple Ridge)</button>
        <button data-testid="mock-mode-out-of-area" onClick={() => setMode("out-of-area")} style={{
          padding:"7px 16px",borderRadius:999,border:`1px solid ${BRAND.blue}`,cursor:"pointer",
          background: mode==="out-of-area" ? BRAND.blue : "white",
          color:      mode==="out-of-area" ? "white"    : BRAND.blue,
          fontFamily:"Inter,sans-serif",fontWeight:600,fontSize:"0.85rem",
        }}>🌐 Out-of-area (Kelowna · Referral)</button>
      </div>

      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"28px 20px",fontFamily:"Inter,sans-serif"}}>

        {/* ═══════════════ § HERO ═══════════════════════════════════════ */}
        <div style={{fontSize:"0.85rem",color:BRAND.muted,marginBottom:12}}>
          <Link to="/" style={{color:BRAND.navy,textDecoration:"none"}}>Home</Link>
          <span> / </span>
          <Link to="/communities" style={{color:BRAND.navy,textDecoration:"none"}}>Communities</Link>
          <span> / </span>
          <span>{c.region}</span>
          <span> / </span>
          <strong style={{color:BRAND.ink}}>{c.name}</strong>
        </div>

        <div style={{
          borderRadius:16,overflow:"hidden",position:"relative",
          background:`linear-gradient(135deg, rgba(15,42,91,0.85) 0%, rgba(15,42,91,0.6) 100%), url(${c.hero}) center/cover`,
          color:"white",padding:"36px 32px",minHeight:280,
        }}>
          <div style={{fontSize:"0.75rem",letterSpacing:"0.16em",color:BRAND.gold,fontWeight:700}}>{c.region.toUpperCase()}</div>
          <h1 style={{fontSize:"clamp(2rem,5vw,3.2rem)",fontFamily:"'Sora',sans-serif",fontWeight:800,margin:"6px 0 10px",lineHeight:1.05}}>{c.name}, BC</h1>

          {/* Trust badge — differs between variants */}
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
            <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire" style={{width:44,height:44,borderRadius:"50%",border:`2px solid ${BRAND.gold}`,objectFit:"cover"}}/>
            <div style={{fontSize:"0.9rem",lineHeight:1.4}}>
              {c.isFocus ? (
                <>
                  <div style={{fontWeight:700}}>Doug LeMaire, REALTOR® · covers {c.name} directly</div>
                  <div style={{opacity:0.85,fontSize:"0.82rem"}}>BCFSA-licensed · 13 years · Fraser Property Management Realty Services Ltd.</div>
                </>
              ) : (
                <>
                  <div style={{fontWeight:700}}>{c.name} is served by Doug's BC-wide referral network</div>
                  <div style={{opacity:0.85,fontSize:"0.82rem"}}>Doug personally hand-picks a BCFSA-licensed local specialist · $0 cost to you</div>
                </>
              )}
            </div>
          </div>

          {/* Live inventory strip */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:22,background:"rgba(255,255,255,0.10)",padding:"12px 16px",borderRadius:10,backdropFilter:"blur(4px)"}}>
            <div>
              <div style={{fontSize:"0.65rem",letterSpacing:"0.1em",opacity:0.8}}>ACTIVE LISTINGS</div>
              <div style={{fontSize:"1.35rem",fontFamily:"'Sora',sans-serif",fontWeight:700}}>{c.inventory.active}</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,0.25)"}}/>
            <div>
              <div style={{fontSize:"0.65rem",letterSpacing:"0.1em",opacity:0.8}}>NEW THIS WEEK</div>
              <div style={{fontSize:"1.35rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.gold}}>+{c.inventory.newWeek}</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,0.25)"}}/>
            <div>
              <div style={{fontSize:"0.65rem",letterSpacing:"0.1em",opacity:0.8}}>SOLD LAST 30 DAYS</div>
              <div style={{fontSize:"1.35rem",fontFamily:"'Sora',sans-serif",fontWeight:700}}>{c.inventory.sold30}</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,0.25)"}}/>
            <div>
              <div style={{fontSize:"0.65rem",letterSpacing:"0.1em",opacity:0.8}}>MEDIAN LIST</div>
              <div style={{fontSize:"1.35rem",fontFamily:"'Sora',sans-serif",fontWeight:700}}>${(c.inventory.median/1000).toFixed(0)}K</div>
            </div>
            <div style={{width:1,background:"rgba(255,255,255,0.25)"}}/>
            <div>
              <div style={{fontSize:"0.65rem",letterSpacing:"0.1em",opacity:0.8}}>$/SQFT · DOM</div>
              <div style={{fontSize:"1.35rem",fontFamily:"'Sora',sans-serif",fontWeight:700}}>${c.inventory.ppsqft} · {c.inventory.dom}d</div>
            </div>
          </div>

          {/* Primary CTA row — differs between variants */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {c.isFocus ? (
              <>
                <button data-testid="hero-view-listings" style={{background:BRAND.gold,color:BRAND.navy,border:"none",padding:"13px 22px",borderRadius:999,fontWeight:700,fontSize:"0.95rem",cursor:"pointer"}}>🏡 View {c.inventory.active} listings</button>
                <button data-testid="hero-email-new" style={{background:"rgba(255,255,255,0.15)",color:"white",border:"1px solid rgba(255,255,255,0.4)",padding:"13px 22px",borderRadius:999,fontWeight:600,fontSize:"0.95rem",cursor:"pointer"}}>📧 Email me new {c.name} listings</button>
              </>
            ) : (
              <>
                <button data-testid="hero-get-matched" style={{background:BRAND.gold,color:BRAND.navy,border:"none",padding:"13px 22px",borderRadius:999,fontWeight:700,fontSize:"0.95rem",cursor:"pointer"}}>🤝 Get matched with a {c.name} REALTOR® in 24 hrs</button>
                <button data-testid="hero-email-new" style={{background:"rgba(255,255,255,0.15)",color:"white",border:"1px solid rgba(255,255,255,0.4)",padding:"13px 22px",borderRadius:999,fontWeight:600,fontSize:"0.95rem",cursor:"pointer"}}>📧 Email me new {c.name} listings</button>
              </>
            )}
          </div>
        </div>

        {/* ═══════════════ § MICRO-CONVERSION ROW ══════════════════════ */}
        <div style={{marginTop:16,padding:"14px 18px",background:BRAND.cream,borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{fontSize:"0.88rem",color:BRAND.ink}}><strong>🐾 Free · $0 · no commitment</strong> — Save {c.name} to get weekly listing updates and price drops.</div>
          <button data-testid="save-community" style={{background:BRAND.navy,color:"white",border:"none",padding:"9px 18px",borderRadius:999,fontWeight:600,fontSize:"0.85rem",cursor:"pointer"}}>❤️ Save {c.name}</button>
        </div>

        {/* ═══════════════ § SPATIAL (MAP + NEIGHBOURHOODS) ═══════════ */}
        <SectionH kicker="§2 · Spatial context">Where is {c.name} · sub-neighbourhoods</SectionH>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div style={{background:"#DCE7F5",borderRadius:12,minHeight:280,display:"flex",alignItems:"center",justifyContent:"center",color:BRAND.navy,fontFamily:"Inter,sans-serif",fontWeight:600,fontSize:"0.9rem",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:`url(https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-122.6/49.22,10.5,0/600x400@2x?access_token=demo) center/cover`,opacity:0.5}}/>
            <div style={{position:"relative",textAlign:"center",padding:20}}>
              🗺 Interactive municipal-boundary map<br/>
              <span style={{fontSize:"0.78rem",color:BRAND.muted,fontWeight:400}}>(live version uses OpenStreetMap tiles)</span>
            </div>
          </div>
          <div>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:BRAND.navy,marginBottom:10}}>Sub-neighbourhoods</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {c.neighbourhoods.map(n => (
                <div key={n} style={{padding:"9px 12px",background:"white",border:"1px solid #E5E7EB",borderRadius:8,fontSize:"0.85rem",color:BRAND.ink,fontWeight:600}}>📍 {n}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════ § LIVE LISTINGS PREVIEW ════════════════════ */}
        <SectionH kicker="§3 · Live inventory">4 sample listings in {c.name}</SectionH>
        {!c.isFocus && (
          <div style={{padding:"10px 14px",background:"#EFF6FF",border:`1px solid ${BRAND.blue}`,borderRadius:8,color:BRAND.blue,fontSize:"0.82rem",marginBottom:14}}>
            💡 These listings are handled by our vetted {c.name} referral partner. Doug introduces you, they handle showings and offers.
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",gap:14}}>
          {c.sampleListings.map(l => (
            <div key={l.key} style={{background:"white",border:"1px solid #E5E7EB",borderRadius:12,overflow:"hidden"}}>
              <div style={{background:"#DBE3F0",height:120,display:"flex",alignItems:"center",justifyContent:"center",color:BRAND.navy,fontSize:"0.75rem"}}>MLS® photo</div>
              <div style={{padding:"12px 14px"}}>
                <div style={{fontSize:"1.15rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy}}>${l.price.toLocaleString("en-CA")}</div>
                <div style={{fontSize:"0.85rem",color:BRAND.ink,marginTop:2}}>{l.beds}bd · {l.baths}ba · {l.sqft.toLocaleString()} sqft</div>
                <div style={{fontSize:"0.8rem",color:BRAND.muted,marginTop:4}}>{l.addr}</div>
                <div style={{marginTop:6}}><Chip>{l.type}</Chip></div>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:14,textAlign:"center"}}>
          <button data-testid="section-view-all" style={{background:BRAND.navy,color:"white",border:"none",padding:"11px 22px",borderRadius:999,fontWeight:600,fontSize:"0.9rem",cursor:"pointer"}}>View all {c.inventory.active} {c.name} listings →</button>
        </div>

        {/* ═══════════════ § SEGMENT-MATCHED LEAD MAGNETS ═════════════ */}
        <SectionH kicker={c.isFocus ? "§4 · Free resources" : "§4 · Free resources for out-of-province buyers"}>Free guides for {c.name} buyers</SectionH>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))",gap:14}}>
          {(c.isFocus ? [
            { icon:"🏠", title:"First-Time Buyer Grants Cheat-Sheet", blurb:"Every 2026 BC + federal grant that stacks — up to $44K in combined savings." },
            { icon:"🐴", title:"Equestrian Due-Diligence Checklist", blurb:"40-point audit for horse-friendly acreage — ALR, water, septic, permits." },
            { icon:"💎", title:"Luxury Buyer's Handbook", blurb:"Foreign Buyer Ban exemptions, Speculation Tax thresholds, PTT tiers." },
          ] : [
            { icon:"🌲", title:"Moving to BC Community-Match Quiz", blurb:"90-second quiz picks 3 BC communities that fit your climate + budget." },
            { icon:"🏠", title:"First-Time Buyer Grants Cheat-Sheet", blurb:"Every 2026 BC + federal grant that stacks — up to $44K in combined savings." },
            { icon:"📝", title:`${c.name} Neighbourhood Snapshot PDF`, blurb:"Median price, schools, climate, transit — 1 page, no login." },
          ]).map(m => (
            <div key={m.title} style={{background:BRAND.cream,border:`1px solid ${BRAND.gold}`,borderRadius:12,padding:"16px 18px"}}>
              <div style={{fontSize:"1.6rem"}}>{m.icon}</div>
              <div style={{fontSize:"0.95rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy,marginTop:4}}>{m.title}</div>
              <div style={{fontSize:"0.82rem",color:BRAND.ink,marginTop:4,lineHeight:1.5}}>{m.blurb}</div>
              <button style={{marginTop:10,background:BRAND.navy,color:"white",border:"none",padding:"7px 14px",borderRadius:999,fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>Get it free →</button>
            </div>
          ))}
        </div>

        {/* ═══════════════ § OUT-OF-AREA ONLY — 3-STEP VETTED PROCESS ═ */}
        {!c.isFocus && (
          <>
            <SectionH kicker="§5 · How this works">Doug's 3-step vetted referral process</SectionH>
            <div style={{background:"white",border:"1px solid #E5E7EB",borderRadius:14,padding:"22px 24px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:20}}>
                {[
                  { n:1, title:"You fill out a short form", body:`2 minutes. Tell us what you're looking for in ${c.name}, your timeline, and how to reach you.` },
                  { n:2, title:"Doug personally reviews", body:`From a vetted network of BCFSA-licensed BC REALTORS® — same standard as if Doug were representing you himself.` },
                  { n:3, title:"Intro within 24 hours", body:`You approve every intro before it happens. $0 cost. You always control the relationship — Doug stays in the loop as your BC concierge.` },
                ].map(s => (
                  <div key={s.n}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:BRAND.gold,color:BRAND.navy,fontFamily:"'Sora',sans-serif",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem"}}>{s.n}</div>
                    <div style={{fontSize:"1rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy,marginTop:8}}>{s.title}</div>
                    <div style={{fontSize:"0.85rem",color:BRAND.ink,marginTop:4,lineHeight:1.55}}>{s.body}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:20,padding:"12px 14px",background:"#DCFCE7",borderRadius:8,fontSize:"0.85rem",color:"#065F46",display:"flex",gap:14,flexWrap:"wrap"}}>
                <span>✅ $0 cost to you</span>
                <span>✅ You approve every intro</span>
                <span>✅ BCFSA-licensed partners only</span>
                <span>✅ Doug stays your BC concierge</span>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ § ABOUT + VIBESCORE + FAQ ══════════════════ */}
        <SectionH kicker={c.isFocus ? "§5 · About" : "§6 · About"}>About {c.name}, BC</SectionH>
        <p style={{fontSize:"1rem",lineHeight:1.75,color:BRAND.ink,maxWidth:800}}>{c.synopsis}</p>

        {/* VibeScore mock */}
        <div style={{marginTop:22,padding:"18px 22px",background:"white",border:"1px solid #E5E7EB",borderRadius:12,maxWidth:640}}>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.12em",color:BRAND.gold,fontWeight:700}}>{c.name.toUpperCase()} VIBESCORE™</div>
          <div style={{display:"flex",gap:20,marginTop:10,flexWrap:"wrap"}}>
            {[
              { l:"Walkability", v: c.isFocus?"72/100":"58/100" },
              { l:"Family",      v: c.isFocus?"88/100":"81/100" },
              { l:"Outdoors",    v: c.isFocus?"91/100":"94/100" },
              { l:"Nightlife",   v: c.isFocus?"55/100":"77/100" },
              { l:"Value",       v: c.isFocus?"79/100":"66/100" },
            ].map(x => (
              <div key={x.l} style={{flex:"1 1 90px"}}>
                <div style={{fontSize:"0.72rem",color:BRAND.muted,fontWeight:600}}>{x.l}</div>
                <div style={{fontSize:"1.05rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy}}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ surface */}
        <SectionH kicker="Frequently asked">Common {c.name} questions</SectionH>
        {[
          { q:`What is it like to live in ${c.name}, BC?`, a: c.synopsis.substring(0, 200) + "…" },
          { q:`What is the average home price in ${c.name}?`,
            a:`Median list price in ${c.name} is currently $${c.inventory.median.toLocaleString("en-CA")} at $${c.inventory.ppsqft}/sqft, with ${c.inventory.active} active listings and ${c.inventory.dom} average days on market. Updated hourly from the CREA DDF® feed.` },
          { q: c.isFocus ? `Can Doug LeMaire help me buy or sell in ${c.name}?` : `Does Doug represent buyers or sellers in ${c.name}?`,
            a: c.isFocus
              ? `Yes — ${c.name} is in Doug's primary practice area. As a BCFSA-licensed REALTOR® with Fraser Property Management Realty Services Ltd., Doug represents both buyers and sellers directly.`
              : `Not directly — ${c.name} is outside Doug's primary practice area (Greater Vancouver, Fraser Valley, Sea-to-Sky). Doug will personally match you with a vetted BCFSA-licensed ${c.name} REALTOR® through his referral network. $0 cost to you.` },
          { q:`What is the weather like in ${c.name} year-round?`,
            a:`${c.name} averages ${c.climate.avgHi}°C highs, ${c.climate.avgLo}°C lows, ${c.climate.rain}mm annual rainfall, and ${c.climate.snowDays} snow days per year. Climate zone: ${c.climate.zone}. Source: Environment and Climate Change Canada 1991-2020 normals.` },
        ].map((f, i) => (
          <details key={i} style={{background:"white",border:"1px solid #E5E7EB",borderRadius:10,marginBottom:8,padding:"12px 16px"}}>
            <summary style={{fontWeight:600,color:BRAND.navy,fontSize:"0.95rem",cursor:"pointer"}}>{f.q}</summary>
            <div style={{marginTop:8,fontSize:"0.9rem",color:BRAND.ink,lineHeight:1.65}}>{f.a}</div>
          </details>
        ))}

        {/* ═══════════════ § COMPACT WEATHER STRIP ════════════════════ */}
        <SectionH kicker={c.isFocus ? "§7 · Climate" : "§8 · Climate"}>Weather &amp; climate</SectionH>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <StatTile label="Avg high"        value={`${c.climate.avgHi}°C`}       sub="annual"/>
          <StatTile label="Avg low"         value={`${c.climate.avgLo}°C`}       sub="annual"/>
          <StatTile label="Annual rainfall" value={`${c.climate.rain}mm`}        sub="ECCC normals"/>
          <StatTile label="Snow days"       value={`${c.climate.snowDays}`}      sub="days/yr"/>
          <StatTile label="Climate zone"    value={c.climate.zone}               sub="Köppen equivalent"/>
        </div>
        <button style={{marginTop:14,background:"none",border:`1px solid ${BRAND.navy}`,color:BRAND.navy,padding:"8px 16px",borderRadius:999,fontSize:"0.83rem",fontWeight:600,cursor:"pointer"}}>See full monthly climate normals →</button>

        {/* ═══════════════ § BOTTOM CTA ═══════════════════════════════ */}
        <SectionH kicker={c.isFocus ? "§8 · Take the next step" : "§9 · Get connected"}>{c.isFocus ? `Ready to explore ${c.name}?` : `Get matched with your ${c.name} REALTOR®`}</SectionH>
        {c.isFocus ? (
          <div style={{background:BRAND.navy,color:"white",padding:"26px 28px",borderRadius:14}}>
            <div style={{fontSize:"1.15rem",fontFamily:"'Sora',sans-serif",fontWeight:700,lineHeight:1.3}}>
              Doug represents buyers &amp; sellers in {c.name} directly — book a free 20-minute call.
            </div>
            <div style={{marginTop:16,display:"flex",gap:10,flexWrap:"wrap"}}>
              <button data-testid="bottom-buying" style={{background:BRAND.gold,color:BRAND.navy,border:"none",padding:"11px 20px",borderRadius:999,fontWeight:700,fontSize:"0.92rem",cursor:"pointer"}}>I'm Buying in {c.name}</button>
              <button data-testid="bottom-selling" style={{background:"white",color:BRAND.navy,border:"none",padding:"11px 20px",borderRadius:999,fontWeight:700,fontSize:"0.92rem",cursor:"pointer"}}>I'm Selling in {c.name}</button>
              <button data-testid="bottom-call" style={{background:"rgba(255,255,255,0.12)",color:"white",border:"1px solid rgba(255,255,255,0.4)",padding:"11px 20px",borderRadius:999,fontWeight:600,fontSize:"0.92rem",cursor:"pointer"}}>📞 Book 20-min call</button>
            </div>
          </div>
        ) : (
          <div style={{background:"white",border:"1px solid #E5E7EB",borderRadius:14,padding:"22px 24px"}}>
            <div style={{fontSize:"1.05rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy,marginBottom:14}}>
              Get matched with a vetted {c.name} REALTOR® in 24 hrs — $0 to you.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <input placeholder="Full name" data-testid="referral-name" style={{padding:"10px 12px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.9rem"}}/>
              <input placeholder="Email" data-testid="referral-email" style={{padding:"10px 12px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.9rem"}}/>
              <input placeholder="Phone" data-testid="referral-phone" style={{padding:"10px 12px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.9rem"}}/>
              <select data-testid="referral-intent" style={{padding:"10px 12px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.9rem"}}>
                <option>I'm buying</option>
                <option>I'm selling</option>
                <option>Both / not sure</option>
                <option>Just researching</option>
              </select>
              <select data-testid="referral-timeline" style={{padding:"10px 12px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.9rem"}}>
                <option>Timeline: ASAP</option>
                <option>1-3 months</option>
                <option>3-6 months</option>
                <option>6-12 months</option>
                <option>Just researching</option>
              </select>
              <select data-testid="referral-budget" style={{padding:"10px 12px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.9rem"}}>
                <option>Budget: Under $600K</option>
                <option>$600K – $1.1M</option>
                <option>$1.1M – $2M</option>
                <option>$2M+</option>
              </select>
            </div>
            <textarea placeholder={`Anything specific about ${c.name} that matters to you? (optional)`} data-testid="referral-notes" rows={2} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.9rem",resize:"vertical"}}/>
            <label style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:"0.78rem",color:BRAND.muted,marginTop:12,lineHeight:1.55}}>
              <input type="checkbox" data-testid="referral-consent"/>
              <span>I consent to Doug LeMaire introducing me to a licensed BC REALTOR® in {c.name} under CASL + PIPA BC. I can withdraw consent anytime.</span>
            </label>
            <button data-testid="referral-submit" style={{marginTop:14,background:BRAND.navy,color:"white",border:"none",padding:"12px 24px",borderRadius:999,fontWeight:700,fontSize:"0.95rem",cursor:"pointer"}}>🤝 Request my {c.name} REALTOR® match</button>
          </div>
        )}

        {/* ═══════════════ § NEARBY COMMUNITIES ═══════════════════════ */}
        <SectionH kicker={c.isFocus ? "§9 · Nearby" : "§10 · Nearby"}>Other {c.region} communities</SectionH>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {(c.isFocus
            ? ["Pitt Meadows","Coquitlam","Langley","Mission","Port Coquitlam","Surrey"]
            : ["West Kelowna","Lake Country","Peachland","Vernon","Penticton","Summerland"]
          ).map(n => (
            <Link key={n} to="#" style={{padding:"8px 14px",background:"white",border:"1px solid #E5E7EB",borderRadius:999,color:BRAND.navy,textDecoration:"none",fontSize:"0.85rem",fontWeight:600}}>{n} →</Link>
          ))}
        </div>

        {/* Compliance footer */}
        <div style={{marginTop:40,padding:"18px 20px",background:BRAND.paper,borderRadius:10,fontSize:"0.72rem",color:BRAND.muted,lineHeight:1.6}}>
          © 2026 EZtoFind.ca · Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. — 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5. (604) 466-7021 (Brokerage) · (604) 787-0851 (Direct).
          MLS® data © CREA DDF® · Climate normals © Environment and Climate Change Canada · Population statistics © Statistics Canada.
          General information only — not real-estate, legal, tax, or financial advice.
        </div>
      </div>
    </div>
  );
}
