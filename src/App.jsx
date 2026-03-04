import { useState, useMemo, useEffect } from "react";

// ============================================================
// Supabase 连接
// ============================================================
const SUPABASE_URL = "https://fotcnfwkzncsxbbvpdpw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdGNuZndrem5jc3hiYnZwZHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODY0MDgsImV4cCI6MjA4ODA2MjQwOH0.0Y1OazcLFBP_FOg-_CIodPbt7-eepZ7CIDaib4E-XK0";

const supabase = {
  from: (table) => ({
    select: async (columns = "*") => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(columns)}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    insert: async (rows) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json", Prefer: "return=representation",
        },
        body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    update: async (id, data) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json", Prefer: "return=representation",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
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
const SKU_FIELDS = [
  { key: "region", label: "地区", label_en: "Region" },
  { key: "product_name", label: "品名", label_en: "Product" },
  { key: "form_potency", label: "Form & Potency", label_en: "Form & Potency" },
  { key: "ingredient", label: "成分", label_en: "Ingredient" },
  { key: "extraction_ratio_source", label: "提取比例/来源", label_en: "Extraction/Source" },
  { key: "lead_time", label: "交付周期", label_en: "Lead Time" },
  { key: "expire_date", label: "Expire Date", label_en: "Expire Date" },
  { key: "price_usd_kg", label: "价格(USD/KG)", label_en: "Price(USD/KG)" },
  { key: "price_cad_kg", label: "价格(CAD/KG)", label_en: "Price(CAD/KG)" },
  { key: "daily_recommended_dose", label: "日推荐摄入量", label_en: "Daily Dose" },
  { key: "health_canada_monograph", label: "HC Monograph", label_en: "HC Monograph" },
  { key: "moq_kg", label: "MOQ kg", label_en: "MOQ kg" },
  { key: "can_apply_npn", label: "能否申NPN", label_en: "NPN Eligible" },
  { key: "applicable_gender", label: "适用性别", label_en: "Gender" },
  { key: "applicable_population", label: "适用人群", label_en: "Population" },
  { key: "notes", label: "备注", label_en: "Notes" },
  { key: "certificates", label: "Certificates", label_en: "Certificates" },
];

const TABLE_COLS = [
  { key: "region", label: "地区", w: 100 },
  { key: "supplier_name", label: "供应商", w: 140 },
  { key: "product_name", label: "品名", w: 160 },
  { key: "ingredient", label: "成分", w: 160 },
  { key: "form_potency", label: "Form & Potency", w: 140 },
  { key: "price_usd_kg", label: "USD/KG", w: 120 },
  { key: "price_cad_kg", label: "CAD/KG", w: 100 },
  { key: "functions", label: "功能", w: 200 },
  { key: "daily_recommended_dose", label: "日推荐摄入量", w: 110 },
  { key: "health_canada_monograph", label: "HC Monograph", w: 120 },
  { key: "moq_kg", label: "MOQ", w: 80 },
  { key: "can_apply_npn", label: "NPN", w: 60 },
];

// ============================================================
// 小组件
// ============================================================
function Badge({ text, color, sub }) {
  return (
    <span style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      padding: sub ? "3px 10px 2px" : "2px 8px", borderRadius: 9999,
      fontSize: 11, fontWeight: 500, marginRight: 4, marginBottom: 2,
      background: color + "18", color: color, border: `1px solid ${color}40`,
      whiteSpace: "nowrap", lineHeight: 1.3,
    }}>
      <span>{text}</span>
      {sub && <span style={{ fontSize: 9, opacity: 0.7 }}>{sub}</span>}
    </span>
  );
}

