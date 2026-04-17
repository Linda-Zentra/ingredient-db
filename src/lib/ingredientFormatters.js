// ── Medicinal ingredient formatting ──────────────────────────────────────────
// Ported from labelgen — HC monograph format per SOR/2022-146

const SPECIAL_PARTS = ['resin', 'oil', 'juice'];

/**
 * Format a single product_medicinal_ingredient row for label display.
 *
 * Returns { nameCol, qtyCol, line2 }
 *   nameCol: "Scientific name (Common name) (source material)"
 *   qtyCol:  "XX mg"
 *   line2:   "Equivalent to YY g dried ..." (only for extracts)
 */
export function formatMedicinalIngredient(pmi) {
  const {
    common_ingredients: ci,
    amount_value,
    amount_unit,
    extract_ratio,
    dried_herb_equivalent,
    dhe_unit,
    source_material,
    source_part,
    extract_type,
  } = pmi;

  const qty = `${amount_value ?? ''} ${amount_unit ?? ''}`.trim();

  if (!ci) {
    return { nameCol: source_material ?? 'Unknown ingredient', qtyCol: qty, line2: null };
  }

  // "Scientific name (Common name)" — skip parenthetical if identical
  const sci = ci.scientific_name ?? '';
  const common = ci.name_en ?? '';
  const name = (common && common.toLowerCase() !== sci.toLowerCase())
    ? `${sci} (${common})`
    : (sci || common);

  const sourceSuffix = source_material ? ` (${source_material})` : '';

  if (extract_ratio && dried_herb_equivalent && dhe_unit) {
    const part = source_part ?? source_material ?? '';
    const isSpecial = SPECIAL_PARTS.some(s => part.toLowerCase().includes(s));
    const qualifier = isSpecial ? '' : `${extract_type === 'Fresh' ? 'fresh' : 'dried'} `;
    return {
      nameCol: `${name}${sourceSuffix} ${extract_ratio} extract`,
      qtyCol: qty,
      line2: `Equivalent to ${dried_herb_equivalent} ${dhe_unit} ${qualifier}${part}`,
    };
  }

  return { nameCol: `${name}${sourceSuffix}`, qtyCol: qty, line2: null };
}


// ── Sorting ───────────────────────────────────────────────────────────────────

const TO_MG = {
  mg: 1, milligrams: 1,
  g: 1000, grams: 1000,
  mcg: 0.001, micrograms: 0.001, microgram: 0.001,
  'mg at': 1, 'mg ate': 1, 'mcg rae': 0.001, 'mg rae': 1,
};

function getCategory(unit) {
  const u = (unit ?? '').toLowerCase().trim();
  if (TO_MG[u] !== undefined) return 0;                       // mass
  if (['iu', 'international units'].includes(u)) return 1;    // IU
  if (u.includes('cfu')) return 2;                            // probiotics
  if (['%', 'percent'].includes(u)) return 3;                 // percent
  if (u.startsWith('fcc') || u.startsWith('usp')) return 4;  // enzyme
  if (['x', 'ch', 'd', 'c', 'k', 'm', 'lm'].includes(u)) return 5; // homeo
  return 6;
}

/**
 * Sort product_medicinal_ingredient rows by unit category, then amount desc.
 * 7 categories: mass > IU > CFU > % > FCC/USP > homeopathic > other
 */
