// EZtoFind.ca — Admin Email Campaigns (Slice 4 · Feb 2026)
// URL: /admin/campaigns
//
// Thin composer + list built on the existing CASL-compliant
// services.email_sender.send_email() pipeline. All heavy lifting
// (Resend transport, CASL footer, unsubscribe headers, email_outbox
// audit trail) already exists — this UI just:
//  1. Lets Doug pick a recipient filter (source_type × pipeline stage)
//  2. Composes subject + HTML body (with {{first_name}} merge tag)
//  3. Previews the recipient count + runs BCFSA §40 guardrail
//  4. Confirms → sends → shows live progress via /admin/campaigns list
//
// Hard refusals: BCFSA §40 guardrail is server-enforced; the UI just
// mirrors the message. Zero eligible recipients → refusal too.

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { AdminShell } from "../App";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOURCE_OPTS = [
  { value: "all",      label: "All contacts" },
  { value: "buyer",    label: "Buyer leads only" },
  { value: "seller",   label: "Seller leads only" },
  { value: "referral", label: "Referral leads only" },
];
const STAGE_OPTS = [
  { value: "all", label: "Any stage" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "nurturing", label: "Nurturing" },
  { value: "active", label: "Active" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
};

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Composer state
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sourceType, setSourceType] = useState("all");
  const [stage, setStage] = useState("all");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/campaigns`);
      setCampaigns(r.data.campaigns || []);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Auto-refresh once every 6s while any campaign is in-flight so the
  // live counts move without a manual refresh — matches how Resend
  // background sends progress.
  useEffect(() => {
    const anySending = campaigns.some((c) => c.status === "sending");
    if (!anySending) return;
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [campaigns, load]);

  const runPreview = async () => {
    setPreviewLoading(true); setPreview(null);
    try {
      const r = await axios.post(`${API}/admin/campaigns/preview`, {
        subject, body: bodyHtml, source_type: sourceType, stage,
      });
      setPreview(r.data);
    } catch (e) {
      setPreview({ error: e.response?.data?.detail || e.message });
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmSend = async () => {
    setSending(true);
    try {
      await axios.post(`${API}/admin/campaigns`, {
        subject,
        body_html: bodyHtml,
        body_text: bodyHtml.replace(/<[^>]+>/g, ""),
        source_type: sourceType,
        stage,
      });
      setFlash("Campaign dispatched — sending in background.");
      setSubject(""); setBodyHtml(""); setPreview(null); setConfirmVisible(false);
      await load();
      setTimeout(() => setFlash(""), 4000);
    } catch (e) {
      setFlash(`⚠ ${e.response?.data?.detail || e.message}`);
      setConfirmVisible(false);
      setTimeout(() => setFlash(""), 8000);
    } finally {
      setSending(false);
    }
  };

  const canSend = !!subject.trim() && !!bodyHtml.trim() && preview && preview.recipient_count > 0 && !preview.bcfsa_refusal;

  return (
    <AdminShell active="broadcast">
      <h1 className="font-display" style={{ fontSize: "2rem", marginTop: 0, marginBottom: "0.25rem" }}>
        ✉️ Email Campaigns
      </h1>
      <p style={{ margin: 0, color: "var(--muted)", fontFamily: "Inter,sans-serif", fontSize: "0.9rem" }}>
        CASL-compliant broadcast email. Every send auto-appends the required unsubscribe footer +
        sender identification. BCFSA §40 guardrail refuses copy that references MLS® numbers Doug
        does not represent.
      </p>

      {flash && (
        <div data-testid="admin-campaigns-flash" style={{ marginTop: "0.85rem", padding: "0.7rem 1rem", background: flash.startsWith("⚠") ? "#FEE2E2" : "#DCFCE7", color: flash.startsWith("⚠") ? "#991B1B" : "#065F46", borderRadius: 8, fontWeight: 500, fontSize: "0.87rem" }}>{flash}</div>
      )}

      {/* Composer */}
      <div style={{ marginTop: "1rem", background: "#F5F0E1", borderRadius: 12, padding: "1rem 1.15rem" }}>
        <div style={{ fontWeight: 700, color: "#0F2A5B", fontSize: "0.95rem", marginBottom: "0.75rem" }}>Compose</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }} className="admin-campaigns-filters">
          <Field label="Recipient source">
            <select data-testid="admin-campaigns-source" value={sourceType} onChange={(e) => setSourceType(e.target.value)} style={inputStyle}>
              {SOURCE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Pipeline stage">
            <select data-testid="admin-campaigns-stage" value={stage} onChange={(e) => setStage(e.target.value)} style={inputStyle}>
              {STAGE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Subject">
          <input data-testid="admin-campaigns-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="South Surrey market update — Feb 2026" style={inputStyle} maxLength={200} />
        </Field>

        <Field label="Body (HTML supported · {{first_name}} merge tag)">
          <textarea
            data-testid="admin-campaigns-body"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={10}
            placeholder="<p>Hi {{first_name}},</p>\n<p>Quick update on the South Surrey detached market…</p>"
            style={{ ...inputStyle, fontFamily: "monospace", fontSize: "0.85rem", resize: "vertical", minHeight: 160 }}
          />
        </Field>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          <button
            data-testid="admin-campaigns-preview-btn"
            onClick={runPreview}
            disabled={!subject.trim() || !bodyHtml.trim() || previewLoading}
            style={btnPrimary(!(subject.trim() && bodyHtml.trim()) || previewLoading)}
          >
            {previewLoading ? "Previewing…" : "① Preview recipients + BCFSA check"}
          </button>
          <button
            data-testid="admin-campaigns-send-btn"
            onClick={() => setConfirmVisible(true)}
            disabled={!canSend}
            style={btnDanger(!canSend)}
          >
            ② Send campaign
          </button>
        </div>

        {preview && (
          <div data-testid="admin-campaigns-preview-panel" style={{ marginTop: "0.85rem", padding: "0.75rem 1rem", background: "#fff", border: "1px solid rgba(15,42,91,0.15)", borderRadius: 8 }}>
            {preview.error && <div style={{ color: "#991B1B" }}>⚠ {preview.error}</div>}
            {preview.bcfsa_refusal && <div data-testid="admin-campaigns-bcfsa-refusal" style={{ color: "#991B1B", background: "#FEE2E2", padding: "0.55rem", borderRadius: 6, marginBottom: "0.5rem" }}>🛑 {preview.bcfsa_refusal}</div>}
            {typeof preview.recipient_count === "number" && (
              <>
                <div style={{ fontWeight: 700, color: "#0F2A5B", fontSize: "0.9rem" }} data-testid="admin-campaigns-recipient-count">Eligible recipients: {preview.recipient_count}</div>
                <div style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: 3 }}>Only contacts with CASL express consent and no active unsubscribe are counted.</div>
                {preview.sample?.length > 0 && (
                  <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: "0.82rem" }}>
                    {preview.sample.map((s, i) => <li key={i}>{s.full_name} — {s.email} ({s.source_type})</li>)}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {confirmVisible && (
          <div data-testid="admin-campaigns-confirm-modal" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", maxWidth: 460, width: "90vw" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", color: "#0F2A5B", marginBottom: "0.5rem" }}>Send campaign?</div>
              <p style={{ fontSize: "0.92rem", color: "#374151", lineHeight: 1.5 }}>
                About to send <b>{preview?.recipient_count}</b> CASL-compliant emails via Resend.
                Each recipient will receive a personalized copy with the mandatory unsubscribe footer.
                <br /><br />This cannot be paused once dispatched.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "flex-end" }}>
                <button data-testid="admin-campaigns-confirm-cancel" onClick={() => setConfirmVisible(false)} style={{ padding: "0.55rem 1rem", background: "#fff", color: "#0F2A5B", border: "1px solid #0F2A5B", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button data-testid="admin-campaigns-confirm-send" onClick={confirmSend} disabled={sending} style={{ padding: "0.55rem 1rem", background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>{sending ? "Sending…" : "Confirm & send"}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Past campaigns list */}
      <div style={{ marginTop: "1.5rem" }}>
        <div style={{ fontWeight: 700, color: "#0F2A5B", fontSize: "0.95rem", marginBottom: "0.5rem" }}>Recent campaigns</div>
        {loading && campaigns.length === 0 && <div style={{ color: "#6B7280", padding: "1rem" }}>Loading…</div>}
        {!loading && campaigns.length === 0 && <div style={{ color: "#6B7280", padding: "1rem", background: "#F9FAFB", borderRadius: 8 }}>No campaigns yet.</div>}
        {campaigns.length > 0 && (
          <table className="admin-table" data-testid="admin-campaigns-table">
            <thead>
              <tr><th>Created</th><th>Subject</th><th>Filter</th><th>Recipients</th><th>Sent</th><th>Errors</th><th>Status</th></tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} data-testid={`admin-campaigns-row-${c.id}`}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(c.created_at)}</td>
                  <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.subject}>{c.subject}</td>
                  <td style={{ fontSize: "0.78rem", color: "#6B7280" }}>{c.source_type} · {c.stage_filter}</td>
                  <td style={{ fontWeight: 600 }}>{c.recipient_count}</td>
                  <td style={{ color: "#059669", fontWeight: 600 }}>{c.live_counts?.sent ?? c.sent_count ?? 0}</td>
                  <td style={{ color: (c.live_counts?.error || c.error_count) ? "#991B1B" : "#6B7280" }}>{c.live_counts?.error ?? c.error_count ?? 0}</td>
                  <td><span style={{ padding: "0.15rem 0.55rem", borderRadius: 999, background: c.status === "complete" ? "#DCFCE7" : "#FEF3C7", color: c.status === "complete" ? "#065F46" : "#78350F", fontSize: "0.72rem", fontWeight: 700 }}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .admin-campaigns-filters { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AdminShell>
  );
};

const Field = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", fontSize: "0.72rem", fontFamily: "Inter,sans-serif", color: "#0F2A5B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", gap: 4, marginBottom: "0.5rem" }}>
    {label}
    {children}
  </label>
);

const inputStyle = { padding: "0.55rem 0.65rem", fontSize: "0.9rem", border: "1px solid rgba(15,42,91,0.2)", borderRadius: 8, background: "#fff", color: "#1F2937", fontFamily: "Inter,sans-serif", textTransform: "none", letterSpacing: 0, fontWeight: 400, width: "100%" };
const btnPrimary = (disabled) => ({ padding: "0.55rem 1rem", background: disabled ? "rgba(15,42,91,0.15)" : "#0F2A5B", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontSize: "0.85rem", opacity: disabled ? 0.6 : 1 });
const btnDanger = (disabled) => ({ padding: "0.55rem 1rem", background: disabled ? "rgba(220,38,38,0.25)" : "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontSize: "0.85rem", opacity: disabled ? 0.7 : 1 });

export default AdminCampaigns;
