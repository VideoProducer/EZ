// EZtoFind.ca — Journey Templates (private, admin-side only)
// -----------------------------------------------------------
// These templates are NO LONGER PUBLIC. They are used by Doug in the admin
// "Client Journeys" curator to build a personalized plan for each client,
// and are also referenced by the client-facing /my-journey/:token page to
// resolve module titles/blurbs/hrefs from stage_id + module_id.
//
// Compliance: BCFSA/CREA/PIPA/CASL-aligned. Framings are educational only
// ("Consumers often…", "You may wish to explore…"). Never provide advice.

const S = (id, title, description, modules) => ({ id, title, description, modules: modules || [] });

// --- BUYING JOURNEY ---
const BUYING = {
  slug: "buying",
  title: "Buying a Home",
  icon: "🔑",
  short: "Understand the buying process from mortgage basics to closing day.",
  stages: [
    S("learn", "Learn", "Familiarize yourself with the vocabulary and mechanics of buying a home in BC.", [
      { id:"deposit",         title:"What is a deposit?",             blurb:"Deposits, subject removal, and how funds are held in trust in BC.", href:"/glossary/deposit",                       type:"glossary" },
      { id:"title",           title:"Understanding title",            blurb:"How the BC Land Title & Survey Authority records ownership.",      href:"/glossary/title-search",                  type:"glossary" },
      { id:"mortgage-terms",  title:"Mortgage terminology",           blurb:"Amortization, fixed vs. variable, and the OSFI stress test.",      href:"/glossary/mortgage",                      type:"glossary" },
      { id:"closing-costs",   title:"Closing costs 101",              blurb:"Property Transfer Tax, legal fees, adjustments — what to plan for.", href:"/glossary/property-transfer-tax-ptt",  type:"glossary" },
      { id:"strata-basics",   title:"Strata basics",                  blurb:"Fees, bylaws, and the depreciation report system in BC.",          href:"/glossary/strata-corporation",            type:"glossary" },
      { id:"gst-new-homes",   title:"GST on new construction",        blurb:"Federal GST rules for newly built homes vs. resale.",              href:"/glossary/gst-new-homes",                 type:"glossary" },
    ]),
    S("explore", "Explore", "Get to know BC communities before narrowing your search.", [
      { id:"community-index", title:"Browse BC communities",          blurb:"239 community profiles with geography, climate, and lifestyle context.", href:"/communities",                    type:"community" },
      { id:"community-match", title:"Where should you live? quiz",    blurb:"Optional 5-question exploration tool with educational match results.",   href:"/where-should-you-live",         type:"guide" },
      { id:"regions",         title:"BC regions overview",            blurb:"Greater Vancouver, Fraser Valley, Sea-to-Sky, Okanagan, VI, Kootenays, Northern BC.", href:"/regions/greater-vancouver", type:"community" },
    ]),
    S("plan", "Plan", "Understand affordability, monthly ownership costs, and everything you may wish to budget for.", [
      { id:"affordability",   title:"Affordability estimator",        blurb:"General-information calculator using your income, down payment, and rate assumptions.", href:"/valuation",                type:"calculator" },
      { id:"ptt-calc",        title:"Property Transfer Tax",          blurb:"How BC's 1%/2%/3%/5%/20% tiered PTT rates work + exemptions.",   href:"/glossary/property-transfer-tax-ptt", type:"calculator" },
      { id:"insurance",       title:"Home & title insurance",         blurb:"What lenders require, and optional coverages to research.",             href:"/glossary/title-insurance",     type:"glossary" },
      { id:"utilities",       title:"Utility & monthly costs",        blurb:"BC Hydro, FortisBC, municipal water/sewer, strata fees.",                href:"/glossary/utility-costs",       type:"glossary" },
    ]),
    S("search", "Search", "Browse live MLS® listings across British Columbia.", [
      { id:"listings",        title:"Browse MLS® listings",           blurb:"Live inventory from the CREA DDF®, refreshed hourly.",           href:"/listings",                type:"guide" },
      { id:"specialty-luxury",title:"Luxury Listings ($3M+)",         blurb:"Detached, condos, and townhomes across BC at $3M and above.",   href:"/specialties/luxury",         type:"guide" },
      { id:"specialty-eq",    title:"Equestrian Listings ($2M+)",     blurb:"Horse-friendly properties with barn/stable/arena features.",     href:"/specialties/equestrian",    type:"guide" },
      { id:"favorites",       title:"Save your favourites",           blurb:"Bookmark listings on any device.",                                href:"/favorites",                  type:"guide" },
    ]),
    S("offer", "Offer & Due Diligence", "General information about the offer, subject-removal, and inspection stages.", [
      { id:"subjects",        title:"Subject clauses",                blurb:"Financing, inspection, insurance, title, strata document review.", href:"/glossary/subject-clauses",  type:"glossary" },
      { id:"inspection",      title:"Home inspection",                blurb:"What a BC-licensed home inspector's report typically covers.",     href:"/glossary/home-inspection",   type:"glossary" },
      { id:"strata-docs",     title:"Strata document review",         blurb:"Minutes, financial statements, Form B, depreciation report.",      href:"/glossary/form-b",           type:"glossary" },
      { id:"title-search",    title:"Title search & charges",         blurb:"How a lawyer/notary confirms title before closing.",                href:"/glossary/title-search",     type:"glossary" },
    ]),
    S("closing", "Closing", "Educational information about how a BC residential purchase completes.", [
      { id:"closing-timeline",title:"Typical closing timeline",       blurb:"From subject removal to completion and possession.",             href:"/glossary/completion-date",  type:"glossary" },
      { id:"lawyer-notary",   title:"Lawyer or notary — general info",blurb:"What a BC conveyancing professional typically does at closing.",  href:"/glossary/lawyer-or-notary", type:"glossary" },
      { id:"moving-checklist",title:"Moving checklist",               blurb:"Address changes, utilities, insurance transfer, ICBC.",           href:"/glossary/possession-date",  type:"faq" },
    ]),
    S("ownership", "Home Ownership", "Once you own, ownership is an ongoing responsibility.", [
      { id:"maintenance",     title:"Ongoing maintenance",            blurb:"Seasonal task lists, deferred maintenance, future value impact.", href:"/glossary/deferred-maintenance", type:"glossary" },
      { id:"property-tax",    title:"Annual property tax",            blurb:"How BC municipalities calculate, Home Owner Grant, Spec Tax.",  href:"/glossary/homeowner-grant",  type:"glossary" },
      { id:"insurance-review",title:"Insurance review",               blurb:"Annual review cadence and what to reassess.",                    href:"/glossary/home-insurance", type:"glossary" },
    ]),
  ],
};

