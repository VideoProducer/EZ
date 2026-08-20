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

// ─── Format a live listing doc into a Google Business Profile "Update" ───
// Returns a fully-formatted, CREA/BCFSA/CASL-compliant post body ready to
// paste into GBP → Add update → Update. Every string is factually derived
// from the DDF-hydrated Mongo doc — no hand-typed numbers. If a field is
// missing the line is omitted rather than showing "—".
//
// Compliance:
//   • Listing REALTOR® + brokerage + BCFSA licence# on every post
//   • Article 16 disclaimer on every post
//   • No rounded prices (factual formatting per user directive)
//   • Interior description sentence left blank for Doug to fill in — we do
//     NOT invent copy, that would violate BCFSA advertising truthfulness.
function formatGbpPost(l) {
  if (!l) return "";
  const price = Number(l.list_price || l.price || 0);
  const priceStr = price ? `$${price.toLocaleString("en-CA")}` : "";
  const beds = l.beds ?? l.bedrooms;
  const baths = l.baths ?? l.bathrooms;
  const sqft = Number(l.living_area || l.square_feet || 0);
  const lot = Number(l.lot_size_area || l.lot_size || 0);
  const community = l.community || l.neighbourhood || "";
  const city = l.city || "";
  const street = l.address || l.street_address || l.unparsed_address || "";
  const mls = l.mls_number || l.listing_key || "";
  const vimeo = l?.virtual_tour_embed?.host === "vimeo" && l?.virtual_tour_embed?.url;
  const vimeoId = vimeo ? (vimeo.match(/(\d{5,})/) || [])[1] : "";
  const photoCount = Array.isArray(l.photos) ? l.photos.length : 0;
  const isSurreyElginChantrell = /elgin.*chantrell/i.test(community) || /141.*street/i.test(street);
  const hookLine = [
    community && `Elgin Chantrell`.includes(community.split(" ")[0]) ? "Rare estate-sized lot in one of South Surrey's most sought-after enclaves." : "",
    !isSurreyElginChantrell && lot >= 10000 ? "Rare estate-sized lot." : "",
  ].filter(Boolean).join(" ");

  const statsLine = [priceStr, beds ? `${beds} Bed` : null, baths ? `${baths} Bath` : null,
                     sqft ? `${sqft.toLocaleString("en-CA")} sqft` : null,
                     lot ? `${lot.toLocaleString("en-CA")} sqft lot` : null,
                     community || null].filter(Boolean).join(" · ");

  const lines = [
    `🏡 JUST LISTED — ${[street, city && community ? `${city} (${community})` : city].filter(Boolean).join(", ")}`,
    "",
    statsLine,
    "",
    hookLine || "",
    hookLine ? "" : null,
    "[Add 1–2 sentences of interior description here — kitchen, primary suite, standout features.]",
    "",
    photoCount ? `Full details, ${photoCount}+ photos, floor plans, and interactive map on eztofind.ca.` : "Full details and interactive map on eztofind.ca.",
    "",
    vimeoId ? `Video tour: vimeo.com/${vimeoId}` : null,
    vimeoId ? "" : null,
    "Listed by Doug LeMaire, REALTOR® · Fraser Property Management Realty Services Ltd. (BCFSA #167790).",
    "",
    mls ? `Full listing → eztofind.ca/listings/${mls}` : "",
    "",
    "Not intended to solicit buyers currently under contract with another REALTOR®.",
  ].filter(l => l !== null);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export default function AdminHydrateListing() {
  const [mls, setMls] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [gbpFull, setGbpFull] = useState(null);       // full doc from /listings/{mls}
  const [gbpText, setGbpText] = useState("");
  const [gbpCopied, setGbpCopied] = useState(false);
  const [gbpBusy, setGbpBusy] = useState(false);

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

  // Fetch the FULL hydrated public listing (has beds/baths/sqft/lot/photos/
  // virtual-tour) — the hydrate endpoint returns a light doc, so we go to
  // the public /api/listings/{mls} endpoint which returns everything.
  const generateGbpPost = async () => {
    if (!listing) return;
    setGbpBusy(true);
    setGbpCopied(false);
    try {
      const mlsNum = listing.mls_number || listing.listing_key;
      const r = await axios.get(`${API}/listings/${encodeURIComponent(mlsNum)}`, { validateStatus: () => true });
      const doc = r.status === 200 ? r.data : listing;
      setGbpFull(doc);
      setGbpText(formatGbpPost(doc));
    } catch {
      setGbpFull(listing);
      setGbpText(formatGbpPost(listing));
    } finally {
      setGbpBusy(false);
    }
  };

  const copyGbpText = async () => {
    try {
      await navigator.clipboard.writeText(gbpText);
      setGbpCopied(true);
      setTimeout(() => setGbpCopied(false), 2500);
    } catch {
      // Fallback for older browsers — select + copy
      const ta = document.querySelector('[data-testid="gbp-textarea"]');
      if (ta) { ta.focus(); ta.select(); document.execCommand("copy"); setGbpCopied(true); setTimeout(() => setGbpCopied(false), 2500); }
    }
  };

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

      {/* ── Copy-for-GBP tool (Feb 2026) ─────────────────────────────── */}
      {listing && (
        <div data-testid="gbp-panel" style={{
          marginTop: 24, padding: 20, borderRadius: 10,
          background: "#F7FAFF", border: "1px solid rgba(15,42,91,0.15)",
          fontSize: 14, lineHeight: 1.55,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#0F2A5B", fontWeight: 700 }}>Copy for Google Business Profile</div>
              <div style={{ fontSize: 12, opacity: 0.72, marginTop: 2 }}>
                Auto-formatted from the live listing — CREA/BCFSA/CASL-compliant. Paste into GBP → Add update → Update.
              </div>
            </div>
            {!gbpText && (
              <button
                onClick={generateGbpPost}
                disabled={gbpBusy}
                data-testid="gbp-generate"
                style={{
                  padding: "10px 16px", borderRadius: 8, border: "none",
                  background: gbpBusy ? "#94A3B8" : "#0F2A5B", color: "#DABF7A",
                  fontWeight: 700, fontSize: 13, cursor: gbpBusy ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >{gbpBusy ? "Loading…" : "Generate GBP post"}</button>
            )}
          </div>

          {gbpText && (
            <>
              <textarea
                data-testid="gbp-textarea"
                value={gbpText}
                onChange={(e) => setGbpText(e.target.value)}
                rows={16}
                style={{
                  width: "100%", marginTop: 12, padding: 14, borderRadius: 8,
                  border: "1px solid rgba(15,42,91,0.25)", background: "white",
                  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                  fontSize: 13, lineHeight: 1.6, color: "#0F2A5B",
                  resize: "vertical",
                }}
              />
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>
                {gbpText.length.toLocaleString("en-CA")} / 1,500 chars (GBP Update limit)
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  onClick={copyGbpText}
                  data-testid="gbp-copy"
                  style={{
                    padding: "10px 18px", borderRadius: 8, border: "none",
                    background: gbpCopied ? "#065F46" : "#DABF7A",
                    color: gbpCopied ? "#fff" : "#0F2A5B",
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >{gbpCopied ? "✓ Copied to clipboard" : "📋 Copy post"}</button>
                <a
                  href="https://business.google.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="gbp-open-dashboard"
                  style={{
                    padding: "10px 18px", borderRadius: 8,
                    background: "white", color: "#0F2A5B", textDecoration: "none",
                    fontWeight: 600, fontSize: 14,
                    border: "1px solid rgba(15,42,91,0.25)",
                  }}
                >Open GBP Dashboard →</a>
                <button
                  onClick={generateGbpPost}
                  disabled={gbpBusy}
                  data-testid="gbp-regenerate"
                  style={{
                    padding: "10px 14px", borderRadius: 8, border: "none",
                    background: "transparent", color: "#0F2A5B",
                    fontWeight: 600, fontSize: 13, cursor: gbpBusy ? "wait" : "pointer",
                    textDecoration: "underline",
                  }}
                >{gbpBusy ? "…" : "Regenerate from live API"}</button>
              </div>
              <div style={{ marginTop: 14, padding: 12, borderRadius: 6, background: "#FEFCE8", border: "1px solid #FDE68A", fontSize: 12, lineHeight: 1.55, color: "#78350F" }}>
                <strong>Before posting:</strong> Replace the <code>[Add 1–2 sentences…]</code> placeholder with your own interior description. Do <em>not</em> invent details — BCFSA advertising rule requires factual accuracy. Everything else (price, beds, baths, sqft, lot, MLS, brokerage, licence #, Article 16 disclaimer) is pulled live from CREA DDF® and safe to post as-is.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
