// ── /insights/* content catalog ─────────────────────────────────────────
// Feb 2026 — data-driven catalog powering 30+ /insights/{slug} pages:
//   • Neighbourhood comparisons (item #1)
//   • Life-stage funnels (item #3)
//   • FAQ-format pages (item #5)
//   • Board-specific market stats (item #7)
//   • Probate specialty (item #8)
//
// Every entry is compliance-hardened by construction:
//   - No comparative advice ("X is better than Y") — factual differences only
//   - BCFSA #167790 + brokerage on every page (via <PublishedByDoug>)
//   - Article 16 footer sitewide
//   - Farm CTAs for in-territory content, referral CTA for out-of-area
//   - Zero personal-info collection (PIPA)
//   - Zero forms (CASL — safe)
//
// The page component that reads this catalog is /components/InsightsPage.jsx.
// Add a route in App.js: `<Route path="/insights/:slug" element={<AppLayout><InsightsPage/></AppLayout>}/>`
// New sitemap URLs are auto-emitted by sitemap_generator.py (see INSIGHTS_URLS export).

export const INSIGHTS_CATALOG = {
  // ═══════════════════════════════════════════════════════════════════
  // ITEM #1 — NEIGHBOURHOOD COMPARISONS (15)
  // ═══════════════════════════════════════════════════════════════════
  "south-surrey-vs-white-rock": {
    kind: "comparison", eyebrow: "Neighbourhood Comparison",
    title: "South Surrey vs White Rock",
    subtitle: "Two Semiahmoo Peninsula neighbours — how they differ",
    intro: "South Surrey and White Rock share the Semiahmoo Peninsula and often appear in the same search results, but they are administratively and demographically distinct. This page lays out the factual differences — municipality, housing stock, and market data — so you can decide where to focus your search.",
    left: { name: "South Surrey", city: "surrey", muni: "City of Surrey", pop: "≈ 78,000 (Surrey census-subdivision share)", housing: "Predominantly detached homes on 7,000–14,000 sq ft lots. Subdivisions: Grandview Heights, Morgan Creek, Elgin Chantrell, Ocean Park, Crescent Beach, Sunnyside Park." },
    right: { name: "White Rock", city: "white-rock", muni: "City of White Rock (separate municipality)", pop: "≈ 21,000", housing: "Mix of ocean-view condos + walk-up townhomes + 1950s bungalows. Higher condo density than South Surrey." },
    facets: [
      { label: "Municipality", left: "City of Surrey", right: "City of White Rock (separate)" },
      { label: "School district", left: "SD36 Surrey", right: "SD36 Surrey" },
      { label: "Waterfront", left: "Crescent Beach (residential)", right: "White Rock Beach + pier (commercial esplanade)" },
      { label: "Property Tax Class 1 rate (2025 est.)", left: "≈ 0.28% mill rate", right: "≈ 0.32% mill rate" },
      { label: "Typical detached price band", left: "$2.5M – $6M (Elgin Chantrell top end)", right: "$1.8M – $3.5M" },
      { label: "Typical condo price band", left: "$700K – $1.4M (Grandview Heights)", right: "$650K – $1.6M (ocean-view premium)" },
    ],
    territory: "in",
  },
  "kitsilano-vs-yaletown": {
    kind: "comparison", eyebrow: "Neighbourhood Comparison",
    title: "Kitsilano vs Yaletown",
    subtitle: "Beach-adjacent vs downtown-adjacent Vancouver living",
    intro: "Kitsilano and Yaletown are two of Vancouver's most searched neighbourhoods, both known for lifestyle and price. The buildings, ownership structure, and typical buyer profile differ materially — here are the facts.",
    left: { name: "Kitsilano", city: "vancouver", muni: "City of Vancouver — West Side", pop: "≈ 43,000", housing: "Mix of 1910s heritage character homes, 1970s low-rise strata, and infill duplex/laneway. Detached lots typically 33' × 122'." },
    right: { name: "Yaletown", city: "vancouver", muni: "City of Vancouver — Downtown peninsula", pop: "≈ 12,000", housing: "Almost exclusively strata concrete high-rise (1996–2015 vintage). Very few detached, no laneway homes. Warehouse conversions on Mainland/Hamilton streets." },
    facets: [
      { label: "Zoning", left: "Mostly RS-5 / RT-8 / low-rise strata", right: "CD-1 high-density downtown" },
      { label: "Waterfront", left: "Kitsilano Beach, Jericho, Locarno", right: "False Creek seawall + BC Place" },
      { label: "Transit", left: "Bus-primary; UBC B-Line", right: "Yaletown-Roundhouse SkyTrain + Canada Line" },
      { label: "Typical detached", left: "$3.5M – $9M", right: "≈ none (< 5 detached homes total)" },
      { label: "Typical 1-bed condo", left: "$650K – $950K", right: "$700K – $1.1M" },
      { label: "Typical 2-bed condo", left: "$1.0M – $1.8M", right: "$1.3M – $2.6M" },
    ],
    territory: "in",
  },
  "langley-vs-abbotsford": {
    kind: "comparison", eyebrow: "Neighbourhood Comparison",
    title: "Langley vs Abbotsford",
    subtitle: "Where the Fraser Valley suburb divides",
    intro: "Langley and Abbotsford anchor the western and central Fraser Valley respectively. Commute times, school districts, and price bands differ enough that this is worth clarifying before you narrow a search.",
    left: { name: "Langley", city: "langley", muni: "Township of Langley + City of Langley (two municipalities)", pop: "≈ 175,000 combined", housing: "Full mix — detached, townhouse, condo, acreage in Aldergrove/Otter, urban condo in Willoughby/Walnut Grove." },
    right: { name: "Abbotsford", city: "abbotsford", muni: "City of Abbotsford", pop: "≈ 155,000", housing: "Detached-heavy, larger lots, more agricultural land (ALR). Older townhouse stock; less new condo supply than Langley." },
    facets: [
      { label: "School district", left: "SD35 Langley", right: "SD34 Abbotsford" },
      { label: "Commute to downtown Vancouver", left: "~55 min off-peak / 90+ peak", right: "~75 min off-peak / 120+ peak" },
      { label: "Typical detached price", left: "$1.5M – $2.4M", right: "$1.3M – $2.0M" },
      { label: "Typical townhouse price", left: "$800K – $1.2M", right: "$700K – $1.0M" },
      { label: "ALR (Agricultural Land Reserve) share", left: "≈ 75%", right: "≈ 74%" },
      { label: "Airport", left: "None (30 min to YVR)", right: "Abbotsford YXX (regional)" },
    ],
    territory: "in",
  },
  "fort-langley-vs-walnut-grove": {
    kind: "comparison", eyebrow: "Neighbourhood Comparison",
    title: "Fort Langley vs Walnut Grove",
    subtitle: "Heritage-village charm vs family-oriented suburb",
    intro: "Both sit inside the Township of Langley, but Fort Langley and Walnut Grove attract very different buyers. Here are the factual differences that matter to search.",
    left: { name: "Fort Langley", city: "langley", muni: "Township of Langley — north edge, Fraser River-facing", pop: "≈ 3,500", housing: "Heritage character homes, cottages, boutique infill, some acreage. Very limited condo stock." },
    right: { name: "Walnut Grove", city: "langley", muni: "Township of Langley — north-central", pop: "≈ 32,000", housing: "Family-oriented — detached (1990s–2010s), townhouse, some low-rise condo. Wider inventory year-round." },
    facets: [
      { label: "Heritage character district", left: "Yes (Historic Fort Langley)", right: "No" },
      { label: "Highway 1 access", left: "≈ 5 km", right: "≈ 1 km" },
      { label: "Typical detached price", left: "$1.6M – $3.5M", right: "$1.4M – $2.0M" },
      { label: "Typical townhouse price", left: "$950K – $1.4M (limited stock)", right: "$850K – $1.15M" },
      { label: "SkyTrain expected", left: "No (bus-primary)", right: "Not planned" },
    ],
    territory: "in",
  },
  "elgin-chantrell-vs-morgan-creek": {
    kind: "comparison", eyebrow: "Luxury Comparison",
    title: "Elgin Chantrell vs Morgan Creek",
    subtitle: "South Surrey's two flagship luxury enclaves",
    intro: "Elgin Chantrell and Morgan Creek are the two names most quoted when a South Surrey buyer asks about the top of the market. They are not interchangeable — here's how they actually differ.",
    left: { name: "Elgin Chantrell", city: "surrey", muni: "City of Surrey — south of Crescent Road", pop: "≈ 4,200 households", housing: "Detached-only. Half-acre lots typical, some to 1+ acre. Custom builds 4,500–9,000 sq ft. No townhouse or condo." },
    right: { name: "Morgan Creek", city: "surrey", muni: "City of Surrey — surrounding Morgan Creek Golf Course", pop: "≈ 5,800 households", housing: "Predominantly detached (5,500–14,000 sq ft lots), some fee-simple townhouse, gated Morgan Heights enclave to the east." },
    facets: [
      { label: "Golf course frontage", left: "None (Hazelmere adjacent)", right: "Morgan Creek Golf & Country Club" },
      { label: "Typical detached price band", left: "$3.0M – $9.0M+", right: "$2.4M – $5.5M" },
      { label: "Lot size (median)", left: "≈ 15,000 sq ft (0.34 ac)", right: "≈ 8,500 sq ft" },
      { label: "Year built (median)", left: "≈ 1998", right: "≈ 2001" },
      { label: "School catchment", left: "Chantrell Creek Elem + Elgin Park Secondary", right: "Morgan Elem + Earl Marriott Secondary" },
    ],
    territory: "in",
  },
  "whistler-vs-squamish": {
    kind: "comparison", eyebrow: "Sea-to-Sky Comparison",
    title: "Whistler vs Squamish",
    subtitle: "Resort market vs commuter market — two very different corridors",
    intro: "Whistler and Squamish are both in the Sea-to-Sky Corridor but function as distinct real-estate markets. Buyer type, financing, and typical price bands differ materially.",
    left: { name: "Whistler", city: "whistler", muni: "Resort Municipality of Whistler", pop: "≈ 14,000 permanent (60,000+ peak visitor)", housing: "Mix of resort strata condos, chalet-style detached, phase-1 vs phase-2 covenant differences (matters for nightly rental)." },
    right: { name: "Squamish", city: "squamish", muni: "District of Squamish", pop: "≈ 24,000", housing: "Commuter market — detached, townhouse, low-rise condo. Growing supply of family-oriented new builds (Downtown, Garibaldi Highlands)." },
    facets: [
      { label: "Nightly-rental legality", left: "Only phase-2 strata + designated tourist zones", right: "Prohibited outside licensed operators" },
      { label: "Commute to downtown Vancouver", left: "~2 hr", right: "~50 min (off-peak)" },
      { label: "Typical detached", left: "$3.0M – $12M", right: "$1.6M – $3.2M" },
      { label: "Typical condo", left: "$800K – $2.5M (view/ski-access premium)", right: "$600K – $1.1M" },
      { label: "Foreign-buyer ban (Prohibition on the Purchase of Residential Property by Non-Canadians Act)", left: "Applies", right: "Applies" },
    ],
    territory: "in",
  },
  "north-vancouver-vs-west-vancouver": {
    kind: "comparison", eyebrow: "North Shore Comparison",
    title: "North Vancouver vs West Vancouver",
    subtitle: "Two adjacent North Shore municipalities that price differently",
    intro: "North Vancouver (City + District) and West Vancouver share the North Shore but are legally three separate municipalities. Their tax rates, zoning, and price bands are not the same.",
    left: { name: "North Vancouver", city: "north-vancouver", muni: "City of North Vancouver + District of North Vancouver", pop: "≈ 145,000 combined", housing: "Full mix — Lower Lonsdale condo, Central Lonsdale, Lynn Valley detached, Deep Cove waterfront." },
    right: { name: "West Vancouver", city: "west-vancouver", muni: "District of West Vancouver", pop: "≈ 44,000", housing: "Detached-heavy, larger lots, some hillside strata. Ambleside/Dundarave condo core; British Properties + Whitby Estates for luxury detached." },
    facets: [
      { label: "Property Tax Class 1 rate (2025 est.)", left: "≈ 0.29% mill (City) / 0.30% (District)", right: "≈ 0.32% mill" },
      { label: "SkyTrain", left: "SeaBus to downtown (Lower Lonsdale)", right: "None — bus-primary" },
      { label: "Typical detached price", left: "$1.9M – $3.5M (District), $2.2M – $4.5M (City)", right: "$3.5M – $12M+" },
      { label: "Typical 2-bed condo", left: "$950K – $1.6M", right: "$1.4M – $3.2M" },
    ],
    territory: "in",
  },
  "burnaby-north-vs-burnaby-south": {
    kind: "comparison", eyebrow: "Burnaby Comparison",
    title: "Burnaby North vs Burnaby South",
    subtitle: "Same city, two very different sub-markets",
    intro: "The City of Burnaby is administratively one municipality but its northern and southern halves function as distinct real-estate markets. Transit, price bands, and buyer profile differ.",
    left: { name: "Burnaby North", city: "burnaby", muni: "City of Burnaby — Brentwood, Willingdon Heights, Capitol Hill, Lougheed", pop: "≈ 120,000", housing: "High-rise condo dominant near Brentwood/Lougheed, older detached in Capitol Hill and Vancouver Heights." },
    right: { name: "Burnaby South", city: "burnaby", muni: "City of Burnaby — Metrotown, Edmonds, Big Bend, South Slope", pop: "≈ 130,000", housing: "Metrotown high-rise concentration, detached in Deer Lake, Central Park, Highgate." },
    facets: [
      { label: "SkyTrain lines", left: "Millennium (Brentwood, Holdom, Lougheed)", right: "Expo (Metrotown, Edmonds, Royal Oak)" },
      { label: "Typical high-rise 2-bed", left: "$850K – $1.3M (Brentwood, Lougheed)", right: "$900K – $1.5M (Metrotown premium)" },
      { label: "Typical detached", left: "$1.9M – $3.5M", right: "$2.0M – $3.8M" },
      { label: "SFU proximity", left: "Adjacent — SFU sits on Burnaby Mountain (N)", right: "45 min transit" },
    ],
    territory: "in",
  },
  "richmond-central-vs-steveston": {
    kind: "comparison", eyebrow: "Richmond Comparison",
    title: "Central Richmond vs Steveston",
    subtitle: "Downtown Richmond vs the historic fishing village",
    intro: "Both are part of the City of Richmond but attract different buyers. Central Richmond is transit-served and high-density; Steveston is heritage waterfront.",
    left: { name: "Central Richmond", city: "richmond", muni: "City of Richmond — Brighouse, Lansdowne, City Centre", pop: "≈ 85,000", housing: "High-rise condo dominant, some townhouse, limited detached." },
    right: { name: "Steveston", city: "richmond", muni: "City of Richmond — Steveston Village + surrounding", pop: "≈ 22,000", housing: "Detached-heavy with Steveston-Waterfront condos, heritage cannery/village character." },
    facets: [
      { label: "Canada Line", left: "Yes — Brighouse + Lansdowne + Aberdeen", right: "No — bus only" },
      { label: "Typical detached", left: "$1.9M – $2.8M", right: "$1.8M – $3.4M" },
      { label: "Typical 2-bed condo", left: "$800K – $1.2M", right: "$850K – $1.4M (waterfront premium)" },
      { label: "Waterfront/dyke access", left: "Fraser River (limited)", right: "Steveston Wharf, West Dyke Trail" },
    ],
    territory: "in",
  },
  "coquitlam-vs-port-moody": {
    kind: "comparison", eyebrow: "Tri-Cities Comparison",
    title: "Coquitlam vs Port Moody",
    subtitle: "Larger Tri-Cities hub vs smaller waterfront neighbour",
    intro: "Coquitlam and Port Moody share the Tri-Cities region and both sit on the Evergreen Extension SkyTrain line, but they differ in scale, housing mix, and character.",
    left: { name: "Coquitlam", city: "coquitlam", muni: "City of Coquitlam", pop: "≈ 155,000", housing: "Full mix — high-rise (Burquitlam, Coquitlam Centre), detached (Westwood Plateau, Ranch Park, Burke Mountain), townhouse across west + north." },
    right: { name: "Port Moody", city: "port-moody", muni: "City of Port Moody", pop: "≈ 34,000", housing: "Detached-heavy in Heritage Mountain/Barber Street, condo cluster along Ioco Rd + Suter Brook + Klahanie." },
    facets: [
      { label: "SkyTrain (Millennium/Evergreen)", left: "Burquitlam, Coquitlam Central, Lincoln, Lafarge Lake", right: "Moody Centre, Inlet Centre" },
      { label: "Typical detached", left: "$1.6M – $2.8M", right: "$1.9M – $3.5M" },
      { label: "Typical 2-bed condo", left: "$750K – $1.2M", right: "$850K – $1.35M (Suter Brook)" },
      { label: "Waterfront/inlet frontage", left: "Limited", right: "Rocky Point Park + Belcarra" },
    ],
    territory: "in",
  },
  "maple-ridge-vs-mission": {
    kind: "comparison", eyebrow: "North Fraser Comparison",
    title: "Maple Ridge vs Mission",
    subtitle: "Where the North Fraser corridor divides",
    intro: "Maple Ridge and Mission sit across the Fraser River from each other on the northern edge of the farm. Both offer larger lots than the metro core but differ in bridge access, ALR share, and typical inventory.",
    left: { name: "Maple Ridge", city: "maple-ridge", muni: "City of Maple Ridge", pop: "≈ 92,000", housing: "Detached-heavy with acreage north of Dewdney Trunk, condo/townhouse cluster around Haney and Silver Valley new builds." },
    right: { name: "Mission", city: "mission", muni: "City of Mission (District of Mission)", pop: "≈ 46,000", housing: "Detached + acreage dominant. Growing townhouse supply near Cedar Valley and Mission Centre." },
    facets: [
      { label: "Golden Ears Bridge toll", left: "Adjacent (no toll since 2017)", right: "No direct bridge — Mission Bridge to Abbotsford" },
      { label: "West Coast Express (peak-hour commuter rail)", left: "Yes — Maple Meadows + Port Haney stations", right: "Yes — Mission City station (terminus)" },
      { label: "Typical detached", left: "$1.3M – $2.0M", right: "$1.1M – $1.7M" },
      { label: "Typical townhouse", left: "$800K – $1.1M", right: "$700K – $950K" },
    ],
    territory: "in",
  },
  "surrey-vs-langley": {
    kind: "comparison", eyebrow: "South-of-Fraser Comparison",
    title: "Surrey vs Langley",
    subtitle: "BC's largest municipality vs its fastest-growing neighbour",
    intro: "Surrey and Langley together dominate south-of-Fraser residential inventory. This page compares them at the municipality level — for finer detail see the South Surrey vs White Rock and Fort Langley vs Walnut Grove comparisons.",
    left: { name: "Surrey", city: "surrey", muni: "City of Surrey", pop: "≈ 620,000 (largest city in BC)", housing: "Six town centres (Whalley/City Centre, Guildford, Fleetwood, Newton, Cloverdale, South Surrey). Full housing mix." },
    right: { name: "Langley", city: "langley", muni: "Township + City of Langley", pop: "≈ 175,000 combined", housing: "Full mix, more detached-heavy than Surrey, growing Willoughby high-rise cluster." },
    facets: [
      { label: "SkyTrain (Expo Line + SLS extension)", left: "King George + Surrey Central + planned Langley extension", right: "Planned — Willowbrook / 200th St terminus (2028)" },
      { label: "School district", left: "SD36 Surrey", right: "SD35 Langley" },
      { label: "Typical detached (city average)", left: "$1.7M", right: "$1.7M" },
      { label: "Typical 1-bed condo", left: "$500K – $700K", right: "$500K – $650K" },
    ],
    territory: "in",
  },
  "pitt-meadows-vs-port-coquitlam": {
    kind: "comparison", eyebrow: "North Fraser Comparison",
    title: "Pitt Meadows vs Port Coquitlam",
    subtitle: "Two smaller Tri-Cities/North Fraser municipalities compared",
    intro: "Pitt Meadows and Port Coquitlam are two smaller municipalities that often show up together in Fraser Valley + Tri-Cities searches. They sit across the Pitt River from one another and function differently.",
    left: { name: "Pitt Meadows", city: "pitt-meadows", muni: "City of Pitt Meadows", pop: "≈ 20,000", housing: "Detached + townhouse dominant, growing new-build supply near Osprey Village. Significant ALR area." },
    right: { name: "Port Coquitlam", city: "port-coquitlam", muni: "City of Port Coquitlam", pop: "≈ 63,000", housing: "Detached-heavy with condo cluster in Downtown PoCo + Fremont Village new builds." },
    facets: [
      { label: "West Coast Express", left: "Pitt Meadows station", right: "Port Coquitlam station" },
      { label: "SkyTrain", left: "No", right: "No" },
      { label: "Typical detached", left: "$1.4M – $2.0M", right: "$1.5M – $2.1M" },
      { label: "Typical townhouse", left: "$850K – $1.1M", right: "$900K – $1.15M" },
      { label: "ALR (Agricultural Land Reserve) share", left: "≈ 75%", right: "≈ 15%" },
    ],
    territory: "in",
  },
  "delta-north-vs-tsawwassen": {
    kind: "comparison", eyebrow: "Delta Comparison",
    title: "North Delta vs Tsawwassen",
    subtitle: "Same municipality (Delta), very different sub-markets",
    intro: "The Corporation of Delta has three sub-communities (North Delta, Ladner, Tsawwassen) with different housing stock and commuter patterns. This compares the two most-searched.",
    left: { name: "North Delta", city: "delta", muni: "Corporation of Delta — northern sub-area, borders Surrey", pop: "≈ 51,000", housing: "Detached-heavy, older 1960s–1980s stock, some redevelopment. Adjacent to Surrey Newton." },
    right: { name: "Tsawwassen", city: "delta", muni: "Corporation of Delta — southwestern peninsula", pop: "≈ 22,000", housing: "Detached-heavy with growing Tsawwassen Springs condo/townhouse and Tsawwassen Shores waterfront." },
    facets: [
      { label: "BC Ferries terminal", left: "≈ 40 min drive", right: "5 min — Tsawwassen Ferry Terminal" },
      { label: "US border crossing", left: "≈ 30 min", right: "≈ 20 min — Peace Arch/Point Roberts" },
      { label: "Typical detached", left: "$1.4M – $1.9M", right: "$1.7M – $2.6M" },
      { label: "Typical townhouse", left: "$900K – $1.15M", right: "$1.0M – $1.4M" },
    ],
    territory: "in",
  },
  "chilliwack-vs-abbotsford": {
    kind: "comparison", eyebrow: "East Fraser Valley Comparison",
    title: "Chilliwack vs Abbotsford",
    subtitle: "Two central Fraser Valley cities compared",
    intro: "Chilliwack and Abbotsford anchor the eastern Fraser Valley. Both attract commuters and first-time buyers priced out of Langley/Surrey, but they differ in price, transit, and amenity mix.",
    left: { name: "Chilliwack", city: "chilliwack", muni: "City of Chilliwack", pop: "≈ 95,000", housing: "Detached-heavy, older stock in central Chilliwack + Sardis, new detached + townhouse growth in Promontory + Garrison Crossing." },
    right: { name: "Abbotsford", city: "abbotsford", muni: "City of Abbotsford", pop: "≈ 155,000", housing: "Full mix, more diverse than Chilliwack, established townhouse and condo supply, Abbotsford YXX airport." },
    facets: [
      { label: "Commute to downtown Vancouver (off-peak)", left: "~90 min", right: "~75 min" },
      { label: "Typical detached", left: "$950K – $1.4M", right: "$1.3M – $2.0M" },
      { label: "Typical townhouse", left: "$600K – $850K", right: "$700K – $1.0M" },
      { label: "Post-secondary", left: "University of the Fraser Valley (satellite)", right: "University of the Fraser Valley (main campus)" },
    ],
    territory: "in",
  },

  // ═══════════════════════════════════════════════════════════════════
  // ITEM #3 — LIFE-STAGE FUNNELS (4)
  // ═══════════════════════════════════════════════════════════════════
  "first-time-home-buyer-bc-2026": {
    kind: "funnel", eyebrow: "Life Stage · First-Time Buyer",
    title: "First-Time Home Buyer in BC — 2026 Guide",
    subtitle: "Every program, exemption, and account that saves you money",
    intro: "Buying your first home in BC in 2026 involves seven different federal + provincial programs. This is the full inventory — what each is, who qualifies, and how they stack.",
    sections: [
      { h: "Home Buyers' Plan (HBP) — federal RRSP withdrawal", body: "Withdraw up to $60,000 tax-free from your RRSP (as of 2024). Must repay over 15 years starting the second year after withdrawal. Both partners can each withdraw $60K — combined $120K if both are first-timers." },
      { h: "First Home Savings Account (FHSA) — federal", body: "Contribute up to $8,000/year (lifetime cap $40,000). Contributions are tax-deductible AND withdrawals for a qualifying home are tax-free. Can be combined with HBP." },
      { h: "BC Property Transfer Tax — First-Time Buyer Exemption", body: "Full exemption if the purchase price is $835,000 or less (2024 threshold). Partial exemption between $835K–$860K. Must have never owned an interest in a home anywhere in the world. Must occupy within 92 days." },
      { h: "GST New-Home Rebate — federal", body: "36% GST rebate on new homes ≤ $350K; sliding scale to zero at $450K. Does not apply to resale homes." },
      { h: "BC HOME 1st Choice mortgage program — provincial", body: "Reduced-rate BC-backed mortgage program for qualifying first-time buyers meeting income + purchase-price caps. Program parameters change annually — verify with your mortgage broker at time of application." },
      { h: "First-time buyer tax credit — federal", body: "$1,500 non-refundable tax credit ($10,000 × 15%) on your income tax return, year of purchase." },
      { h: "CMHC insured-mortgage down-payment structure", body: "5% down on the first $500K + 10% on any portion above $500K up to $1M. Homes over $1M require conventional (20%) financing." },
    ],
    territory: "in",
  },
  "downsizing-bc-boomers": {
    kind: "funnel", eyebrow: "Life Stage · Downsizing (55+)",
    title: "Downsizing in BC — A Guide for 55+ Sellers",
    subtitle: "Tax planning, capital-gains context, and the buyer side of the swap",
    intro: "Downsizing from a family home to a right-sized property is a two-transaction event with tax, timing, and sequencing complexity. This page lays out the facts.",
    sections: [
      { h: "Principal Residence Exemption (PRE)", body: "A property designated as your principal residence for every year you owned it is exempt from capital gains on sale. Only one property per family can be designated per year." },
      { h: "Home-buyer 55+ tools available in BC 2026", body: "The BC Home Equity Line of Credit (HELOC) landscape, CHIP reverse-mortgage products, and rent-back agreements are the three main tools 55+ downsizers use. Structure varies by lender — get advice from a licensed mortgage broker." },
      { h: "Property Transfer Tax on the buy-side", body: "The new-home PTT-exemption thresholds still apply to 55+ downsizers if the new property meets the criteria (≤ $1.1M new build with builder-quoted price). No 55+ specific PTT exemption exists." },
      { h: "Bare Land Strata + Age-restricted strata (55+)", body: "Some strata corporations have 55+ age restrictions. Verify via bylaws — the age restriction must be registered under the Strata Property Act (SPA) s.123." },
      { h: "Sequencing: sell first vs buy first", body: "Both approaches have tax + carrying-cost trade-offs. Bridge financing (typically 90–120 days) lets you buy first; a rent-back to your buyer lets you sell first without moving twice. Speak with your REALTOR® about which fits your situation." },
    ],
    territory: "in",
  },
  "relocating-to-bc-from-ontario": {
    kind: "funnel", eyebrow: "Life Stage · Relocating",
    title: "Relocating to BC from Ontario — What Changes",
    subtitle: "Legal, tax, and market differences between the two provinces",
    intro: "Moving from Ontario to BC in 2026 involves five specific real-estate differences worth knowing before you start a search.",
    sections: [
      { h: "Strata Property Act vs Condominium Act, 1998", body: "BC condos are called 'strata'. The Strata Property Act (SPA) governs BC; Ontario's Condominium Act 1998 governs there. Rules on depreciation reports, contingency reserve funds, and bylaw amendments differ." },
      { h: "Property Transfer Tax vs Land Transfer Tax", body: "BC PTT is 1% on the first $200K, 2% up to $2M, 3% up to $3M, 5% above $3M. Ontario's LTT is 0.5%–2.5% (with an extra Toronto municipal LTT). The BC First-Time Buyer PTT exemption is only for first-timers globally — Ontario's LTT rebate is for first-timers in Canada." },
      { h: "MLS® board coverage", body: "BC's Lower Mainland is split between Greater Vancouver REALTORS® (GVR), Fraser Valley Real Estate Board (FVREB), and Sea-to-Sky. Ontario uses the Toronto Regional Real Estate Board (TRREB) and its dozens of regional boards. Listings + comparables live on separate MLS® systems." },
      { h: "Subject removal / conditions in a BC offer", body: "BC offers typically include 'subject to' conditions (financing, inspection, review of documents) with a subject-removal date. Ontario offers use similar conditions with slightly different language ('conditional on…'). Timing conventions differ." },
      { h: "Land Title & Survey Authority of BC (LTSA)", body: "BC uses the LTSA for title registration; Ontario uses Teranet. Title insurance is common in both, but the underwriting flow differs." },
    ],
    territory: "in",
  },
  "newcomer-to-canada-buying-in-bc": {
    kind: "funnel", eyebrow: "Life Stage · Newcomer",
    title: "Newcomer to Canada — Buying in BC",
    subtitle: "Foreign-buyer rules, additional PTT, and what actually restricts you",
    intro: "Non-Canadians face specific restrictions when buying residential property in BC. This page covers what applies in 2026.",
    sections: [
      { h: "Prohibition on the Purchase of Residential Property by Non-Canadians Act (federal)", body: "In effect since 2023 and extended to 2027. Bans most non-Canadians from buying residential real estate in Canada. Key exceptions: temporary residents (workers/students meeting specific criteria), refugees, purchases outside CMA/CA census areas, and recreational properties >1.2 hectares in certain zones. Full exception list: canada.ca." },
      { h: "BC Additional Property Transfer Tax (foreign buyer PTT)", body: "20% additional PTT applies to foreign nationals purchasing residential property in specific BC areas: Metro Vancouver Regional District, Capital Regional District, Fraser Valley Regional District, Regional District of Central Okanagan, Regional District of Nanaimo. This is on top of the standard PTT." },
      { h: "BC Speculation and Vacancy Tax", body: "Annual tax on residential property owners in taxable areas. Rate: 0.5% (Canadian citizens/PRs) or 2% (foreign owners/satellite families). Applies to Metro Vancouver, Capital, Fraser Valley, Central Okanagan, Nanaimo Regional Districts + specific municipalities." },
      { h: "Underused Housing Tax (federal)", body: "1% federal tax on vacant/underused residential property owned by non-resident non-Canadians. Annual UHT return required even if exempt." },
      { h: "Getting mortgage-approved as a newcomer", body: "Several Canadian lenders have specific newcomer programs (up to 35% down, 5-year international credit-history recognition). Ask a licensed BC mortgage broker for current 2026 program terms." },
    ],
    territory: "in",
  },

  // ═══════════════════════════════════════════════════════════════════
  // ITEM #5 — QUESTION-FORMAT FAQ (10)
  // ═══════════════════════════════════════════════════════════════════
  "can-i-buy-a-house-in-bc-without-a-realtor": {
    kind: "faq", eyebrow: "Frequently Asked · BC Real Estate",
    title: "Can I buy a house in BC without a REALTOR®?",
    subtitle: "The regulatory + practical answer",
    intro: "Yes — but there are specific consequences under BC's Real Estate Services Act and the CREA/MLS® trademark rules. Here's the factual position.",
    sections: [
      { h: "You can act as a self-represented party in a trade of real estate under BCFSA rules", body: "The Real Estate Services Act (RESA) does not require a buyer to be represented by a licensee. A buyer may be a 'self-represented party' in a trade." },
      { h: "You cannot access the multiple listing service (MLS®) directly", body: "MLS® is a CREA/Board trademark and a system for licensees. Public search sites (realtor.ca, EZtoFind.ca) surface the same data but not the licensee-only fields (compensation, private remarks, showing instructions)." },
      { h: "Listing agents represent the seller, not you", body: "The listing REALTOR® has a fiduciary duty to the seller. Under BCFSA rules a licensee dealing with an unrepresented party must provide the BCFSA Disclosure of Representation in Trading Services at first substantive contact and cannot advise you on price or terms." },
      { h: "Buyer's-brokerage compensation is typically paid by the listing side", body: "Under standard MLS® cooperative-brokerage rules the listing brokerage compensates the buyer's brokerage from the sale proceeds. Skipping representation typically doesn't reduce your purchase price — the compensation offer often stays with the listing brokerage." },
    ],
    territory: "in",
  },
  "how-much-are-closing-costs-in-bc": {
    kind: "faq", eyebrow: "Frequently Asked · Closing Costs",
    title: "How much are closing costs in BC?",
    subtitle: "The complete line-item breakdown",
    intro: "Closing costs in BC typically total 1.5%–4% of purchase price. Here's every line item.",
    sections: [
      { h: "Property Transfer Tax (PTT)", body: "1% on the first $200K + 2% on the portion $200K–$2M + 3% on $2M–$3M + 5% above $3M. First-time buyer exemption available under $835K (2024). See /glossary/property-transfer-tax-ptt." },
      { h: "GST (new homes only)", body: "5% GST on new-build homes. 36% rebate available up to $350K purchase price; sliding scale to zero at $450K." },
      { h: "Legal/notary fees", body: "$1,500–$2,500 typical for a straightforward residential purchase with mortgage." },
      { h: "Title insurance", body: "$300–$500 one-time. Often required by the lender." },
      { h: "Home inspection", body: "$500–$800 for a standard detached home. More for acreage or heritage properties." },
      { h: "Property Tax and Strata Fee adjustments", body: "Pro-rated at closing — you reimburse the seller for the portion of the year they've prepaid." },
      { h: "Mortgage-related", body: "Appraisal ($350–$500), CMHC/Sagen/Canada Guaranty insurance premium (if <20% down)." },
      { h: "Move-in costs", body: "Moving company, utility hookups, home insurance premium — not strictly 'closing' but budget these." },
    ],
    territory: "in",
  },
  "is-now-a-good-time-to-buy-in-bc": {
    kind: "faq", eyebrow: "Frequently Asked · Market Timing",
    title: "Is now a good time to buy in BC?",
    subtitle: "How to answer the question without giving advice",
    intro: "BCFSA rules restrict a licensee from giving financial-advice-style 'now is a good time' statements. What follows is the factual context every 2026 buyer should know before deciding for themselves.",
    sections: [
      { h: "Bank of Canada rate direction", body: "Interest rate direction affects mortgage carrying cost more than list price does. Check the Bank of Canada announcement schedule and the current fixed vs variable spread with a licensed mortgage broker." },
      { h: "Local MLS® benchmark trend", body: "GVR, FVREB, and RASTS each publish monthly HPI (Home Price Index) benchmarks. Compare the current month vs the same month prior year for a direction signal." },
      { h: "Days on Market (DOM)", body: "Rising DOM = more inventory + slower sale pace. Falling DOM = tightening market. Check the community-level DOM on your target community page." },
      { h: "Sales-to-active-listing ratio", body: "Above 20% = seller's market. Below 12% = buyer's market. 12–20% = balanced. Published monthly by each board." },
      { h: "Your personal financial position", body: "Employment stability, mortgage stress-test result, down-payment saved, closing-cost cushion, and time horizon. Speak with a licensed mortgage broker + accountant." },
    ],
    territory: "in",
  },
  "what-is-a-strata-depreciation-report": {
    kind: "faq", eyebrow: "Frequently Asked · Strata",
    title: "What is a strata depreciation report?",
    subtitle: "The 30-year physical-plant forecast every BC strata must have",
    intro: "The Strata Property Act (SPA) requires every strata corporation in BC with 5+ units to obtain a depreciation report on a 3-year renewal cycle. Here's what it does, and why buyers should read it.",
    sections: [
      { h: "What it forecasts", body: "A 30-year forward look at physical repair + replacement of common property (roof, envelope, elevators, mechanical, hard-scape, parkade). Prepared by a qualified professional (usually engineer or certified reserve fund planner)." },
      { h: "Three funding-model scenarios", body: "Each report typically presents 3 funding models: (1) status quo, (2) increased contribution to CRF, (3) mixed contribution + special-levy assumption. This is the strata's roadmap for cash flow." },
      { h: "SPA s.94 requirement", body: "Strata corporations with 5+ strata lots must have a current depreciation report unless they waive it by ¾ vote (annual). Waivers are increasingly rare after 2024 SPA amendments." },
      { h: "Buyer implications", body: "Read Section 3 (upcoming projects), CRF balance, and any special-levy assumptions in years 1–5. A strata with a $50K CRF and a $1.5M roof replacement in year 3 is a special-levy risk." },
      { h: "Contingency Reserve Fund (CRF) sizing", body: "Historically no minimum required. Post-2024 SPA amendments increased CRF contribution requirements for strata corporations without a current + funded depreciation report." },
    ],
    territory: "in",
  },
  "how-long-does-a-real-estate-deal-take-in-bc": {
    kind: "faq", eyebrow: "Frequently Asked · Timeline",
    title: "How long does a real estate deal take in BC?",
    subtitle: "The typical 30–60 day timeline broken down",
    intro: "A standard BC residential deal from accepted offer to key handover takes 30–60 days. Here's what happens in each window.",
    sections: [
      { h: "Days 1–3: Contract of Purchase and Sale accepted", body: "Both parties sign. Deposit is due (typically 5% within 24–48 hours to the listing brokerage's trust account)." },
      { h: "Days 3–7: Subject removal — inspection", body: "Buyer books home inspection ($500–$800). Inspector produces a report. Buyer + REALTOR® review, decide whether to proceed, renegotiate, or walk." },
      { h: "Days 7–14: Subject removal — financing + strata review", body: "Lender processes mortgage approval. Buyer reviews strata documents (2 years of minutes, financials, depreciation report, Form B, bylaws). Subjects are removed by written notice on the deadline." },
      { h: "Days 14–45: Closing preparation", body: "Buyer's lawyer/notary orders title search, prepares closing documents, coordinates mortgage funds. Seller's lawyer prepares transfer + payout." },
      { h: "Closing day (typically Fri-of-month)", body: "Mortgage funds are drawn, PTT is paid, title transfers at LTSA. Adjustments (property tax, strata fee) are settled." },
      { h: "Possession day (typically 1 business day after closing)", body: "Keys handed over (per contract — usually noon of possession day). Buyer moves in." },
    ],
    territory: "in",
  },
  "difference-between-bcfsa-and-crea": {
    kind: "faq", eyebrow: "Frequently Asked · Regulators",
    title: "What's the difference between BCFSA and CREA?",
    subtitle: "Two acronyms, two very different roles",
    intro: "New buyers and sellers frequently confuse BCFSA and CREA. Here's what each is and why it matters.",
    sections: [
      { h: "BCFSA — BC Financial Services Authority", body: "The provincial statutory regulator for real-estate licensees in BC. Enforces the Real Estate Services Act (RESA), issues licences, sets rules of conduct (DoRTS, MRS, Anti-Money-Laundering), and disciplines licensees." },
      { h: "CREA — Canadian Real Estate Association", body: "The national industry trade association for REALTORS®. Owns the REALTOR® and MLS® trademarks in Canada. Provides shared tools (WEBForms®, DDF®, REALTOR.ca) to member boards + brokerages. Not a regulator." },
      { h: "The relationship", body: "A person licensed by BCFSA to practice real estate in BC may (but is not required to) also be a member of a real-estate board (e.g. GVR, FVREB) and CREA — that membership is what grants use of the REALTOR® trademark and MLS® access." },
      { h: "Who you complain to", body: "For a licensee's conduct, complain to BCFSA. For a REALTOR®'s adherence to CREA's Code of Ethics, complain to their local board or CREA. Two different pathways." },
    ],
    territory: "in",
  },
  "do-i-need-a-realtor-to-sell-my-house-in-bc": {
    kind: "faq", eyebrow: "Frequently Asked · Selling",
    title: "Do I need a REALTOR® to sell my house in BC?",
    subtitle: "The FSBO reality check",
    intro: "No, you can sell your BC home as a For-Sale-By-Owner. Here's what that actually involves.",
    sections: [
      { h: "Legal disclosure obligations continue", body: "The Property Disclosure Statement (PDS), latent-defect disclosure, and statutory warranties still apply. Failing to disclose a material latent defect can void the sale and expose you to damages." },
      { h: "You cannot list on MLS® without a licensee", body: "MLS® is licensee-only. FSBO listings live on FSBO-specific portals (grapevine.ca, comfree.com etc.). About 90% of BC buyers search MLS® via realtor.ca — you lose most of your buyer audience." },
      { h: "You must draft your own Contract of Purchase and Sale (or hire a lawyer)", body: "The BC Real Estate Association's standard CPS form is licensee-only. FSBO sellers typically use a lawyer/notary to draft the contract ($800–$1,500) or a form from a real-estate lawyer." },
      { h: "You handle showings, negotiation, subject removal, disclosure yourself", body: "Every step a listing REALTOR® would handle becomes your work. Time investment is typically 40–80 hours for a straightforward detached-home sale." },
      { h: "Buyer's brokerage compensation is typically NOT reduced", body: "The buyer's-brokerage commission is typically 2.5%–3.5% (paid by seller). Even FSBO sellers usually offer this to reach the MLS® buyer pool via a MLS®-listed buyer's REALTOR®." },
    ],
    territory: "in",
  },
  "what-credit-score-do-i-need-to-buy-in-bc": {
    kind: "faq", eyebrow: "Frequently Asked · Financing",
    title: "What credit score do I need to buy a house in BC?",
    subtitle: "The mortgage-approval floor for major lender categories",
    intro: "There's no single BC minimum, but Canadian mortgage lenders group credit scores into tiers. Here's the practical floor for each mortgage category.",
    sections: [
      { h: "Insured mortgages (< 20% down) — CMHC / Sagen / Canada Guaranty", body: "Practical minimum: 680 for A-lenders. Below 680 you'll need a co-applicant or move to a B-lender." },
      { h: "Conventional mortgages (≥ 20% down) — A-lenders", body: "Practical minimum: 660. Some A-lenders will go to 620 with strong income + employment history." },
      { h: "B-lender mortgages (Home Trust, Equitable Bank, etc.)", body: "Practical floor: 550. Higher interest rate (typically prime + 1.5–3%). Common for self-employed borrowers or 600–680 credit scores." },
      { h: "Private mortgages", body: "No credit-score floor — private lenders underwrite equity/location instead. Interest 8%–15%. Typically used for short-term bridge or when institutional financing falls through." },
      { h: "How to improve fast", body: "Pay every credit-card balance below 30% of the limit. Never miss a payment. Don't apply for new credit within 6 months of mortgage application. Speak with a licensed mortgage broker." },
    ],
    territory: "in",
  },
  "what-is-subject-removal-in-a-bc-real-estate-offer": {
    kind: "faq", eyebrow: "Frequently Asked · Contract",
    title: "What is subject removal in a BC real estate offer?",
    subtitle: "The buyer's escape hatch, explained",
    intro: "Subject removal is the checkpoint moment when a conditional offer becomes binding. Here's how it works in BC.",
    sections: [
      { h: "'Subject to' conditions in the Contract of Purchase and Sale", body: "Common subjects: financing approval, satisfactory inspection, review of strata documents, review of Property Disclosure Statement, sale of buyer's current home." },
      { h: "The subject-removal date", body: "Set in the CPS — typically 7–14 days after acceptance. On or before that date the buyer must give written notice removing (or not removing) each subject." },
      { h: "'Subject removal' vs 'waiver' vs 'time is of the essence'", body: "Subjects are typically 'for the sole benefit of the buyer' — meaning only the buyer can waive. 'Time is of the essence' means the deadline is strict; missing it typically kills the deal." },
      { h: "What happens if the buyer removes subjects", body: "The deal becomes firm. Deposit is now at risk if the buyer walks. Seller and buyer proceed to closing." },
      { h: "What happens if the buyer doesn't remove subjects", body: "The offer collapses at the deadline. Deposit returns to the buyer. No obligation on either side." },
    ],
    territory: "in",
  },
  "what-is-a-property-disclosure-statement-in-bc": {
    kind: "faq", eyebrow: "Frequently Asked · Disclosure",
    title: "What is a Property Disclosure Statement (PDS) in BC?",
    subtitle: "The seller's declaration every buyer should read carefully",
    intro: "The Property Disclosure Statement is the seller's written declaration about the property's known condition. Here's what it covers and its legal weight.",
    sections: [
      { h: "What the PDS covers", body: "Structural + mechanical systems, water intrusion + moisture, drainage, insulation type, permits/renovations, presence of asbestos/UFFI, prior repairs, oil-tank history, boundary issues, restrictions/easements, environmental hazards." },
      { h: "Not a warranty, not an inspection replacement", body: "The PDS is the seller's best-knowledge disclosure. It is NOT a warranty and it does NOT replace a professional home inspection." },
      { h: "'Do not know' answers", body: "A seller may answer 'Do not know'. In law, 'Do not know' is a valid response — but a seller who knowingly conceals a material latent defect is exposed to civil liability regardless of the PDS." },
      { h: "The PDS is typically attached to the accepted contract", body: "Most BC accepted contracts include the PDS as a schedule. If the seller declines to complete a PDS, the contract typically notes that fact — a red flag worth investigating." },
      { h: "Estate/probate sales frequently have no PDS", body: "Executors selling on behalf of an estate typically do not have first-hand knowledge and often decline to complete the PDS. That's normal in probate — the buyer's inspection matters more." },
    ],
    territory: "in",
  },

  // ═══════════════════════════════════════════════════════════════════
  // ITEM #7 — BOARD-SPECIFIC STATS PAGE
  // ═══════════════════════════════════════════════════════════════════
  "gvr-days-on-market-explained": {
    kind: "faq", eyebrow: "Board Stats · GVR",
    title: "GVR Days on Market — What it means & where to find it",
    subtitle: "Greater Vancouver REALTORS® benchmark explained",
    intro: "Greater Vancouver REALTORS® (GVR, formerly REBGV) publishes a monthly statistics package including Days on Market (DOM). Here's how to interpret it.",
    sections: [
      { h: "What GVR DOM measures", body: "The median number of days a sold property spent listed on GVR's MLS® system before its accepted offer. Reported by property type (detached, attached, apartment) and by area." },
      { h: "Where GVR publishes it", body: "GVR's monthly Statistics Package (public PDF) — released the second business day of each month. Available via GVR's public news feed at gvrealtors.ca." },
      { h: "How to interpret DOM trends", body: "Rising DOM (month-over-month) typically signals softening demand or growing inventory. Falling DOM signals tightening market. Compare year-over-year for the same month to remove seasonal noise." },
      { h: "DOM ≠ time-to-list-price", body: "DOM measures list-to-accepted-offer time. It does NOT measure whether the accepted price was above or below list. For that see the sales-price-to-list-price ratio (also in GVR's Statistics Package)." },
      { h: "GVR's coverage area", body: "Vancouver, Burnaby, Coquitlam, Delta, Maple Ridge, New Westminster, North Vancouver, Pitt Meadows, Port Coquitlam, Port Moody, Richmond, South Delta, Squamish, Sunshine Coast, West Vancouver, Whistler. NOT: Fraser Valley (FVREB) or Vancouver Island (VIREB)." },
    ],
    territory: "in",
  },

  // ═══════════════════════════════════════════════════════════════════
  // ITEM #8 — PROBATE SPECIALTY
  // ═══════════════════════════════════════════════════════════════════
  "probate-real-estate-sale-bc": {
    kind: "faq", eyebrow: "Doug's Specialty · Probate",
    title: "Probate Real Estate Sale in BC — Executor's Guide",
    subtitle: "What executors need to know about selling estate property",
    intro: "Selling a home held in an estate involves probate court, tax planning, and the Property Disclosure Statement question. Doug LeMaire, REALTOR® has a long-standing focus on probate transactions — this page lays out the process.",
    sections: [
      { h: "Grant of Probate — when it's required", body: "In BC most estates with real property require a Grant of Probate from the BC Supreme Court before title can transfer out of the deceased's name. Notary or lawyer prepares the application. Timeline: 6–16 weeks from filing to grant issue." },
      { h: "Marketing the property before probate is granted", body: "The property can be MARKETED and offers accepted 'subject to probate' before the grant issues — this is standard. Closing is contingent on the grant being received. Buyers should be told upfront." },
      { h: "Property Disclosure Statement — executor's position", body: "Executors typically decline to complete the PDS because they do not have first-hand knowledge of the property. This is normal and legally permissible. The buyer's inspection carries more weight in a probate sale." },
      { h: "Property Transfer Tax on transfer-to-beneficiary", body: "Certain estate transfers between related persons under section 14 of the Property Transfer Tax Act may be exempt. Consult the estate lawyer + a licensed accountant." },
      { h: "Capital gains at date of death (deemed disposition)", body: "The deceased is deemed to have disposed of capital property at fair market value on the date of death. The estate's tax bill uses that date-of-death value; sale price above that value can trigger further estate-level capital gains. Discuss with the estate accountant early." },
      { h: "Realistic timelines", body: "Grant of Probate: 6–16 weeks. Marketing + accepted offer: 4–8 weeks. Closing (subject to probate): 30–90 days after grant issues. Total: often 4–7 months from date of death to keys handed over." },
      { h: "Doug's approach", body: "Long-standing focus on probate. Coordinates with the estate's lawyer + accountant, drafts a listing agreement structured for the estate (executor-signed, grant contingency built in), and manages the marketing sequence so the property lists at the right moment relative to the grant timeline." },
    ],
    territory: "in",
  },
};

// Exported list of all /insights slugs — used by sitemap_generator.py
export const INSIGHTS_URLS = Object.keys(INSIGHTS_CATALOG).map(slug => `/insights/${slug}`);
