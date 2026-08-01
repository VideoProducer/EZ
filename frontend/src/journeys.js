// EZtoFind.ca Interactive Real Estate Journey Platform
// -----------------------------------------------------
// Phase 2 build — all 9 journeys fully populated with hand-crafted,
// BCFSA/CREA/PIPA/CASL-compliant educational modules. No LLM-generated
// text sits in this file; every module points to EXISTING content
// elsewhere on the site (glossary, community pages, calculators) rather
// than duplicating it.
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

const S = (id, title, description, modules) => ({ id, title, description, modules: modules || [] });

// --- BUYING JOURNEY (reference implementation) ---
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
      { id:"closing-costs",   title:"Closing costs 101",              blurb:"Property Transfer Tax, legal fees, adjustments — what to plan for.", href:"/glossary/property-transfer-tax-ptt",       type:"glossary" },
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
      { id:"ptt-calc",        title:"Property Transfer Tax",          blurb:"How BC's 1% / 2% / 3% / 5% / 20% tiered PTT rates work + exemptions.",   href:"/glossary/property-transfer-tax-ptt", type:"calculator" },
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
      { id:"property-tax",    title:"Annual property tax",            blurb:"How BC municipalities calculate, the Home Owner Grant, and Speculation Tax.", href:"/glossary/homeowner-grant",  type:"glossary" },
      { id:"insurance-review",title:"Insurance review",               blurb:"Annual review cadence and what to reassess.",                             href:"/glossary/home-insurance", type:"glossary" },
      { id:"selling-later",   title:"When you're ready to sell",      blurb:"Continue to the Selling Journey when the time comes.",                    href:"/journey/selling",             type:"guide" },
    ]),
  ],
};

// --- SELLING JOURNEY ---
const SELLING = {
  slug: "selling", title: "Selling a Home", icon: "🏷️",
  short: "Understand the selling process from preparing your home to completion day — educational information at every stage.",
  intent: "seller",
  stages: [
    S("prepare", "Preparing to Sell", "Get comfortable with the vocabulary, paperwork, and timing considerations that shape most BC residential sales.", [
      { id:"listing-agreement", title:"Listing agreement",     blurb:"What a Multiple Listing Contract typically contains and how commissions are structured.", href:"/glossary/listing-agreement",      type:"glossary" },
      { id:"seller-disclosure", title:"Property Disclosure Statement (PDS)", blurb:"BCREA-standard disclosure form — what sellers typically complete.", href:"/glossary/property-disclosure-statement", type:"glossary" },
      { id:"title-recap",       title:"Confirm title & charges", blurb:"How to review your title, mortgage payout, and any easements before listing.", href:"/glossary/title-search",         type:"glossary" },
      { id:"deferred-maint",    title:"Deferred maintenance",   blurb:"Common items sellers address before listing to reduce buyer objections.",     href:"/glossary/deferred-maintenance", type:"glossary" },
    ]),
    S("value", "Understanding Market Value", "General information about how residential value is estimated in BC. Not an appraisal.", [
      { id:"valuation",   title:"Home valuation estimator",   blurb:"General educational estimate using MLS® comparables. Not an opinion of value.", href:"/valuation",                          type:"calculator" },
      { id:"assessment",  title:"BC Assessment vs. market value", blurb:"Why the July 1 assessed value rarely equals current market value.",           href:"/glossary/bc-assessment-value",             type:"glossary" },
      { id:"comparables", title:"Comparable sales",           blurb:"How sold comps are selected and adjusted in a Comparative Market Analysis.",     href:"/glossary/comparative-market-analysis-cma", type:"glossary" },
    ]),
    S("photos", "Preparing Your Home", "Staging, decluttering, and photography — general educational context on how listings are presented.", [
      { id:"staging",     title:"Staging basics",             blurb:"What professional stagers typically do and when sellers consider it.", href:"/glossary/home-staging",           type:"glossary" },
      { id:"photography", title:"Professional photography",   blurb:"How MLS® photography sets, twilight shots, and drone imagery are commonly used.", href:"/glossary/mls-photography", type:"glossary" },
      { id:"pre-inspect", title:"Pre-listing inspection (optional)", blurb:"Educational information on why some sellers order an inspection before listing.", href:"/glossary/home-inspection", type:"glossary" },
    ]),
    S("list", "Listing Process", "What happens once your listing goes live on MLS®.", [
      { id:"mls-exposure", title:"MLS® exposure",             blurb:"How the CREA DDF® and REALTOR.ca distribute your listing across BC and Canada.", href:"/glossary/mls",             type:"glossary" },
      { id:"days-on-mkt",  title:"Days on Market (DOM)",      blurb:"How DOM is calculated and how it affects perception.",                        href:"/glossary/days-on-market-dom",  type:"glossary" },
      { id:"open-houses",  title:"Open houses & showings",    blurb:"How showings are typically scheduled with lockboxes and confirmation apps.",  href:"/glossary/open-house",      type:"glossary" },
    ]),
    S("showings", "Showings & Offers", "General educational information about how offers arrive and are presented.", [
      { id:"offer-forms",     title:"Contract of Purchase & Sale", blurb:"BCREA-standard offer form — the fields and clauses buyers commonly use.", href:"/glossary/offer-contract-of-purchase-and-sale", type:"glossary" },
      { id:"multiple-offers", title:"Multiple offer scenarios",    blurb:"General educational overview of how competitive offers are typically handled.", href:"/glossary/multiple-offers", type:"glossary" },
      { id:"deposits-held",   title:"Deposits held in trust",      blurb:"How buyer deposits are typically held by the listing brokerage in trust.",         href:"/glossary/deposit", type:"glossary" },
    ]),
    S("negotiate", "Negotiations & Conditions", "General information about the subject-removal period and common conditions.", [
      { id:"subjects-sell",  title:"Buyer subject clauses",       blurb:"What financing, inspection, insurance, and strata-doc subjects typically involve.", href:"/glossary/subject-clauses", type:"glossary" },
      { id:"counter-offer",  title:"Counter offers",              blurb:"Educational information about how counters are typically presented in BC.",         href:"/glossary/counter-offer",   type:"glossary" },
      { id:"backup-offers",  title:"Backup offers",               blurb:"Understanding backup offer positions if the primary offer collapses.",              href:"/glossary/backup-offer",    type:"glossary" },
    ]),
    S("complete", "Completion & Moving", "Educational context on the closing sequence for BC residential sales.", [
      { id:"completion",     title:"Completion date",             blurb:"When funds and title change hands. Set by the accepted offer.",           href:"/glossary/completion-date",     type:"glossary" },
      { id:"possession",     title:"Possession date",             blurb:"When the buyer receives keys — typically one day after completion in BC.", href:"/glossary/possession-date",     type:"glossary" },
      { id:"adjustments",    title:"Statement of adjustments",    blurb:"How property tax, strata fees, and utilities are pro-rated at closing.",  href:"/glossary/statement-of-adjustments", type:"glossary" },
      { id:"selling-later",  title:"Ready to buy next?",          blurb:"Continue to the Buying Journey when you're planning your next home.",     href:"/journey/buying",              type:"guide" },
    ]),
  ],
};

