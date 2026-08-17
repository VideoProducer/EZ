// Client-facing curated Journey page (private, token+OTP protected)
// -------------------------------------------------------------------
// URL: /my-journey/:token
// Flow:
//   1. Page loads → fetch /api/my-journey/:token/meta (public — client name, title)
//   2. Show OTP prompt (6-digit numeric)
//   3. On correct OTP → /api/my-journey/:token/verify returns session_key
//   4. session_key stored in sessionStorage — used to fetch curated content
//   5. Client sees curated stages, ticks module completion (server-side persist)
//
// Explicitly NOT indexed: noindex + nofollow meta tags.

import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { resolveStage, resolveModule, CLIENT_JOURNEY_COMPLIANCE_NOTICE } from "../journey_templates";
import { BuyingGuide, SellingGuide } from "./BuyerSellerGuide";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NoIndex = () => (
  <Helmet>
    <meta name="robots" content="noindex, nofollow, noarchive"/>
    <meta name="googlebot" content="noindex, nofollow"/>
  </Helmet>
);

const ComplianceBanner = () => (
  <div className="paper" data-testid="cj-compliance-banner" style={{background:"#FFF8E1",border:"1px solid rgba(253,184,19,0.35)",padding:"0.95rem 1.15rem",marginBottom:"1.5rem"}}>
    <div style={{fontSize:"0.75rem",textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--brand-navy)",fontWeight:700,marginBottom:"0.35rem"}}>Educational information only</div>
    <div style={{fontSize:"0.85rem",lineHeight:1.55,color:"var(--ink)"}}>{CLIENT_JOURNEY_COMPLIANCE_NOTICE}</div>
  </div>
);

const OtpPrompt = ({ token, meta, onVerified }) => {
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await axios.post(`${API}/my-journey/${token}/verify`, { otp: otp.trim() });
      sessionStorage.setItem(`cj-${token}`, r.data.session_key);
      onVerified(r.data.session_key);
    } catch (x) {
      setErr(x.response?.data?.detail || "Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="section">
      <NoIndex/>
      <div className="container-x" style={{maxWidth:"32rem",padding:"3rem 1.5rem"}}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:"1.4rem",fontWeight:800,letterSpacing:"-0.01em"}} data-testid="myjourney-wordmark"><span style={{color:"#0A3D99"}}>EZtoFind</span><span style={{color:"#F9BD00"}}>.ca</span></div>
          <div style={{fontSize:"0.9rem",fontWeight:600,color:"var(--brand-navy)",marginTop:"0.15rem"}}>Doug LeMaire, REALTOR®</div>
          <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"0.1rem",fontFamily:"Inter,sans-serif"}}>Fraser Property Management Realty Services Ltd.</div>
        </div>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div className="eyebrow" style={{marginBottom:"0.5rem"}}>Your personal journey plan</div>
          <h1 className="section-title" data-testid="cj-otp-title">Hi {meta?.client_first_name || "there"} 👋</h1>
          <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1rem",lineHeight:1.6}}>Enter the 6-digit access code Doug sent you by email to open <strong>{meta?.title || "your journey plan"}</strong>.</p>
        </div>
        <form onSubmit={submit} className="paper" style={{padding:"1.75rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
          <label style={{fontSize:"0.82rem",fontWeight:600,color:"var(--brand-navy)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Access code</label>
          <input
            data-testid="cj-otp-input"
            inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
            value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))}
            placeholder="000000" autoFocus
            style={{padding:"1rem",fontSize:"1.5rem",textAlign:"center",letterSpacing:"0.5rem",fontFamily:"monospace",border:"2px solid rgba(15,42,91,0.15)",borderRadius:10,fontWeight:800}}/>
          {err && <div style={{color:"#DC2626",fontSize:"0.88rem",fontFamily:"Inter,sans-serif"}} data-testid="cj-otp-error">{err}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading || otp.length !== 6} data-testid="cj-otp-submit" style={{fontSize:"1rem",padding:"0.85rem"}}>
            {loading ? "Verifying…" : "Open my journey →"}
          </button>
          <div style={{fontSize:"0.78rem",color:"var(--muted)",lineHeight:1.55,fontFamily:"Inter,sans-serif",textAlign:"center",marginTop:"0.5rem"}}>
            Didn't get the code, or code expired? Reply to Doug's email or call +1-604-466-7021.
          </div>
        </form>
      </div>
    </section>
  );
};

