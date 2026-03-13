import { useState, useMemo, useEffect } from "react";
import supabase from "../../lib/supabase";
import { SECTION_DEFS, DEFAULT_COMPANY, DEFAULT_RISK, DEFAULT_RISK_FR } from "../../constants";
import Loading from "../ui/Loading";
import LabelPreviewV2 from "./LabelPreviewV2";

export default function LabelTab() {
  const [labels, setLabels] = useState([]);
  const [products, setProducts] = useState([]);
  const [excipientMap, setExcipientMap] = useState({});
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
    SECTION_DEFS.filter(s => s.source === "label").forEach(s => { f[s.key] = label[s.key] || ""; });
    f.label_type = label.label_type || "single";
    setForm(f);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 4个请求 → 2个
      const [{ data: lbls, error: e1 }, { data: prods, error: e2 }] = await Promise.all([
        supabase.from("product_labels").select("*"),
        supabase.from("products").select(`
          *,
          product_brands(*),
          product_excipients(*, excipients(name)),
          product_medicinal_ingredients(*, common_ingredients(name))
          `),
        
      ]);
      if (e1 || e2) throw new Error((e1 || e2).message);

      setLabels(lbls);
      setProducts(prods);

      // excipientMap: product_id -> "Hypromellose, ..."
      const excMap = {};
      prods.forEach(p => {
        const names = (p.product_excipients || []).map(pe => pe.excipients?.name).filter(Boolean);
        if (names.length) excMap[p.id] = names.join(", ");
      });
      setExcipientMap(excMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selected) resetForm(selected); }, [selected]);

  const getProduct = (label) => products.find(p => p.id === label?.product_id);
  const getProdDisplayName = (prod) => {
    if (!prod) return "";
    const def = (prod.product_brands || []).find(pb => pb.is_default);
    return def?.brand_name || prod.product_brands?.[0]?.brand_name || prod.product_name || "";
  };
  const getVal = (sec, label) => {
  const prod = getProduct(label);

  if (sec.source === "product") return prod?.[sec.field] || "";

  if (sec.source === "computed") {
    switch (sec.key) {

      case "product_name": {
        // 用 is_default 的 brand_name，没有就 fallback product_name
        const def = (prod?.product_brands || []).find(pb => pb.is_default);
        return def?.brand_name || prod?.product_name || "";
      }

      case "spec": {
        // [dosage_form_type] [dosage_form_subtype]  NPN: [npn]
        const parts = [prod?.dosage_form_type, prod?.dosage_form_subtype].filter(Boolean).join(" ");
        const npn = prod?.npn ? `NPN: ${prod.npn}` : "";
        return [parts, npn].filter(Boolean).join("  ") || "";
      }

      case "recommended_dose": {
        // Take [dose_amount](-[dose_amount_max]) [dose_unit], [freq_min](-[freq_max]) times [freq_unit], or as directed by a healthcare practitioner.
        if (!prod?.dose_amount) return "";
        const amount = prod.dose_amount_max
          ? `${prod.dose_amount}–${prod.dose_amount_max}`
          : `${prod.dose_amount}`;
        const unit = prod.dose_unit || "";
        const freq = prod.dose_freq_max
          ? `${prod.dose_freq_min}–${prod.dose_freq_max}`
          : `${prod.dose_freq_min || ""}`;
        const freqUnit = prod.dose_freq_unit || "";
        return `Take ${amount} ${unit}, ${freq} times ${freqUnit}, or as directed by a healthcare practitioner.`.trim();
      }

      case "medicinal_en": {
        // [common_ingredient name]  [amount] 每行一个
        const ingredients = prod?.product_medicinal_ingredients || [];
        return ingredients
          .map(pmi => [pmi.common_ingredients?.name, pmi.amount].filter(Boolean).join("  "))
          .filter(Boolean)
          .join("\n") || "";
      }

      case "non_medicinal":
        return excipientMap[label?.product_id] || "";

      default:
        return "";
    }
  }
  return label?.[sec.key] || "";
};


  const handleCreate = async (productId) => {
    const prod = products.find(p => p.id === productId);
    const payload = {
      product_id: productId, label_type: "single", subtitle: "",
      recommended_use_fr: "", recommended_dose_fr: "", cautions_fr: "",
      medicinal_fr: "", non_medicinal_fr: "",
      risk_info: DEFAULT_RISK, risk_info_fr: DEFAULT_RISK_FR,
      company_info: DEFAULT_COMPANY, licence_holder: "Nutrizen Station Lab Inc.", sidebar_text: "",
    };
    const { data: newLabel } = await supabase.from("product_labels").insert(payload).select().single();
    await loadData();
    setSelected(newLabel);
    setEditing(true);
    setShowCreate(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = {};
      SECTION_DEFS.filter(s => s.source === "label").forEach(s => { payload[s.key] = form[s.key] || null; });
      payload.label_type = form.label_type || "single";
      payload.updated_at = new Date().toISOString();
      await supabase.from("product_labels").update(payload).eq("id", selected.id);
      await loadData();
      const { data: refreshed } = await supabase.from("product_labels").select("*").eq("id", selected.id).single();
      setSelected(refreshed || null);
      setEditing(false);
    } catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("确定删除这个标签？")) return;
    await supabase.from("product_labels").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setEditing(false); }
    await loadData();
  };

  const handleDuplicate = async (label) => {
    const { id, created_at, updated_at, _prodName, _npn, ...rest } = label;
    rest.subtitle = (rest.subtitle || "") + " (副本)";
    await supabase.from("product_labels").insert(rest);
    await loadData();
  };

  const handleExport = () => {
    if (!selected) return;
    const prod = getProduct(selected);
    const s = selected;
    const isDouble = s.label_type === "double";
    let t = `=== ${isDouble ? "标签 1 (English)" : "单标签 (EN/FR)"} ===\n\n`;
    t += `1: ${getVal(SECTION_DEFS.find(d => d.key === "product_name"), s)}\n`;
    t += `2: ${s.subtitle || ""}\n`;
    t += `3: ${getVal(SECTION_DEFS.find(d => d.key === "spec"), s)}\n\n`;
    t += `RECOMMENDED USE:\n${prod?.recommended_use || ""}\n`;
    if (!isDouble) t += `\nUTILISATION RECOMMANDÉE:\n${s.recommended_use_fr || ""}\n`;
    t += `\nRECOMMENDED DOSE:\n${getVal(SECTION_DEFS.find(d => d.key === "recommended_dose"), s)}\n`;
    if (!isDouble) t += `\nDOSE RECOMMANDÉE:\n${s.recommended_dose_fr || ""}\n`;
    t += `\nCAUTIONS:\n${prod?.caution || ""}\n`;
    if (!isDouble) t += `\nMISES EN GARDE:\n${s.cautions_fr || ""}\n`;
    t += `\nMedicinal Ingredients:\n${getVal(SECTION_DEFS.find(d => d.key === "medicinal_en"), s)}\n`;
    if (!isDouble) t += `\nIngrédients médicinaux:\n${s.medicinal_fr || ""}\n`;
    t += `\nNon-Medicinal:\n${excipientMap[s.product_id] || ""}\n`;
    if (!isDouble) t += `\nIngrédients non médicinaux:\n${s.non_medicinal_fr || ""}\n`;
    t += `\n${s.risk_info || ""}\n`;
    if (!isDouble) t += `${s.risk_info_fr || ""}\n`;
    t += `\n${s.company_info || ""}\n`;
    if (s.sidebar_text) t += `\n---\n${s.sidebar_text}\n`;
    if (isDouble) {
      t += `\n\n=== 标签 2 (Français) ===\n\n`;
      t += `UTILISATION RECOMMANDÉE:\n${s.recommended_use_fr || ""}\n`;
      t += `\nDOSE RECOMMANDÉE:\n${s.recommended_dose_fr || ""}\n`;
      t += `\nMISES EN GARDE:\n${s.cautions_fr || ""}\n`;
      t += `\nIngrédients médicinaux:\n${s.medicinal_fr || ""}\n`;
      t += `\nIngrédients non médicinaux:\n${s.non_medicinal_fr || ""}\n`;
      t += `\n${s.risk_info_fr || ""}\n`;
    }
    const blob = new Blob([t], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `label_${prod?.product_name || "draft"}.txt`;
    a.click();
  };

  const filteredLabels = useMemo(() => {
    const q = search.toLowerCase().trim();
    return labels.map(l => {
      const prod = products.find(p => p.id === l.product_id);
      return { ...l, _prodName: getProdDisplayName(prod), _npn: prod?.npn || "" };
    }).filter(l => {
      if (!q) return true;
      return l._prodName.toLowerCase().includes(q) || l._npn.includes(q) || (l.subtitle || "").toLowerCase().includes(q);
    });
  }, [labels, products, search]);

  const sectionBg = (sec) => {
    if (sec.fr) return "#eff6ff";
    if (sec.source === "product" || sec.source === "computed") return "#f0fdf4";
    if (sec.key.includes("risk") || sec.key.includes("caution")) return "#fffbeb";
    return "#f8fafc";
  };

  if (loading) return <Loading />;
  const selProd = selected ? getProduct(selected) : null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc", overflow: "hidden" }}>

      {/* 左侧列表 */}
      <div style={{ width: 280, borderRight: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索标签..."
            style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", outline: "none" }} />
        </div>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
          <button onClick={() => setShowCreate(true)}
            style={{ width: "100%", padding: "8px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>
            + 新建标签
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredLabels.map(l => (
            <div key={l.id} onClick={() => { setSelected(l); setEditing(false); setPreviewMode(false); }}
              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: selected?.id === l.id ? "#eff6ff" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
              onMouseEnter={e => { if (selected?.id !== l.id) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={e => { if (selected?.id !== l.id) e.currentTarget.style.background = "#fff"; }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l._prodName || "未知产品"}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 3, fontSize: 11, color: "#64748b", alignItems: "center" }}>
                  <span style={{ padding: "1px 6px", borderRadius: 4, background: l.label_type === "double" ? "#fef3c7" : "#dbeafe", color: l.label_type === "double" ? "#92400e" : "#1e40af" }}>
                    {l.label_type === "double" ? "双标签" : "单标签"}
                  </span>
                  {l._npn && <span>NPN {l._npn}</span>}
                </div>
                {l.subtitle && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.subtitle}</div>}
              </div>
              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                <button onClick={e => { e.stopPropagation(); handleDuplicate(l); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: "2px 4px" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#3b82f6"}
                  onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>⧉</button>
                <button onClick={e => { e.stopPropagation(); handleDelete(l.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: "2px 4px" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                  onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧编辑区 */}
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
                <button onClick={handleExport} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>📥 导出 TXT</button>
                <button onClick={() => setPreviewMode(false)} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>← 返回</button>
              </div>
            </div>
            <LabelPreviewV2 label={selected} product={selProd} excipients={excipientMap[selected.product_id] || ""} />
          </div>
        ) : (
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{selProd?.product_name || "标签详情"}</h2>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {selProd?.npn && `NPN ${selProd.npn} · `}
                  更新于 {new Date(selected.updated_at).toLocaleString("zh-CN")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!editing ? (
                  <>
                    <button onClick={() => setPreviewMode(true)} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>👁️ 预览</button>
                    <button onClick={handleExport} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>📥 导出</button>
                    <button onClick={() => setEditing(true)} style={{ padding: "6px 14px", fontSize: 12, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600 }}>✏️ 编辑</button>
                  </>
                ) : (
                  <>
                    <button onClick={handleSave} disabled={saving} style={{ padding: "6px 14px", fontSize: 12, border: "none", borderRadius: 6, background: "#22c55e", color: "#fff", cursor: saving ? "wait" : "pointer", fontWeight: 600 }}>{saving ? "保存中..." : "💾 保存"}</button>
                    <button onClick={() => { resetForm(selected); setEditing(false); }} style={{ padding: "6px 14px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#475569" }}>取消</button>
                  </>
                )}
              </div>
            </div>

            {editing && (
              <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>标签类型:</span>
                <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 6, padding: 2 }}>
                  {[{ v: "single", l: "单标签" }, { v: "double", l: "双标签" }].map(t => (
                    <button key={t.v} onClick={() => setForm(f => ({ ...f, label_type: t.v }))} style={{
                      padding: "4px 12px", fontSize: 11, border: "none", borderRadius: 4, cursor: "pointer",
                      background: (form.label_type || "single") === t.v ? "#fff" : "transparent",
                      color: (form.label_type || "single") === t.v ? "#0f172a" : "#94a3b8",
                      fontWeight: (form.label_type || "single") === t.v ? 600 : 400,
                      boxShadow: (form.label_type || "single") === t.v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}>{t.l}</button>
                  ))}
                </div>
              </div>
            )}

            {SECTION_DEFS.map(sec => {
              const val = editing && sec.source === "label" ? form[sec.key] : getVal(sec, selected);
              const isEditable = editing && sec.source === "label";
              return (
                <div key={sec.key} style={{ marginBottom: 12, background: sectionBg(sec), borderRadius: 8, padding: "12px 16px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                    <span>{sec.label}</span>
                    {sec.source === "product" && <span style={{ color: "#86efac", fontSize: 10 }}>来自产品管理</span>}
                    {sec.source === "computed" && <span style={{ color: "#86efac", fontSize: 10 }}>自动计算</span>}
                  </div>
                  {isEditable ? (
                    <textarea value={val} onChange={e => setForm(f => ({ ...f, [sec.key]: e.target.value }))} rows={3}
                      style={{ width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 5, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6 }} />
                  ) : (
                    <div style={{ fontSize: 13, color: val ? "#1e293b" : "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{val || "（空）"}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 新建标签 modal */}
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
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{p.product_name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.npn && `NPN ${p.npn}`}{p.dosage_form && ` · ${p.dosage_form}`}</div>
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