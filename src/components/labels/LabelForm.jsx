import { DEFAULT_COMPANY, DEFAULT_COMPANY_US, DEFAULT_RISK, DEFAULT_RISK_FR } from "../../constants";

const h = { fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, margin: "16px 0 8px" };
const sectionBox = { background: "#f8fafc", borderRadius: 8, padding: "12px 16px", border: "1px solid #e2e8f0", marginBottom: 12 };
const textareaStyle = { width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 5, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6 };
const arrayItemStyle = { display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4 };
const miniInput = { flex: 1, padding: "5px 8px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 5, fontFamily: "inherit", boxSizing: "border-box" };

function ArrayEditor({ items, onChange, placeholder, disabled }) {
  const handleChange = (i, val) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const handleRemove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const handleAdd = () => onChange([...items, ""]);

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={arrayItemStyle}>
          <input value={item} onChange={e => handleChange(i, e.target.value)} disabled={disabled}
            style={{ ...miniInput, background: disabled ? "#f1f5f9" : "#fff" }} placeholder={placeholder} />
          {!disabled && (
            <button onClick={() => handleRemove(i)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 16, padding: "2px 4px", lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
              onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}>×</button>
          )}
        </div>
      ))}
      {!disabled && (
        <button onClick={handleAdd}
          style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>+ 添加</button>
      )}
    </div>
  );
}

function WarningBucket({ label, labelFr, items, itemsFr, onChange, onChangeFr, editing, bilingual }) {
  if (!editing && (!items?.length) && (!itemsFr?.length)) return null;
  return (
    <div style={{ marginBottom: 10, paddingLeft: 12, borderLeft: "3px solid #e2e8f0" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>{label}</div>
      <ArrayEditor items={items || []} onChange={onChange} disabled={!editing} placeholder="English..." />
      {bilingual && (
        <>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6, marginBottom: 2 }}>{labelFr}</div>
          <ArrayEditor items={itemsFr || []} onChange={onChangeFr} disabled={!editing} placeholder="Français..." />
        </>
      )}
    </div>
  );
}

