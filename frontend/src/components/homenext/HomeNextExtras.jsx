import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = process.env.REACT_APP_BACKEND_URL;

export const HomeNextQuote = () => {
  const [t, setT] = useState(null);
  useEffect(() => {
    let stop = false;
    fetch(`${API}/api/testimonials`).then(r => r.ok ? r.json() : null).then(d => {
      if (stop || !d?.testimonials?.length) return;
      setT(d.testimonials.find(x => x.is_featured) || d.testimonials[0]);
    }).catch(() => {});
    return () => { stop = true; };
  }, []);
  if (!t) return null;
  const stars = "★".repeat(Math.max(0, Math.min(5, Number(t.rating) || 5)));
  return (
    <section className="hn-section" data-testid="hn-quote">
      <div className="hn-wrap hn-quote">
        <blockquote>“{t.text}”</blockquote>
        <div className="hn-quote__who">
          <span className="hn-quote__avatar">{(t.reviewer_name || "•").slice(0, 2)}</span>
          <span>{t.reviewer_name}{t.context ? ` · ${t.context}` : ""}{t.source ? ` · ${t.source} review` : ""}</span>
          <span className="hn-quote__stars" aria-label={`${stars.length} star rating`}>{stars}</span>
        </div>
      </div>
    </section>
  );
};

const TOOLS = [
  { to: "/tools/bc-buyer-cost-calculator", t: "Buyer closing costs", s: "PTT, legal, adjustments — the full number before you offer." },
  { to: "/tools/mortgage-affordability", t: "Mortgage affordability", s: "Stress-test your budget with today's qualifying rate." },
  { to: "/relocating", t: "Moving to BC quiz", s: "Answer six questions, get communities that fit." },
  { to: "/glossary", t: "Plain-English glossary", s: "Every term, cited to the BC statute it comes from." },
];

export const HomeNextTools = () => (
  <section className="hn-section hn-section--alt" data-testid="hn-tools">
    <div className="hn-wrap">
      <div className="hn-center">
        <h2 className="hn-h2">Free tools. No sign-up.</h2>
        <p className="hn-lead">Use them anonymously. Talk to Doug only when you're ready.</p>
      </div>
      <div className="hn-tools">
        {TOOLS.map(x => (
          <Link to={x.to} className="hn-tool" key={x.to} data-testid={`hn-tool-${x.to.split("/").pop()}`}>
            <strong>{x.t}</strong><span>{x.s}</span>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export const HomeNextDoug = () => (
  <section className="hn-section" data-testid="hn-doug">
    <div className="hn-wrap">
      <div className="hn-abouthero">
        <div>
          <p className="hn-phero__eyebrow">Your REALTOR®</p>
          <h2 data-testid="hn-doug-title">Doug LeMaire, REALTOR®</h2>
          <p className="hn-phero__sub">Thirteen years helping people buy and sell across Greater Vancouver, the Fraser Valley and the Sea-to-Sky Corridor.</p>
          <div className="hn-ctarow">
            <Link to="/buyer" className="hn-pill hn-pill--navy hn-pill--lg" data-testid="hn-doug-contact">Talk to Doug</Link>
            <Link to="/valuation" className="hn-pill hn-pill--lg" data-testid="hn-doug-valuation">Free market estimate</Link>
          </div>
        </div>
        <img className="hn-abouthero__photo" src="/images/doug-lemaire.jpg" alt="Doug LeMaire, REALTOR®" loading="lazy" decoding="async" data-testid="hn-doug-photo"/>
      </div>
      <div className="hn-statrow" data-testid="hn-doug-stats">
        <div><strong>13 years</strong><span>BC real estate</span></div>
        <div><strong>3 regions</strong><span>worked in person</span></div>
        <div><strong>Fraser Property Management Realty Services Ltd.</strong></div>
      </div>
    </div>
  </section>
);

export const HomeNextFooter = () => (
  <footer className="hn-footer" data-testid="hn-footer">
    <div className="hn-wrap">
      <div className="hn-footer__row">
        <div>
          <strong>Doug LeMaire, REALTOR®</strong> · BCFSA Licence #167790<br/>
          Fraser Property Management Realty Services Ltd. · 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5<br/>
          Direct <a href="tel:+16047870851" data-testid="hn-footer-phone">(604) 787-0851</a> · Brokerage <a href="tel:+16044667021">(604) 466-7021</a> · <a href="mailto:info@eztofind.ca">info@eztofind.ca</a>
        </div>
        <nav className="hn-footer__links" aria-label="Legal">
          <Link to="/listings" data-testid="hn-footer-search">Search BC listings</Link><Link to="/privacy">Privacy (PIPA)</Link><Link to="/terms">Terms</Link><Link to="/compliance">Compliance</Link><Link to="/copyright">Copyright</Link><Link to="/ai-use">AI Use</Link><Link to="/about">About Doug</Link><Link to="/realtor-network" data-testid="hn-footer-realtor-network">REALTOR® Network</Link>
        </nav>
      </div>
      <p>Not intended to solicit properties currently listed for sale or buyers currently under contract with another REALTOR®. Doogie is an AI-assisted helper that provides general information only — never legal, tax or financial advice.</p>
      <p data-testid="hn-crea-notice">The trademarks REALTOR®, REALTORS®, and the REALTOR® logo are controlled by The Canadian Real Estate Association (CREA) and identify real estate professionals who are members of CREA. The trademarks MLS®, Multiple Listing Service® and the associated logos are owned by CREA and identify the quality of services provided by real estate professionals who are members of CREA. Listing data is provided by CREA DDF® and is deemed reliable but not guaranteed.</p>
      <p>© 2026 Doug LeMaire. All rights reserved.</p>
    </div>
  </footer>
);

export const HomeNextSticky = () => (
  <div className="hn-sticky" data-testid="hn-sticky-cta">
    <strong>What's my home worth?</strong>
    <Link to="/valuation">Find out</Link>
  </div>
);
