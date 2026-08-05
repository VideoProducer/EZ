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
import React, { useRef, useState } from "react";

const NAVY = "#0F2A5B";
const GOLD = "#F5A623";

export const DoogieFilterHeader = ({ onVoiceFilter, onReset }) => {
  const [voiceState, setVoiceState] = useState("idle"); // idle | listening | thinking | error
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const stopVoice = () => {
    try { mediaRef.current?.stop(); } catch {}
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
  };

  const startVoice = async () => {
    setErrorMsg("");
    setTranscript("");
    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorMsg("Mic not supported in this browser — please type your filter.");
      setVoiceState("error");
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
      setErrorMsg("Mic permission denied — enable it in your browser settings.");
      setVoiceState("error");
    }
  };

  const isListening = voiceState === "listening";
  const isThinking = voiceState === "thinking";

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
          <button
            type="button"
            onClick={isListening ? stopVoice : startVoice}
            disabled={isThinking}
            data-testid="doogie-filter-voice"
            title={isListening ? "Stop listening" : "Ask Doogie by voice"}
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
            {isListening ? "● Rec" : isThinking ? "…" : "🎤 Doogie"}
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
      {isListening && (
        <div data-testid="doogie-filter-listening" style={{ background: NAVY, color: "#fff", padding: "10px 12px", textAlign: "center", fontSize: 11, borderTop: `1px solid ${GOLD}` }}>
          🎤 Listening — say "3 bed house in Kelowna under 900k" then tap ● Rec again to send.
        </div>
      )}
      {isThinking && (
        <div data-testid="doogie-filter-thinking" style={{ background: "#EEF2FF", color: NAVY, padding: "10px 12px", textAlign: "center", fontSize: 11, fontWeight: 600 }}>
          🐾 Doogie is thinking… (transcribing + parsing)
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
