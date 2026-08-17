// Homepage + Luxury flagship listing config.
// Update MLS_NUMBER tomorrow (Feb 17 2026, 9:00 AM PT) once GVR assigns it.
// Everything else is pre-staged and ready to render.
export const FLAGSHIP = {
  active: false,  // ⚡ FEATURE REMOVED per Doug — realtor.ca (listing 30162312) is now the canonical frame for R3156192
  address: "3015 141 Street",
  city: "Surrey",
  province: "BC",
  price: 3297000,  // asking price · GVR-listed
  mls_number: "R3156192",  // GVR-assigned MLS® number for 3015 141 Street
  launch_at: "2026-02-17T17:00:00Z",  // Feb 17 2026 · 9:00 AM PT = 17:00 UTC
  ribbon_days: 7,
  hero_image: "https://customer-assets-lqy194kg.emergentagent.net/job_proptech-hub-111/artifacts/73477bl0_Front%20of%20House%20Dusk.webp",
  virtual_tour_iframe: "https://tours.cotala.com/87725",
  matterport: "https://my.matterport.com/show/?m=RsuVitX8BKc&dh=0",
  description: "Quality, location, and lasting value. A distinguished residence in the heart of Surrey — craftsmanship, wrap-around porch, and grounds designed for entertaining. Represented exclusively by Doug LeMaire, REALTOR® (BCFSA #167790).",
  tagline: "Quality, location, and lasting value.",
  // realtor.ca is the canonical CREA DDF® presentation for this listing.
  // The homepage + luxury pointer strip links straight to it. Set to `null`
  // to hide the pointer everywhere without touching component code.
  realtor_ca_url: "https://www.realtor.ca/real-estate/30162312/3015-141-street-surrey",
};

export const isFlagshipRibbonActive = () => {
  if (!FLAGSHIP.active) return false;
  const now = Date.now();
  const launch = new Date(FLAGSHIP.launch_at).getTime();
  const end = launch + FLAGSHIP.ribbon_days * 24 * 60 * 60 * 1000;
  return now >= launch && now <= end;
};
