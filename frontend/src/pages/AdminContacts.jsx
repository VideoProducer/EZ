// EZtoFind.ca — Admin Contacts (Command Center Phase 1 · Slice 1)
// URL: /admin/contacts
//
// One unified, filterable view of every lead-capture surface Doug uses:
// buyer leads, seller leads, and out-of-area referral requests. Ships
// as a zero-external-integrations slice so the follow-on Twilio speed-
// to-lead + Resend broadcast + attribution report slices have a clean
// table + pipeline surface to hang off.
//
// Backend contract:
//   GET /api/admin/contacts?source_type=&stage=&q=&date_from=&date_to=&limit=&offset=
//   PATCH /api/admin/contacts/{source_type}/{id}/stage  body {stage}
//
// Compliance guard: this page NEVER mutates the underlying lead
// document — pipeline stages live in a separate `contact_stages`
// collection so BCFSA / CASL / PIPA audit trails on the source lead
// stay pristine.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AdminShell } from "../App";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOURCE_FILTERS = [
  { value: "all",      label: "All sources",  emoji: "📥" },
  { value: "buyer",    label: "Buyer",        emoji: "🏠" },
  { value: "seller",   label: "Seller",       emoji: "🔑" },
  { value: "referral", label: "Referral",     emoji: "🤝" },
];

const STAGE_META = {
  new:        { label: "New",        bg: "#DBEAFE", fg: "#1E3A8A" },
  contacted:  { label: "Contacted",  bg: "#FEF3C7", fg: "#78350F" },
  nurturing:  { label: "Nurturing",  bg: "#E9D5FF", fg: "#581C87" },
  active:     { label: "Active",     bg: "#DCFCE7", fg: "#065F46" },
  won:        { label: "Won",        bg: "#BBF7D0", fg: "#14532D" },
  lost:       { label: "Lost",       bg: "#FEE2E2", fg: "#991B1B" },
};
const STAGE_ORDER = ["new", "contacted", "nurturing", "active", "won", "lost"];

const SOURCE_EMOJI = { buyer: "🏠", seller: "🔑", referral: "🤝" };

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
};

const daysAgo = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};

