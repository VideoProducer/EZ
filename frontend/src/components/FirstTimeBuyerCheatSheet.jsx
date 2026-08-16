// First-Time Home Buyer Grant & Tax Rebate Cheat-Sheet — print-ready mockup.
//
// Highest-volume search intent in BC real estate. Same print-styled PDF
// approach as EquestrianChecklistMockup — Doug reviews the layout, we then
// wire it as an email-gated download once approved.
import React from "react";
import { Link } from "react-router-dom";
import UnlistedMockupBanner from "./UnlistedMockupBanner";

const BRAND = {
  navy: "#0F2A5B",
  gold: "#F5A623",
  cream: "#F5F0E1",
  ink: "#1F2937",
  muted: "#6B7280",
  green: "#059669",
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

const ProgramCard = ({ tag, title, savings, gov, body, eligibility, howto }) => (
  <div style={{
    border:`1pt solid ${BRAND.cream}`,borderRadius:"6pt",padding:"12pt 14pt",
    marginBottom:"10pt",background:"white",breakInside:"avoid",
  }}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12pt"}}>
      <div style={{flex:1}}>
        <div style={{display:"inline-block",padding:"1pt 6pt",background:gov==="Federal"?"#DBEAFE":"#FEF3C7",color:gov==="Federal"?"#1E40AF":"#78350F",borderRadius:"3pt",fontSize:"7.5pt",fontWeight:700,letterSpacing:"0.08em"}}>{gov.toUpperCase()} · {tag}</div>
        <div style={{fontSize:"13pt",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy,marginTop:"4pt",lineHeight:1.2}}>{title}</div>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:"7pt",color:BRAND.muted,letterSpacing:"0.1em",fontWeight:700}}>MAX SAVINGS</div>
        <div style={{fontSize:"15pt",fontFamily:"'Sora',sans-serif",fontWeight:800,color:BRAND.green,lineHeight:1}}>{savings}</div>
      </div>
    </div>
    <div style={{fontSize:"9.5pt",color:BRAND.ink,marginTop:"7pt",lineHeight:1.55}}>{body}</div>
    <div style={{marginTop:"8pt",fontSize:"9pt",color:BRAND.muted}}>
      <div><strong style={{color:BRAND.navy}}>Who qualifies:</strong> {eligibility}</div>
      <div style={{marginTop:"3pt"}}><strong style={{color:BRAND.navy}}>How to claim:</strong> {howto}</div>
    </div>
  </div>
);

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

const PageHeader = () => (
  <div style={{
    display:"flex",justifyContent:"space-between",alignItems:"center",
    paddingBottom:"6pt",marginBottom:"12pt",borderBottom:`0.5pt solid ${BRAND.gold}`,
    fontSize:"8pt",color:BRAND.muted,
  }}>
    <span style={{fontWeight:700,color:BRAND.navy}}>BC FIRST-TIME BUYER — GRANT & TAX REBATE CHEAT-SHEET</span>
    <span>Prepared by Doug LeMaire, REALTOR®</span>
  </div>
);

