"""Managing Broker policy templates for Fraser Property Management Realty Services Ltd.
Served as printable HTML — Doug can print to PDF from browser."""

POLICY_CSS = """<style>
body{font-family:Georgia,serif;max-width:780px;margin:2rem auto;padding:2rem;color:#0B1930;line-height:1.6}
h1{font-family:'Fraunces',Georgia,serif;color:#0F2A5B;border-bottom:3px solid #F5A623;padding-bottom:0.5rem}
h2{color:#0F2A5B;margin-top:2rem}
h3{color:#1E4FCF;margin-top:1.5rem}
.hdr{display:flex;justify-content:space-between;align-items:center;font-size:0.85rem;color:#5B6B85;margin-bottom:2rem}
.sig{margin-top:3rem;border-top:1px solid #ccc;padding-top:2rem;font-size:0.95rem}
.sig-line{display:inline-block;width:280px;border-bottom:1px solid #333;margin-right:1rem;height:1.5rem}
ul{margin:0.5rem 0 1rem 1.25rem}li{margin:0.35rem 0}
.footer{margin-top:3rem;font-size:0.78rem;color:#5B6B85;text-align:center;border-top:1px solid #eee;padding-top:1rem}
@media print{body{margin:1rem;padding:0}.no-print{display:none}}
.no-print{position:fixed;top:1rem;right:1rem}
.btn{background:#0F2A5B;color:white;padding:0.6rem 1.2rem;border-radius:8px;text-decoration:none;font-family:sans-serif;font-size:0.9rem}
</style>"""

def wrap(title, body):
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{title} — EZtoFind.ca</title>{POLICY_CSS}</head><body>
    <div class="no-print"><a href="javascript:window.print()" class="btn">🖨️ Print to PDF</a></div>
    <div class="hdr"><div><strong>Fraser Property Management Realty Services Ltd.</strong><br>Doug LeMaire, REALTOR®</div><div>EZtoFind.ca<br>Effective: __________</div></div>
    {body}
    <div class="footer">Fraser Property Management Realty Services Ltd. · EZtoFind.ca · info@eztofind.ca</div>
    </body></html>"""

POLICIES = {
"ai-use-policy": wrap("AI Use Policy", """
<h1>Artificial Intelligence Use Policy</h1>
<p><em>Aligns with BCFSA AI Guidelines and RESA sections 28, 30, 33, 34, 40, and 41.</em></p>

<h2>1. Purpose</h2>
<p>This policy governs the use of artificial intelligence (AI) tools by the licensee (Doug LeMaire) and any team members within Fraser Property Management Realty Services Ltd., including but not limited to the AI-powered features on EZtoFind.ca.</p>

<h2>2. Core Principle</h2>
<p><strong>The licensee remains fully responsible</strong> for every AI-generated statement, advertisement, recommendation, and piece of content. AI is a tool — not a licensed professional. Using AI never transfers responsibility away from the licensee under RESA, BCFSA Rules, PIPA, or CASL.</p>

<h2>3. Approved AI Tools</h2>
<ul>
<li><strong>Doogie AI Chat</strong> — Anthropic Claude Sonnet 4.6 via Emergent platform. Configured with strict compliance guardrails (no advice, no property recommendations, no pricing).</li>
<li><strong>AI Content Drafting</strong> — Anthropic Claude Sonnet 4.6 for glossary FAQs, community synopses, and weather summaries. All output requires human review and approval by the licensee before publication.</li>
</ul>

<h2>4. Prohibited Uses</h2>
<ul>
<li>Uploading confidential client information (names, addresses, phone, financials, negotiations, pricing strategies) to any AI system without informed client consent and vendor privacy verification.</li>
<li>Publishing any AI-generated content without human review and approval.</li>
<li>Using AI-generated photos or virtually staged images without clear disclosure.</li>
<li>Relying on AI for legal, tax, financial, or property-specific advice.</li>
<li>Using AI-generated content in advertisements that could mislead consumers about property features, condition, or value.</li>
</ul>

<h2>5. Verification Requirement</h2>
<p>Every AI-generated output must be verified before use — including statistics, zoning references, legal information, market analysis, property descriptions, and photographs.</p>

<h2>6. Bias Review</h2>
<p>All AI outputs must be reviewed for potential bias (racial, gender, demographic, linguistic). Fair Housing and BC Human Rights Code compliance is mandatory.</p>

