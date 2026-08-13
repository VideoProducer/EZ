// ListingPresentMode
// -----------------------------------------------------------------------------
// Full-screen "big-screen" slideshow for a listing — designed to be either:
//   a)  cast to a TV via Chromecast tab-cast or AirPlay screen mirroring, OR
//   b)  displayed in an agent meeting where the tablet drives an HDMI monitor.
//
// Behaviour:
//   • Enters the browser Fullscreen API on mount so the tab is edge-to-edge.
//   • Auto-advances through the listing photos every 6 seconds (configurable
//     via the ← / → keys or on-screen buttons).
//   • Bottom-aligned info panel shows price, address, beds/baths/sqft, and
//     the CREA / MLS® attribution (BCFSA + CREA compliance is non-negotiable —
//     kept visible on every slide, never dismissible).
//   • Space bar pauses / resumes; ESC exits.
//   • Doogie's first-person narration plays in the background if the caller
//     provides a `narrationText` prop — uses the site-wide /doogie/tts/prepare
//     flow so playback starts within ~150 ms.
//
// Why not a `<video>` element? We want progressive-scan photos with proper
// alt text + CREA badge — a video would strip all of that. This composes the
// listing card + hero photo into a slideshow that's still accessible to a
// screen reader casting mirror-mode (Voice Over / TalkBack read the slide
// captions aloud).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openNativeCastPicker, detectCastCapability } from "../lib/nativeCastPicker";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ListingPresentMode = ({ listing, onExit }) => {
  const photos = useMemo(() => (listing?.photos || []).filter(Boolean), [listing]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const cap = useMemo(() => detectCastCapability(), []);
  const [picking, setPicking] = useState(false);
  const openPicker = useCallback(async () => {
    setPicking(true);
    await openNativeCastPicker(audioRef.current);
    // Reset the visual state a bit later — the picker is modal-OS so we
    // never really know when the user closed it; auto-clear after 1.5 s.
    setTimeout(() => setPicking(false), 1500);
  }, []);

  // ── Fullscreen on mount, restore on unmount ──────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    try { el.requestFullscreen?.({ navigationUI: "hide" }); }
    catch { /* Safari/iOS may reject in some contexts — fine, we still render fullscreen-styled */ }
    const onFsChange = () => {
      if (!document.fullscreenElement) onExit?.();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      try { document.exitFullscreen?.(); } catch { /* ignored */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Slide auto-advance (6 s) ────────────────────────────────────────
  useEffect(() => {
    if (paused || photos.length <= 1) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % photos.length), 6000);
    return () => clearTimeout(t);
  }, [idx, paused, photos.length]);

  // ── Keyboard controls ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") { setIdx((i) => (i + 1) % Math.max(photos.length, 1)); }
      else if (e.key === "ArrowLeft") { setIdx((i) => (i - 1 + photos.length) % Math.max(photos.length, 1)); }
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
      else if (e.key === "Escape") { onExit?.(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);

  // ── Doogie narration on mount ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const script = _buildNarration(listing);
        if (!script) return;
        const prep = await fetch(`${API}/doogie/tts/prepare`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ text: script, voice: "ash" }),
        });
        if (!prep.ok || cancelled) return;
        const { audio_url, cache } = await prep.json();
        if (cancelled) return;
        const a = new Audio();
        a.preload = "auto";
        // Deny per-element AirPlay routing so iOS Screen Mirroring keeps both
        // audio AND the photo slideshow on the Apple TV.  With "allow" iOS 17+
        // hijacks the cast and plays audio only on the TV while the slideshow
        // stays trapped on the iPhone.  disableRemotePlayback belts-and-braces.
        a.setAttribute("x-webkit-airplay", "deny");
        try { a.disableRemotePlayback = true; } catch { /* older Safari */ }
        a.src = `${process.env.REACT_APP_BACKEND_URL}${audio_url}${cache === "HIT" ? "" : "?wait=1"}`;
        audioRef.current = a;
        const tryPlay = () => a.play().catch(() => {});
        if (a.readyState >= 2) tryPlay(); else a.oncanplay = tryPlay;
      } catch { /* silent — the slideshow still plays without audio */ }
    })();
    return () => {
      cancelled = true;
      try { audioRef.current?.pause(); } catch { /* ignored */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!listing) return null;
  const price = (listing.list_price || 0).toLocaleString("en-CA");
  const currentPhoto = photos[idx] || photos[0];

  return (
    <div
      ref={containerRef}
      data-testid="listing-present-mode"
      style={{
        position:"fixed", inset:0, zIndex:99999,
        background:"#000",
        color:"#fff", fontFamily:"Inter,sans-serif",
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}
    >
      {/* ── Photo layer ────────────────────────────────────────────── */}
      <div style={{flex:1, position:"relative", background:"#000"}}>
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={`${listing.street_address || "BC listing"} — photo ${idx + 1} of ${photos.length}`}
            style={{
              position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"contain", background:"#000",
              transition:"opacity 400ms ease",
            }}
          />
        ) : (
          <div style={{
            position:"absolute", inset:0, display:"flex",
            alignItems:"center", justifyContent:"center", color:"#94a3b8",
          }}>No photos available</div>
        )}
        {/* CREA DDF® attribution — required. The "Powered by REALTOR.ca"
            phrasing is NOT a CREA rule (only DDF® attribution + trademarks
            are), so we display just the mandatory attribution here. */}
        <div style={{
          position:"absolute", top:16, right:16,
          background:"rgba(0,0,0,0.55)", padding:"0.4rem 0.8rem",
          borderRadius:6, fontSize:"0.7rem", letterSpacing:"0.06em",
          color:"#fff",
        }}>
          MLS® data · CREA DDF®
        </div>
        {/* Slide counter + pause hint */}
        <div style={{
          position:"absolute", top:16, left:16,
          background:"rgba(0,0,0,0.55)", padding:"0.4rem 0.8rem",
          borderRadius:6, fontSize:"0.75rem", color:"#fff",
        }}>
          {photos.length > 0 ? `${idx + 1} / ${photos.length}` : "—"}
          {paused && <span style={{marginLeft:"0.5rem",color:"#F5C56A"}}>⏸ Paused</span>}
        </div>
      </div>

      {/* ── Bottom info bar ───────────────────────────────────────── */}
      <div style={{
        background:"linear-gradient(180deg, rgba(0,0,0,0.25), rgba(15,42,91,0.92))",
        padding:"1.5rem 2rem",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:"2rem",flexWrap:"wrap"}}>
          <div style={{flex:"1 1 auto",minWidth:0}}>
            <div style={{fontSize:"0.8rem",color:"#F5C56A",letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700}}>
              {listing.region} · {listing.city}
            </div>
            <div style={{fontFamily:"Sora,sans-serif",fontSize:"clamp(1.5rem, 2.4vw, 2.4rem)",fontWeight:700,margin:"0.4rem 0 0.1rem",lineHeight:1.15}}>
              {listing.street_address || `MLS® #${listing.mls_number || listing.listing_key}`}
            </div>
            <div style={{fontFamily:"Sora,sans-serif",fontSize:"clamp(1.6rem, 2.8vw, 2.6rem)",fontWeight:800,color:"#F5C56A"}}>
              ${price}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"1.5rem",marginTop:"0.6rem",fontSize:"1rem",opacity:0.92}}>
              <span>🛏 {listing.beds} bed</span>
              <span>🛁 {listing.baths}{listing.half_baths ? ` + ${listing.half_baths}½` : ""} bath</span>
              {listing.living_area_sqft && <span>📐 {listing.living_area_sqft.toLocaleString()} sqft</span>}
              {listing.year_built && <span>🏗 Built {listing.year_built}</span>}
              {listing.mls_number && <span style={{opacity:0.75}}>MLS® #{listing.mls_number}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:"0.5rem",flexShrink:0}}>
            <button
              type="button"
              onClick={openPicker}
              aria-label={cap.kind === "airplay" ? "Open AirPlay picker" : "Open TV / cast picker"}
              title="Cast to TV in 1 tap"
              data-testid="present-cast-picker"
              style={{..._ctrlBtn, background: picking ? "rgba(245,197,106,0.35)" : "rgba(245,197,106,0.22)", borderColor:"rgba(245,197,106,0.55)"}}
            >{cap.kind === "airplay" ? "🍎" : "📺"} Cast</button>
            <button
              type="button"
              onClick={() => setIdx((i) => (i - 1 + Math.max(photos.length, 1)) % Math.max(photos.length, 1))}
              aria-label="Previous photo"
              data-testid="present-prev"
              style={_ctrlBtn}
            >←</button>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Resume slideshow" : "Pause slideshow"}
              data-testid="present-pause"
              style={_ctrlBtn}
            >{paused ? "▶" : "⏸"}</button>
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % Math.max(photos.length, 1))}
              aria-label="Next photo"
              data-testid="present-next"
              style={_ctrlBtn}
            >→</button>
            <button
              type="button"
              onClick={() => onExit?.()}
              aria-label="Exit present mode"
              data-testid="present-exit"
              style={{..._ctrlBtn, background:"#DC2626", color:"#fff"}}
            >Exit</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const _ctrlBtn = {
  minWidth:44, height:44, padding:"0 1rem",
  background:"rgba(255,255,255,0.15)", color:"#fff",
  border:"1px solid rgba(255,255,255,0.35)", borderRadius:8,
  fontSize:"1.1rem", cursor:"pointer", backdropFilter:"blur(6px)",
};

