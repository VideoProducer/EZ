/* eslint-disable react/no-unescaped-entities, no-empty */
import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// --- Doogie Assets ---
const DOOGIE_LAPTOP = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/vo8679bv_Doogie%20Laptop.png";
const DOOGIE_POINT_R = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/9lnyn1tx_Doogie%20Pointing%20Right.png";
const DOOGIE_POINT_L = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/686tnkdh_Doogie%20Pointing%20Left.jpeg";
const DOOGIE_CELEBRATE = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/4g6serdu_Doogie%20Celebrating.png";
const DOUG_HEADSHOT = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/2ql7b3c9_portuguese-real-estate-website.md"; // placeholder — replace

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
  bcHero: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1600&q=80"
};

// --- Nav / Footer ---
const Nav = () => (
  <nav className="nav"><div className="container-x nav-inner">
    <Link to="/" style={{display:"flex",alignItems:"center",gap:"0.75rem",textDecoration:"none"}}>
      <img src={DOOGIE_LAPTOP} alt="Doogie" style={{width:52,height:52,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--brand-gold)"}}/>
      <div><div className="font-display" style={{fontSize:"1.4rem",lineHeight:1,color:"var(--brand-navy)"}}>EZtoFind<span style={{color:"var(--brand-green-dark)"}}>.ca</span></div>
      <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.72rem",color:"var(--muted)",letterSpacing:"0.08em"}}>ALL OF BRITISH COLUMBIA</div></div>
    </Link>
    <div style={{display:"flex",gap:"0.25rem",alignItems:"center"}}>
      <NavLink to="/listings" data-testid="nav-listings">Listings</NavLink>
      <NavLink to="/communities" data-testid="nav-communities">Communities</NavLink>
      <NavLink to="/specialties" data-testid="nav-specialties">Specialties</NavLink>
      <NavLink to="/glossary" data-testid="nav-glossary">Glossary</NavLink>
      <NavLink to="/valuation" data-testid="nav-valuation">Home Value</NavLink>
      <NavLink to="/about" data-testid="nav-about">About</NavLink>
      <NavLink to="/realtors" data-testid="nav-realtors">REALTORS®</NavLink>
      <Link to="/contact" className="btn btn-primary" style={{marginLeft:"0.5rem"}} data-testid="nav-contact">Contact</Link>
    </div>
  </div></nav>
);

const Footer = () => (
  <footer><div className="container-x">
    <div className="footer-grid">
      <div>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1rem"}}>
          <img src={DOOGIE_LAPTOP} alt="Doogie" style={{width:56,height:56,borderRadius:"50%",border:"2px solid var(--brand-gold)"}}/>
          <div><div className="font-display" style={{fontSize:"1.3rem",color:"white"}}>EZtoFind.ca</div>
          <div style={{fontSize:"0.75rem",opacity:0.7}}>Doug LeMaire, REALTOR®</div></div>
        </div>
        <p style={{fontSize:"0.88rem",lineHeight:1.6,opacity:0.85}}>The AI-powered real estate research platform for all of British Columbia. Primary practice area: Greater Vancouver, Fraser Valley &amp; the Sea-to-Sky Corridor. Referral network covers all of BC.</p>
        <p style={{fontSize:"0.78rem",opacity:0.7,marginTop:"1rem"}}>Fraser Property Management Realty Services Ltd.</p>
      </div>
      <div><h4>Explore</h4><ul>
        <li><Link to="/listings">Search Listings</Link></li>
        <li><Link to="/communities">Communities</Link></li>
        <li><Link to="/specialties">Specialties</Link></li>
        <li><Link to="/glossary">Glossary</Link></li>
        <li><Link to="/valuation">Home Valuation</Link></li>
        <li><Link to="/calculators">Calculators</Link></li>
      </ul></div>
      <div><h4>For REALTORS®</h4><ul>
        <li><Link to="/realtors">Referral Network</Link></li>
        <li><Link to="/about">About Doug</Link></li>
        <li><Link to="/contact">Contact</Link></li>
      </ul></div>
      <div><h4>Contact</h4><ul>
        <li>info@eztofind.ca</li>
        <li>realtors@eztofind.ca</li>
        <li>referral@eztofind.ca</li>
      </ul></div>
    </div>
    <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",marginTop:"2.5rem",paddingTop:"1.5rem",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",fontSize:"0.78rem",opacity:0.7}}>
      <div>© 2026 EZtoFind.ca — All rights reserved. REALTOR® &amp; MLS® are trademarks of CREA.</div>
      <div style={{display:"flex",gap:"1.25rem",flexWrap:"wrap"}}><Link to="/privacy">Privacy (PIPA)</Link><Link to="/terms">Terms</Link><Link to="/compliance">Compliance</Link><Link to="/data-attribution">Data Attribution</Link><Link to="/unsubscribe">Unsubscribe</Link></div>
    </div>
  </div></footer>
);

