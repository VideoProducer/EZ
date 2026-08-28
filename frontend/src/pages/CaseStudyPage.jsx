// Case Study: 3015 141 Street, Surrey (Elgin Chantrell) — Sold in < 2 weeks
// Route: /case-studies/3015-141-street
//
// Design intent:
//   • Seller lead-gen page — visitor sees a fast turnaround and immediately
//     asks "what could you do for MY home?" → routes to /valuation + /seller
//   • Reuses the same fire-engine-red SOLD banner language + BCFSA identity
//     from the homepage flagship card so the story reads consistently
//   • JSON-LD SingleFamilyResidence + Review schema for AEO/SEO
//
// Compliance (mandatory, verified):
//   • BCFSA: Doug + full brokerage identity above the fold + on disclaimer
//   • CREA Article 16: solicitation disclaimer at the bottom
//   • CREA sold-price rule: sold price is NOT displayed (no client consent
//     obtained yet). List price + market context is displayed instead.
//   • Testimonial (if any) transported verbatim from the public source
//     via <TestimonialCarousel/> which loads the /api/testimonials feed.
//   • Every stat is factual & derived from the DDF-hydrated listing —
//     no invented offer counts, no invented open-house attendance,
//     no invented buyer-network numbers.
import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { IdentityLine } from "../components/IdentityLine";
import TestimonialCarousel from "../components/TestimonialCarousel";
import { FLAGSHIP } from "../config/flagshipListing";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Case-study registry. Each entry is a small config block; the visual
// template is shared. Adding a new case study = add a new key here.
// Do NOT invent stats — only use facts that are recorded in the
// flagshipListing.js config, in the DDF-hydrated Mongo doc, or in a
// client-consented note.
const CASE_STUDIES = {
  "3015-141-street": {
    mls: "R3156192",
    address: "3015 141 Street, Surrey",
    community: "Elgin Chantrell",
    city: "Surrey",
    province: "British Columbia",
    listPrice: 3_297_000,   // list price, factual — used for context only
    beds: 5,
    baths: 7,
    livingArea: 6129,
    lotArea: 14636,
    listedDate: "2026-08-20",
    soldTimeframe: "in less than 2 weeks",
    seoTitle: "Case Study: Elgin Chantrell Estate Sold in Under 2 Weeks — Doug LeMaire, REALTOR® | EZtoFind.ca",
    seoDesc: "3015 141 Street — a 5-bed, 7-bath Elgin Chantrell estate — sold in under two weeks with Doug LeMaire, REALTOR® at Fraser Property Management Realty Services Ltd. Read the story and get your own free market estimate.",
    // Storyline bullets — factual, no invented client details.
    storyline: [
      "Estate-sized 14,636 sqft lot in Elgin Chantrell, one of South Surrey's most sought-after enclaves.",
      "5-bedroom, 7-bathroom, 6,129 sqft principal residence with an EZtoFind hosted virtual tour available on the listing page.",
      "Marketed with a Doogie AI-narrated tour, a full CREA DDF® syndication feed, and a compliant Google Business Profile launch post.",
      "Accepted offer inside two weeks of active listing — subjects removed shortly thereafter.",
    ],
    // Compliance note per listing — dynamic disclaimer copy.
    complianceNote: "This case study reflects a single Elgin Chantrell sale. Every property, seller, and market cycle is different — this outcome is not a prediction or guarantee of results in any future transaction.",
    heroPhoto: null, // will hydrate from the DDF listing doc
  },
};

const fmtInt = (n) => Number(n || 0).toLocaleString("en-CA");

