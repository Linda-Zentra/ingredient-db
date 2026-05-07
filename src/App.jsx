import { useState, useEffect } from "react";
import supabase from "./lib/supabase";
import IngredientTab from "./components/ingredients/IngredientTab";
import ProductTab from "./components/products/ProductTab";
import LabelTab from "./components/labels/LabelTab";

function AuthGate({ children }) {
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (session) return children;

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0f172a", fontFamily: "'Source Han Sans SC','Noto Sans SC',-apple-system,sans-serif" }}>
      <div style={{ textAlign: "center", width: 320 }}>
        <h1 style={{ color: "#f8fafc", fontSize: 22, fontWeight: 600, marginBottom: 24 }}>原料数据库</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="邮箱" autoComplete="email"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ padding: "12px 16px", fontSize: 14, border: "2px solid #334155", borderRadius: 8, background: "#1e293b", color: "#f8fafc", outline: "none" }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="密码" autoComplete="current-password"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ padding: "12px 16px", fontSize: 14, border: "2px solid #334155", borderRadius: 8, background: "#1e293b", color: "#f8fafc", outline: "none" }} />
          <button onClick={handleLogin} disabled={loading}
            style={{ padding: "12px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: 8, background: "#3b82f6", color: "#fff", cursor: loading ? "wait" : "pointer" }}>
            {loading ? "登录中..." : "登录"}
          </button>
        </div>
        {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("ingredients");
  const [skus, setSkus] = useState([]);

  useEffect(() => {
    supabase.from("skus").select("id,ingredient_name,ingredient")
      .then(({ data }) => setSkus(data || []))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthGate>
      <div style={{ fontFamily: "'Source Han Sans SC','Noto Sans SC',-apple-system,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
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
      </div>
    </AuthGate>
  );
}
