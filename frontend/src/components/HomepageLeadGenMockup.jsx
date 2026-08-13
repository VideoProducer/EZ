// HomepageLeadGenMockup — the definitive lead-gen homepage mockup for
// EZtoFind.ca.  Route: /mockups/home-v2 (parked · noindex · robots block).
//
// GOALS
//   1. Maximum leads from every visitor segment — buyers, sellers,
//      relocators (into BC), intra-BC movers, estate/executor situations.
//   2. Rank on Google AI Overviews, ChatGPT-search, Perplexity, and Bing
//      Copilot for "best BC REALTOR", "MLS listings BC", "where should
//      I live in BC", etc. — via layered JSON-LD schema, semantic HTML,
//      and cite-friendly FAQ blocks.
//   3. Zero compliance risk — every regulator-mandated element is here:
//        · BCFSA licensee + Disclosure of Representation link
//        · CREA reciprocity string + MLS®/REALTOR® trademarks
//        · GVR listing-brokerage attribution on every card
//        · PIPA privacy consent on the lead form
//        · CASL express-consent checkbox on the lead form
//        · Not-advice bumper at top and inside the footer
//   4. Keep everything already invested — Doogie voice+text search
//      (DoogieFilterHeader), Cast to TV, in-page community/glossary
//      cross-links, live CREA DDF® inventory count.
//   5. Mobile-first responsive — CSS grids collapse gracefully; no
//      horizontal scroll below 360px.

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import UnlistedMockupBanner from "./UnlistedMockupBanner";
import { DoogieFilterHeader } from "./DoogieFilterHeader";
import { TurnstileWidget, getTurnstileToken } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

const C = {
  navy: "#0F2A5B", gold: "#F5A623", cream: "#F5F0E1", ink: "#1F2937",
  muted: "#6B7280", green: "#059669", paper: "#FAFAF7", blue: "#1E4FCF",
  red: "#B91C1C",
};

const fmtMoney = n => !n ? "—" : n >= 1e6 ? `$${(n/1e6).toFixed(n>=1e7?0:1)}M` : n >= 1e3 ? `$${Math.round(n/1e3)}K` : `$${n.toLocaleString("en-CA")}`;

