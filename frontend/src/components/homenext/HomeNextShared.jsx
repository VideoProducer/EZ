import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Doug identity line — exact studio headshot + licensee prominence (RESA/BCFSA).
export const HnIdentity = ({ testId = "hn-identity" }) => (
  <div className="hn-idl" data-testid={testId}>
    <img src="/doug-headshot-2026.jpg" alt="Doug LeMaire, REALTOR®" width={56} height={56} decoding="async"/>
    <div>
      <strong>Doug LeMaire, REALTOR®</strong>
      <span>Fraser Property Management Realty Services Ltd. · BCFSA #167790</span>
    </div>
  </div>
);

// Doogie mascot band. `dir` chooses the pointing image that faces the copy:
// mascot on the left points right (toward the text); on the right points left.
export const HnDoogie = ({
  dir = "right",
  eyebrow = "Ask Doogie",
  title = "Questions? Doogie has answers.",
  body = "Plain-language answers to BC real estate questions — with the statute or source behind each one. General information, never advice.",
  to = "/visual-agent-demo",
  cta = "Start a chat",
  testId = "hn-doogie",
}) => {
  const img = dir === "left" ? "pointing-left-transparent" : "pointing-right-transparent";
  return (
    <section className="hn-section" data-testid={testId}>
      <div className="hn-wrap">
        <div className={`hn-doogie hn-doogie--${dir}`}>
          <img src={`/images/doogie/${img}.png`} alt="Doogie, the EZtoFind.ca AI helper" loading="lazy" decoding="async" data-testid={`${testId}-img`}/>
          <div className="hn-doogie__txt">
            <p className="hn-doogie__eyebrow">{eyebrow}</p>
            <h2 className="hn-h2">{title}</h2>
            <p>{body}</p>
            <Link to={to} className="hn-pill hn-pill--light" data-testid={`${testId}-cta`}>{cta} <ArrowRight size={15}/></Link>
          </div>
        </div>
      </div>
    </section>
  );
};

// Generic rotating hero — live CREA DDF® photos from any listings path.
// `path` is everything after the API base, e.g. "/api/listings?price_min=…".
export const HnListingHero = ({ path, caption, fallback = "/images/home-next-hero.jpg", testId = "hn-mediahero" }) => {
  const [pool, setPool] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let stop = false;
    fetch(`${API}${path}`).then(r => r.ok ? r.json() : null).then(d => {
      if (stop || !d) return;
      const items = (d.listings || [])
        .filter(l => Array.isArray(l.photos) && l.photos.length > 0)
        .slice(0, 12);
      items.forEach(l => { const im = new Image(); im.src = l.photos[0]; });
      setPool(items);
    }).catch(() => {});
    return () => { stop = true; };
  }, [path]);

  useEffect(() => {
    if (pool.length < 2) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setIdx(i => (i + 1) % pool.length);
    }, 6000);
    return () => clearInterval(t);
  }, [pool.length]);

  const cur = pool[idx];
  return (
    <div className="hn-hero__media" data-testid={testId}>
      <div className="hn-lhero" style={{ backgroundImage: `url('${fallback}')` }}>
        {pool.map((l, i) => (
          <div key={l.listing_key} className="hn-lhero__slide" aria-hidden={i !== idx}
            style={{ backgroundImage: `url('${l.photos[0]}')`, opacity: i === idx ? 1 : 0 }}/>
        ))}
        <div className="hn-lhero__shade" aria-hidden="true"/>
        {cur && (
          <div className="hn-lhero__chip hn-lhero__chip--static" data-testid={`${testId}-mls`}>
            MLS® {cur.mls_number || cur.listing_key}{cur.city ? ` · ${cur.city}` : ""}
          </div>
        )}
        {pool.length > 1 && (
          <div className="hn-lhero__dots" aria-hidden="true">
            {pool.map((l, i) => <span key={l.listing_key} className={i === idx ? "on" : ""}/>)}
          </div>
        )}
      </div>
      {caption && <div className="hn-hero__caption">{caption}</div>}
    </div>
  );
};
