// EZtoFind.ca — Phase C grouped semantic search results page.
// URL: /search?q=<query>
// Renders the /api/search response as clearly grouped sections:
//   Quick Answer (if high-confidence) → Terms → FAQs → Tools →
//   Communities → Journey → Listings → Doogie
//
// Compliance: shows only content returned by the endpoint (which draws from
// approved EZtoFind.ca library). When the endpoint returns no matches, we
// show the neutral "no approved answer found" message per Section 7 of the
// intelligent-related-content spec.

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet-async";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Fire-and-forget beacon so click-through data reaches the backend even when
// the browser is already navigating away. `fetch` with `keepalive:true` is
// the modern equivalent of navigator.sendBeacon and works with JSON bodies.
const emitSearchClickBeacon = (payload) => {
  try {
    fetch(`${API}/search/click`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    /* ignore — analytics must never break user navigation */
  }
};

const BRAND = {
  navy: "#0F2A5B",
  blue: "#2563EB",
  cream: "#FBFAF6",
  amber: "#FDB813",
  muted: "#5B6577",
};

const KIND_ACCENTS = {
  Terms:       { dot: "#2563EB", label: "Definitions & Terms" },
  FAQs:        { dot: "#059669", label: "Frequently Asked Questions" },
  Tools:       { dot: "#F59E0B", label: "Tools & Calculators" },
  Communities: { dot: "#0EA5E9", label: "Communities" },
  Journey:     { dot: "#178A3E", label: "Journey Information" },
  Listings:    { dot: "#8B5CF6", label: "Listings" },
  Doogie:      { dot: "#DC2626", label: "Explore with Doogie" },
};

const SearchBox = ({ initial = "", size = "large", onSubmit }) => {
  const [q, setQ] = useState(initial);
  const handle = (e) => { e.preventDefault(); if (onSubmit) onSubmit(q); };
  const small = size === "small";
  return (
    <form onSubmit={handle} data-testid="search-box" style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder='Try "strata fees", "property transfer tax", "condo Vancouver"…'
        data-testid="search-input"
        style={{
          flex: 1,
          padding: small ? "0.55rem 0.85rem" : "0.85rem 1.1rem",
          fontSize: small ? "0.9rem" : "1.05rem",
          fontFamily: "Inter,sans-serif",
          border: "1px solid rgba(15,42,91,0.2)",
          borderRadius: 8,
          background: "white",
          outline: "none",
        }}
      />
      <button
        type="submit"
        data-testid="search-submit"
        className="btn btn-primary"
        style={{
          padding: small ? "0.55rem 1rem" : "0.85rem 1.35rem",
          fontSize: small ? "0.9rem" : "1rem",
        }}
      >Search</button>
    </form>
  );
};

const QuickAnswer = ({ answer, query }) => {
  if (!answer) return null;
  return (
    <div className="paper" data-testid="quick-answer" style={{
      padding: "1.5rem",
      marginBottom: "1.5rem",
      background: "linear-gradient(135deg, #F0F4FB 0%, #E8EEF9 100%)",
      border: `2px solid ${BRAND.blue}`,
    }}>
      <div style={{
        fontSize: "0.72rem",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: BRAND.blue,
        fontWeight: 800,
        marginBottom: "0.4rem",
      }}>Top match</div>
      <h2 style={{
        margin: "0 0 0.6rem",
        fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif',
        color: BRAND.navy,
        fontSize: "1.35rem",
      }}>{answer.title}</h2>
      <p style={{
        color: "#1F2937",
        fontFamily: "Inter,sans-serif",
        fontSize: "0.98rem",
        lineHeight: 1.65,
        marginBottom: "0.85rem",
      }}>{answer.excerpt}</p>
      <Link
        to={answer.url}
        data-testid="quick-answer-link"
        onClick={() => emitSearchClickBeacon({ query: query || "", kind: "QuickAnswer", href: answer.url, position: 0, source: "search" })}
        style={{
          color: BRAND.blue,
          fontWeight: 700,
          fontFamily: "Inter,sans-serif",
          textDecoration: "none",
        }}
      >Read the full explanation →</Link>
    </div>
  );
};

const ResultsGroup = ({ group, query }) => {
  const accent = KIND_ACCENTS[group.kind] || { dot: BRAND.blue, label: group.kind };
  if (!group.items || group.items.length === 0) return null;
  return (
    <div data-testid={`group-${group.kind.toLowerCase()}`} style={{ marginBottom: "2rem" }}>
      <h3 style={{
        display: "flex",
        alignItems: "center",
        gap: "0.55rem",
        margin: "0 0 0.85rem",
        color: BRAND.navy,
        fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif',
        fontSize: "1.15rem",
      }}>
        <span aria-hidden style={{ width: "0.65rem", height: "0.65rem", borderRadius: "50%", background: accent.dot }}/>
        {accent.label}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(17rem, 1fr))", gap: "0.75rem" }}>
        {group.items.map((it, i) => (
          <Link
            key={`${group.kind}-${i}-${it.href}`}
            to={it.href}
            data-testid={`result-${group.kind.toLowerCase()}-${i}`}
            onClick={() => emitSearchClickBeacon({ query: query || "", kind: group.kind, href: it.href, position: i, source: "search" })}
            style={{
              padding: "1rem",
              border: "1px solid rgba(15,42,91,0.12)",
              borderRadius: 8,
              background: BRAND.cream,
              textDecoration: "none",
              color: "inherit",
              display: "block",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = BRAND.blue; e.currentTarget.style.background = "#F0F4FB"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(15,42,91,0.12)"; e.currentTarget.style.background = BRAND.cream; }}
          >
            <div style={{ fontWeight: 700, color: BRAND.navy, fontFamily: "Inter,sans-serif", fontSize: "0.95rem", marginBottom: "0.4rem", lineHeight: 1.35 }}>{it.title}</div>
            <div style={{ color: BRAND.muted, fontFamily: "Inter,sans-serif", fontSize: "0.85rem", lineHeight: 1.5 }}>{it.blurb}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const NoResults = ({ query }) => (
  <div className="paper" data-testid="search-no-results" style={{ padding: "2rem 1.75rem", textAlign: "center" }}>
    <h3 style={{ margin: "0 0 0.65rem", fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: BRAND.navy }}>
      We could not find an approved EZtoFind.ca resource that directly answers this question.
    </h3>
    <p style={{ color: BRAND.muted, fontFamily: "Inter,sans-serif", lineHeight: 1.65, maxWidth: "38rem", margin: "0 auto 1.25rem" }}>
      You searched for <em>"{query}"</em>. Try a broader or simpler term, or explore the resources below.
    </p>
    <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
      <Link to="/glossary" className="btn btn-primary" data-testid="no-results-glossary">Browse the glossary</Link>
      <Link to="/communities" className="btn btn-ghost" data-testid="no-results-communities">Browse communities</Link>
      <Link to="/buying-guide" className="btn btn-ghost" data-testid="no-results-buying">Buying Guide</Link>
    </div>
  </div>
);

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const q = params.get("q") || "";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSearch = useCallback((query) => {
    if (!query || !query.trim()) return;
    setLoading(true); setError("");
    axios.get(`${API}/search`, { params: { q: query, limit: 6 } })
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (q) runSearch(q);
    else { setData(null); }
  }, [q, runSearch]);

  const handleSubmit = (newQ) => {
    if (!newQ || !newQ.trim()) return;
    const trimmed = newQ.trim();
    setParams({ q: trimmed });
    nav(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="section" data-testid="search-page">
      <Helmet>
        <title>{q ? `Search: ${q} — EZtoFind.ca` : "Search — EZtoFind.ca"}</title>
        <meta name="description" content="Search across BC real estate terms, FAQs, tools, communities, and guides on EZtoFind.ca."/>
        <meta name="robots" content="noindex, follow"/>
      </Helmet>
      <div className="container-x" style={{ maxWidth: "58rem" }}>
        <div className="eyebrow">Info & FAQs — EZtoFind.ca knowledge library</div>
        <h1 className="section-title" style={{ marginBottom: "1.25rem" }}>
          {q ? <>Matches for <em>"{q}"</em></> : "What are you looking to learn about BC real estate?"}
        </h1>

        <div className="paper" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <SearchBox initial={q} onSubmit={handleSubmit}/>
          <div style={{ marginTop: "0.85rem", fontSize: "0.82rem", color: BRAND.muted, fontFamily: "Inter,sans-serif", lineHeight: 1.55 }}>
            Look up definitions, frequently asked questions, community pages, tools, and guide sections from EZtoFind.ca's <Link to="/glossary" style={{ color: BRAND.blue, fontWeight: 600 }}>439 BC glossary terms</Link>, thousands of FAQs, 239 community profiles, and the Buyer's &amp; Seller's Guides.
          </div>
          <div style={{ marginTop: "0.6rem", padding: "0.6rem 0.85rem", background: "#FFF8E8", borderLeft: `3px solid ${BRAND.amber}`, fontSize: "0.78rem", color: "#1F2937", fontFamily: "Inter,sans-serif", lineHeight: 1.55, borderRadius: 4 }}>
            <strong>Educational retrieval only.</strong> This is an information look-up across EZtoFind.ca's approved content library — nothing here is legal, tax, financial, or property-specific advice. For your own situation, speak with the appropriate licensed professional.
          </div>
        </div>

        {loading && <div className="paper" style={{ padding: "1.5rem", textAlign: "center", color: BRAND.muted, fontFamily: "Inter,sans-serif" }}>Searching…</div>}
        {error && <div className="notice" style={{ background: "#FEE2E2", borderColor: "#DC2626", padding: "0.9rem 1.15rem", marginBottom: "1rem", fontFamily: "Inter,sans-serif" }}>{error}</div>}

        {data && (
          <>
            <QuickAnswer answer={data.quick_answer} query={q}/>

            {(!data.groups || data.groups.every((g) => !g.items || g.items.length === 0)) && !data.quick_answer && (
              <NoResults query={q}/>
            )}

            {data.groups && data.groups.map((g, i) => <ResultsGroup key={i} group={g} query={q}/>)}
          </>
        )}
      </div>
    </section>
  );
}