// --- SELLING JOURNEY ---
const SELLING = {
  slug: "selling", title: "Selling a Home", icon: "🏷️",
  short: "Understand the selling process from preparing your home to completion day.",
  stages: [
    S("prepare", "Preparing to Sell", "Get comfortable with the vocabulary, paperwork, and timing.", [
      { id:"listing-agreement", title:"Listing agreement",     blurb:"What a Multiple Listing Contract typically contains and how commissions are structured.", href:"/glossary/listing-agreement",      type:"glossary" },
      { id:"seller-disclosure", title:"Property Disclosure Statement (PDS)", blurb:"BCREA-standard disclosure form — what sellers typically complete.", href:"/glossary/property-disclosure-statement", type:"glossary" },
      { id:"title-recap",       title:"Confirm title & charges", blurb:"How to review your title, mortgage payout, and any easements before listing.", href:"/glossary/title-search",         type:"glossary" },
      { id:"deferred-maint",    title:"Deferred maintenance",   blurb:"Common items sellers address before listing to reduce buyer objections.",     href:"/glossary/deferred-maintenance", type:"glossary" },
    ]),
    S("value", "Understanding Market Value", "General information about how residential value is estimated in BC.", [
      { id:"valuation",   title:"Home valuation estimator",   blurb:"General educational estimate using MLS® comparables. Not an appraisal.", href:"/valuation",                          type:"calculator" },
      { id:"assessment",  title:"BC Assessment vs. market value", blurb:"Why the July 1 assessed value rarely equals current market value.",           href:"/glossary/bc-assessment-value",             type:"glossary" },
      { id:"comparables", title:"Comparable sales",           blurb:"How sold comps are selected and adjusted in a CMA.",     href:"/glossary/comparative-market-analysis-cma", type:"glossary" },
    ]),
    S("photos", "Preparing Your Home", "Staging, decluttering, and photography.", [
      { id:"staging",     title:"Staging basics",             blurb:"What professional stagers typically do and when sellers consider it.", href:"/glossary/home-staging",           type:"glossary" },
      { id:"photography", title:"Professional photography",   blurb:"MLS® photography, twilight shots, and drone imagery.", href:"/glossary/mls-photography", type:"glossary" },
      { id:"pre-inspect", title:"Pre-listing inspection (optional)", blurb:"Why some sellers order an inspection before listing.", href:"/glossary/home-inspection", type:"glossary" },
    ]),
    S("list", "Listing Process", "What happens once your listing goes live on MLS®.", [
      { id:"mls-exposure", title:"MLS® exposure",             blurb:"How the CREA DDF® and REALTOR.ca distribute your listing.", href:"/glossary/mls",             type:"glossary" },
      { id:"days-on-mkt",  title:"Days on Market (DOM)",      blurb:"How DOM is calculated and how it affects perception.",       href:"/glossary/days-on-market-dom",  type:"glossary" },
      { id:"open-houses",  title:"Open houses & showings",    blurb:"How showings are scheduled with lockboxes and confirmation apps.",  href:"/glossary/open-house",      type:"glossary" },
    ]),
    S("showings", "Showings & Offers", "How offers arrive and are presented.", [
      { id:"offer-forms",     title:"Contract of Purchase & Sale", blurb:"BCREA-standard offer form — the fields and clauses buyers commonly use.", href:"/glossary/offer-contract-of-purchase-and-sale", type:"glossary" },
      { id:"multiple-offers", title:"Multiple offer scenarios",    blurb:"General educational overview of how competitive offers are typically handled.", href:"/glossary/multiple-offers", type:"glossary" },
      { id:"deposits-held",   title:"Deposits held in trust",      blurb:"How buyer deposits are held by the listing brokerage in trust.",         href:"/glossary/deposit", type:"glossary" },
    ]),
    S("negotiate", "Negotiations & Conditions", "Subject-removal period and common conditions.", [
      { id:"subjects-sell",  title:"Buyer subject clauses",       blurb:"Financing, inspection, insurance, and strata-doc subjects.", href:"/glossary/subject-clauses", type:"glossary" },
      { id:"counter-offer",  title:"Counter offers",              blurb:"How counters are typically presented in BC.",         href:"/glossary/counter-offer",   type:"glossary" },
      { id:"backup-offers",  title:"Backup offers",               blurb:"Backup offer positions if the primary offer collapses.",              href:"/glossary/backup-offer",    type:"glossary" },
    ]),
    S("complete", "Completion & Moving", "Closing sequence for BC residential sales.", [
      { id:"completion",     title:"Completion date",             blurb:"When funds and title change hands.",           href:"/glossary/completion-date",     type:"glossary" },
      { id:"possession",     title:"Possession date",             blurb:"When the buyer receives keys — typically one day after completion in BC.", href:"/glossary/possession-date",     type:"glossary" },
      { id:"adjustments",    title:"Statement of adjustments",    blurb:"How property tax, strata fees, and utilities are pro-rated at closing.",  href:"/glossary/statement-of-adjustments", type:"glossary" },
    ]),
  ],
};

