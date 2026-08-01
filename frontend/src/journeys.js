// EZtoFind.ca Interactive Real Estate Journey Platform
// -----------------------------------------------------
// Config-driven data model for all consumer journeys. Every stage and module
// is HAND-CRAFTED educational language — no LLM-generated content sits in
// this file. Every module points to EXISTING content elsewhere on the site
// (glossary, community pages, calculators) rather than duplicating it.
//
// Compliance:
//  - Language is educational only. Zero recommendations, zero advice.
//  - Approved framings: "You may wish to explore...", "Consumers often...",
//    "Related information...". Never "You should...", "We recommend...".
//  - BCFSA, GVR, CREA, PIPA, CASL, IDX aligned.
//  - Every module surfaces a disclaimer via the JourneyModuleCard component.

// Individual module shape:
//   { id: 'stable-slug', title: 'Short label', blurb: '1-2 sentence framing',
//     href: '/glossary/xxx' | '/valuation' | ..., type: 'glossary'|'calculator'|'community'|'faq'|'guide' }

// Every journey mirrors the same 7-stage framework requested in the spec.
// Stubbed journeys carry the same stage skeleton — modules will be populated
// in Phase 2. This keeps the UX consistent from day one even when depth
// varies.

const S = (id, title, description, modules) => ({ id, title, description, modules: modules || [] });

