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
import { openNativeCastPicker, detectCastCapability } from "../lib/nativeCastPicker";

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
  const [pickerState, setPickerState] = useState("idle");  // idle | trying | unsupported
  // First-time coach mark that points at the "1 tap" picker button. Fires
  // once per device via `localStorage.ez_cast_tutorial_seen`; auto-dismisses
  // after 10 s OR the moment the user actually taps the picker.  Kept
  // tiny + non-modal so it feels like a hint, not a blocker.
  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialTimerRef = useRef(null);
  const closeRef = useRef(null);
  const pickerAudioRef = useRef(null);
  const url = useMemo(() => canonicalUrl(canonicalPath), [canonicalPath]);
  const cap = useMemo(() => detectCastCapability(), []);

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
    // First-visit coach mark — show a tiny non-modal tooltip pointing at
    // the 1-tap picker button for exactly 10 s so buyers understand where
    // to tap without hunting.  Localstorage flag → shown once per device.
    try {
      if (!localStorage.getItem("ez_cast_tutorial_seen")) {
        // Small delay so the modal transition finishes first and the
        // tooltip lands correctly aligned.
        setTimeout(() => setShowTutorial(true), 200);
        localStorage.setItem("ez_cast_tutorial_seen", "1");
        _logEvent("cast_tutorial_shown");
        tutorialTimerRef.current = setTimeout(() => setShowTutorial(false), 10000);
      }
    } catch { /* private mode / disabled storage — silently skip the coach mark */ }
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    // Focus the close button so screen readers land there.
    setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (tutorialTimerRef.current) { clearTimeout(tutorialTimerRef.current); tutorialTimerRef.current = null; }
      setShowTutorial(false);
    };
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

  // 1-tap OS cast picker — asks the browser to open the AirPlay / Chromecast
  // device picker directly (no "swipe Control Center" hunt required). Falls
  // back to `unsupported` when the browser doesn't expose the Remote
  // Playback API (older Android/Firefox); the UI then shows the illustrated
  // fallback instructions.
  const openNativePicker = async () => {
    // Dismiss the coach mark the moment the user acts on it.
    if (showTutorial) {
      setShowTutorial(false);
      if (tutorialTimerRef.current) { clearTimeout(tutorialTimerRef.current); tutorialTimerRef.current = null; }
    }
    _logEvent("cast_native_picker_opened");
    setPickerState("trying");
    const result = await openNativeCastPicker(pickerAudioRef.current);
    setPickerState(result.opened ? "idle" : "unsupported");
    // Auto-reset after 4 s so a second tap tries again.
    if (!result.opened) setTimeout(() => setPickerState("idle"), 4000);
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

            {/* ── 2. Cast to TV ──────────────────────────────────────────
                First: a 1-tap OS picker button (Remote Playback API +
                Safari's webkitShowPlaybackTargetPicker fallback). When
                unsupported, we show illustrated step-by-step instructions
                so buyers/agents don't have to hunt Control Center.       */}
            <div style={{marginBottom:"1rem"}}>
              <div style={{fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--muted,#6b7280)", fontWeight:700, marginBottom:"0.5rem"}}>Cast to a TV</div>

              {/* Hidden audio element the Remote Playback API attaches to.
                  Silent 1-second sample; never audible to the user.       */}
              <audio ref={pickerAudioRef} preload="metadata" playsInline
                     x-webkit-airplay="allow" style={{display:"none"}}/>

              {/* Wrapper positions the first-run coach mark relative to the
                  1-tap picker button.  Tooltip auto-dismisses after 10 s or
                  the moment the user taps the picker.                     */}
              <div style={{position:"relative"}}>
              {showTutorial && (
                <div
                  role="tooltip"
                  data-testid="cast-tutorial-tooltip"
                  style={{
                    position:"absolute",
                    bottom:"calc(100% + 10px)", left:"50%",
                    transform:"translateX(-50%)",
                    background:"var(--brand-gold,#C89B3C)",
                    color:"var(--brand-navy,#0F2A5B)",
                    padding:"0.55rem 0.85rem",
                    borderRadius: 10,
                    fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:"0.82rem",
                    whiteSpace:"nowrap",
                    boxShadow:"0 10px 22px rgba(200,155,60,0.45)",
                    display:"flex", alignItems:"center", gap:"0.5rem",
                    animation:"ez-cast-tut-bounce 1.2s ease-in-out infinite",
                    zIndex: 2,
                  }}
                >
                  <span aria-hidden style={{fontSize:"1.05rem"}}>👆</span>
                  <span>Tap here — cast to your TV in <u>one step</u></span>
                  <button
                    type="button"
                    onClick={() => setShowTutorial(false)}
                    aria-label="Dismiss tutorial"
                    data-testid="cast-tutorial-close"
                    style={{
                      background:"transparent", border:"none",
                      color:"var(--brand-navy,#0F2A5B)",
                      fontSize:"1.1rem", lineHeight:1,
                      cursor:"pointer", padding:"0 0 0 0.25rem",
                      opacity:0.75,
                    }}
                  >×</button>
                  {/* Downward-pointing arrow */}
                  <div style={{
                    position:"absolute",
                    top:"100%", left:"50%",
                    transform:"translateX(-50%)",
                    width:0, height:0,
                    borderLeft:"8px solid transparent",
                    borderRight:"8px solid transparent",
                    borderTop:"8px solid var(--brand-gold,#C89B3C)",
                  }}/>
                </div>
              )}
              {/* Keyframes for the coach-mark bounce — injected inline so
                  we don't need a global stylesheet edit. Applies only when
                  the tooltip is mounted; garbage-collected on unmount.    */}
              {showTutorial && (
                <style>{`
                  @keyframes ez-cast-tut-bounce {
                    0%,100% { transform: translateX(-50%) translateY(0); }
                    50%     { transform: translateX(-50%) translateY(-4px); }
                  }
                `}</style>
              )}

              {/* 1-tap picker button. Big and gold so it's the obvious primary action. */}
              <button
                type="button"
                onClick={openNativePicker}
                data-testid="cast-native-picker-btn"
                aria-label={cap.kind === "airplay" ? "Open AirPlay device picker" : "Open cast device picker"}
                style={{
                  display:"flex", alignItems:"center", gap:"0.6rem",
                  width:"100%", padding:"0.9rem 1.05rem",
                  background:"var(--brand-navy,#0F2A5B)", color:"#fff",
                  border:"none", borderRadius: 10,
                  fontFamily:"Sora,sans-serif", fontWeight:700, fontSize:"0.95rem",
                  cursor: pickerState === "trying" ? "progress" : "pointer",
                  boxShadow:"0 4px 12px rgba(15,42,91,0.25)",
                  opacity: pickerState === "trying" ? 0.85 : 1,
                }}
              >
                <span style={{fontSize:"1.2rem"}} aria-hidden>
                  {cap.kind === "airplay" ? "🍎" : cap.kind === "chromecast" ? "📺" : "🎥"}
                </span>
                <span style={{flex:1, textAlign:"left"}}>
                  {pickerState === "trying" ? "Opening picker…" : (
                    cap.kind === "airplay" ? "Open AirPlay picker — pick your Apple TV" :
                    cap.kind === "chromecast" ? "Open Chromecast / Apple TV picker" :
                    "Open your TV / cast picker"
                  )}
                </span>
                <span style={{fontSize:"0.75rem", opacity:0.75}}>1 tap</span>
              </button>
              </div>

              {/* Secondary Apple-TV callout — only rendered when the primary
                  1-tap picker is Chromecast-flavoured, so Mac/iPhone users on
                  Chrome/Edge still find their AirPlay path.  Safari/iOS users
                  see their own AirPlay button as the primary action so this
                  block is redundant for them.                              */}
              {cap.kind === "chromecast" && (
                <details data-testid="cast-appletv-hint" style={{marginTop:"0.55rem", background:"#F5F0E1", border:"1px solid rgba(200,155,60,0.35)", borderRadius:10, padding:"0.55rem 0.85rem"}}>
                  <summary style={{cursor:"pointer", fontSize:"0.85rem", color:"var(--brand-navy,#0F2A5B)", fontWeight:700, fontFamily:"Sora,sans-serif", display:"flex", alignItems:"center", gap:"0.4rem"}}>
                    <span aria-hidden style={{fontSize:"1rem"}}>🍎</span>
                    Have an Apple TV? Cast via AirPlay instead
                  </summary>
                  <ol style={{margin:"0.5rem 0 0", padding:"0 0 0 1.1rem", fontSize:"0.83rem", color:"#374151", lineHeight:1.65}}>
                    <li><strong>On a Mac:</strong> click the <strong>Control Centre</strong> icon in the top-right menu bar → <strong>Screen Mirroring</strong> → pick your <strong>Apple TV</strong>.</li>
                    <li><strong>On an iPhone or iPad:</strong> swipe down from the top-right corner → tap <strong>Screen Mirroring</strong> (two overlapping rectangles) → pick your <strong>Apple TV</strong>.</li>
                    <li>Come back to this tab (or Safari on iOS) and tap <strong>Start Present Mode</strong> below — the slideshow will mirror to the TV.</li>
                    <li style={{color:"#6b7280"}}>Chrome on macOS doesn't expose a 1-tap AirPlay picker; the OS-level Screen Mirroring above is the standard path and works with every Apple TV.</li>
                  </ol>
                </details>
              )}

              {/* Illustrated step-by-step fallback — shows when the picker
                  can't open (Firefox, older Android, some in-app browsers)
                  or when the browser hasn't yet reported an available
                  device.  Also useful as a "here's how it works" reference
                  even when the picker opens successfully.                 */}
              <details style={{marginTop:"0.6rem"}}>
                <summary style={{cursor:"pointer", fontSize:"0.78rem", color:"#6b7280", padding:"0.3rem 0"}}>
                  {pickerState === "unsupported"
                    ? "Picker didn't open — here's how to cast manually ↓"
                    : "Prefer manual steps? Tap to expand ↓"}
                </summary>
                <div style={{marginTop:"0.5rem"}}>
                  {cap.kind === "airplay" ? (
                    <ol data-testid="cast-hint-airplay" style={{margin:0, padding:"0 0 0 1.1rem", fontSize:"0.83rem", color:"#374151", lineHeight:1.65}}>
                      <li><strong>Swipe down</strong> from the top-right corner of your iPhone or iPad → this opens <strong>Control Center</strong>.</li>
                      <li>Tap <strong>Screen Mirroring</strong> <span style={{color:"#6b7280"}}>(two overlapping rectangles icon)</span>.</li>
                      <li>Pick your <strong>Apple TV</strong> or AirPlay-enabled TV from the list.</li>
                      <li>Come back to this tab and hit <strong>Present Mode</strong> below.</li>
                    </ol>
                  ) : cap.kind === "chromecast" ? (
                    <ol data-testid="cast-hint-chrome" style={{margin:0, padding:"0 0 0 1.1rem", fontSize:"0.83rem", color:"#374151", lineHeight:1.65}}>
                      <li>Open Chrome's <strong>three-dot menu</strong> <span style={{fontFamily:"monospace", background:"#F3F4F6", padding:"0 0.35rem", borderRadius:4}}>⋮</span> (top-right of the browser).</li>
                      <li>Click <strong>Cast…</strong>.</li>
                      <li>Pick your <strong>Chromecast / Google TV / Nest Hub</strong> from the list.</li>
                      <li style={{marginTop:"0.35rem"}}><strong>Apple TV owner?</strong> Use the gold <em>"Cast via AirPlay"</em> panel above instead — Chrome can't open the AirPlay picker directly, but macOS/iOS Screen Mirroring does the same job.</li>
                      <li>Come back to this tab and hit <strong>Present Mode</strong> below.</li>
                    </ol>
                  ) : (
                    <ol style={{margin:0, padding:"0 0 0 1.1rem", fontSize:"0.83rem", color:"#374151", lineHeight:1.65}}>
                      <li>Use your browser's built-in <strong>Cast</strong> or <strong>Screen Mirroring</strong> option to send this tab to a TV.</li>
                      <li>Come back to this tab and hit <strong>Present Mode</strong> below.</li>
                    </ol>
                  )}
                </div>
              </details>
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
          </div>
        </div>
      )}
    </>
  );
};

export default CastToDevice;
