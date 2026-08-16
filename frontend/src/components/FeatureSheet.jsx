// ═══════════════════════════════════════════════════════════════════════════
// FeatureSheet.jsx — Public feature sheet panel for a single listing.
//
// Displays every CREA DDF® field we already sync into Mongo as a grouped
// 2-column "feature sheet" under the About This Property section. Rows with
// null / empty / zero values are hidden — the sheet degrades gracefully on
// legacy listings that don't yet carry every field.
//
// Section order (matches how paper feature sheets read):
//   1. Property Details         — MLS #, type, status, year built, floor area
//   2. Interior                 — beds, baths, half-baths, interior feature chips
//   3. Exterior                 — view / waterfront / pool chips, virtual tour flag
//   4. Lot                      — lot size + units, region, postal code
//   5. Parking                  — parsed from `features` chips (parking-2plus)
//   6. Data & Attribution       — source, originating board, last DDF sync ts
//
// DDF Compliance:
//   • Every value shown here is either a factual RESO-standard field OR the
//     `PublicRemarks` description — both approved for public display under
//     CREA DDF® Rules §3.1 (Public Display of Data).
//   • MLS® number and REALTOR.ca URL are attributed exactly as CREA requires.
//   • Missing fields (nulls) are silently omitted rather than shown as
//     "Unknown" — matches how MLS® paper feature sheets omit blank rows.
// ═══════════════════════════════════════════════════════════════════════════
import React from "react";

// -------------------- helpers --------------------
const _isEmpty = (v) =>
  v === null || v === undefined || v === "" ||
  (typeof v === "number" && !isFinite(v)) ||
  (Array.isArray(v) && v.length === 0);

// Pretty-print an area value + units. CREA returns living_area/lot_size as
// numbers with a separate units field ("square feet", "acres", "square meters").
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

// Map the compact DDF `features` array (fireplace/pool/basement/view/...)
// to human-readable labels. Chips arrive from services/ddf_sync.py:_feature_flags.
const _FEATURE_LABELS = {
  "fireplace":   { section: "interior", label: "Fireplace" },
  "basement":    { section: "interior", label: "Basement" },
  "pool":        { section: "exterior", label: "Pool" },
  "waterfront":  { section: "exterior", label: "Waterfront" },
  "view":        { section: "exterior", label: "Ocean / mountain view" },
  "parking-2plus": { section: "parking", label: "2+ parking spots" },
};
const _bucketFeatures = (features) => {
  const out = { interior: [], exterior: [], parking: [] };
  for (const f of features || []) {
    const meta = _FEATURE_LABELS[f];
    if (meta) out[meta.section].push(meta.label);
  }
  return out;
};

// -------------------- row + section primitives --------------------
const _row = (label, value) => {
  if (_isEmpty(value)) return null;
  return { label, value };
};