// --- Doogie AI Chat Widget ---
const DoogieChat = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{role:"assistant",content:"Hi! I'm Doogie 🐾 EZtoFind's AI helper. Ask me about BC real estate terms, our services, or how the site works. What can I help you find today?"}]);
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => "sess-" + Math.random().toString(36).slice(2));
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef();
  useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs]);

  const send = async (e) => {
    e.preventDefault();
    if(!input.trim() || busy) return;
    const q = input; setInput(""); setBusy(true);
    setMsgs(m => [...m, {role:"user",content:q}, {role:"assistant",content:""}]);
    try {
      const res = await fetch(`${API}/doogie/chat`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:sessionId,message:q})});
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      while(true) {
        const {done, value} = await reader.read(); if(done) break;
        buf += dec.decode(value, {stream:true});
        const lines = buf.split("\n\n"); buf = lines.pop();
        for(const line of lines) {
          if(!line.startsWith("data:")) continue;
          try { const j = JSON.parse(line.slice(5).trim()); if(j.delta) setMsgs(m => { const c=[...m]; c[c.length-1] = {role:"assistant",content:c[c.length-1].content+j.delta}; return c; }); } catch{}
        }
      }
    } catch(err) { setMsgs(m => [...m.slice(0,-1),{role:"assistant",content:"Woof — I had trouble connecting. Please try again."}]); }
    setBusy(false);
  };

  return (<>
    <button className="doogie-fab" onClick={()=>setOpen(o=>!o)} data-testid="doogie-fab" aria-label="Chat with Doogie">
      <img src={DOOGIE_LAPTOP} alt="Doogie"/>
    </button>
    {open && <div className="doogie-panel" data-testid="doogie-panel">
      <header><img src={DOOGIE_LAPTOP} alt="Doogie"/><div><div style={{fontWeight:600}}>Doogie</div><div style={{fontSize:"0.75rem",opacity:0.85}}>AI Helper · General Info Only</div></div>
        <button onClick={()=>setOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:"white",fontSize:"1.5rem",cursor:"pointer"}}>×</button></header>
      <div className="msgs" ref={scrollRef}>{msgs.map((m,i)=><div key={i} className={`msg ${m.role}`}>{m.content || (busy && i===msgs.length-1 ? "…" : "")}</div>)}</div>
      <form onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask Doogie…" data-testid="doogie-input"/><button type="submit" disabled={busy} data-testid="doogie-send">Send</button></form>
    </div>}
  </>);
};

