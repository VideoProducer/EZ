// Canonical schema.org entity graph for EZtoFind.ca.
//
// Every JSON-LD block on the site should reference these entities by @id
// instead of re-declaring the same Organization / Person / Brokerage
// strings. That eliminates the "Fraser Property Management Realty Services
// Ltd. appears 34 times" duplicate-entity signal Google + AI crawlers
// currently pick up.
//
// Reference contract (schema.org @id-linking):
//
//   { "@type": "Article",
//     "author":    { "@id": "https://eztofind.ca/#doug" },
//     "publisher": { "@id": "https://eztofind.ca/#org" }
//   }
//
// The full entity definitions live in ONE place: the sitewide graph
// (see components/SiteWideSchema.jsx). Page-level blocks reference them
// by @id — no duplicate strings, no drift risk.
//
// BCFSA / CREA / CASL / PIPA compliance:
//   • ORG.name === "EZtoFind.ca" (never "Doug LeMaire, REALTOR®")
//   • BROKERAGE.name === "Fraser Property Management Realty Services Ltd."
//   • DOUG.worksFor is a *reference* to BROKERAGE, never a duplicated block
//   • BCFSA licence #167790 lives on the Person, not the Organization
//     (regulatory identity is licensee-level under BCFSA Rule 4-2)
//   • CREA/GVR/MLS® attribution is preserved verbatim on any page that
//     surfaces DDF® data — see SiteWideSchema.jsx

export const SITE_URL = "https://eztofind.ca";

// @id constants — reference these from every page-level block.
// Aligned with the canonical entity graph already emitted sitewide by
// SiteWideSchema.jsx so existing inline references keep resolving as
// we migrate them to @id-only.
export const ORG_ID = `${SITE_URL}/#organization`;
export const DOUG_ID = `${SITE_URL}/#doug`;
export const BROKERAGE_ID = `${SITE_URL}/#organization`; // brokerage == organization here (single legal entity)
export const WEBSITE_ID = `${SITE_URL}/#website`;

// Reference-only helpers — use these to link a page's Article / WebPage
// / DefinedTerm to the canonical entities without re-declaring them.
export const orgRef = () => ({ "@id": ORG_ID });
export const dougRef = () => ({ "@id": DOUG_ID });
export const brokerageRef = () => ({ "@id": BROKERAGE_ID });
export const websiteRef = () => ({ "@id": WEBSITE_ID });

// Full entity definitions — DECLARED ONCE in SiteWideSchema.jsx.
// Any code that legitimately needs a full copy (e.g. offline PDF export,
// AI-citation manifest) imports this instead of hand-typing the strings.
export const EZTOFIND_ORG = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "EZtoFind.ca",
  url: SITE_URL,
  logo: `${SITE_URL}/logo512.png`,
  founder: dougRef(),
  publishingPrinciples: `${SITE_URL}/about`,
  // Task 9 (Feb 2026) — verified real profiles only. Live curl-checked
  // at the time of add. Never add unverified or invented URLs.
  sameAs: [
    "https://www.fraserpropertymanagement.com/",
    "https://maps.app.goo.gl/u8Fx3yDnSCyPUmGr9",
    "https://www.bcfsa.ca/public-resources/registrant-search?keyword=167790",
    "https://www.realtor.ca/agent/2126195/doug-lemaire-1-22374-lougheed-hwy-maple-ridge-british-columbia-v2x2t5",
    "https://www.linkedin.com/in/eztofind/",
    "https://www.youtube.com/@EZtoFindCA",
    "https://www.facebook.com/EZtoFind.ca",
    "https://www.instagram.com/eztofind.ca/",
    "https://x.com/EZtoFindca",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-604-466-7021",
    contactType: "customer service",
    areaServed: "CA-BC",
    availableLanguage: ["en", "fr", "zh-Hant", "zh-Hans", "pa", "fa", "pt"],
  },
};

export const BROKERAGE_ORG = {
  "@type": "RealEstateAgent",
  "@id": BROKERAGE_ID,
  name: "Fraser Property Management Realty Services Ltd.",
  url: "https://www.fraserpropertymanagement.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "1 – 22374 Lougheed Hwy",
    addressLocality: "Maple Ridge",
    addressRegion: "BC",
    postalCode: "V2X 2T5",
    addressCountry: "CA",
  },
};

export const DOUG_PERSON = {
  "@type": "Person",
  "@id": DOUG_ID,
  name: "Doug LeMaire",
  jobTitle: "REALTOR®",
  worksFor: brokerageRef(),
  telephone: "+1-604-466-7021",
  email: "info@eztofind.ca",
  identifier: {
    "@type": "PropertyValue",
    propertyID: "BCFSA-Licence",
    value: "167790",
  },
  // Task 9 (Feb 2026) — verified real profiles only. Do not add
  // unverified social handles; each URL below returns HTTP 200 or
  // resolves to a known registrant record. Extend cautiously.
  sameAs: [
    "https://www.realtor.ca/agent/2126195/doug-lemaire-1-22374-lougheed-hwy-maple-ridge-british-columbia-v2x2t5",
    "https://www.bcfsa.ca/public-resources/registrant-search?keyword=167790",
    "https://www.fraserpropertymanagement.com/",
    "https://maps.app.goo.gl/u8Fx3yDnSCyPUmGr9",
    "https://www.linkedin.com/in/eztofind/",
    "https://www.youtube.com/@EZtoFindCA",
    "https://www.facebook.com/EZtoFind.ca",
    "https://www.instagram.com/eztofind.ca/",
    "https://x.com/EZtoFindca",
  ],
  areaServed: [
    "Maple Ridge, BC",
    "Pitt Meadows, BC",
    "Surrey, BC",
    "Langley, BC",
    "Burnaby, BC",
    "Vancouver, BC",
    "Coquitlam, BC",
    "Port Coquitlam, BC",
    "North Vancouver, BC",
    "West Vancouver, BC",
  ],
};

export const EZTOFIND_WEBSITE = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: SITE_URL,
  name: "EZtoFind.ca",
  publisher: orgRef(),
  inLanguage: "en-CA",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/listings?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

// The full graph — inject exactly once via SiteWideSchema.
export const CANONICAL_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    EZTOFIND_ORG,
    BROKERAGE_ORG,
    DOUG_PERSON,
    EZTOFIND_WEBSITE,
  ],
};
