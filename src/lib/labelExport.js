import { SECTION_DEFS, DEFAULT_STORAGE_US } from "../constants";
import { getVal, getProduct, getProdDisplayName } from "./labelData";

function buildCautionText(label, prod, lang) {
  const fr = lang === "fr";
  if (fr && label.cautions_fr) return label.cautions_fr;
  if (!fr && label.caution) return label.caution;
  const parts = [];
  const add = (heading, items) => { if (items?.length) parts.push(`${heading} ${items.join(" ")}`); };
  if (fr) {
    add("Ne pas utiliser", prod.do_not_use_fr);
    add("Consultez avant utilisation", prod.ask_before_use_fr);
    add("Lorsque vous utilisez ce produit", prod.when_using_fr);
    add("Cessez d'utiliser et consultez si", prod.stop_use_fr);
    if (prod.known_adverse_fr?.length) parts.push(prod.known_adverse_fr.join(" "));
    if (prod.other_warnings_fr?.length) parts.push(prod.other_warnings_fr.join(" "));
  } else {
    add("Do not use", prod.do_not_use_en);
    add("Ask a doctor before use if you have", prod.ask_before_use_en);
    add("When using this product", prod.when_using_en);
    add("Stop use and ask a doctor if", prod.stop_use_en);
    if (prod.known_adverse_en?.length) parts.push(prod.known_adverse_en.join(" "));
    if (prod.other_warnings_en?.length) parts.push(prod.other_warnings_en.join(" "));
  }
  return parts.join("\n") || "";
}

export function buildExportText(label, products, excipientMap) {
  const s = label;
  const prod = getProduct(products, label) || {};
  const isDouble = s.label_type === "double";
  const isFDA = s.label_type === "us_fda";
  const includeFr = !isDouble && !isFDA;
  const v = (key) => getVal(SECTION_DEFS.find(d => d.key === key), s, products, excipientMap);

  let t = isFDA
    ? `=== FDA / US Label ===\n\n`
    : `=== ${isDouble ? "标签 1 (English)" : "单标签 (EN/FR)"} ===\n\n`;
  t += `1: ${v("product_name")}\n`;
  t += `2: ${s.subtitle || ""}\n`;
  if (!isFDA) t += `3: ${v("spec")}\n`;
  t += "\n";

  if (isFDA) {
    t += `HEALTH CLAIMS:\n${prod.recommended_use || ""}\n`;
    t += `\nSUGGESTED DOSE (ADULTS):\n${v("recommended_dose")}\n`;
    t += `\nCAUTIONS:\n${[buildCautionText(s, prod, "en"), s.risk_info].filter(Boolean).join("\n") || ""}\n`;
    t += `\nSTORAGE:\n${DEFAULT_STORAGE_US}\n`;
    t += `\nSupplement Facts\n`;
    t += `Serving Size: ${prod.dose_amount && prod.dosage_form_type ? `${prod.dose_amount} ${prod.dosage_form_type}` : "1 Capsule"}\n`;
    t += `\nMedicinal Ingredients (Amount Per Serving / %DV):\n${v("medicinal_en")}\n`;
    t += `† Daily Value not Established.\n`;
    t += `\nOther Ingredients:\n${excipientMap[s.product_id] || ""}\n`;
    t += `\n*These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.\n`;
    t += `\nDistributor:\n${s.company_info || ""}\n`;
  } else {
    t += `RECOMMENDED USE:\n${prod.recommended_use || ""}\n`;
    if (includeFr) t += `\nUTILISATION RECOMMANDÉE:\n${prod.recommended_use_fr || ""}\n`;
    t += `\nRECOMMENDED DOSE:\n${v("recommended_dose")}\n`;
    if (includeFr) t += `\nDOSE RECOMMANDÉE:\n${s.recommended_dose_fr || ""}\n`;
    t += `\nCAUTIONS:\n${buildCautionText(s, prod, "en")}\n`;
    if (includeFr) t += `\nMISES EN GARDE:\n${buildCautionText(s, prod, "fr")}\n`;
    t += `\nMedicinal Ingredients:\n${v("medicinal_en")}\n`;
    if (includeFr) t += `\nIngrédients médicinaux:\n${v("medicinal_fr")}\n`;
    t += `\nNon-Medicinal:\n${excipientMap[s.product_id] || ""}\n`;
    if (includeFr) t += `\nIngrédients non médicinaux:\n${s.non_medicinal_fr || ""}\n`;
    t += `\nRISK INFORMATION:\n${s.risk_info || ""}\n`;
    if (includeFr) t += `\nRENSEIGNEMENTS SUR LES RISQUES:\n${s.risk_info_fr || ""}\n`;
    t += `\nCOMPANY:\n${s.company_info || ""}\n`;
    if (s.side_bar) t += `\n---\n${s.side_bar}\n`;
    if (isDouble) {
      t += `\n\n=== 标签 2 (Français) ===\n\n`;
      t += `UTILISATION RECOMMANDÉE:\n${prod.recommended_use_fr || ""}\n`;
      t += `\nDOSE RECOMMANDÉE:\n${s.recommended_dose_fr || ""}\n`;
      t += `\nMISES EN GARDE:\n${buildCautionText(s, prod, "fr")}\n`;
      t += `\nIngrédients médicinaux:\n${v("medicinal_fr")}\n`;
      t += `\nIngrédients non médicinaux:\n${s.non_medicinal_fr || ""}\n`;
      t += `\nRENSEIGNEMENTS SUR LES RISQUES:\n${s.risk_info_fr || ""}\n`;
    }
  }

  return t;
}

export function downloadLabelText(label, products, excipientMap) {
  const text = buildExportText(label, products, excipientMap);
  const prod = getProduct(products, label);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `label_${getProdDisplayName(prod) || "draft"}.txt`;
  a.click();
}
