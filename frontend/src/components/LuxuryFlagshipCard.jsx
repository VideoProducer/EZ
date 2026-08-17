import React from "react";
import { Link } from "react-router-dom";
import { FLAGSHIP, isFlagshipRibbonActive } from "../config/flagshipListing";

// Full-width "Doug's Featured Listing" flagship card. Rendered above the
// Luxury magazine grid. Auto-shows "NEW LISTING · JUST ACTIVE" ribbon for
// the first 7 days after FLAGSHIP.launch_at (then quietly fades).
export default function LuxuryFlagshipCard() {
  if (!FLAGSHIP.active) return null;
  const showRibbon = isFlagshipRibbonActive();
  // Route to Doug's custom magazine page (rich branded marketing spread) —
  // independent of the CREA DDF® sync so the chip always resolves. Once the
  // DDF feed catches up we'll swap this to `/listings/{mls_number}`.
  const detailHref = "/mockups/magazine-3015-141-st";
  const realtorCaSearch = FLAGSHIP.mls_number
    ? `https://www.realtor.ca/map#view=list&Sort=6-D&GeoName=Surrey%2C%20BC&Keywords=${encodeURIComponent(FLAGSHIP.mls_number)}`
    : null;
  return (
    <section data-testid="luxury-flagship" style={{ background: "#FAF7F0", padding: "60px 0 30px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ marginBottom: 22, textAlign: "center" }}>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.16em", color: "#DABF7A", fontWeight: 700, textTransform: "uppercase" }}>
            Doug's Featured Listing
          </div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.2rem", color: "#0F2A5B", marginTop: 6 }}>
            {FLAGSHIP.address}, {FLAGSHIP.city}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.95rem", color: "#6B7280", marginTop: 6, fontStyle: "italic" }}>
            {FLAGSHIP.tagline}
          </div>
        </div>
        <div style={{ position: "relative", border: "3px solid #DABF7A", borderRadius: 4, overflow: "hidden", boxShadow: "0 20px 60px rgba(15,42,91,0.15)" }}>
          {showRibbon && (
            <div style={{
              position: "absolute", top: 24, left: -50, transform: "rotate(-45deg)",
              background: "#B7351B", color: "white", padding: "8px 60px",
              fontFamily: "Inter,sans-serif", fontSize: "0.72rem", fontWeight: 800,
              letterSpacing: "0.14em", zIndex: 10, boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
            }}>NEW · JUST ACTIVE</div>
          )}
          <div style={{
            backgroundImage: `url(${FLAGSHIP.hero_image})`,
            backgroundSize: "cover", backgroundPosition: "center",
            height: 560, position: "relative",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(15,42,91,0.85) 100%)" }} />
            <div style={{ position: "absolute", bottom: 32, left: 40, right: 40, color: "white" }}>
              <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.6rem", marginBottom: 8 }}>
                {FLAGSHIP.description}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
                <Link to={detailHref} data-testid="flagship-detail-cta" style={{
                  background: "#DABF7A", color: "#0F2A5B", padding: "12px 24px", borderRadius: 999,
                  fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none",
                }}>View Full Listing →</Link>
                <a href={FLAGSHIP.matterport} target="_blank" rel="noopener noreferrer" data-testid="flagship-matterport" style={{
                  background: "rgba(255,255,255,0.15)", color: "white", padding: "12px 24px", borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.5)",
                  fontFamily: "Sora,sans-serif", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none",
                }}>3D Matterport Tour ↗</a>
                <a href={FLAGSHIP.virtual_tour_iframe} target="_blank" rel="noopener noreferrer" data-testid="flagship-cotala" style={{
                  background: "rgba(255,255,255,0.15)", color: "white", padding: "12px 24px", borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.5)",
                  fontFamily: "Sora,sans-serif", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none",
                }}>Virtual Tour ↗</a>
                {realtorCaSearch && (
                  <a href={realtorCaSearch} target="_blank" rel="noopener noreferrer" data-testid="flagship-realtor-ca" style={{
                    background: "transparent", color: "rgba(255,255,255,0.8)", padding: "12px 20px", borderRadius: 999,
                    border: "1px dashed rgba(255,255,255,0.35)",
                    fontFamily: "Sora,sans-serif", fontWeight: 500, fontSize: "0.82rem", textDecoration: "none",
                  }}>View MLS® on realtor.ca ↗</a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
