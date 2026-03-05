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
  { key: "region", label: "地区" }, { key: "product_name", label: "品名" },
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
  { key: "agreement_signed", label: "Agreement", w: 110 }, { key: "product_name", label: "品名", w: 150 },
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

const STATUS_CONFIG = {
  production: {
    not_started: { label: "未开始", color: "#94a3b8" },
    in_production: { label: "生产中", color: "#f59e0b" },
    completed:    { label: "已完成", color: "#22c55e" },
  },
  approval: {
    pending:  { label: "待审批", color: "#f59e0b" },
    approved: { label: "已审批", color: "#22c55e" },
    rejected: { label: "已拒绝", color: "#ef4444" },
  },
};

// ============================================================
// 通用小组件
// ============================================================
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

function StatusBadge({ type, value }) {
  const cfg = STATUS_CONFIG[type]?.[value] || { label: value || "—", color: "#94a3b8" };
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 500,
      background: cfg.color + "18", color: cfg.color, border: `1px solid ${cfg.color}40`,
    }}>{cfg.label}</span>
  );
}

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ============================================================
// IngredientPicker — 搜索变tag
// ============================================================
function IngredientPicker({ skus, selected, onChange }) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 点击外部关闭dropdown
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase();
    return skus
      .filter(s => !selected.find(sel => sel.sku_id === s.id))
      .filter(s =>
        s.product_name?.toLowerCase().includes(q) ||
        s.ingredient?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [input, skus, selected]);

  const add = (sku) => {
    onChange([...selected, { sku_id: sku.id, product_name: sku.product_name, ingredient: sku.ingredient, dosage: "", notes: "" }]);
    setInput("");
    setOpen(false);
  };

  const remove = (skuId) => onChange(selected.filter(s => s.sku_id !== skuId));

  const updateField = (skuId, field, val) =>
    onChange(selected.map(s => s.sku_id === skuId ? { ...s, [field]: val } : s));

  return (
    <div ref={ref}>
      {/* 已选tags */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {selected.map(s => (
            <div key={s.sku_id} style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "4px 8px",
            }}>
              <div style={{ fontSize: 12, color: "#1e40af", fontWeight: 500 }}>
                {s.product_name || s.ingredient || "—"}
              </div>
              <input
                value={s.dosage}
                onChange={e => updateField(s.sku_id, "dosage", e.target.value)}
                placeholder="用量"
                style={{ width: 70, fontSize: 11, border: "1px solid #bfdbfe", borderRadius: 4, padding: "2px 4px", background: "#fff" }}
              />
              <button onClick={() => remove(s.sku_id)} style={{
                background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, lineHeight: 1, padding: 0,
              }}>×</button>
            </div>
          ))}
        </div>
      )}
      {/* 搜索框 */}
      <div style={{ position: "relative" }}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => input && setOpen(true)}
          placeholder="搜索成分或品名添加..."
          style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", outline: "none" }}
        />
        {open && suggestions.length > 0 && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, background: "#fff",
            border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            zIndex: 500, maxHeight: 240, overflowY: "auto",
          }}>
            {suggestions.map(s => (
              <div key={s.id} onClick={() => add(s)} style={{
                padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                fontSize: 13,
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <div style={{ fontWeight: 500, color: "#0f172a" }}>{s.product_name || "—"}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{s.ingredient || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ProductForm — 新增/编辑产品弹窗
// ============================================================
function ProductForm({ product, brands, skus, onSave, onClose }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    product_name: product?.product_name || "",
    product_name_en: product?.product_name_en || "",
    brand_id: product?.brand_id || "",
    production_status: product?.production_status || "not_started",
    approval_status: product?.approval_status || "pending",
    is_listed: product?.is_listed || false,
    notes: product?.notes || "",
    price_cad: product?.price_cad || "",
    price_usd: product?.price_usd || "",
  });
  const [ingredients, setIngredients] = useState(product?.ingredients || []);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.product_name_en?.trim()) { alert("请填写英文产品名称"); return; }
    setSaving(true);
    try { await onSave(isEdit ? product.id : null, form, ingredients); onClose(); }
    catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1100, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 40, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 600, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", marginBottom: 40 }}>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{isEdit ? "编辑产品" : "新增产品"}</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* 名称 */}
            <div>
              <label style={labelStyle}>Product Name (English) *</label>
              <input value={form.product_name_en} onChange={e => f("product_name_en", e.target.value)}
                style={inputStyle} placeholder="e.g. Youth Greeting Capsule" />
            </div>
            <div>
              <label style={labelStyle}>产品名称（中文）</label>
              <input value={form.product_name} onChange={e => f("product_name", e.target.value)}
                style={inputStyle} placeholder="如：青春有你胶囊" />
            </div>

            {/* 配方前置：先选品牌和ingredients */}
            <div>
              <label style={labelStyle}>配方 Ingredients</label>
              <IngredientPicker skus={skus} selected={ingredients} onChange={setIngredients} />
            </div>

            {/* 品牌 */}
            <div>
              <label style={labelStyle}>品牌</label>
              <select value={form.brand_id} onChange={e => f("brand_id", e.target.value)} style={inputStyle}>
                <option value="">选择品牌</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name_zh}{b.name_en ? ` / ${b.name_en}` : ""}</option>)}
              </select>
            </div>

            {/* 状态 */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>生产状态</label>
                <select value={form.production_status} onChange={e => f("production_status", e.target.value)} style={inputStyle}>
                  <option value="not_started">未开始</option>
                  <option value="in_production">生产中</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>审批状态</label>
                <select value={form.approval_status} onChange={e => f("approval_status", e.target.value)} style={inputStyle}>
                  <option value="pending">待审批</option>
                  <option value="approved">已审批</option>
                  <option value="rejected">已拒绝</option>
                </select>
              </div>
            </div>

            {/* 价格 */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>价格 CAD</label>
                <input value={form.price_cad} onChange={e => f("price_cad", e.target.value)} style={inputStyle} placeholder="0.00" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>价格 USD</label>
                <input value={form.price_usd} onChange={e => f("price_usd", e.target.value)} style={inputStyle} placeholder="0.00" />
              </div>
            </div>

            {/* 上架 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="is_listed" checked={form.is_listed} onChange={e => f("is_listed", e.target.checked)} />
              <label htmlFor="is_listed" style={{ fontSize: 13, color: "#475569", cursor: "pointer" }}>已上架</label>
            </div>
          </div>
            {/* 备注 */}
            <div>
              <label style={labelStyle}>备注</label>
              <textarea value={form.notes} onChange={e => f("notes", e.target.value)} rows={2}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            </div>

          <button onClick={handleSubmit} disabled={saving} style={{
            width: "100%", padding: 12, fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8,
            background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer", marginTop: 20,
          }}>{saving ? "保存中..." : "保存"}</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 12, color: "#64748b", fontWeight: 500, display: "block", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", fontFamily: "inherit" };

// ============================================================
// ProductDetail — 右侧详情面板
// ============================================================
function ProductDetail({ product, brands, skus, onEdit, onDelete, onClose }) {
  if (!product) return null;
  const brand = brands.find(b => b.id === product.brand_id);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
      background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
      zIndex: 1000, overflowY: "auto", borderLeft: "1px solid #e2e8f0",
    }}>
      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            {brand && <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{brand.name_zh}</div>}
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{product.product_name}</h2>
            {product.product_name_en && <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{product.product_name_en}</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onEdit(product)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#475569" }}>✏️ 编辑</button>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button>
          </div>
        </div>

        {/* 状态badges */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <StatusBadge type="production" value={product.production_status} />
          <StatusBadge type="approval" value={product.approval_status} />
          {product.is_listed && <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 500, background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" }}>已上架</span>}
        </div>

        {/* 价格 */}
        {(product.price_cad || product.price_usd) && (
          <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, marginBottom: 16, display: "flex", gap: 20 }}>
            {product.price_cad && <div><div style={{ fontSize: 11, color: "#64748b" }}>CAD</div><div style={{ fontSize: 16, fontWeight: 600, color: "#16a34a" }}>${product.price_cad}</div></div>}
            {product.price_usd && <div><div style={{ fontSize: 11, color: "#64748b" }}>USD</div><div style={{ fontSize: 16, fontWeight: 600, color: "#16a34a" }}>${product.price_usd}</div></div>}
          </div>
        )}

        {/* 配方 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>配方 ({product.ingredients?.length || 0} 种成分)</div>
          {product.ingredients?.length > 0 ? product.ingredients.map(ing => {
            const sku = skus.find(s => s.id === ing.sku_id);
            return (
              <div key={ing.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{sku?.product_name || ing.sku_id}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{sku?.ingredient || "—"}</div>
                </div>
                {ing.dosage && <div style={{ fontSize: 12, color: "#3b82f6", fontWeight: 500 }}>{ing.dosage}</div>}
              </div>
            );
          }) : <div style={{ fontSize: 13, color: "#94a3b8" }}>暂无配方信息</div>}
        </div>

        {/* 备注 */}
        {product.notes && (
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>备注</div>
            <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{product.notes}</div>
          </div>
        )}

        {/* 删除 */}
        <button onClick={() => { if (confirm(`确定删除「${product.product_name}」？`)) onDelete(product.id); }}
          style={{ marginTop: 20, width: "100%", padding: 10, fontSize: 13, border: "1px solid #fecaca", borderRadius: 8, background: "#fff", color: "#dc2626", cursor: "pointer" }}>
          删除产品
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ProductTab
// ============================================================
function ProductTab({ skus }) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterProduction, setFilterProduction] = useState("");
  const [filterApproval, setFilterApproval] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, brands, pis] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("brands").select("*"),
        supabase.from("product_ingredients").select("*"),
      ]);
      setBrands(brands);
      const piMap = {};
      pis.forEach(pi => {
        if (!piMap[pi.product_id]) piMap[pi.product_id] = [];
        piMap[pi.product_id].push(pi);
      });
      setProducts(prods.map(p => ({ ...p, ingredients: piMap[p.id] || [] })));
    } catch (e) { alert("加载失败: " + e.message); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      if (q && !p.product_name?.toLowerCase().includes(q) && !p.product_name_en?.toLowerCase().includes(q)) return false;
      if (filterBrand && String(p.brand_id) !== filterBrand) return false;
      if (filterProduction && p.production_status !== filterProduction) return false;
      if (filterApproval && p.approval_status !== filterApproval) return false;
      return true;
    });
  }, [products, search, filterBrand, filterProduction, filterApproval]);

  const handleSave = async (productId, formData, ingredients) => {
    const payload = {
      product_name: formData.product_name || null,
      product_name_en: formData.product_name_en || null,
      brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
      production_status: formData.production_status,
      approval_status: formData.approval_status,
      is_listed: formData.is_listed,
      notes: formData.notes || null,
      price_cad: formData.price_cad ? parseFloat(formData.price_cad) : null,
      price_usd: formData.price_usd ? parseFloat(formData.price_usd) : null,
    };

    let pid = productId;
    if (productId) {
      await supabase.from("products").update(productId, payload);
    } else {
      const [newP] = await supabase.from("products").insert(payload);
      pid = newP.id;
    }

    // 更新配方：先删再插
    await supabase.from("product_ingredients").deleteWhere("product_id", pid);
    if (ingredients.length > 0) {
      await supabase.from("product_ingredients").insert(
        ingredients.map(i => ({ product_id: pid, sku_id: i.sku_id, dosage: i.dosage || null, notes: i.notes || null }))
      );
    }
    await loadData();
    setDetail(null);
  };

  const handleDelete = async (id) => {
    await supabase.from("products").delete(id);
    setDetail(null);
    await loadData();
  };

  const openEdit = (p) => { setEditProduct(p); setShowForm(true); };
  const openNew = () => { setEditProduct(null); setShowForm(true); };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* 筛选栏 */}
      <div style={{ padding: "16px 28px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索产品名称..."
          style={{ flex: 1, minWidth: 200, padding: "9px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", outline: "none" }} />
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} style={selStyle}>
          <option value="">全部品牌</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name_zh}</option>)}
        </select>
        <select value={filterProduction} onChange={e => setFilterProduction(e.target.value)} style={selStyle}>
          <option value="">全部生产状态</option>
          <option value="not_started">未开始</option>
          <option value="in_production">生产中</option>
          <option value="completed">已完成</option>
        </select>
        <select value={filterApproval} onChange={e => setFilterApproval(e.target.value)} style={selStyle}>
          <option value="">全部审批状态</option>
          <option value="pending">待审批</option>
          <option value="approved">已审批</option>
          <option value="rejected">已拒绝</option>
        </select>
        <button onClick={openNew} style={{ padding: "9px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>
          + 新增产品
        </button>
      </div>

      <div style={{ padding: "12px 28px", fontSize: 13, color: "#64748b" }}>
        共 <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> 个产品
      </div>

      {loading ? <Loading /> : (
        <div style={{ padding: "0 28px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filtered.map(p => {
            const brand = brands.find(b => b.id === p.brand_id);
            return (
              <div key={p.id} onClick={() => setDetail(p)} style={{
                background: "#fff", borderRadius: 10, padding: 16, cursor: "pointer",
                border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"}
              >
                {brand && <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{brand.name_zh}</div>}
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{p.product_name}</div>
                {p.product_name_en && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{p.product_name_en}</div>}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  <StatusBadge type="production" value={p.production_status} />
                  <StatusBadge type="approval" value={p.approval_status} />
                  {p.is_listed && <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 11, background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" }}>已上架</span>}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{p.ingredients?.length || 0} 种成分</div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: "#94a3b8" }}>暂无产品</div>}
        </div>
      )}

      {detail && (
        <>
          <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 999 }} />
          <ProductDetail product={detail} brands={brands} skus={skus}
            onEdit={openEdit} onDelete={handleDelete} onClose={() => setDetail(null)} />
        </>
      )}

      {showForm && (
        <ProductForm
          product={editProduct}
          brands={brands}
          skus={skus}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}
    </div>
  );
}

const selStyle = { padding: "9px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" };

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
  const [expanded, setExpanded] = useState(false);
  const [openedColW, setOpenedColW] = useState(80);

  const loadData = async () => {
    try {
      setLoading(true);
      const [suppData, skuData, funcData, catData] = await Promise.all([
        supabase.from("suppliers").select("*"),
        supabase.from("skus").select("*"),
        supabase.from("sku_functions").select("*"),
        supabase.from("function_categories").select("*"),
      ]);
      setSuppliers(suppData);
      setCategories(catData);
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
            onClose={() => setDetail(null)} onSave={handleSave} onDelete={handleDeleteSku} />
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
    supabase.from("skus").select("id,product_name,ingredient").then(setSkus).catch(() => {});
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
                    {[{ key: "ingredients", label: "原料库" }, { key: "products", label: "产品管理" }].map(t => (
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
            </>
          )}
        </div>
      )}
    </PasswordGate>
  );
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

function DetailPanel({ item, suppliers, categories, lang, onClose, onSave, onDelete }) {
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
