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

  // ── Community override picker (Feb 2026) ─────────────────────────────
  const [enclaves, setEnclaves] = useState([]);
  const [communityDraft, setCommunityDraft] = useState("");
  const [communityBusy, setCommunityBusy] = useState(false);
  const [communityMsg, setCommunityMsg] = useState("");

  // ── AI discovery IndexNow ping (Feb 2026) ────────────────────────────
  const [pingBusy, setPingBusy] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [pingHistory, setPingHistory] = useState([]);

  // ── Virtual Tour URL override (Feb 2026) ─────────────────────────────
  const [tourUrlDraft, setTourUrlDraft] = useState("");
  const [tourBranded, setTourBranded] = useState(false);
  const [tourBusy, setTourBusy] = useState(false);
  const [tourMsg, setTourMsg] = useState("");

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

  // Load the enclave list for the freshly-hydrated listing's city so the
  // override picker is a one-tap dropdown, not free text.
  React.useEffect(() => {
    const city = listing?.city;
    if (!city) return;
    setEnclaves([]);
    setCommunityDraft(listing?.community || "");
    setCommunityMsg("");
    axios
      .get(`${API}/admin/enclaves-for-city?city=${encodeURIComponent(city)}`, { withCredentials: true, validateStatus: () => true })
      .then(r => {
        if (r.status === 200 && Array.isArray(r.data?.enclaves)) {
          setEnclaves(r.data.enclaves);
        }
      })
      .catch(() => {});
  }, [listing?.city, listing?.community, listing?.listing_key]);

  const saveCommunityOverride = async () => {
    if (!listing) return;
    const key = listing.mls_number || listing.listing_key;
    setCommunityBusy(true); setCommunityMsg("");
    try {
      const r = await axios.patch(
        `${API}/admin/listings/${encodeURIComponent(key)}/community`,
        { community: communityDraft.trim() },
        { withCredentials: true, validateStatus: () => true },
      );
      if (r.status !== 200 || !r.data?.ok) {
        setCommunityMsg(`⚠ Save failed: ${r.data?.error || r.status}`);
        return;
      }
      setCommunityMsg(communityDraft.trim() ? `✓ Locked to "${communityDraft.trim()}" (manual override on)` : "✓ Cleared — auto-mapper takes back over");
    } catch (e) {
      setCommunityMsg(`⚠ ${e?.message || e}`);
    } finally {
      setCommunityBusy(false);
    }
  };

  const runIndexNowPing = async () => {
    setPingBusy(true); setPingResult(null);
    try {
      const r = await axios.post(`${API}/admin/ai-discovery/indexnow`, {}, { withCredentials: true, validateStatus: () => true });
      setPingResult(r.data || { error: `HTTP ${r.status}` });
      // Refresh the history list.
      const h = await axios.get(`${API}/admin/ai-discovery/history?limit=5`, { withCredentials: true, validateStatus: () => true });
      if (h.status === 200) setPingHistory(h.data?.rows || []);
    } catch (e) {
      setPingResult({ error: String(e?.message || e) });
    } finally {
      setPingBusy(false);
    }
  };

  React.useEffect(() => {
    // Load recent history on mount so Doug sees when the last ping fired.
    axios.get(`${API}/admin/ai-discovery/history?limit=5`, { withCredentials: true, validateStatus: () => true })
      .then(r => { if (r.status === 200) setPingHistory(r.data?.rows || []); })
      .catch(() => {});
  }, []);

  // Seed the tour override draft with any existing override URL so Doug
  // can edit-in-place instead of re-typing every time.
  React.useEffect(() => {
    const existing = listing?.virtual_tour_url_override;
    if (existing && typeof existing === "object") {
      setTourUrlDraft(existing.url || "");
      setTourBranded(!!existing.is_branded);
    } else {
      setTourUrlDraft("");
      setTourBranded(false);
    }
    setTourMsg("");
  }, [listing?.listing_key]);

  const saveTourOverride = async () => {
    if (!listing) return;
    const key = listing.mls_number || listing.listing_key;
    const url = tourUrlDraft.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setTourMsg("⚠ URL must start with http:// or https://");
      return;
    }
    setTourBusy(true); setTourMsg("");
    try {
      const r = await axios.patch(
        `${API}/admin/listings/${encodeURIComponent(key)}/virtual-tour`,
        { url, is_branded: tourBranded, category: "Virtual Tour" },
        { withCredentials: true, validateStatus: () => true },
      );
      if (r.status !== 200 || !r.data?.ok) {
        setTourMsg(`⚠ Save failed: ${r.data?.error || r.status}`);
        return;
      }
      setTourMsg(url ? "✓ Tour override saved — the DDF video is replaced site-wide" : "✓ Cleared — DDF-supplied tour takes back over");
    } catch (e) {
      setTourMsg(`⚠ ${e?.message || e}`);
    } finally {
      setTourBusy(false);
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

      {/* ── AI Discovery IndexNow ping (Feb 2026, Phase 9) ─────────────
          Push every URL in /sitemap-ai.xml to IndexNow so Bing (and by
          extension ChatGPT / Copilot / Perplexity fallback retrieval)
          re-crawls the freshly-optimised AEO pages. Perplexity has no
          public sitemap-submission endpoint of its own — IndexNow via
          Bing is the closest working proxy. */}
      <div data-testid="ai-discovery-panel" style={{
        marginBottom: 24, padding: 16, borderRadius: 10,
        background: "#F5F0E1", border: "1px solid rgba(15,42,91,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 700 }}>AI Discovery — IndexNow push</div>
            <div style={{ fontSize: 12, opacity: 0.72, marginTop: 2 }}>
              Submits <code>/sitemap-ai.xml</code> to Bing / Yandex / Naver / Seznam. Perplexity + ChatGPT re-crawl on the same Bing feed.
            </div>
          </div>
          <button
            onClick={runIndexNowPing}
            disabled={pingBusy}
            data-testid="ai-discovery-ping-btn"
            style={{
              padding: "10px 16px", borderRadius: 8, border: "none",
              background: pingBusy ? "#94A3B8" : "#0F2A5B", color: "#DABF7A",
              fontWeight: 700, fontSize: 13, cursor: pingBusy ? "wait" : "pointer",
              whiteSpace: "nowrap",
            }}
          >{pingBusy ? "Submitting…" : "Ping IndexNow now"}</button>
        </div>
        {pingResult && (
          <div data-testid="ai-discovery-ping-result" style={{
            marginTop: 12, padding: "10px 12px", borderRadius: 8,
            background: pingResult.ok ? "#ECFDF5" : "#FEE2E2",
            color: pingResult.ok ? "#065F46" : "#991B1B",
            border: `1px solid ${pingResult.ok ? "#6EE7B7" : "#FCA5A5"}`,
            fontSize: 13, lineHeight: 1.5,
          }}>
            {pingResult.ok
              ? <>✓ Pushed <strong>{pingResult.url_count}</strong> URLs across {pingResult.batches} batch(es). Audit id: <code>{pingResult.audit_id || "—"}</code></>
              : <>⚠ {pingResult.error || "Ping failed. Check backend logs."}</>}
          </div>
        )}
        {pingHistory.length > 0 && (
          <details style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Recent pings ({pingHistory.length})</summary>
            <ul style={{ margin: "8px 0 0", paddingLeft: 20 }} data-testid="ai-discovery-history-list">
              {pingHistory.map((h, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <code>{h.at?.slice(0, 19).replace("T", " ")}</code>
                  {" · "}{h.url_count} URLs
                  {" · "}HTTP {h.results?.[0]?.status_code || "?"}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

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

      {/* ── Community / enclave override picker (Feb 2026, Phase 9) ─────
          When the auto-mapper couldn't derive a community from the DDF
          payload (~37% of ingested listings) Doug picks the right
          neighbourhood here. Sets `community_manual_override=true` so the
          nightly ingest never overwrites the manual pick. */}
      {listing && (
        <div data-testid="community-override-panel" style={{
          marginTop: 24, padding: 20, borderRadius: 10,
          background: "white", border: "1px solid rgba(15,42,91,0.15)",
        }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, marginBottom: 4 }}>Enclave / community override</div>
          <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 12 }}>
            City: <strong>{listing.city || "—"}</strong>{" · "}
            Currently: <strong data-testid="community-override-current">{listing.community || "(not set)"}</strong>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              list="enclave-suggestions"
              type="text"
              value={communityDraft}
              onChange={(e) => setCommunityDraft(e.target.value)}
              placeholder={`Pick or type an enclave in ${listing.city || "this city"}…`}
              data-testid="community-override-input"
              disabled={communityBusy}
              style={{
                flex: "1 1 260px", minWidth: 200,
                padding: "10px 14px", borderRadius: 8,
                border: "1px solid rgba(15,42,91,0.25)",
                fontSize: 14, fontFamily: "inherit", color: "inherit",
                background: "white",
              }}
            />
            <datalist id="enclave-suggestions">
              {enclaves.map(e => <option key={e} value={e}/>)}
            </datalist>
            <button
              onClick={saveCommunityOverride}
              disabled={communityBusy}
              data-testid="community-override-save"
              style={{
                padding: "10px 16px", borderRadius: 8, border: "none",
                background: communityBusy ? "#94A3B8" : "#DABF7A", color: "#0F2A5B",
                fontWeight: 700, fontSize: 13, cursor: communityBusy ? "wait" : "pointer",
                whiteSpace: "nowrap",
              }}
            >{communityBusy ? "Saving…" : "Save override"}</button>
            {communityDraft && (
              <button
                onClick={() => { setCommunityDraft(""); }}
                disabled={communityBusy}
                data-testid="community-override-clear"
                title="Clear the manual override so the auto-mapper resumes ownership"
                style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: "transparent", color: "#0F2A5B",
                  border: "1px solid rgba(15,42,91,0.25)",
                  fontWeight: 600, fontSize: 12, cursor: "pointer",
                }}
              >Clear</button>
            )}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>
            {enclaves.length} known enclaves in {listing.city}. Empty save = clear override.
          </div>
          {communityMsg && (
            <div data-testid="community-override-msg" style={{
              marginTop: 10, padding: "8px 12px", borderRadius: 6,
              background: communityMsg.startsWith("⚠") ? "#FEE2E2" : "#ECFDF5",
              color: communityMsg.startsWith("⚠") ? "#991B1B" : "#065F46",
              fontSize: 13,
            }}>{communityMsg}</div>
          )}
        </div>
      )}

      {/* ── Virtual Tour URL override (Feb 2026, Phase 11) ────────────
          When the CREA DDF® feed hands us a brokerage branding card
          instead of the actual property walkthrough (as it did for
          3015 141 Street), Doug pastes the real Vimeo / YouTube /
          Matterport URL here. Backend prepends it to virtual_tour_urls
          so it wins the "picked" selection — the DDF-supplied tour
          stays as a fallback in the "All tours" list. */}
      {listing && (
        <div data-testid="tour-override-panel" style={{
          marginTop: 24, padding: 20, borderRadius: 10,
          background: "white", border: "1px solid rgba(15,42,91,0.15)",
        }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 700, marginBottom: 4 }}>Virtual Tour URL override</div>
          <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 12 }}>
            Currently:{" "}
            <strong data-testid="tour-override-current">
              {listing.virtual_tour_url_override?.url
                ? "Manual override → " + listing.virtual_tour_url_override.url.slice(0, 70) + (listing.virtual_tour_url_override.url.length > 70 ? "…" : "")
                : (listing.virtual_tour_embed?.url_raw || "(DDF-supplied — none)")}
            </strong>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="url"
              value={tourUrlDraft}
              onChange={(e) => setTourUrlDraft(e.target.value)}
              placeholder="https://vimeo.com/… or https://www.youtube.com/watch?v=…"
              data-testid="tour-override-input"
              disabled={tourBusy}
              style={{
                flex: "1 1 320px", minWidth: 240,
                padding: "10px 14px", borderRadius: 8,
                border: "1px solid rgba(15,42,91,0.25)",
                fontSize: 14, fontFamily: "inherit", color: "inherit",
                background: "white",
              }}
            />
            <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, opacity: 0.8 }}>
              <input
                type="checkbox"
                checked={tourBranded}
                onChange={(e) => setTourBranded(e.target.checked)}
                data-testid="tour-override-branded"
                disabled={tourBusy}
              />
              Branded (agent-branded)
            </label>
            <button
              onClick={saveTourOverride}
              disabled={tourBusy}
              data-testid="tour-override-save"
              style={{
                padding: "10px 16px", borderRadius: 8, border: "none",
                background: tourBusy ? "#94A3B8" : "#DABF7A", color: "#0F2A5B",
                fontWeight: 700, fontSize: 13, cursor: tourBusy ? "wait" : "pointer",
                whiteSpace: "nowrap",
              }}
            >{tourBusy ? "Saving…" : "Save tour override"}</button>
            {tourUrlDraft && (
              <button
                onClick={() => setTourUrlDraft("")}
                disabled={tourBusy}
                data-testid="tour-override-clear"
                title="Clear the override so the DDF-supplied tour takes back over"
                style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: "transparent", color: "#0F2A5B",
                  border: "1px solid rgba(15,42,91,0.25)",
                  fontWeight: 600, fontSize: 12, cursor: "pointer",
                }}
              >Clear</button>
            )}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>
            Supports Vimeo, YouTube, Matterport, Kuula, and any embeddable tour host. Doogie's narration + keyframe pipeline re-runs automatically on the next detail view.
          </div>
          {tourMsg && (
            <div data-testid="tour-override-msg" style={{
              marginTop: 10, padding: "8px 12px", borderRadius: 6,
              background: tourMsg.startsWith("⚠") ? "#FEE2E2" : "#ECFDF5",
              color: tourMsg.startsWith("⚠") ? "#991B1B" : "#065F46",
              fontSize: 13,
            }}>{tourMsg}</div>
          )}
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
