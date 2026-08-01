// Journey Platform UI — landing page + single-journey detail page.
// Reuses site design tokens (paper, section, container-x) and NEVER
// duplicates content — every module links out to existing pages.

import React from "react";
import { Link, useParams } from "react-router-dom";
import { JOURNEYS, JOURNEYS_ORDER, JOURNEY_COMPLIANCE_NOTICE } from "../journeys";
import { useJourneyProgress, getResumeJourney } from "../hooks/useJourneyProgress";

// ---- Shared compliance banner ----
const ComplianceBanner = () => (
  <div className="paper" data-testid="journey-compliance-banner" style={{background:"#FFF8E1",border:"1px solid rgba(253,184,19,0.35)",padding:"0.85rem 1.15rem",marginBottom:"1.5rem"}}>
    <div style={{fontSize:"0.75rem",textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--brand-navy)",fontWeight:700,marginBottom:"0.25rem"}}>Educational information only</div>
    <div style={{fontSize:"0.85rem",lineHeight:1.55,color:"var(--ink)"}}>{JOURNEY_COMPLIANCE_NOTICE}</div>
  </div>
);

// ---- Journey Landing (index of all 9 journeys + resume CTA) ----
export const JourneyLanding = () => {
  const resume = getResumeJourney();
  const resumeJourney = resume ? JOURNEYS[resume.slug] : null;

  return (
    <section className="section">
      <div className="container-x">
        <div className="eyebrow" style={{marginBottom:"0.75rem"}}>Interactive Real Estate Journey Platform</div>
        <h1 className="section-title" data-testid="journey-landing-h1">Begin Your Real Estate Journey</h1>
        <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7,maxWidth:"56rem",marginBottom:"2rem"}}>
          Explore educational resources that help you better understand different stages of buying, selling, owning, and researching residential real estate in British Columbia. Move at your own pace, jump between sections, and return whenever you like.
        </p>

        <ComplianceBanner/>

        {resume && resumeJourney && (
          <div className="paper" data-testid="journey-resume-card" style={{background:"#F5F0E1",padding:"1.5rem",marginBottom:"2rem",display:"flex",gap:"1.25rem",alignItems:"center",flexWrap:"wrap"}}>
            <div style={{fontSize:"2.5rem",flexShrink:0}}>{resumeJourney.icon}</div>
            <div style={{flex:"1 1 20rem",minWidth:0}}>
              <div style={{fontSize:"0.78rem",textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--muted)",fontWeight:700,marginBottom:"0.25rem"}}>Welcome back — continue your journey</div>
              <div style={{fontSize:"1.15rem",fontWeight:700,color:"var(--ink)"}}>{resumeJourney.title}</div>
              <div style={{fontSize:"0.9rem",color:"var(--muted)",marginTop:"0.15rem"}}>
                {(resume.modules_completed || []).length} module{(resume.modules_completed||[]).length===1?"":"s"} completed · Last visited {new Date(resume.last_visited_at).toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"})}
              </div>
            </div>
            <Link to={`/journey/${resume.slug}`} className="btn btn-primary" data-testid="journey-resume-continue">Continue journey →</Link>
          </div>
        )}

        <div className="grid-3" data-testid="journey-cards" style={{marginTop:"1rem"}}>
          {JOURNEYS_ORDER.map(slug => {
            const j = JOURNEYS[slug];
            return (
              <Link key={slug} to={`/journey/${slug}`} className="paper" data-testid={`journey-card-${slug}`}
                style={{padding:"1.5rem",textDecoration:"none",color:"inherit",display:"flex",flexDirection:"column",gap:"0.75rem",transition:"transform 0.15s, box-shadow 0.15s",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                <div style={{fontSize:"2.5rem",lineHeight:1}}>{j.icon}</div>
                <div style={{fontSize:"1.15rem",fontWeight:700,color:"var(--brand-navy)"}}>{j.title}</div>
                <div style={{fontSize:"0.9rem",color:"var(--muted)",lineHeight:1.55,flex:1}}>{j.short}</div>
                <div style={{fontSize:"0.85rem",color:"var(--brand-blue)",fontWeight:600,marginTop:"0.5rem"}}>Continue Journey →</div>
              </Link>
            );
          })}
        </div>

        <div style={{marginTop:"3rem",padding:"1.5rem",background:"var(--paper)",border:"1px solid rgba(15,42,91,0.08)",borderRadius:12}}>
          <div style={{fontSize:"0.85rem",fontWeight:700,marginBottom:"0.5rem"}}>Have a question along the way?</div>
          <div style={{fontSize:"0.9rem",color:"var(--muted)",lineHeight:1.6}}>Doogie AI is available on every page to help you understand a term or find related content. Doogie provides general educational information only.</div>
        </div>
      </div>
    </section>
  );
};

// ---- Single-Journey Detail Page ----
export const JourneyDetail = () => {
  const { slug } = useParams();
  const journey = JOURNEYS[slug];
  const { journey: progress, toggleModule, touchStage } = useJourneyProgress(slug);
  const completedSet = new Set(progress?.modules_completed || []);
  const totalModules = journey?.stages.reduce((n, s) => n + (s.modules||[]).length, 0) || 0;
  const completedCount = completedSet.size;
  const pct = totalModules ? Math.round((completedCount / totalModules) * 100) : 0;

  if (!journey) return (
    <section className="section"><div className="container-x">
      <h1 className="section-title">Journey not found</h1>
      <p>The journey you requested doesn't exist. <Link to="/journey">View all journeys</Link>.</p>
    </div></section>
  );

  return (
    <section className="section">
      <div className="container-x">
        <div style={{marginBottom:"1rem"}}><Link to="/journey" style={{color:"var(--brand-blue)",fontSize:"0.9rem",textDecoration:"none",fontFamily:"Inter,sans-serif"}}>← All journeys</Link></div>

        <div style={{display:"flex",gap:"1rem",alignItems:"flex-start",flexWrap:"wrap",marginBottom:"1rem"}}>
          <div style={{fontSize:"3rem",lineHeight:1}} aria-hidden>{journey.icon}</div>
          <div style={{flex:"1 1 30rem"}}>
            <div className="eyebrow" style={{marginBottom:"0.35rem"}}>Real Estate Journey</div>
            <h1 className="section-title" data-testid={`journey-detail-title-${slug}`} style={{marginBottom:"0.5rem"}}>{journey.title}</h1>
            <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.02rem",lineHeight:1.65,maxWidth:"46rem"}}>{journey.short}</p>
          </div>
        </div>

        {totalModules > 0 && (
          <div className="paper" data-testid="journey-progress-bar" style={{padding:"0.85rem 1rem",marginBottom:"1.5rem",background:"var(--paper)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"0.85rem",marginBottom:"0.4rem",fontFamily:"Inter,sans-serif"}}>
              <span style={{color:"var(--muted)",fontWeight:600}}>Your progress</span>
              <span style={{color:"var(--brand-navy)",fontWeight:700}}>{completedCount} of {totalModules} modules · {pct}%</span>
            </div>
            <div style={{background:"rgba(15,42,91,0.08)",height:8,borderRadius:99,overflow:"hidden"}}>
              <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,var(--brand-blue),var(--brand-green))",transition:"width 0.3s"}}/>
            </div>
          </div>
        )}

        <ComplianceBanner/>

        {journey.stages.map((stage, idx) => (
          <div key={stage.id} className="paper" data-testid={`journey-stage-${stage.id}`} style={{padding:"1.5rem",marginBottom:"1.25rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.65rem"}}>
              <div style={{background:"var(--brand-navy)",color:"#F5F0E1",width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.85rem",flexShrink:0}}>{idx+1}</div>
              <h2 style={{margin:0,fontSize:"1.35rem",color:"var(--brand-navy)"}}>Stage {idx+1} — {stage.title}</h2>
            </div>
            <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"0.95rem",lineHeight:1.65,marginBottom:"1rem"}}>{stage.description}</p>

            {stage.modules && stage.modules.length > 0 ? (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(18rem,1fr))",gap:"0.75rem"}}>
                {stage.modules.map(m => {
                  const key = `${stage.id}__${m.id}`;
                  const done = completedSet.has(key);
                  return (
                    <div key={m.id} data-testid={`journey-module-${slug}-${stage.id}-${m.id}`} style={{border:`1px solid ${done ? "var(--brand-green)" : "rgba(15,42,91,0.12)"}`,borderRadius:10,padding:"0.85rem 1rem",background: done ? "rgba(22,163,74,0.05)" : "white",display:"flex",flexDirection:"column",gap:"0.4rem",transition:"border-color 0.2s"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:"0.5rem"}}>
                        <button type="button" onClick={()=>{toggleModule(stage.id,m.id); touchStage(stage.id);}}
                          aria-label={done ? "Mark as not viewed" : "Mark as viewed"}
                          data-testid={`journey-toggle-${slug}-${stage.id}-${m.id}`}
                          style={{background:"none",border:`2px solid ${done ? "var(--brand-green)" : "rgba(15,42,91,0.25)"}`,cursor:"pointer",padding:0,width:20,height:20,borderRadius:4,flexShrink:0,marginTop:2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem",color:"var(--brand-green)",fontWeight:900}}>
                          {done ? "✓" : ""}
                        </button>
                        <div style={{fontWeight:700,color:"var(--ink)",fontSize:"0.95rem",flex:1}}>{m.title}</div>
                      </div>
                      <div style={{fontSize:"0.82rem",color:"var(--muted)",lineHeight:1.5}}>{m.blurb}</div>
                      <Link to={m.href} onClick={()=>touchStage(stage.id)} style={{fontSize:"0.82rem",color:"var(--brand-blue)",textDecoration:"none",fontWeight:600,marginTop:"0.15rem"}} data-testid={`journey-open-${slug}-${stage.id}-${m.id}`}>Open →</Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{fontSize:"0.85rem",color:"var(--muted)",fontStyle:"italic",padding:"0.75rem 0"}}>Additional modules for this stage are being prepared. In the meantime, use Doogie (bottom-right) to ask about any topic in this stage.</div>
            )}
          </div>
        ))}

        <div style={{marginTop:"2rem",padding:"1.5rem",background:"var(--paper)",border:"1px solid rgba(15,42,91,0.08)",borderRadius:12,textAlign:"center"}}>
          <div style={{fontSize:"1rem",fontWeight:700,marginBottom:"0.5rem",color:"var(--brand-navy)"}}>Have a question about any topic above?</div>
          <div style={{fontSize:"0.9rem",color:"var(--muted)",lineHeight:1.6,marginBottom:"0.85rem"}}>Open Doogie AI (bottom-right corner) for a general educational answer. Doogie never provides advice on a specific property or transaction.</div>
        </div>
      </div>
    </section>
  );
};
