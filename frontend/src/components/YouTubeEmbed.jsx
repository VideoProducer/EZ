// ── Responsive YouTube Embed (Feb 2026, Phase 13) ──────────────────────
// 16:9 responsive iframe wrapper used on the homepage + luxury flagship
// page to embed a specific walk-through video (currently JS_oWYNOdTU for
// 3015 141 Street). Uses `youtube-nocookie.com` per our Phase 10 policy
// so the player loads under Safari ITP + mobile ad-blockers without
// setting 3rd-party cookies. Autoplay OFF by default — the user taps
// play so we don't burn cellular data on scroll-past.
import React from "react";

export const YouTubeEmbed = ({
  videoId,
  title = "Property walk-through",
  testId,
  autoplay = false,
}) => {
  if (!videoId) return null;
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1${autoplay ? "&autoplay=1&mute=1" : ""}`;
  return (
    <div
      data-testid={testId}
      style={{
        position: "relative",
        width: "100%",
        paddingTop: "56.25%",  // 16:9 aspect ratio
        borderRadius: 12,
        overflow: "hidden",
        background: "#000",
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
      }}
    >
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
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
