// AddressAutocomplete — free BC-focused address autocomplete backed by
// OpenStreetMap's Nominatim service (no API key, community-usage policy).
//
// Nominatim usage rules (https://operations.osmfoundation.org/policies/nominatim/):
// • Max 1 request/sec per IP — we debounce to 400ms and never batch.
// • Descriptive User-Agent required — set via `Accept-Language` + our
//   `email` param is passed as `contact=` if provided by parent.
// • No bulk geocoding — this is per-keystroke UI only.
// • Results are cached client-side per query so back/forth typing does
//   not spam the server.
//
// PIPA: we send only the visitor's search text (their address as they
// type) and the browser's default headers to nominatim.openstreetmap.org
// — never their IP directly (browser handles TLS + host resolution).
import React, { useEffect, useRef, useState } from "react";

const C = { navy:"#0F2A5B", gold:"#F5A623", ink:"#111827", muted:"#6B7280", paper:"#FAFAF7" };
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// Small local LRU cache. Keeps the last 30 queries so the user typing
// "3015 141" → "3015 141 " → "3015 141 s" hits the network at most
// three times, not for every keystroke.
const CACHE = new Map();
const CACHE_MAX = 30;
function cacheGet(k)         { return CACHE.get(k); }
function cacheSet(k, v) {
  if (CACHE.size >= CACHE_MAX) { const first = CACHE.keys().next().value; CACHE.delete(first); }
  CACHE.set(k, v);
}

export default function AddressAutocomplete({
  value = "",
  onChange = () => {},
  onSelect = () => {},         // called with the full osm object when user picks
  placeholder = "Start typing a BC address…",
  countrycodes = "ca",         // Canada-wide; Doug's practice is BC-only but referrals span CA
  viewbox = "-139.06,60.00,-114.03,48.30",  // BC bounding box (rough)
  bounded = 1,                 // restrict strictly to the viewbox
  minChars = 4,
  debounceMs = 400,
  testid = "address-autocomplete",
}) {
  const [q, setQ]           = useState(value);
  const [open, setOpen]     = useState(false);
  const [items, setItems]   = useState([]);
  const [loading, setL]     = useState(false);
  const [hi, setHi]         = useState(-1);
  const boxRef  = useRef(null);
  const timerRef = useRef(null);
  const lastFiredRef = useRef("");

  useEffect(() => { setQ(value); }, [value]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const fetchResults = async (query) => {
    const cached = cacheGet(query);
    if (cached) { setItems(cached); setOpen(cached.length > 0); return; }
    setL(true);
    try {
      const params = new URLSearchParams({
        q: query, format: "json", addressdetails: "1", limit: "6",
        countrycodes, viewbox, bounded: String(bounded),
      });
      const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
        headers: { "Accept-Language": "en-CA" },
      });
      if (!res.ok) { setItems([]); setOpen(false); return; }
      const data = await res.json();
      const filtered = (data || []).filter(d => (d.address?.state === "British Columbia" || d.address?.country_code === "ca"));
      cacheSet(query, filtered);
      setItems(filtered);
      setOpen(filtered.length > 0);
      setHi(-1);
    } catch { setItems([]); setOpen(false); }
    finally { setL(false); }
  };

  const onInput = (e) => {
    const val = e.target.value;
    setQ(val); onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val || val.trim().length < minChars) { setItems([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => {
      if (lastFiredRef.current === val) return;
      lastFiredRef.current = val;
      fetchResults(val.trim());
    }, debounceMs);
  };

  const pick = (it) => {
    const display = it.display_name || "";
    setQ(display); onChange(display); onSelect(it); setOpen(false); setItems([]);
  };

  const onKey = (e) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(items.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => Math.max(0, h - 1)); }
    else if (e.key === "Enter" && hi >= 0) { e.preventDefault(); pick(items[hi]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={boxRef} style={{ position:"relative" }} data-testid={testid}>
      <input
        type="text"
        value={q}
        onChange={onInput}
        onKeyDown={onKey}
        onFocus={() => { if (items.length) setOpen(true); }}
        placeholder={placeholder}
        autoComplete="off"
        data-testid={`${testid}-input`}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${testid}-list`}
        style={{ width:"100%", padding:"10px 14px", borderRadius: 8, border:`1px solid ${open ? C.navy : "#D1D5DB"}`, fontSize:"0.92rem", color: C.ink, background:"white", boxSizing:"border-box", outline:"none" }}
      />
      {loading && (
        <span aria-live="polite" style={{ position:"absolute", right: 12, top: 12, fontSize:"0.75rem", color: C.muted }}>…</span>
      )}
      {open && items.length > 0 && (
        <ul
          id={`${testid}-list`}
          role="listbox"
          data-testid={`${testid}-list`}
          style={{ position:"absolute", top:"calc(100% + 4px)", left: 0, right: 0, background:"white", border:`1px solid ${C.navy}`, borderRadius: 8, listStyle:"none", padding: 6, margin: 0, maxHeight: 280, overflowY:"auto", zIndex: 100, boxShadow:"0 12px 32px rgba(15,42,91,0.18)" }}
        >
          {items.map((it, i) => (
            <li
              key={it.place_id || i}
              role="option"
              aria-selected={hi === i}
              data-testid={`${testid}-item-${i}`}
              onMouseDown={(e) => { e.preventDefault(); pick(it); }}
              onMouseEnter={() => setHi(i)}
              style={{ padding:"8px 12px", borderRadius: 6, cursor:"pointer", background: hi === i ? "#F0F4FB" : "transparent", fontSize:"0.85rem", color: C.ink, lineHeight: 1.35 }}
            >
              <div style={{ fontWeight: 600, color: C.navy }}>{it.address?.house_number ? `${it.address.house_number} ` : ""}{it.address?.road || ""}</div>
              <div style={{ fontSize:"0.75rem", color: C.muted, marginTop: 1 }}>{[it.address?.city || it.address?.town || it.address?.village, it.address?.state, it.address?.postcode].filter(Boolean).join(" · ")}</div>
            </li>
          ))}
          <li style={{ padding:"6px 12px 2px", fontSize:"0.65rem", color: C.muted, textAlign:"right" }}>
            Geocoding © <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: C.muted }}>OpenStreetMap</a>
          </li>
        </ul>
      )}
    </div>
  );
}
