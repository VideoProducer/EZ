import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const HomeNextNav = () => (
  <header className="hn-nav" data-testid="hn-nav">
    <div className="hn-wrap hn-nav__inner">
      <Link to="/" className="hn-nav__brand" data-testid="hn-nav-brand">EZtoFind<span>.ca</span></Link>
      <nav className="hn-nav__links" aria-label="Primary">
        <Link to="/listings" data-testid="hn-nav-buy">Buy</Link>
        <Link to="/valuation" data-testid="hn-nav-sell">Sell</Link>
        <Link to="/communities" data-testid="hn-nav-communities">Communities</Link>
        <Link to="/glossary" data-testid="hn-nav-glossary">Glossary</Link>
        <Link to="/visual-agent-demo" data-testid="hn-nav-doogie">Doogie</Link>
      </nav>
      <Link to="/buyer" className="hn-nav__cta" data-testid="hn-nav-cta">Talk to Doug</Link>
    </div>
  </header>
);

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
        <div className="hn-hero__media hn-rise hn-rise-4">
          <img
            className="hn-hero__img"
            src="/images/home-next-hero.jpg"
            width={1264}
            height={848}
            alt="Howe Sound and the Coast Mountains at golden hour, British Columbia"
            fetchPriority="high"
            decoding="async"
            data-testid="hn-hero-image"
          />
          <div className="hn-hero__caption">Greater Vancouver · Fraser Valley · Sea-to-Sky</div>
        </div>
      </div>
    </section>
  );
};
