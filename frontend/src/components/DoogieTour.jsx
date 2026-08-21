// ============================================================================
//  DoogieTour — a 45-60 second guided walkthrough that auto-plays on a user's
//  first visit. Each stop:
//    1. spotlights a specific UI element by data-testid
//    2. plays Doogie's voice (OpenAI TTS "ash" via /api/doogie/tts)
//    3. auto-advances when the audio ends (or user taps Next)
//  Skippable at any time. Uses localStorage flag `ez_doogie_tour_seen` so it
//  only auto-plays once — but can be re-triggered manually via the "Take the
//  Doogie tour" pill that mounts alongside this component.
// ============================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Play, ChevronRight } from "lucide-react";
import { useDoogieMuted, useDoogieSpeed } from "./voicePref";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOUR_SEEN_KEY = "ez_doogie_tour_seen";

const STEPS = [
  {
    testid: "dash-search-form",
    title: "Start here — Filters",
    script: "Woof! I'm Doogie. Welcome to EZtoFind. Type any BC city, or a natural-language search like three bed condo in Kelowna, and hit Search. Every result is a live CREA listing — never invented.",
    align: "right",   // Doogie card placement relative to viewport
  },
  {
    testid: "dash-search-map",
    title: "The live map",
    script: "Every price pin on the map is a real active listing. Hover a pin and its card below lights up in gold. Hover a card, and its pin pops. It's the fastest way to see what's where.",
    align: "left",
  },
  {
    testid: null,   // dynamic — first listing card
    testidPrefix: "dash-listing-focus-",
    title: "Fly to any home",
    script: "See the small map-pin button on every card? Tap it and I'll fly the map right to that home, opening the listing popup. Great for checking commute and neighbourhood before you dig deeper.",
    align: "left",
  },
  {
    testid: "dash-nav-buyer",
    title: "Buyer & Seller Insights",
    script: "The Insights sections show live buyer and seller signals from CREA — inventory, median price, and price trends. Type any BC city and the whole snapshot re-populates instantly.",
    align: "right",
  },
  {
    testid: "dash-nav-ask",
    title: "Ask me anything",
    script: "And any time you're stuck, tap Ask Doogie. I'll answer questions about BC terms, communities, or the market — general information only, never advice. Ready to explore? Woof!",
    align: "right",
  },
];

// Utility — find target element for a step.
const _findTarget = (step) => {
  if (step.testid) return document.querySelector(`[data-testid="${step.testid}"]`);
  if (step.testidPrefix) return document.querySelector(`[data-testid^="${step.testidPrefix}"]`);
  return null;
};

// Bounding box (viewport coords) of the target, clamped away from edges.
const _boxOf = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

