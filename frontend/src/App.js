/* eslint-disable react/no-unescaped-entities, no-empty */
import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./App.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// --- Doogie Assets ---
const DOOGIE_LAPTOP = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/vo8679bv_Doogie%20Laptop.png";
const DOOGIE_POINT_R = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/9lnyn1tx_Doogie%20Pointing%20Right.png";
const DOOGIE_POINT_L = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/686tnkdh_Doogie%20Pointing%20Left.jpeg";
const DOOGIE_CELEBRATE = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/4g6serdu_Doogie%20Celebrating.png";
const DOOGIE_THINKING = "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rxgxv6ec_transparent_Doogie%20Thinking.png";
const DOOGIE_MAGNIFY = "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/6phrhs00_Doogie%20Magnifying%20Glass%20Transparent.png";
const DOOGIE_POINT_L_T = "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/ws3q9zcp_transparent_Doogie%20Pointing%20Left.png";

// Real BC imagery (Unsplash, free-to-use)
const IMG = {
  vancouver: "https://images.unsplash.com/photo-1559511260-66a654ae982a?w=1200&q=80",
  fraserValley: "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/gs9v7w9f_EZ%20Fraser%20Valley.webp",
  seaToSky: "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/kdomoatd_EZ%20Sea%20to%20Sky.webp",
  detached: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
  luxury: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
  equestrian: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&q=80",
  estate: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80",
  condo: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
  townhomes: "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/d8ucxa1f_image.png",
  bcHero: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1600&q=80",
  vancouverIsland: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80"
};

// --- Nav / Footer ---
const Nav = () => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <nav className="nav"><div className="container-x nav-inner">
      <Link to="/" onClick={close} style={{display:"flex",alignItems:"center",gap:"0.75rem",textDecoration:"none"}}>
        <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire, REALTOR®" style={{width:52,height:52,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--brand-gold)"}}/>
        <div><div className="font-display" style={{fontSize:"1.4rem",lineHeight:1,color:"var(--brand-navy)"}}>EZtoFind<span style={{color:"var(--brand-green-dark)"}}>.ca</span></div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.72rem",color:"var(--muted)",letterSpacing:"0.08em"}}>DOUG LEMAIRE, REALTOR®</div></div>
      </Link>
      <button className="nav-hamburger" aria-label={open?"Close menu":"Open menu"} aria-expanded={open} onClick={()=>setOpen(o=>!o)} data-testid="nav-hamburger">
        <span/><span/><span/>
      </button>
      <div className={`nav-links${open?" open":""}`}>
        <NavLink to="/listings" onClick={close} data-testid="nav-listings">Search Listings</NavLink>
        <NavLink to="/communities" onClick={close} data-testid="nav-communities">Communities</NavLink>
        <NavLink to="/glossary" onClick={close} data-testid="nav-glossary">Glossary</NavLink>
        <NavLink to="/specialties" onClick={close} data-testid="nav-specialties">Doug's Specialties</NavLink>
        <NavLink to="/about" onClick={close} data-testid="nav-about">About</NavLink>
        <NavLink to="/valuation" onClick={close} data-testid="nav-valuation">Home Estimate</NavLink>
        <span className="nav-divider" aria-hidden="true"/>
        <NavLink to="/realtors" onClick={close} data-testid="nav-realtors">REALTORS®</NavLink>
      </div>
    </div></nav>
  );
};

const Footer = () => (
  <footer><div className="container-x">
    <div className="footer-grid">
      <div>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1rem"}}>
          <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire, REALTOR®" style={{width:56,height:56,borderRadius:"50%",border:"2px solid var(--brand-gold)",objectFit:"cover"}}/>
          <div><div className="font-display" style={{fontSize:"1.3rem",color:"white"}}>EZtoFind.ca</div>
          <div style={{fontSize:"0.75rem",opacity:0.7}}>Doug LeMaire, REALTOR®</div></div>
        </div>
        <p style={{fontSize:"0.88rem",lineHeight:1.6,opacity:0.85}}>The AI-powered real estate research platform for all of British Columbia. Primary practice area: Greater Vancouver, Fraser Valley &amp; the Sea-to-Sky Corridor. Referral network covers all of BC.</p>
        <p style={{fontSize:"0.78rem",opacity:0.85,marginTop:"1rem",lineHeight:1.5}}><strong style={{color:"var(--brand-gold)"}}>Doug LeMaire, REALTOR®</strong><br/>Licensee of the British Columbia Financial Services Authority (BCFSA)<br/>BCFSA Licence #: <span data-testid="licence-num">[Doug to add]</span><br/><strong>Fraser Property Management Realty Services Ltd.</strong><br/>Member: Greater Vancouver REALTORS® (GVR) &amp; Canadian Real Estate Association (CREA)</p>
      </div>
      <div><h4>Explore</h4><ul>
        <li><Link to="/listings">Search Listings</Link></li>
        <li><Link to="/communities">Communities</Link></li>
        <li><Link to="/specialties">Specialties</Link></li>
        <li><Link to="/glossary">Glossary</Link></li>
        <li><Link to="/valuation">Home Valuation</Link></li>
      </ul></div>
      <div><h4>For REALTORS®</h4><ul>
        <li><Link to="/realtors">Referral Network</Link></li>
        <li><Link to="/about">About Doug</Link></li>
        <li><Link to="/contact">Contact</Link></li>
      </ul></div>
      <div><h4>Consumer Protection</h4><ul>
        <li><Link to="/complaints">Complaints & Concerns</Link></li>
        <li><Link to="/dorts">Disclosure of Representation</Link></li>
        <li><Link to="/working-with-a-realtor">Working with a REALTOR®</Link></li>
        <li><Link to="/code-of-ethics">REALTOR® Code of Ethics</Link></li>
      </ul></div>
      <div><h4>Contact</h4><ul>
        <li>info@eztofind.ca</li>
        <li>realtors@eztofind.ca</li>
        <li>referral@eztofind.ca</li>
      </ul></div>
    </div>
    <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",marginTop:"2.5rem",paddingTop:"1.5rem",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",fontSize:"0.78rem",opacity:0.7}}>
      <div>© 2026 EZtoFind.ca — All rights reserved. REALTOR® &amp; MLS® are trademarks of the Canadian Real Estate Association (CREA), used under license. Multiple Listing Service® and MLS® are trademarks owned by CREA. Not intended to solicit properties currently listed for sale or buyers currently under contract with another REALTOR®.</div>
      <div style={{display:"flex",gap:"1.25rem",flexWrap:"wrap"}}><Link to="/privacy">Privacy (PIPA)</Link><Link to="/terms">Terms</Link><Link to="/compliance">Compliance</Link><Link to="/data-attribution">Data Attribution</Link><Link to="/breach-policy">Breach Policy</Link><Link to="/unsubscribe">Unsubscribe</Link></div>
    </div>
  </div></footer>
);

// --- Doogie AI Chat Widget ---
const DoogieChat = () => {
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(() => localStorage.getItem("ez_doogie_consent") === "1");
  const [msgs, setMsgs] = useState([{role:"assistant",content:"Hi! I'm Doogie 🐾 EZtoFind's AI helper. Ask me about BC real estate terms, our services, or how the site works. What can I help you find today?"}]);
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => "sess-" + Math.random().toString(36).slice(2));
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef();
  useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs]);

  const acceptConsent = () => { localStorage.setItem("ez_doogie_consent","1"); setConsented(true); };

  const send = async (e) => {
    e.preventDefault();
    if(!input.trim() || busy) return;
    const q = input; setInput(""); setBusy(true);
    setMsgs(m => [...m, {role:"user",content:q}, {role:"assistant",content:""}]);
    let gotAnyContent = false;
    try {
      const res = await fetch(`${API}/doogie/chat`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:sessionId,message:q})});
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      while(true) {
        const {done, value} = await reader.read(); if(done) break;
        buf += dec.decode(value, {stream:true});
        const lines = buf.split("\n\n"); buf = lines.pop();
        for(const line of lines) {
          if(!line.startsWith("data:")) continue;
          try {
            const j = JSON.parse(line.slice(5).trim());
            if(j.delta) { gotAnyContent = true; setMsgs(m => { const c=[...m]; c[c.length-1] = {role:"assistant",content:c[c.length-1].content+j.delta}; return c; }); }
            else if(j.error) { gotAnyContent = true; setMsgs(m => { const c=[...m]; c[c.length-1] = {role:"assistant",content:"Woof — Doogie's brain is temporarily unavailable. Please try again in a moment, or ask Doug directly via the Contact page. (Reason: "+String(j.error).slice(0,180)+")"}; return c; }); }
          } catch{}
        }
      }
      if(!gotAnyContent) setMsgs(m => { const c=[...m]; c[c.length-1] = {role:"assistant",content:"Woof — I didn't receive a response. Please try again, or contact Doug directly."}; return c; });
    } catch(err) { setMsgs(m => { const c=[...m]; c[c.length-1] = {role:"assistant",content:"Woof — I had trouble connecting. Please try again."}; return c; }); }
    setBusy(false);
  };

  return (<>
    <button className="doogie-fab" onClick={()=>setOpen(o=>!o)} data-testid="doogie-fab" aria-label="Chat with Doogie">
      <img src={DOOGIE_THINKING} alt="Doogie"/>
    </button>
    {open && <div className="doogie-panel" data-testid="doogie-panel">
      <header><img src={DOOGIE_THINKING} alt="Doogie"/><div><div style={{fontWeight:600}}>Doogie</div><div style={{fontSize:"0.75rem",opacity:0.85}}>AI Helper · General Info Only</div></div>
        <button onClick={()=>setOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:"white",fontSize:"1.5rem",cursor:"pointer"}}>×</button></header>
      {!consented ? <div style={{padding:"1.25rem",fontFamily:"Inter,sans-serif",fontSize:"0.88rem",lineHeight:1.6,background:"#FFF8E8",flex:1,overflowY:"auto"}} data-testid="doogie-consent">
        <div style={{fontWeight:700,color:"var(--brand-navy)",marginBottom:"0.5rem"}}>Before we chat…</div>
        <p style={{margin:"0 0 0.75rem"}}>Doogie is an AI assistant powered by Anthropic Claude. Doogie provides <strong>general information only</strong> — never financial, legal, tax, or property-specific advice.</p>
        <p style={{margin:"0 0 0.75rem"}}><strong>Please don't share confidential information</strong> such as your full name, address, phone number, financial details, or property specifics. Messages you send are processed by our AI provider and may be logged for quality and compliance review.</p>
        <p style={{margin:"0 0 1rem",fontSize:"0.82rem"}}>See our <Link to="/privacy" style={{color:"var(--brand-blue)"}}>Privacy Policy</Link> for details. For advice specific to your situation, please <Link to="/contact" style={{color:"var(--brand-blue)"}}>contact Doug LeMaire, REALTOR®</Link>.</p>
        <button onClick={acceptConsent} className="btn btn-primary" style={{width:"100%"}} data-testid="doogie-consent-accept">I understand — start chatting</button>
      </div>
      : <>
      <div className="msgs" ref={scrollRef}>{msgs.map((m,i)=><div key={i} className={`msg ${m.role}`}>{m.content || (busy && i===msgs.length-1 ? "…" : "")}</div>)}</div>
      <form onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask Doogie…" data-testid="doogie-input"/><button type="submit" disabled={busy} data-testid="doogie-send">Send</button></form>
      </>}
    </div>}
  </>);
};

