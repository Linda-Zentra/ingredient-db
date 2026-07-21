import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMedicinalExportSection,
  buildPairedExcipientLists,
  formatMedicinalIngredientForExport,
} from "../src/lib/labelExportFormatters.js";

test("TXT export prefers a readable common name over a long IUPAC name", () => {
  const iupac = "2,5-Cyclohexadiene-1,4-dione, 2-[(2E,6E,10E,14E,18E,22E,26E,30E,34E)-3,7,11,15,19,23,27,31,35,39-decamethyl-2,6,10,14,18,22,26,30,34,38-tetracontadecaenyl]-5,6-dimethoxy-3-methyl";
  const formatted = formatMedicinalIngredientForExport({
    ingredients: {
      scientific_name: iupac,
      name_en: "Coenzyme Q10",
      name_fr: "Coenzyme Q10",
    },
    source_material: "Coenzyme Q10",
    amount_value: 100,
    amount_unit: "mg",
  });

  assert.equal(formatted.text, "Coenzyme Q10  100 mg");
  assert.ok(!formatted.text.includes("Cyclohexadiene"));
  assert.deepEqual(formatted.warnings, []);
});

test("NHPID stereochemical common name is preferred over a broader short name", () => {
  const row = {
    ingredients: {
      scientific_name: "L-Arginine",
      name_en: "Arginine",
      name_fr: "Arginine",
      common_names_en: ["Arginine", "L-Arginine"],
      common_names_fr: ["Arginine", "L-Arginine"],
    },
    amount_value: 500,
    amount_unit: "mg",
  };

  assert.equal(formatMedicinalIngredientForExport(row, "en").text, "L-Arginine  500 mg");
  assert.equal(formatMedicinalIngredientForExport(row, "fr").text, "L-Arginine  500 mg");
});

test("botanical exports keep the friendly common name when Latin is also listed", () => {
  const formatted = formatMedicinalIngredientForExport({
    ingredients: {
      scientific_name: "Rhodiola rosea",
      name_en: "Golden root",
      common_names_en: ["Rhodiola rosea", "Golden root"],
    },
    amount_value: 200,
    amount_unit: "mg",
  });

  assert.equal(formatted.text, "Golden root  200 mg");
});

test("TXT export retains meaningful botanical source and extract facts", () => {
  const formatted = formatMedicinalIngredientForExport({
    ingredients: {
      scientific_name: "Rhodiola rosea",
      name_en: "Hong jing tian",
      name_fr: "Couronne du roi",
    },
    source_material: "Rhodiola rosea - Root",
    source_part: "Root",
    extract_ratio: "5:1",
    extract_type: "Dry",
    dried_herb_equivalent: 1000,
    dhe_unit: "mg",
    amount_value: 200,
    amount_unit: "mg",
  });

  assert.match(formatted.text, /^Hong jing tian \(Rhodiola rosea, Root\), 5:1 extract {2}200 mg/);
  assert.match(formatted.text, /Equivalent to 1000 mg dried Root/);
});

test("French export uses exact product-level French source metadata", () => {
  const formatted = formatMedicinalIngredientForExport({
    ingredients: {
      scientific_name: "Rhodiola rosea",
      name_en: "Hong jing tian",
      name_fr: "Couronne du roi",
    },
    source_material: "Rhodiola rosea - Root",
    source_material_fr: "Rhodiola rosea - Racine",
    source_part: "Root",
    source_part_fr: "Racine",
    extract_ratio: "5:1",
    extract_type: "Dry",
    extract_type_fr: "Matériel brut sec",
    dried_herb_equivalent: 1000,
    dhe_unit: "mg",
    amount_value: 200,
    amount_unit: "mg",
  }, "fr");

  assert.equal(
    formatted.text,
    "Couronne du roi (Rhodiola rosea, Racine), extrait 5:1  200 mg\n  Équivalent à 1000 mg sec Racine",
  );
  assert.deepEqual(formatted.warnings, []);
});

test("French export flags English source fallback instead of presenting it as official French", () => {
  const formatted = formatMedicinalIngredientForExport({
    ingredients: {
      scientific_name: "Rhodiola rosea",
      name_en: "Hong jing tian",
      name_fr: "Couronne du roi",
    },
    source_material: "Rhodiola rosea - Root",
    source_part: "Root",
    extract_ratio: "5:1",
    extract_type: "Dry",
    dried_herb_equivalent: 1000,
    dhe_unit: "mg",
    amount_value: 200,
    amount_unit: "mg",
  }, "fr");

  assert.match(formatted.text, /Rhodiola rosea, Root/);
  assert.deepEqual(formatted.warnings, [
    "Missing French source material: Rhodiola rosea - Root",
    "Derived French extract type from English: Dry",
  ]);
});

