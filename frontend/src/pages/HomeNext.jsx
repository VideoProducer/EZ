import React from "react";
import { Helmet } from "react-helmet-async";
import "../components/homenext/homeNext.css";
import { HomeNextNav, HomeNextHero } from "../components/homenext/HomeNextHero";
import { HomeNextTiles, HomeNextStats } from "../components/homenext/HomeNextTiles";
import { HomeNextFeatured, HomeNextRegions } from "../components/homenext/HomeNextFeatured";
import { HomeNextQuote, HomeNextTools, HomeNextFooter, HomeNextSticky } from "../components/homenext/HomeNextExtras";
import { DoogieChat } from "../App";

// Preview-only alternative homepage (Apple-style). Lives at /home-next so it
// can be compared side-by-side with `/`; noindex until promoted.
export default function HomeNext() {
  return (
    <div className="hn" data-testid="home-next">
      <Helmet>
        <title>Find home in BC — EZtoFind.ca · Doug LeMaire, REALTOR®</title>
        <meta name="robots" content="noindex, nofollow"/>
        <meta name="description" content="Live MLS® listings across British Columbia, a free home value estimate, and Doogie — plain-language answers to BC real estate questions."/>
      </Helmet>
      <HomeNextNav/>
      <main>
        <HomeNextHero/>
        <HomeNextTiles/>
        <HomeNextStats/>
        <HomeNextFeatured/>
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