// --- BUYING & SELLING JOURNEY ---
const BUY_AND_SELL = {
  slug: "buying-and-selling", title: "Buying & Selling at the Same Time", icon: "🔄",
  short: "Educational information on managing an interlocked purchase and sale — timing, financing, and possession considerations.",
  intent: "both",
  stages: [
    S("sequence", "Sequence Options", "Sell-first, buy-first, or simultaneous — general educational overview of each approach and the trade-offs consumers commonly weigh.", [
      { id:"sell-first",  title:"Sell-first approach",   blurb:"Certainty of proceeds and no bridge financing — but temporary housing may be needed.",   href:"/glossary/sell-first",  type:"glossary" },
      { id:"buy-first",   title:"Buy-first approach",    blurb:"Certainty of next home — but bridge financing and dual-carrying costs may apply.",       href:"/glossary/buy-first",   type:"glossary" },
      { id:"simultaneous",title:"Simultaneous closing", blurb:"How same-day or adjacent-day closings are typically coordinated by lawyers/notaries.",   href:"/glossary/simultaneous-closing", type:"glossary" },
    ]),
    S("timing", "Timing & Bridge Financing", "General information about the financing options consumers explore when purchase and sale don't align.", [
      { id:"bridge-loan",     title:"Bridge financing",             blurb:"How bridge loans typically work in BC and what lenders commonly require.", href:"/glossary/bridge-financing", type:"glossary" },
      { id:"subject-to-sale", title:"Subject-to-sale clauses",      blurb:"Buyer offers conditional on the sale of their existing home.",             href:"/glossary/subject-to-sale",  type:"glossary" },
      { id:"deposit-source",  title:"Where does the deposit come from?", blurb:"Common sources buyers use when their existing home hasn't closed yet.", href:"/glossary/deposit",     type:"glossary" },
    ]),
    S("value", "Understanding Both Values", "Estimating your current home's value while researching what your next purchase may cost.", [
      { id:"valuation",       title:"Home valuation estimator",     blurb:"General educational estimate for your existing home.", href:"/valuation", type:"calculator" },
      { id:"listings",        title:"Search your next home",         blurb:"Browse live MLS® inventory to gauge next-purchase pricing.", href:"/listings", type:"guide" },
      { id:"ptt-calc",        title:"Property Transfer Tax on next purchase", blurb:"How PTT applies to your next purchase — including any first-time or newly-built exemptions.", href:"/glossary/property-transfer-tax-ptt", type:"calculator" },
    ]),
    S("plan", "Plan Overlapping Costs", "General educational overview of the double-cost period and the deposits, taxes, and moving expenses involved.", [
      { id:"double-costs",  title:"Double-cost period", blurb:"Common overlapping costs when both homes are owned briefly.",           href:"/glossary/double-cost-period", type:"glossary" },
      { id:"stress-test",   title:"Mortgage stress test on second home", blurb:"How OSFI's stress test applies when carrying two mortgages temporarily.", href:"/glossary/mortgage", type:"glossary" },
      { id:"moving-budget", title:"Moving budget",     blurb:"Common line items — movers, insurance, utilities, storage.",             href:"/glossary/moving-costs",       type:"glossary" },
    ]),
    S("search", "Search Your Next Home", "Continue browsing MLS® inventory across BC.", [
      { id:"listings",   title:"Browse listings",              blurb:"Live BC-wide MLS® inventory refreshed hourly.",           href:"/listings", type:"guide" },
      { id:"communities",title:"Explore communities",           blurb:"239 community profiles with climate and lifestyle context.", href:"/communities", type:"community" },
      { id:"favorites",  title:"Save & compare favourites",    blurb:"Track prospective homes across devices.",                  href:"/favorites", type:"guide" },
    ]),
    S("closing", "Coordinating Closings", "Common tools and terms for aligning two completion dates.", [
      { id:"interim-occupancy", title:"Interim occupancy",   blurb:"When completion and possession dates don't fully align.",              href:"/glossary/interim-occupancy",   type:"glossary" },
      { id:"escrow",            title:"Escrow & closing funds", blurb:"How lawyers/notaries hold funds across two transactions.",           href:"/glossary/escrow",              type:"glossary" },
      { id:"insurance-gap",     title:"Insurance overlap",   blurb:"Insurance considerations when both properties are owned briefly.",     href:"/glossary/home-insurance", type:"glossary" },
    ]),
    S("ownership", "Settled In", "Educational information on transitioning from moving day to new ownership.", [
      { id:"utility-transfer", title:"Utility & service transfer", blurb:"BC Hydro, FortisBC, ICBC, municipal utilities — cutover checklist.", href:"/glossary/utility-costs", type:"glossary" },
      { id:"new-ownership",    title:"First-year ownership tips",  blurb:"Common items new owners plan for in year one.",                    href:"/journey/home-ownership", type:"guide" },
    ]),
  ],
};

