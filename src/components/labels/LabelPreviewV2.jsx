export default function LabelPreviewV2({ label, product, excipients }) {
  const s = label;
  const p = product || {};
  const box = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "24px 28px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const h = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 16 };
  const b = { fontSize: 13, color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-wrap" };

  const renderOne = (lang) => {
    const fr = lang === "fr";
    return (
      <div style={box}>
        {s.label_type === "double" && (
          <div style={{ fontSize: 10, padding: "2px 8px", background: fr ? "#dbeafe" : "#dcfce7", color: fr ? "#1e40af" : "#15803d", borderRadius: 4, display: "inline-block", marginBottom: 12 }}>
            {fr ? "Français" : "English"}
          </div>
        )}
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{p.product_name || ""}</h2>
          {s.subtitle && <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{s.subtitle}</div>}
          {s.spec && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.spec}</div>}
        </div>
        <div style={h}>{fr ? "UTILISATION RECOMMANDÉE" : "RECOMMENDED USE"}</div>
        <div style={b}>{fr ? s.recommended_use_fr : p.recommended_use || "—"}</div>
        <div style={h}>{fr ? "DOSE RECOMMANDÉE (ADULTES)" : "RECOMMENDED DOSE (ADULTS)"}</div>
        <div style={b}>{fr ? s.recommended_dose_fr : p.recommended_dose || "—"}</div>
        <div style={h}>{fr ? "MISES EN GARDE ET PRÉCAUTIONS" : "CAUTIONS AND WARNINGS"}</div>
        <div style={b}>{fr ? s.cautions_fr : p.caution || "—"}</div>
        <div style={h}>{fr ? "Ingrédients médicinaux" : "Medicinal Ingredients"}</div>
        <div style={{ ...b, fontFamily: "monospace", fontSize: 12 }}>{fr ? s.medicinal_fr : s.medicinal_en || "—"}</div>
        <div style={h}>{fr ? "Ingrédients non médicinaux" : "Non-Medicinal Ingredients"}</div>
        <div style={b}>{fr ? s.non_medicinal_fr : excipients || "—"}</div>
        <div style={{ marginTop: 16, padding: "10px 12px", background: "#fef3c7", borderRadius: 6, fontSize: 11, color: "#92400e", fontWeight: 500, lineHeight: 1.5 }}>
          {fr ? s.risk_info_fr : s.risk_info || ""}
        </div>
        {s.licence_holder && <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>Licence Holder: {s.licence_holder}</div>}
        <div style={{ marginTop: 8, fontSize: 11, color: "#64748b", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.company_info || ""}</div>
        {s.sidebar_text && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#f0fdf4", borderRadius: 6, borderLeft: "3px solid #22c55e" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#15803d", marginBottom: 4 }}>FEATURES</div>
            <div style={{ fontSize: 12, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{s.sidebar_text}</div>
          </div>
        )}
      </div>
    );
  };

  return s.label_type === "double" ? <>{renderOne("en")}{renderOne("fr")}</> : renderOne("en");
}
