// FeatureShowcase — /showcase
//
// A one-tap, highly shareable marketing page that bundles EZtoFind.ca's
// standout, nobody-else-in-BC features (Doogie AI narration + Family Viewing
// Party TV casting + ask-in-plain-words MLS® search). Built to be dropped into
// an agent community feed / social post and have the link render a rich
// preview, with one-tap native/SMS/WhatsApp share buttons.
//
// COMPLIANCE (mandatory, same bar as the rest of the site)
//   • BCFSA licensee + brokerage name/address/phone on render
//   • CREA reciprocity: MLS®/REALTOR® trademarks + live CREA DDF® attribution
//   • No property-specific advice, no value/investment claims, no superlatives
//     about worth — feature descriptions are factual.
//   • Open Graph + Twitter Card so shares render a big preview card.

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const CANONICAL = "https://eztofind.ca/showcase";
const OG_IMAGE = "https://eztofind.ca/og/feature-showcase.jpg";

const C = {
  navy: "#0F2A5B", gold: "#F5A623", cream: "#F5F0E1",
  ink: "#1F2937", muted: "#6B7280", paper: "#FAFAF7", blue: "#1E4FCF",
};

const FEATURES = [
  {
    icon: "🎙️",
    title: "Doogie talks you through any home",
    body: "Open any listing and tap \u201CHave Doogie walk me through this home.\u201D An AI voice tours the photos room-by-room so buyers can listen instead of squint \u2014 general info only, never a value opinion.",
    cta: "Try it on a live listing",
    to: "/listings",
    testid: "showcase-feature-doogie",
  },
  {
    icon: "📺",
    title: "Family Viewing Party \u2014 cast to the TV",
    body: "Cast any BC MLS\u00AE listing from your phone to the big screen with a 6-digit code. No app, no screen-mirroring, no login. Your phone becomes the remote and the whole couch sees the same room.",
    cta: "See how it works",
    to: "/family-viewing-party",
    testid: "showcase-feature-fvp",
  },
  {
    icon: "🔎",
    title: "Search by just asking",
    body: "Type \u201C3-bed townhouse in Maple Ridge under $900k\u201D in plain words and get live CREA DDF\u00AE results instantly \u2014 no clunky filter menus.",
    cta: "Open live MLS\u00AE search",
    to: "/listings",
    testid: "showcase-feature-search",
  },
];

// One-tap share: native share sheet on mobile, SMS + WhatsApp + copy fallback.
const ShareRow = ({ dark }) => {
  const shareText = "The BC real estate site that talks you through homes and casts them to your TV. Check out EZtoFind.ca:";
  const fullMsg = `${shareText} ${CANONICAL}`;
  const smsHref = `sms:?&body=${encodeURIComponent(fullMsg)}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(fullMsg)}`;
  const [done, setDone] = useState("");
  const onShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "EZtoFind.ca", text: shareText, url: CANONICAL }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(fullMsg); setDone("copied"); } catch (e) {}
    window.location.href = smsHref;
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(CANONICAL); setDone("copied"); setTimeout(() => setDone(""), 2500); } catch (e) {}
  };
  const primaryColor = dark ? "#fff" : C.navy;
  const primaryBg = dark ? C.gold : C.navy;
  const primaryInk = dark ? C.navy : "#fff";
  const outlineBorder = dark ? "1.5px solid rgba(255,255,255,0.5)" : `1.5px solid ${C.navy}`;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }} data-testid="showcase-share">
      <button type="button" onClick={onShare} data-testid="showcase-share-primary"
        style={{ background: primaryBg, color: primaryInk, border: "none", padding: "0.85rem 1.5rem", borderRadius: 999, cursor: "pointer", fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "1rem", boxShadow: "0 6px 16px rgba(0,0,0,0.18)" }}>
        🔗 Share EZtoFind
      </button>
      <a href={waHref} target="_blank" rel="noopener noreferrer" data-testid="showcase-share-whatsapp"
        style={{ background: "transparent", color: primaryColor, border: outlineBorder, padding: "0.85rem 1.3rem", borderRadius: 999, textDecoration: "none", fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "1rem" }}>
        WhatsApp
      </a>
      <a href={smsHref} data-testid="showcase-share-sms"
        style={{ background: "transparent", color: primaryColor, border: outlineBorder, padding: "0.85rem 1.3rem", borderRadius: 999, textDecoration: "none", fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "1rem" }}>
        Text it
      </a>
      <button type="button" onClick={copy} data-testid="showcase-share-copy"
        style={{ background: "transparent", color: primaryColor, border: outlineBorder, padding: "0.85rem 1.3rem", borderRadius: 999, cursor: "pointer", fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "1rem" }}>
        Copy link
      </button>
      {done === "copied" && <span data-testid="showcase-share-copied" style={{ fontSize: "0.82rem", color: primaryColor, opacity: 0.9 }}>Copied ✓</span>}
    </div>
  );
};

const JSONLD = () => {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "EZtoFind.ca Feature Showcase",
    description: "Doogie AI listing narration, Family Viewing Party TV casting, and ask-in-plain-words live MLS® search — the BC real estate tools unique to EZtoFind.ca.",
    url: CANONICAL,
    primaryImageOfPage: OG_IMAGE,
    isPartOf: { "@type": "WebSite", name: "EZtoFind.ca", url: "https://eztofind.ca" },
    about: FEATURES.map((f) => ({ "@type": "Thing", name: f.title })),
  };
  return <script type="application/ld+json">{JSON.stringify(data)}</script>;
};

