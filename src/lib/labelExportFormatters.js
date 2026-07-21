const SPECIAL_PARTS = ["resin", "oil", "juice", "resine", "huile", "jus"];

function text(value) {
  return value == null ? "" : String(value).trim();
}

function normalized(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasValue(value) {
  return value !== null && value !== undefined && text(value) !== "";
}

export function isChemicalLikeName(value) {
  const name = text(value);
  if (!name) return false;
  if (name.length >= 55) return true;
  if (/^[[(]/.test(name) && /\d/.test(name)) return true;
  const punctuation = (name.match(/[-,()[\]]/g) || []).length;
  return /\d/.test(name) && punctuation >= 5;
}

function isBotanicalName(value) {
  return /^[A-Z][a-z]+\s+[a-z][a-z-]+(?:\s+[a-z][a-z-]+)?$/.test(text(value));
}

function isStereochemicalCommonName(value) {
  return /^(?:L|D|DL)-[A-Za-z]/i.test(text(value));
}

function formatSource(value) {
  return text(value)
    .replace(/\s+-\s+/g, ", ")
    .replace(/\s+/g, " ");
}

function extractSourcePart(value) {
  const source = text(value);
  if (!source) return "";
  const delimiter = source.indexOf(" - ");
  return delimiter === -1 ? source : source.slice(delimiter + 3).trim();
}

function chooseReadableName(ci, lang, form) {
  const scientific = text(ci?.scientific_name);
  const commonEn = [text(ci?.name_en), ...(ci?.common_names_en || []).map(text)].filter(Boolean);
  const commonFr = [text(ci?.name_fr), ...(ci?.common_names_fr || []).map(text)].filter(Boolean);
  const formEn = text(form?.name_en);
  const formFr = text(form?.name_fr);

  if (form) {
    const localForm = lang === "fr" ? formFr : formEn;
    const fallbackForm = lang === "fr" ? formEn : formFr;
    if (localForm) return { name: localForm, missingLanguage: null };
    if (fallbackForm) return { name: fallbackForm, missingLanguage: lang };
  }

  if (lang === "fr") {
    if (commonFr.length) {
      const exactScientificName = isStereochemicalCommonName(scientific)
        ? commonFr.find(name => normalized(name) === normalized(scientific))
        : null;
      return {
        name: exactScientificName || commonFr.find(n => !isChemicalLikeName(n)) || commonFr[0],
        missingLanguage: null,
      };
    }
    if (isBotanicalName(scientific)) {
      return { name: scientific, missingLanguage: null };
    }

    const fallback = commonEn.find(n => !isChemicalLikeName(n)) || commonEn[0] || scientific;
    return { name: fallback, missingLanguage: fallback ? "fr" : null };
  }

  const exactScientificName = isStereochemicalCommonName(scientific)
    ? commonEn.find(name => normalized(name) === normalized(scientific))
    : null;
  const readableCommon = commonEn.find(n => !isChemicalLikeName(n));
  return {
    name: exactScientificName || readableCommon || commonEn[0] || scientific,
    missingLanguage: null,
  };
}

function buildSourceSuffix(pmi, ci, chosenName, form, lang) {
  const englishMaterial = text(pmi?.source_material);
  const frenchMaterial = text(pmi?.source_material_fr);
  const englishPart = text(pmi?.source_part);
  const frenchPart = text(pmi?.source_part_fr);
  const rawMaterial = lang === "fr" ? (frenchMaterial || englishMaterial) : englishMaterial;
  const rawPart = lang === "fr"
    ? (frenchPart || (frenchMaterial ? "" : englishPart))
    : englishPart;
  if (!rawMaterial && !rawPart) return { text: "", frenchFallbacks: [] };

  const knownNames = [
    chosenName,
    ci?.scientific_name,
    ci?.name_en,
    ci?.name_fr,
    ...(ci?.common_names_en || []),
    ...(ci?.common_names_fr || []),
    form?.name_en,
    form?.name_fr,
  ].map(normalized).filter(Boolean);

  const materialKey = normalized(rawMaterial);
  const materialIsDuplicate = materialKey && (
    knownNames.includes(materialKey) || normalized(chosenName).includes(materialKey)
  );
  const sourceParts = [];
  const frenchFallbacks = [];

  if (rawMaterial && !materialIsDuplicate) {
    sourceParts.push(formatSource(rawMaterial));
    if (lang === "fr" && !frenchMaterial) frenchFallbacks.push(englishMaterial);
  }

  const partKey = normalized(rawPart);
  const materialAlreadyIncludesPart = partKey && materialKey.includes(partKey);
  if (rawPart && !materialAlreadyIncludesPart) {
    sourceParts.push(formatSource(rawPart));
    if (lang === "fr" && !frenchPart) frenchFallbacks.push(englishPart);
  }

  return {
    text: sourceParts.join(", "),
    frenchFallbacks: [...new Set(frenchFallbacks.filter(Boolean))],
  };
}

function formatAmount(value, unit) {
  if (!hasValue(value) && !text(unit)) return "";
  return [hasValue(value) ? text(value) : "", text(unit)].filter(Boolean).join(" ");
}

/**
 * Compact formatter used only by TXT export. It favours curated common names,
 * suppresses duplicate source text, and keeps dosage/extract facts intact.
 */
export function formatMedicinalIngredientForExport(pmi, lang = "en") {
  const ci = pmi?.ingredients;
  const forms = [...(pmi?.skus?.sku_forms || [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const namedForm = forms.find(form => text(form.name_en) || text(form.name_fr));
  const selected = chooseReadableName(ci, lang, namedForm);
  const brandName = text(pmi?.skus?.brand_name);
  const formAmount = namedForm ? formatAmount(namedForm.amount, namedForm.unit) : "";
  const selectedName = [selected.name, formAmount].filter(Boolean).join(" ");
  const primaryName = selectedName || (lang === "fr" ? text(pmi?.source_material_fr) : "") || text(pmi?.source_material) || (lang === "fr" ? "Ingrédient inconnu" : "Unknown ingredient");
  let displayName = [brandName, primaryName].filter(Boolean).join(" ");
  const warnings = [];

  if (selected.missingLanguage) {
    const languageName = selected.missingLanguage === "fr" ? "French" : "English";
    const marker = selected.missingLanguage.toUpperCase();
    warnings.push(`Missing ${languageName} medicinal name: ${displayName}`);
    displayName = `[${marker} missing] ${displayName}`;
  }

  const source = buildSourceSuffix(pmi, ci, selected.name, namedForm, lang);
  if (source.text) displayName += ` (${source.text})`;
  if (source.frenchFallbacks.length) {
    warnings.push(`Missing French source material: ${source.frenchFallbacks.join(" / ")}`);
  }

  if (text(pmi?.extract_ratio)) {
    displayName += lang === "fr"
      ? `, extrait ${text(pmi.extract_ratio)}`
      : `, ${text(pmi.extract_ratio)} extract`;
  }

  const quantity = formatAmount(pmi?.amount_value, pmi?.amount_unit);
  const mainLine = [displayName, quantity].filter(Boolean).join("  ");
  const detailLines = [];

  if (hasValue(pmi?.dried_herb_equivalent) && text(pmi?.dhe_unit)) {
    const equivalent = formatAmount(pmi?.dried_herb_equivalent, pmi?.dhe_unit);
    const localizedMaterial = lang === "fr" ? text(pmi?.source_material_fr) : "";
    const part = formatSource(
      lang === "fr"
        ? text(pmi?.source_part_fr) || extractSourcePart(localizedMaterial) || text(pmi?.source_part)
        : text(pmi?.source_part),
    );
    const special = SPECIAL_PARTS.some(token => normalized(part).includes(token));
    const englishExtractType = text(pmi?.extract_type);
    const frenchExtractType = text(pmi?.extract_type_fr);
    const extractType = lang === "fr" ? (frenchExtractType || englishExtractType) : englishExtractType;
    const fresh = /\b(?:fresh|frais)\b/.test(normalized(extractType));
    const qualifier = special
      ? ""
      : (lang === "fr"
        ? (fresh ? "frais " : "sec ")
        : (fresh ? "fresh " : "dried "));
    const equivalentLabel = lang === "fr" ? "Équivalent à" : "Equivalent to";
    detailLines.push(`${equivalentLabel} ${equivalent}${part ? ` ${qualifier}${part}` : ""}`.trim());
    if (lang === "fr" && englishExtractType && !frenchExtractType) {
      warnings.push(`Derived French extract type from English: ${englishExtractType}`);
    }
  }

  for (const form of forms) {
    if (text(form.note)) detailLines.push(`(${text(form.note)})`);
    if (!form.show_contains) continue;
    const containsName = lang === "fr"
      ? text(form.contains_name_fr) || text(form.contains_name_en)
      : text(form.contains_name_en);
    if (!containsName) continue;
    const missingContainsFr = lang === "fr" && !text(form.contains_name_fr);
    if (missingContainsFr) warnings.push(`Missing French contained-ingredient name: ${containsName}`);
    const containsAmount = formatAmount(form.contains_amount, form.contains_unit);
    const prefix = lang === "fr" ? "Contient" : "Contains";
    detailLines.push(`${prefix} ${missingContainsFr ? "[FR missing] " : ""}${containsName}${containsAmount ? ` ${containsAmount}` : ""}`);
  }

  return {
    text: [mainLine, ...detailLines.map(line => `  ${line}`)].filter(Boolean).join("\n"),
    warnings,
  };
}

export function buildMedicinalExportSection(ingredients, lang = "en") {
  const warnings = [];
  const seen = new Set();
  const lines = [];

  for (const ingredient of ingredients || []) {
    const formatted = formatMedicinalIngredientForExport(ingredient, lang);
    if (!formatted.text || seen.has(formatted.text)) continue;
    seen.add(formatted.text);
    lines.push(formatted.text);
    warnings.push(...formatted.warnings);
  }

  return {
    text: lines.join("\n"),
    warnings: [...new Set(warnings)],
  };
}

/**
 * Build EN/FR lists from the same sorted rows so a missing translation cannot
 * shift every following excipient into the wrong apparent pairing.
 */
export function buildPairedExcipientLists(productExcipients) {
  const unique = new Map();

  for (const row of productExcipients || []) {
    const excipient = row?.excipients || row;
    const en = text(excipient?.name);
    if (!en) continue;
    const key = excipient?.id != null ? `id:${excipient.id}` : `name:${normalized(en)}`;
    if (!unique.has(key)) {
      unique.set(key, {
        en,
        fr: text(excipient?.name_fr),
        row,
      });
    }
  }

  const pairs = [...unique.values()].sort((a, b) =>
    a.en.localeCompare(b.en, "en", { sensitivity: "base" })
  );
  const warnings = [];
  const frNames = pairs.map(pair => {
    if (pair.fr) return pair.fr;
    warnings.push(`Missing French non-medicinal name: ${pair.en}`);
    return `[FR missing: ${pair.en}]`;
  });

  return {
    en: pairs.map(pair => pair.en).join(", "),
    fr: frNames.join(", "),
    rows: pairs.map(pair => pair.row),
    warnings: [...new Set(warnings)],
  };
}
