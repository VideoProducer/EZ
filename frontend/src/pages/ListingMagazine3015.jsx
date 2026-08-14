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
              <p style={{ margin: 0 }}>Some houses feel big. This one feels <em>complete</em>. Six thousand, one hundred and twenty-nine finished square feet stretched across three intentional levels — a legal law suite tucked below, a chef's main floor at the heart, and a private family wing above.</p>
              <p style={{ marginTop: 8 }}>Add a heated pool, a full-size sports court, and 4,033 square feet of covered outdoor living, and you have something rarer than a mansion: a home your family will actually <em>use</em>, every day, in every season.</p>
              <p style={{ marginTop: 8 }}>Welcome to 3015 141 Street.</p>
            </Body>
            <Callout>5+ bedrooms · 6+ bathrooms · 6,129 finished sq ft · Pool + Sports Court</Callout>
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

        {/* ═══════ PAGE 5 · TWO PRIMARIES ═══════ */}
        <Page n={5}>
          <Photo label="MAIN-FLOOR PRIMARY · ENSUITE" h="40%"/>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>Two primary suites</Kicker>
            <H>Pick your view.</H>
            <Body>
              <p style={{ margin: 0 }}><strong style={{ color: C.navy }}>Prefer a single-level lifestyle?</strong> The main-floor primary (17′6″ × 15′3″) delivers hotel-scale living with a 138 sq ft spa ensuite and a 14-foot walk-in closet that thinks it's a room.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: C.navy }}>Still love the "kids down the hall" era?</strong> The upper-floor primary (18′3″ × 16′10″) sits at the head of the family wing beside two 15-foot bedrooms and a 24-foot games room. Either choice is right. Both choices are yours.</p>
            </Body>
            <Callout><strong style={{ color: C.navy }}>Main-floor ensuite:</strong> walk-in shower · dual vanity · water closet · spa-tub-ready · natural light on two exposures.</Callout>
          </div>
        </Page>

        {/* ═══════ PAGE 6 · FAMILY WING (new) ═══════ */}
        <Page n={6}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 4, height:"38%" }}>
            <Photo label="UPPER LANDING" h="100%"/>
            <Photo label="GAMES ROOM 24'" h="100%"/>
            <Photo label="SECONDARY BEDROOM" h="100%"/>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The family wing</Kicker>
            <H>Kids down the hall. Not down a wing.</H>
            <Body>
              <p style={{ margin: 0 }}>The upper floor was designed for the specific magic of raising older kids: close enough to hear the laughter, far enough that homework and headphones actually happen. Three bedrooms line the family wing, each large enough for a queen bed and a real desk.</p>
              <p style={{ marginTop: 8 }}>Between them, a <strong>24-foot games room</strong> — the room every family adds to their wish list and never actually gets — with space for a sectional, a pool table, and a Nintendo Switch that lives permanently in the drawer.</p>
              <p style={{ marginTop: 8 }}>An upstairs laundry room ends the great debate about carrying baskets down two flights of stairs.</p>
            </Body>
            <Specs>Bed 2: 15′2″ × 12′4″ · Bed 3: 15′1″ × 12′0″ · Bed 4: 13′10″ × 11′6″ · Games 24′ × 15′ · Upstairs Laundry</Specs>
          </div>
        </Page>

        {/* ═══════ PAGE 7 · LAW SUITE ═══════ */}
        <Page n={7}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 4, height:"40%" }}>
            <Photo label="LAW SUITE LIVING · KITCHEN" h="100%"/>
            <Photo label="MEDIA ROOM" h="100%"/>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The law suite</Kicker>
            <H>A second home, inside the first.</H>
            <Body>
              <p style={{ margin: 0 }}>Two thousand and seventy-one square feet, its own private entry, its own kitchen, its own laundry, its own bathroom. The law suite at 3015 was built for the moments modern families quietly plan for — aging parents, adult children returning home, a live-in nanny, or an extended-stay guest who deserves better than a spare bedroom.</p>
              <p style={{ marginTop: 8 }}>Beside it: a 320-square-foot gym (rack, mirrors, rubber flooring — bring your own dumbbells), a proper media room pre-wired for surround, and workshop-scale storage.</p>
            </Body>
            <Fine>Legal law-suite status is a matter of municipal permitting. Prospective buyers should verify current use with the City of Surrey Planning Department and their own legal counsel before making an offer. Any rental use is subject to municipal and provincial residential-tenancy regulations.</Fine>
          </div>
        </Page>

        {/* ═══════ PAGE 8 · POOL / COURT / PORCH ═══════ */}
        <Page n={8}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap: 4, height:"40%" }}>
            <Photo label="POOL AERIAL · 33' HEATED" h="100%"/>
            <div style={{ display:"grid", gridTemplateRows:"1fr 1fr", gap: 4 }}>
              <Photo label="SPORTS COURT" h="100%"/>
              <Photo label="55' WRAP PORCH" h="100%"/>
            </div>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The outdoor rooms</Kicker>
            <H>Summer takes a full page.</H>
            <Body>
              <p style={{ margin: 0 }}>The 33-foot pool is the centrepiece — but the real magic is what surrounds it. A <strong>36 × 29 sports court</strong> means birthday parties, pickleball leagues, and rainy-day ball hockey without a drive to a rec centre. Twelve hundred combined square feet of covered patio keep the barbecue rolling through October. And a 55-foot wrap porch at the front is where morning coffee lives.</p>
              <p style={{ marginTop: 8 }}>The pump house is tucked out of sight. So is the plumbing. So is the mess.</p>
            </Body>
            <Callout>Pool 33′5″ × 15′11″ · Sports Court 36′1″ × 29′6″ · Covered Patios 1,272 sq ft · Wrap Porch 55′</Callout>
          </div>
        </Page>

        {/* ═══════ PAGE 9 · THE DETAILS (new) ═══════ */}
        <Page n={9}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 4, height:"36%" }}>
            <Photo label="STAIRCASE · NEWEL DETAIL" h="100%"/>
            <Photo label="MECHANICAL · GARAGE" h="100%"/>
          </div>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The details</Kicker>
            <H size="1.55rem">The parts of a home you only notice when they're missing.</H>
            <Body>
              <p style={{ margin: 0 }}>The finishes at 3015 do the work that finishes are supposed to do: they get out of the way and let the rooms speak. Nine-foot ceilings on the main. Wide-plank flooring throughout the primary living zones. A staircase you can carry a queen mattress up without pivoting sideways.</p>
              <p style={{ marginTop: 8 }}>A <strong>782-square-foot garage</strong> with room for two vehicles plus the storage that keeps the seasonal bins out of the mud room. Mechanicals are tucked into a dedicated room — not a closet — so future servicing means moving a broom, not moving a car.</p>
            </Body>
            <Specs style={{ fontSize:"0.68rem" }}>Total: 6,129 · Main: 2,252 · Upper: 1,806 · Law Suite: 2,071 · Garage: 782 · Outdoor: 4,033 · 5+ bed · 6+ bath · 3 levels</Specs>
          </div>
        </Page>

        {/* ═══════ PAGE 10 · NEIGHBOURHOOD (new) ═══════ */}
        <Page n={10}>
          <Photo label="LEAFY STREET / AERIAL CONTEXT" h="40%"/>
          <div style={{ padding:"22px 28px", flex: 1, display:"flex", flexDirection:"column", gap: 10 }}>
            <Kicker>The neighbourhood</Kicker>
            <H>A quiet street with everything within seven minutes.</H>
            <Body>
              <p style={{ margin: 0 }}>141 Street sits in one of Surrey's most consistently family-favoured pockets — mature landscaping, low through-traffic, and the kind of neighbours who wave from the driveway. Elementary and secondary schools are within a short drive, and the Highway 10 / 152 Street corridor puts you at the border, downtown Surrey, or the Fraser Valley in reliably reasonable time.</p>
              <p style={{ marginTop: 8 }}>The neighbourhood grew up organically over the last two decades, which means the streetscape has actual trees, actual sidewalks, and actual room to breathe. It's the kind of street you buy on once and stay on until your kids buy their own.</p>
            </Body>
            <Fine>School catchments, commute times, and neighbourhood amenities change over time. Verify current catchments with the Surrey School District, drive times with your own transit / traffic apps, and any lifestyle claims through independent inspection before making an offer.</Fine>
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
