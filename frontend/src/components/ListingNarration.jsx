// ============================================================================
//  ListingNarration — a Doogie-voice narrator for individual BC listings.
//  Renders a blue pill on the ListingDetail page ("Have Doogie walk me through
//  this home"). On click, builds a compliance-safe script from the listing's
//  CREA fields (address, beds/baths, price, tour flag, photo count) plus a
//  generic buyer checklist (roof / mechanicals / strata) — never a value
//  opinion. Ends with a CTA to Doug if the listing is in his service area.
// ============================================================================
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Play, Pause, StopCircle, VolumeX, Maximize2, X, Share2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useDoogieMuted, useDoogieSpeed } from "./voicePref";
import { DoogieTalkingStyle } from "./voicePref";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SERVICE_AREA_CITIES = new Set([
  "vancouver", "burnaby", "richmond", "surrey", "coquitlam", "port coquitlam",
  "port moody", "delta", "new westminster", "north vancouver", "west vancouver",
  "maple ridge", "pitt meadows", "langley", "abbotsford", "chilliwack",
  "mission", "hope", "harrison hot springs", "kent", "squamish", "whistler",
  "pemberton", "furry creek", "britannia beach",
]);

const _isInServiceArea = (city) => {
  if (!city) return false;
  return SERVICE_AREA_CITIES.has(String(city).trim().toLowerCase());
};

// Build a lightweight opener/closer wrapper the LLM narration slots into.
// The main body now comes from `/api/listings/{key}/narration` (Haiku
// rewrites the DDF description as a first-person walk-through in Doogie's
// voice) — this local builder is only used as a fallback when the network
// call fails so the pill never becomes useless.
const _buildFallbackScript = (l) => {
  if (!l) return "";
  const parts = [];
  const addr = l.street_address || l.unparsed_address || "this property";
  const city = l.city || "British Columbia";
  parts.push(`Woof! Let me walk you through ${addr}, in ${city}.`);
  const beds = l.beds != null ? `${l.beds} bed` : null;
  const baths = l.baths != null ? `${l.baths} bath` : null;
  const pt = (l.property_type || "").toLowerCase() || "home";
  const price = l.list_price ? `$${Number(l.list_price).toLocaleString()}` : null;
  const spec = [beds, baths].filter(Boolean).join(", ");
  if (spec && price) parts.push(`It's a ${spec} ${pt} listed at ${price}.`);
  const desc = (l.description || "").trim();
  if (desc) parts.push(desc.slice(0, 700));
  parts.push("That's the walk-through — check the photos and virtual tour above for the details I couldn't put into words.");
  return parts.join(" ");
};

// Compliance-safe outro appended after the LLM body (or fallback body). The
// LLM prompt intentionally omits this so we can tailor it based on
// service-area membership at render time.
const _buildOutro = (l, inServiceArea) => {
  const parts = [" This is general information only, not advice. For value or fit, always talk to a REALTOR."];
  if (inServiceArea) parts.push(" Want to see this one in person? Ask Doug for a viewing — he's licensed for this area.");
  return parts.join(" ");
};