// --- CONDO / STRATA JOURNEY ---
const CONDO_STRATA = {
  slug: "condo-strata", title: "Condo & Strata Living", icon: "🏢",
  short: "Everything to research about strata governance, fees, and lifestyle before buying or selling a strata unit in BC.",
  intent: "buyer-or-owner",
  stages: [
    S("learn", "Strata Fundamentals", "How BC's Strata Property Act shapes governance, fees, and rules.", [
      { id:"strata-corp",   title:"Strata Corporation",        blurb:"The governing entity of every BC strata.",             href:"/glossary/strata-corporation",     type:"glossary" },
      { id:"strata-fees",   title:"Strata fees",               blurb:"What monthly fees cover — and don't cover.",           href:"/glossary/strata-fees",            type:"glossary" },
      { id:"contingency",   title:"Contingency Reserve Fund",  blurb:"How CRF works and why depreciation reports matter.", href:"/glossary/contingency-reserve-fund-crf", type:"glossary" },
      { id:"strata-council",title:"Strata council",            blurb:"Who runs the strata and how council decisions are made.", href:"/glossary/strata-council",       type:"glossary" },
      { id:"bylaws",        title:"Bylaws & rules",            blurb:"How bylaws differ from rules and how they're changed.", href:"/glossary/strata-bylaws",           type:"glossary" },
    ]),
    S("explore", "Common Strata Types", "Freehold, bare-land, phased strata — general educational context on structural differences.", [
      { id:"freehold-strata",  title:"Freehold strata",       blurb:"The most common strata type in BC.",                       href:"/glossary/freehold-strata", type:"glossary" },
      { id:"bare-land-strata", title:"Bare-land strata",      blurb:"Common in townhome and rural developments.",                href:"/glossary/bare-land-strata", type:"glossary" },
      { id:"leasehold",        title:"Leasehold strata",      blurb:"When the underlying land is leased — common near universities and First Nations lands.", href:"/glossary/leasehold", type:"glossary" },
    ]),
    S("plan", "Cost Planning", "Strata fees, special levies, insurance deductibles — what to budget for.", [
      { id:"special-levy",       title:"Special levies",           blurb:"When and why councils raise special levies.",          href:"/glossary/special-levy",        type:"glossary" },
      { id:"strata-insurance",   title:"Strata insurance",         blurb:"What the strata's insurance covers vs. what the owner's does.", href:"/glossary/strata-insurance",   type:"glossary" },
      { id:"deductible-coverage",title:"Deductible coverage",      blurb:"Why owners typically carry deductible-coverage insurance.", href:"/glossary/deductible-coverage", type:"glossary" },
      { id:"ptt-strata",         title:"Property Transfer Tax",    blurb:"How PTT applies to strata purchases.",                href:"/glossary/property-transfer-tax-ptt", type:"calculator" },
    ]),
    S("search", "Condo Search", "Browse strata inventory across BC.", [
      { id:"condos",       title:"Condo specialty page",       blurb:"BC-wide condo inventory with filters for age, size, and amenities.", href:"/specialties/condos",   type:"guide" },
      { id:"townhomes",    title:"Townhome specialty page",    blurb:"BC-wide townhome inventory.",                                     href:"/specialties/townhomes", type:"guide" },
      { id:"communities",  title:"Explore strata-heavy communities", blurb:"Downtown Vancouver, Burnaby, Coquitlam, Victoria, Kelowna.", href:"/communities",           type:"community" },
    ]),
    S("offer", "Strata Due Diligence", "Minutes, Form B, Form F, depreciation reports — what a strata-purchase typically reviews.", [
      { id:"form-b",           title:"Form B",              blurb:"Certificate of strata information — what it discloses.",  href:"/glossary/form-b",              type:"glossary" },
      { id:"form-f",           title:"Form F",              blurb:"Certificate of payment — required for closing.",           href:"/glossary/form-f",              type:"glossary" },
      { id:"depreciation",     title:"Depreciation report", blurb:"5-year, 10-year, and 20-year replacement projections.",   href:"/glossary/depreciation-report",  type:"glossary" },
      { id:"minutes-review",   title:"Council meeting minutes review", blurb:"What buyers commonly look for in the last 2 years of minutes.", href:"/glossary/strata-minutes", type:"glossary" },
    ]),
    S("closing", "Closing & Move-In", "Strata-specific closing steps beyond the standard purchase.", [
      { id:"move-in-fees",   title:"Move-in fees & bookings",  blurb:"How elevator bookings and move-in fees work in most BC strata.",  href:"/glossary/move-in-fees",   type:"glossary" },
      { id:"strata-mgmt",    title:"Strata management",       blurb:"How professional strata management typically operates.",         href:"/glossary/strata-management", type:"glossary" },
      { id:"utility-strata", title:"Included vs. metered utilities", blurb:"What's bundled into fees vs. billed separately.",       href:"/glossary/utility-costs",  type:"glossary" },
    ]),
    S("ownership", "Living in a Strata", "Bylaws, rules, AGMs, and getting involved in council if you choose.", [
      { id:"agm",             title:"Annual General Meeting", blurb:"How AGMs and voting typically work.",                  href:"/glossary/annual-general-meeting-agm", type:"glossary" },
      { id:"rentals-strata",  title:"Rental & pet restrictions", blurb:"BC 2022 changes and current rental restrictions.", href:"/glossary/strata-rental-restrictions", type:"glossary" },
      { id:"selling-strata",  title:"Selling your strata unit", blurb:"Continue to the Selling Journey.",                 href:"/journey/selling", type:"guide" },
    ]),
  ],
};

