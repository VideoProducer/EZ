// Equestrian Due-Diligence Checklist — print-ready PDF mockup.
//
// This is a REVIEW MOCKUP so Doug can approve the layout, tone, and content
// before we wire it up as an email-gated download.  The whole page is styled
// as an 8.5x11 print document; browsers can hit "Print → Save as PDF" to
// produce the actual deliverable.  Once approved, the same JSX can be
// rendered server-side (WeasyPrint / Playwright) and personalized per
// listing.
import React from "react";
import { Link } from "react-router-dom";
import UnlistedMockupBanner from "./UnlistedMockupBanner";

const BRAND = {
  navy: "#0F2A5B",
  gold: "#F5A623",
  cream: "#F5F0E1",
  ink: "#1F2937",
  muted: "#6B7280",
  redAccent: "#B91C1C",
};

const A4 = {
  width: "8.5in",
  minHeight: "11in",
  margin: "0 auto",
  padding: "0.75in 0.75in 0.6in",
  background: "white",
  boxShadow: "0 2px 20px rgba(15,42,91,0.15)",
  fontFamily: "'Inter', -apple-system, sans-serif",
  color: BRAND.ink,
  fontSize: "10.5pt",
  lineHeight: 1.5,
  boxSizing: "border-box",
  pageBreakAfter: "always",
  position: "relative",
};

// Section header — gold underline + navy text
const SectionH = ({ children, num }) => (
  <div style={{marginTop:"18pt",marginBottom:"8pt",borderBottom:`2px solid ${BRAND.gold}`,paddingBottom:"3pt"}}>
    <div style={{fontSize:"7.5pt",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700}}>SECTION {num}</div>
    <div style={{fontSize:"14pt",fontWeight:700,color:BRAND.navy,fontFamily:"'Sora', sans-serif",lineHeight:1.15}}>{children}</div>
  </div>
);

const Check = ({ children, critical }) => (
  <div style={{display:"flex",gap:"8pt",alignItems:"flex-start",marginBottom:"5pt",fontSize:"10pt"}}>
    <div style={{
      width:"11pt",height:"11pt",flexShrink:0,
      border:`1.5pt solid ${critical?BRAND.redAccent:BRAND.navy}`,borderRadius:"2pt",marginTop:"2pt",
    }}/>
    <div>{children}{critical && <span style={{color:BRAND.redAccent,fontWeight:700,marginLeft:"4pt"}}>⚠ CRITICAL</span>}</div>
  </div>
);

// Source-citation pill (glossary + statute references)
const Src = ({ children }) => (
  <span style={{
    display:"inline-block",fontSize:"8pt",background:BRAND.cream,color:BRAND.navy,
    padding:"1pt 5pt",borderRadius:"3pt",marginLeft:"4pt",fontWeight:600,
  }}>📖 {children}</span>
);

// Repeatable page footer
const PageFooter = ({ page, of }) => (
  <div style={{
    position:"absolute",bottom:"0.4in",left:"0.75in",right:"0.75in",
    display:"flex",justifyContent:"space-between",alignItems:"center",
    fontSize:"7.5pt",color:BRAND.muted,borderTop:"0.5pt solid #E5E7EB",paddingTop:"6pt",
  }}>
    <span>© 2026 <strong>EZtoFind.ca</strong> · Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd.</span>
    <span>Page {page} of {of}</span>
  </div>
);

// Repeatable page header (from page 2 onwards)
const PageHeader = () => (
  <div style={{
    display:"flex",justifyContent:"space-between",alignItems:"center",
    paddingBottom:"6pt",marginBottom:"12pt",borderBottom:`0.5pt solid ${BRAND.gold}`,
    fontSize:"8pt",color:BRAND.muted,
  }}>
    <span style={{fontWeight:700,color:BRAND.navy}}>BC EQUESTRIAN PROPERTY — PRE-OFFER DUE DILIGENCE</span>
    <span>Prepared by Doug LeMaire, REALTOR®</span>
  </div>
);

