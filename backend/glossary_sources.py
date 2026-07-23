"""
Authoritative sources for every glossary term.

Design:
  1. CATEGORY_SOURCES maps each of the 14 glossary categories to its actual
     governing statute(s) + primary regulator(s). This provides a factually
     accurate default for every term.
  2. TERM_KEYWORD_OVERRIDES maps a case-insensitive keyword inside the term
     name to a specific authoritative source list. Applied first — takes
     precedence over the category default.

All URLs point to real government / regulator / statute pages
(BC Laws, gov.bc.ca, BCFSA, LTSA, BC Assessment, ALC, CHOA, OSFI, Bank of
Canada, CRA, Insurance Council of BC, IBC, AIC, CREA, CDIC, CMHC).
"""
from __future__ import annotations
from typing import List, Dict


# ---------- Reusable source records ----------
BCLAWS = "https://www.bclaws.gov.bc.ca"

SRC = {
    # BC statutes (BC Laws deep links)
    "strata_property_act":        {"title": "Strata Property Act (SBC 1998, c. 43)",                  "url": f"{BCLAWS}/civix/document/id/complete/statreg/98043_00",       "publisher": "Province of British Columbia — BC Laws"},
    "strata_property_regulation": {"title": "Strata Property Regulation (BC Reg. 43/2000)",           "url": f"{BCLAWS}/civix/document/id/complete/statreg/43_2000",         "publisher": "Province of British Columbia — BC Laws"},
    "resa":                       {"title": "Real Estate Services Act (SBC 2004, c. 42)",             "url": f"{BCLAWS}/civix/document/id/complete/statreg/04042_01",       "publisher": "Province of British Columbia — BC Laws"},
    "resa_rules":                 {"title": "Real Estate Services Rules",                             "url": "https://www.bcfsa.ca/industry-resources/real-estate-professional-resources/knowledge-base/legislation-and-rules",                                     "publisher": "BC Financial Services Authority (BCFSA)"},
    "land_title_act":             {"title": "Land Title Act (RSBC 1996, c. 250)",                     "url": f"{BCLAWS}/civix/document/id/complete/statreg/96250_00",       "publisher": "Province of British Columbia — BC Laws"},
    "property_law_act":           {"title": "Property Law Act (RSBC 1996, c. 377)",                   "url": f"{BCLAWS}/civix/document/id/complete/statreg/96377_01",       "publisher": "Province of British Columbia — BC Laws"},
    "ptt_act":                    {"title": "Property Transfer Tax Act (RSBC 1996, c. 378)",          "url": f"{BCLAWS}/civix/document/id/complete/statreg/96378_01",       "publisher": "Province of British Columbia — BC Laws"},
    "wesa":                       {"title": "Wills, Estates and Succession Act (SBC 2009, c. 13)",    "url": f"{BCLAWS}/civix/document/id/complete/statreg/09013_01",       "publisher": "Province of British Columbia — BC Laws"},
    "local_government_act":       {"title": "Local Government Act (RSBC 2015, c. 1)",                 "url": f"{BCLAWS}/civix/document/id/complete/statreg/r15001_00",      "publisher": "Province of British Columbia — BC Laws"},
    "community_charter":          {"title": "Community Charter (SBC 2003, c. 26)",                    "url": f"{BCLAWS}/civix/document/id/complete/statreg/03026_00",       "publisher": "Province of British Columbia — BC Laws"},
    "alr_act":                    {"title": "Agricultural Land Commission Act (SBC 2002, c. 36)",     "url": f"{BCLAWS}/civix/document/id/complete/statreg/02036_01",       "publisher": "Province of British Columbia — BC Laws"},
    "pipa":                       {"title": "Personal Information Protection Act (SBC 2003, c. 63)",  "url": f"{BCLAWS}/civix/document/id/complete/statreg/03063_01",       "publisher": "Province of British Columbia — BC Laws"},
    "insurance_act_bc":           {"title": "Insurance Act (RSBC 2012, c. 1)",                        "url": f"{BCLAWS}/civix/document/id/complete/statreg/12001_01",       "publisher": "Province of British Columbia — BC Laws"},
    "financial_institutions_act": {"title": "Financial Institutions Act (RSBC 1996, c. 141)",         "url": f"{BCLAWS}/civix/document/id/complete/statreg/96141_01",       "publisher": "Province of British Columbia — BC Laws"},
    "svt_act":                    {"title": "Speculation and Vacancy Tax Act (SBC 2018, c. 46)",      "url": f"{BCLAWS}/civix/document/id/complete/statreg/18046_01",       "publisher": "Province of British Columbia — BC Laws"},
    "hbrp_regulation":            {"title": "Home Buyer Rescission Period Regulation",                "url": "https://www2.gov.bc.ca/gov/content/housing-tenancy/real-estate-in-bc/home-buyer-rescission-period",                                                    "publisher": "Government of British Columbia"},
    "cooperative_association_act":{"title": "Cooperative Association Act (SBC 1999, c. 28)",          "url": f"{BCLAWS}/civix/document/id/complete/statreg/99028_01",       "publisher": "Province of British Columbia — BC Laws"},
    "manufactured_home_act":      {"title": "Manufactured Home Act (RSBC 1996, c. 280)",              "url": f"{BCLAWS}/civix/document/id/complete/statreg/96280_01",       "publisher": "Province of British Columbia — BC Laws"},
    "homeowner_protection_act":   {"title": "Homeowner Protection Act (SBC 1998, c. 31)",             "url": f"{BCLAWS}/civix/document/id/complete/statreg/98031_01",       "publisher": "Province of British Columbia — BC Laws"},
    "building_act":               {"title": "Building Act (SBC 2015, c. 2)",                          "url": f"{BCLAWS}/civix/document/id/complete/statreg/15002_01",       "publisher": "Province of British Columbia — BC Laws"},
    "residential_tenancy_act":    {"title": "Residential Tenancy Act (SBC 2002, c. 78)",              "url": f"{BCLAWS}/civix/document/id/complete/statreg/02078_01",       "publisher": "Province of British Columbia — BC Laws"},
    "gov_bc_rtb":                 {"title": "BC Government — Residential Tenancy Branch",             "url": "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies",                                                                          "publisher": "Government of British Columbia"},
    "redma":                      {"title": "Real Estate Development Marketing Act (SBC 2004, c. 41)","url": f"{BCLAWS}/civix/document/id/complete/statreg/04041_01",       "publisher": "Province of British Columbia — BC Laws"},
    "bcfsa_agency_disclosure":    {"title": "BCFSA — Agency and Disclosure Forms (DoRTS, DoLC)",     "url": "https://www.bcfsa.ca/industry-resources/real-estate-professional-resources/knowledge-base/forms-and-templates",                                    "publisher": "BC Financial Services Authority (BCFSA)"},

    # Federal statutes
    "non_canadians_act":          {"title": "Prohibition on the Purchase of Residential Property by Non-Canadians Act (S.C. 2022, c. 10, s. 235)", "url": "https://laws-lois.justice.gc.ca/eng/acts/P-25.2/",  "publisher": "Justice Laws — Government of Canada"},
    "income_tax_act":             {"title": "Income Tax Act (R.S.C. 1985, c. 1 (5th Supp.))",         "url": "https://laws-lois.justice.gc.ca/eng/acts/i-3.3/",              "publisher": "Justice Laws — Government of Canada"},
    "casl":                       {"title": "Canada's Anti-Spam Legislation (CASL)",                  "url": "https://crtc.gc.ca/eng/internet/anti.htm",                     "publisher": "Canadian Radio-television and Telecommunications Commission (CRTC)"},

    # Regulators & authorities
    "bcfsa":                      {"title": "BC Financial Services Authority (BCFSA)",                "url": "https://www.bcfsa.ca",                                          "publisher": "BC Financial Services Authority"},
    "ltsa":                       {"title": "Land Title and Survey Authority of BC (LTSA)",           "url": "https://ltsa.ca",                                               "publisher": "Land Title and Survey Authority of British Columbia"},
    "bc_assessment":              {"title": "BC Assessment",                                           "url": "https://www.bcassessment.ca",                                   "publisher": "BC Assessment Authority"},
    "alc":                        {"title": "Agricultural Land Commission (ALC)",                     "url": "https://www.alc.gov.bc.ca",                                     "publisher": "BC Agricultural Land Commission"},
    "choa":                       {"title": "Condominium Home Owners Association of BC (CHOA)",       "url": "https://www.choa.bc.ca",                                        "publisher": "Condominium Home Owners Association of BC"},
    "gov_bc_strata":              {"title": "BC Government — Strata Housing",                         "url": "https://www2.gov.bc.ca/gov/content/housing-tenancy/strata-housing",                                                                              "publisher": "Government of British Columbia"},
    "gov_bc_ptt":                 {"title": "BC Government — Property Transfer Tax",                  "url": "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax",                                                                     "publisher": "Government of British Columbia"},
    "gov_bc_svt":                 {"title": "BC Government — Speculation and Vacancy Tax",            "url": "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/speculation-and-vacancy-tax",                                                              "publisher": "Government of British Columbia"},
    "gov_bc_first_time":          {"title": "BC Government — First Time Home Buyers' Program",        "url": "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/first-time-home-buyers",                                      "publisher": "Government of British Columbia"},
    "gov_bc_newly_built":         {"title": "BC Government — Newly Built Home Exemption",             "url": "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/newly-built-home-exemption",                                  "publisher": "Government of British Columbia"},
    "gov_bc_home_owner_grant":    {"title": "BC Government — Home Owner Grant",                       "url": "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/annual-property-tax/home-owner-grant",                                                        "publisher": "Government of British Columbia"},
    "gov_bc_building_code":       {"title": "BC Building Code",                                        "url": "https://www2.gov.bc.ca/gov/content/industry/construction-industry/building-codes-standards/the-codes",                                                    "publisher": "Government of British Columbia"},
    "gov_bc_zoning":              {"title": "BC Government — Local Government Land Use & Zoning",     "url": "https://www2.gov.bc.ca/gov/content/governments/local-governments/planning-land-use",                                                                    "publisher": "Government of British Columbia"},
    "gov_bc_probate":             {"title": "BC Government — Wills, Estates and Probate",             "url": "https://www2.gov.bc.ca/gov/content/life-events/death/wills-estates",                                                                                    "publisher": "Government of British Columbia"},

    # Federal regulators
    "osfi_b20":                   {"title": "OSFI Guideline B-20 — Residential Mortgage Underwriting Practices and Procedures", "url": "https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/residential-mortgage-underwriting-practices-procedures-guideline-b-20",  "publisher": "Office of the Superintendent of Financial Institutions (OSFI)"},
    "bank_of_canada":             {"title": "Bank of Canada",                                          "url": "https://www.bankofcanada.ca",                                    "publisher": "Bank of Canada"},
    "cmhc":                       {"title": "Canada Mortgage and Housing Corporation (CMHC)",         "url": "https://www.cmhc-schl.gc.ca",                                    "publisher": "CMHC — Government of Canada"},
    "cdic":                       {"title": "Canada Deposit Insurance Corporation (CDIC)",            "url": "https://www.cdic.ca",                                            "publisher": "CDIC — Government of Canada"},
    "cra":                        {"title": "Canada Revenue Agency (CRA)",                             "url": "https://www.canada.ca/en/revenue-agency.html",                   "publisher": "Government of Canada"},
    "fcac":                       {"title": "Financial Consumer Agency of Canada (FCAC)",             "url": "https://www.canada.ca/en/financial-consumer-agency.html",       "publisher": "Government of Canada"},

    # Insurance
    "ibc":                        {"title": "Insurance Bureau of Canada (IBC)",                       "url": "https://www.ibc.ca",                                             "publisher": "Insurance Bureau of Canada"},
    "insurance_council_bc":       {"title": "Insurance Council of British Columbia",                  "url": "https://www.insurancecouncilofbc.com",                           "publisher": "Insurance Council of BC"},

    # Professional
    "crea":                       {"title": "Canadian Real Estate Association (CREA) — REALTOR® Code of Ethics", "url": "https://www.crea.ca/about/realtor-code/",                        "publisher": "Canadian Real Estate Association"},
    "aic":                        {"title": "Appraisal Institute of Canada (AIC)",                   "url": "https://www.aicanada.ca",                                        "publisher": "Appraisal Institute of Canada"},
    "bc_housing":                 {"title": "BC Housing — Licensing & Consumer Services",             "url": "https://www.bchousing.org/licensing-consumer-services",          "publisher": "BC Housing"},
    "civil_resolution_tribunal":  {"title": "Civil Resolution Tribunal (CRT) — Strata Disputes",     "url": "https://civilresolutionbc.ca/how-the-crt-works/getting-started/strata-property-disputes/",                                                            "publisher": "Civil Resolution Tribunal"},
}


