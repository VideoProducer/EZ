// CastToDevice
// -----------------------------------------------------------------------------
// A single "Cast to another device" affordance that supports every realistic
// TV-and-second-screen path a BC real estate buyer or an agent-in-a-meeting
// would want, without registering a proprietary Chromecast receiver app:
//
//   a)  📱  QR code + short URL       — buyer scans on TV, meeting scan on phone.
//   b)  📺  Chromecast tab-cast       — Chrome/Edge users tab-cast to any Cast
//                                       device (Chromecast, Google TV, Nest Hub).
//                                       We can't call chrome.cast.requestSession()
//                                       without a registered receiver app, so we
//                                       surface a short one-tap instructions card
//                                       instead — this is the fastest ship path
//                                       and works for 100% of Cast devices today.
//   c)  🍎  AirPlay (iOS + macOS)      — same idea: Safari auto-mirrors via
//                                       Control Center → Screen Mirroring. We
//                                       spell it out so buyers don't hunt.
//   d)  🎥  "Present Mode" fullscreen  — a big-screen slideshow of the listing
//                                       (photos + Doogie narration). Perfect
//                                       once the tab is cast/mirrored to a TV.
//
// Compliance: The listing URL we encode / share is the *canonical* eztofind.ca
// listing detail URL — never the raw realtor.ca URL. CREA attribution stays
// intact on every casted view because /listing/{key} renders the "Powered by
// REALTOR.ca" badge server-side.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { readCastSession, CastSessionInlineControl } from "../lib/castSession";

