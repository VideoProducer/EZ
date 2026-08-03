// EZtoFind.ca — Interactive Visual Agent Demo (Mockup)
// URL: /visual-agent-demo  (HIDDEN — direct URL only, not linked from public nav)
//
// Purpose: A frontend-only, scripted prototype visualising the next-gen
// "Doogie Visual" experience — search, Q&A, virtual tours, and 24/7
// qualification — all inside the BCFSA/CASL/PIPA compliance boundary.
//
// No backend calls. No LLM calls. Everything is scripted for a reliable
// investor-ready demo playback.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { TurnstileWidget, getTurnstileToken } from "../App";
import {
  Mic, MicOff, Video, Search, MapPin, Building2, Sparkles, Play, Pause,
  RotateCcw, ShieldCheck, MessageCircle, ChevronRight, School,
  Bus, Trees, Waves, CheckCircle2, ArrowRight, Home as HomeIcon,
  Compass, Radio, Volume2, VolumeX, Maximize2, X, ClipboardList
} from "lucide-react";

// ── Palette (matches /app/frontend/src/index.css) ────────────────────────────
const C = {
  navy:  "#0F2A5B",
  blue:  "#1E4FCF",
  green: "#22C55E",
  gold:  "#F5A623",
  cream: "#FAF7F0",
  ink:   "#0B1930",
  mist:  "#EEF2FB",
  glass: "rgba(15,42,91,0.06)",
};

// Doogie mascot poses — served from Emergent customer assets CDN.
// The "reaction" logic in the transcript / narrator chips picks the pose
// that best matches Doogie's current state so he feels alive.
const DOOGIE = {
  headshot:    "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/dj2wy1tx_Doogie%20Headshot.jpeg",
  thinking:    "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rxgxv6ec_transparent_Doogie%20Thinking.png",
  pointing:    "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/ws3q9zcp_transparent_Doogie%20Pointing%20Left.png",
  celebrating: "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/4g6serdu_Doogie%20Celebrating.png",
};
// Backwards-compat: the hero avatar still uses the plain headshot.
const DOOGIE_HEADSHOT = DOOGIE.headshot;

// ── Scripted scenarios ───────────────────────────────────────────────────────
// Each `agent` turn can carry an optional `pose` that swaps the transcript
// chip: "thinking" (during retrieval), "pointing" (highlighting something),
// "celebrating" (win state). Undefined = headshot (default).
const SCENARIOS = [
  {
    id: "search",
    label: "Buyer Search",
    icon: Search,
    turns: [
      { who: "user", text: "Show me 2-bedroom condos in Kitsilano under $1.5M." },
      { who: "agent", pose: "thinking", text: "Retrieving 12 active listings from CREA DDF®. Sorting by price and days-on-market. Educational retrieval only — not advice." },
      { who: "user", text: "Which ones are steps from the beach?" },
      { who: "agent", pose: "pointing", text: "Highlighting 4 listings within 400m of Kits Beach. Tap a card for full details or a virtual walkthrough." },
    ],
  },
  {
    id: "tour",
    label: "Virtual Tour",
    icon: Video,
    turns: [
      { who: "user", text: "Can I walk through 2135 W 8th Ave?" },
      { who: "agent", pose: "pointing", text: "Loading 360° tour. I'll narrate the layout as you move — ask about ceiling heights, appliances, or strata rules." },
      { who: "user", text: "What's the strata age & rental policy?" },
      { who: "agent", pose: "thinking", text: "Building built 2018. Rentals allowed with no minimum term. Full strata docs are gated behind your Client Journey." },
    ],
  },
  {
    id: "neighbourhood",
    label: "Neighbourhood",
    icon: MapPin,
    turns: [
      { who: "user", text: "How is Kitsilano for a young family?" },
      { who: "agent", pose: "thinking", text: "Retrieving BC public data: schools, transit, walkability, parks. All figures cite source and last-updated date." },
      { who: "user", text: "Nearest school with French immersion?" },
      { who: "agent", pose: "pointing", text: "École Bilingue Elementary — 0.8 km walk. Catchment map available in your saved journey." },
    ],
  },
  {
    id: "buyerinsights",
    label: "Buyer Insights",
    icon: Building2,
    turns: [
      { who: "user", text: "How's the West Side condo market right now?" },
      { who: "agent", pose: "thinking", text: "Retrieving BC MLS® stats for Vancouver West condos — inventory, days-on-market, and 90-day list-price trend. Sourced from CREA DDF®, not a forecast." },
      { who: "user", text: "Are prices going up or down?" },
      { who: "agent", pose: "pointing", text: "List prices are trending slightly higher over the last 90 days on lower supply. These are past & current list prices only — nothing here predicts what any home will sell for." },
    ],
  },
  {
    id: "sellerlookup",
    label: "Seller Insights",
    icon: HomeIcon,
    turns: [
      { who: "user", text: "I'm thinking of selling my Burnaby townhouse — what are similar ones going for?" },
      { who: "agent", pose: "thinking", text: "Pulling active BC MLS® comparables in your postal code. Retrieving days-on-market and recent solds — sourced, not a valuation." },
      { who: "user", text: "How long are they taking to sell?" },
      { who: "agent", pose: "pointing", text: "3 active 3-bed townhomes right now — average 12 days on market at $1.39–$1.45M. For a formal Comparative Market Analysis, Doug can prepare one — nothing here is an appraisal." },
    ],
  },
  {
    id: "qualify",
    label: "Consultation Request",
    icon: ClipboardList,
    turns: [
      { who: "agent", text: "Ready when you are — this is a short, consent-first questionnaire that goes straight to Doug LeMaire, REALTOR®. Nothing is sent until you tick consent." },
      { who: "user", text: "Sure — I want to sell my Burnaby townhouse in the spring." },
      { who: "agent", pose: "thinking", text: "Capturing timeline, property type, and preferred contact channel. Doug (BCFSA #167790) will personally review your request and reach out within 1 business day." },
      { who: "agent", pose: "celebrating", text: "Thanks! Your consultation request is on Doug's desk. ✓" },
    ],
  },
];

// ── Chip prompts (per scenario) ──────────────────────────────────────────────
const CHIPS = {
  search: ["2BR Kitsilano <$1.5M", "West Side condos", "Ocean view homes"],
  tour: ["360° walkthrough", "Strata rules?", "Storage & parking"],
  neighbourhood: ["Schools nearby", "Transit score", "Parks & rec"],
  buyerinsights: ["Days on market", "Inventory now", "90-day trend"],
  sellerlookup: ["Comparable actives", "Days on market", "Recent sold prices"],
  qualify: ["Start questionnaire", "Book a consultation", "Market Estimate"],
};

// ── Scripted "voice-input" pairs (per scenario) ──────────────────────────────
// Each entry is what the user "says" via voice and what Doogie retrieves back.
// Voice bubbles carry a `voice: true` flag so they render with a speaker glyph.
const VOICE_SCRIPT = {
  search: {
    heard: "Any of those with parking and in-suite laundry?",
    reply: "Three of the four match. 2135 W 8th Ave has secured underground and full-size laundry. Educational retrieval only — not advice.",
  },
  tour: {
    heard: "How tall are the ceilings in the living room?",
    reply: "Nine feet over-height across the living space, with a soffit drop of four inches at the kitchen edge. Retrieved from the strata plan — not advice.",
  },
  neighbourhood: {
    heard: "How's the summer walk to the beach with a stroller?",
    reply: "Six-minute stroller-friendly walk to Kits Beach via Cornwall — curb-cut sidewalks the entire way. Sourced from CoV Open Data. Educational retrieval only.",
  },
  buyerinsights: {
    heard: "How competitive is Vancouver West for condos this month?",
    reply: "Right now: 82 active 2-bed condos, median list $1.28M, average 14 days on market. List prices are trending slightly higher over the last 90 days. Sourced from CREA DDF® — not a forecast.",
  },
  sellerlookup: {
    heard: "Any recent solds on my street I can compare?",
    reply: "Two solds on your block in the last 90 days — $1.36M and $1.42M. These are past sale prices, not a valuation. Doug can prepare a proper Comparative Market Analysis when you're ready.",
  },
  qualify: {
    heard: "Book me a Thursday morning call, please.",
    reply: "Noted — Thursday morning window, CASL consent captured. Doug (BCFSA #167790) will personally confirm within one business day. Nothing sent yet.",
  },
};

// ── BC Region rotation — Buyer/Seller Insights cycle through these each visit
// to visually reinforce that Doogie retrieves data province-wide, not just
// Metro Van. Illustrative mock numbers; on each mount a random region is picked.
const BC_REGIONS = [
  {
    key: "vancouver-west",
    label: "Vancouver West · 2-bed condos",
    city: "Vancouver West",
    buyer: {
      inventory: 82, median: "$1.28M", range: "$780K – $2.6M", dom: 14,
      trend: [1.19,1.20,1.19,1.21,1.22,1.24,1.25,1.26,1.26,1.27,1.27,1.28], direction: "up",
    },
    seller: {
      label: "Comparable actives · Vancouver · Kitsilano condos",
      count: 12, avgPrice: "$1.35M", priceRange: "$1.19M – $1.49M", avgDom: 6,
      comps: [
        { id: "K1", addr: "2135 W 8th Ave", city: "Vancouver", price: "$1,289,000", beds: 2, baths: 2, sqft: 872,  dom: 4 },
        { id: "K2", addr: "1802 Balsam St",  city: "Vancouver", price: "$1,449,000", beds: 2, baths: 2, sqft: 940,  dom: 11 },
        { id: "K3", addr: "3110 Yew St",     city: "Vancouver", price: "$1,199,000", beds: 2, baths: 1, sqft: 815,  dom: 2 },
      ],
    },
  },
  {
    key: "whistler",
    label: "Whistler · Alpine chalets",
    city: "Whistler",
    buyer: {
      inventory: 34, median: "$2.65M", range: "$895K – $8.2M", dom: 42,
      trend: [2.72,2.70,2.69,2.68,2.66,2.64,2.65,2.63,2.64,2.65,2.65,2.65], direction: "flat",
    },
    seller: {
      label: "Comparable actives · Whistler · 3-bed chalets",
      count: 6, avgPrice: "$2.85M", priceRange: "$1.99M – $4.2M", avgDom: 38,
      comps: [
        { id: "W1", addr: "4899 Painted Cliff Rd", city: "Whistler", price: "$3,190,000", beds: 3, baths: 3, sqft: 2140, dom: 22 },
        { id: "W2", addr: "6224 Fairway Dr",       city: "Whistler", price: "$2,650,000", beds: 3, baths: 3, sqft: 1980, dom: 44 },
        { id: "W3", addr: "8080 Nicklaus North",   city: "Whistler", price: "$2,995,000", beds: 3, baths: 4, sqft: 2210, dom: 51 },
      ],
    },
  },
  {
    key: "kelowna",
    label: "Kelowna · Lakefront homes",
    city: "Kelowna",
    buyer: {
      inventory: 118, median: "$895K", range: "$540K – $3.4M", dom: 26,
      trend: [0.86,0.87,0.87,0.88,0.88,0.89,0.89,0.90,0.90,0.90,0.89,0.895], direction: "up",
    },
    seller: {
      label: "Comparable actives · Kelowna · 4-bed detached",
      count: 22, avgPrice: "$1.12M", priceRange: "$820K – $1.6M", avgDom: 21,
      comps: [
        { id: "KL1", addr: "3140 Watt Rd",     city: "Kelowna", price: "$1,150,000", beds: 4, baths: 3, sqft: 2450, dom: 12 },
        { id: "KL2", addr: "2688 Country Rd",  city: "Kelowna", price: "$1,050,000", beds: 4, baths: 3, sqft: 2280, dom: 24 },
        { id: "KL3", addr: "555 Yates Rd",     city: "Kelowna", price: "$1,180,000", beds: 4, baths: 4, sqft: 2610, dom: 8  },
      ],
    },
  },
  {
    key: "nanaimo",
    label: "Nanaimo · Family homes",
    city: "Nanaimo",
    buyer: {
      inventory: 76, median: "$785K", range: "$460K – $2.1M", dom: 18,
      trend: [0.77,0.77,0.78,0.78,0.79,0.79,0.79,0.79,0.78,0.78,0.78,0.785], direction: "flat",
    },
    seller: {
      label: "Comparable actives · Nanaimo · 3-bed detached",
      count: 18, avgPrice: "$820K", priceRange: "$625K – $1.05M", avgDom: 17,
      comps: [
        { id: "N1", addr: "4210 Departure Bay Rd", city: "Nanaimo", price: "$799,000", beds: 3, baths: 2, sqft: 1780, dom: 14 },
        { id: "N2", addr: "6001 Hammond Bay Rd",   city: "Nanaimo", price: "$845,000", beds: 3, baths: 3, sqft: 1920, dom: 21 },
        { id: "N3", addr: "1220 Estevan Rd",       city: "Nanaimo", price: "$815,000", beds: 3, baths: 2, sqft: 1650, dom: 16 },
      ],
    },
  },
  {
    key: "prince-george",
    label: "Prince George · Detached",
    city: "Prince George",
    buyer: {
      inventory: 142, median: "$465K", range: "$220K – $1.1M", dom: 32,
      trend: [0.46,0.46,0.46,0.47,0.47,0.47,0.47,0.47,0.47,0.46,0.465,0.465], direction: "flat",
    },
    seller: {
      label: "Comparable actives · Prince George · 4-bed detached",
      count: 34, avgPrice: "$525K", priceRange: "$385K – $720K", avgDom: 29,
      comps: [
        { id: "PG1", addr: "4485 Kimball Rd",   city: "Prince George", price: "$549,000", beds: 4, baths: 2, sqft: 2100, dom: 24 },
        { id: "PG2", addr: "2810 Rosia Rd",     city: "Prince George", price: "$495,000", beds: 4, baths: 3, sqft: 1960, dom: 33 },
        { id: "PG3", addr: "7250 Simon Fraser", city: "Prince George", price: "$580,000", beds: 4, baths: 3, sqft: 2240, dom: 19 },
      ],
    },
  },
  {
    key: "victoria",
    label: "Victoria · Downtown condos",
    city: "Victoria",
    buyer: {
      inventory: 94, median: "$675K", range: "$395K – $1.9M", dom: 22,
      trend: [0.66,0.66,0.67,0.67,0.67,0.67,0.68,0.68,0.68,0.67,0.675,0.675], direction: "up",
    },
    seller: {
      label: "Comparable actives · Victoria · 2-bed downtown condos",
      count: 16, avgPrice: "$710K", priceRange: "$520K – $985K", avgDom: 24,
      comps: [
        { id: "V1", addr: "838 Yates St",     city: "Victoria", price: "$695,000", beds: 2, baths: 2, sqft: 890,  dom: 18 },
        { id: "V2", addr: "1015 Pandora Ave", city: "Victoria", price: "$749,000", beds: 2, baths: 2, sqft: 970,  dom: 26 },
        { id: "V3", addr: "760 Johnson St",   city: "Victoria", price: "$685,000", beds: 2, baths: 2, sqft: 860,  dom: 22 },
      ],
    },
  },
];
// Pick a stable-per-tab region so the same visitor doesn't see the numbers
// change mid-session (uses sessionStorage). Rotates on a fresh browser tab.
function useRotatingRegion() {
  return useMemo(() => {
    try {
      const cached = typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("ez_visual_agent_region") : null;
      if (cached) {
        const hit = BC_REGIONS.find(r => r.key === cached);
        if (hit) return hit;
      }
      const pick = BC_REGIONS[Math.floor(Math.random() * BC_REGIONS.length)];
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem("ez_visual_agent_region", pick.key);
      return pick;
    } catch {
      return BC_REGIONS[0];
    }
  }, []);
}

