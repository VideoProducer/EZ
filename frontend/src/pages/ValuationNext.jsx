import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { LineChart, Home, ClipboardCheck } from "lucide-react";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextQuote, HomeNextFooter } from "../components/homenext/HomeNextExtras";
import { ValuationNextForm } from "../components/homenext/ValuationNextForm";

const TILES = [
  { Icon: LineChart, t: "How the estimate works.", s: "Doug compares recent MLS® sales of similar homes nearby, adjusts for your lot, condition and timing, and gives you a realistic range — not a single number from an algorithm." },
  { Icon: Home, t: "What Doug looks at.", s: "Location, lot size, age and updates, layout, parking, view and exposure, plus what's currently competing for the same buyer." },
  { Icon: ClipboardCheck, t: "Sell with a plan.", s: "If the number works for you, Doug walks through preparation, pricing strategy, marketing and timing. If it doesn't, no hard feelings — you'll still know where you stand." },
];

// Preview-only Apple-style Market Estimate page. Same backend as /valuation
// (POST /api/leads/seller, DataBC geocoder, Turnstile) — new front end.
export default function ValuationNext() {
  useEffect(() => {
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "noindex, nofollow");
    return () => { el.setAttribute("content", prev); };
  }, []);

  return (
    <div className="hn" data-testid="valuation-next">
      <Helmet>
        <title>What's your home worth? — EZtoFind.ca · Doug LeMaire, REALTOR®</title>
        <meta name="robots" content="noindex, nofollow"/>
        <meta name="description" content="A free, no-obligation BC market estimate from Doug LeMaire, REALTOR®. Reply within one business day. Educational only — not an appraisal."/>
      </Helmet>
      <HomeNextNav/>
      <main>
        <section className="hn-vhero" data-testid="vn-hero">
          <div className="hn-wrap hn-vhero__grid">
            <div className="hn-vhero__copy">
              <p className="hn-hero__eyebrow hn-rise">Free · No obligation</p>
              <h1 className="hn-vhero__title hn-rise hn-rise-2" data-testid="vn-title">What's your home worth?</h1>
              <p className="hn-hero__sub hn-rise hn-rise-3" style={{ margin: "0 0 32px" }}>A real market estimate from Doug LeMaire, REALTOR®. Reply within one business day (Mon–Fri, excluding statutory holidays).</p>
              <div className="hn-vwho hn-rise hn-rise-4" data-testid="vn-identity">
                <img src="/doug-headshot-2026.jpg" alt="Doug LeMaire, REALTOR®" width={52} height={52} decoding="async"/>
                <div>
                  <strong>Doug LeMaire, REALTOR®</strong>
                  <span>Fraser Property Management Realty Services Ltd. · BCFSA #167790</span>
                </div>
              </div>
            </div>
            <div className="hn-vhero__card hn-rise hn-rise-3">
              <ValuationNextForm/>
            </div>
          </div>
        </section>

        <section className="hn-section hn-section--alt" data-testid="vn-tiles">
          <div className="hn-wrap">
            <div className="hn-tiles">
              {TILES.map(({ Icon, t, s }) => (
                <div className="hn-tile hn-tile--static" key={t}>
                  <div className="hn-tile__icon"><Icon size={22} strokeWidth={1.8}/></div>
                  <h3>{t}</h3><p>{s}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HomeNextQuote/>
      </main>
      <HomeNextFooter/>
      <div className="hn-sticky" data-testid="vn-sticky-cta">
        <strong>Talk to Doug</strong>
        <a href="tel:+16047870851" data-testid="vn-sticky-call">Call</a>
      </div>
    </div>
  );
}