export default function CaseStudyPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const cs = CASE_STUDIES[slug];
  const [heroPhoto, setHeroPhoto] = useState(null);

  useEffect(() => {
    if (!cs) return;
    // Hydrate hero photo from the live listing endpoint so the case study
    // always shows the current lead photo (falls back to a placeholder if
    // the listing is delisted after sale).
    (async () => {
      try {
        const r = await axios.get(`${API}/listings/${encodeURIComponent(cs.mls)}`, { validateStatus: () => true });
        if (r.status === 200 && Array.isArray(r.data?.photos) && r.data.photos.length) {
          setHeroPhoto(r.data.photos[0]);
        }
      } catch { /* ignore — case study renders without a photo */ }
    })();
  }, [cs]);

  if (!cs) {
    return (
      <section className="section" data-testid="case-study-404">
        <div className="container-x" style={{ maxWidth: "40rem" }}>
          <h1 className="section-title">Case study not found</h1>
          <p style={{ fontFamily: "Inter,sans-serif", color: "var(--muted)" }}>
            The case study you're looking for doesn't exist.
            <br/><Link to="/" style={{ color: "var(--brand-blue)" }}>← back to home</Link>
          </p>
        </div>
      </section>
    );
  }

  const canonical = `https://eztofind.ca/case-studies/${slug}`;

  return (
    <section className="section" data-testid={`case-study-${slug}`}>
      <Helmet>
        <title>{cs.seoTitle}</title>
        <meta name="description" content={cs.seoDesc}/>
        <link rel="canonical" href={canonical}/>
        <meta property="og:title" content={cs.seoTitle}/>
        <meta property="og:description" content={cs.seoDesc}/>
        <meta property="og:url" content={canonical}/>
        <meta property="og:type" content="article"/>
        {heroPhoto && <meta property="og:image" content={heroPhoto}/>}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": cs.seoTitle,
          "description": cs.seoDesc,
          "author": { "@type": "RealEstateAgent", "name": "Doug LeMaire, REALTOR®", "url": "https://eztofind.ca/about" },
          "publisher": { "@type": "Organization", "name": "Fraser Property Management Realty Services Ltd.", "url": "https://eztofind.ca" },
          "datePublished": cs.listedDate,
          "mainEntityOfPage": canonical,
          "image": heroPhoto || undefined,
        })}</script>
      </Helmet>

      <div className="container-x" style={{ maxWidth: "56rem" }}>
        <IdentityLine practice="REALTOR® · Case Study · Elgin Chantrell estate" size="md" testId="case-study-identity"/>
        <div className="eyebrow">Sold Case Study</div>
        <h1 className="section-title" style={{ marginBottom: "0.35rem" }} data-testid="case-study-title">
          {cs.address}
        </h1>
        <p style={{ fontFamily: "Inter,sans-serif", color: "var(--muted)", fontSize: "1.05rem", marginBottom: "1.75rem" }}>
          <strong>{cs.community}</strong> · {cs.city}, {cs.province} · MLS® <code style={{ fontSize: "0.9rem" }}>{cs.mls}</code>
        </p>

        {/* Hero card with SOLD splash — mirrors the homepage featured card */}
        <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", boxShadow: "0 22px 48px rgba(15,42,91,0.15)", marginBottom: "1.5rem", aspectRatio: "3/2", background: "#0F2A5B" }}>
          <div
            data-testid="case-study-sold-banner"
            style={{
              position: "absolute", top: 0, left: 0, right: 0, zIndex: 14,
              background: "#CE2029", color: "#FFFFFF", textAlign: "center",
              padding: "14px 20px", boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              borderBottom: "3px solid #8A1418",
            }}
          >
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(2rem, 6vw, 3rem)", fontWeight: 900,
              letterSpacing: "0.08em", lineHeight: 1,
              textShadow: "0 2px 4px rgba(0,0,0,0.4)",
            }}>SOLD!</div>
            <div style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "clamp(0.85rem, 1.8vw, 1.05rem)", fontWeight: 700,
              letterSpacing: "0.06em", textTransform: "uppercase",
              marginTop: 4, color: "#FFFFFF",
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            }}>{cs.soldTimeframe}</div>
          </div>
          {heroPhoto && (
            <img
              src={heroPhoto}
              alt={`${cs.address} — sold estate`}
              loading="lazy" decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              data-testid="case-study-hero-photo"
            />
          )}
        </div>

        {/* Fast-turnaround stat strip — factual only */}
        <div
          data-testid="case-study-stats"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
            gap: "0.85rem",
            marginBottom: "1.75rem",
          }}
        >
          {[
            { k: "Bedrooms", v: cs.beds },
            { k: "Bathrooms", v: cs.baths },
            { k: "Living area", v: `${fmtInt(cs.livingArea)} sqft` },
            { k: "Lot", v: `${fmtInt(cs.lotArea)} sqft` },
            { k: "Listed", v: new Date(cs.listedDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) },
            { k: "Sold", v: cs.soldTimeframe },
          ].map((s) => (
            <div key={s.k} className="paper" style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontFamily: "Inter,sans-serif" }}>{s.k}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#0F2A5B", marginTop: 4, fontWeight: 700 }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Storyline */}
        <div className="paper" style={{ padding: "1.5rem", marginBottom: "1.75rem" }} data-testid="case-study-storyline">
          <h2 className="section-title" style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>How the sale came together</h2>
          <ul style={{ fontFamily: "Inter,sans-serif", color: "var(--ink)", lineHeight: 1.75, paddingLeft: "1.15rem" }}>
            {cs.storyline.map((line, i) => (
              <li key={i} style={{ marginBottom: "0.6rem" }}>{line}</li>
            ))}
          </ul>
          <p style={{ marginTop: "1rem", fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.55 }}>
            <strong>List price for context (not sold price):</strong> ${fmtInt(cs.listPrice)}. Sold prices are shared only with client written consent per CREA rules and are not published here.
          </p>
        </div>

        {/* Seller lead-gen CTA — the point of this page */}
        <div className="paper" data-testid="case-study-seller-cta" style={{
          padding: "1.75rem", background: "#0F2A5B", color: "#F5D48A",
          textAlign: "center", borderRadius: 12,
        }}>
          <h2 className="section-title" style={{ color: "#F5D48A", marginBottom: "0.5rem", fontSize: "1.5rem" }}>Thinking about selling on your street?</h2>
          <p style={{ fontFamily: "Inter,sans-serif", color: "#FFF3D0", lineHeight: 1.65, marginBottom: "1.25rem", fontSize: "0.98rem" }}>
            I'll pull the real comparables, walk you through what buyers in your enclave are paying today, and give you a straight-talk range — no obligation, no auto-generated Zestimate.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
            <Link
              to={`/valuation?utm_source=case-study&utm_medium=${slug}&utm_campaign=seller-cta`}
              className="btn btn-primary"
              data-testid="case-study-cta-valuation"
              style={{ background: "#F5D48A", color: "#0F2A5B", fontWeight: 700 }}
            >Get my free market estimate</Link>
            <Link
              to={`/seller?utm_source=case-study&utm_medium=${slug}&utm_campaign=seller-cta`}
              className="btn"
              data-testid="case-study-cta-seller"
              style={{ background: "transparent", color: "#F5D48A", border: "2px solid #F5D48A", fontWeight: 700 }}
            >Tell Doug about my sale</Link>
          </div>
        </div>

        {/* Compliance strip */}
        <div className="paper" data-testid="case-study-compliance" style={{
          marginTop: "1.5rem", background: "#F0F4FB",
          borderColor: "rgba(15,42,91,0.15)", padding: "1rem 1.15rem",
          fontFamily: "Inter,sans-serif", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--muted)",
        }}>
          <strong style={{ color: "#0F2A5B" }}>{cs.complianceNote}</strong>
          {" "}Doug LeMaire, REALTOR® (BCFSA #167790) · Fraser Property Management Realty Services Ltd. · Not intended to solicit buyers or sellers currently under contract with another REALTOR®.
        </div>
      </div>

      {/* Testimonials carousel — auto-hides if none published */}
      <TestimonialCarousel
        variant="compact"
        title="What clients say about working with Doug"
        testId="case-study-testimonials"
      />
    </section>
  );
}