// Build a compliant, first-person Doogie narration for a listing (statute-anchored,
// no advice). Falls back to a simple factual description if listing data is thin.
function _buildNarration(l) {
  if (!l) return "";
  const beds = l.beds ? `${l.beds}-bed` : "";
  const baths = l.baths ? `${l.baths}-bath` : "";
  const sqft = l.living_area_sqft ? `${l.living_area_sqft.toLocaleString()} square feet` : "";
  const price = l.list_price ? `$${l.list_price.toLocaleString("en-CA")}` : "";
  const type = l.property_type ? l.property_type.toLowerCase() : "home";
  const parts = [beds, baths, type].filter(Boolean).join(" ");
  const bits = [
    `Hi, this is Doogie from EZtoFind.ca. Let's take a look at ${l.street_address || "this British Columbia listing"} in ${l.city || "BC"}.`,
    parts && `It's a ${parts}${sqft ? `, roughly ${sqft}` : ""}${price ? `, offered at ${price}` : ""}.`,
    l.description ? `Here's the listing summary. ${_stripHtml(l.description).slice(0, 500)}` : "",
    `Data is sourced from the CREA Data Distribution Facility and refreshed every four hours. Nothing on this page is real estate advice — reach out to Doug LeMaire, REALTOR at Fraser Property Management Realty Services, for a personal consultation.`,
  ].filter(Boolean);
  return bits.join(" ");
}
function _stripHtml(s) { return (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(); }

export default ListingPresentMode;
