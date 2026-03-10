import { useState, useMemo, useEffect, useRef } from "react";

export default function MedicinalRow({ item, skus, onUpdateSku, onDelete, editing }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{item.common_name}</div>
        {item.amount && <div style={{ fontSize: 11, color: "#64748b" }}>{item.amount}</div>}
      </div>
      <div ref={ref} style={{ position: "relative", width: 190 }}>
        {matched ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "4px 8px" }}>
            <div style={{ flex: 1, fontSize: 11, color: "#1e40af", fontWeight: 500 }}>{matched.ingredient_name || matched.ingredient || "—"}</div>
            {editing && <button onClick={() => onUpdateSku(item.id, null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: 0 }}>×</button>}
          </div>
        ) : (
          <input value={input} onChange={e => { setInput(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            placeholder="关联 SKU..." disabled={!editing}
            style={{ width: "100%", padding: "4px 8px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", outline: "none", background: editing ? "#fff" : "#f8fafc" }} />
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
      {editing && (
        <button onClick={() => onDelete(item.id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 16, padding: "0 2px", lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
          onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}>×</button>
      )}
    </div>
  );
}