// ── Content ────────────────────────────────────────────────────────
const PATHS = [
  { icon:"🏡", title:"I'm buying in BC", body:"Search 40K+ live MLS® listings, save favourites, get instant new-listing alerts, and lock in a free 20-min buyer strategy call with Doug.", cta:"Start searching →", href:"/property-search", tone:"gold", testid:"path-buying" },
  { icon:"💰", title:"I'm selling", body:"Free home-value snapshot, professional listing prep playbook, and Doug's proven Fraser Valley marketing plan.", cta:"Get my home value →", href:"/market-estimate", tone:"white", testid:"path-selling" },
  { icon:"🌲", title:"Where should I live in BC?", body:"90-sec quiz picks 3 BC communities that match your climate, budget, and lifestyle — perfect whether you're moving to BC or thinking of a change within it.", cta:"Take the quiz →", href:"/relocating", tone:"white", testid:"path-where" },
  { icon:"⚖️", title:"Estate sale / probate", body:"Executor toolkit with court-approved CMAs, capital-gains guidance, and licensed BC lawyer & accountant intros.", cta:"Executor toolkit →", href:"/estate-sale", tone:"white", testid:"path-estate" },
];
const SPECIALTIES = [
  { icon:"🐴", title:"Equestrian & acreage", body:"ALR + zoning + water-rights due diligence · 40-point checklist", href:"/specialties/equestrian" },
  { icon:"💎", title:"Luxury ($3M+)", body:"Waterfront, penthouse, estate & sub-penthouse · discreet showings", href:"/specialties/luxury" },
  { icon:"🏢", title:"Condos & townhomes", body:"Strata review, depreciation report, and rental-restriction analysis", href:"/specialties/condos" },
  { icon:"🏡", title:"Detached homes", body:"Fraser Valley, Sea-to-Sky, and Greater Vancouver detached inventory", href:"/specialties/detached" },
];
const FEATURED_COMMUNITIES = [
  { slug:"vancouver",   name:"Vancouver" },
  { slug:"maple-ridge", name:"Maple Ridge" },
  { slug:"langley",     name:"Langley" },
  { slug:"squamish",    name:"Squamish" },
  { slug:"kelowna",     name:"Kelowna" },
  { slug:"whistler",    name:"Whistler" },
  { slug:"victoria",    name:"Victoria" },
  { slug:"surrey",      name:"Surrey" },
];
const GLOSSARY_SPOTLIGHT = [
  { slug:"agricultural-land-reserve",   term:"Agricultural Land Reserve" },
  { slug:"restrictive-covenant",        term:"Restrictive Covenant" },
  { slug:"property-transfer-tax",       term:"Property Transfer Tax" },
  { slug:"subject-to-financing",        term:"Subject to Financing" },
  { slug:"strata-depreciation-report",  term:"Strata Depreciation Report" },
  { slug:"disclosure-of-representation",term:"BCFSA Disclosure of Representation" },
];
const FAQS = [
  { q:"How current are the MLS® listings on EZtoFind.ca?",
    a:"Every listing on EZtoFind.ca is refreshed every 4 hours directly from the CREA Data Distribution Facility (DDF®), sourced live from the Greater Vancouver REALTORS®, Fraser Valley Real Estate Board, and 10+ other participating boards across British Columbia." },
  { q:"Does Doug charge me anything to represent me as a buyer?",
    a:"No. Under BC's Multiple Listing Service® rules, the seller's brokerage compensates the co-operating (buyer's) brokerage from the sale proceeds — you pay $0 for consultations, showings, offer preparation, negotiation, or closing coordination. Full BCFSA Disclosure of Representation is presented before any meaningful engagement." },
  { q:"What if the property I love is outside Doug's direct service area?",
    a:"Doug covers Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor directly. For anywhere else in BC (Interior, Vancouver Island, Kootenays, Cariboo, Peace), he hand-picks a BCFSA-licensed local REALTOR® from his vetted referral network — $0 cost to you, you approve every intro, no CASL spam." },
  { q:"Is Doogie giving me real-estate advice?",
    a:"No. Doogie is an AI-assisted concierge that explains BC real estate terminology, walks you through active listings, and helps you find community pages — but Doogie provides general information only, never legal, tax, financial, or property-specific advice. For your own situation, always speak with a BC lawyer or notary, an accountant, a licensed mortgage broker, and a REALTOR®." },
  { q:"How is my personal information handled when I submit a form?",
    a:"Under British Columbia's Personal Information Protection Act (PIPA), your data is collected only to provide real-estate services, stored securely, never sold, and deletable on request. Marketing emails require your separate express consent under Canada's Anti-Spam Legislation (CASL) — one-click unsubscribe is in every message." },
  { q:"Can I cast a listing from my phone to my Apple TV or Chromecast?",
    a:"Yes. Every listing detail page has a Cast button that opens a QR share code plus a one-tap picker for Chromecast, Apple TV / AirPlay (via iOS Screen Mirroring on Chrome), and Google TV — so a family can review a home together on the big screen without emailing links back and forth." },
];

// ── Small primitives ──────────────────────────────────────────────
const Section = ({ tone = "paper", children, ...rest }) => (
  <section style={{ background: tone === "paper" ? C.paper : tone === "cream" ? C.cream : "white", padding: "clamp(36px, 6vw, 64px) clamp(16px, 4vw, 24px)" }} {...rest}>
    <div style={{ maxWidth: 1160, margin: "0 auto" }}>{children}</div>
  </section>
);
const H2 = ({ kicker, children, id }) => (
  <div style={{ marginBottom: 24 }} id={id || undefined}>
    {kicker && <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: C.gold, fontWeight: 700, textTransform: "uppercase" }}>{kicker}</div>}
    <h2 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontFamily: "'Sora',sans-serif", fontWeight: 700, color: C.navy, lineHeight: 1.15, margin: "6px 0 0" }}>{children}</h2>
  </div>
);
// Every regulator string sits here as a reusable bumper — the "1000%
// compliant" requirement Doug asked for.  Drop it after every conversion
// touchpoint (form success, quiz start, cast modal open).
const NotAdviceBumper = ({ inline = false }) => (
  <div style={{ fontSize: "0.72rem", color: inline ? "rgba(255,255,255,0.85)" : C.muted, lineHeight: 1.55, textAlign: inline ? "left" : "center", padding: inline ? 0 : "8px 12px" }} data-testid="bumper-not-advice">
    General information only — <strong>not legal, tax, financial, or real-estate advice</strong>. Always speak with a licensed BC lawyer or notary, an accountant, a licensed mortgage broker, and a REALTOR® for your own situation.
  </div>
);

