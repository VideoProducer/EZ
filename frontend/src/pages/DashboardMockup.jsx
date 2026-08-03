// ============================================================================
//  EZtoFind.ca — Dashboard Mockup (`/dashboard-mockup`)
//  ---------------------------------------------------------------------------
//  Reviewable prototype that consolidates the entire consumer experience into
//  one SaaS-style shell: left sidebar navigation, top-tab sub-navigation, main
//  content area, and Doogie chat drawer. Every panel is wired to the real
//  backend endpoints (`/api/listings`, `/api/insights`, `/api/tours/library`,
//  `/api/glossary`, `/api/communities`, `/api/doogie/chat`) — no mock data,
//  no substitutions. Compliance touches (BCFSA licensing badge, REALTOR® Yes/No
//  gate, service-area check, CASL/PIPA/CREA attributions) are enforced at every
//  step so the mockup faithfully mirrors what a live production build would
//  look like.
// ============================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, Heart, BarChart3, TrendingUp, MapPin, BookOpen, Video,
  CalendarClock, MessageCircle, ShieldCheck, Star, Home as HomeIcon,
  Mic, Send, ChevronRight, ExternalLink, X, Sparkles, Building2,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
// Doogie mascot library (all transparent PNGs served from /public/doogie/)
const DOOGIE = {
  laptop:       "/doogie/laptop.png",         // hero on Search panel
  celebrating:  "/doogie/celebrating.png",    // success screens
  thinking:     "/doogie/thinking.png",       // empty states / Ask drawer welcome
  pointingLeft: "/doogie/pointing_left.png",  // form guidance / REALTOR® gate
  pointingRight:"/doogie/pointing_right.png", // CTA nudges
  head:         "/doogie/head.png",           // avatar / toast / admin table row
};
const DOOGIE_LAPTOP_URL = DOOGIE.laptop;
const SAVED_HOMES_KEY = "ez_saved_homes";

// Doug's primary service area (BCFSA licensing) — anything outside triggers
// the referral flow instead of direct-representation intake.
const DOUG_SERVICE_AREAS = new Set([
  "vancouver", "burnaby", "richmond", "surrey", "delta", "new westminster",
  "coquitlam", "port coquitlam", "port moody", "north vancouver", "west vancouver",
  "maple ridge", "pitt meadows", "langley", "white rock", "abbotsford",
  "chilliwack", "mission", "hope", "squamish", "whistler", "pemberton",
]);

const C = {
  navy: "#0F2A5B", blue: "#1E4FCF", gold: "#F5A623", green: "#22C55E",
  cream: "#FBF7EE", ink: "#0B1220", mist: "#F0F4FB", muted: "#6B7280",
};

const SECTIONS = [
  { key: "search",    label: "Search",         icon: Search },
  { key: "foryou",    label: "For You",        icon: Sparkles },
  { key: "saved",     label: "Saved Homes",    icon: Heart },
  { key: "buyer",     label: "Buyer Insights", icon: BarChart3 },
  { key: "seller",    label: "Seller Insights",icon: TrendingUp },
  { key: "community", label: "Communities",    icon: MapPin },
  { key: "glossary",  label: "Glossary",       icon: BookOpen },
  { key: "tours",     label: "Virtual Tours",  icon: Video },
  { key: "consult",   label: "Consultation",   icon: CalendarClock },
  { key: "ask",       label: "Ask Doogie",     icon: MessageCircle },
];

