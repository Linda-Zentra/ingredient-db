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

const hdrBtn = { padding: "6px 12px", fontSize: 12, fontWeight: 500, border: "1px solid #334155", borderRadius: 7, background: "transparent", color: "#94a3b8", cursor: "pointer" };

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
      const [suppData, skuData, funcData, catData, commonData] = await Promise.all([
        supabase.from("suppliers").select("*"),
        supabase.from("skus").select("*"),
        supabase.from("sku_functions").select("*"),
        supabase.from("function_categories").select("*"),
        supabase.from("common_ingredients").select("*"),
      ]);
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

  // ---- handlers ----
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

      {/* Modals */}
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

      {/* 右上角工具栏 */}
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
