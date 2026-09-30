import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight, MapPin } from "lucide-react";
import axios from "axios";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextFooter } from "../components/homenext/HomeNextExtras";
import { IMG } from "../App";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const slugify = (c) => encodeURIComponent(c.toLowerCase().replace(/[^a-z0-9]+/g, "-"));

// Region → cinematic band image (reuses existing shared assets) + a
// representative community slug used only to surface ONE live current
// temperature per region (honours the page's "live climate data" promise
// without fetching weather for all 240 communities).
const REGION_META = {
  "Greater Vancouver": { img: IMG.vancouver, weatherSlug: "vancouver" },
  "Fraser Valley": { img: IMG.fraserValley, weatherSlug: "abbotsford" },
  "Sea-to-Sky": { img: IMG.seaToSky, weatherSlug: "whistler" },
  "Vancouver Island & Gulf Islands": { img: IMG.vancouverIsland, weatherSlug: "victoria" },
  "Sunshine Coast": { weatherSlug: "sechelt" },
  "Okanagan": { weatherSlug: "kelowna" },
  "Southern Interior": { weatherSlug: "kamloops" },
  "Kootenay": { weatherSlug: "nelson" },
  "Cariboo": { weatherSlug: "williams-lake" },
  "Northern BC": { weatherSlug: "prince-george" },
  "Central Coast": { weatherSlug: "bella-coola" },
  "Haida Gwaii": { weatherSlug: "masset" },
};

// Minimal WMO weather-code → short label (mirrors App.js WMO(), text-only).
const wmoLabel = (code) => {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return null;
};

// Live current-conditions chip shown on each region band. Uses the existing
// /community/{slug}/forecast endpoint (Open-Meteo, fast) — one call per region.
const RegionWeather = ({ slug, testId }) => {
  const [w, setW] = useState(null);
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    axios.get(`${API}/community/${slug}/forecast`, { timeout: 12000 })
      .then((r) => { if (alive && r.data && r.data.current) setW(r.data.current); })
      .catch(() => {});
    return () => { alive = false; };
  }, [slug]);
  if (!w || typeof w.temp_c !== "number") return null;
  const label = wmoLabel(w.code);
  return (
    <span className="hn-comm-band__wx" data-testid={testId}>
      <span className="hn-comm-band__wxdot" aria-hidden="true" />
      {Math.round(w.temp_c)}°C{label ? ` · ${label}` : ""} · live
    </span>
  );
};

