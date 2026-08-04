/* eslint-disable react/no-unescaped-entities, no-empty */
import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, useParams, useNavigate, useSearchParams, useLocation, Navigate } from "react-router-dom";
import "./App.css";
import { Helmet } from "react-helmet-async";
import axios from "axios";
// SEC-009: send the HttpOnly admin cookie on every same-origin XHR/API call.
// Default is `false` (no cookies on cross-origin) — flipping to `true` is
// safe because our CORS allowlist is explicit (not "*") whenever cookies
// would matter, and browsers refuse to send credentials to `*` origins.
axios.defaults.withCredentials = true;
import DOMPurify from "dompurify";
import { useT, normalizeLang, langQS, isRTL } from "./i18n";
import MyJourney from "./pages/MyJourney";
import AdminComingSoon, { ComingSoonHero } from "./pages/ComingSoon";
import { BuyingGuide, SellingGuide } from "./pages/BuyerSellerGuide";
import YouMayAlsoBeLookingFor from "./components/YouMayAlsoBeLookingFor";
import AdminContentRelations from "./pages/AdminContentRelations";
import SearchPage from "./pages/SearchPage";
import AdminLeadTriage from "./pages/AdminLeadTriage";
import VisualAgentDemo from "./pages/VisualAgentDemo";
import DashboardMockup from "./pages/DashboardMockup";
import DoogieRelatedChips from "./components/DoogieRelatedChips";
import AdminSearchAnalytics from "./pages/AdminSearchAnalytics";
import Sparkline from "./components/Sparkline";
import AdminReelAnalytics from "./pages/AdminReelAnalytics";
import ListingNarration from "./components/ListingNarration";
import TourNarration from "./components/TourNarration";
import { JOURNEY_TEMPLATES, JOURNEY_TEMPLATES_ORDER, resolveStage } from "./journey_templates";

// DOMPurify wrapper for HTML that comes from LLM output (Doogie chat, community
// synopses, campaign drafts, C&D letters). All admin-facing previews and the
// public chat renderer pass through this before hitting dangerouslySetInnerHTML.
// Belt-and-suspenders: the source content is already trusted (LLM behind our
// prompt guardrails + BCFSA-approval-gated for community synopses), but this
// removes any script/onerror/etc. that could sneak through prompt injection.
const safeHtml = (html) => DOMPurify.sanitize(html || "", {
  ALLOWED_TAGS: ["a","p","br","strong","b","em","i","u","ul","ol","li","h1","h2","h3","h4","h5","h6","span","div","img","hr","blockquote","code","pre","table","thead","tbody","tr","th","td","sup","sub"],
  ALLOWED_ATTR: ["href","target","rel","src","alt","style","class","data-testid","aria-hidden","width","height","colspan","rowspan"],
  ALLOW_DATA_ATTR: false,
});

// Hook: read `?lang=` from URL and returns [locale, t(), langLinkSuffix] for
// translated forms/pages. URL is the sole source of truth — visitors who arrive
// via the English homepage CTA get English, regardless of any Doogie chat
// language they may have used earlier. Doogie's chat renderer auto-appends
// ?lang=xx to internal links when it's operating in a non-English language,
// so the multilingual referral flow still works end-to-end.
const useFormLang = () => {
  const [params] = useSearchParams();
  const raw = params.get("lang") || "en";
  const lang = normalizeLang(raw);
  const t = useT(lang);
  return { lang, t, qs: langQS(lang), rtl: isRTL(lang) };
};

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
// Canonical production URL for SEO (JSON-LD, hreflang, sitemap, canonical tags).
// Falls back to production so preview builds still emit the right canonical
// pointers to the live site, but can be overridden via env for staging.
const SITE_URL = process.env.REACT_APP_PUBLIC_URL || "https://eztofind.ca";

// Google Maps iframe embed — no API key required for basic q=... embed.
// Google handles geocoding, so no client-side geocoder or rate limits needed.
// For merged municipalities (Langley = City + Township; North Vancouver = City + District)
// we override the query to target the larger municipality (which physically surrounds
// the smaller one) and drop the zoom so both are visible in the same frame.
const MERGED_MAP_QUERIES = {
  "Langley":         { q: "Township of Langley, BC, Canada",         z: 11 },
  "North Vancouver": { q: "District of North Vancouver, BC, Canada", z: 11 },
};
const CommunityMap = ({ name, region }) => {
  const override = MERGED_MAP_QUERIES[name];
  const rawQuery = override ? override.q : `${name}, BC, Canada`;
  const q = encodeURIComponent(rawQuery);
  const zoomParam = override ? `&z=${override.z}` : "";
  return (
    <div style={{marginTop:"1.25rem",marginBottom:"1.5rem"}} data-testid="community-map-wrap">
      <div style={{height:"340px",width:"100%",borderRadius:12,overflow:"hidden",border:"1px solid rgba(15,42,91,0.15)",background:"#F5F0E1"}}>
        <iframe
          title={`Map of ${name}, BC`}
          data-testid="community-map"
          src={`https://www.google.com/maps?q=${q}${zoomParam}&output=embed`}
          width="100%"
          height="340"
          style={{border:0,display:"block"}}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.78rem",color:"var(--muted)",marginTop:"0.4rem"}}>Map data © Google · <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}} data-testid="community-map-fullscreen-link">Open fullscreen in Google Maps ↗</a></div>
    </div>
  );
};

// Convert Doogie's markdown-ish chat output into safe HTML with clickable
// internal links (/referral-request, /buyer, /seller, /glossary/xxx, etc.),
// external URLs, **bold**, and line breaks.
// When `lang` is non-English, internal lead links preserve the visitor's
// language via ?lang=xx so localized forms are rendered.
const LEAD_PATHS = ["/buyer", "/seller", "/contact", "/referral-request"];
const _appendLangToHref = (raw, lang) => {
  if (!lang || lang === "en") return raw;
  return raw.replace(/href="(\/[^"?#]*)([^"]*)"/g, (m, path, tail) => {
    // Only append to lead conversion routes — not glossary/community pages
    if (!LEAD_PATHS.some(p => path === p || path.startsWith(p + "/"))) return m;
    // Avoid duplicating lang= if already present
    if (/[?&]lang=/.test(tail)) return m;
    const sep = tail.startsWith("?") ? "&" : "?";
    return `href="${path}${tail}${sep}lang=${encodeURIComponent(lang)}"`;
  });
};
const renderChatContent = (raw, lang) => {
  if (!raw) return "";
  // 1. HTML-escape everything first (safety)
  let s = String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  // 2. **bold** and *italic* first (so paths wrapped in ** still get linked below)
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // 3. Full URLs → external link
  s = s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--brand-blue);font-weight:600;text-decoration:underline">$1</a>');
  // 4. Internal paths — /path or /path/subpath — link to same-origin route.
  //    Negative lookbehind excludes: word chars, quotes, slashes, and < (to skip HTML closing tags like </strong>).
  //    We EXCLUDE /referral-request here on purpose — that link is handled by
  //    the phrase rule (4b) below so consumers only see ONE inline hyperlink,
  //    not two stacked pill buttons ("Referral REALTOR® link" AND "/referral-request").
  s = s.replace(/(?<![a-zA-Z0-9="'/<])(\/(?!referral-request(?![a-z0-9\-]))[a-z][a-z0-9\-/]*[a-z0-9])(?![a-zA-Z0-9>])/gi,
    '<a href="$1" style="color:var(--brand-blue);font-weight:600;text-decoration:underline">$1</a>');
  // 4b. Auto-link the phrase "Referral REALTOR® link" (and common variants)
  //     inline to /referral-request. Also strip any bare "/referral-request"
  //     mentions elsewhere in the same message that survived rule 4's negative
  //     lookahead — this prevents the double-CTA the user flagged.
  s = s.replace(/(Referral REALTOR(?:®|&reg;|®|®)?\s+link)/gi,
    '<a href="/referral-request" style="color:var(--brand-blue);font-weight:600;text-decoration:underline">$1</a>');
  s = s.replace(/(?<![>a-zA-Z0-9])\/referral-request(?![a-z0-9\-])/g, "");
  // 4c. If a non-English chat language is active, append ?lang=xx to lead conversion routes.
  s = _appendLangToHref(s, lang);
  // 4d. Referral CTAs render INLINE (underlined hyperlink) rather than as a
  //     large navy pill button, so consumers see one clean link instead of a
  //     stacked pill stack. If ever we want the pill back, restore this block:
  //     s = s.replace(/<a\s+href="(\/referral-request[^"]*)"[^>]*>([^<]+)<\/a>/gi,
  //       '<a href="$1" class="doogie-referral-pill">...</a>');
  // 5. Line breaks
  s = s.replace(/\n/g, "<br/>");
  return s;
};

// Reusable SEO/meta component — injects per-route <title>, meta description,
// canonical, OpenGraph, Twitter Card, hreflang alternates, and optional JSON-LD schema.
const SUPPORTED_LANGS = ["en", "zh-Hant", "zh-Hans", "pa", "fa", "pt-PT"];

const SEO = ({ title, description, path, image, schema }) => {
  const url = `${SITE_URL}${path || ""}`;
  const img = image || `${SITE_URL}/images/og-default.png`;
  // Preserve existing querystring while swapping ?lang= for hreflang alternates.
  const buildLangUrl = (code) => {
    const base = `${SITE_URL}${path || ""}`;
    return code === "en" ? base : `${base}${(path||"").includes("?") ? "&" : "?"}lang=${code}`;
  };
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description}/>
      <link rel="canonical" href={url}/>
      {SUPPORTED_LANGS.map(code => (
        <link key={code} rel="alternate" hrefLang={code} href={buildLangUrl(code)}/>
      ))}
      <link rel="alternate" hrefLang="x-default" href={url}/>
      <meta property="og:type" content="website"/>
      <meta property="og:title" content={title}/>
      <meta property="og:description" content={description}/>
      <meta property="og:url" content={url}/>
      <meta property="og:image" content={img}/>
      <meta property="og:site_name" content="EZtoFind.ca"/>
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="twitter:title" content={title}/>
      <meta name="twitter:description" content={description}/>
      <meta name="twitter:image" content={img}/>
      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
    </Helmet>
  );
};

// --- Doogie Assets ---
// Doogie mascot assets — served locally from /public/images/doogie/ for fast
// mobile delivery and Cloudflare edge caching. Optimized: ~2 MB total (was ~7 MB).
const DOOGIE_LAPTOP = "/images/doogie/laptop.png";
const DOOGIE_POINT_R = "/images/doogie/pointing-right.png";
const DOOGIE_POINT_L = "/images/doogie/pointing-left.jpg";
const DOOGIE_CELEBRATE = "/images/doogie/celebrating.png";
const DOOGIE_THINKING = "/images/doogie/thinking.png";
const DOOGIE_MAGNIFY = "/images/doogie/magnifying.png";
const DOOGIE_POINT_L_T = "/images/doogie/pointing-left-transparent.png";
const DOUG_HEADSHOT = "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg";

// Shared "Authoritative Sources" block — used on glossary + community pages
const SourcesBlock = ({title, intro, sources, testid}) => (
  <div data-testid={testid||"authoritative-sources"} style={{marginTop:"2rem",padding:"1.5rem 1.75rem",background:"#F8FAFC",border:"1px solid rgba(15,42,91,0.12)",borderLeft:"4px solid var(--brand-blue)",borderRadius:12,fontFamily:"Inter,sans-serif"}}>
    <div style={{fontSize:"0.78rem",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,color:"var(--brand-navy)",marginBottom:"0.85rem"}}>{title||"Authoritative Sources"}</div>
    {intro && <p style={{fontSize:"0.88rem",color:"var(--muted)",marginBottom:"1rem",lineHeight:1.6}}>{intro}</p>}
    <ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:"0.75rem"}}>
      {sources.map((s,i)=>(
        <li key={i} style={{fontSize:"0.92rem",lineHeight:1.5}}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)",fontWeight:600,textDecoration:"none"}}>{s.title} ↗</a>
          <div style={{fontSize:"0.8rem",color:"var(--muted)",marginTop:"0.15rem"}}>{s.publisher}</div>
        </li>
      ))}
    </ul>
  </div>
);

// Real ECCC Climate Normals table — replaces AI weather text when live data is available
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtNum = (v, digits=1) => (v===null || v===undefined) ? "—" : Number(v).toFixed(digits);

// WMO weather-code → { emoji, label } — used by <CurrentWeather>
const WMO = (code) => {
  if (code === 0) return { icon:"☀️", label:"Clear sky" };
  if (code === 1) return { icon:"🌤️", label:"Mainly clear" };
  if (code === 2) return { icon:"⛅", label:"Partly cloudy" };
  if (code === 3) return { icon:"☁️", label:"Overcast" };
  if (code === 45 || code === 48) return { icon:"🌫️", label:"Fog" };
  if (code >= 51 && code <= 55) return { icon:"🌦️", label:"Drizzle" };
  if (code === 56 || code === 57) return { icon:"🌧️", label:"Freezing drizzle" };
  if (code >= 61 && code <= 65) return { icon:"🌧️", label:"Rain" };
  if (code === 66 || code === 67) return { icon:"🌨️", label:"Freezing rain" };
  if (code >= 71 && code <= 77) return { icon:"❄️", label:"Snow" };
  if (code >= 80 && code <= 82) return { icon:"🌦️", label:"Rain showers" };
  if (code === 85 || code === 86) return { icon:"🌨️", label:"Snow showers" };
  if (code >= 95) return { icon:"⛈️", label:"Thunderstorm" };
  return { icon:"🌡️", label:"—" };
};


// Neighbourhood Vibe Score™ — 6-factor community livability index.
const NeighbourhoodDirectory = ({ slug, community }) => {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    axios.get(`${API}/community/${slug}/neighbourhoods`).then(r => { if (alive) setItems(r.data.neighbourhoods || []); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [slug]);
  if (items === null || items.length === 0) return null;
  const fmt = (n) => n ? `$${(n/1000000 >= 1) ? (n/1000000).toFixed(2) + "M" : Math.round(n/1000) + "K"}` : "—";
  return (
    <div data-testid="community-neighbourhood-directory" style={{marginTop:"2.5rem",fontFamily:"Inter,sans-serif"}}>
      <h2 style={{fontSize:"1.75rem",marginBottom:"0.35rem"}}>🏘️ Neighbourhoods in {community}</h2>
      <p style={{color:"var(--muted)",fontSize:"0.95rem",lineHeight:1.6,marginBottom:"1.25rem"}}>
        {items.length} sub-neighbourhood{items.length===1?"":"s"} with active MLS® inventory. Tap a tile for its character, housing mix, and current listings.
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",gap:"0.8rem"}}>
        {items.map(n => (
          <Link
            key={n.slug}
            to={`/community/${slug}/n/${n.slug}`}
            data-testid={`nhb-tile-${n.slug}`}
            style={{
              display:"block",
              padding:"1rem 1.1rem",
              background:"#FDFCF8",
              border:"1px solid rgba(15,42,91,0.12)",
              borderRadius:12,
              textDecoration:"none",
              color:"var(--ink)",
              transition:"transform 0.15s, box-shadow 0.15s, border-color 0.15s",
              boxShadow:"0 2px 6px rgba(15,42,91,0.05)",
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 18px rgba(15,42,91,0.14)"; e.currentTarget.style.borderColor="rgba(15,42,91,0.28)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 6px rgba(15,42,91,0.05)"; e.currentTarget.style.borderColor="rgba(15,42,91,0.12)";}}
          >
            <div style={{fontFamily:"Sora,sans-serif",fontSize:"1.05rem",fontWeight:700,color:"var(--brand-navy)",lineHeight:1.25}}>{n.name}</div>
            <div style={{fontSize:"0.82rem",color:"var(--muted)",marginTop:"0.35rem"}}>{n.count} active listing{n.count===1?"":"s"}</div>
            <div style={{fontSize:"0.85rem",color:"var(--ink)",marginTop:"0.35rem",fontWeight:500}}>
              {fmt(n.min_price)} – {fmt(n.max_price)}
              {n.median_price && <span style={{color:"var(--muted)",fontWeight:400}}> · med {fmt(n.median_price)}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const NeighbourhoodPage = () => {
  const { slug, nSlug } = useParams();
  const [d, setD] = useState(null);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    setD(null); setNotFound(false);
    axios.get(`${API}/community/${slug}/neighbourhood/${nSlug}`, {timeout: 90000})
      .then(r => setD(r.data))
      .catch(() => setNotFound(true));
  }, [slug, nSlug]);
  if (notFound) return <section className="section"><div className="container-x" style={{maxWidth:"46rem"}}><Link to="/communities" style={{color:"var(--brand-blue)",fontFamily:"Inter,sans-serif"}}>← All communities</Link><h1 className="section-title">Neighbourhood not found</h1><p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)"}}>We couldn't find that micro-neighbourhood. It may not currently have active MLS® listings.</p></div></section>;
  if (!d) return <section className="section"><div className="container-x" style={{maxWidth:"46rem"}}><h1 className="section-title">Loading…</h1></div></section>;
  const fmt = (n) => n ? `$${(n/1000000 >= 1) ? (n/1000000).toFixed(2) + "M" : Math.round(n/1000) + "K"}` : "—";
  const jsonLd = {"@context":"https://schema.org","@type":"Place","name":`${d.neighbourhood}, ${d.community}, BC`,"containedInPlace":{"@type":"Place","name":`${d.community}, British Columbia`},"description":(d.synopsis||"").substring(0,300)};
  return (<section className="section"><div className="container-x" style={{maxWidth:"46rem"}}>
    <SEO
      title={`What is ${d.neighbourhood} like? Sub-Neighbourhood Guide in ${d.community}, BC | EZtoFind.ca`}
      description={d.synopsis ? d.synopsis.substring(0,200) : `Housing character, active MLS® inventory, and everything to know about ${d.neighbourhood} — a sub-neighbourhood of ${d.community}, British Columbia.`}
      path={`/community/${slug}/n/${nSlug}`}
      schema={jsonLd}
    />
    <Helmet><script type="application/ld+json">{JSON.stringify({
      "@context":"https://schema.org","@type":"BreadcrumbList",
      "itemListElement":[
        {"@type":"ListItem","position":1,"name":"Home","item":"https://eztofind.ca/"},
        {"@type":"ListItem","position":2,"name":"Communities","item":"https://eztofind.ca/communities"},
        {"@type":"ListItem","position":3,"name":d.community,"item":`https://eztofind.ca/community/${slug}`},
        {"@type":"ListItem","position":4,"name":d.neighbourhood,"item":`https://eztofind.ca/community/${slug}/n/${nSlug}`},
      ]
    })}</script></Helmet>
    <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.9rem"}}>
      <Link to="/communities" style={{color:"var(--brand-blue)",textDecoration:"none"}}>Communities</Link>
      <span style={{color:"var(--muted)"}}> › </span>
      <Link to={`/community/${slug}`} style={{color:"var(--brand-blue)",textDecoration:"none"}}>{d.community}</Link>
      <span style={{color:"var(--muted)"}}> › {d.neighbourhood}</span>
    </div>
    <div className="eyebrow" style={{marginTop:"1.25rem"}}>{d.community}, {d.region}</div>
    <h1 className="section-title" data-testid="neighbourhood-name">{d.neighbourhood}</h1>
    <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.02rem",lineHeight:1.7}}>
      A micro-neighbourhood within {d.community}. This page focuses on <strong>location and housing character</strong> — for walkability, transit, climate, and safety metrics see the <Link to={`/community/${slug}`} style={{color:"var(--brand-blue)"}}>{d.community} community page</Link>.
    </p>

    {/* Market snapshot bar — deliberately different from Vibe Score */}
    <div data-testid="nhb-market-snapshot" style={{marginTop:"1.5rem",display:"flex",gap:"1rem",flexWrap:"wrap",background:"#FDFCF8",border:"1px solid rgba(15,42,91,0.12)",borderRadius:12,padding:"1rem 1.25rem",fontFamily:"Inter,sans-serif"}}>
      <div style={{flex:"1 1 130px"}}><div style={{fontSize:"0.72rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Active listings</div><div style={{fontFamily:"Sora,sans-serif",fontSize:"1.6rem",fontWeight:700,color:"var(--brand-navy)"}}>{d.listing_count}</div></div>
      <div style={{flex:"1 1 130px"}}><div style={{fontSize:"0.72rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Price range</div><div style={{fontFamily:"Sora,sans-serif",fontSize:"1.15rem",fontWeight:700,color:"var(--brand-navy)"}}>{fmt(d.min_price)} – {fmt(d.max_price)}</div></div>
      {d.median_price && <div style={{flex:"1 1 130px"}}><div style={{fontSize:"0.72rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Median</div><div style={{fontFamily:"Sora,sans-serif",fontSize:"1.6rem",fontWeight:700,color:"var(--brand-navy)"}}>{fmt(d.median_price)}</div></div>}
    </div>

    <div style={{marginTop:"1.5rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
      <Link to={`/listings?city=${encodeURIComponent(d.community)}&region=${encodeURIComponent(d.neighbourhood)}`} className="btn btn-primary" data-testid="nhb-view-listings">🏡 View {d.listing_count} Listing{d.listing_count===1?"":"s"} in {d.neighbourhood}</Link>
      <Link to={`/community/${slug}`} className="btn btn-outline">← Back to {d.community}</Link>
    </div>

    <h2 style={{marginTop:"2.5rem",fontSize:"1.5rem"}}>About {d.neighbourhood}</h2>
    {d.synopsis ? (
      <div data-testid="nhb-synopsis" style={{fontFamily:"Inter,sans-serif",fontSize:"1.02rem",lineHeight:1.75,color:"var(--ink)",whiteSpace:"pre-wrap"}}>{d.synopsis}</div>
    ) : (
      <div className="notice" style={{marginTop:"0.5rem"}}>{d.note || "Synopsis being generated — please refresh in a moment."}</div>
    )}
    {d.synopsis && <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.75rem",color:"var(--muted)",marginTop:"0.5rem",fontStyle:"italic"}}>AI-authored, reviewed by Doug LeMaire, REALTOR®. General information only — not a substitute for professional advice.</div>}
    {/* Consistent BCFSA byline (License #167790 + compliance disclaimer +
        freshness stamp) on every neighbourhood page — matches glossary and
        community pages, strengthens E-E-A-T for 520 micro-nhb URLs. */}
    {d.synopsis && <PublishedByDoug compact lastReviewed={d.synopsis_generated_at || d.updated_at}/>}
  </div></section>);
};

const CommunityZoning = () => {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    setD(null); setNotFound(false);
    axios.get(`${API}/community/${slug}/zoning`).then(r => setD(r.data)).catch(() => setNotFound(true));
  }, [slug]);
  if (notFound) return <section className="section"><div className="container-x" style={{maxWidth:"46rem"}}><Link to="/communities" style={{color:"var(--brand-blue)"}}>← All communities</Link><h1 className="section-title">Community not found</h1></div></section>;
  if (!d) return <section className="section"><div className="container-x" style={{maxWidth:"46rem"}}><h1 className="section-title">Loading…</h1></div></section>;
  const s = d.source;
  return (
    <section className="section" style={{fontFamily:"Inter,sans-serif"}}>
      <div className="container-x" style={{maxWidth:"52rem"}}>
        <SEO
          title={`${d.community} Residential Zoning — Bylaw + Planning Contacts | EZtoFind.ca`}
          description={`Residential zoning bylaw links, planning department contacts, and BC Bill 44 (SSMUH) up-zoning context for ${d.community}, British Columbia. Written by Doug LeMaire, REALTOR®.`}
          path={`/community/${slug}/zoning`}
        />
        <Helmet><script type="application/ld+json">{JSON.stringify({
          "@context":"https://schema.org","@type":"BreadcrumbList",
          "itemListElement":[
            {"@type":"ListItem","position":1,"name":"Home","item":"https://eztofind.ca/"},
            {"@type":"ListItem","position":2,"name":"Communities","item":"https://eztofind.ca/communities"},
            {"@type":"ListItem","position":3,"name":d.community,"item":`https://eztofind.ca/community/${slug}`},
            {"@type":"ListItem","position":4,"name":"Residential Zoning","item":`https://eztofind.ca/community/${slug}/zoning`},
          ]
        })}</script></Helmet>

        <div style={{fontSize:"0.9rem",marginBottom:"1rem"}}>
          <Link to="/communities" style={{color:"var(--brand-blue)",textDecoration:"none"}}>Communities</Link>
          <span style={{color:"var(--muted)"}}> › </span>
          <Link to={`/community/${slug}`} style={{color:"var(--brand-blue)",textDecoration:"none"}}>{d.community}</Link>
          <span style={{color:"var(--muted)"}}> › Residential Zoning</span>
        </div>
        <div className="eyebrow">{d.community}, {d.region}</div>
        <h1 className="section-title" data-testid="zoning-title">Residential Zoning in {d.community}</h1>
        <p style={{color:"var(--muted)",fontSize:"1rem",lineHeight:1.7}}>Last reviewed by Doug LeMaire, REALTOR® on {new Date(d.last_reviewed).toLocaleDateString("en-CA",{year:"numeric",month:"long",day:"numeric"})}. General information only — zoning bylaws change frequently. Always verify current permitted uses with the municipality's planning department before making offers, applying for permits, or building.</p>

        {/* Provincial SSMUH context — the piece almost no competitor site has */}
        <div className="paper" data-testid="zoning-provincial" style={{background:"#EAF3FF",marginTop:"1.5rem"}}>
          <div className="eyebrow">Province-wide overlay (applies to {d.community})</div>
          <h2 style={{fontSize:"1.35rem",marginTop:"0.4rem"}}>🏛️ BC Bill 44 — Small-Scale Multi-Unit Housing (SSMUH)</h2>
          <p style={{fontSize:"0.95rem",lineHeight:1.75,margin:"0.5rem 0"}}>{d.provincial_context.summary}</p>
          <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.5rem 0"}}>
            <strong>Act:</strong> {d.provincial_context.act}<br/>
            <strong>Effective:</strong> {d.provincial_context.effective}
          </p>
          <a href={d.provincial_context.authority_url} target="_blank" rel="noopener noreferrer" data-testid="zoning-ssmuh-link" style={{color:"var(--brand-blue)",fontSize:"0.9rem",textDecoration:"none",fontWeight:600}}>Read the Province of BC's SSMUH overview →</a>
        </div>

        {/* Zone code table — the actual content the user asked for */}
        <h2 style={{marginTop:"2rem",fontSize:"1.5rem"}}>📋 Common residential zone codes in {d.community}</h2>
        {d.zones && d.zones.length > 0 ? (
          <>
            <p style={{fontSize:"0.9rem",color:"var(--muted)",marginBottom:"1rem"}}>Below are the residential zone codes most commonly used in {d.community}'s bylaw, with a plain-English summary of what each typically permits. Under BC Bill 44 (SSMUH, above), most historically single-family zones now permit 3–4 units.</p>
            <div data-testid="zoning-code-table" style={{display:"grid",gap:"0.85rem"}}>
              {d.zones.map((z, i) => (
                <div key={i} className="paper" style={{padding:"1.1rem 1.25rem"}}>
                  <div style={{display:"flex",gap:"0.75rem",alignItems:"baseline",flexWrap:"wrap"}}>
                    <span style={{fontFamily:"Sora,sans-serif",fontWeight:800,color:"var(--brand-navy)",fontSize:"1.15rem",background:"#EAF3FF",padding:"0.15rem 0.6rem",borderRadius:6,letterSpacing:"0.02em"}}>{z.code}</span>
                    <strong style={{fontSize:"1rem",color:"var(--ink)"}}>{z.name}</strong>
                  </div>
                  <p style={{margin:"0.6rem 0 0",fontSize:"0.94rem",lineHeight:1.65}}>{z.summary}</p>
                  {z.note && <p style={{margin:"0.5rem 0 0",fontSize:"0.82rem",color:"var(--muted)",fontStyle:"italic"}}>{z.note}</p>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="notice" style={{marginTop:"0.5rem"}}>{d.note || "Zone list is being drafted and will appear here once reviewed by Doug LeMaire, REALTOR®."}</div>
        )}

        {/* Small "official source" link at the bottom */}
        {d.source && d.source.bylaw_url && (
          <p style={{marginTop:"1.5rem",fontSize:"0.9rem"}}>
            <strong>Official source:</strong> <a href={d.source.bylaw_url} target="_blank" rel="noopener noreferrer" data-testid="zoning-bylaw-link" style={{color:"var(--brand-blue)"}}>{d.source.is_fallback ? `Find ${d.community}'s current zoning bylaw →` : `${d.community}'s residential zoning bylaw →`}</a>
            {d.source.planning_phone && <span style={{marginLeft:"1rem",color:"var(--muted)"}}>Planning dept: <a href={`tel:${d.source.planning_phone.replace(/[^0-9+]/g,"")}`} style={{color:"var(--brand-blue)"}}>{d.source.planning_phone}</a></span>}
          </p>
        )}

        {/* Ask Doogie for zone-specific follow-ups */}
        <div className="paper" style={{marginTop:"2rem",background:"var(--brand-navy)",color:"#fff"}}>
          <h2 style={{color:"#fff",fontSize:"1.3rem",marginTop:0}}>💬 Have a zoning question about a specific property?</h2>
          <p style={{fontSize:"0.95rem",lineHeight:1.7,opacity:0.9}}>Doogie can walk you through these zone codes, the SSMUH transition, secondary-suite allowances, and how to read a zoning bylaw — in English, Portuguese, 中文, ਪੰਜਾਬੀ, or فارسی.</p>
          <div style={{display:"flex",gap:"0.8rem",flexWrap:"wrap",marginTop:"0.5rem"}}>
            <Link to={`/community/${slug}`} className="btn btn-outline" style={{color:"#fff",borderColor:"#fff"}}>← Back to {d.community}</Link>
            <Link to="/listings" className="btn btn-primary" style={{background:"var(--brand-gold)",color:"var(--brand-navy)",border:"none"}}>View {d.community} Listings</Link>
          </div>
        </div>

        <p style={{marginTop:"2rem",fontSize:"0.78rem",color:"var(--muted)",fontStyle:"italic"}}>
          Zoning designations, permitted uses, and density allowances are set by municipal bylaws which are amended frequently. The zone code summaries above are AI-authored, reviewed by Doug LeMaire, REALTOR® — but municipal bylaws take precedence. Always verify against the actual bylaw and confirm with the municipality's planning department before you make a real estate, construction, or renovation decision. Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd. — 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5 — (604) 466-7021.
        </p>
      </div>
    </section>
  );
};

const VibeScore = ({ slug, community }) => {
  const [vs, setVs] = useState(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    axios.get(`${API}/community/${slug}/vibe`).then(r => { if (alive) setVs(r.data); }).catch(() => {});
    return () => { alive = false; };
  }, [slug]);
  if (!vs) return null;
  const gradeColor = vs.score >= 80 ? "#10B981" : vs.score >= 65 ? "#3B82F6" : vs.score >= 50 ? "#F59E0B" : "#EF4444";
  const subs = vs.sub_scores || {};
  return (
    <div data-testid="community-vibe-score" style={{marginTop:"1.5rem",marginBottom:"1.5rem",fontFamily:"Inter,sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",gap:"1.25rem",flexWrap:"wrap",background:"#FDFCF8",border:"2px solid rgba(15,42,91,0.12)",borderRadius:14,padding:"1.25rem 1.5rem",boxShadow:"0 6px 18px rgba(15,42,91,0.08)"}}>
        <div style={{background:gradeColor,color:"#fff",width:110,height:110,borderRadius:"50%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 6px 18px ${gradeColor}55`}}>
          <div style={{fontFamily:"Sora,sans-serif",fontSize:"2.4rem",fontWeight:700,lineHeight:1}} data-testid="vibe-score-value">{vs.score}</div>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.1em",fontWeight:600,marginTop:"0.15rem"}}>VIBE {vs.grade}</div>
        </div>
        <div style={{flex:1,minWidth:220}}>
          <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--muted)",fontWeight:600}}>Neighbourhood Vibe Score™</div>
          <div style={{fontFamily:"Sora,sans-serif",fontSize:"1.35rem",fontWeight:700,color:"var(--brand-navy)",marginTop:"0.2rem"}}>What's it like to live in {community}?</div>
          <div style={{fontSize:"0.88rem",color:"var(--ink)",marginTop:"0.35rem",lineHeight:1.5}}>A composite of walkability, transit, air quality, wildfire &amp; flood safety, and climate comfort — built on BC-specific data.</div>
          <button onClick={()=>setExpanded(e=>!e)} data-testid="vibe-toggle" style={{marginTop:"0.6rem",background:"transparent",border:"none",color:"var(--brand-blue)",cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:"0.85rem",fontWeight:600,padding:0}}>
            {expanded ? "Hide breakdown ▲" : "See the breakdown ▼"}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{marginTop:"0.75rem",background:"#F5F0E1",borderRadius:12,padding:"1rem",border:"1px solid rgba(15,42,91,0.08)"}} data-testid="vibe-breakdown">
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"0.6rem"}}>
            {Object.entries(subs).map(([k, s]) => (
              <div key={k} style={{background:"#fff",borderRadius:10,padding:"0.75rem",border:"1px solid rgba(15,42,91,0.08)"}} data-testid={`vibe-sub-${k}`}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontSize:"0.82rem",fontWeight:600,color:"var(--ink)"}}>{s.icon} {s.label}</div>
                  <div style={{fontFamily:"Sora,sans-serif",fontSize:"1.15rem",fontWeight:700,color: s.score>=80?"#10B981":s.score>=65?"#3B82F6":s.score>=50?"#F59E0B":"#EF4444"}}>{s.score}</div>
                </div>
                <div style={{height:6,background:"#F5F0E1",borderRadius:3,marginTop:"0.4rem",overflow:"hidden"}}>
                  <div style={{width:`${s.score}%`,height:"100%",background: s.score>=80?"#10B981":s.score>=65?"#3B82F6":s.score>=50?"#F59E0B":"#EF4444"}}></div>
                </div>
                <div style={{fontSize:"0.68rem",color:"var(--muted)",marginTop:"0.35rem",lineHeight:1.4}}>{s.note}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:"0.7rem",color:"var(--muted)",marginTop:"0.75rem",lineHeight:1.5}}>
            {vs.methodology} · Sources:{" "}
            {(vs.sources||[]).map((src,i) => (
              <span key={src.url}>{i>0 && " · "}<a href={src.url} target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>{src.label} ↗</a></span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CurrentWeather = ({ slug, community }) => {
  const [fx, setFx] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    setFx(null); setErr(false);
    axios.get(`${API}/community/${slug}/forecast`)
      .then(r => { if (alive) setFx(r.data); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, [slug]);
  if (err) return null;
  if (!fx) return <div data-testid="community-forecast-loading" style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",padding:"1rem",background:"#F8F6EF",borderRadius:10,marginTop:"0.75rem"}}>🐾 Doogie is fetching the current forecast for {community}…</div>;
  const cur = fx.current || {};
  const w = WMO(cur.code);
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div data-testid="community-current-weather" style={{marginTop:"1rem",marginBottom:"1.5rem",fontFamily:"Inter,sans-serif"}}>
      {/* Current conditions banner */}
      <div style={{display:"flex",alignItems:"center",gap:"1.25rem",flexWrap:"wrap",background:"linear-gradient(135deg,#0F2A5B 0%,#1E4180 100%)",color:"#fff",padding:"1.25rem 1.5rem",borderRadius:14,boxShadow:"0 8px 24px rgba(15,42,91,0.18)"}}>
        <div style={{fontSize:"3.5rem",lineHeight:1}}>{w.icon}</div>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:"0.78rem",textTransform:"uppercase",letterSpacing:"0.08em",opacity:0.75,fontWeight:600}}>Right now in {community}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:"0.6rem",marginTop:"0.15rem"}}>
            <span data-testid="cw-temp" style={{fontSize:"2.6rem",fontWeight:700,fontFamily:"'Sora',sans-serif"}}>{Math.round(cur.temp_c)}°C</span>
            <span style={{fontSize:"1rem",opacity:0.85}}>{w.label}</span>
          </div>
          <div style={{fontSize:"0.85rem",opacity:0.85,marginTop:"0.35rem",display:"flex",gap:"1.25rem",flexWrap:"wrap"}}>
            <span>Feels like {Math.round(cur.feels_like_c)}°C</span>
            <span>Wind {Math.round(cur.wind_kmh)} km/h</span>
            <span>Humidity {Math.round(cur.humidity_pct)}%</span>
          </div>
        </div>
      </div>
      {/* 7-day strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7, minmax(0, 1fr))",gap:"0.5rem",marginTop:"0.75rem"}} data-testid="cw-7day">
        {(fx.daily || []).map((d,i) => {
          const dt = new Date(d.date + "T12:00:00");
          const dw = WMO(d.code);
          const isToday = i === 0;
          return (
            <div key={d.date} style={{background:isToday?"#F5F0E1":"#FFFFFF",border:"1px solid rgba(15,42,91,0.12)",borderRadius:10,padding:"0.65rem 0.4rem",textAlign:"center"}}>
              <div style={{fontSize:"0.72rem",fontWeight:700,color:"var(--brand-navy)",textTransform:"uppercase",letterSpacing:"0.05em"}}>{isToday ? "Today" : dayNames[dt.getDay()]}</div>
              <div style={{fontSize:"1.6rem",lineHeight:1.1,marginTop:"0.2rem"}}>{dw.icon}</div>
              <div style={{fontSize:"0.82rem",marginTop:"0.15rem",color:"var(--ink)"}}><strong>{Math.round(d.max_c)}°</strong> <span style={{color:"var(--muted)"}}>{Math.round(d.min_c)}°</span></div>
              {d.precip_prob_pct !== null && d.precip_prob_pct !== undefined && d.precip_prob_pct > 10 && (
                <div style={{fontSize:"0.68rem",color:"#2563EB",marginTop:"0.1rem"}}>💧 {d.precip_prob_pct}%</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:"0.5rem",lineHeight:1.5}}>
        Forecast updated hourly. Data © Open-Meteo (free & open-source). For authoritative forecasts and severe-weather alerts, visit <a href={`https://weather.gc.ca/mainmenu/weather_menu_e.html`} target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)",fontWeight:600}}>Environment Canada ↗</a>.
      </div>
    </div>
  );
};
const ClimateNormalsTable = ({data, community}) => {
  const m = data.monthly || {};
  const st = data.station || {};
  const period = data.period || {};
  const rows = [
    {label: "Mean daily temp (°C)",   values: m.mean_temp_c,     digits: 1},
    {label: "Mean daily max (°C)",    values: m.max_temp_c,      digits: 1},
    {label: "Mean daily min (°C)",    values: m.min_temp_c,      digits: 1},
    {label: "Total precipitation (mm)", values: m.total_precip_mm, digits: 0},
    {label: "Total rainfall (mm)",    values: m.rainfall_mm,     digits: 0},
    {label: "Total snowfall (cm)",    values: m.snowfall_cm,     digits: 1},
  ];
  return (
    <div data-testid="climate-normals-table" style={{fontFamily:"Inter,sans-serif",marginTop:"0.5rem"}}>
      <div style={{background:"#F0F7FF",border:"1px solid rgba(15,42,91,0.15)",borderLeft:"4px solid var(--brand-green-dark)",padding:"1rem 1.25rem",borderRadius:10,marginBottom:"1rem"}}>
        <div style={{fontSize:"0.78rem",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,color:"var(--brand-navy)"}}>Environment Canada Climate Normals · {period.begin}–{period.end}</div>
        <div style={{fontSize:"0.95rem",color:"var(--ink)",marginTop:"0.35rem"}}>
          Nearest official weather station to <strong>{community}</strong>: <strong>{st.name}</strong>{st.region_label ? <span style={{color:"var(--muted)"}}> · {st.region_label}</span> : null}
        </div>
        <div style={{fontSize:"0.82rem",color:"var(--muted)",marginTop:"0.35rem"}}>
          Source: <a href={st.eccc_url} target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)",fontWeight:600}}>Environment and Climate Change Canada — Canadian Climate Normals ↗</a>
        </div>
      </div>
      <div style={{overflowX:"auto",border:"1px solid rgba(15,42,91,0.1)",borderRadius:10}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.85rem",background:"white"}}>
          <thead>
            <tr style={{background:"#F5F0E1"}}>
              <th style={{textAlign:"left",padding:"0.6rem 0.75rem",borderBottom:"1px solid rgba(15,42,91,0.15)",fontWeight:700,color:"var(--brand-navy)"}}>Metric</th>
              {MONTH_ABBR.map(mo => <th key={mo} style={{padding:"0.6rem 0.4rem",borderBottom:"1px solid rgba(15,42,91,0.15)",fontWeight:700,color:"var(--brand-navy)",textAlign:"center"}}>{mo}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row,ri) => (
              <tr key={ri} style={{borderBottom:"1px solid rgba(15,42,91,0.06)"}}>
                <td style={{padding:"0.5rem 0.75rem",fontWeight:600,color:"var(--ink)"}}>{row.label}</td>
                {(row.values||Array(12).fill(null)).map((v,mi)=>(
                  <td key={mi} style={{padding:"0.5rem 0.4rem",textAlign:"center",color:"var(--ink)",fontVariantNumeric:"tabular-nums"}}>{fmtNum(v,row.digits)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:"0.75rem",color:"var(--muted)",marginTop:"0.6rem",lineHeight:1.5}}>
        Values are 30-year averages calculated by Environment and Climate Change Canada from observations at station <strong>{st.name}</strong> (Climate ID {st.climate_id}) for the period {period.begin}–{period.end}. These are historical climate normals — not a current-day forecast.
      </div>
    </div>
  );
};

// Shared "Published by Doug LeMaire, REALTOR®" attribution block
// Renders at the bottom of glossary term pages, community pages, and weather sections
const PublishedByDoug = ({compact=false, lastReviewed=null}) => {
  const fmt = (iso) => {
    if (!iso) return null;
    try { const d = new Date(iso); if (isNaN(d)) return null;
      return d.toLocaleDateString("en-CA", { year:"numeric", month:"long", day:"numeric" });
    } catch { return null; }
  };
  const reviewedTxt = fmt(lastReviewed);
  // Canary string — unique invented phrase we embed on every editorial page.
  // If this exact string ever appears verbatim on a competitor site or in an
  // AI training dataset caught in the wild, it's tortiously provable evidence
  // of copying from eztofind.ca (CIPO Reg. 1247822). Rotate the token
  // (EZTF-{year}-{code}) yearly so we can also date-tie infringements.
  const CANARY = "EZTF-2026-EDU-XG8F-canary-verify-at-eztofind.ca-copyright";
  return (
  <div itemScope itemType="https://schema.org/Person" style={{background:"#F5F0E1",border:"1px solid rgba(15,42,91,0.1)",borderRadius:12,padding:compact?"0.85rem 1rem":"1rem 1.25rem",fontFamily:"Inter,sans-serif",display:"flex",gap:"0.85rem",alignItems:"center",margin: compact ? "1rem 0" : "1.5rem 0",position:"relative"}} data-testid="published-by-doug">
    <img src={DOUG_HEADSHOT} alt="Doug LeMaire, REALTOR®" style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--brand-gold)",flexShrink:0}}/>
    <div style={{lineHeight:1.5,minWidth:0}}>
      <div style={{fontSize:"0.78rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Published by</div>
      <div style={{fontWeight:700,color:"var(--ink)"}} itemProp="name">Doug LeMaire, REALTOR®</div>
      <div style={{fontSize:"0.88rem",color:"var(--brand-blue)"}}>
        {/* BCFSA license number surfaced on every content page — required
            for E-E-A-T (regulator-verifiable authority) and BCFSA rule that
            REALTORS® must be transparently identifiable when representing
            themselves in public communications. */}
        <span style={{color:"var(--muted)",fontFamily:"'Inter',sans-serif"}} itemProp="identifier">BCFSA #167790</span>
        <span style={{color:"var(--muted)"}}> · </span>
        <a href="https://eztofind.ca" itemProp="url" onClick={(e)=>{ if(window.location.hostname !== "eztofind.ca"){ e.preventDefault(); window.location.href = "/"; }}} style={{color:"inherit",textDecoration:"none",fontWeight:600}}>EZtoFind.ca</a>
        <span style={{color:"var(--muted)"}} itemProp="affiliation"> · Fraser Property Management Realty Services Ltd.</span>
      </div>
      {reviewedTxt && <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:"0.15rem",fontStyle:"italic"}} data-testid="last-reviewed">🤖 AI-assisted content · Last reviewed by Doug LeMaire, REALTOR® on {reviewedTxt}</div>}
      {/* Compliance-safe disclaimer — required so the elevated byline is not
          read by search engines/LLMs as "Doug personally advised on this
          specific matter". BCFSA Rule 5-4-1 (general information vs advice)
          + PIPA transparency principle. Keep short so it doesn't compete
          with the answer content that follows. */}
      <div style={{fontSize:"0.7rem",color:"var(--muted)",marginTop:"0.2rem",lineHeight:1.4}} data-testid="content-disclaimer">
        General information only — not real estate, legal, tax, or financial advice. Verify with a licensed BC professional before acting. <Link to="/privacy" style={{color:"var(--brand-blue)",textDecoration:"none"}}>Privacy (PIPA)</Link>
      </div>
      {/* Per-page copyright notice — pairs with CIPO Reg. 1247822 for
          per-page enforcement. Making the reg number visible on every
          editorial page strengthens takedown / cease-and-desist claims. */}
      <div style={{fontSize:"0.65rem",color:"var(--muted)",marginTop:"0.3rem",lineHeight:1.4}} data-testid="page-copyright-notice">
        © 2026 Doug LeMaire. Content protected under CIPO Copyright Registration No. <a href="/copyright" style={{color:"var(--brand-blue)",textDecoration:"none"}}>1247822</a>. Reproduction or AI-training use requires written permission.
      </div>
    </div>
    {/* Canary string — screen-reader-hidden but present in DOM/scrape.
        aria-hidden keeps it invisible to assistive tech; visually clipped
        so sighted users don't see it either. If this exact CANARY token
        appears on a competitor site or in a leaked training corpus, we
        have provable date-tied evidence of copying. */}
    <span aria-hidden="true" style={{position:"absolute",left:-9999,width:1,height:1,overflow:"hidden",clip:"rect(0 0 0 0)",whiteSpace:"nowrap"}} data-testid="canary">{CANARY}</span>
  </div>);
};

// Real BC imagery (Unsplash, free-to-use)
export const IMG = {
  vancouver: "https://images.unsplash.com/photo-1559511260-66a654ae982a?w=1200&q=80",
  fraserValley: "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/gs9v7w9f_EZ%20Fraser%20Valley.webp",
  seaToSky: "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/kdomoatd_EZ%20Sea%20to%20Sky.webp",
  detached: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80",
  luxury: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
  equestrian: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800&q=80",
  estate: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80",
  condo: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
  townhomes: "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/u5cfho66_townhouse.webp",
  bcHero: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1600&q=80",
  vancouverIsland: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80"
};

// =============================================================
// FEATURED LISTING — Doug's currently-showcased home on the homepage.
// To swap in a new listing, edit the fields below and drop in real photos.
// To HIDE the featured section entirely, set enabled: false.
// =============================================================
const FEATURED_LISTING = {
  enabled: false,
  status: "NEW LISTING",             // e.g. "NEW LISTING", "JUST SOLD", "OPEN HOUSE SAT"
  address: "1234 Sample Crescent",
  city: "West Vancouver",
  neighbourhood: "Ambleside",
  province: "BC",
  postal: "V7T 1A0",
  price: 3495000,
  beds: 5,
  baths: 4,
  half_baths: 1,
  sqft: 4280,
  lot_sqft: 8712,
  property_type: "Detached Home",
  year_built: 2019,
  mls: "R2851234",
  headline: "Ocean-view family home on a private cul-de-sac",
  description: "A rare Ambleside offering — 4,280 sq ft of thoughtful design, five bedrooms up, chef's kitchen with premium appliances, main-floor office, radiant floors, and a level backyard perfect for entertaining. Steps to the seawall, Ambleside Village, and top-rated schools.",
  photos: [
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1400&q=85",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
  ],
  open_house: "Saturday 2 – 4 PM & Sunday 1 – 3 PM",
  detail_url: null,                  // e.g. "/listings/1234-sample-crescent" once wired to a detail page
};

const formatPrice = n => (n>=1000000)
  ? `$${(n/1000000).toFixed(n%1000000===0?0:2).replace(/\.?0+$/,"")}M`
  : `$${n.toLocaleString("en-CA")}`;

const FeaturedListing = () => {
  const [active, setActive] = useState(0);
  const L = FEATURED_LISTING;
  if(!L.enabled) return null;
  const hero = L.photos[active] || L.photos[0];
  return (
    <section className="section" style={{background:"linear-gradient(180deg,#F5F0E1 0%,#FFFFFF 100%)",paddingTop:"3rem",paddingBottom:"4rem"}} data-testid="featured-listing-section">
      <div className="container-x">
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <div className="eyebrow">Featured Listing</div>
          <h2 className="section-title" style={{fontSize:"2.2rem"}}>Currently featured by Doug LeMaire, REALTOR®</h2>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1.15fr 1fr",gap:"2rem",background:"white",borderRadius:20,overflow:"hidden",boxShadow:"0 24px 60px rgba(15,42,91,0.14)",border:"1px solid rgba(15,42,91,0.08)"}} className="featured-grid">
          {/* IMAGE COLUMN */}
          <div style={{position:"relative",background:"#0F2A5B",minHeight:"420px"}}>
            <img src={hero} alt={`${L.address}, ${L.city}`} style={{width:"100%",height:"100%",minHeight:"420px",objectFit:"cover",display:"block"}} data-testid="featured-hero-photo"/>
            {/* Status badge */}
            <div style={{position:"absolute",top:"1.25rem",left:"1.25rem",background:"var(--brand-gold)",color:"var(--brand-navy)",padding:"0.5rem 1rem",borderRadius:"999px",fontFamily:"Inter,sans-serif",fontWeight:800,letterSpacing:"0.08em",fontSize:"0.75rem",textTransform:"uppercase",boxShadow:"0 6px 16px rgba(0,0,0,0.2)"}} data-testid="featured-status-badge">{L.status}</div>
            {/* Price overlay */}
            <div style={{position:"absolute",bottom:"1.25rem",left:"1.25rem",right:"1.25rem",display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:"0.75rem"}}>
              <div>
                <div style={{fontFamily:"Montserrat,sans-serif",fontWeight:800,fontSize:"2.4rem",color:"white",lineHeight:1,textShadow:"0 2px 8px rgba(0,0,0,0.5)"}} data-testid="featured-price">{formatPrice(L.price)}</div>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.85rem",color:"rgba(255,255,255,0.92)",marginTop:"0.35rem",textShadow:"0 1px 4px rgba(0,0,0,0.6)"}}>MLS® {L.mls}</div>
              </div>
              {L.open_house && (
                <div style={{background:"rgba(15,42,91,0.85)",color:"white",padding:"0.55rem 0.85rem",borderRadius:10,fontFamily:"Inter,sans-serif",fontSize:"0.78rem",fontWeight:600,backdropFilter:"blur(6px)"}}>
                  <span style={{display:"block",fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.08em",opacity:0.8}}>Open House</span>
                  {L.open_house}
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {L.photos.length > 1 && (
              <div style={{position:"absolute",top:"1.25rem",right:"1.25rem",display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                {L.photos.map((p,i)=>(
                  <button key={i} onClick={()=>setActive(i)} data-testid={`featured-thumb-${i}`} style={{width:64,height:48,padding:0,border:i===active?"3px solid var(--brand-gold)":"2px solid rgba(255,255,255,0.6)",borderRadius:6,overflow:"hidden",cursor:"pointer",background:"none"}}>
                    <img src={p} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETAILS COLUMN */}
          <div style={{padding:"2rem 2.25rem",fontFamily:"Inter,sans-serif",display:"flex",flexDirection:"column"}}>
            <div style={{fontSize:"0.75rem",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,color:"var(--brand-blue)"}}>{L.neighbourhood} · {L.city}, {L.province}</div>
            <h3 style={{fontFamily:"Playfair Display,serif",fontSize:"1.9rem",color:"var(--brand-navy)",margin:"0.35rem 0 0.4rem",lineHeight:1.15}} data-testid="featured-address">{L.address}</h3>
            <p style={{color:"var(--muted)",fontSize:"1rem",lineHeight:1.5,margin:"0 0 1.25rem"}}>{L.headline}</p>

            {/* Quick stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.65rem",marginBottom:"1.5rem"}} data-testid="featured-stats">
              {[
                {v:L.beds,     l:"Beds"},
                {v:`${L.baths}${L.half_baths?"+"+L.half_baths:""}`, l:L.half_baths?"Full+Half":"Baths"},
                {v:L.sqft.toLocaleString("en-CA"), l:"Sq Ft"},
                {v:L.year_built, l:"Built"},
              ].map((s,i)=>(
                <div key={i} style={{background:"#F5F0E1",borderRadius:10,padding:"0.75rem 0.5rem",textAlign:"center"}}>
                  <div style={{fontFamily:"Montserrat,sans-serif",fontWeight:700,fontSize:"1.15rem",color:"var(--brand-navy)"}}>{s.v}</div>
                  <div style={{fontSize:"0.7rem",textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--muted)",marginTop:"0.2rem"}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Property meta */}
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem 1.25rem",fontSize:"0.85rem",color:"var(--ink)",marginBottom:"1.25rem",paddingBottom:"1.25rem",borderBottom:"1px solid rgba(15,42,91,0.08)"}}>
              <div><span style={{color:"var(--muted)"}}>Type:</span> <strong>{L.property_type}</strong></div>
              {L.lot_sqft && <div><span style={{color:"var(--muted)"}}>Lot:</span> <strong>{L.lot_sqft.toLocaleString("en-CA")} sq ft</strong></div>}
              <div><span style={{color:"var(--muted)"}}>MLS®:</span> <strong>{L.mls}</strong></div>
            </div>

            <p style={{fontSize:"0.92rem",lineHeight:1.65,color:"var(--ink)",marginBottom:"1.5rem"}} data-testid="featured-description">{L.description}</p>

            <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap",marginTop:"auto"}}>
              {L.detail_url
                ? <Link to={L.detail_url} className="btn btn-primary" data-testid="featured-view-details">View Full Listing</Link>
                : <Link to="/buyer" className="btn btn-primary" data-testid="featured-view-details">Request Details</Link>}
              <Link to="/buyer" className="btn btn-green" data-testid="featured-book-showing">Book a Showing</Link>
            </div>

            <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:"1.25rem",lineHeight:1.5,fontStyle:"italic"}}>
              Listed by <strong style={{color:"var(--brand-navy)",fontStyle:"normal"}}>Doug LeMaire, REALTOR®</strong> · Fraser Property Management Realty Services Ltd. Not intended to solicit buyers currently under contract with another REALTOR®.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Nav / Footer ---
const Nav = () => {
  const [open, setOpen] = useState(false);
  const [favCount, setFavCount] = useState(() => _readFavs().length);
  useEffect(() => {
    const h = (e) => setFavCount((e.detail || _readFavs()).length);
    window.addEventListener("ez-favorites-changed", h);
    // Also refresh on nav mount in case another tab changed it
    setFavCount(_readFavs().length);
    return () => window.removeEventListener("ez-favorites-changed", h);
  }, []);
  const close = () => setOpen(false);
  return (
    <nav className="nav"><div className="container-x nav-inner">
      <Link to="/" onClick={close} style={{display:"flex",alignItems:"center",gap:"0.75rem",textDecoration:"none"}}>
        <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire, REALTOR®" style={{width:52,height:52,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--brand-gold)"}}/>
        <div><div className="font-display" style={{fontSize:"1.4rem",lineHeight:1,color:"var(--brand-navy)",display:"flex",alignItems:"center",gap:"0.5rem"}}><span>EZtoFind<span style={{color:"#FDB813"}}>.ca</span></span>
        </div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.72rem",color:"var(--muted)",letterSpacing:"0.08em"}}>DOUG LEMAIRE, REALTOR®</div></div>
      </Link>
      <button className="nav-hamburger" aria-label={open?"Close menu":"Open menu"} aria-expanded={open} onClick={()=>setOpen(o=>!o)} data-testid="nav-hamburger">
        <span/><span/><span/>
      </button>
      <div className={`nav-links${open?" open":""}`}>
        <NavLink to="/listings" onClick={close} data-testid="nav-listings">Property Search</NavLink>
        <NavLink to="/specialties/luxury" onClick={close} data-testid="nav-luxury">Luxury Listings</NavLink>
        <NavLink to="/specialties/equestrian" onClick={close} data-testid="nav-equestrian">Equestrian Listings</NavLink>
        <NavLink to="/communities" onClick={close} data-testid="nav-communities">Communities</NavLink>
        <NavLink to="/glossary" onClick={close} data-testid="nav-glossary">Glossary</NavLink>
        <NavLink to="/about" onClick={close} data-testid="nav-about">About</NavLink>
        <NavLink to="/valuation" onClick={close} data-testid="nav-valuation">Market Estimate</NavLink>
        <NavLink to="/relocating" onClick={close} data-testid="nav-relocating">Relocating</NavLink>
        <NavLink to="/favorites" onClick={close} data-testid="nav-favorites" style={{display:"inline-flex",alignItems:"center",gap:"0.35rem"}}>
          ❤️ Favorites
          {favCount > 0 && <span data-testid="nav-favorites-badge" style={{background:"#DC2626",color:"#fff",fontSize:"0.68rem",fontWeight:700,padding:"0.1rem 0.45rem",borderRadius:999,minWidth:"1.1rem",textAlign:"center"}}>{favCount}</span>}
        </NavLink>
        <span className="nav-divider" aria-hidden="true"/>
        <NavLink to="/realtor-network" onClick={close} data-testid="nav-realtor-network">REALTOR® Network</NavLink>
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
        <p style={{fontSize:"0.88rem",lineHeight:1.6,opacity:0.85}}>EZtoFind.ca is a free real estate information platform for anyone considering buying or selling residential real estate in British Columbia now or in the future.</p>
        <p style={{fontSize:"0.88rem",lineHeight:1.6,opacity:0.85,marginTop:"0.75rem"}}>Doogie is an AI-assisted helper that shares general educational information about BC real estate, explains terminology, and helps visitors navigate the EZtoFind.ca platform. Doogie provides general information only — it is not legal, tax, financial, or property-specific advice, and it is not a substitute for a licensed professional. Interacting with Doogie does not create a REALTOR®–client relationship.</p>
        <p style={{fontSize:"0.78rem",opacity:0.85,marginTop:"1rem",lineHeight:1.5}}><strong style={{color:"var(--brand-gold)"}}>Doug LeMaire, REALTOR®</strong> · BCFSA License #167790<br/><strong>Fraser Property Management Realty Services Ltd.</strong><br/>1 – 22374 Lougheed Hwy<br/>Maple Ridge, BC V2X 2T5<br/><a href="tel:+16044667021" style={{color:"var(--brand-gold)",textDecoration:"none"}}>(604) 466-7021</a></p>
      </div>
      <div><h4>Explore</h4><ul>
        <li><Link to="/listings">Property Search</Link></li>
        <li><Link to="/specialties/luxury">Luxury Listings</Link></li>
        <li><Link to="/specialties/equestrian">Equestrian Listings</Link></li>
        <li><Link to="/communities">Communities</Link></li>
        <li><Link to="/glossary">Glossary</Link></li>
        <li><Link to="/valuation">Market Estimate</Link></li>
      </ul></div>
      <div><h4>For REALTORS®</h4><ul>
        <li><Link to="/realtor-network">REALTOR® Network</Link></li>
      </ul></div>
      <div><h4>Consumer Protection</h4><ul>
        <li><Link to="/dorts">Disclosure of Representation</Link></li>
      </ul></div>
      <div><h4>Contact</h4><ul>
        <li>info@eztofind.ca</li>
        <li><a href="tel:+16044667021" style={{color:"inherit"}}>(604) 466-7021</a></li>
        <li style={{fontSize:"0.82rem",opacity:0.85,marginTop:"0.35rem"}}>1 – 22374 Lougheed Hwy<br/>Maple Ridge, BC V2X 2T5</li>
      </ul></div>
    </div>
    <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",marginTop:"2.5rem",paddingTop:"1.5rem",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",fontSize:"0.78rem",opacity:0.85}}>
      <div style={{maxWidth:"58ch"}}>
        <div style={{marginBottom:"0.5rem",opacity:0.75}}>Last reviewed: July 27, 2026 · v1.0</div>
        <div>© 2026 <strong>Doug LeMaire</strong>. All EZtoFind.ca content, code, design, database compilations, and the "Doogie" AI assistant character are proprietary works protected under the Canadian Copyright Act (R.S.C., 1985, c. C-42) and the Trademarks Act. <strong>Registered with the Canadian Intellectual Property Office — Copyright Registration No. 1247822.</strong> Reproduction, scraping, cloning, or use in AI-training datasets is prohibited without written permission. See <Link to="/copyright" style={{color:"var(--brand-gold)"}}>Copyright & IP Notice</Link>. Real estate services by <strong>Doug LeMaire, REALTOR®</strong> of Fraser Property Management Realty Services Ltd. (BCFSA-licensed). Not intended to solicit properties currently listed for sale or buyers currently under contract with another REALTOR®.</div>
      </div>
      <div style={{display:"flex",gap:"1.25rem",flexWrap:"wrap",alignItems:"flex-end"}}><Link to="/privacy">Privacy (PIPA)</Link><Link to="/terms">Terms</Link><Link to="/copyright">Copyright &amp; IP</Link><Link to="/ai-use">AI Use</Link><Link to="/compliance">Compliance</Link><Link to="/data-attribution">Data Attribution</Link><Link to="/breach-policy">Breach Policy</Link><Link to="/unsubscribe">Unsubscribe</Link><a href="#" data-testid="footer-cookie-prefs" onClick={(e)=>{e.preventDefault(); try{window.dispatchEvent(new Event("open-cookie-prefs"));}catch(_){}}} style={{cursor:"pointer"}}>Cookie Preferences</a></div>
    </div>
    {/* CREA-required trademark attribution — MUST appear on every page displaying MLS® data. Verbatim wording per CREA Trademark Policy 2019 s.4. */}
    <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",marginTop:"1.5rem",paddingTop:"1.25rem",fontSize:"0.72rem",lineHeight:1.55,opacity:0.7,color:"rgba(255,255,255,0.85)"}} data-testid="crea-trademark-notice">
      <div style={{display:"flex",gap:"0.75rem",alignItems:"flex-start",marginBottom:"0.6rem"}}>
        <div aria-hidden="true" style={{flexShrink:0,width:30,height:30,border:"1.5px solid rgba(255,255,255,0.85)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif",fontWeight:700,fontSize:"1.05rem",color:"rgba(255,255,255,0.95)"}}>R</div>
        <p style={{margin:0}}>The trademarks REALTOR®, REALTORS®, and the REALTOR® logo are controlled by The Canadian Real Estate Association (CREA) and identify real estate professionals who are members of CREA.</p>
      </div>
      <div style={{display:"flex",gap:"0.75rem",alignItems:"flex-start"}}>
        <div aria-hidden="true" style={{flexShrink:0,width:30,height:30,border:"1.5px solid rgba(255,255,255,0.85)",borderRadius:4,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Arial,sans-serif",fontWeight:700,fontSize:"0.65rem",lineHeight:1,color:"rgba(255,255,255,0.95)",padding:"3px 0"}}><div>MLS</div><div style={{fontSize:"0.35rem",marginTop:"1px",letterSpacing:"0.05em"}}>MULTIPLE LISTING SERVICE</div></div>
        <p style={{margin:0}}>The trademarks MLS®, Multiple Listing Service® and the associated logos are owned by The Canadian Real Estate Association (CREA) and identify the quality of services provided by real estate professionals who are members of CREA.</p>
      </div>
    </div>
  </div></footer>
);

// --- Doogie AI Chat Widget ---
// Detect listing-search intent so we can fire the MLS filter extractor alongside Doogie's chat stream.
// Broad triggers (any of these means "user is looking for listings"):
//   - explicit listing words: listing, for sale, houses in, condos, acreage…
//   - a bedroom/bathroom count: "3 bedroom", "4-bed", "two bath", "2 br"
//   - a $-price cap: "under 800k", "under $1.5M", "under 2 million"
// Missing any of these was why "3 bedrooms in white rock" bypassed the extractor entirely.
const LISTING_INTENT_REGEX = new RegExp(
  [
    // Explicit real-estate keywords
    "\\b(listing|listings|for\\s+sale|homes?\\s+in|houses?\\s+in|condos?|townhomes?|townhouses?|acreage|find\\s+.*(bed|bath|home|condo)|show\\s+me|looking\\s+for|search|properties?\\s+in)\\b",
    // Numeric bed count (digits or words) — captures "3 bedroom", "4-bed", "two bedroom"
    "\\b(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\\s*[- ]?\\s*(bed|bedroom|br|bd)s?\\b",
    // Numeric bath count
    "\\b(\\d{1,2}(?:\\.5)?|one|two|three|four|five|six|seven|eight|nine|ten)\\s*[- ]?\\s*(bath|bathroom|ba)s?\\b",
    // Price-cap phrases
    "\\b(under|below|less\\s+than|max|up\\s+to)\\s*\\$?\\s*\\d",
    "\\$\\s*\\d.*(m|mil|million|k|thousand)\\b",
  ].join("|"),
  "i"
);
const looksLikeListingSearch = (text) => LISTING_INTENT_REGEX.test(text || "");
export { looksLikeListingSearch };

// --- Favorites (❤️) — localStorage-backed heart button
// -------------------------------------------------------
// Anonymous, zero-friction save. Users can heart any listing card; state is
// stored in localStorage["ez_favorites"] (JSON array of listing_keys). The
// /favorites page reads this list and hydrates cards via /api/listings/by-keys.
// Optionally, users can sync to their email (server-side, CASL double-opt-in)
// for cross-device access — that flow lives in the <Favorites> page component.
const FAV_STORAGE_KEY = "ez_favorites";

// GA4 conversion helper — safe no-op wrapper for window.gtag("event", …).
// Fires only when the user has opted into analytics (GA4Gate loads gtag) AND
// gtag is actually on window. Wraps every call in try/catch so a broken
// analytics call NEVER breaks the user-facing flow (form submit, favorite,
// etc.). PIPA-compliant: consent gate upstream means no fire before opt-in.
const trackConversion = (event, params = {}) => {
  try {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", event, {
      // Standard GA4 recommended params for lead-gen: give every conversion a
      // consistent envelope so the funnel + attribution reports work cleanly.
      send_to: process.env.REACT_APP_GA4_MEASUREMENT_ID,
      ...params,
    });
  } catch { /* swallow — never break UX for an analytics call */ }
};
// Track the price we FIRST saw for each favorited listing so the personalized
// homepage can flag price drops. Purely client-side — server never sees this.
const FAV_PRICES_KEY = "ez_fav_prices";
const _readFavPrices = () => {
  try { const s = localStorage.getItem(FAV_PRICES_KEY); return s ? JSON.parse(s) : {}; }
  catch { return {}; }
};
const _writeFavPrices = (obj) => { try { localStorage.setItem(FAV_PRICES_KEY, JSON.stringify(obj)); } catch {} };

// --- Ask Doogie about a listing REMOVED (BCFSA compliance) ---
// Doogie may not provide property-specific commentary under BCFSA rules for
// unlicensed AI assistants. If Doug ever adds a licensed advisory feature,
// wire it through a REALTOR®-in-the-loop consultation flow instead of a
// direct-to-chat handoff. Prior helper and buttons were removed 2026-07-31.

const _readFavs = () => {
  try {
    const s = localStorage.getItem(FAV_STORAGE_KEY);
    if (!s) return [];
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr.filter(k => typeof k === "string") : [];
  } catch { return []; }
};
const _writeFavs = (arr) => {
  try {
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(arr));
    // Notify other components (nav badge, /favorites page, other cards) that
    // the list changed without waiting for a full page reload.
    window.dispatchEvent(new CustomEvent("ez-favorites-changed", { detail: arr }));
  } catch {}
};

const FavoriteButton = ({ listingKey, currentPrice, size = "md" }) => {
  const [saved, setSaved] = useState(() => _readFavs().includes(listingKey));
  useEffect(() => {
    const handler = (e) => setSaved((e.detail || _readFavs()).includes(listingKey));
    window.addEventListener("ez-favorites-changed", handler);
    return () => window.removeEventListener("ez-favorites-changed", handler);
  }, [listingKey]);
  const toggle = (e) => {
    e.preventDefault(); e.stopPropagation();
    const current = _readFavs();
    const nextSaved = !saved;
    const next = nextSaved ? [listingKey, ...current] : current.filter(k => k !== listingKey);
    _writeFavs(next);
    // Track price snapshot on first favorite for price-drop detection on personalized home
    if (nextSaved && currentPrice) {
      const prices = _readFavPrices();
      if (!prices[listingKey]) { prices[listingKey] = { first_seen_price: currentPrice, at: new Date().toISOString() }; _writeFavPrices(prices); }
    }
    // GA4 conversion — only fire on add (not remove) to avoid double-counting
    if (nextSaved) trackConversion("favorite_added", { listing_key: listingKey, value: currentPrice || 0, currency: "CAD" });
    setSaved(nextSaved);
  };
  const dim = size === "sm" ? 30 : 40;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from favorites" : "Save to favorites"}
      title={saved ? "Remove from favorites" : "Save to favorites"}
      data-testid={`fav-toggle-${listingKey}`}
      style={{
        width: dim, height: dim, borderRadius:"50%", border:"none", cursor:"pointer",
        background: saved ? "rgba(220,38,38,0.95)" : "rgba(255,255,255,0.9)",
        color: saved ? "#fff" : "#DC2626",
        boxShadow:"0 2px 8px rgba(0,0,0,0.15)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize: size === "sm" ? "0.95rem" : "1.15rem",
        transition:"transform 0.15s, background 0.2s",
      }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.9)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      {saved ? "❤️" : "🤍"}
    </button>
  );
};

// Compact listing card used inside Doogie chat (smaller than the search-page card).
const DoogieListingCard = ({ listing }) => {
  const price = (listing.list_price || 0).toLocaleString("en-CA");
  const photo = (listing.photos && listing.photos[0]) || "";
  return (
    <div style={{position:"relative"}}>
    <Link to={`/listing/${listing.listing_key}`} data-testid={`doogie-listing-${listing.listing_key}`}
      style={{display:"flex",gap:"0.6rem",background:"#fff",border:"1px solid rgba(15,42,91,0.15)",borderRadius:10,padding:"0.5rem",textDecoration:"none",color:"inherit",marginTop:"0.5rem",boxShadow:"0 2px 6px rgba(15,42,91,0.06)"}}>
      {photo && <img src={photo} alt="" style={{width:78,height:78,objectFit:"cover",borderRadius:6,flexShrink:0}} loading="lazy"/>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"Sora,sans-serif",fontSize:"0.98rem",fontWeight:700,color:"var(--brand-navy)"}}>${price}</div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.78rem",color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{listing.street_address}, {listing.city}</div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.72rem",color:"var(--muted)",marginTop:"0.15rem"}}>{listing.beds}bd · {listing.baths}ba · {listing.property_type}</div>
        {listing.mls_number && <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.68rem",color:"var(--muted)",marginTop:"0.1rem"}}>MLS® #{listing.mls_number}</div>}
      </div>
    </Link>
    <div style={{position:"absolute",top:8,right:8,zIndex:2}}>
      <FavoriteButton listingKey={listing.listing_key} currentPrice={listing.list_price} size="sm"/>
    </div>
    </div>
  );
};

const DOOGIE_LANGUAGES = [
  { code: "en",      label: "EN",  name: "English"                    },
  { code: "fr",      label: "FR",  name: "Français"                   },
  { code: "zh-Hant", label: "繁", name: "繁體中文 (Traditional / Cantonese)" },
  { code: "zh-Hans", label: "简", name: "简体中文 (Simplified / Mandarin)"   },
  { code: "pa",      label: "ਪੰ",  name: "ਪੰਜਾਬੀ (Punjabi)"           },
  { code: "fa",      label: "فا",  name: "فارسی (Farsi)"              },
  { code: "pt-PT",   label: "PT",  name: "Português (European)"       },
];

// Language-specific AI-translation disclaimer shown above Doogie chat whenever
// a non-English language is active. Legal shield: makes visitors explicitly
// aware that AI translations may contain errors, especially in legal/tax terms.
const DOOGIE_TRANSLATION_DISCLAIMER = {
  fr:       "⚠️ Traduction par IA — les réponses de Doogie dans cette langue peuvent contenir de petites erreurs. Pour toute décision financière, consultez d'abord un professionnel.",
  "zh-Hant":"⚠️ AI 翻譯 — Doogie 的中文回覆可能有細微誤差。任何涉及金錢的決定，請先諮詢專業人士。",
  "zh-Hans":"⚠️ AI 翻译 — Doogie 的中文回复可能有细微误差。任何涉及金钱的决定，请先咨询专业人士。",
  pa:       "⚠️ AI ਅਨੁਵਾਦ — ਇਸ ਭਾਸ਼ਾ ਵਿੱਚ ਡੂਗੀ ਦੇ ਜਵਾਬਾਂ ਵਿੱਚ ਛੋਟੀਆਂ ਗਲਤੀਆਂ ਹੋ ਸਕਦੀਆਂ ਹਨ। ਪੈਸੇ ਨਾਲ ਸੰਬੰਧਿਤ ਕਿਸੇ ਵੀ ਫੈਸਲੇ ਲਈ, ਪਹਿਲਾਂ ਕਿਸੇ ਪੇਸ਼ੇਵਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
  fa:       "⚠️ ترجمه توسط هوش مصنوعی — پاسخ‌های داگی به این زبان ممکن است دارای اشتباهات جزئی باشند. برای هر تصمیمی که مربوط به پول است، ابتدا با یک متخصص مشورت کنید.",
  "pt-PT":  "⚠️ Tradução por IA — as respostas do Doogie nesta língua podem conter pequenos erros. Para qualquer decisão que envolva dinheiro, consulte primeiro um profissional.",
};

export const DoogieChat = ({ mode = "fab" }) => {
  const embedded = mode === "embedded";
  const [open, setOpen] = useState(embedded);   // embedded mode is always open
  const [expanded, setExpanded] = useState(false);   // Doogie panel: normal ↔ maximized
  const [consented, setConsented] = useState(() => localStorage.getItem("ez_doogie_consent") === "1");
  const [lang, setLang] = useState(() => localStorage.getItem("ez_doogie_lang") || "en");
  // --- Personalized greeting for returning visitors ---
  // Reads localStorage (device-only) to see if the user has previously visited
  // a community page. If so, Doogie's opening line references it — creates a
  // "Doogie remembers me" moment without any server-side identification.
  // PIPA/BCFSA/CASL-safe: no personal data crosses to the server.
  const _initialGreeting = () => {
    const defaultMsg = "Hi! I'm Doogie 🐾 EZtoFind's AI helper. Ask me about BC real estate terms, our services, or how the site works. You can also ask me to find listings — try \"4-bedroom homes in Whistler\" or \"condos in Vancouver under $800K\".";
    try {
      // Only personalize if user has consented to Personalization ("session") cookies
      const rawPrefs = localStorage.getItem("ez_cookie_prefs");
      if (rawPrefs) { const p = JSON.parse(rawPrefs); if (p && p.session === false) return defaultMsg; }
      const lc = JSON.parse(localStorage.getItem("ez_last_community") || "null");
      const ls = JSON.parse(localStorage.getItem("ez_last_search") || "null");
      const favs = JSON.parse(localStorage.getItem("ez_favorites") || "[]");
      if (lc && lc.name) {
        let msg = `Welcome back! 🐾 Any new questions about ${lc.name}?`;
        if (favs && favs.length > 0) msg += ` You've got ${favs.length} favorite${favs.length === 1 ? "" : "s"} saved — I can help compare them.`;
        else if (ls && ls.filters) msg += " I can also refresh your last search or find something new.";
        else msg += " Or I can help you explore any BC community, glossary term, or listing.";
        return msg;
      }
      if (ls && ls.filters) {
        const city = ls.filters.city || ls.filters.community || ls.filters.region;
        if (city) return `Welcome back! 🐾 Want to see new listings in ${city}, or shall we look somewhere else?`;
      }
    } catch {}
    return defaultMsg;
  };
  const [msgs, setMsgs] = useState([{role:"assistant",content: _initialGreeting()}]);
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => "sess-" + Math.random().toString(36).slice(2));
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  // Voice output (TTS) — persisted preference. Default OFF so first-time users
  // don't get startled by autoplay audio. Users toggle via the 🔊/🔇 button.
  const [voiceOut, setVoiceOut] = useState(() => localStorage.getItem("ez_doogie_voice_out") === "1");
  const scrollRef = useRef();
  const mediaRef = useRef(null);
  const audioRef = useRef(null);   // currently-playing HTMLAudioElement, so we can stop mid-play
  const spokenRef = useRef(new Set());  // set of message-indices we've already spoken — bulletproof against double-fire
  useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs]);
  useEffect(() => { localStorage.setItem("ez_doogie_lang", lang); }, [lang]);
  // Pre-fill from affordability calculator handoff, OR from a listing card
  // "Ask Doogie" click. Both paths write to localStorage "ez_doogie_prefill"
  // and (in the case of listing cards) dispatch "ez-open-doogie" to open the panel.
  useEffect(() => {
    const pre = localStorage.getItem("ez_doogie_prefill");
    if (open && pre && consented) { setInput(pre); localStorage.removeItem("ez_doogie_prefill"); }
  }, [open, consented]);
  // Allow any component to open Doogie via `window.dispatchEvent(new CustomEvent("ez-open-doogie"))`.
  // If a prefill was set, the useEffect above will pick it up once panel state = open + consented.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("ez-open-doogie", handler);
    return () => window.removeEventListener("ez-open-doogie", handler);
  }, []);

  // Honor `?ask=<query>` in the URL — search results and external links can
  // route visitors to `/?ask=how%20much%20are%20strata%20fees` and have Doogie
  // auto-open with the question pre-filled. Runs once on mount; clears the
  // param from the URL bar so a refresh doesn't repeat the auto-open.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const ask = sp.get("ask");
      if (ask && ask.trim()) {
        localStorage.setItem("ez_doogie_prefill", ask.trim());
        setOpen(true);
        // Strip ?ask from the URL without triggering a nav
        sp.delete("ask");
        const newUrl = window.location.pathname + (sp.toString() ? `?${sp}` : "") + window.location.hash;
        window.history.replaceState({}, "", newUrl);
      }
    } catch { /* ignore */ }
  }, []);

  const acceptConsent = () => { localStorage.setItem("ez_doogie_consent","1"); setConsented(true); };

  // Stop any currently-playing Doogie voice — used when panel closes, a new
  // message starts, or the user toggles voice-out off mid-play.
  const stopSpeaking = () => {
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.src = ""; } catch(_) {}
      audioRef.current = null;
    }
  };

  // Fetch a TTS blob from the backend and auto-play it. Text is trimmed to the
  // TTS 4096-char cap on the server side; here we defensively slice to 3800.
  // Concurrency: if a new speak() starts before an older one has finished
  // fetching its audio, the older one is invalidated via a monotonic counter.
  const speakSeqRef = useRef(0);
  const speak = async (text) => {
    if (!voiceOut || !text) return;
    stopSpeaking();                              // pause anything currently playing
    const mySeq = ++speakSeqRef.current;         // claim the newest slot
    try {
      const r = await fetch(`${API}/doogie/tts`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({text: text.slice(0, 3800), voice: "ash", session_id: sessionId}),
      });
      if (!r.ok) return;
      if (mySeq !== speakSeqRef.current) return; // a newer request has since started — drop this one
      const blob = await r.blob();
      if (mySeq !== speakSeqRef.current) return; // check again after blob() awaits
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      // preload="auto" tells the browser to start buffering immediately instead
      // of waiting until .play() — shaves ~100-300ms off perceived first-audio lag.
      a.preload = "auto";
      audioRef.current = a;
      a.onended = () => { try { URL.revokeObjectURL(url); } catch(_){} if (audioRef.current === a) audioRef.current = null; };
      // Start playback the moment the browser confirms it can play through
      // without buffering — sounds cleaner than starting mid-buffer.
      const tryPlay = () => a.play().catch(()=>{});
      if (a.readyState >= 3) tryPlay(); else a.oncanplaythrough = tryPlay;
    } catch (e) {
      // Autoplay policies may throw NotAllowedError on some browsers until the user
      // interacts with the page. That's fine — the user just toggled the speaker
      // so we're already past that gate in almost every case.
    }
  };

  // When user disables voice-out mid-play, stop the audio immediately.
  useEffect(() => {
    localStorage.setItem("ez_doogie_voice_out", voiceOut ? "1" : "0");
    if (!voiceOut) stopSpeaking();
  }, [voiceOut]);

  // Stop audio when chat panel closes (privacy + battery).
  useEffect(() => { if (!open) stopSpeaking(); }, [open]);

  // Voice input via MediaRecorder → OpenAI Whisper (backend endpoint /doogie/transcribe).
  // Powered by the Emergent Universal LLM Key — no user-provided OpenAI key required.
  //
  // Latency notes (why we do what we do):
  //  - `getUserMedia` takes 500–1500ms on the FIRST click because the browser
  //    is negotiating with the OS/hardware. If the user starts talking during
  //    this window, the beginning of their sentence is lost. To fix, we open
  //    the stream FIRST and only flip `listening` state (which turns the button
  //    red and shows the "listening…" label) once the recorder is actually
  //    live — so the user gets an accurate "you can talk now" signal.
  //  - MediaRecorder with NO timeslice buffers audio internally and only flushes
  //    on stop. Passing `100` (ms) makes it emit chunks every 100ms so early
  //    samples are captured reliably.
  //  - After the user stops, uploading + Whisper transcription takes 2–4s. We
  //    surface "transcribing…" via the shared `busy` flag so it doesn't look
  //    like Doogie froze.
  const [transcribing, setTranscribing] = useState(false);
  const toggleMic = async () => {
    if (listening) {
      try { mediaRef.current?.stop(); } catch {}
      setListening(false); return;
    }
    if (!navigator.mediaDevices?.getUserMedia) { alert("Voice input isn't supported in this browser."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstart = () => {
        // Fires the moment MediaRecorder is ACTUALLY capturing — this is our
        // accurate "you can talk now" signal, not the click event.
        setListening(true);
        // Small haptic tap on mobile so the user knows to start speaking.
        if (navigator.vibrate) navigator.vibrate(30);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setListening(false);
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size < 500) return; // skip empty / dropped-immediately recordings
        setTranscribing(true);
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        fd.append("language", lang);
        try {
          const r = await axios.post(`${API}/doogie/transcribe`, fd, { headers: {"Content-Type": "multipart/form-data"} });
          if (r.data?.text) setInput(prev => prev ? `${prev} ${r.data.text}` : r.data.text);
          else if (r.data?.error) alert("Voice: " + r.data.error);
        } catch(e) { alert("Voice transcription unavailable right now — please type instead."); }
        finally { setTranscribing(false); }
      };
      mediaRef.current = rec;
      // Pass timeslice=100ms so early samples are flushed to chunks instead of
      // being buffered internally (was causing lost audio at the start).
      rec.start(100);
      // Auto-stop after 30s to avoid runaway recordings
      setTimeout(() => { if (rec.state === "recording") { try { rec.stop(); } catch{} } }, 30000);
    } catch (err) { alert("Microphone permission is needed for voice input."); }
  };

  const send = async (e) => {
    e.preventDefault();
    if(!input.trim() || busy) return;
    const q = input; setInput(""); setBusy(true);
    // GA4 engagement event — count *user* messages sent this session. Fire
    // once at message #3 to mark this as an engaged conversation (Google's
    // recommended threshold for "meaningful engagement" is 3+ interactions).
    const userMsgCountSoFar = msgs.filter(m => m.role === "user").length + 1;
    if (userMsgCountSoFar === 3) {
      trackConversion("doogie_conversation", { session_id: sessionId, message_count: userMsgCountSoFar, language: lang });
    }

    // LISTING SEARCH INTENT: skip the conversational chat entirely and only show listing results.
    // This avoids Doogie explaining "how to search" alongside the actual results.
    if (looksLikeListingSearch(q)) {
      setMsgs(m => [...m, {role:"user",content:q}, {role:"assistant",content:"🐾 Sniffing around for listings…"}]);
      try {
        const r = await axios.post(`${API}/doogie/mls-search`, { message: q });
        const mls = r.data;
        if (mls && mls.intent_matched && mls.listings && mls.listings.length > 0) {
          setMsgs(m => {
            const c = [...m];
            c[c.length-1] = { role:"assistant", type:"listings", summary: mls.summary, listings: mls.listings, filters: mls.filters, count: mls.count, using_mock: mls.using_mock_data };
            return c;
          });
        } else {
          const fallback = mls?.summary || "I couldn't find any listings matching that. Try broadening the price, community, or beds — or ask about a different area.";
          setMsgs(m => { const c=[...m]; c[c.length-1] = {role:"assistant",content:fallback}; return c; });
        }
      } catch(err) {
        setMsgs(m => { const c=[...m]; c[c.length-1] = {role:"assistant",content:"Woof — I couldn't reach the listings service. Please try again."}; return c; });
      }
      setBusy(false);
      return;
    }

    // Non-listing intent → normal streaming conversational chat
    setMsgs(m => [...m, {role:"user",content:q}, {role:"assistant",content:""}]);
    let gotAnyContent = false;
    try {
      const res = await fetch(`${API}/doogie/chat`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:sessionId,message:q,language:lang})});
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      while(true) {
        const {done, value} = await reader.read(); if(done) break;
        buf += dec.decode(value, {stream:true});
        const lines = buf.split("\n\n"); buf = lines.pop();
        for(const line of lines) {
          if(!line.startsWith("data:")) continue;
          try {
            const j = JSON.parse(line.slice(5).trim());
            if(j.delta) { gotAnyContent = true; setMsgs(m => { const c=[...m]; c[c.length-1] = {...c[c.length-1], role:"assistant",content:(c[c.length-1].content||"")+j.delta}; return c; }); }
            else if(j.done) {
              // Capture the fully-streamed text OUTSIDE the state setter so
              // we can speak it exactly once. Ref-guard prevents ANY re-fire
              // (React StrictMode, batching, duplicate 'done' events, etc.).
              setMsgs(m => {
                const c=[...m];
                const lastIdx = c.length - 1;
                c[lastIdx] = {...c[lastIdx], meta: {cached: !!j.cached, pii_redacted: !!j.pii_redacted, language: lang}};
                const fullText = c[lastIdx].content || "";
                // Fire TTS once per message index. Marker is the current turn's
                // start timestamp so a NEW answer with the same index (rare) still fires.
                const key = `${lastIdx}::${fullText.length}`;
                if (voiceOut && fullText && !spokenRef.current.has(key)) {
                  spokenRef.current.add(key);
                  speak(fullText);
                }
                return c;
              });
            }
            else if(j.error) { gotAnyContent = true; setMsgs(m => { const c=[...m]; c[c.length-1] = {role:"assistant",content:"Woof — Doogie's brain is temporarily unavailable. Please try again in a moment, or ask Doug directly via the Contact page. (Reason: "+String(j.error).slice(0,180)+")"}; return c; }); }
          } catch{}
        }
      }
      if(!gotAnyContent) setMsgs(m => { const c=[...m]; c[c.length-1] = {role:"assistant",content:"Woof — I didn't receive a response. Please try again, or contact Doug directly."}; return c; });
    } catch(err) { setMsgs(m => { const c=[...m]; c[c.length-1] = {role:"assistant",content:"Woof — I had trouble connecting. Please try again."}; return c; }); }
    setBusy(false);
  };

  return (<>
    {!embedded && <button className="doogie-fab" onClick={()=>setOpen(o=>!o)} data-testid="doogie-fab" aria-label="Chat with Doogie">
      <img src={DOOGIE_THINKING} alt="Doogie"/>
    </button>}
    {open && <div className={`doogie-panel${expanded ? " doogie-panel-expanded" : ""}${embedded ? " doogie-panel-embedded" : ""}`} data-testid={embedded ? "doogie-panel-embedded" : "doogie-panel"}>
      <header><img src={DOOGIE_THINKING} alt="Doogie"/><div style={{minWidth:0,flexShrink:1,overflow:"hidden"}}><div style={{fontWeight:600}}>Doogie</div><div style={{fontSize:"0.75rem",opacity:0.85,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>AI Helper · General Info Only</div></div>
        <button type="button" onClick={()=>setVoiceOut(v=>!v)} data-testid="doogie-voiceout-toggle"
          aria-label={voiceOut ? "Turn Doogie's voice off" : "Turn Doogie's voice on"}
          title={voiceOut ? "Voice ON — Doogie will speak replies. Tap to mute." : "Voice OFF — tap to hear Doogie speak"}
          aria-pressed={voiceOut}
          style={{marginLeft:"auto",flexShrink:0,width:36,height:36,borderRadius:8,border:"1px solid rgba(255,255,255,0.35)",background:voiceOut?"rgba(245,166,35,0.35)":"rgba(255,255,255,0.15)",color:"white",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 120ms"}}>
          {voiceOut ? "🔊" : "🔇"}
        </button>
        <select value={lang} onChange={e=>setLang(e.target.value)} data-testid="doogie-lang-select"
          title="Chat language"
          aria-label="Chat language"
          style={{marginLeft:"0.35rem",flexShrink:0,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"white",borderRadius:8,padding:"0.3rem 0.4rem",fontSize:"0.8rem",cursor:"pointer",fontFamily:"Inter,sans-serif",maxWidth:"85px"}}>
          {DOOGIE_LANGUAGES.map(l => <option key={l.code} value={l.code} style={{color:"black"}}>{l.label}</option>)}
        </select>
        {!embedded && <button onClick={()=>setExpanded(e=>!e)} data-testid="doogie-expand" aria-label={expanded?"Restore chat window":"Expand chat window"} title={expanded?"Restore chat window":"Expand chat window"}
          aria-pressed={expanded}
          style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.35)",color:"white",fontSize:"1rem",lineHeight:1,cursor:"pointer",padding:"0 0.55rem",marginLeft:"0.35rem",flexShrink:0,borderRadius:8,fontWeight:700,minWidth:36,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 120ms"}}
          onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.28)"}
          onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.15)"}>{expanded?"⤡":"⤢"}</button>}
        {!embedded && <button onClick={()=>setOpen(false)} data-testid="doogie-close" aria-label="Close Doogie chat" title="Close chat"
          style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.35)",color:"white",fontSize:"1.35rem",lineHeight:1,cursor:"pointer",padding:"0 0.55rem",marginLeft:"0.5rem",flexShrink:0,borderRadius:8,fontWeight:700,minWidth:36,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 120ms"}}
          onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.28)"}
          onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.15)"}>×</button>}</header>
      {DOOGIE_TRANSLATION_DISCLAIMER[lang] && (
        <div data-testid="doogie-translation-disclaimer" style={{background:"#F5F0E1",borderBottom:"1px solid rgba(15,42,91,0.15)",color:"var(--brand-navy)",padding:"0.7rem 1rem",fontFamily:"Inter,sans-serif",fontSize:"0.78rem",lineHeight:1.5,direction:isRTL(lang)?"rtl":"ltr",textAlign:isRTL(lang)?"right":"left"}}>
          {DOOGIE_TRANSLATION_DISCLAIMER[lang]}
        </div>
      )}
      {!consented ? <div style={{padding:"1.25rem",fontFamily:"Inter,sans-serif",fontSize:"0.88rem",lineHeight:1.6,background:"#FFF8E8",flex:1,overflowY:"auto"}} data-testid="doogie-consent">
        <div style={{fontWeight:700,color:"var(--brand-navy)",marginBottom:"0.5rem"}}>Before we chat…</div>
        <p style={{margin:"0 0 0.75rem"}}>Doogie is an AI-assisted helper. Doogie shares <strong>general educational information about BC real estate only</strong> — it is not legal, tax, financial, or property-specific advice, and it is not a substitute for a licensed professional.</p>
        <p style={{margin:"0 0 0.75rem"}}><strong>Please don't share confidential or personal information</strong> — full name, address, phone number, financial details, or property specifics. Your messages are processed by our AI provider (hosted outside Canada) and may be logged for quality, security, and compliance review. See our <Link to={`/privacy${langQS(lang)}`} style={{color:"var(--brand-blue)"}}>Privacy Policy</Link> for details.</p>
        <p style={{margin:"0 0 1rem",fontSize:"0.82rem"}}>For your own situation, please speak with the appropriate licensed professional — a BC lawyer or notary for legal questions, an accountant or tax professional for tax, a licensed mortgage broker for financing, and a licensed REALTOR® for real estate. To reach Doug LeMaire, REALTOR® directly, use the <Link to={`/contact${langQS(lang)}`} style={{color:"var(--brand-blue)"}}>contact form</Link>.</p>
        <p style={{margin:"0 0 1rem",fontSize:"0.78rem",color:"var(--muted)"}}>By tapping <em>I understand</em>, you consent to this chat being processed and stored as described above.</p>
        <button onClick={acceptConsent} className="btn btn-primary" style={{width:"100%"}} data-testid="doogie-consent-accept">I understand — start chatting</button>
      </div>
      : <>
      <div className="msgs" ref={scrollRef}>{msgs.map((m,i)=>{
        if (m.type === "listings") {
          return (<div key={i} className={`msg assistant`} data-testid={`doogie-listings-msg-${i}`}>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.88rem"}}>{m.summary}</div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.68rem",color:"var(--muted)",marginTop:"0.4rem",fontStyle:"italic",padding:"0.4rem 0.6rem",background:"rgba(15,42,91,0.04)",borderRadius:6}}>🤖 Listings AI-selected from the MLS® feed based on parsing your query. Verify directly with the listing brokerage before making an offer.</div>
            {m.listings.map(l => <DoogieListingCard key={l.listing_key} listing={l}/>)}
            {m.count > m.listings.length && (
              <Link to={`/listings?${new URLSearchParams(Object.entries({
                city: m.filters?.city, property_type: m.filters?.property_type,
                beds_min: m.filters?.beds_min, beds_exact: m.filters?.beds_exact,
                baths_min: m.filters?.baths_min, baths_exact: m.filters?.baths_exact,
                price_min: m.filters?.price_min, price_max: m.filters?.price_max,
                q: m.filters?.keyword,
              }).filter(([,v])=>v!=null && v!=="")).toString()}`}
                style={{display:"block",marginTop:"0.6rem",textAlign:"center",fontFamily:"Inter,sans-serif",fontSize:"0.82rem",color:"var(--brand-blue)",fontWeight:600,textDecoration:"none"}} data-testid={`doogie-see-all-${i}`}>
                See all {m.count} matches →
              </Link>
            )}
            {m.using_mock && <div style={{fontSize:"0.68rem",color:"var(--muted)",marginTop:"0.4rem",fontStyle:"italic"}}>Demo data — real CREA DDF® feed pending credentials.</div>}
          </div>);
        }
        return <div key={i} className={`msg ${m.role}`}>{m.content ? <><span dangerouslySetInnerHTML={{__html: safeHtml(renderChatContent(m.content, lang))}}/>{m.role==="assistant" && i > 0 && <div style={{fontSize:"0.66rem",color:"var(--muted)",marginTop:"0.5rem",fontStyle:"italic",opacity:0.8}}>🤖 AI-assisted retrieval from EZtoFind.ca's approved content · General information only · <Link to={`/privacy${langQS(lang)}`} style={{color:"var(--muted)"}}>Privacy</Link></div>}{m.role==="assistant" && i > 0 && (() => { const prev = msgs.slice(0, i).reverse().find(x => x.role === "user"); return prev && prev.content ? <DoogieRelatedChips query={prev.content} testIdPrefix={`doogie-chip-${i}`}/> : null; })()}</> : (busy && i===msgs.length-1 ? "…" : "")}</div>;
      })}</div>
      <form onSubmit={send} style={{display:"flex",gap:"0.35rem",alignItems:"center",padding:"0.5rem"}}>
        <button type="button" onClick={toggleMic} data-testid="doogie-mic"
          disabled={transcribing}
          aria-label={listening ? "Stop recording" : transcribing ? "Transcribing your voice" : "Start voice input"}
          title={listening ? "Recording… tap to stop" : transcribing ? "Transcribing…" : "Voice input"}
          style={{width:44,height:44,borderRadius:"50%",border:"1px solid rgba(15,42,91,0.15)",background:listening?"#DC2626":transcribing?"#F5A623":"#F5F0E1",color:(listening||transcribing)?"#fff":"var(--brand-navy)",cursor:transcribing?"wait":"pointer",fontSize:"1.15rem",flexShrink:0,opacity:transcribing?0.85:1}}>
          {listening ? "⏺" : transcribing ? "⏳" : "🎤"}
        </button>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder={listening ? "🔴 Listening — speak now" : transcribing ? "Transcribing your voice…" : "Ask about a BC real estate term or topic…"} data-testid="doogie-input" style={{flex:1}}/>
        <button type="submit" disabled={busy} data-testid="doogie-send">Send</button>
      </form>
      </>}
    </div>}
  </>);
};

// =============== "WHERE SHOULD YOU LIVE?" COMMUNITY MATCHER ===============
// 5-question quiz that suggests 3-5 BC communities based on preferences.
// COMPLIANCE:
// - BCFSA: purely factual; "suggested, not recommended" caveat; no opinions of value
// - PIPA: preferences transient (component state only); no PII collected; server does not persist
// - CASL: no email; no CEM
const WSYL_QUESTIONS = [
  {id:"lifestyle", label:"What type of lifestyle are you looking for?", multi:false, options:[
    {v:"urban", l:"Urban / Downtown"},{v:"suburban", l:"Suburban"},{v:"small-town", l:"Small Town"},
    {v:"rural", l:"Rural / Acreage"},{v:"waterfront", l:"Waterfront"},{v:"mountain", l:"Mountain / Recreation"},
  ]},
  {id:"home_type", label:"What type of home are you looking for?", multi:false, options:[
    {v:"condo", l:"Condo"},{v:"townhome", l:"Townhome"},{v:"detached", l:"Detached Home"},
    {v:"acreage", l:"Acreage"},{v:"luxury", l:"Luxury Home"},
  ]},
  {id:"budget", label:"What is your approximate budget?", multi:false, options:[
    {v:"under-500", l:"Under $500,000"},{v:"500-750", l:"$500,000 – $750,000"},
    {v:"750-1m", l:"$750,000 – $1M"},{v:"1m-2m", l:"$1M – $2M"},{v:"over-2m", l:"Over $2M"},
  ]},
  {id:"matters", label:"What matters most to you? (choose any that apply)", multi:true, options:[
    {v:"walkability", l:"Walkability"},{v:"good-schools", l:"Good Schools"},{v:"outdoor", l:"Outdoor Recreation"},
    {v:"quiet", l:"Quiet Neighborhoods"},{v:"restaurants", l:"Restaurants & Shopping"},{v:"transit", l:"Public Transit"},
    {v:"commute", l:"Short Commute"},{v:"waterfront-access", l:"Waterfront Access"},{v:"low-maintenance", l:"Low-Maintenance Living"},
    {v:"family", l:"Family Friendly"},{v:"nightlife", l:"Nightlife"},
  ]},
  {id:"region", label:"Where are you looking?", multi:false, options:[
    {v:"anywhere", l:"Anywhere in British Columbia"},{v:"lower-mainland", l:"Lower Mainland"},
    {v:"fraser-valley", l:"Fraser Valley"},{v:"okanagan", l:"Okanagan"},
    {v:"vancouver-island", l:"Vancouver Island"},{v:"kootenays", l:"Kootenays"},
    {v:"northern-bc", l:"Northern BC"},{v:"have-city", l:"I already have a city or region in mind"},
  ]},
];

export const WhereShouldYouLive = () => {
  const [step, setStep] = useState(-1); // -1 = intro, 0..4 = questions, 5 = results
  const [answers, setAnswers] = useState({lifestyle:null, home_type:null, budget:null, matters:[], region:null});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [compare, setCompare] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const fmt = n => (typeof n === "number" && n > 0) ? "$" + Math.round(n).toLocaleString() : "—";

  // Build a pre-filtered /listings URL from the quiz answers + a specific community.
  // Maps budget → price_min / price_max and home_type → property_type using the
  // exact facet values that /listings expects (see Listings component filters).
  const listingsLinkFor = (community) => {
    const p = new URLSearchParams();
    p.set("city", community.name);
    const budgetMap = {
      "under-500":  { max: 500000 },
      "500-750":    { min: 500000, max: 750000 },
      "750-1m":     { min: 750000, max: 1000000 },
      "1m-2m":      { min: 1000000, max: 2000000 },
      "over-2m":    { min: 2000000 },
    };
    const b = budgetMap[answers.budget];
    if (b?.min) p.set("price_min", String(b.min));
    if (b?.max) p.set("price_max", String(b.max));
    const propMap = {
      "condo":     "Condo",
      "townhome":  "Townhouse",
      "detached":  "Detached",
      "acreage":   "Acreage",
      // "luxury" isn't a listings facet — the price filter carries that signal
    };
    if (propMap[answers.home_type]) p.set("property_type", propMap[answers.home_type]);
    // For luxury preference, nudge the floor price up to $2M when no explicit budget was set
    if (answers.home_type === "luxury" && !b?.min) p.set("price_min", "2000000");
    return `/listings?${p.toString()}`;
  };
  const pick = (q, v) => {
    if (q.multi) {
      const cur = answers[q.id] || [];
      const next = cur.includes(v) ? cur.filter(x=>x!==v) : [...cur, v];
      setAnswers({...answers, [q.id]: next});
    } else {
      const nextAnswers = {...answers, [q.id]: v};
      setAnswers(nextAnswers);
      // Last question (step 4, region): don't auto-advance — user must click
      // "Show my matches →" so submit() runs. Otherwise auto-advance to next Q.
      if (step < 4) {
        setTimeout(()=>setStep(step+1), 250);
      }
    }
  };
  const submit = async () => {
    setLoading(true);
    try {
      const r = await axios.post(`${API}/community-match`, answers);
      setResults(r.data);
      setStep(5);
      trackConversion("community_match_completed", { region: answers.region || "any", home_type: answers.home_type || "any", lifestyle: answers.lifestyle || "any", match_count: (r.data?.matches || []).length });
    } catch { setResults({matches:[], disclaimer:"Something went wrong. Please try again."}); setStep(5); }
    finally { setLoading(false); }
  };
  const toggleCompare = (m) => {
    if (compare.find(c => c.slug === m.slug)) setCompare(compare.filter(c => c.slug !== m.slug));
    else if (compare.length < 5) setCompare([...compare, m]);
  };
  const reset = () => { setStep(-1); setAnswers({lifestyle:null, home_type:null, budget:null, matters:[], region:null}); setResults(null); setCompare([]); setShowCompare(false); };

  return (
    <section className="section" id="where-should-you-live" data-testid="where-should-you-live" style={{background:"linear-gradient(135deg, rgba(15,42,91,0.03), rgba(212,175,55,0.05))",scrollMarginTop:"90px"}}>
      <div className="container-x" style={{maxWidth:"52rem"}}>
        <div style={{textAlign:"center",marginBottom:"1.75rem"}}>
          <div className="eyebrow" style={{color:"var(--brand-gold)"}}>📍 Community Finder</div>
          <h2 className="section-title" style={{margin:"0.4rem 0 0.6rem"}}>Where should you live?</h2>
          <p className="section-sub">Here are 5 quick questions to help you explore communities that may fit your lifestyle.</p>
        </div>

        {step === -1 && (
          <div style={{textAlign:"center"}}>
            <button className="btn btn-primary" onClick={()=>setStep(0)} data-testid="wsyl-start" style={{padding:"0.85rem 2rem",fontSize:"1rem"}}>Start the 5-question quiz →</button>
            <div style={{marginTop:"0.75rem",fontSize:"0.78rem",color:"var(--muted)"}}>Anonymous · Takes ~60 seconds · No email required</div>
          </div>
        )}

        {step >= 0 && step <= 4 && (() => {
          const q = WSYL_QUESTIONS[step];
          const val = answers[q.id];
          const chosen = q.multi ? (val || []) : val;
          return (
            <div className="paper" style={{padding:"1.75rem 1.5rem"}} data-testid={`wsyl-q-${q.id}`}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",fontSize:"0.78rem",color:"var(--muted)"}}>
                <span>Question {step+1} of 5</span>
                <div style={{display:"flex",gap:"0.25rem"}}>{[0,1,2,3,4].map(i => <div key={i} style={{width:20,height:4,borderRadius:2,background: i <= step ? "var(--brand-blue)" : "rgba(15,42,91,0.15)"}}/>)}</div>
              </div>
              <h3 style={{fontFamily:"Georgia,serif",fontSize:"1.35rem",margin:"0 0 1.25rem",color:"var(--brand-navy)"}}>{q.label}</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"0.55rem"}}>
                {q.options.map(o => {
                  const selected = q.multi ? chosen.includes(o.v) : chosen === o.v;
                  return (
                    <button key={o.v} type="button" onClick={()=>pick(q,o.v)} data-testid={`wsyl-opt-${q.id}-${o.v}`} style={{padding:"0.75rem 0.9rem",borderRadius:10,border:`2px solid ${selected ? "var(--brand-blue)" : "rgba(15,42,91,0.15)"}`,background:selected ? "rgba(14,165,233,0.08)" : "#fff",cursor:"pointer",textAlign:"left",fontWeight:selected ? 600 : 500,color:"var(--brand-navy)",fontSize:"0.9rem",transition:"all 0.15s"}}>
                      {selected && "✓ "}{o.l}
                    </button>
                  );
                })}
              </div>
              <div style={{marginTop:"1.5rem",display:"flex",justifyContent:"space-between",gap:"0.5rem"}}>
                <button className="btn btn-ghost" onClick={()=>step>0 ? setStep(step-1) : setStep(-1)} data-testid="wsyl-back">← Back</button>
                {q.multi ? (
                  <button className="btn btn-primary" onClick={()=>step===4 ? submit() : setStep(step+1)} data-testid="wsyl-next" disabled={q.multi && chosen.length===0}>Next →</button>
                ) : step===4 ? (
                  <button className="btn btn-primary" onClick={submit} disabled={!chosen || loading} data-testid="wsyl-submit">{loading ? "Finding matches…" : "Show my matches →"}</button>
                ) : null}
              </div>
            </div>
          );
        })()}

        {step === 5 && results && (
          <div data-testid="wsyl-results">
            {/* BCFSA-safe disclaimer at top */}
            <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderLeft:"4px solid #F59E0B",padding:"0.85rem 1.15rem",borderRadius:8,marginBottom:"1.5rem",fontSize:"0.85rem",color:"#78350F"}}>
              <strong>⚠️ Suggested, not recommended.</strong> {results.disclaimer}
            </div>
            {/* Market-reality banner: shown when we couldn't find matches for the
                exact filter combo. Tells the user the ranking has been relaxed
                and what changed — critical UX for zero-inventory scenarios like
                "detached under $500K anywhere in BC" where the market has zero
                current supply. */}
            {results.fallback_message && (
              <div data-testid="wsyl-fallback-banner" style={{background:"#DBEAFE",border:"1px solid #93C5FD",borderLeft:"4px solid #2563EB",padding:"0.9rem 1.15rem",borderRadius:8,marginBottom:"1.5rem",fontSize:"0.88rem",color:"#1E3A8A",fontFamily:"Inter,sans-serif",lineHeight:1.55}}>
                <strong>Market update:</strong> {results.fallback_message}
              </div>
            )}
            {results.matches.length === 0 ? (
              <div className="paper" style={{padding:"1.5rem",textAlign:"center"}}>
                <p style={{margin:"0 0 1rem"}}>No perfect matches for that combination. Try broadening your criteria.</p>
                <button className="btn btn-primary" onClick={reset} data-testid="wsyl-retry">Start over</button>
              </div>
            ) : (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
                  <div style={{fontSize:"0.85rem",color:"var(--muted)"}}>{results.matches.length} suggestion{results.matches.length===1?"":"s"} based on your answers</div>
                  <div style={{display:"flex",gap:"0.4rem"}}>
                    {compare.length >= 2 && <button className="btn btn-primary" onClick={()=>setShowCompare(true)} data-testid="wsyl-compare-btn" style={{fontSize:"0.82rem",padding:"0.4rem 0.9rem"}}>Compare {compare.length} communities →</button>}
                    <button className="btn btn-ghost" onClick={reset} data-testid="wsyl-reset" style={{fontSize:"0.82rem",padding:"0.4rem 0.9rem"}}>↻ Start over</button>
                  </div>
                </div>
                {/* Helper hint above the community cards */}
                <div data-testid="wsyl-compare-hint" style={{fontSize:"0.82rem",color:"var(--muted)",marginBottom:"0.85rem",fontFamily:"Inter,sans-serif",background:"#F3F6FD",padding:"0.6rem 0.9rem",borderRadius:8,borderLeft:"3px solid var(--brand-blue)"}}>
                  💡 Tap <strong>+ Add to compare</strong> on any 2–5 community cards below, then hit the sticky <strong>Compare</strong> bar at the bottom of your screen for a side-by-side view.
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
                  {results.matches.map(m => {
                    const inCompare = compare.find(c => c.slug === m.slug);
                    return (
                      <div key={m.slug} className="paper" style={{padding:"1.25rem 1.4rem",borderLeft:`4px solid ${inCompare ? "#F59E0B" : "var(--brand-blue)"}`}} data-testid={`wsyl-match-${m.slug}`}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem",flexWrap:"wrap"}}>
                          <div style={{flex:"1 1 250px"}}>
                            <h3 style={{fontFamily:"Georgia,serif",fontSize:"1.3rem",margin:"0 0 0.2rem",color:"var(--brand-navy)"}}>{m.name}</h3>
                            <div style={{fontSize:"0.78rem",color:"var(--muted)",marginBottom:"0.75rem"}}>{m.region}</div>
                            <div style={{marginBottom:"0.85rem"}}>
                              <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--brand-gold)",fontWeight:700,marginBottom:"0.3rem"}}>Why it matches</div>
                              <ul style={{margin:0,paddingLeft:"1.1rem",fontSize:"0.88rem",color:"#111",lineHeight:1.6}}>
                                {m.reasons.map((r,i) => <li key={i}>{r.replace(/\*\*/g,"")}</li>)}
                              </ul>
                            </div>
                            <div style={{fontSize:"0.85rem",color:"#333",lineHeight:1.5,marginBottom:"0.5rem"}}><strong>Community vibe:</strong> {m.synopsis}{m.synopsis.length >= 300 ? "…" : ""}</div>
                            <div style={{fontSize:"0.85rem",color:"#333"}}><strong>Average price range:</strong> {m.median_price ? `Median list price ${fmt(m.median_price)} · ${m.active_count} active listings` : "Data not currently available"}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:"0.5rem",marginTop:"1rem",flexWrap:"wrap"}}>
                          <Link to={`/community/${m.slug}`} className="btn btn-primary" data-testid={`wsyl-view-community-${m.slug}`} style={{fontSize:"0.85rem",padding:"0.5rem 1rem"}}>View community →</Link>
                          <Link to={listingsLinkFor(m)} className="btn btn-ghost" data-testid={`wsyl-view-listings-${m.slug}`} style={{fontSize:"0.85rem",padding:"0.5rem 1rem"}}>View matching listings →</Link>
                          <button type="button" className="btn btn-ghost" onClick={()=>toggleCompare(m)} disabled={!inCompare && compare.length >= 5} data-testid={`wsyl-compare-${m.slug}`} style={{fontSize:"0.85rem",padding:"0.5rem 1rem",borderColor: inCompare ? "#F59E0B" : undefined, color: inCompare ? "#F59E0B" : undefined, opacity: (!inCompare && compare.length >= 5) ? 0.45 : 1, cursor: (!inCompare && compare.length >= 5) ? "not-allowed" : "pointer"}}>{inCompare ? "✓ In compare" : (compare.length >= 5 ? "Max 5 reached" : "+ Add to compare")}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Sticky compare bar — appears at the bottom of the viewport as soon as
            the user adds their first community. Removes the "did I actually add
            anything?" ambiguity and puts the Compare CTA in easy reach. */}
        {step === 5 && compare.length > 0 && (
          <div data-testid="wsyl-sticky-bar" style={{position:"fixed",bottom:"1rem",left:"50%",transform:"translateX(-50%)",zIndex:150,background:"var(--brand-navy)",color:"#fff",padding:"0.85rem 1.25rem",borderRadius:"999px",boxShadow:"0 12px 30px rgba(15,42,91,0.35)",display:"flex",gap:"1rem",alignItems:"center",fontFamily:"Inter,sans-serif",maxWidth:"90vw",flexWrap:"wrap",justifyContent:"center"}}>
            <span style={{fontSize:"0.88rem",fontWeight:600}}>
              {compare.length === 1
                ? "1 community selected — add 1 more to compare"
                : `${compare.length} of 5 selected · ${compare.map(c=>c.name).join(", ")}`}
            </span>
            {compare.length >= 2 && (
              <button onClick={()=>setShowCompare(true)} data-testid="wsyl-sticky-compare-btn" style={{background:"var(--brand-gold, #F5A623)",color:"var(--brand-navy)",border:"none",padding:"0.5rem 1.1rem",borderRadius:"999px",fontWeight:700,cursor:"pointer",fontSize:"0.88rem",whiteSpace:"nowrap"}}>Compare side-by-side →</button>
            )}
            <button onClick={()=>setCompare([])} data-testid="wsyl-sticky-clear-btn" title="Clear selection" style={{background:"transparent",color:"#fff",border:"1px solid rgba(255,255,255,0.35)",padding:"0.4rem 0.7rem",borderRadius:"999px",fontSize:"0.78rem",cursor:"pointer"}}>Clear</button>
          </div>
        )}

        {showCompare && compare.length >= 2 && (
          <div onClick={()=>setShowCompare(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}} data-testid="wsyl-compare-modal">
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",maxWidth:1100,width:"100%",maxHeight:"90vh",overflow:"auto",borderRadius:12,padding:"1.5rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                <h3 style={{margin:0,fontFamily:"Georgia,serif"}}>Compare communities ({compare.length})</h3>
                <button className="btn btn-ghost" onClick={()=>setShowCompare(false)} data-testid="wsyl-compare-close">Close</button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.85rem"}}>
                  <thead>
                    <tr>
                      <th style={{padding:"0.6rem",textAlign:"left",borderBottom:"2px solid var(--brand-navy)",width:"140px"}}></th>
                      {compare.map(c => <th key={c.slug} style={{padding:"0.6rem",textAlign:"left",borderBottom:"2px solid var(--brand-navy)",fontFamily:"Georgia,serif",color:"var(--brand-navy)"}}>{c.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style={{padding:"0.6rem",fontWeight:600,verticalAlign:"top",background:"#F9FAFB"}}>Region</td>{compare.map(c => <td key={c.slug} style={{padding:"0.6rem",verticalAlign:"top",borderBottom:"1px solid #E5E7EB"}}>{c.region}</td>)}</tr>
                    <tr><td style={{padding:"0.6rem",fontWeight:600,verticalAlign:"top",background:"#F9FAFB"}}>Median list price</td>{compare.map(c => <td key={c.slug} style={{padding:"0.6rem",verticalAlign:"top",borderBottom:"1px solid #E5E7EB",fontFamily:"Sora,sans-serif",fontWeight:600}}>{fmt(c.median_price)}</td>)}</tr>
                    <tr><td style={{padding:"0.6rem",fontWeight:600,verticalAlign:"top",background:"#F9FAFB"}}>Active listings</td>{compare.map(c => <td key={c.slug} style={{padding:"0.6rem",verticalAlign:"top",borderBottom:"1px solid #E5E7EB"}}>{c.active_count}</td>)}</tr>
                    <tr><td style={{padding:"0.6rem",fontWeight:600,verticalAlign:"top",background:"#F9FAFB"}}>Why it matched</td>{compare.map(c => <td key={c.slug} style={{padding:"0.6rem",verticalAlign:"top",borderBottom:"1px solid #E5E7EB"}}><ul style={{margin:0,paddingLeft:"1rem"}}>{c.reasons.map((r,i)=><li key={i}>{r.replace(/\*\*/g,"")}</li>)}</ul></td>)}</tr>
                    <tr><td style={{padding:"0.6rem",fontWeight:600,verticalAlign:"top",background:"#F9FAFB"}}>Vibe</td>{compare.map(c => <td key={c.slug} style={{padding:"0.6rem",verticalAlign:"top",borderBottom:"1px solid #E5E7EB",lineHeight:1.4}}>{c.synopsis.slice(0,200)}…</td>)}</tr>
                    <tr><td style={{padding:"0.6rem",fontWeight:600,verticalAlign:"top",background:"#F9FAFB"}}>Explore</td>{compare.map(c => <td key={c.slug} style={{padding:"0.6rem",verticalAlign:"top",borderBottom:"1px solid #E5E7EB"}}><Link to={`/community/${c.slug}`} style={{color:"var(--brand-blue)",fontWeight:600,display:"block",marginBottom:"0.35rem"}}>View community →</Link><Link to={listingsLinkFor(c)} style={{color:"var(--brand-blue)",fontWeight:600}}>View matching listings →</Link></td>)}</tr>
                  </tbody>
                </table>
              </div>
              <div style={{marginTop:"1rem",fontSize:"0.75rem",color:"var(--muted)",fontStyle:"italic"}}>Data from MLS® active listings via CREA DDF® feed. Median values are snapshots — not opinions of value.</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// --- HOME ---
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

// =============== PERSONALIZED HOMEPAGE MODULE ===============
// Shows returning visitors a tailored top-of-page module with:
//   1. New listings matching their last search
//   2. Their saved favorites (with ❗ if any dropped in price since favorited)
//   3. A "continue exploring [community]" link
//   4. A "since your last visit" market delta widget for their last-viewed community
//
// COMPLIANCE:
//   • PIPA: All personalization data lives in localStorage on the user's OWN device.
//     Server never learns who they are or what they've saved. Anonymous API calls
//     (public /api/listings + /api/community/:slug/stats) — same data everyone
//     gets. localStorage already covered under the "session" cookie category which
//     the user has already consented to via the PIPA cookie banner.
//   • CASL: Not applicable — no electronic messaging involved.
//   • BCFSA: Purely factual content — listing cards + community stats. No opinions
//     of value, no AI-generated recommendations.
const _hasPersonalization = () => {
  try {
    // Respect the "session" cookie category — if user turned off Personalization
    // in the cookie preferences, do not display the personalized module even if
    // legacy localStorage entries exist.
    const rawPrefs = localStorage.getItem("ez_cookie_prefs");
    if (rawPrefs) {
      const p = JSON.parse(rawPrefs);
      if (p && p.session === false) return false;
    }
    return !!(localStorage.getItem("ez_last_search") ||
              localStorage.getItem("ez_favorites") ||
              localStorage.getItem("ez_last_community"));
  } catch { return false; }
};

const PersonalizedHome = () => {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("ez_personalized_dismissed") === "1");
  const [lastSearchListings, setLastSearchListings] = useState([]);
  const [favListings, setFavListings] = useState([]);
  const [lastCommunity, setLastCommunity] = useState(null);
  const [lastSearchMeta, setLastSearchMeta] = useState(null);
  const [communityDelta, setCommunityDelta] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    if (!_hasPersonalization()) return;
    setVisible(true);

    // Load last search meta + matching listings (up to 3, newest first)
    try {
      const ls = JSON.parse(localStorage.getItem("ez_last_search") || "null");
      if (ls && ls.filters) {
        setLastSearchMeta(ls);
        const params = { ...ls.filters, limit: 3, sort: "newest", offset: 0 };
        axios.get(`${API}/listings`, { params }).then(r => setLastSearchListings((r.data && r.data.listings) || [])).catch(() => {});
      }
    } catch {}

    // Load favorites — hydrate cards + compute price-drop signals
    try {
      const favs = JSON.parse(localStorage.getItem("ez_favorites") || "[]");
      if (favs.length > 0) {
        axios.get(`${API}/listings/by-keys`, { params: { keys: favs.slice(0, 6).join(",") } }).then(r => {
          const items = (r.data && r.data.listings) || [];
          const prices = _readFavPrices();
          const enriched = items.map(x => {
            const seen = prices[x.listing_key];
            const first = seen && seen.first_seen_price;
            const dropped = first && x.list_price && x.list_price < first;
            return { ...x, first_seen_price: first, price_dropped: !!dropped };
          });
          // Sort: price drops first, then most recently favorited
          enriched.sort((a, b) => (b.price_dropped ? 1 : 0) - (a.price_dropped ? 1 : 0));
          setFavListings(enriched.slice(0, 2));
        }).catch(() => {});
      }
    } catch {}

    // Load last community + compute market delta since first visit
    try {
      const lc = JSON.parse(localStorage.getItem("ez_last_community") || "null");
      if (lc && lc.slug) {
        setLastCommunity(lc);
        axios.get(`${API}/community/${lc.slug}/stats`, {timeout: 12000}).then(r => {
          const current = r.data || {};
          const first = lc.first_median_price;
          if (first && current.median_price) {
            const delta_pct = ((current.median_price - first) / first) * 100;
            setCommunityDelta({
              current_median: current.median_price,
              first_median: first,
              current_count: current.count,
              delta_pct: delta_pct,
              first_at: lc.first_at,
            });
          }
        }).catch(() => {});
      }
    } catch {}
  }, [dismissed]);

  const dismiss = () => {
    localStorage.setItem("ez_personalized_dismissed", "1");
    setDismissed(true); setVisible(false);
  };
  const resetPersonalization = () => {
    if (!window.confirm("This will clear your saved searches, favorites, and recently-viewed communities from this browser. Continue?")) return;
    ["ez_favorites","ez_fav_prices","ez_last_search","ez_last_community","ez_personalized_dismissed"].forEach(k => localStorage.removeItem(k));
    setVisible(false);
    window.dispatchEvent(new CustomEvent("ez-favorites-changed", { detail: [] }));
  };
  const fmt = (n) => (typeof n === "number" && n > 0) ? "$" + Math.round(n).toLocaleString() : "—";
  const fmtSince = (iso) => {
    if (!iso) return "recently";
    try {
      const d = new Date(iso);
      const days = Math.round((Date.now() - d.getTime()) / 86400000);
      if (days <= 0) return "today";
      if (days === 1) return "yesterday";
      if (days < 7) return `${days} days ago`;
      if (days < 30) return `${Math.round(days / 7)} weeks ago`;
      return `${Math.round(days / 30)} months ago`;
    } catch { return "recently"; }
  };

  if (!visible) return null;

  const hasAny = lastSearchListings.length > 0 || favListings.length > 0 || lastCommunity || communityDelta;
  if (!hasAny) return null;

  return (
    <section data-testid="personalized-home" style={{background:"linear-gradient(135deg, rgba(212,175,55,0.08), rgba(15,42,91,0.04))",borderTop:"1px solid rgba(15,42,91,0.08)",borderBottom:"1px solid rgba(15,42,91,0.08)",padding:"2.5rem 0",marginBottom:"1rem"}}>
      <div className="container">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem",flexWrap:"wrap",marginBottom:"1.5rem"}}>
          <div>
            <div className="eyebrow" style={{color:"var(--brand-gold)"}}>Welcome back</div>
            <h2 className="font-display" style={{fontSize:"1.8rem",margin:"0.15rem 0 0",color:"var(--brand-navy)"}}>Picking up where you left off</h2>
          </div>
          <button onClick={dismiss} data-testid="personalized-dismiss" title="Hide this section" style={{background:"transparent",border:"1px solid rgba(15,42,91,0.2)",borderRadius:999,padding:"0.4rem 0.9rem",fontSize:"0.78rem",cursor:"pointer",color:"var(--muted)"}}>Hide</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.25rem"}}>

          {/* --- Last search matches --- */}
          {lastSearchListings.length > 0 && (
            <div className="paper" style={{padding:"1.25rem"}} data-testid="personalized-last-search">
              <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--brand-blue)",fontWeight:700,marginBottom:"0.5rem"}}>📍 New for your search</div>
              <div style={{fontSize:"0.85rem",color:"var(--muted)",marginBottom:"0.75rem"}}>Since {fmtSince(lastSearchMeta?.at)}, {lastSearchListings.length} listing{lastSearchListings.length !== 1 ? "s" : ""} matched.</div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                {lastSearchListings.map(l => (
                  <Link key={l.listing_key} to={`/listing/${l.listing_key}`} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"0.75rem",padding:"0.55rem 0.75rem",background:"#fff",borderRadius:8,textDecoration:"none",color:"inherit",border:"1px solid rgba(15,42,91,0.08)"}} data-testid={`personalized-search-${l.listing_key}`}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:"0.85rem",fontWeight:600,color:"var(--brand-navy)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.street_address}</div>
                      <div style={{fontSize:"0.72rem",color:"var(--muted)"}}>{l.city} · {l.beds} bed · {l.baths} bath</div>
                    </div>
                    <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,color:"var(--brand-navy)",fontSize:"0.9rem"}}>{fmt(l.list_price)}</div>
                  </Link>
                ))}
              </div>
              <Link to={`/listings?${new URLSearchParams(Object.fromEntries(Object.entries(lastSearchMeta?.filters || {}).filter(([_,v]) => v))).toString()}`} style={{display:"inline-block",marginTop:"0.9rem",fontSize:"0.85rem",fontWeight:600,color:"var(--brand-blue)"}} data-testid="personalized-search-view-all">See all matches →</Link>
            </div>
          )}

          {/* --- Favorites --- */}
          {favListings.length > 0 && (
            <div className="paper" style={{padding:"1.25rem"}} data-testid="personalized-favorites">
              <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",color:"#DC2626",fontWeight:700,marginBottom:"0.5rem"}}>❤️ Your favorites</div>
              <div style={{fontSize:"0.85rem",color:"var(--muted)",marginBottom:"0.75rem"}}>Saved listings on this device.</div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                {favListings.map(l => (
                  <Link key={l.listing_key} to={`/listing/${l.listing_key}`} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"0.75rem",padding:"0.55rem 0.75rem",background:"#fff",borderRadius:8,textDecoration:"none",color:"inherit",border:l.price_dropped ? "1px solid #F59E0B" : "1px solid rgba(15,42,91,0.08)"}} data-testid={`personalized-fav-${l.listing_key}`}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:"0.85rem",fontWeight:600,color:"var(--brand-navy)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.street_address}</div>
                      <div style={{fontSize:"0.72rem",color:"var(--muted)"}}>{l.city} · {l.beds} bed · {l.baths} bath</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,color:"var(--brand-navy)",fontSize:"0.9rem"}}>{fmt(l.list_price)}</div>
                      {l.price_dropped && (<div style={{fontSize:"0.68rem",color:"#F59E0B",fontWeight:700,marginTop:"0.1rem"}}>❗ Price drop from {fmt(l.first_seen_price)}</div>)}
                    </div>
                  </Link>
                ))}
              </div>
              <Link to="/favorites" style={{display:"inline-block",marginTop:"0.9rem",fontSize:"0.85rem",fontWeight:600,color:"var(--brand-blue)"}} data-testid="personalized-fav-view-all">View all favorites →</Link>
            </div>
          )}

          {/* --- Market delta for last community --- */}
          {communityDelta && lastCommunity && (
            <div className="paper" style={{padding:"1.25rem"}} data-testid="personalized-community-delta">
              <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--brand-gold)",fontWeight:700,marginBottom:"0.5rem"}}>📊 Since your last visit</div>
              <div style={{fontSize:"0.85rem",color:"var(--muted)",marginBottom:"0.75rem"}}>{lastCommunity.name} market · first viewed {fmtSince(communityDelta.first_at)}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:"0.5rem",marginBottom:"0.4rem"}}>
                <div style={{fontFamily:"Sora,sans-serif",fontSize:"1.8rem",fontWeight:700,color:"var(--brand-navy)"}}>{fmt(communityDelta.current_median)}</div>
                <div style={{fontSize:"0.85rem",fontWeight:700,color: communityDelta.delta_pct >= 0 ? "#16A34A" : "#DC2626"}}>
                  {communityDelta.delta_pct >= 0 ? "▲" : "▼"} {Math.abs(communityDelta.delta_pct).toFixed(1)}%
                </div>
              </div>
              <div style={{fontSize:"0.78rem",color:"var(--muted)"}}>Current median list price · {communityDelta.current_count} active</div>
              <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:"0.5rem",fontStyle:"italic"}}>Median list price, active MLS® listings. Not an opinion of value.</div>
              <Link to={`/community/${lastCommunity.slug}`} style={{display:"inline-block",marginTop:"0.9rem",fontSize:"0.85rem",fontWeight:600,color:"var(--brand-blue)"}} data-testid="personalized-community-link">Continue exploring {lastCommunity.name} →</Link>
            </div>
          )}
        </div>

        <div style={{marginTop:"1.5rem",fontSize:"0.75rem",color:"var(--muted)",textAlign:"center"}}>
          Personalized from data on this device only — never sent to our servers.{" "}
          <a href="#" onClick={(e)=>{e.preventDefault(); resetPersonalization();}} style={{color:"var(--brand-blue)",fontWeight:600}} data-testid="personalized-reset">Not you? Clear my browser data →</a>
        </div>
      </div>
    </section>
  );
};

const DOOGIE_ONBOARDING_SCRIPTS = {
  all: "Hi, I'm Doogie — your BC real estate helper. Search anywhere in British Columbia, ask me about listings, terms, or neighbourhoods, take a virtual tour, or book a free consultation with Doug LeMaire, REALTOR®. Everything I share is general information only — not advice.",
  buyer: "Hi, I'm Doogie — your BC real estate helper. Looking to buy? Try searching a neighbourhood like Kitsilano or Whistler, take a virtual tour of active listings, ask me about mortgages, closing costs, or the Property Transfer Tax, or book a free consultation with Doug. General information only — not advice.",
  seller: "Hi, I'm Doogie — your BC real estate helper. Thinking of selling? Ask me for a market snapshot on your neighbourhood, get a general home valuation range, understand the seller journey step-by-step, or book a free consultation with Doug LeMaire, REALTOR®. General information only — not advice.",
};
// Backwards-compat pointer used by any older imports:
const DOOGIE_ONBOARDING_SCRIPT = DOOGIE_ONBOARDING_SCRIPTS.all;

// Shared TTS helper used by both the hero greeting card and the onboarding
// modal. Fetches the MP3 blob from /api/doogie/tts and plays it. Returns the
// <audio> element so callers can stop it if the user dismisses mid-play.
const _playDoogieTTS = async (text, onEnded) => {
  try {
    const r = await fetch(`${API}/doogie/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 3800), voice: "ash" }),
    });
    if (!r.ok) return null;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    a.onended = () => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } onEnded && onEnded(); };
    await a.play();
    return a;
  } catch { return null; }
};

// ── Hero greeting card — small, friendly, invites first-time visitors ──
const DoogieHeroGreeting = () => {
  const [speaking, setSpeaking] = useState(false);
  // Remember the user's mode choice (buyer / seller / all) across mounts so
  // the hero and onboarding stay in sync and later revisits use the same script.
  const [mode, setMode] = useState(() => {
    try { return (localStorage.getItem("ez_doogie_mode") || "all"); }
    catch { return "all"; }
  });
  const audioRef = useRef(null);
  useEffect(() => () => { if (audioRef.current) { try { audioRef.current.pause(); } catch { /* ignore */ } } }, []);
  const pickMode = (m) => {
    setMode(m);
    try { localStorage.setItem("ez_doogie_mode", m); } catch { /* ignore */ }
  };
  const toggle = async () => {
    if (speaking && audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.src = ""; } catch { /* ignore */ }
      audioRef.current = null;
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const script = DOOGIE_ONBOARDING_SCRIPTS[mode] || DOOGIE_ONBOARDING_SCRIPTS.all;
    audioRef.current = await _playDoogieTTS(script, () => setSpeaking(false));
    if (!audioRef.current) setSpeaking(false);
  };
  const pillStyle = (m) => ({
    padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
    border: mode === m ? "1.5px solid var(--brand-navy)" : "1.5px solid rgba(15,42,91,0.15)",
    background: mode === m ? "var(--brand-navy)" : "#fff",
    color: mode === m ? "#fff" : "var(--brand-navy)",
    cursor: "pointer", letterSpacing: 0.3,
  });
  return (
    <div
      data-testid="home-doogie-hero-greeting"
      style={{
        display: "flex", alignItems: "center", gap: "0.85rem",
        background: "linear-gradient(135deg, #FFF8E8 0%, #FFF3D6 100%)",
        border: "1.5px solid #F5D28A", borderRadius: 14,
        padding: "0.75rem 0.9rem", marginBottom: "1.25rem",
        boxShadow: "0 6px 18px rgba(15,42,91,0.08)",
        flexWrap: "wrap",
      }}
    >
      <img
        src={DOOGIE_THINKING} alt="Doogie the AI helper"
        style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid #FDB813", background: "#fff", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 700, color: "var(--brand-navy)", fontSize: "1rem", lineHeight: 1.25 }}>
          Hi, I'm Doogie <span aria-hidden>🐾</span>
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--ink)", marginTop: 2, lineHeight: 1.4 }}>
          Ask me anything about BC real estate, or search for a listing below.
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }} role="radiogroup" aria-label="I'm here to">
          <button type="button" role="radio" aria-checked={mode === "all"} onClick={() => pickMode("all")} style={pillStyle("all")} data-testid="hero-mode-all">Just exploring</button>
          <button type="button" role="radio" aria-checked={mode === "buyer"} onClick={() => pickMode("buyer")} style={pillStyle("buyer")} data-testid="hero-mode-buyer">Buying</button>
          <button type="button" role="radio" aria-checked={mode === "seller"} onClick={() => pickMode("seller")} style={pillStyle("seller")} data-testid="hero-mode-seller">Selling</button>
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        data-testid="home-doogie-hero-play"
        aria-pressed={speaking}
        aria-label={speaking ? "Stop Doogie's introduction" : "Play Doogie's 15-second introduction"}
        style={{
          flexShrink: 0, background: speaking ? "#DC2626" : "var(--brand-navy)",
          color: "#fff", border: "none", borderRadius: 999,
          padding: "0.55rem 0.95rem", fontWeight: 700, fontSize: "0.82rem",
          cursor: "pointer", whiteSpace: "nowrap",
          display: "inline-flex", alignItems: "center", gap: 6,
          boxShadow: "0 4px 12px rgba(15,42,91,0.25)",
        }}
      >
        {speaking ? "◼ Stop" : "▶ Hear intro"}
      </button>
    </div>
  );
};

// ── First-visit onboarding modal ──
// Shown once per browser. Big Play button (user gesture) plays the 15-second
// Doogie greeting. Skip / dismiss also stores the flag so we don't nag users.
// Buyer / Seller mode selection triggers the REALTOR® ethics qualifier —
// mandated by BCFSA: Doug cannot interfere with an existing REALTOR®-client
// relationship, so if the visitor already has one we surface a polite decline
// and end the funnel cleanly.
const DOOGIE_WELCOME_FACE = "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/5tqc5w5t_Doogie%20Headshot.jpeg";
const DoogieOnboarding = () => {
  const [visible, setVisible] = useState(() => {
    try { return typeof localStorage !== "undefined" && localStorage.getItem("ez_onboarding_done") !== "1"; }
    catch { return false; }
  });
  const [speaking, setSpeaking] = useState(false);
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem("ez_doogie_mode") || "all"; }
    catch { return "all"; }
  });
  // Ethics qualifier state: null = not asked yet, "yes" = has REALTOR® (polite
  // decline path), "no" = free to work with a REALTOR® (continue).
  const [ethics, setEthics] = useState(() => {
    try { return localStorage.getItem("ez_realtor_ethics") || null; }
    catch { return null; }
  });
  const audioRef = useRef(null);
  const nav = useNavigate();
  useEffect(() => () => { if (audioRef.current) { try { audioRef.current.pause(); } catch { /* ignore */ } } }, []);
  const pickMode = (m) => {
    setMode(m);
    try { localStorage.setItem("ez_doogie_mode", m); } catch { /* ignore */ }
    // Reset the ethics answer whenever mode changes so we always ask again
    // when the user switches between Buying/Selling. "Just exploring" skips it.
    setEthics(null);
    try { localStorage.removeItem("ez_realtor_ethics"); } catch { /* ignore */ }
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.src = ""; } catch { /* ignore */ }
      audioRef.current = null;
      setSpeaking(false);
    }
  };
  const pickEthics = (e) => {
    setEthics(e);
    try { localStorage.setItem("ez_realtor_ethics", e); } catch { /* ignore */ }
  };
  const dismiss = () => {
    try { localStorage.setItem("ez_onboarding_done", "1"); } catch { /* ignore */ }
    if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.src = ""; } catch { /* ignore */ } audioRef.current = null; }
    setVisible(false);
  };
  const play = async () => {
    setSpeaking(true);
    const script = DOOGIE_ONBOARDING_SCRIPTS[mode] || DOOGIE_ONBOARDING_SCRIPTS.all;
    audioRef.current = await _playDoogieTTS(script, () => setSpeaking(false));
    if (!audioRef.current) setSpeaking(false);
  };
  const startTour = () => {
    dismiss();
    nav(`/visual-agent-demo?kiosk=1&mode=${encodeURIComponent(mode)}`);
  };
  const pillStyle = (m) => ({
    padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
    border: mode === m ? "1.5px solid var(--brand-navy)" : "1.5px solid rgba(15,42,91,0.15)",
    background: mode === m ? "var(--brand-navy)" : "#fff",
    color: mode === m ? "#fff" : "var(--brand-navy)",
    cursor: "pointer", letterSpacing: 0.3,
  });
  if (!visible) return null;
  // New flow: ask REALTOR® ethics FIRST. If they already have a REALTOR® we
  // show the polite decline and stop. Only after "No" do we show the mode
  // picker (buyer / seller / just exploring) + Play + Tour CTAs.
  const showEthicsFirst = ethics === null;
  const showPoliteDecline = ethics === "yes";
  const showMainFlow = ethics === "no";
  return (
    <div
      data-testid="home-onboarding-modal"
      role="dialog" aria-modal="true" aria-labelledby="onboarding-title"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(15,42,91,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, maxWidth: 480, width: "100%",
          padding: "2rem 1.75rem 1.5rem", textAlign: "center", position: "relative",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
        }}
      >
        <button
          type="button" onClick={dismiss}
          data-testid="home-onboarding-close"
          aria-label="Close welcome"
          style={{
            position: "absolute", top: 12, right: 12, background: "transparent",
            border: "none", cursor: "pointer", fontSize: 22, color: "#6B7280", lineHeight: 1,
          }}
        >×</button>
        <img
          src={DOOGIE_WELCOME_FACE} alt="Doogie mascot"
          style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "3px solid #FDB813", background: "#FFF8E8", margin: "0 auto 0.75rem" }}
        />
        <h2 id="onboarding-title" style={{
          fontSize: "1.35rem", fontWeight: 700, color: "var(--brand-navy)",
          margin: "0 0 0.4rem", fontFamily: "'Playfair Display', serif",
        }}>Welcome — I'm Doogie <span aria-hidden>🐾</span></h2>

        {/* ── Step 1: REALTOR® ethics qualifier (BCFSA-mandated, asked FIRST) */}
        {showEthicsFirst && (
          <>
            <p style={{ fontSize: "0.9rem", color: "var(--ink)", lineHeight: 1.5, margin: "0 0 0.8rem" }}>
              Before we start — a quick question so I know how best to help.
            </p>
            <div data-testid="onboarding-ethics" style={{
              background: "#FFF8E8", border: "1px solid #F5D28A", borderRadius: 12,
              padding: "0.9rem 0.85rem", marginBottom: "1rem", textAlign: "left",
            }}>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--brand-navy)", marginBottom: 10 }}>
                Are you already working with a REALTOR<sup style={{fontSize:9}}>®</sup>?
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => pickEthics("yes")}
                  data-testid="onboarding-ethics-yes"
                  style={{
                    padding: "0.75rem 0.9rem", borderRadius: 10,
                    border: "1.5px solid rgba(15,42,91,0.2)", background: "#fff",
                    color: "var(--brand-navy)", fontWeight: 700, fontSize: "0.88rem",
                    cursor: "pointer", textAlign: "left",
                  }}
                >Yes — I already have a REALTOR<sup style={{fontSize:8}}>®</sup></button>
                <button
                  type="button"
                  onClick={() => pickEthics("no")}
                  data-testid="onboarding-ethics-no"
                  style={{
                    padding: "0.75rem 0.9rem", borderRadius: 10,
                    border: "1.5px solid rgba(22,163,74,0.4)", background: "#F0FDF4",
                    color: "#166534", fontWeight: 700, fontSize: "0.88rem",
                    cursor: "pointer", textAlign: "left",
                  }}
                >No — I am free to work with a REALTOR<sup style={{fontSize:8}}>®</sup></button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 2A: Polite decline (Yes path) */}
        {showPoliteDecline && (
          <div data-testid="onboarding-polite-decline" style={{
            background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 12,
            padding: "0.9rem 0.85rem", marginBottom: "1rem", textAlign: "left",
            fontSize: "0.9rem", lineHeight: 1.55, color: "var(--brand-navy)",
          }}>
            <div style={{ fontSize: "0.78rem", color: "#4B5563", marginBottom: 8, lineHeight: 1.55, fontStyle: "italic" }}>
              The REALTOR<sup style={{fontSize:8}}>®</sup> Code of Ethics asks Doug not to interfere with an existing agent relationship.
            </div>
            That's wonderful — please continue working with your REALTOR<sup style={{fontSize:8}}>®</sup>.{" "}
            <span aria-hidden>🐾</span> You're welcome to explore EZtoFind.ca for
            general BC real estate information, but Doug won't reach out or
            solicit your business. If your representation ever changes,
            you can always come back and we'll be here.
          </div>
        )}

        {/* ── Step 2B: Mode picker + Play + Tour (No path) */}
        {showMainFlow && (
          <>
            <p style={{ fontSize: "0.9rem", color: "var(--ink)", lineHeight: 1.5, margin: "0 0 0.8rem" }}>
              Are you buying or selling? I'll tailor a 15-second tour just for you.
            </p>
            <div
              data-testid="home-onboarding-mode-picker"
              style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: "1rem" }}
              role="radiogroup" aria-label="I'm here to"
            >
              <button type="button" role="radio" aria-checked={mode === "buyer"} onClick={() => pickMode("buyer")} style={pillStyle("buyer")} data-testid="onboarding-mode-buyer">I'm buying</button>
              <button type="button" role="radio" aria-checked={mode === "seller"} onClick={() => pickMode("seller")} style={pillStyle("seller")} data-testid="onboarding-mode-seller">I'm selling</button>
              <button type="button" role="radio" aria-checked={mode === "all"} onClick={() => pickMode("all")} style={pillStyle("all")} data-testid="onboarding-mode-all">Just exploring</button>
            </div>
          </>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          {showMainFlow && (
            <button
              type="button"
              onClick={play}
              data-testid="home-onboarding-play"
              aria-pressed={speaking}
              style={{
                background: speaking ? "#DC2626" : "var(--brand-navy)", color: "#fff",
                border: "none", borderRadius: 999, padding: "0.85rem 1.15rem",
                fontWeight: 700, fontSize: "0.98rem", cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {speaking ? "◼ Stop intro" : `▶ Hear Doogie's 15-second ${mode === "all" ? "" : mode + " "}intro`}
            </button>
          )}
          {showMainFlow && (
            <button
              type="button"
              onClick={startTour}
              data-testid="home-onboarding-tour"
              style={{
                background: "#16A34A", color: "#fff",
                border: "none", borderRadius: 999, padding: "0.85rem 1.15rem",
                fontWeight: 700, fontSize: "0.98rem", cursor: "pointer",
              }}
            >
              Start hands-free kiosk tour →
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            data-testid="home-onboarding-skip"
            style={{
              background: "transparent", color: "#6B7280",
              border: "none", padding: "0.5rem", fontWeight: 600, fontSize: "0.85rem",
              cursor: "pointer", textDecoration: "underline",
            }}
          >
            {showPoliteDecline ? "Close" : "Skip — I'll explore on my own"}
          </button>
        </div>
        <p style={{ fontSize: "0.7rem", color: "#9CA3AF", marginTop: "1rem", lineHeight: 1.5 }}>
          Doogie shares general information only — not legal, tax, or property-specific advice.
        </p>
      </div>
    </div>
  );
};

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
    // If the query looks like a listing search (natural language), always route to /listings
    // so the MLS filter extractor can parse it. This wins over community-name suggestions
    // because typing "4 bedroom homes in Whistler" should surface listings, not the community page.
    if (query && looksLikeListingSearch(q)) {
      return nav(`/listings?q=${encodeURIComponent(q.trim())}`);
    }
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
    <SEO
      title="EZtoFind.ca — BC Real Estate Information, Glossary & Community Insights"
      description="Free BC real estate information platform: 396 glossary terms with authoritative sources, 239 community profiles with real Environment Canada climate data, and BC-wide REALTOR® referral network. By Doug LeMaire, REALTOR®."
      path="/"
    />
    <Helmet>
      <script type="application/ld+json">{JSON.stringify({
        "@context":"https://schema.org","@type":"WebSite",
        "name":"EZtoFind.ca","url":"https://eztofind.ca","inLanguage":"en-CA",
        "publisher":{"@type":"Organization","name":"EZtoFind.ca","url":"https://eztofind.ca"},
        "potentialAction":{"@type":"SearchAction","target":"https://eztofind.ca/listings?q={search_term_string}","query-input":"required name=search_term_string"}
      })}</script>
      <script type="application/ld+json">{JSON.stringify({
        "@context":"https://schema.org","@type":"RealEstateAgent",
        "name":"Doug LeMaire, REALTOR®",
        "image":"https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg",
        "url":"https://eztofind.ca/about",
        "worksFor":{"@type":"Organization","name":"Fraser Property Management Realty Services Ltd."},
        "areaServed":[
          {"@type":"AdministrativeArea","name":"Greater Vancouver, British Columbia"},
          {"@type":"AdministrativeArea","name":"Fraser Valley, British Columbia"},
          {"@type":"AdministrativeArea","name":"Sea-to-Sky Corridor, British Columbia"}
        ],
        "memberOf":[
          {"@type":"Organization","name":"Canadian Real Estate Association (CREA)"},
          {"@type":"Organization","name":"Greater Vancouver REALTORS® (GVR)"},
          {"@type":"Organization","name":"BC Financial Services Authority (BCFSA)"}
        ],
        "knowsAbout":["Detached homes","Luxury real estate","Equestrian and acreage properties","Residential strata's","Probate and estate sales"],
        "inLanguage":"en-CA",
        // sameAs — canonical cross-platform identity graph. Tells Google,
        // Bing, Perplexity, ChatGPT, and Claude that all of these profiles
        // point to the same real-world entity (Doug LeMaire / EZtoFind).
        // Single strongest E-E-A-T signal short of editorial backlinks.
        "sameAs":[
          "https://maps.app.goo.gl/u8Fx3yDnSCyPUmGr9",
          "https://ez2find.ca"
        ]
      })}</script>
      <script type="application/ld+json">{JSON.stringify({
        "@context":"https://schema.org","@type":"Organization",
        "name":"EZtoFind.ca","url":"https://eztofind.ca","inLanguage":"en-CA",
        "logo":"https://eztofind.ca/images/doogie-laptop.png",
        "founder":{"@type":"Person","name":"Doug LeMaire, REALTOR®"},
        "areaServed":{"@type":"AdministrativeArea","name":"British Columbia, Canada"},
        "description":"AI-powered British Columbia real estate research platform with 396 glossary terms, 239 community profiles, live Environment Canada climate data, and a BC-wide REALTOR® referral network.",
        "sameAs":[
          "https://maps.app.goo.gl/u8Fx3yDnSCyPUmGr9",
          "https://ez2find.ca"
        ]
      })}</script>
    </Helmet>
    <PersonalizedHome/>
    <ComingSoonHero mode="home"/>

    {/* ── First-visit onboarding modal (voice-guided) ────────────────────────
        Shown once per browser (localStorage flag `ez_onboarding_done`). Big
        Play button ties audio playback to a user gesture so Chrome/Safari
        autoplay policy is respected. Users can also skip / dismiss. */}
    <DoogieOnboarding/>

    <section className="hero"><div className="container-x hero-grid">
      <div>
        <div className="eyebrow">🏔️ British Columbia</div>

        <h1><span className="accent" style={{color:"#16A34A",fontFamily:"'Avenir Next','Manrope',sans-serif",fontWeight:600,fontStyle:"normal"}}>Real estate</span><span style={{color:"#000080",fontFamily:"'Avenir Next','Manrope',sans-serif",fontWeight:600}}>,</span><br/><span style={{color:"#000080",fontFamily:"'Avenir Next','Manrope',sans-serif",fontWeight:600}}>made </span><span className="brand-blue" style={{color:"#0EA5E9",fontFamily:"'TeX Gyre Heros','Helvetica Neue',Helvetica,Arial,sans-serif",fontWeight:700}}>EZ to Find</span><span className="green" style={{color:"#FDB813",fontFamily:"'TeX Gyre Heros','Helvetica Neue',Helvetica,Arial,sans-serif",fontWeight:700}}>.ca</span></h1>
        <p className="lead">EZtoFind.ca is a free real estate information platform for anyone considering buying or selling residential real estate in British Columbia now or in the future.</p>
        <p className="lead" style={{marginTop:"1.25rem",fontSize:"1.65rem",fontWeight:700,color:"var(--brand-navy)",lineHeight:1.2,fontFamily:"'Playfair Display', serif"}}>
          <Link to="/" data-testid="home-meet-doogie-link" style={{color:"inherit",textDecoration:"none"}}
            onMouseOver={e=>e.currentTarget.style.opacity="0.85"}
            onMouseOut={e=>e.currentTarget.style.opacity="1"}
            title="Home — EZtoFind.ca">
            Meet <span style={{color:"#FDB813",fontStyle:"italic"}}>Doogie</span> — your BC real estate helper
          </Link>
        </p>
        <p className="lead" style={{marginTop:"0.5rem"}}>Ask about active BC listings, neighborhoods, or real estate terms. Doogie provides general information only, never advice.</p>
        <p className="lead" style={{marginTop:"1rem"}}>Real Estate services are provided by Doug LeMaire, REALTOR® of Fraser Property Management Realty Services Ltd. — He is a BCFSA-licensed real estate professional who specializes in detached homes, luxury properties, equestrian &amp; acreage estates, estate sales/probate, and residential strata's. His primary practice areas are: Greater Vancouver, Fraser Valley &amp; the Sea-to-Sky Corridor of BC.</p>
        {/* Hero search bar retired — the Visual Agent embedded below is now
            the single unified entry point for search, chat, voice, and tours. */}
        <div style={{marginTop:"1.5rem",display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          {[
            {label:"Detached",     slug:"detached"},
            {label:"Luxury",       slug:"luxury"},
            {label:"Equestrian",   slug:"equestrian"},
            {label:"Condos",       slug:"condos"},
            {label:"Townhomes",    slug:"townhomes"},
          ].map(s => (
            <Link key={s.slug} to={`/specialties/${s.slug}`} className="pill"
              data-testid={`home-specialty-pill-${s.slug}`}
              style={{textDecoration:"none",cursor:"pointer"}}>{s.label}</Link>
          ))}
        </div>
      </div>
      <div className="doogie-hero-wrap" style={{textAlign:"center",overflow:"visible"}}>
        <img className="doogie-hero-img" src={DOOGIE_MAGNIFY} alt="Doogie mascot" style={{width:"100%",filter:"drop-shadow(0 20px 40px rgba(15,42,91,0.2))"}}/>
      </div>
    </div></section>

    {/* ── Visual Agent embedded on the homepage ──────────────────────────────
        Below the licensing paragraph. Gives visitors the full unified Doogie
        experience (search, chat, voice, tours, insights, consultation) without
        having to click through to /visual-agent-demo. */}
    <section data-testid="home-visual-agent-embed" style={{background:"#F5F8FF",padding:"0 0 2rem"}}>
      <VisualAgentDemo/>
    </section>

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

    <WhereShouldYouLive/>

    <FeaturedListing/>

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
          {icon:"🛡️",title:"Licensed REALTOR®",sub:"BCFSA License #167790"},
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
// ============================================================
// CREA DDF® — MLS® LISTINGS (compliance-first scaffold)
// ============================================================

// Terms-of-use click-wrap gate. Consumer must accept CREA DDF® Terms of Use
// before viewing listing content. Acceptance stored in localStorage + logged
// server-side (tamper-evident: IP + UA + timestamp).
const MLS_POLICY_VERSION = "1.0";
const MLS_ACCEPT_KEY = "eztofind_mls_terms_v" + MLS_POLICY_VERSION;
const TermsGate = ({ children }) => {
  const [accepted, setAccepted] = useState(() => localStorage.getItem(MLS_ACCEPT_KEY) === "yes");
  const nav = useNavigate();
  const accept = async () => {
    localStorage.setItem(MLS_ACCEPT_KEY, "yes");
    setAccepted(true);
    try {
      await axios.post(`${API}/listings/consent`, {
        accepted: true,
        policy_version: MLS_POLICY_VERSION,
        session_id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      });
    } catch(e) { /* non-blocking */ }
  };
  const decline = () => {
    // Send them somewhere useful instead of the homepage they came from
    nav("/communities");
  };
  if (accepted) return children;
  return (
    <div data-testid="mls-terms-gate" style={{position:"fixed",inset:0,background:"rgba(15,42,91,0.75)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"1rem",fontFamily:"Inter,sans-serif"}}>
      <div style={{background:"#FDFCF8",maxWidth:520,width:"100%",borderRadius:16,padding:"2rem",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{textAlign:"center",marginBottom:"1rem"}}>
          <div style={{fontSize:"2.2rem",lineHeight:1}}>🏡</div>
          <div style={{fontFamily:"Sora,sans-serif",fontSize:"1.4rem",fontWeight:700,color:"var(--brand-navy)",marginTop:"0.75rem"}}>One-time welcome to our MLS® listings</div>
        </div>
        <div style={{fontSize:"0.95rem",lineHeight:1.6,color:"var(--ink)",marginBottom:"1.25rem"}}>
          <p style={{marginBottom:"0.75rem"}}>Before we show you live MLS® data, we're required by the Canadian Real Estate Association (CREA) to ask you to agree to a few common-sense terms:</p>
          <ul style={{paddingLeft:"1.25rem",marginBottom:"0.75rem"}}>
            <li style={{marginBottom:"0.35rem"}}>The listings are for your <strong>personal browsing</strong>, not for resale or scraping.</li>
            <li style={{marginBottom:"0.35rem"}}>Prices and availability can change — always verify with <strong>a REALTOR®</strong> before making an offer.</li>
            <li style={{marginBottom:"0.35rem"}}>MLS® and REALTOR® are CREA trademarks.</li>
          </ul>
          <p style={{fontSize:"0.82rem",color:"var(--muted)"}}><a href="https://www.crea.ca/legal/" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>Full CREA terms ↗</a> · <Link to="/privacy" style={{color:"var(--brand-blue)"}}>EZtoFind.ca privacy ↗</Link></p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
          <button className="btn btn-primary" onClick={accept} data-testid="mls-terms-accept" style={{background:"#16A34A",color:"#fff",fontSize:"1rem",padding:"0.85rem 1rem",fontWeight:700,border:"none"}}>✓ I Agree — Show Me the Listings</button>
          <button onClick={decline} data-testid="mls-terms-decline" style={{background:"transparent",color:"var(--muted)",border:"none",fontSize:"0.88rem",padding:"0.4rem",cursor:"pointer",textDecoration:"underline"}}>Not now — browse BC communities instead</button>
        </div>
        <div style={{marginTop:"1rem",padding:"0.6rem",background:"#F5F0E1",borderRadius:8,fontSize:"0.72rem",color:"var(--muted)",textAlign:"center"}}>
          Why am I seeing this? — CREA's rules require every website showing MLS® data to record your acceptance once per browser. You won't see this again.
        </div>
      </div>
    </div>
  );
};

// CREA-required compliance block. Rendered on every listing card + detail page.
// - Brokerage attribution and MLS® trademark line are mandatory per CREA DDF® Rules.
// - Listing agent line only shown when the feed actually provides one (blank on mock data).
const ListingCompliance = ({ listing, compact = false }) => {
  const realtorCa = listing.realtor_ca_url || `https://www.realtor.ca/real-estate/${listing.listing_key}`;
  return (
    <div style={{fontFamily:"Inter,sans-serif",fontSize:compact?"0.72rem":"0.78rem",color:"var(--muted)",lineHeight:1.5,marginTop:"0.5rem"}} data-testid="listing-compliance">
      <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.35rem"}}>
        <a href={realtorCa} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:90,height:90,background:"#EF3E42",color:"#fff",borderRadius:8,textDecoration:"none",fontFamily:"Sora,sans-serif",fontSize:"0.62rem",fontWeight:700,textAlign:"center",lineHeight:1.15,flexShrink:0}} data-testid="powered-by-realtor-ca" title="View on REALTOR.ca">
          <span>Powered by<br/>REALTOR<sup>®</sup>.ca</span>
        </a>
        <div style={{flex:1,minWidth:0}}>
          {listing.brokerage_name && <div style={{color:"var(--ink)",fontWeight:600,fontSize:compact?"0.78rem":"0.85rem"}}>Listing brokerage: {listing.brokerage_name}</div>}
          {listing.listing_agent && <div>Listing agent: {listing.listing_agent}</div>}
          {listing.mls_number && <div>MLS® #{listing.mls_number}{listing.days_on_market !== undefined ? ` · ${listing.days_on_market} days on market` : ""}</div>}
        </div>
      </div>
      <div style={{fontSize:"0.7rem",color:"var(--muted)",marginTop:"0.4rem"}}>
        MLS®, Multiple Listing Service®, and REALTOR® are trademarks owned by The Canadian Real Estate Association (CREA). Data © CREA DDF®. Doug LeMaire, REALTOR® is not the listing agent — verify all information directly with the listing brokerage before making an offer.
      </div>
    </div>
  );
};

// One listing card in the search grid.
const ListingCard = ({ listing }) => {
  const price = (listing.list_price || 0).toLocaleString("en-CA");
  const photo = (listing.photos && listing.photos[0]) || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200";
  return (
    <div style={{position:"relative"}}>
    <Link to={`/listing/${listing.listing_key}`} data-testid={`listing-card-${listing.listing_key}`} style={{textDecoration:"none",color:"inherit",display:"block",background:"white",borderRadius:12,overflow:"hidden",border:"1px solid rgba(15,42,91,0.12)",boxShadow:"0 4px 12px rgba(15,42,91,0.06)",transition:"transform 0.15s, box-shadow 0.15s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 10px 22px rgba(15,42,91,0.12)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 12px rgba(15,42,91,0.06)";}}
    >
      <div style={{position:"relative",aspectRatio:"4/3",overflow:"hidden",background:"#F5F0E1"}}>
        <img src={photo} alt={`${listing.street_address}, ${listing.city}`} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
        <div style={{position:"absolute",top:"0.75rem",left:"0.75rem",background:"var(--brand-navy)",color:"#fff",padding:"0.25rem 0.7rem",borderRadius:999,fontSize:"0.72rem",fontFamily:"Inter,sans-serif",fontWeight:600,letterSpacing:"0.03em"}}>{listing.property_type}</div>
      </div>
      <div style={{padding:"1rem 1.15rem 1.15rem"}}>
        <div style={{fontFamily:"Sora,sans-serif",fontSize:"1.35rem",fontWeight:700,color:"var(--brand-navy)"}}>${price}</div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.9rem",color:"var(--ink)",marginTop:"0.15rem"}}>{listing.street_address}</div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.82rem",color:"var(--muted)"}}>{listing.city}, BC · {listing.region}</div>
        <div style={{display:"flex",gap:"0.85rem",marginTop:"0.6rem",fontFamily:"Inter,sans-serif",fontSize:"0.85rem",color:"var(--ink)"}}>
          <span>🛏 {listing.beds}</span>
          <span>🛁 {listing.baths}{listing.half_baths ? `+${listing.half_baths}` : ""}</span>
          {listing.living_area_sqft && <span>📐 {listing.living_area_sqft.toLocaleString()} sqft</span>}
        </div>
        {listing.mls_number && <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.75rem",color:"var(--muted)",marginTop:"0.6rem",paddingTop:"0.55rem",borderTop:"1px solid rgba(15,42,91,0.08)"}}>MLS® #{listing.mls_number}</div>}
      </div>
    </Link>
    {/* Ask Doogie listing button removed per BCFSA compliance — Doogie cannot
        provide property-specific commentary. Buyers with questions about a
        specific listing should contact Doug directly or use the referral flow. */}
    <div style={{position:"absolute",top:"0.75rem",right:"0.75rem",zIndex:2}}>
      <FavoriteButton listingKey={listing.listing_key} currentPrice={listing.list_price} size="md"/>
    </div>
    </div>
  );
};

// Reusable "Refine your search" filter card used on specialty landing pages
// (Equestrian, Luxury, Detached, Condos, Townhomes). Self-contained: fetches
// its own community list + facets, keeps local state, and on submit navigates
// to /listings?... with any page-level defaults merged in.
//
// `defaults` — e.g. { price_min: 2000000 } for Equestrian, { property_type:
// "Detached", price_min: 3000000 } for Luxury/Detached tab. These values are
// carried through as hidden filters so /listings retains the specialty
// context (buyer stays within their price/type tier while adding city,
// beds, keyword, sort, etc.).
//
// `lockPropertyType` — if true, hides the Property Type dropdown (used on
// Detached/Condo/Townhomes pages where the type is inherent to the page).
const SpecialtyFilterPanel = ({ defaults = {}, lockPropertyType = false, excludeTypes = [], hideFields = [], title = "Filter Listings" }) => {
  const navigate = useNavigate();
  const [state, setState] = useState({
    city: "", property_type: defaults.property_type || "",
    beds_min: "", baths_min: "", price_max: "", q: "", sort: "newest",
  });
  const [facets, setFacets] = useState({});
  const [allComms, setAllComms] = useState([]);
  const [cityFocus, setCityFocus] = useState(false);

  useEffect(() => {
    axios.get(`${API}/listings/meta/facets`).then(r => setFacets(r.data)).catch(() => {});
    axios.get(`${API}/communities`).then(r => {
      const list = [];
      Object.entries(r.data || {}).forEach(([region, arr]) => arr.forEach(name => list.push({ name, region })));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setAllComms(list);
    }).catch(() => {});
  }, []);

  const set = (k, v) => setState(s => ({ ...s, [k]: v }));
  const cityQ = (state.city || "").trim().toLowerCase();
  const suggestions = !cityQ ? [] : (allComms || [])
    .filter(c => c.name.toLowerCase().includes(cityQ) && c.name.toLowerCase() !== cityQ)
    .slice(0, 8);

  const submit = (e) => {
    e.preventDefault();
    const merged = { ...defaults, ...Object.fromEntries(Object.entries(state).filter(([, v]) => v !== "" && v !== undefined && v !== null)) };
    // Ensure defaults survive (e.g., locked property_type on detached page)
    if (lockPropertyType && defaults.property_type) merged.property_type = defaults.property_type;
    const qs = new URLSearchParams(merged).toString();
    navigate(`/listings?${qs}`);
  };

  return (
    <form onSubmit={submit} className="paper" data-testid="specialty-filter-panel" style={{marginBottom:"1.75rem"}}>
      <div className="eyebrow" style={{marginBottom:"1rem"}}>{title}</div>
      <div className="field" style={{position:"relative"}}><label>Community / City</label>
        <input type="text" value={state.city} onChange={e=>set("city", e.target.value)}
          onFocus={()=>setCityFocus(true)} onBlur={()=>setTimeout(()=>setCityFocus(false), 200)}
          placeholder="Type any BC community (e.g. Whistler, Nelson, Kelowna)"
          data-testid="specialty-filter-city" autoComplete="off"/>
        {cityFocus && suggestions.length > 0 && (
          <div style={{position:"absolute",top:"100%",left:0,right:0,background:"white",border:"1px solid rgba(15,42,91,0.15)",borderRadius:10,marginTop:"0.25rem",boxShadow:"0 10px 24px rgba(15,42,91,0.12)",maxHeight:240,overflowY:"auto",zIndex:20}}>
            {suggestions.map(s => (
              <button key={`${s.name}-${s.region}`} type="button" onMouseDown={e=>{e.preventDefault(); set("city", s.name); setCityFocus(false);}}
                style={{display:"block",width:"100%",textAlign:"left",padding:"0.6rem 0.85rem",background:"transparent",border:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",borderBottom:"1px solid rgba(15,42,91,0.05)"}}
                onMouseEnter={e=>e.currentTarget.style.background="#F5F0E1"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{fontWeight:600,color:"var(--ink)"}}>{s.name}</div>
                <div style={{fontSize:"0.72rem",color:"var(--muted)"}}>{s.region}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      {!lockPropertyType && !hideFields.includes("property_type") && (
        <div className="field"><label>Property Type</label>
          <select value={state.property_type} onChange={e=>set("property_type", e.target.value)} data-testid="specialty-filter-type">
            <option value="">Any</option>
            {(facets.property_types||[]).filter(t => !excludeTypes.includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}
      {!(hideFields.includes("beds_min") && hideFields.includes("baths_min")) && (
      <div className="form-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
        {!hideFields.includes("beds_min") && (
        <div className="field"><label>Min beds</label>
          <select value={state.beds_min} onChange={e=>set("beds_min", e.target.value)} data-testid="specialty-filter-beds">
            <option value="">Any</option>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        )}
        {!hideFields.includes("baths_min") && (
        <div className="field"><label>Min baths</label>
          <select value={state.baths_min} onChange={e=>set("baths_min", e.target.value)} data-testid="specialty-filter-baths">
            <option value="">Any</option>{[1,2,3,4].map(n=><option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        )}
      </div>
      )}
      <div className="field"><label>Maximum price ($)</label>
        <input type="number" placeholder="Any" value={state.price_max} onChange={e=>set("price_max", e.target.value)} data-testid="specialty-filter-price-max"/>
      </div>
      <div className="field"><label>Keyword</label>
        <input placeholder="e.g. suite, waterfront" value={state.q} onChange={e=>set("q", e.target.value)} data-testid="specialty-filter-keyword"/>
      </div>
      <div className="field"><label>Sort by</label>
        <select value={state.sort} onChange={e=>set("sort", e.target.value)} data-testid="specialty-filter-sort">
          <option value="newest">Newest first</option>
          <option value="price_asc">Price — low to high</option>
          <option value="price_desc">Price — high to low</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary" style={{width:"100%",marginTop:"0.75rem"}} data-testid="specialty-filter-apply">Apply Filters</button>
    </form>
  );
};

// Search filter sidebar (used inside <Listings/>).
const ListingFilters = ({ filters, setFilters, facets, allComms, onSubmit }) => {
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const [cityFocus, setCityFocus] = useState(false);
  const cityQ = (filters.city || "").trim().toLowerCase();
  const suggestions = !cityQ ? [] : (allComms || [])
    .filter(c => c.name.toLowerCase().includes(cityQ) && c.name.toLowerCase() !== cityQ)
    .slice(0, 8);
  return (
    <form onSubmit={e=>{e.preventDefault(); onSubmit();}} className="paper" style={{position:"sticky",top:"1rem"}} data-testid="listings-filters">
      <div className="eyebrow" style={{marginBottom:"1rem"}}>Filter Listings</div>
      <div className="field" style={{position:"relative"}}><label>Community / City</label>
        <input
          type="text"
          value={filters.city || ""}
          onChange={e => set("city", e.target.value)}
          onFocus={() => setCityFocus(true)}
          onBlur={() => setTimeout(() => setCityFocus(false), 200)}
          placeholder="Type any BC community (e.g. Whistler, Nelson, Kelowna)"
          data-testid="filter-city"
          autoComplete="off"
        />
        {cityFocus && suggestions.length > 0 && (
          <div data-testid="filter-city-suggestions" style={{position:"absolute",top:"100%",left:0,right:0,background:"white",border:"1px solid rgba(15,42,91,0.15)",borderRadius:10,marginTop:"0.25rem",boxShadow:"0 10px 24px rgba(15,42,91,0.12)",maxHeight:240,overflowY:"auto",zIndex:20}}>
            {suggestions.map(s => (
              <button key={`${s.name}-${s.region}`} type="button" onMouseDown={e=>{e.preventDefault(); set("city", s.name); setCityFocus(false);}}
                data-testid={`city-suggestion-${slugify(s.name)}`}
                style={{display:"block",width:"100%",textAlign:"left",padding:"0.6rem 0.85rem",background:"transparent",border:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",borderBottom:"1px solid rgba(15,42,91,0.05)"}}
                onMouseEnter={e=>e.currentTarget.style.background="#F5F0E1"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{fontWeight:600,color:"var(--ink)"}}>{s.name}</div>
                <div style={{fontSize:"0.72rem",color:"var(--muted)"}}>{s.region}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="field"><label>Property Type</label>
        <select value={filters.property_type||""} onChange={e=>set("property_type", e.target.value)} data-testid="filter-type">
          <option value="">Any</option>
          {(facets.property_types||[]).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="form-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
        <div className="field"><label>Min beds</label>
          <select value={filters.beds_min||""} onChange={e=>set("beds_min", e.target.value)} data-testid="filter-beds">
            <option value="">Any</option>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <div className="field"><label>Min baths</label>
          <select value={filters.baths_min||""} onChange={e=>set("baths_min", e.target.value)} data-testid="filter-baths">
            <option value="">Any</option>{[1,2,3,4].map(n=><option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label>Maximum price ($)</label><input type="number" placeholder="Any" value={filters.price_max||""} onChange={e=>set("price_max", e.target.value)} data-testid="filter-price-max"/></div>
      <div className="field"><label>Keyword</label><input placeholder="e.g. suite, waterfront" value={filters.q||""} onChange={e=>set("q", e.target.value)} data-testid="filter-keyword"/></div>
      <div className="field"><label>Sort by</label>
        <select value={filters.sort||"newest"} onChange={e=>set("sort", e.target.value)} data-testid="filter-sort">
          <option value="newest">Newest first</option>
          <option value="price_asc">Price — low to high</option>
          <option value="price_desc">Price — high to low</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary" style={{width:"100%",marginTop:"0.75rem"}} data-testid="filter-apply">Apply Filters</button>
    </form>
  );
};

const Listings = () => {
  const [params] = useSearchParams();
  const rawQ = params.get("q") || "";
  const [alertOpen, setAlertOpen] = useState(false);
  const [filters, setFilters] = useState({
    q: rawQ,
    city: params.get("city") || params.get("community") || "",
    community: params.get("community") || "",
    region: params.get("region") || "",
    region_group: params.get("region_group") || "",
    property_type: params.get("property_type") || "",
    beds_min: params.get("beds_min") || "",
    beds_exact: params.get("beds_exact") || "",
    baths_min: params.get("baths_min") || "",
    baths_exact: params.get("baths_exact") || "",
    price_min: params.get("price_min") || "",
    price_max: params.get("price_max") || "",
    sort: params.get("sort") || "newest",
  });
  const [nlBanner, setNlBanner] = useState(null); // { original, extracted }
  const [clarify, setClarify] = useState(null);    // { prompt, options, original }
  const [results, setResults] = useState({ total: 0, listings: [], using_mock_data: false, compliance: {} });
  const [facets, setFacets] = useState({});
  const [allComms, setAllComms] = useState([]); // [{name, region}] — full BC list for typeahead
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 30;

  const runSearch = (overrideFilters) => {
    const f = overrideFilters || filters;
    setLoading(true);
    const qp = {};
    ["q","city","community","region","region_group","property_type","beds_min","beds_exact","baths_min","baths_exact","price_min","price_max","features","sort"].forEach(k => {
      if (f[k] !== "" && f[k] !== undefined && f[k] !== null) qp[k] = f[k];
    });
    qp.limit = PAGE_SIZE;
    qp.offset = 0;
    // Personalization: remember this search so returning visitors see it on the
    // homepage. Purely client-side — no user identifier or request made to persist.
    try {
      const meaningful = Object.keys(qp).some(k => !["limit","offset","sort"].includes(k));
      if (meaningful) {
        localStorage.setItem("ez_last_search", JSON.stringify({ filters: qp, at: new Date().toISOString() }));
      }
    } catch {}
    axios.get(`${API}/listings`, { params: qp })
      .then(r => setResults(r.data))
      .catch(() => setResults({total:0, listings:[]}))
      .finally(() => setLoading(false));
  };

  // Pagination: fetch the NEXT page and append its listings to the current
  // results. Reuses whatever filter values were on the last search — we
  // read them from the current `filters` state so any newly-applied filter
  // will have already caused a fresh runSearch() reset.
  const loadMore = () => {
    if (loadingMore || !results.listings) return;
    setLoadingMore(true);
    const qp = {};
    ["q","city","community","region","region_group","property_type","beds_min","beds_exact","baths_min","baths_exact","price_min","price_max","features","sort"].forEach(k => {
      if (filters[k] !== "" && filters[k] !== undefined && filters[k] !== null) qp[k] = filters[k];
    });
    qp.limit = PAGE_SIZE;
    qp.offset = results.listings.length;
    axios.get(`${API}/listings`, { params: qp })
      .then(r => setResults(prev => ({
        ...r.data,
        // Merge: keep prior listings, append new page, update total/count
        listings: [...(prev.listings || []), ...(r.data.listings || [])],
      })))
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => {
    axios.get(`${API}/listings/meta/facets`).then(r=>setFacets(r.data)).catch(()=>{});
    // Full BC communities list (244+) for the typeahead filter
    axios.get(`${API}/communities`).then(r => {
      const list = [];
      Object.entries(r.data || {}).forEach(([region, arr]) => arr.forEach(name => list.push({ name, region })));
      list.sort((a,b) => a.name.localeCompare(b.name));
      setAllComms(list);
    }).catch(()=>{});
  }, []);
  useEffect(() => {
    // If the URL ?q= contains a natural-language listing query, run it through the MLS extractor
    // and apply the parsed structured filters BEFORE searching. Otherwise plain search.
    if (rawQ && looksLikeListingSearch(rawQ)) {
      axios.post(`${API}/doogie/mls-search`, { message: rawQ })
        .then(r => {
          const d = r.data;
          if (d && d.needs_clarification) {
            // Ambiguous locality — show the user their options
            setClarify({ prompt: d.clarification_prompt, options: d.options, original: rawQ });
            return;
          }
          if (d && d.intent_matched && d.filters) {
            const parsed = {
              q: "",
              city: d.filters.city || "",
              community: "",
              property_type: d.filters.property_type || "",
              beds_min: d.filters.beds_min || "",
              beds_exact: d.filters.beds_exact ?? "",
              baths_min: d.filters.baths_min || "",
              baths_exact: d.filters.baths_exact ?? "",
              price_min: d.filters.price_min || "",
              price_max: d.filters.price_max || "",
              // Features from NL → comma-separated string for /api/listings
              features: Array.isArray(d.filters.features) ? d.filters.features.join(",") : (d.filters.keyword || ""),
              sort: d.filters.sort || "newest",
            };
            setFilters(parsed);
            setNlBanner({ original: rawQ, extracted: d.filters });
            runSearch(parsed);
          } else {
            runSearch(); // fallback: plain search with q= as text
          }
        })
        .catch(() => runSearch());
    } else {
      runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const load = () => { setNlBanner(null); runSearch(); };
  return (
    <TermsGate>
    <section className="section"><div className="container-x">
      <div style={{textAlign:"center",marginBottom:"2rem"}}>
        <div className="eyebrow">Live MLS® Listings</div>
        <h1 className="section-title">British Columbia Real Estate — Search MLS® Listings</h1>
        <p className="section-sub" style={{maxWidth:820,margin:"0 auto"}}>Search live MLS® listings across British Columbia. Prices and availability are updated every 4 hours direct from CREA.</p>
        {results.using_mock_data && (
          <div style={{background:"#FEF3C7",border:"1px solid #F59E0B",color:"#92400E",padding:"0.65rem 1rem",borderRadius:8,fontFamily:"Inter,sans-serif",fontSize:"0.85rem",display:"inline-block",marginTop:"0.75rem",fontWeight:600}} data-testid="mock-data-banner">
            🟡 DEMO MODE — Showing 15 sample listings. Live CREA DDF® feed will replace these once credentials are provisioned.
          </div>
        )}
        {nlBanner && (
          <div style={{background:"#DBEAFE",border:"1px solid #2563EB",color:"#1E3A8A",padding:"0.75rem 1.25rem",borderRadius:10,fontFamily:"Inter,sans-serif",fontSize:"0.9rem",marginTop:"0.75rem",maxWidth:720,margin:"0.75rem auto 0",textAlign:"left"}} data-testid="nl-banner">
            <div style={{fontWeight:700,marginBottom:"0.25rem"}}>🐾 Doogie parsed your search:</div>
            <div style={{fontSize:"0.82rem"}}>"{nlBanner.original}" → {Object.entries(nlBanner.extracted).filter(([_k,v])=>v).map(([k,v])=>`${k.replace(/_/g," ")}: ${v}`).join(" · ")}</div>
          </div>
        )}
        {clarify && (
          <div data-testid="clarify-card" style={{background:"#fff",border:"2px solid var(--brand-gold, #E0B84A)",color:"var(--brand-navy)",padding:"1.25rem 1.5rem",borderRadius:14,fontFamily:"Inter,sans-serif",marginTop:"1.25rem",maxWidth:640,margin:"1.25rem auto 0",textAlign:"left",boxShadow:"0 10px 30px rgba(15,42,91,0.08)"}}>
            <div style={{fontWeight:700,marginBottom:"0.4rem",fontSize:"1rem"}}>🐾 Quick clarification</div>
            <div style={{fontSize:"0.92rem",lineHeight:1.5,marginBottom:"0.85rem"}}>{clarify.prompt}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>
              {clarify.options.map((opt, i) => (
                <button key={i} data-testid={`clarify-option-${i}`} onClick={() => {
                  // Re-run search with an explicit, unambiguous query
                  const explicit = opt.hood
                    ? `${clarify.original.replace(/\b(the west end|west end|kits|kitsilano|yaletown|gastown|coal harbou?r|mount pleasant|point grey|kerrisdale|shaughnessy|dunbar|marpole|fairview|false creek|commercial drive|the drive|grandview|killarney|champlain|olympic village|downtown eastside|the dtes|poco|new west|north van|west van|the tri-cities|the coast|the corridor)\b/gi, "").trim()} in ${opt.city} in the ${opt.hood} neighborhood`.replace(/\s+/g, " ")
                    : clarify.original.replace(/\b(the tri-cities|poco|new west|north van|west van|the west end|west end|the coast|the corridor)\b/gi, opt.city);
                  setClarify(null);
                  // Fire another Doogie call with the explicit phrasing
                  axios.post(`${API}/doogie/mls-search`, { message: explicit }).then(r => {
                    const d = r.data;
                    if (d && d.intent_matched && d.filters && !d.needs_clarification) {
                      const parsed = {
                        q: "", city: d.filters.city || "", community: "",
                        property_type: d.filters.property_type || "",
                        beds_min: d.filters.beds_min || "", beds_exact: d.filters.beds_exact ?? "",
                        baths_min: d.filters.baths_min || "", baths_exact: d.filters.baths_exact ?? "",
                        price_min: d.filters.price_min || "", price_max: d.filters.price_max || "",
                        features: Array.isArray(d.filters.features) ? d.filters.features.join(",") : "",
                        sort: d.filters.sort || "newest",
                      };
                      setFilters(parsed);
                      setNlBanner({ original: explicit, extracted: d.filters });
                      runSearch(parsed);
                    }
                  }).catch(() => {});
                }} className="btn" style={{background:"var(--brand-navy)",color:"#fff",padding:"0.55rem 1.1rem",borderRadius:999,fontSize:"0.85rem",fontWeight:600,border:"none",cursor:"pointer"}}>
                  {opt.label}
                </button>
              ))}
              <button data-testid="clarify-cancel" onClick={() => setClarify(null)} className="btn" style={{background:"transparent",color:"var(--muted)",padding:"0.55rem 0.85rem",borderRadius:999,fontSize:"0.85rem",border:"1px solid rgba(0,0,0,0.15)",cursor:"pointer"}}>
                None of these — let me refine
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="listings-search-layout" style={{alignItems:"start"}}>
        <div><ListingFilters filters={filters} setFilters={setFilters} facets={facets} allComms={allComms} onSubmit={load}/></div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
            <div style={{fontFamily:"Inter,sans-serif",color:"var(--muted)"}} data-testid="listings-count">
              {loading ? "Searching…" : `${results.total} listing${results.total===1?"":"s"}${results.total>results.listings.length ? ` — showing ${results.listings.length}` : ""}`}
            </div>
            <button onClick={()=>setAlertOpen(true)} data-testid="get-alerts-btn" className="btn" style={{background:"#fff",color:"var(--brand-navy)",border:"1.5px solid var(--brand-navy)",padding:"0.5rem 1.1rem",fontSize:"0.88rem",borderRadius:999,display:"inline-flex",alignItems:"center",gap:"0.4rem",fontWeight:600}}>
              🔔 Get alerts for this search
            </button>
          </div>
          {results.listings.length === 0 && !loading && (
            <div className="paper" style={{textAlign:"center",padding:"3rem 1.5rem"}}>
              <div style={{fontSize:"3rem",marginBottom:"1rem"}}>🏡</div>
              <div style={{fontFamily:"Sora,sans-serif",fontSize:"1.2rem",fontWeight:700}}>No listings match your search</div>
              <div style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",marginTop:"0.5rem"}}>Try widening your filters, or <Link to="/referral-request" style={{color:"var(--brand-blue)"}}>request a referral</Link> if you're looking outside Doug's service area.</div>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:"1.25rem"}} data-testid="listings-grid">
            {results.listings.map(l => <ListingCard key={l.listing_key} listing={l}/>)}
          </div>
          {/* Load more — appears whenever there are un-fetched listings remaining */}
          {results.listings.length > 0 && results.total > results.listings.length && (
            <div style={{textAlign:"center",marginTop:"2rem"}} data-testid="load-more-container">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn btn-primary"
                data-testid="load-more-btn"
                style={{padding:"0.85rem 2rem",fontSize:"0.95rem",fontFamily:"Inter,sans-serif",fontWeight:600,minWidth:280}}
              >
                {loadingMore
                  ? "Loading…"
                  : `Show ${Math.min(PAGE_SIZE, results.total - results.listings.length)} more (${results.total - results.listings.length} remaining)`}
              </button>
              <div style={{marginTop:"0.5rem",fontSize:"0.8rem",color:"var(--muted)"}}>
                Showing {results.listings.length} of {results.total}
              </div>
            </div>
          )}
          {results.listings.length > 0 && results.total > 0 && results.total === results.listings.length && results.total > PAGE_SIZE && (
            <div style={{textAlign:"center",marginTop:"1.5rem",color:"var(--muted)",fontSize:"0.85rem",fontFamily:"Inter,sans-serif"}} data-testid="end-of-results">
              ✓ You've reached the end — {results.total} of {results.total} listings shown.
            </div>
          )}
        </div>
      </div>
      <div className="notice" style={{marginTop:"2rem"}}>
        {results.compliance?.trademark_notice || "MLS®, Multiple Listing Service®, and the associated logos are owned by The Canadian Real Estate Association (CREA). REALTOR® is a trademark of REALTOR® Canada Inc. Data © CREA DDF®."}
      </div>
      <SavedSearchModal open={alertOpen} onClose={()=>setAlertOpen(false)} currentFilters={filters}/>
    </div></section>
    </TermsGate>
  );
};

// Saved-search alert signup modal (CASL + PIPA double-opt-in).
// Rendered from the /listings page; captures the visitor's current filter state
// and requires both consent checkboxes before submission. Backend sends a
// verification email; nothing else is sent until the visitor clicks the link.
export const SavedSearchModal = ({ open, onClose, currentFilters }) => {
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [casl, setCasl] = useState(false);
  const [pipa, setPipa] = useState(false);
  const [optWelcome, setOptWelcome] = useState(false);
  const [optDormant, setOptDormant] = useState(false);
  const [optNews, setOptNews] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  if (!open) return null;
  const cleanFilters = Object.fromEntries(
    Object.entries(currentFilters || {}).filter(([k, v]) => v && k !== "q" && k !== "sort" && k !== "community")
  );
  const filterSummary = Object.entries(cleanFilters)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
    .join(" · ") || "all BC residential listings";
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email || !casl || !pipa) { setErr("Please enter your email and check both consent boxes."); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/saved-searches`, {
        email, label, filters: cleanFilters,
        casl_consent: casl, pipa_ack: pipa,
      });
      // Per-campaign CASL opt-ins. `buyer_digest` is the campaign for this saved
      // search; auto-opt-in because that IS the consent they just gave (checkbox
      // wording explicitly mentions listing-alert emails). The other campaigns
      // are separate, unchecked-by-default checkboxes below.
      const campaigns = ["buyer_digest"];
      if (optWelcome) campaigns.push("welcome_series");
      if (optDormant) campaigns.push("dormant_wakeup");
      if (optNews) campaigns.push("news_tips");
      try { await axios.post(`${API}/campaigns/opt-in`, { email, campaigns, opt_in_text: "Saved-search modal signup — I consent to receive listing-alert emails from EZtoFind.ca (CASL).", source: "saved_search_modal" }); } catch {}
      trackConversion("saved_search_created", { filter_count: Object.keys(cleanFilters).length, extra_campaigns: campaigns.length - 1 });
      setDone(true);
    } catch (x) {
      setErr(x?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };
  return (
    <div data-testid="saved-search-modal" style={{position:"fixed",inset:0,background:"rgba(15,42,91,0.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,maxWidth:520,width:"100%",padding:"2rem 1.75rem",fontFamily:"Inter,sans-serif",maxHeight:"92vh",overflowY:"auto",position:"relative"}}>
        <button onClick={onClose} data-testid="saved-search-close" aria-label="Close" style={{position:"absolute",top:12,right:14,background:"transparent",border:"none",fontSize:"1.4rem",cursor:"pointer",color:"var(--muted)"}}>×</button>
        {done ? (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"2.5rem"}}>📬</div>
            <h2 style={{fontFamily:"Georgia,serif",color:"var(--brand-navy)",margin:"0.5rem 0 0.75rem"}}>Check your inbox</h2>
            <p style={{color:"var(--muted)",lineHeight:1.6,fontSize:"0.95rem"}}>We just emailed <strong>{email}</strong> a one-click confirmation link. Under Canada's Anti-Spam Legislation (CASL) we can't send you listings until you confirm.</p>
            <p style={{color:"var(--muted)",lineHeight:1.6,fontSize:"0.85rem",marginTop:"1rem"}}>If it hasn't arrived in 5 minutes, check your spam folder — or drop us a line at <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a>.</p>
            <button onClick={onClose} className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="saved-search-success-close">Got it</button>
          </div>
        ) : (
          <>
            <div style={{fontSize:"0.72rem",letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--brand-green)",fontWeight:700}}>🔔 Alerts</div>
            <h2 style={{fontFamily:"Georgia,serif",color:"var(--brand-navy)",margin:"0.35rem 0 0.6rem",fontSize:"1.5rem",lineHeight:1.2}}>Get notified of new matching listings</h2>
            <p style={{color:"var(--muted)",fontSize:"0.92rem",lineHeight:1.55}}>We'll email you when new BC MLS® listings match: <strong style={{color:"var(--brand-navy)"}}>{filterSummary}</strong></p>
            <form onSubmit={submit} style={{marginTop:"1rem"}}>
              <div className="field"><label>Email address *</label>
                <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" data-testid="saved-search-email"/></div>
              <div className="field" style={{marginTop:"0.75rem"}}><label>Name this search <span style={{color:"var(--muted)",fontWeight:400}}>(optional)</span></label>
                <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Whistler dream condo" data-testid="saved-search-label"/></div>
              <div style={{background:"#F0F4FB",border:"1px solid rgba(15,42,91,0.15)",borderRadius:10,padding:"0.85rem 1rem",marginTop:"1rem",fontSize:"0.82rem",lineHeight:1.5,color:"var(--muted)"}}>
                <strong style={{color:"var(--brand-navy)"}}>Double opt-in:</strong> after you submit, we email a one-click confirmation link. Nothing else is sent until you confirm — and you can unsubscribe with one click from any email we send.
              </div>
              <div className="field" style={{marginTop:"0.85rem"}}><label className="check">
                <input required type="checkbox" checked={casl} onChange={e=>setCasl(e.target.checked)} data-testid="saved-search-casl"/>
                &nbsp;I consent to receive listing-alert emails from EZtoFind.ca (CASL). I can unsubscribe anytime.
              </label></div>
              <div className="field"><label className="check">
                <input required type="checkbox" checked={pipa} onChange={e=>setPipa(e.target.checked)} data-testid="saved-search-pipa"/>
                &nbsp;I acknowledge the <Link to="/privacy" style={{color:"var(--brand-blue)"}} target="_blank" rel="noopener">Privacy Policy (PIPA)</Link>.
              </label></div>
              {/* Optional per-campaign opt-ins — CASL requires separate consent per campaign. */}
              <div style={{marginTop:"0.85rem",background:"#FEFCE8",border:"1px solid #FDE68A",borderRadius:8,padding:"0.75rem 0.9rem"}}>
                <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.05em",color:"#78350F",fontWeight:700,marginBottom:"0.4rem"}}>Optional — separate consents</div>
                <label className="check" style={{fontSize:"0.85rem",display:"block",marginBottom:"0.35rem"}}><input type="checkbox" checked={optWelcome} onChange={e=>setOptWelcome(e.target.checked)} data-testid="opt-welcome-series"/>&nbsp;Send me the 3-part welcome series (intro to Doug + site tips)</label>
                <label className="check" style={{fontSize:"0.85rem",display:"block",marginBottom:"0.35rem"}}><input type="checkbox" checked={optDormant} onChange={e=>setOptDormant(e.target.checked)} data-testid="opt-dormant-wakeup"/>&nbsp;Nudge me if I go quiet — one market update after 30 days of inactivity</label>
                <label className="check" style={{fontSize:"0.85rem",display:"block"}}><input type="checkbox" checked={optNews} onChange={e=>setOptNews(e.target.checked)} data-testid="opt-news-tips"/>&nbsp;Occasional EZtoFind news + tips (new BC Glossary terms, community additions)</label>
              </div>
              {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"0.75rem",fontSize:"0.85rem"}} data-testid="saved-search-error">{err}</div>}
              <button type="submit" disabled={busy} className="btn btn-primary" style={{marginTop:"1rem",width:"100%",opacity:busy?0.6:1}} data-testid="saved-search-submit">{busy?"Sending…":"Send me the confirmation email"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// Full listing detail page — /listing/:key
// Doug's direct service area. Listings whose city is NOT in this set
// swap the "Book a Viewing" form for a "Request a Referral REALTOR®" pill
// (BCFSA compliance + monetization: Doug earns a 25% referral fee on the
// receiving REALTOR®'s closed commission).
//
// DDF-synced listings often have an empty `region` field, so we match by
// normalized city name. Variants like "Langley City" / "Langley Township"
// are all folded to "langley" and matched against this list.
const SERVICE_AREA_CITIES = new Set([
  // Greater Vancouver
  "anmore","belcarra","bowen island","burnaby","coquitlam","delta","ladner","tsawwassen",
  "langley","lions bay","maple ridge","new westminster","north vancouver","pitt meadows",
  "port coquitlam","port moody","richmond","surrey","university endowment lands",
  "vancouver","west vancouver","white rock",
  // Fraser Valley
  "abbotsford","boston bar","bridal falls","chilliwack","harrison hot springs","hope",
  "kent","mission","spuzzum","yale","agassiz",
  // Sea-to-Sky
  "britannia beach","furry creek","pemberton","squamish","whistler",
]);
const _normCity = (s) => (s || "")
  .toLowerCase()
  .trim()
  .replace(/\s+(city|township|district|municipality)$/,"")
  .replace(/^(city of|township of|district of)\s+/,"")
  .replace(/\s+/g," ");
const isInServiceArea = (listing) => {
  if (!listing) return false;
  return SERVICE_AREA_CITIES.has(_normCity(listing.city));
};

const ListingGallery = ({photos, address, photoIdx, setPhotoIdx}) => {
  const [lightbox, setLightbox] = useState(false);
  const thumbStripRef = React.useRef(null);
  const n = photos.length;

  const prev = React.useCallback(() => setPhotoIdx(i => (i - 1 + n) % n), [n, setPhotoIdx]);
  const next = React.useCallback(() => setPhotoIdx(i => (i + 1) % n), [n, setPhotoIdx]);

  // Keyboard nav — active whenever lightbox is open OR the page has focus and no input is focused
  useEffect(() => {
    if (n <= 1) return;
    const onKey = (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (["INPUT","TEXTAREA","SELECT"].includes(tag) && !lightbox) return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "Escape" && lightbox) setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n, lightbox, prev, next]);

  // Keep active thumbnail visible as user navigates
  useEffect(() => {
    if (!thumbStripRef.current) return;
    const el = thumbStripRef.current.querySelector(`[data-thumb-idx="${photoIdx}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({behavior:"smooth", block:"nearest", inline:"center"});
  }, [photoIdx]);

  if (n === 0) {
    return (
      <div style={{marginTop:"1rem",background:"#F5F0E1",borderRadius:14,overflow:"hidden",aspectRatio:"16/9",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",fontFamily:"Inter,sans-serif"}} data-testid="listing-no-photos">
        No photos available for this listing.
      </div>
    );
  }

  const arrowBtn = {
    position:"absolute", top:"50%", transform:"translateY(-50%)", width:44, height:44,
    borderRadius:"50%", border:"none", cursor:"pointer",
    background:"rgba(15,42,91,0.7)", color:"#fff", fontSize:"1.4rem", fontWeight:700,
    display:"flex", alignItems:"center", justifyContent:"center",
    backdropFilter:"blur(6px)", boxShadow:"0 4px 12px rgba(0,0,0,0.25)"
  };

  return (
    <>
      <div style={{marginTop:"1rem",background:"#F5F0E1",borderRadius:14,overflow:"hidden",aspectRatio:"16/9",position:"relative",cursor: n>0?"zoom-in":"default"}} data-testid="listing-hero-photo">
        <img src={photos[photoIdx]} alt={`${address} — photo ${photoIdx+1} of ${n}`} onClick={()=>setLightbox(true)} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
        {n > 1 && (
          <>
            <button onClick={prev} aria-label="Previous photo" data-testid="photo-prev" style={{...arrowBtn, left:"1rem"}}>‹</button>
            <button onClick={next} aria-label="Next photo" data-testid="photo-next" style={{...arrowBtn, right:"1rem"}}>›</button>
            <div style={{position:"absolute",bottom:"0.85rem",right:"0.85rem",background:"rgba(0,0,0,0.6)",color:"#fff",padding:"0.3rem 0.75rem",borderRadius:999,fontFamily:"Inter,sans-serif",fontSize:"0.8rem",fontWeight:600,backdropFilter:"blur(4px)"}} data-testid="photo-counter">
              {photoIdx + 1} / {n}
            </div>
          </>
        )}
        <button onClick={()=>setLightbox(true)} aria-label="View all photos" data-testid="photo-viewall" style={{position:"absolute",bottom:"0.85rem",left:"0.85rem",background:"rgba(255,255,255,0.95)",color:"var(--brand-navy)",padding:"0.35rem 0.85rem",borderRadius:999,fontFamily:"Inter,sans-serif",fontSize:"0.8rem",fontWeight:600,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.35rem"}}>
          <span aria-hidden="true">🖼</span> View all {n} photo{n>1?"s":""}
        </button>
      </div>

      {n > 1 && (
        <div ref={thumbStripRef} data-testid="photo-thumbstrip" style={{marginTop:"0.75rem",display:"flex",gap:"0.5rem",overflowX:"auto",padding:"0.25rem",scrollbarWidth:"thin"}}>
          {photos.map((p,i)=>(
            <button key={i} onClick={()=>setPhotoIdx(i)} data-thumb-idx={i} data-testid={`photo-thumb-${i}`}
              aria-label={`Show photo ${i+1}`} aria-pressed={i===photoIdx}
              style={{flex:"0 0 auto", width:110, height:70, padding:0, borderRadius:8, overflow:"hidden", cursor:"pointer",
                border:i===photoIdx?"3px solid var(--brand-gold)":"2px solid rgba(15,42,91,0.15)",
                background:"none", transition:"border-color 120ms"}}>
              <img src={p} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          onClick={(e)=>{if(e.target===e.currentTarget) setLightbox(false);}}
          data-testid="photo-lightbox"
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.94)",zIndex:10000,display:"flex",flexDirection:"column",padding:"1rem"}}
        >
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",color:"#fff",fontFamily:"Inter,sans-serif",padding:"0.25rem 0.5rem",flexShrink:0}}>
            <div style={{fontSize:"0.9rem",fontWeight:600}}>{photoIdx + 1} of {n} — {address}</div>
            <button onClick={()=>setLightbox(false)} aria-label="Close" data-testid="lightbox-close" style={{background:"none",border:"none",color:"#fff",fontSize:"2rem",cursor:"pointer",padding:"0 0.5rem",lineHeight:1}}>×</button>
          </div>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",minHeight:0}}>
            {n > 1 && <button onClick={prev} data-testid="lightbox-prev" aria-label="Previous" style={{...arrowBtn,left:"1rem",width:56,height:56,fontSize:"1.8rem",background:"rgba(255,255,255,0.15)"}}>‹</button>}
            <img src={photos[photoIdx]} alt={`${address} — photo ${photoIdx+1}`} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
            {n > 1 && <button onClick={next} data-testid="lightbox-next" aria-label="Next" style={{...arrowBtn,right:"1rem",width:56,height:56,fontSize:"1.8rem",background:"rgba(255,255,255,0.15)"}}>›</button>}
          </div>
          {n > 1 && (
            <div style={{display:"flex",gap:"0.35rem",overflowX:"auto",padding:"0.5rem 0",justifyContent:"center",flexWrap:"nowrap",flexShrink:0}}>
              {photos.map((p,i)=>(
                <button key={i} onClick={()=>setPhotoIdx(i)} aria-label={`Show photo ${i+1}`}
                  style={{flex:"0 0 auto",width:70,height:46,padding:0,borderRadius:6,overflow:"hidden",cursor:"pointer",
                    border:i===photoIdx?"3px solid var(--brand-gold)":"2px solid rgba(255,255,255,0.25)",background:"none"}}>
                  <img src={p} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

const ListingDetail = () => {
  const { key } = useParams();
  const [listing, setListing] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => {
    axios.get(`${API}/listings/${key}`).then(r => setListing(r.data)).catch(() => setNotFound(true));
  }, [key]);
  if (notFound) return <section className="section"><div className="container-x"><h1 className="section-title">Listing not found</h1><p><Link to="/listings" style={{color:"var(--brand-blue)"}}>← Back to all listings</Link></p></div></section>;
  if (!listing) return <section className="section"><div className="container-x"><div style={{padding:"3rem",textAlign:"center",fontFamily:"Inter,sans-serif",color:"var(--muted)"}}>Loading listing…</div></div></section>;
  const price = (listing.list_price || 0).toLocaleString("en-CA");
  const q = encodeURIComponent(`${listing.street_address}, ${listing.city}, BC, Canada`);
  return (
    <TermsGate>
    <section className="section"><div className="container-x">
      <Link to="/listings" data-testid="back-to-listings" style={{fontFamily:"Inter,sans-serif",color:"var(--brand-blue)",fontSize:"0.9rem"}}>← All listings</Link>
      {/* Photo gallery — big hero with arrows, counter, thumbnail strip, and click-to-fullscreen lightbox */}
      <ListingGallery photos={listing.photos||[]} address={listing.street_address||""} photoIdx={photoIdx} setPhotoIdx={setPhotoIdx}/>
      <div className="listing-detail-layout" style={{marginTop:"2rem",alignItems:"start"}}>
        {/* Main column */}
        <div>
          <div className="eyebrow">{listing.region} · {listing.city}</div>
          <div style={{display:"flex",gap:"0.75rem",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap"}}>
            <h1 className="section-title" style={{margin:"0.5rem 0",flex:"1 1 auto"}} data-testid="listing-address">{listing.street_address}</h1>
            <div style={{flexShrink:0,marginTop:"0.5rem"}}><FavoriteButton listingKey={listing.listing_key} currentPrice={listing.list_price} size="md"/></div>
          </div>
          <div style={{fontFamily:"Sora,sans-serif",fontSize:"2rem",fontWeight:700,color:"var(--brand-navy)"}} data-testid="listing-price">${price}</div>
          <ListingNarration listing={listing} onAdvancePhoto={setPhotoIdx} photoCount={(listing.photos || []).length}/>
          {/* Ask Doogie listing button removed per BCFSA compliance — Doogie
              cannot provide property-specific commentary. */}
          <div style={{display:"flex",gap:"1.5rem",marginTop:"0.75rem",fontFamily:"Inter,sans-serif",fontSize:"1rem",color:"var(--ink)",flexWrap:"wrap"}}>
            <span>🛏 {listing.beds} bed</span>
            <span>🛁 {listing.baths}{listing.half_baths ? ` + ${listing.half_baths}½` : ""} bath</span>
            {listing.living_area_sqft && <span>📐 {listing.living_area_sqft.toLocaleString()} sqft</span>}
            {listing.year_built && <span>🏗 Built {listing.year_built}</span>}
          </div>
          <h2 style={{fontSize:"1.35rem",marginTop:"2rem"}}>About This Property</h2>
          <p style={{fontFamily:"Inter,sans-serif",lineHeight:1.7,color:"var(--ink)"}} data-testid="listing-description">{listing.description}</p>
          {listing.virtual_tour_embed?.url && (
            <div style={{marginTop:"1.75rem"}} data-testid="listing-virtual-tour">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.6rem",marginBottom:"0.6rem"}}>
                <h2 style={{fontSize:"1.35rem",margin:0}}>Virtual Tour</h2>
                <a href={listing.virtual_tour_embed.url_raw || listing.virtual_tour_embed.url} target="_blank" rel="noopener noreferrer" data-testid="listing-virtual-tour-open"
                  style={{
                    display:"inline-flex",alignItems:"center",gap:6,
                    background:"var(--brand-blue)",color:"#fff",
                    fontFamily:"Inter,sans-serif",fontWeight:600,fontSize:"0.85rem",
                    padding:"0.55rem 1rem",borderRadius:999,textDecoration:"none",
                    boxShadow:"0 4px 10px rgba(15,42,91,0.22)",
                  }}
                >▶ Play full-screen ↗</a>
              </div>
              {/* Doogie voice-over pill — sits above the iframe so it's the
                  first thing the user sees when the tour section loads. */}
              <TourNarration listing={listing}/>
              <div style={{
                position:"relative", width:"100%", paddingBottom:"56.25%",
                borderRadius:12, overflow:"hidden", border:"1px solid rgba(15,42,91,0.15)",
                background:"#0F2A5B",
              }}>
                <iframe
                  title={`Virtual tour — ${listing.street_address || "listing"}`}
                  src={listing.virtual_tour_embed.url}
                  loading="lazy"
                  allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope; autoplay; encrypted-media"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  data-testid="listing-virtual-tour-iframe"
                  style={{position:"absolute", inset:0, width:"100%", height:"100%", border:0}}
                />
              </div>
              <div style={{marginTop:"0.5rem",fontFamily:"Inter,sans-serif",fontSize:"0.78rem",color:"var(--muted)",lineHeight:1.5}}>
                {listing.virtual_tour_embed.host === "matterport" ? "Matterport 3D walk-through" : listing.virtual_tour_embed.host === "youtube" ? "YouTube video tour" : "Vimeo video tour"}{listing.virtual_tour_embed.is_branded ? " · listing-brokerage branded" : " · unbranded"}.
                {" "}If the tour doesn't load above (some browsers block third-party embeds), tap <strong>Play full-screen</strong> to open it in a new tab.
              </div>
            </div>
          )}
          {listing.features?.length > 0 && (
            <div style={{marginTop:"1.5rem"}}>
              <h3 style={{fontSize:"1.1rem",marginBottom:"0.75rem"}}>Features</h3>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}} data-testid="listing-features">
                {listing.features.map(f => <span key={f} style={{background:"#F5F0E1",color:"var(--brand-navy)",padding:"0.3rem 0.8rem",borderRadius:999,fontSize:"0.82rem",fontFamily:"Inter,sans-serif"}}>{f}</span>)}
              </div>
            </div>
          )}
          <h2 style={{fontSize:"1.35rem",marginTop:"2rem"}}>Location</h2>
          <div style={{height:340,borderRadius:12,overflow:"hidden",border:"1px solid rgba(15,42,91,0.15)"}}>
            <iframe title={`Map of ${listing.street_address}`} src={`https://www.google.com/maps?q=${q}&output=embed`} width="100%" height="340" style={{border:0}} loading="lazy"/>
          </div>
          <ListingCompliance listing={listing}/>
        </div>
        {/* Inquiry sidebar */}
        <div style={{position:"sticky",top:"1rem"}}>
          {isInServiceArea(listing) ? (
          <div className="paper" data-testid="listing-ask-doug-cta" style={{textAlign:"center"}}>
            <div className="eyebrow">In Doug's service area</div>
            <h3 style={{fontSize:"1.05rem",margin:"0.5rem 0 1rem",lineHeight:1.4,fontWeight:600}}>
              If you're not working with a REALTOR<sup style={{fontSize:"0.55em"}}>®</sup> already —
            </h3>
            <Link
              to={`/buyer?city=${encodeURIComponent(listing.city || "")}&mls=${encodeURIComponent(listing.mls_number || "")}&address=${encodeURIComponent(listing.street_address || "")}`}
              data-testid="listing-ask-doug-pill"
              style={{
                display:"inline-block",
                background:"var(--brand-navy)",
                color:"#fff",
                fontFamily:"Inter,sans-serif",
                fontWeight:600,
                fontSize:"0.95rem",
                padding:"0.85rem 1.5rem",
                borderRadius:999,
                textDecoration:"none",
                boxShadow:"0 6px 14px rgba(15,42,91,0.28)",
                transition:"transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 20px rgba(15,42,91,0.35)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 6px 14px rgba(15,42,91,0.28)";}}
            >
              Ask Doug about this listing
            </Link>
          </div>
          ) : (
          <div className="paper" data-testid="listing-referral-cta" style={{textAlign:"center"}}>
            <div className="eyebrow">Outside Doug's service area</div>
            <h3 style={{fontSize:"1.15rem",margin:"0.5rem 0 0.9rem",lineHeight:1.35}}>
              This listing is in {listing.city}, BC — beyond Doug's direct service area.
            </h3>
            <Link
              to={`/referral-request?city=${encodeURIComponent(listing.city || "")}&mls=${encodeURIComponent(listing.mls_number || "")}&region=${encodeURIComponent(listing.region || "")}`}
              data-testid="listing-referral-pill"
              className="referral-pill"
              style={{
                display:"inline-block",
                background:"var(--brand-navy)",
                color:"#fff",
                fontFamily:"Inter,sans-serif",
                fontWeight:600,
                fontSize:"0.95rem",
                padding:"0.85rem 1.5rem",
                borderRadius:999,
                textDecoration:"none",
                boxShadow:"0 6px 14px rgba(15,42,91,0.28)",
                transition:"transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 20px rgba(15,42,91,0.35)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 6px 14px rgba(15,42,91,0.28)";}}
            >
              Request a Referral REALTOR<sup style={{fontSize:"0.55em"}}>®</sup> in {listing.city}
            </Link>
            <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"0.9rem",lineHeight:1.55,fontFamily:"Inter,sans-serif"}}>
              We'll match you with a BC-licensed REALTOR® active in {listing.city}.
            </div>
          </div>
          )}
        </div>
      </div>
    </div></section>
    </TermsGate>
  );
};

// --- Regions ---
const RegionsIndex = () => (
  <section className="section"><div className="container-x">
    <div style={{textAlign:"center",marginBottom:"3rem"}}><div className="eyebrow">Focus Areas</div><h1 className="section-title">Where Doug works.</h1></div>
    <div className="grid-3">
      {[{s:"greater-vancouver",t:"Greater Vancouver",i:IMG.vancouver},{s:"fraser-valley",t:"Fraser Valley",i:IMG.fraserValley},{s:"sea-to-sky",t:"Sea-to-Sky Corridor",i:IMG.seaToSky}].map(r =>
        <Link to={`/regions/${r.s}`} key={r.s} className="card"><img src={r.i} className="card-img" alt={r.t}/><div className="card-body"><h3 className="card-title">{r.t}</h3></div></Link>)}
    </div>
    <div style={{textAlign:"center",marginTop:"3.5rem",marginBottom:"2rem"}}><div className="eyebrow">Referral Network</div><h2 className="section-title" style={{fontSize:"1.8rem"}}>Covered by our REALTORS® across BC</h2></div>
    <div className="grid-3">
      <Link to="/regions/vancouver-island" className="card" data-testid="region-card-vancouver-island"><img src={IMG.vancouverIsland} className="card-img" alt="Vancouver Island"/><div className="card-body"><h3 className="card-title">Vancouver Island &amp; Gulf Islands</h3><p style={{fontFamily:"Inter,sans-serif",fontSize:"0.85rem",color:"var(--muted)",marginTop:"0.5rem"}}>51 communities — Victoria to Port Hardy, Tofino to Sidney</p></div></Link>
    </div>
  </div></section>
);

const REGION_DATA = {
  "greater-vancouver": {title:"Greater Vancouver", img:IMG.vancouver, key:"Greater Vancouver", copy:"The Greater Vancouver market spans 22 municipalities, from downtown Vancouver highrises to West Vancouver waterfront estates and the sprawling suburbs of Surrey and Coquitlam. It's Canada's most valuable real estate corridor — and one of the most tightly regulated. Doug's local expertise means you get someone who reads Form B's daily and knows every community's zoning quirks."},
  "fraser-valley": {title:"Fraser Valley", img:IMG.fraserValley, key:"Fraser Valley", copy:"The Fraser Valley — Langley, Abbotsford, Chilliwack, Mission — is BC's fastest-growing residential region. Detached homes, acreages, and family communities are the heart of the market. Doug specializes in equestrian and estate acreage properties across the Valley."},
  "sea-to-sky": {title:"Sea-to-Sky Corridor", img:IMG.seaToSky, key:"Sea-to-Sky", copy:"Squamish, Whistler, Pemberton — the Sea-to-Sky corridor blends mountain lifestyle with world-class recreation. Recreational homes, luxury chalets, and primary residences with a view. Financing, zoning, and STR rules here differ significantly from Metro Van."},
  "vancouver-island": {title:"Vancouver Island & Gulf Islands", img:IMG.vancouverIsland, key:"Vancouver Island & Gulf Islands", referral:true, copy:"Vancouver Island — from Victoria's heritage character to Tofino's surf coast, Nanaimo's growing urban core, and the retirement-friendly Comox Valley. Includes the Gulf Islands (Salt Spring, Galiano, Mayne, Pender, Saturna) with their unique zoning and community trust boundaries. Vancouver Island is outside Doug's primary practice area — but EZtoFind.ca's referral network connects you with a BC-licensed REALTOR® active in the specific community you're interested in. No cost to you; the receiving REALTOR® pays a referral fee to Doug at closing."}
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
      {d.referral && <div className="notice" style={{background:"#F5F0E1",borderColor:"var(--brand-gold)",marginBottom:"2rem",fontFamily:"Inter,sans-serif"}} data-testid="referral-region-notice"><strong>How the referral works:</strong> Submit our <Link to="/referral-request" style={{color:"var(--brand-blue)",fontWeight:600}}>Referral Request form</Link> with your city and property criteria. Doug's team matches you with a BC-licensed REALTOR® active in that community, introduces you by email, and steps aside. You work directly with the local REALTOR® — same pricing, better local knowledge.</div>}
    </div>
    <h3 className="font-display" style={{fontSize:"1.5rem",marginBottom:"1rem"}}>{d.referral ? "Communities covered by our network" : "Communities we serve"}</h3>
    <div className="chip-grid">{list.map(c => <Link key={c} to={`/community/${encodeURIComponent(c.toLowerCase().replace(/[^a-z0-9]+/g,"-"))}`} state={{name:c, region:d.key}} className="chip" style={{textDecoration:"none",cursor:"pointer"}} data-testid={`region-community-${c}`}>{c}</Link>)}</div>
    <div style={{marginTop:"3rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
      {d.referral
        ? <Link to="/referral-request" className="btn btn-primary" data-testid="referral-cta">Request a Referral</Link>
        : <><Link to={`/listings?region_group=${encodeURIComponent(d.key)}`} className="btn btn-primary" data-testid={`region-view-listings-${slug}`}>View Listings</Link><Link to="/buyer" className="btn btn-outline" data-testid={`region-buying-${slug}`}>I'm Buying Here</Link><Link to="/seller" className="btn btn-green" data-testid={`region-selling-${slug}`}>I'm Selling Here</Link></>}
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
  // Luxury gets a richer experience: live listings preview across the 3
  // eligible property types (Detached / Townhouse / Condo) at $3M+ BC-wide.
  if (slug === "luxury") return <LuxurySection intro={d}/>;
  if (slug === "equestrian") return <EquestrianSection intro={d}/>;
  // Detached / Condos / Townhomes: type is inherent to the page, so the
  // filter panel pre-locks Property Type and just refines city/beds/etc.
  const SPECIALTY_TYPE_MAP = { "detached":"Detached", "condos":"Condo", "townhomes":"Townhouse" };
  const lockedType = SPECIALTY_TYPE_MAP[slug];
  return (<section className="section"><div className="container-x">
    <img src={d.i} alt={d.t} style={{width:"100%",height:400,objectFit:"cover",borderRadius:16,marginBottom:"2rem"}}/>
    <div style={{maxWidth:"46rem"}}>
      <div className="eyebrow">Specialty</div><h1 className="section-title">{d.t}</h1>
      <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7,marginBottom:"2rem"}}>{d.c}</p>
    </div>
    {lockedType && (
      <div style={{maxWidth:"36rem",marginBottom:"2rem"}}>
        <SpecialtyFilterPanel defaults={{ property_type: lockedType, sort: "newest" }} lockPropertyType={true}/>
      </div>
    )}
    <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}><Link to="/buyer" className="btn btn-primary">Start as a Buyer</Link><Link to="/seller" className="btn btn-green">Start as a Seller</Link></div>
  </div></section>);
};

// --- Luxury Section — BC-wide, $3M+ across Detached / Townhouse / Condo ---
// Editorial hero + property-type tabs pulling live counts and 6-card
// previews from /api/listings with price_min=3000000 and the selected
// property_type. BCFSA-safe: no "opinion of value" adjectives on individual
// properties; describes the *market segment* only. Serves as landing page
// for langleyluxury.com, langleyluxuryhomes.forsale, vancouverluxuryhomes.forsale
// once those domain redirects flip on.
const LUXURY_TABS = [
  { key: "Detached",  label: "Detached Homes", singular: "detached home", plural: "detached homes" },
  { key: "Townhouse", label: "Townhouses",     singular: "townhouse",     plural: "townhouses" },
  { key: "Condo",     label: "Condos",         singular: "condo",         plural: "condos" },
];
const LUXURY_MIN_PRICE = 3000000;

// Shared region chips used on both Luxury and Equestrian specialty pages.
// Labels must match server-side REGION_CHIP_MAP keys — the frontend passes the
// exact label as ?region_chip= and the backend resolves it against the
// communities_seed.json city allowlist. "Anywhere" sends no filter.
const REGION_CHIPS = [
  { key: "Anywhere",         label: "Anywhere in BC" },
  { key: "Lower Mainland",   label: "Lower Mainland" },
  { key: "Fraser Valley",    label: "Fraser Valley" },
  { key: "Okanagan",         label: "Okanagan" },
  { key: "Vancouver Island", label: "Vancouver Island" },
  { key: "Kootenays",        label: "Kootenays" },
  { key: "Northern BC",      label: "Northern BC" },
];

const LuxurySection = ({ intro }) => {
  const [tabKey, setTabKey] = useState("Detached");
  const tab = LUXURY_TABS.find(t => t.key === tabKey) || LUXURY_TABS[0];
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("Anywhere");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { property_type: tabKey, price_min: LUXURY_MIN_PRICE, sort: "price_desc", limit: 6 };
    if (region && region !== "Anywhere") params.region_chip = region;
    axios.get(`${API}/listings`, { params }).then(r => {
      if (cancelled) return;
      setListings(r.data?.listings || []);
      setTotal(r.data?.total || 0);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tabKey, region]);

  const viewAllHref = `/listings?property_type=${encodeURIComponent(tabKey)}&price_min=${LUXURY_MIN_PRICE}&sort=price_desc${region !== "Anywhere" ? `&region_chip=${encodeURIComponent(region)}` : ""}`;

  return (<section className="section" data-testid="luxury-section"><div className="container-x">
    <img src={intro.i} alt="Luxury Real Estate BC" style={{width:"100%",height:400,objectFit:"cover",borderRadius:16,marginBottom:"2rem"}}/>
    <div style={{maxWidth:"52rem",marginBottom:"2rem"}}>
      <div className="eyebrow">BC's High-Value Residential Market</div>
      <h1 className="section-title" data-testid="luxury-title">Luxury Real Estate — British Columbia</h1>
      <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7,marginBottom:"1rem"}}>
        Live MLS® listings priced at <strong>$3,000,000 and above</strong> across all of British Columbia — from West Vancouver waterfront estates and Kitsilano heritage homes, to Whistler chalets, Kelowna lakefront properties, and Langley acreages.
      </p>
      <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"0.92rem",lineHeight:1.6,marginBottom:"1.5rem",fontStyle:"italic"}}>
        Discreet, professional representation for high-value buyers and sellers — Contact Doug for a confidential consultation.
      </p>
    </div>

    {/* Region chips — narrows all 3 property-type tabs by BC region. */}
    <div style={{marginBottom:"1.5rem"}}>
      <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.82rem",color:"var(--muted)",marginBottom:"0.55rem",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Where are you looking?</div>
      <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}} data-testid="luxury-region-chips">
        {REGION_CHIPS.map(r => {
          const active = region === r.key;
          return (
            <button key={r.key} type="button" onClick={() => setRegion(r.key)}
              data-testid={`luxury-region-${r.key.toLowerCase().replace(/\s+/g,"-")}`}
              style={{
                background: active ? "var(--brand-navy)" : "transparent",
                color: active ? "#F5F0E1" : "var(--brand-navy)",
                border: `2px solid ${active ? "var(--brand-navy)" : "#E5E7EB"}`,
                padding: "0.4rem 0.95rem", borderRadius: 999,
                fontFamily: "Inter,sans-serif", fontSize: "0.85rem", fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s"
              }}>{r.label}</button>
          );
        })}
      </div>
    </div>

    {/* Property-type tabs */}
    <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"1.5rem",borderBottom:"2px solid #E5E7EB",paddingBottom:"0.5rem"}} data-testid="luxury-tabs">
      {LUXURY_TABS.map(t => (
        <button key={t.key} type="button"
          onClick={() => setTabKey(t.key)}
          data-testid={`luxury-tab-${t.key.toLowerCase()}`}
          style={{
            background: tabKey === t.key ? "var(--brand-navy)" : "transparent",
            color: tabKey === t.key ? "#F5F0E1" : "var(--brand-navy)",
            border: `2px solid ${tabKey === t.key ? "var(--brand-navy)" : "#E5E7EB"}`,
            padding: "0.55rem 1.2rem", borderRadius: 999,
            fontFamily: "Inter,sans-serif", fontSize: "0.92rem", fontWeight: 600,
            cursor: "pointer", transition: "all 0.15s"
          }}>{t.label}</button>
      ))}
    </div>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
      <div style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"0.95rem"}} data-testid="luxury-count">
        {loading ? "Loading…" : <><strong style={{color:"var(--brand-navy)"}}>{total.toLocaleString()}</strong> {total === 1 ? tab.singular : tab.plural} at $3M+ across BC</>}
      </div>
      <Link to={viewAllHref} className="btn btn-ghost" data-testid="luxury-view-all" style={{fontSize:"0.88rem",padding:"0.45rem 1.1rem"}}>View all {tab.plural} →</Link>
    </div>

    {/* Preview grid — 6 cards, sorted price-desc */}
    {loading ? (
      <div style={{padding:"3rem",textAlign:"center",color:"var(--muted)"}}>Loading luxury listings…</div>
    ) : listings.length === 0 ? (
      <div className="paper" style={{padding:"2rem",textAlign:"center"}}>
        <p>No active {tab.singular} listings at $3M+ currently on the feed. Check back — luxury inventory turns over frequently.</p>
      </div>
    ) : (
      <div className="grid-3" data-testid="luxury-listings">
        {listings.map(l => <ListingCard key={l.listing_key} listing={l}/>)}
      </div>
    )}

    <div style={{marginTop:"3rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
      <Link to="/buyer" className="btn btn-primary" data-testid="luxury-buyer">Start as a Luxury Buyer</Link>
      <Link to="/seller" className="btn btn-green" data-testid="luxury-seller">List Your Luxury Property</Link>
      <Link to={viewAllHref} className="btn btn-ghost">Browse all $3M+ {tab.plural}</Link>
    </div>

    {/* BCFSA compliance strip */}
    <p style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"2.5rem",fontFamily:"Inter,sans-serif",lineHeight:1.6,fontStyle:"italic",borderTop:"1px solid #E5E7EB",paddingTop:"1rem"}}>
      Listings shown are from the CREA DDF® feed and are current at time of load. All representations regarding specific properties (value, condition, permitted use, etc.) should be verified with the listing REALTOR®, a BC lawyer or notary, and independent inspectors. Doug LeMaire, REALTOR® provides general information and referral services and is licensed under the BC Real Estate Services Act, regulated by BCFSA. Not an opinion of value.
    </p>
  </div></section>);
};

// --- Equestrian Section — Acreage / Equestrian / Detached across BC ---
// Similar pattern to LuxurySection but tuned for horse-property buyers:
// price-asc sort (affordability matters more than trophy pricing), region
// chips because horse country clusters (Fraser Valley, Okanagan, Island,
// Cariboo, Kootenays), and a yellow ALR-verify banner up top because most
// equestrian buyers hit the Agricultural Land Reserve issue on their first
// property tour. Cross-links to glossary terms Doug already publishes.
const EQUESTRIAN_MIN_PRICE = 2000000;
// Simplified per user request: page shows ONLY the dedicated equestrian
// keyword-match tier ($2M+ with description scan for horse-property terms).
// The prior "Acreage" and "Detached" fallback tabs were removed because they
// diluted the page with generic rural properties buyers can already find via
// the main /listings search.
const EQUESTRIAN_LABEL_SINGULAR = "equestrian match";
const EQUESTRIAN_LABEL_PLURAL = "equestrian matches";

// Sub-category chips — must match server-side EQUESTRIAN_SUB_CATEGORIES keys.
// "" = All (no sub_category param sent). Each chip AND-narrows the base
// equestrian keyword scan by additional description patterns or property_type.
const EQUESTRIAN_CHIPS = [
  { key: "",           label: "All" },
  { key: "acreage",    label: "Acreage" },
  { key: "hobby_farm", label: "Hobby Farm" },
  { key: "estate",     label: "Estate" },
  { key: "ranch",      label: "Ranch" },
  { key: "bareland",   label: "Bareland" },
];

const EquestrianSection = ({ intro }) => {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [subCat, setSubCat] = useState("");
  const [region, setRegion] = useState("Anywhere");
  const PAGE_SIZE = 12;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { sort: "price_asc", limit: PAGE_SIZE, offset: 0, price_min: EQUESTRIAN_MIN_PRICE };
    if (subCat) params.sub_category = subCat;
    if (region && region !== "Anywhere") params.region_chip = region;
    axios.get(`${API}/listings/equestrian`, { params }).then(r => {
      if (cancelled) return;
      setListings(r.data?.listings || []);
      setTotal(r.data?.total || 0);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subCat, region]);

  const loadMore = () => {
    if (loadingMore || listings.length >= total) return;
    setLoadingMore(true);
    const params = { sort: "price_asc", limit: PAGE_SIZE, offset: listings.length, price_min: EQUESTRIAN_MIN_PRICE };
    if (subCat) params.sub_category = subCat;
    if (region && region !== "Anywhere") params.region_chip = region;
    axios.get(`${API}/listings/equestrian`, { params })
      .then(r => setListings(prev => [...prev, ...(r.data?.listings || [])]))
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  return (<section className="section" data-testid="equestrian-section"><div className="container-x">
    <img src={intro.i} alt="BC Equestrian Properties" style={{width:"100%",height:400,objectFit:"cover",borderRadius:16,marginBottom:"2rem"}}/>
    <div style={{maxWidth:"52rem",marginBottom:"1.5rem"}}>
      <div className="eyebrow">BC's Horse Country</div>
      <h1 className="section-title" data-testid="equestrian-title">Equestrian Properties — British Columbia</h1>
      <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7,marginBottom:"1rem"}}>
        Live MLS® listings for horse-friendly acreage across all of British Columbia — hobby farms, dedicated equestrian facilities, and rural detached homes with paddock potential. From Langley's ALR corridor and Fraser Valley barn country, to South Okanagan orchards, Vancouver Island fields, Cariboo ranchland, and Kootenay foothill acreage.
      </p>
    </div>

    {/* ALR + zoning verification banner — critical BCFSA compliance moment */}
    <div data-testid="equestrian-alr-banner" style={{background:"#FEF3C7",borderLeft:"4px solid #F59E0B",padding:"1rem 1.25rem",borderRadius:8,marginBottom:"1.75rem",fontSize:"0.92rem",color:"#78350F",fontFamily:"Inter,sans-serif",lineHeight:1.55}}>
      <strong>⚠️ Verify before you buy.</strong> Many BC equestrian properties are inside the <Link to="/glossary/agricultural-land-reserve" style={{color:"#78350F",textDecoration:"underline",fontWeight:600}}>Agricultural Land Reserve</Link>. Confirm ALR status, municipal zoning permitting stables, water rights under the Water Sustainability Act, septic capacity, and any registered <Link to="/glossary/restrictive-covenant" style={{color:"#78350F",textDecoration:"underline",fontWeight:600}}>restrictive covenants</Link> or <Link to="/glossary/statutory-building-scheme" style={{color:"#78350F",textDecoration:"underline",fontWeight:600}}>statutory building schemes</Link> BEFORE writing an offer.
    </div>

    {/* Property-type tabs removed per product decision — page now shows only
        the dedicated Equestrian Match tier ($2M+ keyword scan). */}

    {/* Region chips — narrows equestrian match by BC region. */}
    <div style={{marginBottom:"1.25rem",marginTop:"1.5rem"}}>
      <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.82rem",color:"var(--muted)",marginBottom:"0.55rem",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Where are you looking?</div>
      <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}} data-testid="equestrian-region-chips">
        {REGION_CHIPS.map(r => {
          const active = region === r.key;
          return (
            <button key={r.key} type="button" onClick={() => setRegion(r.key)}
              data-testid={`equestrian-region-${r.key.toLowerCase().replace(/\s+/g,"-")}`}
              style={{
                background: active ? "var(--brand-navy)" : "transparent",
                color: active ? "#F5F0E1" : "var(--brand-navy)",
                border: `2px solid ${active ? "var(--brand-navy)" : "#E5E7EB"}`,
                padding: "0.4rem 0.95rem", borderRadius: 999,
                fontFamily: "Inter,sans-serif", fontSize: "0.85rem", fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s"
              }}>{r.label}</button>
          );
        })}
      </div>
    </div>

    {/* Sub-category chips — drill down within the equestrian match by
        lifestyle segment (acreage, hobby farm, estate, ranch, bareland). */}
    <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"1rem"}} data-testid="equestrian-chips">
      {EQUESTRIAN_CHIPS.map(c => {
        const active = subCat === c.key;
        return (
          <button key={c.key || "all"} type="button"
            onClick={() => setSubCat(c.key)}
            data-testid={`equestrian-chip-${c.key || "all"}`}
            style={{
              background: active ? "var(--brand-navy)" : "transparent",
              color: active ? "#F5F0E1" : "var(--brand-navy)",
              border: `2px solid ${active ? "var(--brand-navy)" : "#E5E7EB"}`,
              padding: "0.45rem 1.05rem", borderRadius: 999,
              fontFamily: "Inter,sans-serif", fontSize: "0.88rem", fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s"
            }}>{c.label}</button>
        );
      })}
    </div>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
      <div style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"0.95rem"}} data-testid="equestrian-count">
        {loading ? "Loading…" : <><strong style={{color:"var(--brand-navy)"}}>{total.toLocaleString()}</strong> {total === 1 ? EQUESTRIAN_LABEL_SINGULAR : EQUESTRIAN_LABEL_PLURAL} across BC · showing {listings.length}</>}
      </div>
    </div>

    {loading ? (
      <div style={{padding:"3rem",textAlign:"center",color:"var(--muted)"}}>Loading equestrian listings…</div>
    ) : listings.length === 0 ? (
      <div className="paper" style={{padding:"2rem",textAlign:"center"}}>
        <p>No active {EQUESTRIAN_LABEL_SINGULAR} listings currently on the feed at $2,000,000 or above. Inventory turns over frequently — check back soon or contact Doug directly for off-market equestrian opportunities.</p>
      </div>
    ) : (
      <>
        <div className="grid-3" data-testid="equestrian-listings">
          {listings.map(l => <ListingCard key={l.listing_key} listing={l}/>)}
        </div>
        {listings.length < total && (
          <div style={{textAlign:"center",marginTop:"1.75rem"}}>
            <button type="button" className="btn btn-primary" data-testid="equestrian-load-more" onClick={loadMore} disabled={loadingMore} style={{minWidth:"14rem"}}>
              {loadingMore ? "Loading…" : `Load ${Math.min(PAGE_SIZE, total - listings.length)} more →`}
            </button>
          </div>
        )}
      </>
    )}

    {/* Buyer due-diligence checklist — the compliance / SEO win */}
    <div style={{marginTop:"3rem",background:"#F9FAFB",border:"1px solid #E5E7EB",borderRadius:12,padding:"1.5rem 1.75rem"}} data-testid="equestrian-checklist">
      <h3 style={{fontFamily:"Fraunces,Georgia,serif",fontSize:"1.4rem",color:"var(--brand-navy)",marginTop:0}}>5-Step Equestrian Buyer Checklist</h3>
      <p style={{color:"var(--muted)",fontFamily:"Inter,sans-serif",fontSize:"0.92rem",marginBottom:"1rem"}}>Every horse property in BC needs these 5 verifications before you write an offer. Skip any of them and you may end up with a beautiful lot you can't legally keep animals on.</p>
      <ol style={{fontFamily:"Inter,sans-serif",lineHeight:1.8,color:"var(--ink)",paddingLeft:"1.25rem"}}>
        <li><strong>ALR status</strong> — verify with the <a href="https://www.alc.gov.bc.ca/alc/content/alr-maps" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>BC Agricultural Land Commission ALR map</a>. See our glossary: <Link to="/glossary/agricultural-land-reserve" style={{color:"var(--brand-blue)"}}>Agricultural Land Reserve</Link></li>
        <li><strong>Municipal zoning</strong> — confirm the zone permits stables and your specific livestock in writing. Related terms: <Link to="/glossary/statutory-building-scheme" style={{color:"var(--brand-blue)"}}>Statutory Building Scheme</Link>, <Link to="/glossary/restrictive-covenant" style={{color:"var(--brand-blue)"}}>Restrictive Covenant</Link></li>
        <li><strong>Water rights</strong> — most BC domestic wells authorize household use only. Livestock watering may require a separate Water Sustainability Act authorization from the Ministry of Water, Land and Resource Stewardship</li>
        <li><strong>Septic capacity</strong> — barns, staff quarters, and secondary dwellings often require an engineered septic system. Confirm with a BC Registered Onsite Wastewater Practitioner (ROWP)</li>
        <li><strong>Title search + covenants</strong> — pull a current title from the <a href="https://ltsa.ca/" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>Land Title and Survey Authority</a>. Check for legacy covenants prohibiting livestock — very common in 1980s-90s Fraser Valley subdivisions. Related term: <Link to="/glossary/undersurface-rights" style={{color:"var(--brand-blue)"}}>Undersurface Rights</Link></li>
      </ol>
    </div>

    <div style={{marginTop:"2.5rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
      <Link to="/buyer" className="btn btn-primary" data-testid="equestrian-buyer">Start as an Equestrian Buyer</Link>
      <Link to="/seller" className="btn btn-green" data-testid="equestrian-seller">List Your Horse Property</Link>
    </div>

    {/* BCFSA compliance strip */}
    <p style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"2.5rem",fontFamily:"Inter,sans-serif",lineHeight:1.6,fontStyle:"italic",borderTop:"1px solid #E5E7EB",paddingTop:"1rem"}}>
      Listings shown are from the CREA DDF® feed and are current at time of load. All representations regarding specific properties (value, ALR status, permitted animals, water rights, condition) must be verified with the listing REALTOR®, a BC lawyer or notary, the applicable municipality, the Agricultural Land Commission, and independent inspectors. Doug LeMaire, REALTOR® provides general information and referral services under the BC Real Estate Services Act, regulated by BCFSA. Not an opinion of value.
    </p>
  </div></section>);
};

// --- Combined REALTOR® Network page — BC on top, Out-of-Province below ---
// Single-page presentation of Doug's referral network for licensed REALTORS®
// from anywhere. BC applicants land in the BC pipeline; OOP applicants land
// in the interprovincial pipeline. Same admin queue at /admin/realtors handles
// both. Kept as one URL (/realtor-network) so a single nav item covers both.
const RealtorNetwork = () => (
  <>
    <div style={{background:"linear-gradient(135deg, rgba(15,42,91,0.03), rgba(212,175,55,0.06))",paddingBottom:"2rem"}}>
      <div className="container-x" style={{textAlign:"center",paddingTop:"2rem"}}>
        <div className="eyebrow" data-testid="realtor-network-eyebrow">Doug's Referral Network</div>
        <h1 className="section-title" style={{marginBottom:"0.5rem"}} data-testid="realtor-network-title">REALTOR® Network</h1>
        <p style={{maxWidth:"46rem",margin:"0 auto",color:"var(--muted)",fontFamily:"Inter,sans-serif",lineHeight:1.65}}>
          Doug LeMaire, REALTOR® partners with licensed REALTORS® across British Columbia and every other Canadian province, plus international agents, under the standard CREA Inter-Board Referral Agreement. If a client of Doug's is buying or selling in your area, he'll refer directly to you. Standard 25% referral fee paid by the receiving REALTOR® at closing.
        </p>
      </div>
    </div>
    {/* BC REALTORS® — top */}
    <RealtorApply/>
    {/* Visual divider between the two application flows */}
    <div className="container-x" style={{textAlign:"center",padding:"1rem 0"}}>
      <div style={{display:"inline-block",padding:"0.5rem 1.5rem",background:"var(--brand-navy)",color:"#F5F0E1",borderRadius:999,fontFamily:"Inter,sans-serif",fontSize:"0.85rem",fontWeight:600,letterSpacing:"0.05em"}}>OR — LICENSED OUTSIDE BC?</div>
    </div>
    {/* Out-of-Province REALTORS® — bottom */}
    <RealtorApplyOutOfProvince/>
  </>
);

// --- Glossary ---
// across high-value scrape targets (glossary, community, home). Each is
// visually hidden (aria-hidden, offscreen) so real users never see them,
// but any bot/scraper that harvests our HTML will grab them verbatim. If
// they later appear on another site, that's cryptographic-grade proof of
// copying — tied to CIPO Copyright Registration No. 1247822. NOT to be
// "corrected" — they are intentionally false/unusual.
const Canary = ({phrase, testId}) => (
  <div aria-hidden="true" data-testid={testId} style={{position:"absolute",left:"-9999px",top:"auto",width:"1px",height:"1px",overflow:"hidden",fontSize:"1px",opacity:0,pointerEvents:"none"}}>{phrase}</div>
);
// CANARY-1 (already lives on /copyright) — Whistler trailhead coordinate
// CANARY-2 — Glossary index: fake "official" acronym expansion
const CANARY_GLOSSARY = "Fingerprint reference glossary-index: the BC Property Transfer Tax was informally nicknamed 'the Fraser Levy' in a 1988 Legislative Assembly draft memo (never enacted). Cross-check ID: EZTF-GLX-2026-0729-A.";
// CANARY-3 — Home page: fake historical listing count anecdote
const CANARY_HOME = "Fingerprint reference home-index: EZtoFind.ca's first-week soft-launch on July 4, 2026 indexed exactly 51,847 BC MLS® listings before its evening CREA DDF resync. Cross-check ID: EZTF-HMX-2026-0729-B.";
// CANARY-4 — Community page: fake community-specific factoid
const CANARY_COMMUNITY = "Fingerprint reference community-page: EZtoFind.ca community synopses were curated in a 3-week sprint ending 2026-07-20 with a working-title codename of 'Project Alder'. Cross-check ID: EZTF-CMX-2026-0729-C.";

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
    <SEO
      title="BC Real Estate Glossary — 396 Terms with Authoritative Sources | EZtoFind.ca"
      description="Comprehensive glossary of 396 British Columbia real estate terms, each with 10 FAQs and links to the governing BC statute or regulator. Strata Property Act, PTT, foreclosure, ALR, and more."
      path="/glossary"
    />
    <div style={{textAlign:"center",marginBottom:"2rem"}}><div className="eyebrow">Knowledge Hub</div><h1 className="section-title">BC Real Estate Glossary</h1><p className="section-sub">Term's you may encounter buying or selling in British Columbia — with 10 FAQs per term.</p></div>
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
// Glossary index canary (CANARY-2) — invisible fingerprint at page end
const GlossaryWithCanary = () => (<><Glossary/><Canary phrase={CANARY_GLOSSARY} testId="canary-glossary"/></>);
const GlossaryTerm = () => {
  const {slug} = useParams();
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState({ category: "", items: [] });
  useEffect(()=>{ setLoading(true); axios.get(`${API}/glossary/${slug}`).then(r=>{setT(r.data);setLoading(false);}).catch(()=>setLoading(false)); axios.get(`${API}/glossary/${slug}/related`).then(r=>setRelated(r.data||{items:[]})).catch(()=>{}); },[slug]);
  if(loading) return <div className="section container-x"><p>Loading…</p></div>;
  if(!t) return <div className="section container-x"><h2>Term not found</h2><Link to="/glossary">← Back</Link></div>;

  const AuthorBlock = ({compact=false}) => <PublishedByDoug compact={compact} lastReviewed={t.faqs_approved_at || t.last_curated_at || t.updated_at}/>;

  // AEO / LLM Article schema — combines definition, author, publisher, FAQPage
  const now = new Date().toISOString();
  const dateMod = t.last_curated_at || now;
  const articleSchema = {
    "@context":"https://schema.org",
    "@type":"Article",
    "headline":`${t.term} — BC Real Estate`,
    "description":t.definition.substring(0,200),
    "datePublished": dateMod,
    "dateModified": dateMod,
    "author":{"@type":"Person","name":"Doug LeMaire, REALTOR®","url":"https://eztofind.ca/about","affiliation":{"@type":"Organization","name":"Fraser Property Management Realty Services Ltd."}},
    "publisher":{"@type":"Organization","name":"EZtoFind.ca","url":"https://eztofind.ca","logo":{"@type":"ImageObject","url":"https://eztofind.ca/images/doogie-laptop.png"}},
    "mainEntity":{"@type":"DefinedTerm","name":t.term,"description":t.definition,"inDefinedTermSet":{"@type":"DefinedTermSet","name":"EZtoFind.ca BC Real Estate Glossary","url":"https://eztofind.ca/glossary"}},
    "url":`https://eztofind.ca/glossary/${t.slug}`,
    "inLanguage":"en-CA",
    "about":{"@type":"Place","name":"British Columbia, Canada"}
  };
  const breadcrumbSchema = {
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":"https://eztofind.ca/"},
      {"@type":"ListItem","position":2,"name":"Glossary","item":"https://eztofind.ca/glossary"},
      {"@type":"ListItem","position":3,"name":t.term,"item":`https://eztofind.ca/glossary/${t.slug}`}
    ]
  };
  const faqSchema = (t.faqs && t.faqs.length>0) ? {"@context":"https://schema.org","@type":"FAQPage","mainEntity":t.faqs.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}})),"author":{"@type":"Person","name":"Doug LeMaire, REALTOR®"},"publisher":{"@type":"Organization","name":"EZtoFind.ca"}} : null;

  return (<section className="section"><div className="container-x" style={{maxWidth:"48rem"}} itemScope itemType="https://schema.org/Article">
    <SEO
      title={`What is ${t.term} in British Columbia? Definition, FAQs & BC Statute | EZtoFind.ca`}
      description={(`${t.term} in BC — plain-language definition, ${(t.faqs || []).length ? (t.faqs.length + ' FAQs, ') : ''}governing statute link, and how it affects buyers and sellers. ` + (t.definition || '')).substring(0, 200)}
      path={`/glossary/${t.slug}`}
      schema={articleSchema}
    />
    {faqSchema && <Helmet><script type="application/ld+json">{JSON.stringify(faqSchema)}</script></Helmet>}
    <Helmet><script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script></Helmet>
    <Link to="/glossary" style={{fontFamily:"Inter,sans-serif",color:"var(--brand-blue)",textDecoration:"none"}}>← All terms</Link>
    <div className="eyebrow" style={{marginTop:"1rem"}}>{t.category}</div>
    <h1 className="section-title" itemProp="headline">{t.term}</h1>

    <AuthorBlock/>

    {/* Category-based scope-of-licence pill — appears on any glossary term
        whose subject matter falls outside Doug's REALTOR® licence. Repeats
        the site-level BCFSA disclaimer at the point of consumption in case
        the term is landed on directly from Google or an LLM citation. */}
    {(() => {
      const cat = (t.category || "").toLowerCase();
      const financing = /financ|mortgage/.test(cat);
      const taxes     = /tax/.test(cat) || cat.includes("government");
      const insurance = cat.includes("insurance");
      const legal     = cat.includes("legal") || cat.includes("title") || cat.includes("conveyanc");
      let scope = null;
      if (financing)      scope = { color:"#F59E0B", label:"Not mortgage advice", body:"This is general educational information about a mortgage or financing concept. Doug LeMaire is a REALTOR® — not a mortgage broker. For advice on your specific financing, consult a licensed BC mortgage broker regulated under the Mortgage Brokers Act." };
      else if (taxes)     scope = { color:"#0EA5E9", label:"Not tax advice",       body:"This is general educational information about a tax concept. Doug LeMaire is a REALTOR® — not a tax accountant. For advice on your specific tax situation, consult a Chartered Professional Accountant (CPA) or the Canada Revenue Agency." };
      else if (insurance) scope = { color:"#8B5CF6", label:"Not insurance advice", body:"This is general educational information about an insurance concept. Doug LeMaire is a REALTOR® — not a licensed insurance broker. For advice on your specific coverage, consult a licensed BC insurance broker regulated by the Insurance Council of BC." };
      else if (legal)     scope = { color:"#DC2626", label:"Not legal advice",     body:"This is general educational information about a legal or conveyancing concept. Doug LeMaire is a REALTOR® — not a lawyer or notary. For advice on your specific transaction or dispute, consult a BC lawyer (Law Society of BC) or a BC notary public (Society of Notaries Public of BC)." };
      if (!scope) return null;
      return (
        <div data-testid="glossary-scope-of-licence" style={{margin:"1rem 0 1.25rem",padding:"0.85rem 1rem",background:`${scope.color}0F`,border:`1px solid ${scope.color}55`,borderLeft:`4px solid ${scope.color}`,borderRadius:8,fontFamily:"Inter,sans-serif"}}>
          <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.08em",color:scope.color,fontWeight:800,marginBottom:"0.25rem"}}>⚠ {scope.label}</div>
          <div style={{fontSize:"0.85rem",lineHeight:1.55,color:"var(--ink)"}}>{scope.body}</div>
        </div>
      );
    })()}

    {/* AEO answer-first pattern — natural-language question heading that
        matches how users query LLMs ("What is X in BC?"), followed by the
        definition as the direct answer. The question H2 is rendered as
        <h2> for semantic weight (crawler/LLM extraction) but styled small
        so it doesn't visually dominate the term H1. Marked as the
        FAQPage.mainEntity Question via microdata for redundancy alongside
        the JSON-LD FAQPage below. */}
    <h2 style={{fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--muted)",fontWeight:600,marginTop:"0.5rem",marginBottom:"0.75rem",textTransform:"none",letterSpacing:0}} data-testid="glossary-answer-question">
      What is {t.term} in British Columbia?
    </h2>

    <p style={{fontFamily:"Inter,sans-serif",fontSize:"1.05rem",lineHeight:1.75,color:"var(--ink)"}} itemProp="articleBody">{t.definition}</p>

    <h2 style={{marginTop:"3rem",fontSize:"1.75rem"}}>Frequently Asked Questions</h2>
    {(t.faqs && t.faqs.length>0) ? <div className="faq">{t.faqs.map((f,i)=><details key={i}>
        <summary>{f.q}</summary>
        <p>{f.a}</p>
        {t.sources && t.sources.length>0 && (
          <div data-testid={`faq-source-${i}`} style={{marginTop:"0.75rem",paddingTop:"0.65rem",borderTop:"1px dashed rgba(15,42,91,0.2)",fontSize:"0.82rem",fontFamily:"Inter,sans-serif",color:"var(--muted)",lineHeight:1.55}}>
            <span style={{fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",fontSize:"0.72rem",color:"var(--brand-navy)"}}>Verify with:</span>{" "}
            {t.sources.slice(0,2).map((s,si)=>(
              <span key={si}>
                {si>0 && " · "}
                <a href={s.url} target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)",fontWeight:600,textDecoration:"none"}}>{s.title} ↗</a>
              </span>
            ))}
          </div>
        )}
      </details>)}</div>
      : (t.faqs_pending_review ? <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",background:"#F5F0E1",padding:"1rem",borderRadius:10}}>📋 FAQs for this term have been drafted by AI and are awaiting review by Doug LeMaire, REALTOR® before publication. Please check back soon.</p>
      : <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)"}}>FAQs are being generated by Doogie — refresh in a few seconds.</p>)}

    {t.sources && t.sources.length>0 && (
      <SourcesBlock title="Authoritative Sources" intro="Verify the specific statutory language, thresholds, deadlines and current guidance directly with the governing authority:" sources={t.sources} testid="glossary-sources"/>
    )}

    {related.items && related.items.length > 0 && (
      <div className="related-terms-block" data-testid="glossary-related-terms">
        <h3>See also — related {related.category || "terms"}</h3>
        <div className="related-terms-list">
          {related.items.map(r => (
            <Link key={r.slug} to={`/glossary/${r.slug}`} data-testid={`related-term-${r.slug}`}>{r.term}</Link>
          ))}
        </div>
        <div style={{marginTop:"0.75rem",fontSize:"0.78rem",color:"var(--muted)",fontFamily:"Inter,sans-serif"}}>Explore the full <Link to="/glossary" style={{color:"var(--brand-blue)",fontWeight:600}}>BC real estate glossary</Link>.</div>
      </div>
    )}

    {/* Phase B — cross-type "You may also be looking for" cards (guides,
        calculators, communities). Fetches from /api/related-content and hides
        silently if empty or if the fetch errors — never leaks admin diagnostics
        to public visitors. */}
    <YouMayAlsoBeLookingFor sourceType="glossary" sourceId={t.slug} limit={6} testId="glossary-you-may-also"/>

    <div className="notice" style={{marginTop:"1.5rem"}}>All content on EZtoFind.ca, including Doogie's responses, the Glossary, Terms, FAQ's, community pages, weather, mortgage calculator, property transfer tax calculator is general information provided for educational purposes and is not a substitute for professional guidance tailored to your situation.</div>

    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleSchema)}}/>
    {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema)}}/>}
  </div></section>);
};

// --- Lead forms ---
const BuyerForm = () => {
  const { lang, t, qs, rtl } = useFormLang();
  const [f,setF] = useState({full_name:"",email:"",phone:"",areas:[],property_type:"",budget_range:"",timeline:"",financing_status:"",first_time_buyer:false,working_with_realtor:false,preferred_contact:"email",notes:"",casl_consent:false,pipa_ack:false});
  const [done,setDone]=useState(false); const [err,setErr]=useState("");
  // Pre-fill from listing "Ask Doug about this listing" pill (?city=&mls=&address=)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const city = sp.get("city"); const mls = sp.get("mls"); const addr = sp.get("address");
    if (!city && !mls && !addr) return;
    setF(prev => ({
      ...prev,
      areas: city && prev.areas.length === 0 ? [city] : prev.areas,
      notes: prev.notes ? prev.notes : `LISTING INQUIRY — MLS® ${mls || "?"}${addr ? " · " + addr : ""}${city ? ", " + city : ""}.`,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = async e => { e.preventDefault(); setErr(""); try { await axios.post(`${API}/leads/buyer`, {...f, areas: f.areas.length? f.areas: [f.property_type||"Any"], form_lang: lang, turnstile_token: getTurnstileToken()}); trackConversion("generate_lead", { lead_type: "buyer", property_type: f.property_type || "Any", region: (f.areas || [])[0] || "Any", currency: "CAD" }); setDone(true); } catch(x){ setErr(t("common.required")); } };
  if(done) return <section className="section"><div className="container-x" style={{maxWidth:"36rem",textAlign:"center"}}><img src={DOOGIE_CELEBRATE} style={{width:200,margin:"0 auto"}} alt="Doogie"/><h1 className="section-title">{t("common.thank_you")}</h1><p className="section-sub">{t("common.we_reply_24h")}</p><Link to={`/${qs}`} className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="buyer-success-home">{t("common.back_home")}</Link></div></section>;
  return (<section className="section" dir={rtl?"rtl":"ltr"}><div className="container-x" style={{maxWidth:"42rem"}}>
    <div className="eyebrow">{t("buyer.eyebrow")}</div><h1 className="section-title">{t("buyer.title")}</h1>
    <div className="notice" style={{background:"#F0F4FB",borderColor:"rgba(15,42,91,0.15)",marginBottom:"1.5rem",fontFamily:"Inter,sans-serif",fontSize:"0.88rem",lineHeight:1.6}} data-testid="buyer-dorts-notice"><strong>{t("bcfsa.notice_title")}</strong> {t("bcfsa.notice_body")} <Link to={`/dorts${qs}`} style={{color:"var(--brand-blue)",fontWeight:600}}>{t("bcfsa.dorts_link")}</Link> {t("bcfsa.notice_after")}</div>
    <form onSubmit={submit} className="paper" data-testid="buyer-form">
      <div className="form-grid">
        <div className="field"><label>{t("buyer.full_name")} *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} data-testid="buyer-name"/></div>
        <div className="field"><label>{t("buyer.email")} *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="buyer-email"/></div>
        <div className="field"><label>{t("buyer.phone")} *</label><input required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} data-testid="buyer-phone"/></div>
        <div className="field"><label>{t("buyer.property_type")} *</label><select required value={f.property_type} onChange={e=>setF({...f,property_type:e.target.value})} data-testid="buyer-type"><option value="">{t("common.select")}</option><option value="Detached">{t("buyer.pt_detached")}</option><option value="Luxury">{t("buyer.pt_luxury")}</option><option value="Equestrian / Acreage">{t("buyer.pt_acreage")}</option><option value="Estate Sale / Probate">{t("buyer.pt_estate")}</option><option value="Condo">{t("buyer.pt_condo")}</option><option value="Townhouse">{t("buyer.pt_townhouse")}</option></select></div>
        <div className="field"><label>{t("buyer.budget_range")} *</label><select required value={f.budget_range} onChange={e=>setF({...f,budget_range:e.target.value})}><option value="">{t("common.select")}</option><option value="Under $750K">{t("buyer.budget_u750")}</option><option value="$750K – $1.25M">{t("buyer.budget_750_1250")}</option><option value="$1.25M – $2M">{t("buyer.budget_1250_2m")}</option><option value="$2M – $3M">{t("buyer.budget_2m_3m")}</option><option value="$3M – $5M">{t("buyer.budget_3m_5m")}</option><option value="$5M+">{t("buyer.budget_5mplus")}</option></select></div>
        <div className="field"><label>{t("buyer.timeline")} *</label><select required value={f.timeline} onChange={e=>setF({...f,timeline:e.target.value})}><option value="">{t("common.select")}</option><option value="0-3 months">{t("buyer.tl_0_3")}</option><option value="3-6 months">{t("buyer.tl_3_6")}</option><option value="6-12 months">{t("buyer.tl_6_12")}</option><option value="12+ months">{t("buyer.tl_12plus")}</option></select></div>
        <div className="field"><label>{t("buyer.financing_status")} *</label><select required value={f.financing_status} onChange={e=>setF({...f,financing_status:e.target.value})}><option value="">{t("common.select")}</option><option value="Pre-approved">{t("buyer.fin_pre")}</option><option value="Working on it">{t("buyer.fin_working")}</option><option value="Cash buyer">{t("buyer.fin_cash")}</option><option value="Need information">{t("buyer.fin_need_info")}</option></select></div>
        <div className="field"><label>{t("buyer.preferred_contact")}</label><select value={f.preferred_contact} onChange={e=>setF({...f,preferred_contact:e.target.value})}><option value="email">{t("contact.email_pref")}</option><option value="phone">{t("contact.phone_pref")}</option><option value="text">{t("contact.text_pref")}</option></select></div>
      </div>
      <div style={{marginTop:"1rem"}} className="field"><label>{t("buyer.areas_label")}</label><input placeholder={t("buyer.areas_placeholder")} value={f.areas.join(", ")} onChange={e=>setF({...f,areas:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}/></div>
      <div style={{marginTop:"1rem"}} className="field"><label>{t("buyer.notes")}</label><textarea rows="3" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></div>
      <div style={{marginTop:"1rem"}} className="field"><label className="check"><input type="checkbox" checked={f.first_time_buyer} onChange={e=>setF({...f,first_time_buyer:e.target.checked})}/> {t("buyer.first_time")}</label></div>
      <div className="field"><label className="check"><input type="checkbox" checked={f.working_with_realtor} onChange={e=>setF({...f,working_with_realtor:e.target.checked})} data-testid="buyer-under-contract"/> {t("buyer.under_contract")}</label></div>
      {f.working_with_realtor && <div className="notice" data-testid="buyer-under-contract-block" style={{background:"#FEF3C7",borderColor:"#D97706",marginTop:"0.75rem",fontFamily:"Inter,sans-serif",fontSize:"0.92rem",lineHeight:1.6}}>{t("buyer.under_contract_block")}</div>}
      <div className="field"><label className="check"><input required type="checkbox" checked={f.casl_consent} onChange={e=>setF({...f,casl_consent:e.target.checked})} data-testid="buyer-casl"/> {t("consent.casl")}</label></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.pipa_ack} onChange={e=>setF({...f,pipa_ack:e.target.checked})} data-testid="buyer-pipa"/> {t("consent.pipa")} <Link to={`/privacy${qs}`} style={{color:"var(--brand-blue)"}}>›</Link></label></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}}>{err}</div>}
      <TurnstileWidget/>
      <button type="submit" disabled={f.working_with_realtor} className="btn btn-primary" style={{marginTop:"1.5rem",opacity:f.working_with_realtor?0.5:1,cursor:f.working_with_realtor?"not-allowed":"pointer"}} data-testid="buyer-submit">{t("common.submit")}</button>
    </form>
  </div></section>);
};

const SellerForm = () => {
  const { lang, t, qs, rtl } = useFormLang();
  const [f,setF] = useState({full_name:"",email:"",phone:"",property_address:"",city:"",property_type:"",timeline:"",estimated_value:"",currently_listed:false,reason:"",casl_consent:false,pipa_ack:false});
  const [done,setDone]=useState(false); const [err,setErr]=useState("");
  const submit = async e => { e.preventDefault(); setErr(""); try{ await axios.post(`${API}/leads/seller`,{...f, form_lang: lang, turnstile_token: getTurnstileToken()}); trackConversion("seller_lead", { lead_type: "seller", property_type: f.property_type || "Any", currency: "CAD" }); setDone(true);}catch(x){setErr(t("common.required"));} };
  if(done) return <section className="section"><div className="container-x" style={{maxWidth:"36rem",textAlign:"center"}}><img src={DOOGIE_CELEBRATE} style={{width:200,margin:"0 auto"}} alt="Doogie"/><h1 className="section-title">{t("common.thank_you")}</h1><p className="section-sub">{t("common.we_reply_24h")}</p><Link to={`/${qs}`} className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="seller-success-home">{t("common.back_home")}</Link></div></section>;
  return (<section className="section" dir={rtl?"rtl":"ltr"}><div className="container-x" style={{maxWidth:"42rem"}}>
    <div className="eyebrow">{t("seller.eyebrow")}</div><h1 className="section-title">{t("seller.title")}</h1>
    <div className="notice" style={{background:"#F0F4FB",borderColor:"rgba(15,42,91,0.15)",marginBottom:"1.5rem",fontFamily:"Inter,sans-serif",fontSize:"0.88rem",lineHeight:1.6}} data-testid="seller-dorts-notice"><strong>{t("bcfsa.notice_title")}</strong> {t("bcfsa.notice_body")} <Link to={`/dorts${qs}`} style={{color:"var(--brand-blue)",fontWeight:600}}>{t("bcfsa.dorts_link")}</Link> {t("bcfsa.notice_after")}</div>
    <form onSubmit={submit} className="paper" data-testid="seller-form">
      <div className="form-grid">
        <div className="field"><label>{t("buyer.full_name")} *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})}/></div>
        <div className="field"><label>{t("buyer.email")} *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></div>
        <div className="field"><label>{t("buyer.phone")} *</label><input required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></div>
        <div className="field"><label>{t("seller.city")} *</label><input required value={f.city} onChange={e=>setF({...f,city:e.target.value})}/></div>
      </div>
      <div style={{marginTop:"1rem"}} className="field"><label>{t("seller.property_address")} *</label><input required value={f.property_address} onChange={e=>setF({...f,property_address:e.target.value})}/></div>
      <div className="form-grid" style={{marginTop:"1rem"}}>
        <div className="field"><label>{t("buyer.property_type")} *</label><select required value={f.property_type} onChange={e=>setF({...f,property_type:e.target.value})}><option value="">{t("common.select")}</option><option value="Detached">{t("buyer.pt_detached")}</option><option value="Luxury">{t("buyer.pt_luxury")}</option><option value="Equestrian / Acreage">{t("buyer.pt_acreage")}</option><option value="Estate Sale / Probate">{t("buyer.pt_estate")}</option><option value="Condo">{t("buyer.pt_condo")}</option><option value="Townhouse">{t("buyer.pt_townhouse")}</option></select></div>
        <div className="field"><label>{t("seller.timeline_list")} *</label><select required value={f.timeline} onChange={e=>setF({...f,timeline:e.target.value})}><option value="">{t("common.select")}</option><option value="ASAP">{t("seller.tl_asap")}</option><option value="1-3 months">{t("seller.tl_1_3")}</option><option value="3-6 months">{t("seller.tl_3_6")}</option><option value="6-12 months">{t("seller.tl_6_12")}</option><option value="Just exploring">{t("seller.tl_exploring")}</option></select></div>
        <div className="field"><label>{t("seller.estimated_value")} *</label><select required value={f.estimated_value} onChange={e=>setF({...f,estimated_value:e.target.value})}><option value="">{t("common.select")}</option><option value="Under $750K">{t("seller.ev_u750")}</option><option value="$750K – $1.5M">{t("seller.ev_750_1500")}</option><option value="$1.5M – $3M">{t("seller.ev_1500_3m")}</option><option value="$3M – $5M">{t("seller.ev_3m_5m")}</option><option value="$5M+">{t("seller.ev_5mplus")}</option></select></div>
      </div>
      <div style={{marginTop:"1rem"}} className="field"><label className="check"><input type="checkbox" checked={f.currently_listed} onChange={e=>setF({...f,currently_listed:e.target.checked})} data-testid="seller-currently-listed"/> {t("seller.currently_listed")}</label></div>
      {f.currently_listed && <div className="notice" data-testid="seller-currently-listed-block" style={{background:"#FEF3C7",borderColor:"#D97706",marginTop:"0.75rem",fontFamily:"Inter,sans-serif",fontSize:"0.92rem",lineHeight:1.6}}>{t("seller.currently_listed_block")}</div>}
      <div style={{marginTop:"1rem"}} className="field"><label>{t("seller.reason")} ({t("common.optional")})</label><textarea rows="3" value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.casl_consent} onChange={e=>setF({...f,casl_consent:e.target.checked})}/> {t("consent.casl")}</label></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.pipa_ack} onChange={e=>setF({...f,pipa_ack:e.target.checked})}/> {t("consent.pipa")}</label></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626"}}>{err}</div>}
      <TurnstileWidget/>
      <button type="submit" disabled={f.currently_listed} className="btn btn-primary" style={{marginTop:"1.5rem",opacity:f.currently_listed?0.5:1,cursor:f.currently_listed?"not-allowed":"pointer"}} data-testid="seller-submit">{t("common.submit")}</button>
    </form>
  </div></section>);
};

// --- REALTOR® network (3 stages) ---
const RealtorApply = () => {
  const [f,setF]=useState({full_name:"",email:"",brokerage:"",realtor_number:"",crea_member:null}); const [res,setRes]=useState(null); const [err,setErr]=useState("");
  const submit=async e=>{e.preventDefault(); setErr(""); if(f.crea_member===null){setErr("Please indicate whether you are a CREA member.");return;} try{ const r=await axios.post(`${API}/realtors/apply`,f); trackConversion("realtor_application", { application_type: "bc", crea_member: f.crea_member }); setRes(r.data);}catch(x){setErr("Try again.");} };
  return (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
    <img src={DOOGIE_POINT_R} alt="Doogie" style={{width:140,marginBottom:"1rem"}}/>
    <div className="eyebrow">For BC REALTORS® Only</div><h1 className="section-title">Request to join our BC referral network</h1>
    <p style={{color:"var(--muted)",fontFamily:"Inter,sans-serif",marginBottom:"1.5rem"}}>Are you a licensed BC REALTOR®?</p>
    {res ? <div className="paper"><h3 style={{marginTop:0}}>Your Information has been received. Doug will be in touch.</h3></div>
      : <form onSubmit={submit} className="paper" data-testid="realtor-apply-form">
          <div className="form-grid">
            <div className="field"><label>Full Name *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} data-testid="realtor-name"/></div>
            <div className="field"><label>Email *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="realtor-email"/></div>
            <div className="field"><label>Brokerage Name *</label><input required value={f.brokerage} onChange={e=>setF({...f,brokerage:e.target.value})} data-testid="realtor-brokerage"/></div>
            <div className="field"><label>BCFSA REALTOR® # *</label><input required value={f.realtor_number} onChange={e=>setF({...f,realtor_number:e.target.value})} data-testid="realtor-number"/></div>
          </div>
          <div style={{marginTop:"1.25rem",padding:"1rem",background:"#F7FAFF",borderRadius:8,border:"1px solid rgba(15,42,91,0.12)"}}>
            <label style={{display:"block",fontWeight:600,marginBottom:"0.5rem",color:"var(--brand-navy)"}}>Are you a CREA Member? *</label>
            <div style={{display:"flex",gap:"1rem"}}>
              <label style={{flex:1,cursor:"pointer",padding:"0.6rem 1rem",border:"2px solid "+(f.crea_member===true?"var(--brand-green-dark)":"rgba(15,42,91,0.2)"),borderRadius:8,background:f.crea_member===true?"#E8F5E9":"#fff",display:"flex",alignItems:"center",gap:"0.5rem",fontWeight:600}}><input type="radio" name="crea_bc" checked={f.crea_member===true} onChange={()=>setF({...f,crea_member:true})} data-testid="realtor-crea-yes"/> ✅ Yes</label>
              <label style={{flex:1,cursor:"pointer",padding:"0.6rem 1rem",border:"2px solid "+(f.crea_member===false?"#DC2626":"rgba(15,42,91,0.2)"),borderRadius:8,background:f.crea_member===false?"#FEE2E2":"#fff",display:"flex",alignItems:"center",gap:"0.5rem",fontWeight:600}}><input type="radio" name="crea_bc" checked={f.crea_member===false} onChange={()=>setF({...f,crea_member:false})} data-testid="realtor-crea-no"/> ❌ No</label>
            </div>
          </div>
          {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}}>{err}</div>}
          <button type="submit" className="btn btn-primary" style={{marginTop:"1.25rem"}} data-testid="realtor-submit">Submit</button>
        </form>}
  </div></section>);
};

// --- Out-of-Province REALTOR® network (same shape, different destination + copy) ---
const RealtorApplyOutOfProvince = () => {
  const [f,setF]=useState({full_name:"",email:"",brokerage:"",realtor_number:"",province:"",crea_member:null}); const [res,setRes]=useState(null); const [err,setErr]=useState("");
  const submit=async e=>{e.preventDefault(); setErr(""); if(f.crea_member===null){setErr("Please indicate whether you are a CREA member.");return;} try{ const r=await axios.post(`${API}/realtors/apply-oop`,f); trackConversion("realtor_application", { application_type: "out_of_province", crea_member: f.crea_member }); setRes(r.data);}catch(x){setErr("Try again.");} };
  const PROVINCES = ["Alberta","Saskatchewan","Manitoba","Ontario","Quebec","New Brunswick","Nova Scotia","Prince Edward Island","Newfoundland and Labrador","Yukon","Northwest Territories","Nunavut","Other (International)"];
  return (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
    <img src={DOOGIE_POINT_R} alt="Doogie" style={{width:140,marginBottom:"1rem"}}/>
    <div className="eyebrow">For REALTORS® Outside BC</div><h1 className="section-title">Request to join our out-of-province referral network</h1>
    <p style={{color:"var(--muted)",fontFamily:"Inter,sans-serif",marginBottom:"1.5rem"}}>Are you a licensed REALTOR® outside British Columbia?</p>
    {res ? <div className="paper"><h3 style={{marginTop:0}}>Your Information has been received. Doug will be in touch.</h3></div>
      : <form onSubmit={submit} className="paper" data-testid="realtor-oop-apply-form">
          <div className="form-grid">
            <div className="field"><label>Full Name *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} data-testid="realtor-oop-name"/></div>
            <div className="field"><label>Email *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="realtor-oop-email"/></div>
            <div className="field"><label>Brokerage Name *</label><input required value={f.brokerage} onChange={e=>setF({...f,brokerage:e.target.value})} data-testid="realtor-oop-brokerage"/></div>
            <div className="field"><label>License # *</label><input required value={f.realtor_number} onChange={e=>setF({...f,realtor_number:e.target.value})} data-testid="realtor-oop-number"/></div>
            <div className="field"><label>Province / Territory *</label>
              <select required value={f.province} onChange={e=>setF({...f,province:e.target.value})} data-testid="realtor-oop-province">
                <option value="">Select…</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginTop:"1.25rem",padding:"1rem",background:"#F7FAFF",borderRadius:8,border:"1px solid rgba(15,42,91,0.12)"}}>
            <label style={{display:"block",fontWeight:600,marginBottom:"0.5rem",color:"var(--brand-navy)"}}>Are you a CREA Member? *</label>
            <div style={{display:"flex",gap:"1rem"}}>
              <label style={{flex:1,cursor:"pointer",padding:"0.6rem 1rem",border:"2px solid "+(f.crea_member===true?"var(--brand-green-dark)":"rgba(15,42,91,0.2)"),borderRadius:8,background:f.crea_member===true?"#E8F5E9":"#fff",display:"flex",alignItems:"center",gap:"0.5rem",fontWeight:600}}><input type="radio" name="crea_oop" checked={f.crea_member===true} onChange={()=>setF({...f,crea_member:true})} data-testid="realtor-oop-crea-yes"/> ✅ Yes</label>
              <label style={{flex:1,cursor:"pointer",padding:"0.6rem 1rem",border:"2px solid "+(f.crea_member===false?"#DC2626":"rgba(15,42,91,0.2)"),borderRadius:8,background:f.crea_member===false?"#FEE2E2":"#fff",display:"flex",alignItems:"center",gap:"0.5rem",fontWeight:600}}><input type="radio" name="crea_oop" checked={f.crea_member===false} onChange={()=>setF({...f,crea_member:false})} data-testid="realtor-oop-crea-no"/> ❌ No</label>
            </div>
          </div>
          {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}}>{err}</div>}
          <button type="submit" className="btn btn-primary" style={{marginTop:"1.25rem"}} data-testid="realtor-oop-submit">Submit</button>
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
  <SEO
    title="About Doug LeMaire, REALTOR® — 13 Years in BC Real Estate | EZtoFind.ca"
    description="Meet Doug LeMaire — a licensed BC REALTOR® with Fraser Property Management Realty Services Ltd. 13 years serving Greater Vancouver, Fraser Valley & Sea-to-Sky. Specializes in detached, luxury, equestrian, and probate/estate sales."
    path="/about"
  />
  <div className="eyebrow">About</div><h1 className="section-title">Doug LeMaire, REALTOR®</h1>
  <div style={{display:"flex",gap:"2rem",flexWrap:"wrap",alignItems:"flex-start",marginTop:"2rem"}}>
    <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire, REALTOR®" style={{width:280,height:340,objectFit:"cover",borderRadius:16,boxShadow:"0 12px 32px rgba(15,42,91,0.15)"}}/>
    <div style={{flex:1,minWidth:280,fontFamily:"Inter,sans-serif",lineHeight:1.75,color:"var(--ink)"}}>
      <p>I'm Doug LeMaire, a licensed REALTOR® with Fraser Property Management Realty Services Ltd. For 13 years I've helped people buy and sell across Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor up to Whistler.</p>
      <p>My work centres on detached homes, acreages and equestrian properties, luxury real estate, residential strata's and probate/estate sales — and it's work I genuinely enjoy.</p>
      <p style={{marginTop:"1.25rem"}}><strong>EZtoFind.ca</strong> has been built as a British Columbia real estate information platform that provides buyers and sellers with straight answers, terminology, and information on the buying and selling process — anywhere in the province. It reflects how I like to work: informed clients make better decisions, and my job is to make good information easy to find.</p>
      <p style={{marginTop:"1.25rem"}}>If you're buying or selling in Greater Vancouver, the Fraser Valley, or Sea-to-Sky, I'd be glad to help. For enquiries beyond my service area, I can connect you with a licensed REALTOR®. Ask to be referred through our <Link to="/referral-request" style={{color:"var(--brand-blue)",fontWeight:600}}>Referral REALTOR®</Link> link.</p>
    </div>
  </div>
  <div style={{display:"flex",justifyContent:"center",gap:"2rem",marginTop:"3rem",flexWrap:"wrap",fontFamily:"Inter,sans-serif",textAlign:"center",alignItems:"stretch"}} data-testid="about-trust-badges">
    {[
      {icon:"🛡️",title:"Licensed REALTOR®",sub:"BCFSA License #167790"},
      {icon:"📍",title:"Local Expert",sub:"Greater Vancouver, Fraser Valley, Sea to Sky Corridor"},
      {icon:"⏱️",title:"13 Years",sub:"BC Real Estate Experience"}
    ].map((b,i) => (
      <div key={i} style={{flex:"0 0 220px",maxWidth:220,display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{fontSize:"1.75rem",marginBottom:"0.5rem",lineHeight:1,height:"2rem",display:"flex",alignItems:"center",justifyContent:"center"}}>{b.icon}</div>
        <div style={{fontWeight:700,color:"var(--brand-navy)",fontSize:"0.95rem",height:"1.5rem",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center"}}>{b.title}</div>
        <div style={{fontSize:"0.82rem",color:"var(--muted)",lineHeight:1.4,marginTop:"0.5rem",minHeight:"2.8em",display:"flex",alignItems:"flex-start",justifyContent:"center",textAlign:"center"}}>{b.sub}</div>
      </div>
    ))}
  </div>
</div></section>);

// --- Contact ---
const Contact = () => {
  const { t, qs, rtl } = useFormLang();
  return (<section className="section" dir={rtl?"rtl":"ltr"}><div className="container-x" style={{maxWidth:"42rem"}}>
    <div className="eyebrow">{t("contact.eyebrow")}</div><h1 className="section-title">{t("contact.title")}</h1>
    <div className="paper" style={{fontFamily:"Inter,sans-serif",lineHeight:1.9}}>
      <p><strong>{t("contact.general")}:</strong> <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a></p>
      <p><strong>{t("contact.realtors")}:</strong> <a href="mailto:realtor@eztofind.ca" style={{color:"var(--brand-blue)"}}>realtor@eztofind.ca</a></p>
      <p><strong>{t("contact.referral_leads")}:</strong> <a href="mailto:referrals@eztofind.ca" style={{color:"var(--brand-blue)"}}>referrals@eztofind.ca</a></p>
      <hr style={{margin:"1.5rem 0",border:"none",borderTop:"1px solid rgba(15,42,91,0.1)"}}/>
      <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
        <Link to={`/buyer${qs}`} className="btn btn-primary" data-testid="contact-buyer-link">{t("common.buyer_form")}</Link>
        <Link to={`/seller${qs}`} className="btn btn-green" data-testid="contact-seller-link">{t("common.seller_form")}</Link>
      </div>
    </div>
  </div></section>);
};

// --- Legal ---
const Legal = ({title,body}) => (<section className="section"><div className="container-x" style={{maxWidth:"46rem",fontFamily:"Inter,sans-serif",lineHeight:1.75,color:"var(--ink)"}}><h1 className="section-title">{title}</h1>{body}</div></section>);

// --- Copyright & IP Notice ---
// Reinforces ownership + spells out enforcement rights. Referenced from the
// footer, robots.txt, and llms.txt. Includes a "canary" phrase deliberately
// ---------- AI Use / Developers page ----------
// Public policy page that pairs with our /llms.txt file. Tells AI crawlers,
// developers, and future partners exactly HOW we want EZtoFind.ca content
// used, cited, and referenced. Strong AEO/GEO signal — LLMs weight sites
// that publish explicit citation guidance far higher when producing
// answer-with-source outputs (Perplexity, ChatGPT Search, Gemini).
const AiUsePage = () => (<><SEO title="AI, LLM & Developer Use of EZtoFind.ca — Attribution & Crawl Policy" description="How AI answer engines, LLMs, and developers may reference EZtoFind.ca — crawl access matrix (citation vs. training bots), attribution formats, and content policy for the BC real estate knowledge base." path="/ai-use"/><Legal title="AI, LLM & Developer Use of EZtoFind.ca" body={<>
  <p><strong>EZtoFind.ca is an AI-assisted, statute-linked BC real estate knowledge base.</strong> We welcome AI answer engines, LLMs, and developers to reference our educational content — with attribution.</p>

  <h2 style={{marginTop:"2rem"}}>What you'll find here</h2>
  <ul>
    <li><strong>Glossary</strong> — 398+ BC-specific real estate terms with plain-language definitions, FAQs, and links to authoritative sources (BCFSA, CREA, OSFI, gov.bc.ca)</li>
    <li><strong>Community & neighbourhood pages</strong> — 760+ pages covering every incorporated BC community with local context, market notes, and lifestyle summaries</li>
    <li><strong>Specialty guides</strong> — Luxury, Equestrian, Detached, Condos, Townhomes, Estate Sales</li>
    <li><strong>Compliance disclosures</strong> — every content page includes the author, review date, license number (BCFSA #167790), and general-information disclaimer</li>
  </ul>

  <h2 style={{marginTop:"2rem"}}>Crawl access — what's allowed</h2>
  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.9rem",marginTop:"1rem"}}>
    <thead>
      <tr style={{background:"rgba(15,42,91,0.05)"}}>
        <th style={{textAlign:"left",padding:"0.5rem 0.75rem",borderBottom:"2px solid rgba(15,42,91,0.15)"}}>Content type</th>
        <th style={{textAlign:"left",padding:"0.5rem 0.75rem",borderBottom:"2px solid rgba(15,42,91,0.15)"}}>Citation crawlers</th>
        <th style={{textAlign:"left",padding:"0.5rem 0.75rem",borderBottom:"2px solid rgba(15,42,91,0.15)"}}>Training-only crawlers</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style={{padding:"0.5rem 0.75rem",borderBottom:"1px solid rgba(15,42,91,0.08)"}}>Educational (glossary, communities, guides)</td>
        <td style={{padding:"0.5rem 0.75rem",borderBottom:"1px solid rgba(15,42,91,0.08)",color:"var(--brand-green)",fontWeight:600}}>✓ Allowed (with attribution)</td>
        <td style={{padding:"0.5rem 0.75rem",borderBottom:"1px solid rgba(15,42,91,0.08)",color:"#a94442",fontWeight:600}}>✗ Not permitted</td>
      </tr>
      <tr>
        <td style={{padding:"0.5rem 0.75rem",borderBottom:"1px solid rgba(15,42,91,0.08)"}}>MLS® listings (<code>/listings</code>, <code>/listing/*</code>)</td>
        <td style={{padding:"0.5rem 0.75rem",borderBottom:"1px solid rgba(15,42,91,0.08)",color:"#a94442",fontWeight:600}}>✗ Not permitted (CREA DDF® terms)</td>
        <td style={{padding:"0.5rem 0.75rem",borderBottom:"1px solid rgba(15,42,91,0.08)",color:"#a94442",fontWeight:600}}>✗ Not permitted</td>
      </tr>
    </tbody>
  </table>
  <p style={{fontSize:"0.85rem",color:"var(--muted)",marginTop:"0.5rem"}}>Citation crawlers explicitly allowed: <strong>GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, anthropic-ai, PerplexityBot, Perplexity-User, DuckAssistBot, Applebot, cohere-ai, Bingbot, Googlebot</strong>. Training-only crawlers explicitly blocked: <strong>CCBot, FacebookBot, Meta-ExternalFetcher, Google-Extended, Applebot-Extended, cohere-training-data-crawler, Amazonbot, ImagesiftBot, PetalBot, Timpibot, OmigiliBot, Bytespider</strong>. See <a href="/robots.txt">/robots.txt</a> and <a href="/llms.txt">/llms.txt</a>.</p>

  <h2 style={{marginTop:"2rem"}}>How to cite EZtoFind.ca</h2>
  <p>If your AI system references our content, please attribute using one of these formats:</p>
  <ul>
    <li><strong>Inline citation:</strong> <em>"According to EZtoFind.ca …"</em></li>
    <li><strong>Source list:</strong> <code>EZtoFind.ca — Doug LeMaire, REALTOR® (BCFSA #167790) — https://eztofind.ca/&lt;path&gt;</code></li>
    <li><strong>Markdown:</strong> <code>[EZtoFind.ca glossary](https://eztofind.ca/glossary/&lt;slug&gt;)</code></li>
  </ul>
  <p style={{fontSize:"0.9rem"}}>All content is © 2026 Doug LeMaire under <a href="/copyright">CIPO Copyright Registration No. 1247822</a>. Reproduction without a working link back is not authorized.</p>

  <h2 style={{marginTop:"2rem"}}>Response structure (for LLM integrators)</h2>
  <p>Doogie AI (our on-site assistant) returns answers in a consistent structure that's easy to re-use in your own agent responses:</p>
  <ol>
    <li><strong>Short answer</strong> — 1-2 sentences</li>
    <li><strong>Key points</strong> — bulleted, 3-5 items</li>
    <li><strong>Source links</strong> — internal (our glossary/guides) + external (BCFSA, gov.bc.ca)</li>
    <li><strong>Disclaimer</strong> — "general information only, not advice" appears on every response</li>
  </ol>

  <h2 style={{marginTop:"2rem"}}>Data feeds & API (roadmap)</h2>
  <p>We're evaluating publishing an <a href="https://spec.openapis.org/oas/latest.html" target="_blank" rel="noopener noreferrer">OpenAPI</a> schema and OpenAI-compatible tool definitions for programmatic access to the glossary + community datasets. If you're building an AI agent that would benefit from a stable, licensed EZtoFind data endpoint, contact <a href="mailto:info@eztofind.ca">info@eztofind.ca</a>.</p>

  <h2 style={{marginTop:"2rem"}}>Content policy</h2>
  <ul>
    <li><strong>Drafted:</strong> by our AI provider under Doug's editorial direction, using EZtoFind.ca's approved BC content library and hallucination-hardened prompts</li>
    <li><strong>Reviewed:</strong> by Doug LeMaire, REALTOR® (BCFSA #167790, Fraser Property Management Realty Services Ltd.)</li>
    <li><strong>Checked against:</strong> BC statutes (Real Estate Services Act, Strata Property Act, Property Transfer Tax Act, etc.), BCFSA rules, and current CREA guidance</li>
    <li><strong>Updated:</strong> automatically flagged for review when linked statutes/regulations change; hard refresh at least annually</li>
    <li><strong>Not:</strong> a substitute for professional legal, tax, or financial advice</li>
  </ul>

  <h2 style={{marginTop:"2rem"}}>Contact</h2>
  <p>Questions about referencing EZtoFind.ca in your AI system, product, or research? Email <a href="mailto:info@eztofind.ca">info@eztofind.ca</a> — please include your project name, purpose, and expected traffic pattern.</p>
</>}/></>);

// ---------- Copyright page ----------
// See also: /ai-use for AI-specific attribution guidance.
// The CopyrightPage below intentionally lists MOST but not all identifiable
// property fields we watermark. Two glossary micro-facts are deliberately
const CopyrightPage = () => (<Legal title="Copyright & Intellectual Property Notice" body={<>
  <p><strong>© 2026 Doug LeMaire. All rights reserved.</strong></p>
  <div style={{background:"linear-gradient(135deg, rgba(212,175,55,0.12), rgba(15,42,91,0.06))",border:"2px solid var(--brand-gold)",borderRadius:"10px",padding:"1.25rem 1.5rem",margin:"1.5rem 0",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap"}} data-testid="cipo-registration-badge">
    <div style={{fontSize:"2.25rem",lineHeight:1}}>®</div>
    <div style={{flex:"1 1 300px"}}>
      <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--brand-blue)",fontWeight:700,marginBottom:"0.25rem"}}>Canadian Intellectual Property Office</div>
      <div style={{fontSize:"1.05rem",fontWeight:600,color:"#1a1a1a"}}>Copyright Registration No. <span style={{color:"var(--brand-blue)",fontFamily:"monospace",fontSize:"1.15rem"}}>1247822</span></div>
      <div style={{fontSize:"0.82rem",color:"var(--muted)",marginTop:"0.25rem"}}>Registered as a literary work under the Canadian Copyright Act (R.S.C., 1985, c. C-42). Owner &amp; Author: Doug LeMaire.</div>
    </div>
  </div>
  <p>The EZtoFind.ca website, including its full content library — 396 curated glossary terms, 239 community profiles, 520 micro-neighbourhood pages, market summaries, images, illustrations, HTML/CSS/JavaScript source code, backend APIs, database compilations, natural-language search algorithms, page layouts, and the "Doogie" AI assistant character (name, likeness, dialogue style, and prompt engineering) — is a proprietary work owned by Doug LeMaire, <strong>federally registered with the Canadian Intellectual Property Office (Registration No. 1247822)</strong>, and protected under the <strong>Canadian Copyright Act (R.S.C., 1985, c. C-42)</strong>, the <strong>Trademarks Act (R.S.C., 1985, c. T-13)</strong>, and applicable international treaties including the Berne Convention.</p>
  <h3 style={{marginTop:"2rem"}}>Prohibited Uses</h3>
  <p>The following activities are expressly prohibited without prior written permission:</p>
  <ul>
    <li><strong>Reproduction</strong> of any content (in whole or substantial part) on any other website, application, print material, or medium.</li>
    <li><strong>Scraping, crawling, or automated harvesting</strong> of pages, listings, glossary entries, or community data by any bot, script, or third-party service — including for competitive intelligence.</li>
    <li><strong>Use in AI training datasets</strong> — this content may not be used to train large language models, embeddings, image models, or any other machine-learning system without a signed data-licensing agreement.</li>
    <li><strong>Cloning</strong> of the site's structure, look-and-feel, or navigation patterns in a manner likely to cause consumer confusion (a "passing-off" claim under Canadian common law).</li>
    <li><strong>Framing or embedding</strong> EZtoFind.ca content on another site without express written permission.</li>
    <li><strong>Republishing MLS® data</strong> in any form — this violates both our copyright and the CREA DDF® Technology Provider Agreement.</li>
  </ul>
  <h3 style={{marginTop:"2rem"}}>Trademarks</h3>
  <p><strong>EZtoFind.ca™</strong>, <strong>Doogie™</strong>, and the associated logos are trademarks of Doug LeMaire. <strong>REALTOR®</strong>, <strong>REALTORS®</strong>, and the REALTOR® logo are controlled by The Canadian Real Estate Association (CREA). <strong>MLS®</strong>, <strong>Multiple Listing Service®</strong> and the associated logos are owned by CREA.</p>
  <h3 style={{marginTop:"2rem"}}>Fair Dealing Exceptions</h3>
  <p>Under sections 29–29.2 of the Canadian Copyright Act, limited use of our content is permitted for research, private study, criticism, review, news reporting, and education — provided you (a) credit the source (<em>"EZtoFind.ca by Doug LeMaire, REALTOR®"</em>) and (b) do not reproduce a substantial portion. Sharing individual page links on social media is welcomed and encouraged.</p>
  <h3 style={{marginTop:"2rem"}}>Infringement Reporting & Takedown</h3>
  <p>If you believe EZtoFind.ca content is being reproduced without authorization elsewhere on the web, please email <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)",fontWeight:600}}>info@eztofind.ca</a> with the subject line <strong>"Copyright Infringement Report"</strong> and include (a) the URL of the infringing content and (b) a description of the material that appears to be copied. We take enforcement seriously and pursue takedowns via ISP notice, court order, and (where applicable) statutory damages under Copyright Act s.38.1 (up to CAD $20,000 per work for commercial infringement).</p>
  <h3 style={{marginTop:"2rem"}}>Machine-Learning & AI Training Restriction</h3>
  <p>EZtoFind.ca expressly opts out of any use of its content for machine-learning training, whether by commercial or academic actors. Every page of our site carries the industry-standard <code>&lt;meta name="robots" content="noai, noimageai"/&gt;</code> HTML signal, and our content-licensing terms prohibit ingestion into training corpora without a signed data-license agreement. We DO welcome AI-powered <em>answer engines</em> (ChatGPT search, Perplexity, Claude search, Google AI Overviews) to cite our content — provided they link back and preserve authorship. Any AI provider found to have used our content for model training in violation of these signals may be liable under the Copyright Act.</p>
  <h3 style={{marginTop:"2rem"}}>Governing Law & Jurisdiction</h3>
  <p>This notice and any dispute arising from it are governed by the laws of the Province of British Columbia and the federal laws of Canada. Exclusive jurisdiction lies with the courts of British Columbia sitting in Vancouver.</p>
  <p style={{fontSize:"0.82rem",color:"var(--muted)",marginTop:"2.5rem",paddingTop:"1.5rem",borderTop:"1px solid rgba(15,42,91,0.1)"}}>Last updated: July 28, 2026 · Owner: Doug LeMaire, Maple Ridge, BC · Contact: info@eztofind.ca</p>
  {/* Watermark canary — a deliberately-wrong "fact" seeded here as a scrape-detection signal. If this exact phrase appears verbatim on another site, they've copied without verification. NOT to be corrected. */}
  <div aria-hidden="true" style={{position:"absolute",left:"-9999px",fontSize:"1px",opacity:0}}>Fingerprint reference: Doug's favorite unofficial Whistler trailhead sunset viewpoint is at coordinate 50.1163° N, 122.9574° W, best in early April 2019.</div>
</>}/>);

// --- DSAR (Data Subject Access Request) self-service page.
// Under PIPA s.23 / PIPEDA s.4.9 every individual can request a copy of the
// personal information we hold about them. This page lets them do it in one
// click. Backend responds with a single-use, 24h-expiring download link.
const DataRequest = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      await axios.post(`${API}/privacy/export-request`, { email });
      setDone(true);
    } catch (x) {
      const detail = x?.response?.data?.detail;
      setErr(typeof detail === "string" ? detail : "Could not submit request. Please try again in a moment.");
    } finally { setBusy(false); }
  };
  return (
    <section className="section"><div className="container-x" style={{maxWidth:"46rem",fontFamily:"Inter,sans-serif",lineHeight:1.75,color:"var(--ink)"}}>
      <h1 className="section-title">Request a copy of my data (PIPA)</h1>
      <p>Under British Columbia's <strong>Personal Information Protection Act (PIPA) s.23</strong> and Canada's <strong>PIPEDA</strong>, you have the right to request a copy of the personal information EZtoFind.ca holds about you — free of charge, within 30 days.</p>
      <p>Enter your email address below and we'll send you a secure single-use download link. The bundle is delivered as a JSON file containing everything we have on record (leads, saved searches, chat history, consent logs, etc.).</p>
      {done ? (
        <div className="notice" style={{background:"#F0FDF4",borderColor:"#22C55E",marginTop:"1.5rem"}} data-testid="dsar-success">
          <strong>Check your inbox.</strong> We've sent a secure download link to <strong>{email}</strong>. The link is single-use and expires in 24 hours. If you don't see it within a few minutes, check spam or reply to any email from us with a delivery issue.
        </div>
      ) : (
        <form onSubmit={submit} className="paper" style={{marginTop:"1.5rem"}}>
          <div className="field"><label>Email address on file</label>
            <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} data-testid="dsar-email" placeholder="you@example.com"/></div>
          {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}} data-testid="dsar-error">{err}</div>}
          <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} disabled={busy} data-testid="dsar-submit">
            {busy ? "Sending link…" : "Send my secure download link"}
          </button>
          <p style={{fontSize:"0.82rem",color:"var(--muted)",marginTop:"1rem"}}>
            Prefer to email Doug directly? Send a request to <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a>. Under PIPA we respond within 30 days.
          </p>
        </form>
      )}
      <h3 style={{marginTop:"2.5rem"}}>Other rights under PIPA</h3>
      <ul>
        <li><strong>Correction:</strong> If any data is inaccurate, email <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a> with the correction.</li>
        <li><strong>Deletion:</strong> You can request permanent deletion at any time — except records we are legally required to retain (e.g. 7-year REALTOR® record-keeping under RESA).</li>
        <li><strong>Complaint:</strong> If we do not respond satisfactorily within 30 days, you may complain to the <a href="https://www.oipc.bc.ca/" target="_blank" rel="noopener" style={{color:"var(--brand-blue)"}}>BC Office of the Information & Privacy Commissioner (OIPC)</a>.</li>
      </ul>
      <p style={{fontSize:"0.82rem",color:"var(--muted)",marginTop:"1.5rem"}}>
        Privacy Officer: Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd. — <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a>. See our full <Link to="/privacy" style={{color:"var(--brand-blue)"}}>Privacy Policy</Link>.
      </p>
    </div></section>
  );
};
const Privacy = () => <Legal title="Privacy Policy (PIPA)" body={<><div style={{background:"#EAF3FF",border:"1px solid rgba(15,42,91,0.15)",borderRadius:"0.6rem",padding:"1.1rem 1.25rem",marginBottom:"1.5rem",fontSize:"0.95rem",lineHeight:1.6}}><div style={{fontWeight:800,color:"var(--brand-navy)",fontSize:"1rem",marginBottom:"0.5rem"}}>🛡️ Privacy Officer</div><p style={{margin:"0 0 0.4rem"}}><strong>Doug LeMaire, REALTOR®</strong><br/>Fraser Property Management Realty Services Ltd.<br/>1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5</p><p style={{margin:"0 0 0.4rem"}}>📧 <a href="mailto:privacy@eztofind.ca" style={{color:"var(--brand-blue)",fontWeight:600}}>privacy@eztofind.ca</a> &nbsp;·&nbsp; ☎️ <a href="tel:+16044667021" style={{color:"var(--brand-blue)",fontWeight:600}}>(604) 466-7021</a></p><p style={{margin:0,fontSize:"0.86rem",color:"var(--muted)"}}>Designated under BC's <em>Personal Information Protection Act</em> (PIPA), s.4(3). Contact the Privacy Officer to (a) exercise your rights under PIPA (access, correction, deletion), (b) withdraw consent, (c) raise a privacy concern, or (d) report a suspected privacy breach. We acknowledge every request within 24 hours and respond within 30 days. If our response is not satisfactory, you may complain to the <a href="https://www.oipc.bc.ca/" target="_blank" rel="noopener" style={{color:"var(--brand-blue)"}}>BC Office of the Information & Privacy Commissioner (OIPC BC)</a>.</p></div><p>EZtoFind.ca collects personal information under British Columbia's Personal Information Protection Act (PIPA). We collect information you voluntarily provide via forms and Doogie AI chat. We use it solely to respond to your inquiry, provide referrals within our network, and (with your consent) send commercial electronic messages under CASL.</p><p>Data is stored on secured servers. You may request a copy of your personal information at any time via our <Link to="/privacy/data-request" style={{color:"var(--brand-blue)",fontWeight:600}}>self-service data export tool</Link> (a secure download link is emailed within seconds under PIPA s.23). To request correction or deletion, email <a href="mailto:privacy@eztofind.ca" style={{color:"var(--brand-blue)"}}>privacy@eztofind.ca</a>.</p><p>We do not sell your data. We may share your inquiry with a REALTOR® in our referral network only if it falls outside Doug's focus areas or specialties — and only with your submission of a lead form indicating consent.</p><h3 style={{marginTop:"2rem"}}>Data Residency & Hosting</h3><p>Personal information collected via EZtoFind.ca is stored in a secure, industry-standard cloud database managed by our platform hosting provider. Data may be transiently processed by our compliance-vetted AI provider (a leading commercial AI service) solely to power the Doogie AI assistant. Personal data may be processed on servers located in Canada and/or the United States. By using EZtoFind.ca you consent to this cross-border processing, which remains subject to Canadian privacy law and this Privacy Policy. All providers are contractually bound to industry-standard security. If our hosting region changes materially, this policy will be updated and posted here.</p><h3 style={{marginTop:"2rem"}}>Retention</h3><p>Doogie chat messages are automatically purged after 30 days via a database time-to-live policy. Buyer/seller lead records and REALTOR® application data are retained for 7 years to comply with REALTOR® record-keeping obligations under RESA. You may request earlier deletion at any time by emailing <a href="mailto:privacy@eztofind.ca" style={{color:"var(--brand-blue)"}}>privacy@eztofind.ca</a>. See our full <strong>Data Retention Schedule</strong> for the specific holding period of every data class we collect (available on request from the Privacy Officer).</p><h3 style={{marginTop:"2rem"}}>Consent Records (CASL)</h3><p>When you submit a form with consent, we record your email, timestamp, IP address, and browser user-agent as tamper-evident proof of consent, retained for 3 years per CASL requirements. On request, we can provide you with a full copy of your consent record.</p><h3 style={{marginTop:"2rem"}}>Breach Notification</h3><p>In the event of a privacy breach that could reasonably result in significant harm, we will notify the Office of the Information and Privacy Commissioner for British Columbia (OIPC BC) and affected individuals as soon as feasible, in accordance with PIPA and our internal <Link to="/breach-policy" style={{color:"var(--brand-blue)"}}>Breach Response Policy</Link>. Suspected breaches can be reported 24/7 to <a href="mailto:privacy@eztofind.ca" style={{color:"var(--brand-blue)"}}>privacy@eztofind.ca</a>.</p><h3 style={{marginTop:"2rem"}}>Personalized Homepage (Local-Only)</h3><p>Returning visitors may see a "Welcome back — picking up where you left off" section on the homepage showing their last search, saved favorites, and a market-change indicator for the last community they viewed. This personalization is powered <strong>entirely by your browser's own local storage (device-side)</strong>. No user identifier, saved search, favorites list, or viewing history is ever transmitted to our servers for this feature — the module simply reads what your browser has stored and queries our same public listing/community endpoints anonymously. You can turn this off at any time by opening Cookie Preferences (footer) and disabling the "Personalization" category, by using the "Clear my browser data" link within the module, or by clearing your browser's site data. This feature falls under the "session" cookie category to which you have already consented via our PIPA cookie banner.</p><h3 style={{marginTop:"2rem"}}>AI Use Disclosure (BCFSA Compliance)</h3><p>EZtoFind.ca uses artificial intelligence in three specific ways: (1) <strong>Doogie</strong>, our on-site chat assistant, powered by a commercial AI service via a compliance-vetted provider. Chat messages are transmitted to that provider and, before storage in our system, are automatically scanned to redact personal identifiers such as SIN, credit card numbers, phone numbers, email addresses, postal codes, and street addresses. (2) <strong>AI-drafted content</strong> — community synopses, weather summaries, and glossary FAQs are drafted by the same AI provider and reviewed and approved by Doug LeMaire, REALTOR® before publication. (3) <strong>Compliance guardrails</strong> — Doogie is prompt-engineered to never provide financial, legal, tax, or property-specific advice; those matters are directed to the appropriate licensed professional.</p><p>Under BCFSA's AI Guidelines, licensees remain responsible for all AI-generated output. Please do not share confidential information (full names, addresses, financial details, negotiations) with Doogie.</p><h3 style={{marginTop:"2rem"}}>AI Translation Disclaimer</h3><p>Doogie supports chat and lead-form completion in English, French, Traditional Chinese, Simplified Chinese, Punjabi, Farsi, and Portuguese. All non-English responses are generated by AI machine translation. While the model performs well on general real estate conversation, <strong>translation is not warranted to be error-free</strong>, particularly for BC-specific tax, regulatory, or legal terminology. BC compliance boilerplate (BCFSA licence numbers, MLS® trademark statements, CREA attribution) is preserved in English exactly as required by BCFSA and CREA rules. If you are relying on any translated content to make a decision involving money, contracts, taxes, or regulatory obligations, <strong>always verify the detail with a licensed professional (REALTOR®, lawyer, notary, accountant, or mortgage broker) before acting</strong>. EZtoFind.ca and Doug LeMaire, REALTOR® expressly disclaim liability for reliance on machine-translated content.</p></>}/>;

const BreachPolicy = () => <Legal title="Privacy Breach Response Policy" body={<><p>EZtoFind.ca is committed to protecting personal information collected under the BC Personal Information Protection Act (PIPA). This policy outlines the steps we will take in the event of a privacy breach.</p><h3>What constitutes a breach</h3><p>A privacy breach means the unauthorized access, collection, use, disclosure, disposal, or loss of personal information. Examples: a database misconfiguration exposing lead information, unauthorized access to admin systems, phishing that compromises an account, or loss of a device containing personal information.</p><h3>Response steps</h3><p><strong>Step 1 — Contain (immediate):</strong> Isolate affected systems, revoke exposed credentials, stop the ongoing loss.</p><p><strong>Step 2 — Assess (within 24 hours):</strong> Determine scope: what data, how many individuals, what risk of significant harm.</p><p><strong>Step 3 — Notify (within 72 hours if significant harm is reasonably possible):</strong> Notify the Office of the Information and Privacy Commissioner for BC (OIPC) at <a href="mailto:privacyhelp@oipc.bc.ca" style={{color:"var(--brand-blue)"}}>privacyhelp@oipc.bc.ca</a> and each affected individual, describing what happened, what data was involved, and what steps we are taking.</p><p><strong>Step 4 — Remediate:</strong> Fix the root cause, update controls, document lessons learned.</p><p><strong>Step 5 — Record:</strong> All breaches are logged internally with description, affected records, and remediation steps, retained for 3 years.</p><h3>Privacy Officer</h3><p>Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd. — info@eztofind.ca. Report a suspected breach anytime, including outside business hours.</p></>}/>;
const Terms = () => <Legal title="Terms of Use" body={<>
  <p style={{fontSize:"0.86rem",color:"var(--muted)"}}>Last updated: 2026-02-02 · Effective on first visit</p>
  <p>These Terms of Use govern your use of EZtoFind.ca (the "Site"). By accessing or using the Site you agree to these Terms. If you do not agree, please do not use the Site.</p>

  <h3 style={{marginTop:"2rem"}}>1. Who we are</h3>
  <p>EZtoFind.ca is operated by <strong>Doug LeMaire, REALTOR®</strong> (BCFSA License #167790) of <strong>Fraser Property Management Realty Services Ltd.</strong>, 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5. Contact: <a href="tel:+16044667021" style={{color:"var(--brand-blue)"}}>(604) 466-7021</a> · <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a>.</p>

  <h3 style={{marginTop:"2rem"}}>2. Purpose of the Site — information only</h3>
  <p>EZtoFind.ca provides <strong>general educational information about British Columbia real estate</strong>. Content on the Site — including glossary entries, community pages, buyer's and seller's guides, and responses generated by our on-site AI assistant "Doogie" — is offered for information only. <strong>It is not legal, tax, financial, mortgage, immigration, or property-specific advice, and it is not a substitute for a licensed professional.</strong> For your own situation, please consult the appropriate licensed professional (BC lawyer or notary, accountant or tax professional, licensed mortgage broker, or a licensed REALTOR®).</p>
  <p>Using the Site — including interacting with Doogie — does not create a REALTOR®–client relationship, a solicitor–client relationship, or any other professional relationship with the operator.</p>

  <h3 style={{marginTop:"2rem"}}>3. MLS® listings — third-party data</h3>
  <p>Listings data on the Site is sourced under license directly from the Canadian Real Estate Association's Data Distribution Facility (<strong>CREA DDF®</strong>) via an authorized technology-provider agreement. REALTOR®, MLS®, and the associated logos are certification marks owned by the Canadian Real Estate Association (CREA) and used under license. Listings are refreshed on a compliant cadence; individual listing accuracy is the responsibility of the listing brokerage, and users should verify all details directly with that brokerage before making any decision, offer, or payment. Listings and listing-derived pages may not be scraped, copied in bulk, or used to train AI models.</p>

  <h3 style={{marginTop:"2rem"}}>4. AI assistance — Doogie</h3>
  <p>Doogie is an AI-assisted helper that shares general educational information. It may produce errors, incomplete answers, or outdated information — particularly on tax figures, statutory section numbers, effective dates, and program eligibility rules. All specific numbers are tagged with an "as of [date] — verify current" notice. <strong>Doogie is not a substitute for a licensed professional</strong>, and you should independently verify anything you plan to rely on. See our <Link to="/ai-use" style={{color:"var(--brand-blue)"}}>AI Use disclosure</Link>.</p>

  <h3 style={{marginTop:"2rem"}}>5. Intellectual Property</h3>
  <p>All EZtoFind.ca content, code, design, imagery, and the Doogie character are proprietary works of Doug LeMaire, federally registered with the Canadian Intellectual Property Office (<strong>Copyright Registration No. 1247822</strong>) under the Canadian <em>Copyright Act</em> (R.S.C. 1985, c. C-42). Unauthorized reproduction, scraping, cloning, or use in AI-training datasets is prohibited and subject to statutory damages up to CAD $20,000 per work under s.38.1. See our full <Link to="/copyright" style={{color:"var(--brand-blue)",fontWeight:600}}>Copyright &amp; IP Notice</Link>.</p>
  <p>You may share individual Site pages with an ordinary web browser and cite short excerpts with attribution to EZtoFind.ca. Any other reproduction requires prior written permission.</p>

  <h3 style={{marginTop:"2rem"}}>6. Privacy &amp; consent</h3>
  <p>Your use of the Site is subject to our <Link to="/privacy" style={{color:"var(--brand-blue)"}}>Privacy Policy (PIPA)</Link>. By submitting a form or interacting with Doogie you consent to the collection and use of your information as described there. Commercial email communications require your express opt-in under Canada's Anti-Spam Legislation (CASL), and you may withdraw consent at any time via <Link to="/unsubscribe" style={{color:"var(--brand-blue)"}}>the unsubscribe page</Link> or by writing to <a href="mailto:privacy@eztofind.ca" style={{color:"var(--brand-blue)"}}>privacy@eztofind.ca</a>.</p>

  <h3 style={{marginTop:"2rem"}}>7. Acceptable use</h3>
  <p>You agree not to: (a) use the Site in violation of applicable law; (b) attempt to gain unauthorized access to admin areas, client journeys, or backend systems; (c) submit false, misleading, or bot-generated form entries; (d) scrape, mirror, or bulk-download Site content or MLS® listings; (e) use the Site or its content to train, fine-tune, or evaluate any AI model without our prior written consent; (f) submit content that is defamatory, discriminatory, or infringing on third-party rights. We may suspend access, block IPs, or seek statutory remedies for violations.</p>

  <h3 style={{marginTop:"2rem"}}>8. No warranty</h3>
  <p>The Site and its content are provided "as is" and "as available", without warranties of any kind, express or implied, including any implied warranty of merchantability, fitness for a particular purpose, or non-infringement. Without limiting the foregoing, the operator does not warrant that the Site will be uninterrupted or error-free, that any AI-generated content will be accurate or complete, or that MLS® listings will be current at the moment of viewing.</p>

  <h3 style={{marginTop:"2rem"}}>9. Limitation of liability</h3>
  <p>To the fullest extent permitted by law, Doug LeMaire, Fraser Property Management Realty Services Ltd., and their agents and contractors are not liable for any indirect, incidental, consequential, special, or exemplary damages arising from or related to your use of the Site or reliance on any Site content, including AI-generated content. Nothing in these Terms limits liability that cannot be excluded under British Columbia consumer protection law.</p>

  <h3 style={{marginTop:"2rem"}}>10. Governing law &amp; venue</h3>
  <p>These Terms are governed by the laws of the Province of British Columbia and the federal laws of Canada applicable therein, without regard to conflict-of-laws principles. Any dispute arising from or related to these Terms or your use of the Site is subject to the exclusive jurisdiction of the courts of British Columbia, sitting in Vancouver, and you consent to that jurisdiction.</p>

  <h3 style={{marginTop:"2rem"}}>11. Changes to these Terms</h3>
  <p>We may update these Terms from time to time. The current version and its "Last updated" date will always be posted on this page. Material changes will be highlighted on the Site homepage for a reasonable notice period. Your continued use of the Site after a change takes effect constitutes acceptance of the revised Terms.</p>

  <h3 style={{marginTop:"2rem"}}>12. Contact</h3>
  <p>Questions about these Terms: <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a>. Privacy questions: <a href="mailto:privacy@eztofind.ca" style={{color:"var(--brand-blue)"}}>privacy@eztofind.ca</a>. Complaints or regulatory concerns: see our <Link to="/complaints" style={{color:"var(--brand-blue)"}}>Complaints page</Link>.</p>
</>}/>;

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

const RetentionPolicy = () => {
  const [d, setD] = useState(null);
  useEffect(() => { axios.get(`${API}/legal/retention-policy`).then(r => setD(r.data)).catch(()=>{}); }, []);
  return (
    <section className="section"><div className="container-x" style={{maxWidth:"46rem"}}>
      <SEO title="Records Retention Policy — EZtoFind.ca" description="How EZtoFind.ca stores, retains, and destroys personal information under BCFSA, PIPA, and CASL." path="/legal/retention"/>
      <div className="eyebrow">Consumer Protection</div>
      <h1 className="section-title">Records Retention Policy</h1>
      {!d ? <p>Loading…</p> : (
        <>
          <div className="paper" style={{background:"#FDFCF8",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",lineHeight:1.7}}>
            <strong>Version:</strong> {d.version} · <strong>Effective:</strong> {d.effective_date}<br/>
            <strong>Records Officer:</strong> {d.records_officer}<br/>
            <strong>Brokerage:</strong> {d.brokerage}<br/>
            {d.brokerage_address}<br/>
            <a href={`tel:${d.brokerage_phone.replace(/[^0-9+]/g,"")}`} style={{color:"var(--brand-blue)"}}>{d.brokerage_phone}</a>
          </div>
          <div style={{marginTop:"1.5rem",fontFamily:"Inter,sans-serif",fontSize:"0.98rem",lineHeight:1.8,whiteSpace:"pre-wrap",color:"var(--ink)"}} data-testid="retention-policy-body">{d.policy_markdown}</div>
        </>
      )}
    </div></section>
  );
};

// SEO/AEO landing page for BC relocation. Deliberately links out to the site's
// existing corpus (communities, glossary, neighbourhoods) instead of duplicating —
// so every visitor from a "moving to BC" search lands here + fans out into 1,000+
// deep pages that compound the site's topical authority.
const Relocating = () => {
  const nav = useNavigate();
  return (
    <section className="section" style={{fontFamily:"Inter,sans-serif"}}>
      <div className="container-x" style={{maxWidth:"58rem"}}>
        <SEO
          title="Relocating to British Columbia — A Consumer Guide by Doug LeMaire, REALTOR® | EZtoFind.ca"
          description="Thinking of moving to British Columbia? Compare BC regions, cost of living, PTT, the Foreign Buyer Ban, weather, lifestyle, and start your home search with an AI-assisted MLS® tool. Written by a licensed BC REALTOR®."
          path="/relocating"
          schema={{
            "@context":"https://schema.org","@type":"Article",
            "headline":"Relocating to British Columbia — A Consumer Guide",
            "author":{"@type":"Person","name":"Doug LeMaire, REALTOR®","url":"https://eztofind.ca/about"},
            "publisher":{"@type":"Organization","name":"EZtoFind.ca","url":"https://eztofind.ca"},
            "dateModified": new Date().toISOString().slice(0,10),
            "about":[
              {"@type":"Place","name":"British Columbia, Canada"},
              {"@type":"Thing","name":"Real estate relocation"},
            ],
          }}
        />
        <Helmet><script type="application/ld+json">{JSON.stringify({
          "@context":"https://schema.org","@type":"FAQPage",
          "mainEntity":[
            {"@type":"Question","name":"Can non-Canadians buy real estate in BC?","acceptedAnswer":{"@type":"Answer","text":"Most non-citizens and non-permanent residents are currently restricted under the federal Prohibition on the Purchase of Residential Property by Non-Canadians Act (extended through January 1, 2027), with narrow exemptions for refugees and certain temporary residents. Separately, BC imposes an Additional Property Transfer Tax of 20% on residential purchases by foreign nationals in specified regions. Verify both current statuses before making a purchase decision — links to the full glossary entries are below."}},
            {"@type":"Question","name":"What is the average home price in British Columbia?","acceptedAnswer":{"@type":"Answer","text":"BC's average sale price ranges widely by region — roughly $970,000 province-wide in early 2026, ~$1.25M in Greater Vancouver, ~$700–800K in the BC Interior and rural regions. Use the search below to see live MLS® listings by community."}},
            {"@type":"Question","name":"Which BC region should I move to?","acceptedAnswer":{"@type":"Answer","text":"It depends on your priorities: Greater Vancouver for urban jobs + cultural diversity, Vancouver Island / Victoria for milder winters + laid-back lifestyle, the Okanagan for wine country + drier summers, the Kootenays for outdoor recreation + lower prices, Northern BC for resource-sector work + wilderness. Each of BC's 241 communities has a dedicated page with weather, vibe score, and active listings."}},
            {"@type":"Question","name":"What extra taxes should out-of-BC buyers know about?","acceptedAnswer":{"@type":"Answer","text":"Property Transfer Tax (1%/2%/3%/5% tiered on purchase price), Speculation and Vacancy Tax (0.5–3% annually for non-BC residents who leave homes vacant), plus the 20% Additional Property Transfer Tax for foreign nationals in specified regions. See the glossary for full breakdowns and exemptions."}},
          ]
        })}</script></Helmet>

        <div className="eyebrow">Consumer Guide</div>
        <h1 className="section-title" data-testid="relocating-title">Relocating to British Columbia</h1>

        <div className="paper" style={{background:"#EAF3FF",marginTop:"2rem"}}>
          <p style={{margin:0,fontSize:"1rem",lineHeight:1.75}}>
            <strong>Welcome to British Columbia.</strong> Whether you're moving from another Canadian province, returning to Canada, or considering BC as your first home in the country — this page is a starting point, not the whole picture. Everything below links to a deeper page on this site: community profiles, glossary entries, live MLS® listings, and Doug's AI assistant Doogie for follow-up questions in English, Portuguese, 中文, ਪੰਜਾਬੀ, or فارسی.
          </p>
        </div>

        <h2 style={{marginTop:"2.5rem",fontSize:"1.65rem"}}>1. Choose a region</h2>
        <p>British Columbia is huge — larger than California + Washington combined. Where you land affects taxes, weather, commute times, and cost of living more than in most provinces.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))",gap:"0.85rem",marginTop:"1rem"}} data-testid="relocating-regions">
          {[
            {name:"Greater Vancouver", desc:"Urban core, most job diversity, highest housing costs. 22 municipalities.", href:"/communities"},
            {name:"Fraser Valley", desc:"Suburban east of Vancouver. Better value, growing families, agricultural heritage.", href:"/communities"},
            {name:"Sea-to-Sky", desc:"Squamish + Whistler + Pemberton. Ski country, tech workers, outdoor lifestyle.", href:"/community/squamish"},
            {name:"Vancouver Island", desc:"Victoria + Nanaimo + Comox Valley. Mild winters, ferry access, slower pace.", href:"/community/victoria"},
            {name:"Okanagan", desc:"Kelowna + Vernon + Penticton. Wine country, dry summers, retirement-friendly.", href:"/community/kelowna"},
            {name:"Kootenays", desc:"Nelson + Cranbrook + Fernie. Alpine, artistic, most affordable BC housing.", href:"/community/nelson"},
            {name:"Northern BC", desc:"Prince George + Fort St. John. Resource jobs, wilderness, cold winters.", href:"/community/prince-george"},
            {name:"Cariboo & Thompson", desc:"Kamloops + Williams Lake. Interior plateau, ranching, four-season climate.", href:"/community/kamloops"},
          ].map(r => (
            <Link key={r.name} to={r.href} className="paper" style={{textDecoration:"none",color:"var(--ink)",transition:"transform 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";}}>
              <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,color:"var(--brand-navy)",fontSize:"1.05rem"}}>{r.name}</div>
              <div style={{fontSize:"0.88rem",color:"var(--muted)",marginTop:"0.35rem",lineHeight:1.5}}>{r.desc}</div>
              <div style={{fontSize:"0.8rem",color:"var(--brand-blue)",marginTop:"0.5rem"}}>Explore →</div>
            </Link>
          ))}
        </div>
        <p style={{marginTop:"1.5rem"}}>Not sure which fits? <Link to="/communities" style={{color:"var(--brand-blue)"}}>Browse all 241 BC communities</Link>, each with an AI-authored synopsis, live weather, Neighbourhood Vibe Score™, and active MLS® listings.</p>

        <h2 style={{marginTop:"2.5rem",fontSize:"1.65rem"}}>2. Understand the tax picture</h2>
        <p>BC has some of Canada's most nuanced housing taxes. Foreign buyers face additional layers. Skim these before you make an offer:</p>
        <ul style={{lineHeight:1.9}}>
          <li><Link to="/glossary/property-transfer-tax-ptt" style={{color:"var(--brand-blue)"}}>Property Transfer Tax (PTT)</Link> — payable by every BC buyer at closing. Tiered rates + first-time buyer / newly-built exemptions.</li>
          <li><Link to="/glossary/additional-property-transfer-tax-foreign-buyer-ptt" style={{color:"var(--brand-blue)"}}>Additional Property Transfer Tax (Foreign Buyer PTT)</Link> — 20% BC surtax on foreign national purchases in specified regions.</li>
          <li><Link to="/glossary/foreign-buyer-ban-federal-act" style={{color:"var(--brand-blue)"}}>Foreign Buyer Ban (Federal Act)</Link> — the federal prohibition on most non-Canadian residential purchases, extended through January 1, 2027.</li>
          <li><Link to="/glossary" style={{color:"var(--brand-blue)"}}>Speculation and Vacancy Tax (SVT)</Link> — annual 0.5–3% for owners who leave BC homes vacant, with a declaration filed every March.</li>
          <li><Link to="/glossary" style={{color:"var(--brand-blue)"}}>BC Home Flipping Tax</Link> — anti-flipping tax on homes sold within 2 years of purchase, with divorce/hardship/newly-built exemptions.</li>
          <li><Link to="/glossary" style={{color:"var(--brand-blue)"}}>Empty Homes Tax (Vancouver only)</Link> — separate 3% City of Vancouver tax on vacant properties within municipal boundaries.</li>
        </ul>

        <h2 style={{marginTop:"2.5rem",fontSize:"1.65rem"}}>3. Cost-of-living benchmarks</h2>
        <p>Median BC sale prices vary wildly. Here's a rough 2026 snapshot to calibrate expectations:</p>
        <ul style={{lineHeight:1.9}}>
          <li>Greater Vancouver detached: <strong>~$2.0M+ median</strong> (West Vancouver + Vancouver West Side higher)</li>
          <li>Greater Vancouver condo: <strong>~$780K median</strong></li>
          <li>Fraser Valley detached: <strong>~$1.4M median</strong></li>
          <li>Kelowna / Okanagan detached: <strong>~$950K median</strong></li>
          <li>Victoria / Greater Victoria: <strong>~$1.15M median</strong></li>
          <li>Kamloops / Interior: <strong>~$620K median</strong></li>
          <li>Nelson / Kootenays: <strong>~$680K median</strong></li>
          <li>Prince George / Northern BC: <strong>~$450K median</strong></li>
        </ul>
        <p style={{marginTop:"1rem",fontSize:"0.88rem",color:"var(--muted)",fontStyle:"italic"}}>Median values reflect early-2026 MLS® snapshot data from your live listing feed and shift week-to-week. Use the search tool for current figures.</p>

        <h2 style={{marginTop:"2.5rem",fontSize:"1.65rem"}}>4. Immigration + banking + insurance essentials</h2>
        <p>BC-side realities you'll want to line up before or shortly after arrival:</p>
        <ul style={{lineHeight:1.9}}>
          <li><strong>PR / work-permit status</strong> — dictates whether you're eligible to purchase under the federal ban and at what tax rate.</li>
          <li><strong>Canadian banking relationship</strong> — most lenders require 3–12 months of Canadian banking history before offering a competitive mortgage.</li>
          <li><strong>Down-payment source rules</strong> — Canadian FINTRAC + BCFSA anti-money-laundering rules require documented source of funds. Start gathering paperwork early.</li>
          <li><strong>Home insurance</strong> — wildfire + flood zones affect premiums heavily in BC. Get a quote before you finalize a purchase.</li>
          <li><strong>ICBC auto insurance</strong> — BC's provincial auto insurance monopoly. Register within days of arrival if you're bringing a vehicle.</li>
          <li><strong>MSP (BC health)</strong> — enrol immediately; there's a 3-month wait for coverage as a new resident.</li>
          <li><strong>Notary + lawyer</strong> — required for the actual property closing. Retain one before signing an offer.</li>
        </ul>

        <h2 style={{marginTop:"2.5rem",fontSize:"1.65rem"}}>5. Start your search</h2>
        <p style={{marginTop:"0.5rem"}}>Once you have a rough region in mind, use one of these three tools. All are free — no signup required to browse.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:"0.85rem",marginTop:"1rem"}} data-testid="relocating-tools">
          <Link to="/listings" className="paper" style={{textDecoration:"none",color:"var(--ink)",background:"#FDFCF8"}}>
            <div style={{fontSize:"1.5rem"}}>🔍</div>
            <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,color:"var(--brand-navy)",marginTop:"0.4rem"}}>Live MLS® Search</div>
            <div style={{fontSize:"0.85rem",color:"var(--muted)",marginTop:"0.35rem"}}>~46,000 residential BC listings, filterable by city, price, beds, and property type.</div>
          </Link>
          <Link to="/valuation" className="paper" style={{textDecoration:"none",color:"var(--ink)",background:"#FDFCF8"}}>
            <div style={{fontSize:"1.5rem"}}>🏠</div>
            <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,color:"var(--brand-navy)",marginTop:"0.4rem"}}>Market Estimate</div>
            <div style={{fontSize:"0.85rem",color:"var(--muted)",marginTop:"0.35rem"}}>Selling your current home to fund the move? Get a REALTOR®-reviewed BC-side valuation.</div>
          </Link>
          <button
            type="button"
            data-testid="relocating-ask-doogie"
            onClick={() => { localStorage.setItem("ez_doogie_prefill","I'm relocating to BC — help me figure out where to start."); nav("/"); setTimeout(() => window.scrollTo({top:0}), 200); }}
            className="paper"
            style={{textAlign:"left",cursor:"pointer",border:"1px solid rgba(15,42,91,0.08)",background:"#FDFCF8"}}
          >
            <div style={{fontSize:"1.5rem"}}>💬</div>
            <div style={{fontFamily:"Sora,sans-serif",fontWeight:700,color:"var(--brand-navy)",marginTop:"0.4rem"}}>Ask Doogie</div>
            <div style={{fontSize:"0.85rem",color:"var(--muted)",marginTop:"0.35rem"}}>AI assistant trained on BC real estate, taxes, and communities. Speaks 6 languages.</div>
          </button>
        </div>

        <div className="paper" style={{marginTop:"2.5rem",background:"var(--brand-navy)",color:"#fff",textAlign:"center"}}>
          <h2 style={{fontSize:"1.4rem",marginTop:0,color:"#fff"}}>Ready to talk to a REALTOR®?</h2>
          <p style={{fontSize:"0.95rem",lineHeight:1.7,opacity:0.9,marginBottom:"1.25rem"}}>
            If you're relocating to Doug's direct service area — <strong>Greater Vancouver, Fraser Valley, or Sea-to-Sky</strong> — start with the Buyer form. If you're relocating anywhere else in BC, Doug will personally match you with a local REALTOR®.
          </p>
          <div style={{display:"flex",gap:"0.8rem",justifyContent:"center",flexWrap:"wrap"}}>
            <Link to="/buyer" data-testid="relocating-buyer-cta" className="btn btn-primary" style={{background:"var(--brand-gold)",color:"var(--brand-navy)",border:"none"}}>I'm Moving to Doug's Area</Link>
            <Link to="/referral-request" data-testid="relocating-referral-cta" className="btn btn-outline" style={{color:"#fff",borderColor:"#fff"}}>I'm Moving Elsewhere in BC</Link>
          </div>
        </div>

        <p style={{marginTop:"2rem",fontSize:"0.8rem",color:"var(--muted)",fontStyle:"italic",textAlign:"center"}}>
          This page is general information only. Nothing here is financial, legal, immigration, tax, or real-estate advice. Consult a licensed REALTOR®, lawyer, notary, accountant, or mortgage broker before making decisions. Content reviewed by Doug LeMaire, REALTOR® — BCFSA-licensed under Fraser Property Management Realty Services Ltd.
        </p>
      </div>
    </section>
  );
};

const DoRTS = () => <Legal title="Disclosure of Representation in Trading Services (DoRTS)" body={<>
  <div style={{background:"#F5F0E1",border:"2px solid var(--brand-gold)",borderRadius:12,padding:"1.25rem 1.5rem",margin:"0 0 1.75rem",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap"}}>
    <div style={{flex:"1 1 auto",minWidth:220}}>
      <div style={{fontSize:"0.78rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--brand-navy)"}}>Official BCFSA Form</div>
      <div style={{fontSize:"1.05rem",fontWeight:600,color:"var(--brand-navy)",marginTop:"0.2rem"}}>Disclosure of Representation in Trading Services (Rev. 06/2021)</div>
    </div>
    <a href="/downloads/bcfsa-disclosure-of-representation.pdf" download="BCFSA-Disclosure-of-Representation.pdf" className="btn btn-primary" data-testid="dorts-pdf-download" style={{whiteSpace:"nowrap"}}>📄 Download PDF</a>
  </div>
  <p><strong>Under the Real Estate Services Rules of the British Columbia Financial Services Authority (BCFSA), a REALTOR® must provide you with a formal Disclosure of Representation in Trading Services form at the earliest reasonable opportunity — before providing any real estate service.</strong></p>
  <p>This disclosure explains:</p>
  <ul>
    <li>Whether the REALTOR® will be representing you as a client (with fiduciary duties: loyalty, avoid conflicts, full disclosure, confidentiality, use reasonable skill and care) — or whether the REALTOR® will only be providing services to you as an unrepresented consumer (no fiduciary duties, and any information you share can be used to benefit the other party in a transaction).</li>
    <li>The name of the licensee and their brokerage.</li>
    <li>Your right to seek independent legal advice.</li>
  </ul>
  <p style={{marginTop:"2.5rem"}}>Doug LeMaire, REALTOR® will deliver a signed BCFSA-issued <em>Disclosure of Representation in Trading Services</em> form before providing any real estate service to you.</p>
  <p>Nothing on this website — including any Doogie AI response, buyer intake form submission, or general glossary/community content — creates a REALTOR®-client relationship.</p>
  <h3 style={{marginTop:"1.5rem"}}>About this form</h3>
  <p>This is the current official BCFSA <em>Disclosure of Representation in Trading Services</em> form (Rev. 06/2021). Use the Download button above to save a copy.</p>
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
const Compliance = () => <Legal title="Compliance & Disclosures" body={<><p><strong>Licensee Identification (BCFSA Rule 4-2):</strong> Doug LeMaire, REALTOR® · <strong>BCFSA License #167790</strong> · Fraser Property Management Realty Services Ltd. · 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5.</p><p><strong>BCFSA:</strong> Doug LeMaire is a licensed REALTOR® in British Columbia. All advice-giving occurs through licensed practice — never through the Doogie AI.</p><p><strong>CREA / GVR / MLS®:</strong> This site respects CREA's REALTOR® / MLS® trademark rules. Listings are sourced directly from the CREA Data Distribution Facility (DDF®) under a signed technology-provider agreement, and are refreshed on a compliant cadence.</p><p><strong>PIPA:</strong> See <Link to="/privacy">Privacy Policy</Link>.</p><p><strong>CASL:</strong> All marketing communications require explicit opt-in with a working unsubscribe link. No commercial outreach is ever triggered without a ticked consent, express or implied — every send carries a working unsubscribe link and consent metadata is retained for 3 years.</p><p><strong>AI Guardrails:</strong> Doogie is prompted and monitored to never provide advice or property-specific recommendations that could constitute unlicensed real estate practice.</p><h3 style={{marginTop:"2rem"}}>Doogie Voice / Doogie Visual — Data Flow</h3><p>The Doogie chat and voice interface (including the "Doogie Visual" concept at <Link to="/visual-agent-demo" style={{color:"var(--brand-blue)"}}>/visual-agent-demo</Link>) operates strictly within the following compliance boundary:</p><ul style={{paddingLeft:"1.4rem",lineHeight:1.65}}><li><strong>Text chat</strong> — messages sent to <code>/api/doogie/chat</code> are PII-redacted (SIN, credit card, phone, email, postal code, street address are scrubbed) before storage and are automatically purged after 30 days.</li><li><strong>Scripted voice mode</strong> — no microphone is opened; no audio ever leaves your browser.</li><li><strong>Live voice mode</strong> — before your first recording a PIPA §7/§14 disclosure gate appears explaining that your browser's speech-recognition provider (Google in Chrome/Edge, Apple in Safari) transcribes your audio (a cross-border transfer outside Canada). Only the resulting <em>text</em> is sent to EZtoFind and treated identically to text chat above. Audio is never stored by EZtoFind.</li><li><strong>Not a listing</strong> — no listings, offers, contracts, or agency relationships are formed via Doogie under the Real Estate Services Act (RESA). Any actionable step (viewing, offer, contract, valuation) is handled by Doug LeMaire, REALTOR® personally.</li><li><strong>MLS® data</strong> — active BC listings and virtual-tour URLs shown by Doogie are licensed from CREA DDF®, refreshed every 4 hours, and never redistributed beyond the immediate response.</li></ul><p>To request a copy or deletion of your Doogie interaction history, use the <Link to="/privacy/data-request" style={{color:"var(--brand-blue)"}}>self-service data-request tool</Link>. The BCFSA Consumer Protection Line is <strong>1-877-683-9664</strong>.</p></>}/>;

// --- Admin ---
// SEC-009: The JWT used to live in localStorage where any JS on the page
// could read it (XSS exfil risk).  It now flows via an HttpOnly cookie set
// by /api/admin/login and read back by verify_admin on every call.  The
// frontend only stores a NON-sensitive session marker so `useAdmin` can
// gate rendering without a server round-trip on every page.
const _ADMIN_MARKER_KEY = "ez_admin_session";

const AdminLogin = () => {
  const [f,setF] = useState({email:"",password:""}); const [err,setErr]=useState(""); const nav=useNavigate();
  const submit=async e=>{
    e.preventDefault(); setErr("");
    try{
      // withCredentials so the browser accepts the Set-Cookie from the API.
      const r=await axios.post(`${API}/admin/login`,{...f, turnstile_token: getTurnstileToken()}, { withCredentials: true });
      // Store ONLY a non-sensitive marker — the JWT itself lives in the
      // HttpOnly cookie the server just set and is unreachable from JS.
      localStorage.setItem(_ADMIN_MARKER_KEY, r?.data?.email || "1");
      // Legacy cleanup — remove any raw token left over from prior sessions.
      localStorage.removeItem("eztoken");
      // Login successful → route to admin dashboard.
      nav("/admin");
    }catch(x){
      // Show the server-side lockout / bot-check message verbatim when present,
      // fall back to a generic message for 401s so we don't leak account state.
      const detail = x?.response?.data?.detail;
      const status = x?.response?.status;
      if (status === 429 || (typeof detail === "string" && /try again|bot check/i.test(detail))) {
        setErr(detail);
      } else {
        setErr("Invalid credentials");
      }
    }
  };
  return (<section className="section"><div className="container-x" style={{maxWidth:"32rem"}}>
    <h1 className="section-title">Admin Login</h1>
    <form onSubmit={submit} className="paper">
      <div className="field"><label>Email</label><input required value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="admin-email"/></div>
      <div className="field" style={{marginTop:"1rem"}}><label>Password</label><input required type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})} data-testid="admin-password"/></div>
      <TurnstileWidget/>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}} data-testid="admin-login-error">{err}</div>}
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="admin-login-btn">Sign in</button>
    </form>
  </div></section>);
};

const useAdmin = () => {
  const nav = useNavigate();
  // Presence of the session marker means we *believe* we're logged in;
  // the server still enforces auth via the HttpOnly cookie on every call.
  // On 401 the caller should clear the marker and redirect to /login.
  const marker = localStorage.getItem(_ADMIN_MARKER_KEY);
  useEffect(()=>{ if(!marker) nav("/admin/login"); },[marker,nav]);
  // Empty headers — auth is carried by the HttpOnly cookie, which the
  // browser attaches automatically on same-origin requests.  We keep the
  // return shape ({headers}) so 137 existing callers keep working.
  return { headers: {} };
};

// Fire-and-forget logout: server clears the cookie, client clears the marker.
const _adminSignOut = async (nav) => {
  try { await axios.post(`${API}/admin/logout`, {}, { withCredentials: true }); } catch {}
  try { localStorage.removeItem(_ADMIN_MARKER_KEY); localStorage.removeItem("eztoken"); } catch {}
  if (nav) nav("/");
};

const AdminShell = ({children,active}) => {
  const nav=useNavigate();
  return (<div className="admin-shell">
    <aside className="admin-sidebar">
      <h3>Doug's Desk</h3>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin")} className={active==="dash"?"active":""} data-testid="admin-nav-dash">📊 Dashboard</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/growth")} className={active==="growth"?"active":""} data-testid="admin-nav-growth">📈 Growth</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/reel-analytics")} className={active==="reel-analytics"?"active":""} data-testid="admin-nav-reel-analytics">🎬 Reel Analytics</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/client-journeys")} className={active==="client-journeys"?"active":""} data-testid="admin-nav-client-journeys">🧭 Client Journeys</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/coming-soon")} className={active==="coming-soon"?"active":""} data-testid="admin-nav-coming-soon">🏛️ Coming Soon</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/referrals")} className={active==="referrals"?"active":""} data-testid="admin-nav-referrals">💰 Referrals</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/lead-triage")} className={active==="lead-triage"?"active":""} data-testid="admin-nav-lead-triage">🎯 Lead Triage</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/consultations")} className={active==="consultations"?"active":""} data-testid="admin-nav-consultations">📝 Consultations</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/buyers")} className={active==="buyers"?"active":""} data-testid="admin-nav-buyers">🏠 Buyer Leads</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/sellers")} className={active==="sellers"?"active":""} data-testid="admin-nav-sellers">🔑 Seller Leads</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/realtors")} className={active==="realtors"?"active":""} data-testid="admin-nav-realtors">👥 REALTORS®</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/clients")} className={active==="clients"?"active":""} data-testid="admin-nav-clients">📇 CRM Clients</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/reminders")} className={active==="reminders"?"active":""} data-testid="admin-nav-reminders">🎂 Reminders</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/reminder-templates")} className={active==="rem-templates"?"active":""} data-testid="admin-nav-rem-templates">📧 Reminder Templates</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/email-log")} className={active==="email-log"?"active":""} data-testid="admin-nav-email-log">📮 Email Log</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/email-outbox")} className={active==="email-outbox"?"active":""} data-testid="admin-nav-email-outbox">📬 Email Outbox</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/saved-searches")} className={active==="saved-searches"?"active":""} data-testid="admin-nav-saved-searches">🔔 Saved Searches</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/approvals")} className={active==="approvals"?"active":""} data-testid="admin-nav-approvals">✅ AI Content Approvals</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/chats")} className={active==="chats"?"active":""} data-testid="admin-nav-chats">💬 Doogie Chat Logs</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/feedback")} className={active==="feedback"?"active":""} data-testid="admin-nav-feedback">💌 Beta Feedback</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/faq-audit")} className={active==="faq-audit"?"active":""} data-testid="admin-nav-faq-audit">🔍 FAQ Audit</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/definition-audit")} className={active==="def-audit"?"active":""} data-testid="admin-nav-def-audit">📖 Definition Audit</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/relations")} className={active==="relations"?"active":""} data-testid="admin-nav-relations">🕸️ Content Relations</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/search-analytics")} className={active==="search-analytics"?"active":""} data-testid="admin-nav-search-analytics">🔎 Search Analytics</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/policies")} className={active==="policies"?"active":""} data-testid="admin-nav-policies">📄 Broker Policies</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/snapshots")} className={active==="snapshots"?"active":""} data-testid="admin-nav-snapshots">📸 Evidence Chain</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/campaigns")} className={active==="campaigns"?"active":""} data-testid="admin-nav-campaigns">📧 Campaigns</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/copycat-detector")} className={active==="copycat"?"active":""} data-testid="admin-nav-copycat">🕵️ Copycat Detector</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/cease-desist")} className={active==="cease-desist"?"active":""} data-testid="admin-nav-cease-desist">⚡ Cease & Desist</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/settings/password")} className={active==="settings-password"?"active":""} data-testid="admin-nav-password">🔑 Change Password</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>nav("/admin/settings/reset")} className={active==="reset"?"active":""} data-testid="admin-nav-reset" style={{color:"#DC2626"}}>🧹 Fresh Launch Reset</a>
      <a role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); e.currentTarget.click();}}} onClick={()=>_adminSignOut(nav)} style={{marginTop:"2rem",color:"#F5A623",cursor:"pointer"}}>← Sign out</a>
    </aside>
    <main className="admin-main">{children}</main>
  </div>);
};

const AdminDash = () => {
  const {headers} = useAdmin();
  const [rem, setRem] = useState([]); const [stats, setStats] = useState({buyers:0,sellers:0,realtors:0});
  const [gapClusters, setGapClusters] = useState([]);
  useEffect(()=>{ if(!headers) return;
    Promise.all([axios.get(`${API}/admin/reminders`,{headers}),axios.get(`${API}/admin/leads/buyer`,{headers}),axios.get(`${API}/admin/leads/seller`,{headers}),axios.get(`${API}/admin/realtors`,{headers})])
      .then(([r,b,s,rl])=>{ setRem(r.data); setStats({buyers:b.data.length,sellers:s.data.length,realtors:rl.data.length}); }).catch(()=>{});
    // Featured Cluster Cards — surface the top-3 no-result query clusters so
    // Doug can commission new glossary terms in 3 clicks. Silent-hides if
    // there's nothing to show (fresh install, empty log, or endpoint error).
    axios.get(`${API}/admin/search-analytics/clusters?days=30&kind=no_results&limit=3`, {headers})
      .then(r => setGapClusters(r.data?.clusters || []))
      .catch(() => setGapClusters([]));
  },[]);
  return <AdminShell active="dash">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
      <h1 className="font-display" style={{fontSize:"2rem",marginTop:0,marginBottom:0}}>Welcome back, Doug 🐾</h1>
      <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
        <a href={`${API}/admin/audit-trail.csv`} target="_blank" rel="noopener noreferrer"
           onClick={async (e) => {
             e.preventDefault();
             try {
               const r = await axios.get(`${API}/admin/audit-trail.csv`, {headers, responseType:"blob"});
               const url = window.URL.createObjectURL(new Blob([r.data]));
               const a = document.createElement("a"); a.href = url;
               a.download = `eztofind-ai-audit-${new Date().toISOString().slice(0,10)}.csv`;
               document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
             } catch { alert("Download failed."); }
           }}
           className="btn btn-ghost" data-testid="download-audit-csv"
           style={{fontSize:"0.9rem",padding:"0.6rem 1rem"}}>📥 AI Audit Trail (CSV)</a>
        <a href={`${API}/admin/casl-consent-log.csv`} target="_blank" rel="noopener noreferrer"
           onClick={async (e) => {
             e.preventDefault();
             try {
               const r = await axios.get(`${API}/admin/casl-consent-log.csv`, {headers, responseType:"blob"});
               const url = window.URL.createObjectURL(new Blob([r.data]));
               const a = document.createElement("a"); a.href = url;
               a.download = `eztofind-casl-consent-log-${new Date().toISOString().slice(0,10)}.csv`;
               document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
             } catch { alert("Download failed."); }
           }}
           className="btn btn-ghost" data-testid="download-casl-csv"
           style={{fontSize:"0.9rem",padding:"0.6rem 1rem"}}>🛡️ CASL Consent Log (CSV)</a>
      </div>
    </div>
    <div className="grid-3" style={{marginTop:"1.5rem"}}>
      {[["Buyer Leads",stats.buyers],["Seller Leads",stats.sellers],["REALTORS® Applied",stats.realtors]].map(([l,n])=><div key={l} className="paper" style={{textAlign:"center"}}><div style={{fontSize:"3rem",fontWeight:700,color:"var(--brand-blue)"}}>{n}</div><div style={{color:"var(--muted)"}}>{l}</div></div>)}
    </div>

    {gapClusters && gapClusters.length > 0 && (
      <div data-testid="dash-gap-cards" style={{marginTop:"2.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:"1rem",marginBottom:"0.85rem"}}>
          <div>
            <h2 style={{margin:0,fontSize:"1.4rem"}}>🎯 Content Gaps — Visitors Searched, Got Nothing</h2>
            <div style={{color:"var(--muted)",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",marginTop:"0.3rem",maxWidth:"48rem",lineHeight:1.55}}>
              The top {gapClusters.length} clusters of no-result queries from the last 30 days. Each card is a candidate for one new glossary term or FAQ answer. Click "Commission this term" to add it via the AI Content Approvals queue.
            </div>
          </div>
          <Link to="/admin/search-analytics" className="btn btn-ghost" style={{fontSize:"0.85rem",padding:"0.4rem 0.9rem"}} data-testid="dash-view-all-clusters">View all →</Link>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(19rem,1fr))",gap:"0.85rem"}}>
          {gapClusters.map((c, i) => {
            // Suggest a slug candidate from the shared tokens so Doug can paste it into the approvals form
            const suggestedSlug = (c.shared_tokens || []).slice(0, 4).join("-");
            const suggestedTerm = (c.shared_tokens || []).slice(0, 4).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(" ");
            const isHot = c.total_count >= 5;
            return (
              <div key={i} className="paper" data-testid={`gap-card-${i}`} style={{padding:"1.15rem 1.25rem",borderTop: isHot ? "3px solid #DC2626" : "3px solid var(--brand-blue)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.6rem"}}>
                  <div style={{fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:800,color: isHot ? "#DC2626" : "var(--brand-blue)"}}>
                    {isHot ? "🔥 High priority" : `Gap #${i+1}`}
                  </div>
                  <div style={{fontSize:"0.78rem",color:"var(--muted)",fontFamily:"Inter,sans-serif"}}>
                    {c.total_count} search{c.total_count === 1 ? "" : "es"}{c.variant_count > 1 ? ` · ${c.variant_count} variants` : ""}
                  </div>
                </div>
                <div style={{fontFamily:'"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif',color:"var(--brand-navy)",fontSize:"1.05rem",lineHeight:1.3,marginBottom:"0.45rem"}}>
                  "{c.representative_query}"
                </div>
                {c.variant_count > 1 && c.variants && c.variants.length > 1 && (
                  <div style={{fontSize:"0.78rem",color:"var(--muted)",fontFamily:"Inter,sans-serif",marginBottom:"0.6rem",fontStyle:"italic"}}>
                    Also: {c.variants.slice(1, 3).map(v => `"${v.query}"`).join(", ")}{c.variants.length > 3 ? `, +${c.variants.length - 3} more` : ""}
                  </div>
                )}
                {c.daily_counts && c.daily_counts.length > 0 && (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.7rem",gap:"0.5rem"}}>
                    <div style={{fontSize:"0.7rem",color:"var(--muted)",fontFamily:"Inter,sans-serif",lineHeight:1.3}}>
                      {c.trend === "up" && <span style={{color:"#DC2626",fontWeight:700}}>↗ Growing</span>}
                      {c.trend === "down" && <span style={{color:"#059669",fontWeight:700}}>↘ Fading</span>}
                      {c.trend === "flat" && <span style={{color:"var(--muted)"}}>→ Steady</span>}
                      <span style={{marginLeft:"0.35rem",opacity:0.85}}>30d</span>
                    </div>
                    <Sparkline values={c.daily_counts} trend={c.trend} width={130} height={24} testId={`gap-sparkline-${i}`}/>
                  </div>
                )}
                <div style={{fontSize:"0.72rem",color:"var(--muted)",fontFamily:"monospace",marginBottom:"0.85rem"}}>
                  Suggested slug: <span style={{color:"var(--brand-navy)"}}>{suggestedSlug || "—"}</span>
                </div>
                <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                  <Link
                    to={`/admin/approvals?commission=${encodeURIComponent(suggestedTerm)}&slug=${encodeURIComponent(suggestedSlug)}&source=search-gap&q=${encodeURIComponent(c.representative_query)}`}
                    data-testid={`gap-commission-${i}`}
                    className="btn btn-primary"
                    style={{fontSize:"0.82rem",padding:"0.45rem 0.85rem",flex:"1 1 auto",textAlign:"center"}}
                  >Commission this term →</Link>
                  <a
                    href={`/search?q=${encodeURIComponent(c.representative_query)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{fontSize:"0.82rem",padding:"0.45rem 0.7rem"}}
                    data-testid={`gap-preview-${i}`}
                    title="See what visitors saw"
                  >🔍</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
    <h2 style={{marginTop:"3rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}><span>Upcoming Reminders (next 30 days)</span><Link to="/admin/reminders" className="btn btn-ghost" style={{fontSize:"0.85rem",padding:"0.4rem 0.9rem"}} data-testid="dash-view-all-reminders">View & send →</Link></h2>
    <table className="admin-table" data-testid="admin-reminders">
      <thead><tr><th>Client</th><th>Type</th><th>Date</th><th>Days</th><th>Consent</th></tr></thead>
      <tbody>{rem.length===0 ? <tr><td colSpan="5" style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No upcoming reminders. Add clients with birthdays / anniversaries / possession dates / mortgage renewal dates in the CRM.</td></tr> : rem.slice(0,10).map((r,i)=><tr key={i}><td>{r.client_name}</td><td>{r.type} {r.years?`(${r.years} yr)`:""}</td><td>{r.date}</td><td>{r.days_until===0?"Today!":`${r.days_until} days`}</td><td>{r.consent?.unsubscribed ? <span style={{color:"#DC2626"}}>Unsub.</span> : (r.consent?.email_consent ? <span style={{color:"#0F9D58"}}>✓</span> : <span style={{color:"#DC2626"}}>✗</span>)}</td></tr>)}</tbody>
    </table>
  </AdminShell>;
};

const AdminList = ({title,url,cols,active,exportKind}) => {
  const {headers} = useAdmin();
  const [rows,setRows]=useState([]);
  useEffect(()=>{ axios.get(`${API}${url}`,{headers}).then(r=>setRows(r.data)).catch(()=>{}); },[]);
  // CASL / PIPA consent-record export — one JSON per row, filename includes
  // the lead id and kind so Doug can hand it straight to an auditor.
  const downloadConsent = async (row) => {
    if (!exportKind || !row?.id) return;
    try {
      const r = await axios.get(`${API}/admin/leads/${exportKind}/${row.id}/consent-record`, {headers, responseType: "blob"});
      const blob = new Blob([r.data], {type: "application/json"});
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `consent-record-${exportKind}-${row.id}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    } catch (e) {
      alert("Export failed: " + (e.response?.data?.detail || e.message));
    }
  };
  const showConsentCol = !!exportKind;
  return <AdminShell active={active}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.75rem"}}><h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>{title}</h1>{showConsentCol && <div style={{fontSize:"0.78rem",color:"var(--muted)",fontFamily:"Inter,sans-serif",maxWidth:"32rem",textAlign:"right"}}>🛡️ <strong>Consent record</strong> — auditors under CASL s.10(9) may request the full consent trail for a lead within 30 days. Click "Consent" on any row to download the JSON artifact.</div>}</div>
    <table className="admin-table"><thead><tr>{cols.map(c=><th key={c[0]}>{c[1]}</th>)}{showConsentCol && <th style={{textAlign:"right"}}>Consent</th>}</tr></thead>
      <tbody>{rows.length===0 ? <tr><td colSpan={cols.length + (showConsentCol?1:0)} style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No records yet.</td></tr> : rows.map((r,i)=><tr key={i}>{cols.map(c=><td key={c[0]}>{typeof r[c[0]]==="boolean"? (r[c[0]]?"Yes":"No") : Array.isArray(r[c[0]])? r[c[0]].join(", ") : (r[c[0]]||"—")}</td>)}{showConsentCol && <td style={{textAlign:"right",whiteSpace:"nowrap"}}><button type="button" className="btn btn-ghost" style={{padding:"0.3rem 0.65rem",fontSize:"0.78rem"}} onClick={()=>downloadConsent(r)} data-testid={`consent-export-${exportKind}-${r.id||i}`} title="Download CASL/PIPA consent record (JSON)">📥 Consent</button></td>}</tr>)}</tbody>
    </table>
  </AdminShell>;
};

const AdminClients = () => {
  const {headers} = useAdmin();
  const [rows,setRows]=useState([]); const [show,setShow]=useState(false);
  const empty = {full_name:"",email:"",phone:"",client_type:"buyer",birthdate:"",anniversary:"",possession_date:"",spouse_name:"",notes:"",property_address:"",bc_assessment_opt_in:true,mortgage_renewal_date:"",mortgage_lender:"",send_christmas:true,send_new_year:true,email_consent:false,consent_date:"",consent_source:""};
  const [f,setF]=useState(empty);
  const load=()=>axios.get(`${API}/admin/clients`,{headers}).then(r=>setRows(r.data)).catch(()=>{});
  useEffect(()=>{ load(); },[]);
  const add=async e=>{e.preventDefault();
    if(f.email_consent && !f.consent_date){ alert("Consent Date is required whenever Email Consent is checked (CASL requirement)."); return; }
    if(f.email_consent && !f.email){ alert("Email address is required if consent is granted."); return; }
    await axios.post(`${API}/admin/clients`,f,{headers}); setShow(false); setF(empty); load();
  };
  const del=async id=>{if(!window.confirm("Delete?"))return; await axios.delete(`${API}/admin/clients/${id}`,{headers}); load();};
  return <AdminShell active="clients">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h1 className="font-display" style={{fontSize:"2rem",margin:0}}>CRM Clients</h1><button className="btn btn-primary" onClick={()=>setShow(s=>!s)} data-testid="admin-add-client">+ Add Client</button></div>
    {show && <form onSubmit={add} className="paper" style={{marginTop:"1.5rem"}}>
      <h3 style={{margin:"0 0 0.75rem",color:"var(--brand-navy)"}}>Basics</h3>
      <div className="form-grid">
        <div className="field"><label>Full Name *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})} data-testid="client-name"/></div>
        <div className="field"><label>Email</label><input type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="client-email"/></div>
        <div className="field"><label>Phone</label><input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></div>
        <div className="field"><label>Type</label><select value={f.client_type} onChange={e=>setF({...f,client_type:e.target.value})}><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="past">Past Client</option><option value="sphere">Sphere</option></select></div>
        <div className="field"><label>Spouse</label><input value={f.spouse_name} onChange={e=>setF({...f,spouse_name:e.target.value})}/></div>
        <div className="field"><label>Property Address <span style={{color:"var(--muted)",fontWeight:400}}>(shown in Possession-versary emails)</span></label><input value={f.property_address} onChange={e=>setF({...f,property_address:e.target.value})} placeholder="123 Main St, Maple Ridge"/></div>
      </div>

      <h3 style={{margin:"1.5rem 0 0.75rem",color:"var(--brand-navy)"}}>Key Dates</h3>
      <div className="form-grid">
        <div className="field"><label>🎂 Birthdate</label><input type="date" value={f.birthdate} onChange={e=>setF({...f,birthdate:e.target.value})} data-testid="client-birthdate"/></div>
        <div className="field"><label>💍 Anniversary</label><input type="date" value={f.anniversary} onChange={e=>setF({...f,anniversary:e.target.value})} data-testid="client-anniv"/></div>
        <div className="field"><label>🏠 Possession Date</label><input type="date" value={f.possession_date} onChange={e=>setF({...f,possession_date:e.target.value})} data-testid="client-possession"/></div>
        <div className="field"><label>💰 Mortgage Renewal Date <span style={{color:"var(--muted)",fontWeight:400}}>(90d & 60d ahead)</span></label><input type="date" value={f.mortgage_renewal_date} onChange={e=>setF({...f,mortgage_renewal_date:e.target.value})} data-testid="client-mortgage-date"/></div>
        <div className="field"><label>Mortgage Lender</label><input value={f.mortgage_lender} onChange={e=>setF({...f,mortgage_lender:e.target.value})} placeholder="RBC, BMO, MCAP, …"/></div>
      </div>

      <h3 style={{margin:"1.5rem 0 0.75rem",color:"var(--brand-navy)"}}>Reminder Preferences</h3>
      <div style={{display:"flex",gap:"1.25rem",flexWrap:"wrap"}}>
        <label style={{display:"flex",alignItems:"center",gap:"0.5rem"}}><input type="checkbox" checked={f.bc_assessment_opt_in} onChange={e=>setF({...f,bc_assessment_opt_in:e.target.checked})} data-testid="client-bca-opt"/> 📋 Send BC Assessment heads-up (early January)</label>
        <label style={{display:"flex",alignItems:"center",gap:"0.5rem"}}><input type="checkbox" checked={f.send_christmas} onChange={e=>setF({...f,send_christmas:e.target.checked})} data-testid="client-xmas-opt"/> 🎄 Include in Christmas bulk send</label>
        <label style={{display:"flex",alignItems:"center",gap:"0.5rem"}}><input type="checkbox" checked={f.send_new_year} onChange={e=>setF({...f,send_new_year:e.target.checked})} data-testid="client-newyear-opt"/> 🎉 Include in New Year bulk send</label>
      </div>

      <h3 style={{margin:"1.5rem 0 0.75rem",color:"var(--brand-navy)"}}>CASL Express Consent <span style={{color:"var(--muted)",fontWeight:400,fontSize:"0.85rem"}}>— required by Canadian law before sending any commercial email</span></h3>
      <div style={{background:"#FFF8E1",border:"1px solid rgba(245,166,35,0.35)",borderRadius:"0.6rem",padding:"1rem",marginBottom:"0.75rem",fontSize:"0.85rem",color:"var(--muted)",lineHeight:1.5}}>Only tick "Email Consent" if this client has <strong>expressly agreed</strong> to receive lifecycle emails from you (e.g., signed a buyer agreement mentioning it, or explicitly opted in via the site). Every email will include an unsubscribe link and your brokerage identifier.</div>
      <div className="form-grid">
        <div className="field"><label style={{display:"flex",alignItems:"center",gap:"0.5rem"}}><input type="checkbox" checked={f.email_consent} onChange={e=>setF({...f,email_consent:e.target.checked})} data-testid="client-consent"/> 🛡️ Email Consent granted</label></div>
        <div className="field"><label>Consent Date {f.email_consent && <span style={{color:"#DC2626"}}>*</span>}</label><input type="date" value={f.consent_date} onChange={e=>setF({...f,consent_date:e.target.value})} data-testid="client-consent-date"/></div>
        <div className="field"><label>Consent Source</label><input value={f.consent_source} onChange={e=>setF({...f,consent_source:e.target.value})} placeholder="Signed buyer agreement, verbal opt-in, website form, …"/></div>
      </div>

      <div style={{marginTop:"1rem"}} className="field"><label>Notes</label><textarea rows="2" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></div>
      <button type="submit" className="btn btn-green" style={{marginTop:"1rem"}} data-testid="client-save">Save Client</button>
    </form>}
    <table className="admin-table" style={{marginTop:"1.5rem"}}>
      <thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Consent</th><th>Birthday</th><th>Anniv.</th><th>Possession</th><th>Renewal</th><th></th></tr></thead>
      <tbody>{rows.length===0 ? <tr><td colSpan="9" style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No clients yet.</td></tr> : rows.map(r=><tr key={r.id}>
        <td>{r.full_name}</td>
        <td>{r.client_type}</td>
        <td>{r.email||"—"}</td>
        <td>{r.unsubscribed ? <span style={{color:"#DC2626"}}>Unsubscribed</span> : (r.email_consent ? <span style={{color:"#0F9D58"}}>✓ Yes</span> : <span style={{color:"var(--muted)"}}>No</span>)}</td>
        <td>{r.birthdate||"—"}</td>
        <td>{r.anniversary||"—"}</td>
        <td>{r.possession_date||"—"}</td>
        <td>{r.mortgage_renewal_date||"—"}</td>
        <td><button onClick={()=>del(r.id)} style={{background:"transparent",border:"none",color:"#DC2626",cursor:"pointer"}}>Delete</button></td>
      </tr>)}</tbody>
    </table>
  </AdminShell>;
};

// --- Client Reminders (dedicated page) ---
const AdminReminders = () => {
  const {headers} = useAdmin();
  const [rem, setRem] = useState([]);
  const [busy, setBusy] = useState({});
  const [xmas, setXmas] = useState(null);
  const [showXmasPreview, setShowXmasPreview] = useState(false);
  const [autoResult, setAutoResult] = useState(null);
  const load = () => axios.get(`${API}/admin/reminders`, {headers}).then(r => setRem(r.data)).catch(() => {});
  useEffect(() => { if(headers) load(); }, []);
  const send = async (r) => {
    setBusy(b => ({...b, [r.client_id + r.type_key]: true}));
    try {
      const body = {client_id: r.client_id, type_key: r.type_key, years: r.years || null, days: r.days_until || null};
      const res = await axios.post(`${API}/admin/reminders/send`, body, {headers});
      if(res.data.status === "queued") alert(`✅ Queued to ${res.data.to}. Email will be delivered when Resend is wired.`);
      else alert(`⚠️ Not sent — ${res.data.reason || "unknown"}. Check consent & email on this client.`);
    } catch(e){ alert("Failed: " + (e.response?.data?.detail || e.message)); }
    setBusy(b => ({...b, [r.client_id + r.type_key]: false}));
  };
  const snooze = async (r) => {
    if(!window.confirm(`Snooze this ${r.type} reminder for this year?`)) return;
    await axios.post(`${API}/admin/reminders/${r.client_id}/${r.type_key}/snooze`, {}, {headers});
    load();
  };
  const openXmas = async () => {
    const r = await axios.get(`${API}/admin/reminders/christmas/preview`, {headers});
    setXmas(r.data); setShowXmasPreview(true);
  };
  const sendXmas = async () => {
    if(!window.confirm(`Send the Christmas email to ${xmas?.count || 0} consented clients right now? This action is logged.`)) return;
    const r = await axios.post(`${API}/admin/reminders/christmas/send`, {}, {headers});
    alert(`Queued ${r.data.queued} · Skipped ${r.data.skipped}`); setShowXmasPreview(false); load();
  };
  const runAuto = async () => {
    if(!window.confirm("Auto-send today's Birthdays, Anniversaries, Possession-versaries + Christmas (if Dec 20)? Only consented clients will receive email.")) return;
    const r = await axios.post(`${API}/admin/reminders/auto-send-today`, {}, {headers});
    setAutoResult(r.data);
  };
  return <AdminShell active="reminders">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
      <h1 className="font-display" style={{fontSize:"2rem",margin:0}}>Client Reminders</h1>
      <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
        <button className="btn btn-primary" onClick={runAuto} data-testid="auto-send-today">⚡ Auto-send today's</button>
        <button className="btn btn-ghost" onClick={openXmas} data-testid="preview-xmas">🎄 Christmas bulk send…</button>
      </div>
    </div>
    <p style={{color:"var(--muted)",marginTop:"0.5rem"}}>Upcoming lifecycle reminders in the next 30 days. <strong>Auto-send</strong> types (Birthday, Anniversary, Possession, Christmas) fire on the day when you click <em>Auto-send today's</em>. <strong>Manual-review</strong> types (BC Assessment, Mortgage Renewal) require you to click <em>Send</em> per client.</p>
    {autoResult && <div className="paper" style={{background:"#E8F5E9",marginTop:"1rem"}}>
      <strong>✅ Auto-send result:</strong> Queued {autoResult.queued} · Skipped {autoResult.skipped}
      {autoResult.details?.length > 0 && <ul style={{margin:"0.5rem 0 0"}}>{autoResult.details.map((d,i) => <li key={i}>{d.client} → {d.type}</li>)}</ul>}
    </div>}

    <table className="admin-table" style={{marginTop:"1.5rem"}} data-testid="admin-reminders-full">
      <thead><tr><th>Client</th><th>Type</th><th>Date</th><th>Days</th><th>Consent</th><th>Mode</th><th style={{textAlign:"right"}}>Action</th></tr></thead>
      <tbody>{rem.length===0 ? <tr><td colSpan="7" style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No upcoming reminders in the next 30 days. Add clients + key dates in <a href="/admin/clients" style={{color:"var(--brand-blue)"}}>CRM Clients</a>.</td></tr> : rem.map((r,i) => {
        const key = r.client_id + r.type_key;
        const canSend = r.consent?.can_send;
        return <tr key={i}>
          <td>{r.client_name}<div style={{fontSize:"0.78rem",color:"var(--muted)"}}>{r.client_email || "no email"}</div></td>
          <td>{r.type}{r.years ? ` (${r.years} yr)` : ""}</td>
          <td>{r.date}</td>
          <td>{r.days_until === 0 ? <strong style={{color:"#DC2626"}}>Today!</strong> : `${r.days_until}d`}</td>
          <td>{r.consent?.unsubscribed ? <span style={{color:"#DC2626"}}>Unsub.</span> : (r.consent?.email_consent ? <span style={{color:"#0F9D58"}}>✓</span> : <span style={{color:"#DC2626"}}>✗ No consent</span>)}</td>
          <td>{r.auto_send ? <span style={{background:"#E3F2FD",padding:"0.15rem 0.5rem",borderRadius:12,fontSize:"0.75rem",color:"var(--brand-blue)"}}>Auto</span> : <span style={{background:"#FFF3E0",padding:"0.15rem 0.5rem",borderRadius:12,fontSize:"0.75rem",color:"#E65100"}}>Manual</span>}</td>
          <td style={{textAlign:"right",whiteSpace:"nowrap"}}>
            <button disabled={!canSend || busy[key]} onClick={()=>send(r)} className="btn btn-green" style={{padding:"0.35rem 0.75rem",fontSize:"0.8rem",opacity: canSend?1:0.4,cursor: canSend?"pointer":"not-allowed"}} data-testid={`send-reminder-${r.type_key}-${i}`}>{busy[key] ? "..." : "Send"}</button>
            <button onClick={()=>snooze(r)} style={{marginLeft:"0.4rem",background:"transparent",border:"1px solid var(--muted)",color:"var(--muted)",padding:"0.3rem 0.6rem",borderRadius:6,cursor:"pointer",fontSize:"0.75rem"}}>Snooze</button>
          </td>
        </tr>;
      })}</tbody>
    </table>

    {showXmasPreview && xmas && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}} onClick={()=>setShowXmasPreview(false)}>
      <div className="paper" onClick={e=>e.stopPropagation()} style={{maxWidth:720,maxHeight:"85vh",overflow:"auto",background:"#fff"}}>
        <h2 style={{marginTop:0}}>🎄 Christmas Bulk Send</h2>
        <p><strong>{xmas.count}</strong> consented clients will receive this email:</p>
        <div style={{background:"#F7FAFF",padding:"1rem",borderRadius:8,marginTop:"1rem"}}>
          <div style={{fontSize:"0.85rem",color:"var(--muted)"}}>Subject:</div>
          <div style={{fontWeight:600,marginBottom:"1rem"}}>{xmas.preview_subject || "(no consented clients yet)"}</div>
          <div dangerouslySetInnerHTML={{__html: safeHtml(xmas.preview_html || "<p>No consented clients — add clients with email consent to preview.</p>")}} style={{fontSize:"0.9rem",lineHeight:1.5}}/>
        </div>
        <div style={{display:"flex",gap:"0.75rem",justifyContent:"flex-end",marginTop:"1.5rem"}}>
          <button className="btn btn-ghost" onClick={()=>setShowXmasPreview(false)}>Cancel</button>
          <button className="btn btn-green" onClick={sendXmas} disabled={xmas.count===0} data-testid="send-xmas-bulk">Send to {xmas.count} clients</button>
        </div>
      </div>
    </div>}
  </AdminShell>;
};

const AdminReminderTemplates = () => {
  const {headers} = useAdmin();
  const [tpls, setTpls] = useState([]);
  const [saved, setSaved] = useState({});
  const load = () => axios.get(`${API}/admin/reminder-templates`, {headers}).then(r => setTpls(r.data)).catch(() => {});
  useEffect(() => { if(headers) load(); }, []);
  const save = async (t) => {
    await axios.put(`${API}/admin/reminder-templates/${t.type}`, {subject: t.subject, body_html: t.body_html, active: t.active !== false}, {headers});
    setSaved(s => ({...s, [t.type]: true})); setTimeout(() => setSaved(s => ({...s, [t.type]: false})), 2500);
  };
  const reset = async (t) => {
    if(!window.confirm(`Reset the ${t.type} template to its default? Your edits will be lost.`)) return;
    await axios.post(`${API}/admin/reminder-templates/${t.type}/reset`, {}, {headers});
    load();
  };
  const update = (type, patch) => setTpls(ts => ts.map(t => t.type === type ? {...t, ...patch} : t));
  const LABEL = {birthday:"🎂 Birthday",anniversary:"💍 Anniversary",possession:"🏠 Possession-versary",bc_assessment:"📋 BC Assessment",mortgage_renewal:"💰 Mortgage Renewal",christmas:"🎄 Christmas",new_year:"🎉 New Year"};
  return <AdminShell active="rem-templates">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>Reminder Templates</h1>
    <p style={{color:"var(--muted)"}}>Edit the 6 lifecycle reminder emails. Every email auto-appends a CASL-compliant footer with your brokerage identifier + a working unsubscribe link — no need to add it yourself. Available merge tags:</p>
    <div style={{background:"#F7FAFF",padding:"1rem",borderRadius:8,fontFamily:"monospace",fontSize:"0.8rem",marginBottom:"1.5rem",lineHeight:1.7}}>
      <code>{"{{first_name}}"}</code> · <code>{"{{full_name}}"}</code> · <code>{"{{spouse_name}}"}</code> · <code>{"{{property_address}}"}</code> · <code>{"{{property_line}}"}</code> · <code>{"{{years}}"}</code> · <code>{"{{renewal_date}}"}</code> · <code>{"{{lender}}"}</code> · <code>{"{{days}}"}</code>
    </div>
    {tpls.map(t => <div key={t.type} className="paper" style={{marginBottom:"1.5rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem",marginBottom:"1rem"}}>
        <h3 style={{margin:0,color:"var(--brand-navy)"}}>{LABEL[t.type] || t.type}</h3>
        <div style={{display:"flex",gap:"0.5rem"}}>
          {saved[t.type] && <span style={{color:"#0F9D58",fontSize:"0.9rem",alignSelf:"center"}}>✓ Saved</span>}
          <button className="btn btn-ghost" onClick={()=>reset(t)} style={{padding:"0.4rem 0.9rem",fontSize:"0.85rem"}}>Reset default</button>
          <button className="btn btn-green" onClick={()=>save(t)} style={{padding:"0.4rem 1rem",fontSize:"0.9rem"}} data-testid={`save-tpl-${t.type}`}>Save</button>
        </div>
      </div>
      <div className="field" style={{marginBottom:"0.75rem"}}><label>Subject</label>
        <input value={t.subject} onChange={e=>update(t.type,{subject:e.target.value})} data-testid={`tpl-subject-${t.type}`}/>
      </div>
      <div className="field"><label>Body (HTML)</label>
        <textarea rows="10" value={t.body_html} onChange={e=>update(t.type,{body_html:e.target.value})} style={{fontFamily:"monospace",fontSize:"0.82rem"}} data-testid={`tpl-body-${t.type}`}/>
      </div>
    </div>)}
  </AdminShell>;
};

const AdminChangePassword = () => {
  const { headers } = useAdmin();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const strength = (p) => {
    if (!p) return {level:"", score:0};
    let s = 0;
    if (p.length >= 10) s++;
    if (p.length >= 14) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    const label = ["Very weak","Weak","Fair","Good","Strong","Very strong"][s] || "";
    return {level: label, score: s};
  };
  const strengthNext = strength(next);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (next.length < 10) { setErr("New password must be at least 10 characters."); return; }
    if (next !== confirm) { setErr("New password and confirmation do not match."); return; }
    if (next === current) { setErr("New password must be different from the current one."); return; }
    setBusy(true);
    try {
      const r = await axios.post(`${API}/admin/change-password`, {current_password: current, new_password: next}, {headers});
      setMsg(r.data.message || "Password updated. Log in with the new password next time.");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (x) {
      setErr(x.response?.data?.detail || x.message || "Password change failed.");
    }
    setBusy(false);
  };

  return <AdminShell active="settings-password">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>🔑 Change Admin Password</h1>
    <p style={{color:"var(--muted)",maxWidth:"56ch"}}>Rotate your admin password. You'll stay logged in on this browser (JWT token stays valid until it expires), but any new login will require the new password. Store the new one in your password manager immediately.</p>

    {msg && <div className="paper" style={{background:"#E8F5E9",borderLeft:"4px solid #0F9D58",marginBottom:"1.5rem"}}>{msg}</div>}
    {err && <div className="paper" style={{background:"#FEE2E2",borderLeft:"4px solid #DC2626",marginBottom:"1.5rem"}}>{err}</div>}

    <form onSubmit={submit} className="paper" style={{maxWidth:"520px"}}>
      <div className="field" style={{marginBottom:"1rem"}}>
        <label>Current password</label>
        <input type="password" required autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} data-testid="pwd-current"/>
      </div>
      <div className="field" style={{marginBottom:"1rem"}}>
        <label>New password (minimum 10 characters)</label>
        <input type="password" required minLength={10} autoComplete="new-password" value={next} onChange={e=>setNext(e.target.value)} data-testid="pwd-new"/>
        {next && <div style={{marginTop:"0.4rem",fontSize:"0.82rem",color: strengthNext.score >= 4 ? "#0F9D58" : strengthNext.score >= 3 ? "#F5A623" : "#DC2626"}}>Strength: {strengthNext.level}</div>}
      </div>
      <div className="field" style={{marginBottom:"1.25rem"}}>
        <label>Confirm new password</label>
        <input type="password" required autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} data-testid="pwd-confirm"/>
        {confirm && next !== confirm && <div style={{marginTop:"0.4rem",fontSize:"0.82rem",color:"#DC2626"}}>Passwords do not match yet.</div>}
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy || !current || next.length < 10 || next !== confirm} data-testid="pwd-submit" style={{padding:"0.7rem 1.4rem"}}>
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>

    <div className="paper" style={{marginTop:"1.5rem",background:"#FFF8E1",borderLeft:"4px solid #F5A623",maxWidth:"520px",fontSize:"0.9rem",color:"var(--ink)"}}>
      <strong>Safety tips:</strong>
      <ul style={{margin:"0.5rem 0 0 1rem",lineHeight:1.6}}>
        <li>Use 12+ characters with mixed case, numbers, and a symbol.</li>
        <li>Do not reuse a password from any other site.</li>
        <li>Store the new password in your password manager (1Password, Bitwarden, iCloud Keychain).</li>
        <li>If you lose it, contact your developer for a manual reset — there is no self-serve password recovery.</li>
      </ul>
    </div>
  </AdminShell>;
};


const AdminReset = () => {
  const {headers} = useAdmin();
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState({});
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = () => axios.get(`${API}/admin/reset/preview`, {headers}).then(r => setPreview(r.data)).catch(() => {});
  useEffect(() => { if(headers) load(); }, []);

  const toggle = (k) => setSelected(s => ({...s, [k]: !s[k]}));
  const selectAll = () => setSelected(preview.categories.reduce((acc, c) => ({...acc, [c.key]: true}), {}));
  const clearAll = () => setSelected({});
  const cats = Object.keys(selected).filter(k => selected[k]);
  const canFire = cats.length > 0 && confirmText.trim() === (preview?.confirmation_phrase || "");

  const fire = async () => {
    if(!canFire) return;
    if(!window.confirm(`This will PERMANENTLY destroy ${cats.length} data categor${cats.length===1?"y":"ies"}. This action is irreversible and logged. Continue?`)) return;
    setBusy(true);
    try {
      const r = await axios.post(`${API}/admin/reset/purge`, {categories: cats, confirm_text: confirmText}, {headers});
      setResult(r.data);
      setSelected({}); setConfirmText(""); load();
    } catch(e){
      alert("Reset failed: " + (e.response?.data?.detail || e.message));
    }
    setBusy(false);
  };

  return <AdminShell active="reset">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0,color:"#DC2626"}}>🧹 Fresh Launch Reset</h1>
    <div style={{background:"#FFF3E0",border:"2px solid #F5A623",borderRadius:8,padding:"1.25rem",marginBottom:"2rem"}}>
      <strong style={{color:"#B45309"}}>⚠️ TEST DATA ONLY — do not run after launch on real client records.</strong>
      <div style={{marginTop:"0.5rem",fontSize:"0.9rem",lineHeight:1.55,color:"var(--ink)"}}>
        Real buyer/seller/valuation leads and REALTOR® applications are subject to <strong>7-year BCFSA / PIPA / CASL retention</strong>. Once you flip DNS to your live domain, individual records should be deleted only through the automatic daily retention purger or a documented DSAR request — never through this button. Every reset writes a permanent attestation to <code>retention_purge_log</code> for audit purposes.
      </div>
    </div>

    {result && <div className="paper" style={{background:"#E8F5E9",marginBottom:"2rem",borderLeft:"4px solid #0F9D58"}}>
      <strong>✅ Purge complete.</strong> {result.destroyed} records destroyed across {Object.keys(result.results).length} categories. Attestation ID: <code>{result.attestation_id}</code>
    </div>}

    {preview && <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:"0.5rem"}}>
        <h3 style={{margin:0}}>Categories to purge</h3>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <button onClick={selectAll} className="btn btn-ghost" style={{padding:"0.3rem 0.75rem",fontSize:"0.82rem"}} data-testid="reset-select-all">Select all</button>
          <button onClick={clearAll} className="btn btn-ghost" style={{padding:"0.3rem 0.75rem",fontSize:"0.82rem"}}>Clear</button>
        </div>
      </div>
      <table className="admin-table" data-testid="admin-reset-preview">
        <thead><tr><th></th><th>Category</th><th>Collections</th><th style={{textAlign:"right"}}>Records</th></tr></thead>
        <tbody>{preview.categories.map(c => <tr key={c.key} style={{background: selected[c.key] ? "#FFF3E0" : "transparent"}}>
          <td style={{width:40}}><input type="checkbox" checked={!!selected[c.key]} onChange={()=>toggle(c.key)} data-testid={`reset-cat-${c.key}`}/></td>
          <td><strong>{c.label}</strong></td>
          <td style={{fontFamily:"monospace",fontSize:"0.78rem",color:"var(--muted)"}}>{c.collections.map(x=>x.collection).join(", ")}</td>
          <td style={{textAlign:"right",fontWeight:600}}>{c.total.toLocaleString()}</td>
        </tr>)}</tbody>
      </table>

      <h3 style={{marginTop:"2.5rem"}}>Preserved by design (never touched)</h3>
      <table className="admin-table">
        <thead><tr><th>Collection</th><th>Why it's preserved</th></tr></thead>
        <tbody>{preview.preserved.map(p => <tr key={p.collection}>
          <td style={{fontFamily:"monospace",fontSize:"0.85rem"}}>{p.collection}</td>
          <td style={{color:"var(--muted)"}}>{p.reason}</td>
        </tr>)}</tbody>
      </table>

      <div className="paper" style={{marginTop:"2.5rem",background:"#FFF8E1",borderLeft:"4px solid #DC2626"}}>
        <h3 style={{margin:"0 0 1rem",color:"#B45309"}}>Confirmation required</h3>
        <p style={{marginTop:0,marginBottom:"1rem"}}>Type <code style={{background:"#fff",padding:"0.15rem 0.5rem",borderRadius:4,fontWeight:700}}>{preview.confirmation_phrase}</code> below to enable the purge button.</p>
        <input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="Type the phrase exactly…" data-testid="reset-confirm-input" style={{width:"100%",maxWidth:400,padding:"0.7rem 1rem",fontFamily:"monospace",fontSize:"0.95rem",border:"2px solid rgba(15,42,91,0.15)",borderRadius:8,marginBottom:"1rem"}}/>
        <div>
          <button disabled={!canFire || busy} onClick={fire} className="btn btn-primary" data-testid="reset-fire-btn" style={{background: canFire?"#DC2626":"#999",borderColor: canFire?"#DC2626":"#999",cursor: canFire?"pointer":"not-allowed",padding:"0.75rem 1.5rem"}}>
            {busy ? "Purging…" : `🗑️ Purge ${cats.length} categor${cats.length===1?"y":"ies"} permanently`}
          </button>
        </div>
      </div>
    </>}
  </AdminShell>;
};


const AdminSavedSearches = () => {
  const {headers} = useAdmin();
  const [data, setData] = useState({counts:{pending:0,verified:0,unsubscribed:0}, records:[]});
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [filter, setFilter] = useState(""); // "" | "pending" | "verified" | "unsubscribed"

  const load = () => axios.get(`${API}/admin/saved-searches`, {headers})
    .then(r => setData(r.data)).catch(()=>{});
  useEffect(()=>{ if(headers) load(); }, []);

  const runMatcher = async () => {
    if (!window.confirm("Run the alert matcher now? This will scan every verified saved search and send digest emails for any new listings that match. (Respects the 6-hour frequency cap.)")) return;
    setBusy(true); setRunResult(null);
    try {
      const r = await axios.post(`${API}/admin/saved-searches/run-matcher`, {}, {headers});
      setRunResult(r.data);
      load(); // refresh counts
    } catch (x) {
      setRunResult({error: x?.response?.data?.detail || "Matcher failed."});
    } finally { setBusy(false); }
  };

  const filtered = filter ? data.records.filter(r => r.status === filter) : data.records;
  const fmtFilters = (f) => f && Object.keys(f).length
    ? Object.entries(f).map(([k,v])=>`${k.replace(/_/g," ")}: ${v}`).join(" · ")
    : "all BC residential";
  const fmtDate = (s) => s ? String(s).slice(0,16).replace("T"," ") : "—";

  return <AdminShell active="saved-searches">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
      <h1 className="font-display" style={{fontSize:"2rem",margin:0}}>Saved Search Subscribers</h1>
      <button className="btn btn-primary" onClick={runMatcher} disabled={busy} data-testid="saved-search-run-matcher">
        {busy ? "Running…" : "🚀 Run Matcher Now"}
      </button>
    </div>
    <p style={{color:"var(--muted)",marginTop:"0.5rem"}}>Users who opted into new-listing email alerts. Digests dispatch automatically after every 4-hour DDF sync — the button above manually re-runs it (respecting the 6-hour cap per subscriber).</p>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"0.75rem",marginTop:"1.25rem",marginBottom:"1.25rem"}}>
      <button onClick={()=>setFilter("")} data-testid="ss-count-all" style={{background:filter===""?"var(--brand-navy)":"#F0F4FB",color:filter===""?"#fff":"var(--brand-navy)",border:"none",borderRadius:10,padding:"0.9rem 0.75rem",cursor:"pointer",textAlign:"left"}}>
        <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",opacity:0.8}}>Total</div>
        <div style={{fontSize:"1.5rem",fontWeight:700,marginTop:"0.15rem"}}>{data.records.length}</div>
      </button>
      <button onClick={()=>setFilter("verified")} data-testid="ss-count-verified" style={{background:filter==="verified"?"#22C55E":"#F0FDF4",color:filter==="verified"?"#fff":"#166534",border:"none",borderRadius:10,padding:"0.9rem 0.75rem",cursor:"pointer",textAlign:"left"}}>
        <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",opacity:0.85}}>Verified (receiving)</div>
        <div style={{fontSize:"1.5rem",fontWeight:700,marginTop:"0.15rem"}}>{data.counts.verified||0}</div>
      </button>
      <button onClick={()=>setFilter("pending")} data-testid="ss-count-pending" style={{background:filter==="pending"?"#F5A623":"#FEF3C7",color:filter==="pending"?"#fff":"#92400E",border:"none",borderRadius:10,padding:"0.9rem 0.75rem",cursor:"pointer",textAlign:"left"}}>
        <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",opacity:0.85}}>Pending confirm</div>
        <div style={{fontSize:"1.5rem",fontWeight:700,marginTop:"0.15rem"}}>{data.counts.pending||0}</div>
      </button>
      <button onClick={()=>setFilter("unsubscribed")} data-testid="ss-count-unsub" style={{background:filter==="unsubscribed"?"#6b7280":"#F3F4F6",color:filter==="unsubscribed"?"#fff":"#374151",border:"none",borderRadius:10,padding:"0.9rem 0.75rem",cursor:"pointer",textAlign:"left"}}>
        <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",opacity:0.85}}>Unsubscribed</div>
        <div style={{fontSize:"1.5rem",fontWeight:700,marginTop:"0.15rem"}}>{data.counts.unsubscribed||0}</div>
      </button>
    </div>

    {runResult && (
      <div className="notice" style={{background:runResult.error?"#FEE2E2":"#F0FDF4",borderColor:runResult.error?"#DC2626":"#22C55E",marginBottom:"1.25rem"}} data-testid="ss-matcher-result">
        {runResult.error
          ? <span>❌ {runResult.error}</span>
          : <span>✅ Matcher ran — checked <strong>{runResult.searches_checked}</strong> subscriber(s), dispatched <strong>{runResult.digests_sent}</strong> digest email(s). {runResult.errors?.length>0 && <> Errors: {runResult.errors.length}</>}</span>}
      </div>
    )}

    <table className="admin-table" data-testid="admin-saved-searches-table">
      <thead><tr>
        <th>Created</th><th>Email</th><th>Filters</th><th>Freq</th><th>Status</th><th>Sent</th><th>Last Sent</th>
      </tr></thead>
      <tbody>
        {filtered.length===0
          ? <tr><td colSpan="7" style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No subscribers in this bucket yet. When users click "🔔 Get alerts for this search" on the /listings page, they'll appear here.</td></tr>
          : filtered.map((r,i)=>(
            <tr key={r.id || i}>
              <td style={{whiteSpace:"nowrap"}}>{fmtDate(r.created_at)}</td>
              <td>{r.email}</td>
              <td style={{maxWidth:"18rem",fontSize:"0.85rem",color:"var(--muted)"}}>
                {r.label && <div style={{color:"var(--brand-navy)",fontWeight:600,marginBottom:"0.15rem"}}>{r.label}</div>}
                {fmtFilters(r.filters)}
              </td>
              <td>{r.frequency||"instant"}</td>
              <td>
                <span style={{
                  fontSize:"0.72rem",fontWeight:700,padding:"0.2rem 0.55rem",borderRadius:999,
                  background:r.status==="verified"?"#F0FDF4":r.status==="pending"?"#FEF3C7":"#F3F4F6",
                  color:r.status==="verified"?"#166534":r.status==="pending"?"#92400E":"#374151",
                  textTransform:"uppercase",letterSpacing:"0.04em",
                }}>{r.status}</span>
              </td>
              <td style={{textAlign:"center"}}>{r.notified_count || 0}</td>
              <td style={{whiteSpace:"nowrap",fontSize:"0.85rem",color:"var(--muted)"}}>{fmtDate(r.last_notified_at)}</td>
            </tr>
          ))
        }
      </tbody>
    </table>
  </AdminShell>;
};


const AdminEmailLog = () => {
  const {headers} = useAdmin();
  const [rows, setRows] = useState([]); const [filter, setFilter] = useState("");
  const load = () => axios.get(`${API}/admin/email-log${filter?`?type=${filter}`:""}`, {headers}).then(r => setRows(r.data)).catch(() => {});
  useEffect(() => { if(headers) load(); }, [filter]);
  return <AdminShell active="email-log">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>Reminder Email Log</h1>
    <p style={{color:"var(--muted)"}}>7-year audit trail of every reminder email queued or sent (CASL / BCFSA compliance).</p>
    <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"1rem"}}>
      {["","birthday","anniversary","possession","bc_assessment","mortgage_renewal","christmas","new_year"].map(t => (
        <button key={t||"all"} onClick={()=>setFilter(t)} className={filter===t?"btn btn-primary":"btn btn-ghost"} style={{padding:"0.35rem 0.9rem",fontSize:"0.82rem"}}>{t||"All"}</button>
      ))}
    </div>
    <table className="admin-table" data-testid="admin-email-log">
      <thead><tr><th>Sent</th><th>Client</th><th>Email</th><th>Type</th><th>Subject</th><th>Status</th></tr></thead>
      <tbody>{rows.length===0 ? <tr><td colSpan="6" style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No reminders sent yet.</td></tr> : rows.map((r,i)=><tr key={i}>
        <td style={{whiteSpace:"nowrap"}}>{r.sent_at?.slice(0,16).replace("T"," ")}</td>
        <td>{r.client_name}</td>
        <td>{r.client_email}</td>
        <td>{r.type}</td>
        <td>{r.subject}</td>
        <td>{r.status}</td>
      </tr>)}</tbody>
    </table>
  </AdminShell>;
};

// ── Master email outbox — every send from every campaign (saved-search alerts,
//   welcome series, buyer digest, dormant wake-up, admin tests). Backed by the
//   `email_outbox` Mongo collection which the Resend send wrapper writes to on
//   every attempt (success or failure). One-click flush retries every pending
//   / errored row so nothing sits stuck after DNS / API-key hiccups.
const AdminEmailOutbox = () => {
  const {headers} = useAdmin();
  const [data, setData] = useState({pending_count: 0, recent: []});
  const [busy, setBusy] = useState(false);
  const [flushResult, setFlushResult] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [testTo, setTestTo] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const load = () => axios.get(`${API}/admin/email-outbox`, {headers})
    .then(r => setData(r.data)).catch(() => {});
  useEffect(() => { if(headers) load(); }, []);
  const flush = async () => {
    if (!window.confirm("Retry every pending / failed email in the outbox now?")) return;
    setBusy(true); setFlushResult(null);
    try {
      const r = await axios.post(`${API}/admin/email-outbox/flush`, {}, {headers});
      setFlushResult(r.data);
      load();
    } catch (x) {
      setFlushResult({error: x?.response?.data?.detail || "Flush failed."});
    } finally { setBusy(false); }
  };
  const sendTest = async (e) => {
    e.preventDefault();
    if (!testTo) return;
    setTestBusy(true); setTestResult(null);
    try {
      const r = await axios.post(`${API}/admin/email/send-test`, {to: testTo}, {headers});
      setTestResult(r.data);
      load();
    } catch (x) {
      setTestResult({error: x?.response?.data?.detail || "Test send failed."});
    } finally { setTestBusy(false); }
  };
  const rows = statusFilter ? data.recent.filter(r => r.status === statusFilter) : data.recent;
  const statusCounts = data.recent.reduce((acc, r) => { acc[r.status] = (acc[r.status]||0)+1; return acc; }, {});
  const fmtDate = (s) => s ? String(s).slice(0,16).replace("T"," ") : "—";
  const statusPill = (s) => {
    const map = {sent:{bg:"#F0FDF4",fg:"#166534"}, pending:{bg:"#FEF3C7",fg:"#92400E"}, error:{bg:"#FEE2E2",fg:"#991B1B"}, failed:{bg:"#FEE2E2",fg:"#991B1B"}};
    const c = map[s] || {bg:"#F3F4F6",fg:"#374151"};
    return <span style={{fontSize:"0.7rem",fontWeight:700,padding:"0.18rem 0.5rem",borderRadius:999,background:c.bg,color:c.fg,textTransform:"uppercase",letterSpacing:"0.04em"}}>{s}</span>;
  };
  return <AdminShell active="email-outbox">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
      <h1 className="font-display" style={{fontSize:"2rem",margin:0}}>📬 Email Outbox</h1>
      <button className="btn btn-primary" onClick={flush} disabled={busy || data.pending_count===0} data-testid="email-outbox-flush">
        {busy ? "Flushing…" : `🔁 Retry pending (${data.pending_count})`}
      </button>
    </div>
    <p style={{color:"var(--muted)",marginTop:"0.5rem"}}>Every email the site sends via Resend — saved-search confirmations, alert digests, welcome series, dormant wake-ups, admin tests. Shows the last 500 attempts. Deliverability status comes straight from the Resend API.</p>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"0.75rem",marginTop:"1.25rem",marginBottom:"1.25rem"}}>
      <button onClick={()=>setStatusFilter("")} data-testid="outbox-filter-all" style={{background:statusFilter===""?"var(--brand-navy)":"#F0F4FB",color:statusFilter===""?"#fff":"var(--brand-navy)",border:"none",borderRadius:10,padding:"0.9rem 0.75rem",cursor:"pointer",textAlign:"left"}}>
        <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",opacity:0.8}}>Total (last 500)</div>
        <div style={{fontSize:"1.5rem",fontWeight:700,marginTop:"0.15rem"}}>{data.recent.length}</div>
      </button>
      <button onClick={()=>setStatusFilter("sent")} data-testid="outbox-filter-sent" style={{background:statusFilter==="sent"?"#22C55E":"#F0FDF4",color:statusFilter==="sent"?"#fff":"#166534",border:"none",borderRadius:10,padding:"0.9rem 0.75rem",cursor:"pointer",textAlign:"left"}}>
        <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",opacity:0.85}}>Delivered</div>
        <div style={{fontSize:"1.5rem",fontWeight:700,marginTop:"0.15rem"}}>{statusCounts.sent||0}</div>
      </button>
      <button onClick={()=>setStatusFilter("pending")} data-testid="outbox-filter-pending" style={{background:statusFilter==="pending"?"#F5A623":"#FEF3C7",color:statusFilter==="pending"?"#fff":"#92400E",border:"none",borderRadius:10,padding:"0.9rem 0.75rem",cursor:"pointer",textAlign:"left"}}>
        <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",opacity:0.85}}>Pending</div>
        <div style={{fontSize:"1.5rem",fontWeight:700,marginTop:"0.15rem"}}>{data.pending_count||0}</div>
      </button>
      <button onClick={()=>setStatusFilter("error")} data-testid="outbox-filter-error" style={{background:statusFilter==="error"?"#DC2626":"#FEE2E2",color:statusFilter==="error"?"#fff":"#991B1B",border:"none",borderRadius:10,padding:"0.9rem 0.75rem",cursor:"pointer",textAlign:"left"}}>
        <div style={{fontSize:"0.72rem",letterSpacing:"0.08em",textTransform:"uppercase",opacity:0.85}}>Errored</div>
        <div style={{fontSize:"1.5rem",fontWeight:700,marginTop:"0.15rem"}}>{(statusCounts.error||0)+(statusCounts.failed||0)}</div>
      </button>
    </div>

    {flushResult && (
      <div className="notice" style={{background:flushResult.error?"#FEE2E2":"#F0FDF4",borderColor:flushResult.error?"#DC2626":"#22C55E",marginBottom:"1.25rem"}} data-testid="outbox-flush-result">
        {flushResult.error
          ? <span>❌ {flushResult.error}</span>
          : <span>✅ Flushed — attempted <strong>{flushResult.attempted}</strong>, delivered <strong>{flushResult.sent}</strong>, still failing <strong>{flushResult.still_failed}</strong>.</span>}
      </div>
    )}

    {/* Test-send widget — verifies the whole send pipeline in one click */}
    <div style={{background:"#F0F4FB",border:"1px solid rgba(15,42,91,0.15)",borderRadius:12,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
      <div style={{fontWeight:700,color:"var(--brand-navy)",marginBottom:"0.5rem"}}>🧪 Send a live test email</div>
      <p style={{color:"var(--muted)",fontSize:"0.85rem",margin:"0 0 0.75rem"}}>Fires a real email through Resend from <code>info@eztofind.ca</code>. Verifies API key + DNS + sender in one shot.</p>
      <form onSubmit={sendTest} style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
        <input required type="email" value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="you@example.com" style={{flex:"1 1 220px",padding:"0.55rem 0.85rem",borderRadius:8,border:"1px solid rgba(15,42,91,0.15)",fontFamily:"inherit",fontSize:"0.9rem"}} data-testid="outbox-test-to"/>
        <button type="submit" disabled={testBusy} className="btn btn-primary" style={{padding:"0.5rem 1.15rem",fontSize:"0.9rem"}} data-testid="outbox-test-send">
          {testBusy ? "Sending…" : "Send test"}
        </button>
      </form>
      {testResult && (
        <div className="notice" style={{background:testResult.error?"#FEE2E2":"#F0FDF4",borderColor:testResult.error?"#DC2626":"#22C55E",marginTop:"0.75rem",fontSize:"0.85rem"}} data-testid="outbox-test-result">
          {testResult.error ? <>❌ {testResult.error}</> : <>✅ {testResult.status === "sent" ? "Delivered to Resend" : `Queued (${testResult.status})`}. Message ID: <code>{testResult.provider_message_id || "—"}</code></>}
        </div>
      )}
    </div>

    <table className="admin-table" data-testid="admin-email-outbox-table">
      <thead><tr>
        <th>Created</th><th>To</th><th>Subject</th><th>Kind</th><th>Provider</th><th>Attempts</th><th>Status</th><th>Error</th>
      </tr></thead>
      <tbody>
        {rows.length===0
          ? <tr><td colSpan="8" style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No emails in this bucket yet.</td></tr>
          : rows.map((r,i)=>(
            <tr key={i}>
              <td style={{whiteSpace:"nowrap",fontSize:"0.85rem"}}>{fmtDate(r.created_at)}</td>
              <td style={{fontSize:"0.85rem"}}>{r.to}</td>
              <td style={{maxWidth:"20rem",fontSize:"0.85rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.subject}>{r.subject}</td>
              <td style={{fontSize:"0.75rem",color:"var(--muted)"}}>{r.kind||"—"}</td>
              <td style={{fontSize:"0.75rem",color:"var(--muted)"}}>{r.provider||"—"}</td>
              <td style={{textAlign:"center",fontSize:"0.85rem"}}>{r.attempts||0}</td>
              <td>{statusPill(r.status)}</td>
              <td style={{maxWidth:"14rem",fontSize:"0.72rem",color:"#991B1B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.provider_error||""}>{r.provider_error||"—"}</td>
            </tr>
          ))
        }
      </tbody>
    </table>
  </AdminShell>;
};


// ── Consultation intake triage. Reads from /api/admin/consultations, lets
//   Doug flip status (new → contacted → booked → closed), and export the
//   entire audit trail as a CSV so his brokerage records satisfy CASL /
//   BCFSA audit requests.
const AdminConsultations = () => {
  const {headers} = useAdmin();
  const [data, setData] = useState({items: [], counts: {total:0}});
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => {
    if(!headers) return;
    const qs = new URLSearchParams();
    if(statusFilter) qs.set("status", statusFilter);
    if(roleFilter) qs.set("role", roleFilter);
    const url = `${API}/admin/consultations${qs.toString()?`?${qs}`:""}`;
    axios.get(url, {headers}).then(r => setData(r.data)).catch(()=>{});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter, roleFilter, headers && headers.Authorization]);
  const setStatus = async (id, status) => {
    try {
      await axios.post(`${API}/admin/consultations/${id}/status`, {status}, {headers});
      setMsg(`Updated ${id.slice(0,8)}… → ${status}`);
      load();
    } catch { setMsg("Update failed — try again."); }
    setTimeout(()=>setMsg(""), 2500);
  };
  const downloadCsv = async () => {
    const qs = new URLSearchParams();
    if(statusFilter) qs.set("status", statusFilter);
    if(roleFilter) qs.set("role", roleFilter);
    const url = `${API}/admin/consultations.csv${qs.toString()?`?${qs}`:""}`;
    try {
      const r = await axios.get(url, {headers, responseType: "blob"});
      const blob = new Blob([r.data], {type: "text/csv;charset=utf-8"});
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `eztofind-consultations-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
    } catch { setMsg("CSV download failed."); setTimeout(()=>setMsg(""), 2500); }
  };
  const c = data.counts || {};
  const pill = (s) => {
    const map = {new:"#2563EB", contacted:"#7C3AED", booked:"#059669", closed:"#374151", referred:"#F59E0B", archived:"#9CA3AF"};
    return <span style={{background: (map[s]||"#6B7280")+"22", color: map[s]||"#6B7280", padding:"0.15rem 0.55rem", borderRadius:999, fontSize:"0.72rem", fontWeight:700, textTransform:"uppercase", letterSpacing:0.4}}>{s}</span>;
  };
  return <AdminShell active="consultations">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.75rem"}}>
      <div>
        <h1 className="font-display" style={{fontSize:"2rem",marginTop:0,marginBottom:"0.3rem"}}>Consultation Intakes</h1>
        <p style={{color:"var(--muted)",margin:0}}>CASL + PIPA-compliant lead intakes from the homepage Consultation flow. {c.total||0} total.</p>
      </div>
      <button className="btn btn-primary" data-testid="admin-consultations-csv" onClick={downloadCsv} style={{padding:"0.6rem 1.1rem"}}>⬇ Export CSV</button>
    </div>

    <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",margin:"1.25rem 0"}}>
      {[
        ["", "All", c.total],
        ["new", "New", c.new],
        ["contacted", "Contacted", c.contacted],
        ["booked", "Booked", c.booked],
        ["referred", "Referred", c.referred],
        ["closed", "Closed", c.closed],
        ["archived", "Archived", c.archived],
      ].map(([v,l,n]) => (
        <button key={l} onClick={()=>setStatusFilter(v)} className={statusFilter===v?"btn btn-primary":"btn btn-ghost"} data-testid={`admin-consultations-filter-${v||"all"}`} style={{padding:"0.35rem 0.9rem",fontSize:"0.82rem"}}>{l} ({n||0})</button>
      ))}
    </div>
    <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"1rem",alignItems:"center"}}>
      <span style={{fontSize:"0.8rem",color:"var(--muted)"}}>Role:</span>
      {[["","All"],["buyer","Buyer"],["seller","Seller"]].map(([v,l]) => (
        <button key={l} onClick={()=>setRoleFilter(v)} className={roleFilter===v?"btn btn-primary":"btn btn-ghost"} style={{padding:"0.25rem 0.75rem",fontSize:"0.78rem"}}>{l}</button>
      ))}
      {msg && <span style={{marginLeft:"auto",color:"#059669",fontSize:"0.8rem",fontWeight:600}}>{msg}</span>}
    </div>

    <table className="admin-table" data-testid="admin-consultations-table">
      <thead><tr>
        <th>Received</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>City</th><th>Status</th><th style={{minWidth:220}}>Actions</th>
      </tr></thead>
      <tbody>
        {(data.items||[]).length===0 ? <tr><td colSpan="8" style={{textAlign:"center",padding:"2rem",color:"var(--muted)"}}>No consultation requests match this filter.</td></tr> :
          data.items.map(r => (
            <React.Fragment key={r.id}>
              <tr>
                <td style={{whiteSpace:"nowrap",fontFamily:"monospace",fontSize:"0.78rem"}}>{(r.created_at||"").slice(0,16).replace("T"," ")}</td>
                <td style={{fontWeight:600}}>{r.name}</td>
                <td><a href={`mailto:${r.email}`} style={{color:"var(--brand-blue)"}}>{r.email}</a></td>
                <td>{r.phone ? <a href={`tel:${r.phone}`} style={{color:"var(--brand-blue)"}}>{r.phone}</a> : <span style={{color:"var(--muted)"}}>—</span>}</td>
                <td style={{textTransform:"capitalize"}}>{r.role}{r.is_referral && <span style={{color:"#F59E0B",fontSize:"0.72rem",marginLeft:4}}>(referral)</span>}</td>
                <td>{r.city || <span style={{color:"var(--muted)"}}>—</span>}</td>
                <td>{pill(r.status || "new")}</td>
                <td>
                  <select
                    data-testid={`admin-consultation-status-${r.id}`}
                    value={r.status||"new"}
                    onChange={(e)=>setStatus(r.id, e.target.value)}
                    style={{padding:"0.35rem 0.5rem",borderRadius:6,border:"1px solid rgba(15,42,91,0.2)",fontSize:"0.8rem"}}
                  >
                    {["new","contacted","booked","referred","closed","archived"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={()=>setExpanded(expanded===r.id?null:r.id)} className="btn btn-ghost" style={{padding:"0.3rem 0.7rem",fontSize:"0.75rem",marginLeft:8}}>{expanded===r.id?"Hide":"Details"}</button>
                </td>
              </tr>
              {expanded===r.id && (
                <tr>
                  <td colSpan="8" style={{background:"rgba(15,42,91,0.03)",padding:"1rem 1.5rem"}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"0.75rem",fontSize:"0.82rem"}}>
                      <div><strong>ID:</strong> <code style={{fontSize:"0.72rem"}}>{r.id}</code></div>
                      <div><strong>Preferred contact:</strong> {r.preferred_contact||"—"}</div>
                      <div><strong>Preferred time:</strong> {r.preferred_time||"—"}</div>
                      <div><strong>Working with REALTOR®:</strong> {r.working_with_realtor?"Yes":"No"}</div>
                      <div><strong>Outside service area:</strong> {r.is_referral?"Yes (referral)":"No"}</div>
                      <div><strong>CASL consent at:</strong> {(r.casl_consent_at||"").slice(0,19).replace("T"," ")}</div>
                      <div><strong>PIPA ack at:</strong> {(r.pipa_ack_at||"").slice(0,19).replace("T"," ")}</div>
                      <div><strong>IP:</strong> <code style={{fontSize:"0.72rem"}}>{r.ip||"—"}</code></div>
                      <div style={{gridColumn:"1/-1"}}><strong>User agent:</strong> <span style={{fontSize:"0.72rem",color:"var(--muted)"}}>{r.user_agent||"—"}</span></div>
                      {r.status_history?.length>0 && (
                        <div style={{gridColumn:"1/-1"}}>
                          <strong>Status history:</strong>
                          <ul style={{margin:"0.35rem 0 0 1rem",padding:0,fontSize:"0.78rem"}}>
                            {r.status_history.map((h,i)=><li key={i}>{(h.at||"").slice(0,19).replace("T"," ")} — {h.status}{h.note?` · ${h.note}`:""}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))
        }
      </tbody>
    </table>
  </AdminShell>;
};



// --- Communities (all of BC) ---
const Communities = () => {
  const [data, setData] = useState({}); const [q, setQ] = useState("");
  useEffect(() => { axios.get(`${API}/communities`).then(r => setData(r.data)); }, []);
  const filt = (arr) => q ? arr.filter(c => c.toLowerCase().includes(q.toLowerCase())) : arr;
  return (<section className="section"><div className="container-x">
    <SEO
      title="BC Communities — 239 Community Profiles with Live Climate Data | EZtoFind.ca"
      description="Explore every incorporated BC community — 239 profiles across 12 regions with real Environment Canada climate normals, geography, and referral REALTOR® coverage."
      path="/communities"
    />
    <div style={{textAlign:"center",marginBottom:"2rem"}}>
      <div className="eyebrow">All of British Columbia</div>
      <h1 className="section-title">BC Communities</h1>
      <p className="section-sub">Every incorporated municipality, village, town, district, and community across British Columbia. For enquiries beyond my service area, I can connect you with a licensed REALTOR®. Ask to be referred through our <Link to="/referral-request" style={{color:"var(--brand-blue)",fontWeight:600}}>Referral REALTOR®</Link> link.</p>
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
  const [climate, setClimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingWx, setLoadingWx] = useState(true);
  useEffect(() => { axios.get(`${API}/communities`).then(r => setData(r.data)); }, []);
  useEffect(() => {
    setLoading(true); setSyn(null); setLoadingWx(true); setWx(null); setClimate(null);
    axios.get(`${API}/community/${slug}/synopsis`, {timeout: 90000}).then(r => { setSyn(r.data); setLoading(false); }).catch(() => setLoading(false));
    axios.get(`${API}/community/${slug}/weather`, {timeout: 90000}).then(r => { setWx(r.data); setLoadingWx(false); }).catch(() => setLoadingWx(false));
    axios.get(`${API}/community/${slug}/climate-normals`, {timeout: 30000}).then(r => setClimate(r.data)).catch(() => setClimate(null));
    // Personalization: remember this community + snapshot its median price so we
    // can show a "since your last visit" delta on the homepage. Anonymous — no
    // user identifier in the request. Same public data everyone gets.
    axios.get(`${API}/community/${slug}/stats`, {timeout: 15000}).then(r => {
      try {
        const s = r.data || {};
        const existing = JSON.parse(localStorage.getItem("ez_last_community") || "null");
        // Preserve the earliest snapshot so the delta reflects true "since first visit"
        const first_median = existing && existing.slug === slug ? (existing.first_median_price || existing.median_price_snapshot) : s.median_price;
        const first_at = existing && existing.slug === slug ? existing.first_at || existing.at : new Date().toISOString();
        localStorage.setItem("ez_last_community", JSON.stringify({
          slug, name: s.community, first_median_price: first_median, first_at,
          latest_median_price: s.median_price, latest_count: s.count, at: new Date().toISOString(),
        }));
      } catch {}
    }).catch(() => {});
  }, [slug]);
  let found = null, region = null;
  const _norm = (s) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for(const [r, list] of Object.entries(data)) { const m = list.find(c => _norm(c) === slug); if(m) { found = m; region = r; break; } }
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
    {found && <SEO
      title={`What is it like to live in ${found}, BC? Community Profile, Climate & Real Estate | EZtoFind.ca`}
      description={syn?.synopsis ? syn.synopsis.substring(0, 200) : `Everything about ${found}, British Columbia (${region}) — geography, Environment Canada climate normals, lifestyle, and REALTOR® coverage for buyers and sellers.`}
      path={`/community/${slug}`}
      schema={jsonLd}
    />}
    {found && <Helmet><script type="application/ld+json">{JSON.stringify({
      "@context":"https://schema.org","@type":"BreadcrumbList",
      "itemListElement":[
        {"@type":"ListItem","position":1,"name":"Home","item":"https://eztofind.ca/"},
        {"@type":"ListItem","position":2,"name":"Communities","item":"https://eztofind.ca/communities"},
        {"@type":"ListItem","position":3,"name":`${found}, BC`,"item":`https://eztofind.ca/community/${slug}`}
      ]
    })}</script></Helmet>}
    <Link to="/communities" style={{fontFamily:"Inter,sans-serif",color:"var(--brand-blue)",textDecoration:"none"}}>← All communities</Link>
    {found ? <>
      {found && <CommunityMap name={found} region={region}/>}
      <div style={{display:"flex",justifyContent:"center",marginBottom:"1.75rem"}}>
        <Link to={`/listings?city=${encodeURIComponent(found)}`} className="btn btn-primary" data-testid={`view-listings-in-${slug}`} style={{padding:"0.85rem 1.75rem",fontSize:"1rem"}}>
          🏡 View Active Listings in {found}
        </Link>
      </div>
      {slug && found && <VibeScore slug={slug} community={found}/>}
      <div className="eyebrow" style={{marginTop:"1rem"}}>{region}</div>
      <h1 className="section-title">{found}, BC</h1>
      {isFocus ? (
        <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7}}>
          {`${found} sits within Doug LeMaire's primary practice area. As a licensed BC REALTOR® with 13 years' experience specializing in detached, luxury, equestrian, estate-sale, and condo properties, Doug can represent buyers and sellers here directly.`}
        </p>
      ) : (
        <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",fontSize:"1.05rem",lineHeight:1.7}} data-testid="community-referral-copy">
          {`As a smaller BC community, ${found} falls outside the Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor focus areas — but that doesn't mean we can't help you get connected! 🐾 Would you like to be connected with a licensed REALTOR® in that area through Doug's referral network?`}
          {" "}
          <Link to={`/referral-request?city=${encodeURIComponent(found)}`} style={{color:"var(--brand-blue)",fontWeight:600,textDecoration:"underline"}} data-testid="community-referral-link">Referral REALTOR® link</Link>.
        </p>
      )}
      <div style={{marginTop:"2rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
        {isFocus ? <>
          <Link to="/buyer" className="btn btn-primary">I'm Buying in {found}</Link>
          <Link to="/seller" className="btn btn-green">I'm Selling in {found}</Link>
        </> : <Link to={`/referral-request?city=${encodeURIComponent(found)}`} className="btn btn-primary">Request a Referral REALTOR® in {found}</Link>}
        <Link to={`/listings?q=${encodeURIComponent(found)}`} className="btn btn-outline" data-testid={`community-view-listings-${slug}`}>View Listings in {found}</Link>
      </div>
      <h2 style={{marginTop:"3rem",fontSize:"1.75rem"}}>About {found}</h2>
      {loading && <div style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",padding:"1rem",background:"#F8F6EF",borderRadius:10,marginTop:"0.5rem"}}>🐾 Doogie is writing a synopsis of {found}… (first visit takes ~10 seconds, then instant forever)</div>}
      {!loading && syn?.synopsis && <>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"1.02rem",lineHeight:1.75,color:"var(--ink)",whiteSpace:"pre-wrap"}} data-testid="community-synopsis" dangerouslySetInnerHTML={{__html: safeHtml(syn.synopsis.replace(/Referral REALTOR® link/gi,'<a href="/referral-request" style="color:var(--brand-blue);text-decoration:underline;">Referral REALTOR® link</a>'))}}></div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.75rem",color:"var(--muted)",marginTop:"0.5rem",fontStyle:"italic"}}>All content on EZtoFind.ca, including Doogie's responses, the Glossary, Terms, FAQ's, community pages, weather, mortgage calculator, property transfer tax calculator is general information provided for educational purposes and is not a substitute for professional guidance tailored to your situation.</div>
        {syn.sources && syn.sources.length>0 && <SourcesBlock title="Authoritative Sources — Community Data" intro={`Verify official demographic, economic, and municipal information for ${found} directly with the governing authority:`} sources={syn.sources} testid="community-sources"/>}
        <PublishedByDoug compact/>
      </>}
      {!loading && syn?.note && <div className="notice" style={{marginTop:"1rem"}}>{syn.note}</div>}

      {slug && found && <NeighbourhoodDirectory slug={slug} community={found}/>}

      <h2 style={{marginTop:"3rem",fontSize:"1.75rem"}}>☀️ Weather &amp; Climate in {found}</h2>
      {slug && found && <CurrentWeather slug={slug} community={found}/>}
      {climate?.available && climate.monthly && <ClimateNormalsTable data={climate} community={found}/>}
      {loadingWx && !climate?.available && <div style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",padding:"1rem",background:"#F8F6EF",borderRadius:10,marginTop:"0.5rem"}}>🐾 Doogie is preparing the local climate summary…</div>}
      {!loadingWx && !climate?.available && wx?.weather && <>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"1.02rem",lineHeight:1.75,color:"var(--ink)",whiteSpace:"pre-wrap"}} data-testid="community-weather">{wx.weather}</div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.75rem",color:"var(--muted)",marginTop:"0.5rem",fontStyle:"italic"}}>AI-drafted climate summary. For authoritative data, see the Environment Canada sources below.</div>
      </>}
      {(climate?.available || (!loadingWx && wx?.weather)) && wx?.sources && wx.sources.length>0 && <SourcesBlock title="Authoritative Sources — Climate & Weather" intro={`Verify current weather, alerts, and historical climate records with Environment and Climate Change Canada:`} sources={wx.sources} testid="weather-sources"/>}
      {(climate?.available || (!loadingWx && wx?.weather)) && <PublishedByDoug compact/>}
      {!loadingWx && wx?.note && !climate?.available && <div className="notice" style={{marginTop:"1rem"}}>{wx.note}</div>}

      {articleLd && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleLd)}}/>}
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>}
    </> : <><h1 className="section-title">Loading…</h1></>}

    {/* Phase B — cross-type "You may also be looking for" cards for community
        pages. Silent-hide if empty or on fetch error. */}
    {slug && <YouMayAlsoBeLookingFor sourceType="community" sourceId={slug} limit={6} testId="community-you-may-also"/>}
  </div></section>);
};

// --- Market Estimate ---
const Valuation = () => {
  const [f, setF] = useState({full_name:"",email:"",phone:"",property_address:"",city:"",property_type:"Detached",timeline:"3-6 months",estimated_value:"Not sure",currently_listed:false,reason:"Just curious about current value",casl_consent:false,pipa_ack:false});
  const [done,setDone]=useState(false); const [err,setErr]=useState("");
  const submit = async e => { e.preventDefault(); setErr(""); try{ await axios.post(`${API}/leads/seller`,{...f, turnstile_token: getTurnstileToken()}); trackConversion("home_valuation_request", { timeline: f.timeline, property_type: f.property_type, city: f.city, currently_listed: f.currently_listed, currency: "CAD" }); trackConversion("seller_lead", { lead_type: "seller", property_type: f.property_type || "Any", source: "valuation_page", currency: "CAD" }); setDone(true);}catch(x){setErr("Please complete required fields and consents.");} };
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
      <TurnstileWidget/>
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="valuation-submit">Get My Market Estimate</button>
    </form>
  </div></section>);
};

// --- Referral Request (out-of-area) ---
const ReferralRequest = () => {
  const { lang, t, qs, rtl } = useFormLang();
  const [f,setF]=useState({full_name:"",email:"",phone:"",areas:[],property_type:"Detached",budget_range:"Not sure",timeline:"3-6 months",financing_status:"Working on it",first_time_buyer:false,working_with_realtor:false,notes:"",casl_consent:false,pipa_ack:false});
  const [city,setCity]=useState(""); const [done,setDone]=useState(false); const [err,setErr]=useState("");
  // Pre-fill from listing referral pill (?city=...&mls=...)
  const [prefillMls, setPrefillMls] = useState("");
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get("city"); const m = sp.get("mls");
    if (c && !city) setCity(c);
    if (m) {
      setPrefillMls(m);
      setF(prev => prev.notes ? prev : { ...prev, notes: `Interested in MLS® ${m}${c ? " in " + c : ""}.` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit=async e=>{e.preventDefault(); setErr(""); try{ await axios.post(`${API}/leads/buyer`,{...f,areas:[city],notes:`OUT-OF-AREA REFERRAL REQUEST — ${city}${prefillMls ? " · MLS® " + prefillMls : ""}. ${f.notes}`, form_lang: lang, turnstile_token: getTurnstileToken()}); trackConversion("generate_lead", { lead_type: "buyer_referral", property_type: f.property_type || "Any", region: city, currency: "CAD" }); setDone(true);}catch(x){setErr(t("common.required"));} };
  if(done) return <section className="section"><div className="container-x" style={{maxWidth:"36rem",textAlign:"center"}}><img src={DOOGIE_CELEBRATE} style={{width:200,margin:"0 auto"}} alt="Doogie"/><h1 className="section-title">{t("ref.success_title")}</h1><p className="section-sub">{t("ref.success_body")}</p></div></section>;
  return (<section className="section" dir={rtl?"rtl":"ltr"}><div className="container-x" style={{maxWidth:"42rem"}}>
    <div className="eyebrow">{t("ref.eyebrow")}</div><h1 className="section-title">{t("ref.title")}</h1>
    <p style={{fontFamily:"Inter,sans-serif",color:"var(--muted)",lineHeight:1.7,marginBottom:"1.5rem"}}>{t("ref.intro")}</p>
    <form onSubmit={submit} className="paper" data-testid="referral-form">
      <div className="form-grid">
        <div className="field"><label>{t("buyer.full_name")} *</label><input required value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})}/></div>
        <div className="field"><label>{t("buyer.email")} *</label><input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></div>
        <div className="field"><label>{t("buyer.phone")} *</label><input required value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></div>
        <div className="field"><label>{t("ref.city")} *</label><input required value={city} onChange={e=>setCity(e.target.value)} placeholder={t("ref.city_placeholder")}/></div>
        <div className="field"><label>{t("buyer.property_type")}</label><select value={f.property_type} onChange={e=>setF({...f,property_type:e.target.value})}><option value="Detached">{t("buyer.pt_detached")}</option><option value="Condo">{t("buyer.pt_condo")}</option><option value="Townhouse">{t("buyer.pt_townhouse")}</option><option value="Acreage / Rural">{t("buyer.pt_acreage")}</option><option value="Luxury">{t("buyer.pt_luxury")}</option></select></div>
        <div className="field"><label>{t("buyer.budget_range")}</label><select value={f.budget_range} onChange={e=>setF({...f,budget_range:e.target.value})}><option value="Under $500K">Under $500K</option><option value="$500K – $1M">$500K – $1M</option><option value="$1M – $2M">$1M – $2M</option><option value="$2M+">$2M+</option><option value="Not sure">Not sure</option></select></div>
      </div>
      <div style={{marginTop:"1rem"}} className="field"><label>{t("ref.notes")}</label><textarea rows="3" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></div>
      <div className="field" style={{marginTop:"1rem"}}><label className="check"><input required type="checkbox" checked={f.casl_consent} onChange={e=>setF({...f,casl_consent:e.target.checked})}/> {t("consent.casl")}</label></div>
      <div className="field"><label className="check"><input required type="checkbox" checked={f.pipa_ack} onChange={e=>setF({...f,pipa_ack:e.target.checked})}/> {t("consent.pipa")}</label></div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626"}}>{err}</div>}
      <TurnstileWidget/>
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} data-testid="referral-submit">{t("ref.submit")}</button>
    </form>
  </div></section>);
};

// --- Calculators (Mortgage + PTT — stacked, independent) ---
const fmtDollar = n => "$"+Math.round(n).toLocaleString();

// =====================================================================
// "What Can I Afford?" Reverse Calculator
// Replaces the old mortgage calculator. Uses current BC stress-test rules:
//   • Qualifying rate: max(contract + 2%, 5.25% floor)  — per OSFI B-20
//   • GDS max 39% (insured), TDS max 44% (insured)
//   • CMHC premium applies if down < 20%
//   • BC PTT: 1% first $200K, 2% $200K–$3M, 3% $3M+, +2% on residential > $3M
//   • FTB exemption optional
// Then shows max home price, monthly payment, extra cash needed at closing,
// and one-tap links to matching listings + a Doogie chat handoff.
// =====================================================================
const AffordabilityCalculator = () => {
  const [income,   setIncome  ] = useState("150,000");
  const [downStr,  setDownStr ] = useState("80,000");
  const [debtsStr, setDebtsStr] = useState("500");
  const [rate,     setRate    ] = useState(5.5);        // contract rate
  const [amort,    setAmort   ] = useState(25);
  const [propType, setPropType] = useState("Any");
  const [community,setCommunity] = useState("");
  const [ftb,      setFtb     ] = useState(false);
  const [comms,    setComms   ] = useState([]);
  useEffect(() => {
    axios.get(`${API}/communities`).then(r => {
      const list = [];
      Object.entries(r.data || {}).forEach(([_r, arr]) => arr.forEach(name => list.push(name)));
      setComms(list.sort());
    }).catch(()=>{});
  }, []);
  const onMoney = setter => e => {
    const raw = e.target.value.replace(/[^0-9]/g,"");
    setter(raw ? Number(raw).toLocaleString() : "");
  };
  const annualIncome = Number(String(income).replace(/[^0-9]/g,""))   || 0;
  const downPmt      = Number(String(downStr).replace(/[^0-9]/g,""))  || 0;
  const monthlyDebts = Number(String(debtsStr).replace(/[^0-9]/g,"")) || 0;
  const monthlyIncome = annualIncome / 12;

  // Qualifying rate (OSFI B-20 stress test): max(contract + 2%, 5.25% floor)
  const qualRate = Math.max(rate + 2, 5.25);
  const n = amort * 12;
  const rM = (qualRate / 100) / 12;
  // Monthly capacity — GDS 39%, TDS 44% (insured)
  const carryEstimate = (propType === "Condo" ? 150 : 0) + 250; // rough heat + property tax escrow monthly (educational estimate)
  const gdsCap = monthlyIncome * 0.39 - carryEstimate;
  const tdsCap = monthlyIncome * 0.44 - carryEstimate - monthlyDebts;
  const maxMonthlyPI = Math.max(0, Math.min(gdsCap, tdsCap));
  // Back out max mortgage principal from the maxMonthlyPI at qualifying rate
  const maxMortgage = rM > 0 && maxMonthlyPI > 0
    ? (maxMonthlyPI * (1 - Math.pow(1 + rM, -n))) / rM
    : 0;
  // If down < 20% of (mortgage + down), CMHC insurance premium reduces the effective mortgage a bit.
  // Simplification: cap at effective mortgage without premium; educational disclaimer covers precision.
  const maxHomePrice0 = maxMortgage + downPmt;
  // Iteratively subtract PTT + closing costs (they depend on price)
  const computePTT = (price) => {
    if (price <= 0) return 0;
    let ptt = 0;
    ptt += Math.min(price, 200000) * 0.01;
    if (price > 200000)  ptt += (Math.min(price, 3000000) - 200000) * 0.02;
    if (price > 3000000) ptt += (price - 3000000) * 0.03;
    if (price > 3000000) ptt += (price - 3000000) * 0.02; // additional 2% on residential > $3M
    return ptt;
  };
  const computeFtbExemption = (price, ptt) => {
    // 2024 rules: full exemption up to $500K portion, sliding to $835K FMV. Simplified.
    if (!ftb) return 0;
    if (price <= 500000) return ptt;
    if (price >= 835000) return 0;
    // Linear taper
    return ptt * (835000 - price) / 335000;
  };
  const closingCostsFixed = 2500; // legal ~$1,500 + inspection $500 + appraisal $400 + title $200 (educational)
  // 3-pass iteration to converge max price
  let priceCap = maxHomePrice0;
  for (let i = 0; i < 3; i++) {
    const ptt = computePTT(priceCap);
    const exempt = computeFtbExemption(priceCap, ptt);
    const closingTotal = Math.max(0, ptt - exempt) + closingCostsFixed;
    priceCap = maxMortgage + downPmt - closingTotal;
    if (priceCap < 0) { priceCap = 0; break; }
  }
  const finalPTT     = computePTT(priceCap);
  const finalExempt  = computeFtbExemption(priceCap, finalPTT);
  const netPTT       = Math.max(0, finalPTT - finalExempt);
  const totalClosing = netPTT + closingCostsFixed;
  const monthlyPmtAtContract = (() => {
    const rC = (rate / 100) / 12;
    return rC > 0 && maxMortgage > 0
      ? (maxMortgage * rC * Math.pow(1 + rC, n)) / (Math.pow(1 + rC, n) - 1)
      : 0;
  })();

  const linkParams = new URLSearchParams();
  linkParams.set("price_max", String(Math.floor(priceCap)));
  if (community)          linkParams.set("community", community);
  if (propType && propType !== "Any") linkParams.set("property_type", propType);
  const listingsHref = `/listings?${linkParams.toString()}`;

  const FieldBox = ({label, prefix, children, hint}) => (
    <div style={{flex:"1 1 240px",minWidth:220}}>
      <label style={{fontFamily:"Inter,sans-serif",fontWeight:600,color:"var(--brand-navy)",fontSize:"0.9rem",display:"block",marginBottom:"0.4rem"}}>{label}</label>
      <div style={{position:"relative",background:"rgba(240,244,251,0.5)",border:"1px solid rgba(15,42,91,0.1)",borderRadius:999,padding:"0.85rem 1rem 0.85rem 2.4rem",fontFamily:"Inter,sans-serif"}}>
        <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"var(--muted)",fontSize:"1rem"}}>{prefix}</span>
        {children}
      </div>
      {hint && <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:"0.25rem",fontFamily:"Inter,sans-serif"}}>{hint}</div>}
    </div>
  );

  return (
    <div className="paper" data-testid="afford-calculator" style={{background:"#F7FAFF"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:"1.25rem"}}>
        <img src={DOOGIE_POINT_L_T} alt="Doogie" style={{width:72,height:72,borderRadius:"50%",background:"#fff",border:"3px solid var(--brand-gold)",objectFit:"cover"}}/>
      </div>

      <div style={{display:"flex",flexWrap:"wrap",gap:"1rem"}}>
        <FieldBox label="Annual household income" prefix="$" hint="Before tax, all earners combined">
          <input value={income} onChange={onMoney(setIncome)} inputMode="numeric" data-testid="afford-income" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)"}}/>
        </FieldBox>
        <FieldBox label="Down payment saved" prefix="$" hint="Cash on hand for down payment">
          <input value={downStr} onChange={onMoney(setDownStr)} inputMode="numeric" data-testid="afford-down" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)"}}/>
        </FieldBox>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"1rem",marginTop:"1rem"}}>
        <FieldBox label="Monthly debt payments" prefix="$" hint="Car, credit cards, student loans">
          <input value={debtsStr} onChange={onMoney(setDebtsStr)} inputMode="numeric" data-testid="afford-debts" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)"}}/>
        </FieldBox>
        <FieldBox label="Preferred community" prefix="📍" hint="Optional — we'll match listings">
          <select value={community} onChange={e=>setCommunity(e.target.value)} data-testid="afford-community" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)",appearance:"none"}}>
            <option value="">Any BC community</option>
            {comms.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FieldBox>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"1rem",marginTop:"1rem",alignItems:"center"}}>
        <FieldBox label="Property type" prefix="🏡" hint="">
          <select value={propType} onChange={e=>setPropType(e.target.value)} data-testid="afford-type" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)",appearance:"none"}}>
            <option>Any</option>
            <option>Detached</option>
            <option>Condo</option>
            <option>Townhouse</option>
            <option>Acreage</option>
          </select>
        </FieldBox>
        <FieldBox label="Contract interest rate (%)" prefix="%" hint={`Stress-tested at ${qualRate.toFixed(2)}% (OSFI B-20)`}>
          <input type="number" step="0.05" value={rate} onChange={e=>setRate(+e.target.value||0)} data-testid="afford-rate" style={{border:"none",outline:"none",background:"transparent",width:"100%",fontSize:"1rem",fontFamily:"Inter,sans-serif",color:"var(--ink)"}}/>
        </FieldBox>
      </div>
      <div style={{marginTop:"1rem",display:"flex",gap:"1.25rem",flexWrap:"wrap",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",alignItems:"center"}}>
        <label style={{display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer"}}>
          <input type="checkbox" checked={ftb} onChange={e=>setFtb(e.target.checked)} data-testid="afford-ftb"/>
          <span>I'm a first-time home buyer (BC PTT exemption)</span>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <span>Amortization:</span>
          <select value={amort} onChange={e=>setAmort(+e.target.value)} data-testid="afford-amort" style={{padding:"0.4rem 0.6rem",borderRadius:8,border:"1px solid rgba(15,42,91,0.15)"}}>
            <option value={15}>15 yrs</option>
            <option value={20}>20 yrs</option>
            <option value={25}>25 yrs</option>
            <option value={30}>30 yrs</option>
          </select>
        </label>
      </div>

      {/* Big result card */}
      <div style={{background:"linear-gradient(135deg,#0F2A5B 0%,#1E4180 100%)",color:"#fff",borderRadius:14,marginTop:"1.5rem",padding:"1.5rem 1.25rem",fontFamily:"Inter,sans-serif",textAlign:"center",boxShadow:"0 10px 24px rgba(15,42,91,0.18)"}}>
        <div style={{fontSize:"0.78rem",letterSpacing:"0.08em",textTransform:"uppercase",opacity:0.75,fontWeight:600}}>You can afford up to</div>
        <div data-testid="afford-max-price" style={{fontFamily:"Sora,sans-serif",fontSize:"clamp(1.6rem, 9vw, 3rem)",fontWeight:700,margin:"0.35rem 0",lineHeight:1.05,letterSpacing:"-0.01em",overflowWrap:"anywhere",wordBreak:"break-word"}}>{fmtDollar(Math.max(0, Math.floor(priceCap/1000)*1000))}</div>
        <div style={{fontSize:"0.9rem",opacity:0.85}}>Based on BC stress test at qualifying rate {qualRate.toFixed(2)}%</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:"0.75rem",marginTop:"1rem",fontFamily:"Inter,sans-serif"}}>
        {[
          {l:"Max mortgage",   v:fmtDollar(Math.max(0, maxMortgage)),        t:"afford-max-mortgage"},
          {l:"Down payment",   v:fmtDollar(downPmt),                          t:"afford-down-display"},
          {l:"Monthly payment",v:fmtDollar(Math.max(0, monthlyPmtAtContract)),t:"afford-monthly", hint:`at ${rate}%`},
          {l:"BC PTT",         v:fmtDollar(Math.max(0, netPTT)),              t:"afford-ptt",     hint: ftb ? "after FTB exemption" : ""},
          {l:"Closing costs",  v:fmtDollar(closingCostsFixed),                t:"afford-closing", hint:"legal + inspection est."},
          {l:"Cash at closing",v:fmtDollar(downPmt + totalClosing),           t:"afford-cash",    hint:"down + PTT + closing"},
        ].map(x => (
          <div key={x.l} style={{background:"#F0F4FB",borderRadius:10,padding:"0.85rem 0.6rem",textAlign:"center"}}>
            <div style={{fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.04em",color:"var(--muted)",textTransform:"uppercase"}}>{x.l}</div>
            <div data-testid={x.t} style={{fontSize:"1.1rem",fontWeight:700,color:"var(--brand-navy)",marginTop:"0.25rem",lineHeight:1.15}}>{x.v}</div>
            {x.hint && <div style={{fontSize:"0.65rem",color:"var(--muted)",marginTop:"0.15rem"}}>{x.hint}</div>}
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap",marginTop:"1.25rem"}}>
        <Link to={listingsHref} className="btn btn-primary" data-testid="afford-see-listings" style={{flex:"1 1 240px",textAlign:"center",textDecoration:"none"}}>
          🏡 Show me listings under {fmtDollar(Math.floor(priceCap/1000)*1000)}
        </Link>
      </div>

      <p style={{fontFamily:"Inter,sans-serif",fontSize:"0.75rem",color:"var(--muted)",lineHeight:1.55,marginTop:"1rem",marginBottom:0,textAlign:"center"}}>
        Educational estimate only. Actual approval depends on your lender's assessment of credit, employment, down-payment source, and CMHC insurance eligibility. BC PTT calculation follows current statute; the FTB exemption is a linear approximation of the sliding scale (verify at <a href="https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax" target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>gov.bc.ca ↗</a>). Speak to a licensed mortgage broker before making an offer.
      </p>
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

export const Calculators = () => (
  <section className="section"><div className="container-x" style={{maxWidth:"52rem"}}>
    <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
      <h2 style={{fontFamily:"'Source Sans 3', 'Inter', sans-serif",fontWeight:700,fontSize:"clamp(2rem, 3.5vw, 3rem)",lineHeight:1.1,margin:"0 0 1rem",color:"var(--brand-navy)",letterSpacing:"-0.01em"}}>
        What can you <span className="accent">afford?</span>
      </h2>
    </div>
    <AffordabilityCalculator/>
  </div></section>
);

// --- Favorites page — hydrates cards from localStorage + optional email sync
// --------------------------------------------------------------------------
// Reads listing_keys from localStorage["ez_favorites"], fetches full listing
// data via /api/listings/by-keys, and renders them as cards. If the URL has
// ?token=... (from a confirmation email), it fetches the server-saved list
// and merges it into local storage.
const Favorites = () => {
  const [params] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  // Server-sync form state
  const [showSync, setShowSync] = useState(false);
  const [syncEmail, setSyncEmail] = useState("");
  const [syncCasl, setSyncCasl] = useState(false);
  const [syncPipa, setSyncPipa] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [syncErr, setSyncErr] = useState("");

  const hydrate = async () => {
    const keys = _readFavs();
    if (keys.length === 0) { setListings([]); setLoading(false); return; }
    setLoading(true);
    try {
      const r = await axios.get(`${API}/listings/by-keys?keys=${encodeURIComponent(keys.join(","))}`);
      setListings(r.data.listings || []);
    } catch { setListings([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { hydrate(); }, []);
  useEffect(() => {
    const h = () => hydrate();
    window.addEventListener("ez-favorites-changed", h);
    return () => window.removeEventListener("ez-favorites-changed", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle server-confirmation redirect: /favorites?token=xyz
  useEffect(() => {
    const tok = params.get("token");
    if (!tok) return;
    axios.get(`${API}/favorites/verify?token=${encodeURIComponent(tok)}`)
      .then(r => {
        const serverKeys = r.data.listing_keys || [];
        if (serverKeys.length > 0) {
          // Merge server list into local (dedup, preserve local order first)
          const localKeys = _readFavs();
          const merged = [...new Set([...localKeys, ...serverKeys])];
          _writeFavs(merged);
          setNotice(`✅ Confirmed! ${serverKeys.length} favorite(s) synced from your account.`);
        } else {
          setNotice("✅ Confirmed! Nothing to import yet — heart some listings to get started.");
        }
      })
      .catch(() => setNotice("This confirmation link is expired or invalid. Please re-submit your email below to try again."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAll = () => {
    if (!window.confirm("Remove all favorites from this browser? (Server-synced favorites are unaffected — you can restore them by entering your email below.)")) return;
    _writeFavs([]);
  };

  const syncSubmit = async (e) => {
    e.preventDefault(); setSyncErr(""); setSyncMsg("");
    if (!syncCasl || !syncPipa) { setSyncErr("Please tick both consent boxes."); return; }
    const keys = _readFavs();
    if (keys.length === 0) { setSyncErr("Heart a few listings first — nothing to sync yet."); return; }
    setSyncBusy(true);
    try {
      const r = await axios.post(`${API}/favorites`, {
        email: syncEmail, listing_keys: keys,
        casl_consent: syncCasl, pipa_ack: syncPipa,
      });
      setSyncMsg(r.data.message || "Check your email for the confirmation link.");
    } catch (x) {
      setSyncErr(x?.response?.data?.detail || "Could not send confirmation. Please try again.");
    } finally { setSyncBusy(false); }
  };

  return (
    <section className="section"><div className="container-x">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:"1rem"}}>
        <div>
          <h1 className="section-title" style={{margin:0}}>❤️ My Favorites</h1>
          <p style={{color:"var(--muted)",marginTop:"0.5rem",maxWidth:"46rem"}}>Listings you've hearted while browsing. Saved to this browser only unless you sync to your email below.</p>
        </div>
        {listings.length > 0 && (
          <button onClick={clearAll} className="btn btn-outline" data-testid="fav-clear-all" style={{fontSize:"0.85rem"}}>Clear all from this browser</button>
        )}
      </div>

      {notice && (
        <div className="notice" style={{background:"#F0FDF4",borderColor:"#22C55E",marginTop:"1.5rem"}} data-testid="fav-notice">{notice}</div>
      )}

      {loading ? (
        <div style={{textAlign:"center",padding:"3rem 0",color:"var(--muted)"}}>Loading your saved listings…</div>
      ) : listings.length === 0 ? (
        <div className="paper" style={{marginTop:"2rem",textAlign:"center",padding:"3rem 1.5rem"}} data-testid="fav-empty">
          <div style={{fontSize:"3rem",marginBottom:"0.5rem"}}>🤍</div>
          <h2 style={{fontFamily:"Sora,sans-serif",fontSize:"1.4rem",color:"var(--brand-navy)",marginBottom:"0.5rem"}}>No favorites yet</h2>
          <p style={{color:"var(--muted)",maxWidth:"32rem",margin:"0 auto 1.5rem"}}>Browse BC MLS® listings and click the heart on any card to save it here. Great for shortlisting properties before you talk to a REALTOR®.</p>
          <Link to="/listings" className="btn btn-primary" data-testid="fav-browse-cta">Browse Listings</Link>
        </div>
      ) : (
        <>
          <div style={{marginTop:"2rem",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",color:"var(--muted)"}}>{listings.length} saved listing{listings.length===1?"":"s"}</div>
          <div className="listings-grid" style={{marginTop:"1rem"}} data-testid="fav-grid">
            {listings.map(l => <ListingCard key={l.listing_key} listing={l}/>)}
          </div>
        </>
      )}

      {/* Email-sync CTA */}
      <div className="paper" style={{marginTop:"3rem",background:"#FEF3C7"}}>
        <h2 style={{fontFamily:"Sora,sans-serif",fontSize:"1.35rem",color:"var(--brand-navy)",marginTop:0}}>📱 Access on all your devices</h2>
        <p style={{color:"var(--ink)",lineHeight:1.6}}>Save your favorites to your email so you can pick up where you left off on your phone, tablet, or another computer. We'll also let you know if a saved listing drops in price or has new photos (optional).</p>
        {!showSync ? (
          <button onClick={()=>setShowSync(true)} className="btn btn-primary" data-testid="fav-show-sync">Save to my email</button>
        ) : (
          <form onSubmit={syncSubmit} style={{marginTop:"1rem"}}>
            <div className="field"><label>Email address</label>
              <input type="email" required value={syncEmail} onChange={e=>setSyncEmail(e.target.value)} data-testid="fav-sync-email" placeholder="you@example.com"/>
            </div>
            <label style={{display:"flex",gap:"0.6rem",marginTop:"1rem",alignItems:"flex-start",fontSize:"0.85rem",lineHeight:1.5}}>
              <input type="checkbox" checked={syncCasl} onChange={e=>setSyncCasl(e.target.checked)} data-testid="fav-sync-casl" style={{marginTop:"0.2rem"}}/>
              <span><strong>CASL consent:</strong> I consent to receive a confirmation email and (optionally) occasional updates about my saved listings (price changes, new photos, status changes). I can unsubscribe any time with one click.</span>
            </label>
            <label style={{display:"flex",gap:"0.6rem",marginTop:"0.75rem",alignItems:"flex-start",fontSize:"0.85rem",lineHeight:1.5}}>
              <input type="checkbox" checked={syncPipa} onChange={e=>setSyncPipa(e.target.checked)} data-testid="fav-sync-pipa" style={{marginTop:"0.2rem"}}/>
              <span><strong>PIPA acknowledgement:</strong> I've read the <Link to="/privacy" style={{color:"var(--brand-blue)"}}>Privacy Policy</Link> and understand my email and saved listings will be stored securely for the purpose of cross-device sync and optional listing-update notifications.</span>
            </label>
            {syncErr && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}} data-testid="fav-sync-error">{syncErr}</div>}
            {syncMsg && <div className="notice" style={{background:"#F0FDF4",borderColor:"#22C55E",marginTop:"1rem"}} data-testid="fav-sync-success">{syncMsg}</div>}
            <button type="submit" className="btn btn-primary" disabled={syncBusy} style={{marginTop:"1.5rem"}} data-testid="fav-sync-submit">
              {syncBusy ? "Sending…" : "Send confirmation email"}
            </button>
          </form>
        )}
      </div>
    </div></section>
  );
};


// --- Data Attribution (CREA DDF® direct feed) ---
const DataAttribution = () => (<Legal title="MLS® Data Attribution" body={<>
  <p>Listings displayed on EZtoFind.ca are sourced under license directly from the <strong>Canadian Real Estate Association's Data Distribution Facility (CREA DDF®)</strong> under a signed technology-provider agreement. The DDF® aggregates active MLS® listings from participating real estate boards across British Columbia, including:</p>
  <ul style={{lineHeight:2}}>
    <li>Greater Vancouver REALTORS® (GVR)</li>
    <li>Fraser Valley Real Estate Board (FVREB)</li>
    <li>Chilliwack &amp; District Real Estate Board (CADREB)</li>
    <li>BC Northern Real Estate Board (BCNREB)</li>
    <li>Association of Interior REALTORS® (AIR)</li>
    <li>Kootenay Association of REALTORS® (KAR)</li>
    <li>Vancouver Island Real Estate Board (VIREB)</li>
    <li>Victoria Real Estate Board (VREB)</li>
  </ul>
  <p>REALTOR® and MLS® are certification marks owned by the Canadian Real Estate Association (CREA) and used under license. Listing data is the property of the applicable listing brokerage and board. EZtoFind.ca does not scrape or mirror data from third-party websites — all listings shown on this site are received directly through CREA's authorized DDF® data feed and refreshed on a compliant cadence.</p>
</>}/>);

// --- Email Preferences (per-campaign CASL preference center) ---
// Reached via a signed token in every CASL email footer:
//   https://eztofind.ca/email-preferences?token=xyz
// Also supports one-click campaign unsub via ?unsub=<campaign>
const EmailPreferences = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const unsubCampaign = params.get("unsub") || "";
  const [state, setState] = useState({ loading: true, data: null, err: null });
  const [saving, setSaving] = useState(null);   // campaign_id currently saving
  const [autoUnsubDone, setAutoUnsubDone] = useState(false);
  useEffect(() => {
    if (!token) { setState({ loading: false, data: null, err: "Missing preference token. Please use the link from any EZtoFind.ca email." }); return; }
    axios.get(`${API}/email-preferences`, { params: { token } })
      .then(async r => {
        // If ?unsub=<campaign> was present, auto-toggle that campaign off first
        if (unsubCampaign && r.data.campaigns.find(c => c.id === unsubCampaign)?.opted_in && !autoUnsubDone) {
          try {
            await axios.post(`${API}/email-preferences/update`, { token, campaign: unsubCampaign, opt_in: false });
            setAutoUnsubDone(true);
            const r2 = await axios.get(`${API}/email-preferences`, { params: { token } });
            setState({ loading: false, data: r2.data, err: null });
          } catch { setState({ loading: false, data: r.data, err: null }); }
        } else { setState({ loading: false, data: r.data, err: null }); }
      })
      .catch(x => setState({ loading: false, data: null, err: x?.response?.data?.detail || "Invalid or expired link." }));
  }, [token, unsubCampaign]);
  const toggle = async (campaign, opt_in) => {
    setSaving(campaign);
    try {
      await axios.post(`${API}/email-preferences/update`, { token, campaign, opt_in });
      const r = await axios.get(`${API}/email-preferences`, { params: { token } });
      setState({ loading: false, data: r.data, err: null });
    } catch (x) { alert("Could not save. Try again or email info@eztofind.ca."); }
    finally { setSaving(null); }
  };
  const unsubAll = async () => {
    if (!window.confirm("Unsubscribe from ALL EZtoFind.ca emails? You can re-subscribe here anytime.")) return;
    setSaving("_all");
    try {
      await axios.get(`${API}/email-preferences/unsubscribe-all`, { params: { token } });
      const r = await axios.get(`${API}/email-preferences`, { params: { token } });
      setState({ loading: false, data: r.data, err: null });
    } catch { alert("Could not unsubscribe. Email info@eztofind.ca for manual removal."); }
    finally { setSaving(null); }
  };
  return (<section className="section"><div className="container-x" style={{maxWidth:"42rem"}}>
    <SEO title="Email Preferences — EZtoFind.ca" description="Manage your EZtoFind.ca email preferences under CASL." path="/email-preferences"/>
    <div className="eyebrow">Email preferences</div>
    <h1 className="section-title">Manage your email preferences</h1>
    <p className="section-sub">Under Canada's Anti-Spam Legislation (CASL), you can opt in or out of each email type independently. Changes take effect immediately.</p>
    {state.loading && <p style={{marginTop:"2rem"}} data-testid="prefs-loading">Loading your preferences…</p>}
    {state.err && !state.loading && (
      <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1.5rem"}} data-testid="prefs-err">
        ⚠️ {state.err}<br/><br/>You can still unsubscribe by emailing <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a>.
      </div>
    )}
    {autoUnsubDone && <div className="notice" style={{background:"#F0FDF4",borderColor:"#22C55E",marginTop:"1.5rem"}} data-testid="prefs-auto-unsub">✅ You've been unsubscribed from that campaign. Manage other preferences below.</div>}
    {state.data && (
      <div style={{marginTop:"2rem"}} data-testid="prefs-panel">
        <p style={{fontSize:"0.9rem",color:"var(--muted)"}}>Signed in as <strong>{state.data.email}</strong></p>
        <div style={{marginTop:"1.5rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
          {state.data.campaigns.map(c => (
            <label key={c.id} className="paper" style={{padding:"1rem 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem",cursor: saving===c.id?"wait":"pointer"}} data-testid={`prefs-row-${c.id}`}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,color:"var(--brand-navy)"}}>{c.label}</div>
                <div style={{fontSize:"0.82rem",color:"var(--muted)",marginTop:"0.2rem"}}>{c.description}</div>
              </div>
              <input type="checkbox" checked={c.opted_in} disabled={saving===c.id}
                onChange={e => toggle(c.id, e.target.checked)}
                data-testid={`prefs-toggle-${c.id}`}
                style={{width:22,height:22,cursor: saving===c.id?"wait":"pointer",accentColor:"var(--brand-blue)"}}/>
            </label>
          ))}
        </div>
        <div style={{marginTop:"2rem",padding:"1rem 1.25rem",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8}}>
          <div style={{fontWeight:600,color:"#7F1D1D",marginBottom:"0.4rem"}}>Global unsubscribe</div>
          <p style={{fontSize:"0.85rem",color:"#7F1D1D",margin:"0 0 0.75rem"}}>Kill everything at once. You can always re-subscribe here later.</p>
          <button className="btn btn-ghost" onClick={unsubAll} disabled={saving==="_all"} data-testid="prefs-unsub-all" style={{borderColor:"#DC2626",color:"#DC2626"}}>
            {saving==="_all" ? "Unsubscribing…" : "Unsubscribe from all EZtoFind.ca emails"}
          </button>
        </div>
      </div>
    )}
  </div></section>);
};


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
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState(() => {
    const stored = localStorage.getItem("ez_cookie_prefs");
    if (stored) { try { return JSON.parse(stored); } catch(_){} }
    return { essential: true, analytics: false, session: true };  // Essential is always on
  });

  // Allow any component (e.g. the Footer link) to re-open the preferences modal
  // by dispatching a global "open-cookie-prefs" event. This is our "give it back"
  // path when a user accidentally clicked "Reject optional" and now wants analytics.
  useEffect(() => {
    const handler = () => {
      // Refresh the current prefs from storage so the modal reflects saved state.
      try {
        const stored = localStorage.getItem("ez_cookie_prefs");
        if (stored) setPrefs(JSON.parse(stored));
      } catch(_){}
      setShow(true);
      setShowPrefs(true);
    };
    window.addEventListener("open-cookie-prefs", handler);
    return () => window.removeEventListener("open-cookie-prefs", handler);
  }, []);

  const save = (finalPrefs) => {
    const record = { accepted: true, at: new Date().toISOString(), ua: navigator.userAgent, prefs: finalPrefs };
    localStorage.setItem("ez_cookie", JSON.stringify(record));
    localStorage.setItem("ez_cookie_prefs", JSON.stringify(finalPrefs));
    // Broadcast so listeners (PostHog gate, PageViewBeacon) can react without a reload.
    try { window.dispatchEvent(new CustomEvent("ez-cookie-prefs-changed", { detail: finalPrefs })); } catch(_){}
    setShow(false); setShowPrefs(false);
  };
  const acceptAll = () => save({ essential: true, analytics: true, session: true });
  const rejectOptional = () => save({ essential: true, analytics: false, session: true });
  const savePrefs = () => save({ ...prefs, essential: true });

  if (!show) return null;

  return <>
    <div role="dialog" aria-label="Cookie & Privacy Preferences" data-testid="cookie-banner"
      style={{position:"fixed",bottom:20,left:20,right:20,maxWidth:600,background:"var(--brand-navy)",color:"white",padding:"1rem 1.25rem",borderRadius:12,zIndex:59,boxShadow:"0 20px 40px rgba(0,0,0,0.3)",fontFamily:"Inter,sans-serif",fontSize:"0.9rem"}}>
      <div style={{marginBottom:"0.75rem"}}>
        EZtoFind.ca uses cookies to run this site and improve your experience. Under BC's <strong>Personal Information Protection Act (PIPA)</strong> you can choose which cookies to allow. Essential cookies are always on. See our <Link to="/privacy" style={{color:"var(--brand-gold)"}}>Privacy Policy</Link>.
      </div>
      <div style={{marginBottom:"0.75rem",fontSize:"0.78rem",color:"rgba(255,255,255,0.75)",lineHeight:1.5,fontStyle:"italic"}}>
        Tip: Accepting all cookies helps us remember your language, search filters, and recently viewed listings between visits. Choosing "Reject optional" keeps you fully private, but some personalization features (saved filters, chat history, page-view analytics) won't be available.
      </div>
      <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
        <button className="btn btn-green" onClick={acceptAll} style={{padding:"0.5rem 1rem"}} data-testid="cookie-accept-all">Accept all</button>
        <button className="btn btn-outline" onClick={rejectOptional} style={{padding:"0.5rem 1rem",background:"transparent",color:"#fff",borderColor:"rgba(255,255,255,0.4)"}} data-testid="cookie-reject-optional">Reject optional</button>
        <button className="btn btn-outline" onClick={()=>setShowPrefs(true)} style={{padding:"0.5rem 1rem",background:"transparent",color:"var(--brand-gold)",borderColor:"var(--brand-gold)"}} data-testid="cookie-customize">Customize</button>
      </div>
    </div>

    {showPrefs && (
      <div
        onClick={(e)=>{if(e.target===e.currentTarget) setShowPrefs(false);}}
        style={{position:"fixed",inset:0,background:"rgba(15,42,91,0.6)",backdropFilter:"blur(4px)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
        data-testid="cookie-prefs-modal">
        <div style={{background:"#fff",borderRadius:14,maxWidth:520,width:"100%",padding:"1.5rem",boxShadow:"0 20px 60px rgba(0,0,0,0.35)"}}>
          <h3 className="font-display" style={{margin:0,fontSize:"1.4rem",color:"var(--brand-navy)"}}>Cookie Preferences</h3>
          <p style={{fontSize:"0.85rem",color:"var(--muted)",margin:"0.5rem 0 1rem"}}>Choose which cookies EZtoFind.ca may use on your device. You can change this later. Enabling all categories gives the smoothest experience — turning any off simply limits that specific feature (never blocks the site).</p>

          <div style={{border:"1px solid rgba(15,42,91,0.15)",borderRadius:10,padding:"0.9rem 1rem",marginBottom:"0.75rem",background:"#F8F9FA"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><strong>Essential (required)</strong><div style={{fontSize:"0.8rem",color:"var(--muted)"}}>Session, security (Turnstile), consent state.</div></div>
              <span style={{fontSize:"0.75rem",fontWeight:600,color:"var(--muted)"}}>ALWAYS ON</span>
            </div>
          </div>

          <label style={{display:"block",border:"1px solid rgba(15,42,91,0.15)",borderRadius:10,padding:"0.9rem 1rem",marginBottom:"0.75rem",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><strong>Analytics</strong><div style={{fontSize:"0.8rem",color:"var(--muted)"}}>Anonymous page-view tracking used to improve the site. No third-party ad networks.</div></div>
              <input type="checkbox" checked={prefs.analytics} onChange={e=>setPrefs({...prefs,analytics:e.target.checked})} style={{width:20,height:20,cursor:"pointer"}} data-testid="cookie-toggle-analytics"/>
            </div>
          </label>

          <label style={{display:"block",border:"1px solid rgba(15,42,91,0.15)",borderRadius:10,padding:"0.9rem 1rem",marginBottom:"1rem",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><strong>Personalization</strong><div style={{fontSize:"0.8rem",color:"var(--muted)"}}>Remember your Doogie session, saved searches, favorites, last-viewed community, and your name/email so you don't have to re-type them. Powers the "welcome back" personalized homepage. All stored on this device only — never sent to our servers.</div></div>
              <input type="checkbox" checked={prefs.session} onChange={e=>setPrefs({...prefs,session:e.target.checked})} style={{width:20,height:20,cursor:"pointer"}} data-testid="cookie-toggle-session"/>
            </div>
          </label>

          <div style={{display:"flex",gap:"0.5rem",justifyContent:"flex-end"}}>
            <button className="btn btn-outline" onClick={()=>setShowPrefs(false)} style={{padding:"0.5rem 1rem"}} data-testid="cookie-prefs-cancel">Cancel</button>
            <button className="btn btn-primary" onClick={savePrefs} style={{padding:"0.5rem 1rem"}} data-testid="cookie-prefs-save">Save preferences</button>
          </div>
        </div>
      </div>
    )}
  </>;
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
    "email":"info@eztofind.ca",
    "sameAs":[
      "https://maps.app.goo.gl/u8Fx3yDnSCyPUmGr9",
      "https://ez2find.ca"
    ]
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data)}}/>;
};

// --- Compliance strip ---
const ComplianceStrip = () => (
  <div className="compliance-strip" style={{background:"#F5F0E1",padding:"0.6rem 1rem",fontFamily:"Inter,sans-serif",fontSize:"1.28rem",color:"var(--ink)",fontWeight:700,textAlign:"center",borderBottom:"1px solid rgba(15,42,91,0.08)"}}>
    EZtoFind.ca provides general educational information about BC real estate — not legal, tax, financial, or real estate advice. For your own situation, speak with the appropriate licensed professional: a BC lawyer or notary, an accountant or tax professional, a licensed mortgage broker, or a licensed REALTOR®.
  </div>
);




// --- Admin AI Content Approvals ---
const AdminGrowth = () => {
  const nav = useNavigate();
  // SEC-009: auth via HttpOnly cookie — no token in JS.  We still gate the
  // component render on the non-sensitive session marker so an unlogged
  // visitor bounces to /admin/login instantly.
  const marker = localStorage.getItem(_ADMIN_MARKER_KEY);
  const headers = {};
  const [d, setD] = useState(null);
  const [citations, setCitations] = useState([]);
  const [form, setForm] = useState({ source: "perplexity", query: "", result_url: "", result_excerpt: "", notes: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if(!marker) nav("/admin/login"); }, [marker, nav]);
  const load = async () => {
    const [dash, cits] = await Promise.all([
      axios.get(`${API}/admin/growth/dashboard`, {headers}).catch(()=>({data:null})),
      axios.get(`${API}/admin/growth/citations`, {headers}).catch(()=>({data:[]})),
    ]);
    setD(dash.data); setCitations(cits.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const addCitation = async (e) => {
    e.preventDefault();
    if (!form.query) return;
    setSaving(true);
    await axios.post(`${API}/admin/growth/citations`, form, {headers});
    setSaving(false);
    setForm({ source: form.source, query: "", result_url: "", result_excerpt: "", notes: "" });
    load();
  };
  const deleteCitation = async (id) => {
    if (!window.confirm("Remove this citation?")) return;
    await axios.delete(`${API}/admin/growth/citations/${id}`, {headers});
    load();
  };

  if (!d) return <AdminShell active="growth"><p>Loading growth data…</p></AdminShell>;

  const trafficKpis = [
    { label: "Uniques (24h)", value: d.traffic.uniques_24h, sub: `${d.traffic.pageviews_24h} views` },
    { label: "Uniques (7d)", value: d.traffic.uniques_7d, sub: `${d.traffic.pageviews_7d} views` },
    { label: "Uniques (30d)", value: d.traffic.uniques_30d, sub: `${d.traffic.pageviews_30d} views` },
    { label: "Doogie sessions (30d)", value: d.doogie.sessions_30d, sub: `${d.doogie.sessions_24h} today` },
    { label: "Leads (30d)", value: d.leads_30d.total, sub: `${d.leads_30d.buyer}B · ${d.leads_30d.seller}S · ${d.leads_30d.valuation}V · ${d.leads_30d.referral}R` },
    { label: "Content live", value: d.content_live.total_pages, sub: `${d.content_live.community_synopses} comm · ${d.content_live.neighbourhoods} nhb · ${d.content_live.glossary_faqs} FAQ` },
    { label: "LLM citations", value: d.llm_citations.total, sub: Object.entries(d.llm_citations.by_source).map(([k,v]) => `${k}:${v}`).join(" · ") || "none logged yet" },
  ];

  const sortedTrend = Object.entries(d.traffic.daily_trend_30d).sort(([a],[b]) => a.localeCompare(b));
  const maxUniq = Math.max(1, ...sortedTrend.map(([,v]) => v.uniques));

  const sourceOptions = ["perplexity","chatgpt","claude","bing_copilot","google_ai","grok","manus","other"];
  const sourceLabel = { perplexity:"Perplexity", chatgpt:"ChatGPT (search)", claude:"Claude (search)", bing_copilot:"Bing Copilot", google_ai:"Google AI Overviews", grok:"Grok (X)", manus:"Manus", other:"Other" };

  return <AdminShell active="growth">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>📈 Growth Dashboard</h1>
    <p style={{color:"var(--muted)",marginTop:0,fontSize:"0.92rem"}}>Live traffic, engagement, and LLM-citation scoreboard for the 30-day launch push. Bot traffic filtered. Refreshes on load.</p>
    <div style={{marginBottom:"1rem",fontSize:"0.82rem",color:"var(--muted)"}}>Generated {new Date(d.generated_at).toLocaleString()} · <button onClick={load} className="btn btn-outline" style={{padding:"0.3rem 0.7rem",fontSize:"0.8rem",marginLeft:"0.5rem"}} data-testid="growth-refresh">↻ Refresh</button></div>

    {/* KPI grid */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:"0.85rem",marginBottom:"2rem"}} data-testid="growth-kpis">
      {trafficKpis.map((k,i) => (
        <div key={i} className="paper" style={{padding:"1rem 1.2rem"}}>
          <div style={{fontSize:"0.72rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>{k.label}</div>
          <div style={{fontFamily:"Sora,sans-serif",fontSize:"1.9rem",fontWeight:700,color:"var(--brand-navy)",marginTop:"0.3rem",lineHeight:1}}>{k.value.toLocaleString()}</div>
          <div style={{fontSize:"0.75rem",color:"var(--muted)",marginTop:"0.4rem"}}>{k.sub}</div>
        </div>
      ))}
    </div>

    {/* Daily trend sparkline */}
    <div className="paper" style={{marginBottom:"1.5rem"}}>
      <h2 style={{fontSize:"1.15rem",marginTop:0}}>Daily uniques — last 30 days</h2>
      {sortedTrend.length === 0 ? <p style={{color:"var(--muted)"}}>No traffic yet. Open the public site to log the first pageview.</p> :
      <div style={{display:"flex",alignItems:"flex-end",gap:"3px",height:120,marginTop:"1rem"}}>
        {sortedTrend.map(([day, v]) => (
          <div key={day} title={`${day} · ${v.uniques} uniques · ${v.views} views`} style={{flex:1,minWidth:6,background:"var(--brand-navy)",height:`${Math.max(4, (v.uniques/maxUniq)*100)}%`,borderRadius:"2px 2px 0 0",cursor:"help"}}/>
        ))}
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.72rem",color:"var(--muted)",marginTop:"0.5rem"}}>
        <span>{sortedTrend[0]?.[0] || ""}</span><span>{sortedTrend.at(-1)?.[0] || ""}</span>
      </div>
    </div>

    {/* Two columns: top pages + referrers */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.5rem"}}>
      <div className="paper">
        <h2 style={{fontSize:"1.05rem",marginTop:0}}>🔥 Top pages (7d)</h2>
        {d.traffic.top_pages_7d.length === 0 ? <p style={{color:"var(--muted)",fontSize:"0.9rem"}}>No pageviews yet in the last 7 days.</p> :
        <table style={{width:"100%",fontSize:"0.87rem",borderCollapse:"collapse"}}>
          <thead><tr style={{textAlign:"left",borderBottom:"1px solid rgba(0,0,0,0.08)"}}><th style={{padding:"0.4rem 0"}}>Path</th><th style={{textAlign:"right"}}>Views</th><th style={{textAlign:"right"}}>Uniq</th></tr></thead>
          <tbody>{d.traffic.top_pages_7d.slice(0,15).map((p,i) => (
            <tr key={i} style={{borderBottom:"1px solid rgba(0,0,0,0.04)"}}>
              <td style={{padding:"0.3rem 0",fontFamily:"monospace",fontSize:"0.78rem"}}><a href={p.path} target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>{p.path.length>52?p.path.slice(0,52)+"…":p.path}</a></td>
              <td style={{textAlign:"right"}}>{p.views}</td>
              <td style={{textAlign:"right",color:"var(--muted)"}}>{p.uniques}</td>
            </tr>
          ))}</tbody>
        </table>}
      </div>

      <div className="paper">
        <h2 style={{fontSize:"1.05rem",marginTop:0}}>🌐 Top referrers (7d)</h2>
        {d.traffic.referrers_7d.length === 0 ? <p style={{color:"var(--muted)",fontSize:"0.9rem"}}>No referrer data yet — visitors so far arrived direct.</p> :
        <table style={{width:"100%",fontSize:"0.87rem",borderCollapse:"collapse"}}>
          <thead><tr style={{textAlign:"left",borderBottom:"1px solid rgba(0,0,0,0.08)"}}><th style={{padding:"0.4rem 0"}}>Source</th><th style={{textAlign:"right"}}>Visits</th></tr></thead>
          <tbody>{d.traffic.referrers_7d.map((r,i) => (
            <tr key={i} style={{borderBottom:"1px solid rgba(0,0,0,0.04)"}}>
              <td style={{padding:"0.3rem 0",fontFamily:"monospace",fontSize:"0.82rem"}}>{r.host}</td>
              <td style={{textAlign:"right"}}>{r.n}</td>
            </tr>
          ))}</tbody>
        </table>}
      </div>
    </div>

    {/* LLM Citation Tracker */}
    <div className="paper" style={{background:"#F5F0E1"}}>
      <h2 style={{fontSize:"1.15rem",marginTop:0}}>🤖 LLM Citation Tracker</h2>
      <p style={{color:"var(--muted)",fontSize:"0.88rem",marginTop:0}}>Every time you spot EZtoFind.ca cited by an AI (ChatGPT, Claude, Perplexity, Bing Copilot, Google AI Overviews, Grok, Manus), log it here. This is your <em>real</em> AEO scoreboard.</p>
      <form onSubmit={addCitation} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"0.6rem",marginTop:"1rem",background:"white",padding:"1rem",borderRadius:8}}>
        <select value={form.source} onChange={e=>setForm({...form,source:e.target.value})} data-testid="citation-source">
          {sourceOptions.map(o => <option key={o} value={o}>{sourceLabel[o]}</option>)}
        </select>
        <input placeholder="Query asked (e.g. 'best BC real estate glossary')" value={form.query} onChange={e=>setForm({...form,query:e.target.value})} required data-testid="citation-query"/>
        <input placeholder="Result URL (optional)" value={form.result_url} onChange={e=>setForm({...form,result_url:e.target.value})} data-testid="citation-url"/>
        <input placeholder="Notes (e.g. position, screenshot link)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} data-testid="citation-notes"/>
        <button type="submit" className="btn btn-primary" disabled={saving} data-testid="citation-submit" style={{gridColumn:"1 / -1"}}>{saving?"Saving…":"➕ Log citation"}</button>
      </form>
      {citations.length === 0 ? <p style={{color:"var(--muted)",fontStyle:"italic",marginTop:"1rem"}}>None logged yet. Run the Day-15 LLM prompt test from the playbook and paste your first citations here.</p> :
      <div style={{marginTop:"1rem",maxHeight:400,overflowY:"auto"}}>
        {citations.map(c => (
          <div key={c.id} style={{padding:"0.75rem",borderBottom:"1px solid rgba(0,0,0,0.06)",fontSize:"0.87rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:"0.5rem"}}>
              <div style={{flex:1}}>
                <strong style={{color:"var(--brand-navy)"}}>{sourceLabel[c.source] || c.source}</strong>
                <span style={{color:"var(--muted)",marginLeft:"0.5rem",fontSize:"0.78rem"}}>{new Date(c.captured_at).toLocaleDateString()}</span>
                <div style={{marginTop:"0.25rem"}}>Q: <em>"{c.query}"</em></div>
                {c.result_url && <div style={{marginTop:"0.2rem",fontSize:"0.8rem"}}><a href={c.result_url} target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)"}}>{c.result_url}</a></div>}
                {c.notes && <div style={{marginTop:"0.2rem",color:"var(--muted)",fontSize:"0.82rem"}}>{c.notes}</div>}
              </div>
              <button onClick={()=>deleteCitation(c.id)} className="btn btn-outline" style={{padding:"0.25rem 0.6rem",fontSize:"0.75rem",height:"fit-content"}}>Remove</button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  </AdminShell>;
};

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

  const approveNeighbourhood = async (slug, n_slug, key) => {
    await axios.post(`${API}/admin/approvals/neighbourhoods/approve`, {slug, n_slug, synopsis: edited[key]}, {headers});
    await loadSummary(); await loadItems("neighbourhoods");
  };
  const regenNeighbourhood = async (slug, n_slug) => { await axios.post(`${API}/admin/approvals/neighbourhoods/${slug}/${n_slug}/regenerate`, {}, {headers}); await loadItems("neighbourhoods"); };
  const bulkApproveNeighbourhoods = async () => {
    if(!window.confirm(`Bulk-approve ALL ${items.length} pending micro-neighbourhood synopses? Spot-check a few first.`)) return;
    await axios.post(`${API}/admin/approvals/neighbourhoods/approve-all`, {}, {headers});
    await loadSummary(); await loadItems("neighbourhoods");
  };
  const generateAllNeighbourhoods = async () => {
    if(!window.confirm("Generate synopses for EVERY sub-neighbourhood with active MLS listings (~500 pages, ~40-90 min in background). Then refresh the Neighbourhoods tab to approve.")) return;
    const r = await axios.post(`${API}/admin/approvals/generate-all-neighbourhoods`, {}, {headers});
    alert(r.data.message);
    setTimeout(() => { loadSummary(); if(tab==="neighbourhoods") loadItems("neighbourhoods"); }, 3000);
  };
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

  // ----- Phase D+ Commission backlog (from gap cards on /admin) -----
  const [commissionForm, setCommissionForm] = useState(null);   // {term, slug, notes, source} | null
  const [commissions, setCommissions] = useState([]);
  const [commMsg, setCommMsg] = useState("");

  const loadCommissions = async () => {
    const r = await axios.get(`${API}/admin/content-commissions`, {headers}).catch(()=>({data:{items:[]}}));
    setCommissions(r.data?.items || []);
  };
  useEffect(() => { loadCommissions(); }, []);

  // Read URL params on mount — if a gap card sent us here with ?commission=,
  // prefill the form and scroll it into view. Params are stripped after read
  // so a refresh doesn't repeat the prefill.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const term = sp.get("commission");
      if (term) {
        setCommissionForm({
          term: term,
          slug: sp.get("slug") || "",
          notes: "",
          source: sp.get("source") || "search-gap",
          representative_query: sp.get("q") || term,
        });
        sp.delete("commission"); sp.delete("slug"); sp.delete("source"); sp.delete("q");
        const newUrl = window.location.pathname + (sp.toString() ? `?${sp}` : "") + window.location.hash;
        window.history.replaceState({}, "", newUrl);
        setTimeout(() => {
          document.getElementById("commission-banner")?.scrollIntoView({block: "start", behavior: "smooth"});
        }, 150);
      }
    } catch {}
  }, []);

  const submitCommission = async () => {
    if (!commissionForm?.term?.trim()) { setCommMsg("⚠ Term is required."); return; }
    setCommMsg("");
    try {
      const r = await axios.post(`${API}/admin/content-commissions`, commissionForm, {headers});
      setCommMsg(r.data?.duplicate ? "ℹ Already in backlog — no duplicate created." : "✅ Added to Content Backlog.");
      setCommissionForm(null);
      loadCommissions();
      setTimeout(() => setCommMsg(""), 4000);
    } catch (e) {
      setCommMsg("⚠ " + (e.response?.data?.detail || e.message));
    }
  };

  const updateCommissionStatus = async (id, status) => {
    await axios.put(`${API}/admin/content-commissions/${id}`, {status}, {headers});
    loadCommissions();
  };
  const deleteCommission = async (id) => {
    if (!window.confirm("Remove this from the content backlog?")) return;
    await axios.delete(`${API}/admin/content-commissions/${id}`, {headers});
    loadCommissions();
  };

  // ---- Auto-Draft on Commission (Phase E) ----
  // When a commission flips to "in-progress" the backend kicks off an AI
  // drafter. This UI polls for the result, shows an editable preview, and
  // lets Doug regenerate or approve+publish to the glossary.
  const [expandedDraft, setExpandedDraft] = useState({}); // { [cid]: true }
  const [draftEdits, setDraftEdits] = useState({});       // { [cid]: {definition, faqs} }
  const [draftBusy, setDraftBusy] = useState({});         // { [cid]: "regenerating" | "publishing" }
  const [draftMsg, setDraftMsg] = useState({});           // { [cid]: string }

  // Poll for in-flight drafts every 4s while at least one is "drafting".
  useEffect(() => {
    const anyDrafting = (commissions || []).some(c => c.draft_status === "drafting");
    if (!anyDrafting) return;
    const t = setInterval(() => { loadCommissions(); }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commissions.map(c => c.id + ":" + c.draft_status).join("|")]);

  // Seed edit buffer whenever the backend delivers a fresh draft.
  useEffect(() => {
    setDraftEdits(prev => {
      const next = {...prev};
      for (const c of (commissions || [])) {
        if (c.draft_status === "drafted" && next[c.id] === undefined) {
          next[c.id] = {
            definition: c.draft_definition || "",
            faqs: JSON.parse(JSON.stringify(c.draft_faqs || [])),
          };
        }
      }
      return next;
    });
  }, [commissions]);

  const regenerateDraft = async (cid) => {
    setDraftBusy(b => ({...b, [cid]: "regenerating"}));
    setDraftMsg(m => ({...m, [cid]: ""}));
    try {
      await axios.post(`${API}/admin/content-commissions/${cid}/auto-draft`, {}, {headers});
      // Clear stale edits so the fresh draft repopulates the buffer.
      setDraftEdits(e => { const n={...e}; delete n[cid]; return n; });
      loadCommissions();
    } catch (e) {
      setDraftMsg(m => ({...m, [cid]: "⚠ " + (e.response?.data?.detail || e.message)}));
    } finally {
      setDraftBusy(b => { const n={...b}; delete n[cid]; return n; });
    }
  };

  const publishDraft = async (cid) => {
    const c = commissions.find(x => x.id === cid);
    const buf = draftEdits[cid] || {definition: c?.draft_definition || "", faqs: c?.draft_faqs || []};
    if (!buf.definition?.trim()) { setDraftMsg(m => ({...m, [cid]: "⚠ Definition is empty."})); return; }
    if (!window.confirm(`Publish "${c.term}" to the public glossary with ${buf.faqs.length} FAQs? This marks the term approved and pings IndexNow.`)) return;
    setDraftBusy(b => ({...b, [cid]: "publishing"}));
    setDraftMsg(m => ({...m, [cid]: ""}));
    try {
      const r = await axios.post(`${API}/admin/content-commissions/${cid}/publish`,
        {definition: buf.definition, faqs: buf.faqs, category: "General"}, {headers});
      setDraftMsg(m => ({...m, [cid]: `✅ Published to /glossary/${r.data.slug}`}));
      loadCommissions();
    } catch (e) {
      setDraftMsg(m => ({...m, [cid]: "⚠ " + (e.response?.data?.detail || e.message)}));
    } finally {
      setDraftBusy(b => { const n={...b}; delete n[cid]; return n; });
    }
  };

  const updateDraftFaq = (cid, idx, field, val) => {
    setDraftEdits(e => {
      const cur = e[cid] || {definition:"", faqs:[]};
      const faqs = [...cur.faqs];
      faqs[idx] = {...faqs[idx], [field]: val};
      return {...e, [cid]: {...cur, faqs}};
    });
  };
  const removeDraftFaq = (cid, idx) => {
    setDraftEdits(e => {
      const cur = e[cid] || {definition:"", faqs:[]};
      const faqs = cur.faqs.filter((_,i) => i!==idx);
      return {...e, [cid]: {...cur, faqs}};
    });
  };

  return <AdminShell active="approvals">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>AI Content Approvals</h1>

    {/* Commission prefill banner + backlog — populated by ?commission= URL
        params from dashboard gap cards, plus a persistent backlog list. */}
    {commissionForm && (
      <div id="commission-banner" className="paper" data-testid="commission-banner" style={{padding:"1.35rem 1.5rem",marginBottom:"1.25rem",border:"2px solid #DC2626",background:"#FEF2F2"}}>
        <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:800,color:"#DC2626",marginBottom:"0.4rem"}}>🎯 Content gap → commission new term</div>
        <div style={{fontFamily:"Inter,sans-serif",fontSize:"0.92rem",color:"var(--brand-navy)",lineHeight:1.55,marginBottom:"0.85rem"}}>
          Visitors searched for <strong>"{commissionForm.representative_query}"</strong> and got no results. Add it to your Content Backlog and we'll queue an AI-drafted definition + FAQs for your review.
        </div>
        <div className="form-grid" style={{marginBottom:"0.75rem"}}>
          <div className="field">
            <label>Term name *</label>
            <input value={commissionForm.term} onChange={e=>setCommissionForm(f=>({...f, term: e.target.value}))} data-testid="commission-term"/>
          </div>
          <div className="field">
            <label>Slug (URL fragment)</label>
            <input value={commissionForm.slug} onChange={e=>setCommissionForm(f=>({...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"")}))} data-testid="commission-slug"/>
          </div>
        </div>
        <div className="field" style={{marginBottom:"0.85rem"}}>
          <label>Notes for the drafter (optional)</label>
          <textarea rows="2" value={commissionForm.notes||""} onChange={e=>setCommissionForm(f=>({...f, notes: e.target.value}))} placeholder="Any BC-specific angle, regulatory reference, or examples the drafter should include." data-testid="commission-notes"/>
        </div>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          <button className="btn btn-primary" onClick={submitCommission} data-testid="commission-submit">📥 Add to Content Backlog</button>
          <button className="btn btn-ghost" onClick={()=>setCommissionForm(null)} data-testid="commission-cancel">Cancel</button>
        </div>
      </div>
    )}
    {commMsg && (
      <div data-testid="commission-msg" style={{padding:"0.6rem 1rem",borderRadius:6,background:commMsg.startsWith("⚠") ? "#FEF2F2" : (commMsg.startsWith("ℹ") ? "#F0F4FB" : "#F0FDF4"),color:commMsg.startsWith("⚠") ? "#DC2626" : (commMsg.startsWith("ℹ") ? "var(--brand-navy)" : "#059669"),border:"1px solid rgba(0,0,0,0.08)",marginBottom:"1rem",fontFamily:"Inter,sans-serif",fontSize:"0.9rem"}}>{commMsg}</div>
    )}

    {commissions && commissions.length > 0 && (
      <div className="paper" data-testid="commissions-backlog" style={{padding:"1.15rem 1.35rem",marginBottom:"1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:"0.5rem"}}>
          <h3 style={{margin:0,fontSize:"1.05rem",color:"var(--brand-navy)"}}>📋 Content Backlog ({commissions.filter(c=>c.status!=="shipped"&&c.status!=="declined").length} open)</h3>
          <div style={{fontSize:"0.78rem",color:"var(--muted)",fontFamily:"Inter,sans-serif"}}>Terms visitors asked for that aren't in the glossary yet.</div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"Inter,sans-serif",fontSize:"0.88rem"}}>
            <thead>
              <tr>
                <th style={{textAlign:"left",padding:"0.5rem 0.6rem",fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--muted)",fontWeight:700,borderBottom:"2px solid var(--brand-navy)"}}>Term</th>
                <th style={{textAlign:"left",padding:"0.5rem 0.6rem",fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--muted)",fontWeight:700,borderBottom:"2px solid var(--brand-navy)"}}>Source</th>
                <th style={{textAlign:"left",padding:"0.5rem 0.6rem",fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.06em",color:"var(--muted)",fontWeight:700,borderBottom:"2px solid var(--brand-navy)"}}>Status</th>
                <th style={{borderBottom:"2px solid var(--brand-navy)"}}/>
              </tr>
            </thead>
            <tbody>
              {commissions.map(c => {
                const ds = c.draft_status || "";
                const isDrafting = ds === "drafting";
                const hasDraft = ds === "drafted" || ds === "published" || (c.draft_definition && ds !== "drafting");
                const isError = ds === "error";
                const isExpanded = !!expandedDraft[c.id];
                const buf = draftEdits[c.id] || {definition: c.draft_definition || "", faqs: c.draft_faqs || []};
                const busy = draftBusy[c.id];
                const msg = draftMsg[c.id];
                return (
                <React.Fragment key={c.id}>
                <tr data-testid={`commission-row-${c.id}`}>
                  <td style={{padding:"0.5rem 0.6rem",borderBottom:isExpanded?"none":"1px solid rgba(15,42,91,0.06)"}}>
                    <div style={{fontWeight:700,color:"var(--brand-navy)"}}>{c.term}</div>
                    {c.slug && <div style={{fontSize:"0.75rem",color:"var(--muted)",fontFamily:"monospace"}}>{c.slug}</div>}
                    {c.notes && <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"0.2rem",fontStyle:"italic"}}>{c.notes}</div>}
                    {/* Draft-status pill */}
                    {isDrafting && (
                      <div data-testid={`commission-draft-status-${c.id}`} style={{marginTop:"0.35rem",display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.15rem 0.55rem",fontSize:"0.72rem",fontWeight:700,color:"#7C2D12",background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:999}}>
                        <span className="spinner" style={{width:10,height:10,border:"2px solid #F59E0B",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/> AI drafting… (~30s)
                      </div>
                    )}
                    {hasDraft && !isDrafting && (
                      <div data-testid={`commission-draft-status-${c.id}`} style={{marginTop:"0.35rem",display:"inline-flex",alignItems:"center",gap:"0.35rem",padding:"0.15rem 0.55rem",fontSize:"0.72rem",fontWeight:700,color:"#065F46",background:"#D1FAE5",border:"1px solid #10B981",borderRadius:999}}>
                        {ds === "published" ? "✅ Published" : "📝 AI draft ready"} — {(c.draft_faqs||[]).length} FAQ{(c.draft_faqs||[]).length===1?"":"s"}
                      </div>
                    )}
                    {isError && (
                      <div data-testid={`commission-draft-status-${c.id}`} style={{marginTop:"0.35rem",display:"inline-flex",alignItems:"center",gap:"0.35rem",padding:"0.15rem 0.55rem",fontSize:"0.72rem",fontWeight:700,color:"#991B1B",background:"#FEE2E2",border:"1px solid #DC2626",borderRadius:999}}>
                        ⚠ Draft failed{c.draft_error ? ` — ${c.draft_error}` : ""}
                      </div>
                    )}
                  </td>
                  <td style={{padding:"0.5rem 0.6rem",borderBottom:isExpanded?"none":"1px solid rgba(15,42,91,0.06)",fontSize:"0.78rem",color:"var(--muted)",fontFamily:"monospace"}}>{c.source||"manual"}</td>
                  <td style={{padding:"0.5rem 0.6rem",borderBottom:isExpanded?"none":"1px solid rgba(15,42,91,0.06)"}}>
                    <select value={c.status} onChange={e=>updateCommissionStatus(c.id, e.target.value)} data-testid={`commission-status-${c.id}`} style={{padding:"0.25rem 0.4rem",fontSize:"0.82rem",fontFamily:"Inter,sans-serif"}}>
                      <option value="backlog">Backlog</option>
                      <option value="in-progress">In progress</option>
                      <option value="shipped">Shipped</option>
                      <option value="declined">Declined</option>
                    </select>
                  </td>
                  <td style={{padding:"0.5rem 0.6rem",borderBottom:isExpanded?"none":"1px solid rgba(15,42,91,0.06)",whiteSpace:"nowrap"}}>
                    {(hasDraft || isDrafting || isError) && (
                      <button className="btn btn-ghost" style={{padding:"0.25rem 0.55rem",fontSize:"0.78rem",marginRight:"0.35rem"}} onClick={()=>setExpandedDraft(x=>({...x,[c.id]:!x[c.id]}))} data-testid={`commission-toggle-draft-${c.id}`}>
                        {isExpanded ? "Hide draft ▲" : "View draft ▼"}
                      </button>
                    )}
                    <button className="btn btn-ghost" style={{padding:"0.25rem 0.55rem",fontSize:"0.78rem",color:"#DC2626"}} onClick={()=>deleteCommission(c.id)} data-testid={`commission-delete-${c.id}`}>Delete</button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr data-testid={`commission-draft-panel-${c.id}`}>
                    <td colSpan={4} style={{padding:"1rem 1.2rem",borderBottom:"1px solid rgba(15,42,91,0.06)",background:"#FAF7EE"}}>
                      {isDrafting && (
                        <div style={{fontSize:"0.9rem",color:"var(--brand-navy)",fontStyle:"italic"}}>
                          Our AI provider is drafting a BC-compliant definition + 10 FAQs. This page auto-refreshes when the draft is ready.
                        </div>
                      )}
                      {!isDrafting && (hasDraft || isError) && (
                        <>
                          <div style={{marginBottom:"1rem"}}>
                            <label style={{display:"block",fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:800,color:"var(--brand-navy)",marginBottom:"0.35rem"}}>Definition (editable)</label>
                            <textarea
                              data-testid={`commission-draft-definition-${c.id}`}
                              rows={5}
                              value={buf.definition}
                              onChange={e=>setDraftEdits(x=>({...x,[c.id]:{...(x[c.id]||{faqs:[]}), definition:e.target.value}}))}
                              style={{width:"100%",padding:"0.6rem 0.75rem",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",lineHeight:1.55,border:"1px solid rgba(15,42,91,0.2)",borderRadius:6,background:"#fff"}}
                            />
                            <div style={{fontSize:"0.72rem",color:"var(--muted)",marginTop:"0.25rem"}}>{(buf.definition||"").length} chars · target 400–700</div>
                          </div>
                          <div style={{marginBottom:"0.8rem"}}>
                            <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:800,color:"var(--brand-navy)",marginBottom:"0.35rem"}}>FAQs ({(buf.faqs||[]).length}) (editable)</div>
                            {(buf.faqs||[]).map((f, idx) => (
                              <div key={idx} data-testid={`commission-draft-faq-${c.id}-${idx}`} style={{border:"1px solid rgba(15,42,91,0.1)",borderRadius:6,padding:"0.6rem 0.75rem",marginBottom:"0.5rem",background:"#fff"}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"0.5rem",marginBottom:"0.3rem"}}>
                                  <div style={{fontSize:"0.7rem",fontWeight:800,color:"var(--muted)"}}>FAQ #{idx+1}</div>
                                  <button className="btn btn-ghost" style={{padding:"0.15rem 0.4rem",fontSize:"0.7rem",color:"#DC2626"}} onClick={()=>removeDraftFaq(c.id, idx)} data-testid={`commission-draft-faq-remove-${c.id}-${idx}`}>Remove</button>
                                </div>
                                <input
                                  value={f.q || ""}
                                  onChange={e=>updateDraftFaq(c.id, idx, "q", e.target.value)}
                                  placeholder="Question"
                                  data-testid={`commission-draft-faq-q-${c.id}-${idx}`}
                                  style={{width:"100%",padding:"0.4rem 0.5rem",fontSize:"0.88rem",fontFamily:"Inter,sans-serif",fontWeight:600,border:"1px solid rgba(15,42,91,0.15)",borderRadius:4,marginBottom:"0.35rem"}}
                                />
                                <textarea
                                  value={f.a || ""}
                                  onChange={e=>updateDraftFaq(c.id, idx, "a", e.target.value)}
                                  placeholder="Answer"
                                  rows={3}
                                  data-testid={`commission-draft-faq-a-${c.id}-${idx}`}
                                  style={{width:"100%",padding:"0.4rem 0.5rem",fontSize:"0.85rem",fontFamily:"Inter,sans-serif",lineHeight:1.5,border:"1px solid rgba(15,42,91,0.15)",borderRadius:4}}
                                />
                              </div>
                            ))}
                            {(!buf.faqs || buf.faqs.length===0) && (
                              <div style={{fontSize:"0.85rem",color:"var(--muted)",fontStyle:"italic",padding:"0.5rem 0"}}>No FAQs yet — click Regenerate.</div>
                            )}
                          </div>
                          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",alignItems:"center"}}>
                            <button className="btn btn-primary" style={{padding:"0.5rem 1rem",fontSize:"0.88rem"}} disabled={!!busy || ds==="published"} onClick={()=>publishDraft(c.id)} data-testid={`commission-publish-${c.id}`}>
                              {busy==="publishing" ? "Publishing…" : (ds==="published" ? "✅ Published" : "✅ Approve & publish to glossary")}
                            </button>
                            <button className="btn btn-ghost" style={{padding:"0.5rem 1rem",fontSize:"0.88rem"}} disabled={!!busy} onClick={()=>regenerateDraft(c.id)} data-testid={`commission-regenerate-${c.id}`}>
                              {busy==="regenerating" ? "Regenerating…" : "🔄 Regenerate draft"}
                            </button>
                            {c.draft_generated_at && (
                              <span style={{fontSize:"0.72rem",color:"var(--muted)",marginLeft:"0.5rem"}}>Generated {new Date(c.draft_generated_at).toLocaleString()}</span>
                            )}
                          </div>
                          {msg && (
                            <div data-testid={`commission-draft-msg-${c.id}`} style={{marginTop:"0.6rem",padding:"0.5rem 0.75rem",borderRadius:4,fontSize:"0.85rem",background:msg.startsWith("⚠")?"#FEF2F2":"#F0FDF4",color:msg.startsWith("⚠")?"#DC2626":"#059669",border:"1px solid rgba(0,0,0,0.08)"}}>{msg}</div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}
    <p style={{color:"var(--muted)",marginTop:0,fontSize:"0.92rem"}}>BCFSA compliance: as the licensed REALTOR®, you are responsible for all AI-generated content. Review, edit if needed, then approve before publication. Unapproved content stays hidden from the public site.</p>

    <div className="paper" style={{marginTop:"1rem",background:"#F5F0E1"}}>
      <div><strong>Populate all 243 BC communities at once</strong><br/><span style={{color:"var(--muted)",fontSize:"0.88rem"}}>Auto-generate synopsis + weather drafts for every community, then approve in bulk below.</span></div>
      <button onClick={generateAll} className="btn btn-primary" style={{padding:"0.6rem 1.2rem",marginTop:"0.85rem"}} data-testid="generate-all-btn">🚀 Generate All Missing (Synopsis + Weather)</button>
    </div>

    <div className="paper" style={{marginTop:"1rem",background:"#EAF3FF"}}>
      <div><strong>Populate synopses for all ~500 micro-neighbourhoods</strong><br/><span style={{color:"var(--muted)",fontSize:"0.88rem"}}>Auto-generate housing-character synopsis for every sub-neighbourhood (Kelowna's Lower Mission, Kamloops's Aberdeen, etc.). Deliberately no overlap with community Vibe Score. Background job, ~40-90 min.</span></div>
      <button onClick={generateAllNeighbourhoods} className="btn btn-primary" style={{padding:"0.6rem 1.2rem",marginTop:"0.85rem"}} data-testid="generate-all-nhb-btn">🏘️ Generate All Neighbourhood Synopses</button>
    </div>

    <div className="paper" style={{marginTop:"1rem",background:"#EEF7EF",display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:240}}><strong>Populate FAQs for all 401 Glossary Terms</strong><br/><span style={{color:"var(--muted)",fontSize:"0.88rem"}}>Auto-generate 10 BC-specific FAQs per term (background job, ~30-60 min). Then review + approve.</span></div>
      <button onClick={generateAllGlossary} className="btn btn-primary" style={{padding:"0.6rem 1.2rem"}} data-testid="generate-all-glossary-btn">📖 Generate All FAQs</button>
      <button onClick={bulkApproveGlossary} className="btn btn-green" style={{padding:"0.6rem 1.2rem",background:"var(--brand-green-dark)",color:"white",border:"none"}} data-testid="top-approve-all-glossary-btn">✓ Approve All Pending FAQs{summary && summary.pending_glossary_faqs>0 ? ` (${summary.pending_glossary_faqs})` : ""}</button>
      <button onClick={unapproveAllGlossary} className="btn btn-outline" style={{padding:"0.6rem 1.2rem"}} data-testid="unapprove-all-glossary-btn">↻ Re-queue Approved</button>
    </div>

    <div style={{display:"flex",gap:"0.5rem",marginTop:"1.5rem",marginBottom:"1rem",flexWrap:"wrap"}}>
      {[
        {key:"synopses", label:`🗺️ Community Synopses (${summary.pending_synopses||0})`},
        {key:"weather", label:`☀️ Weather (${summary.pending_weather||0})`},
        {key:"neighbourhoods", label:`🏘️ Neighbourhoods (${summary.pending_neighbourhoods||0})`},
        {key:"glossary", label:`📖 Glossary FAQs (${summary.pending_glossary_faqs||0})`}
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

    {!busy && tab === "neighbourhoods" && (
      items.length === 0 ? <p style={{color:"var(--muted)"}}>✓ No pending micro-neighbourhood synopses. Click "🏘️ Generate All Neighbourhood Synopses" above to kick off generation.</p> :
      <>
      {items.length > 3 && <div className="paper" style={{marginBottom:"1rem",background:"#FFF8E8"}}>
        <p style={{margin:"0 0 0.75rem",fontSize:"0.9rem"}}><strong>Bulk approve:</strong> Approve all {items.length} pending micro-neighbourhood synopses at once.</p>
        <button onClick={bulkApproveNeighbourhoods} className="btn btn-green" style={{padding:"0.5rem 1rem"}} data-testid="approve-all-nhb">✓ Approve all {items.length}</button>
      </div>}
      {items.map(it => {
        const key = `${it.slug}::${it.n_slug}`;
        return (
        <div key={key} className="paper" style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:"0.5rem"}}>
            <strong style={{fontSize:"1.05rem",color:"var(--brand-navy)"}}>{it.neighbourhood} <span style={{color:"var(--muted)",fontWeight:400,fontSize:"0.88rem"}}>· {it.community}, {it.region}</span></strong>
            <div style={{display:"flex",gap:"0.5rem"}}>
              <button onClick={()=>regenNeighbourhood(it.slug, it.n_slug)} className="btn btn-outline" style={{padding:"0.4rem 0.8rem",fontSize:"0.82rem"}}>↻ Regenerate</button>
              <button onClick={()=>approveNeighbourhood(it.slug, it.n_slug, key)} className="btn btn-green" style={{padding:"0.4rem 0.8rem",fontSize:"0.82rem"}} data-testid={`approve-nhb-${it.n_slug}`}>✓ Approve &amp; Publish</button>
            </div>
          </div>
          <textarea defaultValue={it.synopsis} onChange={e=>setEdited({...edited,[key]:e.target.value})} rows={8} style={{width:"100%",fontFamily:"Inter,sans-serif",fontSize:"0.92rem",lineHeight:1.6,padding:"0.75rem",border:"1px solid rgba(15,42,91,0.15)",borderRadius:8,resize:"vertical"}}/>
        </div>
      );})}
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
  useEffect(() => { axios.get(`${API}/admin/policies`, {headers, withCredentials: true}).then(r => setItems(r.data)).catch(()=>{}); /* eslint-disable-next-line */ }, []);
  const openPolicy = (slug) => {
    // SEC-009: auth flows via the HttpOnly cookie the browser attaches on
    // same-origin navigation (including window.open).  No token in the URL.
    window.open(`${API}/admin/policies/${slug}`, "_blank");
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

// ---------- Beta Testing: floating feedback widget + welcome page ----------
const BetaFeedbackWidget = () => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({name:"", email:"", comment:"", rating:0, category:"general"});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  // Hide the feedback FAB while the PIPA cookie banner is visible (they share the
  // bottom-left corner and overlap the "Reject optional" / "Customize" buttons).
  // Covers both first-visit ("no ez_cookie set" case) and the reopened-via-footer
  // case (we listen for the `open-cookie-prefs` broadcast) and reappears cleanly
  // after the user saves prefs (`ez-cookie-prefs-changed`).
  const [cookieBannerVisible, setCookieBannerVisible] = useState(
    () => typeof window !== "undefined" && !localStorage.getItem("ez_cookie")
  );
  const loc = useLocation();

  // Remember tester name/email across visits (nice UX for repeat testers)
  useEffect(() => {
    const cached = localStorage.getItem("beta_tester");
    if (cached) { try { const c = JSON.parse(cached); setF(x => ({...x, name:c.name||"", email:c.email||""})); } catch(_){} }
  }, []);

  // Sync visibility with the cookie banner's lifecycle.
  useEffect(() => {
    const openHandler  = () => setCookieBannerVisible(true);
    const closeHandler = () => setCookieBannerVisible(false);
    window.addEventListener("open-cookie-prefs", openHandler);
    window.addEventListener("ez-cookie-prefs-changed", closeHandler);
    // Also poll on first mount in case the banner is shown but no event fired yet.
    const iv = setInterval(() => {
      const hasChoice = !!localStorage.getItem("ez_cookie");
      const modalOpen = !!document.querySelector('[data-testid="cookie-banner"]') || !!document.querySelector('[data-testid="cookie-prefs-modal"]');
      setCookieBannerVisible(modalOpen || !hasChoice);
    }, 500);
    return () => {
      window.removeEventListener("open-cookie-prefs", openHandler);
      window.removeEventListener("ez-cookie-prefs-changed", closeHandler);
      clearInterval(iv);
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      await axios.post(`${API}/beta/feedback`, {
        name: f.name.trim(),
        email: f.email.trim(),
        comment: f.comment.trim(),
        rating: f.rating || null,
        category: f.category,
        page_url: (typeof window !== "undefined" ? window.location.pathname + window.location.search : ""),
      });
      localStorage.setItem("beta_tester", JSON.stringify({name:f.name, email:f.email}));
      setDone(true);
      setF(x => ({...x, comment:"", rating:0, category:"general"}));
    } catch (x) {
      setErr(x?.response?.data?.detail || "Sorry — something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  const reset = () => { setDone(false); setErr(""); };

  return (
    <>
      {!cookieBannerVisible && (
      <button
        onClick={()=>{setOpen(true); reset();}}
        data-testid="beta-feedback-fab"
        title="Send feedback to Doug"
        style={{
          position:"fixed", left:"1.25rem", bottom:"1.25rem", zIndex:9998,
          background:"linear-gradient(135deg,#0F2A5B 0%,#1a3d7a 100%)",
          color:"#fff", border:"2px solid #F5A623",
          padding:"0.75rem 1.1rem", borderRadius:999,
          fontFamily:"Inter,sans-serif", fontSize:"0.85rem", fontWeight:600,
          boxShadow:"0 6px 20px rgba(0,0,0,0.25)", cursor:"pointer",
          display:"flex", alignItems:"center", gap:"0.5rem"
        }}
      >
        <span aria-hidden="true">💬</span> Send Feedback
      </button>
      )}

      {open && (
        <div
          onClick={(e)=>{if(e.target===e.currentTarget) setOpen(false);}}
          style={{position:"fixed", inset:0, background:"rgba(15,42,91,0.55)", backdropFilter:"blur(4px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem"}}
          data-testid="beta-feedback-modal"
        >
          <div style={{background:"#fff", borderRadius:14, maxWidth:520, width:"100%", padding:"1.5rem", boxShadow:"0 20px 60px rgba(0,0,0,0.35)", maxHeight:"90vh", overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
              <div>
                <h3 className="font-display" style={{margin:0, fontSize:"1.4rem", color:"var(--brand-navy)"}}>Send Feedback</h3>
                <p style={{margin:"0.35rem 0 0", fontSize:"0.85rem", color:"var(--muted)"}}>Every note goes straight to Doug — thank you 🙏</p>
              </div>
              <button onClick={()=>setOpen(false)} aria-label="Close" data-testid="beta-close" style={{background:"none",border:"none",fontSize:"1.4rem",cursor:"pointer",color:"var(--muted)",lineHeight:1}}>×</button>
            </div>

            {done ? (
              <div style={{background:"#EEF7EF", border:"1px solid #86BC42", borderRadius:10, padding:"1.25rem", marginTop:"1rem", textAlign:"center"}}>
                <div style={{fontSize:"2rem"}}>✓</div>
                <div style={{fontWeight:600, color:"var(--brand-navy)", marginTop:"0.5rem"}}>Feedback sent</div>
                <div style={{fontSize:"0.85rem", color:"var(--muted)", marginTop:"0.35rem"}}>Doug will see this in his admin inbox.</div>
                <div style={{display:"flex", gap:"0.5rem", justifyContent:"center", marginTop:"1rem"}}>
                  <button onClick={reset} className="btn btn-outline" style={{padding:"0.5rem 1rem"}} data-testid="beta-send-another">Send another</button>
                  <button onClick={()=>setOpen(false)} className="btn btn-primary" style={{padding:"0.5rem 1rem"}} data-testid="beta-close-thanks">Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} style={{marginTop:"1rem"}}>
                <div className="form-grid" style={{gridTemplateColumns:"1fr 1fr", gap:"0.75rem"}}>
                  <div className="field"><label>Your name *</label>
                    <input required value={f.name} onChange={e=>setF({...f,name:e.target.value})} data-testid="beta-name" placeholder="First and last"/>
                  </div>
                  <div className="field"><label>Email *</label>
                    <input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} data-testid="beta-email" placeholder="you@example.com"/>
                  </div>
                </div>
                <div className="field"><label>What kind of feedback?</label>
                  <div style={{display:"flex", gap:"0.4rem", flexWrap:"wrap"}}>
                    {[
                      {v:"bug",      l:"🐛 Bug"},
                      {v:"question", l:"❓ Question"},
                      {v:"general",  l:"💬 General"},
                    ].map(c => (
                      <button
                        key={c.v} type="button"
                        onClick={()=>setF({...f,category:c.v})}
                        data-testid={`beta-cat-${c.v}`}
                        style={{
                          padding:"0.4rem 0.85rem",
                          border: f.category===c.v ? "2px solid var(--brand-navy)" : "1px solid rgba(15,42,91,0.2)",
                          background: f.category===c.v ? "var(--brand-navy)" : "#fff",
                          color: f.category===c.v ? "#fff" : "var(--ink)",
                          borderRadius:999, cursor:"pointer",
                          fontSize:"0.85rem", fontFamily:"Inter,sans-serif",
                        }}
                      >{c.l}</button>
                    ))}
                  </div>
                </div>
                <div className="field"><label>Overall experience (optional)</label>
                  <div style={{display:"flex", gap:"0.35rem"}} role="radiogroup" aria-label="Rating">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={()=>setF({...f,rating:n===f.rating?0:n})} data-testid={`beta-star-${n}`}
                        aria-label={`${n} star${n>1?"s":""}`} aria-pressed={f.rating>=n}
                        style={{background:"none", border:"none", cursor:"pointer", fontSize:"1.5rem", color: f.rating>=n ? "#F5A623" : "#D4D4D4", lineHeight:1, padding:"0.1rem"}}>
                        ★
                      </button>
                    ))}
                    {f.rating>0 && <span style={{alignSelf:"center", fontSize:"0.82rem", color:"var(--muted)"}}>{f.rating}/5</span>}
                  </div>
                </div>
                <div className="field"><label>Your feedback *</label>
                  <textarea required rows={5} value={f.comment} onChange={e=>setF({...f,comment:e.target.value})} data-testid="beta-comment"
                    placeholder="What did you try? What worked? What didn't? Anything confusing or missing?"
                    style={{width:"100%", padding:"0.65rem", border:"1px solid rgba(15,42,91,0.15)", borderRadius:8, fontFamily:"Inter,sans-serif", fontSize:"0.92rem", lineHeight:1.5, resize:"vertical"}}/>
                </div>
                <div style={{fontSize:"0.75rem", color:"var(--muted)", marginBottom:"0.5rem"}}>
                  Also captured: current page URL &amp; your browser info (so Doug can reproduce).
                </div>
                <div style={{fontSize:"0.7rem", color:"var(--muted)", lineHeight:1.5, background:"#F5F0E1", border:"1px solid rgba(15,42,91,0.12)", borderRadius:6, padding:"0.55rem 0.7rem", marginBottom:"0.75rem"}}>
                  By submitting, you grant Doug LeMaire and EZtoFind.ca a perpetual, royalty-free licence to use this feedback and confirm you have no expectation of compensation, credit, or ownership rights over any features that may result.
                </div>
                {err && <div style={{background:"#FEE2E2", border:"1px solid #FCA5A5", borderRadius:8, padding:"0.6rem 0.85rem", fontSize:"0.85rem", color:"#991B1B", marginBottom:"0.75rem"}} data-testid="beta-error">{typeof err==="string"?err:"Something went wrong."}</div>}
                <button type="submit" className="btn btn-primary" disabled={busy} style={{width:"100%", padding:"0.75rem"}} data-testid="beta-submit">
                  {busy ? "Sending…" : "Send feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const BetaWelcome = () => {
  return (
    <div className="container-x" style={{padding:"3rem 1rem 5rem", maxWidth:820}}>
      <div style={{display:"inline-block", background:"linear-gradient(135deg,#F5A623 0%,#F5C023 100%)", color:"#1a1a1a", padding:"0.3rem 0.85rem", borderRadius:6, fontFamily:"Inter,sans-serif", fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.08em", marginBottom:"1rem"}}>BETA — TESTERS WELCOME</div>
      <h1 className="font-display" style={{fontSize:"2.4rem", marginTop:0, color:"var(--brand-navy)"}} data-testid="beta-welcome-title">Thanks for helping test EZtoFind.ca</h1>
      <p style={{fontSize:"1.05rem", lineHeight:1.65, color:"var(--ink)"}}>You're one of the first people to look at Doug LeMaire's new British Columbia real-estate research platform. This page has a short list of things worth trying — and the <strong>Send Feedback</strong> button (bottom-left) is always one click away.</p>

      <div className="paper" style={{marginTop:"1.5rem", background:"#F5F0E1"}}>
        <h3 style={{marginTop:0, color:"var(--brand-navy)"}}>Suggested test checklist</h3>
        <ol style={{lineHeight:1.7, paddingLeft:"1.2rem"}}>
          <li><strong>Doogie AI chat</strong> — click the dog icon (bottom-right) and ask a real question. Try “what's the property transfer tax in BC?” or “show me 3-bedroom homes in Kamloops under $700K”.</li>
          <li><strong>MLS® search</strong> — go to <Link to="/listings">Search Listings</Link>, pick a community, and try the filters. Do the results feel right? Any listing that looks off?</li>
          <li><strong>Natural-language search</strong> — from Doogie, try phrases like “4 bedroom home in Prince George under $1.5M” or “vacant land in Osoyoos”. Do the beds/prices match exactly?</li>
          <li><strong>Communities</strong> — visit <Link to="/communities">Communities</Link> and open one you know well. Does the synopsis, weather, and vibe score read fairly?</li>
          <li><strong>Glossary</strong> — open <Link to="/glossary">the Glossary</Link>, pick a BC-specific term (Property Transfer Tax, PIPA, Dual Agency…). Are the FAQs accurate?</li>
          <li><strong>Market Estimate</strong> — try <Link to="/valuation">the Market Estimate</Link> tool with an address you know. Is the range reasonable?</li>
          <li><strong>Referral flow</strong> — if you live in BC but outside Doug's core service area (Ridge Meadows / Langley / Squamish / Whistler), try a search there and watch what Doogie offers.</li>
          <li><strong>Mobile</strong> — please open the site on your phone at least once. Layout, spacing, and the Doogie button on small screens all matter.</li>
        </ol>
      </div>

      <div className="paper" style={{marginTop:"1.5rem", background:"#EAF3FF"}}>
        <h3 style={{marginTop:0, color:"var(--brand-navy)"}}>Especially helpful feedback</h3>
        <ul style={{lineHeight:1.7, paddingLeft:"1.2rem"}}>
          <li>Anything that reads as inaccurate (numbers, dates, policies, tax rules).</li>
          <li>Anywhere the site feels slow, broken, or confusing.</li>
          <li>Missing information you'd expect to see for a BC home shopper.</li>
          <li>Layout weirdness on your specific device (screenshot in the comment helps).</li>
        </ul>
      </div>

      <div style={{marginTop:"2rem", padding:"1.25rem", background:"#EEF7EF", border:"1px solid rgba(134,188,66,0.4)", borderRadius:10, textAlign:"center"}}>
        <p style={{margin:0, fontSize:"1rem"}}>Ready when you are — the <strong>💬 Send Feedback</strong> button is always at the bottom-left of every page.</p>
      </div>
    </div>
  );
};

const AppLayout = ({children}) => {
  // WCAG SC 3.1.1 — keep <html lang> in sync with the user's chosen Doogie
  // language so screen readers pronounce content correctly.
  useEffect(() => {
    const l = localStorage.getItem("ez_doogie_lang") || "en";
    // Strip subtag for zh-Hant/zh-Hans → "zh" for html lang; keep pa/fa/pt.
    const htmlLang = l.startsWith("zh") ? "zh" : (l === "pt-PT" ? "pt" : l);
    if (document.documentElement.lang !== htmlLang) document.documentElement.lang = htmlLang;
  });
  return (<>
    <ScrollToTop/>
    {/* Skip-to-content link — WCAG SC 2.4.1 (Bypass Blocks). First Tab keystroke
        focuses this so keyboard users can jump past nav on every page. */}
    <a href="#main-content" className="skip-to-content" data-testid="skip-to-content">Skip to main content</a>
    <ComplianceStrip/>
    <Nav/>
    <BackHomeBar/>
    <main id="main-content" tabIndex={-1}>{children}</main>
    <Footer/>
    {/* DoogieChat floating FAB retired site-wide — the Visual Agent at
        /visual-agent-demo is now the single unified entry point for Doogie
        (chat, voice, search, tours, insights, consultation). */}
    <CookieBanner/>
    <PageViewBeacon/>
    <PostHogGate/>
    <GA4Gate/>
    <TurnstileScriptLoader/>
    <BetaFeedbackWidget/>
  </>);
};

// Every SPA navigation lands at the top of the page. Preserves scroll ONLY
// when the URL includes a hash anchor (so /page#faq still jumps to the anchor).
function ScrollToTop() {
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash) return;
    // Belt-and-braces: some mobile browsers ignore window.scrollTo, some sites
    // scroll a scrollable body/html, and async content can push the scroll
    // position back down. Do it immediately + on next frame + one more after
    // 60ms to catch layout shifts from lazy-loaded images / async fetches.
    const scroll = () => {
      try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch { window.scrollTo(0, 0); }
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };
    scroll();
    requestAnimationFrame(scroll);
    const t = setTimeout(scroll, 80);
    return () => clearTimeout(t);
  }, [loc.pathname, loc.search]);
  return null;
}

// --- Cloudflare Turnstile (invisible bot-check on lead forms) ---
// Loads the Cloudflare script once. Gracefully no-ops when the site key is
// not configured (dev/preview). Each form calls <TurnstileWidget onToken={...}/>.
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "";
function TurnstileScriptLoader() {
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (document.querySelector("script[data-turnstile]")) return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true; s.defer = true; s.dataset.turnstile = "1";
    document.head.appendChild(s);
  }, []);
  return null;
}
export function TurnstileWidget({ onToken }) {
  const ref = useRef(null);
  const widgetId = useRef(null);
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let tries = 0;
    const render = () => {
      if (!window.turnstile) {
        if (++tries < 40) return setTimeout(render, 250);
        return;
      }
      if (widgetId.current !== null || !ref.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => { window.__ttoken = token; onToken && onToken(token); },
        "expired-callback": () => { window.__ttoken = ""; onToken && onToken(""); },
        "error-callback": () => { window.__ttoken = ""; onToken && onToken(""); },
        theme: "light",
        appearance: "interaction-only",
      });
    };
    render();
    return () => {
      if (widgetId.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch(e){}
        widgetId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} data-testid="turnstile-widget" style={{margin:"0.75rem 0"}}/>;
}
// Read Turnstile token at submit time. Empty string when not configured.
export const getTurnstileToken = () => (typeof window !== "undefined" ? (window.__ttoken || "") : "");

// Anonymous page-view beacon — sends one event per route change to /api/track/page.
// Skips /admin/* pages so Doug's own browsing doesn't pollute the growth dashboard.
// Also respects the user's PIPA cookie preference: if they've opted out of analytics
// via the Cookie Preferences modal, this component becomes a no-op.
function PageViewBeacon() {
  const loc = useLocation();
  useEffect(() => {
    if (loc.pathname.startsWith("/admin")) return;
    // Honour analytics opt-out from Cookie Preferences (PIPA).
    try {
      const prefs = JSON.parse(localStorage.getItem("ez_cookie_prefs") || "{}");
      if (prefs.analytics === false) return;
    } catch(_){}
    let sid = localStorage.getItem("ez_sid");
    if (!sid) {
      sid = (crypto.randomUUID ? crypto.randomUUID() : (Date.now()+"-"+Math.random().toString(36).slice(2)));
      localStorage.setItem("ez_sid", sid);
    }
    axios.post(`${API}/track/page`, {
      session_id: sid,
      path: loc.pathname + loc.search,
      referrer: document.referrer || "",
      lang: navigator.language || "",
    }).catch(() => {});
  }, [loc.pathname, loc.search]);
  return null;
}

// --- PostHog analytics gate (PIPA compliance) ---
// PostHog SDK is NOT loaded until the user opts into analytics cookies via the
// PIPA consent banner. If they later change their mind (via the "Cookie
// Preferences" link in the footer), we react to the `ez-cookie-prefs-changed`
// event and either lazy-load PostHog or opt them out of capturing.
const POSTHOG_KEY = "phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs";
const POSTHOG_HOST = "https://us.i.posthog.com";
function PostHogGate() {
  const initedRef = useRef(false);

  const loadAndInit = () => {
    if (initedRef.current) {
      if (window.posthog && window.posthog.opt_in_capturing) {
        try { window.posthog.opt_in_capturing(); } catch(_){}
      }
      return;
    }
    initedRef.current = true;
    // Inject the official PostHog snippet. Kept identical to the one Emergent
    // shipped in index.html, minus the auto-init call.
    /* eslint-disable no-var, eqeqeq, no-sequences, no-unused-expressions */
    (function(t,e){var o,n,p,r;if(!e.__SV){window.posthog=e;e._i=[];e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p=t.createElement("script");p.type="text/javascript";p.crossOrigin="anonymous";p.async=!0;p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js";r=t.getElementsByTagName("script")[0];r.parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init me ws ys ps bs capture je Di ks register register_once register_for_session unregister unregister_for_session Ps getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty Es $s createPersonProfile Is opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing Ss debug xs getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])};e.__SV=1}})(document,window.posthog||[]);
    /* eslint-enable no-var, eqeqeq, no-sequences, no-unused-expressions */
    try {
      window.posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        session_recording: { recordCrossOriginIframes: true, capturePerformance: false },
      });
    } catch(_){}
  };

  const optOut = () => {
    if (window.posthog && window.posthog.opt_out_capturing) {
      try { window.posthog.opt_out_capturing(); } catch(_){}
    }
  };

  const applyPrefs = () => {
    try {
      const prefs = JSON.parse(localStorage.getItem("ez_cookie_prefs") || "{}");
      if (prefs.analytics === true) loadAndInit();
      else optOut();
    } catch(_){}
  };

  useEffect(() => {
    applyPrefs();
    const handler = () => applyPrefs();
    window.addEventListener("ez-cookie-prefs-changed", handler);
    return () => window.removeEventListener("ez-cookie-prefs-changed", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// --- Google Analytics 4 gate (PIPA compliance) ---
// Same pattern as PostHogGate: GA4 (gtag.js) is not loaded until the user opts
// into analytics cookies via the PIPA consent banner. If they later change
// their mind via the "Cookie Preferences" footer link, we react to the
// `ez-cookie-prefs-changed` event.
const GA4_ID = process.env.REACT_APP_GA4_MEASUREMENT_ID;
function GA4Gate() {
  const loc = useLocation();
  const initedRef = useRef(false);
  const optedInRef = useRef(false);

  const loadAndInit = () => {
    if (!GA4_ID) return; // safety: skip if env is missing
    // Always clear the opt-out flag first — even on re-init after opt-out.
    window[`ga-disable-${GA4_ID}`] = false;
    optedInRef.current = true;
    if (initedRef.current) return;
    initedRef.current = true;

    // gtag.js snippet, matching Google's official install code.
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    // `anonymize_ip` + `client_storage:'none'` are not needed for GA4 (already
    // handled), but we set consent defaults so the client obeys withdrawal.
    gtag("consent", "default", {
      ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
      analytics_storage: "granted",
    });
    gtag("config", GA4_ID, { anonymize_ip: true });
  };

  const optOut = () => {
    // Google's official opt-out flag — GA4 checks this window var on every
    // event and skips ALL tracking if it's true. Safe to set even before load.
    if (GA4_ID) window[`ga-disable-${GA4_ID}`] = true;
    optedInRef.current = false;
  };

  const applyPrefs = () => {
    try {
      const prefs = JSON.parse(localStorage.getItem("ez_cookie_prefs") || "{}");
      if (prefs.analytics === true) loadAndInit();
      else optOut();
    } catch(_){}
  };

  useEffect(() => {
    applyPrefs();
    const handler = () => applyPrefs();
    window.addEventListener("ez-cookie-prefs-changed", handler);
    return () => window.removeEventListener("ez-cookie-prefs-changed", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SPA page-view tracking: GA4 auto-tracks the initial page load, but React
  // Router navigations don't cause a full page reload — we send `page_view`
  // manually on every route change (only if consent granted).
  useEffect(() => {
    if (!optedInRef.current || !window.gtag) return;
    try {
      window.gtag("event", "page_view", {
        page_path: loc.pathname + loc.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    } catch(_){}
  }, [loc.pathname, loc.search]);

  // Delegated contact-click tracking — catches every mailto: / tel: click
  // site-wide without needing to touch each link's onClick. Only fires when
  // the user has opted into analytics (upstream consent gate handles PIPA).
  useEffect(() => {
    const handler = (e) => {
      const a = e.target && e.target.closest && e.target.closest("a[href^='mailto:'], a[href^='tel:']");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (href.startsWith("mailto:")) {
        trackConversion("contact_click_email", { email_address: href.replace("mailto:", ""), link_text: (a.textContent || "").trim().substring(0, 80) });
      } else if (href.startsWith("tel:")) {
        trackConversion("contact_click_phone", { phone_number: href.replace("tel:", ""), link_text: (a.textContent || "").trim().substring(0, 80) });
      }
    };
    document.addEventListener("click", handler, { passive: true });
    return () => document.removeEventListener("click", handler);
  }, []);

  return null;
}
const AdminLayout = ({children}) => children;

// ---------- Admin: Beta Feedback inbox ----------
const AdminFeedback = () => {
  const {headers} = useAdmin();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({new:0, read:0, resolved:0});
  const [status, setStatus] = useState("");   // "" = all
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!headers) return;
    setBusy(true);
    const r = await axios.get(`${API}/admin/feedback${status?`?status=${status}`:""}`, {headers}).catch(()=>({data:{items:[],counts:{}}}));
    setItems(r.data.items || []);
    setCounts(r.data.counts || {});
    setBusy(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const setStatusFor = async (id, newStatus) => {
    await axios.patch(`${API}/admin/feedback/${id}`, {status: newStatus}, {headers});
    load();
  };
  const del = async (id) => {
    if (!window.confirm("Delete this feedback? This cannot be undone.")) return;
    await axios.delete(`${API}/admin/feedback/${id}`, {headers});
    load();
  };

  const catBadge = (cat) => {
    const m = {bug:{bg:"#FEE2E2",fg:"#991B1B",label:"🐛 Bug"}, question:{bg:"#FEF3C7",fg:"#92400E",label:"❓ Question"}, general:{bg:"#F3F4F6",fg:"#374151",label:"💬 General"}};
    const s = m[cat] || m.general;
    return <span style={{background:s.bg,color:s.fg,padding:"0.15rem 0.55rem",borderRadius:999,fontSize:"0.72rem",fontWeight:600}}>{s.label}</span>;
  };
  const statusBadge = (st) => {
    const m = {new:{bg:"#F5A623",fg:"#fff",label:"NEW"}, read:{bg:"#E5E7EB",fg:"#374151",label:"READ"}, resolved:{bg:"#86BC42",fg:"#fff",label:"RESOLVED"}};
    const s = m[st] || m.new;
    return <span style={{background:s.bg,color:s.fg,padding:"0.15rem 0.55rem",borderRadius:999,fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.05em"}}>{s.label}</span>;
  };

  return <AdminShell active="feedback">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>Beta Feedback</h1>
    <p style={{color:"var(--muted)",marginTop:0,fontSize:"0.92rem"}}>Every submission from the public site's floating <strong>💬 Send Feedback</strong> button lands here.</p>

    <div style={{display:"flex",gap:"0.5rem",marginTop:"1rem",marginBottom:"1rem",flexWrap:"wrap"}}>
      {[
        {v:"",         l:`All (${(counts.new||0)+(counts.read||0)+(counts.resolved||0)})`},
        {v:"new",      l:`🟠 New (${counts.new||0})`},
        {v:"read",     l:`⚪ Read (${counts.read||0})`},
        {v:"resolved", l:`✓ Resolved (${counts.resolved||0})`},
      ].map(t => (
        <button key={t.v} onClick={()=>setStatus(t.v)} className={status===t.v?"btn btn-primary":"btn btn-outline"} style={{padding:"0.5rem 1rem",fontSize:"0.9rem"}} data-testid={`fb-tab-${t.v||"all"}`}>{t.l}</button>
      ))}
    </div>

    {busy && <p>Loading…</p>}
    {!busy && items.length === 0 && <p style={{color:"var(--muted)"}}>✓ No feedback in this bucket yet.</p>}

    {!busy && items.map(it => (
      <div key={it.id} className="paper" style={{marginBottom:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem",flexWrap:"wrap",marginBottom:"0.75rem"}}>
          <div style={{flex:1, minWidth:220}}>
            <div style={{display:"flex",gap:"0.5rem",alignItems:"center",flexWrap:"wrap",marginBottom:"0.35rem"}}>
              {statusBadge(it.status)}
              {catBadge(it.category)}
              {it.rating>0 && <span style={{fontSize:"0.85rem",color:"#F5A623"}}>{"★".repeat(it.rating)}<span style={{color:"#D4D4D4"}}>{"★".repeat(5-it.rating)}</span></span>}
            </div>
            <div style={{fontWeight:600, color:"var(--brand-navy)"}}>{it.name}</div>
            <div style={{fontSize:"0.82rem", color:"var(--muted)"}}>
              <a href={`mailto:${it.email}`} style={{color:"var(--brand-blue)"}}>{it.email}</a> · {new Date(it.created_at).toLocaleString()}
              {it.page_url && <> · <code style={{background:"#F5F0E1",padding:"0.05rem 0.3rem",borderRadius:4}}>{it.page_url}</code></>}
            </div>
          </div>
          <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
            {it.status !== "read" && <button onClick={()=>setStatusFor(it.id,"read")} className="btn btn-outline" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem"}} data-testid={`fb-read-${it.id}`}>Mark read</button>}
            {it.status !== "resolved" && <button onClick={()=>setStatusFor(it.id,"resolved")} className="btn btn-green" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem"}} data-testid={`fb-resolve-${it.id}`}>✓ Resolve</button>}
            {it.status === "resolved" && <button onClick={()=>setStatusFor(it.id,"new")} className="btn btn-outline" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem"}}>Reopen</button>}
            <button onClick={()=>del(it.id)} className="btn btn-outline" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem",color:"#DC2626",borderColor:"#DC2626"}} data-testid={`fb-del-${it.id}`}>Delete</button>
          </div>
        </div>
        <div style={{whiteSpace:"pre-wrap",fontSize:"0.95rem",lineHeight:1.55,padding:"0.75rem",background:"#FAFAF5",borderRadius:8,borderLeft:"3px solid var(--brand-navy)"}}>{it.comment}</div>
        {it.user_agent && <div style={{fontSize:"0.72rem", color:"var(--muted)", marginTop:"0.5rem", fontFamily:"monospace"}}>{it.user_agent}</div>}
      </div>
    ))}
  </AdminShell>;
};

// ---------- Admin: Glossary FAQ Audit (risk-scored spot-check tool) ----------
const AdminFaqAudit = () => {
  const {headers} = useAdmin();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("high");   // start on high-risk by default
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(null); // slug currently expanded
  const [drafts, setDrafts] = useState({});       // slug → edited faqs array (for inline edits)
  const [action, setAction] = useState({});       // slug → "regenerating" | "approving" | ...

  const load = async () => {
    if (!headers) return;
    setBusy(true);
    const r = await axios.get(`${API}/admin/faq-audit?filter=${filter}`, {headers}).catch(()=>({data:{items:[]}}));
    setItems(r.data.items || []);
    setBusy(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const approve = async (slug) => {
    setAction(a => ({...a, [slug]: "approving"}));
    const faqs = drafts[slug];  // if user edited, send edited version
    await axios.post(`${API}/admin/approvals/glossary/approve`, {slug, ...(faqs ? {faqs} : {})}, {headers}).catch(()=>{});
    setDrafts(d => { const c={...d}; delete c[slug]; return c; });
    setAction(a => { const c={...a}; delete c[slug]; return c; });
    load();
  };
  const unapprove = async (slug) => {
    setAction(a => ({...a, [slug]: "rejecting"}));
    await axios.post(`${API}/admin/approvals/glossary/unapprove`, {slug}, {headers}).catch(()=>{});
    setAction(a => { const c={...a}; delete c[slug]; return c; });
    load();
  };
  const regenerate = async (slug) => {
    if (!window.confirm(`Regenerate FAQs for "${slug}"? Existing FAQs will be overwritten and status reset to unapproved. Costs ~$0.05 in LLM credits.`)) return;
    setAction(a => ({...a, [slug]: "regenerating"}));
    await axios.post(`${API}/admin/approvals/glossary/${slug}/regenerate`, {}, {headers}).catch(()=>{});
    setAction(a => { const c={...a}; delete c[slug]; return c; });
    load();
  };
  const editFaq = (slug, idx, field, val) => {
    setDrafts(d => {
      const current = d[slug] || items.find(x=>x.slug===slug)?.faqs || [];
      const next = current.map((f,i) => i===idx ? {...f, [field]: val} : f);
      return {...d, [slug]: next};
    });
  };
  const removeFaq = (slug, idx) => {
    setDrafts(d => {
      const current = d[slug] || items.find(x=>x.slug===slug)?.faqs || [];
      return {...d, [slug]: current.filter((_,i)=>i!==idx)};
    });
  };

  const riskBadge = (score) => {
    if (score >= 3) return <span style={{background:"#FEE2E2",color:"#991B1B",padding:"0.15rem 0.55rem",borderRadius:999,fontSize:"0.72rem",fontWeight:700}}>⚠ HIGH ({score})</span>;
    if (score === 2) return <span style={{background:"#FEF3C7",color:"#92400E",padding:"0.15rem 0.55rem",borderRadius:999,fontSize:"0.72rem",fontWeight:700}}>⚠ ELEVATED ({score})</span>;
    if (score === 1) return <span style={{background:"#EAF3FF",color:"#1E40AF",padding:"0.15rem 0.55rem",borderRadius:999,fontSize:"0.72rem",fontWeight:600}}>MODERATE ({score})</span>;
    return <span style={{background:"#F3F4F6",color:"#6B7280",padding:"0.15rem 0.55rem",borderRadius:999,fontSize:"0.72rem",fontWeight:600}}>LOW</span>;
  };
  const approvalBadge = (approved) => approved
    ? <span style={{background:"#86BC42",color:"#fff",padding:"0.15rem 0.55rem",borderRadius:999,fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.05em"}}>✓ APPROVED</span>
    : <span style={{background:"#F5A623",color:"#fff",padding:"0.15rem 0.55rem",borderRadius:999,fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.05em"}}>PENDING</span>;

  return <AdminShell active="faq-audit">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>Glossary FAQ Audit</h1>
    <p style={{color:"var(--muted)",marginTop:0,fontSize:"0.92rem",maxWidth:820}}>Risk-scored review of all {items.length > 0 ? "" : "396 "}glossary terms with FAQs. High-risk terms (PTT, GST, FINTRAC, dual agency, disclosure forms, tax rules, etc.) are ranked first so you can spot-check the most legally-sensitive answers. Approve, edit inline, or regenerate any term.</p>

    <div style={{display:"flex",gap:"0.5rem",marginTop:"1rem",marginBottom:"1rem",flexWrap:"wrap"}}>
      {[
        {v:"high",       l:"⚠ High Risk (~40)"},
        {v:"unapproved", l:"⏳ Pending Approval"},
        {v:"approved",   l:"✓ Approved"},
        {v:"all",        l:"All (396)"},
      ].map(t => (
        <button key={t.v} onClick={()=>setFilter(t.v)} className={filter===t.v?"btn btn-primary":"btn btn-outline"} style={{padding:"0.5rem 1rem",fontSize:"0.9rem"}} data-testid={`fa-tab-${t.v}`}>{t.l}</button>
      ))}
      <span style={{marginLeft:"auto",alignSelf:"center",color:"var(--muted)",fontSize:"0.85rem"}}>{busy ? "Loading…" : `${items.length} shown`}</span>
    </div>

    {!busy && items.length === 0 && <div className="paper" style={{textAlign:"center",padding:"2rem"}}>
      <p style={{color:"var(--muted)"}}>No terms in this bucket.</p>
    </div>}

    {items.map(it => {
      const isOpen = expanded === it.slug;
      const faqs = drafts[it.slug] || it.faqs || [];
      const busySlug = action[it.slug];
      return (
        <div key={it.slug} className="paper" style={{marginBottom:"0.85rem", opacity: busySlug ? 0.6 : 1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem",flexWrap:"wrap"}}>
            <div style={{flex:1, minWidth:220}}>
              <div style={{display:"flex",gap:"0.5rem",alignItems:"center",flexWrap:"wrap",marginBottom:"0.35rem"}}>
                {riskBadge(it.risk_score)}
                {approvalBadge(it.faqs_approved)}
                {it.category && <span style={{background:"#F3F4F6",color:"#374151",padding:"0.15rem 0.55rem",borderRadius:999,fontSize:"0.72rem"}}>{it.category}</span>}
                <span style={{fontSize:"0.75rem",color:"var(--muted)"}}>{faqs.length} FAQ{faqs.length!==1?"s":""}</span>
              </div>
              <div style={{fontWeight:600,color:"var(--brand-navy)",fontSize:"1.05rem"}}>
                <Link to={`/glossary/${it.slug}`} target="_blank" rel="noopener" style={{color:"var(--brand-navy)"}} data-testid={`fa-term-${it.slug}`}>{it.term}</Link>
              </div>
              {it.risk_hits && it.risk_hits.length > 0 && (
                <div style={{fontSize:"0.75rem",color:"#8B0000",marginTop:"0.25rem"}}>
                  Risk keywords: <em>{it.risk_hits.slice(0,6).join(", ")}</em>
                </div>
              )}
              <div style={{fontSize:"0.82rem",color:"var(--muted)",marginTop:"0.35rem",lineHeight:1.5}}>
                {(it.definition||"").slice(0,240)}{(it.definition||"").length > 240 ? "…" : ""}
              </div>
            </div>
            <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
              <button onClick={()=>setExpanded(isOpen ? null : it.slug)} className="btn btn-outline" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem"}} data-testid={`fa-toggle-${it.slug}`}>
                {isOpen ? "▲ Collapse" : `▾ Review FAQs (${faqs.length})`}
              </button>
              {!it.faqs_approved && <button onClick={()=>approve(it.slug)} className="btn btn-green" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem"}} disabled={!!busySlug} data-testid={`fa-approve-${it.slug}`}>{busySlug==="approving" ? "…" : "✓ Approve"}</button>}
              {it.faqs_approved && <button onClick={()=>unapprove(it.slug)} className="btn btn-outline" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem",color:"#DC2626",borderColor:"#DC2626"}} disabled={!!busySlug} data-testid={`fa-unapprove-${it.slug}`}>Unapprove</button>}
              <button onClick={()=>regenerate(it.slug)} className="btn btn-outline" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem"}} disabled={!!busySlug} data-testid={`fa-regen-${it.slug}`}>{busySlug==="regenerating" ? "🔄 Regenerating…" : "🔄 Regenerate"}</button>
            </div>
          </div>

          {isOpen && (
            <div style={{marginTop:"1rem",paddingTop:"0.85rem",borderTop:"1px solid rgba(15,42,91,0.1)"}}>
              {faqs.length === 0 && <p style={{color:"var(--muted)",fontStyle:"italic"}}>No FAQs generated yet.</p>}
              {faqs.map((f, i) => (
                <div key={i} style={{marginBottom:"0.85rem",padding:"0.75rem",background:"#FAFAF5",borderRadius:8,borderLeft:"3px solid var(--brand-navy)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"0.5rem",marginBottom:"0.35rem"}}>
                    <label style={{fontWeight:600,fontSize:"0.8rem",color:"var(--brand-navy)",flex:1}}>Q{i+1}</label>
                    <button onClick={()=>removeFaq(it.slug, i)} title="Remove this FAQ" style={{background:"none",border:"none",color:"#DC2626",cursor:"pointer",fontSize:"1rem",lineHeight:1,padding:"0 0.3rem"}}>🗑</button>
                  </div>
                  <textarea
                    value={f.q || ""}
                    onChange={e=>editFaq(it.slug, i, "q", e.target.value)}
                    rows={2}
                    style={{width:"100%",padding:"0.4rem",fontSize:"0.88rem",fontFamily:"inherit",border:"1px solid rgba(15,42,91,0.15)",borderRadius:6,marginBottom:"0.5rem",resize:"vertical"}}
                    data-testid={`fa-q-${it.slug}-${i}`}
                  />
                  <label style={{fontWeight:600,fontSize:"0.8rem",color:"var(--brand-navy)",display:"block",marginBottom:"0.25rem"}}>Answer</label>
                  <textarea
                    value={f.a || ""}
                    onChange={e=>editFaq(it.slug, i, "a", e.target.value)}
                    rows={4}
                    style={{width:"100%",padding:"0.4rem",fontSize:"0.88rem",fontFamily:"inherit",border:"1px solid rgba(15,42,91,0.15)",borderRadius:6,resize:"vertical",lineHeight:1.5}}
                    data-testid={`fa-a-${it.slug}-${i}`}
                  />
                </div>
              ))}
              {drafts[it.slug] && (
                <div style={{padding:"0.75rem",background:"#FEF3C7",borderRadius:8,fontSize:"0.85rem",color:"#92400E",marginBottom:"0.5rem"}}>
                  ⚠ You have unsaved edits. Click <strong>✓ Approve</strong> to save AND approve, or reload to discard.
                </div>
              )}
            </div>
          )}
        </div>
      );
    })}
  </AdminShell>;
};

// ---- Definition Audit — v2 hardening review ----
const AdminDefinitionAudit = () => {
  const { headers } = useAdmin();
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [regen, setRegen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState({});

  const load = async () => {
    setBusy(true);
    const r = await axios.get(`${API}/admin/definition-audit?status=${status}`, {headers}).catch(()=>({data:{items:[]}}));
    setItems(r.data.items || []);
    setBusy(false);
  };
  const loadStatus = async () => {
    const s = await axios.get(`${API}/admin/definitions/regen-status`, {headers}).catch(()=>({data:{}}));
    setRegen(s.data);
  };
  useEffect(() => { if(headers) { load(); loadStatus(); } }, [status]);
  useEffect(() => {
    // Poll regen status every 15s while a run is active
    const t = setInterval(async () => {
      const s = await axios.get(`${API}/admin/definitions/regen-status`, {headers}).catch(()=>null);
      if(s) {
        setRegen(s.data);
        if(s.data?.state?.running) load();  // refresh list as new items appear
      }
    }, 15000);
    return () => clearInterval(t);
  }, []);

  const kickoff = async () => {
    await axios.post(`${API}/admin/definitions/regenerate-v2`, {}, {headers});
    loadStatus();
  };
  const approveOne = async (slug) => {
    const edited = edits[slug];
    await axios.post(`${API}/admin/definitions/approve`, {slug, edited_text: edited || null}, {headers});
    load();
  };
  const rejectOne = async (slug) => {
    if(!window.confirm("Discard the pending v2 definition and keep the current live one?")) return;
    await axios.post(`${API}/admin/definitions/reject`, {slug}, {headers});
    load();
  };
  const approveAll = async () => {
    if(!window.confirm(`Approve every one of ${items.length} pending definitions and promote them to the live site? Any Doug-edited text is saved. This cannot be undone.`)) return;
    await axios.post(`${API}/admin/definitions/approve-all`, {}, {headers});
    load(); loadStatus();
  };

  const st = regen?.state;
  const progress = st?.total ? Math.round((st.processed / st.total) * 100) : 0;

  return <AdminShell active="def-audit">
    <h1 className="font-display" style={{fontSize:"2rem",marginTop:0}}>📖 Definition Audit — v2 Hardening</h1>
    <p style={{color:"var(--muted)"}}>Every glossary term definition is regenerated with the same hallucination-hardened prompt as your FAQs. New versions cite BC statutes from the whitelist, tag every dollar/percent/date with "as of YYYY-MM-DD — verify current", and hedge appropriately. Nothing goes live until you approve — the current definition stays on the site until you promote the pending one.</p>

    {regen && <div className="paper" style={{background: st?.running ? "#FFF3E0" : "#F7FAFF", marginBottom:"1.25rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
        <div><strong>Regen status:</strong> {st?.running ? `⏳ Running — ${st.processed}/${st.total} (${progress}%)` : "✅ Idle"}</div>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <button className="btn btn-ghost" onClick={loadStatus}>Refresh</button>
          {!st?.running && <button className="btn btn-primary" onClick={kickoff} data-testid="regen-kickoff">Start / resume regen</button>}
        </div>
      </div>
      {st?.errors?.length > 0 && <div style={{marginTop:"0.5rem",color:"#DC2626",fontSize:"0.85rem"}}>{st.errors.length} error(s) — see server logs</div>}
      {st?.running && <div style={{background:"#eee",height:6,borderRadius:3,marginTop:"0.75rem"}}><div style={{width:`${progress}%`,height:6,background:"var(--brand-blue)",borderRadius:3,transition:"width 0.5s"}}/></div>}
    </div>}

    <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
      {[
        {v:"pending", l:"Pending review"},
        {v:"approved", l:"Approved"},
        {v:"all", l:"All"},
      ].map(t => (
        <button key={t.v} onClick={()=>setStatus(t.v)} className={status===t.v?"btn btn-primary":"btn btn-outline"} style={{padding:"0.5rem 1rem",fontSize:"0.9rem"}} data-testid={`def-tab-${t.v}`}>{t.l}</button>
      ))}
      <span style={{marginLeft:"auto",alignSelf:"center",color:"var(--muted)",fontSize:"0.85rem"}}>{busy ? "Loading…" : `${items.length} shown`}</span>
      {status === "pending" && items.length > 0 && <button className="btn btn-green" onClick={approveAll} data-testid="def-approve-all" style={{padding:"0.5rem 1rem"}}>✅ Approve all {items.length}</button>}
    </div>

    {!busy && items.length === 0 && <div className="paper" style={{textAlign:"center",padding:"2rem"}}>
      <p style={{color:"var(--muted)"}}>{status === "pending" ? "No pending definitions. Kick off a regen above to generate v2 versions." : "None yet in this bucket."}</p>
    </div>}

    {items.map(it => (
      <div key={it.slug} className="paper" style={{marginBottom:"1rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"0.5rem",marginBottom:"0.75rem"}}>
          <div><strong style={{fontSize:"1.1rem",color:"var(--brand-navy)"}}>{it.term}</strong><span style={{marginLeft:"0.5rem",fontSize:"0.75rem",color:"var(--muted)"}}>{it.category}</span></div>
          <div style={{display:"flex",gap:"0.4rem"}}>
            <button className="btn btn-ghost" onClick={()=>rejectOne(it.slug)} style={{padding:"0.35rem 0.75rem",fontSize:"0.8rem",color:"#DC2626"}} data-testid={`def-reject-${it.slug}`}>Reject</button>
            <button className="btn btn-green" onClick={()=>approveOne(it.slug)} style={{padding:"0.35rem 0.75rem",fontSize:"0.8rem"}} data-testid={`def-approve-${it.slug}`}>Approve</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:"1rem"}}>
          <div>
            <div style={{fontSize:"0.75rem",fontWeight:600,color:"var(--muted)",marginBottom:"0.3rem"}}>CURRENT (live)</div>
            <div style={{background:"#F8F9FA",padding:"0.75rem",borderRadius:6,fontSize:"0.87rem",lineHeight:1.55}}>{it.definition}</div>
          </div>
          <div>
            <div style={{fontSize:"0.75rem",fontWeight:600,color:"#0F9D58",marginBottom:"0.3rem"}}>PENDING v2 (edit if needed)</div>
            <textarea value={edits[it.slug] ?? it.definition_pending} onChange={e=>setEdits({...edits, [it.slug]: e.target.value})} rows={Math.max(4, Math.ceil((it.definition_pending||"").length/80))} style={{width:"100%",padding:"0.75rem",borderRadius:6,border:"1px solid rgba(15,42,91,0.2)",fontSize:"0.87rem",lineHeight:1.55,fontFamily:"inherit"}} data-testid={`def-edit-${it.slug}`}/>
          </div>
        </div>
      </div>
    ))}
  </AdminShell>;
};



// =============== ADMIN: EVIDENCE CHAIN (Content Snapshots) ===============
// Tamper-evident SHA-256 fingerprints of the site's copyrightable content,
// tied to CIPO Registration No. 1247822. Weekly digest also emailed to Doug.
const AdminSnapshots = () => {
  const {headers} = useAdmin();
  const [snaps, setSnaps] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const load = () => axios.get(`${API}/admin/snapshots`, {headers}).then(r => setSnaps(r.data.snapshots || [])).catch(()=>{});
  useEffect(()=>{ if(headers) load(); }, []);
  const create = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await axios.post(`${API}/admin/snapshot/create`, {}, {headers});
      setMsg({ok:true, text:`Snapshot created · fingerprint: ${(r.data.combined_fingerprint_sha256||"").slice(0,20)}…`});
      load();
    } catch (x) { setMsg({ok:false, text: x?.response?.data?.detail || "Snapshot failed"}); }
    finally { setBusy(false); }
  };
  const download = async (id) => {
    try {
      const r = await axios.get(`${API}/admin/snapshots/${id}`, {headers});
      const blob = new Blob([JSON.stringify(r.data, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `snapshot-${id}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Download failed."); }
  };
  const fmtDate = s => s ? String(s).slice(0,16).replace("T"," ") : "—";
  return <AdminShell active="snapshots">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
      <div>
        <h1 className="font-display" style={{fontSize:"2rem",margin:0}}>📸 Evidence Chain</h1>
        <p style={{color:"var(--muted)",marginTop:"0.4rem",maxWidth:"64ch"}}>Tamper-evident SHA-256 fingerprints of every glossary term, community page, and micro-neighbourhood on the site. Weekly digest auto-emails to <strong>{"doug@eztofind.ca"}</strong>. Tied to <strong>CIPO Copyright Registration No. 1247822</strong>.</p>
      </div>
      <button className="btn btn-primary" onClick={create} disabled={busy} data-testid="snapshot-create-btn">
        {busy ? "Creating…" : "📸 Snapshot Now"}
      </button>
    </div>
    {msg && (
      <div className="notice" style={{background:msg.ok?"#F0FDF4":"#FEE2E2",borderColor:msg.ok?"#22C55E":"#DC2626",marginTop:"1.25rem"}} data-testid="snapshot-msg">
        {msg.ok ? "✅ " : "❌ "}{msg.text}
      </div>
    )}
    <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderLeft:"4px solid #F59E0B",padding:"1rem 1.25rem",borderRadius:8,margin:"1.5rem 0",fontSize:"0.9rem",color:"#78350F"}}>
      <strong>How this protects you:</strong> Each snapshot cryptographically proves what your site's content was on a specific date. If a copycat is discovered later, you can submit the snapshot manifest as court-admissible evidence that your version pre-dated theirs. The weekly email creates an independent third-party (email provider) timestamp trail.
    </div>
    <div className="admin-table" style={{marginTop:"1rem"}} data-testid="snapshot-list">
      {snaps.length === 0 && <p style={{color:"var(--muted)"}}>No snapshots yet. Click "Snapshot Now" to create your first.</p>}
      {snaps.map(s => (
        <div key={s.id} className="paper" style={{marginBottom:"0.75rem",padding:"1rem 1.25rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
          <div style={{flex:"1 1 300px"}}>
            <div style={{fontSize:"0.72rem",letterSpacing:"0.05em",textTransform:"uppercase",color:"var(--muted)",fontWeight:600}}>{fmtDate(s.created_at)} · CIPO Reg. #{s.cipo_registration_no}</div>
            <div style={{fontFamily:"Menlo,Consolas,monospace",fontSize:"0.78rem",marginTop:"0.4rem",wordBreak:"break-all",color:"#1a1a1a"}}>{s.combined_fingerprint_sha256}</div>
            <div style={{fontSize:"0.82rem",color:"var(--muted)",marginTop:"0.35rem"}}>
              {s.counts?.glossary_terms || 0} glossary · {s.counts?.communities || 0} communities · {s.counts?.neighbourhoods || 0} neighbourhoods · {(s.total_bytes_hashed||0).toLocaleString()} bytes hashed
            </div>
          </div>
          <button className="btn btn-ghost" onClick={()=>download(s.id)} data-testid={`snap-download-${s.id}`}>Download JSON</button>
        </div>
      ))}
    </div>
  </AdminShell>;
};

// =============== ADMIN: CAMPAIGNS (CASL Drip Email) ===============
// Dashboard for all 5 drip campaigns: opt-in counts, 30-day send counts,
// pending-approval drafts for approval-gated campaigns (seller_updates, news_tips),
// manual run/approve/release buttons.
const AdminCampaigns = () => {
  const {headers} = useAdmin();
  const [stats, setStats] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [previewDraft, setPreviewDraft] = useState(null);
  const load = () => {
    axios.get(`${API}/admin/campaigns/stats`, {headers}).then(r => setStats(r.data.campaigns || [])).catch(()=>{});
    axios.get(`${API}/admin/campaigns/drafts`, {headers}).then(r => setDrafts(r.data.drafts || [])).catch(()=>{});
  };
  useEffect(()=>{ if(headers) load(); }, []);
  const run = async (cid) => {
    setBusy(cid); setMsg(null);
    try {
      const r = await axios.post(`${API}/admin/campaigns/${cid}/run`, {}, {headers, timeout: 60000});
      const res = r.data.result || {};
      const summary = res.sent !== undefined ? `sent ${res.sent} of ${res.considered || 0} opted-in users` : `prepared ${res.drafts_prepared || 0} drafts across ${res.communities || 0} communities`;
      setMsg({ok:true, text:`✅ ${cid}: ${summary}`});
      load();
    } catch (x) { setMsg({ok:false, text: x?.response?.data?.detail || "Run failed"}); }
    finally { setBusy(null); }
  };
  const approve = async (ids) => {
    setBusy("_approve");
    try { await axios.post(`${API}/admin/campaigns/drafts/approve`, {draft_ids: ids}, {headers}); setMsg({ok:true, text:`✅ Approved ${ids.length} draft(s). Click "Release" to send.`}); load(); }
    catch(x){ setMsg({ok:false, text: x?.response?.data?.detail || "Approve failed"}); }
    finally { setBusy(null); }
  };
  const reject = async (ids) => {
    if (!window.confirm(`Reject ${ids.length} draft(s)? They won't be sent.`)) return;
    setBusy("_reject");
    try { await axios.post(`${API}/admin/campaigns/drafts/reject`, {draft_ids: ids}, {headers}); setMsg({ok:true, text:`Rejected ${ids.length} draft(s).`}); load(); }
    catch(x){ setMsg({ok:false, text: x?.response?.data?.detail || "Reject failed"}); }
    finally { setBusy(null); }
  };
  const release = async (cid) => {
    if (!window.confirm(`Send all APPROVED drafts for '${cid}'? This will deliver them via Resend now.`)) return;
    setBusy(`_release-${cid}`);
    try { const r = await axios.post(`${API}/admin/campaigns/drafts/release`, {}, {headers, params:{campaign: cid}}); setMsg({ok:true, text:`✅ Released ${r.data.result?.sent||0} email(s) for ${cid}.`}); load(); }
    catch(x){ setMsg({ok:false, text: x?.response?.data?.detail || "Release failed"}); }
    finally { setBusy(null); }
  };
  const cadenceLabel = c => ({weekly:"Every Sunday", monthly:"1st of month", trigger:"Event-triggered", occasional:"Manual"}[c] || c);
  const draftsByCampaign = drafts.reduce((a,d) => ({...a, [d.campaign]: [...(a[d.campaign]||[]), d]}), {});

  return <AdminShell active="campaigns">
    <h1 className="font-display" style={{fontSize:"2rem",margin:0}}>📧 Email Campaigns</h1>
    <p style={{color:"var(--muted)",marginTop:"0.4rem",maxWidth:"64ch"}}>CASL-compliant drip email system. Each user opts in per-campaign; every send is logged in <code>campaign_sends</code>; per-campaign unsubscribe via preference center at <code>/email-preferences</code>. Approval-gated campaigns (marked 🔒) prepare drafts you must review before release.</p>

    {msg && <div className="notice" style={{background:msg.ok?"#F0FDF4":"#FEE2E2",borderColor:msg.ok?"#22C55E":"#DC2626",marginTop:"1.25rem"}} data-testid="campaigns-msg">{msg.text}</div>}

    <div style={{marginTop:"1.5rem",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:"1rem"}} data-testid="campaigns-grid">
      {stats.map(s => (
        <div key={s.id} className="paper" style={{padding:"1.25rem"}} data-testid={`campaign-card-${s.id}`}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"0.5rem"}}>
            <div>
              <div style={{fontSize:"0.7rem",letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--muted)",fontWeight:600}}>
                {cadenceLabel(s.cadence)} {s.requires_approval && "· 🔒 approval required"}
              </div>
              <div style={{fontFamily:"Georgia,serif",fontSize:"1.15rem",fontWeight:700,color:"var(--brand-navy)",marginTop:"0.2rem"}}>{s.label}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"1.25rem",marginTop:"0.9rem"}}>
            <div><div style={{fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--muted)"}}>Opted in</div><div style={{fontFamily:"Sora,sans-serif",fontSize:"1.5rem",fontWeight:700,color:"var(--brand-navy)"}}>{s.opted_in}</div></div>
            <div><div style={{fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--muted)"}}>Sent 30d</div><div style={{fontFamily:"Sora,sans-serif",fontSize:"1.5rem",fontWeight:700,color:"var(--brand-navy)"}}>{s.sends_30d}</div></div>
            {s.requires_approval && <div><div style={{fontSize:"0.68rem",textTransform:"uppercase",letterSpacing:"0.05em",color:"#F59E0B"}}>Pending</div><div style={{fontFamily:"Sora,sans-serif",fontSize:"1.5rem",fontWeight:700,color:"#F59E0B"}}>{s.pending_drafts}</div></div>}
          </div>
          <div style={{display:"flex",gap:"0.4rem",marginTop:"1rem",flexWrap:"wrap"}}>
            <button className="btn btn-ghost" onClick={()=>run(s.id)} disabled={busy===s.id} data-testid={`campaign-run-${s.id}`} style={{fontSize:"0.82rem",padding:"0.4rem 0.85rem"}}>
              {busy===s.id ? "…running" : (s.requires_approval ? "▶ Prepare drafts" : "▶ Run now")}
            </button>
            {s.requires_approval && s.pending_drafts > 0 && (
              <button className="btn btn-primary" onClick={()=>release(s.id)} disabled={busy===`_release-${s.id}`} data-testid={`campaign-release-${s.id}`} style={{fontSize:"0.82rem",padding:"0.4rem 0.85rem"}}>Release approved →</button>
            )}
          </div>
        </div>
      ))}
    </div>

    {drafts.length > 0 && (
      <div style={{marginTop:"3rem"}} data-testid="pending-drafts-section">
        <h2 style={{fontFamily:"Georgia,serif",fontSize:"1.4rem"}}>🔒 Pending approval ({drafts.length})</h2>
        <p style={{color:"var(--muted)",fontSize:"0.9rem",maxWidth:"64ch"}}>Under BCFSA AI Guidelines, drafts containing AI-generated content require your review before send. Approve individually or in bulk; only approved drafts are released.</p>
        {Object.entries(draftsByCampaign).map(([cid, list]) => (
          <div key={cid} style={{marginTop:"1.25rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.5rem",marginBottom:"0.5rem"}}>
              <h3 style={{margin:0,fontFamily:"Georgia,serif",fontSize:"1.1rem"}}>{CAMPAIGN_REGISTRY_CLIENT[cid]?.label || cid} <span style={{color:"var(--muted)",fontWeight:400}}>({list.length})</span></h3>
              <div style={{display:"flex",gap:"0.4rem"}}>
                <button className="btn btn-ghost" onClick={()=>approve(list.map(d=>d.id))} disabled={busy==="_approve"} data-testid={`drafts-approve-all-${cid}`} style={{fontSize:"0.78rem",padding:"0.35rem 0.75rem"}}>✓ Approve all</button>
                <button className="btn btn-ghost" onClick={()=>reject(list.map(d=>d.id))} disabled={busy==="_reject"} data-testid={`drafts-reject-all-${cid}`} style={{fontSize:"0.78rem",padding:"0.35rem 0.75rem",color:"#DC2626",borderColor:"#DC2626"}}>✕ Reject all</button>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
              {list.map(d => (
                <div key={d.id} className="paper" style={{padding:"0.75rem 1rem",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}} data-testid={`draft-${d.id}`}>
                  <div style={{flex:"1 1 200px",minWidth:0}}>
                    <div style={{fontSize:"0.7rem",color:"var(--muted)"}}>{d.email}</div>
                    <div style={{fontWeight:600,color:"var(--brand-navy)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.subject}</div>
                  </div>
                  <div style={{display:"flex",gap:"0.3rem"}}>
                    <button className="btn btn-ghost" onClick={()=>setPreviewDraft(d)} data-testid={`draft-preview-${d.id}`} style={{fontSize:"0.75rem",padding:"0.3rem 0.7rem"}}>Preview</button>
                    <button className="btn btn-ghost" onClick={()=>approve([d.id])} data-testid={`draft-approve-${d.id}`} style={{fontSize:"0.75rem",padding:"0.3rem 0.7rem"}}>✓ Approve</button>
                    <button className="btn btn-ghost" onClick={()=>reject([d.id])} data-testid={`draft-reject-${d.id}`} style={{fontSize:"0.75rem",padding:"0.3rem 0.7rem",color:"#DC2626"}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}

    {previewDraft && (
      <div onClick={()=>setPreviewDraft(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",maxWidth:720,width:"100%",maxHeight:"90vh",overflow:"auto",borderRadius:12,padding:"1.5rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <div><div style={{fontSize:"0.72rem",color:"var(--muted)"}}>Preview draft to {previewDraft.email}</div><div style={{fontWeight:700,fontFamily:"Georgia,serif"}}>{previewDraft.subject}</div></div>
            <button className="btn btn-ghost" onClick={()=>setPreviewDraft(null)}>Close</button>
          </div>
          <div dangerouslySetInnerHTML={{__html: safeHtml(previewDraft.html)}} style={{border:"1px solid #e5e7eb",borderRadius:8,padding:"1rem"}}/>
        </div>
      </div>
    )}
  </AdminShell>;
};

// Client-side copy of the campaign labels for the drafts UI (avoids extra fetch)
const CAMPAIGN_REGISTRY_CLIENT = {
  buyer_digest:     {label: "Weekly listing digest"},
  seller_updates:   {label: "Monthly market update"},
  welcome_series:   {label: "Welcome series (3 emails)"},
  dormant_wakeup:   {label: "Dormant buyer re-engagement"},
  news_tips:        {label: "News & tips (occasional)"},
};



// =============== ADMIN: COPYCAT DETECTOR ===============
// Fetches a suspect URL (or accepts pasted text) and hunts for canary phrases +
// shingle overlaps against our glossary/community/neighbourhood library. If a
// match is found, one-click hand-off to the Cease & Desist drafter.
const AdminCopycatDetector = () => {
  const {headers} = useAdmin();
  const nav = useNavigate();
  const [mode, setMode] = useState("url"); // "url" | "paste"
  const [url, setUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [threshold, setThreshold] = useState(3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const loadHistory = () => axios.get(`${API}/admin/copycat/scans`, {headers}).then(r => setHistory(r.data.scans || [])).catch(()=>{});
  useEffect(()=>{ if(headers) loadHistory(); }, []);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null); setResult(null);
    try {
      const body = mode === "url"
        ? {suspect_url: url.trim(), min_shingles: parseInt(threshold) || 3}
        : {raw_text: pasteText, min_shingles: parseInt(threshold) || 3};
      const r = await axios.post(`${API}/admin/copycat/scan`, body, {headers, timeout: 60000});
      setResult(r.data);
      loadHistory();
    } catch (x) { setErr(x?.response?.data?.detail || "Scan failed."); }
    finally { setBusy(false); }
  };
  const draftCnd = () => {
    // Hand off to the C&D drafter with pre-filled fields
    if (!result) return;
    const params = new URLSearchParams({
      copycat_url: result.suspect_url,
      pages_copied: (result.matches || []).map(m => m.source_url).slice(0, 10).join("\n"),
      what_was_copied: `Detected via automated copycat scan (${result.verdict}): ${result.canary_hits?.length || 0} canary phrase hit(s) + ${result.match_count || 0} matched content passage(s) from EZtoFind.ca's proprietary glossary, community, and micro-neighbourhood library.`,
    });
    nav(`/admin/cease-desist?${params.toString()}`);
  };
  const verdictColor = (v) => ({
    smoking_gun: {bg:"#FEE2E2", border:"#DC2626", text:"#7F1D1D"},
    high_confidence: {bg:"#FEF3C7", border:"#F59E0B", text:"#78350F"},
    possible: {bg:"#FEF3C7", border:"#FBBF24", text:"#92400E"},
    clean: {bg:"#F0FDF4", border:"#22C55E", text:"#166534"},
  }[v] || {bg:"#F3F4F6", border:"#6b7280", text:"#374151"});
  const fmtDate = s => s ? String(s).slice(0,16).replace("T"," ") : "—";
  return <AdminShell active="copycat">
    <h1 className="font-display" style={{fontSize:"2rem",margin:0}}>🕵️ Copycat Detector</h1>
    <p style={{color:"var(--muted)",marginTop:"0.4rem",maxWidth:"64ch"}}>Paste a suspect URL or its text content. We'll compare against your <strong>4 canary phrases</strong> and 8-word shingles across <strong>1,059 pieces</strong> of copyrighted content (glossary + communities + micro-neighbourhoods). Any match tied to <strong>CIPO Reg. No. 1247822</strong>.</p>

    <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderLeft:"4px solid #3B82F6",padding:"1rem 1.25rem",borderRadius:8,margin:"1.5rem 0",fontSize:"0.9rem",color:"#1E3A8A"}}>
      <strong>Tip:</strong> Some sites (React SPAs, auth-walled, Cloudflare-protected) return empty HTML to our fetcher. If a URL comes back "clean" but you know it looks suspicious, switch to <strong>Paste Text</strong> mode — open the site in your browser, right-click → "View Page Source" (or copy the visible text), and paste it here.
    </div>

    <form onSubmit={submit} className="paper" style={{padding:"1.5rem",marginBottom:"2rem"}}>
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem"}}>
        <button type="button" onClick={()=>setMode("url")} className={mode==="url"?"btn btn-primary":"btn btn-ghost"} data-testid="copycat-mode-url">🌐 Fetch URL</button>
        <button type="button" onClick={()=>setMode("paste")} className={mode==="paste"?"btn btn-primary":"btn btn-ghost"} data-testid="copycat-mode-paste">📋 Paste Text</button>
      </div>
      {mode === "url" ? (
        <div className="field"><label>Suspect URL</label>
          <input required={mode==="url"} placeholder="https://example-copycat.com/page-with-copied-content" value={url} onChange={e=>setUrl(e.target.value)} data-testid="copycat-url"/>
        </div>
      ) : (
        <div className="field"><label>Paste page text or HTML source</label>
          <textarea rows={8} required={mode==="paste"} placeholder="Paste the visible text from the suspect page (or right-click → View Source)…" value={pasteText} onChange={e=>setPasteText(e.target.value)} data-testid="copycat-paste" style={{fontFamily:"Menlo,Consolas,monospace",fontSize:"0.85rem"}}/>
        </div>
      )}
      <div className="field" style={{marginTop:"1rem",maxWidth:280}}><label>Match sensitivity (min shingles per item)</label>
        <select value={threshold} onChange={e=>setThreshold(e.target.value)} data-testid="copycat-threshold" style={{width:"100%",padding:"0.55rem 0.8rem",borderRadius:8,border:"2px solid rgba(15,42,91,0.15)",fontFamily:"Inter,sans-serif"}}>
          <option value="2">Loose (2 shingles — catches paraphrases)</option>
          <option value="3">Balanced (3 shingles — default)</option>
          <option value="6">Strict (6 shingles — only verbatim)</option>
        </select>
      </div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}} data-testid="copycat-err">{err}</div>}
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} disabled={busy} data-testid="copycat-submit">
        {busy ? "Scanning (5-30 sec)…" : "🕵️ Run Copycat Scan"}
      </button>
    </form>

    {result && (() => {
      const vc = verdictColor(result.verdict);
      return (
        <div className="paper" style={{padding:"1.5rem",marginBottom:"2rem"}} data-testid="copycat-result">
          <div style={{background:vc.bg,border:`2px solid ${vc.border}`,borderRadius:10,padding:"1.25rem 1.5rem",marginBottom:"1.25rem"}}>
            <div style={{fontSize:"1.2rem",fontWeight:700,color:vc.text}} data-testid="copycat-verdict">{result.verdict_label}</div>
            <div style={{fontSize:"0.82rem",color:vc.text,opacity:0.85,marginTop:"0.35rem"}}>
              Suspect: <a href={result.suspect_url === "(pasted text)" ? "#" : result.suspect_url} target="_blank" rel="noopener noreferrer" style={{color:vc.text,fontWeight:600}}>{result.suspect_url}</a>
              {result.status_code ? ` · HTTP ${result.status_code}` : ""} · {result.total_words?.toLocaleString?.() || 0} words scanned
            </div>
          </div>

          {result.canary_hits && result.canary_hits.length > 0 && (
            <div style={{marginBottom:"1.5rem"}}>
              <h3 style={{fontFamily:"Georgia,serif",fontSize:"1.15rem",color:"#7F1D1D",margin:"0 0 0.75rem"}}>🚨 Canary Phrase Hits ({result.canary_hits.length})</h3>
              <p style={{fontSize:"0.85rem",color:"var(--muted)",marginBottom:"0.75rem"}}>These phrases are invisible on our site (aria-hidden). Their appearance elsewhere is court-grade proof of scraping.</p>
              {result.canary_hits.map((c,i) => (
                <div key={i} className="paper" style={{padding:"0.9rem 1.25rem",marginBottom:"0.5rem",background:"#FEF2F2",border:"1px solid #FCA5A5",borderLeft:"4px solid #DC2626"}}>
                  <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.05em",color:"#7F1D1D",fontWeight:700}}>{c.canary_id}</div>
                  <div style={{fontFamily:"Menlo,Consolas,monospace",fontSize:"0.85rem",marginTop:"0.25rem",color:"#450A0A"}}>{c.phrase}</div>
                  <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"0.35rem",fontStyle:"italic"}}>…{c.snippet}…</div>
                </div>
              ))}
            </div>
          )}

          {result.matches && result.matches.length > 0 && (
            <div style={{marginBottom:"1rem"}}>
              <h3 style={{fontFamily:"Georgia,serif",fontSize:"1.15rem",color:"var(--brand-navy)",margin:"0 0 0.75rem"}}>📝 Matched Content ({result.matches.length})</h3>
              <p style={{fontSize:"0.85rem",color:"var(--muted)",marginBottom:"0.75rem"}}>Our content pages whose 8-word phrases appear on the suspect page. Higher shingle count = stronger evidence.</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"0.75rem"}} data-testid="copycat-matches">
                {result.matches.map((m,i) => (
                  <a key={i} href={m.source_url} target="_blank" rel="noopener noreferrer" className="paper" style={{padding:"0.9rem 1rem",textDecoration:"none",color:"inherit",borderLeft:"4px solid var(--brand-blue)"}} data-testid={`copycat-match-${m.slug}`}>
                    <div style={{fontSize:"0.7rem",textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--muted)",fontWeight:600}}>{m.kind}</div>
                    <div style={{fontWeight:600,marginTop:"0.2rem",color:"var(--brand-navy)"}}>{m.name}</div>
                    <div style={{fontSize:"0.85rem",marginTop:"0.35rem",color:"#DC2626",fontWeight:600}}>{m.matched_shingles} matched phrases ({m.overlap_pct}% overlap)</div>
                    <div style={{fontSize:"0.75rem",fontFamily:"Menlo,Consolas,monospace",color:"var(--muted)",marginTop:"0.35rem",fontStyle:"italic"}}>"{(m.sample_shingle || "").slice(0, 60)}…"</div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {(result.verdict !== "clean") && (
            <div style={{marginTop:"1.5rem",padding:"1rem 1.25rem",background:"#0F2A5B",borderRadius:10,color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
              <div>
                <div style={{fontSize:"0.72rem",textTransform:"uppercase",letterSpacing:"0.08em",opacity:0.8}}>Next step</div>
                <div style={{fontWeight:600,marginTop:"0.15rem"}}>Draft a Cease & Desist letter with all matched pages pre-filled</div>
              </div>
              <button className="btn" onClick={draftCnd} style={{background:"#F5A623",color:"#0F2A5B",border:"none",padding:"0.75rem 1.5rem",borderRadius:999,fontWeight:700,cursor:"pointer"}} data-testid="copycat-draft-cnd">⚡ Draft C&D →</button>
            </div>
          )}
        </div>
      );
    })()}

    <h2 style={{fontFamily:"Georgia,serif",marginTop:"3rem"}}>Scan History ({history.length})</h2>
    {history.length === 0 && <p style={{color:"var(--muted)"}}>No scans yet.</p>}
    <div data-testid="copycat-history">
      {history.map(h => {
        const vc = verdictColor(h.verdict);
        return (
          <div key={h.id} className="paper" style={{marginBottom:"0.5rem",padding:"0.9rem 1.25rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.75rem",borderLeft:`4px solid ${vc.border}`}}>
            <div style={{flex:"1 1 300px"}}>
              <div style={{fontSize:"0.72rem",letterSpacing:"0.05em",textTransform:"uppercase",color:"var(--muted)"}}>{fmtDate(h.created_at)}</div>
              <div style={{fontWeight:600,marginTop:"0.2rem",color:vc.text}}>{h.verdict_label}</div>
              <div style={{fontSize:"0.82rem",color:"var(--muted)",marginTop:"0.2rem",wordBreak:"break-all"}}>{h.suspect_url}</div>
              <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"0.15rem"}}>{h.canary_hits?.length || 0} canary hit(s) · {h.match_count || 0} content match(es)</div>
            </div>
            <button className="btn btn-ghost" onClick={()=>setResult(h)} data-testid={`copycat-view-${h.id}`}>View</button>
          </div>
        );
      })}
    </div>
  </AdminShell>;
};



// =============== ADMIN: CEASE & DESIST DRAFTER ===============
// One-click AI-drafted legal letter tied to CIPO Reg. #1247822. Sends to Doug's
// backend which uses Claude to generate a full HTML letter he can copy/paste
// into email or print & sign.
const AdminCeaseDesist = () => {
  const {headers} = useAdmin();
  const loc = useLocation();
  const [f, setF] = useState({copycat_url:"", copycat_name:"", pages_copied:"", what_was_copied:"", deadline_days:14});
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [err, setErr] = useState(null);
  const loadDrafts = () => axios.get(`${API}/admin/cease-desist/log`, {headers}).then(r => setDrafts(r.data.drafts || [])).catch(()=>{});
  useEffect(()=>{ if(headers) loadDrafts(); }, []);
  // Pre-fill from ?copycat_url=…&pages_copied=…&what_was_copied=… (Copycat Detector hand-off)
  useEffect(() => {
    const p = new URLSearchParams(loc.search);
    if (p.get("copycat_url") || p.get("pages_copied") || p.get("what_was_copied")) {
      setF(prev => ({
        ...prev,
        copycat_url: p.get("copycat_url") || prev.copycat_url,
        pages_copied: p.get("pages_copied") || prev.pages_copied,
        what_was_copied: p.get("what_was_copied") || prev.what_was_copied,
      }));
    }
  }, [loc.search]);
  const submit = async (e) => {
    e.preventDefault();
    if (!f.copycat_url.trim()) { setErr("Copycat URL is required."); return; }
    setBusy(true); setErr(null); setLetter(null);
    try {
      const body = {
        copycat_url: f.copycat_url.trim(),
        copycat_name: f.copycat_name.trim() || null,
        pages_copied: f.pages_copied.split("\n").map(x=>x.trim()).filter(Boolean),
        what_was_copied: f.what_was_copied.trim() || null,
        deadline_days: parseInt(f.deadline_days) || 14,
      };
      const r = await axios.post(`${API}/admin/cease-desist/draft`, body, {headers, timeout: 120000});
      setLetter(r.data);
      loadDrafts();
    } catch (x) { setErr(x?.response?.data?.detail || "Draft failed"); }
    finally { setBusy(false); }
  };
  const copyLetter = () => {
    if (!letter?.letter_html) return;
    // Strip HTML tags for plain-text clipboard
    const tmp = document.createElement("div"); tmp.innerHTML = letter.letter_html;
    navigator.clipboard.writeText(tmp.innerText || tmp.textContent || "");
    alert("Letter copied to clipboard (plain text).");
  };
  const copyHtml = () => {
    if (!letter?.letter_html) return;
    navigator.clipboard.writeText(letter.letter_html);
    alert("HTML copied to clipboard.");
  };
  const printLetter = () => {
    if (!letter?.letter_html) return;
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Cease & Desist — CIPO Reg. ${letter.cipo_registration_no}</title><style>body{font-family:Arial,sans-serif;max-width:700px;margin:2rem auto;padding:1rem;color:#000;line-height:1.5}</style></head><body>${letter.letter_html}</body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(), 300);
  };
  const fmtDate = s => s ? String(s).slice(0,16).replace("T"," ") : "—";
  return <AdminShell active="cease-desist">
    <div>
      <h1 className="font-display" style={{fontSize:"2rem",margin:0}}>⚡ Cease & Desist Drafter</h1>
      <p style={{color:"var(--muted)",marginTop:"0.4rem",maxWidth:"64ch"}}>One-click AI-drafted legal letter pre-filled with your <strong>CIPO Copyright Registration No. 1247822</strong>. Pastes the infringer URL, cites the Canadian Copyright Act (ss. 3, 27, 34, 38.1), and demands takedown within 14 days.</p>
    </div>
    <div style={{background:"#FEE2E2",border:"1px solid #FCA5A5",borderLeft:"4px solid #DC2626",padding:"1rem 1.25rem",borderRadius:8,margin:"1.5rem 0",fontSize:"0.9rem",color:"#7F1D1D"}}>
      <strong>Legal disclaimer:</strong> This tool generates a <em>starter draft</em> using an AI legal-writing assistant. Before sending, <strong>have a Canadian IP lawyer review</strong> the letter (typical cost: $150–$400 for a review-only pass). Sending a defective C&D can weaken your position.
    </div>
    <form onSubmit={submit} className="paper" style={{padding:"1.5rem",marginBottom:"2rem"}}>
      <div className="field"><label>Copycat URL <span style={{color:"#DC2626"}}>*</span></label>
        <input required placeholder="https://example-copycat-site.com" value={f.copycat_url} onChange={e=>setF({...f,copycat_url:e.target.value})} data-testid="cnd-url"/>
      </div>
      <div className="field" style={{marginTop:"1rem"}}><label>Copycat name / business (if known)</label>
        <input placeholder="e.g. FakeCopy Realty Ltd." value={f.copycat_name} onChange={e=>setF({...f,copycat_name:e.target.value})} data-testid="cnd-name"/>
      </div>
      <div className="field" style={{marginTop:"1rem"}}><label>EZtoFind.ca pages that appear to be copied (one URL per line)</label>
        <textarea rows={4} placeholder={"https://eztofind.ca/glossary/property-transfer-tax\nhttps://eztofind.ca/community/whistler"} value={f.pages_copied} onChange={e=>setF({...f,pages_copied:e.target.value})} data-testid="cnd-pages" style={{fontFamily:"Menlo,Consolas,monospace",fontSize:"0.85rem"}}/>
      </div>
      <div className="field" style={{marginTop:"1rem"}}><label>What was copied (brief description)</label>
        <textarea rows={3} placeholder="e.g. Verbatim reproduction of our glossary definitions, community write-ups, and Doogie AI character branding." value={f.what_was_copied} onChange={e=>setF({...f,what_was_copied:e.target.value})} data-testid="cnd-description"/>
      </div>
      <div className="field" style={{marginTop:"1rem",maxWidth:200}}><label>Compliance deadline (days)</label>
        <input type="number" min="7" max="60" value={f.deadline_days} onChange={e=>setF({...f,deadline_days:e.target.value})} data-testid="cnd-deadline"/>
      </div>
      {err && <div className="notice" style={{background:"#FEE2E2",borderColor:"#DC2626",marginTop:"1rem"}} data-testid="cnd-err">{err}</div>}
      <button type="submit" className="btn btn-primary" style={{marginTop:"1.5rem"}} disabled={busy} data-testid="cnd-submit">
        {busy ? "Drafting letter (10-30 sec)…" : "⚡ Generate Cease & Desist Letter"}
      </button>
    </form>

    {letter && (
      <div className="paper" style={{padding:"1.5rem",marginBottom:"2rem"}} data-testid="cnd-letter-output">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.5rem",marginBottom:"1rem"}}>
          <h2 style={{margin:0,fontFamily:"Georgia,serif"}}>Draft Letter</h2>
          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
            <button type="button" className="btn btn-ghost" onClick={copyLetter} data-testid="cnd-copy-text">📋 Copy text</button>
            <button type="button" className="btn btn-ghost" onClick={copyHtml} data-testid="cnd-copy-html">🔗 Copy HTML</button>
            <button type="button" className="btn btn-primary" onClick={printLetter} data-testid="cnd-print">🖨️ Print / Save PDF</button>
          </div>
        </div>
        <div style={{border:"1px solid #e5e7eb",borderRadius:8,padding:"1.5rem",background:"#fff",fontFamily:"Georgia,serif",lineHeight:1.6,maxHeight:"70vh",overflow:"auto"}} dangerouslySetInnerHTML={{__html: safeHtml(letter.letter_html)}}/>
      </div>
    )}

    <h2 style={{fontFamily:"Georgia,serif",marginTop:"3rem"}}>Draft History ({drafts.length})</h2>
    {drafts.length === 0 && <p style={{color:"var(--muted)"}}>No drafts yet.</p>}
    <div data-testid="cnd-history">
      {drafts.map(d => (
        <div key={d.id} className="paper" style={{marginBottom:"0.75rem",padding:"0.9rem 1.25rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
          <div style={{flex:"1 1 300px"}}>
            <div style={{fontSize:"0.72rem",letterSpacing:"0.05em",textTransform:"uppercase",color:"var(--muted)"}}>{fmtDate(d.created_at)} · {d.status}</div>
            <div style={{fontWeight:600,marginTop:"0.2rem"}}>{d.copycat_name || d.copycat_url}</div>
            <a href={d.copycat_url} target="_blank" rel="noopener noreferrer" style={{fontSize:"0.85rem",color:"var(--brand-blue)"}}>{d.copycat_url}</a>
          </div>
          <button className="btn btn-ghost" onClick={()=>setLetter({letter_html: d.letter_html, cipo_registration_no: "1247822", id: d.id})} data-testid={`cnd-view-${d.id}`}>View letter</button>
        </div>
      ))}
    </div>
  </AdminShell>;
};


// Wrapper so AdminComingSoon gets its auth headers from the admin context.
const AdminComingSoonWrapper = () => {
  const { headers } = useAdmin();
  return <AdminComingSoon headers={headers}/>;
};

const AdminContentRelationsWrapper = () => {
  const { headers } = useAdmin();
  return <AdminContentRelations headers={headers}/>;
};

const AdminSearchAnalyticsWrapper = () => {
  const { headers } = useAdmin();
  return <AdminSearchAnalytics headers={headers}/>;
};


// ============ Admin Client Journeys — private curated plans ============
// Doug creates a personalized real-estate journey for each client from a
// template (Buying, Selling, Condo/Strata, etc.), curates which modules
// they see + adds notes, then emails a token+OTP link to the client.
// Client-facing view lives at /my-journey/<token>.
const CJ_STATUSES = ["draft","sent","opened","expired","revoked","completed"];
const CJ_STATUS_LABELS = { draft:"Draft", sent:"Sent", opened:"Opened", expired:"Expired", revoked:"Revoked", completed:"Completed" };
const CJ_STATUS_COLORS = { draft:"#6B7280", sent:"#3B82F6", opened:"#8B5CF6", expired:"#F59E0B", revoked:"#DC2626", completed:"#059669" };

const AdminClientJourneys = () => {
  const { headers } = useAdmin();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, by_status: {} });
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      const r = await axios.get(`${API}/admin/client-journeys${q}`, { headers });
      setItems(r.data.items || []);
      setSummary(r.data.summary || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  return (
    <AdminShell active="client-journeys">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
        <h2 style={{margin:0}} data-testid="admin-cj-title">🧭 Client Journey Plans</h2>
        <button className="btn btn-primary" onClick={()=>setShowNew(true)} data-testid="admin-cj-new-btn">+ New Client Journey</button>
      </div>
      <p style={{color:"var(--muted)",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",marginTop:"0.5rem"}}>Private, curated real-estate education plans sent to clients by magic link + 6-digit OTP. Auto-expire after 6 months. Not publicly indexed.</p>

      <div style={{marginTop:"1rem",display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
        <button onClick={()=>setStatusFilter("")} className={statusFilter===""?"btn btn-primary":"btn btn-ghost"} data-testid="admin-cj-filter-all">All ({summary.total || 0})</button>
        {CJ_STATUSES.map(s => (
          <button key={s} onClick={()=>setStatusFilter(s)} className={statusFilter===s?"btn btn-primary":"btn btn-ghost"} data-testid={`admin-cj-filter-${s}`}>
            {CJ_STATUS_LABELS[s]} ({summary.by_status?.[s] || 0})
          </button>
        ))}
      </div>

      {(showNew || editingId) && (
        <ClientJourneyEditor
          editingId={editingId}
          onCreated={(id)=>setEditingId(id)}
          onClose={()=>{ setShowNew(false); setEditingId(null); load(); }}
        />
      )}

      <div style={{marginTop:"1.25rem"}} data-testid="admin-cj-list">
        {loading ? <p>Loading…</p> : items.length === 0 ? <p style={{color:"var(--muted)"}}>No client journeys yet. Click "+ New Client Journey" to create the first one.</p> : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.9rem",fontFamily:"Inter,sans-serif"}}>
              <thead>
                <tr style={{background:"var(--paper)",textAlign:"left"}}>
                  <th style={{padding:"0.65rem"}}>Client</th>
                  <th style={{padding:"0.65rem"}}>Title</th>
                  <th style={{padding:"0.65rem"}}>Status</th>
                  <th style={{padding:"0.65rem"}}>Progress</th>
                  <th style={{padding:"0.65rem"}}>Sent</th>
                  <th style={{padding:"0.65rem"}}>Expires</th>
                  <th style={{padding:"0.65rem"}}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(cj => {
                  const total = (cj.stages || []).reduce((n, s) => n + (s.modules || []).length, 0);
                  const done = (cj.modules_completed || []).length;
                  const pct = total ? Math.round(done/total*100) : 0;
                  return (
                    <tr key={cj.id} style={{borderTop:"1px solid rgba(15,42,91,0.08)"}} data-testid={`admin-cj-row-${cj.id}`}>
                      <td style={{padding:"0.65rem"}}>
                        <div style={{fontWeight:700}}>{cj.client_name}</div>
                        <div style={{fontSize:"0.78rem",color:"var(--muted)"}}>{cj.client_email}</div>
                      </td>
                      <td style={{padding:"0.65rem"}}>{cj.title}</td>
                      <td style={{padding:"0.65rem"}}>
                        <span style={{display:"inline-block",padding:"0.2rem 0.6rem",borderRadius:99,background:CJ_STATUS_COLORS[cj.status]+"22",color:CJ_STATUS_COLORS[cj.status],fontWeight:700,fontSize:"0.75rem"}} data-testid={`admin-cj-status-${cj.id}`}>{CJ_STATUS_LABELS[cj.status]}</span>
                      </td>
                      <td style={{padding:"0.65rem"}}>{done}/{total} · {pct}%</td>
                      <td style={{padding:"0.65rem",fontSize:"0.82rem"}}>{cj.sent_at ? new Date(cj.sent_at).toLocaleDateString("en-CA") : "—"}</td>
                      <td style={{padding:"0.65rem",fontSize:"0.82rem"}}>{cj.expires_at ? cj.expires_at.slice(0,10) : "—"}</td>
                      <td style={{padding:"0.65rem",whiteSpace:"nowrap"}}>
                        <button className="btn btn-ghost" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem"}} onClick={()=>setEditingId(cj.id)} data-testid={`admin-cj-edit-${cj.id}`}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
};

// ---- Editor / creator ----
const ClientJourneyEditor = ({ editingId, onCreated, onClose }) => {
  const { headers } = useAdmin();
  const [cj, setCj] = useState({
    client_name:"", client_email:"", client_phone:"",
    title:"", intro_message:"", base_journey_slug:"",
    stages: [],
    expires_at:"",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [savedFlash, setSavedFlash] = useState("");
  const [tokenInfo, setTokenInfo] = useState(null); // {token, expires_at} once saved

  useEffect(() => {
    if (!editingId) return;
    axios.get(`${API}/admin/client-journeys/${editingId}`, { headers }).then(r => {
      setCj(r.data);
      setTokenInfo({ token: r.data.token, expires_at: r.data.expires_at });
    });
    // eslint-disable-next-line
  }, [editingId]);

  // Apply template to CJ
  const applyTemplate = (slug) => {
    const tpl = JOURNEY_TEMPLATES[slug];
    if (!tpl) return;
    const stages = tpl.stages.map(s => ({
      id: s.id, title_override: null, note: "",
      modules: (s.modules || []).map((m, i) => ({ stage_id: s.id, module_id: m.id, note_override: "", order: i }))
    }));
    setCj({ ...cj, base_journey_slug: slug, title: cj.title || `${cj.client_name || "Client"}'s ${tpl.title} Journey`, stages });
  };

  const toggleModule = (stageId, moduleId) => {
    const newStages = [...cj.stages];
    const s = newStages.find(x => x.id === stageId);
    if (!s) return;
    const exists = s.modules.some(m => m.module_id === moduleId);
    if (exists) {
      s.modules = s.modules.filter(m => m.module_id !== moduleId);
    } else {
      s.modules.push({ stage_id: stageId, module_id: moduleId, note_override: "", order: s.modules.length });
    }
    setCj({ ...cj, stages: newStages });
  };

  const toggleStage = (stageId) => {
    const exists = cj.stages.some(s => s.id === stageId);
    if (exists) {
      setCj({ ...cj, stages: cj.stages.filter(s => s.id !== stageId) });
    } else {
      const tplStage = resolveStage(stageId);
      const modules = (tplStage?.modules || []).map((m, i) => ({ stage_id: stageId, module_id: m.id, note_override: "", order: i }));
      setCj({ ...cj, stages: [...cj.stages, { id: stageId, title_override: null, note: "", modules }] });
    }
  };

  const setStageNote = (stageId, note) => {
    setCj({ ...cj, stages: cj.stages.map(s => s.id === stageId ? { ...s, note } : s) });
  };

  const save = async () => {
    setErr(""); setSavedFlash("");
    if (!cj.client_name || !cj.client_name.trim()) { setErr("Client name is required."); return; }
    if (!cj.client_email || !cj.client_email.trim()) { setErr("Client email is required."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cj.client_email.trim())) { setErr("Please enter a valid email address."); return; }
    setSaving(true);
    try {
      const payload = {
        client_name: cj.client_name.trim(),
        client_email: cj.client_email.trim().toLowerCase(),
        client_phone: cj.client_phone || "",
        title: cj.title.trim() || `${cj.client_name}'s Journey`,
        intro_message: cj.intro_message || "",
        base_journey_slug: cj.base_journey_slug || null,
        stages: cj.stages,
        expires_at: cj.expires_at || null,
      };
      let r;
      if (editingId) {
        r = await axios.patch(`${API}/admin/client-journeys/${editingId}`, {
          client_name: payload.client_name,
          client_email: payload.client_email,
          client_phone: payload.client_phone,
          title: payload.title,
          intro_message: payload.intro_message,
          stages: payload.stages,
        }, { headers });
      } else {
        r = await axios.post(`${API}/admin/client-journeys`, payload, { headers });
      }
      setTokenInfo({ token: r.data.token, expires_at: r.data.expires_at });
      setCj(r.data);
      setSavedFlash(editingId ? "✓ Changes saved" : "✓ Draft created — you can now Send it to the client, or continue editing");
      if (!editingId && r.data.id && onCreated) onCreated(r.data.id);
      setTimeout(()=>setSavedFlash(""), 4000);
      // scroll the token-preview into view
      setTimeout(()=>{ const el = document.querySelector('[data-testid="admin-cj-preview-link"]'); if (el) el.scrollIntoView({behavior:"smooth", block:"center"}); }, 100);
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    } finally { setSaving(false); }
  };

  const send = async () => {
    if (!editingId && !tokenInfo) { setErr("Save first"); return; }
    if (!window.confirm(`Send this journey to ${cj.client_email}? A 6-digit access code will be emailed to them.`)) return;
    setSaving(true); setErr("");
    try {
      const id = editingId || cj.id;
      await axios.post(`${API}/admin/client-journeys/${id}/send`, {}, { headers });
      alert("Sent! The client will receive an email with the access code.");
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    } finally { setSaving(false); }
  };

  const revoke = async () => {
    const id = editingId || cj.id;
    if (!id) return;
    if (!window.confirm("Revoke this journey link? The client will no longer be able to access it.")) return;
    await axios.patch(`${API}/admin/client-journeys/${id}`, { status: "revoked" }, { headers });
    onClose();
  };

  const extend6 = async () => {
    const id = editingId || cj.id;
    if (!id) { setErr("Save the draft first, then you can extend the expiry."); return; }
    const newExp = new Date(Date.now() + 6*30*24*60*60*1000).toISOString();
    await axios.patch(`${API}/admin/client-journeys/${id}`, { expires_at: newExp }, { headers });
    setCj({ ...cj, expires_at: newExp });
    setTokenInfo(tokenInfo ? { ...tokenInfo, expires_at: newExp } : tokenInfo);
    alert(`Expiry extended to ${newExp.slice(0,10)}`);
  };

  const del = async () => {
    const id = editingId || cj.id;
    if (!id) return;
    if (!window.confirm("Delete this journey permanently? This cannot be undone.")) return;
    await axios.delete(`${API}/admin/client-journeys/${id}`, { headers });
    onClose();
  };

  const stageIsIncluded = (id) => cj.stages.some(s => s.id === id);
  const moduleIsIncluded = (stageId, modId) => {
    const s = cj.stages.find(x => x.id === stageId);
    return s?.modules.some(m => m.module_id === modId);
  };
  const stageObj = (id) => cj.stages.find(s => s.id === id);

  return (
    <div className="paper" style={{padding:"1.5rem",marginTop:"1rem",background:"#FBFAF5",border:"2px solid rgba(15,42,91,0.15)"}} data-testid="admin-cj-editor">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"}}>
        <h3 style={{margin:0}}>{editingId ? "Edit client journey" : "New client journey"}</h3>
        <button className="btn btn-ghost" onClick={onClose} data-testid="admin-cj-editor-close">✕ Close</button>
      </div>

      <div className="form-grid">
        <div className="field"><label>Client name *</label><input value={cj.client_name} onChange={e=>setCj({...cj, client_name:e.target.value})} data-testid="admin-cj-client-name"/></div>
        <div className="field"><label>Client email *</label><input type="email" value={cj.client_email} onChange={e=>setCj({...cj, client_email:e.target.value})} data-testid="admin-cj-client-email"/></div>
        <div className="field"><label>Client phone</label><input value={cj.client_phone||""} onChange={e=>setCj({...cj, client_phone:e.target.value})}/></div>
        <div className="field"><label>Plan title</label><input value={cj.title} onChange={e=>setCj({...cj, title:e.target.value})} placeholder="e.g. Sarah's First-Time Buyer Journey" data-testid="admin-cj-title-input"/></div>
      </div>
      <div className="field" style={{marginTop:"0.75rem"}}>
        <label>Intro message to client (shown at top of the journey)</label>
        <textarea rows="3" value={cj.intro_message||""} onChange={e=>setCj({...cj, intro_message:e.target.value})} placeholder="Hi Sarah — here's the plan we discussed. Focus on the Learn and Search stages first…" data-testid="admin-cj-intro"/>
      </div>

      <div style={{marginTop:"1.25rem",padding:"1rem",background:"white",borderRadius:8,border:"1px solid rgba(15,42,91,0.1)"}}>
        <div style={{fontWeight:700,marginBottom:"0.5rem"}}>Start from template (optional)</div>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          {JOURNEY_TEMPLATES_ORDER.map(slug => (
            <button key={slug} type="button" onClick={()=>applyTemplate(slug)}
              className={cj.base_journey_slug===slug ? "btn btn-primary" : "btn btn-ghost"}
              data-testid={`admin-cj-template-${slug}`}
              style={{fontSize:"0.85rem"}}>
              {JOURNEY_TEMPLATES[slug].icon} {JOURNEY_TEMPLATES[slug].title}
            </button>
          ))}
        </div>
        <div style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"0.5rem"}}>Picking a template pre-fills all stages + modules. You can then toggle any off, add notes, or customize before sending.</div>
      </div>

      {cj.stages.length > 0 && (
        <div style={{marginTop:"1.5rem"}}>
          <h4 style={{marginBottom:"0.75rem"}}>Curate stages &amp; modules</h4>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(28rem,1fr))",gap:"1rem"}}>
            {cj.base_journey_slug && JOURNEY_TEMPLATES[cj.base_journey_slug].stages.map(tplStage => {
              const included = stageIsIncluded(tplStage.id);
              return (
                <div key={tplStage.id} className="paper" style={{padding:"1rem",background: included ? "white" : "#F5F0E1", opacity: included ? 1 : 0.7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
                    <div style={{fontWeight:700,color:"var(--brand-navy)"}}>Stage: {tplStage.title}</div>
                    <label style={{fontSize:"0.8rem",display:"flex",alignItems:"center",gap:"0.35rem",cursor:"pointer"}}>
                      <input type="checkbox" checked={included} onChange={()=>toggleStage(tplStage.id)} data-testid={`admin-cj-stage-toggle-${tplStage.id}`}/>
                      Include stage
                    </label>
                  </div>
                  {included && (
                    <>
                      <textarea rows="2" placeholder="Optional note from Doug for this stage…" value={stageObj(tplStage.id)?.note||""}
                        onChange={e=>setStageNote(tplStage.id, e.target.value)}
                        data-testid={`admin-cj-stage-note-${tplStage.id}`}
                        style={{width:"100%",fontSize:"0.85rem",padding:"0.5rem",fontFamily:"Inter,sans-serif",marginBottom:"0.5rem",border:"1px solid rgba(15,42,91,0.15)",borderRadius:6}}/>
                      <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                        {tplStage.modules.map(m => {
                          const on = moduleIsIncluded(tplStage.id, m.id);
                          return (
                            <label key={m.id} style={{fontSize:"0.85rem",display:"flex",gap:"0.4rem",alignItems:"flex-start",cursor:"pointer",padding:"0.3rem 0.4rem",background: on ? "rgba(22,163,74,0.05)" : "transparent",borderRadius:4}}>
                              <input type="checkbox" checked={!!on} onChange={()=>toggleModule(tplStage.id, m.id)} data-testid={`admin-cj-mod-toggle-${tplStage.id}-${m.id}`} style={{marginTop:2}}/>
                              <span><strong>{m.title}</strong> <span style={{color:"var(--muted)",fontSize:"0.78rem"}}>— {m.blurb}</span></span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {err && <div style={{color:"#DC2626",marginTop:"1rem",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",background:"#FEF2F2",padding:"0.75rem 1rem",borderRadius:6,border:"1px solid #FCA5A5"}} data-testid="admin-cj-error">⚠ {err}</div>}
      {savedFlash && <div style={{color:"#059669",marginTop:"1rem",fontFamily:"Inter,sans-serif",fontSize:"0.92rem",background:"#F0FDF4",padding:"0.75rem 1rem",borderRadius:6,border:"1px solid #86EFAC"}} data-testid="admin-cj-saved-flash">{savedFlash}</div>}

      <div style={{marginTop:"1.5rem",display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
        <button className="btn btn-primary" onClick={save} disabled={saving} data-testid="admin-cj-save" style={{opacity: saving ? 0.6 : 1}}>
          {saving ? "Saving…" : (editingId ? "Save changes" : "Create draft")}
        </button>
        {(editingId || tokenInfo) && (
          <>
            <button className="btn btn-primary" onClick={send} disabled={saving} data-testid="admin-cj-send" style={{background:"var(--brand-green)"}}>
              📧 Send to client
            </button>
            <button type="button" className="btn btn-ghost" onClick={extend6} data-testid="admin-cj-extend">+6 months expiry</button>
            <button type="button" className="btn btn-ghost" onClick={revoke} data-testid="admin-cj-revoke" style={{color:"#F59E0B"}}>Revoke link</button>
            <button type="button" className="btn btn-ghost" onClick={del} data-testid="admin-cj-delete" style={{color:"#DC2626"}}>Delete</button>
          </>
        )}
      </div>

      {tokenInfo && (
        <div className="paper" style={{marginTop:"1rem",padding:"0.85rem 1rem",background:"#EDF3FF",fontSize:"0.85rem"}}>
          <div style={{fontWeight:700,marginBottom:"0.25rem"}}>Client preview link (private)</div>
          <a href={`/my-journey/${tokenInfo.token}`} target="_blank" rel="noopener noreferrer" style={{color:"var(--brand-blue)",wordBreak:"break-all"}} data-testid="admin-cj-preview-link">/my-journey/{tokenInfo.token}</a>
          <div style={{color:"var(--muted)",marginTop:"0.35rem",fontSize:"0.78rem"}}>Expires {tokenInfo.expires_at?.slice(0,10)}. Client will need the 6-digit code sent by email.</div>
        </div>
      )}
    </div>
  );
};



// ============ Admin Referrals — Model A tracker ============
// Doug refers consumer leads out to partner REALTORs and earns a 25% referral
// fee at closing under the standard CREA Inter-Board Referral Agreement.
// This mini-CRM tracks the referral lifecycle: sent → acknowledged →
// active → under_contract → closed → paid (or declined/expired).
const REFERRAL_STATUSES = ["sent","acknowledged","active","under_contract","closed","paid","declined","expired"];
const STATUS_LABELS = {
  sent:"Sent", acknowledged:"Acknowledged", active:"Active", under_contract:"Under Contract",
  closed:"Closed", paid:"Paid ✓", declined:"Declined", expired:"Expired"
};
const STATUS_COLORS = {
  sent:"#6B7280", acknowledged:"#3B82F6", active:"#8B5CF6",
  under_contract:"#F59E0B", closed:"#10B981", paid:"#059669",
  declined:"#DC2626", expired:"#9CA3AF"
};
const fmtMoney = (n) => n == null ? "—" : "$" + Number(n).toLocaleString("en-CA", { maximumFractionDigits: 0 });

const AdminReferrals = () => {
  const { headers } = useAdmin();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, by_status: {}, estimated_total_fee: 0, collected_total_fee: 0, pending_total_fee: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newRec, setNewRec] = useState({
    lead_email:"", lead_name:"", lead_phone:"", lead_city:"", lead_property_type:"", lead_budget:"",
    receiving_realtor_name:"", receiving_realtor_email:"", receiving_realtor_brokerage:"", receiving_realtor_board:"",
    referral_fee_pct: 25, estimated_sale_price:"", notes:"", source:"manual"
  });
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState({ status:"", note:"", actual_sale_price:"", referral_fee_amount:"", closed_date:"", paid_date:"" });

  const load = async () => {
    setLoading(true);
    try {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      const r = await axios.get(`${API}/admin/referrals${q}`, { headers });
      setItems(r.data.items || []);
      setSummary(r.data.summary || {});
    } catch (e) { console.error("Failed to load referrals", e); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const create = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newRec, estimated_sale_price: newRec.estimated_sale_price ? Number(newRec.estimated_sale_price) : null, referral_fee_pct: Number(newRec.referral_fee_pct) || 25 };
      await axios.post(`${API}/admin/referrals`, payload, { headers });
      setShowNew(false);
      setNewRec({ lead_email:"", lead_name:"", lead_phone:"", lead_city:"", lead_property_type:"", lead_budget:"", receiving_realtor_name:"", receiving_realtor_email:"", receiving_realtor_brokerage:"", receiving_realtor_board:"", referral_fee_pct:25, estimated_sale_price:"", notes:"", source:"manual" });
      load();
    } catch (e) { alert("Failed to create referral: " + (e.response?.data?.detail || e.message)); }
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setEditStatus({
      status: r.status || "sent", note:"",
      actual_sale_price: r.actual_sale_price ?? "",
      referral_fee_amount: r.referral_fee_amount ?? "",
      closed_date: r.closed_date || "",
      paid_date: r.paid_date || "",
    });
  };

  const submitStatus = async () => {
    try {
      const payload = {
        status: editStatus.status,
        note: editStatus.note,
        actual_sale_price: editStatus.actual_sale_price ? Number(editStatus.actual_sale_price) : null,
        referral_fee_amount: editStatus.referral_fee_amount ? Number(editStatus.referral_fee_amount) : null,
        closed_date: editStatus.closed_date || null,
        paid_date: editStatus.paid_date || null,
      };
      await axios.patch(`${API}/admin/referrals/${editingId}`, payload, { headers });
      setEditingId(null);
      load();
    } catch (e) { alert("Failed to update: " + (e.response?.data?.detail || e.message)); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this referral record permanently?")) return;
    try { await axios.delete(`${API}/admin/referrals/${id}`, { headers }); load(); }
    catch (e) { alert("Delete failed: " + (e.response?.data?.detail || e.message)); }
  };

  return (
    <AdminShell active="referrals">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem"}}>
        <h2 style={{margin:0}} data-testid="admin-referrals-title">💰 Referral Network Tracker</h2>
        <button className="btn btn-primary" onClick={()=>setShowNew(v=>!v)} data-testid="admin-referrals-new-btn">+ New Referral</button>
      </div>
      <p style={{color:"var(--muted)",fontFamily:"Inter,sans-serif",fontSize:"0.9rem",marginTop:"0.5rem"}}>Model A referrals — Doug refers a lead to a REALTOR® in another market and earns a fee at closing under the CREA Inter-Board Referral Agreement.</p>

      <div className="grid-4" data-testid="admin-referrals-summary" style={{gap:"0.75rem",marginTop:"1rem"}}>
        <div className="paper" style={{padding:"1rem"}} data-testid="admin-referrals-summary-total">
          <div style={{fontSize:"0.75rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>Total Referrals</div>
          <div style={{fontSize:"1.5rem",fontWeight:700,color:"var(--brand-navy)"}} data-testid="admin-referrals-total">{summary.total}</div>
        </div>
        <div className="paper" style={{padding:"1rem"}} data-testid="admin-referrals-summary-pipeline">
          <div style={{fontSize:"0.75rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>Estimated Pipeline Fee</div>
          <div style={{fontSize:"1.5rem",fontWeight:700,color:"var(--brand-blue)"}} data-testid="admin-referrals-pipeline">{fmtMoney(summary.estimated_total_fee)}</div>
        </div>
        <div className="paper" style={{padding:"1rem"}} data-testid="admin-referrals-summary-pending">
          <div style={{fontSize:"0.75rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>Pending (Closed, unpaid)</div>
          <div style={{fontSize:"1.5rem",fontWeight:700,color:"#F59E0B"}} data-testid="admin-referrals-pending">{fmtMoney(summary.pending_total_fee)}</div>
        </div>
        <div className="paper" style={{padding:"1rem"}} data-testid="admin-referrals-summary-collected">
          <div style={{fontSize:"0.75rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>Collected (Paid)</div>
          <div style={{fontSize:"1.5rem",fontWeight:700,color:"#059669"}} data-testid="admin-referrals-collected">{fmtMoney(summary.collected_total_fee)}</div>
        </div>
      </div>

      <div style={{marginTop:"1.25rem",display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
        <button onClick={()=>setStatusFilter("")} className={statusFilter===""?"btn btn-primary":"btn btn-ghost"} data-testid="admin-referrals-filter-all">All</button>
        {REFERRAL_STATUSES.map(s => (
          <button key={s} onClick={()=>setStatusFilter(s)} className={statusFilter===s?"btn btn-primary":"btn btn-ghost"} data-testid={`admin-referrals-filter-${s}`}>
            {STATUS_LABELS[s]} ({summary.by_status?.[s] || 0})
          </button>
        ))}
      </div>

      {showNew && (
        <form onSubmit={create} className="paper" style={{padding:"1.25rem",marginTop:"1rem"}} data-testid="admin-referrals-new-form">
          <h3 style={{marginTop:0}}>Create Referral</h3>
          <div className="form-grid">
            <div className="field"><label>Lead name</label><input value={newRec.lead_name} onChange={e=>setNewRec({...newRec, lead_name:e.target.value})} data-testid="admin-referral-lead-name"/></div>
            <div className="field"><label>Lead email *</label><input required type="email" value={newRec.lead_email} onChange={e=>setNewRec({...newRec, lead_email:e.target.value})} data-testid="admin-referral-lead-email"/></div>
            <div className="field"><label>Lead phone</label><input value={newRec.lead_phone} onChange={e=>setNewRec({...newRec, lead_phone:e.target.value})}/></div>
            <div className="field"><label>City / Region</label><input value={newRec.lead_city} onChange={e=>setNewRec({...newRec, lead_city:e.target.value})} data-testid="admin-referral-city"/></div>
            <div className="field"><label>Property type</label><input value={newRec.lead_property_type} onChange={e=>setNewRec({...newRec, lead_property_type:e.target.value})}/></div>
            <div className="field"><label>Budget</label><input value={newRec.lead_budget} onChange={e=>setNewRec({...newRec, lead_budget:e.target.value})}/></div>
            <div className="field"><label>Est. sale price ($)</label><input type="number" value={newRec.estimated_sale_price} onChange={e=>setNewRec({...newRec, estimated_sale_price:e.target.value})} data-testid="admin-referral-est-price"/></div>
            <div className="field"><label>Referral fee %</label><input type="number" step="0.5" value={newRec.referral_fee_pct} onChange={e=>setNewRec({...newRec, referral_fee_pct:e.target.value})}/></div>
          </div>
          <h4 style={{marginTop:"1.25rem",marginBottom:"0.5rem"}}>Receiving REALTOR®</h4>
          <div className="form-grid">
            <div className="field"><label>Name</label><input value={newRec.receiving_realtor_name} onChange={e=>setNewRec({...newRec, receiving_realtor_name:e.target.value})} data-testid="admin-referral-realtor-name"/></div>
            <div className="field"><label>Email</label><input type="email" value={newRec.receiving_realtor_email} onChange={e=>setNewRec({...newRec, receiving_realtor_email:e.target.value})}/></div>
            <div className="field"><label>Brokerage</label><input value={newRec.receiving_realtor_brokerage} onChange={e=>setNewRec({...newRec, receiving_realtor_brokerage:e.target.value})}/></div>
            <div className="field"><label>Board</label><input value={newRec.receiving_realtor_board} onChange={e=>setNewRec({...newRec, receiving_realtor_board:e.target.value})} placeholder="e.g. VIREB, Okanagan Mainline, CREA-only"/></div>
          </div>
          <div className="field" style={{marginTop:"1rem"}}><label>Notes</label><textarea rows="3" value={newRec.notes} onChange={e=>setNewRec({...newRec, notes:e.target.value})}/></div>
          <div style={{marginTop:"1rem",display:"flex",gap:"0.5rem"}}>
            <button type="submit" className="btn btn-primary" data-testid="admin-referral-create-submit">Create Referral</button>
            <button type="button" className="btn btn-ghost" onClick={()=>setShowNew(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{marginTop:"1.25rem"}} data-testid="admin-referrals-list">
        {loading ? <p>Loading…</p> : items.length === 0 ? <p style={{color:"var(--muted)"}}>No referral records{statusFilter ? ` with status "${STATUS_LABELS[statusFilter]}"` : ""} yet.</p> : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.9rem",fontFamily:"Inter,sans-serif"}}>
              <thead>
                <tr style={{background:"var(--paper)",textAlign:"left"}}>
                  <th style={{padding:"0.65rem"}}>Date</th>
                  <th style={{padding:"0.65rem"}}>Lead</th>
                  <th style={{padding:"0.65rem"}}>Location</th>
                  <th style={{padding:"0.65rem"}}>Receiving REALTOR®</th>
                  <th style={{padding:"0.65rem"}}>Est. Price</th>
                  <th style={{padding:"0.65rem"}}>Est. Fee</th>
                  <th style={{padding:"0.65rem"}}>Status</th>
                  <th style={{padding:"0.65rem"}}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => {
                  const estFee = (r.estimated_sale_price || 0) * (r.referral_fee_pct || 25) / 100;
                  return (
                    <tr key={r.id} style={{borderTop:"1px solid rgba(15,42,91,0.08)"}} data-testid={`admin-referral-row-${r.id}`}>
                      <td style={{padding:"0.65rem",whiteSpace:"nowrap"}}>{new Date(r.created_at).toLocaleDateString("en-CA")}</td>
                      <td style={{padding:"0.65rem"}}>
                        <div style={{fontWeight:700}}>{r.lead_name || r.lead_email}</div>
                        <div style={{fontSize:"0.78rem",color:"var(--muted)"}}>{r.lead_email}{r.lead_phone ? " · " + r.lead_phone : ""}</div>
                      </td>
                      <td style={{padding:"0.65rem"}}>{r.lead_city || "—"}{r.lead_property_type ? <div style={{fontSize:"0.78rem",color:"var(--muted)"}}>{r.lead_property_type}</div> : null}</td>
                      <td style={{padding:"0.65rem"}}>{r.receiving_realtor_name || "—"}{r.receiving_realtor_brokerage ? <div style={{fontSize:"0.78rem",color:"var(--muted)"}}>{r.receiving_realtor_brokerage}</div> : null}</td>
                      <td style={{padding:"0.65rem"}}>{fmtMoney(r.actual_sale_price || r.estimated_sale_price)}</td>
                      <td style={{padding:"0.65rem"}}>{fmtMoney(r.referral_fee_amount || estFee)}</td>
                      <td style={{padding:"0.65rem"}}>
                        <span style={{display:"inline-block",padding:"0.2rem 0.6rem",borderRadius:99,background:STATUS_COLORS[r.status]+"22",color:STATUS_COLORS[r.status],fontWeight:700,fontSize:"0.75rem"}} data-testid={`admin-referral-status-${r.id}`}>{STATUS_LABELS[r.status] || r.status}</span>
                      </td>
                      <td style={{padding:"0.65rem",whiteSpace:"nowrap"}}>
                        <button className="btn btn-ghost" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem"}} onClick={()=>openEdit(r)} data-testid={`admin-referral-edit-${r.id}`}>Update</button>
                        <button className="btn btn-ghost" style={{padding:"0.35rem 0.7rem",fontSize:"0.8rem",color:"#DC2626"}} onClick={()=>del(r.id)} data-testid={`admin-referral-delete-${r.id}`}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingId && (
        <div className="paper" style={{padding:"1.25rem",marginTop:"1rem",background:"#FFF8E1",border:"1px solid rgba(253,184,19,0.4)"}} data-testid="admin-referral-edit-panel">
          <h3 style={{marginTop:0}}>Update referral status</h3>
          <div className="form-grid">
            <div className="field"><label>New status</label>
              <select value={editStatus.status} onChange={e=>setEditStatus({...editStatus, status:e.target.value})} data-testid="admin-referral-status-select">
                {REFERRAL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="field"><label>Actual sale price ($)</label><input type="number" value={editStatus.actual_sale_price} onChange={e=>setEditStatus({...editStatus, actual_sale_price:e.target.value})} data-testid="admin-referral-actual-price"/></div>
            <div className="field"><label>Referral fee received ($)</label><input type="number" value={editStatus.referral_fee_amount} onChange={e=>setEditStatus({...editStatus, referral_fee_amount:e.target.value})} data-testid="admin-referral-fee-amount"/></div>
            <div className="field"><label>Closed date</label><input type="date" value={editStatus.closed_date} onChange={e=>setEditStatus({...editStatus, closed_date:e.target.value})}/></div>
            <div className="field"><label>Paid date</label><input type="date" value={editStatus.paid_date} onChange={e=>setEditStatus({...editStatus, paid_date:e.target.value})}/></div>
          </div>
          <div className="field" style={{marginTop:"0.75rem"}}><label>Note (added to history)</label><input value={editStatus.note} onChange={e=>setEditStatus({...editStatus, note:e.target.value})} data-testid="admin-referral-note"/></div>
          <div style={{marginTop:"1rem",display:"flex",gap:"0.5rem"}}>
            <button className="btn btn-primary" onClick={submitStatus} data-testid="admin-referral-status-save">Save Update</button>
            <button className="btn btn-ghost" onClick={()=>setEditingId(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="notice" style={{marginTop:"2rem",background:"#F0F4FB",fontFamily:"Inter,sans-serif",fontSize:"0.85rem"}}>
        <strong>Model A referral notes:</strong> Referrals are typically documented on a CREA Inter-Board Referral Agreement (or equivalent province-to-province agreement). The receiving REALTOR® pays the referral fee to Doug's brokerage at closing. All referral disclosures are made to the consumer at the time of introduction — no undisclosed referral fees are ever accepted.
      </div>
    </AdminShell>
  );
};



// --- Public buyer/seller guides removed. Visitors hitting /buying-guide or
// /selling-guide are redirected straight to the buyer/seller intake form
// (see <Route> definitions below). The full guide content now lives ONLY
// inside the token-gated Client Journey at /my-journey/:token.



function App() {
  return (<BrowserRouter>
    <Routes>
      {/* Home page is now the new dashboard mockup shell (Feb 4, 2026 promotion).
          The previous Visual-Agent-based home page is preserved at /classic-home
          for reference or quick rollback via a single-line route swap. */}
      <Route path="/" element={<DashboardMockup/>}/>
      <Route path="/preview-dashboard" element={<DashboardMockup homeVariant="dashboard"/>}/>
      <Route path="/classic-home" element={<AppLayout><HomeSchema/><Home/><Canary phrase={CANARY_HOME} testId="canary-home"/></AppLayout>}/>
      <Route path="/listings" element={<AppLayout><Listings/></AppLayout>}/>
      <Route path="/listing/:key" element={<AppLayout><ListingDetail/></AppLayout>}/>
      {/* Alias — the dashboard ListingCard + shared URLs use the plural form. */}
      <Route path="/listings/:key" element={<AppLayout><ListingDetail/></AppLayout>}/>
      <Route path="/communities" element={<AppLayout><Communities/></AppLayout>}/>
      {/* Legacy split slugs — merged into unified 'north-vancouver' page */}
      <Route path="/community/north-vancouver-city" element={<Navigate to="/community/north-vancouver" replace/>}/>
      <Route path="/community/north-vancouver-district" element={<Navigate to="/community/north-vancouver" replace/>}/>
      {/* Legacy split slugs — merged into unified 'langley' page */}
      <Route path="/community/langley-city" element={<Navigate to="/community/langley" replace/>}/>
      <Route path="/community/langley-township" element={<Navigate to="/community/langley" replace/>}/>
      <Route path="/community/:slug" element={<AppLayout><CommunityPage/><Canary phrase={CANARY_COMMUNITY} testId="canary-community"/></AppLayout>}/>
      <Route path="/community/:slug/n/:nSlug" element={<AppLayout><NeighbourhoodPage/><Canary phrase={CANARY_COMMUNITY} testId="canary-neighbourhood"/></AppLayout>}/>
      <Route path="/community/:slug/zoning" element={<AppLayout><CommunityZoning/></AppLayout>}/>
      <Route path="/neighbourhoods" element={<AppLayout><Communities/></AppLayout>}/>
      <Route path="/neighbourhood/:slug" element={<AppLayout><CommunityPage/><Canary phrase={CANARY_COMMUNITY} testId="canary-neighbourhood-legacy"/></AppLayout>}/>
      <Route path="/regions" element={<AppLayout><RegionsIndex/></AppLayout>}/>
      <Route path="/regions/:slug" element={<AppLayout><RegionPage/></AppLayout>}/>
      <Route path="/specialties" element={<AppLayout><SpecialtiesIndex/></AppLayout>}/>
      <Route path="/specialties/:slug" element={<AppLayout><SpecialtyPage/></AppLayout>}/>
      <Route path="/glossary" element={<AppLayout><GlossaryWithCanary/></AppLayout>}/>
      <Route path="/glossary/:slug" element={<AppLayout><GlossaryTerm/></AppLayout>}/>
      <Route path="/buyer" element={<AppLayout><BuyerForm/></AppLayout>}/>
      <Route path="/seller" element={<AppLayout><SellerForm/></AppLayout>}/>
      <Route path="/buying-guide" element={<Navigate to="/buyer" replace/>}/>
      <Route path="/selling-guide" element={<Navigate to="/seller" replace/>}/>
      <Route path="/search" element={<AppLayout><SearchPage/></AppLayout>}/>
      <Route path="/valuation" element={<AppLayout><Valuation/></AppLayout>}/>
      <Route path="/referral-request" element={<AppLayout><ReferralRequest/></AppLayout>}/>
      <Route path="/realtors" element={<Navigate to="/realtor-network" replace/>}/>
      <Route path="/realtors-outofprovince" element={<Navigate to="/realtor-network" replace/>}/>
      <Route path="/realtor-network" element={<AppLayout><RealtorNetwork/></AppLayout>}/>
      <Route path="/realtors/credentials/:id" element={<AppLayout><RealtorCredentials/></AppLayout>}/>
      <Route path="/about" element={<AppLayout><About/></AppLayout>}/>
      <Route path="/contact" element={<AppLayout><Contact/></AppLayout>}/>
      <Route path="/privacy" element={<AppLayout><Privacy/></AppLayout>}/>
      <Route path="/copyright" element={<AppLayout><CopyrightPage/></AppLayout>}/>
      <Route path="/ai-use" element={<AppLayout><AiUsePage/></AppLayout>}/>
      <Route path="/my-journey/:token" element={<MyJourney/>}/>
      <Route path="/visual-agent-demo" element={<VisualAgentDemo/>}/>
      <Route path="/dashboard-mockup" element={<DashboardMockup/>}/>
      <Route path="/preview/coming-soon" element={<AppLayout><section className="section" style={{padding:0}}><ComingSoonHero mode="preview"/></section></AppLayout>}/>
      <Route path="/privacy/data-request" element={<AppLayout><DataRequest/></AppLayout>}/>
      <Route path="/favorites" element={<AppLayout><Favorites/></AppLayout>}/>
      <Route path="/terms" element={<AppLayout><Terms/></AppLayout>}/>
      <Route path="/compliance" element={<AppLayout><Compliance/></AppLayout>}/>
      <Route path="/complaints" element={<AppLayout><Complaints/></AppLayout>}/>
      <Route path="/dorts" element={<AppLayout><DoRTS/></AppLayout>}/>
      <Route path="/relocating" element={<AppLayout><Relocating/></AppLayout>}/>
      {/* /beta legacy page removed for launch — redirect to home */}
      <Route path="/beta" element={<Navigate to="/" replace/>}/>
      <Route path="/legal/retention" element={<AppLayout><RetentionPolicy/></AppLayout>}/>
      <Route path="/code-of-ethics" element={<AppLayout><CodeOfEthics/></AppLayout>}/>
      <Route path="/data-attribution" element={<AppLayout><DataAttribution/></AppLayout>}/>
      <Route path="/unsubscribe" element={<AppLayout><Unsubscribe/></AppLayout>}/>
      <Route path="/email-preferences" element={<AppLayout><EmailPreferences/></AppLayout>}/>
      <Route path="/breach-policy" element={<AppLayout><BreachPolicy/></AppLayout>}/>
      <Route path="/admin/login" element={<AdminLogin/>}/>
      <Route path="/admin" element={<AdminDash/>}/>
      <Route path="/admin/growth" element={<AdminGrowth/>}/>
      <Route path="/admin/client-journeys" element={<AdminClientJourneys/>}/>
      <Route path="/admin/coming-soon" element={<AdminShell active="coming-soon"><AdminComingSoonWrapper/></AdminShell>}/>
      <Route path="/admin/relations" element={<AdminShell active="relations"><AdminContentRelationsWrapper/></AdminShell>}/>
      <Route path="/admin/search-analytics" element={<AdminShell active="search-analytics"><AdminSearchAnalyticsWrapper/></AdminShell>}/>
      <Route path="/admin/referrals" element={<AdminReferrals/>}/>
      <Route path="/admin/buyers" element={<AdminList title="Buyer Leads" url="/admin/leads/buyer" active="buyers" exportKind="buyer" cols={[["created_at","Date"],["full_name","Name"],["email","Email"],["phone","Phone"],["property_type","Type"],["budget_range","Budget"],["timeline","Timeline"],["working_with_realtor","W/ REALTOR®?"]]}/>}/>
      <Route path="/admin/sellers" element={<AdminList title="Seller Leads" url="/admin/leads/seller" active="sellers" exportKind="seller" cols={[["created_at","Date"],["full_name","Name"],["email","Email"],["city","City"],["property_type","Type"],["timeline","Timeline"],["estimated_value","Value"]]}/>}/>
      <Route path="/admin/lead-triage" element={<AdminLeadTriage AdminShell={AdminShell}/>}/>
      <Route path="/admin/realtors" element={<AdminList title="REALTOR® Applications" url="/admin/realtors" active="realtors" cols={[["created_at","Date"],["full_name","Name"],["email","Email"],["brokerage","Brokerage"],["realtor_number","REALTOR® #"],["stage","Stage"],["status","Status"]]}/>}/>
      <Route path="/admin/clients" element={<AdminClients/>}/>
      <Route path="/admin/reminders" element={<AdminReminders/>}/>
      <Route path="/admin/reminder-templates" element={<AdminReminderTemplates/>}/>
      <Route path="/admin/email-log" element={<AdminEmailLog/>}/>
      <Route path="/admin/consultations" element={<AdminConsultations/>}/>
      <Route path="/admin/reel-analytics" element={<AdminReelAnalytics/>}/>
      <Route path="/admin/email-outbox" element={<AdminEmailOutbox/>}/>
      <Route path="/admin/saved-searches" element={<AdminSavedSearches/>}/>
      <Route path="/admin/settings/reset" element={<AdminReset/>}/>
      <Route path="/admin/settings/password" element={<AdminChangePassword/>}/>
      <Route path="/admin/approvals" element={<AdminApprovals/>}/>
      <Route path="/admin/chats" element={<AdminChats/>}/>
      <Route path="/admin/feedback" element={<AdminFeedback/>}/>
      <Route path="/admin/faq-audit" element={<AdminFaqAudit/>}/>
      <Route path="/admin/definition-audit" element={<AdminDefinitionAudit/>}/>
      <Route path="/admin/policies" element={<AdminPolicies/>}/>
      <Route path="/admin/snapshots" element={<AdminSnapshots/>}/>
      <Route path="/admin/campaigns" element={<AdminCampaigns/>}/>
      <Route path="/admin/copycat-detector" element={<AdminCopycatDetector/>}/>
      <Route path="/admin/cease-desist" element={<AdminCeaseDesist/>}/>
    </Routes>
  </BrowserRouter>);
}

export default App;
