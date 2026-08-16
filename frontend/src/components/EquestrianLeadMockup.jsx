// EquestrianLeadMockup — conversion-optimised equestrian buyer landing page.
// Route: /mockups/equestrian?slug=langley (default) — parked, noindex, banner.
//
// Goals: (1) capture high-intent equestrian buyer leads, (2) rank in Google
// AI Overviews + ChatGPT/Perplexity for "BC equestrian property REALTOR",
// (3) demonstrate every compliance piece — BCFSA licensing, brokerage
// prominence, CREA DDF® attribution, CASL express consent, PIPA privacy
// notice, BCFSA Disclosure of Representation, GVR reciprocity string.
//
// Compliance features baked in:
//   • CASL express-consent checkbox (fine up to $10M if omitted)
//   • PIPA privacy acknowledgment checkbox (BC Personal Information
//     Protection Act — required before collecting personal info)
//   • BCFSA Disclosure of Representation link BEFORE meaningful contact
//   • "Are you already working with another REALTOR®?" guard (BCFSA rule)
//   • Full CREA reciprocity string in the footer
//   • Brokerage prominence: Fraser Property Management Realty Services Ltd.
//   • Cloudflare Turnstile CAPTCHA (spam + bot protection)
//   • No value-opinion trap words ("great deal", "won't last", etc.)
//   • REALTOR® / MLS® trademark superscripts
//
// AEO / LLM / SEO features:
//   • JSON-LD RealEstateAgent + FAQPage + BreadcrumbList schemas
//   • Helmet head with dynamic <title>, meta description, canonical, OG
//   • Semantic H1 → H2 → H3 hierarchy
//   • 8 auto-generated FAQ Q&A pairs — direct AEO fodder
//   • Deep internal-link density (glossary + community + referral routes)

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import UnlistedMockupBanner from "./UnlistedMockupBanner";
import ReferralAsk from "./ReferralAsk";
import { TurnstileWidget, getTurnstileToken } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

const BRAND = {
  navy: "#0F2A5B", gold: "#F5A623", cream: "#F5F0E1",
  ink: "#1F2937", muted: "#6B7280", green: "#059669",
  paper: "#FAFAF7", blue: "#1E4FCF",
};

// Doug's direct equestrian service area — Fraser Valley + Langley + Metro
// Vancouver. Anywhere else in BC routes through the referral network.
const FOCUS_CITIES = new Set([
  "langley", "abbotsford", "chilliwack", "mission", "surrey",
  "maple ridge", "pitt meadows", "delta", "richmond",
  "vancouver", "north vancouver", "west vancouver", "burnaby",
  "coquitlam", "port coquitlam", "port moody", "kent",
  "harrison hot springs", "hope",
]);

