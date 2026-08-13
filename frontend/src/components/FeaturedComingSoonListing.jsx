// FeaturedComingSoonListing
// -----------------------------------------------------------------------------
// A GVR-3.14 / CREA REALTOR® Code Article 6 compliant "Coming Soon" window
// for the homepage.
//
// COMPLIANCE STRATEGY
//   • Mode "coming_soon" (default when seller consent NOT signed):
//     Renders a GENERIC teaser only — no address, no photo of the actual
//     home, no exact price, no MLS® number, no unit number, no distinctive
//     sub-neighbourhood name.  Just home type, general area, rounded
//     price band (e.g. "Under $2M"), general bed/bath/sqft range, and a
//     "By Appointment Only" note.  This does NOT identify a specific
//     property so it is not pre-MLS "advertising a listing" under CREA
//     Article 6 or GVR Rule 3.14.
//
//   • Mode "just_listed" (once MLS-live OR signed consent in hand):
//     Renders full details, real photo, exact price, MLS® number, and
//     links to the listing detail page.  Doug can flip a single prop.
//
//   • Mode "hidden": renders nothing.  Default when there is no listing
//     to feature so the tile self-removes without editing the page.
//
// VIDEO SLOT
//   Accepts either a direct video URL (mp4/webm), a YouTube URL, or a
//   Vimeo URL.  If nothing is passed we render a tasteful placeholder
//   ("Video walk-through coming next week — join the priority list").
//   No 3rd-party iframe is loaded until the user taps the poster (click-to-load)
//   so we don't leak visitor data to YouTube before consent.
//
// LEAD CAPTURE
//   Priority-list button opens `/coming-soon-priority-list?area=…` (a
//   simple form we already have via /buyer with a `source_slug` attribution).
//   All PIPA + CASL consent is captured on that page — this tile is only
//   the entry point, so we don't create a duplicate-consent surface.

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

// Design tokens — kept local so the tile is self-contained.
const C = {
  navy: "#0F2A5B", gold: "#F5A623", cream: "#F5F0E1",
  ink: "#1F2937", muted: "#6B7280", paper: "#FAFAF7",
  blue: "#1E4FCF", green: "#059669", red: "#B91C1C",
};

// ── Video helpers ──────────────────────────────────────────────────
const isYouTube = url => /^(https?:)?\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url || "");
const isVimeo = url => /^(https?:)?\/\/(www\.)?(vimeo\.com|player\.vimeo\.com)/.test(url || "");
const isDirectVideo = url => /\.(mp4|webm|mov)(\?.*)?$/i.test(url || "");
const toYouTubeEmbed = url => {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&autoplay=1` : url;
};
const toVimeoEmbed = url => {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1&title=0&byline=0` : url;
};

