// TVDisplayPage — /tv route.  A smart-TV browser (Samsung Tizen, LG WebOS)
// or a laptop-HDMI'd-to-a-TV opens this page, enters the 6-digit code shown
// on the phone, and gets a full-screen listing viewer that follows the
// phone remote (next/prev photo, play Doogie narration).  No mirroring.
//
// Design goals:
//   • Instantly readable from 3 m away on a 55" TV (huge type, chunky UI).
//   • Photo takes ~78 % of the screen height; sidecar shows price + facts.
//   • Polls the pairing session every 2 s — no WebSockets so it works on
//     every TV browser JS engine we've tested.
//   • Doogie TTS narration streams from the same /api/doogie/tts endpoint
//     the listing page uses, so cache hits are free.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";

const API = process.env.REACT_APP_BACKEND_URL;

const C = { navy: "#0F2A5B", gold: "#F5A623", ink: "#1F2937", muted: "#9CA3AF", cream: "#F5F0E1" };
const fmtMoney = n => !n ? "" : n >= 1e6 ? `$${(n/1e6).toFixed(n>=1e7?0:2)}M` : n >= 1e3 ? `$${Math.round(n/1e3)}K` : `$${n.toLocaleString("en-CA")}`;

export default function TVDisplayPage() {
  const [phase, setPhase] = useState("enter");   // enter | connecting | connected | ended
  const [code, setCode] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [narrating, setNarrating] = useState(false);
  const lastActionRef = useRef(null);
  const pollRef = useRef(null);
  const audioRef = useRef(null);

  // Prefill from ?code=NNNNNN so a QR scan on the TV browser lands
  // straight in a one-tap "Connect" state.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("code");
      if (p && /^\d{6}$/.test(p)) setCode(p);
    } catch { /* ignored */ }
  }, []);

  const connect = useCallback(async (rawCode) => {
    const c = String(rawCode || code).trim();
    if (!/^\d{6}$/.test(c)) { setErrMsg("Enter the 6-digit code shown on the phone."); return; }
    setErrMsg("");
    setPhase("connecting");
    try {
      const r = await fetch(`${API}/api/cast/pair/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t.includes("expired") ? "Code expired — ask the phone for a new one." : "Code not found. Double-check the digits on the phone.");
      }
      const j = await r.json();
      setSessionId(j.session_id);
      setSnapshot(j.listing_snapshot || null);
      setPhotoIdx(j.photo_index || 0);
      setPhase("connected");
    } catch (e) {
      setErrMsg(e.message || "Could not connect.");
      setPhase("enter");
    }
  }, [code]);

  // Poll every 2s while connected — sync photo index + react to actions.
  useEffect(() => {
    if (phase !== "connected" || !sessionId) return;
    const tick = async () => {
      try {
        const r = await fetch(`${API}/api/cast/pair/state/${sessionId}`);
        if (r.status === 404 || r.status === 410) {
          setPhase("ended");
          return;
        }
        if (!r.ok) return;
        const j = await r.json();
        if (j.listing_snapshot) setSnapshot(j.listing_snapshot);
        if (typeof j.photo_index === "number") setPhotoIdx(j.photo_index);
        // React to one-shot actions using updated_at as a fingerprint.
        const actionSig = `${j.action || ""}@${j.updated_at || ""}`;
        if (j.action && actionSig !== lastActionRef.current) {
          lastActionRef.current = actionSig;
          if (j.action === "play_narration") playNarrationOnTV();
          if (j.action === "stop_narration") stopNarrationOnTV();
        }
      } catch { /* transient — try again next tick */ }
    };
    tick();
    pollRef.current = setInterval(tick, 2000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionId]);

  const stopNarrationOnTV = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch { /* ignored */ }
    setNarrating(false);
  };

  const playNarrationOnTV = async () => {
    if (!snapshot?.listing_key) return;
    setNarrating(true);
    try {
      // Fetch the walk-through script from the same endpoint the listing
      // page uses — cache-hit case is instant.
      const nr = await fetch(`${API}/api/listings/${snapshot.listing_key}/narration`);
      if (!nr.ok) throw new Error("narration unavailable");
      const nj = await nr.json();
      const script = (nj.script || "").trim();
      if (!script) throw new Error("empty narration");
      // Fetch TTS audio (cached server-side, so repeat plays are ~free).
      const tr = await fetch(`${API}/api/doogie/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script.slice(0, 4000), voice: "onyx" }),
      });
      if (!tr.ok) throw new Error("tts failed");
      const blob = await tr.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.onended = () => setNarrating(false);
        await audioRef.current.play().catch(() => setNarrating(false));
      }
    } catch {
      setNarrating(false);
    }
  };

  // ── PHASE: enter code ──────────────────────────────────────────────
  if (phase === "enter" || phase === "connecting") {
    return (
      <div
        data-testid="tv-display-enter"
        style={{
          minHeight: "100vh", background: `linear-gradient(135deg, ${C.navy} 0%, #1E4FCF 100%)`,
          color: "#fff", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: "2rem",
          fontFamily: "Inter,sans-serif",
        }}
      >
        <Helmet>
          <title>Connect a phone · EZtoFind TV</title>
          <meta name="robots" content="noindex,nofollow"/>
        </Helmet>
        <div style={{ fontSize: "0.85rem", letterSpacing: "0.18em", opacity: 0.75, marginBottom: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>
          EZtoFind · TV
        </div>
        <h1 style={{ fontFamily: "Sora,sans-serif", fontSize: "3rem", fontWeight: 800, margin: "0 0 0.5rem", textAlign: "center" }}>
          Enter the code from your phone
        </h1>
        <p style={{ maxWidth: 620, textAlign: "center", opacity: 0.85, fontSize: "1.05rem", margin: "0 0 2rem" }}>
          On your phone, tap the <strong>Cast</strong> button on any listing → <strong>Get a TV pairing code</strong> → enter the 6 digits below.
        </p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => { if (e.key === "Enter") connect(); }}
          placeholder="000000"
          data-testid="tv-display-code-input"
          autoFocus
          style={{
            fontFamily: "Sora,monospace", fontSize: "4rem", fontWeight: 800,
            letterSpacing: "0.6rem", textAlign: "center",
            padding: "1rem 1.5rem", width: "min(90vw, 560px)",
            background: "rgba(255,255,255,0.1)", color: "#fff",
            border: "2px solid rgba(255,255,255,0.35)", borderRadius: 16,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => connect()}
          disabled={phase === "connecting"}
          data-testid="tv-display-connect-btn"
          style={{
            marginTop: "1.25rem", padding: "1rem 3rem",
            background: C.gold, color: C.navy, border: "none", borderRadius: 999,
            fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "1.25rem",
            cursor: phase === "connecting" ? "progress" : "pointer",
            opacity: phase === "connecting" ? 0.8 : 1,
            boxShadow: "0 8px 24px rgba(245,166,35,0.35)",
          }}
        >{phase === "connecting" ? "Connecting…" : "Connect →"}</button>
        {errMsg && (
          <div data-testid="tv-display-error" style={{ marginTop: "1.25rem", background: "rgba(255,255,255,0.15)", padding: "0.65rem 1.25rem", borderRadius: 10, fontSize: "1rem" }}>
            ⚠️ {errMsg}
          </div>
        )}
        <div style={{ position: "absolute", bottom: "1.5rem", fontSize: "0.85rem", opacity: 0.6 }}>
          eztofind.ca/tv · No app needed · Works on any TV browser
        </div>
      </div>
    );
  }

  // ── PHASE: ended ───────────────────────────────────────────────────
  if (phase === "ended") {
    return (
      <div
        data-testid="tv-display-ended"
        style={{
          minHeight: "100vh", background: C.navy, color: "#fff",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "2rem", fontFamily: "Inter,sans-serif",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📺</div>
        <h1 style={{ fontFamily: "Sora,sans-serif", fontSize: "2.5rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
          Session ended
        </h1>
        <p style={{ opacity: 0.85, marginBottom: "1.5rem" }}>The phone disconnected. Ask it to generate a new code.</p>
        <button
          type="button"
          onClick={() => { setPhase("enter"); setCode(""); setSessionId(null); setSnapshot(null); }}
          data-testid="tv-display-reconnect-btn"
          style={{
            padding: "0.85rem 2rem", background: C.gold, color: C.navy,
            border: "none", borderRadius: 999, fontWeight: 800, fontSize: "1.05rem", cursor: "pointer",
          }}
        >Enter another code</button>
      </div>
    );
  }

  // ── PHASE: connected — the big-screen listing viewer ───────────────
  const photos = snapshot?.photos || [];
  const currentPhoto = photos[photoIdx] || photos[0];
  const beds = snapshot?.beds;
  const baths = snapshot?.baths;
  const area = snapshot?.living_area;
  const areaU = snapshot?.living_area_units || "sqft";
  const year = snapshot?.year_built;
  const addr = snapshot?.unparsed_address || snapshot?.street_address || "";
  const cityLine = [snapshot?.city, snapshot?.province].filter(Boolean).join(", ");
  const brokerage = snapshot?.brokerage_name;

  return (
    <div
      data-testid="tv-display-connected"
      style={{
        minHeight: "100vh", background: "#000", color: "#fff",
        display: "grid", gridTemplateColumns: "1fr 420px", gap: 0,
        fontFamily: "Inter,sans-serif", overflow: "hidden",
      }}
    >
      <Helmet>
        <title>{snapshot ? `${addr || "Listing"} · EZtoFind TV` : "EZtoFind TV"}</title>
        <meta name="robots" content="noindex,nofollow"/>
      </Helmet>
      <audio ref={audioRef} preload="none" x-webkit-airplay="deny" playsInline style={{ display: "none" }}/>

      {/* Photo area — full-bleed. */}
      <div style={{ position: "relative", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt=""
            data-testid="tv-display-photo"
            style={{ maxWidth: "100%", maxHeight: "100vh", objectFit: "contain", boxShadow: "0 0 80px rgba(0,0,0,0.6)" }}
          />
        ) : (
          <div style={{ padding: "3rem", opacity: 0.6, fontSize: "1.5rem" }}>Waiting for the phone to send a listing…</div>
        )}
        {/* Photo counter */}
        {photos.length > 1 && (
          <div
            data-testid="tv-display-photo-counter"
            style={{
              position: "absolute", left: 24, bottom: 24,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
              padding: "0.5rem 1rem", borderRadius: 999, fontSize: "1.1rem",
              fontFamily: "Sora,sans-serif", fontWeight: 700,
            }}
          >
            {photoIdx + 1} / {photos.length}
          </div>
        )}
        {narrating && (
          <div
            data-testid="tv-display-narrating"
            style={{
              position: "absolute", right: 24, bottom: 24,
              background: C.gold, color: C.navy,
              padding: "0.55rem 1.1rem", borderRadius: 999, fontSize: "1rem",
              fontFamily: "Sora,sans-serif", fontWeight: 800,
              display: "flex", alignItems: "center", gap: "0.5rem",
            }}
          >
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: C.navy, animation: "tv-pulse 1.2s ease-in-out infinite" }}/>
            Doogie is narrating
          </div>
        )}
      </div>

      {/* Info sidecar */}
      <div style={{
        background: `linear-gradient(180deg, ${C.navy} 0%, #08183a 100%)`,
        padding: "2.5rem 2rem", display: "flex", flexDirection: "column",
        borderLeft: `4px solid ${C.gold}`,
      }}>
        <div style={{ fontSize: "0.9rem", letterSpacing: "0.16em", opacity: 0.7, textTransform: "uppercase", fontWeight: 700, marginBottom: "0.6rem" }}>
          EZtoFind · Big screen
        </div>
        <div
          data-testid="tv-display-price"
          style={{ fontFamily: "Sora,sans-serif", fontSize: "3.4rem", fontWeight: 800, lineHeight: 1, color: C.gold, marginBottom: "0.75rem" }}
        >
          {fmtMoney(snapshot?.list_price) || "—"}
        </div>
        <div style={{ fontFamily: "Sora,sans-serif", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.25 }}>
          {addr || " "}
        </div>
        {cityLine && (
          <div style={{ fontSize: "1.15rem", opacity: 0.75, marginTop: "0.35rem" }}>
            {cityLine}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", marginTop: "1.5rem", fontSize: "1.15rem" }}>
          {beds ? <span>🛏 <strong>{beds}</strong> bed</span> : null}
          {baths ? <span>🛁 <strong>{baths}</strong> bath</span> : null}
          {area ? <span>📐 <strong>{Number(area).toLocaleString("en-CA")}</strong> {areaU}</span> : null}
          {year ? <span>🏗 <strong>{year}</strong></span> : null}
        </div>
        {snapshot?.description && (
          <p style={{ marginTop: "1.5rem", fontSize: "1.02rem", lineHeight: 1.55, opacity: 0.9, maxHeight: "38vh", overflow: "hidden" }}>
            {snapshot.description}
          </p>
        )}
        <div style={{ flex: 1 }}/>
        {brokerage && (
          <div style={{ fontSize: "0.85rem", opacity: 0.7, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "0.75rem", marginTop: "1rem", lineHeight: 1.5 }}>
            Listing courtesy of <strong>{brokerage}</strong>.<br/>
            MLS®, REALTOR® and the associated logos are certification marks owned or controlled by CREA.
          </div>
        )}
        <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", opacity: 0.55, letterSpacing: "0.08em" }}>
          eztofind.ca — controlled remotely by phone
        </div>
      </div>
      <style>{`
        @keyframes tv-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @media (max-width: 1024px) {
          [data-testid="tv-display-connected"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
