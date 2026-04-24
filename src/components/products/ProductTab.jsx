import { useState, useMemo, useEffect } from "react";
import supabase from "../../lib/supabase";
import Loading from "../ui/Loading";
import StatusBadge from "../ui/StatusBadge";
import ProductForm from "./ProductForm";
import ImportNPN from "./ImportNPN";
import { exportProductsExcel, exportProductsPDFTable, exportProductsPDFCatalog } from "../../lib/productExport";

// 用 is_default 找显示名，去掉 hardcode 的 Zentra/Zensta
function getDisplayName(product) {
  const def = product.product_brands?.find(pb => pb.is_default);
  if (def) return def.brand_name || product.product_name_zh || "—";
  if (product.product_brands?.length) return product.product_brands[0].brand_name || product.product_name_zh || "—";
  return product.product_name_zh || "—";
}

const selStyle = { padding: "9px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" };

export default function ProductTab({ skus }) {
  const [products, setProducts] = useState([]);
  const [excipients, setExcipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formProduct, setFormProduct] = useState(undefined);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLicensing, setFilterLicensing] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // 两个请求替代原来七个，Supabase 自动 JOIN
      const [{ data: prods, error: e1 }, { data: excs, error: e2 }] = await Promise.all([
        supabase.from("products").select(`
          *,
          product_brands(*),
          product_medicinal_ingredients(*, common_ingredients(id, scientific_name, name_en, name_fr)),
          product_excipients(*, excipients(id, name)),
          product_labels(product_name_zh, recommended_use, caution, dose_population, dose_min_age)
        `),
        supabase.from("excipients").select("*"),
      ]);
      if (e1 || e2) throw new Error((e1 || e2).message);

      // 数据结构整理，和之前保持一致让 ProductForm 不用改
      setProducts(prods.map(p => {
        const labelData = p.product_labels?.[0] || {};
        return {
          ...p,
          product_name_zh:  labelData.product_name_zh  ?? null,
          recommended_use:  labelData.recommended_use  ?? null,
          caution:          labelData.caution           ?? null,
          dose_population:  labelData.dose_population  ?? null,
          dose_min_age:     labelData.dose_min_age      ?? null,
          productBrands: p.product_brands || [],
          medicinal: (p.product_medicinal_ingredients || []).map(pmi => ({
            id: pmi.id,
            common_name: pmi.common_ingredients?.scientific_name || "—",
            common_ingredient_id: pmi.common_ingredient_id,
            name_en: pmi.common_ingredients?.name_en || "",
            name_fr: pmi.common_ingredients?.name_fr || "",
            amount_value: pmi.amount_value,
            amount_unit: pmi.amount_unit,
            sku_id: pmi.sku_id,
            extract_ratio: pmi.extract_ratio || "",
            extract_type: pmi.extract_type || "",
            dried_herb_equivalent: pmi.dried_herb_equivalent,
            dhe_unit: pmi.dhe_unit || "",
            potency_amount: pmi.potency_amount,
            potency_label: pmi.potency_label || "",
            source_material: pmi.source_material || "",
            source_part: pmi.source_part || "",
            sort_order: pmi.sort_order ?? 0,
          })),
          excipients: (p.product_excipients || []).map(pe => ({
            id: pe.id,
            excipient_id: pe.excipient_id,
            name: pe.excipients?.name || "—",
          })),
        };
      }));
      setExcipients(excs);
    } catch (e) { alert("加载失败: " + e.message); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      if (q) {
        const names = [p.product_name_zh, ...(p.product_brands || []).map(pb => pb.brand_name)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!names.includes(q)) return false;
      }
      if (filterLicensing && p.licensing_status !== filterLicensing) return false;
      return true;
    });
  }, [products, search, filterLicensing]);

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
    setSelected(prev => prev.size === ids.length ? new Set() : new Set(ids));
  };

  const handleExport = async (fn) => {
    if (selected.size === 0) return;
    setExporting(true);
    try { await fn([...selected]); }
    catch (e) { alert("导出失败: " + e.message); }
    setExporting(false);
  };

  const handleSave = async (productId, formData, medicinal, excipientsList, defaultBrandId, imagePath, brandsList) => {
    const payload = {
      npn:                 formData.npn ? parseInt(formData.npn) : null,
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
      image_path:          imagePath || null,
    };

    let pid = productId;
    if (productId) {
      const { error } = await supabase.from("products").update({ ...payload }).eq("id", productId);
      if (error) throw new Error("保存产品失败: " + error.message);
    } else {
      const { data: newP, error } = await supabase.from("products").insert(payload).select().single();
      if (error) throw new Error("创建产品失败: " + error.message);
      pid = newP.id;
    }

    const { data: existingLabels } = await supabase.from("product_labels").select("id").eq("product_id", pid);
    const existingLabel = existingLabels?.[0] || null;
    // 清理重复的 label 行
    if (existingLabels?.length > 1) {
      const dupeIds = existingLabels.slice(1).map(l => l.id);
      await supabase.from("product_labels").delete().in("id", dupeIds);
    }
    const labelPayload = {
      product_name_zh: formData.product_name_zh || null,
      recommended_use: formData.recommended_use || null,
      caution:         formData.caution         || null,
      dose_population: formData.dose_population || null,
      dose_min_age:    formData.dose_min_age !== "" ? parseInt(formData.dose_min_age) : null,
    };
    if (existingLabel) {
      const { error: lErr } = await supabase.from("product_labels").update(labelPayload).eq("id", existingLabel.id);
      if (lErr) throw new Error("更新标签失败: " + lErr.message);
    } else {
      const { error: lErr } = await supabase.from("product_labels").insert({ product_id: pid, ...labelPayload });
      if (lErr) throw new Error("创建标签失败: " + lErr.message);
    }

    // 品牌：全删再重插
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

    // Medicinal ingredients: 全删再重插
    await supabase.from("product_medicinal_ingredients").delete().eq("product_id", pid);
    // 新增的 common_ingredients 需要先逐条插入拿到 id，已有的直接用
    const newMedicinal = medicinal.filter(m => m.isNew);
    const { data: commonCache } = newMedicinal.length > 0
      ? await supabase.from("common_ingredients").select("*")
      : { data: [] };
    const resolvedMedicinal = [];
    for (const m of medicinal) {
      let commonId = m.common_ingredient_id;
      if (m.isNew) {
        let common = commonCache.find(c => c.scientific_name.toLowerCase() === m.common_name.toLowerCase());
        if (!common) {
          const { data: newC } = await supabase.from("common_ingredients").insert({ scientific_name: m.common_name }).select().single();
          common = newC;
          commonCache.push(common);
        }
        commonId = common.id;
      }
      if (commonId) resolvedMedicinal.push({ m, commonId });
    }
    if (resolvedMedicinal.length > 0) {
      const { error: pmiErr } = await supabase.from("product_medicinal_ingredients").insert(
        resolvedMedicinal.map(({ m, commonId }) => ({
          product_id: pid, common_ingredient_id: commonId, sku_id: m.sku_id || null,
          amount_value: m.amount_value ? parseFloat(m.amount_value) : null,
          amount_unit: m.amount_unit || null,
          extract_ratio: m.extract_ratio || null,
          extract_type: m.extract_type || null,
          dried_herb_equivalent: m.dried_herb_equivalent ? parseFloat(m.dried_herb_equivalent) : null,
          dhe_unit: m.dhe_unit || null,
          potency_amount: m.potency_amount ? parseFloat(m.potency_amount) : null,
          potency_label: m.potency_label || null,
          source_material: m.source_material || null,
          source_part: m.source_part || null,
          sort_order: m.sort_order ?? 0,
        }))
      );
      if (pmiErr) throw new Error("保存成分失败: " + pmiErr.message);
    }
    // 批量更新 name_en / name_fr（只更新有变化的）
    for (const { m, commonId } of resolvedMedicinal) {
      if (m.name_en !== undefined || m.name_fr !== undefined) {
        await supabase.from("common_ingredients").update({ name_en: m.name_en || null, name_fr: m.name_fr || null }).eq("id", commonId);
      }
    }

    // Excipients: 全删再重插，确保删除的行也写回 DB
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
    if (prod?.image_path) {
      await supabase.storage.from("product-images").remove([prod.image_path]);
    }
    await supabase.from("product_brands").delete().eq("product_id", id);
    await supabase.from("product_medicinal_ingredients").delete().eq("product_id", id);
    await supabase.from("product_excipients").delete().eq("product_id", id);
    await supabase.from("product_labels").delete().eq("product_id", id);
    await supabase.from("products").delete().eq("id", id);
    setFormProduct(undefined);
    await loadData();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ padding: "16px 28px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索产品名称..."
          style={{ flex: 1, minWidth: 200, padding: "9px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", outline: "none" }} />
        <select value={filterLicensing} onChange={e => setFilterLicensing(e.target.value)} style={selStyle}>
          <option value="">全部状态</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="not_started">未申请</option>
          <option value="expired">Expired</option>
        </select>
        <button onClick={() => setShowImport(true)}
          className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
          从 Health Canada 导入
        </button>
        <button onClick={() => setFormProduct(null)}
          style={{ padding: "9px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>
          + 新增产品
        </button>
      </div>

      <div style={{ padding: "12px 28px", fontSize: 13, color: "#64748b" }}>
        共 <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> 个产品
      </div>

      {loading ? <Loading /> : (
        <div style={{ padding: `0 28px ${selected.size > 0 ? "80px" : "40px"}`, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map(p => {
            const displayName = getDisplayName(p);
            const isSelected = selected.has(p.id);
            return (
              <div key={p.id} onClick={() => setFormProduct(p)} style={{
                background: "#fff", borderRadius: 10, padding: 16, cursor: "pointer",
                border: isSelected ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                boxShadow: isSelected ? "0 0 0 3px rgba(59,130,246,0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
                position: "relative",
              }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
                <input type="checkbox" checked={isSelected} onChange={() => {}}
                  onClick={e => toggleSelect(p.id, e)}
                  style={{ position: "absolute", top: 10, right: 10, width: 16, height: 16, cursor: "pointer", accentColor: "#3b82f6" }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2, lineHeight: 1.3, paddingRight: 24 }}>{displayName}</div>
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

      {/* Export toolbar */}
      {selected.size > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900,
          background: "#0f172a", padding: "12px 28px",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        }}>
          <span style={{ fontSize: 13, color: "#f8fafc", fontWeight: 500 }}>
            已选 <strong>{selected.size}</strong> 个产品
          </span>
          <button onClick={toggleSelectAll}
            style={{ padding: "5px 12px", fontSize: 12, border: "1px solid #475569", borderRadius: 6, background: "transparent", color: "#94a3b8", cursor: "pointer" }}>
            {selected.size === filtered.length ? "取消全选" : "全选"}
          </button>
          <div style={{ flex: 1 }} />
          <button disabled={exporting} onClick={() => handleExport(exportProductsExcel)}
            style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, background: "#22c55e", color: "#fff", cursor: exporting ? "wait" : "pointer" }}>
            {exporting ? "导出中..." : "导出 Excel"}
          </button>
          <button disabled={exporting} onClick={() => handleExport(exportProductsPDFTable)}
            style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, background: "#3b82f6", color: "#fff", cursor: exporting ? "wait" : "pointer" }}>
            PDF 表格
          </button>
          <button disabled={exporting} onClick={() => handleExport(exportProductsPDFCatalog)}
            style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, background: "#8b5cf6", color: "#fff", cursor: exporting ? "wait" : "pointer" }}>
            PDF 目录
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ padding: "5px 10px", fontSize: 18, border: "none", background: "transparent", color: "#64748b", cursor: "pointer", lineHeight: 1 }}>
            x
          </button>
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