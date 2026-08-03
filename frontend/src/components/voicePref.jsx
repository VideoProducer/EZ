// ============================================================================
//  voicePref — a tiny shared hook for the site-wide "mute Doogie" preference.
//  Backed by localStorage (`ez_doogie_voice_muted` = "1" | "0"), broadcasts a
//  window CustomEvent so every component (Tour, Narration, Ask Doogie) stays
//  in sync when the toggle flips. Also tracks a playback speed (0.8..1.3).
//  Also exports <DoogieVoiceToggle/> — the small speaker icon rendered in the
//  header, and injects a global "doogie-talking" keyframes CSS block used by
//  the mascots to gently bounce while audio is playing.
// ============================================================================
import React, { useEffect, useState } from "react";
import { Volume2, VolumeX, Gauge } from "lucide-react";

const KEY = "ez_doogie_voice_muted";
const SPEED_KEY = "ez_doogie_voice_speed";
const EVT = "ez-doogie-voice-pref";
const SPEED_EVT = "ez-doogie-voice-speed";
const MIN_SPEED = 0.8;
const MAX_SPEED = 1.3;
const DEFAULT_SPEED = 1.0;

export const isDoogieMuted = () => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

export const setDoogieMuted = (muted) => {
  try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch {}
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: { muted } })); } catch {}
};

export const getDoogieSpeed = () => {
  try {
    const v = parseFloat(localStorage.getItem(SPEED_KEY) || "");
    if (isFinite(v)) return Math.max(MIN_SPEED, Math.min(MAX_SPEED, v));
  } catch {}
  return DEFAULT_SPEED;
};

export const setDoogieSpeed = (speed) => {
  const clamped = Math.max(MIN_SPEED, Math.min(MAX_SPEED, Number(speed) || DEFAULT_SPEED));
  try { localStorage.setItem(SPEED_KEY, String(clamped)); } catch {}
  try { window.dispatchEvent(new CustomEvent(SPEED_EVT, { detail: { speed: clamped } })); } catch {}
};

// React hook — returns the current muted flag and re-renders when it flips.
export const useDoogieMuted = () => {
  const [muted, setMuted] = useState(isDoogieMuted);
  useEffect(() => {
    const onChange = (e) => setMuted(!!e.detail?.muted);
    const onStorage = (e) => { if (e.key === KEY) setMuted(e.newValue === "1"); };
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return muted;
};

// React hook — returns the current playback speed (0.8..1.3) and re-renders
// when the slider moves. Consumers should apply this to `audio.playbackRate`.
export const useDoogieSpeed = () => {
  const [speed, setSpeed] = useState(getDoogieSpeed);
  useEffect(() => {
    const onChange = (e) => {
      const s = Number(e.detail?.speed);
      if (isFinite(s)) setSpeed(s);
    };
    const onStorage = (e) => { if (e.key === SPEED_KEY) setSpeed(getDoogieSpeed()); };
    window.addEventListener(SPEED_EVT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SPEED_EVT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return speed;
};

// Small header toggle — light hover state so it doesn't fight the topbar look.
export const DoogieVoiceToggle = () => {
  const muted = useDoogieMuted();
  const toggle = () => setDoogieMuted(!muted);
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="doogie-voice-toggle"
      aria-label={muted ? "Unmute Doogie's voice" : "Mute Doogie's voice"}
      aria-pressed={muted}
      title={muted ? "Doogie's voice is muted — click to unmute" : "Mute Doogie's voice site-wide"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: muted ? "#F3F4F6" : "#EEF2FF",
        border: `1px solid ${muted ? "#D1D5DB" : "#C7D2FE"}`,
        color: muted ? "#6B7280" : "#3730A3",
        padding: "6px 12px", borderRadius: 999, cursor: "pointer",
        fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {muted ? <VolumeX size={13}/> : <Volume2 size={13}/>}
      {muted ? "Voice off" : "Voice on"}
    </button>
  );
};

// Speed slider — a compact popover with a native range input (0.8..1.3, step
// 0.05). Hidden when the voice is muted since it wouldn't do anything.
export const DoogieSpeedSlider = () => {
  const speed = useDoogieSpeed();
  const muted = useDoogieMuted();
  const [open, setOpen] = useState(false);
  if (muted) return null;
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        data-testid="doogie-speed-toggle"
        aria-label="Adjust Doogie voice speed"
        aria-pressed={open}
        title={`Doogie speed: ${speed.toFixed(2)}× — click to adjust`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: open ? "#0F2A5B" : "#EEF2FF",
          border: `1px solid ${open ? "#0F2A5B" : "#C7D2FE"}`,
          color: open ? "#fff" : "#3730A3",
          padding: "6px 12px", borderRadius: 999, cursor: "pointer",
          fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <Gauge size={13}/> {speed.toFixed(2)}×
      </button>
      {open && (
        <div
          data-testid="doogie-speed-popover"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 300,
            background: "#fff", border: "1px solid #C7D2FE", borderRadius: 12,
            boxShadow: "0 10px 30px rgba(15,42,91,0.20)",
            padding: 14, width: 260, fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: "#0F2A5B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Doogie voice speed
          </div>
          <input
            type="range"
            min={MIN_SPEED} max={MAX_SPEED} step="0.05"
            value={speed}
            onChange={e => setDoogieSpeed(parseFloat(e.target.value))}
            data-testid="doogie-speed-slider"
            aria-valuemin={MIN_SPEED} aria-valuemax={MAX_SPEED} aria-valuenow={speed}
            style={{ width: "100%", accentColor: "#0A3D99" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6B7280", marginTop: 4 }}>
            <span>0.80×</span>
            <strong style={{ color: "#0F2A5B" }}>{speed.toFixed(2)}×</strong>
            <span>1.30×</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, gap: 6 }}>
            {[0.85, 1.0, 1.15].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setDoogieSpeed(s)}
                data-testid={`doogie-speed-preset-${String(s).replace(".", "")}`}
                style={{
                  flex: 1, background: Math.abs(speed - s) < 0.01 ? "#0A3D99" : "#F3F4F6",
                  color: Math.abs(speed - s) < 0.01 ? "#fff" : "#374151",
                  border: "none", borderRadius: 8, padding: "6px 4px",
                  fontSize: 10, fontWeight: 700, cursor: "pointer",
                }}
              >{s.toFixed(2)}×</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Shared "talking" CSS injected once. Consumers add
//   className={isPlaying ? "doogie-talking" : ""}
// to any mascot <img>.
export const DoogieTalkingStyle = () => (
  <style>{`
    @keyframes doogie-talking-bob {
      0%, 100% { transform: translateY(0) rotate(-1.5deg); }
      25%      { transform: translateY(-3px) rotate(1.2deg); }
      50%      { transform: translateY(0) rotate(-0.6deg); }
      75%      { transform: translateY(-2px) rotate(1deg); }
    }
    @keyframes doogie-talking-glow {
      0%, 100% { filter: drop-shadow(0 3px 8px rgba(15,42,91,0.20)); }
      50%      { filter: drop-shadow(0 6px 14px rgba(245,166,35,0.55)); }
    }
    .doogie-talking {
      animation: doogie-talking-bob 0.55s ease-in-out infinite,
                 doogie-talking-glow 1.3s ease-in-out infinite;
      transform-origin: 50% 90%;
    }
  `}</style>
);