const _Section = ({ title, rows, chips, testid }) => {
  const validRows = (rows || []).filter(Boolean);
  const validChips = (chips || []).filter(Boolean);
  if (validRows.length === 0 && validChips.length === 0) return null;
  return (
    <div
      data-testid={testid}
      style={{
        breakInside: "avoid",
        marginBottom: "1.25rem",
      }}
    >
      <h4
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.05rem",
          margin: "0 0 0.65rem",
          color: "var(--brand-navy)",
          borderBottom: "2px solid #E8B93B",
          paddingBottom: "0.35rem",
          letterSpacing: 0.2,
        }}
      >
        {title}
      </h4>
      {validRows.length > 0 && (
        <dl
          style={{
            margin: 0,
            display: "grid",
            gridTemplateColumns: "minmax(120px,auto) 1fr",
            columnGap: "1rem",
            rowGap: "0.4rem",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "0.9rem",
            lineHeight: 1.5,
          }}
        >
          {validRows.map((r) => (
            <React.Fragment key={r.label}>
              <dt
                style={{
                  color: "var(--muted, #64748B)",
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                {r.label}
              </dt>
              <dd
                style={{ color: "var(--ink, #0F172A)", fontWeight: 600, margin: 0, wordBreak: "break-word" }}
              >
                {r.value}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      {validChips.length > 0 && (
        <div
          style={{
            marginTop: validRows.length ? "0.65rem" : 0,
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
          }}
        >
          {validChips.map((c) => (
            <span
              key={c}
              style={{
                background: "#F5F0E1",
                color: "var(--brand-navy)",
                padding: "0.28rem 0.75rem",
                borderRadius: 999,
                fontSize: "0.8rem",
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600,
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

  // ------ 1. Property Details ------
  const propertyRows = [
    _row("MLS® #", listing.mls_number || listing.listing_key),
    _row("Property Type", listing.property_type),
    _row("Status", listing.status),
    _row("Year Built", listing.year_built),
    _row("Floor Area", _fmtArea(listing.living_area, listing.living_area_units)),
    _row("Photos", listing.photo_count),
  ];

  // ------ 2. Interior ------
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

  // ------ 3. Exterior ------
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

  // ------ 4. Lot ------
  const lotRows = [
    _row("Lot Size", _fmtArea(listing.lot_size_area, listing.lot_size_units)),
    _row("Neighbourhood", listing.region),
    _row("City", listing.city),
    _row("Postal Code", listing.postal_code),
  ];

  // ------ 5. Parking ------ (currently only 1 signal from DDF: parking-2plus)
  // Section shows only if we have a positive signal.

  // ------ 6. Data & Attribution ------
  const attrRows = [
    _row("Listing Board", listing.originating_system),
    _row("Data Source", listing.source === "CREA_DDF" ? "CREA DDF® feed" : listing.source),
    _row("Last Updated", _fmtDate(listing.modified_at || listing.synced_at)),
    _row(
      "REALTOR.ca",
      listing.realtor_ca_url ? (
        <a
          href={listing.realtor_ca_url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="feature-sheet-realtor-ca"
          style={{ color: "var(--brand-blue, #0F2A5B)", textDecoration: "underline" }}
        >
          View on REALTOR.ca ↗
        </a>
      ) : null
    ),
  ];

  return (
    <section
      data-testid="listing-feature-sheet"
      aria-label="Feature sheet"
      style={{
        marginTop: "1.5rem",
        padding: "1.35rem 1.5rem",
        background: "linear-gradient(180deg,#FDFCF7 0%,#F8F5EC 100%)",
        border: "1px solid rgba(15,42,91,0.08)",
        borderRadius: 14,
      }}
    >
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.2rem",
          margin: "0 0 1rem",
          color: "var(--brand-navy)",
          letterSpacing: 0.3,
        }}
      >
        Feature Sheet
      </h3>

      {/* Two-column responsive grid. On viewports < 640px collapses to one. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          columnGap: "2.25rem",
          rowGap: "0.25rem",
        }}
      >
        <_Section title="Property Details" rows={propertyRows} testid="feature-sheet-details"/>
        <_Section title="Interior" rows={interiorRows} chips={chips.interior} testid="feature-sheet-interior"/>
        <_Section title="Exterior" rows={exteriorRows} chips={chips.exterior} testid="feature-sheet-exterior"/>
        <_Section title="Lot" rows={lotRows} testid="feature-sheet-lot"/>
        <_Section title="Parking" chips={chips.parking} testid="feature-sheet-parking"/>
        <_Section title="Data & Attribution" rows={attrRows} testid="feature-sheet-attribution"/>
      </div>

      <p
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "0.75rem",
          color: "var(--muted, #64748B)",
          lineHeight: 1.5,
          margin: "1rem 0 0",
        }}
      >
        The information above is sourced directly from the CREA DDF® feed and
        provided for informational purposes only. Room dimensions, taxes,
        strata fees, and full property disclosures are available on{" "}
        {listing.realtor_ca_url ? (
          <a
            href={listing.realtor_ca_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--brand-blue, #0F2A5B)", textDecoration: "underline" }}
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
