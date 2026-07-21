import { SECTION_DEFS, DEFAULT_STORAGE_US, DEFAULT_RISK, DEFAULT_RISK_FR } from "../constants";
import { getVal, getProduct, getProdDisplayName, buildCautionText } from "./labelData";
import { calcDV } from "./fdaDV";
import { sortMedicinalIngredients, formatMedicinalIngredient, collectAllergens, formatAllergenStatement, formatExcipientWithAllergen } from "./ingredientFormatters";
import { buildMedicinalExportSection, buildPairedExcipientLists } from "./labelExportFormatters";

const FREQ_UNIT_FR = {
  daily: "par jour", "per day": "par jour", "per week": "par semaine",
  weekly: "par semaine", "per month": "par mois",
};

function computeRecommendedDoseFr(prod) {
  if (!prod.dose_amount && !prod.dose_amount_max) return "";
  const pop = prod.dose_population === "Adults" ? "Adultes" : (prod.dose_population || "Adultes");
  const doseMin = prod.dose_amount || 1;
  const doseMax = prod.dose_amount_max;
  const amount = doseMax && doseMax !== doseMin ? `${doseMin}-${doseMax}` : `${doseMin}`;
  const unit = prod.dose_unit || "capsule(s)";
  const freqMin = prod.dose_freq_min || "";
  const freqMax = prod.dose_freq_max || "";
  const rawUnit = prod.dose_freq_unit || "daily";
  const freqUnit = FREQ_UNIT_FR[rawUnit.toLowerCase()] || rawUnit;
  const times = freqMax && freqMax !== freqMin ? `${freqMin}-${freqMax}` : freqMin;
  const timesStr = times
    ? (String(times) === "1" ? freqUnit : `${times} fois ${freqUnit}`)
    : freqUnit;
  return `${pop} : Prendre ${amount} ${unit} ${timesStr}, ou selon les directives d'un praticien de soins de santé.`.trim();
}

