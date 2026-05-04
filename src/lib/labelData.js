import { sortMedicinalIngredients } from "./ingredientFormatters";

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
        if (!prod?.dose_amount && !prod?.dose_amount_max) return "";
        const pop = prod.dose_population || "Adults";
        const doseMin = prod.dose_amount || 1;
        const doseMax = prod.dose_amount_max;
        const amount = doseMax && doseMax !== doseMin
          ? `${doseMin}-${doseMax}`
          : `${doseMin}`;
        const unit = prod.dose_unit || "capsule(s)";
        const freqMin = prod.dose_freq_min || "";
        const freqMax = prod.dose_freq_max || "";
        const freqUnit = prod.dose_freq_unit || "daily";
        const times = freqMax && freqMax !== freqMin
          ? `${freqMin}-${freqMax}`
          : freqMin;
        const timesStr = times
          ? (String(times) === "1" ? freqUnit : `${times} time(s) ${freqUnit}`)
          : freqUnit;
        return `${pop}: Take ${amount} ${unit} ${timesStr}, or as directed by a health care practitioner.`.trim();
      }

      case "medicinal_en": {
        const ingredients = prod?.product_ingredients || [];
        const fmtAmount = (pmi) => {
          const a1 = pmi.amount_value && pmi.amount_unit ? `${pmi.amount_value} ${pmi.amount_unit}` : null;
          return a1 || "";
        };
        return sortMedicinalIngredients(ingredients)
          .map(pmi => [pmi.ingredients?.name_en || pmi.ingredients?.scientific_name, fmtAmount(pmi)].filter(Boolean).join("  "))
          .filter(Boolean)
          .join("\n") || "";
      }

      case "medicinal_fr": {
        const ingredients = prod?.product_ingredients || [];
        const fmtAmount = (pmi) => {
          const a1 = pmi.amount_value && pmi.amount_unit ? `${pmi.amount_value} ${pmi.amount_unit}` : null;
          return a1 || "";
        };
        return sortMedicinalIngredients(ingredients)
          .map(pmi => [pmi.ingredients?.name_fr || pmi.ingredients?.name_en, fmtAmount(pmi)].filter(Boolean).join("  "))
          .filter(Boolean)
          .join("\n") || "";
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
