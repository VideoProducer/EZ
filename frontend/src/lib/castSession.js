// Cast Session — admin-only "meeting label" state
// ---------------------------------------------------------------------
// When Doug is running a client meeting and casting listings to a TV /
// tablet / phone, he can start a "session" and label it (e.g. "Smith
// Family Viewing"). While a session is active, every Cast / Present-Mode
// event fired in that browser tab is tagged with the session's id + label
// so the admin dashboard can group casts by meeting, not just raw counts.
//
// Design:
//   • State lives in **sessionStorage** — per-tab, per-device. When Doug
//     closes the tab the session ends; when he opens a new tab it starts
//     fresh. This matches real-world meeting flow ("open tab, run
//     meeting, close tab").
//   • Admin gate: `_ADMIN_MARKER_KEY` in localStorage. Anonymous visitors
//     never see the banner or the "Start session" affordance, so a
//     buyer at home browsing on their phone can't pollute Doug's
//     dashboard with junk labels.
//   • Cross-component broadcast via a `storage`-like custom event so the
//     banner updates the moment the modal starts/renames/ends a session.

import React, { useEffect, useMemo, useState } from "react";

export const CAST_SESSION_KEY = "ez_cast_session";
export const CAST_SESSION_EVENT = "ez-cast-session-changed";
const ADMIN_MARKER_KEY = "ez_admin_session";

// ── Public API ───────────────────────────────────────────────────────
export function isAdmin() {
  try { return !!localStorage.getItem(ADMIN_MARKER_KEY); } catch { return false; }
}

