// EZtoFind.ca — Admin Lead Triage Dashboard
// URL: /admin/lead-triage
//
// One priority-sorted view of every buyer + seller lead with the AI triage
// score, a follow-up checklist (Contacted → Meeting scheduled → Meeting held
// → Proposal sent), status (open / won / lost / nurture), and free-text notes.
// Doug uses this instead of switching between /admin/buyers and /admin/sellers.
//
// Compliance: AI triage is a routing hint, never advice — Doug's judgement
// overrides. The banner on each card makes that explicit.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRIORITY_META = {
  hot:      { emoji: "🔥", label: "HOT",      bg: "#FEE2E2", fg: "#991B1B", border: "#DC2626" },
  warm:     { emoji: "⚡", label: "WARM",     bg: "#FEF3C7", fg: "#78350F", border: "#F59E0B" },
  cold:     { emoji: "❄️", label: "COLD",     bg: "#DBEAFE", fg: "#1E3A8A", border: "#3B82F6" },
  unscored: { emoji: "•",  label: "UNSCORED", bg: "#F3F4F6", fg: "#374151", border: "#9CA3AF" },
};

const CHECKLIST = [
  { key: "contacted",         label: "Contacted (call/email)" },
  { key: "meeting_scheduled", label: "Meeting scheduled" },
  { key: "meeting_held",      label: "Meeting held" },
  { key: "proposal_sent",     label: "Proposal / CMA / offer sent" },
];

const STATUS_OPTS = [
  { value: "open",    label: "Open" },
  { value: "won",     label: "Closed — won" },
  { value: "lost",    label: "Closed — lost" },
  { value: "nurture", label: "In nurture" },
];

const daysSince = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};

