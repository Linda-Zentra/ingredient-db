const NUMERIC_FIELDS = [
  "quantity",
  "quantity_minimum",
  "quantity_maximum",
  "potency_amount",
  "ratio_numerator",
  "ratio_denominator",
  "dried_herb_equivalent",
];

const UNIT_FIELDS = [
  "quantity_unit_of_measure",
  "potency_unit_of_measure",
  "dhe_unit_of_measure",
];

const MASS_UNITS = new Set(["g", "mg", "mcg", "µg", "ug", "ml", "l"]);

const MERGE_FALLBACK_FIELDS = [
  "ingredient_name_fr",
  "source_material",
  "source_material_fr",
  "source_part_fr",
  "extract_type_desc",
  "extract_type_fr",
  "ratio_numerator",
  "ratio_denominator",
  "dried_herb_equivalent",
  "dhe_unit_of_measure",
];

function comparable(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function localizedText(value) {
  return comparable(value) ? String(value).trim() : null;
}

export function filterDistinctLocalizedTexts(primaryValues, localizedValues) {
  const primary = new Set(
    (Array.isArray(primaryValues) ? primaryValues : [])
      .map(comparable)
      .filter(Boolean),
  );

  return (Array.isArray(localizedValues) ? localizedValues : [])
    .map(localizedText)
    .filter(value => value && !primary.has(comparable(value)));
}

export function extractSourcePart(sourceMaterial) {
  const source = localizedText(sourceMaterial);
  if (!source) return null;
  const delimiter = source.indexOf(" - ");
  return delimiter === -1 ? source : source.slice(delimiter + 3).trim();
}

function comparableUnit(value) {
  return comparable(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[µμ]g/g, "mcg")
    .replace(/\b(?:rae|ear)\b/g, "rae")
    .replace(/\b(?:milliards?|billions?)\b/g, "billion")
    .replace(/\bd['’]\s*(?=ufc\b)/g, "")
    .replace(/\b(?:cfu|ufc)\b/g, "cfu")
    .replace(/\b(?:microgrammes?|micrograms?)\b/g, "mcg")
    .replace(/\b(?:milligrammes?|milligrams?)\b/g, "mg")
    .replace(/\b(?:kilogrammes?|kilograms?)\b/g, "kg")
    .replace(/\b(?:grammes?|grams?)\b/g, "g")
    .replace(/\b(?:millilitres?|milliliters?)\b/g, "ml")
    .replace(/\b(?:litres?|liters?)\b/g, "l")
    .replace(/\b(?:unites? internationales?|international units?)\b/g, "iu")
    .replace(/\b(?:unites? formant colonies?|colony forming units?)\b/g, "cfu")
    .replace(/\bui\b/g, "iu")
    .replace(/[^a-z0-9%]+/g, "");
}

function sameProduct(a, b) {
  const productId = comparable(a?.lnhpd_id);
  return productId !== "" && productId === comparable(b?.lnhpd_id);
}

function hasStructure(row) {
  return NUMERIC_FIELDS.some(field => comparable(row?.[field]) !== "") ||
    UNIT_FIELDS.some(field => comparableUnit(row?.[field]) !== "");
}

function sameStructure(a, b) {
  if (!sameProduct(a, b)) return false;
  return NUMERIC_FIELDS.every(field => comparable(a?.[field]) === comparable(b?.[field])) &&
    UNIT_FIELDS.every(field => comparableUnit(a?.[field]) === comparableUnit(b?.[field]));
}

function isMassUnit(value) {
  return MASS_UNITS.has(comparableUnit(value));
}

function ingredientKey(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4\uFF07]/g, "'");
}

function isMissing(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Pair localized HC rows using invariant product/dose structure. A medicinal
 * structure must identify exactly one row in both languages; ambiguous rows
 * stay untranslated. Non-medicinal responses have no invariant fields, so
 * they use HC's shared position only when both response lengths match.
 */
export function pairLocalizedIngredientRows(englishRows, frenchRows, { allowPositional = false } = {}) {
  const english = Array.isArray(englishRows) ? englishRows : [];
  const french = Array.isArray(frenchRows) ? frenchRows : [];
  const sameLength = english.length === french.length;

  return english.map((englishRow, index) => {
    let frenchRow = null;

    if (hasStructure(englishRow)) {
      const matchingEnglish = english.filter(candidate => sameStructure(englishRow, candidate));
      const matchingFrench = french.filter(candidate => sameStructure(englishRow, candidate));
      if (matchingEnglish.length === 1 && matchingFrench.length === 1) {
        frenchRow = matchingFrench[0];
      }
    } else if (allowPositional) {
      const positional = french[index];
      if (sameLength && positional && sameProduct(englishRow, positional)) {
        frenchRow = positional;
      }
    }

    const frenchName = localizedText(frenchRow?.ingredient_name);
    const sourceMaterialFr = localizedText(frenchRow?.source_material);
    return {
      ...englishRow,
      ingredient_name_fr: frenchName,
      source_material_fr: sourceMaterialFr,
      source_part_fr: extractSourcePart(sourceMaterialFr),
      extract_type_fr: localizedText(frenchRow?.extract_type_desc),
    };
  });
}

/**
 * Merge the mass and potency representations emitted by LNHPD for one
 * ingredient without dropping source/provenance fields held by either row.
 */
export function mergeLocalizedIngredientRows(items) {
  const groups = new Map();
  for (const item of items || []) {
    const key = ingredientKey(item?.ingredient_name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const result = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    const massEntry = group.find(item => isMassUnit(item?.quantity_unit_of_measure));
    const potencyEntry = group.find(item => !isMassUnit(item?.quantity_unit_of_measure) && item?.quantity);
    if (!massEntry || !potencyEntry) {
      result.push(group[0]);
      continue;
    }

    const merged = {
      ...massEntry,
      potency_amount: potencyEntry.quantity,
      potency_label: potencyEntry.quantity_unit_of_measure,
    };
    for (const field of MERGE_FALLBACK_FIELDS) {
      if (isMissing(merged[field]) && !isMissing(potencyEntry[field])) {
        merged[field] = potencyEntry[field];
      }
    }
    result.push(merged);
  }

  return result;
}