// ── Mock MLS listings (visual only) ──────────────────────────────────────────
const MOCK_LISTINGS = [
  { id: "L1", addr: "2135 W 8th Ave", city: "Kitsilano", price: "$1,289,000", beds: 2, baths: 2, sqft: 872, dom: 4, tag: "Beach 400m" },
  { id: "L2", addr: "1802 Balsam St",  city: "Kitsilano", price: "$1,449,000", beds: 2, baths: 2, sqft: 940, dom: 11, tag: "Corner unit" },
  { id: "L3", addr: "3110 Yew St",     city: "Kitsilano", price: "$1,199,000", beds: 2, baths: 1, sqft: 815, dom: 2, tag: "New listing" },
  { id: "L4", addr: "2455 Cornwall Ave",city: "Kitsilano", price: "$1,495,000", beds: 2, baths: 2, sqft: 1010, dom: 7, tag: "Ocean peek" },
];

// ── Mock comparable actives (Seller Insights scenario) ───────────────────────
const MOCK_COMPS = [
  { id: "C1", addr: "5148 Sardis St",   city: "Burnaby", price: "$1,398,000", beds: 3, baths: 3, sqft: 1560, dom: 6,  status: "Active" },
  { id: "C2", addr: "5203 Neville St",  city: "Burnaby", price: "$1,449,000", beds: 3, baths: 3, sqft: 1620, dom: 12, status: "Active" },
  { id: "C3", addr: "4972 Union St",    city: "Burnaby", price: "$1,325,000", beds: 3, baths: 2, sqft: 1490, dom: 18, status: "Active" },
];

// ── Reusable pill/tag ────────────────────────────────────────────────────────
const Pill = ({ children, tone = "navy", size = "sm", ...rest }) => (
  <span
    {...rest}
    style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: size === "sm" ? "4px 10px" : "6px 14px",
      borderRadius: 999,
      fontSize: size === "sm" ? 11 : 13,
      fontWeight: 600,
      letterSpacing: 0.3,
      background: tone === "green" ? "rgba(34,197,94,0.12)"
                : tone === "gold"  ? "rgba(245,166,35,0.12)"
                : tone === "glass" ? "rgba(255,255,255,0.12)"
                : "rgba(30,79,207,0.10)",
      color: tone === "green" ? "#15803D"
           : tone === "gold"  ? "#B45309"
           : tone === "glass" ? "#fff"
           : C.navy,
      border: tone === "glass" ? "1px solid rgba(255,255,255,0.22)" : "none",
    }}
  >
    {children}
  </span>
);