// --- HOME ---
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const Home = () => {
  const [q, setQ] = useState("");
  const [terms, setTerms] = useState([]);
  const [comms, setComms] = useState([]); // [{name, region}]
  const [focus, setFocus] = useState(false);
  const [hi, setHi] = useState(0); // highlighted suggestion index
  const nav = useNavigate();
  useEffect(() => {
    axios.get(`${API}/glossary`).then(r => setTerms(r.data.map(t => ({slug:t.slug, term:t.term})))).catch(()=>{});
    axios.get(`${API}/communities`).then(r => {
      const list = [];
      Object.entries(r.data || {}).forEach(([region, arr]) => arr.forEach(name => list.push({name, region})));
      setComms(list);
    }).catch(()=>{});
  }, []);
  const query = q.trim().toLowerCase();
  const suggestions = !query ? [] : [
    ...comms.filter(c => c.name.toLowerCase().includes(query)).slice(0, 6).map(c => ({type:"Community", label:c.name, sub:c.region, path:`/community/${slugify(c.name)}`})),
    ...terms.filter(t => t.term.toLowerCase().includes(query)).slice(0, 6).map(t => ({type:"Glossary", label:t.term, sub:"BC Real Estate Term", path:`/glossary/${t.slug}`}))
  ].slice(0, 8);
  const go = (path) => { setQ(""); setFocus(false); nav(path); };
  const onSubmit = (e) => {
    e.preventDefault();
    if(suggestions.length > 0) return go(suggestions[Math.min(hi, suggestions.length-1)].path);
    if(query) nav(`/listings?q=${encodeURIComponent(q.trim())}`);
  };
  const onKeyDown = (e) => {
    if(!suggestions.length) return;
    if(e.key === "ArrowDown") { e.preventDefault(); setHi(i => Math.min(i+1, suggestions.length-1)); }
    else if(e.key === "ArrowUp") { e.preventDefault(); setHi(i => Math.max(i-1, 0)); }
    else if(e.key === "Escape") setFocus(false);
  };
  return (<>
    <section className="hero"><div className="container-x hero-grid">
      <div>
        <div className="eyebrow">🏔️ British Columbia · Powered by Doogie AI</div>
        <h1><span className="accent" style={{color:"#16A34A",fontFamily:"'Avenir Next','Manrope',sans-serif",fontWeight:600,fontStyle:"normal"}}>Real estate</span><span style={{color:"#000080",fontFamily:"'Avenir Next','Manrope',sans-serif",fontWeight:600}}>,</span><br/><span style={{color:"#000080",fontFamily:"'Avenir Next','Manrope',sans-serif",fontWeight:600}}>made </span><span className="brand-blue" style={{color:"#0EA5E9",fontFamily:"'Sora',sans-serif",fontWeight:800}}>EZ to Find</span><span className="green" style={{color:"#FDB813",fontFamily:"'Sora',sans-serif",fontWeight:800}}>.ca</span></h1>
        <p className="lead">EZtoFind.ca is a free real estate information platform for anyone considering buying or selling residential real estate, now or in the future.</p>
        <p className="lead" style={{marginTop:"1rem"}}>Doogie is an AI-assisted chatbot designed to help provide information, answer general real estate questions, explain terminology, and navigate the EZtoFind.ca platform. Doogie provides general information only and is not a substitute for professional real estate advice.</p>
        <p className="lead" style={{marginTop:"1rem"}}>Real estate services are provided by Doug LeMaire, Licensed REALTOR®, with Fraser Property Management Realty Services Ltd., serving Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor.</p>
        <form onSubmit={onSubmit} className="search-bar" data-testid="hero-search" style={{position:"relative"}} autoComplete="off">
          <input value={q} onChange={e=>{setQ(e.target.value); setHi(0);}} onFocus={()=>setFocus(true)} onBlur={()=>setTimeout(()=>setFocus(false),200)} onKeyDown={onKeyDown} placeholder="Type a community or BC real estate term…" data-testid="hero-search-input"/>
          <button type="submit" className="btn btn-green" data-testid="hero-search-btn">Search →</button>
          {focus && suggestions.length > 0 && (
            <div data-testid="hero-search-suggestions" style={{position:"absolute",top:"calc(100% + 0.35rem)",left:0,right:0,background:"white",borderRadius:14,boxShadow:"0 20px 40px rgba(15,42,91,0.2)",border:"1px solid rgba(15,42,91,0.1)",overflow:"hidden",zIndex:10,fontFamily:"Inter,sans-serif",maxHeight:"22rem",overflowY:"auto"}}>
              {suggestions.map((s, i) => (
                <button type="button" key={s.type+"-"+s.label} onMouseDown={(e)=>{e.preventDefault(); go(s.path);}} onMouseEnter={()=>setHi(i)} data-testid={`suggestion-${s.type.toLowerCase()}-${slugify(s.label)}`} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem",padding:"0.75rem 1rem",background:i===hi?"#F5F0E1":"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:600,color:"var(--brand-navy)",fontSize:"0.95rem"}}>{s.label}</div>
                    <div style={{fontSize:"0.78rem",color:"var(--muted)"}}>{s.sub}</div>
                  </div>
                  <span style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.06em",color:s.type==="Community"?"#16A34A":"#0EA5E9",background:s.type==="Community"?"rgba(22,163,74,0.08)":"rgba(14,165,233,0.08)",padding:"0.2rem 0.55rem",borderRadius:999,flexShrink:0}}>{s.type.toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}
        </form>
        <div style={{marginTop:"1.5rem",display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          {["Detached","Luxury","Equestrian","Estate Sales","Condos","Townhomes"].map(s => <span key={s} className="pill">{s}</span>)}
        </div>
      </div>
      <div style={{textAlign:"center",overflow:"visible"}}>
        <img src={DOOGIE_MAGNIFY} alt="Doogie mascot" style={{width:"100%",maxWidth:"none",transform:"scale(1.9)",transformOrigin:"center center",filter:"drop-shadow(0 20px 40px rgba(15,42,91,0.2))"}}/>
      </div>
    </div></section>

    <section className="section"><div className="container-x">
      <div style={{textAlign:"center",marginBottom:"3rem"}}>
        <p className="section-sub">Doug LeMaire serves clients across three of British Columbia's most desirable real estate corridors.</p>
      </div>
      <div className="grid-3">
        {[{s:"greater-vancouver",t:"Greater Vancouver",i:IMG.vancouver,d:"From downtown highrises to West Van estates — 22 communities covered."},
          {s:"fraser-valley",t:"Fraser Valley",i:IMG.fraserValley,d:"Langley, Abbotsford, Chilliwack and beyond — where space meets city convenience."},
          {s:"sea-to-sky",t:"Sea-to-Sky",i:IMG.seaToSky,d:"Squamish, Whistler, Pemberton — mountain lifestyle real estate."}].map(r =>
          <Link to={`/regions/${r.s}`} key={r.s} className="card" data-testid={`region-${r.s}`}>
            <img src={r.i} alt={r.t} className="card-img"/>
            <div className="card-body"><h3 className="card-title">{r.t}</h3><p className="card-desc">{r.d}</p></div>
          </Link>)}
      </div>
    </div></section>

    <section className="section" style={{background:"#F5F0E1"}}><div className="container-x">
      <div style={{textAlign:"center",marginBottom:"3rem"}}>
        <div className="eyebrow">Doug's Specialties</div>
        <h2 className="section-title">Five areas of deep expertise.</h2>
      </div>
      <div className="grid-3">
        {[{s:"detached",t:"Detached Homes",i:IMG.detached},{s:"luxury",t:"Luxury",i:IMG.luxury},{s:"equestrian",t:"Equestrian & Acreage",i:IMG.equestrian},{s:"estate-sales",t:"Estate Sales / Probate",i:IMG.estate},{s:"condos",t:"Condos",i:IMG.condo},{s:"townhomes",t:"Townhomes",i:IMG.townhomes}].map(sp =>
          <Link to={`/specialties/${sp.s}`} key={sp.s} className="card" data-testid={`spec-${sp.s}`}>
            <img src={sp.i} alt={sp.t} className="card-img"/>
            <div className="card-body"><h3 className="card-title">{sp.t}</h3></div>
          </Link>)}
      </div>
    </div></section>

    <Calculators/>

    <section className="section"><div className="container-x">
      <div style={{textAlign:"center",marginBottom:"3rem"}}>
        <div className="eyebrow">What Our Clients Say</div>
        <h2 className="section-title">Real People. Real Results.<br/>Real BC Real Estate.</h2>
        <p className="section-sub">Doug LeMaire, REALTOR® helps buyers and sellers in BC achieve their real estate goals. Here is what they say.</p>
      </div>
      <div className="grid-2" style={{maxWidth:"1000px",margin:"0 auto",gap:"1.5rem"}}>
        {[
          {stars:5,quote:"Doug was an absolute pleasure to work with! As a buyer, we truly appreciated his patience, professionalism, and thorough approach throughout the entire process. Doug took the time to understand our needs, provided valuable insights, and guided us every step of the way with clear communication and expert advice. Doug's attention to detail and dedication made the experience smooth and stress-free. We couldn't have asked for a better realtor and highly recommend Doug to anyone looking to buy or sell a home!",initials:"JM",name:"J&M",role:"Buyers"},
          {stars:5,quote:"As a home seller, deciding which agent to work with can seem daunting. There are so many agents that sound great on paper, but will they truly understand YOUR needs and work to fulfill YOUR goals. Doug LeMaire is a real estate agent of an elite caliber who truly cares about his clients and will not stop until YOU are satisfied. Doug sold my home as an off sale listing, demonstrating to me that he never stopped working on my behalf, even when the home was not actually listed for sale. He did so by establishing strong connections with buyer agents and got the sale done. We are now looking to buy a home and will be using Doug for our next move. Thank you Doug for all your help.",initials:"MC",name:"M.C.",role:"Seller"}
        ].map((t,i) => (
          <div key={i} style={{background:"#E8EEF9",borderRadius:20,padding:"2rem",fontFamily:"Inter,sans-serif",position:"relative"}} data-testid={`testimonial-${i}`}>
            <div style={{color:"var(--brand-gold)",fontSize:"1.1rem",letterSpacing:"0.15em",marginBottom:"1rem"}}>{"★".repeat(t.stars)}</div>
            <div style={{fontSize:"3rem",fontFamily:"Fraunces,serif",color:"var(--brand-blue)",lineHeight:0.5,marginBottom:"0.25rem"}}>&ldquo;</div>
            <p style={{fontStyle:"italic",lineHeight:1.6,color:"var(--ink)",fontSize:"0.95rem",margin:"0 0 1.5rem"}}>{t.quote}</p>
            <div style={{display:"flex",alignItems:"center",gap:"0.85rem",marginTop:"1.5rem"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"var(--brand-navy)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600,fontSize:"0.9rem"}}>{t.initials}</div>
              <div>
                <div style={{fontWeight:600,color:"var(--ink)"}}>{t.name}</div>
                <div style={{fontSize:"0.85rem",color:"var(--muted)"}}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:"2rem",marginTop:"3rem",flexWrap:"wrap",fontFamily:"Inter,sans-serif",textAlign:"center",alignItems:"stretch"}}>
        {[
          {icon:"🛡️",title:"Licensed REALTOR®",sub:"BC Financial Services Authority"},
          {icon:"📍",title:"Local Expert",sub:"Greater Vancouver, Fraser Valley, Sea to Sky Corridor"},
          {icon:"⏱️",title:"13 Years",sub:"BC Real Estate Experience"}
        ].map((b,i) => (
          <div key={i} style={{flex:"0 0 220px",maxWidth:220,display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{fontSize:"1.75rem",marginBottom:"0.5rem",lineHeight:1}}>{b.icon}</div>
            <div style={{fontWeight:700,color:"var(--brand-navy)",fontSize:"0.95rem"}}>{b.title}</div>
            <div style={{fontSize:"0.82rem",color:"var(--muted)",lineHeight:1.4,marginTop:"0.25rem",minHeight:"2.8em",display:"flex",alignItems:"center",justifyContent:"center"}}>{b.sub}</div>
          </div>
        ))}
      </div>
    </div></section>

    <section className="section"><div className="container-x" style={{textAlign:"center"}}>
      <img src={DOOGIE_CELEBRATE} alt="Doogie celebrating" style={{width:180,margin:"0 auto 1rem"}}/>
      <h2 className="section-title">Ready to start?</h2>
      <p className="section-sub" style={{marginBottom:"2rem"}}>Tell Doug what you're looking for — buyer or seller — and get a personal response within 1 business day.</p>
      <div style={{display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap"}}>
        <Link to="/buyer" className="btn btn-primary" data-testid="cta-buyer">I'm Buying</Link>
        <Link to="/seller" className="btn btn-green" data-testid="cta-seller">I'm Selling</Link>
      </div>
    </div></section>
  </>);
};

// --- Listings iframe page ---
const Listings = () => {
  const [params] = useSearchParams();
  const q = params.get("q");
  return (
  <section className="section"><div className="container-x">
    <div style={{textAlign:"center",marginBottom:"2rem"}}>
      <div className="eyebrow">Live BC Listings</div>
      <h1 className="section-title">Search all British Columbia MLS® listings.</h1>
      {q && <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.95rem",color:"var(--brand-navy)",background:"#F5F0E1",padding:"0.75rem 1.25rem",borderRadius:999,display:"inline-block",margin:"0 auto 1rem"}} data-testid="listings-query-tag">🔍 Your search: <strong>"{q}"</strong> — type this into the map search below to filter results.</p>}
      <p className="section-sub">Powered by www.GreaterVancouver.ForSale — the same MLS® data our REALTORS® use daily. Data compliant with CREA, GVR &amp; MLS® rules.</p>
    </div>
    <div style={{background:"white",borderRadius:16,overflow:"hidden",border:"1px solid rgba(15,42,91,0.1)",boxShadow:"0 8px 24px rgba(15,42,91,0.05)"}}>
      <iframe src="https://www.greatervancouver.forsale/mapsearchapp" title="BC MLS Listings" style={{width:"100%",height:"800px",border:"none",display:"block"}} data-testid="listings-iframe"/>
    </div>
    <div className="notice" style={{marginTop:"1.5rem"}}>Listings data is provided under license from participating MLS® systems in British Columbia. The Doogie AI on this website does not directly query or manipulate this listings feed.</div>
  </div></section>);
};

// --- Regions ---
const RegionsIndex = () => (
  <section className="section"><div className="container-x">
    <div style={{textAlign:"center",marginBottom:"3rem"}}><div className="eyebrow">Focus Areas</div><h1 className="section-title">Where Doug works.</h1></div>
    <div className="grid-3">
      {[{s:"greater-vancouver",t:"Greater Vancouver",i:IMG.vancouver},{s:"fraser-valley",t:"Fraser Valley",i:IMG.fraserValley},{s:"sea-to-sky",t:"Sea-to-Sky Corridor",i:IMG.seaToSky}].map(r =>
        <Link to={`/regions/${r.s}`} key={r.s} className="card"><img src={r.i} className="card-img" alt={r.t}/><div className="card-body"><h3 className="card-title">{r.t}</h3></div></Link>)}
    </div>
    <div style={{textAlign:"center",marginTop:"3.5rem",marginBottom:"2rem"}}><div className="eyebrow">Referral Network</div><h2 className="section-title" style={{fontSize:"1.8rem"}}>Covered by our vetted REALTORS® across BC</h2></div>
    <div className="grid-3">
      <Link to="/regions/vancouver-island" className="card" data-testid="region-card-vancouver-island"><img src={IMG.vancouverIsland} className="card-img" alt="Vancouver Island"/><div className="card-body"><h3 className="card-title">Vancouver Island &amp; Gulf Islands</h3><p style={{fontFamily:"Inter,sans-serif",fontSize:"0.85rem",color:"var(--muted)",marginTop:"0.5rem"}}>51 communities — Victoria to Port Hardy, Tofino to Sidney</p></div></Link>
    </div>
  </div></section>
);

const REGION_DATA = {
  "greater-vancouver": {title:"Greater Vancouver", img:IMG.vancouver, key:"Greater Vancouver", copy:"The Greater Vancouver market spans 22 municipalities, from downtown Vancouver highrises to West Vancouver waterfront estates and the sprawling suburbs of Surrey and Coquitlam. It's Canada's most valuable real estate corridor — and one of the most tightly regulated. Doug's local expertise means you get someone who reads Form B's daily and knows every community's zoning quirks."},
  "fraser-valley": {title:"Fraser Valley", img:IMG.fraserValley, key:"Fraser Valley", copy:"The Fraser Valley — Langley, Abbotsford, Chilliwack, Mission — is BC's fastest-growing residential region. Detached homes, acreages, and family communities are the heart of the market. Doug specializes in equestrian and estate acreage properties across the Valley."},
  "sea-to-sky": {title:"Sea-to-Sky Corridor", img:IMG.seaToSky, key:"Sea-to-Sky", copy:"Squamish, Whistler, Pemberton — the Sea-to-Sky corridor blends mountain lifestyle with world-class recreation. Recreational homes, luxury chalets, and primary residences with a view. Financing, zoning, and STR rules here differ significantly from Metro Van."},
  "vancouver-island": {title:"Vancouver Island & Gulf Islands", img:IMG.vancouverIsland, key:"Vancouver Island & Gulf Islands", referral:true, copy:"Vancouver Island — from Victoria's heritage character to Tofino's surf coast, Nanaimo's growing urban core, and the retirement-friendly Comox Valley. Includes the Gulf Islands (Salt Spring, Galiano, Mayne, Pender, Saturna) with their unique zoning and community trust boundaries. Vancouver Island is outside Doug's primary practice area — but EZtoFind.ca's referral network connects you with a vetted, BC-licensed REALTOR® active in the specific community you're interested in. No cost to you; the receiving REALTOR® pays a referral fee to Doug at closing."}
};

const RegionPage = () => {
  const {slug} = useParams();
  const [communities, setCommunities] = useState({});
  useEffect(() => { axios.get(`${API}/communities`).then(r => setCommunities(r.data)); }, []);
  const d = REGION_DATA[slug];
  if(!d) return <div className="section container-x"><h2>Region not found</h2><Link to="/regions">Back</Link></div>;
  const list = communities[d.key] || [];
  return (<section className="section"><div className="container-x">
    <img src={d.img} alt={d.title} style={{width:"100%",height:400,objectFit:"cover",borderRadius:16,marginBottom:"2rem"}}/>
    <div style={{maxWidth:"46rem"}}>
      <div className="eyebrow">{d.referral ? "Referral Network Coverage" : "Focus Area"}</div>
      <h1 className="section-title">{d.title}</h1>
      <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7,marginBottom:"2rem"}}>{d.copy}</p>
      {d.referral && <div className="notice" style={{background:"#F5F0E1",borderColor:"var(--brand-gold)",marginBottom:"2rem",fontFamily:"Inter,sans-serif"}} data-testid="referral-region-notice"><strong>How the referral works:</strong> Submit our <Link to="/referral-request" style={{color:"var(--brand-blue)",fontWeight:600}}>Referral Request form</Link> with your city and property criteria. Doug's team matches you with a vetted, BC-licensed REALTOR® active in that community, introduces you by email, and steps aside. You work directly with the local REALTOR® — same pricing, better local knowledge.</div>}
    </div>
    <h3 className="font-display" style={{fontSize:"1.5rem",marginBottom:"1rem"}}>{d.referral ? "Communities covered by our network" : "Communities we serve"}</h3>
    <div className="chip-grid">{list.map(c => <Link key={c} to={`/community/${encodeURIComponent(c.toLowerCase().replace(/[^a-z0-9]+/g,"-"))}`} state={{name:c, region:d.key}} className="chip" style={{textDecoration:"none",cursor:"pointer"}} data-testid={`region-community-${c}`}>{c}</Link>)}</div>
    <div style={{marginTop:"3rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
      {d.referral
        ? <Link to="/referral-request" className="btn btn-primary" data-testid="referral-cta">Request a Referral</Link>
        : <><Link to="/listings" className="btn btn-primary">View Listings</Link><Link to="/buyer" className="btn btn-outline">I'm Buying Here</Link></>}
    </div>
  </div></section>);
};

// --- Specialties ---
const SPECIALTIES = {
  "detached":{t:"Detached Homes",i:IMG.detached,c:"Freehold, single-family homes across Greater Vancouver, the Fraser Valley, and Sea-to-Sky. From starter homes to executive estates — no strata fees, no shared walls, full title and land ownership."},
  "luxury":{t:"Luxury Real Estate",i:IMG.luxury,c:"BC's luxury tier — waterfront estates in West Van, mountain chalets in Whistler, custom-built homes on private acreages. Discreet, professional representation for high-net-worth buyers and sellers."},
  "equestrian":{t:"Equestrian & Acreage",i:IMG.equestrian,c:"Horse properties, hobby farms, and rural acreage — from Langley's ALR to Sea-to-Sky's ranch country. Deep knowledge of ALR rules, water rights, well/septic considerations, and equestrian facility valuation."},
  "estate-sales":{t:"Estate Sales / Probate",i:IMG.estate,c:"Sensitive, compliant representation for executors administering a BC estate under WESA. Coordination with legal counsel, understanding of Grant of Probate timelines, and 'as-is' sale expertise."},
  "condos":{t:"Condos",i:IMG.condo,c:"Strata-lot expertise across BC — Form B, Form F, depreciation reports, contingency reserve funds, bylaw review. Metro Vancouver, Fraser Valley, and resort condos."},
  "townhomes":{t:"Townhomes",i:IMG.townhomes,c:"Townhome expertise across the Lower Mainland — strata townhouse complexes, freehold row homes, half-duplexes. Understanding of restrictive covenants, shared-amenity fees, bareland strata, and unit-entitlement calculations."}
};
const SpecialtiesIndex = () => (<section className="section"><div className="container-x">
  <div style={{textAlign:"center",marginBottom:"3rem"}}><div className="eyebrow">Doug's Specialties</div><h1 className="section-title">Five focused expertises.</h1></div>
  <div className="grid-3">{Object.entries(SPECIALTIES).map(([s,d])=><Link key={s} to={`/specialties/${s}`} className="card"><img src={d.i} className="card-img" alt={d.t}/><div className="card-body"><h3 className="card-title">{d.t}</h3><p className="card-desc">{d.c.slice(0,120)}...</p></div></Link>)}</div>
</div></section>);
const SpecialtyPage = () => {
  const {slug} = useParams(); const d = SPECIALTIES[slug];
  if(!d) return <div className="section container-x"><h2>Not found</h2></div>;
  return (<section className="section"><div className="container-x">
    <img src={d.i} alt={d.t} style={{width:"100%",height:400,objectFit:"cover",borderRadius:16,marginBottom:"2rem"}}/>
    <div style={{maxWidth:"46rem"}}>
      <div className="eyebrow">Specialty</div><h1 className="section-title">{d.t}</h1>
      <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7,marginBottom:"2rem"}}>{d.c}</p>
      <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}><Link to="/buyer" className="btn btn-primary">Start as a Buyer</Link><Link to="/seller" className="btn btn-green">Start as a Seller</Link></div>
    </div>
  </div></section>);
};

// --- Glossary ---
const Glossary = () => {
  const [terms, setTerms] = useState([]);
  const [q, setQ] = useState("");
  useEffect(()=>{ axios.get(`${API}/glossary`).then(r=>setTerms(r.data)); },[]);
  const filtered = terms.filter(t => !q || t.term.toLowerCase().includes(q.toLowerCase()) || (t.definition||"").toLowerCase().includes(q.toLowerCase()) || (t.category||"").toLowerCase().includes(q.toLowerCase()));
  const byCat = {};
  filtered.forEach(t => { const c = t.category || "Other"; (byCat[c] = byCat[c] || []).push(t); });
  Object.values(byCat).forEach(arr => arr.sort((a,b) => a.term.localeCompare(b.term)));
  const orderedCats = Object.keys(byCat).sort((a,b) => a.localeCompare(b));
  return (<section className="section"><div className="container-x">
    <div style={{textAlign:"center",marginBottom:"2rem"}}><div className="eyebrow">Knowledge Hub</div><h1 className="section-title">BC Real Estate Glossary</h1><p className="section-sub">Term you may encounter buying or selling in British Columbia — with 10 FAQs per term.</p></div>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search glossary — term, definition, or category…" style={{width:"100%",maxWidth:560,margin:"0 auto 3rem",display:"block",padding:"0.9rem 1.25rem",fontFamily:"Inter,sans-serif",fontSize:"1rem",border:"2px solid rgba(15,42,91,0.15)",borderRadius:999,outline:"none",background:"white"}} data-testid="glossary-search"/>
    {filtered.length===0 && <p style={{textAlign:"center",fontFamily:"Inter,sans-serif",color:"var(--muted)"}}>No terms match your search.</p>}
    {orderedCats.map(cat => (
      <div key={cat} style={{marginBottom:"2.5rem"}} data-testid={`glossary-cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}>
        <h3 className="font-display" style={{fontSize:"1.5rem",marginBottom:"0.75rem",color:"var(--brand-navy)"}}>
          {cat} <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.8rem",color:"var(--muted)",fontWeight:400}}>({byCat[cat].length})</span>
        </h3>
        <div className="glossary-list">
          {byCat[cat].map(t => <Link key={t.slug} to={`/glossary/${t.slug}`} data-testid={`term-${t.slug}`}>
            <div><div style={{fontWeight:600,fontSize:"1.05rem",fontFamily:"Inter,sans-serif"}}>{t.term}</div><div className="cat">{t.category}</div></div>
            <span style={{color:"var(--brand-blue)"}}>→</span>
          </Link>)}
        </div>
      </div>
    ))}
  </div></section>);
};
const GlossaryTerm = () => {
  const {slug} = useParams();
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ setLoading(true); axios.get(`${API}/glossary/${slug}`).then(r=>{setT(r.data);setLoading(false);}).catch(()=>setLoading(false)); },[slug]);
  if(loading) return <div className="section container-x"><p>Loading…</p></div>;
  if(!t) return <div className="section container-x"><h2>Term not found</h2><Link to="/glossary">← Back</Link></div>;

  const AuthorBlock = ({compact=false}) => (
    <div itemScope itemType="https://schema.org/Person" style={{background:"#F5F0E1",border:"1px solid rgba(15,42,91,0.1)",borderRadius:12,padding:compact?"0.85rem 1rem":"1rem 1.25rem",fontFamily:"Inter,sans-serif",display:"flex",gap:"0.85rem",alignItems:"center",margin: compact ? "1rem 0" : "1.5rem 0"}} data-testid="author-block">
      <img src="/images/doogie-laptop.png" alt="EZtoFind.ca" style={{width:48,height:48,borderRadius:"50%",background:"var(--brand-navy)",padding:2,flexShrink:0}}/>
      <div style={{lineHeight:1.5}}>
        <div style={{fontSize:"0.78rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Published by</div>
        <div style={{fontWeight:700,color:"var(--ink)"}} itemProp="name">Doug LeMaire, REALTOR®</div>
        <div style={{fontSize:"0.88rem",color:"var(--brand-blue)"}}>
          <a href="https://eztofind.ca" itemProp="url" onClick={(e)=>{ if(window.location.hostname !== "eztofind.ca"){ e.preventDefault(); window.location.href = "/"; }}} style={{color:"inherit",textDecoration:"none",fontWeight:600}} data-testid="author-block-home-link">EZtoFind.ca</a>
          <span style={{color:"var(--muted)"}} itemProp="affiliation"> · Fraser Property Management Realty Services Ltd.</span>
        </div>
      </div>
    </div>
  );

  // AEO / LLM Article schema — combines definition, author, publisher, FAQPage
  const articleSchema = {
    "@context":"https://schema.org",
    "@type":"Article",
    "headline":`${t.term} — BC Real Estate`,
    "description":t.definition.substring(0,200),
    "author":{"@type":"Person","name":"Doug LeMaire, REALTOR®","url":"https://eztofind.ca/about","affiliation":{"@type":"Organization","name":"Fraser Property Management Realty Services Ltd."}},
    "publisher":{"@type":"Organization","name":"EZtoFind.ca","url":"https://eztofind.ca","logo":{"@type":"ImageObject","url":"https://eztofind.ca/images/doogie-laptop.png"}},
    "mainEntity":{"@type":"DefinedTerm","name":t.term,"description":t.definition,"inDefinedTermSet":{"@type":"DefinedTermSet","name":"EZtoFind.ca BC Real Estate Glossary","url":"https://eztofind.ca/glossary"}},
    "url":`https://eztofind.ca/glossary/${t.slug}`,
    "inLanguage":"en-CA",
    "about":{"@type":"Place","name":"British Columbia, Canada"}
  };
  const faqSchema = (t.faqs && t.faqs.length>0) ? {"@context":"https://schema.org","@type":"FAQPage","mainEntity":t.faqs.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}})),"author":{"@type":"Person","name":"Doug LeMaire, REALTOR®"},"publisher":{"@type":"Organization","name":"EZtoFind.ca"}} : null;

  return (<section className="section"><div className="container-x" style={{maxWidth:"48rem"}} itemScope itemType="https://schema.org/Article">
    <Link to="/glossary" style={{fontFamily:"Inter,sans-serif",color:"var(--brand-blue)",textDecoration:"none"}}>← All terms</Link>
    <div className="eyebrow" style={{marginTop:"1rem"}}>{t.category}</div>
    <h1 className="section-title" itemProp="headline">{t.term}</h1>

    <AuthorBlock/>

    <p style={{fontFamily:"Inter,sans-serif",fontSize:"1.05rem",lineHeight:1.75,color:"var(--ink)"}} itemProp="articleBody">{t.definition}</p>

    <h2 style={{marginTop:"3rem",fontSize:"1.75rem"}}>Frequently Asked Questions</h2>
    {(t.faqs && t.faqs.length>0) ? <div className="faq">{t.faqs.map((f,i)=><details key={i}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
      : (t.faqs_pending_review ? <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",background:"#F5F0E1",padding:"1rem",borderRadius:10}}>📋 FAQs for this term have been drafted by AI and are awaiting review by Doug LeMaire, REALTOR® before publication. Please check back soon.</p>
      : <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)"}}>FAQs are being generated by Doogie — refresh in a few seconds.</p>)}

    <div className="notice" style={{marginTop:"1.5rem"}}>All content on EZtoFind.ca, including Doogie's responses, the Glossary, Terms, FAQ's, community pages, weather, mortgage calculator, property transfer tax calculator is general information provided for educational purposes and is not a substitute for professional guidance tailored to your situation.</div>

    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleSchema)}}/>
    {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema)}}/>}
  </div></section>);
};

// --- Lead forms ---
const BuyerForm = () => {
  const [f,setF] = useState({full_name:"",email:"",phone:"",areas:[],property_type:"",budget_range:"",timeline:"",financing_status:"",first_time_buyer:false,working_with_realtor:false,preferred_contact:"email",notes:"",casl_consent:false,pipa_ack:false});
  const [done,setDone]=useState(false); const [err,setErr]=useState("");
  const submit = async e => { e.preventDefault(); setErr(""); try { await axios.post(`${API}/leads/buyer`, {...f, areas: f.areas.length? f.areas: [f.property_type||"Any"]}); setDone(true); } catch(x){ setErr("Please complete all required fields including consents."); } };
  if(done) return <section className="section"><div className="container-x" style={{maxWidth:"36rem",textAlign:"center"}}><img src={DOOGIE_CELEBRATE} style={{width:200,margin:"0 auto"}} alt="Doogie"/><h1 className="section-title">Thank you!</h1><p className="section-sub">Doug will reach out within 1 business day.</p><Link to="/" className="btn btn-primary" style={{marginTop:"1.5rem"}}>Back home</Link></div></section>;
  return (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
    <div className="eyebrow">Buyer Intake</div><h1 className="section-title">Tell us what you're looking for</h1>
    <div className="notice" style={{background:"#F0F4FB",borderColor:"rgba(15,42,91,0.15)",marginBottom:"1.5rem",fontFamily:"Inter,sans-serif",fontSize:"0.88rem",lineHeight:1.6}} data-testid="buyer-dorts-notice"><strong>BCFSA Consumer Notice — Please read before submitting:</strong> Submitting this form does not create a REALTOR®-client relationship. Under the Real Estate Services Rules, Doug LeMaire, REALTOR® will provide you with a formal <Link to="/dorts" style={{color:"var(--brand-blue)",fontWeight:600}}>Disclosure of Representation in Trading Services (DoRTS)</Link> before providing real estate services. Please also review <Link to="/working-with-a-realtor" style={{color:"var(--brand-blue)",fontWeight:600}}>Working with a REALTOR®</Link> to understand your rights as a consumer.</div>
    <form onSubmit={submit} className="paper" data-testid="buyer-form">
      <div className="form-grid">
        <div className="field"><label>Full Name *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} data-testid="buyer-name"/></div>
        <div className="field"><label>Email *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="buyer-email"/></div>
        <div className="field"><label>Phone *</label><input required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} data-testid="buyer-phone"/></div>
        <div className="field"><label>Property Type *</label><select required value={f.property_type} onChange={e=>setF({...f,property_type:e.target.value})} data-testid="buyer-type"><option value="">Select…</option><option>Detached</option><option>Luxury</option><option>Equestrian / Acreage</option><option>Estate Sale / Probate</option><option>Condo</option><option>Townhouse</option></select></div>
        <div className="field"><label>Budget Range *</label><select required value={f.budget_range} onChange={e=>setF({...f,budget_range:e.target.value})}><option value="">Select…</option><option>Under $750K</option><option>$750K – $1.25M</option><option>$1.25M – $2M</option><option>$2M – $3M</option><option>$3M – $5M</option><option>$5M+</option></select></div>
        <div className="field"><label>Timeline *</label><select required value={f.timeline} onChange={e=>setF({...f,timeline:e.target.value})}><option value="">Select…</option><option>0-3 months</option><option>3-6 months</option><option>6-12 months</option><option>12+ months</option></select></div>
        <div className="field"><label>Financing *</label><select required value={f.financing_status} onChange={e=>setF({...f,financing_status:e.target.value})}><option value="">Select…</option><option>Pre-approved</option><option>Working on it</option><option>Cash buyer</option><option>Need information</option></select></div>
        <div className="field"><label>Preferred Contact</label><select value={f.preferred_contact} onChange={e=>setF({...f,preferred_contact:e.target.value})}><option value="email">Email</option><option value="phone">Phone</option><option value="text">Text</option></select></div>
      </div>
      <div style={{marginTop:"1rem"}} className="field"><label>Areas of interest (BC only)</label><input placeholder="e.g. Langley, White Rock, Whistler" onChange={e=>setF({...f,areas:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}/></div>
      <div style={{marginTop:"1rem"}} className="field"><label>Notes</label><textarea rows="3" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></div>
      <div style={{marginTop:"1rem"}} className="field"><label className="check"><input type="checkbox" checked={f.first_time_buyer} onChange={e=>setF({...f,first_time_buyer:e.target.checked})}/> I am a first-time home buyer</label></div>
      <div className="field"><label className="check"><input type="checkbox" checked={f.working_with_realtor} onChange={e=>setF({...f,working_with_realtor:e.target.checked})} data-testid="buyer-under-contract"/> I am currently under contract with another REALTOR®</label></div>
      {f.working_with_realtor && <div className="notice" data-testid="buyer-under-contract-block" style={{background:"#FEF3C7",borderColor:"#D97706",marginTop:"0.75rem",fontFamily:"Inter,sans-serif",fontSize:"0.92rem",lineHeight:1.6}}>Thank you — but because you're already under contract with another REALTOR®, Doug isn't able to help you directly. Feel free to ask Doogie general questions or view the <Link to="/communities" style={{color:"var(--brand-blue)",fontWeight:600}}>Communities</Link> and <Link to="/glossary" style={{color:"var(--brand-blue)",fontWeight:600}}>Glossary</Link> pages.</div>}
      <div className="field"><label className="check"><input required type="checkbox" checked={f.casl_consent} onChange={e=>setF({...f,casl_consent:e.target.checked})} data-testid="buyer-casl"/> I consent to receive commercial electronic messages from EZtoFind.ca (CASL). I can unsubscribe anytime.</label></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.pipa_ack} onChange={e=>setF({...f,pipa_ack:e.target.checked})} data-testid="buyer-pipa"/> I acknowledge the <Link to="/privacy" style={{color:"var(--brand-blue)"}}>Privacy Policy (PIPA)</Link>.</label></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}}>{err}</div>}
      <button type="submit" disabled={f.working_with_realtor} className="btn btn-primary" style={{marginTop:"1.5rem",opacity:f.working_with_realtor?0.5:1,cursor:f.working_with_realtor?"not-allowed":"pointer"}} data-testid="buyer-submit">Submit</button>
    </form>
  </div></section>);
};

const SellerForm = () => {
  const [f,setF] = useState({full_name:"",email:"",phone:"",property_address:"",city:"",property_type:"",timeline:"",estimated_value:"",currently_listed:false,reason:"",casl_consent:false,pipa_ack:false});
  const [done,setDone]=useState(false); const [err,setErr]=useState("");
  const submit = async e => { e.preventDefault(); setErr(""); try{ await axios.post(`${API}/leads/seller`,f); setDone(true);}catch(x){setErr("Please complete required fields and consents.");} };
  if(done) return <section className="section"><div className="container-x" style={{maxWidth:"36rem",textAlign:"center"}}><img src={DOOGIE_CELEBRATE} style={{width:200,margin:"0 auto"}} alt="Doogie"/><h1 className="section-title">Thank you!</h1><p className="section-sub">Doug will reach out within 1 business day.</p><Link to="/" className="btn btn-primary" style={{marginTop:"1.5rem"}}>Back home</Link></div></section>;
  return (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
    <div className="eyebrow">Seller Intake</div><h1 className="section-title">Let's talk about your property</h1>
    <div className="notice" style={{background:"#F0F4FB",borderColor:"rgba(15,42,91,0.15)",marginBottom:"1.5rem",fontFamily:"Inter,sans-serif",fontSize:"0.88rem",lineHeight:1.6}} data-testid="seller-dorts-notice"><strong>BCFSA Consumer Notice — Please read before submitting:</strong> Submitting this form does not create a REALTOR®-client relationship. Under the Real Estate Services Rules, Doug LeMaire, REALTOR® will provide you with a formal <Link to="/dorts" style={{color:"var(--brand-blue)",fontWeight:600}}>Disclosure of Representation in Trading Services (DoRTS)</Link> before providing real estate services. Please also review <Link to="/working-with-a-realtor" style={{color:"var(--brand-blue)",fontWeight:600}}>Working with a REALTOR®</Link> to understand your rights as a consumer.</div>
    <form onSubmit={submit} className="paper" data-testid="seller-form">
      <div className="form-grid">
        <div className="field"><label>Full Name *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})}/></div>
        <div className="field"><label>Email *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></div>
        <div className="field"><label>Phone *</label><input required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></div>
        <div className="field"><label>City (BC) *</label><input required value={f.city} onChange={e=>setF({...f,city:e.target.value})}/></div>
      </div>
      <div style={{marginTop:"1rem"}} className="field"><label>Property Address *</label><input required value={f.property_address} onChange={e=>setF({...f,property_address:e.target.value})}/></div>
      <div className="form-grid" style={{marginTop:"1rem"}}>
        <div className="field"><label>Property Type *</label><select required value={f.property_type} onChange={e=>setF({...f,property_type:e.target.value})}><option value="">Select…</option><option>Detached</option><option>Luxury</option><option>Equestrian / Acreage</option><option>Estate Sale / Probate</option><option>Condo</option><option>Townhouse</option></select></div>
        <div className="field"><label>Timeline to List *</label><select required value={f.timeline} onChange={e=>setF({...f,timeline:e.target.value})}><option value="">Select…</option><option>ASAP</option><option>1-3 months</option><option>3-6 months</option><option>6-12 months</option><option>Just exploring</option></select></div>
        <div className="field"><label>Estimated Value *</label><select required value={f.estimated_value} onChange={e=>setF({...f,estimated_value:e.target.value})}><option value="">Select…</option><option>Under $750K</option><option>$750K – $1.5M</option><option>$1.5M – $3M</option><option>$3M – $5M</option><option>$5M+</option></select></div>
      </div>
      <div style={{marginTop:"1rem"}} className="field"><label className="check"><input type="checkbox" checked={f.currently_listed} onChange={e=>setF({...f,currently_listed:e.target.checked})} data-testid="seller-currently-listed"/> The property is currently listed with another REALTOR®</label></div>
      {f.currently_listed && <div className="notice" data-testid="seller-currently-listed-block" style={{background:"#FEF3C7",borderColor:"#D97706",marginTop:"0.75rem",fontFamily:"Inter,sans-serif",fontSize:"0.92rem",lineHeight:1.6}}>Thank you — but because your property is currently listed with another REALTOR®, Doug isn't able to help you directly. Feel free to ask Doogie general questions or view the <Link to="/communities" style={{color:"var(--brand-blue)",fontWeight:600}}>Communities</Link> and <Link to="/glossary" style={{color:"var(--brand-blue)",fontWeight:600}}>Glossary</Link> pages.</div>}
      <div style={{marginTop:"1rem"}} className="field"><label>Reason for selling (optional)</label><textarea rows="3" value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.casl_consent} onChange={e=>setF({...f,casl_consent:e.target.checked})}/> I consent to receive commercial electronic messages (CASL).</label></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.pipa_ack} onChange={e=>setF({...f,pipa_ack:e.target.checked})}/> I acknowledge the Privacy Policy (PIPA).</label></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626"}}>{err}</div>}
      <button type="submit" disabled={f.currently_listed} className="btn btn-primary" style={{marginTop:"1.5rem",opacity:f.currently_listed?0.5:1,cursor:f.currently_listed?"not-allowed":"pointer"}} data-testid="seller-submit">Submit</button>
    </form>
  </div></section>);
};

// --- REALTOR® network (3 stages) ---
const RealtorApply = () => {
  const [f,setF]=useState({full_name:"",email:"",brokerage:"",realtor_number:""}); const [res,setRes]=useState(null); const [err,setErr]=useState("");
  const submit=async e=>{e.preventDefault(); setErr(""); try{ const r=await axios.post(`${API}/realtors/apply`,f); setRes(r.data);}catch(x){setErr("Try again.");} };
  return (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
    <img src={DOOGIE_POINT_R} alt="Doogie" style={{width:140,marginBottom:"1rem"}}/>
    <div className="eyebrow">For REALTORS® Only</div><h1 className="section-title">Join our BC referral network</h1>
    {res ? <div className="paper"><h3 style={{marginTop:0}}>Application received ✓</h3><p style={{fontFamily:"Inter,sans-serif"}}>{res.message}</p></div>
      : <form onSubmit={submit} className="paper" data-testid="realtor-apply-form">
          <div className="form-grid">
            <div className="field"><label>Full Name *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} data-testid="realtor-name"/></div>
            <div className="field"><label>Email *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="realtor-email"/></div>
            <div className="field"><label>Brokerage Name *</label><input required value={f.brokerage} onChange={e=>setF({...f,brokerage:e.target.value})} data-testid="realtor-brokerage"/></div>
            <div className="field"><label>Membership Number *</label><input required value={f.realtor_number} onChange={e=>setF({...f,realtor_number:e.target.value})} data-testid="realtor-number"/></div>
          </div>
          {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}}>{err}</div>}
          <button type="submit" className="btn btn-primary" style={{marginTop:"1.25rem"}} data-testid="realtor-submit">Submit</button>
        </form>}
  </div></section>);
};

