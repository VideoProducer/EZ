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
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { TurnstileWidget, getTurnstileToken, SavedSearchModal, looksLikeListingSearch } from "../App";
import {
  Mic, MicOff, Video, Search, MapPin, Building2, Sparkles, Play, Pause,
  RotateCcw, ShieldCheck, MessageCircle, ChevronRight, School,
  Bus, Trees, Waves, CheckCircle2, ArrowRight, Home as HomeIcon,
  Compass, Radio, Volume2, VolumeX, Maximize2, X, ClipboardList
} from "lucide-react";

// ── Extracted (Feb 2026) — each Pane, atom, and shared constant now lives in
// /pages/visual-agent/ so this file stays under ~1,800 lines. Nothing behavioural
// changed during the split; every symbol below is re-imported unchanged.
import {
  C, API, DOOGIE, DOOGIE_HEADSHOT,
  Pill, Waveform,
  PaneSearch, PaneTour, PaneNeighbourhood,
  PaneBuyerInsights, PaneSellerLookup, PaneQualify,
} from "./visual-agent";

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
  const [kioskMode, setKioskMode] = useState(() => {
    // Auto-enter kiosk mode when the URL carries ?kiosk=1 — used by the
    // homepage onboarding flow to route directly into hands-free tour mode.
    try {
      if (typeof window === "undefined") return false;
      const sp = new URLSearchParams(window.location.search);
      return sp.get("kiosk") === "1";
    } catch { return false; }
  });   // fullscreen voice-only
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
  // Natural-language query parser for the smart search bar. Extracts city,
  // beds_min, and price_max from phrases like:
  //   "4 bedroom homes in whistler under 2M"
  //   "condo under 800k vancouver"
  //   "3+ bed detached surrey"
  // Anything not matched is left blank so the listings API returns broader
  // results. Returns null if nothing meaningful was extracted.
  const parseListingQuery = (raw) => {
    const q = (raw || "").toLowerCase();
    if (q.length < 3) return null;
    let beds = null, priceMax = null, city = null, propType = null;
    // Beds — "4 bed", "3+ bedroom", "two-bedroom"
    const bedMatch = q.match(/(\d+)\s*\+?\s*(?:bed|bedroom|br)/);
    if (bedMatch) beds = parseInt(bedMatch[1], 10);
    // Price ceiling — "under 2M", "under $850k", "less than 1,200,000"
    const priceMatch = q.match(/(?:under|below|less than|max|<)\s*\$?\s*([\d.,]+)\s*(m|k)?\b/);
    if (priceMatch) {
      let n = parseFloat(priceMatch[1].replace(/,/g, "")); const unit = priceMatch[2];
      if (unit === "m") n *= 1_000_000; else if (unit === "k") n *= 1_000;
      else if (n < 1000) n *= 1_000_000; // "2" = 2M shorthand
      if (isFinite(n) && n > 0) priceMax = Math.round(n);
    }
    // Common BC cities (case-insensitive substring match on the query)
    const CITIES = [
      "vancouver", "burnaby", "richmond", "surrey", "delta", "new westminster",
      "coquitlam", "port coquitlam", "port moody", "north vancouver",
      "west vancouver", "maple ridge", "pitt meadows", "langley", "white rock",
      "abbotsford", "chilliwack", "mission", "hope",
      "squamish", "whistler", "pemberton",
      "kelowna", "vernon", "penticton", "kamloops", "nanaimo", "victoria",
      "sooke", "duncan", "courtenay", "comox", "campbell river", "nelson",
      "cranbrook", "revelstoke", "fernie", "prince george", "tofino",
      // Okanagan / Boundary / Kootenays / North / Coast additions — anywhere in BC
      "osoyoos", "oliver", "summerland", "peachland", "west kelowna", "lake country",
      "salmon arm", "sicamous", "enderby", "armstrong", "coldstream",
      "castlegar", "trail", "kimberley", "invermere", "creston", "grand forks",
      "sechelt", "gibsons", "powell river", "port alberni", "parksville", "qualicum beach",
      "ucluelet", "port hardy", "port mcneill", "prince rupert", "terrace", "kitimat",
      "smithers", "quesnel", "williams lake", "100 mile house", "dawson creek", "fort st. john",
      "merritt", "logan lake", "clearwater", "lillooet", "lytton", "hazelton",
      "bowen island", "gabriola", "salt spring island", "pender island", "galiano",
      "ladysmith", "chemainus", "mill bay", "shawnigan lake", "cobble hill",
      "sidney", "saanich", "oak bay", "colwood", "langford", "esquimalt", "view royal", "metchosin",
      "cumberland", "black creek", "sayward",
    ];
    for (const c of CITIES) { if (q.includes(c)) { city = c; break; } }
    // Property type keyword
    if (/\bcondo\b|\bapartment\b/.test(q)) propType = "Apartment";
    else if (/\bhouse\b|\bdetached\b|\bhome\b/.test(q)) propType = "House";
    else if (/\btownhouse\b|\btownhome\b|\brow\b/.test(q)) propType = "Townhouse";
    // Feature keywords — mapped to canonical phrases the backend matches
    // against the DDF `features` array OR the public remarks regex. Each entry
    // survives as a comma-separated `features=` URL param on the /listings
    // page. Backend uses _features_query() to match structured or fulltext.
    const FEATURE_MAP = [
      { re: /\brv\s*(?:parking|hookup|pad|garage|storage)\b|\broom\s+for\s+(?:an?\s+)?rv\b/, tag: "rv parking" },
      { re: /\bpool\b|\bswimming\s+pool\b/, tag: "pool" },
      { re: /\bocean\s*(?:view|front)\b|\bsea\s*view\b/, tag: "ocean view" },
      { re: /\bwater\s*front\b|\blake\s*front\b|\briver\s*front\b/, tag: "waterfront" },
      { re: /\bmountain\s*view\b/, tag: "mountain view" },
      { re: /\bacreage\b|\backer?s?\b|\bfarm\b|\branch\b/, tag: "acreage" },
      { re: /\bsuite\b|\bmortgage\s*helper\b|\bbasement\s*suite\b|\blegal\s*suite\b/, tag: "suite" },
      { re: /\bgarage\b|\b(?:double|triple)\s*car\b/, tag: "garage" },
      { re: /\bwork\s*shop\b|\bworkshop\b/, tag: "workshop" },
      { re: /\bhot\s*tub\b/, tag: "hot tub" },
      { re: /\bair\s*conditioning\b|\bcentral\s*air\b|\ba\s*\/\s*c\b/, tag: "air conditioning" },
      { re: /\bequestrian\b|\bhorse\b|\bstable\b|\bpaddock\b/, tag: "equestrian" },
      { re: /\bvirtual\s*tour\b|\bvideo\s*tour\b/, tag: "virtual tour" },
    ];
    const features = [];
    for (const f of FEATURE_MAP) { if (f.re.test(q)) features.push(f.tag); }
    // If none matched, don't bother firing a listing search
    if (!city && !beds && !priceMax && !propType && features.length === 0) return null;
    return { city, beds, priceMax, propType, features };
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [searchCommitted, setSearchCommitted] = useState("Vancouver");
  // ── Smart search state ────────────────────────────────────────────────────
  // /api/search returns a grouped payload (Communities, Terms, Tools, Listings,
  // Doogie, etc.). We flatten it into a single suggestions list for the
  // dropdown, with arrow-key nav + Enter to select. If nothing matches or the
  // user hits Enter with no selection, we treat the input as an "Ask Doogie"
  // and prefill the embedded chat panel via the existing ez_doogie_prefill
  // localStorage + ez-open-doogie event contract.
  const [searchSug, setSearchSug] = useState([]);
  const [searchHi, setSearchHi] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchAbortRef = useRef(null);
  const nav = useNavigate();
  useEffect(() => {
    const q = (searchQuery || "").trim();
    if (q.length < 2) { setSearchSug([]); setSearchOpen(false); return; }
    const t = window.setTimeout(async () => {
      try {
        if (searchAbortRef.current) searchAbortRef.current.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;
        setSearchLoading(true);
        // Fire smart-search + real-listing parser in parallel
        const parsed = parseListingQuery(q);
        const listingParams = new URLSearchParams({ limit: "4", sort: "newest" });
        if (parsed) {
          if (parsed.city) listingParams.set("city", parsed.city);
          if (parsed.beds) listingParams.set("beds_min", String(parsed.beds));
          if (parsed.priceMax) listingParams.set("price_max", String(parsed.priceMax));
          if (parsed.propType) listingParams.set("property_type", parsed.propType);
          if (parsed.features && parsed.features.length) listingParams.set("features", parsed.features.join(","));
        } else {
          // Free-text fallback — hand the whole query to /api/listings
          listingParams.set("q", q);
        }
        const [smartRes, listRes] = await Promise.all([
          fetch(`${API}/search?q=${encodeURIComponent(q)}&limit=6`, { signal: controller.signal }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API}/listings?${listingParams}`, { signal: controller.signal }).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        const flat = [];
        // 1) Real matching listings first (up to 4 clickable cards to the exact detail page)
        const liveListings = (listRes && Array.isArray(listRes.listings)) ? listRes.listings.slice(0, 4) : [];
        for (const l of liveListings) {
          const priceNum = typeof l.list_price === "number" ? l.list_price : parseFloat(l.list_price || 0);
          const priceStr = priceNum ? `$${priceNum.toLocaleString("en-CA")}` : "";
          const beds = l.beds ?? l.bedrooms;
          const baths = l.baths ?? l.bathrooms;
          const addr = l.unparsed_address || l.street_address || l.address || l.listing_key;
          const subBits = [];
          if (l.city) subBits.push(l.city);
          if (beds != null) subBits.push(`${beds}bd`);
          if (baths != null) subBits.push(`${baths}ba`);
          if (l.property_type) subBits.push(l.property_type);
          flat.push({
            group: "Listing",
            kind: "Listing",
            title: `${priceStr}${priceStr && addr ? " · " : ""}${addr}`,
            blurb: subBits.join(" · "),
            href: `/listings/${l.listing_key}`,
          });
        }
        // 2) Then everything the smart-search endpoint found (excluding its
        //    single "Live listings" pill — the cards above replaced it)
        for (const g of ((smartRes && smartRes.groups) || [])) {
          if (g.kind === "Listings") continue;
          for (const it of (g.items || [])) {
            flat.push({ ...it, group: g.kind });
          }
        }
        // 3) "See all matches" tail
        if (listRes && listRes.total > liveListings.length) {
          const search = listingParams.toString();
          flat.push({
            group: "Listings",
            kind: "SeeMore",
            title: `See all ${listRes.total} matching listings →`,
            blurb: "Opens the full BC MLS® search with these filters",
            href: `/listings?${search}`,
          });
        }
        // 4) Always-appended Ask Doogie fallback
        if (!flat.some(x => x.group === "Doogie")) {
          flat.push({
            group: "Doogie",
            kind: "Doogie",
            title: `Ask Doogie: "${q}"`,
            blurb: "Get a plain-language answer from Doogie.",
            href: `/?ask=${encodeURIComponent(q)}`,
          });
        }
        setSearchSug(flat);
        setSearchHi(0);
        setSearchOpen(true);
      } catch (e) {
        if (e && e.name !== "AbortError") { setSearchSug([]); setSearchOpen(false); }
      } finally { setSearchLoading(false); }
    }, 220);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const askDoogie = (q) => {
    // Prefill + open the embedded chat, then scroll it into view
    try { localStorage.setItem("ez_doogie_prefill", (q || "").trim()); } catch { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent("ez-open-doogie")); } catch { /* ignore */ }
    const el = document.querySelector('[data-testid="visual-agent-doogie-embed"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Also focus the chat input so the user can just hit Send
    window.setTimeout(() => {
      const inp = document.querySelector('[data-testid="doogie-input"]');
      if (inp) { try { inp.focus(); } catch { /* ignore */ } }
    }, 400);
  };
  const openSug = (item) => {
    setSearchOpen(false);
    if (!item) return;
    if (item.group === "Doogie") {
      askDoogie(searchQuery);
      return;
    }
    if (item.href) {
      if (/^https?:/i.test(item.href)) window.location.href = item.href;
      else nav(item.href);
    }
  };
  const onSearchKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (searchOpen && searchSug.length) setSearchHi(i => Math.min(i + 1, searchSug.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (searchOpen && searchSug.length) setSearchHi(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); runSearchSubmit(); }
    else if (e.key === "Escape") { setSearchOpen(false); }
  };
  // Shared submit — used by both Enter-key and the Search button. Preserves the
  // previous hero-search behaviour: listing-intent queries route to
  // /listings?… with the parsed filters (city, beds_min, price_max, property_type)
  // so the buyer lands directly on a filtered MLS® results page. Community/term
  // suggestions only win if the user explicitly arrow-navigated to them.
  const runSearchSubmit = () => {
    const raw = (searchQuery || "").trim();
    if (raw.length < 2) return;
    // 1) User arrow-selected a suggestion below the first row → open it
    if (searchOpen && searchSug.length > 0 && searchHi > 0) {
      openSug(searchSug[Math.min(searchHi, searchSug.length - 1)]);
      return;
    }
    // 2) Query looks like a listing search → filtered /listings page
    const parsed = parseListingQuery(raw);
    if (parsed || looksLikeListingSearch(raw)) {
      const p = new URLSearchParams({ q: raw });
      if (parsed?.city)      p.set("city", parsed.city);
      if (parsed?.beds)      p.set("beds_min", String(parsed.beds));
      if (parsed?.priceMax)  p.set("price_max", String(parsed.priceMax));
      if (parsed?.propType)  p.set("property_type", parsed.propType);
      if (parsed?.features && parsed.features.length) p.set("features", parsed.features.join(","));
      setSearchOpen(false);
      nav(`/listings?${p.toString()}`);
      return;
    }
    // 3) Otherwise treat as a Doogie Q&A (glossary, "how much is PTT?", etc.)
    askDoogie(raw);
  };

  // ── Voice-Answer Everywhere ────────────────────────────────────────────────
  // One-tap mic inside the smart search bar. Uses Web Speech API when
  // available (Chrome/Edge/Safari 14.1+) — falls back to backend Whisper via
  // MediaRecorder + /api/doogie/transcribe otherwise. Once we have a
  // transcript we drop it into the search input; the existing debounced
  // /api/search fetch then populates the dropdown so the user can pick a
  // result or press Enter to hand off to Doogie chat.
  //
  // Voice Reply Everywhere: after the mic returns a question-like transcript
  // (contains a question word or "?") we ALSO fire /api/doogie/chat SSE
  // directly and play the streaming reply aloud via /api/doogie/tts — mirrors
  // Kiosk mode's behavior without forcing the user into Kiosk.
  const [voiceSearchOn, setVoiceSearchOn] = useState(false);
  const [voiceSearchStatus, setVoiceSearchStatus] = useState(""); // "listening" | "transcribing" | "speaking" | ""
  const [voiceReplyText, setVoiceReplyText] = useState("");
  const voiceRecogRef = useRef(null);
  const voiceRecorderRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceReplyAudioRef = useRef(null);
  const stopVoiceSearch = () => {
    try { if (voiceRecogRef.current) voiceRecogRef.current.stop(); } catch { /* ignore */ }
    try {
      if (voiceRecorderRef.current && voiceRecorderRef.current.state !== "inactive") {
        voiceRecorderRef.current.stop();
      }
    } catch { /* ignore */ }
    try { if (voiceReplyAudioRef.current) { voiceReplyAudioRef.current.pause(); voiceReplyAudioRef.current.src = ""; } } catch { /* ignore */ }
    setVoiceSearchOn(false);
  };
  // Fires Doogie chat SSE + speaks the accumulated reply. Only invoked when
  // the mic returned a question-like transcript so casual browsing queries
  // don't spam TTS calls.
  const speakDoogieAnswer = async (question) => {
    try {
      setVoiceSearchStatus("thinking");
      const res = await fetch(`${API}/doogie/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, session_id: `voice-${Date.now()}`, language: "en" }),
      });
      if (!res.ok || !res.body) { setVoiceSearchStatus(""); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "", buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) !== -1) {
          const frame = buf.slice(0, i); buf = buf.slice(i + 2);
          const line = frame.split("\n").find(l => l.startsWith("data:"));
          if (!line) continue;
          try {
            const obj = JSON.parse(line.slice(5).trim());
            const chunk = obj.delta || obj.text || obj.content || "";
            if (chunk) acc += chunk;
          } catch { /* skip malformed frame */ }
        }
      }
      const answer = acc.trim();
      if (!answer) { setVoiceSearchStatus(""); return; }
      setVoiceReplyText(answer);
      setVoiceSearchStatus("speaking");
      // Play TTS
      try {
        const r = await fetch(`${API}/doogie/tts`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: answer.slice(0, 3800), voice: "ash" }),
        });
        if (r.ok) {
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          voiceReplyAudioRef.current = audio;
          audio.onended = () => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } setVoiceSearchStatus(""); };
          audio.onerror = () => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } setVoiceSearchStatus(""); };
          await audio.play();
        } else {
          setVoiceSearchStatus("");
        }
      } catch { setVoiceSearchStatus(""); }
    } catch { setVoiceSearchStatus(""); }
  };
  const finalizeVoice = (transcript) => {
    const text = (transcript || "").trim();
    if (!text) return;
    setSearchQuery(text);
    // Fire TTS answer only when it looks like a question or general ask —
    // NOT when the transcript looks like a listing filter (has beds/price/city).
    const parsed = parseListingQuery(text);
    const looksLikeQuestion = /\b(what|how|why|when|where|explain|tell me|can you|do you|is|are|should|does|difference|meaning)\b|\?$/i.test(text);
    if (looksLikeQuestion && !parsed) {
      speakDoogieAnswer(text);
    }
  };
  const startVoiceSearch = async () => {
    if (voiceSearchOn) { stopVoiceSearch(); return; }
    stopAutoplay();
    setVoiceReplyText("");
    // Prefer Web Speech API for instant local transcription
    const SR = (typeof window !== "undefined") && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SR) {
      try {
        const rec = new SR();
        rec.lang = "en-CA";
        rec.interimResults = true;
        rec.continuous = false;
        rec.maxAlternatives = 1;
        let lastFinal = "";
        rec.onstart = () => { setVoiceSearchOn(true); setVoiceSearchStatus("listening"); };
        rec.onerror = () => { setVoiceSearchOn(false); setVoiceSearchStatus(""); };
        rec.onend = () => { setVoiceSearchOn(false); setVoiceSearchStatus(""); if (lastFinal) finalizeVoice(lastFinal); };
        rec.onresult = (evt) => {
          let interim = "", final = "";
          for (let i = evt.resultIndex; i < evt.results.length; i++) {
            const t = evt.results[i][0].transcript || "";
            if (evt.results[i].isFinal) final += t; else interim += t;
          }
          const text = (final || interim).trim();
          if (text) setSearchQuery(text);
          if (final) lastFinal = final.trim();
        };
        voiceRecogRef.current = rec;
        rec.start();
        return;
      } catch { /* fall through to Whisper */ }
    }
    // Fallback: MediaRecorder + backend Whisper
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      voiceChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) voiceChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        setVoiceSearchStatus("transcribing");
        try {
          const blob = new Blob(voiceChunksRef.current, { type: "audio/webm" });
          const fd = new FormData();
          fd.append("audio", blob, "voice.webm");
          fd.append("language", "en");
          const r = await fetch(`${API}/doogie/transcribe`, { method: "POST", body: fd });
          if (r.ok) {
            const data = await r.json();
            const text = (data.text || data.transcript || "").trim();
            if (text) { setSearchQuery(text); finalizeVoice(text); }
          }
        } catch { /* ignore */ }
        finally {
          setVoiceSearchStatus("");
          try { stream.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
        }
      };
      voiceRecorderRef.current = mr;
      mr.start();
      setVoiceSearchOn(true);
      setVoiceSearchStatus("listening");
      window.setTimeout(() => { try { if (mr.state !== "inactive") mr.stop(); } catch { /* ignore */ } setVoiceSearchOn(false); }, 8000);
    } catch (e) {
      setVoiceSearchOn(false);
      setVoiceSearchStatus("");
    }
  };
  useEffect(() => () => stopVoiceSearch(), []);

  // ── Saved Searches ─────────────────────────────────────────────────────────
  // Users can bookmark a natural-language query (e.g. "4 bedroom Whistler
  // under 2M") and re-run it with one tap. Persisted to localStorage — no
  // account required, private to the browser.
  const [savedSearches, setSavedSearches] = useState(() => {
    try {
      const raw = localStorage.getItem("ez_saved_searches");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const persistSaved = (list) => {
    setSavedSearches(list);
    try { localStorage.setItem("ez_saved_searches", JSON.stringify(list)); } catch { /* ignore */ }
  };
  const saveCurrentQuery = () => {
    const q = (searchQuery || "").trim();
    if (q.length < 2) return;
    if (savedSearches.some(s => s.toLowerCase() === q.toLowerCase())) return;
    persistSaved([q, ...savedSearches].slice(0, 6)); // keep 6 most recent
  };
  const removeSaved = (q) => persistSaved(savedSearches.filter(s => s !== q));
  const runSaved = (q) => { setSearchQuery(q); stopAutoplay(); };
  const isCurrentSaved = savedSearches.some(s => s.toLowerCase() === (searchQuery || "").trim().toLowerCase());
  // ── Saved-search email alerts ──────────────────────────────────────────
  // When a user clicks the 🔔 bell on a saved chip we parse the natural-language
  // query into structured filters and open the shared SavedSearchModal from
  // App.js. That modal handles CASL double opt-in, PIPA, and creates a real
  // backend `saved_searches` record — which the alert_matcher (running after
  // every 4-hour CREA DDF sync) uses to email the user when new matching
  // listings hit the MLS® feed.
  const [alertChipFilters, setAlertChipFilters] = useState(null);
  const openAlertForChip = (chip) => {
    const parsed = parseListingQuery(chip) || {};
    const filters = {};
    if (parsed.city) filters.city = parsed.city;
    if (parsed.beds) filters.beds_min = parsed.beds;
    if (parsed.priceMax) filters.price_max = parsed.priceMax;
    if (parsed.propType) filters.property_type = parsed.propType;
    // Also stash the raw chip as `keyword` so Doug can see what the user typed
    filters.keyword = chip;
    setAlertChipFilters(filters);
  };
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

  // First-visit onboarding hand-off: /visual-agent-demo?kiosk=1[&mode=buyer|seller|all]
  // → auto-start kiosk (already handled in the kioskMode initializer) + play a
  // 15-second Doogie greeting tailored to the visitor's mode. Strip the query
  // params so a page refresh doesn't repeat. Runs exactly once per navigation.
  const greetedRef = useRef(false);
  useEffect(() => {
    if (greetedRef.current) return;
    if (typeof window === "undefined") return;
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("kiosk") !== "1") return;
      greetedRef.current = true;
      let mode = (sp.get("mode") || "").trim();
      if (!mode) {
        try { mode = localStorage.getItem("ez_doogie_mode") || "all"; } catch { mode = "all"; }
      }
      const scripts = {
        all: "Hi, I'm Doogie — your BC real estate helper. Try searching for a listing in Whistler, ask me about strata fees, take a virtual tour, or book a free consultation with Doug. General information only — not advice.",
        buyer: "Hi, I'm Doogie — your BC real estate helper. Looking to buy? Try a search like four bedroom homes in Whistler, ask about mortgage pre-approval or the Property Transfer Tax, or book a free consultation with Doug. General information only — not advice.",
        seller: "Hi, I'm Doogie — your BC real estate helper. Thinking of selling? Ask me for a market snapshot on your neighbourhood, get a general home valuation range, or book a free consultation with Doug LeMaire, REALTOR®. General information only — not advice.",
      };
      const greeting = scripts[mode] || scripts.all;
      // Small delay so the kiosk overlay is fully mounted before audio starts
      window.setTimeout(() => { speakDoogie(greeting); }, 600);
      // Strip ?kiosk / ?mode from the URL without triggering navigation
      sp.delete("kiosk"); sp.delete("mode");
      const newUrl = window.location.pathname + (sp.toString() ? `?${sp}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Derive the "focus city" from whatever the buyer has typed into the search
  // bar. Every scenario pane (Tour, Neighbourhood, Buyer/Seller Insights) syncs
  // to this city so the whole right-hand column moves as one. Falls back to
  // idle rotating regions when nothing is typed.
  const focusCity = useMemo(() => {
    const raw = (searchQuery || searchCommitted || "").trim();
    if (!raw) return null;
    const parsed = parseListingQuery(raw);
    if (parsed?.city) {
      // Title-case the extracted city so it displays cleanly ("Prince George",
      // not "prince george")
      return parsed.city.replace(/\b\w/g, c => c.toUpperCase());
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchCommitted]);

  const RightPane = useMemo(() => {
    switch (scenario.id) {
      case "search": return <PaneSearch query={searchQuery} setQuery={setSearchQuery} committed={searchCommitted} onCommit={commitSearch}/>;
      case "tour": return <PaneTour focusCity={focusCity}/>;
      case "neighbourhood": return <PaneNeighbourhood focusCity={focusCity}/>;
      case "buyerinsights": return <PaneBuyerInsights focusCity={focusCity}/>;
      case "sellerlookup": return <PaneSellerLookup focusCity={focusCity}/>;
      case "qualify": return <PaneQualify/>;
      default: return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id, searchQuery, searchCommitted, focusCity]);

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
        Doogie provides <strong>general information only — not advice</strong>.
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
              <Pill tone="glass"><MessageCircle size={12}/> Text · Voice · Video</Pill>
              <Pill tone="glass"><HomeIcon size={12}/> Buying · Selling</Pill>
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 46px)",
              lineHeight: 1.1, margin: 0, fontWeight: 700,
            }}>
              <Link to="/" data-testid="va-meet-doogie-link" style={{color:"inherit",textDecoration:"none"}}
                onMouseOver={e=>e.currentTarget.style.opacity="0.9"}
                onMouseOut={e=>e.currentTarget.style.opacity="1"}
                title="Home — EZtoFind.ca">
                <span style={{ color: C.gold, fontStyle: "italic" }}>Doogie</span> — your BC real estate helper
              </Link>
            </h1>
            <p style={{ margin: "10px 0 0", opacity: 0.88, maxWidth: 620, fontSize: 14 }}>
              Ask about active BC listings, neighborhoods, or real estate terms. Doogie provides general information only, never advice.
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

      {/* ── Smart persistent BC search bar — always visible, mobile-first ───
          Merges the retired hero search bar (autocomplete: communities,
          glossary, listings) AND the retired DoogieChat entry point (Ask
          Doogie fallback) into a single input. If a query matches known
          content we surface it grouped; if not, Enter routes to Doogie via
          the embedded chat. */}
      <div style={{ maxWidth: 1200, margin: "-28px auto 0", padding: "0 20px", position: "relative", zIndex: 3 }}>
        <form
          onSubmit={(e) => { e.preventDefault(); runSearchSubmit(); }}
          data-testid="visual-agent-persistent-search"
          style={{
            background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14,
            padding: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
            boxShadow: "0 14px 34px rgba(15,42,91,0.10)",
            position: "relative",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
            <Search size={16} style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.blue,
            }}/>
            <input
              data-testid="visual-agent-persistent-search-input"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              onFocus={() => { stopAutoplay(); if (searchSug.length) setSearchOpen(true); }}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 180)}
              onKeyDown={onSearchKey}
              placeholder={voiceSearchStatus === "listening" ? "🎤 Listening — speak your question…" : voiceSearchStatus === "transcribing" ? "Transcribing…" : "Search BC listings, communities, terms — or ask Doogie anything"}
              aria-label="Search BC listings, communities, terms or ask Doogie"
              autoComplete="off"
              role="combobox"
              aria-expanded={searchOpen}
              aria-controls="va-search-dropdown"
              style={{
                width: "100%", padding: "12px 76px 12px 36px",
                borderRadius: 10, border: "1px solid #DDE6FA",
                fontSize: 14, fontFamily: "inherit", background: "#F7FAFF",
                color: C.navy, fontWeight: 600,
                outline: "none",
              }}
            />
            {/* Save-current-query star */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); saveCurrentQuery(); }}
              onMouseDown={(e) => e.preventDefault()}
              disabled={((searchQuery || "").trim().length < 2) || isCurrentSaved}
              data-testid="visual-agent-persistent-search-save"
              aria-label={isCurrentSaved ? "Search already saved" : "Save this search"}
              title={isCurrentSaved ? "Already saved" : "Save this search"}
              style={{
                position: "absolute", right: 44, top: "50%", transform: "translateY(-50%)",
                width: 32, height: 32, borderRadius: "50%",
                border: "1px solid rgba(15,42,91,0.15)",
                background: isCurrentSaved ? "#FDB813" : "#fff",
                color: isCurrentSaved ? "#fff" : C.navy,
                cursor: (((searchQuery || "").trim().length < 2) || isCurrentSaved) ? "default" : "pointer",
                opacity: (((searchQuery || "").trim().length < 2) && !isCurrentSaved) ? 0.4 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, lineHeight: 1,
              }}
            >{isCurrentSaved ? "★" : "☆"}</button>
            {/* Voice-Answer mic — one-tap voice queries without opening Kiosk */}
            <button
              type="button"
              onClick={startVoiceSearch}
              data-testid="visual-agent-persistent-search-mic"
              aria-label={voiceSearchOn ? "Stop voice search" : "Ask by voice"}
              title={voiceSearchOn ? "Recording — tap to stop" : "Ask by voice"}
              aria-pressed={voiceSearchOn}
              style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                width: 32, height: 32, borderRadius: "50%",
                border: "1px solid " + (voiceSearchOn ? "#DC2626" : "rgba(15,42,91,0.15)"),
                background: voiceSearchOn ? "#DC2626" : "#fff",
                color: voiceSearchOn ? "#fff" : C.navy,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                animation: voiceSearchOn ? "va-mic-pulse 1.2s ease-in-out infinite" : "none",
              }}
            >
              {voiceSearchOn ? <MicOff size={14}/> : <Mic size={14}/>}
            </button>
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
            <Search size={14}/> Search
          </button>

          {/* Suggestions dropdown */}
          {searchOpen && searchSug.length > 0 && (
            <div
              id="va-search-dropdown"
              data-testid="visual-agent-search-suggestions"
              role="listbox"
              style={{
                position: "absolute", top: "calc(100% + 4px)", left: 10, right: 10, zIndex: 30,
                background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
                boxShadow: "0 20px 40px rgba(15,42,91,0.18)",
                maxHeight: 420, overflowY: "auto",
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {/* Grouped-section dropdown — listings, communities, terms & glossary,
                  then Ask Doogie fallback. Each group gets a coloured header so the
                  buyer can visually skim to the right kind of answer instantly. */}
              {(() => {
                const GROUP_META = {
                  Listing:     { header: "🏠 MLS® Listings",         color: "#0369A1", bg: "rgba(3,105,161,0.08)"  },
                  Listings:    { header: "🏠 MLS® Listings",         color: "#0369A1", bg: "rgba(3,105,161,0.08)"  },
                  Communities: { header: "📍 BC Communities",        color: "#166534", bg: "rgba(22,163,74,0.08)"  },
                  Terms:       { header: "📖 Terms & Glossary",      color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
                  Tools:       { header: "🧰 Tools & Calculators",   color: "#0F2A5B", bg: "rgba(15,42,91,0.08)"   },
                  Doogie:      { header: "🐾 Ask Doogie",            color: "#7C4A03", bg: "rgba(245,166,35,0.15)" },
                };
                const GROUP_ORDER = ["Listing", "Listings", "Communities", "Terms", "Tools", "Doogie"];
                // Bucket the flat suggestion list back into sections
                const buckets = {};
                searchSug.forEach((it, i) => {
                  const g = it.group || "Doogie";
                  if (!buckets[g]) buckets[g] = [];
                  buckets[g].push({ ...it, __i: i });
                });
                const seenKeys = new Set(GROUP_ORDER);
                Object.keys(buckets).forEach(k => { if (!seenKeys.has(k)) GROUP_ORDER.push(k); });

                return GROUP_ORDER.filter(g => buckets[g] && buckets[g].length).map((groupKey, gi) => {
                  const meta = GROUP_META[groupKey] || { header: groupKey.toUpperCase(), color: C.blue, bg: "rgba(14,165,233,0.10)" };
                  return (
                    <div key={groupKey} data-testid={`va-search-group-${groupKey.toLowerCase()}`}>
                      <div style={{
                        padding: "6px 12px", fontSize: 10, fontWeight: 800,
                        letterSpacing: 0.6, textTransform: "uppercase",
                        color: meta.color, background: meta.bg,
                        borderTop: gi === 0 ? "none" : "1px solid #F1F5F9",
                        position: "sticky", top: 0, zIndex: 1,
                      }}>{meta.header}</div>
                      {buckets[groupKey].map((it) => {
                        const i = it.__i;
                        const active = i === searchHi;
                        const isDoogie = it.group === "Doogie";
                        const isSeeMore = it.kind === "SeeMore";
                        return (
                          <button
                            key={`${it.group}-${it.title}-${i}`}
                            type="button"
                            role="option"
                            aria-selected={active}
                            data-testid={`va-search-sug-${i}`}
                            onMouseEnter={() => setSearchHi(i)}
                            onClick={() => openSug(it)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                              gap: 12, padding: "10px 12px",
                              background: active ? "#F5F0E1" : "transparent",
                              border: "none", cursor: "pointer", textAlign: "left",
                              borderBottom: "1px solid #F8FAFC",
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{
                                fontWeight: 700, color: isSeeMore ? meta.color : C.navy,
                                fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                textDecoration: isSeeMore ? "underline" : "none",
                              }}>
                                {isDoogie ? <><span aria-hidden style={{marginRight:6}}>🐾</span>{it.title}</> : it.title}
                              </div>
                              {it.blurb && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.blurb}</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                });
              })()}
              {searchLoading && (
                <div style={{ padding: "6px 12px", fontSize: 11, color: "#9CA3AF" }}>Searching…</div>
              )}
            </div>
          )}

          <div style={{
            flexBasis: "100%", fontSize: 11, color: "#6B7280", paddingLeft: 4,
            display: "grid", gap: 4,
          }}>
            <div>
              {userInteracted
                ? "Auto-play paused — take your time. Tap Play at the top to resume the demo."
                : "Type a BC area, listing, term, or question. Doogie catches anything the site doesn't have a page for."}
            </div>
            <div>
              Prefer voice? Tap <strong style={{ color: C.navy }}>Ask by voice</strong> at the top-right and just say where you're looking.
            </div>
            {/* Voice Reply status + last spoken answer */}
            {(voiceSearchStatus === "thinking" || voiceSearchStatus === "speaking") && (
              <div data-testid="voice-reply-status" style={{
                marginTop: 4, padding: "6px 10px", borderRadius: 8,
                background: voiceSearchStatus === "speaking" ? "rgba(245,166,35,0.15)" : "rgba(15,42,91,0.06)",
                border: `1px solid ${voiceSearchStatus === "speaking" ? "rgba(245,166,35,0.35)" : "rgba(15,42,91,0.15)"}`,
                color: C.navy, fontWeight: 700, fontSize: 11,
              }}>
                {voiceSearchStatus === "thinking" ? "🐾 Doogie is thinking…" : "🔊 Doogie is answering aloud…"}
              </div>
            )}
            {voiceReplyText && voiceSearchStatus === "" && (
              <div data-testid="voice-reply-text" style={{
                marginTop: 4, padding: "6px 10px", borderRadius: 8,
                background: "#F7FAFF", border: "1px solid #DDE6FA",
                color: C.navy, fontSize: 11, lineHeight: 1.5, maxHeight: 60, overflow: "hidden",
              }}>
                <strong>Doogie said:</strong> {voiceReplyText.slice(0, 220)}{voiceReplyText.length > 220 ? "…" : ""}
              </div>
            )}
            {/* Saved searches — one-tap re-run of favourite natural-language queries */}
            {savedSearches.length > 0 && (
              <div data-testid="visual-agent-saved-searches" style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: C.navy, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" }}>★ Saved</span>
                {savedSearches.map((s) => (
                  <span
                    key={s}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      background: "#FFF8E8", border: "1px solid #F5D28A", borderRadius: 999,
                      padding: "3px 8px 3px 10px", fontSize: 11, color: C.navy, fontWeight: 600,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => runSaved(s)}
                      data-testid={`saved-search-run-${s.replace(/\s+/g, "-").slice(0, 30)}`}
                      style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "inherit", fontSize: "inherit", fontWeight: "inherit" }}
                    >{s.length > 40 ? s.slice(0, 38) + "…" : s}</button>
                    <button
                      type="button"
                      onClick={() => openAlertForChip(s)}
                      data-testid={`saved-search-alert-${s.replace(/\s+/g, "-").slice(0, 30)}`}
                      aria-label={`Get email alerts for "${s}"`}
                      title="Email me when new BC MLS® listings match — free, 1-click unsubscribe"
                      style={{
                        background: "transparent", border: "none", padding: "0 3px", cursor: "pointer",
                        color: C.gold, fontSize: 12, lineHeight: 1, marginLeft: 2,
                      }}
                    >🔔</button>
                    <button
                      type="button"
                      onClick={() => removeSaved(s)}
                      data-testid={`saved-search-remove-${s.replace(/\s+/g, "-").slice(0, 30)}`}
                      aria-label={`Remove saved search "${s}"`}
                      style={{
                        background: "transparent", border: "none", padding: "0 2px", cursor: "pointer",
                        color: "#9CA3AF", fontSize: 13, lineHeight: 1,
                      }}
                    >×</button>
                  </span>
                ))}
              </div>
            )}
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

      {/* ── Dynamic pane (full width) ─────────────────────────────────────
          The embedded Doogie chat panel was removed at Doug's request (Feb 4,
          2026) — the smart search bar + scenario tabs above already carry the
          interactive AI surface without duplicating a full chat window here. */}
      <section style={{ maxWidth: 1200, margin: "18px auto 0", padding: "0 20px" }}>
        <div className="visual-agent-split" style={{
          display: "grid", gridTemplateColumns: "1fr", gap: 18,
        }}>
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
        @keyframes va-mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.55); }
          50%      { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
        }
      `}</style>

      {/* Saved-search email alert modal — CASL double opt-in + PIPA ack.
          Firing this creates a real backend `saved_searches` doc that the
          alert_matcher scans after every 4-hour CREA DDF sync. */}
      <SavedSearchModal
        open={!!alertChipFilters}
        onClose={() => setAlertChipFilters(null)}
        currentFilters={alertChipFilters || {}}
      />
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
