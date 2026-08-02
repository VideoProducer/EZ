// Admin editor for Phase B content_relations — manual overrides for the
// intelligent related-content engine. Lets Doug pin specific cross-type links
// (e.g. "on this glossary page, always show the Buying Guide's step 5") that
// take priority over rule-based auto-suggestions.

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOURCE_TYPES = [
  { v: "glossary",   label: "Glossary term" },
  { v: "community",  label: "Community page" },
  { v: "region",     label: "Region page" },
  { v: "guide",      label: "Buying/Selling guide" },
];

const TARGET_KINDS = [
  { v: "Glossary",   href_prefix: "/glossary/",  color: "#2563EB" },
  { v: "Guide",      href_prefix: "/",           color: "#178A3E" },
  { v: "Community",  href_prefix: "/community/", color: "#0EA5E9" },
  { v: "Estimator",  href_prefix: "/",           color: "#F59E0B" },
  { v: "Listings",   href_prefix: "/",           color: "#8B5CF6" },
  { v: "Compliance", href_prefix: "/",           color: "#DC2626" },
];

const EMPTY_REL = {
  source_type: "glossary",
  source_id: "",
  target_type: "glossary",
  target_id: "",
  target_kind_label: "Glossary",
  target_title: "",
  target_blurb: "",
  target_href: "",
  reason: "manual",
  priority: 0,
  active: true,
  visibility: "public",
  notes: "",
};