const RealtorCredentials = () => {
  const {id} = useParams();
  const [f,setF] = useState({brokerage:"",realtor_number:"",is_realtor_confirmed:false});
  const [done,setDone]=useState(false); const [err,setErr]=useState("");
  const submit=async e=>{e.preventDefault(); setErr(""); if(!f.is_realtor_confirmed){setErr("You must confirm you are a REALTOR® (CREA member).");return;} try{ await axios.post(`${API}/realtors/${id}/credentials`,f); setDone(true);}catch(x){setErr("Error submitting.");} };
  if(done) return <section className="section container-x" style={{maxWidth:"36rem"}}><h1 className="section-title">Step 2 complete ✓</h1><p>Once we verify your BCFSA license and REALTOR® status, we'll email you the final profile form. Watch your inbox.</p><Link to="/" className="btn btn-primary">Home</Link></section>;
  return (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
    <div className="eyebrow">Referral Network — Step 2 of 3</div><h1 className="section-title">Credentials Verification</h1>
    <form onSubmit={submit} className="paper">
      <div className="field"><label>Brokerage Name *</label><input required value={f.brokerage} onChange={e=>setF({...f,brokerage:e.target.value})}/></div>
      <div className="field" style={{marginTop:"1rem"}}><label>BCFSA REALTOR® Number *</label><input required value={f.realtor_number} onChange={e=>setF({...f,realtor_number:e.target.value})}/></div>
      <div className="field" style={{marginTop:"1rem"}}><label className="check"><input required type="checkbox" checked={f.is_realtor_confirmed} onChange={e=>setF({...f,is_realtor_confirmed:e.target.checked})}/> I confirm I am a REALTOR® (a CREA member), not just a licensed agent.</label></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626"}}>{err}</div>}
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}}>Submit Credentials</button>
    </form>
  </div></section>);
};

