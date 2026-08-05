// EZtoFind.ca — Visual Agent shared constants
// Extracted from VisualAgentDemo.jsx (Feb 2026) so each Pane component can
// import only what it needs and the main file no longer clocks in at
// ~3,500 lines. Nothing here has a run-time side effect — pure data +
// helpers. Anything imported by more than one Pane lives here.

import { useMemo } from "react";

// ── Palette (matches /app/frontend/src/index.css) ────────────────────────────
export const C = {
  navy:  "#0F2A5B",
  blue:  "#1E4FCF",
  green: "#22C55E",
  gold:  "#F5A623",
  cream: "#FAF7F0",
  ink:   "#0B1930",
  mist:  "#EEF2FB",
  glass: "rgba(15,42,91,0.06)",
};

// Backend base URL — resolved once here so every Pane hits the same origin.
export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Doogie mascot poses — served from Emergent customer assets CDN.
// The "reaction" logic in the transcript / narrator chips picks the pose
// that best matches Doogie's current state so he feels alive.
export const DOOGIE = {
  headshot:    "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/dj2wy1tx_Doogie%20Headshot.jpeg",
  thinking:    "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rxgxv6ec_transparent_Doogie%20Thinking.png",
  pointing:    "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/ws3q9zcp_transparent_Doogie%20Pointing%20Left.png",
  celebrating: "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/4g6serdu_Doogie%20Celebrating.png",
};
// Backwards-compat: the hero avatar still uses the plain headshot.
export const DOOGIE_HEADSHOT = DOOGIE.headshot;

// Third-party tour providers used by the illustrative fallback in PaneTour.
// Kept exported in case the pane needs to swap in the static demo again.
export const TOUR_PROVIDERS = {
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

// ── Mock MLS listings (visual only, fallback when live feed is empty) ────────
export const MOCK_LISTINGS = [
  { id: "L1", addr: "2135 W 8th Ave", city: "Kitsilano", price: "$1,289,000", beds: 2, baths: 2, sqft: 872, dom: 4, tag: "Beach 400m" },
  { id: "L2", addr: "1802 Balsam St",  city: "Kitsilano", price: "$1,449,000", beds: 2, baths: 2, sqft: 940, dom: 11, tag: "Corner unit" },
  { id: "L3", addr: "3110 Yew St",     city: "Kitsilano", price: "$1,199,000", beds: 2, baths: 1, sqft: 815, dom: 2, tag: "New listing" },
  { id: "L4", addr: "2455 Cornwall Ave",city: "Kitsilano", price: "$1,495,000", beds: 2, baths: 2, sqft: 1010, dom: 7, tag: "Ocean peek" },
];

// ── Mock comparable actives (Seller Insights scenario) ───────────────────────
export const MOCK_COMPS = [
  { id: "C1", addr: "5148 Sardis St",   city: "Burnaby", price: "$1,398,000", beds: 3, baths: 3, sqft: 1560, dom: 6,  status: "Active" },
  { id: "C2", addr: "5203 Neville St",  city: "Burnaby", price: "$1,449,000", beds: 3, baths: 3, sqft: 1620, dom: 12, status: "Active" },
  { id: "C3", addr: "4972 Union St",    city: "Burnaby", price: "$1,325,000", beds: 3, baths: 2, sqft: 1490, dom: 18, status: "Active" },
];

// ── BC Region rotation — Buyer/Seller Insights cycle through these each visit
// to visually reinforce that Doogie retrieves data province-wide, not just
// Metro Van. Illustrative mock numbers; on each mount a random region is picked.
export const BC_REGIONS = [
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
export function useRotatingRegion() {
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

// ── Focus-area detector (BCFSA-compliant) ─────────────────────────────────
// Doug's licensed focus is Greater Vancouver, Fraser Valley, and the
// Sea-to-Sky Corridor. Anywhere else in BC → we offer a friendly referral
// bump to his vetted REALTOR® network. Match is case-insensitive substring
// against a whitelist of common city / community names. Empty input returns
// false (no bump until the user starts typing).
export const FOCUS_AREA_CITIES = [
  // Greater Vancouver
  "vancouver","burnaby","richmond","surrey","delta","tsawwassen","ladner",
  "new westminster","coquitlam","port coquitlam","port moody","north vancouver",
  "west vancouver","maple ridge","pitt meadows","langley","white rock",
  "bowen island","anmore","belcarra","lions bay","cloverdale","south surrey",
  "kitsilano","kits","fairview","mount pleasant","kerrisdale","dunbar",
  "point grey","yaletown","gastown","strathcona","hastings-sunrise","marpole",
  "champlain heights","south vancouver","east vancouver","downtown vancouver",
  "west end","commercial drive","riley park","oakridge","cambie","shaughnessy",
  "arbutus","southlands","killarney","victoria-fraserview","sunset","renfrew",
  "grandview","hastings","brentwood","metrotown","edmonds","lougheed","deer lake",
  "willingdon","capitol hill","cedar cottage",
  // Fraser Valley
  "abbotsford","chilliwack","mission","hope","agassiz","harrison hot springs",
  "kent","boston bar","yarrow","cultus lake","rosedale","sardis",
  // Sea-to-Sky Corridor
  "squamish","whistler","pemberton","britannia beach","furry creek","d'arcy",
  "mount currie","lillooet lake",
];

export const isOutsideFocusArea = (text) => {
  const t = (text || "").trim().toLowerCase();
  if (t.length < 2) return false;
  return !FOCUS_AREA_CITIES.some(c => t.includes(c));
};
