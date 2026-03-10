import { useState, useMemo, useEffect, useRef } from "react";

// ============================================================
// Supabase 连接
// ============================================================
const SUPABASE_URL = "https://fotcnfwkzncsxbbvpdpw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdGNuZndrem5jc3hiYnZwZHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY0MDgsImV4cCI6MjA4ODA2MjQwOH0.0Y1OazcLFBP_FOg-_CIodPbt7-eepZ7CIDaib4E-XK0";

const supabase = {
  from: (table) => ({
    select: async (cols = "*") => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(cols)}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    insert: async (rows) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    update: async (id, data) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    delete: async (id) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return true;
    },
    deleteWhere: async (col, val) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return true;
    },
  }),
};

// ============================================================
// 常量
// ============================================================
const PASSWORDS = {
  internal: "ingredient2026",
  operations: "operations2026", // 改成你想要的运营密码
};

const SKU_FIELDS = [
  { key: "region", label: "地区" }, { key: "ingredient_name", label: "品名" },
  { key: "form_potency", label: "Form & Potency" }, { key: "ingredient", label: "成分" },
  { key: "extraction_ratio_source", label: "提取比例/来源" }, { key: "lead_time", label: "交付周期" },
  { key: "expire_date", label: "Expire Date" }, { key: "price_usd_kg", label: "价格(USD/KG)" },
  { key: "price_cad_kg", label: "价格(CAD/KG)" }, { key: "daily_recommended_dose", label: "日推荐摄入量" },
  { key: "health_canada_monograph", label: "HC Monograph" }, { key: "moq_kg", label: "MOQ kg" },
  { key: "can_apply_npn", label: "能否申NPN" }, { key: "npn_notes", label: "NPN备注" },
  { key: "applicable_gender", label: "适用性别" }, { key: "applicable_population", label: "适用人群" },
  { key: "notes", label: "备注" }, { key: "certificates", label: "Certificates" },
];

const TABLE_COLS = [
  { key: "region", label: "地区", w: 90 }, { key: "supplier_name", label: "供应商", w: 130 },
  { key: "contact_email", label: "联系人", w: 130 }, { key: "is_account_opened", label: "是否开户", w: 80 },
  { key: "agreement_signed", label: "Agreement", w: 110 }, { key: "ingredient_name", label: "品名", w: 150 },
  { key: "form_potency", label: "Form & Potency", w: 130 }, { key: "ingredient", label: "成分", w: 150 },
  { key: "extraction_ratio_source", label: "提取比例/来源", w: 120 }, { key: "lead_time", label: "交付周期", w: 100 },
  { key: "expire_date", label: "Expire", w: 90 }, { key: "price_usd_kg", label: "USD/KG", w: 110 },
  { key: "price_cad_kg", label: "CAD/KG", w: 100 }, { key: "daily_recommended_dose", label: "日推荐摄入量", w: 100 },
  { key: "health_canada_monograph", label: "HC Monograph", w: 110 }, { key: "moq_kg", label: "MOQ", w: 70 },
  { key: "functions", label: "功能", w: 180 }, { key: "can_apply_npn", label: "NPN", w: 60 },
  { key: "npn_notes", label: "NPN备注", w: 120 }, { key: "applicable_gender", label: "性别", w: 50 },
  { key: "applicable_population", label: "人群", w: 60 }, { key: "notes", label: "备注", w: 120 },
  { key: "certificates", label: "Certificates", w: 120 },
];
function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Badge({ text, color, sub }) {
  return (
    <span style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      padding: sub ? "3px 10px 2px" : "2px 8px", borderRadius: 9999,
      fontSize: 11, fontWeight: 500, marginRight: 4, marginBottom: 2,
      background: color + "18", color, border: `1px solid ${color}40`, whiteSpace: "nowrap", lineHeight: 1.3,
    }}>
      <span>{text}</span>
      {sub && <span style={{ fontSize: 9, opacity: 0.7 }}>{sub}</span>}
    </span>
  );
}
// ============================================================
// STATUS CONFIG — 替换掉原来的 STATUS_CONFIG 常量
// ============================================================
const STATUS_CONFIG = {
  licensing: {
    not_started: { label: "未申请", color: "#94a3b8" },
    pending:     { label: "Pending", color: "#f59e0b" },
    active:      { label: "Active",  color: "#22c55e" },
    expired:     { label: "Expired", color: "#ef4444" },
  },
};

function StatusBadge({ type, value }) {
  const cfg = STATUS_CONFIG[type]?.[value] || { label: value || "—", color: "#94a3b8" };
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 500,
      background: cfg.color + "18", color: cfg.color, border: `1px solid ${cfg.color}40`,
    }}>{cfg.label}</span>
  );
}

