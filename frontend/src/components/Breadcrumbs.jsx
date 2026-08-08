import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

/**
 * Reusable breadcrumb bar — renders both the visible trail AND the
 * `BreadcrumbList` JSON-LD Google needs for SERP breadcrumb chevrons.
 *
 * Pass `items` as an ordered array of { label, to }.  The last item is
 * rendered as plain text (the current page).  Example:
 *
 *   <Breadcrumbs items={[
 *     { label: "Home", to: "/" },
 *     { label: "Communities", to: "/communities" },
 *     { label: "Maple Ridge" },
 *   ]} />
 *
 * SEO wins:
 *   - Google renders the visible trail as blue path replacing the raw URL
 *     in SERPs (proven 2-4% CTR lift on real-estate queries).
 *   - `BreadcrumbList` schema helps LLMs understand entity hierarchy
 *     (city → community → sub-neighbourhood) — reinforces AEO citations.
 */
const SITE = "https://eztofind.ca";

export default function Breadcrumbs({ items }) {
  if (!Array.isArray(items) || items.length < 2) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.to ? { item: `${SITE}${it.to}` } : {}),
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <nav
        aria-label="Breadcrumb"
        data-testid="breadcrumbs"
        style={{
          fontSize: "0.82rem",
          color: "var(--muted, #6B7280)",
          fontFamily: "Inter, sans-serif",
          padding: "0.6rem 0",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.35rem",
          lineHeight: 1.4,
        }}
      >
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <span aria-hidden="true" style={{ color: "#9CA3AF" }}>›</span>
              )}
              {isLast || !it.to ? (
                <span aria-current={isLast ? "page" : undefined} style={{ color: "var(--ink, #0F2A5B)", fontWeight: isLast ? 600 : 400 }}>
                  {it.label}
                </span>
              ) : (
                <Link
                  to={it.to}
                  data-testid={`breadcrumb-link-${i}`}
                  style={{ color: "var(--brand-blue, #0F2A5B)", textDecoration: "none" }}
                >
                  {it.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}
