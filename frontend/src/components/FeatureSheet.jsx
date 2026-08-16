// ═══════════════════════════════════════════════════════════════════════════
// FeatureSheet.jsx — Public feature sheet panel for a single listing.
//
// Renders a magazine-style feature sheet card under "About This Property":
//
//   ┌──────────────────────────────────────────────────────────────────┐
//   │  FEATURE SHEET                                                   │
//   │  ────────────────────────────────────────────────────────────    │
//   │                                                                  │
//   │  Hero stats strip:  3 BED · 4 BATH · 2,354 sqft · Built 1928     │
//   │                                                                  │
//   │  ┌──────────────┬──────────────┬──────────────┐                  │
//   │  │ 🏠 Property   │ 🛋 Interior   │ 🌳 Exterior   │                  │
//   │  │ Details      │              │              │                  │
//   │  ├──────────────┼──────────────┼──────────────┤                  │
//   │  │ 🌾 Lot        │ 🚗 Parking    │              │                  │
//   │  └──────────────┴──────────────┴──────────────┘                  │
//   │                                                                  │
//   │  ─── data & compliance one-liner ─────────────────────────       │
//   │  CREA DDF® · FVREB · updated Jul 3, 2026 · View on REALTOR.ca ↗ │
//   └──────────────────────────────────────────────────────────────────┘
//
// Design:
//   • Navy → cream gradient background with subtle gold accent line.
//   • Playfair Display for headings, Inter for body.
//   • Each section becomes its own bordered card with an icon badge.
//   • A dense "hero stats" row at the top highlights the four numbers
//     visitors care about most (beds, baths, floor area, year built).
//   • Rows with null/empty/zero values are hidden — the sheet degrades
//     gracefully on legacy listings that don't yet carry every field.
//   • Attribution footer is a single compact line (Feb 2026 update)
//     containing every value strictly required by CREA DDF® Rules
//     §3.6/§3.9 and GVR/FVREB inter-board display rules.
//
// DDF Compliance:
//   • Every value shown here is either a factual RESO-standard field OR the
//     `PublicRemarks` description — both approved for public display under
//     CREA DDF® Rules §3.1 (Public Display of Data).
//   • MLS® number and REALTOR.ca URL are attributed as CREA requires.
// ═══════════════════════════════════════════════════════════════════════════
import React from "react";
import {
  Home,
  Sofa,
  TreePine,
  MapPin,
  Car,
  Bed,
  Bath,
  Ruler,
  CalendarDays,
} from "lucide-react";

// -------------------- helpers --------------------
const _isEmpty = (v) =>
  v === null || v === undefined || v === "" ||
  (typeof v === "number" && !isFinite(v)) ||
  (Array.isArray(v) && v.length === 0);

// Pretty-print an area value + units.
const _fmtArea = (n, units) => {
  if (_isEmpty(n)) return null;
  const num = Number(n);
  if (!isFinite(num) || num <= 0) return null;
  const u = String(units || "").toLowerCase();
  const unitLabel =
    u.includes("acre") ? "ac" :
    u.includes("meter") ? "m²" :
    "sqft";
  return `${num.toLocaleString("en-CA", { maximumFractionDigits: 2 })} ${unitLabel}`;
};

const _fmtDate = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  } catch { return null; }
};

// Feature-chip label map (DDF `features` → human-readable, bucketed by
// which section they belong in).
const _FEATURE_LABELS = {
  "fireplace":     { section: "interior", label: "Fireplace" },
  "basement":      { section: "interior", label: "Basement" },
  "pool":          { section: "exterior", label: "Pool" },
  "waterfront":    { section: "exterior", label: "Waterfront" },
  "view":          { section: "exterior", label: "Ocean / mountain view" },
  "parking-2plus": { section: "parking",  label: "2+ parking spots" },
};
const _bucketFeatures = (features) => {
  const out = { interior: [], exterior: [], parking: [] };
  for (const f of features || []) {
    const meta = _FEATURE_LABELS[f];
    if (meta) out[meta.section].push(meta.label);
  }
  return out;
};

const _row = (label, value) => {
  if (_isEmpty(value)) return null;
  return { label, value };
};

// -------------------- palette --------------------
const NAVY = "#0F2A5B";
const GOLD = "#E8B93B";
const INK = "#0F172A";
const MUTED = "#64748B";
const CREAM_1 = "#FDFCF7";
const CREAM_2 = "#F5F0E1";

