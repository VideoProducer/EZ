import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import "../components/homenext/homeNext.css";
import { HomeNextNav, HomeNextHero } from "../components/homenext/HomeNextHero";
import { HomeNextTiles, HomeNextStats } from "../components/homenext/HomeNextTiles";
import { HomeNextFeatured, HomeNextRegions } from "../components/homenext/HomeNextFeatured";
import { HomeNextQuote, HomeNextTools, HomeNextDoug, HomeNextFooter, HomeNextSticky } from "../components/homenext/HomeNextExtras";
import { HnDoogie } from "../components/homenext/HomeNextShared";
import { DoogieChat } from "../App";

// Preview-only alternative homepage (Apple-style). Lives at /home-next so it
// can be compared side-by-side with `/`; noindex until promoted.
export default function HomeNext() {
  // The static index.html ships an "index, follow" robots tag; hide it while
  // this preview route is mounted so crawlers see a single noindex directive.
  useEffect(() => {
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "noindex, nofollow");
    return () => { el.setAttribute("content", prev); };
  }, []);
  return (
    <div className="hn" data-testid="home-next">
      <Helmet>
        <title>Find your Lower Mainland, Fraser Valley, Sea to Sky Corridor home — EZtoFind.ca</title>
        <meta name="robots" content="noindex, nofollow"/>
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
