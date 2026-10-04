// Contextual glossary terms per listing type (June 2026).
// Derives a listing's specialty from its MLS fields (no stored flag exists) and
// maps each specialty to a curated list of REAL glossary slugs so listing pages
// and Doogie result cards surface the terms that actually apply — equestrian
// terms on horse properties, acreage/septic terms on rural land, luxury-segment
// terms on high-end homes, strata docs on condos/townhouses. All terms link into
// the existing /glossary pages (fact-only, BCFSA/CREA-safe). Shared by the
// listing detail page and Doogie cards so the logic lives in exactly one place.

export const GROUP_LABELS = {
  equestrian: "Equestrian glossary terms",
  acreage: "Acreage & rural glossary terms",
  strata: "Strata glossary terms",
  baseline: "Common closing-cost terms",
};

// specialty key -> [ [slug, label], ... ]  (slugs verified against the live glossary)
export const SPECIALTY_TERMS = {
  equestrian: [
    ["equestrian-property-horse-property", "Equestrian / Horse Property"],
    ["barn-stable", "Barn / Stable"],
    ["equestrian-zoning", "Equestrian Zoning"],
    ["paddock-pen", "Paddock / Pen"],
    ["agricultural-land-reserve-alr", "Agricultural Land Reserve (ALR)"],
    ["water-licence", "Water Licence"],
    ["permit-for-equestrian-facilities", "Permit for Equestrian Facilities"],
    ["livestock-bylaw-animal-bylaw", "Livestock / Animal Bylaw"],
  ],
  acreage: [
    ["acreage", "Acreage"],
    ["septic-system", "Septic System"],
    ["perc-test-percolation-test", "Perc Test"],
    ["well-flow-test", "Well Flow Test"],
    ["water-licence", "Water Licence"],
    ["agricultural-land-reserve-alr", "Agricultural Land Reserve (ALR)"],
    ["rural-insurance", "Rural / Acreage Insurance"],
    ["timber-value", "Timber Value"],
  ],
  luxury: [
    // NOTE: intentionally NOT auto-applied per-listing — see classifyListing().
    // Price-tier ("luxury") is a subjective value characterisation prohibited
    // by BCFSA/CREA/GVR, so these terms are never surfaced on a specific listing.
    ["luxury-property", "Luxury Property"],
    ["entry-price-for-luxury-segment", "Entry Price for Luxury Segment"],
    ["micro-market-luxury", "Micro-market (Luxury)"],
    ["resale-liquidity-luxury", "Resale Liquidity (Luxury)"],
    ["custom-built-luxury-home", "Custom-built Luxury Home"],
    ["ultra-luxury-estate-level-property", "Ultra-luxury / Estate-level"],
  ],
  strata: [
    ["form-b-strata-information-certificate", "Form B — Strata Information Certificate"],
    ["depreciation-report", "Depreciation Report"],
    ["strata-fees", "Strata Fees"],
    ["special-levy", "Special Levy"],
    ["strata-bylaws", "Strata Bylaws"],
    ["pet-restriction-bylaws-strata", "Pet Restriction Bylaws"],
  ],
};

// Shown on every listing regardless of type.
export const BASELINE_TERMS = [
  ["property-transfer-tax-ptt", "Property Transfer Tax (PTT)"],
  ["gst-new-homes", "GST on New Homes"],
  ["2-5-10-home-warranty", "2-5-10 Home Warranty"],
];

const SPECIALTY_ORDER = ["equestrian", "acreage", "strata"];
const EQUESTRIAN_RE = /(^|\W)(horse|equestrian|barn|stable|paddock|corral|stall|riding arena|riding ring|pasture|bridle|hay)/;
const STRATA_PT_RE = /(condo|apartment|townhouse|town house|\brow\b|strata|duplex|co-?op|manufactured on strata)/;

// Specialties are derived ONLY from objective listing facts the brokerage
// supplied (property_type, ownership structure, lot size, and keywords the
// listing description itself uses). We deliberately do NOT infer a "luxury"
// (or any value/market-tier) bucket from price — that would be a subjective
// characterisation of the property, which BCFSA/CREA/GVR rules prohibit. This
// module only MATCHES relevant glossary definitions; it never characterises,
// rates, advises, or opines on a specific property.
export function classifyListing(listing) {
  if (!listing) return [];
  const out = [];
  const pt = (listing.property_type || "").toLowerCase();
  const feats = Array.isArray(listing.features) ? listing.features.join(" ") : (listing.features || "");
  const text = (pt + " " + feats + " " + (listing.description || "")).toLowerCase();

  // Lot size → acres (fields may be in acres, hectares or sqft)
  let acres = 0;
  const lsa = Number(listing.lot_size_area) || 0;
  const lsu = (listing.lot_size_units || "").toLowerCase();
  if (lsa > 0) {
    if (lsu.includes("acre")) acres = lsa;
    else if (lsu.includes("hect")) acres = lsa * 2.47105;
    else if (lsu.includes("sq")) acres = lsa / 43560;
  }

  if (EQUESTRIAN_RE.test(text)) out.push("equestrian");
  if (pt.includes("acreage") || pt.includes("farm") || pt.includes("ranch") || /\brural\b/.test(pt) || acres >= 1) out.push("acreage");
  if (STRATA_PT_RE.test(pt)) out.push("strata");
  return out;
}

// Ordered, de-duplicated groups (specialty groups first, baseline last).
export function glossaryGroupsForListing(listing, { includeBaseline = true } = {}) {
  const specialties = classifyListing(listing);
  const used = new Set();
  const groups = [];
  for (const key of SPECIALTY_ORDER) {
    if (!specialties.includes(key)) continue;
    const terms = SPECIALTY_TERMS[key].filter(([slug]) => !used.has(slug));
    terms.forEach(([slug]) => used.add(slug));
    if (terms.length) groups.push({ key, label: GROUP_LABELS[key], terms: terms.map(([slug, label]) => ({ slug, label })) });
  }
  if (includeBaseline) {
    const baseline = BASELINE_TERMS.filter(([slug]) => !used.has(slug));
    baseline.forEach(([slug]) => used.add(slug));
    if (baseline.length) groups.push({ key: "baseline", label: GROUP_LABELS.baseline, terms: baseline.map(([slug, label]) => ({ slug, label })) });
  }
  return groups;
}

// Flat, de-duplicated list (for the compact Doogie-card variant).
export function glossaryTermsFlat(listing, { max = 5, includeBaseline = false } = {}) {
  const groups = glossaryGroupsForListing(listing, { includeBaseline });
  const flat = [];
  for (const g of groups) {
    for (const t of g.terms) {
      flat.push(t);
      if (flat.length >= max) return flat;
    }
  }
  return flat;
}
