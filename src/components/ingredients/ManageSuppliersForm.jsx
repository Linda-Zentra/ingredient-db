import { useState } from "react";

const FIELDS = [
  { key: "supplier_name", label: "供应商名称 *", required: true },
  { key: "contact_email", label: "联系人 (email)" },
  { key: "is_account_opened", label: "是否开户" },
  { key: "agreement_signed", label: "Agreement Signed" },
];

export default function ManageSuppliersForm({ suppliers, onAdd, onUpdate, onDelete, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ supplier_name: "", contact_email: "", is_account_opened: "", agreement_signed: "" });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = suppliers.filter(s =>
    s.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditForm({ supplier_name: s.supplier_name || "", contact_email: s.contact_email || "", is_account_opened: s.is_account_opened || "", agreement_signed: s.agreement_signed || "" });
  };

  const handleSave = async () => {
    if (!editForm.supplier_name?.trim()) { alert("供应商名称不能为空"); return; }
    setSaving(true);
    try { await onUpdate(editingId, editForm); setEditingId(null); }
    catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
  };

  const handleAdd = async () => {
    if (!newForm.supplier_name?.trim()) { alert("供应商名称不能为空"); return; }
    setSaving(true);
    try {
      const cleaned = {};
      FIELDS.forEach(f => { cleaned[f.key] = newForm[f.key]?.trim() || null; });
      await onAdd(cleaned);
      setNewForm({ supplier_name: "", contact_email: "", is_account_opened: "", agreement_signed: "" });
      setShowNew(false);
    } catch (e) { alert("添加失败: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (s) => {
    if (!confirm(`确定删除供应商「${s.supplier_name}」？该供应商下的所有SKU也会被删除！`)) return;
    try { await onDelete(s.id); } catch (e) { alert("删除失败: " + e.message); }
  };

  const rowInput = { flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6 };
  const rowLabel = { width: 120, fontSize: 12, color: "#64748b", fontWeight: 500, flexShrink: 0 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1200, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 40 }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 620, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>管理供应商 ({suppliers.length})</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowNew(!showNew)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, background: "#2563eb", color: "#fff", cursor: "pointer" }}>+ 新增供应商</button>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
            </div>
          </div>

          {showNew && (
            <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FIELDS.map(f => (
                  <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={rowLabel}>{f.label}</label>
                    <input value={newForm[f.key]} onChange={e => setNewForm({ ...newForm, [f.key]: e.target.value })} style={rowInput} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={handleAdd} disabled={saving} style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer" }}>{saving ? "添加中..." : "添加"}</button>
                <button onClick={() => setShowNew(false)} style={{ padding: "6px 16px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer" }}>取消</button>
              </div>
            </div>
          )}

          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜索供应商..."
            style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, marginBottom: 12, boxSizing: "border-box" }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map(s => (
              <div key={s.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                {editingId === s.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {FIELDS.map(f => (
                      <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={rowLabel}>{f.label}</label>
                        <input value={editForm[f.key]} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} style={rowInput} />
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleSave} disabled={saving} style={{ padding: "5px 14px", fontSize: 12, border: "none", borderRadius: 6, background: "#2563eb", color: "#fff", cursor: "pointer" }}>保存</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: "5px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer" }}>取消</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{s.supplier_name}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        {s.contact_email || "无联系方式"}
                        {s.agreement_signed && <span style={{ marginLeft: 8, color: "#16a34a" }}>✓ Agreement</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => startEdit(s)} style={{ padding: "4px 10px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>编辑</button>
                      <button onClick={() => handleDelete(s)} style={{ padding: "4px 10px", fontSize: 11, border: "1px solid #fecaca", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#dc2626" }}>删除</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>无匹配结果</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
