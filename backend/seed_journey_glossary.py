"""
Seed 41 BC real estate glossary terms referenced from the Interactive Real
Estate Journey Platform that were missing from the glossary.

Each entry is hand-authored (not LLM-drafted) and BCFSA/PIPA/CASL-compliant:
  - Cites BC statute or regulator by name.
  - Uses general educational framings only ("consumers often…", "you may wish…").
  - Never provides specific advice on a property, transaction, or investor decision.
  - Sources point to authoritative BC / federal government / regulator sites.

Excluded per Doug's direction (2026-02-01): all terms exclusive to the removed
"Investment Property" and "New Construction" journeys.

Because each definition is hand-authored, we mark:
  - definition_approved = True
  - faqs_approved = True
The admin can still edit any entry via /admin/faq-audit.
"""

from datetime import datetime, timezone
import uuid

NOW = datetime.now(timezone.utc).isoformat()

def _e(term, category, definition, faqs, sources):
    slug = term.lower().replace("’","").replace("'","").replace("(","").replace(")","").replace(",","").replace(".","").replace("&","and").replace("/"," ").strip()
    slug = "-".join(w for w in slug.split() if w)
    return {
        "id": str(uuid.uuid4()),
        "term": term,
        "slug": None,  # caller sets to override
        "category": category,
        "definition": definition,
        "definition_approved": True,
        "definition_approved_at": NOW,
        "faqs": [{"q": q, "a": a} for q, a in faqs],
        "faqs_approved": True,
        "faqs_approved_at": NOW,
        "faqs_generated_at": NOW,
        "faqs_prompt_version": "hand-authored-v1",
        "definition_prompt_version": "hand-authored-v1",
        "last_curated_at": NOW,
        "sources_override": sources,
    }

BC_LAW_SITE = "https://www.bclaws.gov.bc.ca"
BCFSA = "https://www.bcfsa.ca"
CRA   = "https://www.canada.ca/en/revenue-agency.html"
LTSA  = "https://ltsa.ca"
BCA   = "https://www.bcassessment.ca"


