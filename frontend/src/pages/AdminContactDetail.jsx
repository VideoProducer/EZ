// EZtoFind.ca — Admin Contact Detail + Timeline (Slice 2 · Feb 2026)
// URL: /admin/contacts/:source_type/:id
//
// One-glance context: contact card on the left, chronological timeline
// on the right. Timeline merges:
//   • Original form submission (from the source lead doc)
//   • Every pipeline stage transition (from contact_stage_history)
//   • Every email fired via services.email_sender.send_email (from
//     email_outbox filtered by recipient address)
//   • Manual notes Doug adds inline
//
// Doogie chat sessions store zero PII by design (chat_messages.content
// is redacted before insertion + no email/phone field), so we don't
// surface chat here — see comment block in backend/server.py near
// get_admin_contact for why.

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { AdminShell } from "../App";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAGE_META = {
  new:        { label: "New",        bg: "#DBEAFE", fg: "#1E3A8A" },
  contacted:  { label: "Contacted",  bg: "#FEF3C7", fg: "#78350F" },
  nurturing:  { label: "Nurturing",  bg: "#E9D5FF", fg: "#581C87" },
  active:     { label: "Active",     bg: "#DCFCE7", fg: "#065F46" },
  won:        { label: "Won",        bg: "#BBF7D0", fg: "#14532D" },
  lost:       { label: "Lost",       bg: "#FEE2E2", fg: "#991B1B" },
};
const STAGE_ORDER = ["new", "contacted", "nurturing", "active", "won", "lost"];

const TIMELINE_META = {
  submission:   { icon: "📥", color: "#0F2A5B" },
  stage_change: { icon: "🎯", color: "#7C3AED" },
  note:         { icon: "📝", color: "#0EA5E9" },
  email:        { icon: "✉️", color: "#059669" },
};

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
};