<h2>7. Transparency</h2>
<p>Consumers interacting with Doogie AI Chat are shown a clear disclosure that they are interacting with an AI, its limitations, and that a licensed REALTOR® remains responsible. Published AI-drafted content is labelled: "AI-drafted, reviewed and approved by Doug LeMaire, REALTOR®".</p>

<h2>8. Privacy Safeguards</h2>
<ul>
<li>PII (SIN, credit card, email, phone, postal code, street address) is automatically redacted from chat inputs before storage.</li>
<li>Chat logs auto-purge after 30 days (MongoDB TTL).</li>
<li>Consent metadata (IP, user-agent, timestamp) is captured on all lead forms for 3-year CASL retention.</li>
</ul>

<h2>9. Record-Keeping</h2>
<p>All AI approvals are logged with timestamp in the admin panel. Chat log audit trails are available to the Managing Broker on request.</p>

<h2>10. Managing Broker Oversight</h2>
<p>The Managing Broker will review this policy annually, monitor AI-generated advertising, ensure privacy compliance, and confirm E&O insurance coverage applies to AI-generated content.</p>

<div class="sig">
<p><span class="sig-line"></span>Doug LeMaire, REALTOR® (Licensee)</p><br>
<p><span class="sig-line"></span>Managing Broker</p><br>
<p><span class="sig-line"></span>Date</p>
</div>
"""),

"licensee-training-memo": wrap("Licensee Training Memo", """
<h1>Licensee AI Training Memo</h1>
<p><strong>To:</strong> Doug LeMaire, REALTOR® &nbsp;·&nbsp; <strong>From:</strong> Managing Broker &nbsp;·&nbsp; <strong>Re:</strong> AI Features on EZtoFind.ca</p>

<h2>Overview</h2>
<p>This memo confirms that the licensee has been trained on the use of AI features on EZtoFind.ca and understands the associated regulatory responsibilities under BCFSA's AI Guidelines.</p>

<h2>Systems Covered</h2>
<h3>1. Doogie AI Chat Assistant</h3>
<ul>
<li>Powered by Anthropic Claude Sonnet 4.6 (via Emergent LLM Key).</li>
<li>System prompt hardcoded to refuse advice, refuse property recommendations, refuse pricing opinions.</li>
<li>All chat inputs pass through PII redaction before storage in MongoDB.</li>
<li>Chat logs auto-purge after 30 days.</li>
<li>Users see a pre-consent modal on first use.</li>
</ul>

<h3>2. AI Content Drafting</h3>
<ul>
<li>Claude Sonnet 4.6 drafts glossary FAQs, community synopses, and weather summaries.</li>
<li>All content is queued as <em>unapproved</em> — hidden from the public site until the licensee reviews and clicks "Approve & Publish" in the admin panel.</li>
<li>Every published piece carries the label "AI-drafted, reviewed and approved by Doug LeMaire, REALTOR®".</li>
</ul>

<h2>Licensee Responsibilities Confirmed</h2>
<ul>
<li>Review every AI-generated piece of content before approval.</li>
<li>Do not paste confidential client information into any AI system.</li>
<li>Verify factual accuracy of AI output (statistics, zoning, legal points, market data).</li>
<li>Watch for AI bias in recommendations or language.</li>
<li>Ensure all advertising remains truthful and non-misleading per RESA sections 40 & 41.</li>
</ul>

<h2>Training Confirmation</h2>
<p>I confirm I have reviewed the brokerage's AI Use Policy, understand my responsibilities as the licensed REALTOR® for all AI-generated output on EZtoFind.ca, and will maintain the compliance workflow described above.</p>

<div class="sig">
<p><span class="sig-line"></span>Doug LeMaire, REALTOR®</p><br>
<p><span class="sig-line"></span>Date</p><br>
<p><span class="sig-line"></span>Managing Broker (acknowledgment)</p>
</div>
"""),

"eo-insurance-letter": wrap("E&O Insurance Disclosure", """
<h1>Errors & Omissions Insurance — AI Use Disclosure</h1>
<p><strong>To:</strong> [E&O Insurance Provider Name]<br>
<strong>From:</strong> Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd.<br>
<strong>Policy #:</strong> ______________________ &nbsp;&nbsp; <strong>Date:</strong> ______________________</p>

<h2>Purpose of This Disclosure</h2>
<p>Per BCFSA's AI Guidelines and standard E&O best practice, I am disclosing the specific ways artificial intelligence is used in my real estate practice, so you can confirm my current coverage applies or advise if additional endorsements are required.</p>

