import { useState, useMemo, useEffect } from "react";
import supabase from "../../lib/supabase";
import Loading from "../ui/Loading";
import StatusBadge from "../ui/StatusBadge";
import ProductForm from "./ProductForm";

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

const selStyle = { padding: "9px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" };

export default function ProductTab({ skus }) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [excipients, setExcipients] = useState([]);
  const [commonIngredients, setCommonIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formProduct, setFormProduct] = useState(undefined);
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
      pmis.forEach(pmi => {
        const common = commons.find(c => c.id === pmi.common_ingredient_id);
        pmi.common_name = common?.name || "—";
        if (!pmiMap[pmi.product_id]) pmiMap[pmi.product_id] = [];
        pmiMap[pmi.product_id].push(pmi);
      });
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

    const newMedicinal = medicinal.filter(m => m.isNew);
    let commonCache = newMedicinal.length > 0 ? await supabase.from("common_ingredients").select("*") : [];
    for (const m of newMedicinal) {
      let common = commonCache.find(c => c.name.toLowerCase() === m.common_name.toLowerCase());
      if (!common) {
        const [newC] = await supabase.from("common_ingredients").insert({ name: m.common_name });
        common = newC;
        commonCache.push(common);
      }
      await supabase.from("product_medicinal_ingredients").insert({
        product_id: pid, common_ingredient_id: common.id, sku_id: m.sku_id || null, amount: m.amount || null,
      });
    }
    const existingMedicinal = medicinal.filter(m => !m.isNew);
    for (const m of existingMedicinal) {
      await supabase.from("product_medicinal_ingredients").update(m.id, { sku_id: m.sku_id || null });
    }
    const newExcipients = excipientsList.filter(e => e.isNew);
    for (const ex of newExcipients) {
      let exc = excipients.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
      if (!exc) {
        const [newExc] = await supabase.from("excipients").insert({ name: ex.name });
        exc = newExc;
      }
      try {
        await supabase.from("product_excipients").insert({ product_id: pid, excipient_id: exc.id });
      } catch (_) {}
    }
    await loadData();
  };

  const handleDelete = async (id) => {
    await supabase.from("product_brands").deleteWhere("product_id", id);
    await supabase.from("product_medicinal_ingredients").deleteWhere("product_id", id);
    await supabase.from("product_excipients").deleteWhere("product_id", id);
    await supabase.from("product_labels").deleteWhere("product_id", id);
    await supabase.from("products").delete(id);
    setFormProduct(undefined);
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
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"}>
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
          <ProductForm product={formProduct} brands={brands} skus={skus} allExcipients={excipients}
            onSave={handleSave} onDelete={handleDelete} onClose={() => setFormProduct(undefined)} />
        </>
      )}
    </div>
  );
}