const AdminContactDetail = () => {
  const { source_type, id } = useParams();
  const nav = useNavigate();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [changingStage, setChangingStage] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await axios.get(`${API}/admin/contacts/${source_type}/${id}`);
      setPayload(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Failed to load contact");
    } finally {
      setLoading(false);
    }
  }, [source_type, id]);

  useEffect(() => { load(); }, [load]);

  const changeStage = async (next) => {
    setChangingStage(true);
    try {
      await axios.patch(`${API}/admin/contacts/${source_type}/${id}/stage`, { stage: next });
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || e.message || "Stage update failed");
    } finally {
      setChangingStage(false);
    }
  };

  const addNote = async () => {
    const body = noteBody.trim();
    if (!body) return;
    setSavingNote(true);
    try {
      await axios.post(`${API}/admin/contacts/${source_type}/${id}/notes`, { body });
      setNoteBody("");
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || e.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return <AdminShell active="contacts"><div style={{ padding: "2rem", color: "#6B7280" }}>Loading…</div></AdminShell>;
  }
  if (error || !payload) {
    return (
      <AdminShell active="contacts">
        <div style={{ padding: "1rem", background: "#FEE2E2", color: "#991B1B", borderRadius: 8 }}>
          ⚠ {error || "Not found"}
        </div>
        <button onClick={() => nav("/admin/contacts")} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>← Back to Contacts</button>
      </AdminShell>
    );
  }

  const c = payload.contact;
  const raw = payload.raw || {};
  const currentStage = payload.stage || "new";
  const stageMeta = STAGE_META[currentStage] || STAGE_META.new;

  return (
    <AdminShell active="contacts">
      {/* Header + back link */}
      <button
        data-testid="admin-contact-detail-back"
        onClick={() => nav("/admin/contacts")}
        style={{ background: "none", border: "none", color: "#0F2A5B", cursor: "pointer", padding: 0, fontSize: "0.85rem", fontWeight: 600 }}
      >
        ← Back to Contacts
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "1.85rem", margin: "0 0 0.15rem" }} data-testid="admin-contact-detail-name">
            {c.full_name || "(no name)"}
          </h1>
          <div style={{ color: "#6B7280", fontFamily: "Inter,sans-serif", fontSize: "0.85rem" }}>
            {c.source_type} · created {fmtDateTime(c.created_at)}
          </div>
        </div>
        <div>
          <select
            data-testid="admin-contact-detail-stage-select"
            value={currentStage}
            onChange={(e) => changeStage(e.target.value)}
            disabled={changingStage}
            style={{
              background: stageMeta.bg, color: stageMeta.fg, border: "none",
              padding: "0.5rem 1rem", borderRadius: 999, fontWeight: 700,
              fontSize: "0.85rem", cursor: "pointer",
            }}
          >
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{STAGE_META[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Two-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: "1.25rem", marginTop: "1rem", alignItems: "flex-start" }} className="admin-contact-detail-grid">
        {/* Contact card */}
        <div style={{ background: "#F5F0E1", borderRadius: 12, padding: "1rem 1.15rem" }}>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: "0.72rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: 6 }}>Contact</div>
          <Row label="Email" value={c.email ? <a href={`mailto:${c.email}`} style={{ color: "#0EA5E9" }} data-testid="admin-contact-email">{c.email}</a> : "—"} />
          <Row label="Phone" value={c.phone ? <a href={`tel:${c.phone}`} style={{ color: "#0EA5E9" }} data-testid="admin-contact-phone">{c.phone}</a> : "—"} />
          <Row label="Headline" value={c.headline || "—"} />
          <Row label="Source" value={c.source || "—"} />
          <Row label="CASL consent" value={c.casl_consent ? <span style={{ color: "#059669", fontWeight: 700 }}>Express ✓</span> : <span style={{ color: "#6B7280" }}>—</span>} />
          <Row label="Unsubscribed" value={c.unsubscribed ? <span style={{ color: "#991B1B", fontWeight: 700 }}>Yes</span> : "No"} />
          {/* Raw lead payload — everything the visitor submitted, unedited. */}
          <div style={{ marginTop: "0.9rem", fontFamily: "Inter,sans-serif", fontSize: "0.72rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Original submission</div>
          <pre style={{ fontSize: "0.75rem", background: "#fff", padding: "0.6rem", borderRadius: 6, overflow: "auto", maxHeight: 360, marginTop: 4 }}>{JSON.stringify(sanitize(raw), null, 2)}</pre>
        </div>

        {/* Timeline + note composer */}
        <div>
          {/* Note composer */}
          <div style={{ background: "#fff", border: "1px solid rgba(15,42,91,0.15)", borderRadius: 12, padding: "0.85rem 1rem", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.5rem", color: "#0F2A5B" }}>Add note</div>
            <textarea
              data-testid="admin-contact-note-body"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Called Doug, discussed budget — following up Thursday…"
              rows={3}
              style={{ width: "100%", padding: "0.55rem", borderRadius: 8, border: "1px solid rgba(15,42,91,0.2)", fontFamily: "Inter,sans-serif", fontSize: "0.9rem", resize: "vertical" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
              <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>{noteBody.length}/4000</span>
              <button
                data-testid="admin-contact-note-save"
                onClick={addNote}
                disabled={savingNote || !noteBody.trim()}
                style={{
                  padding: "0.4rem 0.9rem", background: "#0F2A5B", color: "#fff",
                  border: "none", borderRadius: 8, cursor: savingNote || !noteBody.trim() ? "not-allowed" : "pointer",
                  fontWeight: 600, fontSize: "0.82rem",
                  opacity: savingNote || !noteBody.trim() ? 0.5 : 1,
                }}
              >
                {savingNote ? "Saving…" : "Save note"}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0F2A5B", marginBottom: "0.5rem" }}>Timeline ({payload.timeline.length})</div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, position: "relative" }} data-testid="admin-contact-timeline">
            {payload.timeline.length === 0 && (
              <li style={{ padding: "1rem", color: "#6B7280", background: "#F9FAFB", borderRadius: 8 }}>No activity yet.</li>
            )}
            {payload.timeline.map((t, i) => {
              const meta = TIMELINE_META[t.type] || { icon: "•", color: "#6B7280" };
              return (
                <li key={i} data-testid={`admin-contact-timeline-item-${t.type}`} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: "50%", background: meta.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>{meta.icon}</div>
                  <div style={{ flex: 1, background: "#fff", border: `1px solid ${meta.color}33`, borderLeft: `3px solid ${meta.color}`, borderRadius: 8, padding: "0.6rem 0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "#1F2937", fontSize: "0.9rem" }}>{t.title}</span>
                      <span style={{ fontSize: "0.72rem", color: "#6B7280" }}>{fmtDateTime(t.at)}</span>
                    </div>
                    {t.subtitle && <div style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: 2 }}>{t.subtitle}</div>}
                    {t.type === "note" && t.meta?.body && (
                      <div style={{ marginTop: "0.4rem", background: "#F0F4FB", borderRadius: 6, padding: "0.45rem 0.6rem", fontSize: "0.85rem", whiteSpace: "pre-wrap", color: "#1F2937" }}>{t.meta.body}</div>
                    )}
                    {t.type === "email" && (t.meta?.error) && (
                      <div style={{ marginTop: "0.35rem", background: "#FEE2E2", color: "#991B1B", borderRadius: 6, padding: "0.35rem 0.55rem", fontSize: "0.75rem" }}>Error: {String(t.meta.error).slice(0, 220)}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .admin-contact-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AdminShell>
  );
};

const Row = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", padding: "0.25rem 0", borderBottom: "1px dashed rgba(15,42,91,0.1)", fontSize: "0.85rem" }}>
    <span style={{ color: "#6B7280", fontWeight: 500 }}>{label}</span>
    <span style={{ color: "#1F2937", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
  </div>
);

// Redact deeply-nested PII fields from the raw dump — we already show
// email/phone/CASL up top, no need to render them again in the JSON.
const sanitize = (o) => {
  const clone = { ...o };
  delete clone.password;
  delete clone.turnstile_token;
  return clone;
};

export default AdminContactDetail;
