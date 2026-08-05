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
import React, { useEffect, useMemo, useRef, useState, useContext, createContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IMG, WhereShouldYouLive, Calculators } from "../App";
import DoogieTour from "../components/DoogieTour";
import { DoogieVoiceToggle, DoogieSpeedSlider, DoogieTalkingStyle, useDoogieMuted } from "../components/voicePref";
import {
  Search, Heart, BarChart3, TrendingUp, MapPin, BookOpen, Video,
  CalendarClock, MessageCircle, ShieldCheck, Star, Home as HomeIcon,
  Mic, Send, ChevronRight, ExternalLink, X, Sparkles, Building2,
  Plane, DollarSign, Box, Play,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
// Doogie mascot library (all transparent PNGs served from /public/doogie/)
const DOOGIE = {
  laptop:       "/doogie/laptop.png",         // hero on Search panel
  celebrating:  "/doogie/celebrating.png",    // success screens
  thinking:     "/doogie/thinking.webp",      // empty states / Ask drawer welcome
  pointingLeft: "/doogie/pointing_left.png",  // form guidance / REALTOR® gate
  pointingRight:"/doogie/pointing_right.png", // CTA nudges
  head:         "/doogie/head.webp",          // avatar / toast / admin table row
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
  // Exact brand colors sampled from the EZtoFind-Sign-Letter-Centred logo PDF.
  // Use these for the wordmark specifically (not for general UI accents).
  brandBlue: "#0A3D99", brandGold: "#F9BD00", brandGreen: "#2F6B38",
};

const SECTIONS = [
  { key: "home",      label: "Home",           icon: HomeIcon, hideWhen: "search" },
  { key: "search",    label: "Search",         icon: Search },
  { key: "foryou",    label: "For You",        icon: Sparkles },
  { key: "saved",     label: "Saved Homes",    icon: Heart },
  { key: "buyer",     label: "Buyer Insights", icon: BarChart3 },
  { key: "seller",    label: "Seller Insights",icon: TrendingUp },
  { key: "value",     label: "Home Value",     icon: DollarSign, href: "/valuation" },
  { key: "community", label: "Communities",    icon: MapPin },
  { key: "glossary",  label: "Glossary",       icon: BookOpen },
  { key: "relocating",label: "Relocating",     icon: Plane, href: "/relocating" },
  { key: "consult",   label: "Consultation",   icon: CalendarClock },
  { key: "ask",       label: "Ask Doogie",     icon: MessageCircle },
];

// ── Hero (introduces Doogie + BCFSA context) ──────────────────────────────
const HeroIntro = () => (
  <section data-testid="dash-hero" className="dash-hero-section" style={{
    background: "linear-gradient(135deg,#FBF7EE 0%,#FFF6DE 100%)",
    border: "1px solid rgba(245,166,35,0.35)", borderRadius: 14,
    padding: "22px 24px", marginBottom: 22, display: "grid",
    gridTemplateColumns: "440px 1fr", gap: 22, alignItems: "center",
  }}>
    <picture>
      <source srcSet="/doogie/laptop.webp" type="image/webp"/>
      <img src={DOOGIE_LAPTOP_URL} alt="Doogie — EZtoFind.ca real estate helper"
        data-testid="dash-hero-doogie"
        className="dash-hero-doogie"
        width={900} height={600}
        fetchpriority="high"
        loading="eager"
        decoding="async"
        style={{
          width: "100%", maxWidth: 440, height: "auto", aspectRatio: "3/2",
          filter: "drop-shadow(0 8px 24px rgba(15,42,91,0.25))",
        }}
        onError={e => { e.currentTarget.style.display = "none"; }}
      />
    </picture>
    <div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif", margin: 0, lineHeight: 1.08,
        fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: 800,
      }}>
        <span style={{ color: C.brandGreen }}>Real estate,</span><br/>
        <span style={{ color: C.brandGreen }}>made </span><span style={{ color: C.brandBlue }}>EZ to Find</span><span style={{ color: C.brandGold }}>.ca</span>
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

// Search filter context — lifts filter state up so the Sidebar can host the
// FILTERS form (below "Ask Doogie") while the main content area shows the
// map + results driven by the same state.
const SearchFiltersContext = createContext(null);

// ── useIsMobile — tiny viewport-width hook. Debounced via matchMedia.
const useIsMobile = (breakpoint = 900) => {
  const [isMobile, setIsMobile] = useState(() => {
    try { return window.matchMedia(`(max-width: ${breakpoint}px)`).matches; }
    catch { return false; }
  });
  useEffect(() => {
    try {
      const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
      const onChange = (e) => setIsMobile(e.matches);
      mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
      return () => {
        mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange);
      };
    } catch {}
  }, [breakpoint]);
  return isMobile;
};

export default function DashboardMockup({ homeVariant = "search" }) {
  const isMobile = useIsMobile(900);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Landing section depends on the variant: the tile view (`home`) is the
  // default on the /-mounted "dashboard" variant, while the map+listings
  // search view is the default on any legacy /-search mounts.
  const [section, setSection] = useState(homeVariant === "dashboard" ? "home" : "search");
  const [askOpen, setAskOpen] = useState(false);
  // Section changes on mobile → close the drawer so the panel is visible.
  const gotoSection = (s) => { setSection(s); if (isMobile) setSidebarOpen(false); };
  // Lifted search state (previously local to SearchPanel). Enables the
  // FILTERS form to live in the Sidebar while map + results render in main.
  const [filters, setFilters] = useState({ q: "", city: "", beds: "", baths: "", priceMin: "", priceMax: "", propertyType: "", keyword: "", sort: "newest" });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sync, setSync] = useState(null);         // Content Sync Engine payload
  const [syncLoading, setSyncLoading] = useState(false);
  // Free-text query (voice transcript or filter keyword) used to seed the
  // Content Synchronization Engine. Voice-filter writes this from the
  // transcript so buyer/seller intent is detected even before filters apply.
  const [syncQuery, setSyncQuery] = useState("");
  const runSearch = async () => {
    setLoading(true);
    setSyncLoading(true);
    try {
      const p = new URLSearchParams({ limit: "24", sort: filters.sort || "newest" });
      if (filters.q) p.set("q", filters.q);
      if (filters.city) p.set("city", filters.city);
      if (filters.beds) p.set("beds_min", filters.beds);
      if (filters.baths) p.set("baths_min", filters.baths);
      if (filters.priceMin) p.set("price_min", filters.priceMin);
      if (filters.priceMax) p.set("price_max", filters.priceMax);
      if (filters.propertyType) p.set("property_type", filters.propertyType);
      if (filters.keyword) p.set("features", filters.keyword);
      // Fire the listings + Content Sync Engine in parallel so the visitor
      // sees market insights + buyer/seller resources appear at the same
      // moment as the property cards.
      const propMap = { detached: "House", condo: "Condo", townhouse: "Townhouse", acreage: "Acreage", land: "Land" };
      const syncBody = {
        query: (syncQuery || filters.q || filters.keyword || filters.city || "").trim(),
        filter: {
          community: filters.city || null,
          property_type: propMap[filters.propertyType] || null,
          min_beds: filters.beds ? Number(filters.beds) : null,
          min_baths: filters.baths ? Number(filters.baths) : null,
          min_price: filters.priceMin ? Number(filters.priceMin) : null,
          max_price: filters.priceMax ? Number(filters.priceMax) : null,
          keyword: filters.keyword || null,
        },
        limit: 6,
      };
      const [listResp, syncResp] = await Promise.allSettled([
        fetch(`${API}/listings?${p}`).then(r => r.json()),
        fetch(`${API}/doogie/sync-search`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(syncBody),
        }).then(r => r.ok ? r.json() : null),
      ]);
      if (listResp.status === "fulfilled") setResults(listResp.value);
      if (syncResp.status === "fulfilled") setSync(syncResp.value);
    } finally {
      setLoading(false);
      setSyncLoading(false);
    }
  };
  // First-load fetch (no filters).
  useEffect(() => { runSearch(); /* eslint-disable-next-line */ }, []);
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
    <SearchFiltersContext.Provider value={{ filters, setFilters, results, loading, runSearch, sync, syncLoading, setSyncQuery }}>
    <div data-testid="dashboard-mockup" style={{
      minHeight: "100vh",
      display: isMobile ? "block" : "grid",
      gridTemplateColumns: isMobile ? undefined : "260px 1fr",
      background: C.cream, color: C.navy,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Sidebar — slides in from the left on mobile, fixed rail on desktop */}
      {isMobile ? (
        <>
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              data-testid="dash-sidebar-scrim"
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 500 }}
            />
          )}
          <div style={{
            position: "fixed", top: 0, left: 0, bottom: 0, width: 280, zIndex: 501,
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.24s ease-out",
            overflowY: "auto",
          }}>
            <Sidebar section={section} setSection={gotoSection} onAsk={() => { setAskOpen(true); setSidebarOpen(false); }} homeVariant={homeVariant}/>
          </div>
        </>
      ) : (
        <Sidebar section={section} setSection={setSection} onAsk={() => setAskOpen(true)} homeVariant={homeVariant}/>
      )}
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <HomeComplianceBanner/>
        <DashboardBackHomeBar/>
        {isMobile && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px", background: C.navy, color: "#fff",
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              data-testid="dash-sidebar-toggle"
              aria-label="Open menu"
              style={{
                background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff", padding: "8px 14px", borderRadius: 999, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13,
              }}
            >☰ Menu</button>
            <span style={{ fontWeight: 800, fontFamily: "'Playfair Display', serif", fontSize: 16 }}>EZtoFind.ca</span>
          </div>
        )}
        <TopBar section={section} homeVariant={homeVariant}/>
        <main style={{ padding: isMobile ? "16px" : "24px 32px", flex: 1, overflowX: "hidden" }}>
          <Panel section={section} setSection={setSection} homeVariant={homeVariant} onAsk={() => setAskOpen(true)}/>
          {(section === "search" || section === "home") && <HomeExtras/>}
        </main>
        <ComplianceFooter/>
      </div>
      <AskDoogieDrawer open={askOpen} onClose={() => setAskOpen(false)}/>
      {showToast && <FirstVisitToast onDismiss={dismissToast} setSection={setSection}/>}
      {/* Doogie's guided site tour — auto-plays on first visit, then becomes
          a "Take the Doogie tour" replay pill in the bottom-right. */}
      <DoogieTour/>
      {/* Shared "talking bounce" keyframes for every Doogie mascot */}
      <DoogieTalkingStyle/>
    </div>
    </SearchFiltersContext.Provider>
  );
}

// ── First-visit sidebar toast — one-time onboarding hint ──────────────────
const FirstVisitToast = ({ onDismiss, setSection }) => {
  // Responsive positioning — on desktop the toast sits beside the 260-px
  // sidebar (left: 274). On mobile the sidebar is hidden behind a hamburger
  // and the fixed 360-px card was overflowing the right edge on iPhone /
  // Android narrow viewports. Anchor to both edges on narrow screens.
  const [viewW, setViewW] = useState(typeof window === "undefined" ? 1200 : window.innerWidth);
  useEffect(() => {
    const onResize = () => setViewW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isNarrow = viewW < 900;
  const pos = isNarrow
    ? { left: 8, right: 8, bottom: 16, maxWidth: "none", width: "auto" }
    : { left: 274, bottom: 24, maxWidth: 360 };
  return (
  <div
    data-testid="dash-first-visit-toast"
    style={{
      position: "fixed", zIndex: 60,
      background: "#fff", border: "2px solid " + C.gold, borderRadius: 14,
      padding: isNarrow ? "12px 12px 12px 12px" : "14px 16px 14px 14px",
      boxShadow: "0 12px 32px rgba(15,42,91,0.28)",
      display: "flex", gap: isNarrow ? 10 : 14, alignItems: "flex-start",
      animation: "toast-slide 0.35s cubic-bezier(0.16,1,0.3,1)",
      ...pos,
    }}
  >
    <img src={DOOGIE.head} alt="Doogie welcomes you"
      data-testid="dash-first-visit-doogie"
      style={{
        width: isNarrow ? 56 : 72, height: isNarrow ? 56 : 72, flexShrink: 0, objectFit: "contain",
        filter: "drop-shadow(0 3px 8px rgba(15,42,91,0.15))",
      }}/>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: C.navy, marginBottom: 4 }}>
        Woof! I'm Doogie 🐾
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: C.ink }}>
        Tap any of the <strong>11 sections</strong> in the sidebar — I'll show you real BC listings, live market signals, community pages and glossary terms. Ask me anything anytime with the chat bubble in the sidebar.
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
};