const IS_CHROMIUM = typeof navigator !== "undefined" &&
  (/Chrome|Chromium|Edg\//.test(navigator.userAgent) && !/Firefox/.test(navigator.userAgent));
const IS_SAFARI = typeof navigator !== "undefined" &&
  /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg\//.test(navigator.userAgent);
const IS_IOS = typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod/.test(navigator.userAgent);

// The canonical listing URL used for QR + copy — always prefixed with the
// production hostname so the QR code lands the visitor on the live domain
// even when this modal is opened inside the preview environment. Falls back
// to window.location for non-listing surfaces.
function canonicalUrl(canonicalPath) {
  if (canonicalPath) return `https://eztofind.ca${canonicalPath}`;
  try { return window.location.href.replace(/^https?:\/\/[^/]+/, "https://eztofind.ca"); }
  catch { return "https://eztofind.ca/"; }
}

const CastToDevice = ({
  canonicalPath,      // e.g. `/listing/${listing.listing_key}` — preferred
  label = "Cast",     // button label
  variant = "pill",   // "pill" | "icon"
  onPresentMode,      // optional: called when user taps "Present Mode"
  listingKey,         // optional: the MLS® listing_key for analytics attribution
  "data-testid": testId = "cast-to-device-btn",
}) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef(null);
  const url = useMemo(() => canonicalUrl(canonicalPath), [canonicalPath]);

  // Fire an analytics event — GA4 (via window.gtag) for Doug's marketing
  // dashboard PLUS a fire-and-forget backend beacon so the admin analytics
  // panel can attribute casts by listing. Both are non-blocking and never
  // surface errors — never break UX for a metric.
  //
  // If Doug has started a "cast session" (admin-only meeting label like
  // "Smith Family Viewing"), we attach the `session_id` + `session_label`
  // so the admin dashboard can group casts by meeting instead of raw
  // counts.  Session state is read at fire-time (not modal-open time) so
  // late renames of an in-progress session apply immediately.
  const _logEvent = (event_type, extra = {}) => {
    const sess = readCastSession() || null;
    const payload = {
      listing_key: listingKey || "search",
      canonical_path: canonicalPath || "",
      session_id:    sess?.session_id    || null,
      session_label: sess?.label         || null,
      ...extra,
    };
    try {
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", event_type, {
          send_to: process.env.REACT_APP_GA4_MEASUREMENT_ID,
          ...payload,
        });
      }
    } catch { /* swallow */ }
    try {
      const backend = process.env.REACT_APP_BACKEND_URL;
      // Backend beacon: listing_key is required; use "search" as a sentinel
      // for the /listings-page cast (i.e. sharing a filtered search URL).
      fetch(`${backend}/api/listings/analytics/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type,
          path: canonicalPath || "",
          ...payload,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* swallow */ }
  };

  // ESC closes the modal
  useEffect(() => {
    if (!open) return;
    // Fire the "cast_button_opened" analytics event exactly once per open.
    // Placed here (in the effect, guarded by `open`) instead of the button
    // click so the metric reflects modals actually shown to the user, not
    // spurious click-throughs.
    _logEvent("cast_button_opened");
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    // Focus the close button so screen readers land there.
    setTimeout(() => closeRef.current?.focus(), 50);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); _logEvent("cast_link_copied"); }
    catch { /* older browsers — user can select the URL text */ }
  };

  const nativeShare = async () => {
    // navigator.share is the fastest phone→TV / phone→laptop handoff on mobile —
    // it opens the OS share sheet which usually has AirDrop, Messages, WhatsApp,
    // Mail, Copy Link, and other targets that get the URL onto the other device.
    if (!navigator.share) return copy();
    try { await navigator.share({ title: "EZtoFind.ca listing", url }); _logEvent("cast_native_share"); }
    catch { /* user cancelled — silent */ }
  };

  const enterPresentMode = () => {
    _logEvent("cast_present_mode_started");
    setOpen(false);
    if (onPresentMode) return onPresentMode();
    // No custom slideshow available — fall back to native tab fullscreen.
    try { document.documentElement.requestFullscreen?.(); } catch { /* ignored */ }
  };

  // ── Button ─────────────────────────────────────────────────────────────
  const btnStyle = variant === "icon" ? {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 40, height: 40, borderRadius: 999, background: "#fff",
    border: "1px solid rgba(15,42,91,0.15)", cursor: "pointer",
  } : {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#0F2A5B", color: "#fff",
    fontFamily: "Inter,sans-serif", fontWeight: 600, fontSize: "0.85rem",
    padding: "0.55rem 1rem", borderRadius: 999,
    border: "none", cursor: "pointer",
    boxShadow: "0 4px 10px rgba(15,42,91,0.22)",
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Cast this listing to another device"
        style={btnStyle}
        data-testid={testId}
      >
        <span aria-hidden style={{fontSize:"1.05rem"}}>📺</span>
        {variant === "pill" && <span>{label}</span>}
      </button>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cast-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position:"fixed", inset:0, zIndex:9999,
            background:"rgba(15,42,91,0.55)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:"1rem",
          }}
          data-testid="cast-modal"
        >
          <div style={{
            background:"#fff", borderRadius:16, maxWidth:560, width:"100%",
            padding:"1.5rem 1.5rem 1.25rem", boxShadow:"0 20px 60px rgba(15,42,91,0.35)",
            maxHeight:"90vh", overflowY:"auto",
            fontFamily:"Inter,sans-serif",
          }}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.75rem"}}>
              <div>
                <div style={{fontSize:"0.7rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--brand-gold, #C89B3C)", fontWeight:800}}>Cast &amp; Share</div>
                <h2 id="cast-modal-title" style={{margin:"0.25rem 0 0", fontFamily:"Sora,sans-serif", color:"var(--brand-navy, #0F2A5B)", fontSize:"1.4rem"}}>Open this listing on another device</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                data-testid="cast-modal-close"
                style={{
                  background:"transparent", border:"none", cursor:"pointer",
                  fontSize:"1.5rem", color:"#6b7280", lineHeight:1,
                  padding:"0.25rem 0.5rem",
                }}
              >×</button>
            </div>

            {/* Admin-only session labeller — silent for anonymous visitors */}
            <CastSessionInlineControl/>

            {/* ── 1. QR + copy link ──────────────────────────────────────── */}
            <div style={{
              display:"grid", gridTemplateColumns:"180px 1fr", gap:"1.25rem",
              alignItems:"center", padding:"1rem", background:"#FAF7F0",
              borderRadius:12, marginBottom:"1rem",
            }}>
              <div style={{display:"flex", justifyContent:"center", background:"#fff", padding:"0.5rem", borderRadius:8}} data-testid="cast-qr">
                <QRCodeSVG value={url} size={160} level="M" bgColor="#FFFFFF" fgColor="#0F2A5B"/>
              </div>
              <div>
                <p style={{margin:"0 0 0.5rem", fontSize:"0.9rem", color:"var(--ink, #111827)"}}>
                  <strong>Scan with any phone</strong> — opens instantly on the other device. No app needed.
                </p>
                <div style={{
                  display:"flex", gap:"0.4rem", alignItems:"stretch",
                  padding:"0.35rem 0.6rem", background:"#fff",
                  border:"1px solid rgba(15,42,91,0.15)", borderRadius:8,
                  marginBottom:"0.5rem",
                }}>
                  <input
                    type="text" readOnly value={url}
                    onFocus={(e) => e.target.select()}
                    aria-label="Listing URL"
                    data-testid="cast-url-input"
                    style={{flex:1, border:"none", outline:"none", background:"transparent", fontSize:"0.82rem", color:"#374151", fontFamily:"monospace"}}
                  />
                  <button
                    type="button" onClick={copy}
                    data-testid="cast-copy-btn"
                    style={{
                      background:copied ? "#10B981" : "var(--brand-blue,#1D4E89)", color:"#fff",
                      border:"none", borderRadius:6, padding:"0.35rem 0.75rem",
                      fontSize:"0.78rem", fontWeight:600, cursor:"pointer",
                      whiteSpace:"nowrap",
                    }}
                  >{copied ? "✓ Copied" : "Copy"}</button>
                </div>
                {typeof navigator !== "undefined" && !!navigator.share && (
                  <button
                    type="button" onClick={nativeShare}
                    data-testid="cast-share-btn"
                    style={{
                      background:"transparent", border:"1px dashed rgba(15,42,91,0.35)",
                      color:"var(--brand-navy,#0F2A5B)", borderRadius:8,
                      padding:"0.45rem 0.85rem", fontSize:"0.82rem", fontWeight:600,
                      cursor:"pointer", width:"100%",
                    }}
                  >📤 Share via Messages / Mail / AirDrop</button>
                )}
              </div>
            </div>

            {/* ── 2. Cast to TV ──────────────────────────────────────────── */}
            <div style={{marginBottom:"1rem"}}>
              <div style={{fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--muted,#6b7280)", fontWeight:700, marginBottom:"0.5rem"}}>Cast to a TV</div>
              {(IS_CHROMIUM || (!IS_SAFARI && !IS_IOS)) && (
                <div style={{padding:"0.75rem 1rem", background:"#F4F6FB", borderRadius:8, marginBottom:"0.5rem", fontSize:"0.85rem", color:"var(--ink,#111827)"}} data-testid="cast-hint-chrome">
                  <div style={{fontWeight:700, marginBottom:"0.15rem"}}>📺 Chromecast / Google TV / Nest Hub</div>
                  <div>
                    Chrome menu <span style={{fontFamily:"monospace", background:"#fff", padding:"0 0.35rem", borderRadius:4, border:"1px solid rgba(0,0,0,0.08)"}}>⋮</span> → <strong>Cast…</strong> → pick your device.
                    Then tap <strong>Present Mode</strong> below for a big-screen slideshow.
                  </div>
                </div>
              )}
              {(IS_SAFARI || IS_IOS) && (
                <div style={{padding:"0.75rem 1rem", background:"#F4F6FB", borderRadius:8, marginBottom:"0.5rem", fontSize:"0.85rem", color:"var(--ink,#111827)"}} data-testid="cast-hint-airplay">
                  <div style={{fontWeight:700, marginBottom:"0.15rem"}}>🍎 AirPlay to Apple TV / AirPlay-enabled TV</div>
                  <div>
                    Open <strong>Control Center</strong> → tap <strong>Screen Mirroring</strong> → pick your Apple TV.
                    Then hit <strong>Present Mode</strong> below for a big-screen slideshow.
                  </div>
                </div>
              )}
              {/* Fallback for other browsers / desktop Safari without AirPlay */}
              {!IS_CHROMIUM && !IS_SAFARI && !IS_IOS && (
                <div style={{padding:"0.75rem 1rem", background:"#F4F6FB", borderRadius:8, fontSize:"0.85rem", color:"var(--ink,#111827)"}}>
                  Use your browser's built-in <strong>Cast</strong> or <strong>Screen Mirroring</strong> option to send this tab to a TV. Once mirrored, tap <strong>Present Mode</strong> for the slideshow.
                </div>
              )}
            </div>

            {/* ── 3. Present Mode ────────────────────────────────────────── */}
            <button
              type="button"
              onClick={enterPresentMode}
              data-testid="cast-present-btn"
              style={{
                display:"block", width:"100%", padding:"0.9rem 1rem",
                background:"var(--brand-gold,#C89B3C)", color:"var(--brand-navy,#0F2A5B)",
                border:"none", borderRadius:12, fontFamily:"Sora,sans-serif",
                fontWeight:700, fontSize:"1rem", cursor:"pointer",
                boxShadow:"0 6px 16px rgba(200,155,60,0.35)",
              }}
            >🎥 Start Present Mode — big-screen slideshow</button>
            <p style={{fontSize:"0.72rem", color:"var(--muted,#6b7280)", margin:"0.5rem 0 0", textAlign:"center", lineHeight:1.4}}>
              Perfect for client meetings, agent open houses, or watching from the couch.
              CREA attribution and the &ldquo;Powered by REALTOR.ca&rdquo; badge stay visible on every casted view.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CastToDevice;
