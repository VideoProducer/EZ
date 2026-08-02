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
import {
  Mic, MicOff, Video, Search, MapPin, Building2, Sparkles, Play, Pause,
  RotateCcw, ShieldCheck, MessageCircle, ChevronRight, School,
  Bus, Trees, Waves, CheckCircle2, ArrowRight, Home as HomeIcon,
  Compass, Radio, Volume2
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

// Doogie mascot headshot — served from Emergent customer assets CDN.
// Used in the hero avatar and inline next to Doogie narration bubbles.
const DOOGIE_HEADSHOT = "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/dj2wy1tx_Doogie%20Headshot.jpeg";

// ── Scripted scenarios ───────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: "search",
    label: "Buyer Search",
    icon: Search,
    turns: [
      { who: "user", text: "Show me 2-bedroom condos in Kitsilano under $1.5M." },
      { who: "agent", text: "Retrieving 12 active listings from CREA DDF®. Sorting by price and days-on-market. Educational retrieval only — not advice." },
      { who: "user", text: "Which ones are steps from the beach?" },
      { who: "agent", text: "Highlighting 4 listings within 400m of Kits Beach. Tap a card for full details or a virtual walkthrough." },
    ],
  },
  {
    id: "tour",
    label: "Virtual Tour",
    icon: Video,
    turns: [
      { who: "user", text: "Can I walk through 2135 W 8th Ave?" },
      { who: "agent", text: "Loading 360° tour. I'll narrate the layout as you move — ask about ceiling heights, appliances, or strata rules." },
      { who: "user", text: "What's the strata age & rental policy?" },
      { who: "agent", text: "Building built 2018. Rentals allowed with no minimum term. Full strata docs are gated behind your Client Journey." },
    ],
  },
  {
    id: "neighbourhood",
    label: "Neighbourhood",
    icon: MapPin,
    turns: [
      { who: "user", text: "How is Kitsilano for a young family?" },
      { who: "agent", text: "Retrieving BC public data: schools, transit, walkability, parks. All figures cite source and last-updated date." },
      { who: "user", text: "Nearest school with French immersion?" },
      { who: "agent", text: "École Bilingue Elementary — 0.8 km walk. Catchment map available in your saved journey." },
    ],
  },
  {
    id: "qualify",
    label: "24/7 Qualification",
    icon: ShieldCheck,
    turns: [
      { who: "agent", text: "I can start a CASL-compliant intake. Nothing is shared until you tick consent." },
      { who: "user", text: "Sure — I want to sell my Burnaby townhouse in the spring." },
      { who: "agent", text: "Noted. Capturing timeline, property type, and preferred contact channel. Doug will review and reach out within 1 business day." },
      { who: "agent", text: "Consent confirmed. Draft brief queued for Doug. ✓" },
    ],
  },
];

// ── Chip prompts (per scenario) ──────────────────────────────────────────────
const CHIPS = {
  search: ["2BR Kitsilano <$1.5M", "West Side condos", "Ocean view homes"],
  tour: ["360° walkthrough", "Strata rules?", "Storage & parking"],
  neighbourhood: ["Schools nearby", "Transit score", "Parks & rec"],
  qualify: ["Start seller intake", "Book a call", "Get valuation"],
};

// ── Scripted "voice-input" pairs (per scenario) ──────────────────────────────
// Each entry is what the user "says" via voice and what Doogie narrates back.
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
  qualify: {
    heard: "Book me a Thursday morning call, please.",
    reply: "Noted — Thursday morning window, CASL consent captured. Doug will confirm within one business day. Nothing sent yet.",
  },
};

