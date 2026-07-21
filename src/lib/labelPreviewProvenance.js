const CAUTION_FIELD_PAIRS = [
  ["do_not_use_en", "do_not_use_fr", "do not use"],
  ["ask_before_use_en", "ask_before_use_fr", "ask before use"],
  ["when_using_en", "when_using_fr", "when using"],
  ["stop_use_en", "stop_use_fr", "stop use"],
  ["known_adverse_en", "known_adverse_fr", "known adverse reactions"],
  ["other_warnings_en", "other_warnings_fr", "other warnings"],
];

function valueCount(value) {
  if (Array.isArray(value)) return value.filter(item => String(item || "").trim()).length;
  return String(value || "").trim() ? 1 : 0;
}

export function getMissingFrenchHcFields(product = {}) {
  const missing = [];

  if (valueCount(product.recommended_use) > valueCount(product.recommended_use_fr)) {
    missing.push("recommended use");
  }

  for (const [englishKey, frenchKey, label] of CAUTION_FIELD_PAIRS) {
    if (valueCount(product[englishKey]) > valueCount(product[frenchKey])) {
      missing.push(label);
    }
  }

  return missing;
}
