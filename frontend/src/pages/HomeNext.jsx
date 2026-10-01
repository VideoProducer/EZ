import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import "../components/homenext/homeNext.css";
import { HomeNextNav, HomeNextHero } from "../components/homenext/HomeNextHero";
import { HomeNextTiles, HomeNextStats } from "../components/homenext/HomeNextTiles";
import { HomeNextFeatured, HomeNextRegions } from "../components/homenext/HomeNextFeatured";
import { HomeNextQuote, HomeNextTools, HomeNextDoug, HomeNextFooter, HomeNextSticky } from "../components/homenext/HomeNextExtras";
import { DoogieChat } from "../App";

// Apple-style landing page. Rendered at `/` (isHome, indexable) and mirrored at
// /home-next (noindex preview) for side-by-side comparison.
export default function HomeNext({ isHome = false }) {
  // The static index.html ships an "index, follow" robots tag. Only the preview
  // (/home-next) should hide from crawlers; the promoted homepage stays indexable.
  useEffect(() => {
    if (isHome) return;
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "noindex, nofollow");
    return () => { el.setAttribute("content", prev); };
  }, [isHome]);
  return (
    <div className="hn" data-testid="home-next">
      <Helmet>
        <title>Search BC MLS® Real Estate Listings — Live CREA DDF® Feed | EZtoFind.ca</title>
        {isHome
          ? <link rel="canonical" href="https://eztofind.ca/"/>
          : <meta name="robots" content="noindex, nofollow"/>}
        <meta name="description" content="Live MLS® listings across British Columbia, a free home value estimate, and Doogie — plain-language answers to BC real estate questions."/>
      </Helmet>
      <HomeNextNav/>
      <main>
        <HomeNextHero/>
        <HomeNextTiles/>
        <HomeNextStats/>
        <HomeNextFeatured/>
        <section data-testid="home-search-band" style={{ background: "#F7F9FC", borderTop: "1px solid rgba(0,0,0,0.06)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="hn-wrap" style={{ textAlign: "center", padding: "56px 0" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#0F2A5B", fontWeight: 700, fontSize: "clamp(26px,3.4vw,38px)", lineHeight: 1.1, margin: 0 }}>
              Browse BC listings by community
            </h2>
            <p style={{ color: "#6e6e73", fontSize: 16, lineHeight: 1.6, maxWidth: 560, margin: "14px auto 26px" }}>
              Explore live MLS® inventory across Greater Vancouver, the Fraser Valley and Sea-to-Sky — updated continuously from the CREA DDF® feed.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/listings" data-testid="home-band-search" style={{ background: "#0F2A5B", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 15, padding: "13px 26px", borderRadius: 999 }}>
                Search all listings
              </Link>
              <Link to="/communities" data-testid="home-band-communities" style={{ background: "#fff", color: "#0F2A5B", textDecoration: "none", fontWeight: 600, fontSize: 15, padding: "13px 26px", borderRadius: 999, border: "1px solid rgba(15,42,91,0.25)" }}>
                Browse by community →
              </Link>
            </div>
          </div>
        </section>
        <HomeNextDoug/>
        <HomeNextRegions/>
        <HomeNextQuote/>
        <HomeNextTools/>
      </main>
      <HomeNextFooter/>
      <HomeNextSticky/>
      <DoogieChat/>
    </div>
  );
}