const CuratedView = ({ token, sessionKey, data, onReload, onLogout }) => {
  const [journey, setJourney] = useState(data);
  const completedSet = new Set(journey.modules_completed || []);
  const totalModules = (journey.stages || []).reduce((n, s) => n + (s.modules || []).length, 0);
  const pct = totalModules ? Math.round(completedSet.size / totalModules * 100) : 0;

  const toggle = async (stage_id, module_id) => {
    try {
      const r = await axios.post(`${API}/my-journey/${token}/toggle`, { session_key: sessionKey, stage_id, module_id });
      setJourney({ ...journey, modules_completed: r.data.modules_completed });
    } catch (e) {
      if (e.response?.status === 401) onLogout();
    }
  };

  const touchStage = useCallback(async (stage_id) => {
    try {
      await axios.post(`${API}/my-journey/${token}/touch-stage`, { session_key: sessionKey, stage_id });
    } catch {}
  }, [token, sessionKey]);

  return (
    <section className="section">
      <NoIndex/>
      <div className="container-x">
        <div style={{marginBottom:"0.75rem",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem",fontFamily:"Inter,sans-serif",fontSize:"0.85rem"}}>
          <div style={{color:"var(--muted)"}}>Prepared for <strong style={{color:"var(--brand-navy)"}}>{journey.client_first_name}</strong> · expires {journey.expires_at?.slice(0,10)}</div>
          <button onClick={onLogout} data-testid="cj-logout" style={{background:"none",border:"none",color:"var(--brand-blue)",cursor:"pointer",fontWeight:600,fontSize:"0.85rem"}}>Sign out</button>
        </div>

        <div className="eyebrow">Your real estate journey</div>
        <h1 className="section-title" data-testid="cj-title" style={{marginBottom:"1rem"}}>{journey.title}</h1>

        {journey.intro_message && (
          <div className="paper" data-testid="cj-intro" style={{padding:"1.25rem",background:"#F5F0E1",marginBottom:"1.5rem",fontFamily:"Inter,sans-serif",fontSize:"0.95rem",lineHeight:1.65,whiteSpace:"pre-line"}}>
            {journey.intro_message}
          </div>
        )}

        {totalModules > 0 && (
          <div className="paper" data-testid="cj-progress" style={{padding:"0.85rem 1rem",marginBottom:"1.5rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.85rem",marginBottom:"0.4rem",fontFamily:"Inter,sans-serif"}}>
              <span style={{color:"var(--muted)",fontWeight:600}}>Your progress</span>
              <span style={{color:"var(--brand-navy)",fontWeight:700}}>{completedSet.size} of {totalModules} · {pct}%</span>
            </div>
            <div style={{background:"rgba(15,42,91,0.08)",height:8,borderRadius:99,overflow:"hidden"}}>
              <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,var(--brand-blue),var(--brand-green))",transition:"width 0.3s"}}/>
            </div>
          </div>
        )}

        <ComplianceBanner/>

        {(journey.stages || []).length === 0 && <p style={{color:"var(--muted)"}}>Doug hasn't added any stages yet. Please check back later.</p>}

        {(journey.stages || []).map((cjStage, idx) => {
          const template = resolveStage(cjStage.id);
          const stageTitle = cjStage.title_override || template?.title || cjStage.id;
          const stageDesc  = template?.description || "";
          return (
            <div key={cjStage.id} id={cjStage.id} data-testid={`cj-stage-${cjStage.id}`} className="paper" style={{padding:"1.5rem",marginBottom:"1.25rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.65rem"}}>
                <div style={{background:"var(--brand-navy)",color:"#F5F0E1",width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.85rem",flexShrink:0}}>{idx+1}</div>
                <h2 style={{margin:0,fontSize:"1.35rem",color:"var(--brand-navy)"}}>{stageTitle}</h2>
              </div>
              {stageDesc && <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"0.95rem",lineHeight:1.65,marginBottom:"0.75rem"}}>{stageDesc}</p>}
              {cjStage.note && (
                <div style={{background:"#EDF3FF",padding:"0.75rem 1rem",borderRadius:8,marginBottom:"1rem",fontSize:"0.9rem",fontFamily:"Inter,sans-serif",lineHeight:1.55,borderLeft:"3px solid var(--brand-blue)"}}>
                  <strong>Note from Doug:</strong> {cjStage.note}
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(18rem,1fr))",gap:"0.75rem"}}>
                {(cjStage.modules || []).map(cjMod => {
                  const resolved = resolveModule(cjStage.id, cjMod.module_id);
                  const t = resolved?.module;
                  const key = `${cjStage.id}__${cjMod.module_id}`;
                  const done = completedSet.has(key);
                  return (
                    <div key={cjMod.module_id} data-testid={`cj-mod-${cjStage.id}-${cjMod.module_id}`}
                      style={{border:`1px solid ${done ? "var(--brand-green)" : "rgba(15,42,91,0.12)"}`,borderRadius:10,padding:"0.85rem 1rem",background: done ? "rgba(22,163,74,0.05)" : "white",display:"flex",flexDirection:"column",gap:"0.4rem"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:"0.5rem"}}>
                        <button type="button"
                          onClick={()=>toggle(cjStage.id, cjMod.module_id)}
                          aria-pressed={done}
                          aria-label={done ? "Mark as not viewed" : "Mark as viewed"}
                          data-testid={`cj-toggle-${cjStage.id}-${cjMod.module_id}`}
                          style={{background:"none",border:`2px solid ${done ? "var(--brand-green)" : "rgba(15,42,91,0.25)"}`,cursor:"pointer",padding:0,width:20,height:20,borderRadius:4,flexShrink:0,marginTop:2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem",color:"var(--brand-green)",fontWeight:900}}>
                          {done ? "✓" : ""}
                        </button>
                        <div style={{fontWeight:700,color:"var(--ink)",fontSize:"0.95rem",flex:1}}>{t?.title || cjMod.module_id}</div>
                      </div>
                      <div style={{fontSize:"0.82rem",color:"var(--muted)",lineHeight:1.5}}>{t?.blurb || ""}</div>
                      {cjMod.note_override && <div style={{fontSize:"0.82rem",background:"#FFF8E1",padding:"0.4rem 0.55rem",borderRadius:4,lineHeight:1.5,borderLeft:"3px solid #F59E0B"}}><strong>Doug:</strong> {cjMod.note_override}</div>}
                      {t?.href && <Link to={t.href} onClick={()=>touchStage(cjStage.id)} target="_blank" rel="noopener" data-testid={`cj-open-${cjStage.id}-${cjMod.module_id}`} style={{fontSize:"0.82rem",color:"var(--brand-blue)",textDecoration:"none",fontWeight:600,marginTop:"0.15rem"}}>Open →</Link>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="paper" style={{padding:"1.25rem",marginTop:"1.5rem",textAlign:"center"}}>
          <div style={{fontSize:"0.85rem",color:"var(--muted)",lineHeight:1.6,fontFamily:"Inter,sans-serif"}}>
            Questions along the way? Reply to Doug's email or call +1-604-466-7021. This plan is private to you — please don't share the link.
          </div>
        </div>

        {/* --------------------------------------------------------------
            Playbook — the full BC Buyer's or Seller's Guide, rendered
            inline under the client's curated journey. This is what used
            to live at /buying-guide and /selling-guide. It now lives ONLY
            inside the token-gated Client Journey so only authenticated
            clients can read it.
            -------------------------------------------------------------- */}
        {(journey.base_journey_slug === "buying" || journey.base_journey_slug === "selling") && (
          <div id="playbook" data-testid="cj-playbook" style={{marginTop:"3rem",paddingTop:"2.5rem",borderTop:"3px solid rgba(15,42,91,0.12)"}}>
            <div className="eyebrow" style={{textAlign:"center"}}>The Playbook — private to you</div>
            <h2 className="section-title" style={{textAlign:"center",marginBottom:"0.5rem"}}>
              {journey.base_journey_slug === "buying" ? "The BC Buyer's Guide" : "The BC Seller's Guide"}
            </h2>
            <p style={{textAlign:"center",fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"0.95rem",maxWidth:"38rem",margin:"0 auto 2rem",lineHeight:1.65}}>
              The complete step-by-step playbook for your side of the transaction. Read it end-to-end, or dip into the section that matches where you are today.
            </p>
            {journey.base_journey_slug === "buying" ? <BuyingGuide/> : <SellingGuide/>}
          </div>
        )}
      </div>
    </section>
  );
};

export default function MyJourney() {
  const { token } = useParams();
  const [meta, setMeta] = useState(null);
  const [data, setData] = useState(null);
  const [sessionKey, setSessionKey] = useState(() => sessionStorage.getItem(`cj-${token}`));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMeta = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/my-journey/${token}/meta`);
      setMeta(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Journey not found or link expired.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadContent = useCallback(async (sk) => {
    try {
      const r = await axios.get(`${API}/my-journey/${token}?session_key=${encodeURIComponent(sk)}`);
      setData(r.data);
    } catch (e) {
      if (e.response?.status === 401) {
        sessionStorage.removeItem(`cj-${token}`);
        setSessionKey(null);
      } else {
        setError(e.response?.data?.detail || "Unable to load your journey.");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { if (sessionKey) loadContent(sessionKey); }, [sessionKey, loadContent]);

  const onVerified = (sk) => { setSessionKey(sk); };
  const onLogout = () => { sessionStorage.removeItem(`cj-${token}`); setSessionKey(null); setData(null); };

  if (loading) return <section className="section"><NoIndex/><div className="container-x"><p>Loading your journey…</p></div></section>;
  if (error) return <section className="section"><NoIndex/><div className="container-x" style={{maxWidth:"32rem",padding:"3rem 1.5rem",textAlign:"center"}}>
    <h1 className="section-title">This link isn't active</h1>
    <p style={{color:"var(--muted)",fontFamily:"Inter,sans-serif",fontSize:"1rem",lineHeight:1.6}}>{error}</p>
    <p style={{color:"var(--muted)",fontFamily:"Inter,sans-serif",fontSize:"0.9rem"}}>Please contact Doug LeMaire at <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a> or +1-604-466-7021 for a new invitation.</p>
  </div></section>;
  if (!sessionKey || !data) return <OtpPrompt token={token} meta={meta} onVerified={onVerified}/>;
  return <CuratedView token={token} sessionKey={sessionKey} data={data} onReload={()=>loadContent(sessionKey)} onLogout={onLogout}/>;
}