export default function AdminContentRelations({ headers }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({ source_type: "", source_id: "" });
  const [editing, setEditing] = useState(null); // null | new obj | existing obj with id
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter.source_type) params.set("source_type", filter.source_type);
    if (filter.source_id) params.set("source_id", filter.source_id);
    const r = await axios.get(`${API}/admin/content-relations?${params}`, { headers });
    setRows(r.data?.items || []);
  }, [filter.source_type, filter.source_id, headers]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing.source_id.trim() || !editing.target_title.trim() || !editing.target_href.trim()) {
      setMsg("⚠ Source ID, target title, and target href are required.");
      return;
    }
    setBusy(true); setMsg("");
    try {
      if (editing.id) {
        await axios.put(`${API}/admin/content-relations/${editing.id}`, editing, { headers });
      } else {
        await axios.post(`${API}/admin/content-relations`, editing, { headers });
      }
      setMsg("✓ Saved");
      setEditing(null);
      load();
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setMsg("⚠ " + (e.response?.data?.detail || e.message));
    } finally {
      setBusy(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this relation?")) return;
    await axios.delete(`${API}/admin/content-relations/${id}`, { headers });
    load();
  };

  const patch = (partial) => setEditing(e => ({ ...e, ...partial }));

  return (
    <div data-testid="admin-relations-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0 }} data-testid="admin-relations-title">🕸️ Content Relations</h2>
          <p style={{ color: "var(--muted)", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", marginTop: "0.35rem", maxWidth: "42rem", lineHeight: 1.55 }}>
            Manual overrides for the "You may also be looking for" section. Pinned relations take priority (0) over the rule-based auto-suggestions.
            Each relation carries a <code style={{ background: "#F0F4FB", padding: "0.1rem 0.35rem", borderRadius: 3 }}>reason</code> code so you can inspect why any card surfaces.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY_REL })} data-testid="admin-relations-new">+ New relation</button>
      </div>

      {msg && (
        <div data-testid="admin-relations-msg" style={{ padding: "0.6rem 1rem", borderRadius: 6, background: msg.startsWith("⚠") ? "#FEF2F2" : "#F0FDF4", color: msg.startsWith("⚠") ? "#DC2626" : "#059669", border: msg.startsWith("⚠") ? "1px solid #FCA5A5" : "1px solid #86EFAC", marginBottom: "1rem", fontFamily: "Inter,sans-serif", fontSize: "0.9rem" }}>{msg}</div>
      )}

      <div className="paper" style={{ padding: "1rem 1.25rem", marginBottom: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600 }}>Filter:</span>
        <select value={filter.source_type} onChange={e => setFilter(f => ({ ...f, source_type: e.target.value }))} data-testid="admin-relations-filter-type" style={{ padding: "0.4rem 0.6rem", fontFamily: "Inter,sans-serif" }}>
          <option value="">All source types</option>
          {SOURCE_TYPES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <input placeholder="Source ID (e.g. property-transfer-tax-ptt)" value={filter.source_id} onChange={e => setFilter(f => ({ ...f, source_id: e.target.value }))} data-testid="admin-relations-filter-id" style={{ padding: "0.4rem 0.6rem", fontFamily: "Inter,sans-serif", minWidth: "18rem" }}/>
        <span style={{ marginLeft: "auto", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "var(--muted)" }}>{rows.length} relation{rows.length === 1 ? "" : "s"}</span>
      </div>

      {editing && (
        <div className="paper" style={{ padding: "1.5rem", marginBottom: "1.5rem", border: "2px solid var(--brand-blue)" }} data-testid="admin-relations-editor">
          <h3 style={{ marginTop: 0 }}>{editing.id ? "Edit relation" : "New relation"}</h3>
          <div className="form-grid">
            <div className="field">
              <label>Source type *</label>
              <select value={editing.source_type} onChange={e => patch({ source_type: e.target.value })} data-testid="rel-source-type">
                {SOURCE_TYPES.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Source ID (slug) *</label>
              <input value={editing.source_id} onChange={e => patch({ source_id: e.target.value.trim() })} placeholder="e.g. property-transfer-tax-ptt" data-testid="rel-source-id"/>
            </div>
            <div className="field">
              <label>Target kind (badge label) *</label>
              <select value={editing.target_kind_label} onChange={e => patch({ target_kind_label: e.target.value, target_type: e.target.value.toLowerCase() })} data-testid="rel-target-kind">
                {TARGET_KINDS.map(k => <option key={k.v} value={k.v}>{k.v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Priority (0 = pin to top)</label>
              <input type="number" value={editing.priority} onChange={e => patch({ priority: parseInt(e.target.value, 10) || 0 })} data-testid="rel-priority"/>
            </div>
          </div>
          <div className="field" style={{ marginTop: "1rem" }}>
            <label>Target title *</label>
            <input value={editing.target_title} onChange={e => patch({ target_title: e.target.value })} placeholder="e.g. The Buying Guide — Money & Must-Haves" data-testid="rel-target-title"/>
          </div>
          <div className="field" style={{ marginTop: "1rem" }}>
            <label>Target one-sentence blurb *</label>
            <textarea rows="2" value={editing.target_blurb} onChange={e => patch({ target_blurb: e.target.value })} placeholder="A concise, editorial one-liner about the destination." data-testid="rel-target-blurb"/>
          </div>
          <div className="field" style={{ marginTop: "1rem" }}>
            <label>Target href (URL path) *</label>
            <input value={editing.target_href} onChange={e => patch({ target_href: e.target.value })} placeholder="e.g. /glossary/mortgage-pre-approval" data-testid="rel-target-href"/>
          </div>
          <div className="form-grid" style={{ marginTop: "1rem" }}>
            <div className="field">
              <label>Reason code (for admin audit)</label>
              <input value={editing.reason} onChange={e => patch({ reason: e.target.value })} placeholder="manual / same-topic / next-step / financial-planning / …" data-testid="rel-reason"/>
            </div>
            <div className="field">
              <label>Visibility</label>
              <select value={editing.visibility} onChange={e => patch({ visibility: e.target.value })} data-testid="rel-visibility">
                <option value="public">Public</option>
                <option value="client-only">Client-only (excluded from public endpoint)</option>
              </select>
            </div>
          </div>
          <div className="field" style={{ marginTop: "1rem" }}>
            <label className="check">
              <input type="checkbox" checked={!!editing.active} onChange={e => patch({ active: e.target.checked })} data-testid="rel-active"/>
              {" "}Active (uncheck to disable without deleting)
            </label>
          </div>
          <div className="field" style={{ marginTop: "1rem" }}>
            <label>Admin notes (optional)</label>
            <textarea rows="2" value={editing.notes || ""} onChange={e => patch({ notes: e.target.value })} placeholder="Why this relation was added, review dates, etc." data-testid="rel-notes"/>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
            <button className="btn btn-primary" onClick={save} disabled={busy} data-testid="rel-save">{busy ? "Saving…" : (editing.id ? "💾 Update" : "💾 Create")}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)} data-testid="rel-cancel">Cancel</button>
          </div>
        </div>
      )}

      <div className="paper" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter,sans-serif", fontSize: "0.88rem", minWidth: "48rem" }}>
          <thead>
            <tr style={{ background: "var(--brand-navy)", color: "white" }}>
              <th style={{ textAlign: "left", padding: "0.65rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Source</th>
              <th style={{ textAlign: "left", padding: "0.65rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Target</th>
              <th style={{ textAlign: "left", padding: "0.65rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reason</th>
              <th style={{ textAlign: "left", padding: "0.65rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Priority</th>
              <th style={{ textAlign: "left", padding: "0.65rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Visibility</th>
              <th style={{ textAlign: "left", padding: "0.65rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active</th>
              <th style={{ textAlign: "left", padding: "0.65rem 0.75rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)" }}>
                  No manual relations yet. Rule-based auto-suggestions are still active — click "+ New relation" to pin any high-value link.
                </td>
              </tr>
            )}
            {rows.map(r => (
              <tr key={r.id} data-testid={`rel-row-${r.id}`}>
                <td style={{ padding: "0.65rem 0.75rem", borderTop: "1px solid rgba(15,42,91,0.08)" }}>
                  <div style={{ fontWeight: 700, color: "var(--brand-navy)" }}>{r.source_type}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "monospace" }}>{r.source_id}</div>
                  {(() => {
                    const surface = r.source_type === "glossary" ? `/glossary/${r.source_id}` :
                                    (r.source_type === "community" || r.source_type === "region" || r.source_type === "neighbourhood") ? `/community/${r.source_id}` :
                                    r.source_type === "guide" ? "/glossary" : null;
                    return surface ? (
                      <a href={surface} target="_blank" rel="noopener noreferrer" data-testid={`rel-preview-live-${r.id}`} style={{ fontSize: "0.72rem", color: "var(--brand-blue)", fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: "0.15rem" }}>🔍 Preview live ↗</a>
                    ) : null;
                  })()}
                </td>
                <td style={{ padding: "0.65rem 0.75rem", borderTop: "1px solid rgba(15,42,91,0.08)" }}>
                  <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--brand-blue)", fontWeight: 700 }}>{r.target_kind_label || r.target_type}</div>
                  <div style={{ fontWeight: 600, color: "var(--brand-navy)" }}>{r.target_title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}><Link to={r.target_href} target="_blank" style={{ color: "var(--brand-blue)" }}>{r.target_href}</Link></div>
                </td>
                <td style={{ padding: "0.65rem 0.75rem", borderTop: "1px solid rgba(15,42,91,0.08)", fontFamily: "monospace", fontSize: "0.78rem", color: "var(--muted)" }}>{r.reason || "—"}</td>
                <td style={{ padding: "0.65rem 0.75rem", borderTop: "1px solid rgba(15,42,91,0.08)" }}>{r.priority ?? 100}</td>
                <td style={{ padding: "0.65rem 0.75rem", borderTop: "1px solid rgba(15,42,91,0.08)", fontSize: "0.82rem" }}>{r.visibility || "public"}</td>
                <td style={{ padding: "0.65rem 0.75rem", borderTop: "1px solid rgba(15,42,91,0.08)" }}>{r.active ? "✅" : "—"}</td>
                <td style={{ padding: "0.65rem 0.75rem", borderTop: "1px solid rgba(15,42,91,0.08)", whiteSpace: "nowrap" }}>
                  <button className="btn btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem", marginRight: "0.35rem" }} onClick={() => setEditing({ ...r })} data-testid={`rel-edit-${r.id}`}>Edit</button>
                  <button className="btn btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.78rem", color: "#DC2626" }} onClick={() => del(r.id)} data-testid={`rel-delete-${r.id}`}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "1rem", background: "#F0F4FB", border: "1px solid rgba(15,42,91,0.15)", borderRadius: 8, fontSize: "0.85rem", fontFamily: "Inter,sans-serif", lineHeight: 1.55, marginTop: "1.5rem", color: "var(--brand-navy)" }}>
        <strong>How this fits together:</strong> The public endpoint <code>/api/related-content/&lt;source_type&gt;/&lt;source_id&gt;</code> returns cards in priority order — manual relations (priority 0) first, then rule-based auto-suggestions, then same-category glossary siblings, then a universal tail. Client-only relations are never returned by the public endpoint.
      </div>
    </div>
  );
}
