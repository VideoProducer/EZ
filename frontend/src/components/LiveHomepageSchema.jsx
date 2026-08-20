// LiveHomepageSchema — the AEO/LLM/AI-search structured-data payload
// injected into the head of the live production landing page ('/').
//
// Ships items 13 · 14 · 15 · 18 from the enhancement audit:
//   • Item 13 · Full @graph — WebSite, RealEstateAgent×2, ItemList,
//                             DefinedTermSet, Service×4, SoftwareApplication,
//                             FAQPage, BreadcrumbList
//   • Item 14 · hasCredential on Doug's RealEstateAgent entity
//   • Item 15 · speakable schema on the FAQ block
//   • Item 18 · Place + GeoCoordinates entries for the 3 practice regions
//
// This component emits ONLY structured data — zero visible UI. Drop it
// once at the top of DashboardMockup's return tree. All facts flow from
// the FACTS const below so the schema and the visible copy stay in sync.
import React, { useMemo } from "react";
import { Helmet } from "react-helmet-async";

// Regulator-visible facts — SINGLE SOURCE OF TRUTH. When Doug's licence
// numbers come in, replace the two PENDING slots and every downstream
// component picks up the change.
const FACTS = {
  brokerage_name:  "Fraser Property Management Realty Services Ltd.",
  brokerage_addr: {
    street: "1 – 22374 Lougheed Hwy",
    city:   "Maple Ridge",
    region: "BC",
    postal: "V2X 2T5",
    country:"CA",
    lat:    49.2185,
    lng:    -122.6017,
  },
  brokerage_phone: "+1-604-466-7021",
  doug_phone:      "+1-604-787-0851",
  doug_email:      "info@eztofind.ca",
  privacy_email:   "info@eztofind.ca",
  years_experience: 13,
  glossary_count:   439,
  community_count:  240,
  bcfsa_licence_individual: "167790",
  bcfsa_licence_brokerage:  "167790",
  practice_areas: "Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor (to Whistler)",
  referral_boards: "VIREB, IAR, KAR, BCNREB, CADREB",
  origin: "https://eztofind.ca",
};

const REGIONS = [
  { slug:"greater-vancouver", name:"Greater Vancouver, BC", tagline:"From downtown high-rises to West Van estates.", pin:{ lat:49.2827, lng:-123.1207 } },
  { slug:"fraser-valley",     name:"Fraser Valley, BC",     tagline:"Langley, Abbotsford, Chilliwack — where space meets city convenience.", pin:{ lat:49.1044, lng:-122.6603 } },
  { slug:"sea-to-sky",        name:"Sea-to-Sky Corridor, BC (to Whistler)", tagline:"Squamish, Whistler, Pemberton — mountain-lifestyle real estate.", pin:{ lat:50.1163, lng:-122.9574 } },
];

const SPECIALTIES = [
  { name:"Equestrian & acreage real estate", href:"/specialties/equestrian", body:"ALR + zoning + water-rights due diligence · 40-point checklist" },
  { name:"Luxury real estate ($3M+)",         href:"/specialties/luxury",     body:"Waterfront, penthouse, estate & sub-penthouse · discreet showings" },
  { name:"Condos & townhomes",                href:"/specialties/condos",     body:"Strata review, depreciation report, and rental-restriction analysis" },
  { name:"Detached homes",                    href:"/specialties/detached",   body:"Fraser Valley, Sea-to-Sky, and Greater Vancouver detached inventory" },
];

const GLOSSARY_TERMS = [
  { slug:"agricultural-land-reserve",    term:"Agricultural Land Reserve",              defn:"Provincially designated agricultural land governed by the BC Agricultural Land Commission Act (RSBC 2002, c.36). Subdivision, non-farm use, and residential improvement are restricted." },
  { slug:"restrictive-covenant",         term:"Restrictive Covenant",                    defn:"A registered charge on title that restricts how a parcel may be used, built on, or subdivided (BC Land Title Act, s.219). Binds all future owners." },
  { slug:"property-transfer-tax",        term:"BC Property Transfer Tax (PTT)",          defn:"Tax on the fair-market value of a BC property transfer under the Property Transfer Tax Act. 1 % on the first $200 K, 2 % up to $2 M, 3 % up to $3 M, 5 % above $3 M." },
  { slug:"subject-to-financing",         term:"Subject to Financing",                    defn:"A subject clause in a BC Contract of Purchase and Sale making the buyer's obligation contingent on obtaining satisfactory financing by a stated date." },
  { slug:"strata-depreciation-report",   term:"Strata Depreciation Report",              defn:"A report every BC strata corporation of 5+ units must obtain under the Strata Property Act, s.94, projecting anticipated common-property repairs over 30 years." },
  { slug:"disclosure-of-representation", term:"BCFSA Disclosure of Representation",      defn:"The mandatory BCFSA form a licensee must provide at first substantive contact explaining how the consumer will (or will not) be represented in the trade." },
];

