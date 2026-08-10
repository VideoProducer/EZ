// UnlistedMockupBanner
// Wraps preview/mockup pages that are LIVE at their route but must not be
// discoverable by search engines or listed in navigation.  Renders:
//   1. A <Helmet> block that inserts `noindex, nofollow, noarchive` meta
//      tags so Google/Bing and AI-crawlers respect the parked status.
//   2. A visible amber strip at the top of the page so anyone Doug shares
//      the URL with understands this is an unlisted preview.
//
// Usage: place at the very top of the mockup's returned JSX:
//   <UnlistedMockupBanner label="Equestrian Due-Diligence Checklist"/>
import React from "react";
import { Helmet } from "react-helmet-async";

export default function UnlistedMockupBanner({ label }) {
  const pageTitle = `[Unlisted] ${label || "Unlisted Preview"} · EZtoFind.ca`;
  return (
    <>
      <Helmet>
        {/* Belt-and-suspenders: robots.txt already blocks /mockups/ for
            crawlers, but this meta tag protects us if the URL is shared
            via social/DM channels where the crawler bypasses robots.txt. */}
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet"/>
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet"/>
        <title>{pageTitle}</title>
      </Helmet>
      <div
        data-testid="unlisted-mockup-banner"
        style={{
          background:"#FEF3C7",
          color:"#78350F",
          padding:"10px 20px",
          fontFamily:"Inter, sans-serif",
          fontSize:"0.85rem",
          textAlign:"center",
          borderBottom:"2px solid #F5A623",
          fontWeight:600,
          letterSpacing:"0.02em",
        }}
        className="no-print"
      >
        🔒 <strong>UNLISTED PREVIEW</strong> — {label || "this page"} is parked for Doug's review. Not linked from any navigation, blocked from search engines, and not in the sitemap.
      </div>
    </>
  );
}