// ── Sidebar ────────────────────────────────────────────────────────────────
const Sidebar = ({ section, setSection, onAsk, homeVariant }) => {
  const navHook = useNavigate();
  // Hide any nav item whose `hideWhen` matches the active homeVariant. The
  // "Home" tile-dashboard section is only relevant when homeVariant="dashboard";
  // on the search variant the SearchPanel already IS the landing view.
  const items = SECTIONS.filter(s => s.hideWhen !== homeVariant);
  return (
  <aside style={{
    background: C.navy, color: "#fff", padding: "20px 14px", position: "sticky", top: 0,
    height: "100vh", overflowY: "auto", boxShadow: "2px 0 20px rgba(15,42,91,0.15)",
  }} data-testid="dash-sidebar">
    <Link to="/about" data-testid="dash-brand" style={{
      textDecoration: "none", display: "block",
      padding: "0 0 20px", borderBottom: "1px solid rgba(255,255,255,0.12)", marginBottom: 14,
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: "10px 12px",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        <img
          src="/doug-headshot.jpg"
          alt="Doug LeMaire — REALTOR®"
          data-testid="dash-brand-headshot"
          style={{
            width: 46, height: 46, borderRadius: "50%", objectFit: "cover",
            objectPosition: "center top", flexShrink: 0,
            border: `2px solid ${C.brandGold}`,
          }}
          onError={e => { e.currentTarget.style.display = "none"; }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
            <span style={{ color: C.brandBlue }}>EZ to Find</span><span style={{ color: C.brandGold }}>.ca</span>
          </div>
          <div style={{ fontSize: 10, color: C.navy, marginTop: 4, fontWeight: 700, lineHeight: 1.2 }}>Doug LeMaire · REALTOR®</div>
          <div style={{ fontSize: 9, color: C.muted, marginTop: 2, lineHeight: 1.2 }}>Fraser Property Management Realty Services Ltd</div>
        </div>
      </div>
    </Link>
    <nav style={{ display: "grid", gap: 4 }}>
      {items.map(s => {
        const Icon = s.icon;
        const active = section === s.key;
        return (
          <button
            key={s.key}
            onClick={() => {
              if (s.href) return navHook(s.href);
              if (s.key === "ask") return onAsk();
              setSection(s.key);
            }}
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
    {/* SidebarFilters used to live here — moved to a sticky column beside
        the listings grid inside <SearchPanel/> for a more spacious layout. */}
  </aside>
  );
};

// ── Sidebar Filters — the FILTERS card lives inside the sidebar, directly
// below the "Ask Doogie" nav row, and only appears on the Search view. Uses
// the shared SearchFiltersContext so both this form and the main-area map +
// results panel are driven by the same state.
const SidebarFilters = () => {
  const ctx = useContext(SearchFiltersContext);
  if (!ctx) return null;
  const { filters, setFilters, runSearch, loading } = ctx;
  const set = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));
  // Currency helpers — display "$1,000,000" while typing; store raw digits.
  const digitsOnly = (s) => String(s || "").replace(/[^\d]/g, "");
  const formatMoney = (raw) => {
    const d = digitsOnly(raw);
    if (!d) return "";
    return "$" + Number(d).toLocaleString("en-CA");
  };
  const onPriceChange = (e) => set("priceMax", digitsOnly(e.target.value));
  const onPriceMinChange = (e) => set("priceMin", digitsOnly(e.target.value));
  const applyFilters = (e) => {
    // Belt-and-braces submit handler — Edge sometimes drops the implicit
    // form-submit on <button type="submit"> inside a position:fixed
    // container. Bind the click too, cancel default, and scroll the user
    // to the listings so they can see the update land.
    if (e && e.preventDefault) e.preventDefault();
    runSearch();
    setTimeout(() => {
      const el = document.querySelector('[data-testid^="dash-listing-"]') ||
                 document.querySelector('[data-testid="dash-map"]');
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  };
  // Compact card matching the redesigned filter (Community/City, Property
  // Type, Min beds + Min baths, Max price, Keyword, Sort, Apply). Same
  // shared SearchFiltersContext so results grid + map stay in sync.
  const sInp = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #D1D5DB",
    background: "#fff", color: "#0F172A",
    fontSize: 13, fontWeight: 500, outline: "none",
    boxSizing: "border-box",
  };
  const sSel = { ...sInp, appearance: "auto", cursor: "pointer" };
  const sLabel = {
    fontSize: 12, fontWeight: 700, color: "#0F172A",
    display: "block", marginBottom: 4, marginTop: 12,
  };
  return (
    <form onSubmit={applyFilters} data-testid="dash-search-form"
      style={{
        marginTop: 18, padding: 20,
        background: "#fff", borderRadius: 14,
        border: "1px solid #E5E7EB",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        color: C.navy,
      }}>
      <div style={{
        fontSize: 13, fontWeight: 800, letterSpacing: 1.2,
        color: C.brandBlue, textTransform: "uppercase", marginBottom: 4,
      }}>Filter Listings</div>
      <label style={sLabel} htmlFor="dash-f-city">Community / City</label>
      <input
        id="dash-f-city"
        value={filters.city}
        onChange={e => set("city", e.target.value)}
        placeholder="Type any BC community"
        data-testid="dash-search-city"
        style={sInp}
      />
      <label style={sLabel} htmlFor="dash-f-ptype">Property Type</label>
      <select
        id="dash-f-ptype"
        value={filters.propertyType}
        onChange={e => set("propertyType", e.target.value)}
        data-testid="dash-search-property-type"
        style={sSel}
      >
        <option value="">Any</option>
        <option value="House">House</option>
        <option value="Apartment">Condo / Apartment</option>
        <option value="Row / Townhouse">Townhouse</option>
        <option value="Duplex">Duplex</option>
        <option value="Manufactured Home">Manufactured Home</option>
        <option value="Single Family">Single Family</option>
        <option value="Vacant Land">Vacant Land</option>
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={sLabel} htmlFor="dash-f-beds">Min beds</label>
          <select
            id="dash-f-beds"
            value={filters.beds}
            onChange={e => set("beds", e.target.value)}
            data-testid="dash-search-beds"
            style={sSel}
          >
            <option value="">Any</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <div>
          <label style={sLabel} htmlFor="dash-f-baths">Min baths</label>
          <select
            id="dash-f-baths"
            value={filters.baths}
            onChange={e => set("baths", e.target.value)}
            data-testid="dash-search-baths"
            style={sSel}
          >
            <option value="">Any</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
      </div>
      <label style={sLabel} htmlFor="dash-f-price-min">Minimum price ($)</label>
      <input
        id="dash-f-price-min"
        type="text"
        inputMode="numeric"
        value={formatMoney(filters.priceMin)}
        onChange={onPriceMinChange}
        placeholder="$ Any"
        data-testid="dash-search-price-min"
        style={sInp}
      />
      <label style={sLabel} htmlFor="dash-f-price">Maximum price ($)</label>
      <input
        id="dash-f-price"
        type="text"
        inputMode="numeric"
        value={formatMoney(filters.priceMax)}
        onChange={onPriceChange}
        placeholder="$ Any"
        data-testid="dash-search-price"
        style={sInp}
      />
      <label style={sLabel} htmlFor="dash-f-keyword">Keyword</label>
      <input
        id="dash-f-keyword"
        value={filters.keyword}
        onChange={e => set("keyword", e.target.value)}
        placeholder="e.g. suite, waterfront"
        data-testid="dash-search-keyword"
        style={sInp}
      />
      <label style={sLabel} htmlFor="dash-f-sort">Sort by</label>
      <select
        id="dash-f-sort"
        value={filters.sort}
        onChange={e => set("sort", e.target.value)}
        data-testid="dash-search-sort"
        style={sSel}
      >
        <option value="newest">Newest first</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </select>
      <button
        type="submit"
        onClick={applyFilters}
        disabled={loading}
        data-testid="dash-search-submit"
        style={{
          width: "100%", marginTop: 18, padding: "12px 16px", borderRadius: 999,
          background: loading ? "#8AA0CC" : C.brandBlue, color: "#fff", border: "none",
          fontWeight: 800, fontSize: 14, cursor: loading ? "wait" : "pointer",
          boxShadow: "0 4px 12px rgba(30,79,207,0.35)",
        }}
      >
        {loading ? "Applying…" : "Apply Filters"}
      </button>
    </form>
  );
};

// ── Floating draggable FILTERS card ────────────────────────────────────────
// User can drag it by the header grip to reposition anywhere on the page.
// Position persists in localStorage so it stays where they left it. On mobile
// (<900px) it degrades to a static block at the top of the results area.
const FLOATING_POS_KEY = "ez_floating_filters_pos_v4";
const FLOATING_DEFAULT = { x: 24, y: 320 };
const FloatingFilters = () => {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
  const ctx = useContext(SearchFiltersContext);
  const [voiceState, setVoiceState] = useState("idle"); // idle | listening | thinking
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // Start / stop the mic. On stop → POST to /api/doogie/voice-filter,
  // pipe the returned filter dict into SearchFiltersContext, then trigger runSearch().
  const stopVoice = () => {
    try { mediaRef.current?.stop(); } catch {}
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
  };
  const startVoice = async () => {
    setVoiceError("");
    setVoiceTranscript("");
    if (!navigator?.mediaDevices?.getUserMedia) {
      setVoiceError("Mic not supported in this browser — please type your filter.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        setVoiceState("thinking");
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const form = new FormData();
        form.append("audio", blob, "voice.webm");
        form.append("language", "en");
        try {
          const backendUrl = process.env.REACT_APP_BACKEND_URL;
          const resp = await fetch(`${backendUrl}/api/doogie/voice-filter`, { method: "POST", body: form });
          const body = await resp.json();
          if (!resp.ok) throw new Error(body.detail || "Voice filter failed");
          setVoiceTranscript(body.transcript || "");
          const f = body.filter || {};
          // Map Claude's structured output onto SearchFiltersContext.filters shape.
          const normCity = body.community_normalized?.community || f.community || "";
          const propMap = { House: "detached", Condo: "condo", Townhouse: "townhouse", Acreage: "acreage", Land: "land" };
          // Feed the transcript into the Content Sync Engine so intent
          // detection (buy vs. sell) picks up the visitor's actual words,
          // not just the filter dict.
          try { ctx.setSyncQuery?.(body.transcript || ""); } catch {}
          if (ctx?.setFilters) {
            ctx.setFilters(prev => ({
              ...prev,
              city: normCity || prev.city,
              propertyType: propMap[f.property_type] || prev.propertyType,
              beds: f.min_beds != null ? String(f.min_beds) : prev.beds,
              baths: f.min_baths != null ? String(f.min_baths) : prev.baths,
              priceMin: f.min_price != null ? String(f.min_price) : prev.priceMin,
              priceMax: f.max_price != null ? String(f.max_price) : prev.priceMax,
              keyword: f.keyword || prev.keyword,
            }));
            setTimeout(() => { try { ctx.runSearch?.(); } catch {} }, 100);
          }
          setVoiceState("idle");
        } catch (err) {
          setVoiceError(String(err.message || err));
          setVoiceState("idle");
        }
      };
      mediaRef.current = rec;
      rec.start();
      setVoiceState("listening");
    } catch (e) {
      setVoiceError("Mic permission denied — enable it in your browser settings.");
      setVoiceState("idle");
    }
  };

  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return FLOATING_DEFAULT;
    try {
      const saved = JSON.parse(localStorage.getItem(FLOATING_POS_KEY) || "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
    } catch { /* ignore */ }
    return FLOATING_DEFAULT;
  });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const nx = Math.max(8, Math.min(window.innerWidth - 280, clientX - dragRef.current.dx));
      const ny = Math.max(8, Math.min(window.innerHeight - 80, clientY - dragRef.current.dy));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      setDragging(false);
      try { localStorage.setItem(FLOATING_POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, pos]);

  const startDrag = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { dx: clientX - rect.left, dy: clientY - rect.top };
    setDragging(true);
    e.preventDefault();
  };

  const resetPos = () => {
    // Clamp default so the card + Apply button always fit in the current
    // viewport (short laptops with viewport height ~640-800 were clipping
    // the Apply Filters button, making the filter unusable). Keep the card
    // at least 40px from top and ensure the bottom edge stays inside the
    // viewport minus a 60px safe area.
    const cardHeight = 640; // approx full-form height incl. drag header
    const maxY = Math.max(60, window.innerHeight - cardHeight - 20);
    const y = Math.min(FLOATING_DEFAULT.y, maxY);
    const next = { ...FLOATING_DEFAULT, y };
    setPos(next);
    try { localStorage.setItem(FLOATING_POS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  // On mount, if the saved/default y would push the Apply button below the
  // fold, re-clamp it. This runs once per session and only when the current
  // pos.y is too low for the viewport.
  useEffect(() => {
    const cardHeight = 640;
    const maxY = Math.max(60, window.innerHeight - cardHeight - 20);
    if (pos.y > maxY) {
      setPos(prev => ({ ...prev, y: maxY }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isMobile) {
    return (
      <div style={{ marginTop: 16 }} data-testid="floating-filters-mobile">
        <SidebarFilters/>
      </div>
    );
  }

  return (
    <div
      data-testid="floating-filters"
      style={{
        position: "fixed", left: pos.x, top: pos.y, zIndex: 400,
        width: 260, userSelect: dragging ? "none" : "auto",
        cursor: dragging ? "grabbing" : "default",
        filter: dragging ? "drop-shadow(0 12px 24px rgba(15,42,91,0.35))" : "drop-shadow(0 6px 16px rgba(15,42,91,0.20))",
        transition: dragging ? "none" : "filter 0.18s",
        // Never let the card grow past the viewport — on short laptops
        // (viewport height ~640-800) the Apply button was getting clipped.
        // Cap max-height and enable internal scroll as a safety net so
        // Apply Filters is always reachable regardless of screen size.
        maxHeight: `calc(100vh - ${pos.y + 20}px)`,
        display: "flex", flexDirection: "column",
      }}
    >
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        data-testid="floating-filters-handle"
        style={{
          cursor: "grab",
          background: C.navy, color: "#fff",
          padding: "6px 10px",
          borderTopLeftRadius: 12, borderTopRightRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 10.5, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase",
          borderBottom: `2px solid ${C.brandGold}`,
        }}
        title="Drag to move the filters"
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden="true" style={{ display: "inline-flex", gap: 2 }}>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff", opacity: 0.9 }}/>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff", opacity: 0.9 }}/>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff", opacity: 0.9 }}/>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff", opacity: 0.9 }}/>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff", opacity: 0.9 }}/>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff", opacity: 0.9 }}/>
          </span>
          Drag filter here
        </span>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            onClick={voiceState === "listening" ? stopVoice : startVoice}
            data-testid="floating-filters-voice"
            title={voiceState === "listening" ? "Stop listening" : "Ask Doogie by voice"}
            style={{
              background: voiceState === "listening" ? "#DC2626" : C.brandGold,
              color: voiceState === "listening" ? "#fff" : C.navy,
              border: "none", borderRadius: 999, padding: "2px 8px",
              fontSize: 9, fontWeight: 800, cursor: "pointer",
              letterSpacing: 0.5, textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: 3,
            }}
          >
            {voiceState === "listening" ? "● Rec" : "🎤 Doogie"}
          </button>
          <button
            type="button"
            onClick={resetPos}
            data-testid="floating-filters-reset"
            title="Reset filter card to default position"
            style={{
              background: "transparent", color: C.brandGold, border: "1px solid rgba(249,189,0,0.5)",
              borderRadius: 999, padding: "1px 7px", fontSize: 9, fontWeight: 800, cursor: "pointer",
              letterSpacing: 0.5, textTransform: "uppercase",
            }}
          >Reset</button>
        </span>
      </div>
      <div style={{
        background: "#fff",
        borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
        overflow: "hidden",
        flex: "1 1 auto", minHeight: 0,      // allow flexbox to shrink
        display: "flex", flexDirection: "column",
      }}>
        {/* SidebarFilters already renders its own white card + shadow; wrap so
            the drag header attaches flush on top. Inner wrapper scrolls when
            the viewport is too short to show the whole form — Apply button
            stays reachable via touchpad / trackpad scroll.
            When Doogie is listening/thinking, we swap the body for a small
            navy takeover with a live-recording indicator + transcript preview.
            The filter card's outer dimensions never change. */}
        {voiceState === "idle" && (
          <div style={{ margin: "-18px 0 0", overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
            <SidebarFilters/>
            {voiceTranscript && (
              <div data-testid="voice-last-heard" style={{padding:"8px 12px",fontSize:11,color:C.navy,background:C.mist,borderTop:`1px solid ${C.brandGold}`}}>
                🐕 Doogie heard: <em>"{voiceTranscript}"</em>
              </div>
            )}
            {voiceError && (
              <div data-testid="voice-error" style={{padding:"8px 12px",fontSize:11,color:"#DC2626",background:"#FEE2E2"}}>
                {voiceError}
              </div>
            )}
          </div>
        )}
        {voiceState === "listening" && (
          <div data-testid="voice-listening" style={{background:"linear-gradient(160deg,#1a3a6f,"+C.navy+")",color:"#fff",padding:"18px 14px 16px",textAlign:"center",minHeight:260}}>
            <div style={{width:74,height:74,borderRadius:"50%",background:C.brandGold,margin:"4px auto 10px",display:"grid",placeItems:"center",boxShadow:"0 0 0 6px rgba(245,166,35,0.22),0 0 0 14px rgba(245,166,35,0.11)",overflow:"hidden",animation:"doogie-pulse 1.5s ease-in-out infinite"}}>
              <img src="/doogie/celebrating.webp" alt="Doogie" style={{width:"105%",height:"105%",objectFit:"cover"}} onError={(e)=>{e.currentTarget.style.display="none"}}/>
            </div>
            <div style={{fontFamily:"Playfair Display, Georgia, serif",fontWeight:800,fontSize:16,marginBottom:4}}>I'm all ears!</div>
            <div style={{fontSize:11,opacity:0.78,marginBottom:10,lineHeight:1.4,padding:"0 6px"}}>
              Location, beds, price, features — I'll fill it all in.
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:3,height:22,alignItems:"center",marginBottom:12}}>
              {[6,14,20,16,22,12,18,8].map((h,i)=>(
                <span key={i} style={{display:"block",width:3,height:h,background:C.brandGold,borderRadius:2,animation:`doogie-bar 1s ease-in-out ${i*0.08}s infinite`}}/>
              ))}
            </div>
            <button type="button" onClick={stopVoice} data-testid="voice-stop" style={{background:"#DC2626",color:"#fff",border:"none",padding:"7px 16px",borderRadius:999,fontWeight:800,fontSize:11,letterSpacing:0.5,cursor:"pointer",width:"100%"}}>■ SEND TO DOOGIE</button>
            <style>{`@keyframes doogie-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes doogie-bar{0%,100%{transform:scaleY(0.5)}50%{transform:scaleY(1.2)}}`}</style>
          </div>
        )}
        {voiceState === "thinking" && (
          <div data-testid="voice-thinking" style={{background:C.mist,padding:"18px 14px",textAlign:"center",minHeight:180}}>
            <div style={{fontSize:32,marginBottom:6}}>🐾</div>
            <div style={{fontFamily:"Playfair Display, Georgia, serif",color:C.navy,fontWeight:800,fontSize:15,marginBottom:6}}>Doogie is thinking…</div>
            <div style={{fontSize:11,color:C.muted}}>Transcribing + searching CREA DDF®</div>
          </div>
        )}
      </div>
    </div>
  );
};

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
      background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "16px 20px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      gap: 12, flexWrap: "wrap",
    }}>
      <div style={{ minWidth: 0, flex: "1 1 200px" }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 20, margin: 0, color: C.navy,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }} data-testid="dash-section-title">{title}</h1>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <DoogieVoiceToggle/>
        <DoogieSpeedSlider/>
        <div style={{
          background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.35)",
          padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#166534",
          whiteSpace: "nowrap",
        }}><CheckDot/> Live CREA DDF® · 4h</div>
      </div>
    </header>
  );
};
const CheckDot = () => <span style={{ display: "inline-block", width: 7, height: 7, background: "#22C55E", borderRadius: "50%", marginRight: 6 }}/>;

