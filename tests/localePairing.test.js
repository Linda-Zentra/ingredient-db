import test from "node:test";
import assert from "node:assert/strict";

import {
  filterDistinctLocalizedTexts,
  mergeLocalizedIngredientRows,
  pairLocalizedIngredientRows,
} from "../supabase/functions/import-npn/localePairing.js";

test("English fallback from a French endpoint is treated as missing", () => {
  assert.deepEqual(
    filterDistinctLocalizedTexts(
      ["Helps support healthy cardiovascular function."],
      ["Helps support healthy cardiovascular function."],
    ),
    [],
  );

  assert.deepEqual(
    filterDistinctLocalizedTexts(
      ["Helps support healthy cardiovascular function."],
      ["  Aide au maintien d'une fonction cardiovasculaire saine.  "],
    ),
    ["Aide au maintien d'une fonction cardiovasculaire saine."],
  );
});

test("non-medicinal EN/FR names pair by the shared HC response position", () => {
  const paired = pairLocalizedIngredientRows(
    [
      { lnhpd_id: 29342547, ingredient_name: "Magnesium stearate" },
      { lnhpd_id: 29342547, ingredient_name: "Hypromellose" },
      { lnhpd_id: 29342547, ingredient_name: "Microcrystalline cellulose" },
    ],
    [
      { lnhpd_id: 29342547, ingredient_name: "Stéarate de magnésium" },
      { lnhpd_id: 29342547, ingredient_name: "Hypromellose" },
      { lnhpd_id: 29342547, ingredient_name: "Cellulose microcristalline" },
    ],
    { allowPositional: true },
  );

  assert.deepEqual(paired.map(row => row.ingredient_name_fr), [
    "Stéarate de magnésium",
    "Hypromellose",
    "Cellulose microcristalline",
  ]);
});

test("medicinal rows recover by structural fields when localized order differs", () => {
  const paired = pairLocalizedIngredientRows(
    [
      { lnhpd_id: 1, ingredient_name: "Long IUPAC A", quantity: 10, quantity_unit_of_measure: "mg" },
      { lnhpd_id: 1, ingredient_name: "Long IUPAC B", quantity: 25, quantity_unit_of_measure: "mg" },
    ],
    [
      { lnhpd_id: 1, ingredient_name: "Nom B", quantity: 25, quantity_unit_of_measure: "mg" },
      { lnhpd_id: 1, ingredient_name: "Nom A", quantity: 10, quantity_unit_of_measure: "mg" },
    ],
  );

  assert.deepEqual(paired.map(row => row.ingredient_name_fr), ["Nom A", "Nom B"]);
});

test("matched HC medicinal rows retain product-specific French source metadata", () => {
  const paired = pairLocalizedIngredientRows(
    [{
      lnhpd_id: 29342547,
      ingredient_name: "Rhodiola rosea",
      quantity: 200,
      quantity_unit_of_measure: "mg",
      source_material: "Rhodiola rosea - Root",
      extract_type_desc: "Dry",
    }],
    [{
      lnhpd_id: 29342547,
      ingredient_name: "Rhodiola rosea",
      quantity: 200,
      quantity_unit_of_measure: "mg",
      source_material: "Rhodiola rosea - Racine",
      extract_type_desc: "Matériel brut sec",
    }],
  );

  assert.equal(paired[0].source_material_fr, "Rhodiola rosea - Racine");
  assert.equal(paired[0].source_part_fr, "Racine");
  assert.equal(paired[0].extract_type_fr, "Matériel brut sec");
});

test("localized HC unit words normalize before structural pairing", () => {
  const paired = pairLocalizedIngredientRows(
    [
      { lnhpd_id: 29603262, ingredient_name: "Biotin", quantity: 300, quantity_unit_of_measure: "micrograms" },
      { lnhpd_id: 29603262, ingredient_name: "Vitamin B12", quantity: 1000, quantity_unit_of_measure: "micrograms" },
    ],
    [
      { lnhpd_id: 29603262, ingredient_name: "Biotine", quantity: 300, quantity_unit_of_measure: "microgrammes" },
      { lnhpd_id: 29603262, ingredient_name: "Vitamine B12", quantity: 1000, quantity_unit_of_measure: "microgrammes" },
    ],
  );

  assert.deepEqual(paired.map(row => row.ingredient_name_fr), ["Biotine", "Vitamine B12"]);
});

test("micro sign and mcg units share the same invariant structure", () => {
  const paired = pairLocalizedIngredientRows(
    [{ lnhpd_id: 2, ingredient_name: "Vitamin D", quantity: 5, quantity_unit_of_measure: "µg" }],
    [{ lnhpd_id: 2, ingredient_name: "Vitamine D", quantity: 5, quantity_unit_of_measure: "mcg" }],
  );

  assert.equal(paired[0].ingredient_name_fr, "Vitamine D");
});

