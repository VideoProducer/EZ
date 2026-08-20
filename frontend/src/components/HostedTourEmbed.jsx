// ── Hosted Tour Embed (Feb 2026, Phase 14) ─────────────────────────────
// Responsive 16:9 wrapper for any hosted real-estate tour URL that
// serves an embeddable iframe out-of-the-box — Cotala, Matterport,
// Kuula, iGuide, Cupix, etc. These platforms are purpose-built for
// third-party embedding and (unlike YouTube/Vimeo) don't hand a "disable
// embedding" toggle to the video owner, so embeds keep working even if
// the listing's tour link is passed around widely.
//
// Sits alongside <YouTubeEmbed/> — pick whichever matches the source
// URL. When both are set on a listing, prefer the hosted-tour URL
// (embed-safe by design).
import React from "react";

export const HostedTourEmbed = ({
  url,
  title = "Property walk-through",
  testId,
  aspectRatio = "56.25%",  // default 16:9
}) => {
  if (!url) return null;
  return (
    <div
      data-testid={testId}
      style={{
        position: "relative",
        width: "100%",
        paddingTop: aspectRatio,
        borderRadius: 12,
        overflow: "hidden",
        background: "#000",
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
      }}
    >
      <iframe
        src={url}
        title={title}
        // Hosted-tour providers vary in what they need — grant the
        // superset commonly used across Cotala / Matterport / Kuula
        // so features like fullscreen, VR mode, and audio work.
        allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope; magnetometer; autoplay; clipboard-write"
        allowFullScreen
        scrolling="no"
        loading="lazy"
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: "100%",
          height: "100%",
          border: 0,
        }}
      />
    </div>
  );
};