// ── Panel Router ───────────────────────────────────────────────────────────
const Panel = ({ section, setSection, homeVariant, onAsk }) => {
  switch (section) {
    case "home":      return <DashboardHomeTiles setSection={setSection} onAsk={onAsk}/>;
    case "search":    return <SearchPanel/>;
    case "foryou":    return <ForYouPanel/>;
    case "saved":     return <SavedPanel/>;
    case "buyer":     return <BuyerInsightsPanel/>;
    case "seller":    return <SellerInsightsPanel/>;
    case "community": return <CommunityPanel setSection={setSection}/>;
    case "glossary":  return <GlossaryPanel/>;
    case "consult":   return <ConsultPanel/>;
    default: return null;
  }
};

// ── Search Panel ───────────────────────────────────────────────────────────
// ── CityAutocomplete — free-text input over the full 240-community BC set.
//   Types like Kamloops, Nanaimo, Fernie, Prince Rupert, Ucluelet — anything
//   Doogie's CREA DDF feed knows about. Suggests up to 8 matches; Enter or
//   click picks a city and refires the buyer/seller snapshot queries.
const CityAutocomplete = ({ regions, value, onPick }) => {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);
  useEffect(() => { setQ(value || ""); }, [value]);
  useEffect(() => {
    const handler = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setFocused(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const allCities = useMemo(() => {
    if (!regions) return [];
    const seen = new Set();
    const out = [];
    Object.entries(regions).forEach(([region, names]) => {
      (names || []).forEach(n => { if (!seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); out.push({ name: n, region }); } });
    });
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [regions]);
  const trimmed = q.trim().toLowerCase();
  // Exact case-insensitive match against the full BC city list. When present,
  // Enter/Blur can commit it directly even if the dropdown shows no other
  // starts-with matches (fixes: typing the full city name — e.g. "Salmon Arm"
  // — used to leave the previous city selected because suggestions was empty).
  const exactMatch = useMemo(() => {
    if (!trimmed) return null;
    return allCities.find(c => c.name.toLowerCase() === trimmed) || null;
  }, [allCities, trimmed]);
  const suggestions = useMemo(() => {
    if (!trimmed) return [];
    const starts = [], contains = [];
    for (const c of allCities) {
      const lc = c.name.toLowerCase();
      if (lc === trimmed) continue;
      if (lc.startsWith(trimmed)) starts.push(c);
      else if (lc.includes(trimmed)) contains.push(c);
      if (starts.length + contains.length >= 40) break;
    }
    return [...starts, ...contains].slice(0, 8);
  }, [allCities, trimmed]);
  const commit = (name) => { setQ(name); onPick(name); setFocused(false); };
  const onKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length) commit(suggestions[hi].name);
      else if (exactMatch) commit(exactMatch.name);
      return;
    }
    if (e.key === "Escape") { setFocused(false); return; }
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((hi + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((hi - 1 + suggestions.length) % suggestions.length); }
  };
  const onBlur = () => {
    // Auto-commit an exact typed city when the user tabs/clicks away without
    // pressing Enter. Skips if the typed text already matches the committed
    // value (avoids fighting the useEffect that mirrors `value` → `q`).
    if (exactMatch && exactMatch.name.toLowerCase() !== (value || "").toLowerCase()) {
      commit(exactMatch.name);
    }
  };
  return (
    <div ref={boxRef} style={{ position: "relative", maxWidth: 380 }}>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setFocused(true); setHi(0); }}
        onFocus={() => setFocused(true)}
        onBlur={onBlur}
        onKeyDown={onKey}
        placeholder="Type any BC city (Kamloops, Nanaimo, Fernie…)"
        data-testid="dash-home-city-input"
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 10,
          border: `1px solid ${focused ? C.brandBlue : "#DDE6FA"}`,
          fontSize: 13, color: C.navy, fontWeight: 600, background: "#fff",
          outline: "none",
        }}
      />
      {focused && suggestions.length > 0 && (
        <div data-testid="dash-home-city-suggestions" style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
          background: "#fff", border: "1px solid #DDE6FA", borderRadius: 10,
          boxShadow: "0 6px 20px rgba(15,42,91,0.12)", overflow: "hidden",
        }}>
          {suggestions.map((s, i) => (
            <div
              key={s.name}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); commit(s.name); }}
              data-testid={`dash-home-city-sugg-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              style={{
                padding: "8px 12px", cursor: "pointer",
                background: hi === i ? "#F0F4FB" : "#fff",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 12.5, color: C.navy,
              }}
            >
              <span style={{ fontWeight: 700 }}>{s.name}</span>
              <span style={{ fontSize: 10, color: C.muted }}>{s.region}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
        Currently showing:
        <span style={{ background: C.brandBlue, color: "#fff", padding: "2px 10px", borderRadius: 999, fontWeight: 700, fontSize: 11 }}>{value || "—"}</span>
      </div>
    </div>
  );
};


// ── Dashboard Home Tiles (preview variant) ─────────────────────────────────
// Alternate landing view that swaps the yellow Doogie hero + massive listings
// grid for a SaaS-style tile dashboard: live buyer/seller KPIs for Vancouver,
// a Communities pulse strip, a compact Doogie prompt card, the 6 newest CREA
// DDF® listings, and quick tiles to Saved Homes / Communities. Available
// at `/preview-dashboard` for side-by-side review with the current homepage.
const DashboardHomeTiles = ({ setSection, onAsk }) => {
  const nav = useNavigate();
  const [city, setCity] = useState("Vancouver");
  const [propType, setPropType] = useState("");
  const insights = useInsights(city, propType);
  const history = useInsightsHistory(city, propType);
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
      <div style={{ ...tile, padding: "4px 16px", display: "grid", gridTemplateColumns: "380px 1fr auto", gap: 6, alignItems: "center", background: "linear-gradient(135deg,#FBF7EE 0%,#FFF6DE 100%)", borderColor: "rgba(245,166,35,0.35)" }}>
        <img src={DOOGIE.head} alt="Doogie" style={{ width: 380, height: 380, objectFit: "contain", display: "block", margin: 0 }} onError={e => e.currentTarget.style.display = "none"}/>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 800, color: C.navy, lineHeight: 1.05 }}>
            <span style={{ color: C.brandGreen }}>Real estate,</span> <span style={{ color: C.brandGreen }}>made </span><span style={{ color: C.brandBlue }}>EZ to Find</span><span style={{ color: C.brandGold }}>.ca</span>
          </div>
          <div style={{ fontSize: 16, color: C.ink, marginTop: 8, lineHeight: 1.45, maxWidth: 720 }}>
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
            <h3 style={tileTitle}>Buyer snapshot · {city}{propType ? " · " + propType : ""}</h3>
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
          {/* 90-day median list price sparkline (same source as Buyer Insights) */}
          <div style={{ marginTop: 14 }} data-testid="dash-home-buyer-sparkline">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, flexWrap: "wrap", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: C.blue }}>90-day median list price trend</span>
              <TrendCaption history={history}/>
            </div>
            <Sparkline series={history}/>
            <TrendSourceLine history={history}/>
          </div>
        </div>
        <div style={tile} data-testid="dash-home-seller-tile">
          <div style={tileHeader}>
            <h3 style={tileTitle}>Seller snapshot · {city}{propType ? " · " + propType : ""}</h3>
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
          <div style={{ marginTop: 14 }} data-testid="dash-home-seller-sparkline">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, flexWrap: "wrap", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: C.blue }}>90-day median list price trend</span>
              <TrendCaption history={history}/>
            </div>
            <Sparkline series={history}/>
            <TrendSourceLine history={history}/>
          </div>
        </div>
      </div>

      {/* Doug's Specialties — Luxury / Equestrian */}
      <div style={tile} data-testid="dash-home-specialties">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <Link to="/specialties/luxury"
            data-testid="dash-home-specialty-luxury"
            style={{
              position: "relative", borderRadius: 10, overflow: "hidden",
              minHeight: 190, textDecoration: "none", color: "#fff",
              backgroundImage: "url(/specialties/luxury.png)",
              backgroundSize: "cover", backgroundPosition: "center",
              display: "flex", flexDirection: "column", justifyContent: "flex-end",
              padding: 0,
            }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, rgba(15,42,91,0.05) 0%, rgba(15,42,91,0.75) 75%, rgba(15,42,91,0.90) 100%)",
            }}/>
            <div style={{ position: "relative", padding: "16px 18px 18px" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>Luxury Real Estate</div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4, lineHeight: 1.4 }}>Waterfront estates, mountain chalets, custom acreages</div>
            </div>
          </Link>
          <Link to="/specialties/equestrian"
            data-testid="dash-home-specialty-equestrian"
            style={{
              position: "relative", borderRadius: 10, overflow: "hidden",
              minHeight: 190, textDecoration: "none", color: "#fff",
              backgroundImage: "url(/specialties/equestrian.png)",
              backgroundSize: "cover", backgroundPosition: "center",
              display: "flex", flexDirection: "column", justifyContent: "flex-end",
              padding: 0,
            }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, rgba(15,42,91,0.05) 0%, rgba(15,42,91,0.75) 75%, rgba(15,42,91,0.90) 100%)",
            }}/>
            <div style={{ position: "relative", padding: "16px 18px 18px" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>Equestrian & Acreage</div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4, lineHeight: 1.4 }}>Horse properties, hobby farms</div>
            </div>
          </Link>
        </div>
      </div>

      {/* City picker + Communities pulse */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={tile} data-testid="dash-home-city-picker">
          <div style={tileHeader}>
            <h3 style={tileTitle}>Filter snapshots</h3>
            <span style={{ fontSize: 11, color: C.muted }}>Powers both snapshots ↑</span>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>City <span style={{ opacity: 0.6, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>· any BC community</span></div>
          <CityAutocomplete regions={regions} value={city} onPick={setCity}/>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 14, marginBottom: 6 }}>Property type</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "All",        value: "" },
              { label: "Detached",   value: "Detached" },
              { label: "Condo",      value: "Condo" },
              { label: "Townhouse",  value: "Townhouse" },
            ].map(t => (
              <button
                key={t.label}
                data-testid={`dash-home-ptype-${t.label.toLowerCase()}`}
                onClick={() => setPropType(t.value)}
                style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  cursor: "pointer",
                  background: propType === t.value ? C.blue : "#fff",
                  color: propType === t.value ? "#fff" : C.navy,
                  border: `1px solid ${propType === t.value ? C.blue : "#DDE6FA"}`,
                }}
              >{t.label}</button>
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
          { key: "community",label: "Communities",    value: "Explore BC",      sub: "240+ cities",     section: "community",icon: MapPin },
          { key: "consult",  label: "Consultation",   value: "No Charge Consultation", sub: "REALTOR® · BCFSA", section: "consult",  icon: CalendarClock },
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

// ── ListingsMap — interactive Leaflet map that (a) defaults to Doug LeMaire's
//   Maple Ridge business address when no city filter is active, (b) recenters
//   to the searched city, and (c) drops a price-tag marker for every listing
//   returned by the CREA DDF® query that has valid lat/lon. Click a marker
//   → opens the listing detail in a new tab.
const DOUG_ADDRESS = { lat: 49.2124, lon: -122.5946, label: "Doug LeMaire · Maple Ridge" };

const _leafletCssInjected = { current: false };
const ensureLeafletCss = () => {
  if (_leafletCssInjected.current || typeof document === "undefined") return;
  if (!document.querySelector('link[href*="leaflet"]')) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(l);
  }
  _leafletCssInjected.current = true;
};

const ListingsMap = ({ city, listings, hoveredKey, onHoverKey, focusKey }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markerByKeyRef = useRef({});   // listing_key → Leaflet marker
  const centerCacheRef = useRef({});

  useEffect(() => {
    ensureLeafletCss();
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapContainerRef.current) return;
      if (mapRef.current) return; // already initialized
      const map = L.map(mapContainerRef.current, {
        center: [DOUG_ADDRESS.lat, DOUG_ADDRESS.lon],
        zoom: 12, scrollWheelZoom: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      L.marker([DOUG_ADDRESS.lat, DOUG_ADDRESS.lon], {
        title: DOUG_ADDRESS.label,
      }).addTo(map).bindPopup(`<strong>${DOUG_ADDRESS.label}</strong><br/><em>Doug LeMaire · REALTOR®</em>`);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    })();
    return () => { cancelled = true; };
  }, []);

  // Recenter on city change. Priority order (fixed 2026-08-04 — previously
  // used listing lat/lon FIRST, which meant a stale/wrong listing left over
  // from a previous city search would strand the map on the wrong region;
  // typing "Osoyoos" could recentre on Vancouver Island because the first
  // stale listing happened to be there):
  //   1. Cached geocode for this exact city string
  //   2. Nominatim geocode (authoritative — city name wins over stale pins)
  //   3. Listing lat/lon from a listing whose city actually matches
  //   4. Doug's default coords
  useEffect(() => {
    (async () => {
      const map = mapRef.current;
      if (!map) return;
      if (!city) {
        map.setView([DOUG_ADDRESS.lat, DOUG_ADDRESS.lon], 12);
        return;
      }
      const key = city.toLowerCase().trim();
      let center = centerCacheRef.current[key];
      if (!center) {
        // Authoritative source: Nominatim geocode for the exact city name
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", British Columbia, Canada")}&format=json&limit=1`);
          const j = await r.json();
          if (j && j.length) center = { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon), zoom: 12 };
        } catch { /* fall through */ }
      }
      if (!center) {
        // Last-resort fallback: use lat/lon from a listing whose `city` field
        // actually matches the searched city (case-insensitive). Never use
        // a stale unrelated listing — that was the Osoyoos → Vancouver Island bug.
        const hit = (listings || []).find(l => l.lat && l.lon && l.city && l.city.toLowerCase().trim() === key);
        if (hit) center = { lat: hit.lat, lon: hit.lon, zoom: 12 };
      }
      if (center) {
        centerCacheRef.current[key] = center;
        map.setView([center.lat, center.lon], center.zoom || 12);
      } else {
        // Geocode failed and no matching listing — fall back to Doug's coords
        // rather than leaving the map stranded on the previous city.
        map.setView([DOUG_ADDRESS.lat, DOUG_ADDRESS.lon], 8);
      }
    })();
  }, [city, listings]);

  // Redraw listing markers whenever listings change
  useEffect(() => {
    (async () => {
      const map = mapRef.current;
      const layer = markersLayerRef.current;
      if (!map || !layer) return;
      const L = (await import("leaflet")).default;
      layer.clearLayers();
      markerByKeyRef.current = {};
      const pts = (listings || []).filter(l => l.lat && l.lon);
      if (!pts.length) return;
      const priceIcon = (price, active) => L.divIcon({
        className: "eztofind-price-marker" + (active ? " is-active" : ""),
        html: `<div style="background:${active ? C.gold : C.brandBlue};color:${active ? C.navy : "#fff"};border:2px solid #fff;border-radius:14px;padding:${active ? "5px 12px" : "3px 8px"};font-weight:800;font-size:${active ? "13px" : "11px"};box-shadow:0 ${active ? 6 : 2}px ${active ? 14 : 6}px rgba(0,0,0,${active ? 0.5 : 0.35});white-space:nowrap;font-family:Inter,system-ui,sans-serif;transform:${active ? "scale(1.15)" : "none"};transition:transform 0.15s;">${fmtPrice(price)}</div>`,
        iconSize: active ? [90, 32] : [70, 24],
        iconAnchor: active ? [45, 16] : [35, 12],
      });
      pts.forEach(l => {
        const m = L.marker([l.lat, l.lon], { icon: priceIcon(l.list_price, false), riseOnHover: true })
          .addTo(layer)
          .bindPopup(
            `<div style="min-width:180px;font-family:Inter,system-ui,sans-serif;font-size:12px;">
              <div style="font-weight:800;color:#0F2A5B;font-size:13px;">${fmtPrice(l.list_price)}</div>
              <div style="color:#374151;margin-top:2px;">${(l.unparsed_address || "").replace(/</g, "")}</div>
              <div style="color:#6B7280;margin-top:2px;">${l.beds || "—"}bd · ${l.baths || "—"}ba · ${l.property_type || ""}</div>
              ${l.realtor_ca_url
                ? `<a href="${l.realtor_ca_url}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;color:#0A3D99;font-weight:700;">View on realtor.ca ↗</a>`
                : ""}
             </div>`
          );
        // Wire marker → listing-card hover so cards below highlight when
        // pointing at the pin, mirroring the card → pin direction.
        if (onHoverKey) {
          m.on("mouseover", () => onHoverKey(l.listing_key));
          m.on("mouseout",  () => onHoverKey(null));
        }
        m._listPrice = l.list_price;
        markerByKeyRef.current[l.listing_key] = m;
      });
      // Fit to markers (but don't override too aggressively — cap zoom)
      if (pts.length > 1) {
        const b = pts.reduce((acc, p) => { acc.push([p.lat, p.lon]); return acc; }, []);
        map.fitBounds(b, { maxZoom: 13, padding: [30, 30] });
      }
    })();
  }, [listings, onHoverKey]);

  // React to hoveredKey changes: swap the corresponding marker's icon so it
  // "pops" (gold, larger, above other pins) while all others sit muted.
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      const priceIcon = (price, active) => L.divIcon({
        className: "eztofind-price-marker" + (active ? " is-active" : ""),
        html: `<div style="background:${active ? C.gold : C.brandBlue};color:${active ? C.navy : "#fff"};border:2px solid #fff;border-radius:14px;padding:${active ? "5px 12px" : "3px 8px"};font-weight:800;font-size:${active ? "13px" : "11px"};box-shadow:0 ${active ? 6 : 2}px ${active ? 14 : 6}px rgba(0,0,0,${active ? 0.5 : 0.35});white-space:nowrap;font-family:Inter,system-ui,sans-serif;transform:${active ? "scale(1.15)" : "none"};transition:transform 0.15s;">${fmtPrice(price)}</div>`,
        iconSize: active ? [90, 32] : [70, 24],
        iconAnchor: active ? [45, 16] : [35, 12],
      });
      Object.entries(markerByKeyRef.current).forEach(([key, marker]) => {
        const active = key === hoveredKey;
        marker.setIcon(priceIcon(marker._listPrice, active));
        if (active) marker.setZIndexOffset(1000);
        else marker.setZIndexOffset(0);
      });
    })();
  }, [hoveredKey]);

  // Click-to-Focus — when a card's "focus on map" button is tapped, fly to
  // that listing's pin and open its popup. Also scroll the map into view so
  // the user actually sees the animation. The prop is encoded as "key#seq"
  // so tapping the same card twice still re-fires the effect.
  useEffect(() => {
    if (!focusKey) return;
    const raw = String(focusKey).split("#")[0];
    if (!raw) return;
    const map = mapRef.current;
    const marker = markerByKeyRef.current[raw];
    if (!map || !marker) return;
    try {
      const container = mapContainerRef.current;
      if (container && typeof container.scrollIntoView === "function") {
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {}
    // Slight delay so the scroll finishes before flyTo animates.
    setTimeout(() => {
      try {
        const ll = marker.getLatLng();
        map.flyTo(ll, Math.max(13, map.getZoom()), { animate: true, duration: 0.8 });
        marker.openPopup();
      } catch {}
    }, 300);
  }, [focusKey]);

  return (
    <div ref={mapContainerRef} data-testid="dash-search-map"
      style={{ width: "100%", height: 320, borderRadius: 8, overflow: "hidden", border: "1px solid #E5E7EB" }}/>
  );
};

const fmtPrice = (n) => {
  if (!n) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${n}`;
};


const SearchPanel = () => {
  const ctx = useContext(SearchFiltersContext);
  const { filters, results, loading } = ctx || { filters: {}, results: null, loading: false };
  const { city } = filters;
  // Shared "hovered listing_key" — when you hover a listing card the
  // corresponding map pin pops; hovering a pin highlights the card.
  const [hoveredKey, setHoveredKey] = useState(null);
  // Click-to-Focus — tapping the map-pin button on a card sets this key,
  // which causes ListingsMap to fly to the matching pin and open its popup.
  // A tiny counter forces the effect to re-fire when the same key is tapped twice.
  const [focus, setFocus] = useState({ key: null, seq: 0 });
  const focusOn = (key) => setFocus(prev => ({ key, seq: prev.seq + 1 }));
  return (
    <>
      <HeroIntro/>
      {/* Map — full-width above the two-column filters/listings block. */}
      <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: "1px solid #E5E7EB", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong style={{ color: C.navy }}>Interactive map {city ? `· ${city}` : ""}</strong>
          <span style={{ fontSize: 11, color: C.muted }}>Leaflet + OpenStreetMap · {(results?.listings || []).filter(l => l.lat && l.lon).length} pins</span>
        </div>
        <ListingsMap city={city} listings={results?.listings || []} hoveredKey={hoveredKey} onHoverKey={setHoveredKey} focusKey={`${focus.key || ""}#${focus.seq}`}/>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6, textAlign: "right" }}>
          <a
            href={`https://www.google.com/maps?q=${encodeURIComponent(city ? `${city}, British Columbia real estate` : "Doug LeMaire REALTOR, 22374 Lougheed Hwy, Maple Ridge BC")}`}
            target="_blank" rel="noopener noreferrer"
            style={{ color: C.blue, fontWeight: 700, textDecoration: "none" }}
            data-testid="dash-search-map-open"
          >Open in Google Maps ↗</a>
        </div>
      </div>
      {/* Listings run full-width. The FILTERS card is a floating, draggable
          panel (rendered separately as <FloatingFilters/>) so the user can
          move it anywhere on screen. Default position: top-left. Position
          persists across sessions via localStorage. */}
      <ResultsGrid results={results} loading={loading} hoveredKey={hoveredKey} onHoverKey={setHoveredKey} onFocusMap={focusOn}/>
      <SyncedResults/>
      <FloatingFilters/>
    </>
  );
};