// --- BUYING & SELLING JOURNEY ---
const BUY_AND_SELL = {
  slug: "buying-and-selling", title: "Buying & Selling at the Same Time", icon: "🔄",
  short: "Educational information on managing an interlocked purchase and sale.",
  stages: [
    S("sequence", "Sequence Options", "Sell-first, buy-first, or simultaneous.", [
      { id:"sell-first",  title:"Sell-first approach",   blurb:"Certainty of proceeds and no bridge financing — but temporary housing may be needed.",   href:"/glossary/sell-first",  type:"glossary" },
      { id:"buy-first",   title:"Buy-first approach",    blurb:"Certainty of next home — but bridge financing and dual-carrying costs may apply.",       href:"/glossary/buy-first",   type:"glossary" },
      { id:"simultaneous",title:"Simultaneous closing", blurb:"How same-day or adjacent-day closings are coordinated by lawyers/notaries.",   href:"/glossary/simultaneous-closing", type:"glossary" },
    ]),
    S("timing", "Timing & Bridge Financing", "General information about financing options.", [
      { id:"bridge-loan",     title:"Bridge financing",             blurb:"How bridge loans typically work in BC.", href:"/glossary/bridge-financing", type:"glossary" },
      { id:"subject-to-sale", title:"Subject-to-sale clauses",      blurb:"Buyer offers conditional on the sale of their existing home.",             href:"/glossary/subject-to-sale",  type:"glossary" },
      { id:"deposit-source",  title:"Where does the deposit come from?", blurb:"Common sources when your existing home hasn't closed yet.", href:"/glossary/deposit",     type:"glossary" },
    ]),
    S("value", "Understanding Both Values", "Estimating current home + researching next purchase cost.", [
      { id:"valuation",       title:"Home valuation estimator",     blurb:"Educational estimate for your existing home.", href:"/valuation", type:"calculator" },
      { id:"listings",        title:"Search your next home",         blurb:"Browse live MLS® inventory.", href:"/listings", type:"guide" },
      { id:"ptt-calc",        title:"PTT on next purchase",          blurb:"How PTT applies to your next purchase.", href:"/glossary/property-transfer-tax-ptt", type:"calculator" },
    ]),
    S("plan", "Plan Overlapping Costs", "The double-cost period.", [
      { id:"double-costs",  title:"Double-cost period", blurb:"Common overlapping costs when both homes are owned briefly.", href:"/glossary/double-cost-period", type:"glossary" },
      { id:"stress-test",   title:"Stress test on second home", blurb:"How OSFI's stress test applies when carrying two mortgages temporarily.", href:"/glossary/mortgage", type:"glossary" },
      { id:"moving-budget", title:"Moving budget",     blurb:"Movers, insurance, utilities, storage.",             href:"/glossary/moving-costs",       type:"glossary" },
    ]),
    S("search", "Search Your Next Home", "Continue browsing MLS® inventory.", [
      { id:"listings",   title:"Browse listings",              blurb:"Live BC-wide MLS® inventory refreshed hourly.",           href:"/listings", type:"guide" },
      { id:"communities",title:"Explore communities",           blurb:"239 community profiles with climate and lifestyle context.", href:"/communities", type:"community" },
      { id:"favorites",  title:"Save & compare favourites",    blurb:"Track prospective homes across devices.",                  href:"/favorites", type:"guide" },
    ]),
    S("closing", "Coordinating Closings", "Aligning two completion dates.", [
      { id:"interim-occupancy", title:"Interim occupancy",   blurb:"When completion and possession dates don't fully align.",              href:"/glossary/interim-occupancy",   type:"glossary" },
      { id:"escrow",            title:"Escrow & closing funds", blurb:"How lawyers/notaries hold funds across two transactions.",           href:"/glossary/escrow",              type:"glossary" },
      { id:"insurance-gap",     title:"Insurance overlap",   blurb:"Considerations when both properties are owned briefly.",     href:"/glossary/home-insurance", type:"glossary" },
    ]),
    S("ownership", "Settled In", "Transitioning to new ownership.", [
      { id:"utility-transfer", title:"Utility & service transfer", blurb:"BC Hydro, FortisBC, ICBC, municipal utilities — cutover checklist.", href:"/glossary/utility-costs", type:"glossary" },
    ]),
  ],
};

