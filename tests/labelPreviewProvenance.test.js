import test from "node:test";
import assert from "node:assert/strict";
import { getMissingFrenchHcFields } from "../src/lib/labelPreviewProvenance.js";

test("products without English HC caution text do not report missing French cautions", () => {
  assert.deepEqual(getMissingFrenchHcFields({}), []);
  assert.deepEqual(getMissingFrenchHcFields({ recommended_use: "", recommended_use_fr: "" }), []);
});

test("fixed NPN-style English source gaps identify each missing French field", () => {
  const missing = getMissingFrenchHcFields({
    recommended_use: "Supports cardiovascular function.",
    recommended_use_fr: "",
    do_not_use_en: ["Do not use during pregnancy.", "Do not use after myocardial infarction."],
    do_not_use_fr: [],
    ask_before_use_en: ["Consult a practitioner before use."],
    ask_before_use_fr: [],
    stop_use_en: ["Stop use if symptoms occur."],
    stop_use_fr: [],
  });

  assert.deepEqual(missing, ["recommended use", "do not use", "ask before use", "stop use"]);
});

test("partial caution translation remains visible even when another French bucket exists", () => {
  const missing = getMissingFrenchHcFields({
    do_not_use_en: ["First.", "Second."],
    do_not_use_fr: ["Premier."],
    ask_before_use_en: ["Ask first."],
    ask_before_use_fr: ["Consulter d'abord."],
  });

  assert.deepEqual(missing, ["do not use"]);
});

test("fully paired HC fields produce no source warning", () => {
  const missing = getMissingFrenchHcFields({
    recommended_use: "English purpose",
    recommended_use_fr: "Objectif français",
    do_not_use_en: ["English warning"],
    do_not_use_fr: ["Avertissement français"],
  });

  assert.deepEqual(missing, []);
});
