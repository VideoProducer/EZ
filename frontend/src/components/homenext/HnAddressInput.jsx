import React, { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Apple-style BC Geocoder autocomplete — same /api/valuation/geocode
// endpoint as the live form (DataBC), restyled for the hn design system.
export const HnAddressInput = ({ value, onChange, autoFocus = false }) => {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const picked = useRef("");

  useEffect(() => {
    const q = (value || "").trim();
    if (q.length < 3 || q === picked.current) { setResults([]); setOpen(false); return; }
    setBusy(true);
    const h = setTimeout(() => {
      fetch(`${API}/api/valuation/geocode?q=${encodeURIComponent(q)}&max_results=5`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { setResults(d?.results || []); setOpen(true); })
        .catch(() => setResults([]))
        .finally(() => setBusy(false));
    }, 300);
    return () => clearTimeout(h);
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (r) => { picked.current = r.full_address; setResults([]); setOpen(false); onChange(r.full_address, { locality: r.locality }); };

  return (
    <div ref={box} className="hn-addr">
      <div className="hn-addr__field">
        <MapPin size={18} strokeWidth={1.8} className="hn-addr__pin"/>
        <input
          type="text" required autoFocus={autoFocus} autoComplete="off"
          value={value || ""}
          onChange={e => onChange(e.target.value, null)}
          onFocus={() => value && value.length >= 3 && results.length && setOpen(true)}
          placeholder="Start typing your BC address"
          aria-label="Property address"
          data-testid="vn-address-input"
        />
      </div>
      {open && results.length > 0 && (
        <div className="hn-addr__list" data-testid="vn-address-results">
          {results.map((r, i) => (
            <button type="button" key={i} onClick={() => pick(r)} data-testid={`vn-address-result-${i}`}>
              <strong>{r.full_address}</strong>
              {r.locality && <span>{r.locality}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="hn-addr__help">{busy ? "Looking up address…" : "Powered by DataBC address lookup. General information only."}</div>
    </div>
  );
};