// --- BUYING JOURNEY (fully populated — reference implementation) ---
const BUYING = {
  slug: "buying",
  title: "Buying a Home",
  icon: "🔑",
  short: "Understand the buying process from mortgage basics to closing day — at your own pace, on your own terms.",
  intent: "buyer",
  stages: [
    S("learn", "Learn", "Familiarize yourself with the vocabulary and mechanics of buying a home in BC — before you look at a single listing.", [
      { id:"deposit",         title:"What is a deposit?",             blurb:"Deposits, subject removal, and how funds are held in trust in BC.", href:"/glossary/deposit",                       type:"glossary" },
      { id:"title",           title:"Understanding title",            blurb:"How the BC Land Title & Survey Authority records ownership.",      href:"/glossary/title-search",                  type:"glossary" },
      { id:"mortgage-terms",  title:"Mortgage terminology",           blurb:"Amortization, fixed vs. variable, and the OSFI stress test.",      href:"/glossary/mortgage",                      type:"glossary" },
      { id:"closing-costs",   title:"Closing costs 101",              blurb:"Property Transfer Tax, legal fees, adjustments — what to plan for.", href:"/glossary/property-transfer-tax",       type:"glossary" },
      { id:"strata-basics",   title:"Strata basics",                  blurb:"Fees, bylaws, and the depreciation report system in BC.",          href:"/glossary/strata-corporation",            type:"glossary" },
      { id:"gst-new-homes",   title:"GST on new construction",        blurb:"Federal GST rules for newly built homes vs. resale.",              href:"/glossary/gst-new-homes",                 type:"glossary" },
    ]),
    S("explore", "Explore", "Get to know BC communities before narrowing your search. Every profile links to Environment Canada climate normals and Statistics Canada demographics.", [
      { id:"community-index", title:"Browse BC communities",          blurb:"239 community profiles with geography, climate, and lifestyle context.", href:"/communities",                    type:"community" },
      { id:"community-match", title:"Where should you live? quiz",    blurb:"Optional 5-question exploration tool with educational match results.",   href:"/where-should-you-live",         type:"guide" },
      { id:"regions",         title:"BC regions overview",            blurb:"Greater Vancouver, Fraser Valley, Sea-to-Sky, Okanagan, Vancouver Island, Kootenays, Northern BC.", href:"/regions/greater-vancouver", type:"community" },
    ]),
    S("plan", "Plan", "Understand affordability, monthly ownership costs, and everything you may wish to budget for. All calculators are for educational estimation only.", [
      { id:"affordability",   title:"Affordability estimator",        blurb:"General-information calculator using your income, down payment, and rate assumptions.", href:"/valuation",                type:"calculator" },
      { id:"ptt-calc",        title:"Property Transfer Tax",          blurb:"How BC's 1% / 2% / 3% / 5% / 20% tiered PTT rates work + exemptions.",   href:"/glossary/property-transfer-tax", type:"calculator" },
      { id:"insurance",       title:"Home & title insurance",         blurb:"What lenders require, and optional coverages to research.",             href:"/glossary/title-insurance",     type:"glossary" },
      { id:"utilities",       title:"Utility & monthly costs",        blurb:"BC Hydro, FortisBC, municipal water/sewer, strata fees.",                href:"/glossary/utility-costs",       type:"glossary" },
    ]),
    S("search", "Search", "Browse live MLS® listings across British Columbia. Save your favourites and set up alerts — you are always in control of what you view.", [
      { id:"listings",        title:"Browse MLS® listings",           blurb:"Live inventory from the CREA Data Distribution Facility®, refreshed hourly.", href:"/listings",                type:"guide" },
      { id:"specialty-luxury",title:"Luxury Listings ($3M+)",         blurb:"Detached, condos, and townhomes across BC at $3,000,000 and above.",      href:"/specialties/luxury",         type:"guide" },
      { id:"specialty-eq",    title:"Equestrian Listings ($2M+)",     blurb:"Horse-friendly properties with barn / stable / arena / paddock features.", href:"/specialties/equestrian",    type:"guide" },
      { id:"favorites",       title:"Save your favourites",           blurb:"Bookmark listings on any device — your favourites travel with you.",       href:"/favorites",                  type:"guide" },
    ]),
    S("offer", "Offer & Due Diligence", "General information about the offer, subject-removal, and inspection stages. Educational only — decisions about a specific property require your own licensed REALTOR® and a BC lawyer or notary.", [
      { id:"subjects",        title:"Subject clauses",                blurb:"Financing, inspection, insurance, title, strata document review — how they work.", href:"/glossary/subject-clauses", type:"glossary" },
      { id:"inspection",      title:"Home inspection",                blurb:"What a BC-licensed home inspector's report typically covers.",                href:"/glossary/home-inspection",   type:"glossary" },
      { id:"strata-docs",     title:"Strata document review",         blurb:"Minutes, financial statements, Form B, depreciation report — what to look for.", href:"/glossary/form-b",         type:"glossary" },
      { id:"title-search",    title:"Title search & charges",         blurb:"How a lawyer/notary confirms title before closing.",                       href:"/glossary/title-search",     type:"glossary" },
    ]),
    S("closing", "Closing", "Educational information about how a BC residential purchase completes. Your lawyer or notary drives this stage — this section helps you follow along.", [
      { id:"closing-timeline",title:"Typical closing timeline",       blurb:"From subject removal to completion and possession.",                    href:"/glossary/completion-date",  type:"glossary" },
      { id:"lawyer-notary",   title:"Lawyer or notary — general info",blurb:"What a BC conveyancing professional typically does at closing.",         href:"/glossary/lawyer-or-notary", type:"glossary" },
      { id:"moving-checklist",title:"Moving checklist",               blurb:"Address changes, utilities, insurance transfer, driver's licence, ICBC.", href:"/glossary/possession-date",  type:"faq" },
    ]),
    S("ownership", "Home Ownership", "Once you own, ownership is an ongoing responsibility. This stage links to general educational content for the years ahead.", [
      { id:"maintenance",     title:"Ongoing maintenance",            blurb:"Seasonal task lists, deferred maintenance, and how it affects future value.", href:"/glossary/deferred-maintenance", type:"glossary" },
      { id:"property-tax",    title:"Annual property tax",            blurb:"How BC municipalities calculate, the Home Owner Grant, and Speculation Tax.", href:"/glossary/home-owner-grant",  type:"glossary" },
      { id:"insurance-review",title:"Insurance review",               blurb:"Annual review cadence and what to reassess.",                             href:"/glossary/homeowner-insurance", type:"glossary" },
      { id:"selling-later",   title:"When you're ready to sell",      blurb:"Continue to the Selling Journey when the time comes.",                    href:"/journey/selling",             type:"guide" },
    ]),
  ],
};

// --- SELLING JOURNEY (Phase 2 — skeleton with intent only) ---
const SELLING = {
  slug: "selling", title: "Selling a Home", icon: "🏷️",
  short: "Understand the selling process from preparing your home to completion day — educational information at every stage.",
  intent: "seller",
  stages: [
    S("prepare",  "Preparing to Sell",     "Learn how to organize documents, understand your title, and think about timing.", [
      { id:"seller-glossary", title:"Seller glossary topics", blurb:"Common terms sellers encounter — completion date, adjustments, hold-backs.", href:"/glossary", type:"glossary" },
    ]),
    S("value",    "Understanding Market Value","General information about how residential value is estimated in BC.", [
      { id:"valuation",       title:"Home valuation estimator", blurb:"General educational estimate — not an appraisal.", href:"/valuation", type:"calculator" },
    ]),
    S("photos",   "Preparing Your Home",   "Staging, decluttering, and photography — general educational information.",     []),
    S("list",     "Listing Process",       "What a listing agreement contains and how MLS® exposure works.",               []),
    S("showings", "Showings & Offers",     "How showings are typically scheduled and how offers are presented.",           []),
    S("negotiate","Negotiations & Conditions","Understand common conditions on the seller's side (subject removals, deposits).", []),
    S("complete", "Completion & Moving",   "Post-acceptance timeline, lawyer/notary role, and moving logistics.",          []),
  ],
};

