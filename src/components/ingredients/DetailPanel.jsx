import { useState, useEffect } from "react";
import { SKU_FIELDS } from "../../constants";
import Badge from "../ui/Badge";
import SkuCommonNameEditor from "./SkuCommonNameEditor";

export default function DetailPanel({ item, suppliers, categories, lang, commonIngredients = [], onClose, onSave, onDelete, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [selCatIds, setSelCatIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      const f = {};
      SKU_FIELDS.forEach(({ key }) => { f[key] = item[key] || ""; });
      f.supplier_id = item.supplier_id || "";
      setForm(f);
      setSelCatIds(item.category_ids || []);
      setEditing(false);
    }
  }, [item]);

  if (!item) return null;

  const supplier = suppliers.find(s => s.id === item.supplier_id);
  const getCatDisplay = (cat) => lang === "en" ? (cat.name_en || cat.name_zh) : cat.name_zh;
  const getCatSub = (cat) => lang === "zh" ? cat.name_en : (lang === "en" ? cat.name_zh : null);
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(item.id, form, selCatIds); setEditing(false); }
    catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
  };
  const toggleCat = (catId) => setSelCatIds(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]);

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 520, background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", zIndex: 1000, overflowY: "auto", borderLeft: "1px solid #e2e8f0" }}>
      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{supplier?.supplier_name || "未知供应商"}</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{item.product_name || item.ingredient || "—"}</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!editing && <button onClick={() => setEditing(true)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#475569" }}>✏️ 编辑</button>}
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", padding: "4px 8px" }}>×</button>
          </div>
        </div>

        {!editing && (
          <div style={{ marginBottom: 16, padding: 12, background: "#f8fafc", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6 }}>供应商信息</div>
            <div style={{ fontSize: 13, color: "#334155" }}>
              <div>{supplier?.contact_email || "—"}</div>
              {supplier?.is_account_opened && <div style={{ marginTop: 4 }}>开户: {supplier.is_account_opened}</div>}
              {supplier?.agreement_signed && <div style={{ marginTop: 4 }}>Agreement: {supplier.agreement_signed}</div>}
            </div>
          </div>
        )}

        {!editing && item.category_ids?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {item.category_ids.map(cid => {
              const cat = categories.find(c => c.id === cid);
              if (!cat) return null;
              return <Badge key={cid} text={getCatDisplay(cat)} color={cat.color || "#64748b"} sub={getCatSub(cat)} />;
            })}
          </div>
        )}

        {editing && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 8 }}>功能标签（点击切换）</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {categories.map(cat => {
                  const active = selCatIds.includes(cat.id);
                  return (
                    <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{
                      padding: "3px 10px", fontSize: 11, borderRadius: 9999, cursor: "pointer",
                      border: `1px solid ${active ? (cat.color || "#64748b") : "#e2e8f0"}`,
                      background: active ? (cat.color || "#64748b") + "15" : "#fff",
                      color: active ? (cat.color || "#64748b") : "#94a3b8",
                      fontWeight: active ? 600 : 400,
                    }}>{cat.name_zh}{cat.name_en ? ` / ${cat.name_en}` : ""}</button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: 130, flexShrink: 0, fontSize: 13, color: "#64748b", fontWeight: 500, paddingTop: 8 }}>供应商</div>
              <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: parseInt(e.target.value) })} style={{ flex: 1, padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6 }}>
                <option value="">选择供应商</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: 130, flexShrink: 0, fontSize: 13, color: "#64748b", fontWeight: 500, paddingTop: 6 }}>通用名</div>
              <div style={{ flex: 1 }}>
                <SkuCommonNameEditor
                  skuId={item.id}
                  currentCommonId={item.common_ingredient_id}
                  commonIngredients={commonIngredients}
                  onSave={onRefresh}
                />
              </div>
            </div>
          </>
        )}

        {SKU_FIELDS.map(({ key, label }) => (
          <div key={key} style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: 130, flexShrink: 0, fontSize: 13, color: "#64748b", fontWeight: 500, paddingTop: editing ? 8 : 0 }}>{label}</div>
            {editing
              ? <textarea value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  rows={["health_canada_monograph", "notes", "npn_notes"].includes(key) ? 3 : 1}
                  style={{ flex: 1, padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, resize: "vertical", fontFamily: "inherit" }} />
              : <div style={{ fontSize: 13, color: "#1e293b", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{item[key] || "—"}</div>}
          </div>
        ))}

        {editing && (
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 10, fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8, background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer" }}>{saving ? "保存中..." : "保存"}</button>
            <button onClick={() => setEditing(false)} style={{ padding: "10px 20px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#475569" }}>取消</button>
            <button onClick={() => { if (confirm("确定删除这条记录？")) onDelete(item.id); }} style={{ padding: "10px 16px", fontSize: 14, border: "1px solid #fecaca", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#dc2626" }}>删除</button>
          </div>
        )}
      </div>
    </div>
  );
}