// ── Mock MLS listings (visual only) ──────────────────────────────────────────
const MOCK_LISTINGS = [
  { id: "L1", addr: "2135 W 8th Ave", city: "Kitsilano", price: "$1,289,000", beds: 2, baths: 2, sqft: 872, dom: 4, tag: "Beach 400m" },
  { id: "L2", addr: "1802 Balsam St",  city: "Kitsilano", price: "$1,449,000", beds: 2, baths: 2, sqft: 940, dom: 11, tag: "Corner unit" },
  { id: "L3", addr: "3110 Yew St",     city: "Kitsilano", price: "$1,199,000", beds: 2, baths: 1, sqft: 815, dom: 2, tag: "New listing" },
  { id: "L4", addr: "2455 Cornwall Ave",city: "Kitsilano", price: "$1,495,000", beds: 2, baths: 2, sqft: 1010, dom: 7, tag: "Ocean peek" },
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

// ── Right pane: Search scenario (listing carousel) ───────────────────────────
const PaneSearch = () => (
  <div data-testid="pane-search" style={{ display: "grid", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <strong style={{ color: C.navy, fontSize: 14 }}>Live from CREA DDF® · Kitsilano · 2BR · &lt;$1.5M</strong>
      <Pill tone="green"><Radio size={12}/> 12 active</Pill>
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
            <div style={{ fontSize: 12, color: "#4B5563", marginTop: 2 }}>{l.addr}</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6, display: "flex", gap: 8 }}>
              <span>{l.beds}bd</span><span>·</span><span>{l.baths}ba</span><span>·</span><span>{l.sqft} sqft</span><span>·</span><span>{l.dom}d</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

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
              <img
                src={DOOGIE_HEADSHOT} alt="Doogie narrator"
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  objectFit: "cover", objectPosition: "center 42%",
                  border: `2px solid ${C.gold}`, flexShrink: 0,
                }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: 0.5, textTransform: "uppercase" }}>Doogie · Narrating</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Ask about ceilings, strata, or nearby amenities</div>
                <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2, fontStyle: "italic" }}>Educational retrieval only — not advice</div>
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
                <span style={{ fontSize: 11, fontWeight: 600 }}>Doogie is your guide</span>
                <span style={{ fontSize: 9, opacity: 0.65, fontStyle: "italic" }}>Educational only — not advice</span>
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