function Loading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{
        width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6",
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ============================================================
// 新建分类弹窗
// ============================================================
function AddCategoryForm({ onAdd, onClose }) {
  const [zh, setZh] = useState("");
  const [en, setEn] = useState("");
  const [color, setColor] = useState("#64748b");
  const [saving, setSaving] = useState(false);

  const PRESET_COLORS = [
    "#dc2626", "#ea580c", "#d97706", "#65a30d", "#059669", "#0891b2",
    "#2563eb", "#6366f1", "#8b5cf6", "#7c3aed", "#ec4899", "#db2777",
    "#be123c", "#ca8a04", "#0d9488", "#16a34a", "#f59e0b", "#6d28d9",
    "#0ea5e9", "#14b8a6", "#475569", "#64748b", "#a3a3a3",
  ];

  const handleSubmit = async () => {
    if (!zh.trim()) { alert("请填写中文名"); return; }
    setSaving(true);
    try {
      await onAdd({ name_zh: zh.trim(), name_en: en.trim() || null, color });
      onClose();
    } catch (e) { alert("添加失败: " + e.message); }
    setSaving(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1200,
      display: "flex", justifyContent: "center", alignItems: "center",
    }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 400, padding: "24px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>新建功能分类</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>中文名 *</label>
            <input value={zh} onChange={e => setZh(e.target.value)} placeholder="如：关节炎"
              style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, marginTop: 4, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>英文名</label>
            <input value={en} onChange={e => setEn(e.target.value)} placeholder="如：Arthritis"
              style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, marginTop: 4, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>颜色</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: 6, border: color === c ? "3px solid #0f172a" : "2px solid #e2e8f0",
                  background: c, cursor: "pointer",
                }} />
              ))}
            </div>
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>预览：</span>
            <Badge text={zh || "分类名"} color={color} sub={en || undefined} />
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving} style={{
          width: "100%", padding: "10px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8,
          background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer", marginTop: 16,
        }}>{saving ? "添加中..." : "添加分类"}</button>
      </div>
    </div>
  );
}

// ============================================================
// 详情面板 + 编辑
// ============================================================
function DetailPanel({ item, suppliers, categories, lang, onClose, onSave, onDelete }) {
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item.id, form, selCatIds);
      setEditing(false);
    } catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
  };

  const toggleCat = (catId) => {
    setSelCatIds(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]);
  };

  const getCatDisplay = (cat) => lang === "en" ? (cat.name_en || cat.name_zh) : cat.name_zh;
  const getCatSub = (cat) => lang === "zh" ? cat.name_en : (lang === "en" ? cat.name_zh : null);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 520,
      background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
      zIndex: 1000, overflowY: "auto", borderLeft: "1px solid #e2e8f0",
    }}>
      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              {supplier?.supplier_name || "未知供应商"}
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
              {item.product_name || item.ingredient || "—"}
            </h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!editing && (
              <button onClick={() => setEditing(true)} style={{
                background: "none", border: "1px solid #e2e8f0", borderRadius: 6,
                padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#475569",
              }}>✏️ 编辑</button>
            )}
            <button onClick={onClose} style={{
              background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", padding: "4px 8px",
            }}>×</button>
          </div>
        </div>

        {/* 功能标签显示 */}
        {!editing && item.category_ids?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {item.category_ids.map(cid => {
              const cat = categories.find(c => c.id === cid);
              if (!cat) return null;
              return <Badge key={cid} text={getCatDisplay(cat)} color={cat.color || "#64748b"} sub={getCatSub(cat)} />;
            })}
          </div>
        )}

        {/* 编辑模式：功能标签选择 */}
        {editing && (
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
                    color: active ? (cat.color || "#64748b") : "#94a3b8", fontWeight: active ? 600 : 400,
                  }}>{cat.name_zh}{cat.name_en ? ` / ${cat.name_en}` : ""}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* 供应商选择 */}
        {editing && (
          <div style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: 130, flexShrink: 0, fontSize: 13, color: "#64748b", fontWeight: 500, paddingTop: 8 }}>供应商</div>
            <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: parseInt(e.target.value) })}
              style={{ flex: 1, padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6 }}>
              <option value="">选择供应商</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
            </select>
          </div>
        )}

        {/* 字段列表 */}
        {SKU_FIELDS.map(({ key, label }) => (
          <div key={key} style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: 130, flexShrink: 0, fontSize: 13, color: "#64748b", fontWeight: 500, paddingTop: editing ? 8 : 0 }}>{label}</div>
            {editing ? (
              <textarea value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                rows={key === "health_canada_monograph" || key === "notes" ? 3 : 1}
                style={{ flex: 1, padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, resize: "vertical", fontFamily: "inherit" }} />
            ) : (
              <div style={{ fontSize: 13, color: "#1e293b", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{item[key] || "—"}</div>
            )}
          </div>
        ))}

        {editing && (
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{
              flex: 1, padding: "10px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8,
              background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer",
            }}>{saving ? "保存中..." : "保存"}</button>
            <button onClick={() => setEditing(false)} style={{
              padding: "10px 20px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#475569",
            }}>取消</button>
            <button onClick={() => { if (confirm("确定删除？")) onDelete(item.id); }} style={{
              padding: "10px 16px", fontSize: 14, border: "1px solid #fecaca", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#dc2626",
            }}>删除</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 新增 SKU 表单
// ============================================================
function AddForm({ suppliers, categories, onAdd, onClose }) {
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
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>供应商 *</label>
              <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, marginTop: 4 }}>
                <option value="">选择供应商</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
            {SKU_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{label}</label>
                <input value={form[key] || ""} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, marginTop: 4, boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 6, display: "block" }}>功能标签</label>
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
          <button onClick={handleSubmit} disabled={saving} style={{
            width: "100%", padding: "12px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8,
            background: "#2563eb", color: "#fff", cursor: saving ? "wait" : "pointer", marginTop: 20,
          }}>{saving ? "添加中..." : "添加"}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 密码锁