const ResultsGrid = ({ results, loading, hoveredKey, onHoverKey, onFocusMap }) => {
  if (loading && !results) return <SkeletonGrid/>;
  const rows = (results?.listings || []);
  if (!rows.length) return <EmptyBox>No exact matches in CREA DDF® right now — try widening a filter.</EmptyBox>;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <strong style={{ color: C.navy }}>{results.total?.toLocaleString?.() || rows.length} listings</strong>
        <span style={{ fontSize: 11, color: C.muted }}>Sorted by newest · CREA DDF®</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {rows.slice(0, 12).map(l => (
          <ListingCard
            key={l.listing_key}
            l={l}
            isHovered={hoveredKey === l.listing_key}
            onHoverKey={onHoverKey}
            onFocusMap={onFocusMap}
          />
        ))}
      </div>
    </>
  );
};

// ── Content Synchronization Engine — /api/doogie/sync-search renderer ─────
// Renders every content type EZtoFind.ca has for the current search in
// priority order: Community Market Insights, Buyer/Seller Insights, Community
// Profile, Property-Type Intelligence, Glossary, FAQs, Tools, Communities,
// Journey chapters, Related Searches. Every section carries a compliance
// footer: informational only, never advice.
const SyncedResults = () => {
  const ctx = useContext(SearchFiltersContext);
  const sync = ctx?.sync;
  const loading = ctx?.syncLoading;
  if (!sync && !loading) return null;
  const sections = sync?.sections || [];
  if (loading && sections.length === 0) {
    return (
      <div data-testid="synced-results-loading" style={{ marginTop: 32, padding: 20, background: "#fff", borderRadius: 12, border: `1px dashed ${C.brandGold}`, color: C.muted, textAlign: "center", fontSize: 13 }}>
        Doogie is gathering everything else on EZtoFind.ca that matches your search…
      </div>
    );
  }
  if (!sections.length) return null;
  const kindColor = (k) => ({
    MarketInsights:   { bg: "#FFF8E1", accent: C.brandGold, ico: "📊" },
    IntentInsights:   { bg: "#EEF2FF", accent: C.navy,      ico: sync.intent === "sell" ? "🏷️" : "🔑" },
    CommunityProfile: { bg: "#ECFDF5", accent: "#059669",   ico: "🗺️" },
    PropertyIntel:    { bg: "#FEF3C7", accent: "#B45309",   ico: "🧭" },
    Glossary:         { bg: "#F3F4F6", accent: C.navy,      ico: "📖" },
    FAQs:             { bg: "#F3F4F6", accent: C.navy,      ico: "❓" },
    Tools:            { bg: "#F5F3FF", accent: "#6D28D9",   ico: "🛠️" },
    Communities:      { bg: "#ECFDF5", accent: "#047857",   ico: "🏘️" },
    Journey:          { bg: "#FEF2F2", accent: "#B91C1C",   ico: "🧭" },
    RelatedSearches:  { bg: "#F9FAFB", accent: C.muted,     ico: "🔎" },
  }[k] || { bg: "#F9FAFB", accent: C.navy, ico: "•" });
  return (
    <section data-testid="synced-results" style={{ marginTop: 36 }}>
      <header style={{ marginBottom: 14, borderTop: `1px dashed ${C.brandGold}`, paddingTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div>
            <strong style={{ color: C.navy, fontSize: 16 }}>Everything else on EZtoFind.ca matching your search</strong>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
              Doogie searched every content library on EZtoFind.ca — one search, complete picture.
            </div>
          </div>
          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            {sync?.intent && sync.intent !== "browse" && (
              <span data-testid="sync-intent-badge" style={{ background: sync.intent === "sell" ? "#DC2626" : C.navy, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Intent · {sync.intent === "sell" ? "Selling" : "Buying"}
              </span>
            )}
            {sync?.property_intel && (
              <span data-testid="sync-intel-badge" style={{ background: C.brandGold, color: C.navy, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {sync.property_intel.replace(/-/g, " ")}
              </span>
            )}
            {sync?.community && (
              <span data-testid="sync-community-badge" style={{ background: "#ECFDF5", color: "#047857", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5, border: "1px solid #A7F3D0" }}>
                📍 {sync.community}
              </span>
            )}
          </div>
        </div>
      </header>
      <div style={{ display: "grid", gap: 14 }}>
        {sections.map((s, i) => (
          <SyncSection key={`${s.kind}-${i}`} section={s} palette={kindColor(s.kind)}/>
        ))}
      </div>
      {sync?.compliance && (
        <div data-testid="sync-compliance" style={{ marginTop: 14, padding: "10px 14px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 11, color: C.muted, lineHeight: 1.55 }}>
          <strong style={{ color: C.navy }}>Compliance:</strong> {sync.compliance.role} {sync.compliance.scope} Reviewed against {sync.compliance.frameworks?.join(" · ")}.
        </div>
      )}
    </section>
  );
};

const _fmtMoney = (n) => (n == null ? "—" : `$${Number(n).toLocaleString()}`);

const SyncSection = ({ section, palette }) => {
  const [expanded, setExpanded] = useState(true);
  const bar = palette || { bg: "#F9FAFB", accent: C.navy, ico: "•" };
  const testId = `sync-section-${section.kind.toLowerCase()}`;
  return (
    <div data-testid={testId} style={{ background: "#fff", border: "1px solid #E5E7EB", borderLeft: `4px solid ${bar.accent}`, borderRadius: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        data-testid={`${testId}-toggle`}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: bar.bg, border: "none", padding: "10px 14px",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
        }}
        aria-expanded={expanded}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.navy, fontWeight: 800, fontSize: 13 }}>
          <span aria-hidden="true" style={{ fontSize: 15 }}>{bar.ico}</span>
          {section.headline || section.kind}
        </span>
        <span style={{ color: bar.accent, fontSize: 12, fontWeight: 700 }}>{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div style={{ padding: "12px 14px" }}>
          {section.kind === "MarketInsights" && <MarketInsightsBody insights={section.insights}/>}
          {section.kind === "IntentInsights" && <IntentInsightsBody bundle={section}/>}
          {section.kind === "CommunityProfile" && <CommunityProfileBody profile={section}/>}
          {section.kind === "PropertyIntel" && <PropertyIntelBody section={section}/>}
          {["Glossary", "FAQs", "Tools", "Communities", "Journey", "RelatedSearches"].includes(section.kind) && (
            <SyncCardGrid items={section.items || []}/>
          )}
        </div>
      )}
    </div>
  );
};

const MarketInsightsBody = ({ insights }) => {
  if (!insights) return null;
  const cells = [
    { label: "Active Listings",   value: insights.active_count != null ? insights.active_count.toLocaleString() : "—" },
    { label: "Median List Price", value: _fmtMoney(insights.median_list_price) },
    { label: "Average List Price",value: _fmtMoney(insights.avg_list_price) },
    { label: "Avg Days on Market",value: insights.avg_days_on_market != null ? `${Math.round(insights.avg_days_on_market)} days` : "—" },
    { label: "Price Range",       value: (insights.min_price != null && insights.max_price != null) ? `${_fmtMoney(insights.min_price)} – ${_fmtMoney(insights.max_price)}` : "—" },
    { label: "Inventory Signal",  value: insights.market_type_label || "—" },
  ];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ background: "#F9FAFB", padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>{c.label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.navy, marginTop: 2 }}>{c.value}</div>
          </div>
        ))}
      </div>
      {insights.market_type_note && (
        <div style={{ marginTop: 10, fontSize: 11, color: C.muted, fontStyle: "italic" }}>{insights.market_type_note}</div>
      )}
      <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>Source: {insights.source || "CREA DDF®"} · Updated {insights.last_updated ? new Date(insights.last_updated).toLocaleDateString() : "recently"}</div>
    </>
  );
};

