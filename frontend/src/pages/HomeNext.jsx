import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import "../components/homenext/homeNext.css";
import { HomeNextNav, HomeNextHero } from "../components/homenext/HomeNextHero";
import { HomeNextTiles, HomeNextStats } from "../components/homenext/HomeNextTiles";
import { HomeNextFeatured, HomeNextRegions } from "../components/homenext/HomeNextFeatured";
import { HomeNextQuote, HomeNextTools, HomeNextDoug, HomeNextFooter, HomeNextSticky } from "../components/homenext/HomeNextExtras";
import { HnDoogie } from "../components/homenext/HomeNextShared";
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
        <title>Find your Lower Mainland, Fraser Valley, Sea to Sky Corridor home — EZtoFind.ca</title>
        {isHome
          ? <link rel="canonical" href="https://eztofind.ca/"/>
          : <meta name="robots" content="noindex, nofollow"/>}
        <meta name="description" content="Live MLS® listings across British Columbia, a free home value estimate, and Doogie — plain-language answers to BC real estate questions."/>
      </Helmet>
      <HomeNextNav/>
      <main>
        <HomeNextHero/>
        <HomeNextTiles/>
        <HnDoogie dir="right" imgSrc="/images/doogie/doogie-thinking.png"/>
        <HomeNextStats/>
        <HomeNextFeatured/>
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