// --- About ---
const About = () => (<section className="section"><div className="container-x" style={{maxWidth:"56rem"}}>
  <div className="eyebrow">About</div><h1 className="section-title">Doug LeMaire, REALTOR®</h1>
  <div style={{display:"flex",gap:"2rem",flexWrap:"wrap",alignItems:"flex-start",marginTop:"2rem"}}>
    <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire, REALTOR®" style={{width:280,height:340,objectFit:"cover",borderRadius:16,boxShadow:"0 12px 32px rgba(15,42,91,0.15)"}}/>
    <div style={{flex:1,minWidth:280,fontFamily:"Inter,sans-serif",lineHeight:1.75,color:"var(--ink)"}}>
      <p>Doug specializes in <strong>detached homes, luxury properties, equestrian &amp; acreage estates, estate sales/probate, and residential strata's</strong> across Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor.</p>
      <p><strong>Brokerage:</strong> Fraser Property Management Realty Services Ltd.</p>
    </div>
  </div>
  <div style={{display:"flex",justifyContent:"center",gap:"2rem",marginTop:"3rem",flexWrap:"wrap",fontFamily:"Inter,sans-serif",textAlign:"center",alignItems:"stretch"}} data-testid="about-trust-badges">
    {[
      {icon:"🛡️",title:"Licensed REALTOR®",sub:"BC Financial Services Authority"},
      {icon:"📍",title:"Local Expert",sub:"Greater Vancouver, Fraser Valley, Sea to Sky Corridor"},
      {icon:"⏱️",title:"13 Years",sub:"BC Real Estate Experience"}
    ].map((b,i) => (
      <div key={i} style={{flex:"0 0 220px",maxWidth:220,display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{fontSize:"1.75rem",marginBottom:"0.5rem",lineHeight:1}}>{b.icon}</div>
        <div style={{fontWeight:700,color:"var(--brand-navy)",fontSize:"0.95rem"}}>{b.title}</div>
        <div style={{fontSize:"0.82rem",color:"var(--muted)",lineHeight:1.4,marginTop:"0.25rem",minHeight:"2.8em",display:"flex",alignItems:"center",justifyContent:"center"}}>{b.sub}</div>
      </div>
    ))}
  </div>
</div></section>);

// --- Contact ---
const Contact = () => (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
  <div className="eyebrow">Contact</div><h1 className="section-title">Get in touch</h1>
  <div className="paper" style={{fontFamily:"Inter,sans-serif",lineHeight:1.9}}>
    <p><strong>General:</strong> <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a></p>
    <p><strong>REALTORS®:</strong> <a href="mailto:realtors@eztofind.ca" style={{color:"var(--brand-blue)"}}>realtors@eztofind.ca</a></p>
    <p><strong>Referral leads:</strong> <a href="mailto:referral@eztofind.ca" style={{color:"var(--brand-blue)"}}>referral@eztofind.ca</a></p>
    <hr style={{margin:"1.5rem 0",border:"none",borderTop:"1px solid rgba(15,42,91,0.1)"}}/>
    <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}><Link to="/buyer" className="btn btn-primary">Buyer Form</Link><Link to="/seller" className="btn btn-green">Seller Form</Link></div>
  </div>
</div></section>);

// --- Legal ---
const Legal = ({title,body}) => (<section className="section"><div className="container-x" style={{maxWidth:"46rem",fontFamily:"Inter,sans-serif",lineHeight:1.75,color:"var(--ink)"}}><h1 className="section-title">{title}</h1>{body}</div></section>);
const Privacy = () => <Legal title="Privacy Policy (PIPA)" body={<><p>EZtoFind.ca collects personal information under British Columbia's Personal Information Protection Act (PIPA). We collect information you voluntarily provide via forms and Doogie AI chat. We use it solely to respond to your inquiry, provide referrals within our network, and (with your consent) send commercial electronic messages under CASL.</p><p>Data is stored on secured servers. You may request access, correction, or deletion at any time by emailing info@eztofind.ca. Our Privacy Officer: Doug LeMaire, Fraser Property Management Realty Services Ltd.</p><p>We do not sell your data. We may share your inquiry with a vetted REALTOR® in our referral network only if it falls outside Doug's focus areas or specialties — and only with your submission of a lead form indicating consent.</p><h3 style={{marginTop:"2rem"}}>Data Residency & Hosting</h3><p>Personal information collected via EZtoFind.ca is stored in a MongoDB database managed by our platform provider (Emergent). Data may be transiently processed by our AI provider (Anthropic Claude) for the sole purpose of powering the Doogie AI assistant. All providers are contractually bound to industry-standard security. If our hosting region changes materially, this policy will be updated and posted here.</p><h3 style={{marginTop:"2rem"}}>Retention</h3><p>Doogie chat messages are automatically purged after 30 days via MongoDB TTL. Buyer/seller lead records and REALTOR® application data are retained for 7 years to comply with REALTOR® record-keeping obligations under RESA. You may request earlier deletion at any time by emailing info@eztofind.ca.</p><h3 style={{marginTop:"2rem"}}>Consent Records (CASL)</h3><p>When you submit a form with consent, we record your email, timestamp, IP address, and browser user-agent as tamper-evident proof of consent, retained for 3 years per CASL requirements.</p><h3 style={{marginTop:"2rem"}}>Breach Notification</h3><p>In the event of a privacy breach that could reasonably result in significant harm, we will notify the Office of the Information and Privacy Commissioner for British Columbia (OIPC BC) and affected individuals as soon as feasible, in accordance with PIPA and our internal <Link to="/breach-policy" style={{color:"var(--brand-blue)"}}>Breach Response Policy</Link>.</p><h3 style={{marginTop:"2rem"}}>AI Use Disclosure (BCFSA Compliance)</h3><p>EZtoFind.ca uses artificial intelligence in three specific ways: (1) <strong>Doogie</strong>, our on-site chat assistant, powered by Anthropic Claude via a compliance-vetted provider (Emergent). Chat messages are transmitted to Anthropic and, before storage in our system, are automatically scanned to redact personal identifiers such as SIN, credit card numbers, phone numbers, email addresses, postal codes, and street addresses. (2) <strong>AI-drafted content</strong> — community synopses, weather summaries, and glossary FAQs are drafted by Anthropic Claude and reviewed and approved by Doug LeMaire, REALTOR® before publication. (3) <strong>Compliance guardrails</strong> — Doogie is prompt-engineered to never provide financial, legal, tax, or property-specific advice; those matters are routed to a licensed REALTOR®.</p><p>Under BCFSA's AI Guidelines, licensees remain responsible for all AI-generated output. Please do not share confidential information (full names, addresses, financial details, negotiations) with Doogie. For personalized advice, contact Doug directly.</p></>}/>;

const BreachPolicy = () => <Legal title="Privacy Breach Response Policy" body={<><p>EZtoFind.ca is committed to protecting personal information collected under the BC Personal Information Protection Act (PIPA). This policy outlines the steps we will take in the event of a privacy breach.</p><h3>What constitutes a breach</h3><p>A privacy breach means the unauthorized access, collection, use, disclosure, disposal, or loss of personal information. Examples: a database misconfiguration exposing lead information, unauthorized access to admin systems, phishing that compromises an account, or loss of a device containing personal information.</p><h3>Response steps</h3><p><strong>Step 1 — Contain (immediate):</strong> Isolate affected systems, revoke exposed credentials, stop the ongoing loss.</p><p><strong>Step 2 — Assess (within 24 hours):</strong> Determine scope: what data, how many individuals, what risk of significant harm.</p><p><strong>Step 3 — Notify (within 72 hours if significant harm is reasonably possible):</strong> Notify the Office of the Information and Privacy Commissioner for BC (OIPC) at <a href="mailto:privacyhelp@oipc.bc.ca" style={{color:"var(--brand-blue)"}}>privacyhelp@oipc.bc.ca</a> and each affected individual, describing what happened, what data was involved, and what steps we are taking.</p><p><strong>Step 4 — Remediate:</strong> Fix the root cause, update controls, document lessons learned.</p><p><strong>Step 5 — Record:</strong> All breaches are logged internally with description, affected records, and remediation steps, retained for 3 years.</p><h3>Privacy Officer</h3><p>Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd. — info@eztofind.ca. Report a suspected breach anytime, including outside business hours.</p></>}/>;
const Terms = () => <Legal title="Terms of Use" body={<><p>EZtoFind.ca provides general information about British Columbia real estate. Doogie (our AI assistant) does not provide financial, legal, tax, or investment advice. For advice, consult a licensed REALTOR®, lawyer, or accountant.</p><p>Listings data is provided under license from participating MLS® systems via an embedded iframe from Greater Vancouver For Sale. REALTOR® and MLS® are certification marks owned by the Canadian Real Estate Association (CREA).</p></>}/>;

const Complaints = () => <Legal title="Complaints & Concerns" body={<>
  <p>EZtoFind.ca is committed to the highest standards of consumer protection. If you have a concern about our conduct, the content on this site, or a real estate service provided by Doug LeMaire, REALTOR®, please raise it as follows:</p>
  <h3 style={{marginTop:"1.5rem"}}>Step 1 — Contact us directly</h3>
  <p>Email <strong>info@eztofind.ca</strong> with your concern. We will acknowledge receipt within 2 business days and respond within 10 business days.</p>
  <h3 style={{marginTop:"1.5rem"}}>Step 2 — Escalate to the brokerage</h3>
  <p>If your concern is not resolved, contact the Managing Broker at <strong>Fraser Property Management Realty Services Ltd.</strong></p>
  <h3 style={{marginTop:"1.5rem"}}>Step 3 — External regulators</h3>
  <ul>
    <li><strong>Real Estate Services complaint:</strong> British Columbia Financial Services Authority (BCFSA) — <a href="https://www.bcfsa.ca" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>bcfsa.ca</a> · Toll-free 1-866-206-3030 · complaints@bcfsa.ca</li>
    <li><strong>REALTOR® Code of Ethics complaint:</strong> Greater Vancouver REALTORS® (GVR) — <a href="https://www.gvrealtors.ca" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>gvrealtors.ca</a></li>
    <li><strong>Privacy complaint:</strong> Office of the Information and Privacy Commissioner for BC (OIPC) — <a href="https://www.oipc.bc.ca" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>oipc.bc.ca</a> · 1-800-663-7867 · info@oipc.bc.ca</li>
    <li><strong>Unwanted commercial email (CASL) complaint:</strong> Canadian Radio-television and Telecommunications Commission (CRTC) Spam Reporting Centre — <a href="https://fightspam.gc.ca" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>fightspam.gc.ca</a></li>
    <li><strong>Errors & Omissions Insurance:</strong> BCFSA Real Estate Errors and Omissions Insurance Corporation coverage applies to all licensed BC REALTORS®.</li>
  </ul>
  <p style={{marginTop:"1.5rem",fontSize:"0.9rem",color:"var(--muted)"}}>You have the right to escalate directly to any of the above authorities without contacting us first. We will not retaliate against any person who files a complaint.</p>
</>}/>;

const DoRTS = () => <Legal title="Disclosure of Representation in Trading Services (DoRTS)" body={<>
  <p><strong>Under the Real Estate Services Rules of the British Columbia Financial Services Authority (BCFSA), a REALTOR® must provide you with a formal Disclosure of Representation in Trading Services form at the earliest reasonable opportunity — before providing any real estate service.</strong></p>
  <p>This disclosure explains:</p>
  <ul>
    <li>Whether the REALTOR® will be representing you as a client (with fiduciary duties: loyalty, avoid conflicts, full disclosure, confidentiality, use reasonable skill and care) — or whether the REALTOR® will only be providing services to you as an unrepresented consumer (no fiduciary duties, and any information you share can be used to benefit the other party in a transaction).</li>
    <li>The name of the licensee and their brokerage.</li>
    <li>Your right to seek independent legal advice.</li>
  </ul>
  <h3 style={{marginTop:"1.5rem"}}>Doug's practice</h3>
  <p>Doug LeMaire, REALTOR® will deliver a signed BCFSA-issued <em>Disclosure of Representation in Trading Services</em> form before providing any real estate service to you. Nothing on this website — including any Doogie AI response, buyer intake form submission, or general glossary/community content — creates a REALTOR®-client relationship.</p>
  <h3 style={{marginTop:"1.5rem"}}>Download the official BCFSA form</h3>
  <p><a href="https://www.bcfsa.ca/industry-resources/real-estate-professional-resources/knowledge-base/forms" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>BCFSA Real Estate Forms Library →</a></p>
</>}/>;

const WorkingWithRealtor = () => <Legal title="Working with a REALTOR®" body={<>
  <p><strong>Before you engage a REALTOR® in British Columbia, you have important consumer protections and rights.</strong> BCFSA and CREA publish a consumer guide titled <em>Working with a REALTOR®</em> explaining these protections.</p>
  <h3 style={{marginTop:"1.5rem"}}>Your key rights</h3>
  <ul>
    <li><strong>Right to representation:</strong> You may choose to be represented as a client, or to remain unrepresented. A REALTOR® must disclose their role at the earliest opportunity (see <Link to="/dorts" style={{color:"var(--brand-blue)"}}>DoRTS</Link>).</li>
    <li><strong>Right to written agreements:</strong> Any buyer's or seller's agency relationship must be documented in a written service agreement.</li>
    <li><strong>Right to confidentiality:</strong> A REALTOR® who represents you as a client owes you a fiduciary duty of confidentiality, even after the relationship ends.</li>
    <li><strong>Right to disclosure of remuneration:</strong> The REALTOR® must disclose all forms of remuneration and any referral fees before you sign.</li>
    <li><strong>Right to independent legal advice:</strong> You may consult a lawyer or notary at any point.</li>
  </ul>
  <h3 style={{marginTop:"1.5rem"}}>Referral fees</h3>
  <p>If Doug refers you to another licensed BC REALTOR® in our referral network, a referral fee may be paid to Doug LeMaire by the receiving REALTOR® (typically 25% of the receiving REALTOR's commission). This does not increase the cost to you as the consumer. The receiving REALTOR® will disclose this in writing before you sign a service agreement.</p>
  <h3 style={{marginTop:"1.5rem"}}>Download the official brochures</h3>
  <ul>
    <li><a href="https://www.bcfsa.ca" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>BCFSA — Working with a REALTOR® (consumer guide)</a></li>
    <li><a href="https://www.crea.ca/working-with-a-realtor/" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>CREA — Working with a REALTOR®</a></li>
  </ul>
</>}/>;

const CodeOfEthics = () => <Legal title="REALTOR® Code of Ethics" body={<>
  <p>Doug LeMaire, REALTOR® is a member of the <strong>Canadian Real Estate Association (CREA)</strong> and the <strong>Greater Vancouver REALTORS® (GVR)</strong>. As a REALTOR® — a designation carrying trademark protection — Doug is bound by the <strong>REALTOR® Code of Ethics and Standards of Business Practice</strong>.</p>
  <h3 style={{marginTop:"1.5rem"}}>Key articles applicable to this website</h3>
  <ul>
    <li><strong>Article 3 — Competent Service:</strong> REALTORS® shall render a skilled and conscientious service, in conformity with the standards of practice of their profession.</li>
    <li><strong>Article 4 — Discovery of Facts:</strong> REALTORS® shall endeavor to discover facts pertaining to every property they list or for which they act.</li>
    <li><strong>Article 7 — Advertising:</strong> Advertising shall be honest and truthful. Doug's licensee identification, brokerage, and CREA trademark notices appear on every page of this website.</li>
    <li><strong>Article 16 — Respect for other REALTORS®' clients:</strong> A REALTOR® shall not solicit a buyer or seller who is currently under a written service agreement with another REALTOR®. If you have signed a buyer's agency agreement with another REALTOR®, the Buyer Intake form on this site is blocked from submission (see the checkbox on <Link to="/buyer" style={{color:"var(--brand-blue)"}}>the Buyer form</Link>).</li>
    <li><strong>Article 17 — Cooperation between REALTORS®:</strong> REALTORS® must cooperate on transactions in a manner consistent with client interests.</li>
  </ul>
  <h3 style={{marginTop:"1.5rem"}}>Full Code</h3>
  <p><a href="https://www.crea.ca/realtor-code/" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>Read the full REALTOR® Code on CREA.ca →</a></p>
  <h3 style={{marginTop:"1.5rem"}}>Concerns about a REALTOR®?</h3>
  <p>Ethics complaints against a REALTOR® in the Greater Vancouver area may be filed with <a href="https://www.gvrealtors.ca" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>Greater Vancouver REALTORS® (GVR)</a>. Complaints about a licensee's conduct as a real estate licensee may be filed with <a href="https://www.bcfsa.ca" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>BCFSA</a>. See our <Link to="/complaints" style={{color:"var(--brand-blue)"}}>Complaints & Concerns</Link> page.</p>
</>}/>;
const Compliance = () => <Legal title="Compliance & Disclosures" body={<><p><strong>BCFSA:</strong> Doug LeMaire is a licensed REALTOR® in British Columbia. All advice-giving occurs through licensed practice — never through the Doogie AI.</p><p><strong>CREA / GVR / MLS®:</strong> This site respects CREA's REALTOR® / MLS® trademark rules. Listings are displayed via a compliant iframe from a licensed data source.</p><p><strong>PIPA:</strong> See <Link to="/privacy">Privacy Policy</Link>.</p><p><strong>CASL:</strong> All marketing communications require explicit opt-in with a working unsubscribe link.</p><p><strong>AI Guardrails:</strong> Doogie is prompted and monitored to never provide advice or property-specific recommendations that could constitute unlicensed real estate practice.</p></>}/>;

// --- Admin ---
const AdminLogin = () => {
  const [f,setF] = useState({email:"",password:""}); const [err,setErr]=useState(""); const nav=useNavigate();
  const submit=async e=>{e.preventDefault(); setErr(""); try{ const r=await axios.post(`${API}/admin/login`,f); localStorage.setItem("eztoken",r.data.token); nav("/admin");}catch(x){setErr("Invalid credentials");} };
  return (<section className="section"><div className="container-x" style={{maxWidth:"32rem"}}>
    <h1 className="section-title">Admin Login</h1>
    <form onSubmit={submit} className="paper">
      <div className="field"><label>Email</label><input required value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="admin-email"/></div>
      <div className="field" style={{marginTop:"1rem"}}><label>Password</label><input required type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})} data-testid="admin-password"/></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}}>{err}</div>}
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="admin-login-btn">Sign in</button>
    </form>
  </div></section>);
};