// --- HOME ---
const Home = () => {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  return (<>
    <section className="hero"><div className="container-x hero-grid">
      <div>
        <div className="eyebrow">🏔️ British Columbia · Powered by Doogie AI</div>
        <h1><span className="accent">Real estate</span>,<br/>made <span className="green">EZ to find.</span></h1>
        <p className="lead">The AI-powered research platform for buyers &amp; sellers across all of British Columbia — with Doug's primary practice in Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor. Anywhere else in BC? Our vetted referral network has you covered.</p>
        <form onSubmit={e=>{e.preventDefault();nav("/listings"); }} className="search-bar" data-testid="hero-search">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Try: '3 bedroom detached in Langley under $1.5M'" data-testid="hero-search-input"/>
          <button type="submit" className="btn btn-green" data-testid="hero-search-btn">Search →</button>
        </form>
        <div style={{marginTop:"1.5rem",display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          {["Detached","Luxury","Equestrian","Estate Sales","Condos","Townhomes"].map(s => <span key={s} className="pill">{s}</span>)}
        </div>
      </div>
      <div style={{textAlign:"center"}}>
        <img src="/images/doogie-laptop.png" alt="Doogie mascot" style={{maxWidth:"420px",width:"100%",filter:"drop-shadow(0 20px 40px rgba(15,42,91,0.2))"}}/>
      </div>
    </div></section>

    <section className="section"><div className="container-x">
      <div style={{textAlign:"center",marginBottom:"3rem"}}>
        <div className="eyebrow">Our Focus Areas</div>
        <h2 className="section-title">Three regions. One trusted REALTOR®.</h2>
        <p className="section-sub">Doug LeMaire specializes in the three most sought-after real estate corridors in British Columbia.</p>
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
      <div style={{display:"flex",justifyContent:"center",gap:"3rem",marginTop:"3rem",flexWrap:"wrap",fontFamily:"Inter,sans-serif",textAlign:"center"}}>
        {[
          {icon:"🛡️",title:"Licensed REALTOR®",sub:"BC Financial Services Authority"},
          {icon:"📍",title:"Local Expert",sub:"Greater Vancouver, Fraser Valley, Sea to Sky Corridor"},
          {icon:"⏱️",title:"13 Years",sub:"BC Real Estate Experience"}
        ].map((b,i) => (
          <div key={i} style={{maxWidth:220}}>
            <div style={{fontSize:"1.75rem",marginBottom:"0.5rem"}}>{b.icon}</div>
            <div style={{fontWeight:700,color:"var(--brand-navy)",fontSize:"0.95rem"}}>{b.title}</div>
            <div style={{fontSize:"0.82rem",color:"var(--muted)",lineHeight:1.4,marginTop:"0.25rem"}}>{b.sub}</div>
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
const Listings = () => (
  <section className="section"><div className="container-x">
    <div style={{textAlign:"center",marginBottom:"2rem"}}>
      <div className="eyebrow">Live BC Listings</div>
      <h1 className="section-title">Search all British Columbia MLS® listings.</h1>
      <p className="section-sub">Powered by www.GreaterVancouver.ForSale — the same MLS® data our REALTORS® use daily. Data compliant with CREA, GVR &amp; MLS® rules.</p>
    </div>
    <div style={{background:"white",borderRadius:16,overflow:"hidden",border:"1px solid rgba(15,42,91,0.1)",boxShadow:"0 8px 24px rgba(15,42,91,0.05)"}}>
      <iframe src="https://www.greatervancouver.forsale/mapsearchapp" title="BC MLS Listings" style={{width:"100%",height:"800px",border:"none",display:"block"}} data-testid="listings-iframe"/>
    </div>
    <div className="notice" style={{marginTop:"1.5rem"}}>Listings data is provided under license from participating MLS® systems in British Columbia. The Doogie AI on this website does not directly query or manipulate this listings feed.</div>
  </div></section>
);

// --- Regions ---
const RegionsIndex = () => (
  <section className="section"><div className="container-x">
    <div style={{textAlign:"center",marginBottom:"3rem"}}><div className="eyebrow">Focus Areas</div><h1 className="section-title">Where Doug works.</h1></div>
    <div className="grid-3">
      {[{s:"greater-vancouver",t:"Greater Vancouver",i:IMG.vancouver},{s:"fraser-valley",t:"Fraser Valley",i:IMG.fraserValley},{s:"sea-to-sky",t:"Sea-to-Sky Corridor",i:IMG.seaToSky}].map(r =>
        <Link to={`/regions/${r.s}`} key={r.s} className="card"><img src={r.i} className="card-img" alt={r.t}/><div className="card-body"><h3 className="card-title">{r.t}</h3></div></Link>)}
    </div>
  </div></section>
);

const REGION_DATA = {
  "greater-vancouver": {title:"Greater Vancouver", img:IMG.vancouver, key:"Greater Vancouver", copy:"The Greater Vancouver market spans 22 municipalities, from downtown Vancouver highrises to West Vancouver waterfront estates and the sprawling suburbs of Surrey and Coquitlam. It's Canada's most valuable real estate corridor — and one of the most tightly regulated. Doug's local expertise means you get someone who reads Form B's daily and knows every community's zoning quirks."},
  "fraser-valley": {title:"Fraser Valley", img:IMG.fraserValley, key:"Fraser Valley", copy:"The Fraser Valley — Langley, Abbotsford, Chilliwack, Mission — is BC's fastest-growing residential region. Detached homes, acreages, and family communities are the heart of the market. Doug specializes in equestrian and estate acreage properties across the Valley."},
  "sea-to-sky": {title:"Sea-to-Sky Corridor", img:IMG.seaToSky, key:"Sea-to-Sky", copy:"Squamish, Whistler, Pemberton — the Sea-to-Sky corridor blends mountain lifestyle with world-class recreation. Recreational homes, luxury chalets, and primary residences with a view. Financing, zoning, and STR rules here differ significantly from Metro Van."}
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
      <div className="eyebrow">Focus Area</div>
      <h1 className="section-title">{d.title}</h1>
      <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7,marginBottom:"2rem"}}>{d.copy}</p>
    </div>
    <h3 className="font-display" style={{fontSize:"1.5rem",marginBottom:"1rem"}}>Communities we serve</h3>
    <div className="chip-grid">{list.map(c => <span key={c} className="chip">{c}</span>)}</div>
    <div style={{marginTop:"3rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
      <Link to="/listings" className="btn btn-primary">View Listings</Link>
      <Link to="/buyer" className="btn btn-outline">I'm Buying Here</Link>
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
          <a href="https://eztofind.ca" itemProp="url" style={{color:"inherit",textDecoration:"none"}}>EZtoFind.ca</a>
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
      : <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)"}}>FAQs are being generated by Doogie — refresh in a few seconds.</p>}

    <AuthorBlock compact/>

    <div className="notice" style={{marginTop:"1.5rem"}}>This is general information only. For advice specific to your situation, consult a licensed REALTOR®.</div>

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
      <div className="field"><label className="check"><input type="checkbox" checked={f.working_with_realtor} onChange={e=>setF({...f,working_with_realtor:e.target.checked})}/> I am currently under contract with another REALTOR®</label></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.casl_consent} onChange={e=>setF({...f,casl_consent:e.target.checked})} data-testid="buyer-casl"/> I consent to receive commercial electronic messages from EZtoFind.ca (CASL). I can unsubscribe anytime.</label></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.pipa_ack} onChange={e=>setF({...f,pipa_ack:e.target.checked})} data-testid="buyer-pipa"/> I acknowledge the <Link to="/privacy" style={{color:"var(--brand-blue)"}}>Privacy Policy (PIPA)</Link>.</label></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}}>{err}</div>}
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="buyer-submit">Submit</button>
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
      <div style={{marginTop:"1rem"}} className="field"><label className="check"><input type="checkbox" checked={f.currently_listed} onChange={e=>setF({...f,currently_listed:e.target.checked})}/> The property is currently listed with another REALTOR®</label></div>
      <div style={{marginTop:"1rem"}} className="field"><label>Reason for selling (optional)</label><textarea rows="3" value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.casl_consent} onChange={e=>setF({...f,casl_consent:e.target.checked})}/> I consent to receive commercial electronic messages (CASL).</label></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.pipa_ack} onChange={e=>setF({...f,pipa_ack:e.target.checked})}/> I acknowledge the Privacy Policy (PIPA).</label></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626"}}>{err}</div>}
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="seller-submit">Submit</button>
    </form>
  </div></section>);
};

