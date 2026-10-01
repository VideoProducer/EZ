// Shared service-area helper. Mirrors the farm/hood sets historically defined
// inline in App.js so public pages (e.g. ListingsNext) can decide whether a
// searched area is inside Doug's directly-repped region (Greater Vancouver /
// Fraser Valley / Sea-to-Sky) or is an OUT-OF-AREA search that should surface
// the Referral REALTOR® CTA.

export const FARM_SLUGS = new Set([
  "maple-ridge", "pitt-meadows", "coquitlam", "port-coquitlam", "port-moody",
  "burnaby", "vancouver", "west-vancouver", "north-vancouver", "richmond",
  "surrey", "delta", "langley", "langley-city", "langley-township",
  "white-rock", "new-westminster", "mission", "abbotsford", "chilliwack",
  "hope", "kent", "harrison-hot-springs",
  "squamish", "whistler", "pemberton", "lions-bay", "bowen-island",
]);

export const FOCUS_HOODS = new Set([
  // Vancouver neighbourhoods
  "kitsilano", "kerrisdale", "west-point-grey", "point-grey", "point-grey-ubc",
  "dunbar", "dunbar-southlands", "southlands", "marpole", "oakridge",
  "south-cambie", "cambie", "shaughnessy", "south-granville", "arbutus",
  "arbutus-ridge", "mount-pleasant", "fairview", "yaletown", "coal-harbour",
  "west-end", "downtown", "downtown-vancouver", "downtown-eastside", "gastown",
  "chinatown", "strathcona", "grandview-woodland", "commercial-drive",
  "hastings-sunrise", "renfrew-collingwood", "victoria-fraserview", "sunset",
  "kensington-cedar-cottage", "riley-park", "killarney", "champlain-heights",
  "false-creek", "olympic-village", "main-street", "west-side", "east-side",
  "east-vancouver",
  // UBC / University Endowment Lands
  "university", "ubc", "university-endowment-lands", "uel",
  // Burnaby
  "metrotown", "brentwood", "edmonds", "capitol-hill", "burnaby-heights",
  "deer-lake", "lougheed",
  // Richmond
  "steveston", "steveston-village", "brighouse",
  // North / West Vancouver
  "lonsdale", "lower-lonsdale", "lynn-valley", "deep-cove", "edgemont",
  "british-properties", "ambleside", "dundarave", "horseshoe-bay",
  // Surrey / Tri-Cities
  "south-surrey", "cloverdale", "fleetwood", "guildford", "newton", "whalley",
  "burke-mountain", "fort-langley", "walnut-grove", "willoughby",
]);

export const cityToSlug = (name) =>
  (name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// True when the named area is inside Doug's directly-repped region.
export const isFarmArea = (name) => {
  const s = cityToSlug(name);
  return FARM_SLUGS.has(s) || FOCUS_HOODS.has(s);
};
