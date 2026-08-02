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
  Mic, Video, Search, MapPin, Building2, Sparkles, Play, Pause,
  RotateCcw, ShieldCheck, MessageCircle, ChevronRight, School,
  Bus, Trees, Waves, CheckCircle2, ArrowRight, Home as HomeIcon,
  Compass, Radio
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
const Waveform = ({ active }) => {
  const bars = 14;
  return (
    <div data-testid="visual-agent-waveform" style={{ display: "flex", alignItems: "center", gap: 3, height: 22 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          animate={{ scaleY: active ? [0.3, 1, 0.4, 0.9, 0.2] : 0.3 }}
          transition={{ duration: 1.1 + (i % 4) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
          style={{
            display: "inline-block", width: 3, height: "100%",
            background: active ? C.gold : "rgba(255,255,255,0.35)",
            borderRadius: 2, transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
};

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

// ── Right pane: Virtual Tour (360° mock with hotspots) ───────────────────────
const PaneTour = () => {
  const [hot, setHot] = useState(null);
  const hotspots = [
    { id: "kitchen", x: 22, y: 55, label: "Kitchen · Bosch appliances" },
    { id: "ceiling", x: 55, y: 22, label: "9' over-height ceilings" },
    { id: "view", x: 78, y: 40, label: "SW peek to English Bay" },
  ];
  return (
    <div data-testid="pane-tour" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: C.navy, fontSize: 14 }}>360° Tour · 2135 W 8th Ave</strong>
        <Pill tone="gold"><Compass size={12}/> Interactive</Pill>
      </div>
      <div style={{
        position: "relative", height: 280, borderRadius: 12, overflow: "hidden",
        background: `radial-gradient(1200px 400px at 30% 40%, #4C74E8 0%, ${C.navy} 60%, ${C.ink} 100%)`,
        border: "1px solid #E5E7EB",
      }}>
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
      </div>
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
  const transcriptRef = useRef(null);

  const scenario = SCENARIOS[scenarioIdx];
  const visibleTurns = scenario.turns.slice(0, turnIdx + 1);

  // Auto-advance turns; when done, switch to next scenario after a pause.
  useEffect(() => {
    if (!playing) return;
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
  }, [turnIdx, scenarioIdx, playing, scenario.turns.length]);

  // Autoscroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [turnIdx, scenarioIdx]);

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
              width: 88, height: 88, borderRadius: "50%",
              background: `conic-gradient(from 90deg, ${C.gold}, ${C.blue}, #6C8CFF, ${C.green}, ${C.gold})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "3px solid rgba(255,255,255,0.35)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(15,42,91,0.7)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 22, letterSpacing: 0.5,
            }}>
              <Sparkles size={26} color={C.gold}/>
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
            <Waveform active={playing}/>
            <div style={{ display: "flex", gap: 8 }}>
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
                      marginBottom: 10,
                    }}
                  >
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

      {/* ── Footer note ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1000, margin: "26px auto 0", padding: "0 20px", color: "#6B7280", fontSize: 11, textAlign: "center" }}>
        <ArrowRight size={11} style={{ verticalAlign: "-1px" }}/> Internal mockup at <code style={{ background: "#F1F5F9", padding: "1px 6px", borderRadius: 4 }}>/visual-agent-demo</code>.
        Not linked from public navigation. All data shown is illustrative.
      </div>

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
