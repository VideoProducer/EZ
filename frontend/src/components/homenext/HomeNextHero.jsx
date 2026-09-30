import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, Home } from "lucide-react";
import { HomeNextListingHero } from "./HomeNextListingHero";

export const HomeNextNav = () => {
  const navigate = useNavigate();
  return (
  <header className="hn-nav" data-testid="hn-nav">
    <div className="hn-wrap hn-nav__inner">
      <div className="hn-nav__left">
        <div className="hn-nav__jump" data-testid="hn-nav-jump">
          <button type="button" onClick={() => navigate(-1)} className="hn-nav__jumpbtn" data-testid="hn-nav-back" aria-label="Go back">
            <ChevronLeft size={16} strokeWidth={2.2}/><span>Back</span>
          </button>
          <Link to="/" className="hn-nav__jumpbtn" data-testid="hn-nav-home" aria-label="Home">
            <Home size={15} strokeWidth={2.2}/><span>Home</span>
          </Link>
        </div>
        <Link to="/" className="hn-nav__brand" data-testid="hn-nav-brand"><img src="/brand/eztofind-logo-720.png" alt="EZtoFind.ca" width={720} height={175} decoding="async"/></Link>
        <div className="hn-nav__id" data-testid="hn-nav-identity">
          <img src="/doug-headshot-2026.jpg" alt="Doug LeMaire, REALTOR®" width={38} height={38} decoding="async"/>
          <div>
            <strong>Doug LeMaire, REALTOR®</strong>
            <span>Fraser Property Management Realty Services Ltd.</span>
          </div>
        </div>
      </div>
      <input type="checkbox" id="hn-nav-toggle" className="hn-nav__toggle" aria-hidden="true"/>
      <label htmlFor="hn-nav-toggle" className="hn-nav__burger" aria-label="Open menu" data-testid="hn-nav-burger"><span/><span/><span/></label>
      <nav className="hn-nav__links" aria-label="Primary">
        <Link to="/listings" data-testid="hn-nav-buy">Buy</Link>
        <Link to="/valuation" data-testid="hn-nav-sell">Sell</Link>
        <Link to="/luxury-next" data-testid="hn-nav-luxury">Luxury</Link>
        <Link to="/equestrian-next" data-testid="hn-nav-equestrian">Equestrian</Link>
        <Link to="/communities" data-testid="hn-nav-communities">Communities</Link>
        <Link to="/glossary" data-testid="hn-nav-glossary">Glossary</Link>
        <Link to="/visual-agent-demo" data-testid="hn-nav-doogie">Doogie</Link>
        <Link to="/buyer" className="hn-nav__links-cta" data-testid="hn-nav-cta-mobile">Talk to Doug</Link>
      </nav>
      <Link to="/buyer" className="hn-nav__cta" data-testid="hn-nav-cta">Talk to Doug</Link>
    </div>
  </header>
  );
};

export const HomeNextHero = () => {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/listings?q=${encodeURIComponent(term)}` : "/listings");
  };
  return (
    <section className="hn-hero" data-testid="hn-hero">
      <div className="hn-wrap">
        <img
          className="hn-hero__mascot hn-rise"
          src="/images/doogie/doogie-laptop-hero.png"
          alt="Doogie — the EZtoFind.ca real estate helper"
          decoding="async"
          data-testid="hn-hero-mascot"
        />
        <p className="hn-hero__eyebrow hn-rise">Live MLS® listings across British Columbia</p>
        <h1 className="hn-hero__title hn-rise hn-rise-2" data-testid="hn-hero-title">Find your Lower Mainland, Fraser Valley, Sea to Sky Corridor home.</h1>
        <form className="hn-search hn-rise hn-rise-4" onSubmit={submit} role="search" data-testid="hn-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a city, neighbourhood or MLS® number"
            aria-label="Search listings"
            data-testid="hn-search-input"
          />
          <button type="submit" aria-label="Search" data-testid="hn-search-submit"><ArrowRight size={20} strokeWidth={2.2}/></button>
        </form>
        <div className="hn-hero__pills hn-rise hn-rise-4">
          <Link to="/buyer" className="hn-pill" data-testid="hn-cta-buying">I'm buying</Link>
          <Link to="/valuation" className="hn-pill" data-testid="hn-cta-selling">I'm selling</Link>
        </div>
        <HomeNextListingHero/>
      </div>
    </section>
  );
};
