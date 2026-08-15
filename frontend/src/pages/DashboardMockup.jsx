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
import React, { useEffect, useMemo, useRef, useState, useContext, createContext, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { IMG, WhereShouldYouLive, Calculators, DoogieChat } from "../App";
import DoogieTour from "../components/DoogieTour";
import DoogieFilterHeader from "../components/DoogieFilterHeader";
import LiveHomepageSchema from "../components/LiveHomepageSchema";
import WeeklyDigestSignup from "../components/WeeklyDigestSignup";
import PlayfulEmptyState from "../components/PlayfulEmptyState";
import { DoogieVoiceToggle, DoogieSpeedSlider, DoogieTalkingStyle, useDoogieMuted, getDoogieSpeed } from "../components/voicePref";
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
  // Curated specialty listing feeds — both link to pre-filtered /listings URLs.
  // Luxury goes above Equestrian (broader audience first).
  { key: "luxury",     label: "Luxury Listings",     icon: Star,     href: "/listings?price_min=3000000&sort=price_desc" },
  { key: "equestrian", label: "Equestrian Listings", icon: Building2, href: "/listings?property_type=Equestrian" },
  { key: "buyer",     label: "Buyer Insights", icon: BarChart3 },
  { key: "seller",    label: "Seller Insights",icon: TrendingUp },
  { key: "value",     label: "Market Estimate", icon: DollarSign, href: "/valuation" },
  { key: "community", label: "Communities",    icon: MapPin },
  { key: "glossary",  label: "Glossary",       icon: BookOpen },
  { key: "relocating",label: "Relocating",     icon: Plane, href: "/relocating" },
  { key: "consult",   label: "Consultation",   icon: CalendarClock },
  { key: "ask",       label: "Ask Doogie",     icon: MessageCircle },
];