test("French oil, juice, and resin source parts do not receive a dry qualifier", () => {
  const formatted = formatMedicinalIngredientForExport({
    ingredients: { scientific_name: "Example source", name_fr: "Exemple" },
    source_material: "Example source - Oil",
    source_material_fr: "Example source - Huile",
    source_part: "Oil",
    source_part_fr: "Huile",
    dried_herb_equivalent: 100,
    dhe_unit: "mg",
    amount_value: 10,
    amount_unit: "mg",
  }, "fr");

  assert.match(formatted.text, /Équivalent à 100 mg Huile/);
  assert.ok(!formatted.text.includes("sec Huile"));
});

test("TXT export retains a separately stored plant part when source material is redundant", () => {
  const formatted = formatMedicinalIngredientForExport({
    ingredients: {
      scientific_name: "Rhodiola rosea",
      name_en: "Hong jing tian",
      name_fr: "Couronne du roi",
    },
    source_material: "Rhodiola rosea",
    source_part: "Root",
    amount_value: 200,
    amount_unit: "mg",
  });

  assert.equal(formatted.text, "Hong jing tian (Root)  200 mg");
});

test("missing French medicinal names are visible instead of silently copied", () => {
  const formatted = formatMedicinalIngredientForExport({
    ingredients: { scientific_name: "Ubiquinol", name_en: null, name_fr: null },
    source_material: "Ubiquinol",
    amount_value: 50,
    amount_unit: "mg",
  }, "fr");

  assert.equal(formatted.text, "[FR missing] Ubiquinol  50 mg");
  assert.deepEqual(formatted.warnings, ["Missing French medicinal name: Ubiquinol"]);
});

test("NHPID common-name arrays satisfy a missing scalar French name", () => {
  const formatted = formatMedicinalIngredientForExport({
    ingredients: {
      scientific_name: "Ubiquinol",
      name_en: null,
      name_fr: null,
      common_names_en: ["Ubiquinol"],
      common_names_fr: ["Ubiquinol"],
    },
    source_material: "Ubiquinol",
    amount_value: 50,
    amount_unit: "mg",
  }, "fr");

  assert.equal(formatted.text, "Ubiquinol  50 mg");
  assert.deepEqual(formatted.warnings, []);
});

test("explicit SKU brand and form remain in compact export", () => {
  const formatted = formatMedicinalIngredientForExport({
    ingredients: { scientific_name: "Phaseolus vulgaris", name_en: "Kidney bean" },
    skus: {
      brand_name: "Phase2®",
      sku_forms: [{ name_en: "White Kidney Bean", amount: 250, unit: "mg", sort_order: 0 }],
    },
    amount_value: 500,
    amount_unit: "mg",
  });

  assert.equal(formatted.text, "Phase2® White Kidney Bean 250 mg  500 mg");
});

test("EN and FR select the same SKU form row", () => {
  const row = {
    ingredients: { scientific_name: "Example", name_en: "Example", name_fr: "Exemple" },
    skus: {
      sku_forms: [
        { name_en: "First form", sort_order: 0 },
        { name_fr: "Deuxième forme", sort_order: 1 },
      ],
    },
    amount_value: 10,
    amount_unit: "mg",
  };

  const english = formatMedicinalIngredientForExport(row, "en");
  const french = formatMedicinalIngredientForExport(row, "fr");
  assert.equal(english.text, "First form  10 mg");
  assert.equal(french.text, "[FR missing] First form  10 mg");
  assert.deepEqual(french.warnings, ["Missing French medicinal name: First form"]);
});

test("missing French botanical common name falls back to language-neutral Latin name", () => {
  const formatted = formatMedicinalIngredientForExport({
    ingredients: {
      scientific_name: "Rhodiola rosea",
      name_en: "Golden root",
      name_fr: null,
    },
    amount_value: 200,
    amount_unit: "mg",
  }, "fr");

  assert.equal(formatted.text, "Rhodiola rosea  200 mg");
  assert.deepEqual(formatted.warnings, []);
});

test("identical formatted medicinal rows are emitted once", () => {
  const row = {
    ingredients: { scientific_name: "Magnesium", name_en: "Magnesium", name_fr: "Magnésium" },
    source_material: "Magnesium",
    amount_value: 100,
    amount_unit: "mg",
  };
  const section = buildMedicinalExportSection([row, { ...row }]);

  assert.equal(section.text, "Magnesium  100 mg");
});

test("excipient EN/FR output is sorted once and remains row-aligned", () => {
  const output = buildPairedExcipientLists([
    { excipients: { id: 3, name: "Magnesium stearate", name_fr: "Stéarate de magnésium" } },
    { excipients: { id: 2, name: "Hypromellose", name_fr: "Hypromellose" } },
    { excipients: { id: 1, name: "Microcrystalline cellulose", name_fr: null } },
  ]);

  assert.equal(
    output.en,
    "Hypromellose, Magnesium stearate, Microcrystalline cellulose",
  );
  assert.equal(
    output.fr,
    "Hypromellose, Stéarate de magnésium, [FR missing: Microcrystalline cellulose]",
  );
  assert.deepEqual(
    output.rows.map(row => row.excipients.id),
    [2, 3, 1],
  );
  assert.deepEqual(output.warnings, [
    "Missing French non-medicinal name: Microcrystalline cellulose",
  ]);
});