const IntentInsightsBody = ({ bundle }) => {
  return (
    <>
      {(bundle.facts || []).length > 0 && (
        <ul style={{ margin: "0 0 12px 18px", padding: 0, color: C.navy, fontSize: 13, lineHeight: 1.55 }}>
          {bundle.facts.map((f, i) => (<li key={i}>{f}</li>))}
        </ul>
      )}
      <SyncCardGrid items={bundle.tools || []}/>
      {bundle.compliance && (
        <div style={{ marginTop: 10, fontSize: 11, color: C.muted, fontStyle: "italic" }}>{bundle.compliance}</div>
      )}
    </>
  );
};

const CommunityProfileBody = ({ profile }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {profile.synopsis && (
      <p style={{ margin: 0, color: C.navy, fontSize: 13, lineHeight: 1.6 }}>{profile.synopsis}</p>
    )}
    {profile.region && (
      <div style={{ fontSize: 11, color: C.muted }}>Region: <strong style={{ color: C.navy }}>{profile.region}</strong></div>
    )}
    <Link to={profile.href} style={{ color: C.blue, fontWeight: 700, fontSize: 12, textDecoration: "none" }} data-testid="sync-community-profile-link">
      Open the full {profile.community} community profile →
    </Link>
  </div>
);

const PropertyIntelBody = ({ section }) => (
  <>
    {section.why && (
      <p style={{ margin: "0 0 10px 0", color: C.muted, fontSize: 12, fontStyle: "italic", lineHeight: 1.5 }}>{section.why}</p>
    )}
    <SyncCardGrid items={section.items || []}/>
  </>
);