// --- FIRST-TIME BUYER JOURNEY ---
const FIRST_TIME = {
  slug: "first-time-buyer", title: "First-Time Buyer", icon: "🌱",
  short: "Educational content tailored to consumers exploring home ownership for the first time — no assumed knowledge.",
  intent: "buyer",
  stages: [
    S("learn", "Real Estate Vocabulary 101", "Start-from-scratch vocabulary primer for the terms you'll hear again and again.", [
      { id:"glossary-index", title:"Full glossary (398 terms)",   blurb:"Every BC real estate term, plain-language, with statute links.", href:"/glossary",                             type:"glossary" },
      { id:"deposit",        title:"Deposits & subjects",         blurb:"How deposits, trust accounts, and subject clauses work.",       href:"/glossary/deposit",                      type:"glossary" },
      { id:"mortgage-101",   title:"Mortgages 101",               blurb:"Amortization, fixed vs. variable, insured vs. conventional.",   href:"/glossary/mortgage",                     type:"glossary" },
      { id:"strata-basics",  title:"Strata basics",               blurb:"If you're considering a condo or townhome, start here.",         href:"/glossary/strata-corporation",           type:"glossary" },
      { id:"ptt-basics",     title:"Property Transfer Tax basics",blurb:"The tax you pay on closing day.",                                href:"/glossary/property-transfer-tax-ptt",         type:"glossary" },
    ]),
    S("explore", "Communities on a Budget", "Educational context on lower-priced BC regions and neighbourhoods.", [
      { id:"communities", title:"BC communities",            blurb:"Browse 239 community profiles.",                                 href:"/communities", type:"community" },
      { id:"fraser-vy",   title:"Fraser Valley",             blurb:"Abbotsford, Chilliwack, Mission — often more accessible than Metro Vancouver.", href:"/regions/fraser-valley", type:"community" },
      { id:"vi-affordable", title:"Vancouver Island (outside Victoria)", blurb:"Nanaimo, Comox Valley, Port Alberni — a range of price points.", href:"/regions/vancouver-island", type:"community" },
      { id:"quiz",        title:"Where should you live? quiz", blurb:"5-question exploration tool.",                                 href:"/where-should-you-live", type:"guide" },
    ]),
    S("plan", "First-Time Buyer Programs", "General information about BC and federal programs first-time buyers often research.", [
      { id:"ptt-exempt",     title:"PTT first-time exemption",       blurb:"BC Property Transfer Tax exemption — eligibility criteria.",       href:"/glossary/property-transfer-tax-ptt",         type:"glossary" },
      { id:"fhsa",           title:"First Home Savings Account",     blurb:"Federal FHSA program — general educational content.",              href:"/glossary/first-home-savings-account-fhsa",    type:"glossary" },
      { id:"hbp",            title:"Home Buyers' Plan (RRSP)",       blurb:"Federal RRSP HBP program — general educational content.",          href:"/glossary/home-buyers-plan-hbp",              type:"glossary" },
      { id:"newly-built",    title:"Newly built home PTT exemption", blurb:"Different exemption for newly-built homes up to a price threshold.", href:"/glossary/property-transfer-tax-ptt",       type:"glossary" },
      { id:"affordability",  title:"Affordability estimator",         blurb:"See what monthly payments look like across price points.",         href:"/valuation",                              type:"calculator" },
    ]),
    S("search", "Your First Search", "Browsing tips and how to use saved searches.", [
      { id:"listings",   title:"Browse MLS® listings",       blurb:"BC-wide inventory refreshed hourly.",                       href:"/listings", type:"guide" },
      { id:"favorites",  title:"Save your favourites",       blurb:"Bookmark listings on any device.",                          href:"/favorites", type:"guide" },
      { id:"saved-src",  title:"Save a search",              blurb:"Get educational updates when new listings match your criteria.", href:"/listings", type:"guide" },
    ]),
    S("offer", "First Offer — General Info", "General educational information — a specific offer requires your own licensed REALTOR®.", [
      { id:"cpps",         title:"Contract of Purchase & Sale",  blurb:"BCREA-standard offer form — the fields and clauses buyers commonly use.", href:"/glossary/offer-contract-of-purchase-and-sale", type:"glossary" },
      { id:"subjects",     title:"Subject clauses",              blurb:"How subject removal works step-by-step.",                                  href:"/glossary/subject-clauses",     type:"glossary" },
      { id:"inspection",   title:"Home inspection",              blurb:"What a BC-licensed inspector's report typically covers.",                  href:"/glossary/home-inspection",     type:"glossary" },
      { id:"deposit-first",title:"Your first deposit",           blurb:"How the deposit is delivered, held, and applied.",                          href:"/glossary/deposit",             type:"glossary" },
    ]),
    S("closing", "First Closing", "Educational overview of the closing day experience.", [
      { id:"lawyer-notary",  title:"Choosing a lawyer or notary", blurb:"What a BC conveyancing professional typically does.",     href:"/glossary/lawyer-or-notary",  type:"glossary" },
      { id:"closing-costs",  title:"Closing cost checklist",       blurb:"PTT, legal, title insurance, adjustments — a common budget baseline.", href:"/glossary/property-transfer-tax-ptt", type:"glossary" },
      { id:"completion",     title:"Completion & possession",      blurb:"The two dates every buyer tracks in the final week.",     href:"/glossary/completion-date",   type:"glossary" },
    ]),
    S("ownership", "Your First Year", "Common surprises and ongoing responsibilities for new owners.", [
      { id:"first-year-maint", title:"First-year maintenance",   blurb:"Filters, alarms, seasonal tasks — a starter checklist.",  href:"/glossary/deferred-maintenance", type:"glossary" },
      { id:"home-owner-grant", title:"BC Home Owner Grant",       blurb:"Annual property-tax grant — how to apply.",              href:"/glossary/homeowner-grant",     type:"glossary" },
      { id:"insurance-first",  title:"Homeowner insurance",       blurb:"Reviewing coverage annually.",                            href:"/glossary/home-insurance",  type:"glossary" },
      { id:"next-journey",     title:"Continue to Home Ownership",blurb:"Long-term ownership journey.",                            href:"/journey/home-ownership",         type:"guide" },
    ]),
  ],
};

