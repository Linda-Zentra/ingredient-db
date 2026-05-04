import { useState, useRef } from "react";
import Field, { inputStyle as iS } from "../ui/Field";
import MedicinalRow from "./MedicinalRow";
import { DOSAGE_FORM_TYPES, DOSAGE_FORM_SUBTYPES } from "../../constants";
import supabase from "../../lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function ProductForm({ product, skus, allExcipients, onSave, onDelete, onClose }) {
  const isEdit = !!product;

  // 找当前 default brand 的 id（product_brands 表里的 id，不是 brand_id）
  const initialDefaultBrandId =
    product?.productBrands?.find(pb => pb.is_default)?.id ||
    product?.productBrands?.[0]?.id ||
    null;

  const [form, setForm] = useState({
    product_name_zh:     product?.product_name_zh     || "",
    npn:                 product?.npn                 || "",
    licensing_status:    product?.licensing_status    || "not_started",
    is_marketed:         product?.is_marketed         || false,
    dosage_form_type:    product?.dosage_form_type    || "",
    dosage_form_subtype: product?.dosage_form_subtype || "",
    dose_amount:         product?.dose_amount         ?? "",
    dose_amount_max:     product?.dose_amount_max     ?? "",
    dose_unit:           product?.dose_unit           || "",
    dose_freq_min:       product?.dose_freq_min       ?? "",
    dose_freq_max:       product?.dose_freq_max       ?? "",
    dose_freq_unit:      product?.dose_freq_unit      || "",
    recommended_use:     product?.recommended_use     || "",
    caution:             product?.caution             || "",
    dose_population:     product?.dose_population     || "",
    dose_min_age:        product?.dose_min_age        ?? "",
    price_cad:           product?.price_cad           ?? "",
    price_usd:           product?.price_usd           ?? "",
    notes:               product?.notes               || "",
  });

  const [defaultBrandId, setDefaultBrandId] = useState(initialDefaultBrandId);
  const [brands, setBrands] = useState(product?.productBrands || []);
  const [newBrand, setNewBrand] = useState("");
  const [medicinal, setMedicinal] = useState(product?.medicinal || []);
  const [excipients, setExcipients] = useState(product?.excipients || []);
  const [newCommon, setNewCommon] = useState("");
  const [newExcipient, setNewExcipient] = useState("");
  const [saving, setSaving] = useState(false);
  const [imagePath, setImagePath] = useState(product?.image_path || null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const imageUrl = imagePath ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${imagePath}` : null;

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${product?.id || "new"}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) { alert("上传失败: " + error.message); setUploading(false); return; }
    setImagePath(path);
    if (product?.id) {
      await supabase.from("products").update({ image_path: path }).eq("id", product.id);
    }
    setUploading(false);
  };

  const handleImageRemove = async () => {
    if (!imagePath) return;
    await supabase.storage.from("product-images").remove([imagePath]);
    setImagePath(null);
    if (product?.id) {
      await supabase.from("products").update({ image_path: null }).eq("id", product.id);
    }
  };

  const handleAddCommon = () => {
    if (!newCommon.trim()) return;
    setMedicinal(m => [...m, {
      id: `new-${Date.now()}`, ingredient_name: newCommon.trim(), isNew: true,
      amount_value: "", amount_unit: "", sku_id: null, name_en: "", name_fr: "",
      extract_ratio: "", extract_type: "", dried_herb_equivalent: "", dhe_unit: "",
      potency_amount: "", potency_label: "", source_material: "", source_part: "", sort_order: 0,
    }]);
    setNewCommon("");
  };

  const handleDeleteCommon = (id) => setMedicinal(m => m.filter(r => r.id !== id));
  const handleUpdateSku = (id, skuId) => setMedicinal(m => m.map(r => r.id === id ? { ...r, sku_id: skuId } : r));
  const handleUpdateField = (id, field, value) => setMedicinal(m => m.map(r => r.id === id ? { ...r, [field]: value } : r));

  const handleAddBrand = () => {
    if (!newBrand.trim()) return;
    const tempId = `new-${Date.now()}`;
    setBrands(bs => [...bs, { id: tempId, brand_name: newBrand.trim(), is_default: false, isNew: true }]);
    if (brands.length === 0) setDefaultBrandId(tempId);
    setNewBrand("");
  };

  const handleAddExcipient = () => {
    if (!newExcipient.trim()) return;
    const existing = allExcipients.find(e => e.name.toLowerCase() === newExcipient.toLowerCase());
    setExcipients(ex => [...ex, { id: `new-${Date.now()}`, name: newExcipient.trim(), excipient_id: existing?.id || null, isNew: true }]);
    setNewExcipient("");
  };

  const handleDeleteExcipient = (id) => setExcipients(ex => ex.filter(e => e.id !== id));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(isEdit ? product.id : null, form, medicinal, excipients, defaultBrandId, imagePath, brands);
      onClose();
    } catch (e) { alert("保存失败: " + e.message); }
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
              <button onClick={() => { if (confirm(`确定删除「${product.product_name_zh || "此产品"}」？`)) { onDelete(product.id); onClose(); } }}
                style={{ padding: "6px 12px", fontSize: 12, border: "1px solid #fecaca", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>删除</button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>
        </div>

        {/* 产品图 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>产品图片</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {imageUrl ? (
              <div style={{ position: "relative" }}>
                <img src={imageUrl} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <button onClick={handleImageRemove}
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#ef4444", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>x</button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ width: 80, height: 80, borderRadius: 8, border: "2px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#f8fafc" }}
              >
                <span style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>{uploading ? "上传中..." : "+ 上传"}</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} style={{ display: "none" }} />
            {imageUrl && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#64748b", wordBreak: "break-all" }}>{imagePath}</div>
                <button onClick={() => fileRef.current?.click()} style={{ marginTop: 4, padding: "3px 8px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", color: "#475569", cursor: "pointer" }}>
                  {uploading ? "上传中..." : "更换图片"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 基本信息 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="产品名称 / Brand Name">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {brands.map(pb => (
                <div key={pb.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input value={pb.brand_name} onChange={e => setBrands(bs => bs.map(b => b.id === pb.id ? { ...b, brand_name: e.target.value } : b))}
                    style={{ ...iS, flex: 1 }} placeholder="Brand name" />
                  <button onClick={() => setDefaultBrandId(pb.id)} title="设为默认"
                    style={{ padding: "4px 8px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, cursor: "pointer",
                      background: defaultBrandId === pb.id ? "#3b82f6" : "#fff", color: defaultBrandId === pb.id ? "#fff" : "#64748b" }}>
                    {defaultBrandId === pb.id ? "默认" : "设默认"}
                  </button>
                  <button onClick={() => { setBrands(bs => bs.filter(b => b.id !== pb.id)); if (defaultBrandId === pb.id) setDefaultBrandId(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 16 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                    onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}>×</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6 }}>
                <input value={newBrand} onChange={e => setNewBrand(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddBrand()}
                  placeholder="添加品牌名..."
                  style={{ ...iS, flex: 1 }} />
                <button onClick={handleAddBrand}
                  style={{ padding: "6px 12px", fontSize: 12, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>+</button>
              </div>
            </div>
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="NPN" style={{ flex: 1 }}>
              <input value={form.npn} onChange={e => f("npn", e.target.value)} style={iS} placeholder="80145433" />
            </Field>
            <Field label="Licensing Status" style={{ flex: 1 }}>
              <select value={form.licensing_status} onChange={e => f("licensing_status", e.target.value)} style={iS}>
                <option value="not_started">未申请</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" id="is_marketed" checked={form.is_marketed} onChange={e => f("is_marketed", e.target.checked)} />
            <label htmlFor="is_marketed" style={{ fontSize: 13, color: "#475569", cursor: "pointer", whiteSpace: "nowrap" }}>已上市</label>
          </div>
        </div>

        {/* Medicinal Ingredients */}
        {sectionTitle("Medicinal Ingredients")}
        {medicinal.map(item => (
          <MedicinalRow key={item.id} item={item} skus={skus} editing={true}
            onUpdateSku={handleUpdateSku} onUpdateField={handleUpdateField} onDelete={handleDeleteCommon} />
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

        {/* 标签信息 */}
        {sectionTitle("标签信息")}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Recommended Use">
            <textarea value={form.recommended_use} onChange={e => f("recommended_use", e.target.value)} rows={2} style={{ ...iS, resize: "vertical", fontFamily: "inherit" }} />
          </Field>
          <Field label="Cautions & Warnings">
            <textarea value={form.caution} onChange={e => f("caution", e.target.value)} rows={2} style={{ ...iS, resize: "vertical", fontFamily: "inherit" }} />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Dosage Form Type" style={{ flex: 1 }}>
              <select value={form.dosage_form_type} onChange={e => { f("dosage_form_type", e.target.value); f("dosage_form_subtype", ""); }} style={iS}>
                <option value="">—</option>
                {DOSAGE_FORM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Subtype" style={{ flex: 1 }}>
              {(DOSAGE_FORM_SUBTYPES[form.dosage_form_type] ?? []).length > 0 ? (
                <select value={form.dosage_form_subtype} onChange={e => f("dosage_form_subtype", e.target.value)} style={iS}>
                  <option value="">—</option>
                  {(DOSAGE_FORM_SUBTYPES[form.dosage_form_type] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input value={form.dosage_form_subtype} onChange={e => f("dosage_form_subtype", e.target.value)} style={iS} placeholder="—" />
              )}
            </Field>
          </div>
        </div>

        {/* 剂量 — 用于自动生成 Recommended Dose 文案 */}
        {sectionTitle("Recommended Dose")}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Amount" style={{ flex: 1 }}>
              <input value={form.dose_amount} onChange={e => f("dose_amount", e.target.value)} style={iS} placeholder="1" type="number" />
            </Field>
            <Field label="Max (可选)" style={{ flex: 1 }}>
              <input value={form.dose_amount_max} onChange={e => f("dose_amount_max", e.target.value)} style={iS} placeholder="" type="number" />
            </Field>
            <Field label="Unit" style={{ flex: 2 }}>
              <input value={form.dose_unit} onChange={e => f("dose_unit", e.target.value)} style={iS} placeholder="capsule(s)" />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Freq Min" style={{ flex: 1 }}>
              <input value={form.dose_freq_min} onChange={e => f("dose_freq_min", e.target.value)} style={iS} placeholder="1" type="number" />
            </Field>
            <Field label="Freq Max (可选)" style={{ flex: 1 }}>
              <input value={form.dose_freq_max} onChange={e => f("dose_freq_max", e.target.value)} style={iS} placeholder="" type="number" />
            </Field>
            <Field label="Freq Unit" style={{ flex: 2 }}>
              <input value={form.dose_freq_unit} onChange={e => f("dose_freq_unit", e.target.value)} style={iS} placeholder="per day" />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="适用人群 (Population)" style={{ flex: 2 }}>
              <input value={form.dose_population} onChange={e => f("dose_population", e.target.value)} style={iS} placeholder="Adults" />
            </Field>
            <Field label="最小年龄" style={{ flex: 1 }}>
              <input value={form.dose_min_age} onChange={e => f("dose_min_age", e.target.value)} style={iS} placeholder="18" type="number" />
            </Field>
          </div>
        </div>

        {/* 其他信息 */}
        {sectionTitle("其他信息")}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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