import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Map, Gauge, MessageCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const TILES = [
  { id: "search", to: "/listings", Icon: Map, title: "Live MLS® search.",
    body: "Every active listing in BC, straight from the CREA DDF® feed. Map, filters, saved searches.", cta: "Search listings" },
  { id: "valuation", to: "/valuation", Icon: Gauge, title: "What's my home worth?",
    body: "A data-backed market estimate from Doug — not an algorithm guessing. Free, no obligation.", cta: "Get an estimate" },
  { id: "doogie", to: "/visual-agent-demo", Icon: MessageCircle, img: "/images/doogie/doogie-brand.png", title: "Ask Doogie.",
    body: "Plain-language answers to BC real estate questions, with sources. General information, never advice.", cta: "Start a chat" },
];

export const HomeNextTiles = () => (
  <section className="hn-section" data-testid="hn-tiles">
    <div className="hn-wrap">
      <div className="hn-center">
        <h2 className="hn-h2">Three things. Done well.</h2>
        <p className="hn-lead">Find a home. Know its value. Understand the market.</p>
      </div>
      <div className="hn-tiles">
        {TILES.map(({ id, to, Icon, img, title, body, cta }) => (
          <Link to={to} className="hn-tile" key={id} data-testid={`hn-tile-${id}`}>
            {img
              ? <img className="hn-tile__img" src={img} alt="Doogie — the EZtoFind.ca AI helper" loading="lazy" decoding="async"/>
              : <div className="hn-tile__icon"><Icon size={22} strokeWidth={1.8}/></div>}
            <h3>{title}</h3>
            <p>{body}</p>
            <span className="hn-tile__link">{cta} <ArrowRight size={15}/></span>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-CA") : "—");

export const HomeNextStats = () => {
  const [c, setC] = useState(null);
  useEffect(() => {
    let stop = false;
    fetch(`${API}/api/site/counts`).then(r => r.ok ? r.json() : null).then(d => { if (!stop && d) setC(d); }).catch(() => {});
    return () => { stop = true; };
  }, []);
  const stats = [
    { id: "listings", n: c?.active_listings, l: "active MLS® listings, updated hourly" },
    { id: "communities", n: c?.communities, l: "BC community guides" },
    { id: "glossary", n: c?.glossary_terms, l: "statute-cited glossary terms" },
  ];
  return (
    <section className="hn-section hn-section--alt" data-testid="hn-stats">
      <div className="hn-wrap">
        <div className="hn-center">
          <h2 className="hn-h2">Real data. In real time.</h2>
          <p className="hn-lead">Sourced from CREA DDF®, BC statutes and municipal records — and refreshed automatically.</p>
        </div>
        <div className="hn-stats">
          {stats.map(s => (
            <div className="hn-stat" key={s.id} data-testid={`hn-stat-${s.id}`}>
              <div className="hn-stat__n">{fmt(s.n)}</div>
              <div className="hn-stat__l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
