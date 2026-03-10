import { useState } from "react";
import supabase from "../../lib/supabase";
import CommonNamePicker from "./CommonNamePicker";

export default function SkuCommonNameEditor({ skuId, currentCommonId, commonIngredients, onSave }) {
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(currentCommonId);
  const [saving, setSaving] = useState(false);

  const current = commonIngredients.find(c => c.id === selectedId);

  const handleSave = async (newId) => {
    setSaving(true);
    try {
      await supabase.from("skus").update(skuId, { common_ingredient_id: newId });
      setSelectedId(newId);
      onSave?.(newId);
    } catch (e) { alert("保存失败: " + e.message); }
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: current ? "#15803d" : "#94a3b8" }}>
          {current ? current.name : "未关联通用名"}
        </span>
        <button onClick={() => setEditing(true)} style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", cursor: "pointer", color: "#475569" }}>
          {current ? "修改" : "关联"}
        </button>
      </div>
    );
  }

  return (
    <CommonNamePicker
      skuId={skuId}
      currentCommonId={selectedId}
      commonIngredients={commonIngredients}
      onChange={handleSave}
    />
  );
}