// ── Hero (introduces Doogie + BCFSA context) ──────────────────────────────
const HeroIntro = () => (
  <section data-testid="dash-hero" style={{
    background: "linear-gradient(135deg,#FBF7EE 0%,#FFF6DE 100%)",
    border: "1px solid rgba(245,166,35,0.35)", borderRadius: 14,
    padding: "22px 24px", marginBottom: 22, display: "grid",
    gridTemplateColumns: "220px 1fr", gap: 22, alignItems: "center",
  }}>
    <img src={DOOGIE_LAPTOP_URL} alt="Doogie — EZtoFind.ca real estate helper"
      data-testid="dash-hero-doogie"
      style={{
        width: "100%", maxWidth: 220, height: "auto", filter: "drop-shadow(0 8px 24px rgba(15,42,91,0.25))",
      }}
      onError={e => { e.currentTarget.style.display = "none"; }}
    />
    <div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif", margin: 0, lineHeight: 1.08,
        fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: 800,
      }}>
        <span style={{ color: C.green }}>Real estate,</span><br/>
        <span style={{ color: C.navy }}>made </span><span style={{ color: C.blue }}>EZ to </span><span style={{ color: C.gold }}>Find.ca</span>
      </h1>
      <p style={{ color: C.ink, marginTop: 10, marginBottom: 6, fontSize: 14, lineHeight: 1.55, maxWidth: 720 }}>
        EZtoFind.ca is a <strong>free</strong> real estate information platform for anyone considering buying or selling residential real estate in British Columbia — now or in the future.
      </p>
      <p style={{ color: C.ink, marginTop: 6, marginBottom: 6, fontSize: 14, lineHeight: 1.55, maxWidth: 720 }}>
        <strong style={{ color: C.navy }}>Meet <em style={{ color: C.gold, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>Doogie</em> — your BC real estate helper.</strong> Ask about active BC listings, neighbourhoods, or real estate terms. Doogie provides <strong>general information only, never advice</strong>.
      </p>
      <p style={{ color: C.muted, marginTop: 10, marginBottom: 0, fontSize: 12, lineHeight: 1.5, maxWidth: 720 }}>
        Real Estate services are provided by <strong>Doug LeMaire, REALTOR®</strong> of Fraser Property Management Realty Services Ltd. — a BCFSA-licensed real estate professional who specializes in detached homes, luxury properties, equestrian &amp; acreage estates, estate sales/probate, and residential stratas. Primary practice areas: <strong>Greater Vancouver, Fraser Valley &amp; the Sea-to-Sky Corridor of BC</strong>.
      </p>
    </div>
  </section>
);

export default function DashboardMockup({ homeVariant = "search" }) {
  const [section, setSection] = useState("search");
  const [askOpen, setAskOpen] = useState(false);
  // First-visit sidebar toast — appears once, dismissible, remembers via localStorage
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("ez_dash_onboarded")) {
        const t = setTimeout(() => setShowToast(true), 900);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);
  const dismissToast = () => {
    try { localStorage.setItem("ez_dash_onboarded", "1"); } catch {}
    setShowToast(false);
  };
  return (
    <div data-testid="dashboard-mockup" style={{
      minHeight: "100vh", display: "grid",
      gridTemplateColumns: "260px 1fr", background: C.cream, color: C.navy,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <Sidebar section={section} setSection={setSection} onAsk={() => setAskOpen(true)}/>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <TopBar section={section} homeVariant={homeVariant}/>
        <main style={{ padding: "24px 32px", flex: 1, overflowX: "hidden" }}>
          <Panel section={section} setSection={setSection} homeVariant={homeVariant} onAsk={() => setAskOpen(true)}/>
        </main>
        <ComplianceFooter/>
      </div>
      <AskDoogieDrawer open={askOpen} onClose={() => setAskOpen(false)}/>
      {showToast && <FirstVisitToast onDismiss={dismissToast} setSection={setSection}/>}
    </div>
  );
}

// ── First-visit sidebar toast — one-time onboarding hint ──────────────────
const FirstVisitToast = ({ onDismiss, setSection }) => (
  <div
    data-testid="dash-first-visit-toast"
    style={{
      position: "fixed", left: 274, bottom: 24, zIndex: 60,
      background: "#fff", border: "2px solid " + C.gold, borderRadius: 14,
      padding: "14px 16px 14px 14px", maxWidth: 360,
      boxShadow: "0 12px 32px rgba(15,42,91,0.28)",
      display: "flex", gap: 14, alignItems: "flex-start",
      animation: "toast-slide 0.35s cubic-bezier(0.16,1,0.3,1)",
    }}
  >
    <img src={DOOGIE.head} alt="Doogie welcomes you"
      data-testid="dash-first-visit-doogie"
      style={{
        width: 72, height: 72, flexShrink: 0, objectFit: "contain",
        filter: "drop-shadow(0 3px 8px rgba(15,42,91,0.15))",
      }}/>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: C.navy, marginBottom: 4 }}>
        Woof! I'm Doogie 🐾
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: C.ink }}>
        Tap any of the <strong>10 sections</strong> in the sidebar — I'll show you real BC listings, live market signals, community pages and glossary terms. Ask me anything anytime with the chat bubble in the sidebar.
      </div>
      <button
        onClick={() => { onDismiss(); if (setSection) setSection("community"); }}
        data-testid="dash-first-visit-dismiss"
        style={{
          marginTop: 10, background: C.blue, color: "#fff", border: "none",
          padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Got it — let's explore</button>
    </div>
    <style>{`@keyframes toast-slide { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>
  </div>
);

// ── Sidebar ────────────────────────────────────────────────────────────────
const Sidebar = ({ section, setSection, onAsk }) => (
  <aside style={{
    background: C.navy, color: "#fff", padding: "20px 14px", position: "sticky", top: 0,
    height: "100vh", overflowY: "auto", boxShadow: "2px 0 20px rgba(15,42,91,0.15)",
  }} data-testid="dash-sidebar">
    <Link to="/" data-testid="dash-brand" style={{
      color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 10,
      padding: "6px 8px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)", marginBottom: 14,
    }}>
      <div style={{
        width: 40, height: 40, background: C.gold, borderRadius: "50%",
        display: "grid", placeItems: "center", fontSize: 22, color: C.navy, fontWeight: 900,
      }}>🐾</div>
      <div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800 }}>EZtoFind<span style={{color:C.gold}}>.ca</span></div>
        <div style={{ fontSize: 10, opacity: 0.75 }}>Real estate, made EZ to Find</div>
      </div>
    </Link>
    <nav style={{ display: "grid", gap: 4 }}>
      {SECTIONS.map(s => {
        const Icon = s.icon;
        const active = section === s.key;
        return (
          <button
            key={s.key}
            onClick={() => (s.key === "ask" ? onAsk() : setSection(s.key))}
            data-testid={`dash-nav-${s.key}`}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 10,
              background: active ? "rgba(245,166,35,0.20)" : "transparent",
              border: "none", color: active ? C.gold : "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left",
              borderLeft: active ? `3px solid ${C.gold}` : "3px solid transparent",
            }}
          ><Icon size={16}/> {s.label}</button>
        );
      })}
    </nav>
  </aside>
);

// ── Top bar ────────────────────────────────────────────────────────────────
const TopBar = ({ section, homeVariant }) => {
  const meta = SECTIONS.find(s => s.key === section) || { label: "Dashboard" };
  const isDashHome = section === "search" && homeVariant === "dashboard";
  const title = isDashHome ? "Dashboard" : meta.label;
  const sub = isDashHome
    ? "Your BC market at a glance — live CREA DDF® signals · updated every 4 hours."
    : "Data sourced from CREA DDF® · Doogie provides general information only, never advice.";
  return (
    <header style={{
      background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "16px 32px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 24, margin: 0, color: C.navy,
        }} data-testid="dash-section-title">{title}</h1>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{
          background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.35)",
          padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#166534",
        }}><CheckDot/> Live CREA DDF® sync · every 4h</div>
      </div>
    </header>
  );
};
const CheckDot = () => <span style={{ display: "inline-block", width: 7, height: 7, background: "#22C55E", borderRadius: "50%", marginRight: 6 }}/>;

// ── Panel Router ───────────────────────────────────────────────────────────
const Panel = ({ section, setSection, homeVariant, onAsk }) => {
  switch (section) {
    case "search":    return homeVariant === "dashboard"
                            ? <DashboardHomeTiles setSection={setSection} onAsk={onAsk}/>
                            : <SearchPanel/>;
    case "foryou":    return <ForYouPanel/>;
    case "saved":     return <SavedPanel/>;
    case "buyer":     return <BuyerInsightsPanel/>;
    case "seller":    return <SellerInsightsPanel/>;
    case "community": return <CommunityPanel setSection={setSection}/>;
    case "glossary":  return <GlossaryPanel/>;
    case "tours":     return <ToursPanel/>;
    case "consult":   return <ConsultPanel/>;
    default: return null;
  }
};

// ── Search Panel ───────────────────────────────────────────────────────────
// ── Dashboard Home Tiles (preview variant) ─────────────────────────────────
// Alternate landing view that swaps the yellow Doogie hero + massive listings
// grid for a SaaS-style tile dashboard: live buyer/seller KPIs for Vancouver,
// a Communities pulse strip, a compact Doogie prompt card, the 6 newest CREA
// DDF® listings, and quick tiles to Saved Homes / Virtual Tours. Available
// at `/preview-dashboard` for side-by-side review with the current homepage.
const DashboardHomeTiles = ({ setSection, onAsk }) => {
  const nav = useNavigate();
  const [city, setCity] = useState("Vancouver");
  const insights = useInsights(city);
  const [latest, setLatest] = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const [regions, setRegions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/listings?limit=6&sort=newest`);
        if (r.ok && !cancelled) setLatest(await r.json());
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/communities`);
        const d = await r.json();
        setRegions(d && typeof d === "object" ? d : {});
      } catch { setRegions({}); }
    })();
  }, []);
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem(SAVED_HOMES_KEY) || "[]");
      setSavedCount(list.length);
    } catch {}
  }, []);

  const fmtM = (n) => !n ? "—" : (n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : (n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${Math.round(n).toLocaleString()}`));

  const featuredCommunities = useMemo(() => {
    if (!regions) return [];
    const focus = ["Vancouver","Burnaby","Richmond","Surrey","Coquitlam","Maple Ridge","Squamish","Whistler"];
    const all = Object.entries(regions).flatMap(([region, names]) =>
      (names || []).map(n => ({ name: n, region })));
    const picks = focus
      .map(n => all.find(c => c.name.toLowerCase() === n.toLowerCase()))
      .filter(Boolean);
    return picks.length ? picks : all.slice(0, 8);
  }, [regions]);

  const slugify = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const tile = {
    background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14,
    padding: 18, boxShadow: "0 1px 2px rgba(15,42,91,0.04)",
  };
  const tileHeader = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, gap: 10,
  };
  const tileTitle = {
    fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800, color: C.navy, margin: 0,
  };
  const linkAction = {
    color: C.blue, fontWeight: 700, fontSize: 12, textDecoration: "none",
    display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", background: "none", border: "none", padding: 0,
  };

  const kpi = (label, value, sub) => (
    <div style={{ background: C.mist, borderRadius: 10, padding: 12, flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  const rows = latest?.listings || [];

  return (
    <div data-testid="dash-home-tiles" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Welcome strip */}
      <div style={{ ...tile, display: "grid", gridTemplateColumns: "88px 1fr auto", gap: 18, alignItems: "center", background: "linear-gradient(135deg,#FBF7EE 0%,#FFF6DE 100%)", borderColor: "rgba(245,166,35,0.35)" }}>
        <img src={DOOGIE.head} alt="Doogie" style={{ width: 88, height: 88, objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"}/>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: C.navy, lineHeight: 1.1 }}>
            <span style={{ color: C.green }}>Real estate,</span> <span style={{ color: C.navy }}>made </span><span style={{ color: C.blue }}>EZ to </span><span style={{ color: C.gold }}>Find.ca</span>
          </div>
          <div style={{ fontSize: 13, color: C.ink, marginTop: 6, lineHeight: 1.5, maxWidth: 640 }}>
            Live BC market signals from CREA DDF® — refreshed every 4 hours. General information only, never advice.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button data-testid="dash-home-cta-listings" onClick={() => nav("/listings")} style={{ ...btnPrimary, marginTop: 0 }}><Search size={14}/> Browse listings</button>
          <button data-testid="dash-home-cta-ask" onClick={onAsk} style={{ ...btnGhost, marginTop: 0 }}><MessageCircle size={14}/> Ask Doogie</button>
        </div>
      </div>

      {/* Buyer + Seller side-by-side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={tile} data-testid="dash-home-buyer-tile">
          <div style={tileHeader}>
            <h3 style={tileTitle}>Buyer snapshot · {city}</h3>
            <button style={linkAction} onClick={() => setSection("buyer")}>Full insights →</button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {insights ? (
              <>
                {kpi("Active inventory", (insights.active_count || 0).toLocaleString(), "CREA DDF®")}
                {kpi("Median list", fmtM(insights.median_list_price), `avg ${fmtM(insights.avg_list_price)}`)}
                {kpi("Beds / baths", `${insights.avg_beds ?? "—"} / ${insights.avg_baths ?? "—"}`, "avg. across actives")}
              </>
            ) : <SkeletonGrid/>}
          </div>
        </div>
        <div style={tile} data-testid="dash-home-seller-tile">
          <div style={tileHeader}>
            <h3 style={tileTitle}>Seller snapshot · {city}</h3>
            <button style={linkAction} onClick={() => setSection("seller")}>Full insights →</button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {insights ? (
              <>
                {kpi("Active comps", (insights.active_count || 0).toLocaleString(), "CREA DDF®")}
                {kpi("Avg list", fmtM(insights.avg_list_price), `median ${fmtM(insights.median_list_price)}`)}
                {kpi("Price range", `${fmtM(insights.min_price)}–${fmtM(insights.max_price)}`, "actives")}
              </>
            ) : <SkeletonGrid/>}
          </div>
        </div>
      </div>

      {/* City picker + Communities pulse */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={tile} data-testid="dash-home-city-picker">
          <div style={tileHeader}>
            <h3 style={tileTitle}>Change city</h3>
            <span style={{ fontSize: 11, color: C.muted }}>Powers both snapshots ↑</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Vancouver","Burnaby","Surrey","Richmond","Coquitlam","Maple Ridge","Squamish","Whistler","Kelowna"].map(c => (
              <button
                key={c}
                data-testid={`dash-home-city-${slugify(c)}`}
                onClick={() => setCity(c)}
                style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  cursor: "pointer",
                  background: city === c ? C.blue : "#fff",
                  color: city === c ? "#fff" : C.navy,
                  border: `1px solid ${city === c ? C.blue : "#DDE6FA"}`,
                }}
              >{c}</button>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            Or use the <button style={{ ...linkAction, display: "inline" }} onClick={() => setSection("community")}>Communities</button> section to explore all 240 BC communities.
          </div>
        </div>

        <div style={tile} data-testid="dash-home-communities-tile">
          <div style={tileHeader}>
            <h3 style={tileTitle}>Featured BC communities</h3>
            <button style={linkAction} onClick={() => setSection("community")}>See all 240 →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {featuredCommunities.slice(0, 8).map(c => (
              <Link key={c.name} to={`/community/${slugify(c.name)}`}
                data-testid={`dash-home-community-${slugify(c.name)}`}
                style={{
                  background: C.mist, padding: "10px 12px", borderRadius: 10,
                  textDecoration: "none", color: C.navy, display: "flex",
                  justifyContent: "space-between", alignItems: "center",
                  border: "1px solid #DDE6FA",
                }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{c.region}</div>
                </div>
                <ChevronRight size={14} color={C.blue}/>
              </Link>
            ))}
            {!featuredCommunities.length && <SkeletonGrid/>}
          </div>
        </div>
      </div>

      {/* Latest listings */}
      <div style={tile} data-testid="dash-home-latest-tile">
        <div style={tileHeader}>
          <h3 style={tileTitle}>Newest on CREA DDF®</h3>
          <Link to="/listings" style={linkAction}>Browse all {latest?.total?.toLocaleString?.() || ""} listings →</Link>
        </div>
        {!latest ? <SkeletonGrid/> : rows.length === 0 ? (
          <EmptyBox>No new listings this hour — refresh in a bit.</EmptyBox>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {rows.slice(0, 6).map(l => <ListingCard key={l.listing_key} l={l}/>)}
          </div>
        )}
      </div>

      {/* Quick tiles row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { key: "saved",    label: "Saved Homes",    value: savedCount || "—", sub: "on this device", section: "saved",    icon: Heart },
          { key: "foryou",   label: "For You",        value: "Personal picks",  sub: "based on saves",  section: "foryou",   icon: Sparkles },
          { key: "tours",    label: "Virtual Tours",  value: "3D · Video",      sub: "Matterport / YT", section: "tours",    icon: Video },
          { key: "consult",  label: "Book Doug",       value: "Free intro",      sub: "REALTOR® · BCFSA", section: "consult",  icon: CalendarClock },
        ].map(q => {
          const Ic = q.icon;
          return (
            <button
              key={q.key}
              onClick={() => setSection(q.section)}
              data-testid={`dash-home-quick-${q.key}`}
              style={{
                ...tile, textAlign: "left", cursor: "pointer",
                background: "#fff", display: "flex", flexDirection: "column", gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.blue }}>
                <Ic size={16}/>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.muted }}>{q.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{q.value}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{q.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Doogie prompt bar */}
      <div style={{ ...tile, background: "linear-gradient(135deg, rgba(30,79,207,0.06), rgba(34,197,94,0.06))", borderColor: "rgba(30,79,207,0.25)" }} data-testid="dash-home-doogie-tile">
        <div style={tileHeader}>
          <h3 style={tileTitle}>Ask Doogie</h3>
          <span style={{ fontSize: 11, color: C.muted }}>General info only · never advice</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {["What's the PTT on a $1.2M home?","Explain subject removal","Compare Vancouver vs Burnaby","How does the ALR work?"].map(prompt => (
            <button
              key={prompt}
              onClick={onAsk}
              data-testid={`dash-home-prompt-${slugify(prompt)}`}
              style={{
                background: "#fff", border: "1px solid #DDE6FA", padding: "8px 14px",
                borderRadius: 999, fontSize: 12, fontWeight: 600, color: C.navy, cursor: "pointer",
              }}
            >{prompt}</button>
          ))}
          <button onClick={onAsk} style={{ ...btnPrimary, marginTop: 0, marginLeft: "auto" }} data-testid="dash-home-doogie-open">
            <MessageCircle size={14}/> Open Ask Doogie
          </button>
        </div>
      </div>
    </div>
  );
};

const SearchPanel = () => {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [beds, setBeds] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const run = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: "24", sort: "newest" });
      if (q) p.set("q", q);
      if (city) p.set("city", city);
      if (beds) p.set("beds_min", beds);
      if (priceMax) p.set("price_max", priceMax);
      const r = await fetch(`${API}/listings?${p}`);
      setResults(await r.json());
    } finally { setLoading(false); }
  };
  useEffect(() => { run(); /* first-load, no filters */ /* eslint-disable-next-line */ }, []);
  return (
    <>
      <HeroIntro/>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      {/* Filters */}
      <form onSubmit={run} data-testid="dash-search-form" style={{ background: "#fff", padding: 18, borderRadius: 12, border: "1px solid #E5E7EB", height: "fit-content" }}>
        <h3 style={{ margin: 0, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, color: C.muted }}>Filters</h3>
        <FormField label="Natural language (Doogie parses)">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g. 3 bed condo in kelowna with pool" data-testid="dash-search-q" style={inp}/>
        </FormField>
        <FormField label="City (BC, anywhere)">
          <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Vancouver / Osoyoos / Prince George" data-testid="dash-search-city" style={inp}/>
        </FormField>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FormField label="Beds (min)">
            <input type="number" value={beds} onChange={e=>setBeds(e.target.value)} data-testid="dash-search-beds" style={inp} min="0"/>
          </FormField>
          <FormField label="Max price ($)">
            <input type="number" value={priceMax} onChange={e=>setPriceMax(e.target.value)} placeholder="900000" data-testid="dash-search-price" style={inp} min="0"/>
          </FormField>
        </div>
        <button type="submit" data-testid="dash-search-submit" style={btnPrimary}>
          <Search size={14}/> Search CREA DDF®
        </button>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.4 }}>
          Results are <strong>exact matches only</strong> from the CREA DDF® feed. No substitutions, no interpretation.
        </div>
      </form>

      {/* Results + Map */}
      <div>
        <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: "1px solid #E5E7EB", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ color: C.navy }}>Interactive map</strong>
            <span style={{ fontSize: 11, color: C.muted }}>Live · OpenStreetMap</span>
          </div>
          <iframe
            title="BC listings map"
            src={`https://www.google.com/maps?q=${encodeURIComponent(
              city
                ? `${city}, British Columbia real estate`
                : "Doug LeMaire REALTOR, 22374 Lougheed Hwy, Maple Ridge BC"
            )}&z=${city ? 11 : 14}&output=embed`}
            style={{ width: "100%", height: 260, border: 0, borderRadius: 8 }}
            loading="lazy"
            data-testid="dash-search-map"
          />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, textAlign: "right" }}>
            <a
              href="https://www.google.com/maps?q=Doug+LeMaire+REALTOR,+22374+Lougheed+Hwy,+Maple+Ridge+BC"
              target="_blank" rel="noopener noreferrer"
              style={{ color: C.blue, fontWeight: 700, textDecoration: "none" }}
              data-testid="dash-search-map-open"
            >Open in Maps ↗</a>
          </div>
        </div>
        <ResultsGrid results={results} loading={loading}/>
      </div>
    </div>
    </>
  );
};

