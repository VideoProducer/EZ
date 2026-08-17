// Print-preview magazine viewer for 3015 141 Street.
// Renders the 12-page copy deck (see /app/memory/listings/3015-141-st.md)
// as letter-portrait pages using the eztofind brand system. Designed to be
// screenshot-shared with the print designer — this is not a production route.
import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const C = { navy:"#0F2A5B", gold:"#F5A623", paper:"#FAFAF7", cream:"#F5EFD8", ink:"#111827", muted:"#6B7280" };

// ── Reusable page shell ──────────────────────────────────────────────
function Page({ n, children, bg = C.paper }) {
  return (
    <div data-testid={`page-${n}`} style={{
      width: "min(720px, 100%)",
      aspectRatio: "8.5 / 11",
      background: bg,
      color: C.ink,
      boxShadow: "0 24px 60px rgba(15,42,91,0.25)",
      borderRadius: 6,
      position: "relative",
      overflow: "hidden",
      fontFamily: "Inter, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {children}
      <div style={{ position:"absolute", bottom: 12, left: 0, right: 0, textAlign:"center", fontSize:"0.65rem", color: C.muted, letterSpacing:"0.16em", opacity: 0.7 }}>
        3015 141 STREET · SURREY · PAGE {n} OF 12
      </div>
    </div>
  );
}
// Hero-image placeholder — grey box with camera icon + label
const Photo = ({ label, h = "45%" }) => (
  <div style={{ height: h, background: "linear-gradient(135deg, #1E3A5F 0%, #0F2A5B 100%)", color:"white", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontSize:"0.7rem", letterSpacing:"0.14em", opacity: 0.85 }}>
    <div style={{ fontSize:"2rem", marginBottom: 6 }}>📷</div>
    <div>{label}</div>
  </div>
);
const Kicker = ({ children }) => <div style={{ fontSize:"0.62rem", letterSpacing:"0.20em", color: C.gold, fontWeight: 800, textTransform:"uppercase" }}>{children}</div>;
const H = ({ children, size = "1.8rem" }) => <h2 style={{ fontFamily:"'Sora',sans-serif", fontWeight: 800, color: C.navy, fontSize: size, lineHeight: 1.05, margin:"6px 0 12px" }}>{children}</h2>;
const Body = ({ children }) => <div style={{ fontSize:"0.82rem", lineHeight: 1.6, color: C.ink }}>{children}</div>;
const Specs = ({ children }) => <div style={{ marginTop: "auto", padding:"10px 14px", background: C.navy, color:"white", borderRadius: 8, fontSize:"0.7rem", letterSpacing:"0.06em" }}>{children}</div>;
const Callout = ({ children }) => <div style={{ padding:"14px 18px", background: C.cream, border:`1px solid #E7DFC8`, borderRadius: 8, fontSize:"0.78rem", color: C.navy, fontWeight: 600, lineHeight: 1.55 }}>{children}</div>;
const Fine = ({ children }) => <div style={{ marginTop: 10, fontSize:"0.62rem", color: C.muted, fontStyle:"italic", lineHeight: 1.5 }}>{children}</div>;

export default function ListingMagazine3015() {
  return (
    <div style={{ minHeight:"100vh", background:"#EEF2F7", padding:"32px 16px 80px" }} data-testid="magazine-3015">
      <Helmet>
        <title>3015 141 Street · 12-page magazine preview — EZtoFind.ca</title>
        <meta name="robots" content="noindex, nofollow"/>
      </Helmet>

      {/* Top bar */}
      <div style={{ maxWidth: 780, margin:"0 auto 24px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize:"0.7rem", letterSpacing:"0.14em", color: C.gold, fontWeight: 800 }}>PRINT PREVIEW · 12-PAGE MAGAZINE</div>
          <div style={{ fontSize:"1.4rem", fontFamily:"'Sora',sans-serif", fontWeight: 700, color: C.navy, marginTop: 2 }}>3015 141 Street · Surrey</div>
          <div style={{ fontSize:"0.8rem", color: C.muted, marginTop: 2 }}>Copy deck by Doug LeMaire, REALTOR® · design pending · photo count assumes 105 Cotala images</div>
        </div>
        <button onClick={() => window.print()} data-testid="magazine-print" style={{ background: C.navy, color:"white", padding:"10px 18px", borderRadius: 999, border:"none", fontWeight: 700, fontSize:"0.85rem", cursor:"pointer" }}>🖨️ Print / Save as PDF</button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap: 40, alignItems:"center" }}>

        {/* ═══════ PAGE 1 · COVER ═══════ */}
        <Page n={1} bg={C.navy}>
          <Photo label="TWILIGHT ELEVATION · POOL + HOUSE LIT" h="60%"/>
          <div style={{ padding:"22px 28px", color:"white", flex: 1, display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:"0.65rem", letterSpacing:"0.20em", color: C.gold, fontWeight: 800, textTransform:"uppercase" }}>A 6,129 SQ FT ESTATE · SURREY, BC</div>
            <h1 style={{ fontFamily:"'Sora',sans-serif", fontWeight: 800, fontSize:"2.4rem", lineHeight: 1.02, margin:"14px 0 10px" }}>
              Home is where the<br/>whole family fits.
            </h1>
            <p style={{ fontSize:"0.82rem", lineHeight: 1.55, opacity: 0.9, maxWidth: 480 }}>
              A 6,129 sq ft estate with a legal law suite, private sports court, and a heated pool — quietly tucked into one of Surrey's most family-favoured streets.
            </p>
            <div style={{ marginTop:"auto", paddingTop: 20, borderTop:"1px solid rgba(255,255,255,0.25)", fontSize:"0.72rem", letterSpacing:"0.14em" }}>
              <div style={{ fontWeight: 700, color: C.gold }}>3015 141 STREET · SURREY</div>
              <div style={{ opacity: 0.85, marginTop: 3 }}>Presented by Doug LeMaire, REALTOR® · eztofind.ca</div>
            </div>
          </div>
        </Page>

        {/* ═══════ PAGE 2 · INVITATION ═══════ */}
        <Page n={2}>
          <Photo label="FRONT ENTRY · PORCH · NATURAL LIGHT" h="40%"/>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 12 }}>
            <Kicker>The invitation</Kicker>
            <H>Every square foot has a job.</H>
            <Body>
              <p style={{ margin: 0 }}>Some houses feel big. This one feels <em>complete</em>. <strong>6,129 finished square feet</strong> distributed with intent across three levels — a walk-out lower floor of media, gym, and rec space; a <strong>2,252-square-foot main</strong> that hosts, feeds, and works; and an <strong>upper family wing</strong> where three bedrooms and two bathrooms make weekday mornings a little less complicated.</p>
              <p style={{ marginTop: 8 }}>Add a heated pool, a full-size sports court, and more than 1,400 square feet of covered outdoor living, and you have a home your family will actually <em>use</em>, every day, in every season.</p>
              <p style={{ marginTop: 8 }}>Welcome to 3015 141 Street.</p>
            </Body>
            <Callout>5 bedrooms · 7 bathrooms · 6,129 finished sq ft · Pool + Sports Court · 782 sq ft garage</Callout>
          </div>
        </Page>

        {/* ═══════ PAGE 3 · MAIN FLOOR ═══════ */}
        <Page n={3}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap: 4, height:"38%" }}>
            <Photo label="GREAT ROOM · 21' CEILING" h="100%"/>
            <div style={{ display:"grid", gridTemplateRows:"1fr 1fr", gap: 4 }}>
              <Photo label="DINING" h="100%"/>
              <Photo label="OFFICE" h="100%"/>
            </div>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The main floor</Kicker>
            <H size="1.6rem">Nine-foot ceilings. Three ways to host.</H>
            <Body>
              <p style={{ margin: 0 }}>The 21-foot great room opens through picture windows to an 18-foot covered patio, so summer entertaining and February movie nights share the same view. On the far side, a formal dining room seats twelve without borrowing chairs from the office. In the middle, a casual eating nook keeps Tuesday-night pasta out of the party.</p>
              <p style={{ marginTop: 8 }}>A dedicated office (15 × 14) sits behind French doors near the front entry — work-from-home without work-following-you-home.</p>
            </Body>
            <Specs>Great Room 19′1″ × 21′9″ · Dining 15′0″ × 13′11″ · Nook 12′ × 11′ · Office 15′1″ × 13′11″</Specs>
          </div>
        </Page>

        {/* ═══════ PAGE 4 · CHEF'S KITCHEN (new) ═══════ */}
        <Page n={4}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 4, height:"38%" }}>
            <Photo label="ISLAND WIDE" h="100%"/>
            <Photo label="PANTRY / PREP" h="100%"/>
            <Photo label="APPLIANCE DETAIL" h="100%"/>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The chef's kitchen</Kicker>
            <H size="1.5rem">Twenty feet of counter. Room for two cooks. Room for two more coffees.</H>
            <Body>
              <p style={{ margin: 0 }}>The kitchen at 3015 was designed around a single premise: <em>nobody should have to leave the room</em>. A twenty-foot run of counter gives you two full prep zones — one for the person who's actually cooking, one for the kid who's supposed to be doing homework but has drifted in for a snack.</p>
              <p style={{ marginTop: 8 }}>The oversized island reads as both landing strip and breakfast bar; the walk-in pantry keeps the small-appliance parade off the counter; and the seamless flow into the great room means the cook is never the last one to hear the joke.</p>
              <p style={{ marginTop: 8 }}>Every finish was chosen for daily use, not photograph use. Which, ironically, is why it photographs so well.</p>
            </Body>
            <Callout>Kitchen 11′4″ × 20′9″ · Walk-in pantry · Gas cooktop · Wall oven + built-in microwave · Island seating for 4</Callout>
          </div>
        </Page>

        {/* ═══════ PAGE 5 · MAIN-FLOOR PRIMARY ═══════ */}
        <Page n={5}>
          <Photo label="MAIN-FLOOR PRIMARY · ENSUITE" h="40%"/>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The main-floor primary</Kicker>
            <H>Sleep on the main. Skip the stairs.</H>
            <Body>
              <p style={{ margin: 0 }}>The main-floor primary is a full <strong>17′6″ × 15′3″</strong> — hotel-scale by any measure. Beside it, a <strong>13′9″ × 10′3″ ensuite</strong> (~141 sq ft) and a <strong>7′3″ × 14′10″</strong> walk-in closet that reads as a small room in its own right.</p>
              <p style={{ marginTop: 8 }}>For anyone thinking about single-level living, aging in place, or simply not wanting to negotiate a staircase at 6 a.m., this floor covers you. Kitchen twelve steps left. Coffee thirty seconds later. Pool through the back windows.</p>
            </Body>
            <Callout>Primary 17′6″ × 15′3″ · Ensuite 13′9″ × 10′3″ · W.I.C. 7′3″ × 14′10″ · Main-floor Bath 10′10″ × 11′8″ · 9′ ceilings</Callout>
          </div>
        </Page>

        {/* ═══════ PAGE 6 · GAMES ROOM (main floor) ═══════ */}
        <Page n={6}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 4, height:"38%" }}>
            <Photo label="GAMES ROOM WIDE" h="100%"/>
            <Photo label="GAMES ROOM DETAIL" h="100%"/>
            <Photo label="MUD ROOM / LAUNDRY" h="100%"/>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The games room</Kicker>
            <H size="1.55rem">The room every family adds to their wish list — and never actually gets.</H>
            <Body>
              <p style={{ margin: 0 }}>Right on the main floor at 3015 is a <strong>24′7″ × 14′0″ games room</strong> — 345 square feet of dedicated bonus space that most 6,000-foot homes don't bother to draw. Space for a sectional, a pool table, and a screen big enough to make Saturday-night hockey feel like it's played in the room.</p>
              <p style={{ marginTop: 8 }}>Beside it, a <strong>6′10″ × 9′11″ mud room</strong> and a proper laundry room finish out the everyday-life side of the plan — because a home this size still has to handle Tuesday.</p>
            </Body>
            <Specs>Games 24′7″ × 14′0″ · Mud Room 6′10″ × 9′11″ · Laundry (utility W/D) · Main-floor Bath 10′10″ × 11′8″</Specs>
          </div>
        </Page>

        {/* ═══════ PAGE 7 · UPPER FAMILY WING ═══════ */}
        <Page n={7}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 4, height:"38%" }}>
            <Photo label="UPPER PRIMARY 18′3″" h="100%"/>
            <Photo label="UPPER LANDING" h="100%"/>
            <Photo label="SECONDARY BEDROOM" h="100%"/>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The upper family wing</Kicker>
            <H>Kids down the hall. Not down a wing.</H>
            <Body>
              <p style={{ margin: 0 }}>The upper floor holds a <strong>1,806-square-foot</strong> family wing centred on an <strong>18′3″ × 16′10″ upper primary</strong> — the largest bedroom in the house. Two more bedrooms line the same corridor: <strong>15′0″ × 15′1″</strong> and <strong>15′1″ × 15′4″</strong>, each large enough for a queen bed and a real desk.</p>
              <p style={{ marginTop: 8 }}>Two full baths serve the wing (<strong>9′2″ × 5′10″</strong> and <strong>8′3″ × 8′4″</strong>), and dedicated storage rooms (10′2″ × 11′3″ and 8′3″ × 9′9″) do the work that closets alone can't. Ceilings run 8 feet.</p>
            </Body>
            <Specs>Primary 18′3″ × 16′10″ · Bedroom 15′0″ × 15′1″ · Bedroom 15′1″ × 15′4″ · Baths 9′2″ × 5′10″ + 8′3″ × 8′4″</Specs>
          </div>
        </Page>

        {/* ═══════ PAGE 8 · LOWER LEVEL (media · gym · rec) ═══════ */}
        <Page n={8}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 4, height:"40%" }}>
            <Photo label="MEDIA ROOM 18′3″ × 15′8″" h="100%"/>
            <Photo label="GYM 20′3″ × 15′8″" h="100%"/>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The lower level</Kicker>
            <H>A whole floor built for the rest of life.</H>
            <Body>
              <p style={{ margin: 0 }}>The lower level runs <strong>2,071 square feet</strong> and is drawn for the parts of family life the upstairs isn't for. A <strong>18′3″ × 15′8″ media room</strong> — pre-wired for surround. A <strong>20′3″ × 15′8″ gym</strong> — 317 sq ft of dedicated fitness space (rack, mirrors, rubber flooring — bring your own dumbbells). A <strong>16′11″ × 9′2″ living space</strong>, plus a full <strong>18′11″ × 16′9″ storage room</strong> and a bath. Ceilings 8 feet throughout.</p>
            </Body>
            <Fine>This level is labeled <em>Law Suite Floor</em> on the branded plan. Legal-suite status, kitchen configuration, private access, and any rental use are matters of municipal permitting under the City of Surrey Zoning By-law. Verify with the City of Surrey Planning Department and your own legal counsel before making an offer.</Fine>
          </div>
        </Page>

        {/* ═══════ PAGE 9 · POOL / COURT / OUTDOOR ═══════ */}
        <Page n={9}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap: 4, height:"40%" }}>
            <Photo label="POOL 33′5″ × 15′11″ · 554 SQ FT" h="100%"/>
            <div style={{ display:"grid", gridTemplateRows:"1fr 1fr", gap: 4 }}>
              <Photo label="SPORTS COURT 36′1″ × 29′6″" h="100%"/>
              <Photo label="55′ FRONT PORCH" h="100%"/>
            </div>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The outdoor rooms</Kicker>
            <H>Summer takes a full page.</H>
            <Body>
              <p style={{ margin: 0 }}>The <strong>33′5″ × 15′11″ pool</strong> — 554 square feet of finished water — sits at the centre of a considered outdoor plan. A <strong>36′1″ × 29′6″ sports court</strong> (<strong>1,063 sq ft</strong>) means birthday parties, pickleball, and rainy-day ball hockey without a drive to a rec centre.</p>
              <p style={{ marginTop: 8 }}>A <strong>55-foot front porch</strong> where morning coffee lives. A <strong>24′5″ × 15′11″ rear patio</strong> and an <strong>18′ × 18′ covered patio</strong> off the great room keep the barbecue rolling into October. A dedicated 11′1″ × 11′3″ pump house keeps the machinery out of sight.</p>
            </Body>
            <Callout>Pool 33′5″ × 15′11″ · Sports Court 36′1″ × 29′6″ · Rear Patio 24′5″ × 15′11″ · Covered Patio 18′1″ × 18′1″ · Porch 55′0″ × 6′1″</Callout>
          </div>
        </Page>

        {/* ═══════ PAGE 10 · GARAGE + DETAILS ═══════ */}
        <Page n={10}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 4, height:"36%" }}>
            <Photo label="GARAGE 20′9″ × 41′8″ · 782 SQ FT" h="100%"/>
            <Photo label="ARCHITECTURAL DETAIL" h="100%"/>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The garage + the details</Kicker>
            <H size="1.55rem">The parts of a home you only notice when they're missing.</H>
            <Body>
              <p style={{ margin: 0 }}>The garage runs <strong>20′9″ × 41′8″</strong> — <strong>782 finished square feet</strong>, roughly a triple-length two-car with room for the mud-room bins, the seasonal storage, and the vehicles. The mud room connects it directly to the main-floor laundry, so groceries land where they belong.</p>
              <p style={{ marginTop: 8 }}>Nine-foot ceilings on the main. Eight-foot ceilings on the two other floors. A <strong>55′ × 6′1″ front porch</strong> that means the house never looks small from the street.</p>
            </Body>
            <Specs>Total 6,129 · Main 2,252 · Upper 1,806 · Law Suite level 2,071 · Garage 782 · Extras 4,033 · 5 bed · 7 bath · 3 levels · 9′/8′/8′</Specs>
          </div>
        </Page>

        {/* ═══════ PAGE 11 · FLOOR PLAN ═══════ */}
        <Page n={11}>
          <div style={{ padding:"22px 28px 0", textAlign:"center" }}>
            <Kicker>The floor plan</Kicker>
            <H>Every room, drawn to scale.</H>
          </div>
          <div style={{ flex: 1, margin:"6px 28px 16px", background:"repeating-linear-gradient(45deg, #FAFAF7 0, #FAFAF7 12px, #F0EAD8 12px, #F0EAD8 13px)", border:`1px dashed ${C.navy}`, borderRadius: 6, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", color: C.navy, fontSize:"0.75rem", letterSpacing:"0.14em" }}>
            <div style={{ fontSize:"3rem", opacity: 0.4 }}>📐</div>
            <div style={{ marginTop: 8, opacity: 0.7 }}>FULL-PAGE BRANDED FLOOR PLAN</div>
            <div style={{ fontSize:"0.65rem", opacity: 0.55, marginTop: 4, letterSpacing:"0.10em" }}>MAIN · UPPER · LAW SUITE</div>
          </div>
          <div style={{ padding:"0 28px 26px", display:"grid", gridTemplateColumns:"1fr 1fr", gap: 8, fontSize:"0.7rem", color: C.ink }}>
            <div>Main Floor — <strong>2,252 sq ft</strong> · 9′ ceilings</div>
            <div>Upper Floor — <strong>1,806 sq ft</strong> · 8′ ceilings</div>
            <div>Law Suite — <strong>2,071 sq ft</strong> · 8′ ceilings</div>
            <div>Garage — <strong>782 sq ft</strong></div>
            <div style={{ gridColumn:"1 / -1" }}>Extras — <strong>4,033 sq ft</strong> (pool, sports court, patios, porch, pump house)</div>
            <div style={{ gridColumn:"1 / -1", fontSize:"0.6rem", color: C.muted, fontStyle:"italic", marginTop: 4 }}>Floor plan and measurements are approximate within ±2 % tolerance. Not intended for architectural or construction use. All measurements should be independently verified.</div>
          </div>
        </Page>

        {/* ═══════ PAGE 12 · THE CALL ═══════ */}
        <Page n={12} bg={C.navy}>
          <div style={{ padding:"36px 32px", color:"white", height:"100%", display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", gap: 16, alignItems:"center", marginBottom: 24 }}>
              <div style={{ width: 90, height: 90, borderRadius:"50%", background:"linear-gradient(135deg,#F5A623 0%, #C77E15 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem" }}>👨‍💼</div>
              <div>
                <div style={{ fontSize:"0.65rem", letterSpacing:"0.18em", color: C.gold, fontWeight: 800 }}>THE CALL</div>
                <div style={{ fontSize:"1.15rem", fontWeight: 700, marginTop: 4 }}>Doug LeMaire, REALTOR®</div>
                <div style={{ fontSize:"0.72rem", opacity: 0.75 }}>Fraser Property Management Realty Services Ltd. · BCFSA-licensed</div>
              </div>
            </div>
            <h2 style={{ fontFamily:"'Sora',sans-serif", fontWeight: 800, fontSize:"2rem", lineHeight: 1.05, margin:"0 0 14px" }}>Ready to walk through?</h2>
            <p style={{ fontSize:"0.85rem", lineHeight: 1.6, opacity: 0.92, margin: 0 }}>
              Private appointments only. Serious buyers who join Doug's priority list before the first public open house get the first showing — and, for out-of-town families, a full concierge experience: cast the Matterport 3D tour to your TV, walk the home room-by-room with Doug on the phone, ask questions live.
            </p>
            <p style={{ fontSize:"0.85rem", lineHeight: 1.6, opacity: 0.92, marginTop: 10 }}>No pressure. No spam. Just a real conversation with a licensed BC REALTOR® about whether this house fits your life.</p>

            <div style={{ marginTop: 20, background: C.gold, color: C.navy, padding:"18px 22px", borderRadius: 10 }}>
              <div style={{ fontSize:"0.65rem", letterSpacing:"0.18em", fontWeight: 800 }}>BOOK A PRIVATE SHOWING</div>
              <div style={{ fontSize:"1.1rem", fontWeight: 800, marginTop: 4, fontFamily:"'Sora',sans-serif" }}>(604) 787-0851</div>
              <div style={{ fontSize:"0.8rem", marginTop: 2 }}>doug@eztofind.ca · eztofind.ca/listing/3015-141-st</div>
            </div>

            <div style={{ marginTop:"auto", fontSize:"0.58rem", opacity: 0.65, lineHeight: 1.5, borderTop:"1px solid rgba(255,255,255,0.18)", paddingTop: 10 }}>
              Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. · 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5 · BCFSA-licensed. General information only — not legal, tax, financial, or property-specific advice. All measurements approximate within ±2 % architectural tolerance. Legal law-suite status and any rental use are subject to City of Surrey permitting and provincial residential-tenancy regulations — verify with the City of Surrey Planning Department and your own legal / notary counsel before making an offer. MLS® data © CREA. Personal information collected under BC PIPA. CASL — unsubscribe any time.
            </div>
          </div>
        </Page>
      </div>

      <div style={{ maxWidth: 780, margin:"32px auto 0", textAlign:"center", fontSize:"0.78rem", color: C.muted }}>
        <p>Copy deck saved at <code style={{ background:"white", padding:"2px 6px", borderRadius: 4, fontSize:"0.75rem" }}>/app/memory/listings/3015-141-st.md</code></p>
        <p style={{ marginTop: 8 }}>
          <Link to="/mockups/home-v2" style={{ color: C.navy, fontWeight: 700 }}>← Back to /mockups/home-v2</Link>
        </p>
      </div>
    </div>
  );
}
