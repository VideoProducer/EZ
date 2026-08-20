import React, { useState, useEffect } from "react";
import { FLAGSHIP, isFlagshipRibbonActive } from "../config/flagshipListing";
import ListingPhotoLightbox from "./ListingPhotoLightbox";

const API = process.env.REACT_APP_BACKEND_URL;

// Full-width "Doug's Featured Listing" flagship card. Rendered above the
// Luxury magazine grid. Hydrates from CREA DDF® (via /api/listings/{mls})
// when available — falling back to the FLAGSHIP snapshot config so the card
// always renders even on first paint. Auto-shows "NEW LISTING · JUST ACTIVE"
// ribbon for the first 7 days after FLAGSHIP.launch_at.
export default function LuxuryFlagshipCard() {
  const [live, setLive] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!FLAGSHIP.active || !FLAGSHIP.mls_number) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/api/listings/${encodeURIComponent(FLAGSHIP.mls_number)}`);
        if (r.ok && !cancelled) {
          const data = await r.json();
          setLive(data);
        }
      } catch { /* silent — snapshot still renders */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!FLAGSHIP.active) return null;
  const showRibbon = isFlagshipRibbonActive();

  // Merged fields — DDF wins when present, snapshot fills the gaps.
  const heroImage = (live?.photos?.[0]?.url || live?.photos?.[0]) || FLAGSHIP.hero_image;
  const galleryPhotos = (live?.photos?.length ? live.photos : [FLAGSHIP.hero_image]);
  const address = live?.address || FLAGSHIP.address;
  const city = live?.city || FLAGSHIP.city;
  const community = live?.community || live?.neighbourhood || FLAGSHIP.community || null;
  const description = FLAGSHIP.tagline_long
    || (live?.description ? `${FLAGSHIP.tagline} ${live.description}` : FLAGSHIP.description);
  const beds = live?.bedrooms ?? live?.beds;
  const baths = live?.bathrooms ?? live?.baths;
  const sqft = live?.square_feet ?? live?.living_area;
  const price = live?.price ?? live?.list_price;

  return (
    <section data-testid="luxury-flagship" style={{ background: "#FAF7F0", padding: "60px 0 30px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ marginBottom: 22, textAlign: "center" }}>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.16em", color: "#DABF7A", fontWeight: 700, textTransform: "uppercase" }}>
            Doug's Featured Listing
          </div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.2rem", color: "#0F2A5B", marginTop: 6 }} data-testid="luxury-flagship-address">
            {address}{community ? <> · <span style={{ color: "#8A6D2E" }}>{community}</span></> : null} · {city}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.95rem", color: "#6B7280", marginTop: 6, fontStyle: "italic" }}>
            {FLAGSHIP.tagline}
          </div>
          {live && (beds || baths || sqft || price) && (
            <div data-testid="luxury-flagship-specs" style={{
              marginTop: 14, display: "inline-flex", flexWrap: "wrap", gap: "6px 22px",
              justifyContent: "center", alignItems: "center",
              fontFamily: "Inter, sans-serif", fontSize: "0.86rem", color: "#0F2A5B",
              letterSpacing: "0.04em",
            }}>
              {beds ? <span><strong>{beds}</strong> BR</span> : null}
              {baths ? <span><strong>{baths}</strong> BA</span> : null}
              {sqft ? <span><strong>{Number(sqft).toLocaleString("en-CA")}</strong> sq ft</span> : null}
              {price ? (
                <span
                  data-testid="luxury-flagship-price"
                  style={{
                    // Solid navy pill so the asking price always stands
                    // out regardless of the parent surface (cream, dark
                    // hero backdrop, or listing card ground-tile bleed).
                    background: "#0F2A5B",
                    color: "#F5A623",
                    padding: "6px 14px",
                    borderRadius: 999,
                    fontFamily: "'Sora', sans-serif",
                    fontSize: "1rem",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    boxShadow: "0 4px 12px rgba(15,42,91,0.25)",
                  }}
                >
                  ${Number(price).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : null}
              <span style={{ color: "#8A6D2E" }}>MLS® {FLAGSHIP.mls_number}</span>
            </div>
          )}
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
          <div
            role="button"
            tabIndex={0}
            onClick={() => setLightboxOpen(true)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightboxOpen(true); } }}
            data-testid="luxury-flagship-hero"
            aria-label={`Open ${galleryPhotos.length}-photo gallery for ${address}`}
            style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat",
            backgroundColor: "#0F2A5B",
            // Aspect ratio matches typical DSLR 3:2 marketing photography so
            // the full front elevation is visible without cropping the tree
            // canopy or landscape lighting at the base of the frame.
            aspectRatio: "3 / 2", minHeight: 260, maxHeight: 720,
            position: "relative", cursor: "pointer",
          }}>
            {FLAGSHIP.mls_number && FLAGSHIP.realtor_ca_url && (
              <a
                href={FLAGSHIP.realtor_ca_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                data-testid="luxury-flagship-photo-mls-chip"
                title="View this listing on realtor.ca"
                style={{
                  position: "absolute", top: 16, right: 16,
                  background: "#DABF7A", color: "#0F2A5B",
                  fontFamily: "Inter,sans-serif", fontSize: "0.72rem", fontWeight: 700,
                  letterSpacing: "0.14em", padding: "6px 12px", borderRadius: 4,
                  textTransform: "uppercase", textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                }}
              >MLS® {FLAGSHIP.mls_number} ↗</a>
            )}
          </div>
        </div>
        {/* Tour actions — moved below the photo to keep the image clean. */}
        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
          marginTop: 24,
        }}>
          <a href={FLAGSHIP.matterport} target="_blank" rel="noopener noreferrer" data-testid="flagship-matterport" style={{
            background: "#0F2A5B", color: "white", padding: "12px 24px", borderRadius: 999,
            fontFamily: "Sora,sans-serif", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none",
          }}>3D Matterport Tour ↗</a>
          <a href={FLAGSHIP.virtual_tour_iframe} target="_blank" rel="noopener noreferrer" data-testid="flagship-cotala" style={{
            background: "transparent", color: "#0F2A5B",
            border: "1px solid rgba(15,42,91,0.35)",
            padding: "12px 24px", borderRadius: 999,
            fontFamily: "Sora,sans-serif", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none",
          }}>Virtual Tour ↗</a>
          {galleryPhotos.length > 1 && (
            <button
              onClick={() => setLightboxOpen(true)}
              data-testid="luxury-flagship-view-photos"
              style={{
                background: "transparent", color: "#0F2A5B",
                border: "1px solid rgba(15,42,91,0.35)",
                padding: "12px 24px", borderRadius: 999, cursor: "pointer",
                fontFamily: "Sora,sans-serif", fontWeight: 600, fontSize: "0.9rem",
              }}
            >📷 View all {galleryPhotos.length} photos</button>
          )}
        </div>
      </div>
      <ListingPhotoLightbox
        photos={galleryPhotos}
        startIndex={0}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        listingLabel={`${address}, ${city}`}
      />
    </section>
  );
}
