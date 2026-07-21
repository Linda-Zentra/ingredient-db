import { sortMedicinalIngredients } from "./ingredientFormatters";
import { buildMedicinalExportSection, buildPairedExcipientLists } from "./labelExportFormatters";
import { computeRecommendedDose, computeRecommendedDoseFr } from "./labelDose";

export function getProduct(products, label) {
  return products.find(p => p.id === label?.product_id);
}

export function getProdDisplayName(prod) {
  if (!prod) return "";
  const def = (prod.product_brands || []).find(pb => pb.is_default);
  return def?.brand_name || prod.product_brands?.[0]?.brand_name || prod.product_name_zh || "";
}

export function buildExcipientMaps(products) {
  const excipientMap = {};
  const excipientMapFr = {};
  const excipientRowsMap = {};
  products.forEach(p => {
    const paired = buildPairedExcipientLists(p.product_excipients || []);
    if (paired.en) excipientMap[p.id] = paired.en;
    if (paired.fr) excipientMapFr[p.id] = paired.fr;
    if (paired.rows.length) excipientRowsMap[p.id] = paired.rows;
  });
  return { excipientMap, excipientMapFr, excipientRowsMap };
}

export function buildCautionText(prod, lang) {
  if (!prod) return "";
  const fr = lang === "fr";
  const parts = [];
  const add = (heading, items) => {
    if (!items?.length) return;
    const text = items.join(" ");
    if (text.toLowerCase().startsWith(heading.toLowerCase().split(" ")[0])) {
      parts.push(text);
    } else {
      parts.push(`${heading}: ${text}`);
    }
  };
  if (fr) {
    add("Ne pas utiliser si", prod.do_not_use_fr);
    add("Consulter un praticien si", prod.ask_before_use_fr);
    add("Lors de l'utilisation", prod.when_using_fr);
    add("Cesser l'utilisation si", prod.stop_use_fr);
    if (prod.known_adverse_fr?.length) parts.push(prod.known_adverse_fr.join(" "));
    if (prod.other_warnings_fr?.length) parts.push(prod.other_warnings_fr.join(" "));
  } else {
    add("Do not use if", prod.do_not_use_en);
    add("Consult a health care practitioner prior to use if", prod.ask_before_use_en);
    add("When using this product", prod.when_using_en);
    add("Stop use and ask a doctor if", prod.stop_use_en);
    if (prod.known_adverse_en?.length) parts.push(prod.known_adverse_en.join(" "));
    if (prod.other_warnings_en?.length) parts.push(prod.other_warnings_en.join(" "));
  }
  return parts.join("\n") || "";
}

export function getVal(sec, label, products, excipientMap) {
  const prod = getProduct(products, label);

  if (sec.source === "product") return prod?.[sec.field] || "";

  if (sec.source === "computed") {
    switch (sec.key) {
      case "product_name":
        return getProdDisplayName(prod);

      case "spec": {
        const parts = [prod?.dosage_form_type, prod?.dosage_form_subtype].filter(Boolean).join(" ");
        const npn = prod?.npn ? `NPN: ${prod.npn}` : "";
        return [parts, npn].filter(Boolean).join("  ") || "";
      }

      case "recommended_dose":
        return computeRecommendedDose(prod);

      case "recommended_dose_fr":
        return computeRecommendedDoseFr(prod);

      case "medicinal_en": {
        const ingredients = sortMedicinalIngredients(prod?.product_ingredients || []);
        return buildMedicinalExportSection(ingredients, "en").text;
      }

      case "medicinal_fr": {
        const ingredients = sortMedicinalIngredients(prod?.product_ingredients || []);
        return buildMedicinalExportSection(ingredients, "fr").text;
      }

      case "authorization_claims": {
        const ingredients = prod?.product_ingredients || [];
        const claims = ingredients
          .map(pmi => pmi.skus?.authorization_claims)
          .filter(Boolean);
        return [...new Set(claims)].join("\n") || "";
      }

      case "non_medicinal":
        return excipientMap[label?.product_id] || "";

      default:
        return "";
    }
  }

  // Label fields now live on the product
  return prod?.[sec.key] || label?.[sec.key] || "";
}
