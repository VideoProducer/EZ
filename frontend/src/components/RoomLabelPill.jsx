// ============================================================================
//  RoomLabelPill — floating pill above the photo reel or virtual tour that
//  shows the current room being described by Doogie ("🍳 Kitchen", "🛏 Primary
//  Bedroom"…).  Subscribes to mediaBus.tick from either sourceId; hides itself
//  when no narration is active or the current cue has no room_label.
//
//  Props:
//    sourceId — "doogie-listing" | "doogie-tour"
// ============================================================================
import { useEffect, useState } from "react";
import mediaBus from "../lib/mediaBus";

// Slug → emoji + display label. Kept in sync with vision_narration.py + 
// vision_tour_narration.py room_label enum.
const ROOM_META = {
  kitchen:      { icon: "🍳", label: "Kitchen" },
  living:       { icon: "🛋", label: "Living Room" },
  dining:       { icon: "🍽", label: "Dining Room" },
  primary_bed:  { icon: "🛏", label: "Primary Bedroom" },
  ensuite:      { icon: "🛁", label: "Ensuite" },
  bath:         { icon: "🚿", label: "Bathroom" },
  bed:          { icon: "🛌", label: "Bedroom" },
  office:       { icon: "🧑‍💻", label: "Office" },
  laundry:      { icon: "🧺", label: "Laundry" },
  basement:     { icon: "🪜", label: "Basement" },
  garage:       { icon: "🚗", label: "Garage" },
  deck:         { icon: "🌤", label: "Deck / Patio" },
  yard:         { icon: "🌳", label: "Yard" },
  pool:         { icon: "🏊", label: "Pool" },
  view:         { icon: "🌄", label: "View" },
  exterior:     { icon: "🏡", label: "Exterior" },
  entry:        { icon: "🚪", label: "Entry" },
  foyer:        { icon: "🚪", label: "Foyer" },
  hallway:      { icon: "🚪", label: "Hallway" },
  utility:      { icon: "🛠", label: "Utility" },
  other:        { icon: "✨", label: "" },
};

export default function RoomLabelPill({ sourceId }) {
  const [room, setRoom] = useState(null);

  useEffect(() => {
    const unsub = mediaBus.subscribeTick && mediaBus.subscribeTick((sid, state) => {
      if (sid !== sourceId) return;
      const label = state?.cue?.room_label;
      if (!label) { setRoom(null); return; }
      setRoom(label);
    });
    const unsubClaim = mediaBus.subscribe && mediaBus.subscribe((ev) => {
      if (ev.sourceId !== sourceId) return;
      if (ev.type === "release") setRoom(null);
    });
    return () => { if (unsub) unsub(); if (unsubClaim) unsubClaim(); };
  }, [sourceId]);

  if (!room) return null;
  const meta = ROOM_META[room] || ROOM_META.other;
  if (!meta.label) return null;
  return (
    <div
      data-testid={`room-pill-${sourceId}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "rgba(15, 42, 91, 0.92)",
        color: "#fff",
        padding: "0.4rem 0.85rem",
        borderRadius: 999,
        fontFamily: "Inter, sans-serif",
        fontSize: "0.78rem",
        fontWeight: 600,
        letterSpacing: "0.01em",
        boxShadow: "0 4px 12px rgba(15,42,91,0.35)",
        pointerEvents: "none",
        transition: "opacity 200ms ease",
      }}
    >
      <span style={{fontSize: "0.95rem", lineHeight: 1}}>{meta.icon}</span>
      <span>{meta.label}</span>
    </div>
  );
}