// ── Hero (introduces Doogie + BCFSA context) ──────────────────────────────
const HeroIntro = () => {
  const ctx = useContext(SearchFiltersContext);
  const [returnMeta, setReturnMeta] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const impressionFiredRef = useRef(false);

  // Session ID used by the Return-Visit analytics beacons. Persisted per
  // browser (localStorage) so the admin dashboard can dedupe unique sessions.
  // Regenerated only if missing — never rotated, never sent to any 3rd party.
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      let sid = localStorage.getItem("ez_rv_session_id");
      if (!sid) {
        sid = (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : `rv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("ez_rv_session_id", sid);
      }
      return sid;
    } catch { return ""; }
  }, []);

  // Fire-and-forget beacon for Return-Visit analytics. Uses navigator.sendBeacon
  // where possible so events survive tab-close / navigation.
  const beacon = (event, meta) => {
    if (!event || typeof window === "undefined") return;
    try {
      const f = (meta && meta.filters) || {};
      const daysSince = meta && meta.ts ? Math.max(1, Math.round((Date.now() - meta.ts) / (24 * 60 * 60 * 1000))) : null;
      const payload = {
        event,
        session_id: sessionId,
        days_since_last_visit: daysSince,
        total_at_last_visit: (meta && typeof meta.total === "number") ? meta.total : null,
        city:          f.city || null,
        property_type: f.propertyType || null,
        beds:          f.beds || null,
        price_max:     f.priceMax || null,
      };
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/analytics/return-visit`;
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body, keepalive: true,
        }).catch(() => {});
      }
    } catch { /* analytics failures are non-fatal */ }
  };

  useEffect(() => {
    // Only ever show the personalized variant when the current filter
    // state is still empty (URL / restore-nudge already handles the
    // "I typed my own city" case — the hero should get out of the way).
    const currentIsEmpty = !ctx?.filters || !["q","city","beds","baths","priceMin","priceMax","propertyType","keyword"].some(k => (ctx.filters[k] || "").toString().trim() !== "");
    if (!currentIsEmpty) { setReturnMeta(null); return; }
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("ez_last_search_meta") : null;
      if (!raw) return;
      const meta = JSON.parse(raw);
      if (!meta || !meta.filters || !meta.ts) return;
      // Freshness window: 30 days.
      if (Date.now() - meta.ts > 30 * 24 * 60 * 60 * 1000) return;
      // Skip if user dismissed within the last 7 days.
      const dismissedAt = parseInt(localStorage.getItem("ez_return_visit_dismissed_at") || "0", 10);
      if (dismissedAt && (Date.now() - dismissedAt) < 7 * 24 * 60 * 60 * 1000) { setDismissed(true); return; }
      // Filters must actually contain SOMETHING or personalization is
      // pointless (e.g. sort=newest only doesn't count).
      const hasIntent = ["q","city","beds","baths","priceMin","priceMax","propertyType","keyword"].some(k => (meta.filters[k] || "").toString().trim() !== "");
      if (!hasIntent) return;
      setReturnMeta(meta);
    } catch { /* localStorage may be disabled */ }
  }, [ctx?.filters]);

  // Fire the impression beacon exactly once per mount as soon as the
  // personalised variant has locked in. The ref guard survives the
  // intentional dismiss path (which nulls returnMeta) so a rapid
  // impression → dismiss doesn't double-fire.
  useEffect(() => {
    if (returnMeta && !impressionFiredRef.current) {
      impressionFiredRef.current = true;
      beacon("impression", returnMeta);
    }
  }, [returnMeta]);

  const resume = () => {
    if (!returnMeta || !ctx?.setFilters || !ctx?.runSearch) return;
    // Beacon BEFORE we mutate state so the payload still reflects the
    // filters the visitor was shown (post-mutation `returnMeta` is null).
    beacon("resume", returnMeta);
    ctx.setFilters({ ...returnMeta.filters });
    setTimeout(() => ctx.runSearch(returnMeta.filters), 40);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
    // Update ts so the pill doesn't re-fire on the next reload of the same visit.
    try {
      const raw = localStorage.getItem("ez_last_search_meta");
      if (raw) {
        const cur = JSON.parse(raw);
        localStorage.setItem("ez_last_search_meta", JSON.stringify({ ...cur, ts: Date.now() }));
      }
    } catch {}
    setReturnMeta(null);
  };

  const dismiss = () => {
    if (returnMeta) beacon("dismiss", returnMeta);
    try { localStorage.setItem("ez_return_visit_dismissed_at", String(Date.now())); } catch {}
    setDismissed(true);
    setReturnMeta(null);
  };

  // Not a return visitor — render the classic hero unchanged.
  if (!returnMeta || dismissed) return (
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

  // ── Return-visit personalised hero ─────────────────────────────────────
  // Reconstruct a friendly search summary from the saved filters and,
  // if we know the previous total, hint at the delta since last visit.
  const f = returnMeta.filters || {};
  const daysAgo = Math.max(1, Math.round((Date.now() - returnMeta.ts) / (24 * 60 * 60 * 1000)));
  const parts = [];
  if (f.beds) parts.push(`${f.beds}+ bed`);
  if (f.propertyType) {
    const t = String(f.propertyType).toLowerCase();
    parts.push(t.includes("row") || t.includes("town") ? "townhome" : t.includes("apartment") || t.includes("condo") ? "condo" : t.includes("house") || t.includes("single family") ? "home" : String(f.propertyType).toLowerCase());
  } else {
    parts.push("home");
  }
  const searchNoun = parts.join(" ");
  const cityLabel = f.city ? ` in ${f.city}` : " across BC";
  let priceLabel = "";
  if (f.priceMax) {
    const n = parseInt(f.priceMax, 10);
    if (!isNaN(n)) priceLabel = n >= 1_000_000 ? ` under $${(n/1_000_000).toFixed(1).replace(/\.0$/, "")}M` : ` under $${Math.round(n/1000)}k`;
  } else if (f.priceMin) {
    const n = parseInt(f.priceMin, 10);
    if (!isNaN(n)) priceLabel = n >= 1_000_000 ? ` from $${(n/1_000_000).toFixed(1).replace(/\.0$/, "")}M` : ` from $${Math.round(n/1000)}k`;
  }

  return (
    <section data-testid="dash-hero-return-visit" className="dash-hero-section" style={{
      background: "linear-gradient(135deg,#F0F7FF 0%,#FBF7EE 100%)",
      border: "1px solid rgba(15,42,91,0.18)", borderRadius: 14,
      padding: "22px 24px", marginBottom: 22, display: "grid",
      gridTemplateColumns: "300px 1fr", gap: 22, alignItems: "center",
      position: "relative",
    }}>
      <button
        type="button"
        onClick={dismiss}
        data-testid="dash-hero-return-dismiss"
        aria-label="Show the default homepage"
        title="Show the default homepage instead"
        style={{
          position: "absolute", top: 12, right: 14,
          background: "transparent", border: "none",
          color: C.muted, cursor: "pointer", fontSize: 20, lineHeight: 1,
          fontWeight: 700,
        }}
      >×</button>
      <picture>
        <source srcSet="/doogie/laptop.webp" type="image/webp"/>
        <img src={DOOGIE_LAPTOP_URL} alt="Doogie — EZtoFind.ca real estate helper"
          data-testid="dash-hero-doogie"
          width={900} height={600}
          fetchpriority="high"
          loading="eager"
          decoding="async"
          style={{
            width: "100%", maxWidth: 300, height: "auto", aspectRatio: "3/2",
            filter: "drop-shadow(0 8px 24px rgba(15,42,91,0.25))",
          }}
          onError={e => { e.currentTarget.style.display = "none"; }}
        />
      </picture>
      <div>
        <div style={{
          display: "inline-block", background: C.navy, color: "#fff",
          fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase",
          padding: "3px 10px", borderRadius: 999, marginBottom: 10,
        }} data-testid="dash-hero-return-badge">
          🐾 Welcome back
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", margin: 0, lineHeight: 1.1,
          fontSize: "clamp(24px, 2.8vw, 34px)", fontWeight: 800, color: C.navy,
        }}>
          Doogie kept your <span style={{ color: C.brandBlue }}>{searchNoun}</span> search
          <span style={{ color: C.brandGreen }}>{cityLabel}</span>
          <span style={{ color: C.brandGold }}>{priceLabel}</span> warm.
        </h1>
        <p style={{ color: C.ink, marginTop: 10, marginBottom: 12, fontSize: 14, lineHeight: 1.55, maxWidth: 720 }}>
          You last checked <strong>{daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`}</strong>.
          {typeof returnMeta.total === "number" && returnMeta.total > 0 ? ` You had ${returnMeta.total.toLocaleString()} matches in that search — pick up right where you left off.` : " Pick up right where you left off."}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={resume}
            data-testid="dash-hero-return-resume"
            style={{
              background: C.navy, color: "#fff", border: "none",
              padding: "11px 22px", borderRadius: 999, fontWeight: 800,
              fontSize: 13, cursor: "pointer", letterSpacing: 0.3,
              boxShadow: "0 4px 12px rgba(15,42,91,0.25)",
            }}
          >Show me the newest matches →</button>
          <button
            type="button"
            onClick={dismiss}
            data-testid="dash-hero-return-fresh"
            style={{
              background: "transparent", border: "none",
              color: C.muted, fontSize: 12, fontWeight: 600,
              cursor: "pointer", textDecoration: "underline",
            }}
          >Start a new search instead</button>
        </div>
        <p style={{ color: C.muted, marginTop: 12, marginBottom: 0, fontSize: 11, lineHeight: 1.45, maxWidth: 720 }}>
          Your saved search lives on your device only — nothing is sent to Doug's server until you contact him. Compliant with BC PIPA.
        </p>
      </div>
    </section>
  );
};

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
  //
  // NOTE (2026-02): The dashboard used to rehydrate the visitor's last
  // search from localStorage on every mount. Per Doug's request, we now
  // ALWAYS start with an empty filter set so every session begins as a
  // fresh search — no leftover Kelowna condo filter from last week. The
  // localStorage key is kept for potential future "Restore last search"
  // opt-in prompt, but it is no longer read on mount.
  const DASH_FILTERS_LS_KEY = "ez_dashboard_filters";
  const DASH_FILTERS_DISMISS_KEY = "ez_dashboard_restore_dismissed_at";
  const DEFAULT_DASH_FILTERS = { q: "", city: "", beds: "", baths: "", priceMin: "", priceMax: "", propertyType: "", keyword: "", sort: "newest" };
  const wasRestoredRef = useRef(false);

  // ── URL ⇄ Filter state sync ──────────────────────────────────────────
  // Reads filter state from URL query params (?city=…&beds_min=…) on mount
  // so a browser-back navigation from /listing/{key} or /compare restores
  // the visitor's search intact instead of dumping them on a blank Home.
  //
  // The URL uses the SAME shape as /api/listings params (`beds_min`,
  // `price_max`, `property_type`, …) so a URL is shareable and equivalent
  // to a `/listings?…` deep-link.  The dashboard's internal filter shape
  // uses camelCase (`beds`, `priceMax`, `propertyType`) so we map at the
  // boundary here — no other component needs to change.
  const [urlParams, setUrlParams] = useSearchParams();
  const _readFiltersFromUrl = () => {
    const raw = {
      q: urlParams.get("q") || "",
      city: urlParams.get("city") || urlParams.get("community") || "",
      beds: urlParams.get("beds_min") || urlParams.get("beds") || "",
      baths: urlParams.get("baths_min") || urlParams.get("baths") || "",
      priceMin: urlParams.get("price_min") || urlParams.get("priceMin") || "",
      priceMax: urlParams.get("price_max") || urlParams.get("priceMax") || "",
      propertyType: urlParams.get("property_type") || urlParams.get("propertyType") || "",
      keyword: urlParams.get("features") || urlParams.get("keyword") || "",
      sort: urlParams.get("sort") || "newest",
    };
    const anySet = Object.entries(raw).some(([k, v]) => v && k !== "sort");
    return anySet ? { ...DEFAULT_DASH_FILTERS, ...raw } : null;
  };

  const [filters, setFilters] = useState(() => {
    const fromUrl = _readFiltersFromUrl();
    return fromUrl || { ...DEFAULT_DASH_FILTERS };
  });
  // "Pick up where you left off" restore-nudge pill. We compute this ONCE
  // on mount and only surface if:
  //   (a) the visitor has a meaningful saved filter set in localStorage,
  //   (b) they haven't dismissed the pill in the last 7 days,
  //   (c) the current filter state is still the default (i.e. they haven't
  //       already started a new search this session).
  // Clicking Restore fills the filters + kicks runSearch; clicking × sets a
  // 7-day dismissal so it doesn't nag on every visit.
  const [restoreNudge, setRestoreNudge] = useState(null);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(DASH_FILTERS_LS_KEY) : null;
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;
      const merged = { ...DEFAULT_DASH_FILTERS, ...saved };
      const parts = [];
      if (merged.city) parts.push(merged.city);
      if (merged.propertyType) parts.push(merged.propertyType.toLowerCase().replace(/single family/i, "detached"));
      if (merged.beds) parts.push(`${merged.beds}bd`);
      if (merged.priceMax) {
        const n = parseInt(merged.priceMax, 10);
        if (!isNaN(n)) parts.push(n >= 1_000_000 ? `under $${(n/1_000_000).toFixed(1).replace(/\.0$/, "")}M` : `under $${Math.round(n/1000)}k`);
      } else if (merged.priceMin) {
        const n = parseInt(merged.priceMin, 10);
        if (!isNaN(n)) parts.push(n >= 1_000_000 ? `from $${(n/1_000_000).toFixed(1).replace(/\.0$/, "")}M` : `from $${Math.round(n/1000)}k`);
      }
      if (merged.keyword) parts.push(`"${merged.keyword}"`);
      if (parts.length === 0) return;
      // 7-day dismissal
      const dismissedAt = parseInt(localStorage.getItem(DASH_FILTERS_DISMISS_KEY) || "0", 10);
      if (dismissedAt && (Date.now() - dismissedAt) < 7 * 24 * 60 * 60 * 1000) return;
      setRestoreNudge({ filters: merged, label: parts.join(" · ") });
    } catch { /* localStorage may be disabled */ }
  }, []);
  const acceptRestore = () => {
    if (!restoreNudge) return;
    setFilters(restoreNudge.filters);
    try { runSearch(restoreNudge.filters); } catch {}
    setRestoreNudge(null);
    wasRestoredRef.current = true;
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  };
  const dismissRestore = () => {
    try { localStorage.setItem(DASH_FILTERS_DISMISS_KEY, String(Date.now())); } catch {}
    setRestoreNudge(null);
  };
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sync, setSync] = useState(null);         // Content Sync Engine payload
  const [syncLoading, setSyncLoading] = useState(false);
  // Free-text query (voice transcript or filter keyword) used to seed the
  // Content Synchronization Engine. Voice-filter writes this from the
  // transcript so buyer/seller intent is detected even before filters apply.
  const [syncQuery, setSyncQuery] = useState("");
  // Bumped by the voice-filter mic handler right before runSearch() fires.
  // SyncedResults reads this once, auto-plays the spoken summary, then resets.
  const [voiceTriggerNonce, setVoiceTriggerNonce] = useState(0);
  const runSearch = async (overrideFilters) => {
    // pivot-badge + voice-filter callers pass `overrideFilters` explicitly so
    // we always run with fresh values even before React finishes re-rendering
    // after their setFilters(). Falls back to the current state otherwise.
    const f = overrideFilters ? { ...filters, ...overrideFilters } : filters;
    setLoading(true);
    setSyncLoading(true);
    try {
      const p = new URLSearchParams({ limit: "24", sort: f.sort || "newest" });
      if (f.q) p.set("q", f.q);
      if (f.city) p.set("city", f.city);
      if (f.beds) p.set("beds_min", f.beds);
      if (f.baths) p.set("baths_min", f.baths);
      if (f.priceMin) p.set("price_min", f.priceMin);
      if (f.priceMax) p.set("price_max", f.priceMax);
      if (f.propertyType) p.set("property_type", f.propertyType);
      if (f.keyword) p.set("features", f.keyword);
      // Fire the listings + Content Sync Engine in parallel so the visitor
      // sees market insights + buyer/seller resources appear at the same
      // moment as the property cards.
      // f.propertyType already stores the API-shape value (House,
      // Apartment, Row / Townhouse, etc.) so we forward it verbatim.
      const syncBody = {
        query: (syncQuery || f.q || f.keyword || f.city || "").trim(),
        filter: {
          community: f.city || null,
          property_type: f.propertyType || null,
          min_beds: f.beds ? Number(f.beds) : null,
          min_baths: f.baths ? Number(f.baths) : null,
          min_price: f.priceMin ? Number(f.priceMin) : null,
          max_price: f.priceMax ? Number(f.priceMax) : null,
          keyword: f.keyword || null,
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

      // Persist the exact filter set that produced these results so the
      // visitor lands here next time. Skip when nothing meaningful is set
      // (avoids overwriting a real prior search with an empty state).
      try {
        const meaningful = ["q","city","beds","baths","priceMin","priceMax","propertyType","keyword"].some(k => (f[k] || "").toString().trim() !== "");
        if (meaningful) {
          localStorage.setItem(DASH_FILTERS_LS_KEY, JSON.stringify(f));
          // Also stash a lightweight "return-visit" meta blob with the
          // result-total + timestamp so the personalised hero on the
          // next visit can say "You had N matches" and "you last
          // checked N days ago". Total is best-effort; if the listings
          // fetch rejected we still record filters + ts so the hero
          // has something friendly to greet the visitor with.
          const total = (listResp.status === "fulfilled" && listResp.value && typeof listResp.value.total === "number") ? listResp.value.total : null;
          localStorage.setItem("ez_last_search_meta", JSON.stringify({
            filters: f, ts: Date.now(), total,
          }));
        }
      } catch { /* localStorage may be disabled in private windows */ }
    } finally {
      setLoading(false);
      setSyncLoading(false);
    }
  };
  // First-load fetch — respects any filter state hydrated from the URL on
  // mount so a browser back-nav to `/?city=…` re-runs that exact search.
  useEffect(() => { runSearch(); /* eslint-disable-next-line */ }, []);

  // ── Filter state → URL sync ─────────────────────────────────────────
  // Runs whenever the filter state changes.  Writes the current filter set
  // into the URL query string so browser Back/Forward from a listing or
  // compare page restores the exact search intact.  Uses `replace: true`
  // so we don't spam the history stack with every filter tweak — the
  // history entry the visitor "goes back to" is whichever page they came
  // from, and this Home URL just updates in-place.
  const _lastSyncedQsRef = useRef("");
  useEffect(() => {
    try {
      const urlNext = {};
      if (filters.q) urlNext.q = filters.q;
      if (filters.city) urlNext.city = filters.city;
      if (filters.beds) urlNext.beds_min = filters.beds;
      if (filters.baths) urlNext.baths_min = filters.baths;
      if (filters.priceMin) urlNext.price_min = filters.priceMin;
      if (filters.priceMax) urlNext.price_max = filters.priceMax;
      if (filters.propertyType) urlNext.property_type = filters.propertyType;
      if (filters.keyword) urlNext.features = filters.keyword;
      if (filters.sort && filters.sort !== "newest") urlNext.sort = filters.sort;
      const nextQs = new URLSearchParams(urlNext).toString();
      if (_lastSyncedQsRef.current === nextQs) return;
      _lastSyncedQsRef.current = nextQs;
      setUrlParams(urlNext, { replace: true });
    } catch { /* older browsers — no-op */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Re-read the URL when the visitor hits browser Back/Forward while on
  // Home — react-router-dom's `useSearchParams` updates in place, so we
  // hook into the change and re-hydrate + re-run whenever the URL query
  // differs from what our current filter state would emit.  Without this
  // effect the URL updates but the search results and filter form stay
  // stuck on the pre-back state.
  //
  // CRITICAL: this effect ONLY runs on browser Back/Forward navigation,
  // NOT on the URL updates we push ourselves from the filters→URL sync
  // above.  Otherwise we introduce a nasty race — while the user is
  // mid-typing "abc" in the community field, an older render's URL sync
  // ("?city=a") can fire this effect just as filters is already at "ab",
  // the diff-check spots them as different, and we clobber the user's
  // typed value back to "a".  Reported live by Doug on production
  // (Feb 2026): "whenever I type anything in here it takes me to the
  // home page — /?city=a, /?city=c…".  Fix: compare the incoming URL
  // against `_lastSyncedQsRef` (what our own filter→URL sync wrote
  // last) — if they match, this urlParams change came from OUR write,
  // so ignore it and don't touch filters.
  useEffect(() => {
    const incomingQs = urlParams.toString();
    if (incomingQs === _lastSyncedQsRef.current) return;   // our own write — ignore
    const fromUrl = _readFiltersFromUrl();
    const currentEmpty = Object.entries(filters).every(([k, v]) => k === "sort" || !v);
    // Nothing in URL → user is at a bare /home; leave state alone (fresh
    // first-visit behaviour) unless we currently HAVE filters set (i.e.
    // they navigated back past their own search to bare /).
    if (!fromUrl && currentEmpty) return;
    if (!fromUrl && !currentEmpty) {
      _lastSyncedQsRef.current = "";
      setFilters({ ...DEFAULT_DASH_FILTERS });
      runSearch({ ...DEFAULT_DASH_FILTERS });
      return;
    }
    // Genuine back/forward — bring state in line with URL and re-run.
    _lastSyncedQsRef.current = incomingQs;
    setFilters(fromUrl);
    runSearch(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParams]);
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
    <SearchFiltersContext.Provider value={{ filters, setFilters, results, loading, runSearch, sync, syncLoading, setSyncQuery, voiceTriggerNonce, bumpVoiceTrigger: () => setVoiceTriggerNonce(n => n + 1), wasRestored: wasRestoredRef.current }}>
    <LiveHomepageSchema/>
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
        <DashboardBackHomeBar resetHome={() => {
          // Clear filters + return to the visitor's landing section so tapping
          // "Home" from any nested view feels like a true reset. Kicks
          // runSearch() to refresh the empty listing/map state so the map
          // recenters on the office anchor too.
          setFilters({ ...DEFAULT_DASH_FILTERS });
          setSyncQuery("");
          setSync(null);
          setSection(homeVariant === "dashboard" ? "home" : "search");
          // Fire a fresh empty search so the listings + map reset visually.
          try { runSearch({ ...DEFAULT_DASH_FILTERS }); } catch {}
          try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
        }}/>
        {restoreNudge && (
          <div
            data-testid="dash-restore-nudge"
            style={{
              margin: "10px 24px 0", padding: "10px 14px",
              background: "linear-gradient(90deg, rgba(30,79,207,0.10) 0%, rgba(245,166,35,0.10) 100%)",
              border: "1px solid rgba(30,79,207,0.25)",
              borderRadius: 999,
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              boxShadow: "0 4px 14px rgba(15,42,91,0.06)",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>🐾</span>
            <div style={{ flex: "1 1 260px", fontSize: 13, color: C.navy, lineHeight: 1.4 }}>
              <strong>Pick up where you left off</strong> — {restoreNudge.label}
            </div>
            <button
              type="button"
              onClick={acceptRestore}
              data-testid="dash-restore-accept"
              style={{
                background: C.navy, color: "#fff", border: "none", cursor: "pointer",
                padding: "7px 16px", borderRadius: 999, fontWeight: 700, fontSize: 12.5,
                fontFamily: "inherit",
              }}
            >Restore →</button>
            <button
              type="button"
              onClick={dismissRestore}
              data-testid="dash-restore-dismiss"
              aria-label="Dismiss restore prompt"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "#6B7280", fontSize: 18, lineHeight: 1, padding: "4px 8px",
              }}
            >×</button>
          </div>
        )}
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
      <DoogieTour firstVisitToastOpen={showToast}/>
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
    {/* Close (×) button — dismisses the coach-mark without navigating,
        so visitors who don't want the guided tour aren't force-moved
        away from wherever they landed. */}
    <button
      onClick={onDismiss}
      data-testid="dash-first-visit-close"
      aria-label="Dismiss Doogie intro"
      style={{
        position: "absolute", top: 6, right: 8,
        background: "none", border: "none", cursor: "pointer",
        fontSize: 20, lineHeight: 1, color: C.muted || "#6B7280",
        padding: "2px 6px", borderRadius: 6,
      }}
    >×</button>
    <img loading="lazy" decoding="async" src={DOOGIE.head} alt="Doogie welcomes you"
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
        onClick={() => { onDismiss(); if (setSection) setSection("home"); }}
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
const SidebarFilters = ({ hideDoogie = false } = {}) => {
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
        marginTop: 18, padding: 0,
        background: "#fff", borderRadius: 14,
        border: "1px solid #E5E7EB",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        color: C.navy,
        overflow: "hidden",
      }}>
      {!hideDoogie && (
      <DoogieFilterHeader
        onVoiceFilter={(f) => {
          // Map the voice-filter payload into SidebarFilters state.
          const propMap = { Condo: "Apartment", Townhouse: "Row / Townhouse" };
          if (f.community) set("city", f.community);
          if (f.property_type) set("propertyType", propMap[f.property_type] || f.property_type);
          if (f.beds) set("beds", String(f.beds));
          if (f.baths) set("baths", String(f.baths));
          if (f.price_min) set("priceMin", String(f.price_min));
          if (f.price_max) set("priceMax", String(f.price_max));
          if (f.keyword) set("keyword", f.keyword);
          // Give React one tick to flush, then submit the search.
          setTimeout(() => runSearch(), 60);
        }}
        onReset={() => {
          ["city","propertyType","beds","baths","priceMin","priceMax","keyword"].forEach(k => set(k, ""));
        }}
      />
      )}
      {/* Item #29 · Natural-language search starter chips. One tap loads a
          curated filter set so first-time visitors don't stare at a blank
          form. Data-driven so Doug can extend the list in one place.    */}
      {!hideDoogie && (
        <div data-testid="dash-nl-chips" style={{ padding:"10px 16px 4px", borderBottom:"1px solid #EEE7D2", background:"#FDFBF3" }}>
          <div style={{ fontSize:"0.65rem", letterSpacing:"0.14em", color: C.muted, fontWeight: 700, textTransform:"uppercase", marginBottom: 6 }}>Try one of these</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap: 6 }}>
            {[
              { label:"3-bed under $1M in Langley", set:{ city:"Langley", beds:"3", priceMax:"1000000" } },
              { label:"Waterfront Sea-to-Sky",       set:{ city:"Squamish", keyword:"waterfront" } },
              { label:"Suite + garage Maple Ridge",  set:{ city:"Maple Ridge", keyword:"suite garage" } },
              { label:"Acreage with barn",           set:{ propertyType:"Manufactured on Land", keyword:"barn acreage" } },
              { label:"Condo under $600K Surrey",    set:{ city:"Surrey", propertyType:"Apartment", priceMax:"600000" } },
            ].map(chip => (
              <button
                key={chip.label}
                type="button"
                data-testid={`dash-nl-chip-${chip.label.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,32)}`}
                onClick={() => {
                  // Wipe first so a chip is a full re-scope, not additive.
                  ["city","propertyType","beds","baths","priceMin","priceMax","keyword"].forEach(k => set(k, ""));
                  Object.entries(chip.set).forEach(([k, v]) => set(k, v));
                  setTimeout(() => runSearch(), 60);
                }}
                className="tap-target-exempt"
                style={{
                  background:"white",
                  border:`1px solid ${C.navy}`,
                  color: C.navy,
                  padding:"6px 12px",
                  borderRadius: 999,
                  fontSize:"0.78rem",
                  fontWeight: 600,
                  cursor:"pointer",
                  fontFamily:"'Sora',sans-serif",
                  transition:"background 0.15s, color 0.15s",
                  minHeight: 32,
                  minWidth: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.navy; e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = C.navy; }}
              >{chip.label}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: "16px 20px 20px" }}>
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
      </div>
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
          // API property_type values map onto the SidebarFilters select values.
          // The select uses "House" / "Apartment" / "Row / Townhouse" — same
          // shape the voice-filter API returns — so no translation needed for
          // House/Condo/Acreage. We only remap the ones with different labels.
          const propMap = { Condo: "Apartment", Townhouse: "Row / Townhouse" };
          const nextPropType = f.property_type ? (propMap[f.property_type] || f.property_type) : "";
          // Feed the transcript into the Content Sync Engine so intent
          // detection (buy vs. sell) picks up the visitor's actual words,
          // not just the filter dict.
          try { ctx.setSyncQuery?.(body.transcript || ""); } catch {}
          // Flag this run as voice-initiated so SyncedResults auto-plays
          // Doogie's spoken summary once the payload arrives.
          try { ctx.bumpVoiceTrigger?.(); } catch {}
          if (ctx?.setFilters) {
            ctx.setFilters(prev => ({
              ...prev,
              city: normCity || prev.city,
              propertyType: nextPropType || prev.propertyType,
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
    // On mobile the SidebarFilters is already mounted inline within the
    // sidebar drawer — rendering it again here duplicated the whole filter
    // panel (Doug spotted this on his iPhone Feb 06). Return null so we
    // don't stack a second copy below the first.
    return null;
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
          {/* DOOGIE + RESET pills removed here (Feb 2026) — they duplicated the
              controls already rendered by the inner DoogieFilterHeader inside
              SidebarFilters. Doug spotted the double stack on iPhone.
              Kept a single "Reset position" chevron so the drag anchor can
              still be recentred without cluttering the strip. */}
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
          >⤺</button>
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
              <img loading="lazy" decoding="async" src="/doogie/celebrating.webp" alt="Doogie" style={{width:"105%",height:"105%",objectFit:"cover"}} onError={(e)=>{e.currentTarget.style.display="none"}}/>
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
        <img loading="lazy" decoding="async" src={DOOGIE.head} alt="Doogie" style={{ width: 380, height: 380, objectFit: "contain", display: "block", margin: 0 }} onError={e => e.currentTarget.style.display = "none"}/>
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

// ── ListingsMap — interactive Leaflet map that (a) ALWAYS opens centered on
//   the Fraser Property Management Realty Services Ltd. office in Maple Ridge
//   (22374 Lougheed Hwy) as a persistent gold-star anchor, (b) smooth-flies
//   to the searched city while KEEPING the office pin visible, and (c) drops
//   a price-tag marker for every CREA DDF® listing with valid lat/lon.
//   Click a marker → opens the listing detail in a new tab.
const DOUG_ADDRESS = {
  lat: 49.21957, lon: -122.59721,
  label: "Fraser Property Management Realty Services Ltd.",
  street: "22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5",
};

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

// localStorage key for the last map viewport (center + zoom).
// Persisted on every `moveend` and restored on init IF the user opens the
// map without a `city` filter (a specific city search still wins and flies
// to the new region — we only restore when there's no explicit destination).
const _VIEWPORT_KEY = "ez_search_map_viewport";
const _readViewport = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(_VIEWPORT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v.lat === "number" && typeof v.lon === "number" && typeof v.zoom === "number") return v;
    return null;
  } catch { return null; }
};
const _writeViewport = (lat, lon, zoom) => {
  try { localStorage.setItem(_VIEWPORT_KEY, JSON.stringify({ lat, lon, zoom, ts: Date.now() })); } catch {}
};

const ListingsMap = ({ city, listings, hoveredKey, onHoverKey, focusKey, height = 320, viewMode }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const officeMarkerRef = useRef(null);       // persistent gold-star office pin
  const markerByKeyRef = useRef({});   // listing_key → Leaflet marker
  const centerCacheRef = useRef({});

  // When the parent switches between split/map/list layouts the map's
  // container size changes underneath Leaflet. Nudge Leaflet to redraw its
  // tile grid or you'll see gray gutters until the user pans.
  useEffect(() => {
    if (!mapRef.current) return;
    const t = setTimeout(() => { try { mapRef.current.invalidateSize(); } catch {} }, 60);
    return () => clearTimeout(t);
  }, [viewMode, height]);

  useEffect(() => {
    ensureLeafletCss();
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapContainerRef.current) return;
      if (mapRef.current) return; // already initialized
      // Restore last-viewed viewport only when there's no explicit city
      // filter (city > cached viewport > default office anchor).
      const saved = !city ? _readViewport() : null;
      const initCenter = saved ? [saved.lat, saved.lon] : [DOUG_ADDRESS.lat, DOUG_ADDRESS.lon];
      const initZoom   = saved ? saved.zoom : 13;
      const map = L.map(mapContainerRef.current, {
        center: initCenter,
        zoom: initZoom, scrollWheelZoom: false,
      });
      // Persist viewport on every user-driven move.
      map.on("moveend", () => {
        try {
          const c = map.getCenter();
          _writeViewport(c.lat, c.lng, map.getZoom());
        } catch {}
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      // Persistent gold-star office anchor — visible whether the map is on
      // the office or has flown to a searched city.
      const officeIcon = L.divIcon({
        className: "eztofind-office-marker",
        html: `<div style="background:${C.gold};color:${C.navy};border:3px solid #fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.45);font-family:Inter,system-ui,sans-serif;font-weight:900;font-size:20px;" title="${DOUG_ADDRESS.label}">★</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      const officeMarker = L.marker([DOUG_ADDRESS.lat, DOUG_ADDRESS.lon], {
        title: DOUG_ADDRESS.label,
        icon: officeIcon,
        zIndexOffset: 500,
      }).addTo(map).bindPopup(
        `<div style="min-width:200px;font-family:Inter,system-ui,sans-serif;font-size:12px;">
           <div style="font-weight:800;color:#0F2A5B;font-size:13px;">${DOUG_ADDRESS.label}</div>
           <div style="color:#374151;margin-top:2px;">${DOUG_ADDRESS.street}</div>
           <div style="color:#6B7280;margin-top:2px;"><em>Doug LeMaire · REALTOR® · Fraser Property Management Realty Services Ltd.</em></div>
           <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(DOUG_ADDRESS.street)}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;color:#0A3D99;font-weight:700;">Get directions ↗</a>
         </div>`
      );
      officeMarkerRef.current = officeMarker;
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
        // No city selected → return to the office anchor at friendly zoom.
        map.flyTo([DOUG_ADDRESS.lat, DOUG_ADDRESS.lon], 13, { animate: true, duration: 0.8 });
        return;
      }
      const key = city.toLowerCase().trim();
      let center = centerCacheRef.current[key];
      if (!center) {
        // Authoritative source: Nominatim geocode for the exact city name
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", British Columbia, Canada")}&format=json&limit=1`);
          const j = await r.json();
          if (j && j.length) center = { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon), zoom: 13 };
        } catch { /* fall through */ }
      }
      if (!center) {
        // Last-resort fallback: use lat/lon from a listing whose `city` field
        // actually matches the searched city (case-insensitive). Never use
        // a stale unrelated listing — that was the Osoyoos → Vancouver Island bug.
        const hit = (listings || []).find(l => l.lat && l.lon && l.city && l.city.toLowerCase().trim() === key);
        if (hit) center = { lat: hit.lat, lon: hit.lon, zoom: 13 };
      }
      if (center) {
        centerCacheRef.current[key] = center;
        map.flyTo([center.lat, center.lon], center.zoom || 13, { animate: true, duration: 0.9 });
      } else {
        // Geocode failed and no matching listing — fall back to the office
        // anchor rather than leaving the map stranded on the previous city.
        map.flyTo([DOUG_ADDRESS.lat, DOUG_ADDRESS.lon], 10, { animate: true, duration: 0.8 });
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
              ${l.listing_key
                ? `<a href="/listing/${encodeURIComponent(l.listing_key)}" style="display:inline-block;margin-top:6px;color:#0A3D99;font-weight:700;" data-testid="map-popup-view-listing">View listing on EZtoFind →</a>`
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
      // Fit to markers (but don't override too aggressively — cap zoom).
      // Only fit when the city filter is active AND we have >1 listing;
      // otherwise honor the recenter effect above (which flies to the city
      // or back to the office). Include the office pin in the bounds only
      // if the office is close enough to the listings that it wouldn't
      // stretch the viewport into the ocean.
      if (city && pts.length > 1) {
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
      style={{ width: "100%", height, borderRadius: 8, overflow: "hidden", border: "1px solid #E5E7EB" }}/>
  );
};

const fmtPrice = (n) => {
  if (!n) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${n}`;
};


