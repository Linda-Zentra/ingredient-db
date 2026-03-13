import { useState, useMemo, useEffect } from "react";
import supabase from "../../lib/supabase";
import { SKU_FIELDS, TABLE_COLS } from "../../constants";
import Loading from "../ui/Loading";
import Badge from "../ui/Badge";
import DetailPanel from "./DetailPanel";
import AddForm from "./AddForm";
import AddCategoryForm from "./AddCategoryForm";
import ManageCategoriesForm from "./ManageCategoriesForm";
import ManageSuppliersForm from "./ManageSuppliersForm";

const hdrBtn = { padding: "6px 12px", fontSize: 12, fontWeight: 500, border: "1px solid #e2e8f0", borderRadius: 7, background: "transparent", color: "#475569", cursor: "pointer" };

export default function IngredientTab() {
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
      // 5个请求 → 2个，skus 直接 JOIN supplier 和 functions
      const [{ data: skuData, error: e1 }, { data: catData, error: e2 }, { data: commonData, error: e3 }] = await Promise.all([
        supabase.from("skus").select(`
          *,
          suppliers(*),
          sku_functions(category_id)
        `),
        supabase.from("function_categories").select("*"),
        supabase.from("common_ingredients").select("*"),
      ]);
      if (e1 || e2 || e3) throw new Error((e1 || e2 || e3).message);

      setCategories(catData);
      setCommonIngredients(commonData);
      const suppMap = {};
      skuData.forEach(s => { if (s.suppliers) suppMap[s.suppliers.id] = s.suppliers; });
      setSuppliers(Object.values(suppMap));

      setData(skuData.map(sku => ({
        ...sku,
        supplier_name: sku.suppliers?.supplier_name || "—",
        contact_email: sku.suppliers?.contact_email || "",
        is_account_opened: sku.suppliers?.is_account_opened || "",
        agreement_signed: sku.suppliers?.agreement_signed || "",
        category_ids: (sku.sku_functions || []).map(f => f.category_id),
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
        const haystack = [r.ingredient_name, r.ingredient, r.region, r.supplier_name, r.notes, catNames]
          .filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (selCatIds.length > 0 && !selCatIds.every(cid => r.category_ids?.includes(cid))) return false;
      if (selRegion && r.region !== selRegion) return false;
      if (selNPN === "yes" && !r.can_apply_npn) return false;
      if (selNPN === "no" && r.can_apply_npn) return false;
      return true;
    });
  }, [data, search, selCatIds, selRegion, selNPN, categories]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const va = String(a[sortCol] || "");
      const vb = String(b[sortCol] || "");
      return sortDir === "asc" ? va.localeCompare(vb, "zh") : vb.localeCompare(va, "zh");
    });
  }, [filtered, sortCol, sortDir]);

  const handleSave = async (skuId, formData, catIds) => {
    const skuUpdate = {};
    SKU_FIELDS.forEach(({ key }) => { skuUpdate[key] = formData[key] || null; });
    skuUpdate.supplier_id = formData.supplier_id || null;
    await supabase.from("skus").update(skuUpdate).eq("id", skuId);
    await supabase.from("sku_functions").delete().eq("sku_id", skuId);
    if (catIds.length > 0) await supabase.from("sku_functions").insert(catIds.map(cid => ({ sku_id: skuId, category_id: cid })));
    await loadData();
  };

  const handleAdd = async (formData, catIds) => {
    const skuInsert = {};
    SKU_FIELDS.forEach(({ key }) => { skuInsert[key] = formData[key] || null; });
    skuInsert.supplier_id = formData.supplier_id ? parseInt(formData.supplier_id) : null;
    const { data: newSku } = await supabase.from("skus").insert(skuInsert).select().single();
    if (catIds.length > 0) await supabase.from("sku_functions").insert(catIds.map(cid => ({ sku_id: newSku.id, category_id: cid })));
    await loadData();
  };

  const handleDeleteSku = async (skuId) => {
    await supabase.from("skus").delete().eq("id", skuId);
    setDetail(null);
    await loadData();
  };

  const handleAddCategory = async (catData) => { await supabase.from("function_categories").insert(catData); await loadData(); };
  const handleUpdateCategory = async (catId, catData) => { await supabase.from("function_categories").update(catData).eq("id", catId); await loadData(); };
  const handleDeleteCategory = async (catId) => {
    await supabase.from("sku_functions").delete().eq("category_id", catId);
    await supabase.from("function_categories").delete().eq("id", catId);
    await loadData();
  };

  const handleAddSupplier = async (d) => { await supabase.from("suppliers").insert(d); await loadData(); };
  const handleUpdateSupplier = async (id, d) => { await supabase.from("suppliers").update(d).eq("id", id); await loadData(); };
  const handleDeleteSupplier = async (id) => {
    const skusOfSupplier = data.filter(s => s.supplier_id === id);
    for (const sku of skusOfSupplier) {
      await supabase.from("sku_functions").delete().eq("sku_id", sku.id);
      await supabase.from("skus").delete().eq("id", sku.id);
    }
    await supabase.from("suppliers").delete().eq("id", id);
    await loadData();
  };

  const toggleCat = (catId) => setSelCatIds(p => p.includes(catId) ? p.filter(c => c !== catId) : [...p, catId]);
  const handleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const clearAll = () => { setSearch(""); setSelCatIds([]); setSelRegion(""); setSelNPN(""); };
  const getCatDisplay = (cat) => lang === "en" ? (cat.name_en || cat.name_zh) : cat.name_zh;
  const getCatSub = (cat) => lang === "zh" ? cat.name_en : (lang === "en" ? cat.name_zh : null);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#1e293b", fontFamily: "system-ui, sans-serif" }}>
      {/* 筛选栏 */}
      <div style={{ padding: "12px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索成分、供应商..."
          style={{ flex: 1, minWidth: 200, padding: "7px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 7, background: "#f8fafc", color: "#0f172a", outline: "none" }} />
        <select value={selRegion} onChange={e => setSelRegion(e.target.value)}
          style={{ padding: "7px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 7, background: "#f8fafc", color: "#475569" }}>
          <option value="">全部地区</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={selNPN} onChange={e => setSelNPN(e.target.value)}
          style={{ padding: "7px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 7, background: "#f8fafc", color: "#475569" }}>
          <option value="">NPN 全部</option>
          <option value="yes">可申请</option>
          <option value="no">不可申请</option>
        </select>
        {(search || selCatIds.length > 0 || selRegion || selNPN) && (
          <button onClick={clearAll} style={{ ...hdrBtn, color: "#ef4444", borderColor: "#fca5a5" }}>✕ 清除</button>
        )}
        <button onClick={() => setShowAdd(true)} style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 7, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>+ 新增</button>
        <button onClick={() => setShowManageSupplier(true)} style={hdrBtn}>供应商</button>
        <button onClick={() => setShowManageCat(true)} style={hdrBtn}>管理分类</button>
      </div>

      {/* 分类标签 */}
      <div style={{ padding: "8px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#64748b", marginRight: 4 }}>功能：</span>
        {categories.map(cat => {
          const active = selCatIds.includes(cat.id);
          return (
            <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{
              padding: "3px 10px", fontSize: 11, borderRadius: 9999, cursor: "pointer",
              border: `1px solid ${active ? cat.color || "#3b82f6" : "#e2e8f0"}`,
              background: active ? (cat.color || "#3b82f6") + "22" : "transparent",
              color: active ? cat.color || "#3b82f6" : "#64748b",
            }}>
              {getCatDisplay(cat)}
            </button>
          );
        })}
        <button onClick={() => setShowAddCat(true)} style={{ ...hdrBtn, fontSize: 11, padding: "3px 8px" }}>+ 新分类</button>
      </div>

      <div style={{ padding: "8px 20px", fontSize: 12, color: "#64748b" }}>
        显示 <strong style={{ color: "#0f172a" }}>{sorted.length}</strong> / {data.length} 条
      </div>

      {error && <div style={{ padding: 20, color: "#f87171" }}>错误：{error}</div>}

      {loading ? <Loading /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                {TABLE_COLS.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} style={{
                    padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600,
                    color: sortCol === col.key ? "#3b82f6" : "#64748b",
                    textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer", whiteSpace: "nowrap",
                    width: col.key === "ingredient_name" ? openedColW : undefined,
                  }}>
                    {col.label} {sortCol === col.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id} onClick={() => setDetail(r)} style={{
                  borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                  background: i % 2 === 0 ? "#fff" : "#f8fafc",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f8fafc"}>
                  {TABLE_COLS.map(col => (
                    <td key={col.key} style={{
                      padding: "7px 12px", color: col.key === "ingredient_name" ? "#0f172a" : "#64748b",
                      fontWeight: col.key === "ingredient_name" ? 500 : 400,
                      maxWidth: col.key === "ingredient_name" ? "none" : (col.key === "functions" ? 300 : 200),
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

      <div style={{ position: "fixed", top: 16, right: 28, display: "flex", gap: 8, zIndex: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => setFontSize(s => Math.max(10, s - 1))} style={hdrBtn}>-</button>
          <span style={{ color: "#64748b", fontSize: 11, minWidth: 20, textAlign: "center" }}>{fontSize}</span>
          <button onClick={() => setFontSize(s => Math.min(20, s + 1))} style={hdrBtn}>+</button>
        </div>
        <button onClick={() => setLang(l => l === "zh" ? "en" : "zh")} style={hdrBtn}>{lang === "zh" ? "EN" : "中文"}</button>
        <button onClick={() => setExpanded(e => !e)} style={hdrBtn}>{expanded ? "折叠" : "展开"}</button>
      </div>
    </div>
  );
}