// --- BUYING & SELLING JOURNEY (people moving from one home to another) ---
const BUY_AND_SELL = {
  slug: "buying-and-selling", title: "Buying & Selling at the Same Time", icon: "🔄",
  short: "Educational information on managing an interlocked purchase and sale — timing, financing, and possession considerations.",
  intent: "both",
  stages: [
    S("sequence", "Sequence Options", "Sell-first, buy-first, or simultaneous — general educational overview of each approach.", []),
    S("timing",   "Timing & Bridge Financing", "How a bridge loan works educationally in BC.", []),
    S("value",    "Understanding Both Values", "Estimating your current home's value while researching your next.", [{ id:"valuation",title:"Home valuation estimator",blurb:"General educational estimate.",href:"/valuation",type:"calculator" }]),
    S("plan",     "Plan Overlapping Costs",   "Double-cost period, deposits, and PTT if applicable to your next purchase.", []),
    S("search",   "Search Your Next Home",    "Continue browsing MLS® inventory.", [{ id:"listings",title:"Browse listings",blurb:"Live BC-wide MLS® inventory.",href:"/listings",type:"guide" }]),
    S("closing",  "Coordinating Closings",    "Common tools for coordinating two completion dates.", []),
    S("ownership","Settled In",               "Transitioning from moving day to new ownership.", []),
  ],
};

// --- CONDO / STRATA JOURNEY ---
const CONDO_STRATA = {
  slug: "condo-strata", title: "Condo & Strata Living", icon: "🏢",
  short: "Everything to research about strata governance, fees, and lifestyle before buying or selling a strata unit in BC.",
  intent: "buyer-or-owner",
  stages: [
    S("learn",   "Strata Fundamentals",   "How BC's Strata Property Act shapes governance, fees, and rules.", [
      { id:"strata-corp", title:"Strata Corporation",    blurb:"The governing entity of every BC strata.",             href:"/glossary/strata-corporation",     type:"glossary" },
      { id:"strata-fees", title:"Strata fees",           blurb:"What monthly fees cover — and don't cover.",           href:"/glossary/strata-fees",            type:"glossary" },
      { id:"contingency", title:"Contingency Reserve Fund", blurb:"How CRF works and why depreciation reports matter.", href:"/glossary/contingency-reserve-fund", type:"glossary" },
    ]),
    S("explore", "Common Strata Types",   "Freehold, bare-land, phased strata — general educational context.", []),
    S("plan",    "Cost Planning",         "Strata fees, special levies, insurance deductibles — what to budget for.", []),
    S("search",  "Condo Search",          "Browse strata inventory across BC.", [{ id:"condos",title:"Condos specialty page",blurb:"BC-wide condo inventory.",href:"/specialties/condos",type:"guide" }]),
    S("offer",   "Strata Due Diligence",  "Minutes, Form B, Form F, depreciation reports — what a purchase typically reviews.", [
      { id:"form-b", title:"Form B", blurb:"Certificate of strata information — what it discloses.", href:"/glossary/form-b", type:"glossary" },
    ]),
    S("closing", "Closing & Move-In",     "Strata-specific closing steps beyond the standard purchase.", []),
    S("ownership","Living in a Strata",   "Bylaws, rules, AGMs, and getting involved in council if you choose.", []),
  ],
};