const ResultsGrid = ({ results, loading }) => {
  if (loading && !results) return <SkeletonGrid/>;
  const rows = (results?.listings || []);
  if (!rows.length) return <EmptyBox>No exact matches in CREA DDF® right now — try widening a filter.</EmptyBox>;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <strong style={{ color: C.navy }}>{results.total?.toLocaleString?.() || rows.length} listings</strong>
        <span style={{ fontSize: 11, color: C.muted }}>Sorted by newest · CREA DDF®</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {rows.slice(0, 12).map(l => <ListingCard key={l.listing_key} l={l}/>)}
      </div>
    </>
  );
};

const ListingCard = ({ l }) => {
  const price = l.list_price ? `$${Number(l.list_price).toLocaleString()}` : "—";
  const addr = l.unparsed_address || l.street_address || l.address || l.listing_key;
  const cover = (l.photos && l.photos[0]) || (l.Media && l.Media[0]?.MediaURL);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem(SAVED_HOMES_KEY) || "[]");
      setSaved(list.some(h => h.listing_key === l.listing_key));
    } catch {}
  }, [l.listing_key]);
  const toggleSave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const list = JSON.parse(localStorage.getItem(SAVED_HOMES_KEY) || "[]");
      const idx = list.findIndex(h => h.listing_key === l.listing_key);
      if (idx >= 0) {
        list.splice(idx, 1);
        setSaved(false);
      } else {
        list.unshift({
          listing_key: l.listing_key,
          address: addr, city: l.city,
          list_price: l.list_price, beds: l.beds, baths: l.baths,
          property_type: l.property_type, cover, saved_at: new Date().toISOString(),
        });
        setSaved(true);
      }
      localStorage.setItem(SAVED_HOMES_KEY, JSON.stringify(list.slice(0, 100)));
    } catch {}
  };
  return (
    <Link to={`/listings/${l.listing_key}`} data-testid={`dash-listing-${l.listing_key}`} style={{
      background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden",
      textDecoration: "none", color: C.navy, display: "block", transition: "transform 0.15s",
      position: "relative",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <div style={{
        height: 140, background: cover ? `url(${cover}) center/cover` : C.mist,
        position: "relative",
      }}>
        {l.has_virtual_tour && (
          <div style={{
            position: "absolute", left: 8, top: 8, background: "rgba(15,42,91,0.85)",
            color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
          }}><Video size={9} style={{verticalAlign:"-1px"}}/> Virtual tour</div>
        )}
        <button
          type="button"
          onClick={toggleSave}
          data-testid={`dash-listing-save-${l.listing_key}`}
          aria-label={saved ? "Remove from saved homes" : "Save this home"}
          title={saved ? "Saved · click to unsave" : "Save to your dashboard"}
          style={{
            position: "absolute", right: 8, top: 8, width: 32, height: 32,
            borderRadius: "50%", border: "none", cursor: "pointer",
            background: saved ? "#DC2626" : "rgba(255,255,255,0.95)",
            display: "grid", placeItems: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <Heart size={16} color={saved ? "#fff" : C.navy} fill={saved ? "#fff" : "transparent"}/>
        </button>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{price}</div>
        <div style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{addr}</div>
        <div style={{ display: "flex", gap: 8, fontSize: 11, color: C.navy, marginTop: 6, flexWrap: "wrap" }}>
          {l.beds != null && <span>{l.beds}bd</span>}
          {l.baths != null && <span>· {l.baths}ba</span>}
          {l.property_type && <span>· {l.property_type}</span>}
          {l.city && <span>· {l.city}</span>}
        </div>
      </div>
    </Link>
  );
};

// ── Insights Panels ────────────────────────────────────────────────────────
const useInsights = (city) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    setData(null);
    (async () => {
      try {
        const r = await fetch(`${API}/insights?city=${encodeURIComponent(city)}`);
        if (r.ok && !cancelled) setData(await r.json());
      } catch { /* keep null */ }
    })();
    return () => { cancelled = true; };
  }, [city]);
  return data;
};