// ── Component ──────────────────────────────────────────────────────
export default function FeaturedComingSoonListing({
  mode = "coming_soon",              // "coming_soon" | "just_listed" | "hidden"
  area = "Fraser Valley",            // general area — safe pre-consent
  home_type = "Detached family home",// generic type
  price_band = "Priced under $2M",   // rounded band, not exact
  beds_band = "3–4 bedrooms",        // range, not exact
  baths_band = "2–3 bathrooms",
  sqft_band = "Approx. 1,800–2,400 sqft",
  eta_line = "Coming to market next week",
  description = "A cared-for home in a family-friendly BC neighbourhood.  Full details, photos, and MLS® number will be posted here the moment the listing goes live.",
  video_url = "",                    // direct mp4/webm URL or YouTube/Vimeo link
  video_poster = "",                 // optional poster image before the user clicks play
  // Just-listed mode props (used only when mode === "just_listed"):
  listing_key = null,                // once live, drive from this
  address = "",                      // full address (post-MLS only)
  price = null,                      // exact price
  photo_url = "",                    // real listing photo
  mls_number = "",                   // MLS® number
  brokerage = "",                    // listing brokerage (GVR 3.14 attribution)
  showing_link = "/contact",         // link for "Request a private showing"
}) {
  const [videoPlaying, setVideoPlaying] = useState(false);

  // JSON-LD RealEstateListing — populated only in "just_listed" mode so
  // we never structure-mark a Coming Soon (which would risk indexing a
  // property Google can then cite as active).  Hook is called
  // unconditionally to satisfy the rules-of-hooks.
  const jsonLd = useMemo(() => {
    if (mode !== "just_listed" || !listing_key) return null;
    return {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "@id": `https://eztofind.ca/listing/${listing_key}#featured`,
      "url": `https://eztofind.ca/listing/${listing_key}`,
      "name": address,
      "image": photo_url,
      "price": price,
      "priceCurrency": "CAD",
      "address": { "@type": "PostalAddress", "addressLocality": area, "addressRegion": "BC", "addressCountry": "CA", "streetAddress": address },
      "identifier": mls_number,
    };
  }, [mode, listing_key, address, photo_url, price, area, mls_number]);

  if (mode === "hidden") return null;

  // ── JUST LISTED (post-MLS) ──────────────────────────────────────
  if (mode === "just_listed" && listing_key) {
    return (
      <section
        data-testid="featured-listing-just-listed"
        aria-labelledby="featured-listing-h2"
        style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #143A86 100%)`, padding: "clamp(28px, 5vw, 48px) clamp(16px, 4vw, 24px)" }}
      >
        {jsonLd && <Helmet><script type="application/ld+json">{JSON.stringify(jsonLd)}</script></Helmet>}
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-block", background: C.gold, color: C.navy, padding: "4px 10px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              🌟 Just Listed · Doug's featured
            </div>
            <h2 id="featured-listing-h2" style={{ fontFamily: "Sora,sans-serif", color: "#fff", fontSize: "clamp(1.6rem, 3.6vw, 2.2rem)", fontWeight: 800, margin: "12px 0 10px", lineHeight: 1.15 }}>
              {address}
            </h2>
            <div style={{ fontFamily: "Sora,sans-serif", color: C.gold, fontSize: "2rem", fontWeight: 800, marginBottom: 12 }}>
              ${(price || 0).toLocaleString("en-CA")}
            </div>
            <div style={{ color: "#fff", opacity: 0.9, fontSize: "0.95rem", marginBottom: 8 }}>
              {area} · MLS® {mls_number}
            </div>
            <p style={{ color: "rgba(255,255,255,0.9)", margin: "0 0 16px", fontSize: "1rem", lineHeight: 1.6 }}>
              {description}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to={`/listing/${listing_key}`} data-testid="featured-listing-view"
                    style={{ background: C.gold, color: C.navy, padding: "12px 22px", borderRadius: 999, fontFamily: "Sora,sans-serif", fontWeight: 700, textDecoration: "none", fontSize: "0.95rem" }}>
                View full listing →
              </Link>
              <Link to={showing_link} data-testid="featured-listing-showing"
                    style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.5)", padding: "12px 22px", borderRadius: 999, fontFamily: "Sora,sans-serif", fontWeight: 700, textDecoration: "none", fontSize: "0.95rem" }}>
                Request a private showing
              </Link>
            </div>
            {brokerage && (
              <div style={{ marginTop: 16, color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
                Listing courtesy of <strong>{brokerage}</strong>. MLS® and REALTOR® are certification marks owned by CREA.
              </div>
            )}
          </div>
          <VideoBlock
            url={video_url} poster={video_poster || photo_url} playing={videoPlaying}
            onPlay={() => setVideoPlaying(true)} fallbackPoster={photo_url}
            ariaLabel={`Video walk-through of ${address}`}
          />
        </div>
      </section>
    );
  }

  // ── COMING SOON (pre-MLS / generic) ─────────────────────────────
  return (
    <section
      data-testid="featured-listing-coming-soon"
      aria-labelledby="featured-listing-h2"
      style={{ background: `linear-gradient(135deg, #FFF7E6 0%, #FDECC4 100%)`, borderTop: `4px solid ${C.gold}`, borderBottom: `4px solid ${C.gold}`, padding: "clamp(28px, 5vw, 48px) clamp(16px, 4vw, 24px)" }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
        {/* LEFT — narrative */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.navy, color: "#fff", padding: "5px 12px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }} data-testid="featured-listing-badge">
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: C.gold, animation: "fclcs-pulse 1.4s ease-in-out infinite" }}/>
            Coming Soon · {eta_line}
          </div>
          <h2 id="featured-listing-h2" style={{ fontFamily: "Sora,sans-serif", color: C.navy, fontSize: "clamp(1.7rem, 3.6vw, 2.2rem)", fontWeight: 800, margin: "14px 0 8px", lineHeight: 1.15 }}>
            {home_type} · {area}
          </h2>
          <div style={{ fontFamily: "Sora,sans-serif", color: C.gold, fontSize: "1.6rem", fontWeight: 800, marginBottom: 12 }}>
            {price_band}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14, fontSize: "0.95rem", color: C.ink, fontFamily: "Inter,sans-serif" }}>
            <span>🛏 {beds_band}</span>
            <span>🛁 {baths_band}</span>
            <span>📐 {sqft_band}</span>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: "1rem", lineHeight: 1.6, color: C.ink }}>
            {description}
          </p>
          <div style={{ background: "#fff", border: `1px solid rgba(15,42,91,0.15)`, borderRadius: 10, padding: "0.7rem 0.9rem", marginBottom: 16, fontSize: "0.85rem", color: C.ink, lineHeight: 1.55 }}>
            <strong>🔑 By Appointment Only.</strong> Serious buyers who join the priority list before MLS® go-live get first look. No open house. No walk-throughs without a signed showing agreement.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              to={`/buyer?source=coming-soon&area=${encodeURIComponent(area)}`}
              data-testid="featured-listing-priority-cta"
              style={{ background: C.navy, color: "#fff", padding: "12px 22px", borderRadius: 999, fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none", boxShadow: "0 6px 16px rgba(15,42,91,0.25)" }}
            >
              🔔 Join the priority list →
            </Link>
            <Link
              to="/contact"
              data-testid="featured-listing-appointment-cta"
              style={{ background: "transparent", color: C.navy, border: `1.5px solid ${C.navy}`, padding: "12px 22px", borderRadius: 999, fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none" }}
            >
              Request a private appointment
            </Link>
          </div>
          <div style={{ marginTop: 14, fontSize: "0.72rem", color: C.muted, lineHeight: 1.5 }}>
            Generic pre-MLS® description. Address, exact price, MLS® number, and photos will be posted here the moment the listing goes live on the Multiple Listing Service® under GVR/CREA rules. Doug LeMaire, REALTOR®, Fraser Property Management Realty Services Ltd. (BCFSA-licensed).
          </div>
        </div>

        {/* RIGHT — video */}
        <VideoBlock
          url={video_url}
          poster={video_poster}
          playing={videoPlaying}
          onPlay={() => setVideoPlaying(true)}
          fallbackPoster=""
          ariaLabel={`Preview video for a coming-soon ${home_type} in ${area}`}
        />
      </div>
      <style>{`
        @keyframes fclcs-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        @media (max-width: 900px) {
          [data-testid="featured-listing-coming-soon"] > div,
          [data-testid="featured-listing-just-listed"] > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

// ── Sub-component: Video Block ────────────────────────────────────
function VideoBlock({ url, poster, playing, onPlay, fallbackPoster, ariaLabel }) {
  const hasVideo = !!url;
  const posterUrl = poster || fallbackPoster || "";

  return (
    <div
      data-testid="featured-listing-video"
      aria-label={ariaLabel}
      style={{
        position: "relative", aspectRatio: "16 / 9", width: "100%",
        borderRadius: 14, overflow: "hidden",
        background: posterUrl ? `#000 url(${posterUrl}) center/cover` : `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
        boxShadow: "0 20px 45px rgba(15,42,91,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {!hasVideo && (
        <div style={{ textAlign: "center", color: "#fff", padding: "1rem", maxWidth: 320 }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎥</div>
          <div style={{ fontFamily: "Sora,sans-serif", fontSize: "1.05rem", fontWeight: 700, marginBottom: 6 }}>
            Video walk-through coming next week
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
            Join the priority list to get it before it hits MLS®.
          </div>
        </div>
      )}
      {hasVideo && !playing && (
        <button
          type="button"
          onClick={onPlay}
          data-testid="featured-listing-video-play"
          aria-label="Play video"
          style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{
            width: 84, height: 84, borderRadius: "50%", background: C.gold,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 12px 32px rgba(245,166,35,0.55)",
          }}>
            <div style={{
              width: 0, height: 0, borderLeft: `26px solid ${C.navy}`,
              borderTop: "18px solid transparent", borderBottom: "18px solid transparent",
              marginLeft: 6,
            }}/>
          </div>
        </button>
      )}
      {hasVideo && playing && isYouTube(url) && (
        <iframe
          src={toYouTubeEmbed(url)} title="Featured listing walk-through"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen data-testid="featured-listing-video-iframe"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      )}
      {hasVideo && playing && isVimeo(url) && (
        <iframe
          src={toVimeoEmbed(url)} title="Featured listing walk-through"
          allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
          data-testid="featured-listing-video-iframe"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      )}
      {hasVideo && playing && isDirectVideo(url) && (
        <video
          src={url} controls autoPlay playsInline preload="metadata"
          disableRemotePlayback data-testid="featured-listing-video-native"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#000", objectFit: "contain" }}
        />
      )}
    </div>
  );
}
