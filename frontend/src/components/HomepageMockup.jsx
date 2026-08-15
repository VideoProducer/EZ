// Homepage lead-gen redesign mockup
// Parked at /mockups/home — noindex + unlisted-banner + robots.txt blocked.
//
// Approach: search-first hero, live market pulse, path-based CTAs (Buying /
// Selling / Moving-to-BC / Estate Sale), featured listings, specialty tiles,
// Ask-Doogie teaser, embedded lead magnets, featured communities, testimonial
// ticker, Doug's story, final CTA.  Every section leads with the visitor's
// job-to-be-done, not a corporate marketing pattern.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import UnlistedMockupBanner from "./UnlistedMockupBanner";

const BRAND = {
  navy: "#0F2A5B",
  gold: "#F5A623",
  cream: "#F5F0E1",
  ink: "#1F2937",
  muted: "#6B7280",
  green: "#059669",
  paper: "#FAFAF7",
};

const Section = ({ children, tone = "paper", pad = "48px 0" }) => (
  <section style={{ background: tone === "navy" ? BRAND.navy : tone === "cream" ? BRAND.cream : tone === "white" ? "white" : BRAND.paper, padding: pad }}>
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>{children}</div>
  </section>
);

const H2 = ({ kicker, children, color = BRAND.navy, align = "left" }) => (
  <div style={{ marginBottom: 24, textAlign: align }}>
    {kicker && <div style={{ fontSize: "0.72rem", letterSpacing: "0.16em", color: BRAND.gold, fontWeight: 700 }}>{kicker.toUpperCase()}</div>}
    <div style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontFamily: "'Sora',sans-serif", fontWeight: 700, color, lineHeight: 1.15, marginTop: 6 }}>{children}</div>
  </div>
);

const Chip = ({ children, tone = "navy" }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 12px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.02em",
    background: tone === "gold" ? "#FEF3C7" : tone === "green" ? "#DCFCE7" : "#EFF6FF",
    color: tone === "gold" ? "#78350F" : tone === "green" ? "#065F46" : BRAND.navy,
  }}>{children}</span>
);