const FAQS = [
  { q:"How current are the MLS® listings on EZtoFind.ca?",
    a:"Every listing on EZtoFind.ca is refreshed every 4 hours directly from the CREA Data Distribution Facility (DDF®), sourced live from the Greater Vancouver REALTORS®, Fraser Valley Real Estate Board, and 10+ other participating boards across British Columbia." },
  { q:"Does Doug charge me anything to represent me as a buyer?",
    a:"No. Under BC's Multiple Listing Service® rules, the seller's brokerage compensates the co-operating (buyer's) brokerage from the sale proceeds — you pay $0 for consultations, showings, offer preparation, negotiation, or closing coordination. Full BCFSA Disclosure of Representation is presented before any meaningful engagement." },
  { q:"What if the property I love is outside Doug's direct service area?",
    a:"Doug personally transacts in Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor (to Whistler). For anywhere else in BC (Vancouver Island via VIREB, the Interior via IAR/KAR, the Kootenays, Cariboo, Peace via BCNREB and CADREB), Doug hand-picks a BCFSA-licensed local from his vetted REALTOR® referral network — $0 cost to you, you approve every intro, and no CASL marketing spam follows." },
  { q:"Is Doogie giving me real-estate advice?",
    a:"No. Doogie is an AI-assisted educational guide that explains BC real estate terminology, walks you through active listings, and helps you find community pages — but Doogie provides general information only, never legal, tax, financial, or property-specific advice. Under BCFSA's AI Guidelines, the licensee (Doug) remains responsible for all AI-generated output." },
  { q:"How is my personal information handled when I submit a form?",
    a:"Under BC's Personal Information Protection Act (PIPA), your data is collected only to provide real-estate services, stored securely, never sold, and deletable on request. Marketing emails require your separate express consent under Canada's Anti-Spam Legislation (CASL) — one-click unsubscribe is in every message. Consent records (email, submission timestamp, IP address, browser user-agent) are retained for 3 years as CASL proof-of-consent." },
];

