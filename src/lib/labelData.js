import { sortMedicinalIngredients } from "./ingredientFormatters";

export function getProduct(products, label) {
  return products.find(p => p.id === label?.product_id);
}

export function getProdDisplayName(prod) {
  if (!prod) return "";
  const def = (prod.product_brands || []).find(pb => pb.is_default);
  return def?.brand_name || prod.product_brands?.[0]?.brand_name || prod.product_name || "";
}

export function buildExcipientMaps(products) {
  const excipientMap = {};
  const excipientRowsMap = {};
  products.forEach(p => {
    const names = (p.product_excipients || []).map(pe => pe.excipients?.name).filter(Boolean);
    if (names.length) excipientMap[p.id] = names.join(", ");
    if (p.product_excipients?.length) excipientRowsMap[p.id] = p.product_excipients;
  });
  return { excipientMap, excipientRowsMap };
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

      case "recommended_dose": {
        if (!prod?.dose_amount) return "";
        const amount = prod.dose_amount_max
          ? `${prod.dose_amount}–${prod.dose_amount_max}`
          : `${prod.dose_amount}`;
        const unit = prod.dose_unit || "";
        const freq = prod.dose_freq_max
          ? `${prod.dose_freq_min}–${prod.dose_freq_max}`
          : `${prod.dose_freq_min || ""}`;
        const freqUnit = prod.dose_freq_unit || "";
        return `Take ${amount} ${unit}, ${freq} times ${freqUnit}, or as directed by a healthcare practitioner.`.trim();
      }

      case "medicinal_en": {
        const ingredients = prod?.product_medicinal_ingredients || [];
        const fmtAmount = (pmi) => {
          const a1 = pmi.amount_value && pmi.amount_unit ? `${pmi.amount_value} ${pmi.amount_unit}` : null;
          const a2 = pmi.amount_value2 && pmi.amount_unit2 ? `${pmi.amount_value2} ${pmi.amount_unit2}` : null;
          return [a1, a2].filter(Boolean).join(" ");
        };
        return sortMedicinalIngredients(ingredients)
          .map(pmi => [pmi.common_ingredients?.name_en, fmtAmount(pmi)].filter(Boolean).join("  "))
          .filter(Boolean)
          .join("\n") || "";
      }

      case "medicinal_fr": {
        const ingredients = prod?.product_medicinal_ingredients || [];
        const fmtAmount = (pmi) => {
          const a1 = pmi.amount_value && pmi.amount_unit ? `${pmi.amount_value} ${pmi.amount_unit}` : null;
          const a2 = pmi.amount_value2 && pmi.amount_unit2 ? `${pmi.amount_value2} ${pmi.amount_unit2}` : null;
          return [a1, a2].filter(Boolean).join(" ");
        };
        return sortMedicinalIngredients(ingredients)
          .map(pmi => [pmi.common_ingredients?.name_fr, fmtAmount(pmi)].filter(Boolean).join("  "))
          .filter(Boolean)
          .join("\n") || "";
      }

      case "authorization_claims": {
        const ingredients = prod?.product_medicinal_ingredients || [];
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

  return label?.[sec.key] || "";
}