// ── The full home page mockup ──────────────────────────────────────────────
export default function HomepageMockup() {
  const [searchQ, setSearchQ] = useState("");

  return (
    <div style={{ background: "white", minHeight: "100vh", fontFamily: "Inter,sans-serif" }} data-testid="homepage-mockup">
      <UnlistedMockupBanner label="Homepage (lead-gen redesign)" />

      {/* ══════════════════ § HERO — search-first ═══════════════════════ */}
      <section style={{
        background: `linear-gradient(135deg, rgba(15,42,91,0.92) 0%, rgba(15,42,91,0.75) 100%), url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1800) center/cover`,
        color: "white", padding: "56px 24px 72px", position: "relative",
      }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <Chip tone="gold">🐾 BCFSA-licensed · 13 years</Chip>
            <Chip tone="green">✓ CREA DDF® live feed</Chip>
            <Chip tone="gold">Metro Van · Fraser Valley · Sea-to-Sky</Chip>
          </div>

          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontFamily: "'Sora',sans-serif", fontWeight: 800, lineHeight: 1.05, margin: "10px 0 12px" }}>
            Find your BC home with <span style={{ color: BRAND.gold }}>Doogie</span> and Doug LeMaire, REALTOR®
          </h1>
          <div style={{ fontSize: "clamp(1rem, 2vw, 1.15rem)", opacity: 0.92, maxWidth: 700, lineHeight: 1.55 }}>
            Live MLS® listings updated hourly. AI-guided property tours. Fraser Valley, Greater Vancouver, and Sea-to-Sky expertise — plus a vetted BC-wide referral network for everywhere else.
          </div>

          {/* Search bar */}
          <div data-testid="hero-search" style={{ marginTop: 28, background: "white", borderRadius: 14, padding: 8, display: "flex", gap: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.35)", maxWidth: 780, flexWrap: "wrap" }}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="🔍 Search by city, community, or postal code (e.g. Maple Ridge, V2X 2T5)"
              data-testid="hero-search-input"
              style={{ flex: "1 1 340px", padding: "14px 16px", border: "none", outline: "none", fontSize: "1rem", color: BRAND.ink }}
            />
            <button data-testid="hero-search-submit" style={{
              background: BRAND.navy, color: "white", border: "none", padding: "14px 26px",
              borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
            }}>Search listings →</button>
          </div>
          <div style={{ marginTop: 12, fontSize: "0.85rem", opacity: 0.85 }}>
            Popular: <Link to="#" style={{ color: BRAND.gold, textDecoration: "none" }}>Maple Ridge</Link> · <Link to="#" style={{ color: BRAND.gold, textDecoration: "none" }}>Langley</Link> · <Link to="#" style={{ color: BRAND.gold, textDecoration: "none" }}>Squamish</Link> · <Link to="#" style={{ color: BRAND.gold, textDecoration: "none" }}>West Vancouver</Link> · <Link to="#" style={{ color: BRAND.gold, textDecoration: "none" }}>Under $800K</Link> · <Link to="#" style={{ color: BRAND.gold, textDecoration: "none" }}>Equestrian acreage</Link>
          </div>

          {/* Doug trust badge */}
          <div style={{ marginTop: 32, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire, REALTOR®" loading="lazy" decoding="async" style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${BRAND.gold}`, objectFit: "cover" }} />
            <div style={{ fontSize: "0.9rem", lineHeight: 1.4 }}>
              <div style={{ fontWeight: 700 }}>Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd.</div>
              <div style={{ opacity: 0.85, fontSize: "0.82rem" }}>⭐ 4.9/5 from 43 client reviews · 200+ closed BC transactions · BCFSA-licensed</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button data-testid="hero-call" style={{ background: BRAND.gold, color: BRAND.navy, border: "none", padding: "11px 20px", borderRadius: 999, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>📞 Talk to Doug</button>
              <button data-testid="hero-text" style={{ background: "rgba(255,255,255,0.14)", color: "white", border: "1px solid rgba(255,255,255,0.4)", padding: "11px 20px", borderRadius: 999, fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>💬 Text (604) 787-0851</button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ § LIVE MARKET PULSE ══════════════════════ */}
      <Section tone="white" pad="28px 0">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, textAlign: "center" }}>
          {[
            { l: "Active listings", v: "18,472", sub: "Live BC-wide" },
            { l: "New this week", v: "+1,247", sub: "Fraser Valley & Metro Van" },
            { l: "Sold last 30 days", v: "2,891", sub: "Board-verified" },
            { l: "Median list price", v: "$1.09M", sub: "Metro / FV combined" },
            { l: "Days on market", v: "27", sub: "Trending stable" },
            { l: "Feed status", v: "🟢 Live", sub: "Updated 4 mins ago" },
          ].map(t => (
            <div key={t.l} style={{ padding: "14px 12px", background: BRAND.paper, borderRadius: 10, border: "1px solid #E5E7EB" }}>
              <div style={{ fontSize: "0.68rem", color: BRAND.muted, fontWeight: 600, letterSpacing: "0.08em" }}>{t.l.toUpperCase()}</div>
              <div style={{ fontSize: "1.4rem", fontFamily: "'Sora',sans-serif", fontWeight: 800, color: BRAND.navy, marginTop: 3 }}>{t.v}</div>
              <div style={{ fontSize: "0.7rem", color: BRAND.muted, marginTop: 2 }}>{t.sub}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════ § PATH-BASED CTAs ═══════════════════════ */}
      <Section tone="paper">
        <H2 kicker="Choose your path">What brings you here today?</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {[
            { icon: "🏡", title: "I'm buying", body: "Search live BC listings, save favourites, and get new-listing alerts.", cta: "Start searching →", tone: BRAND.gold, testid: "path-buying" },
            { icon: "💰", title: "I'm selling", body: "Free home valuation, listing prep playbook, and Doug's marketing plan.", cta: "Get my home value →", tone: "white", testid: "path-selling" },
            { icon: "🌲", title: "Moving to BC", body: "Take our 90-sec quiz — we'll match 3 BC communities to your climate + budget.", cta: "Take the quiz →", tone: "white", testid: "path-moving" },
            { icon: "⚖️", title: "Estate sale / probate", body: "Executor toolkit, court-approved CMAs, capital-gains guidance.", cta: "Executor toolkit →", tone: "white", testid: "path-estate" },
          ].map(p => (
            <div key={p.title} data-testid={p.testid} style={{
              padding: "20px 22px", borderRadius: 14,
              background: p.tone === BRAND.gold ? BRAND.gold : "white",
              border: p.tone === BRAND.gold ? "none" : `1px solid #E5E7EB`,
              cursor: "pointer", transition: "transform 0.15s",
            }}>
              <div style={{ fontSize: "2rem" }}>{p.icon}</div>
              <div style={{ fontSize: "1.15rem", fontFamily: "'Sora',sans-serif", fontWeight: 700, color: BRAND.navy, marginTop: 8 }}>{p.title}</div>
              <div style={{ fontSize: "0.88rem", color: BRAND.ink, marginTop: 6, lineHeight: 1.55 }}>{p.body}</div>
              <div style={{ marginTop: 14, fontWeight: 700, color: BRAND.navy, fontSize: "0.9rem" }}>{p.cta}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════ § FEATURED LISTINGS ═════════════════════ */}
      <Section tone="white">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <H2 kicker="Freshest inventory · updated 4 min ago">Just listed this week in Doug's coverage</H2>
          <Link to="/listings" style={{ color: BRAND.navy, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>View all 342 new-this-week →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {[
            { price: 1425000, beds: 4, baths: 3, sqft: 2650, addr: "12475 224 Street", city: "Maple Ridge", tag: "Just listed", type: "Detached" },
            { price: 2895000, beds: 5, baths: 4, sqft: 4210, addr: "13455 232 Street", city: "Maple Ridge", tag: "Acreage · 5 acres", type: "Acreage" },
            { price: 998000, beds: 3, baths: 2, sqft: 1580, addr: "23845 111A Ave", city: "Maple Ridge", tag: "New today", type: "Townhouse" },
            { price: 749000, beds: 2, baths: 2, sqft: 985, addr: "115 - 22233 Selkirk Ave", city: "Maple Ridge", tag: "Under $800K", type: "Apartment" },
            { price: 4295000, beds: 4, baths: 4, sqft: 3620, addr: "24500 Rippington Rd", city: "Maple Ridge", tag: "🐴 Equestrian", type: "Acreage" },
            { price: 3195000, beds: 5, baths: 5, sqft: 4880, addr: "13801 Silver Valley Rd", city: "Maple Ridge", tag: "💎 Luxury", type: "Detached" },
          ].map((l, i) => (
            <div key={i} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", cursor: "pointer" }}>
              <div style={{ background: "linear-gradient(135deg,#DBE3F0,#F5F0E1)", height: 140, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.navy, fontWeight: 600, fontSize: "0.75rem" }}>
                <span style={{ opacity: 0.7 }}>MLS® photo</span>
                <div style={{ position: "absolute", top: 8, left: 8 }}><Chip tone="gold">{l.tag}</Chip></div>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: "1.15rem", fontFamily: "'Sora',sans-serif", fontWeight: 700, color: BRAND.navy }}>${l.price.toLocaleString("en-CA")}</div>
                <div style={{ fontSize: "0.85rem", color: BRAND.ink, marginTop: 2 }}>{l.beds}bd · {l.baths}ba · {l.sqft.toLocaleString()} sqft</div>
                <div style={{ fontSize: "0.8rem", color: BRAND.muted, marginTop: 4 }}>{l.addr}, {l.city}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════ § DOUG'S SPECIALTIES ═════════════════════ */}
      <Section tone="cream">
        <H2 kicker="Doug's specialties" align="center">Deep expertise in 4 BC segments</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { icon: "💎", title: "Luxury ($3M+)", body: "Foreign Buyer Ban exemptions, Speculation Tax thresholds, off-market previews.", to: "/specialties/luxury" },
            { icon: "🐴", title: "Equestrian & acreage", body: "ALR, water rights, farm class, barn permits — 40-point due-diligence checklist.", to: "/specialties/equestrian" },
            { icon: "🏠", title: "First-time buyers", body: "$44K+ in stackable grants (FTHB, HBP, FHSA, HBTC) — full 2026 cheat-sheet.", to: "/specialties/first-time-buyers" },
            { icon: "⚖️", title: "Estate sales / probate", body: "WESA-compliant listings, court-approved comparables, capital-gains planning.", to: "/specialties/estate-sales" },
          ].map(s => (
            <Link key={s.title} to={s.to} style={{ textDecoration: "none" }}>
              <div style={{ background: "white", padding: "20px 22px", borderRadius: 14, border: "1px solid #E5E7EB", height: "100%" }}>
                <div style={{ fontSize: "1.6rem" }}>{s.icon}</div>
                <div style={{ fontSize: "1.1rem", fontFamily: "'Sora',sans-serif", fontWeight: 700, color: BRAND.navy, marginTop: 8 }}>{s.title}</div>
                <div style={{ fontSize: "0.85rem", color: BRAND.ink, marginTop: 4, lineHeight: 1.55 }}>{s.body}</div>
                <div style={{ marginTop: 12, fontWeight: 700, color: BRAND.navy, fontSize: "0.82rem" }}>Explore →</div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ══════════════════ § ASK DOOGIE TEASER ═════════════════════ */}
      <Section tone="navy" pad="52px 0">
        <div style={{ color: "white", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.16em", color: BRAND.gold, fontWeight: 700 }}>ASK DOOGIE · 24/7 AI CONCIERGE</div>
            <div style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontFamily: "'Sora',sans-serif", fontWeight: 700, marginTop: 6, lineHeight: 1.15 }}>Not ready to talk to Doug yet? Ask Doogie anything about BC real estate.</div>
            <div style={{ fontSize: "1rem", opacity: 0.9, marginTop: 12, lineHeight: 1.6 }}>Doogie is our AI research assistant — trained on 396 BC real-estate glossary terms, live MLS® data, and 239 community profiles. Ask about the Foreign Buyer Ban, ALR rules, mortgage stress-test math, or your dream neighbourhood — free, instant, and no email required.</div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button data-testid="ask-doogie-btn" style={{ background: BRAND.gold, color: BRAND.navy, border: "none", padding: "12px 22px", borderRadius: 999, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>🐾 Ask Doogie</button>
              <Link to="/ask-doogie" style={{ color: "white", textDecoration: "underline", padding: "12px 4px", fontSize: "0.9rem", fontWeight: 600 }}>See sample questions →</Link>
            </div>
          </div>
          {/* Fake chat frame */}
          <div style={{ background: "white", borderRadius: 16, padding: "18px 20px", color: BRAND.ink, boxShadow: "0 12px 30px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: BRAND.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>🐾</div>
              <div style={{ background: BRAND.cream, padding: "10px 14px", borderRadius: 12, fontSize: "0.88rem" }}>Woof! I'm Doogie 🐾 · ask me anything about BC real estate.</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "flex-end", marginBottom: 12 }}>
              <div style={{ background: BRAND.navy, color: "white", padding: "10px 14px", borderRadius: 12, fontSize: "0.88rem", maxWidth: "80%" }}>Can a first-time buyer stack HBP + FHSA?</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: BRAND.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>🐾</div>
              <div style={{ background: BRAND.cream, padding: "10px 14px", borderRadius: 12, fontSize: "0.88rem" }}>
                Yes! You can combine them. HBP = up to $60K from RRSP (repaid over 15 yrs). FHSA = $40K lifetime tax-free (never repaid). Withdrawing from both on the same closing is fully allowed since 2023. Want the full 2026 grants cheat-sheet? 📄
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════ § FREE GUIDES ═══════════════════════════ */}
      <Section tone="paper">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <H2 kicker="Free · gated · no obligation">Doug's free BC guides</H2>
          <Link to="/guides" style={{ color: BRAND.navy, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>All guides →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {[
            { icon: "🏠", title: "2026 First-Time Buyer Grants Cheat-Sheet", blurb: "Every stackable BC + federal program — up to $44K in combined savings. 5-page PDF.", tag: "Most downloaded" },
            { icon: "🐴", title: "Equestrian Due-Diligence Checklist", blurb: "40-point pre-offer audit: ALR, water, septic, permits, covenants. 6-page PDF.", tag: "Niche essential" },
            { icon: "🌲", title: "Moving to BC Community Match Quiz", blurb: "90-second quiz picks 3 BC communities that fit your climate, budget, and lifestyle.", tag: "New this month" },
          ].map(g => (
            <div key={g.title} style={{ padding: "18px 20px", background: "white", border: `1px solid ${BRAND.gold}`, borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "1.7rem" }}>{g.icon}</div>
                <Chip tone="gold">{g.tag}</Chip>
              </div>
              <div style={{ fontSize: "1rem", fontFamily: "'Sora',sans-serif", fontWeight: 700, color: BRAND.navy, marginTop: 10 }}>{g.title}</div>
              <div style={{ fontSize: "0.85rem", color: BRAND.ink, marginTop: 6, lineHeight: 1.55 }}>{g.blurb}</div>
              <button style={{ marginTop: 14, background: BRAND.navy, color: "white", border: "none", padding: "9px 18px", borderRadius: 999, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>Get it free →</button>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════ § FEATURED COMMUNITIES ══════════════════ */}
      <Section tone="white">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <H2 kicker="Explore 239 BC communities">Doug's coverage · Fraser Valley → Sea-to-Sky</H2>
          <Link to="/communities" style={{ color: BRAND.navy, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>All 239 communities →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { name: "Maple Ridge", active: 187, median: "$1.24M", tone: "focus" },
            { name: "Langley", active: 312, median: "$1.48M", tone: "focus" },
            { name: "Squamish", active: 94, median: "$1.65M", tone: "focus" },
            { name: "West Vancouver", active: 158, median: "$3.85M", tone: "focus" },
            { name: "Kelowna", active: 342, median: "$985K", tone: "referral" },
            { name: "Victoria", active: 218, median: "$1.12M", tone: "referral" },
          ].map(cty => (
            <Link key={cty.name} to={`/community/${cty.name.toLowerCase().replace(/ /g, "-")}`} style={{ textDecoration: "none" }}>
              <div style={{ padding: "16px 18px", background: BRAND.paper, borderRadius: 12, border: "1px solid #E5E7EB", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "1.05rem", fontFamily: "'Sora',sans-serif", fontWeight: 700, color: BRAND.navy }}>{cty.name}</div>
                  {cty.tone === "focus"
                    ? <Chip tone="green">✓ Direct coverage</Chip>
                    : <Chip>🌐 Referral</Chip>}
                </div>
                <div style={{ fontSize: "0.82rem", color: BRAND.muted, marginTop: 6 }}>{cty.active} active · median {cty.median}</div>
                <div style={{ marginTop: 8, fontSize: "0.82rem", color: BRAND.navy, fontWeight: 600 }}>Explore →</div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ══════════════════ § TESTIMONIALS TICKER ═══════════════════ */}
      <Section tone="cream">
        <H2 kicker="Social proof" align="center">What Doug's clients say</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {[
            { stars: 5, text: "Doug found us an ALR-compliant equestrian property that three other REALTORS® had passed on. His due-diligence checklist saved us from a $200K water-rights headache.", author: "J & M · Aldergrove equestrian buyers" },
            { stars: 5, text: "Sold my mom's estate under WESA rules with zero drama. Doug coordinated the lawyer, the CMA, and the executor paperwork — I just signed when he told me to.", author: "K.P. · Coquitlam probate executor" },
            { stars: 5, text: "Moved from Calgary to Fraser Valley. Doug matched us with a local mortgage broker who understood the Speculation Tax. Closed in 3 weeks.", author: "T & S · Relocated from Alberta" },
          ].map((t, i) => (
            <div key={i} style={{ background: "white", padding: "20px 22px", borderRadius: 14, border: "1px solid #E5E7EB" }}>
              <div style={{ color: BRAND.gold, fontSize: "1.1rem" }}>{"★".repeat(t.stars)}</div>
              <div style={{ fontSize: "0.92rem", color: BRAND.ink, marginTop: 8, lineHeight: 1.65 }}>"{t.text}"</div>
              <div style={{ marginTop: 12, fontSize: "0.8rem", color: BRAND.muted, fontWeight: 600 }}>— {t.author}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════ § MEET DOUG ═════════════════════════════ */}
      <Section tone="paper">
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 32, alignItems: "center" }}>
          <img src="https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/rbfojmea_Linkedin.jpg" alt="Doug LeMaire" loading="lazy" decoding="async" style={{ width: 260, height: 260, borderRadius: "50%", border: `4px solid ${BRAND.gold}`, objectFit: "cover" }} />
          <div>
            <H2 kicker="Meet Doug">Doug LeMaire, REALTOR®</H2>
            <div style={{ fontSize: "1rem", color: BRAND.ink, lineHeight: 1.7, marginBottom: 14 }}>
              Doug has spent 13 years helping BC families buy, sell, and inherit real estate — from first-condo buyers in Maple Ridge to multi-generational estate wind-ups in West Vancouver. He's built EZtoFind.ca so you can research the market at your own pace before you need a REALTOR® at all — and if that turns out to be him, even better.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <Chip>BCFSA Licence #199822</Chip>
              <Chip>REBGV · FVREB member</Chip>
              <Chip tone="gold">13 yrs · 200+ closings</Chip>
              <Chip tone="green">$0 initial consult</Chip>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={{ background: BRAND.navy, color: "white", border: "none", padding: "12px 22px", borderRadius: 999, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>📞 Book a 20-min call</button>
              <button style={{ background: "white", color: BRAND.navy, border: `1px solid ${BRAND.navy}`, padding: "12px 22px", borderRadius: 999, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>💬 Text (604) 787-0851</button>
              <button style={{ background: "white", color: BRAND.navy, border: `1px solid ${BRAND.navy}`, padding: "12px 22px", borderRadius: 999, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>📧 info@eztofind.ca</button>
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════ § FINAL CTA ═════════════════════════════ */}
      <Section tone="navy" pad="56px 0">
        <div style={{ color: "white", textAlign: "center" }}>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.16em", color: BRAND.gold, fontWeight: 700 }}>READY?</div>
          <div style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontFamily: "'Sora',sans-serif", fontWeight: 800, marginTop: 6 }}>Let's find you your BC home.</div>
          <div style={{ fontSize: "1rem", opacity: 0.9, marginTop: 10, maxWidth: 620, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Book a free 20-minute call with Doug. No obligation, no sales pitch — just an honest conversation about your goals and the BC market.
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button data-testid="final-book" style={{ background: BRAND.gold, color: BRAND.navy, border: "none", padding: "14px 28px", borderRadius: 999, fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>📞 Book a 20-min call</button>
            <button data-testid="final-search" style={{ background: "rgba(255,255,255,0.14)", color: "white", border: "1px solid rgba(255,255,255,0.4)", padding: "14px 28px", borderRadius: 999, fontWeight: 600, fontSize: "1rem", cursor: "pointer" }}>🏡 Or search listings yourself →</button>
          </div>
        </div>
      </Section>

      {/* Compliance footer */}
      <div style={{ background: "#0A1B3D", color: "rgba(255,255,255,0.7)", padding: "26px 24px", fontSize: "0.75rem", lineHeight: 1.6, textAlign: "center" }}>
        © 2026 EZtoFind.ca · Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. — 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5. (604) 466-7021 (Brokerage) · (604) 787-0851 (Direct). MLS® data © CREA DDF®. BCFSA-licensed. General information only — not real-estate, legal, tax, or financial advice.
      </div>
    </div>
  );
}
