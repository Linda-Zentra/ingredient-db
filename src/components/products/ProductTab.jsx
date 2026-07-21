import { useState, useMemo, useEffect } from "react";
import supabase from "../../lib/supabase";
import Loading from "../ui/Loading";
import StatusBadge from "../ui/StatusBadge";
import ProductForm from "./ProductForm";
import ImportNPN from "./ImportNPN";
import { exportProductsExcel, exportProductsPDFTable, exportProductsPDFCatalog } from "../../lib/productExport";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getDisplayName(product) {
  const def = product.product_brands?.find(pb => pb.is_default);
  if (def) return def.brand_name || product.product_name_zh || "—";
  if (product.product_brands?.length) return product.product_brands[0].brand_name || product.product_name_zh || "—";
  return product.product_name_zh || product.product_name || "—";
}

function getThumbUrl(product) {
  const img = product.images?.[0];
  return img?.url ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${img.url}` : null;
}

function getDosageLabel(p) {
  const t = p.dosage_form_type || "";
  const s = p.dosage_form_subtype || "";
  if (t && s) return `${t}, ${s}`;
  return t || "—";
}

const selStyle = { padding: "7px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" };

export default function ProductTab({ skus }) {
  const [products, setProducts] = useState([]);
  const [excipients, setExcipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formProduct, setFormProduct] = useState(undefined);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLicensing, setFilterLicensing] = useState("");
  const [filterDosage, setFilterDosage] = useState("");
  const [filterMarketed, setFilterMarketed] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [sortCol, setSortCol] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: prods, error: e1 }, { data: excs, error: e2 }] = await Promise.all([
        supabase.from("products").select(`
          *,
          product_brands(*),
          product_ingredients(*, ingredients(id, scientific_name, name_en, name_fr, common_names_en)),
          product_excipients(*, excipients(id, name)),
          product_images(image_id, images(id, url, filename, type, sort_order))
        `),
        supabase.from("excipients").select("*"),
      ]);
      if (e1 || e2) throw new Error((e1 || e2).message);

      setProducts(prods.map(p => ({
        ...p,
        productBrands: p.product_brands || [],
        medicinal: (p.product_ingredients || []).map(pi => ({
          id: pi.id,
          ingredient_name: pi.ingredients?.common_names_en?.[0] || pi.ingredients?.name_en || pi.ingredients?.scientific_name || "—",
          ingredient_id: pi.ingredient_id,
          name_en: pi.ingredients?.name_en || "",
          name_fr: pi.ingredients?.name_fr || "",
          amount_value: pi.amount_value,
          amount_unit: pi.amount_unit,
          sku_id: pi.sku_id,
          extract_ratio: pi.extract_ratio || "",
          extract_type: pi.extract_type || "",
          extract_type_fr: pi.extract_type_fr || "",
          dried_herb_equivalent: pi.dried_herb_equivalent,
          dhe_unit: pi.dhe_unit || "",
          potency_amount: pi.potency_amount,
          potency_label: pi.potency_label || "",
          source_material: pi.source_material || "",
          source_part: pi.source_part || "",
          source_material_fr: pi.source_material_fr || "",
          source_part_fr: pi.source_part_fr || "",
          sort_order: pi.sort_order ?? 0,
        })),
        excipients: (p.product_excipients || []).map(pe => ({
          id: pe.excipient_id,
          excipient_id: pe.excipient_id,
          name: pe.excipients?.name || "—",
        })),
        images: (p.product_images || [])
          .map(pi => pi.images)
          .filter(Boolean)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      })));
      setExcipients(excs);
    } catch (e) { alert("加载失败: " + e.message); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const dosageOptions = useMemo(() => {
    const set = new Set(products.map(p => p.dosage_form_type).filter(Boolean));
    return [...set].sort();
  }, [products]);

  const BRAND_LINES = ["Zentra", "Zensta"];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = products.filter(p => {
      if (q) {
        const names = [p.product_name_zh, p.product_name, p.npn, ...(p.product_brands || []).map(pb => pb.brand_name)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!names.includes(q)) return false;
      }
      if (filterLicensing && p.licensing_status !== filterLicensing) return false;
      if (filterDosage && p.dosage_form_type !== filterDosage) return false;
      if (filterMarketed === "yes" && !p.is_marketed) return false;
      if (filterMarketed === "no" && p.is_marketed) return false;
      if (filterBrand) {
        const lines = p.brand_lines || [];
        if (filterBrand === "Other" ? lines.length > 0 : !lines.includes(filterBrand)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      let va, vb;
      switch (sortCol) {
        case "name": va = getDisplayName(a); vb = getDisplayName(b); break;
        case "npn": va = a.npn || ""; vb = b.npn || ""; break;
        case "dosage": va = a.dosage_form_type || ""; vb = b.dosage_form_type || ""; break;
        case "status": va = a.licensing_status || ""; vb = b.licensing_status || ""; break;
        case "ingredients": return sortAsc ? (a.medicinal?.length || 0) - (b.medicinal?.length || 0) : (b.medicinal?.length || 0) - (a.medicinal?.length || 0);
        default: va = ""; vb = "";
      }
      const cmp = String(va).localeCompare(String(vb), "zh");
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [products, search, filterLicensing, filterDosage, filterMarketed, filterBrand, sortCol, sortAsc]);

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const ids = filtered.map(p => p.id);
    setSelected(prev => {
      const next = new Set(prev);
      const allVisibleSelected = ids.length > 0 && ids.every(id => next.has(id));
      ids.forEach(id => allVisibleSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const handleExport = async (fn) => {
    if (selected.size === 0) return;
    setExporting(true);
    try { await fn([...selected]); }
    catch (e) { alert("导出失败: " + e.message); }
    setExporting(false);
  };

  const handleSave = async (productId, formData, medicinal, excipientsList, defaultBrandId, _imagePath, brandsList) => {
    const payload = {
      npn:                 formData.npn || null,
      licensing_status:    formData.licensing_status,
      is_marketed:         formData.is_marketed,
      dosage_form_type:    formData.dosage_form_type    || null,
      dosage_form_subtype: formData.dosage_form_subtype || null,
      dose_amount:         formData.dose_amount     !== "" ? parseFloat(formData.dose_amount)    : null,
      dose_amount_max:     formData.dose_amount_max !== "" ? parseFloat(formData.dose_amount_max) : null,
      dose_unit:           formData.dose_unit           || null,
      dose_freq_min:       formData.dose_freq_min   !== "" ? parseInt(formData.dose_freq_min)    : null,
      dose_freq_max:       formData.dose_freq_max   !== "" ? parseInt(formData.dose_freq_max)    : null,
      dose_freq_unit:      formData.dose_freq_unit      || null,
      price_cad:           formData.price_cad  !== "" ? parseFloat(formData.price_cad)  : null,
      price_usd:           formData.price_usd  !== "" ? parseFloat(formData.price_usd)  : null,
      notes:               formData.notes               || null,
      product_name_zh:     formData.product_name_zh     || null,
      recommended_use:     formData.recommended_use     || null,
      dose_population:     formData.dose_population     || null,
      dose_min_age:        formData.dose_min_age !== "" ? parseInt(formData.dose_min_age) : null,
      brand_lines:         formData.brand_lines || [],
    };

    let pid = productId;
    if (productId) {
      const { error } = await supabase.from("products").update(payload).eq("id", productId);
      if (error) throw new Error("保存产品失败: " + error.message);
    } else {
      const { data: newP, error } = await supabase.from("products").insert(payload).select().single();
      if (error) throw new Error("创建产品失败: " + error.message);
      pid = newP.id;
    }

    // Brands: delete + reinsert
    await supabase.from("product_brands").delete().eq("product_id", pid);
    if (brandsList?.length > 0) {
      const { error: brErr } = await supabase.from("product_brands").insert(
        brandsList.map(b => ({
          product_id: pid,
          brand_name: b.brand_name,
          is_default: b.id === defaultBrandId,
        }))
      );
      if (brErr) console.warn("品牌保存失败:", brErr.message);
    }

    // Medicinal ingredients: delete + reinsert
    await supabase.from("product_ingredients").delete().eq("product_id", pid);
    const resolvedMedicinal = [];
    for (const m of medicinal) {
      let ingId = m.ingredient_id;
      if (m.isNew) {
        const { data: existing } = await supabase
          .from("ingredients")
          .select("id")
          .eq("scientific_name", m.ingredient_name)
          .maybeSingle();
        if (existing) {
          ingId = existing.id;
        } else {
          const { data: newIng } = await supabase
            .from("ingredients")
            .insert({ scientific_name: m.ingredient_name, name_en: m.ingredient_name })
            .select("id")
            .single();
          ingId = newIng?.id;
        }
      }
      if (ingId) resolvedMedicinal.push({ m, ingId });
    }
    if (resolvedMedicinal.length > 0) {
      const { error: piErr } = await supabase.from("product_ingredients").insert(
        resolvedMedicinal.map(({ m, ingId }) => ({
          product_id: pid, ingredient_id: ingId, sku_id: m.sku_id || null,
          amount_value: m.amount_value ? parseFloat(m.amount_value) : null,
          amount_unit: m.amount_unit || null,
          extract_ratio: m.extract_ratio || null,
          extract_type: m.extract_type || null,
          extract_type_fr: m.extract_type_fr || null,
          dried_herb_equivalent: m.dried_herb_equivalent ? parseFloat(m.dried_herb_equivalent) : null,
          dhe_unit: m.dhe_unit || null,
          potency_amount: m.potency_amount ? parseFloat(m.potency_amount) : null,
          potency_label: m.potency_label || null,
          source_material: m.source_material || null,
          source_part: m.source_part || null,
          source_material_fr: m.source_material_fr || null,
          source_part_fr: m.source_part_fr || null,
          sort_order: m.sort_order ?? 0,
        }))
      );
      if (piErr) throw new Error("保存成分失败: " + piErr.message);
    }
    // Update name_en / name_fr on ingredients if changed
    for (const { m, ingId } of resolvedMedicinal) {
      if (m.name_en !== undefined || m.name_fr !== undefined) {
        await supabase.from("ingredients").update({ name_en: m.name_en || null, name_fr: m.name_fr || null }).eq("id", ingId);
      }
    }

    // Excipients: delete + reinsert
    await supabase.from("product_excipients").delete().eq("product_id", pid);
    for (const ex of excipientsList) {
      let excipientId = ex.excipient_id;
      if (ex.isNew && !excipientId) {
        let exc = excipients.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
        if (!exc) {
          const { data: newExc } = await supabase.from("excipients").insert({ name: ex.name }).select().single();
          exc = newExc;
        }
        excipientId = exc.id;
      }
      if (excipientId) {
        const { error: peErr } = await supabase.from("product_excipients").insert({ product_id: pid, excipient_id: excipientId });
        if (peErr) console.warn("辅料关联失败:", ex.name, peErr.message);
      }
    }

    await loadData();
  };

  const handleDelete = async (id) => {
    const prod = products.find(p => p.id === id);
    if (prod?.images?.length) {
      await supabase.storage.from("product-images").remove(prod.images.map(i => i.url));
      const imgIds = prod.images.map(i => i.id);
      await supabase.from("product_images").delete().eq("product_id", id);
      await supabase.from("images").delete().in("id", imgIds);
    }
    await supabase.from("products").delete().eq("id", id);
    setFormProduct(undefined);
    await loadData();
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
  };

  const thStyle = (col) => ({
    padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#475569", textAlign: "left",
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", letterSpacing: 0.3,
    background: sortCol === col ? "#f1f5f9" : "transparent",
  });
  const arrow = (col) => sortCol === col ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Filter bar */}
      <div style={{ padding: "12px 28px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索名称 / NPN..."
          style={{ flex: 1, minWidth: 180, padding: "7px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", outline: "none" }} />
        <select value={filterLicensing} onChange={e => setFilterLicensing(e.target.value)} style={selStyle}>
          <option value="">全部状态</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="not_started">未申请</option>
          <option value="expired">Expired</option>
        </select>
        <select value={filterDosage} onChange={e => setFilterDosage(e.target.value)} style={selStyle}>
          <option value="">全部剂型</option>
          {dosageOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} style={selStyle}>
          <option value="">全部品牌</option>
          {BRAND_LINES.map(b => <option key={b} value={b}>{b}</option>)}
          <option value="Other">Other</option>
        </select>
        <select value={filterMarketed} onChange={e => setFilterMarketed(e.target.value)} style={selStyle}>
          <option value="">上市状态</option>
          <option value="yes">已上市</option>
          <option value="no">未上市</option>
        </select>
        <button onClick={() => setShowImport(true)}
          style={{ padding: "7px 14px", fontSize: 13, fontWeight: 500, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", color: "#475569", cursor: "pointer" }}>
          从 HC 导入
        </button>
        <button onClick={() => setFormProduct(null)}
          style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>
          + 新增产品
        </button>
      </div>

      {/* Summary + export bar */}
      <div style={{ padding: "8px 28px", display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#64748b" }}>
        <span>共 <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> 个产品</span>
        {selected.size > 0 && (
          <>
            <span style={{ color: "#3b82f6", fontWeight: 600 }}>已选 {selected.size}</span>
            <button onClick={toggleSelectAll}
              style={{ padding: "3px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", color: "#475569", cursor: "pointer" }}>
              {allFilteredSelected ? "取消全选" : "全选"}
            </button>
            <div style={{ flex: 1 }} />
            <button disabled={exporting} onClick={() => handleExport(exportProductsExcel)}
              style={{ padding: "5px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, background: "#22c55e", color: "#fff", cursor: exporting ? "wait" : "pointer" }}>
              {exporting ? "导出中..." : "Excel"}
            </button>
            <button disabled={exporting} onClick={() => handleExport(exportProductsPDFTable)}
              style={{ padding: "5px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: exporting ? "wait" : "pointer" }}>
              PDF 表格
            </button>
            <button disabled={exporting} onClick={() => handleExport(exportProductsPDFCatalog)}
              style={{ padding: "5px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, background: "#8b5cf6", color: "#fff", cursor: exporting ? "wait" : "pointer" }}>
              PDF 目录
            </button>
            <button onClick={() => setSelected(new Set())}
              style={{ padding: "2px 8px", fontSize: 16, border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>
              x
            </button>
          </>
        )}
      </div>

      {/* Table */}
      {loading ? <Loading /> : (
        <div style={{ padding: `0 28px ${selected.size > 0 ? "20px" : "40px"}`, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "8px 10px", width: 36 }}>
                  <input type="checkbox" checked={allFilteredSelected && filtered.length > 0} onChange={toggleSelectAll}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#3b82f6" }} />
                </th>
                <th style={{ padding: "8px 6px", width: 40 }} />
                <th style={thStyle("name")} onClick={() => handleSort("name")}>产品名称{arrow("name")}</th>
                <th style={thStyle("npn")} onClick={() => handleSort("npn")}>NPN{arrow("npn")}</th>
                <th style={thStyle("dosage")} onClick={() => handleSort("dosage")}>剂型{arrow("dosage")}</th>
                <th style={thStyle("status")} onClick={() => handleSort("status")}>状态{arrow("status")}</th>
                <th style={{ ...thStyle("marketed"), cursor: "default" }}>上市</th>
                <th style={thStyle("ingredients")} onClick={() => handleSort("ingredients")}>成分{arrow("ingredients")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isSelected = selected.has(p.id);
                const thumb = getThumbUrl(p);
                return (
                  <tr key={p.id} onClick={() => setFormProduct(p)}
                    style={{ cursor: "pointer", background: isSelected ? "#eff6ff" : "#fff", borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "#fff"; }}>
                    <td style={{ padding: "6px 10px", borderBottom: "1px solid #f1f5f9" }}>
                      <input type="checkbox" checked={isSelected} onChange={() => {}}
                        onClick={e => toggleSelect(p.id, e)}
                        style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#3b82f6" }} />
                    </td>
                    <td style={{ padding: "4px 6px", borderBottom: "1px solid #f1f5f9" }}>
                      {thumb
                        ? <img src={thumb} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0" }} />
                        : <div style={{ width: 32, height: 32, borderRadius: 4, background: "#f1f5f9", border: "1px solid #e2e8f0" }} />
                      }
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a", borderBottom: "1px solid #f1f5f9", maxWidth: 260 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getDisplayName(p)}</div>
                      {p.product_name_zh && p.product_name_zh !== getDisplayName(p) && (
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{p.product_name_zh}</div>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#64748b", fontFamily: "monospace", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>{p.npn || "—"}</td>
                    <td style={{ padding: "8px 10px", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>{getDosageLabel(p)}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9" }}><StatusBadge type="licensing" value={p.licensing_status} /></td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                      {p.is_marketed && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 9999, background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" }}>已上市</span>}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#64748b", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>{p.medicinal?.length || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>暂无产品</div>}
        </div>
      )}

      {showImport && (
        <ImportNPN onSuccess={() => { loadData(); setShowImport(false); }} onClose={() => setShowImport(false)} />
      )}

      {formProduct !== undefined && (
        <>
          <div onClick={() => setFormProduct(undefined)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 999 }} />
          <ProductForm product={formProduct} skus={skus} allExcipients={excipients}
            onSave={handleSave} onDelete={handleDelete} onClose={() => setFormProduct(undefined)} />
        </>
      )}
    </div>
  );
}
