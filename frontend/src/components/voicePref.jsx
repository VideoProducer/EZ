// ============================================================================
//  voicePref — a tiny shared hook for the site-wide "mute Doogie" preference.
//  Backed by localStorage (`ez_doogie_voice_muted` = "1" | "0"), broadcasts a
//  window CustomEvent so every component (Tour, Narration, Ask Doogie) stays
//  in sync when the toggle flips.
//  Also exports <DoogieVoiceToggle/> — the small speaker icon rendered in the
//  header, and injects a global "doogie-talking" keyframes CSS block used by
//  the mascots to gently bounce while audio is playing.
// ============================================================================
import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const KEY = "ez_doogie_voice_muted";
const EVT = "ez-doogie-voice-pref";

export const isDoogieMuted = () => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

export const setDoogieMuted = (muted) => {
  try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch {}
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: { muted } })); } catch {}
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