const useAdmin = () => {
  const nav = useNavigate();
  const token = localStorage.getItem("eztoken");
  useEffect(()=>{ if(!token) nav("/admin/login"); },[token,nav]);
  return {headers: {Authorization: `Bearer ${token}`}};
};

const AdminShell = ({children,active}) => {
  const nav=useNavigate();
  return (<div className="admin-shell">
    <aside className="admin-sidebar">
      <h3>Doug's Desk</h3>
      <a onClick={()=>nav("/admin")} className={active==="dash"?"active":""} data-testid="admin-nav-dash">📊 Dashboard</a>
      <a onClick={()=>nav("/admin/buyers")} className={active==="buyers"?"active":""} data-testid="admin-nav-buyers">🏠 Buyer Leads</a>
      <a onClick={()=>nav("/admin/sellers")} className={active==="sellers"?"active":""} data-testid="admin-nav-sellers">🔑 Seller Leads</a>
      <a onClick={()=>nav("/admin/realtors")} className={active==="realtors"?"active":""} data-testid="admin-nav-realtors">👥 REALTORS®</a>
      <a onClick={()=>nav("/admin/clients")} className={active==="clients"?"active":""} data-testid="admin-nav-clients">📇 CRM Clients</a>
      <a onClick={()=>nav("/admin/approvals")} className={active==="approvals"?"active":""} data-testid="admin-nav-approvals">✅ AI Content Approvals</a>
      <a onClick={()=>nav("/admin/chats")} className={active==="chats"?"active":""} data-testid="admin-nav-chats">💬 Doogie Chat Logs</a>
      <a onClick={()=>nav("/admin/policies")} className={active==="policies"?"active":""} data-testid="admin-nav-policies">📄 Broker Policies</a>
      <a onClick={()=>{localStorage.removeItem("eztoken");nav("/");}} style={{marginTop:"2rem",color:"#F5A623"}}>← Sign out</a>
    </aside>
    <main className="admin-main">{children}</main>
  </div>);
};

const AdminDash = () => {
  const {headers} = useAdmin();
  const [rem, setRem] = useState([]); const [stats, setStats] = useState({buyers:0,sellers:0,realtors:0});
  useEffect(()=>{ if(!headers) return;
    Promise.all([axios.get(`${API}/admin/reminders`,{headers}),axios.get(`${API}/admin/leads/buyer`,{headers}),axios.get(`${API}/admin/leads/seller`,{headers}),axios.get(`${API}/admin/realtors`,{headers})])
      .then(([r,b,s,rl])=>{ setRem(r.data); setStats({buyers:b.data.length,sellers:s.data.length,realtors:rl.data.length}); }).catch(()=>{});
  },[]);
  return <AdminShell active="dash">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>Welcome back, Doug 🐾</h1>
    <div className="grid-3" style={{marginTop:"1.5rem"}}>
      {[["Buyer Leads",stats.buyers],["Seller Leads",stats.sellers],["REALTORS® Applied",stats.realtors]].map(([l,n])=><div key={l} className="paper" style={{textAlign:"center"}}><div style={{fontSize:"3rem",fontWeight:700,color:"var(--brand-blue)"}}>{n}</div><div style={{color:"var(--muted)"}}>{l}</div></div>)}
    </div>
    <h2 style={{marginTop:"3rem"}}>Upcoming Reminders (next 30 days)</h2>
    <table className="admin-table" data-testid="admin-reminders">
      <thead><tr><th>Client</th><th>Type</th><th>Date</th><th>Days</th></tr></thead>
      <tbody>{rem.length===0 ? <tr><td colSpan="4" style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No upcoming reminders. Add clients with birthdays / anniversaries / possession dates in the CRM.</td></tr> : rem.map((r,i)=><tr key={i}><td>{r.client_name}</td><td>{r.type} {r.years?`(${r.years} yr)`:""}</td><td>{r.date}</td><td>{r.days_until===0?"Today!":`${r.days_until} days`}</td></tr>)}</tbody>
    </table>
  </AdminShell>;
};

const AdminList = ({title,url,cols,active}) => {
  const {headers} = useAdmin();
  const [rows,setRows]=useState([]);
  useEffect(()=>{ axios.get(`${API}${url}`,{headers}).then(r=>setRows(r.data)).catch(()=>{}); },[]);
  return <AdminShell active={active}><h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>{title}</h1>
    <table className="admin-table"><thead><tr>{cols.map(c=><th key={c[0]}>{c[1]}</th>)}</tr></thead>
      <tbody>{rows.length===0 ? <tr><td colSpan={cols.length} style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No records yet.</td></tr> : rows.map((r,i)=><tr key={i}>{cols.map(c=><td key={c[0]}>{typeof r[c[0]]==="boolean"? (r[c[0]]?"Yes":"No") : Array.isArray(r[c[0]])? r[c[0]].join(", ") : (r[c[0]]||"—")}</td>)}</tr>)}</tbody>
    </table>
  </AdminShell>;
};

const AdminClients = () => {
  const {headers} = useAdmin();
  const [rows,setRows]=useState([]); const [show,setShow]=useState(false);
  const [f,setF]=useState({full_name:"",email:"",phone:"",client_type:"buyer",birthdate:"",anniversary:"",possession_date:"",spouse_name:"",notes:""});
  const load=()=>axios.get(`${API}/admin/clients`,{headers}).then(r=>setRows(r.data)).catch(()=>{});
  useEffect(()=>{ load(); },[]);
  const add=async e=>{e.preventDefault(); await axios.post(`${API}/admin/clients`,f,{headers}); setShow(false); setF({full_name:"",email:"",phone:"",client_type:"buyer",birthdate:"",anniversary:"",possession_date:"",spouse_name:"",notes:""}); load();};
  const del=async id=>{if(!window.confirm("Delete?"))return; await axios.delete(`${API}/admin/clients/${id}`,{headers}); load();};
  return <AdminShell active="clients">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h1 className="font-display" style={{fontSize:"2rem",margin:0}}>CRM Clients</h1><button className="btn btn-primary" onClick={()=>setShow(s=>!s)} data-testid="admin-add-client">+ Add Client</button></div>
    {show && <form onSubmit={add} className="paper" style={{marginTop:"1.5rem"}}>
      <div className="form-grid">
        <div className="field"><label>Full Name *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} data-testid="client-name"/></div>
        <div className="field"><label>Email</label><input value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></div>
        <div className="field"><label>Phone</label><input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></div>
        <div className="field"><label>Type</label><select value={f.client_type} onChange={e=>setF({...f,client_type:e.target.value})}><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="past">Past Client</option><option value="sphere">Sphere</option></select></div>
        <div className="field"><label>Birthdate</label><input type="date" value={f.birthdate} onChange={e=>setF({...f,birthdate:e.target.value})} data-testid="client-birthdate"/></div>
        <div className="field"><label>Anniversary</label><input type="date" value={f.anniversary} onChange={e=>setF({...f,anniversary:e.target.value})} data-testid="client-anniv"/></div>
        <div className="field"><label>Possession Date</label><input type="date" value={f.possession_date} onChange={e=>setF({...f,possession_date:e.target.value})} data-testid="client-possession"/></div>
        <div className="field"><label>Spouse</label><input value={f.spouse_name} onChange={e=>setF({...f,spouse_name:e.target.value})}/></div>
      </div>
      <div style={{marginTop:"1rem"}} className="field"><label>Notes</label><textarea rows="2" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></div>
      <button type="submit" className="btn btn-green" style={{marginTop:"1rem"}} data-testid="client-save">Save Client</button>
    </form>}
    <table className="admin-table" style={{marginTop:"1.5rem"}}>
      <thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th>Birthday</th><th>Anniv.</th><th>Possession</th><th></th></tr></thead>
      <tbody>{rows.length===0 ? <tr><td colSpan="8" style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No clients yet.</td></tr> : rows.map(r=><tr key={r.id}><td>{r.full_name}</td><td>{r.client_type}</td><td>{r.email}</td><td>{r.phone}</td><td>{r.birthdate||"—"}</td><td>{r.anniversary||"—"}</td><td>{r.possession_date||"—"}</td><td><button onClick={()=>del(r.id)} style={{background:"transparent",border:"none",color:"#DC2626",cursor:"pointer"}}>Delete</button></td></tr>)}</tbody>
    </table>
  </AdminShell>;
};

// --- Communities (all of BC) ---
const Communities = () => {
  const [data, setData] = useState({}); const [q, setQ] = useState("");
  useEffect(() => { axios.get(`${API}/communities`).then(r => setData(r.data)); }, []);
  const filt = (arr) => q ? arr.filter(c => c.toLowerCase().includes(q.toLowerCase())) : arr;
  return (<section className="section"><div className="container-x">
    <div style={{textAlign:"center",marginBottom:"2rem"}}>
      <div className="eyebrow">All of British Columbia</div>
      <h1 className="section-title">BC Communities</h1>
      <p className="section-sub">Every incorporated municipality, village, town, district, and community across British Columbia. Doug's primary practice: Greater Vancouver, Fraser Valley, Sea-to-Sky. Elsewhere in BC? Our referral network can help.</p>
    </div>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search 400+ BC communities…" className="search-bar" style={{width:"100%",maxWidth:520,margin:"0 auto 3rem",display:"block",padding:"0.9rem 1.25rem",fontFamily:"Inter,sans-serif",border:"2px solid rgba(15,42,91,0.15)",borderRadius:999,outline:"none"}} data-testid="communities-search"/>
    {Object.entries(data).map(([region, list]) => {
      const f = filt(list); if(f.length===0) return null;
      return (<div key={region} style={{marginBottom:"2.5rem"}}>
        <h3 className="font-display" style={{fontSize:"1.5rem",marginBottom:"0.75rem"}}>{region} <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.8rem",color:"var(--muted)",fontWeight:400}}>({f.length})</span></h3>
        <div className="chip-grid">{f.map(c => <Link key={c} to={`/community/${encodeURIComponent(c.toLowerCase().replace(/[^a-z0-9]+/g,"-"))}`} state={{name:c, region}} className="chip" style={{textDecoration:"none",cursor:"pointer"}}>{c}</Link>)}</div>
      </div>);
    })}
  </div></section>);
};

