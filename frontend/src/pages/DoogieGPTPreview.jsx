// EZtoFind.ca — Doogie GPT Store Preview page
// Mockup of what Doug's tile + first-message experience will look like in
// the ChatGPT Store. Also links to the raw OpenAPI spec, persona prompt,
// and store copy for one-click paste into GPT Builder.
//
// Route: /doogie-gpt-preview (added to App.js router).
// This page is meant for Doug's internal review only — noindexed via
// robots meta and excluded from the public sitemap.

import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const DOUG_HEADSHOT = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/bxczsq3k_LOW%20RES%202-1_1986.jpg";
const DOOGIE_MASCOT = "https://customer-assets.emergentagent.com/job_proptech-hub-111/artifacts/vo8679bv_Doogie%20Laptop.png";

const C = { navy: "#0F2A5B", blue: "#1E4FCF", gold: "#F5A623", green: "#22C55E", cream: "#FAF7F0", ink: "#0B1930", mist: "#EEF2FB" };

const CHIPS = [
  "Show me 2-bed condos in Kitsilano under $1.5M",
  "What's a strata Form B and why should I care?",
  "Homes for sale in Maple Ridge under $900K",
  "What's the property transfer tax on a $1.2M home?",
];

const Card = ({ title, children, testId, right }) => (
  <section data-testid={testId} style={{
    background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16,
    boxShadow: "0 6px 24px rgba(15,42,91,0.06)",
    padding: 24, marginBottom: 20,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: C.navy, margin: 0 }}>{title}</h2>
      {right}
    </div>
    {children}
  </section>
);

const KeyVal = ({ k, v, mono }) => (
  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 8, padding: "6px 0", borderBottom: "1px dashed #F1F5F9", fontSize: 13 }}>
    <span style={{ fontWeight: 700, color: C.navy }}>{k}</span>
    <span style={{ color: "#374151", fontFamily: mono ? "'JetBrains Mono',ui-monospace,SFMono-Regular,monospace" : "inherit" }}>{v}</span>
  </div>
);