export default function DoogieTour({ firstVisitToastOpen = false } = {}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [box, setBox] = useState(null);
  const audioRef = useRef(null);
  const muted = useDoogieMuted();
  const speed = useDoogieSpeed();

  // Apply playbackRate whenever the shared speed pref changes — no reload
  // needed, the audio picks it up mid-clip.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, i]);

  // Auto-play DISABLED (Feb 20 2026 — Phase D brief §4). The tour used to
  // fire 1.5s after first paint on the homepage, which covered the primary
  // conversion CTAs ("What's my home worth?" / "Tell Doug what you're
  // looking for"). Under the brief, conversion actions must be the primary
  // commercial affordance and tours cannot obscure them. Users can still
  // start the tour any time via the "Take the Doogie tour" pill (below).
  // The TOUR_SEEN_KEY localStorage flag is preserved so the pill still
  // says "Watch again" for returning visitors.
  useEffect(() => { /* auto-start disabled; manual pill only */ }, []);

  const step = STEPS[i];

  // Recompute the spotlight box each time step changes + on scroll/resize.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = _findTarget(step);
      if (!el) return setBox(null);
      // scroll into view (soft, centered)
      try { el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }); } catch {}
      // wait a beat for scroll, then measure
      setTimeout(() => setBox(_boxOf(el)), 350);
    };
    update();
    const rer = () => setBox(_boxOf(_findTarget(step)));
    window.addEventListener("scroll", rer, true);
    window.addEventListener("resize", rer);
    return () => {
      window.removeEventListener("scroll", rer, true);
      window.removeEventListener("resize", rer);
    };
  }, [open, i, step]);

  // Load + auto-play audio for the current step (skipped when muted — the
  // step still auto-advances via a short read-time timer so the tour keeps
  // pace with the visual highlight, but no audio plays).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPlaying(false);
    if (muted) {
      // Auto-advance after a short read window (~4s per step) when audio is off.
      const t = setTimeout(() => { if (!cancelled) next(); }, 4200);
      return () => { cancelled = true; clearTimeout(t); };
    }
    setBusy(true);
    // Prewarm the NEXT step's TTS while we're playing this one — so when the
    // user auto-advances (or taps Next) the audio arrives instantly instead
    // of after a 3-6 s OpenAI round-trip.
    if (i + 1 < STEPS.length) {
      const nextScript = STEPS[i + 1].script;
      try {
        fetch(`${API}/doogie/tts/prewarm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: nextScript, voice: "ash" }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    }
    (async () => {
      try {
        const prep = await fetch(`${API}/doogie/tts/prepare`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: step.script, voice: "ash" }),
        });
        if (!prep.ok) throw new Error(`tts prepare ${prep.status}`);
        const { audio_url, cache } = await prep.json();
        if (cancelled) return;
        const backendBase = API.replace(/\/api$/, "");
        const url = `${backendBase}${audio_url}${cache === "HIT" ? "" : "?wait=1"}`;
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.playbackRate = speed;
          audioRef.current.play().then(() => setPlaying(true)).catch(() => { /* autoplay policy may block; user can hit Next */ });
        }
      } catch { /* fall through — user can advance manually */ }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; setPlaying(false); if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i, step.script, muted]);

  const close = (dismiss) => {
    setOpen(false);
    setI(0);
    if (dismiss) {
      try { localStorage.setItem(TOUR_SEEN_KEY, "1"); } catch {}
    }
  };

  const next = () => {
    if (i < STEPS.length - 1) setI(i + 1);
    else close(true);
  };

  // Re-play trigger — small pill in bottom-right when the tour is closed AND
  // the user has already seen it once (so they can replay on demand).
  const alreadySeen = useMemo(() => {
    try { return !!localStorage.getItem(TOUR_SEEN_KEY); } catch { return false; }
  }, [open]);

  if (!open) {
    if (!alreadySeen) return null;
    // On narrow mobile viewports the FirstVisitToast pins to the full width
    // at bottom:16 with a "Got it — let's explore" CTA. Our replay pill sat
    // right on top of that button. When the parent tells us the toast is
    // still visible AND we're on mobile, hide the pill until the toast is
    // dismissed. (Prop-driven so we don't race the sibling DOM commit.)
    const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
    if (isMobile && firstVisitToastOpen) return null;
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid="doogie-tour-replay"
        aria-label="Take the Doogie tour"
        style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 90,
          background: "#0F2A5B", color: "#fff", border: "none",
          padding: "10px 16px", borderRadius: 999, cursor: "pointer",
          boxShadow: "0 8px 20px rgba(15,42,91,0.35)",
          fontWeight: 700, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
          display: "inline-flex", alignItems: "center", gap: 8,
        }}
      >
        <Play size={13}/> Take the Doogie tour
      </button>
    );
  }

  const PAD = 10;
  const spot = box
    ? { top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }
    : null;

  // Doogie card position — pin to viewport corner so it's always visible.
  const cardStyle = {
    position: "fixed", zIndex: 200,
    ...(step.align === "left"
      ? { left: 24, bottom: 24 }
      : { right: 24, bottom: 24 }),
    width: 360, maxWidth: "calc(100vw - 40px)",
    background: "#fff", borderRadius: 14,
    boxShadow: "0 20px 50px rgba(15,42,91,0.35)",
    padding: 18, border: "1px solid rgba(245,166,35,0.5)",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#0F2A5B",
  };

  return (
    <div data-testid="doogie-tour-overlay">
      {/* Full-viewport backdrop with a cut-out spotlight on the target */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 180, pointerEvents: "none",
          background: spot
            ? "transparent"
            : "rgba(15,42,91,0.55)",
          transition: "background 0.25s",
        }}
      />
      {spot && (
        <>
          {/* Four rectangles that fill everything EXCEPT the spotlight — this
              avoids relying on CSS mask (better browser support than SVG). */}
          <div style={_backdropRect({ top: 0, left: 0, right: 0, height: spot.top })}/>
          <div style={_backdropRect({ top: spot.top, height: spot.height, left: 0, width: spot.left })}/>
          <div style={_backdropRect({ top: spot.top, height: spot.height, left: spot.left + spot.width, right: 0 })}/>
          <div style={_backdropRect({ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 })}/>
          {/* Highlight ring around the target — static box-shadow (no
              animation on this outer ring; the pulse is a compositor-safe
              pseudo-halo on the mascot itself). */}
          <div style={{
            position: "fixed",
            top: spot.top, left: spot.left, width: spot.width, height: spot.height,
            border: "3px solid #F5A623",
            borderRadius: 12,
            boxShadow: "0 0 0 4px rgba(245,166,35,0.30), 0 0 30px rgba(245,166,35,0.55)",
            zIndex: 190, pointerEvents: "none",
          }}/>
        </>
      )}

      {/* Doogie card */}
      <div style={cardStyle} data-testid="doogie-tour-card">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <img
            src="/doogie/thinking.webp"
            alt="Doogie"
            data-testid="doogie-tour-mascot"
            className={playing ? "doogie-talking" : ""}
            style={{ width: 72, height: 72, flexShrink: 0, filter: "drop-shadow(0 3px 8px rgba(15,42,91,0.2))" }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, color: "#F5A623", textTransform: "uppercase" }}>
                Step {i + 1} of {STEPS.length}
              </div>
              <button
                onClick={() => close(true)}
                aria-label="Skip the Doogie tour"
                data-testid="doogie-tour-skip"
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "#6B7280", padding: 2,
                }}
              ><X size={16}/></button>
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{step.title}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "#374151" }}>{step.script}</div>
          </div>
        </div>
        <audio ref={audioRef} preload="auto" disableRemotePlayback onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); next(); }} data-testid="doogie-tour-audio"/>
        {/* Progress dots — one per step. Clickable so users can jump. */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }} data-testid="doogie-tour-progress">
          {STEPS.map((_, idx) => {
            const active = idx === i;
            const done = idx < i;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                data-testid={`doogie-tour-dot-${idx}`}
                aria-label={`Go to step ${idx + 1}`}
                aria-current={active ? "step" : undefined}
                style={{
                  width: active ? 20 : 8, height: 8, borderRadius: 999,
                  background: active ? "#F5A623" : done ? "#0A3D99" : "#E5E7EB",
                  border: "none", padding: 0, cursor: "pointer",
                  transition: "width 0.2s, background 0.2s",
                }}
              />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 8 }}>
          <button
            onClick={() => close(true)}
            data-testid="doogie-tour-skip-btn"
            style={{
              background: "transparent", border: "1px solid #DDE6FA", color: "#0F2A5B",
              padding: "8px 14px", borderRadius: 999, fontWeight: 700, fontSize: 12,
              cursor: "pointer",
            }}
          >Skip tour</button>
          <button
            onClick={next}
            data-testid="doogie-tour-next"
            style={{
              background: "#0A3D99", color: "#fff", border: "none",
              padding: "9px 18px", borderRadius: 999, fontWeight: 700, fontSize: 13,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
              boxShadow: "0 6px 14px rgba(10,61,153,0.35)",
            }}
          >
            {i < STEPS.length - 1 ? (<>Next <ChevronRight size={14}/></>) : "Finish"}
          </button>
        </div>
        {busy && (
          <div style={{ fontSize: 10, color: "#6B7280", marginTop: 6, fontStyle: "italic" }}>Loading Doogie's voice…</div>
        )}
      </div>

      <style>{`
        /* Composited pulse — animates opacity + transform of a pseudo halo
           instead of box-shadow, so it runs on the GPU and doesn't trigger
           layout on every frame (was causing CLS 0.542 → aiming for <0.1). */
        @keyframes doogie-pulse {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 0.85; transform: translate(-50%, -50%) scale(1.12); }
        }
        [data-testid="doogie-tour-mascot"] { position: relative; will-change: transform; }
        [data-testid="doogie-tour-mascot"]::before {
          content: ""; position: absolute; top: 50%; left: 50%;
          width: 100%; height: 100%; border-radius: 50%;
          background: radial-gradient(circle, rgba(245,166,35,0.55) 0%, rgba(245,166,35,0) 70%);
          transform: translate(-50%, -50%);
          animation: doogie-pulse 1.4s ease-in-out infinite;
          pointer-events: none; z-index: -1;
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
}

const _backdropRect = (pos) => ({
  position: "fixed",
  background: "rgba(15,42,91,0.55)",
  zIndex: 185,
  pointerEvents: "none",
  ...pos,
});
