import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextFooter } from "../components/homenext/HomeNextExtras";
import { HnIdentity, HnListingHero, HnDoogie } from "../components/homenext/HomeNextShared";
import { DoogieChat } from "../App";

const HERO_PATH = "/api/listings/equestrian?sort=price_asc&limit=24&price_min=2000000";

const STEPS = [
  { t: "ALR status", s: "Many BC horse properties sit inside the Agricultural Land Reserve. Verify status against the BC Agricultural Land Commission map before you write an offer." },
  { t: "Municipal zoning", s: "Confirm — in writing — that the zone permits stables and your specific livestock. Watch for statutory building schemes and restrictive covenants." },
  { t: "Water rights", s: "Most BC domestic wells authorize household use only. Livestock watering may need a separate Water Sustainability Act authorization." },
  { t: "Septic capacity", s: "Barns, staff quarters and secondary dwellings often require an engineered system. Confirm with a BC Registered Onsite Wastewater Practitioner (ROWP)." },
  { t: "Title search & covenants", s: "Pull a current title from the Land Title and Survey Authority. Legacy covenants prohibiting livestock are common in older Fraser Valley subdivisions." },
];

export default function EquestrianNext() {
  useEffect(() => {
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "index, follow");
    return () => { el.setAttribute("content", prev); };
  }, []);

  return (
    <div className="hn" data-testid="equestrian-next">
      <Helmet>
        <title>Equestrian & Acreage Properties · EZtoFind.ca</title>
        <meta name="robots" content="index, follow"/>
        <meta name="description" content="Live MLS® listings for horse-friendly acreage across BC, plus a 5-step buyer checklist covering ALR, zoning, water rights, septic and title. Doug LeMaire, REALTOR®."/>
      </Helmet>
      <HomeNextNav/>
      <main>
        <section className="hn-phero" data-testid="equestrian-hero">
          <div className="hn-wrap">
            <p className="hn-phero__eyebrow hn-rise">BC's horse country</p>
            <h1 className="hn-rise hn-rise-2" data-testid="equestrian-title">Equestrian &amp; acreage properties.</h1>
            <p className="hn-phero__sub hn-rise hn-rise-3">Hobby farms, dedicated equestrian facilities, and rural homes with paddock potential — from Langley's ALR corridor to Fraser Valley barn country and beyond.</p>
            <div className="hn-rise hn-rise-4" style={{ marginBottom: 40 }}><HnIdentity testId="equestrian-identity"/></div>
            <HnListingHero
              path={HERO_PATH}
              testId="equestrian-mediahero"
              browse={{ to: "/specialties/equestrian", label: "Browse equestrian listings" }}
            />
          </div>
        </section>

        <section className="hn-section" style={{ paddingTop: "clamp(40px,5vw,64px)" }} data-testid="equestrian-callout-section">
          <div className="hn-wrap">
            <div className="hn-callout" style={{ display: "flex", gap: 14, alignItems: "flex-start", maxWidth: "none" }} data-testid="equestrian-callout">
              <AlertTriangle size={22} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1, color: "var(--hn-gold)" }}/>
              <div><strong>Verify before you buy.</strong> A beautiful acreage isn't automatically a legal horse property. Confirm ALR status, zoning, water rights, septic capacity and any registered covenants <em>before</em> you write an offer — the checklist below walks through each one.</div>
            </div>
          </div>
        </section>

        <section className="hn-section hn-section--alt" data-testid="equestrian-checklist">
          <div className="hn-wrap">
            <div className="hn-center">
              <h2 className="hn-h2">The 5-step buyer checklist.</h2>
              <p className="hn-lead" style={{ marginInline: "auto" }}>Every horse property in BC needs these five verifications. Skip one and you may end up with a lot you can't legally keep animals on.</p>
            </div>
            <ol className="hn-steps" style={{ maxWidth: 820, margin: "0 auto" }}>
              {STEPS.map((s, i) => (
                <li key={s.t} data-testid={`equestrian-step-${i + 1}`}>
                  <span className="hn-steps__n">{i + 1}</span>
                  <div><h4>{s.t}</h4><p>{s.s}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="hn-section" data-testid="equestrian-cols">
          <div className="hn-wrap">
            <div className="hn-cols">
              <div className="hn-col" data-testid="equestrian-col-buyers">
                <h3>Buying acreage</h3>
                <p>Doug knows the ALR, zoning and water questions that make or break a horse property — so you spend your energy on the right listings, not the ones that can never work.</p>
              </div>
              <div className="hn-col" data-testid="equestrian-col-sellers">
                <h3>Selling acreage</h3>
                <p>Barns, arenas, water licences and outbuildings need the right story and the right buyer. Doug prices and markets acreage for what it truly is.</p>
              </div>
            </div>
          </div>
        </section>

        <HnDoogie
          dir="left"
          imgSrc="/images/doogie/doogie-thinking-transparent.png"
          eyebrow="Ask Doogie"
          title="Not sure what ALR or a water licence means?"
          body="Doogie explains BC acreage terms in plain language, with the statute or authority behind each answer. General information only — always verify specifics with the listing REALTOR®, the municipality and the Agricultural Land Commission."
          cta="Ask Doogie a question"
          testId="equestrian-doogie"
        />

        <section className="hn-section hn-section--alt" data-testid="equestrian-cta">
          <div className="hn-wrap hn-center">
            <h2 className="hn-h2">Let's find your acreage.</h2>
            <p className="hn-lead" style={{ marginInline: "auto" }}>Tell Doug what you're looking for, or list the horse property you already own.</p>
            <div className="hn-ctarow" style={{ justifyContent: "center" }}>
              <Link to="/buyer" className="hn-pill hn-pill--navy hn-pill--lg" data-testid="equestrian-cta-buyer">Start as an equestrian buyer</Link>
              <Link to="/valuation" className="hn-pill hn-pill--lg" data-testid="equestrian-cta-seller">List your horse property</Link>
            </div>
          </div>
        </section>

        <section className="hn-section" style={{ paddingTop: 0 }} data-testid="equestrian-compliance">
          <div className="hn-wrap">
            <div className="hn-fineblock">
              Listings shown are from the CREA DDF® feed and are current at time of load. All representations about a specific property (value, ALR status, permitted animals, water rights, condition) must be verified with the listing REALTOR®, a BC lawyer or notary, the applicable municipality, the Agricultural Land Commission, and independent inspectors. Doug LeMaire, REALTOR® (Fraser Property Management Realty Services Ltd., BCFSA #167790) provides general information and referral services under the BC Real Estate Services Act, regulated by BCFSA. Not an opinion of value. Not intended to solicit properties currently listed for sale or buyers under contract with another REALTOR®.
            </div>
          </div>
        </section>
      </main>
      <HomeNextFooter/>
      <DoogieChat/>
    </div>
  );
}
