// EZtoFind.ca — Tiny inline SVG sparkline for admin dashboard trend chips.
// Renders a 30-value bar sparkline in ~130px × 24px. Zero deps, zero styles
// leaks; the parent controls placement.

import React from "react";

export default function Sparkline({ values = [], width = 130, height = 24, testId = "sparkline", trend = "flat" }) {
  if (!values || values.length === 0) {
    return null;
  }
  const max = Math.max(1, ...values);
  const barW = width / values.length;
  const trendColor = trend === "up" ? "#DC2626" : (trend === "down" ? "#059669" : "#2563EB");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      data-testid={testId}
      aria-label={`30-day trend, ${values.length} data points, direction ${trend}`}
      style={{ display: "block" }}
    >
      {values.map((v, i) => {
        const h = Math.max(1, Math.round((v / max) * (height - 2)));
        const y = height - h;
        const x = i * barW;
        return (
          <rect
            key={i}
            x={x + 0.5}
            y={y}
            width={Math.max(0.8, barW - 1)}
            height={h}
            fill={trendColor}
            fillOpacity={v === 0 ? 0.15 : (0.55 + 0.45 * (v / max))}
            rx={0.5}
          />
        );
      })}
    </svg>
  );
}
