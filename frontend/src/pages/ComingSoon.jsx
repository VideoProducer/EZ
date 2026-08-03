// Coming-Soon Hero — private preview + admin editor + drop-in homepage card
// ---------------------------------------------------------------------------
// Three exports:
//   <ComingSoonHero mode="preview"/>  — full-width mock at /preview/coming-soon
//   <ComingSoonHero mode="home"/>     — homepage embed (only renders if published)
//   <AdminComingSoon/>                — admin editor at /admin/coming-soon
//
// Video renders via HTML5 <video> for uploaded MP4/WEBM/MOV. YouTube/Vimeo
// URLs are auto-detected and rendered as an <iframe> embed.

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FILE_ORIGIN = process.env.REACT_APP_BACKEND_URL || "";
// Resolve an uploads path against the backend origin. Also migrate any legacy
// /uploads/... path to /api/uploads/... on the fly (ingress routes only /api).
const abs = (u) => {
  if (!u) return u;
  if (u.startsWith("http")) return u;
  if (u.startsWith("/uploads/")) return `${FILE_ORIGIN}/api${u}`;
  if (u.startsWith("/")) return `${FILE_ORIGIN}${u}`;
  return u;
};

// ---- Video renderer ----
function VideoPlayer({ url, poster, controls = true, autoPlay = false, muted = true, loop = false, className, testid }) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (yt) return <iframe data-testid={testid} className={className} src={`https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1${autoPlay ? "&autoplay=1&mute=1" : ""}${loop ? `&loop=1&playlist=${yt[1]}` : ""}`} title="Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{width:"100%",aspectRatio:"16/9",border:0}}/>;
  if (vimeo) return <iframe data-testid={testid} className={className} src={`https://player.vimeo.com/video/${vimeo[1]}?title=0&byline=0&portrait=0${autoPlay ? "&autoplay=1&muted=1" : ""}${loop ? "&loop=1" : ""}`} title="Video" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{width:"100%",aspectRatio:"16/9",border:0}}/>;
  return (
    <video data-testid={testid} className={className} controls={controls} autoPlay={autoPlay} muted={muted} loop={loop} playsInline poster={abs(poster)} preload="metadata" style={{width:"100%",aspectRatio:"16/9",background:"#000",objectFit:"cover"}}>
      <source src={abs(url)} type={url.endsWith(".webm") ? "video/webm" : url.endsWith(".mov") ? "video/quicktime" : "video/mp4"}/>
      Your browser doesn't support this video format.
    </video>
  );
}