# ---------- Per-category default sources ----------
CATEGORY_SOURCES: Dict[str, List[dict]] = {
    "Strata": [
        SRC["strata_property_act"],
        SRC["strata_property_regulation"],
        SRC["gov_bc_strata"],
        SRC["choa"],
        SRC["civil_resolution_tribunal"],
    ],
    "Financing": [
        SRC["osfi_b20"],
        SRC["bank_of_canada"],
        SRC["cmhc"],
        SRC["cdic"],
        SRC["fcac"],
        SRC["bcfsa"],
    ],
    "Property Types": [
        SRC["land_title_act"],
        SRC["bc_assessment"],
        SRC["ltsa"],
        SRC["gov_bc_zoning"],
    ],
    "Land & Zoning": [
        SRC["local_government_act"],
        SRC["community_charter"],
        SRC["gov_bc_zoning"],
        SRC["alc"],
    ],
    "Taxes": [
        SRC["ptt_act"],
        SRC["gov_bc_ptt"],
        SRC["gov_bc_home_owner_grant"],
        SRC["income_tax_act"],
        SRC["cra"],
    ],
    "Insurance": [
        SRC["insurance_act_bc"],
        SRC["financial_institutions_act"],
        SRC["insurance_council_bc"],
        SRC["ibc"],
    ],
    "Regulations": [
        SRC["resa"],
        SRC["resa_rules"],
        SRC["bcfsa"],
        SRC["crea"],
    ],
    "Legal": [
        SRC["land_title_act"],
        SRC["property_law_act"],
        SRC["ltsa"],
        SRC["pipa"],
    ],
    "Estate & Probate": [
        SRC["wesa"],
        SRC["gov_bc_probate"],
        SRC["land_title_act"],
    ],
    "Construction": [
        SRC["building_act"],
        SRC["gov_bc_building_code"],
        SRC["homeowner_protection_act"],
        SRC["bc_housing"],
    ],
    "General": [
        SRC["bcfsa"],
        SRC["crea"],
        SRC["resa"],
    ],
    "Valuation": [
        SRC["aic"],
        SRC["bc_assessment"],
    ],
    "Ownership": [
        SRC["land_title_act"],
        SRC["ltsa"],
        SRC["property_law_act"],
    ],
    "Process": [
        SRC["resa"],
        SRC["resa_rules"],
        SRC["bcfsa"],
        SRC["ltsa"],
    ],

    # ---- Aliases used by the Lovable-ingested taxonomy (post-2026 curation) ----
    "Agency & Disclosure": [
        SRC["bcfsa_agency_disclosure"],
        SRC["resa_rules"],
        SRC["resa"],
        SRC["bcfsa"],
    ],
    "Disclosure": [
        SRC["bcfsa_agency_disclosure"],
        SRC["resa_rules"],
        SRC["bcfsa"],
    ],
    "Appraisal & Value": [
        SRC["aic"],
        SRC["bc_assessment"],
        SRC["ltsa"],
    ],
    "Property Value": [
        SRC["aic"],
        SRC["bc_assessment"],
        SRC["ltsa"],
    ],
    "BC Specific": [
        SRC["bcfsa"],
        SRC["resa"],
        SRC["ltsa"],
    ],
    "Building Code": [
        SRC["building_act"],
        SRC["gov_bc_building_code"],
        SRC["homeowner_protection_act"],
    ],
    "Buying & Selling": [
        SRC["resa"],
        SRC["resa_rules"],
        SRC["bcfsa"],
        SRC["ltsa"],
    ],
    "Government & Tax": [
        SRC["ptt_act"],
        SRC["gov_bc_ptt"],
        SRC["svt_act"],
        SRC["gov_bc_svt"],
        SRC["gov_bc_home_owner_grant"],
    ],
    "Taxation": [
        SRC["ptt_act"],
        SRC["gov_bc_ptt"],
        SRC["income_tax_act"],
        SRC["cra"],
    ],
    "Taxes & Costs": [
        SRC["ptt_act"],
        SRC["gov_bc_ptt"],
        SRC["gov_bc_home_owner_grant"],
        SRC["cra"],
    ],
    "Inspection & Home Condition": [
        SRC["homeowner_protection_act"],
        SRC["bc_housing"],
        SRC["building_act"],
    ],
    "Inspections": [
        SRC["homeowner_protection_act"],
        SRC["bc_housing"],
        SRC["building_act"],
    ],
    "Investing": [
        SRC["bcfsa"],
        SRC["cra"],
        SRC["income_tax_act"],
    ],
    "Land & Rural": [
        SRC["alr_act"],
        SRC["alc"],
        SRC["gov_bc_zoning"],
        SRC["local_government_act"],
    ],
    "Rural & Acreage": [
        SRC["alr_act"],
        SRC["alc"],
        SRC["gov_bc_zoning"],
        SRC["local_government_act"],
    ],
    "Land Use": [
        SRC["local_government_act"],
        SRC["community_charter"],
        SRC["gov_bc_zoning"],
        SRC["alc"],
    ],
    "Legal & Contract": [
        SRC["property_law_act"],
        SRC["land_title_act"],
        SRC["resa"],
    ],
    "Legal & Conveyancing": [
        SRC["land_title_act"],
        SRC["property_law_act"],
        SRC["ltsa"],
    ],
    "Legal & Title": [
        SRC["land_title_act"],
        SRC["property_law_act"],
        SRC["ltsa"],
    ],
    "Legislation": [
        SRC["resa"],
        SRC["resa_rules"],
        SRC["bcfsa"],
        SRC["strata_property_act"],
        SRC["land_title_act"],
    ],
    "Presale & Development": [
        SRC["redma"],
        SRC["bcfsa"],
        SRC["homeowner_protection_act"],
    ],
    "Process & General": [
        SRC["resa"],
        SRC["resa_rules"],
        SRC["bcfsa"],
        SRC["ltsa"],
    ],
    "Strata & Condo": [
        SRC["strata_property_act"],
        SRC["strata_property_regulation"],
        SRC["gov_bc_strata"],
        SRC["choa"],
        SRC["civil_resolution_tribunal"],
    ],
    "Strata Documents": [
        SRC["strata_property_act"],
        SRC["strata_property_regulation"],
        SRC["gov_bc_strata"],
        SRC["choa"],
    ],
    "Tenancy": [
        SRC["residential_tenancy_act"],
        SRC["gov_bc_rtb"],
    ],
    "Title & Ownership": [
        SRC["land_title_act"],
        SRC["ltsa"],
        SRC["property_law_act"],
    ],
    "Transaction & Closing": [
        SRC["resa"],
        SRC["ltsa"],
        SRC["land_title_act"],
        SRC["bcfsa"],
    ],
}


