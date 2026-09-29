import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ShieldCheck, MapPin, Clock } from "lucide-react";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextQuote, HomeNextFooter } from "../components/homenext/HomeNextExtras";
import { HnDoogie } from "../components/homenext/HomeNextShared";
import { DoogieChat } from "../App";

const BADGES = [
  { Icon: ShieldCheck, t: "Licensed REALTOR®", s: "Fraser Property Management Realty Services Ltd. · BCFSA #167790" },
  { Icon: MapPin, t: "Local expert", s: "Greater Vancouver, Fraser Valley & the Sea-to-Sky Corridor" },
  { Icon: Clock, t: "Over a decade", s: "Helping BC buyers and sellers, one relationship at a time" },
];

// Preview-only Apple-style About page. Same content spirit as /about — new front end.
export default function AboutNext() {
  useEffect(() => {
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "noindex, nofollow");
    return () => { el.setAttribute("content", prev); };
  }, []);

  return (
    <div className="hn" data-testid="about-next">
      <Helmet>
        <title>About Doug LeMaire, REALTOR® — EZtoFind.ca</title>
        <meta name="robots" content="noindex, nofollow"/>
        <meta name="description" content="Meet Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd. Straight answers and honest guidance for buyers and sellers across Greater Vancouver, the Fraser Valley and Sea-to-Sky."/>
      </Helmet>
      <HomeNextNav/>
      <main>
        <section className="hn-phero" data-testid="about-hero">
          <div className="hn-wrap hn-center">
            <p className="hn-phero__eyebrow hn-rise">About</p>
            <h1 className="hn-rise hn-rise-2" style={{ marginInline: "auto" }} data-testid="about-title">Doug LeMaire, REALTOR®</h1>
            <p className="hn-phero__sub hn-rise hn-rise-3" style={{ marginInline: "auto" }}>Straight answers, plain language, and honest guidance — from someone who genuinely enjoys the work.</p>
          </div>
        </section>

        <section className="hn-section" style={{ paddingTop: 0 }} data-testid="about-doug">
          <div className="hn-wrap">
            <div className="hn-doug">
              <img className="hn-doug__photo" src="/images/doug-lemaire.jpg" alt="Doug LeMaire, REALTOR®" decoding="async" data-testid="about-photo"/>
              <div>
                <p className="hn-doug__eyebrow">A quick hello</p>
                <p>I'm Doug LeMaire, a licensed REALTOR® with Fraser Property Management Realty Services Ltd. For over a decade I've helped people buy and sell across Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor to Whistler.</p>
                <p>My work centres on detached homes, acreages and equestrian properties, luxury real estate, residential strata, and probate and estate sales — and it's work I genuinely enjoy.</p>
                <p><strong>EZtoFind.ca — BC real estate, easy to find. Facts first. REALTOR® when you're ready.</strong> The site is built to give buyers and sellers straight answers, plain-language terminology, and the facts on the buying and selling process anywhere in the province.</p>
                <p>If you're buying or selling in Greater Vancouver, the Fraser Valley, or Sea-to-Sky, I'd be glad to help. For enquiries beyond my service area, I can connect you with a licensed REALTOR® through our <Link to="/referral-request">Referral REALTOR®</Link> link.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="hn-section hn-section--alt" data-testid="about-badges">
          <div className="hn-wrap">
            <div className="hn-badges">
              {BADGES.map(({ Icon, t, s }) => (
                <div className="hn-badge" key={t} data-testid={`about-badge-${t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                  <div className="hn-badge__ic"><Icon size={22} strokeWidth={1.8}/></div>
                  <strong>{t}</strong><span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HnDoogie
          dir="left"
          eyebrow="Meet Doogie"
          title="Doug's AI research helper."
          body="While you decide whether the time is right to call, Doogie can answer BC real estate questions in plain language — with the statute or source behind each one. General information only, never advice."
          cta="Ask Doogie a question"
        />

        <HomeNextQuote/>

        <section className="hn-section hn-section--alt" data-testid="about-cta">
          <div className="hn-wrap hn-center">
            <h2 className="hn-h2">Ready when you are.</h2>
            <p className="hn-lead" style={{ marginInline: "auto" }}>No pressure, no obligation — just a straight conversation about your next move.</p>
            <div className="hn-ctarow" style={{ justifyContent: "center" }}>
              <Link to="/valuation" className="hn-pill hn-pill--navy hn-pill--lg" data-testid="about-cta-valuation">What's my home worth?</Link>
              <Link to="/buyer" className="hn-pill hn-pill--lg" data-testid="about-cta-buyer">Tell Doug what you're looking for</Link>
            </div>
          </div>
        </section>
      </main>
      <HomeNextFooter/>
      <DoogieChat/>
    </div>
  );
}