export default function LabelForm({ selected, product, form, editing, getVal, onFormChange }) {
  const p = product || {};
  const bilingual = form.label_type !== "us_fda";

  const updateProduct = (key, val) => onFormChange({ ...form, [`_prod_${key}`]: val });
  const getProd = (key) => form[`_prod_${key}`] !== undefined ? form[`_prod_${key}`] : p[key];

  return (
    <>
      {/* Label type */}
      {editing && (
        <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>标签类型:</span>
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 6, padding: 2 }}>
            {[{ v: "single", l: "单标签" }, { v: "double", l: "双标签" }, { v: "us_fda", l: "🇺🇸 FDA" }].map(t => (
              <button key={t.v} onClick={() => {
                const next = { ...form, label_type: t.v };
                if (t.v === "us_fda" && (!form.company_info || form.company_info === DEFAULT_COMPANY)) {
                  next.company_info = DEFAULT_COMPANY_US;
                } else if (t.v !== "us_fda" && form.company_info === DEFAULT_COMPANY_US) {
                  next.company_info = DEFAULT_COMPANY;
                }
                onFormChange(next);
              }} style={{
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

      {/* Product Name & Subtitle */}
      <div style={sectionBox}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>产品名称 & 副标题</div>
        <div style={{ fontSize: 13, color: "#1e293b", marginBottom: 8 }}>{getVal({ key: "product_name", source: "computed" }, selected)}</div>
        {editing ? (
          <textarea value={form.subtitle || ""} onChange={e => onFormChange({ ...form, subtitle: e.target.value })} rows={1} placeholder="副标题 / 功能声明" style={textareaStyle} />
        ) : (
          selected?.subtitle && <div style={{ fontSize: 12, color: "#475569" }}>{selected.subtitle}</div>
        )}
      </div>

      {/* Recommended Use / Purposes */}
      <div style={sectionBox}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Recommended Use / Purposes</div>
        {editing ? (
          <>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>English</div>
            <ArrayEditor items={getProd("purposes_en") || []} onChange={v => updateProduct("purposes_en", v)} disabled={false} placeholder="Purpose..." />
            {bilingual && (
              <>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 8, marginBottom: 4 }}>Français</div>
                <ArrayEditor items={getProd("purposes_fr") || []} onChange={v => updateProduct("purposes_fr", v)} disabled={false} placeholder="Usage..." />
              </>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {(p.purposes_en || []).join("\n") || p.recommended_use || "—"}
          </div>
        )}
      </div>

      {/* Recommended Dose (computed) */}
      <div style={{ ...sectionBox, background: "#f0fdf4" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
          <span>Recommended Dose</span>
          <span style={{ color: "#86efac", fontSize: 10 }}>自动计算</span>
        </div>
        <div style={{ fontSize: 13, color: "#1e293b" }}>{getVal({ key: "recommended_dose", source: "computed" }, selected) || "—"}</div>
      </div>

      {/* Structured Warnings */}
      <div style={sectionBox}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 10 }}>Cautions & Warnings (HC Structured)</div>

        <WarningBucket label="Do Not Use" labelFr="Ne pas utiliser"
          items={getProd("do_not_use_en")} itemsFr={getProd("do_not_use_fr")}
          onChange={v => updateProduct("do_not_use_en", v)} onChangeFr={v => updateProduct("do_not_use_fr", v)}
          editing={editing} bilingual={bilingual} />

        <WarningBucket label="Ask Before Use" labelFr="Consultez avant utilisation"
          items={getProd("ask_before_use_en")} itemsFr={getProd("ask_before_use_fr")}
          onChange={v => updateProduct("ask_before_use_en", v)} onChangeFr={v => updateProduct("ask_before_use_fr", v)}
          editing={editing} bilingual={bilingual} />

        <WarningBucket label="When Using This Product" labelFr="Lorsque vous utilisez ce produit"
          items={getProd("when_using_en")} itemsFr={getProd("when_using_fr")}
          onChange={v => updateProduct("when_using_en", v)} onChangeFr={v => updateProduct("when_using_fr", v)}
          editing={editing} bilingual={bilingual} />

        <WarningBucket label="Stop Use" labelFr="Cessez d'utiliser"
          items={getProd("stop_use_en")} itemsFr={getProd("stop_use_fr")}
          onChange={v => updateProduct("stop_use_en", v)} onChangeFr={v => updateProduct("stop_use_fr", v)}
          editing={editing} bilingual={bilingual} />

        <WarningBucket label="Known Adverse Reactions" labelFr="Réactions indésirables connues"
          items={getProd("known_adverse_en")} itemsFr={getProd("known_adverse_fr")}
          onChange={v => updateProduct("known_adverse_en", v)} onChangeFr={v => updateProduct("known_adverse_fr", v)}
          editing={editing} bilingual={bilingual} />

        <WarningBucket label="Other Warnings" labelFr="Autres mises en garde"
          items={getProd("other_warnings_en")} itemsFr={getProd("other_warnings_fr")}
          onChange={v => updateProduct("other_warnings_en", v)} onChangeFr={v => updateProduct("other_warnings_fr", v)}
          editing={editing} bilingual={bilingual} />

        <WarningBucket label="Other Information" labelFr="Autres renseignements"
          items={getProd("other_information_en")} itemsFr={getProd("other_information_fr")}
          onChange={v => updateProduct("other_information_en", v)} onChangeFr={v => updateProduct("other_information_fr", v)}
          editing={editing} bilingual={bilingual} />
      </div>

      {/* Medicinal Ingredients (computed) */}
      <div style={{ ...sectionBox, background: "#f0fdf4" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
          <span>Medicinal Ingredients</span>
          <span style={{ color: "#86efac", fontSize: 10 }}>来自产品管理</span>
        </div>
        <div style={{ fontSize: 12, color: "#1e293b", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
          {getVal({ key: "medicinal_en", source: "computed" }, selected) || "—"}
        </div>
      </div>

      {/* Non-Medicinal (computed) */}
      <div style={{ ...sectionBox, background: "#f0fdf4" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
          <span>Non-Medicinal Ingredients</span>
          <span style={{ color: "#86efac", fontSize: 10 }}>来自产品管理</span>
        </div>
        <div style={{ fontSize: 12, color: "#1e293b" }}>
          {getVal({ key: "non_medicinal", source: "computed" }, selected) || "—"}
        </div>
      </div>

      {/* Risk Info & Company (label-level overrides) */}
      <div style={sectionBox}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>标签展示信息</div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>Risk / Storage Statement</div>
          {editing ? (
            <textarea value={form.risk_info || ""} onChange={e => onFormChange({ ...form, risk_info: e.target.value })} rows={2} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, color: "#1e293b", whiteSpace: "pre-wrap" }}>{selected?.risk_info || DEFAULT_RISK}</div>
          )}
        </div>

        {bilingual && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>Risk / Storage (FR)</div>
            {editing ? (
              <textarea value={form.risk_info_fr || ""} onChange={e => onFormChange({ ...form, risk_info_fr: e.target.value })} rows={2} style={textareaStyle} />
            ) : (
              <div style={{ fontSize: 12, color: "#1e293b", whiteSpace: "pre-wrap" }}>{selected?.risk_info_fr || DEFAULT_RISK_FR}</div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>Company Info</div>
          {editing ? (
            <textarea value={form.company_info || ""} onChange={e => onFormChange({ ...form, company_info: e.target.value })} rows={3} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, color: "#1e293b", whiteSpace: "pre-wrap" }}>{selected?.company_info || DEFAULT_COMPANY}</div>
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>Licence Holder</div>
          {editing ? (
            <input value={form.licence_holder || ""} onChange={e => onFormChange({ ...form, licence_holder: e.target.value })} style={{ ...miniInput, background: "#fff" }} placeholder="Nutrizen Station Lab Inc." />
          ) : (
            <div style={{ fontSize: 12, color: "#1e293b" }}>{selected?.licence_holder || "—"}</div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>Side Bar / 卖点</div>
          {editing ? (
            <textarea value={form.side_bar || ""} onChange={e => onFormChange({ ...form, side_bar: e.target.value })} rows={2} style={textareaStyle} />
          ) : (
            <div style={{ fontSize: 12, color: "#1e293b", whiteSpace: "pre-wrap" }}>{selected?.side_bar || "—"}</div>
          )}
        </div>
      </div>
    </>
  );
}
