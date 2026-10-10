import React from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import "../components/homenext/homeNext.css";
import { HomeNextNav } from "../components/homenext/HomeNextHero";
import { HomeNextFooter } from "../components/homenext/HomeNextExtras";

const COPY = {
  submitted: {
    icon: "✓",
    accent: "#0EA5E9",
    title: "Thank you — your message is on its way to Doug.",
    body: "Doug LeMaire, REALTOR® will personally reply, usually within one business day. There's no obligation, and reaching out does not create a client relationship.",
    note: "We'll only use your details to respond to your enquiry (PIPA). If you opted in to market updates, every email includes a one-click unsubscribe (CASL).",
  },
  represented: {
    icon: "🤝",
    accent: "#0F2A5B",
    title: "Thanks for letting us know.",
    body: "Because you're already represented by a REALTOR® under a written contract, we won't reach out — that's their role, and professional rules (CREA Article 16) ask us to respect it. You're always welcome to use EZtoFind.ca's free research tools.",
    note: "Your REALTOR® is your best first call for anything about a specific property or offer.",
  },
  error: {
    icon: "!",
    accent: "#DC2626",
    title: "Something didn't go through.",
    body: "We couldn't process that submission — the required consent box may have been missed. Please head back and try again.",
    note: "",
  },
};

export default function ThankYou() {
  const [params] = useSearchParams();
  const status = params.get("status") || "submitted";
  const intent = params.get("intent");
  const area = params.get("area");
  const c = COPY[status] || COPY.submitted;
  const personal = status === "submitted" && intent
    ? `We've noted you're looking to ${intent === "sell" ? "sell" : "buy"}${area ? ` in ${area}` : ""}.`
    : "";
  return (
    <div className="hn" data-testid="thank-you-page">
      <Helmet>
        <title>Thank you — EZtoFind.ca</title>
        <meta name="robots" content="noindex, follow"/>
      </Helmet>
      <HomeNextNav/>
      <main>
        <section style={{ padding: "72px 0", background: "linear-gradient(180deg,#F4F8FD 0%,#EAF1FB 100%)" }}>
          <div className="hn-wrap" style={{ maxWidth: 600, textAlign: "center" }}>
            <div aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", border: `2px solid ${c.accent}`, color: c.accent, fontSize: 30, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", boxShadow: "0 2px 10px rgba(15,42,91,0.08)" }}>{c.icon}</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", color: "#0F2A5B", fontWeight: 700, fontSize: "clamp(26px,3.6vw,38px)", lineHeight: 1.15, margin: "0 0 14px" }} data-testid="thank-you-title">{c.title}</h1>
            <p style={{ color: "#51607A", fontSize: 17, lineHeight: 1.65, margin: "0 auto 10px", maxWidth: 520 }}>{c.body}</p>
            {personal && <p style={{ color: "#0F2A5B", fontSize: 16, fontWeight: 600, margin: "0 auto", maxWidth: 520 }} data-testid="thank-you-personal">{personal}</p>}
            {c.note && <p style={{ color: "#8A93A6", fontSize: 13, lineHeight: 1.55, margin: "14px auto 0", maxWidth: 500 }}>{c.note}</p>}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 30 }}>
              <Link to="/" className="hn-pill hn-pill--lg" style={{ background: "#0F2A5B", color: "#fff", fontWeight: 700, textDecoration: "none" }} data-testid="thank-you-home">Back to home</Link>
              <Link to="/listings" className="hn-pill hn-pill--lg" style={{ background: "#fff", color: "#0F2A5B", border: "1px solid #CBD5E6", fontWeight: 700, textDecoration: "none" }} data-testid="thank-you-search">Search BC listings</Link>
            </div>
          </div>
        </section>
      </main>
      <HomeNextFooter/>
    </div>
  );
}
