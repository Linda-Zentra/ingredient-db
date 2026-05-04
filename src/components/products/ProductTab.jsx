import { useState, useMemo, useEffect } from "react";
import supabase from "../../lib/supabase";
import Loading from "../ui/Loading";
import StatusBadge from "../ui/StatusBadge";
import ProductForm from "./ProductForm";
import ImportNPN from "./ImportNPN";
import { exportProductsExcel, exportProductsPDFTable, exportProductsPDFCatalog } from "../../lib/productExport";

function getDisplayName(product) {
  const def = product.product_brands?.find(pb => pb.is_default);
  if (def) return def.brand_name || product.product_name_zh || "—";
  if (product.product_brands?.length) return product.product_brands[0].brand_name || product.product_name_zh || "—";
  return product.product_name_zh || product.product_name || "—";
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
          dried_herb_equivalent: pi.dried_herb_equivalent,
          dhe_unit: pi.dhe_unit || "",
          potency_amount: pi.potency_amount,
          potency_label: pi.potency_label || "",
          source_material: pi.source_material || "",
          source_part: pi.source_part || "",
          sort_order: pi.sort_order ?? 0,
        })),
        excipients: (p.product_excipients || []).map(pe => ({
          id: pe.id,
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      if (q) {
        const names = [p.product_name_zh, p.product_name, ...(p.product_brands || []).map(pb => pb.brand_name)]
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
          dried_herb_equivalent: m.dried_herb_equivalent ? parseFloat(m.dried_herb_equivalent) : null,
          dhe_unit: m.dhe_unit || null,
          potency_amount: m.potency_amount ? parseFloat(m.potency_amount) : null,
          potency_label: m.potency_label || null,
          source_material: m.source_material || null,
          source_part: m.source_part || null,
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