// ── Right pane: 24/7 Qualification flow ──────────────────────────────────────
const PaneQualify = () => {
  const steps = [
    { k: "Intent",     v: "Sell · Burnaby townhouse" },
    { k: "Timeline",   v: "Spring 2026" },
    { k: "Contact",    v: "Email · morning" },
    { k: "CASL",       v: "Consent captured ✓" },
  ];
  const [prog, setProg] = useState(0);
  useEffect(() => {
    setProg(0);
    const t = setInterval(() => setProg(p => Math.min(100, p + 25)), 600);
    return () => clearInterval(t);
  }, []);
  return (
    <div data-testid="pane-qualify" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>Seller Qualification · CASL-compliant</strong>
        <Pill tone="green"><ShieldCheck size={12}/> Consent-first</Pill>
      </div>
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>Intake progress</div>
        <div style={{ height: 8, background: "#EEF2FB", borderRadius: 99, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${prog}%` }} transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ height: "100%", background: `linear-gradient(90deg, ${C.blue}, ${C.green})` }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
          {steps.map((s, i) => (
            <motion.div
              key={s.k}
              initial={{ opacity: 0 }} animate={{ opacity: prog >= (i + 1) * 25 ? 1 : 0.35 }}
              style={{
                background: prog >= (i + 1) * 25 ? "rgba(34,197,94,0.08)" : "#F8FAFF",
                border: "1px solid " + (prog >= (i + 1) * 25 ? "rgba(34,197,94,0.35)" : "#E5E7EB"),
                borderRadius: 10, padding: 10,
              }}
            >
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: C.blue, fontWeight: 700 }}>{s.k}</div>
              <div style={{ fontSize: 13, color: C.navy, marginTop: 4, fontWeight: 600 }}>{s.v}</div>
            </motion.div>
          ))}
        </div>
      </div>
      <div style={{
        background: "linear-gradient(135deg, rgba(30,79,207,0.06), rgba(34,197,94,0.06))",
        border: "1px solid #DDE6FA", borderRadius: 12, padding: 12, fontSize: 12, color: C.navy,
      }}>
        <strong>Next:</strong> Draft brief queued for Doug's review — no automated outreach without human sign-off. Educational retrieval only, not advice.
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
export default function VisualAgentDemo() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [turnIdx, setTurnIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
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
  const [voicePipaAck, setVoicePipaAck] = useState(false);
  const [showPipaGate, setShowPipaGate] = useState(false);
  const recognitionRef = useRef(null);
  const sessionIdRef = useRef(null);
  if (!sessionIdRef.current) {
    // Stable per-tab session for /api/doogie/chat continuity
    sessionIdRef.current = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? `visual-agent-${crypto.randomUUID()}`
      : `visual-agent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  const transcriptRef = useRef(null);

  const scenario = SCENARIOS[scenarioIdx];
  const visibleTurns = scenario.turns.slice(0, turnIdx + 1);
  const voiceScript = VOICE_SCRIPT[scenario.id];

  // Auto-advance turns; when done, switch to next scenario after a pause.
  // Paused while a voice interaction is active so the demo doesn't jump away.
  useEffect(() => {
    if (!playing) return;
    if (voiceState !== "idle" && voiceState !== "done") return;
    const isLastTurn = turnIdx >= scenario.turns.length - 1;
    const delay = isLastTurn ? 3200 : 2200;
    const t = setTimeout(() => {
      if (isLastTurn) {
        setScenarioIdx(i => (i + 1) % SCENARIOS.length);
        setTurnIdx(0);
      } else {
        setTurnIdx(i => i + 1);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [turnIdx, scenarioIdx, playing, voiceState, scenario.turns.length]);

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
    if (!voicePipaAck) {
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
      case "search": return <PaneSearch/>;
      case "tour": return <PaneTour/>;
      case "neighbourhood": return <PaneNeighbourhood/>;
      case "qualify": return <PaneQualify/>;
      default: return null;
    }
  }, [scenario.id]);

  const jumpTo = (i) => { setScenarioIdx(i); setTurnIdx(0); setPlaying(true); };
  const restart = () => { setScenarioIdx(0); setTurnIdx(0); setPlaying(true); };
  const voiceActive = voiceState === "listening" || voiceState === "transcribing" || voiceState === "replying";

  return (
    <div data-testid="visual-agent-demo-page" style={{ background: C.cream, minHeight: "100vh", paddingBottom: 60 }}>
      <Helmet>
        <title>Doogie Visual — Interactive Agent Concept · EZtoFind</title>
        <meta name="robots" content="noindex,nofollow"/>
        <meta name="description" content="Internal concept mockup of an interactive visual agent for BC real estate search, virtual tours, and 24/7 qualification."/>
      </Helmet>
      {/* ── Compliance banner ─────────────────────────────────────────────── */}
      <div data-testid="visual-agent-compliance-banner" style={{
        background: C.navy, color: "#fff", textAlign: "center",
        padding: "8px 16px", fontSize: 12, letterSpacing: 0.3,
      }}>
        <ShieldCheck size={12} style={{ verticalAlign: "-2px", marginRight: 6, color: C.gold }}/>
        <strong>Concept mockup</strong> · BCFSA / CASL / PIPA compliant boundary · Educational retrievals only — never advice
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
              <Pill tone="glass"><Radio size={12}/> Live prototype</Pill>
              <Pill tone="glass"><ShieldCheck size={12}/> 24/7 · BCFSA-safe</Pill>
              <Pill tone="glass"><MessageCircle size={12}/> Text · Voice · Video</Pill>
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 46px)",
              lineHeight: 1.1, margin: 0, fontWeight: 700,
            }}>
              Doogie <span style={{ color: C.gold, fontStyle: "italic" }}>Visual</span> — the next EZtoFind interface
            </h1>
            <p style={{ margin: "10px 0 0", opacity: 0.85, maxWidth: 620, fontSize: 14 }}>
              An interactive concept for search, virtual tours, neighbourhood retrievals, and 24/7 qualification —
              all inside the compliance boundary. This page is a scripted mockup for internal review.
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

      {/* ── Scenario tabs ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "-18px auto 0", padding: "0 20px", position: "relative", zIndex: 2 }}>
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
                {visibleTurns.map((t, i) => (
                  <motion.div
                    key={`${scenarioIdx}-${i}`}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: "flex", justifyContent: t.who === "user" ? "flex-end" : "flex-start",
                      marginBottom: 10, gap: 8, alignItems: "flex-end",
                    }}
                  >
                    {t.who === "agent" && (
                      <img
                        src={DOOGIE_HEADSHOT} alt=""
                        data-testid={`doogie-chip-${i}`}
                        style={{
                          width: 28, height: 28, borderRadius: "50%",
                          objectFit: "cover", objectPosition: "center 42%",
                          border: `2px solid ${C.gold}`, flexShrink: 0,
                          boxShadow: "0 2px 6px rgba(15,42,91,0.15)",
                        }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    <div style={{
                      maxWidth: "85%",
                      padding: "9px 13px", borderRadius: 14,
                      background: t.who === "user" ? C.mist : `linear-gradient(135deg, ${C.navy}, ${C.blue})`,
                      color: t.who === "user" ? C.navy : "#fff",
                      fontSize: 13, lineHeight: 1.45,
                      boxShadow: "0 1px 2px rgba(15,42,91,0.05)",
                    }}>
                      <div style={{
                        fontSize: 10, opacity: 0.7, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700,
                      }}>{t.who === "user" ? "You" : "Doogie Visual"}</div>
                      {t.text}
                    </div>
                  </motion.div>
                ))}

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
                    <img
                      src={DOOGIE_HEADSHOT} alt=""
                      style={{
                        width: 28, height: 28, borderRadius: "50%",
                        objectFit: "cover", objectPosition: "center 42%",
                        border: `2px solid ${C.gold}`, flexShrink: 0,
                        boxShadow: "0 2px 6px rgba(15,42,91,0.15)",
                      }}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
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

      {/* ── Concept notes strip ───────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: "22px auto 0", padding: "0 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {[
            { icon: Search,     h: "Retrieval-first search",  b: "Cites CREA DDF® and BC public data every turn." },
            { icon: Video,      h: "Guided virtual tours",    b: "360° walkthroughs with narrated hotspots." },
            { icon: MapPin,     h: "Neighbourhood context",   b: "Schools, transit, walkability, parks — sourced." },
            { icon: ShieldCheck,h: "24/7 qualification",      b: "CASL-first intake. Doug reviews before outreach." },
          ].map(c => (
            <div key={c.h} style={{
              background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.blue, marginBottom: 6 }}>
                <c.icon size={16}/>
                <strong style={{ color: C.navy, fontSize: 13 }}>{c.h}</strong>
              </div>
              <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.5 }}>{c.b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Compliance footer — BCFSA / CASL / PIPA reference on this page ─── */}
      <div style={{ maxWidth: 1000, margin: "26px auto 0", padding: "20px", color: "#4B5563", fontSize: 11 }}>
        <div style={{
          background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
          padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14,
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 700, color: C.blue, textTransform: "uppercase", marginBottom: 4 }}>
              <ShieldCheck size={11} style={{ verticalAlign: "-1px" }}/> BCFSA
            </div>
            <div>Doug LeMaire, REALTOR® · <strong>Licence #167790</strong> · Fraser Property Management Realty Services Ltd. Doogie is a hallucination-hardened <strong>educational retrieval tool</strong> — not advice. For personalized guidance, request a <a href="/referral-request" style={{ color: C.blue, fontWeight: 600 }}>licensed BC REALTOR®</a>. BCFSA Consumer Line: <strong>1-877-683-9664</strong>.</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 700, color: C.green, textTransform: "uppercase", marginBottom: 4 }}>
              <ShieldCheck size={11} style={{ verticalAlign: "-1px" }}/> CASL
            </div>
            <div>No commercial outreach is triggered by this demo. The Qualification scenario shows a <strong>consent-first intake</strong> — Doug never contacts a lead without ticked consent, express or implied, and every send carries an unsubscribe link.</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 0.5, fontWeight: 700, color: C.gold, textTransform: "uppercase", marginBottom: 4 }}>
              <ShieldCheck size={11} style={{ verticalAlign: "-1px" }}/> PIPA (BC)
            </div>
            <div>Scripted mode captures <strong>no audio</strong>. Live mode uses your browser's speech recognition (Google/Apple) — the disclosure gate appears before your first recording. Transcripts hit <code style={{ background: "#F1F5F9", padding: "1px 4px", borderRadius: 3 }}>/api/doogie/chat</code>, are PII-redacted, kept 30 days, then purged. Request your data or deletion at <a href="/privacy/data-request" style={{ color: C.blue, fontWeight: 600 }}>/privacy/data-request</a>.</div>
          </div>
        </div>
        <div style={{ marginTop: 12, textAlign: "center", opacity: 0.7 }}>
          <ArrowRight size={11} style={{ verticalAlign: "-1px" }}/> Internal mockup at <code style={{ background: "#F1F5F9", padding: "1px 6px", borderRadius: 4 }}>/visual-agent-demo</code>.
          Not linked from public navigation. All conversation content on this page is illustrative — no listings, offers, or contracts are formed here (RESA).
        </div>
      </div>

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
                    setVoicePipaAck(true); setShowPipaGate(false);
                    // Give React a tick to persist the ack before starting recognition
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
