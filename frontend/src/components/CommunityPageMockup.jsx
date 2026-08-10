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
// Doug reviewed Feb 2026 and locked in the OUT-OF-AREA variant for wiring up.
// The in-area variant is preserved in the IN_AREA constant above for reference
// but the mockup now renders only the out-of-area path with softer referral
// messaging (no aggressive "Get matched" CTA, no advisory strip, no toggle).
export default function CommunityPageMockup() {
  const c = OUT_OF_AREA;

  return (
    <div style={{background:"#F5F5F0",minHeight:"100vh"}} data-testid="community-page-mockup">
      <UnlistedMockupBanner label="Hybrid Community Page (lead-gen redesign)"/>

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

          {/* Trust badge — softer service-area wording per Doug's Feb 2026
              review. Instead of positioning the referral as a proactive
              "network coverage" claim, we set the correct expectation up-front
              (this is outside Doug's direct area) and offer the referral as
              a helpful nicety with a warm 🐾 tone. */}
          <div style={{marginBottom:20,background:"rgba(255,255,255,0.10)",padding:"14px 18px",borderRadius:10,backdropFilter:"blur(4px)"}}>
            <div style={{fontSize:"0.92rem",lineHeight:1.55}}>
              As a smaller BC community, <strong>{c.name}</strong> falls outside the Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor focus areas — but that doesn't mean we can't help you get connected! 🐾 Would you like to be connected with a licensed REALTOR® in that area through Doug's referral network?{" "}
              <Link
                to={`/referral-request?city=${encodeURIComponent(c.name)}`}
                data-testid="hero-referral-link"
                style={{color:BRAND.gold,fontWeight:700,textDecoration:"underline",whiteSpace:"nowrap"}}
              >Referral REALTOR® link →</Link>
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

          {/* Primary CTA row — softer for out-of-area per Doug's Feb 2026
              review. No aggressive "Get matched" hero button anymore; the
              referral offer sits inside the trust badge above. Hero CTAs are
              now the same as the in-area variant. */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button data-testid="hero-view-listings" style={{background:BRAND.gold,color:BRAND.navy,border:"none",padding:"13px 22px",borderRadius:999,fontWeight:700,fontSize:"0.95rem",cursor:"pointer"}}>🏡 View {c.inventory.active} listings</button>
            <button data-testid="hero-email-new" style={{background:"rgba(255,255,255,0.15)",color:"white",border:"1px solid rgba(255,255,255,0.4)",padding:"13px 22px",borderRadius:999,fontWeight:600,fontSize:"0.95rem",cursor:"pointer"}}>📧 Email me new {c.name} listings</button>
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

        {/* ═══ Filter card — added Feb 2026 per Doug's review so every ═════
            community page has an inline search widget matching the /listings
            filter panel. Visitors can narrow the {community} inventory
            without leaving the page. Fields match FilterListings on
            /listings for consistency. */}
        <div data-testid="community-filter-card" style={{
          marginTop:28,maxWidth:340,background:"white",borderRadius:14,
          border:`2px solid ${BRAND.navy}`,padding:0,overflow:"hidden",
        }}>
          {/* Header strip with title + TYPE / DOOGIE / RESET pills */}
          <div style={{background:"white",borderBottom:`1px solid ${BRAND.navy}`,padding:"10px 12px",display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'Sora',sans-serif",fontWeight:800,letterSpacing:"0.06em",color:BRAND.navy,fontSize:"0.78rem"}}>
              <span style={{letterSpacing:"0.14em"}}>·····</span>
              FILTER<br/>LISTINGS
            </div>
            <div style={{display:"flex",gap:6}}>
              <button style={{background:"white",border:`1.5px solid ${BRAND.navy}`,borderRadius:6,padding:"5px 9px",fontSize:"0.68rem",fontWeight:700,color:BRAND.navy,cursor:"pointer"}}>🗂 TYPE</button>
              <button style={{background:BRAND.gold,border:`1.5px solid ${BRAND.gold}`,borderRadius:6,padding:"5px 9px",fontSize:"0.68rem",fontWeight:700,color:BRAND.navy,cursor:"pointer"}}>🔑 DOOGIE</button>
              <button style={{background:"white",border:`1.5px solid ${BRAND.navy}`,borderRadius:6,padding:"5px 9px",fontSize:"0.68rem",fontWeight:700,color:BRAND.navy,cursor:"pointer"}}>RESET</button>
            </div>
          </div>
          {/* Fields */}
          <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10,fontSize:"0.85rem"}}>
            <div>
              <label style={{fontWeight:700,color:BRAND.navy,display:"block",marginBottom:4}}>Community / City</label>
              <input defaultValue={c.name} placeholder="Community, city, or BC postal" style={{width:"100%",padding:"9px 11px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.85rem"}}/>
            </div>
            <div>
              <label style={{fontWeight:700,color:BRAND.navy,display:"block",marginBottom:4}}>Property Type</label>
              <select style={{width:"100%",padding:"9px 11px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.85rem",background:"white"}}>
                <option>Any</option><option>Detached</option><option>Townhouse</option>
                <option>Apartment</option><option>Acreage</option><option>Manufactured Home</option>
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <label style={{fontWeight:700,color:BRAND.navy,display:"block",marginBottom:4}}>Min beds</label>
                <select style={{width:"100%",padding:"9px 11px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.85rem",background:"white"}}>
                  <option>Any</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option><option>5+</option>
                </select>
              </div>
              <div>
                <label style={{fontWeight:700,color:BRAND.navy,display:"block",marginBottom:4}}>Min baths</label>
                <select style={{width:"100%",padding:"9px 11px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.85rem",background:"white"}}>
                  <option>Any</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{fontWeight:700,color:BRAND.navy,display:"block",marginBottom:4}}>Minimum price ($)</label>
              <input placeholder="$ Any" style={{width:"100%",padding:"9px 11px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.85rem"}}/>
            </div>
            <div>
              <label style={{fontWeight:700,color:BRAND.navy,display:"block",marginBottom:4}}>Maximum price ($)</label>
              <input placeholder="$ Any" style={{width:"100%",padding:"9px 11px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.85rem"}}/>
            </div>
            <div>
              <label style={{fontWeight:700,color:BRAND.navy,display:"block",marginBottom:4}}>Keyword</label>
              <input placeholder="e.g. suite, waterfront" style={{width:"100%",padding:"9px 11px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.85rem"}}/>
            </div>
            <div>
              <label style={{fontWeight:700,color:BRAND.navy,display:"block",marginBottom:4}}>Sort by</label>
              <select style={{width:"100%",padding:"9px 11px",borderRadius:8,border:"1px solid #D1D5DB",fontSize:"0.85rem",background:"white"}}>
                <option>Newest first</option>
                <option>Price: low to high</option>
                <option>Price: high to low</option>
                <option>Most beds</option>
              </select>
            </div>
            <button data-testid="community-apply-filters" style={{marginTop:6,background:BRAND.navy,color:"white",border:"none",padding:"12px 20px",borderRadius:8,fontWeight:700,fontSize:"0.92rem",cursor:"pointer"}}>Apply Filters</button>
          </div>
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

        {/* ═══════════════ § ABOUT + VIBESCORE + FAQ ══════════════════ */}
        {/* §5 · 3-step vetted referral process REMOVED per Doug's Feb 2026
            review. The soft referral-link approach in the hero (and repeated
            at the bottom of the page) replaces the heavier "vetted process"
            trust block. */}
        <SectionH kicker="§5 · About">About {c.name}, BC</SectionH>
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
        <SectionH kicker="§6 · Climate">Weather &amp; climate</SectionH>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <StatTile label="Avg high"        value={`${c.climate.avgHi}°C`}       sub="annual"/>
          <StatTile label="Avg low"         value={`${c.climate.avgLo}°C`}       sub="annual"/>
          <StatTile label="Annual rainfall" value={`${c.climate.rain}mm`}        sub="ECCC normals"/>
          <StatTile label="Snow days"       value={`${c.climate.snowDays}`}      sub="days/yr"/>
          <StatTile label="Climate zone"    value={c.climate.zone}               sub="Köppen equivalent"/>
        </div>
        <button style={{marginTop:14,background:"none",border:`1px solid ${BRAND.navy}`,color:BRAND.navy,padding:"8px 16px",borderRadius:999,fontSize:"0.83rem",fontWeight:600,cursor:"pointer"}}>See full monthly climate normals →</button>

        {/* ═══════════════ § BOTTOM CTA ═══════════════════════════════
            Per Doug's Feb 2026 review: no aggressive referral form here.
            Replaced with the same soft "outside Doug's service area" copy
            from the hero and a single "Referral REALTOR® link" button. */}
        <SectionH kicker="§7 · Get connected">Looking to buy or sell in {c.name}?</SectionH>
        <div style={{background:"white",border:`1px solid ${BRAND.gold}`,padding:"22px 24px",borderRadius:14}}>
          <div style={{fontSize:"1rem",color:BRAND.ink,lineHeight:1.65,marginBottom:16}}>
            As a smaller BC community, <strong>{c.name}</strong> falls outside the Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor focus areas — but that doesn't mean we can't help you get connected! 🐾 Would you like to be connected with a licensed REALTOR® in that area through Doug's referral network?
          </div>
          <Link
            to={`/referral-request?city=${encodeURIComponent(c.name)}`}
            data-testid="bottom-referral-link"
            style={{
              display:"inline-block",background:BRAND.navy,color:"white",
              padding:"12px 24px",borderRadius:999,fontWeight:700,fontSize:"0.95rem",
              textDecoration:"none",
            }}
          >🤝 Referral REALTOR® link →</Link>
        </div>


        {/* ═══════════════ § NEARBY COMMUNITIES ═══════════════════════ */}
        <SectionH kicker="§8 · Nearby">Other {c.region} communities</SectionH>
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
