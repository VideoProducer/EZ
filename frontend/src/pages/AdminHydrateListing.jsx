// EZtoFind.ca — Admin: Hydrate Listing by MLS® Number
// URL: /admin/hydrate-listing
//
// One-click tool for Doug to force-import a specific listing from CREA DDF®
// into the local Mongo without waiting for the next scheduled sync cycle.
// Used when a listing has just gone live on the MLS® and Doug wants it
// searchable + hydrated across the site immediately (e.g. his flagship
// listing needs to be findable in the filter card the moment it hits DDF).
//
// Compliance: Read-only DDF fetch → upsert. Respects the same BC filter +
// display-flag rules as the scheduled sync. Never surfaces listings that
// aren't authorized for public display via CREA rules.

import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminHydrateListing() {
  const [mls, setMls] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e?.preventDefault();
    const cleaned = (mls || "").trim().toUpperCase();
    if (!cleaned) { setError("Enter an MLS® number (e.g. R3156192)"); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await axios.post(
        `${API}/admin/listings/fetch-by-mls/${encodeURIComponent(cleaned)}`,
        {},
        { withCredentials: true, validateStatus: () => true },
      );
      if (r.status === 401 || r.status === 403) {
        setError("Not authenticated. Sign in at /admin/login and try again.");
        return;
      }
      const data = r.data || {};
      if (!data.ok) {
        setError((data.errors || []).join(", ") || "Fetch failed. Check the MLS® number.");
        setResult(data);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const listing = result?.listing;
  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: "0 20px", fontFamily: "Inter, system-ui, sans-serif", color: "#0F2A5B" }}>
      <div style={{ marginBottom: 20, fontSize: 12, opacity: 0.7 }}>
        <Link to="/admin/dashboard" style={{ color: "inherit" }}>← Admin</Link>
      </div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", margin: "0 0 8px" }}>Hydrate Listing from CREA DDF®</h1>
      <p style={{ fontSize: 14, opacity: 0.75, margin: "0 0 24px", lineHeight: 1.5 }}>
        Force-import a specific listing by its MLS® number. Use this when a
        just-listed home needs to be searchable on EZtoFind immediately,
        before the next scheduled DDF sync cycle catches it.
      </p>

      <form onSubmit={submit} style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input
          type="text"
          value={mls}
          onChange={(e) => setMls(e.target.value)}
          placeholder="MLS® number (e.g. R3156192)"
          data-testid="hydrate-mls-input"
          disabled={busy}
          style={{
            flex: "1 1 240px", minWidth: 200,
            padding: "12px 16px", borderRadius: 8,
            border: "1px solid rgba(15,42,91,0.25)",
            fontSize: 16, fontFamily: "inherit", color: "inherit",
            background: "white",
          }}
        />
        <button
          type="submit"
          disabled={busy || !mls.trim()}
          data-testid="hydrate-mls-submit"
          style={{
            padding: "12px 20px", borderRadius: 8, border: "none",
            background: busy ? "#94A3B8" : "#DABF7A",
            color: "#0F2A5B", fontWeight: 700, fontSize: 15,
            cursor: busy ? "wait" : "pointer",
          }}
        >{busy ? "Fetching…" : "Fetch from CREA DDF®"}</button>
      </form>

      {error && (
        <div data-testid="hydrate-error" style={{
          padding: 16, borderRadius: 8,
          background: "#FEE2E2", color: "#991B1B",
          border: "1px solid #FCA5A5",
          marginBottom: 16, fontSize: 14, lineHeight: 1.5,
        }}>{error}</div>
      )}

      {listing && (
        <div data-testid="hydrate-success" style={{
          padding: 20, borderRadius: 10,
          background: "#ECFDF5", border: "1px solid #6EE7B7",
          fontSize: 14, lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 700, color: "#065F46", marginBottom: 12 }}>✓ Upserted to Mongo</div>
          <div><strong>MLS®:</strong> {listing.mls_number || "—"}</div>
          <div><strong>Address:</strong> {listing.address || listing.street_address || "—"}, {listing.city || "—"}</div>
          <div><strong>Price:</strong> ${(listing.price || listing.list_price || 0).toLocaleString("en-CA")}</div>
          <div><strong>Beds / Baths / SqFt:</strong> {listing.bedrooms || listing.beds || "—"} / {listing.bathrooms || listing.baths || "—"} / {(listing.square_feet || listing.living_area || 0).toLocaleString("en-CA")}</div>
          <div><strong>Photos:</strong> {Array.isArray(listing.photos) ? listing.photos.length : 0}</div>
          <div style={{ marginTop: 12 }}>
            <a href={`/listings/${listing.mls_number || listing.listing_key}`} target="_blank" rel="noopener noreferrer" style={{ color: "#0F2A5B", fontWeight: 600 }}>View on EZtoFind →</a>
          </div>
        </div>
      )}
    </div>
  );
}
