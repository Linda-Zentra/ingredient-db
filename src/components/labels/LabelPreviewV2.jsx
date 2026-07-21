import { Fragment } from "react";
import { DEFAULT_FDA_DISCLAIMER, DEFAULT_STORAGE_US, DEFAULT_RISK, DEFAULT_RISK_FR } from "../../constants";
import { calcDV } from "../../lib/fdaDV";
import { formatMedicinalIngredient, formatExcipientWithAllergen, collectAllergens, formatAllergenStatement, splitPurposes } from "../../lib/ingredientFormatters";
import { buildCautionText } from "../../lib/labelData";
import { computeRecommendedDose, computeRecommendedDoseFr } from "../../lib/labelDose";
import { getMissingFrenchHcFields } from "../../lib/labelPreviewProvenance";

function computeSpec(p) {
  const parts = [p.dosage_form_type, p.dosage_form_subtype].filter(Boolean).join(" ");
  const npn = p.npn ? `NPN: ${p.npn}` : "";
  return [parts, npn].filter(Boolean).join("  ") || "";
}

export default function LabelPreviewV2({ label, product, productName, excipients, excipientsFr, excipientRows, ingredients, medicinalEn, medicinalFr, authorizationClaims }) {
  const s = label;
  const p = product || {};
  const box = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "24px 28px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
  const h = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 16 };
  const b = { fontSize: 13, color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-wrap" };

  const spec = computeSpec(p);
  const recommendedDose = computeRecommendedDose(p);
  const recommendedDoseFr = computeRecommendedDoseFr(p);

  const renderProductHeader = () => (
    <div style={{ textAlign: "center", marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{productName || ""}</h2>
      {s.subtitle && <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{s.subtitle}</div>}
      {spec && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{spec}</div>}
    </div>
  );

  const renderLanguageSections = (lang, { showBadge = false, showSourceNotes = false } = {}) => {
    const fr = lang === "fr";
    const recommendedUse = fr ? p.recommended_use_fr : p.recommended_use;
    const cautionText = buildCautionText(p, lang);
    const doseText = fr
      ? (showSourceNotes ? recommendedDoseFr : (s.recommended_dose_fr || ""))
      : recommendedDose;
    const doseIsDerived = fr && showSourceNotes && Boolean(recommendedDoseFr);
    const missingFrenchHcFields = fr && showSourceNotes ? getMissingFrenchHcFields(p) : [];

    return (
      <>
        {showBadge && (
          <div style={{
            fontSize: 10,
            padding: "3px 8px",
            background: fr ? "#e8eef8" : "#e8f2ee",
            color: fr ? "#35516f" : "#315d4c",
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 4,
            fontWeight: 700,
            letterSpacing: 0.45,
          }}>
            {fr ? "FRANÇAIS" : "ENGLISH"}
          </div>
        )}
        {missingFrenchHcFields.length > 0 && (
          <div className="label-preview-source-note">
            HC French source incomplete · missing: {missingFrenchHcFields.join(", ")}
          </div>
        )}
        <div style={h}>{fr ? "UTILISATION RECOMMANDÉE" : "RECOMMENDED USE"}</div>
        <div style={b}>{recommendedUse || "—"}</div>
        <div style={h}>{fr ? "DOSE RECOMMANDÉE (ADULTES)" : "RECOMMENDED DOSE (ADULTS)"}</div>
        <div style={b}>{fr && !showSourceNotes ? doseText : (doseText || "—")}</div>
        {doseIsDerived && (
          <div className="label-preview-derived-note">
            Derived from structured dosage · Dérivé des données posologiques
          </div>
        )}
        <div style={h}>{fr ? "MISES EN GARDE ET PRÉCAUTIONS" : "CAUTIONS AND WARNINGS"}</div>
        <div style={b}>{cautionText || "—"}</div>
        <div style={h}>{fr ? "Ingrédients médicinaux" : "Medicinal Ingredients"}</div>
        <div style={{ ...b, fontFamily: "monospace", fontSize: 12 }}>{fr ? (medicinalFr || "—") : (medicinalEn || "—")}</div>
        {authorizationClaims && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#475569", fontStyle: "italic", lineHeight: 1.5 }}>{authorizationClaims}</div>
        )}
        <div style={h}>{fr ? "Ingrédients non médicinaux" : "Non-Medicinal Ingredients"}</div>
        <div style={b}>{fr ? (excipientsFr || "—") : (excipients || "—")}</div>
        <div style={{ marginTop: 16, padding: "10px 12px", background: "#fef3c7", borderRadius: 6, fontSize: 11, color: "#92400e", fontWeight: 500, lineHeight: 1.5 }}>
          {fr ? (s.risk_info_fr || DEFAULT_RISK_FR) : (s.risk_info || DEFAULT_RISK)}
        </div>
      </>
    );
  };

  const renderSharedFooter = (featureLabel = "FEATURES") => (
    <>
      {s.licence_holder && <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>Licence Holder: {s.licence_holder}</div>}
      <div style={{ marginTop: 8, fontSize: 11, color: "#64748b", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.company_info || ""}</div>
      {s.side_bar && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "#f0fdf4", borderRadius: 6, borderLeft: "3px solid #22c55e" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#15803d", marginBottom: 4 }}>{featureLabel}</div>
          <div style={{ fontSize: 12, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{s.side_bar}</div>
        </div>
      )}
    </>
  );

  const renderOne = (lang) => {
    const fr = lang === "fr";
    return (
      <div style={box}>
        {s.label_type === "double" && (
          <div style={{ fontSize: 10, padding: "2px 8px", background: fr ? "#dbeafe" : "#dcfce7", color: fr ? "#1e40af" : "#15803d", borderRadius: 4, display: "inline-block", marginBottom: 12 }}>
            {fr ? "Français" : "English"}
          </div>
        )}
        {renderProductHeader()}
        {renderLanguageSections(lang)}
        {renderSharedFooter()}
      </div>
    );
  };

  const renderBilingual = () => (
    <div style={{ ...box, padding: "28px 30px" }}>
      <div className="label-preview-kicker">BILINGUAL SINGLE LABEL · ÉTIQUETTE BILINGUE</div>
      {renderProductHeader()}
      <div className="label-preview-bilingual-grid">
        <section className="label-preview-language-column" aria-label="English label content">
          {renderLanguageSections("en", { showBadge: true, showSourceNotes: true })}
        </section>
        <section className="label-preview-language-column" aria-label="French label content">
          {renderLanguageSections("fr", { showBadge: true, showSourceNotes: true })}
        </section>
      </div>
      {renderSharedFooter("FEATURES · CARACTÉRISTIQUES")}
    </div>
  );

  const renderFDA = () => {
    // Serving Size: dose_amount + dosage_form_type
    const servingSize = p.dose_amount && p.dosage_form_type
      ? `${p.dose_amount} ${p.dosage_form_type}`
      : "1 Capsule";

    const divider = { borderBottom: "1px solid #cbd5e1", margin: "12px 0" };

    // Pre-compute ingredient DV data (avoid duplicate formatMedicinalIngredient calls)
    const ingredientData = (ingredients || []).map(pmi => {
      const fmt = formatMedicinalIngredient(pmi);
      const dvPct = pmi.amount_value && pmi.amount_unit
        ? calcDV(fmt.nameCol, pmi.amount_value, pmi.amount_unit)
        : null;
      return { fmt, dvPct };
    });
    const hasDagger = ingredientData.some(d => d.dvPct === null);

    return (
      <div>
        {/* Front Panel */}
        <div style={box}>
          <div style={{ fontSize: 10, padding: "2px 8px", background: "#fee2e2", color: "#991b1b", borderRadius: 4, display: "inline-block", marginBottom: 12, fontWeight: 600 }}>
            FDA / US Label — Front Panel
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{productName || ""}</h2>
            {s.subtitle && <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{s.subtitle}</div>}
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, letterSpacing: 1 }}>DIETARY SUPPLEMENT</div>
          </div>
          {p.purposes_en?.length > 0 ? (
            <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#334155", fontStyle: "italic" }}>
              {splitPurposes(p.purposes_en).join(" ")}
            </div>
          ) : p.recommended_use ? (
            <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#334155", fontStyle: "italic" }}>
              {p.recommended_use}
            </div>
          ) : null}
        </div>

        {/* Left Panel: Suggested Dose / Cautions / Storage / FDA disclaimer */}
        <div style={box}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 10, letterSpacing: 0.5 }}>LEFT PANEL</div>
          <div style={h}>Suggested Dose (Adults):</div>
          <div style={b}>{p.dose_amount ? `Take ${p.dose_amount}${p.dose_amount_max ? `–${p.dose_amount_max}` : ""} ${p.dosage_form_type || p.dose_unit || "capsule(s)"} ${p.dose_freq_min ? `${p.dose_freq_min}${p.dose_freq_max ? `–${p.dose_freq_max}` : ""} time(s) ${p.dose_freq_unit || "daily"}` : "daily"}, or as directed by a physician.` : "—"}</div>
          <div style={divider} />
          <div style={h}>Cautions:</div>
          <div style={b}>
            {p.do_not_use_en?.length > 0 && (
              <div style={{ marginBottom: 6 }}><strong>Do not use</strong> {p.do_not_use_en.join(" ")}</div>
            )}
            {p.ask_before_use_en?.length > 0 && (
              <div style={{ marginBottom: 6 }}><strong>Ask a doctor before use if you have</strong> {p.ask_before_use_en.join(" ")}</div>
            )}
            {p.when_using_en?.length > 0 && (
              <div style={{ marginBottom: 6 }}><strong>When using this product</strong> {p.when_using_en.join(" ")}</div>
            )}
            {p.stop_use_en?.length > 0 && (
              <div style={{ marginBottom: 6 }}><strong>Stop use and ask a doctor if</strong> {p.stop_use_en.join(" ")}</div>
            )}
            {p.known_adverse_en?.length > 0 && (
              <div style={{ marginBottom: 6 }}>{p.known_adverse_en.join(" ")}</div>
            )}
            {p.other_warnings_en?.length > 0 && (
              <div style={{ marginBottom: 6 }}>{p.other_warnings_en.join(" ")}</div>
            )}
            {p.keep_out_overdose_en && (
              <div style={{ marginBottom: 6 }}>{p.keep_out_overdose_en}</div>
            )}
            {!(p.do_not_use_en?.length || p.ask_before_use_en?.length || p.when_using_en?.length || p.stop_use_en?.length || p.known_adverse_en?.length || p.other_warnings_en?.length || p.keep_out_overdose_en) && (
              <span>{s.risk_info || DEFAULT_RISK}</span>
            )}
          </div>
          <div style={divider} />
          <div style={h}>Storage:</div>
          <div style={b}>{DEFAULT_STORAGE_US}</div>
          {/* FDA mandatory disclaimer */}
          <div style={{ marginTop: 16, padding: "10px 12px", border: "2px solid #000", background: "#fff", borderRadius: 2, fontSize: 11, color: "#000", lineHeight: 1.6 }}>
            {DEFAULT_FDA_DISCLAIMER}
          </div>
        </div>

        {/* Right Panel: Supplement Facts table */}
        <div style={box}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 10, letterSpacing: 0.5 }}>RIGHT PANEL — SUPPLEMENT FACTS</div>
          <div style={{ border: "1px solid #000", padding: "8px 10px", fontFamily: "Arial, sans-serif" }}>
            <div style={{ fontSize: 26, fontWeight: 900, borderBottom: "8px solid #000", paddingBottom: 3, marginBottom: 4, lineHeight: 1 }}>
              Supplement Facts
            </div>
            <div style={{ fontSize: 11 }}>Serving Size: {servingSize}</div>
            <div style={{ fontSize: 11, borderBottom: "4px solid #000", paddingBottom: 4, marginBottom: 4 }}>
              Servings Per Container: {p.total_count || "\u2014"}
            </div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 9, fontWeight: 700, borderBottom: "2px solid #000", paddingBottom: 3, marginBottom: 2 }}>
              <span style={{ marginRight: 8 }}>Amount Per Serving</span>
              <span style={{ minWidth: 70, textAlign: "right" }}>% Daily Value</span>
            </div>
            {/* Ingredient rows */}
            {ingredientData.map(({ fmt, dvPct }, i) => (
              <Fragment key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: "0.5px solid #d1d5db" }}>
                  <span style={{ fontWeight: 500 }}>{fmt.nameCol}</span>
                  <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                    <span>{fmt.qtyCol}</span>
                    <span style={{ minWidth: 30, textAlign: "right" }}>
                      {dvPct !== null ? `${dvPct}%` : "\u2020"}
                    </span>
                  </div>
                </div>
                {fmt.line2 && (
                  <div style={{ fontSize: 10, color: "#64748b", paddingLeft: 12, padding: "2px 0 2px 12px" }}>{fmt.line2}</div>
                )}
              </Fragment>
            ))}
            {/* Dagger footnote — only show if any ingredient lacks a DV */}
            {hasDagger && (
              <div style={{ marginTop: 6, paddingTop: 4, borderTop: "2px solid #000", fontSize: 10 }}>
                {"\u2020"} Daily Value not Established.
              </div>
            )}
            {/* Other Ingredients + FALCPA allergens */}
            {(excipientRows?.length > 0 || excipients) && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #000", fontSize: 11 }}>
                <span style={{ fontWeight: 700 }}>Other Ingredients: </span>
                <span>{excipientRows?.length
                  ? excipientRows.map(pe => formatExcipientWithAllergen(pe)).filter(Boolean).join(", ")
                  : excipients
                }</span>
              </div>
            )}
            {(() => {
              const allAllergens = collectAllergens(ingredients, excipientRows);
              const stmt = formatAllergenStatement(allAllergens, 'fda');
              return stmt ? (
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700 }}>{stmt}</div>
              ) : null;
            })()}
          </div>
        </div>

        {/* Distributor */}
        {s.company_info && (
          <div style={box}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: "#0f172a" }}>Distributor:</div>
            <div style={{ fontSize: 11, color: "#475569", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{s.company_info}</div>
          </div>
        )}
        {s.side_bar && (
          <div style={{ ...box, borderLeft: "3px solid #dc2626" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#991b1b", marginBottom: 4 }}>FRONT PANEL CLAIMS</div>
            <div style={{ fontSize: 12, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{s.side_bar}</div>
          </div>
        )}
      </div>
    );
  };

  if (s.label_type === "us_fda") return renderFDA();
  return s.label_type === "double" ? <>{renderOne("en")}{renderOne("fr")}</> : renderBilingual();
}
