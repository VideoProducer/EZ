import React from "react";
import { Helmet } from "react-helmet-async";

// South Okanagan Hobby-Farm Zoning Research (Feb 2026)
// -----------------------------------------------------
// Standalone printable research report served at /research/south-okanagan-hobby-farms.
// Not linked from footer / nav / sitemap (kept as a "share the URL" resource Doug
// hands to buyer clients). Print button uses window.print() with a print stylesheet
// scoped to this component so the page prints as a clean PDF via the browser's
// native "Save as PDF" dialog.
export default function HobbyFarmResearch() {
  return (
    <div className="hf-research">
      <Helmet>
        <title>South Okanagan Hobby-Farm Zoning Research — EZtoFind.ca</title>
        <meta name="description" content="Non-ALR residential and rural zones that permit hobby-farm livestock in Penticton, Oliver, and Osoyoos. Current bylaw citations, updated February 2026."/>
        <meta name="robots" content="noindex,nofollow"/>
      </Helmet>

      <style>{`
        .hf-research { max-width: 900px; margin: 2rem auto; padding: 2rem 2.5rem 4rem;
          font-family: 'Inter', system-ui, sans-serif; color: #0B1930; line-height: 1.65; }
        .hf-research h1 { font-family: 'Fraunces', Georgia, serif; font-size: 2.2rem;
          color: #0F2A5B; border-bottom: 3px solid #F5A623; padding-bottom: 0.5rem; margin-bottom: 0.35rem; }
        .hf-research h2 { font-family: 'Fraunces', Georgia, serif; color: #0F2A5B;
          margin-top: 2.5rem; font-size: 1.6rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.4rem; }
        .hf-research h3 { color: #1E4FCF; margin-top: 1.75rem; font-size: 1.2rem; }
        .hf-research h4 { color: #0F2A5B; margin-top: 1.25rem; font-size: 1.05rem; }
        .hf-research .subtitle { color: #5B6B85; font-size: 0.95rem; margin-bottom: 0.35rem; }
        .hf-research .stamp { color: #5B6B85; font-size: 0.82rem; margin-bottom: 2rem; }
        .hf-research .cta { position: fixed; top: 1rem; right: 1rem; z-index: 200; }
        .hf-research .btn { background: #0F2A5B; color: white; padding: 0.7rem 1.3rem;
          border-radius: 8px; border: none; font-size: 0.9rem; font-weight: 600; cursor: pointer;
          box-shadow: 0 6px 20px rgba(15,42,91,0.25); }
        .hf-research .btn:hover { background: #1E4FCF; }
        .hf-research .warning { background: #FEF3C7; border-left: 4px solid #F59E0B;
          padding: 1rem 1.25rem; margin: 1.25rem 0; border-radius: 6px; font-size: 0.92rem; }
        .hf-research .notice-blue { background: #DBEAFE; border-left: 4px solid #2563EB;
          padding: 1rem 1.25rem; margin: 1.25rem 0; border-radius: 6px; font-size: 0.92rem; }
        .hf-research table { width: 100%; border-collapse: collapse; margin: 1rem 0;
          font-size: 0.88rem; }
        .hf-research th { background: #F5F0E1; color: #0F2A5B; padding: 0.65rem;
          text-align: left; border: 1px solid #D4AF37; font-weight: 700; }
        .hf-research td { padding: 0.55rem 0.65rem; border: 1px solid #E5E7EB;
          vertical-align: top; }
        .hf-research tr:nth-child(even) td { background: #FAFBFC; }
        .hf-research ul, .hf-research ol { padding-left: 1.35rem; margin: 0.5rem 0 1rem; }
        .hf-research li { margin: 0.35rem 0; }
        .hf-research a { color: #1E4FCF; text-decoration: underline; }
        .hf-research .medal { font-size: 1.35rem; margin-right: 0.5rem; }
        .hf-research .rank { border: 1px solid #E5E7EB; border-radius: 10px;
          padding: 1.25rem 1.5rem; margin: 1.25rem 0; background: #fff; }
        .hf-research .disclaimer { margin-top: 3rem; padding-top: 1.5rem;
          border-top: 2px solid #F5A623; font-size: 0.82rem; color: #5B6B85; }
        .hf-research .contacts { background: #F9FAFB; border-radius: 8px;
          padding: 1rem 1.25rem; font-size: 0.9rem; }
        @media print {
          .hf-research { max-width: 100%; margin: 0; padding: 1rem; font-size: 11pt; }
          .hf-research .cta { display: none !important; }
          .hf-research h1 { font-size: 20pt; }
          .hf-research h2 { font-size: 16pt; page-break-before: auto; }
          .hf-research h3 { font-size: 13pt; }
          .hf-research a { color: #0F2A5B; text-decoration: none; }
          .hf-research a::after { content: " (" attr(href) ")"; font-size: 8pt; color: #5B6B85; word-break: break-all; }
          .hf-research .rank, .hf-research .warning, .hf-research .notice-blue { page-break-inside: avoid; }
          .hf-research table { page-break-inside: avoid; font-size: 8pt; }
        }
      `}</style>

      <div className="cta">
        <button className="btn" onClick={() => window.print()} data-testid="hf-print-btn">🖨️ Print / Save as PDF</button>
      </div>

      <h1 data-testid="hf-title">South Okanagan Hobby-Farm Zoning Research</h1>
      <div className="subtitle">Non-ALR residential and rural zones that permit animal-keeping in Penticton, Oliver, and Osoyoos</div>
      <div className="stamp">Prepared February 2026 · Verified against current consolidated bylaws · Compiled by EZtoFind.ca for buyer reference</div>

      <div className="warning">
        <strong>Read this first.</strong> Zoning designation and Agricultural Land Reserve (ALR) status are two independent legal layers. A parcel can be zoned "Agriculture" and NOT be in the ALR. A parcel can be zoned "Residential" and still be in the ALR. Both must be verified for every property. Verification tools: <a href="https://www.alc.gov.bc.ca/alc/content/alr-maps">BC Agricultural Land Commission ALR map</a> · <a href="https://ltsa.ca/property-owners/title-searches/">Land Title and Survey Authority title search</a>.
      </div>

      {/* ============ MASTER TABLE ============ */}
      <h2>1. Master Comparison — Zones That May Permit Animal Keeping</h2>
      <div style={{overflowX:"auto"}}>
        <table data-testid="hf-master-table">
          <thead><tr>
            <th>Municipality</th><th>Zone</th><th>Zone Name</th><th>Min. Parcel</th>
            <th>Horses</th><th>Chickens</th><th>Other Livestock</th><th>Hobby Farm?</th>
            <th>Sec. Suite</th><th>Carriage House</th><th>Outside ALR?</th>
          </tr></thead>
          <tbody>
            <tr><td>Penticton</td><td><strong>FG</strong></td><td>Forestry &amp; Grazing (§9.1)</td><td>16 ha</td>
              <td>✅ Yes (§9.1.1.5)</td><td>🟡 Via "ag use"</td><td>🟡 Via "ag use"</td><td>✅</td>
              <td>✅</td><td>✅ 1 per parcel</td><td>⚠️ Verify — often overlaps ALR</td></tr>
            <tr><td>Penticton</td><td><strong>A</strong></td><td>Agriculture (§9.2)</td><td>2.0 ha</td>
              <td>✅ Yes (§9.2.1.4)</td><td>✅ Yes (poultry)</td><td>✅ Yes</td><td>✅</td>
              <td>✅</td><td>✅ 1 per parcel</td><td>⚠️ Most is IN ALR — verify</td></tr>
            <tr><td>Penticton</td><td><strong>RC</strong></td><td>Country Residential Housing (§9.3)</td><td>0.4 ha</td>
              <td>🟡 Ambiguous — stable not listed</td><td>🟡 Urban Hens permit (§7.7)</td><td>🟡 Via "ag use"</td><td>🟡 Small-scale</td>
              <td>✅</td><td>✅</td><td>✅ Usually outside ALR</td></tr>
            <tr><td>Penticton</td><td>R2 / R4-L / R4-S</td><td>Urban Residential</td><td>280–560 m²</td>
              <td>❌</td><td>✅ Urban Hens (max 4)</td><td>❌</td><td>❌</td><td>✅</td><td>✅</td><td>✅ Always outside ALR</td></tr>
            <tr><td>Oliver (Town)</td><td colSpan="10"><strong>Zoning Bylaw No. 1423</strong> (adopted, current 2025-26, consolidated Nov 2025). Rural residential zone codes and livestock rules require direct verification with Oliver Planning: 250-485-6200.</td></tr>
            <tr><td>Oliver (RDOS Area C)</td><td>SH / RA</td><td>Rural zones (Bylaw 2453)</td><td>Varies</td>
              <td>✅ Yes (livestock incl. horses)</td><td>✅ (max 25 on ≤0.4 ha)</td><td>✅ 1 animal / 0.4 ha on ≤2 ha</td><td>✅</td>
              <td>Varies</td><td>Varies</td><td>✅ Many parcels non-ALR — verify each</td></tr>
            <tr><td>Osoyoos</td><td><strong>AG</strong></td><td>Agriculture (Bylaw 1395, adopted 2024)</td><td>Max 4.0 ha</td>
              <td>✅ Yes (equestrian centre)</td><td>✅ Yes — ONLY in AG</td><td>✅ Yes (all livestock)</td><td>✅</td>
              <td>✅ (new in 1395)</td><td>✅ Accessory dwelling</td><td>⚠️ Most is IN ALR — verify</td></tr>
            <tr><td>Osoyoos</td><td>RS1 / other residential</td><td>Residential zones</td><td>Urban lots</td>
              <td>❌</td><td>❌ Prohibited outside AG under Bylaw 1395</td><td>❌</td><td>❌</td><td>✅</td><td>✅</td><td>✅ Always outside ALR</td></tr>
          </tbody>
        </table>
      </div>

      {/* ============ RANKING ============ */}
      <h2>2. Best Non-ALR Zones for Hobby Farms — Ranked</h2>
      <p>For a buyer wanting horses, chickens, goats, sheep, alpacas, llamas, gardens, orchards, and rural lifestyle <strong>outside the ALR</strong>:</p>

      <div className="rank">
        <h3><span className="medal">🥇</span>#1 — Penticton RC (Country Residential Housing)</h3>
        <p><strong>Bylaw:</strong> <a href="https://www.penticton.ca/sites/default/files/uploads/bylaws/Zoning%20Bylaw%202024-22%20(Consolidated%20May%202025).pdf">Zoning Bylaw No. 2024-22, Consolidated May 2025</a> — Section 9.3. Latest amendment: Schedule B map amendment via Bylaw 2026-16 (April 2026, map only).</p>
        <p><strong>Why:</strong></p>
        <ul>
          <li>Minimum 0.4 ha (~1 acre); larger parcels common in West Bench, Sage Mesa, upper Wiltse</li>
          <li>"Agricultural use" listed as a permitted principal use (§9.3.1.2)</li>
          <li>Secondary suite AND carriage house both permitted as-of-right (3 dwelling units per parcel now enabled under SSMUH)</li>
          <li>Rural home occupation, major/minor home occupations all permitted (§9.3.1.5, 9.3.1.6, 9.3.1.8)</li>
          <li><strong>Predominantly located OUTSIDE the ALR</strong> — this is Penticton's rural-residential fringe</li>
        </ul>
        <p><strong>Caveats:</strong></p>
        <ul>
          <li>"Animal kennels and stable" is <strong>NOT explicitly listed</strong> as a permitted use in RC (unlike A and FG). Horses fall into a legal grey zone.</li>
          <li>Chickens require the Urban Hens permit (§7.7) — max 4 hens per lot on single-detached properties</li>
          <li>Goats, sheep, cattle rely on the broad "agricultural use" umbrella</li>
        </ul>
        <p><strong>Recommendation:</strong> Best non-ALR hobby-farm zone in the region for parcels under 5 acres. Write your offer subject to a <em>written zoning-confirmation letter from Penticton Planning</em> naming your specific animals and numbers.</p>
      </div>

      <div className="rank">
        <h3><span className="medal">🥈</span>#2 — RDOS Electoral Area C Rural Zones (Oliver rural fringe)</h3>
        <p><strong>Bylaw:</strong> <a href="https://www.rdos.bc.ca/assets/bylaws/planning/AreaC/2452A.pdf">RDOS Electoral Area C Zoning Bylaw No. 2453</a> (consolidated 2016; still current in 2026). RDOS has amendments in progress — see <a href="https://www.rdos.bc.ca/development-services/planning/strategic-projects/livestock/">RDOS Livestock Strategic Project</a>.</p>
        <p><strong>Why:</strong></p>
        <ul>
          <li>Clearest livestock rules of any bylaw in the region: <strong>1 animal per 0.4 ha</strong> on parcels ≤2.0 ha; <strong>max 25 poultry/fur-bearing animals</strong> on parcels ≤0.4 ha</li>
          <li>Livestock explicitly defined to include horses, cattle, sheep, swine, goats, poultry</li>
          <li>Multiple rural zones (SH — Small Holdings; RA — Rural Agricultural)</li>
          <li>Many Area C parcels are outside the ALR — verify per-parcel via ALC map</li>
        </ul>
        <p><strong>Caveats:</strong></p>
        <ul>
          <li>Outside incorporated Town of Oliver — well water, septic, gravel road maintenance, RCMP dispatch times, no municipal garbage pickup</li>
          <li>Some Area-C zoning IS inside the ALR (much of the valley bottom around Oliver is ALR)</li>
          <li>Bylaw 2453 is under review — RDOS Livestock Project may amend animal density rules in 2026-2027</li>
        </ul>
        <p><strong>Recommendation:</strong> Excellent for buyers who want acreage with predictable, transparent animal rules and are OK with rural services. Verify the exact zone code (SH is optimal for hobby farms), pull an ALR search, and check RDOS Livestock Project status before making an offer.</p>
      </div>

      <div className="rank">
        <h3><span className="medal">🥉</span>#3 — Town of Oliver Rural Zones (Bylaw 1423)</h3>
        <p><strong>Bylaw:</strong> <a href="https://www.oliver.ca/planning">Town of Oliver Zoning Bylaw No. 1423</a>, consolidated Nov 2025 (<a href="https://www.oliver.civikit.com/sites/3/files/2025-11/OCPZ%202025-11.pdf">OCPZ 2025-11 consolidation</a>). Current as of Feb 2026, updated for SSMUH housing legislation.</p>
        <p><strong>Why:</strong></p>
        <ul>
          <li>Some rural-residential and rural-agriculture zones inside Town limits permit livestock and small hobby farms</li>
          <li>Access to Town services (water, sewer, road maintenance, garbage)</li>
          <li>Town amended Animal Control Bylaw in 2025 to formally allow ducks — livestock-friendly regulatory posture</li>
        </ul>
        <p><strong>Caveats:</strong></p>
        <ul>
          <li>Specific zone code names and animal-density rules require direct verification with <strong>Oliver Planning: 250-485-6200</strong></li>
          <li>Some Town-of-Oliver land is inside the ALR (particularly along the valley bottom)</li>
        </ul>
        <p><strong>Recommendation:</strong> Call Oliver Planning to identify the zone code(s) that permit hobby farms in Bylaw 1423 before starting a serious search. Write offers subject to a zoning-confirmation letter.</p>
      </div>

      <div className="rank">
        <h3>4. Penticton A (Agriculture)</h3>
        <p><strong>Bylaw:</strong> <a href="https://www.penticton.ca/sites/default/files/uploads/bylaws/Zoning%20Bylaw%202024-22%20(Consolidated%20May%202025).pdf">Zoning Bylaw 2024-22</a> — Section 9.2.</p>
        <p><strong>Why:</strong> Explicitly permits all livestock via "animal kennels and stable" (§9.2.1.4) AND "intensive impact agriculture." 2.0 ha (5 acre) minimum. Carriage house + secondary suite + farm-help dwelling all permitted (§9.2.1.7, §9.2.1.11, §9.2.5.1).</p>
        <p><strong>Caveats:</strong> ⚠️ <strong>Vast majority of Penticton A-zoned land IS in the ALR.</strong> If your goal is rural lifestyle without ALR restrictions, non-ALR A-zoned parcels are rare and typically expensive.</p>
        <p><strong>Recommendation:</strong> Only pursue if you find one of the rare non-ALR A-zoned parcels. Order the ALR search from the ALC BEFORE writing an offer.</p>
      </div>

      <div className="rank">
        <h3>5. Penticton FG (Forestry and Grazing)</h3>
        <p><strong>Bylaw:</strong> <a href="https://www.penticton.ca/sites/default/files/uploads/bylaws/Zoning%20Bylaw%202024-22%20(Consolidated%20May%202025).pdf">Zoning Bylaw 2024-22</a> — Section 9.1.</p>
        <p><strong>Why:</strong> 16 ha (40 acre) minimum — genuine acreage. Horses via "animal kennels and stable" (§9.1.1.5) explicitly permitted. Carriage house + secondary suite + rural home occupation permitted.</p>
        <p><strong>Caveats:</strong> 40 acres puts this in ranch-scale territory, not typical hobby-farm scale. Often steep, forested, west-slope terrain. Some FG land is inside the ALR.</p>
        <p><strong>Recommendation:</strong> Suits ranching-scale buyers or lifestyle acreage buyers, not small hobby farmers. Water rights and hay-field acreage should be a separate diligence.</p>
      </div>

      <div className="rank">
        <h3>6. Osoyoos AG (Agriculture) — Bylaw 1395 (2024, adopted)</h3>
        <p><strong>Bylaw:</strong> <a href="https://www.osoyoos.ca/sites/osoyoos.ca/files/2024-06/1395-1v20240618.pdf">Osoyoos Zoning Bylaw No. 1395, 2024</a> (supersedes Bylaw 1085). Latest amendment: <a href="https://www.osoyoos.ca/sites/osoyoos.ca/files/2026-05/Draft%20Zoning%20Amendment%20Bylaw%20No.%201395.13,%202026.pdf">Draft Amendment Bylaw No. 1395.13, 2026</a> in adoption pipeline.</p>
        <p><strong>Why:</strong></p>
        <ul>
          <li>Livestock explicitly defined to include horses, cattle, sheep, swine, llamas, ratites, goats, farmed game</li>
          <li>Equestrian centre now a permitted principal use (new in 1395)</li>
          <li>Secondary suite, accessory dwelling, bed &amp; breakfast, veterinary establishment all now permitted</li>
          <li>Max parcel 4.0 ha under 1395</li>
        </ul>
        <p><strong>Caveats (important 2026 update):</strong></p>
        <ul>
          <li>⚠️ Under Bylaw 1395, <strong>poultry and honeybee hives are prohibited in all zones EXCEPT AG.</strong> No backyard chickens in Osoyoos residential zones as of the adopted 1395 — stricter than pre-adoption drafts suggested.</li>
          <li>⚠️ Most AG-zoned Osoyoos land is in the ALR — verify per-parcel</li>
          <li>Barbed-wire fencing permitted only in AG and M1 zones</li>
          <li>Accessory buildings for domestic animals/poultry: 25 m from front lot line, 10 m from side/rear, 12 m from any dwelling</li>
        </ul>
        <p><strong>Recommendation:</strong> Same warning as Penticton A — only viable if you find a rare non-ALR AG parcel. Order the ALR search first. If a buyer wants backyard chickens in Osoyoos, they need an AG parcel — no other zone permits them under 1395.</p>
      </div>

      {/* ============ IMPORTANT CONSIDERATIONS ============ */}
      <h2>3. Important Buyer Considerations</h2>

      <h4>Why zoning and ALR are two different things</h4>
      <p><strong>Zoning</strong> is a municipal designation that regulates what you CAN build and use on a property (house type, setbacks, parcel size, permitted uses). <strong>ALR</strong> is a provincial designation under the <em>Agricultural Land Commission Act</em> that protects farmland from non-farm use — regardless of zoning. If your parcel is in the ALR, you must follow BOTH municipal zoning AND provincial ALR regulations. ALR generally favours farming (including livestock) but restricts many non-farm activities (subdivision, additional residences beyond farm-help units, non-agricultural businesses). A parcel zoned "Agriculture" is NOT automatically in the ALR, and a parcel zoned "Residential" is NOT automatically excluded from the ALR. Verify both, always.</p>

      <h4>Municipal animal-control bylaws still apply</h4>
      <p>Even if your zoning permits horses, a separate animal-control bylaw in the municipality can regulate noise (roosters, barking), nuisance (odour, manure management), fencing standards, maximum numbers by species, and setbacks from neighbouring properties. Ask each municipality's bylaw office for a copy of their current animal-control bylaw.</p>

      <h4>Why parcel size matters</h4>
      <p>Most South Okanagan bylaws use parcel size as the trigger for animal density (RDOS Area C: 1 animal per 0.4 ha; Penticton A: 2 ha minimum). A 1-acre RC lot in Penticton is at the LOWER edge of viability for horses (minimum 2 acres for a single horse for pasture-rotation and turnout — a horsemanship standard, not a zoning rule).</p>

      <h4>Restrictive covenants, easements, statutory building schemes, development permits</h4>
      <p>Zoning is only one layer. Also check restrictive covenants on title (§219 Land Title Act) which may prohibit livestock; statutory building schemes (§220 Land Title Act) which impose uniform subdivision restrictions; easements/rights-of-way; development permit areas (environmental, hillside, riparian); and legacy covenants specific to former ranches subdivided in the 1970s-90s — very common in South Okanagan rural subdivisions and often forbid livestock despite the rural character.</p>

      <h4>Verify EVERYTHING with the municipality before purchasing</h4>
      <ul>
        <li>Written <strong>zoning confirmation letter</strong> from the municipal planner (2–5 business days, usually free)</li>
        <li><strong>Title search</strong> through LTSA to see all registered charges, covenants, and easements</li>
        <li><strong>ALR-status confirmation</strong> from the Agricultural Land Commission</li>
        <li>Municipality's current <strong>animal-control bylaw</strong></li>
        <li>For rural properties: confirm road access, well water, septic capacity, hydro, and any regional district development permit area overlays</li>
        <li>Retain a <strong>BC lawyer or notary</strong> familiar with rural conveyancing before making an offer</li>
      </ul>

      {/* ============ SUMMARY TABLE ============ */}
      <h2>4. Summary Table — Best Candidates for Non-ALR Hobby Farm Buyers</h2>
      <div style={{overflowX:"auto"}}>
        <table>
          <thead><tr>
            <th>Municipality</th><th>Zone</th><th>Outside ALR?</th><th>Horses</th><th>Chickens</th><th>Other Livestock</th><th>Best For</th>
          </tr></thead>
          <tbody>
            <tr><td>Penticton</td><td><strong>RC</strong></td><td>✅ Usually</td><td>🟡 Verify</td><td>✅ Urban Hens permit</td><td>🟡 Small-scale</td><td>Rural residential lifestyle inside city limits</td></tr>
            <tr><td>RDOS Area C</td><td><strong>SH / RA</strong></td><td>✅ Many — verify each</td><td>✅ Explicit</td><td>✅ (25 cap on tiny lots)</td><td>✅ Explicit density</td><td>Predictable, transparent animal-density rules</td></tr>
            <tr><td>Penticton</td><td><strong>A</strong></td><td>⚠️ Rarely</td><td>✅</td><td>✅</td><td>✅</td><td>Only if you find a rare non-ALR parcel</td></tr>
            <tr><td>Osoyoos</td><td><strong>AG (1395)</strong></td><td>⚠️ Rarely</td><td>✅</td><td>✅</td><td>✅</td><td>Only if you find a rare non-ALR parcel</td></tr>
            <tr><td>Penticton</td><td><strong>FG</strong></td><td>⚠️ Verify each</td><td>✅</td><td>🟡</td><td>🟡</td><td>Ranch-scale properties (40+ acres)</td></tr>
          </tbody>
        </table>
      </div>

      {/* ============ FLAGS ============ */}
      <h2>5. Where the Bylaws Are Unclear (Flagged, Not Assumed)</h2>
      <ol>
        <li><strong>Penticton RC</strong> — "Agricultural use" is permitted but "animal kennels and stable" is NOT explicitly listed. Written zoning confirmation is essential before assuming horses are permitted.</li>
        <li><strong>Osoyoos Draft Bylaw 1395.13, 2026</strong> — In adoption pipeline. Check <a href="https://www.osoyoos.ca/council/zoning-bylaw-update">Osoyoos Zoning Bylaw Update page</a> for current status.</li>
        <li><strong>Town of Oliver Zoning Bylaw No. 1423</strong> — Consolidated PDF exists (Nov 2025) but access may require Town office visit or civikit login. Contact Oliver Planning directly.</li>
        <li><strong>Chicken limits in Penticton RC</strong> — Urban Hens program lists 4 hens per single-detached lot; RC lots may qualify under "agricultural use" for higher limits, requires written confirmation.</li>
        <li><strong>Osoyoos residential zones</strong> — Bylaw 1395 prohibits poultry outside AG zone; this replaces earlier 2023 workshop-draft indications of 2–6 hens in residential zones.</li>
      </ol>

      {/* ============ CONTACTS ============ */}
      <h2>6. Verification Contacts</h2>
      <div className="contacts">
        <ul style={{margin:0}}>
          <li><strong>City of Penticton — Planning:</strong> 250-490-2501 · <a href="https://www.penticton.ca/business-building/planning-land-use">penticton.ca/planning</a></li>
          <li><strong>Town of Oliver — Planning:</strong> 250-485-6200 · <a href="https://www.oliver.ca/planning">oliver.ca/planning</a></li>
          <li><strong>Town of Osoyoos — Planning:</strong> 250-495-6515 · <a href="https://www.osoyoos.ca/council/zoning-bylaw-update">osoyoos.ca/zoning-bylaw-update</a></li>
          <li><strong>RDOS — Planning:</strong> 250-490-4101 · <a href="https://www.rdos.bc.ca/development-services/planning/">rdos.bc.ca/planning</a></li>
          <li><strong>BC Agricultural Land Commission:</strong> 604-660-7000 · <a href="https://www.alc.gov.bc.ca/">alc.gov.bc.ca</a></li>
          <li><strong>Land Title and Survey Authority:</strong> <a href="https://ltsa.ca/">ltsa.ca</a></li>
        </ul>
      </div>

      {/* ============ DISCLAIMER ============ */}
      <div className="disclaimer">
        <p><strong>Compliance disclaimer.</strong> This research summary was compiled from publicly available primary sources in February 2026 and reflects the best available bylaw text at that date. Zoning bylaws are amended regularly. Buyers should independently verify every conclusion with the applicable municipality and their legal advisor before making any purchase decision.</p>
        <p>This document is <strong>informational only</strong> and is <strong>not legal, real-estate, or planning advice</strong>. It is not an opinion of value under BCFSA rules and does not constitute a promise, representation, or warranty as to the permitted use of any specific property. Property use decisions should be made in consultation with a licensed BC REALTOR®, a BC lawyer or notary, and the applicable municipal planning department.</p>
        <p>Prepared as a research reference by <strong>Doug LeMaire, REALTOR®</strong>, Fraser Property Management Realty Services Ltd., a licensee under the BC Real Estate Services Act, regulated by the BC Financial Services Authority (BCFSA). CIPO Copyright Registration #1247822.</p>
        <p style={{marginTop:"1rem",fontStyle:"italic"}}>© 2026 EZtoFind.ca. Reproduction permitted for personal, non-commercial buyer research use with attribution.</p>
      </div>
    </div>
  );
}
