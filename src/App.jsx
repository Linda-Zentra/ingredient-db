import { useState, useEffect } from "react";
import supabase from "./lib/supabase";
import { PASSWORDS } from "./constants";
import IngredientTab from "./components/ingredients/IngredientTab";
import ProductTab from "./components/products/ProductTab";
import LabelTab from "./components/labels/LabelTab";

// ============================================================
// 密码锁
// ============================================================
function PasswordGate({ children }) {
  const [role, setRole] = useState(() => sessionStorage.getItem("authed-role"));
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (input === PASSWORDS.internal) {
      sessionStorage.setItem("authed-role", "internal");
      setRole("internal");
    } else if (input === PASSWORDS.operations) {
      sessionStorage.setItem("authed-role", "operations");
      setRole("operations");
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  if (role) return children(role);

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0f172a", fontFamily: "'Source Han Sans SC','Noto Sans SC',-apple-system,sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ color: "#f8fafc", fontSize: 22, fontWeight: 600, marginBottom: 24 }}>原料数据库</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="password" value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="输入密码"
            style={{ padding: "12px 16px", fontSize: 14, border: `2px solid ${error ? "#ef4444" : "#334155"}`, borderRadius: 8, background: "#1e293b", color: "#f8fafc", outline: "none", width: 220 }} />
          <button onClick={handleSubmit} style={{ padding: "12px 24px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8, background: "#3b82f6", color: "#fff", cursor: "pointer" }}>进入</button>
        </div>
        {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>密码错误</p>}
      </div>
    </div>
  );
}

// ============================================================
// 主应用
// ============================================================
export default function App() {
  const [activeTab, setActiveTab] = useState("ingredients");
  const [skus, setSkus] = useState([]);

  useEffect(() => {
    supabase.from("skus").select("id,ingredient_name,ingredient").then(setSkus).catch(() => {});
  }, []);

  const logout = () => { sessionStorage.clear(); window.location.reload(); };

  return (
    <PasswordGate>
      {(role) => (
        <div style={{ fontFamily: "'Source Han Sans SC','Noto Sans SC',-apple-system,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
          {role === "operations" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
              <div style={{ fontSize: 18, color: "#475569" }}>运营界面 — 开发中</div>
              <button onClick={logout} style={{ padding: "8px 16px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", background: "#fff" }}>退出</button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ background: "#0f172a", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#f8fafc" }}>原料数据库</h1>
                  <div style={{ display: "flex", background: "#1e293b", borderRadius: 8, padding: 3 }}>
                    {[{ key: "ingredients", label: "原料库" }, { key: "products", label: "产品管理" }, { key: "labels", label: "标签编辑" }].map(t => (
                      <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                        padding: "6px 14px", fontSize: 13, border: "none", borderRadius: 6, cursor: "pointer",
                        background: activeTab === t.key ? "#3b82f6" : "transparent",
                        color: activeTab === t.key ? "#fff" : "#94a3b8",
                        fontWeight: activeTab === t.key ? 600 : 400,
                        transition: "all 0.15s",
                      }}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <button onClick={logout} style={{ padding: "6px 12px", fontSize: 12, border: "1px solid #334155", borderRadius: 6, background: "transparent", color: "#64748b", cursor: "pointer" }}>退出</button>
              </div>

              {activeTab === "ingredients" && <IngredientTab />}
              {activeTab === "products" && <ProductTab skus={skus} />}
              {activeTab === "labels" && <LabelTab />}
            </>
          )}
        </div>
      )}
    </PasswordGate>
  );
}