// ── Animated waveform (mock mic activity) ────────────────────────────────────
const Waveform = ({ active, intense = false }) => {
  const bars = 14;
  return (
    <div data-testid="visual-agent-waveform" style={{ display: "flex", alignItems: "center", gap: 3, height: 22 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          animate={{ scaleY: active ? (intense ? [0.5, 1.4, 0.7, 1.2, 0.4] : [0.3, 1, 0.4, 0.9, 0.2]) : 0.3 }}
          transition={{ duration: (intense ? 0.6 : 1.1) + (i % 4) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
          style={{
            display: "inline-block", width: 3, height: "100%",
            background: active ? (intense ? "#FFD98A" : C.gold) : "rgba(255,255,255,0.35)",
            borderRadius: 2, transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
};

// ── Voice UI helpers ─────────────────────────────────────────────────────────
const VoiceDots = ({ light = false }) => (
  <span data-testid="voice-dots" style={{ display: "inline-flex", gap: 3, verticalAlign: "middle" }}>
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
        style={{
          display: "inline-block", width: 5, height: 5, borderRadius: "50%",
          background: light ? "#FFD98A" : C.gold,
        }}
      />
    ))}
  </span>
);

const Cursor = ({ active }) => (
  <motion.span
    animate={{ opacity: active ? [1, 0, 1] : 0 }}
    transition={{ duration: 0.9, repeat: Infinity }}
    style={{ display: "inline-block", width: 1, height: 14, background: C.navy, marginLeft: 2, verticalAlign: "middle" }}
  />
);

// ── Right pane: Search scenario (listing carousel + real area input) ─────────
const PaneSearch = ({ query, setQuery, committed, onCommit }) => {
  const submit = (e) => {
    e && e.preventDefault && e.preventDefault();
    onCommit(query);
  };
  return (
    <div data-testid="pane-search" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>Live from CREA DDF® · {committed} · 2BR · &lt;$1.5M</strong>
        <Pill tone="green"><Radio size={12}/> {MOCK_LISTINGS.length}+ active</Pill>
      </div>

      {/* Real search input — type any BC area or ask by voice */}
      <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{
          flex: "1 1 260px", position: "relative",
        }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6B7280" }}/>
          <input
            data-testid="search-area-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a BC area — e.g. Kitsilano, Whistler, Kelowna, Nanaimo, Cranbrook"
            style={{
              width: "100%", padding: "9px 12px 9px 32px",
              borderRadius: 10, border: "1px solid #D1D5DB",
              fontSize: 13, fontFamily: "inherit", background: "#fff",
            }}
          />
        </div>
        <button
          type="submit"
          data-testid="search-area-submit"
          style={{
            padding: "9px 16px", borderRadius: 10, border: "none",
            background: C.navy, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >Search</button>
      </form>
      <div style={{ fontSize: 11, color: "#6B7280", marginTop: -2 }}>
        Prefer voice? Tap <strong>Ask by voice</strong> at the top-right and just say where you're looking.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {MOCK_LISTINGS.map((l, i) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            data-testid={`mock-listing-${l.id}`}
            style={{
              background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
              overflow: "hidden", boxShadow: "0 1px 2px rgba(15,42,91,0.04)",
            }}
          >
            <div style={{
              height: 96,
              background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
              position: "relative",
            }}>
              <span style={{
                position: "absolute", top: 8, left: 8, background: "rgba(255,255,255,0.9)",
                color: C.navy, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
              }}>{l.tag}</span>
              <Building2 size={44} style={{ position: "absolute", right: 10, bottom: 10, color: "rgba(255,255,255,0.55)" }}/>
            </div>
            <div style={{ padding: 10 }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{l.price}</div>
              <div style={{ fontSize: 12, color: "#4B5563", marginTop: 2 }}>{l.addr} · {committed !== "Kitsilano" ? committed : l.city}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6, display: "flex", gap: 8 }}>
                <span>{l.beds}bd</span><span>·</span><span>{l.baths}ba</span><span>·</span><span>{l.sqft} sqft</span><span>·</span><span>{l.dom}d</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>
        Illustrative sample · every real search hits <a href="/listings" style={{ color: C.blue, fontWeight: 600 }}>/listings</a> with full BC MLS® coverage.
      </div>
    </div>
  );
};

// ── Right pane: Virtual Tour (360° mock with hotspots + real tour library) ───
const TOUR_PROVIDERS = {
  matterport: {
    label: "Matterport",
    src: "https://my.matterport.com/show/?m=SxQL3iX8xSJ&play=1&qs=1",
    caption: "Matterport public demo · illustrative only",
  },
  kuula: {
    label: "Kuula",
    src: "https://kuula.co/share/collection/7YlBd?fs=1&vr=0&sd=1&thumbs=1&info=0&logo=1&inst=0",
    caption: "Kuula public demo · illustrative only",
  },
};
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaneTour = () => {
  const [hot, setHot] = useState(null);
  const [mode, setMode] = useState("mock");           // "mock" | "live"
  // Provider tab: "dougs" (Doug's real MLS listings) | "kuula" | "matterport"
  const [provider, setProvider] = useState("dougs");
  const [dougTours, setDougTours] = useState(null);   // null=loading, []=none, [...]=have
  const [dougPick, setDougPick] = useState(0);        // index within dougTours

  // Fetch Doug's live listings with virtual tours on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/tours/library?limit=12`);
        const data = await res.json();
        if (!cancelled) setDougTours(Array.isArray(data.listings) ? data.listings : []);
      } catch {
        if (!cancelled) setDougTours([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // If Doug has no tours yet, silently fall back so "Live 360°" still works.
  const dougReady = Array.isArray(dougTours) && dougTours.length > 0;
  const activeProvider =
    provider === "dougs" && !dougReady ? "kuula" : provider;
  const P = TOUR_PROVIDERS[activeProvider] || TOUR_PROVIDERS.kuula;
  const dougPicked = dougReady ? dougTours[Math.min(dougPick, dougTours.length - 1)] : null;

  const iframeSrc = provider === "dougs" && dougPicked
    ? dougPicked.tour_url
    : P.src;
  const captionText = provider === "dougs" && dougPicked
    ? `${dougPicked.tour_unbranded ? "Unbranded" : "Branded"} tour · CREA DDF® · ${dougPicked.city}`
    : P.caption;

  const hotspots = [
    { id: "kitchen", x: 22, y: 55, label: "Kitchen · Bosch appliances" },
    { id: "ceiling", x: 55, y: 22, label: "9' over-height ceilings" },
    { id: "view", x: 78, y: 40, label: "SW peek to English Bay" },
  ];

  const headerAddr = provider === "dougs" && dougPicked
    ? `${dougPicked.address || dougPicked.mls_number}${dougPicked.city ? " · " + dougPicked.city : ""}`
    : "2135 W 8th Ave";

  return (
    <div data-testid="pane-tour" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>360° Tour · {headerAddr}</strong>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{
            display: "inline-flex", padding: 3, background: "#EEF2FB",
            borderRadius: 99, border: "1px solid #DDE6FA",
          }}>
            <button
              data-testid="tour-mode-mock"
              onClick={() => setMode("mock")}
              style={{
                border: "none", cursor: "pointer",
                padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                background: mode === "mock" ? C.navy : "transparent",
                color: mode === "mock" ? "#fff" : C.navy,
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
            ><Compass size={11}/> Mock</button>
            <button
              data-testid="tour-mode-live"
              onClick={() => setMode("live")}
              style={{
                border: "none", cursor: "pointer",
                padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                background: mode === "live" ? C.green : "transparent",
                color: mode === "live" ? "#fff" : C.navy,
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
            ><Radio size={11}/> Live 360°</button>
          </div>
          <Pill tone={mode === "live" ? "green" : "gold"}>
            {mode === "live"
              ? <><Radio size={12}/> {provider === "dougs" && dougReady ? "Doug's MLS" : P.label}</>
              : <><Compass size={12}/> Interactive</>}
          </Pill>
        </div>
      </div>

      {mode === "live" && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 11, color: "#6B7280" }}>
          <span style={{ fontWeight: 600, color: C.navy }}>Source:</span>
          <button
            data-testid="tour-provider-dougs"
            onClick={() => setProvider("dougs")}
            disabled={dougTours === null}
            style={{
              border: "1px solid " + (provider === "dougs" ? C.green : "#DDE6FA"),
              background: provider === "dougs" ? "rgba(34,197,94,0.10)" : "#fff",
              color: provider === "dougs" ? "#15803D" : C.navy,
              fontWeight: 700, cursor: dougTours === null ? "wait" : "pointer",
              padding: "3px 10px", borderRadius: 99, fontSize: 11,
              display: "inline-flex", alignItems: "center", gap: 5,
            }}
          >
            <Building2 size={11}/> Doug's Listings
            {dougTours === null ? " …"
              : dougReady ? ` · ${dougTours.length}`
              : " · 0 (using demo)"}
          </button>
          {Object.entries(TOUR_PROVIDERS).map(([k, v]) => (
            <button
              key={k}
              data-testid={`tour-provider-${k}`}
              onClick={() => setProvider(k)}
              style={{
                border: "1px solid " + (provider === k ? C.blue : "#DDE6FA"),
                background: provider === k ? "rgba(30,79,207,0.08)" : "#fff",
                color: provider === k ? C.blue : C.navy,
                fontWeight: 700, cursor: "pointer",
                padding: "3px 10px", borderRadius: 99, fontSize: 11,
              }}
            >{v.label}</button>
          ))}
          {provider === "dougs" && dougReady && (
            <select
              data-testid="tour-doug-listing-select"
              value={dougPick}
              onChange={(e) => setDougPick(Number(e.target.value))}
              style={{
                marginLeft: "auto", padding: "4px 8px", borderRadius: 8,
                border: "1px solid #DDE6FA", background: "#fff",
                color: C.navy, fontSize: 11, fontWeight: 600,
                maxWidth: 320,
              }}
            >
              {dougTours.map((l, i) => (
                <option key={l.listing_key} value={i}>
                  {(l.address || l.mls_number)}
                  {l.city ? ` · ${l.city}` : ""}
                  {l.list_price ? ` · $${Number(l.list_price).toLocaleString()}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {mode === "live" && provider === "dougs" && !dougReady && dougTours !== null && (
        <div style={{
          background: "rgba(245,166,35,0.08)", border: "1px dashed rgba(245,166,35,0.5)",
          borderRadius: 10, padding: 10, fontSize: 11, color: "#78350F",
        }}>
          <strong>No CREA DDF® tours indexed yet.</strong> Doug's live tours will appear here on the next
          DDF sync (every 4 hours). Falling back to a Kuula public demo for now.
        </div>
      )}

      <AnimatePresence mode="wait">
        {mode === "live" ? (
          <motion.div
            key={`live-${provider}-${dougPick}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-testid="tour-live-embed-wrap"
            style={{
              position: "relative", height: 340, borderRadius: 12, overflow: "hidden",
              border: "1px solid #E5E7EB", background: C.ink,
            }}
          >
            <iframe
              title={`Live 360° virtual tour (${captionText})`}
              src={iframeSrc}
              width="100%" height="100%"
              frameBorder="0"
              allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
              allowFullScreen
              style={{ border: 0, display: "block" }}
              data-testid="tour-live-iframe"
            />
            <div style={{
              position: "absolute", left: 10, top: 10, background: "rgba(15,42,91,0.85)",
              color: "#fff", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: 6, backdropFilter: "blur(6px)",
            }}>
              <Radio size={12} color={provider === "dougs" && dougPicked ? C.green : C.gold}/> {captionText}
            </div>
            {/* Floating Doogie narrator badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              data-testid="tour-doogie-narrator"
              style={{
                position: "absolute", right: 12, bottom: 12,
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.94)", color: C.navy,
                padding: "6px 12px 6px 6px", borderRadius: 999,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                border: `1px solid ${C.gold}`,
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "#FFF4D9",
                border: `2px solid ${C.gold}`, flexShrink: 0,
                overflow: "hidden",
              }}>
                <img
                  src={DOOGIE.pointing} alt="Doogie pointing"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: 0.5, textTransform: "uppercase" }}>Doogie · Your Guide</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Ask about ceilings, strata, or nearby amenities</div>
                <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2, fontStyle: "italic" }}>General information only — not advice</div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="mock"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "relative", height: 280, borderRadius: 12, overflow: "hidden",
              background: `radial-gradient(1200px 400px at 30% 40%, #4C74E8 0%, ${C.navy} 60%, ${C.ink} 100%)`,
              border: "1px solid #E5E7EB",
            }}
          >
            {/* mock horizon */}
            <div style={{ position: "absolute", inset: 0, backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 40px), radial-gradient(300px 100px at 50% 62%, rgba(245,166,35,0.25), transparent 70%)"
            }}/>
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 0, height: "38%",
              background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.35))",
            }}/>
            {hotspots.map(h => (
              <motion.button
                key={h.id}
                data-testid={`tour-hotspot-${h.id}`}
                onMouseEnter={() => setHot(h)}
                onFocus={() => setHot(h)}
                onMouseLeave={() => setHot(null)}
                onBlur={() => setHot(null)}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: (h.x % 5) * 0.2 }}
                style={{
                  position: "absolute", left: `${h.x}%`, top: `${h.y}%`,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "rgba(245,166,35,0.95)", border: "2px solid #fff",
                  boxShadow: "0 0 0 6px rgba(245,166,35,0.25)", cursor: "pointer",
                }}
                aria-label={h.label}
              />
            ))}
            <div style={{ position: "absolute", left: 12, bottom: 10, color: "#fff", fontSize: 12, opacity: 0.85 }}>
              Drag to look around · Tap dots for narration
            </div>
            {/* Floating Doogie narrator badge (mock mode) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                position: "absolute", right: 12, bottom: 12,
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.94)", color: C.navy,
                padding: "6px 12px 6px 6px", borderRadius: 999,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                border: `1px solid ${C.gold}`,
              }}
            >
              <img
                src={DOOGIE_HEADSHOT} alt="Doogie narrator"
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  objectFit: "cover", objectPosition: "center 42%",
                  border: `2px solid ${C.gold}`, flexShrink: 0,
                }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <div style={{ display: "grid", lineHeight: 1.2 }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>Ask Doogie · research helper</span>
                <span style={{ fontSize: 9, opacity: 0.65, fontStyle: "italic" }}>General information only — not advice</span>
              </div>
            </motion.div>
            <AnimatePresence>
              {hot && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    position: "absolute", right: 12, top: 12, maxWidth: 220,
                    background: "rgba(255,255,255,0.95)", color: C.navy, padding: "8px 12px",
                    borderRadius: 10, fontSize: 12, fontWeight: 600, boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                  }}
                >{hot.label}</motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "#4B5563" }}>
        <span>Built 2018</span><span>·</span><span>Rentals OK</span><span>·</span><span>Pets w/ restrictions</span><span>·</span><span>Strata $412/mo</span>
      </div>
    </div>
  );
};

// ── Right pane: Neighbourhood insights ───────────────────────────────────────
const PaneNeighbourhood = () => {
  const stats = [
    { icon: School, label: "École Bilingue Elem.", value: "0.8 km", sub: "French Immersion" },
    { icon: Bus, label: "Transit score", value: "88 / 100", sub: "4th Ave B-Line" },
    { icon: Trees, label: "Parks within 500m", value: "3", sub: "Kits Beach · Connaught · Volunteer" },
    { icon: Waves, label: "Walk to shoreline", value: "6 min", sub: "English Bay" },
  ];
  return (
    <div data-testid="pane-neighbourhood" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>Kitsilano · Vancouver West</strong>
        <Pill tone="green"><CheckCircle2 size={12}/> Public data · sourced</Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.blue }}>
              <s.icon size={16}/>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginTop: 6 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{s.sub}</div>
          </motion.div>
        ))}
      </div>
      <div style={{
        marginTop: 4, background: C.mist, border: "1px dashed #C7D2E8",
        borderRadius: 12, padding: 12, height: 120, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage:
          "repeating-linear-gradient(0deg, rgba(15,42,91,0.06) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(15,42,91,0.06) 0 1px, transparent 1px 22px)"
        }}/>
        <MapPin size={22} color={C.blue} style={{ position: "absolute", left: "40%", top: "45%" }}/>
        <MapPin size={16} color={C.gold} style={{ position: "absolute", left: "22%", top: "60%" }}/>
        <MapPin size={16} color={C.gold} style={{ position: "absolute", left: "68%", top: "30%" }}/>
        <div style={{ position: "absolute", right: 10, bottom: 8, fontSize: 11, color: "#6B7280" }}>Mock map · CoV Open Data</div>
      </div>
    </div>
  );
};

// ── Right pane: Buyer Insights (inventory + DOM + 90-day trend) ──────────────
const PaneBuyerInsights = () => {
  const region = useRotatingRegion();
  const [freshness, setFreshness] = useState("recently");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/tours/library?limit=1`);
        if (r.ok && !cancelled) setFreshness("in the last 4 hours");
      } catch { /* keep default */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const b = region.buyer;
  const trend = b.trend;
  const minV = Math.min(...trend), maxV = Math.max(...trend);
  const trendW = 260, trendH = 60;
  const pts = trend.map((v, i) => {
    const x = (i / (trend.length - 1)) * trendW;
    const y = trendH - ((v - minV) / (maxV - minV || 1)) * trendH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const trendArrow = b.direction === "up" ? "▲" : b.direction === "down" ? "▼" : "→";

  return (
    <div data-testid="pane-buyerinsights" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>Buyer snapshot · {region.label}</strong>
        <Pill tone="green" data-testid="buyerinsights-freshness">
          <Radio size={12}/> Source: CREA DDF® · updated {freshness}
        </Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {[
          { label: "Active inventory", value: String(b.inventory), sub: `${region.city} · matching filters` },
          { label: "Median list price", value: b.median, sub: `range ${b.range}` },
          { label: "Avg. days on market", value: String(b.dom), sub: "last 30 days" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}
          >
            <div style={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 700, color: C.blue, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{s.sub}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6, fontStyle: "italic" }}>
              Source: CREA DDF® · {freshness}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 90-day list-price trend sparkline */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>90-day median list price · trend</div>
          <div style={{ fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>Past & present list prices — not a forecast</div>
        </div>
        <svg viewBox={`0 0 ${trendW} ${trendH}`} width="100%" height={trendH + 6} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="ba-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={C.blue} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={C.blue} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <polyline
            points={`0,${trendH} ${pts} ${trendW},${trendH}`}
            fill="url(#ba-grad)" stroke="none"
          />
          <polyline
            points={pts}
            fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx={trendW} cy={trendH - ((trend[trend.length-1] - minV)/(maxV-minV||1))*trendH} r="4" fill={C.gold}/>
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6B7280", marginTop: 2 }}>
          <span>12 weeks ago · ${minV.toFixed(2)}M</span>
          <span>Now · ${trend[trend.length-1].toFixed(2)}M {trendArrow}</span>
        </div>
      </div>

      {/* In-service-area CTA: browse live listings */}
      <div style={{
        background: "rgba(30,79,207,0.06)", border: "1px solid #DDE6FA",
        borderRadius: 10, padding: 12, fontSize: 12.5, color: C.navy, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <ShieldCheck size={18} color={C.blue}/>
        <span style={{ flex: "1 1 280px", lineHeight: 1.55 }}>
          These figures are <strong>list-price statistics from CREA DDF®</strong> — not a prediction of what any home will sell for. Ready to see what's active right now?
        </span>
        <a
          href="/listings"
          data-testid="buyer-browse-cta"
          style={{
            background: C.navy, color: "#fff", padding: "9px 16px", borderRadius: 99,
            fontSize: 12.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(15,42,91,0.25)",
          }}
        >Browse live listings →</a>
      </div>

      {/* Out-of-service-area inline referral */}
      <div style={{
        background: "#FFF8E9", border: "1px solid rgba(245,166,35,0.4)",
        borderRadius: 10, padding: 12, fontSize: 12.5, color: C.navy, lineHeight: 1.6,
      }}>
        <strong>Looking outside Greater Vancouver, the Fraser Valley, or the Sea-to-Sky Corridor?</strong> Doogie retrieves BC-wide MLS® data, and Doug can connect you with a licensed REALTOR® active in your target community.{" "}
        <a
          href="/referral-request"
          data-testid="buyer-out-of-area-referral"
          style={{ color: C.blue, fontWeight: 700, textDecoration: "underline" }}
        >Request a referral REALTOR®</a>
        {" "}— no cost to you.
      </div>
    </div>
  );
};

// ── Right pane: Seller Insights (comparable actives + DOM) ───────────────────
const PaneSellerLookup = () => {
  const region = useRotatingRegion();
  const s = region.seller;
  // Freshness indicator — fetched from /api/tours/library sync log so consumers
  // see how current the CREA DDF® pull is. Falls back to "recently" if the
  // endpoint doesn't reply.
  const [freshness, setFreshness] = useState("recently");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const alt = await fetch(`${API}/tours/library?limit=1`);
        if (alt.ok && !cancelled) setFreshness("in the last 4 hours");
      } catch { /* keep default */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div data-testid="pane-sellerlookup" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>{s.label}</strong>
        <Pill tone="green" data-testid="sellerlookup-freshness">
          <Radio size={12}/> Source: CREA DDF® · updated {freshness}
        </Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {[
          { label: "Active comps", value: String(s.count), sub: "matching filters" },
          { label: "Avg. list price", value: s.avgPrice, sub: `range ${s.priceRange}` },
          { label: "Avg. days on market", value: String(s.avgDom), sub: "last 30 days" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}
          >
            <div style={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 700, color: C.blue, textTransform: "uppercase" }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginTop: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{stat.sub}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6, fontStyle: "italic" }}>
              Source: CREA DDF® · {freshness}
            </div>
          </motion.div>
        ))}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {s.comps.map((l, i) => (
          <motion.div
            key={l.id}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}
            data-testid={`mock-comp-${l.id}`}
            style={{
              background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10,
              padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ fontWeight: 700, color: C.navy, fontSize: 13 }}>{l.addr} <span style={{ color: "#6B7280", fontWeight: 500 }}>· {l.city}</span></div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                {l.beds}bd · {l.baths}ba · {l.sqft} sqft · {l.dom}d on market
              </div>
            </div>
            <div style={{ fontWeight: 700, color: C.blue, fontSize: 14 }}>{l.price}</div>
            <Pill tone="green">Active</Pill>
          </motion.div>
        ))}
      </div>

      {/* In-service-area CTA: Market Estimate */}
      <div style={{
        marginTop: 4, background: "rgba(30,79,207,0.06)", border: "1px solid #DDE6FA",
        borderRadius: 10, padding: 12, fontSize: 12.5, color: C.navy, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <ShieldCheck size={18} color={C.blue}/>
        <span style={{ flex: "1 1 280px", lineHeight: 1.55 }}>
          These figures are <strong>past & present list prices</strong> from CREA DDF® — not a valuation. If your home is in <strong>Greater Vancouver, the Fraser Valley, or the Sea-to-Sky Corridor</strong>, Doug can prepare a <strong>Market Estimate</strong> for you.
        </span>
        <a
          href="https://eztofind.ca/valuation"
          data-testid="market-estimate-cta"
          style={{
            background: C.navy, color: "#fff", padding: "9px 16px", borderRadius: 99,
            fontSize: 12.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(15,42,91,0.25)",
          }}
        >Market Estimate →</a>
      </div>

      {/* Out-of-service-area: inline referral link at the end of the paragraph */}
      <div style={{
        background: "#FFF8E9", border: "1px solid rgba(245,166,35,0.4)",
        borderRadius: 10, padding: 12, fontSize: 12.5, color: C.navy, lineHeight: 1.6,
      }}>
        <strong>Outside those areas?</strong> Doogie can still help you get connected — Doug maintains a BC-wide network of licensed REALTORS® in every region.{" "}
        <a
          href="/referral-request"
          data-testid="out-of-area-referral"
          style={{ color: C.blue, fontWeight: 700, textDecoration: "underline" }}
        >Request a referral REALTOR®</a>
        {" "}and we'll pair you with someone active in your community. No cost to you.
      </div>
    </div>
  );
};

// ── Right pane: Consultation Request (REAL working questionnaire) ────────────
// This is a live, BCFSA-compliant intake that POSTs to /api/leads/buyer OR
// /api/leads/seller depending on the visitor's stated intent. Fields match
// the backend Pydantic schemas exactly (see server.py: BuyerLead / SellerLead).
const PaneQualify = () => {
  // Step: 1=intent, 2=REALTOR ethics qualifier, 3=contact, 4=buyer/seller specifics, 5=consent+submit
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState("");   // "buyer" | "seller"
  const [alreadyRepresented, setAlreadyRepresented] = useState(null); // null | true | false
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Unified form state — populated conditionally by branch.
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    // buyer-only
    areas: "", budget_range: "$800K – $1.2M", first_time_buyer: false, working_with_realtor: false, financing_status: "Not yet pre-approved",
    // seller-only
    property_address: "", city: "", estimated_value: "Not sure", currently_listed: false,
    // shared
    property_type: "Detached",
    timeline: "3-6 months",
    notes: "",
    preferred_contact: "email",
    casl_consent: false, pipa_ack: false,
    // REALTOR® ethics — final belt-and-braces confirmation on the consent step
    not_represented_confirm: false,
  });
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const progress = step === 1 ? 0 : step === 2 ? 20 : step === 3 ? 40 : step === 4 ? 70 : 100;

  const validStep3 = form.full_name.trim().length >= 2
    && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())
    && form.phone.trim().length >= 7;
  const validStep4Buyer  = form.areas.trim().length >= 2;
  const validStep4Seller = form.property_address.trim().length >= 3 && form.city.trim().length >= 2;
  const validStep5 = form.casl_consent && form.pipa_ack;

  const submit = async () => {
    setError(""); setSubmitting(true);
    try {
      const base = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        timeline: form.timeline,
        preferred_contact: form.preferred_contact,
        notes: form.notes || `Submitted via Doogie Consultation Request (${intent})`,
        casl_consent: form.casl_consent,
        pipa_ack: form.pipa_ack,
        source: `visual_agent_consultation_${intent}`,
        turnstile_token: getTurnstileToken(),
      };
      let url, payload;
      if (intent === "buyer") {
        url = `${API}/leads/buyer`;
        payload = {
          ...base,
          areas: form.areas.split(",").map(a => a.trim()).filter(Boolean),
          property_type: form.property_type,
          budget_range: form.budget_range,
          financing_status: form.financing_status,
          first_time_buyer: form.first_time_buyer,
          working_with_realtor: form.working_with_realtor,
        };
      } else {
        url = `${API}/leads/seller`;
        payload = {
          ...base,
          property_address: form.property_address.trim(),
          city: form.city.trim(),
          property_type: form.property_type,
          estimated_value: form.estimated_value,
          currently_listed: form.currently_listed,
          reason: form.notes || "Submitted via Doogie Consultation Request",
        };
      }
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      setSubmitted(true);
    } catch (e) {
      setError("We couldn't send your request just now. Please try again in a moment, or email hello@eztofind.ca directly.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submitted state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div data-testid="pane-qualify-submitted" style={{ display: "grid", gap: 14, textAlign: "center", paddingTop: 24 }}>
        <img
          src={DOOGIE.celebrating} alt="Doogie celebrating"
          style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", objectPosition: "center 30%", background: "#FFF4D9", border: `3px solid ${C.green}`, margin: "0 auto" }}
        />
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: C.navy, margin: 0 }}>Thanks, {form.full_name.split(" ")[0]}!</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: "#4B5563", maxWidth: 460, marginInline: "auto", lineHeight: 1.55 }}>
          Your consultation request is on Doug's desk. He'll personally review it and reach out within <strong>1 business day</strong>.
          You'll get a confirmation email at <strong>{form.email}</strong> within a few minutes.
        </p>
        <div style={{ fontSize: 11, color: "#6B7280" }}>
          Doug LeMaire, REALTOR® · BCFSA #167790 · Consent record retained per CASL (3 years).
        </div>
      </div>
    );
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  return (
    <div data-testid="pane-qualify" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong style={{ color: C.navy, fontSize: 14 }}>Consultation Request Form</strong>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
            Short questionnaire · goes directly to Doug LeMaire, REALTOR® (BCFSA #167790)
          </div>
        </div>
        <Pill tone="green"><ShieldCheck size={12}/> Consent-first · CASL</Pill>
      </div>

      {/* Progress bar */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
          <span>Step {step} of 5{intent ? ` · ${intent === "buyer" ? "Buyer" : "Seller"} intake` : ""}</span>
          <span>{progress}%</span>
        </div>
        <div style={{ height: 8, background: "#EEF2FB", borderRadius: 99, overflow: "hidden" }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}
            style={{ height: "100%", background: `linear-gradient(90deg, ${C.blue}, ${C.green})` }}/>
        </div>
      </div>

      {/* ── STEP 1 · Intent ────────────────────────────────────────────────── */}
      {step === 1 && (
        <div data-testid="qualify-step-1" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4 }}>What can Doug help you with?</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Pick one — the questions below adapt to your answer.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[
              { k: "buyer", label: "I want to buy", sub: "Explore active listings & budget", icon: Search },
              { k: "seller", label: "I want to sell", sub: "Get a Market Estimate", icon: HomeIcon },
            ].map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.k}
                  data-testid={`intent-${opt.k}`}
                  onClick={() => { setIntent(opt.k); setStep(2); }}
                  style={{
                    padding: "14px 12px", borderRadius: 12, cursor: "pointer",
                    background: intent === opt.k ? C.navy : "#F5F8FF",
                    color: intent === opt.k ? "#fff" : C.navy,
                    border: `1px solid ${intent === opt.k ? C.navy : "#DDE6FA"}`,
                    fontWeight: 700, fontSize: 13, textAlign: "left",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <Icon size={20} color={intent === opt.k ? C.gold : C.blue}/>
                  <div>
                    <div>{opt.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85, marginTop: 2 }}>{opt.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2 · REALTOR® ethics qualifier ────────────────────────────── */}
      {/* Under the REALTOR® Code of Ethics (Article 16) and RESA duties, a
          licensee may not solicit a client already under written contract
          with another REALTOR®. We ask up front so we don't waste anyone's
          time — and so we honour that existing relationship. */}
      {step === 2 && (
        <div data-testid="qualify-step-2" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>
            One quick question first
          </div>
          <div style={{ fontSize: 12.5, color: "#4B5563", lineHeight: 1.55 }}>
            {intent === "buyer"
              ? "Are you currently working with another BC REALTOR® — for example, do you have a signed Buyer's Agency Agreement in place?"
              : "Is your home currently listed with another BC REALTOR®, or do you have a signed listing agreement in place?"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              data-testid="q-realtor-yes"
              onClick={() => setAlreadyRepresented(true)}
              style={{
                padding: "14px 12px", borderRadius: 12, cursor: "pointer",
                background: alreadyRepresented === true ? "#DC2626" : "#FEF2F2",
                color: alreadyRepresented === true ? "#fff" : "#7F1D1D",
                border: `1px solid ${alreadyRepresented === true ? "#DC2626" : "#FCA5A5"}`,
                fontWeight: 700, fontSize: 13,
              }}
            >Yes — I already have a REALTOR®</button>
            <button
              data-testid="q-realtor-no"
              onClick={() => { setAlreadyRepresented(false); setStep(3); }}
              style={{
                padding: "14px 12px", borderRadius: 12, cursor: "pointer",
                background: alreadyRepresented === false ? C.green : "#ECFDF5",
                color: alreadyRepresented === false ? "#fff" : "#065F46",
                border: `1px solid ${alreadyRepresented === false ? C.green : "#6EE7B7"}`,
                fontWeight: 700, fontSize: 13,
              }}
            >No — I am free to work with a REALTOR®</button>
          </div>

          {/* Polite decline — inline instead of blocking modal */}
          {alreadyRepresented === true && (
            <div data-testid="q-polite-decline" style={{
              background: "#FFF8E9", border: "1px solid rgba(245,166,35,0.4)",
              borderRadius: 10, padding: 14, marginTop: 4, lineHeight: 1.6, color: C.navy, fontSize: 13,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "#78350F" }}>Thank you for being upfront.</div>
              Under the REALTOR® Code of Ethics, Doug can't take on a client who's already
              represented by another BC REALTOR®. That's a rule that protects <em>you</em>{" "}
              — it means every REALTOR® honours the relationship you've already built.
              <br/><br/>
              Please continue working with your current REALTOR® — they know your file best.
              If your relationship has ended or the agreement has expired, we'd be glad to
              welcome you back.
              <br/><br/>
              <strong>In the meantime, Doogie can still help</strong> with general BC real
              estate questions, glossary lookups, and neighbourhood facts on the other tabs
              — no consultation request needed.
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => { setAlreadyRepresented(null); setStep(1); }}
                  data-testid="q-decline-restart"
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: "1px solid #D1D5DB",
                    background: "#fff", color: C.navy, fontWeight: 700, fontSize: 12, cursor: "pointer",
                  }}
                >← Start over</button>
                <a
                  href="/glossary"
                  style={{
                    padding: "8px 14px", borderRadius: 8, background: C.navy, color: "#fff",
                    fontWeight: 700, fontSize: 12, textDecoration: "none",
                  }}
                >Browse Doogie's BC glossary →</a>
              </div>
            </div>
          )}

          {alreadyRepresented !== true && (
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setStep(1)}
                style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #D1D5DB", background: "#fff", color: C.navy, fontWeight: 700, cursor: "pointer", fontSize: 13 }}
              >← Back</button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3 · Contact info (shared) ─────────────────────────────────── */}
      {step === 3 && (
        <div data-testid="qualify-step-3" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>How can Doug reach you?</div>
          <TextField label="Full name *" value={form.full_name} onChange={v => upd("full_name", v)} testId="q-full-name"/>
          <TextField label="Email *" type="email" value={form.email} onChange={v => upd("email", v)} testId="q-email"/>
          <TextField label="Phone *" value={form.phone} onChange={v => upd("phone", v)} testId="q-phone"/>
          <SelectField label="Preferred contact" value={form.preferred_contact} onChange={v => upd("preferred_contact", v)}
            testId="q-preferred-contact"
            options={["email", "phone", "text"]}
          />
          <FormNav
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextDisabled={!validStep3}
            nextLabel="Next →"
          />
        </div>
      )}

      {/* ── STEP 4a · BUYER branch ─────────────────────────────────────────── */}
      {step === 4 && intent === "buyer" && (
        <div data-testid="qualify-step-4-buyer" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Tell Doug about your search</div>
          <TextField label="Target areas or cities in BC *" value={form.areas} onChange={v => upd("areas", v)} testId="q-areas" placeholder="e.g. Kitsilano, North Vancouver, Squamish" hint="Comma-separated list is fine"/>
          <SelectField label="Budget range" value={form.budget_range} onChange={v => upd("budget_range", v)} testId="q-budget"
            options={["Under $500K","$500K – $800K","$800K – $1.2M","$1.2M – $1.8M","$1.8M – $2.5M","$2.5M – $4M","Over $4M"]}/>
          <SelectField label="Property type" value={form.property_type} onChange={v => upd("property_type", v)} testId="q-property-type"
            options={["Any","Detached","Townhouse","Condo","Duplex","Land / Acreage","Luxury","Equestrian"]}/>
          <SelectField label="Timeline" value={form.timeline} onChange={v => upd("timeline", v)} testId="q-timeline"
            options={["ASAP","1-3 months","3-6 months","6-12 months","Just looking"]}/>
          <SelectField label="Financing status" value={form.financing_status} onChange={v => upd("financing_status", v)} testId="q-financing"
            options={["Not yet pre-approved","Pre-approved","All cash","Refinancing to buy","Need a mortgage broker referral"]}/>
          <CheckboxField label="First-time buyer" checked={form.first_time_buyer} onChange={v => upd("first_time_buyer", v)} testId="q-first-time"/>
          <TextField label="Anything else Doug should know?" value={form.notes} onChange={v => upd("notes", v)} testId="q-notes" placeholder="Optional" multiline/>
          <FormNav onBack={() => setStep(3)} onNext={() => setStep(5)} nextDisabled={!validStep4Buyer} nextLabel="Next →"/>
        </div>
      )}

      {/* ── STEP 4b · SELLER branch ────────────────────────────────────────── */}
      {step === 4 && intent === "seller" && (
        <div data-testid="qualify-step-4-seller" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Tell Doug about your home</div>
          <TextField label="Property address *" value={form.property_address} onChange={v => upd("property_address", v)} testId="q-address"/>
          <TextField label="City (BC) *" value={form.city} onChange={v => upd("city", v)} testId="q-city"/>
          <SelectField label="Property type" value={form.property_type} onChange={v => upd("property_type", v)} testId="q-property-type"
            options={["Detached","Townhouse","Condo","Duplex","Luxury","Estate Sale / Probate","Equestrian / Acreage","Land"]}/>
          <SelectField label="Timeline" value={form.timeline} onChange={v => upd("timeline", v)} testId="q-timeline"
            options={["ASAP","1-3 months","3-6 months","6-12 months","Just curious"]}/>
          <SelectField label="Your estimated value" value={form.estimated_value} onChange={v => upd("estimated_value", v)} testId="q-est-value"
            options={["Not sure","Under $700K","$700K – $1M","$1M – $1.5M","$1.5M – $2.5M","$2.5M – $4M","Over $4M"]}/>
          <TextField label="Reason for selling / notes (optional)" value={form.notes} onChange={v => upd("notes", v)} testId="q-notes" multiline/>
          <FormNav onBack={() => setStep(3)} onNext={() => setStep(5)} nextDisabled={!validStep4Seller} nextLabel="Next →"/>
        </div>
      )}

      {/* ── STEP 5 · Consent + Submit ──────────────────────────────────────── */}
      {step === 5 && (
        <div data-testid="qualify-step-5" style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>One last thing — your consent</div>
          <div style={{
            background: "#F8FAFF", border: "1px solid #DDE6FA", borderRadius: 10, padding: 12, fontSize: 12, color: "#374151", lineHeight: 1.55,
          }}>
            Doug LeMaire, REALTOR® (<strong>BCFSA #167790</strong>) personally reviews every consultation request. He'll reach out within <strong>1 business day</strong>. Nothing here is a listing, offer, or contract (RESA). Doogie shares general information — not advice.
          </div>
          <CheckboxField
            label={<>I consent to receive commercial electronic messages from EZtoFind.ca (<strong>CASL</strong>). I can unsubscribe any time.</>}
            checked={form.casl_consent} onChange={v => upd("casl_consent", v)} testId="q-casl"
          />
          <CheckboxField
            label={<>I acknowledge the <a href="/privacy" target="_blank" rel="noopener" style={{ color: C.blue, fontWeight: 600 }}>Privacy Policy (PIPA)</a>.</>}
            checked={form.pipa_ack} onChange={v => upd("pipa_ack", v)} testId="q-pipa"
          />
          <CheckboxField
            label={<>I confirm I am <strong>not currently under contract</strong> with another BC REALTOR®.</>}
            checked={form.not_represented_confirm} onChange={v => upd("not_represented_confirm", v)} testId="q-not-represented"
          />
          <TurnstileWidget/>
          {error && (
            <div data-testid="q-submit-error" style={{ background: "#FEE2E2", border: "1px solid #DC2626", color: "#7F1D1D", padding: 10, borderRadius: 8, fontSize: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <button
              data-testid="q-back"
              onClick={() => setStep(4)}
              disabled={submitting}
              style={{
                padding: "10px 14px", borderRadius: 10, border: "1px solid #D1D5DB", background: "#fff",
                color: C.navy, fontWeight: 700, cursor: submitting ? "default" : "pointer", fontSize: 13,
              }}
            >← Back</button>
            <button
              data-testid="q-submit"
              onClick={submit}
              disabled={!validStep5 || !form.not_represented_confirm || submitting}
              style={{
                flex: 1, minWidth: 200,
                padding: "10px 14px", borderRadius: 10, border: "none",
                background: (!validStep5 || !form.not_represented_confirm || submitting) ? "#94A3B8" : C.green,
                color: "#fff", fontWeight: 800, cursor: (!validStep5 || !form.not_represented_confirm || submitting) ? "default" : "pointer",
                fontSize: 13, letterSpacing: 0.2,
                boxShadow: (!validStep5 || !form.not_represented_confirm) ? "none" : "0 6px 16px rgba(34,197,94,0.35)",
              }}
            >{submitting ? "Sending…" : "Send to Doug ✓"}</button>
          </div>
        </div>
      )}

      <div style={{
        background: "linear-gradient(135deg, rgba(30,79,207,0.06), rgba(34,197,94,0.06))",
        border: "1px solid #DDE6FA", borderRadius: 12, padding: 10, fontSize: 11.5, color: C.navy,
      }}>
        <strong>What happens next:</strong> Your responses go straight to Doug LeMaire, REALTOR® (BCFSA #167790). He personally reads every consultation request — no automated outreach. You'll hear from a real person within 1 business day. Doogie shares general information, not advice.
      </div>
    </div>
  );
};

// ── Reusable form fields (used only by PaneQualify) ─────────────────────────
const TextField = ({ label, value, onChange, testId, type = "text", placeholder, hint, multiline }) => (
  <label style={{ display: "grid", gap: 4, fontSize: 12, color: C.navy }}>
    <span style={{ fontWeight: 700 }}>{label}</span>
    {multiline ? (
      <textarea
        data-testid={testId}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
      />
    ) : (
      <input
        data-testid={testId} type={type}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, fontFamily: "inherit" }}
      />
    )}
    {hint && <span style={{ fontSize: 10, color: "#6B7280" }}>{hint}</span>}
  </label>
);

const SelectField = ({ label, value, onChange, options, testId }) => (
  <label style={{ display: "grid", gap: 4, fontSize: 12, color: C.navy }}>
    <span style={{ fontWeight: 700 }}>{label}</span>
    <select
      data-testid={testId}
      value={value} onChange={e => onChange(e.target.value)}
      style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, background: "#fff", fontFamily: "inherit" }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
);

const CheckboxField = ({ label, checked, onChange, testId }) => (
  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "#374151", lineHeight: 1.5, cursor: "pointer" }}>
    <input
      type="checkbox" data-testid={testId}
      checked={checked} onChange={e => onChange(e.target.checked)}
      style={{ marginTop: 2, width: 16, height: 16, accentColor: C.green, cursor: "pointer" }}
    />
    <span>{label}</span>
  </label>
);

const FormNav = ({ onBack, onNext, nextDisabled, nextLabel }) => (
  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
    <button
      onClick={onBack}
      style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #D1D5DB", background: "#fff", color: C.navy, fontWeight: 700, cursor: "pointer", fontSize: 13 }}
    >← Back</button>
    <button
      onClick={onNext} disabled={nextDisabled}
      data-testid="q-next"
      style={{
        flex: 1, padding: "9px 14px", borderRadius: 10, border: "none",
        background: nextDisabled ? "#94A3B8" : C.navy, color: "#fff",
        fontWeight: 700, cursor: nextDisabled ? "default" : "pointer", fontSize: 13,
      }}
    >{nextLabel}</button>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
export default function VisualAgentDemo() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [turnIdx, setTurnIdx] = useState(0);
  // Autoplay only until the user shows any intent. Once they tap, focus, or
  // submit anything we stop cycling scenarios so they can read/type at their
  // own pace. On mobile we start paused so nothing moves under their thumb.
  const [playing, setPlaying] = useState(() => {
    try { return typeof window !== "undefined" && window.innerWidth >= 820; }
    catch { return true; }
  });
  const [userInteracted, setUserInteracted] = useState(false);
  const stopAutoplay = () => {
    if (!userInteracted) setUserInteracted(true);
    setPlaying(false);
  };
  // Voice prototype state
  const [voiceState, setVoiceState] = useState("idle"); // idle | listening | transcribing | replying | done | error
  const [voiceHeard, setVoiceHeard] = useState("");     // progressively typed user speech
  const [voiceReply, setVoiceReply] = useState(null);   // agent narration once recording completes
  const [voiceMode, setVoiceMode] = useState("scripted"); // "scripted" | "live"
  const [voiceError, setVoiceError] = useState("");
  // PIPA §7/§14 — Live voice sends audio to the browser's speech-recognition
  // provider (Google in Chrome/Edge, Apple in Safari), then the transcript hits
  // /api/doogie/chat where PII is redacted before storage. We show a one-time
  // disclosure + consent gate before the first Live recording so the user
  // knows the data flow BEFORE their voice leaves the device.
  const [voicePipaAck, setVoicePipaAck] = useState(() => {
    // Persist ack across sessions so the disclosure only asks once ever
    try { return typeof localStorage !== "undefined" && localStorage.getItem("ez_voice_pipa_ack") === "1"; }
    catch { return false; }
  });
  const [showPipaGate, setShowPipaGate] = useState(false);
  // Ref mirrors `voicePipaAck` so setTimeout callbacks and event handlers
  // fired inside the same tick as the state update see the latest value
  // (React state closures were re-triggering the PIPA gate instead of starting the mic).
  const voicePipaAckRef = useRef(false);
  useEffect(() => { voicePipaAckRef.current = voicePipaAck; }, [voicePipaAck]);
  const [kioskMode, setKioskMode] = useState(false);   // fullscreen voice-only
  // Kiosk audio — Doogie speaks answers aloud in Kiosk mode via /api/doogie/tts.
  // Speaker defaults ON; user can mute via the speaker toggle in the kiosk overlay.
  // Autoplay policy: the mic tap is a user gesture, so subsequent audio playback
  // in the same session is permitted by Chrome/Safari.
  const [speakerOn, setSpeakerOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);
  const ttsAbortRef = useRef(null);
  const recognitionRef = useRef(null);
  const sessionIdRef = useRef(null);
  if (!sessionIdRef.current) {
    // Stable per-tab session for /api/doogie/chat continuity
    sessionIdRef.current = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? `visual-agent-${crypto.randomUUID()}`
      : `visual-agent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  const transcriptRef = useRef(null);

  // ── Persistent BC search (lifted so a top-level always-visible bar can drive
  //     the PaneSearch results and jump the demo straight to Buyer Search).
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCommitted, setSearchCommitted] = useState("Kitsilano");
  const commitSearch = (raw) => {
    const clean = (raw || "").trim();
    if (clean.length < 2) return;
    setSearchCommitted(clean);
    // Jump the demo to Buyer Search + stop the autoplay so the user doesn't
    // lose their results the moment the timer rotates to the next scenario.
    setScenarioIdx(SCENARIOS.findIndex(s => s.id === "search"));
    setTurnIdx(0);
    stopAutoplay();
  };

  const scenario = SCENARIOS[scenarioIdx];
  const visibleTurns = scenario.turns.slice(0, turnIdx + 1);
  const voiceScript = VOICE_SCRIPT[scenario.id];

  // Auto-advance turns; when done, switch to next scenario after a pause.
  // Paused while a voice interaction is active so the demo doesn't jump away.
  // Also paused during the Consultation Request scenario so consumers aren't
  // interrupted mid-form-fill.
  useEffect(() => {
    if (!playing) return;
    if (voiceState !== "idle" && voiceState !== "done") return;
    if (scenario.id === "qualify") return;   // don't auto-leave the live form
    const isLastTurn = turnIdx >= scenario.turns.length - 1;
    // Give consumers breathing room — 7s per turn, 10s before rotating scenario.
    const delay = isLastTurn ? 10000 : 7000;
    const t = setTimeout(() => {
      if (isLastTurn) {
        setScenarioIdx(i => (i + 1) % SCENARIOS.length);
        setTurnIdx(0);
      } else {
        setTurnIdx(i => i + 1);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [turnIdx, scenarioIdx, playing, voiceState, scenario.id, scenario.turns.length]);

  // Reset any voice state when scenario changes.
  useEffect(() => {
    setVoiceState("idle");
    setVoiceHeard("");
    setVoiceReply(null);
    setVoiceError("");
  }, [scenarioIdx]);

  // Autoscroll transcript on new turn or voice update
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [turnIdx, scenarioIdx, voiceHeard, voiceReply]);

  // ── Doogie TTS playback (Kiosk mode) ──────────────────────────────────────
  // Fetches an MP3 blob from /api/doogie/tts (cached by SHA256(text+voice) on
  // the backend for 30 days) and plays it through a single shared <Audio>
  // element. Any prior playback / in-flight fetch is aborted first so a rapid
  // question sequence doesn't stack audio on top of itself.
  const speakDoogie = async (text) => {
    if (!text || typeof text !== "string") return;
    const trimmed = text.trim();
    if (trimmed.length < 3) return;
    // Cancel any current playback / pending fetch
    try {
      if (ttsAbortRef.current) ttsAbortRef.current.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    } catch { /* ignore */ }
    const controller = new AbortController();
    ttsAbortRef.current = controller;
    try {
      setSpeaking(true);
      const res = await fetch(`${API}/doogie/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed.slice(0, 3800), voice: "ash" }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      };
      audio.onerror = () => {
        setSpeaking(false);
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      };
      await audio.play();
    } catch (e) {
      // Autoplay block or fetch abort — silently stop the animation
      setSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    try {
      if (ttsAbortRef.current) ttsAbortRef.current.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    } catch { /* ignore */ }
    setSpeaking(false);
  };

  // Clean up any playing audio when the component unmounts OR the user exits
  // Kiosk mode (audio should never continue in the background).
  useEffect(() => {
    if (!kioskMode) stopSpeaking();
  }, [kioskMode]);
  useEffect(() => () => stopSpeaking(), []);

  // Auto-speak Doogie's final reply once voice interaction lands on "done",
  // but only while Kiosk mode is active AND the speaker toggle is on.
  useEffect(() => {
    if (!kioskMode || !speakerOn) return;
    if (voiceState !== "done") return;
    const reply = (voiceReply || "").trim();
    if (!reply) return;
    speakDoogie(reply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState, voiceReply, kioskMode, speakerOn]);

  // Voice prototype: two modes
  //  • "scripted" — 100% mocked, safe for demo videos, no mic permission needed.
  //  • "live"     — uses browser SpeechRecognition (webkit or standard) to
  //                 transcribe real speech, then hits /api/doogie/chat for a
  //                 real, compliance-guarded Doogie reply. Falls back to
  //                 scripted if the browser doesn't expose SpeechRecognition
  //                 or the user denies mic permission.
  const runScriptedVoice = () => {
    if (!voiceScript) return;
    setVoiceHeard("");
    setVoiceReply(null);
    setVoiceError("");
    setVoiceState("listening");
    setTimeout(() => {
      setVoiceState("transcribing");
      const full = voiceScript.heard;
      let i = 0;
      const iv = setInterval(() => {
        i += 1;
        setVoiceHeard(full.slice(0, i));
        if (i >= full.length) {
          clearInterval(iv);
          setTimeout(() => {
            setVoiceState("replying");
            setTimeout(() => {
              setVoiceReply(voiceScript.reply);
              setVoiceState("done");
            }, 700);
          }, 400);
        }
      }, 32);
    }, 1400);
  };

  const runLiveVoice = () => {
    // PIPA gate — before we hit the browser's SpeechRecognition (which streams
    // audio to Google/Apple servers), the user must acknowledge the disclosure.
    // Read from the ref so a same-tick ack (setTimeout after accept) doesn't
    // re-trigger the gate from a stale closure.
    if (!voicePipaAckRef.current) {
      setShowPipaGate(true);
      return;
    }
    // Feature-detect browser SpeechRecognition
    const SR = typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setVoiceError("Live voice requires Chrome, Edge, or Safari 14.1+. Falling back to scripted mode.");
      setVoiceMode("scripted");
      setTimeout(runScriptedVoice, 300);
      return;
    }
    setVoiceHeard("");
    setVoiceReply(null);
    setVoiceError("");
    setVoiceState("listening");

    const recognition = new SR();
    recognition.lang = "en-CA";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let finalText = "";
    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      const combined = (finalText + interim).trim();
      if (combined) {
        setVoiceState(s => (s === "listening" ? "transcribing" : s));
        setVoiceHeard(combined);
      }
    };
    recognition.onerror = (e) => {
      const errName = e.error || "unknown";
      if (errName === "no-speech") {
        setVoiceError("No speech detected — try again and speak into your mic.");
      } else if (errName === "not-allowed" || errName === "service-not-allowed") {
        setVoiceError("Microphone permission was denied. Enable it in your browser to use live voice.");
        setVoiceMode("scripted");
      } else {
        setVoiceError(`Voice error: ${errName}. You can retry or switch to scripted mode.`);
      }
      setVoiceState("error");
      recognitionRef.current = null;
    };
    recognition.onend = async () => {
      recognitionRef.current = null;
      const spoken = (finalText || voiceHeard || "").trim();
      if (!spoken) {
        // Nothing captured — leave any onerror message to explain.
        if (voiceState === "listening" || voiceState === "transcribing") {
          setVoiceError("Didn't catch that — try speaking a bit louder.");
          setVoiceState("error");
        }
        return;
      }
      // Speech captured — now ask Doogie for a real, compliance-guarded reply.
      // /api/doogie/chat streams SSE `data: {"delta": "..."}` chunks; we
      // concatenate them into a single narration bubble as they arrive.
      setVoiceHeard(spoken);
      setVoiceState("replying");
      setVoiceReply(""); // start empty so bubble mounts and can grow
      try {
        const res = await fetch(`${API}/doogie/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: spoken,
            session_id: sessionIdRef.current,
            language: "en",
          }),
        });
        if (!res.ok || !res.body) throw new Error(`Doogie chat returned ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // Split into SSE events on double newline; keep the trailing partial
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const evt of events) {
            const line = evt.trim();
            if (!line || !line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              const chunk = obj.delta || obj.text || obj.content || "";
              if (chunk) {
                accumulated += chunk;
                setVoiceReply(accumulated);
              }
            } catch { /* ignore malformed frame */ }
          }
        }
        if (!accumulated.trim()) throw new Error("Empty reply from Doogie");
        setVoiceState("done");
      } catch (err) {
        setVoiceError("Doogie couldn't respond right now. Try again in a moment.");
        setVoiceState("error");
      }
    };

    try {
      recognition.start();
    } catch (err) {
      setVoiceError("Couldn't start the microphone — try clicking again.");
      setVoiceState("error");
    }
  };

  const triggerVoice = () => {
    if (voiceState === "listening" || voiceState === "transcribing" || voiceState === "replying") {
      // Second click while live-recording → stop and let onend send the query
      if (voiceMode === "live" && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignored */ }
      }
      return;
    }
    if (voiceMode === "live") runLiveVoice();
    else runScriptedVoice();
  };

  const RightPane = useMemo(() => {
    switch (scenario.id) {
      case "search": return <PaneSearch query={searchQuery} setQuery={setSearchQuery} committed={searchCommitted} onCommit={commitSearch}/>;
      case "tour": return <PaneTour/>;
      case "neighbourhood": return <PaneNeighbourhood/>;
      case "buyerinsights": return <PaneBuyerInsights/>;
      case "sellerlookup": return <PaneSellerLookup/>;
      case "qualify": return <PaneQualify/>;
      default: return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id, searchQuery, searchCommitted]);

  const jumpTo = (i) => { setScenarioIdx(i); setTurnIdx(0); stopAutoplay(); };
  const restart = () => { setScenarioIdx(0); setTurnIdx(0); setUserInteracted(false); setPlaying(true); };
  const voiceActive = voiceState === "listening" || voiceState === "transcribing" || voiceState === "replying";

  return (
    <div data-testid="visual-agent-demo-page" style={{ background: C.cream, minHeight: "100vh", paddingBottom: 60 }}>
      <Helmet>
        <title>Doogie Visual — Interactive Agent Concept · EZtoFind</title>
        <meta name="robots" content="noindex,nofollow"/>
        <meta name="description" content="Internal concept mockup of an interactive visual agent for BC real estate search, virtual tours, and 24/7 qualification."/>
        {/* Cloudflare Turnstile — needed because /visual-agent-demo is not
            wrapped in AppLayout (which normally loads this globally). */}
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer/>
      </Helmet>
      {/* ── Compliance banner ─────────────────────────────────────────────── */}
      <div data-testid="visual-agent-compliance-banner" style={{
        background: C.navy, color: "#fff", textAlign: "center",
        padding: "8px 16px", fontSize: 12, letterSpacing: 0.3,
      }}>
        <ShieldCheck size={12} style={{ verticalAlign: "-2px", marginRight: 6, color: C.gold }}/>
        Doogie provides <strong>general information only — not advice</strong>. BCFSA · CASL · PIPA compliant. For personalized guidance, ask a <a href="/referral-request" style={{ color: C.gold }}>licensed BC REALTOR®</a>.
      </div>

      {/* ── Hero: agent avatar + waveform ─────────────────────────────────── */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: `radial-gradient(1200px 500px at 20% 0%, #1B3D8F 0%, ${C.navy} 55%, ${C.ink} 100%)`,
        color: "#fff", padding: "48px 20px 36px",
      }}>
        {/* grain / noise overlay */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, opacity: 0.35, pointerEvents: "none",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(rgba(245,166,35,0.06) 1px, transparent 1px)",
          backgroundSize: "3px 3px, 5px 5px",
          backgroundPosition: "0 0, 1px 2px",
        }}/>
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          {/* Avatar */}
          <motion.div
            animate={{ boxShadow: [
              "0 0 0 0 rgba(245,166,35,0.55)",
              "0 0 0 22px rgba(245,166,35,0.0)",
            ]}}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
            data-testid="visual-agent-avatar"
            style={{
              width: 96, height: 96, borderRadius: "50%",
              padding: 4,
              background: `conic-gradient(from 90deg, ${C.gold}, ${C.blue}, #6C8CFF, ${C.green}, ${C.gold})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "3px solid rgba(255,255,255,0.35)",
            }}
          >
            <div style={{
              width: "100%", height: "100%", borderRadius: "50%",
              background: "#FAF7F0", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "inset 0 2px 8px rgba(15,42,91,0.15)",
            }}>
              <img
                src={DOOGIE_HEADSHOT}
                alt="Doogie — EZtoFind AI helper"
                data-testid="doogie-headshot-hero"
                style={{
                  width: "108%", height: "108%", objectFit: "cover",
                  objectPosition: "center 42%", display: "block",
                }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          </motion.div>

          <div style={{ minWidth: 260 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <Pill tone="glass"><ShieldCheck size={12}/> BCFSA-safe · educational</Pill>
              <Pill tone="glass"><MessageCircle size={12}/> Text · Voice · Video</Pill>
              <Pill tone="glass"><HomeIcon size={12}/> Buying · Selling</Pill>
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 46px)",
              lineHeight: 1.1, margin: 0, fontWeight: 700,
            }}>
              Meet <span style={{ color: C.gold, fontStyle: "italic" }}>Doogie</span> — your BC real estate helper
            </h1>
            <p style={{ margin: "10px 0 0", opacity: 0.88, maxWidth: 620, fontSize: 14 }}>
              Ask about active BC listings, neighbourhoods, or real estate terms. Doogie looks things up
              from CREA DDF® and BC public data — general information only, never advice.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, minWidth: 200 }}>
            <Waveform active={playing || voiceActive} intense={voiceState === "listening"}/>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
              {/* Scripted ↔ Live voice-mode toggle */}
              <div style={{
                display: "inline-flex", padding: 3, background: "rgba(255,255,255,0.10)",
                borderRadius: 99, border: "1px solid rgba(255,255,255,0.22)",
              }}>
                <button
                  data-testid="voice-mode-scripted"
                  onClick={() => setVoiceMode("scripted")}
                  disabled={voiceActive}
                  style={{
                    border: "none", cursor: voiceActive ? "default" : "pointer",
                    padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                    background: voiceMode === "scripted" ? "#fff" : "transparent",
                    color: voiceMode === "scripted" ? C.navy : "#fff",
                  }}
                >Scripted</button>
                <button
                  data-testid="voice-mode-live"
                  onClick={() => setVoiceMode("live")}
                  disabled={voiceActive}
                  style={{
                    border: "none", cursor: voiceActive ? "default" : "pointer",
                    padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                    background: voiceMode === "live" ? C.green : "transparent",
                    color: voiceMode === "live" ? "#fff" : "#fff",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                  title="Live voice uses your browser's speech recognition — you'll see a PIPA disclosure before your first recording"
                >Live{voiceMode === "live" && !voicePipaAck ? <ShieldCheck size={10}/> : ""}</button>
              </div>
              <button
                data-testid="visual-agent-voice-btn"
                onClick={triggerVoice}
                disabled={voiceState === "transcribing" || voiceState === "replying"}
                style={{
                  ...btnGhost,
                  background: voiceState === "listening" ? "rgba(245,166,35,0.85)" : (voiceActive ? "rgba(255,255,255,0.06)" : "rgba(245,166,35,0.18)"),
                  border: "1px solid " + (voiceState === "listening" ? "rgba(245,166,35,0.95)" : "rgba(245,166,35,0.55)"),
                  color: voiceState === "listening" ? C.ink : "#fff",
                  cursor: (voiceState === "transcribing" || voiceState === "replying") ? "default" : "pointer",
                  opacity: (voiceState === "transcribing" || voiceState === "replying") ? 0.75 : 1,
                }}
                aria-label="Ask by voice"
              >
                {voiceState === "listening" ? <MicOff size={14}/> : <Mic size={14}/>}
                <span>
                  {voiceState === "listening" ? (voiceMode === "live" ? "Stop" : "Listening…") :
                   voiceState === "transcribing" ? "Transcribing…" :
                   voiceState === "replying" ? "Replying…" :
                   voiceMode === "live" ? "Speak to Doogie" : "Ask by voice"}
                </span>
              </button>
              <button
                data-testid="visual-agent-toggle-play"
                onClick={() => setPlaying(p => !p)}
                style={btnGhost}
                aria-label={playing ? "Pause demo" : "Play demo"}
              >
                {playing ? <Pause size={14}/> : <Play size={14}/>}
                <span>{playing ? "Pause" : "Play"}</span>
              </button>
              <button data-testid="visual-agent-restart" onClick={restart} style={btnGhost} aria-label="Restart demo">
                <RotateCcw size={14}/> Restart
              </button>
              <button
                data-testid="visual-agent-kiosk"
                onClick={() => setKioskMode(true)}
                style={{ ...btnGhost, background: "rgba(30,79,207,0.25)", border: `1px solid ${C.blue}` }}
                aria-label="Enter voice-only kiosk mode"
              >
                <Maximize2 size={14}/> Kiosk
              </button>
            </div>
            {voiceError && (
              <div data-testid="voice-error" style={{
                marginTop: 4, fontSize: 11, color: "#FFD98A",
                background: "rgba(220,38,38,0.18)", border: "1px solid rgba(255,217,138,0.4)",
                padding: "5px 10px", borderRadius: 8, maxWidth: 320, textAlign: "left",
              }}>{voiceError}</div>
            )}
          </div>
        </div>
      </section>

      {/* ── Persistent BC search bar — always visible, mobile-first ────────
          A single, prominent search input under the hero. Submitting jumps
          the demo to "Buyer Search" and stops the auto-advance so consumers
          have all the time they need to read/type. */}
      <div style={{ maxWidth: 1200, margin: "-28px auto 0", padding: "0 20px", position: "relative", zIndex: 3 }}>
        <form
          onSubmit={(e) => { e.preventDefault(); commitSearch(searchQuery); }}
          data-testid="visual-agent-persistent-search"
          style={{
            background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14,
            padding: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
            boxShadow: "0 14px 34px rgba(15,42,91,0.10)",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
            <Search size={16} style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.blue,
            }}/>
            <input
              data-testid="visual-agent-persistent-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={stopAutoplay}
              placeholder="Search anywhere in BC — Kitsilano, Whistler, Kelowna, Nanaimo, Cranbrook…"
              aria-label="Search anywhere in British Columbia"
              style={{
                width: "100%", padding: "12px 14px 12px 36px",
                borderRadius: 10, border: "1px solid #DDE6FA",
                fontSize: 14, fontFamily: "inherit", background: "#F7FAFF",
                color: C.navy, fontWeight: 600,
                outline: "none",
              }}
            />
          </div>
          <button
            type="submit"
            data-testid="visual-agent-persistent-search-submit"
            style={{
              padding: "12px 20px", borderRadius: 10, border: "none",
              background: C.navy, color: "#fff", fontWeight: 800, fontSize: 14,
              cursor: "pointer", whiteSpace: "nowrap",
              display: "inline-flex", alignItems: "center", gap: 8,
              boxShadow: "0 8px 18px rgba(15,42,91,0.25)",
            }}
          >
            <Search size={14}/> Search BC
          </button>
          <div style={{
            flexBasis: "100%", fontSize: 11, color: "#6B7280", paddingLeft: 4,
          }}>
            {userInteracted
              ? "Auto-play paused — take your time. Tap Play at the top to resume the demo."
              : "Type a BC area to search real listings. Or explore the scenarios below."}
          </div>
        </form>
      </div>

      {/* ── Scenario tabs ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "12px auto 0", padding: "0 20px", position: "relative", zIndex: 2 }}>
        <div style={{
          background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14,
          padding: 8, display: "flex", flexWrap: "wrap", gap: 6, boxShadow: "0 10px 30px rgba(15,42,91,0.08)",
        }}>
          {SCENARIOS.map((s, i) => {
            const active = i === scenarioIdx;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                data-testid={`scenario-tab-${s.id}`}
                onClick={() => jumpTo(i)}
                style={{
                  flex: "1 1 180px", padding: "10px 14px", borderRadius: 10,
                  border: "none", cursor: "pointer",
                  background: active ? C.navy : "transparent",
                  color: active ? "#fff" : C.navy,
                  fontWeight: 700, fontSize: 13, letterSpacing: 0.3,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s ease",
                }}
              >
                <Icon size={16}/> {s.label}
                {active && <ChevronRight size={14}/>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Split screen: transcript + dynamic pane ───────────────────────── */}
      <section style={{ maxWidth: 1200, margin: "18px auto 0", padding: "0 20px" }}>
        <div className="visual-agent-split" style={{
          display: "grid", gridTemplateColumns: "minmax(280px, 420px) 1fr", gap: 18,
        }}>
          {/* Transcript */}
          <div style={{
            background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14,
            display: "flex", flexDirection: "column", minHeight: 460, overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 14px", borderBottom: "1px solid #EEF2FB",
              display: "flex", alignItems: "center", gap: 8,
              background: "linear-gradient(180deg, #fff, #FAFBFF)",
            }}>
              <Mic size={16} color={C.blue}/>
              <strong style={{ color: C.navy, fontSize: 13 }}>Live conversation</strong>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#6B7280" }}>
                Scenario {scenarioIdx + 1} / {SCENARIOS.length}
              </span>
            </div>
            <div ref={transcriptRef} data-testid="visual-agent-transcript" style={{ padding: 14, overflowY: "auto", flex: 1, maxHeight: 460 }}>
              <AnimatePresence initial={false}>
                {visibleTurns.map((t, i) => {
                  const doogieSrc = t.pose && DOOGIE[t.pose] ? DOOGIE[t.pose] : DOOGIE.headshot;
                  // Transparent poses look better on a soft-cream circle so
                  // the JPEG headshot and PNG cutouts read consistently.
                  const isCutout = t.pose === "thinking" || t.pose === "pointing" || t.pose === "celebrating";
                  return (
                  <motion.div
                    key={`${scenarioIdx}-${i}`}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: "flex", justifyContent: t.who === "user" ? "flex-end" : "flex-start",
                      marginBottom: 10, gap: 8, alignItems: "flex-end",
                    }}
                  >
                    {t.who === "agent" && (
                      <motion.div
                        key={doogieSrc}
                        initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: isCutout ? "#FFF4D9" : "transparent",
                          border: `2px solid ${t.pose === "celebrating" ? C.green : C.gold}`,
                          overflow: "hidden", flexShrink: 0,
                          boxShadow: t.pose === "celebrating"
                            ? "0 0 0 4px rgba(34,197,94,0.25)"
                            : "0 2px 6px rgba(15,42,91,0.15)",
                        }}
                      >
                        <img
                          src={doogieSrc}
                          alt={`Doogie ${t.pose || "headshot"}`}
                          data-testid={`doogie-chip-${i}-${t.pose || "headshot"}`}
                          style={{
                            width: "100%", height: "100%",
                            objectFit: "cover",
                            objectPosition: isCutout ? "center 30%" : "center 42%",
                          }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      </motion.div>
                    )}
                    <div style={{
                      maxWidth: "85%",
                      padding: "9px 13px", borderRadius: 14,
                      background: t.who === "user" ? C.mist :
                        (t.pose === "celebrating"
                          ? `linear-gradient(135deg, ${C.green}, #15803D)`
                          : `linear-gradient(135deg, ${C.navy}, ${C.blue})`),
                      color: t.who === "user" ? C.navy : "#fff",
                      fontSize: 13, lineHeight: 1.45,
                      boxShadow: "0 1px 2px rgba(15,42,91,0.05)",
                    }}>
                      <div style={{
                        fontSize: 10, opacity: 0.7, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700,
                      }}>
                        {t.who === "user" ? "You" : (
                          t.pose === "celebrating" ? "Doogie · celebrating"
                          : t.pose === "thinking" ? "Doogie · thinking"
                          : t.pose === "pointing" ? "Doogie · pointing"
                          : "Doogie Visual"
                        )}
                      </div>
                      {t.text}
                    </div>
                  </motion.div>
                );})}

                {/* Voice interaction — user "spoken" bubble */}
                {voiceState !== "idle" && (
                  <motion.div
                    key={`voice-user-${scenarioIdx}`}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    data-testid="voice-user-bubble"
                    style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}
                  >
                    <div style={{
                      maxWidth: "85%", padding: "9px 13px", borderRadius: 14,
                      background: "linear-gradient(135deg, rgba(245,166,35,0.15), rgba(245,166,35,0.05))",
                      color: C.navy, border: "1px solid rgba(245,166,35,0.45)",
                      fontSize: 13, lineHeight: 1.45,
                    }}>
                      <div style={{
                        fontSize: 10, opacity: 0.8, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700,
                        display: "inline-flex", alignItems: "center", gap: 5,
                      }}>
                        <Mic size={10}/> You · voice
                      </div>
                      {voiceState === "listening" ? (
                        <span style={{ opacity: 0.6, fontStyle: "italic" }}>
                          <VoiceDots/> listening…
                        </span>
                      ) : (
                        <>{voiceHeard}<Cursor active={voiceState === "transcribing"}/></>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Voice interaction — agent "narrated" reply */}
                {(voiceState === "replying" || voiceState === "done") && (
                  <motion.div
                    key={`voice-agent-${scenarioIdx}`}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    data-testid="voice-agent-bubble"
                    style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10, gap: 8, alignItems: "flex-end" }}
                  >
                    <motion.div
                      key={voiceState}
                      initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: "#FFF4D9",
                        border: `2px solid ${C.gold}`,
                        overflow: "hidden", flexShrink: 0,
                        boxShadow: "0 2px 6px rgba(15,42,91,0.15)",
                      }}
                    >
                      <img
                        src={voiceState === "replying" ? DOOGIE.thinking : DOOGIE.pointing}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </motion.div>
                    <div style={{
                      maxWidth: "85%", padding: "9px 13px", borderRadius: 14,
                      background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`,
                      color: "#fff", fontSize: 13, lineHeight: 1.45,
                      boxShadow: "0 4px 12px rgba(15,42,91,0.25)",
                    }}>
                      <div style={{
                        fontSize: 10, opacity: 0.85, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700,
                        display: "inline-flex", alignItems: "center", gap: 5,
                      }}>
                        <Volume2 size={10}/> Doogie Visual · narration
                      </div>
                      {voiceState === "replying" && !voiceReply
                        ? <VoiceDots light/>
                        : (voiceReply || <VoiceDots light/>)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* chip suggestions */}
            <div style={{ padding: 10, borderTop: "1px solid #EEF2FB", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(CHIPS[scenario.id] || []).map(c => (
                <button
                  key={c}
                  data-testid={`chip-${c.replace(/\s+/g,'-').toLowerCase()}`}
                  onClick={() => setTurnIdx(i => Math.min(i + 1, scenario.turns.length - 1))}
                  style={chipBtn}
                >
                  <Search size={11}/> {c}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic pane */}
          <div style={{
            background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 16, minHeight: 460,
            position: "relative", overflow: "hidden",
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {RightPane}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Concept-notes strip removed for consumer view — those were internal
          marketing bullets. The compliance footer below carries the real
          BCFSA / CASL / PIPA reference the consumer needs. */}

      {/* Compliance footer moved to /compliance (accessible from the site
          footer's "Compliance" link). The top banner + PIPA gate + per-badge
          "not advice" microtext still keep this page BCFSA-safe. */}
      <div style={{ maxWidth: 1000, margin: "26px auto 0", padding: "0 20px", color: "#6B7280", fontSize: 11, textAlign: "center" }}>
        <ShieldCheck size={11} color={C.blue} style={{ verticalAlign: "-2px", marginRight: 4 }}/>
        Doogie shares general information — not advice. Full disclosures on our <a href="/compliance" style={{ color: C.blue, fontWeight: 600 }}>Compliance page</a>.
      </div>

      {/* ── Kiosk Mode — fullscreen voice-only view for open-house tablets ─── */}
      <AnimatePresence>
        {kioskMode && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-testid="visual-agent-kiosk-overlay"
            style={{
              position: "fixed", inset: 0, zIndex: 90,
              background: `radial-gradient(1600px 700px at 30% 0%, #1B3D8F 0%, ${C.navy} 45%, ${C.ink} 100%)`,
              color: "#fff",
              display: "flex", flexDirection: "column",
              padding: "40px 24px",
            }}
          >
            {/* grain overlay */}
            <div aria-hidden style={{
              position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none",
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(rgba(245,166,35,0.05) 1px, transparent 1px)",
              backgroundSize: "3px 3px, 5px 5px",
            }}/>

            {/* Top strip: compliance banner + exit */}
            <div style={{
              position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, flexWrap: "wrap",
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(0,0,0,0.35)", padding: "8px 14px", borderRadius: 99,
                fontSize: 12, letterSpacing: 0.3, border: "1px solid rgba(255,255,255,0.15)",
              }}>
                <ShieldCheck size={14} color={C.gold}/>
                Doogie shares <strong>general information only — not advice</strong>. BCFSA · CASL · PIPA compliant.
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <button
                  data-testid="visual-agent-kiosk-speaker-toggle"
                  onClick={() => {
                    if (speakerOn) {
                      // Turning OFF — also stop any currently-playing audio.
                      stopSpeaking();
                      setSpeakerOn(false);
                    } else {
                      setSpeakerOn(true);
                      // Turning ON mid-reply — speak whatever Doogie last said.
                      if (voiceReply && voiceState === "done") {
                        speakDoogie(voiceReply);
                      }
                    }
                  }}
                  aria-label={speakerOn ? "Mute Doogie voice" : "Unmute Doogie voice"}
                  aria-pressed={speakerOn}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 16px", borderRadius: 99,
                    background: speakerOn
                      ? (speaking ? "rgba(245,166,35,0.85)" : "rgba(34,197,94,0.85)")
                      : "rgba(255,255,255,0.10)",
                    color: speakerOn ? (speaking ? C.ink : "#fff") : "#fff",
                    border: "1px solid " + (speakerOn ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.25)"),
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {speakerOn ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                  {speakerOn ? (speaking ? "Speaking…" : "Voice on") : "Muted"}
                </button>
                <button
                  data-testid="visual-agent-kiosk-exit"
                  onClick={() => setKioskMode(false)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 16px", borderRadius: 99,
                    background: "rgba(255,255,255,0.12)", color: "#fff",
                    border: "1px solid rgba(255,255,255,0.28)",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    backdropFilter: "blur(6px)",
                  }}
                  aria-label="Exit kiosk mode"
                >
                  <X size={16}/> Exit kiosk
                </button>
              </div>            </div>

            {/* Center stage — big Doogie + waveform */}
            <div style={{
              position: "relative", flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 32, textAlign: "center",
            }}>
              {(() => {
                const kioskPose = voiceState === "listening" ? DOOGIE.headshot
                  : voiceState === "transcribing" ? DOOGIE.thinking
                  : voiceState === "replying" ? DOOGIE.thinking
                  : voiceState === "done" ? DOOGIE.celebrating
                  : voiceState === "error" ? DOOGIE.headshot
                  : DOOGIE.headshot;
                const isCutout = kioskPose !== DOOGIE.headshot;
                return (
                  <motion.div
                    animate={{ boxShadow: voiceState === "listening" ? [
                      "0 0 0 0 rgba(245,166,35,0.65)",
                      "0 0 0 60px rgba(245,166,35,0.0)",
                    ] : [
                      "0 0 0 0 rgba(30,79,207,0.35)",
                      "0 0 0 40px rgba(30,79,207,0.0)",
                    ]}}
                    transition={{ duration: voiceState === "listening" ? 1.4 : 2.6, repeat: Infinity, ease: "easeOut" }}
                    style={{
                      width: 260, height: 260, borderRadius: "50%",
                      padding: 6,
                      background: voiceState === "done"
                        ? `conic-gradient(from 90deg, ${C.green}, ${C.gold}, ${C.blue}, ${C.green})`
                        : `conic-gradient(from 90deg, ${C.gold}, ${C.blue}, #6C8CFF, ${C.green}, ${C.gold})`,
                      border: "4px solid rgba(255,255,255,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <div style={{
                      width: "100%", height: "100%", borderRadius: "50%",
                      background: isCutout ? "#FFF4D9" : "#FAF7F0",
                      overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "inset 0 4px 12px rgba(15,42,91,0.15)",
                    }}>
                      <motion.img
                        key={kioskPose}
                        src={kioskPose}
                        alt={`Doogie · ${voiceState}`}
                        data-testid="kiosk-doogie-face"
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        style={{
                          width: "108%", height: "108%",
                          objectFit: "cover",
                          objectPosition: isCutout ? "center 30%" : "center 42%",
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })()}

              {/* Status text */}
              <div style={{ minHeight: 88, maxWidth: 720 }}>
                <div style={{
                  fontSize: 11, letterSpacing: 0.5, fontWeight: 700,
                  color: C.gold, textTransform: "uppercase", marginBottom: 6,
                }}>
                  {voiceState === "listening" ? "Listening" :
                   voiceState === "transcribing" ? "Understanding" :
                   voiceState === "replying" ? "Retrieving" :
                   voiceState === "done" ? "Ready" :
                   voiceState === "error" ? "Something went wrong" :
                   "Ready when you are"}
                </div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(22px, 3.4vw, 34px)", lineHeight: 1.25, fontWeight: 700,
                }}>
                  {voiceState === "listening" ? "I'm listening — ask about a BC listing, neighbourhood, or term" :
                   voiceState === "transcribing" && voiceHeard ? `"${voiceHeard}"` :
                   voiceState === "replying" && voiceReply ? voiceReply :
                   voiceState === "replying" ? "One moment while I check the sources…" :
                   voiceState === "done" && voiceReply ? voiceReply :
                   voiceState === "error" ? (voiceError || "Try again in a moment.") :
                   "Ask about a BC listing, a neighbourhood, or a real estate term. I retrieve general information — not advice."}
                </div>
              </div>

              {/* Waveform + big Speak button */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                <div style={{ transform: "scale(2.2)" }}>
                  <Waveform active={voiceActive || voiceState === "done"} intense={voiceState === "listening"}/>
                </div>
                <button
                  data-testid="kiosk-mic-btn"
                  onClick={triggerVoice}
                  disabled={voiceState === "transcribing" || voiceState === "replying"}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 10,
                    padding: "16px 28px", borderRadius: 99,
                    background: voiceState === "listening" ? C.gold : C.green,
                    border: "none", color: voiceState === "listening" ? C.ink : "#fff",
                    fontSize: 16, fontWeight: 800, letterSpacing: 0.3, cursor: "pointer",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                    opacity: (voiceState === "transcribing" || voiceState === "replying") ? 0.75 : 1,
                  }}
                >
                  {voiceState === "listening" ? <MicOff size={20}/> : <Mic size={20}/>}
                  {voiceState === "listening" ? "Stop" :
                   voiceState === "transcribing" ? "Transcribing…" :
                   voiceState === "replying" ? "Thinking…" :
                   voiceMode === "live" ? "Speak to Doogie" : "Ask by voice"}
                </button>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {voiceMode === "live"
                    ? "Live voice · your browser transcribes then Doogie replies via /api/doogie/chat"
                    : "Scripted demo · tap to play a sample voice interaction"}
                  {" · "}
                  <button
                    onClick={() => setVoiceMode(m => m === "live" ? "scripted" : "live")}
                    style={{
                      background: "transparent", border: "none", color: C.gold,
                      textDecoration: "underline", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    }}
                  >Switch to {voiceMode === "live" ? "scripted" : "live"}</button>
                </div>
              </div>
            </div>

            {/* Footer compliance line */}
            <div style={{ position: "relative", textAlign: "center", fontSize: 11, opacity: 0.75, letterSpacing: 0.3 }}>
              Doug LeMaire, REALTOR® · BCFSA #167790 · Doogie is an educational retrieval tool — <strong>not advice</strong>.
              For personalized guidance, request a <a href="/referral-request" style={{ color: C.gold }}>licensed BC REALTOR®</a>.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PIPA §7/§14 disclosure gate — shown only on first Live voice attempt ─ */}
      <AnimatePresence>
        {showPipaGate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-testid="voice-pipa-gate"
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(11,25,48,0.72)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            }}
            onClick={() => setShowPipaGate(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff", borderRadius: 16, maxWidth: 520, width: "100%",
                padding: 24, boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
                border: `2px solid ${C.gold}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <ShieldCheck size={28} color={C.blue}/>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 0.5, textTransform: "uppercase" }}>PIPA §7 / §14 disclosure</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif" }}>Before you turn on live voice</div>
                </div>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: "#374151", display: "grid", gap: 8 }}>
                <p style={{ margin: 0 }}>
                  <strong>What happens when you speak:</strong>
                </p>
                <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
                  <li>Your browser streams your audio to its speech-recognition provider (<strong>Google</strong> in Chrome/Edge, <strong>Apple</strong> in Safari) to convert it to text. This is a <strong>cross-border transfer</strong> outside Canada.</li>
                  <li>Only the resulting <strong>text</strong> is sent to Doogie at <code style={{ background: "#F1F5F9", padding: "1px 4px", borderRadius: 3 }}>/api/doogie/chat</code>. PII (phone, email, address, SIN) is redacted <em>before</em> storage. Retained 30 days, then purged.</li>
                  <li>Doogie's reply is <strong>educational retrieval only — never advice</strong>, per BCFSA. For personalized guidance, use <a href="/referral-request" style={{ color: C.blue, fontWeight: 600 }}>a licensed BC REALTOR®</a>.</li>
                  <li>Audio is <strong>never stored</strong> by EZtoFind. You can revoke mic permission any time in your browser settings.</li>
                </ol>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6B7280" }}>
                  Prefer to keep your voice on-device? Stay in <strong>Scripted</strong> mode — no mic is opened and no audio ever leaves your browser.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                <button
                  data-testid="voice-pipa-decline"
                  onClick={() => { setShowPipaGate(false); setVoiceMode("scripted"); }}
                  style={{
                    flex: "1 1 auto", padding: "10px 14px", borderRadius: 10,
                    border: "1px solid #D1D5DB", background: "#fff", color: C.navy,
                    fontWeight: 700, cursor: "pointer", fontSize: 13,
                  }}
                >Keep Scripted mode</button>
                <button
                  data-testid="voice-pipa-accept"
                  onClick={() => {
                    // Sync ref FIRST so runLiveVoice's next check passes,
                    // then persist + close the gate + start the mic.
                    voicePipaAckRef.current = true;
                    try { localStorage.setItem("ez_voice_pipa_ack", "1"); } catch { /* ignore */ }
                    setVoicePipaAck(true);
                    setShowPipaGate(false);
                    setTimeout(() => runLiveVoice(), 60);
                  }}
                  style={{
                    flex: "1 1 auto", padding: "10px 14px", borderRadius: 10,
                    border: "none", background: C.green, color: "#fff",
                    fontWeight: 700, cursor: "pointer", fontSize: 13,
                    boxShadow: "0 6px 16px rgba(34,197,94,0.35)",
                  }}
                >I understand — enable live voice</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile stacking */}
      <style>{`
        @media (max-width: 820px) {
          .visual-agent-split { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Small style tokens ──────────────────────────────────────────────────────
const btnGhost = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 12px", borderRadius: 10,
  background: "rgba(255,255,255,0.10)", color: "#fff",
  border: "1px solid rgba(255,255,255,0.25)",
  fontSize: 12, fontWeight: 600, cursor: "pointer",
  backdropFilter: "blur(6px)",
};

const chipBtn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "6px 10px", borderRadius: 99,
  border: "1px solid #DDE6FA", background: "#F5F8FF",
  color: C.navy, fontSize: 11, fontWeight: 600, cursor: "pointer",
};
