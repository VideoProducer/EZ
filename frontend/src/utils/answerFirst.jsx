// ── Answer-First SEO helpers (Feb 2026, Phase 7) ────────────────────────
// Used by /glossary/{slug} and /community/{slug} to render the structural
// pattern LLMs (ChatGPT, Claude, Perplexity, Gemini Overviews) most
// aggressively cite:
//
//   1. TL;DR one-paragraph direct answer (≤ ~65 words) — always the FIRST
//      block after the H1 so AI overviews quote it verbatim.
//   2. "Key Points" scannable bullet list — LLMs love these for extraction.
//   3. Compliance strip at the bottom naming the five governing / trade
//      bodies EZtoFind.ca operates under (BCFSA · CREA · CASL · PIPA · GVR®).
//      Duplicated on every AEO-critical page so single-page indexers
//      (Perplexity, Bing summariser) still capture the disclosure.
//
// All copy is pre-approved compliance boilerplate — DO NOT change without
// Doug's sign-off. Any material rewrite invalidates the audit trail
// referenced from /compliance and the FAQPage.author signals.
import React from "react";
import { Link } from "react-router-dom";

// Utility: build a ≤ 65-word TL;DR from a longer definition. Trims at the
// closest sentence boundary so the extract still reads as a full thought.
// Falls back gracefully when the source string is already short.
export const buildTLDR = (text, maxWords = 65) => {
  if (!text || typeof text !== "string") return "";
  const clean = text.replace(/\s+/g, " ").trim();
  const words = clean.split(" ");
  if (words.length <= maxWords) return clean;
  // Slice to maxWords, then walk backwards to the nearest sentence end.
  let candidate = words.slice(0, maxWords).join(" ");
  const lastPeriod = Math.max(candidate.lastIndexOf(". "), candidate.lastIndexOf("? "), candidate.lastIndexOf("! "));
  if (lastPeriod > candidate.length * 0.6) candidate = candidate.slice(0, lastPeriod + 1);
  else candidate = candidate + "…";
  return candidate;
};

// The five bodies EZtoFind.ca operates under. Rendered as tiny pills on
// glossary + community pages. Each links to the internal /compliance
// section anchor so a curious visitor (or a crawler) can drill down.
export const COMPLIANCE_BODIES = [
  { key: "bcfsa", label: "BCFSA",  title: "BC Financial Services Authority — REALTOR® licensing (#167790)", href: "/compliance#bcfsa" },
  { key: "crea",  label: "CREA",   title: "Canadian Real Estate Association — MLS® trademark + DDF® feed",  href: "/compliance#crea"  },
  { key: "casl",  label: "CASL",   title: "Canadian Anti-Spam Legislation — express consent on all marketing", href: "/compliance#casl" },
  { key: "pipa",  label: "PIPA",   title: "Personal Information Protection Act (BC) — collection notice + retention",  href: "/compliance#pipa" },
  { key: "gvr",   label: "GVR®",   title: "Greater Vancouver REALTORS® — DORTS forms, code of ethics",       href: "/compliance#gvr"  },
];

// <TLDRBlock text=... testId=... /> — visual + semantic marker for LLMs.
// The itemProp="abstract" + data-tldr attribute give both microdata + a
// simple selector for prerender crawlers to pluck the concise answer.
export const TLDRBlock = ({ text, testId = "aeo-tldr" }) => {
  if (!text) return null;
  return (
    <aside
      data-testid={testId}
      data-tldr="true"
      itemProp="abstract"
      style={{
        margin: "1rem 0 1.5rem",
        padding: "16px 20px",
        background: "#FFF7E6",
        borderLeft: "4px solid #F5A623",
        borderRadius: 10,
        fontFamily: "Inter, sans-serif",
        fontSize: "1rem",
        lineHeight: 1.65,
        color: "#0F2A5B",
      }}
    >
      <span style={{ display: "inline-block", fontSize: "0.7rem", letterSpacing: "0.12em", fontWeight: 800, color: "#8A6D2E", marginRight: 8 }}>
        TL;DR ·
      </span>
      {text}
    </aside>
  );
};

