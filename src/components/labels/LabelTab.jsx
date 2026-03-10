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
      const [prods, lbls, pes, excs] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("product_labels").select("*"),
        supabase.from("product_excipients").select("*"),
        supabase.from("excipients").select("*"),
      ]);
      setProducts(prods);
      setLabels(lbls);
      const peMap = {};
      pes.forEach(pe => {
        if (!peMap[pe.product_id]) peMap[pe.product_id] = [];
        const exc = excs.find(e => e.id === pe.excipient_id);
        if (exc) peMap[pe.product_id].push(exc.name);
      });
      const excMap = {};
      Object.keys(peMap).forEach(pid => { excMap[pid] = peMap[pid].join(", "); });
      setExcipientMap(excMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selected) resetForm(selected); }, [selected]);

  const getProduct = (label) => products.find(p => p.id === label?.product_id);
  const getVal = (sec, label) => {
    if (sec.source === "product") return getProduct(label)?.[sec.field] || "";
    if (sec.source === "computed" && sec.key === "non_medicinal") return excipientMap[label?.product_id] || "";
    return label?.[sec.key] || "";
  };

  const handleCreate = async (productId) => {
    const prod = products.find(p => p.id === productId);
    const payload = {
      product_id: productId, label_type: "single", subtitle: "",
      spec: `${prod?.dosage_form || ""}    NPN: ${prod?.npn || ""}`,
      recommended_use_fr: "", recommended_dose_fr: "", cautions_fr: "",
      medicinal_en: "", medicinal_fr: "", non_medicinal_fr: "",
      risk_info: DEFAULT_RISK, risk_info_fr: DEFAULT_RISK_FR,
      company_info: DEFAULT_COMPANY, licence_holder: "Nutrizen Station Lab Inc.", sidebar_text: "",
    };
    const [newLabel] = await supabase.from("product_labels").insert(payload);
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
      await supabase.from("product_labels").update(selected.id, payload);
      await loadData();
      const refreshed = (await supabase.from("product_labels").select("*")).find(l => l.id === selected.id);
      setSelected(refreshed || null);
      setEditing(false);
    } catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("确定删除这个标签？")) return;
    await supabase.from("product_labels").delete(id);
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
    t += `1: ${prod?.product_name || ""}\n`;
    t += `2: ${s.subtitle || ""}\n`;
    t += `3: ${s.spec || ""}\n\n`;
    t += `RECOMMENDED USE:\n${prod?.recommended_use || ""}\n`;
    if (!isDouble) t += `\nUTILISATION RECOMMANDÉE:\n${s.recommended_use_fr || ""}\n`;
    t += `\nRECOMMENDED DOSE:\n${prod?.recommended_dose || ""}\n`;
    if (!isDouble) t += `\nDOSE RECOMMANDÉE:\n${s.recommended_dose_fr || ""}\n`;
    t += `\nCAUTIONS:\n${prod?.caution || ""}\n`;
    if (!isDouble) t += `\nMISES EN GARDE:\n${s.cautions_fr || ""}\n`;
    t += `\nMedicinal Ingredients:\n${s.medicinal_en || ""}\n`;
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
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `label_${prod?.product_name || "draft"}.txt`; a.click();
  };

  const filteredLabels = useMemo(() => {
    const q = search.toLowerCase().trim();
    return labels.map(l => {
      const prod = products.find(p => p.id === l.product_id);
      return { ...l, _prodName: prod?.product_name || "", _npn: prod?.npn || "" };
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
    <div style={{ display: "flex", height: "calc(100vh - 56px)", background: "#f1f5f9" }}>
      {/* 左侧列表 */}
      <div style={{ width: 300, borderRight: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索产品名 / NPN..."
              style={{ flex: 1, padding: "8px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, outline: "none", background: "#f8fafc" }} />
            <button onClick={() => setShowCreate(true)} style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>+ 新建</button>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>共 {filteredLabels.length} 个标签</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredLabels.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
              {labels.length === 0 ? "还没有标签，点击「+ 新建」" : "无匹配结果"}
            </div>
          )}
          {filteredLabels.map(l => (
            <div key={l.id} onClick={() => { setSelected(l); setEditing(false); setPreviewMode(false); }}
              style={{
                padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                background: selected?.id === l.id ? "#eff6ff" : "#fff",
                borderLeft: selected?.id === l.id ? "3px solid #3b82f6" : "3px solid transparent",
              }}
              onMouseEnter={e => { if (selected?.id !== l.id) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={e => { if (selected?.id !== l.id) e.currentTarget.style.background = "#fff"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l._prodName || "未关联产品"}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{
                      padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                      background: l.label_type === "double" ? "#fef3c7" : "#dbeafe",
                      color: l.label_type === "double" ? "#92400e" : "#1e40af",
                    }}>{l.label_type === "double" ? "双标签" : "单标签"}</span>
                    {l._npn && <span>NPN {l._npn}</span>}
                  </div>
                  {l.subtitle && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.subtitle}</div>}
                </div>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); handleDuplicate(l); }} title="复制"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: "2px 4px" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#3b82f6"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>⧉</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(l.id); }} title="删除"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: "2px 4px" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#ef4444"} onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>×</button>
                </div>
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
            {/* 顶部工具栏 */}
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

            {/* 标签类型切换 */}
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

            {/* 图例 */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, fontSize: 11, color: "#64748b" }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#f0fdf4", border: "1px solid #bbf7d0", marginRight: 4, verticalAlign: "middle" }} />来自产品表 (只读)</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#f8fafc", border: "1px solid #e2e8f0", marginRight: 4, verticalAlign: "middle" }} />标签专属 (可编辑)</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#eff6ff", border: "1px solid #bfdbfe", marginRight: 4, verticalAlign: "middle" }} />法语 FR</span>
            </div>

            {/* 区块列表 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SECTION_DEFS
                .filter(sec => {
                  if ((form.label_type || selected.label_type || "single") === "double" && sec.fr) return false;
                  return true;
                })
                .map(sec => {
                  const isReadOnly = sec.source === "product" || sec.source === "computed";
                  const val = editing ? (isReadOnly ? getVal(sec, selected) : (form[sec.key] ?? "")) : getVal(sec, selected);
                  const bg = sectionBg(sec);
                  return (
                    <div key={sec.key} style={{ background: bg, borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      <div style={{ padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: (editing && !isReadOnly) ? "1px solid #e2e8f0" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: sec.fr ? "#1e40af" : "#334155" }}>{sec.label}</span>
                          {sec.fr && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#bfdbfe", color: "#1e40af" }}>FR</span>}
                          {isReadOnly && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#dcfce7", color: "#15803d" }}>产品表</span>}
                          {sec.note && <span style={{ fontSize: 10, color: "#94a3b8" }}>— {sec.note}</span>}
                        </div>
                      </div>
                      {editing && !isReadOnly ? (
                        <textarea
                          value={form[sec.key] ?? ""}
                          onChange={e => setForm(f => ({ ...f, [sec.key]: e.target.value }))}
                          rows={["medicinal_en", "medicinal_fr", "cautions_fr", "recommended_use_fr"].includes(sec.key) ? 5 : (["company_info", "sidebar_text"].includes(sec.key) ? 4 : 2)}
                          style={{ width: "100%", padding: "10px 14px", fontSize: 13, border: "none", outline: "none", resize: "vertical", fontFamily: "inherit", background: "transparent", boxSizing: "border-box", lineHeight: 1.6 }}
                          placeholder={`输入${sec.label}...`}
                        />
                      ) : (
                        <div style={{ padding: val ? "10px 14px" : "6px 14px", fontSize: 13, color: val ? "#1e293b" : "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                          {val || "（空）"}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* 新建弹窗 */}
      {showCreate && (
        <>
          <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1100 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", borderRadius: 12, width: 520, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", zIndex: 1101, padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>新建标签</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 8 }}>选择一个产品来创建标签</div>
            <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
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
          </div>
        </>
      )}
    </div>
  );
}
