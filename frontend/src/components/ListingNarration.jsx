// ============================================================================
//  ListingNarration — a Doogie-voice narrator for individual BC listings.
//  Renders a blue pill on the ListingDetail page ("Have Doogie walk me through
//  this home"). On click, builds a compliance-safe script from the listing's
//  CREA fields (address, beds/baths, price, tour flag, photo count) plus a
//  generic buyer checklist (roof / mechanicals / strata) — never a value
//  opinion. Ends with a CTA to Doug if the listing is in his service area.
// ============================================================================
import React, { useMemo, useRef, useState } from "react";
import { Play, Pause, StopCircle } from "lucide-react";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SERVICE_AREA_CITIES = new Set([
  "vancouver", "burnaby", "richmond", "surrey", "coquitlam", "port coquitlam",
  "port moody", "delta", "new westminster", "north vancouver", "west vancouver",
  "maple ridge", "pitt meadows", "langley", "abbotsford", "chilliwack",
  "mission", "hope", "harrison hot springs", "kent", "squamish", "whistler",
  "pemberton", "furry creek", "britannia beach",
]);

const _isInServiceArea = (city) => {
  if (!city) return false;
  return SERVICE_AREA_CITIES.has(String(city).trim().toLowerCase());
};

// Compose a compliance-safe narration script from a CREA listing document.
const _buildScript = (l) => {
  if (!l) return "";
  const parts = [];
  const addr = l.street_address || l.unparsed_address || "this property";
  const city = l.city || "British Columbia";
  parts.push(`Woof! Let me walk you through ${addr}, in ${city}.`);
  const beds = l.beds != null ? `${l.beds} bed` : null;
  const baths = l.baths != null ? `${l.baths} bath` : null;
  const half  = l.half_baths ? ` plus ${l.half_baths} half` : "";
  const pt = (l.property_type || "").toLowerCase() || "home";
  const price = l.list_price ? `$${Number(l.list_price).toLocaleString()}` : null;
  const spec = [beds, baths ? `${baths}${half}` : null].filter(Boolean).join(", ");
  if (spec && price) parts.push(`It's a ${spec} ${pt} listed at ${price}.`);
  else if (price)    parts.push(`It's listed at ${price}.`);
  else if (spec)     parts.push(`It's a ${spec} ${pt}.`);
  if (l.living_area_sqft) parts.push(`Living area is about ${Math.round(l.living_area_sqft).toLocaleString()} square feet.`);
  if (l.year_built)       parts.push(`Built in ${l.year_built}.`);
  const photoCount = (l.photos || []).length;
  const hasTour = !!(l.virtual_tour_embed?.url || l.has_virtual_tour);
  if (hasTour && photoCount) parts.push(`This listing has a virtual tour plus ${photoCount} photos.`);
  else if (hasTour)          parts.push(`This listing has a virtual tour.`);
  else if (photoCount)       parts.push(`This listing has ${photoCount} photos to browse.`);
  // Generic buyer checklist — no value opinion, just categories to research.
  const checklist = [];
  if (l.year_built && (2026 - l.year_built) > 30) checklist.push("the roof and mechanicals given its age");
  else checklist.push("the mechanicals and warranty status");
  if (/apartment|condo|strata|townhouse|row/i.test(pt)) checklist.push("the strata's depreciation report and monthly fees");
  else checklist.push("the property lines and any easements");
  parts.push(`When you view any home, remember to check ${checklist.join(", and ")}.`);
  parts.push(`This is general information only, not advice. For value or fit, always talk to a REALTOR.`);
  if (_isInServiceArea(l.city)) {
    parts.push(`Want to see this one in person? Ask Doug for a viewing — he's licensed for this area.`);
  }
  return parts.join(" ");
};

export default function ListingNarration({ listing }) {
  const [state, setState] = useState("idle"); // idle | loading | playing | paused
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const inServiceArea = _isInServiceArea(listing?.city);
  const script = useMemo(() => _buildScript(listing), [listing]);

  const play = async () => {
    if (state === "playing") { audioRef.current?.pause(); setState("paused"); return; }
    if (state === "paused")  { audioRef.current?.play(); setState("playing"); return; }
    // Fresh play — fetch TTS, load into <audio>, and start.
    setState("loading");
    try {
      const r = await fetch(`${API}/doogie/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script, voice: "ash" }),
      });
      if (!r.ok) throw new Error(`tts ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
        setState("playing");
      }
    } catch {
      setState("idle");
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState("idle");
  };

  if (!listing) return null;
  const label = state === "loading" ? "Loading Doogie's voice…"
              : state === "playing" ? "Pause narration"
              : state === "paused"  ? "Resume narration"
              : "Have Doogie walk me through this home";
  const Icon = state === "playing" ? Pause : Play;

  return (
    <div style={{ marginTop: "1.25rem" }} data-testid="listing-narration">
      <div style={{
        background: "#F0F4FB", border: "1px solid #DDE6FA", borderRadius: 12,
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <img
          src="/doogie/thinking.png"
          alt="Doogie"
          data-testid="listing-narration-mascot"
          style={{ width: 56, height: 56, flexShrink: 0, filter: "drop-shadow(0 2px 6px rgba(15,42,91,0.18))" }}
          onError={e => { e.currentTarget.style.display = "none"; }}
        />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, color: "#0F2A5B", fontSize: 15 }}>
            Doogie's narration
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, lineHeight: 1.4 }}>
            A quick voice walk-through of this listing — general info only, never a value opinion.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={play}
            disabled={state === "loading"}
            data-testid="listing-narration-play"
            style={{
              background: "var(--brand-blue, #0A3D99)", color: "#fff",
              border: "none", borderRadius: 999, cursor: state === "loading" ? "wait" : "pointer",
              padding: "10px 18px", fontWeight: 700, fontSize: 13,
              display: "inline-flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 12px rgba(10,61,153,0.28)",
              opacity: state === "loading" ? 0.7 : 1,
            }}
          >
            <Icon size={14}/> {label}
          </button>
          {(state === "playing" || state === "paused") && (
            <button
              onClick={stop}
              aria-label="Stop narration"
              data-testid="listing-narration-stop"
              style={{
                background: "transparent", border: "1px solid #DDE6FA", color: "#0F2A5B",
                borderRadius: 999, cursor: "pointer", padding: "9px 12px",
                display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 12,
              }}
            >
              <StopCircle size={14}/> Stop
            </button>
          )}
        </div>
      </div>
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setState("idle")}
        onError={() => setState("idle")}
        data-testid="listing-narration-audio"
      />
      {inServiceArea && (
        <div style={{ marginTop: 10, textAlign: "right" }}>
          <Link
            to={`/buyer?city=${encodeURIComponent(listing.city || "")}&mls=${encodeURIComponent(listing.mls_number || "")}&address=${encodeURIComponent(listing.street_address || "")}`}
            data-testid="listing-narration-cta"
            style={{
              display: "inline-block", background: "#0F2A5B", color: "#fff",
              fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 700,
              fontSize: 13, padding: "10px 18px", borderRadius: 999,
              textDecoration: "none", boxShadow: "0 4px 12px rgba(15,42,91,0.30)",
            }}
          >
            Want to see it in person? Ask Doug for a viewing →
          </Link>
        </div>
      )}
    </div>
  );
}
