import { SECTION_DEFS, DEFAULT_COMPANY, DEFAULT_COMPANY_US, DEFAULT_RISK, DEFAULT_FDA_DISCLAIMER } from "../../constants";

function sectionBg(sec) {
  if (sec.fr) return "#eff6ff";
  if (sec.source === "product" || sec.source === "computed") return "#f0fdf4";
  if (sec.key.includes("risk") || sec.key.includes("caution")) return "#fffbeb";
  return "#f8fafc";
}

const FDA_HIDDEN = new Set(["recommended_use_fr", "recommended_dose_fr", "cautions_fr", "medicinal_fr", "non_medicinal_fr", "risk_info_fr", "licence_holder"]);

const FDA_LABELS = {
  recommended_use: "3b. Health Claims / Front Panel*",
  caution: "6. Cautions",
  non_medicinal: "8. Other Ingredients",
  risk_info: "9. FDA Required Statement",
  company_info: "10. Distributor",
  side_bar: "11. 前面板卖点 / 声明",
};

export default function LabelForm({ selected, form, editing, getVal, onFormChange }) {
  const currentType = editing ? (form.label_type || "single") : (selected.label_type || "single");
  const isFDA = currentType === "us_fda";

  return (
    <>
      {editing && (
        <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>标签类型:</span>
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 6, padding: 2 }}>
            {[{ v: "single", l: "单标签" }, { v: "double", l: "双标签" }, { v: "us_fda", l: "🇺🇸 美标 FDA" }].map(t => (
              <button key={t.v} onClick={() => {
                const next = { ...form, label_type: t.v };
                if (t.v === "us_fda" && (!form.risk_info || form.risk_info === DEFAULT_RISK)) {
                  next.risk_info = DEFAULT_FDA_DISCLAIMER;
                }
                if (t.v === "us_fda" && (!form.company_info || form.company_info === DEFAULT_COMPANY)) {
                  next.company_info = DEFAULT_COMPANY_US;
                } else if (t.v !== "us_fda" && form.company_info === DEFAULT_COMPANY_US) {
                  next.company_info = DEFAULT_COMPANY;
                }
                onFormChange(next);
              }} style={{
                padding: "4px 12px", fontSize: 11, border: "none", borderRadius: 4, cursor: "pointer",
                background: currentType === t.v ? "#fff" : "transparent",
                color: currentType === t.v ? "#0f172a" : "#94a3b8",
                fontWeight: currentType === t.v ? 600 : 400,
                boxShadow: currentType === t.v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>{t.l}</button>
            ))}
          </div>
        </div>
      )}

      {SECTION_DEFS
        .filter(sec => !isFDA || !FDA_HIDDEN.has(sec.key))
        .map(sec => {
          const val = editing && sec.source === "label" ? form[sec.key] : getVal(sec, selected);
          const isEditable = editing && sec.source === "label";
          const displayLabel = isFDA && FDA_LABELS[sec.key] ? FDA_LABELS[sec.key] : sec.label;
          return (
            <div key={sec.key} style={{ marginBottom: 12, background: sectionBg(sec), borderRadius: 8, padding: "12px 16px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>{displayLabel}</span>
                {sec.source === "product" && <span style={{ color: "#86efac", fontSize: 10 }}>来自产品管理</span>}
                {sec.source === "computed" && <span style={{ color: "#86efac", fontSize: 10 }}>自动计算</span>}
              </div>
              {isEditable ? (
                <textarea value={val} onChange={e => onFormChange({ ...form, [sec.key]: e.target.value })} rows={3}
                  style={{ width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 5, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6 }} />
              ) : (
                <div style={{ fontSize: 13, color: val ? "#1e293b" : "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{val || "（空）"}</div>
              )}
            </div>
          );
        })}
    </>
  );
}
