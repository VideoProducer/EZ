// ═══════════════════════════════════════════════════════════════════════
// LuxuryQuietLanding.jsx
// ═══════════════════════════════════════════════════════════════════════
// A refined, "quiet luxury" editorial landing page for /specialties/luxury.
// Replaces the previous magazine-style LuxuryLandingMockup on Doug's
// direct spec (Feb 28, 2026): no corridor grid, no rotating hero, no
// testimonial carousel, no CTAs styled as banners. Reads like a private
// sitting room, not a sales page.
//
// SPEC PROVENANCE — every line of body copy in this file is verbatim from
// the "EMERGENT PROMPT — /specialties/luxury" instruction Doug supplied.
// Do not edit copy without confirming with Doug first.
//
// The old page is preserved unchanged at
// `LuxuryLandingMockup.jsx` in case a revert is needed.
// ═══════════════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const API = process.env.REACT_APP_BACKEND_URL;

// Restrained tonal palette — warm white, charcoal, soft slate.
// No gold gradients. No neon CTAs.
const T = {
  paper:    "#FBF9F5",   // warm white background
  ink:      "#1E1F24",   // charcoal (headlines, primary text)
  muted:    "#565963",   // soft slate (body copy)
  hairline: "#E4DDD1",   // dividers (a hair warmer than pure grey)
  accent:   "#7A6A57",   // muted taupe for the pull-quote rule
};

const SERIF = 'ui-serif, Georgia, "Cormorant Garamond", "Times New Roman", serif';
const SANS  = 'ui-sans-serif, -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

// ── Rotating luxury hero ────────────────────────────────────────────
// Cycles through live CREA DDF® listings ≥ $3M every 6 seconds with a
// slow crossfade. Silent — no overlay copy, no motion tricks, no dots.
// The only visible metadata is a whisper-quiet MLS® attribution pill in
// the bottom-right corner (CREA DDF® compliance requirement). If the
// listings API fails or returns nothing, falls back to a single
// restrained architectural still so the page never looks broken.
function RotatingHero() {
  const [photos, setPhotos] = useState([]);
  const [idx, setIdx] = useState(0);
  const fallback =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2000&q=80";

  // Fetch a curated pool of live luxury listings once on mount.
  useEffect(() => {
    let cancelled = false;
    const excl =
      "Vacant+Land,Lot,Land,Agriculture,Farm,Residential+Commercial+Mix,Mixed+Use";
    // Pipe-separated LITERAL patterns only — MongoDB's regex engine
    // rejects grouped-alternation like `foo\s+(a|b)`. See earlier bug fix.
    const excludeKw = encodeURIComponent(
      "land\\s+assembl|development\\s+potential|development\\s+opportunity|development\\s+site|developer'?s?\\s+alert|developer'?s?\\s+dream|future\\s+development|holding\\s+propert|rezoning\\s+potential|subdivid|densification|OCP\\s+designat|investment\\s+land|investment\\s+holding|fully\\s+developed\\s+community|land\\s+banking|revenue\\s+propert"
    );
    const cities = [
      "Vancouver","West Vancouver","North Vancouver","Burnaby","Whistler",
      "White Rock","Surrey","Langley","Delta","Richmond","Coquitlam",
      "Port Moody","New Westminster","Anmore","Belcarra","Lions Bay",
      "Squamish","Pemberton",
    ];
    const cityQ = cities.map(encodeURIComponent).join(",");

    axios
      .get(
        `${API}/api/listings?price_min=3000000&city=${cityQ}&exclude_property_type=${excl}&exclude_description_keywords=${excludeKw}&sort=price_desc&limit=24`
      )
      .then((r) => {
        if (cancelled) return;
        const pool = (r.data?.listings || [])
          .filter((l) => Array.isArray(l.photos) && l.photos.length > 0)
          .map((l) => ({
            url: l.photos[0],
            address: l.address,
            city: l.city,
            listing_key: l.listing_key,
          }))
          .slice(0, 12);
        setPhotos(pool);
      })
      .catch(() => {
        /* silent fallback to static still */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Advance every 6s.
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % photos.length),
      6000
    );
    return () => clearInterval(t);
  }, [photos.length]);

  const current = photos[idx];
  const nextIdx = photos.length > 1 ? (idx + 1) % photos.length : 0;

  return (
    <section
      data-testid="luxury-hero"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 7",
        overflow: "hidden",
        background: `#000 url('${fallback}') center/cover no-repeat`,
        borderBottom: `1px solid ${T.hairline}`,
      }}
    >
      {photos.map((p, i) => (
        <div
          key={p.listing_key || i}
          aria-hidden={i !== idx}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url('${p.url}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: i === idx ? 1 : 0,
            transition: "opacity 1600ms ease",
            zIndex: i === idx ? 2 : 1,
          }}
        />
      ))}
      {/* Preload the next photo invisibly so the crossfade is seamless */}
      {photos[nextIdx] && photos[nextIdx].listing_key !== current?.listing_key && (
        <img
          src={photos[nextIdx].url}
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        />
      )}
      {/* Subtle top gradient so header (if it overlaps) reads on white photos */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(30,31,36,0.10) 0%, rgba(30,31,36,0.02) 60%, transparent 100%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />
      {/* Whisper-quiet MLS® attribution — CREA DDF® rule compliance */}
      {current && (
        <div
          data-testid="luxury-hero-mls-attribution"
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            zIndex: 4,
            fontFamily: SANS,
            fontSize: "0.7rem",
            letterSpacing: "0.06em",
            color: "#FFFFFF",
            background: "rgba(30,31,36,0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            padding: "6px 12px",
            borderRadius: 999,
            lineHeight: 1.4,
          }}
        >
          {current.address ? `${current.address} · ` : ""}
          {current.city ? `${current.city} · ` : ""}
          MLS® #{current.listing_key}
        </div>
      )}
    </section>
  );
}