export function buildExportText(label, products, excipientMap, excipientMapFr) {
  const s = label;
  const prod = getProduct(products, label) || {};
  const isDouble = s.label_type === "double";
  const isFDA = s.label_type === "us_fda";
  const includeFr = !isDouble && !isFDA;
  const v = (key) => getVal(SECTION_DEFS.find(d => d.key === key), s, products, excipientMap);

  const doseFr = computeRecommendedDoseFr(prod);
  const sortedMedicinal = sortMedicinalIngredients(prod.product_ingredients || []);
  const medicinalEn = buildMedicinalExportSection(sortedMedicinal, "en");
  const medicinalFr = buildMedicinalExportSection(sortedMedicinal, "fr");
  const pairedExcipients = buildPairedExcipientLists(prod.product_excipients || []);
  const nonMedEn = pairedExcipients.en || excipientMap[s.product_id] || "";
  const nonMedFr = pairedExcipients.fr || (excipientMapFr || {})[s.product_id] || "";
  const exportWarnings = [...new Set([
    ...medicinalEn.warnings,
    ...medicinalFr.warnings,
    ...pairedExcipients.warnings,
  ])];

  let t = isFDA
    ? `=== FDA / US Label ===\n\n`
    : `=== ${isDouble ? "标签 1 (English)" : "单标签 (EN/FR)"} ===\n\n`;
  t += `1: ${v("product_name")}\n`;
  t += `2: ${s.subtitle || ""}\n`;
  if (!isFDA) t += `3: ${v("spec")}\n`;
  t += "\n";

  if (isFDA) {
    // Front panel
    t += `DIETARY SUPPLEMENT\n`;
    if (prod.total_count && prod.dosage_form_type) {
      t += `${prod.total_count} ${prod.dosage_form_type}${prod.total_count > 1 ? "s" : ""}\n`;
    }
    const purposes = prod.purposes_en?.length ? prod.purposes_en.join("\n") : (prod.recommended_use || "");
    if (purposes) t += `\nHEALTH CLAIMS:\n${purposes}\n`;

    // Left panel
    t += `\nSUGGESTED DOSE (ADULTS):\n${v("recommended_dose")}\n`;
    t += `\nCAUTIONS:\n${[buildCautionText(prod, "en"), s.risk_info || DEFAULT_RISK].filter(Boolean).join("\n")}\n`;
    t += `\nSTORAGE:\n${DEFAULT_STORAGE_US}\n`;

    // Right panel — Supplement Facts
    const servingSize = prod.dose_amount && prod.dosage_form_type
      ? `${prod.dose_amount} ${prod.dosage_form_type}${prod.dose_amount > 1 ? "s" : ""}`
      : "1 Capsule";
    t += `\nSupplement Facts\n`;
    t += `Serving Size: ${servingSize}\n`;
    t += `Servings Per Container: ${prod.total_count || "—"}\n`;
    t += `\n                         Amount Per Serving    % Daily Value\n`;
    const ingredients = sortedMedicinal;
    const ingredientData = ingredients.map(pmi => {
      const fmt = formatMedicinalIngredient(pmi);
      const dvPct = pmi.amount_value && pmi.amount_unit
        ? calcDV(fmt.nameCol, pmi.amount_value, pmi.amount_unit)
        : null;
      return { fmt, dvPct };
    });
    const hasDagger = ingredientData.some(d => d.dvPct === null);
    for (const { fmt, dvPct } of ingredientData) {
      const dvStr = dvPct !== null ? `${dvPct}%` : "†";
      t += `${fmt.nameCol}    ${fmt.qtyCol}    ${dvStr}\n`;
      if (fmt.line2) t += `  ${fmt.line2}\n`;
    }
    if (hasDagger) t += `\n† Daily Value not Established.\n`;

    // Other Ingredients + FALCPA allergen statement
    const excipientRows = prod.product_excipients || [];
    const otherIngredients = excipientRows.length
      ? excipientRows.map(pe => formatExcipientWithAllergen(pe)).filter(Boolean).join(", ")
      : excipientMap[s.product_id] || "";
    if (otherIngredients) t += `\nOther Ingredients: ${otherIngredients}\n`;
    const allAllergens = collectAllergens(ingredients, excipientRows);
    const allergenStmt = formatAllergenStatement(allAllergens, "fda");
    if (allergenStmt) t += `${allergenStmt}\n`;

    // FDA disclaimer
    t += `\n*These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.\n`;
    if (s.company_info) t += `\nDistributor:\n${s.company_info}\n`;
    if (s.side_bar) t += `\n---\nFRONT PANEL CLAIMS:\n${s.side_bar}\n`;
  } else {
    t += `RECOMMENDED USE:\n${prod.recommended_use || ""}\n`;
    if (includeFr) t += `\nUTILISATION RECOMMANDÉE:\n${prod.recommended_use_fr || ""}\n`;
    t += `\nRECOMMENDED DOSE:\n${v("recommended_dose")}\n`;
    if (includeFr) t += `\nDOSE RECOMMANDÉE:\n${doseFr}\n`;
    t += `\nCAUTIONS:\n${buildCautionText(prod, "en")}\n`;
    if (includeFr) t += `\nMISES EN GARDE:\n${buildCautionText(prod, "fr")}\n`;
    t += `\nMedicinal Ingredients:\n${medicinalEn.text || v("medicinal_en")}\n`;
    if (includeFr) t += `\nIngrédients médicinaux:\n${medicinalFr.text || v("medicinal_fr")}\n`;
    t += `\nNon-Medicinal:\n${nonMedEn}\n`;
    if (includeFr) t += `\nIngrédients non médicinaux:\n${nonMedFr}\n`;
    t += `\nRISK INFORMATION:\n${s.risk_info || DEFAULT_RISK}\n`;
    if (includeFr) t += `\nRENSEIGNEMENTS SUR LES RISQUES:\n${s.risk_info_fr || DEFAULT_RISK_FR}\n`;
    t += `\nCOMPANY:\n${s.company_info || ""}\n`;
    if (s.side_bar) t += `\n---\n${s.side_bar}\n`;
    if (isDouble) {
      t += `\n\n=== 标签 2 (Français) ===\n\n`;
      t += `UTILISATION RECOMMANDÉE:\n${prod.recommended_use_fr || ""}\n`;
      t += `\nDOSE RECOMMANDÉE:\n${doseFr}\n`;
      t += `\nMISES EN GARDE:\n${buildCautionText(prod, "fr")}\n`;
      t += `\nIngrédients médicinaux:\n${medicinalFr.text || v("medicinal_fr")}\n`;
      t += `\nIngrédients non médicinaux:\n${nonMedFr}\n`;
      t += `\nRENSEIGNEMENTS SUR LES RISQUES:\n${s.risk_info_fr || DEFAULT_RISK_FR}\n`;
    }
  }

  if (!isFDA && exportWarnings.length) {
    t += `\n\n⚠ EXPORT QA — REVIEW BEFORE USE:\n${exportWarnings.map(warning => `- ${warning}`).join("\n")}\n`;
  }

  return t;
}

export function downloadLabelText(label, products, excipientMap, excipientMapFr) {
  const text = buildExportText(label, products, excipientMap, excipientMapFr);
  const prod = getProduct(products, label);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = `label_${getProdDisplayName(prod) || "draft"}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
