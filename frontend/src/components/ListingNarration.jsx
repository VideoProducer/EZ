// ============================================================================
//  ListingNarration — a Doogie-voice narrator for individual BC listings.
//  Renders a blue pill on the ListingDetail page ("Have Doogie walk me through
//  this home"). On click, builds a compliance-safe script from the listing's
//  CREA fields (address, beds/baths, price, tour flag, photo count) plus a
//  generic buyer checklist (roof / mechanicals / strata) — never a value
//  opinion. Ends with a CTA to Doug if the listing is in his service area.
// ============================================================================
import React, { useMemo, useRef, useState } from "react";
import { Play, Pause, StopCircle, VolumeX } from "lucide-react";
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
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const scriptCacheRef = useRef(null); // last fetched LLM narration
  const muted = useDoogieMuted();
  const speed = useDoogieSpeed();
  const inServiceArea = _isInServiceArea(listing?.city);
  // Reset any cached LLM narration when the user navigates to a new listing.
  React.useEffect(() => { scriptCacheRef.current = null; }, [listing?.listing_key]);

  // Re-apply speed if the user drags the slider mid-narration.
  React.useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Handle audio time updates → drive the reel + progress bar.
  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !a.duration || !isFinite(a.duration)) return;
    const ratio = Math.max(0, Math.min(1, a.currentTime / a.duration));
    setProgress(ratio);
    if (onAdvancePhoto && photoCount > 1) {
      // Distribute the reel across all photos — first sentence lands on photo 0,
      // last sentence on the final photo, evenly spaced in between.
      const idx = Math.min(photoCount - 1, Math.floor(ratio * photoCount));
      onAdvancePhoto(idx);
    }
  };

  // Fetch (or reuse) the LLM narration script from the backend, then fall
  // back to a local composition if the endpoint fails.
  const _resolveScript = async () => {
    if (scriptCacheRef.current) return scriptCacheRef.current;
    let body = "";
    try {
      const r = await fetch(`${API}/listings/${encodeURIComponent(listing.listing_key)}/narration`);
      if (r.ok) {
        const j = await r.json();
        if (j && typeof j.script === "string" && j.script.trim().length > 40) body = j.script.trim();
      }
    } catch { /* fall through to local */ }
    if (!body) body = _buildFallbackScript(listing);
    const full = body + _buildOutro(listing, inServiceArea);
    scriptCacheRef.current = full;
    return full;
  };

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
    </div>
  );
}