test("real HC RAE/EAR and billion CFU/UFC units pair across locales", () => {
  const paired = pairLocalizedIngredientRows(
    [
      { lnhpd_id: 3895398, ingredient_name: "Vitamin A", quantity: 900, quantity_unit_of_measure: "mcg RAE" },
      { lnhpd_id: 3895398, ingredient_name: "Probiotic blend", quantity: 10, quantity_unit_of_measure: "billion cfu" },
    ],
    [
      { lnhpd_id: 3895398, ingredient_name: "Vitamine A", quantity: 900, quantity_unit_of_measure: "mcg EAR" },
      { lnhpd_id: 3895398, ingredient_name: "Mélange probiotique", quantity: 10, quantity_unit_of_measure: "Milliards d'UFC" },
    ],
  );

  assert.deepEqual(paired.map(row => row.ingredient_name_fr), ["Vitamine A", "Mélange probiotique"]);
});

test("duplicate medicinal structures remain untranslated rather than swapping names", () => {
  const paired = pairLocalizedIngredientRows(
    [
      { lnhpd_id: 1, ingredient_name: "Thiamine", quantity: 25, quantity_unit_of_measure: "mg" },
      { lnhpd_id: 1, ingredient_name: "Riboflavin", quantity: 25, quantity_unit_of_measure: "mg" },
    ],
    [
      { lnhpd_id: 1, ingredient_name: "Riboflavine", quantity: 25, quantity_unit_of_measure: "mg" },
      { lnhpd_id: 1, ingredient_name: "Thiamine", quantity: 25, quantity_unit_of_measure: "mg" },
    ],
  );

  assert.deepEqual(paired.map(row => row.ingredient_name_fr), [null, null]);
  assert.deepEqual(paired.map(row => row.source_material_fr), [null, null]);
});

test("incomplete non-medicinal response does not shift later translations", () => {
  const paired = pairLocalizedIngredientRows(
    [
      { lnhpd_id: 1, ingredient_name: "First" },
      { lnhpd_id: 1, ingredient_name: "Second" },
      { lnhpd_id: 1, ingredient_name: "Third" },
    ],
    [
      { lnhpd_id: 1, ingredient_name: "Premier" },
      { lnhpd_id: 1, ingredient_name: "Troisième" },
    ],
    { allowPositional: true },
  );

  assert.deepEqual(paired.map(row => row.ingredient_name_fr), [null, null, null]);
});

test("rows without a product identity are not paired on position alone", () => {
  const paired = pairLocalizedIngredientRows(
    [{ ingredient_name: "Gelatin" }],
    [{ ingredient_name: "Gélatine" }],
    { allowPositional: true },
  );

  assert.equal(paired[0].ingredient_name_fr, null);
});

test("medicinal rows without invariant structure never pair by position", () => {
  const paired = pairLocalizedIngredientRows(
    [
      { lnhpd_id: 1, ingredient_name: "First" },
      { lnhpd_id: 1, ingredient_name: "Second" },
    ],
    [
      { lnhpd_id: 1, ingredient_name: "Deuxième", source_material: "Source B" },
      { lnhpd_id: 1, ingredient_name: "Premier", source_material: "Source A" },
    ],
  );

  assert.deepEqual(paired.map(row => row.ingredient_name_fr), [null, null]);
  assert.deepEqual(paired.map(row => row.source_material_fr), [null, null]);
});

test("mass and potency row merge preserves localized source metadata", () => {
  const merged = mergeLocalizedIngredientRows([
    {
      ingredient_name: "Example",
      quantity: 100,
      quantity_unit_of_measure: "mg",
      source_material: "Example source",
      source_material_fr: null,
      source_part_fr: null,
      extract_type_fr: null,
    },
    {
      ingredient_name: "Example",
      ingredient_name_fr: "Exemple",
      quantity: 10,
      quantity_unit_of_measure: "%",
      source_material_fr: "Source exemple",
      source_part_fr: "Partie",
      extract_type_fr: "Extrait sec",
    },
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].potency_amount, 10);
  assert.equal(merged[0].potency_label, "%");
  assert.equal(merged[0].ingredient_name_fr, "Exemple");
  assert.equal(merged[0].source_material, "Example source");
  assert.equal(merged[0].source_material_fr, "Source exemple");
  assert.equal(merged[0].source_part_fr, "Partie");
  assert.equal(merged[0].extract_type_fr, "Extrait sec");
});
