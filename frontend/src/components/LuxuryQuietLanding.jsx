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
import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

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
            Restrained architectural still. Full-width, uncluttered.
            No overlay copy — headline lives in the sitting-room block
            below so the photo can breathe. */}
        <section
          data-testid="luxury-hero"
          style={{
            width: "100%",
            aspectRatio: "16 / 7",
            background:
              "linear-gradient(180deg, rgba(30,31,36,0.10) 0%, rgba(30,31,36,0.02) 60%, transparent 100%), " +
              "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2000&q=80') center/cover no-repeat",
            borderBottom: `1px solid ${T.hairline}`,
          }}
        />

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

          {/* Article 16 form note — required by CREA rules and Doug's
              existing compliance posture. */}
          <p
            data-testid="luxury-article-16-note"
            style={{
              marginTop: 40,
              fontFamily: SANS,
              fontSize: "0.78rem",
              lineHeight: 1.6,
              color: T.muted,
              maxWidth: 620,
              fontStyle: "italic",
            }}
          >
            Forms must hard-block visitors currently under contract with
            another REALTOR® (CREA Article 16).
          </p>
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
