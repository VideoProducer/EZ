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
import mediaBus from "../lib/mediaBus";

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
  // Reset EVERYTHING when the user navigates to a new listing. Previously
  // we only cleared the script cache — the audio element kept the old blob
  // URL and state="playing"/"paused" persisted, so the next click of Play
  // just resumed the previous listing's audio instead of fetching a fresh
  // TTS blob for the new listing. Reported live by Doug on production
  // (Edge browser, Aug 2026). Fix: on listing_key change, stop playback,
  // clear the <audio> src, revoke the blob URL, and reset state → "idle".
  React.useEffect(() => {
    scriptCacheRef.current = null;
    setScriptText("");
    setCues([]);
    setProgress(0);
    setLocalPhotoIdx(0);
    setState("idle");
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      try { audioRef.current.removeAttribute("src"); audioRef.current.load(); } catch {}
    }
    if (objectUrlRef.current) {
      try { URL.revokeObjectURL(objectUrlRef.current); } catch {}
      objectUrlRef.current = null;
    }
    // Also reset the "auto-open reel" latch so a share-link with ?reel=1
    // still fires exactly once per listing rather than never firing again
    // after a same-tab navigation.
    autoOpenedRef.current = false;
  }, [listing?.listing_key]);

  // ── Background prefetch: warm the narration + TTS the moment the
  //    listing page mounts, so clicking Play feels instant.  Doug reported
  //    that Doogie's narration "takes time to (re)load for each property"
  //    on production.  Only the top 200 listings hit the nightly warmer
  //    (server.py `_nightly_narration_warm_loop`), leaving the other ~40k
  //    active listings paying the full cold cost on first play:
  //       • /narration      → 3-10 s (vision LLM generates script + cues)
  //       • /tts/prepare    → 5-8 s (OpenAI TTS synthesises the mp3)
  //       • /audio?wait=1   → streams the mp3
  //    Visitors spend 10-30 s scrolling photos before clicking Play, so we
  //    kick off both fetches in the background here.  By the time they hit
  //    Play the mp3 is already synthesised + browser-cacheable, turning
  //    every cold click into a warm click (200-500 ms).
  //
  //    Respects the mute preference — a muted visitor never plays the
  //    audio, so spending TTS credits on them would be pure waste.
  React.useEffect(() => {
    if (!listing?.listing_key) return;
    if (muted) return;
    let cancelled = false;
    // Give the page a beat to paint and load photos before we hit the
    // narration endpoint — no point competing with critical resources.
    const t = setTimeout(async () => {
      try {
        // 1. Fetch the script + cues (server caches on doogie_narration).
        const nR = await fetch(`${API}/listings/${encodeURIComponent(listing.listing_key)}/narration`);
        if (!nR.ok || cancelled) return;
        const nJ = await nR.json();
        const body = (typeof nJ?.script === "string" && nJ.script.trim().length > 40) ? nJ.script.trim() : "";
        const fetchedCues = Array.isArray(nJ?.cues) ? nJ.cues : [];
        if (!body) return;                     // nothing usable → let click-time fallback handle it
        const full = body + _buildOutro(listing, inServiceArea);
        scriptCacheRef.current = { script: full, cues: fetchedCues };
        setScriptText(full);
        setCues(fetchedCues);
        // 2. Warm the TTS.  `/doogie/tts/prepare` returns immediately and
        //    kicks off the mp3 synthesis on the server; the file lands
        //    in doogie_tts_cache within ~5 s.  We don't await the audio
        //    itself here — that streams when the user hits Play.
        if (cancelled) return;
        await fetch(`${API}/doogie/tts/prepare`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: full, voice: "ash" }),
        });
      } catch { /* silent — visitor still gets a working button */ }
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.listing_key, muted, inServiceArea]);

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

  // Precompute each cue's START character offset in the full script — the
  // outro appended by the frontend (disclaimer + CTA) doesn't have cues, so
  // this map naturally leaves the last cue "sticky" for the tail of the
  // audio.  We search each sentence in order, forward-only, so a duplicate
  // phrase later in the script doesn't collide with an earlier occurrence.
  // Character offsets are a MUCH better proxy for spoken duration than a
  // fixed count-per-cue slice (which was the source of the desync bug — a
  // 3-word sentence and a 40-word sentence were each getting 1/N of the
  // audio timeline).
  const cueOffsets = useMemo(() => {
    if (!cues || !cues.length || !scriptText) return [];
    const out = [];
    let searchFrom = 0;
    for (const c of cues) {
      const sent = (c.sentence || "").trim();
      if (!sent) continue;
      let pos = scriptText.indexOf(sent, searchFrom);
      if (pos < 0) {
        // Try without trailing punctuation (Haiku sometimes drops a period)
        const stripped = sent.replace(/[.!?]+\s*$/, "");
        pos = stripped ? scriptText.indexOf(stripped, searchFrom) : -1;
      }
      if (pos < 0) pos = searchFrom; // fall back to sequential
      out.push({ sentence: sent, photo_idx: c.photo_idx | 0, startChar: pos });
      searchFrom = pos + sent.length;
    }
    return out;
  }, [cues, scriptText]);

  // Locate the "current cue" via linear scan through the char-offset list.
  // Because cueOffsets is sorted by startChar, we return the LAST cue whose
  // start is <= the caret position.  This is O(cues.length) but cues rarely
  // exceed ~20 sentences.
  const _cueIndexAt = (charPos) => {
    if (!cueOffsets.length) return 0;
    let bestIdx = 0;
    for (let i = 0; i < cueOffsets.length; i++) {
      if (cueOffsets[i].startChar <= charPos) bestIdx = i;
      else break;
    }
    return bestIdx;
  };

  const currentSentenceIdx = useMemo(() => {
    if (!sentences.length) return 0;
    if (cueOffsets.length && scriptText.length > 0) {
      const charProgress = progress * scriptText.length;
      return _cueIndexAt(charProgress);
    }
    return Math.min(sentences.length - 1, Math.floor(progress * sentences.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, sentences.length, cueOffsets, scriptText]);

  // Handle audio time updates → drive the reel + progress bar. When we have
  // room-aware cues, use them; otherwise even-distribute across all photos.
  // NOTE: previously this used `ratio * cues.length` which gave equal time
  // per cue regardless of sentence length — leading to obvious desync on
  // listings where sentence lengths varied.  We now use the cue's start-
  // character offset in the full script so timing follows the (roughly
  // linear) TTS pacing.
  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !a.duration || !isFinite(a.duration)) return;
    const ratio = Math.max(0, Math.min(1, a.currentTime / a.duration));
    setProgress(ratio);
    let cueIdx = 0;
    if (photoCount > 1) {
      let idx;
      if (cueOffsets.length && scriptText.length > 0) {
        const charProgress = ratio * scriptText.length;
        cueIdx = _cueIndexAt(charProgress);
        idx = Math.max(0, Math.min(photoCount - 1, cueOffsets[cueIdx].photo_idx | 0));
      } else {
        idx = Math.min(photoCount - 1, Math.floor(ratio * photoCount));
        cueIdx = Math.min(cues.length - 1, Math.floor(ratio * Math.max(1, cues.length)));
      }
      setLocalPhotoIdx(idx);
      if (onAdvancePhoto) onAdvancePhoto(idx);
    } else if (cues.length) {
      cueIdx = Math.min(cues.length - 1, Math.floor(ratio * cues.length));
    }
    // Broadcast the current cue so RoomLabelPill (and any future subscriber)
    // can render the room name Doogie is describing right now.
    try {
      mediaBus.tick && mediaBus.tick("doogie-listing", {
        t_ms: a.currentTime * 1000,
        duration_ms: a.duration * 1000,
        cue_idx: cueIdx,
        cue: cues && cues[cueIdx] ? cues[cueIdx] : null,
      });
    } catch { /* ignore */ }
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

  // Fire-and-forget beacon to the reel-events endpoint.
  const _logReel = (eventType, context) => {
    try {
      if (!listing?.listing_key) return;
      const sid = (typeof localStorage !== "undefined" && localStorage.getItem("ez_doogie_session")) || "";
      fetch(`${API}/listings/${encodeURIComponent(listing.listing_key)}/reel_events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: eventType, session_id: sid, context: context || {} }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  };

  // Copy a share URL that reopens the fullscreen reel + auto-plays on land.
  // The URL points at the server-rendered `/api/reel/{key}` landing page so
  // iMessage / WhatsApp / Slack can scrape OG tags and show the Doogie cover.
  const copyShareLink = async () => {
    try {
      const backend = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
      const link = `${backend}/api/reel/${encodeURIComponent(listing.listing_key)}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        // Legacy fallback for older browsers / non-secure contexts.
        const ta = document.createElement("textarea");
        ta.value = link;
        document.body.appendChild(ta); ta.select(); document.execCommand("copy");
        document.body.removeChild(ta);
      }
      _logReel("share", { link });
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
        setTimeout(() => {
          setFullscreen(true);
          _logReel("view", { auto: true, from: document.referrer || "" });
          if (state === "idle") play();
        }, 600);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.listing_key, muted]);

  // "Watch full-screen reel" — open the immersive overlay AND start playback
  // if not already going. Reuses the same <audio> so pause/seek stays in sync.
  const openFullscreen = async () => {
    setFullscreen(true);
    _logReel("view", { auto: false });
    if (muted) return;
    if (state === "idle") await play();
    else if (state === "paused") { audioRef.current?.play(); setState("playing"); }
  };
  const closeFullscreen = () => setFullscreen(false);

  const play = async () => {
    if (muted) return;
    if (state === "playing") { audioRef.current?.pause(); setState("paused"); mediaBus.release("doogie-listing"); return; }
    if (state === "paused")  {
      audioRef.current?.play();
      setState("playing");
      // Re-claim the audio floor — pauses any video/other narration.
      mediaBus.claim("doogie-listing", { pause: () => { try { audioRef.current?.pause(); setState("paused"); } catch {} } });
      return;
    }
    // Fresh play — resolve script (LLM walk-through with fallback), then TTS.
    // Uses the prepare→GET flow so <audio src=…> streams progressively and
    // the mp3 gets HTTP-cached by the browser for repeat plays.
    setState("loading");
    try {
      const script = await _resolveScript();
      const prep = await fetch(`${API}/doogie/tts/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script, voice: "ash" }),
      });
      if (!prep.ok) throw new Error(`tts prepare ${prep.status}`);
      const { audio_url, cache } = await prep.json();
      const backendBase = API.replace(/\/api$/, "");
      const url = `${backendBase}${audio_url}${cache === "HIT" ? "" : "?wait=1"}`;
      if (objectUrlRef.current) { try { URL.revokeObjectURL(objectUrlRef.current); } catch {} }
      objectUrlRef.current = null;   // no blob URL to revoke with the prepare→GET flow
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.playbackRate = speed;
        await audioRef.current.play();
        setState("playing");
        // Claim the audio floor so the virtual-tour iframe (or TourNarration)
        // gets auto-paused. Fixes Doug's report of overlapping voice-overs.
        mediaBus.claim("doogie-listing", { pause: () => { try { audioRef.current?.pause(); setState("paused"); } catch {} } });
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
    mediaBus.release("doogie-listing");
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
          src="/doogie/thinking.webp"
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
        disableRemotePlayback
        onTimeUpdate={onTimeUpdate}
        onEnded={() => { setState("idle"); setProgress(0); _logReel("complete"); }}
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
            src="/doogie/thinking.webp"
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
