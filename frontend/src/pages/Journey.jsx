// Journey Platform UI — landing page + single-journey detail page.
// Phase 4 polish included:
//  - HowTo JSON-LD schema on every journey (LLM/SEO citation)
//  - Share button (native Web Share API + clipboard fallback)
//  - Print-friendly styling via @media print in App.css
//  - Bookmarked / in-progress badges on cards

import React from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { JOURNEYS, JOURNEYS_ORDER, JOURNEY_COMPLIANCE_NOTICE } from "../journeys";
import { useJourneyProgress, getResumeJourney } from "../hooks/useJourneyProgress";

// ---- Shared compliance banner ----
const ComplianceBanner = () => (
  <div className="paper journey-banner" data-testid="journey-compliance-banner" style={{background:"#FFF8E1",border:"1px solid rgba(253,184,19,0.35)",padding:"0.95rem 1.15rem",marginBottom:"1.5rem"}}>
    <div style={{fontSize:"0.75rem",textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--brand-navy)",fontWeight:700,marginBottom:"0.35rem"}}>Educational information only</div>
    <div style={{fontSize:"0.85rem",lineHeight:1.55,color:"var(--ink)",marginBottom:"0.5rem"}}>{JOURNEY_COMPLIANCE_NOTICE}</div>
    <div style={{fontSize:"0.8rem",lineHeight:1.55,color:"var(--ink)",paddingTop:"0.5rem",borderTop:"1px dashed rgba(15,42,91,0.15)"}}>
      <strong>Scope of licence:</strong> Doug LeMaire is a licensed BC REALTOR® regulated by BCFSA. He is not a mortgage broker (regulated separately under the Mortgage Brokers Act), a lawyer or notary, a tax accountant, or a licensed insurance broker. Content on those topics is general educational information — always consult the licensed professional in that domain.
    </div>
  </div>
);

// ---- Share button — Web Share API + clipboard fallback ----
const ShareButton = ({ title, path }) => {
  const [copied, setCopied] = React.useState(false);
  const share = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : `https://eztofind.ca${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch { /* user dismissed — fall through to clipboard */ }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <button type="button" onClick={share} data-testid="journey-share-btn"
      style={{background:"var(--paper)",border:"1px solid rgba(15,42,91,0.18)",padding:"0.45rem 0.85rem",borderRadius:99,fontFamily:"Inter,sans-serif",fontSize:"0.82rem",fontWeight:600,cursor:"pointer",color:"var(--brand-navy)",display:"inline-flex",alignItems:"center",gap:"0.35rem"}}>
      <span aria-hidden>↗</span> {copied ? "Link copied" : "Share"}
    </button>
  );
};

// ---- Print button ----
const PrintButton = () => (
  <button type="button" onClick={() => window.print()} data-testid="journey-print-btn"
    style={{background:"var(--paper)",border:"1px solid rgba(15,42,91,0.18)",padding:"0.45rem 0.85rem",borderRadius:99,fontFamily:"Inter,sans-serif",fontSize:"0.82rem",fontWeight:600,cursor:"pointer",color:"var(--brand-navy)",display:"inline-flex",alignItems:"center",gap:"0.35rem"}}>
    <span aria-hidden>⎙</span> Print
  </button>
);

// ---- Card progress badge ----
const cardProgress = (allProgress, slug, journey) => {
  const p = allProgress?.[slug];
  if (!p) return null;
  const total = journey.stages.reduce((n, s) => n + (s.modules || []).length, 0);
  const done = (p.modules_completed || []).length;
  if (!total) return null;
  return { done, total, pct: Math.round((done / total) * 100) };
};

// ---- Journey Landing (index of all 9 journeys + resume CTA) ----
export const JourneyLanding = () => {
  const resume = getResumeJourney();
  const resumeJourney = resume ? JOURNEYS[resume.slug] : null;
  const { allProgress } = useJourneyProgress(null);

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

        <div className="grid-3 journey-cards" data-testid="journey-cards" style={{marginTop:"1rem"}}>
          {JOURNEYS_ORDER.map(slug => {
            const j = JOURNEYS[slug];
            const p = cardProgress(allProgress, slug, j);
            return (
              <Link key={slug} to={`/journey/${slug}`} className="paper" data-testid={`journey-card-${slug}`}
                style={{padding:"1.5rem",textDecoration:"none",color:"inherit",display:"flex",flexDirection:"column",gap:"0.75rem",transition:"transform 0.15s, box-shadow 0.15s",cursor:"pointer",position:"relative"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                <div style={{fontSize:"2.5rem",lineHeight:1}}>{j.icon}</div>
                <div style={{fontSize:"1.15rem",fontWeight:700,color:"var(--brand-navy)"}}>{j.title}</div>
                <div style={{fontSize:"0.9rem",color:"var(--muted)",lineHeight:1.55,flex:1}}>{j.short}</div>
                {p && (
                  <div data-testid={`journey-card-progress-${slug}`} style={{marginTop:"0.5rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.72rem",color:"var(--muted)",marginBottom:"0.2rem",fontFamily:"Inter,sans-serif",fontWeight:600}}>
                      <span>{p.done}/{p.total} modules</span><span>{p.pct}%</span>
                    </div>
                    <div style={{background:"rgba(15,42,91,0.08)",height:5,borderRadius:99,overflow:"hidden"}}>
                      <div style={{width:`${p.pct}%`,height:"100%",background:"linear-gradient(90deg,var(--brand-blue),var(--brand-green))"}}/>
                    </div>
                  </div>
                )}
                <div style={{fontSize:"0.85rem",color:"var(--brand-blue)",fontWeight:600,marginTop:"0.5rem"}}>
                  {p && p.done > 0 ? "Continue Journey →" : "Begin Journey →"}
                </div>
              </Link>
            );
          })}
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

  // AEO — HowTo JSON-LD schema. LLMs and Google Featured Snippets extract
  // process-guide content most reliably when marked up as HowTo. This is
  // the single largest AEO win on the Journey Platform.
  const canonicalPath = `/journey/${slug}`;
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": `How to navigate the ${journey.title} process in British Columbia`,
    "description": journey.short,
    "totalTime": "P90D",
    "inLanguage": "en-CA",
    "publisher": { "@type": "Organization", "name": "EZtoFind.ca", "url": "https://eztofind.ca" },
    "author": { "@type": "Person", "name": "Doug LeMaire, REALTOR®", "url": "https://eztofind.ca/about" },
    "about": { "@type": "Place", "name": "British Columbia, Canada" },
    "step": journey.stages.map((s, idx) => ({
      "@type": "HowToStep",
      "position": idx + 1,
      "name": s.title,
      "text": s.description,
      "url": `https://eztofind.ca/journey/${slug}#${s.id}`,
      "itemListElement": (s.modules || []).map((m, mi) => ({
        "@type": "HowToDirection",
        "position": mi + 1,
        "text": `${m.title} — ${m.blurb}`,
      })),
    })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://eztofind.ca/" },
      { "@type": "ListItem", "position": 2, "name": "Journey", "item": "https://eztofind.ca/journey" },
      { "@type": "ListItem", "position": 3, "name": journey.title, "item": `https://eztofind.ca${canonicalPath}` },
    ],
  };

  return (
    <section className="section journey-detail">
      <Helmet>
        <title>{`How to ${journey.title.toLowerCase()} in British Columbia — 7-stage educational journey | EZtoFind.ca`}</title>
        <meta name="description" content={journey.short}/>
        <link rel="canonical" href={`https://eztofind.ca${canonicalPath}`}/>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>
      <div className="container-x">
        <div className="journey-toolbar" style={{marginBottom:"1rem",display:"flex",justifyContent:"space-between",gap:"0.5rem",flexWrap:"wrap",alignItems:"center"}}>
          <Link to="/journey" style={{color:"var(--brand-blue)",fontSize:"0.9rem",textDecoration:"none",fontFamily:"Inter,sans-serif"}}>← All journeys</Link>
          <div style={{display:"flex",gap:"0.5rem"}}>
            <ShareButton title={`${journey.title} — EZtoFind.ca`} path={canonicalPath}/>
            <PrintButton/>
          </div>
        </div>

        <div style={{display:"flex",gap:"1rem",alignItems:"flex-start",flexWrap:"wrap",marginBottom:"1rem"}}>
          <div style={{fontSize:"3rem",lineHeight:1}} aria-hidden>{journey.icon}</div>
          <div style={{flex:"1 1 30rem"}}>
            <div className="eyebrow" style={{marginBottom:"0.35rem"}}>Real Estate Journey</div>
            <h1 className="section-title" data-testid={`journey-detail-title-${slug}`} style={{marginBottom:"0.5rem"}}>{journey.title}</h1>
            <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.02rem",lineHeight:1.65,maxWidth:"46rem"}}>{journey.short}</p>
          </div>
        </div>

        {totalModules > 0 && (
          <div className="paper journey-progress" data-testid="journey-progress-bar" style={{padding:"0.85rem 1rem",marginBottom:"1.5rem",background:"var(--paper)"}}>
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
          <div id={stage.id} key={stage.id} className="paper journey-stage" data-testid={`journey-stage-${stage.id}`} style={{padding:"1.5rem",marginBottom:"1.25rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.65rem"}}>
              <div style={{background:"var(--brand-navy)",color:"#F5F0E1",width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.85rem",flexShrink:0}}>{idx+1}</div>
              <h2 style={{margin:0,fontSize:"1.35rem",color:"var(--brand-navy)"}}>Stage {idx+1} — {stage.title}</h2>
            </div>
            <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"0.95rem",lineHeight:1.65,marginBottom:"1rem"}}>{stage.description}</p>

            {stage.modules && stage.modules.length > 0 ? (
              <div className="journey-module-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(18rem,1fr))",gap:"0.75rem"}}>
                {stage.modules.map(m => {
                  const key = `${stage.id}__${m.id}`;
                  const done = completedSet.has(key);
                  return (
                    <div key={m.id} className="journey-module-card" data-testid={`journey-module-${slug}-${stage.id}-${m.id}`} style={{border:`1px solid ${done ? "var(--brand-green)" : "rgba(15,42,91,0.12)"}`,borderRadius:10,padding:"0.85rem 1rem",background: done ? "rgba(22,163,74,0.05)" : "white",display:"flex",flexDirection:"column",gap:"0.4rem",transition:"border-color 0.2s"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:"0.5rem"}}>
                        <button type="button" onClick={()=>toggleModule(stage.id,m.id)}
                          aria-label={done ? "Mark as not viewed" : "Mark as viewed"}
                          aria-pressed={done}
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

        {/* Related journeys — internal linking for AEO */}
        <div className="paper journey-related" data-testid="journey-related" style={{padding:"1.5rem",marginTop:"1.5rem"}}>
          <h2 style={{fontSize:"1.15rem",color:"var(--brand-navy)",marginTop:0,marginBottom:"0.75rem"}}>Related journeys you may wish to explore</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(15rem,1fr))",gap:"0.5rem"}}>
            {JOURNEYS_ORDER.filter(s => s !== slug).slice(0, 4).map(s => (
              <Link key={s} to={`/journey/${s}`} data-testid={`journey-related-${s}`}
                style={{padding:"0.65rem 0.85rem",border:"1px solid rgba(15,42,91,0.12)",borderRadius:8,textDecoration:"none",display:"flex",alignItems:"center",gap:"0.5rem",background:"white"}}>
                <span aria-hidden style={{fontSize:"1.25rem"}}>{JOURNEYS[s].icon}</span>
                <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.9rem",fontWeight:600,color:"var(--brand-navy)"}}>{JOURNEYS[s].title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
