import { useState } from "react";
import Badge from "../ui/Badge";
import { PRESET_COLORS } from "../../constants";

export default function AddCategoryForm({ onAdd, onClose }) {
  const [zh, setZh] = useState("");
  const [en, setEn] = useState("");
  const [color, setColor] = useState("#64748b");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!zh.trim()) { alert("请填写中文名"); return; }
    setSaving(true);
    try { await onAdd({ name_zh: zh.trim(), name_en: en.trim() || null, color }); onClose(); }
    catch (e) { alert("添加失败: " + e.message); }
    setSaving(false);
  };

  const labelStyle = { fontSize: 12, color: "#64748b", fontWeight: 500, display: "block", marginBottom: 4 };
  const inputStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1200, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 400, padding: "24px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>新建功能分类</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={labelStyle}>中文名 *</label><input value={zh} onChange={e => setZh(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>英文名</label><input value={en} onChange={e => setEn(e.target.value)} style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>颜色</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: 6, border: color === c ? "3px solid #0f172a" : "2px solid #e2e8f0", background: c, cursor: "pointer" }} />
              ))}
            </div>
          </div>
          <div><span style={{ fontSize: 12, color: "#64748b" }}>预览：</span><Badge text={zh || "分类名"} color={color} sub={en || undefined} /></div>
        </div>
        <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: 10, fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8, background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer", marginTop: 16 }}>
          {saving ? "添加中..." : "添加分类"}
        </button>
      </div>
    </div>
  );
}