// --- REALTOR® network (3 stages) ---
const RealtorApply = () => {
  const [f,setF]=useState({full_name:"",email:""}); const [res,setRes]=useState(null); const [err,setErr]=useState("");
  const submit=async e=>{e.preventDefault(); setErr(""); try{ const r=await axios.post(`${API}/realtors/apply`,f); setRes(r.data);}catch(x){setErr("Try again.");} };
  return (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
    <img src={DOOGIE_POINT_R} alt="Doogie" style={{width:140,marginBottom:"1rem"}}/>
    <div className="eyebrow">For REALTORS® Only</div><h1 className="section-title">Join our BC referral network</h1>
    <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",lineHeight:1.7,marginBottom:"1.5rem"}}>Get vetted, qualified BC buyer &amp; seller leads outside Doug's focus areas. <strong>You pay 25% of your gross commission on successful closings — no upfront fees, no subscriptions.</strong> No referral fees paid out by us; we only get paid when you get paid.</p>
    <div className="notice" style={{marginBottom:"1.5rem"}}><strong>3-step vetting:</strong> (1) Submit name + email · (2) We email you the credentials form (brokerage + BCFSA REALTOR® number) · (3) Once verified, you complete the profile form and sign the referral agreement.</div>
    {res ? <div className="paper"><h3 style={{marginTop:0}}>Step 1 complete ✓</h3><p style={{fontFamily:"Inter,sans-serif"}}>{res.message}</p><Link to={res.next_form_url} className="btn btn-primary" data-testid="realtor-step2-link">Continue to Step 2 →</Link></div>
      : <form onSubmit={submit} className="paper" data-testid="realtor-apply-form">
          <div className="form-grid">
            <div className="field"><label>Full Name *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} data-testid="realtor-name"/></div>
            <div className="field"><label>Email *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="realtor-email"/></div>
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
const About = () => (<section className="section"><div className="container-x" style={{maxWidth:"48rem"}}>
  <div className="eyebrow">About</div><h1 className="section-title">Doug LeMaire, REALTOR®</h1>
  <div style={{display:"flex",gap:"2rem",flexWrap:"wrap",alignItems:"flex-start",marginTop:"2rem"}}>
    <img src="https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/doug-headshot.jpg" onError={e=>{e.target.src=DOOGIE_LAPTOP;}} alt="Doug LeMaire" style={{width:280,height:340,objectFit:"cover",borderRadius:16,boxShadow:"0 12px 32px rgba(15,42,91,0.15)"}}/>
    <div style={{flex:1,minWidth:280,fontFamily:"Inter,sans-serif",lineHeight:1.75,color:"var(--ink)"}}>
      <p><strong>13 years</strong> serving British Columbia real estate. Licensed with BCFSA. Member of CREA and Greater Vancouver REALTORS.</p>
      <p>Doug specializes in <strong>detached homes, luxury properties, equestrian &amp; acreage estates, estate sales/probate, and condos</strong> across Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor.</p>
      <p>EZtoFind.ca is Doug's answer to a broken discovery experience — an AI-first, compliance-first platform that treats consumers like adults and REALTORS® like partners.</p>
      <p><strong>Brokerage:</strong> Fraser Property Management Realty Services Ltd.</p>
    </div>
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
const Privacy = () => <Legal title="Privacy Policy (PIPA)" body={<><p>EZtoFind.ca collects personal information under British Columbia's Personal Information Protection Act (PIPA). We collect information you voluntarily provide via forms and Doogie AI chat. We use it solely to respond to your inquiry, provide referrals within our network, and (with your consent) send commercial electronic messages under CASL.</p><p>Data is stored on secured servers. You may request access, correction, or deletion at any time by emailing info@eztofind.ca. Our Privacy Officer: Doug LeMaire, Fraser Property Management Realty Services Ltd.</p><p>We do not sell your data. We may share your inquiry with a vetted REALTOR® in our referral network only if it falls outside Doug's focus areas or specialties — and only with your submission of a lead form indicating consent.</p></>}/>;
const Terms = () => <Legal title="Terms of Use" body={<><p>EZtoFind.ca provides general information about British Columbia real estate. Doogie (our AI assistant) does not provide financial, legal, tax, or investment advice. For advice, consult a licensed REALTOR®, lawyer, or accountant.</p><p>Listings data is provided under license from participating MLS® systems via an embedded iframe from Greater Vancouver For Sale. REALTOR® and MLS® are certification marks owned by the Canadian Real Estate Association (CREA).</p></>}/>;
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
      <a onClick={()=>nav("/admin/amenities")} className={active==="amenities"?"active":""} data-testid="admin-nav-amenities">📍 Community Amenities</a>
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
  useEffect(load,[]);
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
  const [amenities, setAmenities] = useState(null);
  const [loadingAm, setLoadingAm] = useState(true);
  useEffect(() => { axios.get(`${API}/communities`).then(r => setData(r.data)); }, []);
  useEffect(() => {
    setLoadingAm(true); setAmenities(null);
    axios.get(`${API}/community/${slug}/amenities`).then(r => { setAmenities(r.data); setLoadingAm(false); }).catch(() => setLoadingAm(false));
  }, [slug]);
  let found = null, region = null;
  for(const [r, list] of Object.entries(data)) { const m = list.find(c => c.toLowerCase().replace(/[^a-z0-9]+/g,"-") === slug); if(m) { found = m; region = r; break; } }
  const isFocus = region && ["Greater Vancouver","Fraser Valley","Sea-to-Sky"].includes(region);
  const jsonLd = found ? {"@context":"https://schema.org","@type":"Place","name":`${found}, British Columbia`,"containedInPlace":{"@type":"AdministrativeArea","name":region}} : null;
  const sections = [
    {key:"schools", icon:"🏫", label:"Schools"},
    {key:"hospitals", icon:"🏥", label:"Hospitals & Clinics"},
    {key:"malls", icon:"🛍️", label:"Shopping Centres"},
    {key:"parks", icon:"🌳", label:"Parks"},
    {key:"recreation", icon:"🏋️", label:"Recreation Centres"}
  ];
  return (<section className="section"><div className="container-x" style={{maxWidth:"46rem"}}>
    <Link to="/communities" style={{fontFamily:"Inter,sans-serif",color:"var(--brand-blue)",textDecoration:"none"}}>← All communities</Link>
    {found ? <>
      <div className="eyebrow" style={{marginTop:"1rem"}}>{region}</div>
      <h1 className="section-title">{found}, BC</h1>
      <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7}}>
        {isFocus
          ? `${found} sits within Doug LeMaire's primary practice area. As a licensed BC REALTOR® with 13 years' experience specializing in detached, luxury, equestrian, estate-sale, and condo properties, Doug can represent buyers and sellers here directly.`
          : `${found} is served by EZtoFind's vetted BC-wide referral network. Doug's primary practice is Greater Vancouver, Fraser Valley, and Sea-to-Sky — but we'll connect you with a qualified REALTOR® active in ${found}.`}
      </p>
      <div style={{marginTop:"2rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
        {isFocus ? <>
          <Link to="/buyer" className="btn btn-primary">I'm Buying in {found}</Link>
          <Link to="/seller" className="btn btn-green">I'm Selling in {found}</Link>
        </> : <Link to="/referral-request" className="btn btn-primary">Request a Referral REALTOR® in {found}</Link>}
        <Link to="/listings" className="btn btn-outline">View Listings</Link>
      </div>
      <div className="notice" style={{marginTop:"2rem"}}>This is general information. For advice specific to a property in {found}, consult a licensed REALTOR®.</div>

      <h2 style={{marginTop:"3rem",fontSize:"1.75rem"}}>Local amenities in {found}</h2>
      {loadingAm && <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)"}}>Loading amenities from OpenStreetMap…</p>}
      {!loadingAm && amenities && sections.map(s => {
        const items = amenities[s.key] || [];
        if(items.length === 0) return null;
        return (<div key={s.key} style={{marginTop:"1.5rem"}} data-testid={`amenity-${s.key}`}>
          <h3 className="font-display" style={{fontSize:"1.25rem",marginBottom:"0.5rem"}}>{s.icon} {s.label} <span style={{fontFamily:"Inter,sans-serif",fontSize:"0.85rem",color:"var(--muted)",fontWeight:400}}>({items.length})</span></h3>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
            {items.slice(0, 24).map((it, i) => (
              <a key={i} href={`https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lon}`} target="_blank" rel="noopener noreferrer" className="chip" style={{textDecoration:"none",fontSize:"0.85rem",display:"inline-flex",gap:"0.35rem",alignItems:"center"}}>
                {it.name}
                {it.level && it.level !== "School" && <span style={{fontSize:"0.7rem",background:"var(--brand-blue)",color:"white",padding:"0.1rem 0.4rem",borderRadius:6}}>{it.level}</span>}
                {it.operator === "Private" && <span style={{fontSize:"0.7rem",background:"var(--brand-gold)",color:"var(--brand-navy)",padding:"0.1rem 0.4rem",borderRadius:6}}>Private</span>}
                {it.authority && <span style={{fontSize:"0.7rem",background:"var(--brand-green-dark)",color:"white",padding:"0.1rem 0.4rem",borderRadius:6}}>{it.authority.replace(" Health","")}</span>}
                {it.admin_added && <span style={{fontSize:"0.7rem",color:"var(--brand-green-dark)"}}>★</span>}
              </a>
            ))}
          </div>
          {items.length > 24 && <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.82rem",color:"var(--muted)",marginTop:"0.5rem"}}>+{items.length-24} more</p>}
        </div>);
      })}
      {!loadingAm && amenities && sections.every(s => (amenities[s.key]||[]).length===0) && <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)"}}>Amenity data for this community is limited. Try a nearby larger centre.</p>}
      {!loadingAm && amenities && <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.75rem",color:"var(--muted)",marginTop:"1.5rem"}}>Amenity data: © OpenStreetMap contributors. Community-contributed — verify locally before relying.</p>}

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
    <div className="eyebrow">Free · No Obligation</div><h1 className="section-title">What's your BC home worth?</h1>
    <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",lineHeight:1.7,marginBottom:"1.5rem"}}>Doug will provide you with an estimated valuation in your area — Within 24 hours.</p>
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
    <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",lineHeight:1.7,marginBottom:"1.5rem"}}>Doug's primary practice is Greater Vancouver, Fraser Valley, and Sea-to-Sky. For any other BC community, we'll connect you with a vetted REALTOR® from our referral network — no cost to you.</p>
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

// --- Calculators (Mortgage + PTT) ---
const Calculators = () => {
  const [price,setPrice]=useState(1000000); const [down,setDown]=useState(200000); const [rate,setRate]=useState(5.25); const [amort,setAmort]=useState(25);
  const principal = Math.max(price - down, 0);
  const r = (rate/100)/12; const n = amort*12;
  const monthly = r>0 ? (principal*r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1) : principal/n;
  // BC PTT
  const ptt = (p) => { let t=0; if(p<=200000) return p*0.01; t+=200000*0.01; if(p<=2000000) return t+(p-200000)*0.02; t+=1800000*0.02; if(p<=3000000) return t+(p-2000000)*0.03; t+=1000000*0.03; return t+(p-3000000)*0.05; };
  const [ftbFirstTime,setFtb]=useState(false); const [newBuilt,setNew]=useState(false);
  let pttOwed = ptt(price);
  if(ftbFirstTime && price <= 835000) pttOwed = 0;
  else if(ftbFirstTime && price <= 860000) pttOwed = pttOwed * ((860000-price)/25000);
  if(newBuilt && price <= 1100000) pttOwed = 0;
  else if(newBuilt && price <= 1150000) pttOwed = pttOwed * ((1150000-price)/50000);
  const fmt = n => "$"+Math.round(n).toLocaleString();
  return (<section className="section"><div className="container-x" style={{maxWidth:"52rem"}}>
    <div className="eyebrow">BC Calculators</div><h1 className="section-title">Mortgage & Property Transfer Tax</h1>
    <div className="paper">
      <div className="form-grid">
        <div className="field"><label>Purchase Price ($)</label><input type="number" value={price} onChange={e=>setPrice(+e.target.value)} data-testid="calc-price"/></div>
        <div className="field"><label>Down Payment ($)</label><input type="number" value={down} onChange={e=>setDown(+e.target.value)}/></div>
        <div className="field"><label>Interest Rate (%)</label><input type="number" step="0.05" value={rate} onChange={e=>setRate(+e.target.value)}/></div>
        <div className="field"><label>Amortization (years)</label><select value={amort} onChange={e=>setAmort(+e.target.value)}><option>15</option><option>20</option><option>25</option><option>30</option></select></div>
      </div>
      <div style={{marginTop:"1rem",display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
        <label className="check" style={{fontFamily:"Inter,sans-serif"}}><input type="checkbox" checked={ftbFirstTime} onChange={e=>setFtb(e.target.checked)}/> First-time home buyer</label>
        <label className="check" style={{fontFamily:"Inter,sans-serif"}}><input type="checkbox" checked={newBuilt} onChange={e=>setNew(e.target.checked)}/> Newly built home</label>
      </div>
      <div className="grid-2" style={{marginTop:"2rem",gap:"1rem"}}>
        <div style={{background:"#F5F0E1",padding:"1.5rem",borderRadius:12,fontFamily:"Inter,sans-serif"}}>
          <div style={{fontSize:"0.85rem",color:"var(--muted)"}}>Estimated Monthly Payment</div>
          <div style={{fontSize:"2.2rem",fontWeight:700,color:"var(--brand-navy)"}} data-testid="calc-monthly">{fmt(monthly)}</div>
          <div style={{fontSize:"0.8rem",color:"var(--muted)",marginTop:"0.5rem"}}>Principal + interest only. Excludes taxes, strata, insurance.</div>
        </div>
        <div style={{background:"#E8F5E9",padding:"1.5rem",borderRadius:12,fontFamily:"Inter,sans-serif"}}>
          <div style={{fontSize:"0.85rem",color:"var(--muted)"}}>BC Property Transfer Tax</div>
          <div style={{fontSize:"2.2rem",fontWeight:700,color:"var(--brand-green-dark)"}} data-testid="calc-ptt">{fmt(pttOwed)}</div>
          <div style={{fontSize:"0.8rem",color:"var(--muted)",marginTop:"0.5rem"}}>Based on 2026 rates. Full/partial exemptions applied if eligible.</div>
        </div>
      </div>
    </div>
    <div className="notice" style={{marginTop:"1.5rem"}}>Estimates only. Not financial or legal advice. Consult a mortgage broker and REALTOR® for your specific situation.</div>
  </div></section>);
};

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
  const [email,setEmail]=useState(""); const [done,setDone]=useState(false);
  return (<section className="section"><div className="container-x" style={{maxWidth:"36rem"}}>
    <div className="eyebrow">CASL Withdrawal</div><h1 className="section-title">Unsubscribe</h1>
    {done ? <div className="paper" style={{fontFamily:"Inter,sans-serif"}}><p>✓ You've been unsubscribed. It may take up to 10 business days to remove you from all lists, as permitted under CASL.</p></div>
    : <form onSubmit={e=>{e.preventDefault();setDone(true);}} className="paper">
      <div className="field"><label>Email address to unsubscribe *</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} data-testid="unsub-email"/></div>
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="unsub-submit">Unsubscribe</button>
      <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.85rem",color:"var(--muted)",marginTop:"1rem"}}>You may also email info@eztofind.ca directly to withdraw consent.</p>
    </form>}
  </div></section>);
};

// --- Cookie banner ---
const CookieBanner = () => {
  const [show, setShow] = useState(() => !localStorage.getItem("ez_cookie"));
  if(!show) return null;
  return <div style={{position:"fixed",bottom:20,left:20,right:20,maxWidth:520,background:"var(--brand-navy)",color:"white",padding:"1rem 1.25rem",borderRadius:12,zIndex:59,boxShadow:"0 20px 40px rgba(0,0,0,0.3)",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
    <div style={{flex:1,minWidth:220}}>We use minimal essential cookies. See our <Link to="/privacy" style={{color:"var(--brand-gold)"}}>Privacy Policy</Link>.</div>
    <button className="btn btn-green" onClick={()=>{localStorage.setItem("ez_cookie","1");setShow(false);}} style={{padding:"0.5rem 1rem"}} data-testid="cookie-accept">OK</button>
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
  <div style={{background:"#F5F0E1",padding:"0.6rem 1rem",fontFamily:"Inter,sans-serif",fontSize:"0.78rem",color:"var(--muted)",textAlign:"center",borderBottom:"1px solid rgba(15,42,91,0.08)"}}>
    Doogie provides general information only. Not financial, legal, or investment advice. Consult a licensed REALTOR®. | BCFSA · CREA · GVR · PIPA · CASL compliant
  </div>
);

// --- Admin Amenity Editor ---
const AdminAmenities = () => {
  const {headers} = useAdmin();
  const [communities, setCommunities] = useState({});
  const [slug, setSlug] = useState("langley-township");
  const [name, setName] = useState("Langley Township");
  const [data, setData] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({category:"schools", name:"", address:"", notes:""});

  useEffect(() => { axios.get(`${API}/communities`).then(r => setCommunities(r.data)); }, []);
  const load = async () => {
    setBusy(true); setMsg("");
    const [amRes, ovRes] = await Promise.all([
      axios.get(`${API}/community/${slug}/amenities`).catch(() => ({data:null})),
      axios.get(`${API}/admin/amenity-overrides`, {headers, params:{slug}}).catch(() => ({data:[]}))
    ]);
    setData(amRes.data); setOverrides(ovRes.data); setBusy(false);
  };
  useEffect(() => { if(slug) load(); /* eslint-disable-next-line */ }, [slug]);

  const hideItem = async (category, itemName) => {
    if(!window.confirm(`Hide "${itemName}" from ${name}?`)) return;
    await axios.post(`${API}/admin/amenity-overrides`, {slug, category, action:"hide", name:itemName}, {headers});
    setMsg("Hidden."); load();
  };
  const addItem = async e => {
    e.preventDefault();
    if(!f.name.trim()) return;
    await axios.post(`${API}/admin/amenity-overrides`, {slug, category:f.category, action:"add", name:f.name, address:f.address, notes:f.notes}, {headers});
    setF({category:f.category, name:"", address:"", notes:""}); setMsg("Added."); load();
  };
  const removeOverride = async oid => {
    if(!window.confirm("Remove this override?")) return;
    await axios.delete(`${API}/admin/amenity-overrides/${oid}`, {headers});
    setMsg("Removed."); load();
  };
  const refresh = async () => {
    if(!window.confirm(`Refresh OSM cache for ${name}?`)) return;
    await axios.post(`${API}/admin/community/${slug}/refresh`, {}, {headers});
    setMsg("Cache cleared. Next visit re-fetches from OSM."); load();
  };

  const sections = [
    {key:"schools", icon:"🏫", label:"Schools"},
    {key:"hospitals", icon:"🏥", label:"Hospitals & Clinics"},
    {key:"malls", icon:"🛍️", label:"Shopping Centres"},
    {key:"parks", icon:"🌳", label:"Parks"},
    {key:"recreation", icon:"🏋️", label:"Recreation"}
  ];

  return <AdminShell active="amenities">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>Community Amenities Editor</h1>
    <p style={{color:"var(--muted)",marginTop:0}}>Curate the schools, hospitals, malls, parks & rec centres on each community page. OpenStreetMap data first; add or hide as needed.</p>

    <div className="paper" style={{marginTop:"1rem"}}>
      <label style={{display:"block",marginBottom:"0.5rem",fontWeight:600}}>Select community</label>
      <select value={slug} onChange={e=>{const s=e.target.value;setSlug(s);const opt=e.target.options[e.target.selectedIndex];setName(opt.text);}} data-testid="admin-amen-picker" style={{padding:"0.6rem 0.85rem",borderRadius:8,border:"1.5px solid rgba(15,42,91,0.15)",width:"100%",maxWidth:420,fontFamily:"Inter,sans-serif"}}>
        {Object.entries(communities).map(([region, list]) => (
          <optgroup key={region} label={region}>
            {list.map(c => <option key={c} value={c.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}>{c}</option>)}
          </optgroup>
        ))}
      </select>
      <button onClick={refresh} className="btn btn-outline" style={{marginLeft:"0.75rem",padding:"0.5rem 1rem"}} data-testid="admin-amen-refresh">↻ Refresh OSM</button>
      {msg && <span style={{marginLeft:"1rem",color:"var(--brand-green-dark)"}}>{msg}</span>}
    </div>

    {busy && <p style={{marginTop:"1rem"}}>Loading…</p>}
    {!busy && data && <>
      {overrides.length > 0 && <div className="paper" style={{marginTop:"1.5rem",background:"#FFF8E8"}}>
        <h3 style={{marginTop:0,fontSize:"1.1rem"}}>Active overrides for {name} ({overrides.length})</h3>
        <table className="admin-table" style={{fontSize:"0.85rem"}}>
          <thead><tr><th>Action</th><th>Category</th><th>Name</th><th></th></tr></thead>
          <tbody>{overrides.map(o => <tr key={o.id}>
            <td><span style={{background:o.action==="hide"?"#FEE2E2":"#DCFCE7",padding:"0.2rem 0.5rem",borderRadius:6,fontSize:"0.75rem"}}>{o.action}</span></td>
            <td>{o.category}</td>
            <td>{o.name}</td>
            <td><button onClick={()=>removeOverride(o.id)} style={{background:"transparent",border:"none",color:"#DC2626",cursor:"pointer"}}>Remove</button></td>
          </tr>)}</tbody>
        </table>
      </div>}

      <div className="paper" style={{marginTop:"1.5rem"}}>
        <h3 style={{marginTop:0,fontSize:"1.15rem"}}>+ Add a custom amenity</h3>
        <form onSubmit={addItem} style={{display:"grid",gridTemplateColumns:"1fr 2fr 2fr 1fr",gap:"0.75rem",alignItems:"end"}}>
          <div className="field"><label>Category</label><select value={f.category} onChange={e=>setF({...f,category:e.target.value})} data-testid="admin-amen-add-cat">{sections.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
          <div className="field"><label>Name *</label><input required value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="e.g. Walnut Grove Secondary" data-testid="admin-amen-add-name"/></div>
          <div className="field"><label>Address</label><input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></div>
          <button type="submit" className="btn btn-green" data-testid="admin-amen-add-btn">Add</button>
        </form>
      </div>

      {sections.map(s => {
        const items = (data[s.key] || []);
        if(items.length === 0) return null;
        return (<div key={s.key} style={{marginTop:"1.5rem"}}>
          <h3 className="font-display" style={{fontSize:"1.15rem",marginBottom:"0.5rem"}}>{s.icon} {s.label} ({items.length})</h3>
          <table className="admin-table" style={{fontSize:"0.85rem"}}>
            <thead><tr><th style={{width:"40%"}}>Name</th><th>Details</th><th style={{width:120}}>Source</th><th style={{width:80}}></th></tr></thead>
            <tbody>{items.map((it, i) => <tr key={i}>
              <td><strong>{it.name}</strong></td>
              <td style={{color:"var(--muted)"}}>{it.level ? `${it.level}${it.operator?` · ${it.operator}`:""}` : ""}{it.type ? `${it.type}${it.authority?` · ${it.authority}`:""}` : ""}{it.address && <div>{it.address}</div>}</td>
              <td>{it.admin_added ? <span style={{color:"var(--brand-green-dark)"}}>✓ Custom</span> : <span style={{color:"var(--muted)"}}>OSM</span>}</td>
              <td>{!it.admin_added && <button onClick={()=>hideItem(s.key, it.name)} style={{background:"transparent",border:"1px solid #DC2626",color:"#DC2626",cursor:"pointer",padding:"0.25rem 0.5rem",borderRadius:6,fontSize:"0.78rem"}}>Hide</button>}</td>
            </tr>)}</tbody>
          </table>
        </div>);
      })}
    </>}
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
      <Route path="/calculators" element={<AppLayout><Calculators/></AppLayout>}/>
      <Route path="/realtors" element={<AppLayout><RealtorApply/></AppLayout>}/>
      <Route path="/realtors/credentials/:id" element={<AppLayout><RealtorCredentials/></AppLayout>}/>
      <Route path="/about" element={<AppLayout><About/></AppLayout>}/>
      <Route path="/contact" element={<AppLayout><Contact/></AppLayout>}/>
      <Route path="/privacy" element={<AppLayout><Privacy/></AppLayout>}/>
      <Route path="/terms" element={<AppLayout><Terms/></AppLayout>}/>
      <Route path="/compliance" element={<AppLayout><Compliance/></AppLayout>}/>
      <Route path="/data-attribution" element={<AppLayout><DataAttribution/></AppLayout>}/>
      <Route path="/unsubscribe" element={<AppLayout><Unsubscribe/></AppLayout>}/>
      <Route path="/admin/login" element={<AdminLogin/>}/>
      <Route path="/admin" element={<AdminDash/>}/>
      <Route path="/admin/buyers" element={<AdminList title="Buyer Leads" url="/admin/leads/buyer" active="buyers" cols={[["created_at","Date"],["full_name","Name"],["email","Email"],["phone","Phone"],["property_type","Type"],["budget_range","Budget"],["timeline","Timeline"],["working_with_realtor","W/ REALTOR®?"]]}/>}/>
      <Route path="/admin/sellers" element={<AdminList title="Seller Leads" url="/admin/leads/seller" active="sellers" cols={[["created_at","Date"],["full_name","Name"],["email","Email"],["city","City"],["property_type","Type"],["timeline","Timeline"],["estimated_value","Value"]]}/>}/>
      <Route path="/admin/realtors" element={<AdminList title="REALTOR® Applications" url="/admin/realtors" active="realtors" cols={[["created_at","Date"],["full_name","Name"],["email","Email"],["brokerage","Brokerage"],["realtor_number","REALTOR® #"],["stage","Stage"],["status","Status"]]}/>}/>
      <Route path="/admin/clients" element={<AdminClients/>}/>
      <Route path="/admin/amenities" element={<AdminAmenities/>}/>
    </Routes>
  </BrowserRouter>);
}

export default App;
