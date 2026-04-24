import { useState, useMemo, useEffect, useRef } from "react";

const mini = { padding: "4px 7px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, outline: "none", color: "#334155", boxSizing: "border-box" };

export default function MedicinalRow({ item, skus, onUpdateSku, onUpdateField, onDelete, editing }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const matched = skus.find(s => s.id === item.sku_id);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase();
    return skus.filter(s =>
      s.ingredient_name?.toLowerCase().includes(q) ||
      s.ingredient?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [input, skus]);

  const hasDetails = item.extract_ratio || item.source_material || item.source_part || item.dried_herb_equivalent || item.potency_amount;

  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      {/* Row 1: name + amount + delete */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 11, padding: 0, width: 16, flexShrink: 0 }}>
          {expanded ? "▼" : "▶"}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.common_name}</div>
        </div>
        <input value={item.amount_value ?? ""} onChange={e => onUpdateField(item.id, "amount_value", e.target.value)}
          placeholder="含量" disabled={!editing} type="number" style={{ ...mini, width: 70, background: editing ? "#fff" : "#f8fafc" }} />
        <input value={item.amount_unit ?? ""} onChange={e => onUpdateField(item.id, "amount_unit", e.target.value)}
          placeholder="单位" disabled={!editing} style={{ ...mini, width: 60, background: editing ? "#fff" : "#f8fafc" }} />
        {editing && (
          <button onClick={() => onDelete(item.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 16, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}>×</button>
        )}
      </div>

      {/* Row 2: EN/FR names + SKU (always visible) */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, paddingLeft: 24 }}>
        <input value={item.name_en || ""} onChange={e => onUpdateField(item.id, "name_en", e.target.value)}
          placeholder="Common EN" disabled={!editing} style={{ ...mini, flex: 1, background: editing ? "#fff" : "#f8fafc" }} />
        <input value={item.name_fr || ""} onChange={e => onUpdateField(item.id, "name_fr", e.target.value)}
          placeholder="Nom FR" disabled={!editing} style={{ ...mini, flex: 1, background: editing ? "#fff" : "#f8fafc" }} />
        <div ref={ref} style={{ position: "relative", flex: 1.2 }}>
          {matched ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "4px 8px" }}>
              <div style={{ flex: 1, fontSize: 11, color: "#1e40af", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{matched.ingredient_name || matched.ingredient || "—"}</div>
              {editing && <button onClick={() => onUpdateSku(item.id, null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: 0 }}>×</button>}
            </div>
          ) : (
            <input value={input} onChange={e => { setInput(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
              placeholder="关联 SKU..." disabled={!editing}
              style={{ ...mini, width: "100%", background: editing ? "#fff" : "#f8fafc" }} />
          )}
          {open && suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 600, maxHeight: 200, overflowY: "auto" }}>
              {suggestions.map(s => (
                <div key={s.id} onClick={() => { onUpdateSku(item.id, s.id); setInput(""); setOpen(false); }}
                  style={{ padding: "6px 10px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <div style={{ fontWeight: 500, color: "#0f172a" }}>{s.ingredient_name || "—"}</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>{s.ingredient || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expandable detail fields */}
      {expanded && (
        <div style={{ marginTop: 8, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 6, background: "#f8fafc", borderRadius: 6, padding: "10px 12px 10px 24px" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>Extract Ratio</div>
              <input value={item.extract_ratio || ""} onChange={e => onUpdateField(item.id, "extract_ratio", e.target.value)}
                placeholder="e.g. 10:1" disabled={!editing} style={{ ...mini, width: "100%", background: editing ? "#fff" : "#f1f5f9" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>Extract Type</div>
              <input value={item.extract_type || ""} onChange={e => onUpdateField(item.id, "extract_type", e.target.value)}
                placeholder="e.g. dry" disabled={!editing} style={{ ...mini, width: "100%", background: editing ? "#fff" : "#f1f5f9" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>Source Material</div>
              <input value={item.source_material || ""} onChange={e => onUpdateField(item.id, "source_material", e.target.value)}
                placeholder="e.g. Withania somnifera" disabled={!editing} style={{ ...mini, width: "100%", background: editing ? "#fff" : "#f1f5f9" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>Source Part</div>
              <input value={item.source_part || ""} onChange={e => onUpdateField(item.id, "source_part", e.target.value)}
                placeholder="e.g. Root" disabled={!editing} style={{ ...mini, width: "100%", background: editing ? "#fff" : "#f1f5f9" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>DHE</div>
              <input value={item.dried_herb_equivalent ?? ""} onChange={e => onUpdateField(item.id, "dried_herb_equivalent", e.target.value)}
                placeholder="数值" disabled={!editing} type="number" style={{ ...mini, width: "100%", background: editing ? "#fff" : "#f1f5f9" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>DHE Unit</div>
              <input value={item.dhe_unit || ""} onChange={e => onUpdateField(item.id, "dhe_unit", e.target.value)}
                placeholder="e.g. mg" disabled={!editing} style={{ ...mini, width: "100%", background: editing ? "#fff" : "#f1f5f9" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>Potency Amount</div>
              <input value={item.potency_amount ?? ""} onChange={e => onUpdateField(item.id, "potency_amount", e.target.value)}
                placeholder="数值" disabled={!editing} type="number" style={{ ...mini, width: "100%", background: editing ? "#fff" : "#f1f5f9" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>Potency Label</div>
              <input value={item.potency_label || ""} onChange={e => onUpdateField(item.id, "potency_label", e.target.value)}
                placeholder="e.g. Withanolides" disabled={!editing} style={{ ...mini, width: "100%", background: editing ? "#fff" : "#f1f5f9" }} />
            </div>
          </div>
          {hasDetails && !editing && (
            <div style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>以上数据来自 NPN 导入</div>
          )}
        </div>
      )}
    </div>
  );
}
