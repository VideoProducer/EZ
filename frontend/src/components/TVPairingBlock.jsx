// TVPairingBlock — phone-side controls that pair with a big-screen browser
// via a 6-digit code. Once the TV claims the code, the phone becomes a
// remote: next/prev photo, start narration, exit. No screen-mirroring —
// the TV renders the listing itself full-screen.
//
// Works with any smart-TV browser (Samsung Tizen, LG WebOS), a laptop
// HDMI'd to a TV, a Chromebook, or an iPad with an HDMI adapter.
// Does NOT work directly on stock Apple TV or Chromecast (no browsers).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const API = process.env.REACT_APP_BACKEND_URL;
// The URL we show the user + embed in the QR code. Dynamic to
// `window.location.origin` when available so a code minted on the
// preview environment doesn't send the TV browser to production
// (where the pairing session doesn't exist), and vice-versa.
const TV_URL = (typeof window !== "undefined" && window.location?.origin)
  ? `${window.location.origin}/tv`
  : "https://eztofind.ca/tv";

// Build a compact snapshot the TV can render without needing to refetch.
// Keeping the payload small (< 10 KB) so Mongo docs stay tiny.
function buildSnapshot(listing) {
  if (!listing) return null;
  return {
    listing_key: listing.listing_key,
    photos: (listing.photos || []).slice(0, 40),
    list_price: listing.list_price,
    beds: listing.beds,
    baths: listing.baths,
    living_area: listing.living_area,
    living_area_units: listing.living_area_units,
    year_built: listing.year_built,
    property_type: listing.property_type,
    city: listing.city,
    province: listing.province,
    street_address: listing.street_address,
    unparsed_address: listing.unparsed_address,
    brokerage_name: listing.brokerage_name,
    description: (listing.description || "").slice(0, 800),
  };
}