<h2>AI Use Summary</h2>
<h3>1. Consumer-facing chat assistant (Doogie)</h3>
<ul>
<li>Provided on EZtoFind.ca</li>
<li>AI model: Anthropic Claude Sonnet 4.6 via Emergent LLM Key</li>
<li>Configured to refuse financial/legal/tax/property-specific advice</li>
<li>Users see a pre-consent notice; PII is auto-redacted before storage</li>
</ul>

<h3>2. AI-drafted content on EZtoFind.ca</h3>
<ul>
<li>Community synopses, weather summaries, glossary FAQs</li>
<li>Every piece is reviewed and approved by me before publication</li>
<li>Each piece is labelled "AI-drafted, reviewed and approved by Doug LeMaire, REALTOR®"</li>
</ul>

<h2>Not Used</h2>
<ul>
<li>No AI-generated property photos, virtual staging, or edited listing images</li>
<li>No AI-driven pricing or valuation tools published to consumers</li>
<li>No AI-driven tenant screening or client-facing recommendations</li>
</ul>

<h2>Requested Confirmation</h2>
<p>Please confirm in writing:</p>
<ul>
<li>Whether my current E&O policy covers professional liability arising from AI-generated content that I have reviewed and approved.</li>
<li>Whether any exclusion or endorsement applies to the use of AI tools as described above.</li>
<li>Any additional premium, sub-limit, or documentation you require to maintain coverage.</li>
</ul>

<div class="sig">
<p><span class="sig-line"></span>Doug LeMaire, REALTOR®</p><br>
<p><span class="sig-line"></span>Date</p>
</div>
"""),

"vendor-due-diligence": wrap("Vendor Due Diligence Memo", """
<h1>Vendor Due Diligence Memo</h1>
<p><strong>Prepared by:</strong> Doug LeMaire, REALTOR® — Fraser Property Management Realty Services Ltd.<br>
<strong>Date:</strong> ______________________</p>

<h2>Scope</h2>
<p>This memo documents the due diligence performed on the third-party AI and hosting vendors used by EZtoFind.ca, in accordance with BCFSA's guidance that Managing Brokers should "perform due diligence on AI vendors" and "review vendor privacy policies".</p>

<h2>Vendor 1: Anthropic (Claude AI)</h2>
<ul>
<li><strong>Service:</strong> Claude Sonnet 4.6 language model API — powers Doogie chat and AI content drafting.</li>
<li><strong>Location:</strong> Anthropic PBC, San Francisco, CA, USA.</li>
<li><strong>Data handling:</strong> Per Anthropic's API terms, customer API traffic is NOT used to train models. Prompts and completions may be retained for up to 30 days for abuse-detection purposes, then deleted.</li>
<li><strong>Privacy policy:</strong> https://www.anthropic.com/legal/privacy</li>
<li><strong>Security certifications:</strong> SOC 2 Type II attested.</li>
<li><strong>Compliance posture:</strong> Suitable for BC business use with the following controls: PII redaction before API calls, no confidential client info inputs, published content reviewed by licensee.</li>
</ul>

<h2>Vendor 2: Emergent (Platform & LLM Key Provider)</h2>
<ul>
<li><strong>Service:</strong> App hosting (React frontend + FastAPI backend + MongoDB) and AI proxy (Emergent LLM Key).</li>
<li><strong>Data handling:</strong> Emergent hosts the MongoDB instance containing lead data, chat logs, and CRM records. Emergent's platform terms apply.</li>
<li><strong>Controls in place:</strong> PII redaction before chat storage, 30-day chat log TTL, 7-year lead retention with self-service deletion via info@eztofind.ca.</li>
<li><strong>Recommended action:</strong> Confirm hosting region and update Privacy Policy Data Residency section accordingly. If US-hosted, disclose to consumers.</li>
</ul>

<h2>Vendor 3: OpenStreetMap contributors (retired feature)</h2>
<ul>
<li><strong>Prior use:</strong> Community amenity data (schools, hospitals, malls, parks, recreation).</li>
<li><strong>Status:</strong> Feature retired per licensee decision. No data is currently being fetched.</li>
</ul>

<h2>Ongoing Review</h2>
<p>This due-diligence memo will be reviewed annually or upon any material change to vendor terms, hosting region, or the AI models used.</p>

<div class="sig">
<p><span class="sig-line"></span>Doug LeMaire, REALTOR®</p><br>
<p><span class="sig-line"></span>Date</p><br>
<p><span class="sig-line"></span>Managing Broker (acknowledgment)</p>
</div>
""")
}