// localStorage key for the map/list/split view preference.
const _VIEW_MODE_KEY = "ez_search_view_mode";
const _readViewMode = () => {
  if (typeof window === "undefined") return "split";
  try {
    const v = localStorage.getItem(_VIEW_MODE_KEY);
    if (v === "split" || v === "list" || v === "map") return v;
    return "split";
  } catch { return "split"; }
};

// Small three-way segmented toggle used at the top of SearchPanel.
// [ 🗂 List ]  [ ▤ Split ]  [ 🗺 Map ]
const MapListToggle = ({ mode, onChange }) => {
  const opts = [
    { key: "list",  label: "List",  icon: "🗂" },
    { key: "split", label: "Split", icon: "▤" },
    { key: "map",   label: "Map",   icon: "🗺" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Search view mode"
      data-testid="dash-search-view-toggle"
      style={{
        display: "inline-flex", background: "#F1F5F9",
        border: "1px solid #E5E7EB", borderRadius: 999, padding: 3,
        gap: 2,
      }}
    >
      {opts.map(o => {
        const active = mode === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            data-testid={`dash-search-view-${o.key}`}
            title={`${o.label} view`}
            style={{
              background: active ? C.navy : "transparent",
              color:      active ? "#fff"  : C.navy,
              border: "none", borderRadius: 999,
              padding: "5px 12px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", letterSpacing: 0.2,
              display: "inline-flex", alignItems: "center", gap: 5,
              transition: "background-color 120ms ease, color 120ms ease",
            }}
          >
            <span aria-hidden style={{ fontSize: 13 }}>{o.icon}</span>
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const SearchPanel = () => {
  const ctx = useContext(SearchFiltersContext);
  const { filters, results, loading } = ctx || { filters: {}, results: null, loading: false };
  const { city } = filters;
  // Shared "hovered listing_key" — when you hover a listing card the
  // corresponding map pin pops; hovering a pin highlights the card.
  const [hoveredKey, setHoveredKey] = useState(null);
  // Persisted view mode: split (default) / list / map.
  const [viewMode, _setViewMode] = useState(_readViewMode);
  const setViewMode = (m) => {
    _setViewMode(m);
    try { localStorage.setItem(_VIEW_MODE_KEY, m); } catch {}
  };
  // Click-to-Focus — tapping the map-pin button on a card sets this key,
  // which causes ListingsMap to fly to the matching pin and open its popup.
  // A tiny counter forces the effect to re-fire when the same key is tapped twice.
  const [focus, setFocus] = useState({ key: null, seq: 0 });
  const focusOn = (key) => {
    // If we're in "list only" mode, auto-flip to split so the flyTo animation
    // is actually visible before we scroll into the map.
    if (viewMode === "list") setViewMode("split");
    setFocus(prev => ({ key, seq: prev.seq + 1 }));
  };
  const showMap  = viewMode === "split" || viewMode === "map";
  const showList = viewMode === "split" || viewMode === "list";
  const mapHeight = viewMode === "map" ? 640 : 320;
  const pinCount  = (results?.listings || []).filter(l => l.lat && l.lon).length;
  return (
    <>
      <HeroIntro/>
      {/* View mode toggle — sits directly above the map/list block. Lets
          the visitor collapse to List-only for a scanning-heavy session or
          to Map-only for area-shopping. Persisted to localStorage so
          returning users keep their preferred layout. */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8, marginBottom: 10,
      }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
          {results?.total?.toLocaleString?.() || (results?.listings || []).length || 0} listings
          {city ? ` · ${city}` : ""}{pinCount ? ` · ${pinCount} on map` : ""}
        </div>
        <MapListToggle mode={viewMode} onChange={setViewMode}/>
      </div>
      {/* Map — full-width above the two-column filters/listings block.
          Hidden entirely when the visitor picks List-only. */}
      {showMap && (
        <div style={{ background: "#fff", padding: 12, borderRadius: 12, border: "1px solid #E5E7EB", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ color: C.navy }}>Interactive map {city ? `· ${city}` : ""}</strong>
            <span style={{ fontSize: 11, color: C.muted }}>Leaflet + OpenStreetMap · {pinCount} pins</span>
          </div>
          <ListingsMap
            city={city}
            listings={results?.listings || []}
            hoveredKey={hoveredKey}
            onHoverKey={setHoveredKey}
            focusKey={`${focus.key || ""}#${focus.seq}`}
            height={mapHeight}
            viewMode={viewMode}
          />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, textAlign: "right" }}>
            <a
              href={`https://www.google.com/maps?q=${encodeURIComponent(city ? `${city}, British Columbia real estate` : "Doug LeMaire REALTOR, 22374 Lougheed Hwy, Maple Ridge BC")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: C.blue, fontWeight: 700, textDecoration: "none" }}
              data-testid="dash-search-map-open"
            >Open in Google Maps ↗</a>
          </div>
        </div>
      )}
      {/* Unified search + filters + Doogie NL bar. Replaces the old floating
          FILTERS card and the address-only lookup — one row sits between the
          map and the listings grid with:
             [🔍 address/MLS input]  [Filters ▾]  [🐾 Doogie]  [Search]
          Active filters render as removable chips right below. */}
      <UnifiedSearchBar/>
      {showList && (
        <ResultsGrid results={results} loading={loading} hoveredKey={hoveredKey} onHoverKey={setHoveredKey} onFocusMap={focusOn}/>
      )}
      <SyncedResults/>
      <IdleSaveSearchNudge/>
      {/* Floating "Compare (N)" tray — appears when ≥2 listings are selected. */}
      <CompareTray/>
      {/* Persistent Ask-Doogie pill — the site-wide FAB was retired in favour
          of Visual Agent as the unified entry point. Here on the search view
          it's back on purpose: visitors researching listings should always
          have a 1-tap Q&A on the current results + community. */}
      <DoogieChat mode="fab"/>
    </>
  );
};

// ── Unified Search + Filters + Doogie NL bar ─────────────────────────────
// One row between the map and the listings grid:
//   [🔍 address/MLS input]  [Filters ▾]  [🐾 Doogie]  [Search]
// The old vertical FloatingFilters card is retired — same fields now live
// inside the Filters popover. The Doogie popover exposes the same voice /
// text natural-language filter helper Doogie has always used.
//
// Submit heuristics on the input:
//   1. Input matches an MLS-number pattern (e.g. "R2812345", "12345678") ─→
//      navigate straight to /listing/{key}. The detail page handles 404.
//   2. Anything else (a street address, postal code, keyword) ─→
//      route through SearchFiltersContext by setting `city` then runSearch()
//      so results land inline without a full-page nav. (Falls back to
//      /listings?q=... if context isn't available.)
// Canadian postal code — full 6-char (V6B 1A1) OR FSA-only (V6B). We route
// these into `q` (never `city`), because the backend does postal-code
// detection on `q` and applies a proper `postal_code` regex.
const _POSTAL_PATTERN = /^[A-Za-z]\d[A-Za-z](\s?\d[A-Za-z]\d)?$/;
// Human-visible MLS® number pattern — 0-2 letter prefix + 5-10 digits.
// Matches CREA's "R2812345", a bare numeric MLS ("169571"), or a bare
// listing_key ("18787917"). We hand these to the backend as `q` too so
// it looks up BOTH `listing_key` AND `mls_number` in a single round-trip
// and returns the matching listing (if any). No more speculative
// `navigate("/listing/${key}")` calls that 404 because the pasted number
// wasn't a listing_key.
const _MLS_PATTERN = /^[A-Z]{0,2}\s?\d{5,10}$/i;

// Web Speech API detection — used by the mic button INSIDE the address/MLS
// Whisper flow: this mic is native, zero-latency, and DICTATES straight
// into the input field so the visitor can just say "930 Josephine Road"
// and hit Search. Doogie's NL filter parser stays available above it.
const _SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

// InputVoiceMic — inline mic button positioned inside the search input.
// Dictates into the input via onTranscript(text). Auto-submits on final
// result. Gracefully hides when the browser doesn't support Web Speech.
const InputVoiceMic = ({ onTranscript, onFinalSubmit }) => {
  const [state, setState] = useState("idle"); // idle | listening | error
  const [err, setErr] = useState("");
  const recRef = useRef(null);

  if (!_SR) return null; // Firefox / older browsers → hide silently

  const start = () => {
    setErr("");
    try {
      const rec = new _SR();
      rec.lang = "en-CA";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      let finalText = "";
      rec.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        onTranscript?.((finalText + interim).trim());
      };
      rec.onerror = (e) => {
        const kind = e?.error || "unknown";
        // "no-speech" and "aborted" aren't user-facing failures — the mic
        // just timed out or the visitor tapped stop.
        if (kind === "no-speech" || kind === "aborted") { setState("idle"); return; }
        if (kind === "not-allowed" || kind === "service-not-allowed") {
          setErr("Microphone blocked. Enable mic access in your browser settings.");
        } else {
          setErr("Voice input unavailable — please type your address or MLS number.");
        }
        setState("error");
      };
      rec.onend = () => {
        setState("idle");
        if (finalText.trim()) {
          onTranscript?.(finalText.trim());
          setTimeout(() => onFinalSubmit?.(finalText.trim()), 100);
        }
      };
      recRef.current = rec;
      rec.start();
      setState("listening");
    } catch {
      setErr("Voice input unavailable — please type your address or MLS number.");
      setState("error");
    }
  };
  const stop = () => { try { recRef.current?.stop(); } catch {} setState("idle"); };
  const listening = state === "listening";

  return (
    <>
      <button
        type="button"
        onClick={listening ? stop : start}
        data-testid="dash-address-mls-search-mic"
        aria-label={listening ? "Stop voice search" : "Search by voice"}
        title={listening ? "Tap to stop listening" : "Search by voice (English)"}
        style={{
          background: listening ? "#DC2626" : "#F8FAFC",
          color: listening ? "#fff" : C.navy,
          border: `1px solid ${listening ? "#DC2626" : "#E5E7EB"}`,
          borderRadius: 999, width: 34, height: 34,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
          transition: "background-color 120ms ease, color 120ms ease, transform 120ms ease",
          animation: listening ? "ez-mic-pulse 1.1s infinite" : "none",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>{listening ? "●" : "🎤"}</span>
      </button>
      {/* Inline pulse keyframes — scoped by animation name so it doesn't
          leak into other components. Added once, harmless if repeated. */}
      <style>{`
        @keyframes ez-mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.55); }
          50%      { box-shadow: 0 0 0 8px rgba(220,38,38,0);   }
        }
      `}</style>
      {err && state === "error" && (
        <div
          data-testid="dash-address-mls-search-mic-error"
          role="alert"
          style={{
            position: "absolute", top: "100%", right: 10,
            marginTop: 6, background: "#FEE2E2", color: "#B91C1C",
            padding: "6px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            border: "1px solid #FCA5A5", zIndex: 20,
          }}
        >{err}</div>
      )}
    </>
  );
};

const UnifiedSearchBar = () => {
  const navigate = useNavigate();
  const ctx = useContext(SearchFiltersContext);
  const [val, setVal] = useState("");

  const set = (k, v) => ctx?.setFilters && ctx.setFilters(prev => ({ ...prev, [k]: v }));
  const digitsOnly = (s) => String(s || "").replace(/[^\d]/g, "");
  const formatMoney = (raw) => {
    const d = digitsOnly(raw);
    return d ? "$" + Number(d).toLocaleString("en-CA") : "";
  };

  const submit = async (e) => {
    e && e.preventDefault && e.preventDefault();
    const v = val.trim();
    if (!v) {
      if (ctx?.runSearch) ctx.runSearch();
      return;
    }
    // Route by input shape — postal codes, addresses, MLS numbers, and
    // free-text all go through `q` (NOT `city`) so the backend can apply
    // its street_address / postal_code / mls_number detection. Dumping
    // into `city` before this fix meant "V6B 1A1" or "930 Josephine Rd"
    // triggered a strict city-name match and returned zero results.
    if (_MLS_PATTERN.test(v)) {
      // Ask the backend to resolve this to a real listing. Runs against
      // BOTH `listing_key` AND `mls_number` fields. If exactly one hit,
      // navigate straight to the detail page — otherwise fall through
      // to a normal `q` search so the visitor sees the closest matches.
      try {
        const API = process.env.REACT_APP_BACKEND_URL + "/api";
        const lookupQ = v.replace(/\s+/g, "").toUpperCase();
        const r = await fetch(`${API}/listings?q=${encodeURIComponent(lookupQ)}&limit=2`);
        if (r.ok) {
          const j = await r.json();
          if (j && j.total === 1 && j.listings && j.listings[0] && j.listings[0].listing_key) {
            navigate(`/listing/${encodeURIComponent(j.listings[0].listing_key)}`);
            return;
          }
        }
      } catch { /* fall through to a generic q search */ }
    }
    // Everything else — including postal codes, addresses, MLS numbers
    // that didn't resolve to a single listing, and plain keywords — is
    // handed to the backend as `q`. The backend already handles all
    // four intents (postal code, MLS, street address, keyword) inside
    // its `q` router. Also CLEAR the `city` filter so a lingering city
    // value from a prior search doesn't intersect with the new intent.
    if (ctx?.setFilters && ctx?.runSearch) {
      const nextFilters = { ...(ctx.filters || {}), q: v, city: "" };
      ctx.setFilters(nextFilters);
      setTimeout(() => ctx.runSearch(nextFilters), 40);
      setVal("");
      return;
    }
    navigate(`/listings?q=${encodeURIComponent(v)}`);
  };

  // If the SearchFiltersContext isn't mounted (e.g. rendered outside the
  // Search section), collapse to a plain address-only bar so nothing throws.
  const hasCtx = !!ctx;
  const filters = ctx?.filters || {};

  return (
    <section
      data-testid="dash-unified-search-card"
      style={{
        marginBottom: 16,
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(15,42,91,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Row 1 — address / MLS input + Search button */}
      <form
        onSubmit={submit}
        data-testid="dash-address-mls-search"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 12px",
          borderBottom: hasCtx ? "1px solid #F1F5F9" : "none",
          position: "relative",
        }}
      >
        <Search size={18} style={{ color: C.blue, flexShrink: 0 }} aria-hidden="true"/>
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          data-testid="dash-address-mls-search-input"
          placeholder="Search by address, postal code, or MLS® number (e.g. 930 Josephine Rd · V6B 1A1 · R2812345)"
          aria-label="Search by address, postal code, or MLS number"
          style={{
            flex: 1, minWidth: 0, border: "none", outline: "none",
            fontSize: 14, color: C.ink, background: "transparent",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        />
        <ActiveFilterCount/>
        <InputVoiceMic
          onTranscript={(txt) => setVal(txt)}
          onFinalSubmit={(txt) => {
            // Route through the same submit heuristics (MLS → detail nav,
            // otherwise → city + runSearch). We build a synthetic event so
            // preventDefault() is safe to call.
            setVal(txt);
            setTimeout(() => submit({ preventDefault: () => {} }), 50);
          }}
        />
        <button
          type="submit"
          data-testid="dash-address-mls-search-submit"
          style={{
            background: C.navy, color: "#fff", border: "none",
            padding: "9px 18px", borderRadius: 8, fontWeight: 700,
            fontSize: 13, cursor: "pointer", flexShrink: 0,
          }}
        >Search</button>
      </form>

      {/* Row 2 — Doogie voice / type / reset strip. Uses the shared
          DoogieFilterHeader so the mic behaviour + safe error handling
          is identical to /listings. */}
      {hasCtx && (
        <DoogieFilterHeader
          onVoiceFilter={(f) => {
            const propMap = { Condo: "Apartment", Townhouse: "Row / Townhouse" };
            ctx.setFilters(prev => ({
              ...prev,
              city:         f.community || prev.city,
              propertyType: f.property_type ? (propMap[f.property_type] || f.property_type) : prev.propertyType,
              beds:         f.beds ? String(f.beds) : prev.beds,
              baths:        f.baths ? String(f.baths) : prev.baths,
              priceMin:     f.price_min ? String(f.price_min) : prev.priceMin,
              priceMax:     f.price_max ? String(f.price_max) : prev.priceMax,
              keyword:      f.keyword || prev.keyword,
            }));
            setTimeout(() => ctx.runSearch && ctx.runSearch(), 60);
          }}
          onReset={() => {
            ctx.setFilters(prev => ({
              ...prev,
              city: "", propertyType: "", beds: "", baths: "",
              priceMin: "", priceMax: "", keyword: "",
            }));
          }}
        />
      )}

      {/* Row 3 — inline filter fields. Everything visible, wraps naturally on
          narrow viewports; no popover. Same SearchFiltersContext as the
          old vertical FILTERS card. */}
      {hasCtx && (
        <div
          data-testid="dash-inline-filters"
          style={{
            display: "flex", flexWrap: "wrap", gap: 10,
            padding: "12px 14px",
            alignItems: "flex-end",
            background: "#FDFCF7",
          }}
        >
          <_Field label="Community / City" flex="1 1 200px">
            <input
              value={filters.city || ""}
              onChange={e => set("city", e.target.value)}
              placeholder="Any BC community or postal code (e.g. V3A)"
              data-testid="dash-search-city"
              style={_inp}
            />
          </_Field>
          <_Field label="Property Type" flex="1 1 150px">
            <select
              value={filters.propertyType || ""}
              onChange={e => set("propertyType", e.target.value)}
              data-testid="dash-search-property-type"
              style={_sel}
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
          </_Field>
          <_Field label="Min beds" flex="0 0 92px">
            <select value={filters.beds || ""} onChange={e => set("beds", e.target.value)} data-testid="dash-search-beds" style={_sel}>
              <option value="">Any</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </_Field>
          <_Field label="Min baths" flex="0 0 92px">
            <select value={filters.baths || ""} onChange={e => set("baths", e.target.value)} data-testid="dash-search-baths" style={_sel}>
              <option value="">Any</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </_Field>
          <_Field label="Min price" flex="1 1 130px">
            <input
              type="text" inputMode="numeric"
              value={formatMoney(filters.priceMin)}
              onChange={e => set("priceMin", digitsOnly(e.target.value))}
              placeholder="$ Any"
              data-testid="dash-search-price-min"
              style={_inp}
            />
          </_Field>
          <_Field label="Max price" flex="1 1 130px">
            <input
              type="text" inputMode="numeric"
              value={formatMoney(filters.priceMax)}
              onChange={e => set("priceMax", digitsOnly(e.target.value))}
              placeholder="$ Any"
              data-testid="dash-search-price-max"
              style={_inp}
            />
          </_Field>
          <_Field label="Keyword" flex="1 1 150px">
            <input
              value={filters.keyword || ""}
              onChange={e => set("keyword", e.target.value)}
              placeholder="e.g. waterfront"
              data-testid="dash-search-keyword"
              style={_inp}
            />
          </_Field>
          <_Field label="Sort by" flex="0 0 140px">
            <select
              value={filters.sort || "newest"}
              onChange={e => set("sort", e.target.value)}
              data-testid="dash-search-sort"
              style={_sel}
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
            </select>
          </_Field>
          <button
            type="button"
            onClick={() => ctx.runSearch && ctx.runSearch()}
            data-testid="dash-inline-filters-apply"
            style={{
              background: C.gold, color: C.navy, border: "none",
              padding: "9px 18px", borderRadius: 8, fontWeight: 800,
              fontSize: 13, cursor: "pointer", flex: "0 0 auto",
              marginBottom: 2,
            }}
          >Apply filters</button>
        </div>
      )}

      {/* Row 4 — active-filter chips (removable). Same behaviour as before. */}
      <div style={{ padding: "0 14px 12px" }}>
        <ActiveFilterChips/>
      </div>
    </section>
  );
};

// Compact label + child wrapper used by the inline filter row. Kept inline
// so we can pass a `flex` value per field to control wrapping.
const _Field = ({ label, flex, children }) => (
  <label style={{ flex, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: C.navy, letterSpacing: 0.2 }}>{label}</span>
    {children}
  </label>
);

const _inp = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1px solid #D1D5DB", background: "#fff", color: C.ink,
  fontSize: 13, fontWeight: 500, outline: "none", boxSizing: "border-box",
  fontFamily: "'Inter', system-ui, sans-serif",
};
const _sel = { ..._inp, appearance: "auto", cursor: "pointer" };

// Small pill that shows a numeric badge next to the Filters button when
// any non-default filter is active.
const ActiveFilterCount = () => {
  const ctx = useContext(SearchFiltersContext);
  const n = _countActiveFilters(ctx?.filters);
  if (!n) return null;
  return (
    <span
      data-testid="dash-active-filter-count"
      style={{
        background: C.gold, color: C.navy,
        borderRadius: 999, padding: "2px 8px",
        fontSize: 11, fontWeight: 800, flexShrink: 0,
      }}
    >{n} active</span>
  );
};

// Chips row — one removable chip per active filter. Clicking × clears the
// specific filter (or resets sort to "newest"), then re-runs the search.
const ActiveFilterChips = () => {
  const ctx = useContext(SearchFiltersContext);
  if (!ctx) return null;
  const { filters, setFilters, runSearch } = ctx;
  const chips = _describeActiveFilters(filters);
  if (!chips.length) return null;
  const clear = (keys) => {
    setFilters(prev => {
      const next = { ...prev };
      keys.forEach(k => { next[k] = k === "sort" ? "newest" : ""; });
      return next;
    });
    setTimeout(() => runSearch && runSearch(), 40);
  };
  return (
    <div
      data-testid="dash-active-filter-chips"
      style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}
    >
      {chips.map(c => (
        <button
          key={c.keys.join(",")}
          onClick={() => clear(c.keys)}
          data-testid={`dash-filter-chip-${c.keys[0]}`}
          style={{
            background: "#fff", border: `1px solid ${C.gold}`,
            color: C.navy, borderRadius: 999,
            padding: "4px 10px 4px 12px", fontSize: 12, fontWeight: 600,
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {c.label}
          <span aria-hidden style={{ color: C.muted, fontWeight: 800 }}>×</span>
        </button>
      ))}
      <button
        onClick={() => clear(["city", "propertyType", "beds", "baths", "priceMin", "priceMax", "keyword", "sort"])}
        data-testid="dash-filter-chip-clear-all"
        style={{
          background: "transparent", border: "none", color: C.muted,
          fontSize: 12, cursor: "pointer", textDecoration: "underline",
          padding: "4px 6px",
        }}
      >Clear all</button>
    </div>
  );
};

// Shared button style for Filters + Doogie in the unified bar.
const _countActiveFilters = (f) => {
  if (!f) return 0;
  const keys = ["city", "propertyType", "beds", "baths", "priceMin", "priceMax", "keyword"];
  let n = 0;
  for (const k of keys) if (f[k]) n += 1;
  if (f.sort && f.sort !== "newest") n += 1;
  return n;
};

const _describeActiveFilters = (f) => {
  if (!f) return [];
  const out = [];
  if (f.city)         out.push({ keys: ["city"],         label: `📍 ${f.city}` });
  if (f.propertyType) out.push({ keys: ["propertyType"], label: `🏠 ${f.propertyType}` });
  if (f.beds)         out.push({ keys: ["beds"],         label: `${f.beds}+ beds` });
  if (f.baths)        out.push({ keys: ["baths"],        label: `${f.baths}+ baths` });
  if (f.priceMin || f.priceMax) {
    const lo = f.priceMin ? `$${Number(f.priceMin).toLocaleString()}` : "$0";
    const hi = f.priceMax ? `$${Number(f.priceMax).toLocaleString()}` : "any";
    out.push({ keys: ["priceMin", "priceMax"], label: `${lo} – ${hi}` });
  }
  if (f.keyword)      out.push({ keys: ["keyword"],      label: `“${f.keyword}”` });
  if (f.sort && f.sort !== "newest") {
    const sortLabel = { price_asc: "Price ↑", price_desc: "Price ↓" }[f.sort] || f.sort;
    out.push({ keys: ["sort"], label: `Sort: ${sortLabel}` });
  }
  return out;
};


// ── Floating "Compare (N)" tray ────────────────────────────────────────────
// Shows a fixed bottom-right pill whenever the user has ≥1 listing in the
// compare set. Tapping it opens /compare (which reads the same
// localStorage key). Listens to the `ez-compare-changed` window event fired
// by ListingCard's toggle so the count updates instantly without polling.
const CompareTray = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ez_compare_keys") || "[]"); }
    catch { return []; }
  });
  useEffect(() => {
    const onChange = (e) => setKeys(Array.isArray(e.detail) ? e.detail : []);
    window.addEventListener("ez-compare-changed", onChange);
    return () => window.removeEventListener("ez-compare-changed", onChange);
  }, []);
  if (!keys.length) return null;
  const clear = (e) => {
    e.stopPropagation();
    localStorage.setItem("ez_compare_keys", "[]");
    setKeys([]);
    window.dispatchEvent(new CustomEvent("ez-compare-changed", { detail: [] }));
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate("/compare")}
      onKeyDown={(e) => { if (e.key === "Enter") navigate("/compare"); }}
      data-testid="dash-compare-tray"
      style={{
        position: "fixed", right: 20, bottom: 84, zIndex: 85,
        background: C.navy, color: "#fff",
        padding: "10px 14px 10px 16px", borderRadius: 999,
        boxShadow: "0 10px 24px rgba(15,42,91,0.35)",
        cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
        display: "inline-flex", alignItems: "center", gap: 12,
        fontSize: 13, fontWeight: 700,
        border: `2px solid ${C.gold}`,
      }}
    >
      <span aria-hidden>⇄</span>
      <span>Compare <strong>{keys.length}</strong> listing{keys.length === 1 ? "" : "s"}</span>
      <button
        onClick={clear}
        aria-label="Clear comparison"
        data-testid="dash-compare-tray-clear"
        style={{
          background: "rgba(255,255,255,0.15)", color: "#fff",
          border: "none", width: 22, height: 22, borderRadius: 999,
          cursor: "pointer", display: "grid", placeItems: "center",
          fontSize: 12, lineHeight: 1,
        }}
      >×</button>
    </div>
  );
};



const ResultsGrid = ({ results, loading, hoveredKey, onHoverKey, onFocusMap }) => {
  if (loading && !results) return <SkeletonGrid/>;
  const rows = (results?.listings || []);
  if (!rows.length) return (
    <PlayfulEmptyState
      title="Nothing exactly matches — yet."
      subtitle="Try widening a filter, or let me alert you the moment one appears."
      ctaLabel="Set up a Doogie alert"
      ctaHref="/newsletter"
      testid="dash-search-empty"
    />
  );
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

// Clickable property-intel badge — tap the current class to open a small
// popover with alternatives. Picking one pivots the whole Sync panel by
// updating the filter's propertyType + re-running the search.
// Pivot options — `filter` is the exact value set on filters.propertyType,
// matching the SidebarFilters <select> options so the pivot round-trips
// through /api/listings + /api/doogie/sync-search correctly.
const _PROPERTY_INTEL_OPTIONS = [
  { key: "detached",         label: "Detached House", filter: "House" },
  { key: "condo",            label: "Condo",          filter: "Apartment" },
  { key: "townhouse",        label: "Townhome",       filter: "Row / Townhouse" },
  { key: "acreage",          label: "Acreage",        filter: "Vacant Land",   keyword: "acreage" },
  { key: "waterfront",       label: "Waterfront",     filter: "",              keyword: "waterfront" },
  { key: "equestrian",       label: "Equestrian",     filter: "",              keyword: "equestrian" },
  { key: "new-construction", label: "New Build",      filter: "",              keyword: "new construction" },
];

const PropertyIntelPivotBadge = ({ intelKey }) => {
  const ctx = useContext(SearchFiltersContext);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);
  const current = _PROPERTY_INTEL_OPTIONS.find(o => o.key === intelKey) || { label: intelKey.replace(/-/g, " ") };
  const pivotTo = (opt) => {
    if (!ctx?.setFilters) return;
    const nextFilters = {
      propertyType: opt.filter || "",
      keyword: opt.keyword || (opt.filter ? "" : undefined),
    };
    ctx.setFilters(prev => ({
      ...prev,
      propertyType: nextFilters.propertyType,
      keyword: nextFilters.keyword !== undefined ? nextFilters.keyword : prev.keyword,
    }));
    // Seed the sync engine's query with the new property class so intent
    // detection lands on 'buy' and the correct intel pack loads.
    try { ctx.setSyncQuery?.(opt.label.toLowerCase()); } catch {}
    // Pass overrides directly to bypass the stale-closure issue — runSearch
    // reads the current `filters` state which hasn't been updated yet.
    setTimeout(() => { try { ctx.runSearch?.(nextFilters); } catch {} }, 30);
    setOpen(false);
  };
  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        data-testid="sync-intel-badge"
        title="Tap to pivot the panel to another property class"
        style={{
          background: C.brandGold, color: C.navy, fontSize: 10, fontWeight: 800,
          padding: "3px 9px", borderRadius: 999, textTransform: "uppercase",
          letterSpacing: 0.5, border: "none", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}
      >
        {current.label}
        <span aria-hidden="true" style={{ fontSize: 8, opacity: 0.75, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
      </button>
      {open && (
        <div
          data-testid="sync-intel-popover"
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 500,
            background: "#fff", border: `1px solid ${C.brandGold}`, borderRadius: 10,
            boxShadow: "0 10px 24px rgba(15,42,91,0.18)", minWidth: 180, padding: 4,
          }}
        >
          <div style={{ fontSize: 9, color: C.muted, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", padding: "6px 10px 3px" }}>
            Pivot to…
          </div>
          {_PROPERTY_INTEL_OPTIONS.map(opt => {
            const active = opt.key === intelKey;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={active}
                onClick={() => pivotTo(opt)}
                data-testid={`sync-intel-option-${opt.key}`}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "7px 10px", borderRadius: 6, border: "none",
                  background: active ? C.mist : "transparent",
                  color: active ? C.muted : C.navy,
                  fontSize: 12, fontWeight: active ? 800 : 600,
                  cursor: active ? "default" : "pointer",
                }}
                onMouseOver={(e) => { if (!active) e.currentTarget.style.background = C.mist; }}
                onMouseOut={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {active ? "✓ " : ""}{opt.label}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
};

const SyncedResults = () => {
  const ctx = useContext(SearchFiltersContext);
  const sync = ctx?.sync;
  const loading = ctx?.syncLoading;
  const voiceNonce = ctx?.voiceTriggerNonce || 0;
  const muted = useDoogieMuted();
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const lastAutoPlayedNonce = useRef(-1);
  const summary = sync?.spoken_summary || "";

  // Fetch + play the TTS summary. Cached server-side per SHA(text|voice|model)
  // so replays and repeated searches are free after the first call.
  const speakSummary = async () => {
    if (!summary) return;
    setTtsError("");
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current = null;
    }
    setTtsLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      // Fast path: prepare → GET-by-cache-key so <audio src> streams
      // progressively and re-plays hit the browser HTTP cache.
      const prep = await fetch(`${backendUrl}/api/doogie/tts/prepare`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary, voice: "ash" }),
      });
      if (!prep.ok) throw new Error(`TTS prepare failed (${prep.status})`);
      const { audio_url, cache } = await prep.json();
      const url = `${backendUrl}${audio_url}${cache === "HIT" ? "" : "?wait=1"}`;
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = url;
      try { audio.playbackRate = getDoogieSpeed(); } catch {}
      audio.onplay = () => setPlaying(true);
      audio.onended = () => { setPlaying(false); };
      audio.onerror = () => { setPlaying(false); setTtsError("Playback failed."); };
      audioRef.current = audio;
      const tryPlay = () => audio.play().catch(() => setTtsError("Playback failed."));
      if (audio.readyState >= 2) tryPlay(); else audio.oncanplay = tryPlay;
    } catch (e) {
      setTtsError(e.message || "TTS unavailable.");
      setPlaying(false);
    } finally {
      setTtsLoading(false);
    }
  };
  const stopSummary = () => {
    try { audioRef.current?.pause(); } catch {}
    setPlaying(false);
  };

  // Auto-play once per voice-triggered search, when the payload has actually
  // populated with a summary AND the user has not muted Doogie in the
  // sidebar toggle. Manual filter applies (no voice) never auto-play.
  useEffect(() => {
    if (!summary) return;
    if (!voiceNonce || voiceNonce === lastAutoPlayedNonce.current) return;
    if (muted) return;
    lastAutoPlayedNonce.current = voiceNonce;
    // Tiny delay lets the panel finish mounting before audio starts.
    const t = setTimeout(() => { speakSummary(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, voiceNonce, muted]);

  // Cleanup on unmount — never leave audio playing after nav away.
  useEffect(() => () => { try { audioRef.current?.pause(); } catch {} }, []);

  // Welcome-back greeting for returning visitors. Fires once per browser
  // session (sessionStorage flag) when ALL of these are true:
  //   • ctx.wasRestored — the current filters were rehydrated from
  //     localStorage on this mount (not manually typed or voice-set)
  //   • sync payload has arrived — so what Doogie says matches what's on
  //     screen (community + property class)
  //   • useDoogieMuted() is false — the visitor has voice on in the sidebar
  //   • voiceNonce is 0 — no voice/text search has fired yet this mount
  //     (avoids two clips playing over each other)
  // Compliance:
  //   • CASL — TTS on-device audio in response to visitor action is NOT a
  //     commercial electronic message; no consent needed. Copy is factual,
  //     no promotion.
  //   • PIPA — text sent to OpenAI TTS is filter facts only (community,
  //     property class). No name, email, phone, IP or PII. Cross-border
  //     transfer is the SAME as the existing TTS pipeline (no new surface).
  //   • BCFSA — text never recommends buying/selling, never interprets the
  //     market, ends with the informational-only disclaimer.
  useEffect(() => {
    if (!sync || !ctx?.wasRestored) return;
    if (muted) return;
    if (voiceNonce) return;
    let alreadyGreeted = false;
    try { alreadyGreeted = sessionStorage.getItem("ez_dash_return_greeted") === "1"; } catch {}
    if (alreadyGreeted) return;

    // Compose a compliance-safe greeting from the current sync payload.
    const community = sync.community || "";
    const intelLabel = (_PROPERTY_INTEL_OPTIONS.find(o => o.key === sync.property_intel) || {}).label || "";
    const bits = [];
    if (community && intelLabel) {
      bits.push(`Welcome back. I've reloaded your ${community} ${intelLabel.toLowerCase()} search.`);
    } else if (community) {
      bits.push(`Welcome back. I've reloaded your ${community} search.`);
    } else if (intelLabel) {
      bits.push(`Welcome back. I've reloaded your ${intelLabel.toLowerCase()} search.`);
    } else {
      bits.push("Welcome back. I've reloaded your last EZtoFind search.");
    }
    bits.push("Take another look — everything shown is informational only.");
    const greeting = bits.join(" ");

    try { sessionStorage.setItem("ez_dash_return_greeted", "1"); } catch {}

    // Play through the same TTS pipeline as the summary. We fetch a fresh
    // clip rather than reusing summary audio so the wording is right.
    const t = setTimeout(async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL;
        const prep = await fetch(`${backendUrl}/api/doogie/tts/prepare`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: greeting, voice: "ash" }),
        });
        if (!prep.ok) return;
        const { audio_url, cache } = await prep.json();
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = `${backendUrl}${audio_url}${cache === "HIT" ? "" : "?wait=1"}`;
        try { audio.playbackRate = getDoogieSpeed(); } catch {}
        const tryPlay = () => audio.play().catch(() => {});
        if (audio.readyState >= 2) tryPlay(); else audio.oncanplay = tryPlay;
      } catch { /* silently swallow — greeting is a nice-to-have, never blocking */ }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync, muted, voiceNonce]);

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
          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {summary && (
              <button
                type="button"
                onClick={playing ? stopSummary : speakSummary}
                disabled={ttsLoading}
                data-testid="sync-play-summary"
                title={playing ? "Stop Doogie's summary" : "Hear Doogie summarize these results"}
                style={{
                  background: playing ? "#DC2626" : C.navy, color: "#fff",
                  border: "none", borderRadius: 999, padding: "5px 11px",
                  fontSize: 10.5, fontWeight: 800, cursor: ttsLoading ? "wait" : "pointer",
                  letterSpacing: 0.5, textTransform: "uppercase",
                  display: "inline-flex", alignItems: "center", gap: 5,
                  opacity: ttsLoading ? 0.6 : 1,
                }}
              >
                {ttsLoading ? "…" : playing ? "■ Stop" : "▶ Play summary"}
              </button>
            )}
            {sync?.property_intel && (
              <PropertyIntelPivotBadge intelKey={sync.property_intel}/>
            )}
            {sync?.community && (
              <span data-testid="sync-community-badge" style={{ background: "#ECFDF5", color: "#047857", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5, border: "1px solid #A7F3D0" }}>
                📍 {sync.community}
              </span>
            )}
          </div>
        </div>
        {(playing || ttsError) && (
          <div data-testid="sync-summary-caption" style={{ marginTop: 10, padding: "8px 12px", background: playing ? "#F5F9FF" : "#FEF2F2", border: `1px solid ${playing ? "#DBEAFE" : "#FECACA"}`, borderRadius: 8, fontSize: 12, color: playing ? C.navy : "#B91C1C", lineHeight: 1.5 }}>
            {playing ? <><strong>Doogie:</strong> {summary}</> : ttsError}
          </div>
        )}
      </header>
      {sync?.out_of_area && (
        <div
          data-testid="sync-out-of-area-bridge"
          style={{
            marginBottom: 14, padding: "12px 16px",
            background: "linear-gradient(90deg,#FEF3C7,#FDE68A)",
            border: `1px solid ${C.brandGold}`, borderRadius: 10,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            gap: 12, flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 260px" }}>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", color: C.navy, fontSize: 15, fontWeight: 700, marginBottom: 3 }}>
              🌉 Searching outside Doug's direct area?
            </div>
            <div style={{ fontSize: 12, color: C.navy, lineHeight: 1.5 }}>
              You mentioned <strong>{sync.out_of_area.city}</strong>, which sits outside Doug's BCFSA-licensed service area. <strong>Would you like Doug to have a local REALTOR® contact you?</strong> Doug hand-picks a BCFSA-licensed local from his vetted referral network — $0 cost to you, you approve every intro, no CASL spam.
            </div>
          </div>
          <Link
            to={`/referral-request?city=${encodeURIComponent(sync.out_of_area.city)}`}
            data-testid="sync-out-of-area-cta"
            style={{
              background: C.navy, color: "#fff", padding: "8px 16px", borderRadius: 999,
              fontSize: 12, fontWeight: 800, letterSpacing: 0.3, textDecoration: "none",
              display: "inline-block", whiteSpace: "nowrap",
            }}
          >
            🤝 Get a local REALTOR® referral →
          </Link>
        </div>
      )}
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

