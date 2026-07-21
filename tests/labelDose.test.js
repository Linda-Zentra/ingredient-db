import test from "node:test";
import assert from "node:assert/strict";
import { computeRecommendedDose, computeRecommendedDoseFr } from "../src/lib/labelDose.js";

const fixedDose = {
  dose_population: "Adults",
  dose_amount: 4,
  dose_unit: "capsule",
  dose_freq_min: 3,
  dose_freq_unit: "daily",
};

test("English and French previews derive dose text from the same structured fields", () => {
  assert.equal(
    computeRecommendedDose(fixedDose),
    "Adults: Take 4 capsule 3 time(s) daily, or as directed by a health care practitioner.",
  );
  assert.equal(
    computeRecommendedDoseFr(fixedDose),
    "Adultes : Prendre 4 capsule 3 fois par jour, ou selon les directives d'un praticien de soins de santé.",
  );
});

test("dose helpers preserve ranges and localized weekly frequency", () => {
  const rangedDose = {
    dose_population: "Adults",
    dose_amount: 1,
    dose_amount_max: 2,
    dose_unit: "tablet",
    dose_freq_min: 1,
    dose_freq_max: 2,
    dose_freq_unit: "per week",
  };

  assert.match(computeRecommendedDose(rangedDose), /Take 1-2 tablet 1-2 time\(s\) per week/);
  assert.match(computeRecommendedDoseFr(rangedDose), /Prendre 1-2 tablet 1-2 fois par semaine/);
});

test("dose helpers leave unavailable dosage blank", () => {
  assert.equal(computeRecommendedDose({}), "");
  assert.equal(computeRecommendedDoseFr({}), "");
});