// <KeyPointsBlock points=[...] testId=.../> — scannable bullets rendered
// as an ordered list because LLMs weight ordered content higher for
// procedural terms (taxes / processes / regulations).
export const KeyPointsBlock = ({ points, testId = "aeo-key-points" }) => {
  if (!points || !Array.isArray(points) || points.length === 0) return null;
  return (
    <section
      data-testid={testId}
      style={{
        margin: "1.5rem 0",
        padding: "14px 20px",
        background: "#F5F7FB",
        border: "1px solid rgba(15,42,91,0.10)",
        borderRadius: 10,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: "0.9rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0F2A5B" }}>
        Key Points
      </h3>
      <ul style={{ margin: 0, paddingLeft: "1.15rem", fontSize: "0.94rem", lineHeight: 1.65, color: "#1F2937" }}>
        {points.map((p, i) => (
          <li key={i} style={{ marginBottom: 4 }} data-testid={`${testId}-item-${i}`}>{p}</li>
        ))}
      </ul>
    </section>
  );
};

// <AnswerFirstMeta /> — compact one-line meta row rendered directly under
// the TL;DR answer on every glossary term, insight, and rate page. Per Doug's
// Feb 2026 AEO spec: every answer must be followed by a machine-readable
// "As of" date + a SINGLE official source link so LLMs (and readers) can
// verify the answer against primary authority without scrolling.
//
// Ordering rule (locked): H1 → answer → this meta row → disclaimer →
// author box → FAQs/body. The disclaimer NEVER precedes the answer.
//
// Props:
//   dateModified  ISO date string of the last reviewed date
//   source        { title, url, publisher? } — single most authoritative
//                 source for this page's answer (typically the governing
//                 BC statute or CRA / BCFSA / Stats Canada page)
//   testId        stable data-testid prefix
export const AnswerFirstMeta = ({ dateModified, source, testId = "aeo-meta" }) => {
  if (!dateModified && !source) return null;
  let iso = null;
  let human = null;
  try {
    if (dateModified) {
      const d = new Date(dateModified);
      if (!isNaN(d)) {
        iso = d.toISOString().slice(0, 10);
        human = d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
      }
    }
  } catch (_) {}
  return (
    <div
      data-testid={testId}
      style={{
        margin: "0.25rem 0 1.25rem",
        padding: "8px 14px",
        background: "#F0F4FB",
        border: "1px solid rgba(15,42,91,0.14)",
        borderLeft: "3px solid #0F2A5B",
        borderRadius: 8,
        fontFamily: "Inter, sans-serif",
        fontSize: "0.82rem",
        lineHeight: 1.55,
        color: "#374151",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.35rem 0.85rem",
        alignItems: "baseline",
      }}
    >
      {iso && (
        <span data-testid={`${testId}-asof`}>
          <span style={{ fontWeight: 700, color: "#0F2A5B" }}>As of</span>{" "}
          <time dateTime={iso} itemProp="dateModified">{human}</time>
        </span>
      )}
      {source && source.url && (
        <span data-testid={`${testId}-source`}>
          <span style={{ fontWeight: 700, color: "#0F2A5B" }}>Official source:</span>{" "}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--brand-blue, #0F5FB5)", fontWeight: 600, textDecoration: "underline" }}
          >
            {source.title || source.publisher || source.url}
          </a>
          {source.publisher && source.title ? (
            <span style={{ color: "var(--muted, #6B7280)" }}> · {source.publisher}</span>
          ) : null}
        </span>
      )}
    </div>
  );
};

// <ComplianceStrip/> — mandatory disclosure pill row. Rendered at the
// bottom of any AEO page (glossary term or community) so that single-page
// crawlers still capture the five governing bodies.
export const ComplianceStrip = ({ testId = "aeo-compliance-strip" }) => (
  <div
    data-testid={testId}
    style={{
      margin: "1.5rem 0 0.75rem",
      padding: "12px 16px",
      background: "#F9FAFB",
      border: "1px solid rgba(15,42,91,0.10)",
      borderRadius: 10,
      fontFamily: "Inter, sans-serif",
      fontSize: "0.78rem",
      color: "#4B5563",
      lineHeight: 1.6,
    }}
  >
    <div style={{ fontWeight: 700, color: "#0F2A5B", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "0.72rem" }}>
      Governance & Trademarks
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
      {COMPLIANCE_BODIES.map(b => (
        <Link
          key={b.key}
          to={b.href}
          data-testid={`${testId}-${b.key}`}
          title={b.title}
          style={{
            background: "white",
            border: "1px solid rgba(15,42,91,0.20)",
            borderRadius: 999,
            padding: "3px 10px",
            fontWeight: 700,
            fontSize: "0.72rem",
            color: "#0F2A5B",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {b.label}
        </Link>
      ))}
    </div>
    <div>
      Doug LeMaire, REALTOR® · BCFSA #167790 · Fraser Property Management Realty Services Ltd. · MLS® &amp; REALTOR® are CREA trademarks. General educational information — not real-estate, legal, tax, or financial advice.
    </div>
  </div>
);