export default function EquestrianChecklistMockup() {
  // Sample listing so the mockup feels concrete. Real endpoint will
  // hydrate this from the CREA DDF® payload.
  const sample = {
    address: "24500 Rippington Road",
    city: "Maple Ridge",
    region: "Fraser Valley",
    mls: "R2812345",
    price: 4295000,
    lotAcres: 12.4,
    zoning: "RS-3 (Rural Residential)",
    alr: "Yes — parcel entirely within ALR",
    farmClass: "Class 9 (Farm) — currently classified",
    brokerage: "Sample BC Listing Brokerage",
  };

  return (
    <div style={{background:"#EDEEF3",minHeight:"100vh",padding:"24pt 0"}} data-testid="equestrian-checklist-mockup">
      <UnlistedMockupBanner label="Equestrian Due-Diligence Checklist"/>
      {/* Print / view toolbar — hidden in print output */}
      <div className="no-print" style={{
        maxWidth:"8.5in",margin:"0 auto 20pt",padding:"12pt 16pt",background:"white",
        borderRadius:"10pt",display:"flex",justifyContent:"space-between",alignItems:"center",
        boxShadow:"0 2px 12px rgba(15,42,91,0.10)",fontFamily:"'Inter',sans-serif",
      }}>
        <div>
          <div style={{fontSize:"9pt",color:BRAND.gold,fontWeight:700,letterSpacing:"0.1em"}}>MOCKUP · REVIEW COPY</div>
          <div style={{fontSize:"12pt",color:BRAND.navy,fontWeight:700}}>Equestrian Due-Diligence Checklist</div>
          <div style={{fontSize:"9pt",color:BRAND.muted}}>Sample rendering — final version will be personalized per listing and emailed as PDF.</div>
        </div>
        <div style={{display:"flex",gap:"8pt"}}>
          <button
            onClick={() => window.print()}
            data-testid="equestrian-checklist-print"
            style={{
              background:BRAND.navy,color:"white",border:"none",padding:"9pt 16pt",
              borderRadius:"999px",fontSize:"10pt",fontWeight:600,cursor:"pointer",
            }}
          >📄 Print / Save as PDF</button>
          <Link to="/specialties/equestrian" style={{
            padding:"9pt 14pt",borderRadius:"999px",fontSize:"10pt",fontWeight:600,
            color:BRAND.navy,textDecoration:"none",border:`1pt solid ${BRAND.navy}`,
          }}>← Back to equestrian search</Link>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
        }
      `}</style>

      {/* ═══════════ PAGE 1 — COVER ═══════════ */}
      <div className="page" style={A4}>
        <div style={{
          height:"1.2in",background:`linear-gradient(135deg, ${BRAND.navy} 0%, #1E3A8A 100%)`,
          margin:"-0.75in -0.75in 0.5in",padding:"0.4in 0.75in",
          display:"flex",justifyContent:"space-between",alignItems:"center",color:"white",
        }}>
          <div>
            <div style={{fontSize:"9pt",letterSpacing:"0.15em",color:BRAND.gold,fontWeight:700}}>EZTOFIND.CA</div>
            <div style={{fontSize:"14pt",fontFamily:"'Sora',sans-serif",fontWeight:700,marginTop:"3pt"}}>Doug LeMaire, REALTOR®</div>
            <div style={{fontSize:"9pt",opacity:0.85,marginTop:"1pt"}}>Fraser Property Management Realty Services Ltd.</div>
          </div>
          <div style={{textAlign:"right",fontSize:"9pt",lineHeight:1.4}}>
            <div>(604) 466-7021 · Brokerage</div>
            <div>(604) 787-0851 · Direct</div>
            <div>info@eztofind.ca</div>
          </div>
        </div>

        <div style={{marginTop:"0.4in"}}>
          <div style={{fontSize:"9pt",letterSpacing:"0.16em",color:BRAND.gold,fontWeight:700}}>PRE-OFFER DUE DILIGENCE</div>
          <h1 style={{
            fontSize:"32pt",fontFamily:"'Sora',sans-serif",fontWeight:800,color:BRAND.navy,
            lineHeight:1.05,margin:"6pt 0 4pt",
          }}>BC Equestrian Property<br/>Due-Diligence Checklist</h1>
          <div style={{fontSize:"12pt",color:BRAND.muted,marginTop:"8pt"}}>40-point pre-offer audit for horse-friendly acreage in British Columbia — zoning, water, septic, permits, and covenants you must verify <em>before</em> writing the offer.</div>
        </div>

        {/* Property card */}
        <div style={{
          marginTop:"0.55in",padding:"18pt 20pt",borderRadius:"8pt",
          border:`1pt solid ${BRAND.gold}`,background:BRAND.cream,
        }}>
          <div style={{fontSize:"8pt",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700,marginBottom:"4pt"}}>PROPERTY UNDER REVIEW</div>
          <div style={{fontSize:"17pt",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy}}>{sample.address}</div>
          <div style={{fontSize:"11pt",color:BRAND.ink,marginTop:"2pt"}}>{sample.city}, BC · {sample.region}</div>
          <table style={{width:"100%",marginTop:"12pt",fontSize:"10pt",borderCollapse:"collapse"}}>
            <tbody>
              <tr>
                <td style={{padding:"4pt 0",color:BRAND.muted,width:"38%"}}>MLS® number</td>
                <td style={{padding:"4pt 0",fontWeight:600}}>#{sample.mls}</td>
              </tr>
              <tr>
                <td style={{padding:"4pt 0",color:BRAND.muted}}>List price</td>
                <td style={{padding:"4pt 0",fontWeight:600}}>${sample.price.toLocaleString("en-CA")}</td>
              </tr>
              <tr>
                <td style={{padding:"4pt 0",color:BRAND.muted}}>Lot size</td>
                <td style={{padding:"4pt 0",fontWeight:600}}>{sample.lotAcres} acres</td>
              </tr>
              <tr>
                <td style={{padding:"4pt 0",color:BRAND.muted}}>Zoning</td>
                <td style={{padding:"4pt 0",fontWeight:600}}>{sample.zoning}</td>
              </tr>
              <tr>
                <td style={{padding:"4pt 0",color:BRAND.muted}}>ALR status</td>
                <td style={{padding:"4pt 0",fontWeight:600}}>{sample.alr}</td>
              </tr>
              <tr>
                <td style={{padding:"4pt 0",color:BRAND.muted}}>Farm class</td>
                <td style={{padding:"4pt 0",fontWeight:600}}>{sample.farmClass}</td>
              </tr>
              <tr>
                <td style={{padding:"4pt 0",color:BRAND.muted}}>Listing brokerage</td>
                <td style={{padding:"4pt 0",fontWeight:600}}>{sample.brokerage}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{marginTop:"0.35in",padding:"12pt 14pt",background:"#FEF3C7",borderLeft:`3pt solid ${BRAND.gold}`,borderRadius:"4pt"}}>
          <div style={{fontSize:"9pt",fontWeight:700,color:"#78350F"}}>⚠ Read this before you make an offer.</div>
          <div style={{fontSize:"9pt",color:"#78350F",marginTop:"3pt",lineHeight:1.5}}>
            Every check in this document should be verified in writing by the appropriate licensed professional (BC lawyer/notary, water-rights specialist, agricultural insurance broker, or BCFSA-licensed REALTOR®) before subject removal. This checklist is <strong>general information only</strong> — it is not legal, tax, veterinary, or property-specific advice.
          </div>
        </div>

        <PageFooter page={1} of={6}/>
      </div>

      {/* ═══════════ PAGE 2 — ZONING + ALR ═══════════ */}
      <div className="page" style={A4}>
        <PageHeader/>

        <SectionH num={1}>Zoning, ALR & Municipal Bylaw</SectionH>
        <p style={{fontSize:"9.5pt",color:BRAND.muted,marginBottom:"9pt"}}>
          Many BC equestrian properties sit inside the Agricultural Land Reserve, which restricts non-farm uses and imposes minimum-lot rules under the <em>Agricultural Land Commission Act</em>. Municipal zoning further governs how many horses per acre, boarding rights, and building setbacks.
        </p>
        <Check critical>Confirm ALR status via the BC Land Reserve parcel viewer <Src>ALC Act s.20</Src></Check>
        <Check critical>Municipal zoning code permits stables + arena on this parcel <Src>Zoning Bylaw</Src></Check>
        <Check>Number of horses permitted per acre (municipality-specific)</Check>
        <Check>Boarding of non-owner horses permitted (commercial use)?</Check>
        <Check>Minimum setbacks from property lines for barn / arena / paddock</Check>
        <Check critical>BC Assessment Farm Class 9 eligibility confirmed <Src>Assessment Act s.23</Src></Check>
        <Check>Regional Growth Strategy designation (future-use restrictions)</Check>
        <Check>Right-to-Farm Act protection status <Src>FPPA s.2</Src></Check>

        <SectionH num={2}>Water — Wells, Licences & Riparian Rights</SectionH>
        <p style={{fontSize:"9.5pt",color:BRAND.muted,marginBottom:"9pt"}}>
          A working horse operation needs 15-30 gallons of water per horse per day. BC's <em>Water Sustainability Act</em> requires a licence for any surface-water use beyond household consumption. Riparian setbacks apply within 30m of any watercourse.
        </p>
        <Check critical>Well type documented: drilled / artesian / dug — depth confirmed</Check>
        <Check critical>Certified GPM output within last 12 months (min 8 GPM for typical operation)</Check>
        <Check critical>Potability tested — bacteria, arsenic, nitrates within 6 months</Check>
        <Check>Water licence issued or required under <Src>WSA s.10</Src></Check>
        <Check>Riparian Areas Regulation compliance — setbacks documented <Src>RAR s.4</Src></Check>
        <Check>Irrigation source identified (creek / municipal / well)</Check>
        <Check>Backup water plan for freeze-up / drought</Check>

        <PageFooter page={2} of={6}/>
      </div>

      {/* ═══════════ PAGE 3 — SEPTIC + BARN PERMITS ═══════════ */}
      <div className="page" style={A4}>
        <PageHeader/>

        <SectionH num={3}>Septic, Manure & Environmental</SectionH>
        <p style={{fontSize:"9.5pt",color:BRAND.muted,marginBottom:"9pt"}}>
          BC's <em>Sewerage System Regulation</em> requires a Registered Onsite Wastewater Practitioner (ROWP) to certify septic capacity for the number of bedrooms. Manure management is subject to the <em>Code of Practice for Agricultural Environmental Management</em>.
        </p>
        <Check critical>Septic type + last inspection date (Type 1/2/3/mound) <Src>SSR</Src></Check>
        <Check>Septic capacity matches home + planned-use bedroom count</Check>
        <Check>Manure storage compliant — 30m setback from watercourse <Src>AEM Code s.12</Src></Check>
        <Check>Composting facility permitted or grandfathered</Check>
        <Check>Nearest watercourse — RAR/RAAT class documented</Check>

        <SectionH num={4}>Barn, Arena & Facility Permits</SectionH>
        <p style={{fontSize:"9.5pt",color:BRAND.muted,marginBottom:"9pt"}}>
          Structures over 10 sq m (108 sq ft) require a building permit in most BC municipalities. Unpermitted structures can trigger insurance denial and complicate resale.
        </p>
        <Check critical>Barn — building permit on file with municipality</Check>
        <Check critical>Arena — permit + structural engineer sign-off</Check>
        <Check>Arena footing type + drainage plan documented</Check>
        <Check>Stall dimensions ≥ 12'×12' (industry minimum for full-size horse)</Check>
        <Check>Round pen dimensions ≥ 60' diameter</Check>
        <Check>Loafing sheds permitted or grandfathered</Check>
        <Check>Tack room + feed room separate and secured</Check>
        <Check critical>Fire separation between barn + residence (min 30m rec.)</Check>

        <SectionH num={5}>Fencing & Enclosures</SectionH>
        <Check>Cross-fencing count and paddock layout</Check>
        <Check>Fence material — post-and-rail, wire, electric</Check>
        <Check>Perimeter fence height min 5' for horses</Check>
        <Check>Recent maintenance / repair history</Check>
        <Check>Gate widths sufficient for tractor + trailer access</Check>

        <PageFooter page={3} of={6}/>
      </div>

      {/* ═══════════ PAGE 4 — UTILITIES + ACCESS + COVENANTS ═══════════ */}
      <div className="page" style={A4}>
        <PageHeader/>

        <SectionH num={6}>Electrical Service & Utilities</SectionH>
        <Check critical>Main service ≥ 200A (100A is undersized for barn + arena)</Check>
        <Check>Barn subpanel — separate meter or sub-metered</Check>
        <Check>Outdoor arena lighting (permitted + engineered)</Check>
        <Check>Backup generator wired for well + barn</Check>
        <Check>Frost-free hydrants installed at paddocks</Check>

        <SectionH num={7}>Trailer, Access & Emergency Vet</SectionH>
        <Check>Trailer bay / covered parking present</Check>
        <Check>Truck + horse-trailer turning radius (min 50' clear)</Check>
        <Check>Emergency vet-vehicle access to barn confirmed</Check>
        <Check>Gravel or paved road access — winter passable?</Check>
        <Check>Fire-department access lane — meets local bylaw?</Check>

        <SectionH num={8}>Title, Covenants & Building Schemes</SectionH>
        <p style={{fontSize:"9.5pt",color:BRAND.muted,marginBottom:"9pt"}}>
          Restrictive covenants registered against title <strong>run with the land</strong> and cannot be removed without unanimous benefiting-owner consent. A statutory building scheme can prohibit livestock, outbuildings, or commercial farm activity even on ALR-classified land.
        </p>
        <Check critical>State-of-Title Certificate ordered — reviewed by BC lawyer/notary</Check>
        <Check critical>Restrictive covenants restricting livestock reviewed <Src>LTA s.219</Src></Check>
        <Check>Statutory Building Scheme reviewed — animal restrictions?</Check>
        <Check>Right-of-way / easement locations documented</Check>
        <Check>Charges: mortgages, judgements, builders liens cleared before completion</Check>

        <SectionH num={9}>Insurance & Ongoing Costs</SectionH>
        <Check>Rural farm insurance quotes obtained (min 2 providers)</Check>
        <Check>Barn coverage — replacement-cost basis</Check>
        <Check>Liability policy specifically covers boarding operations if applicable</Check>
        <Check>Property tax impact of Farm Class 9 loss (est. 5-15× annual increase)</Check>
        <Check>Hay + feed sourcing plan — local supplier confirmed</Check>

        <PageFooter page={4} of={6}/>
      </div>

      {/* ═══════════ PAGE 5 — REFERRAL LIST ═══════════ */}
      <div className="page" style={A4}>
        <PageHeader/>

        <SectionH num={10}>Doug's Vetted Referral List — BC Equestrian Specialists</SectionH>
        <p style={{fontSize:"9.5pt",color:BRAND.muted,marginBottom:"12pt"}}>
          Below are the specialist categories to engage before subject removal. Doug can introduce you to vetted professionals in each — call <strong style={{color:BRAND.navy}}>(604) 787-0851</strong> for a personalized referral list based on the region of the property.
        </p>

        {[
          {icon:"⚖️",title:"Agricultural Real Estate Lawyer/Notary",role:"Reviews State-of-Title Certificate, restrictive covenants, ALR compliance, Water Sustainability Act licences."},
          {icon:"📐",title:"BC Land Surveyor",role:"Confirms lot boundaries, easement locations, ALR line, and structure setbacks. Order at earliest possible stage."},
          {icon:"💧",title:"Well & Water-Rights Consultant",role:"Certifies GPM, potability, and licence eligibility under WSA. Often required as an offer subject."},
          {icon:"🔬",title:"Registered Onsite Wastewater Practitioner (ROWP)",role:"Certifies septic capacity, condition, and remaining useful life per Sewerage System Regulation."},
          {icon:"🏗️",title:"Barn / Arena Structural Inspector",role:"Engineer-level review of load capacity, footing drainage, and permit compliance. Not the same as a general home inspector."},
          {icon:"🐴",title:"Equine Veterinarian (Pre-Purchase Property Inspection)",role:"Walks the paddocks and barn for hazards, footing safety, and biosecurity risks specific to horses."},
          {icon:"🛡️",title:"Rural Farm Insurance Broker",role:"Quotes farm + livestock + liability packages. Different pricing model than urban homeowner insurance."},
          {icon:"🌱",title:"Agrologist (BC Institute of Agrologists)",role:"Farm Class 9 tax classification, soil quality, pasture rotation planning."},
          {icon:"🚚",title:"Municipal Planning Department",role:"Verifies zoning, permitted uses, and open building-permit history — free service. Get replies in writing."},
        ].map((r,i) => (
          <div key={i} style={{
            display:"flex",gap:"10pt",padding:"10pt 12pt",marginBottom:"6pt",
            borderRadius:"5pt",background: i%2===0 ? BRAND.cream : "white",
            border:`0.5pt solid ${BRAND.cream}`,
          }}>
            <div style={{fontSize:"14pt",flexShrink:0}}>{r.icon}</div>
            <div>
              <div style={{fontSize:"10.5pt",fontWeight:700,color:BRAND.navy}}>{r.title}</div>
              <div style={{fontSize:"9pt",color:BRAND.ink,marginTop:"1pt",lineHeight:1.45}}>{r.role}</div>
            </div>
          </div>
        ))}

        <PageFooter page={5} of={6}/>
      </div>

      {/* ═══════════ PAGE 6 — COMPLIANCE + CONTACT ═══════════ */}
      <div className="page" style={{...A4, pageBreakAfter:"auto"}}>
        <PageHeader/>

        <SectionH num={11}>What to Do Next</SectionH>
        <ol style={{fontSize:"10.5pt",lineHeight:1.7,paddingLeft:"18pt",margin:"6pt 0 14pt"}}>
          <li><strong>Book a 20-minute call with Doug</strong> — walk through this checklist against the specific property. Call <strong style={{color:BRAND.navy}}>(604) 787-0851</strong> or book at <strong>eztofind.ca/consultation</strong>.</li>
          <li><strong>Engage a BC lawyer + water consultant</strong> before writing your offer. The offer should include subject clauses for each critical item flagged above.</li>
          <li><strong>Order a State-of-Title Certificate</strong> from the Land Title and Survey Authority — reviews restrictive covenants and easements before subject removal.</li>
          <li><strong>Verify Farm Class 9 status in writing</strong> from BC Assessment. Losing Farm Class 9 can 5-15× your annual property tax.</li>
        </ol>

        <div style={{padding:"14pt 16pt",borderRadius:"6pt",background:BRAND.navy,color:"white",marginTop:"14pt"}}>
          <div style={{fontSize:"9pt",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700}}>YOUR NEXT STEP</div>
          <div style={{fontSize:"16pt",fontFamily:"'Sora',sans-serif",fontWeight:700,marginTop:"3pt"}}>Talk to Doug about this property.</div>
          <div style={{fontSize:"10pt",marginTop:"6pt",opacity:0.9}}>Doug LeMaire has 13 years of BC equestrian and acreage experience across Greater Vancouver, the Fraser Valley, and the Sea-to-Sky corridor. Free 20-minute consultation — no obligation.</div>
          <div style={{marginTop:"10pt",display:"flex",gap:"14pt",fontSize:"11pt",fontWeight:700}}>
            <span>📞 (604) 787-0851 (Direct)</span>
            <span>📧 info@eztofind.ca</span>
            <span>🌐 eztofind.ca</span>
          </div>
        </div>

        <SectionH num={12}>Compliance & Attribution</SectionH>
        <p style={{fontSize:"8.5pt",color:BRAND.muted,lineHeight:1.6,marginBottom:"7pt"}}>
          <strong>Prepared by:</strong> Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd., 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5. BCFSA-licensed. Phone: (604) 466-7021 (Brokerage) · (604) 787-0851 (Direct) · info@eztofind.ca.
        </p>
        <p style={{fontSize:"8.5pt",color:BRAND.muted,lineHeight:1.6,marginBottom:"7pt"}}>
          <strong>Property data source:</strong> MLS® data licensed from CREA DDF®. MLS®, Multiple Listing Service®, REALTOR® and the REALTOR® logo are trademarks owned or controlled by The Canadian Real Estate Association (CREA). Data © CREA DDF®. Doug LeMaire, REALTOR® is not the listing agent for the property shown on the cover — always confirm details with the listing brokerage before making an offer.
        </p>
        <p style={{fontSize:"8.5pt",color:BRAND.muted,lineHeight:1.6,marginBottom:"7pt"}}>
          <strong>General information only.</strong> This checklist provides educational information about typical BC equestrian property due-diligence items. It is <strong>not legal, tax, veterinary, or property-specific advice</strong>, and it is not a substitute for a licensed professional. Statute references (ALC Act, WSA, RAR, LTA, SSR, AEM Code) are for guidance only — always verify against the current in-force text.
        </p>
        <p style={{fontSize:"8.5pt",color:BRAND.muted,lineHeight:1.6,marginBottom:"7pt"}}>
          <strong>Privacy (PIPA BC):</strong> Your email was collected under BC's Personal Information Protection Act to deliver this checklist. You may withdraw consent at any time — info@eztofind.ca. Full policy at eztofind.ca/privacy.
        </p>
        <p style={{fontSize:"8pt",color:BRAND.muted,lineHeight:1.6,marginTop:"12pt"}}>
          © 2026 Doug LeMaire. EZtoFind.ca™ and Doogie™ are trademarks. Copyright registered with the Canadian Intellectual Property Office (Registration No. 1247822). Reproduction, redistribution, or use in AI-training datasets is prohibited without written permission.
        </p>

        <PageFooter page={6} of={6}/>
      </div>
    </div>
  );
}
