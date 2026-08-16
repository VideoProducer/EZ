// CommunityFinderQuiz — 5-question lifestyle → BC region matcher.
//
// GOAL: convert relocating traffic before they scroll.  The visitor answers
// 5 quick multi-choice questions; the quiz scores each of BC's 8 broad
// regions against their picks and shows the top 3 as clickable community
// gateways.
//
// COMPLIANCE
//   - No PII collected in the quiz itself.  The optional email capture on
//     the results screen is opt-in only, uses the standard buyer-lead
//     endpoint (which enforces PIPA + CASL consent), and works fine if
//     the visitor just wants the results without leaving contact info.
//   - Recommendations are educational general information (Article 3 of
//     the REALTOR® Code), not property-specific advice.

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ReferralAsk from "./ReferralAsk";

const C = {
  navy: "#0F2A5B", gold: "#F5A623", cream: "#F5F0E1",
  ink: "#1F2937", muted: "#6B7280", paper: "#FAFAF7",
  blue: "#1E4FCF",
};

// ── 8 BC regions the quiz maps to ─────────────────────────────────
// Each region has a slug for the community-cluster URL, a headline
// pitch, and the community pages Doug recommends visiting first.
const REGIONS = {
  greater_vancouver: {
    name: "Greater Vancouver",
    inServiceArea: true,
    tagline: "Urban core, most jobs, highest housing costs — 22 municipalities.",
    starterLinks: [
      { label: "Vancouver", href: "/community/vancouver" },
      { label: "Burnaby", href: "/community/burnaby" },
      { label: "North Vancouver", href: "/community/north-vancouver" },
    ],
  },
  fraser_valley: {
    name: "Fraser Valley",
    inServiceArea: true,
    tagline: "Suburban, growing families, better value than Vancouver.",
    starterLinks: [
      { label: "Maple Ridge", href: "/community/maple-ridge" },
      { label: "Langley", href: "/community/langley" },
      { label: "Abbotsford", href: "/community/abbotsford" },
    ],
  },
  sea_to_sky: {
    name: "Sea-to-Sky",
    inServiceArea: true,
    tagline: "Squamish · Whistler · Pemberton — ski country, tech workers.",
    starterLinks: [
      { label: "Squamish", href: "/community/squamish" },
      { label: "Whistler", href: "/community/whistler" },
    ],
  },
  vancouver_island: {
    name: "Vancouver Island",
    inServiceArea: false,
    tagline: "Victoria + Nanaimo + Comox — mild winters, ferry access, slower pace.",
    starterLinks: [
      { label: "Victoria", href: "/community/victoria" },
      { label: "Nanaimo", href: "/community/nanaimo" },
      { label: "Comox Valley", href: "/community/courtenay" },
    ],
  },
  okanagan: {
    name: "Okanagan",
    inServiceArea: false,
    tagline: "Kelowna · Vernon · Penticton — wine country, dry summers, retirement-friendly.",
    starterLinks: [
      { label: "Kelowna", href: "/community/kelowna" },
      { label: "Vernon", href: "/community/vernon" },
      { label: "Penticton", href: "/community/penticton" },
    ],
  },
  kootenays: {
    name: "Kootenays",
    inServiceArea: false,
    tagline: "Nelson · Cranbrook · Fernie — alpine, artistic, most affordable BC housing.",
    starterLinks: [
      { label: "Nelson", href: "/community/nelson" },
      { label: "Fernie", href: "/community/fernie" },
    ],
  },
  northern_bc: {
    name: "Northern BC",
    inServiceArea: false,
    tagline: "Prince George · Fort St. John — resource jobs, wilderness, cold winters.",
    starterLinks: [
      { label: "Prince George", href: "/community/prince-george" },
    ],
  },
  cariboo_thompson: {
    name: "Cariboo & Thompson",
    inServiceArea: false,
    tagline: "Kamloops · Williams Lake — interior plateau, ranching, four-season climate.",
    starterLinks: [
      { label: "Kamloops", href: "/community/kamloops" },
    ],
  },
};

