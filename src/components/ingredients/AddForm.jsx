import { useState } from "react";
import { SKU_FIELDS } from "../../constants";

export default function AddForm({ suppliers, categories, onAdd, onClose }) {
  const [form, setForm] = useState({ supplier_id: "" });
  const [selCatIds, setSelCatIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleCat = (catId) => setSelCatIds(p => p.includes(catId) ? p.filter(c => c !== catId) : [...p, catId]);

  const handleSubmit = async () => {
    if (!form.supplier_id) { alert("请选择供应商"); return; }
    setSaving(true);
    try { await onAdd(form, selCatIds); onClose(); }
    catch (e) { alert("添加失败: " + e.message); }
    setSaving(false);
  };

  const labelStyle = { fontSize: 12, color: "#64748b", fontWeight: 500, display: "block", marginBottom: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1100, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 60 }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 560, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>新增条目</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>供应商 *</label>
              <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, marginTop: 4 }}>
                <option value="">选择供应商</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
            {SKU_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input value={form[key] || ""} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, marginTop: 4, boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>功能标签</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {categories.map(cat => {
                  const active = selCatIds.includes(cat.id);
                  return (
                    <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{
                      padding: "3px 10px", fontSize: 11, borderRadius: 9999, cursor: "pointer",
                      border: `1px solid ${active ? (cat.color || "#64748b") : "#e2e8f0"}`,
                      background: active ? (cat.color || "#64748b") + "15" : "#fff",
                      color: active ? (cat.color || "#64748b") : "#94a3b8",
                    }}>{cat.name_zh}</button>
                  );
                })}
              </div>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: 12, fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8, background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer", marginTop: 20 }}>
            {saving ? "添加中..." : "添加"}
          </button>
        </div>
      </div>
    </div>
  );
}