// --- CONDO / STRATA JOURNEY ---
const CONDO_STRATA = {
  slug: "condo-strata", title: "Condo & Strata Living", icon: "🏢",
  short: "Everything to research about strata governance, fees, and lifestyle.",
  stages: [
    S("learn", "Strata Fundamentals", "How BC's Strata Property Act shapes governance, fees, and rules.", [
      { id:"strata-corp",   title:"Strata Corporation",        blurb:"The governing entity of every BC strata.",             href:"/glossary/strata-corporation",     type:"glossary" },
      { id:"strata-fees",   title:"Strata fees",               blurb:"What monthly fees cover — and don't cover.",           href:"/glossary/strata-fees",            type:"glossary" },
      { id:"contingency",   title:"Contingency Reserve Fund",  blurb:"How CRF works and why depreciation reports matter.", href:"/glossary/contingency-reserve-fund-crf", type:"glossary" },
      { id:"strata-council",title:"Strata council",            blurb:"Who runs the strata and how council decisions are made.", href:"/glossary/strata-council",       type:"glossary" },
      { id:"bylaws",        title:"Bylaws & rules",            blurb:"How bylaws differ from rules and how they're changed.", href:"/glossary/strata-bylaws",           type:"glossary" },
    ]),
    S("explore", "Common Strata Types", "Freehold, bare-land, phased strata.", [
      { id:"freehold-strata",  title:"Freehold strata",       blurb:"The most common strata type in BC.",                       href:"/glossary/freehold-strata", type:"glossary" },
      { id:"bare-land-strata", title:"Bare-land strata",      blurb:"Common in townhome and rural developments.",                href:"/glossary/bare-land-strata", type:"glossary" },
      { id:"leasehold",        title:"Leasehold strata",      blurb:"When the underlying land is leased.", href:"/glossary/leasehold", type:"glossary" },
    ]),
    S("plan", "Cost Planning", "Strata fees, special levies, insurance deductibles.", [
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
    S("offer", "Strata Due Diligence", "Minutes, Form B, Form F, depreciation reports.", [
      { id:"form-b",           title:"Form B",              blurb:"Certificate of strata information — what it discloses.",  href:"/glossary/form-b",              type:"glossary" },
      { id:"form-f",           title:"Form F",              blurb:"Certificate of payment — required for closing.",           href:"/glossary/form-f",              type:"glossary" },
      { id:"depreciation",     title:"Depreciation report", blurb:"5-year, 10-year, and 20-year replacement projections.",   href:"/glossary/depreciation-report",  type:"glossary" },
      { id:"minutes-review",   title:"Council meeting minutes review", blurb:"What buyers commonly look for in the last 2 years of minutes.", href:"/glossary/strata-minutes", type:"glossary" },
    ]),
    S("closing", "Closing & Move-In", "Strata-specific closing steps.", [
      { id:"move-in-fees",   title:"Move-in fees & bookings",  blurb:"How elevator bookings and move-in fees work.",  href:"/glossary/move-in-fees",   type:"glossary" },
      { id:"strata-mgmt",    title:"Strata management",       blurb:"How professional strata management typically operates.",         href:"/glossary/strata-management", type:"glossary" },
      { id:"utility-strata", title:"Included vs. metered utilities", blurb:"What's bundled into fees vs. billed separately.",       href:"/glossary/utility-costs",  type:"glossary" },
    ]),
    S("ownership", "Living in a Strata", "Bylaws, rules, AGMs, and council.", [
      { id:"agm",             title:"Annual General Meeting", blurb:"How AGMs and voting typically work.",                  href:"/glossary/annual-general-meeting-agm", type:"glossary" },
      { id:"rentals-strata",  title:"Rental & pet restrictions", blurb:"BC 2022 changes and current rental restrictions.", href:"/glossary/strata-rental-restrictions", type:"glossary" },
    ]),
  ],
};

// --- FIRST-TIME BUYER ---
const FIRST_TIME = {
  slug: "first-time-buyer", title: "First-Time Buyer", icon: "🌱",
  short: "Educational content for consumers exploring home ownership for the first time.",
  stages: [
    S("learn", "Real Estate Vocabulary 101", "Start-from-scratch vocabulary primer.", [
      { id:"glossary-index", title:"Full glossary (439 terms)",   blurb:"Every BC real estate term, plain-language, with statute links.", href:"/glossary",                             type:"glossary" },
      { id:"deposit",        title:"Deposits & subjects",         blurb:"How deposits, trust accounts, and subject clauses work.",       href:"/glossary/deposit",                      type:"glossary" },
      { id:"mortgage-101",   title:"Mortgages 101",               blurb:"Amortization, fixed vs. variable, insured vs. conventional.",   href:"/glossary/mortgage",                     type:"glossary" },
      { id:"strata-basics",  title:"Strata basics",               blurb:"If you're considering a condo or townhome, start here.",         href:"/glossary/strata-corporation",           type:"glossary" },
      { id:"ptt-basics",     title:"Property Transfer Tax basics",blurb:"The tax you pay on closing day.",                                href:"/glossary/property-transfer-tax-ptt",         type:"glossary" },
    ]),
    S("explore", "Communities on a Budget", "Lower-priced BC regions and neighbourhoods.", [
      { id:"communities", title:"BC communities",            blurb:"Browse 239 community profiles.",                                 href:"/communities", type:"community" },
      { id:"fraser-vy",   title:"Fraser Valley",             blurb:"Abbotsford, Chilliwack, Mission — often more accessible than Metro Vancouver.", href:"/regions/fraser-valley", type:"community" },
      { id:"vi-affordable", title:"Vancouver Island (outside Victoria)", blurb:"Nanaimo, Comox Valley, Port Alberni.", href:"/regions/vancouver-island", type:"community" },
      { id:"quiz",        title:"Where should you live? quiz", blurb:"5-question exploration tool.",                                 href:"/where-should-you-live", type:"guide" },
    ]),
    S("plan", "First-Time Buyer Programs", "BC and federal programs first-time buyers commonly research.", [
      { id:"ptt-exempt",     title:"PTT first-time exemption",       blurb:"BC PTT exemption — eligibility criteria.",       href:"/glossary/property-transfer-tax-ptt",         type:"glossary" },
      { id:"fhsa",           title:"First Home Savings Account",     blurb:"Federal FHSA program — general educational content.",              href:"/glossary/first-home-savings-account-fhsa",    type:"glossary" },
      { id:"hbp",            title:"Home Buyers' Plan (RRSP)",       blurb:"Federal RRSP HBP program — general educational content.",          href:"/glossary/home-buyers-plan-hbp",              type:"glossary" },
      { id:"newly-built",    title:"Newly built home PTT exemption", blurb:"Different exemption for newly-built homes up to a price threshold.", href:"/glossary/property-transfer-tax-ptt",       type:"glossary" },
      { id:"affordability",  title:"Affordability estimator",         blurb:"See what monthly payments look like across price points.",         href:"/valuation",                              type:"calculator" },
    ]),
    S("search", "Your First Search", "Browsing tips and saved searches.", [
      { id:"listings",   title:"Browse MLS® listings",       blurb:"BC-wide inventory refreshed hourly.",                       href:"/listings", type:"guide" },
      { id:"favorites",  title:"Save your favourites",       blurb:"Bookmark listings on any device.",                          href:"/favorites", type:"guide" },
      { id:"saved-src",  title:"Save a search",              blurb:"Get educational updates when new listings match your criteria.", href:"/listings", type:"guide" },
    ]),
    S("offer", "First Offer — General Info", "General educational information.", [
      { id:"cpps",         title:"Contract of Purchase & Sale",  blurb:"BCREA-standard offer form — the fields and clauses buyers commonly use.", href:"/glossary/offer-contract-of-purchase-and-sale", type:"glossary" },
      { id:"subjects",     title:"Subject clauses",              blurb:"How subject removal works step-by-step.",                                  href:"/glossary/subject-clauses",     type:"glossary" },
      { id:"inspection",   title:"Home inspection",              blurb:"What a BC-licensed inspector's report typically covers.",                  href:"/glossary/home-inspection",     type:"glossary" },
      { id:"deposit-first",title:"Your first deposit",           blurb:"How the deposit is delivered, held, and applied.",                          href:"/glossary/deposit",             type:"glossary" },
    ]),
    S("closing", "First Closing", "Educational overview of closing day.", [
      { id:"lawyer-notary",  title:"Choosing a lawyer or notary", blurb:"What a BC conveyancing professional typically does.",     href:"/glossary/lawyer-or-notary",  type:"glossary" },
      { id:"closing-costs",  title:"Closing cost checklist",       blurb:"PTT, legal, title insurance, adjustments.", href:"/glossary/property-transfer-tax-ptt", type:"glossary" },
      { id:"completion",     title:"Completion & possession",      blurb:"The two dates every buyer tracks.",     href:"/glossary/completion-date",   type:"glossary" },
    ]),
    S("ownership", "Your First Year", "Common surprises and ongoing responsibilities.", [
      { id:"first-year-maint", title:"First-year maintenance",   blurb:"Filters, alarms, seasonal tasks — a starter checklist.",  href:"/glossary/deferred-maintenance", type:"glossary" },
      { id:"home-owner-grant", title:"BC Home Owner Grant",       blurb:"Annual property-tax grant — how to apply.",              href:"/glossary/homeowner-grant",     type:"glossary" },
      { id:"insurance-first",  title:"Homeowner insurance",       blurb:"Reviewing coverage annually.",                            href:"/glossary/home-insurance",  type:"glossary" },
    ]),
  ],
};

// --- ACREAGES & RURAL LIVING ---
const ACREAGES = {
  slug: "acreages", title: "Acreages & Rural Living", icon: "🐎",
  short: "Educational content for consumers researching acreage or hobby-farm properties in BC.",
  stages: [
    S("learn", "Rural Fundamentals", "ALR, well and septic systems, wildfire and flood.", [
      { id:"alr",        title:"Agricultural Land Reserve",  blurb:"How the ALR protects farmland and limits use.",       href:"/glossary/agricultural-land-reserve-alr", type:"glossary" },
      { id:"well-water", title:"Well water & water rights",  blurb:"Groundwater licensing and testing.",                   href:"/glossary/water-rights",              type:"glossary" },
      { id:"septic",     title:"Septic systems",             blurb:"Type 1/2/3 septic and Health Authority approval.",     href:"/glossary/septic-system",             type:"glossary" },
      { id:"zoning",     title:"Rural zoning",               blurb:"How Regional Districts and municipalities zone rural land.", href:"/glossary/zoning",                    type:"glossary" },
      { id:"riparian",   title:"Riparian & watercourse setbacks", blurb:"BC's Riparian Areas Protection Regulation (RAPR).", href:"/glossary/riparian-areas",            type:"glossary" },
    ]),
    S("explore", "Rural BC Regions", "Fraser Valley, Cariboo, Kootenays, Okanagan, VI rural.", [
      { id:"fraser-valley", title:"Fraser Valley rural",    blurb:"Langley, Aldergrove, Chilliwack, Agassiz.", href:"/regions/fraser-valley",   type:"community" },
      { id:"cariboo",       title:"Cariboo & Chilcotin",     blurb:"Larger acreages and working ranches.",                     href:"/regions/cariboo",          type:"community" },
      { id:"okanagan",      title:"Okanagan rural",          blurb:"Vineyards, orchards, and lakeside acreages.",              href:"/regions/okanagan",         type:"community" },
      { id:"vi-rural",      title:"Vancouver Island rural",  blurb:"Cowichan Valley, Comox Valley, and north-Island acreage.", href:"/regions/vancouver-island", type:"community" },
    ]),
    S("plan", "Rural Cost Planning", "Well, septic, wildfire insurance, road maintenance.", [
      { id:"wildfire-risk", title:"Wildfire risk & FireSmart", blurb:"BC's wildfire risk assessment and insurance implications.", href:"/glossary/wildfire-risk",       type:"glossary" },
      { id:"rural-insurance",title:"Rural insurance", blurb:"Higher premiums, deductibles, and coverage gaps.", href:"/glossary/rural-insurance", type:"glossary" },
      { id:"road-access",   title:"Road access & maintenance", blurb:"Public vs. private roads and easements.",                 href:"/glossary/road-access",         type:"glossary" },
      { id:"utilities-rural",title:"Rural utilities",         blurb:"BC Hydro extensions, propane, wood heat, off-grid.", href:"/glossary/utility-costs", type:"glossary" },
    ]),
    S("search", "Acreage & Equestrian Search", "Browse rural inventory.", [
      { id:"acreages",   title:"Acreage listings",             blurb:"BC acreage inventory.",                                 href:"/listings?property_type=Acreage", type:"guide" },
      { id:"equestrian", title:"Equestrian Listings ($2M+)",   blurb:"Horse-friendly acreage with barn/stable/arena features.", href:"/specialties/equestrian",         type:"guide" },
      { id:"farm-mls",   title:"Working farms & hobby farms",  blurb:"MLS® inventory of BC farmland listings.",                href:"/listings?property_type=Farm",    type:"guide" },
    ]),
    S("offer", "Rural Due Diligence", "Well flow tests, septic inspection, ALR verification.", [
      { id:"well-flow",       title:"Well flow test",              blurb:"How buyers typically verify water quantity and quality.", href:"/glossary/well-flow-test",       type:"glossary" },
      { id:"septic-inspect",  title:"Septic inspection",           blurb:"What a Registered Onsite Wastewater Practitioner checks.", href:"/glossary/septic-inspection",   type:"glossary" },
      { id:"alr-verify",      title:"ALR & farm-status verification",blurb:"How to confirm ALR designation and farm-status tax.",   href:"/glossary/agricultural-land-reserve-alr", type:"glossary" },
      { id:"easements",       title:"Easements & right-of-way",     blurb:"Utility, access, and neighbour easements.",   href:"/glossary/easement",             type:"glossary" },
    ]),
    S("closing", "Rural Closing", "Additional steps unique to rural closings.", [
      { id:"survey",       title:"Boundary survey",            blurb:"When buyers commonly request a fresh Real Property Report.", href:"/glossary/real-property-report", type:"glossary" },
      { id:"rural-legal",  title:"Rural conveyance nuances",   blurb:"ALR, easement, and water-licence considerations.", href:"/glossary/lawyer-or-notary",     type:"glossary" },
    ]),
    S("ownership", "Rural Ownership", "Ongoing maintenance and neighbour-agreement considerations.", [
      { id:"seasonal-maint", title:"Seasonal rural maintenance", blurb:"Well, septic, roof, fencing, wildfire mitigation.",     href:"/glossary/deferred-maintenance", type:"glossary" },
      { id:"neighbour-fence",title:"Fence-line & neighbour agreements", blurb:"Common informal agreements and BC principles.", href:"/glossary/fence-act",  type:"glossary" },
      { id:"tax-farm",       title:"Farm-status property tax",   blurb:"How BC farm-status classification affects annual property tax.", href:"/glossary/farm-status", type:"glossary" },
    ]),
  ],
};

// --- HOME OWNERSHIP ---
const OWNERSHIP = {
  slug: "home-ownership", title: "Home Ownership", icon: "🏡",
  short: "Educational content for current BC homeowners — maintenance, taxes, renovations.",
  stages: [
    S("learn", "Ownership Vocabulary", "Terms every BC homeowner encounters over time.", [
      { id:"deferred-maint",  title:"Deferred maintenance",     blurb:"What accumulates over years and how to plan.",       href:"/glossary/deferred-maintenance",  type:"glossary" },
      { id:"depreciation",    title:"Depreciation & wear",       blurb:"How building components typically depreciate.", href:"/glossary/depreciation-report", type:"glossary" },
      { id:"assessment",      title:"BC Assessment",              blurb:"Annual July-1 assessed value and how it's used.",   href:"/glossary/bc-assessment-value",         type:"glossary" },
      { id:"property-tax",    title:"Municipal property tax",    blurb:"How BC municipalities calculate annual tax.",       href:"/glossary/property-tax",           type:"glossary" },
    ]),
    S("explore", "Community Resources", "Local schools, transit, and municipal services.", [
      { id:"communities", title:"BC community profiles",       blurb:"Explore your community's evolving profile.",  href:"/communities",       type:"community" },
      { id:"regions",     title:"BC regions",                    blurb:"Regional overview of BC.",                     href:"/regions/greater-vancouver", type:"community" },
    ]),
    S("plan", "Annual Owner Checklist", "Insurance review, property tax, Home Owner Grant, seasonal tasks.", [
      { id:"home-owner-grant", title:"BC Home Owner Grant",     blurb:"Annual property-tax grant.",                   href:"/glossary/homeowner-grant",     type:"glossary" },
      { id:"insurance-annual", title:"Annual insurance review", blurb:"What to reassess each year.",                  href:"/glossary/home-insurance",  type:"glossary" },
      { id:"seasonal-checklist",title:"Seasonal maintenance",   blurb:"Spring, summer, fall, winter routine checklists.", href:"/glossary/deferred-maintenance", type:"glossary" },
      { id:"climate-risk",     title:"Climate & weather risk",  blurb:"BC-specific wildfire, flood, and atmospheric-river considerations.", href:"/glossary/wildfire-risk", type:"glossary" },
    ]),
    S("search", "Refinance & Second-Home Concepts", "Educational-only concepts.", [
      { id:"heloc",         title:"Home equity line of credit", blurb:"How HELOCs work as a general concept.",         href:"/glossary/heloc",              type:"glossary" },
      { id:"refinance",     title:"Refinancing",                blurb:"General educational context on refinance at renewal.", href:"/glossary/refinance",  type:"glossary" },
      { id:"reverse-mtg",   title:"Reverse mortgage — general info", blurb:"How reverse mortgages work as a general concept.", href:"/glossary/reverse-mortgage", type:"glossary" },
      { id:"second-home",   title:"Second-home research",         blurb:"Considerations for recreational-property research.", href:"/listings", type:"guide" },
    ]),
    S("offer", "Renovation Planning", "Permits, building codes, and renovation info.", [
      { id:"building-permit", title:"Building permits",         blurb:"When municipal permits are typically required.", href:"/glossary/building-permit", type:"glossary" },
      { id:"heritage",        title:"Heritage designations",     blurb:"Heritage bylaws and their impact on renovations.", href:"/glossary/heritage-designation", type:"glossary" },
      { id:"strata-reno",     title:"Strata renovation approval", blurb:"How strata bylaws typically govern alterations.", href:"/glossary/strata-bylaws", type:"glossary" },
      { id:"contractor",      title:"Contractor licensing",     blurb:"Verifying licence and BC WorkSafe registration.", href:"/glossary/contractor-licensing", type:"glossary" },
    ]),
    S("closing", "Life-Stage Transitions", "Downsizing, right-sizing, moving for lifestyle change.", [
      { id:"downsize",       title:"Downsizing considerations", blurb:"How consumers commonly plan a smaller-home move.", href:"/glossary/downsizing", type:"glossary" },
      { id:"aging-in-place", title:"Aging in place",             blurb:"Accessibility renovations and long-term planning.", href:"/glossary/aging-in-place", type:"glossary" },
      { id:"estate-planning",title:"Estate planning basics",     blurb:"General educational overview — consult your own lawyer.", href:"/glossary/estate-planning", type:"glossary" },
    ]),
    S("ownership", "Selling Later", "When the time comes.", [
      { id:"valuation-owner",title:"Valuation estimator",  blurb:"See where market value may stand.",             href:"/valuation",       type:"calculator" },
    ]),
  ],
};

export const JOURNEY_TEMPLATES_ORDER = [
  "buying","selling","buying-and-selling","condo-strata","first-time-buyer","acreages","home-ownership"
];
export const JOURNEY_TEMPLATES = {
  buying: BUYING, selling: SELLING,
  "buying-and-selling": BUY_AND_SELL, "condo-strata": CONDO_STRATA,
  "first-time-buyer": FIRST_TIME, acreages: ACREAGES, "home-ownership": OWNERSHIP,
};

// Given a stage_id + module_id, resolve module details (title/blurb/href) by
// searching across all templates. Used by the client-facing page to render
// modules that were curated into a personalized plan.
export function resolveModule(stageId, moduleId) {
  for (const t of Object.values(JOURNEY_TEMPLATES)) {
    const stage = t.stages.find(s => s.id === stageId);
    if (stage) {
      const m = (stage.modules || []).find(x => x.id === moduleId);
      if (m) return { stage, module: m, template: t };
    }
  }
  return null;
}

// Given a stage_id, get its title/description (from any template — first match).
export function resolveStage(stageId) {
  for (const t of Object.values(JOURNEY_TEMPLATES)) {
    const stage = t.stages.find(s => s.id === stageId);
    if (stage) return stage;
  }
  return null;
}

export const CLIENT_JOURNEY_COMPLIANCE_NOTICE = "Educational information only. Not real estate, legal, tax, financial, mortgage, or investment advice. Doug LeMaire is a licensed BC REALTOR® regulated by BCFSA — not a mortgage broker, lawyer or notary, tax accountant, or licensed insurance broker. Always consult the licensed professional in each domain.";
