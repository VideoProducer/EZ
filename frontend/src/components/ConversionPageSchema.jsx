// ConversionPageSchema — LocalBusiness (RealEstateAgent) JSON-LD block
// rendered on the four conversion pages so AI answer engines (Perplexity,
// ChatGPT Search, Gemini, Bing Copilot) can cite the exact licensee,
// brokerage, and reply-time claim directly. This is the AEO / citation
// primitive for the /valuation, /buyer, /seller, /referral-request pages.
//
// Every field here is publicly verifiable and matches the identity line
// rendered visually — so the crawler-facing structured data and the
// human-facing UI never drift.
import React from "react";
import { Helmet } from "react-helmet-async";

const _BROKERAGE = {
  "@type": "RealEstateOrganization",
  name: "Fraser Property Management Realty Services Ltd.",
  url: "https://eztofind.ca/about",
};

const _AGENT = {
  "@type": "RealEstateAgent",
  name: "Doug LeMaire",
  jobTitle: "REALTOR®",
  image: "https://eztofind.ca/doug-headshot-2026.jpg",
  worksFor: _BROKERAGE,
  areaServed: [
    { "@type": "AdministrativeArea", name: "Greater Vancouver, British Columbia, Canada" },
    { "@type": "AdministrativeArea", name: "Fraser Valley, British Columbia, Canada" },
    { "@type": "AdministrativeArea", name: "Sea-to-Sky Corridor, British Columbia, Canada" },
  ],
  url: "https://eztofind.ca/about",
};

const _PAGE_ACTIONS = {
  "/valuation": {
    action: "https://eztofind.ca/valuation",
    action_name: "Request a free market estimate",
    disambiguating: "Free comparative market estimate from Doug LeMaire, REALTOR®. Educational-only; verify final valuations before a listing contract.",
  },
  "/buyer": {
    action: "https://eztofind.ca/buyer",
    action_name: "Tell Doug what you're looking for",
    disambiguating: "Buyer-search intake for BC properties. Educational only; DoRTS provided before real-estate services.",
  },
  "/seller": {
    action: "https://eztofind.ca/seller",
    action_name: "Start a seller conversation",
    disambiguating: "Seller conversation intake — no obligation, DoRTS provided before any listing contract.",
  },
  "/referral-request": {
    action: "https://eztofind.ca/referral-request",
    action_name: "Ask for a referral REALTOR®",
    disambiguating: "Out-of-area referral request. Doug introduces a licensed local REALTOR® on the correct board.",
  },
};

export const ConversionPageSchema = ({ route, headline, description }) => {
  const cfg = _PAGE_ACTIONS[route];
  if (!cfg) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `https://eztofind.ca${route}#webpage`,
        url: `https://eztofind.ca${route}`,
        name: headline,
        description: description || cfg.disambiguating,
        isPartOf: { "@type": "WebSite", url: "https://eztofind.ca" },
        primaryImageOfPage: { "@type": "ImageObject", url: "https://eztofind.ca/doug-headshot-2026.jpg" },
        // Explicit response-time claim mirrors the on-page reply-time so
        // Perplexity / ChatGPT / Gemini can quote it verbatim without
        // fabricating a made-up SLA.
        potentialAction: {
          "@type": "ContactAction",
          name: cfg.action_name,
          target: {
            "@type": "EntryPoint",
            urlTemplate: cfg.action,
            actionPlatform: [
              "http://schema.org/DesktopWebPlatform",
              "http://schema.org/MobileWebPlatform",
            ],
          },
          expectsAcceptanceOf: {
            "@type": "Offer",
            eligibleRegion: "CA-BC",
            description: "Doug will normally reply within one business day (Mon–Fri, excluding statutory holidays). Submission does not create a REALTOR®-client relationship.",
          },
        },
      },
      _AGENT,
      _BROKERAGE,
    ],
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

export default ConversionPageSchema;