export default function FeatureShowcase() {
  return (
    <main style={{ background: C.paper, color: C.ink, fontFamily: "Inter,system-ui,sans-serif" }} data-testid="feature-showcase">
      <Helmet>
        <title>EZtoFind.ca — AI home narration, TV casting & plain-words MLS® search</title>
        <meta name="description" content="The BC real estate site that talks you through any listing with an AI voice, casts homes to your TV in 3 taps, and lets you search live MLS® by just asking. See the demos on EZtoFind.ca." />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="EZtoFind.ca" />
        <meta property="og:title" content="The BC site that talks you through homes — and casts them to your TV" />
        <meta property="og:description" content="AI listing narration, one-tap Family Viewing Party TV casting, and ask-in-plain-words live MLS® search. Nobody else in BC does this." />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1536" />
        <meta property="og:image:height" content="1024" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="The BC site that talks you through homes — and casts them to your TV" />
        <meta name="twitter:description" content="AI listing narration, one-tap TV casting, and ask-in-plain-words live MLS® search on EZtoFind.ca." />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Helmet>
      <JSONLD />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ background: C.navy, color: "#fff", padding: "4rem 1.25rem 3.5rem" }} aria-labelledby="showcase-h1">
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, marginBottom: "1rem" }}>
            EZtoFind.ca · Built for British Columbia
          </div>
          <h1 id="showcase-h1" style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, letterSpacing: "-0.02em", fontSize: "clamp(2rem,5.5vw,3.4rem)", lineHeight: 1.05, margin: "0 0 1rem", maxWidth: "20ch" }}>
            The BC site that <span style={{ color: C.gold }}>talks you through</span> homes — and casts them to your TV.
          </h1>
          <p style={{ fontSize: "clamp(1rem,2.2vw,1.2rem)", lineHeight: 1.6, maxWidth: "52ch", opacity: 0.92, margin: "0 0 1.75rem" }}>
            Three things no other BC real estate site does: an AI that narrates any listing, one-tap casting to the family TV, and live MLS® search you can run by just asking in plain words.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1.75rem" }}>
            <Link to="/listings" data-testid="showcase-hero-cta"
              style={{ background: C.gold, color: C.navy, padding: "0.9rem 1.6rem", borderRadius: 999, textDecoration: "none", fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "1.05rem", boxShadow: "0 6px 16px rgba(245,166,35,0.35)" }}>
              Explore the live site →
            </Link>
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, opacity: 0.9, marginBottom: "0.6rem" }}>Share it in one tap:</div>
          <ShareRow dark />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section style={{ padding: "3.5rem 1.25rem", maxWidth: 1040, margin: "0 auto" }} aria-label="Features">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.25rem" }}>
          {FEATURES.map((f) => (
            <div key={f.testid} data-testid={f.testid}
              style={{ background: "#fff", border: "1px solid rgba(15,42,91,0.1)", borderRadius: 18, padding: "1.75rem", display: "flex", flexDirection: "column", boxShadow: "0 2px 10px rgba(15,42,91,0.05)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }} aria-hidden="true">{f.icon}</div>
              <h2 style={{ fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "1.25rem", color: C.navy, margin: "0 0 0.6rem", lineHeight: 1.2 }}>{f.title}</h2>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: C.ink, margin: "0 0 1.25rem", flex: 1 }}>{f.body}</p>
              <Link to={f.to} data-testid={`${f.testid}-cta`}
                style={{ color: C.blue, fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none" }}>
                {f.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── SHARE BAND ───────────────────────────────────────── */}
      <section style={{ background: C.cream, padding: "3rem 1.25rem" }} aria-labelledby="showcase-share-h2">
        <div style={{ maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>
          <h2 id="showcase-share-h2" style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "clamp(1.4rem,3.5vw,2rem)", color: C.navy, margin: "0 0 0.75rem" }}>
            Know someone house-hunting in BC?
          </h2>
          <p style={{ fontSize: "1rem", lineHeight: 1.6, color: C.ink, maxWidth: "48ch", margin: "0 auto 1.5rem" }}>
            Send them the tools — a tap to text, WhatsApp, or copy the link.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ShareRow />
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE FOOTER ────────────────────────────────── */}
      <footer style={{ background: C.navy, color: "rgba(255,255,255,0.85)", padding: "2.5rem 1.25rem", fontSize: "0.8rem", lineHeight: 1.6 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <p style={{ margin: "0 0 0.75rem" }}>
            Listings on EZtoFind.ca are sourced live from the CREA DDF® feed and shown for information only. MLS®, REALTOR®, and associated logos are trademarks owned by the Canadian Real Estate Association (CREA). This page describes website features and is not advice or an opinion of property value.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Doug LeMaire, REALTOR®</strong> · Fraser Property Management Realty Services Ltd. (BCFSA #167790) · 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5 · <a href="tel:604-787-0851" style={{ color: C.gold }}>(604) 787-0851</a> · <Link to="/privacy" style={{ color: C.gold }}>Privacy (PIPA)</Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