export default function LiveHomepageSchema() {
  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${FACTS.origin}/#website`,
        "url": `${FACTS.origin}/`,
        "name": "EZtoFind.ca",
        "description": `British Columbia real estate — live CREA DDF® MLS® listings, ${FACTS.community_count} community profiles, ${FACTS.glossary_count} statute-cited glossary entries, and a BCFSA-licensed REALTOR®. Free platform by Doug LeMaire, REALTOR®.`,
        "inLanguage": "en-CA",
        "potentialAction": {
          "@type": "SearchAction",
          "target": { "@type": "EntryPoint", "urlTemplate": `${FACTS.origin}/listings?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
        "publisher": { "@id": `${FACTS.origin}/#brokerage` },
      },
      {
        "@type": "RealEstateAgent",
        "@id": `${FACTS.origin}/#doug`,
        "name": "Doug LeMaire, REALTOR®",
        "givenName": "Doug",
        "familyName": "LeMaire",
        "jobTitle": "REALTOR®",
        "description": `BCFSA-licensed REALTOR® with ${FACTS.years_experience} years of BC real-estate experience. Practice areas: ${FACTS.practice_areas}. Referral network across the rest of BC via ${FACTS.referral_boards}.`,
        "image": `${FACTS.origin}/doug-headshot.jpg`,
        "telephone": FACTS.doug_phone,
        "email": FACTS.doug_email,
        "url": `${FACTS.origin}/`,
        "worksFor": { "@id": `${FACTS.origin}/#brokerage` },
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
        "@id": `${FACTS.origin}/#brokerage`,
        "name": FACTS.brokerage_name,
        "telephone": FACTS.brokerage_phone,
        "url": `${FACTS.origin}/`,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": FACTS.brokerage_addr.street,
          "addressLocality": FACTS.brokerage_addr.city,
          "addressRegion": FACTS.brokerage_addr.region,
          "postalCode": FACTS.brokerage_addr.postal,
          "addressCountry": FACTS.brokerage_addr.country,
        },
        "geo": { "@type": "GeoCoordinates", "latitude": FACTS.brokerage_addr.lat, "longitude": FACTS.brokerage_addr.lng },
        "areaServed": "British Columbia",
        "priceRange": "$",
        "hasCredential": {
          "@type": "EducationalOccupationalCredential",
          "credentialCategory": "License",
          "recognizedBy": { "@type": "Organization", "name": "BC Financial Services Authority (BCFSA)" },
          "identifier": FACTS.bcfsa_licence_brokerage,
        },
      },
      {
        "@type": "ItemList",
        "@id": `${FACTS.origin}/#regions`,
        "name": "Doug LeMaire practice-area regions in British Columbia",
        "itemListOrder": "https://schema.org/ItemListOrderAscending",
        "itemListElement": REGIONS.map((r, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "item": {
            "@type": "Place",
            "name": r.name,
            "description": r.tagline,
            "geo": { "@type": "GeoCoordinates", "latitude": r.pin.lat, "longitude": r.pin.lng },
            "url": `${FACTS.origin}/regions/${r.slug}`,
          },
        })),
      },
      {
        "@type": "DefinedTermSet",
        "@id": `${FACTS.origin}/#glossary`,
        "name": `EZtoFind.ca BC Real-Estate Glossary — ${FACTS.glossary_count} statute-cited terms`,
        "url": `${FACTS.origin}/glossary`,
        "inDefinedTermSet": `${FACTS.origin}/glossary`,
        "hasDefinedTerm": GLOSSARY_TERMS.map(g => ({
          "@type": "DefinedTerm",
          "name": g.term,
          "description": g.defn,
          "url": `${FACTS.origin}/glossary/${g.slug}`,
          "inDefinedTermSet": `${FACTS.origin}/#glossary`,
        })),
      },
      ...SPECIALTIES.map(s => ({
        "@type": "Service",
        "serviceType": s.name,
        "provider": { "@id": `${FACTS.origin}/#doug` },
        "areaServed": FACTS.practice_areas,
        "description": s.body,
        "url": `${FACTS.origin}${s.href}`,
      })),
      {
        "@type": "SoftwareApplication",
        "@id": `${FACTS.origin}/#affordability-calculator`,
        "name": "BC Home Affordability Calculator",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web browser",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "CAD" },
        "description": "Free BC-specific home-affordability tool that runs the OSFI B-20 stress test (qualifying rate = max of contract + 2 % or benchmark, minimum 5.25 %), applies the BC Property Transfer Tax schedule with the First-Time Buyer exemption, and returns your maximum purchase price plus a live listings link.",
        "featureList": ["OSFI B-20 stress test at 7.50 %", "BC PTT schedule (1 % / 2 % / 3 % / 5 %)", "First-Time Buyer PTT exemption", "GDS/TDS debt-service ratios", "Live 'Show me listings under $X' filter"],
      },
      {
        "@type": "FAQPage",
        "@id": `${FACTS.origin}/#faqs`,
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
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${FACTS.origin}/` },
        ],
      },
    ],
  }), []);

  return (
    <Helmet>
      {/* Traditional SEO — long-tail keyword-loaded title + meta description
          that name the primary intents (buy · sell · MLS® · community
          profiles · glossary) and BC locale.  These feed Google SERPs +
          LLM entity-graph disambiguation.  ~60/160 char targets. */}
      <title>BC Real Estate — Live MLS® Listings, Community Profiles & Glossary | EZtoFind.ca</title>
      <meta name="description" content={`British Columbia real estate research — search live MLS® listings from CREA DDF®, browse ${FACTS.community_count} community profiles with Environment Canada climate data, and ${FACTS.glossary_count} statute-cited glossary terms. BCFSA-licensed REALTOR® Doug LeMaire (#${FACTS.bcfsa_licence_individual}).`}/>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <link rel="canonical" href={`${FACTS.origin}/`}/>
      <meta property="og:type" content="website"/>
      <meta property="og:url" content={`${FACTS.origin}/`}/>
      <meta property="og:title" content="EZtoFind.ca — BC Real Estate · Live MLS® · BCFSA-Licensed"/>
      <meta property="og:description" content={`British Columbia real estate — live CREA DDF® MLS® listings, ${FACTS.community_count} community profiles, ${FACTS.glossary_count} statute-cited glossary entries, and a BCFSA-licensed REALTOR®.`}/>
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="geo.region" content="CA-BC"/>
      <meta name="geo.placename" content="British Columbia, Canada"/>
    </Helmet>
  );
}