// ── 5 questions.  Each answer awards weighted points to regions. ──
// Sum across all answers → top scorers are the recommendations.
const QUESTIONS = [
  {
    id: "lifestyle",
    prompt: "What type of lifestyle are you looking for?",
    options: [
      { label: "Urban / Downtown", weights: { greater_vancouver: 3, vancouver_island: 2, okanagan: 1 } },
      { label: "Suburban",         weights: { fraser_valley: 3, greater_vancouver: 2, vancouver_island: 1, okanagan: 1 } },
      { label: "Small Town",       weights: { sea_to_sky: 3, kootenays: 3, vancouver_island: 2, okanagan: 1, cariboo_thompson: 1 } },
      { label: "Rural / Acreage",  weights: { cariboo_thompson: 3, northern_bc: 3, fraser_valley: 2, kootenays: 1 } },
      { label: "Waterfront",       weights: { vancouver_island: 3, okanagan: 3, sea_to_sky: 1, greater_vancouver: 1 } },
      { label: "Mountain / Recreation", weights: { sea_to_sky: 3, kootenays: 3, okanagan: 1, northern_bc: 1 } },
    ],
  },
  {
    id: "climate",
    prompt: "What climate suits you?",
    options: [
      { label: "Mild winters, some rain",  weights: { greater_vancouver: 3, vancouver_island: 3, fraser_valley: 2 } },
      { label: "Hot dry summers, four seasons", weights: { okanagan: 3, cariboo_thompson: 2, kootenays: 1 } },
      { label: "Snowy winters, alpine",    weights: { sea_to_sky: 3, kootenays: 3, northern_bc: 2 } },
      { label: "Coastal / marine",         weights: { vancouver_island: 3, sea_to_sky: 1, greater_vancouver: 2 } },
      { label: "I don't mind the cold",    weights: { northern_bc: 3, cariboo_thompson: 2, kootenays: 1 } },
    ],
  },
  {
    id: "budget",
    prompt: "What's your realistic budget for a home?",
    options: [
      { label: "Under $500K",       weights: { northern_bc: 3, cariboo_thompson: 2, kootenays: 1 } },
      { label: "$500K – $800K",     weights: { kootenays: 3, cariboo_thompson: 3, vancouver_island: 1, okanagan: 1, northern_bc: 1 } },
      { label: "$800K – $1.2M",     weights: { fraser_valley: 2, okanagan: 3, vancouver_island: 2, kootenays: 1 } },
      { label: "$1.2M – $2M",       weights: { greater_vancouver: 2, fraser_valley: 3, vancouver_island: 2, sea_to_sky: 2, okanagan: 1 } },
      { label: "$2M+",              weights: { greater_vancouver: 3, sea_to_sky: 3, vancouver_island: 1, okanagan: 1 } },
    ],
  },
  {
    id: "priority",
    prompt: "What matters most in your new home base?",
    options: [
      { label: "Job opportunities",       weights: { greater_vancouver: 3, okanagan: 2, vancouver_island: 2, northern_bc: 1 } },
      { label: "Family + schools",        weights: { fraser_valley: 3, greater_vancouver: 2, vancouver_island: 2, okanagan: 1 } },
      { label: "Retirement + lifestyle",  weights: { vancouver_island: 3, okanagan: 3, sea_to_sky: 1 } },
      { label: "Outdoor recreation",      weights: { sea_to_sky: 3, kootenays: 3, vancouver_island: 2, okanagan: 1 } },
      { label: "Lower cost of living",    weights: { kootenays: 3, cariboo_thompson: 3, northern_bc: 3 } },
    ],
  },
  {
    id: "connectivity",
    prompt: "How connected do you want to be?",
    options: [
      { label: "Big-city amenities (airport, hospitals, universities)", weights: { greater_vancouver: 3, vancouver_island: 2, okanagan: 1 } },
      { label: "Mid-sized city (services + hospital)",  weights: { okanagan: 3, vancouver_island: 3, cariboo_thompson: 2, fraser_valley: 1 } },
      { label: "Rural town (grocery + coffee shop)",    weights: { sea_to_sky: 3, kootenays: 3, cariboo_thompson: 1, vancouver_island: 1 } },
      { label: "Remote / off-grid",                     weights: { northern_bc: 3, cariboo_thompson: 3, kootenays: 1 } },
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────
export default function CommunityFinderQuiz({ onComplete }) {
  const [step, setStep] = useState(0);                // 0..QUESTIONS.length
  const [answers, setAnswers] = useState({});         // { id: optionIndex }
  const total = QUESTIONS.length;
  const done = step >= total;

  const scores = useMemo(() => {
    const s = {};
    Object.keys(REGIONS).forEach(k => (s[k] = 0));
    Object.entries(answers).forEach(([qid, optIdx]) => {
      const q = QUESTIONS.find(x => x.id === qid);
      if (!q) return;
      const opt = q.options[optIdx];
      if (!opt) return;
      Object.entries(opt.weights).forEach(([regionKey, w]) => {
        s[regionKey] = (s[regionKey] || 0) + w;
      });
    });
    return s;
  }, [answers]);

  const top3 = useMemo(() => {
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .filter(([, sc]) => sc > 0)
      .map(([key]) => ({ key, ...REGIONS[key] }));
  }, [scores]);

  const pick = (optIdx) => {
    const q = QUESTIONS[step];
    const next = { ...answers, [q.id]: optIdx };
    setAnswers(next);
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep >= total && onComplete) onComplete(next);
  };

  const back = () => setStep(Math.max(0, step - 1));
  const restart = () => { setAnswers({}); setStep(0); };

  // ── UI helpers ──
  const progressBar = (
    <div style={{ display: "flex", gap: 5 }} aria-hidden>
      {QUESTIONS.map((_, i) => (
        <div key={i} style={{
          width: 26, height: 5, borderRadius: 3,
          background: i <= step - 1 ? C.navy : "rgba(15,42,91,0.15)",
          transition: "background 0.25s",
        }}/>
      ))}
    </div>
  );

  return (
    <section
      data-testid="community-finder-quiz"
      aria-labelledby="cfq-h1"
      style={{ background: C.paper, padding: "clamp(32px, 5vw, 56px) clamp(16px, 4vw, 24px)" }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "0.78rem", letterSpacing: "0.2em", color: C.gold, fontWeight: 800, textTransform: "uppercase", marginBottom: 8 }}>
          📍 Community Finder
        </div>
        <h1 id="cfq-h1" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(2rem, 4.5vw, 3rem)", fontWeight: 700, color: C.navy,
          margin: "0 0 12px", lineHeight: 1.1,
        }}>
          Where should you live?
        </h1>
        <p style={{ color: C.muted, fontSize: "1rem", margin: "0 0 24px", lineHeight: 1.55 }}>
          Here are 5 quick questions to help you explore BC communities that may fit your lifestyle.
        </p>
      </div>

      <div
        style={{
          maxWidth: 900, margin: "0 auto", background: "#fff",
          borderRadius: 16, boxShadow: "0 10px 30px rgba(15,42,91,0.08)",
          padding: "clamp(20px, 3vw, 32px)",
        }}
      >
        {!done && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: "0.85rem", color: C.muted }} data-testid="cfq-step-indicator">
                Question <strong>{step + 1}</strong> of {total}
              </div>
              {progressBar}
            </div>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(1.35rem, 2.5vw, 1.7rem)", fontWeight: 700,
              color: C.navy, margin: "0 0 20px", lineHeight: 1.25,
            }} data-testid="cfq-question">
              {QUESTIONS[step].prompt}
            </h2>
            <div
              data-testid={`cfq-options-${step}`}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}
            >
              {QUESTIONS[step].options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  data-testid={`cfq-option-${step}-${i}`}
                  style={{
                    background: "#fff",
                    border: `1px solid rgba(15,42,91,0.2)`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    fontFamily: "Inter,sans-serif",
                    fontSize: "0.95rem",
                    color: C.navy,
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background 0.15s, transform 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.cream; e.currentTarget.style.borderColor = C.gold; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "rgba(15,42,91,0.2)"; }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {step > 0 && (
              <div style={{ marginTop: 22 }}>
                <button
                  type="button"
                  onClick={back}
                  data-testid="cfq-back-btn"
                  style={{
                    background: "transparent", border: "none",
                    color: C.navy, fontSize: "0.9rem", fontWeight: 700,
                    cursor: "pointer", padding: 0,
                  }}
                >← Back</button>
              </div>
            )}
          </>
        )}

        {done && (
          <div data-testid="cfq-results">
            <div style={{ fontSize: "0.8rem", letterSpacing: "0.18em", color: C.gold, fontWeight: 800, textTransform: "uppercase", marginBottom: 8 }}>
              ✨ Your matches
            </div>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", fontWeight: 700,
              color: C.navy, margin: "0 0 8px", lineHeight: 1.2,
            }}>
              {top3.length ? "Based on your answers, these BC regions may fit you best:" : "Not enough data to match — try answering again."}
            </h2>
            <p style={{ color: C.muted, margin: "0 0 20px", fontSize: "0.95rem", lineHeight: 1.55 }}>
              General guidance only — not a substitute for a conversation with a licensed BC REALTOR® about your specific budget, immigration status, and timing.
            </p>

            <div style={{ display: "grid", gap: 14 }}>
              {top3.map((r, i) => (
                <div
                  key={r.key}
                  data-testid={`cfq-match-${i}`}
                  style={{
                    background: i === 0 ? C.cream : "#FDFCF8",
                    border: `1px solid ${i === 0 ? C.gold : "rgba(15,42,91,0.15)"}`,
                    borderRadius: 12,
                    padding: "16px 18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                    <div style={{
                      background: i === 0 ? C.gold : C.navy,
                      color: i === 0 ? C.navy : "#fff",
                      padding: "2px 9px", borderRadius: 999,
                      fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
                    }}>
                      {i === 0 ? "Best match" : `#${i + 1}`}
                    </div>
                    <h3 style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: "1.35rem", fontWeight: 700, color: C.navy, margin: 0,
                    }}>{r.name}</h3>
                  </div>
                  <p style={{ margin: "0 0 10px", color: C.ink, fontSize: "0.95rem", lineHeight: 1.55 }}>
                    {r.tagline}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {r.starterLinks.map(l => (
                      <Link
                        key={l.href}
                        to={l.href}
                        data-testid={`cfq-match-${i}-link-${l.label.toLowerCase().replace(/\W+/g,"-")}`}
                        style={{
                          background: "#fff",
                          border: `1px solid ${C.navy}`,
                          color: C.navy,
                          padding: "6px 12px", borderRadius: 999,
                          fontSize: "0.82rem", fontWeight: 700, textDecoration: "none",
                          fontFamily: "Sora,sans-serif",
                        }}
                      >
                        {l.label} →
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 22, padding: "14px 16px",
              background: C.navy, color: "#fff", borderRadius: 12,
              display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between",
            }}>
              {(() => {
                // Route the CTA based on Doug's direct service area vs. referral network.
                //   • Top-1 match in Doug's area (Greater Vancouver / Fraser Valley / Sea-to-Sky)
                //     → primary CTA is "Talk to Doug".
                //   • Top-1 out-of-area → primary CTA is the standard site-wide referral flow
                //     with the region name pre-filled on /referral-request.
                //   • Zero matches → simple restart prompt (no CTA to avoid a dead end).
                const topMatch = top3[0];
                if (!topMatch) {
                  return (
                    <>
                      <div style={{ fontSize: "0.92rem", lineHeight: 1.55, flex: "1 1 260px" }}>
                        No clear region matched — try answering the quiz again.
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button" onClick={restart}
                          data-testid="cfq-restart-btn"
                          style={{
                            background: C.gold, color: C.navy, border: "none",
                            padding: "10px 18px", borderRadius: 999,
                            fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                          }}
                        >Retake the quiz</button>
                      </div>
                    </>
                  );
                }
                if (topMatch.inServiceArea) {
                  return (
                    <>
                      <div style={{ fontSize: "0.92rem", lineHeight: 1.55, flex: "1 1 260px" }}>
                        Ready for the next step? Talk to Doug about how to buy in {topMatch.name} — $0 cost, complimentary consultation.
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link
                          to={`/buyer?source=community-finder&region=${encodeURIComponent(topMatch.key)}`}
                          data-testid="cfq-cta-buyer"
                          style={{
                            background: C.gold, color: C.navy,
                            padding: "10px 18px", borderRadius: 999, textDecoration: "none",
                            fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.9rem",
                          }}
                        >Talk to Doug →</Link>
                        <button
                          type="button" onClick={restart}
                          data-testid="cfq-restart-btn"
                          style={{
                            background: "transparent", color: "#fff",
                            border: "1px solid rgba(255,255,255,0.5)",
                            padding: "10px 18px", borderRadius: 999,
                            fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                          }}
                        >Retake the quiz</button>
                      </div>
                    </>
                  );
                }
                // Out-of-area: swap in the Realtor Referral flow.
                return (
                  <>
                    <div style={{ flex: "1 1 260px" }}>
                      <ReferralAsk
                        variant="card"
                        area={topMatch.name}
                        context="community-finder-out-of-area"
                        data-testid="cfq-cta-referral"
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button" onClick={restart}
                        data-testid="cfq-restart-btn"
                        style={{
                          background: "transparent", color: "#fff",
                          border: "1px solid rgba(255,255,255,0.5)",
                          padding: "10px 18px", borderRadius: 999,
                          fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                        }}
                      >Retake the quiz</button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
