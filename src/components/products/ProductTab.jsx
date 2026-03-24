import { useState, useMemo, useEffect } from "react";
import supabase from "../../lib/supabase";
import Loading from "../ui/Loading";
import StatusBadge from "../ui/StatusBadge";
import ProductForm from "./ProductForm";
import ImportNPN from "./ImportNPN";

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
        const names = [p.product_name, p.product_name_zh, ...(p.product_brands || []).map(pb => pb.brand_name)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!names.includes(q)) return false;
      }
      if (filterLicensing && p.licensing_status !== filterLicensing) return false;
      return true;
    });
  }, [products, search, filterLicensing]);

  const handleSave = async (productId, formData, medicinal, excipientsList, defaultBrandId) => {
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
    };

    let pid = productId;
    if (productId) {
      await supabase.from("products").update({ ...payload }).eq("id", productId);
    } else {
      const { data: newP } = await supabase.from("products").insert(payload).select().single();
      pid = newP.id;
    }

    // 迁移到 product_labels 的字段（先查再插/更新，因为 product_id 无 UNIQUE 约束）
    const { data: existingLabel } = await supabase.from("product_labels").select("id").eq("product_id", pid).maybeSingle();
    const labelPayload = {
      product_name_zh: formData.product_name_zh || null,
      recommended_use: formData.recommended_use || null,
      caution:         formData.caution         || null,
      dose_population: formData.dose_population || null,
      dose_min_age:    formData.dose_min_age !== "" ? parseInt(formData.dose_min_age) : null,
    };
    if (existingLabel) {
      await supabase.from("product_labels").update(labelPayload).eq("id", existingLabel.id);
    } else {
      await supabase.from("product_labels").insert({ product_id: pid, ...labelPayload });
    }

    // 更新 is_default：先全设 false，再把选中的设 true
    if (pid && defaultBrandId) {
      await supabase.from("product_brands").update({ is_default: false }).eq("product_id", pid);
      await supabase.from("product_brands").update({ is_default: true }).eq("id", defaultBrandId);
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
    // 批量插入 product_medicinal_ingredients
    if (resolvedMedicinal.length > 0) {
      await supabase.from("product_medicinal_ingredients").insert(
        resolvedMedicinal.map(({ m, commonId }) => ({
          product_id: pid, common_ingredient_id: commonId, sku_id: m.sku_id || null,
          amount_value: m.amount_value ? parseFloat(m.amount_value) : null,
          amount_unit: m.amount_unit || null,
        }))
      );
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
        try {
          await supabase.from("product_excipients").insert({ product_id: pid, excipient_id: excipientId });
        } catch (_) {}
      }
    }

    await loadData();
  };

  const handleDelete = async (id) => {
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
        <div style={{ padding: "0 28px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map(p => {
            const displayName = getDisplayName(p);
            return (
              <div key={p.id} onClick={() => setFormProduct(p)} style={{
                background: "#fff", borderRadius: 10, padding: 16, cursor: "pointer",
                border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2, lineHeight: 1.3 }}>{displayName}</div>
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