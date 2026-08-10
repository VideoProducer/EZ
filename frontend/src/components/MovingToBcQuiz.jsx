// Moving to BC — Community Match Quiz (interactive lead-magnet mockup).
//
// 5-question quiz that scores 239 BC communities against out-of-province
// buyer preferences (schools, commute, climate, budget, lifestyle) and
// produces a personalized top-3 community match. Ends with a CASL-compliant
// email capture. Communities outside Doug's direct service area convert
// into referral-fee leads — see "referral-request" flow.
//
// This is a UI-only mockup — no backend endpoint is called yet. The
// scoring dictionary and community stub data are hardcoded so Doug can
// approve the flow, questions, and result card design before we wire
// this to the real /api/communities dataset.
import React, { useState } from "react";
import { Link } from "react-router-dom";

const BRAND = {
  navy: "#0F2A5B",
  gold: "#F5A623",
  cream: "#F5F0E1",
  ink: "#1F2937",
  muted: "#6B7280",
  green: "#059669",
  blue: "#1E40AF",
};

// Mock community records — real version will hydrate from communities_seed.json
const COMMUNITIES = [
  { slug:"maple-ridge", name:"Maple Ridge", region:"Fraser Valley", tags:["family","commute","affordable","hiking"], budget:"$$", climate:"mild-wet", commute:"medium", inArea:true, hero:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", blurb:"Family-friendly Fraser Valley community with Alouette Lake access, Golden Ears Provincial Park at the doorstep, and a 45-min SkyTrain-adjacent commute to downtown Vancouver." },
  { slug:"squamish", name:"Squamish", region:"Sea-to-Sky", tags:["outdoors","hiking","climbing","young-professional"], budget:"$$$", climate:"mild-wet", commute:"medium", inArea:true, hero:"https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=800", blurb:"Outdoor-recreation capital halfway between Vancouver and Whistler — climbing, mountain biking, and windsurfing on the doorstep." },
  { slug:"kelowna", name:"Kelowna", region:"Okanagan", tags:["retirement","warm","lakefront","wine"], budget:"$$", climate:"dry-sunny", commute:"low", inArea:false, hero:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", blurb:"Semi-arid Okanagan Lake city — driest climate in BC, wine country, four full seasons of sun, retirement-friendly infrastructure." },
  { slug:"victoria", name:"Victoria", region:"Vancouver Island", tags:["mild","walkable","retirement","urban"], budget:"$$$", climate:"mild-dry", commute:"low", inArea:false, hero:"https://images.unsplash.com/photo-1580746738099-1ee5d3e3b1f2?w=800", blurb:"BC's mildest year-round climate, walkable downtown, and heritage character. Popular retirement destination with strong healthcare + arts." },
  { slug:"nelson", name:"Nelson", region:"Kootenay", tags:["mountain","artsy","rural","affordable"], budget:"$", climate:"mountain-snow", commute:"low", inArea:false, hero:"https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800", blurb:"West Kootenay heritage town, arts-forward, mountain-lake surroundings, some of the most affordable detached homes in southern BC." },
  { slug:"north-vancouver", name:"North Vancouver", region:"Greater Vancouver", tags:["urban","hiking","commute","family"], budget:"$$$$", climate:"mild-wet", commute:"high", inArea:true, hero:"https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800", blurb:"Mountain-and-ocean bedroom community minutes from downtown Vancouver — Grouse, Seymour, Cypress on your doorstep, family-focused schools." },
];

// Scoring — matches quiz answers to community tags/facets. Simple additive
// score so Doug can eyeball the ranking; production version will pull from
// a normalized community-attribute schema.
function scoreCommunity(c, answers) {
  let s = 0;
  if (answers.climate && c.climate === answers.climate) s += 3;
  if (answers.commute && c.commute === answers.commute) s += 2;
  if (answers.budget && c.budget.length === answers.budget.length) s += 2;
  if (answers.lifestyle) {
    answers.lifestyle.forEach(l => { if (c.tags.includes(l)) s += 2; });
  }
  return s;
}

const QUESTIONS = [
  { key:"origin", label:"Where are you moving from?", type:"radio", options:[
    { v:"alberta", l:"Alberta" },
    { v:"ontario", l:"Ontario" },
    { v:"other-canada", l:"Other Canadian province" },
    { v:"usa", l:"United States" },
    { v:"international", l:"Overseas" },
  ]},
  { key:"climate", label:"What kind of climate feels like home?", type:"radio", options:[
    { v:"mild-wet",       l:"🌧 Mild + green (Coastal Vancouver / Fraser Valley)" },
    { v:"mild-dry",       l:"🌤 Mild + dry (Southern Vancouver Island)" },
    { v:"dry-sunny",      l:"☀️ Warm + dry (Okanagan / Southern Interior)" },
    { v:"mountain-snow",  l:"⛰ Real 4 seasons + winter snow (Kootenay / North)" },
  ]},
  { key:"budget", label:"What's your home-purchase budget?", type:"radio", options:[
    { v:"$",    l:"Under $600K" },
    { v:"$$",   l:"$600K – $1.1M" },
    { v:"$$$",  l:"$1.1M – $2M" },
    { v:"$$$$", l:"$2M+" },
  ]},
  { key:"commute", label:"How much commute can you tolerate?", type:"radio", options:[
    { v:"low",    l:"None — I work from home / retired" },
    { v:"medium", l:"Up to 45 minutes each way" },
    { v:"high",   l:"Any commute — I'll follow the right home" },
  ]},
  { key:"lifestyle", label:"Pick the 2-3 that matter most", type:"multi", options:[
    { v:"family",           l:"👨‍👩‍👧 Family + schools" },
    { v:"outdoors",         l:"🏔 Outdoors + hiking" },
    { v:"walkable",         l:"🚶 Walkable urban life" },
    { v:"lakefront",        l:"🏖 Lakefront / ocean" },
    { v:"wine",             l:"🍷 Wine country" },
    { v:"retirement",       l:"👴 Retirement-friendly" },
    { v:"artsy",            l:"🎨 Arts + culture town" },
    { v:"affordable",       l:"💰 Most affordable option" },
    { v:"young-professional", l:"💼 Young-professional scene" },
  ]},
];

const OptionButton = ({ selected, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      textAlign:"left",padding:"12px 16px",borderRadius:12,
      border:selected?`2px solid ${BRAND.navy}`:`1px solid #E5E7EB`,
      background:selected?BRAND.cream:"white",
      fontFamily:"Inter,sans-serif",fontSize:"0.95rem",color:BRAND.ink,cursor:"pointer",
      display:"block",width:"100%",marginBottom:"8px",transition:"all 0.15s",
      boxShadow:selected?"0 2px 8px rgba(15,42,91,0.12)":"none",
    }}
  >{children}</button>
);

export default function MovingToBcQuiz() {
  const [step, setStep] = useState(0);   // 0..QUESTIONS.length -> QUESTIONS.length = results
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState("");
  const [emailOk, setEmailOk] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const total = QUESTIONS.length;
  const q = step < total ? QUESTIONS[step] : null;

  const setAns = (v) => {
    if (q.type === "multi") {
      const cur = answers[q.key] || [];
      const next = cur.includes(v) ? cur.filter(x=>x!==v) : (cur.length<3 ? [...cur,v] : cur);
      setAnswers(a => ({...a, [q.key]: next}));
    } else {
      setAnswers(a => ({...a, [q.key]: v}));
      // auto-advance on single-choice
      setTimeout(() => setStep(s => Math.min(total, s+1)), 150);
    }
  };

  const ranked = [...COMMUNITIES]
    .map(c => ({...c, score: scoreCommunity(c, answers)}))
    .sort((a,b) => b.score - a.score)
    .slice(0, 3);

  const submit = (e) => {
    e.preventDefault();
    if (!email || !consent) return;
    setSubmitting(true);
    // MOCKUP: no backend call yet — production will POST to /api/leads/moving-to-bc
    setTimeout(() => { setSubmitting(false); setEmailOk(true); }, 700);
  };

  return (
    <div style={{background:"#EDEEF3",minHeight:"100vh",padding:"48px 0"}} data-testid="moving-to-bc-quiz">
      <div style={{maxWidth:820,margin:"0 auto",padding:"0 20px"}}>
        {/* Header banner */}
        <div style={{
          background:`linear-gradient(135deg, ${BRAND.navy} 0%, #1E3A8A 100%)`,
          color:"white",borderRadius:"14px 14px 0 0",padding:"28px 32px",
        }}>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.16em",color:BRAND.gold,fontWeight:700}}>MOCKUP · REVIEW COPY</div>
          <div style={{fontSize:"1.85rem",fontFamily:"'Sora',sans-serif",fontWeight:800,marginTop:6,lineHeight:1.15}}>Moving to BC?</div>
          <div style={{fontSize:"1.05rem",marginTop:8,opacity:0.9,lineHeight:1.55}}>
            Take our 90-second quiz — we'll match you with 3 BC communities that fit your climate, budget, and lifestyle across all 239 towns in our database.
          </div>
          {/* Progress bar */}
          <div style={{marginTop:20,background:"rgba(255,255,255,0.15)",borderRadius:999,height:6,overflow:"hidden"}}>
            <div style={{
              width: `${Math.min(100, ((step)/(total)) * 100)}%`,
              background: BRAND.gold, height:"100%", transition:"width 0.35s",
            }}/>
          </div>
          <div style={{fontSize:"0.78rem",marginTop:8,opacity:0.85}}>
            {step < total ? `Question ${step+1} of ${total}` : (emailOk ? "Your matches" : "Almost done · Get your results")}
          </div>
        </div>

        {/* Question panel */}
        {step < total && (
          <div style={{background:"white",padding:"28px 32px",borderRadius:"0 0 14px 14px",boxShadow:"0 10px 30px rgba(15,42,91,0.10)"}}>
            <div style={{fontSize:"1.15rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy,marginBottom:16}}>
              {q.label}
              {q.type === "multi" && <span style={{fontSize:"0.75rem",color:BRAND.muted,fontWeight:500,marginLeft:8}}>· pick up to 3</span>}
            </div>
            {q.options.map(o => (
              <OptionButton
                key={o.v}
                data-testid={`quiz-option-${q.key}-${o.v}`}
                onClick={() => setAns(o.v)}
                selected={q.type === "multi" ? (answers[q.key] || []).includes(o.v) : answers[q.key] === o.v}
              >{o.l}</OptionButton>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}>
              <button
                onClick={() => setStep(s => Math.max(0, s-1))}
                disabled={step === 0}
                style={{background:"transparent",border:"none",color:BRAND.muted,fontSize:"0.9rem",cursor:step===0?"default":"pointer",opacity:step===0?0.4:1}}
              >← Back</button>
              {q.type === "multi" && (
                <button
                  onClick={() => setStep(s => Math.min(total, s+1))}
                  disabled={!(answers[q.key] && answers[q.key].length > 0)}
                  data-testid="quiz-continue"
                  style={{
                    background:BRAND.navy,color:"white",border:"none",padding:"10px 22px",
                    borderRadius:999,fontFamily:"Inter,sans-serif",fontWeight:600,fontSize:"0.95rem",
                    cursor:(answers[q.key]||[]).length>0?"pointer":"default",
                    opacity:(answers[q.key]||[]).length>0?1:0.5,
                  }}
                >Continue →</button>
              )}
            </div>
          </div>
        )}

        {/* Email capture (post-quiz, pre-reveal) */}
        {step === total && !emailOk && (
          <div style={{background:"white",padding:"32px",borderRadius:"0 0 14px 14px",boxShadow:"0 10px 30px rgba(15,42,91,0.10)"}}>
            <div style={{fontSize:"1.6rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy,marginBottom:8}}>Where should we send your 3 community matches?</div>
            <div style={{fontSize:"0.95rem",color:BRAND.muted,marginBottom:20,lineHeight:1.55}}>
              We'll email a PDF with your top 3 BC community fits, links to community deep-dives, and — if you'd like — introduce you to a licensed REALTOR® in each community.
            </div>
            <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                data-testid="quiz-email"
                style={{padding:"14px 16px",fontSize:"1rem",borderRadius:10,border:"1px solid #D1D5DB",fontFamily:"Inter,sans-serif"}}
              />
              <label style={{display:"flex",gap:10,alignItems:"flex-start",fontSize:"0.86rem",color:BRAND.ink,lineHeight:1.55}}>
                <input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} data-testid="quiz-consent" style={{marginTop:4}}/>
                <span>I consent to receive my community-match PDF and occasional BC real-estate emails from EZtoFind.ca under Canada's Anti-Spam Legislation (CASL). I can unsubscribe anytime — one-click link in every email.</span>
              </label>
              <button
                type="submit"
                disabled={submitting}
                data-testid="quiz-submit"
                style={{
                  background:BRAND.navy,color:"white",border:"none",padding:"14px 24px",
                  borderRadius:999,fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:"1rem",
                  cursor:submitting?"default":"pointer",opacity:submitting?0.6:1,
                }}
              >{submitting ? "Sending…" : "🐾 Show me my 3 matches"}</button>
            </form>
            <div style={{fontSize:"0.72rem",color:BRAND.muted,marginTop:14,lineHeight:1.55}}>
              Your email is collected under BC's Personal Information Protection Act (PIPA) solely to deliver your community-match report and optional REALTOR® referrals. Full policy: <Link to="/privacy" style={{color:BRAND.navy}}>eztofind.ca/privacy</Link>.
            </div>
          </div>
        )}

        {/* Results reveal */}
        {step === total && emailOk && (
          <div style={{background:"white",padding:"28px 32px",borderRadius:"0 0 14px 14px",boxShadow:"0 10px 30px rgba(15,42,91,0.10)"}}>
            <div style={{padding:"10px 14px",background:"#DCFCE7",color:"#065F46",borderRadius:8,fontSize:"0.9rem",marginBottom:22,fontWeight:600}}>
              ✓ We've emailed your full match PDF to <strong>{email}</strong>. Here's the preview.
            </div>
            <div style={{fontSize:"1.5rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy,marginBottom:6}}>Your 3 BC Community Matches</div>
            <div style={{fontSize:"0.9rem",color:BRAND.muted,marginBottom:22}}>Based on your climate, budget, commute, and lifestyle answers.</div>

            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:16}}>
              {ranked.map((c, i) => (
                <div key={c.slug} data-testid={`quiz-result-${c.slug}`} style={{
                  border:`1px solid #E5E7EB`,borderRadius:12,overflow:"hidden",
                  display:"grid",gridTemplateColumns:"160px 1fr",background:"white",
                }}>
                  <img src={c.hero} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover",minHeight:150}}/>
                  <div style={{padding:"16px 18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:"0.72rem",color:BRAND.gold,fontWeight:700,letterSpacing:"0.12em"}}>MATCH #{i+1}</div>
                        <div style={{fontSize:"1.2rem",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy}}>{c.name}</div>
                        <div style={{fontSize:"0.85rem",color:BRAND.muted}}>{c.region}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:"0.7rem",color:BRAND.muted,fontWeight:600}}>MATCH SCORE</div>
                        <div style={{fontSize:"1.3rem",fontWeight:700,color:BRAND.green}}>{c.score}/12</div>
                      </div>
                    </div>
                    <div style={{fontSize:"0.88rem",color:BRAND.ink,marginTop:8,lineHeight:1.55}}>{c.blurb}</div>
                    <div style={{marginTop:12,display:"flex",gap:10,flexWrap:"wrap"}}>
                      <Link to={`/community/${c.slug}`} style={{fontSize:"0.85rem",fontWeight:600,color:BRAND.navy,background:BRAND.cream,padding:"6px 12px",borderRadius:999,textDecoration:"none"}}>Community deep-dive →</Link>
                      <Link to={`/listings?city=${encodeURIComponent(c.name)}`} style={{fontSize:"0.85rem",fontWeight:600,color:"white",background:BRAND.navy,padding:"6px 12px",borderRadius:999,textDecoration:"none"}}>See active listings</Link>
                      {c.inArea ? (
                        <Link to="/consultation" style={{fontSize:"0.85rem",fontWeight:600,color:"white",background:BRAND.green,padding:"6px 12px",borderRadius:999,textDecoration:"none"}}>Talk to Doug (in-area)</Link>
                      ) : (
                        <Link to={`/referral-request?city=${encodeURIComponent(c.name)}&region=${encodeURIComponent(c.region)}`} style={{fontSize:"0.85rem",fontWeight:600,color:"white",background:BRAND.blue,padding:"6px 12px",borderRadius:999,textDecoration:"none"}}>Get a REALTOR® referral</Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Referral revenue callout */}
            <div style={{marginTop:24,padding:"18px 22px",background:BRAND.navy,color:"white",borderRadius:12}}>
              <div style={{fontSize:"0.75rem",color:BRAND.gold,fontWeight:700,letterSpacing:"0.14em"}}>NEXT STEP</div>
              <div style={{fontSize:"1.2rem",fontFamily:"'Sora',sans-serif",fontWeight:700,marginTop:4}}>Ready to explore any of these communities?</div>
              <div style={{fontSize:"0.9rem",marginTop:6,opacity:0.9,lineHeight:1.55}}>
                For matches in Doug's service area (Greater Vancouver / Fraser Valley / Sea-to-Sky) he'll work with you directly. For matches outside that area, Doug has a vetted BC-wide referral network — we connect you with a licensed community-specialist REALTOR® at <strong>no cost to you</strong>.
              </div>
              <div style={{marginTop:12,display:"flex",gap:14,fontSize:"0.9rem",fontWeight:700,flexWrap:"wrap"}}>
                <span>📞 (604) 787-0851</span>
                <span>📧 info@eztofind.ca</span>
              </div>
            </div>

            <button
              onClick={() => { setStep(0); setAnswers({}); setEmailOk(false); setEmail(""); setConsent(false); }}
              style={{marginTop:20,background:"transparent",border:"none",color:BRAND.muted,textDecoration:"underline",fontSize:"0.85rem",cursor:"pointer"}}
            >Retake the quiz</button>
          </div>
        )}

        {/* Compliance footer */}
        <div style={{marginTop:24,fontSize:"0.72rem",color:BRAND.muted,lineHeight:1.55,textAlign:"center"}}>
          © 2026 EZtoFind.ca · Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. — 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5.
          Community suggestions are general information only, not real-estate advice. MLS® data © CREA DDF®.
        </div>
      </div>
    </div>
  );
}