const csvEscape = (v) => {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const AdminContacts = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [stageCounts, setStageCounts] = useState({});
  const [sourceCounts, setSourceCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Filter state
  const [sourceType, setSourceType] = useState("all");
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 100;
  // Per-row save state
  const [savingKey, setSavingKey] = useState("");
  const [savedMsg, setSavedMsg] = useState({});

  const fetchContacts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { limit, offset };
      if (sourceType !== "all") params.source_type = sourceType;
      if (stage !== "all")      params.stage = stage;
      if (query)                params.q = query;
      if (dateFrom)             params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        // Push to end-of-day so the range is inclusive.
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        params.date_to = d.toISOString();
      }
      const r = await axios.get(`${API}/admin/contacts`, { params });
      setRows(r.data.results || []);
      setTotal(r.data.total || 0);
      setStageCounts(r.data.stage_counts || {});
      setSourceCounts(r.data.source_counts || {});
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [sourceType, stage, query, dateFrom, dateTo, offset]);

  // Debounce search input; other filters fire immediately.
  useEffect(() => {
    const t = setTimeout(fetchContacts, 250);
    return () => clearTimeout(t);
  }, [fetchContacts]);

  // Reset paginator whenever a filter (except offset) changes.
  useEffect(() => { setOffset(0); }, [sourceType, stage, query, dateFrom, dateTo]);

  const changeStage = async (row, nextStage) => {
    const key = `${row.source_type}:${row.id}`;
    setSavingKey(key);
    try {
      await axios.patch(
        `${API}/admin/contacts/${row.source_type}/${row.id}/stage`,
        { stage: nextStage },
      );
      // Optimistic patch — no need to refetch the whole page.
      setRows((rs) => rs.map((r) =>
        (r.source_type === row.source_type && r.id === row.id)
          ? { ...r, stage: nextStage, stage_updated_at: new Date().toISOString() }
          : r,
      ));
      setSavedMsg((m) => ({ ...m, [key]: "✓" }));
      setTimeout(() => setSavedMsg((m) => { const c = { ...m }; delete c[key]; return c; }), 1200);
    } catch (e) {
      setSavedMsg((m) => ({ ...m, [key]: "⚠" }));
    } finally {
      setSavingKey("");
    }
  };

  const exportCsv = useCallback(() => {
    const header = [
      "Created", "Source", "Stage", "Name", "Email", "Phone",
      "Headline", "Source URL", "CASL consent", "Unsubscribed",
    ];
    const lines = [header.map(csvEscape).join(",")];
    rows.forEach((r) => {
      lines.push([
        fmtDate(r.created_at), r.source_type, r.stage, r.full_name,
        r.email, r.phone, r.headline, r.source,
        r.casl_consent ? "yes" : "no",
        r.unsubscribed ? "yes" : "no",
      ].map(csvEscape).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eztofind-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  const clearFilters = () => {
    setSourceType("all"); setStage("all"); setQuery("");
    setDateFrom(""); setDateTo(""); setOffset(0);
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (sourceType !== "all") n += 1;
    if (stage !== "all") n += 1;
    if (query) n += 1;
    if (dateFrom) n += 1;
    if (dateTo) n += 1;
    return n;
  }, [sourceType, stage, query, dateFrom, dateTo]);

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + rows.length, total);

  return (
    <AdminShell active="contacts">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "2rem", marginTop: 0, marginBottom: "0.25rem" }}>
            📇 Contacts
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", fontFamily: "Inter,sans-serif", fontSize: "0.9rem" }}>
            Every buyer, seller & referral lead — one searchable pipeline. Stage changes are audit-logged
            without touching the original lead record.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            data-testid="admin-contacts-export-csv"
            onClick={exportCsv}
            disabled={rows.length === 0}
            style={{
              background: "#0F2A5B", color: "#fff", border: "none", borderRadius: 8,
              padding: "0.6rem 1rem", fontWeight: 600, cursor: rows.length ? "pointer" : "not-allowed",
              opacity: rows.length ? 1 : 0.5, fontSize: "0.85rem",
            }}
          >
            ⬇ Export CSV ({rows.length})
          </button>
          <button
            data-testid="admin-contacts-refresh"
            onClick={fetchContacts}
            style={{
              background: "#fff", color: "#0F2A5B", border: "1px solid #0F2A5B", borderRadius: 8,
              padding: "0.6rem 1rem", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Counter chips — total + by-source. Reflect the filtered set. */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem", marginBottom: "0.75rem" }}>
        <span style={chipStyle("#0F2A5B")}>Total <b style={{ marginLeft: 4 }}>{total}</b></span>
        {["buyer", "seller", "referral"].map((k) => (
          <span key={k} style={chipStyle("#374151")}>
            {SOURCE_EMOJI[k]} {k.charAt(0).toUpperCase() + k.slice(1)}
            <b style={{ marginLeft: 4 }}>{sourceCounts[k] ?? 0}</b>
          </span>
        ))}
        <span style={{ flex: 1 }} />
        {STAGE_ORDER.map((s) => (
          <span key={s} style={chipStyle(STAGE_META[s].fg, STAGE_META[s].bg)}>
            {STAGE_META[s].label} <b style={{ marginLeft: 4 }}>{stageCounts[s] ?? 0}</b>
          </span>
        ))}
      </div>

      {/* Filter row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "0.65rem",
        marginTop: "1rem",
        padding: "0.85rem 1rem",
        background: "#F5F0E1",
        borderRadius: 10,
      }}>
        <label style={labelStyle}>Source
          <select
            data-testid="admin-contacts-filter-source"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            style={inputStyle}
          >
            {SOURCE_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>Stage
          <select
            data-testid="admin-contacts-filter-stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            style={inputStyle}
          >
            <option value="all">All stages</option>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{STAGE_META[s].label}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>Search
          <input
            data-testid="admin-contacts-filter-search"
            type="text"
            placeholder="name / email / phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>From
          <input
            data-testid="admin-contacts-filter-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>To
          <input
            data-testid="admin-contacts-filter-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={inputStyle}
          />
        </label>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            data-testid="admin-contacts-clear-filters"
            onClick={clearFilters}
            disabled={activeFilterCount === 0}
            style={{
              width: "100%", padding: "0.55rem 0.75rem", fontSize: "0.82rem",
              border: "1px solid rgba(15,42,91,0.25)", borderRadius: 8,
              background: activeFilterCount ? "#fff" : "rgba(255,255,255,0.4)",
              cursor: activeFilterCount ? "pointer" : "not-allowed",
              color: "#0F2A5B", fontWeight: 600,
            }}
          >
            ✕ Clear ({activeFilterCount})
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "0.75rem 1rem", borderRadius: 8, marginTop: "1rem" }}>
          ⚠ {error}
        </div>
      )}

      {/* Results table */}
      <div style={{ marginTop: "1rem", overflowX: "auto" }}>
        <table className="admin-table" data-testid="admin-contacts-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Source</th>
              <th>Stage</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Headline</th>
              <th>Consent</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "#6B7280" }}>Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "#6B7280" }}>
                No contacts match these filters.
              </td></tr>
            )}
            {rows.map((r) => {
              const stageMeta = STAGE_META[r.stage] || STAGE_META.new;
              const age = daysAgo(r.created_at);
              const rowKey = `${r.source_type}:${r.id}`;
              return (
                <tr key={rowKey} data-testid={`admin-contacts-row-${r.source_type}-${r.id}`}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {fmtDate(r.created_at)}
                    {age != null && (
                      <div style={{ fontSize: "0.7rem", color: age <= 1 ? "#059669" : age <= 3 ? "#F59E0B" : "#6B7280" }}>
                        {age === 0 ? "today" : age === 1 ? "1 day ago" : `${age} days ago`}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      display: "inline-block", padding: "0.15rem 0.55rem", borderRadius: 999,
                      background: "#EEF2FF", color: "#3730A3", fontSize: "0.75rem", fontWeight: 600,
                    }}>
                      {SOURCE_EMOJI[r.source_type]} {r.source_type}
                    </span>
                  </td>
                  <td>
                    <select
                      data-testid={`admin-contacts-stage-select-${r.source_type}-${r.id}`}
                      value={r.stage}
                      onChange={(e) => changeStage(r, e.target.value)}
                      disabled={savingKey === rowKey}
                      style={{
                        background: stageMeta.bg, color: stageMeta.fg, border: "none",
                        padding: "0.25rem 0.5rem", borderRadius: 999, fontWeight: 600,
                        fontSize: "0.75rem", cursor: "pointer", fontFamily: "Inter,sans-serif",
                      }}
                    >
                      {STAGE_ORDER.map((s) => (
                        <option key={s} value={s}>{STAGE_META[s].label}</option>
                      ))}
                    </select>
                    {savedMsg[rowKey] && (
                      <span style={{ marginLeft: 6, fontSize: "0.75rem", color: savedMsg[rowKey] === "✓" ? "#059669" : "#DC2626" }}>
                        {savedMsg[rowKey]}
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.full_name || "—"}</td>
                  <td>
                    {r.email
                      ? <a href={`mailto:${r.email}`} style={{ color: "#0EA5E9" }}>{r.email}</a>
                      : "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {r.phone
                      ? <a href={`tel:${r.phone}`} style={{ color: "#0EA5E9" }}>{r.phone}</a>
                      : "—"}
                  </td>
                  <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.headline}>
                    {r.headline || "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                    {r.unsubscribed
                      ? <span style={{ color: "#991B1B", fontWeight: 600 }}>opted out</span>
                      : r.casl_consent
                          ? <span style={{ color: "#059669", fontWeight: 600 }}>CASL ✓</span>
                          : <span style={{ color: "#6B7280" }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>
          Showing <b style={{ color: "#0F2A5B" }}>{pageStart}</b>–<b style={{ color: "#0F2A5B" }}>{pageEnd}</b> of <b style={{ color: "#0F2A5B" }}>{total}</b>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            data-testid="admin-contacts-prev-page"
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            disabled={offset === 0}
            style={paginatorButtonStyle(offset === 0)}
          >
            ← Prev
          </button>
          <button
            data-testid="admin-contacts-next-page"
            onClick={() => setOffset((o) => o + limit)}
            disabled={pageEnd >= total}
            style={paginatorButtonStyle(pageEnd >= total)}
          >
            Next →
          </button>
        </div>
      </div>
    </AdminShell>
  );
};

// ── local style helpers ───────────────────────────────────────────────
const chipStyle = (fg, bg = "#fff") => ({
  display: "inline-flex", alignItems: "center", gap: 2,
  padding: "0.28rem 0.7rem", borderRadius: 999, fontSize: "0.78rem",
  color: fg, background: bg, border: `1px solid ${fg === "#0F2A5B" ? "#0F2A5B" : "rgba(15,42,91,0.15)"}`,
  fontFamily: "Inter,sans-serif", fontWeight: 500, whiteSpace: "nowrap",
});
const labelStyle = {
  display: "flex", flexDirection: "column", fontSize: "0.72rem",
  fontFamily: "Inter,sans-serif", color: "#0F2A5B", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.03em", gap: "0.25rem",
};
const inputStyle = {
  padding: "0.5rem 0.65rem", fontSize: "0.85rem",
  border: "1px solid rgba(15,42,91,0.2)", borderRadius: 8,
  background: "#fff", color: "#0F2A5B", fontFamily: "Inter,sans-serif",
  textTransform: "none", letterSpacing: 0, fontWeight: 400,
};
const paginatorButtonStyle = (disabled) => ({
  padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 600,
  border: "1px solid #0F2A5B", borderRadius: 8,
  background: disabled ? "rgba(15,42,91,0.05)" : "#fff",
  color: "#0F2A5B", cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

export default AdminContacts;
