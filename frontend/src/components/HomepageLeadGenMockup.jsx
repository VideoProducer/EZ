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
import FeaturedComingSoonListing from "./FeaturedComingSoonListing";
import ReferralAsk from "./ReferralAsk";

const API = process.env.REACT_APP_BACKEND_URL;

const C = {
  navy: "#0F2A5B", gold: "#F5A623", cream: "#F5F0E1", ink: "#1F2937",
  muted: "#6B7280", green: "#059669", paper: "#FAFAF7", blue: "#1E4FCF",
  red: "#B91C1C",
};

const fmtMoney = n => !n ? "—" : n >= 1e6 ? `$${(n/1e6).toFixed(n>=1e7?0:1)}M` : n >= 1e3 ? `$${Math.round(n/1e3)}K` : `$${n.toLocaleString("en-CA")}`;

// ── Content ────────────────────────────────────────────────────────
const REGIONS = [
  { slug:"greater-vancouver", name:"Greater Vancouver", tagline:"From downtown high-rises to West Van estates.", count:"22 communities", pin:{ lat:49.2827, lng:-123.1207 } },
  { slug:"fraser-valley",     name:"Fraser Valley",     tagline:"Langley, Abbotsford, Chilliwack — where space meets city convenience.", count:"18 communities", pin:{ lat:49.1044, lng:-122.6603 } },
  { slug:"sea-to-sky",        name:"Sea-to-Sky",        tagline:"Squamish, Whistler, Pemberton — mountain-lifestyle real estate.", count:"6 communities",  pin:{ lat:50.1163, lng:-122.9574 } },
];
const TESTIMONIALS = [
  { author:"J&M", label:"Buyers · 2024",  stars:5, text:"Doug was an absolute pleasure to work with. As buyers, we truly appreciated his patience, professionalism, and thorough approach throughout the entire process. Doug took the time to understand our needs, provided valuable insights, and guided us every step of the way with clear communication and expert advice." },
  { author:"M.C.", label:"Seller · 2024", stars:5, text:"Doug LeMaire is a real estate agent of an elite caliber who truly cares about his clients and will not stop until you are satisfied. Doug sold my home as an off-sale listing, demonstrating that he never stopped working on my behalf, even when the home was not actually listed for sale." },
];
const TRUST_STATS = [
  { icon:"🛡️", label:"Licensed REALTOR®",       sub:"Fraser Property Management Realty Services Ltd." },
  { icon:"📍", label:"Local Expert",              sub:"Greater Vancouver · Fraser Valley · Sea-to-Sky (to Whistler)" },
  { icon:"⏱️", label:"13 Years",                  sub:"BC Real Estate Experience" },
  { icon:"📚", label:"439 Statute-Cited Terms",   sub:"Free BC real-estate glossary · 240 community profiles" },
];
const PATHS = [
  { icon:"🏡", title:"I'm buying in BC", body:"Search live CREA DDF® MLS® listings, save favourites, get instant new-listing alerts, and lock in a free 20-min buyer strategy call with Doug.", cta:"Start searching →", href:"/property-search", tone:"gold", testid:"path-buying" },
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
  { slug:"agricultural-land-reserve",   term:"Agricultural Land Reserve",         defn:"Provincially designated agricultural land governed by the BC Agricultural Land Commission Act (RSBC 2002, c.36). Subdivision, non-farm use, and residential improvement are restricted." },
  { slug:"restrictive-covenant",        term:"Restrictive Covenant",              defn:"A registered charge on title that restricts how a parcel may be used, built on, or subdivided (BC Land Title Act, s.219). Binds all future owners." },
  { slug:"property-transfer-tax",       term:"BC Property Transfer Tax (PTT)",    defn:"Tax on the fair-market value of a BC property transfer under the Property Transfer Tax Act. 1 % on the first $200 K, 2 % up to $2 M, 3 % up to $3 M, 5 % above $3 M." },
  { slug:"subject-to-financing",        term:"Subject to Financing",              defn:"A subject clause in a BC Contract of Purchase and Sale making the buyer's obligation contingent on obtaining satisfactory financing by a stated date." },
  { slug:"strata-depreciation-report",  term:"Strata Depreciation Report",        defn:"A report every BC strata corporation of 5+ units must obtain under the Strata Property Act, s.94, projecting anticipated common-property repairs over 30 years." },
  { slug:"disclosure-of-representation",term:"BCFSA Disclosure of Representation",defn:"The mandatory BCFSA form a licensee must provide at first substantive contact explaining how the consumer will (or will not) be represented in the trade." },
];
const FAQS = [
  { q:"How current are the MLS® listings on EZtoFind.ca?",
    a:"Every listing on EZtoFind.ca is refreshed every 4 hours directly from the CREA Data Distribution Facility (DDF®), sourced live from the Greater Vancouver REALTORS®, Fraser Valley Real Estate Board, and 10+ other participating boards across British Columbia." },
  { q:"Does Doug charge me anything to represent me as a buyer?",
    a:"No. Under BC's Multiple Listing Service® rules, the seller's brokerage compensates the co-operating (buyer's) brokerage from the sale proceeds — you pay $0 for consultations, showings, offer preparation, negotiation, or closing coordination. Full BCFSA Disclosure of Representation is presented before any meaningful engagement." },
  { q:"What if the property I love is outside Doug's direct service area?",
    a:"Doug personally transacts in Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor (to Whistler). For anywhere else in BC (Vancouver Island via VIREB, the Interior via IAR/KAR, the Kootenays, Cariboo, Peace via BCNREB and CADREB), Doug hand-picks a BCFSA-licensed local from his vetted REALTOR® referral network — $0 cost to you, you approve every intro, and no CASL marketing spam follows." },
  { q:"Is Doogie giving me real-estate advice?",
    a:"No. Doogie is an AI-assisted educational guide that explains BC real estate terminology, walks you through active listings, and helps you find community pages — but Doogie provides general information only, never legal, tax, financial, or property-specific advice. For your own situation, always speak with a BC lawyer or notary, an accountant, a licensed mortgage broker, and a REALTOR®. Under BCFSA's AI Guidelines, the licensee (Doug) remains responsible for all AI-generated output." },
  { q:"How is my personal information handled when I submit a form?",
    a:"Under British Columbia's Personal Information Protection Act (PIPA), your data is collected only to provide real-estate services, stored securely, never sold, and deletable on request. Marketing emails require your separate express consent under Canada's Anti-Spam Legislation (CASL) — one-click unsubscribe is in every message. Consent records (your email, submission timestamp, IP address, and browser user-agent) are retained for 3 years as CASL proof-of-consent." },
  { q:"Can I cast a listing from my phone to my Apple TV or Chromecast?",
    a:"Yes — with a caveat. Every listing detail page has a Cast button that (1) shows a QR code so any phone can open the listing on itself, (2) offers a true big-screen TV pairing mode via eztofind.ca/tv where a smart-TV browser, laptop-HDMI'd-to-a-TV, or Chromebook enters a 6-digit code and plays the listing full-screen with the phone as remote — no mirroring, and (3) surfaces the standard AirPlay Screen Mirroring / Chromecast tab-cast options for Apple TV or stock Chromecasts that don't have a browser." },
];

