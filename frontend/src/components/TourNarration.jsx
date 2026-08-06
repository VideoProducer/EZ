// ============================================================================
//  TourNarration — Doogie voice-over for the Virtual Tour iframe.
//  Companion to ListingNarration (photo-reel).  Renders a distinct navy pill
//  above/beside the tour iframe: "🎬 Have Doogie narrate this virtual tour".
//  Fetches a longer plain-text script from `/api/listings/{key}/tour_narration`
//  and plays it through the shared /api/doogie/tts pipeline (Voice: Ash).
//  Unlike ListingNarration this variant intentionally has NO photo-index sync
//  — the tour iframe is the visual, Doogie is the audio layer.
// ============================================================================
import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, StopCircle, VolumeX, Film } from "lucide-react";
import { useDoogieMuted, useDoogieSpeed } from "./voicePref";
import { DoogieTalkingStyle } from "./voicePref";
import mediaBus from "../lib/mediaBus";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TourNarration({ listing }) {
  const [state, setState] = useState("idle"); // idle | loading | playing | paused
  const [available, setAvailable] = useState(true); // 404 flips this false
  const audioRef = useRef(null);
  const scriptCacheRef = useRef(null);
  const objectUrlRef = useRef(null);
  const muted = useDoogieMuted();
  const speed = useDoogieSpeed();

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);
  // Reset cache when navigating to a different listing.
  useEffect(() => {
    scriptCacheRef.current = null;
    setState("idle");
    setAvailable(!!(listing?.virtual_tour_embed?.url));
  }, [listing?.listing_key, listing?.virtual_tour_embed?.url]);

  if (!listing || !listing.virtual_tour_embed?.url || !available) return null;

  const _resolveScript = async () => {
    if (scriptCacheRef.current) return scriptCacheRef.current;
    const r = await fetch(`${API}/listings/${encodeURIComponent(listing.listing_key)}/tour_narration`);
    if (r.status === 404) { setAvailable(false); throw new Error("no tour narration"); }
    if (!r.ok) throw new Error(`tour narration ${r.status}`);
    const j = await r.json();
    const script = (j?.script || "").trim();
    if (script.length < 40) throw new Error("script too short");
    // Append compliance outro so the tour narration matches Doogie's overall tone.
    const outro = " This is general information only, not advice. Enjoy the tour!";
    scriptCacheRef.current = script + outro;
    return scriptCacheRef.current;
  };

  const play = async () => {
    if (muted) return;
    if (state === "playing") { audioRef.current?.pause(); setState("paused"); mediaBus.release("doogie-tour"); return; }
    if (state === "paused")  {
      audioRef.current?.play(); setState("playing");
      mediaBus.claim("doogie-tour", { pause: () => { try { audioRef.current?.pause(); setState("paused"); } catch {} } });
      return;
    }
    setState("loading");
    try {
      const script = await _resolveScript();
      const r = await fetch(`${API}/doogie/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script, voice: "ash" }),
      });
      if (!r.ok) throw new Error(`tts ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.playbackRate = speed;
        await audioRef.current.play();
        setState("playing");
        // Take the audio floor so any playing video gets auto-stopped.
        mediaBus.claim("doogie-tour", { pause: () => { try { audioRef.current?.pause(); setState("paused"); } catch {} } });
      }
    } catch {
      setState("idle");
    }
  };
  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState("idle");
    mediaBus.release("doogie-tour");
  };

  const label = muted            ? "Voice muted — click the header speaker to unmute"
              : state === "loading" ? "Loading Doogie's voice-over…"
              : state === "playing" ? "Pause voice-over"
              : state === "paused"  ? "Resume voice-over"
              : "Have Doogie narrate this virtual tour";
  const Icon = muted ? VolumeX : (state === "playing" ? Pause : Play);

  return (
    <div data-testid="tour-narration" style={{ margin: "0 0 12px" }}>
      <DoogieTalkingStyle/>
      <div style={{
        background: "linear-gradient(90deg, #0F2A5B 0%, #163875 100%)",
        border: "1px solid rgba(245,166,35,0.35)", borderRadius: 12,
        padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
        flexWrap: "wrap", color: "#fff",
        boxShadow: "0 6px 18px rgba(15,42,91,0.25)",
      }}>
        <img
          src="/doogie/thinking.webp"
          alt="Doogie"
          data-testid="tour-narration-mascot"
          className={state === "playing" ? "doogie-talking" : ""}
          style={{ width: 48, height: 48, flexShrink: 0, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}
          onError={e => { e.currentTarget.style.display = "none"; }}
        />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 15 }}>
            <Film size={14} style={{ opacity: 0.9 }}/> Doogie's tour voice-over
          </div>
          <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85, lineHeight: 1.45 }}>
            Play me alongside the virtual tour — I'll walk you through the home while you spin around.
            <span style={{ display: "block", opacity: 0.75, fontStyle: "italic", marginTop: 2 }}>
              Tip: press Play on either the video or Doogie — the other will automatically pause so voices don't overlap.
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={play}
            disabled={state === "loading" || muted}
            data-testid="tour-narration-play"
            style={{
              background: muted ? "#6B7280" : "#F5A623",
              color: muted ? "#fff" : "#0F2A5B",
              border: "none", borderRadius: 999,
              cursor: (state === "loading" || muted) ? "not-allowed" : "pointer",
              padding: "10px 18px", fontWeight: 700, fontSize: 13,
              display: "inline-flex", alignItems: "center", gap: 8,
              boxShadow: muted ? "none" : "0 4px 12px rgba(245,166,35,0.45)",
              opacity: state === "loading" ? 0.7 : 1,
            }}
          >
            <Icon size={14}/> {label}
          </button>
          {(state === "playing" || state === "paused") && (
            <button
              onClick={stop}
              aria-label="Stop tour narration"
              data-testid="tour-narration-stop"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff", borderRadius: 999, cursor: "pointer",
                padding: "9px 12px", display: "inline-flex",
                alignItems: "center", gap: 6, fontWeight: 700, fontSize: 12,
              }}
            >
              <StopCircle size={14}/> Stop
            </button>
          )}
        </div>
      </div>
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setState("idle")}
        onError={() => setState("idle")}
        data-testid="tour-narration-audio"
      />
    </div>
  );
}
