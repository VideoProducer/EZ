import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextFooter } from "../components/homenext/HomeNextExtras";
import { HnDoogie } from "../components/homenext/HomeNextShared";
import { IMG, DoogieChat } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

const STATS = [
  { n: "13 years", l: "BC real estate" },
  { n: "3 regions", l: "worked in person" },
  { n: "Fraser Property Management Realty Services Ltd.", l: "" },
];

const WHAT = [
  { t: "Detached Homes", to: "/listings", path: "/api/listings?property_type=House&sort=price_desc&limit=20" },
  { t: "Acreages & Equestrians", to: "/specialties/equestrian", path: "/api/listings/equestrian?sort=price_desc&limit=20" },
  { t: "Luxury", to: "/luxury-next", path: "/api/listings?property_type=House&price_min=3000000&sort=price_desc&limit=20" },
  { t: "Residential Stratas", to: "/listings", path: "/api/listings?property_type=Apartment&sort=price_desc&limit=20" },
];

const REGIONS = [
  { slug: "greater-vancouver", title: "Greater Vancouver", img: IMG.vancouver },
  { slug: "fraser-valley", title: "Fraser Valley", img: IMG.fraserValley },
  { slug: "sea-to-sky", title: "Sea-to-Sky", img: IMG.seaToSky },
];

// Preview-only Apple-style About page (Doug-approved concept). Same content
// spirit as /about — new front end.
export default function AboutNext() {
  const [imgs, setImgs] = useState({});

  useEffect(() => {
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "noindex, nofollow");
    return () => { el.setAttribute("content", prev); };
  }, []);

  useEffect(() => {
    let stop = false;
    WHAT.forEach(w => {
      fetch(`${API}${w.path}`).then(r => r.ok ? r.json() : null).then(d => {
        if (stop || !d) return;
        const pool = (d.listings || []).filter(l => Array.isArray(l.photos) && l.photos.length).map(l => l.photos[0]);
        if (pool.length) {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          const im = new Image(); im.src = pick;
          setImgs(prev => ({ ...prev, [w.t]: pick }));
        }
      }).catch(() => {});
    });
    return () => { stop = true; };
  }, []);

  return (
    <div className="hn" data-testid="about-next">
      <Helmet>
        <title>About Doug LeMaire, REALTOR® — EZtoFind.ca</title>
        <meta name="robots" content="noindex, nofollow"/>
        <meta name="description" content="Meet Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd. Thirteen years helping buyers and sellers across Greater Vancouver, the Fraser Valley and Sea-to-Sky."/>
      </Helmet>
      <HomeNextNav/>
      <main>
        <section className="hn-phero" data-testid="about-hero">
          <div className="hn-wrap">
            <div className="hn-abouthero">
              <div>
                <p className="hn-phero__eyebrow hn-rise">About</p>
                <h1 className="hn-rise hn-rise-2" data-testid="about-title">Doug LeMaire, REALTOR®</h1>
                <p className="hn-phero__sub hn-rise hn-rise-3">Thirteen years helping people buy and sell across Greater Vancouver, the Fraser Valley and the Sea-to-Sky Corridor.</p>
                <div className="hn-ctarow hn-rise hn-rise-4">
                  <Link to="/contact" className="hn-pill hn-pill--navy hn-pill--lg" data-testid="about-cta-contact">Talk to Doug</Link>
                  <Link to="/valuation" className="hn-pill hn-pill--lg" data-testid="about-cta-valuation">Free market estimate</Link>
                </div>
              </div>
              <img className="hn-abouthero__photo hn-rise hn-rise-3" src="/images/doug-lemaire.jpg" alt="Doug LeMaire, REALTOR®" decoding="async" data-testid="about-photo"/>
            </div>

            <div className="hn-statrow" data-testid="about-stats">
              {STATS.map((s, i) => (
                <div key={i} data-testid={`about-stat-${i}`}>
                  <strong>{s.n}</strong>{s.l ? <span>{s.l}</span> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hn-section" style={{ paddingTop: "clamp(32px,4vw,56px)" }} data-testid="about-whatido">
          <div className="hn-wrap">
            <h2 className="hn-h2" style={{ marginBottom: 28 }}>What I do.</h2>
            <div className="hn-whatido">
              {WHAT.map(({ t, to }) => (
                <Link to={to} className="hn-wtile" key={t} data-testid={`about-what-${t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                  <div className="hn-wtile__img" style={imgs[t] ? { backgroundImage: `url('${imgs[t]}')` } : undefined}/>
                  <div className="hn-wtile__shade"/>
                  <span className="hn-wtile__label">{t}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="hn-section hn-section--alt" data-testid="about-belief">
          <div className="hn-wrap">
            <p className="hn-belief">Informed clients make better decisions. My job is to make good information easy to find.</p>
          </div>
        </section>

        <section className="hn-section" data-testid="about-where">
          <div className="hn-wrap">
            <h2 className="hn-h2" style={{ marginBottom: 28 }}>Where I work.</h2>
            <div className="hn-aboutregions">
              {REGIONS.map(r => (
                <Link to={`/regions/${r.slug}`} className="hn-aboutregion" key={r.slug} data-testid={`about-region-${r.slug}`}>
                  <img src={r.img} alt={r.title} loading="lazy" decoding="async"/>
                  <div className="hn-aboutregion__shade"/>
                  <span>{r.title}</span>
                </Link>
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

        <section className="hn-section" style={{ paddingTop: 0 }} data-testid="about-compliance">
          <div className="hn-wrap">
            <p className="hn-fineblock" style={{ textAlign: "center", maxWidth: 760 }}>
              Not intended to solicit properties currently listed for sale, or buyers under contract with another REALTOR®. REALTOR®, REALTORS® and MLS® are trademarks controlled by The Canadian Real Estate Association (CREA). Real estate services provided by Doug LeMaire, REALTOR®, Fraser Property Management Realty Services Ltd., BCFSA #167790, regulated by the BC Financial Services Authority.
            </p>
          </div>
        </section>
      </main>
      <HomeNextFooter/>
      <DoogieChat/>
    </div>
  );
}
