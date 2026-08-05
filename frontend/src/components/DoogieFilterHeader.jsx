/**
 * DoogieFilterHeader — shared navy strip that sits above every listing filter
 * form on the site. Provides:
 *   • Ask-Doogie voice mic → POSTs to /api/doogie/voice-filter and passes the
 *     parsed filter dict back via onVoiceFilter(filterObj).
 *   • Reset button → calls onReset() so the parent form can clear all fields.
 *
 * Kept intentionally standalone so both /listings (App.js `ListingFilters`)
 * and specialty pages (App.js `SpecialtyFilterPanel`) can adopt the same look.
 * The dashboard mockup keeps its own `FloatingFilters` because it also needs
 * drag-to-move — those extras don't belong on production listing pages where
 * the filter lives in a fixed sidebar column.
 */
import React, { useEffect, useRef, useState } from "react";

const NAVY = "#0F2A5B";
const GOLD = "#F5A623";

export const DoogieFilterHeader = ({ onVoiceFilter, onReset }) => {
  const [voiceState, setVoiceState] = useState("idle"); // idle | listening | thinking | error | typing
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [typedQuery, setTypedQuery] = useState("");
  const [mode, setMode] = useState("voice"); // "voice" | "text" — remembered per-session
  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const typedRef = useRef(null);

  // Detect mic availability so we can fall back to text-only mode on desktops
  // where the browser lacks getUserMedia or the OS blocks the mic. Runs once.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      setMode("text");
    }
  }, []);

  const stopVoice = () => {
    try { mediaRef.current?.stop(); } catch {}
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
  };

  const startVoice = async () => {
    setErrorMsg("");
    setTranscript("");
    if (!navigator?.mediaDevices?.getUserMedia) {
      // No mic — flip to typing mode so the visitor still gets the magic.
      setMode("text");
      setVoiceState("typing");
      setTimeout(() => typedRef.current?.focus(), 60);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        setVoiceState("thinking");
        try { stream.getTracks().forEach(t => t.stop()); } catch {}
        const blob = new Blob(chunksRef.current, { type: mime });
        const form = new FormData();
        form.append("audio", blob, "voice.webm");
        form.append("language", "en");
        try {
          const backendUrl = process.env.REACT_APP_BACKEND_URL;
          const resp = await fetch(`${backendUrl}/api/doogie/voice-filter`, { method: "POST", body: form });
          const body = await resp.json();
          if (!resp.ok) throw new Error(body.detail || "Voice filter failed");
          setTranscript(body.transcript || "");
          // Preferred: the community_normalized wraps the model's raw city into a
          // known-good BC community name.
          const normCity = body.community_normalized?.community || body.filter?.community || "";
          onVoiceFilter?.({ ...(body.filter || {}), community: normCity, transcript: body.transcript || "" });
          setVoiceState("idle");
        } catch (err) {
          setErrorMsg(String(err.message || err));
          setVoiceState("error");
        }
      };
      mediaRef.current = rec;
      rec.start();
      setVoiceState("listening");
    } catch (e) {
      // Mic denied / not present — auto-flip to text mode.
      setMode("text");
      setVoiceState("typing");
      setTimeout(() => typedRef.current?.focus(), 60);
    }
  };

  // Handle typed natural-language queries via /api/doogie/parse-filter.
  const submitTyped = async () => {
    const text = (typedQuery || "").trim();
    if (!text) return;
    setErrorMsg("");
    setVoiceState("thinking");
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const resp = await fetch(`${backendUrl}/api/doogie/parse-filter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: "en" }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body.detail || "Parse failed");
      setTranscript(text);
      const normCity = body.community_normalized?.community || body.filter?.community || "";
      onVoiceFilter?.({ ...(body.filter || {}), community: normCity, transcript: text });
      setTypedQuery("");
      setVoiceState("idle");
    } catch (err) {
      setErrorMsg(String(err.message || err));
      setVoiceState("error");
    }
  };

  const handleHeaderClick = () => {
    if (voiceState === "listening") {
      stopVoice();
    } else if (mode === "text") {
      // Toggle the typing card open/closed.
      setVoiceState(voiceState === "typing" ? "idle" : "typing");
      if (voiceState !== "typing") setTimeout(() => typedRef.current?.focus(), 60);
    } else {
      startVoice();
    }
  };

  const isListening = voiceState === "listening";
  const isThinking = voiceState === "thinking";
  const isTyping = voiceState === "typing";

  return (
    <div data-testid="doogie-filter-header" style={{ marginBottom: 0 }}>
      <div style={{
        background: NAVY, color: "#fff",
        padding: "6px 10px",
        borderTopLeftRadius: 12, borderTopRightRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 10.5, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase",
        borderBottom: `2px solid ${GOLD}`,
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden="true" style={{ display: "inline-flex", gap: 2 }}>
            {[0,1,2,3,4,5].map(i => (
              <span key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff", opacity: 0.9 }}/>
            ))}
          </span>
          Filter Listings
        </span>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Mode toggle — voice ↔ text. Kept tiny so the header height stays flush. */}
          <button
            type="button"
            onClick={() => {
              const next = mode === "voice" ? "text" : "voice";
              setMode(next);
              // Close any open state when the mode changes.
              if (isListening) stopVoice();
              setVoiceState(next === "text" ? "typing" : "idle");
              if (next === "text") setTimeout(() => typedRef.current?.focus(), 60);
            }}
            data-testid="doogie-filter-mode"
            title={mode === "voice" ? "Switch to typing" : "Switch to voice"}
            style={{
              background: "transparent", color: "#fff",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 999, padding: "1px 7px",
              fontSize: 9, fontWeight: 800, cursor: "pointer",
              letterSpacing: 0.5, textTransform: "uppercase",
            }}
          >{mode === "voice" ? "⌨ Type" : "🎤 Voice"}</button>
          <button
            type="button"
            onClick={handleHeaderClick}
            disabled={isThinking}
            data-testid="doogie-filter-voice"
            title={
              isListening ? "Stop listening"
              : mode === "text" ? "Type your search for Doogie"
              : "Ask Doogie by voice"
            }
            style={{
              background: isListening ? "#DC2626" : GOLD,
              color: isListening ? "#fff" : NAVY,
              border: "none", borderRadius: 999, padding: "2px 8px",
              fontSize: 9, fontWeight: 800, cursor: isThinking ? "wait" : "pointer",
              letterSpacing: 0.5, textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: 3,
              opacity: isThinking ? 0.6 : 1,
            }}
          >
            {isListening ? "● Rec" : isThinking ? "…" : mode === "text" ? "⌨ Doogie" : "🎤 Doogie"}
          </button>
          <button
            type="button"
            onClick={onReset}
            data-testid="doogie-filter-reset"
            title="Reset all filter fields"
            style={{
              background: "transparent", color: GOLD, border: "1px solid rgba(245,166,35,0.5)",
              borderRadius: 999, padding: "1px 7px", fontSize: 9, fontWeight: 800, cursor: "pointer",
              letterSpacing: 0.5, textTransform: "uppercase",
            }}
          >Reset</button>
        </span>
      </div>
      {isTyping && (
        <div data-testid="doogie-filter-typing" style={{ background: NAVY, color: "#fff", padding: "10px 12px", borderTop: `1px solid ${GOLD}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, marginBottom: 6, opacity: 0.85 }}>
            🐾 Tell Doogie what you're looking for:
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              ref={typedRef}
              type="text"
              value={typedQuery}
              onChange={(e) => setTypedQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitTyped(); } }}
              placeholder="e.g. 3 bed house in Kelowna under 900k"
              data-testid="doogie-filter-typed-input"
              style={{
                flex: "1 1 auto", padding: "6px 10px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.08)",
                color: "#fff", fontSize: 12, outline: "none",
              }}
            />
            <button
              type="button"
              onClick={submitTyped}
              disabled={!typedQuery.trim()}
              data-testid="doogie-filter-typed-submit"
              style={{
                background: GOLD, color: NAVY, border: "none",
                borderRadius: 999, padding: "5px 12px",
                fontSize: 10, fontWeight: 800, cursor: typedQuery.trim() ? "pointer" : "not-allowed",
                letterSpacing: 0.5, textTransform: "uppercase",
                opacity: typedQuery.trim() ? 1 : 0.5,
              }}
            >Send</button>
          </div>
          <div style={{ fontSize: 10, opacity: 0.65, marginTop: 5 }}>
            Try “5 acre acreage near Chilliwack”, or “condo Vancouver 2 bed under 700k”.
          </div>
        </div>
      )}
      {isListening && (
        <div data-testid="doogie-filter-listening" style={{ background: NAVY, color: "#fff", padding: "10px 12px", textAlign: "center", fontSize: 11, borderTop: `1px solid ${GOLD}` }}>
          🎤 Listening — say "3 bed house in Kelowna under 900k" then tap ● Rec again to send.
        </div>
      )}
      {isThinking && (
        <div data-testid="doogie-filter-thinking" style={{ background: "#EEF2FF", color: NAVY, padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 600 }}>
          🐾 Doogie is thinking… (parsing your query)
        </div>
      )}
      {transcript && voiceState === "idle" && (
        <div data-testid="doogie-filter-transcript" style={{ background: "#F5F0E1", color: NAVY, padding: "8px 12px", fontSize: 11, fontStyle: "italic", borderTop: `1px solid ${GOLD}` }}>
          🐕 Doogie heard: <em>"{transcript}"</em>
        </div>
      )}
      {voiceState === "error" && errorMsg && (
        <div data-testid="doogie-filter-error" style={{ background: "#FEE2E2", color: "#B91C1C", padding: "8px 12px", fontSize: 11, fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default DoogieFilterHeader;
