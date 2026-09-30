import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { MessageCircle, Search, Mic, Globe, FileText, Home } from "lucide-react";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextFooter } from "../components/homenext/HomeNextExtras";
import { DoogieChat } from "../App";

const DOOGIE_WHITE_EYES = "/images/doogie/doogie-thinking.png";

// Prompt starters. Clicking one drops the text into the embedded Doogie input
// (via the ez-doogie-ask event handled inside DoogieChat) so the visitor can
// review and send it.
const STARTERS = [
  "What are strata fees and what do they cover?",
  "Show me 3-bedroom homes in Coquitlam under $1.2M",
  "How does the BC Property Transfer Tax work?",
  "What's the difference between a detached home and a townhouse?",
];

const CAPS = [
  { icon: MessageCircle, t: "Plain-language answers", d: "BC real estate terms and how the process works — explained simply, with the source behind each answer." },
  { icon: Search, t: "Live MLS® search", d: "Ask in your own words — Doogie parses it into a search across active CREA DDF® listings." },
  { icon: Mic, t: "Voice in, voice out", d: "Tap the mic to speak, and let Doogie read replies aloud when you'd rather listen." },
  { icon: Globe, t: "Seven languages", d: "Chat in English, Français, 中文, ਪੰਜਾਬੀ, فارسی or Português — with a translation note." },
  { icon: FileText, t: "Cited sources", d: "Answers link to the glossary term, statute or authority so you can verify everything." },
  { icon: Home, t: "Never a listing agent", d: "General information only. Any viewing, offer or valuation is handled by Doug LeMaire, REALTOR®." },
];

// Preview-only Apple-style front end for the Doogie interactive agent. Reuses
// the fully-tested chat engine (DoogieChat, embedded mode) unchanged — this
// page is purely the new presentation shell.
export default function VisualAgentDemoNext() {
  useEffect(() => {
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "noindex, nofollow");
    return () => { el.setAttribute("content", prev); };
  }, []);

  const ask = (text) => window.dispatchEvent(new CustomEvent("ez-doogie-ask", { detail: text }));

  return (
    <div className="hn hn-agent" data-testid="visual-agent-next">
      <Helmet>
        <title>Meet Doogie — your BC real estate AI helper | EZtoFind.ca</title>
        <meta name="robots" content="noindex, nofollow"/>
        <meta name="description" content="Doogie is EZtoFind.ca's AI helper — plain-language answers to BC real estate questions, live MLS® search, voice and seven languages. General information only, never advice."/>
      </Helmet>
      <HomeNextNav/>
      <main>
        <section className="hn-phero hn-agent-hero" data-testid="agent-hero">
          <div className="hn-wrap">
            <div className="hn-agent-herogrid">
              <div>
                <p className="hn-phero__eyebrow hn-rise">Doogie · AI helper</p>
                <h1 className="hn-rise hn-rise-2" data-testid="agent-title">Ask Doogie anything about BC real estate.</h1>
                <p className="hn-phero__sub hn-rise hn-rise-3">A friendly place to get plain-language answers, search live MLS® listings, and learn how buying or selling works in British Columbia — in your own words, and your own language.</p>
                <p className="hn-agent-microline hn-rise hn-rise-4" data-testid="agent-microline">General information only — not legal, tax or financial advice. Doogie is not a listing agent.</p>
              </div>
              <div className="hn-agent-mascot hn-rise hn-rise-3">
                <img src={DOOGIE_WHITE_EYES} alt="Doogie, the EZtoFind.ca AI helper" decoding="async" data-testid="agent-mascot"/>
              </div>
            </div>
          </div>
        </section>

        <section className="hn-section" style={{ paddingTop: 0 }} data-testid="agent-chat-section">
          <div className="hn-wrap">
            <div className="hn-agent-chips" data-testid="agent-starters">
              {STARTERS.map((s, i) => (
                <button key={i} type="button" className="hn-agent-chip" onClick={() => ask(s)} data-testid={`agent-starter-${i}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="hn-agent-stage" data-testid="agent-stage">
              <DoogieChat mode="embedded"/>
            </div>
          </div>
        </section>

        <section className="hn-section hn-section--alt" data-testid="agent-caps">
          <div className="hn-wrap">
            <h2 className="hn-h2" style={{ marginBottom: 12 }}>What Doogie can do.</h2>
            <p className="hn-lead">Built for research and orientation — so you arrive at a conversation with Doug already informed.</p>
            <div className="hn-agent-capgrid">
              {CAPS.map(({ icon: Icon, t, d }, i) => (
                <div className="hn-agent-cap" key={i} data-testid={`agent-cap-${i}`}>
                  <div className="hn-agent-cap__icon"><Icon size={22} strokeWidth={1.8}/></div>
                  <strong>{t}</strong>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hn-section" data-testid="agent-handoff">
          <div className="hn-wrap hn-agent-handoff">
            <h2 className="hn-h2">Ready when you are.</h2>
            <p className="hn-lead" style={{ margin: "0 auto 32px" }}>When you'd like to take the next step, Doug LeMaire, REALTOR® handles everything from here.</p>
            <div className="hn-ctarow" style={{ justifyContent: "center" }}>
              <Link to="/buyer" className="hn-pill hn-pill--navy hn-pill--lg" data-testid="agent-cta-buy">I'm buying</Link>
              <Link to="/valuation" className="hn-pill hn-pill--lg" data-testid="agent-cta-sell">I'm selling</Link>
            </div>
          </div>
        </section>

        <section className="hn-section" style={{ paddingTop: 0 }} data-testid="agent-compliance">
          <div className="hn-wrap">
            <p className="hn-fineblock" style={{ textAlign: "center", maxWidth: 820, margin: "0 auto" }}>
              Doogie is an AI-assisted helper providing general educational information about BC real estate only — it is not legal, tax, financial or property-specific advice, and it is not a substitute for a licensed professional. No listing, offer, contract or agency relationship is formed via Doogie under the Real Estate Services Act (RESA). Chat messages are PII-redacted before storage and purged after 30 days. See our <Link to="/privacy" style={{ color: "var(--hn-navy)", textDecoration: "underline" }}>Privacy Policy (PIPA)</Link> and <Link to="/compliance" style={{ color: "var(--hn-navy)", textDecoration: "underline" }}>Compliance</Link> page. REALTOR®, REALTORS® and MLS® are trademarks controlled by The Canadian Real Estate Association (CREA).
            </p>
          </div>
        </section>
      </main>
      <HomeNextFooter/>
    </div>
  );
}