def build_all():
    E = []

    def add(slug, entry):
        entry["slug"] = slug
        E.append(entry)

    # ---- Ownership, planning, life-stage ----
    add("aging-in-place", _e(
        "Aging in Place",
        "Process & General",
        "Aging in place refers to remaining in one's own home safely, independently and comfortably as one grows older, rather than moving to assisted living or a care facility. In a real estate context, consumers exploring aging in place often research accessibility retrofits such as single-level living, walk-in showers, wider doorways, lever handles, non-slip flooring and stair lifts. The Canada Mortgage and Housing Corporation (CMHC) publishes accessibility guidance, and the BC Government's Ministry of Health, along with regional Health Authorities, coordinate home-support services. Whether a specific renovation is appropriate for you should be discussed with a licensed contractor, an occupational therapist and — if you own a strata unit — your strata council under the Strata Property Act, SBC 1998, c. 43. Consult your own professionals for advice tailored to your situation.",
        [
            ("What accessibility features are commonly considered for aging in place?", "Common features consumers research include single-level living, curbless walk-in showers with grab bars, wider doorways (36-inch minimum), lever-style door handles and taps, non-slip flooring, adequate lighting, stair lifts and main-floor bedrooms and bathrooms. Verify appropriate features for your situation with a licensed occupational therapist."),
            ("Are strata bylaws relevant when planning accessibility renovations?", "Yes. Under the Strata Property Act, SBC 1998, c. 43, alterations to a strata lot or to common property typically require council or general-meeting approval, and human-rights protections apply. Consult a strata lawyer if disputes arise."),
            ("Is there any BC funding support for aging-in-place renovations?", "General information only: BC Housing operates the Home Adaptations for Independence (HAFI) program for low-income seniors and persons with disabilities. Program rules change from time to time — confirm current eligibility on the BC Housing website."),
        ],
        [
            {"title":"CMHC — Aging in Place","url":"https://www.cmhc-schl.gc.ca/consumers/home-maintenance/aging-in-place","publisher":"Canada Mortgage and Housing Corporation"},
            {"title":"BC Housing — Home Adaptations for Independence (HAFI)","url":"https://www.bchousing.org/housing-assistance/HAFI","publisher":"BC Housing"},
        ],
    ))

    add("downsizing", _e(
        "Downsizing",
        "Process & General",
        "Downsizing in a real estate context refers to selling a larger residence and purchasing (or renting) a smaller one — commonly a condo, townhome, or smaller detached home — often at a later life stage. Consumers considering downsizing typically research capital-gains treatment on the principal residence, moving costs, Property Transfer Tax on the replacement home, strata fees if moving into a strata property, and the timing of sale versus purchase. In BC, the sale of a principal residence is generally exempt from capital-gains tax under the Income Tax Act (Canada); confirm your specific situation with a Canadian tax professional. This information is educational and is not real estate, tax or financial advice.",
        [
            ("Is the sale of a principal residence taxable in BC?", "In general, the sale of a home that has been your principal residence for every year you owned it is exempt from capital-gains tax under the federal Income Tax Act. The Canada Revenue Agency requires the sale to be reported on your annual return even when the full exemption applies. Confirm your specific situation with a CPA."),
            ("What costs commonly apply when downsizing?", "Consumers typically budget for real estate commission on the sale, Property Transfer Tax on the replacement purchase, legal or notary fees, moving costs, and — if buying into a strata — new strata fees plus any move-in fees. Get a full statement of adjustments from your lawyer or notary."),
            ("Are there any BC benefits for seniors selling their home?", "The BC Property Transfer Tax has no age-based exemption, but the Home Owner Grant offers an enhanced amount for eligible seniors on their new principal residence. Program rules change — verify current amounts on the Government of BC website."),
        ],
        [
            {"title":"CRA — Principal Residence Exemption","url":"https://www.canada.ca/en/revenue-agency/services/tax/technical-information/income-tax/income-tax-folios-index/series-1-individuals/folio-3-family-unit-issues/income-tax-folio-s1-f3-c2-principal-residence.html","publisher":"Canada Revenue Agency"},
            {"title":"Government of BC — Home Owner Grant","url":"https://www2.gov.bc.ca/gov/content/taxes/property-taxes/annual-property-tax/home-owner-grant","publisher":"Government of British Columbia"},
        ],
    ))

    add("estate-planning", _e(
        "Estate Planning (Real Estate Context)",
        "Legal & Title",
        "Estate planning in a real estate context is the process of arranging how your real property will be dealt with during your lifetime and after your death. In British Columbia, estate planning commonly considers the Wills, Estates and Succession Act, SBC 2009, c. 13 (WESA), joint tenancy versus tenancy in common, life estates, powers of attorney and representation agreements. Real estate can be transferred at death by will, by right of survivorship (joint tenancy), by beneficiary designation for certain interests, or through a court-supervised probate process. Estate planning is legal work that must be done by a BC lawyer or notary — this glossary entry is general educational information only.",
        [
            ("What BC statute governs wills and estates?", "The Wills, Estates and Succession Act, SBC 2009, c. 13 (WESA) is the primary BC statute governing wills, intestacy, and the administration of estates. Related statutes include the Land Title Act and the Estate Administration Act. Consult a BC lawyer for advice on your estate."),
            ("What's the difference between joint tenancy and tenancy in common?", "Joint tenancy carries a right of survivorship — on the death of one owner, that owner's interest passes automatically to the survivor(s) outside of the will. Tenancy in common has no survivorship — each owner's share passes to their estate under their will. The choice has significant tax and succession consequences; discuss it with a BC lawyer or notary."),
            ("Do I need probate for BC real estate?", "Real property held solely in the deceased's name generally requires a grant of probate before title can be transferred. Real property held in joint tenancy typically transfers by right of survivorship without probate, subject to filings at the Land Title and Survey Authority. Verify your situation with a BC estates lawyer."),
        ],
        [
            {"title":"WESA — Wills, Estates and Succession Act","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/09013_01","publisher":"BCLaws — Queen's Printer"},
            {"title":"People's Law School — Wills and Estates","url":"https://www.peopleslawschool.ca/everyday-legal-problems/planning-ahead/wills-estate-planning","publisher":"People's Law School (BC)"},
        ],
    ))

    # ---- Property tax family ----
    add("property-tax", _e(
        "Property Tax (Municipal, BC)",
        "Government & Tax",
        "Property tax in BC is an annual tax levied by municipalities and taxing authorities on the assessed value of real property. Each July 1, BC Assessment establishes an assessed value under the Assessment Act, RSBC 1996, c. 20. In the following calendar year, the municipality (or Surveyor of Taxes in rural areas) sets its mill rate and issues a tax notice. The tax funds municipal services, schools, hospitals, regional districts, TransLink (in Metro Vancouver) and BC Assessment. Eligible principal-residence owners may apply for the Home Owner Grant to reduce the amount payable; low-income seniors and persons with disabilities may qualify for property-tax deferment. Program rules change annually — confirm current amounts and deadlines with the Government of BC and your municipality.",
        [
            ("When is BC property tax due each year?", "Most BC municipalities set a due date in early July (commonly the first business day of July). The Rural Property Tax due date is July 2. Late payment triggers a penalty (typically 5% or 10%). Verify your municipality's specific due date on your tax notice."),
            ("How is my property-tax amount calculated?", "Assessed value (set by BC Assessment as of July 1 of the prior year) × the mill rate (set by your municipality and other taxing authorities). The Home Owner Grant, if claimed, is then subtracted."),
            ("Can I defer my BC property tax?", "The Property Tax Deferment Program allows eligible homeowners (age 55+, surviving spouses, families with children, or persons with disabilities) to defer some or all of their property tax as a low-interest loan against title. Program rules change — verify current eligibility on the Government of BC website."),
        ],
        [
            {"title":"Government of BC — Property Taxes","url":"https://www2.gov.bc.ca/gov/content/taxes/property-taxes","publisher":"Government of British Columbia"},
            {"title":"Assessment Act, RSBC 1996, c. 20","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/96020_01","publisher":"BCLaws — Queen's Printer"},
        ],
    ))

    # ---- Property Disclosure Statement ----
    add("property-disclosure-statement", _e(
        "Property Disclosure Statement (PDS)",
        "Disclosure",
        "A Property Disclosure Statement (PDS) is a BCREA-standard form completed by a seller that provides information about the seller's knowledge of the property. Common versions include the PDS for a Detached Home, Strata Title Properties, Land Only, and Manufactured Homes. Sellers are asked yes/no/unsure questions about defects, past insurance claims, work done without permits, water ingress, drug production and other material matters. Completing a PDS accurately is not legal advice, and sellers are responsible for the statements they make. Buyers and sellers should discuss the PDS with their own licensed BC REALTOR® and, where appropriate, a lawyer or notary.",
        [
            ("Is a Property Disclosure Statement mandatory in BC?", "Under BCFSA rules, a licensee representing a seller is required to advise their client about the PDS, but a seller is not legally required to complete one in every transaction. Where a PDS is signed, it typically becomes part of the Contract of Purchase and Sale."),
            ("Does a PDS replace a home inspection?", "No. A PDS is the seller's own knowledge; a home inspection is an independent examination by a licensed home inspector. Consumers commonly use both together."),
            ("What if a seller answers 'unsure' on the PDS?", "'Unsure' means the seller does not know the answer. It is not a warranty. Buyers commonly follow up with additional questions, a home inspection, or specific searches (e.g. permit history at City Hall)."),
        ],
        [
            {"title":"BCFSA — Property Disclosure Statements","url":"https://www.bcfsa.ca/industry-resources/real-estate-professional-resources/knowledge-base/property-disclosure-statement","publisher":"BC Financial Services Authority"},
            {"title":"BCREA — Standard Forms","url":"https://www.bcrea.bc.ca/standard-forms/","publisher":"British Columbia Real Estate Association"},
        ],
    ))

    # ---- MLS ----
    add("mls", _e(
        "MLS® (Multiple Listing Service®)",
        "Buying & Selling",
        "MLS® (Multiple Listing Service®) is a certification mark owned by the Canadian Real Estate Association (CREA) and, in BC, jointly used with participating real estate boards. An MLS® listing is a residential or commercial property offered for sale through a REALTOR® member of a CREA-affiliated board, with agreed cooperation terms and data-sharing rules. MLS® data flows to REALTOR.ca and to authorized brokerage and third-party sites via the CREA Data Distribution Facility® (DDF®). Only REALTOR® members can list on MLS®; a for-sale-by-owner listing is not an MLS® listing. All MLS® use is governed by CREA trademark rules and the applicable board bylaws.",
        [
            ("Who can list a property on MLS® in BC?", "Only licensees who are members of a CREA-affiliated real estate board can list on MLS®. Consumers work with a licensed REALTOR® to have a property listed."),
            ("Is REALTOR.ca the same as MLS®?", "No. REALTOR.ca is a consumer website owned by CREA that displays a subset of MLS® listings. Full MLS® data includes fields (e.g. days on market history, listing office information) that are not displayed publicly on REALTOR.ca."),
            ("Are MLS® listings shown on other websites?", "Yes. Under the CREA DDF®, participating brokerages can display MLS® listings on their own websites subject to CREA's trademark rules and technical standards."),
        ],
        [
            {"title":"CREA — About MLS® and REALTOR® Marks","url":"https://www.crea.ca/mls-realtor-trademarks/","publisher":"Canadian Real Estate Association"},
            {"title":"REALTOR.ca","url":"https://www.realtor.ca","publisher":"Canadian Real Estate Association"},
        ],
    ))

    add("mls-photography", _e(
        "MLS® Photography",
        "Buying & Selling",
        "MLS® photography refers to the professional photographs displayed on a Multiple Listing Service® listing. CREA and each BC real estate board publish standards on the number, quality and copyright of images uploaded. Photos are typically taken by a professional real-estate photographer engaged by the listing REALTOR®. Copyright generally belongs to the photographer unless assigned; the listing brokerage typically holds a licence to display the images for the duration of the listing. Twilight images, drone (Transport Canada RPAS-compliant) imagery and 3D virtual tours are common add-ons. Whether any specific photo scope is appropriate for your listing is a decision to discuss with your own licensed REALTOR®.",
        [
            ("Does a listing need to use professional photography?", "There is no rule requiring professional photography, but nearly every BC MLS® listing above a nominal price uses it. Consumers commonly ask their listing REALTOR® about the photographer's licence, scope and copyright."),
            ("Who owns MLS® photos?", "Copyright typically remains with the photographer unless assigned to the listing brokerage in writing. Listing brokerages typically obtain a licence to use the photos for the duration of the listing and for marketing archival purposes."),
            ("Are drone photos allowed on BC MLS® listings?", "Drone photography (Remotely Piloted Aircraft Systems, RPAS) is permitted where the pilot holds the required Transport Canada certification and complies with Canadian Aviation Regulations. Consumers commonly confirm the drone operator's licence with their listing REALTOR®."),
        ],
        [
            {"title":"CREA — Rules and Standards","url":"https://www.crea.ca/","publisher":"Canadian Real Estate Association"},
            {"title":"Transport Canada — Drone Rules (RPAS)","url":"https://tc.canada.ca/en/aviation/drone-safety/drone-rules","publisher":"Transport Canada"},
        ],
    ))

    # ---- Buying & selling sequencing ----
    add("sell-first", _e(
        "Sell-First (Approach)",
        "Buying & Selling",
        "The sell-first approach describes the sequence where a consumer sells their existing home before purchasing (or committing to purchase) their next home. Consumers commonly research this approach when they want price certainty from the sale before making a new-purchase offer, when they do not want to carry two mortgages, or when qualification for the next mortgage depends on discharging the existing one. Trade-offs may include temporary housing between the two homes, storage costs, and market-timing risk if prices rise between the sale and purchase. Whether a sell-first, buy-first or simultaneous approach is right for you is a decision to discuss with your own licensed REALTOR®, mortgage broker and — where relevant — a lawyer or notary.",
        [
            ("What are the main advantages of selling first?", "Consumers often cite: certainty of sale proceeds, no bridge financing, no dual-carrying costs, and no subject-to-sale clauses in the next offer. Trade-offs may include temporary housing and moving twice."),
            ("What if I can't find my next home in time?", "Common approaches include a longer completion date on the sale, a rent-back agreement with the buyer, or interim housing. Any rent-back or extended-possession arrangement is a legal contract — have a lawyer or notary review it."),
        ],
        [
            {"title":"BCFSA — Consumer Guides","url":"https://www.bcfsa.ca/public-resources/real-estate/consumer-resources","publisher":"BC Financial Services Authority"},
        ],
    ))

    add("buy-first", _e(
        "Buy-First (Approach)",
        "Buying & Selling",
        "The buy-first approach describes the sequence where a consumer purchases (or firmly commits to purchase) their next home before selling their existing home. Consumers commonly research this approach when they want certainty of housing between transactions, when the target market is highly competitive, or when their finances support carrying two properties briefly. Trade-offs may include bridge financing, dual mortgage-carrying costs, and the possibility of the existing home selling for less than expected. Whether a buy-first, sell-first or simultaneous approach is right for you is a decision to discuss with your own licensed REALTOR®, mortgage broker and — where relevant — a lawyer or notary.",
        [
            ("What is bridge financing in a buy-first scenario?", "Bridge financing is a short-term loan (typically up to 90-120 days) that lets you access the equity in your existing home to complete the purchase of the next one, before the existing home has closed. Lenders typically require a firm sale before advancing bridge funds. Terms and eligibility vary — verify current terms with your mortgage broker or lender."),
            ("Can I make a purchase offer 'subject to the sale of my existing home'?", "Yes — a subject-to-sale clause is a common condition in a Contract of Purchase and Sale. Sellers may accept, reject or add a 'time clause' allowing them to keep marketing the property. Discuss suitability with your licensed REALTOR® and lawyer."),
        ],
        [
            {"title":"BCFSA — Consumer Guides","url":"https://www.bcfsa.ca/public-resources/real-estate/consumer-resources","publisher":"BC Financial Services Authority"},
        ],
    ))

    add("subject-to-sale", _e(
        "Subject-to-Sale Clause",
        "Legal & Contract",
        "A subject-to-sale clause is a condition in a Contract of Purchase and Sale that makes a buyer's offer conditional on the sale of the buyer's existing home. The clause typically sets a deadline by which the buyer must remove the subject once their existing home is firmly sold. Sellers often accept a subject-to-sale offer with a 'time clause' that allows them to keep marketing the property and require the buyer to either remove the subject within a short window (commonly 48–72 hours) or collapse the deal if a competing offer comes in. The specific wording is legally significant — have your licensed REALTOR® and, where appropriate, a lawyer or notary review it before signing.",
        [
            ("What is a 'time clause' or '48-hour clause'?", "A time clause allows the seller to continue marketing the property while a subject-to-sale offer is pending. If the seller receives a competing offer, they can give the first buyer a short window (commonly 48 or 72 hours) to remove the subject-to-sale condition or collapse the deal."),
            ("Is a subject-to-sale clause common in BC?", "Yes, though acceptance depends on market conditions. In a sellers' market, sellers often decline subject-to-sale offers or accept them only with a strong time clause. In a balanced or buyers' market, they are more commonly accepted."),
        ],
        [
            {"title":"BCREA — Standard Forms","url":"https://www.bcrea.bc.ca/standard-forms/","publisher":"BC Real Estate Association"},
        ],
    ))

    add("simultaneous-closing", _e(
        "Simultaneous Closing",
        "Legal & Conveyancing",
        "A simultaneous closing (also called back-to-back or same-day closing) is a real estate closing structure where the completion of a sale of one property and the purchase of another property occur on the same day, typically with the proceeds of the sale used to fund the purchase. In BC, simultaneous closings are coordinated by the lawyer or notary using LTSA electronic filing and lender fund releases. Because timing is critical — funds must arrive from one lender, be applied to discharge the outgoing mortgage, and be forwarded to the next transaction — small delays can cascade. Whether a simultaneous closing is appropriate for your situation is a matter for your lawyer or notary.",
        [
            ("What happens if one side of a simultaneous closing is delayed?", "The most common outcome is a late-day completion, which may push possession to the next business day. Contracts typically contain force-majeure or reasonable-endeavours language, but late-completion costs (accommodation, moving, extra interest) can arise. Discuss risk with your lawyer or notary before agreeing to a same-day close."),
            ("Are simultaneous closings typical in BC?", "They are common when consumers are moving one home to the next and using sale proceeds to fund the purchase. Lawyers and notaries manage them routinely via LTSA electronic filing."),
        ],
        [
            {"title":"Land Title and Survey Authority of BC (LTSA)","url":"https://ltsa.ca","publisher":"LTSA"},
        ],
    ))

    add("interim-occupancy", _e(
        "Interim Occupancy",
        "Legal & Conveyancing",
        "Interim occupancy is a period during which a buyer occupies a residential unit but does not yet hold legal title. In BC, interim occupancy is most commonly discussed in the context of newly built condominium units where the buyer moves in before the strata plan is registered and title can be conveyed. During interim occupancy, the buyer typically pays an interim occupancy fee (covering interest on the unpaid balance, estimated strata fees and estimated property taxes) rather than a mortgage. Interim occupancy is a legally structured arrangement — the exact terms are set out in the pre-sale purchase agreement and should be reviewed by a BC lawyer or notary.",
        [
            ("How long does interim occupancy typically last?", "It varies by development. Interim occupancy can last from a few weeks to several months, depending on how long the developer takes to register the strata plan at the LTSA. Confirm the expected timeline with your lawyer or notary and the developer's disclosure statement."),
            ("Do I build equity during interim occupancy?", "Generally no. Interim occupancy fees typically do not include principal payments — they cover interest and estimated costs. Once final closing occurs and your mortgage begins, principal payments begin. Confirm your fee breakdown with your lawyer or notary."),
        ],
        [
            {"title":"Land Title and Survey Authority of BC (LTSA)","url":"https://ltsa.ca","publisher":"LTSA"},
        ],
    ))

    add("double-cost-period", _e(
        "Double-Cost Period",
        "Buying & Selling",
        "The double-cost period is the interval during a buy-first transaction (or a briefly overlapping simultaneous transaction) during which the consumer is carrying costs on both the existing home and the newly purchased home at the same time. Costs typically include two mortgage payments (or one mortgage plus bridge-financing interest), two sets of property taxes, two utility bills and, if applicable, two sets of strata fees. Consumers commonly estimate this period at 30 to 90 days when planning finances. Any specific budget should be discussed with a mortgage broker or financial professional.",
        [
            ("How long is a typical double-cost period?", "It varies with market conditions and the buyer's transaction sequence. Consumers often plan for 30–90 days, with a longer runway (up to 120 days) recommended in slower markets. Discuss the appropriate contingency with your mortgage broker."),
        ],
        [
            {"title":"CMHC — Homebuying Step-by-Step","url":"https://www.cmhc-schl.gc.ca/consumers/home-buying","publisher":"Canada Mortgage and Housing Corporation"},
        ],
    ))

    # ---- Strata terms ----
    add("freehold-strata", _e(
        "Freehold Strata",
        "Strata & Condo",
        "A freehold strata is the most common form of strata ownership in BC. Each owner has a freehold (fee simple) interest in their strata lot and an undivided share in the common property, governed by the Strata Property Act, SBC 1998, c. 43. Freehold strata differs from leasehold strata (where the underlying land is leased from another owner) and from bare-land strata (where each strata lot is a portion of land, not a portion of a building). Freehold strata includes most BC condominium apartments, townhomes and duplexes.",
        [
            ("How does freehold strata differ from bare-land strata?", "In a freehold strata, each strata lot is typically an air-space unit inside a building; common property (roof, hallways, exterior walls, land) is shared. In a bare-land strata, each strata lot is a portion of the land itself — the building on that lot is typically the owner's individual responsibility."),
            ("Can I finance a freehold strata unit like a detached home?", "Most Canadian residential lenders finance freehold strata units on similar terms to detached homes, though they may review the strata's depreciation report and financial statements. Verify with your mortgage broker."),
        ],
        [
            {"title":"Strata Property Act, SBC 1998, c. 43","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/98043_01","publisher":"BCLaws"},
        ],
    ))

    add("strata-insurance", _e(
        "Strata Insurance",
        "Strata Documents",
        "Strata insurance is the master insurance policy held by the strata corporation covering the buildings (excluding tenant improvements in some cases), common property and common assets. Under Section 149 of the Strata Property Act, the strata corporation must obtain and maintain full-value insurance based on the replacement value. Individual strata-lot owners are typically responsible for their own contents insurance, personal liability, in-suite improvements ('betterments'), and — importantly — insurance against the strata's deductible if a covered loss originates from the owner's lot. Insurance markets change; premiums and deductibles have risen materially in BC in recent years. Consumers should discuss coverage with a licensed BC insurance broker.",
        [
            ("Do I need my own insurance if the strata has insurance?", "Yes. The strata policy covers the building and common property; it does not cover your personal belongings, personal liability inside your unit, or (in most cases) improvements you have added ('betterments'). An in-suite condo policy is standard."),
            ("What is 'deductible coverage' in BC strata insurance?", "Deductible coverage (sometimes called 'loss assessment' coverage) protects an owner if the strata's own deductible is charged back to their strata lot after a covered loss. BC strata deductibles have risen sharply — consumers commonly discuss appropriate limits with a licensed insurance broker."),
        ],
        [
            {"title":"BC Financial Services Authority — Strata Insurance","url":"https://www.bcfsa.ca/media/2151/download","publisher":"BCFSA"},
            {"title":"Strata Property Act, s. 149","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/98043_05#section149","publisher":"BCLaws"},
        ],
    ))

    add("deductible-coverage", _e(
        "Deductible Coverage (Strata Loss Assessment)",
        "Insurance",
        "Deductible coverage — sometimes called loss assessment coverage — is an optional coverage on an individual condominium (strata-lot) insurance policy that responds when the strata corporation's own deductible is charged back to the owner following a covered loss originating in the owner's strata lot. BC strata deductibles have risen materially since 2020 (some water-damage deductibles now exceed $100,000). Deductible coverage limits are set by the owner in their in-suite policy and should be discussed with a licensed BC insurance broker. The Strata Property Act, SBC 1998, c. 43 and its regulations set out how a strata corporation can recover deductibles from responsible strata-lot owners.",
        [
            ("How much deductible coverage do BC strata owners typically carry?", "This varies with the strata's actual deductible. Consumers commonly obtain the strata's current Certificate of Insurance and set their coverage limit at or above the largest single deductible listed. Discuss appropriate limits with a licensed insurance broker."),
            ("When can a strata charge its deductible back to an owner?", "When the loss originates from an owner's strata lot and the strata bylaws so provide (subject to Section 158 of the Strata Property Act). The strata corporation typically claims the deductible by adding it to the owner's account. Legal disputes are heard at the Civil Resolution Tribunal."),
        ],
        [
            {"title":"BC Financial Services Authority — Strata Insurance","url":"https://www.bcfsa.ca/media/2151/download","publisher":"BCFSA"},
        ],
    ))

    add("form-b", _e(
        "Form B — Information Certificate (Strata)",
        "Strata Documents",
        "Form B is a strata-corporation certificate defined by Section 59 of the Strata Property Act, SBC 1998, c. 43. It provides a snapshot of information about a strata lot, including monthly strata fees, any special levies owing, agreements involving the strata lot, whether there are outstanding bylaw fines, and current insurance particulars. Form B is typically obtained by a buyer during due diligence and is required by most lenders and lawyers before completion. A strata corporation must provide a Form B within 7 days of a written request, subject to prescribed fees.",
        [
            ("Who requests the Form B and when?", "The buyer's REALTOR® typically requests the Form B on the buyer's behalf during the subject-removal period. It must be produced within 7 days per the Strata Property Regulation."),
            ("What if the Form B shows outstanding levies?", "Outstanding special levies typically travel with the strata lot unless the contract of purchase says otherwise. Discuss any outstanding amounts with your lawyer or notary and licensed REALTOR® before removing subjects."),
        ],
        [
            {"title":"Strata Property Act, s. 59","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/98043_02#section59","publisher":"BCLaws"},
        ],
    ))

    add("form-f", _e(
        "Form F — Certificate of Payment (Strata)",
        "Strata Documents",
        "Form F is a strata-corporation certificate under Section 115 of the Strata Property Act. It confirms whether any strata fees, special levies, fines or other amounts owing under the strata bylaws are outstanding against a strata lot as of a specified date. A current Form F is required by the Land Title and Survey Authority (LTSA) to register a transfer of title of a strata lot. If a Form F cannot be issued because amounts are owing, the transfer cannot be registered. A strata corporation must issue a Form F within one week of a written request, subject to prescribed fees.",
        [
            ("Why is Form F required at closing?", "The LTSA requires a Form F (or equivalent proof) at registration to confirm no strata-lot debts are outstanding that would create a lien. Without a Form F, the transfer is not registered."),
            ("What if the strata refuses to issue a Form F?", "Refusal without valid grounds may be resolved through the Civil Resolution Tribunal. In practice, unpaid amounts are typically paid out of sale proceeds at closing so the Form F can be issued."),
        ],
        [
            {"title":"Strata Property Act, s. 115","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/98043_04#section115","publisher":"BCLaws"},
        ],
    ))

    add("strata-minutes", _e(
        "Strata Council Meeting Minutes",
        "Strata Documents",
        "Strata council meeting minutes are the official record of strata council meetings and any general meetings of a BC strata corporation, as required by the Strata Property Act, SBC 1998, c. 43. Owners and prospective purchasers commonly review the last two years of minutes to understand issues such as pending special levies, ongoing maintenance concerns, insurance claims, bylaw disputes and financial matters. Minutes must be provided to owners and, on written request, to prospective purchasers subject to prescribed fees. A buyer's licensed REALTOR® typically requests the last 24 months of minutes during subject-removal.",
        [
            ("What should a buyer look for in strata minutes?", "Consumers often look for: pending or discussed special levies; building-envelope, roof or plumbing concerns; insurance-claim history; ongoing bylaw disputes; and unresolved council action items. Discuss any red flags with your licensed REALTOR® and — where appropriate — a lawyer or notary."),
            ("Can a strata corporation refuse to share minutes with a buyer?", "The Strata Property Act requires minutes and other prescribed records to be provided on request; refusal without valid grounds may be resolved through the Civil Resolution Tribunal."),
        ],
        [
            {"title":"Strata Property Act, s. 35 (records)","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/98043_01#section35","publisher":"BCLaws"},
        ],
    ))

    add("strata-management", _e(
        "Strata Management (Professional)",
        "Strata & Condo",
        "Professional strata management refers to a licensed brokerage engaged by a strata corporation to provide administrative, financial and, where retained, on-site management services. In BC, strata management brokerages and licensees are regulated by the BC Financial Services Authority (BCFSA) under the Real Estate Services Act, SBC 2004, c. 42. Typical services include collecting strata fees, paying invoices, preparing financial statements, maintaining records, holding meetings and coordinating repairs. A strata may be professionally managed or self-managed. The contract between the strata and the manager is a Strata Management Agreement — its terms and termination provisions should be reviewed by the strata council with the assistance of counsel where appropriate.",
        [
            ("Are strata managers licensed in BC?", "Yes. Individuals and brokerages providing strata management services in BC must be licensed under the Real Estate Services Act and regulated by BCFSA."),
            ("Is professional strata management mandatory?", "No. A BC strata corporation may be self-managed. The choice depends on the strata's size, complexity, budget and the volunteer capacity of its council."),
        ],
        [
            {"title":"BCFSA — Strata Management","url":"https://www.bcfsa.ca/public-resources/real-estate/consumer-resources/strata-management","publisher":"BCFSA"},
        ],
    ))

    add("strata-rental-restrictions", _e(
        "Strata Rental Restrictions",
        "Strata & Condo",
        "Effective November 24, 2022, the BC Government amended the Strata Property Act to remove the ability of strata corporations to prohibit or limit long-term rentals of strata lots (Bill 44). Rental-restriction bylaws that were in force before that date became unenforceable. Age restrictions were also amended: strata corporations may generally not restrict occupancy by age, except for a limited 55-and-over exemption. Short-term-rental restrictions (e.g. Airbnb-style stays of less than 30 days) remain permissible where allowed by bylaw and local government zoning. Rental and age restrictions in strata contexts should be reviewed with a BC lawyer for your specific situation.",
        [
            ("Can my BC strata still ban long-term rentals?", "No. Since November 24, 2022, strata rental-restriction bylaws are no longer enforceable for long-term rentals. Short-term-rental restrictions (typically under 30 days) can still be enforced through bylaws and local government rules."),
            ("Can a strata still be 55-and-over?", "Yes. The 2022 changes preserved a limited age-restriction exemption: a strata corporation may have a bylaw requiring all persons residing in the strata to be 55 years of age or older. Other age-based restrictions are generally not enforceable."),
        ],
        [
            {"title":"BC Housing — Strata Rental and Age Restriction Changes","url":"https://news.gov.bc.ca/releases/2022HOUS0141-001736","publisher":"Government of British Columbia"},
            {"title":"Strata Property Act, SBC 1998, c. 43","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/98043_01","publisher":"BCLaws"},
        ],
    ))

    add("move-in-fees", _e(
        "Move-in Fees (Strata)",
        "Strata & Condo",
        "Move-in and move-out fees are user fees that some BC strata corporations charge to cover administrative and elevator-booking costs when a new occupant moves in or out. Fees are set by strata bylaw and are capped by the Strata Property Regulation (currently $200 per move in or out for most strata corporations; verify current amounts with a BC lawyer as regulations change). Fees are payable by the owner or tenant depending on the bylaw. Consumers moving into a strata unit should confirm any applicable fees, move-in windows and elevator-booking rules with the strata management company before scheduling movers.",
        [
            ("Are move-in fees mandatory in BC strata buildings?", "No. Fees exist only where the strata has adopted an enabling bylaw. The maximum permitted amount is set by regulation."),
        ],
        [
            {"title":"Strata Property Regulation","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/43_2000","publisher":"BCLaws"},
        ],
    ))

    # ---- Legal / conveyancing ----
    add("lawyer-or-notary", _e(
        "Lawyer or Notary (BC Conveyancing)",
        "Legal & Conveyancing",
        "In British Columbia, real estate transactions are conveyanced (closed) by either a lawyer (a member of the Law Society of BC) or a notary public (a member of the Society of Notaries Public of BC). Both are qualified to prepare closing documents, register title transfers and mortgages at the Land Title and Survey Authority (LTSA), and handle trust funds. Lawyers can also provide broader legal advice on disputes, litigation, family-law implications and estate matters — notaries generally cannot. For a straightforward BC residential purchase or sale, either can be retained; for anything with a dispute, litigation risk or complex family/tax dimension, a lawyer is typically engaged.",
        [
            ("What's the difference in fees between a BC lawyer and a notary?", "Fees are set by the individual professional and vary by complexity of the transaction. Both must provide a written fee estimate on request."),
            ("Can a lawyer or notary represent both buyer and seller?", "Generally no — the Law Society and Society of Notaries have conflict-of-interest rules preventing dual representation in most transactions. Each party typically retains their own."),
        ],
        [
            {"title":"Law Society of British Columbia","url":"https://www.lawsociety.bc.ca","publisher":"Law Society of BC"},
            {"title":"Society of Notaries Public of BC","url":"https://www.notaries.bc.ca","publisher":"Society of Notaries Public of BC"},
        ],
    ))

    add("escrow", _e(
        "Escrow / Trust Funds (BC)",
        "Legal & Conveyancing",
        "British Columbia does not use a US-style escrow system. Instead, funds are held in trust by a lawyer, notary or real estate brokerage, subject to strict trust-account rules under the Real Estate Services Act (RESA), the Notaries Act, or the Legal Profession Act as applicable. Deposits on a Contract of Purchase and Sale are held by the listing brokerage's trust account. Purchase funds move from the buyer's lender to the buyer's lawyer or notary, who then transfers them to the seller's lawyer or notary upon registration of the transfer. The word 'escrow' is sometimes used loosely in BC to mean 'held in trust', but no separate escrow agent (as in California) is involved.",
        [
            ("Is my deposit safe if held in a BC brokerage trust account?", "Trust accounts are heavily regulated by BCFSA (for brokerages), the Law Society (for lawyers) and the Society of Notaries. Trust funds are separate from operating funds and subject to random audits. Discuss any concerns with your lawyer or notary."),
        ],
        [
            {"title":"BCFSA — Trust Account Rules","url":"https://www.bcfsa.ca","publisher":"BCFSA"},
        ],
    ))

    # ---- Rural / acreage ----
    add("well-flow-test", _e(
        "Well Flow Test",
        "Rural & Acreage",
        "A well flow test measures the sustainable yield (gallons per minute or litres per minute) of a private well. It is commonly performed as a due-diligence step when purchasing acreage or rural property served by a well. The test typically runs the well continuously for a defined period (often 2, 4 or 24 hours) while measuring drawdown and recovery. A separate water-quality (potability) test measures bacteriological and chemical parameters. Both tests should be conducted by a qualified well-water professional, and results should be interpreted with the assistance of a home inspector or specialized well contractor. General educational information only — see the Groundwater Protection Regulation under the Water Sustainability Act, SBC 2014, c. 15.",
        [
            ("What flow rate is considered adequate for a BC residence?", "Rules of thumb vary by household size and use. Health Authorities and mortgage insurers commonly reference sustainable yields of 3–5 US gallons per minute for typical residential use, but the specific requirement depends on your situation. Discuss with a qualified well professional."),
            ("Is a water-potability test the same as a flow test?", "No. A flow test measures quantity; a potability test measures quality (bacteria, minerals, contaminants). Buyers commonly order both."),
        ],
        [
            {"title":"Water Sustainability Act, SBC 2014, c. 15","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/14015","publisher":"BCLaws"},
            {"title":"Government of BC — Groundwater Wells","url":"https://www2.gov.bc.ca/gov/content/environment/air-land-water/water/groundwater-wells","publisher":"Government of British Columbia"},
        ],
    ))

    add("septic-system", _e(
        "Septic System (Onsite Wastewater)",
        "Rural & Acreage",
        "A septic system is an onsite sewage disposal system used where municipal sewers are not available. In BC, septic systems are regulated under the Sewerage System Regulation (BC Reg. 326/2004) enforced by regional Health Authorities. Systems are classified as Type 1 (septic tank + gravity field), Type 2 (adds treatment before discharge) or Type 3 (highest treatment level, used on difficult sites). New systems and material alterations must be designed by a Registered Onsite Wastewater Practitioner (ROWP) or professional engineer, and a filing must be made with the Health Authority. Consumers buying a rural property typically order a septic-system inspection during subject-removal.",
        [
            ("Do I need permits to install a septic system in BC?", "You do not need a permit in the traditional sense, but a qualified professional (ROWP or engineer) must file the system design and completion report with the local Health Authority under BC Reg. 326/2004."),
            ("How often should a BC septic tank be pumped?", "Pumping frequency varies with household size and system type. As a general guide, homeowners often pump every 3–5 years. Consult a qualified septic contractor for advice on your specific system."),
        ],
        [
            {"title":"Sewerage System Regulation (BC Reg. 326/2004)","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/326_2004","publisher":"BCLaws"},
            {"title":"Government of BC — Sewerage Systems","url":"https://www2.gov.bc.ca/gov/content/environment/waste-management/sewage","publisher":"Government of British Columbia"},
        ],
    ))

    add("septic-inspection", _e(
        "Septic Inspection",
        "Rural & Acreage",
        "A septic inspection is a professional examination of an onsite sewage system, typically performed by a Registered Onsite Wastewater Practitioner (ROWP) or an approved home inspector. The inspection generally involves locating and pumping the tank, checking the tank's condition, examining the drain field or advanced treatment components, and reviewing filings on record with the local Health Authority. In BC, septic inspections are a common due-diligence step when purchasing a rural or acreage property. Whether an inspection is appropriate for your specific transaction is a decision to discuss with your own licensed REALTOR® and qualified septic professional.",
        [
            ("Is a septic inspection required in BC?", "There is no provincial requirement that a septic inspection be performed at every sale, but it is a common subject-removal condition on rural transactions."),
            ("What does a septic inspection typically cost?", "Costs vary with system type, location and access. Consumers commonly obtain 2–3 quotes from qualified ROWPs. Confirm current market rates directly with providers."),
        ],
        [
            {"title":"Applied Science Technologists and Technicians of BC — ROWP Registry","url":"https://asttbc.org","publisher":"ASTTBC"},
        ],
    ))

    add("water-rights", _e(
        "Water Rights (BC)",
        "Rural & Acreage",
        "In British Columbia, water rights are governed by the Water Sustainability Act, SBC 2014, c. 15, and administered by the Ministry of Environment and Climate Change Strategy. Surface water (streams, lakes) and groundwater (wells) are provincial resources; use for anything beyond individual domestic purposes typically requires a licence. Licences run with the land in most cases and are recorded in the provincial Water Licence Records. Consumers purchasing rural land or acreage commonly check whether a valid water licence exists, what quantity it authorizes and for what purpose. This is general information only — a real estate lawyer or notary and a hydrologist should be consulted for specific transactions.",
        [
            ("Do I need a water licence for a domestic well?", "Under the Water Sustainability Act, non-domestic groundwater use requires a licence; domestic groundwater use for a single household is exempt but must still be registered. Verify current requirements with the Government of BC."),
            ("Are water licences transferable when I buy the property?", "Yes, in most cases a water licence runs with the land and transfers with title. Verify the licence's status through the Water Licence Records or with a specialized lawyer."),
        ],
        [
            {"title":"Water Sustainability Act, SBC 2014, c. 15","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/14015","publisher":"BCLaws"},
            {"title":"Government of BC — Water Licences","url":"https://www2.gov.bc.ca/gov/content/environment/air-land-water/water/water-licensing-rights","publisher":"Government of British Columbia"},
        ],
    ))

    add("riparian-areas", _e(
        "Riparian Areas (RAPR)",
        "Land Use",
        "Riparian areas are the strips of land alongside streams, lakes and wetlands that support fish habitat. In BC, the Riparian Areas Protection Regulation (RAPR), enacted under the Riparian Areas Protection Act, SBC 2016, c. 12, restricts residential development within a Streamside Protection and Enhancement Area (SPEA) unless a Qualified Environmental Professional (QEP) has completed an assessment. RAPR applies to most urban and suburban land in BC (with some regional exceptions). Consumers buying land with a stream, lake edge, wetland or ditch on or near the property commonly research whether a RAPR assessment is on file and what setback applies.",
        [
            ("Does RAPR apply to my property?", "RAPR applies in most of BC's populated regions to any development within 30 metres of a stream, wetland or lake edge. Confirm applicability with your local government and a Qualified Environmental Professional."),
            ("What is a Qualified Environmental Professional?", "A QEP is an environmental professional (typically a biologist, engineer or agrologist) qualified under RAPR to conduct SPEA assessments. Reports are filed with the Ministry of Environment."),
        ],
        [
            {"title":"Riparian Areas Protection Act, SBC 2016, c. 12","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/16012","publisher":"BCLaws"},
            {"title":"Government of BC — RAPR","url":"https://www2.gov.bc.ca/gov/content/environment/plants-animals-ecosystems/fish/aquatic-habitat/riparian-areas-regulations","publisher":"Government of British Columbia"},
        ],
    ))

    add("road-access", _e(
        "Road Access & Easements",
        "Land Use",
        "In BC, legal road access to a property may be by way of a public road (dedicated to the Crown or a municipality), a statutory right-of-way, or a registered easement. Rural properties may rely on private roads maintained by an owners' association or the individual owners. Before purchasing rural or acreage property, consumers commonly verify legal access on title through the Land Title and Survey Authority (LTSA) title search, check any registered easements or rights-of-way, and confirm road-maintenance obligations. Discuss road-access review with your lawyer or notary — improperly identified access can render a property landlocked.",
        [
            ("What is a statutory right-of-way?", "A statutory right-of-way (SRW) is a registered interest on title that gives a person, corporation or government the right to use another's land for a specified purpose — typically road access or utility corridors. SRWs are governed by the Land Title Act."),
            ("Who pays to maintain a private road in BC?", "Costs typically fall on the owners served by the road, either equally, by frontage share, or by a formula set out in a registered agreement. Consumers commonly ask for a copy of any maintenance agreement during due diligence."),
        ],
        [
            {"title":"Land Title and Survey Authority of BC","url":"https://ltsa.ca","publisher":"LTSA"},
        ],
    ))

    add("rural-insurance", _e(
        "Rural / Acreage Insurance",
        "Insurance",
        "Rural or acreage property insurance covers detached homes on larger parcels outside serviced urban areas. Coverage typically differs from urban home insurance in several ways: higher deductibles for wildfire-prone areas, exclusions or limits on outbuildings and specialty structures (barns, indoor arenas), specific requirements for wood stoves and heat sources, and — where applicable — separate riders for farm operations or equestrian use. Availability and premiums vary substantially by insurer, region, and the property's proximity to fire-hydrant infrastructure. Consumers considering rural property should discuss coverage with a licensed BC insurance broker familiar with the specific region.",
        [
            ("Why is rural insurance more expensive?", "Common reasons include longer emergency response times, wildfire and interface risk, larger structures, and — for acreage — outbuildings and farm equipment. Discuss factors relevant to your property with a licensed insurance broker."),
        ],
        [
            {"title":"Insurance Bureau of Canada — Rural & Wildfire Insurance","url":"http://www.ibc.ca","publisher":"Insurance Bureau of Canada"},
        ],
    ))

    add("wildfire-risk", _e(
        "Wildfire Risk (BC)",
        "Insurance",
        "Wildfire risk in BC refers to the probability and severity of a wildfire affecting a specific property. The BC Wildfire Service publishes hazard maps, and the FireSmart Canada program provides guidance on reducing risk through vegetation management, roofing materials, and defensible space around structures. Insurers increasingly consider wildfire risk when quoting premiums or determining deductibles, particularly in the wildland-urban interface. Consumers purchasing property in higher-risk regions commonly research the BC Wildfire Service's historical fire perimeters and community FireSmart status. This is general educational information — for site-specific advice, consult a FireSmart representative and your insurance broker.",
        [
            ("Does BC have a wildfire risk map?", "Yes. The BC Wildfire Service publishes interactive wildfire perimeters, fuel-type maps and fire-danger ratings. FireSmart BC also publishes community-level assessments."),
            ("What is 'defensible space'?", "Defensible space is the vegetation-managed zone around a structure (typically the first 10 metres) designed to slow or stop the spread of a wildfire. FireSmart guidelines describe recommended landscaping, tree spacing and construction materials."),
        ],
        [
            {"title":"BC Wildfire Service","url":"https://www2.gov.bc.ca/gov/content/safety/wildfire-status","publisher":"Government of British Columbia"},
            {"title":"FireSmart BC","url":"https://firesmartbc.ca","publisher":"FireSmart BC"},
        ],
    ))

    add("farm-status", _e(
        "Farm Status (Property Tax Classification)",
        "Government & Tax",
        "Farm status is a property-tax classification under the Assessment Act, RSBC 1996, c. 20, that classifies eligible farmland as 'Farm' (Class 9). Farm classification typically produces lower assessed values for farming land and buildings than the equivalent residential classification. To qualify, the property must generate a prescribed minimum annual gross income from the sale of qualifying agricultural products (currently $2,500 for parcels 0.8–4.0 hectares, $10,000 for smaller parcels, and other thresholds for larger parcels — confirm current thresholds with BC Assessment). Applications are made to BC Assessment; classification is reviewed annually. Farm status has significant tax implications and interacts with Agricultural Land Reserve (ALR) rules — consult a BC agricultural lawyer or tax professional.",
        [
            ("What income qualifies for BC farm status?", "Gross income from the sale of qualifying primary agricultural products (crops, livestock, dairy, horticulture, aquaculture and similar). Not all farm activities count — verify eligibility with BC Assessment."),
            ("If I lose farm status, does my property tax rise?", "Yes. Losing farm classification typically results in a large increase in the assessed taxable value of the land, and a corresponding increase in annual property tax. Some municipalities offer phase-in or transition rules — verify with your municipality."),
        ],
        [
            {"title":"BC Assessment — Farm Class","url":"https://info.bcassessment.ca/property-information-and-trends/farm-classification","publisher":"BC Assessment"},
            {"title":"Assessment Act, RSBC 1996, c. 20","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/96020_01","publisher":"BCLaws"},
        ],
    ))

    # ---- Real Property Report / survey ----
    add("real-property-report", _e(
        "Real Property Report (Survey Certificate)",
        "Legal & Title",
        "A Real Property Report — sometimes called a survey certificate or building-location certificate — is a document prepared by a BC Land Surveyor showing the boundaries of a parcel and the location of buildings, fences and other significant improvements relative to those boundaries. It reveals encroachments, easements, and setback compliance. Real Property Reports are more common in some other Canadian provinces than in BC, but they are still routinely ordered on rural and acreage transactions, and where a buyer, lender or insurer wants written confirmation of boundaries and improvements. Whether a Real Property Report is appropriate for your transaction is a decision to discuss with your own licensed REALTOR® and a BC Land Surveyor.",
        [
            ("Is a Real Property Report required in BC?", "No. There is no provincial legal requirement to obtain one, and most BC residential purchases proceed without one. It is commonly ordered on rural transactions or where a boundary question exists."),
            ("How is a Real Property Report different from a BC Assessment property description?", "BC Assessment describes the property for taxation. A Real Property Report is prepared by a professional BC Land Surveyor and reflects actual on-the-ground boundaries and improvements. Only the surveyor's report is authoritative for boundary questions."),
        ],
        [
            {"title":"Association of BC Land Surveyors","url":"https://www.abcls.ca","publisher":"Association of BC Land Surveyors"},
        ],
    ))

    add("fence-act", _e(
        "Fence Considerations (BC)",
        "Land Use",
        "Unlike Alberta and other provinces, British Columbia does not have a dedicated 'Fence Act'. Fence disputes are typically resolved under the common law of nuisance and trespass, the Property Law Act, RSBC 1996, c. 377, and — where relevant — municipal bylaws and Small Claims Court or the Civil Resolution Tribunal (CRT). Common issues include shared-boundary fences (both neighbours typically share costs by agreement), livestock fencing (statutorily addressed in some Livestock Districts), and encroachments. Any boundary or fence-line dispute should be discussed with a BC lawyer familiar with your local jurisdiction.",
        [
            ("Do BC neighbours have to share fence costs?", "There is no general statutory obligation to share costs; it depends on prior agreement, past practice, and — for boundary fences — the general common-law principle that both benefit. Municipal bylaws may impose additional rules. Consult a BC lawyer for disputes."),
        ],
        [
            {"title":"Property Law Act, RSBC 1996, c. 377","url":f"{BC_LAW_SITE}/civix/document/id/complete/statreg/96377_01","publisher":"BCLaws"},
            {"title":"Civil Resolution Tribunal","url":"https://civilresolutionbc.ca","publisher":"CRT"},
        ],
    ))

    # ---- HELOC ----
    add("heloc", _e(
        "Home Equity Line of Credit (HELOC)",
        "Financing",
        "A Home Equity Line of Credit (HELOC) is a revolving credit line secured against the equity in an owner-occupied home. In Canada, federally regulated lenders may lend up to 65% of a home's value on a HELOC portion (with the combined mortgage plus HELOC capped at 80% under Office of the Superintendent of Financial Institutions rules). HELOCs typically carry a variable interest rate tied to the lender's prime rate and require interest-only payments during the draw period. Advantages may include flexibility and lower short-term payments; risks include rate variability and the temptation to use home equity for non-appreciating purchases. Suitability depends on your specific finances — discuss with a mortgage broker or licensed financial advisor.",
        [
            ("Can I get a HELOC before I close on a home purchase?", "Most lenders open a HELOC only after you own the property. Some lenders offer combined mortgage-plus-HELOC products (e.g. re-advanceable mortgages) that can be set up at closing."),
            ("What's the difference between a HELOC and a second mortgage?", "A HELOC is a revolving credit line with a variable rate. A second mortgage is a fixed-term loan with defined payments. Both are secured against home equity but function differently — discuss which suits your situation with a mortgage broker."),
        ],
        [
            {"title":"Financial Consumer Agency of Canada — HELOCs","url":"https://www.canada.ca/en/financial-consumer-agency/services/mortgages/home-equity-line-credit.html","publisher":"FCAC"},
        ],
    ))

    # ---- Deferred maintenance ----
    add("deferred-maintenance", _e(
        "Deferred Maintenance",
        "Property Value",
        "Deferred maintenance refers to repairs, replacements or upkeep tasks that have been postponed beyond their recommended service intervals. In residential real estate, deferred maintenance commonly includes items such as roofing near end of life, aging hot-water tanks, worn exterior paint, deferred window replacements, and untreated moisture or drainage issues. Deferred maintenance affects both a home's market value and lender/insurer assessments. Home inspectors typically identify deferred maintenance in their reports. Consumers considering a purchase commonly research the cost and timeline to address deferred items during subject-removal. Whether a specific repair is required for lending or insurance in your situation is a matter for those professionals.",
        [
            ("How does deferred maintenance affect home value?", "Buyers commonly adjust their offers to account for major deferred items. Some deferred items also affect a lender's willingness to finance or an insurer's willingness to bind coverage — verify with your mortgage broker and insurance broker."),
        ],
        [
            {"title":"CMHC — Home Maintenance","url":"https://www.cmhc-schl.gc.ca/consumers/home-maintenance","publisher":"CMHC"},
        ],
    ))

    # ---- Contractor licensing ----
    add("contractor-licensing", _e(
        "Contractor Licensing (BC)",
        "Building Code",
        "In British Columbia, contractors and trades are regulated by a combination of provincial legislation, WorkSafeBC registration, municipal business licences, and — for new homes — the mandatory Licensed Residential Builder programme administered by BC Housing under the Homeowner Protection Act, RSBC 1998, c. 31. Trades such as electrical and gas require certified tradespersons and permits from Technical Safety BC. Consumers hiring a contractor commonly verify: (a) WorkSafeBC registration and clearance letter, (b) municipal business licence, (c) BC Housing Licensed Residential Builder number for new-home work, (d) Technical Safety BC certification where required, and (e) liability insurance certificates.",
        [
            ("Do I need a Licensed Residential Builder to renovate my home?", "Most renovations of existing homes do not require a Licensed Residential Builder. New-home construction and major reconstruction typically do. Verify your specific project with BC Housing."),
            ("Where do I check a contractor's WorkSafeBC status?", "WorkSafeBC publishes a Clearance Letter service that lets you confirm a contractor's account is in good standing. Consumers commonly request a clearance letter before releasing any progress payment."),
        ],
        [
            {"title":"BC Housing — Licensed Residential Builders","url":"https://www.bchousing.org/licensing-consumer-services","publisher":"BC Housing"},
            {"title":"WorkSafeBC — Clearance Letter","url":"https://www.worksafebc.com/en/insurance/why-clearance-letter","publisher":"WorkSafeBC"},
        ],
    ))

    # ---- Moving costs & utility costs ----
    add("moving-costs", _e(
        "Moving Costs",
        "Process & General",
        "Moving costs are the expenses associated with relocating from one home to another. Typical components include professional movers or truck rental, packing supplies, insurance for goods in transit, temporary storage, utility connection and disconnection fees, mail and address-change fees, and — where applicable — pet or vehicle transport. In BC, professional movers are regulated for insurance and licensing under provincial and federal transportation regulations. Consumers commonly obtain 2–3 quotes and confirm the mover's insurance coverage before booking. This is general educational information — quotes vary substantially with distance, volume and season.",
        [
            ("How do I check that a BC mover is insured?", "Ask the mover for their commercial general liability certificate and their cargo insurance certificate. For inter-provincial or cross-border moves, verify their Canada Border Services Agency and FMCSA registration where applicable."),
        ],
        [
            {"title":"Canadian Association of Movers","url":"https://mover.net","publisher":"CAM"},
        ],
    ))

    add("utility-costs", _e(
        "Utility Costs (BC)",
        "Process & General",
        "Utility costs are the monthly or bi-monthly service charges for electricity, natural gas, water, sewer, garbage/recycling, internet and — where applicable — heating fuel (oil, propane or wood). In BC, electricity is supplied by BC Hydro or, in some areas, FortisBC. Natural gas is supplied by FortisBC. Water, sewer and garbage services are supplied by the local municipality or regional district. Consumers researching a home commonly request 12 months of utility history from the seller (via the seller's licensee) to estimate annual operating costs. Actual costs vary substantially with occupancy, heating type, insulation, weather and rate changes.",
        [
            ("Can I get 12 months of utility bills from the seller?", "Yes, this is a common due-diligence request. It is usually handled through the listing REALTOR® during subject-removal. Actual costs may vary in your household."),
            ("Are utility bills part of the statement of adjustments at closing?", "Utility accounts are typically closed by the seller and re-opened in the buyer's name. Some utilities (municipal water, sewer) are billed on the property tax bill and are prorated in the statement of adjustments prepared by your lawyer or notary."),
        ],
        [
            {"title":"BC Hydro — Rates","url":"https://www.bchydro.com/accounts-billing/rates.html","publisher":"BC Hydro"},
            {"title":"FortisBC — Rates","url":"https://www.fortisbc.com/accounts-billing/billing-rates","publisher":"FortisBC"},
        ],
    ))

    # ---- gst-new-homes (kept because buying journey references it) ----
    add("gst-new-homes", _e(
        "GST on New / Substantially Renovated Homes",
        "Taxes & Costs",
        "The federal Goods and Services Tax (GST) applies at 5% to the sale of newly built or substantially renovated residential homes in Canada, including British Columbia. Resale of previously owned homes is generally exempt. Where the buyer occupies the newly built home as their primary residence, the New Housing Rebate may reduce the effective GST payable; the rebate is administered by the Canada Revenue Agency and phases out above defined price thresholds. Investors purchasing a new home for rental may instead be eligible for the New Residential Rental Property Rebate. GST rules are technical — confirm eligibility and current thresholds with a Canadian tax professional or the CRA.",
        [
            ("Do I pay GST on a resale home in BC?", "Generally no. Resale residential homes are typically exempt from GST. GST applies to newly built or substantially renovated homes and to some assignment sales."),
            ("What is the New Housing Rebate?", "The GST/HST New Housing Rebate is a federal rebate that partially refunds GST paid on a newly built home used as a primary residence. Thresholds and formulas are set by the CRA — confirm current amounts with a Canadian tax professional."),
        ],
        [
            {"title":"CRA — GST/HST and Real Property","url":"https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/collect-gst-hst/real-property.html","publisher":"CRA"},
        ],
    ))

    # DONE - collect and return
    return E

if __name__ == "__main__":
    entries = build_all()
    import os, asyncio
    os.environ.setdefault('MONGO_URL','mongodb://localhost:27017')
    os.environ.setdefault('DB_NAME','test_database')
    from motor.motor_asyncio import AsyncIOMotorClient
    async def go():
        mongo = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = mongo[os.environ['DB_NAME']]
        upsert_count = 0
        skip_count = 0
        for e in entries:
            existing = await db.glossary.find_one({"slug": e["slug"]}, {"_id":1})
            if existing:
                skip_count += 1
                print(f"  SKIP (exists): {e['slug']}")
                continue
            await db.glossary.insert_one(e)
            upsert_count += 1
            print(f"  INSERTED: {e['slug']}  ({e['term']})")
        print(f"\nInserted {upsert_count}, skipped {skip_count}. Total in file: {len(entries)}")
    asyncio.run(go())
