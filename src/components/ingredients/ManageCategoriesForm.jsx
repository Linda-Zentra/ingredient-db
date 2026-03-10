import { useState } from "react";
import Badge from "../ui/Badge";
import { PRESET_COLORS } from "../../constants";

export default function ManageCategoriesForm({ categories, onUpdate, onDelete, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditForm({ name_zh: cat.name_zh, name_en: cat.name_en || "", color: cat.color || "#64748b" });
  };

  const handleSave = async () => {
    try { await onUpdate(editingId, editForm); setEditingId(null); }
    catch (e) { alert("保存失败: " + e.message); }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`确定删除分类「${cat.name_zh}」？`)) return;
    try { await onDelete(cat.id); } catch (e) { alert("删除失败: " + e.message); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1200, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 60 }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 520, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>管理功能分类</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                {editingId === cat.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={editForm.name_zh} onChange={e => setEditForm({ ...editForm, name_zh: e.target.value })} style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6 }} />
                      <input value={editForm.name_en} onChange={e => setEditForm({ ...editForm, name_en: e.target.value })} style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6 }} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setEditForm({ ...editForm, color: c })} style={{ width: 22, height: 22, borderRadius: 4, cursor: "pointer", border: editForm.color === c ? "2px solid #0f172a" : "1px solid #e2e8f0", background: c }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={handleSave} style={{ padding: "5px 14px", fontSize: 12, border: "none", borderRadius: 6, background: "#2563eb", color: "#fff", cursor: "pointer" }}>保存</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: "5px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer" }}>取消</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Badge text={cat.name_zh} color={cat.color || "#64748b"} sub={cat.name_en} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => startEdit(cat)} style={{ padding: "4px 10px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>编辑</button>
                      <button onClick={() => handleDelete(cat)} style={{ padding: "4px 10px", fontSize: 11, border: "1px solid #fecaca", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#dc2626" }}>删除</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
