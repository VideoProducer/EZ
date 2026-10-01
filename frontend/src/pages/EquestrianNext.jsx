import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextFooter } from "../components/homenext/HomeNextExtras";
import { HnIdentity, HnListingHero } from "../components/homenext/HomeNextShared";
import { DoogieChat } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;
const HERO_PATH = "/api/listings/equestrian?sort=price_asc&limit=24&price_min=2000000";

// What to look at before buying a BC horse property — Doug's local criteria.
const CRITERIA = [
  { t: "ALR status", s: "Most Fraser Valley and many Sea-to-Sky horse properties are in the Agricultural Land Reserve. That protects farm use and generally allows barns, stables, and arenas as farm buildings — but it limits house size, extra dwellings, subdivision, and non-farm commercial use. Ask the listing agent, then check the ALC map." },
  { t: "Zoning", s: "Look for rural or agricultural zones (Langley RU-1, RU-3 and similar; regional district rural zones in Squamish and Pemberton). Confirm livestock is a permitted use, and whether a commercial boarding or riding school needs a separate approval." },
  { t: "Animal limits and setbacks", s: "Municipalities often cap horses by lot size and require barn and manure setbacks from property lines and wells. Don\u2019t assume \u201cacreage\u201d means unlimited horses." },
  { t: "Usable land, not just titled acres", s: "Steep, treed, or floodplain land doesn\u2019t count as turnout. Fraser Valley buyers look for flat, drained pasture. Sea-to-Sky lots are often sloped — usable paddock area matters more than total acreage." },
  { t: "Water", s: "Private wells should be checked for flow. A rough planning figure is about 30\u201350 litres per horse per day, plus irrigation. City water is a plus in parts of Langley and Maple Ridge." },
  { t: "Services", s: "Septic vs sewer, power (200 amp, sometimes 3-phase for an arena), and driveway access for hay trucks and trailers." },
];

const REGIONS = ["Anywhere", "Lower Mainland", "Fraser Valley", "Sea-to-Sky", "Okanagan", "Vancouver Island", "Kootenays", "Northern BC"];

// Province-wide equestrian + acreage MLS® search (live CREA DDF® feed).
function EquestrianSearch() {
  const [region, setRegion] = useState("Anywhere");
  const [sort, setSort] = useState("newest");
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    setLoading(true);
    const url = `${API}/api/listings/equestrian?region_chip=${encodeURIComponent(region)}&sort=${encodeURIComponent(sort)}&limit=24`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (stop) return;
        setListings((d && d.listings) || []);
        setTotal((d && (d.total ?? (d.listings || []).length)) || 0);
        setLoading(false);
      })
      .catch(() => { if (!stop) { setListings([]); setTotal(0); setLoading(false); } });
    return () => { stop = true; };
  }, [region, sort]);

  const fmt = (p) => (typeof p === "number" ? `$${p.toLocaleString("en-CA")}` : "Contact for price");

  return (
    <section className="hn-section hn-section--alt" data-testid="equestrian-search">
      <div className="hn-wrap">
        <div className="hn-center">
          <h2 className="hn-h2">Search equestrian &amp; acreage listings across BC.</h2>
          <p className="hn-lead" style={{ marginInline: "auto" }}>Live CREA DDF® MLS® listings for horse-friendly acreage province-wide. Filter by region, then open any listing for full details.</p>
        </div>

        <div className="eq-search__chips" data-testid="equestrian-search-chips">
          {REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              className={`eq-chip${region === r ? " eq-chip--on" : ""}`}
              data-testid={`equestrian-region-${r.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            >
              {r === "Anywhere" ? "All BC" : r}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="eq-sort"
            data-testid="equestrian-sort"
            aria-label="Sort listings"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>
        </div>

        {loading ? (
          <p className="hn-lead" style={{ textAlign: "center" }} data-testid="equestrian-search-loading">Loading listings…</p>
        ) : listings.length === 0 ? (
          <p className="hn-lead" style={{ textAlign: "center" }} data-testid="equestrian-search-empty">No equestrian listings found in this region right now. Try “All BC”.</p>
        ) : (
          <>
            <p className="eq-count" data-testid="equestrian-search-count">
              {total.toLocaleString("en-CA")} equestrian &amp; acreage listing{total === 1 ? "" : "s"}{region !== "Anywhere" ? ` in ${region}` : " across BC"}
            </p>
            <div className="eq-grid" data-testid="equestrian-search-grid">
              {listings.map((l) => {
                const photo = (l.photos && l.photos[0]) || "/images/home-next-hero.jpg";
                const addr = l.unparsed_address || l.street_address || [l.city, l.region].filter(Boolean).join(", ");
                return (
                  <Link
                    key={l.listing_key}
                    to={`/listing/${encodeURIComponent(l.listing_key)}`}
                    className="eq-card"
                    data-testid={`equestrian-card-${l.listing_key}`}
                  >
                    <div className="eq-card__img" style={{ backgroundImage: `url('${photo}')` }} aria-hidden="true" />
                    <div className="eq-card__body">
                      <div className="eq-card__price">{fmt(l.list_price)}</div>
                      <div className="eq-card__addr">{addr}</div>
                      <div className="eq-card__meta">
                        {l.beds != null && <span>{l.beds} bd</span>}
                        {l.baths != null && <span>{l.baths} ba</span>}
                        {l.property_type && <span>{l.property_type}</span>}
                      </div>
                      <div className="eq-card__mls">
                        {l.city}{(l.mls_number || l.listing_key) ? ` · MLS® ${l.mls_number || l.listing_key}` : ""}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="hn-center" style={{ marginTop: 28 }}>
              <Link to="/listings" className="hn-pill hn-pill--navy hn-pill--lg" data-testid="equestrian-search-all">
                Open the full BC MLS® search <ArrowRight size={15} />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

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
        <meta name="description" content="Rotating MLS® listings of equestrian & acreage properties in the Lower Mainland, Fraser Valley & Sea-to-Sky, plus Doug's buyer criteria (ALR, zoning, water, usable land) and a province-wide BC equestrian listing search."/>
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
            />
          </div>
        </section>

        <section className="hn-section hn-section--alt" data-testid="equestrian-criteria">
          <div className="hn-wrap">
            <div className="hn-center">
              <h2 className="hn-h2">How to read a BC horse property.</h2>
              <p className="hn-lead" style={{ marginInline: "auto" }}>The rotating MLS® listings above are equestrian &amp; acreage properties in the Lower Mainland, Fraser Valley, and Sea-to-Sky Corridor only. Here's the criteria Doug uses to judge whether an acreage is a genuine, legal horse property.</p>
            </div>
            <ol className="hn-steps" style={{ maxWidth: 820, margin: "0 auto" }}>
              {CRITERIA.map((c, i) => (
                <li key={c.t} data-testid={`equestrian-criteria-${i + 1}`}>
                  <span className="hn-steps__n">{i + 1}</span>
                  <div><h4>{c.t}</h4><p>{c.s}</p></div>
                </li>
              ))}
            </ol>
            <p className="hn-lead" style={{ maxWidth: 820, margin: "28px auto 0" }}>A common local stocking guide is about 1 acre of usable pasture per horse if you buy most of the hay, and more if you want rotational grazing. A 5-acre flat parcel often supports a small private barn (roughly 3–5 horses); commercial boarding needs more land and the right zoning.</p>
          </div>
        </section>

        <EquestrianSearch/>

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
