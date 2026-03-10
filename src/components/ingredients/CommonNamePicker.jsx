import { useState, useMemo, useEffect, useRef } from "react";

export default function CommonNamePicker({ skuId, currentCommonId, commonIngredients, onChange }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = commonIngredients.find(c => c.id === currentCommonId);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase();
    return commonIngredients.filter(c => c.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [input, commonIngredients]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {current ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "5px 10px" }}>
          <div style={{ flex: 1, fontSize: 12, color: "#15803d", fontWeight: 500 }}>{current.name}</div>
          <button onClick={() => onChange(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: 0 }}>×</button>
        </div>
      ) : (
        <input value={input} onChange={e => { setInput(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="关联通用名..."
          style={{ width: "100%", padding: "6px 10px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, boxSizing: "border-box", outline: "none" }} />
      )}
      {open && suggestions.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 600, maxHeight: 200, overflowY: "auto" }}>
          {suggestions.map(c => (
            <div key={c.id} onClick={() => { onChange(c.id); setInput(""); setOpen(false); }}
              style={{ padding: "6px 10px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