// --- FIRST-TIME BUYER JOURNEY ---
const FIRST_TIME = {
  slug: "first-time-buyer", title: "First-Time Buyer", icon: "🌱",
  short: "Educational content tailored to consumers exploring home ownership for the first time — no assumed knowledge.",
  intent: "buyer",
  stages: [
    S("learn",   "Real Estate Vocabulary 101", "Start-from-scratch vocabulary primer for the terms you'll hear again and again.", [
      { id:"glossary-index", title:"Full glossary (398 terms)", blurb:"Every BC real estate term, plain-language, with statute links.", href:"/glossary", type:"glossary" },
    ]),
    S("explore", "Communities on a Budget", "Educational context on lower-priced BC regions and neighbourhoods.", [{ id:"communities",title:"BC communities",blurb:"Browse 239 community profiles.",href:"/communities",type:"community" }]),
    S("plan",    "First-Time Buyer Programs", "General information about the First-Time Home Buyer PTT exemption, RRSP HBP, and FHSA.", [
      { id:"ptt-exempt", title:"PTT first-time exemption", blurb:"Educational context on eligibility criteria.", href:"/glossary/property-transfer-tax", type:"glossary" },
      { id:"fhsa",       title:"First Home Savings Account", blurb:"Federal FHSA program — general educational content.", href:"/glossary/first-home-savings-account", type:"glossary" },
    ]),
    S("search",  "Your First Search",     "Browsing tips and how to use saved-searches.", [{ id:"listings",title:"Browse listings",blurb:"BC-wide inventory.",href:"/listings",type:"guide" }]),
    S("offer",   "First Offer — General Info", "General educational information — a specific offer requires your own licensed REALTOR®.", []),
    S("closing", "First Closing",         "Educational overview of the closing day experience.", []),
    S("ownership","Your First Year",      "Common surprises and ongoing responsibilities for new owners.", []),
  ],
};

// --- NEW CONSTRUCTION JOURNEY ---
const NEW_CONSTRUCTION = {
  slug: "new-construction", title: "New Construction", icon: "🏗️",
  short: "Understand the differences between buying new-build (pre-sale or completed) versus resale in BC.",
  intent: "buyer",
  stages: [
    S("learn",   "New-Build Fundamentals", "GST, disclosure statements, and 2-5-10 warranty coverage.", [
      { id:"warranty-210",  title:"2-5-10 Home Warranty",     blurb:"BC's mandatory new-home warranty regime.", href:"/glossary/2-5-10-home-warranty", type:"glossary" },
      { id:"disclosure",    title:"Disclosure statement",     blurb:"REDMA-required disclosure for new developments.", href:"/glossary/disclosure-statement", type:"glossary" },
      { id:"gst",           title:"GST on new homes",          blurb:"How GST works on new construction.", href:"/glossary/gst-new-homes", type:"glossary" },
    ]),
    S("explore", "Development Landscape", "Educational information on how developments are marketed and sold.", []),
    S("plan",    "Deposit Structures",   "Staged deposits, deposit protection, and rescission rights.", []),
    S("search",  "Find Developments",    "Browsing new construction listings.", [{ id:"listings",title:"MLS® new-build listings",blurb:"Filter for new construction.",href:"/listings",type:"guide" }]),
    S("offer",   "Contract of Purchase & Sale — Pre-Sale", "General educational overview of pre-sale contract structure.", []),
    S("closing", "Occupancy & Final Closing", "Occupancy permit, deficiency walk-through, warranty commencement.", []),
    S("ownership","Warranty Year-1 Deficiencies", "Understanding your rights during the warranty period.", []),
  ],
};

// --- ACREAGES & RURAL LIVING JOURNEY ---
const ACREAGES = {
  slug: "acreages", title: "Acreages & Rural Living", icon: "🐎",
  short: "Educational content for consumers researching acreage, hobby farm, or equestrian properties in BC.",
  intent: "buyer",
  stages: [
    S("learn",   "Rural Fundamentals",  "ALR, well and septic systems, wildfire and flood considerations.", [
      { id:"alr",         title:"Agricultural Land Reserve", blurb:"How the ALR protects farmland and limits use.", href:"/glossary/agricultural-land-reserve", type:"glossary" },
      { id:"well-water",  title:"Well water & water rights", blurb:"Groundwater licensing and testing.",           href:"/glossary/water-rights",              type:"glossary" },
      { id:"septic",      title:"Septic systems",            blurb:"Type 1/2/3 septic and Health Authority approval.", href:"/glossary/septic-system",          type:"glossary" },
    ]),
    S("explore", "Rural BC Regions",    "Fraser Valley, Cariboo, Kootenays, Okanagan, Vancouver Island rural.", [{ id:"regions",title:"BC regions",blurb:"Explore rural regions.",href:"/regions/fraser-valley",type:"community" }]),
    S("plan",    "Rural Cost Planning", "Well, septic, wildfire insurance, road maintenance, snow removal.", []),
    S("search",  "Acreage & Equestrian Search","Browse rural inventory.", [
      { id:"acreages", title:"Acreage listings", blurb:"BC acreage inventory.", href:"/listings?property_type=Acreage", type:"guide" },
      { id:"equestrian", title:"Equestrian Listings ($2M+)", blurb:"Horse-friendly acreage with barn/stable/arena features.", href:"/specialties/equestrian", type:"guide" },
    ]),
    S("offer",   "Rural Due Diligence", "Well flow tests, septic inspection, ALR verification, easements.", []),
    S("closing", "Rural Closing",       "Additional steps unique to rural residential closings.", []),
    S("ownership","Rural Ownership",    "Ongoing maintenance and neighbour-agreement considerations.", []),
  ],
};