// --- ACREAGES & RURAL LIVING JOURNEY ---
const ACREAGES = {
  slug: "acreages", title: "Acreages & Rural Living", icon: "🐎",
  short: "Educational content for consumers researching acreage, hobby farm, or equestrian properties in BC.",
  intent: "buyer",
  stages: [
    S("learn", "Rural Fundamentals", "ALR, well and septic systems, wildfire and flood considerations.", [
      { id:"alr",        title:"Agricultural Land Reserve",  blurb:"How the ALR protects farmland and limits use.",       href:"/glossary/agricultural-land-reserve-alr", type:"glossary" },
      { id:"well-water", title:"Well water & water rights",  blurb:"Groundwater licensing and testing.",                   href:"/glossary/water-rights",              type:"glossary" },
      { id:"septic",     title:"Septic systems",             blurb:"Type 1/2/3 septic and Health Authority approval.",     href:"/glossary/septic-system",             type:"glossary" },
      { id:"zoning",     title:"Rural zoning",               blurb:"How Regional Districts and municipalities zone rural land.", href:"/glossary/zoning",                    type:"glossary" },
      { id:"riparian",   title:"Riparian & watercourse setbacks", blurb:"BC's Riparian Areas Protection Regulation (RAPR).", href:"/glossary/riparian-areas",            type:"glossary" },
    ]),
    S("explore", "Rural BC Regions", "Fraser Valley, Cariboo, Kootenays, Okanagan, Vancouver Island rural.", [
      { id:"fraser-valley", title:"Fraser Valley rural",    blurb:"Langley, Aldergrove, Chilliwack, Agassiz rural pockets.", href:"/regions/fraser-valley",   type:"community" },
      { id:"cariboo",       title:"Cariboo & Chilcotin",     blurb:"Larger acreages and working ranches.",                     href:"/regions/cariboo",          type:"community" },
      { id:"okanagan",      title:"Okanagan rural",          blurb:"Vineyards, orchards, and lakeside acreages.",              href:"/regions/okanagan",         type:"community" },
      { id:"vi-rural",      title:"Vancouver Island rural",  blurb:"Cowichan Valley, Comox Valley, and north-Island acreage.", href:"/regions/vancouver-island", type:"community" },
    ]),
    S("plan", "Rural Cost Planning", "Well, septic, wildfire insurance, road maintenance, snow removal — beyond urban ownership costs.", [
      { id:"wildfire-risk", title:"Wildfire risk & FireSmart", blurb:"How BC assesses wildfire risk and insurance implications.", href:"/glossary/wildfire-risk",       type:"glossary" },
      { id:"rural-insurance",title:"Rural insurance considerations", blurb:"Higher premiums, deductibles, and coverage gaps to understand.", href:"/glossary/rural-insurance", type:"glossary" },
      { id:"road-access",   title:"Road access & maintenance", blurb:"Public vs. private roads and easements.",                 href:"/glossary/road-access",         type:"glossary" },
      { id:"utilities-rural",title:"Rural utilities",         blurb:"BC Hydro extensions, propane, wood heat, and off-grid options.", href:"/glossary/utility-costs", type:"glossary" },
    ]),
    S("search", "Acreage & Equestrian Search", "Browse rural inventory.", [
      { id:"acreages",   title:"Acreage listings",             blurb:"BC acreage inventory.",                                 href:"/listings?property_type=Acreage", type:"guide" },
      { id:"equestrian", title:"Equestrian Listings ($2M+)",   blurb:"Horse-friendly acreage with barn/stable/arena features.", href:"/specialties/equestrian",         type:"guide" },
      { id:"farm-mls",   title:"Working farms & hobby farms",  blurb:"MLS® inventory of BC farmland listings.",                href:"/listings?property_type=Farm",    type:"guide" },
    ]),
    S("offer", "Rural Due Diligence", "Well flow tests, septic inspection, ALR verification, easements.", [
      { id:"well-flow",       title:"Well flow test",              blurb:"How buyers typically verify water quantity and quality.", href:"/glossary/well-flow-test",       type:"glossary" },
      { id:"septic-inspect",  title:"Septic inspection",           blurb:"What a Registered Onsite Wastewater Practitioner checks.", href:"/glossary/septic-inspection",   type:"glossary" },
      { id:"alr-verify",      title:"ALR & farm-status verification",blurb:"How to confirm ALR designation and farm-status tax.",   href:"/glossary/agricultural-land-reserve-alr", type:"glossary" },
      { id:"easements",       title:"Easements & right-of-way",     blurb:"Utility, access, and neighbour easements to look for.",   href:"/glossary/easement",             type:"glossary" },
    ]),
    S("closing", "Rural Closing", "Additional steps unique to rural residential closings.", [
      { id:"survey",       title:"Boundary survey",            blurb:"When buyers commonly request a fresh Real Property Report.", href:"/glossary/real-property-report", type:"glossary" },
      { id:"rural-legal",  title:"Rural conveyance nuances",   blurb:"ALR, easement, and water-licence considerations at closing.", href:"/glossary/lawyer-or-notary",     type:"glossary" },
    ]),
    S("ownership", "Rural Ownership", "Ongoing maintenance and neighbour-agreement considerations.", [
      { id:"seasonal-maint", title:"Seasonal rural maintenance", blurb:"Well, septic, roof, fencing, wildfire mitigation.",     href:"/glossary/deferred-maintenance", type:"glossary" },
      { id:"neighbour-fence",title:"Fence-line & neighbour agreements", blurb:"Common informal agreements and BC's Fence Act principles.", href:"/glossary/fence-act",  type:"glossary" },
      { id:"tax-farm",       title:"Farm-status property tax",   blurb:"How BC farm-status classification affects annual property tax.", href:"/glossary/farm-status", type:"glossary" },
    ]),
  ],
};