const CommunityPage = () => {
  const {slug} = useParams();
  const [data, setData] = useState({});
  const [syn, setSyn] = useState(null);
  const [wx, setWx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingWx, setLoadingWx] = useState(true);
  useEffect(() => { axios.get(`${API}/communities`).then(r => setData(r.data)); }, []);
  useEffect(() => {
    setLoading(true); setSyn(null); setLoadingWx(true); setWx(null);
    axios.get(`${API}/community/${slug}/synopsis`, {timeout: 90000}).then(r => { setSyn(r.data); setLoading(false); }).catch(() => setLoading(false));
    axios.get(`${API}/community/${slug}/weather`, {timeout: 90000}).then(r => { setWx(r.data); setLoadingWx(false); }).catch(() => setLoadingWx(false));
  }, [slug]);
  let found = null, region = null;
  for(const [r, list] of Object.entries(data)) { const m = list.find(c => c.toLowerCase().replace(/[^a-z0-9]+/g,"-") === slug); if(m) { found = m; region = r; break; } }
  const isFocus = region && ["Greater Vancouver","Fraser Valley","Sea-to-Sky"].includes(region);
  const jsonLd = found ? {"@context":"https://schema.org","@type":"Place","name":`${found}, British Columbia`,"containedInPlace":{"@type":"AdministrativeArea","name":region},"description":syn?.synopsis?.substring(0,300)} : null;
  const articleLd = (found && syn?.synopsis) ? {
    "@context":"https://schema.org","@type":"Article",
    "headline":`${found}, British Columbia — Community Overview`,
    "author":{"@type":"Person","name":"Doug LeMaire, REALTOR®","affiliation":{"@type":"Organization","name":"Fraser Property Management Realty Services Ltd."}},
    "publisher":{"@type":"Organization","name":"EZtoFind.ca"},
    "about":{"@type":"Place","name":`${found}, British Columbia`},
    "inLanguage":"en-CA",
    "articleBody":syn.synopsis
  } : null;
  return (<section className="section"><div className="container-x" style={{maxWidth:"46rem"}}>
    <Link to="/communities" style={{fontFamily:"Inter,sans-serif",color:"var(--brand-blue)",textDecoration:"none"}}>← All communities</Link>
    {found ? <>
      <div className="eyebrow" style={{marginTop:"1rem"}}>{region}</div>
      <h1 className="section-title">{found}, BC</h1>
      <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7}}>
        {isFocus
          ? `${found} sits within Doug LeMaire's primary practice area. As a licensed BC REALTOR® with 13 years' experience specializing in detached, luxury, equestrian, estate-sale, and condo properties, Doug can represent buyers and sellers here directly.`
          : `Doug's primary practice is Greater Vancouver, Fraser Valley, and Sea-to-Sky — but we'll connect you with a qualified REALTOR® active in ${found} if you like.`}
      </p>
      <div style={{marginTop:"2rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
        {isFocus ? <>
          <Link to="/buyer" className="btn btn-primary">I'm Buying in {found}</Link>
          <Link to="/seller" className="btn btn-green">I'm Selling in {found}</Link>
        </> : <Link to="/referral-request" className="btn btn-primary">Request a Referral REALTOR® in {found}</Link>}
        <Link to="/listings" className="btn btn-outline">View Listings</Link>
      </div>
      <h2 style={{marginTop:"3rem",fontSize:"1.75rem"}}>About {found}</h2>
      {loading && <div style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",padding:"1rem",background:"#F8F6EF",borderRadius:10,marginTop:"0.5rem"}}>🐾 Doogie is writing a synopsis of {found}… (first visit takes ~10 seconds, then instant forever)</div>}
      {!loading && syn?.synopsis && <>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"1.02rem",lineHeight:1.75,color:"var(--ink)",whiteSpace:"pre-wrap"}} data-testid="community-synopsis" dangerouslySetInnerHTML={{__html: syn.synopsis.replace(/Referral REALTOR® link/gi,'<a href="/referral-request" style="color:var(--brand-blue);text-decoration:underline;">Referral REALTOR® link</a>')}}></div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.75rem",color:"var(--muted)",marginTop:"0.5rem",fontStyle:"italic"}}>All content on EZtoFind.ca, including Doogie's responses, the Glossary, Terms, FAQ's, community pages, weather, mortgage calculator, property transfer tax calculator is general information provided for educational purposes and is not a substitute for professional guidance tailored to your situation.</div>
      </>}
      {!loading && syn?.note && <div className="notice" style={{marginTop:"1rem"}}>{syn.note}</div>}

      <h2 style={{marginTop:"3rem",fontSize:"1.75rem"}}>☀️ Weather in {found}</h2>
      {loadingWx && <div style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",padding:"1rem",background:"#F8F6EF",borderRadius:10,marginTop:"0.5rem"}}>🐾 Doogie is preparing the local climate summary…</div>}
      {!loadingWx && wx?.weather && <>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"1.02rem",lineHeight:1.75,color:"var(--ink)",whiteSpace:"pre-wrap"}} data-testid="community-weather">{wx.weather}</div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.75rem",color:"var(--muted)",marginTop:"0.5rem",fontStyle:"italic"}}>All content on EZtoFind.ca, including Doogie's responses, the Glossary, Terms, FAQ's, community pages, weather, mortgage calculator, property transfer tax calculator is general information provided for educational purposes and is not a substitute for professional guidance tailored to your situation.</div>
      </>}
      {!loadingWx && wx?.note && <div className="notice" style={{marginTop:"1rem"}}>{wx.note}</div>}

      {articleLd && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleLd)}}/>}
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>}
    </> : <><h1 className="section-title">Loading…</h1></>}
  </div></section>);
};

// --- Home Valuation ---
const Valuation = () => {
  const [f, setF] = useState({full_name:"",email:"",phone:"",property_address:"",city:"",property_type:"Detached",timeline:"3-6 months",estimated_value:"Not sure",currently_listed:false,reason:"Just curious about current value",casl_consent:false,pipa_ack:false});
  const [done,setDone]=useState(false); const [err,setErr]=useState("");
  const submit = async e => { e.preventDefault(); setErr(""); try{ await axios.post(`${API}/leads/seller`,f); setDone(true);}catch(x){setErr("Please complete required fields and consents.");} };
  if(done) return <section className="section"><div className="container-x" style={{maxWidth:"36rem",textAlign:"center"}}><img src={DOOGIE_CELEBRATE} style={{width:200,margin:"0 auto"}} alt="Doogie"/><h1 className="section-title">On its way!</h1><p className="section-sub">Doug will prepare a comparative market analysis and reach out within 1 business day.</p></div></section>;
  return (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
    <img src={DOOGIE_POINT_L} alt="Doogie" style={{width:120,marginBottom:"1rem"}}/>
    <div className="eyebrow">Free · No Obligation</div><h1 className="section-title">Curious what your home could be worth?</h1>
    <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",lineHeight:1.7,marginBottom:"1.5rem"}}>Get a free market estimate from Doug within 24 hours.</p>
    <form onSubmit={submit} className="paper" data-testid="valuation-form">
      <div className="form-grid">
        <div className="field"><label>Full Name *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})}/></div>
        <div className="field"><label>Email *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></div>
        <div className="field"><label>Phone *</label><input required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></div>
        <div className="field"><label>City (BC) *</label><input required value={f.city} onChange={e=>setF({...f,city:e.target.value})}/></div>
      </div>
      <div style={{marginTop:"1rem"}} className="field"><label>Property Address *</label><input required value={f.property_address} onChange={e=>setF({...f,property_address:e.target.value})}/></div>
      <div className="form-grid" style={{marginTop:"1rem"}}>
        <div className="field"><label>Property Type</label><select value={f.property_type} onChange={e=>setF({...f,property_type:e.target.value})}><option>Detached</option><option>Luxury</option><option>Equestrian / Acreage</option><option>Estate Sale / Probate</option><option>Condo</option><option>Townhouse</option></select></div>
        <div className="field"><label>When are you thinking of selling?</label><select value={f.timeline} onChange={e=>setF({...f,timeline:e.target.value})}><option>ASAP</option><option>1-3 months</option><option>3-6 months</option><option>6-12 months</option><option>Just curious</option></select></div>
      </div>
      <div className="field" style={{marginTop:"1rem"}}><label className="check"><input required type="checkbox" checked={f.casl_consent} onChange={e=>setF({...f,casl_consent:e.target.checked})}/> I consent to receive commercial electronic messages (CASL).</label></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.pipa_ack} onChange={e=>setF({...f,pipa_ack:e.target.checked})}/> I acknowledge the Privacy Policy (PIPA).</label></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626"}}>{err}</div>}
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="valuation-submit">Get My Valuation</button>
    </form>
  </div></section>);
};

// --- Referral Request (out-of-area) ---
const ReferralRequest = () => {
  const [f,setF]=useState({full_name:"",email:"",phone:"",areas:[],property_type:"Detached",budget_range:"Not sure",timeline:"3-6 months",financing_status:"Working on it",first_time_buyer:false,working_with_realtor:false,notes:"",casl_consent:false,pipa_ack:false});
  const [city,setCity]=useState(""); const [done,setDone]=useState(false); const [err,setErr]=useState("");
  const submit=async e=>{e.preventDefault(); setErr(""); try{ await axios.post(`${API}/leads/buyer`,{...f,areas:[city],notes:`OUT-OF-AREA REFERRAL REQUEST — ${city}. ${f.notes}`}); setDone(true);}catch(x){setErr("Please complete required fields.");} };
  if(done) return <section className="section"><div className="container-x" style={{maxWidth:"36rem",textAlign:"center"}}><img src={DOOGIE_CELEBRATE} style={{width:200,margin:"0 auto"}} alt="Doogie"/><h1 className="section-title">Referral request received!</h1><p className="section-sub">We'll match you with a vetted REALTOR® active in your area within 1 business day.</p></div></section>;
  return (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
    <div className="eyebrow">BC-Wide Referral</div><h1 className="section-title">Need a REALTOR® outside Doug's focus area?</h1>
    <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",lineHeight:1.7,marginBottom:"1.5rem"}}>Doug's primary practice is Greater Vancouver, Fraser Valley, and Sea-to-Sky. For any other BC community, we'll connect you with a vetted REALTOR® from our referral network.</p>
    <form onSubmit={submit} className="paper" data-testid="referral-form">
      <div className="form-grid">
        <div className="field"><label>Full Name *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})}/></div>
        <div className="field"><label>Email *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></div>
        <div className="field"><label>Phone *</label><input required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></div>
        <div className="field"><label>BC City/Community *</label><input required value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Kelowna, Nelson, Prince George"/></div>
        <div className="field"><label>Property Type</label><select value={f.property_type} onChange={e=>setF({...f,property_type:e.target.value})}><option>Detached</option><option>Condo</option><option>Townhouse</option><option>Acreage / Rural</option><option>Luxury</option></select></div>
        <div className="field"><label>Budget</label><select value={f.budget_range} onChange={e=>setF({...f,budget_range:e.target.value})}><option>Under $500K</option><option>$500K – $1M</option><option>$1M – $2M</option><option>$2M+</option><option>Not sure</option></select></div>
      </div>
      <div style={{marginTop:"1rem"}} className="field"><label>Anything else we should know?</label><textarea rows="3" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></div>
      <div className="field" style={{marginTop:"1rem"}}><label className="check"><input required type="checkbox" checked={f.casl_consent} onChange={e=>setF({...f,casl_consent:e.target.checked})}/> I consent to CASL commercial messages.</label></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.pipa_ack} onChange={e=>setF({...f,pipa_ack:e.target.checked})}/> I acknowledge the Privacy Policy.</label></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626"}}>{err}</div>}
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}}>Request Referral</button>
    </form>
  </div></section>);
};

// --- Calculators (Mortgage + PTT — stacked, independent) ---
const fmtDollar = n => "$"+Math.round(n).toLocaleString();

const MortgageCalculator = () => {
  const [priceStr,setPriceStr]=useState("850,000");
  const [downStr,setDownStr]=useState("170,000");
  const [rate,setRate]=useState(5.5);
  const [amort,setAmort]=useState(25);
  const price = Number(priceStr.replace(/[^0-9]/g,""))||0;
  const down = Number(downStr.replace(/[^0-9]/g,""))||0;
  const principal = Math.max(price - down, 0);
  const r = (rate/100)/12; const n = amort*12;
  const monthly = r>0 ? (principal*r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1) : (n>0 ? principal/n : 0);
  const totalCost = monthly * n;
  const totalInterest = Math.max(totalCost - principal, 0);
  const onMoney = setter => e => {
    const raw = e.target.value.replace(/[^0-9]/g,"");
    setter(raw ? Number(raw).toLocaleString() : "");
  };
  const FieldBox = ({label, prefix, children}) => (
    <div style={{flex:"1 1 240px",minWidth:220}}>
      <label style={{fontFamily:"Inter,sans-serif",fontWeight:600,color:"var(--brand-navy)",fontSize:"0.9rem",display:"block",marginBottom:"0.4rem"}}>{label}</label>
      <div style={{position:"relative",background:"rgba(240,244,251,0.5)",border:"1px solid rgba(15,42,91,0.1)",borderRadius:999,padding:"0.85rem 1rem 0.85rem 2.4rem",fontFamily:"Inter,sans-serif"}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"var(--muted)",fontSize:"1rem"}}>{prefix}</span>
        {children}
      </div>
    </div>
  );
  return (
    <div className="paper" data-testid="mortgage-calculator" style={{background:"#F7FAFF"}}>
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem"}}>
        <img src={DOOGIE_POINT_L_T} alt="Doogie" style={{width:72,height:72,borderRadius:"50%",background:"#fff",border:"3px solid var(--brand-gold)",objectFit:"cover"}}/>
        <div>
          <h2 className="font-display" style={{fontSize:"1.55rem",margin:0,color:"var(--brand-navy)"}}>Mortgage Calculator</h2>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.9rem",color:"var(--muted)",marginTop:"0.25rem"}}>Estimate your monthly payments.</div>
        </div>
      </div>

      <div style={{display:"flex",flexWrap:"wrap",gap:"1rem"}}>
        <FieldBox label="Home Price" prefix="$">
          <input value={priceStr} onChange={onMoney(setPriceStr)} inputMode="numeric" data-testid="mortgage-price" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)"}}/>
        </FieldBox>
        <FieldBox label="Down Payment" prefix="$">
          <input value={downStr} onChange={onMoney(setDownStr)} inputMode="numeric" data-testid="mortgage-down" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)"}}/>
        </FieldBox>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"1rem",marginTop:"1rem"}}>
        <FieldBox label="Interest Rate (%)" prefix="%">
          <input type="number" step="0.05" value={rate} onChange={e=>setRate(+e.target.value||0)} data-testid="mortgage-rate" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)"}}/>
        </FieldBox>
        <FieldBox label="Amortization (years)" prefix="📅">
          <select value={amort} onChange={e=>setAmort(+e.target.value)} data-testid="mortgage-amort" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)",appearance:"none"}}>
            <option value={15}>15 years</option>
            <option value={20}>20 years</option>
            <option value={25}>25 years</option>
            <option value={30}>30 years</option>
          </select>
        </FieldBox>
      </div>

      <div style={{background:"#F0F4FB",borderRadius:12,marginTop:"1.5rem",padding:"1.25rem 1rem",display:"flex",flexWrap:"wrap",justifyContent:"space-around",gap:"1rem",fontFamily:"Inter,sans-serif"}}>
        {[
          {label:"MONTHLY PAYMENT", val:fmtDollar(monthly), big:true, tid:"calc-monthly"},
          {label:"PRINCIPAL", val:fmtDollar(principal), tid:"calc-principal"},
          {label:"TOTAL INTEREST", val:fmtDollar(totalInterest), tid:"calc-interest"},
          {label:"TOTAL COST", val:fmtDollar(totalCost), tid:"calc-total"}
        ].map(c => (
          <div key={c.label} style={{textAlign:"center",minWidth:110}}>
            <div style={{fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.06em",color:"var(--muted)"}}>{c.label}</div>
            <div data-testid={c.tid} style={{fontSize:c.big?"1.85rem":"1.35rem",fontWeight:700,color:"var(--brand-navy)",marginTop:"0.35rem"}}>{c.val}</div>
          </div>
        ))}
      </div>

      <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.78rem",color:"var(--muted)",lineHeight:1.55,marginTop:"1rem",marginBottom:0,textAlign:"center"}}>This calculator provides estimates only. Actual rates and terms may vary. Contact a mortgage professional for accurate figures.</p>
    </div>
  );
};

