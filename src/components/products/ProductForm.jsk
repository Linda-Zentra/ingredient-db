import { useState } from "react";
import Field, { inputStyle as iS } from "../ui/Field";
import MedicinalRow from "./MedicinalRow";

export default function ProductForm({ product, brands, skus, allExcipients, onSave, onDelete, onClose }) {
  const isEdit = !!product;
  const defaultBrand = brands.find(b => b.is_default);

  const [form, setForm] = useState({
    product_name:     product?.product_name    || "",
    product_name_zh:  product?.product_name_zh || "",
    primary_brand_id: product?.primary_brand_id || defaultBrand?.id || "",
    npn:              product?.npn              || "",
    licensing_status: product?.licensing_status || "not_started",
    is_marketed:      product?.is_marketed      || false,
    dosage_form:      product?.dosage_form       || "",
    recommended_dose: product?.recommended_dose  || "",
    price_cad:        product?.price_cad         || "",
    price_usd:        product?.price_usd         || "",
    notes:            product?.notes             || "",
  });

  const [medicinal, setMedicinal] = useState(product?.medicinal || []);
  const [excipients, setExcipients] = useState(product?.excipients || []);
  const [newCommon, setNewCommon] = useState("");
  const [newExcipient, setNewExcipient] = useState("");
  const [saving, setSaving] = useState(false);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleAddCommon = () => {
    if (!newCommon.trim()) return;
    setMedicinal(m => [...m, { id: `new-${Date.now()}`, common_name: newCommon.trim(), amount: "", sku_id: null, isNew: true }]);
    setNewCommon("");
  };

  const handleDeleteCommon = (id) => setMedicinal(m => m.filter(r => r.id !== id));
  const handleUpdateSku = (id, skuId) => setMedicinal(m => m.map(r => r.id === id ? { ...r, sku_id: skuId } : r));

  const handleAddExcipient = () => {
    if (!newExcipient.trim()) return;
    const existing = allExcipients.find(e => e.name.toLowerCase() === newExcipient.toLowerCase());
    setExcipients(ex => [...ex, { id: `new-${Date.now()}`, name: newExcipient.trim(), excipient_id: existing?.id || null, isNew: true }]);
    setNewExcipient("");
  };

  const handleDeleteExcipient = (id) => setExcipients(ex => ex.filter(e => e.id !== id));

  const handleSubmit = async () => {
    if (!form.product_name.trim()) { alert("请填写产品名称"); return; }
    setSaving(true);
    try { await onSave(isEdit ? product.id : null, form, medicinal, excipients); onClose(); }
    catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
  };

  const sectionTitle = (t) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, margin: "16px 0 8px" }}>{t}</div>
  );

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 540, background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", zIndex: 1000, overflowY: "auto", borderLeft: "1px solid #e2e8f0" }}>
      <div style={{ padding: "24px 28px" }}>
        {/* 头部 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{isEdit ? "编辑产品" : "新增产品"}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {isEdit && (
              <button onClick={() => { if (confirm(`确定删除「${product.product_name}」？`)) { onDelete(product.id); onClose(); } }}
                style={{ padding: "6px 12px", fontSize: 12, border: "1px solid #fecaca", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>删除</button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>
        </div>

        {/* 基本信息 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Product Name *">
            <input value={form.product_name} onChange={e => f("product_name", e.target.value)} style={iS} placeholder="e.g. Ashwagandha 600mg" />
          </Field>
          <Field label="中文名">
            <input value={form.product_name_zh} onChange={e => f("product_name_zh", e.target.value)} style={iS} placeholder="可选" />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="品牌" style={{ flex: 1 }}>
              <select value={form.primary_brand_id} onChange={e => f("primary_brand_id", e.target.value)} style={iS}>
                <option value="">选择品牌</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="NPN" style={{ flex: 1 }}>
              <input value={form.npn} onChange={e => f("npn", e.target.value)} style={iS} placeholder="80145433" />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <Field label="Licensing Status" style={{ flex: 1 }}>
              <select value={form.licensing_status} onChange={e => f("licensing_status", e.target.value)} style={iS}>
                <option value="not_started">未申请</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </Field>
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 8 }}>
              <input type="checkbox" id="is_marketed" checked={form.is_marketed} onChange={e => f("is_marketed", e.target.checked)} />
              <label htmlFor="is_marketed" style={{ fontSize: 13, color: "#475569", cursor: "pointer", whiteSpace: "nowrap" }}>已上市</label>
            </div>
          </div>
        </div>

        {/* Medicinal Ingredients */}
        {sectionTitle("Medicinal Ingredients")}
        {medicinal.map(item => (
          <MedicinalRow key={item.id} item={item} skus={skus} editing={true}
            onUpdateSku={handleUpdateSku} onDelete={handleDeleteCommon} />
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input value={newCommon} onChange={e => setNewCommon(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddCommon()}
            placeholder="添加通用名，如 Withania somnifera..."
            style={{ flex: 1, padding: "6px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, outline: "none" }} />
          <button onClick={handleAddCommon} style={{ padding: "6px 12px", fontSize: 12, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>+ 添加</button>
        </div>

        {/* Non-medicinal */}
        {sectionTitle("Non-medicinal Ingredients")}
        {excipients.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ flex: 1, fontSize: 13, color: "#334155" }}>{item.name}</div>
            <button onClick={() => handleDeleteExcipient(item.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 16, padding: "0 2px" }}
              onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
              onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input value={newExcipient} onChange={e => setNewExcipient(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddExcipient()}
            placeholder="添加辅料，如 Hypromellose..."
            list="exc-suggestions"
            style={{ flex: 1, padding: "6px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, outline: "none" }} />
          <datalist id="exc-suggestions">
            {allExcipients.map(e => <option key={e.id} value={e.name} />)}
          </datalist>
          <button onClick={handleAddExcipient} style={{ padding: "6px 12px", fontSize: 12, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>+ 添加</button>
        </div>

        {/* 其他信息 */}
        {sectionTitle("其他信息")}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Dosage Form">
            <input value={form.dosage_form} onChange={e => f("dosage_form", e.target.value)} style={iS} placeholder="Capsule, hard" />
          </Field>
          <Field label="Recommended Dose">
            <input value={form.recommended_dose} onChange={e => f("recommended_dose", e.target.value)} style={iS} />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Price CAD" style={{ flex: 1 }}>
              <input value={form.price_cad} onChange={e => f("price_cad", e.target.value)} style={iS} placeholder="0.00" />
            </Field>
            <Field label="Price USD" style={{ flex: 1 }}>
              <input value={form.price_usd} onChange={e => f("price_usd", e.target.value)} style={iS} placeholder="0.00" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2} style={{ ...iS, resize: "vertical", fontFamily: "inherit" }} />
          </Field>
        </div>

        <button onClick={handleSubmit} disabled={saving} style={{
          width: "100%", padding: 12, fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8,
          background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer", marginTop: 20,
        }}>{saving ? "保存中..." : "保存"}</button>
      </div>
    </div>
  );
}