// ── SEO + Schema ────────────────────────────────────────────────────
function SEOHead() {
  const jsonLdReview = {
    "@context": "https://schema.org",
    "@type": "Review",
    "author": { "@type": "Person", "name": "Google reviewer" },
    "itemReviewed": {
      "@type": "RealEstateAgent",
      "name": "Doug LeMaire, REALTOR®",
      "url": "https://eztofind.ca/",
      "brand": "EZtoFind.ca",
      "worksFor": {
        "@type": "RealEstateOrganization",
        "name": "Fraser Property Management Realty Services Ltd.",
      },
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": "5",
      "bestRating": "5",
      "worstRating": "1",
    },
    "reviewBody":
      "We can't say enough about how amazing Doug was from start to finish. He truly went above and beyond throughout the entire process and made what could have been a stressful experience feel much easier. Doug was always available, incredibly responsive, knowledgeable, professional, and genuinely cared about making sure everything went smoothly. We never felt like just another client — he took the time to understand what was important to us and always had our best interests in mind. What really stood out was how much Doug was willing to do beyond what we expected. His attention to detail, communication, patience, and commitment were exceptional, and we always felt that we were in great hands. We are extremely grateful for everything Doug did for us and would highly recommend him to anyone looking for a realtor. If you want someone who will truly go the extra mile and be there for you every step of the way, Doug is your guy!",
  };

  return (
    <Helmet>
      <title>Luxury Real Estate | South Surrey, Fraser Valley & Sea-to-Sky | EZtoFind.ca</title>
      <meta name="description" content="Representation for significant homes in Greater Vancouver, the Fraser Valley, and Sea-to-Sky. Recent work includes an Elgin Chantrell estate sold in 12 days." />
      <link rel="canonical" href="https://eztofind.ca/specialties/luxury" />
      <meta property="og:title" content="Luxury Real Estate | South Surrey, Fraser Valley & Sea-to-Sky | EZtoFind.ca" />
      <meta property="og:description" content="Representation for significant homes in Greater Vancouver, the Fraser Valley, and Sea-to-Sky. Recent work includes an Elgin Chantrell estate sold in 12 days." />
      <meta property="og:url" content="https://eztofind.ca/specialties/luxury" />
      <meta property="og:type" content="website" />
      <script type="application/ld+json">{JSON.stringify(jsonLdReview)}</script>
    </Helmet>
  );
}