const PTTCalculator = () => {
  const [priceStr,setPriceStr]=useState("850,000");
  const price = Number(priceStr.replace(/[^0-9]/g,""))||0;
  const [ftbFirstTime,setFtb]=useState(false);
  const [newBuilt,setNew]=useState(false);
  const [foreign,setForeign]=useState(false);
  const ptt = (p) => { let t=0; if(p<=200000) return p*0.01; t+=200000*0.01; if(p<=2000000) return t+(p-200000)*0.02; t+=1800000*0.02; if(p<=3000000) return t+(p-2000000)*0.03; t+=1000000*0.03; return t+(p-3000000)*0.05; };
  let basePtt = ptt(price);
  if(ftbFirstTime && price <= 835000) basePtt = 0;
  else if(ftbFirstTime && price <= 860000) basePtt = basePtt * ((860000-price)/25000);
  if(newBuilt && price <= 1100000) basePtt = 0;
  else if(newBuilt && price <= 1150000) basePtt = basePtt * ((1150000-price)/50000);
  const additional = foreign ? price * 0.20 : 0;
  const total = basePtt + additional;
  const onPrice = e => {
    const raw = e.target.value.replace(/[^0-9]/g,"");
    setPriceStr(raw ? Number(raw).toLocaleString() : "");
  };
  const Toggle = ({on, onChange, tid}) => (
    <button type="button" onClick={()=>onChange(!on)} data-testid={tid}
      style={{width:44,height:24,borderRadius:999,border:"none",padding:2,cursor:"pointer",background:on?"var(--brand-blue)":"#D1D5DB",transition:"background 0.2s"}}>
      <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",transform:on?"translateX(20px)":"translateX(0)",transition:"transform 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
    </button>
  );
  const Row = ({title, sub, on, onChange, tid}) => (
    <div style={{background:"rgba(240,244,251,0.5)",border:"1px solid rgba(15,42,91,0.08)",borderRadius:12,padding:"1rem 1.25rem",marginTop:"0.75rem",display:"flex",gap:"1rem",alignItems:"flex-start",justifyContent:"space-between"}}>
      <div style={{flex:1}}>
        <div style={{fontFamily:"Inter,sans-serif",fontWeight:600,color:"var(--brand-navy)",fontSize:"0.95rem"}}>{title}</div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.82rem",color:"var(--muted)",marginTop:"0.35rem",lineHeight:1.5}}>{sub}</div>
      </div>
      <Toggle on={on} onChange={onChange} tid={tid}/>
    </div>
  );
  return (
    <div className="paper" data-testid="ptt-calculator" style={{marginTop:"2rem",background:"#F7FAFF"}}>
      <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem"}}>
        <img src={DOOGIE_POINT_L_T} alt="Doogie" style={{width:72,height:72,borderRadius:"50%",background:"#fff",border:"3px solid var(--brand-gold)",objectFit:"cover"}}/>
        <div>
          <h2 className="font-display" style={{fontSize:"1.55rem",margin:0,color:"var(--brand-navy)"}}>BC Property Transfer Tax Calculator</h2>
          <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.9rem",color:"var(--muted)",marginTop:"0.25rem"}}>Estimate your one-time BC PTT at completion.</div>
        </div>
      </div>

      <label style={{fontFamily:"Inter,sans-serif",fontWeight:600,color:"var(--brand-navy)",fontSize:"0.9rem",display:"block",marginBottom:"0.4rem"}}>Purchase Price</label>
      <div style={{position:"relative",background:"rgba(240,244,251,0.5)",border:"1px solid rgba(15,42,91,0.1)",borderRadius:10,padding:"0.85rem 1rem 0.85rem 2.4rem",fontFamily:"Inter,sans-serif"}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"var(--muted)",fontSize:"1rem"}}>$</span>
        <input value={priceStr} onChange={onPrice} inputMode="numeric" data-testid="ptt-price" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)"}}/>
      </div>

      <Row title="I'm a first-time home buyer"
           sub="Eligibility: Canadian citizen or permanent resident, lived in BC 12+ months, never owned a principal residence anywhere in the world."
           on={ftbFirstTime} onChange={setFtb} tid="ptt-ftb"/>
      <Row title="This is a newly built home"
           sub="Home must be newly constructed, buyer must use as principal residence."
           on={newBuilt} onChange={setNew} tid="ptt-newbuilt"/>
      <Row title="I'm a foreign national or foreign-controlled entity"
           sub="Triggers an additional 20% PTT in specified BC areas (Metro Vancouver, Fraser Valley, CRD, Nanaimo, Central Okanagan)."
           on={foreign} onChange={setForeign} tid="ptt-foreign"/>

      <div style={{background:"#F0F4FB",borderRadius:12,marginTop:"1.25rem",padding:"1rem 1.25rem",fontFamily:"Inter,sans-serif"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.4rem 0",borderBottom:"1px solid rgba(15,42,91,0.08)"}}>
          <span style={{color:"var(--muted)",fontSize:"0.82rem",letterSpacing:"0.06em",fontWeight:600}}>BASE PTT</span>
          <span style={{color:"var(--brand-navy)",fontSize:"1.35rem",fontWeight:600}} data-testid="calc-ptt-base">{fmtDollar(basePtt)}</span>
        </div>
        {foreign && (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.4rem 0",borderBottom:"1px solid rgba(15,42,91,0.08)"}}>
            <span style={{color:"var(--muted)",fontSize:"0.82rem",letterSpacing:"0.06em",fontWeight:600}}>ADDITIONAL PTT (20%)</span>
            <span style={{color:"var(--brand-navy)",fontSize:"1.35rem",fontWeight:600}} data-testid="calc-ptt-additional">{fmtDollar(additional)}</span>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.6rem 0 0.2rem"}}>
          <span style={{color:"var(--muted)",fontSize:"0.82rem",letterSpacing:"0.06em",fontWeight:600}}>TOTAL PTT OWED</span>
          <span style={{color:"var(--brand-navy)",fontSize:"1.75rem",fontWeight:700}} data-testid="calc-ptt">{fmtDollar(total)}</span>
        </div>
      </div>

      <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.78rem",color:"var(--muted)",lineHeight:1.55,marginTop:"1rem",marginBottom:0}}>This calculator provides estimates only based on current BC PTT rates as of April 2026. Actual PTT owed depends on your specific transaction, residency status, and property details. Informational only — not tax or legal advice. For your specific transaction, consult a BC notary or real estate lawyer.</p>
    </div>
  );
};

const Calculators = () => (
  <section className="section"><div className="container-x" style={{maxWidth:"52rem"}}>
    <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
      <div className="eyebrow" style={{marginBottom:"0.5rem"}}>BC Calculators</div>
      <h2 className="font-display" style={{fontSize:"clamp(1.8rem,3.5vw,2.6rem)",lineHeight:1.15,margin:"0 0 1rem",color:"var(--brand-navy)",letterSpacing:"-0.01em"}}>
        Estimate Your <span className="accent">Home-Buying Costs</span>
      </h2>
      <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.6,maxWidth:"38rem",margin:"0 auto 1.25rem"}}>Run the numbers on your <span className="green" style={{fontWeight:600}}>monthly payment</span> and <span className="green" style={{fontWeight:600}}>Property Transfer Tax</span> before you make an offer.</p>
      <div style={{display:"flex",gap:"0.6rem",justifyContent:"center",flexWrap:"wrap",fontFamily:"Inter,sans-serif"}}>
        {[{i:"⚡",t:"Instant"},{i:"🆓",t:"Free"},{i:"🔓",t:"No sign-up"}].map(b => (
          <span key={b.t} style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.4rem 0.9rem",background:"rgba(15,42,91,0.06)",border:"1px solid rgba(15,42,91,0.1)",borderRadius:999,fontSize:"0.82rem",fontWeight:600,color:"var(--brand-navy)"}}>
            <span style={{fontSize:"0.95rem"}} aria-hidden="true">{b.i}</span>{b.t}
          </span>
        ))}
      </div>
    </div>
    <MortgageCalculator/>
    <PTTCalculator/>
  </div></section>
);

// --- Data Attribution (7 boards) ---
const DataAttribution = () => (<Legal title="MLS® Data Attribution" body={<>
  <p>Listings displayed on EZtoFind.ca are sourced under license from the following British Columbia real estate boards via the embedded iframe search at <a href="https://www.greatervancouver.forsale/mapsearchapp" style={{color:"var(--brand-blue)"}}>greatervancouver.forsale</a>:</p>
  <ul style={{lineHeight:2}}>
    <li>Greater Vancouver REALTORS (GVR)</li>
    <li>Fraser Valley Real Estate Board (FVREB)</li>
    <li>Chilliwack &amp; District Real Estate Board (CADREB)</li>
    <li>BC Northern Real Estate Board (BCNREB)</li>
    <li>Interior Association of REALTORS (IAR)</li>
    <li>Kootenay Association of REALTORS (KAR)</li>
    <li>Vancouver Island Real Estate Board (VIREB)</li>
  </ul>
  <p>REALTOR® and MLS® are certification marks owned by the Canadian Real Estate Association (CREA) and used under license. Listing data is the property of the applicable listing brokerage and board. EZtoFind.ca does not scrape, mirror, or republish listing data.</p>
</>}/>);

// --- Unsubscribe (CASL) ---
const Unsubscribe = () => {
  const [email,setEmail]=useState(""); const [done,setDone]=useState(false); const [err,setErr]=useState(""); const [count,setCount]=useState(0);
  const submit=async e=>{e.preventDefault(); setErr("");
    try{ const r = await axios.post(`${API}/unsubscribe`, {email}); setCount(r.data.records_updated||0); setDone(true); }
    catch(x){ setErr("Please enter a valid email or contact info@eztofind.ca."); }
  };
  return (<section className="section"><div className="container-x" style={{maxWidth:"36rem"}}>
    <div className="eyebrow">CASL Withdrawal</div><h1 className="section-title">Unsubscribe</h1>
    {done ? <div className="paper" style={{fontFamily:"Inter,sans-serif"}}><p>✓ You have been unsubscribed.{count>0?` We updated ${count} record(s) associated with your email.`:" We didn't find any records matching that email — you're already off our lists."} It may take up to 10 business days to remove you from all lists, as permitted under CASL. A record of your unsubscribe request (email, timestamp, IP address) has been logged for compliance.</p></div>
    : <form onSubmit={submit} className="paper">
      <div className="field"><label>Email address to unsubscribe *</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} data-testid="unsub-email"/></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}}>{err}</div>}
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="unsub-submit">Unsubscribe</button>
      <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.85rem",color:"var(--muted)",marginTop:"1rem"}}>You may also email info@eztofind.ca directly to withdraw consent.</p>
    </form>}
  </div></section>);
};

// --- Cookie banner (PIPA-tracked consent) ---
const CookieBanner = () => {
  const [show, setShow] = useState(() => !localStorage.getItem("ez_cookie"));
  const accept = () => {
    const record = {accepted:true, at: new Date().toISOString(), ua: navigator.userAgent};
    localStorage.setItem("ez_cookie", JSON.stringify(record));
    setShow(false);
  };
  if(!show) return null;
  return <div role="dialog" aria-label="Cookie & Privacy Notice" style={{position:"fixed",bottom:20,left:20,right:20,maxWidth:520,background:"var(--brand-navy)",color:"white",padding:"1rem 1.25rem",borderRadius:12,zIndex:59,boxShadow:"0 20px 40px rgba(0,0,0,0.3)",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}} data-testid="cookie-banner">
    <div style={{flex:1,minWidth:220}}>EZtoFind.ca uses only essential cookies (session, consent state). Under BC's <strong>Personal Information Protection Act (PIPA)</strong>, we ask you to acknowledge our <Link to="/privacy" style={{color:"var(--brand-gold)"}}>Privacy Policy</Link>. Clicking "I acknowledge" records your acceptance timestamp locally.</div>
    <button className="btn btn-green" onClick={accept} style={{padding:"0.5rem 1rem"}} data-testid="cookie-accept">I acknowledge</button>
  </div>;
};

// --- Home JSON-LD schema ---
const HomeSchema = () => {
  const data = {
    "@context":"https://schema.org","@type":"RealEstateAgent",
    "name":"Doug LeMaire — EZtoFind.ca",
    "url":"https://eztofind.ca",
    "areaServed":[{"@type":"AdministrativeArea","name":"British Columbia"}],
    "knowsAbout":["Detached homes","Luxury real estate","Equestrian properties","Estate Sales","Probate","Condos"],
    "parentOrganization":{"@type":"Organization","name":"Fraser Property Management Realty Services Ltd."},
    "email":"info@eztofind.ca"
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data)}}/>;
};

// --- Compliance strip ---
const ComplianceStrip = () => (
  <div className="compliance-strip" style={{background:"#F5F0E1",padding:"0.6rem 1rem",fontFamily:"Inter,sans-serif",fontSize:"0.78rem",color:"var(--muted)",textAlign:"center",borderBottom:"1px solid rgba(15,42,91,0.08)"}}>
    Doogie provides general information only. Not financial, legal, real estate or investment advice.
  </div>
);




