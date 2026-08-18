import React, { useState, useEffect, useCallback, useRef } from "react";

// Full-screen swipeable photo lightbox. Purpose: show CREA DDF® high-res
// gallery for any listing without navigating away from the page. Supports:
//   - Arrow-key nav (← →), Escape to close
//   - Touch swipe (mobile) + click-and-drag (desktop)
//   - Prev/Next buttons + backdrop-click close
//   - Photo counter "X of Y"
//   - Preloads the neighbouring images so navigation feels instant
//
// Props:
//   photos     — array of image URLs (strings) or {url:string} objects
//   startIndex — which photo to open on (defaults to 0)
//   isOpen     — controlled open/close
//   onClose    — callback when the user closes the lightbox
//   listingLabel — accessible caption text (e.g. "3015 141 Street, Surrey")
export default function ListingPhotoLightbox({
  photos = [],
  startIndex = 0,
  isOpen = false,
  onClose = () => {},
  listingLabel = "",
}) {
  const normalized = (photos || []).map(p => (typeof p === "string" ? p : p?.url)).filter(Boolean);
  const [i, setI] = useState(startIndex);
  const touchStartX = useRef(null);

  useEffect(() => { if (isOpen) setI(Math.min(startIndex, Math.max(0, normalized.length - 1))); }, [isOpen, startIndex, normalized.length]);

  const prev = useCallback(() => setI(x => (x - 1 + normalized.length) % normalized.length), [normalized.length]);
  const next = useCallback(() => setI(x => (x + 1) % normalized.length), [normalized.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, prev, next]);

  // Preload neighbours so swipe feels instant on flaky mobile networks
  useEffect(() => {
    if (!isOpen || !normalized.length) return;
    const nextI = (i + 1) % normalized.length;
    const prevI = (i - 1 + normalized.length) % normalized.length;
    [nextI, prevI].forEach(idx => {
      const img = new Image();
      img.src = normalized[idx];
    });
  }, [i, isOpen, normalized]);

  if (!isOpen || !normalized.length) return null;

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 60) prev();
    else if (dx < -60) next();
    touchStartX.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo gallery — ${listingLabel}`}
      data-testid="listing-photo-lightbox"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: "fixed", inset: 0, zIndex: 100000,
        background: "rgba(6,14,32,0.94)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "56px 12px 12px",
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close photo gallery"
        data-testid="lightbox-close"
        style={{
          position: "absolute", top: 12, right: 14,
          background: "rgba(255,255,255,0.12)", color: "#fff",
          border: "1px solid rgba(255,255,255,0.35)",
          width: 40, height: 40, borderRadius: 999, cursor: "pointer",
          fontSize: 20, lineHeight: 1, fontWeight: 700,
        }}
      >×</button>

      {/* Counter + caption */}
      <div style={{
        position: "absolute", top: 20, left: 20, color: "rgba(255,255,255,0.85)",
        fontFamily: "Inter, sans-serif", fontSize: 13, letterSpacing: 0.4,
      }} data-testid="lightbox-counter">
        {listingLabel && <span style={{ marginRight: 12, fontWeight: 600 }}>{listingLabel}</span>}
        <span>{i + 1} / {normalized.length}</span>
      </div>

      {/* Prev / Next */}
      {normalized.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous photo"
            data-testid="lightbox-prev"
            style={navBtnStyle("left")}
          >‹</button>
          <button
            onClick={next}
            aria-label="Next photo"
            data-testid="lightbox-next"
            style={navBtnStyle("right")}
          >›</button>
        </>
      )}

      {/* Photo */}
      <img
        src={normalized[i]}
        alt={`${listingLabel} — photo ${i + 1} of ${normalized.length}`}
        data-testid="lightbox-image"
        style={{
          maxWidth: "100%", maxHeight: "100%",
          objectFit: "contain",
          borderRadius: 4, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          userSelect: "none", WebkitUserSelect: "none",
        }}
        draggable={false}
      />
    </div>
  );
}

function navBtnStyle(side) {
  return {
    position: "absolute", top: "50%", [side]: 16, transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.14)", color: "#fff",
    border: "1px solid rgba(255,255,255,0.35)",
    width: 52, height: 52, borderRadius: 999, cursor: "pointer",
    fontSize: 32, lineHeight: 1, fontWeight: 400,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 120ms ease, transform 120ms ease",
  };
}