const TVPairingBlock = ({ listing, listingKey, onPaired, onExit }) => {
  const [state, setState] = useState("idle");            // idle | pairing | paired | error
  const [code, setCode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const pollRef = useRef(null);
  const snapshot = buildSnapshot(listing);
  const photos = (listing?.photos || []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Poll every 2s while pairing — flip to "paired" the moment the TV claims.
  useEffect(() => {
    if (state !== "pairing" || !sessionId) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/cast/pair/state/${sessionId}`);
        if (!r.ok) return;
        const j = await r.json();
        if (j.claimed) {
          stopPolling();
          setState("paired");
          onPaired && onPaired();
        }
      } catch { /* transient — try again next tick */ }
    }, 2000);
    return stopPolling;
  }, [state, sessionId, stopPolling, onPaired]);

  // Cleanup on unmount — end the session so the TV drops back to code entry.
  useEffect(() => () => {
    stopPolling();
    if (sessionId) {
      fetch(`${API}/api/cast/pair/${sessionId}`, { method: "DELETE", keepalive: true }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPairing = async () => {
    setErrMsg("");
    try {
      const r = await fetch(`${API}/api/cast/pair/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_key: listingKey || listing?.listing_key || null,
          photo_index: 0,
          listing_snapshot: snapshot,
        }),
      });
      if (!r.ok) throw new Error("Could not create a pairing code.");
      const j = await r.json();
      setCode(j.code);
      setSessionId(j.session_id);
      setPhotoIdx(0);
      setState("pairing");
    } catch (e) {
      setErrMsg(e.message || "Could not create a pairing code.");
      setState("error");
    }
  };

  const pushUpdate = async (partial) => {
    if (!sessionId) return;
    try {
      await fetch(`${API}/api/cast/pair/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, ...partial }),
      });
    } catch { /* swallow — next tap will retry */ }
  };

  const nextPhoto = () => {
    if (!photos.length) return;
    const nxt = (photoIdx + 1) % photos.length;
    setPhotoIdx(nxt);
    pushUpdate({ photo_index: nxt });
  };
  const prevPhoto = () => {
    if (!photos.length) return;
    const prv = (photoIdx - 1 + photos.length) % photos.length;
    setPhotoIdx(prv);
    pushUpdate({ photo_index: prv });
  };
  const playNarration = () => pushUpdate({ action: "play_narration" });
  const stopNarration = () => pushUpdate({ action: "stop_narration" });
  const endSession = () => {
    if (sessionId) fetch(`${API}/api/cast/pair/${sessionId}`, { method: "DELETE", keepalive: true }).catch(() => {});
    stopPolling();
    setSessionId(null); setCode(null); setState("idle");
    onExit && onExit();
  };

  // ── UI ──
  return (
    <div
      data-testid="tv-pair-block"
      style={{
        background: "linear-gradient(135deg, #0F2A5B 0%, #1E4FCF 100%)",
        color: "#fff",
        borderRadius: 12,
        padding: "1rem 1.1rem",
        marginBottom: "1rem",
        fontFamily: "Inter,sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <span style={{
          fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.12em",
          textTransform: "uppercase", background: "#F5A623", color: "#0F2A5B",
          padding: "2px 8px", borderRadius: 4,
        }}>Recommended</span>
        <span style={{ fontFamily: "Sora,sans-serif", fontSize: "1.05rem", fontWeight: 700 }}>
          Send to a TV browser
        </span>
      </div>

      {state === "idle" && (
        <>
          <p style={{ margin: "0 0 0.6rem", fontSize: "0.85rem", opacity: 0.9 }}>
            The listing plays full-screen on the TV — <strong>no phone mirroring</strong>.
            Works on Samsung / LG smart-TV browsers, a laptop HDMI'd to a TV, or a Chromebook.
          </p>
          <div style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8, padding: "0.5rem 0.7rem",
            fontSize: "0.75rem", opacity: 0.9, marginBottom: "0.6rem",
            lineHeight: 1.45,
          }}>
            <strong>Using Apple TV or Chromecast?</strong> Those don't have a web browser, so
            they can't enter the code. Use iPhone <em>Screen Mirroring</em> instead (Control Centre
            → Screen Mirroring → Apple TV) — your phone becomes the source and the TV mirrors
            it 1:1.
          </div>
          <button
            type="button"
            onClick={startPairing}
            data-testid="tv-pair-start-btn"
            style={{
              display: "block", width: "100%", padding: "0.75rem 1rem",
              background: "#F5A623", color: "#0F2A5B",
              border: "none", borderRadius: 10,
              fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >📺 Get a TV pairing code</button>
        </>
      )}

      {state === "pairing" && code && (
        <>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", opacity: 0.92 }}>
            On your TV browser, open <strong style={{ color: "#F5A623" }}>eztofind.ca/tv</strong> and enter this code:
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 120px", gap: "0.9rem", alignItems: "center",
            background: "rgba(255,255,255,0.08)", padding: "0.75rem", borderRadius: 10,
          }}>
            <div>
              <div
                data-testid="tv-pair-code"
                style={{
                  fontFamily: "Sora,monospace", fontSize: "2.4rem", fontWeight: 800,
                  letterSpacing: "0.35rem", color: "#fff", lineHeight: 1,
                }}
              >{code}</div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.75 }}>
                Code expires in 20 min. Waiting for TV…
              </div>
            </div>
            <div style={{ background: "#fff", padding: "6px", borderRadius: 8, display: "flex", justifyContent: "center" }}>
              <QRCodeSVG value={`${TV_URL}?code=${code}`} size={108} level="M" fgColor="#0F2A5B" bgColor="#FFFFFF"/>
            </div>
          </div>
          <button
            type="button"
            onClick={endSession}
            data-testid="tv-pair-cancel-btn"
            style={{
              marginTop: "0.6rem", background: "transparent",
              color: "#fff", border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 8, padding: "0.4rem 0.8rem", fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >Cancel</button>
        </>
      )}

      {state === "paired" && (
        <>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
            ✅ <strong>TV connected.</strong> Your phone is now the remote.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <button
              type="button" onClick={prevPhoto}
              data-testid="tv-pair-prev-btn"
              disabled={!photos.length}
              style={{
                padding: "0.65rem", background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.28)", color: "#fff",
                borderRadius: 8, fontWeight: 600, cursor: photos.length ? "pointer" : "not-allowed",
                fontFamily: "Inter,sans-serif",
              }}
            >‹ Previous photo</button>
            <button
              type="button" onClick={nextPhoto}
              data-testid="tv-pair-next-btn"
              disabled={!photos.length}
              style={{
                padding: "0.65rem", background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.28)", color: "#fff",
                borderRadius: 8, fontWeight: 600, cursor: photos.length ? "pointer" : "not-allowed",
                fontFamily: "Inter,sans-serif",
              }}
            >Next photo ›</button>
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.75, textAlign: "center", marginBottom: "0.5rem" }}>
            Photo {photos.length ? photoIdx + 1 : 0} of {photos.length || 0}
          </div>
          {listing?.doogie_tour_narration ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <button
                type="button" onClick={playNarration}
                data-testid="tv-pair-play-narration-btn"
                style={{
                  padding: "0.6rem", background: "#F5A623", color: "#0F2A5B",
                  border: "none", borderRadius: 8, fontWeight: 700,
                  cursor: "pointer", fontFamily: "Sora,sans-serif",
                }}
              >▶ Play Doogie narration on TV</button>
              <button
                type="button" onClick={stopNarration}
                data-testid="tv-pair-stop-narration-btn"
                style={{
                  padding: "0.6rem", background: "transparent",
                  border: "1px solid rgba(255,255,255,0.28)", color: "#fff",
                  borderRadius: 8, fontWeight: 600, cursor: "pointer",
                  fontFamily: "Inter,sans-serif",
                }}
              >■ Stop</button>
            </div>
          ) : null}
          <button
            type="button" onClick={endSession}
            data-testid="tv-pair-end-btn"
            style={{
              width: "100%", padding: "0.5rem", background: "transparent",
              border: "1px dashed rgba(255,255,255,0.4)", color: "#fff",
              borderRadius: 8, fontSize: "0.82rem", cursor: "pointer",
              fontFamily: "Inter,sans-serif",
            }}
          >Disconnect TV</button>
        </>
      )}

      {state === "error" && (
        <>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.88rem" }}>⚠️ {errMsg}</p>
          <button
            type="button" onClick={startPairing}
            data-testid="tv-pair-retry-btn"
            style={{
              padding: "0.5rem 1rem", background: "#F5A623", color: "#0F2A5B",
              border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
            }}
          >Try again</button>
        </>
      )}
    </div>
  );
};

export default TVPairingBlock;
