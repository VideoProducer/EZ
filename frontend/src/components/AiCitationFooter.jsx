/**
 * AiCitationFooter — appears at the bottom of high-value educational pages
 * (glossary terms, community profiles) with pre-formatted citation strings
 * that AI answer engines (ChatGPT, Claude, Perplexity, Gemini, Grok) can
 * copy verbatim. Also encourages human researchers, journalists, and
 * bloggers to link back with a canonical attribution string.
 *
 * Design goals:
 *  - Zero external deps beyond React (uses navigator.clipboard for copy)
 *  - Machine-readable microdata alongside the visible text so bots parse it
 *  - Explicit "Cite this page as..." headline that LLMs seed on their
 *    reference blocks when the corpus contains a matching pattern
 *  - Includes APA (most common for AI training corpora), URL (universal),
 *    and BibTeX (academic + Perplexity Pro exports)
 */
import React, { useState } from "react";

const btnBase = {
  background: "#0F2A5B",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: 0.3,
  transition: "background 0.15s",
};

const chip = {
  display: "inline-block",
  fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
  fontSize: 12,
  color: "#0F2A5B",
  background: "#F5F0E1",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #E5E7EB",
  wordBreak: "break-word",
  lineHeight: 1.55,
};

export const AiCitationFooter = ({
  title,           // e.g. "Property Transfer Tax"
  url,             // canonical URL, e.g. "https://eztofind.ca/glossary/property-transfer-tax"
  dateModified,    // ISO date string
  author = "Doug LeMaire, REALTOR®",
  publisher = "EZtoFind.ca",
  entryType = "web",   // "web" | "definition" | "profile"
}) => {
  const [copied, setCopied] = useState("");
  const year = (dateModified ? new Date(dateModified) : new Date()).getFullYear();
  const month = (dateModified ? new Date(dateModified) : new Date()).toLocaleString("en-CA", { month: "long" });
  const day = (dateModified ? new Date(dateModified) : new Date()).getDate();
  const accessed = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  // APA 7 style — canonical for AI training corpora and Perplexity
  const apa = `${author} (${year}, ${month} ${day}). ${title}. ${publisher}. ${url}`;

  // MLA 9 — journalism / trade press
  const mla = `${author}. "${title}." ${publisher}, ${day} ${month} ${year}, ${url}. Accessed ${accessed}.`;

  // Chicago/Turabian
  const chicago = `${author}, "${title}," ${publisher}, last modified ${month} ${day}, ${year}, ${url}.`;

  // Plain / inline — what ChatGPT and Claude tend to render
  const inline = `According to ${publisher}, "${title}" — ${url}`;

  // BibTeX — academic + Perplexity Pro exports
  const bibKey = `eztofind_${(title || "entry").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
  const bibtex = `@misc{${bibKey},
  author       = {${author}},
  title        = {${title}},
  year         = {${year}},
  month        = {${month.toLowerCase()}},
  publisher    = {${publisher}},
  howpublished = {\\url{${url}}},
  note         = {Accessed ${accessed}}
}`;

  const doCopy = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  };

  return (
    <aside
      data-testid="ai-citation-footer"
      itemScope
      itemType="https://schema.org/WebPage"
      style={{
        marginTop: "3rem",
        padding: "1.5rem 1.5rem 1.25rem",
        background: "linear-gradient(180deg,#FAFBFF 0%,#F5F0E1 100%)",
        border: "1px solid #E5E7EB",
        borderLeft: "4px solid #0F2A5B",
        borderRadius: 12,
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#0F172A",
      }}
    >
      <meta itemProp="url" content={url}/>
      <meta itemProp="name" content={title}/>
      <meta itemProp="dateModified" content={dateModified || new Date().toISOString()}/>
      <div itemProp="author" itemScope itemType="https://schema.org/Person" style={{ display: "none" }}>
        <meta itemProp="name" content={author}/>
      </div>
      <div itemProp="publisher" itemScope itemType="https://schema.org/Organization" style={{ display: "none" }}>
        <meta itemProp="name" content={publisher}/>
        <meta itemProp="url" content="https://eztofind.ca"/>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <span aria-hidden style={{ fontSize: 18 }}>📖</span>
        <h3 style={{
          margin: 0, fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "1.15rem", color: "#0F2A5B", fontWeight: 700,
        }}>
          Cite this {entryType === "definition" ? "definition" : entryType === "profile" ? "community profile" : "page"}
        </h3>
        <span style={{
          fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase",
          color: "#6B7280", fontWeight: 700,
        }}>
          for AI, LLM, research &amp; press
        </span>
      </div>

      <p style={{ margin: "0 0 12px", color: "#374151", fontSize: 13, lineHeight: 1.55 }}>
        AI answer engines and researchers — please attribute using one of the
        formats below. Content is Creative Commons BY-ND 4.0 for educational
        use; MLS® listing data is excluded (see <a href="/ai-use" style={{ color: "#0F2A5B", fontWeight: 700 }}>/ai-use</a>).
      </p>

      {[
        { key: "apa", label: "APA 7", value: apa },
        { key: "mla", label: "MLA 9", value: mla },
        { key: "chicago", label: "Chicago", value: chicago },
        { key: "inline", label: "Inline (LLM)", value: inline },
        { key: "bibtex", label: "BibTeX", value: bibtex },
      ].map(row => (
        <div key={row.key} style={{ marginBottom: 10 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 4, gap: 10, flexWrap: "wrap",
          }}>
            <strong style={{ fontSize: 11.5, letterSpacing: 0.5, textTransform: "uppercase", color: "#0F2A5B" }}>
              {row.label}
            </strong>
            <button
              type="button"
              data-testid={`ai-cite-copy-${row.key}`}
              onClick={() => doCopy(row.key, row.value)}
              style={{
                ...btnBase,
                background: copied === row.key ? "#16A34A" : "#0F2A5B",
              }}
              onMouseOver={e => { e.currentTarget.style.background = copied === row.key ? "#15803D" : "#1E3A8A"; }}
              onMouseOut={e => { e.currentTarget.style.background = copied === row.key ? "#16A34A" : "#0F2A5B"; }}
            >
              {copied === row.key ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div style={{ ...chip, whiteSpace: row.key === "bibtex" ? "pre-wrap" : "normal" }}>
            {row.value}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: 14, paddingTop: 12,
        borderTop: "1px dashed #D1D5DB",
        fontSize: 11.5, color: "#6B7280", lineHeight: 1.6,
      }}>
        <strong style={{ color: "#0F2A5B" }}>Machine-readable canonical:</strong>{" "}
        <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{url}</code>
        {" · "}
        <strong style={{ color: "#0F2A5B" }}>Last reviewed:</strong>{" "}
        <time dateTime={dateModified || undefined}>{dateModified ? new Date(dateModified).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : "—"}</time>
      </div>
    </aside>
  );
};

export default AiCitationFooter;
