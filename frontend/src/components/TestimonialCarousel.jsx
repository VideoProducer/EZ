// TestimonialCarousel — surfaces published client reviews on the
// homepage + About page. Loads from GET /api/testimonials, computes an
// AggregateRating, and renders BCFSA-compliant attribution + Schema.org
// Review + AggregateRating JSON-LD.
//
// Compliance:
//   • Reviewer name always displayed (no anonymous quotes)
//   • Attribution line: "Client review from {source}, {name}, {date}."
//   • Disclaimer: "Every client's outcome is unique — past results are
//     not indicative of future performance." (BCFSA advertising rule)
//   • No editing of the quoted text
//   • Schema.org Review + AggregateRating so Google shows rich stars
//
// Renders NOTHING when zero published testimonials exist — the absence
// of testimonials is preferable to a "no reviews yet" placeholder.
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Helmet } from "react-helmet-async";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StarRow = ({ rating = 5, size = 18, testId }) => (
  <div
    data-testid={testId}
    aria-label={`${rating} out of 5 stars`}
    style={{ display: "inline-flex", gap: 2, lineHeight: 1 }}
  >
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} style={{
        color: i < rating ? "#FDB813" : "rgba(15,42,91,0.18)",
        fontSize: size, lineHeight: 1,
      }}>★</span>
    ))}
  </div>
);

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
};

export default function TestimonialCarousel({
  variant = "hero",        // "hero" (homepage) | "compact" (About page)
  title = "What clients say",
  emitJsonLd = true,
  testId = "testimonial-carousel",
}) {
  const [data, setData] = useState({ testimonials: [], count: 0, average_rating: null });
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/testimonials`);
        setData(r.data || { testimonials: [] });
      } catch { /* ignore — carousel renders nothing on error */ }
      finally { setLoading(false); }
    })();
  }, []);

  const items = data.testimonials || [];
  const active = items[index] || null;

  // JSON-LD block — only when at least one testimonial exists. Google
  // requires a minimum of 1 review to render the AggregateRating snippet.
  const jsonLd = useMemo(() => {
    if (!items.length) return null;
    return {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      "name": "Doug LeMaire, REALTOR®",
      "url": "https://eztofind.ca/",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": data.average_rating || 5,
        "reviewCount": data.count || items.length,
        "bestRating": 5,
        "worstRating": 1,
      },
      "review": items.slice(0, 10).map((t) => ({
        "@type": "Review",
        "author": { "@type": "Person", "name": t.reviewer_name },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": t.rating || 5,
          "bestRating": 5,
          "worstRating": 1,
        },
        "datePublished": t.date_reviewed,
        "reviewBody": t.text,
      })),
    };
  }, [items, data.average_rating, data.count]);

  if (loading || !items.length) return null;

  const isHero = variant === "hero";
  const bg   = isHero ? "linear-gradient(135deg, #FBF7EE 0%, #F5F0E1 100%)" : "#FBF7EE";
  const pad  = isHero ? "3rem 1.5rem" : "2rem 1.25rem";

  return (
    <section
      data-testid={testId}
      className="section"
      style={{ background: bg, padding: pad }}
    >
      {emitJsonLd && jsonLd && (
        <Helmet><script type="application/ld+json">{JSON.stringify(jsonLd)}</script></Helmet>
      )}
      <div className="container-x" style={{ maxWidth: isHero ? "56rem" : "42rem", textAlign: "center" }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Client Reviews</div>
        <h2 className="section-title" data-testid={`${testId}-title`}>{title}</h2>

        {/* Aggregate strip */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "0.5rem 1rem", borderRadius: 999,
          background: "rgba(15,42,91,0.06)",
          margin: "0.75rem 0 1.5rem",
        }} data-testid={`${testId}-aggregate`}>
          <StarRow rating={Math.round(data.average_rating || 5)} size={16} testId={`${testId}-agg-stars`}/>
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.9rem", color: "#0F2A5B", fontWeight: 600 }}>
            {data.average_rating || 5}/5 · {data.count} verified client review{data.count === 1 ? "" : "s"}
          </span>
        </div>

        {/* Featured quote */}
        <blockquote
          data-testid={`${testId}-quote`}
          style={{
            margin: "0 auto", padding: isHero ? "1.75rem 1.5rem" : "1.25rem 1.25rem",
            background: "#fff", borderRadius: 12,
            border: "1px solid rgba(15,42,91,0.12)",
            boxShadow: "0 12px 32px rgba(15,42,91,0.08)",
            fontFamily: "'Playfair Display', serif",
            fontSize: isHero ? "clamp(1.05rem, 2.1vw, 1.3rem)" : "1rem",
            lineHeight: 1.6, color: "#1e293b",
            maxWidth: isHero ? "44rem" : "36rem",
            textAlign: "left",
            position: "relative",
          }}
        >
          <span aria-hidden="true" style={{
            position: "absolute", top: -8, left: 16,
            fontSize: "3.5rem", color: "#DABF7A", lineHeight: 1,
            fontFamily: "'Playfair Display', serif",
          }}>“</span>
          <div style={{ paddingLeft: "1.25rem" }}>
            <StarRow rating={active.rating || 5} size={16} testId={`${testId}-quote-stars`}/>
            <p style={{ margin: "0.5rem 0 1rem", fontSize: "inherit", color: "inherit" }}>{active.text}</p>
            <footer style={{
              fontFamily: "Inter,sans-serif", fontSize: "0.82rem",
              color: "var(--muted, #64748B)", fontStyle: "normal",
              lineHeight: 1.5,
            }}>
              — <strong style={{ color: "#0F2A5B" }}>{active.reviewer_name}</strong>
              {active.source && (
                <> · Client review from <em>{active.source}</em>{active.source_url ? (
                  <> · <a href={active.source_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-blue)", textDecoration: "underline" }}>view original ↗</a></>
                ) : null}</>
              )}
              {active.date_reviewed && <> · {formatDate(active.date_reviewed)}</>}
            </footer>
          </div>
        </blockquote>

        {/* Navigation dots — only if >1 item */}
        {items.length > 1 && (
          <div
            data-testid={`${testId}-dots`}
            style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: "1.25rem" }}
          >
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show review ${i + 1}`}
                onClick={() => setIndex(i)}
                data-testid={`${testId}-dot-${i}`}
                style={{
                  width: 10, height: 10, borderRadius: "50%",
                  border: "none", padding: 0, cursor: "pointer",
                  background: i === index ? "#0F2A5B" : "rgba(15,42,91,0.22)",
                  transition: "background 0.15s ease",
                }}
              />
            ))}
          </div>
        )}

        {/* BCFSA compliance disclaimer */}
        <p style={{
          marginTop: "1.5rem", fontSize: "0.72rem", color: "var(--muted, #64748B)",
          fontFamily: "Inter,sans-serif", lineHeight: 1.5, opacity: 0.85,
          maxWidth: "40rem", marginLeft: "auto", marginRight: "auto",
        }}>
          Every client's outcome is unique — past results are not indicative of future performance. Reviews shown here are transported verbatim from their original public source; Doug LeMaire, REALTOR® (BCFSA #167790) does not edit or curate the review text.
        </p>
      </div>
    </section>
  );
}