export function sortMedicinalIngredients(ingredients) {
  return [...ingredients].sort((a, b) => {
    // Use sort_order if available (from import-npn)
    if (a.sort_order != null && b.sort_order != null && a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    const catDiff = getCategory(a.amount_unit) - getCategory(b.amount_unit);
    if (catDiff !== 0) return catDiff;
    const mgA = (TO_MG[(a.amount_unit ?? '').toLowerCase()] ?? 0) * (a.amount_value ?? 0);
    const mgB = (TO_MG[(b.amount_unit ?? '').toLowerCase()] ?? 0) * (b.amount_value ?? 0);
    return mgB - mgA;
  });
}


// ── Allergen statement ────────────────────────────────────────────────────────

const ALLERGEN_DISPLAY = {
  egg:           'egg',
  milk:          'milk',
  soy:           'soy',
  possible_soy:  'soy',
  wheat_gluten:  'gluten (wheat)',
  peanut:        'peanuts',
  tree_nuts:     'tree nuts',
  fish:          'fish',
  shellfish:     'shellfish',
  mollusc:       'molluscs',
  sesame:        'sesame',
  mustard:       'mustard',
  sulphites:     'sulfites',
};

// FDA FALCPA major allergens (9 categories) — filter HC's 13 down to these
const FDA_ALLERGENS = new Set([
  'milk', 'egg', 'peanut', 'tree_nuts', 'wheat_gluten',
  'soy', 'possible_soy', 'fish', 'shellfish', 'sesame',
]);

/**
 * Format allergen types into a "Contains: ..." statement.
 * @param {string[]} allergenTypes - combined from all ingredients + excipients
 * @param {'hc'|'fda'} format - 'fda' filters to FALCPA 9 categories
 */
export function formatAllergenStatement(allergenTypes, format = 'hc') {
  if (!allergenTypes?.length) return null;
  let types = [...new Set(allergenTypes)];
  if (format === 'fda') {
    types = types.filter(a => FDA_ALLERGENS.has(a));
  }
  const labels = types
    .map(a => ALLERGEN_DISPLAY[a])
    .filter(Boolean);
  if (!labels.length) return null;
  const unique = [...new Set(labels)];
  return format === 'fda'
    ? `Contains: ${unique.join(', ')}.`
    : `Allergen: ${unique.join(', ')}`;
}


/**
 * Format excipient name with allergen annotation.
 * e.g. "Gelatin capsule (fish)"
 */
export function formatExcipientWithAllergen(pe, lang = 'en') {
  const exc = pe.excipients;
  if (!exc) return '';
  const name = lang === 'fr'
    ? (exc.name_fr || exc.name || '')
    : (exc.name || '');
  const allergens = exc.allergen_types ?? [];
  if (!allergens.length) return name;
  const labels = allergens.map(a => ALLERGEN_DISPLAY[a]).filter(Boolean);
  if (!labels.length) return name;
  return `${name} (${[...new Set(labels)].join(', ')})`;
}


/**
 * Split purposes array into individual claims.
 * HC sometimes concatenates purposes with ".  " separators.
 */
export function splitPurposes(arr) {
  return (arr ?? [])
    .flatMap(p => p.split('\n'))
    .flatMap(p => p.split(/\.\s{2,}/))
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => /[.!?]$/.test(s) ? s : s + '.');
}


/**
 * Build the per-dose statement heading.
 * HC: "Each capsule contains" / "In each 5 mL"
 */
export function buildPerDoseStatement(product) {
  if (!product) return null;
  const form = (product.dosage_form_type ?? '').toLowerCase();
  const sub = (product.dosage_form_subtype ?? '').toLowerCase();

  if (/liquid|solution|syrup|drops|tincture|elixir/.test(form)) {
    const amt = product.dose_amount;
    const unit = product.dose_unit ?? 'mL';
    return amt ? `In each ${amt} ${unit}` : 'In each dose';
  }

  const formMap = {
    capsule: 'capsule', softgel: 'softgel', tablet: 'tablet',
    caplet: 'caplet', lozenge: 'lozenge', chewable: 'chewable tablet',
    powder: 'dose', gummy: 'gummy', gummies: 'gummy',
  };
  for (const [key, label] of Object.entries(formMap)) {
    if (form.includes(key) || sub.includes(key)) return `Each ${label} contains`;
  }
  return 'Each dose contains';
}


/**
 * Collect all allergen types from ingredients + excipients.
 */
export function collectAllergens(medicinalIngredients, excipientRows) {
  const all = [];
  for (const pmi of (medicinalIngredients ?? [])) {
    const ci = pmi.common_ingredients;
    if (ci?.allergen_types?.length) all.push(...ci.allergen_types);
  }
  for (const pe of (excipientRows ?? [])) {
    if (pe.excipients?.allergen_types?.length) all.push(...pe.excipients.allergen_types);
  }
  return [...new Set(all)];
}