// 90-day median-list-price history (real daily snapshots)
const useInsightsHistory = (city, propType) => {
  const [series, setSeries] = useState(null);
  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    setSeries(null);
    (async () => {
      try {
        const p = new URLSearchParams({ city, weeks: "12" });
        if (propType) p.set("property_type", propType);
        const r = await fetch(`${API}/insights/history?${p}`);
        if (r.ok && !cancelled) {
          const d = await r.json();
          setSeries(Array.isArray(d.series) ? d.series : []);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [city, propType]);
  return series;
};

// Simple SVG sparkline that gracefully explains itself when there's <2 points
const Sparkline = ({ series }) => {
  if (!series) return <div style={{ height: 60, background: C.mist, borderRadius: 8 }}/>;
  if (series.length < 2) {
    return (
      <div style={{
        height: 60, background: C.mist, borderRadius: 8, display: "flex",
        alignItems: "center", justifyContent: "center", color: C.muted,
        fontSize: 11, fontStyle: "italic", padding: "0 16px", textAlign: "center",
      }}>
        Trend chart populates as new daily snapshots land ({series.length}/12 weeks captured so far).
      </div>
    );
  }
  const vals = series.map(s => s.median_list_price);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const range = Math.max(hi - lo, 1);
  const W = 320, H = 60;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - lo) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = `0,${H} ${pts} ${W},${H}`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="spg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.blue} stopOpacity="0.4"/>
          <stop offset="100%" stopColor={C.blue} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spg)"/>
      <polyline points={pts} fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const BuyerInsightsPanel = () => <InsightsPanel role="buyer"/>;
const SellerInsightsPanel = () => <InsightsPanel role="seller"/>;

const InsightsPanel = ({ role }) => {
  const [city, setCity] = useState("Vancouver");
  const [propType, setPropType] = useState("");
  const data = useInsights(city);
  const history = useInsightsHistory(city, propType);
  const [comps, setComps] = useState(null);
  useEffect(() => {
    if (role !== "seller" || !city) return;
    let cancelled = false;
    setComps(null);
    (async () => {
      try {
        const p = new URLSearchParams({ city, limit: "10", sort: "newest" });
        if (propType) p.set("property_type", propType);
        const r = await fetch(`${API}/listings?${p}`);
        if (!cancelled && r.ok) setComps(await r.json());
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [role, city, propType]);

  const fmtM = (n) => !n ? "—" : (n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : (n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${Math.round(n).toLocaleString()}`));
  const lastUpdated = data?.last_updated
    ? new Date(data.last_updated).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Vancouver" })
    : "";

  const buyerCards = data ? [
    { key: "inv",  label: "Active inventory", value: (data.active_count || 0).toLocaleString(), sub: `${city} · CREA DDF®` },
    { key: "mlp",  label: "Median list price", value: fmtM(data.median_list_price),             sub: `avg ${fmtM(data.avg_list_price)}` },
    { key: "bb",   label: "Avg. beds / baths",  value: `${data.avg_beds ?? "—"} / ${data.avg_baths ?? "—"}`, sub: "across active listings" },
  ] : [];

  const sellerCards = data ? [
    { key: "acp",  label: "Active comps",   value: (data.active_count || 0).toLocaleString(), sub: `${city} · CREA DDF®` },
    { key: "avg",  label: "Avg. list price", value: fmtM(data.avg_list_price),                sub: `median ${fmtM(data.median_list_price)}` },
    { key: "rng",  label: "Price range",     value: `${fmtM(data.min_price)} — ${fmtM(data.max_price)}`, sub: "across active listings" },
  ] : [];

  const cards = role === "buyer" ? buyerCards : sellerCards;
  const propTypeLabel = propType === "Apartment" ? "Condo" : propType;
  const title = role === "buyer"
    ? `Buyer snapshot · ${city}${propTypeLabel ? " · " + propTypeLabel : ""}`
    : `Comparable actives · ${city}${propTypeLabel ? " · " + propTypeLabel : ""}`;

  return (
    <div>
      <PanelIntro
        title={role === "buyer" ? "Buyer Insights" : "Seller Insights"}
        blurb={role === "buyer"
          ? "Live buyer-side market signals from CREA DDF® — inventory, price, and avg. bed/bath counts. Refreshes every 4 hours."
          : "Live comparable actives from CREA DDF® — perfect for a seller planning their list price. General information only, not an opinion of value."
        }
        cityInput={{ city, setCity }}
      />
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Property type</label>
        {[
          { label: "All",       value: "" },
          { label: "House",     value: "House" },
          { label: "Condo",     value: "Apartment" },
          { label: "Townhouse", value: "Townhouse" },
        ].map(t => (
          <button key={t.label} onClick={() => setPropType(t.value)}
            data-testid={`dash-insight-ptype-${t.label.toLowerCase()}`}
            style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              cursor: "pointer",
              background: propType === t.value ? C.blue : "#fff",
              color: propType === t.value ? "#fff" : C.navy,
              border: `1px solid ${propType === t.value ? C.blue : "#DDE6FA"}`,
            }}>{t.label}</button>
        ))}
      </div>

      {!data ? <SkeletonGrid/> : (
        <>
          {/* Snapshot card */}
          <section data-testid={`dash-insights-${role}-snapshot`} style={{
            background: "#fff", border: "1px solid #DDE6FA", borderRadius: 14,
            padding: 20, marginBottom: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <strong style={{ color: C.navy, fontSize: 14 }}>{title}</strong>
              <span style={{
                background: "rgba(34,197,94,0.10)", color: "#166534", border: "1px solid rgba(34,197,94,0.35)",
                fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 999,
                display: "inline-flex", alignItems: "center", gap: 6,
              }} title={lastUpdated}>
                <span style={{ display: "inline-block", width: 7, height: 7, background: "#22C55E", borderRadius: "50%", boxShadow: "0 0 0 3px rgba(34,197,94,0.25)" }}/>
                Source: CREA DDF® · live · updated in the last 4 hours
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {cards.map(c => (
                <div key={c.key} data-testid={`dash-insight-card-${c.key}`} style={{
                  background: C.mist, border: "1px solid #DDE6FA", borderRadius: 12, padding: 16,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, color: C.blue, textTransform: "uppercase" }}>{c.label}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 800, color: C.navy, marginTop: 8, lineHeight: 1.05 }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: C.ink, marginTop: 6 }}>{c.sub}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 6, fontStyle: "italic" }}>Source: CREA DDF® · in the last 4 hours</div>
                </div>
              ))}
            </div>
            {/* 90-day median list price sparkline — real weekly snapshots */}
            <div style={{ marginTop: 20 }} data-testid="dash-insights-sparkline">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: C.blue }}>
                  90-day median list price trend
                </div>
                <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>
                  Real daily snapshots · never a forecast
                </div>
              </div>
              <Sparkline series={history}/>
            </div>
          </section>

          {/* Comps table (Seller) */}
          {role === "seller" && (
            <section data-testid="dash-seller-comps" style={{
              background: "#fff", border: "1px solid #DDE6FA", borderRadius: 14, padding: 20,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                <strong style={{ color: C.navy, fontSize: 14 }}>Active comparables · {city}{propTypeLabel ? " · " + propTypeLabel : ""}</strong>
                <span style={{ color: C.muted, fontSize: 12 }}>Exact matches only from CREA DDF®</span>
              </div>
              {!comps ? <SkeletonGrid/> : (
                comps.listings?.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {comps.listings.slice(0, 8).map(l => (
                      <Link key={l.listing_key} to={`/listings/${l.listing_key}`}
                        data-testid={`dash-seller-comp-${l.listing_key}`}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, alignItems: "center",
                          padding: "12px 14px", background: C.mist, borderRadius: 10, textDecoration: "none",
                          color: C.navy, border: "1px solid transparent",
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = C.blue}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {l.street_address || l.unparsed_address || l.address} · {l.city}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                            {l.beds != null && `${l.beds}bd`}
                            {l.baths != null && ` · ${l.baths}ba`}
                            {l.living_area_sqft && ` · ${Number(l.living_area_sqft).toLocaleString()} sqft`}
                            {l.days_on_market != null && ` · ${l.days_on_market}d on market`}
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, color: C.blue, fontSize: 15 }}>${Number(l.list_price || 0).toLocaleString()}</div>
                        <span style={{
                          background: "rgba(34,197,94,0.12)", color: "#166534",
                          border: "1px solid rgba(34,197,94,0.4)", padding: "3px 10px",
                          borderRadius: 999, fontSize: 11, fontWeight: 700,
                        }}>Active</span>
                      </Link>
                    ))}
                    {comps.total > 8 && (
                      <Link to={`/listings?city=${encodeURIComponent(city)}${propType ? "&property_type=" + encodeURIComponent(propType) : ""}&limit=24&sort=newest`}
                        style={{ color: C.blue, fontWeight: 700, textDecoration: "none", fontSize: 13, marginTop: 6, display: "inline-block" }}
                        data-testid="dash-seller-view-comps">
                        View all {comps.total.toLocaleString()} comparables →
                      </Link>
                    )}
                  </div>
                ) : <EmptyBox>No exact-match comparables right now — widen the property type or try a neighbouring city.</EmptyBox>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};

// ── For You / Saved ────────────────────────────────────────────────────────
const ForYouPanel = () => {
  // For-You feed: exact-match listings whose city matches whatever the buyer
  // saved most recently (from localStorage). If nothing saved, we simply show
  // freshest CREA DDF® actives across BC.
  const [rows, setRows] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const saved = JSON.parse(localStorage.getItem("ez_saved_searches") || "[]");
        const params = new URLSearchParams({ limit: "12", sort: "newest" });
        if (saved.length) params.set("q", saved[0]);
        const r = await fetch(`${API}/listings?${params}`);
        setRows(await r.json());
      } catch { setRows({ listings: [] }); }
    })();
  }, []);
  return (
    <div>
      <PanelIntro title="For You"
        blurb="A live feed drawn from your most recent saved search"/>
      <ResultsGrid results={rows} loading={rows === null}/>
    </div>
  );
};

const SavedPanel = () => {
  const [homes, setHomes] = useState([]);
  const [searches, setSearches] = useState([]);
  const reload = () => {
    try { setHomes(JSON.parse(localStorage.getItem(SAVED_HOMES_KEY) || "[]")); } catch { setHomes([]); }
    try { setSearches(JSON.parse(localStorage.getItem("ez_saved_searches") || "[]")); } catch { setSearches([]); }
  };
  useEffect(() => { reload(); }, []);
  const remove = (key) => {
    try {
      const list = JSON.parse(localStorage.getItem(SAVED_HOMES_KEY) || "[]").filter(h => h.listing_key !== key);
      localStorage.setItem(SAVED_HOMES_KEY, JSON.stringify(list));
      setHomes(list);
    } catch {}
  };
  return (
    <div>
      <PanelIntro title="Saved Homes & Searches" blurb="Tap the ❤ on any listing card to save it here. Search chips you starred on the Visual Agent also live in this dashboard."/>

      <h3 style={{ color: C.navy, marginTop: 24, marginBottom: 10 }}>Saved homes ({homes.length})</h3>
      {homes.length === 0
        ? <EmptyBox>Nothing saved yet — tap the ❤ on any listing card to add it here.</EmptyBox>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {homes.map(h => (
              <div key={h.listing_key} data-testid={`dash-saved-home-${h.listing_key}`} style={{
                background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden", position: "relative",
              }}>
                <div style={{ height: 140, background: h.cover ? `url(${h.cover}) center/cover` : C.mist }}/>
                <button onClick={() => remove(h.listing_key)} title="Remove"
                  style={{ position: "absolute", right: 8, top: 8, width: 30, height: 30, borderRadius: "50%",
                    background: "#DC2626", color: "#fff", border: "none", cursor: "pointer",
                    display: "grid", placeItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
                  data-testid={`dash-saved-remove-${h.listing_key}`}>
                  <X size={14}/>
                </button>
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{h.list_price ? `$${Number(h.list_price).toLocaleString()}` : "—"}</div>
                  <div style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.address}</div>
                  <div style={{ fontSize: 11, color: C.navy, marginTop: 6 }}>
                    {h.beds != null && `${h.beds}bd`}{h.baths != null && ` · ${h.baths}ba`}{h.property_type && ` · ${h.property_type}`}{h.city && ` · ${h.city}`}
                  </div>
                  <Link to={`/listings/${h.listing_key}`} style={{ color: C.blue, fontWeight: 700, textDecoration: "none", fontSize: 12, marginTop: 6, display: "inline-block" }}>View full listing →</Link>
                </div>
              </div>
            ))}
          </div>
      }

      <h3 style={{ color: C.navy, marginTop: 32, marginBottom: 10 }}>Saved searches ({searches.length})</h3>
      {searches.length === 0
        ? <EmptyBox>Star any search from the home page to see it here.</EmptyBox>
        : <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "grid", gap: 10 }}>
            {searches.map(s => (
              <li key={s} style={{ background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>{s}</span>
                <Link to={`/?ask=${encodeURIComponent(s)}`} style={{ color: C.blue, fontWeight: 700, textDecoration: "none", fontSize: 12 }}>Run again →</Link>
              </li>
            ))}
          </ul>
      }
    </div>
  );
};

// ── Communities ────────────────────────────────────────────────────────────
const CommunityPanel = ({ setSection }) => {
  // The `/api/communities` endpoint returns a dict shaped
  //   { "Greater Vancouver": [...names], "Fraser Valley": [...names], ... }
  // so we render each region as a section header with a chip grid underneath.
  const [regions, setRegions] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/communities`);
        const d = await r.json();
        setRegions(d && typeof d === "object" && !Array.isArray(d) ? d : {});
      } catch { setRegions({}); }
    })();
  }, []);
  const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <div>
      <PanelIntro title="Communities" blurb="Every BC community — school scores, transit, walkability, live map, and homes for you."/>
      {regions === null && <SkeletonGrid/>}
      {regions && Object.keys(regions).length === 0 && <EmptyBox>Communities feed is warming up — check back in a moment.</EmptyBox>}
      {regions && Object.entries(regions).map(([region, names]) => (
        <div key={region} data-testid={`dash-community-region-${slugify(region)}`} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
            <h3 style={{ margin: 0, color: C.navy, fontFamily: "'Playfair Display', serif", fontSize: 18 }}>{region}</h3>
            <span style={{ color: C.muted, fontSize: 11 }}>{(names || []).length} communities</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {(names || []).map(name => (
              <Link key={name} to={`/community/${slugify(name)}`}
                data-testid={`dash-community-${slugify(name)}`}
                style={{
                  background: "#fff", padding: "12px 14px", borderRadius: 10, border: "1px solid #E5E7EB",
                  textDecoration: "none", color: C.navy, display: "flex", alignItems: "center", justifyContent: "space-between",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.blue}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E7EB"}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{region}</div>
                </div>
                <ChevronRight size={14} color={C.blue}/>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Glossary ───────────────────────────────────────────────────────────────
const GlossaryPanel = () => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");        // active category filter chip
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);     // total matches before slice
  const abortRef = useRef(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (cat) params.set("category", cat);
        params.set("limit", "500");
        const r = await fetch(`${API}/glossary?${params}`, { signal: ctl.signal });
        const d = await r.json();
        const items = Array.isArray(d) ? d : (d.terms || d.results || []);
        setRows(items);
        setTotal(items.length);
      } catch (e) {
        if (e.name !== "AbortError") { setRows([]); setTotal(0); }
      }
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, cat]);

  const slugify = (t) => (t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Derive top categories from the current result set so users can narrow.
  const catCounts = React.useMemo(() => {
    const m = new Map();
    (rows || []).forEach(t => { const c = t.category || "Other"; m.set(c, (m.get(c) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [rows]);

  // Highlight matched substring (case-insensitive) inside a piece of text.
  const highlight = (text, needle) => {
    if (!needle || !text) return text;
    const idx = text.toLowerCase().indexOf(needle.toLowerCase());
    if (idx === -1) return text;
    return (<>
      {text.slice(0, idx)}
      <mark style={{ background: "#FEF3C7", color: C.navy, padding: "0 2px", borderRadius: 3 }}>
        {text.slice(idx, idx + needle.length)}
      </mark>
      {text.slice(idx + needle.length)}
    </>);
  };

  const shownRows = (rows || []).slice(0, 30);
  const hasQuery = q.trim().length > 0 || !!cat;

  return (
    <div>
      <PanelIntro title="Glossary" blurb="Every term returns only the exact definition stored in our glossary — never invented. BC-specific."/>

      {/* Search input with clear button and inline match counter */}
      <div style={{ position: "relative", maxWidth: 480, marginBottom: 10 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search a term (PTT, subject removal, GST, ALR…)"
          data-testid="dash-glossary-q"
          style={{ ...inp, paddingRight: q ? 34 : 12 }}
        />
        {q && (
          <button
            type="button"
            data-testid="dash-glossary-clear"
            onClick={() => setQ("")}
            aria-label="Clear glossary search"
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              width: 22, height: 22, borderRadius: 999, border: "none", cursor: "pointer",
              background: "#E5E7EB", color: "#374151", fontSize: 14, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        )}
      </div>

      {/* Live match counter + category chips (built from current result set) */}
      {rows !== null && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 12 }}>
          <span data-testid="dash-glossary-count" style={{ fontSize: 12, color: C.ink, fontWeight: 700 }}>
            {hasQuery
              ? `${total} match${total === 1 ? "" : "es"}${total > 30 ? " · showing first 30" : ""}`
              : `${total} terms · showing first 30`}
          </span>
          {cat && (
            <button
              type="button"
              data-testid="dash-glossary-cat-clear"
              onClick={() => setCat("")}
              style={{ background: C.gold, color: C.navy, border: "none", padding: "3px 10px", fontSize: 11, fontWeight: 700, borderRadius: 999, cursor: "pointer" }}
              title="Clear category filter"
            >{cat} ×</button>
          )}
          {!cat && catCounts.length > 1 && catCounts.map(([c, n]) => (
            <button
              key={c}
              type="button"
              data-testid={`dash-glossary-cat-${slugify(c)}`}
              onClick={() => setCat(c)}
              style={{ background: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB", padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 999, cursor: "pointer" }}
              title={`Filter to ${c}`}
            >{c} <span style={{ opacity: 0.6 }}>({n})</span></button>
          ))}
        </div>
      )}

      {rows === null && <SkeletonGrid/>}
      {rows && rows.length === 0 && <EmptyBox>No matching glossary terms. Try a shorter word (e.g. “strata”, “PTT”, “ALR”).</EmptyBox>}
      {rows && rows.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {shownRows.map(t => {
            const term = t.term || t.name || t.title || "";
            const slug = t.slug || slugify(term);
            const def = t.definition || t.summary || t.description || "";
            const preview = def.length > 320 ? def.slice(0, 320) + "…" : def;
            return (
              <div key={slug || term} data-testid={`dash-glossary-${slug}`} style={{
                background: "#fff", padding: 14, borderRadius: 12, border: "1px solid #E5E7EB",
              }}>
                <strong style={{ color: C.navy }}>{highlight(term, q.trim())}</strong>
                {t.category && (
                  <span
                    onClick={() => setCat(t.category)}
                    style={{ marginLeft: 8, fontSize: 10, background: C.mist, padding: "2px 8px", borderRadius: 999, color: C.blue, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, cursor: "pointer" }}
                    title={`Filter to ${t.category}`}
                  >{t.category}</span>
                )}
                <div style={{ fontSize: 13, color: C.ink, marginTop: 4, lineHeight: 1.5 }}>
                  {highlight(preview, q.trim())}
                </div>
                {slug && (
                  <Link to={`/glossary/${slug}`}
                    style={{ color: C.blue, fontWeight: 700, textDecoration: "none", fontSize: 12, marginTop: 6, display: "inline-block" }}>Full entry →</Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Virtual Tours ──────────────────────────────────────────────────────────
const ToursPanel = () => {
  const [tours, setTours] = useState(null);
  const [pick, setPick] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/tours/library?limit=12`);
        const d = await r.json();
        setTours(d.listings || []);
      } catch { setTours([]); }
    })();
  }, []);
  const picked = tours && tours[Math.min(pick, tours.length - 1)];
  return (
    <div>
      <PanelIntro title="Virtual Tours" blurb="Every tour is a real CREA DDF® listing — Matterport, YouTube, or Vimeo only. Autoplays instantly, no in-person scheduling."/>
      {tours === null && <SkeletonGrid/>}
      {tours && tours.length === 0 && <EmptyBox>No matching tours in the feed right now. New tours appear every 4 hours after each DDF sync.</EmptyBox>}
      {picked && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 18 }}>
          <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", height: 460, position: "relative" }}>
            <iframe
              title={`Tour · ${picked.address}`}
              src={picked.tour_url}
              width="100%" height="100%" frameBorder="0"
              allow="autoplay; xr-spatial-tracking; gyroscope; accelerometer; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              data-testid="dash-tour-iframe"
            />
            <a href={picked.tour_url_raw || picked.tour_url} target="_blank" rel="noopener noreferrer"
              style={{
                position: "absolute", right: 10, top: 10, background: "rgba(255,255,255,0.94)",
                color: C.navy, padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                textDecoration: "none", border: `1px solid ${C.blue}`,
              }}>Open ↗</a>
          </div>
          <div style={{ background: "#fff", padding: 14, borderRadius: 12, border: "1px solid #E5E7EB" }}>
            <div style={{ fontWeight: 800, color: C.navy }}>{picked.address}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{picked.city} · {picked.property_type}</div>
            {picked.list_price && <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>${Number(picked.list_price).toLocaleString()}</div>}
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
              {picked.beds}bd · {picked.baths}ba · {picked.tour_host}
            </div>
            <Link to={`/listings/${picked.listing_key}`} style={btnPrimary} data-testid="dash-tour-full-listing">View full listing →</Link>
            <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>All tours ({tours.length})</div>
            <div style={{ maxHeight: 240, overflowY: "auto", marginTop: 6, display: "grid", gap: 4 }}>
              {tours.map((t, i) => (
                <button key={t.listing_key} onClick={() => setPick(i)} style={{
                  padding: "6px 8px", background: i === pick ? "rgba(30,79,207,0.08)" : "transparent",
                  border: "none", borderRadius: 6, textAlign: "left", cursor: "pointer", fontSize: 11, color: C.navy,
                }}>{t.city} · {(t.address || "").slice(0, 30)}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Consultation Request (compliance-critical) ─────────────────────────────
const ConsultPanel = () => {
  const [step, setStep] = useState("realtor_check");
  const [role, setRole] = useState(null);  // buyer | seller
  const [city, setCity] = useState("");
  const [outsideArea, setOutsideArea] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pref, setPref] = useState("Email");
  const [time, setTime] = useState("Any");
  const [casl, setCasl] = useState(false);
  const [pipa, setPipa] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const detectServiceArea = (c) => {
    const clean = (c || "").toLowerCase().trim();
    setOutsideArea(clean.length > 0 && !DOUG_SERVICE_AREAS.has(clean));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!casl || !pipa) { alert("Please agree to CASL & PIPA consents before submitting."); return; }
    try {
      const body = {
        role: role || "buyer", name, email, phone,
        preferred_contact: pref, preferred_time: time,
        city, casl_consent: casl, pipa_ack: pipa,
        is_referral: outsideArea,
      };
      const r = await fetch(`${API}/consultation/request`, {
        method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body),
      });
      const data = await r.json();
      setSubmitted(r.ok && data.success ? "sent" : (data?.detail || "queued"));
    } catch { setSubmitted("queued"); }
  };

  if (submitted) {
    return <div style={panelBase}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "12px 0 8px" }}>
        <img src={DOOGIE.celebrating} alt="Doogie celebrating"
          data-testid="dash-consult-success-doogie"
          style={{ width: 200, height: "auto", marginBottom: 12, filter: "drop-shadow(0 6px 18px rgba(15,42,91,0.2))" }}/>
        <h2 style={{ color: C.navy, margin: 0 }}>Consultation request received!</h2>
        <p style={{ color: C.muted, maxWidth: 520, lineHeight: 1.5, marginTop: 10 }}>
          Doug will personally follow up within one business day.
          You'll receive a confirmation email shortly (with an easy-unsubscribe footer — that's CASL by design).
        </p>
        <button onClick={() => { setStep("realtor_check"); setSubmitted(null); }} style={btnGhost}>Start another request</button>
      </div>
    </div>;
  }

  if (step === "realtor_check") return (
    <div style={panelBase}>
      <h2 style={{ color: C.navy, marginTop: 0 }}>Consultation Request</h2>
      <p style={{ color: C.muted, maxWidth: 640, lineHeight: 1.5 }}>
        Before we proceed, one important compliance question required by the <strong>CREA Code of Ethics</strong>:
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 20, alignItems: "center", maxWidth: 780, marginTop: 16 }}>
        <img src={DOOGIE.pointingLeft} alt="Doogie pointing"
          data-testid="dash-realtor-gate-doogie"
          style={{ width: "100%", maxWidth: 160, height: "auto", filter: "drop-shadow(0 6px 16px rgba(15,42,91,0.18))" }}/>
        <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", padding: 20, borderRadius: 12 }}>
          <strong style={{ fontSize: 16 }}>Are you currently working with a REALTOR®?</strong>
          <div style={{ fontSize: 12, color: "#78350F", marginTop: 6, lineHeight: 1.4 }}>
            The CREA Code of Ethics prevents us from interfering with an existing client relationship. Your honest answer here keeps everyone on the right side of the rules.
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            <button data-testid="dash-realtor-yes" onClick={() => setStep("declined")} style={{...btnPrimary, background: "#DC2626", justifyContent: "center", flex: 1}}>Yes — I'm working with one</button>
            <button data-testid="dash-realtor-no" onClick={() => setStep("intent")} style={{...btnPrimary, background: C.green, justifyContent: "center", flex: 1}}>No</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (step === "declined") return (
    <div style={panelBase}>
      <h2 style={{ color: C.navy, marginTop: 0 }}>Respectfully — we can't proceed.</h2>
      <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", padding: 20, borderRadius: 12, maxWidth: 640, lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>
          If you're currently working with a REALTOR® under a signed representation agreement, that REALTOR® is the right person to bring this question to — they know your file and they're contracted to advise you on it. We won't step into that. If you're not under an agreement, or yours has ended, we're happy to help.
        </p>
        <p style={{ marginBottom: 0, marginTop: 12, fontSize: 13, color: "#7F1D1D" }}>
          You're always welcome to ask Doogie <strong>general information</strong> questions — that never counts as advice or representation.
        </p>
      </div>
      <button onClick={() => setStep("realtor_check")} style={{...btnGhost, marginTop: 16}}>← Back</button>
    </div>
  );

  if (step === "intent") return (
    <div style={panelBase}>
      <h2 style={{ color: C.navy, marginTop: 0 }}>How can Doug help?</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 640, marginTop: 12 }}>
        <button data-testid="dash-intent-buyer" onClick={() => { setRole("buyer"); setStep("area"); }} style={{...intentCard, borderColor: C.blue}}>
          <HomeIcon size={26} color={C.blue}/><div style={{ fontWeight: 800, marginTop: 6 }}>I'm buying</div>
          <div style={{ fontSize: 12, color: C.muted }}>Guidance on offers, financing prep, and area picks.</div>
        </button>
        <button data-testid="dash-intent-seller" onClick={() => { setRole("seller"); setStep("area"); }} style={{...intentCard, borderColor: C.gold}}>
          <Building2 size={26} color={C.gold}/><div style={{ fontWeight: 800, marginTop: 6 }}>I'm selling</div>
          <div style={{ fontSize: 12, color: C.muted }}>Market analysis, pricing strategy, and listing plan.</div>
        </button>
      </div>
    </div>
  );

  if (step === "area") return (
    <div style={panelBase}>
      <h2 style={{ color: C.navy, marginTop: 0 }}>Which BC community?</h2>
      <p style={{ color: C.muted, maxWidth: 640 }}>
        Doug serves Greater Vancouver, the Fraser Valley, and the Sea-to-Sky Corridor.
        Anywhere else in BC — we'll connect you to a licensed local REALTOR® instead.
      </p>
      <input value={city} onChange={e => { setCity(e.target.value); detectServiceArea(e.target.value); }} placeholder="Vancouver / Whistler / Kelowna / Prince Rupert…" data-testid="dash-area-city" style={{...inp, maxWidth: 640}}/>
      {outsideArea && (
        <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", padding: 16, borderRadius: 12, maxWidth: 640, marginTop: 14 }}>
          <strong>OUTSIDE DOUG'S SERVICE AREA</strong>
          <p style={{ margin: "8px 0", fontSize: 13, lineHeight: 1.5 }}>{city.charAt(0).toUpperCase()+city.slice(1)} is beyond Doug's BCFSA-licensed service area. We can't ethically represent you there, but we can refer you to a trusted licensed REALTOR® in that community.</p>
          <button data-testid="dash-request-referral" onClick={() => setStep("intake")} style={{...btnPrimary, background: C.gold, color: C.navy}}>Request a Referral REALTOR® in {city}</button>
        </div>
      )}
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button onClick={() => setStep("intent")} style={btnGhost}>← Back</button>
        <button disabled={!city} onClick={() => setStep("intake")} style={{...btnPrimary, opacity: city ? 1 : 0.5}} data-testid="dash-area-next">Continue →</button>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} style={{...panelBase, maxWidth: 720}}>
      <h2 style={{ color: C.navy, marginTop: 0 }}>{outsideArea ? "Referral request" : `${role === "buyer" ? "Buyer" : "Seller"} intake`}</h2>
      <div style={{ background: C.mist, border: `1px solid ${C.blue}`, borderRadius: 8, padding: 12, fontSize: 12, color: C.navy, marginBottom: 16 }}>
        <ShieldCheck size={13} style={{verticalAlign:"-2px",marginRight:4,color:C.blue}}/>
        <strong>PIPA notice:</strong> We collect only the info required to reply to your request. You can request access, correction, or deletion anytime. We never sell or share your data.
      </div>
      <FormField label="Full name*"><input required value={name} onChange={e=>setName(e.target.value)} data-testid="dash-intake-name" style={inp}/></FormField>
      <FormField label="Email*"><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} data-testid="dash-intake-email" style={inp}/></FormField>
      <FormField label="Phone"><input value={phone} onChange={e=>setPhone(e.target.value)} data-testid="dash-intake-phone" style={inp}/></FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormField label="Preferred contact"><select value={pref} onChange={e=>setPref(e.target.value)} style={inp}><option>Email</option><option>Phone</option><option>Text</option></select></FormField>
        <FormField label="Preferred time"><select value={time} onChange={e=>setTime(e.target.value)} style={inp}><option>Any</option><option>Weekday mornings</option><option>Weekday afternoons</option><option>Evenings</option><option>Weekends</option></select></FormField>
      </div>
      <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
        <label style={consent}><input type="checkbox" checked={casl} onChange={e=>setCasl(e.target.checked)} data-testid="dash-consent-casl"/> <span><strong>CASL consent</strong> — I agree to receive follow-up emails from EZtoFind.ca. I can unsubscribe with one click, anytime.</span></label>
        <label style={consent}><input type="checkbox" checked={pipa} onChange={e=>setPipa(e.target.checked)} data-testid="dash-consent-pipa"/> <span><strong>PIPA acknowledgement</strong> — I understand my personal information is collected for the sole purpose of responding to this consultation request.</span></label>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button type="button" onClick={() => setStep("area")} style={btnGhost}>← Back</button>
        <button type="submit" style={btnPrimary} data-testid="dash-intake-submit">Send request</button>
      </div>
    </form>
  );
};

// ── Ask Doogie Drawer ──────────────────────────────────────────────────────
const AskDoogieDrawer = ({ open, onClose }) => {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  // Persistent session id so Doogie can carry context across turns
  const [sessionId] = useState(() => {
    try {
      const cached = localStorage.getItem("ez_doogie_session");
      if (cached) return cached;
      const id = "sess-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("ez_doogie_session", id);
      return id;
    } catch { return "sess-" + Date.now(); }
  });
  const send = async () => {
    if (!q.trim() || busy) return;
    const question = q.trim();
    setHistory(h => [...h, { role: "user", text: question }, { role: "doogie", text: "" }]);
    setQ(""); setBusy(true);
    try {
      const res = await fetch(`${API}/doogie/chat`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ session_id: sessionId, message: question, language: "en" }),
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            if (typeof j.delta === "string") {
              acc += j.delta;
              setHistory(h => {
                const copy = [...h];
                copy[copy.length - 1] = { role: "doogie", text: acc };
                return copy;
              });
            } else if (typeof j.error === "string") {
              acc += `\n\n⚠️ ${j.error}`;
              setHistory(h => {
                const copy = [...h];
                copy[copy.length - 1] = { role: "doogie", text: acc };
                return copy;
              });
            }
          } catch {}
        }
      }
      if (!acc) {
        setHistory(h => {
          const copy = [...h];
          copy[copy.length - 1] = { role: "doogie", text: "I couldn't reach my brain just now — try again in a moment." };
          return copy;
        });
      }
    } catch {
      setHistory(h => {
        const copy = [...h];
        copy[copy.length - 1] = { role: "doogie", text: "Hmm, connection blip. Try again in a moment." };
        return copy;
      });
    } finally { setBusy(false); }
  };
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} data-testid="dash-ask-drawer" style={{
        width: 420, maxWidth: "100vw", background: "#fff", height: "100%",
        display: "flex", flexDirection: "column", boxShadow: "-10px 0 40px rgba(0,0,0,0.2)",
      }}>
        <div style={{ padding: 16, borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: C.navy }}>🐾 Ask Doogie</strong>
            <div style={{ fontSize: 11, color: C.muted }}>General information only, never advice</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }} data-testid="dash-ask-close"><X size={18}/></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {history.length === 0 && (
            <div style={{ background: C.mist, padding: 16, borderRadius: 10, fontSize: 13, color: C.navy, display: "flex", alignItems: "center", gap: 14 }}>
              <img src={DOOGIE.thinking} alt="Doogie thinking"
                data-testid="dash-ask-welcome-doogie"
                style={{ width: 84, height: 84, flexShrink: 0, filter: "drop-shadow(0 3px 8px rgba(15,42,91,0.15))" }}/>
              <div style={{ lineHeight: 1.5 }}>
                Ask me anything about BC real estate — glossary terms, communities, market snapshots. I only surface what's in our verified sources — never invent an answer.
              </div>
            </div>
          )}
          {history.map((m, i) => (
            <div key={i} style={{
              padding: "10px 12px", borderRadius: 10, maxWidth: "88%",
              background: m.role === "user" ? C.blue : "#F1F5F9",
              color: m.role === "user" ? "#fff" : C.navy,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap",
            }}>{m.text}</div>
          ))}
          {busy && <div style={{ color: C.muted, fontStyle: "italic" }}>Doogie is thinking…</div>}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid #E5E7EB", display: "flex", gap: 8 }}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="e.g. What's the PTT on a $900K purchase?" data-testid="dash-ask-input" style={inp}/>
          <button onClick={send} disabled={busy || !q.trim()} style={{...btnPrimary, opacity: busy || !q.trim() ? 0.5 : 1}} data-testid="dash-ask-send"><Send size={14}/></button>
        </div>
      </div>
    </div>
  );
};

// ── Compliance footer ──────────────────────────────────────────────────────
const ComplianceFooter = () => (
  <footer data-testid="dash-compliance-footer" style={{
    background: C.navy, color: "#fff", padding: "18px 32px", fontSize: 11, lineHeight: 1.6,
  }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24, opacity: 0.9 }}>
      <div>
        <strong style={{ color: C.gold }}>BCFSA Licensing</strong><br/>
        Doug LeMaire, REALTOR®<br/>
        Fraser Property Management Realty Services Ltd.
      </div>
      <div>
        <strong style={{ color: C.gold }}>CREA Compliance</strong><br/>
        MLS® data licensed from CREA DDF®.<br/>
        Exact matches only — never substitutions.
      </div>
      <div>
        <strong style={{ color: C.gold }}>CASL Compliance</strong><br/>
        Consent-gated. One-click unsubscribe.<br/>
        <Link to="/privacy" style={{ color: "#fff", textDecoration: "underline" }}>Privacy policy</Link>
      </div>
      <div>
        <strong style={{ color: C.gold }}>PIPA (BC)</strong><br/>
        Personal data collected for stated purpose only.<br/>
        <Link to="/terms" style={{ color: "#fff", textDecoration: "underline" }}>Terms</Link>
      </div>
    </div>
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.15)", opacity: 0.85 }}>
      Doogie provides general information only — never advice. Real estate services are provided exclusively by Doug LeMaire, REALTOR®, BCFSA-licensed.
    </div>
  </footer>
);

// ── Small helpers ──────────────────────────────────────────────────────────
const PanelIntro = ({ title, blurb, cityInput }) => (
  <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: "0 0 4px", color: C.navy }}>{title}</h2>
      <p style={{ color: C.muted, margin: 0, fontSize: 13, lineHeight: 1.5 }}>{blurb}</p>
    </div>
    {cityInput && (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.muted, letterSpacing: 0.5 }}>City</label>
        <input value={cityInput.city} onChange={e => cityInput.setCity(e.target.value)}
          data-testid="dash-insights-city"
          style={{...inp, width: 200}} placeholder="Kelowna / Whistler …"/>
      </div>
    )}
  </div>
);

const FormField = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
    <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.muted, letterSpacing: 0.5 }}>{label}</label>
    {children}
  </div>
);

const EmptyBox = ({ children }) => (
  <div style={{
    background: "#fff", border: "1px dashed #DDE6FA", padding: 24, borderRadius: 12,
    color: C.muted, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 20,
    flexWrap: "wrap",
  }}>
    <img src={DOOGIE.thinking} alt="Doogie thinking"
      data-testid="dash-empty-doogie"
      style={{ width: 96, height: 96, flexShrink: 0, filter: "drop-shadow(0 3px 8px rgba(15,42,91,0.12))" }}/>
    <div style={{ maxWidth: 480, textAlign: "left", lineHeight: 1.5 }}>{children}</div>
  </div>
);

const SkeletonGrid = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
    {[1,2,3,4,5,6].map(i => (
      <div key={i} style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #E5E7EB", height: 140,
        backgroundImage: "linear-gradient(90deg, #fff 0%, #F5F5F5 50%, #fff 100%)", backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}/>
    ))}
    <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
  </div>
);

// Styles
const inp = { padding: "8px 12px", borderRadius: 8, border: "1px solid #DDE6FA", fontSize: 13, fontFamily: "inherit", width: "100%", background: "#fff", color: C.navy };
const btnPrimary = { background: C.blue, color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "center", textDecoration: "none", marginTop: 12 };
const btnGhost = { background: "transparent", color: C.blue, border: `1px solid ${C.blue}`, padding: "9px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13, marginTop: 12 };
const panelBase = { background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #E5E7EB" };
const intentCard = { padding: 20, borderRadius: 12, background: "#fff", border: "2px solid #DDE6FA", cursor: "pointer", textAlign: "left" };
const consent = { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: C.navy, lineHeight: 1.4, cursor: "pointer" };
