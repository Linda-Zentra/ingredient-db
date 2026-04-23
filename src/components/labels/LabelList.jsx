import { useMemo } from "react";
import { getProdDisplayName } from "../../lib/labelData";

export default function LabelList({ labels, products, selected, search, onSearchChange, onSelect, onDelete, onDuplicate, onShowCreate }) {
  const filteredLabels = useMemo(() => {
    const q = search.toLowerCase().trim();
    return labels.map(l => {
      const prod = products.find(p => p.id === l.product_id);
      return { ...l, _prodName: getProdDisplayName(prod), _npn: prod?.npn ? String(prod.npn) : "" };
    }).filter(l => {
      if (!q) return true;
      return l._prodName.toLowerCase().includes(q) || l._npn.includes(q) || (l.subtitle || "").toLowerCase().includes(q);
    });
  }, [labels, products, search]);

  return (
    <div style={{ width: 280, borderRight: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
        <input value={search} onChange={e => onSearchChange(e.target.value)} placeholder="搜索标签..."
          style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", outline: "none" }} />
      </div>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
        <button onClick={onShowCreate}
          style={{ width: "100%", padding: "8px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 6, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>
          + 新建标签
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredLabels.map(l => (
          <div key={l.id} onClick={() => onSelect(l)}
            style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: selected?.id === l.id ? "#eff6ff" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
            onMouseEnter={e => { if (selected?.id !== l.id) e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={e => { if (selected?.id !== l.id) e.currentTarget.style.background = "#fff"; }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l._prodName || "未知产品"}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 3, fontSize: 11, color: "#64748b", alignItems: "center" }}>
                <span style={{ padding: "1px 6px", borderRadius: 4,
                  background: l.label_type === "double" ? "#fef3c7" : l.label_type === "us_fda" ? "#fee2e2" : "#dbeafe",
                  color: l.label_type === "double" ? "#92400e" : l.label_type === "us_fda" ? "#991b1b" : "#1e40af" }}>
                  {l.label_type === "double" ? "双标签" : l.label_type === "us_fda" ? "🇺🇸 FDA" : "单标签"}
                </span>
                {l._npn && <span>NPN {l._npn}</span>}
              </div>
              {l.subtitle && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.subtitle}</div>}
            </div>
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
              <button onClick={e => { e.stopPropagation(); onDuplicate(l); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: "2px 4px" }}
                onMouseEnter={e => e.currentTarget.style.color = "#3b82f6"}
                onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>⧉</button>
              <button onClick={e => { e.stopPropagation(); onDelete(l.id); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, padding: "2px 4px" }}
                onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