// --- INVESTMENT PROPERTY JOURNEY (educational only) ---
const INVESTMENT = {
  slug: "investment", title: "Investment Property (Educational)", icon: "📊",
  short: "General educational content on investment-property concepts. Not investment advice — consult a licensed financial advisor for your situation.",
  intent: "investor",
  stages: [
    S("learn",   "Concepts & Terminology", "Cap rate, cash-on-cash, gross rent multiplier — general educational terms only.", [
      { id:"cap-rate",  title:"Capitalization rate",  blurb:"How cap rate is calculated as a general concept.", href:"/glossary/capitalization-rate", type:"glossary" },
      { id:"rtb",       title:"Residential Tenancy",  blurb:"BC Residential Tenancy Act framework overview.",   href:"/glossary/residential-tenancy-act", type:"glossary" },
    ]),
    S("explore", "BC Market Context",     "Educational overview of BC rental markets by region.", []),
    S("plan",    "Cost & Return Concepts","General educational cost / return concepts. Not financial advice.", []),
    S("search",  "Investment-Inventory Browsing", "Browse duplex / multi-unit inventory.", [{ id:"listings",title:"Multi-unit listings",blurb:"Filter for duplex and multi-unit inventory.",href:"/listings",type:"guide" }]),
    S("offer",   "Investment-Specific Due Diligence", "Rent rolls, RTB tenancies, insurance considerations.", []),
    S("closing", "Investment Closing",    "Educational overview of investment-property closing considerations.", []),
    S("ownership","Landlord Considerations","General educational content on BC's landlord/tenant framework.", []),
  ],
};

// --- HOME OWNERSHIP JOURNEY (for existing owners not currently transacting) ---
const OWNERSHIP = {
  slug: "home-ownership", title: "Home Ownership", icon: "🏡",
  short: "Educational content for current BC homeowners — maintenance, taxes, renovations, and planning for future moves.",
  intent: "owner",
  stages: [
    S("learn",   "Ownership Vocabulary", "Terms every BC homeowner encounters over time.", [
      { id:"deferred-maint", title:"Deferred maintenance",    blurb:"What accumulates over years and how to plan.", href:"/glossary/deferred-maintenance", type:"glossary" },
    ]),
    S("explore", "Community Resources",  "Local schools, transit, and municipal services.",         [{ id:"communities",title:"BC community profiles",blurb:"Explore your community's evolving profile.",href:"/communities",type:"community" }]),
    S("plan",    "Annual Owner Checklist","Insurance review, property tax, Home Owner Grant.",       []),
    S("search",  "Refinance & Second-Home Concepts", "Educational-only concepts if you're researching next steps.", []),
    S("offer",   "Renovation Planning",  "Permits, building codes, and general educational information about renovations.", []),
    S("closing", "Life-Stage Transitions","Downsizing, right-sizing, and moving for lifestyle change.", []),
    S("ownership","Selling Later",       "When the time comes — continue to the Selling Journey.", [{ id:"selling", title:"Selling Journey", blurb:"Continue to seller-focused educational content.", href:"/journey/selling", type:"guide" }]),
  ],
};

// Ordered list — controls display order on the /journey landing page and
// the "Begin Your Real Estate Journey" homepage section.
export const JOURNEYS_ORDER = [
  "buying",
  "selling",
  "buying-and-selling",
  "condo-strata",
  "first-time-buyer",
  "new-construction",
  "acreages",
  "investment",
  "home-ownership",
];

export const JOURNEYS = {
  buying: BUYING,
  selling: SELLING,
  "buying-and-selling": BUY_AND_SELL,
  "condo-strata": CONDO_STRATA,
  "first-time-buyer": FIRST_TIME,
  "new-construction": NEW_CONSTRUCTION,
  acreages: ACREAGES,
  investment: INVESTMENT,
  "home-ownership": OWNERSHIP,
};

export const JOURNEY_COMPLIANCE_NOTICE = "Educational information only. Not real estate, legal, tax, financial, mortgage, or investment advice. Consumers exploring a specific property, transaction, or investment should consult their own licensed BC REALTOR®, lawyer or notary, and financial advisor.";
