import { useState, useEffect, useCallback } from "react";
import supabase from "../../lib/supabase";
import { SECTION_DEFS, DEFAULT_COMPANY, DEFAULT_RISK, DEFAULT_RISK_FR } from "../../constants";
import Loading from "../ui/Loading";
import LabelPreviewV2 from "./LabelPreviewV2";
import LabelList from "./LabelList";
import LabelForm from "./LabelForm";
import { sortMedicinalIngredients } from "../../lib/ingredientFormatters";
import { getProduct, getProdDisplayName, getVal, buildExcipientMaps } from "../../lib/labelData";
import { downloadLabelText } from "../../lib/labelExport";

export default function LabelTab() {
  const [labels, setLabels] = useState([]);
  const [products, setProducts] = useState([]);
  const [excipientMap, setExcipientMap] = useState({});
  const [excipientMapFr, setExcipientMapFr] = useState({});
  const [excipientRowsMap, setExcipientRowsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const resetForm = (label) => {
    if (!label) return;
    const f = {};
    // Label-level display fields
    f.label_type = label.label_type || "single";
    f.subtitle = label.subtitle || "";
    f.company_info = label.company_info || "";
    f.licence_holder = label.licence_holder || "";
    f.risk_info = label.risk_info || DEFAULT_RISK;
    f.risk_info_fr = label.risk_info_fr || DEFAULT_RISK_FR;
    f.side_bar = label.side_bar || "";
    setForm(f);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: lbls, error: e1 }, { data: prods, error: e2 }] = await Promise.all([
        supabase.from("labels").select("*"),
        supabase.from("products").select(`
          *,
          product_brands(*),
          product_excipients(*, excipients(name, name_fr, allergen_types)),
          product_ingredients(*, ingredients(scientific_name, name_en, name_fr, allergen_types), skus(brand_name, authorization_claims, sku_forms(*)))
        `),
      ]);
      if (e1 || e2) throw new Error((e1 || e2).message);
      setLabels(lbls);
      setProducts(prods);
      const maps = buildExcipientMaps(prods);
      setExcipientMap(maps.excipientMap);
      setExcipientMapFr(maps.excipientMapFr);
      setExcipientRowsMap(maps.excipientRowsMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selected) resetForm(selected); }, [selected]);

  const boundGetVal = useCallback(
    (sec, label) => getVal(sec, label, products, excipientMap),
    [products, excipientMap],
  );

  const handleCreate = async (productId) => {
    const payload = {
      product_id: productId,
      company_info: DEFAULT_COMPANY,
      licence_holder: "Nutrizen Station Lab Inc.",
      risk_info: DEFAULT_RISK,
      risk_info_fr: DEFAULT_RISK_FR,
    };
    const { data: newLabel } = await supabase.from("labels").insert(payload).select().single();
    await loadData();
    setSelected(newLabel);
    setEditing(true);
    setShowCreate(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // Save label-level fields (subtitle, company_info, risk_info, etc.)
      const labelPayload = {
        label_type: form.label_type || "single",
        subtitle: form.subtitle || null,
        company_info: form.company_info || null,
        licence_holder: form.licence_holder || null,
        risk_info: form.risk_info || null,
        risk_info_fr: form.risk_info_fr || null,
        side_bar: form.side_bar || null,
        updated_at: new Date().toISOString(),
      };
      const { error: lblErr } = await supabase.from("labels").update(labelPayload).eq("id", selected.id);
      if (lblErr) throw new Error("保存标签失败: " + lblErr.message);

      // Save product-level structured fields (warnings, purposes)
      const prod = getProduct(products, selected);
      if (prod) {
        const prodPayload = {};
        Object.keys(form).forEach(key => {
          if (key.startsWith("_prod_")) {
            prodPayload[key.slice(6)] = form[key];
          }
        });
        if (Object.keys(prodPayload).length > 0) {
          await supabase.from("products").update(prodPayload).eq("id", prod.id);
        }
      }

      await loadData();
      const { data: refreshed } = await supabase.from("labels").select("*").eq("id", selected.id).single();
      setSelected(refreshed || null);
      setEditing(false);
    } catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("确定删除这个标签？")) return;
    await supabase.from("labels").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setEditing(false); }
    await loadData();
  };

  const handleDuplicate = async (label) => {
    const { id, created_at, updated_at, ...rest } = label;
    const { data: newLabel, error } = await supabase.from("labels").insert(rest).select().single();
    if (error) { alert("复制失败: " + error.message); return; }
    await loadData();
    setSelected(newLabel);
    setEditing(false);
    setPreviewMode(false);
  };

  const handleExport = () => {
    if (!selected) return;
    const prod = getProduct(products, selected);
    downloadLabelText(selected, products, excipientMap, excipientMapFr);
  };

  const handleRefresh = async () => {
    const prod = getProduct(products, selected);
    const npnStr = prod?.npn;
    if (!npnStr) return alert("该产品没有有效的 NPN，无法刷新");
    if (!confirm(`确定从 Health Canada 重新导入 NPN ${npnStr} 的数据？`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("import-npn", {
        body: { npns: [npnStr] },
      });
      if (error) throw error;
      await loadData();
      alert("刷新成功！数据已从 Health Canada 更新。");
    } catch (e) {
      alert("刷新失败: " + (e.message || e));
    }
    setSaving(false);
  };

  const handleSelect = (l) => { setSelected(l); setEditing(false); setPreviewMode(false); };

  if (loading) return <Loading />;
  const selProd = selected ? getProduct(products, selected) : null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc", overflow: "hidden" }}>
      <LabelList
        labels={labels}
        products={products}
        selected={selected}
        search={search}
        onSearchChange={setSearch}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onShowCreate={() => setShowCreate(true)}
      />

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
                <button onClick={handleExport} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>导出 TXT</button>
                <button onClick={() => setPreviewMode(false)} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>← 返回</button>
              </div>
            </div>
            <LabelPreviewV2
              label={selected}
              product={selProd}
              productName={getProdDisplayName(selProd)}
              excipients={excipientMap[selected.product_id] || ""}
              excipientRows={excipientRowsMap[selected.product_id] || []}
              ingredients={sortMedicinalIngredients(selProd?.product_ingredients || [])}
              medicinalEn={boundGetVal(SECTION_DEFS.find(d => d.key === "medicinal_en"), selected)}
              medicinalFr={boundGetVal(SECTION_DEFS.find(d => d.key === "medicinal_fr"), selected)}
              authorizationClaims={boundGetVal(SECTION_DEFS.find(d => d.key === "authorization_claims"), selected)}
            />
          </div>
        ) : (
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{getProdDisplayName(selProd) || "标签详情"}</h2>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {selProd?.npn && `NPN ${selProd.npn} · `}
                  更新于 {new Date(selected.updated_at).toLocaleString("zh-CN")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!editing ? (
                  <>
                    <button onClick={() => setPreviewMode(true)} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>预览</button>
                    <button onClick={handleExport} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>导出</button>
                    <button onClick={handleRefresh} disabled={saving} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: saving ? "wait" : "pointer", color: "#475569" }}>刷新HC</button>
                    <button onClick={() => setEditing(true)} style={{ padding: "6px 14px", fontSize: 12, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600 }}>编辑</button>
                  </>
                ) : (
                  <>
                    <button onClick={handleSave} disabled={saving} style={{ padding: "6px 14px", fontSize: 12, border: "none", borderRadius: 6, background: "#22c55e", color: "#fff", cursor: saving ? "wait" : "pointer", fontWeight: 600 }}>{saving ? "保存中..." : "保存"}</button>
                    <button onClick={() => { resetForm(selected); setEditing(false); }} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>取消</button>
                  </>
                )}
              </div>
            </div>
            <LabelForm
              selected={selected}
              product={selProd}
              form={form}
              editing={editing}
              getVal={boundGetVal}
              onFormChange={setForm}
            />
          </div>
        )}
      </div>

      {showCreate && (
        <>
          <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 999 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 12, width: 480, maxHeight: "70vh", overflowY: "auto", zIndex: 1000, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>选择产品创建标签</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
            </div>
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
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{getProdDisplayName(p)}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.npn && `NPN ${p.npn}`}{p.dosage_form_type && ` · ${p.dosage_form_type}`}</div>
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
        </>
      )}
    </div>
  );
}