const LeadCard = ({ lead, onUpdate }) => {
  const kind = lead._kind;
  const triage = lead.triage || {};
  const followup = lead.followup || {};
  const meta = PRIORITY_META[triage.priority] || PRIORITY_META.unscored;
  const age = daysSince(lead.created_at);
  const [expanded, setExpanded] = useState(triage.priority === "hot");
  const [saving, setSaving] = useState(false);
  const [notesBuf, setNotesBuf] = useState(followup.notes || "");
  const [msg, setMsg] = useState("");

  useEffect(() => { setNotesBuf(followup.notes || ""); }, [followup.notes]);

  const patch = async (fields) => {
    setSaving(true); setMsg("");
    try {
      // SEC-009: auth via HttpOnly cookie (axios.defaults.withCredentials=true).
      const r = await axios.put(`${API}/admin/leads/${kind}/${lead.id}/followup`, fields);
      onUpdate(kind, lead.id, r.data.followup);
      setMsg("✓ saved");
      setTimeout(() => setMsg(""), 1500);
    } catch (e) {
      setMsg("⚠ " + (e.response?.data?.detail || e.message));
    } finally { setSaving(false); }
  };

  const toggleCheck = (key) => patch({ [key]: !followup[key] });

  const completedCount = CHECKLIST.filter(c => followup[c.key]).length;
  const progress = Math.round((completedCount / CHECKLIST.length) * 100);
  const ageColor = age == null ? "#6B7280" : age <= 1 ? "#059669" : age <= 3 ? "#F59E0B" : "#DC2626";

  return (
    <div
      data-testid={`lead-card-${kind}-${lead.id}`}
      style={{
        background: "white",
        border: `1px solid ${meta.border}`,
        borderLeft: `5px solid ${meta.border}`,
        borderRadius: 8,
        padding: "1rem 1.15rem",
        marginBottom: "0.85rem",
        boxShadow: "0 1px 2px rgba(15,42,91,0.04)",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ padding: "0.15rem 0.55rem", borderRadius: 999, background: meta.bg, color: meta.fg, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.06em" }}>
              {meta.emoji} {meta.label}
            </span>
            <span style={{ padding: "0.15rem 0.55rem", borderRadius: 4, background: "#F3F4F6", color: "#374151", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {kind}
            </span>
            {age != null && (
              <span style={{ fontSize: "0.75rem", color: ageColor, fontWeight: 600 }}>
                {age === 0 ? "today" : age === 1 ? "1 day ago" : `${age} days ago`}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0F2A5B", marginTop: "0.35rem", fontFamily: "Inter,sans-serif" }}>
            {lead.full_name || "—"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#5B6577", marginTop: "0.15rem", fontFamily: "Inter,sans-serif" }}>
            {lead.email || "—"}{lead.phone ? ` · ${lead.phone}` : ""}
            {lead.form_lang && lead.form_lang !== "en" ? ` · lang: ${lead.form_lang}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 130 }}>
          <div style={{ fontSize: "0.7rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Progress</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end" }}>
            <div style={{ width: 90, height: 6, background: "#E5E7EB", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: meta.border }}/>
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0F2A5B" }}>{completedCount}/{CHECKLIST.length}</div>
          </div>
          <button
            onClick={() => setExpanded(x => !x)}
            data-testid={`lead-toggle-${kind}-${lead.id}`}
            style={{ marginTop: "0.5rem", background: "transparent", border: "none", color: "#2563EB", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem", padding: 0 }}
          >
            {expanded ? "Hide details ▲" : "Show details ▼"}
          </button>
        </div>
      </div>

      {/* Triage rationale + next action (always visible so it works as a scannable list) */}
      {triage.rationale && (
        <div style={{ marginTop: "0.6rem", padding: "0.55rem 0.75rem", background: meta.bg, borderRadius: 4, fontSize: "0.85rem", color: meta.fg, lineHeight: 1.55 }}>
          <strong>Why:</strong> {triage.rationale}
          {triage.next_action && (
            <div style={{ marginTop: "0.3rem", color: "#1F2937" }}>
              <strong>Next action:</strong> {triage.next_action}
            </div>
          )}
        </div>
      )}

      {/* Expanded — checklist + notes + full lead detail */}
      {expanded && (
        <>
          {/* Checklist */}
          <div style={{ marginTop: "0.85rem", padding: "0.75rem 0.85rem", background: "#F9FAFB", borderRadius: 6 }}>
            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#374151", fontWeight: 700, marginBottom: "0.5rem" }}>Follow-up checklist</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {CHECKLIST.map(item => (
                <label key={item.key} style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.9rem", color: "#1F2937" }}>
                  <input
                    type="checkbox"
                    checked={!!followup[item.key]}
                    onChange={() => toggleCheck(item.key)}
                    disabled={saving}
                    data-testid={`lead-check-${item.key}-${lead.id}`}
                    style={{ width: 18, height: 18, accentColor: meta.border }}
                  />
                  <span style={{ textDecoration: followup[item.key] ? "line-through" : "none", opacity: followup[item.key] ? 0.65 : 1 }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status + notes */}
          <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.75rem", gridTemplateColumns: "minmax(160px, 200px) 1fr" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#374151", fontWeight: 700, marginBottom: "0.3rem" }}>Status</label>
              <select
                value={followup.status || "open"}
                onChange={(e) => patch({ status: e.target.value })}
                disabled={saving}
                data-testid={`lead-status-${lead.id}`}
                style={{ width: "100%", padding: "0.4rem 0.55rem", fontSize: "0.88rem", fontFamily: "Inter,sans-serif", border: "1px solid rgba(15,42,91,0.15)", borderRadius: 4, background: "white" }}
              >
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#374151", fontWeight: 700, marginBottom: "0.3rem" }}>Follow-up notes</label>
              <textarea
                rows={2}
                value={notesBuf}
                onChange={(e) => setNotesBuf(e.target.value)}
                onBlur={() => { if (notesBuf !== (followup.notes || "")) patch({ notes: notesBuf }); }}
                placeholder="e.g. Left voicemail 2pm. Called back at 3, booked showing Sat 11am."
                data-testid={`lead-notes-${lead.id}`}
                style={{ width: "100%", padding: "0.5rem 0.65rem", fontSize: "0.88rem", fontFamily: "Inter,sans-serif", lineHeight: 1.5, border: "1px solid rgba(15,42,91,0.15)", borderRadius: 4, resize: "vertical" }}
              />
              {msg && <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: msg.startsWith("⚠") ? "#DC2626" : "#059669" }}>{msg}</div>}
            </div>
          </div>

          {/* Lead detail — read-only */}
          <div style={{ marginTop: "0.85rem", fontSize: "0.85rem", color: "#374151", fontFamily: "Inter,sans-serif", lineHeight: 1.6 }}>
            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", fontWeight: 700, marginBottom: "0.3rem" }}>Lead detail</div>
            {kind === "buyer" ? (
              <div>
                Areas: {(lead.areas || []).join(", ") || "—"} · Type: {lead.property_type || "—"} · Budget: {lead.budget_range || lead.budget || "—"} · Timeline: {lead.timeline || "—"} · Financing: {lead.financing_status || "—"}
              </div>
            ) : (
              <div>
                City: {lead.city || "—"} · Address: {lead.property_address || "—"} · Type: {lead.property_type || "—"} · Value: {lead.estimated_value || lead.expected_value || "—"} · Timeline: {lead.timeline || lead.timeframe || "—"}
              </div>
            )}
            {(lead.notes || lead.reason) && (
              <div style={{ marginTop: "0.4rem", padding: "0.5rem 0.65rem", background: "#F9FAFB", borderRadius: 4, whiteSpace: "pre-wrap" }}>
                {lead.notes || lead.reason}
              </div>
            )}
            {triage.signals && triage.signals.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                {triage.signals.map((s, i) => (
                  <span key={i} style={{ display: "inline-block", padding: "0.12rem 0.5rem", margin: "0 0.3rem 0.25rem 0", background: "#F3F4F6", borderRadius: 999, fontSize: "0.7rem", color: "#374151" }}>{s}</span>
                ))}
              </div>
            )}
            <div style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "#6B7280", fontStyle: "italic" }}>
              AI-assisted triage using EZtoFind.ca's approved lead-scoring rubric. Doug's judgement always overrides — this is a routing hint, not a decision.
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const TierSection = ({ tier, leads, onUpdate }) => {
  const meta = PRIORITY_META[tier] || PRIORITY_META.unscored;
  if (!leads || leads.length === 0) return null;
  return (
    <section data-testid={`tier-${tier}`} style={{ marginBottom: "1.75rem" }}>
      <h2 style={{ margin: "0 0 0.75rem", display: "flex", alignItems: "center", gap: "0.55rem", fontFamily: '"TeX Gyre Heros Bold","Helvetica Neue",Arial,sans-serif', color: "#0F2A5B", fontSize: "1.2rem" }}>
        <span aria-hidden style={{ display: "inline-block", width: "0.6rem", height: "0.6rem", borderRadius: "50%", background: meta.border }}/>
        {meta.emoji} {meta.label} <span style={{ color: "#5B6577", fontWeight: 500, fontSize: "0.95rem" }}>· {leads.length} open</span>
      </h2>
      {leads.map(lead => (
        <LeadCard key={`${lead._kind}-${lead.id}`} lead={lead} onUpdate={onUpdate}/>
      ))}
    </section>
  );
};

export default function AdminLeadTriage({ AdminShell }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      // SEC-009: auth via HttpOnly cookie (axios.defaults.withCredentials=true).
      const r = await axios.get(`${API}/admin/lead-triage`, {
        params: { status: statusFilter },
      });
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const onUpdate = (kind, id, followup) => {
    setData(prev => {
      if (!prev) return prev;
      const nextTiers = {};
      for (const [t, arr] of Object.entries(prev.tiers)) {
        nextTiers[t] = arr.map(r => (r._kind === kind && r.id === id) ? { ...r, followup } : r);
      }
      // If the status changed and we're filtering, hide the row so the UI matches server truth on next refresh
      const stillMatches = statusFilter === "all" || followup.status === statusFilter || (statusFilter === "open" && (followup.status === "open" || !followup.status));
      if (!stillMatches) {
        for (const t of Object.keys(nextTiers)) {
          nextTiers[t] = nextTiers[t].filter(r => !(r._kind === kind && r.id === id));
        }
      }
      return { ...prev, tiers: nextTiers };
    });
  };

  const counts = data?.counts || {};
  const total = data?.total || 0;

  return (
    <AdminShell active="lead-triage">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "2rem", margin: 0 }}>Lead Triage</h1>
          <div style={{ fontSize: "0.88rem", color: "#5B6577", fontFamily: "Inter,sans-serif", maxWidth: "42rem", marginTop: "0.35rem", lineHeight: 1.55 }}>
            One priority-sorted view of every buyer + seller lead. Only HOT leads email doug@eztofind.ca — everything else appears here for follow-up. Tick each step as you go.
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {["open", "won", "lost", "nurture", "all"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              data-testid={`triage-filter-${s}`}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: 999,
                border: statusFilter === s ? "2px solid #0F2A5B" : "1px solid rgba(15,42,91,0.2)",
                background: statusFilter === s ? "#0F2A5B" : "white",
                color: statusFilter === s ? "white" : "#0F2A5B",
                fontFamily: "Inter,sans-serif",
                fontSize: "0.84rem",
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >{s}</button>
          ))}
          <button
            onClick={load}
            data-testid="triage-refresh"
            style={{ padding: "0.4rem 0.85rem", borderRadius: 999, border: "1px solid rgba(15,42,91,0.2)", background: "white", color: "#0F2A5B", fontFamily: "Inter,sans-serif", fontSize: "0.84rem", fontWeight: 700, cursor: "pointer" }}
          >⟳ Refresh</button>
        </div>
      </div>

      {/* Summary chart — priority bar */}
      <div className="paper" style={{ padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
          {["hot", "warm", "cold", "unscored"].map(t => {
            const meta = PRIORITY_META[t];
            const c = counts[t] || 0;
            const pct = total ? Math.round((c / total) * 100) : 0;
            return (
              <div key={t} data-testid={`triage-summary-${t}`} style={{ padding: "0.85rem 1rem", borderRadius: 6, background: meta.bg, border: `1px solid ${meta.border}` }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: meta.fg, fontWeight: 800 }}>{meta.emoji} {meta.label}</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: meta.fg, lineHeight: 1.1, marginTop: "0.2rem" }}>{c}</div>
                <div style={{ fontSize: "0.72rem", color: meta.fg }}>{pct}% of open leads</div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && <div className="paper" style={{ padding: "1.5rem", textAlign: "center", color: "#5B6577" }}>Loading leads…</div>}
      {error && <div className="paper" style={{ padding: "1rem 1.25rem", background: "#FEE2E2", color: "#991B1B" }}>⚠ {error}</div>}

      {data && total === 0 && !loading && (
        <div className="paper" style={{ padding: "2rem 1.75rem", textAlign: "center" }}>
          <h3 style={{ margin: 0, color: "#0F2A5B" }}>Nothing to follow up on.</h3>
          <p style={{ color: "#5B6577", marginTop: "0.5rem" }}>No leads match the current filter. Try <button onClick={() => setStatusFilter("all")} style={{ background: "transparent", border: "none", color: "#2563EB", fontWeight: 700, cursor: "pointer", padding: 0 }}>all leads</button> or check <Link to="/admin/buyers" style={{ color: "#2563EB", fontWeight: 700 }}>Buyer Leads</Link>.</p>
        </div>
      )}

      {data && total > 0 && (
        <>
          <TierSection tier="hot"      leads={data.tiers.hot}      onUpdate={onUpdate}/>
          <TierSection tier="warm"     leads={data.tiers.warm}     onUpdate={onUpdate}/>
          <TierSection tier="cold"     leads={data.tiers.cold}     onUpdate={onUpdate}/>
          <TierSection tier="unscored" leads={data.tiers.unscored} onUpdate={onUpdate}/>
        </>
      )}
    </AdminShell>
  );
}