export default function ListingNarration({ listing, onAdvancePhoto, photoCount = 0 }) {
  const [state, setState] = useState("idle"); // idle | loading | playing | paused
  const [progress, setProgress] = useState(0); // 0..1 for the reel indicator
  const [fullscreen, setFullscreen] = useState(false);
  const [scriptText, setScriptText] = useState("");
  const [cues, setCues] = useState([]); // [{sentence, photo_idx}]
  const [photoIdx, setLocalPhotoIdx] = useState(0);
  const [shareStatus, setShareStatus] = useState(""); // "" | "copied" | "failed"
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const scriptCacheRef = useRef(null); // last fetched LLM narration bundle
  const muted = useDoogieMuted();
  const speed = useDoogieSpeed();
  const inServiceArea = _isInServiceArea(listing?.city);
  // Reset any cached LLM narration when the user navigates to a new listing.
  React.useEffect(() => {
    scriptCacheRef.current = null;
    setScriptText("");
    setCues([]);
  }, [listing?.listing_key]);

  // Re-apply speed if the user drags the slider mid-narration.
  React.useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Sentence timeline — prefer room-aware Haiku cues, fall back to even split.
  const sentences = useMemo(() => {
    if (cues && cues.length) return cues.map(c => c.sentence);
    if (!scriptText) return [];
    const raw = scriptText.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [scriptText];
    return raw.map(s => s.trim()).filter(Boolean);
  }, [cues, scriptText]);
  const currentSentenceIdx = useMemo(() => {
    if (!sentences.length) return 0;
    return Math.min(sentences.length - 1, Math.floor(progress * sentences.length));
  }, [progress, sentences.length]);

  // Handle audio time updates → drive the reel + progress bar. When we have
  // room-aware cues, use them; otherwise even-distribute across all photos.
  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !a.duration || !isFinite(a.duration)) return;
    const ratio = Math.max(0, Math.min(1, a.currentTime / a.duration));
    setProgress(ratio);
    if (photoCount > 1) {
      let idx;
      if (cues && cues.length) {
        const cueIdx = Math.min(cues.length - 1, Math.floor(ratio * cues.length));
        idx = Math.max(0, Math.min(photoCount - 1, cues[cueIdx].photo_idx | 0));
      } else {
        idx = Math.min(photoCount - 1, Math.floor(ratio * photoCount));
      }
      setLocalPhotoIdx(idx);
      if (onAdvancePhoto) onAdvancePhoto(idx);
    }
  };

  // Fetch (or reuse) the LLM narration script from the backend, then fall
  // back to a local composition if the endpoint fails.
  const _resolveScript = async () => {
    if (scriptCacheRef.current) return scriptCacheRef.current.script;
    let body = "";
    let fetchedCues = [];
    try {
      const r = await fetch(`${API}/listings/${encodeURIComponent(listing.listing_key)}/narration`);
      if (r.ok) {
        const j = await r.json();
        if (j && typeof j.script === "string" && j.script.trim().length > 40) body = j.script.trim();
        if (Array.isArray(j?.cues)) fetchedCues = j.cues;
      }
    } catch { /* fall through to local */ }
    if (!body) body = _buildFallbackScript(listing);
    const full = body + _buildOutro(listing, inServiceArea);
    scriptCacheRef.current = { script: full, cues: fetchedCues };
    setScriptText(full);
    setCues(fetchedCues);
    return full;
  };

  // Copy a share URL that reopens the fullscreen reel + auto-plays on land.
  const copyShareLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("reel", "1");
      const link = url.toString();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        // Legacy fallback for older browsers / non-secure contexts.
        const ta = document.createElement("textarea");
        ta.value = link;
        document.body.appendChild(ta); ta.select(); document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setShareStatus("copied");
      setTimeout(() => setShareStatus(""), 2200);
    } catch {
      setShareStatus("failed");
      setTimeout(() => setShareStatus(""), 2200);
    }
  };

  // Auto-open + auto-play the reel when the page lands with `?reel=1` in the
  // URL. Runs ONCE per listing_key so it doesn't fight the user's later clicks.
  const autoOpenedRef = useRef(false);
  React.useEffect(() => {
    if (autoOpenedRef.current) return;
    if (muted) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reel") === "1") {
        autoOpenedRef.current = true;
        // Small delay so the audio element is mounted + listing is fetched.
        setTimeout(() => { openFullscreen(); }, 600);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.listing_key, muted]);

  // "Watch full-screen reel" — open the immersive overlay AND start playback
  // if not already going. Reuses the same <audio> so pause/seek stays in sync.
  const openFullscreen = async () => {
    setFullscreen(true);
    if (muted) return;
    if (state === "idle") await play();
    else if (state === "paused") { audioRef.current?.play(); setState("playing"); }
  };
  const closeFullscreen = () => setFullscreen(false);

  const play = async () => {
    if (muted) return;
    if (state === "playing") { audioRef.current?.pause(); setState("paused"); return; }
    if (state === "paused")  { audioRef.current?.play(); setState("playing"); return; }
    // Fresh play — resolve script (LLM walk-through with fallback), then TTS.
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
  };

  if (!listing) return null;
  const label = muted           ? "Voice muted — click the header speaker to unmute"
              : state === "loading" ? "Loading Doogie's voice…"
              : state === "playing" ? "Pause narration"
              : state === "paused"  ? "Resume narration"
              : "Have Doogie walk me through this home";
  const Icon = muted ? VolumeX : (state === "playing" ? Pause : Play);

  return (
    <div style={{ marginTop: "1.25rem" }} data-testid="listing-narration">
      <DoogieTalkingStyle/>
      <div style={{
        background: "#F0F4FB", border: "1px solid #DDE6FA", borderRadius: 12,
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <img
          src="/doogie/thinking.png"
          alt="Doogie"
          data-testid="listing-narration-mascot"
          className={state === "playing" ? "doogie-talking" : ""}
          style={{ width: 56, height: 56, flexShrink: 0, filter: "drop-shadow(0 2px 6px rgba(15,42,91,0.18))" }}
          onError={e => { e.currentTarget.style.display = "none"; }}
        />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, color: "#0F2A5B", fontSize: 15 }}>
            Doogie's narration
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, lineHeight: 1.4 }}>
            A quick voice walk-through of this listing — general info only, never a value opinion.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={play}
            disabled={state === "loading" || muted}
            data-testid="listing-narration-play"
            style={{
              background: muted ? "#9CA3AF" : "var(--brand-blue, #0A3D99)", color: "#fff",
              border: "none", borderRadius: 999, cursor: (state === "loading" || muted) ? "not-allowed" : "pointer",
              padding: "10px 18px", fontWeight: 700, fontSize: 13,
              display: "inline-flex", alignItems: "center", gap: 8,
              boxShadow: muted ? "none" : "0 4px 12px rgba(10,61,153,0.28)",
              opacity: state === "loading" ? 0.7 : 1,
            }}
          >
            <Icon size={14}/> {label}
          </button>
          {(state === "playing" || state === "paused") && (
            <button
              onClick={stop}
              aria-label="Stop narration"
              data-testid="listing-narration-stop"
              style={{
                background: "transparent", border: "1px solid #DDE6FA", color: "#0F2A5B",
                borderRadius: 999, cursor: "pointer", padding: "9px 12px",
                display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 12,
              }}
            >
              <StopCircle size={14}/> Stop
            </button>
          )}
          {!muted && photoCount > 1 && (
            <button
              onClick={openFullscreen}
              aria-label="Watch the reel full-screen"
              title="Watch the reel full-screen"
              data-testid="listing-narration-fullscreen"
              style={{
                background: "#0F2A5B", color: "#fff",
                border: "none", borderRadius: 999, cursor: "pointer",
                padding: "9px 14px", fontWeight: 700, fontSize: 12,
                display: "inline-flex", alignItems: "center", gap: 6,
                boxShadow: "0 4px 12px rgba(15,42,91,0.28)",
              }}
            >
              <Maximize2 size={13}/> Full-screen
            </button>
          )}
        </div>
      </div>
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={onTimeUpdate}
        onEnded={() => { setState("idle"); setProgress(0); }}
        onError={() => setState("idle")}
        data-testid="listing-narration-audio"
      />
      {(state === "playing" || state === "paused") && photoCount > 1 && (
        <div style={{
          marginTop: 8, height: 4, borderRadius: 4, background: "#E5E7EB", overflow: "hidden",
        }} data-testid="listing-narration-progress">
          <div style={{
            height: "100%", width: `${(progress * 100).toFixed(1)}%`,
            background: "linear-gradient(90deg, #0A3D99, #F5A623)",
            transition: "width 0.25s linear",
          }}/>
        </div>
      )}
      {state === "playing" && photoCount > 1 && (
        <div style={{ marginTop: 6, fontSize: 10, color: "#6B7280", textAlign: "right" }} data-testid="listing-narration-reel-hint">
          <span aria-hidden="true">🎞</span> Photo reel is syncing to Doogie — watch the gallery above
        </div>
      )}
      {inServiceArea && (
        <div style={{ marginTop: 10, textAlign: "right" }}>
          <Link
            to={`/buyer?city=${encodeURIComponent(listing.city || "")}&mls=${encodeURIComponent(listing.mls_number || "")}&address=${encodeURIComponent(listing.street_address || "")}`}
            data-testid="listing-narration-cta"
            style={{
              display: "inline-block", background: "#0F2A5B", color: "#fff",
              fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700,
              fontSize: 13, padding: "10px 18px", borderRadius: 999,
              textDecoration: "none", boxShadow: "0 4px 12px rgba(15,42,91,0.30)",
            }}
          >
            Want to see it in person? Ask Doug for a viewing →
          </Link>
        </div>
      )}

      {fullscreen && (
        <DoogieReelFullscreen
          listing={listing}
          photo={((listing?.photos || [])[photoIdx]) || (listing?.photos || [])[0]}
          photoIdx={photoIdx}
          photoCount={(listing?.photos || []).length}
          progress={progress}
          sentence={sentences[currentSentenceIdx] || ""}
          isPlaying={state === "playing"}
          onTogglePlay={play}
          onClose={closeFullscreen}
          onShare={copyShareLink}
          shareStatus={shareStatus}
        />
      )}
    </div>
  );
}