export default function FirstTimeBuyerCheatSheet() {
  return (
    <div style={{background:"#EDEEF3",minHeight:"100vh",padding:"24pt 0"}} data-testid="first-time-buyer-mockup">
      <UnlistedMockupBanner label="First-Time Buyer Grant & Rebate Cheat-Sheet"/>
      <div className="no-print" style={{
        maxWidth:"8.5in",margin:"0 auto 20pt",padding:"12pt 16pt",background:"white",
        borderRadius:"10pt",display:"flex",justifyContent:"space-between",alignItems:"center",
        boxShadow:"0 2px 12px rgba(15,42,91,0.10)",fontFamily:"'Inter',sans-serif",
      }}>
        <div>
          <div style={{fontSize:"9pt",color:BRAND.gold,fontWeight:700,letterSpacing:"0.1em"}}>MOCKUP · REVIEW COPY</div>
          <div style={{fontSize:"12pt",color:BRAND.navy,fontWeight:700}}>First-Time Buyer Grant & Rebate Cheat-Sheet</div>
          <div style={{fontSize:"9pt",color:BRAND.muted}}>Sample rendering — final version will personalize savings estimates from the buyer's inputs.</div>
        </div>
        <div style={{display:"flex",gap:"8pt"}}>
          <button onClick={() => window.print()} data-testid="fthb-checksheet-print" style={{background:BRAND.navy,color:"white",border:"none",padding:"9pt 16pt",borderRadius:"999px",fontSize:"10pt",fontWeight:600,cursor:"pointer"}}>📄 Print / Save as PDF</button>
          <Link to="/" style={{padding:"9pt 14pt",borderRadius:"999px",fontSize:"10pt",fontWeight:600,color:BRAND.navy,textDecoration:"none",border:`1pt solid ${BRAND.navy}`}}>← Back to home</Link>
        </div>
      </div>

      <style>{`
        @media print { body { background: white !important; } .no-print { display: none !important; } .page { box-shadow: none !important; margin: 0 !important; page-break-after: always; } }
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
          <div style={{fontSize:"9pt",letterSpacing:"0.16em",color:BRAND.gold,fontWeight:700}}>2026 EDITION · UPDATED FEB 2026</div>
          <h1 style={{
            fontSize:"32pt",fontFamily:"'Sora',sans-serif",fontWeight:800,color:BRAND.navy,
            lineHeight:1.05,margin:"6pt 0 4pt",
          }}>BC First-Time Buyer<br/>Grants & Tax Rebates</h1>
          <div style={{fontSize:"12pt",color:BRAND.muted,marginTop:"8pt"}}>Every program a first-time buyer in British Columbia can stack — up to <strong style={{color:BRAND.green}}>$44,000+</strong> in combined savings — with exact thresholds, eligibility, and how to claim.</div>
        </div>

        {/* Big Number */}
        <div style={{
          marginTop:"0.5in",padding:"22pt 24pt",borderRadius:"8pt",background:BRAND.navy,color:"white",
        }}>
          <div style={{fontSize:"9pt",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700}}>SAMPLE SAVINGS · $750K PURCHASE</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:"6pt",flexWrap:"wrap",gap:"14pt"}}>
            <div>
              <div style={{fontSize:"40pt",fontFamily:"'Sora',sans-serif",fontWeight:800,lineHeight:1}}>$44,410</div>
              <div style={{fontSize:"10pt",opacity:0.85,marginTop:"3pt"}}>Combined federal + BC savings for a qualifying first-time buyer</div>
            </div>
            <table style={{fontSize:"9pt",color:"white",borderCollapse:"collapse",flex:"0 0 auto"}}>
              <tbody>
                <tr><td style={{padding:"2pt 8pt 2pt 0",opacity:0.75}}>BC PTT Exemption</td><td style={{padding:"2pt 0",textAlign:"right",fontWeight:700}}>$13,000</td></tr>
                <tr><td style={{padding:"2pt 8pt 2pt 0",opacity:0.75}}>HBP (2 buyers)</td><td style={{padding:"2pt 0",textAlign:"right",fontWeight:700}}>$120,000*</td></tr>
                <tr><td style={{padding:"2pt 8pt 2pt 0",opacity:0.75}}>FHSA (5 yrs, 2 buyers)</td><td style={{padding:"2pt 0",textAlign:"right",fontWeight:700}}>$80,000*</td></tr>
                <tr><td style={{padding:"2pt 8pt 2pt 0",opacity:0.75}}>Federal HBTC</td><td style={{padding:"2pt 0",textAlign:"right",fontWeight:700}}>$1,500</td></tr>
                <tr><td colSpan={2} style={{padding:"3pt 0 0",fontSize:"7pt",opacity:0.7}}>* HBP + FHSA are withdrawal capacity, not straight savings</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{marginTop:"0.35in",padding:"12pt 14pt",background:BRAND.cream,borderLeft:`3pt solid ${BRAND.gold}`,borderRadius:"4pt"}}>
          <div style={{fontSize:"10pt",fontWeight:700,color:BRAND.navy}}>✓ Who is a "first-time buyer" in BC?</div>
          <div style={{fontSize:"9pt",color:BRAND.ink,marginTop:"3pt",lineHeight:1.5}}>
            Each program defines "first-time" differently. For the BC Property Transfer Tax exemption, you must be a Canadian citizen or permanent resident, have lived in BC ≥12 months (or filed 2 BC tax returns in 6 yrs), never owned a principal residence anywhere in the world, and never received this exemption before. For federal programs (HBP, FHSA, HBTC), you must not have owned a home you occupied in the current or previous 4 calendar years.
          </div>
        </div>

        <div style={{marginTop:"0.3in",fontSize:"9pt",color:BRAND.muted}}>
          <strong style={{color:BRAND.navy}}>What's inside:</strong> BC Property Transfer Tax Exemption · Newly Built Home Exemption · Federal Home Buyers' Plan · First Home Savings Account · Home Buyers' Tax Credit · GST New Housing Rebate · BC Home Owner Grant · CMHC insurance rules · How to stack them all.
        </div>

        <PageFooter page={1} of={5}/>
      </div>

      {/* ═══════════ PAGE 2 — BC PROVINCIAL PROGRAMS ═══════════ */}
      <div className="page" style={A4}>
        <PageHeader/>
        <div style={{marginBottom:"12pt"}}>
          <div style={{fontSize:"7.5pt",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700}}>SECTION 1</div>
          <div style={{fontSize:"18pt",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy}}>British Columbia Programs</div>
        </div>

        <ProgramCard
          gov="Provincial" tag="PTT EXEMPTION"
          title="BC First-Time Home Buyers' Exemption (FTHB)"
          savings="$13,000"
          body="Waives BC Property Transfer Tax on homes ≤ $835,000. Partial exemption phased out from $835,001 to $860,000. On a qualifying $750K purchase, you save the full PTT bill (~$13,000)."
          eligibility="Canadian citizen or PR · lived in BC ≥12 months OR filed 2 BC tax returns in last 6 yrs · never owned a principal residence anywhere · fair-market-value at or under the cap."
          howto="Your notary or lawyer files the FIN 269 form at closing — the exemption is applied automatically. Bring proof of BC residency (driver's licence, BC Services Card)."
        />

        <ProgramCard
          gov="Provincial" tag="PTT EXEMPTION"
          title="Newly Built Home Exemption"
          savings="$20,000"
          body="Full PTT exemption on newly built homes ≤ $1,100,000 (partial phased out to $1,150,000). Stackable with First-Time Buyers' Exemption only if the home also qualifies under FTHB — most new construction is used for one or the other."
          eligibility="Home must be newly built (never previously occupied) · you'll use it as your principal residence for at least one year · fair-market-value at or under the cap."
          howto="Notary files FIN 271 at closing. Keep the builder's Statement of Adjustments — CRA can request proof of new-build status up to 6 years later."
        />

        <ProgramCard
          gov="Provincial" tag="ANNUAL GRANT"
          title="BC Home Owner Grant"
          savings="$570-770/yr"
          body="Annual property-tax rebate: $570 in Metro Vancouver, Fraser Valley + Capital Region; $770 elsewhere in BC. Property must be your principal residence. Grant is reduced $5 for every $1,000 of assessed value above $2.15M threshold."
          eligibility="Canadian citizen or PR · principal residence in BC · assessed value under $2.65M (Metro) or $2.85M (rest of BC)."
          howto="Apply online at gov.bc.ca/homeownergrant every year AFTER receiving the property tax notice (usually late May). Yes — you have to reapply annually."
        />

        <PageFooter page={2} of={5}/>
      </div>

      {/* ═══════════ PAGE 3 — FEDERAL PROGRAMS ═══════════ */}
      <div className="page" style={A4}>
        <PageHeader/>
        <div style={{marginBottom:"12pt"}}>
          <div style={{fontSize:"7.5pt",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700}}>SECTION 2</div>
          <div style={{fontSize:"18pt",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy}}>Federal Programs</div>
        </div>

        <ProgramCard
          gov="Federal" tag="RRSP WITHDRAWAL"
          title="Home Buyers' Plan (HBP)"
          savings="$60K per person"
          body="Withdraw up to $60,000 from your RRSP tax-free toward a first home. A couple can withdraw $120K combined. You must repay the amount over 15 years starting the 2nd year after withdrawal — missed repayments become taxable income."
          eligibility="Must have not owned a home you occupied in the current or previous 4 calendar years · you must plan to live in the home within 1 year · funds must have been in the RRSP ≥90 days."
          howto="File Form T1036 with your RRSP issuer before withdrawal. Repayment tracked on Line 24600 of your annual T1. Keep records for 15 years."
        />

        <ProgramCard
          gov="Federal" tag="TAX-FREE ACCOUNT"
          title="First Home Savings Account (FHSA)"
          savings="$40K lifetime / $8K per year"
          body="Best of both worlds: RRSP-style tax-deductible contributions AND TFSA-style tax-free withdrawals. Contribute $8,000/year up to $40K lifetime. Withdrawals for a qualifying home purchase are fully tax-free — never repaid. Can be combined with HBP."
          eligibility="Canadian resident aged 18-71 · you or your spouse haven't owned a home you occupied in current or prior 4 calendar years · account open ≤15 years."
          howto="Open an FHSA at any major bank or discount broker. Contribution deadline is Dec 31 (not the RRSP March deadline). Withdraw via Form RC725 at purchase."
        />

        <ProgramCard
          gov="Federal" tag="TAX CREDIT"
          title="Home Buyers' Tax Credit (HBTC)"
          savings="$1,500"
          body="Non-refundable federal tax credit: $10,000 × 15% federal rate = $1,500 back on your income tax. If both spouses qualify, the total $1,500 can be split any way but not doubled."
          eligibility="Same 4-year rule as HBP/FHSA · home closes in the tax year you claim · you and/or spouse are the buyers."
          howto="Claim on Line 31270 of your T1 in the year of purchase. No separate form — just check the box and include the closing date."
        />

        <ProgramCard
          gov="Federal" tag="GST REBATE"
          title="GST/HST New Housing Rebate"
          savings="up to $6,300"
          body="Rebates 36% of the 5% GST paid on new construction ≤$350K (max $6,300); phased out between $350K-$450K; zero above $450K. Applies to newly built homes AND substantial renovations. Vancouver / Fraser Valley new-build market rarely qualifies given prices — check with your builder if the price is under $450K."
          eligibility="Home is a newly built or substantially renovated principal residence · purchase price below $450K for any rebate."
          howto="Builder usually applies the rebate directly at closing (paperwork Form GST190). If you paid the full GST, file Form GST191 within 2 years."
        />

        <PageFooter page={3} of={5}/>
      </div>

      {/* ═══════════ PAGE 4 — HOW TO STACK ═══════════ */}
      <div className="page" style={A4}>
        <PageHeader/>
        <div style={{marginBottom:"12pt"}}>
          <div style={{fontSize:"7.5pt",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700}}>SECTION 3</div>
          <div style={{fontSize:"18pt",fontFamily:"'Sora',sans-serif",fontWeight:700,color:BRAND.navy}}>How to Stack Every Program</div>
        </div>

        <div style={{marginBottom:"12pt",padding:"12pt 14pt",borderRadius:"5pt",background:BRAND.cream}}>
          <div style={{fontSize:"11pt",fontWeight:700,color:BRAND.navy,marginBottom:"6pt"}}>The 5-step stacking playbook</div>
          <ol style={{margin:"0 0 0 18pt",fontSize:"10pt",lineHeight:1.65}}>
            <li><strong>Open an FHSA the calendar year before you plan to buy.</strong> Even $8K in the account for a few months protects your tax status. Fill it before Dec 31.</li>
            <li><strong>Contribute to your RRSP ≥90 days before writing your offer.</strong> Otherwise the funds cannot qualify for HBP withdrawal. If time-pressed, focus FHSA first.</li>
            <li><strong>Bank your BC residency early.</strong> The PTT exemption requires 12 months of BC residency OR 2 BC tax returns filed in the last 6 years — don't leave this to the last month.</li>
            <li><strong>Time the closing to match tax-year benefits.</strong> HBTC ($1,500) applies in the tax year of closing — closing in December means you claim it 3 months later on your T1 instead of 15 months.</li>
            <li><strong>Apply for the Home Owner Grant every May.</strong> Missing the annual deadline = paying the full property tax bill. Set a calendar reminder.</li>
          </ol>
        </div>

        <div style={{marginTop:"14pt"}}>
          <div style={{fontSize:"11pt",fontWeight:700,color:BRAND.navy,marginBottom:"6pt"}}>Common stacking mistakes</div>
          <table style={{width:"100%",fontSize:"9.5pt",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:BRAND.navy,color:"white"}}>
                <th style={{padding:"6pt 8pt",textAlign:"left"}}>Mistake</th>
                <th style={{padding:"6pt 8pt",textAlign:"left"}}>Cost</th>
                <th style={{padding:"6pt 8pt",textAlign:"left"}}>Fix</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Buying home > $860K assuming you'll still get partial PTT exemption","Up to $13,000","Structure offer at $835K or find qualifying price band"],
                ["Withdrawing RRSP funds contributed in the last 90 days","Full withdrawal becomes taxable","Wait 90 days OR use FHSA instead"],
                ["Missing the annual Home Owner Grant deadline","$570-770/yr","Auto-file each May — set calendar alert"],
                ["Assuming Newly Built + First-Time exemptions stack","One is disqualified","Pick the one that saves more — usually FTHB up to $835K"],
                ["Forgetting to open FHSA before Dec 31","Lose 1 year of $8K contribution room","Open by Dec 31 even with just $100"],
              ].map((row, i) => (
                <tr key={i} style={{background: i%2===0 ? "white" : BRAND.cream}}>
                  <td style={{padding:"6pt 8pt",verticalAlign:"top"}}>{row[0]}</td>
                  <td style={{padding:"6pt 8pt",verticalAlign:"top",color:BRAND.green,fontWeight:700}}>{row[1]}</td>
                  <td style={{padding:"6pt 8pt",verticalAlign:"top",color:BRAND.muted}}>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PageFooter page={4} of={5}/>
      </div>

      {/* ═══════════ PAGE 5 — NEXT STEPS + COMPLIANCE ═══════════ */}
      <div className="page" style={{...A4, pageBreakAfter:"auto"}}>
        <PageHeader/>

        <div style={{padding:"18pt 20pt",borderRadius:"6pt",background:BRAND.navy,color:"white"}}>
          <div style={{fontSize:"9pt",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700}}>YOUR NEXT STEP</div>
          <div style={{fontSize:"18pt",fontFamily:"'Sora',sans-serif",fontWeight:700,marginTop:"3pt",lineHeight:1.15}}>Book a 20-minute First-Time Buyer strategy call with Doug.</div>
          <div style={{fontSize:"10pt",marginTop:"7pt",opacity:0.9,lineHeight:1.6}}>
            Doug will walk you through which programs stack for your specific situation, connect you with a first-time-buyer-friendly mortgage broker who understands BC's foreign-buyer and speculation-tax rules, and help you build a realistic timeline from FHSA opening to keys-in-hand.
          </div>
          <div style={{marginTop:"12pt",display:"flex",gap:"14pt",fontSize:"11pt",fontWeight:700,flexWrap:"wrap"}}>
            <span>📞 (604) 787-0851</span>
            <span>📧 info@eztofind.ca</span>
            <span>🌐 eztofind.ca/consultation</span>
          </div>
        </div>

        <div style={{marginTop:"18pt"}}>
          <div style={{fontSize:"11pt",fontWeight:700,color:BRAND.navy,marginBottom:"6pt"}}>Recommended reading on EZtoFind.ca</div>
          <ul style={{fontSize:"10pt",lineHeight:1.65,paddingLeft:"18pt"}}>
            <li>Glossary — <strong>Property Transfer Tax</strong>, <strong>First-Time Home Buyers' Exemption</strong>, <strong>FHSA</strong>, <strong>CMHC Insurance</strong>, <strong>Deposit vs. Down Payment</strong></li>
            <li>Buyer's Guide — <em>10 Steps From Pre-Approval to Keys</em></li>
            <li>Community pages — median list price, days-on-market, and community walkability scores across 239 BC communities</li>
          </ul>
        </div>

        <div style={{marginTop:"16pt"}}>
          <div style={{fontSize:"7.5pt",letterSpacing:"0.14em",color:BRAND.gold,fontWeight:700}}>COMPLIANCE & ATTRIBUTION</div>
          <p style={{fontSize:"8.5pt",color:BRAND.muted,lineHeight:1.6,marginTop:"4pt"}}>
            <strong>Prepared by:</strong> Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd., 1 – 22374 Lougheed Hwy, Maple Ridge, BC V2X 2T5. BCFSA-licensed. (604) 466-7021 · (604) 787-0851 · info@eztofind.ca.
          </p>
          <p style={{fontSize:"8.5pt",color:BRAND.muted,lineHeight:1.6,marginTop:"6pt"}}>
            <strong>General information only.</strong> Program thresholds, eligibility rules, and rebate caps change frequently. Amounts shown were current as of February 2026. This cheat-sheet is not tax, legal, or financial advice — always confirm your specific eligibility with the BC Ministry of Finance, Canada Revenue Agency, and a licensed tax professional before relying on any figure. Statute references (Property Transfer Tax Act, Income Tax Act, Excise Tax Act) are for guidance only.
          </p>
          <p style={{fontSize:"8.5pt",color:BRAND.muted,lineHeight:1.6,marginTop:"6pt"}}>
            <strong>Privacy (PIPA BC):</strong> Your email was collected under BC's Personal Information Protection Act solely to deliver this document. Withdraw consent at info@eztofind.ca. Full privacy policy at eztofind.ca/privacy.
          </p>
          <p style={{fontSize:"8pt",color:BRAND.muted,lineHeight:1.6,marginTop:"10pt"}}>
            © 2026 Doug LeMaire. EZtoFind.ca™ and Doogie™ are trademarks. Copyright registered with the Canadian Intellectual Property Office (Registration No. 1247822).
          </p>
        </div>

        <PageFooter page={5} of={5}/>
      </div>
    </div>
  );
}