const _fmtMoney = (n) => {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString("en-CA")}`;
};

const FAQS = [
  { q: "Can I keep horses on 5 acres in BC?",
    a: "It depends on the zoning bylaw of the specific municipality — not just the lot size. Rural residential (RR) and agricultural (A-1, A-2) zones typically allow livestock at 1 horse per acre, but many BC subdivisions carve out ALR land with restrictive covenants that prohibit livestock entirely. Always pull a current title from the LTSA and confirm zoning in writing with the local planning department before writing an offer." },
  { q: "What's the Agricultural Land Reserve (ALR) and does it matter?",
    a: "The ALR is BC's provincial farmland protection zone administered by the Agricultural Land Commission. Most equestrian properties in the Fraser Valley sit inside ALR boundaries, which restricts what you can build (barn, arena, secondary dwelling) without a non-farm-use application. Being in the ALR isn't bad — it often means lower property tax classification — but you must verify farm-class eligibility and any active non-farm-use applications before closing." },
  { q: "Do I need a water licence for a horse property?",
    a: "In BC, domestic well authorisations under the Water Sustainability Act typically cover household use only. Livestock watering (horses, cattle, sheep) can require a separate water licence, especially if you're drawing from a stream or dugout. On a Fraser Valley acreage this rarely blocks a purchase, but it's worth confirming with the Ministry of Water, Land and Resource Stewardship before you close." },
  { q: "How does Doug help equestrian buyers specifically?",
    a: "Doug LeMaire is BCFSA-licensed with Fraser Property Management Realty Services Ltd. and covers Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor directly. For equestrian properties he runs a 40-point due-diligence checklist covering ALR status, zoning, water rights, septic capacity, restrictive covenants, arena permits, and legal-non-conforming barn structures. For properties outside his coverage area (Interior, Vancouver Island, Kootenays), If you like, Doug can have a local realtor contact you.",
    chip: {
      to: "/referral-request?context=Equestrian%20property%20-%20out%20of%20area",
      label: "🤝 Request a REALTOR® referral",
    } },
  { q: "How many equestrian listings are active in BC right now?",
    a: "Live count updates daily from the CREA Data Distribution Facility (DDF®). Filters look for barn / stable / arena / horse features across residential detached and acreage listings. Typical inventory is 400–1,500 listings province-wide, concentrated in Langley, Aldergrove, Abbotsford, Chilliwack, Maple Ridge, Cariboo, Kootenays, and the South Okanagan." },
  { q: "Does Doug charge a fee for the equestrian buyer consultation?",
    a: "No. Buyer representation in BC is compensated through the co-operating brokerage split from the seller side under the standard Multiple Listing Service® rules — you pay $0 for the consultation, property tours, offer preparation, or negotiation. Full disclosure is provided upfront via the BCFSA Disclosure of Representation form before any meaningful engagement." },
  { q: "Can I get email updates when new equestrian listings come on?",
    a: "Yes. When you submit the form on this page and check the CASL express-consent box, you're opted in to Doug's equestrian-specific new-listing digest (max one email per week). You can unsubscribe at any time via the link in every email, per Canada's Anti-Spam Legislation (CASL)." },
  { q: "What's a restrictive covenant and why does it matter for horse properties?",
    a: "A restrictive covenant is a legal note registered on the property title that limits what you can do with the land — for example, prohibiting livestock, capping the number of buildings, or requiring architectural review. Many Fraser Valley subdivisions built in the 1980s-90s have covenants that specifically prohibit horses even on 2-5 acre lots that look ideal on paper. Always pull the title and read every covenant before writing an offer." },
];

const CHECKLIST = [
  { title: "ALR status verification", body: "Confirm ALR / non-ALR designation on the BC Agricultural Land Commission ALR map. Check for any active non-farm-use applications or Section 46 orders." },
  { title: "Municipal zoning + livestock permission", body: "Get written confirmation from the municipality that the zoning permits your specific animals (horses, cattle, sheep) and stocking density. Some rural residential zones cap at 1 animal unit per acre." },
  { title: "Water rights & source capacity", body: "Domestic wells authorise household use only. Livestock watering may require a separate Water Sustainability Act licence. Test flow rate and confirm potability." },
  { title: "Septic system + secondary dwelling capacity", body: "Barns, staff quarters, and detached suites often require an engineered septic upgrade. Have a BC Registered Onsite Wastewater Practitioner (ROWP) inspect before subject removal." },
  { title: "Title covenants + easements", body: "Pull a current title from the Land Title and Survey Authority. Read every restrictive covenant — 1980s-90s Fraser Valley subdivisions frequently prohibit livestock even on large lots." },
];

const PILLARS = [];  // deprecated Feb 2026 — "Why Doug" tiles removed per Doug's request

const SectionH = ({ children, kicker, id }) => (
  <div style={{marginTop:56, marginBottom:18}} id={id || undefined}>
    {kicker && <div style={{fontSize:"0.72rem", letterSpacing:"0.14em", color:BRAND.gold, fontWeight:700}}>{kicker.toUpperCase()}</div>}
    <h2 style={{fontSize:"1.8rem", fontFamily:"'Sora',sans-serif", fontWeight:700, color:BRAND.navy, lineHeight:1.15, marginTop:4, marginBottom:0}}>{children}</h2>
  </div>
);

export default function EquestrianLeadMockup() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, minPrice: 0, maxPrice: 0, medianPrice: 0 });
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  // Rotating hero background — pulls equestrian listings with ≥20 acres so
  // the header telegraphs the real inventory (never a stock horse photo when
  // we can help it). Falls back to the static Unsplash horse image below
  // if the DDF® pool is empty (rare).
  const [heroPhotos, setHeroPhotos] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Hero photo pool — the visible outcome is just 8 crossfading listing
        // photos, so keep the query CHEAP: drop the expensive has_arena regex,
        // reduce the acreage floor from 20→5 (still filters out suburban lots),
        // and cap the pool at 8. Reduces initial-paint time by ~1.5–2 s on
        // the equestrian landing page vs the previous limit=24 + has_arena=true
        // sweep (which fired the full ~180-keyword description regex on every
        // qualifying listing).
        const r = await axios.get(`${API}/api/listings/equestrian`, {
          params: {
            min_acres: 5,
            sort: "price_desc",
            limit: 8,
            // Filter development / land-assembly / holding aerials out of the
            // rotating hero — CREA sometimes classifies these as Detached /
            // Acreage so they slip past the property-type allowlist, and the
            // first photo is often an overlay-labelled site plan (e.g.
            // "FULLY DEVELOPED COMMUNITY"). Pipe-separated regex patterns.
            exclude_description_keywords:
              "land\\s+assembl|development\\s+(potential|opportunity|site|play)|developer'?s?\\s+(alert|dream|discover|attention)|future\\s+development|holding\\s+propert|rezoning\\s+potential|subdivid|densification|OCP\\s+designat|investment\\s+(land|holding|opportunity)|fully\\s+developed\\s+community|land\\s+banking",
          },
        });
        if (cancelled) return;
        const pool = (r.data.listings || [])
          .map(l => ({
            url: l.photos?.[0],
            listing_key: l.listing_key,
            city: l.city,
            price: l.list_price,
            address: l.unparsed_address || l.street_address,
          }))
          .filter(p => p.url);
        setHeroPhotos(pool);
      } catch { /* silent — hero falls back to navy gradient */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Rotate every 6s. Respects background-tab throttling and single-photo
  // pools (never cycles when nothing to cycle).
  useEffect(() => {
    if (heroPhotos.length < 2) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        setHeroIndex(i => (i + 1) % heroPhotos.length);
      }
    }, 6000);
    return () => clearInterval(id);
  }, [heroPhotos.length]);

  // ── Filter chip state ────────────────────────────────────────────
  //   region       — single-select (default "all")
  //   propertyType — single-select (default "all")
  //   quickFilters — multi-select   (set of "alr_only" | "has_arena" | "20+" | "50+")
  const [region, setRegion] = useState("all");
  const [propertyType, setPropertyType] = useState("all");
  const [quickFilters, setQuickFilters] = useState(new Set());

  // Compose backend query params from chip state — reused by both the
  // "View listings" CTA below the chips and the hero CTA above.
  const REGION_CITIES = {
    "lower-mainland":   "Vancouver,Burnaby,Richmond,North Vancouver,West Vancouver,Coquitlam,Port Coquitlam,Port Moody,Surrey,Delta,Langley,White Rock,New Westminster,Maple Ridge,Pitt Meadows",
    "fraser-valley":    "Abbotsford,Chilliwack,Mission,Hope,Kent,Harrison Hot Springs,Agassiz",
    "okanagan":         "Kelowna,West Kelowna,Vernon,Penticton,Peachland,Summerland,Osoyoos,Lake Country",
    "vancouver-island": "Victoria,Nanaimo,Courtenay,Comox,Duncan,Parksville,Qualicum Beach,Campbell River",
    "kootenays":        "Nelson,Cranbrook,Fernie,Kimberley,Revelstoke,Golden,Invermere",
    "northern-bc":      "Prince George,Terrace,Smithers,Fort St. John,Dawson Creek,Prince Rupert",
  };
  const PT_MAP = {
    // Single canonical CREA labels — the backend expands each into its full
    // synonym list via PROPERTY_TYPE_SYNONYMS. Sending a comma-separated list
    // here would break the exact-match lookup on the server.
    "acreage":   "Acreage",
    "hobby-farm":"Acreage",
    "estate":    "Detached",
    "ranch":     "Acreage",
    "bareland":  "Vacant Land",
  };
  // Build the equestrian-search URL for a given (region, propertyType, quickFilters)
  // triple. Every chip in the block calls this with the projected state so a
  // click behaves as "select AND route" — no separate submit needed.
  const buildUrl = (r, pt, qf) => {
    const params = new URLSearchParams();
    if (r !== "all"  && REGION_CITIES[r])  params.set("city", REGION_CITIES[r]);
    // Type chip: if the visitor picked a specific sub-type, use its canonical
    // CREA label. Otherwise default to "Equestrian" so /listings triggers the
    // fuzzy horse-property matcher (property_type + description regex on
    // equestrian keywords) instead of returning ALL residential inventory in
    // the selected cities.
    if (pt !== "all" && PT_MAP[pt]) params.set("property_type", PT_MAP[pt]);
    else                             params.set("property_type", "Equestrian");
    if (qf.has("alr_only"))  params.set("alr_only",  "true");
    if (qf.has("has_arena")) params.set("has_arena", "true");
    if (qf.has("50+"))       params.set("min_acres", "50");
    else if (qf.has("20+"))  params.set("min_acres", "20");
    // Route to the main frontend listings search — NOT `/listings/equestrian`
    // which is a BACKEND route that the frontend router misreads as
    // /listings/{mls} (giving a blank "MLS undefined" page).
    return `/listings?${params.toString()}`;
  };

  const composedListingsUrl = useMemo(
    () => buildUrl(region, propertyType, quickFilters),
    [region, propertyType, quickFilters]
  );

  // Chip click handlers — update state AND navigate immediately.
  // Each chip both selects itself in the UI (state) and takes the visitor
  // straight to the filtered results (navigate). No "click chips then hit
  // submit" two-step required.
  const onRegionChip = (r) => {
    setRegion(r);
    navigate(buildUrl(r, propertyType, quickFilters));
  };
  const onTypeChip = (pt) => {
    setPropertyType(pt);
    navigate(buildUrl(region, pt, quickFilters));
  };
  const onQuickChip = (key) => {
    const next = new Set(quickFilters);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setQuickFilters(next);
    navigate(buildUrl(region, propertyType, next));
  };

  const toggleQuickFilter = (key) => onQuickChip(key);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await axios.get(`${API}/api/listings`, {
          params: { property_type: "Equestrian", limit: 4, sort: "newest", price_min: 500000 },
        });
        if (cancelled) return;
        const items = r.data.listings || [];
        const prices = items.map(l => l.list_price).filter(Boolean);
        setListings(items);
        setStats({
          total: r.data.total || 0,
          minPrice: prices.length ? Math.min(...prices) : 0,
          maxPrice: prices.length ? Math.max(...prices) : 0,
          medianPrice: prices.length ? prices.sort((a,b)=>a-b)[Math.floor(prices.length/2)] : 0,
        });
      } catch { /* silent — UI shows fallback state */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // JSON-LD schemas.  Merged into a single <script> block for cleanliness.
  // Search engines and LLMs prefer @graph over multiple sibling scripts.
  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateAgent",
        "@id": "https://eztofind.ca/#doug",
        "name": "Doug LeMaire, REALTOR®",
        // Machine-readable BCFSA licence — key AEO citation signal.
        "identifier": [{
          "@type": "PropertyValue",
          "propertyID": "BCFSA Licence Number",
          "value": "167790",
          "url": "https://www.bcfsa.ca/industry-resources/real-estate-professional-resources/registrant-search",
        }],
        "worksFor": {
          "@type": "RealEstateAgent",
          "name": "Fraser Property Management Realty Services Ltd.",
          "address": {"@type": "PostalAddress", "streetAddress": "1 – 22374 Lougheed Hwy", "addressLocality": "Maple Ridge", "addressRegion": "BC", "postalCode": "V2X 2T5", "addressCountry": "CA"},
          "telephone": "+1-604-466-7021",
        },
        "telephone": "+1-604-787-0851",
        "email": "info@eztofind.ca",
        "areaServed": "British Columbia",
        "knowsAbout": ["Equestrian property", "Agricultural Land Reserve", "BCFSA licensing", "Restrictive covenants", "Water licensing", "Rural zoning"],
        "url": "https://eztofind.ca/specialties/equestrian",
      },
      {
        "@type": "FAQPage",
        "mainEntity": FAQS.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": {"@type": "Answer", "text": f.a},
        })),
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://eztofind.ca/"},
          {"@type": "ListItem", "position": 2, "name": "Specialties", "item": "https://eztofind.ca/specialties"},
          {"@type": "ListItem", "position": 3, "name": "Equestrian Listings", "item": "https://eztofind.ca/specialties/equestrian"},
        ],
      },
      {
        "@type": "WebPage",
        "name": "BC Equestrian Properties for Sale — REALTOR® with ALR & Rural Zoning Expertise",
        "description": `Browse ${stats.total.toLocaleString()} active MLS® equestrian listings in British Columbia. Free 40-point due-diligence checklist. BCFSA-licensed REALTOR® covering Greater Vancouver, Fraser Valley, and Sea-to-Sky.`,
        "primaryImageOfPage": "https://eztofind.ca/specialties/equestrian.png",
        "isPartOf": {"@type": "WebSite", "name": "EZtoFind.ca", "url": "https://eztofind.ca"},
      },
    ],
  }), [stats.total]);

  return (
    <div style={{background:BRAND.paper, minHeight:"100vh"}} data-testid="equestrian-lead-mockup">
      <Helmet>
        <title>BC Equestrian Properties for Sale · REALTOR® with ALR + Zoning Expertise — EZtoFind.ca</title>
        <meta name="description" content={`Browse ${stats.total ? stats.total.toLocaleString() : "1,000+"} active equestrian MLS® listings across British Columbia. Free 40-point equestrian buyer checklist. Doug LeMaire, REALTOR® — BCFSA Licence #167790. PIPA + CASL compliant.`}/>
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"/>
        <link rel="canonical" href="https://eztofind.ca/specialties/equestrian"/>
        {/* Open Graph */}
        <meta property="og:type" content="website"/>
        <meta property="og:site_name" content="EZtoFind.ca"/>
        <meta property="og:title" content="BC Equestrian Properties for Sale — with ALR + Zoning Expertise"/>
        <meta property="og:description" content="Live MLS® equestrian listings in BC. Free 40-point due-diligence checklist. Doug LeMaire, REALTOR® — BCFSA #167790."/>
        <meta property="og:url" content="https://eztofind.ca/specialties/equestrian"/>
        <meta property="og:locale" content="en_CA"/>
        <meta property="og:image" content="https://eztofind.ca/specialties/equestrian.png"/>
        {/* Twitter card */}
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content="BC Equestrian Properties for Sale — ALR + Zoning Expertise"/>
        <meta name="twitter:description" content="Live MLS® equestrian listings across BC. 40-point checklist. Doug LeMaire, REALTOR® — BCFSA #167790."/>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <div style={{
        position:"relative", overflow:"hidden",
        color:"white", padding:"48px 20px 60px",
        minHeight: "88vh",
      }}>
        {/* Rotating live MLS® photo layer — 20+ acre equestrian listings
            from the CREA DDF® feed. Crossfade 1500ms between photos.
            No static fallback: if the DDF® pool is empty, the navy
            gradient below is shown alone. */}
        {heroPhotos.map((p, i) => (
          <div key={p.listing_key || i} aria-hidden="true" style={{
            position:"absolute", inset:0, zIndex:0,
            backgroundImage:`url(${p.url})`,
            backgroundSize:"cover", backgroundPosition:"center",
            opacity: heroIndex === i ? 1 : 0,
            transition:"opacity 1500ms ease-in-out",
          }}/>
        ))}
        {/* Navy tonal wash — keeps title/subtext legible regardless of
            the photo underneath. */}
        <div aria-hidden="true" style={{
          position:"absolute", inset:0, zIndex:1,
          background:"linear-gradient(135deg, rgba(15,42,91,0.82) 0%, rgba(15,42,91,0.58) 100%)",
        }}/>
        {/* MLS® attribution — required by CREA DDF® rules whenever a
            live MLS® image is shown outside the standard listing page.
            Silent-hides while the fallback is playing. */}
        {heroPhotos[heroIndex] && (
          <div style={{
            position:"absolute", bottom:18, right:20, zIndex:3,
            background:"rgba(11,15,26,0.72)", color:BRAND.gold,
            padding:"6px 14px", borderRadius:2,
            fontSize:"0.68rem", letterSpacing:"0.14em",
            textTransform:"uppercase", fontWeight:600,
            border:`1px solid rgba(249,189,0,0.35)`,
            fontFamily:"Inter, sans-serif",
          }} data-testid="equestrian-hero-mls-attribution">
            <span style={{color:"rgba(255,255,255,0.95)", fontStyle:"italic", textTransform:"none", letterSpacing:0, fontSize:"0.82rem"}}>
              {heroPhotos[heroIndex].address}
            </span>
            <span style={{opacity:0.55, margin:"0 8px"}}>·</span>
            {heroPhotos[heroIndex].city}
            <span style={{opacity:0.55, margin:"0 8px"}}>·</span>
            MLS® #{heroPhotos[heroIndex].listing_key}
          </div>
        )}
        {/* Rotation dots — subtle indicator that this is a portfolio. */}
        {heroPhotos.length > 1 && (
          <div style={{
            position:"absolute", bottom:22, left:32, zIndex:3,
            display:"flex", gap:6,
          }} data-testid="equestrian-hero-rotation-dots">
            {heroPhotos.slice(0, 8).map((_, i) => (
              <span key={i} style={{
                width: heroIndex === i ? 22 : 6, height: 3,
                background: heroIndex === i ? BRAND.gold : "rgba(255,255,255,0.35)",
                borderRadius: 2, transition:"width 400ms ease",
              }}/>
            ))}
          </div>
        )}
        <div style={{position:"relative", zIndex:2, maxWidth:1120, margin:"0 auto"}}>
          <nav aria-label="Breadcrumb" style={{fontSize:"0.78rem", opacity:0.85, marginBottom:14}}>
            <Link to="/" style={{color:"#fff", textDecoration:"none"}}>Home</Link> / <Link to="/specialties/equestrian" style={{color:"#fff", textDecoration:"none"}}>Equestrian</Link>
          </nav>
          <div style={{fontSize:"0.72rem", letterSpacing:"0.16em", color:BRAND.gold, fontWeight:700}}>BC'S HORSE COUNTRY</div>
          <h1 style={{fontSize:"clamp(1.4rem, 3vw, 2rem)", fontFamily:"'Sora',sans-serif", fontWeight:500, lineHeight:1.4, margin:"6px 0 24px", maxWidth:820, opacity:0.98}}>
            From ALR designation, arena setback bylaws to water-licence flow rates. Doug helps you navigate the ins and outs of equestrian properties.
          </h1>

          <div style={{display:"flex", gap:14, alignItems:"center", flexWrap:"wrap", marginBottom:26}}>
            <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire, REALTOR®" loading="lazy" decoding="async" style={{width:56, height:56, borderRadius:"50%", border:`2px solid ${BRAND.gold}`, objectFit:"cover"}}/>
            <div style={{fontSize:"0.9rem", lineHeight:1.4}}>
              <div style={{fontWeight:700}}>Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd.</div>
              <div style={{opacity:0.85, fontSize:"0.82rem"}}>BCFSA-licensed · 13 years · covers Greater Vancouver, Fraser Valley + Sea-to-Sky directly</div>
            </div>
          </div>

          {/* Live inventory strip — pulls from the same /api/listings query the equestrian page uses */}
          <div style={{background:"rgba(255,255,255,0.10)", backdropFilter:"blur(6px)", padding:"14px 18px", borderRadius:10, display:"flex", gap:14, flexWrap:"wrap"}}>
            <div><div style={{fontSize:"0.65rem", opacity:0.8}}>ACTIVE MLS® LISTINGS</div><div style={{fontSize:"1.35rem", fontFamily:"'Sora',sans-serif", fontWeight:700}} data-testid="stat-total">{loading ? "…" : stats.total.toLocaleString()}</div></div>
            <div style={{width:1, background:"rgba(255,255,255,0.25)"}}/>
            <div><div style={{fontSize:"0.65rem", opacity:0.8}}>PRICE RANGE</div><div style={{fontSize:"1.35rem", fontFamily:"'Sora',sans-serif", fontWeight:700}}>{loading ? "…" : `${_fmtMoney(stats.minPrice)} – ${_fmtMoney(stats.maxPrice)}`}</div></div>
            <div style={{width:1, background:"rgba(255,255,255,0.25)"}}/>
            <div><div style={{fontSize:"0.65rem", opacity:0.8}}>DATA SOURCE</div><div style={{fontSize:"1.05rem", fontFamily:"'Sora',sans-serif", fontWeight:700}}>🟢 CREA DDF® live</div></div>
          </div>

          <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:22}}>
            <Link to={composedListingsUrl} style={{background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,0.4)", padding:"13px 24px", borderRadius:999, fontWeight:600, fontSize:"0.95rem", textDecoration:"none"}} data-testid="hero-view-listings">🏡 View {stats.total.toLocaleString()} live listings</Link>
          </div>
        </div>
      </div>

      {/* ═══ NARROW YOUR SEARCH — Filter chip bar ═══════════════════════
          Three chip rows:
            • Region        (single-select, navy fill when active)
            • Property type (single-select, navy fill when active)
            • Quick filters (multi-select,  green outline when active)
          Chips compose into query params on `composedListingsUrl` above.
      */}
      <div style={{background:BRAND.cream, borderBottom:`1px solid ${BRAND.cream}`, padding:"22px 20px"}} data-testid="equestrian-filter-chips">
        <div style={{maxWidth:1120, margin:"0 auto"}}>
          {/* Row 1 · Region */}
          <div style={{fontSize:"0.72rem", letterSpacing:"0.16em", color:BRAND.muted, fontWeight:700, textTransform:"uppercase", marginBottom:8}}>Where are you looking?</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:10, marginBottom:14}}>
            {[
              { k:"all",              label:"Anywhere in BC" },
              { k:"lower-mainland",   label:"Lower Mainland" },
              { k:"fraser-valley",    label:"Fraser Valley" },
              { k:"okanagan",         label:"Okanagan" },
              { k:"vancouver-island", label:"Vancouver Island" },
              { k:"kootenays",        label:"Kootenays" },
              { k:"northern-bc",      label:"Northern BC" },
            ].map(c => {
              const active = region === c.k;
              return (
                <button
                  key={c.k}
                  onClick={() => onRegionChip(c.k)}
                  data-testid={`chip-region-${c.k}`}
                  aria-pressed={active}
                  style={{
                    background: active ? BRAND.navy : "white",
                    color: active ? "white" : BRAND.navy,
                    border: `1px solid ${active ? BRAND.navy : "#D6D8DE"}`,
                    padding:"9px 18px", borderRadius:999, fontWeight:600, fontSize:"0.9rem",
                    cursor:"pointer", fontFamily:"Inter, sans-serif",
                    transition:"background 140ms ease, color 140ms ease, border-color 140ms ease",
                  }}
                >{c.label}</button>
              );
            })}
          </div>

          {/* Row 2 · Property type */}
          <div style={{display:"flex", flexWrap:"wrap", gap:10, marginBottom:14}}>
            {[
              { k:"all",        label:"All" },
              { k:"acreage",    label:"Acreage" },
              { k:"hobby-farm", label:"Hobby Farm" },
              { k:"estate",     label:"Estate" },
              { k:"ranch",      label:"Ranch" },
            ].map(c => {
              const active = propertyType === c.k;
              return (
                <button
                  key={c.k}
                  onClick={() => onTypeChip(c.k)}
                  data-testid={`chip-type-${c.k}`}
                  aria-pressed={active}
                  style={{
                    background: active ? BRAND.navy : "white",
                    color: active ? "white" : BRAND.navy,
                    border: `1px solid ${active ? BRAND.navy : "#D6D8DE"}`,
                    padding:"9px 18px", borderRadius:999, fontWeight:600, fontSize:"0.9rem",
                    cursor:"pointer", fontFamily:"Inter, sans-serif",
                    transition:"background 140ms ease, color 140ms ease, border-color 140ms ease",
                  }}
                >{c.label}</button>
              );
            })}
          </div>

          {/* Row 3 · Quick filters (multi-select) */}
          <div style={{fontSize:"0.72rem", letterSpacing:"0.16em", color:BRAND.muted, fontWeight:700, textTransform:"uppercase", marginBottom:8}}>Quick filters</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:10, alignItems:"center"}}>
            {[
              { k:"alr_only",  label:"ALR only" },
              { k:"has_arena", label:"Has arena" },
              { k:"20+",       label:"20+ acres" },
              { k:"50+",       label:"50+ acres" },
            ].map(c => {
              const active = quickFilters.has(c.k);
              return (
                <button
                  key={c.k}
                  onClick={() => toggleQuickFilter(c.k)}
                  data-testid={`chip-flag-${c.k}`}
                  aria-pressed={active}
                  style={{
                    background: active ? "rgba(47,107,56,0.14)" : "white",
                    color: BRAND.green,
                    border: `1px solid ${active ? BRAND.green : "rgba(47,107,56,0.35)"}`,
                    padding:"8px 16px", borderRadius:999, fontWeight:700, fontSize:"0.85rem",
                    cursor:"pointer", fontFamily:"Inter, sans-serif",
                    transition:"background 140ms ease, border-color 140ms ease",
                  }}
                >{c.label}</button>
              );
            })}
            <Link
              to={composedListingsUrl}
              data-testid="chip-view-listings"
              style={{
                marginLeft:"auto",
                background:BRAND.gold, color:BRAND.navy,
                padding:"9px 18px", borderRadius:999,
                fontWeight:700, fontSize:"0.9rem", textDecoration:"none",
                display:"inline-flex", alignItems:"center", gap:6,
              }}
            >🏡 View matching listings →</Link>
          </div>

          {/* Compliance note — appears only when the visitor picks a region
              outside Doug's direct service area. Keeps BCFSA framing honest
              at the point of intent (chip click) without cluttering the
              default in-area experience. */}
          {["okanagan","vancouver-island","kootenays","northern-bc"].includes(region) && (
            <div
              data-testid="chip-out-of-area-note"
              style={{
                marginTop:12, padding:"10px 14px",
                background:"rgba(15,42,91,0.05)",
                border:`1px dashed ${BRAND.navy}`,
                borderRadius:10,
                fontSize:"0.82rem", color:BRAND.navy,
                display:"flex", alignItems:"center", gap:10, flexWrap:"wrap",
              }}
            >
              <span>ℹ️ <strong>Doug refers this region.</strong> He'll connect you with a BCFSA-licensed local REALTOR® — you approve each intro.</span>
              <Link
                to={`/referral-request?context=Equestrian%20-%20${encodeURIComponent(region)}`}
                data-testid="chip-out-of-area-referral"
                style={{
                  marginLeft:"auto",
                  background:"white", color:BRAND.navy,
                  border:`1px solid ${BRAND.navy}`,
                  padding:"6px 14px", borderRadius:999,
                  fontWeight:700, fontSize:"0.78rem", textDecoration:"none",
                }}
              >🤝 Request a REALTOR® in that area →</Link>
            </div>
          )}
        </div>
      </div>

      <div style={{maxWidth:1120, margin:"0 auto", padding:"0 20px 60px", fontFamily:"Inter,sans-serif"}}>

        {/* ═══ § SAMPLE LISTINGS ═════════════════════════════════════ */}
        <SectionH kicker="Live inventory">4 sample equestrian listings on the market now</SectionH>
        {loading ? (
          <div style={{padding:"3rem", textAlign:"center", color:BRAND.muted}}>Loading live MLS® data…</div>
        ) : (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:14}}>
            {listings.map(l => {
              const photo = (l.photos && l.photos[0]) || null;
              const sqft = l.living_area || 0;
              return (
                <Link key={l.listing_key} to={`/listing/${l.listing_key}`} style={{textDecoration:"none"}} data-testid={`sample-${l.listing_key}`}>
                  <div style={{background:"white", border:"1px solid #E5E7EB", borderRadius:12, overflow:"hidden", transition:"transform 0.15s"}}
                       onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderColor=BRAND.gold; }}
                       onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="#E5E7EB"; }}>
                    <div style={{height:150, backgroundImage: photo ? `url(${photo})` : "none", backgroundSize:"cover", backgroundPosition:"center", backgroundColor:"#DBE3F0"}}/>
                    <div style={{padding:"12px 14px"}}>
                      <div style={{fontSize:"1.1rem", fontFamily:"'Sora',sans-serif", fontWeight:700, color:BRAND.navy}}>{_fmtMoney(l.list_price)}</div>
                      <div style={{fontSize:"0.82rem", color:BRAND.ink, marginTop:2}}>{l.beds || "—"}bd · {l.baths || "—"}ba{sqft ? ` · ${sqft.toLocaleString()} sqft` : ""}</div>
                      <div style={{fontSize:"0.78rem", color:BRAND.muted, marginTop:4}}>{l.street_address || l.city || "BC"}</div>
                      {/* Listing brokerage — CREA + GVR prominence requirement */}
                      {l.brokerage_name && <div style={{fontSize:"0.7rem", color:BRAND.muted, marginTop:6, borderTop:"1px solid #F3F4F6", paddingTop:6}}>Listed by <strong>{l.brokerage_name}</strong></div>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <div style={{marginTop:16, textAlign:"center"}}>
          <Link to="/listings?property_type=Equestrian" style={{background:BRAND.navy, color:"white", padding:"11px 22px", borderRadius:999, fontWeight:600, fontSize:"0.9rem", textDecoration:"none", display:"inline-block"}} data-testid="view-all-listings">View all {stats.total.toLocaleString()} equestrian listings →</Link>
        </div>

        {/* ═══ § LEAD FORM ═══════════════════════════════════════════
            Removed Feb 2026 per Doug's request — the "Get the checklist"
            form + card was pulled from the equestrian landing page. */}

        {/* ═══ § 5-STEP CHECKLIST ═══════════════════════════════════ */}
        <SectionH kicker="Free checklist" id="checklist">5-step equestrian buyer due-diligence checklist</SectionH>
        <p style={{fontSize:"0.95rem", color:BRAND.ink, maxWidth:780, lineHeight:1.65}}>
          Every horse property in BC needs these five verifications before you write an offer. Skip any of them and you may end up with a beautiful lot you can't legally keep animals on — or a barn you have to tear down.
        </p>
        <ol style={{display:"grid", gridTemplateColumns:"1fr", gap:12, listStyle:"none", padding:0, marginTop:12}}>
          {CHECKLIST.map((step, i) => (
            <li key={step.title} style={{background:"white", border:"1px solid #E5E7EB", borderRadius:12, padding:"18px 22px", display:"flex", gap:16, alignItems:"flex-start"}}>
              <div style={{width:38, height:38, borderRadius:"50%", background:BRAND.gold, color:BRAND.navy, fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:"1.05rem", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>{i + 1}</div>
              <div>
                <h3 style={{fontSize:"1.05rem", fontFamily:"'Sora',sans-serif", fontWeight:700, color:BRAND.navy, margin:"0 0 4px"}}>{step.title}</h3>
                <p style={{fontSize:"0.88rem", lineHeight:1.6, color:BRAND.ink, margin:0}}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        {/* Internal-link cluster — SEO topical-authority + AEO signal */}
        <div style={{marginTop:16, padding:"14px 18px", background:BRAND.cream, borderRadius:10, fontSize:"0.85rem", color:BRAND.ink, lineHeight:1.7}}>
          <strong style={{color:BRAND.navy}}>Related terms:</strong>{" "}
          <Link to="/glossary/agricultural-land-reserve" style={{color:BRAND.blue}}>Agricultural Land Reserve</Link>,{" "}
          <Link to="/glossary/statutory-building-scheme" style={{color:BRAND.blue}}>Statutory Building Scheme</Link>,{" "}
          <Link to="/glossary/restrictive-covenant" style={{color:BRAND.blue}}>Restrictive Covenant</Link>,{" "}
          <Link to="/glossary/undersurface-rights" style={{color:BRAND.blue}}>Undersurface Rights</Link>.
        </div>

        {/* ═══ § FAQ ═════════════════════════════════════════════════ */}
        <SectionH kicker="FAQ">Frequently asked about buying equestrian property in BC</SectionH>
        <div style={{display:"flex", flexDirection:"column", gap:10, maxWidth:900}}>
          {FAQS.map((f, i) => (
            <details key={i} style={{background:"white", border:"1px solid #E5E7EB", borderRadius:10, padding:"14px 18px"}} data-testid={`faq-${i}`}>
              <summary style={{fontSize:"0.95rem", fontWeight:700, color:BRAND.navy, cursor:"pointer", fontFamily:"'Sora',sans-serif"}}>{f.q}</summary>
              <div style={{marginTop:10, fontSize:"0.9rem", lineHeight:1.65, color:BRAND.ink}}>
                {f.a}
                {f.chip && (
                  <div style={{marginTop:12}}>
                    <Link
                      to={f.chip.to}
                      data-testid={`faq-referral-chip-${i}`}
                      style={{
                        display:"inline-flex", alignItems:"center", gap:6,
                        background:BRAND.navy, color:"white", padding:"8px 14px",
                        borderRadius:999, fontWeight:700, fontSize:"0.82rem",
                        textDecoration:"none",
                      }}
                    >{f.chip.label} →</Link>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>

        {/* ═══ § REFERRAL BLOCK (out-of-area) ═══════════════════════ */}
        <SectionH kicker="Outside Doug's area">Buying in the Interior, Vancouver Island, or Kootenays?</SectionH>
        <ReferralAsk
          variant="card"
          context="equestrian-out-of-area"
          data-testid="referral-link"
        />

        {/* ═══ COMPLIANCE FOOTER ══════════════════════════════════════ */}
        <ComplianceFooter/>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Lead form — CASL + PIPA + BCFSA compliant.  Extracted so the file
// stays readable and the compliance checkboxes are in one obvious spot.
function EquestrianLeadForm() {
  const [f, setF] = useState({
    full_name: "", email: "", phone: "",
    areas: [], property_type: "Equestrian",
    budget: "", bedrooms: "", timeframe: "3-6 months",
    notes: "",
    working_with_realtor: false,
    casl_consent: false,
    pipa_ack: false,
    dor_ack: false,
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  const disabled = !f.casl_consent || !f.pipa_ack || !f.dor_ack || f.working_with_realtor || busy;

  const submit = async e => {
    e.preventDefault();
    setErr("");
    if (f.working_with_realtor) {
      setErr("Because you're already under contract with another REALTOR®, Doug isn't able to help directly. Feel free to explore the equestrian checklist and glossary above.");
      return;
    }
    if (!f.casl_consent || !f.pipa_ack || !f.dor_ack) {
      setErr("Please tick all three consent boxes so Doug is legally able to contact you.");
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${API}/api/leads/buyer`, {
        ...f,
        areas: f.areas.length ? f.areas : ["Fraser Valley (equestrian)"],
        budget: f.budget ? Number(String(f.budget).replace(/\D/g, "")) : null,
        bedrooms: f.bedrooms ? Number(f.bedrooms) : null,
        notes: `EQUESTRIAN LEAD — ${f.notes || "(no note)"}`,
        form_lang: "en",
        turnstile_token: getTurnstileToken(),
        sizzle_source: null,
      });
      setDone(true);
    } catch (x) {
      setErr("We couldn't submit your form. Please try again in a moment or use the referral link below.");
    } finally {
      setBusy(false);
    }
  };

  const inp = { width:"100%", padding:"11px 13px", borderRadius:8, border:"1px solid #D1D5DB", fontSize:"0.92rem", fontFamily:"Inter,sans-serif", background:"white" };
  const lbl = { fontSize:"0.82rem", fontWeight:700, color:BRAND.navy, display:"block", marginBottom:6, marginTop:14 };

  if (done) {
    return (
      <div id="lead-form" style={{marginTop:56, background:BRAND.green, color:"white", borderRadius:14, padding:"36px 32px"}} data-testid="lead-form-done">
        <div style={{fontSize:"0.72rem", letterSpacing:"0.14em", opacity:0.9, fontWeight:700}}>✅ RECEIVED</div>
        <h2 style={{fontSize:"1.7rem", fontFamily:"'Sora',sans-serif", fontWeight:700, marginTop:6, marginBottom:8}}>Thanks, {f.full_name.split(" ")[0]} — Doug will reach out within 1 business day.</h2>
        <p style={{fontSize:"1rem", lineHeight:1.55, marginBottom:0, opacity:0.92}}>
          Your 40-point equestrian due-diligence checklist is on the way to <strong>{f.email}</strong>. Because you gave CASL consent, you'll also get Doug's weekly equestrian new-listing digest — you can unsubscribe from every email with one click.
        </p>
      </div>
    );
  }

  return (
    <div id="lead-form" style={{marginTop:56, background:BRAND.navy, color:"white", borderRadius:16, padding:"32px 30px 34px", boxShadow:"0 10px 40px rgba(15,42,91,0.20)"}} data-testid="lead-form">
      <div style={{display:"flex", gap:16, alignItems:"center", flexWrap:"wrap", marginBottom:14}}>
        <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire" loading="lazy" decoding="async" style={{width:64, height:64, borderRadius:"50%", border:`2px solid ${BRAND.gold}`, objectFit:"cover", flexShrink:0}}/>
        <div>
          <div style={{fontSize:"0.72rem", letterSpacing:"0.14em", color:BRAND.gold, fontWeight:700}}>SPEAK TO DOUG</div>
          <h2 style={{fontSize:"1.6rem", fontFamily:"'Sora',sans-serif", fontWeight:700, lineHeight:1.15, margin:"4px 0 0"}}>Get the 40-point checklist</h2>
        </div>
      </div>
      <p style={{fontSize:"0.9rem", opacity:0.88, lineHeight:1.6, marginBottom:22}}>
        Fill this out and Doug personally emails you the checklist.
      </p>

      <form onSubmit={submit} data-testid="lead-form-el">
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
          <div>
            <label style={lbl}>Full name *</label>
            <input type="text" required value={f.full_name} onChange={e => set("full_name", e.target.value)} style={inp} data-testid="lead-name" autoComplete="name"/>
          </div>
          <div>
            <label style={lbl}>Phone *</label>
            <input type="tel" required value={f.phone} onChange={e => set("phone", e.target.value)} style={inp} data-testid="lead-phone" autoComplete="tel" placeholder="604 555 1212"/>
          </div>
        </div>
        <label style={lbl}>Email *</label>
        <input type="email" required value={f.email} onChange={e => set("email", e.target.value)} style={inp} data-testid="lead-email" autoComplete="email"/>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
          <div>
            <label style={lbl}>Budget (CAD)</label>
            <input type="text" inputMode="numeric" value={f.budget ? `$${Number(String(f.budget).replace(/\D/g,"")).toLocaleString("en-CA")}` : ""} onChange={e => set("budget", e.target.value.replace(/\D/g, ""))} style={inp} data-testid="lead-budget" placeholder="$1,500,000"/>
          </div>
          <div>
            <label style={lbl}>Timeframe</label>
            <select value={f.timeframe} onChange={e => set("timeframe", e.target.value)} style={inp} data-testid="lead-timeframe">
              <option>1-3 months</option>
              <option>3-6 months</option>
              <option>6-12 months</option>
              <option>Just researching</option>
            </select>
          </div>
        </div>

        <label style={lbl}>Target area</label>
        <select value={f.areas[0] || ""} onChange={e => set("areas", e.target.value ? [e.target.value] : [])} style={inp} data-testid="lead-area">
          <option value="">Choose one…</option>
          <option>Langley / Aldergrove</option>
          <option>Abbotsford</option>
          <option>Chilliwack / Rosedale</option>
          <option>Maple Ridge / Whonnock</option>
          <option>Mission / Deroche</option>
          <option>Surrey / South Surrey</option>
          <option>Fraser Valley (any)</option>
          <option>Interior BC (referral)</option>
          <option>Vancouver Island (referral)</option>
          <option>Kootenays (referral)</option>
        </select>

        <label style={lbl}>Anything specific? (barn size, arena, board revenue, etc.)</label>
        <textarea value={f.notes} onChange={e => set("notes", e.target.value)} style={{...inp, minHeight:80, fontFamily:"Inter,sans-serif", resize:"vertical"}} data-testid="lead-notes" placeholder="e.g. Need a 60x120 arena, 4-stall barn, and enough hay storage for 20+ tons…"/>

        {/* BCFSA representation guard — regulator-mandated question */}
        <div style={{marginTop:22, padding:"14px 16px", background:"rgba(255,255,255,0.06)", borderRadius:8, border:"1px solid rgba(245,166,35,0.30)"}}>
          <label style={{display:"flex", gap:10, alignItems:"flex-start", cursor:"pointer", fontSize:"0.85rem", lineHeight:1.55}}>
            <input type="checkbox" checked={f.working_with_realtor} onChange={e => set("working_with_realtor", e.target.checked)} style={{marginTop:3, transform:"scale(1.2)"}} data-testid="lead-working-with-realtor"/>
            <span>I am <strong>already under contract</strong> with another BCFSA-licensed REALTOR® as a buyer.
              <span style={{display:"block", opacity:0.8, marginTop:3, fontSize:"0.78rem"}}>BCFSA rules prevent Doug from representing you if you're already exclusively represented.</span>
            </span>
          </label>
        </div>

        {/* CASL express consent — Canada's Anti-Spam Legislation. Required
            before sending ANY commercial electronic message. Fine up to $10M. */}
        <div style={{marginTop:12, padding:"14px 16px", background:"rgba(255,255,255,0.06)", borderRadius:8}}>
          <label style={{display:"flex", gap:10, alignItems:"flex-start", cursor:"pointer", fontSize:"0.85rem", lineHeight:1.55}}>
            <input type="checkbox" checked={f.casl_consent} onChange={e => set("casl_consent", e.target.checked)} style={{marginTop:3, transform:"scale(1.2)"}} data-testid="lead-casl"/>
            <span><strong>CASL express consent — required.</strong> I consent to receive commercial electronic messages from Doug LeMaire and Fraser Property Management Realty Services Ltd. (equestrian property updates, market reports, checklists). I understand I can unsubscribe any time via the link in every email. <Link to="/email-preferences" style={{color:BRAND.gold, textDecoration:"underline"}}>Manage preferences</Link>.</span>
          </label>
        </div>

        {/* PIPA acknowledgment — BC Personal Information Protection Act */}
        <div style={{marginTop:12, padding:"14px 16px", background:"rgba(255,255,255,0.06)", borderRadius:8}}>
          <label style={{display:"flex", gap:10, alignItems:"flex-start", cursor:"pointer", fontSize:"0.85rem", lineHeight:1.55}}>
            <input type="checkbox" checked={f.pipa_ack} onChange={e => set("pipa_ack", e.target.checked)} style={{marginTop:3, transform:"scale(1.2)"}} data-testid="lead-pipa"/>
            <span><strong>PIPA privacy acknowledgment — required.</strong> I understand that Doug LeMaire and Fraser Property Management Realty Services Ltd. will collect, use, and store my personal information solely to provide real-estate services, as described in the <Link to="/privacy" style={{color:BRAND.gold, textDecoration:"underline"}}>EZtoFind.ca Privacy Policy</Link> (BC Personal Information Protection Act).</span>
          </label>
        </div>

        {/* BCFSA Disclosure of Representation — reg-mandated pre-service */}
        <div style={{marginTop:12, padding:"14px 16px", background:"rgba(255,255,255,0.06)", borderRadius:8}}>
          <label style={{display:"flex", gap:10, alignItems:"flex-start", cursor:"pointer", fontSize:"0.85rem", lineHeight:1.55}}>
            <input type="checkbox" checked={f.dor_ack} onChange={e => set("dor_ack", e.target.checked)} style={{marginTop:3, transform:"scale(1.2)"}} data-testid="lead-dor"/>
            <span><strong>BCFSA Disclosure of Representation — required.</strong> I have read the <a href="/legal/bcfsa-disclosure-of-representation.pdf" target="_blank" rel="noopener noreferrer" style={{color:BRAND.gold, textDecoration:"underline"}}>BCFSA Disclosure of Representation in Trading Services</a> pamphlet and understand my options for representation before any meaningful engagement.</span>
          </label>
        </div>

        {/* Cloudflare Turnstile — anti-bot */}
        <div style={{marginTop:20}}>
          <TurnstileWidget/>
        </div>

        {err && <div role="alert" style={{marginTop:12, padding:"10px 14px", background:"rgba(220,38,38,0.15)", border:"1px solid rgba(220,38,38,0.5)", borderRadius:8, color:"#FEE2E2", fontSize:"0.85rem"}}>{err}</div>}

        <button type="submit" disabled={disabled} data-testid="lead-submit"
                style={{marginTop:20, width:"100%", background: disabled ? "rgba(255,255,255,0.20)" : BRAND.gold, color: disabled ? "rgba(255,255,255,0.60)" : BRAND.navy, border:"none", padding:"15px 24px", borderRadius:999, fontFamily:"'Sora',sans-serif", fontSize:"1rem", fontWeight:700, cursor: disabled ? "not-allowed" : "pointer", transition:"all 0.15s"}}>
          {busy ? "Sending…" : "🐴 Send it — get the checklist"}
        </button>

        <div style={{marginTop:12, fontSize:"0.75rem", opacity:0.7, textAlign:"center"}}>
          $0 cost · No obligation · CASL + PIPA + BCFSA compliant · Unsubscribe any time
        </div>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Compliance footer — every regulator string in one prominent place.
function ComplianceFooter() {
  return (
    <div style={{marginTop:60, padding:"22px 24px", background:"white", border:"1px solid #E5E7EB", borderRadius:14, fontSize:"0.78rem", color:BRAND.muted, lineHeight:1.7}} data-testid="compliance-footer">
      <div style={{marginBottom:12}}>
        <div style={{fontSize:"0.85rem", color:BRAND.ink, fontWeight:600}}>
          Doug LeMaire, REALTOR® · BCFSA Licence #167790 · Fraser Property Management Realty Services Ltd. · BCFSA-licensed real estate professional
        </div>
      </div>
      <p style={{margin:"0 0 8px", color:BRAND.ink}}>
        <strong>Brokerage:</strong> Fraser Property Management Realty Services Ltd., 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5 · Direct: <a href="tel:604-787-0851" style={{color:BRAND.blue}}>(604) 787-0851</a> · Brokerage: <a href="tel:604-466-7021" style={{color:BRAND.blue}}>(604) 466-7021</a>
      </p>
      <p style={{margin:"0 0 8px"}}>
        MLS®, Multiple Listing Service®, REALTOR®, REALTORS®, and the REALTOR® logo are certification marks that are owned by The Canadian Real Estate Association (CREA) and identify real estate professionals who are members of CREA. The trademarks MLS® and Multiple Listing Service® are administered by CREA. Property data © CREA Data Distribution Facility (DDF®), sourced live from the Greater Vancouver REALTORS®, Fraser Valley Real Estate Board, and other participating BC boards. Refreshed every 4 hours.
      </p>
      <p style={{margin:"0 0 8px"}}>
        General information only — <strong>not legal, tax, financial, or real-estate advice</strong>. For your own situation, always speak with the appropriate licensed professional: a BC lawyer or notary, an accountant, a licensed mortgage broker, and a REALTOR®. Doug is not the listing agent for any property shown above unless explicitly stated; always verify all information directly with the listing brokerage before making an offer.
      </p>
      <p style={{margin:0}}>
        Personal information collected on this page is handled under the BC Personal Information Protection Act (PIPA) — see the <Link to="/privacy" style={{color:BRAND.blue}}>Privacy Policy</Link>. Marketing email consent recorded under Canada's Anti-Spam Legislation (CASL) — unsubscribe any time via the link in every message.
      </p>
    </div>
  );
}
