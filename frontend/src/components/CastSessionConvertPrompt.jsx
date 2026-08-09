// CastSessionConvertPrompt
// -----------------------------------------------------------------------------
// After Doug ends a Cast Session, this modal auto-appears with a one-click
// "Convert to CRM Client" flow. It:
//   • fetches the just-closed session from the /admin/cast-sessions endpoint
//     so it can show the exact listings that were cast (source of truth is
//     the backend, not the frontend's local snapshot)
//   • prefills the client name from the session label, stripping trailing
//     "Viewing / Meeting / Session" fluff
//   • lets Doug uncheck any listing that shouldn't be attached
//   • POSTs to /api/admin/cast-sessions/{id}/convert-to-client which seeds
//     a new CRM Client with the session context saved in `notes` + `tags`
//   • CASL-safely leaves email_consent OFF — Doug still has to capture
//     express consent in the normal Add Client flow before any email

import React, { useEffect, useMemo, useState } from "react";
import {
  useCastSession,
  readPendingCastSession,
  clearPendingCastSession,
  isAdmin,
  CAST_SESSION_EVENT,
} from "../lib/castSession";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CastSessionConvertPrompt = () => {
  const activeSession = useCastSession();
  const [pending, setPending] = useState(() => readPendingCastSession());
  const [amAdmin, setAmAdmin] = useState(isAdmin());
  const [sessionMeta, setSessionMeta] = useState(null);        // fetched from backend
  const [loadErr, setLoadErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);                  // {ok, client_id, full_name, listings_attached}

  // Form state (initialised after sessionMeta lands).
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clientType, setClientType] = useState("buyer");
  const [checked, setChecked] = useState({});
  const [extraNotes, setExtraNotes] = useState("");

  // Re-render when session storage changes (End button, adjacent tabs).
  useEffect(() => {
    const h = () => setPending(readPendingCastSession());
    const h2 = () => setAmAdmin(isAdmin());
    window.addEventListener(CAST_SESSION_EVENT, h);
    window.addEventListener("storage", h);
    window.addEventListener("storage", h2);
    return () => {
      window.removeEventListener(CAST_SESSION_EVENT, h);
      window.removeEventListener("storage", h);
      window.removeEventListener("storage", h2);
    };
  }, []);

  // Fetch the session's listings from the backend once we know a pending
  // conversion exists. We look 30 days back — a meeting Doug's converting
  // wouldn't be older than that.
  useEffect(() => {
    if (!pending?.session_id || !amAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadErr("");
        const marker = localStorage.getItem("ez_admin_session");
        // The admin marker in localStorage stores the JWT under `.token` in
        // some builds and directly as a string in older ones — handle both.
        let token = "";
        try {
          const parsed = JSON.parse(marker);
          token = parsed?.token || parsed || "";
        } catch { token = marker || ""; }
        if (!token) { setLoadErr("Admin session expired — sign in again."); return; }

        const res = await fetch(`${API}/admin/cast-sessions?days=30`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`fetch failed (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        const match = (data.sessions || []).find(s => s.session_id === pending.session_id);
        if (!match) {
          setLoadErr("Backend hasn't received the session events yet — try again in a moment, or dismiss.");
          return;
        }
        if (match.converted_to_client_id) {
          // Already converted (e.g. Doug clicked twice). Clear so we don't
          // block the UI with a re-prompt.
          clearPendingCastSession();
          setPending(null);
          return;
        }
        setSessionMeta(match);
        // Prefill form values from the session's label + listings.
        const defaultName = (match.label || "").replace(/\s*(viewing|meeting|session|showing|tour)\s*$/i, "").trim() || match.label;
        setFullName(defaultName);
        const initial = {};
        for (const l of match.listings) {
          if (!l.is_search) initial[l.listing_key] = true;
        }
        setChecked(initial);
      } catch (e) {
        if (!cancelled) setLoadErr(String(e.message || e).slice(0, 200));
      }
    })();
    return () => { cancelled = true; };
  }, [pending?.session_id, amAdmin]);

  const listingsForDisplay = useMemo(() =>
    (sessionMeta?.listings || []).filter(l => !l.is_search),
    [sessionMeta]
  );

  // Nothing to render when there's no admin, no pending, or the user
  // opens a NEW session before dealing with the pending one.
  if (!amAdmin || !pending || activeSession) return null;

  const dismiss = () => {
    clearPendingCastSession();
    setPending(null);
    setSessionMeta(null);
    setResult(null);
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!fullName.trim()) return;
    setSubmitting(true);
    try {
      const marker = localStorage.getItem("ez_admin_session");
      let token = "";
      try { const p = JSON.parse(marker); token = p?.token || p || ""; }
      catch { token = marker || ""; }

      const keep_listings = Object.entries(checked).filter(([, v]) => v).map(([k]) => k);
      const res = await fetch(`${API}/admin/cast-sessions/${encodeURIComponent(pending.session_id)}/convert-to-client`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          client_type: clientType,
          keep_listings,
          extra_notes: extraNotes.trim(),
        }),
      });
      if (!res.ok) throw new Error(`convert failed (${res.status})`);
      const data = await res.json();
      setResult(data);
      // Success state stays on-screen for 3 s, then auto-dismisses.
      setTimeout(dismiss, 3500);
    } catch (e) {
      setLoadErr(String(e.message || e).slice(0, 200));
    } finally { setSubmitting(false); }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cast-convert-title"
      data-testid="cast-convert-modal"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      style={{
        position:"fixed", inset:0, zIndex:9997,
        background:"rgba(15,42,91,0.55)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"1rem",
      }}
    >
      <div style={{
        background:"#fff", borderRadius:16, maxWidth:600, width:"100%",
        padding:"1.5rem", boxShadow:"0 20px 60px rgba(15,42,91,0.35)",
        maxHeight:"90vh", overflowY:"auto",
        fontFamily:"Inter,sans-serif",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.75rem"}}>
          <div>
            <div style={{fontSize:"0.7rem",letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--brand-gold,#C89B3C)",fontWeight:800}}>Cast Session Ended</div>
            <h2 id="cast-convert-title" style={{margin:"0.25rem 0 0",fontFamily:"Sora,sans-serif",color:"var(--brand-navy,#0F2A5B)",fontSize:"1.35rem"}}>
              Convert &ldquo;{pending.label}&rdquo; to CRM Client?
            </h2>
            <p style={{margin:"0.35rem 0 0",color:"#6B7280",fontSize:"0.83rem"}}>
              The listings you cast during this meeting will be attached to the client's notes and tagged for follow-up. Email consent stays OFF until you capture it in the normal Add Client flow.
            </p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Dismiss" data-testid="cast-convert-close"
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:"1.5rem",color:"#6B7280",lineHeight:1,padding:"0.25rem 0.5rem"}}>×</button>
        </div>

        {loadErr && <div style={{background:"#FEE2E2",color:"#B91C1C",padding:"0.6rem 0.9rem",borderRadius:8,fontSize:"0.83rem",marginBottom:"0.75rem"}}>{loadErr}</div>}

        {result?.ok ? (
          <div data-testid="cast-convert-success" style={{background:"#DCFCE7",color:"#166534",padding:"1rem 1.1rem",borderRadius:10,fontSize:"0.9rem"}}>
            ✅ <strong>{result.full_name}</strong> added to CRM Clients — {result.listings_attached} listing{result.listings_attached===1?"":"s"} attached. Auto-closing…
          </div>
        ) : !sessionMeta ? (
          <div style={{padding:"1rem",color:"#6B7280",fontSize:"0.85rem"}}>Loading session…</div>
        ) : (
          <form onSubmit={submit}>
            {/* Client basics */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
              <label style={{display:"block"}}>
                <span style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"#374151",marginBottom:3}}>Client name *</span>
                <input required value={fullName} onChange={e=>setFullName(e.target.value)} maxLength={80}
                       data-testid="cast-convert-name"
                       style={_input}/>
              </label>
              <label style={{display:"block"}}>
                <span style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"#374151",marginBottom:3}}>Client type</span>
                <select value={clientType} onChange={e=>setClientType(e.target.value)}
                        data-testid="cast-convert-type" style={_input}>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="past">Past client</option>
                  <option value="sphere">Sphere</option>
                </select>
              </label>
              <label style={{display:"block"}}>
                <span style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"#374151",marginBottom:3}}>Email <span style={{color:"#9CA3AF",fontWeight:400}}>(optional)</span></span>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={_input}/>
              </label>
              <label style={{display:"block"}}>
                <span style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"#374151",marginBottom:3}}>Phone <span style={{color:"#9CA3AF",fontWeight:400}}>(optional)</span></span>
                <input value={phone} onChange={e=>setPhone(e.target.value)} style={_input}/>
              </label>
            </div>

            {/* Attach listings */}
            {listingsForDisplay.length > 0 && (
              <div style={{marginBottom:"0.9rem"}}>
                <div style={{fontSize:"0.72rem",fontWeight:700,color:"#374151",marginBottom:5}}>
                  Attach listings from this meeting ({listingsForDisplay.length})
                </div>
                <div style={{border:"1px solid #E5E7EB",borderRadius:8,maxHeight:180,overflowY:"auto"}}>
                  {listingsForDisplay.map(l => (
                    <label key={l.listing_key}
                           data-testid={`cast-convert-listing-${l.listing_key}`}
                           style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"7px 10px",borderBottom:"1px solid #F3F4F6",fontSize:"0.83rem",cursor:"pointer"}}>
                      <input type="checkbox"
                             checked={!!checked[l.listing_key]}
                             onChange={e => setChecked(c => ({...c, [l.listing_key]: e.target.checked}))}/>
                      <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        <strong>{l.street_address || `MLS® #${l.mls_number || l.listing_key}`}</strong>
                        <span style={{color:"#6B7280"}}> · {l.city || "—"}
                          {l.list_price ? ` · $${l.list_price.toLocaleString("en-CA")}` : ""}
                        </span>
                      </span>
                      <span style={{fontSize:11,color:"#6B7280"}}>
                        👀{l.opens} 🎥{l.present}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label style={{display:"block",marginBottom:"1rem"}}>
              <span style={{display:"block",fontSize:"0.72rem",fontWeight:700,color:"#374151",marginBottom:3}}>Follow-up notes <span style={{color:"#9CA3AF",fontWeight:400}}>(optional — added to client's notes)</span></span>
              <textarea value={extraNotes} onChange={e=>setExtraNotes(e.target.value)} rows={2}
                        placeholder="Family wants 3-bed east-facing, budget $1.2M, financing pre-approved…"
                        style={{..._input, minHeight:60, resize:"vertical"}}/>
            </label>

            <div style={{display:"flex",gap:"0.6rem",justifyContent:"flex-end"}}>
              <button type="button" onClick={dismiss}
                      data-testid="cast-convert-skip"
                      style={{background:"#fff",color:"#374151",border:"1px solid #D1D5DB",borderRadius:8,padding:"0.55rem 1rem",fontSize:"0.85rem",fontWeight:600,cursor:"pointer"}}>
                Skip
              </button>
              <button type="submit" disabled={submitting || !fullName.trim()}
                      data-testid="cast-convert-submit"
                      style={{background:submitting?"#94A3B8":"var(--brand-navy,#0F2A5B)",color:"#fff",border:"none",borderRadius:8,padding:"0.55rem 1.2rem",fontSize:"0.9rem",fontWeight:700,cursor:submitting?"progress":"pointer"}}>
                {submitting ? "Adding…" : "➕ Add to CRM"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const _input = {
  width:"100%", boxSizing:"border-box",
  padding:"0.5rem 0.7rem",
  border:"1px solid #D1D5DB", borderRadius:8,
  fontSize:"0.88rem", fontFamily:"inherit",
  background:"#fff",
};

export default CastSessionConvertPrompt;