// -------------------- hero stat pill --------------------
const _HeroStat = ({ icon: Icon, label, value, testid }) => {
  if (_isEmpty(value)) return null;
  return (
    <div
      data-testid={testid}
      style={{
        flex: "1 1 140px",
        minWidth: 120,
        padding: "0.9rem 1.1rem",
        background: "#fff",
        border: "1px solid rgba(15,42,91,0.08)",
        borderRadius: 12,
        boxShadow: "0 1px 2px rgba(15,42,91,0.04)",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `linear-gradient(135deg,${NAVY} 0%,#1A3A73 100%)`,
          color: GOLD,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} strokeWidth={2.2}/>
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: MUTED,
            fontWeight: 700,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.35rem",
            color: NAVY,
            lineHeight: 1.1,
            fontWeight: 700,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
};

// -------------------- section card --------------------
const _Section = ({ title, icon: Icon, rows, chips, testid }) => {
  const validRows = (rows || []).filter(Boolean);
  const validChips = (chips || []).filter(Boolean);
  if (validRows.length === 0 && validChips.length === 0) return null;
  return (
    <div
      data-testid={testid}
      style={{
        breakInside: "avoid",
        padding: "1.1rem 1.2rem",
        background: "#fff",
        border: "1px solid rgba(15,42,91,0.08)",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(15,42,91,0.03)",
      }}
    >
      <h4
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.55rem",
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.05rem",
          margin: "0 0 0.85rem",
          color: NAVY,
          letterSpacing: 0.2,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `linear-gradient(135deg,${GOLD} 0%,#D9A927 100%)`,
            color: NAVY,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {Icon ? <Icon size={15} strokeWidth={2.4}/> : null}
        </span>
        {title}
      </h4>

      {validRows.length > 0 && (
        <dl
          style={{
            margin: 0,
            display: "grid",
            gridTemplateColumns: "minmax(110px,auto) 1fr",
            columnGap: "1rem",
            rowGap: "0.5rem",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "0.9rem",
            lineHeight: 1.5,
          }}
        >
          {validRows.map((r) => (
            <React.Fragment key={r.label}>
              <dt style={{ color: MUTED, fontWeight: 500, margin: 0 }}>
                {r.label}
              </dt>
              <dd style={{ color: INK, fontWeight: 600, margin: 0, wordBreak: "break-word" }}>
                {r.value}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      {validChips.length > 0 && (
        <div
          style={{
            marginTop: validRows.length ? "0.85rem" : 0,
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
          }}
        >
          {validChips.map((c) => (
            <span
              key={c}
              style={{
                background: CREAM_2,
                color: NAVY,
                padding: "0.28rem 0.75rem",
                borderRadius: 999,
                fontSize: "0.78rem",
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600,
                border: `1px solid rgba(232,185,59,0.35)`,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════
const FeatureSheet = ({ listing }) => {
  if (!listing) return null;

  const chips = _bucketFeatures(listing.features);

  // Section rows -----------------------------------------------------------
  const propertyRows = [
    _row("MLS® #", listing.mls_number || listing.listing_key),
    _row("Property Type", listing.property_type),
    _row("Status", listing.status),
    _row("Photos", listing.photo_count),
  ];

  const bathsStr = (() => {
    if (_isEmpty(listing.baths)) return null;
    return listing.half_baths
      ? `${listing.baths} full + ${listing.half_baths} half`
      : `${listing.baths}`;
  })();
  const interiorRows = [
    _row("Bedrooms", listing.beds),
    _row("Bathrooms", bathsStr),
  ];

  const exteriorRows = [
    _row(
      "Virtual Tour",
      listing.has_virtual_tour
        ? (Array.isArray(listing.tour_kinds) && listing.tour_kinds.length
            ? listing.tour_kinds
                .map((k) =>
                  k === "matterport" ? "Matterport 3D"
                  : k === "youtube" ? "YouTube"
                  : k === "vimeo" ? "Vimeo"
                  : "External")
                .join(" · ")
            : "Available")
        : null
    ),
  ];

  const lotRows = [
    _row("Lot Size", _fmtArea(listing.lot_size_area, listing.lot_size_units)),
    _row("Neighbourhood", listing.region),
    _row("City", listing.city),
    _row("Postal Code", listing.postal_code),
  ];

  // Attribution one-liner (Feb 2026) — every element on this line is
  // required by CREA DDF® / GVR / FVREB — do NOT remove.
  const attrPieces = [
    listing.source === "CREA_DDF" ? "CREA DDF®" : (listing.source || null),
    listing.originating_system || null,
    _fmtDate(listing.modified_at || listing.synced_at)
      ? `updated ${_fmtDate(listing.modified_at || listing.synced_at)}`
      : null,
  ].filter(Boolean);

  return (
    <section
      data-testid="listing-feature-sheet"
      aria-label="Feature sheet"
      style={{
        marginTop: "1.75rem",
        padding: "1.75rem",
        background: `linear-gradient(180deg,${CREAM_1} 0%,${CREAM_2} 100%)`,
        border: "1px solid rgba(15,42,91,0.1)",
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gold accent line at the very top */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 3,
          background: `linear-gradient(90deg,transparent 0%,${GOLD} 20%,${GOLD} 80%,transparent 100%)`,
        }}
      />

      {/* Header row — title + subtle "at a glance" tag */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.1rem",
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.55rem",
            margin: 0,
            color: NAVY,
            letterSpacing: 0.3,
          }}
        >
          Feature Sheet
        </h3>
        <span
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: 1.2,
            color: GOLD,
            fontWeight: 800,
          }}
        >
          At a glance
        </span>
      </div>

      {/* Hero stats strip — 4 highlight pills */}
      <div
        data-testid="feature-sheet-hero-strip"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.65rem",
          marginBottom: "1.35rem",
        }}
      >
        <_HeroStat
          icon={Bed}
          label="Bedrooms"
          value={listing.beds}
          testid="feature-sheet-hero-beds"
        />
        <_HeroStat
          icon={Bath}
          label="Bathrooms"
          value={bathsStr}
          testid="feature-sheet-hero-baths"
        />
        <_HeroStat
          icon={Ruler}
          label="Floor Area"
          value={_fmtArea(listing.living_area, listing.living_area_units)}
          testid="feature-sheet-hero-sqft"
        />
        <_HeroStat
          icon={CalendarDays}
          label="Year Built"
          value={listing.year_built}
          testid="feature-sheet-hero-year"
        />
      </div>

      {/* Section grid — auto-fit tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: "0.9rem",
        }}
      >
        <_Section
          title="Property Details"
          icon={Home}
          rows={propertyRows}
          testid="feature-sheet-details"
        />
        <_Section
          title="Interior"
          icon={Sofa}
          rows={interiorRows}
          chips={chips.interior}
          testid="feature-sheet-interior"
        />
        <_Section
          title="Exterior"
          icon={TreePine}
          rows={exteriorRows}
          chips={chips.exterior}
          testid="feature-sheet-exterior"
        />
        <_Section
          title="Lot"
          icon={MapPin}
          rows={lotRows}
          testid="feature-sheet-lot"
        />
        <_Section
          title="Parking"
          icon={Car}
          chips={chips.parking}
          testid="feature-sheet-parking"
        />
      </div>

      {/* Compact data & compliance one-liner (Feb 2026). Every element on
          this line is required by CREA DDF® / GVR / FVREB — do NOT remove.
          MLS® number lives in the Property Details tile above. */}
      <p
        data-testid="feature-sheet-attribution"
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "0.72rem",
          color: MUTED,
          lineHeight: 1.65,
          margin: "1.35rem 0 0",
          paddingTop: "1rem",
          borderTop: `1px dashed rgba(15,42,91,0.14)`,
        }}
      >
        <span style={{ fontWeight: 700, color: NAVY, letterSpacing: 0.2 }}>
          {attrPieces.join(" · ")}
        </span>
        {attrPieces.length > 0 && listing.realtor_ca_url ? " · " : ""}
        {listing.realtor_ca_url && (
          <a
            href={listing.realtor_ca_url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="feature-sheet-realtor-ca"
            style={{ color: NAVY, textDecoration: "underline", fontWeight: 700 }}
          >
            View on REALTOR.ca ↗
          </a>
        )}
        <br/>
        Sourced from the CREA DDF® feed for informational purposes. Room
        dimensions, taxes, strata fees, and full property disclosures are
        available on{" "}
        {listing.realtor_ca_url ? (
          <a
            href={listing.realtor_ca_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: NAVY, textDecoration: "underline" }}
          >
            REALTOR.ca
          </a>
        ) : "REALTOR.ca"}{" "}
        or by request from the listing brokerage.
      </p>
    </section>
  );
};

export { FeatureSheet };
export default FeatureSheet;
