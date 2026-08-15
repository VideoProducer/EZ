// Playful empty-state — turns any "zero results" or "not-found" moment
// into a lead-capture opportunity. Doogie with a magnifying glass +
// a friendly line + optional "notify me when one appears" CTA.
//
// Usage:
//   <PlayfulEmptyState
//     title="Nothing matches that yet."
//     subtitle="Want me to alert you the moment one appears?"
//     ctaLabel="Set up an alert"
//     ctaHref="/newsletter"
//   />
import React from "react";
import { Link } from "react-router-dom";

const C = { navy:"#0F2A5B", gold:"#F5A623", ink:"#111827", muted:"#6B7280", paper:"#FAFAF7" };

export default function PlayfulEmptyState({
  title    = "Nothing here yet.",
  subtitle = "Want me to alert you the moment something matches?",
  ctaLabel = "Set up a Doogie alert",
  ctaHref  = "/newsletter",
  onCtaClick,                                // optional handler; overrides Link if provided
  image    = "/doogie/magnifying.webp",      // default: Doogie holding a magnifying glass
  variant  = "search",                       // "search" | "favourite" | "not-found"
  testid   = "empty-state",
  children,                                  // optional extra content below the CTA
}) {
  const CTA = onCtaClick ? (
    <button
      onClick={onCtaClick}
      data-testid={`${testid}-cta`}
      style={{ background: C.gold, color: C.navy, padding:"12px 24px", borderRadius: 999, fontWeight: 800, fontSize:"0.9rem", border:"none", cursor:"pointer", fontFamily:"'Sora',sans-serif" }}
    >{ctaLabel}</button>
  ) : (
    <Link
      to={ctaHref}
      data-testid={`${testid}-cta`}
      style={{ background: C.gold, color: C.navy, padding:"12px 24px", borderRadius: 999, fontWeight: 800, fontSize:"0.9rem", textDecoration:"none", fontFamily:"'Sora',sans-serif" }}
    >{ctaLabel}</Link>
  );

  return (
    <div
      role="status"
      data-testid={testid}
      data-variant={variant}
      style={{ textAlign:"center", padding:"40px 24px", background: C.paper, borderRadius: 14, border:"1px dashed #E5E7EB", maxWidth: 560, margin:"0 auto" }}
    >
      <img
        src={image}
        alt=""
        width={140}
        height={140}
        loading="lazy"
        decoding="async"
        style={{ width: 140, height:"auto", filter:"drop-shadow(0 12px 24px rgba(15,42,91,0.15))" }}
      />
      <div style={{ fontSize:"1.15rem", fontFamily:"'Sora',sans-serif", fontWeight: 700, color: C.navy, marginTop: 8 }}>{title}</div>
      <div style={{ fontSize:"0.9rem", color: C.muted, marginTop: 6, marginBottom: 18, lineHeight: 1.55 }}>{subtitle}</div>
      {CTA}
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