# ---------- Per-term keyword overrides (highest-risk / statute-specific terms) ----------
# Applied first: the lowercase keyword must appear in the term name.
# Ordered — first match wins.
TERM_KEYWORD_OVERRIDES: List[tuple] = [
    ("foreign buyer",                   [SRC["non_canadians_act"], SRC["ptt_act"], SRC["gov_bc_ptt"]]),
    ("prohibition on the purchase",     [SRC["non_canadians_act"]]),
    ("non-canadian",                    [SRC["non_canadians_act"]]),
    ("property transfer tax",           [SRC["ptt_act"], SRC["gov_bc_ptt"]]),
    ("additional property transfer tax",[SRC["ptt_act"], SRC["gov_bc_ptt"]]),
    ("first time home buyer",           [SRC["gov_bc_first_time"], SRC["ptt_act"]]),
    ("first-time home buyer",           [SRC["gov_bc_first_time"], SRC["ptt_act"]]),
    ("newly built home",                [SRC["gov_bc_newly_built"], SRC["ptt_act"]]),
    ("home owner grant",                [SRC["gov_bc_home_owner_grant"]]),
    ("homeowner grant",                 [SRC["gov_bc_home_owner_grant"]]),
    ("speculation and vacancy",         [SRC["svt_act"], SRC["gov_bc_svt"]]),
    ("speculation tax",                 [SRC["svt_act"], SRC["gov_bc_svt"]]),
    ("vacancy tax",                     [SRC["svt_act"], SRC["gov_bc_svt"]]),
    ("home buyer rescission",           [SRC["hbrp_regulation"], SRC["resa"]]),
    ("rescission period",               [SRC["hbrp_regulation"], SRC["resa"]]),
    ("cooling-off",                     [SRC["hbrp_regulation"], SRC["resa"]]),
    ("cooling off",                     [SRC["hbrp_regulation"], SRC["resa"]]),
    ("agricultural land reserve",       [SRC["alr_act"], SRC["alc"]]),
    ("alr",                             [SRC["alr_act"], SRC["alc"]]),
    ("agricultural land commission",    [SRC["alr_act"], SRC["alc"]]),
    ("manufactured home",               [SRC["manufactured_home_act"]]),
    ("mobile home",                     [SRC["manufactured_home_act"]]),
    ("stress test",                     [SRC["osfi_b20"], SRC["bcfsa"]]),
    ("mortgage default insurance",      [SRC["cmhc"], SRC["osfi_b20"]]),
    ("high-ratio",                      [SRC["cmhc"], SRC["osfi_b20"]]),
    ("cmhc",                            [SRC["cmhc"]]),
    ("probate",                         [SRC["wesa"], SRC["gov_bc_probate"]]),
    ("wills variation",                 [SRC["wesa"]]),
    ("estate administration",           [SRC["wesa"], SRC["gov_bc_probate"]]),
    ("code of ethics",                  [SRC["crea"], SRC["bcfsa"]]),
    ("realtor code",                    [SRC["crea"]]),
    ("bcfsa",                           [SRC["bcfsa"], SRC["resa"]]),
    ("real estate services act",        [SRC["resa"], SRC["bcfsa"]]),
    ("resa",                            [SRC["resa"], SRC["bcfsa"]]),
    ("strata property act",             [SRC["strata_property_act"], SRC["gov_bc_strata"]]),
    ("form b",                          [SRC["strata_property_act"], SRC["strata_property_regulation"], SRC["gov_bc_strata"]]),
    ("form f",                          [SRC["strata_property_act"], SRC["strata_property_regulation"], SRC["gov_bc_strata"]]),
    ("depreciation report",             [SRC["strata_property_act"], SRC["gov_bc_strata"], SRC["choa"]]),
    ("contingency reserve",             [SRC["strata_property_act"], SRC["gov_bc_strata"], SRC["choa"]]),
    ("bylaws",                          [SRC["strata_property_act"], SRC["gov_bc_strata"]]),
    ("civil resolution tribunal",       [SRC["civil_resolution_tribunal"]]),
    ("land title",                      [SRC["land_title_act"], SRC["ltsa"]]),
    ("title insurance",                 [SRC["insurance_act_bc"], SRC["ibc"], SRC["ltsa"]]),
    ("bc assessment",                   [SRC["bc_assessment"]]),
    ("appraisal",                       [SRC["aic"], SRC["bc_assessment"]]),
    ("new home warranty",               [SRC["homeowner_protection_act"], SRC["bc_housing"]]),
    ("2-5-10",                          [SRC["homeowner_protection_act"], SRC["bc_housing"]]),
    ("bc building code",                [SRC["gov_bc_building_code"], SRC["building_act"]]),
    ("building permit",                 [SRC["building_act"], SRC["gov_bc_building_code"]]),
    ("capital gains",                   [SRC["income_tax_act"], SRC["cra"]]),
    ("principal residence",             [SRC["income_tax_act"], SRC["cra"]]),
    ("gst",                             [SRC["income_tax_act"], SRC["cra"]]),
    ("hst",                             [SRC["income_tax_act"], SRC["cra"]]),
    ("pipa",                            [SRC["pipa"]]),
    ("casl",                            [SRC["casl"]]),
    ("anti-spam",                       [SRC["casl"]]),
    ("cooperative",                     [SRC["cooperative_association_act"]]),
    ("co-op",                           [SRC["cooperative_association_act"]]),
]


def get_sources_for_term(term: str, category: str) -> List[dict]:
    """Return the authoritative source list for a given term.

    Resolution order:
      1. If any keyword in TERM_KEYWORD_OVERRIDES matches the term (case-insensitive),
         use that override's source list.
      2. Otherwise fall back to CATEGORY_SOURCES[category].
      3. Final fallback: a generic BCFSA + gov.bc.ca pair.
    """
    if not term:
        return CATEGORY_SOURCES.get(category, [SRC["bcfsa"]])
    term_lc = term.lower()
    for keyword, sources in TERM_KEYWORD_OVERRIDES:
        if keyword in term_lc:
            return sources
    return CATEGORY_SOURCES.get(category, [SRC["bcfsa"]])