// ---- The hero card (used by preview + homepage) ----
export function ComingSoonHero({ mode = "home", data = null }) {
  const [cs, setCs] = useState(data);
  useEffect(() => {
    if (data) return;
    const endpoint = mode === "preview"
      ? `${API}/admin/coming-soon`
      : `${API}/coming-soon`;
    // SEC-009: auth via HttpOnly cookie (axios.defaults.withCredentials=true).
    axios.get(endpoint)
      .then(r => setCs(r.data))
      .catch(err => setCs({ __error: err.response?.status === 401 ? "unauthorized" : "unavailable" }));
  }, [mode, data]);

  if (!cs) return mode === "preview" ? <div style={{padding:"3rem",textAlign:"center",color:"var(--muted)"}}>Loading preview…</div> : null;
  // On the public homepage, never surface load/auth errors — hide silently so
  // visitors don't see admin diagnostics while the backend is spinning up.
  if (cs.__error) {
    if (mode !== "preview") return null;
    if (cs.__error === "unauthorized") return (
      <div style={{padding:"3rem",textAlign:"center",fontFamily:"Inter,sans-serif"}}>
        <h2 style={{color:"var(--brand-navy)"}}>Preview requires admin login</h2>
        <p style={{color:"var(--muted)"}}>Please <Link to="/admin/login" style={{color:"var(--brand-blue)",fontWeight:600}}>sign in</Link>, then reopen this preview URL.</p>
      </div>
    );
    return (
      <div style={{padding:"3rem",textAlign:"center",fontFamily:"Inter,sans-serif"}}>
        <h2 style={{color:"var(--brand-navy)"}}>Preview unavailable</h2>
        <p style={{color:"var(--muted)"}}>The coming-soon draft could not be loaded. Try refreshing.</p>
      </div>
    );
  }
  if (mode === "home" && !cs.published) return null;

  // Empty-state guidance — makes "nothing to show yet" obvious in preview mode.
  const hasAnyContent = cs.title || cs.community || cs.price_teaser || cs.photos?.length || cs.video_url || cs.description;
  if (mode === "preview" && !hasAnyContent) return (
    <div style={{padding:"4rem 2rem",textAlign:"center",background:"#0F2A5B",color:"white",minHeight:"60vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",fontFamily:"Inter,sans-serif"}} data-testid="coming-soon-empty-preview">
      <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🏛️</div>
      <h2 style={{margin:"0 0 0.75rem",fontFamily:'"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif',fontSize:"1.75rem"}}>Coming-Soon Preview — Empty</h2>
      <p style={{maxWidth:"32rem",color:"#F5F0E1",fontSize:"0.95rem",lineHeight:1.6,marginBottom:"1.5rem"}}>Head to the admin editor to add photos, video, price teaser, and details. Once you save, refresh this page to see the mockup exactly as it will appear on the homepage.</p>
      <Link to="/admin/coming-soon" style={{background:"#FDB813",color:"#0F2A5B",padding:"0.85rem 1.85rem",borderRadius:99,fontWeight:700,textDecoration:"none",fontSize:"0.95rem"}} data-testid="coming-soon-empty-goto-admin">Open the editor →</Link>
    </div>
  );

  const heroPhoto = cs.photos?.find(p => p.id === cs.hero_photo_id) || cs.photos?.[0];
  const otherPhotos = (cs.photos || []).filter(p => p.id !== heroPhoto?.id).slice(0, 4);
  const hasVideo = !!cs.video_url;

  return (
    <section data-testid="coming-soon-hero" style={{background:"#0F2A5B",color:"white",padding:0,overflow:"hidden"}}>
      <div style={{position:"relative"}}>
        {/* Hero visual — video takes priority, else hero photo */}
        <div style={{position:"relative",width:"100%",aspectRatio:"21/9",background:"#000",overflow:"hidden"}}>
          {hasVideo ? (
            <VideoPlayer url={cs.video_url} poster={heroPhoto?.url} autoPlay muted loop controls={false} testid="coming-soon-hero-video"/>
          ) : heroPhoto ? (
            <img src={abs(heroPhoto.url)} alt={cs.title || "Coming soon listing"} data-testid="coming-soon-hero-image" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          ) : (
            <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg, #0F2A5B, #1e3a8a)",fontSize:"1.1rem",color:"rgba(255,255,255,0.5)"}}>Upload a photo or video to preview</div>
          )}
          {/* Dark gradient overlay for text legibility */}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg, rgba(15,42,91,0.85) 0%, rgba(15,42,91,0.55) 45%, rgba(15,42,91,0.15) 100%)",pointerEvents:"none"}}/>
          {/* Content overlay */}
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",padding:"3rem 2rem"}}>
            <div style={{maxWidth:"36rem"}}>
              {cs.eyebrow && (
                <div style={{fontSize:"0.72rem",letterSpacing:"0.24em",textTransform:"uppercase",color:"#FDB813",fontWeight:800,marginBottom:"0.75rem"}} data-testid="coming-soon-eyebrow">{cs.eyebrow}</div>
              )}
              {cs.title && <h2 style={{fontFamily:'"TeX Gyre Heros Bold","TeXGyreHeros-Bold","Helvetica Neue",Arial,sans-serif',fontSize:"clamp(1.75rem, 4vw, 3rem)",lineHeight:1.1,margin:0,marginBottom:"0.5rem"}} data-testid="coming-soon-title">{cs.title}</h2>}
              {cs.community && <div style={{fontSize:"1.05rem",color:"#F5F0E1",marginBottom:"1rem",fontFamily:"Inter,sans-serif"}}>{cs.community}</div>}
              {cs.price_teaser && <div style={{fontSize:"1.35rem",fontWeight:700,color:"#FDB813",marginBottom:"1.25rem",fontFamily:"Inter,sans-serif"}} data-testid="coming-soon-price">{cs.price_teaser}</div>}
              {/* Bed/bath/sqft chips */}
              {(cs.beds || cs.baths || cs.sqft) && (
                <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"1.25rem"}}>
                  {cs.beds != null && <span style={{background:"rgba(255,255,255,0.15)",padding:"0.35rem 0.85rem",borderRadius:99,fontSize:"0.85rem",fontFamily:"Inter,sans-serif",backdropFilter:"blur(4px)"}}>{cs.beds} Bed</span>}
                  {cs.baths != null && <span style={{background:"rgba(255,255,255,0.15)",padding:"0.35rem 0.85rem",borderRadius:99,fontSize:"0.85rem",fontFamily:"Inter,sans-serif",backdropFilter:"blur(4px)"}}>{cs.baths} Bath</span>}
                  {cs.sqft != null && <span style={{background:"rgba(255,255,255,0.15)",padding:"0.35rem 0.85rem",borderRadius:99,fontSize:"0.85rem",fontFamily:"Inter,sans-serif",backdropFilter:"blur(4px)"}}>{cs.sqft.toLocaleString()} sq ft</span>}
                </div>
              )}
              {cs.cta_label && cs.cta_link && (
                <a href={cs.cta_link} data-testid="coming-soon-cta" style={{display:"inline-block",background:"#FDB813",color:"#0F2A5B",padding:"0.85rem 1.85rem",borderRadius:99,fontWeight:700,textDecoration:"none",fontFamily:"Inter,sans-serif",fontSize:"0.95rem"}}>{cs.cta_label} →</a>
              )}
            </div>
          </div>
        </div>
        {/* Gallery strip below the hero */}
        {otherPhotos.length > 0 && (
          <div style={{background:"#0A1F45",padding:"1rem",display:"grid",gridTemplateColumns:`repeat(${otherPhotos.length}, 1fr)`,gap:"0.5rem"}} data-testid="coming-soon-gallery">
            {otherPhotos.map(p => (
              <img key={p.id} src={abs(p.url)} alt="" style={{width:"100%",aspectRatio:"4/3",objectFit:"cover",borderRadius:6,cursor:"pointer"}} onClick={()=>window.open(abs(p.url),"_blank")}/>
            ))}
          </div>
        )}
        {/* Description + features */}
        {(cs.description || (cs.features && cs.features.length > 0)) && (
          <div style={{background:"#0A1F45",color:"#F5F0E1",padding:"2rem",display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:"2.5rem"}}>
            {cs.description && <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.95rem",lineHeight:1.75,whiteSpace:"pre-line"}} data-testid="coming-soon-description">{cs.description}</div>}
            {cs.features && cs.features.length > 0 && (
              <ul style={{listStyle:"none",padding:0,margin:0,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem 1.5rem",fontFamily:"Inter,sans-serif",fontSize:"0.9rem"}} data-testid="coming-soon-features">
                {cs.features.map((f,i)=>(<li key={i} style={{paddingLeft:"1.15rem",position:"relative"}}><span style={{position:"absolute",left:0,color:"#FDB813",fontWeight:900}}>✦</span>{f}</li>))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Admin Editor ----
export default function AdminComingSoon({ headers, onNavAdmin }) {
  const [cs, setCs] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [featureInput, setFeatureInput] = useState("");
  const photoInput = useRef(); const videoInput = useRef();

  const load = async () => {
    const r = await axios.get(`${API}/admin/coming-soon`, { headers });
    setCs(r.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const patch = (partial) => setCs(c => ({ ...c, ...partial }));

  const save = async () => {
    setBusy(true); setMsg("");
    try {
      await axios.put(`${API}/admin/coming-soon`, {
        published: cs.published,
        eyebrow: cs.eyebrow, title: cs.title, community: cs.community,
        price_teaser: cs.price_teaser, beds: cs.beds, baths: cs.baths, sqft: cs.sqft,
        features: cs.features, description: cs.description,
        photos: cs.photos, hero_photo_id: cs.hero_photo_id,
        video_url: cs.video_url, video_type: cs.video_type,
        cta_label: cs.cta_label, cta_link: cs.cta_link,
      }, { headers });
      setMsg("✓ Saved"); setTimeout(()=>setMsg(""), 3000);
    } catch (e) { setMsg("⚠ " + (e.response?.data?.detail || e.message)); }
    finally { setBusy(false); }
  };

  // Persist arbitrary field(s) directly to backend without going through
  // full-form save. Used for auto-persist after uploads / hero toggle so the
  // preview page sees changes immediately.
  const persistPartial = async (partial) => {
    try {
      const r = await axios.put(`${API}/admin/coming-soon`, partial, { headers });
      setCs(r.data);
    } catch (e) { setMsg("⚠ " + (e.response?.data?.detail || e.message)); }
  };

  const uploadPhotos = async (files) => {
    setBusy(true); setMsg("Uploading photos…");
    try {
      const uploaded = [];
      for (const f of files) {
        const fd = new FormData(); fd.append("file", f);
        const r = await axios.post(`${API}/admin/coming-soon/upload-photo`, fd, { headers: {...headers, "Content-Type": "multipart/form-data"} });
        uploaded.push(r.data);
      }
      const newPhotos = [...(cs.photos || []), ...uploaded];
      const newHero = cs.hero_photo_id || uploaded[0]?.id;
      // Persist to DB immediately so preview sees it without waiting on Save
      await persistPartial({ photos: newPhotos, hero_photo_id: newHero });
      setMsg(`✓ Uploaded and saved ${uploaded.length} photo${uploaded.length===1?"":"s"}`);
      setTimeout(()=>setMsg(""), 3500);
    } catch (e) { setMsg("⚠ " + (e.response?.data?.detail || e.message)); }
    finally { setBusy(false); }
  };

  const uploadVideo = async (file) => {
    setBusy(true); setMsg(`Uploading video (${(file.size/1024/1024).toFixed(1)} MB)… this may take a minute`);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await axios.post(`${API}/admin/coming-soon/upload-video`, fd, { headers: {...headers, "Content-Type": "multipart/form-data"} });
      await persistPartial({ video_url: r.data.url, video_type: "file" });
      setMsg(`✓ Uploaded and saved video`);
      setTimeout(()=>setMsg(""), 3500);
    } catch (e) { setMsg("⚠ " + (e.response?.data?.detail || e.message)); }
    finally { setBusy(false); }
  };

  const removePhoto = async (photo) => {
    if (!window.confirm("Remove this photo?")) return;
    await axios.delete(`${API}/admin/coming-soon/asset?path=${encodeURIComponent(photo.url)}`, { headers }).catch(()=>{});
    const newPhotos = cs.photos.filter(p => p.id !== photo.id);
    const newHero = cs.hero_photo_id === photo.id ? (newPhotos[0]?.id || null) : cs.hero_photo_id;
    await persistPartial({ photos: newPhotos, hero_photo_id: newHero });
  };
  const removeVideo = async () => {
    if (cs.video_type === "file" && cs.video_url) {
      await axios.delete(`${API}/admin/coming-soon/asset?path=${encodeURIComponent(cs.video_url)}`, { headers }).catch(()=>{});
    }
    await persistPartial({ video_url: "", video_type: "file" });
  };

  // Auto-persist when the user changes the ★ Hero star, or flips the Publish toggle.
  const setHero = (id) => persistPartial({ hero_photo_id: id });
  const setPublished = (v) => persistPartial({ published: v });

  const addFeature = () => {
    const f = featureInput.trim();
    if (!f) return;
    setCs(c => ({ ...c, features: [...(c.features||[]), f] }));
    setFeatureInput("");
  };

  if (!cs) return <div style={{padding:"2rem"}}>Loading…</div>;

  return (
    <div data-testid="admin-cs-page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"1rem",flexWrap:"wrap",marginBottom:"1rem"}}>
        <div>
          <h2 style={{margin:0}} data-testid="admin-cs-title">🏛️ Coming-Soon Listing</h2>
          <p style={{color:"var(--muted)",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",marginTop:"0.35rem"}}>Prepare an upcoming luxury listing with photos + video before it hits MLS®. Preview privately, publish to the homepage when ready.</p>
        </div>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          <Link to="/preview/coming-soon" target="_blank" className="btn btn-ghost" data-testid="admin-cs-preview-link">👁 Open preview</Link>
          <button className="btn btn-primary" onClick={save} disabled={busy} data-testid="admin-cs-save">{busy ? "Working…" : "💾 Save"}</button>
        </div>
      </div>
      {msg && <div data-testid="admin-cs-msg" style={{padding:"0.6rem 1rem",borderRadius:6,background: msg.startsWith("⚠")?"#FEF2F2":"#F0FDF4",color: msg.startsWith("⚠")?"#DC2626":"#059669",border: msg.startsWith("⚠")?"1px solid #FCA5A5":"1px solid #86EFAC",marginBottom:"1rem",fontFamily:"Inter,sans-serif",fontSize:"0.9rem"}}>{msg}</div>}

      <div className="paper" style={{padding:"1.25rem",marginBottom:"1rem"}}>
        <label style={{display:"flex",alignItems:"center",gap:"0.75rem",cursor:"pointer",fontWeight:700}}>
          <input type="checkbox" checked={!!cs.published} onChange={e=>setPublished(e.target.checked)} data-testid="admin-cs-published"/>
          <span>Show on homepage {cs.published ? <span style={{color:"var(--brand-green)"}}>· LIVE</span> : <span style={{color:"var(--muted)"}}>· parked (preview only)</span>}</span>
        </label>
      </div>

      <div className="paper" style={{padding:"1.5rem",marginBottom:"1rem"}}>
        <h3 style={{marginTop:0}}>Listing details</h3>
        <div className="form-grid">
          <div className="field"><label>Eyebrow (top-line label)</label><input value={cs.eyebrow||""} onChange={e=>patch({eyebrow:e.target.value})} data-testid="admin-cs-eyebrow" placeholder="Coming Soon"/></div>
          <div className="field"><label>Headline / Title</label><input value={cs.title||""} onChange={e=>patch({title:e.target.value})} data-testid="admin-cs-headline-title" placeholder="e.g. Waterfront West Vancouver Estate"/></div>
          <div className="field"><label>Community / Location</label><input value={cs.community||""} onChange={e=>patch({community:e.target.value})} data-testid="admin-cs-community" placeholder="e.g. West Vancouver, BC"/></div>
          <div className="field"><label>Price teaser</label><input value={cs.price_teaser||""} onChange={e=>patch({price_teaser:e.target.value})} data-testid="admin-cs-price" placeholder="e.g. $4,995,000 or Offers over $4M"/></div>
          <div className="field"><label>Beds</label><input type="number" step="0.5" value={cs.beds??""} onChange={e=>patch({beds:e.target.value===""?null:Number(e.target.value)})} data-testid="admin-cs-beds"/></div>
          <div className="field"><label>Baths</label><input type="number" step="0.5" value={cs.baths??""} onChange={e=>patch({baths:e.target.value===""?null:Number(e.target.value)})} data-testid="admin-cs-baths"/></div>
          <div className="field"><label>Sq ft</label><input type="number" value={cs.sqft??""} onChange={e=>patch({sqft:e.target.value===""?null:parseInt(e.target.value,10)})} data-testid="admin-cs-sqft"/></div>
        </div>
        <div className="field" style={{marginTop:"1rem"}}>
          <label>Description</label>
          <textarea rows="4" value={cs.description||""} onChange={e=>patch({description:e.target.value})} data-testid="admin-cs-description" placeholder="A short editorial paragraph — no MLS® remarks yet, save that for launch."/>
        </div>
        <div className="field" style={{marginTop:"1rem"}}>
          <label>Feature bullets (one at a time)</label>
          <div style={{display:"flex",gap:"0.5rem"}}>
            <input value={featureInput} onChange={e=>setFeatureInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addFeature();}}} placeholder="e.g. Ocean views" data-testid="admin-cs-feature-input"/>
            <button type="button" className="btn btn-ghost" onClick={addFeature} data-testid="admin-cs-feature-add">+ Add</button>
          </div>
          {cs.features && cs.features.length > 0 && (
            <div style={{marginTop:"0.5rem",display:"flex",flexWrap:"wrap",gap:"0.35rem"}}>
              {cs.features.map((f,i)=>(<span key={i} style={{background:"var(--brand-navy)",color:"#F5F0E1",padding:"0.3rem 0.7rem",borderRadius:99,fontSize:"0.82rem",display:"inline-flex",alignItems:"center",gap:"0.4rem"}}>{f}<button type="button" onClick={()=>patch({features: cs.features.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:"#F5F0E1",cursor:"pointer",fontSize:"1rem",lineHeight:1}} aria-label="Remove">×</button></span>))}
            </div>
          )}
        </div>
        <div className="form-grid" style={{marginTop:"1rem"}}>
          <div className="field"><label>CTA label</label><input value={cs.cta_label||""} onChange={e=>patch({cta_label:e.target.value})} data-testid="admin-cs-cta-label"/></div>
          <div className="field"><label>CTA link</label><input value={cs.cta_link||""} onChange={e=>patch({cta_link:e.target.value})} data-testid="admin-cs-cta-link" placeholder="mailto:... or https://..."/></div>
        </div>
      </div>

      <div className="paper" style={{padding:"1.5rem",marginBottom:"1rem"}}>
        <h3 style={{marginTop:0}}>Photos</h3>
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" multiple style={{display:"none"}} onChange={e=>{if(e.target.files.length) uploadPhotos([...e.target.files]); e.target.value="";}} data-testid="admin-cs-photo-input"/>
        <button type="button" className="btn btn-primary" onClick={()=>photoInput.current?.click()} disabled={busy} data-testid="admin-cs-photo-upload">⬆ Upload photos (JPG, PNG, WEBP, HEIC — up to 20 MB each)</button>
        {cs.photos && cs.photos.length > 0 && (
          <div style={{marginTop:"1rem",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(10rem,1fr))",gap:"0.6rem"}}>
            {cs.photos.map(p => (
              <div key={p.id} style={{position:"relative",border: p.id === cs.hero_photo_id ? "3px solid #FDB813" : "1px solid rgba(15,42,91,0.15)",borderRadius:8,overflow:"hidden"}}>
                <img src={abs(p.url)} alt="" style={{width:"100%",aspectRatio:"4/3",objectFit:"cover"}} data-testid={`admin-cs-photo-${p.id}`}/>
                <div style={{position:"absolute",top:4,right:4,display:"flex",gap:"0.25rem"}}>
                  <button type="button" onClick={()=>setHero(p.id)} title="Set as hero" style={{background:"rgba(0,0,0,0.7)",color:"white",border:"none",borderRadius:4,padding:"0.15rem 0.45rem",fontSize:"0.72rem",cursor:"pointer",fontWeight:700}} data-testid={`admin-cs-photo-hero-${p.id}`}>{p.id === cs.hero_photo_id ? "★ Hero" : "☆"}</button>
                  <button type="button" onClick={()=>removePhoto(p)} style={{background:"rgba(220,38,38,0.9)",color:"white",border:"none",borderRadius:4,padding:"0.15rem 0.45rem",fontSize:"0.72rem",cursor:"pointer"}} data-testid={`admin-cs-photo-remove-${p.id}`}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="paper" style={{padding:"1.5rem",marginBottom:"1rem"}}>
        <h3 style={{marginTop:0}}>Video</h3>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"1rem"}}>
          <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" style={{display:"none"}} onChange={e=>{if(e.target.files[0]) uploadVideo(e.target.files[0]); e.target.value="";}} data-testid="admin-cs-video-input"/>
          <button type="button" className="btn btn-primary" onClick={()=>videoInput.current?.click()} disabled={busy} data-testid="admin-cs-video-upload">⬆ Upload video (MP4, WEBM, MOV — up to 500 MB)</button>
        </div>
        <div className="field">
          <label>… or paste a YouTube / Vimeo URL</label>
          <input value={cs.video_url||""} onChange={e=>patch({video_url:e.target.value, video_type: e.target.value.includes("youtu")?"youtube":e.target.value.includes("vimeo")?"vimeo":"file"})} placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..." data-testid="admin-cs-video-url"/>
        </div>
        {cs.video_url && (
          <div style={{marginTop:"1rem",maxWidth:"32rem"}}>
            <div style={{fontSize:"0.85rem",color:"var(--muted)",marginBottom:"0.35rem"}}>Video preview:</div>
            <VideoPlayer url={cs.video_url} controls testid="admin-cs-video-preview"/>
            <button type="button" onClick={removeVideo} className="btn btn-ghost" style={{marginTop:"0.5rem",color:"#DC2626"}} data-testid="admin-cs-video-remove">Remove video</button>
          </div>
        )}
      </div>

      <div style={{padding:"1rem",background:"#FFF8E1",border:"1px solid rgba(253,184,19,0.3)",borderRadius:8,fontSize:"0.85rem",fontFamily:"Inter,sans-serif",lineHeight:1.55,marginBottom:"2rem"}}>
        <strong>Storage note:</strong> Uploaded files are stored on the app's disk. They survive hot reloads but may be wiped on major deploys — if a listing goes fully live, back up your final assets or move them to a proper CDN. For MP4/WEBM up to 500 MB the built-in player handles range requests so playback is fully seamless.
      </div>
    </div>
  );
}