const SyncCardGrid = ({ items }) => {
  if (!items || items.length === 0) return <div style={{ fontSize: 12, color: C.muted }}>Nothing to show.</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
      {items.map((it, i) => (
        <Link key={`${it.href}-${i}`} to={it.href || "#"} data-testid={`sync-item-${(it.href || i).toString().replace(/[^a-z0-9]/gi, "-").slice(0, 40)}`}
          style={{
            display: "block", background: "#F9FAFB", border: "1px solid #E5E7EB",
            padding: "10px 12px", borderRadius: 8, color: C.navy, textDecoration: "none",
            transition: "border-color 0.15s, transform 0.15s",
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = C.brandGold; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginBottom: 3 }}>{it.title}</div>
          {it.blurb && (
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>{it.blurb}</div>
          )}
        </Link>
      ))}
    </div>
  );
};

const ListingCard = ({ l, isHovered, onHoverKey, onFocusMap }) => {
  const price = l.list_price ? `$${Number(l.list_price).toLocaleString()}` : "—";
  const addr = l.unparsed_address || l.street_address || l.address || l.listing_key;
  const cover = (l.photos && l.photos[0]) || (l.Media && l.Media[0]?.MediaURL);
  const hasPin = l.lat != null && l.lon != null;
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
  const focusOnMap = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFocusMap) onFocusMap(l.listing_key);
  };
  const notify = (key) => { if (onHoverKey) onHoverKey(key); };
  return (
    <Link to={`/listings/${l.listing_key}`} data-testid={`dash-listing-${l.listing_key}`}
      onMouseEnter={() => notify(l.listing_key)}
      onMouseLeave={() => notify(null)}
      style={{
        background: "#fff", borderRadius: 12,
        border: `1px solid ${isHovered ? C.gold : "#E5E7EB"}`,
        overflow: "hidden",
        textDecoration: "none", color: C.navy, display: "block",
        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
        position: "relative",
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered ? `0 12px 24px rgba(245,166,35,0.25)` : "none",
      }}
    >
      <div style={{
        height: 140, background: cover ? `url(${cover}) center/cover` : C.mist,
        position: "relative",
      }}>
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
        {hasPin && onFocusMap && (
          <button
            type="button"
            onClick={focusOnMap}
            data-testid={`dash-listing-focus-${l.listing_key}`}
            aria-label="Show this listing on the map"
            title="Show on map"
            style={{
              position: "absolute", right: 48, top: 8, width: 32, height: 32,
              borderRadius: "50%", border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.95)",
              display: "grid", placeItems: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            <MapPin size={16} color={C.navy}/>
          </button>
        )}
        {/* Tour kind badges — distinct pills for Matterport 3D vs linear
            video walk-throughs. Anchored to the LEFT of the heart / map-pin
            cluster so the row reads: [3D] [Video] [MapPin] [Heart].
            Backend classifies via _tour_host_family; UI just renders
            l.tour_kinds. Falls back to has_virtual_tour on legacy payloads
            where the backend hasn't been redeployed yet. */}
        {(() => {
          const kinds = Array.isArray(l.tour_kinds) && l.tour_kinds.length
            ? l.tour_kinds
            : (l.has_virtual_tour ? ["video"] : []);
          if (!kinds.length) return null;
          const pinOffset = (hasPin && onFocusMap) ? 88 : 48;
          // Build in order: Matterport first (rarer + higher signal), then Video.
          const badges = [];
          if (kinds.includes("matterport")) badges.push({
            key: "3d",
            label: "3D",
            title: "Matterport 3D walk-through",
            bg: "#312E81", // indigo-900 — signals interactive/immersive
            fg: "#FFFFFF",
            Icon: Box,
          });
          if (kinds.includes("video")) badges.push({
            key: "video",
            label: "Video",
            title: "Video walk-through (YouTube / Vimeo)",
            bg: C.brandGold || "#F5A623",
            fg: "#0F2A5B",
            Icon: Play,
          });
          return badges.map((b, i) => (
            <div
              key={b.key}
              data-testid={`dash-listing-tour-${b.key}-${l.listing_key}`}
              aria-label={b.title}
              title={b.title}
              style={{
                position: "absolute", right: pinOffset + i * 62, top: 8, height: 32,
                padding: "0 10px", borderRadius: 999, border: "none",
                background: b.bg, color: b.fg,
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 11, fontWeight: 800, letterSpacing: 0.4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                whiteSpace: "nowrap",
              }}
            >
              <b.Icon size={12} strokeWidth={2.5}/> {b.label}
            </div>
          ));
        })()}
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
const useInsights = (city, propType) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    setData(null);
    (async () => {
      try {
        const p = new URLSearchParams({ city });
        if (propType) p.set("property_type", propType);
        const r = await fetch(`${API}/insights?${p}`);
        if (r.ok && !cancelled) setData(await r.json());
      } catch { /* keep null */ }
    })();
    return () => { cancelled = true; };
  }, [city, propType]);
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
// ── TrendCaption + TrendSourceLine — expose the exact "how current is this?"
//   metadata for the median-price trend chart. Reads the latest snapshot's
//   `at` timestamp and shows how many days ago it was captured, so buyers /
//   sellers immediately see the chart is fresh (updated daily by our cron).
const _fmtDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso.slice(0, 10); }
};
const _daysAgo = (iso) => {
  if (!iso) return null;
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    return Math.max(0, Math.round((now - then) / 86400000));
  } catch { return null; }
};

const TrendCaption = ({ history }) => {
  const s = Array.isArray(history) ? history : (history?.series || []);
  if (!s.length) return <span style={{ fontSize: 9, color: C.muted, fontStyle: "italic" }}>Loading…</span>;
  const latest = s[s.length - 1];
  const first = s[0];
  const days = _daysAgo(latest?.at);
  const freshness = days === 0 ? "Updated today"
    : days === 1 ? "Updated yesterday"
    : days != null ? `Updated ${days}d ago`
    : "";
  return (
    <span style={{ fontSize: 9, color: C.muted, fontStyle: "italic" }}>
      {s.length} weekly points · {_fmtDate(first?.at)} → {_fmtDate(latest?.at)} · <strong style={{ color: "#059669", fontStyle: "normal" }}>{freshness}</strong>
    </span>
  );
};

