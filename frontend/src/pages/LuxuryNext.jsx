import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextFooter } from "../components/homenext/HomeNextExtras";
import { HnIdentity, HnListingHero } from "../components/homenext/HomeNextShared";
import { DoogieChat } from "../App";

// Live CREA DDF® luxury pool ≥ $3M across Doug's corridors.
const CITIES = [
  "Vancouver", "West Vancouver", "North Vancouver", "Burnaby", "Whistler",
  "White Rock", "Surrey", "Langley", "Delta", "Richmond", "Coquitlam",
  "Port Moody", "Squamish", "Pemberton",
].map(encodeURIComponent).join(",");
const EXCL_TYPES = "Vacant Land,Lot,Land,Agriculture,Farm,Residential Commercial Mix,Mixed Use";
const HERO_PATH = `/api/listings?price_min=3000000&city=${CITIES}&exclude_property_type=${encodeURIComponent(EXCL_TYPES)}&sort=price_desc&limit=24`;

const PRINCIPLES = [
  { t: "Pricing the market can respect on day one.", s: "A number that invites offers instead of resistance — grounded in recent comparable sales, not wishful thinking." },
  { t: "Presentation that matches the home.", s: "Preparation, photography and film that show a significant home the way it deserves to be seen." },
  { t: "Process that carries an offer through to completion.", s: "Discreet negotiation and steady management of every detail, from accepted offer to possession." },
];

export default function LuxuryNext() {
  useEffect(() => {
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "index, follow");
    return () => { el.setAttribute("content", prev); };
  }, []);

  return (
    <div className="hn" data-testid="luxury-next">
      <Helmet>
        <title>Luxury Real Estate — Greater Vancouver, Fraser Valley & Sea-to-Sky — EZtoFind.ca</title>
        <meta name="robots" content="index, follow"/>
        <meta name="description" content="Quiet, private representation for significant homes across Greater Vancouver, the Fraser Valley and Sea-to-Sky. Doug LeMaire, REALTOR® — priced with care, presented with restraint."/>
      </Helmet>
      <HomeNextNav/>
      <main>
        <section className="hn-phero" data-testid="luxury-hero">
          <div className="hn-wrap">
            <p className="hn-phero__eyebrow hn-rise">Private representation</p>
            <h1 className="hn-rise hn-rise-2" data-testid="luxury-title">Luxury residential real estate.</h1>
            <p className="hn-phero__sub hn-rise hn-rise-3">Quiet representation for buyers and sellers of significant homes — priced with care, presented with restraint, and managed through to completion.</p>
            <div className="hn-rise hn-rise-4" style={{ marginBottom: 40 }}><HnIdentity testId="luxury-identity"/></div>
            <HnListingHero
              path={HERO_PATH}
              testId="luxury-mediahero"
              browse={{ to: "/listings?price_min=3000000&sort=price_desc", label: "Browse luxury listings" }}
            />
          </div>
        </section>

        <section className="hn-section hn-section--alt" data-testid="luxury-recent">
          <div className="hn-wrap">
            <div className="hn-center">
              <h2 className="hn-h2">Recent work.</h2>
            </div>
            <div className="hn-prose" style={{ margin: "0 auto", textAlign: "center" }}>
              <p>Notable recent transactions include buyer representation on an acquisition exceeding $3 million plus, and seller representation on a $3 million plus residence that went from listing to sold in 10 days.</p>
            </div>
          </div>
        </section>

        <section className="hn-section" data-testid="luxury-principles">
          <div className="hn-wrap">
            <div className="hn-center">
              <h2 className="hn-h2">Three things decide a high-value file.</h2>
              <p className="hn-lead" style={{ marginInline: "auto" }}>Everything else follows from getting these right.</p>
            </div>
            <ol className="hn-steps" style={{ maxWidth: 760, margin: "0 auto" }}>
              {PRINCIPLES.map((p, i) => (
                <li key={p.t} data-testid={`luxury-principle-${i + 1}`}>
                  <span className="hn-steps__n">{i + 1}</span>
                  <div><h4>{p.t}</h4><p>{p.s}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="hn-section hn-section--alt" data-testid="luxury-quote">
          <div className="hn-wrap hn-quote">
            <blockquote>“We never felt like just another client — he took the time to understand what was important to us and always had our best interests in mind.”</blockquote>
            <div className="hn-quote__who">
              <span className="hn-quote__avatar">G</span>
              <span>Google review · individual client experience, results not typical</span>
              <span className="hn-quote__stars" aria-label="5 star rating">★★★★★</span>
            </div>
          </div>
        </section>

        <section className="hn-section" data-testid="luxury-cols">
          <div className="hn-wrap">
            <div className="hn-cols">
              <div className="hn-col" data-testid="luxury-col-sellers">
                <h3>Sellers</h3>
                <p>When the home is significant, the file needs pricing discipline, discreet exposure, and someone who stays in the details until it completes.</p>
              </div>
              <div className="hn-col" data-testid="luxury-col-buyers">
                <h3>Buyers</h3>
                <p>When the home is scarce, the advantage is a REALTOR® who already knows the pocket and can move with calm urgency.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="hn-section hn-section--alt" data-testid="luxury-cta">
          <div className="hn-wrap hn-center">
            <p className="hn-phero__eyebrow" style={{ color: "var(--hn-gold)" }}>An invitation</p>
            <h2 className="hn-h2" style={{ maxWidth: "22ch", marginInline: "auto" }}>If you're thinking of buying or selling a significant home — let's talk.</h2>
            <p className="hn-lead" style={{ marginInline: "auto" }}>The Lower Mainland, Fraser Valley and Sea to Sky Corridor. No obligation.</p>
            <div className="hn-ctarow" style={{ justifyContent: "center" }}>
              <Link to="/contact" className="hn-pill hn-pill--navy hn-pill--lg" data-testid="luxury-cta-contact">Start a conversation</Link>
              <Link to="/valuation" className="hn-pill hn-pill--lg" data-testid="luxury-cta-valuation">What's my home worth?</Link>
            </div>
          </div>
        </section>

        <section className="hn-section" style={{ paddingTop: 0 }} data-testid="luxury-compliance">
          <div className="hn-wrap">
            <div className="hn-fineblock">
              EZtoFind.ca provides general educational information about BC real estate — not legal, tax, financial, or real estate advice. Real estate services are provided by Doug LeMaire, REALTOR®, Fraser Property Management Realty Services Ltd., BCFSA #167790, regulated by the BC Financial Services Authority (Consumer Protection Line <a href="tel:+18776839664">1-877-683-9664</a>). MLS® listing data is provided under the CREA DDF® licence, is deemed reliable but not guaranteed, and should be verified against REALTOR.ca or the listing brokerage. Not intended to solicit properties currently listed for sale or buyers under contract with another REALTOR®.
            </div>
          </div>
        </section>
      </main>
      <HomeNextFooter/>
      <DoogieChat/>
    </div>
  );
}
