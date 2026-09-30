import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Search, ExternalLink, ArrowRight, X } from "lucide-react";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextFooter } from "../components/homenext/HomeNextExtras";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Apple-style glossary concept — /glossary-next (noindex preview).
// Reuses the live glossary backend (GET /api/glossary) unchanged.
const C = {
  navy: "#0F2A5B",
  ink: "#1F2937",
  muted: "#6B7280",
  line: "#E8ECF3",
  blue: "#2563EB",
  softBlue: "#EAF1FF",
  gold: "#B8860B",
  goldBg: "#FBF3DF",
  bg: "#FFFFFF",
  alt: "#F7F9FC",
};
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function GlossaryNext() {
  useEffect(() => {
    const el = document.querySelector('meta[name="robots"]:not([data-rh])');
    if (!el) return;
    const prev = el.getAttribute("content");
    el.setAttribute("content", "noindex, nofollow");
    return () => { el.setAttribute("content", prev); };
  }, []);

  const [terms, setTerms] = useState(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  useEffect(() => {
    fetch(`${API}/glossary?limit=1000`)
      .then((r) => r.json())
      .then((d) => setTerms(Array.isArray(d) ? d : (d.terms || d.items || [])))
      .catch(() => setTerms([]));
  }, []);

  const categories = useMemo(() => {
    if (!terms) return [];
    const counts = {};
    terms.forEach((t) => { const c = t.category || "Other"; counts[c] = (counts[c] || 0) + 1; });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [terms]);

  const filtered = useMemo(() => {
    if (!terms) return [];
    const needle = q.trim().toLowerCase();
    return terms.filter((t) => {
      if (cat !== "All" && (t.category || "Other") !== cat) return false;
      if (!needle) return true;
      return (t.term || "").toLowerCase().includes(needle) ||
             (t.definition || "").toLowerCase().includes(needle);
    });
  }, [terms, q, cat]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((t) => {
      const first = (t.term || "").trim().charAt(0).toUpperCase();
      const key = /[A-Z]/.test(first) ? first : "#";
      (g[key] = g[key] || []).push(t);
    });
    Object.values(g).forEach((arr) => arr.sort((a, b) => (a.term || "").localeCompare(b.term || "")));
    return g;
  }, [filtered]);

  const activeLetters = useMemo(
    () => ["#", ...ALPHABET].filter((l) => grouped[l] && grouped[l].length),
    [grouped]
  );

  const jumpTo = (letter) => {
    const el = document.getElementById(`gx-letter-${letter}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" });
  };

  return (
    <div className="hn" style={{ background: C.bg }} data-testid="glossary-next">
      <Helmet>
        <title>BC Real Estate Glossary — EZtoFind.ca</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="439 BC real estate terms explained in plain language, each with an authoritative source." />
      </Helmet>
      <HomeNextNav />

      <main>
        {/* Hero */}
        <section style={{ padding: "72px 20px 40px", textAlign: "center" }} data-testid="gx-hero">
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 12, fontWeight: 700, color: C.blue, margin: "0 0 14px" }}>
              BC Real Estate Glossary
            </p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", color: C.navy, fontWeight: 700, lineHeight: 1.08, fontSize: "clamp(34px, 5vw, 56px)", margin: 0 }}>
              Every term, made simple.
            </h1>
            <p style={{ color: C.muted, fontSize: 17, lineHeight: 1.6, margin: "18px auto 0", maxWidth: 560 }}>
              {terms ? `${terms.length} terms` : "Hundreds of terms"}, each explained in plain language — with the statute or authoritative source behind it.
            </p>

            {/* Search */}
            <div style={{ marginTop: 32, position: "relative", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
              <Search size={20} style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
              <input
                data-testid="gx-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a term — e.g. strata, PTT, subject removal…"
                aria-label="Search glossary terms"
                style={{
                  width: "100%", padding: "18px 52px 18px 52px", fontSize: 16,
                  border: `1px solid ${C.line}`, borderRadius: 999, outline: "none",
                  color: C.navy, background: "#fff", boxShadow: "0 8px 30px rgba(15,42,91,0.07)",
                  fontFamily: "inherit",
                }}
              />
              {q && (
                <button onClick={() => setQ("")} aria-label="Clear search" data-testid="gx-search-clear"
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex" }}>
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* A–Z index */}
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 20px" }}>
          <div data-testid="gx-alpha" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4, paddingBottom: 18 }}>
            {["#", ...ALPHABET].map((l) => {
              const on = activeLetters.includes(l);
              return (
                <button key={l} disabled={!on} onClick={() => jumpTo(l)} data-testid={`gx-alpha-${l}`}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "none", cursor: on ? "pointer" : "default",
                    background: "transparent", color: on ? C.navy : "#C7CEDB", fontWeight: 700, fontSize: 14,
                    transition: "background-color 0.15s, color 0.15s",
                  }}
                  onMouseOver={(e) => { if (on) e.currentTarget.style.background = C.softBlue; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category chips */}
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 20px 8px" }}>
          <div data-testid="gx-chips" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {["All", ...categories].map((c) => {
              const on = cat === c;
              return (
                <button key={c} onClick={() => setCat(c)} data-testid={`gx-chip-${c}`}
                  style={{
                    padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${on ? C.navy : C.line}`,
                    background: on ? C.navy : "#fff", color: on ? "#fff" : C.ink,
                    transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
                  }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <section style={{ maxWidth: 940, margin: "0 auto", padding: "28px 20px 80px" }}>
          {terms === null && (
            <p style={{ textAlign: "center", color: C.muted, padding: "60px 0" }} data-testid="gx-loading">Loading the glossary…</p>
          )}
          {terms !== null && filtered.length === 0 && (
            <div style={{ textAlign: "center", color: C.muted, padding: "60px 0" }} data-testid="gx-empty">
              <p style={{ fontSize: 17, color: C.navy, fontWeight: 600 }}>No terms match “{q}”.</p>
              <p>Try a shorter word, or clear the filter.</p>
            </div>
          )}

          {activeLetters.map((letter) => (
            <div key={letter} id={`gx-letter-${letter}`} style={{ marginBottom: 12 }} data-testid={`gx-group-${letter}`}>
              <div style={{
                position: "sticky", top: 64, zIndex: 5, background: "rgba(255,255,255,0.86)",
                backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                borderBottom: `1px solid ${C.line}`, padding: "10px 2px", margin: "0 0 14px",
              }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: C.blue }}>{letter}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {grouped[letter].map((t) => (
                  <Link key={t.slug} to={`/glossary/${t.slug}`} data-testid={`gx-card-${t.slug}`}
                    style={{
                      display: "block", textDecoration: "none", background: "#fff",
                      border: `1px solid ${C.line}`, borderRadius: 16, padding: "18px 18px 16px",
                      transition: "box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 14px 34px rgba(15,42,91,0.10)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "#D7E0F0"; }}
                    onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = C.line; }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                      <h3 style={{ margin: 0, color: C.navy, fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>{t.term}</h3>
                      <ArrowRight size={16} style={{ color: C.blue, flexShrink: 0, marginTop: 3 }} />
                    </div>
                    <p style={{ margin: "8px 0 14px", color: C.muted, fontSize: 14, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {t.definition}
                    </p>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700,
                      color: C.gold, background: C.goldBg, border: "1px solid #E6D9A8",
                      padding: "4px 10px", borderRadius: 999, letterSpacing: "0.02em",
                    }}>
                      {t.category || "Authoritative source"}
                      <ExternalLink size={12} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      <HomeNextFooter />
    </div>
  );
}