const TrendSourceLine = ({ history }) => {
  const s = Array.isArray(history) ? history : (history?.series || []);
  if (!s.length) return null;
  return (
    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 4, lineHeight: 1.4, textAlign: "right" }}>
      Source: <strong style={{ color: C.navy }}>CREA DDF® MLS® feed</strong> · weekly median of active listings · refreshed hourly · re-snapshotted daily · <em>historical prices only — never a forecast or opinion of value</em>
    </div>
  );
};


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
  const [regions, setRegions] = useState(null);
  const data = useInsights(city, propType);
  const history = useInsightsHistory(city, propType);
  const [comps, setComps] = useState(null);
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
        cityAutocomplete={{ city, setCity, regions }}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: C.blue }}>
                  90-day median list price trend
                </div>
                <TrendCaption history={history}/>
              </div>
              <Sparkline series={history}/>
              <TrendSourceLine history={history}/>
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
  // For-You feed: exact-match listings tied to what the buyer has already
  // engaged with. Priority: (1) most recent saved search text → (2) city of
  // the most recently saved home. If neither exists, show a friendly empty
  // state with a CTA instead of the entire 43,399-listing firehose.
  const [rows, setRows] = useState(null);
  const [source, setSource] = useState(null); // { kind: "search"|"home"|"none", label: string }
  useEffect(() => {
    (async () => {
      try {
        const savedSearches = JSON.parse(localStorage.getItem("ez_saved_searches") || "[]");
        const savedHomes = JSON.parse(localStorage.getItem(SAVED_HOMES_KEY) || "[]");
        const params = new URLSearchParams({ limit: "12", sort: "newest" });
        if (savedSearches.length && (savedSearches[0]?.q || typeof savedSearches[0] === "string")) {
          const q = typeof savedSearches[0] === "string" ? savedSearches[0] : savedSearches[0].q;
          params.set("q", q);
          setSource({ kind: "search", label: q });
        } else if (savedHomes.length && savedHomes[0]?.city) {
          params.set("city", savedHomes[0].city);
          setSource({ kind: "home", label: savedHomes[0].city });
        } else {
          setSource({ kind: "none" });
          setRows({ listings: [], total: 0 });
          return;
        }
        const r = await fetch(`${API}/listings?${params}`);
        setRows(await r.json());
      } catch { setSource({ kind: "none" }); setRows({ listings: [] }); }
    })();
  }, []);

  const blurb = !source                        ? "Loading your personalized picks…"
              : source.kind === "search"       ? `Live matches for your saved search — "${source.label}".`
              : source.kind === "home"         ? `Freshest CREA DDF® listings in ${source.label} — based on the home you saved most recently.`
              : "Save a search or a home to unlock your personalized feed.";

  const nav = useNavigate();
  return (
    <div>
      <PanelIntro title="For You" blurb={blurb}/>
      {source?.kind === "none" ? (
        <div data-testid="foryou-empty" style={{
          background: "#fff", border: "1px dashed #DDE6FA", borderRadius: 14,
          padding: "36px 28px", textAlign: "center", maxWidth: 560, margin: "20px auto",
        }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>🐾</div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: C.navy, margin: 0 }}>
            Save a home or a search — then this feed learns what you like.
          </h3>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, marginTop: 10 }}>
            Doogie won't second-guess your taste. Tap the ❤️ on any listing, or run a search you'd want to see again — this pane will fill with fresh matches every time you come back.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            <button onClick={() => nav("/listings")} data-testid="foryou-browse-listings" style={{
              background: C.brandBlue, color: "#fff", border: "none", padding: "10px 20px",
              borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>Browse listings →</button>
          </div>
        </div>
      ) : (
        <ResultsGrid results={rows} loading={rows === null}/>
      )}
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
  const [q, setQ] = useState("");           // free-text community search
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
  const trimmed = q.trim().toLowerCase();
  // Filter regions by community name substring. Regions with zero matches
  // are hidden so the user only sees relevant sections.
  const filtered = React.useMemo(() => {
    if (!regions) return null;
    if (!trimmed) return regions;
    const out = {};
    Object.entries(regions).forEach(([region, names]) => {
      const hits = (names || []).filter(n => n.toLowerCase().includes(trimmed));
      if (hits.length) out[region] = hits;
    });
    return out;
  }, [regions, trimmed]);
  const totalMatches = React.useMemo(() => {
    if (!filtered) return 0;
    return Object.values(filtered).reduce((s, arr) => s + (arr || []).length, 0);
  }, [filtered]);
  const highlight = (name) => {
    if (!trimmed) return name;
    const lc = name.toLowerCase();
    const i = lc.indexOf(trimmed);
    if (i < 0) return name;
    return (<>
      {name.slice(0, i)}
      <mark style={{ background: "#FFE9A8", color: C.navy, padding: 0 }}>{name.slice(i, i + trimmed.length)}</mark>
      {name.slice(i + trimmed.length)}
    </>);
  };
  return (
    <div>
      <PanelIntro title="Communities" blurb="Every BC community — school scores, transit, walkability, live map, and homes for you."/>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 18, maxWidth: 480 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search communities (Chase, Whistler, Kits…)"
          data-testid="dash-community-search"
          style={{
            width: "100%", padding: "11px 40px 11px 14px", borderRadius: 10,
            border: `1px solid ${q ? C.brandBlue : "#DDE6FA"}`,
            fontSize: 13, color: C.navy, fontWeight: 600, background: "#fff", outline: "none",
          }}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            data-testid="dash-community-search-clear"
            aria-label="Clear community search"
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", cursor: "pointer",
              color: C.muted, fontSize: 16, padding: "4px 8px",
            }}
          >×</button>
        )}
        {q && filtered && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.muted }} data-testid="dash-community-search-count">
            {totalMatches === 0 ? "No matching communities" : `${totalMatches} match${totalMatches === 1 ? "" : "es"}`}
          </div>
        )}
      </div>
      {regions === null && <SkeletonGrid/>}
      {regions && Object.keys(regions).length === 0 && <EmptyBox>Communities feed is warming up — check back in a moment.</EmptyBox>}
      {filtered && trimmed && totalMatches === 0 && (
        <EmptyBox>No community names match "{q}". Try a shorter search.</EmptyBox>
      )}
      {filtered && Object.entries(filtered).map(([region, names]) => (
        <div key={region} data-testid={`dash-community-region-${slugify(region)}`} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
            <h3 style={{ margin: 0, color: C.navy, fontFamily: "'Playfair Display', serif", fontSize: 18 }}>{region}</h3>
            <span style={{ color: C.muted, fontSize: 11 }}>{(names || []).length} communit{(names || []).length === 1 ? "y" : "ies"}</span>
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
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{highlight(name)}</div>
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
// ── DoogieMessage — light-weight renderer for Doogie's assistant replies.
//   Doogie is prompted to emit markdown (## headings, **bold**, "- bullets")
//   and the literal phrase "Referral REALTOR® link" whenever it suggests
//   connecting the user to a licensed REALTOR® outside Doug's service area.
//   This renderer:
//     • Turns every occurrence of "Referral REALTOR® link" (with or without
//       markdown-bracket wrapping, e.g. `[Referral REALTOR® link](#)`) into
//       a real orange CTA button that navigates to /referral-request.
//     • Whenever that phrase appears, prepends the out-of-service-area
//       qualifier chip so the user always sees WHY they're being referred.
//     • Renders `## heading`, `**bold**`, `- bullet`, blank lines as native
//       React nodes. Everything else stays plain text.
//   Deliberately minimal (no external markdown lib) — keeps bundle small
//   and gives Doug exact control over the visual rules.
const REFERRAL_PHRASE_RE = /(?:\[Referral REALTOR® link(?:\s*[:\-]\s*([A-Z][A-Za-z' \-]{1,40}?))?\]\([^)]*\)|Referral REALTOR® link(?:\s*[:\-]\s*([A-Z][A-Za-z' \-]{1,40})(?=[.,;!?\n)]|$))?)/g;

const DoogieReferralButton = ({ location }) => {
  const nav = useNavigate();
  const buttonLabel = location
    ? `Request a Referral REALTOR® in ${location}`
    : "Request a Referral REALTOR®";
  const href = location
    ? `/referral-request?city=${encodeURIComponent(location)}`
    : "/referral-request";
  return (
    <div style={{ marginTop: 12 }} data-testid="doogie-referral-cta">
      <div style={{
        background: "#FEF3C7", border: "1px solid #F59E0B",
        padding: "10px 12px", borderRadius: 10, fontSize: 12,
        color: "#7A3E0A", lineHeight: 1.5, marginBottom: 12,
      }}>
        <strong>Outside Doug's service area?</strong> Doug's primary practice is Greater Vancouver, Fraser Valley, and the Sea-to-Sky Corridor. For anywhere else in BC, if you like we will match you to a licensed local REALTOR®.
      </div>
      <button
        type="button"
        onClick={() => nav(href)}
        data-testid="doogie-referral-button"
        style={{
          background: C.brandBlue, color: "#fff", border: "none",
          padding: "12px 22px", borderRadius: 999, fontWeight: 800,
          fontSize: 13, cursor: "pointer", boxShadow: "0 4px 12px rgba(10,61,153,0.30)",
          display: "inline-flex", alignItems: "center", gap: 6,
          lineHeight: 1.3, textAlign: "center",
        }}
      >{buttonLabel}</button>
    </div>
  );
};

const DoogieMessage = ({ text }) => {
  if (!text) return null;
  // Detect referral phrase + optional captured city (e.g. "Referral REALTOR® link: Armstrong")
  let referralLocation = null;
  let hasReferral = false;
  let match;
  REFERRAL_PHRASE_RE.lastIndex = 0;
  while ((match = REFERRAL_PHRASE_RE.exec(text))) {
    hasReferral = true;
    const cap = match[1] || match[2];
    if (cap && !referralLocation) referralLocation = cap.trim();
  }
  REFERRAL_PHRASE_RE.lastIndex = 0;
  const cleaned = text.replace(REFERRAL_PHRASE_RE, "").replace(/\n{3,}/g, "\n\n").trim();

  const lines = cleaned.split("\n");
  const blocks = [];
  let list = null;
  const flushList = () => { if (list) { blocks.push({ kind: "ul", items: list }); list = null; } };
  lines.forEach((raw) => {
    const line = raw.trimEnd();
    if (/^##\s+/.test(line)) { flushList(); blocks.push({ kind: "h3", text: line.replace(/^##\s+/, "") }); return; }
    if (/^#\s+/.test(line))  { flushList(); blocks.push({ kind: "h2", text: line.replace(/^#\s+/, "") }); return; }
    if (/^-\s+/.test(line))  { if (!list) list = []; list.push(line.replace(/^-\s+/, "")); return; }
    if (line.trim() === "")  { flushList(); blocks.push({ kind: "space" }); return; }
    if (/^---+$/.test(line.trim())) { flushList(); blocks.push({ kind: "hr" }); return; }
    flushList();
    blocks.push({ kind: "p", text: line });
  });
  flushList();

  const renderInline = (str, keyBase = "") => {
    const parts = [];
    let last = 0;
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let m;
    while ((m = linkRe.exec(str))) {
      if (m.index > last) parts.push({ t: "text", v: str.slice(last, m.index) });
      parts.push({ t: "link", label: m[1], href: m[2] });
      last = m.index + m[0].length;
    }
    if (last < str.length) parts.push({ t: "text", v: str.slice(last) });

    const out = [];
    parts.forEach((p, i) => {
      if (p.t === "link") {
        const isInternal = p.href.startsWith("/");
        out.push(isInternal
          ? <Link key={`${keyBase}-l${i}`} to={p.href} style={{ color: C.brandBlue, fontWeight: 700 }}>{p.label}</Link>
          : <a key={`${keyBase}-l${i}`} href={p.href} target="_blank" rel="noreferrer" style={{ color: C.brandBlue, fontWeight: 700 }}>{p.label}</a>);
      } else {
        const chunks = p.v.split(/(\*\*[^*]+\*\*)/g);
        chunks.forEach((c, j) => {
          if (/^\*\*[^*]+\*\*$/.test(c)) out.push(<strong key={`${keyBase}-b${i}-${j}`} style={{ color: C.navy }}>{c.slice(2, -2)}</strong>);
          else if (c) out.push(<React.Fragment key={`${keyBase}-t${i}-${j}`}>{c}</React.Fragment>);
        });
      }
    });
    return out;
  };

  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "h2") return <h2 key={i} style={{ margin: "10px 0 6px", fontSize: 16, color: C.navy, fontWeight: 800 }}>{renderInline(b.text, `h2-${i}`)}</h2>;
        if (b.kind === "h3") return <h3 key={i} style={{ margin: "10px 0 6px", fontSize: 14, color: C.navy, fontWeight: 800 }}>{renderInline(b.text, `h3-${i}`)}</h3>;
        if (b.kind === "ul") return <ul key={i} style={{ margin: "6px 0", paddingLeft: 20 }}>
          {b.items.map((it, j) => <li key={j} style={{ marginBottom: 3 }}>{renderInline(it, `ul-${i}-${j}`)}</li>)}
        </ul>;
        if (b.kind === "hr") return <hr key={i} style={{ margin: "10px 0", border: "none", borderTop: "1px solid #E5E7EB" }}/>;
        if (b.kind === "space") return <div key={i} style={{ height: 6 }}/>;
        return <p key={i} style={{ margin: "4px 0", lineHeight: 1.5 }}>{renderInline(b.text, `p-${i}`)}</p>;
      })}
      {hasReferral && <DoogieReferralButton location={referralLocation}/>}
    </>
  );
};