// ── Small primitives ────────────────────────────────────────────────
const Eyebrow = ({ children }) => (
  <div
    style={{
      fontFamily: SANS,
      fontSize: "0.72rem",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: T.muted,
      fontWeight: 500,
      marginBottom: 18,
    }}
  >
    {children}
  </div>
);

const Rule = ({ mt = 56, mb = 56 }) => (
  <div
    aria-hidden="true"
    style={{
      height: 1,
      background: T.hairline,
      margin: `${mt}px 0 ${mb}px`,
      maxWidth: 640,
    }}
  />
);

// ── Component ───────────────────────────────────────────────────────
export default function LuxuryQuietLanding() {
  return (
    <>
      <SEOHead />

      <main
        data-testid="luxury-quiet-landing"
        style={{
          background: T.paper,
          color: T.ink,
          fontFamily: SANS,
          minHeight: "100vh",
        }}
      >
        {/* ─── HERO ──────────────────────────────────────────────────
            Rotating carousel of live CREA DDF® listings ≥ $3M. Full-
            width, uncluttered, no overlay copy — the headline lives in
            the sitting-room block below so photos can breathe. */}
        <RotatingHero />

        {/* ─── SITTING ROOM ─────────────────────────────────────────
            H1 + subhead + opening. Sits on warm white, generous white
            space above and below. This is what a private sitting
            room feels like. */}
        <section
          style={{
            maxWidth: 780,
            margin: "0 auto",
            padding: "clamp(72px, 12vw, 128px) 28px 0",
          }}
        >
          <Eyebrow>Doug LeMaire, REALTOR® · Private Representation</Eyebrow>

          <h1
            data-testid="luxury-h1"
            style={{
              fontFamily: SERIF,
              fontSize: "clamp(2.25rem, 4.6vw, 3.75rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.015em",
              color: T.ink,
              margin: "0 0 22px",
              fontWeight: 400,
            }}
          >
            Luxury Residential Real Estate
          </h1>

          <p
            style={{
              fontFamily: SANS,
              fontSize: "1.02rem",
              letterSpacing: "0.02em",
              color: T.muted,
              margin: "0 0 44px",
            }}
          >
            Greater Vancouver · Fraser Valley · Sea-to-Sky
          </p>

          <p
            data-testid="luxury-opening"
            style={{
              fontFamily: SERIF,
              fontSize: "clamp(1.15rem, 1.6vw, 1.4rem)",
              lineHeight: 1.55,
              color: T.ink,
              margin: 0,
              maxWidth: 640,
            }}
          >
            Quiet representation for buyers and sellers of significant homes —
            priced with care, presented with restraint, and managed through to
            completion.
          </p>
        </section>

        {/* ─── RECENT WORK ──────────────────────────────────────────
            Two-sentence outcome paragraph. The Elgin Chantrell home
            links quietly to the /case-studies/3015-141-street file
            since a dedicated community profile does not yet exist. */}
        <section
          data-testid="luxury-recent-work"
          style={{
            maxWidth: 780,
            margin: "0 auto",
            padding: "88px 28px 0",
          }}
        >
          <Eyebrow>Recent work</Eyebrow>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "1.08rem",
              lineHeight: 1.75,
              color: T.ink,
              margin: 0,
            }}
          >
            Recent files include a buyer who acquired a property in South
            Langley over $3 million, and a{" "}
            <Link
              to="/case-studies/3015-141-street"
              data-testid="luxury-recent-elgin-link"
              style={{
                color: T.ink,
                textDecoration: "underline",
                textDecorationColor: T.hairline,
                textUnderlineOffset: 4,
              }}
            >
              $3 million Elgin Chantrell home in South Surrey
            </Link>{" "}
            that went from listed to sold in 12 days.
          </p>
        </section>

        {/* ─── HOW THE WORK IS DONE ──────────────────────────────── */}
        <section
          data-testid="luxury-how-work"
          style={{
            maxWidth: 780,
            margin: "0 auto",
            padding: "72px 28px 0",
          }}
        >
          <Eyebrow>How the work is done</Eyebrow>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "1.08rem",
              lineHeight: 1.75,
              color: T.ink,
              margin: "0 0 26px",
            }}
          >
            Three things decide a high-value file:
          </p>
          <ol
            style={{
              fontFamily: SERIF,
              fontSize: "clamp(1.15rem, 1.5vw, 1.28rem)",
              lineHeight: 1.55,
              color: T.ink,
              margin: 0,
              paddingLeft: 0,
              listStyle: "none",
              counterReset: "quiet",
            }}
          >
            {[
              "Pricing the market can respect on day one",
              "Presentation that matches the home",
              "Process that carries an accepted offer through to completion",
            ].map((item, i) => (
              <li
                key={i}
                style={{
                  counterIncrement: "quiet",
                  paddingLeft: 56,
                  position: "relative",
                  paddingBottom: 20,
                  borderBottom: i < 2 ? `1px solid ${T.hairline}` : "none",
                  marginBottom: i < 2 ? 20 : 0,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 4,
                    fontFamily: SANS,
                    fontSize: "0.78rem",
                    letterSpacing: "0.14em",
                    color: T.muted,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </section>

        {/* ─── FILM ────────────────────────────────────────────────
            A short piece of film — set below "How the work is done"
            so it plays as a natural continuation of the argument,
            not as a marketing interruption. Native 1224×920 aspect
            ratio (~4:3) matches Doug's Vimeo embed spec exactly.
            Autoplay is disabled so it never intrudes; a visitor has
            to click into the film to hear it. */}
        <section
          data-testid="luxury-film"
          style={{
            maxWidth: 1224,
            margin: "0 auto",
            padding: "clamp(96px, 12vw, 144px) 28px 0",
          }}
        >
          <Eyebrow>A short film</Eyebrow>
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 1224,
              aspectRatio: "1224 / 920",
              margin: "16px 0 0",
              background: T.ink,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(30,31,36,0.14)",
            }}
          >
            <iframe
              data-testid="luxury-film-iframe"
              src="https://player.vimeo.com/video/1218107137?fl=tl&fe=ec"
              title="Doug LeMaire, REALTOR® — a short film"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: 0,
                display: "block",
              }}
            />
          </div>
        </section>

        {/* ─── PULL QUOTE ───────────────────────────────────────────
            Editorial pull-quote, not a testimonial slider. Rule bar
            on the left in muted taupe. */}
        <section
          data-testid="luxury-pullquote"
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "clamp(96px, 12vw, 144px) 28px 0",
          }}
        >
          <blockquote
            style={{
              margin: 0,
              paddingLeft: "clamp(28px, 5vw, 52px)",
              borderLeft: `2px solid ${T.accent}`,
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: "clamp(1.5rem, 2.6vw, 2.15rem)",
              lineHeight: 1.35,
              color: T.ink,
              letterSpacing: "-0.005em",
            }}
          >
            “We never felt like just another client — he took the time to
            understand what was important to us and always had our best
            interests in mind.”
          </blockquote>
        </section>

        {/* ─── FULL REVIEW ──────────────────────────────────────────
            Full Google review, verbatim, set in body text with a
            quiet source line. Not styled as a testimonial card. */}
        <section
          data-testid="luxury-full-review"
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "56px 28px 0",
          }}
        >
          <Eyebrow>From a Google review</Eyebrow>
          <div
            style={{
              fontFamily: SANS,
              fontSize: "1.02rem",
              lineHeight: 1.8,
              color: T.muted,
            }}
          >
            <p style={{ margin: "0 0 18px" }}>
              We can’t say enough about how amazing Doug was from start to
              finish. He truly went above and beyond throughout the entire
              process and made what could have been a stressful experience
              feel much easier.
            </p>
            <p style={{ margin: "0 0 18px" }}>
              Doug was always available, incredibly responsive, knowledgeable,
              professional, and genuinely cared about making sure everything
              went smoothly. We never felt like just another client — he took
              the time to understand what was important to us and always had
              our best interests in mind.
            </p>
            <p style={{ margin: "0 0 18px" }}>
              What really stood out was how much Doug was willing to do beyond
              what we expected. His attention to detail, communication,
              patience, and commitment were exceptional, and we always felt
              that we were in great hands.
            </p>
            <p style={{ margin: "0 0 0" }}>
              We are extremely grateful for everything Doug did for us and
              would highly recommend him to anyone looking for a realtor. If
              you want someone who will truly go the extra mile and be there
              for you every step of the way, Doug is your guy!
            </p>
          </div>
        </section>

        {/* ─── TWO COLUMNS ──────────────────────────────────────────
            Sellers | Buyers. Same visual weight, hairline divider on
            desktop, stacked on mobile. */}
        <section
          data-testid="luxury-two-columns"
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "clamp(112px, 14vw, 160px) 28px 0",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "clamp(40px, 6vw, 88px)",
            }}
          >
            {[
              {
                key: "sellers",
                title: "Sellers",
                body:
                  "When the home is significant, the file needs pricing discipline, discreet exposure, and someone who stays in the details until it completes.",
              },
              {
                key: "buyers",
                title: "Buyers",
                body:
                  "When the home is scarce, the advantage is an agent who already knows the pocket and can move with calm urgency.",
              },
            ].map((col) => (
              <div key={col.key} data-testid={`luxury-col-${col.key}`}>
                <h2
                  style={{
                    fontFamily: SERIF,
                    fontSize: "clamp(1.5rem, 2.4vw, 2rem)",
                    lineHeight: 1.15,
                    letterSpacing: "-0.005em",
                    color: T.ink,
                    margin: "0 0 20px",
                    fontWeight: 400,
                  }}
                >
                  {col.title}
                </h2>
                <p
                  style={{
                    fontFamily: SANS,
                    fontSize: "1.02rem",
                    lineHeight: 1.75,
                    color: T.muted,
                    margin: 0,
                  }}
                >
                  {col.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── PRACTICE LINE ───────────────────────────────────────
            Where Doug personally represents. Sub-hairline, small. */}
        <section
          data-testid="luxury-practice"
          style={{
            maxWidth: 780,
            margin: "0 auto",
            padding: "clamp(64px, 8vw, 96px) 28px 0",
          }}
        >
          <p
            style={{
              fontFamily: SANS,
              fontSize: "0.95rem",
              lineHeight: 1.75,
              color: T.muted,
              margin: 0,
              paddingTop: 32,
              borderTop: `1px solid ${T.hairline}`,
            }}
          >
            <Link
              to="/about"
              style={{
                color: T.ink,
                textDecoration: "underline",
                textDecorationColor: T.hairline,
                textUnderlineOffset: 4,
              }}
              data-testid="luxury-about-inline-link"
            >
              Doug LeMaire
            </Link>{" "}
            personally represents transactions in{" "}
            <Link
              to="/communities"
              data-testid="luxury-communities-inline-link"
              style={{
                color: T.ink,
                textDecoration: "underline",
                textDecorationColor: T.hairline,
                textUnderlineOffset: 4,
              }}
            >
              Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor
              to Whistler
            </Link>
            .
          </p>
        </section>

        {/* ─── INVITATION (primary CTA) ────────────────────────────
            Text link, quiet button. Not a banner. */}
        <section
          data-testid="luxury-invitation"
          style={{
            maxWidth: 780,
            margin: "0 auto",
            padding: "clamp(80px, 10vw, 120px) 28px 0",
            textAlign: "left",
          }}
        >
          <Eyebrow>An invitation</Eyebrow>
          <p
            style={{
              fontFamily: SERIF,
              fontSize: "clamp(1.35rem, 2.2vw, 1.85rem)",
              lineHeight: 1.4,
              letterSpacing: "-0.005em",
              color: T.ink,
              margin: "0 0 40px",
              maxWidth: 640,
            }}
          >
            If you are thinking of buying or selling in South Surrey, Fraser
            Valley, Greater Vancouver, or the Sea-to-Sky Corridor and not
            working with a REALTOR® — let’s talk.
          </p>

          <Link
            to="/contact"
            data-testid="luxury-primary-cta"
            style={{
              display: "inline-block",
              fontFamily: SANS,
              fontSize: "0.88rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: T.ink,
              padding: "16px 28px",
              border: `1px solid ${T.ink}`,
              textDecoration: "none",
              transition: "background 200ms ease, color 200ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.ink;
              e.currentTarget.style.color = T.paper;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = T.ink;
            }}
          >
            Start a conversation
          </Link>

          {/* Secondary links — smaller, muted, comma-separated. */}
          <div
            data-testid="luxury-secondary-links"
            style={{
              marginTop: 32,
              fontFamily: SANS,
              fontSize: "0.85rem",
              color: T.muted,
              letterSpacing: "0.02em",
            }}
          >
            <Link to="/seller" style={{ color: T.muted }} data-testid="luxury-secondary-seller">Seller</Link>
            <span style={{ margin: "0 12px", opacity: 0.5 }}>·</span>
            <Link to="/buyer" style={{ color: T.muted }} data-testid="luxury-secondary-buyer">Buyer</Link>
            <span style={{ margin: "0 12px", opacity: 0.5 }}>·</span>
            <Link to="/valuation" style={{ color: T.muted }} data-testid="luxury-secondary-valuation">Valuation</Link>
            <span style={{ margin: "0 12px", opacity: 0.5 }}>·</span>
            <Link to="/about" style={{ color: T.muted }} data-testid="luxury-secondary-about">About</Link>
          </div>
        </section>

        {/* ─── PAGE-LEVEL COMPLIANCE FOOTER ─────────────────────────
            This is IN ADDITION to the site's global footer (which
            comes from AppLayout). Doug specified the exact text so
            it renders at the bottom of THIS page even before the
            global footer starts. */}
        <section
          data-testid="luxury-compliance-block"
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "clamp(96px, 12vw, 128px) 28px clamp(64px, 8vw, 96px)",
          }}
        >
          <div
            style={{
              paddingTop: 32,
              borderTop: `1px solid ${T.hairline}`,
              fontFamily: SANS,
              fontSize: "0.78rem",
              lineHeight: 1.7,
              color: T.muted,
            }}
          >
            EZtoFind.ca provides general educational information about BC real
            estate — not legal, tax, financial, or real estate advice. Real
            estate services are provided by Doug LeMaire, REALTOR®, Fraser
            Property Management Realty Services Ltd. Regulated by the BC
            Financial Services Authority. Consumer Protection Line:{" "}
            <a
              href="tel:+18776839664"
              style={{ color: T.ink, textDecoration: "underline", textDecorationColor: T.hairline, textUnderlineOffset: 3 }}
              data-testid="luxury-bcfsa-consumer-line"
            >
              1-877-683-9664
            </a>
            . MLS® listing data is provided under the CREA DDF® licence and is
            not a canonical source — verify against REALTOR.ca or the listing
            brokerage.
          </div>
        </section>
      </main>
    </>
  );
}
