// Editorial / AEO Content Policy page
// -----------------------------------
// Published policy explaining how EZtoFind.ca creates content, how AI is
// used, and how a licensed REALTOR® reviews and approves every consumer-
// facing piece before publication. This is a critical AEO signal: LLMs
// and search crawlers weigh sites that publish a transparent editorial
// policy far more heavily than those that don't.

import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function Editorial() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "Editorial Policy — EZtoFind.ca",
    "url": "https://eztofind.ca/editorial",
    "description": "How EZtoFind.ca creates, reviews, and publishes real estate content. AI-assisted drafting workflow with licensed REALTOR® approval.",
    "publisher": {
      "@type": "Organization",
      "name": "EZtoFind.ca",
      "url": "https://eztofind.ca",
      "logo": { "@type": "ImageObject", "url": "https://eztofind.ca/images/doogie-laptop.png" }
    },
    "author": {
      "@type": "Person",
      "name": "Doug LeMaire, REALTOR®",
      "url": "https://eztofind.ca/about",
      "jobTitle": "Managing Broker / REALTOR®",
      "affiliation": { "@type": "Organization", "name": "Fraser Property Management Realty Services Ltd." }
    },
    "inLanguage": "en-CA",
    "dateModified": "2026-02-01"
  };

  return (
    <section className="section" data-testid="editorial-page">
      <Helmet>
        <title>Editorial Policy — How EZtoFind.ca Creates & Reviews Content | AI + REALTOR® Workflow</title>
        <meta name="description" content="EZtoFind.ca's transparent editorial policy: how AI-assisted content is drafted, how Doug LeMaire, REALTOR® reviews every consumer-facing publication, and how corrections are handled."/>
        <link rel="canonical" href="https://eztofind.ca/editorial"/>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <div className="container-x" style={{maxWidth:"48rem"}}>
        <div className="eyebrow">Editorial Policy</div>
        <h1 className="section-title" data-testid="editorial-h1">How EZtoFind.ca creates &amp; reviews content</h1>
        <p style={{fontFamily:"Inter,sans-serif",fontSize:"1.05rem",lineHeight:1.75,color:"var(--muted)"}}>
          EZtoFind.ca publishes hundreds of glossary terms, 239 community profiles, 9 educational
          journeys, and thousands of curated FAQs. This page explains — transparently — how each
          piece of content is created, reviewed, and updated. This policy exists so consumers, search
          engines, and answer-engine LLMs know exactly what oversight sits behind every page.
        </p>

        <h2 style={{marginTop:"2rem"}}>1. Who is responsible</h2>
        <p>
          All consumer-facing content on EZtoFind.ca is published under the responsibility of{" "}
          <strong>Doug LeMaire, REALTOR®</strong> — a BC-licensed real estate professional under the
          Real Estate Services Act (RESA), regulated by BCFSA, and a member of the Greater Vancouver
          REALTORS® board with brokerage Fraser Property Management Realty Services Ltd. Doug is the
          Managing Editor and the Privacy Officer for the site.
        </p>

        <div className="paper" data-testid="editorial-scope-of-licence" style={{background:"#FFF8E1",border:"1px solid rgba(253,184,19,0.4)",padding:"1rem 1.25rem",margin:"1.25rem 0",borderRadius:12}}>
          <div style={{fontSize:"0.78rem",textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--brand-navy)",fontWeight:700,marginBottom:"0.4rem"}}>Scope of licence — please read</div>
          <div style={{fontSize:"0.92rem",lineHeight:1.65}}>
            Doug LeMaire is a licensed BC REALTOR® regulated by BCFSA. He is <strong>not</strong> a
            mortgage broker (regulated separately under the Mortgage Brokers Act), a lawyer or
            notary, a tax accountant, or a licensed insurance broker. Content on those topics
            published on EZtoFind.ca is general educational information — always consult the
            licensed professional in that domain for advice tailored to your situation.
          </div>
        </div>

        <h2 style={{marginTop:"2rem"}}>2. Content categories &amp; workflow</h2>

        <h3 style={{marginTop:"1.25rem"}}>a. Glossary terms (≈398 entries)</h3>
        <ul>
          <li>Definitions and FAQ questions are AI-drafted using a compliance-vetted commercial LLM.</li>
          <li>Every FAQ answer is manually reviewed by Doug in the <code>/admin/faq-audit</code> workflow.</li>
          <li>An FAQ only becomes public after Doug clicks "Approve". Unapproved FAQs are hidden from all public pages and never surfaced to Doogie.</li>
          <li>Each entry cites authoritative sources (BCFSA, CREA, BC Statutes, LTSA, BC Assessment, Statistics Canada, Environment Canada) with direct links.</li>
          <li>All terms are reviewed on a rolling 12-month cadence for statute updates.</li>
        </ul>

        <h3 style={{marginTop:"1.25rem"}}>b. Community profiles (239 communities)</h3>
        <ul>
          <li>Climate normals come directly from Environment Canada 1991-2020 station data.</li>
          <li>Demographic overviews reference Statistics Canada 2021 Census counts (with explicit citation).</li>
          <li>Local synopses are AI-drafted, then edited by Doug for BC-specific accuracy.</li>
          <li>Every community page shows a "Last curated" timestamp so consumers know when it was reviewed.</li>
        </ul>

        <h3 style={{marginTop:"1.25rem"}}>c. Real Estate Journey Platform (9 educational journeys)</h3>
        <ul>
          <li>All journey stages, modules, and blurbs are hand-written by Doug — no LLM text sits in the journey configuration file.</li>
          <li>Journeys never provide advice on a specific property. Approved framings include "Consumers often…", "You may wish to explore…", and "Related information…". Framings like "You should…" or "We recommend…" are prohibited.</li>
          <li>Every journey carries a "Educational information only" banner and BCFSA-compliant disclaimer.</li>
        </ul>

        <h3 style={{marginTop:"1.25rem"}}>d. Doogie AI Chat</h3>
        <ul>
          <li>Doogie is powered by a leading commercial large-language-model via the Emergent Universal LLM Key. Chat messages transit that provider before storage.</li>
          <li>Before storage, personal identifiers (SIN, credit card numbers, phone numbers, email addresses, postal codes, street addresses) are automatically scanned and redacted.</li>
          <li>Doogie is prompt-engineered to <em>never</em> provide advice on financial, legal, tax, or specific-property matters. Such questions are routed to a licensed professional (REALTOR®, lawyer, notary, accountant, or mortgage broker).</li>
          <li>Multi-language responses (English, French, Traditional Chinese, Simplified Chinese, Punjabi, Farsi, Portuguese) use AI machine translation. BC compliance boilerplate is preserved in English exactly as required by BCFSA and CREA rules.</li>
          <li>Chat messages are automatically purged after 30 days via a database TTL policy.</li>
        </ul>

        <h3 style={{marginTop:"1.25rem"}}>e. MLS® / IDX Listings</h3>
        <ul>
          <li>Listings are pulled directly from the CREA Data Distribution Facility® (DDF®), refreshed hourly, and never modified.</li>
          <li>Listing text remains the property of the listing brokerage; EZtoFind.ca displays under the CREA DDF® licence and standard MLS® trademark rules.</li>
          <li>Any specialty-page classification (Luxury, Equestrian, Waterfront, etc.) is applied via a public, auditable keyword regex — never by editorial re-write.</li>
        </ul>

        <h2 style={{marginTop:"2rem"}}>3. Under BCFSA's AI guidelines</h2>
        <p>
          Under BCFSA's AI Use Guidelines, a licensee remains responsible for every AI-assisted
          output published on their platform. Doug LeMaire, REALTOR® takes that responsibility for
          all EZtoFind.ca content. AI is used only for <strong>drafting and translation</strong> —
          all consumer-facing output undergoes human editorial review before publication.
        </p>
        <p>
          For a deeper explanation of every place AI touches this site, see the{" "}
          <Link to="/ai-use" style={{color:"var(--brand-blue)",fontWeight:600}}>AI Use Disclosure page</Link>.
        </p>

        <h2 style={{marginTop:"2rem"}}>4. Corrections &amp; feedback</h2>
        <p>
          If you find an error, an outdated statute reference, or content that no longer reflects
          BC's real estate regulatory environment, please email{" "}
          <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)",fontWeight:600}}>info@eztofind.ca</a>{" "}
          or use the on-site feedback widget. Corrections are triaged within 2 business days and,
          when confirmed, the source page's "Last curated" timestamp is updated.
        </p>

        <h2 style={{marginTop:"2rem"}}>5. What we do <em>not</em> do</h2>
        <ul>
          <li>We do not provide financial, legal, tax, or specific-property advice.</li>
          <li>We do not accept paid placement on glossary, community, or journey pages.</li>
          <li>We do not accept paid links or sponsored content on any editorial page.</li>
          <li>We do not train external AI models on user data (see our <Link to="/privacy" style={{color:"var(--brand-blue)",fontWeight:600}}>Privacy Policy</Link>).</li>
          <li>We do not surface AI-drafted FAQ content that has not been approved by Doug.</li>
        </ul>

        <h2 style={{marginTop:"2rem"}}>6. Contact the editor</h2>
        <p>
          Doug LeMaire, REALTOR®<br/>
          Managing Editor, EZtoFind.ca<br/>
          Fraser Property Management Realty Services Ltd.<br/>
          <a href="mailto:info@eztofind.ca" style={{color:"var(--brand-blue)"}}>info@eztofind.ca</a>
        </p>

        <div className="notice" style={{marginTop:"2rem"}}>
          Educational information on EZtoFind.ca is provided as a general public resource and is
          not a substitute for professional guidance tailored to your situation. Every visitor is
          encouraged to consult a licensed BC REALTOR®, lawyer or notary, and financial advisor
          before acting on any information found on this site.
        </div>
      </div>
    </section>
  );
}