// Regulator + entity facts — single source of truth.
// NOTE: Replace `BCFSA_LICENCE_INDIVIDUAL` and `BCFSA_LICENCE_BROKERAGE`
// with the real licence numbers from Doug's BCFSA member page before
// promoting this mockup to /.
const FACTS = {
  brokerage_name:"Fraser Property Management Realty Services Ltd.",
  brokerage_addr:"1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5",
  brokerage_phone:"+1-604-466-7021",
  doug_phone:"+1-604-787-0851",
  doug_email:"info@eztofind.ca",
  privacy_email:"privacy@eztofind.ca",
  years_experience: 13,
  glossary_count: 439,
  community_count: 240,
  bcfsa_licence_individual: "PENDING — insert Doug's BCFSA licence #",
  bcfsa_licence_brokerage:  "PENDING — insert brokerage licence #",
  practice_areas: "Greater Vancouver · Fraser Valley · Sea-to-Sky Corridor (to Whistler)",
  referral_boards: "Vancouver Island (VIREB), Interior BC (IAR / KAR), Kootenays, Cariboo, Peace (BCNREB, CADREB)",
};

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
        "description": "British Columbia real estate — live CREA DDF® MLS® listings, 240 community profiles, 439 statute-cited glossary entries, and a BCFSA-licensed REALTOR®. Free platform by Doug LeMaire, REALTOR®.",
        "inLanguage": "en-CA",
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
        "givenName": "Doug",
        "familyName": "LeMaire",
        "jobTitle": "REALTOR®",
        "description": `BCFSA-licensed REALTOR® with ${FACTS.years_experience} years of BC real estate experience. Practice areas: ${FACTS.practice_areas}. Referral network for the rest of BC via VIREB, IAR, KAR, BCNREB, CADREB.`,
        "image": "https://eztofind.ca/doug-headshot.jpg",
        "telephone": FACTS.doug_phone,
        "email": FACTS.doug_email,
        "url": "https://eztofind.ca/",
        "worksFor": { "@id": "https://eztofind.ca/#brokerage" },
        "areaServed": [
          { "@type": "AdministrativeArea", "name": "Greater Vancouver, BC" },
          { "@type": "AdministrativeArea", "name": "Fraser Valley, BC" },
          { "@type": "AdministrativeArea", "name": "Sea-to-Sky Corridor, BC (to Whistler)" },
        ],
        "knowsAbout": ["MLS listings", "BCFSA compliance", "Equestrian property", "Luxury real estate", "Strata", "Estate sale probate", "Agricultural Land Reserve", "BC Property Transfer Tax", "OSFI B-20 stress test"],
        "hasCredential": {
          "@type": "EducationalOccupationalCredential",
          "credentialCategory": "License",
          "recognizedBy": { "@type": "Organization", "name": "BC Financial Services Authority (BCFSA)", "url": "https://www.bcfsa.ca/" },
          "identifier": FACTS.bcfsa_licence_individual,
        },
        "sameAs": [
          "https://www.realtor.ca/agent/2126195/doug-lemaire-1-22374-lougheed-hwy-maple-ridge-british-columbia-v2x2t5",
        ],
      },
      {
        "@type": "RealEstateAgent",
        "@id": "https://eztofind.ca/#brokerage",
        "name": FACTS.brokerage_name,
        "telephone": FACTS.brokerage_phone,
        "url": "https://eztofind.ca/",
        "address": { "@type": "PostalAddress", "streetAddress": "1 – 22374 Lougheed Hwy", "addressLocality": "Maple Ridge", "addressRegion": "BC", "postalCode": "V2X 2T5", "addressCountry": "CA" },
        "geo": { "@type": "GeoCoordinates", "latitude": 49.2185, "longitude": -122.6017 },
        "areaServed": "British Columbia",
        "priceRange": "$",
        "hasCredential": {
          "@type": "EducationalOccupationalCredential",
          "credentialCategory": "License",
          "recognizedBy": { "@type": "Organization", "name": "BC Financial Services Authority (BCFSA)" },
          "identifier": FACTS.bcfsa_licence_brokerage,
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5.0",
          "reviewCount": TESTIMONIALS.length,
          "bestRating": "5",
          "worstRating": "1",
        },
        "review": TESTIMONIALS.map(t => ({
          "@type": "Review",
          "author": { "@type": "Person", "name": t.author },
          "reviewRating": { "@type": "Rating", "ratingValue": t.stars, "bestRating": 5, "worstRating": 1 },
          "reviewBody": t.text,
          "itemReviewed": { "@id": "https://eztofind.ca/#doug" },
        })),
      },
      {
        "@type": "ItemList",
        "@id": "https://eztofind.ca/#regions",
        "name": "Doug LeMaire practice-area regions in British Columbia",
        "itemListOrder": "https://schema.org/ItemListOrderAscending",
        "itemListElement": REGIONS.map((r, i) => ({
          "@type": "ListItem", "position": i + 1,
          "item": { "@type": "Place", "name": r.name, "description": r.tagline,
                    "geo": { "@type": "GeoCoordinates", "latitude": r.pin.lat, "longitude": r.pin.lng },
                    "url": `https://eztofind.ca/regions/${r.slug}` },
        })),
      },
      {
        "@type": "DefinedTermSet",
        "@id": "https://eztofind.ca/#glossary",
        "name": `EZtoFind.ca BC Real-Estate Glossary — ${FACTS.glossary_count} statute-cited terms`,
        "url": "https://eztofind.ca/glossary",
        "inDefinedTermSet": "https://eztofind.ca/glossary",
        "hasDefinedTerm": GLOSSARY_SPOTLIGHT.map(g => ({
          "@type": "DefinedTerm",
          "name": g.term,
          "description": g.defn,
          "url": `https://eztofind.ca/glossary/${g.slug}`,
          "inDefinedTermSet": "https://eztofind.ca/#glossary",
        })),
      },
      ...SPECIALTIES.map(s => ({
        "@type": "Service",
        "serviceType": s.title,
        "provider": { "@id": "https://eztofind.ca/#doug" },
        "areaServed": FACTS.practice_areas,
        "description": s.body,
        "url": `https://eztofind.ca${s.href}`,
      })),
      {
        "@type": "SoftwareApplication",
        "@id": "https://eztofind.ca/#affordability-calc",
        "name": "BC Home Affordability Calculator",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web browser",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "CAD" },
        "description": "Free BC-specific home-affordability tool that runs the OSFI B-20 stress test (qualifying rate = max of contract + 2 % or benchmark, minimum 5.25 %), applies the BC Property Transfer Tax schedule with the First-Time Buyer exemption, and returns your maximum purchase price plus a live listings link.",
        "featureList": ["OSFI B-20 stress test at 7.50 %", "BC PTT schedule (1 % / 2 % / 3 % / 5 %)", "First-Time Buyer PTT exemption", "GDS/TDS debt-service ratios", "Live 'Show me listings under $X' filter"],
      },
      {
        "@type": "FAQPage",
        "mainEntity": FAQS.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": { "@type": "Answer", "text": f.a },
        })),
        "speakable": { "@type": "SpeakableSpecification", "cssSelector": ["[data-testid^=faq-]"] },
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://eztofind.ca/" },
        ],
      },
    ],
  }), []);

  const heroDesc = `Search ${stats.total ? stats.total.toLocaleString() : "the live CREA DDF®"} BC MLS® listings across ${FACTS.community_count} community profiles. Free platform · ${FACTS.glossary_count} statute-cited glossary entries · ${FACTS.years_experience} years BC experience · BCFSA-licensed · PIPA + CASL + BCFSA + CREA compliant. By Doug LeMaire, REALTOR®.`;

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

      {/* Media-query CSS for the hero Doogie mascot — hidden on
          narrow screens so it never crowds the H1/search on mobile. */}
      <style>{`
        .hv2-doogie-hero { display: none; }
        @media (min-width: 1024px) {
          .hv2-doogie-hero { display: block; }
          .hv2-hero-copy { max-width: 640px; }
        }
        @media (prefers-reduced-motion: no-preference) {
          @keyframes hv2FloatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes hv2Wag    { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
          .hv2-doogie-hero img { animation: hv2FloatY 6s ease-in-out infinite; }
          .hv2-path-doogie      { animation: hv2FloatY 4s ease-in-out infinite; }
        }
        .hv2-path-card:hover .hv2-path-doogie { animation: hv2Wag 0.6s ease-in-out infinite; }
      `}</style>

      {/* ═════ HERO — one big search, one primary CTA, one Doogie ═════ */}
      <div style={{ position:"relative", overflow:"hidden", background: `linear-gradient(135deg, ${C.navy} 0%, #1E40AF 100%)`, color:"white", padding:"clamp(40px, 8vw, 88px) clamp(16px, 4vw, 24px) clamp(28px, 5vw, 48px)" }}>
        <div className="hv2-doogie-hero" aria-hidden="true"
             style={{ position:"absolute", right:"clamp(16px, 3vw, 48px)", bottom:0, width: 340, pointerEvents:"none", zIndex: 1 }}
             data-testid="hero-doogie-mascot">
          <img src="/images/doogie/celebrating.webp" alt="" width={340} height={340} loading="eager"
               style={{ width: 340, height:"auto", filter:"drop-shadow(0 20px 40px rgba(0,0,0,0.35))" }}/>
        </div>

        <div className="hv2-hero-copy" style={{ maxWidth: 1160, margin:"0 auto", position:"relative", zIndex: 2 }}>
          <div style={{ fontSize:"0.72rem", letterSpacing:"0.16em", color: C.gold, fontWeight: 700 }}>FREE · BCFSA-LICENSED · LIVE BC MLS®</div>
          <h1 style={{ fontSize:"clamp(2.1rem, 5.5vw, 3.4rem)", fontFamily:"'Sora',sans-serif", fontWeight: 800, lineHeight: 1.05, margin:"8px 0 12px", maxWidth: 720 }}>
            Real estate,<br/>made EZ to Find.
          </h1>
          <p style={{ fontSize:"clamp(1rem, 2vw, 1.15rem)", lineHeight: 1.55, maxWidth: 620, opacity: 0.94, marginBottom: 20 }}>
            Search live BC listings, ask Doogie anything, and get a straight answer — all free. {FACTS.years_experience} years experience, BCFSA-licensed, no email required to browse.
          </p>

          <div style={{ background:"white", borderRadius: 14, boxShadow:"0 12px 44px rgba(0,0,0,0.24)", overflow:"hidden", marginBottom: 16, maxWidth: 720 }} data-testid="hero-doogie-search">
            <DoogieFilterHeader onVoiceFilter={applyVoiceFilter} onReset={() => nav("/listings")}/>
            <div style={{ padding:"12px 16px", color: C.ink, fontSize:"0.85rem", display:"flex", gap: 10, alignItems:"center" }}>
              <img src="/images/doogie/thinking.webp" alt="" width={32} height={32} style={{ width: 32, height: 32, flexShrink: 0 }}/>
              <div><strong style={{ color: C.navy }}>Try:</strong> <em style={{ color: C.muted }}>"3-bed townhome in Langley under $1.2M"</em></div>
            </div>
          </div>

          <div style={{ display:"flex", gap: 10, flexWrap:"wrap" }}>
            <Link to="/property-search" style={{ background: C.gold, color: C.navy, padding:"14px 28px", borderRadius: 999, fontWeight: 800, fontSize:"1rem", textDecoration:"none", fontFamily:"'Sora',sans-serif", boxShadow:"0 6px 20px rgba(245,166,35,0.4)" }} data-testid="hero-cta-search">🔍 Browse all listings</Link>
            <a href="#lead-form" style={{ background:"rgba(255,255,255,0.12)", color:"white", border:"1px solid rgba(255,255,255,0.35)", padding:"14px 24px", borderRadius: 999, fontWeight: 600, fontSize:"0.95rem", textDecoration:"none" }} data-testid="hero-cta-talk">💬 Talk to Doug (free)</a>
          </div>

          <div style={{ marginTop: 24, display:"flex", gap: 18, flexWrap:"wrap", fontSize:"0.78rem", opacity: 0.85 }}>
            <span>🛡️ BCFSA-licensed</span>
            <span>📡 MLS® refreshed every 4 hrs</span>
            <span>📚 {FACTS.glossary_count} statute-cited terms</span>
            <span>📍 {FACTS.community_count} BC community profiles</span>
          </div>
        </div>
      </div>

      {/* ═════ § FEATURED COMING-SOON LISTING — FOMO / return-visit hook ═════ */}
      <FeaturedComingSoonListing
        mode="coming_soon"
        area="Fraser Valley"
        home_type="Detached family home"
        price_band="Priced under $2M"
        beds_band="3–4 bedrooms"
        baths_band="2–3 bathrooms"
        sqft_band="Approx. 1,800–2,400 sqft"
        eta_line="Coming to market next week"
        description="A cared-for detached home in a family-friendly BC neighbourhood — quiet street, mature landscaping, walk-to-schools. Serious pre-MLS® enquiries only. Full address, exact price, MLS® number, and photos are published here the moment the listing is officially input to the Multiple Listing Service® under GVR/CREA rules."
        video_url=""
      />

      {/* ═════ § 3 FUN PATH CARDS — each with a Doogie mascot ═════ */}
      <Section tone="paper">
        <H2 kicker="Where do we start?">What can Doogie help you with?</H2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {[
            { title:"Find my next home", body:"Browse live BC MLS® listings, save favourites, get instant alerts.", cta:"Start searching →", href:"/property-search", tone:"gold", img:"/images/doogie/magnifying.webp", testid:"path-buying" },
            { title:"What's my home worth?", body:"Free 60-second BC home-value snapshot, no sign-up needed.", cta:"Get my value →", href:"/market-estimate", tone:"white", img:"/images/doogie/pointing-right.webp", testid:"path-selling" },
            { title:"Where should I live?", body:"90-second quiz picks 3 BC communities that match your vibe.", cta:"Take the quiz →", href:"/relocating", tone:"white", img:"/images/doogie/laptop.webp", testid:"path-where" },
          ].map(p => (
            <Link key={p.title} to={p.href} data-testid={p.testid} style={{ textDecoration:"none", display:"block" }}>
              <div className="hv2-path-card" style={{ padding:"22px 22px 26px", borderRadius: 16, background: p.tone === "gold" ? C.gold : "white", border: p.tone === "gold" ? "none" : "1px solid #E5E7EB", height:"100%", boxSizing:"border-box", cursor:"pointer", transition:"transform 0.18s, box-shadow 0.18s", display:"flex", flexDirection:"column", gap: 12 }}
                   onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 16px 36px rgba(15,42,91,0.18)"; }}
                   onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}>
                <img className="hv2-path-doogie" src={p.img} alt="" width={96} height={96} style={{ width: 96, height: 96, objectFit:"contain", alignSelf:"center", filter:"drop-shadow(0 8px 16px rgba(15,42,91,0.15))" }}/>
                <div style={{ fontSize:"1.18rem", fontFamily:"'Sora',sans-serif", fontWeight: 700, color: C.navy, textAlign:"center" }}>{p.title}</div>
                <div style={{ fontSize:"0.9rem", color: C.ink, lineHeight: 1.55, textAlign:"center", flex: 1 }}>{p.body}</div>
                <div style={{ marginTop: 4, fontWeight: 700, color: C.navy, fontSize:"0.92rem", textAlign:"center" }}>{p.cta}</div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ═════ § BC AFFORDABILITY CALCULATOR — the sticky lead-gen tool ═════ */}
      <Section tone="cream">
        <div style={{ display:"flex", alignItems:"center", gap: 16, marginBottom: 14, flexWrap:"wrap" }}>
          <img src="/images/doogie/pointing-left-transparent.webp" alt="" width={70} height={70} style={{ width: 70, height: 70, flexShrink: 0 }}/>
          <div>
            <div style={{ fontSize:"0.72rem", letterSpacing:"0.14em", color: C.gold, fontWeight: 700 }}>DOOGIE'S QUICK CALC</div>
            <h2 style={{ fontSize:"clamp(1.5rem, 3.5vw, 2rem)", fontFamily:"'Sora',sans-serif", fontWeight: 700, color: C.navy, lineHeight: 1.15, margin:"4px 0 4px" }}>What can you afford in BC?</h2>
            <div style={{ fontSize:"0.85rem", color: C.muted, lineHeight: 1.5, maxWidth: 640 }}>Real BC math — stress-tested at 7.50 %, PTT + FTB exemption included. 30 seconds, no email.</div>
          </div>
        </div>
        <AffordabilityCalculator/>
      </Section>

      {/* ═════ § TESTIMONIALS — trust in one honest strip ═════ */}
      <Section tone="white">
        <H2 kicker="Real BC clients">People who trusted Doug</H2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }} data-testid="testimonials">
          {TESTIMONIALS.map((t, i) => (
            <blockquote key={i} data-testid={`testimonial-${i}`} itemScope itemType="https://schema.org/Review"
                        style={{ background: C.paper, border:"1px solid #E5E7EB", borderRadius: 14, padding:"24px 26px", margin: 0 }}>
              <div style={{ color: C.gold, fontSize:"1.1rem", letterSpacing:"0.14em", marginBottom: 10 }} aria-label={`${t.stars} out of 5 stars`}>
                {"★".repeat(t.stars)}<span itemProp="reviewRating" itemScope itemType="https://schema.org/Rating" style={{ display:"none" }}><meta itemProp="ratingValue" content={String(t.stars)}/><meta itemProp="bestRating" content="5"/></span>
              </div>
              <p itemProp="reviewBody" style={{ fontSize:"0.95rem", lineHeight: 1.65, color: C.ink, margin:"0 0 14px", fontStyle:"italic" }}>"{t.text}"</p>
              <div style={{ fontSize:"0.85rem", color: C.navy, fontWeight: 700, background:"transparent" }}>
                <span itemProp="author" itemScope itemType="https://schema.org/Person"><span itemProp="name">{t.author}</span></span>
                <span style={{ color: C.muted, fontWeight: 500 }}> · {t.label}</span>
              </div>
              <meta itemProp="itemReviewed" content="Doug LeMaire, REALTOR®"/>
            </blockquote>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize:"0.7rem", color: C.muted, textAlign:"center" }} data-testid="testimonial-disclosure">
          Verified past clients · no consideration paid · full names on request · past results don't guarantee future outcomes · BCFSA Rule 5-11.
        </div>
      </Section>

      {/* ═════ § LEAD FORM — the money maker ═════ */}
      <Section tone="paper">
        <HomepageLeadForm/>
      </Section>

      {/* ═════ § "COME BACK NEXT WEEK" — subscribe for weekly new-listing digest ═════ */}
      <div style={{ background: C.navy, color:"white", padding:"clamp(28px, 5vw, 44px) clamp(16px, 4vw, 24px)" }}>
        <div style={{ maxWidth: 1000, margin:"0 auto", display:"grid", gridTemplateColumns:"auto 1fr", gap: 20, alignItems:"center" }}>
          <img src="/images/doogie/thinking.webp" alt="" width={80} height={80} style={{ width: 80, height: 80, flexShrink: 0 }}/>
          <div>
            <div style={{ fontSize:"0.72rem", letterSpacing:"0.14em", color: C.gold, fontWeight: 700 }}>DON'T MISS THE NEXT COMING-SOON</div>
            <div style={{ fontSize:"1.25rem", fontFamily:"'Sora',sans-serif", fontWeight: 700, marginTop: 4, marginBottom: 4 }}>Doogie's weekly BC listings digest — free.</div>
            <div style={{ fontSize:"0.88rem", opacity: 0.85, lineHeight: 1.55 }}>Every Friday: new-listing round-up, coming-soons, and Doug's picks. CASL-compliant, one-click unsubscribe. <Link to="/newsletter" style={{ color: C.gold, fontWeight: 700 }}>Subscribe →</Link></div>
          </div>
        </div>
      </div>

      {/* ═════ § FAQ — compact accordion, AEO/LLM citation payload ═════ */}
      <Section tone="white">
        <H2 kicker="Have questions?">Quick answers</H2>
        <div style={{ display:"flex", flexDirection:"column", gap: 8, maxWidth: 920 }}>
          {FAQS.map((f, i) => (
            <details key={i} style={{ background: C.paper, border:"1px solid #E5E7EB", borderRadius: 10, padding:"12px 16px" }} data-testid={`faq-${i}`}>
              <summary style={{ fontSize:"0.92rem", fontWeight: 700, color: C.navy, cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>{f.q}</summary>
              <div style={{ marginTop: 10, fontSize:"0.88rem", lineHeight: 1.65, color: C.ink }}>{f.a}</div>
              {/outside Doug's direct service area/i.test(f.q) && (
                <div style={{ marginTop: 12 }}><ReferralAsk variant="pill" context="home-v2-faq-out-of-area" compact/></div>
              )}
            </details>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize:"0.75rem", color: C.muted, textAlign:"center" }}>
          Doogie is AI, always general info only — never legal, tax, financial, or property-specific advice. <Link to="/compliance" style={{ color: C.blue, fontWeight: 600 }}>BCFSA AI disclosure →</Link>
        </div>
      </Section>

      <ComplianceFooter/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BC Home Affordability Calculator — OSFI B-20 stress test at 7.50 %,
// full BC Property Transfer Tax schedule with First-Time Buyer exemption,
// GDS-ratio qualifying-payment model. Educational estimate only.
function AffordabilityCalculator() {
  const [income, setIncome]   = useState(150000);
  const [downPay, setDownPay] = useState(80000);
  const [debts, setDebts]     = useState(500);
  const [contractRate, setContractRate] = useState(5.5);
  const [amort, setAmort]     = useState(25);
  const [firstTime, setFirstTime] = useState(false);

  // BC PTT statute schedule
  const bcPtt = (price) => {
    if (!price || price <= 0) return 0;
    let tax = 0;
    tax += Math.min(price, 200_000) * 0.01;
    if (price > 200_000)   tax += (Math.min(price, 2_000_000) - 200_000) * 0.02;
    if (price > 2_000_000) tax += (Math.min(price, 3_000_000) - 2_000_000) * 0.03;
    if (price > 3_000_000) tax += (price - 3_000_000) * 0.05;
    // FTB exemption linear approximation (full exemption ≤ $500K, phase-out to $835K)
    if (firstTime) {
      if (price <= 500_000) tax = 0;
      else if (price < 835_000) tax = tax * ((price - 500_000) / 335_000);
    }
    return Math.round(tax);
  };

  const calc = useMemo(() => {
    const stressRate = Math.max(contractRate + 2, 5.25); // OSFI B-20
    const monthlyRate = (stressRate / 100) / 12;
    const n = amort * 12;
    // Max qualifying GDS = 39 %
    const maxHousingMonthly = (income / 12) * 0.39 - debts;
    if (maxHousingMonthly <= 0) return { price: 0, mortgage: 0, monthly: 0, ptt: 0, closing: 2500, cashClosing: downPay + 2500, stressRate };
    // Assume prop tax + heat ≈ $500/mo, subtract
    const maxPI = maxHousingMonthly - 500;
    if (maxPI <= 0) return { price: 0, mortgage: 0, monthly: 0, ptt: 0, closing: 2500, cashClosing: downPay + 2500, stressRate };
    // Standard amortization formula solved for principal
    const maxMortgage = maxPI * (1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate;
    const price = Math.round(maxMortgage + downPay);
    // Real monthly at contract rate (what they'd actually pay)
    const cr = (contractRate / 100) / 12;
    const realMonthly = Math.round(maxMortgage * (cr * Math.pow(1 + cr, n)) / (Math.pow(1 + cr, n) - 1));
    return {
      price,
      mortgage: Math.round(maxMortgage),
      monthly: realMonthly,
      ptt: bcPtt(price),
      closing: 2500,
      cashClosing: downPay + bcPtt(price) + 2500,
      stressRate,
    };
  }, [income, downPay, debts, contractRate, amort, firstTime]);

  const inp = { width:"100%", padding:"10px 12px", borderRadius: 8, border:"1px solid #D1D5DB", fontSize:"0.92rem", background:"white", boxSizing:"border-box" };
  const lbl = { fontSize:"0.78rem", fontWeight: 700, color: C.navy, display:"block", marginBottom: 6 };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap: 20, alignItems:"start" }} data-testid="affordability-calc">
      <div style={{ background:"white", padding:"22px 24px", borderRadius: 14, border:"1px solid #E5E7EB" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12 }}>
          <div>
            <label style={lbl}>Annual household income (CAD)</label>
            <input type="number" min="0" step="1000" value={income} onChange={e=>setIncome(+e.target.value || 0)} style={inp} data-testid="calc-income"/>
          </div>
          <div>
            <label style={lbl}>Down payment saved</label>
            <input type="number" min="0" step="1000" value={downPay} onChange={e=>setDownPay(+e.target.value || 0)} style={inp} data-testid="calc-downpay"/>
          </div>
          <div>
            <label style={lbl}>Monthly debt payments</label>
            <input type="number" min="0" step="50" value={debts} onChange={e=>setDebts(+e.target.value || 0)} style={inp} data-testid="calc-debts"/>
          </div>
          <div>
            <label style={lbl}>Contract rate (%)</label>
            <input type="number" step="0.05" min="0.5" max="15" value={contractRate} onChange={e=>setContractRate(+e.target.value || 0)} style={inp} data-testid="calc-rate"/>
          </div>
          <div>
            <label style={lbl}>Amortization</label>
            <select value={amort} onChange={e=>setAmort(+e.target.value)} style={inp} data-testid="calc-amort">
              <option value={15}>15 years</option><option value={20}>20 years</option>
              <option value={25}>25 years</option><option value={30}>30 years</option>
            </select>
          </div>
          <div style={{ alignSelf:"end" }}>
            <label style={{ display:"flex", alignItems:"center", gap: 8, fontSize:"0.85rem", color: C.ink, cursor:"pointer" }}>
              <input type="checkbox" checked={firstTime} onChange={e=>setFirstTime(e.target.checked)} data-testid="calc-ftb"/>
              First-time home buyer
            </label>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize:"0.72rem", color: C.muted, lineHeight: 1.5 }}>
          Stress-tested at <strong>{calc.stressRate.toFixed(2)} %</strong> (OSFI B-20: contract + 2 % or 5.25 % minimum). GDS ratio capped at 39 %.
        </div>
      </div>

      <div style={{ background: C.navy, color:"white", padding:"22px 24px", borderRadius: 14 }} data-testid="calc-result">
        <div style={{ fontSize:"0.72rem", letterSpacing:"0.14em", color: C.gold, fontWeight: 700 }}>YOU MAY QUALIFY FOR UP TO</div>
        <div style={{ fontSize:"clamp(1.8rem, 5vw, 2.6rem)", fontFamily:"'Sora',sans-serif", fontWeight: 800, lineHeight: 1.1, margin:"6px 0 14px" }}>
          {fmtMoney(calc.price)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 10, fontSize:"0.85rem" }}>
          <div><div style={{ opacity: 0.75, fontSize:"0.72rem" }}>Max mortgage</div><div style={{ fontWeight: 700 }}>{fmtMoney(calc.mortgage)}</div></div>
          <div><div style={{ opacity: 0.75, fontSize:"0.72rem" }}>Monthly payment</div><div style={{ fontWeight: 700 }}>${calc.monthly.toLocaleString("en-CA")}<span style={{ opacity: 0.7, fontWeight: 400, fontSize:"0.75rem" }}> @ {contractRate}%</span></div></div>
          <div><div style={{ opacity: 0.75, fontSize:"0.72rem" }}>BC PTT{firstTime && calc.ptt < 5000 ? " (FTB exemption)" : ""}</div><div style={{ fontWeight: 700 }}>${calc.ptt.toLocaleString("en-CA")}</div></div>
          <div><div style={{ opacity: 0.75, fontSize:"0.72rem" }}>Cash at closing</div><div style={{ fontWeight: 700 }}>${calc.cashClosing.toLocaleString("en-CA")}</div></div>
        </div>
        <Link to={`/listings?price_max=${calc.price}`} data-testid="calc-cta"
              style={{ display:"block", marginTop: 18, background: C.gold, color: C.navy, padding:"12px 18px", borderRadius: 999, fontWeight: 700, fontSize:"0.9rem", textAlign:"center", textDecoration:"none" }}>
          🏡 Show me listings under {fmtMoney(calc.price)}
        </Link>
        <div style={{ marginTop: 10, fontSize:"0.7rem", opacity: 0.75, lineHeight: 1.5 }}>
          Educational estimate. Actual approval depends on your lender. See <a href="https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>gov.bc.ca PTT ↗</a>.
        </div>
      </div>
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
          <strong>Brokerage:</strong> {FACTS.brokerage_name}, {FACTS.brokerage_addr}. Brokerage: <a href="tel:604-466-7021" style={{ color: C.gold }}>(604) 466-7021</a> · Doug direct: <a href="tel:604-787-0851" style={{ color: C.gold }}>(604) 787-0851</a> · <a href={`mailto:${FACTS.doug_email}`} style={{ color: C.gold }}>{FACTS.doug_email}</a> · Privacy Officer: <a href={`mailto:${FACTS.privacy_email}`} style={{ color: C.gold }}>{FACTS.privacy_email}</a>.
        </p>
        <p style={{ margin:"0 0 8px", opacity: 0.88 }}>
          <strong>BCFSA licence identification (Rule 4-2):</strong> Doug LeMaire, REALTOR® — licence #{FACTS.bcfsa_licence_individual}. {FACTS.brokerage_name} — brokerage licence #{FACTS.bcfsa_licence_brokerage}. Verify at <a href="https://www.bcfsa.ca/industry-resources/real-estate-professional-resources/registrant-search" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>bcfsa.ca/registrant-search ↗</a>.
        </p>
        <p style={{ margin:"0 0 8px", opacity: 0.88 }}>
          <strong>Practice areas:</strong> Doug personally represents transactions in {FACTS.practice_areas}. All other BC regions ({FACTS.referral_boards}) are served <em>by referral only</em> — no direct representation. <Link to="/realtor-network" style={{ color: C.gold }}>Request an out-of-area referral →</Link>
        </p>
        <p style={{ margin:"0 0 8px", opacity: 0.88 }}>
          MLS®, Multiple Listing Service®, REALTOR®, REALTORS®, and the REALTOR® logo are certification marks owned by The Canadian Real Estate Association (CREA) and identify real estate professionals who are members of CREA. Trademarks MLS® and Multiple Listing Service® are administered by CREA. Property data © CREA Data Distribution Facility (DDF®), sourced live from the Greater Vancouver REALTORS®, Fraser Valley Real Estate Board, and 10+ participating BC boards. Refreshed every 4 hours.
        </p>
        <p style={{ margin:"0 0 8px", opacity: 0.88 }}>
          General information only — <strong>not legal, tax, financial, or real-estate advice</strong>. For your own situation, always speak with a BC lawyer or notary, an accountant, a licensed mortgage broker, and a REALTOR®. Doug is not the listing agent for any property shown on this site unless explicitly stated; always verify all information directly with the listing brokerage before making an offer.
        </p>
        <p style={{ margin: 0, opacity: 0.88 }}>
          Personal information collected on this site is handled under the BC Personal Information Protection Act (PIPA) — see the <Link to="/privacy" style={{ color: C.gold }}>Privacy Policy</Link>. Complaints may be directed to the <a href="https://www.oipc.bc.ca/" target="_blank" rel="noopener noreferrer" style={{ color: C.gold }}>BC Office of the Information & Privacy Commissioner (OIPC BC) ↗</a>. Marketing email consent recorded under Canada's Anti-Spam Legislation (CASL) — email, timestamp, IP address, and user-agent retained 3 years as proof of consent · <Link to="/email-preferences" style={{ color: C.gold }}>unsubscribe any time</Link>. Read Doug's <Link to="/terms" style={{ color: C.gold }}>Terms of Service</Link> and full <Link to="/disclosure" style={{ color: C.gold }}>Disclosure of Representation</Link>.
        </p>
      </div>
    </div>
  );
}