export function readCastSession() {
  try {
    const raw = sessionStorage.getItem(CAST_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function startCastSession(label) {
  const clean = (label || "").trim().slice(0, 80);
  const session = {
    session_id: (crypto?.randomUUID?.() || `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    label: clean || "Untitled meeting",
    started_at: new Date().toISOString(),
  };
  try { sessionStorage.setItem(CAST_SESSION_KEY, JSON.stringify(session)); } catch {}
  _broadcast();
  return session;
}

export function renameCastSession(label) {
  const cur = readCastSession();
  if (!cur) return null;
  const next = { ...cur, label: (label || "").trim().slice(0, 80) || cur.label };
  try { sessionStorage.setItem(CAST_SESSION_KEY, JSON.stringify(next)); } catch {}
  _broadcast();
  return next;
}

export function endCastSession() {
  try { sessionStorage.removeItem(CAST_SESSION_KEY); } catch {}
  _broadcast();
}

// React hook: returns the current session object (or null) and re-renders
// whenever any component in the tab mutates it.
export function useCastSession() {
  const [session, setSession] = useState(() => readCastSession());
  useEffect(() => {
    const handler = () => setSession(readCastSession());
    window.addEventListener(CAST_SESSION_EVENT, handler);
    // Also listen to cross-tab storage events, though sessionStorage isn't
    // shared across tabs — this catches the very rare case of a rogue tab
    // firing the same key by mistake.
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CAST_SESSION_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return session;
}

function _broadcast() {
  try { window.dispatchEvent(new CustomEvent(CAST_SESSION_EVENT)); } catch {}
}

// ── UI: fixed pill shown while a session is active (admin-only) ──────
export const CastSessionBanner = () => {
  const session = useCastSession();
  const [amAdmin, setAmAdmin] = useState(isAdmin());
  useEffect(() => {
    // Re-check admin state whenever the storage event fires — covers login/
    // logout in adjacent tabs.
    const h = () => setAmAdmin(isAdmin());
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);
  const elapsedMin = useMemo(() => {
    if (!session?.started_at) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000));
  }, [session]);
  if (!amAdmin || !session) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="cast-session-banner"
      style={{
        position:"fixed",
        top: "0.75rem", right: "0.75rem",
        zIndex: 9998,
        background:"#DC2626", color:"#fff",
        padding:"0.5rem 0.9rem 0.5rem 0.75rem", borderRadius: 999,
        fontFamily:"Inter,sans-serif", fontSize:"0.82rem", fontWeight:600,
        boxShadow:"0 6px 16px rgba(220,38,38,0.4)",
        display:"flex", alignItems:"center", gap:"0.55rem",
        maxWidth:"90vw",
      }}
    >
      <span aria-hidden style={{fontSize:"0.7rem"}}>🔴</span>
      <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"50vw"}}>
        <strong>LIVE:</strong> {session.label}
      </span>
      <span style={{opacity:0.75,fontSize:"0.72rem"}}>· {elapsedMin} min</span>
      <button
        type="button"
        onClick={() => {
          const next = window.prompt("Rename this session:", session.label);
          if (next !== null) renameCastSession(next);
        }}
        aria-label="Rename cast session"
        data-testid="cast-session-rename"
        style={{
          background:"rgba(255,255,255,0.18)", color:"#fff",
          border:"none", borderRadius: 999,
          padding:"2px 8px", fontSize:"0.68rem", fontWeight:600,
          cursor:"pointer",
        }}
      >Rename</button>
      <button
        type="button"
        onClick={() => { if (window.confirm("End this cast session?")) endCastSession(); }}
        aria-label="End cast session"
        data-testid="cast-session-end"
        style={{
          background:"rgba(255,255,255,0.85)", color:"#7F1D1D",
          border:"none", borderRadius: 999,
          padding:"2px 8px", fontSize:"0.7rem", fontWeight:700,
          cursor:"pointer",
        }}
      >End</button>
    </div>
  );
};

// ── UI: "Start session" affordance rendered inside CastToDevice modal.
// Renders a form when no session is active; a status row + rename/end
// controls when one is. Admin-only — anonymous visitors see nothing.
export const CastSessionInlineControl = () => {
  const session = useCastSession();
  const [amAdmin, setAmAdmin] = useState(isAdmin());
  const [draft, setDraft] = useState("");
  useEffect(() => {
    const h = () => setAmAdmin(isAdmin());
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);
  if (!amAdmin) return null;
  if (session) {
    return (
      <div data-testid="cast-session-inline-active" style={{
        display:"flex", alignItems:"center", gap:"0.5rem",
        padding:"0.6rem 0.85rem", background:"#FEF2F2",
        border:"1px solid #FECACA", borderRadius: 8, marginBottom:"0.9rem",
        fontSize:"0.82rem",
      }}>
        <span aria-hidden>🔴</span>
        <span style={{flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
          Session: <strong>{session.label}</strong>
        </span>
        <button type="button"
          onClick={() => {
            const next = window.prompt("Rename this session:", session.label);
            if (next !== null) renameCastSession(next);
          }}
          style={_smallBtn}>Rename</button>
        <button type="button"
          onClick={() => { if (window.confirm("End this cast session?")) endCastSession(); }}
          style={{..._smallBtn, background:"#DC2626", color:"#fff", border:"none"}}>End</button>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { startCastSession(draft); setDraft(""); } }}
      data-testid="cast-session-inline-start"
      style={{
        display:"flex", gap:"0.4rem",
        padding:"0.6rem 0.75rem", background:"#F5F3FF",
        border:"1px dashed rgba(15,42,91,0.25)", borderRadius: 8, marginBottom:"0.9rem",
      }}
    >
      <span aria-hidden style={{fontSize:"1rem"}}>🎯</span>
      <input
        type="text"
        placeholder="Label this meeting — e.g. Smith Family Viewing"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={80}
        data-testid="cast-session-input"
        style={{
          flex:1, border:"none", outline:"none", background:"transparent",
          fontSize:"0.85rem", color:"var(--ink,#111827)",
        }}
      />
      <button type="submit" disabled={!draft.trim()} data-testid="cast-session-start"
        style={{
          background: draft.trim() ? "var(--brand-navy,#0F2A5B)" : "#9CA3AF",
          color:"#fff", border:"none", borderRadius: 6,
          padding:"0.3rem 0.8rem", fontSize:"0.78rem", fontWeight:600,
          cursor: draft.trim() ? "pointer" : "not-allowed",
        }}>Start</button>
    </form>
  );
};

const _smallBtn = {
  background:"#fff", border:"1px solid rgba(15,42,91,0.2)",
  borderRadius: 999, padding:"3px 10px", fontSize:"0.72rem",
  fontWeight: 600, cursor:"pointer",
};
