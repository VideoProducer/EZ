// AdminTestimonials — CRUD admin panel for the /testimonials collection.
// Renders as the "🌟 Testimonials" tab inside <AdminShell/>. Doug can:
//   • Add a new client review (paste from Google GBP or client letter)
//   • Toggle is_published (hide bad reviews or ones pending approval)
//   • Toggle is_featured (push to the top of the carousel)
//   • Edit / delete
// Compliance guardrails are printed above the form so Doug doesn't
// paraphrase or invent reviews — that would breach BCFSA advertising.
import React, { useEffect, useState } from "react";
import axios from "axios";
import { AdminShell } from "../App";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const empty = {
  reviewer_name: "",
  rating: 5,
  date_reviewed: new Date().toISOString().slice(0, 10),
  text: "",
  source: "Google",
  source_url: "",
  photo_url: "",
  is_published: true,
  is_featured: false,
};

export default function AdminTestimonials() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("admin_token") || "";
    return { Authorization: `Bearer ${token}` };
  };

  const load = async () => {
    try {
      const r = await axios.get(`${API}/admin/testimonials`, { headers: authHeaders() });
      setRows(r.data || []);
    } catch (e) {
      setMsg("⚠ " + (e.response?.data?.detail || e.message));
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e?.preventDefault?.();
    if (!form.reviewer_name.trim() || !form.text.trim()) {
      setMsg("⚠ Reviewer name and review text are both required.");
      setTimeout(() => setMsg(""), 4000);
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await axios.put(`${API}/admin/testimonials/${editingId}`, form, { headers: authHeaders() });
        setMsg("✓ Review updated");
      } else {
        await axios.post(`${API}/admin/testimonials`, form, { headers: authHeaders() });
        setMsg("✓ Review added");
      }
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (e) {
      setMsg("⚠ " + (e.response?.data?.detail || e.message));
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const edit = (row) => {
    setForm({
      reviewer_name: row.reviewer_name || "",
      rating: row.rating || 5,
      date_reviewed: row.date_reviewed || new Date().toISOString().slice(0, 10),
      text: row.text || "",
      source: row.source || "Google",
      source_url: row.source_url || "",
      photo_url: row.photo_url || "",
      is_published: !!row.is_published,
      is_featured: !!row.is_featured,
    });
    setEditingId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (row) => {
    if (!confirm(`Delete the review from ${row.reviewer_name}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/admin/testimonials/${row.id}`, { headers: authHeaders() });
      setMsg("✓ Review deleted");
      await load();
    } catch (e) {
      setMsg("⚠ " + (e.response?.data?.detail || e.message));
    } finally {
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const togglePublish = async (row) => {
    try {
      await axios.put(`${API}/admin/testimonials/${row.id}`, {
        ...row, is_published: !row.is_published,
      }, { headers: authHeaders() });
      await load();
    } catch (e) {
      setMsg("⚠ " + (e.response?.data?.detail || e.message));
    }
  };

  return (
    <AdminShell active="testimonials">
      <div style={{ maxWidth: "60rem" }}>
        <h1 className="font-display" style={{ fontSize: "2rem", marginTop: 0 }}>🌟 Testimonials</h1>
        <p style={{ fontFamily: "Inter,sans-serif", color: "var(--muted)", lineHeight: 1.6 }}>
          Client reviews from Google Business Profile, RankMyAgent, Facebook, or direct client letters. Every published review appears in the hero carousel on the homepage + About page and contributes to Doug's <strong>AggregateRating</strong> JSON-LD schema (rich stars in Google Search).
        </p>

        {/* BCFSA compliance guardrail box */}
        <div style={{
          background: "#FEFCE8", border: "1px solid #FDE68A",
          borderRadius: 8, padding: "0.9rem 1.15rem", marginBottom: "1.25rem",
          fontFamily: "Inter,sans-serif", fontSize: "0.82rem", lineHeight: 1.55, color: "#78350F",
        }}>
          <strong>BCFSA compliance:</strong> Reviews must be transported verbatim from a real client. Do not paraphrase, invent, or edit the review body — that would breach BCFSA Rule 5-6 (advertising truthfulness). Reviewer's full first name and last-initial-minimum is required (no anonymous quotes). If the reviewer is a client whose sale is under NDA, obtain written consent before publishing.
        </div>

        {msg && (
          <div data-testid="admin-testimonials-msg" style={{
            padding: "0.7rem 1rem", borderRadius: 8, marginBottom: "1rem",
            background: msg.startsWith("⚠") ? "#FEE2E2" : "#DCFCE7",
            color: msg.startsWith("⚠") ? "#991B1B" : "#166534",
            fontFamily: "Inter,sans-serif", fontSize: "0.88rem",
          }}>{msg}</div>
        )}

        <form onSubmit={save} className="paper" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "Edit review" : "Add a new review"}</h3>
          <div className="field">
            <label>Reviewer name</label>
            <input value={form.reviewer_name} onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })} placeholder="Sarah M." data-testid="admin-t-name" required/>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.85rem" }}>
            <div className="field">
              <label>Star rating</label>
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} data-testid="admin-t-rating">
                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r === 1 ? "" : "s"}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Date of review</label>
              <input type="date" value={form.date_reviewed} onChange={(e) => setForm({ ...form, date_reviewed: e.target.value })} data-testid="admin-t-date" required/>
            </div>
          </div>
          <div className="field" style={{ marginTop: "0.85rem" }}>
            <label>Review text (verbatim)</label>
            <textarea rows={5} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Paste the full text of the client's review — do not paraphrase." data-testid="admin-t-text" required style={{ fontFamily: "'Playfair Display', serif" }}/>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 3 }}>{form.text.length} characters</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.85rem" }}>
            <div className="field">
              <label>Source</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} data-testid="admin-t-source">
                <option>Google</option>
                <option>Facebook</option>
                <option>RankMyAgent</option>
                <option>Zillow</option>
                <option>Direct client letter</option>
                <option>Instagram</option>
                <option>LinkedIn</option>
              </select>
            </div>
            <div className="field">
              <label>Source URL (deep link to public review)</label>
              <input type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://…" data-testid="admin-t-source-url"/>
            </div>
          </div>
          <div className="field" style={{ marginTop: "0.85rem" }}>
            <label>Reviewer photo URL (optional)</label>
            <input type="url" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://lh6.googleusercontent.com/…" data-testid="admin-t-photo"/>
          </div>
          <div style={{ display: "flex", gap: "1.25rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <label className="check"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} data-testid="admin-t-published"/> Published (visible on site)</label>
            <label className="check"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} data-testid="admin-t-featured"/> Featured (top of carousel)</label>
          </div>
          <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="btn btn-primary" disabled={busy} data-testid="admin-t-save">{busy ? "Saving…" : (editingId ? "Update review" : "Add review")}</button>
            {editingId && (
              <button type="button" onClick={() => { setForm(empty); setEditingId(null); }} className="btn" data-testid="admin-t-cancel" style={{ background: "#fff", border: "1.5px solid #0F2A5B", color: "#0F2A5B" }}>Cancel</button>
            )}
          </div>
        </form>

        {/* Existing rows */}
        <h3>Existing reviews ({rows.length})</h3>
        {rows.length === 0 && (
          <p style={{ color: "var(--muted)", fontFamily: "Inter,sans-serif" }}>No reviews yet — add your first Google review above.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((r) => (
            <div key={r.id} className="paper" data-testid={`admin-t-row-${r.id}`} style={{
              padding: "1rem 1.15rem",
              borderLeft: r.is_featured ? "4px solid #FDB813" : "4px solid transparent",
              opacity: r.is_published ? 1 : 0.55,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#0F2A5B", fontFamily: "Inter,sans-serif" }}>
                    {r.reviewer_name}
                    {" "}<span style={{ color: "#FDB813" }}>{"★".repeat(r.rating || 5)}</span>
                    {r.is_featured && <span style={{ marginLeft: 8, fontSize: "0.72rem", background: "#FDB813", color: "#0F2A5B", padding: "2px 6px", borderRadius: 3, fontWeight: 800 }}>FEATURED</span>}
                    {!r.is_published && <span style={{ marginLeft: 8, fontSize: "0.72rem", background: "#94A3B8", color: "#fff", padding: "2px 6px", borderRadius: 3, fontWeight: 800 }}>HIDDEN</span>}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "Inter,sans-serif" }}>
                    {r.source} · {r.date_reviewed}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button type="button" onClick={() => togglePublish(r)} className="btn" data-testid={`admin-t-toggle-${r.id}`} style={{ padding: "0.4rem 0.7rem", fontSize: "0.8rem", background: "#fff", border: "1.5px solid #64748B", color: "#64748B" }}>{r.is_published ? "Hide" : "Show"}</button>
                  <button type="button" onClick={() => edit(r)} className="btn" data-testid={`admin-t-edit-${r.id}`} style={{ padding: "0.4rem 0.7rem", fontSize: "0.8rem", background: "#fff", border: "1.5px solid #0F2A5B", color: "#0F2A5B" }}>Edit</button>
                  <button type="button" onClick={() => remove(r)} className="btn" data-testid={`admin-t-delete-${r.id}`} style={{ padding: "0.4rem 0.7rem", fontSize: "0.8rem", background: "#fff", border: "1.5px solid #DC2626", color: "#DC2626" }}>Delete</button>
                </div>
              </div>
              <p style={{ margin: "0.5rem 0 0", fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "#334155", lineHeight: 1.55 }}>"{r.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
