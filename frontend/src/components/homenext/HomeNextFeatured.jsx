import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { FLAGSHIP } from "../../config/flagshipListing";
import { IMG } from "../../App";

const FILM_URL = "https://player.vimeo.com/video/1218107137?app_id=122963&title=0&byline=0&portrait=0&autoplay=1";

export const HomeNextFeatured = () => {
  const [playing, setPlaying] = useState(false);
  return (
    <section className="hn-section" data-testid="hn-featured">
      <div className="hn-wrap hn-featured">
        <div
          className="hn-featured__media"
          onClick={() => !playing && setPlaying(true)}
          role={playing ? undefined : "button"}
          aria-label={playing ? undefined : "Play the film"}
          tabIndex={playing ? undefined : 0}
          onKeyDown={(e) => { if (!playing && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setPlaying(true); } }}
        >
          {playing ? (
            <iframe
              src={FILM_URL}
              title={`${FLAGSHIP.address}, ${FLAGSHIP.city} — a short film`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              data-testid="hn-featured-iframe"
            />
          ) : (
            <>
              <img src={FLAGSHIP.hero_image} alt={`${FLAGSHIP.address}, ${FLAGSHIP.community}, ${FLAGSHIP.city}`} loading="lazy" decoding="async"/>
              <span className="hn-featured__badge">Sold · 10 days</span>
              <button type="button" className="hn-featured__play" aria-label="Play video" data-testid="hn-featured-play">
                <Play size={28} fill="currentColor" strokeWidth={0} style={{ marginLeft: 4 }}/>
              </button>
            </>
          )}
        </div>
        <div>
          <p className="hn-featured__eyebrow">Recently sold</p>
          <h2 className="hn-h2">{FLAGSHIP.address}.<br/>Sold in 10 days.</h2>
          <p className="hn-lead" style={{ marginBottom: 24 }}>
            {FLAGSHIP.community}, {FLAGSHIP.city}. Listed and represented by Doug LeMaire, REALTOR®. Watch the short film to see how a home is presented — then let's talk about yours.
          </p>
          <Link to="/valuation" className="hn-pill hn-pill--navy" data-testid="hn-featured-cta">What's my home worth?</Link>
          <p className="hn-featured__fine">
            MLS® {FLAGSHIP.mls_number}. Not intended to solicit properties currently listed for sale or buyers under contract with another REALTOR®.
          </p>
        </div>
      </div>
    </section>
  );
};

const REGIONS = [
  { slug: "greater-vancouver", title: "Greater Vancouver", img: IMG.vancouver, sub: "22 communities, from Kitsilano to West Van." },
  { slug: "fraser-valley", title: "Fraser Valley", img: IMG.fraserValley, sub: "Langley, Abbotsford, Chilliwack — space meets city." },
  { slug: "sea-to-sky", title: "Sea-to-Sky", img: IMG.seaToSky, sub: "Squamish, Whistler, Pemberton." },
];

export const HomeNextRegions = () => (
  <section className="hn-section hn-section--alt" data-testid="hn-regions">
    <div className="hn-wrap">
      <div className="hn-center">
        <h2 className="hn-h2">Where do you want to live?</h2>
        <p className="hn-lead">Three corridors Doug works in person. Every community has its own guide — schools, commute, weather, prices.</p>
      </div>
      <div className="hn-regions">
        {REGIONS.map(r => (
          <Link to={`/regions/${r.slug}`} className="hn-region" key={r.slug} data-testid={`hn-region-${r.slug}`}>
            <img src={r.img} alt={r.title} loading="lazy" decoding="async"/>
            <div className="hn-region__shade"/>
            <div className="hn-region__txt"><h3>{r.title}</h3><p>{r.sub}</p></div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);