// Idle save-search nudge — soft, dismissible prompt that appears 45 seconds
// after the visitor stops interacting with the page. Respects a per-session
// dismissed flag so it never re-appears in the same tab. CASL-safe: the CTA
// links to /listings with `#save-search` which opens the SavedSearchModal
// where the visitor grants CASL + PIPA consent BEFORE any email is stored.
const IdleSaveSearchNudge = () => {
  const ctx = useContext(SearchFiltersContext);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("ez_dash_idle_nudge_dismissed") === "1"; } catch { return false; }
  });
  const timerRef = useRef(null);
  const resetTimer = () => {
    if (dismissed || show) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(true), 45000);
  };
  useEffect(() => {
    if (dismissed) return;
    const evts = ["mousemove", "keydown", "scroll", "touchstart"];
    evts.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      evts.forEach(ev => window.removeEventListener(ev, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed, show]);

  const dismiss = () => {
    setShow(false);
    setDismissed(true);
    try { sessionStorage.setItem("ez_dash_idle_nudge_dismissed", "1"); } catch {}
  };
  const filters = ctx?.filters;
  // Build a /listings query string that mirrors the current dashboard filters,
  // then append #save-search so /listings auto-opens the alerts modal.
  const savedSearchUrl = (() => {
    const params = new URLSearchParams();
    if (filters?.city) params.set("city", filters.city);
    if (filters?.propertyType) params.set("property_type", filters.propertyType);
    if (filters?.beds) params.set("beds_min", filters.beds);
    if (filters?.baths) params.set("baths_min", filters.baths);
    if (filters?.priceMin) params.set("price_min", filters.priceMin);
    if (filters?.priceMax) params.set("price_max", filters.priceMax);
    if (filters?.keyword) params.set("features", filters.keyword);
    const qs = params.toString();
    return `/listings${qs ? `?${qs}` : ""}#save-search`;
  })();

  if (!show || dismissed) return null;
  return (
    <div
      data-testid="idle-save-search-nudge"
      role="dialog"
      aria-labelledby="idle-nudge-title"
      style={{
        position: "fixed", right: 20, bottom: 100, zIndex: 450,
        background: "#fff", border: `2px solid ${C.brandGold}`, borderRadius: 14,
        boxShadow: "0 16px 40px rgba(15,42,91,0.28)",
        padding: "14px 16px 12px", maxWidth: 320,
        animation: "doogie-fade-in 0.35s ease-out",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div id="idle-nudge-title" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: C.navy, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
          🐾 Want me to save this search?
        </div>
        <button
          type="button"
          onClick={dismiss}
          data-testid="idle-nudge-close"
          aria-label="Dismiss"
          style={{ background: "transparent", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}
        >×</button>
      </div>
      <div style={{ fontSize: 12, color: C.navy, marginTop: 6, lineHeight: 1.5 }}>
        I can email you when new BC listings match — no spam, unsubscribe any time. You'll grant CASL + PIPA consent on the next screen.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Link
          to={savedSearchUrl}
          onClick={dismiss}
          data-testid="idle-nudge-cta"
          style={{
            flex: 1, background: C.navy, color: "#fff", textAlign: "center",
            padding: "8px 12px", borderRadius: 999, textDecoration: "none",
            fontSize: 12, fontWeight: 800, letterSpacing: 0.3,
          }}
        >Yes, save it</Link>
        <button
          type="button"
          onClick={dismiss}
          data-testid="idle-nudge-later"
          style={{
            background: "transparent", border: `1px solid ${C.muted}`, color: C.muted,
            padding: "8px 12px", borderRadius: 999, cursor: "pointer",
            fontSize: 12, fontWeight: 700,
          }}
        >Not now</button>
      </div>
      <style>{`@keyframes doogie-fade-in { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: translateY(0);} }`}</style>
    </div>
  );
};

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
  // Match the community detail page's rendering: `white-space: pre-wrap`
  // preserves the DB's \n\n paragraph breaks natively without needing to
  // split. Prevents the "wall of text" bug where every paragraph collapsed
  // into one blob with no breathing room.
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {profile.synopsis && (
      <p
        data-testid="sync-community-synopsis"
        style={{
          margin: 0, color: C.navy, fontSize: 13, lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}
      >{profile.synopsis}</p>
    )}
    {profile.region && (
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Region: <strong style={{ color: C.navy }}>{profile.region}</strong></div>
    )}
    <Link to={profile.href} style={{ color: C.blue, fontWeight: 700, fontSize: 12, textDecoration: "none", marginTop: 4 }} data-testid="sync-community-profile-link">
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
  // Compare selection — mirrors localStorage state used by CompareListings page.
  const [inCompare, setInCompare] = useState(false);
  useEffect(() => {
    try {
      const keys = JSON.parse(localStorage.getItem("ez_compare_keys") || "[]");
      setInCompare(Array.isArray(keys) && keys.includes(l.listing_key));
    } catch {}
  }, [l.listing_key]);
  const toggleCompare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const keys = JSON.parse(localStorage.getItem("ez_compare_keys") || "[]");
      const has = keys.includes(l.listing_key);
      let next;
      if (has) {
        next = keys.filter(k => k !== l.listing_key);
      } else {
        if (keys.length >= 5) {
          alert("You can compare up to 5 listings at a time. Remove one first.");
          return;
        }
        next = [...keys, l.listing_key];
      }
      localStorage.setItem("ez_compare_keys", JSON.stringify(next));
      setInCompare(!has);
      // Broadcast to the floating tray so it re-reads without polling.
      window.dispatchEvent(new CustomEvent("ez-compare-changed", { detail: next }));
    } catch {}
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
          onClick={toggleCompare}
          data-testid={`dash-listing-compare-${l.listing_key}`}
          aria-label={inCompare ? "Remove from comparison" : "Add to comparison (up to 5)"}
          title={inCompare ? "In comparison · click to remove" : "Add to comparison"}
          style={{
            position: "absolute", left: 8, top: 8,
            padding: "4px 10px", borderRadius: 999, border: "none", cursor: "pointer",
            background: inCompare ? C.navy : "rgba(255,255,255,0.95)",
            color: inCompare ? "#fff" : C.navy,
            fontSize: 11, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {inCompare ? "✓ Compare" : "+ Compare"}
        </button>
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
  const navigate = useNavigate();
  const [homes, setHomes] = useState([]);
  const [searches, setSearches] = useState([]);
  // Bulk-select set for the "Compare selected" action. Capped at 5 to mirror
  // the CompareListings page — the UI blocks the 6th click so it's impossible
  // to overshoot before hitting Compare.
  const [selected, setSelected] = useState(() => new Set());
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
      setSelected(prev => { const n = new Set(prev); n.delete(key); return n; });
    } catch {}
  };
  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); return next; }
      if (next.size >= 5) {
        alert("You can compare up to 5 homes at a time. Deselect one first.");
        return prev;
      }
      next.add(key);
      return next;
    });
  };
  const selectAllForCompare = () => {
    // Grab the first 5 saved keys (max compare) and route to /compare.
    const keys = homes.slice(0, 5).map(h => h.listing_key);
    if (!keys.length) return;
    setSelected(new Set(keys));
    localStorage.setItem("ez_compare_keys", JSON.stringify(keys));
    window.dispatchEvent(new CustomEvent("ez-compare-changed", { detail: keys }));
    navigate("/compare");
  };
  const compareSelected = () => {
    const keys = Array.from(selected);
    if (keys.length < 2) {
      alert("Pick at least 2 saved homes to compare.");
      return;
    }
    localStorage.setItem("ez_compare_keys", JSON.stringify(keys));
    window.dispatchEvent(new CustomEvent("ez-compare-changed", { detail: keys }));
    navigate("/compare");
  };
  return (
    <div>
      <PanelIntro title="Saved Homes & Searches" blurb="Tap the ❤ on any listing card to save it here. Search chips you starred on the Visual Agent also live in this dashboard."/>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 24, marginBottom: 10 }}>
        <h3 style={{ color: C.navy, margin: 0, flex: "1 1 auto" }}>Saved homes ({homes.length})</h3>
        {homes.length >= 2 && (
          <>
            <button
              onClick={selectAllForCompare}
              data-testid="dash-saved-compare-all"
              title="Select the first 5 saved homes and open comparison"
              style={{
                background: "#fff", color: C.navy, border: `1px solid ${C.gold}`,
                padding: "8px 14px", borderRadius: 999, cursor: "pointer",
                fontSize: 12, fontWeight: 700,
              }}
            >Select all to compare</button>
            <button
              onClick={compareSelected}
              disabled={selected.size < 2}
              data-testid="dash-saved-compare-selected"
              style={{
                background: selected.size >= 2 ? C.navy : "#9CA3AF",
                color: "#fff", border: "none",
                padding: "8px 14px", borderRadius: 999,
                cursor: selected.size >= 2 ? "pointer" : "not-allowed",
                fontSize: 12, fontWeight: 700,
              }}
            >⇄ Compare selected ({selected.size})</button>
          </>
        )}
      </div>
      {homes.length === 0
        ? <EmptyBox>Nothing saved yet — tap the ❤ on any listing card to add it here.</EmptyBox>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {homes.map(h => {
              const isSel = selected.has(h.listing_key);
              return (
              <div key={h.listing_key} data-testid={`dash-saved-home-${h.listing_key}`} style={{
                background: "#fff", borderRadius: 12,
                border: isSel ? `2px solid ${C.gold}` : "1px solid #E5E7EB",
                overflow: "hidden", position: "relative",
              }}>
                <div style={{ height: 140, background: h.cover ? `url(${h.cover}) center/cover` : C.mist }}/>
                {/* Bulk-compare checkbox — top-left so it doesn't collide
                    with the existing remove button (top-right). */}
                <button
                  onClick={() => toggleSelect(h.listing_key)}
                  data-testid={`dash-saved-select-${h.listing_key}`}
                  aria-label={isSel ? "Deselect from comparison" : "Select for comparison"}
                  style={{
                    position: "absolute", left: 8, top: 8,
                    padding: "3px 9px", borderRadius: 999, border: "none",
                    background: isSel ? C.navy : "rgba(255,255,255,0.95)",
                    color: isSel ? "#fff" : C.navy,
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >{isSel ? "✓ Selected" : "+ Select"}</button>
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
              );
            })}
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
        <img loading="lazy" decoding="async" src={DOOGIE.celebrating} alt="Doogie celebrating"
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
        <img loading="lazy" decoding="async" src={DOOGIE.pointingLeft} alt="Doogie pointing"
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
              <img loading="lazy" decoding="async" src={DOOGIE.thinking} alt="Doogie thinking"
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
//   The Home button ALWAYS returns the visitor to a clean starting state:
//   clears filters, resets to the search section, and (if we're already on
//   the dashboard) does not stack a duplicate route in browser history.
const DashboardBackHomeBar = ({ resetHome }) => {
  const nav = useNavigate();
  const isMobile = useIsMobile(600);
  const goHome = (e) => {
    if (typeof resetHome === "function") {
      // We're already inside the dashboard — reset in-place so filters clear
      // and the section returns to search without a wasted route change.
      e.preventDefault();
      resetHome();
    }
  };
  return (
    <div data-testid="dash-back-home-bar" style={{
      background: "#fff", borderBottom: "1px solid rgba(15,42,91,0.06)",
      padding: isMobile ? "6px 12px" : "8px 32px",
      display: "flex", gap: isMobile ? 6 : 8, alignItems: "center",
      flexWrap: "wrap",
    }}>
      <button onClick={() => nav(-1)} data-testid="dash-btn-back" style={{
        background: "transparent", border: "1px solid #DDE6FA", color: C.navy,
        padding: isMobile ? "4px 10px" : "5px 14px", borderRadius: 999,
        fontSize: isMobile ? 12 : 13, fontWeight: 700,
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
      }}>← Back</button>
      <Link to="/" onClick={goHome} data-testid="dash-btn-home" style={{
        background: "transparent", border: "1px solid #DDE6FA", color: C.navy,
        padding: isMobile ? "4px 10px" : "5px 14px", borderRadius: 999,
        fontSize: isMobile ? 12 : 13, fontWeight: 700,
        textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4,
      }}>🏠 Home</Link>
      <Link to="/realtor-network" data-testid="dash-btn-realtor-network" style={{
        marginLeft: "auto",
        color: C.gold, background: C.navy,
        padding: isMobile ? "4px 10px" : "5px 14px", borderRadius: 999,
        fontSize: isMobile ? 11 : 13, fontWeight: 800,
        textDecoration: "none", display: "inline-flex", alignItems: "center",
        letterSpacing: 0.3,
      }}>{isMobile ? "REALTOR® Net" : "REALTOR® Network"}</Link>
    </div>
  );
};


const HomeComplianceBanner = () => {
  const isMobile = useIsMobile(600);
  return (
    <div data-testid="dash-home-compliance-banner" style={{
      background: "#FBF6E7", borderBottom: "1px solid rgba(245,166,35,0.30)",
      padding: isMobile ? "8px 12px" : "10px 32px",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: C.ink, fontSize: isMobile ? 11 : 12.5,
      lineHeight: isMobile ? 1.4 : 1.5, textAlign: "center",
    }}>
      {isMobile ? (
        <>
          <strong style={{ color: C.navy }}>EZtoFind.ca</strong> — general BC real estate info only. <em>Not</em> legal, tax, or financial advice.
        </>
      ) : (
        <><strong style={{ color: C.navy }}>EZtoFind.ca</strong> provides general educational information about BC real estate — <em>not</em> legal, tax, financial, or real estate advice. For your own situation, speak with the appropriate licensed professional: a BC lawyer or notary, an accountant or tax professional, a licensed mortgage broker, or a licensed REALTOR®.</>
      )}
    </div>
  );
};

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
    { icon: "🛡️", label: "Licensed REALTOR®",  sub: "Fraser Property Management Realty Services Ltd." },
    { icon: "📍", label: "Local Expert",       sub: "Greater Vancouver, Fraser Valley, Sea to Sky Corridor" },
    { icon: "⏱️", label: "13 Years",           sub: "BC Real Estate Experience" },
  ];
  return (
    <div style={wrap} data-testid="dash-home-extras">
      {/* Item #38 · Weekly Just-Sold Digest signup — the primary
          return-visit hook. Every Friday morning subscribers get a
          curated list of BC listings that closed in the last 7 days
          matching their area. Double-opt-in (CASL) via existing
          /api/saved-searches endpoint with frequency=weekly_just_sold. */}
      <section style={{ ...cardShell, background:"#0F2A5B", color:"white", borderColor:"transparent" }} data-testid="dash-home-weekly-digest-slot">
        <WeeklyDigestSignup variant="banner"/>
      </section>

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
    <img loading="lazy" decoding="async" src={DOOGIE.thinking} alt="Doogie thinking"
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
