// ═════════════════════════════════════════════════════════════════════════
// SiteWideSchema — Organization + Person + WebSite JSON-LD injected on
// EVERY route across EZtoFind.ca. This is the always-on entity graph that
// lets LLM crawlers (ChatGPT, Perplexity, Claude, Gemini) and traditional
// search engines connect any page they land on back to the same brand
// identity + BCFSA-licensed REALTOR® person entity.
//
// This complements — not replaces — page-specific schemas:
//   • The homepage still ships the full @graph via <LiveHomepageSchema/>
//     (FAQPage, ItemList, DefinedTermSet, Service×4, SoftwareApplication).
//   • Prerendered templates (glossary, communities, neighbourhoods) each
//     emit their own Article / Place / BreadcrumbList JSON-LD.
//   • This component adds the Organization + Person + WebSite baseline
//     that used to only exist on `/`.
//
// Every fact flows from the SITE_FACTS constant so schema and visible
// content stay in sync as Doug's BCFSA licence numbers come in.
// ═════════════════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { Helmet } from "react-helmet-async";

const SITE_FACTS = {
  origin: "https://eztofind.ca",
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
  years_experience: 13,
  bcfsa_licence_individual: "167790",
  bcfsa_licence_brokerage:  "PENDING",
  practice_areas: "Greater Vancouver, Fraser Valley, and Sea-to-Sky Corridor (to Whistler)",
  referral_boards: "VIREB, IAR, KAR, BCNREB, CADREB",
};

export default function SiteWideSchema() {
  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@graph": [
      // ── WebSite entity ────────────────────────────────────────────────
      {
        "@type": "WebSite",
        "@id": `${SITE_FACTS.origin}/#website`,
        "url": `${SITE_FACTS.origin}/`,
        "name": "EZtoFind.ca",
        "description": "British Columbia real estate — live CREA DDF® MLS® listings, 240 community profiles, 439 statute-cited glossary entries, and a BCFSA-licensed REALTOR®.",
        "inLanguage": "en-CA",
        "publisher": { "@id": `${SITE_FACTS.origin}/#organization` },
        "potentialAction": {
          "@type": "SearchAction",
          "target": { "@type": "EntryPoint", "urlTemplate": `${SITE_FACTS.origin}/listings?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      // ── Organization entity (the brokerage) ───────────────────────────
      {
        "@type": ["Organization", "RealEstateAgent"],
        "@id": `${SITE_FACTS.origin}/#organization`,
        "name": SITE_FACTS.brokerage_name,
        "alternateName": "EZtoFind.ca",
        "url": SITE_FACTS.origin,
        "logo": {
          "@type": "ImageObject",
          "url": `${SITE_FACTS.origin}/images/doogie-laptop.png`,
          "caption": "EZtoFind.ca — Doogie the AI real-estate research pup",
        },
        "telephone": SITE_FACTS.brokerage_phone,
        "email": SITE_FACTS.doug_email,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": SITE_FACTS.brokerage_addr.street,
          "addressLocality": SITE_FACTS.brokerage_addr.city,
          "addressRegion": SITE_FACTS.brokerage_addr.region,
          "postalCode": SITE_FACTS.brokerage_addr.postal,
          "addressCountry": SITE_FACTS.brokerage_addr.country,
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": SITE_FACTS.brokerage_addr.lat,
          "longitude": SITE_FACTS.brokerage_addr.lng,
        },
        "areaServed": {
          "@type": "AdministrativeArea",
          "name": "British Columbia, Canada",
        },
        "priceRange": "$",
        "founder": { "@id": `${SITE_FACTS.origin}/#doug` },
        "employee":  { "@id": `${SITE_FACTS.origin}/#doug` },
        "hasCredential": {
          "@type": "EducationalOccupationalCredential",
          "credentialCategory": "License",
          "recognizedBy": {
            "@type": "Organization",
            "name": "BC Financial Services Authority (BCFSA)",
            "url": "https://www.bcfsa.ca/",
          },
          "identifier": SITE_FACTS.bcfsa_licence_brokerage,
        },
      },
      // ── Person entity (Doug LeMaire) ──────────────────────────────────
      {
        "@type": ["Person", "RealEstateAgent"],
        "@id": `${SITE_FACTS.origin}/#doug`,
        "name": "Doug LeMaire",
        "alternateName": "Doug LeMaire, REALTOR®",
        "givenName": "Doug",
        "familyName": "LeMaire",
        "jobTitle": "REALTOR®",
        "description": `BCFSA-licensed REALTOR® (Licence #${SITE_FACTS.bcfsa_licence_individual}) with ${SITE_FACTS.years_experience} years of BC real-estate experience. Practice areas: ${SITE_FACTS.practice_areas}. Referral network across the rest of BC via ${SITE_FACTS.referral_boards}.`,
        "image": `${SITE_FACTS.origin}/doug-headshot.jpg`,
        "telephone": SITE_FACTS.doug_phone,
        "email": SITE_FACTS.doug_email,
        "url": `${SITE_FACTS.origin}/about`,
        "worksFor": { "@id": `${SITE_FACTS.origin}/#organization` },
        "areaServed": [
          { "@type": "AdministrativeArea", "name": "Greater Vancouver, BC" },
          { "@type": "AdministrativeArea", "name": "Fraser Valley, BC" },
          { "@type": "AdministrativeArea", "name": "Sea-to-Sky Corridor, BC (to Whistler)" },
        ],
        "knowsAbout": [
          "British Columbia real estate",
          "MLS® listings",
          "BCFSA compliance",
          "CREA DDF®",
          "Equestrian property",
          "Luxury real estate",
          "Strata property",
          "Estate sale probate",
          "Agricultural Land Reserve (ALR)",
          "BC Property Transfer Tax (PTT)",
          "OSFI B-20 stress test",
        ],
        "hasCredential": [
          {
            "@type": "EducationalOccupationalCredential",
            "credentialCategory": "License",
            "recognizedBy": {
              "@type": "Organization",
              "name": "BC Financial Services Authority (BCFSA)",
              "url": "https://www.bcfsa.ca/",
            },
            "identifier": SITE_FACTS.bcfsa_licence_individual,
          },
          {
            "@type": "EducationalOccupationalCredential",
            "credentialCategory": "Membership",
            "recognizedBy": {
              "@type": "Organization",
              "name": "Canadian Real Estate Association (CREA)",
              "url": "https://www.crea.ca/",
            },
          },
          {
            "@type": "EducationalOccupationalCredential",
            "credentialCategory": "Membership",
            "recognizedBy": {
              "@type": "Organization",
              "name": "Greater Vancouver REALTORS® (GVR)",
              "url": "https://www.gvrealtors.ca/",
            },
          },
          {
            "@type": "EducationalOccupationalCredential",
            "credentialCategory": "Membership",
            "recognizedBy": {
              "@type": "Organization",
              "name": "Fraser Valley Real Estate Board (FVREB)",
              "url": "https://www.fvreb.bc.ca/",
            },
          },
        ],
        "sameAs": [
          "https://www.realtor.ca/agent/2126195/doug-lemaire-1-22374-lougheed-hwy-maple-ridge-british-columbia-v2x2t5",
        ],
      },
    ],
  }), []);

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