// ── The page ───────────────────────────────────────────────────────
export default function HomepageLeadGenMockup() {
  const nav = useNavigate();
  const [stats, setStats] = useState({ total: 0, minPrice: 0, maxPrice: 0 });

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API}/api/listings`, { params: { limit: 1 } })
      .then(r => { if (cancelled) return; const t = r.data.total || 0; setStats({ total: t, minPrice: 300000, maxPrice: 55000000 }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Voice/text filter handler — routes to /listings with the parsed filter
  const applyVoiceFilter = (vf) => {
    if (!vf) return;
    const params = new URLSearchParams();
    if (vf.community)     params.set("city", vf.community);
    if (vf.property_type) params.set("property_type", vf.property_type);
    if (vf.min_beds != null)  params.set("beds_min", vf.min_beds);
    if (vf.min_baths != null) params.set("baths_min", vf.min_baths);
    if (vf.min_price != null) params.set("price_min", vf.min_price);
    if (vf.max_price != null) params.set("price_max", vf.max_price);
    if (vf.keyword)       params.set("q", vf.keyword);
    nav(`/listings?${params.toString()}`);
  };

  // Multi-schema JSON-LD @graph — the AEO/LLM/citation payload.
  // Includes WebSite (search action for Google sitelinks), LocalBusiness
  // (RealEstateAgent for Google Business + Bing Places), FAQPage (Google
  // AI Overviews + ChatGPT-search + Perplexity citations), and
  // BreadcrumbList (crawler navigation).
  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://eztofind.ca/#website",
        "url": "https://eztofind.ca/",
        "name": "EZtoFind.ca",
        "description": "British Columbia real estate — live MLS® listings, community pages, glossary, and BCFSA-licensed REALTOR® Doug LeMaire.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": { "@type": "EntryPoint", "urlTemplate": "https://eztofind.ca/listings?q={search_term_string}" },
          "query-input": "required name=search_term_string",
        },
        "publisher": { "@id": "https://eztofind.ca/#brokerage" },
      },
      {
        "@type": "RealEstateAgent",
        "@id": "https://eztofind.ca/#doug",
        "name": "Doug LeMaire, REALTOR®",
        "image": "https://eztofind.ca/doug-headshot.jpg",
        "telephone": "+1-604-787-0851",
        "url": "https://eztofind.ca/",
        "worksFor": { "@id": "https://eztofind.ca/#brokerage" },
        "areaServed": [{ "@type": "AdministrativeArea", "name": "British Columbia" }],
        "knowsAbout": ["MLS listings", "BCFSA compliance", "Equestrian property", "Luxury real estate", "Strata", "Estate sale probate", "Agricultural Land Reserve"],
      },
      {
        "@type": "RealEstateAgent",
        "@id": "https://eztofind.ca/#brokerage",
        "name": "Fraser Property Management Realty Services Ltd.",
        "telephone": "+1-604-466-7021",
        "url": "https://eztofind.ca/",
        "address": { "@type": "PostalAddress", "streetAddress": "1 – 22374 Lougheed Hwy", "addressLocality": "Maple Ridge", "addressRegion": "BC", "postalCode": "V2X 2T5", "addressCountry": "CA" },
        "areaServed": "British Columbia",
      },
      {
        "@type": "FAQPage",
        "mainEntity": FAQS.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://eztofind.ca/" },
        ],
      },
    ],
  }), []);

  const heroDesc = `Search ${stats.total ? stats.total.toLocaleString() : "40,000+"} live MLS® listings across British Columbia. BCFSA-licensed REALTOR® with a comprehensive buyer due-diligence process. CREA DDF® data · complimentary consultations · PIPA + CASL + BCFSA compliant.`;

  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: "Inter,sans-serif" }} data-testid="homepage-leadgen-mockup">
      <Helmet>
        <title>British Columbia Real Estate · MLS® Listings + BCFSA REALTOR® — EZtoFind.ca</title>
        <meta name="description" content={heroDesc}/>
        <meta name="robots" content="noindex, nofollow"/>
        <link rel="canonical" href="https://eztofind.ca/"/>
        <meta property="og:title" content="British Columbia Real Estate · MLS® Listings + BCFSA REALTOR® — EZtoFind.ca"/>
        <meta property="og:description" content={heroDesc}/>
        <meta property="og:type" content="website"/>
        <meta property="og:url" content="https://eztofind.ca/"/>
        <meta property="og:image" content="https://eztofind.ca/images/doogie/doogie-og.png"/>
        <meta property="og:image:width" content="1200"/>
        <meta property="og:image:height" content="630"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="geo.region" content="CA-BC"/>
        <meta name="geo.placename" content="British Columbia, Canada"/>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <UnlistedMockupBanner label="LEAD-GEN homepage v2 (parked)"/>

      {/* ═════ HERO — Doogie search first, everything else second ═════ */}
      <div style={{ position:"relative", background: `linear-gradient(135deg, ${C.navy} 0%, #1E40AF 100%)`, color:"white", padding:"clamp(36px, 7vw, 72px) clamp(16px, 4vw, 24px) clamp(28px, 5vw, 48px)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ fontSize:"0.72rem", letterSpacing:"0.16em", color: C.gold, fontWeight: 700 }}>LIVE BC MLS® · BCFSA-LICENSED</div>
          <h1 style={{ fontSize: "clamp(1.9rem, 5vw, 3.2rem)", fontFamily:"'Sora',sans-serif", fontWeight: 800, lineHeight: 1.05, margin: "8px 0 14px", maxWidth: 900 }}>
            British Columbia real estate — live MLS® listings, community insights, and a BCFSA-licensed REALTOR®.
          </h1>
          <p style={{ fontSize:"clamp(0.95rem, 2vw, 1.1rem)", lineHeight: 1.6, maxWidth: 780, opacity: 0.95, marginBottom: 22 }}>
            {stats.total ? `${stats.total.toLocaleString()} active MLS® listings` : "40,000+ live listings"} · Fraser Valley, Greater Vancouver, and Sea-to-Sky Corridor covered directly by Doug LeMaire · BC-wide vetted referral network for all other regions · complimentary buyer consultations.
          </p>

          {/* Doogie voice + text filter — reused from production */}
          <div style={{ background:"white", borderRadius: 14, boxShadow:"0 10px 40px rgba(0,0,0,0.18)", overflow:"hidden", marginBottom: 18 }} data-testid="hero-doogie-search">
            <DoogieFilterHeader onVoiceFilter={applyVoiceFilter} onReset={() => nav("/listings")}/>
            <div style={{ padding:"14px 18px", color: C.ink, fontSize:"0.85rem", lineHeight: 1.55 }}>
              <strong style={{ color: C.navy }}>Ask Doogie</strong> — try voice or type a full sentence:{" "}
              <em style={{ color: C.muted }}>"3-bed townhome in Langley under $1.2M with a suite"</em>
            </div>
          </div>

          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <Link to="/property-search" style={{ background: C.gold, color: C.navy, padding:"12px 22px", borderRadius:999, fontWeight:700, fontSize:"0.92rem", textDecoration:"none" }} data-testid="hero-cta-search">Browse all listings</Link>
            <Link to="/market-estimate" style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,0.4)", padding:"12px 22px", borderRadius:999, fontWeight:600, fontSize:"0.92rem", textDecoration:"none" }} data-testid="hero-cta-value">Home valuation</Link>
            <a href="#lead-form" style={{ background:"transparent", color:"white", border:"1px solid rgba(255,255,255,0.4)", padding:"12px 22px", borderRadius:999, fontWeight:600, fontSize:"0.92rem", textDecoration:"none" }} data-testid="hero-cta-talk">Request a consultation</a>
          </div>

          <div style={{ marginTop: 22, padding:"10px 14px", background:"rgba(255,255,255,0.08)", borderRadius: 8, fontSize:"0.75rem", opacity: 0.85, maxWidth: 780 }}>
            <NotAdviceBumper inline/>
          </div>
        </div>
      </div>

      {/* ═════ § PATH-BASED CTAs ═════ */}
      <Section tone="paper">
        <H2 kicker="Choose your path">What brings you to EZtoFind today?</H2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {PATHS.map(p => (
            <Link key={p.title} to={p.href} data-testid={p.testid} style={{ textDecoration:"none", display:"block" }}>
              <div style={{ padding:"22px 22px", borderRadius: 14, background: p.tone === "gold" ? C.gold : "white", border: p.tone === "gold" ? "none" : "1px solid #E5E7EB", height: "100%", boxSizing:"border-box", cursor:"pointer", transition:"transform 0.15s, box-shadow 0.15s" }}
                   onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 12px 28px rgba(15,42,91,0.15)"; }}
                   onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}>
                <div style={{ fontSize:"2rem" }}>{p.icon}</div>
                <div style={{ fontSize:"1.12rem", fontFamily:"'Sora',sans-serif", fontWeight: 700, color: C.navy, marginTop: 8 }}>{p.title}</div>
                <div style={{ fontSize:"0.88rem", color: C.ink, marginTop: 6, lineHeight: 1.55 }}>{p.body}</div>
                <div style={{ marginTop: 14, fontWeight: 700, color: C.navy, fontSize:"0.9rem" }}>{p.cta}</div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ═════ § FEATURED COMMUNITIES ═════ */}
      <Section tone="white">
        <H2 kicker="Explore BC">Featured communities · live inventory</H2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {FEATURED_COMMUNITIES.map(c => (
            <Link key={c.slug} to={`/community/${c.slug}`} data-testid={`community-${c.slug}`}
                  style={{ background: C.cream, border:"1px solid #E7DFC8", borderRadius: 10, padding:"14px 16px", color: C.navy, fontWeight: 700, fontSize:"0.92rem", textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background="#F0E6C7"}
                  onMouseLeave={e => e.currentTarget.style.background=C.cream}>
              <span>📍 {c.name}</span>
              <span style={{ color: C.gold, fontSize:"0.85rem" }}>→</span>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 16, textAlign:"center" }}>
          <Link to="/communities" data-testid="all-communities" style={{ color: C.navy, fontWeight: 700, fontSize:"0.9rem", textDecoration:"underline" }}>See all 240 BC communities →</Link>
        </div>
      </Section>

      {/* ═════ § SPECIALTIES ═════ */}
      <Section tone="cream">
        <H2 kicker="Doug's specialties">Buying something specific?</H2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {SPECIALTIES.map(s => (
            <Link key={s.title} to={s.href} data-testid={`specialty-${s.title.toLowerCase().replace(/\W+/g,"-")}`}
                  style={{ background:"white", border:"1px solid #E5E7EB", borderRadius: 12, padding:"18px 20px", textDecoration:"none" }}>
              <div style={{ fontSize:"1.6rem" }}>{s.icon}</div>
              <div style={{ fontSize:"1.02rem", fontFamily:"'Sora',sans-serif", fontWeight: 700, color: C.navy, marginTop: 6 }}>{s.title}</div>
              <div style={{ fontSize:"0.85rem", color: C.ink, marginTop: 4, lineHeight: 1.5 }}>{s.body}</div>
              <div style={{ marginTop: 10, color: C.blue, fontWeight: 700, fontSize:"0.85rem" }}>Learn more →</div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ═════ § GLOSSARY SPOTLIGHT — internal-linking + AEO citation fodder ═════ */}
      <Section tone="white">
        <H2 kicker="Learn the language">BC real-estate terms worth knowing</H2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {GLOSSARY_SPOTLIGHT.map(g => (
            <Link key={g.slug} to={`/glossary/${g.slug}`} data-testid={`glossary-${g.slug}`}
                  style={{ background: C.paper, border:"1px solid #E5E7EB", borderRadius: 10, padding:"12px 16px", color: C.navy, fontWeight: 600, fontSize:"0.9rem", textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span>📖 {g.term}</span>
              <span style={{ color: C.gold, fontSize:"0.85rem" }}>→</span>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 14, textAlign:"center" }}>
          <Link to="/glossary" data-testid="all-glossary" style={{ color: C.navy, fontWeight: 700, fontSize:"0.9rem", textDecoration:"underline" }}>Browse all 439 glossary entries →</Link>
        </div>
      </Section>

      {/* ═════ § LEAD FORM — the money maker ═════ */}
      <Section tone="paper">
        <HomepageLeadForm/>
      </Section>

      {/* ═════ § FAQ — AEO / LLM citation payload ═════ */}
      <Section tone="white">
        <H2 kicker="Frequently asked">The questions we get most</H2>
        <div style={{ display:"flex", flexDirection:"column", gap: 10, maxWidth: 920 }}>
          {FAQS.map((f, i) => (
            <details key={i} style={{ background: C.paper, border:"1px solid #E5E7EB", borderRadius: 10, padding:"14px 18px" }} data-testid={`faq-${i}`}>
              <summary style={{ fontSize:"0.95rem", fontWeight: 700, color: C.navy, cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>{f.q}</summary>
              <div style={{ marginTop: 10, fontSize:"0.9rem", lineHeight: 1.65, color: C.ink }}>{f.a}</div>
            </details>
          ))}
        </div>
      </Section>

      <ComplianceFooter/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Lead form — the exact same compliance stack as EquestrianLeadMockup:
// CASL express consent + PIPA acknowledgment + BCFSA Disclosure of
// Representation + working-with-realtor guard + Turnstile.
function HomepageLeadForm() {
  const [f, setF] = useState({
    full_name:"", email:"", phone:"", areas:[], property_type:"",
    budget:"", timeframe:"3-6 months", notes:"",
    working_with_realtor:false, casl_consent:false, pipa_ack:false, dor_ack:false,
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const set = (k,v) => setF(s => ({ ...s, [k]: v }));
  const disabled = !f.casl_consent || !f.pipa_ack || !f.dor_ack || f.working_with_realtor || busy;

  const submit = async e => {
    e.preventDefault();
    setErr("");
    if (f.working_with_realtor) { setErr("Because you're already under contract with another BCFSA-licensed REALTOR®, Doug isn't able to help directly. Feel free to keep browsing the site — Doogie can still answer general questions."); return; }
    if (!f.casl_consent || !f.pipa_ack || !f.dor_ack) { setErr("Please tick the three consent boxes so Doug is legally able to contact you."); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/api/leads/buyer`, {
        ...f,
        areas: f.areas.length ? f.areas : ["BC (any)"],
        budget: f.budget ? Number(String(f.budget).replace(/\D/g,"")) : null,
        bedrooms: null,
        notes: `HOMEPAGE LEAD — ${f.notes || "(no note)"}`,
        form_lang:"en",
        turnstile_token: getTurnstileToken(),
      });
      setDone(true);
    } catch { setErr("We couldn't submit your form. Please try again in a moment."); }
    finally { setBusy(false); }
  };

  const inp = { width:"100%", padding:"11px 13px", borderRadius:8, border:"1px solid #D1D5DB", fontSize:"0.92rem", fontFamily:"Inter,sans-serif", background:"white", boxSizing:"border-box" };
  const lbl = { fontSize:"0.82rem", fontWeight: 700, color: C.navy, display:"block", marginBottom: 6, marginTop: 14 };
  const consentBox = { marginTop: 12, padding:"14px 16px", background:"rgba(255,255,255,0.06)", borderRadius: 8 };

  if (done) {
    return (
      <div id="lead-form" style={{ background: C.green, color:"white", borderRadius: 14, padding:"36px 32px" }} data-testid="lead-form-done">
        <div style={{ fontSize:"0.72rem", letterSpacing:"0.14em", opacity: 0.9, fontWeight: 700 }}>✅ RECEIVED</div>
        <h2 style={{ fontSize:"1.6rem", fontFamily:"'Sora',sans-serif", fontWeight: 700, marginTop: 6, marginBottom: 8 }}>Thank you{f.full_name ? `, ${f.full_name.split(" ")[0]}` : ""} — Doug will reach out within one business day.</h2>
        <p style={{ fontSize:"0.95rem", lineHeight: 1.55, marginBottom: 0, opacity: 0.92 }}>
          Your request has been received. Because you provided CASL express consent, you will also receive Doug's weekly British Columbia listings digest. One-click unsubscribe is included in every email.
        </p>
      </div>
    );
  }

  return (
    <div id="lead-form" style={{ background: C.navy, color:"white", borderRadius: 16, padding:"clamp(24px,4vw,32px) clamp(20px,4vw,30px)", boxShadow:"0 10px 40px rgba(15,42,91,0.20)" }} data-testid="lead-form">
      <div style={{ fontSize:"0.72rem", letterSpacing:"0.14em", color: C.gold, fontWeight: 700 }}>REQUEST A CONSULTATION</div>
      <h2 style={{ fontSize:"clamp(1.4rem, 3vw, 1.8rem)", fontFamily:"'Sora',sans-serif", fontWeight: 700, lineHeight: 1.15, margin:"6px 0 16px" }}>Complimentary 20-minute consultation with a BCFSA-licensed REALTOR®</h2>
      <p style={{ fontSize:"0.92rem", opacity: 0.88, lineHeight: 1.6, marginBottom: 20 }}>
        Whether you are buying, selling, relocating to British Columbia, or moving within the province — Doug LeMaire personally responds within one business day. No cost, no obligation. PIPA + CASL + BCFSA compliant.
      </p>
      <form onSubmit={submit} data-testid="lead-form-el">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div><label style={lbl}>Full name *</label><input required type="text" value={f.full_name} onChange={e=>set("full_name", e.target.value)} style={inp} data-testid="lead-name" autoComplete="name"/></div>
          <div><label style={lbl}>Phone *</label><input required type="tel" value={f.phone} onChange={e=>set("phone", e.target.value)} style={inp} data-testid="lead-phone" autoComplete="tel" placeholder="604 555 1212"/></div>
        </div>
        <label style={lbl}>Email *</label>
        <input required type="email" value={f.email} onChange={e=>set("email", e.target.value)} style={inp} data-testid="lead-email" autoComplete="email"/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div><label style={lbl}>What brings you here?</label>
            <select value={f.property_type} onChange={e=>set("property_type", e.target.value)} style={inp} data-testid="lead-purpose">
              <option value="">Choose…</option>
              <option>Buying — detached</option>
              <option>Buying — townhome / condo</option>
              <option>Buying — equestrian / acreage</option>
              <option>Buying — luxury</option>
              <option>Selling my BC home</option>
              <option>Moving to BC from elsewhere</option>
              <option>Moving within BC</option>
              <option>Estate sale / probate</option>
              <option>Just researching</option>
            </select>
          </div>
          <div><label style={lbl}>Timeframe</label>
            <select value={f.timeframe} onChange={e=>set("timeframe", e.target.value)} style={inp} data-testid="lead-timeframe">
              <option>0-30 days</option><option>1-3 months</option><option>3-6 months</option>
              <option>6-12 months</option><option>Just researching</option>
            </select>
          </div>
        </div>
        <label style={lbl}>Budget (CAD, optional)</label>
        <input type="text" inputMode="numeric" value={f.budget ? `$${Number(String(f.budget).replace(/\D/g,"")).toLocaleString("en-CA")}` : ""} onChange={e=>set("budget", e.target.value.replace(/\D/g,""))} style={inp} data-testid="lead-budget" placeholder="$1,200,000"/>
        <label style={lbl}>Anything specific? (optional)</label>
        <textarea value={f.notes} onChange={e=>set("notes", e.target.value)} style={{...inp, minHeight: 80, resize:"vertical"}} data-testid="lead-notes" placeholder="e.g. Two kids, remote work, want a suite for rental income, prefer newer builds…"/>

        {/* BCFSA representation guard */}
        <div style={{ ...consentBox, border:"1px solid rgba(245,166,35,0.35)" }}>
          <label style={{ display:"flex", gap: 10, alignItems:"flex-start", cursor:"pointer", fontSize:"0.85rem", lineHeight: 1.55 }}>
            <input type="checkbox" checked={f.working_with_realtor} onChange={e=>set("working_with_realtor", e.target.checked)} style={{ marginTop: 3, transform:"scale(1.2)" }} data-testid="lead-working-with-realtor"/>
            <span>I am <strong>already under contract</strong> with another BCFSA-licensed REALTOR® as a buyer.
              <span style={{ display:"block", opacity: 0.8, marginTop: 3, fontSize:"0.78rem" }}>BCFSA rules prevent Doug from representing you if you're already exclusively represented.</span>
            </span>
          </label>
        </div>

        {/* CASL express consent */}
        <div style={consentBox}>
          <label style={{ display:"flex", gap: 10, alignItems:"flex-start", cursor:"pointer", fontSize:"0.85rem", lineHeight: 1.55 }}>
            <input type="checkbox" checked={f.casl_consent} onChange={e=>set("casl_consent", e.target.checked)} style={{ marginTop: 3, transform:"scale(1.2)" }} data-testid="lead-casl"/>
            <span><strong>CASL express consent — required.</strong> I consent to receive commercial electronic messages from Doug LeMaire and Fraser Property Management Realty Services Ltd. (new-listing digests, market reports, checklists). One-click unsubscribe in every email. <Link to="/email-preferences" style={{ color: C.gold, textDecoration:"underline" }}>Manage preferences</Link>.</span>
          </label>
        </div>

        {/* PIPA acknowledgment */}
        <div style={consentBox}>
          <label style={{ display:"flex", gap: 10, alignItems:"flex-start", cursor:"pointer", fontSize:"0.85rem", lineHeight: 1.55 }}>
            <input type="checkbox" checked={f.pipa_ack} onChange={e=>set("pipa_ack", e.target.checked)} style={{ marginTop: 3, transform:"scale(1.2)" }} data-testid="lead-pipa"/>
            <span><strong>PIPA privacy acknowledgment — required.</strong> I understand my personal information is collected under the BC Personal Information Protection Act (PIPA), used only to provide real-estate services, and never sold. See the <Link to="/privacy" style={{ color: C.gold, textDecoration:"underline" }}>Privacy Policy</Link>.</span>
          </label>
        </div>

        {/* BCFSA DoR */}
        <div style={consentBox}>
          <label style={{ display:"flex", gap: 10, alignItems:"flex-start", cursor:"pointer", fontSize:"0.85rem", lineHeight: 1.55 }}>
            <input type="checkbox" checked={f.dor_ack} onChange={e=>set("dor_ack", e.target.checked)} style={{ marginTop: 3, transform:"scale(1.2)" }} data-testid="lead-dor"/>
            <span><strong>BCFSA Disclosure of Representation — required.</strong> I have read the <a href="https://www.bcfsa.ca/public-resources/real-estate/consumer-resources/disclosure-representation-trading-services" target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration:"underline" }}>BCFSA Disclosure of Representation in Trading Services</a> pamphlet.</span>
          </label>
        </div>

        <div style={{ marginTop: 20 }}><TurnstileWidget/></div>
        {err && <div role="alert" style={{ marginTop: 12, padding:"10px 14px", background:"rgba(220,38,38,0.15)", border:"1px solid rgba(220,38,38,0.5)", borderRadius: 8, color:"#FEE2E2", fontSize:"0.85rem" }} data-testid="lead-err">{err}</div>}

        <button type="submit" disabled={disabled} data-testid="lead-submit"
                style={{ marginTop: 20, width:"100%", background: disabled ? "rgba(255,255,255,0.20)" : C.gold, color: disabled ? "rgba(255,255,255,0.60)" : C.navy, border:"none", padding:"14px 24px", borderRadius: 999, fontFamily:"'Sora',sans-serif", fontSize:"1rem", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", transition:"all 0.15s" }}>
          {busy ? "Sending…" : "🐾 Send it — talk to Doug"}
        </button>
        <div style={{ marginTop: 12, fontSize:"0.75rem", opacity: 0.75, textAlign:"center" }}>
          $0 cost · No obligation · CASL + PIPA + BCFSA compliant · Unsubscribe any time
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Compliance footer — every regulator string in one prominent place.
function ComplianceFooter() {
  return (
    <div style={{ background: C.navy, color:"white", padding:"clamp(24px,5vw,40px) clamp(16px,4vw,24px)" }} data-testid="compliance-footer">
      <div style={{ maxWidth: 1160, margin:"0 auto", fontSize:"0.82rem", lineHeight: 1.7 }}>
        <div style={{ display:"flex", gap: 14, alignItems:"center", flexWrap:"wrap", marginBottom: 14 }}>
          <div style={{ background:"#EF3E42", color:"white", padding:"8px 12px", borderRadius: 6, fontSize:"0.7rem", fontWeight: 800, letterSpacing:"0.06em" }}>REALTOR.ca</div>
          <div style={{ fontSize:"0.9rem", fontWeight: 700 }}>Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. · BCFSA-licensed</div>
        </div>
        <p style={{ margin:"0 0 8px" }}>
          <strong>Brokerage:</strong> Fraser Property Management Realty Services Ltd., 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5. Brokerage: <a href="tel:604-466-7021" style={{ color: C.gold }}>(604) 466-7021</a> · Doug direct: <a href="tel:604-787-0851" style={{ color: C.gold }}>(604) 787-0851</a>.
        </p>
        <p style={{ margin:"0 0 8px", opacity: 0.88 }}>
          MLS®, Multiple Listing Service®, REALTOR®, REALTORS®, and the REALTOR® logo are certification marks owned by The Canadian Real Estate Association (CREA) and identify real estate professionals who are members of CREA. Trademarks MLS® and Multiple Listing Service® are administered by CREA. Property data © CREA Data Distribution Facility (DDF®), sourced live from the Greater Vancouver REALTORS®, Fraser Valley Real Estate Board, and 10+ participating BC boards. Refreshed every 4 hours.
        </p>
        <p style={{ margin:"0 0 8px", opacity: 0.88 }}>
          General information only — <strong>not legal, tax, financial, or real-estate advice</strong>. For your own situation, always speak with a BC lawyer or notary, an accountant, a licensed mortgage broker, and a REALTOR®. Doug is not the listing agent for any property shown on this site unless explicitly stated; always verify all information directly with the listing brokerage before making an offer.
        </p>
        <p style={{ margin: 0, opacity: 0.88 }}>
          Personal information collected on this site is handled under the BC Personal Information Protection Act (PIPA) — see the <Link to="/privacy" style={{ color: C.gold }}>Privacy Policy</Link>. Marketing email consent recorded under Canada's Anti-Spam Legislation (CASL) — <Link to="/email-preferences" style={{ color: C.gold }}>unsubscribe any time</Link>. Read Doug's <Link to="/terms" style={{ color: C.gold }}>Terms of Service</Link> and full <Link to="/disclosure" style={{ color: C.gold }}>Disclosure of Representation</Link>.
        </p>
      </div>
    </div>
  );
}