// ── DoogieReelFullscreen ────────────────────────────────────────────────────
//  Full-viewport black lightbox. Big hero photo (fed from the parent's
//  photoIdx state — same one driving the on-page gallery), current sentence
//  as a caption strip at the bottom, and a gradient progress bar. The parent
//  still owns the <audio> element, so pause/seek stays in sync automatically.
const DoogieReelFullscreen = ({ listing, photo, photoIdx, photoCount, progress, sentence, isPlaying, onTogglePlay, onClose, onShare, shareStatus }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-label="Doogie's full-screen listing walk-through"
      data-testid="doogie-reel-fullscreen"
      style={{
        position: "fixed", inset: 0, zIndex: 10001,
        background: "#0A0F1E",
        display: "flex", flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Top bar — address + close */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 20px", color: "#fff", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/doogie/thinking.png"
            alt="Doogie"
            className={isPlaying ? "doogie-talking" : ""}
            style={{ width: 40, height: 40, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Doogie's walk-through</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>
              {listing?.street_address || "This listing"}{listing?.city ? ` · ${listing.city}` : ""}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close full-screen reel"
          data-testid="doogie-reel-close"
          style={{
            background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.30)",
            color: "#fff", borderRadius: "50%", width: 40, height: 40,
            display: "grid", placeItems: "center", cursor: "pointer",
          }}
        ><X size={18}/></button>
      </div>

      {/* Hero photo */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {photo ? (
          <img
            src={photo}
            alt={`${listing?.street_address || "Listing"} — photo ${photoIdx + 1} of ${photoCount}`}
            data-testid="doogie-reel-hero"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", boxShadow: "0 20px 60px rgba(0,0,0,0.55)" }}
          />
        ) : (
          <div style={{ color: "rgba(255,255,255,0.5)" }}>No photos available</div>
        )}
        <div style={{
          position: "absolute", top: 14, right: 20,
          background: "rgba(0,0,0,0.55)", color: "#fff", borderRadius: 999,
          padding: "4px 12px", fontSize: 12, fontWeight: 700,
          backdropFilter: "blur(4px)",
        }} data-testid="doogie-reel-counter">
          {photoIdx + 1} / {photoCount}
        </div>
      </div>

      {/* Caption + progress + play/pause */}
      <div style={{ padding: "20px 32px 28px", flexShrink: 0 }}>
        <div style={{
          minHeight: 60, background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12, padding: "14px 18px",
          color: "#fff", fontSize: 17, lineHeight: 1.55, fontFamily: "'Playfair Display', serif",
          fontWeight: 500, textAlign: "center",
          transition: "opacity 0.25s",
        }} data-testid="doogie-reel-caption">
          {sentence || "Getting ready…"}
        </div>
        <div style={{
          height: 6, borderRadius: 6, background: "rgba(255,255,255,0.10)",
          overflow: "hidden", marginTop: 14,
        }}>
          <div style={{
            height: "100%", width: `${(progress * 100).toFixed(1)}%`,
            background: "linear-gradient(90deg, #0A3D99, #F5A623)",
            transition: "width 0.25s linear",
          }} data-testid="doogie-reel-progress-bar"/>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 18 }}>
          <button
            onClick={onTogglePlay}
            data-testid="doogie-reel-playpause"
            aria-label={isPlaying ? "Pause" : "Play"}
            style={{
              background: "#F5A623", color: "#0F2A5B", border: "none",
              width: 56, height: 56, borderRadius: "50%",
              display: "grid", placeItems: "center", cursor: "pointer",
              boxShadow: "0 8px 22px rgba(245,166,35,0.45)",
            }}
          >
            {isPlaying ? <Pause size={22}/> : <Play size={22} style={{ marginLeft: 3 }}/>}
          </button>
          {onShare && (
            <button
              onClick={onShare}
              data-testid="doogie-reel-share"
              aria-label="Copy shareable reel link"
              title="Copy a shareable link that auto-opens this reel"
              style={{
                background: shareStatus === "copied" ? "rgba(34,197,94,0.85)" : "rgba(255,255,255,0.10)",
                border: `1px solid ${shareStatus === "copied" ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.25)"}`,
                color: "#fff",
                padding: "10px 18px", borderRadius: 999, cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700, fontSize: 13,
                display: "inline-flex", alignItems: "center", gap: 8,
                transition: "background 0.2s",
              }}
            >
              {shareStatus === "copied" ? (<><Check size={14}/> Link copied</>)
                : shareStatus === "failed" ? "Copy failed — try again"
                : (<><Share2 size={14}/> Share this reel</>)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