export default function DoogieGPTPreview() {
  return (
    <div style={{ background: C.cream, minHeight: "100vh", padding: "32px 24px 64px" }} data-testid="doogie-gpt-preview">
      <Helmet>
        <title>Doogie GPT — Store Copy Preview | EZtoFind.ca</title>
        <meta name="robots" content="noindex, nofollow"/>
      </Helmet>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, letterSpacing: 0.3, color: C.blue, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Internal review · noindex</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, color: C.navy, margin: 0, lineHeight: 1.1 }}>
            Doogie GPT · <em style={{ color: C.blue }}>ChatGPT Store submission preview</em>
          </h1>
          <p style={{ fontSize: 14, color: "#4B5563", marginTop: 8, maxWidth: 620 }}>
            This is exactly what Doug's tile will look like in the ChatGPT Store search results, plus the first-message greeting a visitor will see when they open it. All BCFSA-compliant. No licence number displayed. Approve every word here, then paste into GPT Builder to publish.
          </p>
        </div>

        {/* ── 1. Store tile mockup ────────────────────────────────────── */}
        <Card
          title="1 · Store tile mockup"
          testId="preview-tile"
          right={<span style={{ fontSize: 11, background: C.mist, color: C.navy, padding: "4px 10px", borderRadius: 99, fontWeight: 700 }}>What buyers see in ChatGPT search</span>}
        >
          <div style={{
            background: "linear-gradient(135deg, #F9FAFB 0%, #EEF2FB 100%)",
            border: "1px solid #E5E7EB", borderRadius: 14, padding: 20,
            maxWidth: 480, margin: "0 auto",
            display: "flex", alignItems: "flex-start", gap: 16,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 14, overflow: "hidden",
              flexShrink: 0, background: "#111",
              boxShadow: "0 4px 12px rgba(15,42,91,0.15)",
            }}>
              <img
                src={DOUG_HEADSHOT} alt="Doug LeMaire, REALTOR®"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%" }}
                data-testid="preview-tile-icon"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.navy, lineHeight: 1.3 }}>
                Doug LeMaire — REALTOR® · Fraser Property Management Realty Services Ltd.
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4, fontWeight: 600 }}>
                By Doug LeMaire — REALTOR®
              </div>
              <div style={{ fontSize: 13, color: "#374151", marginTop: 8, lineHeight: 1.5 }}>
                Live British Columbia MLS® listings, plain-English answers.
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#6B7280", marginTop: 10, fontWeight: 600 }}>
                <span>⭐ 4.9 (est.)</span>
                <span>·</span>
                <span>Category: Lifestyle</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ── 2. First-message greeting ───────────────────────────────── */}
        <Card title="2 · What Doogie says the moment a visitor opens the tile" testId="preview-greeting">
          <div style={{
            background: C.ink, borderRadius: 14, padding: 20,
            display: "flex", gap: 14, alignItems: "flex-start",
          }}>
            <img
              src={DOOGIE_MASCOT} alt="Doogie mascot"
              style={{ width: 60, height: 60, borderRadius: "50%", background: "#FFF4D9", padding: 4, flexShrink: 0 }}
            />
            <div style={{ flex: 1, color: "#F8FAFC", fontSize: 14, lineHeight: 1.65 }}>
              <div style={{
                background: "rgba(255,255,255,0.05)", borderRadius: 12,
                padding: "12px 14px", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <img loading="lazy" decoding="async" src={DOUG_HEADSHOT} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", objectPosition: "center 25%" }}/>
                  <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700 }}>Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd.</span>
                </div>
                Woof! 🐾 I'm <strong style={{ color: C.gold }}>Doogie</strong>, Doug LeMaire's BC real-estate helper. Doug is a REALTOR® with Fraser Property Management Realty Services Ltd. — I look things up, he handles the transactions.
                <br/><br/>
                Where in British Columbia are you looking, or is there a term you'd like me to explain?
              </div>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>Tap to try</div>
                {CHIPS.map((c, i) => (
                  <button
                    key={i}
                    data-testid={`preview-chip-${i}`}
                    style={{
                      textAlign: "left", background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10,
                      color: "#F8FAFC", padding: "10px 14px", fontSize: 13,
                      cursor: "default",
                    }}
                  >{c}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ── 3. All copy fields (paste into GPT Builder) ─────────────── */}
        <Card
          title="3 · Every field GPT Builder will ask for"
          testId="preview-fields"
          right={
            <a
              href="/doogie-gpt-store-copy.txt" target="_blank" rel="noreferrer"
              data-testid="download-store-copy"
              style={{ fontSize: 12, background: C.navy, color: "#fff", padding: "7px 14px", borderRadius: 99, textDecoration: "none", fontWeight: 700 }}
            >Download raw copy ↗</a>
          }
        >
          <KeyVal k="Tile name" v={<strong>Doug LeMaire — REALTOR® · Fraser Property Management Realty Services Ltd.</strong>}/>
          <KeyVal k="Publisher" v="Doug LeMaire — REALTOR®"/>
          <KeyVal k="Icon" v="Doug's professional headshot (JPG, 512×512)"/>
          <KeyVal k="Category" v="Lifestyle"/>
          <KeyVal k="Short description" v={<em>"Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. · Live British Columbia MLS® listings, plain-English answers."</em>}/>
          <KeyVal k="Actions spec URL" v="https://eztofind.ca/doogie-gpt-openapi.json" mono/>
          <KeyVal k="Privacy policy URL" v="https://eztofind.ca/privacy" mono/>
          <KeyVal k="Authentication" v="None (write actions are consent-gated server-side)"/>
          <KeyVal k="Web browsing" v="OFF"/>
          <KeyVal k="Image generation" v="OFF"/>
          <KeyVal k="Code interpreter" v="OFF"/>
        </Card>

        {/* ── 4. Assets download ──────────────────────────────────────── */}
        <Card title="4 · Ready-to-paste files" testId="preview-assets">
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "OpenAPI 3.1 spec (7 actions)", href: "/doogie-gpt-openapi.json", desc: "Paste this URL into GPT Builder → Actions → Import from URL." },
              { label: "Persona / system prompt", href: "/doogie-gpt-persona.txt", desc: "Paste into GPT Builder → Instructions field." },
              { label: "Full store copy (all fields)", href: "/doogie-gpt-store-copy.txt", desc: "Cheat sheet — every field GPT Builder will ask for, prewritten." },
            ].map(a => (
              <a
                key={a.href}
                href={a.href} target="_blank" rel="noreferrer"
                data-testid={`asset-${a.href.replace(/[^a-z0-9]/gi, "")}`}
                style={{
                  display: "block", textDecoration: "none", color: C.navy,
                  background: C.mist, border: "1px solid #DDE6FA", borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ background: C.gold, color: C.navy, fontWeight: 800, borderRadius: 8, padding: "3px 10px", fontSize: 11 }}>OPEN</span>
                  <strong style={{ fontSize: 14 }}>{a.label}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#4B5563", marginTop: 4 }}>{a.desc}</div>
              </a>
            ))}
          </div>
        </Card>

        {/* ── 5. Publish checklist ────────────────────────────────────── */}
        <Card title="5 · Publish checklist" testId="preview-checklist">
          <ol style={{ paddingLeft: "1.4rem", lineHeight: 1.75, fontSize: 13.5, color: "#374151" }}>
            <li>Sign in to <a href="https://chat.openai.com/gpts/editor" target="_blank" rel="noreferrer">chat.openai.com/gpts/editor</a> with a ChatGPT Plus account.</li>
            <li>Click <strong>Configure</strong> → paste the fields from section 3 above.</li>
            <li>Upload the icon: Doug's professional headshot (from Emergent asset store).</li>
            <li><strong>Instructions</strong> tab → paste the persona / system prompt.</li>
            <li><strong>Actions</strong> → <strong>Import from URL</strong> → paste <code>https://eztofind.ca/doogie-gpt-openapi.json</code>.</li>
            <li>Authentication → <em>None</em>. Privacy policy → <code>https://eztofind.ca/privacy</code>.</li>
            <li>Preview the GPT — ask "Show me 2-bed condos in Kits under $1.5M". Confirm Doogie replies with live listings + eztofind.ca link.</li>
            <li><strong>Save → Publish → Everyone</strong>. First submission review is 1-3 business days.</li>
            <li>Once approved, share <code>https://chat.openai.com/g/g-doug-doogie</code> everywhere.</li>
          </ol>
        </Card>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Link to="/" data-testid="preview-back-home" style={{
            color: C.navy, textDecoration: "none", fontSize: 13, fontWeight: 700,
            border: `1px solid ${C.navy}`, borderRadius: 99, padding: "10px 22px",
          }}>← Back to EZtoFind.ca</Link>
        </div>
      </div>
    </div>
  );
}