const labelStyle = { fontSize: 12, color: "#64748b", fontWeight: 500, display: "block", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit" };

// ============================================================
// 品牌名显示逻辑
// ============================================================
function getDisplayName(product, productBrands, brands) {
  if (!productBrands?.length) return product.product_name || "—";
  const brandMap = {};
  brands.forEach(b => { brandMap[b.id] = b.name; });
  const zentra = productBrands.find(pb => brandMap[pb.brand_id] === "Zentra");
  if (zentra) return zentra.brand_name || product.product_name;
  const zensta = productBrands.find(pb => brandMap[pb.brand_id] === "Zensta");
  if (zensta) return zensta.brand_name || product.product_name;
  return product.product_name || "—";
}

// ============================================================
// MedicinalRow — 详情/编辑里一行 medicinal ingredient
// ============================================================
function MedicinalRow({ item, skus, onUpdateSku, onDelete, editing }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const matched = skus.find(s => s.id === item.sku_id);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase();
    return skus.filter(s =>
      s.ingredient_name?.toLowerCase().includes(q) ||
      s.ingredient?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [input, skus]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{item.common_name}</div>
        {item.amount && <div style={{ fontSize: 11, color: "#64748b" }}>{item.amount}</div>}
      </div>
      <div ref={ref} style={{ position: "relative", width: 190 }}>
        {matched ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "4px 8px" }}>
            <div style={{ flex: 1, fontSize: 11, color: "#1e40af", fontWeight: 500 }}>{matched.ingredient_name || matched.ingredient || "—"}</div>
            {editing && <button onClick={() => onUpdateSku(item.id, null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: 0 }}>×</button>}
          </div>
        ) : (
          <input value={input} onChange={e => { setInput(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            placeholder="关联 SKU..." disabled={!editing}
            style={{ width: "100%", padding: "4px 8px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", outline: "none", background: editing ? "#fff" : "#f8fafc" }} />
        )}
        {open && suggestions.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 600, maxHeight: 200, overflowY: "auto" }}>
            {suggestions.map(s => (
              <div key={s.id} onClick={() => { onUpdateSku(item.id, s.id); setInput(""); setOpen(false); }}
                style={{ padding: "6px 10px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <div style={{ fontWeight: 500, color: "#0f172a" }}>{s.ingredient_name || "—"}</div>
                <div style={{ color: "#64748b", fontSize: 11 }}>{s.ingredient || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editing && (
        <button onClick={() => onDelete(item.id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 16, padding: "0 2px", lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
          onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}>×</button>
      )}
    </div>
  );
}

// ============================================================
// CommonNamePicker — SKU详情面板里关联common name
// ============================================================
function CommonNamePicker({ skuId, currentCommonId, commonIngredients, onChange }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = commonIngredients.find(c => c.id === currentCommonId);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase();
    return commonIngredients.filter(c => c.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [input, commonIngredients]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {current ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "5px 10px" }}>
          <div style={{ flex: 1, fontSize: 12, color: "#15803d", fontWeight: 500 }}>{current.name}</div>
          <button onClick={() => onChange(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: 0 }}>×</button>
        </div>
      ) : (
        <input value={input} onChange={e => { setInput(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="关联通用名..."
          style={{ width: "100%", padding: "6px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", outline: "none" }} />
      )}
      {open && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 600, maxHeight: 200, overflowY: "auto" }}>
          {suggestions.map(c => (
            <div key={c.id} onClick={() => { onChange(c.id); setInput(""); setOpen(false); }}
              style={{ padding: "6px 10px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



// ============================================================
// ProductForm — 新增 + 编辑同一个表单（右侧面板）
// ============================================================
function ProductForm({ product, brands, skus, allExcipients, onSave, onDelete, onClose }) {
  const isEdit = !!product;
  const defaultBrand = brands.find(b => b.is_default);

  const [form, setForm] = useState({
    product_name:      product?.product_name    || "",
    product_name_zh:   product?.product_name_zh || "",
    primary_brand_id:  product?.primary_brand_id || defaultBrand?.id || "",
    npn:               product?.npn              || "",
    licensing_status:  product?.licensing_status || "not_started",
    is_marketed:       product?.is_marketed      || false,
    dosage_form:       product?.dosage_form       || "",
    recommended_dose:  product?.recommended_dose  || "",
    price_cad:         product?.price_cad         || "",
    price_usd:         product?.price_usd         || "",
    notes:             product?.notes             || "",
  });

  // medicinal: [{id, common_name, amount, sku_id}] — edit时从product来，新增时空
  const [medicinal, setMedicinal] = useState(product?.medicinal || []);
  // excipients: [{id(pe_id), excipient_id, name}]
  const [excipients, setExcipients] = useState(product?.excipients || []);
  // 新增common行
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

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 11, color: "#64748b", fontWeight: 500, display: "block", marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

const iS = { width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit", outline: "none" };

// ============================================================
// ProductTab
// ============================================================
function ProductTab({ skus }) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [excipients, setExcipients] = useState([]);
  const [commonIngredients, setCommonIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formProduct, setFormProduct] = useState(undefined); // undefined=关闭, null=新增, obj=编辑
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterLicensing, setFilterLicensing] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, brandsData, pbs, pmis, pes, excs, commons] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("brands").select("*"),
        supabase.from("product_brands").select("*"),
        supabase.from("product_medicinal_ingredients").select("*"),
        supabase.from("product_excipients").select("*"),
        supabase.from("excipients").select("*"),
        supabase.from("common_ingredients").select("*"),
      ]);
      setBrands(brandsData);
      setExcipients(excs);
      setCommonIngredients(commons);
      const pbMap = {}, pmiMap = {}, peMap = {};
      pbs.forEach(pb => { if (!pbMap[pb.product_id]) pbMap[pb.product_id] = []; pbMap[pb.product_id].push(pb); });
      pmis.forEach(pmi => {   const common = commons.find(c => c.id === pmi.common_ingredient_id);   pmi.common_name = common?.name || "—";   if (!pmiMap[pmi.product_id]) pmiMap[pmi.product_id] = [];   pmiMap[pmi.product_id].push(pmi); });
      pes.forEach(pe => { if (!peMap[pe.product_id]) peMap[pe.product_id] = []; peMap[pe.product_id].push(pe); });
      setProducts(prods.map(p => ({
        ...p,
        productBrands: pbMap[p.id] || [],
        medicinal: pmiMap[p.id] || [],
        excipients: (peMap[p.id] || []).map(pe => {
          const exc = excs.find(e => e.id === pe.excipient_id);
          return { id: pe.id, excipient_id: pe.excipient_id, name: exc?.name || "—" };
        }),
      })));
    } catch (e) { alert("加载失败: " + e.message); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      if (q) {
        const names = [p.product_name, p.product_name_zh, ...(p.productBrands || []).map(pb => pb.brand_name)].filter(Boolean).join(" ").toLowerCase();
        if (!names.includes(q)) return false;
      }
      if (filterBrand && String(p.primary_brand_id) !== filterBrand) return false;
      if (filterLicensing && p.licensing_status !== filterLicensing) return false;
      return true;
    });
  }, [products, search, filterBrand, filterLicensing]);

  const handleSave = async (productId, formData, medicinal, excipientsList) => {
    const payload = {
      product_name:     formData.product_name    || null,
      product_name_zh:  formData.product_name_zh || null,
      primary_brand_id: formData.primary_brand_id ? parseInt(formData.primary_brand_id) : null,
      npn:              formData.npn              || null,
      licensing_status: formData.licensing_status,
      is_marketed:      formData.is_marketed,
      dosage_form:      formData.dosage_form      || null,
      recommended_dose: formData.recommended_dose || null,
      price_cad:        formData.price_cad ? parseFloat(formData.price_cad) : null,
      price_usd:        formData.price_usd ? parseFloat(formData.price_usd) : null,
      notes:            formData.notes            || null,
    };

    let pid = productId;
    if (productId) {
      await supabase.from("products").update(productId, payload);
    } else {
      const [newP] = await supabase.from("products").insert(payload);
      pid = newP.id;
    }
    
    // 新增的行：创建记录
    // 一次性拉取 common_ingredients 缓存，避免循环里重复请求
    const newMedicinal = medicinal.filter(m => m.isNew);
    let commonCache = newMedicinal.length > 0 ? await supabase.from("common_ingredients").select("*") : [];
    for (const m of newMedicinal) {
      let common = commonCache.find(c => c.name.toLowerCase() === m.common_name.toLowerCase());
      if (!common) {
        const [newC] = await supabase.from("common_ingredients").insert({ name: m.common_name });
        common = newC;
        commonCache.push(common); // 加入缓存，这样同名的第二条不会重复创建
      }
      await supabase.from("product_medicinal_ingredients").insert({
        product_id: pid, common_ingredient_id: common.id, sku_id: m.sku_id || null, amount: m.amount || null,
      });
    }
    // 已有的行：只更新sku_id
    const existingMedicinal = medicinal.filter(m => !m.isNew);
    for (const m of existingMedicinal) {
      await supabase.from("product_medicinal_ingredients").update(m.id, { sku_id: m.sku_id || null });
    }
    // excipients: 只处理新增的
    const newExcipients = excipientsList.filter(e => e.isNew);
    for (const ex of newExcipients) {
      let exc = excipients.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
      if (!exc) {
        const [newExc] = await supabase.from("excipients").insert({ name: ex.name });
        exc = newExc;
      }
      try {
        await supabase.from("product_excipients").insert({ product_id: pid, excipient_id: exc.id });
      } catch (_) {} // ignore unique constraint if already exists
    }

    await loadData();
  };

  const handleDelete = async (id) => {
    // 级联删除关联表数据（和删除供应商时同样的逻辑）
    await supabase.from("product_brands").deleteWhere("product_id", id);
    await supabase.from("product_medicinal_ingredients").deleteWhere("product_id", id);
    await supabase.from("product_excipients").deleteWhere("product_id", id);
    await supabase.from("product_labels").deleteWhere("product_id", id);
    await supabase.from("products").delete(id);
    setFormProduct(undefined);
    await loadData();
  };

  const handleUpdateSku = async (pmiId, skuId) => {
    await supabase.from("product_medicinal_ingredients").update(pmiId, { sku_id: skuId });
    await loadData();
  };

  const handleDeleteMedicinal = async (pmiId) => {
    await supabase.from("product_medicinal_ingredients").delete(pmiId);
    await loadData();
  };

  const handleDeleteExcipient = async (peId) => {
    await supabase.from("product_excipients").delete(peId);
    await loadData();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* 筛选栏 */}
      <div style={{ padding: "16px 28px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索产品名称..."
          style={{ flex: 1, minWidth: 200, padding: "9px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", outline: "none" }} />
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} style={selStyle}>
          <option value="">全部品牌</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterLicensing} onChange={e => setFilterLicensing(e.target.value)} style={selStyle}>
          <option value="">全部状态</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="not_started">未申请</option>
          <option value="expired">Expired</option>
        </select>
        <button onClick={() => setFormProduct(null)} style={{ padding: "9px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>
          + 新增产品
        </button>
      </div>

      <div style={{ padding: "12px 28px", fontSize: 13, color: "#64748b" }}>
        共 <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> 个产品
      </div>

      {loading ? <Loading /> : (
        <div style={{ padding: "0 28px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map(p => {
            const displayName = getDisplayName(p, p.productBrands, brands);
            const brand = brands.find(b => b.id === p.primary_brand_id);
            return (
              <div key={p.id} onClick={() => setFormProduct(p)} style={{
                background: "#fff", borderRadius: 10, padding: 16, cursor: "pointer",
                border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"}
              >
                {brand && <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{brand.name}</div>}
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2, lineHeight: 1.3 }}>{displayName}</div>
                {p.product_name_zh && <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>{p.product_name_zh}</div>}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                  {p.npn && <span style={{ fontSize: 10, color: "#64748b", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>NPN {p.npn}</span>}
                  {p.licensing_status && <StatusBadge type="licensing" value={p.licensing_status} />}
                  {p.is_marketed && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 9999, background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" }}>已上市</span>}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.medicinal?.length || 0} 种成分</div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: "#94a3b8" }}>暂无产品</div>}
        </div>
      )}

      {formProduct !== undefined && (
        <>
          <div onClick={() => setFormProduct(undefined)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 999 }} />
          <ProductForm
            product={formProduct}
            brands={brands}
            skus={skus}
            allExcipients={excipients}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setFormProduct(undefined)}
          />
        </>
      )}
    </div>
  );
}

const selStyle = { padding: "9px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" };

// ============================================================
// SkuCommonNameEditor — 在ingredient详情面板里用
// 把这个加进 DetailPanel 的编辑模式里
// ============================================================
function SkuCommonNameEditor({ skuId, currentCommonId, commonIngredients, onSave }) {
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(currentCommonId);
  const [saving, setSaving] = useState(false);

  const current = commonIngredients.find(c => c.id === selectedId);

  const handleSave = async (newId) => {
    setSaving(true);
    try {
      await supabase.from("skus").update(skuId, { common_ingredient_id: newId });
      setSelectedId(newId);
      onSave?.(newId);
    } catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: current ? "#15803d" : "#94a3b8" }}>
          {current ? current.name : "未关联通用名"}
        </span>
        <button onClick={() => setEditing(true)} style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", cursor: "pointer", color: "#475569" }}>
          {current ? "修改" : "关联"}
        </button>
      </div>
    );
  }

  return (
    <CommonNamePicker
      skuId={skuId}
      currentCommonId={selectedId}
      commonIngredients={commonIngredients}
      onChange={handleSave}
    />
  );
}
// ============================================================
// IngredientTab — 原来的全部内容
// ============================================================
function IngredientTab() {
  const [data, setData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selCatIds, setSelCatIds] = useState([]);
  const [selRegion, setSelRegion] = useState("");
  const [selNPN, setSelNPN] = useState("");
  const [lang, setLang] = useState("zh");
  const [detail, setDetail] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showManageCat, setShowManageCat] = useState(false);
  const [showManageSupplier, setShowManageSupplier] = useState(false);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [fontSize, setFontSize] = useState(13);
  const [expanded, setExpanded] = useState(true);
  const [openedColW, setOpenedColW] = useState(80);
  const [commonIngredients, setCommonIngredients] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [suppData, skuData, funcData, catData, commonData] = await Promise.all([
        supabase.from("suppliers").select("*"),
        supabase.from("skus").select("*"),
        supabase.from("sku_functions").select("*"),
        supabase.from("function_categories").select("*"),
        supabase.from("common_ingredients").select("*"),
      ])
      setSuppliers(suppData);
      setCategories(catData);
      setCommonIngredients(commonData); 
      const supplierMap = {};
      suppData.forEach(s => { supplierMap[s.id] = s; });
      const skuCatMap = {};
      funcData.forEach(f => {
        if (!skuCatMap[f.sku_id]) skuCatMap[f.sku_id] = [];
        skuCatMap[f.sku_id].push(f.category_id);
      });
      setData(skuData.map(sku => ({
        ...sku,
        supplier_name: supplierMap[sku.supplier_id]?.supplier_name || "—",
        contact_email: supplierMap[sku.supplier_id]?.contact_email || "",
        is_account_opened: supplierMap[sku.supplier_id]?.is_account_opened || "",
        agreement_signed: supplierMap[sku.supplier_id]?.agreement_signed || "",
        category_ids: skuCatMap[sku.id] || [],
      })));
      setError(null);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { const t = setInterval(loadData, 300000); return () => clearInterval(t); }, []);

  const regions = useMemo(() => [...new Set(data.map(r => r.region).filter(Boolean))].sort(), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.filter(r => {
      if (q) {
        const catNames = (r.category_ids || []).map(cid => {
          const cat = categories.find(c => c.id === cid);
          return cat ? `${cat.name_zh} ${cat.name_en || ""}` : "";
        }).join(" ");
        const h = [r.supplier_name, r.product_name, r.ingredient, r.region, r.form_potency, r.notes, r.certificates, r.contact_email, catNames].filter(Boolean).join(" ").toLowerCase();
        if (!h.includes(q)) return false;
      }
      if (selCatIds.length > 0 && !selCatIds.some(cid => r.category_ids?.includes(cid))) return false;
      if (selRegion && r.region !== selRegion) return false;
      if (selNPN === "yes" && (!r.can_apply_npn || !r.can_apply_npn.toLowerCase().includes("yes"))) return false;
      if (selNPN === "no" && r.can_apply_npn && r.can_apply_npn.toLowerCase().includes("yes")) return false;
      return true;
    });
  }, [data, search, selCatIds, selRegion, selNPN, categories]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const va = (a[sortCol] || "").toString(), vb = (b[sortCol] || "").toString();
      return sortDir === "asc" ? va.localeCompare(vb, "zh") : vb.localeCompare(va, "zh");
    });
  }, [filtered, sortCol, sortDir]);

  const handleSave = async (skuId, formData, catIds) => {
    const skuUpdate = {};
    SKU_FIELDS.forEach(({ key }) => { skuUpdate[key] = formData[key] || null; });
    skuUpdate.supplier_id = formData.supplier_id || null;
    await supabase.from("skus").update(skuId, skuUpdate);
    await supabase.from("sku_functions").deleteWhere("sku_id", skuId);
    if (catIds.length > 0) await supabase.from("sku_functions").insert(catIds.map(cid => ({ sku_id: skuId, category_id: cid })));
    await loadData();
  };

  const handleAdd = async (formData, catIds) => {
    const skuInsert = {};
    SKU_FIELDS.forEach(({ key }) => { skuInsert[key] = formData[key] || null; });
    skuInsert.supplier_id = parseInt(formData.supplier_id);
    const [newSku] = await supabase.from("skus").insert(skuInsert);
    if (catIds.length > 0) await supabase.from("sku_functions").insert(catIds.map(cid => ({ sku_id: newSku.id, category_id: cid })));
    await loadData();
  };

  const handleDeleteSku = async (skuId) => {
    await supabase.from("skus").delete(skuId);
    setDetail(null);
    await loadData();
  };

  const handleAddCategory = async (catData) => { await supabase.from("function_categories").insert(catData); await loadData(); };
  const handleUpdateCategory = async (catId, catData) => { await supabase.from("function_categories").update(catId, catData); await loadData(); };
  const handleDeleteCategory = async (catId) => {
    await supabase.from("sku_functions").deleteWhere("category_id", catId);
    await supabase.from("function_categories").delete(catId);
    await loadData();
  };
  const handleAddSupplier = async (d) => { await supabase.from("suppliers").insert(d); await loadData(); };
  const handleUpdateSupplier = async (id, d) => { await supabase.from("suppliers").update(id, d); await loadData(); };
  const handleDeleteSupplier = async (id) => {
    const skusOfSupplier = data.filter(s => s.supplier_id === id);
    for (const sku of skusOfSupplier) {
      await supabase.from("sku_functions").deleteWhere("sku_id", sku.id);
      await supabase.from("skus").delete(sku.id);
    }
    await supabase.from("suppliers").delete(id);
    await loadData();
  };

  const toggleCat = (catId) => setSelCatIds(p => p.includes(catId) ? p.filter(c => c !== catId) : [...p, catId]);
  const handleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const clearAll = () => { setSearch(""); setSelCatIds([]); setSelRegion(""); setSelNPN(""); };
  const getCatDisplay = (cat) => lang === "en" ? (cat.name_en || cat.name_zh) : cat.name_zh;
  const getCatSub = (cat) => lang === "zh" ? cat.name_en : (lang === "en" ? cat.name_zh : null);

  return (
    <>
      {/* Search + Filters */}
      <div style={{ padding: "16px 28px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索品名、成分、供应商、功能..."
            style={{ flex: 1, minWidth: 240, padding: "10px 14px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#f8fafc" }}
            onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          <select value={selRegion} onChange={e => setSelRegion(e.target.value)} style={{ padding: "10px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
            <option value="">全部地区</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={selNPN} onChange={e => setSelNPN(e.target.value)} style={{ padding: "10px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
            <option value="">NPN 不限</option>
            <option value="yes">可申NPN</option>
            <option value="no">不可/未知</option>
          </select>
          {(search || selCatIds.length || selRegion || selNPN) && (
            <button onClick={clearAll} style={{ padding: "8px 14px", fontSize: 12, border: "none", borderRadius: 6, background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontWeight: 500 }}>清除筛选</button>
          )}
        </div>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {categories.map(cat => {
            const active = selCatIds.includes(cat.id);
            const color = cat.color || "#64748b";
            return (
              <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{
                padding: "4px 12px", fontSize: 12, borderRadius: 9999, cursor: "pointer",
                border: `1px solid ${active ? color : "#e2e8f0"}`, background: active ? color + "15" : "#fff",
                color: active ? color : "#64748b", fontWeight: active ? 600 : 400,
              }}>
                {getCatDisplay(cat)}
                {getCatSub(cat) && <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 4 }}>{getCatSub(cat)}</span>}
              </button>
            );
          })}
          <button onClick={() => setShowAddCat(true)} style={{ width: 28, height: 28, borderRadius: 9999, border: "1px dashed #cbd5e1", background: "#fff", color: "#94a3b8", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>
      </div>

      <div style={{ padding: "12px 28px", fontSize: 13, color: "#64748b" }}>
        找到 <strong style={{ color: "#0f172a" }}>{sorted.length}</strong> 条结果
        <button onClick={() => setExpanded(e => !e)} style={{ marginLeft: 12, padding: "4px 12px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>{expanded ? "收起" : "展开全部"}</button>
      </div>

      {loading ? <Loading /> : error ? (
        <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
          加载失败: {error}<br />
          <button onClick={loadData} style={{ marginTop: 12, padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer" }}>重试</button>
        </div>
      ) : (
        <div style={{ padding: "0 28px 40px", overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 280px)", zoom: fontSize / 13 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 13, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                {TABLE_COLS.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} style={{
                    padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569",
                    borderBottom: "2px solid #e2e8f0", cursor: "pointer", userSelect: "none",
                    fontSize: 12, position: "sticky", top: 0, background: "#f8fafc", zIndex: 10,
                    minWidth: col.key === "is_account_opened" ? openedColW : col.w, whiteSpace: "nowrap",
                  }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ flex: 1 }}>{col.label}{sortCol === col.key && (sortDir === "asc" ? " ↑" : " ↓")}</span>
                      {col.key === "is_account_opened" && (
                        <div onMouseDown={e => {
                          e.preventDefault(); e.stopPropagation();
                          const startX = e.clientX, startW = openedColW;
                          const onMove = ev => setOpenedColW(Math.max(40, startW + ev.clientX - startX));
                          const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
                          document.addEventListener("mousemove", onMove);
                          document.addEventListener("mouseup", onUp);
                        }} style={{ width: 6, cursor: "col-resize", height: 20, marginLeft: 4, borderRight: "2px solid #cbd5e1" }} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id || i} onClick={() => setDetail(r)} style={{ cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafbfc"}>
                  {TABLE_COLS.map(col => (
                    <td key={col.key} style={{
                      padding: "10px 12px", color: "#334155",
                      maxWidth: expanded ? "none" : (col.key === "functions" ? 300 : 200),
                      overflow: expanded ? "visible" : "hidden",
                      textOverflow: expanded ? "unset" : "ellipsis",
                      whiteSpace: expanded ? "pre-wrap" : (col.key === "functions" ? "normal" : "nowrap"),
                      background: col.key === "price_usd_kg" ? "#f0fdf4" : undefined,
                    }}>
                      {col.key === "functions"
                        ? (r.category_ids || []).map(cid => {
                          const cat = categories.find(c => c.id === cid);
                          if (!cat) return null;
                          return <Badge key={cid} text={getCatDisplay(cat)} color={cat.color || "#64748b"} sub={getCatSub(cat)} />;
                        })
                        : (r[col.key] || "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>没有匹配的结果</div>}
        </div>
      )}

      {detail && (
        <>
          <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 999 }} />
          <DetailPanel item={detail} suppliers={suppliers} categories={categories} lang={lang}
            commonIngredients={commonIngredients}
            onClose={() => setDetail(null)} onSave={handleSave} onDelete={handleDeleteSku} onRefresh={loadData} />
        </>
      )}
      {showAdd && <AddForm suppliers={suppliers} categories={categories} onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
      {showAddCat && <AddCategoryForm onAdd={handleAddCategory} onClose={() => setShowAddCat(false)} />}
      {showManageSupplier && <ManageSuppliersForm suppliers={suppliers} onAdd={handleAddSupplier} onUpdate={handleUpdateSupplier} onDelete={handleDeleteSupplier} onClose={() => setShowManageSupplier(false)} />}
      {showManageCat && <ManageCategoriesForm categories={categories} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} onClose={() => setShowManageCat(false)} />}

      {/* ingredient tab 专属的右上角按钮 */}
      <div style={{ position: "fixed", top: 16, right: 28, display: "flex", gap: 8, zIndex: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => setFontSize(s => Math.max(10, s - 1))} style={hdrBtn}>-</button>
          <span style={{ color: "#94a3b8", fontSize: 11, minWidth: 20, textAlign: "center" }}>{fontSize}</span>
          <button onClick={() => setFontSize(s => Math.min(20, s + 1))} style={hdrBtn}>+</button>
        </div>
        <button onClick={() => setLang(l => l === "zh" ? "en" : "zh")} style={hdrBtn}>{lang === "zh" ? "EN" : "中"}</button>
        <button onClick={() => setShowManageSupplier(true)} style={hdrBtn}>管理供应商</button>
        <button onClick={() => setShowManageCat(true)} style={hdrBtn}>管理分类</button>
        <button onClick={() => setShowAdd(true)} style={{ ...hdrBtn, background: "#3b82f6", color: "#fff", border: "none" }}>+ 新增条目</button>
      </div>
    </>
  );
}

const hdrBtn = { padding: "6px 12px", fontSize: 12, fontWeight: 500, border: "1px solid #334155", borderRadius: 7, background: "transparent", color: "#94a3b8", cursor: "pointer" };

// ============================================================
// 密码锁 — 支持两套密码
// ============================================================
function PasswordGate({ children }) {
  const [role, setRole] = useState(() => sessionStorage.getItem("authed-role"));
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (input === PASSWORDS.internal) {
      sessionStorage.setItem("authed-role", "internal");
      setRole("internal");
    } else if (input === PASSWORDS.operations) {
      sessionStorage.setItem("authed-role", "operations");
      setRole("operations");
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  if (role) return children(role);

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0f172a", fontFamily: "'Source Han Sans SC','Noto Sans SC',-apple-system,sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ color: "#f8fafc", fontSize: 22, fontWeight: 600, marginBottom: 24 }}>原料数据库</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="password" value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="输入密码"
            style={{ padding: "12px 16px", fontSize: 14, border: `2px solid ${error ? "#ef4444" : "#334155"}`, borderRadius: 8, background: "#1e293b", color: "#f8fafc", outline: "none", width: 220 }} />
          <button onClick={handleSubmit} style={{ padding: "12px 24px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>进入</button>
        </div>
        {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>密码错误</p>}
      </div>
    </div>
  );
}

// ============================================================
// 主应用
// ============================================================
export default function App() {
  const [activeTab, setActiveTab] = useState("ingredients");
  // skus 在顶层加载一次，product tab 的 ingredient picker 直接用
  const [skus, setSkus] = useState([]);

  useEffect(() => {
    supabase.from("skus").select("id,ingredient_name,ingredient").then(setSkus).catch(() => {});
  }, []);

  const logout = () => { sessionStorage.clear(); window.location.reload(); };

  return (
    <PasswordGate>
      {(role) => (
        <div style={{ fontFamily: "'Source Han Sans SC','Noto Sans SC',-apple-system,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
          {role === "operations" ? (
            // 运营界面占位
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
              <div style={{ fontSize: 18, color: "#475569" }}>运营界面 — 开发中</div>
              <button onClick={logout} style={{ padding: "8px 16px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", background: "#fff" }}>退出</button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ background: "#0f172a", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#f8fafc" }}>原料数据库</h1>
                  {/* Tab 切换 */}
                  <div style={{ display: "flex", background: "#1e293b", borderRadius: 8, padding: 3 }}>
                    {[{ key: "ingredients", label: "原料库" }, { key: "products", label: "产品管理" }, { key: "labels", label: "标签编辑" }].map(t => (
                      <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                        padding: "6px 14px", fontSize: 13, border: "none", borderRadius: 6, cursor: "pointer",
                        background: activeTab === t.key ? "#3b82f6" : "transparent",
                        color: activeTab === t.key ? "#fff" : "#94a3b8", fontWeight: activeTab === t.key ? 600 : 400,
                        transition: "all 0.15s",
                      }}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <button onClick={logout} style={{ padding: "6px 12px", fontSize: 12, border: "1px solid #334155", borderRadius: 6, background: "transparent", color: "#64748b", cursor: "pointer" }}>退出</button>
              </div>

              {activeTab === "ingredients" && <IngredientTab />}
              {activeTab === "products" && <ProductTab skus={skus} />}
              {activeTab === "labels" && <LabelTab />}
            </>
          )}
        </div>
      )}
    </PasswordGate>
  );
}

// ============================================================
// LabelTab — 标签编辑器 (Supabase 版)
// ============================================================
// SQL 建表 — 在 Supabase SQL Editor 跑一次:
// CREATE TABLE public.product_labels (
//   id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
//   product_id bigint,
//   label_type text DEFAULT 'single',
//   subtitle text,
//   spec text,
//   recommended_use_fr text,
//   recommended_dose_fr text,
//   cautions_fr text,
//   medicinal_en text,
//   medicinal_fr text,
//   non_medicinal_fr text,
//   risk_info text,
//   risk_info_fr text,
//   company_info text,
//   sidebar_text text,
//   licence_holder text,
//   notes text,
//   created_at timestamp with time zone DEFAULT now(),
//   updated_at timestamp with time zone DEFAULT now(),
//   CONSTRAINT product_labels_pkey PRIMARY KEY (id),
//   CONSTRAINT product_labels_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
// );

const DEFAULT_COMPANY = `Distributor / Distributeur\nNutrizen Station Lab Inc.\nRichmond, BC, Canada\ninfo@zentrastation.com`;
const DEFAULT_RISK = "KEEP OUT OF REACH OF CHILDREN. DO NOT USE IF SEAL UNDER CAP IS BROKEN. STORE IN A COOL, DARK AND DRY PLACE.";
const DEFAULT_RISK_FR_ = "GARDER HORS DE LA PORTÉE DES ENFANTS. NE PAS UTILISER SI LE SCEAU SOUS LE BOUCHON EST BRISÉ. CONSERVER DANS UN ENDROIT FRAIS, SOMBRE ET SEC.";

// 标签编辑区块定义
// source: "product" = 数据来自 products 表 (只读展示, 去 产品管理 改)
// source: "label"   = 数据存在 product_labels 表 (这里可编辑)
const SECTION_DEFS = [
  { key: "product_name",        label: "1. 产品名称",              source: "product", field: "product_name" },
  { key: "subtitle",            label: "2. 副标题 / 功能声明",      source: "label" },
  { key: "spec",                label: "3. 规格 & NPN",            source: "label" },
  { key: "recommended_use",     label: "4. Recommended Use",       source: "product", field: "recommended_use" },
  { key: "recommended_use_fr",  label: "4b. Utilisation Recommandée", source: "label", fr: true },
  { key: "recommended_dose",    label: "5. Recommended Dose",      source: "product", field: "recommended_dose" },
  { key: "recommended_dose_fr", label: "5b. Dose Recommandée",     source: "label", fr: true },
  { key: "cautions",            label: "6. Cautions & Warnings",   source: "product", field: "caution" },
  { key: "cautions_fr",         label: "6b. Mises en garde",       source: "label", fr: true },
  { key: "medicinal_en",        label: "7. Medicinal Ingredients", source: "label", note: "完整标签格式 (含提取比/DHE)" },
  { key: "medicinal_fr",        label: "7b. Ingrédients Médicinaux", source: "label", fr: true },
  { key: "non_medicinal",       label: "8. Non-Medicinal",         source: "computed" },
  { key: "non_medicinal_fr",    label: "8b. Ingrédients Non Médicinaux", source: "label", fr: true },
  { key: "risk_info",           label: "9. Risk Information",      source: "label" },
  { key: "risk_info_fr",        label: "9b. Renseignements Risques", source: "label", fr: true },
  { key: "company_info",        label: "10. 公司信息",              source: "label" },
  { key: "licence_holder",      label: "10b. Licence Holder",      source: "label" },
  { key: "sidebar_text",        label: "11. 侧边文字 / 卖点",      source: "label" },
];

function LabelTab() {
  const [labels, setLabels] = useState([]);
  const [products, setProducts] = useState([]);
  const [excipientMap, setExcipientMap] = useState({});  // product_id -> "Hypromellose, ..."
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);  // label row
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // 从 selected 恢复 form（用于 useEffect 和取消按钮）
  const resetForm = (label) => {
    if (!label) return;
    const f = {};
    SECTION_DEFS.filter(s => s.source === "label").forEach(s => {
      f[s.key] = label[s.key] || "";
    });
    f.label_type = label.label_type || "single";
    setForm(f);
  };

  // ---- 加载 ----
  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, lbls, pes, excs] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("product_labels").select("*"),
        supabase.from("product_excipients").select("*"),
        supabase.from("excipients").select("*"),
      ]);
      setProducts(prods);
      setLabels(lbls);
      // 构建 excipient 映射: product_id -> 逗号分隔名
      const peMap = {};
      pes.forEach(pe => {
        if (!peMap[pe.product_id]) peMap[pe.product_id] = [];
        const exc = excs.find(e => e.id === pe.excipient_id);
        if (exc) peMap[pe.product_id].push(exc.name);
      });
      const excMap = {};
      Object.keys(peMap).forEach(pid => { excMap[pid] = peMap[pid].join(", "); });
      setExcipientMap(excMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  // 选中 label 时更新 form
  useEffect(() => {
    if (selected) resetForm(selected);
  }, [selected]);

  // ---- 获取 product 字段值 ----
  const getProduct = (label) => products.find(p => p.id === label?.product_id);
  const getVal = (sec, label) => {
    if (sec.source === "product") {
      const prod = getProduct(label);
      return prod?.[sec.field] || "";
    }
    if (sec.source === "computed" && sec.key === "non_medicinal") {
      return excipientMap[label?.product_id] || "";
    }
    return label?.[sec.key] || "";
  };

  // ---- CRUD ----
  const handleCreate = async (productId) => {
    const prod = products.find(p => p.id === productId);
    const payload = {
      product_id: productId,
      label_type: "single",
      subtitle: "",
      spec: `${prod?.dosage_form || ""}    NPN: ${prod?.npn || ""}`,
      recommended_use_fr: "",
      recommended_dose_fr: "",
      cautions_fr: "",
      medicinal_en: "",
      medicinal_fr: "",
      non_medicinal_fr: "",
      risk_info: DEFAULT_RISK,
      risk_info_fr: DEFAULT_RISK_FR_,
      company_info: DEFAULT_COMPANY,
      licence_holder: "Nutrizen Station Lab Inc.",
      sidebar_text: "",
    };
    const [newLabel] = await supabase.from("product_labels").insert(payload);
    await loadData();
    setSelected(newLabel);
    setEditing(true);
    setShowCreate(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = {};
      SECTION_DEFS.filter(s => s.source === "label").forEach(s => {
        payload[s.key] = form[s.key] || null;
      });
      payload.label_type = form.label_type || "single";
      payload.updated_at = new Date().toISOString();
      await supabase.from("product_labels").update(selected.id, payload);
      await loadData();
      // 重新选中更新后的数据
      const refreshed = (await supabase.from("product_labels").select("*")).find(l => l.id === selected.id);
      setSelected(refreshed || null);
      setEditing(false);
    } catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("确定删除这个标签？")) return;
    await supabase.from("product_labels").delete(id);
    if (selected?.id === id) { setSelected(null); setEditing(false); }
    await loadData();
  };

  const handleDuplicate = async (label) => {
    const { id, created_at, updated_at, ...rest } = label;
    rest.subtitle = (rest.subtitle || "") + " (副本)";
    await supabase.from("product_labels").insert(rest);
    await loadData();
  };

  // ---- 搜索 ----
  const filteredLabels = useMemo(() => {
    const q = search.toLowerCase().trim();
    return labels.map(l => {
      const prod = products.find(p => p.id === l.product_id);
      return { ...l, _prodName: prod?.product_name || "", _npn: prod?.npn || "" };
    }).filter(l => {
      if (!q) return true;
      return l._prodName.toLowerCase().includes(q) || l._npn.includes(q) || (l.subtitle || "").toLowerCase().includes(q);
    });
  }, [labels, products, search]);

  // ---- section 颜色 ----
  const sectionBg = (sec) => {
    if (sec.fr) return "#eff6ff";
    if (sec.source === "product" || sec.source === "computed") return "#f0fdf4";
    if (sec.key.includes("risk") || sec.key.includes("caution")) return "#fffbeb";
    return "#f8fafc";
  };

  // ---- Export TXT ----
  const handleExport = () => {
    if (!selected) return;
    const prod = getProduct(selected);
    const s = selected;
    const isDouble = s.label_type === "double";
    let t = `=== ${isDouble ? "标签 1 (English)" : "单标签 (EN/FR)"} ===\n\n`;
    t += `1: ${prod?.product_name || ""}\n`;
    t += `2: ${s.subtitle || ""}\n`;
    t += `3: ${s.spec || ""}\n\n`;
    t += `RECOMMENDED USE:\n${prod?.recommended_use || ""}\n`;
    if (!isDouble) t += `\nUTILISATION RECOMMANDÉE:\n${s.recommended_use_fr || ""}\n`;
    t += `\nRECOMMENDED DOSE:\n${prod?.recommended_dose || ""}\n`;
    if (!isDouble) t += `\nDOSE RECOMMANDÉE:\n${s.recommended_dose_fr || ""}\n`;
    t += `\nCAUTIONS:\n${prod?.caution || ""}\n`;
    if (!isDouble) t += `\nMISES EN GARDE:\n${s.cautions_fr || ""}\n`;
    t += `\nMedicinal Ingredients:\n${s.medicinal_en || ""}\n`;
    if (!isDouble) t += `\nIngrédients médicinaux:\n${s.medicinal_fr || ""}\n`;
    t += `\nNon-Medicinal:\n${excipientMap[s.product_id] || ""}\n`;
    if (!isDouble) t += `\nIngrédients non médicinaux:\n${s.non_medicinal_fr || ""}\n`;
    t += `\n${s.risk_info || ""}\n`;
    if (!isDouble) t += `${s.risk_info_fr || ""}\n`;
    t += `\n${s.company_info || ""}\n`;
    if (s.sidebar_text) t += `\n---\n${s.sidebar_text}\n`;
    if (isDouble) {
      t += `\n\n=== 标签 2 (Français) ===\n\n`;
      t += `UTILISATION RECOMMANDÉE:\n${s.recommended_use_fr || ""}\n`;
      t += `\nDOSE RECOMMANDÉE:\n${s.recommended_dose_fr || ""}\n`;
      t += `\nMISES EN GARDE:\n${s.cautions_fr || ""}\n`;
      t += `\nIngrédients médicinaux:\n${s.medicinal_fr || ""}\n`;
      t += `\nIngrédients non médicinaux:\n${s.non_medicinal_fr || ""}\n`;
      t += `\n${s.risk_info_fr || ""}\n`;
    }
    const blob = new Blob([t], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `label_${prod?.product_name || "draft"}.txt`; a.click();
  };

  if (loading) return <Loading />;

  const selProd = selected ? getProduct(selected) : null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", background: "#f1f5f9" }}>
      {/* ===== 左侧列表 ===== */}
      <div style={{ width: 300, borderRight: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索产品名 / NPN..."
              style={{ flex: 1, padding: "8px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, outline: "none", background: "#f8fafc" }} />
            <button onClick={() => setShowCreate(true)} style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>+ 新建</button>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>共 {filteredLabels.length} 个标签</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredLabels.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>{labels.length === 0 ? "还没有标签，点击「+ 新建」" : "无匹配结果"}</div>}
          {filteredLabels.map(l => (
            <div key={l.id} onClick={() => { setSelected(l); setEditing(false); setPreviewMode(false); }}
              style={{
                padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                background: selected?.id === l.id ? "#eff6ff" : "#fff",
                borderLeft: selected?.id === l.id ? "3px solid #3b82f6" : "3px solid transparent",
              }}
              onMouseEnter={e => { if (selected?.id !== l.id) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={e => { if (selected?.id !== l.id) e.currentTarget.style.background = "#fff"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l._prodName || "未关联产品"}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{
                      padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                      background: l.label_type === "double" ? "#fef3c7" : "#dbeafe",
                      color: l.label_type === "double" ? "#92400e" : "#1e40af",
                    }}>{l.label_type === "double" ? "双标签" : "单标签"}</span>
                    {l._npn && <span>NPN {l._npn}</span>}
                  </div>
                  {l.subtitle && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.subtitle}</div>}
                </div>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); handleDuplicate(l); }} title="复制"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: "2px 4px" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#3b82f6"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>⧉</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(l.id); }} title="删除"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: "2px 4px" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#ef4444"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 右侧编辑区 ===== */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {!selected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🏷️</div>
            <div style={{ fontSize: 14 }}>选择或新建一个标签开始编辑</div>
          </div>
        ) : previewMode ? (
          <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>标签预览</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleExport} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>📥 导出 TXT</button>
                <button onClick={() => setPreviewMode(false)} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>← 返回</button>
              </div>
            </div>
            <LabelPreviewV2 label={selected} product={selProd} excipients={excipientMap[selected.product_id] || ""} />
          </div>
        ) : (
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 28px" }}>
            {/* 顶部工具栏 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{selProd?.product_name || "标签详情"}</h2>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {selProd?.npn && `NPN ${selProd.npn} · `}
                  更新于 {new Date(selected.updated_at).toLocaleString("zh-CN")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!editing ? (
                  <>
                    <button onClick={() => setPreviewMode(true)} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>👁️ 预览</button>
                    <button onClick={handleExport} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>📥 导出</button>
                    <button onClick={() => setEditing(true)} style={{ padding: "6px 14px", fontSize: 12, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600 }}>✏️ 编辑</button>
                  </>
                ) : (
                  <>
                    <button onClick={handleSave} disabled={saving} style={{ padding: "6px 14px", fontSize: 12, border: "none", borderRadius: 6, background: "#22c55e", color: "#fff", cursor: saving ? "wait" : "pointer", fontWeight: 600 }}>{saving ? "保存中..." : "💾 保存"}</button>
                    <button onClick={() => { resetForm(selected); setEditing(false); }} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>取消</button>
                  </>
                )}
              </div>
            </div>

            {/* 标签类型切换 */}
            {editing && (
              <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>标签类型:</span>
                <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 6, padding: 2 }}>
                  {[{ v: "single", l: "单标签" }, { v: "double", l: "双标签" }].map(t => (
                    <button key={t.v} onClick={() => setForm(f => ({ ...f, label_type: t.v }))} style={{
                      padding: "4px 12px", fontSize: 11, border: "none", borderRadius: 4, cursor: "pointer",
                      background: (form.label_type || "single") === t.v ? "#fff" : "transparent",
                      color: (form.label_type || "single") === t.v ? "#0f172a" : "#94a3b8",
                      fontWeight: (form.label_type || "single") === t.v ? 600 : 400,
                      boxShadow: (form.label_type || "single") === t.v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}>{t.l}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 图例 */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, fontSize: 11, color: "#64748b" }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#f0fdf4", border: "1px solid #bbf7d0", marginRight: 4, verticalAlign: "middle" }} />来自产品表 (只读)</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#f8fafc", border: "1px solid #e2e8f0", marginRight: 4, verticalAlign: "middle" }} />标签专属 (可编辑)</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#eff6ff", border: "1px solid #bfdbfe", marginRight: 4, verticalAlign: "middle" }} />法语 FR</span>
            </div>

            {/* 区块列表 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SECTION_DEFS.map(sec => {
                const isReadOnly = sec.source === "product" || sec.source === "computed";
                const val = editing
                  ? (isReadOnly ? getVal(sec, selected) : (form[sec.key] ?? ""))
                  : getVal(sec, selected);
                const bg = sectionBg(sec);

                return (
                  <div key={sec.key} style={{ background: bg, borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: (editing && !isReadOnly) ? "1px solid #e2e8f0" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: sec.fr ? "#1e40af" : "#334155" }}>{sec.label}</span>
                        {sec.fr && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#bfdbfe", color: "#1e40af" }}>FR</span>}
                        {isReadOnly && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#dcfce7", color: "#15803d" }}>产品表</span>}
                        {sec.note && <span style={{ fontSize: 10, color: "#94a3b8" }}>— {sec.note}</span>}
                      </div>
                    </div>
                    {editing && !isReadOnly ? (
                      <textarea
                        value={form[sec.key] ?? ""}
                        onChange={e => setForm(f => ({ ...f, [sec.key]: e.target.value }))}
                        rows={["medicinal_en", "medicinal_fr", "cautions_fr", "recommended_use_fr"].includes(sec.key) ? 5 : (["company_info", "sidebar_text"].includes(sec.key) ? 4 : 2)}
                        style={{ width: "100%", padding: "10px 14px", fontSize: 13, border: "none", outline: "none", resize: "vertical", fontFamily: "inherit", background: "transparent", boxSizing: "border-box", lineHeight: 1.6 }}
                        placeholder={`输入${sec.label}...`}
                      />
                    ) : (
                      <div style={{ padding: val ? "10px 14px" : "6px 14px", fontSize: 13, color: val ? "#1e293b" : "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                        {val || "（空）"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===== 新建弹窗 ===== */}
      {showCreate && (
        <>
          <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1100 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", borderRadius: 12, width: 520, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", zIndex: 1101, padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>新建标签</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 8 }}>选择一个产品来创建标签</div>
            <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              {products.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>暂无产品，请先在「产品管理」添加</div>
              ) : (
                products.map(p => {
                  const hasLabel = labels.some(l => l.product_id === p.id);
                  return (
                    <div key={p.id} onClick={() => handleCreate(p.id)}
                      style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{p.product_name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          {p.npn && `NPN ${p.npn}`}
                          {p.dosage_form && ` · ${p.dosage_form}`}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {hasLabel && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#fef3c7", color: "#92400e" }}>已有标签</span>}
                        <span style={{ fontSize: 11, color: "#3b82f6" }}>创建 →</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// LabelPreviewV2
// ============================================================
function LabelPreviewV2({ label, product, excipients }) {
  const s = label;
  const p = product || {};
  const box = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "24px 28px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const h = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 16 };
  const b = { fontSize: 13, color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-wrap" };

  const renderOne = (lang) => {
    const fr = lang === "fr";
    return (
      <div style={box}>
        {s.label_type === "double" && <div style={{ fontSize: 10, padding: "2px 8px", background: fr ? "#dbeafe" : "#dcfce7", color: fr ? "#1e40af" : "#15803d", borderRadius: 4, display: "inline-block", marginBottom: 12 }}>{fr ? "Français" : "English"}</div>}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{p.product_name || ""}</h2>
          {s.subtitle && <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{s.subtitle}</div>}
          {s.spec && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.spec}</div>}
        </div>
        <div style={h}>{fr ? "UTILISATION RECOMMANDÉE" : "RECOMMENDED USE"}</div>
        <div style={b}>{fr ? s.recommended_use_fr : p.recommended_use || "—"}</div>
        <div style={h}>{fr ? "DOSE RECOMMANDÉE (ADULTES)" : "RECOMMENDED DOSE (ADULTS)"}</div>
        <div style={b}>{fr ? s.recommended_dose_fr : p.recommended_dose || "—"}</div>
        <div style={h}>{fr ? "MISES EN GARDE ET PRÉCAUTIONS" : "CAUTIONS AND WARNINGS"}</div>
        <div style={b}>{fr ? s.cautions_fr : p.caution || "—"}</div>
        <div style={h}>{fr ? "Ingrédients médicinaux" : "Medicinal Ingredients"}</div>
        <div style={{ ...b, fontFamily: "monospace", fontSize: 12 }}>{fr ? s.medicinal_fr : s.medicinal_en || "—"}</div>
        <div style={h}>{fr ? "Ingrédients non médicinaux" : "Non-Medicinal Ingredients"}</div>
        <div style={b}>{fr ? s.non_medicinal_fr : excipients || "—"}</div>
        <div style={{ marginTop: 16, padding: "10px 12px", background: "#fef3c7", borderRadius: 6, fontSize: 11, color: "#92400e", fontWeight: 500, lineHeight: 1.5 }}>
          {fr ? s.risk_info_fr : s.risk_info || ""}
        </div>
        {s.licence_holder && <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>Licence Holder: {s.licence_holder}</div>}
        <div style={{ marginTop: 8, fontSize: 11, color: "#64748b", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.company_info || ""}</div>
        {s.sidebar_text && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#f0fdf4", borderRadius: 6, borderLeft: "3px solid #22c55e" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#15803d", marginBottom: 4 }}>FEATURES</div>
            <div style={{ fontSize: 12, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{s.sidebar_text}</div>
          </div>
        )}
      </div>
    );
  };

  return s.label_type === "double" ? <>{renderOne("en")}{renderOne("fr")}</> : renderOne("en");
}


// ============================================================
// 以下组件和原版完全一致，直接保留
// ============================================================
function AddCategoryForm({ onAdd, onClose }) {
  const [zh, setZh] = useState(""); const [en, setEn] = useState(""); const [color, setColor] = useState("#64748b"); const [saving, setSaving] = useState(false);
  const PRESET_COLORS = ["#dc2626","#ea580c","#d97706","#65a30d","#059669","#0891b2","#2563eb","#6366f1","#8b5cf6","#7c3aed","#ec4899","#db2777","#be123c","#ca8a04","#0d9488","#16a34a","#f59e0b","#6d28d9","#0ea5e9","#14b8a6","#475569","#64748b","#a3a3a3"];
  const handleSubmit = async () => { if (!zh.trim()) { alert("请填写中文名"); return; } setSaving(true); try { await onAdd({ name_zh: zh.trim(), name_en: en.trim() || null, color }); onClose(); } catch (e) { alert("添加失败: " + e.message); } setSaving(false); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1200, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 400, padding: "24px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>新建功能分类</h3><button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={labelStyle}>中文名 *</label><input value={zh} onChange={e => setZh(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>英文名</label><input value={en} onChange={e => setEn(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>颜色</label><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>{PRESET_COLORS.map(c => <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: 6, border: color === c ? "3px solid #0f172a" : "2px solid #e2e8f0", background: c, cursor: "pointer" }} />)}</div></div>
          <div><span style={{ fontSize: 12, color: "#64748b" }}>预览：</span><Badge text={zh || "分类名"} color={color} sub={en || undefined} /></div>
        </div>
        <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: 10, fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8, background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer", marginTop: 16 }}>{saving ? "添加中..." : "添加分类"}</button>
      </div>
    </div>
  );
}

function ManageCategoriesForm({ categories, onUpdate, onDelete, onClose }) {
  const [editingId, setEditingId] = useState(null); const [editForm, setEditForm] = useState({});
  const PRESET_COLORS = ["#dc2626","#ea580c","#d97706","#65a30d","#059669","#0891b2","#2563eb","#6366f1","#8b5cf6","#7c3aed","#ec4899","#db2777","#be123c","#ca8a04","#0d9488","#16a34a","#f59e0b","#6d28d9","#0ea5e9","#14b8a6","#475569","#64748b","#a3a3a3"];
  const startEdit = (cat) => { setEditingId(cat.id); setEditForm({ name_zh: cat.name_zh, name_en: cat.name_en || "", color: cat.color || "#64748b" }); };
  const handleSave = async () => { try { await onUpdate(editingId, editForm); setEditingId(null); } catch (e) { alert("保存失败: " + e.message); } };
  const handleDelete = async (cat) => { if (!confirm(`确定删除分类「${cat.name_zh}」？`)) return; try { await onDelete(cat.id); } catch (e) { alert("删除失败: " + e.message); } };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1200, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 60 }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 520, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>管理功能分类</h3><button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button></div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                {editingId === cat.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={editForm.name_zh} onChange={e => setEditForm({ ...editForm, name_zh: e.target.value })} style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6 }} />
                      <input value={editForm.name_en} onChange={e => setEditForm({ ...editForm, name_en: e.target.value })} style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6 }} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{PRESET_COLORS.map(c => <button key={c} onClick={() => setEditForm({ ...editForm, color: c })} style={{ width: 22, height: 22, borderRadius: 4, cursor: "pointer", border: editForm.color === c ? "2px solid #0f172a" : "1px solid #e2e8f0", background: c }} />)}</div>
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

function ManageSuppliersForm({ suppliers, onAdd, onUpdate, onDelete, onClose }) {
  const [editingId, setEditingId] = useState(null); const [editForm, setEditForm] = useState({}); const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ supplier_name: "", contact_email: "", is_account_opened: "", agreement_signed: "" });
  const [saving, setSaving] = useState(false); const [searchTerm, setSearchTerm] = useState("");
  const FIELDS = [{ key: "supplier_name", label: "供应商名称 *", required: true }, { key: "contact_email", label: "联系人 (email)" }, { key: "is_account_opened", label: "是否开户" }, { key: "agreement_signed", label: "Agreement Signed" }];
  const filtered = suppliers.filter(s => s.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()));
  const startEdit = (s) => { setEditingId(s.id); setEditForm({ supplier_name: s.supplier_name || "", contact_email: s.contact_email || "", is_account_opened: s.is_account_opened || "", agreement_signed: s.agreement_signed || "" }); };
  const handleSave = async () => { if (!editForm.supplier_name?.trim()) { alert("供应商名称不能为空"); return; } setSaving(true); try { await onUpdate(editingId, editForm); setEditingId(null); } catch (e) { alert("保存失败: " + e.message); } setSaving(false); };
  const handleAdd = async () => { if (!newForm.supplier_name?.trim()) { alert("供应商名称不能为空"); return; } setSaving(true); try { const cleaned = {}; FIELDS.forEach(f => { cleaned[f.key] = newForm[f.key]?.trim() || null; }); await onAdd(cleaned); setNewForm({ supplier_name: "", contact_email: "", is_account_opened: "", agreement_signed: "" }); setShowNew(false); } catch (e) { alert("添加失败: " + e.message); } setSaving(false); };
  const handleDelete = async (s) => { if (!confirm(`确定删除供应商「${s.supplier_name}」？该供应商下的所有SKU也会被删除！`)) return; try { await onDelete(s.id); } catch (e) { alert("删除失败: " + e.message); } };
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
                    <label style={{ width: 120, fontSize: 12, color: "#64748b", fontWeight: 500, flexShrink: 0 }}>{f.label}</label>
                    <input value={newForm[f.key]} onChange={e => setNewForm({ ...newForm, [f.key]: e.target.value })} style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={handleAdd} disabled={saving} style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer" }}>{saving ? "添加中..." : "添加"}</button>
                <button onClick={() => setShowNew(false)} style={{ padding: "6px 16px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer" }}>取消</button>
              </div>
            </div>
          )}
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜索供应商..." style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, marginBottom: 12, boxSizing: "border-box" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map(s => (
              <div key={s.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                {editingId === s.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {FIELDS.map(f => (
                      <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ width: 120, fontSize: 12, color: "#64748b", fontWeight: 500, flexShrink: 0 }}>{f.label}</label>
                        <input value={editForm[f.key]} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6 }} />
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
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.contact_email || "无联系方式"}{s.agreement_signed && <span style={{ marginLeft: 8, color: "#16a34a" }}>✓ Agreement</span>}</div>
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

function DetailPanel({ item, suppliers, categories, lang, commonIngredients = [], onClose, onSave, onDelete, onRefresh }) {
  const [editing, setEditing] = useState(false); const [form, setForm] = useState({}); const [selCatIds, setSelCatIds] = useState([]); const [saving, setSaving] = useState(false);
  useEffect(() => { if (item) { const f = {}; SKU_FIELDS.forEach(({ key }) => { f[key] = item[key] || ""; }); f.supplier_id = item.supplier_id || ""; setForm(f); setSelCatIds(item.category_ids || []); setEditing(false); } }, [item]);
  if (!item) return null;
  const supplier = suppliers.find(s => s.id === item.supplier_id);
  const getCatDisplay = (cat) => lang === "en" ? (cat.name_en || cat.name_zh) : cat.name_zh;
  const getCatSub = (cat) => lang === "zh" ? cat.name_en : (lang === "en" ? cat.name_zh : null);
  const handleSave = async () => { setSaving(true); try { await onSave(item.id, form, selCatIds); setEditing(false); } catch (e) { alert("保存失败: " + e.message); } setSaving(false); };
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
            {item.category_ids.map(cid => { const cat = categories.find(c => c.id === cid); if (!cat) return null; return <Badge key={cid} text={getCatDisplay(cat)} color={cat.color || "#64748b"} sub={getCatSub(cat)} />; })}
          </div>
        )}
        {editing && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 8 }}>功能标签（点击切换）</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {categories.map(cat => { const active = selCatIds.includes(cat.id); return <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{ padding: "3px 10px", fontSize: 11, borderRadius: 9999, cursor: "pointer", border: `1px solid ${active ? (cat.color || "#64748b") : "#e2e8f0"}`, background: active ? (cat.color || "#64748b") + "15" : "#fff", color: active ? (cat.color || "#64748b") : "#94a3b8", fontWeight: active ? 600 : 400 }}>{cat.name_zh}{cat.name_en ? ` / ${cat.name_en}` : ""}</button>; })}
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
              ? <textarea value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} rows={["health_canada_monograph", "notes", "npn_notes"].includes(key) ? 3 : 1} style={{ flex: 1, padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, resize: "vertical", fontFamily: "inherit" }} />
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

function AddForm({ suppliers, categories, onAdd, onClose }) {
  const [form, setForm] = useState({ supplier_id: "" }); const [selCatIds, setSelCatIds] = useState([]); const [saving, setSaving] = useState(false);
  const toggleCat = (catId) => setSelCatIds(p => p.includes(catId) ? p.filter(c => c !== catId) : [...p, catId]);
  const handleSubmit = async () => { if (!form.supplier_id) { alert("请选择供应商"); return; } setSaving(true); try { await onAdd(form, selCatIds); onClose(); } catch (e) { alert("添加失败: " + e.message); } setSaving(false); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1100, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 60 }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 560, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>新增条目</h2><button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={labelStyle}>供应商 *</label><select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, marginTop: 4 }}><option value="">选择供应商</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select></div>
            {SKU_FIELDS.map(({ key, label }) => (<div key={key}><label style={labelStyle}>{label}</label><input value={form[key] || ""} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, marginTop: 4, boxSizing: "border-box" }} /></div>))}
            <div><label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>功能标签</label><div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{categories.map(cat => { const active = selCatIds.includes(cat.id); return <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{ padding: "3px 10px", fontSize: 11, borderRadius: 9999, cursor: "pointer", border: `1px solid ${active ? (cat.color || "#64748b") : "#e2e8f0"}`, background: active ? (cat.color || "#64748b") + "15" : "#fff", color: active ? (cat.color || "#64748b") : "#94a3b8" }}>{cat.name_zh}</button>; })}</div></div>
          </div>
          <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: 12, fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8, background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer", marginTop: 20 }}>{saving ? "添加中..." : "添加"}</button>
        </div>
      </div>
    </div>
  );
}