// --- Admin AI Content Approvals ---
const AdminApprovals = () => {
  const {headers} = useAdmin();
  const [tab, setTab] = useState("synopses");
  const [summary, setSummary] = useState({pending_glossary_faqs:0, pending_synopses:0, pending_weather:0});
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [edited, setEdited] = useState({});

  const loadSummary = async () => {
    const r = await axios.get(`${API}/admin/approvals/summary`, {headers}).catch(()=>({data:{}}));
    setSummary(r.data);
  };
  const loadItems = async (t) => {
    setBusy(true);
    const r = await axios.get(`${API}/admin/approvals/${t}`, {headers}).catch(()=>({data:[]}));
    setItems(r.data); setBusy(false); setEdited({});
  };
  useEffect(() => { loadSummary(); loadItems(tab); /* eslint-disable-next-line */ }, [tab]);

  const approveSynopsis = async (slug) => {
    await axios.post(`${API}/admin/approvals/synopses/approve`, {slug, synopsis: edited[slug]}, {headers});
    await loadSummary(); await loadItems("synopses");
  };
  const approveWeather = async (slug) => {
    await axios.post(`${API}/admin/approvals/weather/approve`, {slug, weather: edited[slug]}, {headers});
    await loadSummary(); await loadItems("weather");
  };
  const approveGlossaryFaqs = async (slug, faqs) => {
    await axios.post(`${API}/admin/approvals/glossary/approve`, {slug, faqs}, {headers});
    await loadSummary(); await loadItems("glossary");
  };
  const regenSynopsis = async (slug) => { await axios.post(`${API}/admin/approvals/synopses/${slug}/regenerate`, {}, {headers}); await loadItems("synopses"); };
  const regenWeather = async (slug) => { await axios.post(`${API}/admin/approvals/weather/${slug}/regenerate`, {}, {headers}); await loadItems("weather"); };
  const regenGlossary = async (slug) => { await axios.post(`${API}/admin/approvals/glossary/${slug}/regenerate`, {}, {headers}); await loadItems("glossary"); };
  const bulkApproveGlossary = async () => {
    if(!window.confirm(`Bulk-approve ALL ${summary.pending_glossary_faqs} pending glossary FAQ sets? Do this only after spot-checking a sample.`)) return;
    await axios.post(`${API}/admin/approvals/glossary/approve-all`, {}, {headers});
    await loadSummary(); await loadItems("glossary");
  };
  const bulkApproveSynopses = async () => {
    if(!window.confirm(`Approve ALL ${items.length} pending community synopses at once?`)) return;
    await axios.post(`${API}/admin/approvals/synopses/approve-all`, {}, {headers});
    await loadSummary(); await loadItems("synopses");
  };
  const bulkApproveWeather = async () => {
    if(!window.confirm(`Approve ALL ${items.length} pending weather summaries at once?`)) return;
    await axios.post(`${API}/admin/approvals/weather/approve-all`, {}, {headers});
    await loadSummary(); await loadItems("weather");
  };
  const generateAll = async () => {
    if(!window.confirm("Generate synopsis + weather for ALL 243 BC communities that don't have them yet? This runs in the background and takes ~15-30 minutes. Then refresh this page to see them all queued for approval.")) return;
    const r = await axios.post(`${API}/admin/approvals/generate-all`, {}, {headers});
    alert(r.data.message);
    setTimeout(() => { loadSummary(); loadItems(tab); }, 3000);
  };
  const generateAllGlossary = async () => {
    if(!window.confirm("Generate FAQs for EVERY glossary term that doesn't have them yet (~394 terms). Runs in the background and takes ~30-60 minutes. Refresh the Glossary tab periodically to see them queued for approval.")) return;
    const r = await axios.post(`${API}/admin/approvals/generate-all-glossary`, {}, {headers});
    alert(r.data.message);
    setTimeout(() => { loadSummary(); if(tab==="glossary") loadItems("glossary"); }, 3000);
  };
  const unapproveAllGlossary = async () => {
    if(!window.confirm("Re-queue every previously-approved glossary term for review? Their FAQs will be hidden from the public site until you approve them again.")) return;
    const r = await axios.post(`${API}/admin/approvals/glossary/unapprove-all`, {}, {headers});
    alert(`${r.data.modified} terms re-queued for review.`);
    await loadSummary(); if(tab==="glossary") await loadItems("glossary");
  };

  return <AdminShell active="approvals">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>AI Content Approvals</h1>
    <p style={{color:"var(--muted)",marginTop:0,fontSize:"0.92rem"}}>BCFSA compliance: as the licensed REALTOR®, you are responsible for all AI-generated content. Review, edit if needed, then approve before publication. Unapproved content stays hidden from the public site.</p>

    <div className="paper" style={{marginTop:"1rem",background:"#F5F0E1",display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:240}}><strong>Populate all 243 BC communities at once</strong><br/><span style={{color:"var(--muted)",fontSize:"0.88rem"}}>Auto-generate synopsis + weather drafts for every community, then approve in bulk below.</span></div>
      <button onClick={generateAll} className="btn btn-primary" style={{padding:"0.6rem 1.2rem"}} data-testid="generate-all-btn">🚀 Generate All Missing</button>
    </div>

    <div className="paper" style={{marginTop:"1rem",background:"#EEF7EF",display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:240}}><strong>Populate FAQs for all 401 Glossary Terms</strong><br/><span style={{color:"var(--muted)",fontSize:"0.88rem"}}>Auto-generate 10 BC-specific FAQs per term (background job, ~30-60 min). Then review + approve.</span></div>
      <button onClick={generateAllGlossary} className="btn btn-primary" style={{padding:"0.6rem 1.2rem"}} data-testid="generate-all-glossary-btn">📖 Generate All FAQs</button>
      <button onClick={bulkApproveGlossary} className="btn btn-green" style={{padding:"0.6rem 1.2rem",background:"var(--brand-green-dark)",color:"white",border:"none"}} data-testid="top-approve-all-glossary-btn">✓ Approve All Pending FAQs{summary && summary.pending_glossary_faqs>0 ? ` (${summary.pending_glossary_faqs})` : ""}</button>
      <button onClick={unapproveAllGlossary} className="btn btn-outline" style={{padding:"0.6rem 1.2rem"}} data-testid="unapprove-all-glossary-btn">↻ Re-queue Approved</button>
    </div>

    <div style={{display:"flex",gap:"0.5rem",marginTop:"1.5rem",marginBottom:"1rem",flexWrap:"wrap"}}>
      {[
        {key:"synopses", label:`🗺️ Community Synopses (${summary.pending_synopses})`},
        {key:"weather", label:`☀️ Weather (${summary.pending_weather})`},
        {key:"glossary", label:`📖 Glossary FAQs (${summary.pending_glossary_faqs})`}
      ].map(t => (
        <button key={t.key} onClick={()=>setTab(t.key)} className={tab===t.key?"btn btn-primary":"btn btn-outline"} style={{padding:"0.5rem 1rem",fontSize:"0.9rem"}} data-testid={`approvals-tab-${t.key}`}>{t.label}</button>
      ))}
    </div>

    {busy && <p>Loading…</p>}

    {!busy && tab === "synopses" && (
      items.length === 0 ? <p style={{color:"var(--muted)"}}>✓ No pending community synopses.</p> :
      <>
      {items.length > 3 && <div className="paper" style={{marginBottom:"1rem",background:"#FFF8E8"}}>
        <p style={{margin:"0 0 0.75rem",fontSize:"0.9rem"}}><strong>Bulk approve:</strong> Approve all {items.length} pending community synopses at once.</p>
        <button onClick={bulkApproveSynopses} className="btn btn-green" style={{padding:"0.5rem 1rem"}} data-testid="approve-all-syn">✓ Approve all {items.length}</button>
      </div>}
      {items.map(it => (
        <div key={it.slug} className="paper" style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:"0.5rem"}}>
            <strong style={{fontSize:"1.1rem",color:"var(--brand-navy)"}}>{it.name}, {it.region}</strong>
            <div style={{display:"flex",gap:"0.5rem"}}>
              <button onClick={()=>regenSynopsis(it.slug)} className="btn btn-outline" style={{padding:"0.4rem 0.8rem",fontSize:"0.82rem"}}>↻ Regenerate</button>
              <button onClick={()=>approveSynopsis(it.slug)} className="btn btn-green" style={{padding:"0.4rem 0.8rem",fontSize:"0.82rem"}} data-testid={`approve-syn-${it.slug}`}>✓ Approve &amp; Publish</button>
            </div>
          </div>
          <textarea defaultValue={it.synopsis} onChange={e=>setEdited({...edited,[it.slug]:e.target.value})} rows={10} style={{width:"100%",fontFamily:"Inter,sans-serif",fontSize:"0.92rem",lineHeight:1.6,padding:"0.75rem",border:"1px solid rgba(15,42,91,0.15)",borderRadius:8,resize:"vertical"}}/>
        </div>
      ))}
      </>
    )}

    {!busy && tab === "weather" && (
      items.length === 0 ? <p style={{color:"var(--muted)"}}>✓ No pending weather summaries.</p> :
      <>
      {items.length > 3 && <div className="paper" style={{marginBottom:"1rem",background:"#FFF8E8"}}>
        <p style={{margin:"0 0 0.75rem",fontSize:"0.9rem"}}><strong>Bulk approve:</strong> Approve all {items.length} pending weather summaries at once.</p>
        <button onClick={bulkApproveWeather} className="btn btn-green" style={{padding:"0.5rem 1rem"}} data-testid="approve-all-wx">✓ Approve all {items.length}</button>
      </div>}
      {items.map(it => (
        <div key={it.slug} className="paper" style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:"0.5rem"}}>
            <strong style={{fontSize:"1.1rem",color:"var(--brand-navy)"}}>{it.name}, {it.region}</strong>
            <div style={{display:"flex",gap:"0.5rem"}}>
              <button onClick={()=>regenWeather(it.slug)} className="btn btn-outline" style={{padding:"0.4rem 0.8rem",fontSize:"0.82rem"}}>↻ Regenerate</button>
              <button onClick={()=>approveWeather(it.slug)} className="btn btn-green" style={{padding:"0.4rem 0.8rem",fontSize:"0.82rem"}} data-testid={`approve-wx-${it.slug}`}>✓ Approve &amp; Publish</button>
            </div>
          </div>
          <textarea defaultValue={it.weather} onChange={e=>setEdited({...edited,[it.slug]:e.target.value})} rows={7} style={{width:"100%",fontFamily:"Inter,sans-serif",fontSize:"0.92rem",lineHeight:1.6,padding:"0.75rem",border:"1px solid rgba(15,42,91,0.15)",borderRadius:8,resize:"vertical"}}/>
        </div>
      ))}
      </>
    )}

    {!busy && tab === "glossary" && (
      items.length === 0 ? <p style={{color:"var(--muted)"}}>✓ No pending glossary FAQs.</p> :
      <>
        {items.length > 5 && <div className="paper" style={{marginBottom:"1rem",background:"#FFF8E8"}}>
          <p style={{margin:"0 0 0.75rem",fontSize:"0.9rem"}}><strong>Bulk approve:</strong> If you've spot-checked a sample of these and are comfortable, you can approve all {items.length} pending FAQ sets at once.</p>
          <button onClick={bulkApproveGlossary} className="btn btn-green" style={{padding:"0.5rem 1rem"}} data-testid="approve-all-glossary">✓ Bulk-approve all {items.length}</button>
        </div>}
        {items.map(it => (
          <div key={it.slug} className="paper" style={{marginBottom:"1rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:"0.5rem"}}>
              <div><strong style={{fontSize:"1.05rem",color:"var(--brand-navy)"}}>{it.term}</strong> <span style={{color:"var(--muted)",fontSize:"0.85rem"}}>· {it.category}</span></div>
              <div style={{display:"flex",gap:"0.5rem"}}>
                <button onClick={()=>regenGlossary(it.slug)} className="btn btn-outline" style={{padding:"0.4rem 0.8rem",fontSize:"0.82rem"}}>↻ Regenerate</button>
                <button onClick={()=>approveGlossaryFaqs(it.slug, it.faqs)} className="btn btn-green" style={{padding:"0.4rem 0.8rem",fontSize:"0.82rem"}} data-testid={`approve-gl-${it.slug}`}>✓ Approve</button>
              </div>
            </div>
            <details><summary style={{cursor:"pointer",fontSize:"0.88rem",color:"var(--brand-blue)"}}>View 10 FAQs</summary>
              {(it.faqs||[]).map((f,i)=><div key={i} style={{padding:"0.5rem 0",borderBottom:"1px solid rgba(15,42,91,0.06)",fontSize:"0.88rem"}}><strong>{f.q}</strong><br/><span style={{color:"var(--muted)"}}>{f.a}</span></div>)}
            </details>
          </div>
        ))}
      </>
    )}
  </AdminShell>;
};

// --- Admin Doogie Chat Logs (PIPA compliance) ---
const AdminChats = () => {
  const {headers} = useAdmin();
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const load = async () => {
    const r = await axios.get(`${API}/admin/chats`, {headers}).catch(()=>({data:[]}));
    setSessions(r.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const openSession = async sid => {
    setSelected(sid);
    const r = await axios.get(`${API}/admin/chats/${sid}`, {headers}).catch(()=>({data:{messages:[]}}));
    setMsgs(r.data.messages || []);
  };
  const deleteSession = async sid => {
    if(!window.confirm("Delete this chat session? PIPA-compliant hard delete.")) return;
    await axios.delete(`${API}/admin/chats/${sid}`, {headers});
    setSelected(null); setMsgs([]); load();
  };
  const purgeAll = async () => {
    if(!window.confirm("PURGE ALL chat logs? This cannot be undone.")) return;
    await axios.post(`${API}/admin/chats/purge-all`, {}, {headers});
    setSelected(null); setMsgs([]); load();
  };
  return <AdminShell active="chats">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
      <div>
        <h1 className="font-display" style={{fontSize:"2rem",margin:0}}>Doogie Chat Logs</h1>
        <p style={{color:"var(--muted)",margin:"0.25rem 0 0",fontSize:"0.9rem"}}>PIPA compliance: PII automatically redacted before storage · 30-day TTL auto-purge · Manual delete available.</p>
      </div>
      <button onClick={purgeAll} className="btn btn-outline" style={{color:"#DC2626",borderColor:"#DC2626",padding:"0.5rem 1rem"}} data-testid="chats-purge-all">🗑️ Purge All</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:"1rem",marginTop:"1.5rem"}}>
      <div className="paper" style={{maxHeight:"70vh",overflowY:"auto",padding:"0.5rem"}}>
        {sessions.length === 0 ? <p style={{color:"var(--muted)",padding:"1rem"}}>No chat sessions yet.</p> :
          sessions.map(s => (
            <div key={s.session_id} onClick={()=>openSession(s.session_id)} style={{padding:"0.75rem",border:"1px solid rgba(15,42,91,0.08)",borderRadius:8,marginBottom:"0.4rem",cursor:"pointer",background:selected===s.session_id?"#F5F0E1":"white"}} data-testid={`chat-session-${s.session_id}`}>
              <div style={{fontFamily:"monospace",fontSize:"0.75rem",color:"var(--muted)"}}>{s.session_id.slice(0,20)}…</div>
              <div style={{fontSize:"0.85rem",marginTop:"0.25rem"}}><strong>{s.messages}</strong> messages · <span style={{color:"var(--muted)"}}>{new Date(s.last_ts).toLocaleString()}</span></div>
              {s.pii_flags && s.pii_flags.length > 0 && <div style={{marginTop:"0.35rem",display:"flex",gap:"0.25rem",flexWrap:"wrap"}}>
                {s.pii_flags.map(f => <span key={f} style={{fontSize:"0.7rem",background:"#FEE2E2",color:"#991B1B",padding:"0.1rem 0.4rem",borderRadius:4}}>{f} redacted</span>)}
              </div>}
            </div>
          ))}
      </div>
      <div className="paper" style={{maxHeight:"70vh",overflowY:"auto"}}>
        {!selected ? <p style={{color:"var(--muted)"}}>Select a session to view messages.</p> :
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
              <div style={{fontFamily:"monospace",fontSize:"0.75rem",color:"var(--muted)"}}>{selected}</div>
              <button onClick={()=>deleteSession(selected)} style={{background:"transparent",border:"1px solid #DC2626",color:"#DC2626",padding:"0.35rem 0.75rem",borderRadius:6,cursor:"pointer",fontSize:"0.82rem"}}>Delete session</button>
            </div>
            {msgs.map((m,i)=><div key={i} style={{padding:"0.6rem 0.85rem",borderRadius:10,marginBottom:"0.5rem",background:m.role==="user"?"#E8EEF9":"#F5F0E1",fontSize:"0.9rem",lineHeight:1.5}}>
              <div style={{fontSize:"0.72rem",color:"var(--muted)",marginBottom:"0.25rem"}}>{m.role} · {new Date(m.ts).toLocaleString()}</div>
              {m.content}
              {m.pii_flags && m.pii_flags.length > 0 && <div style={{marginTop:"0.35rem",fontSize:"0.72rem",color:"#991B1B"}}>PII redacted: {m.pii_flags.join(", ")}</div>}
            </div>)}
          </>
        }
      </div>
    </div>
  </AdminShell>;
};

// --- Admin Broker Policies (printable PDFs) ---
const AdminPolicies = () => {
  const {headers} = useAdmin();
  const [items, setItems] = useState([]);
  useEffect(() => { axios.get(`${API}/admin/policies`, {headers}).then(r => setItems(r.data)).catch(()=>{}); /* eslint-disable-next-line */ }, []);
  const token = localStorage.getItem("eztoken");
  const openPolicy = (slug) => {
    window.open(`${API}/admin/policies/${slug}?token=${encodeURIComponent(token)}`, "_blank");
  };
  return <AdminShell active="policies">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>Managing Broker Policy Documents</h1>
    <p style={{color:"var(--muted)",marginTop:0,fontSize:"0.92rem"}}>Print-ready policy templates for Fraser Property Management Realty Services Ltd. Open each, review, then <strong>File → Print → Save as PDF</strong> to hand to your Managing Broker or E&amp;O provider.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"1rem",marginTop:"1.5rem"}}>
      {items.map(p => (
        <div key={p.slug} className="paper" data-testid={`policy-${p.slug}`}>
          <h3 style={{marginTop:0,color:"var(--brand-navy)"}}>{p.title}</h3>
          <p style={{color:"var(--muted)",fontSize:"0.9rem",lineHeight:1.5}}>{p.desc}</p>
          <button onClick={()=>openPolicy(p.slug)} className="btn btn-primary" style={{padding:"0.5rem 1rem"}} data-testid={`open-policy-${p.slug}`}>📄 Open & Print</button>
        </div>
      ))}
    </div>
  </AdminShell>;
};



// --- App ---
// --- Back/Home nav bar ---
const BackHomeBar = () => {
  const nav = useNavigate();
  return (
    <div style={{background:"white",borderBottom:"1px solid rgba(15,42,91,0.06)",padding:"0.6rem 0"}}>
      <div className="container-x" style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
        <button onClick={()=>nav(-1)} className="btn btn-ghost" style={{padding:"0.4rem 0.9rem",fontSize:"0.88rem"}} data-testid="btn-back">← Back</button>
        <button onClick={()=>nav("/")} className="btn btn-ghost" style={{padding:"0.4rem 0.9rem",fontSize:"0.88rem"}} data-testid="btn-home">🏠 Home</button>
      </div>
    </div>
  );
};

const AppLayout = ({children}) => (<><ComplianceStrip/><Nav/><BackHomeBar/>{children}<Footer/><DoogieChat/><CookieBanner/></>);
const AdminLayout = ({children}) => children;

function App() {
  return (<BrowserRouter>
    <Routes>
      <Route path="/" element={<AppLayout><HomeSchema/><Home/></AppLayout>}/>
      <Route path="/listings" element={<AppLayout><Listings/></AppLayout>}/>
      <Route path="/communities" element={<AppLayout><Communities/></AppLayout>}/>
      <Route path="/community/:slug" element={<AppLayout><CommunityPage/></AppLayout>}/>
      <Route path="/neighbourhoods" element={<AppLayout><Communities/></AppLayout>}/>
      <Route path="/neighbourhood/:slug" element={<AppLayout><CommunityPage/></AppLayout>}/>
      <Route path="/regions" element={<AppLayout><RegionsIndex/></AppLayout>}/>
      <Route path="/regions/:slug" element={<AppLayout><RegionPage/></AppLayout>}/>
      <Route path="/specialties" element={<AppLayout><SpecialtiesIndex/></AppLayout>}/>
      <Route path="/specialties/:slug" element={<AppLayout><SpecialtyPage/></AppLayout>}/>
      <Route path="/glossary" element={<AppLayout><Glossary/></AppLayout>}/>
      <Route path="/glossary/:slug" element={<AppLayout><GlossaryTerm/></AppLayout>}/>
      <Route path="/buyer" element={<AppLayout><BuyerForm/></AppLayout>}/>
      <Route path="/seller" element={<AppLayout><SellerForm/></AppLayout>}/>
      <Route path="/valuation" element={<AppLayout><Valuation/></AppLayout>}/>
      <Route path="/referral-request" element={<AppLayout><ReferralRequest/></AppLayout>}/>
      <Route path="/realtors" element={<AppLayout><RealtorApply/></AppLayout>}/>
      <Route path="/realtors/credentials/:id" element={<AppLayout><RealtorCredentials/></AppLayout>}/>
      <Route path="/about" element={<AppLayout><About/></AppLayout>}/>
      <Route path="/contact" element={<AppLayout><Contact/></AppLayout>}/>
      <Route path="/privacy" element={<AppLayout><Privacy/></AppLayout>}/>
      <Route path="/terms" element={<AppLayout><Terms/></AppLayout>}/>
      <Route path="/compliance" element={<AppLayout><Compliance/></AppLayout>}/>
      <Route path="/complaints" element={<AppLayout><Complaints/></AppLayout>}/>
      <Route path="/dorts" element={<AppLayout><DoRTS/></AppLayout>}/>
      <Route path="/working-with-a-realtor" element={<AppLayout><WorkingWithRealtor/></AppLayout>}/>
      <Route path="/code-of-ethics" element={<AppLayout><CodeOfEthics/></AppLayout>}/>
      <Route path="/data-attribution" element={<AppLayout><DataAttribution/></AppLayout>}/>
      <Route path="/unsubscribe" element={<AppLayout><Unsubscribe/></AppLayout>}/>
      <Route path="/breach-policy" element={<AppLayout><BreachPolicy/></AppLayout>}/>
      <Route path="/admin/login" element={<AdminLogin/>}/>
      <Route path="/admin" element={<AdminDash/>}/>
      <Route path="/admin/buyers" element={<AdminList title="Buyer Leads" url="/admin/leads/buyer" active="buyers" cols={[["created_at","Date"],["full_name","Name"],["email","Email"],["phone","Phone"],["property_type","Type"],["budget_range","Budget"],["timeline","Timeline"],["working_with_realtor","W/ REALTOR®?"]]}/>}/>
      <Route path="/admin/sellers" element={<AdminList title="Seller Leads" url="/admin/leads/seller" active="sellers" cols={[["created_at","Date"],["full_name","Name"],["email","Email"],["city","City"],["property_type","Type"],["timeline","Timeline"],["estimated_value","Value"]]}/>}/>
      <Route path="/admin/realtors" element={<AdminList title="REALTOR® Applications" url="/admin/realtors" active="realtors" cols={[["created_at","Date"],["full_name","Name"],["email","Email"],["brokerage","Brokerage"],["realtor_number","REALTOR® #"],["stage","Stage"],["status","Status"]]}/>}/>
      <Route path="/admin/clients" element={<AdminClients/>}/>
      <Route path="/admin/approvals" element={<AdminApprovals/>}/>
      <Route path="/admin/chats" element={<AdminChats/>}/>
      <Route path="/admin/policies" element={<AdminPolicies/>}/>
    </Routes>
  </BrowserRouter>);
}

export default App;