// --- HOME OWNERSHIP JOURNEY (for existing owners not currently transacting) ---
const OWNERSHIP = {
  slug: "home-ownership", title: "Home Ownership", icon: "🏡",
  short: "Educational content for current BC homeowners — maintenance, taxes, renovations, and planning for future moves.",
  intent: "owner",
  stages: [
    S("learn", "Ownership Vocabulary", "Terms every BC homeowner encounters over time.", [
      { id:"deferred-maint",  title:"Deferred maintenance",     blurb:"What accumulates over years and how to plan.",       href:"/glossary/deferred-maintenance",  type:"glossary" },
      { id:"depreciation",    title:"Depreciation & wear",       blurb:"How building components typically depreciate over decades.", href:"/glossary/depreciation-report", type:"glossary" },
      { id:"assessment",      title:"BC Assessment",              blurb:"Annual July-1 assessed value and how it's used.",   href:"/glossary/bc-assessment-value",         type:"glossary" },
      { id:"property-tax",    title:"Municipal property tax",    blurb:"How BC municipalities calculate annual tax.",       href:"/glossary/property-tax",           type:"glossary" },
    ]),
    S("explore", "Community Resources", "Local schools, transit, and municipal services.", [
      { id:"communities", title:"BC community profiles",       blurb:"Explore your community's evolving profile.",  href:"/communities",       type:"community" },
      { id:"regions",     title:"BC regions",                    blurb:"Regional overview of BC.",                     href:"/regions/greater-vancouver", type:"community" },
    ]),
    S("plan", "Annual Owner Checklist", "Insurance review, property tax, Home Owner Grant, and seasonal tasks.", [
      { id:"home-owner-grant", title:"BC Home Owner Grant",     blurb:"Annual property-tax grant.",                   href:"/glossary/homeowner-grant",     type:"glossary" },
      { id:"insurance-annual", title:"Annual insurance review", blurb:"What to reassess each year.",                  href:"/glossary/home-insurance",  type:"glossary" },
      { id:"seasonal-checklist",title:"Seasonal maintenance",   blurb:"Spring, summer, fall, winter routine checklists.", href:"/glossary/deferred-maintenance", type:"glossary" },
      { id:"climate-risk",     title:"Climate & weather risk",  blurb:"BC-specific wildfire, flood, and atmospheric-river considerations.", href:"/glossary/wildfire-risk", type:"glossary" },
    ]),
    S("search", "Refinance & Second-Home Concepts", "Educational-only concepts if you're researching next steps.", [
      { id:"heloc",         title:"Home equity line of credit", blurb:"How HELOCs work as a general concept.",         href:"/glossary/heloc",              type:"glossary" },
      { id:"refinance",     title:"Refinancing",                blurb:"General educational context on refinance at renewal.", href:"/glossary/refinance",  type:"glossary" },
      { id:"reverse-mtg",   title:"Reverse mortgage — general info", blurb:"How reverse mortgages work as a general concept.", href:"/glossary/reverse-mortgage", type:"glossary" },
      { id:"second-home",   title:"Second-home research",         blurb:"Considerations for recreational-property research.", href:"/listings", type:"guide" },
    ]),
    S("offer", "Renovation Planning", "Permits, building codes, and general educational information about renovations.", [
      { id:"building-permit", title:"Building permits",         blurb:"When municipal permits are typically required.", href:"/glossary/building-permit", type:"glossary" },
      { id:"heritage",        title:"Heritage designations",     blurb:"Heritage bylaws and their impact on renovations.", href:"/glossary/heritage-designation", type:"glossary" },
      { id:"strata-reno",     title:"Strata renovation approval", blurb:"How strata bylaws typically govern alterations.", href:"/glossary/strata-bylaws", type:"glossary" },
      { id:"contractor",      title:"Contractor licensing",     blurb:"Verifying licence and BC WorkSafe registration.", href:"/glossary/contractor-licensing", type:"glossary" },
    ]),
    S("closing", "Life-Stage Transitions", "Downsizing, right-sizing, and moving for lifestyle change.", [
      { id:"downsize",       title:"Downsizing considerations", blurb:"How consumers commonly plan a smaller-home move.", href:"/glossary/downsizing", type:"glossary" },
      { id:"aging-in-place", title:"Aging in place",             blurb:"Accessibility renovations and long-term planning.", href:"/glossary/aging-in-place", type:"glossary" },
      { id:"estate-planning",title:"Estate planning basics",     blurb:"General educational overview — consult your own lawyer or notary.", href:"/glossary/estate-planning", type:"glossary" },
    ]),
    S("ownership", "Selling Later", "When the time comes — continue to the Selling Journey.", [
      { id:"selling", title:"Selling Journey",           blurb:"Continue to seller-focused educational content.", href:"/journey/selling", type:"guide" },
      { id:"valuation-owner",title:"Valuation estimator",  blurb:"See where market value may stand.",             href:"/valuation",       type:"calculator" },
    ]),
  ],
};

// Ordered list — controls display order on the /journey landing page and
// the "Begin Your Real Estate Journey" homepage section.
// Investment Property and New Construction journeys have been removed per
// Doug's editorial direction (2026-02-01) — those topics remain available
// via the glossary + community pages but not as dedicated journeys.
export const JOURNEYS_ORDER = [
  "buying",
  "selling",
  "buying-and-selling",
  "condo-strata",
  "first-time-buyer",
  "acreages",
  "home-ownership",
];

export const JOURNEYS = {
  buying: BUYING,
  selling: SELLING,
  "buying-and-selling": BUY_AND_SELL,
  "condo-strata": CONDO_STRATA,
  "first-time-buyer": FIRST_TIME,
  acreages: ACREAGES,
  "home-ownership": OWNERSHIP,
};

export const JOURNEY_COMPLIANCE_NOTICE = "Educational information only. Not real estate, legal, tax, financial, mortgage, or investment advice. Consumers exploring a specific property, transaction, or investment should consult their own licensed BC REALTOR®, lawyer or notary, and financial advisor.";