// Preview-only Apple-style redesign of the BC Communities index. Backend is
// untouched — same GET /api/communities payload ({ region: [names] }).
export default function CommunitiesNext() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("All");

  useEffect(() => {
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "noindex, nofollow");
    return () => { el.setAttribute("content", prev); };
  }, []);

  useEffect(() => {
    let alive = true;
    axios.get(`${API}/communities`).then((r) => { if (alive) setData(r.data || {}); }).catch(() => { if (alive) setData({}); });
    return () => { alive = false; };
  }, []);

  const regionNames = useMemo(() => (data ? Object.keys(data) : []), [data]);
  const total = useMemo(() => (data ? Object.values(data).reduce((n, arr) => n + arr.length, 0) : 0), [data]);

  const query = q.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!data) return [];
    return regionNames
      .filter((rg) => region === "All" || rg === region)
      .map((rg) => ({ region: rg, list: (data[rg] || []).filter((c) => !query || c.toLowerCase().includes(query)) }))
      .filter((sec) => sec.list.length > 0);
  }, [data, regionNames, region, query]);

  const matchCount = visible.reduce((n, s) => n + s.list.length, 0);

  return (
    <div className="hn hn-comm" data-testid="communities-next">
      <Helmet>
        <title>BC Communities — {total || 240} Community Profiles with Live Climate Data | EZtoFind.ca</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Explore British Columbia community profiles across Greater Vancouver, the Fraser Valley and Sea-to-Sky — each with live climate data, market snapshots and neighbourhood detail." />
      </Helmet>
      <HomeNextNav />
      <main>
        <section className="hn-phero hn-comm-hero" data-testid="communities-hero">
          <div className="hn-wrap">
            <p className="hn-phero__eyebrow hn-rise">British Columbia</p>
            <h1 className="hn-rise hn-rise-2" data-testid="communities-title">Explore BC communities.</h1>
            <p className="hn-phero__sub hn-rise hn-rise-3">
              {total || 240} community profiles across Greater Vancouver, the Fraser Valley and the Sea-to-Sky Corridor — each with live climate data, market snapshots and neighbourhood detail.
            </p>
            <div className="hn-comm-search hn-rise hn-rise-4" role="search">
              <Search size={19} strokeWidth={2} aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a community — Whistler, Coquitlam, Squamish…"
                aria-label="Search communities"
                data-testid="communities-search"
              />
              {q && <button type="button" className="hn-comm-search__clear" onClick={() => setQ("")} aria-label="Clear search" data-testid="communities-search-clear">×</button>}
            </div>
          </div>
        </section>

        {data && regionNames.length > 0 && (
          <section className="hn-comm-controls" data-testid="communities-controls">
            <div className="hn-wrap">
              <div className="hn-comm-seg" role="tablist" aria-label="Filter by region">
                {["All", ...regionNames].map((rg) => (
                  <button
                    key={rg}
                    role="tab"
                    aria-selected={region === rg}
                    className={`hn-comm-seg__btn${region === rg ? " is-active" : ""}`}
                    onClick={() => setRegion(rg)}
                    data-testid={`communities-region-${slugify(rg)}`}
                  >
                    {rg}
                  </button>
                ))}
              </div>
              <p className="hn-comm-count" data-testid="communities-count">
                {query || region !== "All" ? `${matchCount} ${matchCount === 1 ? "community" : "communities"}` : `${total} communities`}
              </p>
            </div>
          </section>
        )}

        {!data && (
          <section className="hn-section" data-testid="communities-loading"><div className="hn-wrap"><p className="hn-lead">Loading communities…</p></div></section>
        )}

        {data && visible.length === 0 && (
          <section className="hn-section" data-testid="communities-empty">
            <div className="hn-wrap hn-comm-empty">
              <MapPin size={30} strokeWidth={1.6} />
              <h2 className="hn-h2" style={{ fontSize: "1.5rem" }}>No communities found</h2>
              <p className="hn-lead" style={{ margin: "0 auto" }}>Try a different spelling, or clear the search to see all {total} profiles.</p>
              <button type="button" className="hn-pill hn-pill--navy" onClick={() => { setQ(""); setRegion("All"); }} data-testid="communities-reset">Show all communities</button>
            </div>
          </section>
        )}

        {data && visible.map(({ region: rg, list }, ri) => {
          const meta = REGION_META[rg] || {};
          return (
            <section className="hn-comm-section" key={rg} data-testid={`communities-section-${slugify(rg)}`}>
              <div className="hn-wrap">
                <div className="hn-comm-band" style={{ backgroundImage: `url('${meta.img || IMG.bcHero}')` }}>
                  <div className="hn-comm-band__shade" />
                  <div className="hn-comm-band__row">
                    <div>
                      <h2 className="hn-comm-band__title">{rg}</h2>
                      <span className="hn-comm-band__meta">{list.length} {list.length === 1 ? "community" : "communities"}</span>
                    </div>
                    {meta.weatherSlug && <RegionWeather slug={meta.weatherSlug} testId={`communities-weather-${slugify(rg)}`} />}
                  </div>
                </div>
                <div className="hn-comm-grid" data-testid={`communities-grid-${slugify(rg)}`}>
                  {list.map((c) => (
                    <Link
                      key={c}
                      to={`/community/${slugify(c)}`}
                      state={{ name: c, region: rg }}
                      className="hn-comm-card"
                      data-testid={`community-card-${slugify(c)}`}
                    >
                      <span className="hn-comm-card__name">{c}</span>
                      <span className="hn-comm-card__region">{rg}</span>
                      <ArrowUpRight className="hn-comm-card__arrow" size={17} strokeWidth={2} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        <section className="hn-section" style={{ paddingTop: 0 }} data-testid="communities-compliance">
          <div className="hn-wrap">
            <p className="hn-fineblock" style={{ textAlign: "center", maxWidth: 820, margin: "0 auto" }}>
              Community profiles include AI-assisted synopses reviewed by Doug LeMaire, REALTOR® — general information only, not advice. Climate figures are current conditions and 30-year normals from Environment and Climate Change Canada / Open-Meteo. REALTOR®, REALTORS® and MLS® are trademarks controlled by The Canadian Real Estate Association (CREA).
            </p>
          </div>
        </section>
      </main>
      <HomeNextFooter />
    </div>
  );
}