const AskDoogieDrawer = ({ open, onClose }) => {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  // Debug badge — show Doogie's routing intent when ?debug=1 is in the URL.
  const debug = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get("debug") === "1"; }
    catch { return false; }
  }, []);
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
    setHistory(h => [...h, { role: "user", text: question }, { role: "doogie", text: "", routing: null }]);
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
      let routing = null;
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
            if (j.routing) {
              routing = j.routing;
              setHistory(h => {
                const copy = [...h];
                copy[copy.length - 1] = { role: "doogie", text: acc, routing };
                return copy;
              });
            } else if (typeof j.delta === "string") {
              acc += j.delta;
              setHistory(h => {
                const copy = [...h];
                copy[copy.length - 1] = { role: "doogie", text: acc, routing };
                return copy;
              });
            } else if (typeof j.error === "string") {
              acc += `\n\n⚠️ ${j.error}`;
              setHistory(h => {
                const copy = [...h];
                copy[copy.length - 1] = { role: "doogie", text: acc, routing };
                return copy;
              });
            }
          } catch {}
        }
      }
      if (!acc) {
        setHistory(h => {
          const copy = [...h];
          copy[copy.length - 1] = { role: "doogie", text: "I couldn't reach my brain just now — try again in a moment.", routing };
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={DOOGIE.thinking}
              alt="Doogie thinking"
              data-testid="dash-ask-header-doogie"
              style={{ width: 48, height: 48, flexShrink: 0, filter: "drop-shadow(0 2px 6px rgba(15,42,91,0.18))" }}
              onError={e => { e.currentTarget.style.display = "none"; }}
            />
            <div>
              <strong style={{ color: C.navy }}>🐾 Ask Doogie</strong>
              <div style={{ fontSize: 11, color: C.muted }}>General information only, never advice</div>
            </div>
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
              fontSize: 13, lineHeight: 1.45,
              whiteSpace: m.role === "user" ? "pre-wrap" : "normal",
            }}>
              {debug && m.role === "doogie" && m.routing && (
                <div data-testid={`dash-ask-routing-${i}`} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#EEF2FF", border: "1px solid #C7D2FE",
                  color: "#3730A3", fontSize: 10, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 999, marginBottom: 6,
                  textTransform: "uppercase", letterSpacing: 0.5,
                }} title="Doogie's Haiku intent classification">
                  <span>🧭 route: {m.routing.intent}</span>
                  <span style={{ opacity: 0.7 }}>· {(m.routing.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
              {m.role === "user" ? m.text : <DoogieMessage text={m.text}/>}
            </div>
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

// ── HomeComplianceBanner — thin cream banner sticky at the very top of the
//   homepage. Matches the classic-home compliance strip and keeps the BCFSA
//   "not-advice" educational disclaimer front-and-centre before the user
//   engages with any card. Same wording as the production /classic-home.
// ── DashboardBackHomeBar — matches the classic `<BackHomeBar/>` in App.js so
//   the two navigation styles (dashboard shell + classic AppLayout) both
//   surface "← Back" and "🏠 Home" in the SAME visual location on every page.
const DashboardBackHomeBar = () => {
  const nav = useNavigate();
  return (
    <div data-testid="dash-back-home-bar" style={{
      background: "#fff", borderBottom: "1px solid rgba(15,42,91,0.06)",
      padding: "8px 32px", display: "flex", gap: 8, alignItems: "center",
    }}>
      <button onClick={() => nav(-1)} data-testid="dash-btn-back" style={{
        background: "transparent", border: "1px solid #DDE6FA", color: C.navy,
        padding: "5px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700,
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
      }}>← Back</button>
      <Link to="/" data-testid="dash-btn-home" style={{
        background: "transparent", border: "1px solid #DDE6FA", color: C.navy,
        padding: "5px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700,
        textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4,
      }}>🏠 Home</Link>
      <Link to="/realtor-network" data-testid="dash-btn-realtor-network" style={{
        marginLeft: "auto",
        color: C.gold, background: C.navy,
        padding: "5px 14px", borderRadius: 999, fontSize: 13, fontWeight: 800,
        textDecoration: "none", display: "inline-flex", alignItems: "center",
        letterSpacing: 0.3,
      }}>REALTOR® Network</Link>
    </div>
  );
};


const HomeComplianceBanner = () => (
  <div data-testid="dash-home-compliance-banner" style={{
    background: "#FBF6E7", borderBottom: "1px solid rgba(245,166,35,0.30)",
    padding: "10px 32px", fontFamily: "'Inter', system-ui, sans-serif",
    color: C.ink, fontSize: 12.5, lineHeight: 1.5, textAlign: "center",
  }}>
    <strong style={{ color: C.navy }}>EZtoFind.ca</strong> provides general educational information about BC real estate — <em>not</em> legal, tax, financial, or real estate advice. For your own situation, speak with the appropriate licensed professional: a BC lawyer or notary, an accountant or tax professional, a licensed mortgage broker, or a licensed REALTOR®.
  </div>
);

// ── HomeExtras — the five classic-home cards Doug wants preserved on the
//   dashboard homepage in their original order and card layout:
//   (1) Focus regions   (2) Community Finder quiz   (3) Affordability
//   calculator   (4) Testimonials + credentials strip.
//   The compliance banner is rendered separately as a sticky strip above
//   the top bar (HomeComplianceBanner) so it doesn't scroll away.
const HomeExtras = () => {
  const wrap = { marginTop: 32 };
  const cardShell = {
    background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB",
    padding: "36px 32px", marginBottom: 22,
    boxShadow: "0 1px 2px rgba(15,42,91,0.04)",
  };
  const sectionEyebrow = {
    display: "block", textAlign: "center", color: C.brandGold,
    fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2,
    marginBottom: 10,
  };
  const sectionTitle = {
    textAlign: "center", fontFamily: "'Playfair Display', serif",
    fontSize: "clamp(24px, 3vw, 34px)", color: C.navy, margin: "0 0 12px",
    fontWeight: 800, lineHeight: 1.15,
  };
  const sectionSub = {
    textAlign: "center", color: C.muted, fontSize: 14, lineHeight: 1.6,
    margin: "0 auto 28px", maxWidth: 620,
  };
  const regions = [
    { slug: "greater-vancouver", title: "Greater Vancouver",   img: IMG.vancouver,     desc: "From downtown highrises to West Van estates — 22 communities covered." },
    { slug: "fraser-valley",     title: "Fraser Valley",       img: IMG.fraserValley,  desc: "Langley, Abbotsford, Chilliwack and beyond — where space meets city convenience." },
    { slug: "sea-to-sky",        title: "Sea-to-Sky",          img: IMG.seaToSky,      desc: "Squamish, Whistler, Pemberton — mountain lifestyle real estate." },
  ];
  const testimonials = [
    {
      stars: 5, initials: "JM", name: "J&M", role: "Buyers",
      quote: "Doug was an absolute pleasure to work with! As a buyer, we truly appreciated his patience, professionalism, and thorough approach throughout the entire process. Doug took the time to understand our needs, provided valuable insights, and guided us every step of the way with clear communication and expert advice. Doug's attention to detail and dedication made the experience smooth and stress-free. We couldn't have asked for a better realtor and highly recommend Doug to anyone looking to buy or sell a home!",
    },
    {
      stars: 5, initials: "MC", name: "M.C.", role: "Seller",
      quote: "As a home seller, deciding which agent to work with can seem daunting. There are so many agents that sound great on paper, but will they truly understand YOUR needs and work to fulfill YOUR goals. Doug LeMaire is a real estate agent of an elite caliber who truly cares about his clients and will not stop until YOU are satisfied. Doug sold my home as an off sale listing, demonstrating to me that he never stopped working on my behalf, even when the home was not actually listed for sale. He did so by establishing strong connections with buyer agents and got the sale done. We are now looking to buy a home and will be using Doug for our next move. Thank you Doug for all your help.",
    },
  ];
  const credentialStrip = [
    { icon: "🛡️", label: "Licensed REALTOR®",  sub: "BCFSA License #167790" },
    { icon: "📍", label: "Local Expert",       sub: "Greater Vancouver, Fraser Valley, Sea to Sky Corridor" },
    { icon: "⏱️", label: "13 Years",           sub: "BC Real Estate Experience" },
  ];
  return (
    <div style={wrap} data-testid="dash-home-extras">
      {/* 1. Focus regions */}
      <section style={cardShell} data-testid="dash-home-regions">
        <p style={sectionSub}>
          Doug LeMaire serves clients across three of British Columbia's most desirable real estate corridors.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {regions.map(r => (
            <Link key={r.slug} to={`/regions/${r.slug}`} data-testid={`dash-home-region-${r.slug}`}
              style={{
                background: "#FBFAF5", border: "1px solid #E5E7EB", borderRadius: 14,
                overflow: "hidden", textDecoration: "none", color: C.navy,
                display: "flex", flexDirection: "column",
              }}>
              <div style={{
                height: 200, background: `url(${r.img}) center/cover`, borderRadius: "14px 14px 0 0",
              }}/>
              <div style={{ padding: "18px 20px 22px" }}>
                <h3 style={{ margin: "0 0 8px", fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.navy, fontWeight: 800 }}>{r.title}</h3>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.muted }}>{r.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. Community Finder quiz — reused verbatim from classic home */}
      <section style={{ ...cardShell, padding: "8px 8px 20px", overflow: "hidden" }} data-testid="dash-home-community-finder">
        <WhereShouldYouLive/>
      </section>

      {/* 3. Affordability calculator — reused verbatim from classic home */}
      <section style={{ ...cardShell, padding: "36px 24px" }} data-testid="dash-home-afford">
        <Calculators/>
      </section>

      {/* 4. Testimonials + credentials strip */}
      <section style={cardShell} data-testid="dash-home-testimonials">
        <span style={sectionEyebrow}>What Our Clients Say</span>
        <h2 style={sectionTitle}>Real People. Real Results.<br/>Real BC Real Estate.</h2>
        <p style={sectionSub}>
          Doug LeMaire, REALTOR® helps buyers and sellers in BC achieve their real estate goals. Here is what they say.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22, maxWidth: 1000, margin: "0 auto" }}>
          {testimonials.map((t, i) => (
            <div key={i} data-testid={`dash-home-testimonial-${i}`} style={{
              background: "#E8EEF9", borderRadius: 20, padding: "26px 26px 22px",
              position: "relative",
            }}>
              <div style={{ color: C.brandGold, letterSpacing: 3, fontSize: 15, marginBottom: 10 }}>{"★".repeat(t.stars)}</div>
              <div style={{ fontSize: 42, fontFamily: "'Playfair Display', serif", color: C.brandBlue, lineHeight: 0.6, marginBottom: 4 }}>&ldquo;</div>
              <p style={{ margin: "0 0 22px", fontSize: 13.5, fontStyle: "italic", lineHeight: 1.6, color: C.ink }}>{t.quote}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.navy, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13 }}>{t.initials}</div>
                <div>
                  <div style={{ fontWeight: 700, color: C.ink }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 40, flexWrap: "wrap", textAlign: "center" }}>
          {credentialStrip.map((c, i) => (
            <div key={i} data-testid={`dash-home-cred-${i}`} style={{ minWidth: 200 }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontWeight: 800, color: C.navy, fontSize: 15, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4, maxWidth: 220, margin: "0 auto" }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};


const ComplianceFooter = () => (
  <footer data-testid="dash-compliance-footer" style={{
    background: C.navy, color: "#fff", padding: "18px 32px", fontSize: 11, lineHeight: 1.6,
  }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24, opacity: 0.9 }}>
      <div>
        <strong style={{ color: C.gold }}>CREA Compliance</strong><br/>
        MLS® data licensed from CREA DDF®.
      </div>
      <div>
        <strong style={{ color: C.gold }}>CASL Compliance</strong><br/>
        <Link to="/unsubscribe" data-testid="footer-unsubscribe-link" style={{ color: "#fff", textDecoration: "underline" }}>One-click unsubscribe.</Link><br/>
        <Link to="/privacy" style={{ color: "#fff", textDecoration: "underline" }}>Privacy policy</Link>
      </div>
      <div>
        <strong style={{ color: C.gold }}>PIPA (BC)</strong><br/>
        Personal data collected for stated purpose only.<br/>
        <Link to="/terms" style={{ color: "#fff", textDecoration: "underline" }}>Terms</Link>
      </div>
      <div>
        <Link to="/realtor-network" data-testid="footer-realtor-network" style={{ color: C.gold, textDecoration: "none" }}>
          <strong>REALTOR® Network</strong>
        </Link>
      </div>
    </div>
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.15)", opacity: 0.85 }}>
      Doogie provides general information only — never advice. Real estate services are provided by Doug LeMaire, REALTOR®.
    </div>
  </footer>
);

// ── Small helpers ──────────────────────────────────────────────────────────
const PanelIntro = ({ title, blurb, cityInput, cityAutocomplete }) => (
  <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: "0 0 4px", color: C.navy }}>{title}</h2>
      <p style={{ color: C.muted, margin: 0, fontSize: 13, lineHeight: 1.5 }}>{blurb}</p>
    </div>
    {cityAutocomplete && (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 260 }}>
        <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.muted, letterSpacing: 0.5 }}>City <span style={{ opacity: 0.6, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>· any BC community</span></label>
        <CityAutocomplete regions={cityAutocomplete.regions} value={cityAutocomplete.city} onPick={cityAutocomplete.setCity}/>
      </div>
    )}
    {cityInput && !cityAutocomplete && (
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