// ============================================================
function PasswordGate({ children }) {
  const [locked, setLocked] = useState(true);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const PASSWORD = "ingredient2025";

  const handleSubmit = () => {
    if (input === PASSWORD) setLocked(false);
    else { setError(true); setTimeout(() => setError(false), 1500); }
  };

  if (!locked) return children;
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
  const [data, setData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [selCatIds, setSelCatIds] = useState([]);
  const [selRegion, setSelRegion] = useState("");
  const [selNPN, setSelNPN] = useState("");
  const [lang, setLang] = useState("zh"); // "zh" = 中文优先显示, "en" = 英文优先

  const [detail, setDetail] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  // ---- 加载数据 ----
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

      const catMap = {};
      catData.forEach(c => { catMap[c.id] = c; });

      // 每个 SKU 的 category_id 列表
      const skuCatMap = {};
      funcData.forEach(f => {
        if (!skuCatMap[f.sku_id]) skuCatMap[f.sku_id] = [];
        skuCatMap[f.sku_id].push(f.category_id);
      });

      const merged = skuData.map(sku => ({
        ...sku,
        supplier_name: supplierMap[sku.supplier_id]?.supplier_name || "—",
        contact_email: supplierMap[sku.supplier_id]?.contact_email || "",
        category_ids: skuCatMap[sku.id] || [],
      }));

      setData(merged);
      setError(null);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ---- 筛选 ----
  const regions = useMemo(() => [...new Set(data.map(r => r.region).filter(Boolean))].sort(), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.filter(r => {
      if (q) {
        // 搜索时也匹配分类名
        const catNames = (r.category_ids || []).map(cid => {
          const cat = categories.find(c => c.id === cid);
          return cat ? `${cat.name_zh} ${cat.name_en || ""}` : "";
        }).join(" ");
        const h = [r.supplier_name, r.product_name, r.ingredient, r.region,
          r.form_potency, r.notes, r.certificates, catNames]
          .filter(Boolean).join(" ").toLowerCase();
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
      const va = (a[sortCol] || "").toString();
      const vb = (b[sortCol] || "").toString();
      return sortDir === "asc" ? va.localeCompare(vb, "zh") : vb.localeCompare(va, "zh");
    });
  }, [filtered, sortCol, sortDir]);

  // ---- CRUD ----
  const handleSave = async (skuId, formData, catIds) => {
    const skuUpdate = {};
    SKU_FIELDS.forEach(({ key }) => { skuUpdate[key] = formData[key] || null; });
    skuUpdate.supplier_id = formData.supplier_id || null;
    await supabase.from("skus").update(skuId, skuUpdate);
    await supabase.from("sku_functions").deleteWhere("sku_id", skuId);
    if (catIds.length > 0) {
      await supabase.from("sku_functions").insert(catIds.map(cid => ({ sku_id: skuId, category_id: cid })));
    }
    await loadData();
  };

  const handleAdd = async (formData, catIds) => {
    const skuInsert = {};
    SKU_FIELDS.forEach(({ key }) => { skuInsert[key] = formData[key] || null; });
    skuInsert.supplier_id = parseInt(formData.supplier_id);
    const [newSku] = await supabase.from("skus").insert(skuInsert);
    if (catIds.length > 0) {
      await supabase.from("sku_functions").insert(catIds.map(cid => ({ sku_id: newSku.id, category_id: cid })));
    }
    await loadData();
  };

  const handleDelete = async (skuId) => {
    await supabase.from("skus").delete(skuId);
    setDetail(null);
    await loadData();
  };

  const handleAddCategory = async (catData) => {
    await supabase.from("function_categories").insert(catData);
    await loadData();
  };

  const toggleCat = (catId) => setSelCatIds(p => p.includes(catId) ? p.filter(c => c !== catId) : [...p, catId]);
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const clearAll = () => { setSearch(""); setSelCatIds([]); setSelRegion(""); setSelNPN(""); };

  const getCatDisplay = (cat) => lang === "en" ? (cat.name_en || cat.name_zh) : cat.name_zh;
  const getCatSub = (cat) => lang === "zh" ? cat.name_en : (lang === "en" ? cat.name_zh : null);

  return (
    <PasswordGate>
      <div style={{ fontFamily: "'Source Han Sans SC','Noto Sans SC',-apple-system,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ background: "#0f172a", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#f8fafc", letterSpacing: 0.5 }}>原料数据库</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              {data.length} 条记录 · {suppliers.length} 供应商 · {categories.length} 功能分类
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* 中英切换 */}
            <button onClick={() => setLang(l => l === "zh" ? "en" : "zh")} style={{
              padding: "8px 14px", fontSize: 12, fontWeight: 600, border: "1px solid #334155", borderRadius: 8,
              background: "transparent", color: "#94a3b8", cursor: "pointer",
            }}>{lang === "zh" ? "EN" : "中"}</button>
            <button onClick={() => setShowAdd(true)} style={{
              padding: "8px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8,
              background: "#3b82f6", color: "#fff", cursor: "pointer",
            }}>+ 新增条目</button>
          </div>
        </div>

        {/* Search + Filters */}
        <div style={{ padding: "16px 28px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索品名、成分、供应商、功能..."
              style={{ flex: 1, minWidth: 240, padding: "10px 14px", fontSize: 14, border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#f8fafc" }}
              onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            <select value={selRegion} onChange={e => setSelRegion(e.target.value)}
              style={{ padding: "10px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
              <option value="">全部地区</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={selNPN} onChange={e => setSelNPN(e.target.value)}
              style={{ padding: "10px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
              <option value="">NPN 不限</option>
              <option value="yes">可申NPN</option>
              <option value="no">不可/未知</option>
            </select>
            {(search || selCatIds.length || selRegion || selNPN) && (
              <button onClick={clearAll} style={{
                padding: "8px 14px", fontSize: 12, border: "none", borderRadius: 6,
                background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontWeight: 500,
              }}>清除筛选</button>
            )}
          </div>
          {/* 功能分类标签 - 从数据库动态读取 */}
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {categories.map(cat => {
              const active = selCatIds.includes(cat.id);
              const color = cat.color || "#64748b";
              return (
                <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{
                  padding: "4px 12px", fontSize: 12, borderRadius: 9999, cursor: "pointer",
                  border: `1px solid ${active ? color : "#e2e8f0"}`,
                  background: active ? color + "15" : "#fff", color: active ? color : "#64748b",
                  fontWeight: active ? 600 : 400,
                }}>
                  {getCatDisplay(cat)}
                  {getCatSub(cat) && <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 4 }}>{getCatSub(cat)}</span>}
                </button>
              );
            })}
            <button onClick={() => setShowAddCat(true)} style={{
              width: 28, height: 28, borderRadius: 9999, border: "1px dashed #cbd5e1",
              background: "#fff", color: "#94a3b8", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>+</button>
          </div>
        </div>

        {/* Results */}
        <div style={{ padding: "12px 28px", fontSize: 13, color: "#64748b" }}>
          找到 <strong style={{ color: "#0f172a" }}>{sorted.length}</strong> 条结果
        </div>

        {loading ? <Loading /> : error ? (
          <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
            加载失败: {error}<br />
            <button onClick={loadData} style={{ marginTop: 12, padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer" }}>重试</button>
          </div>
        ) : (
          <div style={{ padding: "0 28px 40px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {TABLE_COLS.map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)} style={{
                      padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569",
                      borderBottom: "2px solid #e2e8f0", cursor: "pointer", userSelect: "none",
                      whiteSpace: "nowrap", fontSize: 12, position: "sticky", top: 0, background: "#f8fafc", minWidth: col.w,
                    }}>{col.label}{sortCol === col.key && (sortDir === "asc" ? " ↑" : " ↓")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.id || i} onClick={() => setDetail(r)} style={{
                    cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#fff" : "#fafbfc",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafbfc"}>
                    {TABLE_COLS.map(col => (
                      <td key={col.key} style={{
                        padding: "10px 12px", color: "#334155", maxWidth: col.w, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: col.key === "functions" ? "normal" : "nowrap", lineHeight: 1.4,
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

        {/* Detail panel */}
        {detail && (
          <>
            <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 999 }} />
            <DetailPanel item={detail} suppliers={suppliers} categories={categories} lang={lang}
              onClose={() => setDetail(null)} onSave={handleSave} onDelete={handleDelete} />
          </>
        )}

        {/* Add SKU form */}
        {showAdd && <AddForm suppliers={suppliers} categories={categories} onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

        {/* Add category form */}
        {showAddCat && <AddCategoryForm onAdd={handleAddCategory} onClose={() => setShowAddCat(false)} />}
      </div>
    </PasswordGate>
  );
}